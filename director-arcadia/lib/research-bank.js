/**
 * Research Bank — Director Atelier
 *
 * Persists Exa search results for reuse across sessions.
 * Queries are cached with a reuse window (default 30 days).
 * Findings link back to backlog items that used them.
 *
 * Flow:
 *   1. Before searching Exa, check if a similar query ran recently
 *   2. If cache hit (< reuse_window_days old), return cached results
 *   3. If miss, run the search, store results, return them
 *   4. When a backlog item uses a research entry, link them via used_in[]
 */

import path from 'path';
import crypto from 'crypto';
import { atomicWriteJson, loadJsonSafe } from './fs-utils.js';

const BANK_FILE = 'research-bank.json';

/**
 * Load the research bank from disk.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @returns {Promise<object>} Research bank
 */
/**
 * Create a fresh empty bank object (avoids shared reference bugs).
 * @returns {object}
 */
function createEmptyBank() {
  return { version: 1, last_updated: null, reuse_window_days: 30, entries: [] };
}

export async function loadBank(dataDir) {
  const filePath = path.join(dataDir, BANK_FILE);
  return loadJsonSafe(filePath, createEmptyBank());
}

/**
 * Save the research bank with atomic write.
 * @param {string} dataDir
 * @param {object} bank
 */
async function saveBank(dataDir, bank) {
  bank.last_updated = new Date().toISOString();
  await atomicWriteJson(path.join(dataDir, BANK_FILE), bank);
}

/**
 * Generate a deterministic ID for a query (for dedup).
 * @param {string} query - Search query
 * @param {string} target - Target name
 * @returns {string} Hash-based ID
 */
function queryHash(query, target) {
  return crypto.createHash('sha256')
    .update(`${target}::${query.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 12);
}

/**
 * Check if a similar query has cached results within the reuse window.
 * @param {string} dataDir
 * @param {string} query - Search query
 * @param {string} target - Target name
 * @returns {Promise<object|null>} Cached entry or null
 */
export async function findCached(dataDir, query, target) {
  const bank = await loadBank(dataDir);
  const hash = queryHash(query, target);
  const windowMs = (bank.reuse_window_days || 30) * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;

  const entry = bank.entries.find(e =>
    e.query_hash === hash && new Date(e.timestamp).getTime() > cutoff
  );

  return entry || null;
}

/**
 * Store search results in the bank.
 * @param {string} dataDir
 * @param {object} entry - Research entry
 * @param {string} entry.query - Original search query
 * @param {string} entry.target - Target name
 * @param {string} entry.focus - Focus area (code-quality, ui-ux, etc.)
 * @param {object[]} entry.results - Array of search results
 * @param {string} entry.results[].url - Source URL
 * @param {string} entry.results[].title - Result title
 * @param {string} entry.results[].highlights - Key content extracted
 * @param {number} [entry.results[].relevance] - 0-1 relevance score
 * @returns {Promise<string>} Entry ID
 */
export async function storeResults(dataDir, entry) {
  if (!entry || !entry.query || !entry.target) {
    throw new Error(`Research entry missing required fields. query: "${entry?.query || ''}", target: "${entry?.target || ''}"`);
  }

  const bank = await loadBank(dataDir);
  const hash = queryHash(entry.query, entry.target);

  const id = `res-${new Date().toISOString().slice(0, 10)}-${hash.slice(0, 6)}`;

  // Upsert: replace existing entry with same hash, or append
  const existingIdx = bank.entries.findIndex(e => e.query_hash === hash);

  const fullEntry = {
    id,
    query_hash: hash,
    query: entry.query,
    target: entry.target,
    focus: entry.focus || 'general',
    results: entry.results || [],
    result_count: (entry.results || []).length,
    timestamp: new Date().toISOString(),
    used_in: [],
  };

  if (existingIdx >= 0) {
    // Preserve used_in links from previous entry
    fullEntry.used_in = bank.entries[existingIdx].used_in || [];
    bank.entries[existingIdx] = fullEntry;
  } else {
    bank.entries.push(fullEntry);
  }

  await saveBank(dataDir, bank);
  return id;
}

/**
 * Link a research entry to a backlog item.
 * @param {string} dataDir
 * @param {string} researchId - Research entry ID
 * @param {string} backlogItemId - Backlog item ID
 */
export async function linkToBacklogItem(dataDir, researchId, backlogItemId) {
  const bank = await loadBank(dataDir);
  const entry = bank.entries.find(e => e.id === researchId);
  if (!entry) return;

  if (!entry.used_in.includes(backlogItemId)) {
    entry.used_in.push(backlogItemId);
    await saveBank(dataDir, bank);
  }
}

/**
 * Query the research bank by target and/or focus.
 * @param {string} dataDir
 * @param {object} [filters]
 * @param {string} [filters.target]
 * @param {string} [filters.focus]
 * @param {number} [filters.maxAge] - Max age in days
 * @returns {Promise<object[]>} Matching entries
 */
export async function queryBank(dataDir, filters = {}) {
  const bank = await loadBank(dataDir);
  let entries = bank.entries;

  if (filters.target) entries = entries.filter(e => e.target === filters.target);
  if (filters.focus) entries = entries.filter(e => e.focus === filters.focus);
  if (filters.maxAge) {
    const cutoff = Date.now() - (filters.maxAge * 24 * 60 * 60 * 1000);
    entries = entries.filter(e => new Date(e.timestamp).getTime() > cutoff);
  }

  // Most recent first
  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return entries;
}

/**
 * Get bank statistics.
 * @param {string} dataDir
 * @returns {Promise<object>} Stats
 */
export async function getBankStats(dataDir) {
  const bank = await loadBank(dataDir);

  const byTarget = {};
  const byFocus = {};
  let totalResults = 0;
  let totalLinked = 0;

  for (const entry of bank.entries) {
    byTarget[entry.target] = (byTarget[entry.target] || 0) + 1;
    byFocus[entry.focus] = (byFocus[entry.focus] || 0) + 1;
    totalResults += entry.result_count || 0;
    totalLinked += (entry.used_in || []).length;
  }

  return {
    total_queries: bank.entries.length,
    total_results: totalResults,
    total_linked: totalLinked,
    by_target: byTarget,
    by_focus: byFocus,
    last_updated: bank.last_updated,
  };
}

/**
 * Prune old entries that haven't been used and are past the reuse window.
 * Entries linked to backlog items are kept regardless of age.
 * @param {string} dataDir
 * @returns {Promise<number>} Number pruned
 */
export async function pruneStale(dataDir) {
  const bank = await loadBank(dataDir);
  const windowMs = (bank.reuse_window_days || 30) * 2 * 24 * 60 * 60 * 1000; // 2x reuse window
  const cutoff = Date.now() - windowMs;

  const before = bank.entries.length;
  bank.entries = bank.entries.filter(e => {
    // Keep if linked to backlog items
    if (e.used_in && e.used_in.length > 0) return true;
    // Keep if within 2x reuse window
    return new Date(e.timestamp).getTime() > cutoff;
  });

  const pruned = before - bank.entries.length;
  if (pruned > 0) await saveBank(dataDir, bank);
  return pruned;
}
