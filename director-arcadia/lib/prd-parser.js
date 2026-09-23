/**
 * PRD Parser — Director Atelier
 *
 * Reads story/PRD markdown files and extracts structured data:
 * pending criteria, tasks, status, file references, and dependencies.
 * Generates strategic backlog items from PRD gaps.
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';

/**
 * Parse all story files in a directory.
 * Returns only actionable stories (status !== 'completed').
 * @param {string} storiesDir - Absolute path to the stories directory
 * @returns {Promise<{stories: object[]}>}
 */
export async function parseStoryDir(storiesDir) {
  let files;
  try {
    files = await readdir(storiesDir);
  } catch {
    return { stories: [] };
  }

  const storyFiles = files.filter(f => f.endsWith('.md') && /^\d/.test(f));
  const stories = [];

  for (const filename of storyFiles) {
    try {
      const story = await parseStoryFile(path.join(storiesDir, filename));
      if (story && story.status !== 'completed') {
        stories.push(story);
      }
    } catch {
      // Skip malformed files gracefully
    }
  }

  return { stories };
}

/**
 * Parse a single story markdown file.
 * @param {string} filePath - Absolute path to the story file
 * @returns {Promise<object>} Parsed story object
 */
export async function parseStoryFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const filename = path.basename(filePath);
  const lines = content.split('\n');

  const id = extractStoryId(filename);
  const title = extractTitle(lines);
  const checkboxes = extractCheckboxes(lines);
  const totalCriteria = checkboxes.length;
  const completedCriteria = checkboxes.filter(c => c.checked).length;
  const status = inferStatus(totalCriteria, completedCriteria, content);

  const pendingCriteria = checkboxes
    .filter(c => !c.checked)
    .map(c => ({
      text: c.text,
      section: c.section,
      line_number: c.line_number,
    }));

  const pendingTasks = extractPendingTasks(lines);
  const filesMentioned = extractFilesMentioned(content);
  const dependencies = extractDependencies(content, id);

  return {
    id,
    title,
    filename,
    status,
    total_criteria: totalCriteria,
    completed_criteria: completedCriteria,
    pending_criteria: pendingCriteria,
    pending_tasks: pendingTasks,
    files_mentioned: filesMentioned,
    dependencies,
  };
}

/**
 * Generate strategic backlog items from parsed stories.
 * @param {object[]} parsedStories - Array of parsed story objects
 * @returns {object[]} Backlog-compatible items
 */
export function generateStrategicItems(parsedStories) {
  const items = [];

  for (const story of parsedStories) {
    // Generate items from pending criteria
    for (const criterion of story.pending_criteria) {
      items.push({
        source: 'prd',
        prd_ref: `story-${story.id}`,
        lens: 'strategic',
        criterion: 'prd-gap',
        target: inferTargetFromStory(story),
        target_path: story.files_mentioned[0] || '',
        title: truncateTitle(criterion.text),
        description: buildDescription(story, criterion),
        priority: inferPriority(story, criterion),
        effort: inferEffort(criterion.text),
        files: story.files_mentioned.slice(0, 5),
        prd_alignment: 100,
      });
    }

    // Generate items from pending tasks
    for (const task of story.pending_tasks) {
      // Avoid duplicating if task text matches a criterion
      const alreadyCovered = story.pending_criteria.some(c =>
        textOverlap(c.text, task.text) > 0.7
      );
      if (alreadyCovered) continue;

      items.push({
        source: 'prd',
        prd_ref: `story-${story.id}`,
        lens: 'strategic',
        criterion: 'prd-gap',
        target: inferTargetFromStory(story),
        target_path: '',
        title: truncateTitle(task.text),
        description: `PRD task from Story ${story.id} (${story.title}): ${task.task_id}. ${task.text}`,
        priority: 'medium',
        effort: inferEffort(task.text),
        files: story.files_mentioned.slice(0, 5),
        prd_alignment: 100,
      });
    }
  }

  return items;
}

// --- Internal helpers ---

/**
 * Extract story ID from filename.
 * "305-presentation-atelier-mvp.md" → "305"
 * "213.5-type-1-market-analysis.md" → "213.5"
 */
function extractStoryId(filename) {
  const match = filename.match(/^(\d+(?:\.\d+)*)/);
  return match ? match[1] : filename.replace('.md', '');
}

/**
 * Extract the first H1 title from lines.
 */
function extractTitle(lines) {
  for (const line of lines) {
    const match = line.match(/^#\s+(?:Story\s+\S+\s*[-—]\s*)?(.+)/i);
    if (match) return match[1].trim();
  }
  return 'Untitled';
}

/**
 * Extract all checkboxes with their section context.
 */
function extractCheckboxes(lines) {
  const checkboxes = [];
  let currentSection = 'General';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track section headers
    const sectionMatch = line.match(/^#{1,4}\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    // Match checkboxes: - [ ] or - [x]
    const cbMatch = line.match(/^[\s]*[-*]\s+\[([ xX])\]\s+(.+)/);
    if (cbMatch) {
      checkboxes.push({
        checked: cbMatch[1].toLowerCase() === 'x',
        text: cbMatch[2].trim(),
        section: currentSection,
        line_number: i + 1,
      });
    }
  }

  return checkboxes;
}

/**
 * Infer story status from checkbox ratio and content.
 */
function inferStatus(totalCriteria, completedCriteria, content) {
  // Check for explicit status in content
  const statusMatch = content.match(/status:\s*(completed|done|in_progress|pending)/i);
  if (statusMatch) {
    const s = statusMatch[1].toLowerCase();
    if (s === 'done') return 'completed';
    return s;
  }

  if (totalCriteria === 0) return 'pending';
  if (completedCriteria === totalCriteria) return 'completed';
  if (completedCriteria > 0) return 'in_progress';
  return 'pending';
}

/**
 * Extract pending tasks (unchecked items under Task sections).
 */
function extractPendingTasks(lines) {
  const tasks = [];
  let currentTaskId = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match task headers: ### Task 1, ### Task 2.1, etc.
    const taskMatch = line.match(/^#{2,4}\s+(Task\s+[\d.]+)/i);
    if (taskMatch) {
      currentTaskId = taskMatch[1];
      continue;
    }

    // Only capture unchecked items under task sections
    if (currentTaskId) {
      const cbMatch = line.match(/^[\s]*[-*]\s+\[ \]\s+(.+)/);
      if (cbMatch) {
        tasks.push({
          text: cbMatch[1].trim(),
          task_id: currentTaskId,
          line_number: i + 1,
        });
      }
    }
  }

  return tasks;
}

/**
 * Extract file paths mentioned in the document.
 * Looks for backtick-wrapped paths and "Files:" sections.
 */
function extractFilesMentioned(content) {
  const files = new Set();

  // Match backtick-wrapped paths that look like file paths
  const pathPattern = /`([a-zA-Z][\w./-]+\.[a-zA-Z]+)`/g;
  let match;
  while ((match = pathPattern.exec(content)) !== null) {
    const p = match[1];
    // Filter out obvious non-paths
    if (p.includes('/') && !p.startsWith('http') && !p.includes(' ')) {
      files.add(p);
    }
  }

  // Match "**Files:**" sections
  const filesSection = content.match(/\*\*Files?:\*\*\s*`([^`]+)`/g);
  if (filesSection) {
    for (const f of filesSection) {
      const fileMatch = f.match(/`([^`]+)`/);
      if (fileMatch) files.add(fileMatch[1]);
    }
  }

  return [...files];
}

/**
 * Extract referenced story IDs as dependencies.
 */
function extractDependencies(content, ownId) {
  const deps = new Set();

  // Match "Story NNN" references
  const storyRefs = content.matchAll(/Story\s+(\d+(?:\.\d+)*)/gi);
  for (const ref of storyRefs) {
    const refId = ref[1];
    if (refId !== ownId) deps.add(refId);
  }

  return [...deps];
}

/**
 * Infer the target atelier from a story's file mentions and title.
 */
function inferTargetFromStory(story) {
  const text = `${story.title} ${story.files_mentioned.join(' ')}`.toLowerCase();

  const targetMap = [
    ['presentation', 'presentation'],
    ['blog', 'blog-atelier'],
    ['carousel', 'carousel'],
    ['video', 'video'],
    ['testimonial', 'testimonials'],
    ['oracle', 'oracle'],
    ['director', 'director'],
    ['research', 'research'],
    ['site/', 'site'],
    ['desktop', 'desktop'],
    ['core/', 'core'],
    ['brand', 'brand'],
  ];

  for (const [keyword, target] of targetMap) {
    if (text.includes(keyword)) return target;
  }

  return 'general';
}

/**
 * Infer priority from story context.
 */
function inferPriority(story, criterion) {
  // High priority if most criteria are done (near completion)
  if (story.completed_criteria > 0 &&
      story.total_criteria - story.completed_criteria <= 3) {
    return 'high';
  }
  // Medium priority for in-progress stories
  if (story.status === 'in_progress') return 'medium';
  // Low priority for not-started stories
  return 'low';
}

/**
 * Infer effort from criterion text.
 */
function inferEffort(text) {
  const lower = text.toLowerCase();
  if (lower.includes('integration test') || lower.includes('real run')) return 'medium';
  if (lower.includes('architecture') || lower.includes('pipeline') || lower.includes('system')) return 'large';
  if (lower.includes('config') || lower.includes('flag') || lower.includes('fix')) return 'small';
  return 'medium';
}

/**
 * Truncate title to a reasonable length for backlog items.
 */
function truncateTitle(text) {
  // Remove markdown formatting
  const clean = text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');

  if (clean.length <= 100) return clean;
  return clean.slice(0, 97) + '...';
}

/**
 * Simple text overlap ratio.
 */
function textOverlap(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return (2 * intersection) / (wordsA.size + wordsB.size);
}

/**
 * Build a description for a strategic backlog item.
 */
function buildDescription(story, criterion) {
  return `PRD gap from Story ${story.id} (${story.title}), ` +
    `section "${criterion.section}", line ${criterion.line_number}. ` +
    `Criterion: ${criterion.text}`;
}
