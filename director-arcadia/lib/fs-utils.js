/**
 * Filesystem Utilities — Director Atelier
 *
 * Shared I/O helpers. Atomic JSON writes with .tmp cleanup.
 */

import fs from 'fs/promises';

/**
 * Write JSON to file atomically (temp + rename).
 * Cleans up .tmp on failure to prevent orphaned files.
 * @param {string} filePath - Target file path
 * @param {object} data - Data to serialize
 */
export async function atomicWriteJson(filePath, data) {
  const tmpPath = filePath + '.tmp';
  try {
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    // Clean up orphaned .tmp
    try { await fs.unlink(tmpPath); } catch { /* ignore if already gone */ }
    throw error;
  }
}

/**
 * Load a JSON file safely.
 * Returns defaultValue on ENOENT (file not found).
 * Throws on parse errors or permission issues to prevent silent data loss.
 * @param {string} filePath - File to read
 * @param {*} defaultValue - Value to return if file doesn't exist
 * @returns {Promise<*>} Parsed JSON or default
 */
export async function loadJsonSafe(filePath, defaultValue) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw.trim()) return defaultValue; // Empty file = treat as missing
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return defaultValue;
    throw error; // Parse errors and permission errors surface immediately
  }
}
