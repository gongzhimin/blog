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
  assert.ok(document.querySelector(".home-book"));
  assert.ok(document.querySelector(".daily-quote"));
});

test("homepage renders life first, technical second, and required navigation links", async () => {
  const document = await loadHomepage();
  const pages = [...document.querySelectorAll(".book-page")];

  assert.equal(pages.length, 2);
  assert.equal(pages[0].dataset.section, "life");
  assert.equal(pages[1].dataset.section, "technical");

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
  assert.equal(
    footer.querySelector(".daily-quote__copyright").textContent.trim(),
    `© ${currentYear} ZHIMIN`,
  );
  assert.equal(
    footer.querySelector(".daily-quote__author").textContent.trim(),
    `— ${quote.author}`,
  );
});
