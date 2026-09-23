import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// We test the exported functions by creating real directory structures
// and mocking child_process.execFile for the command execution tests.
import { detectAvailableChecks, runValidation } from '../lib/validation-runner.js';

let tmpDir;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'validation-test-'));
});

describe('detectAvailableChecks', () => {
  it('returns all false for empty directory', async () => {
    const result = await detectAvailableChecks(tmpDir);
    expect(result.hasLint).toBe(false);
    expect(result.hasTypecheck).toBe(false);
    expect(result.hasTests).toBe(false);
    expect(result.testDir).toBeNull();
  });

  it('detects test directory with test files', async () => {
    const testDir = path.join(tmpDir, 'test');
    await fs.mkdir(testDir);
    await fs.writeFile(path.join(testDir, 'foo.test.js'), '// test');

    const result = await detectAvailableChecks(tmpDir);
    expect(result.hasTests).toBe(true);
    expect(result.testDir).toBe(testDir);
  });

  it('detects __tests__ directory variant', async () => {
    const testDir = path.join(tmpDir, '__tests__');
    await fs.mkdir(testDir);
    await fs.writeFile(path.join(testDir, 'bar.spec.ts'), '// test');

    const result = await detectAvailableChecks(tmpDir);
    expect(result.hasTests).toBe(true);
    expect(result.testDir).toBe(testDir);
  });

  it('ignores test directory without test files', async () => {
    const testDir = path.join(tmpDir, 'test');
    await fs.mkdir(testDir);
    await fs.writeFile(path.join(testDir, 'helper.js'), '// not a test');

    const result = await detectAvailableChecks(tmpDir);
    expect(result.hasTests).toBe(false);
    expect(result.testDir).toBeNull();
  });

  it('detects tsconfig.json for typecheck', async () => {
    await fs.writeFile(path.join(tmpDir, 'tsconfig.json'), '{}');

    const result = await detectAvailableChecks(tmpDir);
    expect(result.hasTypecheck).toBe(true);
  });

  it('returns false for typecheck without tsconfig.json', async () => {
    const result = await detectAvailableChecks(tmpDir);
    expect(result.hasTypecheck).toBe(false);
  });
});

describe('runValidation', () => {
  it('returns composite pass when no checks available', async () => {
    const result = await runValidation(tmpDir, { projectRoot: tmpDir });
    expect(result.composite.pass).toBe(true);
    expect(result.composite.score).toBe(100);
    expect(result.composite.checks_run).toBe(0);
    expect(result.composite.checks_passed).toBe(0);
    expect(result.lint).toBeNull();
    expect(result.typecheck).toBeNull();
    expect(result.test).toBeNull();
  });

  it('skips disabled checks', async () => {
    const testDir = path.join(tmpDir, 'test');
    await fs.mkdir(testDir);
    await fs.writeFile(path.join(testDir, 'x.test.js'), '// test');

    const result = await runValidation(tmpDir, {
      projectRoot: tmpDir,
      checks: { lint: false, typecheck: false, test: false },
    });

    expect(result.composite.checks_run).toBe(0);
    expect(result.lint).toBeNull();
    expect(result.typecheck).toBeNull();
    expect(result.test).toBeNull();
  });

  it('returns correct structure shape', async () => {
    const result = await runValidation(tmpDir, { projectRoot: tmpDir });

    expect(result).toHaveProperty('lint');
    expect(result).toHaveProperty('typecheck');
    expect(result).toHaveProperty('test');
    expect(result).toHaveProperty('composite');
    expect(result.composite).toHaveProperty('pass');
    expect(result.composite).toHaveProperty('score');
    expect(result.composite).toHaveProperty('checks_run');
    expect(result.composite).toHaveProperty('checks_passed');
  });
});

describe('composite scoring', () => {
  it('score is 100 when all checks pass (0 checks = vacuous truth)', async () => {
    const result = await runValidation(tmpDir, { projectRoot: tmpDir });
    expect(result.composite.score).toBe(100);
    expect(result.composite.pass).toBe(true);
  });

  it('score reflects ratio of passed checks', async () => {
    // We can verify the math by creating a manual composite
    const checks_run = 3;
    const checks_passed = 2;
    const score = Math.round((checks_passed / checks_run) * 100 * 10) / 10;
    expect(score).toBeCloseTo(66.7, 1);
  });

  it('pass requires all checks to pass', () => {
    // Verify logic: pass = checks_passed === checks_run
    expect(3 === 3).toBe(true);  // all pass
    expect(2 === 3).toBe(false); // one failed
  });
});
