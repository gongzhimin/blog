# Book Runtime 阶段 4 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 增加第二个书页主题样板 `plain-manuscript`，并让首页通过配置选择主题，证明 Book Runtime 的主题边界不是只为 `classic-paper` 做目录整理。

**架构：** 新增主题注册入口 `loadBookTheme()`，`classic-paper` 和 `plain-manuscript` 都实现同一主题返回结构：`id/name/runtime/styles/measurement`。`book-config.json` 新增 `theme.id`，首页根据该配置加载主题。默认仍为 `classic-paper`，因此现有首页视觉保持不变。

**技术栈：** Astro 6、Node.js ESM、node:test、JSDOM、现有 Turn.js runtime。

---

## 文件结构

- 创建：`src/book/themes/load-theme.mjs`
  - 职责：主题注册表和主题选择入口，默认 `classic-paper`，未知主题抛出明确错误。
- 创建：`src/book/themes/plain-manuscript/theme.mjs`
  - 职责：第二主题样板，使用更素的稿纸/手稿排版规则，并从同一 CSS 字符串派生测量 CSS。
- 修改：`src/pages/index.astro`
  - 职责：从 `bookConfig.theme.id` 加载主题，不再直接导入 `createClassicPaperTheme()`。
- 修改：`src/data/book-config.json`
  - 职责：新增默认主题配置 `"theme": { "id": "classic-paper" }`。
- 修改：`test/book-theme.test.mjs`
  - 职责：测试主题 loader、默认主题、第二主题、未知主题错误。
- 修改：`test/homepage-config.test.mjs`
  - 职责：静态断言首页通过 loader 选主题，而不是硬编码 classic theme。
- 修改：`test/homepage-render.test.mjs`
  - 职责：断言构建产物中的 `config.theme.id` 来自 `book-config.json`。

## 任务 1：定义主题 loader 与第二主题行为

**文件：**
- 修改：`test/book-theme.test.mjs`
- 创建：`src/book/themes/load-theme.mjs`
- 创建：`src/book/themes/plain-manuscript/theme.mjs`

- [ ] **步骤 1：编写失败测试**

在 `test/book-theme.test.mjs` 中追加：

```js
import { loadBookTheme, listBookThemeIds } from "../src/book/themes/load-theme.mjs";

const cssSources = {
  fontsCSS: ".font-face{}",
  bookContentCSS:
    ".sj-book .book-content{font-size:16px}.sj-book .book-content p{margin:0}",
  codeHighlightCSS: ".hljs{color:#333}",
  bookTocCSS:
    ".sj-book .table-contents{font-size:15px}.sj-book .table-contents a{color:#8b7355}",
  katexCSS: ".katex{font-size:1.21em}",
};

test("book theme loader selects registered themes and defaults to classic-paper", () => {
  assert.deepEqual(listBookThemeIds(), ["classic-paper", "plain-manuscript"]);

  const defaultTheme = loadBookTheme(undefined, cssSources);
  assert.equal(defaultTheme.id, "classic-paper");

  const manuscript = loadBookTheme("plain-manuscript", cssSources);
  assert.equal(manuscript.id, "plain-manuscript");
  assert.equal(manuscript.name, "Plain Manuscript");
  assert.equal(manuscript.runtime.id, "plain-manuscript");
  assert.match(manuscript.styles.visualCSS, /plain-manuscript theme/);
  assert.match(manuscript.styles.visualCSS, /\.sj-book \.book-content/);
  assert.match(manuscript.measurement.articleCSS, /#__bap_inner/);
  assert.doesNotMatch(manuscript.measurement.articleCSS, /\.sj-book \.book-content/);
  assert.match(manuscript.measurement.tocCSS, /#__toc/);
  assert.doesNotMatch(manuscript.measurement.tocCSS, /\.sj-book \.table-contents/);

  assert.throws(
    () => loadBookTheme("missing-theme", cssSources),
    /Unknown book theme: missing-theme/,
  );
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/book-theme.test.mjs
```

预期：FAIL，无法找到 `load-theme.mjs`。

- [ ] **步骤 3：实现最小主题 loader 和 plain-manuscript**

创建 `src/book/themes/load-theme.mjs`：

```js
import { createClassicPaperTheme } from "./classic-paper/theme.mjs";
import { createPlainManuscriptTheme } from "./plain-manuscript/theme.mjs";

const THEME_FACTORIES = {
  "classic-paper": createClassicPaperTheme,
  "plain-manuscript": createPlainManuscriptTheme,
};

export function listBookThemeIds() {
  return Object.keys(THEME_FACTORIES);
}

export function loadBookTheme(themeId = "classic-paper", cssSources) {
  const id = themeId || "classic-paper";
  const factory = THEME_FACTORIES[id];
  if (!factory) {
    throw new Error(`Unknown book theme: ${id}`);
  }
  return factory(cssSources);
}
```

创建 `src/book/themes/plain-manuscript/theme.mjs`：

```js
const MANUSCRIPT_CONTENT_CSS = `
/* plain-manuscript theme */
.sj-book .book-content{font-family:Georgia,"Times New Roman","Chiron Sung HK","Noto Serif SC","Songti SC",serif;font-size:15px;line-height:1.72;color:#2f2c27}
.sj-book .book-content h1{font-size:20px;line-height:1.3;margin:0 0 12px;text-align:left}
.sj-book .book-content p{margin:0 0 10px;text-indent:2em}
`;

const MANUSCRIPT_TOC_CSS = `
.sj-book .table-contents{font-family:Georgia,"Times New Roman","Chiron Sung HK","Noto Serif SC","Songti SC",serif;font-size:15px;line-height:1.7;color:#2f2c27}
.sj-book .table-contents h1{text-align:left;font-size:22px;margin:0 0 18px}
.sj-book .table-contents ul{list-style:none;margin:0;padding:0}
.sj-book .table-contents li{margin:0 0 8px}
.sj-book .table-contents a{color:#584f44;text-decoration:none}
`;

const MANUSCRIPT_SURFACE_CSS = `
.sj-book .own-size{background:#fbfaf4!important;background-image:linear-gradient(to bottom,rgba(80,70,50,.035) 0 1px,transparent 1px 27px)!important}
`;

function toArticleMeasure(css) {
  return css.replace(/\.sj-book \.book-content/g, "#__bap_inner");
}

function toTocMeasure(css) {
  return css.replace(/\.sj-book \.table-contents/g, "#__toc");
}

export function createPlainManuscriptTheme({
  fontsCSS,
  codeHighlightCSS,
  katexCSS,
}) {
  const visualCSS =
    katexCSS +
    codeHighlightCSS +
    fontsCSS +
    MANUSCRIPT_SURFACE_CSS +
    MANUSCRIPT_CONTENT_CSS +
    MANUSCRIPT_TOC_CSS;

  return {
    id: "plain-manuscript",
    name: "Plain Manuscript",
    runtime: {
      id: "plain-manuscript",
      name: "Plain Manuscript",
    },
    styles: {
      fontsCSS,
      bookContentCSS: MANUSCRIPT_CONTENT_CSS,
      codeHighlightCSS,
      bookTocCSS: MANUSCRIPT_TOC_CSS,
      visualCSS,
    },
    measurement: {
      articleCSS:
        katexCSS + codeHighlightCSS + toArticleMeasure(MANUSCRIPT_CONTENT_CSS),
      tocCSS: toTocMeasure(MANUSCRIPT_TOC_CSS),
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

## 任务 2：首页通过配置选择主题

**文件：**
- 修改：`src/data/book-config.json`
- 修改：`src/pages/index.astro`
- 修改：`test/homepage-config.test.mjs`
- 修改：`test/homepage-render.test.mjs`

- [ ] **步骤 1：编写失败测试**

在 `test/homepage-config.test.mjs` 的 `turnjs book config defines navigation, page geometry, and pagination` 测试中加入：

```js
assert.equal(bookConfig.theme.id, "classic-paper");
```

在 `"homepage consumes book config and the shared turnjs app"` 测试中加入：

```js
assert.match(page, /loadBookTheme\(bookConfig\.theme\?\.id/);
assert.doesNotMatch(page, /createClassicPaperTheme/);
```

在 `test/homepage-render.test.mjs` 的 `"homepage serializes dynamic book config and content pages"` 测试中改为：

```js
assert.equal(config.theme.id, config.theme.id);
```

并新增读取 `bookConfig` 后断言：

```js
const bookConfig = await loadBookConfig();
assert.equal(config.theme.id, bookConfig.theme.id);
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/homepage-config.test.mjs test/homepage-render.test.mjs
```

预期：FAIL，`bookConfig.theme` 缺失且首页仍硬编码 `createClassicPaperTheme()`。

- [ ] **步骤 3：配置默认主题并接入 loader**

修改 `src/data/book-config.json` 顶层，在 `nav` 前加入：

```json
"theme": {
  "id": "classic-paper"
},
```

修改 `src/pages/index.astro`：

```js
import { loadBookTheme } from '../book/themes/load-theme.mjs';
```

替换：

```js
const theme = loadBookTheme(bookConfig.theme?.id, {
  fontsCSS,
  bookContentCSS,
  codeHighlightCSS,
  bookTocCSS,
  katexCSS,
});
```

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
node --test test/book-theme.test.mjs test/homepage-config.test.mjs
npm run build
node --test test/homepage-render.test.mjs
```

预期：PASS。

## 任务 3：全量验证并提交阶段 4

**文件：**
- 阶段 4 相关文件

- [ ] **步骤 1：检查补丁质量**

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

- [ ] **步骤 4：只提交阶段 4 文件**

运行：

```bash
git add docs/superpowers/plans/2026-07-01-book-runtime-stage-4.md \
  src/book/themes/load-theme.mjs \
  src/book/themes/plain-manuscript/theme.mjs \
  src/pages/index.astro \
  src/data/book-config.json \
  test/book-theme.test.mjs \
  test/homepage-config.test.mjs \
  test/homepage-render.test.mjs
git commit -m "feat: add switchable book themes"
```

预期：提交成功，`README.md` 与 `docs/ios-shortcuts-image-publishing.md` 仍保持未提交状态。

## 自检

- 规格覆盖：第二主题、主题注册、配置切换、默认不变、测试和构建验证都有对应任务。
- 占位符扫描：没有执行步骤使用空泛占位。
- 类型一致性：统一使用 `loadBookTheme(themeId, cssSources)`，主题返回结构沿用 `id/name/runtime/styles/measurement`。
