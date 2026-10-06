import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { JSDOM } from 'jsdom';

async function exists(path) {
  try {
    await access(new URL(path, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test('book runtime has a dedicated Turn.js adapter outside vendor', async () => {
  assert.equal(
    await exists('../../packages/book-runtime/src/internal/turnjs-adapter.js'),
    true,
  );
  assert.equal(
    await exists('../../public/vendor/turnjs/js/turnjs-adapter.js'),
    false,
  );

  const source = await readFile(
    new URL(
      '../../packages/book-runtime/src/internal/turnjs-adapter.js',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(source, /window\.BookRuntime\.TurnAdapter/);
  assert.match(source, /function createTurnJsAdapter/);
  assert.doesNotMatch(source, /destroy:/);
  assert.doesNotMatch(source, /currentPage:/);
});

test('book shell keeps depth decorations outside Turn.js managed pages', async () => {
  const source = await readFile(
    new URL('../../dist/index.html', import.meta.url),
    'utf8',
  );
  const dom = new JSDOM(source);
  const book = dom.window.document.querySelector('.sj-book');
  const layers = [...book.querySelectorAll(':scope > .book-depth')];
  assert.equal(layers.length, 2);
  for (const layer of layers) {
    assert.equal(layer.getAttribute('ignore'), '1');
    assert.equal(layer.getAttribute('aria-hidden'), 'true');
  }
  assert.equal(book.querySelectorAll('.hard .depth').length, 0);
  dom.window.close();
});

test('Turn.js adapter updates stable depth layers instead of page children', async () => {
  const [adapter, styles] = await Promise.all([
    readFile(
      new URL(
        '../../packages/book-runtime/src/internal/turnjs-adapter.js',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL('../../public/vendor/turnjs/css/steve-jobs.css', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(adapter, /book\.children\('\.book-depth--front'\)/);
  assert.match(adapter, /book\.children\('\.book-depth--back'\)/);
  assert.match(adapter, /zIndex:\s*pages \+ 1/);
  assert.doesNotMatch(adapter, /\.p2 \.depth/);
  assert.doesNotMatch(adapter, /' \.depth'/);

  assert.match(styles, /\.sj-book > \.book-depth\s*\{/);
  assert.match(styles, /pointer-events:\s*none/);
  assert.match(styles, /\.sj-book > \.book-depth--front\s*\{/);
  assert.match(styles, /\.sj-book > \.book-depth--back\s*\{/);
});
