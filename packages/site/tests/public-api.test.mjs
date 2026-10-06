import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../src/data/book-config.json' with { type: 'json' };
import * as site from '../src/api/index.mjs';

const theme = {
  runtime: { id: 'classic-paper' },
  styles: { visualCSS: '' },
  measurement: { articleCSS: '', tocCSS: '' },
};

const post = (id, date, extra = {}) => ({
  id,
  body: `# ${id}\n\n正文`,
  data: { title: id, date: new Date(date), ...extra },
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
