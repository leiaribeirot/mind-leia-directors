import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { extractBlueprint, generateScaffold, compareMaturity } from '../lib/atelier-blueprint.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'blueprint-test-'));
});

/**
 * Helper to create a mock atelier structure.
 */
async function createMockAtelier(basePath, name, options = {}) {
  const atelierPath = path.join(basePath, name);
  await fs.mkdir(atelierPath, { recursive: true });

  if (options.config) {
    await fs.writeFile(path.join(atelierPath, 'config.yaml'), options.config);
  }
  if (options.agents) {
    const agentsDir = path.join(atelierPath, 'agents');
    await fs.mkdir(agentsDir, { recursive: true });
    for (const agent of options.agents) {
      await fs.writeFile(path.join(agentsDir, `${agent}.md`), `# ${agent}`);
    }
  }
  if (options.tasks) {
    const tasksDir = path.join(atelierPath, 'tasks');
    await fs.mkdir(tasksDir, { recursive: true });
    for (const task of options.tasks) {
      await fs.writeFile(path.join(tasksDir, `${task}.md`), `# ${task}`);
    }
  }
  if (options.lib) {
    const libDir = path.join(atelierPath, 'lib');
    await fs.mkdir(libDir, { recursive: true });
    for (const mod of options.lib) {
      await fs.writeFile(path.join(libDir, `${mod}.js`), `// ${mod}`);
    }
  }
  if (options.tests) {
    const testDir = path.join(atelierPath, 'test');
    await fs.mkdir(testDir, { recursive: true });
    for (const test of options.tests) {
      await fs.writeFile(path.join(testDir, `${test}.test.js`), `// ${test} test`);
    }
  }
  if (options.scripts) {
    const scriptsDir = path.join(atelierPath, 'scripts');
    await fs.mkdir(scriptsDir, { recursive: true });
    for (const script of options.scripts) {
      await fs.writeFile(path.join(scriptsDir, `${script}.js`), `// ${script}`);
    }
  }
  if (options.data) {
    const dataDir = path.join(atelierPath, 'data');
    await fs.mkdir(dataDir, { recursive: true });
  }
  if (options.templates) {
    const templatesDir = path.join(atelierPath, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    for (const tmpl of options.templates) {
      await fs.writeFile(path.join(templatesDir, `${tmpl}.html`), `<!-- ${tmpl} -->`);
    }
  }

  return atelierPath;
}

describe('extractBlueprint', () => {
  it('returns correct structure for a full atelier', async () => {
    const atelierPath = await createMockAtelier(tmpDir, 'blog', {
      config: 'name: Blog\nmodels:\n  primary:\n    model: test\ncost:\n  budget: 1\nqa:\n  threshold: 80',
      agents: ['writer', 'editor', 'qa'],
      tasks: ['generate', 'review'],
      lib: ['orchestrator', 'scorer', 'renderer'],
      tests: ['orchestrator', 'scorer'],
      scripts: ['run', 'deploy'],
      data: true,
      templates: ['standard', 'listicle'],
    });

    const blueprint = await extractBlueprint(atelierPath);

    expect(blueprint.name).toBe('blog');
    expect(blueprint.structure.has_config).toBe(true);
    expect(blueprint.structure.has_agents).toBe(true);
    expect(blueprint.structure.agent_count).toBe(3);
    expect(blueprint.structure.agents).toEqual(['editor', 'qa', 'writer']);
    expect(blueprint.structure.has_tasks).toBe(true);
    expect(blueprint.structure.task_count).toBe(2);
    expect(blueprint.structure.has_lib).toBe(true);
    expect(blueprint.structure.lib_count).toBe(3);
    expect(blueprint.structure.has_tests).toBe(true);
    expect(blueprint.structure.test_count).toBe(2);
    expect(blueprint.structure.has_scripts).toBe(true);
    expect(blueprint.structure.has_data).toBe(true);
    expect(blueprint.structure.has_templates).toBe(true);
    expect(blueprint.config_analysis.has_model_routing).toBe(true);
    expect(blueprint.config_analysis.has_cost_control).toBe(true);
    expect(blueprint.config_analysis.has_qa_thresholds).toBe(true);
  });

  it('returns low maturity score for skeleton atelier', async () => {
    const atelierPath = await createMockAtelier(tmpDir, 'skeleton', {
      config: 'name: Skeleton\nversion: 0.1.0',
    });

    const blueprint = await extractBlueprint(atelierPath);

    expect(blueprint.structure.has_config).toBe(true);
    expect(blueprint.structure.has_agents).toBe(false);
    expect(blueprint.structure.has_lib).toBe(false);
    expect(blueprint.structure.has_tests).toBe(false);
    expect(blueprint.maturity_score).toBeLessThan(20);
  });

  it('returns higher maturity for richer atelier', async () => {
    const skelPath = await createMockAtelier(tmpDir, 'skel', {
      config: 'name: Skel',
    });
    const richPath = await createMockAtelier(tmpDir, 'rich', {
      config: 'name: Rich\nmodels:\n  primary:\n    model: test\ncost:\n  budget: 1',
      agents: ['a1', 'a2', 'a3'],
      tasks: ['t1', 't2'],
      lib: ['l1', 'l2'],
      tests: ['l1'],
      scripts: ['run'],
      data: true,
    });

    const skelBlueprint = await extractBlueprint(skelPath);
    const richBlueprint = await extractBlueprint(richPath);

    expect(richBlueprint.maturity_score).toBeGreaterThan(skelBlueprint.maturity_score);
  });
});

describe('generateScaffold', () => {
  it('creates correct directory structure', async () => {
    const result = await generateScaffold('test-atelier', { basePath: tmpDir });

    expect(result.files_created).toContain('test-atelier/config.yaml');

    // Verify directories exist
    const atelierPath = path.join(tmpDir, 'test-atelier');
    const dirs = ['agents', 'tasks', 'lib', 'data', 'scripts', 'test'];
    for (const dir of dirs) {
      const dirPath = path.join(atelierPath, dir);
      const stat = await fs.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    }

    // Verify config.yaml exists and is valid
    const configContent = await fs.readFile(path.join(atelierPath, 'config.yaml'), 'utf-8');
    expect(configContent).toContain('name: Test-atelier');
    expect(configContent).toContain('models:');
    expect(configContent).toContain('cost:');
  });

  it('creates idempotent scaffold (can run twice)', async () => {
    await generateScaffold('idempotent', { basePath: tmpDir });
    const result = await generateScaffold('idempotent', { basePath: tmpDir });

    expect(result.files_created).toContain('idempotent/config.yaml');
  });
});

describe('compareMaturity', () => {
  it('correctly identifies gaps between ateliers', async () => {
    const fullPath = await createMockAtelier(tmpDir, 'full', {
      config: 'name: Full\nmodels:\n  primary:\n    model: test\ncost:\n  budget: 1',
      agents: ['a1', 'a2', 'a3'],
      tests: ['t1', 't2'],
      lib: ['l1', 'l2'],
      data: true,
    });
    const minimalPath = await createMockAtelier(tmpDir, 'minimal', {
      config: 'name: Minimal',
    });

    const comparison = await compareMaturity(fullPath, minimalPath);

    expect(comparison.a_score).toBeGreaterThan(comparison.b_score);
    expect(comparison.gaps.length).toBeGreaterThan(0);

    const agentGap = comparison.gaps.find(g => g.category === 'agents');
    expect(agentGap).toBeTruthy();
    expect(agentGap.in_a).toBe(true);
    expect(agentGap.in_b).toBe(false);
  });

  it('returns no gaps for identical ateliers', async () => {
    const path1 = await createMockAtelier(tmpDir, 'twin-a', {
      config: 'name: Twin A',
      agents: ['a1'],
      tasks: ['t1'],
    });
    const path2 = await createMockAtelier(tmpDir, 'twin-b', {
      config: 'name: Twin B',
      agents: ['a1'],
      tasks: ['t1'],
    });

    const comparison = await compareMaturity(path1, path2);
    // Boolean gaps should be empty since structure is identical
    const booleanGaps = comparison.gaps.filter(g =>
      !g.description.includes('Number of')
    );
    expect(booleanGaps).toHaveLength(0);
  });
});

describe('maturity scoring', () => {
  it('config-only atelier scores around 10', async () => {
    const p = await createMockAtelier(tmpDir, 'config-only', {
      config: 'name: Test',
    });
    const bp = await extractBlueprint(p);
    expect(bp.maturity_score).toBe(10);
  });

  it('full atelier with config depth scores high', async () => {
    const p = await createMockAtelier(tmpDir, 'production', {
      config: 'name: Prod\nmodels:\n  x: y\ncost:\n  budget: 1\nphases:\n  - a\nqa:\n  threshold: 80\nfeatures:\n  flag: true',
      agents: ['a1', 'a2', 'a3', 'a4', 'a5'],
      tasks: ['t1', 't2', 't3'],
      lib: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8'],
      tests: ['l1', 'l2', 'l3'],
      scripts: ['s1', 's2'],
      data: true,
      templates: ['t1', 't2'],
    });
    const bp = await extractBlueprint(p);
    expect(bp.maturity_score).toBeGreaterThan(70);
  });
});
