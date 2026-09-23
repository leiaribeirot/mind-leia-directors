#!/usr/bin/env node

/**
 * Director Status CLI
 *
 * Display backlog status, statistics, and scan history.
 *
 * Usage:
 *   node status.js [--target videodrome] [--lens code-quality]
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import fs from 'fs/promises';
import { getStats, queryItems, pruneCompleted } from '../lib/backlog-manager.js';
import { getBankStats, pruneStale } from '../lib/research-bank.js';
import { getMetricsSummary } from '../lib/metrics-tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

const { values } = parseArgs({
  options: {
    target: { type: 'string', short: 't' },
    lens: { type: 'string', short: 'l' },
    history: { type: 'boolean', default: false },
    metrics: { type: 'boolean', short: 'm', default: false },
    verbose: { type: 'boolean', short: 'v', default: false },
    prune: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
Director Status — Backlog status and statistics

Usage:
  node status.js [--target <name>] [--lens <lens>]
  node status.js --history
  node status.js --metrics
  node status.js --verbose

Options:
  --target, -t   Filter by target
  --lens, -l     Filter by lens
  --history      Show recent scan history
  --metrics, -m  Show velocity and burndown metrics
  --verbose, -v  Show detailed item list
  --prune        Remove old done/skipped items (>90 days) and stale research
  --help, -h     Show this help message

Examples:
  node status.js                         # Overall backlog summary
  node status.js --target videodrome     # Videodrome-specific status
  node status.js --metrics               # Velocity + burndown
  node status.js --history               # Recent scan history
  node status.js --verbose               # All items listed
`);
  process.exit(0);
}

function padRight(str, len) {
  return String(str).padEnd(len);
}

function padLeft(str, len) {
  return String(str).padStart(len);
}

async function main() {
  // Prune old items if requested
  if (values.prune) {
    const prunedBacklog = await pruneCompleted(DATA_DIR, 90);
    const prunedResearch = await pruneStale(DATA_DIR);
    console.log(`\nPrune: ${prunedBacklog} backlog items removed (done/skipped >90 days)`);
    console.log(`Prune: ${prunedResearch} research entries removed (stale, unlinked)\n`);
  }

  const stats = await getStats(DATA_DIR);

  console.log('\n=== Director Backlog Status ===\n');
  console.log(`Total items: ${stats.total}`);
  console.log(`Last updated: ${stats.last_updated || 'never'}\n`);

  // Status breakdown
  if (Object.keys(stats.by_status).length > 0) {
    console.log('By Status:');
    for (const [status, count] of Object.entries(stats.by_status)) {
      console.log(`  ${padRight(status, 12)} ${count}`);
    }
    console.log('');
  }

  // Target breakdown
  if (Object.keys(stats.by_target).length > 0) {
    console.log('By Target:');
    for (const [target, count] of Object.entries(stats.by_target)) {
      console.log(`  ${padRight(target, 16)} ${count}`);
    }
    console.log('');
  }

  // Lens breakdown
  if (Object.keys(stats.by_lens).length > 0) {
    console.log('By Lens:');
    for (const [lens, count] of Object.entries(stats.by_lens)) {
      console.log(`  ${padRight(lens, 20)} ${count}`);
    }
    console.log('');
  }

  // Effort breakdown
  if (Object.keys(stats.by_effort).length > 0) {
    console.log('By Effort:');
    for (const [effort, count] of Object.entries(stats.by_effort)) {
      console.log(`  ${padRight(effort, 12)} ${count}`);
    }
    console.log('');
  }

  // Filtered view
  if (values.target || values.lens) {
    const filters = { status: 'pending' };
    if (values.target) filters.target = values.target;
    if (values.lens) filters.lens = values.lens;

    const items = await queryItems(DATA_DIR, filters);
    items.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

    const filterDesc = [values.target, values.lens].filter(Boolean).join(' + ');
    console.log(`\nFiltered (${filterDesc}): ${items.length} pending items`);

    for (const item of items.slice(0, 10)) {
      console.log(`  [${padLeft(item.priority_score || '?', 3)}] ${item.id} — ${item.title} (${item.effort})`);
    }
    if (items.length > 10) {
      console.log(`  ... and ${items.length - 10} more`);
    }
  }

  // Verbose: list all items
  if (values.verbose) {
    const items = await queryItems(DATA_DIR, {});
    items.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

    console.log(`\nAll Items (${items.length}):\n`);
    for (const item of items) {
      const statusIcon = item.status === 'done' ? 'x' : item.status === 'skipped' ? '-' : ' ';
      console.log(`  [${statusIcon}] [${padLeft(item.priority_score || '?', 3)}] ${item.id} — ${item.title}`);
      console.log(`      ${item.lens}/${item.criterion} | ${item.target} | ${item.effort}`);
    }
  }

  // Research bank stats
  const bankStats = await getBankStats(DATA_DIR);
  if (bankStats.total_queries > 0) {
    console.log('Research Bank:');
    console.log(`  Queries: ${bankStats.total_queries} | Results: ${bankStats.total_results} | Linked: ${bankStats.total_linked}`);
    if (Object.keys(bankStats.by_target).length > 0) {
      console.log(`  By target: ${Object.entries(bankStats.by_target).map(([t, c]) => `${t}(${c})`).join(', ')}`);
    }
    console.log('');
  }

  // Metrics: velocity + burndown
  if (values.metrics) {
    const summary = await getMetricsSummary(DATA_DIR, values.target || undefined);

    console.log('Velocity (last 4 weeks):');
    if (summary.velocity.weeks.length === 0) {
      console.log('  No sessions recorded yet.');
    } else {
      for (const w of summary.velocity.weeks) {
        const bar = '#'.repeat(Math.min(w.executed, 40));
        console.log(`  ${padRight(w.week + ':', 10)} ${padLeft(w.executed, 3)} executed ${bar}`);
      }
      console.log(`  Average: ${summary.velocity.average} items/week`);
    }
    console.log('');

    if (summary.burndown.length > 0) {
      console.log('Burndown (pending items):');
      const recent = summary.burndown.slice(-10);
      for (const b of recent) {
        const bar = '#'.repeat(Math.min(b.pending, 40));
        console.log(`  ${padRight(b.date + ':', 12)} ${padLeft(b.pending, 3)} pending ${bar}`);
      }
      console.log('');
    }

    console.log(`Total sessions: ${summary.total_sessions} | Total executed: ${summary.trends.total_executed}`);
    if (summary.last_session) {
      console.log(`Last session: ${summary.last_session.id} (${summary.last_session.target}, ${summary.last_session.items_executed} executed)`);
    }
    console.log('');
  }

  // Scan history
  if (values.history) {
    const historyPath = path.join(DATA_DIR, 'scan-history.json');
    try {
      const raw = await fs.readFile(historyPath, 'utf-8');
      const history = JSON.parse(raw);

      console.log(`\nScan History (${history.scans.length} scans):\n`);
      const recent = history.scans.slice(-10).reverse();
      for (const scan of recent) {
        const dryTag = scan.dry_run ? ' [dry-run]' : '';
        console.log(`  ${scan.id} — ${scan.target} (${scan.files_scanned} files, ${scan.findings_new} new)${dryTag}`);
        console.log(`    Lenses: ${scan.lenses.join(', ')} | ${scan.timestamp}`);
      }
    } catch {
      console.log('\nNo scan history yet.');
    }
  }

  console.log('');
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
