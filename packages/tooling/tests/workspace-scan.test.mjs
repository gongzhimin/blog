import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectRepository } from '../src/api/index.mjs';

const repository = fileURLToPath(new URL('../../../', import.meta.url));

test('real CLI scans package documentation and source boundaries in an isolated checkout', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-scan-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of [
    'packages',
    'docs',
    'tests',
    '.github',
    'README.md',
    'AGENTS.md',
    'package.json',
  ]) {
    await cp(join(repository, file), join(root, file), {
      recursive: true,
      filter: (source) => !source.split('/').includes('node_modules'),
    });
  }
  for (const file of ['public', 'node_modules']) {
    await symlink(join(repository, file), join(root, file), 'dir');
  }
  for (const mode of ['docs', 'boundaries']) {
    const result = inspectRepository({ root, mode });
    assert.equal(result.ok, true, result.stderr);
  }
  await writeFile(
    join(root, 'packages/book-build/README.md'),
    '# Missing metadata\n',
  );
  const docs = inspectRepository({ root, mode: 'docs' });
  assert.equal(docs.ok, false);
  assert.match(docs.stderr, /packages\/book-build\/README\.md/);

  await writeFile(
    join(root, 'packages/book-build/src/forbidden.mjs'),
    "import '@myblog/site';\n",
  );
  const boundaries = inspectRepository({ root, mode: 'boundaries' });
  assert.equal(boundaries.ok, false);
  assert.match(
    boundaries.stderr,
    /packages\/book-build\/src\/forbidden\.mjs: book-build cannot depend on site/,
  );
});
