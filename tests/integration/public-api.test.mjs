import test from 'node:test';
import assert from 'node:assert/strict';
import { createAstroBlogDocument } from '../../packages/site/src/internal/sources/astro-blog-source.mjs';
import { buildCatalogEntries } from '../../packages/site/src/internal/catalog/homepage.mjs';
import { buildBook } from '../../packages/book-build/src/api/index.mjs';
import config from '../../packages/site/src/data/book-config.json' with { type: 'json' };

const post = (id, date, extra = {}) => ({
  id,
  body: '正文',
  data: { title: id, date, ...extra },
});

test('Site API filters drafts before checking dates, preserves stable ties and input order', () => {
  const day = new Date('2026-01-01T00:00:00Z');
  const life = [post('A', day), post('D', undefined, { draft: true })];
  const blog = [post('B', new Date('2026-01-03T00:00:00Z')), post('C', day)];
  assert.deepEqual(
    createAstroBlogDocument({ lifePosts: life, blogPosts: blog }).entries.map(
      (e) => e.id,
    ),
    ['B', 'A', 'C'],
  );
  assert.deepEqual(
    life.map((p) => p.id),
    ['A', 'D'],
  );
  assert.deepEqual(
    createAstroBlogDocument({ lifePosts: [], blogPosts: [] }).entries,
    [],
  );
  assert.throws(
    () =>
      createAstroBlogDocument({
        lifePosts: [post('bad', day, { pubDatetime: new Date('bad') })],
        blogPosts: [],
      }),
    /Invalid post date: bad/,
  );
});

test('Book Node API assembles source without Vite or Astro and does not mutate config', () => {
  const snapshot = structuredClone(config);
  const document = {
    id: 'api-example',
    title: '小书',
    tocTitle: '目录',
    entries: [
      {
        id: 'one',
        collection: 'json',
        title: '第一章',
        date: new Date('2026-10-01T00:00:00Z'),
        body: '# 第一章\n\n**正文**',
        bodyType: 'markdown',
        metadata: {},
      },
    ],
  };
  const result = buildBook({
    document,
    config,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.articles.length, 1);
  assert.match(result.value.articles[0].bodyHTML, /<strong>正文<\/strong>/);
  assert.equal(result.value.config.book.turn.totalPages, 12);
  assert.deepEqual(config, snapshot);
});

test('Site catalog API truncates wide display and marks narrow entries using UTC dates', () => {
  const entries = buildCatalogEntries(
    [
      post('A', new Date('2026-01-01T23:00:00Z')),
      post('B', new Date('2026-01-03')),
    ],
    '/life',
    {
      wideMaximumEntries: 2,
      narrowMaximumEntries: 1,
      wideDateFormat: 'YYYY-MM-DD',
      compactDateFormat: 'MM/DD',
    },
  );
  assert.deepEqual(
    entries.map((e) => [e.href, e.narrowHidden]),
    [
      ['/life/B', false],
      ['/life/A', true],
    ],
  );
  assert.equal(entries[1].date, '2026-01-01');
});
