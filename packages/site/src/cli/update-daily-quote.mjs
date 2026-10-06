/**
 * @file packages/site/src/cli/update-daily-quote.mjs
 * @description 每日格言定时抓取与原子更新脚本。
 * 通过多数据源尝试抓取今日名言，校验其非空与日期一致性；
 * 采用临时文件写入后原子重命名（Atomic Rename）策略更新 daily-quote.json，杜绝并发读取半成品文件的竞态条件。
 */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  fetchDailyQuote,
  formatShanghaiDate,
} from '../internal/quotes/daily-quote.mjs';

const quoteUrl = new URL('../data/daily-quote.json', import.meta.url);
const quotePath = fileURLToPath(quoteUrl);
const previousText = await readFile(quoteUrl, 'utf8');
const previous = JSON.parse(previousText);
const date = formatShanghaiDate();
const quote = await fetchDailyQuote({ date, previous });

if (!quote) {
  console.log('[daily-quote] No valid quote is available; keeping the file.');
  process.exit(0);
}

const nextText = `${JSON.stringify(quote, null, 2)}\n`;

if (nextText === previousText) {
  console.log(`[daily-quote] Quote is already current for ${quote.date}.`);
  process.exit(0);
}

const temporaryPath = `${quotePath}.tmp-${process.pid}`;
await writeFile(temporaryPath, nextText, 'utf8');
await rename(temporaryPath, quotePath);
console.log(`[daily-quote] Updated ${quote.date} from ${quote.source}.`);
