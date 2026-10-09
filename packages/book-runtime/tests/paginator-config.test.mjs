import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { spawnSync } from 'node:child_process';

test('public pagination returns an actionable duplicate-key diagnostic without partial pages', () => {
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { JSDOM } from 'jsdom';
    const dom = new JSDOM('<html><body></body></html>');
    globalThis.window = dom.window; globalThis.document = dom.window.document;
    const { paginateBook } = await import('@myblog/book-runtime');
    const entry = {key:'same',title:'chapter',dateStr:'',bodyHTML:'<p>body</p>'};
    const payload = {articles:[entry, {...entry}], runtime:{pagination:{articleWidth:280,articleHeight:380,tocWidth:280,tocHeight:380}}};
    try {
      const result = paginateBook(payload);
      assert.equal(result.ok, false);
      assert.equal(result.diagnostics[0].code, 'BOOK_RUNTIME_DUPLICATE_KEY');
      assert.equal(result.diagnostics[0].phase, 'paginate');
      assert.match(result.diagnostics[0].message, /indices 0 and 1/);
      assert.equal('value' in result, false);
      assert.equal(document.head.children.length, 0);
      assert.equal(document.body.children.length, 0);
      payload.articles[1].key = 'other';
      assert.equal(paginateBook(payload).ok, true);
    } finally { dom.window.close(); }
  `,
    ],
    { encoding: 'utf8', timeout: 10000 },
  );
  assert.equal(child.status, 0, child.stderr);
});

test('public pagination honors explicit empty CSS over host CSS and earlier tasks', () => {
  const child = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    import { JSDOM } from 'jsdom';
    const dom = new JSDOM('<html><body></body></html>');
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    const { paginateBook } = await import('@myblog/book-runtime');
    const payload = { articles: [], runtime: { pagination: { articleWidth: 280, articleHeight: 380, tocWidth: 280, tocHeight: 380, articleCSS: 'p {color:red}', tocCSS: 'li {color:red}' } } };
    try {
      assert.equal(paginateBook(payload).ok, true);
      window.MEASURE_CSS = { article: 'p {color:blue}', toc: 'li {color:blue}' };
      payload.runtime.pagination.articleCSS = '';
      payload.runtime.pagination.tocCSS = '';
      assert.equal(paginateBook(payload).ok, true);
      assert.equal(window.BookRuntime.PaginatorCore.getConfig().articleCSS, '');
      assert.equal(window.BookRuntime.PaginatorCore.getConfig().tocCSS, '');
    } finally { dom.window.close(); }
  `,
    ],
    { encoding: 'utf8', timeout: 10000 },
  );
  assert.equal(child.status, 0, child.stderr);
});

test('measurement CSS can be cleared between sequential tasks', async () => {
  const source = await readFile(
    new URL('../src/internal/paginator-core.js', import.meta.url),
    'utf8',
  );
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const core = context.window.BookRuntime.PaginatorCore;
  core.configure({ articleCSS: 'old article', tocCSS: 'old toc' });
  core.configure({ articleCSS: '', tocCSS: '' });
  assert.equal(core.getConfig().articleCSS, '');
  assert.equal(core.getConfig().tocCSS, '');
});

test('runtime package root exposes one book-pagination task', async () => {
  const { existsSync } = await import('node:fs');
  assert.ok(
    existsSync(new URL('../src/api/index.mjs', import.meta.url)),
    'runtime source API is missing',
  );
  assert.equal(
    existsSync(
      new URL('../../../public/book-runtime/js/paginator.js', import.meta.url),
    ),
    false,
  );
  const dom = new JSDOM('<!doctype html><body></body>');
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  try {
    const api = await import('../src/api/index.mjs');
    assert.deepEqual(Object.keys(api), ['paginateBook']);
    dom.window.BookRuntime.Paginator.configure = (config) => {
      assert.equal(config.articleWidth, 200);
    };
    dom.window.BookRuntime.Orchestrator.createPageCache = () => ({
      paginateAll: () => ({
        totalPages: 7,
        backPage: 6,
        articleStart: 6,
        bodyStart: 6,
        pageCache: { 5: '<p>TOC</p>', 6: '<p>Body</p>' },
        articleToPage: { a: 6 },
        pageToArticle: { 6: 'a' },
      }),
    });
    dom.window.MEASURE_CSS = { article: 'article-css', toc: 'toc-css' };
    const payload = {
      articles: [{ key: 'a' }],
      toc: '<p>TOC</p>',
      runtime: { pagination: { articleWidth: 200 } },
      book: {},
      source: {},
    };
    const result = api.paginateBook(payload);
    assert.equal(result.ok, true);
    assert.deepEqual(result.value.pages, [
      { physicalPage: 5, html: '<p>TOC</p>' },
      { physicalPage: 6, html: '<p>Body</p>' },
    ]);
    assert.deepEqual(result.value.articleToPage, { a: 6 });
    dom.window.BookRuntime.Orchestrator.createPageCache = () => ({
      paginateAll: () => {
        throw new Error('TOC calibration did not converge');
      },
    });
    const failed = api.paginateBook(payload);
    assert.equal(failed.ok, false);
    if (!failed.ok) {
      assert.equal(
        failed.diagnostics[0].code,
        'BOOK_RUNTIME_PAGINATION_FAILED',
      );
      assert.match(
        failed.diagnostics[0].message,
        /calibration did not converge/,
      );
    }
    assert.equal(dom.window.document.querySelector('#__bap_inner'), null);
    assert.equal(dom.window.document.querySelector('.cursor-dot'), null);
    assert.equal(dom.window.PAGINATOR, undefined);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    dom.window.close();
  }
});

async function loadPaginator() {
  const dom = new JSDOM('<!doctype html><body></body>');
  const appended = [];
  const originalAppendChild = dom.window.document.body.appendChild.bind(
    dom.window.document.body,
  );
  dom.window.document.body.appendChild = (node) => {
    appended.push(node);
    return originalAppendChild(node);
  };

  const context = {
    window: dom.window,
    document: dom.window.document,
    MEASURE_CSS: {
      article:
        '#__bap_inner{font-size:16px;line-height:20px}#__bap_inner p{margin:0}',
      toc: '#__toc{font-size:16px;line-height:20px}#__toc li{margin:0}',
    },
    __appended: appended,
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const path of [
    '../src/internal/paginator-core.js',
    '../src/internal/paginator-splitters.js',
    '../src/internal/paginator.js',
  ]) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    vm.runInContext(source, context);
  }
  return context;
}

test('paginator uses configured article and toc measurement dimensions', async () => {
  const context = await loadPaginator();
  assert.equal(
    typeof context.window.BookRuntime.Paginator.configure,
    'function',
  );

  context.window.BookRuntime.Paginator.configure({
    articleWidth: 123,
    articleHeight: 45,
    tocWidth: 234,
    tocHeight: 67,
  });

  const config = context.window.BookRuntime.Paginator.getConfig();
  assert.equal(config.articleWidth, 123);
  assert.equal(config.articleHeight, 45);
  assert.equal(config.tocWidth, 234);
  assert.equal(config.tocHeight, 67);

  context.window.BookRuntime.Paginator.paginateArticle({
    title: 'Configured',
    dateStr: '2026/07/01',
    bodyHTML: '<p>one</p><p>two</p>',
  });
  const articleMeasure = context.__appended.at(-1);
  assert.equal(articleMeasure.style.width, '123px');
  assert.equal(
    articleMeasure.querySelector('#__bap_inner').style.height,
    '45px',
  );

  context.window.BookRuntime.Paginator.paginateTOC(
    '<div class="table-contents"><h1>目录</h1><ul><li>one</li></ul></div>',
  );
  const tocMeasure = context.__appended.at(-1);
  assert.equal(tocMeasure.style.width, '234px');
  assert.equal(tocMeasure.querySelector('#__toc').style.height, '67px');
});
