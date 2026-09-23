import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { parseStoryDir, parseStoryFile, generateStrategicItems } from '../lib/prd-parser.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prd-parser-test-'));
});

const writeStory = async (filename, content) => {
  await fs.writeFile(path.join(tmpDir, filename), content);
};

describe('parseStoryFile', () => {
  it('parses a story with mixed checked/unchecked criteria', async () => {
    await writeStory('305-presentation-mvp.md', `
# Story 305 — Presentation Atelier MVP

## Acceptance Criteria

- [x] Config exists with model routing
- [ ] Pipeline produces a single HTML file
- [x] 6 agents fully defined
- [ ] Output quality matches reference

## Tasks

### Task 1: Create config.yaml
- [x] Define atelier metadata
- [ ] Model routing per phase

**Files:** \`ateliers/presentation/config.yaml\`
`);

    const story = await parseStoryFile(path.join(tmpDir, '305-presentation-mvp.md'));

    expect(story.id).toBe('305');
    expect(story.title).toBe('Presentation Atelier MVP');
    expect(story.status).toBe('in_progress');
    expect(story.total_criteria).toBe(6);
    expect(story.completed_criteria).toBe(3);
    expect(story.pending_criteria).toHaveLength(3);
    expect(story.pending_criteria[0].text).toBe('Pipeline produces a single HTML file');
    expect(story.pending_criteria[0].section).toBe('Acceptance Criteria');
  });

  it('parses a completed story (all checked)', async () => {
    await writeStory('100-done.md', `
# Story 100 — Completed Feature

## Acceptance Criteria

- [x] Feature A works
- [x] Feature B works
- [x] Tests pass
`);

    const story = await parseStoryFile(path.join(tmpDir, '100-done.md'));
    expect(story.status).toBe('completed');
    expect(story.total_criteria).toBe(3);
    expect(story.completed_criteria).toBe(3);
    expect(story.pending_criteria).toHaveLength(0);
  });

  it('parses a story with task sections and nested checkboxes', async () => {
    await writeStory('200-tasks.md', `
# Story 200 — Feature with Tasks

## Tasks

### Task 1: Setup
- [x] Create directory
- [ ] Add config file

### Task 2: Implementation
- [ ] Build the parser
- [ ] Add tests
`);

    const story = await parseStoryFile(path.join(tmpDir, '200-tasks.md'));
    expect(story.pending_tasks).toHaveLength(3);
    expect(story.pending_tasks[0].task_id).toBe('Task 1');
    expect(story.pending_tasks[0].text).toBe('Add config file');
    expect(story.pending_tasks[1].task_id).toBe('Task 2');
  });

  it('extracts file mentions from backtick paths', async () => {
    await writeStory('300-files.md', `
# Story 300 — File References

**Files:** \`ateliers/blog/config.yaml\`

Uses \`core/utils/helper.js\` and \`ateliers/blog/lib/scorer.js\`.
`);

    const story = await parseStoryFile(path.join(tmpDir, '300-files.md'));
    expect(story.files_mentioned).toContain('ateliers/blog/config.yaml');
    expect(story.files_mentioned).toContain('core/utils/helper.js');
    expect(story.files_mentioned).toContain('ateliers/blog/lib/scorer.js');
  });

  it('infers status correctly — pending when no checkboxes', async () => {
    await writeStory('400-pending.md', `
# Story 400 — Not Started

## Summary

This story has no checkboxes yet.
`);

    const story = await parseStoryFile(path.join(tmpDir, '400-pending.md'));
    expect(story.status).toBe('pending');
    expect(story.total_criteria).toBe(0);
  });

  it('extracts story ID from dotted filenames', async () => {
    await writeStory('213.5-market-analysis.md', `
# Story 213.5 — Market Analysis

- [ ] First criterion
`);

    const story = await parseStoryFile(path.join(tmpDir, '213.5-market-analysis.md'));
    expect(story.id).toBe('213.5');
  });

  it('extracts dependencies from Story references', async () => {
    await writeStory('500-deps.md', `
# Story 500 — Has Dependencies

Depends on Story 100 and Story 305 being completed first.

- [ ] Criterion A
`);

    const story = await parseStoryFile(path.join(tmpDir, '500-deps.md'));
    expect(story.dependencies).toContain('100');
    expect(story.dependencies).toContain('305');
    expect(story.dependencies).not.toContain('500'); // should not include self
  });
});

describe('parseStoryDir', () => {
  it('excludes completed stories', async () => {
    await writeStory('100-done.md', `
# Story 100 — Done
- [x] A
- [x] B
`);
    await writeStory('200-active.md', `
# Story 200 — Active
- [x] A
- [ ] B
`);

    const { stories } = await parseStoryDir(tmpDir);
    expect(stories).toHaveLength(1);
    expect(stories[0].id).toBe('200');
  });

  it('returns empty array for empty directory', async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-'));
    const { stories } = await parseStoryDir(emptyDir);
    expect(stories).toEqual([]);
  });

  it('skips non-story files', async () => {
    await writeStory('README.md', '# Readme\n\nNot a story.');
    await writeStory('100-story.md', '# Story 100\n- [ ] A');

    const { stories } = await parseStoryDir(tmpDir);
    expect(stories).toHaveLength(1);
  });

  it('handles malformed markdown gracefully', async () => {
    await writeStory('999-bad.md', 'Just plain text with no structure at all');
    await writeStory('100-good.md', '# Story 100\n- [ ] Criterion');

    const { stories } = await parseStoryDir(tmpDir);
    // Should not crash, should parse what it can
    expect(stories.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for nonexistent directory', async () => {
    const { stories } = await parseStoryDir('/tmp/nonexistent-dir-xyz');
    expect(stories).toEqual([]);
  });
});

describe('generateStrategicItems', () => {
  it('produces valid backlog items with source: prd', () => {
    const stories = [{
      id: '305',
      title: 'Presentation MVP',
      filename: '305-presentation-mvp.md',
      status: 'in_progress',
      total_criteria: 10,
      completed_criteria: 8,
      pending_criteria: [
        { text: 'Pipeline produces HTML', section: 'Acceptance Criteria', line_number: 10 },
      ],
      pending_tasks: [],
      files_mentioned: ['ateliers/presentation/config.yaml'],
      dependencies: [],
    }];

    const items = generateStrategicItems(stories);
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('prd');
    expect(items[0].prd_ref).toBe('story-305');
    expect(items[0].lens).toBe('strategic');
    expect(items[0].criterion).toBe('prd-gap');
    expect(items[0].prd_alignment).toBe(100);
    expect(items[0].title).toBe('Pipeline produces HTML');
    expect(items[0].target).toBe('presentation');
  });

  it('generates items from pending tasks', () => {
    const stories = [{
      id: '200',
      title: 'Feature X',
      filename: '200-feature-x.md',
      status: 'in_progress',
      total_criteria: 2,
      completed_criteria: 1,
      pending_criteria: [],
      pending_tasks: [
        { text: 'Build the parser module', task_id: 'Task 2', line_number: 15 },
      ],
      files_mentioned: [],
      dependencies: [],
    }];

    const items = generateStrategicItems(stories);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Build the parser module');
    expect(items[0].source).toBe('prd');
  });

  it('avoids duplicating tasks that overlap with criteria', () => {
    const stories = [{
      id: '300',
      title: 'Feature Y',
      filename: '300-feature-y.md',
      status: 'in_progress',
      total_criteria: 2,
      completed_criteria: 0,
      pending_criteria: [
        { text: 'Add config file for blog atelier', section: 'Criteria', line_number: 5 },
      ],
      pending_tasks: [
        { text: 'Add config file for blog atelier setup', task_id: 'Task 1', line_number: 10 },
      ],
      files_mentioned: ['ateliers/blog/config.yaml'],
      dependencies: [],
    }];

    const items = generateStrategicItems(stories);
    // Should have 1 item from criteria, not 2 (task overlaps)
    expect(items).toHaveLength(1);
  });

  it('returns empty array for empty stories', () => {
    const items = generateStrategicItems([]);
    expect(items).toEqual([]);
  });

  it('infers high priority for near-completion stories', () => {
    const stories = [{
      id: '400',
      title: 'Almost Done',
      filename: '400-almost.md',
      status: 'in_progress',
      total_criteria: 10,
      completed_criteria: 9,
      pending_criteria: [
        { text: 'Last thing to do', section: 'Criteria', line_number: 20 },
      ],
      pending_tasks: [],
      files_mentioned: [],
      dependencies: [],
    }];

    const items = generateStrategicItems(stories);
    expect(items[0].priority).toBe('high');
  });
});
