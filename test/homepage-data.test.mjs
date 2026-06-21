import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCatalogEntries,
  formatCatalogDate,
  getPostDate,
} from "../src/lib/homepage.mjs";

const makePost = (index) => ({
  id: `post-${index}`,
  data: {
    title: `文章 ${index}`,
    date: new Date(`2026-06-${String(index).padStart(2, "0")}T00:00:00Z`),
  },
});

test("getPostDate supports life and technical collection dates", () => {
  const date = new Date("2026-06-20T00:00:00Z");

  assert.equal(getPostDate({ data: { date } }), date);
  assert.equal(getPostDate({ data: { pubDatetime: date } }), date);
});

test("formatCatalogDate returns desktop and mobile formats", () => {
  const date = new Date("2026-06-20T00:00:00Z");

  assert.equal(formatCatalogDate(date, false), "2026.06.20");
  assert.equal(formatCatalogDate(date, true), "06.20");
});

test("buildCatalogEntries sorts newest first and prepares desktop and mobile entries", () => {
  const entries = buildCatalogEntries(
    [1, 8, 3, 7, 2, 6, 5, 4].map(makePost),
    "/life",
  );

  assert.equal(entries.length, 6);
  assert.deepEqual(entries.map((entry) => entry.title), [
    "文章 8",
    "文章 7",
    "文章 6",
    "文章 5",
    "文章 4",
    "文章 3",
  ]);
  assert.deepEqual(entries.map((entry) => entry.mobileHidden), [
    false,
    false,
    false,
    true,
    true,
    true,
  ]);
  assert.equal(entries[0].href, "/life/post-8");
});
