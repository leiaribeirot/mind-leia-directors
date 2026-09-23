/**
 * Backlog Manager — Director Atelier
 *
 * CRUD operations for the persistent improvement backlog.
 * Atomic writes via temp+rename. Deduplication by target_path + criterion
 * and title similarity.
 */

import path from 'path';
import { atomicWriteJson, loadJsonSafe } from './fs-utils.js';

const BACKLOG_FILE = 'backlog.json';

/**
 * Create a fresh empty backlog object (avoids shared reference bugs).
 * @returns {object}
 */
function createEmptyBacklog() {
  return { version: 1, last_updated: null, items: [] };
}

/**
 * Load the backlog from disk.
 * Returns empty backlog if file doesn't exist. Throws on corrupted JSON.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @returns {Promise<object>} Backlog object
 */
export async function loadBacklogAsync(dataDir) {
  const filePath = path.join(dataDir, BACKLOG_FILE);
  return loadJsonSafe(filePath, createEmptyBacklog());
}

/**
 * Save the backlog to disk with atomic write (temp + rename).
 * Includes optimistic concurrency check: if another process wrote since we
 * loaded, the version won't match and we throw a conflict error.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {object} backlog - Backlog object to save
 */
export async function saveBacklog(dataDir, backlog) {
  const filePath = path.join(dataDir, BACKLOG_FILE);

  // Optimistic concurrency: re-read version from disk before writing
  const current = await loadJsonSafe(filePath, null);
  if (current && current.version !== backlog.version) {
    throw new Error(
      `Backlog write conflict: loaded version ${backlog.version} but disk has version ${current.version}. Another process modified the backlog.`
    );
  }

  backlog.version = (backlog.version || 1) + 1;
  backlog.last_updated = new Date().toISOString();
  await atomicWriteJson(filePath, backlog);
}

/**
 * Generate a backlog item ID.
 * Format: dir-YYYY-MM-DD-NNN (NNN = sequential within the day)
 * @param {object[]} existingItems - Current backlog items
 * @returns {string} New unique ID
 */
function generateId(existingItems) {
  const today = new Date().toISOString().slice(0, 10);
  const prefix = `dir-${today}-`;

  const todayItems = existingItems.filter(item => item.id.startsWith(prefix));
  const maxSeq = todayItems.reduce((max, item) => {
    const seq = parseInt(item.id.slice(prefix.length), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

/**
 * Required fields for a backlog item (used by dedup and scoring).
 */
const REQUIRED_FIELDS = ['lens', 'criterion', 'title', 'target'];

/**
 * Add items to the backlog, auto-generating IDs and deduplicating.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {object[]} newItems - Items to add (without id)
 * @returns {Promise<{added: number, duplicates: number, items: object[]}>}
 */
export async function addItems(dataDir, newItems) {
  // Validate required fields
  for (const item of newItems) {
    const missing = REQUIRED_FIELDS.filter(f => !item[f]);
    if (missing.length > 0) {
      throw new Error(`Backlog item missing required fields: ${missing.join(', ')}. Title: "${item.title || '(none)'}"`);
    }
  }

  const backlog = await loadBacklogAsync(dataDir);
  const { unique, duplicateCount } = dedup(backlog.items, newItems);

  const addedItems = [];
  for (const item of unique) {
    const id = generateId([...backlog.items, ...addedItems]);
    const fullItem = {
      id,
      ...item,
      target_path: item.target_path || '',
      status: item.status || 'pending',
      created: item.created || new Date().toISOString().slice(0, 10),
      updated: null,
      execution_notes: null,
    };
    addedItems.push(fullItem);
  }

  backlog.items.push(...addedItems);
  await saveBacklog(dataDir, backlog);

  return { added: addedItems.length, duplicates: duplicateCount, items: addedItems };
}

/**
 * Update a backlog item by ID (partial update).
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {string} id - Item ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object|null>} Updated item or null if not found
 */
export async function updateItem(dataDir, id, updates) {
  const backlog = await loadBacklogAsync(dataDir);
  const item = backlog.items.find(i => i.id === id);

  if (!item) return null;

  Object.assign(item, updates, { updated: new Date().toISOString().slice(0, 10) });
  await saveBacklog(dataDir, backlog);

  return item;
}

/**
 * Get the next highest-priority pending item.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {object} [filters] - Optional filters
 * @param {string} [filters.target] - Filter by target
 * @param {string} [filters.lens] - Filter by lens
 * @param {string} [filters.effort] - Filter by effort level
 * @returns {Promise<object|null>} Next item or null
 */
export async function getNextItem(dataDir, filters = {}) {
  const backlog = await loadBacklogAsync(dataDir);

  let candidates = backlog.items.filter(i => i.status === 'pending');

  if (filters.target) candidates = candidates.filter(i => i.target === filters.target);
  if (filters.lens) candidates = candidates.filter(i => i.lens === filters.lens);
  if (filters.effort) candidates = candidates.filter(i => i.effort === filters.effort);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  return candidates[0];
}

/**
 * Query backlog items with filters.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {object} [filters] - Filters
 * @param {string} [filters.status] - Filter by status
 * @param {string} [filters.target] - Filter by target
 * @param {string} [filters.lens] - Filter by lens
 * @param {string} [filters.effort] - Filter by effort
 * @returns {Promise<object[]>} Matching items
 */
export async function queryItems(dataDir, filters = {}) {
  const backlog = await loadBacklogAsync(dataDir);
  let items = backlog.items;

  if (filters.status) items = items.filter(i => i.status === filters.status);
  if (filters.target) items = items.filter(i => i.target === filters.target);
  if (filters.lens) items = items.filter(i => i.lens === filters.lens);
  if (filters.effort) items = items.filter(i => i.effort === filters.effort);

  return items;
}

/**
 * Deduplicate new items against existing backlog.
 * Duplicate = same target_path + criterion, or title overlap > 85%.
 * @param {object[]} existing - Existing backlog items
 * @param {object[]} newItems - New items to check
 * @returns {{ unique: object[], duplicateCount: number }}
 */
export function dedup(existing, newItems) {
  const unique = [];
  let duplicateCount = 0;

  // Check against existing backlog AND already-accepted new items
  const allExisting = [...existing];

  for (const newItem of newItems) {
    const isDuplicate = allExisting.some(ex => {
      // Exact match: same target_path + criterion (when target_path is populated)
      if (ex.target_path && newItem.target_path &&
          ex.target_path === newItem.target_path && ex.criterion === newItem.criterion) {
        return true;
      }
      // Fuzzy match: same target + title similarity > 85%
      if (ex.target === newItem.target && titleSimilarity(ex.title, newItem.title) > 0.85) {
        return true;
      }
      return false;
    });

    if (isDuplicate) {
      duplicateCount++;
    } else {
      unique.push(newItem);
      allExisting.push(newItem); // Prevent intra-batch duplicates
    }
  }

  return { unique, duplicateCount };
}

/**
 * Simple title similarity using bigram overlap (Dice coefficient).
 * @param {string} a - First title
 * @param {string} b - Second title
 * @returns {number} Similarity score 0-1
 */
function titleSimilarity(a, b) {
  if (!a || !b) return 0;

  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const normA = normalize(a);
  const normB = normalize(b);

  // Short strings: fall back to exact match (bigrams need 2+ chars)
  if (normA.length < 4 || normB.length < 4) {
    return normA === normB ? 1 : 0;
  }

  const bigrams = s => {
    const result = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      result.add(s.slice(i, i + 2));
    }
    return result;
  };

  const setA = bigrams(normA);
  const setB = bigrams(normB);

  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }

  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Remove completed/skipped items older than maxAge days.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {number} [maxAgeDays=90] - Max age in days
 * @returns {Promise<number>} Number of pruned items
 */
export async function pruneCompleted(dataDir, maxAgeDays = 90) {
  const backlog = await loadBacklogAsync(dataDir);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const before = backlog.items.length;
  backlog.items = backlog.items.filter(item => {
    if (item.status !== 'done' && item.status !== 'skipped') return true;
    const dateStr = item.updated || item.created;
    return dateStr >= cutoffStr;
  });

  const pruned = before - backlog.items.length;
  if (pruned > 0) {
    await saveBacklog(dataDir, backlog);
  }
  return pruned;
}

/**
 * Get backlog statistics summary.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @returns {Promise<object>} Summary stats
 */
export async function getStats(dataDir) {
  const backlog = await loadBacklogAsync(dataDir);
  const items = backlog.items;

  const byStatus = {};
  const byTarget = {};
  const byLens = {};
  const byEffort = {};

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    byTarget[item.target] = (byTarget[item.target] || 0) + 1;
    byLens[item.lens] = (byLens[item.lens] || 0) + 1;
    byEffort[item.effort] = (byEffort[item.effort] || 0) + 1;
  }

  return {
    total: items.length,
    last_updated: backlog.last_updated,
    by_status: byStatus,
    by_target: byTarget,
    by_lens: byLens,
    by_effort: byEffort,
  };
}
