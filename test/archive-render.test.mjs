import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

async function loadDocument(path) {
  const html = await readFile(new URL(path, import.meta.url), "utf8");
  return new JSDOM(html).window.document;
}

async function loadHomepageConfig() {
  return JSON.parse(
    await readFile(
      new URL("../src/data/homepage-config.json", import.meta.url),
      "utf8",
    ),
  );
}

test("life and technical archives use independent roman folios", async () => {
  const [life, technical, config] = await Promise.all([
    loadDocument("../dist/life/index.html"),
    loadDocument("../dist/blog/index.html"),
    loadHomepageConfig(),
  ]);

  assert.equal(
    life.querySelector(".archive-page__folio").textContent.trim(),
    config.content.life.directoryFolio,
  );
  assert.equal(
    technical.querySelector(".archive-page__folio").textContent.trim(),
    config.content.technical.directoryFolio,
  );

  for (const document of [life, technical]) {
    const style = document.body.getAttribute("style");
    assert.match(style, /--home-text-folio-font-family:/);
    assert.match(style, /--home-text-folio-desktop-size:/);
  }
});
