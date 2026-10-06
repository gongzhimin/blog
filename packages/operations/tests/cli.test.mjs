import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const cli = new URL('../src/cli/health.cjs', import.meta.url);
const source = await readFile(cli, 'utf8');

for (const ok of [true, false]) {
  test(`Operations CLI prints the report and exits ${ok ? 0 : 1} when ok=${ok}`, async () => {
    assert.equal(
      createRequire(cli).resolve('../api/index.cjs'),
      createRequire(import.meta.url).resolve('../src/api/index.cjs'),
    );
    const report = {
      ok,
      results: [
        { id: 'fixture', label: 'fixture', ok, error: ok ? '' : 'failed' },
      ],
    };
    const printed = [];
    const process = {};
    await vm.runInNewContext(source, {
      require(request) {
        if (request === '../api/index.cjs')
          return { runHealthChecks: async () => report };
        if (request === '../internal/report.cjs')
          return { printHealthReport: (value) => printed.push(value) };
        assert.fail(`unexpected CLI import: ${request}`);
      },
      process,
    });
    assert.equal(process.exitCode, ok ? 0 : 1);
    assert.deepEqual(printed, [report]);
  });
}

test('Operations CLI reports a rejected check and exits 1 without printing a partial report', async () => {
  const process = {};
  const errors = [];
  let printed = false;
  await vm.runInNewContext(source, {
    require(request) {
      if (request === '../api/index.cjs')
        return {
          runHealthChecks: async () => {
            throw new Error('offline failure');
          },
        };
      if (request === '../internal/report.cjs')
        return {
          printHealthReport: () => {
            printed = true;
          },
        };
      assert.fail(`unexpected CLI import: ${request}`);
    },
    Error,
    process,
    console: { error: (value) => errors.push(value) },
  });
  assert.equal(process.exitCode, 1);
  assert.deepEqual(errors, ['offline failure']);
  assert.equal(printed, false);
});
