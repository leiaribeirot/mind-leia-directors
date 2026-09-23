/**
 * Target Resolver — Director Atelier
 *
 * Resolves scan target configurations and discovers files
 * matching the target's include/exclude patterns.
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

const TARGETS_FILE = 'targets.yaml';

/**
 * Load targets configuration from targets.yaml.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @returns {Promise<object>} Targets map { targetName: targetConfig }
 */
export async function loadTargets(dataDir) {
  const filePath = path.join(dataDir, TARGETS_FILE);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = yaml.load(raw);
  return parsed.targets || {};
}

/**
 * Get a single target configuration by name.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {string} targetName - Target key (e.g., 'videodrome')
 * @returns {Promise<object|null>} Target config or null
 */
export async function getTarget(dataDir, targetName) {
  const targets = await loadTargets(dataDir);
  return targets[targetName] || null;
}

/**
 * Resolve a target's path to an absolute filesystem path.
 * @param {string} projectRoot - Absolute path to project root
 * @param {object} target - Target config object
 * @returns {string} Absolute path
 */
export function resolveTargetPath(projectRoot, target) {
  return path.resolve(projectRoot, target.path);
}

/**
 * Discover files in a target directory matching scan config patterns.
 * @param {string} targetPath - Absolute path to target directory
 * @param {object} scanConfig - Scan config from config.yaml
 * @param {object} [targetConfig] - Target-specific config (for exclude_paths)
 * @returns {Promise<string[]>} Array of absolute file paths
 */
export async function discoverFiles(targetPath, scanConfig, targetConfig = {}) {
  const includePatterns = scanConfig.include_patterns || ['**/*'];
  const excludePatterns = scanConfig.exclude_patterns || [];

  // Add target-specific exclusions
  const targetExcludes = (targetConfig.exclude_paths || []).map(p => `**/${p}/**`);
  const allExcludes = [...excludePatterns, ...targetExcludes];

  const maxFileSize = (scanConfig.max_file_size_kb || 100) * 1024;
  const maxFiles = scanConfig.max_files_per_lens || 50;

  let allFiles = [];

  // Convert exclude patterns to regex matchers
  const excludeMatchers = allExcludes.map(ex => {
    let regex = ex
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex chars except * and ?
      .replace(/\*\*/g, '<<<GLOBSTAR>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<<GLOBSTAR>>>/g, '.*');
    // Anchor: ^pattern$ but allow leading ** to match from start
    regex = '^' + regex + '$';
    // Leading .*/ should also match from the start of string (e.g., **/node_modules/** matches node_modules/foo)
    regex = regex.replace(/^\^\.\*\//, '^(.*/)?');
    return new RegExp(regex);
  });

  function isExcluded(relativePath) {
    return excludeMatchers.some(re => re.test(relativePath));
  }

  for (const pattern of includePatterns) {
    for await (const entry of fs.glob(pattern, { cwd: targetPath })) {
      if (!isExcluded(entry)) {
        allFiles.push(path.resolve(targetPath, entry));
      }
    }
  }

  // Deduplicate
  allFiles = [...new Set(allFiles)];

  // Filter by file size
  const sizedFiles = [];
  for (const filePath of allFiles) {
    try {
      const stat = await fs.stat(filePath);
      if (stat.size <= maxFileSize) {
        sizedFiles.push({ path: filePath, size: stat.size });
      }
    } catch {
      // Skip inaccessible files
    }
  }

  // Sort by size (smaller first — more likely to be meaningful code)
  sizedFiles.sort((a, b) => a.size - b.size);

  // Limit to max files
  return sizedFiles.slice(0, maxFiles).map(f => f.path);
}

/**
 * List all registered target names.
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @returns {Promise<string[]>} Array of target names
 */
export async function listTargetNames(dataDir) {
  const targets = await loadTargets(dataDir);
  return Object.keys(targets);
}

/**
 * Get target summary with file count.
 * @param {string} projectRoot - Absolute path to project root
 * @param {string} dataDir - Absolute path to ateliers/director/data
 * @param {string} targetName - Target key
 * @param {object} scanConfig - Scan config from config.yaml
 * @returns {Promise<object>} Target summary
 */
export async function getTargetSummary(projectRoot, dataDir, targetName, scanConfig) {
  const target = await getTarget(dataDir, targetName);
  if (!target) return null;

  const targetPath = resolveTargetPath(projectRoot, target);
  let fileCount = 0;

  try {
    const files = await discoverFiles(targetPath, scanConfig, target);
    fileCount = files.length;
  } catch {
    fileCount = -1; // Error discovering
  }

  return {
    name: targetName,
    path: target.path,
    description: target.description,
    lenses: target.lenses,
    priority_boost: target.priority_boost,
    file_count: fileCount,
  };
}
