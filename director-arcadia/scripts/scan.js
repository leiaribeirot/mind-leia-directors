#!/usr/bin/env node

/**
 * Director Scan CLI
 *
 * Scan a target through lenses to discover improvement opportunities.
 *
 * Usage:
 *   node scan.js --target videodrome [--lens code-quality] [--dry-run]
 *   node scan.js --all [--dry-run]
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { DirectorScanOrchestrator } from '../lib/scan-orchestrator.js';
import { listTargetNames } from '../lib/target-resolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DATA_DIR = path.resolve(__dirname, '../data');

const { values } = parseArgs({
  options: {
    target: { type: 'string', short: 't' },
    lens: { type: 'string', short: 'l' },
    'dry-run': { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
Director Scan — Discover improvement opportunities

Usage:
  node scan.js --target <name> [--lens <lens>] [--dry-run]
  node scan.js --all [--dry-run]

Options:
  --target, -t  Target name from targets.yaml (e.g., videodrome, core, desktop)
  --lens, -l    Specific lens to apply (e.g., code-quality, ui-ux)
  --dry-run     Display findings without writing to backlog
  --all         Scan all registered targets
  --help, -h    Show this help message

Examples:
  node scan.js --target videodrome
  node scan.js --target core --lens code-quality --dry-run
  node scan.js --all --dry-run
`);
  process.exit(0);
}

async function main() {
  const targets = [];

  if (values.all) {
    const names = await listTargetNames(DATA_DIR);
    targets.push(...names);
    console.log(`Scanning all targets: ${targets.join(', ')}\n`);
  } else if (values.target) {
    targets.push(values.target);
  } else {
    console.error('Error: --target <name> or --all is required. Use --help for usage.');
    process.exit(1);
  }

  const lenses = values.lens ? [values.lens] : undefined;
  const dryRun = values['dry-run'] || false;

  const results = [];

  for (const target of targets) {
    try {
      const orchestrator = new DirectorScanOrchestrator({
        projectRoot: PROJECT_ROOT,
        target,
        lenses,
        dryRun,
      });

      const result = await orchestrator.run();
      results.push({ target, ...result });
    } catch (error) {
      console.error(`Error scanning ${target}: ${error.message}`);
      results.push({ target, error: error.message });
    }
  }

  // Final summary if multiple targets
  if (results.length > 1) {
    console.log('\n=== All Targets Summary ===');
    for (const r of results) {
      if (r.error) {
        console.log(`  ${r.target}: ERROR — ${r.error}`);
      } else {
        console.log(`  ${r.target}: ${r.summary.findings_new} new findings, ${r.summary.committed} committed`);
      }
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
