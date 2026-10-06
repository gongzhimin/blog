---
id: 'src-site-docs-tutorials-getting-started'
type: 'tutorial'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/site/README.md'
related:
  - 'packages/site/docs/explanation/design.md'
  - 'packages/site/docs/reference/api.md'
---

# 组合翻页首页模型

目录：

- [学习目标](#学习目标)
- [准备环境](#准备环境)
- [练习输入](#练习输入)
- [练习步骤](#练习步骤)
- [预期结果](#预期结果)
- [排错与清理](#排错与清理)
- [后续阅读](#后续阅读)

## 学习目标

本教程通过 Site 包根唯一常见任务 `buildHomepageModel`，把 Astro 内容集合、Book 配置、主题和引语快照组合成页面模型。读者将观察成功结果、草稿过滤和输入失败诊断，不需要手动调用内容适配、Book Build 和样式生成函数。

模型任务不读取文件、不联网、不启动 DOM；Astro 页面仍负责读取真实集合和主题资源，并把结果渲染成 HTML。

## 准备环境

在 `blog/` 根目录执行，Node.js 为 22.13+ 或 24+，且已运行 `npm ci`。示例只使用仓库配置和内存文章夹具，不需要凭据或网络。

## 练习输入

输入包括两组 Astro 风格的文章记录、BookConfig、可空引语和一个主题替身。主题替身提供 `runtime`、`styles.visualCSS`、`measurement.articleCSS`、`measurement.tocCSS`；它不代表真实 Vite 主题加载结果。

文章日期必须是有效 `Date`。草稿先过滤，因此草稿即使没有有效日期也不进入模型；非草稿无效日期返回输入诊断。

## 练习步骤

1. 在 `blog/` 根执行成功案例：

   ```sh
   node --input-type=module <<'JS'
   import assert from 'node:assert/strict';
   import { buildHomepageModel } from '@myblog/site';
   import config from './packages/site/src/data/book-config.json' with { type: 'json' };

   const result = buildHomepageModel({
     lifePosts: [
       { id: 'essay', body: '正文', data: { title: '随笔', date: new Date('2026-01-01T00:00:00Z') } },
       { id: 'draft', data: { title: '草稿', draft: true } },
     ],
     blogPosts: [],
     bookConfig: config,
     dailyQuote: null,
     theme: {
       runtime: { id: 'classic-paper' },
       styles: { visualCSS: '' },
       measurement: { articleCSS: '', tocCSS: '' },
     },
   });

   assert.equal(result.ok, true);
   if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
   assert.deepEqual(result.value.document.entries.map((entry) => entry.id), ['essay']);
   assert.equal(result.value.runConfig.articles.length, 1);
   assert.equal(result.value.runConfig.theme.id, 'classic-paper');
   console.log(result.value.document.id, result.value.runConfig.articles.length);
   JS
   ```

2. 预期输出 `zhimin-blog 1`。这表明草稿过滤、Book Build 和主题配置组合由一次调用完成。

3. 执行失败案例，将非草稿文章的 `date` 改为 `new Date('invalid')`。结果应为 `ok: false`，首项诊断 code 为 `SITE_INPUT_INVALID`、phase 为 `input`，message 包含文章 id。函数返回诊断，不抛出来源错误。

4. 运行回归用例：

   ```sh
   node --test packages/site/tests/public-api.test.mjs tests/integration/homepage-render.test.mjs
   ```

## 预期结果

成功模型包含过滤后的 `document`、Book Build 载荷 `runConfig`、`homepageStyles` 和回退后的 `quote`。失败结果包含稳定 code/phase/message，且不含部分成功模型。

该练习不证明 Astro 路由生成、真实主题加载、RSS 输出或浏览器测量。修改页面布局仍需 `npm run build`；修改浏览器布局需 `npm run test:e2e`。

## 排错与清理

- `BOOK_CONFIG_INVALID` 或 `BOOK_BUILD_FAILED` 表示诊断来自 Book Build 阶段；按 message 中字段定位配置，不在 Site 复制另一份校验规则。
- `SITE_MODEL_FAILED` 表示主题或 CSS 组合失败；检查替身是否提供完整 theme 字段。
- 本练习不创建文件或启动网络请求，进程结束即可清理内存。

## 后续阅读

- [API 参考](../reference/api.md)：`buildHomepageModel` 输入、结果与诊断定义。
- [模块设计](../explanation/design.md)：页面数据组合、主题宿主和内容政策边界。
- [内容选择算法](../algorithms/content-selection.md)：草稿、日期优先级和排序规则。
- [测试方案](../testing/strategy.md)：模型测试与真实 Astro/浏览器验收的区别。
