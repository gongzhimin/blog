# 窗口宽度锚定书本与组件化配置实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将首页改为窗口宽度比例驱动、具有硬最小尺寸和双向滚动的双开书，并把全部首页配置迁移为按组件组织的 JSON。

**架构：** `homepage-config.json` 以 navigation、book、footer、directories 为顶层组件；配置模块从组件路径生成 CSS 变量和容器查询；首页使用自然文档流，书本内部使用 `cqw` 字号，纸页使用镜像 3D 变换，中缝为 1px 并带双侧阴影，深色书内脊位于纸页后方。

**技术栈：** Astro 6、CSS 3D transforms、CSS container units、JSON Schema、Node.js test runner、JSDOM、Playwright。

---

### 任务 1：迁移组件化配置契约

**文件：**
- 修改：`src/data/homepage-config.json`
- 修改：`src/data/homepage-config.schema.json`
- 修改：`src/data/HOMEPAGE_CONFIG.md`
- 修改：`src/lib/homepage-config.mjs`
- 测试：`test/homepage-config.test.mjs`

- [ ] **步骤 1：编写失败测试**

将配置断言改为：

```js
assert.deepEqual(
  Object.keys(config).sort(),
  ["book", "directories", "footer", "navigation"],
);
assert.equal(config.book.size.viewportWidth, "72vw");
assert.equal(config.book.size.minimumWidth, "36rem");
assert.equal(config.book.innerSpine.seamWidth, "1px");
assert.equal(config.book.pages.life.catalogTitle.fontSize, "0.55cqw");
assert.equal(config.book.pages.technical.catalogTitle.fontSize, "0.55cqw");
assert.equal("minimumSize" in config.book.pages.life.catalogTitle, false);
assert.equal("layout" in config, false);
assert.equal("textStyles" in config, false);
```

并断言 CSS 变量：

```js
assert.match(css, /--home-book-size-viewport-width:72vw/);
assert.match(css, /--home-book-inner-spine-seam-width:1px/);
assert.match(css, /--home-book-pages-life-catalog-title-font-size:0\.55cqw/);
```

- [ ] **步骤 2：运行测试确认红灯**

运行：

```bash
node --test test/homepage-config.test.mjs
```

预期：FAIL，旧配置仍包含 `layout`、`textStyles`、`materials`。

- [ ] **步骤 3：迁移 JSON 与 Schema**

将顶层改为：

```json
{
  "navigation": {},
  "book": {},
  "footer": {},
  "directories": {}
}
```

书内文字样式统一为：

```json
{
  "fontFamily": "serif",
  "fontSize": "0.55cqw",
  "lightColor": "#282522",
  "darkColor": "#282522"
}
```

生活页和技术页保留独立对象。

- [ ] **步骤 4：重写字段描述**

在 `homepage-config.mjs` 中按组件路径定义 `FIELDS`，保留现有导出以兼容 `/tune`：

```js
["book.size.viewportWidth", "length", "book-size-viewport-width"]
["book.innerSpine.seamWidth", "length", "book-inner-spine-seam-width"]
["book.pages.life.catalogTitle.fontSize", "length", "book-pages-life-catalog-title-font-size"]
```

书内 `fontSize` 额外校验必须使用 `cqw`。

- [ ] **步骤 5：更新说明并验证**

运行：

```bash
node --test test/homepage-config.test.mjs
```

预期：全部通过。

- [ ] **步骤 6：Commit**

```bash
git add src/data/homepage-config.json src/data/homepage-config.schema.json src/data/HOMEPAGE_CONFIG.md src/lib/homepage-config.mjs test/homepage-config.test.mjs
git commit -m "refactor: group homepage config by component"
```

### 任务 2：迁移首页、目录和调参页面消费者

**文件：**
- 修改：`src/pages/index.astro`
- 修改：`src/pages/life/index.astro`
- 修改：`src/pages/blog/index.astro`
- 修改：`src/pages/tune.astro`
- 修改：`src/lib/homepage.mjs`
- 测试：`test/homepage-data.test.mjs`
- 测试：`test/homepage-render.test.mjs`
- 测试：`test/archive-render.test.mjs`

- [ ] **步骤 1：编写失败测试**

首页组件输入改为组件路径：

```js
assert.match(page, /homepageConfig\.navigation\.content\.siteName/);
assert.match(page, /homepageConfig\.book\.pages\.life\.content\.partLabel/);
assert.match(page, /homepageConfig\.footer\.content\.copyrightLabel/);
```

目录数据使用：

```js
config.book.pages.life.catalog
config.book.pages.technical.catalog
```

目录页码使用：

```js
config.directories.life.folio.content
config.directories.technical.folio.content
```

- [ ] **步骤 2：运行相关测试确认红灯**

运行：

```bash
npm run build
node --test test/homepage-data.test.mjs test/homepage-render.test.mjs test/archive-render.test.mjs
```

预期：FAIL，Astro 页面仍读取旧路径。

- [ ] **步骤 3：迁移 Astro 页面**

更新所有旧路径，并保持文章数据与每日一句来源不变。

- [ ] **步骤 4：兼容现有调参页面**

保留用户新增的 `/tune` 页面和 `FIELDS` 导出，调整：

- 预览组件读取新路径。
- 比例派生路径改为 `book.size.aspectRatio`。
- 自检封面变量改为 `--home-book-cover-color`。
- 控件树直接按 navigation、book、footer、directories 分组。
- 删除 `textStyles` 特殊分组分支。

- [ ] **步骤 5：运行测试确认绿灯**

运行：

```bash
npm run build
node --test test/homepage-data.test.mjs test/homepage-render.test.mjs test/archive-render.test.mjs
```

预期：全部通过。

- [ ] **步骤 6：Commit**

```bash
git add src/pages/index.astro src/pages/life/index.astro src/pages/blog/index.astro src/pages/tune.astro src/lib/homepage.mjs test/homepage-data.test.mjs test/homepage-render.test.mjs test/archive-render.test.mjs
git commit -m "refactor: consume component homepage config"
```

### 任务 3：实现宽度锚定、双向滚动和真实书脊层级

**文件：**
- 修改：`src/styles/home.css`
- 修改：`src/styles/global.css`
- 测试：`test/homepage-layout.spec.mjs`
- 测试：`test/homepage-config.test.mjs`

- [ ] **步骤 1：编写失败的尺寸测试**

在 1440×900 和 1440×600 中断言书宽相同：

```js
expect(desktopFrame.width).toBeCloseTo(1440 * 0.72, 0);
expect(shortFrame.width).toBeCloseTo(desktopFrame.width, 0);
```

在 390×844 中断言：

```js
expect(frame.width).toBeGreaterThan(390);
expect(document.documentElement.scrollWidth).toBeGreaterThan(390);
```

- [ ] **步骤 2：编写失败的物理结构测试**

断言：

```js
expect(gutter.width).toBe("1px");
expect(leftPage.transform).not.toBe("none");
expect(rightPage.transform).not.toBe("none");
expect(bindingZ).toBeLessThan(pageZ);
expect(bindingBefore.display).not.toBe("none");
expect(bindingAfter.display).not.toBe("none");
```

并验证书内目录字号随书宽变化、与窗口高度无关。

- [ ] **步骤 3：运行 E2E 确认红灯**

运行：

```bash
npm run test:e2e
```

预期：FAIL，旧实现仍按可用高度缩放且禁止横向溢出。

- [ ] **步骤 4：改为自然文档流**

移除 `.home-shell` 的固定视口高度与行分配。导航、主内容和页脚按文档流排列。

删除：

```css
overflow-x: clip;
width: min(100%, calc(100cqh * ...));
```

书本改为：

```css
width: max(
  var(--home-book-size-viewport-width),
  var(--home-book-size-minimum-width)
);
```

书本舞台通过自身 `min-width` 产生可达的横向滚动区域。

- [ ] **步骤 5：实现纯书本比例字号**

书内所有角色直接使用：

```css
font-size: var(--home-book-pages-life-catalog-title-font-size);
```

移除书内字号的 `clamp()`。

- [ ] **步骤 6：实现纸页弯曲与中缝阴影**

左右纸页使用镜像 `rotateY`，内侧伪元素使用镜像渐变阴影。`.home-book-gutter` 保持 `1px` 并添加弱双侧阴影。

- [ ] **步骤 7：实现下层书内脊弧形端面**

`.home-book-binding` 的层级低于 `.home-book`。使用 `::before`、`::after` 在顶部和底部生成弧形端面；端面不得覆盖纸页。

- [ ] **步骤 8：更新目录页码变量并验证**

更新 `global.css` 的组件路径变量，运行：

```bash
node --test test/homepage-config.test.mjs
npm run test:e2e
```

预期：全部通过。

- [ ] **步骤 9：Commit**

```bash
git add src/styles/home.css src/styles/global.css test/homepage-layout.spec.mjs test/homepage-config.test.mjs
git commit -m "style: anchor the book to viewport width"
```

### 任务 4：完整验证与部署

**文件：**
- 测试：全部测试文件

- [ ] **步骤 1：运行静态检查**

```bash
npm run check
git diff --check
```

预期：0 errors，diff 无空白错误。

- [ ] **步骤 2：运行全部测试**

```bash
npm test
npm run test:e2e
```

预期：全部通过。

- [ ] **步骤 3：人工检查截图**

检查：

- 桌面正常高度。
- 桌面矮窗口。
- 手机横向滚动状态。
- 暗色主题。
- `/tune` 参数树。

- [ ] **步骤 4：同步远程并部署**

先获取 GitHub 最新 `main`。若本机网络不可用，沿用已验证的服务器 Git bundle 中转方案：

- 不 checkout、pull 或 reset 服务器脏工作树。
- 仅创建临时分支。
- 快进推送 GitHub `main`。
- 等待 GitHub Actions 成功。

- [ ] **步骤 5：线上验证**

确认线上 HTML 和 CSS 包含：

```text
--home-book-size-viewport-width
--home-book-inner-spine-seam-width:1px
rotateY
.home-book-binding::before
.home-book-binding::after
```
