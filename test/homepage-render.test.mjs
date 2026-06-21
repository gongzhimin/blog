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

test("homepage renders the approved linear structure", async () => {
  const document = await loadHomepage();
  const bodyChildren = [...document.body.children];

  assert.equal(bodyChildren[0].classList.contains("home-navigation"), true);
  assert.ok(document.querySelector(".home-hero"));
  assert.equal(document.querySelector(".home-hero p"), null);
  assert.ok(document.querySelector(".home-book-frame"));
  assert.ok(document.querySelector(".home-book"));
  assert.ok(document.querySelector(".daily-quote"));

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
  const pages = [...document.querySelectorAll(".book-page")];

  assert.equal(pages.length, 2);
  assert.equal(pages[0].dataset.section, "life");
  assert.equal(pages[1].dataset.section, "technical");
  assert.equal(document.querySelector(".book-page__title"), null);
  assert.deepEqual(
    [...document.querySelectorAll(".book-page__part")].map((node) =>
      node.textContent.trim(),
    ),
    ["Part I · Life", "Part II · Technology"],
  );
  assert.deepEqual(
    [...document.querySelectorAll(".book-page__archive")].map((node) => ({
      text: node.textContent.trim(),
      href: node.getAttribute("href"),
    })),
    [
      { text: "全部生活文章", href: "/life" },
      { text: "全部技术文章", href: "/blog" },
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
