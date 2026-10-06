import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('Turn.js adapter owns mobile touch handling outside vendor', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /function mountTouch/);
  assert.match(source, /if \(!isMobile\) return/);
  assert.match(source, /touchstart/);
  assert.match(source, /touchmove/);
  assert.match(source, /touchend/);
  assert.match(source, /intent === 'horizontal'/);
  assert.match(source, /preventDefault/);
  assert.match(source, /book\.turn\('next'\)/);
  assert.match(source, /book\.turn\('previous'\)/);
  assert.match(source, /mountTouch\(\)/);
});

test('Turn.js adapter assigns deterministic paper texture crops to dynamic pages', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /function paperCropForPage\(page\)/);
  assert.match(source, /paperTexture\.enabled/);
  assert.match(source, /style\.setProperty\('--paper-x', crop\.x \+ '%'\)/);
  assert.match(source, /style\.setProperty\('--paper-y', crop\.y \+ '%'\)/);
});

test('Turn.js adapter exposes unique paper texture crops for every configured page', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );
  const context = {
    window: {},
    navigator: { userAgent: '' },
  };

  vm.runInNewContext(source, context);

  const cropForPage = context.window.BookRuntime.TurnAdapter.paperCropForPage;
  assert.equal(typeof cropForPage, 'function');

  const dynamicPageSample = 260;
  const crops = new Set(
    Array.from({ length: dynamicPageSample }, (_, index) => {
      const crop = cropForPage(index + 1);
      return `${crop.x},${crop.y}`;
    }),
  );

  assert.equal(crops.size, dynamicPageSample);
});

test('Turn.js adapter does not assume a fixed physical page count', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /pages\s*\/\s*112/);
});

test('Turn.js adapter applies paper texture crops to initial own-size placeholders', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /function applyInitialPaperCrops\(book\)/);
  assert.match(source, /applyInitialPaperCrops\(flipbook\)/);
});

test('Turn.js adapter does not intercept cover turns with double-turn stop hack', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /turn\('stop'\)/);
  assert.doesNotMatch(source, /currentPage > 3 && currentPage < pages - 3/);
  assert.doesNotMatch(source, /book\.turn\('page',\s*2\)/);
});

test('Turn.js adapter calculates double spread view counts including both cover endpoints', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /Math\.floor\(book\.turn\('pages'\)\s*\/\s*2\)\s*\+\s*1/,
  );
});
