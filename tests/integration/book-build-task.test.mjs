import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBook } from '@myblog/book-build';
import config from '../../packages/site/src/data/book-config.json' with { type: 'json' };

test('buildBook turns one document and config into a successful runtime payload', () => {
  const result = buildBook({
    document: {
      id: 'sample',
      title: 'Sample',
      tocTitle: 'Contents',
      entries: [
        {
          id: 'first',
          collection: 'blog',
          title: 'First',
          date: new Date('2026-10-01T00:00:00.000Z'),
          body: '# First\n\nHello',
          bodyType: 'markdown',
          metadata: {},
        },
      ],
    },
    config,
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.articles.length, 1);
  assert.match(result.value.articles[0].bodyHTML, /Hello/);
  assert.equal(result.value.config.book.turn.startPage, 7);
});

test('buildBook returns a diagnostic instead of leaking expected input errors', () => {
  const result = buildBook({ document: null, config: {} });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].phase, 'validate');
  assert.equal(result.diagnostics[0].code, 'BOOK_CONFIG_INVALID');
});
