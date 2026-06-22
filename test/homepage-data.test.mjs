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

  assert.equal(formatCatalogDate(date, "YYYY.MM.DD"), "2026.06.20");
  assert.equal(formatCatalogDate(date, "MM/DD"), "06/20");
});

test("buildCatalogEntries uses independent catalog limits and date formats", () => {
  const entries = buildCatalogEntries(
    [1, 8, 3, 7, 2, 6, 5, 4].map(makePost),
    "/life",
    {
      wideMaximumEntries: 5,
      narrowMaximumEntries: 2,
      wideDateFormat: "YYYY-MM-DD",
      compactDateFormat: "MM.DD",
    },
  );

  assert.equal(entries.length, 5);
  assert.deepEqual(entries.map((entry) => entry.title), [
    "文章 8",
    "文章 7",
    "文章 6",
    "文章 5",
    "文章 4",
  ]);
  assert.deepEqual(entries.map((entry) => entry.narrowHidden), [
    false,
    false,
    true,
    true,
    true,
  ]);
  assert.equal(entries[0].href, "/life/post-8");
  assert.equal(entries[0].date, "2026-06-08");
  assert.equal(entries[0].compactDate, "06.08");
});
