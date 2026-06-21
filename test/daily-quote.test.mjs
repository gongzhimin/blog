import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchDailyQuote,
  formatShanghaiDate,
  isValidQuote,
  parseShanbay,
  parseYoudao,
} from "../src/lib/daily-quote.mjs";

const date = "2026-06-21";

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  };
}

test("parseShanbay normalizes the requested date and author", () => {
  const quote = parseShanbay(
    {
      assign_date: date,
      content: "Attention is vitality.",
      translation: "专注带来活力。",
      author: "Susan Sontag",
    },
    date,
  );

  assert.deepEqual(quote, {
    date,
    english: "Attention is vitality.",
    chinese: "专注带来活力。",
    author: "Susan Sontag",
    source: "shanbay",
  });
});

test("parseShanbay rejects a response assigned to another date", () => {
  assert.equal(
    parseShanbay(
      {
        assign_date: "2026-06-20",
        content: "Yesterday",
        translation: "昨天",
        author: "Someone",
      },
      date,
    ),
    null,
  );
});

test("parseYoudao prefers the dated daily record over duplicate article cards", () => {
  const quote = parseYoudao(
    {
      [date]: [
        {
          type: "壹句",
          media: "ARTICLE",
          startTime: 202606210000,
          title: "Duplicate article card.",
          summary: "重复的专栏卡片。",
          source: "",
        },
        {
          type: "壹句",
          media: "DAILY",
          shape: "DAILY",
          startTime: 202606210010,
          title: "I first saw summer from his shoulders.",
          summary: "我第一次从他的肩头看见夏天。",
          source: "今日夏至",
        },
      ],
    },
    date,
  );

  assert.deepEqual(quote, {
    date,
    english: "I first saw summer from his shoulders.",
    chinese: "我第一次从他的肩头看见夏天。",
    author: "今日夏至",
    source: "youdao",
  });
});

test("isValidQuote enforces date, required text, and field length limits", () => {
  const valid = {
    date,
    english: "Attention is vitality.",
    chinese: "专注带来活力。",
    author: "",
    source: "fallback",
  };

  assert.equal(isValidQuote(valid, date), true);
  assert.equal(isValidQuote({ ...valid, date: "2026/06/21" }, date), false);
  assert.equal(isValidQuote({ ...valid, english: " " }, date), false);
  assert.equal(isValidQuote({ ...valid, chinese: "x".repeat(501) }, date), false);
  assert.equal(isValidQuote({ ...valid, author: "x".repeat(121) }, date), false);
});

test("fetchDailyQuote falls back from Shanbay to Youdao", async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);

    if (url.includes("shanbay")) {
      return jsonResponse({}, { ok: false, status: 503 });
    }

    return jsonResponse({
      [date]: [
        {
          type: "壹句",
          media: "DAILY",
          startTime: 202606210010,
          title: "A useful fallback.",
          summary: "一条有效的备用内容。",
          source: "Fallback Author",
        },
      ],
    });
  };

  const quote = await fetchDailyQuote({
    fetchImpl,
    date,
    previous: null,
    logger: { warn() {} },
  });

  assert.equal(requestedUrls.length, 2);
  assert.equal(quote.source, "youdao");
  assert.equal(quote.author, "Fallback Author");
});

test("fetchDailyQuote preserves the previous quote when both sources fail", async () => {
  const previous = {
    date: "2026-06-20",
    english: "Keep the last known good value.",
    chinese: "保留上一条有效内容。",
    author: "Previous Author",
    source: "fallback",
  };
  const fetchImpl = async () => {
    throw new Error("network unavailable");
  };

  const quote = await fetchDailyQuote({
    fetchImpl,
    date,
    previous,
    logger: { warn() {} },
  });

  assert.deepEqual(quote, previous);
});

test("formatShanghaiDate uses the next calendar day after 22:00 UTC", () => {
  assert.equal(
    formatShanghaiDate(new Date("2026-06-20T22:15:00Z")),
    "2026-06-21",
  );
});
