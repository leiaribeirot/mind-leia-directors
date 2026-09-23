/**
 * Atelier Blueprint — Director Atelier
 *
 * Extracts structural patterns from mature ateliers, generates scaffolds
 * for new ones, and compares maturity between ateliers.
 */

import { readFile, readdir, mkdir, writeFile, access, stat } from 'fs/promises';
import path from 'path';

const ATELIERS_ROOT = 'ateliers';

/**
 * Extract a structural blueprint from an existing atelier.
 * @param {string} atelierPath - Absolute path to the atelier directory
 * @returns {Promise<object>} Blueprint object with structure analysis
 */
export async function extractBlueprint(atelierPath) {
  const name = path.basename(atelierPath);

  const structure = {
    has_config: false,
    has_agents: false, agent_count: 0, agents: [],
    has_tasks: false, task_count: 0, tasks: [],
    has_lib: false, lib_count: 0, modules: [],
    has_templates: false, template_count: 0,
    has_scripts: false, script_count: 0,
    has_tests: false, test_count: 0,
    has_data: false,
    has_lenses: false,
  };

  // Check config.yaml
  structure.has_config = await fileExists(path.join(atelierPath, 'config.yaml'));

  // Check agents/
  const agentsDir = path.join(atelierPath, 'agents');
  if (await dirExists(agentsDir)) {
    structure.has_agents = true;
    const agentFiles = await listFiles(agentsDir, '.md');
    structure.agent_count = agentFiles.length;
    structure.agents = agentFiles.map(f => f.replace('.md', ''));
  }

  // Check tasks/
  const tasksDir = path.join(atelierPath, 'tasks');
  if (await dirExists(tasksDir)) {
    structure.has_tasks = true;
    const taskFiles = await listFiles(tasksDir, '.md');
    structure.task_count = taskFiles.length;
    structure.tasks = taskFiles.map(f => f.replace('.md', ''));
  }

  // Check lib/
  const libDir = path.join(atelierPath, 'lib');
  if (await dirExists(libDir)) {
    structure.has_lib = true;
    const libFiles = await listFiles(libDir, '.js');
    structure.lib_count = libFiles.length;
    structure.modules = libFiles.map(f => f.replace('.js', ''));
  }

  // Check templates/
  const templatesDir = path.join(atelierPath, 'templates');
  if (await dirExists(templatesDir)) {
    structure.has_templates = true;
    const templateFiles = await readdirSafe(templatesDir);
    structure.template_count = templateFiles.length;
  }

  // Check scripts/
  const scriptsDir = path.join(atelierPath, 'scripts');
  if (await dirExists(scriptsDir)) {
    structure.has_scripts = true;
    const scriptFiles = await readdirSafe(scriptsDir);
    structure.script_count = scriptFiles.length;
  }

  // Check test/
  const testDir = path.join(atelierPath, 'test');
  if (await dirExists(testDir)) {
    structure.has_tests = true;
    const testFiles = await listFiles(testDir, '.test.js');
    structure.test_count = testFiles.length;
  }

  // Check data/
  structure.has_data = await dirExists(path.join(atelierPath, 'data'));

  // Check lenses/ (director-specific)
  structure.has_lenses = await dirExists(path.join(atelierPath, 'lenses'));

  // Analyze config if exists
  const configAnalysis = {
    has_model_routing: false,
    has_cost_control: false,
    has_pipeline_phases: false,
    has_qa_thresholds: false,
    has_feature_flags: false,
  };

  if (structure.has_config) {
    try {
      const configContent = await readFile(path.join(atelierPath, 'config.yaml'), 'utf-8');
      configAnalysis.has_model_routing = configContent.includes('models:') || configContent.includes('model:');
      configAnalysis.has_cost_control = configContent.includes('cost:') || configContent.includes('budget');
      configAnalysis.has_pipeline_phases = configContent.includes('phases:') || configContent.includes('pipeline:');
      configAnalysis.has_qa_thresholds = configContent.includes('qa:') || configContent.includes('threshold');
      configAnalysis.has_feature_flags = configContent.includes('features:') || configContent.includes('flags:');
    } catch {
      // Config exists but can't be read/parsed
    }
  }

  // Calculate maturity score (0-100)
  const maturityScore = calculateMaturity(structure, configAnalysis);

  return {
    name,
    path: atelierPath,
    structure,
    config_analysis: configAnalysis,
    maturity_score: maturityScore,
  };
}

/**
 * Generate scaffold directories and starter files for a new atelier.
 * @param {string} atelierName - Name of the new atelier
 * @param {object} [options]
 * @param {string} [options.basePath] - Override base path (default: ateliers/)
 * @returns {Promise<{files_created: string[], structure: object}>}
 */
export async function generateScaffold(atelierName, options = {}) {
  const basePath = options.basePath || ATELIERS_ROOT;
  const atelierPath = path.join(basePath, atelierName);
  const filesCreated = [];

  // Create directory structure
  const dirs = ['agents', 'tasks', 'lib', 'data', 'scripts', 'test'];
  for (const dir of dirs) {
    const dirPath = path.join(atelierPath, dir);
    await mkdir(dirPath, { recursive: true });
  }

  // Create config.yaml
  const configContent = `# ${capitalize(atelierName)} Atelier
# Generated by Director Atelier Blueprint System

name: ${capitalize(atelierName)}
version: 0.1.0
short-title: ${atelierName}
description: >
  ${capitalize(atelierName)} atelier — auto-generated scaffold.
  Customize this configuration to match your pipeline needs.

# Model routing — per-phase
models:
  primary:
    provider: openrouter
    model: anthropic/claude-sonnet-4-20250514
    temperature: 0.3
    max_tokens: 8192

# Cost control
cost:
  per_run:
    budget_usd: 1.00
    hard_stop_usd: 3.00
`;

  await writeFile(path.join(atelierPath, 'config.yaml'), configContent);
  filesCreated.push(`${atelierName}/config.yaml`);

  const structure = {
    directories: dirs.map(d => `${atelierName}/${d}/`),
    config: `${atelierName}/config.yaml`,
  };

  return { files_created: filesCreated, structure };
}

/**
 * Compare maturity between two ateliers.
 * @param {string} atelierPathA - Absolute path to atelier A
 * @param {string} atelierPathB - Absolute path to atelier B
 * @returns {Promise<{gaps: object[], a_score: number, b_score: number}>}
 */
export async function compareMaturity(atelierPathA, atelierPathB) {
  const blueprintA = await extractBlueprint(atelierPathA);
  const blueprintB = await extractBlueprint(atelierPathB);

  const gaps = [];
  const categories = [
    ['config', 'has_config', 'Has config.yaml'],
    ['agents', 'has_agents', 'Has agent definitions'],
    ['tasks', 'has_tasks', 'Has task definitions'],
    ['lib', 'has_lib', 'Has lib modules'],
    ['templates', 'has_templates', 'Has templates'],
    ['scripts', 'has_scripts', 'Has scripts'],
    ['tests', 'has_tests', 'Has test suite'],
    ['data', 'has_data', 'Has data directory'],
    ['model_routing', 'has_model_routing', 'Config has model routing'],
    ['cost_control', 'has_cost_control', 'Config has cost control'],
    ['qa_thresholds', 'has_qa_thresholds', 'Config has QA thresholds'],
  ];

  for (const [category, key, description] of categories) {
    const inA = key.startsWith('has_model') || key.startsWith('has_cost') || key.startsWith('has_qa')
      ? blueprintA.config_analysis[key]
      : blueprintA.structure[key];
    const inB = key.startsWith('has_model') || key.startsWith('has_cost') || key.startsWith('has_qa')
      ? blueprintB.config_analysis[key]
      : blueprintB.structure[key];

    if (inA !== inB) {
      gaps.push({ category, description, in_a: !!inA, in_b: !!inB });
    }
  }

  // Count-based gaps
  const countCategories = [
    ['agent_count', 'agents', 'Number of agents'],
    ['test_count', 'tests', 'Number of test files'],
    ['lib_count', 'lib', 'Number of lib modules'],
  ];

  for (const [key, category, description] of countCategories) {
    const countA = blueprintA.structure[key] || 0;
    const countB = blueprintB.structure[key] || 0;
    if (Math.abs(countA - countB) > 2) {
      gaps.push({
        category,
        description: `${description}: ${blueprintA.name}=${countA}, ${blueprintB.name}=${countB}`,
        in_a: countA > countB,
        in_b: countB > countA,
      });
    }
  }

  return {
    gaps,
    a_score: blueprintA.maturity_score,
    b_score: blueprintB.maturity_score,
  };
}

// --- Internal helpers ---

/**
 * Calculate maturity score from structure and config analysis.
 * Weighted scoring: structure (60%) + config depth (40%)
 */
function calculateMaturity(structure, configAnalysis) {
  let score = 0;

  // Structure components (60 points max)
  if (structure.has_config) score += 10;
  if (structure.has_agents) score += 5 + Math.min(structure.agent_count * 2, 10); // up to 15
  if (structure.has_tasks) score += 3 + Math.min(structure.task_count * 2, 7);     // up to 10
  if (structure.has_lib) score += 3 + Math.min(structure.lib_count * 1.5, 12);     // up to 15
  if (structure.has_tests) score += 5 + Math.min(structure.test_count * 2, 5);     // up to 10
  if (structure.has_scripts) score += 3;
  if (structure.has_templates) score += 3;
  if (structure.has_data) score += 2;

  // Config depth (40 points max)
  if (configAnalysis.has_model_routing) score += 10;
  if (configAnalysis.has_cost_control) score += 8;
  if (configAnalysis.has_pipeline_phases) score += 8;
  if (configAnalysis.has_qa_thresholds) score += 8;
  if (configAnalysis.has_feature_flags) score += 6;

  return Math.min(score, 100);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(dirPath) {
  try {
    const s = await stat(dirPath);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function readdirSafe(dirPath) {
  try {
    return await readdir(dirPath);
  } catch {
    return [];
  }
}

async function listFiles(dirPath, extension) {
  const entries = await readdirSafe(dirPath);
  return entries.filter(f => f.endsWith(extension));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
