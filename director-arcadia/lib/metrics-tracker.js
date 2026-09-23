/**
 * Metrics Tracker — Director Atelier
 *
 * Tracks session history, velocity, and burndown for the improvement engine.
 * Each session records findings, executions, and a snapshot of backlog state.
 *
 * Flow:
 *   1. After scan + execute, call recordSession() with session data
 *   2. Automatically snapshots current backlog state (pending/done counts)
 *   3. getVelocity() / getBurndown() / getTrends() for display
 */

import path from 'path';
import { atomicWriteJson, loadJsonSafe } from './fs-utils.js';
import { loadBacklogAsync } from './backlog-manager.js';

const METRICS_FILE = 'metrics.json';

/**
 * Create a fresh empty metrics object.
 * @returns {object}
 */
function createEmptyMetrics() {
  return { version: 1, last_updated: null, sessions: [], snapshots: [] };
}

/**
 * Load the metrics file from disk.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @returns {Promise<object>} Metrics object
 */
export async function loadMetrics(dataDir) {
  const filePath = path.join(dataDir, METRICS_FILE);
  return loadJsonSafe(filePath, createEmptyMetrics());
}

/**
 * Save metrics with atomic write.
 * @param {string} dataDir
 * @param {object} metrics
 */
async function saveMetrics(dataDir, metrics) {
  metrics.last_updated = new Date().toISOString();
  await atomicWriteJson(path.join(dataDir, METRICS_FILE), metrics);
}

/**
 * Generate a session ID.
 * Format: sess-YYYY-MM-DD-NNN
 * @param {object[]} existingSessions
 * @returns {string}
 */
function generateSessionId(existingSessions) {
  const today = new Date().toISOString().slice(0, 10);
  const prefix = `sess-${today}-`;

  const todaySessions = existingSessions.filter(s => s.id.startsWith(prefix));
  const maxSeq = todaySessions.reduce((max, s) => {
    const seq = parseInt(s.id.slice(prefix.length), 10);
    return isNaN(seq) ? max : Math.max(max, seq);
  }, 0);

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

/**
 * Record a session and automatically snapshot backlog state.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {object} sessionData - Session data
 * @param {string} sessionData.target - Target scanned
 * @param {number} sessionData.findings_new - New findings added
 * @param {number} [sessionData.findings_duplicate] - Duplicate findings skipped
 * @param {number} sessionData.items_executed - Items executed this session
 * @param {number} [sessionData.items_skipped] - Items skipped
 * @param {number} [sessionData.research_queries] - Exa queries run
 * @param {string[]} [sessionData.lenses_applied] - Lenses used
 * @param {number} [sessionData.duration_minutes] - Session duration
 * @returns {Promise<object>} Recorded session with id
 */
export async function recordSession(dataDir, sessionData) {
  if (!sessionData || !sessionData.target) {
    throw new Error('Session data must include a target');
  }
  if (typeof sessionData.findings_new !== 'number') {
    throw new Error('Session data must include findings_new (number)');
  }
  if (typeof sessionData.items_executed !== 'number') {
    throw new Error('Session data must include items_executed (number)');
  }

  const metrics = await loadMetrics(dataDir);
  const id = generateSessionId(metrics.sessions);

  const session = {
    id,
    target: sessionData.target,
    findings_new: sessionData.findings_new,
    findings_duplicate: sessionData.findings_duplicate || 0,
    items_executed: sessionData.items_executed,
    items_skipped: sessionData.items_skipped || 0,
    research_queries: sessionData.research_queries || 0,
    lenses_applied: sessionData.lenses_applied || [],
    duration_minutes: sessionData.duration_minutes || null,
    timestamp: new Date().toISOString(),
  };

  metrics.sessions.push(session);

  // Auto-snapshot backlog state
  const backlog = await loadBacklogAsync(dataDir);
  const pendingByTarget = {};
  let pendingTotal = 0;
  let doneTotal = 0;

  for (const item of backlog.items) {
    if (item.status === 'pending') {
      pendingTotal++;
      pendingByTarget[item.target] = (pendingByTarget[item.target] || 0) + 1;
    } else if (item.status === 'done') {
      doneTotal++;
    }
  }

  const snapshot = {
    date: new Date().toISOString().slice(0, 10),
    session_id: id,
    pending_total: pendingTotal,
    done_total: doneTotal,
    pending_by_target: pendingByTarget,
  };

  metrics.snapshots.push(snapshot);

  await saveMetrics(dataDir, metrics);
  return session;
}

/**
 * Get execution velocity grouped by ISO week.
 * @param {string} dataDir
 * @param {number} [weeks=4] - Number of weeks to look back
 * @param {string} [target] - Optional: filter by target
 * @returns {Promise<object>} { weeks: [{week, executed}], average }
 */
export async function getVelocity(dataDir, weeks = 4, target) {
  const metrics = await loadMetrics(dataDir);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (weeks * 7));

  // Filter sessions within window (and by target if specified)
  let recent = metrics.sessions.filter(
    s => new Date(s.timestamp) >= cutoff
  );
  if (target) {
    recent = recent.filter(s => s.target === target);
  }

  // Group by ISO week
  const weekMap = {};
  for (const session of recent) {
    const week = getISOWeek(new Date(session.timestamp));
    if (!weekMap[week]) weekMap[week] = 0;
    weekMap[week] += session.items_executed;
  }

  // Build ordered week array
  const weekEntries = Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, executed]) => ({ week, executed }));

  const totalExecuted = weekEntries.reduce((sum, w) => sum + w.executed, 0);
  const average = weekEntries.length > 0
    ? Math.round((totalExecuted / weekEntries.length) * 10) / 10
    : 0;

  return { weeks: weekEntries, average, total_sessions: recent.length };
}

/**
 * Get findings aggregated by lens and target.
 * @param {string} dataDir
 * @returns {Promise<object>} { by_lens, by_target, total_findings, total_executed }
 */
export async function getTrends(dataDir) {
  const metrics = await loadMetrics(dataDir);

  const byLens = {};
  const byTarget = {};
  let totalFindings = 0;
  let totalExecuted = 0;

  for (const session of metrics.sessions) {
    totalFindings += session.findings_new;
    totalExecuted += session.items_executed;

    byTarget[session.target] = (byTarget[session.target] || 0) + session.items_executed;

    for (const lens of (session.lenses_applied || [])) {
      byLens[lens] = (byLens[lens] || 0) + 1;
    }
  }

  return { by_lens: byLens, by_target: byTarget, total_findings: totalFindings, total_executed: totalExecuted };
}

/**
 * Get burndown data (pending items over time from snapshots).
 * @param {string} dataDir
 * @param {string} [target] - Optional: filter by target
 * @returns {Promise<object[]>} Array of { date, pending }
 */
export async function getBurndown(dataDir, target) {
  const metrics = await loadMetrics(dataDir);

  return metrics.snapshots.map(snap => ({
    date: snap.date,
    pending: target
      ? (snap.pending_by_target[target] || 0)
      : snap.pending_total,
  }));
}

/**
 * Get combined metrics summary for display.
 * @param {string} dataDir
 * @param {string} [target] - Optional: filter by target
 * @returns {Promise<object>} Display-ready object
 */
export async function getMetricsSummary(dataDir, target) {
  const [velocity, trends, burndown, metrics] = await Promise.all([
    getVelocity(dataDir, 4, target),
    getTrends(dataDir),
    getBurndown(dataDir, target),
    loadMetrics(dataDir),
  ]);

  return {
    velocity,
    trends,
    burndown,
    total_sessions: metrics.sessions.length,
    last_session: metrics.sessions.length > 0
      ? metrics.sessions[metrics.sessions.length - 1]
      : null,
  };
}

/**
 * Get ISO week string (YYYY-Wnn) for a date.
 * @param {Date} date
 * @returns {string}
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
