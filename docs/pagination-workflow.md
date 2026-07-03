# 排版工作流与算法详解

## 概览

整个排版系统在**浏览器端运行时**完成。文章 Markdown 在服务端预渲染为 HTML（L1），注入到页面后由 JavaScript 在隐藏的 DOM 测量容器中实时分页（L2），最终按页号逐页组装到 Turn.js 翻页书中（L3）。

```
服务端 (Astro build)                    浏览器端 (runtime)
┌──────────────────────┐          ┌─────────────────────────────┐
│ markdown-renderer    │          │ MEASURE_CSS                  │
│ MD + KaTeX → HTML    │  ───→    │ 测量容器样式单源              │
│ 图片尺寸注入          │          │                              │
└──────────────────────┘          │ paginator-core.js            │
                                  │ 分页配置 + 隐藏测量容器        │
                                  │                              │
                                  │ paginator-splitters.js       │
                                  │ 段落/代码/列表/表格拆分        │
                                  │                              │
                                  │ paginator.js                 │
                                  │ 正文/目录分页调度              │
                                  │                              │
                                  │ orchestrator.js              │
                                  │ page-cache 实例 + 目录生成     │
                                  │                              │
                                  │ turnjs-adapter.js            │
                                  │ Turn.js 适配 + 翻页交互       │
                                  │                              │
                                  │ book-app.js                  │
                                  │ 配置读取 + 运行时启动          │
                                  └─────────────────────────────┘
```

运行时代码位于 `public/book-runtime/js/`。`public/vendor/turnjs/` 只保留 Turn.js、jQuery、Modernizr、Hash、示例 CSS 与图片等第三方资源，避免把自研分页/编排代码误认为对 Turn.js 的魔改。

分页器拆成三层：

- `paginator-core.js`：维护分页尺寸配置，创建隐藏测量容器。
- `paginator-splitters.js`：提供 `splitText`、`splitPre`、`splitList`、`splitTable` 等元素拆分策略。
- `paginator.js`：编排正文分页、目录分页和公开 `BookRuntime.Paginator` API。

`turnjs-adapter.js` 是 Book Runtime 和 Turn.js 之间的边界：页面注入、书壳深度、滑条、鼠标滚轮、hash、键盘、移动端 single display 与桌面端 double display 都在这里处理。`book-app.js` 只读取 `#book-data`、选择分页配置，通过 `BookRuntime.Orchestrator.createPageCache()` 创建分页缓存实例，然后创建 `BookRuntime.TurnAdapter`。

Astro 页面通过两个组件接入运行时：

- `src/book/components/BookRuntimeAssets.astro`：集中注入 Turn.js 及其第三方依赖。
- `src/book/components/BookShell.astro`：渲染书本 DOM、`#book-data`、测量 CSS 与自研 Book Runtime 脚本。

---

## 数据流

### Step 0：服务端预处理（`markdown-renderer.mjs`）

```
Markdown 文章
    │
    ├─ KaTeX 公式提取（$$…$$ → 占位符 → 渲染后回填）
    ├─ marked → HTML
    ├─ 图片尺寸注入（读 public/ 下的图片文件，计算宽高写入 <img>）
    └─ 去除首行标题（避免书页中重复显示文章标题）
    │
    ▼
{ title, dateStr, bodyHTML }  →  注入 index.astro 的 #book-data
```

### Step 1：初始化（`book-app.js` + `turnjs-adapter.js`）

页面加载 → `loadApp()` → `pageCache.paginateAll(articles, tocHTML)` → `BookRuntime.TurnAdapter.create(...).mount()` → Turn.js 初始化。

### Step 2：全局编排（`orchestrator.js`）

`pageCache.paginateAll()` 按五步执行：

```
Step 1 ─ 逐篇文章调用 paginateArticle()，缓存每篇文章的页面数组
         记录 articleStarts[]：每篇文章的起始物理页码
         ↓
Step 2 ─ 用估算页码构建目录 HTML，调用 paginateTOC() 得到目录页数 tocLen
         ↓
Step 3 ─ 计算 shift = (5 + tocLen) - 7
         用真实物理页码重建目录，显示页码 = 物理页 - 正文起始页 + 1
         ↓
Step 4 ─ 将目录页存入 pageCache[5..5+tocLen-1]，页脚为罗马数字
         ↓
Step 5 ─ 将文章页存入 pageCache[正文起始页..]，页脚为阿拉伯数字（从 1 开始）
         计算总页数 TOTAL_PAGES，确保偶数（背面封面在奇数页）
```

### Step 3：按需取页（`book-app.js`）

Turn.js 翻页时触发 `missing` 回调 → `addPage(page)` → 从 `pageCache.getPageContent(page)` 取 HTML → 创建 `.own-size` 元素。

---

## 测量容器

### 原理

在 `<body>` 中插入一个 `position:absolute; opacity:0` 的隐藏 `<div>`，内部应用与书页 `.book-content` 完全相同的 CSS。利用浏览器的真实布局引擎计算 `scrollHeight`。

### 为什么是运行时

- 服务端（Node.js）没有完整的 CSS 布局引擎
- JSDOM/Puppeteer 太慢且不稳定
- 浏览器原生 `scrollHeight` 精确到亚像素，速度极快
- 测量结果与最终渲染完全一致（同一个浏览器，同一套 CSS）

### CSS 单源（`MEASURE_CSS`）

```js
var MEASURE_CSS = {
  article: '#__bap_inner { font-family:Georgia; font-size:13px; … } …',
  toc:     '#__toc { font-size:16px; margin:80px auto; … } …'
};
```

`paginator-core.js` 读取 `BookShell.astro` 注入的 `MEASURE_CSS` 并创建测量容器。测量 CSS 由主题模块和页面 CSS 同源生成，杜绝手动同步出错。此前曾因缺少 `word-break: break-word` 导致测量比实际渲染偏矮，修复后统一管理。

### 可用高度计算

```
页面高度      582 px   (.own-size)
顶部 margin   -56 px   (.book-content margin-top)
底部页码区    -55 px   (.page-number bottom:25 + line-height:30)
─────────────────────
可用高度      471 px   (ARTICLE_H)
```

---

## 分页算法

`paginateArticle()` 的主循环逐步将 `elems[]` 中的 DOM 元素加入测量容器：

```
inner.innerHTML = firstHdr   // 文章标题 + 日期

for each el in elems:
    clone el, appendChild 到 inner
    if inner.scrollHeight > maxH:
        removeChild，尝试拆分 el
        if 拆分成功 → reduced el 留在当前页，rest 插入 elems[i+1]
        if 拆分失败 → savePage() 保存当前页，newPage() 开新页
                     在新页上重试拆分（空白页有完整 471px 空间）
```

### 拆分策略

#### 段落 / 列表项 / 引用块（`splitText`）

二分搜索**可见字符数**，在 HTML 标签保持完整的前提下切分。

```
1. 获取原始 innerHTML 和 textContent
2. lo=10, hi=textLen, 二分查找（最多 15 轮）
   - 在 HTML 中定位第 mid 个可见字符的字节偏移
   - el.innerHTML = origHTML[0:off]，检查 scrollHeight
3. 找到最大 best 使得 scrollHeight ≤ maxH
4. el 保留 0..best，创建 rest 保留 best..end
```

`charToHTML()` 跳过 `<` `>` 内的标签，只计可见字符。

#### 代码块（`splitPre`）

逐行移除，每次重设 `<code>` 的 `textContent`：

```
1. 获取所有行
2. 从末尾逐行移除，检查 scrollHeight
3. 找到最大 n 使得前 n 行 ≤ maxH
4. el 保留 0..n-1 行，rest 保留 n..end 行
```

#### 列表容器（`splitList`）

按子项（`<li>` / `<dt>` / `<dd>`）边界拆分：

```
1. 获取所有子元素
2. 从末尾逐个子元素移除，检查 scrollHeight
3. 找到最大 keep 使得 0..keep-1 个子元素 ≤ maxH
4. rest 为同类型新容器，包含 keep..end 子元素
5. 对 <ol>，设置 rest 的 start 属性 = origStart + keep
```

#### 表格（`splitTable`）

在 `<tr>` 边界拆分，保留 `<thead>`：

```
1. 收集所有 <tbody> 中的 <tr>
2. 将原表放入测量容器，pinColWidths() 固定列宽
3. 在克隆上测量：逐行移除 tbody 行，找到 keep
4. rest 创建新 <table>，复制 <thead> 和 keep..end 行
5. 原表保留 0..keep-1 行
6. 列宽通过 getBoundingClientRect() 测量后固定为 px
```

### 嵌套列表处理

在分页循环**之前**，递归提取嵌套列表：

```
原始：<ul>                      提取后：<ul class="list-lvl-1">
        <li>A</li>                       <li>A</li>
        <li>B                             <li>B</li>
          <ul>                          </ul>
            <li>B1</li>                 <ul class="list-lvl-2">
            <li>B2</li>                   <li>B1</li>
          </ul>                           <li>B2</li>
        </li>                           </ul>
        <li>C</li>                      <ul class="list-lvl-1">
      </ul>                               <li>C</li>
                                        </ul>
```

深度通过 `.list-lvl-N` CSS 类控制缩进（16px / 32px / 48px），不依赖 DOM 嵌套。这样每个 `<li>` 内容都是纯文本，`splitText` 切分时不会切断嵌套 HTML 结构。

### blockquote 展平

多子元素的 `<blockquote>` 在分页前拆成独立 blockquote：

```
原始：<blockquote>                    展平后：<blockquote><p>A</p></blockquote>
        <p>A</p>                              <blockquote><p>B</p></blockquote>
        <p>B</p>
      </blockquote>
```

### 标题处理

当标题溢出时，标题**和下一个元素整体**搬到新页：

```
if heading overflows:
    savePage()
    newPage()
    在新页依次放标题 + 下一个元素
    跳过下一个元素的循环迭代
```

---

## 目录生成（`paginateTOC`）

与文章分页独立，有自己的测量参数：

```
可用高度      400 px   (TOC_H，比文章页更保守，留有呼吸空间)
容器宽度      300 px
顶部 margin    80 px
```

### 分页逻辑

```
1. 解析 TOC HTML，提取 <h1> 和所有 <li>
2. 逐项 clone 到测量容器的 <ul> 中
3. 当 scrollHeight > maxH：
   - 移除最后加入的 <li>
   - 将当前内容保存为一页
   - 清空 <ul>，将溢出的 <li> 作为下一页的第一项
4. 最后剩余内容保存为最后一页
```

---

## 页码系统

### 两套独立页码

| 区域 | 物理页 | 显示页码 | 样式 |
|---|---|---|---|
| 封面 | 1–4 | 无 | 硬壳 |
| 目录 | 5..bodystart-1 | I, II, III… | 罗马数字 |
| 正文 | bodystart..end-2 | 1, 2, 3… | 阿拉伯数字 |
| 封底 | end-1, end | 无 | 硬壳 |

### 目录内引用

```
href="#page/7"           → 物理页（点击跳转用）
<span>1</span>           → 显示页码（读者看）
```

---

## 魔法数字速查

| 常量 | 值 | 含义 |
|---|---|---|
| `ARTICLE_H` | 471 | 文章页可用高度 |
| `TOC_H` | 400 | 目录页可用高度 |
| `ARTICLE_W` | 380 | 内容区宽度 |
| 目录起始物理页 | 5 | 封面占4页后的第一个内容页 |
| `toRoman()` | — | 罗马数字转换（仅支持1-39） |
