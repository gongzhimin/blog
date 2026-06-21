import { test, expect } from "@playwright/test";

test("desktop renders the calibrated hardcover book in one viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const pages = page.locator(".book-page");
  await expect(pages).toHaveCount(2);
  for (const selector of [
    ".home-navigation",
    ".home-navigation__title",
    ".home-book-frame",
    ".daily-quote",
    ".home-book-cover",
    ".home-book-binding",
    ".home-book-edge--left",
    ".home-book-edge--right",
    ".home-book-gutter",
  ]) {
    await expect(page.locator(selector)).toBeVisible();
  }
  await expect(page.locator(".home-hero")).toHaveCount(0);
  await expect(page.locator(".home-navigation__links a")).toHaveCount(4);
  await expect(page.locator(".book-page__folio")).toHaveCount(2);

  const left = await pages.nth(0).boundingBox();
  const right = await pages.nth(1).boundingBox();

  expect(left).not.toBeNull();
  expect(right).not.toBeNull();
  expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(left.x + left.width - right.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(left.height - right.height)).toBeLessThanOrEqual(1);

  const dimensions = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight + 1);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

  const navigation = await page.locator(".home-navigation__inner").boundingBox();
  const navigationTitle = await page
    .locator(".home-navigation__title")
    .boundingBox();
  expect(navigation).not.toBeNull();
  expect(navigationTitle).not.toBeNull();
  expect(
    Math.abs(
      navigationTitle.x +
        navigationTitle.width / 2 -
        (navigation.x + navigation.width / 2),
    ),
  ).toBeLessThanOrEqual(2);

  const frame = await page.locator(".home-book-frame").boundingBox();
  expect(frame).not.toBeNull();
  expect(frame.width / dimensions.innerWidth).toBeCloseTo(0.612, 2);
  expect(frame.width / frame.height).toBeCloseTo(1.8, 1);

  const physicalStyles = await page.evaluate(() => {
    const read = (selector) => getComputedStyle(document.querySelector(selector));
    return {
      cover: read(".home-book-cover").backgroundColor,
      binding: read(".home-book-binding").backgroundColor,
      gutterWidth: read(".home-book-gutter").width,
      paper: read(".book-page").backgroundColor,
    };
  });

  expect(physicalStyles.cover).toBe("rgb(240, 240, 240)");
  expect(physicalStyles.binding).toBe("rgb(115, 115, 115)");
  expect(physicalStyles.gutterWidth).toBe("1px");
  expect(physicalStyles.paper).toBe("rgb(255, 255, 255)");

  for (const paper of [pages.nth(0), pages.nth(1)]) {
    const paperBox = await paper.boundingBox();
    const archiveBox = await paper.locator(".book-page__archive").boundingBox();
    const folioBox = await paper.locator(".book-page__folio").boundingBox();

    expect(paperBox).not.toBeNull();
    expect(archiveBox).not.toBeNull();
    expect(folioBox).not.toBeNull();
    expect(
      Math.abs(
        archiveBox.x + archiveBox.width / 2 -
          (paperBox.x + paperBox.width / 2),
      ),
    ).toBeLessThanOrEqual(2);
    expect(archiveBox.y + archiveBox.height).toBeLessThan(folioBox.y);
  }

  const copyright = await page
    .locator(".daily-quote__copyright")
    .boundingBox();
  expect(copyright).not.toBeNull();
  expect(
    Math.abs(
      copyright.x + copyright.width / 2 - dimensions.innerWidth / 2,
    ),
  ).toBeLessThanOrEqual(2);

  await page.screenshot({
    path: "test-results/homepage-desktop.png",
    fullPage: true,
  });
});

test("mobile stacks two complete paper pages and keeps content contained", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const pages = page.locator(".book-page");
  const life = await pages.nth(0).boundingBox();
  const technical = await pages.nth(1).boundingBox();

  expect(life).not.toBeNull();
  expect(technical).not.toBeNull();
  expect(technical.y).toBeGreaterThanOrEqual(life.y + life.height + 20);
  await expect(page.locator(".home-navigation__title")).toBeHidden();
  await expect(page.locator(".home-navigation__links a:visible")).toHaveCount(4);
  await expect(page.locator(".theme-toggle:visible")).toHaveCount(1);

  for (const paper of [pages.nth(0), pages.nth(1)]) {
    const totalEntries = await paper.locator(".catalog-entry").count();
    await expect(paper.locator(".catalog-entry:visible")).toHaveCount(
      Math.min(3, totalEntries),
    );
    await expect(paper.locator(".book-page__archive")).toBeVisible();
    await expect(paper.locator(".book-page__folio")).toBeVisible();

    const paperStyle = await paper.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderTopWidth: Number.parseFloat(style.borderTopWidth),
        borderRightWidth: Number.parseFloat(style.borderRightWidth),
        borderBottomWidth: Number.parseFloat(style.borderBottomWidth),
        borderLeftWidth: Number.parseFloat(style.borderLeftWidth),
        minHeight: Number.parseFloat(style.minHeight),
      };
    });

    expect(paperStyle.borderTopWidth).toBeGreaterThan(0);
    expect(paperStyle.borderRightWidth).toBeGreaterThan(0);
    expect(paperStyle.borderBottomWidth).toBeGreaterThan(0);
    expect(paperStyle.borderLeftWidth).toBeGreaterThan(0);
    expect(paperStyle.minHeight).toBeGreaterThanOrEqual(320);
  }

  const mobileBookDepth = await page.locator(".home-book").evaluate((book) => {
    const frame = book.closest(".home-book-frame");
    const pageStyles = [...book.querySelectorAll(".book-page")].map((paper) => {
      const style = getComputedStyle(paper);
      return {
        transform: style.transform,
        fontSize: Number.parseFloat(style.fontSize),
      };
    });

    return {
      frameAspectRatio: getComputedStyle(frame).aspectRatio,
      frameFilter: getComputedStyle(frame).filter,
      frameTransform: getComputedStyle(frame).transform,
      pageStyles,
    };
  });

  expect(mobileBookDepth.frameAspectRatio).toBe("auto");
  expect(mobileBookDepth.frameFilter).toBe("none");
  expect(mobileBookDepth.frameTransform).toBe("none");
  expect(mobileBookDepth.pageStyles.map((style) => style.transform)).toEqual([
    "none",
    "none",
  ]);

  for (const selector of [
    ".home-book-cover",
    ".home-book-binding",
    ".home-book-edge--left",
    ".home-book-edge--right",
    ".home-book-gutter",
  ]) {
    await expect(page.locator(selector)).toBeHidden();
  }

  const mobileCatalogFont = await page
    .locator(".catalog-entry a")
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(mobileCatalogFont).toBeGreaterThanOrEqual(12);

  const mobileCopyrightPosition = await page
    .locator(".daily-quote__copyright")
    .evaluate((element) => getComputedStyle(element).position);
  expect(mobileCopyrightPosition).toBe("static");

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.screenshot({
    path: "test-results/homepage-mobile.png",
    fullPage: true,
  });
});

test("navigation remains sticky and theme choice persists", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const navigation = page.locator(".home-navigation");
  const initialTop = (await navigation.boundingBox()).y;
  await page.evaluate(() => window.scrollTo(0, 500));
  const scrolledTop = (await navigation.boundingBox()).y;
  expect(scrolledTop).toBe(initialTop);

  await page.locator(".theme-toggle:visible").click();
  const selectedTheme = await page.locator("html").getAttribute("data-theme");
  expect(selectedTheme).not.toBeNull();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", selectedTheme);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/homepage-dark.png",
    fullPage: true,
  });

  await expect(page.locator(".home-navigation__links a:visible")).toHaveCount(4);
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 360, height: 800 },
]) {
  test(`homepage remains coherent at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

    for (const selector of [
      ".home-navigation",
      ".home-book",
      ".daily-quote",
    ]) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });
}
