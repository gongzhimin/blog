---
id: 'src-book-docs-tutorials-getting-started'
type: 'tutorial'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'book-build'
owner: 'Book Build 维护者'
parent: 'packages/book-build/README.md'
related:
  - 'packages/book-build/docs/explanation/design.md'
  - 'packages/book-build/docs/reference/api.md'
---

# 离线构建一本 JSON 小书

目录：

- [学习目标](#学习目标)
- [准备环境](#准备环境)
- [练习输入](#练习输入)
- [练习步骤](#练习步骤)
- [预期结果](#预期结果)
- [排错与清理](#排错与清理)
- [后续阅读](#后续阅读)

## 学习目标

本教程旨在指导开发者在本地纯 Node.js 内存环境中完成一本多章节 JSON 书籍对象的构建、正文渲染与阅读载荷装配全流程。

通过本练习，开发者将理解 `BookDocument` 规范化内容模型、Markdown/HTML 转换管道、预估分页计算以及书本初始阅读配置的派生机制。

本教程仅适用于：

1. 本地快速体验与调试书籍装配流水线的输入输出行为；
2. 验证自定义 JSON 数据源与正文渲染回调函数的兼容性；
3. 观察装配器在处理默认日期回退、文章标题剥离及配置隔离时的表现。

本教程不适用于：

1. 修改生产环境的正式文章集合或静态站点页面；
2. 验证浏览器运行时的真实 DOM 物理分页计算（真实分页必须由浏览器测量环境完成）；
3. 直接在生产环境发布或分发内容变更。

## 准备环境

在开始操作前，请确保满足以下环境与权限要求：

1. **工作目录**：所有命令必须在项目根目录（`blog/`）下执行。
2. **运行时环境**：Node.js 必须为 22 LTS（>=22.13.0）或 24+ 版本，支持原生 ESM 及 JSON 模块导入语法。
3. **依赖安装**：已在 `blog/` 目录下完成 `npm ci`，所有工程依赖均已就绪。
4. **环境隔离与避坑**：本演练全程使用内存虚拟数据，不读写持久化文章库；主题资源由 Site 的 Vite 层导入，Book Build 的 `createBookTheme(id, sources)` 只接收 CSS 字符串，因此纯 Node 调用也能使用该转换接口。

## 练习输入

本演练使用一份包含两个章节的内存 JSON 书籍定义，并读取站点权威配置作为几何与排版基准：

| 输入项             | 数据来源                                  | 类型           | 说明与边界规则                                                                         |
| ------------------ | ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| 书籍配置           | `packages/site/src/data/book-config.json` | JSON Object    | 声明书本几何尺寸、Turn.js 预设及封面精灵图参数；`buildBook()` 会自动校验               |
| 章节 1 (Markdown)  | 内存数据                                  | Markdown Entry | 缺失日期字段，将自动回退为 Unix Epoch (1970-01-01)；首行包含一级标题，将由去重逻辑剥离 |
| 章节 2 (受信 HTML) | 内存数据                                  | HTML Entry     | 指定 `bodyType: 'html'`，直接透传内容，跳过 Markdown 编译器                            |

输入数据必须为受信资产，本模块暂未集成不可信 HTML 净化器。

## 练习步骤

### 步骤 1：执行内存装配流程

在终端执行如下 Node.js ESM 脚本，完成书籍模型的构建、组装与断言核对：

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import config from './packages/site/src/data/book-config.json' with { type: 'json' };
import { buildBook } from '@myblog/book-build';

// 1. 显式校验输入配置契约
// 配置由 buildBook 自动校验。

// 2. 构造标准 BookDocument 模型
const document = {
  id: 'practice',
  title: '练习书',
  tocTitle: '目录',
  entries: [
    {
      id: 'first',
      collection: 'practice',
      title: '第一章',
      date: new Date('2026-01-01T00:00:00.000Z'),
      body: '# 第一章\n\n你好 **世界**。',
      bodyType: 'markdown',
      metadata: {},
    },
    {
      id: 'second',
      collection: 'practice',
      title: '第二章',
      date: new Date('2026-01-02T00:00:00.000Z'),
      body: '<p>受信 HTML</p>',
      bodyType: 'html',
      metadata: {},
    },
  ],
};

// 3. 执行书籍装配与派生计算
const result = buildBook({ document, config });
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
const runtime = result.value;

// 4. 深度断言装配不变量
assert.equal(document.entries[0].date.toISOString(), '1970-01-01T00:00:00.000Z');
assert.equal(runtime.articles.length, 2);
assert.match(runtime.articles[0].bodyHTML, /<strong>世界<\/strong>/);
assert.doesNotMatch(runtime.articles[0].bodyHTML, /<h1>/);
assert.equal(runtime.articles[1].bodyHTML, '<p>受信 HTML</p>');
assert.equal(runtime.config.book.turn.totalPages, 15);
assert.notEqual(runtime.config, config);

// 5. 打印关键装配输出
console.log(
  `[装配成功] 书籍ID: ${runtime.config.source.documentId}, 篇目数: ${runtime.articles.length}, 估算总页数: ${runtime.config.book.turn.totalPages}`
);
NODE
```

### 步骤 2：测试非法输入拦截

执行如下指令，验证无效配置会以结构化诊断返回：

```sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { buildBook } from '@myblog/book-build';

const result = buildBook({ document: { id: 'bad' }, config: {} });
assert.equal(result.ok, false);
assert.equal(result.diagnostics[0].code, 'BOOK_CONFIG_INVALID');
console.log('[防护有效] 配置错误以诊断返回');
NODE
```

## 预期结果

完成操作后，对照以下标准核验输出与系统状态：

1. **控制台输出核对**：
   - 步骤 1 应输出：`[装配成功] 书籍ID: practice, 篇目数: 2, 估算总页数: 15`；
   - 步骤 2 应输出：`[防护有效] 配置错误以诊断返回`。
2. **核心业务逻辑断言核对**：
   - **标题剥离**：第一章正文中的 `# 第一章` 被成功移除，避免在书页中与顶栏标题重复；
   - **格式渲染**：Markdown 强调语法被正确解析为 `<strong>` 标签，而 HTML 章节未被二次转义；
   - **预估页码**：`totalPages` 被计算为 15（公式：$9 + 3 \times 2$ 篇文章），此数值仅作为占位估算，不代表浏览器最终分页；
   - **配置隔离**：`runtime.config` 为深拷贝后的全新对象，原始 `config` 对象未被污染。
3. **单元测试回归验证**：
   执行相关模块的测试套件，确认底层逻辑完全绿灯：
   ```sh
   node --test tests/integration/book-runtime.test.mjs packages/book-build/tests/book-theme.test.mjs packages/site/tests/json-book-source.test.mjs tests/integration/book-config-schema.test.mjs
   ```

## 排错与清理

若在操作过程中遇到异常，请按以下指引排查：

1. **模块解析失败（ERR_MODULE_NOT_FOUND）**：
   - 检查当前终端的工作目录是否位于 `blog/`；
   - 检查 `node_modules` 是否存在，若缺失请重新执行 `npm ci`。
2. **JSON 导入语法报错**：
   - 确认当前 Node.js 版本是否支持 `with { type: 'json' }` 语法（推荐 >=22.13.0 或 24+）。
3. **数据校验断言失败**：
   - 检查传入的 JSON 结构是否满足最小约束，确认未向适配器传入不可解析的日期格式。
4. **清理与恢复**：
   - 本教程所有计算均在 Node.js 内存堆中完成，无任何本地磁盘写入或状态残留，直接终止进程即可恢复初始状态。

## 后续阅读

- [模块设计说明](../explanation/design.md)：理解内容模型转换与构建生命周期；
- [公共接口参考](../reference/api.md)：查看 `buildBook` 的输入、结果和诊断契约；
- [模块变更指南](../guides/change.md)：了解修改内容模型或装配器时的标准流程；
- [测试验证方案](../testing/strategy.md)：查阅模块完整的测试分层与证据要求。
