import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildHomepageCssVariables,
  validateHomepageConfig,
} from "../src/lib/homepage-config.mjs";

async function readJson(path) {
  return JSON.parse(
    await readFile(new URL(path, import.meta.url), "utf8"),
  );
}

const config = await readJson("../src/data/homepage-config.json");
const schema = await readJson("../src/data/homepage-config.schema.json");

test("current homepage config is valid and produces CSS variables", () => {
  assert.doesNotThrow(() => validateHomepageConfig(config));

  const css = buildHomepageCssVariables(config);

  assert.equal(
    config.content.navigationTitle,
    "写技术，也记录技术之外的生活。",
  );
  assert.equal(config.content.copyrightLabel, "Zhimin 的博客书");
  assert.equal(config.content.life.outerRunningLabel, "ESSAYS");
  assert.equal(config.content.technical.outerRunningLabel, "TECHNICAL NOTES");
  assert.equal(config.content.life.homepageFolio, "i");
  assert.equal(config.content.technical.homepageFolio, "ii");
  assert.equal(config.content.life.directoryFolio, "i");
  assert.equal(config.content.technical.directoryFolio, "i");
  assert.equal(config.textStyles.navigationBrand.fontFamily, "sans");
  assert.equal(config.textStyles.navigationTitle.desktopSize, "0.4rem");

  assert.match(css, /--home-desktop-book-width:68%/);
  assert.match(css, /--home-desktop-book-ratio:1\.8 \/ 1/);
  assert.match(css, /--home-material-paper-color:#ffffff/);
  assert.match(
    css,
    /--home-text-navigation-brand-font-family:var\(--font-sans\)/,
  );
  assert.match(css, /--home-text-navigation-title-desktop-size:0\.4rem/);
  assert.match(css, /--home-text-copyright-dark-color:/);
});

test("homepage config reports a missing field with its full path", () => {
  const invalid = structuredClone(config);
  delete invalid.desktop.book.width;

  assert.throws(
    () => validateHomepageConfig(invalid),
    /desktop\.book\.width is required/,
  );
});

test("homepage config rejects invalid CSS units", () => {
  const invalid = structuredClone(config);
  invalid.desktop.book.width = "68";

  assert.throws(
    () => validateHomepageConfig(invalid),
    /desktop\.book\.width must be a CSS length, received "68"/,
  );
});

test("homepage config rejects invalid colors", () => {
  const invalid = structuredClone(config);
  invalid.materials.paperColor = "white-ish";

  assert.throws(
    () => validateHomepageConfig(invalid),
    /materials\.paperColor must be a CSS color/,
  );
});

test("homepage config rejects texture opacity outside zero to one", () => {
  const invalid = structuredClone(config);
  invalid.materials.paperTextureOpacity = 1.2;

  assert.throws(
    () => validateHomepageConfig(invalid),
    /materials\.paperTextureOpacity must be between 0 and 1/,
  );
});

test("homepage config rejects unsupported font family tokens", () => {
  const invalid = structuredClone(config);
  invalid.textStyles.navigationBrand.fontFamily = "comic";

  assert.throws(
    () => validateHomepageConfig(invalid),
    /textStyles\.navigationBrand\.fontFamily must be one of serif, sans, monospace/,
  );
});

test("homepage schema documents the parameters users edit most often", () => {
  assert.match(
    schema.properties.desktop.properties.book.properties.width.description,
    /书本/,
  );
  assert.match(
    schema.properties.textStyles.properties.catalogTitle.description,
    /目录标题/,
  );
  assert.match(
    schema.properties.materials.properties.bindingColor.description,
    /装订布/,
  );
  assert.match(
    schema.properties.mobile.properties.layout.properties.pageMinHeight
      .description,
    /移动端/,
  );
  assert.match(
    schema.properties.textStyles.properties.navigationTitle.description,
    /导航标题/,
  );
});

test("homepage CSS consumes desktop and mobile configuration variables", async () => {
  const css = await readFile(
    new URL("../src/styles/home.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /height: var\(--home-desktop-navigation-height\)/,
  );
  assert.match(css, /width: var\(--home-desktop-book-width\)/);
  assert.match(
    css,
    /font-size: var\(--home-text-catalog-title-desktop-size\)/,
  );
  assert.match(
    css,
    /font-size: var\(--home-text-catalog-title-mobile-size\)/,
  );
  assert.match(css, /background-color: var\(--home-material-paper-color\)/);
});

test("homepage components receive site copy from configuration", async () => {
  const [page, navigation, quote] = await Promise.all([
    readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/SiteNavigation.astro", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/DailyQuote.astro", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(page, /content=\{homepageConfig\.content\.navigationTitle\}/);
  assert.match(
    page,
    /<SiteNavigation[\s\S]*siteName=\{homepageConfig\.content\.siteName\}/,
  );
  assert.match(
    page,
    /title=\{homepageConfig\.content\.navigationTitle\}/,
  );
  assert.match(page, /siteName=\{homepageConfig\.content\.siteName\}/);
  assert.doesNotMatch(navigation, />ZHIMIN</);
  assert.doesNotMatch(quote, />© \{year\} ZHIMIN</);
});
