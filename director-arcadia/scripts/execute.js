#!/usr/bin/env node

/**
 * Director Execute CLI
 *
 * Picks the next backlog item (or a specific one), displays its full context
 * including research references, and marks it as in_progress/done.
 *
 * This closes the loop: scan → backlog → execute → done.
 *
 * Usage:
 *   node execute.js                          # Execute next highest-priority item
 *   node execute.js --id dir-2026-05-24-001  # Execute specific item
 *   node execute.js --target presentation    # Next item for specific target
 *   node execute.js --effort small           # Only small items (auto-safe)
 *   node execute.js --done dir-2026-05-24-001 "Extracted to lib/utils.js"  # Mark done
 *   node execute.js --skip dir-2026-05-24-001 "Deferred to next sprint"    # Mark skipped
 *   node execute.js --list                   # Show execution queue
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { execSync } from 'child_process';
import { getNextItem, queryItems, updateItem, loadBacklogAsync } from '../lib/backlog-manager.js';
import { queryBank } from '../lib/research-bank.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

const { values, positionals } = parseArgs({
  options: {
    id: { type: 'string' },
    target: { type: 'string', short: 't' },
    effort: { type: 'string', short: 'e' },
    done: { type: 'string' },
    skip: { type: 'string' },
    list: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: true,
  strict: false,
});

if (values.help) {
  console.log(`
Director Execute — Pick and execute backlog items

Usage:
  node execute.js                          Execute next highest-priority item
  node execute.js --id <item-id>           Execute specific item
  node execute.js --target <name>          Filter by target
  node execute.js --effort small           Only small items
  node execute.js --done <id> "notes"      Mark item as done with notes
  node execute.js --skip <id> "reason"     Mark item as skipped with reason
  node execute.js --list                   Show execution queue

Examples:
  node execute.js --effort small
  node execute.js --done dir-2026-05-24-001 "Extracted shared utility to fs-utils.js"
  node execute.js --skip dir-2026-05-24-007 "Too large for automated execution"
`);
  process.exit(0);
}

/**
 * Display a single item with full execution context.
 */
async function displayExecutionContext(item) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXECUTE: ${item.id}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Title:       ${item.title}`);
  console.log(`Target:      ${item.target}`);
  console.log(`Lens:        ${item.lens}`);
  console.log(`Criterion:   ${item.criterion || '—'}`);
  console.log(`Effort:      ${item.effort}`);
  console.log(`Priority:    ${item.priority_score}`);
  console.log(`Status:      ${item.status}`);

  if (item.description) {
    console.log(`\nDescription:`);
    console.log(`  ${item.description}`);
  }

  if (item.target_path) {
    console.log(`\nTarget path: ${item.target_path}`);
  }

  if (item.files && item.files.length > 0) {
    console.log(`\nFiles to modify:`);
    for (const f of item.files) {
      console.log(`  - ${f}`);
    }
  }

  if (item.reference) {
    console.log(`\nReference:   ${item.reference}`);
  }

  // Research context
  try {
    const research = await queryBank(DATA_DIR, {
      target: item.target,
      maxAge: 60,
    });
    if (research.length > 0) {
      console.log(`\nResearch context (${research.length} entries):`);
      for (const entry of research.slice(0, 3)) {
        console.log(`  Query: "${entry.query}"`);
        if (entry.results) {
          for (const r of entry.results.slice(0, 2)) {
            console.log(`    - ${r.title || r.url}`);
            if (r.url) console.log(`      ${r.url}`);
          }
        }
      }
    }
  } catch {
    // Research bank not available — fine
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('To mark done:  node execute.js --done ' + item.id + ' "description of what was done"');
  console.log('To skip:       node execute.js --skip ' + item.id + ' "reason"');
  console.log(`${'='.repeat(60)}\n`);
}

async function main() {
  // Mark item as done
  if (values.done) {
    const notes = positionals.join(' ') || '';

    // Capture git context automatically
    let gitContext = {};
    try {
      const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      const commitMsg = execSync('git log -1 --format=%s', { encoding: 'utf-8' }).trim();
      const diffStat = execSync('git diff --stat HEAD~1 -- . 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim();
      gitContext = {
        commit_hash: commitHash,
        commit_message: commitMsg,
        diff_summary: diffStat.split('\n').slice(-1)[0] || '', // last line = summary
      };
    } catch {
      // Git not available or no commits — fine
    }

    await updateItem(DATA_DIR, values.done, {
      status: 'done',
      execution_notes: notes,
      executed_at: new Date().toISOString(),
      ...gitContext,
    });
    console.log(`Done: ${values.done}${notes ? ' — ' + notes : ''}`);
    if (gitContext.commit_hash) {
      console.log(`  Git: ${gitContext.commit_hash} — ${gitContext.commit_message}`);
    }

    // Show next item
    const next = await getNextItem(DATA_DIR);
    if (next) {
      console.log(`\nNext up: [${next.priority_score}] ${next.id} — ${next.title} (${next.effort})`);
    }
    return;
  }

  // Mark item as skipped
  if (values.skip) {
    const reason = positionals.join(' ') || 'Deferred';
    await updateItem(DATA_DIR, values.skip, {
      status: 'skipped',
      execution_notes: reason,
      skipped_at: new Date().toISOString(),
    });
    console.log(`Skipped: ${values.skip} — ${reason}`);
    return;
  }

  // List execution queue
  if (values.list) {
    const items = await queryItems(DATA_DIR, { status: 'pending' });
    items.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

    if (items.length === 0) {
      console.log('Execution queue is empty. Run a scan first.');
      return;
    }

    console.log(`\nExecution Queue (${items.length} pending):\n`);

    // Group by effort
    const byEffort = {};
    for (const item of items) {
      const effort = item.effort || 'unknown';
      if (!byEffort[effort]) byEffort[effort] = [];
      byEffort[effort].push(item);
    }

    for (const [effort, group] of Object.entries(byEffort).sort()) {
      console.log(`  ${effort.toUpperCase()} (${group.length}):`);
      for (const item of group.slice(0, 5)) {
        console.log(`    [${item.priority_score}] ${item.id} — ${item.title} (${item.target})`);
      }
      if (group.length > 5) {
        console.log(`    ... and ${group.length - 5} more`);
      }
      console.log('');
    }
    return;
  }

  // Get specific item or next item
  let item;

  if (values.id) {
    const backlog = await loadBacklogAsync(DATA_DIR);
    item = backlog.items.find(i => i.id === values.id);
    if (!item) {
      console.error(`Item ${values.id} not found in backlog.`);
      process.exit(1);
    }
  } else {
    const filters = {};
    if (values.target) filters.target = values.target;
    if (values.effort) filters.effort = values.effort;
    item = await getNextItem(DATA_DIR, filters);
  }

  if (!item) {
    console.log('No pending items in backlog.');
    if (values.target || values.effort) {
      console.log(`Filters: target=${values.target || 'any'}, effort=${values.effort || 'any'}`);
    }
    return;
  }

  // Mark as in_progress
  if (item.status === 'pending') {
    await updateItem(DATA_DIR, item.id, {
      status: 'in_progress',
      started_at: new Date().toISOString(),
    });
    item.status = 'in_progress';
  }

  // Display full execution context
  await displayExecutionContext(item);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
