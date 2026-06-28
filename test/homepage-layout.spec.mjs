import { test, expect } from "@playwright/test";

async function readBookState(page) {
  await expect(page.locator("#canvas")).toBeVisible();
  await expect(page.locator(".sj-book")).toBeVisible();

  return page.evaluate(() => {
    const data = document.querySelector("#book-data");
    const config = JSON.parse(data.dataset.config);
    const content = JSON.parse(data.dataset.content);
    const canvas = document.querySelector("#canvas");
    const book = document.querySelector(".sj-book");
    const zoom = document.querySelector("#book-zoom");
    const flipbook = window.jQuery ? window.jQuery(book) : null;
    const currentPage =
      flipbook && flipbook.turn("is") ? flipbook.turn("page") : null;
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
      contentKeys: Object.keys(content),
      toc: content["5"],
      currentPage,
      currentView,
      visiblePageText,
      canvasVisibility: getComputedStyle(canvas).visibility,
      book: book.getBoundingClientRect().toJSON(),
      bookText: book.textContent,
      zoom: zoom.getBoundingClientRect().toJSON(),
      backPageExists: Boolean(
        document.querySelector(`.sj-book .p${config.book.turn.backPage}`),
      ),
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      innerWidth,
      innerHeight,
    };
  });
}

test("homepage initializes the configured turnjs book", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/");
  const state = await readBookState(page);

  expect(state.canvasVisibility).toBe("visible");
  expect(state.config.book.width).toBe(960);
  expect(state.config.book.height).toBe(600);
  expect(state.config.book.turn.startPage).toBe(7);
  expect(state.config.book.turn.totalPages % 2).toBe(0);
  expect(state.config.book.turn.backPage).toBe(
    state.config.book.turn.totalPages - 1,
  );
  expect(state.currentPage).toBe(state.config.book.turn.startPage);
  expect(state.currentView).toContain(state.config.book.turn.startPage);
  expect(state.backPageExists).toBe(true);
  expect(state.toc).toContain("目录");
  expect(state.contentKeys.length).toBeGreaterThan(3);
  expect(state.book.width).toBeGreaterThan(900);
  expect(state.book.height).toBeGreaterThan(560);
  expect(state.bookText).toMatch(/目录|失重|答案|手机写博客指南/);
  expect(state.bookText).not.toContain("Tips");
  expect(state.visiblePageText).toMatch(/失重/);
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
  await expect(page.locator(".site-nav .links a")).toHaveCount(4);
  await expect(page.locator(".site-nav .links a").nth(0)).toHaveAttribute(
    "href",
    "/life",
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

test("narrow viewport keeps the book usable with page scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const state = await readBookState(page);

  expect(state.scrollWidth).toBeGreaterThanOrEqual(state.innerWidth);
  expect(state.scrollHeight).toBeGreaterThan(state.innerHeight);
  expect(state.book.width).toBeGreaterThan(900);
  await expect(page.locator(".site-nav .links a")).toHaveCount(4);

  await page.screenshot({
    path: "test-results/homepage-turnjs-mobile.png",
    fullPage: true,
  });
});
