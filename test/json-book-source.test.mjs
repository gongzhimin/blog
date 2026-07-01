import test from "node:test";
import assert from "node:assert/strict";
import { createJsonBookDocument } from "../src/book/sources/json-book-source.mjs";

test("createJsonBookDocument converts standalone JSON into a BookDocument", () => {
  const document = createJsonBookDocument({
    id: "demo-book",
    title: "一本独立的小书",
    tocTitle: "章节",
    entries: [
      {
        id: "chapter-one",
        title: "第一章",
        date: "2026-07-01",
        bodyType: "markdown",
        body: "# 第一章\n\n这不是博客文章。",
      },
      {
        title: "HTML 附录",
        date: "2026-07-02",
        bodyType: "html",
        body: "<p>HTML body</p>",
      },
    ],
  });

  assert.equal(document.id, "demo-book");
  assert.equal(document.title, "一本独立的小书");
  assert.equal(document.tocTitle, "章节");
  assert.deepEqual(
    document.entries.map((entry) => ({
      id: entry.id,
      collection: entry.collection,
      title: entry.title,
      bodyType: entry.bodyType,
      date: entry.date.toISOString().slice(0, 10),
    })),
    [
      {
        id: "chapter-one",
        collection: "json",
        title: "第一章",
        bodyType: "markdown",
        date: "2026-07-01",
      },
      {
        id: "entry-2",
        collection: "json",
        title: "HTML 附录",
        bodyType: "html",
        date: "2026-07-02",
      },
    ],
  );
});
