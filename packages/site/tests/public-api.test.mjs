import test from 'node:test';
import assert from 'node:assert/strict';
import { getRssString } from '@astrojs/rss';
import { JSDOM } from 'jsdom';
import config from '../src/data/book-config.json' with { type: 'json' };
import * as site from '../src/api/index.mjs';
import { createSpecialPages } from '../src/internal/presentation/special-pages/index.mjs';

for (const field of ['source', 'enclosure']) {
  test(`RSS preserves ${field} values as data, not injected XML`, async () => {
    const title = '<injected>unexpected</injected>';
    const type = 'audio/mpeg" injected="unexpected';
    const item = {
      title: 'Article',
      link: '/article',
      ...(field === 'source'
        ? { source: { url: 'https://example.test/feed', title } }
        : {
            enclosure: {
              url: 'https://example.test/audio.mp3',
              length: 1,
              type,
            },
          }),
    };
    const xml = await getRssString({
      title: 'Feed',
      description: 'Example',
      site: 'https://example.test',
      items: [item],
    });
    const dom = new JSDOM(xml, { contentType: 'application/xml' });
    try {
      const document = dom.window.document;
      assert.equal(document.querySelector('parsererror'), null);
      assert.equal(document.querySelector('injected'), null);
      assert.equal(document.querySelector('[injected]'), null);
      assert.equal(document.querySelectorAll('item').length, 1);
      assert.equal(
        document.querySelector('item > title').textContent,
        'Article',
      );
      if (field === 'source')
        assert.equal(document.querySelector('source').textContent, title);
      else
        assert.equal(
          document.querySelector('enclosure').getAttribute('type'),
          type,
        );
    } finally {
      dom.window.close();
    }
  });
}

const theme = {
  runtime: { id: 'classic-paper' },
  styles: { visualCSS: '' },
  measurement: { articleCSS: '', tocCSS: '' },
};

test('special pages escape title text and freeze the edition year in the serialized payload', () => {
  const input = { source: { documentTitle: '<img src=x onerror=alert(1)>' } };
  const pages = createSpecialPages(input, 2026);
  const later = createSpecialPages(
    { source: { documentTitle: '另一本书' } },
    2026,
  );
  const dom = new JSDOM(pages.titlePage.html + pages.imprintPage.html);
  try {
    assert.equal(dom.window.document.querySelector('img'), null);
    assert.equal(
      dom.window.document.querySelector('h1').textContent,
      input.source.documentTitle,
    );
    assert.match(pages.imprintPage.html, /2026 年/);
    for (const role of ['frontCover', 'frontInside', 'backInside', 'backCover'])
      assert.deepEqual(pages[role], later[role]);
    assert.deepEqual(input, {
      source: { documentTitle: '<img src=x onerror=alert(1)>' },
    });
  } finally {
    dom.window.close();
  }
});

for (const titlePage of ['-321px 12px', undefined]) {
  test(`title artwork consumes configured coordinates (${titlePage ?? 'fallback'})`, () => {
    const custom = structuredClone(config);
    custom.book.coverSprite.positions.backInside = '-654px 8px';
    if (titlePage === undefined)
      delete custom.book.coverSprite.positions.titlePage;
    else custom.book.coverSprite.positions.titlePage = titlePage;
    const result = site.buildHomepageModel({
      lifePosts: [],
      blogPosts: [],
      bookConfig: custom,
      theme,
    });
    assert.equal(result.ok, true);
    assert.ok(
      result.value.homepageStyles.includes(
        `background-position: ${titlePage ?? '-654px 8px'} !important;`,
      ),
    );
  });
}

const post = (id, date, extra = {}) => ({
  id,
  body: `# ${id}\n\n正文`,
  data: { title: id, date: new Date(date), ...extra },
});

test('homepage supplies six independent special page definitions without using quote attribution', () => {
  const result = site.buildHomepageModel({
    lifePosts: [],
    blogPosts: [],
    bookConfig: config,
    theme,
  });
  assert.equal(result.ok, true);
  const pages = result.value.runConfig.specialPages;
  assert.deepEqual(Object.keys(pages), [
    'frontCover',
    'frontInside',
    'titlePage',
    'imprintPage',
    'backInside',
    'backCover',
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(pages)), pages);
  assert.match(pages.titlePage.html, /志民/);
  assert.doesNotMatch(pages.imprintPage.html, /Joan Didion/);
  assert.match(pages.frontCover.html, /class="side"/);
  assert.equal(
    pages.backInside.className,
    'hard fixed back-side book-page--back-inside',
  );
  assert.match(
    result.value.homepageStyles,
    /\.sj-book \.book-page--back-inside/,
  );
});

test('Site root exposes its page task and configuration inspection facade', () => {
  assert.deepEqual(Object.keys(site), [
    'buildHomepageModel',
    'inspectHomepageConfig',
  ]);
});

test('buildHomepageModel composes book payload, styles, and quote display values', () => {
  const result = site.buildHomepageModel({
    lifePosts: [post('essay', '2026-01-02T00:00:00Z')],
    blogPosts: [post('draft', 'invalid', { draft: true })],
    bookConfig: config,
    dailyQuote: { english: 'A', chinese: '甲', author: 'Writer' },
    theme,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.value.document.entries.map((entry) => entry.id),
    ['essay'],
  );
  assert.equal(result.value.runConfig.articles.length, 1);
  assert.equal(result.value.runConfig.theme.id, 'classic-paper');
  assert.match(result.value.homepageStyles, /\.sj-book/);
  assert.deepEqual(result.value.quote, {
    english: 'A',
    chinese: '甲',
    author: 'Writer',
  });
});

test('buildHomepageModel returns a diagnostic for invalid collection data', () => {
  const result = site.buildHomepageModel({
    lifePosts: [post('bad', 'invalid')],
    blogPosts: [],
    bookConfig: config,
    dailyQuote: null,
    theme,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.diagnostics[0].code, 'SITE_INPUT_INVALID');
  assert.equal(result.diagnostics[0].phase, 'input');
});

test('buildHomepageModel reports malformed input instead of throwing', () => {
  const result = site.buildHomepageModel(null);
  assert.equal(result.ok, false);
  if (!result.ok)
    assert.equal(result.diagnostics[0].code, 'SITE_INPUT_INVALID');
});

test('homepage task preserves empty and single collections and uses quote defaults without mutating inputs', () => {
  for (const lifePosts of [[], [post('one', '2026-01-02T00:00:00Z')]]) {
    const input = {
      lifePosts,
      blogPosts: [],
      bookConfig: structuredClone(config),
      dailyQuote: null,
      theme,
    };
    const before = structuredClone(input);
    const result = site.buildHomepageModel(input);
    assert.equal(result.ok, true);
    assert.deepEqual(
      result.value.document.entries.map((entry) => entry.id),
      lifePosts.map((entry) => entry.id),
    );
    assert.equal(result.value.runConfig.articles.length, lifePosts.length);
    assert.deepEqual(result.value.quote, {
      english: config.footer.content.quoteEnglish,
      chinese: config.footer.content.quoteChinese,
      author: config.footer.content.author,
    });
    assert.deepEqual(input, before);
  }
});

test('homepage task identifies configuration and theme composition failures separately', () => {
  const input = { lifePosts: [], blogPosts: [], bookConfig: config, theme };
  const invalidConfig = site.buildHomepageModel({ ...input, bookConfig: {} });
  assert.equal(invalidConfig.ok, false);
  assert.equal(invalidConfig.diagnostics[0].code, 'BOOK_CONFIG_INVALID');
  assert.equal(invalidConfig.diagnostics[0].phase, 'book-validate');
  const invalidTheme = site.buildHomepageModel({ ...input, theme: null });
  assert.equal(invalidTheme.ok, false);
  assert.equal(invalidTheme.diagnostics[0].code, 'SITE_MODEL_FAILED');
  assert.equal(invalidTheme.diagnostics[0].phase, 'compose');
});
