#!/usr/bin/env node

/**
 * Director Next CLI
 *
 * Pick and display the next backlog item for execution.
 *
 * Usage:
 *   node next.js [--target videodrome] [--id dir-2026-05-24-001]
 *   node next.js --max-items 3
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { getNextItem, queryItems, updateItem } from '../lib/backlog-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

const { values } = parseArgs({
  options: {
    target: { type: 'string', short: 't' },
    id: { type: 'string' },
    lens: { type: 'string', short: 'l' },
    effort: { type: 'string', short: 'e' },
    'max-items': { type: 'string', short: 'n', default: '1' },
    'mark-done': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
Director Next — Pick the next improvement to execute

Usage:
  node next.js [--target <name>] [--lens <lens>] [--effort <level>]
  node next.js --id <item-id> [--mark-done]
  node next.js --max-items 3

Options:
  --target, -t    Filter by target
  --id            Get specific item by ID
  --lens, -l      Filter by lens
  --effort, -e    Filter by effort (small, medium, large, xlarge)
  --max-items, -n Show top N items (default: 1)
  --mark-done     Mark the item as done (use with --id)
  --help, -h      Show this help message

Examples:
  node next.js                                  # Show highest priority item
  node next.js --target videodrome --effort small  # Small videodrome items
  node next.js --id dir-2026-05-24-001 --mark-done # Mark specific item done
  node next.js --max-items 5                     # Show top 5 items
`);
  process.exit(0);
}

function displayItem(item, index = null) {
  const prefix = index !== null ? `${index + 1}. ` : '';
  console.log(`${prefix}[${item.priority_score || '?'}] ${item.id}`);
  console.log(`   Lens: ${item.lens} | Criterion: ${item.criterion}`);
  console.log(`   Target: ${item.target} | Effort: ${item.effort} | Priority: ${item.priority}`);
  console.log(`   Title: ${item.title}`);
  if (item.description) {
    console.log(`   Description: ${item.description}`);
  }
  if (item.files && item.files.length > 0) {
    console.log(`   Files: ${item.files.slice(0, 5).join(', ')}${item.files.length > 5 ? ` (+${item.files.length - 5} more)` : ''}`);
  }
  console.log('');
}

async function main() {
  // Mark an item as done
  if (values.id && values['mark-done']) {
    const updated = await updateItem(DATA_DIR, values.id, {
      status: 'done',
      execution_notes: 'Marked done via CLI',
    });
    if (updated) {
      console.log(`Marked ${values.id} as done`);
    } else {
      console.error(`Item ${values.id} not found`);
      process.exit(1);
    }
    return;
  }

  // Get specific item by ID
  if (values.id) {
    const items = await queryItems(DATA_DIR, {});
    const item = items.find(i => i.id === values.id);
    if (item) {
      displayItem(item);
    } else {
      console.error(`Item ${values.id} not found`);
      process.exit(1);
    }
    return;
  }

  // Build filters
  const maxItems = parseInt(values['max-items'], 10) || 1;
  const filters = {};
  if (values.target) filters.target = values.target;
  if (values.lens) filters.lens = values.lens;
  if (values.effort) filters.effort = values.effort;

  // Single item: use dedicated getNextItem (already handles filter+sort)
  if (maxItems === 1) {
    const item = await getNextItem(DATA_DIR, filters);
    if (!item) {
      console.log('No pending items in backlog.');
      if (Object.keys(filters).length > 0) {
        console.log(`Filters: ${JSON.stringify(filters)}`);
      }
      return;
    }
    console.log('Next item (highest priority pending):\n');
    displayItem(item);
    return;
  }

  // Multiple items: query and sort
  const items = await queryItems(DATA_DIR, { ...filters, status: 'pending' });
  items.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  const display = items.slice(0, maxItems);

  if (display.length === 0) {
    console.log('No pending items in backlog.');
    if (Object.keys(filters).length > 0) {
      console.log(`Filters: ${JSON.stringify(filters)}`);
    }
    return;
  }

  console.log(`Next ${display.length} items (${items.length} total pending):\n`);
  for (let i = 0; i < display.length; i++) {
    displayItem(display[i], i);
  }
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
