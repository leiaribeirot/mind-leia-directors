#!/usr/bin/env node

/**
 * Director Autopilot CLI — the deterministic spine of the autonomous sprint loop.
 *
 * The loop itself is orchestrated by Claude Code (it spawns the SM/Dev/QA
 * subagents — a script can't). But three steps in the loop are pure, testable,
 * and should NOT be re-invented by an LLM each iteration. This CLI exposes them
 * and reuses the Director's existing infra instead of duplicating it:
 *
 *   next-story  -> parse the sprint-status YAML, return the next story whose
 *                 deps are satisfied (dependency-graph aware). The loop's
 *                 "pick next ready story" step, made deterministic.
 *   validate    -> reuse lib/validation-runner.js (auto-detects + runs
 *                 lint/typecheck/tests). The QA gate, made deterministic —
 *                 no guessing per-package commands.
 *   record      -> reuse lib/metrics-tracker.js recordSession() so an autopilot
 *                 run shows up in the Director's velocity/burndown for free.
 *
 * Usage:
 *   node autopilot.js next-story --sprint-status <path> [--json]
 *   node autopilot.js validate   --target <pkgPath> [--json]
 *   node autopilot.js record     --target <name> --stories <n> [--skipped <n>] [--minutes <n>]
 */

import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { runValidation, detectAvailableChecks } from '../lib/validation-runner.js';
import { recordSession } from '../lib/metrics-tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

// Story is "ready" when it's backlog/ready-for-dev AND every dep is review/done.
const READY = new Set(['backlog', 'ready-for-dev']);
const SATISFIED = new Set(['review', 'done']);
// A slice tag is a single letter (playbook §2): `-a`, `-b`, `…-slice-c`.
const SLICE_TAG = /^[a-z]$/;

const segmentsOf = (key) => String(key).split('-');

/** Leading numeric segments of a story id: `340-4-a-threads` -> ['340','4']. */
function numericPrefix(key) {
  const out = [];
  for (const seg of segmentsOf(key)) {
    if (!/^\d+$/.test(seg)) break;
    out.push(seg);
  }
  return out;
}

/** A slice line is a cut child, never a parent itself. */
function isSliceLine(key) {
  const segs = segmentsOf(key);
  const n = numericPrefix(key).length;
  if (n > 0 && SLICE_TAG.test(segs[n] || '')) return true;              // 340-4-a-threads
  const i = segs.lastIndexOf('slice');
  return i > 0 && i === segs.length - 2 && SLICE_TAG.test(segs[i + 1]); // …-slice-a
}

/**
 * Is `candidate` a slice cut from `parent`? Both conventions are in the wild:
 *   320-5-1-remotion-final-export -> 320-5-1-remotion-final-export-slice-a
 *   340-4-threads-profiles-follow -> 340-4-a-threads, 340-4-b-profiles-follow
 * Matching is SEGMENT-aware on purpose: a raw-string prefix test would make
 * `340-1-data-model-and-rls` the "parent" of `340-10-e2e-proof-and-golive`.
 */
function isSliceOf(candidate, parent) {
  if (candidate === parent || isSliceLine(parent)) return false;
  const c = segmentsOf(candidate);
  const p = segmentsOf(parent);
  // <parent-key>-slice-<x>
  if (c.length === p.length + 2 && p.every((s, i) => c[i] === s)
      && c[p.length] === 'slice' && SLICE_TAG.test(c[p.length + 1])) return true;
  // <parent numeric prefix>-<letter>-<slug>
  const np = numericPrefix(parent);
  if (np.length === 0 || c.length <= np.length) return false;
  return np.every((s, i) => c[i] === s) && SLICE_TAG.test(c[np.length]);
}

/**
 * Minimal sprint-status parser — ZERO dependencies on purpose, so autopilot
 * runs in a brand-new project that hasn't installed js-yaml (or anything).
 * The sprint-status file is a trivial YAML subset: two top-level maps
 * (`development_status:` and `dependencies:`) of `key: value`, `key: [a, b]`,
 * and the same list written as a `- item` block sequence.
 * We do not need a full YAML engine for that, and not needing one is the point.
 */
function parseSprintStatus(text) {
  const status = {};
  const deps = {};
  let section = null;
  // A dependency list long enough to wrap is written across lines by every
  // formatter and by hand:
  //     347-6-e2e-proof-and-golive:
  //       [347-1-post-images, 347-2-persisted-notifications,
  //        347-4-direct-messages]
  // Read line-by-line that is a SILENT EMPTY LIST — the key line carries no
  // value, and the bracket lines match no `key:` pattern, so they are dropped
  // and the story looks dependency-free. That is the same failure mode as the
  // fixed-3-segment `depKey` bug: the graph stops being enforced without ever
  // erroring. Fold continuation lines until the bracket closes, before parsing.
  const raw = text.split('\n').map((l) => l.replace(/#.*$/, '').replace(/\s+$/, ''));
  const folded = [];
  const depth = (s) => (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
  for (let i = 0; i < raw.length; i++) {
    let line = raw[i];
    // A `key:` whose value is empty but whose list opens on the NEXT line —
    // the shape a wrapped array actually takes. Pull that line up first.
    if (/^\s+[\w.-]+:\s*$/.test(line) && /^\s*\[/.test(raw[i + 1] ?? '')) {
      line += ` ${raw[++i].trim()}`;
    } else if (/^\s+[\w.-]+:\s*$/.test(line) && /^\s+-\s+\S/.test(raw[i + 1] ?? '')) {
      // Same silent-empty trap, other spelling: the YAML block sequence, which
      // is what a hand-written sprint file actually uses.
      //     394-8-rever-o-tour-comeca-o-tour:
      //       - 394-7-o-tour-leva-a-tela-ao-passo
      // The `- item` lines match no `key:` pattern, so they were dropped and
      // the key kept the empty list its own line implies. Measured on the real
      // Epic 394 file: 15 dependencies declared, 0 read. Fold the items into
      // the bracket form the entry parser below already understands.
      const items = [];
      while (/^\s+-\s+\S/.test(raw[i + 1] ?? '')) items.push(raw[++i].replace(/^\s*-\s+/, '').trim());
      line += ` [${items.join(', ')}]`;
    }
    // Then keep pulling while the bracket is still open.
    while (depth(line) > 0 && i + 1 < raw.length) line += ` ${raw[++i].trim()}`;
    folded.push(line);
  }
  for (const line of folded) {
    if (!line.trim()) continue;
    const top = line.match(/^([a-z_]+):\s*$/);
    if (top) { section = top[1]; continue; }
    const entry = line.match(/^\s+([\w.-]+):\s*(.*)$/);
    // A line inside `dependencies:` that nothing above could fold or parse is
    // how this graph goes quiet: dropping it costs an edge, and an edge missing
    // reads exactly like a story with no blockers. Say so instead — the whole
    // point of the block is that it is enforced, so an unread line is a defect,
    // not noise. (Comments and blanks are already gone by here.)
    if (!entry && section === 'dependencies') {
      console.warn(`[autopilot] sprint-status: unparsed line inside \`dependencies:\` — ${line.trim()}`);
    }
    if (!entry || !section) continue;
    const [, key, value] = entry;
    if (section === 'development_status') {
      status[key] = value.trim();
    } else if (section === 'dependencies') {
      const inner = value.trim().replace(/^\[|\]$/g, '').trim();
      deps[key] = inner ? inner.split(',').map((s) => s.trim()).filter(Boolean) : [];
    }
  }
  return { development_status: status, dependencies: deps };
}

/**
 * Return the next ready story by dependency order. Mirrors
 * backlog-manager.getNextItem's intent for sprint-status files: skip
 * epic/retrospective keys, skip sliced parents (their work lives in the slice
 * lines — playbook §2), honor the `dependencies:` graph, and prefer the story
 * that unblocks the most downstream work.
 */
function nextStory(sprintStatusPath) {
  const doc = parseSprintStatus(readFileSync(sprintStatusPath, 'utf8'));
  const status = doc.development_status || {};
  const deps = doc.dependencies || {};

  const isStoryKey = (k) =>
    /^\d/.test(k.replace(/^[a-z-]*/, '')) && !k.startsWith('epic-') && !k.endsWith('-retrospective');

  // Story ids are VARIABLE length: a status key is a dependency id plus an
  // optional trailing slug — `9-2-1` -> `9-2-1-feature-b`,
  // `332-1` -> `332-1-config-persistence-integrity`. Truncating to a fixed 3
  // segments was the bug: it maps `332-3-durable-conversations` to a
  // `332-3-durable` key that exists in neither map, so every dep lookup missed,
  // `.every()` ran over an empty array, and the whole dependency graph was
  // silently ignored (parents/slices leaked into the ready set). Match ids on a
  // dash-boundary prefix instead — works whether the sprint file keys
  // `dependencies:` by the numeric id (9-2-1) or by the full slugged key
  // (332-1-config-persistence-integrity).
  const isPrefixId = (id, key) => key === id || key.startsWith(`${id}-`);

  // A story's declared dependency list. `deps` may be keyed by the full status
  // key or by a shorter numeric-id prefix of it; an explicit `[]` is honored.
  const depsFor = (storyKey) => {
    if (deps[storyKey]) return deps[storyKey];
    const depMapKey = Object.keys(deps).find((dk) => isPrefixId(dk, storyKey));
    return depMapKey ? deps[depMapKey] : [];
  };

  // Current status of the story a dependency id refers to.
  const statusOf = (depId) => {
    const match = Object.keys(status).find((k) => isPrefixId(depId, k));
    return match ? String(status[match]).split('#')[0].trim() : 'backlog';
  };

  // How many other stories declare this story as a dependency.
  const downstreamCount = (storyKey) =>
    Object.values(deps).filter((arr) => (arr || []).some((d) => isPrefixId(d, storyKey))).length;

  // A parent that was cut into slices is NOT actionable: handing it to a Dev
  // means re-implementing shipped slices and/or attempting blocked ones. It
  // re-enters the ready set only once every slice is review/done (playbook §2).
  const slicesOf = (parent) =>
    Object.keys(status).filter((k) => isStoryKey(k) && isSliceOf(k, parent));

  const ready = Object.entries(status)
    .filter(([k, v]) => isStoryKey(k) && READY.has(String(v).split('#')[0].trim()))
    .filter(([k]) => depsFor(k).every((d) => SATISFIED.has(statusOf(d))))
    .filter(([k]) => slicesOf(k).every((s) => SATISFIED.has(String(status[s]).split('#')[0].trim())));

  if (ready.length === 0) return null;

  // Prefer the story that unblocks the most downstream stories.
  ready.sort((a, b) => downstreamCount(b[0]) - downstreamCount(a[0]));

  const [key, raw] = ready[0];
  return { key, status: String(raw).split('#')[0].trim(), unblocks: downstreamCount(key) };
}

// Exported for tests (the pure, deterministic core of the loop).
export { parseSprintStatus, nextStory };

async function main() {
  const sub = process.argv[2];
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: {
      'sprint-status': { type: 'string' },
      target: { type: 'string', short: 't' },
      stories: { type: 'string' },
      skipped: { type: 'string' },
      minutes: { type: 'string' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    strict: false,
  });

  if (!sub || values.help) {
    console.log('Usage: autopilot.js <next-story|validate|record> [opts] — see file header.');
    process.exit(values.help ? 0 : 1);
  }

  if (sub === 'next-story') {
    const p = values['sprint-status'];
    if (!p) throw new Error('--sprint-status <path> required');
    const result = nextStory(path.resolve(p));
    if (values.json) console.log(JSON.stringify(result));
    else console.log(result ? `next: ${result.key} (${result.status}, unblocks ${result.unblocks})` : 'backlog dry — no ready story');
    process.exit(0);
  }

  if (sub === 'validate') {
    const t = values.target;
    if (!t) throw new Error('--target <pkgPath> required');
    const targetPath = path.resolve(t);
    const available = await detectAvailableChecks(targetPath);
    const results = await runValidation(targetPath);
    if (values.json) console.log(JSON.stringify({ available, results }));
    else {
      const c = results.composite;
      console.log(`gate: ${c.pass ? 'PASS' : 'FAIL'} (${c.checks_passed}/${c.checks_run} checks, score ${c.score})`);
    }
    process.exit(results.composite.pass ? 0 : 1);
  }

  if (sub === 'record') {
    if (!values.target) throw new Error('--target <name> required');
    const session = await recordSession(DATA_DIR, {
      target: values.target,
      findings_new: 0,                                  // autopilot ships, it doesn't scan
      items_executed: parseInt(values.stories || '0', 10),
      items_skipped: parseInt(values.skipped || '0', 10),
      duration_minutes: values.minutes ? parseInt(values.minutes, 10) : null,
      lenses_applied: ['autopilot'],
    });
    if (values.json) console.log(JSON.stringify(session));
    else console.log(`recorded session ${session.id}: ${session.items_executed} stories shipped`);
    process.exit(0);
  }

  throw new Error(`unknown subcommand: ${sub}`);
}

// Run the CLI only when invoked directly — importing for tests must not exec.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(`autopilot: ${e.message}`);
    process.exit(1);
  });
}
