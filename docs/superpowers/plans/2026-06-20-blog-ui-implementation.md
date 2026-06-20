# 博客 UI 设计规范 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 或 superpowers:subagent-driven-development 逐任务实现此计划。

**目标：** 将博客站点收敛成统一的编辑风格页面系统，强化首页、归档页、文章页和 About 页的排版秩序与阅读体验。

**架构：** 站点继续保持静态生成，但把视觉系统从分散的 inline style 收拢到全局 CSS 和少量语义化类名中。首页负责目录感，归档页负责扫读，文章页负责长文阅读，About 页负责作者识别。  

**技术栈：** Astro、Markdown 内容集合、全局 CSS、Giscus、GitHub Actions。

---

## 文件结构

- 修改：`src/styles/global.css`
  - 职责：提供全站排版系统、色彩、间距、正文阅读样式、列表样式、About 页样式和响应式规则。
- 修改：`src/pages/index.astro`
  - 职责：首页目录结构、站点入口、栏目展示和底部导航。
- 修改：`src/pages/blog/index.astro`
  - 职责：技术文章归档页的标题、说明和列表结构。
- 修改：`src/pages/life/index.astro`
  - 职责：随笔归档页的标题、说明和列表结构。
- 修改：`src/layouts/BlogLayout.astro`
  - 职责：技术文章详情页的头部、摘要、标签和正文壳。
- 修改：`src/layouts/LifeLayout.astro`
  - 职责：随笔详情页的头部和正文壳。
- 修改：`src/pages/about.astro`
  - 职责：作者介绍页的结构与联系信息。
- 修改：`src/components/Giscus.astro`
  - 职责：评论区容器样式，统一边界与留白。

## 任务 1：首页目录感重建

**文件：**
- 修改：`src/pages/index.astro`
- 修改：`src/styles/global.css`

- [ ] **步骤 1：重写首页结构，去掉大量 inline style，改为语义化壳和栏目区块。**

```astro
<main class="site-shell">
  <header class="site-topbar">...</header>
  <section class="site-intro">...</section>
  <div class="home-grid">
    <section class="home-column">...</section>
    <section class="home-column">...</section>
  </div>
  <footer class="site-footer">...</footer>
</main>
```

- [ ] **步骤 2：在 `src/styles/global.css` 中定义首页网格、栏目标题、故事列表和底部导航样式。**

```css
.site-shell { width: min(100% - 2rem, var(--page-width)); margin: 0 auto; }
.home-grid { display: grid; gap: 2rem; }
.section-title { font-family: var(--font-sans); text-transform: uppercase; }
.story-list { display: grid; gap: 0.95rem; }
.site-footer { display: flex; justify-content: center; gap: 1.25rem; }
```

- [ ] **步骤 3：运行构建验证首页不会破坏 Astro 生成流程。**

运行：`npm run build`  
预期：`Complete!`

- [ ] **步骤 4：提交首页结构重构。**

```bash
git add src/pages/index.astro src/styles/global.css
git commit -m "style: refine homepage editorial layout"
```

## 任务 2：归档页秩序统一

**文件：**
- 修改：`src/pages/blog/index.astro`
- 修改：`src/pages/life/index.astro`
- 修改：`src/styles/global.css`

- [ ] **步骤 1：将两个归档页改成相同的信息结构，分别只保留栏目标题、简短说明和文章列表。**

```astro
<main class="site-shell site-shell--narrow">
  <a href="/" class="article-page__back">← Back</a>
  <header class="archive-page__intro">...</header>
  <div class="archive-list">
    <article class="archive-row">
      <a class="archive-row__title" href={`/blog/${post.id}`}>{post.data.title}</a>
      <time class="archive-row__date">{dateString}</time>
    </article>
  </div>
</main>
```

- [ ] **步骤 2：在 `src/styles/global.css` 中定义归档行、日期列和边线节奏。**

```css
.archive-list { border-top: 1px solid rgba(var(--color-border), 0.72); }
.archive-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; }
.archive-row__date { font-family: var(--font-sans); color: rgb(var(--color-text-muted)); }
```

- [ ] **步骤 3：运行构建验证归档页的列表布局与响应式规则。**

运行：`npm run build`  
预期：`Complete!`

- [ ] **步骤 4：提交归档页统一样式。**

```bash
git add src/pages/blog/index.astro src/pages/life/index.astro src/styles/global.css
git commit -m "style: unify archive page layout"
```

## 任务 3：文章详情页阅读体验

**文件：**
- 修改：`src/layouts/BlogLayout.astro`
- 修改：`src/layouts/LifeLayout.astro`
- 修改：`src/styles/global.css`
- 修改：`src/components/Giscus.astro`

- [ ] **步骤 1：把文章头部统一成“返回链接 + 日期/身份 + 标题 + 摘要 + 标签”的结构。**

```astro
<main class="site-shell site-shell--narrow article-page">
  <a href="/" class="article-page__back">← Back</a>
  <header class="article-hero">
    <div class="article-hero__meta">...</div>
    <h1 class="article-title">{title}</h1>
    <p class="article-dek">{description}</p>
  </header>
  <article class="article-body"><slot /></article>
  <Giscus />
</main>
```

- [ ] **步骤 2：在 `src/styles/global.css` 中定义文章页正文宽度、标题层级、摘要、标签、引用和代码块样式。**

```css
.article-body { font-size: 1.06rem; }
.article-body > h1:first-child { display: none; }
.article-title { font-size: clamp(2rem, 4vw, 3.25rem); }
.article-tag { border-radius: 999px; }
```

- [ ] **步骤 3：在 `src/components/Giscus.astro` 中统一评论区边界。**

```astro
<div class="comments giscus">
  <script src="https://giscus.app/client.js" ...></script>
</div>
```

- [ ] **步骤 4：运行构建验证文章页标题不会重复，正文和评论区仍可正常生成。**

运行：`npm run build`  
预期：`Complete!`

- [ ] **步骤 5：提交文章页阅读体验调整。**

```bash
git add src/layouts/BlogLayout.astro src/layouts/LifeLayout.astro src/styles/global.css src/components/Giscus.astro
git commit -m "style: improve article reading layout"
```

## 任务 4：About 页作者识别

**文件：**
- 修改：`src/pages/about.astro`
- 修改：`src/styles/global.css`

- [ ] **步骤 1：将 About 页改成更紧凑的作者名片结构。**

```astro
<main class="site-shell site-shell--compact">
  <a href="/" class="article-page__back">← Back</a>
  <section class="about-page__section">
    <div class="about-page__profile">...</div>
    <div class="about-page__bio">...</div>
    <div class="about-page__links">...</div>
  </section>
</main>
```

- [ ] **步骤 2：在 `src/styles/global.css` 中定义头像、作者名、简介和按钮样式。**

```css
.about-page__profile { display: grid; grid-template-columns: auto 1fr; }
.about-page__avatar { width: 3.5rem; height: 3.5rem; border-radius: 0.75rem; }
.about-page__link { width: 2.5rem; height: 2.5rem; border-radius: 0.7rem; }
```

- [ ] **步骤 3：运行构建验证 About 页结构与样式兼容。**

运行：`npm run build`  
预期：`Complete!`

- [ ] **步骤 4：提交 About 页视觉收束。**

```bash
git add src/pages/about.astro src/styles/global.css
git commit -m "style: refine about page identity block"
```

## 任务 5：全局样式收口与移动端修正

**文件：**
- 修改：`src/styles/global.css`

- [ ] **步骤 1：把页面壳、标题、正文、列表、表格、图片和动效收拢到统一的全局风格。**

```css
html { background: radial-gradient(...), linear-gradient(...); }
body { font-family: var(--font-serif); }
main { animation: fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
```

- [ ] **步骤 2：补足移动端断点，让首页单栏、归档行换行、详情页标题缩小。**

```css
@media (max-width: 720px) {
  .home-grid { grid-template-columns: 1fr; }
  .archive-row { grid-template-columns: 1fr; }
  .article-title { font-size: clamp(1.8rem, 9vw, 2.5rem); }
}
```

- [ ] **步骤 3：运行构建验证全局样式没有破坏现有页面。**

运行：`npm run build`  
预期：`Complete!`

- [ ] **步骤 4：提交全局样式收口。**

```bash
git add src/styles/global.css
git commit -m "style: consolidate editorial global styles"
```

## 验证

完成全部任务后，运行：

```bash
npm run build
```

预期：

- Astro 构建成功
- 所有页面静态生成成功
- 没有重复标题或明显布局断裂

## 交付结果

完成后，博客应具备以下状态：

1. 首页具有明确的目录感。
2. 归档页可以快速扫读。
3. 文章页阅读体验稳定。
4. About 页更像作者名片。
5. 全站视觉语言统一，不再依赖大量 inline style。
