/**
 * Validation Runner — Director Atelier
 *
 * Post-execution validation pipeline: lint, typecheck, test.
 * Runs structured checks and returns composite pass/fail with details.
 */

import { execFile } from 'child_process';
import { accessSync } from 'fs';
import { access, readdir, readFile } from 'fs/promises';
import path from 'path';

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Test runners this monorepo actually uses, keyed by the import that identifies them.
 * Jest at the root, node:test in the Director's own spine tests, vitest in the blog
 * atelier. The runner used to be hardcoded to vitest, which is wrong two ways: vitest
 * is not a dependency of this repo, and pointed at a node:test file it reports "no test
 * suite found". Both paths ended in a gate that had run nothing and said PASS.
 */
/**
 * Directories that hold copies of real source: agent worktrees, deploy staging,
 * the desktop project templates. Vitest and Jest both treat positional paths as
 * substring filters, so an unfiltered run picks up every stale duplicate of the
 * file you asked for — double-counting results and failing a target on code that
 * is not the target.
 */
const DUPLICATE_SOURCE_GLOBS = [
  '**/node_modules/**',
  '**/.claude/**',
  '**/.railway-deploy/**',
  '**/desktop/project-templates/**',
  '**/output/**',
];

const TEST_RUNNERS = {
  vitest: {
    cmd: 'npx',
    // SEM `--exclude`, e isso é medido, não preferência. Vitest 1.x define a opção
    // como valor único: repetir a flag faz o parser dele LANÇAR antes de rodar
    // teste nenhum ("Expected a single value for option --exclude"). Era o que
    // acontecia com o desktop, o maior pacote do repo — 2629 testes passando na
    // mão e `total: 0, exitCode: 1` aqui, para toda story.
    //
    // A forma óbvia de consertar é pior que o defeito: juntar os globs numa
    // string separada por vírgula PARSEIA e NÃO EXCLUI (conferido em 27/08 com
    // uma duplicata plantada sob `test/output/`, que continuou rodando). O portão
    // voltaria ao verde com a exclusão morta, que é a falha que ele existe para
    // impedir.
    //
    // Então a exclusão saiu da linha de comando e foi para `dropExcludedFiles`,
    // que decide sobre os CAMINHOS que o relatório já traz. Uma implementação, em
    // vez de um dialeto por runner que muda de versão em versão sem avisar.
    args: (files) => ['vitest', 'run', ...files, '--reporter', 'json'],
    parse: parseJsonTestOutput,
  },
  jest: {
    cmd: 'npx',
    // `--runTestsByPath`: os argumentos posicionais do jest são REGEX, não
    // caminhos. Com 14 arquivos ele ainda casava; com 15 o padrão combinado
    // devolvia "0 matches" e a suíte inteira sumia (medido em 27/08, na raiz
    // deste repo). O jest tem a flag exatamente para dizer "isto é caminho, não
    // padrão", e ela também torna os ignore-patterns desnecessários: um caminho
    // literal que a coleta já filtrou não precisa ser filtrado de novo.
    args: (files) => ['jest', '--json', '--runTestsByPath', ...files],
    // package.json runs jest through this flag; ESM suites fail to load without it.
    env: { NODE_OPTIONS: '--experimental-vm-modules' },
    parse: parseJsonTestOutput,
  },
  node: {
    cmd: 'node',
    args: (files) => ['--test', ...files],
    // A nested `node --test` that inherits NODE_TEST_CONTEXT switches to the
    // V8-serialized child reporter, so the TAP counters never reach stdout and
    // the run parses as zero tests. Strip it: the gate must run standalone.
    env: { NODE_TEST_CONTEXT: undefined },
    parse: parseNodeTestOutput,
  },
};

const TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]s$/;

// First line that starts real code. Everything above it is the import header —
// the only region worth reading to identify a runner. Scanning the whole body
// misreads any suite that carries another runner's source as fixture data, which
// is exactly what this file's own tests do.
const BODY_START_RE = /^\s*(?:const|let|var|function|class|export|async|await|test|it|describe|suite|beforeEach|afterEach)\b/m;

/**
 * Detect which checks are available for a given target path.
 * @param {string} targetPath - Absolute path to the target directory
 * @returns {Promise<{hasLint: boolean, hasTypecheck: boolean, hasTests: boolean, testDir: string|null}>}
 */
export async function detectAvailableChecks(targetPath) {
  const result = { hasLint: false, hasTypecheck: false, hasTests: false, testDir: null };

  // Lint: check if eslint config exists somewhere up the tree or node_modules has eslint
  try {
    await access(path.join(targetPath, 'node_modules', '.package-lock.json'));
    result.hasLint = true;
  } catch {
    // Check project root for node_modules
    try {
      const projectRoot = findProjectRoot(targetPath);
      await access(path.join(projectRoot, 'node_modules', 'eslint'));
      result.hasLint = true;
    } catch {
      result.hasLint = false;
    }
  }

  // Typecheck: look for tsconfig.json at target or up the tree
  try {
    const tsconfig = await findFileUp(targetPath, 'tsconfig.json');
    result.hasTypecheck = !!tsconfig;
  } catch {
    result.hasTypecheck = false;
  }

  // Tests: look for test/ directory within the target
  const testDirCandidates = ['test', 'tests', '__tests__'];
  for (const candidate of testDirCandidates) {
    const testPath = path.join(targetPath, candidate);
    try {
      const entries = await readdir(testPath);
      const hasTestFiles = entries.some(e =>
        e.endsWith('.test.js') || e.endsWith('.test.ts') ||
        e.endsWith('.spec.js') || e.endsWith('.spec.ts')
      );
      if (hasTestFiles) {
        result.hasTests = true;
        result.testDir = testPath;
        break;
      }
    } catch {
      // Directory doesn't exist, try next
    }
  }

  return result;
}

/**
 * Run post-execution validation on a target path.
 * @param {string} targetPath - Absolute path to the target directory
 * @param {object} [options]
 * @param {number} [options.timeout] - Per-check timeout in ms (default: 30000)
 * @param {object} [options.checks] - Which checks to run { lint, typecheck, test }
 * @param {string} [options.projectRoot] - Override project root detection
 * @returns {Promise<{lint: object, typecheck: object, test: object, composite: object}>}
 */
export async function runValidation(targetPath, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT_MS;
  const checksConfig = options.checks || { lint: true, typecheck: true, test: true };
  const projectRoot = options.projectRoot || findProjectRoot(targetPath);

  const available = await detectAvailableChecks(targetPath);

  const results = {
    lint: null,
    typecheck: null,
    test: null,
    composite: { pass: true, score: 100, checks_run: 0, checks_passed: 0 },
  };

  // Lint
  if (checksConfig.lint && available.hasLint) {
    results.lint = await runLint(targetPath, projectRoot, timeout);
    results.composite.checks_run++;
    if (results.lint.pass) results.composite.checks_passed++;
  }

  // Typecheck
  if (checksConfig.typecheck && available.hasTypecheck) {
    results.typecheck = await runTypecheck(projectRoot, timeout);
    results.composite.checks_run++;
    if (results.typecheck.pass) results.composite.checks_passed++;
  }

  // Test
  if (checksConfig.test && available.hasTests) {
    results.test = await runTests(available.testDir, projectRoot, timeout);
    results.composite.checks_run++;
    if (results.test.pass) results.composite.checks_passed++;
  }

  // Composite score
  if (results.composite.checks_run > 0) {
    results.composite.score = Math.round(
      (results.composite.checks_passed / results.composite.checks_run) * 100 * 10
    ) / 10;
    results.composite.pass = results.composite.checks_passed === results.composite.checks_run;
  }

  return results;
}

/**
 * Run ESLint on the target path.
 * @param {string} targetPath
 * @param {string} projectRoot
 * @param {number} timeout
 * @returns {Promise<{pass: boolean, issues: string[], exitCode: number}>}
 */
async function runLint(targetPath, projectRoot, timeout) {
  try {
    const { stdout, exitCode } = await execCommand(
      'npx',
      ['eslint', targetPath, '--format', 'json', '--no-error-on-unmatched-pattern'],
      { cwd: projectRoot, timeout }
    );

    if (exitCode === 0) {
      return { pass: true, issues: [], exitCode: 0 };
    }

    const issues = parseLintOutput(stdout);
    return { pass: false, issues, exitCode };
  } catch (error) {
    if (error.killed) {
      return { pass: false, issues: ['Lint check timed out'], exitCode: -1 };
    }
    if (error.code === 'ENOENT') {
      return { pass: true, issues: ['eslint not found — skipped'], exitCode: 0 };
    }
    return { pass: false, issues: [error.message], exitCode: error.exitCode || 1 };
  }
}

/**
 * Run TypeScript type checking.
 * @param {string} projectRoot
 * @param {number} timeout
 * @returns {Promise<{pass: boolean, issues: string[], exitCode: number}>}
 */
async function runTypecheck(projectRoot, timeout) {
  try {
    const { stdout, stderr, exitCode } = await execCommand(
      'npx',
      ['tsc', '--noEmit', '--pretty', 'false'],
      { cwd: projectRoot, timeout }
    );

    if (exitCode === 0) {
      return { pass: true, issues: [], exitCode: 0 };
    }

    const output = (stdout || '') + (stderr || '');
    const issues = output
      .split('\n')
      .filter(line => line.includes('error TS'))
      .slice(0, 20);

    return { pass: false, issues, exitCode };
  } catch (error) {
    if (error.killed) {
      return { pass: false, issues: ['Typecheck timed out'], exitCode: -1 };
    }
    if (error.code === 'ENOENT') {
      return { pass: true, issues: ['tsc not found — skipped'], exitCode: 0 };
    }
    return { pass: false, issues: [error.message], exitCode: error.exitCode || 1 };
  }
}

/**
 * Este arquivo declara `runner` como seu framework de teste?
 *
 * O cabeçalho continua sendo a primeira pergunta, e a razão dele segue válida:
 * varrer o corpo inteiro confunde uma suíte que carrega o código de OUTRO runner
 * como dado de fixture, que é exatamente o que os testes deste arquivo fazem.
 *
 * Mas o cabeçalho sozinho erra num padrão comum e legítimo: `vi.mock` é hoisted,
 * então quem precisa de um mock nomeado declara `const fooMock = vi.fn()` ACIMA
 * do próprio import do vitest. `BODY_START_RE` para nesse `const`, o cabeçalho
 * termina antes do import, e o arquivo cai no jest por engano. Dois arquivos do
 * desktop estavam nessa situação, e o efeito era o pior possível: rodavam no
 * runner errado, falhavam por isso, e reprovavam um alvo saudável.
 *
 * O fallback varre o arquivo inteiro, mas ignora tudo que está DENTRO de uma
 * crase. É o que separa os dois casos: o import de verdade do arquivo de mock
 * está em código, e o import do engodo está dentro de um template literal.
 * Um `const X = "import ... from 'vitest'"` numa linha só já não passava, porque
 * a linha precisa COMEÇAR com `import`.
 */
function declaresRunner(source, header, runner) {
  const from = new RegExp(`from\\s+['"]${runner}['"]`);
  if (from.test(header)) return true;
  if (runner === 'vitest' && /^\s*\/\/\s*@vitest-environment\b/m.test(source)) return true;

  const importLine = new RegExp(`^\\s*import[^\\n]*from\\s+['"]${runner}['"]`);
  return codeLinesOf(source).some(line => importLine.test(line));
}

/**
 * As linhas do arquivo que são CÓDIGO, e não conteúdo de um template literal.
 *
 * Conta crases não escapadas para saber onde um template abre e fecha. É uma
 * aproximação — uma crase dentro de um comentário confunde a contagem — mas
 * responde exatamente a pergunta que importa aqui, e o teste do engodo em
 * `validation-runner-gate.test.js` é quem a mantém honesta.
 */
function codeLinesOf(source) {
  const out = [];
  let inTemplate = false;
  for (const line of String(source).split('\n')) {
    if (!inTemplate) out.push(line);
    const ticks = (line.match(/(?<!\\)`/g) || []).length;
    if (ticks % 2 === 1) inTemplate = !inTemplate;
  }
  return out;
}

export async function detectTestRunner(testDir) {
  const groups = new Map();

  let entries;
  try {
    // RECURSIVO, e isso é a diferença entre medir a suíte e medir a sua primeira
    // pasta. Sem `recursive`, `desktop/test/` devolvia os poucos arquivos do topo
    // e ignorava os 188 de `test/renderer/**`: o portão relatava 6 testes onde há
    // 2629, e um alvo podia ficar verde com a suíte inteira sem rodar.
    entries = await readdir(testDir, { recursive: true });
  } catch {
    return groups;
  }

  for (const entry of entries.filter(e => TEST_FILE_RE.test(e))) {
    const file = path.join(testDir, entry);
    // A varredura não desce numa cópia do repo. Filtrar depois também funcionaria,
    // mas ler milhares de arquivos de um worktree vizinho para descartá-los é
    // trabalho que não precisa acontecer.
    if (isFromDuplicateSource(file)) continue;
    let source = '';
    try {
      source = await readFile(file, 'utf-8');
    } catch {
      // Unreadable test file: classify as jest so it still gets attempted and
      // reported, rather than silently dropping out of the run.
    }

    const bodyStart = source.search(BODY_START_RE);
    const header = bodyStart === -1 ? source : source.slice(0, bodyStart);

    let runner = 'jest';
    if (declaresRunner(source, header, 'vitest')) runner = 'vitest';
    else if (declaresRunner(source, header, 'node:test')) runner = 'node';

    if (!groups.has(runner)) groups.set(runner, []);
    groups.get(runner).push(file);
  }

  return groups;
}

/**
 * Run every test file in the directory, each under its own runner.
 *
 * Fails closed: once test files have been detected, any outcome other than a
 * runner reporting success is a red gate. A missing runner is the loudest case —
 * it means the suite did not execute, which is the opposite of passing.
 *
 * @param {string} testDir
 * @param {string} projectRoot
 * @param {number} timeout
 * @returns {Promise<{pass: boolean, passed: number, failed: number, total: number, exitCode: number, runners: object, reason?: string}>}
 */
async function runTests(testDir, projectRoot, timeout) {
  const groups = await detectTestRunner(testDir);

  if (groups.size === 0) {
    return {
      pass: false,
      passed: 0,
      failed: 0,
      total: 0,
      exitCode: 1,
      runners: {},
      reason: `Test files were detected in ${testDir} but none could be read back — refusing to report a pass for a suite that did not run.`,
    };
  }

  const aggregate = { pass: true, passed: 0, failed: 0, total: 0, exitCode: 0, runners: {} };

  for (const [name, files] of groups) {
    const outcome = await runTestGroup(TEST_RUNNERS[name], files, projectRoot, timeout);
    aggregate.runners[name] = outcome;
    aggregate.passed += outcome.passed;
    aggregate.failed += outcome.failed;
    aggregate.total += outcome.total;
    if (!outcome.pass) {
      aggregate.pass = false;
      aggregate.exitCode = outcome.exitCode || 1;
      if (outcome.reason) {
        aggregate.reason = aggregate.reason ? `${aggregate.reason}; ${outcome.reason}` : outcome.reason;
      }
    }
  }

  return aggregate;
}

/**
 * A primeira linha do stderr que explica por que o runner não rodou.
 *
 * Pula as linhas de moldura (caminho do arquivo, `^^^`, o rastro de pilha) e fica
 * com a que um humano leria. Sem nada aproveitável, diz o fato cru — que ainda é
 * mais do que o silêncio de antes.
 */
function runnerCrashReason(stderr, fileCount) {
  const line = String(stderr)
    .split('\n')
    .map(l => l.trim())
    .find(l => /^(Error|TypeError|SyntaxError|RangeError|CACError)\b/.test(l) || /^error\b/i.test(l));
  const base = `runner did not execute: ${fileCount} test file(s) requested, 0 tests reported`;
  return line ? `${base} — ${line}` : base;
}

/**
 * The gate's pass/fail policy, isolated from process spawning so it can be pinned
 * directly. Two ways to be red: a non-zero exit, or a green exit that counted no
 * tests — the second is how "no test suite found" used to read as success.
 *
 * Caveat this does NOT cover: `node --test` on a file that registers no tests
 * reports the file itself as one passing test, so an empty node:test suite is
 * indistinguishable from a real one at the counter level. The zero-test guard
 * bites for jest and vitest, which report honestly.
 *
 * @param {{stats: {passed: number, failed: number, total: number}, exitCode: number, fileCount: number}} input
 * @returns {{pass: boolean, passed: number, failed: number, total: number, exitCode: number, reason?: string}}
 */
export function evaluateTestOutcome({ stats, exitCode, fileCount, stderr = '' }) {
  if (exitCode !== 0) {
    // Saiu diferente de zero E não relatou teste nenhum: o runner NÃO RODOU. Isso
    // é diferente de "rodou e falhou", e a diferença estava se perdendo — os dois
    // saíam como `{pass:false, total:0, exitCode:1}`, sem uma palavra.
    //
    // Foi assim que o desktop ficou com o portão morto sem ninguém notar: o vitest
    // 1.x lançava no parser de argumentos ("Expected a single value for option
    // --exclude"), e o relatório dizia apenas zero. A mensagem estava no stderr o
    // tempo todo, e era descartada. Carregá-la é o que transforma meia hora de
    // investigação em dez segundos de leitura.
    if (stats.total === 0) {
      return {
        pass: false,
        ...stats,
        exitCode,
        reason: runnerCrashReason(stderr, fileCount),
      };
    }
    return { pass: false, ...stats, exitCode };
  }

  if (stats.total === 0) {
    return {
      pass: false,
      ...stats,
      exitCode: 1,
      reason: `${fileCount} test file(s) matched but 0 tests ran`,
    };
  }

  return { pass: true, ...stats, exitCode: 0 };
}

/**
 * The gate's policy for a run that never produced a result, isolated from process
 * spawning so the missing-runner case can be pinned without uninstalling anything.
 *
 * A missing runner is the case this gate exists for: the suite did not execute, and
 * "did not execute" is the opposite of passing. It used to return pass, which is how
 * a checkout without vitest recorded red stories as green.
 *
 * @param {{error: Error & {killed?: boolean, code?: string, exitCode?: number}, cmd: string, fileCount: number, stats: {passed: number, failed: number, total: number}}} input
 * @returns {{pass: boolean, passed: number, failed: number, total: number, exitCode: number, reason?: string}}
 */
export function evaluateTestError({ error, cmd, fileCount, stats }) {
  const empty = { passed: 0, failed: 0, total: 0 };

  if (error.killed) {
    return { pass: false, ...empty, exitCode: -1, reason: 'Test run timed out' };
  }

  if (error.code === 'ENOENT') {
    return {
      pass: false,
      ...empty,
      exitCode: 1,
      reason: `Runner '${cmd}' not available — ${fileCount} test file(s) did not run`,
    };
  }

  return { pass: false, ...(stats || empty), exitCode: error.exitCode || 1, reason: error.message };
}

/**
 * Run one runner over its share of the test files.
 * @param {object} runner - entry from TEST_RUNNERS
 * @param {string[]} files
 * @param {string} projectRoot
 * @param {number} timeout
 */
async function runTestGroup(runner, files, projectRoot, timeout) {
  try {
    const { stdout, stderr, exitCode } = await execCommand(
      runner.cmd,
      runner.args(files),
      { cwd: projectRoot, timeout, env: runner.env }
    );

    const raw = runner.parse((stdout || '') + (stderr || ''));
    const stats = dropExcludedFiles(raw);
    if (stats.dropped > 0) {
      // Dito em voz alta: um corte silencioso aqui é indistinguível de um alvo
      // que simplesmente tem menos teste do que se pensava.
      console.warn(`[validate] ${stats.dropped} arquivo(s) de teste ignorado(s) por virem de uma cópia do repo, não do alvo`);
    }
    return evaluateTestOutcome({ stats, exitCode, fileCount: files.length, stderr: stderr || '' });
  } catch (error) {
    return evaluateTestError({
      error,
      cmd: runner.cmd,
      fileCount: files.length,
      stats: runner.parse(error.stdout || ''),
    });
  }
}

/**
 * Execute a command and return structured result.
 * @param {string} cmd
 * @param {string[]} args
 * @param {object} options
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function execCommand(cmd, args, options = {}) {
  const env = { ...process.env, FORCE_COLOR: '0', ...(options.env || {}) };
  // An explicit `undefined` in options.env means "unset this for the child".
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key];
  }

  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, {
      cwd: options.cwd,
      timeout: options.timeout || DEFAULT_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024, // 10MB
      env,
    }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject({ killed: true, message: 'Process timed out', exitCode: -1 });
          return;
        }
        // Non-zero exit code (lint/test failures) — still return output
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error.code === 'ENOENT' ? -1 : (error.status || 1),
        });
        return;
      }
      resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: 0 });
    });
  });
}

/**
 * Parse ESLint JSON output into issue strings.
 * @param {string} output
 * @returns {string[]}
 */
function parseLintOutput(output) {
  try {
    const results = JSON.parse(output);
    const issues = [];
    for (const file of results) {
      for (const msg of file.messages || []) {
        if (msg.severity >= 2) {
          issues.push(`${file.filePath}:${msg.line}:${msg.column} ${msg.message} (${msg.ruleId})`);
        }
      }
    }
    return issues.slice(0, 50);
  } catch {
    return output ? [output.slice(0, 500)] : [];
  }
}

/**
 * Tira do relatório os arquivos que vieram de uma cópia do repo, e não do alvo.
 *
 * Os argumentos posicionais do vitest e do jest são filtros de SUBSTRING, não
 * caminhos exatos: pedir `rooms.test.ts` casa com toda cópia estagnada desse
 * arquivo que exista na árvore, e este repo carrega várias — um checkout inteiro
 * por worktree em `.claude/worktrees/`, uma cópia de deploy em `.railway-deploy/`,
 * e os templates vendorizados em `desktop/project-templates/`. Contar essas
 * cópias infla o número e pode reprovar um alvo por código que não é dele.
 *
 * Isto vive AQUI, e não na linha de comando, porque cada runner soletra exclusão
 * de um jeito e muda de versão sem avisar: o vitest 1.x recusa `--exclude`
 * repetido e ignora a forma com vírgula, silenciosamente. Um caminho é um
 * caminho em qualquer runner.
 *
 * @param {{passed:number, failed:number, total:number, files?: Array<{name:string,passed:number,failed:number}>}} stats
 * @returns {{passed:number, failed:number, total:number, dropped:number}}
 */
export function dropExcludedFiles(stats) {
  const files = stats.files;
  // Sem caminhos não há o que decidir, e inventar um corte aqui seria pior do que
  // não cortar: os números passam como vieram.
  if (!Array.isArray(files) || files.length === 0) {
    return { passed: stats.passed, failed: stats.failed, total: stats.total, dropped: 0 };
  }

  const excluded = files.filter(f => isFromDuplicateSource(f.name));
  if (excluded.length === 0) {
    return { passed: stats.passed, failed: stats.failed, total: stats.total, dropped: 0 };
  }

  const lostPassed = excluded.reduce((n, f) => n + f.passed, 0);
  const lostFailed = excluded.reduce((n, f) => n + f.failed, 0);
  return {
    passed: Math.max(0, stats.passed - lostPassed),
    failed: Math.max(0, stats.failed - lostFailed),
    total: Math.max(0, stats.total - lostPassed - lostFailed),
    dropped: excluded.length,
  };
}

/** Um caminho de teste que pertence a uma cópia do repo, e não ao alvo. */
function isFromDuplicateSource(filePath) {
  const p = String(filePath).split(path.sep).join('/');
  return DUPLICATE_SOURCE_GLOBS.some(glob => {
    // Os globs deste arquivo são todos da forma `**/<segmento>/**`, então a
    // pergunta que eles fazem é "este segmento aparece no caminho?". Um matcher
    // de glob completo aqui seria uma dependência a mais para responder isso.
    const middle = glob.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
    return p.includes(`/${middle}/`) || p.startsWith(`${middle}/`);
  });
}

/**
 * Parse Vitest JSON output into test stats.
 * @param {string} output
 * @returns {{passed: number, failed: number, total: number}}
 */
export function parseJsonTestOutput(output) {
  try {
    // A LINHA que começa com `{`, e não a primeira chave do texto. O jest imprime
    // a lista verbosa dos testes antes do JSON, e nomes de teste contêm chaves:
    // um deste repo é "accepts both the bare-array and the documented
    // {accepted: [...]} shape". `indexOf('{')` parava ali, o `JSON.parse` lançava,
    // e o fallback de texto casava "Test Suites: 25 passed" — reportando 25 testes
    // onde havia 460. Um número plausível e errado é pior que um erro.
    const jsonLine = output
      .split('\n')
      .reverse()
      .find(line => line.startsWith('{') && line.trimEnd().endsWith('}'));
    if (!jsonLine) return { passed: 0, failed: 0, total: 0 };

    const json = JSON.parse(jsonLine);
    // Os CAMINHOS vêm junto: é sobre eles que `dropExcludedFiles` decide, e sem
    // eles a exclusão teria de voltar a ser um dialeto de linha de comando por
    // runner. Ausentes num relatório sem `testResults`, o filtro vira no-op e os
    // números passam intactos, que é o comportamento seguro.
    const files = Array.isArray(json.testResults)
      ? json.testResults.map(r => ({
          name: r.name || '',
          passed: (r.assertionResults || []).filter(a => a.status === 'passed').length,
          failed: (r.assertionResults || []).filter(a => a.status === 'failed').length,
        }))
      : [];
    const passed = json.numPassedTests || 0;
    const failed = json.numFailedTests || 0;
    const total = json.numTotalTests || 0;
    return { passed, failed, total, files };
  } catch {
    // Fallback: try to extract from text output ("Tests: 6 passed")
    const passMatch = output.match(/(\d+)\s+pass/i);
    const failMatch = output.match(/(\d+)\s+fail/i);
    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
    return { passed, failed, total: passed + failed };
  }
}

/**
 * Parse `node --test` TAP summary counters.
 * The counter follows the label here ("# pass 6"), which is why the JSON
 * parser's text fallback reads every node:test run as zero tests.
 * @param {string} output
 * @returns {{passed: number, failed: number, total: number}}
 */
function parseNodeTestOutput(output) {
  const read = (label) => {
    const match = output.match(new RegExp(`^#\\s+${label}\\s+(\\d+)`, 'm'));
    return match ? parseInt(match[1], 10) : 0;
  };

  const passed = read('pass');
  const failed = read('fail');
  const total = read('tests') || passed + failed;
  return { passed, failed, total };
}

/**
 * Find a file by traversing up the directory tree.
 * @param {string} startDir
 * @param {string} filename
 * @returns {Promise<string|null>}
 */
async function findFileUp(startDir, filename) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, filename);
    try {
      await access(candidate);
      return candidate;
    } catch {
      dir = path.dirname(dir);
    }
  }
  return null;
}

/**
 * Find the project root (directory with package.json).
 * @param {string} startDir
 * @returns {string}
 */
function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    try {
      accessSync(path.join(dir, 'package.json'));
      return dir;
    } catch {
      dir = path.dirname(dir);
    }
  }
  return startDir;
}
