# 稳定封面底衬实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在四角预览和每次正式翻页期间，用不受 Turn.js 管理的固定封面底衬持续填充纸张四周。

**架构：** `BookShell.astro` 提供两块带 `ignore="1"` 的直接子级；`build-homepage-styles.mjs` 从现有封面配置生成左右精灵图、尺寸和层级样式。真实封面页仍由 Turn.js 驱动，固定底衬只负责低层兜底。

**技术栈：** Astro、生成式 CSS、Turn.js、Node.js Test Runner、Playwright

---

## 文件结构

- 修改 `test/homepage-render.test.mjs`：验证静态结构和配置驱动的底衬样式。
- 修改 `test/homepage-layout.spec.mjs`：验证四角预览及连续翻页期间底衬保持挂载。
- 修改 `src/book/components/BookShell.astro`：添加 Turn.js 忽略的左右底衬节点。
- 修改 `src/book/homepage/build-homepage-styles.mjs`：生成桌面端和移动端底衬样式。
- 修改 `public/book-runtime/js/turnjs-adapter.js`：维护首封和末封的书壳状态类。

### 任务 1：建立失败的结构与样式测试

**文件：**
- 修改：`test/homepage-render.test.mjs`

- [ ] **步骤 1：编写失败的测试**

新增测试，要求 `.sj-book` 拥有两个直接子级底衬，均带 `ignore="1"` 和 `aria-hidden="true"`；同时从构建后的样式中检查 `cover.image`、`frontInside`、`back`、桌面硬封面尺寸、绝对定位、`pointer-events: none` 与移动端尺寸。

```js
test("homepage renders stable cover underlays outside turnjs page wrappers", async () => {
  const document = await loadHomepage();
  const config = await loadBookConfig();
  const layers = [...document.querySelectorAll(".sj-book > .book-cover-underlay")];
  const styles = [...document.querySelectorAll("style")]
    .map((node) => node.textContent)
    .join("\n");

  assert.equal(layers.length, 2);
  assert.deepEqual(layers.map((layer) => layer.getAttribute("ignore")), ["1", "1"]);
  assert.deepEqual(layers.map((layer) => layer.getAttribute("aria-hidden")), ["true", "true"]);
  assert.match(styles, new RegExp(config.cover.image.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(styles, new RegExp(config.cover.positions.frontInside.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(styles, new RegExp(config.cover.positions.back.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(styles, /\.book-cover-underlay\s*\{[\s\S]*position:\s*absolute/);
  assert.match(styles, /pointer-events:\s*none/);
});
```

- [ ] **步骤 2：运行测试并确认失败**

运行：`npm run build && node --test --test-name-pattern="stable cover underlays" test/homepage-render.test.mjs`

预期：FAIL，实际底衬数量为 `0`。

### 任务 2：建立失败的交互回归测试

**文件：**
- 修改：`test/homepage-layout.spec.mjs`

- [ ] **步骤 1：扩展角落预览测试**

在现有 `book depth stays mounted during corner previews` 测试中同时读取 `.sj-book > .book-cover-underlay`，检查两个节点均保持 `display: block`、尺寸非零、不在 `.page-wrapper` 内，并记录封面 wrapper 已降为 `-1`，确保测试命中真实故障窗口。

- [ ] **步骤 2：新增连续翻页测试**

```js
test("cover underlays stay mounted across consecutive page turns", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sj-book")).toBeVisible();

  for (let turn = 0; turn < 3; turn += 1) {
    await page.evaluate(() => window.jQuery(".sj-book").turn("next"));
    await page.waitForTimeout(100);
    const layers = await page.locator(".sj-book > .book-cover-underlay").evaluateAll(
      (nodes) => nodes.map((node) => ({
        display: getComputedStyle(node).display,
        rect: node.getBoundingClientRect().toJSON(),
        inPageWrapper: Boolean(node.closest(".page-wrapper")),
      })),
    );
    expect(layers).toHaveLength(2);
    expect(layers.every((layer) => layer.display === "block" && layer.rect.width > 0 && layer.rect.height > 0 && !layer.inPageWrapper)).toBe(true);
    await page.waitForTimeout(900);
  }
});
```

- [ ] **步骤 3：新增首尾闭合状态和移动端测试**

跳转到第 1 页与最后一页，断言两块底衬均隐藏，并分别断言右、左书口厚度隐藏；在 390px 视口下断言中间页左底衬为 `370 × 507`、右底衬隐藏。角落预览时同时断言 Turn.js 处于动画状态、存在移动页，且两块底衬和对应书口恢复显示。

- [ ] **步骤 4：运行交互测试并确认失败**

运行：`npm run test:e2e -- --grep "cover underlays|book depth stays"`

预期：FAIL，因为底衬节点尚不存在。

### 任务 3：实现固定封面底衬

**文件：**
- 修改：`src/book/components/BookShell.astro`
- 修改：`src/book/homepage/build-homepage-styles.mjs`
- 修改：`public/book-runtime/js/turnjs-adapter.js`

- [ ] **步骤 1：添加稳定 DOM 节点**

在现有稳定 `.book-depth` 节点之前加入：

```astro
<div ignore="1" aria-hidden="true" class="book-cover-underlay book-cover-underlay--front"></div>
<div ignore="1" aria-hidden="true" class="book-cover-underlay book-cover-underlay--back"></div>
```

- [ ] **步骤 2：添加配置驱动样式**

```css
.sj-book .book-cover-underlay {
  position: absolute;
  top: 0;
  width: ${book.hardPage.width}px;
  height: ${book.hardPage.height}px;
  z-index: 0;
  pointer-events: none;
  background-color: white;
  background-image: url(${cover.image});
  background-repeat: no-repeat;
  background-size: ${cover.backgroundSize};
}

.sj-book .book-cover-underlay--front {
  left: 0;
  background-position: ${cover.positions.frontInside};
}

.sj-book .book-cover-underlay--back {
  right: 0;
  background-position: ${cover.positions.back};
}
```

在移动端媒体查询中让底衬使用 `${mobileContentPage.width}px × ${mobileContentPage.height}px`。移动端为单页画布，隐藏右底衬，保留左底衬覆盖完整画布，避免两幅不同精灵图重叠。

- [ ] **步骤 3：维护闭合端点状态**

在适配器初始化和动画完成后维护 `book-at-first` / `book-at-last` 类；`start` 和 `turning` 时清除两个类，使动画期间两块底衬都保持可见。CSS 在第一页和最后一页 settled 状态隐藏两块底衬，并分别隐藏右、左书口厚度；中间页保持两块底衬和书口可见。

- [ ] **步骤 4：运行目标测试并确认通过**

运行：`npm run build && node --test --test-name-pattern="stable cover underlays" test/homepage-render.test.mjs`

预期：PASS。

运行：`npm run test:e2e -- --grep "cover underlays|book depth stays"`

预期：PASS。

### 任务 4：完整验证并提交

**文件：**
- 验证以上所有修改文件。

- [ ] **步骤 1：运行静态检查与完整测试**

运行：`npm run check`

预期：Astro 检查无错误。

运行：`npm test`

预期：构建成功，全部 Node 测试通过。

运行：`npm run test:e2e`

预期：全部 Playwright 测试通过。

- [ ] **步骤 2：检查差异**

运行：`git diff --check`

预期：无输出。

运行：`git status --short`

预期：仅出现本计划和四个预期修改文件。

- [ ] **步骤 3：提交实现**

```bash
git add docs/superpowers/plans/2026-08-01-stable-cover-underlay.md \
  src/book/components/BookShell.astro \
  src/book/homepage/build-homepage-styles.mjs \
  public/book-runtime/js/turnjs-adapter.js \
  test/homepage-render.test.mjs \
  test/homepage-layout.spec.mjs
git commit -m "fix: keep cover backing stable during page turns"
```
