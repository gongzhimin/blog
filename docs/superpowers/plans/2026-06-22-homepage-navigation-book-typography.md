# 首页导航、书页层级与独立文字样式实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 删除首页头部区，将标题移入响应式导航，恢复首页和目录页罗马数字页码，并让首页每种文字角色拥有独立配置。

**架构：** `homepage-config.json` 继续作为唯一首页配置入口，`homepage-config.mjs` 校验并生成 CSS 变量。首页组件只消费内容配置，`home.css` 只消费角色级 CSS 变量；两个目录页仅注入同一配置生成的页码变量。

**技术栈：** Astro 6、CSS 自定义属性、Node.js test runner、JSDOM、Playwright。

---

## 文件职责

- 修改 `src/data/homepage-config.json`：保存新文案、页码和独立文字角色样式。
- 修改 `src/data/homepage-config.schema.json`：为新配置提供中文说明和约束。
- 修改 `src/data/HOMEPAGE_CONFIG.md`：说明角色级文字参数的编辑方法。
- 修改 `src/lib/homepage-config.mjs`：校验新结构并输出文字角色变量。
- 修改 `src/components/SiteNavigation.astro`：渲染品牌、居中标题、完整导航入口。
- 修改 `src/components/BookCatalogPage.astro`：渲染镜像页眉、可点击 Part、入口和页码。
- 修改 `src/components/DailyQuote.astro`：接收独立版权文案。
- 修改 `src/pages/index.astro`：删除头部区并传递新配置。
- 修改 `src/pages/life/index.astro`：显示独立罗马数字页码。
- 修改 `src/pages/blog/index.astro`：显示独立罗马数字页码。
- 修改 `src/styles/home.css`：实现三段式导航、角色样式和书页页码。
- 修改 `src/styles/global.css`：实现目录页页码样式。
- 修改 `test/homepage-config.test.mjs`：覆盖配置校验与变量输出。
- 修改 `test/homepage-render.test.mjs`：覆盖首页结构和文案。
- 修改 `test/homepage-layout.spec.mjs`：覆盖响应式导航和页码布局。
- 创建 `test/archive-render.test.mjs`：覆盖两个目录页的独立页码。

### 任务 1：重构配置契约

- [ ] **步骤 1：编写失败的配置测试**

在 `test/homepage-config.test.mjs` 中断言：

```js
assert.equal(config.content.navigationTitle, "写技术，也记录技术之外的生活。");
assert.equal(config.content.copyrightLabel, "Zhimin 的博客书");
assert.equal(config.textStyles.navigationBrand.fontFamily, "sans");
assert.equal(config.textStyles.navigationTitle.desktopSize, "0.4rem");
assert.match(css, /--home-text-navigation-brand-font-family:var\(--font-sans\)/);
assert.match(css, /--home-text-copyright-dark-color:/);
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
node --test test/homepage-config.test.mjs
```

预期：FAIL，缺少 `navigationTitle`、`copyrightLabel`、`textStyles` 或对应 CSS 变量。

- [ ] **步骤 3：实现配置、Schema 和校验器**

删除 `heroTitle`、`desktop.regions.heroHeight`、`mobile.layout.heroMinHeight` 及旧的 `desktop.typography`、`mobile.typography`。添加规格中定义的内容字段与 14 个 `textStyles` 角色。

在 `homepage-config.mjs` 中：

```js
const FONT_FAMILIES = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  monospace: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
};
```

逐角色验证 `fontFamily`、`desktopSize`、`mobileSize`、`lightColor`、`darkColor`，生成独立 CSS 变量。

- [ ] **步骤 4：运行配置测试验证通过**

运行：

```bash
node --test test/homepage-config.test.mjs
```

预期：全部 PASS。

- [ ] **步骤 5：提交配置契约**

```bash
git add src/data/homepage-config.json src/data/homepage-config.schema.json src/data/HOMEPAGE_CONFIG.md src/lib/homepage-config.mjs test/homepage-config.test.mjs
git commit -m "refactor: define independent homepage text styles"
```

### 任务 2：首页结构与内容

- [ ] **步骤 1：编写失败的首页渲染测试**

在 `test/homepage-render.test.mjs` 中断言：

```js
assert.equal(document.querySelector(".home-hero"), null);
assert.equal(document.querySelector(".home-navigation__title").textContent.trim(), config.content.navigationTitle);
assert.deepEqual(
  [...document.querySelectorAll(".book-page__folio")].map(node => node.textContent.trim()),
  ["i", "ii"],
);
assert.equal(document.querySelector('[data-section="life"] .book-page__part').getAttribute("href"), "/life");
assert.equal(document.querySelector(".daily-quote__copyright").textContent.trim(), `© ${currentYear} · ${config.content.copyrightLabel}`);
```

- [ ] **步骤 2：运行首页测试验证失败**

运行：

```bash
npm run build
node --test test/homepage-render.test.mjs
```

预期：FAIL，旧头部区仍存在且页码、可点击 Part 和新版权不存在。

- [ ] **步骤 3：最小实现组件结构**

`SiteNavigation.astro` 接收 `siteName`、`title`、四个导航标签；删除移动汉堡菜单。

`BookCatalogPage.astro` 接收：

```ts
side: "left" | "right";
outerRunningLabel: string;
innerRunningLabel: string;
partHref: string;
folio: string;
```

按左右页镜像页眉，Part 使用 `<a>`，底部同时渲染 archive 与 folio。

`DailyQuote.astro` 接收 `copyrightLabel`，输出：

```astro
<p class="daily-quote__copyright">© {year} · {copyrightLabel}</p>
```

`index.astro` 删除 `.home-hero` 并传递新字段。

- [ ] **步骤 4：运行首页测试验证通过**

运行：

```bash
npm run build
node --test test/homepage-render.test.mjs
```

预期：全部 PASS。

- [ ] **步骤 5：提交结构变更**

```bash
git add src/components/SiteNavigation.astro src/components/BookCatalogPage.astro src/components/DailyQuote.astro src/pages/index.astro test/homepage-render.test.mjs
git commit -m "feat: refine homepage navigation and book hierarchy"
```

### 任务 3：布局和独立文字样式

- [ ] **步骤 1：编写失败的浏览器断言**

更新 `test/homepage-layout.spec.mjs`：

```js
await expect(page.locator(".home-hero")).toHaveCount(0);
await expect(page.locator(".home-navigation__title")).toBeVisible();
await expect(page.locator(".home-navigation__desktop a")).toHaveCount(4);
await expect(page.locator(".book-page__folio")).toHaveCount(2);
```

在 `390x844` 下断言标题隐藏、四个导航文字入口和主题按钮可见、页面无横向溢出。

- [ ] **步骤 2：运行浏览器测试验证失败**

运行：

```bash
npm run test:e2e
```

预期：FAIL，旧移动菜单和旧网格仍存在。

- [ ] **步骤 3：实现 CSS**

`home.css`：

- `.home-shell` 使用 `78svh 16svh`。
- `.home-page` 只包含书本区。
- 导航使用三列对称网格。
- 中间标题单行省略，在窄屏断点隐藏。
- 移动端完整显示四个文字导航入口与主题按钮。
- 14 个文字角色分别消费自己的字体、字号和颜色变量。
- 暗色模式将每个角色的活动颜色切换到其 `darkColor`。
- archive 与 folio 分别使用 `archiveBottom`、`folioBottom`。

- [ ] **步骤 4：运行浏览器测试验证通过**

运行：

```bash
npm run test:e2e
```

预期：6 项以上全部 PASS，桌面和移动端无横向溢出。

- [ ] **步骤 5：提交布局变更**

```bash
git add src/styles/home.css test/homepage-layout.spec.mjs
git commit -m "style: apply responsive book navigation typography"
```

### 任务 4：目录页独立页码

- [ ] **步骤 1：创建失败的目录渲染测试**

创建 `test/archive-render.test.mjs`，读取构建后的两个目录页并断言：

```js
assert.equal(life.querySelector(".archive-page__folio").textContent.trim(), "i");
assert.equal(technical.querySelector(".archive-page__folio").textContent.trim(), "i");
```

- [ ] **步骤 2：运行目录测试验证失败**

运行：

```bash
npm run build
node --test test/archive-render.test.mjs
```

预期：FAIL，目录页尚无 `.archive-page__folio`。

- [ ] **步骤 3：实现目录页码**

两个目录页读取 `homepage-config.json`，校验并注入 CSS 变量，各自渲染配置中的 `directoryFolio`。`global.css` 使用独立 folio 字体、字号和颜色变量。

- [ ] **步骤 4：运行目录测试验证通过**

运行：

```bash
npm run build
node --test test/archive-render.test.mjs
```

预期：全部 PASS。

- [ ] **步骤 5：提交目录页码**

```bash
git add src/pages/life/index.astro src/pages/blog/index.astro src/styles/global.css test/archive-render.test.mjs
git commit -m "feat: add independent archive folios"
```

### 任务 5：全量验证和部署

- [ ] **步骤 1：执行全量验证**

```bash
npm run check
npm test
npm run test:e2e
git diff --check
```

预期：Astro 0 errors；单元测试和浏览器测试全部通过；diff 无空白错误。

- [ ] **步骤 2：检查截图**

检查：

```text
test-results/homepage-desktop.png
test-results/homepage-mobile.png
test-results/homepage-dark.png
```

确认桌面标题居中、窄屏标题隐藏、所有导航入口可见、页码不与入口重叠。

- [ ] **步骤 3：经服务器仓库同步 GitHub**

先检查 GitHub 与服务器远端状态，不修改服务器现有脏工作树。将本地提交制作为 Git bundle 上传服务器，服务器临时分支 fetch bundle 后推送 `origin/main`。

- [ ] **步骤 4：等待部署并验证线上**

确认 GitHub Actions 对最终提交返回 `success`，然后验证：

```bash
curl -L --max-time 20 -sS https://zhimin.ink/
```

线上 HTML 应包含新标题、英文入口、`© 当前年份 · Zhimin 的博客书` 和首页罗马数字页码。

