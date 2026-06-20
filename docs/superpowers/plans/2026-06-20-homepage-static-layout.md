# 首页静态杂志布局实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有首页重建为桌面端一屏内完整呈现的双页书籍目录，并在移动端转换为生活、技术两张纵向完整纸页。

**架构：** 首页继续使用 Astro 静态生成。文章选择和日期格式化放在可直接单测的纯 JavaScript 模块中；导航、目录纸页和每日一句拆成专用 Astro 组件；首页视觉规则放入独立的 `home.css`，避免继续扩大共享样式的职责。每日一句本阶段读取本地静态数据，但数据结构与后续 API 缓存保持一致。

**技术栈：** Astro 6、Astro Content Collections、CSS Grid、原生 `details` 移动菜单、Astro Icon + Lucide、Node Test Runner、JSDOM、Playwright Chromium。

---

## 范围

本计划实现：

- 首页吸顶导航的静态结构。
- 紧凑作者宣言。
- 桌面端生活/技术双页书籍目录。
- 桌面端每类最多六篇，移动端每类显示前三篇。
- 双语每日一句与版权。
- 响应式、键盘焦点、减少动态效果和主题切换。
- 构建结果、DOM 结构和浏览器布局验证。

本计划不实现：

- 每日一句第三方 API、定时任务和部署触发。
- 新的页面进入、翻页、滚动或列表出现动效。
- 归档页、文章页和 About 页的重新设计。
- 将新导航推广到首页以外的页面。

## 文件结构

- 创建：`src/lib/homepage.mjs`
  - 职责：文章日期提取、倒序选择、目录日期格式化和目录视图模型生成。
- 创建：`src/data/daily-quote.json`
  - 职责：提供符合未来 API 缓存结构的本地每日一句。
- 创建：`src/components/SiteNavigation.astro`
  - 职责：首页桌面导航、移动菜单、RSS 和主题切换入口。
- 创建：`src/components/ThemeToggle.astro`
  - 职责：初始化并切换 `data-theme`，保存用户主题偏好。
- 创建：`src/components/BookCatalogPage.astro`
  - 职责：渲染单张完整目录纸页。
- 创建：`src/components/DailyQuote.astro`
  - 职责：渲染英文原句、中文译文和版权。
- 修改：`src/pages/index.astro`
  - 职责：读取两类内容，组合导航、头部、双页书籍和页脚。
- 修改：`astro.config.mjs`
  - 职责：启用 Astro Icon，并只打包首页使用的 Lucide 图标。
- 创建：`src/styles/home.css`
  - 职责：首页专用布局、纸页、目录、页脚和移动端规则。
- 修改：`src/styles/global.css`
  - 职责：补充暗色主题变量和全局减少动态效果规则；不承载首页组件布局。
- 修改：`package.json`
  - 职责：增加检查、首页测试和浏览器测试命令。
- 修改：`package-lock.json`
  - 职责：锁定 Lucide 图标数据和 Playwright 测试依赖。
- 创建：`playwright.config.mjs`
  - 职责：启动 Astro 开发服务器并配置 Chromium 测试。
- 创建：`test/homepage-data.test.mjs`
  - 职责：验证排序、六篇上限、移动端前三篇标记和日期格式。
- 创建：`test/homepage-render.test.mjs`
  - 职责：验证构建后首页的语义结构、链接、纸页和题记。
- 创建：`test/homepage-layout.spec.mjs`
  - 职责：验证桌面/手机布局、首屏高度、主题切换和水平溢出。

## 任务 1：建立首页数据模型

**文件：**
- 创建：`test/homepage-data.test.mjs`
- 创建：`src/lib/homepage.mjs`
- 创建：`src/data/daily-quote.json`

- [ ] **步骤 1：编写文章选择和日期格式测试**

创建 `test/homepage-data.test.mjs`：

```js
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

test("buildCatalogEntries sorts newest first, limits desktop to six, and marks entries after three for mobile", () => {
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
```

- [ ] **步骤 2：运行单测并确认因模块不存在而失败**

运行：

```bash
node --test test/homepage-data.test.mjs
```

预期：FAIL，错误包含 `Cannot find module '../src/lib/homepage.mjs'`。

- [ ] **步骤 3：实现最小首页数据模块**

创建 `src/lib/homepage.mjs`：

```js
export function getPostDate(post) {
  return post.data.pubDatetime ?? post.data.date;
}

export function formatCatalogDate(date, compact = false) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return compact ? `${month}.${day}` : `${year}.${month}.${day}`;
}

export function buildCatalogEntries(posts, basePath) {
  return [...posts]
    .sort((a, b) => getPostDate(b).valueOf() - getPostDate(a).valueOf())
    .slice(0, 6)
    .map((post, index) => {
      const date = getPostDate(post);
      return {
        title: post.data.title,
        href: `${basePath}/${post.id}`,
        date: formatCatalogDate(date),
        compactDate: formatCatalogDate(date, true),
        mobileHidden: index >= 3,
      };
    });
}
```

- [ ] **步骤 4：增加本地每日一句数据**

创建 `src/data/daily-quote.json`：

```json
{
  "date": "2026-06-20",
  "english": "The quieter you become, the more you can hear.",
  "chinese": "你越安静，越能听见真正重要的声音。",
  "source": "fallback"
}
```

- [ ] **步骤 5：运行数据单测**

运行：

```bash
node --test test/homepage-data.test.mjs
```

预期：3 个测试全部 PASS。

- [ ] **步骤 6：提交数据层**

```bash
git add src/lib/homepage.mjs src/data/daily-quote.json test/homepage-data.test.mjs
git commit -m "test: define homepage catalog data"
```

## 任务 2：建立构建后首页结构测试

**文件：**
- 修改：`astro.config.mjs`
- 修改：`package.json`
- 创建：`test/homepage-render.test.mjs`

- [ ] **步骤 1：增加构建检查脚本**

将 `package.json` 的脚本调整为：

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "preview": "astro preview",
    "test": "npm run build && node --test test/*.test.*",
    "test:homepage": "npm run build && node --test test/homepage-*.test.mjs",
    "test:e2e": "playwright test",
    "astro": "astro"
  }
}
```

保留原有 webhook 测试文件，`npm test` 仍会同时运行它。

- [ ] **步骤 2：编写构建后 DOM 结构测试**

创建 `test/homepage-render.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

async function loadHomepage() {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  return new JSDOM(html).window.document;
}

test("homepage renders the approved linear structure", async () => {
  const document = await loadHomepage();
  const bodyChildren = [...document.body.children];

  assert.equal(bodyChildren[0].classList.contains("home-navigation"), true);
  assert.ok(document.querySelector(".home-hero"));
  assert.ok(document.querySelector(".home-book"));
  assert.ok(document.querySelector(".daily-quote"));
});

test("homepage renders life first, technical second, and required navigation links", async () => {
  const document = await loadHomepage();
  const pages = [...document.querySelectorAll(".book-page")];
  assert.equal(pages.length, 2);
  assert.equal(pages[0].dataset.section, "life");
  assert.equal(pages[1].dataset.section, "technical");

  for (const href of ["/", "/blog", "/life", "/about", "/rss.xml"]) {
    assert.ok(document.querySelector(`.home-navigation a[href="${href}"]`));
  }
});

test("homepage quote contains only the bilingual quote and copyright", async () => {
  const document = await loadHomepage();
  const footer = document.querySelector(".daily-quote");
  const currentYear = new Date().getFullYear();

  assert.ok(footer.querySelector(".daily-quote__english"));
  assert.ok(footer.querySelector(".daily-quote__chinese"));
  assert.equal(
    footer.querySelector(".daily-quote__copyright").textContent.trim(),
    `© ${currentYear} ZHIMIN`,
  );
  assert.equal(footer.querySelector(".daily-quote__author"), null);
});
```

- [ ] **步骤 3：运行首页测试并确认旧首页结构失败**

运行：

```bash
npm run test:homepage
```

预期：数据测试 PASS；DOM 结构测试 FAIL，因为旧首页没有 `.home-navigation`、`.home-book` 和 `.daily-quote`。

- [ ] **步骤 4：保留失败测试，进入最小结构实现**

不要在红灯状态提交。任务 3 让结构测试通过后，再把测试、脚本和实现一起提交。

## 任务 3：实现首页语义组件

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json`
- 创建：`src/components/ThemeToggle.astro`
- 创建：`src/components/SiteNavigation.astro`
- 创建：`src/components/BookCatalogPage.astro`
- 创建：`src/components/DailyQuote.astro`
- 修改：`src/pages/index.astro`

- [ ] **步骤 1：安装 Lucide 图标数据**

运行：

```bash
npm install --save-dev @iconify-json/lucide
```

预期：`package.json` 和 `package-lock.json` 更新，安装成功。

- [ ] **步骤 2：创建主题切换组件**

先修改 `astro.config.mjs`，启用图标集并限制打包范围：

```js
// @ts-check
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://zhimin.ink",
  integrations: [
    icon({
      include: {
        lucide: ["menu", "moon", "sun"],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

创建 `src/components/ThemeToggle.astro`：

```astro
---
import { Icon } from "astro-icon/components";
---

<button class="theme-toggle" type="button" aria-label="切换明暗主题" title="切换明暗主题">
  <Icon class="theme-toggle__light" name="lucide:sun" />
  <Icon class="theme-toggle__dark" name="lucide:moon" />
</button>

<script is:inline>
  const root = document.documentElement;
  const storedTheme = localStorage.getItem("theme");
  const preferredTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  root.dataset.theme = storedTheme || preferredTheme;

  if (!document.documentElement.dataset.themeListenerBound) {
    document.documentElement.dataset.themeListenerBound = "true";
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".theme-toggle");
      if (!button) return;

      const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = nextTheme;
      localStorage.setItem("theme", nextTheme);
    });
  }
</script>
```

- [ ] **步骤 3：创建首页导航组件**

创建 `src/components/SiteNavigation.astro`，使用以下结构：

```astro
---
import { Icon } from "astro-icon/components";
import ThemeToggle from "./ThemeToggle.astro";

const links = [
  { href: "/blog", label: "技术" },
  { href: "/life", label: "生活" },
  { href: "/about", label: "关于" },
];
---

<header class="home-navigation">
  <nav class="home-navigation__inner" aria-label="主要导航">
    <a class="home-navigation__brand" href="/" aria-current="page">ZHIMIN</a>

    <div class="home-navigation__desktop">
      {links.map((link) => <a href={link.href}>{link.label}</a>)}
      <a href="/rss.xml">RSS</a>
      <ThemeToggle />
    </div>

    <div class="home-navigation__mobile">
      <a href="/rss.xml">RSS</a>
      <ThemeToggle />
      <details class="mobile-menu">
        <summary aria-label="打开导航菜单" title="打开导航菜单">
          <Icon name="lucide:menu" />
        </summary>
        <div class="mobile-menu__panel">
          {links.map((link) => <a href={link.href}>{link.label}</a>)}
        </div>
      </details>
    </div>
  </nav>
</header>
```

- [ ] **步骤 4：创建书页目录组件**

创建 `src/components/BookCatalogPage.astro`：

```astro
---
type Entry = {
  title: string;
  href: string;
  date: string;
  compactDate: string;
  mobileHidden: boolean;
};

type Props = {
  section: "life" | "technical";
  title: string;
  entries: Entry[];
  archiveHref: string;
  archiveLabel: string;
};

const { section, title, entries, archiveHref, archiveLabel } = Astro.props;
---

<section class="book-page" data-section={section} aria-labelledby={`${section}-title`}>
  <h2 id={`${section}-title`} class="book-page__title">{title}</h2>

  <ol class="catalog-list">
    {entries.map((entry) => (
      <li class:list={["catalog-entry", { "catalog-entry--mobile-hidden": entry.mobileHidden }]}>
        <a href={entry.href}>
          <span class="catalog-entry__title">{entry.title}</span>
          <span class="catalog-entry__leader" aria-hidden="true"></span>
          <time class="catalog-entry__date catalog-entry__date--desktop">{entry.date}</time>
          <time class="catalog-entry__date catalog-entry__date--mobile">{entry.compactDate}</time>
        </a>
      </li>
    ))}
  </ol>

  <a class="book-page__archive" href={archiveHref}>{archiveLabel} →</a>
</section>
```

- [ ] **步骤 5：创建每日一句组件**

创建 `src/components/DailyQuote.astro`：

```astro
---
type Props = {
  english: string;
  chinese: string;
  year: number;
};

const { english, chinese, year } = Astro.props;
---

<footer class="daily-quote">
  <div class="daily-quote__text">
    <p class="daily-quote__english">“{english}”</p>
    <p class="daily-quote__chinese">{chinese}</p>
  </div>
  <p class="daily-quote__copyright">© {year} ZHIMIN</p>
</footer>
```

- [ ] **步骤 6：重建首页结构**

将 `src/pages/index.astro` 重写为：

```astro
---
import "../styles/global.css";
import "../styles/home.css";
import { getCollection } from "astro:content";
import SiteNavigation from "../components/SiteNavigation.astro";
import BookCatalogPage from "../components/BookCatalogPage.astro";
import DailyQuote from "../components/DailyQuote.astro";
import quote from "../data/daily-quote.json";
import { buildCatalogEntries } from "../lib/homepage.mjs";

const lifeEntries = buildCatalogEntries(await getCollection("life"), "/life");
const technicalEntries = buildCatalogEntries(await getCollection("blog"), "/blog");
const currentYear = new Date().getFullYear();
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="写技术，也记录技术之外的生活。" />
    <title>Zhimin</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/rss.xml" />
  </head>
  <body class="home-body">
    <SiteNavigation />

    <div class="home-shell">
      <main class="home-page">
        <header class="home-hero">
          <h1>写技术，也记录技术之外的生活。</h1>
          <p>软件、工具、思考与日常。</p>
        </header>

        <section class="home-book" aria-label="最新文章目录">
          <BookCatalogPage
            section="life"
            title="生活随笔"
            entries={lifeEntries}
            archiveHref="/life"
            archiveLabel="全部生活文章"
          />
          <BookCatalogPage
            section="technical"
            title="技术笔记"
            entries={technicalEntries}
            archiveHref="/blog"
            archiveLabel="全部技术文章"
          />
        </section>
      </main>

      <DailyQuote
        english={quote.english}
        chinese={quote.chinese}
        year={currentYear}
      />
    </div>
  </body>
</html>
```

- [ ] **步骤 7：运行构建后结构测试**

运行：

```bash
npm run test:homepage
```

预期：数据测试和 3 个 DOM 结构测试全部 PASS。此时页面尚未完成视觉布局。

- [ ] **步骤 8：提交语义结构**

```bash
git add astro.config.mjs package.json package-lock.json src/components src/pages/index.astro test/homepage-render.test.mjs
git commit -m "feat: build semantic homepage structure"
```

## 任务 4：实现桌面双页书籍和移动纸页布局

**文件：**
- 创建：`src/styles/home.css`
- 修改：`src/styles/global.css`

- [ ] **步骤 1：为首页建立稳定尺寸和主题变量**

在 `src/styles/global.css` 的颜色变量后增加暗色主题：

```css
html[data-theme="dark"] {
  --color-bg: 31, 31, 29;
  --color-bg-alt: 38, 37, 34;
  --color-paper: 44, 42, 38;
  --color-text-primary: 235, 231, 223;
  --color-text-secondary: 190, 184, 174;
  --color-text-muted: 151, 143, 132;
  --color-border: 82, 78, 71;
  --color-accent: 194, 154, 112;
  --color-code-bg: 49, 47, 43;
}
```

在文件末尾补充：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **步骤 2：创建首页桌面布局样式**

创建 `src/styles/home.css`，先实现页面骨架：

```css
.home-body {
  min-height: 100svh;
}

.home-navigation {
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 3.75rem;
  background: rgb(var(--color-bg));
  border-bottom: 1px solid rgba(var(--color-border), 0.72);
}

.home-navigation__inner,
.home-shell {
  width: min(100% - 2rem, 72rem);
  margin-inline: auto;
}

.home-navigation__inner {
  min-height: 3.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.home-navigation__brand,
.home-navigation__desktop,
.home-navigation__mobile,
.theme-toggle,
.mobile-menu summary {
  font-family: var(--font-sans);
}

.home-navigation__desktop {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.home-navigation__mobile {
  display: none;
}

.home-shell {
  min-height: calc(100svh - 3.75rem);
  display: grid;
  grid-template-rows: minmax(0, 1fr) minmax(6rem, auto);
}

.home-page {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(8.75rem, 0.24fr) minmax(22.5rem, 1fr);
  animation: none;
}

.home-hero {
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: 1px solid rgba(var(--color-border), 0.72);
}

.home-hero h1 {
  max-width: 52rem;
  font-size: 3rem;
  line-height: 1.12;
  letter-spacing: 0;
}

.home-hero p {
  margin: 0.7rem 0 0;
  color: rgb(var(--color-text-secondary));
  font-size: 1rem;
}

.home-book {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  padding-block: 1rem;
}
```

- [ ] **步骤 3：实现书页和目录样式**

继续在 `src/styles/home.css` 中增加：

```css
.book-page {
  min-width: 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 1.5rem clamp(1.5rem, 3vw, 2.75rem) 1.25rem;
  background: rgb(var(--color-paper));
  border-block: 1px solid rgba(var(--color-border), 0.66);
}

.book-page:first-child {
  border-left: 1px solid rgba(var(--color-border), 0.66);
  box-shadow: inset -1rem 0 1.5rem -1.5rem rgba(36, 28, 18, 0.34);
}

.book-page:last-child {
  border-right: 1px solid rgba(var(--color-border), 0.66);
  box-shadow: inset 1rem 0 1.5rem -1.5rem rgba(36, 28, 18, 0.34);
}

.book-page__title {
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(var(--color-border), 0.55);
  font-size: 1.05rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.catalog-list {
  min-height: 0;
  display: grid;
  align-content: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0.75rem 0;
  list-style: none;
}

.catalog-entry {
  min-width: 0;
}

.catalog-entry a {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(1rem, 1fr) auto;
  align-items: end;
  gap: 0.45rem;
  min-height: 1.75rem;
  background: none;
}

.catalog-entry__title {
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.45;
}

.catalog-entry__leader {
  border-bottom: 1px dotted rgba(var(--color-text-muted), 0.62);
  transform: translateY(-0.4em);
}

.catalog-entry__date {
  white-space: nowrap;
  font-family: var(--font-sans);
  font-size: 0.76rem;
  color: rgb(var(--color-text-muted));
}

.catalog-entry__date--mobile {
  display: none;
}

.book-page__archive {
  justify-self: start;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  color: rgb(var(--color-text-muted));
}
```

- [ ] **步骤 4：实现题记和导航控件样式**

继续在 `src/styles/home.css` 中增加：

```css
.daily-quote {
  min-height: 6rem;
  display: grid;
  align-content: center;
  border-top: 1px solid rgba(var(--color-border), 0.72);
}

.daily-quote p {
  margin: 0;
}

.daily-quote__english {
  max-width: 58rem;
  font-size: 0.98rem;
  font-style: italic;
  line-height: 1.45;
}

.daily-quote__chinese {
  margin-top: 0.18rem !important;
  color: rgb(var(--color-text-secondary));
  font-size: 0.84rem;
  line-height: 1.45;
}

.daily-quote__copyright {
  margin-top: 0.65rem !important;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  color: rgb(var(--color-text-muted));
}

.theme-toggle,
.mobile-menu summary {
  width: 2rem;
  height: 2rem;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.theme-toggle svg,
.mobile-menu svg {
  width: 1rem;
  height: 1rem;
}

html[data-theme="light"] .theme-toggle__light,
html[data-theme="dark"] .theme-toggle__dark {
  display: none;
}
```

- [ ] **步骤 5：实现移动端完整纸页规则**

在 `src/styles/home.css` 末尾增加：

```css
@media (max-width: 720px) {
  .home-navigation {
    min-height: 3.5rem;
  }

  .home-navigation__inner,
  .home-shell {
    width: min(100% - 1.5rem, 72rem);
  }

  .home-navigation__inner {
    min-height: 3.5rem;
  }

  .home-navigation__desktop {
    display: none;
  }

  .home-navigation__mobile {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .mobile-menu {
    position: relative;
  }

  .mobile-menu__panel {
    position: absolute;
    top: calc(100% + 0.6rem);
    right: 0;
    min-width: 8rem;
    display: grid;
    gap: 0.25rem;
    padding: 0.6rem;
    background: rgb(var(--color-paper));
    border: 1px solid rgba(var(--color-border), 0.8);
    box-shadow: 0 0.8rem 2rem rgba(36, 28, 18, 0.12);
  }

  .mobile-menu__panel a {
    padding: 0.45rem 0.55rem;
  }

  .home-shell {
    min-height: auto;
    display: block;
  }

  .home-page {
    display: block;
  }

  .home-hero {
    min-height: 10rem;
  }

  .home-hero h1 {
    font-size: 2.125rem;
  }

  .home-book {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding-block: 1.5rem;
  }

  .book-page,
  .book-page:first-child,
  .book-page:last-child {
    min-height: 22rem;
    padding: 1.5rem 1.25rem 1.25rem;
    border: 1px solid rgba(var(--color-border), 0.72);
    box-shadow: 0 0.9rem 2rem rgba(36, 28, 18, 0.1);
  }

  .catalog-entry--mobile-hidden {
    display: none;
  }

  .catalog-entry__date--desktop {
    display: none;
  }

  .catalog-entry__date--mobile {
    display: inline;
  }

  .daily-quote {
    min-height: 0;
    padding-block: 1.5rem 2rem;
  }
}
```

- [ ] **步骤 6：运行构建、检查和首页测试**

运行：

```bash
npm run check
npm run test:homepage
```

预期：Astro 检查 0 errors；首页数据和 DOM 测试全部 PASS。

- [ ] **步骤 7：提交首页视觉实现**

```bash
git add src/styles/global.css src/styles/home.css
git commit -m "style: render homepage as an open book"
```

## 任务 5：增加浏览器布局回归测试

**文件：**
- 修改：`package.json`
- 修改：`package-lock.json`
- 创建：`playwright.config.mjs`
- 创建：`test/homepage-layout.spec.mjs`

- [ ] **步骤 1：安装 Playwright 测试依赖和 Chromium**

运行：

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

预期：依赖安装成功，Chromium 可用于测试。

- [ ] **步骤 2：配置 Astro 测试服务器**

创建 `playwright.config.mjs`：

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: "homepage-layout.spec.mjs",
  use: {
    baseURL: "http://127.0.0.1:4321",
    colorScheme: "light",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: true,
  },
});
```

- [ ] **步骤 3：编写桌面和移动布局测试**

创建 `test/homepage-layout.spec.mjs`：

```js
import { test, expect } from "@playwright/test";

test("desktop renders a side-by-side book without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const pages = page.locator(".book-page");
  await expect(pages).toHaveCount(2);

  const left = await pages.nth(0).boundingBox();
  const right = await pages.nth(1).boundingBox();
  expect(left.y).toBe(right.y);
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1);

  const dimensions = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight + 1);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

  await page.screenshot({ path: "test-results/homepage-desktop.png", fullPage: true });
});

test("mobile stacks complete pages and shows only the first three entries", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const pages = page.locator(".book-page");
  const life = await pages.nth(0).boundingBox();
  const technical = await pages.nth(1).boundingBox();
  expect(technical.y).toBeGreaterThan(life.y + life.height);

  for (const pageSection of [pages.nth(0), pages.nth(1)]) {
    const totalEntries = await pageSection.locator(".catalog-entry").count();
    await expect(pageSection.locator(".catalog-entry:visible")).toHaveCount(
      Math.min(3, totalEntries),
    );
    await expect(pageSection.locator(".book-page__archive")).toBeVisible();
  }

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.screenshot({ path: "test-results/homepage-mobile.png", fullPage: true });
});
```

- [ ] **步骤 4：增加导航与主题测试**

继续在 `test/homepage-layout.spec.mjs` 中增加：

```js
test("navigation remains sticky and theme choice persists", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const navigation = page.locator(".home-navigation");
  const initialTop = (await navigation.boundingBox()).y;
  await page.evaluate(() => window.scrollTo(0, 500));
  const scrolledTop = (await navigation.boundingBox()).y;
  expect(scrolledTop).toBe(initialTop);

  await page.locator(".theme-toggle:visible").click();
  const selectedTheme = await page.locator("html").getAttribute("data-theme");
  expect(selectedTheme).not.toBeNull();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", selectedTheme);

  await page.locator(".mobile-menu summary").click();
  await expect(page.locator(".mobile-menu__panel")).toBeVisible();
});
```

- [ ] **步骤 5：运行浏览器测试**

运行：

```bash
npm run test:e2e
```

预期：桌面、移动、导航和主题测试全部 PASS，并生成两张截图。

- [ ] **步骤 6：参数化检查补充视口**

继续在 `test/homepage-layout.spec.mjs` 中加入：

```js
for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 360, height: 800 },
]) {
  test(`homepage remains coherent at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

    for (const selector of [".home-navigation", ".home-hero", ".home-book", ".daily-quote"]) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });
}
```

验收：

- `1366x768` 无重叠，首页完整或仅有不超过约 32px 的轻微纵向滚动。
- `1280x720` 允许自然滚动，但导航、头部、书页和页脚不压缩重叠。
- `360x800` 无横向滚动，长标题、日期和每日一句保持在容器内。

- [ ] **步骤 7：提交浏览器测试**

```bash
git add package.json package-lock.json playwright.config.mjs test/homepage-layout.spec.mjs
git commit -m "test: cover homepage responsive layout"
```

## 任务 6：最终回归与交付

**文件：**
- 验证：`src/pages/index.astro`
- 验证：`src/styles/home.css`
- 验证：`src/styles/global.css`
- 验证：`src/components/*.astro`
- 验证：`test/homepage-*`

- [ ] **步骤 1：运行完整静态检查**

```bash
npm run check
```

预期：0 errors。

- [ ] **步骤 2：运行完整测试**

```bash
npm test
```

预期：首页测试和既有 webhook 测试全部 PASS。

- [ ] **步骤 3：运行浏览器测试**

```bash
npm run test:e2e
```

预期：所有 Playwright 测试 PASS。

- [ ] **步骤 4：运行生产构建**

```bash
npm run build
```

预期：Astro 输出 `Complete!`，首页、归档页、文章页、About 和 RSS 均成功生成。

- [ ] **步骤 5：检查最终变更范围**

```bash
git status --short
git diff --check
git diff --stat HEAD~4..HEAD
```

预期：

- 没有空白错误。
- 没有修改内容文章、部署脚本或评论系统。
- 变更只涉及本计划列出的首页组件、样式、测试和依赖。

- [ ] **步骤 6：启动开发服务器供用户审阅**

```bash
npm run dev -- --host 127.0.0.1
```

预期：终端输出本地访问地址。保持服务器运行，并向用户提供 URL。

## 完成定义

静态首页只有在以下条件全部满足时才算完成：

1. 桌面端按导航、头部、双页目录、题记顺序呈现。
2. `1440x900` 中完整显示首页，无水平或垂直溢出。
3. 桌面每类最多六篇，移动每类最多三篇。
4. 手机端两张纸页均保留完整边界、页眉、目录和归档入口。
5. 每日一句只显示英文、中文和版权，不显示作者。
6. API 尚未接入时使用本地结构化内容，页面不出现加载跳动。
7. 导航吸顶、移动菜单可用、主题选择可持久化。
8. 所有自动化检查和构建均通过。
9. 新动效未进入本轮实现。
