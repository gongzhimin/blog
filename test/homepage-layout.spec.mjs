import { test, expect } from "@playwright/test";

test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.loli.net/**", (route) => route.abort());
  await page.route("https://gstatic.loli.net/**", (route) => route.abort());
});

async function readBookState(page) {
  await expect(page.locator("#canvas")).toBeVisible();
  await expect(page.locator(".sj-book")).toBeVisible();

  return page.evaluate(() => {
    const data = document.querySelector("#book-data");
    const config = JSON.parse(data.dataset.config);
    const canvas = document.querySelector("#canvas");
    const book = document.querySelector(".sj-book");
    const zoom = document.querySelector("#book-zoom");
    const flipbook = window.jQuery ? window.jQuery(book) : null;
    const currentPage =
      flipbook && flipbook.turn("is") ? flipbook.turn("page") : null;
    const turnPages =
      flipbook && flipbook.turn("is") ? flipbook.turn("pages") : null;
    const currentView =
      flipbook && flipbook.turn("is") ? flipbook.turn("view") : [];
    const visiblePageText = currentView
      .map((pageNumber) => {
        const pageNode = document.querySelector(`.sj-book .p${pageNumber}`);
        return pageNode ? pageNode.textContent : "";
      })
      .join("\n");

    return {
      config,
      articleCount: config.articles.length,
      toc: config.toc,
      currentPage,
      turnPages,
      currentView,
      display: flipbook && flipbook.turn("is") ? flipbook.turn("display") : null,
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
    const book = document.querySelector(".sj-book");
    const flipbook = window.jQuery ? window.jQuery(book) : null;
    return flipbook && flipbook.turn("is") ? flipbook.turn("page") : null;
  });
}

async function dispatchTouchSwipe(page, selector, points) {
  await page.evaluate(
    ({ selector, points }) => {
      const target = document.querySelector(selector);
      if (!target) throw new Error(`Missing touch target: ${selector}`);

      function createTouch(point) {
        if (typeof Touch === "function") {
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
        const event =
          typeof TouchEvent === "function"
            ? new TouchEvent(type, {
                bubbles: true,
                cancelable: true,
                touches: touchList,
                targetTouches: touchList,
                changedTouches,
              })
            : new Event(type, { bubbles: true, cancelable: true });

        if (typeof TouchEvent !== "function") {
          Object.defineProperty(event, "touches", { value: touchList });
          Object.defineProperty(event, "targetTouches", { value: touchList });
          Object.defineProperty(event, "changedTouches", {
            value: changedTouches,
          });
        }
        target.dispatchEvent(event);
      }

      dispatch("touchstart", points[0], true);
      for (const point of points.slice(1, -1)) {
        dispatch("touchmove", point, true);
      }
      dispatch("touchend", points.at(-1), false);
    },
    { selector, points },
  );
}

test("book depth stays mounted during corner previews", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const book = page.locator(".sj-book");
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
    await page.waitForTimeout(180);

    const state = await page.evaluate(() => {
      const root = document.querySelector(".sj-book");
      const backPage = root.querySelector(".back-side");
      const backWrapper = backPage?.closest(".page-wrapper");
      const book = window.jQuery(root);
      const bookRect = root.getBoundingClientRect();
      return {
        animating: book.turn("animating"),
        movingPages: [...book.data().pageMv],
        book: bookRect.toJSON(),
        backWrapperZ: backWrapper
          ? getComputedStyle(backWrapper).zIndex
          : null,
        underlays: Array.from(
          root.querySelectorAll(":scope > .book-cover-underlay"),
        ).map((layer) => {
          const rect = layer.getBoundingClientRect();
          const style = getComputedStyle(layer);
          const frameStyle = getComputedStyle(layer, "::before");
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
            inPageWrapper: Boolean(layer.closest(".page-wrapper")),
          };
        }),
        layers: Array.from(root.querySelectorAll(":scope > .book-depth")).map(
          (layer) => {
            const rect = layer.getBoundingClientRect();
            return {
              connected: layer.isConnected,
              display: getComputedStyle(layer).display,
              width: rect.width,
              height: rect.height,
              inPageWrapper: Boolean(layer.closest(".page-wrapper")),
            };
          },
        ),
      };
    });

    expect(state.animating).toBe(true);
    expect(state.movingPages.length).toBeGreaterThan(0);
    expect(state.backWrapperZ).toBe("-1");
    expect(state.underlays).toHaveLength(2);
    for (const layer of state.underlays) {
      expect(layer.connected).toBe(true);
      expect(layer.display).toBe("block");
      expect(layer.visibility).toBe("visible");
      expect(layer.opacity).toBe("1");
      expect(layer.zIndex).toBe("0");
      expect(layer.backgroundImage).not.toContain(
        "/vendor/turnjs/pics/book-covers.jpg",
      );
      expect(layer.frameBackgroundImage).toContain(
        "/vendor/turnjs/pics/book-covers.jpg",
      );
      expect(layer.frameClipPath).not.toBe("none");
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
      expect(layer.display).toBe("block");
      expect(layer.width).toBeGreaterThan(0);
      expect(layer.height).toBeGreaterThan(0);
      expect(layer.inPageWrapper).toBe(false);
    }

    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.waitForTimeout(900);
  }
});

test("cover underlays stay mounted across consecutive page turns", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sj-book")).toBeVisible();

  for (let turn = 0; turn < 3; turn += 1) {
    await page.evaluate(() => window.jQuery(".sj-book").turn("next"));
    await page.waitForTimeout(100);

    const state = await page.evaluate(() => {
      const root = document.querySelector(".sj-book");
      const backPage = root.querySelector(".back-side");
      const backWrapper = backPage?.closest(".page-wrapper");
      return {
        animating: window.jQuery(root).turn("animating"),
        backWrapperZ: backWrapper
          ? getComputedStyle(backWrapper).zIndex
          : null,
        layers: Array.from(
          root.querySelectorAll(":scope > .book-cover-underlay"),
        ).map((layer) => {
          const rect = layer.getBoundingClientRect();
          return {
            connected: layer.isConnected,
            display: getComputedStyle(layer).display,
            width: rect.width,
            height: rect.height,
            inPageWrapper: Boolean(layer.closest(".page-wrapper")),
          };
        }),
      };
    });

    expect(state.animating).toBe(true);
    expect(state.backWrapperZ).toBe("-1");
    expect(state.layers).toHaveLength(2);
    for (const layer of state.layers) {
      expect(layer.connected).toBe(true);
      expect(layer.display).toBe("block");
      expect(layer.width).toBeGreaterThan(0);
      expect(layer.height).toBeGreaterThan(0);
      expect(layer.inPageWrapper).toBe(false);
    }

    await page.waitForTimeout(900);
  }
});

test("closed covers hide overlapping underlays and page depth", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sj-book")).toBeVisible();

  const totalPages = await page.evaluate(() =>
    window.jQuery(".sj-book").turn("pages"),
  );
  const endpoints = [
    {
      pageNumber: 1,
      hiddenDepth: "back",
    },
    {
      pageNumber: totalPages,
      hiddenDepth: "front",
    },
  ];

  for (const endpoint of endpoints) {
    await page.evaluate(() => window.jQuery(".sj-book").turn("page", 5));
    await expect
      .poll(() => readCurrentTurnPage(page), { timeout: 5_000 })
      .toBe(5);
    await page.waitForTimeout(900);

    await page.evaluate(
      (pageNumber) => window.jQuery(".sj-book").turn("page", pageNumber),
      endpoint.pageNumber,
    );
    await page.waitForTimeout(100);

    const turningState = await page.evaluate(() => {
      const root = document.querySelector(".sj-book");
      const read = (selector) => {
        const node = root.querySelector(selector);
        const style = getComputedStyle(node);
        const frameStyle = getComputedStyle(node, "::before");
        return {
          display: style.display,
          width: node.getBoundingClientRect().width,
          backgroundImage: style.backgroundImage,
          frameBackgroundImage: frameStyle.backgroundImage,
          frameClipPath: frameStyle.clipPath,
        };
      };
      return {
        animating: window.jQuery(root).turn("animating"),
        front: read(".book-cover-underlay--front"),
        back: read(".book-cover-underlay--back"),
        frontDepth: read(".book-depth--front"),
        backDepth: read(".book-depth--back"),
      };
    });

    expect(turningState.animating).toBe(true);
    expect(turningState.front.display).toBe("block");
    expect(turningState.back.display).toBe("block");
    for (const side of [turningState.front, turningState.back]) {
      expect(side.backgroundImage).not.toContain("book-covers");
      expect(side.frameBackgroundImage).toContain("book-covers");
      expect(side.frameClipPath).not.toBe("none");
    }
    expect(turningState[`${endpoint.hiddenDepth}Depth`].display).toBe("block");
    expect(turningState[`${endpoint.hiddenDepth}Depth`].width).toBeGreaterThan(0);

    await expect
      .poll(() => readCurrentTurnPage(page), { timeout: 5_000 })
      .toBe(endpoint.pageNumber);
    await expect(page.locator(".sj-book")).toHaveClass(
      new RegExp(`book-at-${endpoint.pageNumber === 1 ? "first" : "last"}`),
      { timeout: 5_000 },
    );

    const state = await page.evaluate(() => {
      const root = document.querySelector(".sj-book");
      const read = (selector) => {
        const node = root.querySelector(selector);
        const style = getComputedStyle(node);
        const frameStyle = getComputedStyle(node, "::before");
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
        front: read(".book-cover-underlay--front"),
        back: read(".book-cover-underlay--back"),
        frontDepth: read(".book-depth--front"),
        backDepth: read(".book-depth--back"),
      };
    });

    expect(state.className).toContain(
      `book-at-${endpoint.pageNumber === 1 ? "first" : "last"}`,
    );
    expect(state.front.display).toBe("none");
    expect(state.front.width).toBe(0);
    expect(state.back.display).toBe("none");
    expect(state.back.width).toBe(0);
    expect(state[`${endpoint.hiddenDepth}Depth`].display).toBe("none");
    expect(state[`${endpoint.hiddenDepth}Depth`].width).toBe(0);

    const coverRect = await page.evaluate((pageNumber) => {
      const cover = document.querySelector(`.sj-book .p${pageNumber}`);
      return cover.getBoundingClientRect().toJSON();
    }, endpoint.pageNumber);
    await page.mouse.move(
      endpoint.pageNumber === 1
        ? coverRect.right - 20
        : coverRect.left + 20,
      coverRect.bottom - 20,
    );
    await page.waitForTimeout(180);

    const previewState = await page.evaluate(() => {
      const root = document.querySelector(".sj-book");
      const read = (selector) => {
        const node = root.querySelector(selector);
        const style = getComputedStyle(node);
        const frameStyle = getComputedStyle(node, "::before");
        return {
          display: style.display,
          width: node.getBoundingClientRect().width,
          backgroundImage: style.backgroundImage,
          frameBackgroundImage: frameStyle.backgroundImage,
          frameClipPath: frameStyle.clipPath,
        };
      };
      return {
        front: read(".book-cover-underlay--front"),
        back: read(".book-cover-underlay--back"),
        frontDepth: read(".book-depth--front"),
        backDepth: read(".book-depth--back"),
      };
    });

    expect(previewState.front.display).toBe("block");
    expect(previewState.back.display).toBe("block");
    for (const side of [previewState.front, previewState.back]) {
      expect(side.backgroundImage).not.toContain("book-covers");
      expect(side.frameBackgroundImage).toContain("book-covers");
      expect(side.frameClipPath).not.toBe("none");
    }
    expect(previewState[`${endpoint.hiddenDepth}Depth`].display).toBe("block");
    expect(previewState[`${endpoint.hiddenDepth}Depth`].width).toBeGreaterThan(0);

    await page.mouse.move(
      coverRect.left + coverRect.width / 2,
      coverRect.top + coverRect.height / 2,
    );
    await page.waitForTimeout(900);
  }
});

test("homepage initializes the configured turnjs book", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const state = await readBookState(page);

  expect(state.canvasVisibility).toBe("visible");
  expect(state.config.book.width).toBe(960);
  expect(state.config.book.height).toBe(600);
  expect(state.config.book.turn.startPage).toBe(7);
  expect(state.turnPages % 2).toBe(0);
  expect(state.currentPage).toBe(5);
  expect(state.currentView).toContain(5);
  expect(state.backPageExists).toBe(true);
  expect(state.toc).toContain("目录");
  expect(state.articleCount).toBeGreaterThan(3);
  expect(state.book.width).toBeGreaterThan(900);
  expect(state.book.height).toBeGreaterThan(560);
  expect(state.bookText).toMatch(/目录|失重|答案|手机写博客指南/);
  expect(state.bookText).not.toContain("Tips");
  expect(state.visiblePageText).toMatch(/目录/);
  expect(state.visiblePageText).not.toContain("Tips");

  await page.screenshot({
    path: "test-results/homepage-turnjs-desktop.png",
    fullPage: true,
  });
});

test("navigation and footer stay configured around the book", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator(".site-nav .brand")).toHaveText("ZHIMIN");
  await expect(page.locator(".site-nav .links a")).toHaveCount(5);
  await expect(page.locator(".site-nav .links a").nth(0)).toHaveAttribute(
    "href",
    "/life",
  );
  await expect(page.locator(".site-nav .links a").nth(4)).toHaveAttribute(
    "href",
    "/classic",
  );
  await expect(page.locator(".site-footer .quote")).toBeVisible();
  await expect(page.locator(".site-footer .copyright")).toContainText(
    "Zhimin 的博客书",
  );

  const initialTop = (await page.locator(".site-nav").boundingBox()).y;
  await page.evaluate(() => window.scrollTo({ left: 0, top: 500 }));
  const scrolledTop = (await page.locator(".site-nav").boundingBox()).y;
  expect(scrolledTop).toBe(initialTop);
});

test("narrow viewport keeps the book usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const state = await readBookState(page);

  expect(state.display).toBe("single");
  expect(state.currentView).toHaveLength(1);
  expect(state.scrollWidth).toBe(state.innerWidth);
  expect(state.scrollHeight).toBeGreaterThanOrEqual(state.innerHeight);
  expect(state.book.width).toBe(370);
  await expect(page.locator(".site-nav .links a")).toHaveCount(5);

  const underlays = await page.evaluate(() => {
    const root = document.querySelector(".sj-book");
    return ["front", "back"].map((side) => {
      const node = root.querySelector(`.book-cover-underlay--${side}`);
      const rect = node.getBoundingClientRect();
      return {
        side,
        display: getComputedStyle(node).display,
        backgroundImage: getComputedStyle(node).backgroundImage,
        frameDisplay: getComputedStyle(node, "::before").display,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        bookLeft: root.getBoundingClientRect().left,
      };
    });
  });
  expect(underlays[0]).toMatchObject({
    side: "front",
    display: "block",
    frameDisplay: "none",
    width: 370,
    height: 507,
  });
  expect(underlays[0].backgroundImage).not.toContain("book-covers");
  expect(underlays[0].left).toBeCloseTo(underlays[0].bookLeft, 0);
  expect(underlays[1]).toMatchObject({ side: "back", display: "none" });

  await page.screenshot({
    path: "test-results/homepage-turnjs-mobile.png",
    fullPage: true,
  });
});

test("mobile touch swipe turns pages without hijacking vertical scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sj-book")).toBeVisible();

  const initialPage = await readCurrentTurnPage(page);
  await dispatchTouchSwipe(page, "#book-zoom", [
    { x: 320, y: 360 },
    { x: 245, y: 362 },
    { x: 170, y: 364 },
  ]);

  await expect
    .poll(() => readCurrentTurnPage(page))
    .toBe(initialPage + 1);

  const afterHorizontalSwipe = await readCurrentTurnPage(page);
  await dispatchTouchSwipe(page, "#book-zoom", [
    { x: 200, y: 260 },
    { x: 205, y: 360 },
    { x: 207, y: 470 },
  ]);

  await page.waitForTimeout(250);
  expect(await readCurrentTurnPage(page)).toBe(afterHorizontalSwipe);
});

test("paper texture crops are assigned per rendered page", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sj-book")).toBeVisible();

  await page.evaluate(async () => {
    const book = window.jQuery(document.querySelector(".sj-book"));
    book.turn("options", { duration: 0 });
    for (const pageNumber of [5, 7, 9, 11, 13]) {
      book.turn("page", pageNumber);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  });

  const crops = await page.evaluate(() =>
    [...document.querySelectorAll(".sj-book .own-size")]
      .map((node) => {
        const style = getComputedStyle(node);
        return {
          className: node.className,
          x: style.getPropertyValue("--paper-x").trim(),
          y: style.getPropertyValue("--paper-y").trim(),
        };
      })
      .filter((crop) => crop.x && crop.y),
  );

  expect(crops.length).toBeGreaterThanOrEqual(6);
  expect(new Set(crops.map((crop) => `${crop.x},${crop.y}`)).size).toBe(
    crops.length,
  );
  expect(crops.some((crop) => crop.x === "50%" && crop.y === "50%")).toBe(
    false,
  );
});
