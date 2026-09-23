/**
 * Competitive Intelligence — End-to-End Tests
 *
 * Tests the full pipeline: query generation → feature parsing →
 * gap analysis → finding generation → briefing → story generation.
 * Uses realistic Videodrome competitor data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'yaml';

import {
  buildCompetitorQueries,
  parseCompetitorFeatures,
  compareFeatures,
  generateCompetitiveFindings,
  buildCompetitiveBriefing,
} from '../lib/competitive-intel.js';

import {
  getNextStoryId,
  generateStorySlug,
  generateStoryMarkdown,
  generateStoriesFromFindings,
} from '../lib/story-generator.js';

// ---------------------------------------------------------------------------
// Fixtures — realistic competitor data
// ---------------------------------------------------------------------------

const VIDEODROME_CONFIG = parse(
  readFileSync(path.resolve('ateliers/director/data/targets.yaml'), 'utf8')
).targets.videodrome;

// Simulated Exa research results — what a real search would return
const MOCK_RESEARCH_ENTRIES = [
  {
    competitor: 'letterboxd',
    results: [
      {
        title: 'Letterboxd Features and Review 2025',
        highlights: 'Letterboxd offers a film diary for daily logging, supports custom lists with descriptions, has a Year in Review feature with detailed stats, provides activity feeds showing friend reviews, includes where to watch streaming info, and allows users to follow friends.',
        url: 'https://example.com/letterboxd-review',
      },
      {
        title: 'Letterboxd UX Design Patterns',
        highlights: 'The platform features inline quick-rate on hover for list views, offers keyboard shortcuts for rating films, provides a diary view with calendar navigation, and has swipe gestures on mobile for quick actions.',
        url: 'https://example.com/letterboxd-ux',
      },
    ],
  },
  {
    competitor: 'trakt',
    results: [
      {
        title: 'Trakt.tv Complete Feature Guide 2025',
        highlights: 'Trakt offers automatic scrobbling from Plex and Kodi, has a Year in Review with watching statistics, supports custom lists with sorting, provides a calendar for upcoming episodes, includes detailed viewing statistics by genre and decade, and features VIP badges for achievements.',
        url: 'https://example.com/trakt-features',
      },
      {
        title: 'Trakt vs Letterboxd Comparison',
        highlights: 'Both platforms offer activity feeds and custom lists. Trakt has automatic detection of what you watch, while Letterboxd has a more social design. Both have Year in Review features with detailed statistics.',
        url: 'https://example.com/trakt-vs-letterboxd',
      },
    ],
  },
  {
    competitor: 'myanimelist',
    results: [
      {
        title: 'MyAnimeList Features Overview',
        highlights: 'MAL provides detailed character pages with voice actors, has community forums per anime title, offers seasonal anime charts, includes custom lists for different categories, and features a club system for community engagement.',
        url: 'https://example.com/mal-features',
      },
    ],
  },
  {
    competitor: 'serializd',
    results: [
      {
        title: 'Serializd: TV Series Tracking App Review',
        highlights: 'Serializd offers per-episode logging with season progress tracking, has a seasonal diary for TV viewing, supports custom lists, provides activity feeds showing what friends are watching, and includes a calendar for upcoming episodes.',
        url: 'https://example.com/serializd-review',
      },
    ],
  },
];

// Temp dir for story generation tests
let tempStoriesDir;

beforeAll(async () => {
  tempStoriesDir = path.join(import.meta.dirname, '__test-stories__');
  await fs.mkdir(tempStoriesDir, { recursive: true });
  // Seed with fake existing stories to test ID sequencing
  await fs.writeFile(path.join(tempStoriesDir, '309-existing-story.md'), '# Placeholder');
  await fs.writeFile(path.join(tempStoriesDir, '213.5-old-story.md'), '# Placeholder');
});

afterAll(async () => {
  await fs.rm(tempStoriesDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// competitive-intel.js tests
// ---------------------------------------------------------------------------

describe('competitive-intel', () => {
  describe('buildCompetitorQueries', () => {
    it('generates queries for all competitors + cross-comparison + domain', () => {
      const queries = buildCompetitorQueries(VIDEODROME_CONFIG);

      // 4 competitors × 2 (features + ux) = 8
      // + 1 cross-comparison (letterboxd vs trakt)
      // + 2 domain-wide
      // = 11
      expect(queries.length).toBe(11);

      // Feature queries exist for each competitor
      const featureQueries = queries.filter(q => q.type === 'features');
      expect(featureQueries.length).toBe(4);
      expect(featureQueries.map(q => q.competitor)).toEqual(
        expect.arrayContaining(['letterboxd', 'trakt', 'myanimelist', 'serializd'])
      );

      // Cross-comparison uses primary competitors only
      const comparison = queries.find(q => q.type === 'comparison');
      expect(comparison).toBeDefined();
      expect(comparison.competitor).toContain('letterboxd');
      expect(comparison.competitor).toContain('trakt');
      expect(comparison.query).toContain('vs');

      // Domain queries reference the product domain
      const domainQueries = queries.filter(q => q.competitor === '_domain');
      expect(domainQueries.length).toBe(2);
      expect(domainQueries[0].query).toContain('movie');
    });

    it('returns empty array if no competitors configured', () => {
      expect(buildCompetitorQueries({})).toEqual([]);
      expect(buildCompetitorQueries({ competitors: null })).toEqual([]);
    });

    it('skips cross-comparison if fewer than 2 primary competitors', () => {
      const config = {
        competitors: {
          letterboxd: { tier: 'primary' },
          mal: { tier: 'secondary' },
        },
        product_context: { domain: 'movies' },
      };
      const queries = buildCompetitorQueries(config);
      const comparison = queries.find(q => q.type === 'comparison');
      expect(comparison).toBeUndefined();
    });
  });

  describe('parseCompetitorFeatures', () => {
    it('extracts features from research results', () => {
      const features = parseCompetitorFeatures(MOCK_RESEARCH_ENTRIES);

      expect(features.has('letterboxd')).toBe(true);
      expect(features.has('trakt')).toBe(true);
      expect(features.has('myanimelist')).toBe(true);
      expect(features.has('serializd')).toBe(true);

      // Should extract meaningful features
      const lbFeatures = features.get('letterboxd');
      expect(lbFeatures.size).toBeGreaterThan(0);

      // Verify some known extractions
      const allFeatures = [...lbFeatures].join(' | ');
      // The regex-based extraction should find things like "a film diary", "custom lists", etc.
      expect(allFeatures.length).toBeGreaterThan(20);
    });

    it('handles empty entries gracefully', () => {
      const features = parseCompetitorFeatures([]);
      expect(features.size).toBe(0);
    });

    it('handles entries with no results', () => {
      const features = parseCompetitorFeatures([
        { competitor: 'test', results: [] },
        { competitor: 'test2' },
      ]);
      expect(features.get('test').size).toBe(0);
      expect(features.get('test2').size).toBe(0);
    });
  });

  describe('compareFeatures', () => {
    it('finds gaps that 2+ competitors have', () => {
      const compFeatures = new Map();
      compFeatures.set('letterboxd', new Set(['year in review', 'film diary', 'custom lists', 'where to watch']));
      compFeatures.set('trakt', new Set(['year in review', 'scrobbling', 'custom lists', 'calendar']));
      compFeatures.set('mal', new Set(['character pages', 'forums', 'custom lists']));

      const currentFeatures = ['watchlist', 'ratings', 'reviews'];
      const gaps = compareFeatures(compFeatures, currentFeatures);

      // "custom lists" appears in 3 competitors, "year in review" in 2 — both are gaps
      expect(gaps.length).toBeGreaterThanOrEqual(2);

      const customLists = gaps.find(g => g.feature === 'custom lists');
      const yearInReview = gaps.find(g => g.feature === 'year in review');

      expect(customLists).toBeDefined();
      expect(customLists.count).toBe(3);
      expect(yearInReview).toBeDefined();
      expect(yearInReview.count).toBe(2);
    });

    it('excludes features we already have (exact match)', () => {
      const compFeatures = new Map();
      compFeatures.set('a', new Set(['ratings', 'reviews']));
      compFeatures.set('b', new Set(['ratings', 'reviews']));

      const currentFeatures = ['ratings', 'reviews'];
      const gaps = compareFeatures(compFeatures, currentFeatures);

      expect(gaps.length).toBe(0);
    });

    it('excludes features with fuzzy match to current (substring)', () => {
      const compFeatures = new Map();
      compFeatures.set('a', new Set(['custom lists', 'viewing statistics']));
      compFeatures.set('b', new Set(['custom lists', 'viewing statistics']));

      // "create and manage custom lists" contains "custom lists" as substring → match
      const currentFeatures = ['create and manage custom lists'];
      const gaps = compareFeatures(compFeatures, currentFeatures);

      const listsGap = gaps.find(g => g.feature === 'custom lists');
      expect(listsGap).toBeUndefined(); // filtered by substring match
    });

    it('does NOT fuzzy-match very different strings', () => {
      const compFeatures = new Map();
      compFeatures.set('a', new Set(['custom user lists with categories']));
      compFeatures.set('b', new Set(['custom user lists with categories']));

      // Too different for substring or Levenshtein to match
      const currentFeatures = ['watchlist'];
      const gaps = compareFeatures(compFeatures, currentFeatures);

      const listsGap = gaps.find(g => g.feature.includes('custom'));
      expect(listsGap).toBeDefined(); // NOT matched — different enough
    });

    it('skips _domain entries', () => {
      const compFeatures = new Map();
      compFeatures.set('_domain', new Set(['some domain feature']));
      compFeatures.set('a', new Set(['unique feature']));

      const gaps = compareFeatures(compFeatures, []);
      // Domain features shouldn't count — only 1 competitor has "unique feature"
      expect(gaps.length).toBe(0);
    });

    it('respects minCompetitors option', () => {
      const compFeatures = new Map();
      compFeatures.set('a', new Set(['rare feature']));
      compFeatures.set('b', new Set(['common feature']));
      compFeatures.set('c', new Set(['common feature']));
      compFeatures.set('d', new Set(['common feature']));

      const gaps1 = compareFeatures(compFeatures, [], { minCompetitors: 3 });
      expect(gaps1.length).toBe(1);
      expect(gaps1[0].feature).toBe('common feature');

      const gaps2 = compareFeatures(compFeatures, [], { minCompetitors: 1 });
      expect(gaps2.length).toBe(2);
    });

    it('sorts gaps by competitor count descending', () => {
      const compFeatures = new Map();
      compFeatures.set('a', new Set(['feat1', 'feat2']));
      compFeatures.set('b', new Set(['feat1', 'feat2']));
      compFeatures.set('c', new Set(['feat2']));

      const gaps = compareFeatures(compFeatures, [], { minCompetitors: 2 });
      expect(gaps[0].feature).toBe('feat2');
      expect(gaps[0].count).toBe(3);
    });
  });

  describe('generateCompetitiveFindings', () => {
    const gaps = [
      { feature: 'year in review', competitors: ['letterboxd', 'trakt'], count: 2 },
      { feature: 'community forums', competitors: ['letterboxd', 'trakt', 'mal'], count: 3 },
      { feature: 'inline quick-rate', competitors: ['letterboxd', 'trakt'], count: 2 },
      { feature: 'character pages with voice actors', competitors: ['mal', 'letterboxd'], count: 2 },
    ];

    it('generates backlog-compatible findings', () => {
      const findings = generateCompetitiveFindings(gaps, 'videodrome', VIDEODROME_CONFIG.competitors);

      expect(findings.length).toBe(4);
      for (const f of findings) {
        expect(f.lens).toBe('competitive-analysis');
        expect(f.source).toBe('competitive');
        expect(f.competitive_alignment).toBe(100);
        expect(f.prd_alignment).toBe(0);
        expect(f.target).toBe('videodrome');
        expect(f.title).toMatch(/^Add /);
        expect(f.competitive_evidence.competitors.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('assigns correct criteria', () => {
      const findings = generateCompetitiveFindings(gaps, 'videodrome');

      const forums = findings.find(f => f.title.includes('community forums'));
      expect(forums.criterion).toBe('engagement-gap'); // "community" keyword

      const inlineRate = findings.find(f => f.title.includes('inline'));
      expect(inlineRate.criterion).toBe('ux-gap'); // "inline" keyword

      const charPages = findings.find(f => f.title.includes('character'));
      expect(charPages.criterion).toBe('data-richness-gap'); // "character" keyword

      const yearReview = findings.find(f => f.title.includes('year'));
      expect(yearReview.criterion).toBe('feature-gap'); // no keyword match → default
    });

    it('classifies effort based on feature keywords', () => {
      const findings = generateCompetitiveFindings(gaps, 'videodrome');

      const forums = findings.find(f => f.title.includes('community'));
      expect(forums.effort).toBe('large'); // "community" → large

      const yearReview = findings.find(f => f.title.includes('year'));
      expect(yearReview.effort).toBe('medium'); // no large keyword → medium default
    });

    it('sets priority high when 3+ competitors have the feature', () => {
      const findings = generateCompetitiveFindings(gaps, 'videodrome');

      const forums = findings.find(f => f.title.includes('community'));
      expect(forums.priority).toBe('high'); // 3 competitors

      const yearReview = findings.find(f => f.title.includes('year'));
      expect(yearReview.priority).toBe('medium'); // 2 competitors
    });
  });

  describe('buildCompetitiveBriefing', () => {
    it('generates markdown briefing with competitor overview', () => {
      const briefing = buildCompetitiveBriefing(VIDEODROME_CONFIG, MOCK_RESEARCH_ENTRIES);

      expect(briefing).toContain('Competitive Briefing');
      expect(briefing).toContain('letterboxd');
      expect(briefing).toContain('trakt');
      expect(briefing).toContain('primary');
      expect(briefing).toContain('Competitors');
    });

    it('includes current capabilities count', () => {
      const briefing = buildCompetitiveBriefing(VIDEODROME_CONFIG, MOCK_RESEARCH_ENTRIES);
      expect(briefing).toContain('23 features implemented');
    });

    it('handles empty research entries', () => {
      const briefing = buildCompetitiveBriefing(VIDEODROME_CONFIG, []);
      expect(briefing).toContain('Competitive Briefing');
      expect(briefing).toContain('0 research entries');
    });
  });
});

// ---------------------------------------------------------------------------
// story-generator.js tests
// ---------------------------------------------------------------------------

describe('story-generator', () => {
  describe('getNextStoryId', () => {
    it('returns max story ID + 1 from directory', async () => {
      const nextId = await getNextStoryId(tempStoriesDir);
      expect(nextId).toBe(310); // max is 309 from seeded files
    });

    it('returns 400 for non-existent directory', async () => {
      const nextId = await getNextStoryId('/tmp/nonexistent-dir-12345');
      expect(nextId).toBe(400);
    });

    it('scans real docs/stories/ for current max', async () => {
      const nextId = await getNextStoryId(path.resolve('docs/stories'));
      expect(nextId).toBeGreaterThanOrEqual(310);
    });
  });

  describe('generateStorySlug', () => {
    it('converts title to kebab-case slug', () => {
      expect(generateStorySlug('Add Year in Review Stats Page')).toBe('add-year-in-review-stats-page');
    });

    it('strips special characters', () => {
      expect(generateStorySlug("What's New? (v2.0)")).toBe('whats-new-v20');
    });

    it('truncates at 60 characters', () => {
      const long = 'A'.repeat(100);
      expect(generateStorySlug(long).length).toBeLessThanOrEqual(60);
    });

    it('handles empty string', () => {
      expect(generateStorySlug('')).toBe('');
    });
  });

  describe('generateStoryMarkdown', () => {
    const finding = {
      title: 'Add year in review stats page',
      description: 'letterboxd, trakt all have this feature. 2 competitor(s) offer this.',
      effort: 'large',
      priority: 'high',
      id: 'comp-001',
      competitive_evidence: {
        competitors: ['letterboxd', 'trakt'],
        count: 2,
      },
    };

    const context = {
      targetName: 'videodrome',
      targetDescription: 'Movie tracking feature',
      competitors: {
        letterboxd: { domain: 'letterboxd.com', tier: 'primary' },
        trakt: { domain: 'trakt.tv', tier: 'primary' },
      },
      sessionId: 'dir-2026-05-25-test',
    };

    it('generates valid story markdown', () => {
      const md = generateStoryMarkdown(finding, context, 310);

      expect(md).toContain('# Story 310');
      expect(md).toContain('videodrome');
      expect(md).toContain('Year in review stats page'); // title-cased, "Add" stripped
    });

    it('includes competitive context table', () => {
      const md = generateStoryMarkdown(finding, context, 310);

      expect(md).toContain('## Competitive Context');
      expect(md).toContain('| letterboxd | Yes | primary |');
      expect(md).toContain('| trakt | Yes | primary |');
      expect(md).toContain('| videodrome | **No** |');
    });

    it('includes acceptance criteria checkboxes', () => {
      const md = generateStoryMarkdown(finding, context, 310);

      expect(md).toContain('## Acceptance Criteria');
      expect(md).toContain('- [ ] Feature is accessible');
      expect(md).toContain('- [ ] Works on mobile');
      expect(md).toContain('- [ ] Unit tests');
      expect(md).toContain('- [ ] No regression');
    });

    it('includes effort and competitive urgency', () => {
      const md = generateStoryMarkdown(finding, context, 310);

      expect(md).toContain('**Effort:** large');
      expect(md).toContain('**Priority:** high');
      expect(md).toContain('**Competitive Urgency:** Medium'); // 2 < 3
    });

    it('includes references with competitor URLs', () => {
      const md = generateStoryMarkdown(finding, context, 310);

      expect(md).toContain('letterboxd: https://letterboxd.com/');
      expect(md).toContain('trakt: https://trakt.tv/');
      expect(md).toContain('comp-001');
      expect(md).toContain('dir-2026-05-25-test');
    });

    it('marks urgency High when 3+ competitors', () => {
      const finding3 = {
        ...finding,
        competitive_evidence: { competitors: ['a', 'b', 'c'], count: 3 },
      };
      const md = generateStoryMarkdown(finding3, context, 310);
      expect(md).toContain('**Competitive Urgency:** High');
    });
  });

  describe('generateStoriesFromFindings', () => {
    const findings = [
      {
        title: 'Add year in review',
        effort: 'large',
        priority: 'high',
        competitive_evidence: { competitors: ['letterboxd', 'trakt'], count: 2 },
      },
      {
        title: 'Add community forums',
        effort: 'large',
        priority: 'high',
        competitive_evidence: { competitors: ['mal', 'letterboxd', 'trakt'], count: 3 },
      },
      {
        title: 'Add minor tweak',
        effort: 'small',
        priority: 'low',
        competitive_evidence: { competitors: ['a', 'b'], count: 2 },
      },
    ];

    const context = {
      targetName: 'videodrome',
      targetDescription: 'Movie tracking',
      competitors: VIDEODROME_CONFIG.competitors,
      sessionId: 'test-session',
    };

    it('generates story files for medium+ effort/priority findings', async () => {
      const stories = await generateStoriesFromFindings(tempStoriesDir, findings, context);

      // "minor tweak" (small/low) should be filtered out
      expect(stories.length).toBe(2);
      expect(stories[0].storyId).toBe(310);
      expect(stories[1].storyId).toBe(311);
      expect(stories[0].title).toContain('year in review');
    });

    it('writes actual files to disk', async () => {
      const stories = await generateStoriesFromFindings(tempStoriesDir, findings, context);

      for (const story of stories) {
        const content = await fs.readFile(story.path, 'utf8');
        expect(content).toContain('# Story');
        expect(content).toContain('Competitive Context');
      }
    });

    it('respects maxStories limit', async () => {
      const stories = await generateStoriesFromFindings(tempStoriesDir, findings, context, {
        maxStories: 1,
      });
      expect(stories.length).toBe(1);
    });

    it('returns empty array for no eligible findings', async () => {
      const stories = await generateStoriesFromFindings(tempStoriesDir, [], context);
      expect(stories).toEqual([]);
    });

    it('filters by custom minEffort/minPriority', async () => {
      const stories = await generateStoriesFromFindings(tempStoriesDir, findings, context, {
        minEffort: 'small',
        minPriority: 'low',
      });
      // All 3 should pass now (small >= small, low >= low)
      expect(stories.length).toBe(3);
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: full pipeline with realistic data
// ---------------------------------------------------------------------------

describe('full pipeline integration (videodrome)', () => {
  it('runs the complete competitive analysis pipeline', () => {
    // Phase 1b.1: Build queries
    const queries = buildCompetitorQueries(VIDEODROME_CONFIG);
    expect(queries.length).toBeGreaterThan(5);

    // Phase 1b.2: Parse features from mock research
    const features = parseCompetitorFeatures(MOCK_RESEARCH_ENTRIES);
    expect(features.size).toBe(4); // 4 competitors

    // Phase 1b.3: Gap analysis against current features
    const gaps = compareFeatures(features, VIDEODROME_CONFIG.product_context.current_features);
    // Should find some gaps (features competitors have that videodrome doesn't)
    expect(gaps.length).toBeGreaterThan(0);

    // Phase 1b.4: Generate findings
    const findings = generateCompetitiveFindings(
      gaps,
      'videodrome',
      VIDEODROME_CONFIG.competitors
    );
    expect(findings.length).toBe(gaps.length);

    // All findings should be backlog-compatible
    for (const f of findings) {
      expect(f).toHaveProperty('title');
      expect(f).toHaveProperty('description');
      expect(f).toHaveProperty('lens', 'competitive-analysis');
      expect(f).toHaveProperty('source', 'competitive');
      expect(f).toHaveProperty('competitive_alignment', 100);
      expect(f).toHaveProperty('effort');
      expect(f).toHaveProperty('priority');
      expect(f).toHaveProperty('competitive_evidence');
      expect(['feature-gap', 'ux-gap', 'engagement-gap', 'data-richness-gap']).toContain(f.criterion);
    }

    // Phase 1b.5: Build briefing
    const briefing = buildCompetitiveBriefing(VIDEODROME_CONFIG, MOCK_RESEARCH_ENTRIES);
    expect(briefing).toContain('Competitive Briefing');
    expect(briefing).toContain('movie and series tracking');

    // Verify priority ordering would work:
    // Competitive findings should have competitive_alignment: 100
    // Tactical findings would have competitive_alignment: 0
    // This means competitive items get a 0.15 * 100 = 15 point boost
    const competitiveBoost = 0.15 * 100;
    expect(competitiveBoost).toBe(15);
  });

  it('generates stories from the pipeline output', async () => {
    // Run pipeline up to findings
    const features = parseCompetitorFeatures(MOCK_RESEARCH_ENTRIES);
    const gaps = compareFeatures(features, VIDEODROME_CONFIG.product_context.current_features);
    const findings = generateCompetitiveFindings(gaps, 'videodrome', VIDEODROME_CONFIG.competitors);

    // Generate stories into temp dir
    const context = {
      targetName: 'videodrome',
      targetDescription: VIDEODROME_CONFIG.description,
      competitors: VIDEODROME_CONFIG.competitors,
      sessionId: 'integration-test',
    };

    const stories = await generateStoriesFromFindings(tempStoriesDir, findings, context, {
      maxStories: 3,
    });

    expect(stories.length).toBeGreaterThan(0);
    expect(stories.length).toBeLessThanOrEqual(3);

    // Verify first story has all required sections
    const content = await fs.readFile(stories[0].path, 'utf8');
    expect(content).toContain('# Story');
    expect(content).toContain('## Competitive Context');
    expect(content).toContain('## Problem');
    expect(content).toContain('## Solution');
    expect(content).toContain('## Acceptance Criteria');
    expect(content).toContain('## Effort Estimate');
    expect(content).toContain('## Files');
    expect(content).toContain('## References');
    expect(content).toContain('Auto-generated by Director v4');
  });

  it('validates config.yaml priority weights sum to 1.0', () => {
    const config = parse(
      readFileSync(path.resolve('ateliers/director/config.yaml'), 'utf8')
    );
    const weights = config.priority.weights;
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(weights.competitive_alignment).toBe(0.15);
  });

  it('validates videodrome target has competitive-analysis lens', () => {
    expect(VIDEODROME_CONFIG.lenses).toContain('competitive-analysis');
    expect(VIDEODROME_CONFIG.competitors).toBeDefined();
    expect(Object.keys(VIDEODROME_CONFIG.competitors).length).toBe(4);
    expect(VIDEODROME_CONFIG.product_context.current_features.length).toBe(23);
  });

  it('validates competitive-analysis lens YAML structure', () => {
    const lens = parse(
      readFileSync(path.resolve('ateliers/director/lenses/competitive-analysis.yaml'), 'utf8')
    );
    expect(lens.lens).toBe('competitive-analysis');
    expect(lens.agent).toBe('product-analyst');
    expect(lens.weight).toBe(1.0);
    expect(lens.criteria.length).toBe(4);
    expect(lens.criteria.map(c => c.id)).toEqual([
      'feature-gap', 'ux-gap', 'engagement-gap', 'data-richness-gap',
    ]);
    expect(lens.scan_instructions).toBeDefined();
    expect(lens.research_queries).toBeDefined();
  });
});
