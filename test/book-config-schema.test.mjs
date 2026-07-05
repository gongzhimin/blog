import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateBookConfig } from "../src/book/config/book-config.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

const config = await readJson("../src/data/book-config.json");
const schema = await readJson("../src/data/book-config.schema.json");

test("book config schema documents the runtime-critical groups", () => {
  assert.deepEqual(schema.required, [
    "theme",
    "nav",
    "book",
    "footer",
    "backgrounds",
  ]);
  assert.match(schema.properties.book.properties.coverSprite.description, /封面精灵图/);
  assert.match(schema.properties.book.properties.paperTexture.description, /纸张背景/);
  assert.match(schema.properties.book.properties.mobileContentPage.description, /移动端/);
  assert.match(schema.properties.book.properties.pagination.description, /分页/);
});

test("valid book config passes runtime validation", () => {
  assert.doesNotThrow(() => validateBookConfig(config));
  assert.equal(config.book.paperTexture.enabled, true);
  assert.equal(config.book.paperTexture.image, "/paper-bg-2.jpg");
  assert.equal(config.book.paperTexture.opacity, 1);
  assert.equal(config.book.paperTexture.blendMode, "normal");
});

test("book config validation reports precise paths", () => {
  const invalid = structuredClone(config);
  delete invalid.book.coverSprite.positions.back;

  assert.throws(
    () => validateBookConfig(invalid),
    /book\.coverSprite\.positions\.back is required/,
  );
});

test("book config validation rejects invalid geometry", () => {
  const invalid = structuredClone(config);
  invalid.book.mobileContentPage.width = 0;

  assert.throws(
    () => validateBookConfig(invalid),
    /book\.mobileContentPage\.width must be a positive number/,
  );
});
