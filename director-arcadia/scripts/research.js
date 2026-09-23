#!/usr/bin/env node

/**
 * Director Research CLI
 *
 * Uses Exa semantic search to discover improvements and patterns
 * from similar open-source projects. Enriches the backlog with
 * external research findings.
 *
 * Usage:
 *   node research.js --target videodrome [--focus code-quality]
 *   node research.js --query "React error handling patterns"
 *
 * Requires: Exa MCP server configured in Claude Code
 * When run standalone (without MCP), outputs query suggestions for manual search.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { getTarget } from '../lib/target-resolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ATELIER_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(__dirname, '../data');

const { values } = parseArgs({
  options: {
    target: { type: 'string', short: 't' },
    focus: { type: 'string', short: 'f' },
    query: { type: 'string', short: 'q' },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`
Director Research — Discover improvements from external sources

Usage:
  node research.js --target <name> [--focus <lens>]
  node research.js --query "custom search query"

Options:
  --target, -t  Target name (videodrome, core, desktop, etc.)
  --focus, -f   Focus area (code-quality, ui-ux, performance, architecture, dx-tooling)
  --query, -q   Custom Exa search query
  --help, -h    Show this help message

This script generates Exa search queries for discovering improvements
from similar open-source projects. Use within Claude Code to auto-execute
searches via the Exa MCP tool, or copy queries for manual research.

Examples:
  node research.js --target videodrome --focus performance
  node research.js --query "React TypeScript mutation hook patterns"
`);
  process.exit(0);
}

async function loadExternalLens() {
  const lensPath = path.join(ATELIER_ROOT, 'lenses', 'external-patterns.yaml');
  const raw = await fs.readFile(lensPath, 'utf-8');
  return yaml.load(raw);
}

async function main() {
  const lens = await loadExternalLens();

  // Custom query mode
  if (values.query) {
    console.log('\n=== Director Research: Custom Query ===\n');
    console.log(`Query: ${values.query}`);
    console.log('\nTo search via Exa MCP:');
    console.log(`  mcp__exa__web_search_exa({ query: "${values.query}", numResults: 10 })`);
    console.log('\nOr use the exa-server variant:');
    console.log(`  mcp__exa-server__web_search_exa({ query: "${values.query}", numResults: 10 })`);
    return;
  }

  if (!values.target) {
    console.error('Error: --target <name> or --query "..." is required. Use --help for usage.');
    process.exit(1);
  }

  const targetName = values.target;
  const techStack = lens.tech_stack[targetName];

  if (!techStack) {
    console.error(`Target '${targetName}' not found in external-patterns.yaml tech_stack mapping.`);
    console.error(`Available: ${Object.keys(lens.tech_stack).join(', ')}`);
    process.exit(1);
  }

  // Load target description for context-aware query substitution
  const targetConfig = await getTarget(DATA_DIR, targetName);
  const description = targetConfig?.description || targetName;

  // Context-aware focus substitutions (same as scan-orchestrator)
  const focusDefaults = {
    architecture: 'modular architecture',
    'ui-ux': 'user experience',
    performance: 'runtime performance',
    'dx-tooling': 'developer tooling',
    'code-quality': 'code maintainability',
  };

  console.log(`\n=== Director Research: ${targetName} ===`);
  console.log(`Tech stack: ${techStack}`);
  console.log(`Description: ${description}\n`);

  // Generate queries
  const queries = [];
  for (const template of lens.research_queries) {
    if (values.focus && template.focus !== values.focus) continue;

    const query = template.query
      .replace(/\{target_tech\}/g, techStack)
      .replace(/\{pattern\}/g, focusDefaults[template.focus] || description)
      .replace(/\{issue\}/g, description);

    queries.push({ query, focus: template.focus });
  }

  if (queries.length === 0) {
    console.log(`No queries match focus '${values.focus}'.`);
    console.log(`Available: ${lens.research_queries.map(q => q.focus).join(', ')}`);
    return;
  }

  console.log(`Generated ${queries.length} research queries:\n`);

  for (let i = 0; i < queries.length; i++) {
    const { query, focus } = queries[i];
    console.log(`${i + 1}. [${focus}] ${query}`);
  }

  console.log('\n--- Exa MCP Search Commands ---\n');
  console.log('Use these within Claude Code to run the searches:\n');

  for (const { query, focus } of queries) {
    console.log(`// ${focus}`);
    console.log(`mcp__exa-server__web_search_exa({ query: "${query}", numResults: 5 })\n`);
  }

  console.log('--- End ---\n');
  console.log('After running searches, add findings to the backlog with:');
  console.log(`  node next.js --target ${targetName}`);
}

main().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
