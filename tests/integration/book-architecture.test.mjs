import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const exists = async (path) => {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
};

test('project README identifies real modules and their public API', async () => {
  const readme = await read('../../README.md');
  assert.match(readme, /packages\/book-build/);
  assert.match(readme, /packages\/site/);
  assert.match(readme, /book-runtime/);
});

test('pagination design belongs to the runtime and legacy redirects are absent', async () => {
  const design = await read(
    '../../packages/book-runtime/docs/algorithms/pagination.md',
  );
  for (const heading of [
    '问题定义',
    '数据结构',
    '复杂度',
    '正确性依据',
    '测试案例',
  ])
    assert.ok(design.includes('## ' + heading));
  assert.equal(await exists('../../docs/pagination-workflow.md'), false);
  assert.equal(await exists('../../docs/book-runtime-interface.md'), false);
});

test('shared runtime contract connects model, shell and browser', async () => {
  const contract = await read('../../docs/reference/book-runtime-contract.md');
  for (const term of ['BookDocument', 'BookShell', 'Runtime Assets'])
    assert.ok(contract.includes(term));
});

test('demo composes only public module entry points', async () => {
  const source = await read(
    '../../packages/site/src/pages/demos/book-runtime.astro',
  );
  assert.ok(source.includes("from '@myblog/book-build'"));
  assert.ok(source.includes("from '../../components/BookShell.astro'"));
  assert.ok(source.includes('../../internal/presentation/'));
  assert.ok(source.includes("from '../../components/BookRuntimeAssets.astro'"));
  assert.ok(source.includes('<BookShell'));
  assert.ok(source.includes('<BookRuntimeAssets'));
  assert.equal(source.includes('@myblog/book-build/src/internal/'), false);
  assert.equal(source.includes('@myblog/book-build/'), false);
  assert.equal(source.includes('@myblog/book-runtime/'), false);
});

test('markdown implementation is private and old forwarding module is deleted', async () => {
  const renderer = await read(
    '../../packages/book-build/src/internal/renderers/markdown-renderer.mjs',
  );
  assert.match(renderer, /marked/);
  assert.equal(await exists('../../src/lib/book-renderer.js'), false);
  const { renderArticle } = await import('@myblog/book-build');
  assert.match(
    renderArticle({ body: '**bold**', title: 'not present' }),
    /<strong>bold<\/strong>/,
  );
});

test('runtime entry owns initialization order; BookShell contains only markup and measurement data', async () => {
  const api = await read('../../packages/book-runtime/src/api/index.mjs');
  const files = [
    'paginator-core.js',
    'paginator-splitters.js',
    'paginator.js',
    'orchestrator.js',
    'turnjs-adapter.js',
  ];
  const positions = files.map((name) => api.indexOf(name));
  assert.ok(
    positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1])),
  );
  const bootstrap = await read(
    '../../packages/site/src/internal/book-runtime-entry.js',
  );
  assert.ok(
    bootstrap.indexOf("'@myblog/book-runtime'") <
      bootstrap.indexOf("'./book-app.js'"),
  );
  const shell = await read(
    '../../packages/site/src/components/BookShell.astro',
  );
  assert.ok(shell.includes('window.MEASURE_CSS'));
  assert.equal(shell.includes('/book-runtime/js/'), false);
});
