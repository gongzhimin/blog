import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  testPolicyErrors,
  collectTestPlan,
  nodeResultErrors,
} from '../src/internal/testing.mjs';
import StrictBrowserReporter from '../src/internal/strict-browser-reporter.mjs';

test('test policy rejects focused, disabled and expected-failure tests with legal controls', () => {
  for (const source of [
    "test.only('case', () => {})",
    "test.skip('case', () => {})",
    "test['todo']('case')",
    "test.describe.fixme('suite', () => {})",
    'test.fail(true)',
    "test('case', { skip: process.env.CI }, () => {})",
    "import {test as scenario} from 'node:test'; scenario.only('case', () => {})",
    "test('case', (t) => { t.skip('reason'); })",
  ])
    assert.notDeepEqual(
      testPolicyErrors('fixture.test.mjs', source),
      [],
      source,
    );
  for (const source of [
    "test('case', { skip: false }, () => assert.equal(1, 1))",
    "// test.skip('example')\ntest('case', () => {})",
    "const example = \"test.only('example')\"; test('case', () => {})",
  ])
    assert.deepEqual(testPolicyErrors('fixture.test.mjs', source), [], source);
});

test('test discovery is recursive and rejects unregistered, missing and unsupported files', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'test-policy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = [
    'packages/demo/tests/nested/basic.test.mjs',
    'tests/integration/contract.test.cjs',
    'tests/e2e/browser.spec.mjs',
  ];
  for (const file of files) {
    await mkdir(join(root, file, '..'), { recursive: true });
    await writeFile(join(root, file), "test('case', () => {});\n");
  }
  const modules = [
    {
      id: 'demo',
      root: 'packages/demo',
      testRoot: 'packages/demo/tests',
      tests: files,
    },
  ];
  const good = await collectTestPlan(root, modules);
  assert.deepEqual(good.errors, []);
  assert.deepEqual(good.node, files.slice(0, 2).sort());
  assert.deepEqual(good.browser, files.slice(2));
  await mkdir(join(root, 'tests/e2e/nested'), { recursive: true });
  await writeFile(
    join(root, 'tests/e2e/nested/missed.spec.mjs'),
    "test('case', () => {});\n",
  );
  const nested = await collectTestPlan(root, [
    { ...modules[0], tests: [...files, 'tests/e2e/nested/missed.spec.mjs'] },
  ]);
  assert.ok(
    nested.errors.some((error) => error.includes('unsupported test path')),
  );
  await rm(join(root, 'tests/e2e/nested'), { recursive: true });
  const missing = await collectTestPlan(root, [
    { ...modules[0], tests: [...files, 'tests/integration/missing.test.mjs'] },
  ]);
  assert.ok(
    missing.errors.some((error) => error.includes('missing registered test')),
  );
  await writeFile(
    join(root, 'packages/demo/tests/hidden.test.ts'),
    "test('hidden', () => {});\n",
  );
  const unsupported = await collectTestPlan(root, modules);
  assert.ok(
    unsupported.errors.some((error) => error.includes('unsupported test path')),
  );
  await writeFile(
    join(root, 'packages/demo/tests/new.test.mjs'),
    "test('new', () => {});\n",
  );
  const unregistered = await collectTestPlan(root, modules);
  assert.ok(
    unregistered.errors.some((error) => error.includes('unregistered test')),
  );
});

test('Node result gate rejects runtime skips, todos, cancellation and empty discovery', () => {
  const summary = (counts = {}) =>
    Object.entries({
      tests: 2,
      pass: 2,
      fail: 0,
      cancelled: 0,
      skipped: 0,
      todo: 0,
      ...counts,
    })
      .map(([name, count]) => `ℹ ${name} ${count}`)
      .join('\n');
  assert.deepEqual(nodeResultErrors(summary(), 0), []);
  for (const counts of [
    { skipped: 1 },
    { todo: 1 },
    { cancelled: 1 },
    { tests: 0, pass: 0 },
    { fail: 1 },
  ])
    assert.notDeepEqual(nodeResultErrors(summary(counts), 0), []);
  assert.notDeepEqual(nodeResultErrors('no summary', 0), []);
  assert.notDeepEqual(nodeResultErrors(summary(), 1), []);
});

test('browser result gate rejects runtime skips, expected failures, retries and empty suites', () => {
  const run = (cases, status = 'passed') => {
    const reporter = new StrictBrowserReporter();
    for (const [expectedStatus, resultStatus, retry = 0] of cases)
      reporter.onTestEnd({ expectedStatus }, { status: resultStatus, retry });
    return reporter.onEnd({ status });
  };
  assert.deepEqual(run([['passed', 'passed']]), { status: 'passed' });
  for (const cases of [
    [],
    [['passed', 'skipped']],
    [['failed', 'failed']],
    [['passed', 'passed', 1]],
  ])
    assert.deepEqual(run(cases), { status: 'failed' });
  assert.deepEqual(run([['passed', 'passed']], 'timedout'), {
    status: 'failed',
  });
});

test('actual Playwright CLI exits nonzero for dynamic skips and expected failures', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'browser-policy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = join(root, 'playwright.config.mjs');
  const reporter = fileURLToPath(
    new URL('../src/internal/strict-browser-reporter.mjs', import.meta.url),
  );
  const playwright = new URL(
    '../../../node_modules/@playwright/test/index.mjs',
    import.meta.url,
  ).href;
  const cli = fileURLToPath(
    new URL('../../../node_modules/@playwright/test/cli.js', import.meta.url),
  );
  await writeFile(
    config,
    `export default ${JSON.stringify({ testDir: root, workers: 1, retries: 0, reporter: [[reporter]] })};\n`,
  );
  for (const [source, expected] of [
    ["test('control', () => { expect(1).toBe(1); });", 0],
    ["test('dynamic skip', () => { test.skip(Date.now() > 0); });", 1],
    [
      "test('expected failure', () => { test.fail(); throw new Error('injected'); });",
      1,
    ],
  ]) {
    await writeFile(
      join(root, 'probe.spec.mjs'),
      `import {test,expect} from ${JSON.stringify(playwright)};\n${source}\n`,
    );
    const result = spawnSync(
      process.execPath,
      [cli, 'test', '--config', config],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 10_000,
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, expected, result.stdout + result.stderr);
  }
});
