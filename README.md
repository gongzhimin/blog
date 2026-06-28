# Zhimin's Blog

个人博客，基于 **Astro** 构建。首页是一本 **Turn.js 翻页书**，所有文章经运行时排版引擎实时分页后装入书中。

访问地址：[https://zhimin.ink/](https://zhimin.ink/)

---

## 设计

- **翻页书首页** — `index.astro` 渲染 Turn.js 书壳，文章内容作为书页
- **独立页码系统** — 目录用罗马数字，正文从 1 开始
- **运行时排版** — 浏览器端 DOM 测量容器实时分页，支持段落、代码块、列表、表格的跨页拆分
- **三层 JS 架构** — `measurement-css.js`（样式单源）→ `paginator.js`（分页引擎）→ `orchestrator.js`（全局编排）→ `book-app.js`（Turn.js 胶水）

---

## 技术栈

- **框架**: Astro (SSG)
- **翻页**: Turn.js
- **Markdown**: marked + KaTeX
- **评论**: Giscus
- **部署**: AWS Lightsail (Ubuntu + Nginx)

---

## 目录结构

```text
blog/
├── src/
│   ├── content/
│   │   ├── blog/               # 技术文章
│   │   └── life/               # 生活随笔
│   ├── data/
│   │   ├── book-config.json    # 书本尺寸 / 封面 / 排版参数
│   │   └── daily-quote.json    # 页脚每日引言
│   ├── lib/
│   │   └── book-renderer.js    # L1: MD → HTML（marked + KaTeX + 图片尺寸注入）
│   ├── pages/
│   │   ├── index.astro         # 翻页书首页
│   │   ├── blog/               # 技术文章列表 / 详情
│   │   ├── life/               # 随笔列表 / 详情
│   │   └── demos/              # Turn.js 原始 demo
│   ├── layouts/
│   │   └── PostLayout.astro    # 文章页布局
│   └── styles/
│       └── global.css          # 全局样式
├── public/
│   ├── vendor/turnjs/
│   │   ├── js/
│   │   │   ├── measurement-css.js  # 测量容器样式（单源真源）
│   │   │   ├── paginator.js        # 运行时排版引擎
│   │   │   ├── orchestrator.js     # 全局页码编排
│   │   │   └── book-app.js         # Turn.js 初始化胶水
│   │   ├── css/                    # Turn.js 原始样式
│   │   ├── turn.js / turn.min.js   # Turn.js 核心
│   │   └── hash.js                 # URL hash 路由
│   └── images/
│       └── mobile/             # 移动端发布图片
├── scripts/                    # 服务端 webhook 脚本
└── .github/workflows/          # CI/CD
```

---

## 排版引擎

`paginator.js` 在浏览器中创建隐藏的 DOM 测量容器，通过 `scrollHeight` 检测溢出：

| 元素 | 跨页策略 |
|---|---|
| `<p>` `<li>` `<blockquote>` | 二分搜索字符拆分 |
| `<pre>` | 逐行移除拆分 |
| `<table>` | 按 `<tr>` 边界拆分，保留 `<thead>` |
| `<ul>` `<ol>` `<dl>` | 嵌套列表提取为同级，按子项边界拆分 |
| `<h1>`–`<h6>` | 标题与下一元素整体搬到新页 |

`measurement-css.js` 是测量容器与书页 CSS 的**唯一来源**，避免手动同步出错。

---

## 自动化工作流

### PC 端

`git push` → GitHub Actions → AWS 服务器 `git pull` + `npm run build`

### iOS 移动端

快捷指令 POST 到 `/webhook`，服务端通过 GitHub API 直接写入文章。

---

## 本地开发

```bash
npm install
npm run dev
```

---

*"文字留住瞬间。"*
