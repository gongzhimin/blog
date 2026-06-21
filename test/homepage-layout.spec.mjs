import { test, expect } from "@playwright/test";

test("desktop renders a complete side-by-side book", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const pages = page.locator(".book-page");
  await expect(pages).toHaveCount(2);

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

  const bookDepth = await page.locator(".home-book").evaluate((book) => {
    const bookStyle = getComputedStyle(book);
    const pageStyles = [...book.querySelectorAll(".book-page")].map((paper) => {
      const style = getComputedStyle(paper);
      return {
        transform: style.transform,
        borderRadius: style.borderRadius,
      };
    });

    return {
      perspective: bookStyle.perspective,
      filter: bookStyle.filter,
      transform: bookStyle.transform,
      pageStyles,
    };
  });

  expect(bookDepth.perspective).not.toBe("none");
  expect(bookDepth.filter).not.toBe("none");
  expect(bookDepth.transform).not.toBe("none");
  expect(bookDepth.pageStyles[0].transform).not.toBe("none");
  expect(bookDepth.pageStyles[1].transform).not.toBe("none");
  expect(bookDepth.pageStyles[0].borderRadius).not.toBe("0px");
  expect(bookDepth.pageStyles[1].borderRadius).not.toBe("0px");

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

  for (const paper of [pages.nth(0), pages.nth(1)]) {
    const totalEntries = await paper.locator(".catalog-entry").count();
    await expect(paper.locator(".catalog-entry:visible")).toHaveCount(
      Math.min(3, totalEntries),
    );
    await expect(paper.locator(".book-page__archive")).toBeVisible();

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
    const bookStyle = getComputedStyle(book);
    const pageTransforms = [...book.querySelectorAll(".book-page")].map(
      (paper) => getComputedStyle(paper).transform,
    );

    return {
      perspective: bookStyle.perspective,
      filter: bookStyle.filter,
      transform: bookStyle.transform,
      pageTransforms,
    };
  });

  expect(mobileBookDepth.perspective).toBe("none");
  expect(mobileBookDepth.filter).toBe("none");
  expect(mobileBookDepth.transform).toBe("none");
  expect(mobileBookDepth.pageTransforms).toEqual(["none", "none"]);

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

  await page.locator(".mobile-menu summary").click();
  await expect(page.locator(".mobile-menu__panel")).toBeVisible();
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
      ".home-hero",
      ".home-book",
      ".daily-quote",
    ]) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });
}
