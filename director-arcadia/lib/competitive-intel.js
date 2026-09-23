/**
 * Competitive Intelligence Library — Director Atelier
 *
 * Product-level competitive analysis for the Director PM engine.
 * Modeled on blog's competitor-bank.js but adapted for feature gap analysis
 * rather than content benchmarking.
 *
 * Flow:
 *   1. Build Exa queries from target's competitor config
 *   2. Parse research results into structured feature lists
 *   3. Compare competitor features vs current features → gaps
 *   4. Generate backlog-compatible findings from gaps
 *   5. Build readable competitive briefing
 *
 * @module competitive-intel
 */

// NOTE: queryBank/storeResults from research-bank.js are called by the
// orchestrator (director.md Phase 1b), not by this library directly.
// This module is pure — no I/O, no side effects.

// ---------------------------------------------------------------------------
// Query generation
// ---------------------------------------------------------------------------

/**
 * Build Exa search queries from a target's competitor configuration.
 *
 * @param {object} targetConfig - Target block from targets.yaml (must have competitors + product_context)
 * @returns {Array<{query: string, competitor: string, type: string}>} Queries ready for Exa
 */
export function buildCompetitorQueries(targetConfig) {
  const competitors = targetConfig?.competitors;
  const context = targetConfig?.product_context;
  if (!competitors || !context) return [];

  const queries = [];
  const domain = context.domain || 'app';
  const names = Object.keys(competitors);

  for (const name of names) {
    const comp = competitors[name];
    queries.push({
      query: `${name} features list 2025 2026`,
      competitor: name,
      type: 'features',
    });
    queries.push({
      query: `${name} UX review design patterns ${comp.category || ''}`.trim(),
      competitor: name,
      type: 'ux',
    });
  }

  // Cross-comparison queries (primary competitors only)
  const primaries = names.filter(n => competitors[n].tier === 'primary');
  if (primaries.length >= 2) {
    queries.push({
      query: `${primaries[0]} vs ${primaries[1]} comparison features`,
      competitor: `${primaries[0]}+${primaries[1]}`,
      type: 'comparison',
    });
  }

  // Domain-wide queries
  queries.push({
    query: `best ${domain} app features users want 2025 2026`,
    competitor: '_domain',
    type: 'domain',
  });
  queries.push({
    query: `${domain} tracking app what users want reddit`,
    competitor: '_domain',
    type: 'community',
  });

  return queries;
}

// ---------------------------------------------------------------------------
// Feature parsing
// ---------------------------------------------------------------------------

/**
 * Parse Exa research results into structured competitor feature lists.
 * Extracts features mentioned in titles, highlights, and text content.
 *
 * @param {Array<{competitor: string, results: object[]}>} researchEntries - Research bank entries
 * @returns {Map<string, Set<string>>} competitor name → set of feature strings
 */
export function parseCompetitorFeatures(researchEntries) {
  const features = new Map();

  for (const entry of researchEntries) {
    const comp = entry.competitor || entry.target;
    if (!features.has(comp)) features.set(comp, new Set());
    const featureSet = features.get(comp);

    for (const result of (entry.results || [])) {
      const text = [result.highlights, result.title, result.snippet]
        .filter(Boolean)
        .join(' ');

      // Strategy 1: Verb-pattern extraction (broad verb set)
      const verbPattern = /(?:supports?|offers?|includes?|has|provides?|features?|allows?|enables?|lets?\s+(?:you|users?)|tracks?|shows?|displays?|gives?\s+(?:you|users?))\s+([^.;]{5,80})/gi;
      for (const match of (text.match(verbPattern) || [])) {
        const clean = match
          .replace(/^(?:supports?|offers?|includes?|has|provides?|features?|allows?|enables?|lets?\s+(?:you|users?)|tracks?|shows?|displays?|gives?\s+(?:you|users?))\s+/i, '')
          .replace(/,\s*$/, '')
          .trim();
        if (clean.length > 4 && clean.length < 80) {
          featureSet.add(clean.toLowerCase());
        }
      }

      // Strategy 2: Dot-separated feature lists ("Feature A. Feature B. Feature C.")
      // Common in Exa highlights which concatenate bullet points with periods
      const sentences = text.split(/\.\s+/);
      for (const sentence of sentences) {
        const s = sentence.trim();
        // Short noun-phrase sentences are likely feature names
        if (s.length > 8 && s.length < 60 && !s.includes('?') && /^[A-Z]/.test(s)) {
          // Filter out non-feature sentences (meta text, navigation, etc.)
          const skipPatterns = /^(the |this |it |we |you |our |your |is |are |was |were |if |for |more |see |visit |click |sign |learn |copyright|version|mar |feb |jan )/i;
          if (!skipPatterns.test(s)) {
            featureSet.add(s.toLowerCase());
          }
        }
      }

      // Strategy 3: Structured highlights with explicit feature keywords
      const featureKeywords = [
        'year in review', 'annual stats', 'all-time stats', 'viewing stats',
        'activity feed', 'activity stream', 'film diary', 'tv diary',
        'scrobbling', 'auto-log', 'automatic tracking', 'streaming sync',
        'custom lists', 'personal lists', 'curated lists', 'ranked lists',
        'follow friends', 'follow members', 'follow users', 'social',
        'calendar', 'upcoming episodes', 'release radar',
        'where to watch', 'where to stream', 'streaming availability',
        'recommendations', 'personalized recommendations',
        'comments', 'reviews', 'ratings', 'tags',
        'watchlist', 'watch progress', 'up next', 'continue watching',
        'character pages', 'voice actors', 'cast and crew',
        'community forums', 'discussions', 'engage in',
        'seasonal charts', 'trending', 'popular',
        'per-episode', 'episode tracking', 'season progress',
        'rewatch', 'viewing streaks', 'watch time',
        'badges', 'achievements', 'vip badge',
        'customizable profiles', 'profile',
        'csv import', 'csv export', 'data export',
        'keyboard shortcuts', 'inline editing', 'quick-rate',
        'dark mode', 'advanced filtering', 'saved filters',
        'ical feeds', 'rss feeds', 'webhooks',
        'plex', 'kodi', 'infuse', 'media center',
        'binge planner', 'watch time estimator',
        'group ratings', 'shared watchlists', 'collaborative lists',
      ];

      const lowerText = text.toLowerCase();
      for (const kw of featureKeywords) {
        if (lowerText.includes(kw)) {
          featureSet.add(kw);
        }
      }
    }
  }

  return features;
}

// ---------------------------------------------------------------------------
// Gap analysis
// ---------------------------------------------------------------------------

/**
 * Compare competitor features against current features to identify gaps.
 *
 * @param {Map<string, Set<string>>} competitorFeatures - From parseCompetitorFeatures()
 * @param {string[]} currentFeatures - From target.product_context.current_features
 * @param {object} [opts]
 * @param {number} [opts.minCompetitors=2] - Minimum competitors with the feature to flag as gap
 * @returns {Array<{feature: string, competitors: string[], count: number}>} Gaps sorted by count
 */
export function compareFeatures(competitorFeatures, currentFeatures = [], opts = {}) {
  const minCompetitors = opts.minCompetitors || 2;
  const currentSet = new Set((currentFeatures || []).map(f => f.toLowerCase()));

  // Aggregate: which features appear across competitors?
  const featureMap = new Map(); // feature → [competitor names]

  for (const [comp, features] of competitorFeatures) {
    if (comp.startsWith('_')) continue; // skip domain-wide entries
    for (const feature of features) {
      if (!featureMap.has(feature)) featureMap.set(feature, []);
      featureMap.get(feature).push(comp);
    }
  }

  // Filter: features we don't have + meet minimum competitor count
  const gaps = [];
  for (const [feature, comps] of featureMap) {
    // Skip if current features include something similar (fuzzy match)
    const hasIt = [...currentSet].some(cf => {
      return cf.includes(feature) || feature.includes(cf)
        || levenshteinSimilarity(cf, feature) > 0.6;
    });

    if (!hasIt && comps.length >= minCompetitors) {
      gaps.push({
        feature,
        competitors: [...new Set(comps)],
        count: new Set(comps).size,
      });
    }
  }

  gaps.sort((a, b) => b.count - a.count);
  return gaps;
}

/**
 * Simple Levenshtein-based similarity (0-1).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshteinSimilarity(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) { costs[j] = j; continue; }
      if (j > 0) {
        let newValue = costs[j - 1];
        if (longer[i - 1] !== shorter[j - 1]) {
          newValue = Math.min(newValue, lastValue, costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }

  return 1 - (costs[shorter.length] / longer.length);
}

// ---------------------------------------------------------------------------
// Finding generation
// ---------------------------------------------------------------------------

/**
 * Generate backlog-compatible findings from competitive gaps.
 *
 * @param {Array<{feature: string, competitors: string[], count: number}>} gaps - From compareFeatures()
 * @param {string} targetName - Target name (e.g., "videodrome")
 * @param {object} [competitorConfig] - competitors block from targets.yaml
 * @returns {Array<object>} Backlog-compatible items
 */
export function generateCompetitiveFindings(gaps, targetName, competitorConfig = {}) {
  return gaps.map(gap => {
    const compNames = gap.competitors.join(', ');
    const severity = gap.count >= 3 ? 'high' : 'medium';
    const effort = classifyEffort(gap.feature);
    const criterion = classifyCriterion(gap.feature);

    return {
      title: `Add ${gap.feature}`,
      description: `${compNames} ${gap.count > 1 ? 'all have' : 'has'} this feature. `
        + `${gap.count} competitor(s) offer this — represents a product gap. `
        + `Users familiar with ${gap.competitors[0]} will expect this.`,
      lens: 'competitive-analysis',
      criterion,
      target: targetName,
      effort,
      priority: severity,
      source: 'competitive',
      competitive_alignment: 100,
      prd_alignment: 0,
      competitive_evidence: {
        competitors: gap.competitors,
        count: gap.count,
      },
    };
  });
}

/**
 * Classify effort for a feature gap.
 * @param {string} feature
 * @returns {string}
 */
function classifyEffort(feature) {
  const lower = feature.toLowerCase();
  const largeKeywords = ['social', 'feed', 'follow', 'recommendation', 'engine', 'forum', 'community', 'achievement', 'gamification'];
  const mediumKeywords = ['list', 'filter', 'sort', 'stats', 'review', 'rating', 'share', 'export', 'import'];

  if (largeKeywords.some(k => lower.includes(k))) return 'large';
  if (mediumKeywords.some(k => lower.includes(k))) return 'medium';
  return 'medium'; // default to medium for competitive features
}

/**
 * Classify which competitive-analysis criterion a gap falls under.
 * @param {string} feature
 * @returns {string}
 */
function classifyCriterion(feature) {
  const lower = feature.toLowerCase();
  const social = ['follow', 'feed', 'social', 'community', 'forum', 'badge', 'achievement', 'streak', 'share'];
  const ux = ['drag', 'inline', 'swipe', 'gesture', 'shortcut', 'quick', 'auto', 'detect'];
  const data = ['metadata', 'cast', 'crew', 'where to watch', 'stream', 'stats', 'analytics', 'character'];

  if (social.some(k => lower.includes(k))) return 'engagement-gap';
  if (ux.some(k => lower.includes(k))) return 'ux-gap';
  if (data.some(k => lower.includes(k))) return 'data-richness-gap';
  return 'feature-gap';
}

// ---------------------------------------------------------------------------
// Competitive briefing
// ---------------------------------------------------------------------------

/**
 * Build a readable competitive briefing from research data.
 *
 * @param {object} targetConfig - Full target config from targets.yaml
 * @param {Array<object>} researchEntries - Research bank entries for this target
 * @returns {string} Markdown-formatted competitive briefing
 */
export function buildCompetitiveBriefing(targetConfig, researchEntries) {
  const competitors = targetConfig?.competitors || {};
  const context = targetConfig?.product_context || {};
  const lines = [];

  lines.push(`## Competitive Briefing: ${context.domain || 'Unknown Domain'}`);
  lines.push(`> ${Object.keys(competitors).length} competitors analyzed | ${researchEntries.length} research entries`);
  lines.push('');

  // Competitor overview
  lines.push('### Competitors');
  for (const [name, config] of Object.entries(competitors)) {
    const tier = config.tier || 'secondary';
    const focus = (config.focus_areas || []).join(', ');
    lines.push(`- **${name}** (${tier}) — ${config.domain || ''} — Focus: ${focus || 'general'}`);
  }
  lines.push('');

  // Feature comparison
  const features = parseCompetitorFeatures(researchEntries);
  const gaps = compareFeatures(features, context.current_features);

  if (gaps.length > 0) {
    lines.push('### Feature Gaps');
    lines.push(`> ${gaps.length} gaps identified (features 2+ competitors have)`);
    lines.push('');
    lines.push('| Feature | Competitors | Count |');
    lines.push('|---------|-------------|-------|');
    for (const gap of gaps.slice(0, 15)) {
      lines.push(`| ${gap.feature} | ${gap.competitors.join(', ')} | ${gap.count} |`);
    }
    lines.push('');
  }

  // Current capabilities
  if (context.current_features?.length) {
    lines.push('### Current Capabilities');
    lines.push(`${context.current_features.length} features implemented.`);
    lines.push('');
  }

  return lines.join('\n');
}
