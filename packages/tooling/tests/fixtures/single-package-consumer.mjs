import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const name = process.argv[2];
const config = JSON.parse(readFileSync(process.argv[3], 'utf8'));
if (name === '@myblog/book-runtime') {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<html><body></body></html>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
}
try {
  const api = await import(name);
  if (name === '@myblog/book-build') {
    const book = api.buildBook({
      document: {
        id: 'single',
        title: 'Single',
        tocTitle: 'Contents',
        entries: [],
      },
      config,
    });
    assert.equal(book.ok, true);
    assert.match(
      api.renderArticle({ body: '**text**', title: '' }),
      /<strong>text<\/strong>/,
    );
  } else if (name === '@myblog/site') {
    const { createBookTheme } = await import('@myblog/book-build');
    const theme = createBookTheme('classic-paper', {
      fontsCSS: '',
      bookContentCSS: '',
      bookTocCSS: '',
      codeHighlightCSS: '',
    });
    assert.equal(
      api.buildHomepageModel({
        lifePosts: [],
        blogPosts: [],
        bookConfig: config,
        theme,
      }).ok,
      true,
    );
  } else if (name === '@myblog/book-runtime') {
    assert.equal(
      api.paginateBook({
        articles: [],
        runtime: {
          pagination: {
            articleWidth: 280,
            articleHeight: 380,
            tocWidth: 280,
            tocHeight: 380,
          },
        },
      }).ok,
      true,
    );
  } else if (name === '@myblog/tooling') {
    assert.equal(
      api.inspectRepository({ root: process.argv[4], mode: 'boundaries' }).ok,
      true,
    );
  } else if (name === '@myblog/publishing') {
    assert.equal(typeof api.default.startServer, 'function');
  } else if (name === '@myblog/operations') {
    assert.equal(typeof api.default.runHealthChecks, 'function');
  } else throw new Error('Unexpected package ' + name);
  await assert.rejects(import(name + '/src/private.js'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
  console.log(name + ': isolated dependency-closure consumer passed');
} finally {
  if (name === '@myblog/book-runtime') window.close();
}
