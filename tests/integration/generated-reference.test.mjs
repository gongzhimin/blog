import test from 'node:test';
import assert from 'node:assert/strict';
import * as documents from '../../packages/tooling/src/internal/documents.mjs';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('generated references belong to modules and use interface chapters', async () => {
  for (const path of [
    'packages/book-build/docs/reference/book-config.generated.md',
    'packages/site/docs/reference/homepage-config.generated.md',
  ]) {
    const source = await readFile(
      new URL('../../' + path, import.meta.url),
      'utf8',
    );
    assert.deepEqual(documents.documentErrors(path, source), []);
    assert.equal(documents.metadata(source).type, 'interface');
    assert.match(source, /\[适用范围\]\(#适用范围\)/);
    assert.doesNotMatch(source, /\]\(file:\/\//);
  }
});

test('generated references remain current under a future process clock', () => {
  const script = `const OriginalDate = Date;
globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : ['2031-01-01T00:00:00Z'])); } };
process.argv = ['node', 'generate-reference', '--check'];
await import('./packages/tooling/src/cli/generate-reference.mjs');`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    {
      cwd: new URL('../..', import.meta.url),
      encoding: 'utf8',
    },
  );
  assert.equal(result.status, 0, result.stderr);
});
