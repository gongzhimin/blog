import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildBook, createBookTheme } from '@myblog/book-build';
import { buildHomepageModel, inspectHomepageConfig } from '@myblog/site';
import publishing from '@myblog/publishing';
import operations from '@myblog/operations';
import { inspectRepository } from '@myblog/tooling';
import { JSDOM } from 'jsdom';

const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const document = {
  id: 'isolated',
  title: 'Isolated book',
  tocTitle: 'Contents',
  entries: [
    {
      id: 'one',
      collection: 'json',
      title: 'Chapter',
      date: new Date('2026-10-01T00:00:00Z'),
      body: 'Text.',
      bodyType: 'markdown',
      metadata: {},
    },
  ],
};
const result = buildBook({ document, config });
assert.equal(result.ok, true);
assert.equal(result.value.articles.length, 1);
const theme = createBookTheme('classic-paper', {
  fontsCSS: '',
  bookContentCSS: '',
  bookTocCSS: '',
  codeHighlightCSS: '',
});
assert.equal(
  buildHomepageModel({
    lifePosts: [],
    blogPosts: [],
    bookConfig: config,
    theme,
  }).ok,
  true,
);
assert.equal(typeof inspectHomepageConfig({}).ok, 'boolean');
assert.deepEqual(Object.keys(publishing), ['startServer']);
assert.deepEqual(Object.keys(operations), ['runHealthChecks']);
assert.equal(
  inspectRepository({ root: process.argv[3], mode: 'boundaries' }).ok,
  true,
);
const dom = new JSDOM('<html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
try {
  const runtime = await import('@myblog/book-runtime');
  assert.deepEqual(Object.keys(runtime), ['paginateBook']);
  const pagination = runtime.paginateBook(result.value.config);
  assert.equal(pagination.ok, true);
  assert.equal(
    pagination.value.articleToPage[result.value.articles[0].key],
    pagination.value.bodyStart,
  );
  assert.equal(window.BookRuntime.TurnAdapter, undefined);
} finally {
  dom.window.close();
}
for (const name of [
  'site',
  'book-build',
  'book-runtime',
  'publishing',
  'operations',
  'tooling',
]) {
  await assert.rejects(import('@myblog/' + name + '/src/api/index.mjs'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
}
console.log('Six tarball consumers passed; production tasks were not invoked.');
