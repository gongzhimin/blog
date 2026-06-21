# 首页精装书目录版式实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 按已批准参数将首页改造成浅灰硬壳、灰色装订布、白色双页目录的精装摊开书，并保持桌面首屏完整与移动端可读。

**架构：** `index.astro` 只负责组合书本装饰层和两张目录页；`BookCatalogPage.astro` 负责页眉、分部标签、目录和底部居中归档链接；`DailyQuote.astro` 负责页脚双锚点元信息。桌面精装视觉集中在 `home.css`，移动端隐藏物理装饰层并恢复普通纵向纸页。

**技术栈：** Astro 6、CSS Grid、CSS 渐变与伪元素、Node Test Runner、JSDOM、Playwright。

---

## 文件结构

- 修改：`src/pages/index.astro`
  - 增加硬壳、装订布、左右书口和中缝装饰层；删除头部副标题。
- 修改：`src/components/BookCatalogPage.astro`
  - 删除章节标题，增加页眉与分部标签，保留目录并将归档链接置于底部中央。
- 修改：`src/components/DailyQuote.astro`
  - 将作者与版权放入同一元信息行。
- 修改：`src/styles/home.css`
  - 应用确认参数、精装书结构、1px 中缝、桌面首屏比例与移动端降级。
- 修改：`test/homepage-render.test.mjs`
  - 验证新 DOM 结构、删除的标题、分部标签、唯一归档链接及页脚元信息。
- 修改：`test/homepage-layout.spec.mjs`
  - 验证桌面首屏、书本物理层、归档链接居中、版权居中与移动端降级。

## 任务 1：锁定精装书语义结构

**文件：**
- 修改：`test/homepage-render.test.mjs`
- 修改：`src/pages/index.astro`
- 修改：`src/components/BookCatalogPage.astro`
- 修改：`src/components/DailyQuote.astro`

- [ ] **步骤 1：编写失败的构建后 DOM 测试**

新增断言：

```js
for (const selector of [
  ".home-book-frame",
  ".home-book-cover",
  ".home-book-binding",
  ".home-book-edge--left",
  ".home-book-edge--right",
  ".home-book-gutter",
]) {
  assert.ok(document.querySelector(selector));
}

assert.equal(document.querySelector(".home-hero p"), null);
assert.equal(document.querySelector(".book-page__title"), null);
assert.deepEqual(
  [...document.querySelectorAll(".book-page__part")].map((node) =>
    node.textContent.trim()
  ),
  ["Part I · Life", "Part II · Technology"],
);
assert.deepEqual(
  [...document.querySelectorAll(".book-page__archive")].map((node) =>
    node.textContent.trim()
  ),
  ["全部生活文章", "全部技术文章"],
);
assert.equal(document.querySelector(".book-page__folio"), null);
assert.ok(document.querySelector(".daily-quote__meta"));
```

- [ ] **步骤 2：构建并确认测试失败**

运行：

```bash
npm run build && node --test test/homepage-render.test.mjs
```

预期：FAIL，新装饰层和分部标签尚不存在。

- [ ] **步骤 3：实现最小 Astro 结构**

`BookCatalogPage.astro` 的属性改为：

```ts
type Props = {
  section: "life" | "technical";
  runningLabel: "CONTENTS" | "NOTES";
  partLabel: "Part I · Life" | "Part II · Technology";
  entries: Entry[];
  archiveHref: string;
  archiveLabel: string;
};
```

页面结构：

```astro
<section class="book-page" data-section={section}>
  <header class="book-page__running-head">
    <strong>ZHIMIN</strong>
    <span>{runningLabel}</span>
  </header>
  <p class="book-page__part">{partLabel}</p>
  <ol class="catalog-list">...</ol>
  <a class="book-page__archive" href={archiveHref}>{archiveLabel}</a>
</section>
```

`index.astro` 使用 `.home-book-frame` 包裹装饰层和 `.home-book`，并删除 `home-hero` 中的副标题。

`DailyQuote.astro` 改为：

```astro
<div class="daily-quote__meta">
  {author && <p class="daily-quote__author">— {author}</p>}
  <p class="daily-quote__copyright">© {year} ZHIMIN</p>
</div>
```

- [ ] **步骤 4：运行渲染测试**

运行：

```bash
npm run build && node --test test/homepage-render.test.mjs
```

预期：全部 PASS。

- [ ] **步骤 5：提交结构**

```bash
git add src/pages/index.astro src/components/BookCatalogPage.astro src/components/DailyQuote.astro test/homepage-render.test.mjs
git commit -m "feat: structure homepage as a hardcover book"
```

## 任务 2：实现桌面精装书参数

**文件：**
- 修改：`test/homepage-layout.spec.mjs`
- 修改：`src/styles/home.css`

- [ ] **步骤 1：增加失败的桌面布局测试**

在 `1440 × 900` 下断言：

```js
expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight + 1);
expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);

for (const selector of [
  ".home-navigation",
  ".home-hero",
  ".home-book-frame",
  ".daily-quote",
]) {
  await expect(page.locator(selector)).toBeVisible();
}
```

读取计算样式并断言：

```js
expect(frameStyle.width / page.viewportSize().width).toBeCloseTo(.68 * .9, 1);
expect(frameStyle.aspectRatio).toBe("1.8 / 1");
expect(gutterStyle.width).toBe("1px");
expect(archiveCenterDelta).toBeLessThanOrEqual(2);
expect(copyrightCenterDelta).toBeLessThanOrEqual(2);
```

- [ ] **步骤 2：运行 Playwright 并确认失败**

运行：`npm run test:e2e`

预期：FAIL，现有 CSS 未定义精装层和新比例。

- [ ] **步骤 3：重建桌面首页 CSS**

应用设计令牌：

```css
.home-navigation { min-height: 6svh; }
.home-navigation__inner,
.home-shell { width: 90%; }
.home-shell { min-height: 94svh; grid-template-rows: 84svh 16svh; }
.home-page { grid-template-rows: 7svh 71svh; }
.home-book-frame { width: 68%; aspect-ratio: 1.8; }
```

书本层分别使用：

```css
.home-book-cover { background-color: #f0f0f0; }
.home-book-binding { background-color: #737373; }
.home-book-edge { background: repeating-linear-gradient(...); }
.home-book-gutter { width: 1px; }
.book-page { background-color: #fff; }
```

书内桌面令牌：

```css
.book-page { padding: 6.5% 7.5% 6%; }
.book-page__running-head,
.book-page__part,
.catalog-entry,
.catalog-entry__date,
.book-page__archive { font-size: .2rem; }
.book-page__part { margin: 9% 0 7%; }
.catalog-list { gap: .7em; }
.book-page__archive { bottom: 10%; left: 50%; transform: translateX(-50%); }
```

头部和页脚令牌：

```css
.home-hero h1 { font-size: .5rem; }
.daily-quote__english { font-size: .35rem; }
.daily-quote__chinese,
.daily-quote__meta { font-size: .3rem; }
```

- [ ] **步骤 4：运行桌面浏览器测试**

运行：`npm run test:e2e`

预期：桌面测试通过，无首屏或横向溢出。

- [ ] **步骤 5：提交桌面视觉**

```bash
git add src/styles/home.css test/homepage-layout.spec.mjs
git commit -m "feat: render the homepage hardcover design"
```

## 任务 3：完成移动端和页脚行为

**文件：**
- 修改：`test/homepage-layout.spec.mjs`
- 修改：`src/styles/home.css`

- [ ] **步骤 1：增加移动端降级与页脚断言**

在 `390 × 844` 下断言：

```js
for (const selector of [
  ".home-book-cover",
  ".home-book-binding",
  ".home-book-edge",
  ".home-book-gutter",
]) {
  await expect(page.locator(selector)).toBeHidden();
}

await expect(page.locator(".book-page")).toHaveCount(2);
expect(mobileFontSize).toBeGreaterThanOrEqual(12);
expect(mobileCopyrightPosition).not.toBe("absolute");
```

- [ ] **步骤 2：运行测试确认失败**

运行：`npm run test:e2e`

预期：FAIL，新桌面样式尚未完整移动端降级。

- [ ] **步骤 3：实现移动端规则**

在 `max-width: 720px`：

```css
.home-book-cover,
.home-book-binding,
.home-book-edge,
.home-book-gutter { display: none; }

.home-book-frame,
.home-book {
  width: 100%;
  aspect-ratio: auto;
  filter: none;
  transform: none;
}

.book-page {
  min-height: 22rem;
  padding: 1.5rem 1.25rem 1.25rem;
  font-size: 1rem;
}

.book-page__running-head,
.book-page__part,
.catalog-entry,
.catalog-entry__date,
.book-page__archive {
  font-size: clamp(.75rem, 3vw, .9rem);
}

.daily-quote__meta {
  display: block;
}

.daily-quote__copyright {
  position: static;
  transform: none;
}
```

- [ ] **步骤 4：运行全部浏览器测试**

运行：`npm run test:e2e`

预期：全部 PASS。

- [ ] **步骤 5：提交响应式行为**

```bash
git add src/styles/home.css test/homepage-layout.spec.mjs
git commit -m "fix: preserve mobile homepage readability"
```

## 任务 4：完整验证与发布

- [ ] **步骤 1：运行静态检查和测试**

运行：

```bash
npm run check
npm test
npm run test:e2e
git diff --check
```

预期：0 errors，Node 测试和 Playwright 测试全部通过。

- [ ] **步骤 2：检查最终桌面与移动端截图**

查看：

```text
test-results/homepage-desktop.png
test-results/homepage-mobile.png
```

确认桌面首屏完整、归档链接居中、移动端可读。

- [ ] **步骤 3：推送并等待部署**

```bash
git push origin main
gh run list --workflow "Deploy Blog" --limit 1
gh run watch <run-id> --exit-status
```

- [ ] **步骤 4：线上验证**

读取 `https://zhimin.ink/` 和线上首页 CSS，确认：

- 精装书装饰层存在。
- 不存在“生活随笔”“技术笔记”标题。
- 存在 `Part I · Life`、`Part II · Technology`。
- 存在居中的“全部生活文章”“全部技术文章”。
- 作者与版权元信息结构已上线。
