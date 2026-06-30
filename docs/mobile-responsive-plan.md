# 手机版 64K 单页显示方案

## 目标

桌面宽屏（>= 800px）：当前 B5 双页翻开，保持不变。
手机窄屏（< 800px）：64K 单页口袋书，拇指翻页。

## 参数对照

| 参数 | 桌面 B5 | 手机 64K |
|---|---|---|
| 画布宽 | 960px | 390px |
| 硬壳 | 480×600 | 370×507 |
| 内容区 | 460×582 | 340×478 |
| 内容宽 | 380px | 280px |
| `ARTICLE_H` | 471 | 380 |
| `ARTICLE_W` | 380 | 280 |
| `TOC_H` | 400 | 320 |
| 字号 | 13px | 11px |
| 行距 | 1.7 | 1.6 |
| 半行间距 | 8px | 6px |
| 翻页模式 | double | single |
| 精灵图 | 2400×600 | 1850×507 |

### ARTICLE_H 推导

```
手机：478（页面高）- 46（顶部 margin）- 52（底部页码区）= 380px
桌面：582 - 56 - 55 = 471px
```

## 架构

### CSS 媒体查询（静态样式）

```css
/* book-content.css */
@media (max-width: 800px) {
  :root {
    --font-size-body: 11px;
    --line-height-body: 1.6;
    --spacing-half: 6px;
  }
  .sj-book .book-content {
    width: 280px;
    margin-top: 46px;
  }
}
```

### 书壳尺寸（index.astro）

```css
@media (max-width: 800px) {
  #canvas { width: 390px !important; }
  .sj-book { width: 390px !important; height: 507px !important; }
  .sj-book .hard { width: 370px !important; height: 507px !important; }
  .sj-book .own-size { width: 340px !important; height: 478px !important; }
}
```

### JS 运行时切换（book-app.js）

```
loadApp()
  ├─ isMobile = window.innerWidth < 800
  ├─ paginator.js: ARTICLE_H = isMobile ? 380 : 471
  ├─ paginator.js: ARTICLE_W = isMobile ? 280 : 380
  ├─ paginator.js: TOC_H     = isMobile ? 320 : 400
  ├─ Turn.js display: isMobile ? 'single' : 'double'
  └─ 精灵图路径选择
```

### 分页引擎改造

`paginator.js` 当前 `ARTICLE_H`、`ARTICLE_W`、`TOC_H` 是闭包常量。改为通过 `PAGINATOR.setMode()` 动态切换：

```js
PAGINATOR.setMode({
  ARTICLE_H: 380,
  ARTICLE_W: 280,
  TOC_H: 320
});
```

## 精灵图

桌面：2048×516 截图，CSS `background-size: 2400px 600px`，五段位置 `0 / -483 / -968 / -1452 / -1936`

手机：1850×507 截图，CSS `background-size: 1850px 507px`，五段位置 `0 / -370 / -740 / -1110 / -1480`

截图流程与桌面版一致（Puppeteer 渲染 sprite-only-standalone.html → JPG）。

## 实施步骤

1. CSS 媒体查询 — book-content.css + index.astro 加 `@media (max-width: 800px)`
2. paginator.js 改造 — ARTICLE_H/W、TOC_H 可动态切换
3. book-app.js — 检测宽度，切换 Turn.js display 和分页参数
4. 手机精灵图 — 截图 + CSS
5. 联调测试

## 暂不处理

- 书脊厚度（depth）
- 翻页动画参数（Turn.js 自适应）
