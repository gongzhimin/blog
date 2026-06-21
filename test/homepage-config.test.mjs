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

  assert.match(css, /--home-desktop-book-width:68%/);
  assert.match(css, /--home-desktop-book-ratio:1\.8 \/ 1/);
  assert.match(css, /--home-material-paper-color:#ffffff/);
  assert.match(css, /--home-mobile-catalog-font-size:1rem/);
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

test("homepage schema documents the parameters users edit most often", () => {
  assert.match(
    schema.properties.desktop.properties.book.properties.width.description,
    /书本/,
  );
  assert.match(
    schema.properties.desktop.properties.typography.properties.catalogFontSize
      .description,
    /目录/,
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
});
