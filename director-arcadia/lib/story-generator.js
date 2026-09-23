/**
 * Story Generator — Director Atelier
 *
 * Auto-generates story files from competitive findings and high-priority
 * backlog items. Stories land in docs/stories/ ready for implementation.
 *
 * Flow:
 *   1. Filter findings to medium+ effort/priority
 *   2. Scan docs/stories/ for the next available story ID
 *   3. Generate markdown story files with competitive context
 *   4. Return paths of generated stories
 *
 * @module story-generator
 */

import fs from 'fs/promises';
import path from 'path';

// ---------------------------------------------------------------------------
// Story ID management
// ---------------------------------------------------------------------------

/**
 * Scan docs/stories/ for the highest numeric story ID and return next.
 * Handles formats: "309-slug.md", "213.5-slug.md", "STORY-10.3-slug.md"
 *
 * @param {string} storiesDir - Absolute path to docs/stories/
 * @returns {Promise<number>} Next story ID (integer)
 */
export async function getNextStoryId(storiesDir) {
  let files;
  try {
    files = await fs.readdir(storiesDir);
  } catch {
    return 400; // start at 400 if dir doesn't exist
  }

  let maxId = 0;
  for (const file of files) {
    // Match leading number (possibly with decimal): "309-...", "213.5-...", "STORY-10.3-..."
    const match = file.match(/^(?:STORY-)?(\d+)(?:\.\d+)?/i);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id > maxId) maxId = id;
    }
  }

  return maxId + 1;
}

/**
 * Generate a filesystem-safe slug from a title.
 *
 * @param {string} title - Human-readable title
 * @returns {string} Kebab-case slug
 */
export function generateStorySlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Story markdown rendering
// ---------------------------------------------------------------------------

/**
 * Generate a story markdown file from a competitive finding.
 *
 * @param {object} finding - Backlog item with competitive_evidence
 * @param {object} context - Additional context
 * @param {string} context.targetName - e.g., "videodrome"
 * @param {string} context.targetDescription - e.g., "Movie tracking feature"
 * @param {object} context.competitors - Competitor config from targets.yaml
 * @param {string} context.sessionId - Director session ID for traceability
 * @param {number} storyId - Story number
 * @returns {string} Markdown content
 */
export function generateStoryMarkdown(finding, context, storyId) {
  const title = finding.title.replace(/^Add\s+/i, '').trim();
  const titleCased = title.charAt(0).toUpperCase() + title.slice(1);
  const evidence = finding.competitive_evidence || {};
  const competitors = context.competitors || {};

  const lines = [];

  // Header
  lines.push(`# Story ${storyId} — ${context.targetName}: ${titleCased}`);
  lines.push('');

  // Competitive context table
  if (evidence.competitors?.length) {
    lines.push('## Competitive Context');
    lines.push('');
    lines.push('| Competitor | Has Feature | Tier | Notes |');
    lines.push('|------------|-------------|------|-------|');
    for (const compName of evidence.competitors) {
      const config = competitors[compName] || {};
      const tier = config.tier || 'unknown';
      const domain = config.domain || '';
      lines.push(`| ${compName} | Yes | ${tier} | ${domain} |`);
    }
    // Add our product as "No"
    lines.push(`| ${context.targetName} | **No** | — | Current gap |`);
    lines.push('');
  }

  // Problem
  lines.push('## Problem');
  lines.push('');
  lines.push(finding.description);
  lines.push('');

  // Solution
  lines.push('## Solution');
  lines.push('');
  lines.push(`Implement ${title} for ${context.targetName}. `
    + 'Design our own approach — differentiate from competitors rather than copying their implementation.');
  lines.push('');

  // Acceptance criteria
  lines.push('## Acceptance Criteria');
  lines.push('');
  lines.push(`- [ ] Feature is accessible from the ${context.targetName} UI`);
  lines.push(`- [ ] Works on mobile and desktop viewports`);
  lines.push(`- [ ] Unit tests cover core logic`);
  lines.push(`- [ ] No regression in existing ${context.targetName} features`);
  lines.push('');

  // Effort + urgency
  lines.push('## Effort Estimate');
  lines.push('');
  lines.push(`- **Effort:** ${finding.effort || 'medium'}`);
  lines.push(`- **Priority:** ${finding.priority || 'medium'}`);
  lines.push(`- **Competitive Urgency:** ${evidence.count >= 3 ? 'High' : 'Medium'} — ${evidence.count || 0} competitor(s) have this`);
  lines.push('');

  // Files (predicted)
  lines.push('## Files');
  lines.push('');
  lines.push('> Predicted files — update as implementation progresses.');
  lines.push('');
  if (finding.files?.length) {
    for (const f of finding.files) {
      lines.push(`- [ ] \`${f}\``);
    }
  } else {
    lines.push(`- [ ] \`site/src/features/${context.targetName}/\` — TBD`);
  }
  lines.push('');

  // References
  lines.push('## References');
  lines.push('');
  if (evidence.competitors?.length) {
    for (const compName of evidence.competitors) {
      const config = competitors[compName] || {};
      if (config.domain) {
        lines.push(`- ${compName}: https://${config.domain}/`);
      }
    }
  }
  if (finding.id) {
    lines.push(`- Backlog item: \`${finding.id}\``);
  }
  if (context.sessionId) {
    lines.push(`- Director session: \`${context.sessionId}\``);
  }
  lines.push('');
  lines.push('---');
  lines.push('*Auto-generated by Director v4 — Competitive Analysis Pipeline*');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Batch generation
// ---------------------------------------------------------------------------

/**
 * Generate story files from competitive findings.
 * Filters to medium+ effort items and generates stories for each.
 *
 * @param {string} storiesDir - Absolute path to docs/stories/
 * @param {Array<object>} findings - Competitive findings from generateCompetitiveFindings()
 * @param {object} context - Target context (targetName, targetDescription, competitors, sessionId)
 * @param {object} [opts]
 * @param {string} [opts.minEffort='medium'] - Minimum effort level to generate stories for
 * @param {string} [opts.minPriority='medium'] - Minimum priority to generate stories for
 * @param {number} [opts.maxStories=10] - Maximum stories to generate per session
 * @returns {Promise<Array<{path: string, storyId: number, title: string}>>} Generated story paths
 */
export async function generateStoriesFromFindings(storiesDir, findings, context, opts = {}) {
  const effortOrder = ['small', 'medium', 'large', 'xlarge'];
  const priorityOrder = ['low', 'medium', 'high', 'critical'];
  const minEffortIdx = effortOrder.indexOf(opts.minEffort || 'medium');
  const minPriorityIdx = priorityOrder.indexOf(opts.minPriority || 'medium');
  const maxStories = opts.maxStories || 10;

  // Filter findings
  const eligible = findings.filter(f => {
    const effortIdx = effortOrder.indexOf(f.effort || 'medium');
    const priorityIdx = priorityOrder.indexOf(f.priority || 'medium');
    return effortIdx >= minEffortIdx && priorityIdx >= minPriorityIdx;
  });

  if (eligible.length === 0) return [];

  // Ensure stories directory exists
  await fs.mkdir(storiesDir, { recursive: true });

  let nextId = await getNextStoryId(storiesDir);
  const generated = [];

  for (const finding of eligible.slice(0, maxStories)) {
    const storyId = nextId++;
    const slug = generateStorySlug(finding.title);
    const filename = `${storyId}-${slug}.md`;
    const filePath = path.join(storiesDir, filename);

    const markdown = generateStoryMarkdown(finding, context, storyId);
    await fs.writeFile(filePath, markdown, 'utf8');

    generated.push({
      path: filePath,
      storyId,
      title: finding.title,
    });
  }

  return generated;
}
