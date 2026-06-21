# 首页配置与结构分离实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将首页文案、桌面/移动端布局参数、字体、间距和材质颜色集中到一个带中文说明与构建校验的 JSON 配置文件。

**架构：** `homepage-config.json` 是唯一用户编辑入口，JSON Schema 提供中文悬停说明和自动补全，纯 JavaScript 模块负责校验并生成 CSS 自定义属性。Astro 组件只消费配置，`home.css` 只保留结构算法和 `var(--home-*)` 引用。

**技术栈：** Astro 6、JSON Schema、CSS 自定义属性、Node Test Runner、JSDOM、Playwright。

---

## 文件结构

- 创建：`src/data/homepage-config.json`
  - 首页唯一可调配置。
- 创建：`src/data/homepage-config.schema.json`
  - 中文字段说明、单位约束、建议范围和编辑器补全。
- 创建：`src/data/HOMEPAGE_CONFIG.md`
  - 面向用户的简短修改指南。
- 创建：`src/lib/homepage-config.mjs`
  - 校验配置并生成 CSS 变量。
- 创建：`test/homepage-config.test.mjs`
  - 验证合法配置、错误提示和变量输出。
- 修改：`src/pages/index.astro`
  - 读取配置、校验并注入变量和文案。
- 修改：`src/components/BookCatalogPage.astro`
  - 接收配置中的站点名、页眉、分部和归档文案。
- 修改：`src/styles/home.css`
  - 将可调硬编码替换为 CSS 变量。
- 修改：`test/homepage-render.test.mjs`
  - 验证文案和变量来自配置。
- 修改：`test/homepage-layout.spec.mjs`
  - 保持现有视觉和响应式验证。

## 任务 1：建立配置、Schema 与校验模块

**文件：**
- 创建：`src/data/homepage-config.json`
- 创建：`src/data/homepage-config.schema.json`
- 创建：`src/data/HOMEPAGE_CONFIG.md`
- 创建：`src/lib/homepage-config.mjs`
- 创建：`test/homepage-config.test.mjs`

- [ ] **步骤 1：编写失败的配置测试**

测试导出接口：

```js
import {
  buildHomepageCssVariables,
  validateHomepageConfig,
} from "../src/lib/homepage-config.mjs";
```

断言当前 JSON 校验通过；删除 `desktop.book.width`、将宽度改为 `"68"`、颜色改为 `"white-ish"`、纹理强度改为 `1.2` 时分别抛出包含完整字段路径的错误。

变量输出必须包含：

```text
--home-desktop-book-width:68%;
--home-desktop-book-ratio:1.8 / 1;
--home-material-paper-color:#ffffff;
--home-mobile-catalog-font-size:1rem;
```

- [ ] **步骤 2：运行测试确认模块不存在**

运行：`node --test test/homepage-config.test.mjs`

预期：FAIL，错误包含 `Cannot find module '../src/lib/homepage-config.mjs'`。

- [ ] **步骤 3：创建当前配置**

配置分为：

```json
{
  "$schema": "./homepage-config.schema.json",
  "content": {},
  "desktop": {
    "regions": {},
    "book": {},
    "typography": {}
  },
  "mobile": {
    "layout": {},
    "typography": {}
  },
  "materials": {}
}
```

初始值逐项复制当前线上参数，确保重构不改变视觉。

- [ ] **步骤 4：实现校验和 CSS 变量输出**

导出：

```js
export function validateHomepageConfig(config) {}
export function buildHomepageCssVariables(config) {}
```

校验允许的 CSS 长度单位为 `rem`、`px`、`%`、`svh`、`vw`、`em`；宽高比格式为 `<number> / <number>`；颜色允许十六进制和 `rgb/rgba`；纹理强度限制在 `0..1`。

- [ ] **步骤 5：创建 Schema 和修改指南**

Schema 的每个字段必须提供中文 `description`，并与校验模块字段完全一致。指南说明：

1. 只编辑 `homepage-config.json`。
2. 修改后运行 `npm run check` 和 `npm run test:homepage`。
3. 单位如何选择。
4. 如何恢复当前默认参数。

- [ ] **步骤 6：运行配置测试并提交**

运行：`node --test test/homepage-config.test.mjs`

提交：

```bash
git add src/data/homepage-config.json src/data/homepage-config.schema.json src/data/HOMEPAGE_CONFIG.md src/lib/homepage-config.mjs test/homepage-config.test.mjs
git commit -m "feat: add validated homepage configuration"
```

## 任务 2：迁移首页内容和 CSS 变量桥接

**文件：**
- 修改：`test/homepage-render.test.mjs`
- 修改：`src/pages/index.astro`
- 修改：`src/components/BookCatalogPage.astro`

- [ ] **步骤 1：编写失败的构建后测试**

读取配置 JSON，断言：

```js
assert.equal(document.querySelector(".home-hero h1").textContent.trim(), config.content.heroTitle);
assert.equal(document.querySelector(".book-page__running-head strong").textContent.trim(), config.content.siteName);
assert.ok(document.body.getAttribute("style").includes("--home-desktop-book-width:68%"));
```

- [ ] **步骤 2：构建并确认测试失败**

运行：`npm run build && node --test test/homepage-render.test.mjs`

预期：FAIL，首页还没有配置变量。

- [ ] **步骤 3：接入配置**

`index.astro`：

```js
import homepageConfig from "../data/homepage-config.json";
import {
  buildHomepageCssVariables,
  validateHomepageConfig,
} from "../lib/homepage-config.mjs";

validateHomepageConfig(homepageConfig);
const homepageStyle = buildHomepageCssVariables(homepageConfig);
```

将 `style={homepageStyle}` 设置到 `.home-body`，并从 `content` 读取头部和两页文案。

`BookCatalogPage.astro` 增加 `siteName` 属性，替换硬编码 `ZHIMIN`。

- [ ] **步骤 4：运行渲染测试并提交**

运行：`npm run build && node --test test/homepage-render.test.mjs`

提交：

```bash
git add src/pages/index.astro src/components/BookCatalogPage.astro test/homepage-render.test.mjs
git commit -m "refactor: drive homepage content from config"
```

## 任务 3：将可调 CSS 硬编码迁移为变量

**文件：**
- 修改：`src/styles/home.css`
- 修改：`test/homepage-config.test.mjs`

- [ ] **步骤 1：增加 CSS 消费测试**

读取 `home.css`，断言关键规则引用变量：

```js
assert.match(css, /height: var\(--home-desktop-navigation-height\)/);
assert.match(css, /width: var\(--home-desktop-book-width\)/);
assert.match(css, /font-size: var\(--home-desktop-catalog-font-size\)/);
assert.match(css, /font-size: var\(--home-mobile-catalog-font-size\)/);
```

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test test/homepage-config.test.mjs`

预期：FAIL，CSS 仍包含硬编码。

- [ ] **步骤 3：替换桌面变量**

迁移：

- 四区高度、站点宽度。
- 书本宽度、比例、页面内边距、标签间距、目录行距、归档位置。
- 桌面导航、头部、书内和页脚字号。
- 纸张、封面、装订布、纹理、中缝和阴影颜色。

- [ ] **步骤 4：替换移动端变量**

迁移：

- 导航高度、站点边距、头部最小高度。
- 纸页间距、最小高度和内边距。
- 移动端页眉、标签、目录、日期、归档和页脚字号。

- [ ] **步骤 5：运行配置与浏览器测试**

运行：

```bash
node --test test/homepage-config.test.mjs
npm run test:e2e
```

- [ ] **步骤 6：提交样式迁移**

```bash
git add src/styles/home.css test/homepage-config.test.mjs
git commit -m "refactor: consume homepage design tokens"
```

## 任务 4：完整验证与部署

- [ ] **步骤 1：运行完整验证**

```bash
npm run check
npm test
npm run test:e2e
git diff --check
```

- [ ] **步骤 2：检查截图和工作区**

检查桌面、移动端截图与 `git status --short`，确认重构没有改变现有视觉。

- [ ] **步骤 3：同步远程最新提交**

若 GitHub `main` 在实施期间前进，先获取并 rebase，重新运行完整验证，禁止覆盖 iOS 发布的文章提交。

- [ ] **步骤 4：推送并等待部署**

推送 `main`，等待 `Deploy Blog` 成功。

- [ ] **步骤 5：线上核验**

确认线上首页包含配置生成的 CSS 变量和配置文案，GitHub、本地与线上版本一致。
