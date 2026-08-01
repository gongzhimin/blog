# 稳定书口厚度层实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让书口厚度在 Turn.js 四角折页预览期间保持可见，并且不修改 Turn.js 源码。

**架构：** 把厚度节点改成 `.sj-book` 内被 Turn.js 忽略的稳定装饰层。自有适配层继续计算其宽度和偏移，并将它们放在静态页面之上、折叠页面之下。

**技术栈：** Astro、CSS、jQuery、Turn.js 4.1、Node.js test runner、Playwright e2e

---

### 任务 1：锁定稳定书口 DOM 合同

**文件：**
- 修改：`test/turnjs-adapter.test.mjs`
- 修改：`src/book/components/BookShell.astro`

- [x] **步骤 1：编写失败的结构测试**

读取 `BookShell.astro`，断言存在两个带 `ignore="1"` 的直接书口层，并断言 `front-side`、`back-side` 封面内部没有 `.depth`。

- [x] **步骤 2：运行测试验证失败**

运行：`node --test test/turnjs-adapter.test.mjs`

预期：FAIL，旧结构没有被忽略的稳定书口层。

- [x] **步骤 3：编写最少组件实现**

在 `.sj-book` 中加入 `.book-depth--front` 与 `.book-depth--back` 直接子级，设置 `ignore="1"` 和 `aria-hidden="true"`，并移除封面页内部的旧 `.depth`。

### 任务 2：迁移样式和动态更新逻辑

**文件：**
- 修改：`test/turnjs-adapter.test.mjs`
- 修改：`public/vendor/turnjs/css/steve-jobs.css`
- 修改：`public/book-runtime/js/turnjs-adapter.js`

- [x] **步骤 1：编写失败的适配层测试**

断言 `updateDepth()` 使用稳定书口选择器并设置基于总页数的 `z-index`，且不再查询 `.p2 .depth` 或倒数封面页内的 `.depth`。

- [x] **步骤 2：运行测试验证失败**

运行：`node --test test/turnjs-adapter.test.mjs`

预期：FAIL，旧适配层仍更新封面页内部节点。

- [x] **步骤 3：编写最少实现**

CSS 将稳定书口层绝对定位到 `.sj-book` 两侧并设置 `pointer-events: none`。`updateDepth()` 缓存两个稳定节点，更新宽度、偏移和 `z-index: pages + 1`。

- [x] **步骤 4：运行测试验证通过**

运行：`node --test test/turnjs-adapter.test.mjs`

预期：PASS。

### 任务 3：完整验证

**文件：**
- 验证：`public/vendor/turnjs/turn.js`
- 验证：`public/vendor/turnjs/turn.min.js`

- [x] **步骤 1：运行全部单元测试**

运行：`npm test`

预期：所有测试通过。

- [x] **步骤 2：运行端到端测试**

运行：`npm run test:e2e`

预期：所有测试通过。

- [x] **步骤 3：浏览器四角检查**

启动本地站点，依次悬停书本四角；每次读取两个稳定书口层的尺寸、连接状态和祖先节点，确认尺寸非零、节点仍连接且祖先中不存在 `.page-wrapper`。

- [x] **步骤 4：确认第三方源码未变**

运行：`git diff --exit-code -- public/vendor/turnjs/turn.js public/vendor/turnjs/turn.min.js`

预期：无差异。
