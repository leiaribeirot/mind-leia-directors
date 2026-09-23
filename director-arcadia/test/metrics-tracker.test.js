import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  loadMetrics,
  recordSession,
  getVelocity,
  getTrends,
  getBurndown,
  getMetricsSummary,
} from '../lib/metrics-tracker.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metrics-tracker-test-'));
  // Create an empty backlog for snapshot logic
  await fs.writeFile(
    path.join(tmpDir, 'backlog.json'),
    JSON.stringify({ version: 1, last_updated: null, items: [] })
  );
});

const makeSession = (overrides = {}) => ({
  target: 'director',
  findings_new: 5,
  findings_duplicate: 1,
  items_executed: 3,
  items_skipped: 0,
  research_queries: 2,
  lenses_applied: ['code-quality', 'architecture'],
  duration_minutes: 10,
  ...overrides,
});

describe('loadMetrics', () => {
  it('returns empty metrics for missing file', async () => {
    const metrics = await loadMetrics(tmpDir);
    expect(metrics.version).toBe(1);
    expect(metrics.sessions).toEqual([]);
    expect(metrics.snapshots).toEqual([]);
    expect(metrics.last_updated).toBeNull();
  });

  it('loads existing metrics file', async () => {
    const data = {
      version: 1,
      last_updated: '2026-05-24T00:00:00Z',
      sessions: [{ id: 'sess-2026-05-24-001', target: 'director' }],
      snapshots: [],
    };
    await fs.writeFile(path.join(tmpDir, 'metrics.json'), JSON.stringify(data));

    const metrics = await loadMetrics(tmpDir);
    expect(metrics.sessions).toHaveLength(1);
    expect(metrics.sessions[0].id).toBe('sess-2026-05-24-001');
  });
});

describe('recordSession', () => {
  it('generates sequential session ID', async () => {
    const session = await recordSession(tmpDir, makeSession());
    expect(session.id).toMatch(/^sess-\d{4}-\d{2}-\d{2}-001$/);

    const session2 = await recordSession(tmpDir, makeSession());
    expect(session2.id).toMatch(/^sess-\d{4}-\d{2}-\d{2}-002$/);
  });

  it('persists session to disk', async () => {
    await recordSession(tmpDir, makeSession());
    const metrics = await loadMetrics(tmpDir);
    expect(metrics.sessions).toHaveLength(1);
    expect(metrics.sessions[0].target).toBe('director');
    expect(metrics.sessions[0].findings_new).toBe(5);
    expect(metrics.sessions[0].items_executed).toBe(3);
    expect(metrics.last_updated).not.toBeNull();
  });

  it('records timestamp on session', async () => {
    const session = await recordSession(tmpDir, makeSession());
    expect(session.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('creates a snapshot of backlog state', async () => {
    // Populate backlog with items
    const backlog = {
      version: 1,
      last_updated: null,
      items: [
        { id: 'dir-001', target: 'director', status: 'pending' },
        { id: 'dir-002', target: 'director', status: 'pending' },
        { id: 'dir-003', target: 'presentation', status: 'pending' },
        { id: 'dir-004', target: 'director', status: 'done' },
      ],
    };
    await fs.writeFile(path.join(tmpDir, 'backlog.json'), JSON.stringify(backlog));

    await recordSession(tmpDir, makeSession());
    const metrics = await loadMetrics(tmpDir);
    expect(metrics.snapshots).toHaveLength(1);
    expect(metrics.snapshots[0].pending_total).toBe(3);
    expect(metrics.snapshots[0].done_total).toBe(1);
    expect(metrics.snapshots[0].pending_by_target).toEqual({
      director: 2,
      presentation: 1,
    });
  });

  it('throws on missing target', async () => {
    await expect(recordSession(tmpDir, { findings_new: 0, items_executed: 0 }))
      .rejects.toThrow('target');
  });

  it('throws on missing findings_new', async () => {
    await expect(recordSession(tmpDir, { target: 'x', items_executed: 0 }))
      .rejects.toThrow('findings_new');
  });

  it('throws on missing items_executed', async () => {
    await expect(recordSession(tmpDir, { target: 'x', findings_new: 0 }))
      .rejects.toThrow('items_executed');
  });

  it('defaults optional fields', async () => {
    const session = await recordSession(tmpDir, {
      target: 'director',
      findings_new: 2,
      items_executed: 1,
    });
    expect(session.findings_duplicate).toBe(0);
    expect(session.items_skipped).toBe(0);
    expect(session.research_queries).toBe(0);
    expect(session.lenses_applied).toEqual([]);
    expect(session.duration_minutes).toBeNull();
  });
});

describe('getVelocity', () => {
  it('returns empty for no sessions', async () => {
    const velocity = await getVelocity(tmpDir);
    expect(velocity.weeks).toEqual([]);
    expect(velocity.average).toBe(0);
    expect(velocity.total_sessions).toBe(0);
  });

  it('groups executions by ISO week', async () => {
    // Timestamps are RELATIVE to now, not absolute. This test used to hardcode
    // 2026-05-19/20/24 with a 4-week window: it passed when written and then
    // started failing on its own once those dates aged past the window, which
    // looks like a broken grouping bug but is only a stale fixture. Days 1/2/9
    // back stay inside 4 weeks forever and still straddle an ISO week boundary.
    const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
    const metrics = {
      version: 1,
      last_updated: null,
      sessions: [
        { id: 'sess-001', target: 'x', findings_new: 0, items_executed: 3, timestamp: daysAgo(1) },
        { id: 'sess-002', target: 'x', findings_new: 0, items_executed: 5, timestamp: daysAgo(2) },
        { id: 'sess-003', target: 'x', findings_new: 0, items_executed: 2, timestamp: daysAgo(9) },
      ],
      snapshots: [],
    };
    await fs.writeFile(path.join(tmpDir, 'metrics.json'), JSON.stringify(metrics));

    const velocity = await getVelocity(tmpDir, 4);
    expect(velocity.weeks.length).toBeGreaterThanOrEqual(1);
    expect(velocity.total_sessions).toBe(3);
    // Sum of all executions
    const totalExec = velocity.weeks.reduce((s, w) => s + w.executed, 0);
    expect(totalExec).toBe(10);
  });

  it('respects weeks parameter', async () => {
    // Session from 60 days ago (should be excluded with weeks=4)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60);

    const metrics = {
      version: 1,
      last_updated: null,
      sessions: [
        { id: 'sess-001', target: 'x', findings_new: 0, items_executed: 10, timestamp: oldDate.toISOString() },
        { id: 'sess-002', target: 'x', findings_new: 0, items_executed: 3, timestamp: new Date().toISOString() },
      ],
      snapshots: [],
    };
    await fs.writeFile(path.join(tmpDir, 'metrics.json'), JSON.stringify(metrics));

    const velocity = await getVelocity(tmpDir, 4);
    const totalExec = velocity.weeks.reduce((s, w) => s + w.executed, 0);
    expect(totalExec).toBe(3); // Old session excluded
  });

  it('calculates average correctly', async () => {
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const metrics = {
      version: 1,
      last_updated: null,
      sessions: [
        { id: 'sess-001', target: 'x', findings_new: 0, items_executed: 4, timestamp: lastWeek.toISOString() },
        { id: 'sess-002', target: 'x', findings_new: 0, items_executed: 6, timestamp: now.toISOString() },
      ],
      snapshots: [],
    };
    await fs.writeFile(path.join(tmpDir, 'metrics.json'), JSON.stringify(metrics));

    const velocity = await getVelocity(tmpDir, 4);
    expect(velocity.average).toBeGreaterThan(0);
  });
});

describe('getTrends', () => {
  it('returns empty for no sessions', async () => {
    const trends = await getTrends(tmpDir);
    expect(trends.by_lens).toEqual({});
    expect(trends.by_target).toEqual({});
    expect(trends.total_findings).toBe(0);
    expect(trends.total_executed).toBe(0);
  });

  it('aggregates by lens and target', async () => {
    const metrics = {
      version: 1,
      last_updated: null,
      sessions: [
        { id: 's1', target: 'director', findings_new: 3, items_executed: 2, lenses_applied: ['code-quality', 'architecture'] },
        { id: 's2', target: 'presentation', findings_new: 4, items_executed: 1, lenses_applied: ['code-quality'] },
      ],
      snapshots: [],
    };
    await fs.writeFile(path.join(tmpDir, 'metrics.json'), JSON.stringify(metrics));

    const trends = await getTrends(tmpDir);
    expect(trends.by_lens['code-quality']).toBe(2);
    expect(trends.by_lens['architecture']).toBe(1);
    expect(trends.by_target['director']).toBe(2);
    expect(trends.by_target['presentation']).toBe(1);
    expect(trends.total_findings).toBe(7);
    expect(trends.total_executed).toBe(3);
  });
});

describe('getBurndown', () => {
  it('returns empty for no snapshots', async () => {
    const burndown = await getBurndown(tmpDir);
    expect(burndown).toEqual([]);
  });

  it('returns pending totals from snapshots', async () => {
    const metrics = {
      version: 1,
      last_updated: null,
      sessions: [],
      snapshots: [
        { date: '2026-05-23', session_id: 's1', pending_total: 20, done_total: 5, pending_by_target: { director: 10, presentation: 10 } },
        { date: '2026-05-24', session_id: 's2', pending_total: 15, done_total: 10, pending_by_target: { director: 7, presentation: 8 } },
      ],
    };
    await fs.writeFile(path.join(tmpDir, 'metrics.json'), JSON.stringify(metrics));

    const burndown = await getBurndown(tmpDir);
    expect(burndown).toHaveLength(2);
    expect(burndown[0]).toEqual({ date: '2026-05-23', pending: 20 });
    expect(burndown[1]).toEqual({ date: '2026-05-24', pending: 15 });
  });

  it('filters by target', async () => {
    const metrics = {
      version: 1,
      last_updated: null,
      sessions: [],
      snapshots: [
        { date: '2026-05-24', session_id: 's1', pending_total: 15, done_total: 10, pending_by_target: { director: 7, presentation: 8 } },
      ],
    };
    await fs.writeFile(path.join(tmpDir, 'metrics.json'), JSON.stringify(metrics));

    const burndown = await getBurndown(tmpDir, 'director');
    expect(burndown[0].pending).toBe(7);

    const burndown2 = await getBurndown(tmpDir, 'nonexistent');
    expect(burndown2[0].pending).toBe(0);
  });
});

describe('getMetricsSummary', () => {
  it('returns combined display-ready object', async () => {
    await recordSession(tmpDir, makeSession());

    const summary = await getMetricsSummary(tmpDir);
    expect(summary).toHaveProperty('velocity');
    expect(summary).toHaveProperty('trends');
    expect(summary).toHaveProperty('burndown');
    expect(summary).toHaveProperty('total_sessions');
    expect(summary).toHaveProperty('last_session');
    expect(summary.total_sessions).toBe(1);
    expect(summary.last_session.target).toBe('director');
  });

  it('returns null last_session when empty', async () => {
    const summary = await getMetricsSummary(tmpDir);
    expect(summary.last_session).toBeNull();
    expect(summary.total_sessions).toBe(0);
  });
});
