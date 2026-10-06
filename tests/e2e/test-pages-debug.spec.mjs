import { test, expect } from './support/fixture.mjs';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.loli.net/**', (route) => route.abort());
  await page.route('https://gstatic.loli.net/**', (route) => route.abort());
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForFunction(() => window.jQuery?.('.sj-book').turn('is'));
  await page.evaluate(() =>
    window.jQuery('.sj-book').turn('options', { duration: 0 }),
  );
});

test('initial physical pages contain title, imprint and both hard covers', async ({
  page,
}) => {
  const state = await page.evaluate(() => {
    const book = window.jQuery('.sj-book');
    const totalPages = book.turn('pages');
    return {
      totalPages,
      firstCover: book.data().pageObjs[1]?.hasClass('hard'),
      lastCover: book.data().pageObjs[totalPages]?.hasClass('hard'),
      title: book.data().pageObjs[3]?.find('.title-page__title').text().trim(),
      expectedTitle: JSON.parse(
        document.querySelector('#book-data').dataset.config,
      ).source.documentTitle,
      imprint: book.data().pageObjs[4]?.find('.imprint-page').text(),
    };
  });
  expect(state.totalPages % 2).toBe(0);
  expect(state.firstCover).toBe(true);
  expect(state.lastCover).toBe(true);
  expect(state.title).toBe(state.expectedTitle);
  expect(state.imprint).toContain('出版说明');
});

test('turning to page four shows the imprint in the correct spread', async ({
  page,
}) => {
  await page.evaluate(() => window.jQuery('.sj-book').turn('page', 4));
  await expect
    .poll(() => page.evaluate(() => window.jQuery('.sj-book').turn('view')))
    .toEqual([4, 5]);
  await expect(page.locator('.sj-book .p4 .imprint-page')).toBeVisible();
  await expect(page.locator('.sj-book .p4')).toContainText('出版说明');
});

test('forward and backward turns preserve the requested physical spread', async ({
  page,
}, testInfo) => {
  const views = [];
  for (const target of [1, 2, 4, 6, 12, 4, 5]) {
    await page.evaluate(
      (value) => window.jQuery('.sj-book').turn('page', value),
      target,
    );
    const spread =
      target === 1
        ? [0, 1]
        : [target - (target % 2), target - (target % 2) + 1];
    await expect
      .poll(() => page.evaluate(() => window.jQuery('.sj-book').turn('view')))
      .toEqual(spread);
    const view = await page.evaluate(() =>
      window.jQuery('.sj-book').turn('view'),
    );
    expect(view).toEqual(spread);
    views.push({ target, view });
  }
  await testInfo.attach('verified-spreads', {
    body: JSON.stringify(views),
    contentType: 'application/json',
  });
});
