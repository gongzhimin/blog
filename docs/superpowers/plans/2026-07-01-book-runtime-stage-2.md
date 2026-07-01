# Book Runtime 阶段 2 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 抽出 `classic-paper` 主题入口，让首页不再手写文章与目录的测量 CSS 拼接逻辑，同时保持现有视觉、分页和 Turn.js 行为不变。

**架构：** 新增 `src/book/themes/classic-paper/theme.mjs` 作为主题 loader。它接收现有 CSS 原文和 KaTeX CSS，输出主题元数据、视觉 CSS、测量 CSS 和运行时可序列化的主题信息。`src/pages/index.astro` 继续引用现有样式文件，但通过主题 loader 统一生成 `homepageStyles` 与 `MEASURE_CSS`。

**技术栈：** Astro 6、Node.js ESM、node:test、JSDOM、现有 Turn.js runtime。

---

## 文件结构

- 创建：`src/book/themes/classic-paper/theme.mjs`
  - 职责：收拢现有 `fonts.css`、`book-content.css`、`code-highlight.css`、`book-toc.css` 与 KaTeX CSS，生成视觉 CSS 和测量 CSS。
- 创建：`test/book-theme.test.mjs`
  - 职责：用纯字符串测试 theme loader，保证测量 CSS 与视觉 CSS 同源且 selector 替换正确。
- 修改：`src/pages/index.astro`
  - 职责：移除手写 `measureArticleCSS`、`measureTocCSS` 拼接逻辑，改用 `createClassicPaperTheme()`。
- 修改：`test/homepage-config.test.mjs`
  - 职责：静态断言首页接入 theme loader，避免后续把测量 CSS 拼接重新散落回页面层。
- 修改：`test/homepage-render.test.mjs`
  - 职责：断言构建产物中的 runtime config 暴露 `theme.id`，为后续主题切换留入口。

## 任务 1：定义 classic-paper theme loader 行为

**文件：**
- 创建：`test/book-theme.test.mjs`
- 创建：`src/book/themes/classic-paper/theme.mjs`

- [ ] **步骤 1：编写失败测试**

创建 `test/book-theme.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createClassicPaperTheme } from "../src/book/themes/classic-paper/theme.mjs";

test("classic-paper theme derives measurement css from visual css sources", () => {
  const theme = createClassicPaperTheme({
    fontsCSS: ".font-face{}",
    bookContentCSS: ".sj-book .book-content{font-size:16px}.sj-book .book-content p{margin:0}",
    codeHighlightCSS: ".hljs{color:#333}",
    bookTocCSS: ".sj-book .table-contents{font-size:15px}.sj-book .table-contents a{color:#8b7355}",
    katexCSS: ".katex{font-size:1.21em}",
  });

  assert.equal(theme.id, "classic-paper");
  assert.equal(theme.name, "Classic Paper");
  assert.equal(theme.runtime.id, "classic-paper");
  assert.equal(theme.runtime.name, "Classic Paper");
  assert.match(theme.styles.visualCSS, /\.font-face\{\}/);
  assert.match(theme.styles.visualCSS, /\.sj-book \.book-content/);
  assert.match(theme.styles.visualCSS, /\.sj-book \.table-contents/);
  assert.match(theme.measurement.articleCSS, /\.katex\{font-size:1\.21em\}/);
  assert.match(theme.measurement.articleCSS, /\.hljs\{color:#333\}/);
  assert.match(theme.measurement.articleCSS, /#__bap_inner\{font-size:16px\}/);
  assert.doesNotMatch(theme.measurement.articleCSS, /\.sj-book \.book-content/);
  assert.match(theme.measurement.tocCSS, /#__toc\{/);
  assert.match(theme.measurement.tocCSS, /#__toc a\{color:#8b7355\}/);
  assert.doesNotMatch(theme.measurement.tocCSS, /\.sj-book \.table-contents/);
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/book-theme.test.mjs
```

预期：FAIL，报错无法找到 `../src/book/themes/classic-paper/theme.mjs`。

- [ ] **步骤 3：实现最小 theme loader**

创建 `src/book/themes/classic-paper/theme.mjs`：

```js
const TOC_MEASURE_BASE_CSS =
  `#__toc{font-family:'Stempel-Garamond-W01-Roman',Georgia,"Times New Roman","Chiron Sung HK","Noto Serif SC","Songti SC","STSong","SimSun",serif;font-size:16px;line-height:1.7;overflow:hidden;overflow-wrap:break-word;word-break:break-word;width:300px;margin:80px auto}` +
  `#__toc h1{font-size:28px;font-weight:700;margin:0 0 20px;text-align:center}` +
  `#__toc ul{list-style:none;padding:0;margin:0}` +
  `#__toc li{margin-bottom:8px;font-size:15px}` +
  `#__toc a{color:#8b7355;text-decoration:none}`;

export function createClassicPaperTheme({
  fontsCSS,
  bookContentCSS,
  codeHighlightCSS,
  bookTocCSS,
  katexCSS,
}) {
  const articleContentCSS = bookContentCSS.replace(
    /\.sj-book \.book-content/g,
    "#__bap_inner",
  );
  const tocContentCSS = bookTocCSS.replace(
    /\.sj-book \.table-contents/g,
    "#__toc",
  );

  return {
    id: "classic-paper",
    name: "Classic Paper",
    runtime: {
      id: "classic-paper",
      name: "Classic Paper",
    },
    styles: {
      fontsCSS,
      bookContentCSS,
      codeHighlightCSS,
      bookTocCSS,
      visualCSS: katexCSS + codeHighlightCSS + fontsCSS + bookContentCSS + bookTocCSS,
    },
    measurement: {
      articleCSS: katexCSS + codeHighlightCSS + articleContentCSS,
      tocCSS: TOC_MEASURE_BASE_CSS + tocContentCSS,
    },
  };
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/book-theme.test.mjs
```

预期：PASS。

## 任务 2：首页接入 theme loader

**文件：**
- 修改：`src/pages/index.astro`
- 修改：`test/homepage-config.test.mjs`
- 修改：`test/homepage-render.test.mjs`

- [ ] **步骤 1：编写失败测试**

在 `test/homepage-config.test.mjs` 的 `"homepage consumes book config and the shared turnjs app"` 测试中增加：

```js
assert.match(page, /createClassicPaperTheme/);
assert.doesNotMatch(page, /bookContentCSS\.replace/);
assert.doesNotMatch(page, /bookTocCSS\.replace/);
```

在 `test/homepage-render.test.mjs` 的 `"homepage serializes dynamic book config and content pages"` 测试中增加：

```js
assert.equal(config.theme.id, "classic-paper");
assert.equal(config.theme.name, "Classic Paper");
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/homepage-config.test.mjs test/homepage-render.test.mjs
```

预期：FAIL，首页仍然手写 `.replace()`，且构建产物中的 config 尚无 `theme`。

- [ ] **步骤 3：修改首页接入主题**

在 `src/pages/index.astro` 中：

```js
import { createClassicPaperTheme } from '../book/themes/classic-paper/theme.mjs';
```

替换手写测量 CSS：

```js
const theme = createClassicPaperTheme({
  fontsCSS,
  bookContentCSS,
  codeHighlightCSS,
  bookTocCSS,
  katexCSS,
});
const measureArticleCSS = theme.measurement.articleCSS;
const measureTocCSS = theme.measurement.tocCSS;
```

将 `runConfig` 扩展为：

```js
const runConfig = runtime.config;
runConfig.theme = theme.runtime;
```

将 `homepageStyles` 末尾的 CSS 拼接替换为：

```js
` + theme.styles.visualCSS;
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/book-theme.test.mjs test/homepage-config.test.mjs
```

预期：PASS。

然后运行构建和渲染测试：

```bash
npm run build
node --test test/homepage-render.test.mjs
```

预期：PASS。

## 任务 3：全量验证并提交阶段 2

**文件：**
- 阶段 2 相关文件

- [ ] **步骤 1：检查空白与冲突标记**

运行：

```bash
git diff --check
```

预期：无输出，退出码为 0。

- [ ] **步骤 2：运行全部 Node 测试**

运行：

```bash
node --test test/*.test.*
```

预期：全部通过。

- [ ] **步骤 3：运行 Astro 构建**

运行：

```bash
npm run build
```

预期：构建成功。

- [ ] **步骤 4：只提交阶段 2 文件**

运行：

```bash
git add docs/superpowers/plans/2026-07-01-book-runtime-stage-2.md \
  src/book/themes/classic-paper/theme.mjs \
  src/pages/index.astro \
  test/book-theme.test.mjs \
  test/homepage-config.test.mjs \
  test/homepage-render.test.mjs
git commit -m "refactor: extract classic paper book theme"
```

预期：提交成功，`README.md` 与 `docs/ios-shortcuts-image-publishing.md` 仍保持未提交状态。

## 自检

- 规格覆盖：阶段 2 的主题 loader、视觉 CSS、测量 CSS、首页接入、runtime theme 信息都有任务覆盖。
- 占位符扫描：没有 `TODO` 或“后续实现”作为执行步骤。
- 类型一致性：统一使用 `createClassicPaperTheme()`、`theme.styles.visualCSS`、`theme.measurement.articleCSS`、`theme.measurement.tocCSS`、`theme.runtime`。
