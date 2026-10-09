import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

async function runtime(t) {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body></body></html>',
  );
  t.after(() => dom.window.close());
  const context = vm.createContext({
    window: dom.window,
    document: dom.window.document,
  });
  for (const name of [
    'paginator-core',
    'paginator-splitters',
    'paginator',
    'orchestrator',
  ]) {
    vm.runInContext(
      await readFile(
        new URL(`../src/internal/${name}.js`, import.meta.url),
        'utf8',
      ),
      context,
    );
  }
  return { dom, api: dom.window.BookRuntime };
}

const article = (key) => ({
  key,
  title: key,
  dateStr: '2026/10/05',
  bodyHTML: `<p>${key} body</p>`,
});

test('six supplied special pages retain their content at fixed and measured physical positions', async (t) => {
  const { api } = await runtime(t);
  const roles = [
    'frontCover',
    'frontInside',
    'titlePage',
    'imprintPage',
    'backInside',
    'backCover',
  ];
  const specialPages = Object.fromEntries(
    roles.map((role) => [role, { html: `<p>${role}</p>` }]),
  );
  const before = JSON.stringify(specialPages);
  const cache = api.Orchestrator.createPageCache({ specialPages });
  const result = cache.paginateAll([article('one')], '');
  for (const [role, page] of [
    ['frontCover', 1],
    ['frontInside', 2],
    ['titlePage', 3],
    ['imprintPage', 4],
    ['backInside', result.backPage],
    ['backCover', result.totalPages],
  ]) {
    assert.equal(result.pageCache[page], specialPages[role].html);
  }
  assert.equal(JSON.stringify(specialPages), before);
});

test('an incomplete special-page payload fails without publishing partial pages', async (t) => {
  const { api } = await runtime(t);
  assert.throws(
    () =>
      api.Orchestrator.createPageCache({
        specialPages: { titlePage: { html: 'title' } },
      }),
    /specialPages.frontCover/,
  );
});

test('generic pagination does not invent Site artwork or mutate host styles', async (t) => {
  const { api, dom } = await runtime(t);
  const cache = api.Orchestrator.createPageCache({ documentTitle: 'Generic' });
  const result = cache.paginateAll([article('one')], '');
  assert.equal(dom.window.document.head.children.length, 0);
  assert.match(result.pageCache[3], /Generic/);
  assert.doesNotMatch(JSON.stringify(result.pageCache), /志民|Joan|典藏版/);
});

test('duplicate navigation keys fail before measurement or cache and DOM mutation', async (t) => {
  const { api, dom } = await runtime(t);
  let measurements = 0;
  api.Paginator.paginateArticle = () => {
    measurements++;
    return ['body'];
  };
  const cache = api.Orchestrator.createPageCache();
  cache.setPageContent(99, 'caller-owned');
  assert.throws(
    () => cache.paginateAll([article('same'), article('same')], ''),
    (error) =>
      error.code === 'BOOK_RUNTIME_DUPLICATE_KEY' &&
      /indices 0 and 1/.test(error.message),
  );
  assert.equal(measurements, 0);
  assert.equal(cache.isPaginated(), false);
  assert.equal(cache.getPageContent(99), 'caller-owned');
  assert.deepEqual(Object.keys(cache.getArticleToPage()), []);
  assert.equal(dom.window.document.head.children.length, 0);
  const result = cache.paginateAll([article('one'), article('two')], '');
  assert.equal(result.articleToPage.one, result.bodyStart);
  assert.equal(result.articleToPage.two, result.bodyStart + 1);
});

test('text splitting preserves entities, Unicode and nested link attributes', async (t) => {
  const { api, dom } = await runtime(t);
  const document = dom.window.document;
  const inner = document.createElement('div');
  const paragraph = document.createElement('p');
  paragraph.innerHTML = `<a href="/target?q=1&amp;x=2" data-note="a > b"><strong class="accent">${'甲😀 &amp; 乙 '.repeat(30)}</strong></a>`;
  const original = paragraph.textContent;
  Object.defineProperty(inner, 'scrollHeight', {
    get: () => inner.textContent.length,
  });
  const result = api.PaginatorSplitters.splitText(paragraph, inner, 45);
  assert.ok(result);
  assert.equal(result.el.textContent + result.rest.textContent, original);
  assert.ok(result.el.textContent.length <= 45);
  for (const fragment of [result.el, result.rest]) {
    assert.equal(
      fragment.querySelector('a').getAttribute('href'),
      '/target?q=1&x=2',
    );
    assert.equal(fragment.querySelector('a').dataset.note, 'a > b');
    assert.equal(fragment.querySelector('strong').className, 'accent');
    assert.doesNotMatch(
      fragment.textContent,
      /[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/u,
    );
  }
  assert.equal(inner.children.length, 0);
});

test('code splitting preserves newlines and syntax attributes across pages', async (t) => {
  const { api, dom } = await runtime(t);
  const document = dom.window.document;
  const inner = document.createElement('div');
  const pre = document.createElement('pre');
  pre.className = 'source-code';
  pre.innerHTML =
    '<code data-language="js"><span class="token" data-note="a > b">one &amp; two\nthree 😀\nfour\nfive</span></code>';
  const original = pre.textContent;
  Object.defineProperty(inner, 'scrollHeight', {
    get: () => inner.textContent.split('\n').length * 20,
  });
  const result = api.PaginatorSplitters.splitPre(pre, inner, 60);
  assert.ok(result);
  assert.equal(result.el.textContent + result.rest.textContent, original);
  for (const fragment of [result.el, result.rest]) {
    assert.equal(fragment.className, 'source-code');
    assert.equal(fragment.querySelector('code').dataset.language, 'js');
    assert.equal(fragment.querySelector('span').className, 'token');
    assert.equal(fragment.querySelector('span').dataset.note, 'a > b');
  }
  assert.equal(inner.children.length, 0);
});

for (const [label, counts] of [
  ['growth', [1, 2, 2]],
  ['shrinkage', [2, 1, 1]],
  ['multiple changes', [1, 2, 3, 3]],
]) {
  test(`TOC calibration aligns links and maps after ${label}`, async (t) => {
    const { api, dom } = await runtime(t);
    let calls = 0;
    api.Paginator.paginateArticle = (input) => [
      `<p>${input.key}</p><span class="page-number">0</span>`,
    ];
    api.Paginator.paginateTOC = (html) => {
      const count = counts[Math.min(calls++, counts.length - 1)];
      return Array.from({ length: count }, (_, index) =>
        index === 0 ? html : '<span class="toc-pn">0</span>',
      );
    };
    const cache = api.Orchestrator.createPageCache();
    const result = cache.paginateAll([article('alpha'), article('beta')], '');
    const start = 5 + counts.at(-1);
    assert.equal(result.articleStart, start);
    assert.equal(result.bodyStart, start);
    assert.equal(result.articleToPage.alpha, start);
    assert.equal(result.articleToPage.beta, start + 1);
    assert.equal(result.pageToArticle[start], 'alpha');
    assert.equal(result.pageToArticle[start + 1], 'beta');
    assert.match(result.pageCache[start], /<p>alpha<\/p>/);
    const toc = dom.window.document.createElement('div');
    toc.innerHTML = result.pageCache[5];
    assert.deepEqual(
      [...toc.querySelectorAll('a')].map((link) => [
        link.getAttribute('href'),
        Number(link.dataset.page),
        link.querySelector('span').textContent,
      ]),
      [
        ['?post=alpha', start, '1'],
        ['?post=beta', start + 1, '2'],
      ],
    );
    assert.equal(cache.paginateAll([], ''), result);
    assert.equal(calls, counts.length);
  });
}

for (const mode of ['cycle', 'budget']) {
  test(`TOC calibration rejects ${mode} without committing state and can retry`, async (t) => {
    const { api, dom } = await runtime(t);
    dom.window.document.body.innerHTML =
      '<div class="sj-book"><div class="back-side p19"></div><div class="p20"></div></div>';
    let calls = 0;
    api.Paginator.paginateArticle = () => ['<p>body</p>'];
    api.Paginator.paginateTOC = () => {
      const count = mode === 'cycle' ? 1 + (calls++ % 2) : ++calls;
      return Array.from({ length: count }, () => '<p>TOC</p>');
    };
    const cache = api.Orchestrator.createPageCache();
    cache.setPageContent(99, 'caller-owned');
    assert.throws(
      () => cache.paginateAll([article('alpha')], ''),
      mode === 'cycle'
        ? /TOC calibration did not converge: cycle/
        : /TOC calibration did not converge: 8 rounds exceeded/,
    );
    assert.equal(calls, mode === 'cycle' ? 3 : 9);
    assert.equal(cache.isPaginated(), false);
    assert.equal(cache.getPageContent(5), undefined);
    assert.equal(cache.getPageContent(99), 'caller-owned');
    assert.deepEqual(Object.keys(cache.getArticleToPage()), []);
    assert.deepEqual(Object.keys(cache.getPageToArticle()), []);
    assert.equal(dom.window.document.head.querySelectorAll('style').length, 0);
    assert.equal(
      dom.window.document.querySelector('.back-side').className,
      'back-side p19',
    );
    api.Paginator.paginateTOC = () => ['<p>stable</p>'];
    const result = cache.paginateAll([article('alpha')], '');
    assert.equal(result.articleStart, 6);
    assert.equal(result.articleToPage.alpha, 6);
    assert.equal(cache.isPaginated(), true);
  });
}

test('page cache reuse preserves the complete pagination result without measuring again', async (t) => {
  const { api } = await runtime(t);
  const cache = api.Orchestrator.createPageCache();
  const first = cache.paginateAll([article('alpha')], '');
  assert.deepEqual(
    Object.keys(first).sort(),
    [
      'articleStart',
      'articleToPage',
      'backPage',
      'bodyStart',
      'pageCache',
      'pageToArticle',
      'totalPages',
    ].sort(),
  );
  assert.equal(first.totalPages, 8);
  assert.equal(first.backPage, 7);
  assert.equal(first.articleStart, 6);
  assert.equal(first.bodyStart, 6);
  api.Paginator.paginateArticle = () => {
    throw new Error('must not measure again');
  };
  api.Paginator.paginateTOC = () => {
    throw new Error('must not measure again');
  };
  const repeated = cache.paginateAll([article('ignored')], '');
  assert.deepEqual(repeated, first);
  assert.equal(repeated, first);
});

test('page cache reset clears maps while preserving host styles and plugin nodes', async (t) => {
  const { api, dom } = await runtime(t);
  const document = dom.window.document;
  const unrelated = document.createElement('style');
  document.head.appendChild(unrelated);
  const plugin = document.createElement('div');
  plugin.id = 'plugin-owned';
  document.body.appendChild(plugin);
  const other = api.Orchestrator.createPageCache();
  other.paginateAll([article('other')], '');
  const cache = api.Orchestrator.createPageCache();
  cache.paginateAll([article('old')], '');
  cache.reset();
  assert.equal(cache.isPaginated(), false);
  assert.equal(cache.getPageContent(6), undefined);
  assert.deepEqual(Object.keys(cache.getArticleToPage()), []);
  assert.deepEqual(Object.keys(cache.getPageToArticle()), []);
  assert.equal(unrelated.isConnected, true);
  assert.equal(plugin.isConnected, true);
  const fresh = cache.paginateAll([article('new')], '');
  assert.deepEqual(Object.keys(fresh.articleToPage), ['new']);
  assert.equal(fresh.articleToPage.new, 6);
  assert.equal(document.head.querySelectorAll('style').length, 1);
  cache.reset();
  cache.reset();
  assert.equal(document.head.querySelectorAll('style').length, 1);
});

test('measure containers select their own inner node when an existing node has the same id', async (t) => {
  const { api, dom } = await runtime(t);
  const original = dom.window.document.createElement('div');
  original.id = '__bap_inner';
  original.textContent = 'existing content';
  original.style.width = '77px';
  dom.window.document.body.appendChild(original);
  const measurement = api.PaginatorCore.createMeasureContainer({
    css: '',
    width: 120,
    height: 80,
    innerId: '__bap_inner',
  });
  try {
    assert.equal(measurement.measure.contains(measurement.inner), true);
    assert.notEqual(measurement.inner, original);
    assert.equal(measurement.inner.style.width, '120px');
    assert.equal(original.style.width, '77px');
  } finally {
    measurement.measure.remove();
  }
  assert.equal(original.isConnected, true);
  assert.equal(original.textContent, 'existing content');
  const specialId = api.PaginatorCore.createMeasureContainer({
    css: '',
    width: 120,
    height: 80,
    innerId: 'measurement:with.special[id]',
  });
  try {
    assert.equal(specialId.inner.id, 'measurement:with.special[id]');
    assert.equal(specialId.measure.contains(specialId.inner), true);
  } finally {
    specialId.measure.remove();
  }
});

test('article pagination releases only its own measurement when the article getter throws', async (t) => {
  const { api, dom } = await runtime(t);
  const original = dom.window.document.createElement('div');
  original.id = '__bap_inner';
  dom.window.document.body.appendChild(original);
  const failure = new Error('article getter failed');
  assert.throws(
    () =>
      api.Paginator.paginateArticle({
        get title() {
          throw failure;
        },
      }),
    (error) => error === failure,
  );
  assert.equal(dom.window.document.body.children.length, 1);
  assert.equal(original.isConnected, true);
});

test('TOC pagination releases its measurement when cloning a list item throws', async (t) => {
  const { api, dom } = await runtime(t);
  const prototype = dom.window.Element.prototype;
  const cloneNode = prototype.cloneNode;
  const failure = new Error('list clone failed');
  prototype.cloneNode = function (...args) {
    if (this.tagName === 'LI') throw failure;
    return cloneNode.apply(this, args);
  };
  try {
    assert.throws(
      () => api.Paginator.paginateTOC('<h1>目录</h1><ul><li>one</li></ul>'),
      (error) => error === failure,
    );
    assert.equal(dom.window.document.body.children.length, 0);
  } finally {
    prototype.cloneNode = cloneNode;
  }
});

test('article pagination keeps all 3000 simple paragraphs at the work budget', async (t) => {
  const { api, dom } = await runtime(t);
  const input = {
    ...article('limit'),
    bodyHTML: Array.from(
      { length: 3000 },
      (_, i) => `<p data-fixture>${i}</p>`,
    ).join(''),
  };
  const output = dom.window.document.createElement('div');
  output.innerHTML = api.Paginator.paginateArticle(input).join('');
  const paragraphs = [...output.querySelectorAll('[data-fixture]')];
  assert.equal(paragraphs.length, 3000);
  assert.deepEqual(
    paragraphs.map((node) => node.textContent),
    Array.from({ length: 3000 }, (_, i) => String(i)),
  );
  assert.equal(dom.window.document.body.children.length, 0);
});

test('article pagination rejects 3001 simple paragraphs instead of returning truncated success', async (t) => {
  const { api, dom } = await runtime(t);
  const input = {
    ...article('overflow'),
    bodyHTML: '<p>item</p>'.repeat(3001),
  };
  assert.throws(
    () => api.Paginator.paginateArticle(input),
    /Pagination work budget exceeded: 3000 steps/,
  );
  assert.equal(dom.window.document.body.children.length, 0);
});

test('special pages abstraction isolates front four, TOC, and back covers from body page counting', async (t) => {
  const { api } = await runtime(t);
  const cache = api.Orchestrator.createPageCache({
    specialPages: {
      frontCover: { html: '' },
      frontInside: { html: '' },
      titlePage: {
        html: '<div class="special-page title-page">测试文集 测试副标题 测试作者</div>',
      },
      imprintPage: {
        html: '<div class="special-page imprint-page">出版说明 测试作者</div>',
      },
      backInside: { html: '' },
      backCover: { html: '' },
    },
  });

  // Mock 2 articles: first article 2 pages, second article 1 page (total 3 body pages).
  api.Paginator.paginateArticle = (input) =>
    input.key === 'alpha'
      ? [
          '<p>alpha-p1</p><span class="page-number">0</span>',
          '<p>alpha-p2</p><span class="page-number">0</span>',
        ]
      : ['<p>beta-p1</p><span class="page-number">0</span>'];

  // Mock 2 TOC pages (pages 5 and 6).
  api.Paginator.paginateTOC = () => ['<p>TOC 1</p>', '<p>TOC 2</p>'];

  const result = cache.paginateAll([article('alpha'), article('beta')], '');

  // 1. Check Front Special Pages (Pages 1-4)
  assert.equal(cache.getPageKind(1), 'front_cover');
  assert.equal(cache.getPageKind(2), 'inside_front_cover');
  assert.equal(cache.getPageKind(3), 'title_page');
  assert.equal(cache.getPageKind(4), 'imprint_page');
  for (let p = 1; p <= 4; p++) {
    assert.equal(cache.isSpecialPage(p), true, `page ${p} should be special`);
    assert.equal(
      cache.isCountedPage(p),
      false,
      `page ${p} must not be counted`,
    );
    assert.equal(
      cache.physicalToBodyPage(p),
      null,
      `page ${p} has no body page number`,
    );
  }

  // Page 3 contains title page markup and no numeric body page number
  const page3Content = cache.getPageContent(3);
  assert.match(page3Content, /special-page title-page/);
  assert.match(page3Content, /测试文集/);
  assert.match(page3Content, /测试副标题/);
  assert.match(page3Content, /测试作者/);
  assert.doesNotMatch(page3Content, /class="page-number"/);

  // Page 4 contains imprint page markup and no numeric body page number
  const page4Content = cache.getPageContent(4);
  assert.match(page4Content, /special-page imprint-page/);
  assert.match(page4Content, /出版说明/);
  assert.match(page4Content, /测试作者/);
  assert.doesNotMatch(page4Content, /class="page-number"/);

  // 2. Check Dynamic TOC Pages (Pages 5 and 6)
  assert.equal(cache.getPageKind(5), 'toc');
  assert.equal(cache.getPageKind(6), 'toc');
  assert.equal(cache.isSpecialPage(5), true);
  assert.equal(cache.isSpecialPage(6), true);
  assert.equal(cache.isCountedPage(5), false);
  assert.equal(cache.isCountedPage(6), false);
  assert.equal(cache.physicalToBodyPage(5), null);
  assert.equal(cache.physicalToBodyPage(6), null);
  assert.match(cache.getPageContent(5), /<span class="page-number">I<\/span>/);
  assert.match(cache.getPageContent(6), /<span class="page-number">II<\/span>/);

  // 3. Check Body Pages (Start at 7, total 3 pages: 7, 8, 9)
  // Body page numbers strictly start at 1 and end at 3 (totalBodyPages).
  assert.equal(result.bodyStart, 7);
  assert.equal(result.totalBodyPages, 3);
  assert.equal(result.bodyEnd, 9);

  for (let p = 7; p <= 9; p++) {
    const expectedBodyPage = p - 6; // 1, 2, 3
    assert.equal(cache.getPageKind(p), 'body');
    assert.equal(cache.isSpecialPage(p), false);
    assert.equal(cache.isCountedPage(p), true);
    assert.equal(cache.physicalToBodyPage(p), expectedBodyPage);
    assert.equal(cache.bodyToPhysicalPage(expectedBodyPage), p);
    assert.match(
      cache.getPageContent(p),
      new RegExp(`<span class="page-number">${expectedBodyPage}<\\/span>`),
    );
  }

  // 4. Check Back Special Pages & Parity (bodyEnd is 9, which is odd)
  // Therefore, page 10 is an alignment endpaper, page 11 is inside back cover, page 12 is back cover.
  assert.equal(result.hasAlignmentEndpaper, true);
  assert.equal(result.backPage, 11);
  assert.equal(result.totalPages, 12);

  assert.equal(cache.getPageKind(10), 'alignment_endpaper');
  assert.equal(cache.isSpecialPage(10), true);
  assert.equal(cache.isCountedPage(10), false);
  assert.match(cache.getPageContent(10), /special-page endpaper-page/);
  assert.doesNotMatch(cache.getPageContent(10), /class="page-number"/);

  assert.equal(cache.getPageKind(11), 'inside_back_cover');
  assert.equal(cache.isSpecialPage(11), true);
  assert.equal(cache.isCountedPage(11), false);

  assert.equal(cache.getPageKind(12), 'back_cover');
  assert.equal(cache.isSpecialPage(12), true);
  assert.equal(cache.isCountedPage(12), false);
});
