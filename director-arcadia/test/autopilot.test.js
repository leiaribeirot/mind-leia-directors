import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseSprintStatus, nextStory } from '../scripts/autopilot.js';

function fixture(yaml) {
  const dir = mkdtempSync(path.join(tmpdir(), 'autopilot-'));
  const p = path.join(dir, 'sprint-status.yaml');
  writeFileSync(p, yaml);
  return p;
}

// Convention A: `dependencies:` keyed by the short numeric id (9-2-1), while
// `development_status:` keys carry a trailing slug (9-2-1-feature-b).
const SPRINT = `
development_status:
  epic-9-0: review
  9-0-1-foundation: done
  9-1-1-feature-a: review
  9-2-1-feature-b: backlog          # deps [9-1-1] satisfied -> ready, unblocks 9-3-1
  9-3-1-feature-c: backlog          # deps [9-2-1] NOT satisfied -> not ready
  9-4-1-independent: ready-for-dev  # no deps -> ready, unblocks nothing
  epic-9-9-retrospective: optional
dependencies:
  9-0-1: []
  9-1-1: [9-0-1]
  9-2-1: [9-1-1]
  9-3-1: [9-2-1]
  9-4-1: []
`;

describe('parseSprintStatus', () => {
  it('reads the two maps without a YAML engine', () => {
    const doc = parseSprintStatus(SPRINT);
    expect(doc.development_status['9-2-1-feature-b']).toBe('backlog');
    expect(doc.development_status['9-0-1-foundation']).toBe('done');
    // comments stripped from values
    expect(doc.development_status['9-1-1-feature-a']).toBe('review');
    // dependency lists parsed
    expect(doc.dependencies['9-1-1']).toEqual(['9-0-1']);
    expect(doc.dependencies['9-0-1']).toEqual([]);
  });
});

describe('nextStory', () => {
  it('picks the ready story that unblocks the most downstream work', () => {
    const r = nextStory(fixture(SPRINT));
    // 9-2-1 (deps satisfied, unblocks 9-3-1) beats 9-4-1 (ready but unblocks nothing)
    expect(r.key).toBe('9-2-1-feature-b');
    expect(r.unblocks).toBe(1);
  });

  it('skips stories whose deps are not satisfied', () => {
    // 9-3-1 depends on 9-2-1 which is still backlog -> must never be selected here
    const r = nextStory(fixture(SPRINT));
    expect(r.key).not.toBe('9-3-1-feature-c');
  });

  it('ignores epic and retrospective keys', () => {
    const r = nextStory(fixture(SPRINT));
    expect(r.key.startsWith('epic-')).toBe(false);
    expect(r.key.endsWith('-retrospective')).toBe(false);
  });

  it('returns null when the backlog is dry', () => {
    const dry = `
development_status:
  9-1-1-done: review
  9-2-1-also-done: done
dependencies:
  9-1-1: []
  9-2-1: [9-1-1]
`;
    expect(nextStory(fixture(dry))).toBe(null);
  });

  it('falls back to a story with no dependency entry (treated as no deps)', () => {
    const noDeps = `
development_status:
  9-5-1-orphan: backlog
dependencies:
  9-0-1: []
`;
    const r = nextStory(fixture(noDeps));
    expect(r.key).toBe('9-5-1-orphan');
    expect(r.unblocks).toBe(0);
  });

  // Convention B (the Epic 332 sprint files): ids are VARIABLE length and
  // `dependencies:` is keyed by the FULL slugged status key, so a story id can
  // be 2 numeric segments + a multi-word slug (332-1-config-persistence-integrity)
  // or a 3-segment numeric id (332-3-1-...). The old resolver truncated every
  // key to 3 dash segments, which mapped these to keys that exist in neither map
  // -> every dep lookup missed -> the dependency graph was ignored and the first
  // ready story in file order (often a sliced-parent container) was returned.
  const EPIC_332 = `
development_status:
  epic-332: review
  332-0-1-remove-dead-electron-test-suites: done
  332-1-config-persistence-integrity: review          # satisfies the slice's dep
  332-3-durable-conversations: ready-for-dev           # PARENT — deps are its slices, one still ready-for-dev
  332-3-1-persist-thread-store: ready-for-dev          # slice — dep [332-1...] satisfied -> the only ready story
  332-3-2-resume-open-conversation: backlog            # slice — dep [332-3-1...] NOT satisfied -> not ready
dependencies:
  332-0-1-remove-dead-electron-test-suites: []
  332-1-config-persistence-integrity: [332-0-1-remove-dead-electron-test-suites]
  332-3-durable-conversations: [332-3-1-persist-thread-store, 332-3-2-resume-open-conversation]
  332-3-1-persist-thread-store: [332-1-config-persistence-integrity]
  332-3-2-resume-open-conversation: [332-3-1-persist-thread-store]
`;

  it('honors variable-length ids with multi-word slugs (2-segment numeric id)', () => {
    // The resolver must resolve 332-1-config-persistence-integrity via its full
    // slugged dep-map key, not a truncated 332-1-config that exists nowhere.
    const linear = `
development_status:
  332-0-1-remove-dead-electron-test-suites: done
  332-1-config-persistence-integrity: ready-for-dev    # dep [332-0-1...] done -> ready, unblocks 332-3
  332-3-durable-conversations: ready-for-dev           # dep [332-1...] NOT satisfied -> not ready
dependencies:
  332-0-1-remove-dead-electron-test-suites: []
  332-1-config-persistence-integrity: [332-0-1-remove-dead-electron-test-suites]
  332-3-durable-conversations: [332-1-config-persistence-integrity]
`;
    const r = nextStory(fixture(linear));
    expect(r.key).toBe('332-1-config-persistence-integrity');
    expect(r.unblocks).toBe(1);
    // The dependent parent must NOT be picked while its dep is only ready-for-dev.
    expect(r.key).not.toBe('332-3-durable-conversations');
  });

  it('never returns a sliced-parent container while a slice is still ready-for-dev', () => {
    const r = nextStory(fixture(EPIC_332));
    // Old (truncating) resolver returned the first ready key in file order:
    // 332-3-durable-conversations, the parent whose slice deps are NOT satisfied.
    expect(r.key).not.toBe('332-3-durable-conversations');
    // The only genuinely-ready story is the slice whose dep (332-1) is review.
    expect(r.key).toBe('332-3-1-persist-thread-store');
    // It unblocks the parent AND the sibling slice that depends on it.
    expect(r.unblocks).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Slice-awareness (playbook §2). Fixture = the REAL Epic 340 (Roda) shape from
// docs/implementation-artifacts/sprint-status-epic-340.yaml on branch
// feat/epic-340-roda-p2, the live autopilot run where next-story handed back the
// sliced PARENT 340-4-threads-profiles-follow instead of an actionable story.
// Bug 2 (the dependency-graph no-op) is already fixed on main; these lock down
// Bug 1: a sliced parent must stay OUT of the ready set until every slice ships.
// ─────────────────────────────────────────────────────────────────────────────

describe('nextStory slice-awareness', () => {
  const EPIC_340_STATUS = {
    '340-1-data-model-and-rls': 'done',
    '340-2-roda-scaffold-and-auth-gate': 'done',
    '340-3-spaces-and-feed': 'review',
    '340-4-threads-profiles-follow': 'backlog',   // PARENT — sliced
    '340-4-a-threads': 'review',                  // slice A shipped
    '340-4-b-profiles-follow': 'blocked',         // slice B needs new schema
    '340-5-realtime-presence-notifications': 'backlog',   // PARENT — sliced
    '340-5-a-realtime-presence-feedmerge': 'review',
    '340-5-b-persisted-notification-centre': 'blocked',
    '340-6-livekit-token-edge-function': 'done',
    '340-7-voice-room-mvp': 'backlog',            // PARENT — sliced
    '340-7-a-voice-room-client': 'review',
    '340-7-b-livekit-sdk-wiring': 'blocked',
    '340-8-voice-reliability-and-moderation': 'backlog',
    '340-9-premium-paywall-stripe': 'blocked',
    '340-10-e2e-proof-and-golive': 'blocked',
  };

  const EPIC_340_DEPS = `dependencies:
  340-1-data-model-and-rls: []
  340-2-roda-scaffold-and-auth-gate: [340-1-data-model-and-rls]
  340-3-spaces-and-feed: [340-1-data-model-and-rls, 340-2-roda-scaffold-and-auth-gate]
  340-4-threads-profiles-follow: [340-3-spaces-and-feed]   # parent
  340-4-a-threads: [340-3-spaces-and-feed]
  340-4-b-profiles-follow: [340-3-spaces-and-feed]
  340-5-realtime-presence-notifications: [340-3-spaces-and-feed]   # parent
  340-5-a-realtime-presence-feedmerge: [340-3-spaces-and-feed]
  340-5-b-persisted-notification-centre: [340-3-spaces-and-feed]
  340-6-livekit-token-edge-function: [340-1-data-model-and-rls]
  340-7-voice-room-mvp: [340-6-livekit-token-edge-function, 340-2-roda-scaffold-and-auth-gate]   # parent
  340-7-a-voice-room-client: [340-6-livekit-token-edge-function, 340-2-roda-scaffold-and-auth-gate]
  340-7-b-livekit-sdk-wiring: [340-7-a-voice-room-client]
  340-8-voice-reliability-and-moderation: [340-7-voice-room-mvp]
  340-9-premium-paywall-stripe: [340-1-data-model-and-rls, 340-6-livekit-token-edge-function]
  340-10-e2e-proof-and-golive: [340-3-spaces-and-feed, 340-5-realtime-presence-notifications, 340-7-voice-room-mvp, 340-8-voice-reliability-and-moderation]
`;

  function epic340(overrides = {}) {
    const status = { ...EPIC_340_STATUS, ...overrides };
    const lines = Object.entries(status).map(([k, v]) => `  ${k}: ${v}`).join('\n');
    return fixture(`development_status:\n${lines}\n${EPIC_340_DEPS}`);
  }

  it('picks the ready SLICE, never the sliced parent (Epic 340 repro)', () => {
    // Mid-run: slice A of 340-4 is contexted and unshipped, parent is backlog.
    const r = nextStory(epic340({ '340-4-a-threads': 'ready-for-dev' }));
    expect(r.key).toBe('340-4-a-threads');
    expect(r.key).not.toBe('340-4-threads-profiles-follow');
  });

  it('keeps a sliced parent out of the ready set while a slice is blocked', () => {
    // The exact live-run state: every hermetic slice is in review, every B slice
    // is blocked on a human decision. Parents 340-4/5/7 are backlog but NOT
    // actionable, and 340-8 depends on the unshipped 340-7 parent -> nothing.
    expect(nextStory(epic340())).toBe(null);
  });

  it('admits a sliced parent only once EVERY slice is review/done', () => {
    const stillOpen = nextStory(epic340({
      '340-7-a-voice-room-client': 'done',   // one slice done, the other still blocked
    }));
    expect(stillOpen).toBe(null);

    const allShipped = nextStory(epic340({
      '340-7-a-voice-room-client': 'done',
      '340-7-b-livekit-sdk-wiring': 'review',
    }));
    expect(allShipped.key).toBe('340-7-voice-room-mvp');
    expect(allShipped.unblocks).toBe(2);  // 340-8 + 340-10 depend on the parent
  });

  it('does not confuse 340-1 with 340-10 (segment-aware slice match)', () => {
    // Raw string-prefix matching would make 340-10-e2e-proof-and-golive look like
    // a slice of 340-1-data-model-and-rls (and 340-4x like a slice of 340-4),
    // wrongly withholding actionable stories. Segment-aware matching must not.
    const tenIsNotASliceOfOne = `
development_status:
  340-1-data-model-and-rls: backlog
  340-10-e2e-proof-and-golive: blocked
dependencies:
  340-1-data-model-and-rls: []
  340-10-e2e-proof-and-golive: [340-1-data-model-and-rls]
`;
    const r = nextStory(fixture(tenIsNotASliceOfOne));
    expect(r.key).toBe('340-1-data-model-and-rls');
    expect(r.unblocks).toBe(1);

    const fourXIsNotASliceOfFour = `
development_status:
  340-4-threads-profiles-follow: backlog
  340-4x-spike: blocked
dependencies:
  340-4-threads-profiles-follow: []
`;
    expect(nextStory(fixture(fourXIsNotASliceOfFour)).key).toBe('340-4-threads-profiles-follow');
  });

  it('understands the documented `-slice-x` suffix convention too', () => {
    const yaml = `
development_status:
  320-5-1-remotion-final-export: backlog
  320-5-1-remotion-final-export-slice-a: review
  320-5-1-remotion-final-export-slice-b: ready-for-dev
dependencies:
  320-5-1: []
`;
    const r = nextStory(fixture(yaml));
    expect(r.key).toBe('320-5-1-remotion-final-export-slice-b');
  });

  it('leaves unsliced stories exactly as they were', () => {
    // A sibling that merely shares the numeric prefix — no slice tag, so nothing
    // about 9-2-1 changes.
    const yaml = `
development_status:
  9-1-1-feature-a: done
  9-2-1-feature-b: backlog
  9-2-2-feature-b-two: backlog
dependencies:
  9-1-1: []
  9-2-1: [9-1-1]
  9-2-2: [9-2-1]
`;
    const r = nextStory(fixture(yaml));
    expect(r.key).toBe('9-2-1-feature-b');
    expect(r.unblocks).toBe(1);
  });

  // A dependency list long enough to wrap gets written across lines by hand and
  // by every formatter. Read line-by-line that parsed as an EMPTY list: the key
  // line carries no value and the bracket lines match no `key:` pattern, so the
  // graph silently stopped being enforced — the same class of failure as the
  // fixed-3-segment depKey bug, and it let the go-live story be offered before
  // anything it depends on had shipped. Caught on the real Epic 347 file.
  it('reads a dependency list that wraps across lines', () => {
    const yaml = `
development_status:
  9-1-1-alpha: backlog
  9-2-1-beta: backlog
  9-9-1-golive: backlog

dependencies:
  9-1-1-alpha: []
  9-2-1-beta: []
  9-9-1-golive:
    [9-1-1-alpha,
     9-2-1-beta]
`;
    // Both deps are unshipped, so the go-live story must NOT be offered.
    const parsed = parseSprintStatus(yaml);
    expect(parsed.dependencies['9-9-1-golive']).toEqual(['9-1-1-alpha', '9-2-1-beta']);
    const r = nextStory(fixture(yaml));
    expect(r.key).not.toBe('9-9-1-golive');
  });

  it('still reads a dependency list written on one line', () => {
    const parsed = parseSprintStatus(`
development_status:
  9-1-1-alpha: done
dependencies:
  9-1-1-alpha: [9-0-1-base, 9-0-2-other]
`);
    expect(parsed.dependencies['9-1-1-alpha']).toEqual(['9-0-1-base', '9-0-2-other']);
  });

  // Third spelling of the same list, and the one a hand-written sprint file
  // actually uses: the YAML block sequence. `- item` lines match no `key:`
  // pattern, so they were dropped and the key kept the empty list its own line
  // implies — dependency-free, with no error. Measured on the real Epic 394
  // file: 15 keys declared, 4 of them carrying edges, 0 of those 4 read. The
  // epic shipped in the right order only because the `development_status`
  // block was curated by hand; the graph itself was off the whole time.
  it('reads a dependency list written as a `- item` block sequence', () => {
    const yaml = `
development_status:
  394-7-o-tour: in-progress
  394-8-rever-o-tour: backlog

dependencies:
  394-7-o-tour: []
  394-8-rever-o-tour:
    - 394-7-o-tour
`;
    const parsed = parseSprintStatus(yaml);
    expect(parsed.dependencies['394-8-rever-o-tour']).toEqual(['394-7-o-tour']);
    // The parent is in-progress, not review/done — the child stays blocked.
    expect(nextStory(fixture(yaml))).toBeNull();
  });

  it('reads a multi-item block sequence, and the entry that follows it', () => {
    const parsed = parseSprintStatus(`
development_status:
  9-9-1-golive: backlog
dependencies:
  9-9-1-golive:
    - 9-1-1-alpha
    - 9-2-1-beta
  9-1-1-alpha: []
`);
    expect(parsed.dependencies['9-9-1-golive']).toEqual(['9-1-1-alpha', '9-2-1-beta']);
    expect(parsed.dependencies['9-1-1-alpha']).toEqual([]);
  });

  // The parser reads line by line, so the line ENDING is part of its contract:
  // the repo is edited on macOS (LF) and on Windows, where `core.autocrlf=true`
  // hands the reader CRLF. Both must produce the same graph — a sprint file that
  // parses on one machine and comes back dependency-free on the other is the
  // same silent failure by another door. (CR alone, classic Mac OS 9, has never
  // worked for ANY form in this parser and is not in scope.)
  it('reads the block sequence the same with LF and with CRLF', () => {
    const lf = `
development_status:
  394-7-o-tour: in-progress
  394-8-rever-o-tour: backlog

dependencies:
  394-7-o-tour: []
  394-8-rever-o-tour:
    - 394-7-o-tour
`;
    const crlf = lf.replace(/\n/g, '\r\n');
    for (const yaml of [lf, crlf]) {
      expect(parseSprintStatus(yaml).dependencies['394-8-rever-o-tour']).toEqual(['394-7-o-tour']);
    }
  });

  // The three spellings are one list. Pin them together so a later change to
  // the folding loop cannot fix one form and quietly drop another.
  it('reads inline, wrapped-bracket and block-sequence forms identically', () => {
    const head = `
development_status:
  9-9-1-golive: backlog

dependencies:
  9-9-1-golive:`;
    const inline = `${head} [9-1-1-alpha, 9-2-1-beta]
`;
    const wrapped = `${head}
    [9-1-1-alpha,
     9-2-1-beta]
`;
    const sequence = `${head}
    - 9-1-1-alpha
    - 9-2-1-beta
`;
    for (const yaml of [inline, wrapped, sequence]) {
      expect(parseSprintStatus(yaml).dependencies['9-9-1-golive']).toEqual([
        '9-1-1-alpha',
        '9-2-1-beta',
      ]);
    }
  });

  // Failing loud is the other half of the fix: a dropped line costs an edge,
  // and a missing edge is indistinguishable from a story with no blockers.
  it('warns instead of silently dropping a line it cannot read', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    parseSprintStatus(`
development_status:
  9-1-1-a: done
dependencies:
  "quoted-key": [x]
`);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"quoted-key": [x]');
    warn.mockRestore();
  });

  it('stays quiet on a file it reads completely', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    parseSprintStatus(`
development_status:
  9-1-1-a: done
dependencies:
  9-1-1-a: []
  9-2-1-b:
    - 9-1-1-a
  # a comment inside the block is not an unread line
`);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
