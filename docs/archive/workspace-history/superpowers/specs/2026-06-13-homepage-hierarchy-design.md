# 首页版式层级重构设计文档

> **日期：** 2026/06/13
> **目标：** 将博客首页从单一时间线改造为“分类并行 + 精选展示”的双栏布局，以优雅地管理日益增多的内容，并增强编辑设计感。

---

## 一、设计基调

保持“沉稳内敛的编辑风格（Editorial）”，利用 CSS Grid 或 Flexbox 打造具有杂志感的双栏目录视图。

---

## 二、页面架构设计

### 2.1 首页布局 (index.astro)

首页将作为“最新内容陈列窗 (Showcase)”，不再展示所有文章。

*   **Header:** 保持现有的居中极简 `Zhimin` 标题。
*   **内容区 (双栏布局):**
    *   **左栏 (Essays / 生活随笔):** 
        *   栏目小标题：使用小字号、斜体、淡棕色 (`var(--color-text-muted)`) 进行标识。
        *   内容：提取 `life` 集合中最新发布的 **3-5 篇** 笔记。
        *   底部：提供 `View all essays →` 链接。
    *   **右栏 (Technical / 技术文章):**
        *   栏目小标题：与左栏风格一致。
        *   内容：提取 `blog` 集合中最新发布的 **3-5 篇** 文章。
        *   底部：提供 `View all technical →` 链接。
*   **响应式处理 (Mobile/Tablet):** 当屏幕宽度不足以支撑优雅的双栏时（例如 `< 640px` 或 `< 768px`），布局自动降级为单栏垂直排列（先展示 Essays 区块，随后展示 Technical 区块）。

### 2.2 列表样式微调

在双栏内部，由于空间变窄，原有的“左标题-右日期”的对齐方式可能过于拥挤。
*   **调整：** 将日期移动到标题下方，或者缩减日期的显示格式（例如仅显示年份和月份，或者使用非常紧凑的排版）。为了保持极致的清爽，可以**在首页隐藏日期**，仅显示文章标题，让读者聚焦于文字本身。

### 2.3 归档页 (Archive Pages)

为了承载未在首页展示的旧文章，需要创建两个独立的列表页：
*   `/src/pages/life/index.astro`: 展示所有的生活随笔列表。
*   `/src/pages/blog/index.astro`: 展示所有的技术文章列表。

这两页的布局将沿用原首页的“单一时间线”风格。

---

## 三、技术实现规划

1.  **CSS 布局:** 使用 `display: grid; grid-template-columns: 1fr 1fr; gap: 4rem;` 来实现宽屏双栏。使用 `@media (max-width: 768px)` 媒体查询将其重置为 `grid-template-columns: 1fr; gap: 2rem;`。
2.  **数据过滤:** 在 `index.astro` 的 Frontmatter 脚本中，修改 `allPosts` 逻辑，分别获取 `blogPosts.slice(0, 5)` 和 `lifePosts.slice(0, 5)`。
3.  **路由增加:** 新增 `/life/index.astro` 和 `/blog/index.astro` 文件，负责渲染完整的列表。

---

## 四、回滚策略

修改主要集中在 `src/pages/index.astro` 文件的重写，以及新增两个归档文件。所有变更将打包为一个独立的 Git Commit 提交，方便随时通过 Git 命令回退至当前版本。
