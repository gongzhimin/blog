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
  expect(frame.width / frame.height).toBeCloseTo(1.8, 1);

  const sizing = await page.evaluate(() => {
    const stage = document.querySelector(".home-page");
    const frame = document.querySelector(".home-book-frame");
    const stageStyle = getComputedStyle(stage);
    const stageBox = stage.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const contentWidth =
      stageBox.width -
      Number.parseFloat(stageStyle.paddingLeft) -
      Number.parseFloat(stageStyle.paddingRight);
    const contentHeight =
      stageBox.height -
      Number.parseFloat(stageStyle.paddingTop) -
      Number.parseFloat(stageStyle.paddingBottom);

    return {
      actualWidth: frameBox.width,
      expectedWidth: Math.min(contentWidth, contentHeight * 1.8),
    };
  });
  expect(Math.abs(sizing.actualWidth - sizing.expectedWidth)).toBeLessThan(2);

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

test("mobile keeps the complete book double spread and uses compact catalogs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const pages = page.locator(".book-page");
  const life = await pages.nth(0).boundingBox();
  const technical = await pages.nth(1).boundingBox();

  expect(life).not.toBeNull();
  expect(technical).not.toBeNull();
  expect(Math.abs(life.y - technical.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(life.x + life.width - technical.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(life.height - technical.height)).toBeLessThanOrEqual(1);
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

    await expect(paper.locator(".catalog-entry__leader:visible")).toHaveCount(0);
    await expect(
      paper.locator(".catalog-entry__date--desktop:visible"),
    ).toHaveCount(0);
    await expect(
      paper.locator(".catalog-entry__date--compact:visible"),
    ).toHaveCount(Math.min(3, totalEntries));
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
      frameBox: frame.getBoundingClientRect().toJSON(),
      pageStyles,
    };
  });

  expect(mobileBookDepth.frameAspectRatio).toBe("1.8 / 1");
  expect(mobileBookDepth.frameFilter).not.toBe("none");
  expect(mobileBookDepth.frameBox.width / mobileBookDepth.frameBox.height).toBeCloseTo(
    1.8,
    1,
  );

  for (const selector of [
    ".home-book-cover",
    ".home-book-binding",
    ".home-book-edge--left",
    ".home-book-edge--right",
    ".home-book-gutter",
  ]) {
    await expect(page.locator(selector)).toBeVisible();
  }

  const mobileCatalogFont = await page
    .locator(".catalog-entry a")
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(mobileCatalogFont).toBeGreaterThanOrEqual(8.3);

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
  expect(selectedTheme).toBe("dark");
  await expect
    .poll(() =>
      page
        .locator('.book-page[data-section="life"] .catalog-entry a')
        .first()
        .evaluate((element) => getComputedStyle(element).color),
    )
    .toBe("rgb(40, 37, 34)");
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
  { width: 1600, height: 600 },
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

    const pages = page.locator(".book-page");
    const left = await pages.nth(0).boundingBox();
    const right = await pages.nth(1).boundingBox();
    const frame = await page.locator(".home-book-frame").boundingBox();

    expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(left.x + left.width - right.x)).toBeLessThanOrEqual(2);
    expect(frame.width / frame.height).toBeCloseTo(1.8, 1);
  });
}
