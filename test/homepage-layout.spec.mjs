import { test, expect } from "@playwright/test";

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

test("homepage initializes the configured turnjs book", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/");
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
  await page.goto("/");

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
  await page.goto("/");
  const state = await readBookState(page);

  expect(state.display).toBe("single");
  expect(state.currentView).toHaveLength(1);
  expect(state.scrollWidth).toBe(state.innerWidth);
  expect(state.scrollHeight).toBeGreaterThanOrEqual(state.innerHeight);
  expect(state.book.width).toBe(370);
  await expect(page.locator(".site-nav .links a")).toHaveCount(5);

  await page.screenshot({
    path: "test-results/homepage-turnjs-mobile.png",
    fullPage: true,
  });
});

test("mobile touch swipe turns pages without hijacking vertical scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
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
