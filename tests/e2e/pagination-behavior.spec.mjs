import { test, expect } from './support/fixture.mjs';

test('classic cursor is independent of book bootstrap', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://fonts.loli.net/**', (route) => route.abort());
  await page.route('https://gstatic.loli.net/**', (route) => route.abort());
  await page.goto('/classic/');
  await expect(page.locator('.cursor-dot')).toHaveCount(1);
  expect(
    await page.evaluate(() => Boolean(window.BookRuntime?.Paginator)),
  ).toBe(false);
  expect(errors).toEqual([]);
});

for (const width of [260, 380]) {
  test(`pagination preserves rich text and fits pages at ${width}px`, async ({
    page,
  }) => {
    await page.route('https://fonts.loli.net/**', (route) => route.abort());
    await page.route('https://gstatic.loli.net/**', (route) => route.abort());
    await page.goto('/demos/book-runtime/');
    await page.waitForFunction(() => Boolean(window.BookRuntime?.Paginator));
    const result = await page.evaluate((articleWidth) => {
      const paginator = window.BookRuntime.Paginator;
      const original = paginator.getConfig();
      const css =
        '#__bap_inner{font:16px/24px monospace;overflow-wrap:anywhere}#__bap_inner p{margin:0 0 8px}';
      const height = 220;
      const bodyHTML = `<p class="body-fixture">${Array.from({ length: 180 }, (_, index) => `<strong data-fragment="${index}">片段${index}</strong><em data-fragment="${index}"> mixed text;</em>`).join('')}</p>`;
      const source = document.createElement('div');
      source.innerHTML = bodyHTML;
      const expected = source.textContent;
      try {
        paginator.configure({
          articleWidth,
          articleHeight: height,
          articleCSS: css,
        });
        const pages = paginator.paginateArticle({
          title: 'Regression',
          dateStr: '2026-10-03',
          bodyHTML,
        });
        const texts = [];
        const heights = [];
        const strong = Array(180).fill('');
        const emphasis = Array(180).fill('');
        for (const html of pages) {
          const pageNode = document.createElement('div');
          pageNode.innerHTML = html;
          texts.push(
            [...pageNode.querySelectorAll('.body-fixture')]
              .map((node) => node.textContent)
              .join(''),
          );
          for (const node of pageNode.querySelectorAll('strong[data-fragment]'))
            strong[Number(node.dataset.fragment)] += node.textContent;
          for (const node of pageNode.querySelectorAll('em[data-fragment]'))
            emphasis[Number(node.dataset.fragment)] += node.textContent;
          const measurement = document.createElement('div');
          measurement.style.cssText = `position:absolute;left:-10000px;top:0;width:${articleWidth}px;visibility:hidden`;
          measurement.innerHTML = `<style>${css}</style><div id="__bap_inner"></div>`;
          const inner = measurement.querySelector('#__bap_inner');
          inner.innerHTML = pageNode.querySelector('.book-content').innerHTML;
          document.body.append(measurement);
          try {
            heights.push(inner.scrollHeight);
          } finally {
            measurement.remove();
          }
        }
        return {
          expected,
          actual: texts.join(''),
          heights,
          height,
          pages: pages.length,
          strong,
          emphasis,
        };
      } finally {
        paginator.configure(original);
      }
    }, width);
    expect(result.pages).toBeGreaterThan(1);
    expect(result.actual).toBe(result.expected);
    expect(result.strong).toEqual(
      Array.from({ length: 180 }, (_, index) => `片段${index}`),
    );
    expect(result.emphasis).toEqual(Array(180).fill(' mixed text;'));
    for (const height of result.heights)
      expect(height).toBeLessThanOrEqual(result.height + 1);
  });
}

test('code pagination preserves line separators, token attributes and measured height', async ({
  page,
}) => {
  await page.route('https://fonts.loli.net/**', (route) => route.abort());
  await page.route('https://gstatic.loli.net/**', (route) => route.abort());
  await page.goto('/demos/book-runtime/');
  await page.waitForFunction(() => Boolean(window.BookRuntime?.Paginator));
  const result = await page.evaluate(() => {
    const paginator = window.BookRuntime.Paginator;
    const original = paginator.getConfig();
    const css =
      '#__bap_inner{font:16px/24px monospace}#__bap_inner pre{margin:0;white-space:pre-wrap}#__bap_inner code{font:inherit}';
    const bodyHTML = `<pre><code data-language="synthetic"><span class="token" data-kind="literal">${Array.from({ length: 80 }, (_, index) => `line ${index} &amp; 😀`).join('\n')}</span></code></pre>`;
    const source = document.createElement('div');
    source.innerHTML = bodyHTML;
    try {
      paginator.configure({
        articleWidth: 380,
        articleHeight: 220,
        articleCSS: css,
      });
      const pages = paginator.paginateArticle({
        title: 'Code',
        dateStr: '2026-10-06',
        bodyHTML,
      });
      const actual = [],
        heights = [],
        attributes = [];
      for (const html of pages) {
        const measure = document.createElement('div');
        measure.style.cssText =
          'position:absolute;left:-10000px;width:380px;visibility:hidden';
        measure.innerHTML = `<style>${css}</style><div id="__bap_inner"></div>`;
        const inner = measure.querySelector('#__bap_inner');
        const node = document.createElement('div');
        node.innerHTML = html;
        inner.innerHTML = node.querySelector('.book-content').innerHTML;
        document.body.append(measure);
        try {
          actual.push(
            [...inner.querySelectorAll('pre code')]
              .map((code) => code.textContent)
              .join(''),
          );
          heights.push(inner.scrollHeight);
          attributes.push(
            ...[...inner.querySelectorAll('pre code')].map((code) => [
              code.dataset.language,
              code.querySelector('.token')?.dataset.kind,
            ]),
          );
        } finally {
          measure.remove();
        }
      }
      return {
        expected: source.textContent,
        actual: actual.join(''),
        heights,
        attributes,
        pages: pages.length,
      };
    } finally {
      paginator.configure(original);
    }
  });
  expect(result.pages).toBeGreaterThan(1);
  expect(result.actual).toBe(result.expected);
  expect(result.attributes.length).toBeGreaterThan(1);
  for (const attributes of result.attributes)
    expect(attributes).toEqual(['synthetic', 'literal']);
  for (const height of result.heights) expect(height).toBeLessThanOrEqual(221);
});

test('public pagination API calibrates a real multi-page TOC against body pages', async ({
  page,
}) => {
  await page.route('https://fonts.loli.net/**', (route) => route.abort());
  await page.route('https://gstatic.loli.net/**', (route) => route.abort());
  await page.goto('/demos/book-runtime/');
  await page.waitForFunction(() => Boolean(window.BookRuntime?.API));
  const evidence = await page.evaluate(() => {
    const payload = JSON.parse(
      document.querySelector('#book-data').dataset.config,
    );
    const articles = Array.from({ length: 24 }, (_, index) => ({
      key: `chapter-${index}`,
      title: `Chapter ${index}`,
      dateStr: '2026/10/06',
      bodyHTML: `<p data-chapter="${index}">Body ${index}</p>`,
    }));
    const pagination = {
      articleWidth: 260,
      articleHeight: 220,
      tocWidth: 260,
      tocHeight: 110,
      articleCSS:
        '#__bap_inner{font:16px/20px monospace}#__bap_inner p{margin:0}',
      tocCSS:
        '#__toc{font:16px/20px monospace}#__toc h1{font:16px/20px monospace;margin:0}#__toc ul{margin:0;padding:0}#__toc li{margin:0;line-height:20px}',
    };
    const original = window.BookRuntime.Paginator.getConfig();
    try {
      const result = window.BookRuntime.API.paginateBook({
        ...payload,
        articles,
        runtime: {
          ...payload.runtime,
          pagination,
          mobilePagination: pagination,
        },
      });
      if (!result.ok) return result;
      const layout = result.value;
      const links = [];
      const tocPages = layout.pages.filter(
        (entry) =>
          entry.physicalPage >= 5 && entry.physicalPage < layout.bodyStart,
      );
      for (const entry of tocPages) {
        const dom = document.createElement('div');
        dom.innerHTML = entry.html;
        for (const link of dom.querySelectorAll('a[data-page]'))
          links.push(Number(link.dataset.page));
      }
      return {
        ok: true,
        bodyStart: layout.bodyStart,
        articleStart: layout.articleStart,
        tocCount: tocPages.length,
        totalPages: layout.totalPages,
        backPage: layout.backPage,
        links,
        articles: articles.map((article, index) => {
          const target = layout.articleToPage[article.key];
          const dom = document.createElement('div');
          dom.innerHTML =
            layout.pages.find((entry) => entry.physicalPage === target)?.html ||
            '';
          return {
            key: article.key,
            target,
            reverse: layout.pageToArticle[target],
            body: dom.querySelector(`[data-chapter="${index}"]`)?.textContent,
          };
        }),
      };
    } finally {
      window.BookRuntime.Paginator.configure(original);
    }
  });
  expect(evidence.ok, JSON.stringify(evidence)).toBe(true);
  expect(evidence.tocCount).toBeGreaterThan(1);
  expect(evidence.bodyStart).toBe(5 + evidence.tocCount);
  expect(evidence.articleStart).toBe(evidence.bodyStart);
  expect(evidence.totalPages % 2).toBe(0);
  expect(evidence.backPage).toBe(evidence.totalPages - 1);
  expect(evidence.links).toHaveLength(24);
  for (const [index, article] of evidence.articles.entries()) {
    expect(article.target).toBe(evidence.bodyStart + index);
    expect(evidence.links[index]).toBe(article.target);
    expect(article.reverse).toBe(article.key);
    expect(article.body).toBe(`Body ${index}`);
  }
});

for (const width of [1200, 390]) {
  test(`TOC click and deep link reach the same article at ${width}px`, async ({
    page,
  }) => {
    await page.route('https://fonts.loli.net/**', (route) => route.abort());
    await page.route('https://gstatic.loli.net/**', (route) => route.abort());
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.waitForFunction(() => window.jQuery?.('.sj-book').turn('is'));
    await page.evaluate(() => {
      window.jQuery('.sj-book').turn('options', { duration: 0 });
      window.jQuery('.sj-book').turn('page', 5);
    });
    const firstLink = page
      .locator('.sj-book .table-contents a[data-page]')
      .first();
    await expect(firstLink).toBeVisible();
    const target = Number(await firstLink.getAttribute('data-page'));
    const key = new URL(
      await firstLink.getAttribute('href'),
      'http://localhost',
    ).searchParams.get('post');
    const title = await page.evaluate(
      () =>
        JSON.parse(document.querySelector('#book-data').dataset.config)
          .articles[0].title,
    );
    expect(key).toBeTruthy();
    await firstLink.click();
    await expect
      .poll(() => page.evaluate(() => window.jQuery('.sj-book').turn('view')))
      .toContain(target);
    await expect(page.locator(`.sj-book .p${target} h1`)).toHaveText(title);
    await expect(page.locator(`.sj-book .p${target} h1`)).toBeVisible();
    await page.goto(`/?post=${encodeURIComponent(key)}`);
    await expect
      .poll(() => page.evaluate(() => window.jQuery?.('.sj-book').turn('view')))
      .toContain(target);
    await expect(page.locator(`.sj-book .p${target} h1`)).toHaveText(title);
    await expect(page.locator(`.sj-book .p${target} h1`)).toBeVisible();
  });
}
