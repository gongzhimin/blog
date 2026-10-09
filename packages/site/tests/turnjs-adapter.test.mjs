import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('fixed cover registration is scoped to the configured book container', async () => {
  const source = await readFile(
    new URL('../src/internal/turnjs-adapter.js', import.meta.url),
    'utf8',
  );
  const changes = [];
  let handlers;
  const wrapper = (scope) => {
    const node = { isConnected: true };
    const result = {
      0: node,
      length: 1,
      width: () => 960,
      height: () => 600,
      on: () => result,
      mousewheel: () => result,
      keydown: () => result,
      css: () => result,
      slider: () => result,
      each: () => result,
      addClass: (name) => {
        changes.push([scope, 'add', name]);
        return result;
      },
      removeClass: (name) => {
        changes.push([scope, 'remove', name]);
        return result;
      },
      toggleClass: () => result,
      children: (selector) => wrapper(scope + ' ' + selector),
      find: (selector) => wrapper(scope + ' ' + selector),
      turn: (command) => {
        if (typeof command === 'object') {
          handlers = command.when;
          return result;
        }
        return { is: true, pages: 20, page: 2, view: [2, 3], animating: false }[
          command
        ];
      },
    };
    return result;
  };
  const book = wrapper('#custom-book');
  const document = {};
  const hash = {
    on: () => {},
    go: () => hash,
    update: () => hash,
    check: () => hash,
  };
  const context = {
    window: {},
    document,
    navigator: { userAgent: '' },
    Modernizr: { csstransforms: false },
    Hash: hash,
    $: (value) =>
      value === '#custom-book' || value === book[0]
        ? book
        : wrapper(String(value)),
  };
  vm.runInNewContext(source, context);
  const adapter = context.window.SiteReader.TurnAdapter.create({
    bookSelector: '#custom-book',
    contentPage: { width: 460, height: 582 },
    totalPages: 20,
    startPage: 2,
  });
  assert.equal(adapter.mount(), true);
  changes.length = 0;
  handlers.turning.call(book[0], {}, 4);
  assert.deepEqual(
    changes.filter(([, , name]) => name === 'fixed'),
    [
      ['#custom-book .p2', 'add', 'fixed'],
      ['#custom-book .p19', 'add', 'fixed'],
    ],
  );
  changes.length = 0;
  handlers.turning.call(book[0], {}, 1);
  assert.deepEqual(
    changes.filter(([, , name]) => name === 'fixed'),
    [
      ['#custom-book .p2', 'remove', 'fixed'],
      ['#custom-book .p19', 'add', 'fixed'],
    ],
  );
});

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

  const cropForPage = context.window.SiteReader.TurnAdapter.paperCropForPage;
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
