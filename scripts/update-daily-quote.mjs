import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  fetchDailyQuote,
  formatShanghaiDate,
} from "../src/lib/daily-quote.mjs";

const quoteUrl = new URL("../src/data/daily-quote.json", import.meta.url);
const quotePath = fileURLToPath(quoteUrl);
const previousText = await readFile(quoteUrl, "utf8");
const previous = JSON.parse(previousText);
const date = formatShanghaiDate();
const quote = await fetchDailyQuote({ date, previous });

if (!quote) {
  console.log("[daily-quote] No valid quote is available; keeping the file.");
  process.exit(0);
}

const nextText = `${JSON.stringify(quote, null, 2)}\n`;

if (nextText === previousText) {
  console.log(`[daily-quote] Quote is already current for ${quote.date}.`);
  process.exit(0);
}

const temporaryPath = `${quotePath}.tmp-${process.pid}`;
await writeFile(temporaryPath, nextText, "utf8");
await rename(temporaryPath, quotePath);
console.log(`[daily-quote] Updated ${quote.date} from ${quote.source}.`);
