import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  loadBank,
  findCached,
  storeResults,
  linkToBacklogItem,
  queryBank,
  getBankStats,
  pruneStale,
} from '../lib/research-bank.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'research-bank-test-'));
});

const makeEntry = (overrides = {}) => ({
  query: 'React error handling patterns',
  target: 'videodrome',
  focus: 'code-quality',
  results: [
    { url: 'https://example.com/article', title: 'Error Handling Guide', highlights: 'Use error boundaries', relevance: 0.9 },
  ],
  ...overrides,
});

describe('loadBank', () => {
  it('returns empty bank for missing file', async () => {
    const bank = await loadBank(tmpDir);
    expect(bank.version).toBe(1);
    expect(bank.entries).toEqual([]);
    expect(bank.reuse_window_days).toBe(30);
  });

  it('loads existing bank file', async () => {
    const data = { version: 1, last_updated: null, reuse_window_days: 30, entries: [{ id: 'res-001' }] };
    await fs.writeFile(path.join(tmpDir, 'research-bank.json'), JSON.stringify(data));

    const bank = await loadBank(tmpDir);
    expect(bank.entries).toHaveLength(1);
    expect(bank.entries[0].id).toBe('res-001');
  });
});

describe('storeResults', () => {
  it('stores a new research entry', async () => {
    const id = await storeResults(tmpDir, makeEntry());

    expect(id).toMatch(/^res-\d{4}-\d{2}-\d{2}-[a-f0-9]+$/);

    const bank = await loadBank(tmpDir);
    expect(bank.entries).toHaveLength(1);
    expect(bank.entries[0].query).toBe('React error handling patterns');
    expect(bank.entries[0].target).toBe('videodrome');
    expect(bank.entries[0].focus).toBe('code-quality');
    expect(bank.entries[0].result_count).toBe(1);
    expect(bank.entries[0].used_in).toEqual([]);
  });

  it('upserts existing entry with same query+target hash', async () => {
    await storeResults(tmpDir, makeEntry({ results: [{ url: 'https://old.com', title: 'Old' }] }));
    await storeResults(tmpDir, makeEntry({ results: [{ url: 'https://new.com', title: 'New' }] }));

    const bank = await loadBank(tmpDir);
    expect(bank.entries).toHaveLength(1);
    expect(bank.entries[0].results[0].url).toBe('https://new.com');
  });

  it('preserves used_in links on upsert', async () => {
    const id = await storeResults(tmpDir, makeEntry());
    await linkToBacklogItem(tmpDir, id, 'dir-001');

    await storeResults(tmpDir, makeEntry({ results: [{ url: 'https://updated.com', title: 'Updated' }] }));

    const bank = await loadBank(tmpDir);
    expect(bank.entries[0].used_in).toContain('dir-001');
  });

  it('rejects entries missing required fields', async () => {
    await expect(storeResults(tmpDir, { target: 'core', results: [] }))
      .rejects.toThrow('missing required fields');
    await expect(storeResults(tmpDir, { query: 'test', results: [] }))
      .rejects.toThrow('missing required fields');
    await expect(storeResults(tmpDir, null))
      .rejects.toThrow('missing required fields');
  });

  it('stores entries with different targets separately', async () => {
    await storeResults(tmpDir, makeEntry({ target: 'videodrome' }));
    await storeResults(tmpDir, makeEntry({ target: 'director' }));

    const bank = await loadBank(tmpDir);
    expect(bank.entries).toHaveLength(2);
  });

  it('defaults focus to general when not provided', async () => {
    await storeResults(tmpDir, { query: 'test', target: 'core', results: [] });

    const bank = await loadBank(tmpDir);
    expect(bank.entries[0].focus).toBe('general');
  });
});

describe('findCached', () => {
  it('returns cached entry within reuse window', async () => {
    await storeResults(tmpDir, makeEntry());

    const cached = await findCached(tmpDir, 'React error handling patterns', 'videodrome');
    expect(cached).not.toBeNull();
    expect(cached.query).toBe('React error handling patterns');
  });

  it('returns null for non-matching query', async () => {
    await storeResults(tmpDir, makeEntry());

    const cached = await findCached(tmpDir, 'completely different query', 'videodrome');
    expect(cached).toBeNull();
  });

  it('returns null for non-matching target', async () => {
    await storeResults(tmpDir, makeEntry({ target: 'videodrome' }));

    const cached = await findCached(tmpDir, 'React error handling patterns', 'director');
    expect(cached).toBeNull();
  });

  it('returns null for expired entries', async () => {
    await storeResults(tmpDir, makeEntry());

    // Manually backdate the entry past the reuse window
    const bank = await loadBank(tmpDir);
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 60);
    bank.entries[0].timestamp = pastDate.toISOString();
    await fs.writeFile(path.join(tmpDir, 'research-bank.json'), JSON.stringify(bank));

    const cached = await findCached(tmpDir, 'React error handling patterns', 'videodrome');
    expect(cached).toBeNull();
  });

  it('is case-insensitive and trims whitespace', async () => {
    await storeResults(tmpDir, makeEntry({ query: 'React Error Handling' }));

    const cached = await findCached(tmpDir, '  react error handling  ', 'videodrome');
    expect(cached).not.toBeNull();
  });

  it('returns null for empty bank', async () => {
    const cached = await findCached(tmpDir, 'anything', 'videodrome');
    expect(cached).toBeNull();
  });
});

describe('linkToBacklogItem', () => {
  it('links research entry to backlog item', async () => {
    const id = await storeResults(tmpDir, makeEntry());
    await linkToBacklogItem(tmpDir, id, 'dir-2026-05-24-001');

    const bank = await loadBank(tmpDir);
    expect(bank.entries[0].used_in).toContain('dir-2026-05-24-001');
  });

  it('does not duplicate links', async () => {
    const id = await storeResults(tmpDir, makeEntry());
    await linkToBacklogItem(tmpDir, id, 'dir-001');
    await linkToBacklogItem(tmpDir, id, 'dir-001');

    const bank = await loadBank(tmpDir);
    expect(bank.entries[0].used_in).toHaveLength(1);
  });

  it('silently ignores nonexistent research ID', async () => {
    await linkToBacklogItem(tmpDir, 'res-nonexistent', 'dir-001');
    const bank = await loadBank(tmpDir);
    expect(bank.entries).toHaveLength(0);
  });
});

describe('queryBank', () => {
  beforeEach(async () => {
    await storeResults(tmpDir, makeEntry({ query: 'Q1', target: 'videodrome', focus: 'code-quality' }));
    await storeResults(tmpDir, makeEntry({ query: 'Q2', target: 'videodrome', focus: 'performance' }));
    await storeResults(tmpDir, makeEntry({ query: 'Q3', target: 'director', focus: 'code-quality' }));
  });

  it('returns all entries without filters', async () => {
    const results = await queryBank(tmpDir);
    expect(results).toHaveLength(3);
  });

  it('filters by target', async () => {
    const results = await queryBank(tmpDir, { target: 'videodrome' });
    expect(results).toHaveLength(2);
  });

  it('filters by focus', async () => {
    const results = await queryBank(tmpDir, { focus: 'code-quality' });
    expect(results).toHaveLength(2);
  });

  it('filters by target and focus combined', async () => {
    const results = await queryBank(tmpDir, { target: 'videodrome', focus: 'code-quality' });
    expect(results).toHaveLength(1);
  });

  it('filters by maxAge', async () => {
    // Backdate one entry
    const bank = await loadBank(tmpDir);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);
    bank.entries[0].timestamp = oldDate.toISOString();
    await fs.writeFile(path.join(tmpDir, 'research-bank.json'), JSON.stringify(bank));

    const results = await queryBank(tmpDir, { maxAge: 30 });
    expect(results).toHaveLength(2);
  });

  it('returns results sorted most recent first', async () => {
    const results = await queryBank(tmpDir);
    for (let i = 0; i < results.length - 1; i++) {
      expect(new Date(results[i].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(results[i + 1].timestamp).getTime());
    }
  });
});

describe('getBankStats', () => {
  it('returns correct stats for populated bank', async () => {
    await storeResults(tmpDir, makeEntry({ query: 'Q1', target: 'videodrome', focus: 'code-quality', results: [{ url: 'a' }, { url: 'b' }] }));
    await storeResults(tmpDir, makeEntry({ query: 'Q2', target: 'director', focus: 'performance', results: [{ url: 'c' }] }));
    const id = (await loadBank(tmpDir)).entries[0].id;
    await linkToBacklogItem(tmpDir, id, 'dir-001');

    const stats = await getBankStats(tmpDir);
    expect(stats.total_queries).toBe(2);
    expect(stats.total_results).toBe(3);
    expect(stats.total_linked).toBe(1);
    expect(stats.by_target.videodrome).toBe(1);
    expect(stats.by_target.director).toBe(1);
    expect(stats.by_focus['code-quality']).toBe(1);
    expect(stats.by_focus.performance).toBe(1);
  });

  it('returns zeros for empty bank', async () => {
    const stats = await getBankStats(tmpDir);
    expect(stats.total_queries).toBe(0);
    expect(stats.total_results).toBe(0);
    expect(stats.total_linked).toBe(0);
  });
});

describe('pruneStale', () => {
  it('removes old unlinked entries past 2x reuse window', async () => {
    await storeResults(tmpDir, makeEntry());

    // Backdate past 2x reuse window (60+ days)
    const bank = await loadBank(tmpDir);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 90);
    bank.entries[0].timestamp = oldDate.toISOString();
    await fs.writeFile(path.join(tmpDir, 'research-bank.json'), JSON.stringify(bank));

    const pruned = await pruneStale(tmpDir);
    expect(pruned).toBe(1);

    const afterBank = await loadBank(tmpDir);
    expect(afterBank.entries).toHaveLength(0);
  });

  it('keeps linked entries regardless of age', async () => {
    const id = await storeResults(tmpDir, makeEntry());
    await linkToBacklogItem(tmpDir, id, 'dir-001');

    // Backdate past 2x reuse window
    const bank = await loadBank(tmpDir);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 90);
    bank.entries[0].timestamp = oldDate.toISOString();
    await fs.writeFile(path.join(tmpDir, 'research-bank.json'), JSON.stringify(bank));

    const pruned = await pruneStale(tmpDir);
    expect(pruned).toBe(0);

    const afterBank = await loadBank(tmpDir);
    expect(afterBank.entries).toHaveLength(1);
  });

  it('keeps recent entries', async () => {
    await storeResults(tmpDir, makeEntry());

    const pruned = await pruneStale(tmpDir);
    expect(pruned).toBe(0);
  });

  it('handles empty bank', async () => {
    const pruned = await pruneStale(tmpDir);
    expect(pruned).toBe(0);
  });
});
