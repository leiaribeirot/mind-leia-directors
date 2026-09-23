/**
 * Scan Orchestrator — Director Atelier
 *
 * Orchestrates the scan pipeline: target → discover files → run lenses →
 * deduplicate → score → commit to backlog.
 *
 * Follows the ArcadiaPresentationOrchestrator pattern (phase methods,
 * checkpoints, cost tracking).
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import crypto from 'crypto';
import { atomicWriteJson, loadJsonSafe } from './fs-utils.js';
import { getTarget, resolveTargetPath, discoverFiles } from './target-resolver.js';
import { loadBacklogAsync, addItems, dedup } from './backlog-manager.js';
import { findCached, storeResults, queryBank, getBankStats } from './research-bank.js';
import { createCostTracker, checkHardStop, getSummary } from '#core/utils/cost-tracker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ATELIER_ROOT = path.resolve(__dirname, '..');

const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];

/**
 * Auto-discover available lenses from the lenses/ directory.
 * @param {string} lensesDir - Path to lenses/ directory
 * @returns {Promise<string[]>} Array of lens IDs (filenames without .yaml)
 */
async function discoverLenses(lensesDir) {
  try {
    const files = await fs.readdir(lensesDir);
    return files
      .filter(f => f.endsWith('.yaml'))
      .map(f => f.replace('.yaml', ''));
  } catch {
    return [];
  }
}

/**
 * Director Scan Orchestrator
 *
 * Usage:
 *   const orchestrator = new DirectorScanOrchestrator({ projectRoot, target, lenses, dryRun });
 *   const result = await orchestrator.run();
 */
export class DirectorScanOrchestrator {
  /**
   * @param {object} options
   * @param {string} options.projectRoot - Absolute path to project root
   * @param {string} options.target - Target name from targets.yaml
   * @param {string[]} [options.lenses] - Optional lens subset
   * @param {boolean} [options.dryRun] - If true, don't write to backlog
   * @param {object} [options.logger] - Logger interface (defaults to console). Pass null for silent.
   */
  constructor({ projectRoot, target, lenses, dryRun = false, logger = console }) {
    this.projectRoot = projectRoot;
    this.targetName = target;
    this.requestedLenses = lenses || null;
    this.dryRun = dryRun;
    this.logger = logger || { log() {}, warn() {}, error() {} };

    this.dataDir = path.join(ATELIER_ROOT, 'data');
    this.lensesDir = path.join(ATELIER_ROOT, 'lenses');
    this.config = null;
    this.targetConfig = null;
    this.files = [];
    this.findings = [];
    this.costTracker = null;
    this.scanId = null;
    this._currentLens = null;
    this._availableLenses = [];
  }

  /**
   * Run the full scan pipeline.
   * @returns {Promise<object>} Scan result with findings and summary
   */
  async run() {
    await this.loadConfig();
    this.costTracker = createCostTracker({
      budgetUsd: this.config.cost.per_scan.budget_usd,
      hardStopUsd: this.config.cost.per_scan.hard_stop_usd,
    });

    this.scanId = `scan-${new Date().toISOString().slice(0, 10)}-${crypto.randomBytes(4).toString('hex')}`;

    this.logger.log(`\n--- Director Scan: ${this.targetName} [${this.scanId}] ---\n`);

    // Phase 0: Discover available lenses
    this._availableLenses = await discoverLenses(this.lensesDir);

    // Phase 1: Resolve target
    await this.resolveTarget();

    // Phase 2: Discover files
    await this.discoverFiles();

    // Phase 3: Determine lenses
    const lensIds = this.determineLenses();

    // Phase 4: Run each lens
    for (const lensId of lensIds) {
      if (checkHardStop(this.costTracker)) {
        this.logger.error('[scan] Hard stop reached — aborting remaining lenses');
        break;
      }
      await this.runLens(lensId);
    }

    // Phase 5: Deduplicate against existing backlog
    const dedupResult = await this.deduplicateFindings();

    // Phase 6: Score findings
    this.scoreFindings();

    // Phase 7: Commit to backlog
    let commitResult = null;
    if (!this.dryRun && dedupResult.unique.length > 0) {
      commitResult = await this.commitToBacklog(dedupResult.unique);
    }

    // Phase 8: Record scan
    await this.recordScan(dedupResult);

    // Phase 9: Build summary
    const summary = this.buildSummary(dedupResult, commitResult);
    this.displaySummary(summary);

    return { findings: dedupResult.unique, summary, cost: getSummary(this.costTracker) };
  }

  /**
   * Load the director config.yaml.
   */
  async loadConfig() {
    const configPath = path.join(ATELIER_ROOT, 'config.yaml');
    const raw = await fs.readFile(configPath, 'utf-8');
    this.config = yaml.load(raw);
  }

  /**
   * Resolve the target from targets.yaml.
   */
  async resolveTarget() {
    this.targetConfig = await getTarget(this.dataDir, this.targetName);
    if (!this.targetConfig) {
      throw new Error(`Target '${this.targetName}' not found in targets.yaml`);
    }
    const targetPath = resolveTargetPath(this.projectRoot, this.targetConfig);
    this.logger.log(`Target: ${this.targetName} → ${this.targetConfig.path}`);

    // Verify path exists
    try {
      await fs.access(targetPath);
    } catch {
      throw new Error(`Target path does not exist: ${targetPath}`);
    }
  }

  /**
   * Discover files in the target directory.
   */
  async discoverFiles() {
    const targetPath = resolveTargetPath(this.projectRoot, this.targetConfig);
    this.files = await discoverFiles(targetPath, this.config.scan, this.targetConfig);
    this.logger.log(`Files discovered: ${this.files.length}`);
  }

  /**
   * Determine which lenses to apply.
   * @returns {string[]} Lens IDs
   */
  determineLenses() {
    const lensIds = this.requestedLenses || this.targetConfig.lenses || [];
    this.logger.log(`Lenses: ${lensIds.join(', ')}`);
    return lensIds;
  }

  /**
   * Run a single lens scan.
   * In this orchestrator, we prepare the lens context — the actual AI analysis
   * happens when called from Claude Code (via task files) or from the scan script.
   * Here we produce the structural output that feeds into scoring/dedup.
   *
   * @param {string} lensId - Lens identifier
   */
  async runLens(lensId) {
    if (!this._availableLenses.includes(lensId)) {
      this.logger.warn(`[scan] Lens '${lensId}' not found in lenses/ — skipping (available: ${this._availableLenses.join(', ')})`);
      return;
    }
    const lensPath = path.join(this.lensesDir, `${lensId}.yaml`);

    let lensConfig;
    try {
      const raw = await fs.readFile(lensPath, 'utf-8');
      lensConfig = yaml.load(raw);
    } catch (error) {
      this.logger.warn(`[scan] Lens '${lensId}' not found at ${lensPath} — skipping`);
      return;
    }

    const criteriaCount = lensConfig.criteria?.length || lensConfig.maturity_checklist?.length || 0;
    this.logger.log(`  Lens: ${lensConfig.name} (${criteriaCount} criteria)`);

    // Store lens metadata for downstream scoring
    this._currentLens = lensConfig;
  }

  /**
   * Deduplicate findings against existing backlog.
   * @returns {{ unique: object[], duplicateCount: number }}
   */
  async deduplicateFindings() {
    const backlog = await loadBacklogAsync(this.dataDir);
    const result = dedup(backlog.items, this.findings);
    this.logger.log(`Dedup: ${result.unique.length} new, ${result.duplicateCount} duplicates`);
    return result;
  }

  /**
   * Calculate priority_score for each finding.
   */
  scoreFindings() {
    const weights = this.config.priority.weights;
    const impactScores = this.config.priority.impact_scores;
    const effortScores = this.config.priority.effort_scores;
    const boost = this.targetConfig.priority_boost || 1.0;

    for (const item of this.findings) {
      const impactScore = impactScores[item.priority] || 50;
      const effortScore = effortScores[item.effort] || 50;
      const freshnessScore = 100; // New items start fresh
      const lensWeightScore = (item._lens_weight || 1.0) * 100;

      let score = Math.round(
        (impactScore * weights.impact) +
        (effortScore * weights.effort_inverse) +
        (freshnessScore * weights.freshness) +
        (lensWeightScore * weights.lens_weight)
      );

      score = Math.min(100, Math.round(score * boost));
      item.priority_score = score;
      item.scan_id = this.scanId;

      // Clean internal fields
      delete item._lens_weight;
    }
  }

  /**
   * Commit findings to backlog.
   * @param {object[]} items - Unique findings to add
   * @returns {Promise<object>} addItems result
   */
  async commitToBacklog(items) {
    const result = await addItems(this.dataDir, items);
    this.logger.log(`Committed: ${result.added} items to backlog`);
    return result;
  }

  /**
   * Record scan in scan-history.json.
   * @param {{ unique: object[], duplicateCount: number }} dedupResult
   */
  async recordScan(dedupResult) {
    const historyPath = path.join(this.dataDir, 'scan-history.json');
    const history = await loadJsonSafe(historyPath, { scans: [] });

    history.scans.push({
      id: this.scanId,
      target: this.targetName,
      lenses: this.requestedLenses || this.targetConfig.lenses,
      files_scanned: this.files.length,
      findings_total: this.findings.length,
      findings_new: dedupResult.unique.length,
      findings_duplicate: dedupResult.duplicateCount,
      dry_run: this.dryRun,
      timestamp: new Date().toISOString(),
    });

    await atomicWriteJson(historyPath, history);
  }

  /**
   * Build summary object.
   */
  buildSummary(dedupResult, commitResult) {
    // Count all findings by lens + priority
    const byLens = {};
    for (const item of this.findings) {
      if (!byLens[item.lens]) {
        byLens[item.lens] = { total: 0, new: 0, critical: 0, high: 0, medium: 0, low: 0 };
      }
      byLens[item.lens].total++;
      if (VALID_PRIORITIES.includes(item.priority)) {
        byLens[item.lens][item.priority]++;
      }
    }

    // Count new items per lens directly from dedup result
    for (const item of dedupResult.unique) {
      if (byLens[item.lens]) {
        byLens[item.lens].new++;
      }
    }

    return {
      scan_id: this.scanId,
      target: this.targetName,
      files_scanned: this.files.length,
      findings_total: this.findings.length,
      findings_new: dedupResult.unique.length,
      findings_duplicate: dedupResult.duplicateCount,
      committed: commitResult ? commitResult.added : 0,
      dry_run: this.dryRun,
      by_lens: byLens,
      top_items: dedupResult.unique
        .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
        .slice(0, 5)
        .map(item => ({
          score: item.priority_score,
          title: item.title,
          lens: item.lens,
          effort: item.effort,
        })),
    };
  }

  /**
   * Display formatted summary to console.
   * @param {object} summary
   */
  displaySummary(summary) {
    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`Scan Summary: ${summary.target} (${summary.files_scanned} files)`);
    this.logger.log(`${'='.repeat(60)}`);
    this.logger.log(`Findings: ${summary.findings_total} total | ${summary.findings_new} new | ${summary.findings_duplicate} duplicates`);
    if (summary.dry_run) this.logger.log('MODE: dry-run (not committed to backlog)');
    this.logger.log('');

    if (summary.top_items.length > 0) {
      this.logger.log('Top findings by priority:');
      for (let i = 0; i < summary.top_items.length; i++) {
        const item = summary.top_items[i];
        this.logger.log(`  ${i + 1}. [${item.score}] ${item.title} (${item.lens}, ${item.effort})`);
      }
    }

    this.logger.log(`\nCost: $${getSummary(this.costTracker).total_usd.toFixed(3)}`);
    this.logger.log(`${'='.repeat(60)}\n`);
  }

  /**
   * Add findings programmatically (used by scan scripts and agents).
   * @param {object[]} items - Finding objects
   */
  addFindings(items) {
    for (const item of items) {
      item.target = this.targetName;
      item.scan_id = this.scanId;
      item._lens_weight = this._currentLens ? this._currentLens.weight : 1.0;
      this.findings.push(item);
    }
  }

  /**
   * Get the lens config for a specific lens.
   * @param {string} lensId - Lens identifier
   * @returns {Promise<object|null>} Lens config or null
   */
  async getLensConfig(lensId) {
    if (this._availableLenses.length > 0 && !this._availableLenses.includes(lensId)) return null;
    const lensPath = path.join(this.lensesDir, `${lensId}.yaml`);
    try {
      const raw = await fs.readFile(lensPath, 'utf-8');
      return yaml.load(raw);
    } catch {
      return null;
    }
  }

  /**
   * Get discovered files (call after discoverFiles phase).
   * @returns {string[]} Absolute file paths
   */
  getFiles() {
    return this.files;
  }

  /**
   * Load atelier pattern preferences (atelier-patterns.yaml).
   * Used by scan agents to align findings with our architecture philosophy.
   * @returns {Promise<object>} Patterns config
   */
  async loadPatterns() {
    const patternsPath = path.join(this.dataDir, 'atelier-patterns.yaml');
    try {
      const raw = await fs.readFile(patternsPath, 'utf-8');
      return yaml.load(raw);
    } catch {
      return null;
    }
  }

  /**
   * Check the research bank for cached results before running Exa.
   * @param {string} query - Search query
   * @returns {Promise<object|null>} Cached entry or null
   */
  async checkResearchCache(query) {
    return findCached(this.dataDir, query, this.targetName);
  }

  /**
   * Store Exa search results in the research bank.
   * @param {string} query - Search query
   * @param {string} focus - Focus area (code-quality, performance, etc.)
   * @param {object[]} results - Array of { url, title, highlights, relevance }
   * @returns {Promise<string>} Research entry ID
   */
  async storeResearch(query, focus, results) {
    return storeResults(this.dataDir, {
      query,
      target: this.targetName,
      focus,
      results,
    });
  }

  /**
   * Get relevant research from the bank for a specific focus area.
   * @param {string} [focus] - Filter by focus (optional)
   * @returns {Promise<object[]>} Research entries
   */
  async getResearchContext(focus) {
    return queryBank(this.dataDir, {
      target: this.targetName,
      focus,
      maxAge: 30,
    });
  }

  /**
   * Get research bank statistics.
   * @returns {Promise<object>} Bank stats
   */
  async getResearchStats() {
    return getBankStats(this.dataDir);
  }

  /**
   * Generate Exa search queries for the current target's tech stack.
   * Returns queries that should be run, filtered by cache hits.
   * @param {string} [focus] - Optional focus filter
   * @returns {Promise<object[]>} Array of { query, focus, cached: bool }
   */
  async generateResearchQueries(focus) {
    const lensPath = path.join(this.lensesDir, 'external-patterns.yaml');
    let lens;
    try {
      const raw = await fs.readFile(lensPath, 'utf-8');
      lens = yaml.load(raw);
    } catch {
      return [];
    }

    const techStack = lens.tech_stack?.[this.targetName];
    if (!techStack) return [];

    // Derive context-aware substitutions from target config
    const description = this.targetConfig?.description || this.targetName;
    const focusDefaults = {
      architecture: 'modular architecture',
      'ui-ux': 'user experience',
      performance: 'runtime performance',
      'dx-tooling': 'developer tooling',
      'code-quality': 'code maintainability',
    };

    const queries = [];
    for (const template of lens.research_queries || []) {
      if (focus && template.focus !== focus) continue;

      const query = template.query
        .replace(/\{target_tech\}/g, techStack)
        .replace(/\{pattern\}/g, focusDefaults[template.focus] || description)
        .replace(/\{issue\}/g, description);

      const cached = await this.checkResearchCache(query);
      queries.push({
        query,
        focus: template.focus,
        cached: !!cached,
        cached_entry: cached,
      });
    }

    return queries;
  }
}

/**
 * Get the list of available lens IDs (auto-discovered from lenses/ directory).
 * @returns {Promise<string[]>}
 */
export async function getValidLenses() {
  const lensesDir = path.join(ATELIER_ROOT, 'lenses');
  return discoverLenses(lensesDir);
}
