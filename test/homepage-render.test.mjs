import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

async function loadHomepage() {
  const html = await readFile(
    new URL("../dist/index.html", import.meta.url),
    "utf8",
  );

  return new JSDOM(html).window.document;
}

async function loadDailyQuote() {
  return JSON.parse(
    await readFile(
      new URL("../src/data/daily-quote.json", import.meta.url),
      "utf8",
    ),
  );
}

async function loadBookConfig() {
  return JSON.parse(
    await readFile(
      new URL("../src/data/book-config.json", import.meta.url),
      "utf8",
    ),
  );
}

function readBookData(document) {
  const node = document.querySelector("#book-data");
  assert.ok(node, "missing #book-data");

  const config = JSON.parse(node.dataset.config);
  return {
    config,
    articles: config.articles || [],
  };
}

function readCssBlock(styles, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : "";
}

test("homepage renders the configured turnjs book shell", async () => {
  const document = await loadHomepage();
  const config = await loadBookConfig();
  const bodyChildren = [...document.body.children];

  assert.equal(bodyChildren[0].classList.contains("site-nav"), true);
  assert.equal(
    document.querySelector(".site-nav .brand").textContent.trim(),
    config.nav.brand.text,
  );
  assert.deepEqual(
    [...document.querySelectorAll(".site-nav .links a")].map((node) => ({
      text: node.textContent.trim(),
      href: node.getAttribute("href"),
    })),
    [
      ...config.nav.links.items.map((item) => ({
        text: item.label,
        href: item.href,
      })),
      {
        text: "传统视图",
        href: "/classic",
      },
    ],
  );
  assert.ok(document.querySelector("#canvas"));
  assert.ok(document.querySelector("#book-zoom"));
  assert.ok(document.querySelector(".sj-book"));
  assert.equal(document.querySelector(".home-book-frame"), null);
  assert.equal(document.querySelector(".book-page"), null);
  assert.equal(document.querySelector("script[src='/book-runtime/js/book-app.js']") !== null, true);
  assert.equal(document.querySelector("script[src='/vendor/turnjs/js/book-app.js']") === null, true);
});

test("homepage serializes dynamic book config and content pages", async () => {
  const document = await loadHomepage();
  const bookConfig = await loadBookConfig();
  const { config, articles } = readBookData(document);

  assert.equal(config.book.width, 960);
  assert.equal(config.book.contentPage.width, 460);
  assert.equal(config.book.turn.startPage, 7);
  assert.equal(config.book.turn.backPage, config.book.turn.totalPages - 1);
  assert.ok(config.book.turn.totalPages >= 8);

  assert.match(config.toc, /<div class="table-contents">/);
  assert.match(config.toc, /目录/);
  // runtime paginated — not in static JSON
  assert.ok(articles.length >= 5);
  assert.equal(config.source.documentId, "zhimin-blog");
  assert.equal(config.source.documentTitle, config.footer.content.copyright);
  assert.equal(config.source.entryCount, articles.length);
  assert.equal(config.theme.id, bookConfig.theme.id);
  assert.equal(config.theme.name, "Classic Paper");
  assert.deepEqual(config.runtime.pagination, {
    articleWidth: 380,
    articleHeight: 471,
    tocWidth: 380,
    tocHeight: 400,
  });

  for (const pageNumber of [
    config.book.turn.backPage,
    config.book.turn.totalPages,
  ]) {
    assert.equal(
      document.querySelector(`.sj-book .p${pageNumber}`) !== null,
      true,
      `missing dynamic cover page ${pageNumber}`,
    );
  }
});

test("homepage carries mobile toc styles in the themed visual css", async () => {
  const document = await loadHomepage();
  const styles = [...document.querySelectorAll("style")]
    .map((node) => node.textContent)
    .join("\n");

  assert.match(styles, /@media \(max-width: 800px\)/);
  assert.match(styles, /\.sj-book \.table-contents/);
  assert.match(styles, /width: 280px/);
});

test("homepage navigation uses a dense translucent glass layer", async () => {
  const document = await loadHomepage();
  const config = await loadBookConfig();
  const styles = [...document.querySelectorAll("style")]
    .map((node) => node.textContent)
    .join("\n");

  assert.match(styles, /html\s*\{[\s\S]*background:\s*rgb\(255,\s*249,\s*238\)/);
  assert.match(styles, /body\s*\{[\s\S]*#EFEDD8/);
  assert.match(styles, new RegExp(`height: ${config.nav.height}px`));
  assert.match(styles, new RegExp(`font-size: ${config.nav.brand.fontSize}px`));
  assert.match(styles, new RegExp(`font-size: ${config.nav.links.fontSize}px`));
  assert.match(styles, /rgba\(255,\s*249,\s*238,\s*0\.64\)/);
  assert.match(styles, /backdrop-filter:\s*blur\(18px\)\s*saturate\(1\.08\)/);
  assert.match(styles, /box-shadow:\s*inset 0 -1px 0 rgba\(255,255,255,0\.28\)/);
  assert.match(styles, /\.site-nav \{ height: 50px; padding: 0; \}/);
  assert.match(styles, /\.site-nav \.brand \{ font-size: 15px; \}/);
  assert.match(styles, /\.site-nav \.links a \{ font-size: 13px; \}/);
});

test("homepage applies the configured paper texture atlas to book pages", async () => {
  const document = await loadHomepage();
  const config = await loadBookConfig();
  const styles = [...document.querySelectorAll("style")]
    .map((node) => node.textContent)
    .join("\n");

  const escapedImage = config.book.paperTexture.image.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  assert.match(styles, /--paper-x: 50%/);
  assert.match(styles, /--paper-y: 50%/);
  assert.match(styles, /\.sj-book \.own-size::before/);
  assert.match(styles, new RegExp(`url\\("${escapedImage}"\\)`));
  assert.match(styles, new RegExp(`opacity: ${config.book.paperTexture.opacity}`));
  assert.match(styles, new RegExp(`mix-blend-mode: ${config.book.paperTexture.blendMode}`));
});

test("homepage does not paint opaque backgrounds on book shell or page-depth overlays", async () => {
  const document = await loadHomepage();
  const styles = [...document.querySelectorAll("style")]
    .map((node) => node.textContent)
    .join("\n");
  const bookShellBlock = readCssBlock(styles, ".sj-book");
  const depthBlock = readCssBlock(styles, ".sj-book .depth");

  assert.notEqual(bookShellBlock, "", "missing .sj-book style block");
  assert.notEqual(depthBlock, "", "missing .sj-book .depth style block");
  assert.doesNotMatch(bookShellBlock, /background(?:-color)?:/);
  assert.doesNotMatch(depthBlock, /background(?:-color)?:/);
});

test("homepage provides content for the opening spread via book-data", async () => {
  const document = await loadHomepage();
  const { config, articles } = readBookData(document);
  const startPage = config.book.turn.startPage;

  // Articles are available for runtime pagination
  assert.ok(articles.length >= 5, "articles data present");
  assert.ok(articles[0].bodyHTML.length > 10, "first article has body HTML");
  assert.ok(articles[0].title, "first article has title");

  // Initial DOM has no static bootstrapped pages (Turn.js handles creation)
  const bootstrapped = document.querySelectorAll(
    ".sj-book > .own-size[data-bootstrap-page]",
  );
  assert.equal(bootstrapped.length, 0, "no static bootstrapped pages");

  // Blank own-size placeholders exist for pages 4 and 6 (Turn.js endpapers)
  const blankPages = document.querySelectorAll(
    ".sj-book > .own-size:not([class*=\"p1\"])",
  );
  assert.ok(blankPages.length >= 2, "endpaper placeholders present");
});

test("homepage quote contains the bilingual quote, author, and configured copyright", async () => {
  const document = await loadHomepage();
  const quote = await loadDailyQuote();
  const config = await loadBookConfig();
  const footer = document.querySelector(".site-footer");
  const currentYear = new Date().getFullYear();

  assert.ok(footer.querySelector(".quote"));
  assert.match(footer.textContent, new RegExp(quote.english.slice(0, 18)));
  assert.match(footer.textContent, new RegExp(quote.chinese.slice(0, 8)));
  assert.match(footer.textContent, new RegExp(`— ${quote.author}`));
  assert.match(
    footer.textContent,
    new RegExp(`© ${currentYear} · ${config.footer.content.copyright}`),
  );
});

test("first article page does not duplicate the article title heading", async () => {
  const { articles } = readBookData(await loadHomepage());
  let dupCount = 0;
  for (const a of articles) {
    try {
      const bodyDoc = new JSDOM(a.bodyHTML).window.document;
      const h1s = bodyDoc.querySelectorAll("h1");
      for (const h1 of h1s) {
        if (h1.textContent.trim() === a.title) dupCount++;
      }
    } catch(e) { /* skip */ }
  }
  assert.equal(dupCount, 0, `found ${dupCount} duplicated article h1 headings`);
});
