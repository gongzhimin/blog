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

async function loadHomepageConfig() {
  return JSON.parse(
    await readFile(
      new URL("../src/data/homepage-config.json", import.meta.url),
      "utf8",
    ),
  );
}

test("homepage renders the approved linear structure", async () => {
  const document = await loadHomepage();
  const config = await loadHomepageConfig();
  const bodyChildren = [...document.body.children];

  assert.equal(bodyChildren[0].classList.contains("home-navigation"), true);
  assert.ok(document.querySelector(".home-hero"));
  assert.equal(
    document.querySelector(".home-hero h1").textContent.trim(),
    config.content.heroTitle,
  );
  assert.equal(document.querySelector(".home-hero p"), null);
  assert.ok(document.querySelector(".home-book-frame"));
  assert.ok(document.querySelector(".home-book"));
  assert.ok(document.querySelector(".daily-quote"));
  assert.match(
    document.body.getAttribute("style"),
    /--home-desktop-book-width:68%/,
  );

  for (const selector of [
    ".home-book-cover",
    ".home-book-binding",
    ".home-book-edge--left",
    ".home-book-edge--right",
    ".home-book-gutter",
  ]) {
    assert.ok(document.querySelector(selector), `missing ${selector}`);
  }
});

test("homepage renders life first, technical second, and required navigation links", async () => {
  const document = await loadHomepage();
  const config = await loadHomepageConfig();
  const pages = [...document.querySelectorAll(".book-page")];

  assert.equal(pages.length, 2);
  assert.equal(pages[0].dataset.section, "life");
  assert.equal(pages[1].dataset.section, "technical");
  assert.equal(document.querySelector(".book-page__title"), null);
  assert.deepEqual(
    [...document.querySelectorAll(".book-page__part")].map((node) =>
      node.textContent.trim(),
    ),
    [config.content.life.partLabel, config.content.technical.partLabel],
  );
  assert.deepEqual(
    [...document.querySelectorAll(".book-page__archive")].map((node) => ({
      text: node.textContent.trim(),
      href: node.getAttribute("href"),
    })),
    [
      { text: config.content.life.archiveLabel, href: "/life" },
      { text: config.content.technical.archiveLabel, href: "/blog" },
    ],
  );
  assert.deepEqual(
    [...document.querySelectorAll(".book-page__running-head")].map((node) => ({
      site: node.querySelector("strong").textContent.trim(),
      label: node.querySelector("span").textContent.trim(),
    })),
    [
      {
        site: config.content.siteName,
        label: config.content.life.runningLabel,
      },
      {
        site: config.content.siteName,
        label: config.content.technical.runningLabel,
      },
    ],
  );
  assert.equal(document.querySelector(".book-page__folio"), null);

  for (const href of ["/", "/blog", "/life", "/about", "/rss.xml"]) {
    assert.ok(document.querySelector(`.home-navigation a[href="${href}"]`));
  }
});

test("homepage quote contains the bilingual quote, author, and copyright", async () => {
  const document = await loadHomepage();
  const quote = await loadDailyQuote();
  const footer = document.querySelector(".daily-quote");
  const currentYear = new Date().getFullYear();

  assert.ok(footer.querySelector(".daily-quote__english"));
  assert.ok(footer.querySelector(".daily-quote__chinese"));
  assert.ok(footer.querySelector(".daily-quote__meta"));
  assert.equal(
    footer.querySelector(".daily-quote__copyright").textContent.trim(),
    `© ${currentYear} ZHIMIN`,
  );
  assert.equal(
    footer.querySelector(".daily-quote__author").textContent.trim(),
    `— ${quote.author}`,
  );
});
