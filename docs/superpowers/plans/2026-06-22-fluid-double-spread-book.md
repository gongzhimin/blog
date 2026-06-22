# 流式双开书响应式实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让首页书本在所有视口中保持双开与固定宽高比，使用窗口可用宽高最大化尺寸，并将所有布局、目录和文字参数独立配置化。

**架构：** JSON 保存全部参数；配置模块校验并生成普通 CSS 变量和带字面阈值的容器查询；数据模块根据生活、技术各自配置生成文章数量与日期；CSS 只保留布局算法。

**技术栈：** Astro 6、CSS 容器单位与容器查询、Node.js test runner、JSDOM、Playwright。

---

### 任务 1：建立独立流式配置契约

**文件：**
- 修改：`src/data/homepage-config.json`
- 修改：`src/data/homepage-config.schema.json`
- 修改：`src/data/HOMEPAGE_CONFIG.md`
- 修改：`src/lib/homepage-config.mjs`
- 测试：`test/homepage-config.test.mjs`

- [ ] 先在配置测试中断言新的 `layout`、`catalogs` 和分组 `textStyles` 字段及 CSS 变量。
- [ ] 运行 `node --test test/homepage-config.test.mjs`，确认因字段缺失失败。
- [ ] 将长度校验扩展到 `cqw`、`cqh`、`cqi`、`cqb`、`svw`，增加正整数校验。
- [ ] 从 `aspectRatio` 派生数值比例 CSS 变量。
- [ ] 新增 `buildHomepageResponsiveStyles(config)`，生成导航与两个目录的独立查询规则。
- [ ] 更新 Schema 和中文说明。
- [ ] 运行配置测试确认通过。
- [ ] 提交：`refactor: define fluid book configuration`

### 任务 2：让目录数据由两页独立配置

**文件：**
- 修改：`src/lib/homepage.mjs`
- 修改：`src/pages/index.astro`
- 修改：`src/components/BookCatalogPage.astro`
- 测试：`test/homepage-data.test.mjs`
- 测试：`test/homepage-render.test.mjs`

- [ ] 先编写失败测试，分别传入生活和技术的最大文章数、窄页文章数和日期格式。
- [ ] 运行相关 Node 测试确认失败。
- [ ] 将 `formatCatalogDate()` 改为接受格式字符串。
- [ ] 将 `buildCatalogEntries()` 改为接受独立选项并生成 `narrowHidden`。
- [ ] 首页分别传递生活和技术配置。
- [ ] 组件使用 `catalog-entry--narrow-hidden`。
- [ ] 运行测试确认通过。
- [ ] 提交：`refactor: configure book catalogs independently`

### 任务 3：实现固定比例最大化与始终双开

**文件：**
- 修改：`src/styles/home.css`
- 修改：`src/pages/index.astro`
- 测试：`test/homepage-layout.spec.mjs`
- 测试：`test/homepage-config.test.mjs`

- [ ] 先改浏览器测试，要求所有视口保持两页同排、物理书本层可见、宽高比固定、无横向溢出。
- [ ] 增加宽屏与矮屏断言，证明书本同时受可用宽度和高度限制。
- [ ] 运行 `npm run test:e2e` 确认旧移动堆叠方案失败。
- [ ] 将导航、书本区、书本、页脚设置为命名尺寸容器。
- [ ] 使用独立固定/比例间隔和 `min()` 计算书本可用宽高。
- [ ] 使用固定宽高比数值变量计算书本宽度。
- [ ] 删除移动端单页堆叠和隐藏物理层规则。
- [ ] 为所有独立文字角色绑定各自 `clamp(min, fluid, max)`。
- [ ] 注入配置生成的导航、生活页和技术页查询规则。
- [ ] 运行配置、构建和 E2E 测试确认通过。
- [ ] 提交：`style: keep the homepage book fluid and double spread`

### 任务 4：验证、提交与部署

**文件：**
- 测试：全部测试文件

- [ ] 运行 `npm run check`。
- [ ] 运行 `npm test`。
- [ ] 运行 `npm run test:e2e`。
- [ ] 运行 `git diff --check`。
- [ ] 人工检查桌面、移动和暗色截图。
- [ ] 检查 GitHub 与服务器仓库状态。
- [ ] 经服务器临时 Git bundle 分支推送 GitHub，不修改服务器脏工作树。
- [ ] 等待 GitHub Actions 成功。
- [ ] 验证线上首页保持双开、固定比例、无横向溢出。

