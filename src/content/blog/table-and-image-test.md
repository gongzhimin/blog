---
title: "表格与图片的排版测试"
description: "测试表格、图片、超链接的排版效果"
pubDatetime: 2026-06-24
tags: ["test", "table", "image"]
---

# 表格与图片的排版测试

## 简单表格

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `lineHeight` | number | 24 | 该元素每行的像素高度 |
| `paddingTop` | number | 0 | 元素上方的内边距 |
| `paddingBottom` | number | 0 | 元素下方的内边距 |
| `marginBottom` | number | 20 | 元素与下一个元素之间的外边距 |
| `splittable` | boolean | false | 是否允许跨页拆分 |
| `splitStrategy` | string | 'none' | 拆分策略：line、sentence、child |

## 稍大的表格

表格是测试跨页拆分的好元素。当表格的行数较多时，排版引擎需要在 `<tr>` 边界处拆分表格，将前半部分的行留在当前页，后半部分的行移到下一页。

| 文件名 | 层 | 行数 | 职责 |
|--------|-----|------|------|
| `book-renderer.js` | L1 | 96 | Markdown 转 HTML |
| `book-paginator.js` | L2 | 307 | 排版引擎 |
| `book-assembler.js` | L3 | 104 | 书页组装 |
| `paginate.js` | L2 | 288 | JSDOM 精确排版 |
| `book-config.json` | — | 250 | 全局配置 |
| `book-app.js` | — | 142 | Turn.js 运行时 |
| `index.astro` | — | 390 | 首页编排 |

## 超链接与图片

排版系统需要正确处理超链接的显示。访问 [Astro 官网](https://astro.build) 了解更多关于静态站点生成的内容。Markdown 的链接语法 `[text](url)` 会被转换为 `<a href="url">text</a>`。

---

注：图片元素在服务端构建时无法获取真实尺寸，因此使用 `elementHeights.img` 中的固定估值（当前为 200px）。如果图片实际高度超过估值，可能会在页面底部产生少量溢出；如果远小于估值，则会产生多余的空白。这是服务端预排版的固有局限。

