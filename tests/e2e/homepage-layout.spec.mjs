import { test, expect } from './support/fixture.mjs';

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.loli.net/**', (route) => route.abort());
  await page.route('https://gstatic.loli.net/**', (route) => route.abort());
});

async function readSurfacePixels(page, clip) {
  const screenshot = await page.screenshot({ clip });
  return page.evaluate(
    async (data) => {
      const image = new Image();
      image.src = data;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return [0, Math.floor((image.height - 1) / 2), image.height - 1].map(
        (y) => [...context.getImageData(0, y, 1, 1).data].slice(0, 3),
      );
    },
    'data:image/png;base64,' + screenshot.toString('base64'),
  );
}

for (const side of ['front', 'back']) {
  test(`${side} inner cover remains painted during adjacent-page preview and drag`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1200, height: 820 });
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.jQuery?.('.sj-book').turn('is'));
    const innerPage = await page.evaluate(
      (side) =>
        side === 'front' ? 2 : window.jQuery('.sj-book').turn('pages') - 1,
      side,
    );
    await page.evaluate(
      (n) => window.jQuery('.sj-book').turn('page', n),
      innerPage,
    );
    await waitForTurnMotion(page, false);
    // A known surface colour detects real occlusion, not merely DOM existence.
    await page.evaluate((n) => {
      const node = window.jQuery('.sj-book').data().pageObjs[n][0];
      node.style.setProperty('background-image', 'none', 'important');
      node.style.setProperty(
        'background-color',
        'rgb(23, 187, 83)',
        'important',
      );
    }, innerPage);
    const bounds = await page.locator('.sj-book').boundingBox();
    // An outer column stays clear of the adjacent moving leaf in the early
    // committed-turn window. Later frames can legitimately cover the inner page.
    const sample = {
      x: Math.round(
        side === 'front' ? bounds.x + 60 : bounds.x + bounds.width - 60,
      ),
      y: Math.round(bounds.y + bounds.height * 0.3),
      width: 1,
      height: Math.round(bounds.height * 0.4),
    };
    const surface = Array.from({ length: 3 }, () => [23, 187, 83]);
    expect(await readSurfacePixels(page, sample)).toEqual(surface);
    // A small obstruction away from the old centre-only sample must be detected.
    await page.evaluate((clip) => {
      const mask = document.createElement('div');
      mask.id = 'pixel-calibration-mask';
      Object.assign(mask.style, {
        position: 'fixed',
        left: clip.x - 2 + 'px',
        top: clip.y + clip.height - 3 + 'px',
        width: '5px',
        height: '5px',
        background: 'rgb(255,0,255)',
        zIndex: '2147483647',
        pointerEvents: 'none',
      });
      document.body.appendChild(mask);
    }, sample);
    try {
      expect(await readSurfacePixels(page, sample)).toEqual([
        surface[0],
        surface[1],
        [255, 0, 255],
      ]);
    } finally {
      await page.evaluate(() =>
        document.querySelector('#pixel-calibration-mask').remove(),
      );
    }
    await page.evaluate(() =>
      window.jQuery('.sj-book').turn('options', { duration: 2000 }),
    );
    const cornerX =
      side === 'front' ? bounds.x + bounds.width - 35 : bounds.x + 35;
    await page.mouse.move(cornerX, bounds.y + 35);
    await waitForTurnMotion(page, true);
    await waitForPreviewExpansion(page);
    for (const phase of ['preview', 'drag', 'committed turn']) {
      if (phase === 'drag') {
        await page.mouse.down();
        await page.mouse.move(
          cornerX + (side === 'front' ? -180 : 180),
          bounds.y + 170,
          { steps: 8 },
        );
      }
      if (phase === 'committed turn') {
        await page.mouse.up();
        await page.mouse.move(20, 20);
        await waitForTurnMotion(page, false);
        // Releasing the drag can commit on either engine. Start the keyboard
        // scenario from the same inner-cover spread, not from that drag result.
        await page.evaluate(
          (n) => window.jQuery('.sj-book').turn('page', n),
          innerPage,
        );
        await waitForTurnMotion(page, false);
        await page.keyboard.press(
          side === 'front' ? 'ArrowRight' : 'ArrowLeft',
        );
        await waitForTurnMotion(page, true);
      }
      for (let frame = 0; frame < 4; frame++) {
        const pixels = await readSurfacePixels(page, sample);
        expect(
          pixels,
          `${phase}, sample ${frame}: visible inner-cover surface`,
        ).toEqual(surface);
      }
      await testInfo.attach(`${phase}-inner-cover`, {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    }
    await page.mouse.move(20, 20);
    await waitForTurnMotion(page, false);
  });
}

for (const scenario of [
  { name: 'front opening', side: 'front', from: 1, to: 2 },
  { name: 'front closing', side: 'front', from: 2, to: 1 },
  { name: 'back opening', side: 'back', from: -1, to: -2 },
  { name: 'back closing', side: 'back', from: -2, to: -1 },
]) {
  test(`${scenario.name} has no stationary phantom cover during animation`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1200, height: 820 });
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForFunction(() => window.jQuery?.('.sj-book').turn('is'));
    const total = await page.evaluate(() =>
      window.jQuery('.sj-book').turn('pages'),
    );
    const resolve = (n) => (n > 0 ? n : total + n + 1);
    const from = resolve(scenario.from);
    const to = resolve(scenario.to);

    for (const input of ['keyboard', 'mouse']) {
      await page.mouse.move(20, 20);
      await page.evaluate(
        (n) => window.jQuery('.sj-book').turn('page', n),
        from,
      );
      await waitForTurnMotion(page, false);
      await page.evaluate((side) => {
        const book = window.jQuery('.sj-book');
        const trace = (window.coverMotionTrace = {
          frames: [],
          targets: [],
          completed: [],
          finished: false,
        });
        let observedMotion = false;
        book
          .off('.coverMotionTrace')
          .on('turning.coverMotionTrace', (_e, target) =>
            trace.targets.push(target),
          )
          .on('turned.coverMotionTrace', (_e, target) =>
            trace.completed.push(target),
          );
        function observe() {
          const motion = book.turn('animating');
          if (motion) {
            observedMotion = true;
            trace.frames.push({
              page: book.turn('page'),
              view: book.turn('view'),
              moving: [...book.data().pageMv],
              margin: getComputedStyle(book[0]).marginLeft,
              underlay: getComputedStyle(
                book[0].querySelector('.book-cover-underlay--' + side),
              ).display,
              depth: getComputedStyle(
                book[0].querySelector('.book-depth--' + side),
              ).display,
              oppositeUnderlay: getComputedStyle(
                book[0].querySelector(
                  '.book-cover-underlay--' +
                    (side === 'front' ? 'back' : 'front'),
                ),
              ).display,
            });
          }
          if (observedMotion && !motion) {
            trace.finished = true;
            return;
          }
          requestAnimationFrame(observe);
        }
        requestAnimationFrame(observe);
      }, scenario.side);

      if (input === 'keyboard') {
        await page.keyboard.press(to > from ? 'ArrowRight' : 'ArrowLeft');
      } else {
        const bounds = await page.locator('.sj-book').boundingBox();
        await page.mouse.move(
          to > from ? bounds.x + bounds.width - 10 : bounds.x + 10,
          bounds.y + bounds.height - 10,
        );
        await waitForTurnMotion(page, true);
        await page.mouse.down();
        await page.mouse.up();
        await waitForTurnMotion(page, true);
        await page.mouse.move(20, 20);
      }
      await page.waitForFunction(() => window.coverMotionTrace.finished);
      const trace = await page.evaluate(() => window.coverMotionTrace);
      await testInfo.attach(`${input}-animation-frames`, {
        body: JSON.stringify(trace),
        contentType: 'application/json',
      });
      expect(trace.targets).toEqual([to]);
      expect(trace.completed).toEqual([to]);
      expect(trace.frames.length).toBeGreaterThan(2);
      expect(
        trace.frames.filter(
          (frame) => frame.underlay !== 'none' || frame.depth !== 'none',
        ),
        `${input}: a stationary cover surface was painted during the rotating cover`,
      ).toEqual([]);
      expect(
        trace.frames.filter(
          (frame) => frame.page === to && frame.oppositeUnderlay !== 'block',
        ),
        'The stationary opposite cover must still support its inner page',
      ).toEqual([]);
      expect(
        await page.evaluate(() => window.jQuery('.sj-book').turn('page')),
      ).toBe(to);
      await expect(page.locator('.sj-book')).not.toHaveClass(
        /book-cover-moving-/,
      );
      await expect(
        page.locator('.book-cover-underlay--' + scenario.side),
      ).toHaveCSS('display', to === 1 || to === total ? 'none' : 'block');
      await page.mouse.move(20, 20);
    }
  });
}

test('closed cover previews keep underlays hidden and rapid leave permits another turn', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.jQuery?.('.sj-book').turn('is'));
  const last = await page.evaluate(() =>
    window.jQuery('.sj-book').turn('pages'),
  );
  for (const endpoint of [1, last]) {
    await page.mouse.move(20, 20);
    await page.evaluate(
      (n) => window.jQuery('.sj-book').turn('page', n),
      endpoint,
    );
    await waitForTurnMotion(page, false);
    await expect(page.locator('.sj-book')).toHaveClass(
      endpoint === 1 ? /book-at-first/ : /book-at-last/,
    );
    const bounds = await page.locator('.sj-book').boundingBox();
    const corner =
      endpoint === 1 ? bounds.x + bounds.width - 10 : bounds.x + 10;
    await page.mouse.move(corner, bounds.y + bounds.height - 10);
    await waitForTurnMotion(page, true);
    const hover = await page.evaluate(() => {
      const book = window.jQuery('.sj-book');
      return {
        view: book.turn('view'),
        underlays: [...document.querySelectorAll('.book-cover-underlay')].map(
          (e) => getComputedStyle(e).display,
        ),
      };
    });
    expect(hover.view).toEqual(endpoint === 1 ? [0, 1] : [last, 0]);
    // Leave before the 500 ms preview expansion has completed.
    await page.mouse.move(20, 20);
    await waitForTurnMotion(page, false);
    expect(hover.underlays).toEqual(['none', 'none']);
    await expect(page.locator('.sj-book')).toHaveClass(
      endpoint === 1 ? /book-at-first/ : /book-at-last/,
    );
    await page.mouse.move(
      bounds.x + bounds.width * (endpoint === 1 ? 0.75 : 0.25),
      bounds.y + bounds.height / 2,
    );
    await page.evaluate(() => window.jQuery('.sj-book').turn('page', 4));
    await waitForTurnMotion(page, true);
    // Leaving during a committed turn must not cancel or redirect that turn.
    await page.mouse.move(20, 20);
    await waitForTurnMotion(page, false);
    await expect(page.locator('.sj-book .p4')).toContainText('出版说明');
    await expect(page.locator('.sj-book .p4 .imprint-page')).toBeVisible();
    expect(
      await page.evaluate(() => window.jQuery('.sj-book').turn('view')),
    ).toEqual([4, 5]);
  }
});

test('title artwork uses its configured sprite scale without a paper overlay', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.jQuery?.('.sj-book').turn('is'));
  await page.evaluate(() => window.jQuery('.sj-book').turn('page', 2));
  await waitForTurnMotion(page, false);
  const artwork = await page.evaluate(() => {
    const config = JSON.parse(
      document.querySelector('#book-data').dataset.config,
    );
    const node = document.querySelector('.sj-book .p3');
    const style = getComputedStyle(node);
    return {
      sprite: config.book.coverSprite,
      image: style.backgroundImage,
      size: style.backgroundSize,
      position: style.backgroundPosition,
      overlay: getComputedStyle(node, '::before').backgroundImage,
    };
  });
  expect(artwork.image).toContain(artwork.sprite.image);
  expect(artwork.size).toBe(artwork.sprite.backgroundSize);
  const expectedPosition = await page.evaluate((position) => {
    const node = document.createElement('div');
    node.style.backgroundPosition = position;
    document.body.appendChild(node);
    const normalized = getComputedStyle(node).backgroundPosition;
    node.remove();
    return normalized;
  }, artwork.sprite.positions.titlePage || artwork.sprite.positions.backInside);
  expect(artwork.position).toBe(expectedPosition);
  expect(artwork.overlay).toBe('none');
  await expect(page.locator('.sj-book .p3 .title-page__title')).toBeVisible();
});

async function readBookState(page) {
  await expect(page.locator('#canvas')).toBeVisible();
  await expect(page.locator('.sj-book')).toBeVisible();

  return page.evaluate(() => {
    const data = document.querySelector('#book-data');
    const config = JSON.parse(data.dataset.config);
    const canvas = document.querySelector('#canvas');
    const book = document.querySelector('.sj-book');
    const zoom = document.querySelector('#book-zoom');
    const flipbook = window.jQuery ? window.jQuery(book) : null;
    const currentPage =
      flipbook && flipbook.turn('is') ? flipbook.turn('page') : null;
    const turnPages =
      flipbook && flipbook.turn('is') ? flipbook.turn('pages') : null;
    const currentView =
      flipbook && flipbook.turn('is') ? flipbook.turn('view') : [];
    const visiblePageText = currentView
      .map((pageNumber) => {
        const pageNode = document.querySelector(`.sj-book .p${pageNumber}`);
        return pageNode ? pageNode.textContent : '';
      })
      .join('\n');

    return {
      config,
      articleCount: config.articles.length,
      toc: config.toc,
      currentPage,
      turnPages,
      currentView,
      display:
        flipbook && flipbook.turn('is') ? flipbook.turn('display') : null,
      visiblePageText,
      canvasVisibility: getComputedStyle(canvas).visibility,
      book: book.getBoundingClientRect().toJSON(),
      bookText: book.textContent,
      zoom: zoom.getBoundingClientRect().toJSON(),
      backPageExists: Boolean(
        document.querySelector(`.sj-book .p${turnPages - 1}`),
      ),
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth,
      innerHeight,
    };
  });
}

async function readCurrentTurnPage(page) {
  return page.evaluate(() => {
    const book = document.querySelector('.sj-book');
    const flipbook = window.jQuery ? window.jQuery(book) : null;
    return flipbook && flipbook.turn('is') ? flipbook.turn('page') : null;
  });
}

async function waitForTurnMotion(page, active) {
  await page.waitForFunction(
    (expected) => {
      const $ = window.jQuery;
      return (
        typeof $?.fn?.turn === 'function' &&
        $('.sj-book').turn('is') &&
        $('.sj-book').turn('animating') === expected
      );
    },
    active,
    { timeout: 5_000 },
  );
}

async function waitForPreviewExpansion(page) {
  await page.waitForFunction(
    () => {
      const data = window.jQuery('.sj-book').data();
      return (
        data.pageMv.length > 0 &&
        data.pageMv.every((number) => !data.pages[number]?.flip('moving'))
      );
    },
    undefined,
    { timeout: 5_000 },
  );
}

async function dispatchTouchSwipe(page, selector, points) {
  await page.evaluate(
    ({ selector, points }) => {
      const target = document.querySelector(selector);
      if (!target) throw new Error(`Missing touch target: ${selector}`);

      function createTouch(point) {
        if (typeof Touch === 'function') {
          try {
            return new Touch({
              identifier: 1,
              target,
              clientX: point.x,
              clientY: point.y,
              screenX: point.x,
              screenY: point.y,
              pageX: point.x,
              pageY: point.y,
            });
          } catch {
            /* Some engines expose a non-constructible Touch. */
          }
        }

        return {
          identifier: 1,
          target,
          clientX: point.x,
          clientY: point.y,
          screenX: point.x,
          screenY: point.y,
          pageX: point.x,
          pageY: point.y,
        };
      }

      function dispatch(type, point, active) {
        const touch = createTouch(point);
        const touchList = active ? [touch] : [];
        const changedTouches = [touch];
        let event;
        try {
          event = new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches: touchList,
            targetTouches: touchList,
            changedTouches,
          });
        } catch {
          event = new Event(type, { bubbles: true, cancelable: true });
          Object.defineProperty(event, 'touches', { value: touchList });
          Object.defineProperty(event, 'targetTouches', { value: touchList });
          Object.defineProperty(event, 'changedTouches', {
            value: changedTouches,
          });
        }
        target.dispatchEvent(event);
      }

      dispatch('touchstart', points[0], true);
      for (const point of points.slice(1, -1)) {
        dispatch('touchmove', point, true);
      }
      dispatch('touchend', points.at(-1), false);
    },
    { selector, points },
  );
}

test('book depth stays mounted during corner previews', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const book = page.locator('.sj-book');
  await expect(book).toBeVisible();
  const bounds = await book.boundingBox();
  expect(bounds).not.toBeNull();

  const corners = [
    { x: bounds.x + 30, y: bounds.y + 20 },
    { x: bounds.x + bounds.width - 30, y: bounds.y + 20 },
    { x: bounds.x + 30, y: bounds.y + bounds.height - 18 },
    {
      x: bounds.x + bounds.width - 30,
      y: bounds.y + bounds.height - 18,
    },
  ];

  for (const corner of corners) {
    await page.mouse.move(corner.x, corner.y);
    await waitForTurnMotion(page, true);

    const state = await page.evaluate(() => {
      const root = document.querySelector('.sj-book');
      const backPage = root.querySelector('.back-side');
      const backWrapper = backPage?.closest('.page-wrapper');
      const book = window.jQuery(root);
      const bookRect = root.getBoundingClientRect();
      return {
        animating: book.turn('animating'),
        movingPages: [...book.data().pageMv],
        book: bookRect.toJSON(),
        backWrapperZ: backWrapper ? getComputedStyle(backWrapper).zIndex : null,
        underlays: Array.from(
          root.querySelectorAll(':scope > .book-cover-underlay'),
        ).map((layer) => {
          const rect = layer.getBoundingClientRect();
          const style = getComputedStyle(layer);
          const frameStyle = getComputedStyle(layer, '::before');
          return {
            connected: layer.isConnected,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            zIndex: style.zIndex,
            backgroundImage: style.backgroundImage,
            frameBackgroundImage: frameStyle.backgroundImage,
            frameBackgroundPosition: frameStyle.backgroundPosition,
            frameClipPath: frameStyle.clipPath,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
            inPageWrapper: Boolean(layer.closest('.page-wrapper')),
          };
        }),
        layers: Array.from(root.querySelectorAll(':scope > .book-depth')).map(
          (layer) => {
            const rect = layer.getBoundingClientRect();
            return {
              connected: layer.isConnected,
              display: getComputedStyle(layer).display,
              width: rect.width,
              height: rect.height,
              inPageWrapper: Boolean(layer.closest('.page-wrapper')),
            };
          },
        ),
      };
    });

    expect(state.animating).toBe(true);
    expect(state.movingPages.length).toBeGreaterThan(0);
    expect(state.backWrapperZ).toBe('-1');
    expect(state.underlays).toHaveLength(2);
    for (const layer of state.underlays) {
      expect(layer.connected).toBe(true);
      expect(layer.display).toBe('block');
      expect(layer.visibility).toBe('visible');
      expect(layer.opacity).toBe('1');
      expect(layer.zIndex).toBe('0');
      expect(layer.backgroundImage).not.toContain(
        '/vendor/turnjs/pics/book-covers.jpg',
      );
      expect(layer.frameBackgroundImage).toContain(
        '/vendor/turnjs/pics/book-covers.jpg',
      );
      expect(layer.frameClipPath).not.toBe('none');
      expect(layer.width).toBeGreaterThan(0);
      expect(layer.height).toBeGreaterThan(0);
      expect(layer.inPageWrapper).toBe(false);
    }
    expect(state.underlays[0].frameBackgroundPosition).not.toBe(
      state.underlays[1].frameBackgroundPosition,
    );
    expect(state.underlays[0].left).toBeCloseTo(state.book.left, 0);
    expect(state.underlays[1].right).toBeCloseTo(state.book.right, 0);
    expect(state.layers).toHaveLength(2);
    for (const layer of state.layers) {
      expect(layer.connected).toBe(true);
      expect(layer.display).toBe('block');
      expect(layer.width).toBeGreaterThan(0);
      expect(layer.height).toBeGreaterThan(0);
      expect(layer.inPageWrapper).toBe(false);
    }

    await waitForPreviewExpansion(page);
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await waitForTurnMotion(page, false);
  }
});

test('cover underlays stay mounted across consecutive page turns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sj-book')).toBeVisible();

  for (let turn = 0; turn < 3; turn += 1) {
    await page.evaluate(() => window.jQuery('.sj-book').turn('next'));
    await waitForTurnMotion(page, true);

    const state = await page.evaluate(() => {
      const root = document.querySelector('.sj-book');
      const backPage = root.querySelector('.back-side');
      const backWrapper = backPage?.closest('.page-wrapper');
      return {
        animating: window.jQuery(root).turn('animating'),
        backWrapperZ: backWrapper ? getComputedStyle(backWrapper).zIndex : null,
        layers: Array.from(
          root.querySelectorAll(':scope > .book-cover-underlay'),
        ).map((layer) => {
          const rect = layer.getBoundingClientRect();
          return {
            connected: layer.isConnected,
            display: getComputedStyle(layer).display,
            width: rect.width,
            height: rect.height,
            inPageWrapper: Boolean(layer.closest('.page-wrapper')),
          };
        }),
      };
    });

    expect(state.animating).toBe(true);
    expect(state.backWrapperZ).toBe('-1');
    expect(state.layers).toHaveLength(2);
    for (const layer of state.layers) {
      expect(layer.connected).toBe(true);
      expect(layer.display).toBe('block');
      expect(layer.width).toBeGreaterThan(0);
      expect(layer.height).toBeGreaterThan(0);
      expect(layer.inPageWrapper).toBe(false);
    }

    await waitForTurnMotion(page, false);
  }
});

test('closed covers hide overlapping underlays and page depth', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sj-book')).toBeVisible();

  const totalPages = await page.evaluate(() =>
    window.jQuery('.sj-book').turn('pages'),
  );
  const endpoints = [
    {
      pageNumber: 1,
      hiddenDepth: 'back',
    },
    {
      pageNumber: totalPages,
      hiddenDepth: 'front',
    },
  ];

  for (const endpoint of endpoints) {
    await page.evaluate(() => window.jQuery('.sj-book').turn('page', 5));
    await expect
      .poll(() => readCurrentTurnPage(page), { timeout: 5_000 })
      .toBe(5);
    await waitForTurnMotion(page, false);

    await page.evaluate(
      (pageNumber) => window.jQuery('.sj-book').turn('page', pageNumber),
      endpoint.pageNumber,
    );
    await waitForTurnMotion(page, true);

    const turningState = await page.evaluate(() => {
      const root = document.querySelector('.sj-book');
      const read = (selector) => {
        const node = root.querySelector(selector);
        const style = getComputedStyle(node);
        const frameStyle = getComputedStyle(node, '::before');
        return {
          display: style.display,
          width: node.getBoundingClientRect().width,
          backgroundImage: style.backgroundImage,
          frameBackgroundImage: frameStyle.backgroundImage,
          frameClipPath: frameStyle.clipPath,
        };
      };
      return {
        animating: window.jQuery(root).turn('animating'),
        front: read('.book-cover-underlay--front'),
        back: read('.book-cover-underlay--back'),
        frontDepth: read('.book-depth--front'),
        backDepth: read('.book-depth--back'),
      };
    });

    expect(turningState.animating).toBe(true);
    const motionSide = endpoint.pageNumber === 1 ? 'front' : 'back';
    expect(turningState[motionSide].display).toBe('none');
    expect(turningState[motionSide].width).toBe(0);
    expect(turningState[endpoint.hiddenDepth].display).toBe('block');
    expect(turningState[`${motionSide}Depth`].display).toBe('none');
    expect(turningState[`${motionSide}Depth`].width).toBe(0);
    for (const side of [turningState.front, turningState.back]) {
      expect(side.backgroundImage).not.toContain('book-covers');
      expect(side.frameBackgroundImage).toContain('book-covers');
      expect(side.frameClipPath).not.toBe('none');
    }
    expect(turningState[`${endpoint.hiddenDepth}Depth`].display).toBe('block');
    expect(turningState[`${endpoint.hiddenDepth}Depth`].width).toBeGreaterThan(
      0,
    );

    await expect
      .poll(() => readCurrentTurnPage(page), { timeout: 5_000 })
      .toBe(endpoint.pageNumber);
    await expect(page.locator('.sj-book')).toHaveClass(
      new RegExp(`book-at-${endpoint.pageNumber === 1 ? 'first' : 'last'}`),
      { timeout: 5_000 },
    );

    const state = await page.evaluate(() => {
      const root = document.querySelector('.sj-book');
      const read = (selector) => {
        const node = root.querySelector(selector);
        const style = getComputedStyle(node);
        const frameStyle = getComputedStyle(node, '::before');
        return {
          display: style.display,
          width: node.getBoundingClientRect().width,
          backgroundImage: style.backgroundImage,
          frameBackgroundImage: frameStyle.backgroundImage,
          frameClipPath: frameStyle.clipPath,
        };
      };
      return {
        className: root.className,
        front: read('.book-cover-underlay--front'),
        back: read('.book-cover-underlay--back'),
        frontDepth: read('.book-depth--front'),
        backDepth: read('.book-depth--back'),
      };
    });

    expect(state.className).toContain(
      `book-at-${endpoint.pageNumber === 1 ? 'first' : 'last'}`,
    );
    expect(state.front.display).toBe('none');
    expect(state.front.width).toBe(0);
    expect(state.back.display).toBe('none');
    expect(state.back.width).toBe(0);
    expect(state[`${endpoint.hiddenDepth}Depth`].display).toBe('none');
    expect(state[`${endpoint.hiddenDepth}Depth`].width).toBe(0);

    const coverRect = await page.evaluate((pageNumber) => {
      const cover = document.querySelector(`.sj-book .p${pageNumber}`);
      return cover.getBoundingClientRect().toJSON();
    }, endpoint.pageNumber);
    await page.mouse.move(
      endpoint.pageNumber === 1 ? coverRect.right - 20 : coverRect.left + 20,
      coverRect.bottom - 20,
    );
    await waitForTurnMotion(page, true);

    const previewState = await page.evaluate(() => {
      const root = document.querySelector('.sj-book');
      const read = (selector) => {
        const node = root.querySelector(selector);
        const style = getComputedStyle(node);
        const frameStyle = getComputedStyle(node, '::before');
        return {
          display: style.display,
          width: node.getBoundingClientRect().width,
          backgroundImage: style.backgroundImage,
          frameBackgroundImage: frameStyle.backgroundImage,
          frameClipPath: frameStyle.clipPath,
        };
      };
      return {
        front: read('.book-cover-underlay--front'),
        back: read('.book-cover-underlay--back'),
        frontDepth: read('.book-depth--front'),
        backDepth: read('.book-depth--back'),
      };
    });

    expect(previewState.front.display).toBe('none');
    expect(previewState.back.display).toBe('none');
    for (const side of [previewState.front, previewState.back]) {
      expect(side.backgroundImage).not.toContain('book-covers');
      expect(side.frameBackgroundImage).toContain('book-covers');
      expect(side.frameClipPath).not.toBe('none');
    }
    expect(previewState[`${endpoint.hiddenDepth}Depth`].display).toBe('none');
    expect(previewState[`${endpoint.hiddenDepth}Depth`].width).toBe(0);

    await waitForPreviewExpansion(page);
    await page.mouse.move(
      coverRect.left + coverRect.width / 2,
      coverRect.top + coverRect.height / 2,
    );
    await waitForTurnMotion(page, false);
  }
});

test('cover endpoint settles when plugin motion outlives the end callback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/');
  await page.waitForFunction(
    () =>
      typeof window.jQuery?.fn?.turn === 'function' &&
      window.jQuery('.sj-book').turn('is'),
  );
  await page.evaluate(() => {
    const book = window.jQuery('.sj-book');
    book.turn('options', { duration: 0 });
    book.turn('page', book.turn('pages'));
  });
  await expect(page.locator('.sj-book')).toHaveClass(/book-at-last/);
  await page.evaluate(() => {
    const $ = window.jQuery;
    const book = $('.sj-book');
    const events = book.turn('options').when;
    const originalTurn = $.fn.turn;
    const originalTimeout = window.setTimeout;
    const scheduled = [];
    let busy = true;
    try {
      $.fn.turn = function (command) {
        if (this[0] === book[0] && command === 'animating') return busy;
        return originalTurn.apply(this, arguments);
      };
      window.setTimeout = function (callback, delay) {
        if (delay === 1) {
          scheduled.push(callback);
          return -1;
        }
        return originalTimeout.apply(window, arguments);
      };
      // Exercise the actual adapter handlers while the plugin still reports motion.
      events.start.call(book[0], new Event('start'), {
        page: book.turn('pages'),
        next: book.turn('pages') - 1,
      });
      events.end.call(book[0]);
      for (const callback of scheduled) callback();
      busy = false;
    } finally {
      $.fn.turn = originalTurn;
      window.setTimeout = originalTimeout;
    }
  });
  await expect(page.locator('.sj-book')).toHaveClass(/book-at-last/);
  await expect(page.locator('.book-cover-underlay--back')).toBeHidden();
});

test('homepage initializes the configured turnjs book', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const state = await readBookState(page);

  expect(state.canvasVisibility).toBe('visible');
  expect(state.config.book.width).toBe(960);
  expect(state.config.book.height).toBe(600);
  expect(state.config.book.turn.startPage).toBe(7);
  expect(state.turnPages % 2).toBe(0);
  expect(state.currentPage).toBe(5);
  expect(state.currentView).toContain(5);
  expect(state.backPageExists).toBe(true);
  expect(state.toc).toContain('目录');
  expect(state.articleCount).toBeGreaterThan(3);
  expect(state.book.width).toBeGreaterThan(900);
  expect(state.book.height).toBeGreaterThan(560);
  expect(state.bookText).toMatch(/目录|失重|答案|手机写博客指南/);
  expect(state.bookText).not.toContain('Tips');
  expect(state.visiblePageText).toMatch(/目录/);
  expect(state.visiblePageText).not.toContain('Tips');

  await test.info().attach('homepage-turnjs-desktop', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('navigation and footer stay configured around the book', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('.site-nav .brand')).toHaveText('ZHIMIN');
  await expect(page.locator('.site-nav .links a')).toHaveCount(5);
  await expect(page.locator('.site-nav .links a').nth(0)).toHaveAttribute(
    'href',
    '/life',
  );
  await expect(page.locator('.site-nav .links a').nth(4)).toHaveAttribute(
    'href',
    '/classic',
  );
  await expect(page.locator('.site-footer .quote')).toBeVisible();
  await expect(page.locator('.site-footer .copyright')).toContainText(
    'Zhimin 的博客书',
  );

  const initialTop = (await page.locator('.site-nav').boundingBox()).y;
  await page.evaluate(() => window.scrollTo({ left: 0, top: 500 }));
  const scrolledTop = (await page.locator('.site-nav').boundingBox()).y;
  expect(scrolledTop).toBe(initialTop);
});

test('narrow viewport keeps the book usable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const state = await readBookState(page);

  expect(state.display).toBe('single');
  expect(state.currentView).toHaveLength(1);
  expect(state.scrollWidth).toBe(state.innerWidth);
  expect(state.scrollHeight).toBeGreaterThanOrEqual(state.innerHeight);
  expect(state.book.width).toBe(370);
  await expect(page.locator('.site-nav .links a')).toHaveCount(5);

  const underlays = await page.evaluate(() => {
    const root = document.querySelector('.sj-book');
    return ['front', 'back'].map((side) => {
      const node = root.querySelector(`.book-cover-underlay--${side}`);
      const rect = node.getBoundingClientRect();
      return {
        side,
        display: getComputedStyle(node).display,
        backgroundImage: getComputedStyle(node).backgroundImage,
        frameDisplay: getComputedStyle(node, '::before').display,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        bookLeft: root.getBoundingClientRect().left,
      };
    });
  });
  expect(underlays[0]).toMatchObject({
    side: 'front',
    display: 'block',
    frameDisplay: 'none',
    width: 370,
    height: 507,
  });
  expect(underlays[0].backgroundImage).not.toContain('book-covers');
  expect(underlays[0].left).toBeCloseTo(underlays[0].bookLeft, 0);
  expect(underlays[1]).toMatchObject({ side: 'back', display: 'none' });

  await test.info().attach('homepage-turnjs-mobile', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
});

test('mobile touch swipe turns pages without hijacking vertical scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sj-book')).toBeVisible();

  const initialPage = await readCurrentTurnPage(page);
  await dispatchTouchSwipe(page, '#book-zoom', [
    { x: 320, y: 360 },
    { x: 245, y: 362 },
    { x: 170, y: 364 },
  ]);

  await expect.poll(() => readCurrentTurnPage(page)).toBe(initialPage + 1);

  await waitForTurnMotion(page, false);
  const afterHorizontalSwipe = await readCurrentTurnPage(page);
  await dispatchTouchSwipe(page, '#book-zoom', [
    { x: 200, y: 260 },
    { x: 205, y: 360 },
    { x: 207, y: 470 },
  ]);

  await waitForTurnMotion(page, false);
  expect(await readCurrentTurnPage(page)).toBe(afterHorizontalSwipe);
});

test('paper texture crops are assigned per rendered page', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.sj-book')).toBeVisible();

  await page.evaluate(async () => {
    const book = window.jQuery(document.querySelector('.sj-book'));
    book.turn('options', { duration: 0 });
    for (const pageNumber of [5, 7, 9, 11, 13]) {
      book.turn('page', pageNumber);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  });

  const crops = await page.evaluate(() =>
    [...document.querySelectorAll('.sj-book .own-size')]
      .map((node) => {
        const style = getComputedStyle(node);
        return {
          className: node.className,
          x: style.getPropertyValue('--paper-x').trim(),
          y: style.getPropertyValue('--paper-y').trim(),
        };
      })
      .filter((crop) => crop.x && crop.y),
  );

  expect(crops.length).toBeGreaterThanOrEqual(6);
  expect(new Set(crops.map((crop) => `${crop.x},${crop.y}`)).size).toBe(
    crops.length,
  );
  expect(crops.some((crop) => crop.x === '50%' && crop.y === '50%')).toBe(
    false,
  );
});
