import test from "node:test";
import assert from "node:assert/strict";
import {
  createAstroBlogDocument,
  getBookEntryDate,
} from "../src/book/sources/astro-blog-source.mjs";
import { buildBookRuntime } from "../src/book/assembler/build-book-runtime.mjs";

test("createAstroBlogDocument combines life and blog posts into sorted book entries", () => {
  const older = new Date("2026-06-20T00:00:00Z");
  const newer = new Date("2026-06-30T00:00:00Z");
  const document = createAstroBlogDocument({
    lifePosts: [
      {
        id: "life-old",
        body: "Life body",
        data: { title: "Life Old", date: older },
      },
    ],
    blogPosts: [
      {
        id: "blog-new",
        body: "# Blog New\n\nBlog body",
        data: { title: "Blog New", pubDatetime: newer },
      },
    ],
  });

  assert.equal(document.id, "zhimin-blog");
  assert.equal(document.title, "Zhimin 的博客书");
  assert.deepEqual(
    document.entries.map((entry) => ({
      id: entry.id,
      collection: entry.collection,
      title: entry.title,
      bodyType: entry.bodyType,
    })),
    [
      {
        id: "blog-new",
        collection: "blog",
        title: "Blog New",
        bodyType: "markdown",
      },
      {
        id: "life-old",
        collection: "life",
        title: "Life Old",
        bodyType: "markdown",
      },
    ],
  );
  assert.equal(
    getBookEntryDate(document.entries[0]).toISOString(),
    newer.toISOString(),
  );
});

test("buildBookRuntime renders entries and creates toc/runtime config", () => {
  const bookConfig = {
    book: {
      turn: { startPage: 7, totalPages: 112 },
    },
  };
  const document = {
    id: "sample",
    title: "Sample",
    tocTitle: "目录",
    entries: [
      {
        id: "entry-1",
        collection: "blog",
        title: "Entry One",
        date: new Date("2026-06-30T00:00:00Z"),
        body: "# Entry One\n\nBody",
        bodyType: "markdown",
        metadata: {},
      },
    ],
  };

  const runtime = buildBookRuntime({
    document,
    bookConfig,
    renderMarkdown: (markdown) => `<p>${markdown}</p>`,
    stripLeadingTitle: (markdown) => markdown.replace(/^# Entry One\n\n/, ""),
    formatDate: () => "2026/06/30",
  });

  assert.equal(runtime.document.id, "sample");
  assert.equal(runtime.articles[0].title, "Entry One");
  assert.equal(runtime.articles[0].dateStr, "2026/06/30");
  assert.equal(runtime.articles[0].bodyHTML, "<p>Body</p>");
  assert.match(runtime.toc, /<div class="table-contents">/);
  assert.match(runtime.toc, /Entry One/);
  assert.equal(runtime.config.book.turn.startPage, 7);
  assert.equal(
    runtime.config.book.turn.backPage,
    runtime.config.book.turn.totalPages - 1,
  );
  assert.equal(runtime.config.source.documentId, "sample");
});
