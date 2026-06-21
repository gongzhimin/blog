const MAX_QUOTE_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 120;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SOURCES = new Set(["shanbay", "youdao", "fallback"]);

function cleanText(value) {
  return typeof value === "string"
    ? value.replaceAll("\u00a0", " ").trim()
    : "";
}

export function formatShanghaiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function isValidQuote(quote, expectedDate) {
  if (!quote || typeof quote !== "object") {
    return false;
  }

  const english = cleanText(quote.english);
  const chinese = cleanText(quote.chinese);
  const author = cleanText(quote.author);

  return (
    DATE_PATTERN.test(quote.date) &&
    quote.date === expectedDate &&
    english.length > 0 &&
    english.length <= MAX_QUOTE_LENGTH &&
    chinese.length > 0 &&
    chinese.length <= MAX_QUOTE_LENGTH &&
    author.length <= MAX_AUTHOR_LENGTH &&
    SOURCES.has(quote.source)
  );
}

export function parseShanbay(payload, date) {
  const quote = {
    date: cleanText(payload?.assign_date),
    english: cleanText(payload?.content),
    chinese: cleanText(payload?.translation),
    author: cleanText(payload?.author),
    source: "shanbay",
  };

  return isValidQuote(quote, date) ? quote : null;
}

export function parseYoudao(payload, date) {
  const records = Array.isArray(payload?.[date]) ? payload[date] : [];
  const compactDate = date.replaceAll("-", "");
  const candidates = records.filter((record) => {
    const recordDate = String(record?.startTime ?? "").slice(0, 8);
    return record?.type === "壹句" && recordDate === compactDate;
  });
  const record =
    candidates.find(
      (candidate) =>
        candidate.media === "DAILY" || candidate.shape === "DAILY",
    ) ?? candidates.find((candidate) => cleanText(candidate.source));

  if (!record) {
    return null;
  }

  const quote = {
    date,
    english: cleanText(record.title),
    chinese: cleanText(record.summary),
    author: cleanText(record.source),
    source: "youdao",
  };

  return isValidQuote(quote, date) ? quote : null;
}

async function requestJson(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDailyQuote({
  fetchImpl = fetch,
  date,
  previous,
  timeoutMs = 8000,
  logger = console,
}) {
  const sources = [
    {
      name: "Shanbay",
      url: `https://apiv3.shanbay.com/weapps/dailyquote/quote/?date=${encodeURIComponent(date)}`,
      parse: parseShanbay,
    },
    {
      name: "Youdao",
      url:
        "https://dict.youdao.com/infoline?" +
        new URLSearchParams({
          mode: "publish",
          date,
          update: "auto",
          apiversion: "5.0",
        }),
      parse: parseYoudao,
    },
  ];

  for (const source of sources) {
    try {
      const payload = await requestJson(fetchImpl, source.url, timeoutMs);
      const quote = source.parse(payload, date);
      if (quote) {
        return quote;
      }
      throw new Error("invalid quote response");
    } catch (error) {
      logger.warn(
        `[daily-quote] ${source.name} failed: ${error.message ?? error}`,
      );
    }
  }

  return previous;
}
