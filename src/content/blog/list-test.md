---
title: "列表与嵌套结构的排版测试"
description: "测试无序列表、有序列表、嵌套列表、混合内容列表"
pubDatetime: 2026-06-25
tags: ["test", "lists"]
---

# 列表与嵌套结构的排版测试

## 无序列表

以下是一个多项目的无序列表，用来测试列表在书页中的垂直空间占用：

- 第一项：排版引擎的参数调优
- 第二项：JSDOM 解析 HTML 的性能考量
- 第三项：元素高度估算的精度与速度权衡
- 第四项：跨页拆分时的孤行保护策略
- 第五项：不可拆分元素的 fallback 处理

## 有序列表

实现一个分页排版引擎的步骤：

1. 使用 `marked` 将 Markdown 转换为 HTML
2. 使用 JSDOM 解析 HTML 为 DOM 树
3. 遍历 DOM 的子节点，为每个块级元素创建排版对象
4. 根据 `PageConfig` 中的元素高度表，估算每个元素的高度
5. 将元素逐个尝试放入当前页，放不下时按 `splitStrategy` 拆分或移到下一页
6. 所有元素处理完毕后，输出页面数组

## 嵌套列表

- 前端技术栈
  - Astro 6.x 静态站点生成
  - Turn.js 翻书效果
  - Tailwind CSS 4.x 工具类
  - jQuery 1.7（历史遗留）
- 后端与工具链
  - Node.js 22
  - GitHub Actions CI/CD
  - AWS Lightsail 部署
  - n8n 工作流编排
- 内容来源
  - FreshRSS 聚合
  - iOS 快捷指令发布
  - Sieve 管道自动生成

## 混合内容列表

1. 首先，安装项目依赖
   ```bash
   npm install
   ```
2. 然后，启动开发服务器
   ```bash
   npm run dev
   ```
3. 最后，构建生产版本
   - 运行 `npm run build`
   - 检查 `dist/` 目录
   - 部署到服务器

