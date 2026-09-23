/**
 * Gate integrity tests for the Director's validation runner.
 *
 * These cover the failure the gate is supposed to make impossible: reporting a
 * PASS for a suite that never executed. The runner used to hardcode `npx vitest`
 * and treat a missing runner (ENOENT) as success, so on any checkout without
 * vitest — which includes this repo — a red story could be recorded green.
 *
 * Written against node:test so the gate's own tests need no installed runner.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  detectTestRunner,
  dropExcludedFiles,
  evaluateTestError,
  evaluateTestOutcome,
  parseJsonTestOutput,
  runValidation,
} from '../lib/validation-runner.js';

/**
 * Build a temp target dir with a test/ folder containing the given files.
 * The package.json marks it ESM, matching the repo these suites really run in —
 * without it Node parses the fixtures as CommonJS and every import is a syntax error.
 */
function fixture(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gate-'));
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'gate-fixture', type: 'module' }));
  const testDir = path.join(dir, 'test');
  mkdirSync(testDir);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(testDir, name), content);
  }
  return { dir, testDir };
}

const NODE_TEST_PASSING = `
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('arithmetic still works', () => { assert.equal(1 + 1, 2); });
`;

const NODE_TEST_FAILING = `
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('this one is meant to fail', () => { assert.equal(1 + 1, 3); });
`;

// Only the test check is exercised; lint/typecheck reach for tools this fixture
// has no business running.
const TEST_ONLY = { lint: false, typecheck: false, test: true };

test('detectTestRunner classifies each runner from its imports', async () => {
  const { testDir } = fixture({
    'a.test.js': "import { describe } from 'vitest';\n",
    'b.test.js': "import { test } from 'node:test';\n",
    'c.test.js': "// no runner import, jest is the root default\n",
  });

  const groups = await detectTestRunner(testDir);

  assert.deepEqual([...groups.keys()].sort(), ['jest', 'node', 'vitest']);
  assert.equal(path.basename(groups.get('vitest')[0]), 'a.test.js');
  assert.equal(path.basename(groups.get('node')[0]), 'b.test.js');
  assert.equal(path.basename(groups.get('jest')[0]), 'c.test.js');
});

test('detectTestRunner reads only the import header, not fixture strings', async () => {
  // The shape of this very file: a node:test suite that carries another runner's
  // source as fixture data. Scanning the whole body classified it as vitest, which
  // would hand the file to a runner that cannot execute it.
  const { testDir } = fixture({
    'decoy.test.js': [
      "import { test } from 'node:test';",
      'const FIXTURE = `',
      "import { describe, it, expect } from 'vitest';",
      '`;',
      "const ALSO = \"import { it } from 'vitest';\";",
      'test(\'x\', () => {});',
    ].join('\n'),
  });

  const groups = await detectTestRunner(testDir);

  assert.deepEqual([...groups.keys()], ['node']);
});

test('detectTestRunner ignores non-test files', async () => {
  const { testDir } = fixture({
    'helper.js': "import { test } from 'node:test';\n",
    'real.test.js': "import { test } from 'node:test';\n",
  });

  const groups = await detectTestRunner(testDir);
  assert.equal([...groups.values()].flat().length, 1);
});

test('detectTestRunner returns an empty map for a missing directory', async () => {
  const groups = await detectTestRunner(path.join(tmpdir(), 'does-not-exist-gate'));
  assert.equal(groups.size, 0);
});

test('a passing suite reports pass with a non-zero test count', async () => {
  const { dir } = fixture({ 'ok.test.js': NODE_TEST_PASSING });

  const result = await runValidation(dir, { projectRoot: dir, checks: TEST_ONLY });

  assert.equal(result.test.pass, true);
  assert.equal(result.test.passed, 1);
  assert.ok(result.test.total > 0, 'a green gate must have counted tests');
  assert.equal(result.composite.pass, true);
});

test('a failing suite fails the gate', async () => {
  const { dir } = fixture({ 'bad.test.js': NODE_TEST_FAILING });

  const result = await runValidation(dir, { projectRoot: dir, checks: TEST_ONLY });

  assert.equal(result.test.pass, false);
  assert.equal(result.test.failed, 1);
  assert.equal(result.composite.pass, false);
});

test('a green exit that ran zero tests is not a pass', () => {
  const outcome = evaluateTestOutcome({
    stats: { passed: 0, failed: 0, total: 0 },
    exitCode: 0,
    fileCount: 3,
  });

  assert.equal(outcome.pass, false, 'zero tests executed must not be a pass');
  assert.match(outcome.reason, /0 tests ran/);
});

test('a green exit with real tests is a pass', () => {
  const outcome = evaluateTestOutcome({
    stats: { passed: 4, failed: 0, total: 4 },
    exitCode: 0,
    fileCount: 1,
  });

  assert.equal(outcome.pass, true);
  assert.equal(outcome.reason, undefined);
});

test('a non-zero exit is a fail even when counters look clean', () => {
  const outcome = evaluateTestOutcome({
    stats: { passed: 2, failed: 0, total: 2 },
    exitCode: 1,
    fileCount: 1,
  });

  assert.equal(outcome.pass, false);
  assert.equal(outcome.exitCode, 1);
});

test('a missing runner fails closed — the regression this gate exists for', () => {
  const enoent = Object.assign(new Error('spawn npx ENOENT'), { code: 'ENOENT' });

  const outcome = evaluateTestError({
    error: enoent,
    cmd: 'npx',
    fileCount: 4,
    stats: { passed: 0, failed: 0, total: 0 },
  });

  assert.equal(outcome.pass, false, 'a suite that never ran must never report a pass');
  assert.match(outcome.reason, /not available/);
  assert.match(outcome.reason, /4 test file\(s\) did not run/);
});

test('a timed-out run fails closed', () => {
  const killed = Object.assign(new Error('Process timed out'), { killed: true });

  const outcome = evaluateTestError({ error: killed, cmd: 'node', fileCount: 1, stats: null });

  assert.equal(outcome.pass, false);
  assert.equal(outcome.exitCode, -1);
  assert.match(outcome.reason, /timed out/);
});

test('node:test counters are parsed (the old text fallback read them as zero)', async () => {
  const { dir } = fixture({
    'one.test.js': NODE_TEST_PASSING,
    'two.test.js': NODE_TEST_PASSING,
  });

  const result = await runValidation(dir, { projectRoot: dir, checks: TEST_ONLY });

  assert.equal(result.test.passed, 2);
  assert.equal(result.test.failed, 0);
});

test('one bad group drags the whole gate red, whatever the other one does', async () => {
  // The vitest fixture FAILS on purpose. The earlier version asserted a passing vitest
  // file and relied on vitest being unavailable to make the group red — which is an
  // environment, not a behaviour. It went green locally (no vitest resolvable) and red
  // on CI (vitest installed, fixture passed, nothing dragged the composite down).
  //
  // A failing fixture is red down every path this can take:
  //   vitest absent          -> ENOENT, fails closed
  //   vitest present         -> runs, assertion fails, non-zero exit
  //   vitest present, no cfg -> exits non-zero having run 0 tests, zero-test guard
  // Only the middle one needs a machine with vitest installed, which is CI's job; the
  // other two are what runs here. The missing-runner branch itself is pinned
  // deterministically by the evaluateTestError tests above.
  const { dir } = fixture({
    'native.test.js': NODE_TEST_PASSING,
    'foreign.test.js':
      "import { describe, it, expect } from 'vitest';\n"
      + "describe('x', () => it('y', () => expect(1).toBe(2)));\n",
  });

  const result = await runValidation(dir, { projectRoot: dir, checks: TEST_ONLY });

  assert.equal(result.test.runners.node.pass, true, 'the healthy group still passes');
  assert.equal(result.test.runners.vitest.pass, false);
  assert.equal(result.test.pass, false, 'one red group must fail the whole gate');
  assert.equal(result.composite.pass, false);
});

// ── O portão que media a si mesmo, e não o alvo [2026-08-27] ────────────────
//
// Quatro defeitos empilhados faziam `validate --target desktop` reportar
// `total: 0, exitCode: 1` num pacote com 2570 testes passando. Cada um destes
// testes prende um deles. Os três primeiros são silenciosos por natureza: eles
// produzem um NÚMERO, e um número plausível e errado não levanta suspeita.

test('detectTestRunner desce nos subdiretórios', async () => {
  // `readdir` sem `recursive` lia só o topo. O desktop tem 1 arquivo de teste na
  // raiz de `test/` e 181 abaixo dela: o portão media a primeira pasta e chamava
  // aquilo de suíte.
  const { testDir } = fixture({
    'topo.test.js': "import { test } from 'node:test';\ntest('a', () => {});\n",
  });
  mkdirSync(path.join(testDir, 'fundo', 'mais'), { recursive: true });
  writeFileSync(
    path.join(testDir, 'fundo', 'mais', 'profundo.test.js'),
    "import { test } from 'node:test';\ntest('b', () => {});\n",
  );

  const groups = await detectTestRunner(testDir);
  const all = [...groups.values()].flat().map(f => path.basename(f)).sort();
  assert.deepEqual(all, ['profundo.test.js', 'topo.test.js']);
});

test('detectTestRunner acha o import do vitest declarado ABAIXO dos mocks', async () => {
  // `vi.mock` é hoisted, então um mock nomeado precisa ser declarado acima do
  // próprio import do vitest. O cabeçalho terminava naquele `const` e o arquivo
  // caía no jest, que não sabe executá-lo: ele falhava, e reprovava um alvo são.
  const { testDir } = fixture({
    'hoisted.test.js': [
      'const fooMock = vi.fn()',
      "import { describe, it, vi } from 'vitest'",
      "vi.mock('./x', () => ({ foo: fooMock }))",
      "describe('x', () => {})",
    ].join('\n'),
  });

  const groups = await detectTestRunner(testDir);
  assert.deepEqual([...groups.keys()], ['vitest']);
});

test('parseJsonTestOutput lê a LINHA do JSON, não a primeira chave do texto', async () => {
  // O jest imprime a lista verbosa antes do JSON, e nomes de teste contêm chaves.
  // `indexOf('{')` parava num nome, o parse lançava, e o fallback de texto casava
  // "Test Suites: 25 passed" — 25 testes onde havia 460.
  const saida = [
    '  ✓ aceita a forma documentada {accepted: [...]} (1 ms)',
    '',
    JSON.stringify({ numPassedTests: 460, numFailedTests: 0, numTotalTests: 460, numTotalTestSuites: 25 }),
  ].join('\n');

  const stats = parseJsonTestOutput(saida);
  assert.equal(stats.total, 460);
  assert.equal(stats.passed, 460);
});

test('um runner que não executou diz POR QUÊ, em vez de relatar zero', async () => {
  // O defeito de fundo, e o que teria transformado meia hora em dez segundos: um
  // crash do runner e "rodou e falhou" saíam idênticos, `{pass:false, total:0}`,
  // sem uma palavra. O stderr tinha a resposta e era descartado.
  const outcome = evaluateTestOutcome({
    stats: { passed: 0, failed: 0, total: 0 },
    exitCode: 1,
    fileCount: 182,
    stderr: 'Error: Expected a single value for option "--exclude <glob>", received [...]',
  });

  assert.equal(outcome.pass, false);
  assert.match(outcome.reason, /did not execute/);
  assert.match(outcome.reason, /--exclude/);
  assert.match(outcome.reason, /182 test file/);
});

test('dropExcludedFiles tira do relatório o que veio de uma cópia do repo', async () => {
  const stats = dropExcludedFiles({
    passed: 10,
    failed: 1,
    total: 11,
    files: [
      { name: '/repo/desktop/test/real.test.ts', passed: 7, failed: 0 },
      { name: '/repo/.claude/worktrees/outra/desktop/test/real.test.ts', passed: 3, failed: 1 },
    ],
  });

  assert.equal(stats.total, 7);
  assert.equal(stats.passed, 7);
  assert.equal(stats.failed, 0);
  assert.equal(stats.dropped, 1);
});

test('dropExcludedFiles não inventa corte quando não há caminhos', async () => {
  // Sem `testResults` o filtro precisa ser no-op: cortar às cegas seria pior do
  // que não cortar.
  const stats = dropExcludedFiles({ passed: 5, failed: 0, total: 5 });
  assert.equal(stats.total, 5);
  assert.equal(stats.dropped, 0);
});
