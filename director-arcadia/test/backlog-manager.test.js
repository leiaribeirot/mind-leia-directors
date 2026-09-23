import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { addItems, loadBacklogAsync, updateItem, getNextItem, queryItems, dedup, getStats, pruneCompleted } from '../lib/backlog-manager.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'director-test-'));
  // Write empty backlog
  await fs.writeFile(path.join(tmpDir, 'backlog.json'), JSON.stringify({
    version: 1, last_updated: null, items: [],
  }));
});

const makeItem = (overrides = {}) => ({
  lens: 'code-quality',
  criterion: 'duplication',
  title: 'Extract shared utility',
  target: 'director',
  effort: 'small',
  priority: 'high',
  target_path: 'lib/utils.js',
  description: 'Test item',
  ...overrides,
});

describe('addItems', () => {
  it('adds items with auto-generated IDs', async () => {
    const result = await addItems(tmpDir, [makeItem()]);
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(0);
    expect(result.items[0].id).toMatch(/^dir-\d{4}-\d{2}-\d{2}-\d{3}$/);
    expect(result.items[0].status).toBe('pending');
  });

  it('deduplicates items with same target_path + criterion', async () => {
    await addItems(tmpDir, [makeItem()]);
    const result = await addItems(tmpDir, [makeItem()]);
    expect(result.added).toBe(0);
    expect(result.duplicates).toBe(1);
  });

  it('allows items with different criteria and different titles', async () => {
    await addItems(tmpDir, [makeItem({ criterion: 'duplication', title: 'Extract shared utility' })]);
    const result = await addItems(tmpDir, [makeItem({ criterion: 'error-handling', title: 'Add error boundary to form component', target_path: 'lib/form.js' })]);
    expect(result.added).toBe(1);
  });

  it('rejects items missing required fields', async () => {
    await expect(addItems(tmpDir, [{ title: 'No lens' }]))
      .rejects.toThrow('missing required fields');
  });

  it('handles batch of multiple items', async () => {
    const items = [
      makeItem({ title: 'Item A', criterion: 'a', target_path: 'a.js' }),
      makeItem({ title: 'Item B', criterion: 'b', target_path: 'b.js' }),
      makeItem({ title: 'Item C', criterion: 'c', target_path: 'c.js' }),
    ];
    const result = await addItems(tmpDir, items);
    expect(result.added).toBe(3);
  });

  it('deduplicates within a single batch', async () => {
    const items = [
      makeItem({ title: 'Same item', target_path: 'x.js', criterion: 'dup' }),
      makeItem({ title: 'Same item', target_path: 'x.js', criterion: 'dup' }),
    ];
    const result = await addItems(tmpDir, items);
    expect(result.added).toBe(1);
    expect(result.duplicates).toBe(1);
  });
});

describe('dedup', () => {
  it('detects exact match by target_path + criterion', () => {
    const existing = [makeItem({ id: 'dir-001', target_path: 'lib/a.js', criterion: 'dup' })];
    const newItems = [makeItem({ target_path: 'lib/a.js', criterion: 'dup' })];
    const result = dedup(existing, newItems);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicateCount).toBe(1);
  });

  it('detects fuzzy match by title similarity above 85%', () => {
    const existing = [makeItem({ id: 'dir-001', title: 'Add loading skeleton to movie list component', target_path: '' })];
    const newItems = [makeItem({ title: 'Add loading skeleton to movie list', target_path: '' })];
    const result = dedup(existing, newItems);
    expect(result.unique).toHaveLength(0);
  });

  it('allows dissimilar titles through', () => {
    const existing = [makeItem({ id: 'dir-001', title: 'Fix error boundary', target_path: '' })];
    const newItems = [makeItem({ title: 'Add loading skeleton component', target_path: '' })];
    const result = dedup(existing, newItems);
    expect(result.unique).toHaveLength(1);
  });

  it('handles empty existing list', () => {
    const result = dedup([], [makeItem()]);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicateCount).toBe(0);
  });

  it('handles empty new items list', () => {
    const result = dedup([makeItem({ id: 'dir-001' })], []);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicateCount).toBe(0);
  });
});

describe('updateItem', () => {
  it('updates status and adds timestamp', async () => {
    const { items } = await addItems(tmpDir, [makeItem()]);
    const id = items[0].id;

    const updated = await updateItem(tmpDir, id, { status: 'done', execution_notes: 'Fixed it' });
    expect(updated.status).toBe('done');
    expect(updated.execution_notes).toBe('Fixed it');
    expect(updated.updated).toBeTruthy();
  });

  it('returns null for nonexistent ID', async () => {
    const result = await updateItem(tmpDir, 'dir-nonexistent', { status: 'done' });
    expect(result).toBeNull();
  });

  it('persists updates to disk', async () => {
    const { items } = await addItems(tmpDir, [makeItem()]);
    await updateItem(tmpDir, items[0].id, { status: 'done' });

    const backlog = await loadBacklogAsync(tmpDir);
    const item = backlog.items.find(i => i.id === items[0].id);
    expect(item.status).toBe('done');
  });
});

describe('getNextItem', () => {
  it('returns highest priority pending item', async () => {
    await addItems(tmpDir, [
      makeItem({ title: 'Low priority', criterion: 'low', target_path: 'low.js', priority_score: 50 }),
      makeItem({ title: 'High priority', criterion: 'high', target_path: 'high.js', priority_score: 90 }),
      makeItem({ title: 'Mid priority', criterion: 'mid', target_path: 'mid.js', priority_score: 70 }),
    ]);

    const next = await getNextItem(tmpDir);
    expect(next.title).toBe('High priority');
  });

  it('skips non-pending items', async () => {
    const { items } = await addItems(tmpDir, [
      makeItem({ title: 'Done item', criterion: 'done', target_path: 'done.js', priority_score: 99 }),
      makeItem({ title: 'Pending item', criterion: 'pend', target_path: 'pend.js', priority_score: 50 }),
    ]);
    await updateItem(tmpDir, items[0].id, { status: 'done' });

    const next = await getNextItem(tmpDir);
    expect(next.title).toBe('Pending item');
  });

  it('filters by target', async () => {
    await addItems(tmpDir, [
      makeItem({ title: 'Director item', target: 'director', criterion: 'a', target_path: 'a.js', priority_score: 90 }),
      makeItem({ title: 'Presentation item', target: 'presentation', criterion: 'b', target_path: 'b.js', priority_score: 80 }),
    ]);

    const next = await getNextItem(tmpDir, { target: 'presentation' });
    expect(next.title).toBe('Presentation item');
  });

  it('returns null when no pending items', async () => {
    const next = await getNextItem(tmpDir);
    expect(next).toBeNull();
  });
});

describe('queryItems', () => {
  it('filters by status', async () => {
    const { items } = await addItems(tmpDir, [
      makeItem({ title: 'A', criterion: 'a', target_path: 'a.js' }),
      makeItem({ title: 'B', criterion: 'b', target_path: 'b.js' }),
    ]);
    await updateItem(tmpDir, items[0].id, { status: 'done' });

    const pending = await queryItems(tmpDir, { status: 'pending' });
    expect(pending).toHaveLength(1);
    expect(pending[0].title).toBe('B');
  });

  it('filters by multiple criteria', async () => {
    await addItems(tmpDir, [
      makeItem({ title: 'A', target: 'director', lens: 'code-quality', criterion: 'a', target_path: 'a.js' }),
      makeItem({ title: 'B', target: 'director', lens: 'architecture', criterion: 'b', target_path: 'b.js' }),
      makeItem({ title: 'C', target: 'presentation', lens: 'code-quality', criterion: 'c', target_path: 'c.js' }),
    ]);

    const result = await queryItems(tmpDir, { target: 'director', lens: 'code-quality' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });
});

describe('getStats', () => {
  it('returns correct counts', async () => {
    const { items } = await addItems(tmpDir, [
      makeItem({ title: 'A', target: 'director', lens: 'code-quality', effort: 'small', criterion: 'a', target_path: 'a.js' }),
      makeItem({ title: 'B', target: 'presentation', lens: 'architecture', effort: 'medium', criterion: 'b', target_path: 'b.js' }),
    ]);
    await updateItem(tmpDir, items[0].id, { status: 'done' });

    const stats = await getStats(tmpDir);
    expect(stats.total).toBe(2);
    expect(stats.by_status.done).toBe(1);
    expect(stats.by_status.pending).toBe(1);
    expect(stats.by_target.director).toBe(1);
    expect(stats.by_target.presentation).toBe(1);
  });
});

describe('pruneCompleted', () => {
  it('removes old done items', async () => {
    const { items } = await addItems(tmpDir, [makeItem()]);
    // Manually set old date
    const backlog = await loadBacklogAsync(tmpDir);
    backlog.items[0].status = 'done';
    backlog.items[0].updated = '2020-01-01';
    await fs.writeFile(path.join(tmpDir, 'backlog.json'), JSON.stringify(backlog));

    const pruned = await pruneCompleted(tmpDir, 90);
    expect(pruned).toBe(1);

    const stats = await getStats(tmpDir);
    expect(stats.total).toBe(0);
  });

  it('keeps recent done items', async () => {
    const { items } = await addItems(tmpDir, [makeItem()]);
    await updateItem(tmpDir, items[0].id, { status: 'done' });

    const pruned = await pruneCompleted(tmpDir, 90);
    expect(pruned).toBe(0);
  });

  it('never prunes pending items', async () => {
    await addItems(tmpDir, [makeItem()]);
    const backlog = await loadBacklogAsync(tmpDir);
    backlog.items[0].created = '2020-01-01';
    await fs.writeFile(path.join(tmpDir, 'backlog.json'), JSON.stringify(backlog));

    const pruned = await pruneCompleted(tmpDir, 90);
    expect(pruned).toBe(0);
  });
});

describe('loadBacklogAsync', () => {
  it('returns empty backlog for missing file', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-'));
    const backlog = await loadBacklogAsync(emptyDir);
    expect(backlog.version).toBe(1);
    expect(backlog.items).toEqual([]);
  });
});

describe('concurrency guard', () => {
  it('detects version conflict on concurrent writes', async () => {
    // First write creates version 2 on disk
    await addItems(tmpDir, [makeItem({ title: 'First', criterion: 'a', target_path: 'a.js' })]);

    // Simulate stale load (version 1, but disk now has version 2)
    const staleBacklog = { version: 1, last_updated: null, items: [] };

    const { saveBacklog } = await import('../lib/backlog-manager.js');
    await expect(saveBacklog(tmpDir, staleBacklog))
      .rejects.toThrow('Backlog write conflict');
  });

  it('increments version on successful save', async () => {
    await addItems(tmpDir, [makeItem({ title: 'V1', criterion: 'v1', target_path: 'v1.js' })]);
    const backlog = await loadBacklogAsync(tmpDir);
    const versionAfterFirst = backlog.version;

    await addItems(tmpDir, [makeItem({ title: 'V2', criterion: 'v2', target_path: 'v2.js' })]);
    const backlog2 = await loadBacklogAsync(tmpDir);
    expect(backlog2.version).toBe(versionAfterFirst + 1);
  });
});
