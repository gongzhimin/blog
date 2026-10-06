---
id: 'book-runtime-contract'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: '跨模块工程'
owner: '项目维护者'
parent: 'docs/architecture/overview.md'
related: ['packages/book-build/README.md', 'packages/book-runtime/README.md']
---

# 构建与浏览器运行契约

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

本契约供内容来源、Astro 页面组合与浏览器阅读器维护者使用，定义统一模型如何成为终端可测量载荷，以及页码、缓存和插件各自的状态。适用于当前单书全局 Runtime 与受信 HTML，不提供任意输入安全、多实例隔离或无条件动态重排。

模型在构建时保有 Date；浏览器仅消费序列化文章与配置。Book Build 和 Runtime 无源码依赖，Site 使用两端的登记 API 完成组合。[总览](../architecture/overview.md) 给出依赖方向。

## 接口清单

| 阶段与调用入口                               | 输入                                    | 输出或责任                              |
| -------------------------------------------- | --------------------------------------- | --------------------------------------- |
| Site `buildHomepageModel(input)`             | 内容集合、Book 配置、主题与可选引语快照 | 首页模型、浏览器载荷、样式和引语        |
| Book Build `buildBook({ document, config })` | 标准 BookDocument 与配置                | 校验后的运行载荷及结构化诊断            |
| Site `loadSiteBookTheme(id)`（内部组合）     | Site 持有的 CSS 原始字符串              | 调用 Book Build 根入口得到显示/测量 CSS |
| Runtime `paginateBook(payload)`              | Book Build 载荷及浏览器测量环境         | 物理页面、正文起页和双向导航映射        |
| Site `BookShell`、`BookRuntimeAssets`        | Astro 页面数据与浏览器资源              | 输出书壳 DOM、装载脚本并启动阅读器      |
| Operations `runHealthChecks()`               | 当前进程环境                            | 健康检查结果与诊断                      |
| Publishing `startServer()`                   | 发布服务进程配置                        | 启动 HTTP 服务；CLI 负责进程生命周期    |
| Tooling `inspectRepository(input?)`          | 仓库路径与检查模式                      | 只读工程检查报告                        |

六个包均只开放 `@myblog/<package>` 包根路径；包内 API 参考说明根入口中的任务函数。Site 持有 Astro 组件和展示 CSS，负责导入样式资源并把 CSS 字符串交给 Book Build 的 `createBookTheme()`。Book Build 不依赖 Site，也不负责文件读取。Runtime 的 `paginateBook` 要求浏览器 `window` 和 DOM；Site 的 `BookRuntimeAssets` 装载浏览器依赖并按顺序启动阅读器。

服务或 Node 代码不能直接执行这些浏览器资源入口。

## 输入与配置

### 构建模型

权威声明为 `packages/book-build/src/api/types.d.ts`，以下字段构成来源边界：

| 模型         | 字段与不变量                                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| BookDocument | id/title/tocTitle 字符串；entries 为 BookEntry 数组；description/metadata 可选                                             |
| BookEntry    | id/collection/title 字符串；date 为有效 Date；body 字符串；bodyType 为 markdown 或 html；metadata 为记录                   |
| 来源政策     | Astro 按 pubDatetime 优先于 date，拒绝无效 Date，过滤 draft 后倒序；JSON 保留数组顺序、缺省 epoch、拒绝非法日期与 bodyType |

typedef 不是完整运行校验。新增来源必须定义可信输入、身份唯一性、日期、缺省、排序与失败；模型不能携带 DOM、GitHub 客户端或插件。

### 浏览器载荷

`buildBook({ document, config })` 自动按权威 Book Schema 校验配置，成功时对配置做 JSON clone 并加以下交接字段：

| 字段                               | 类型与含义                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| articles[]                         | title/dateStr/bodyHTML/key 字符串；source 为 id/collection 字符串对象                     |
| toc                                | 初始目录 HTML 字符串，链接仅为构建估计                                                    |
| source                             | documentId/documentTitle/tocTitle 字符串、entryCount 数字                                 |
| runtime.pagination                 | articleWidth/articleHeight/tocWidth/tocHeight，单位 CSS px，来自 book.pagination          |
| runtime.mobilePagination           | 同结构或 null；缺少移动配置时消费端回退桌面尺寸                                           |
| book.turn                          | startPage 构建为 7；totalPages 为 7 + articles.length * 3 + 2；backPage 为 totalPages - 1 |
| book.contentPage/mobileContentPage | 插件页面宽高，与正文测量可用空间分别配置                                                  |
| book.mobileBreakpoint              | 按浏览器窗口宽度切换模式；缺省消费值 800                                                  |

- key 为条目 id 的 CRC32 转两个 proquint 音节，存在有限空间碰撞风险；
- 它支持 ?post 导航，不是无限唯一标识。dateStr 已格式化，不再传 Date；
- source.entryCount 不等于物理页数。

### 测量一致性

主题必须让显示 CSS 与测量 CSS 使用一致的字体、段落、代码及目录规则。

BookShell 将样式写入 `window.MEASURE_CSS.article/toc`。`paginateBook(payload)` 选取窗口对应的分页尺寸并执行测量；尺寸与实际渲染宽高不一致会产生溢出或空白。

字段结构及约束以 Book Schema 和 Runtime API 为准，不能用生成参考代替校验。

## 输出与副作用

- `buildBook` 成功返回原 `document` 引用和可交付 `articles`、`toc`、`config`；失败返回 `BOOK_CONFIG_INVALID` 或 `BOOK_BUILD_FAILED` 诊断，不返回部分载荷；
- 不启动浏览器。renderMarkdown 可处理本地图片，HTML body 不经过 Markdown 渲染；
- 原始 HTML 的信任责任仍在来源。

Site 的 `BookShell` 输出 #canvas、#book-zoom、.sj-book、#slider 与隐藏 #book-data[data-config]，另提供测量 CSS。

序列化由 JSON.stringify 完成；完整 BookDocument 中的 Date 不作为浏览器运行对象传输。构建估值仅用于书壳启动，不能据此判断正文页数。

```text
Build model --> rendered articles/config --> BookShell DOM + measure CSS
                                                     |
                                                     v
Assets --> API initialized --> app reads payload --> choose dimensions
                                                     |
                                                     v
                                      paginate articles + measure TOC
                                                     |
                                                     v
                            physical cache + display numbers + mappings
                                                     |
                                                     v
                                      Turn adapter mount --> navigation
                                                     |
                             cross mobile breakpoint +-- reload
```

`paginateBook` 对外只返回页面数组和导航映射副本。内部编排器 `paginateAll` 管理页面缓存、正文/目录偏移、封底及对齐页；这些内部对象不属于包根 API，也不应由跨包调用者依赖。

totalPages 始终为末物理页编号，包含书壳的前四页，不是缓存键数量。命中不重新测量或消费新 articles；内容变化先 reset 再分页。返回值和映射是内部共享对象，不得由调用者随意修改。

全书页面拓扑与页码不变量：

1. **前置特殊页**：物理页 1（封面）、2（封二）、3（扉页正面）、4（扉页反面/出版说明）；物理页 3 与 4 包含在 `pageCache` 中并由静态书壳提供预渲染骨架，消除开卷空白；
2. **动态目录页**：从物理页 5 开始，占 $T$ 页（$5 \sim 4+T$），页脚使用大写罗马数字（`I`, `II`, ...）；
3. **正文主体页**：从物理页 $bodyStart = 5+T$ 开始，到 $bodyEnd = bodyStart + M - 1$；
4. **后置特殊页**：若 $bodyEnd$ 为奇数，自动注入 1 页对齐尾衬页保持偶数跨页闭合，消除末页多余空白；紧随物理倒数第二页（封三）和物理最后一页（封底）；
5. **页码统计隔离**：前四页、目录页、对齐尾衬页和最后两页均**不计入**正文页码统计与计数；正文页面是全书唯一参与页码统计的范围，显示页码严格为 $1 \sim M$（$totalBodyPages = M$）；
6. **Site 翻页交互**：Site 的适配器处理封面、视图计数与动画收敛；其验证见 Site 测试和 Chromium E2E，不由分页成功推导交互正确。

目录初测后最多校准 8 轮，测得页数与候选相等才提交；此时 bodyStart=articleStart=5+最终目录页数，链接和映射采用同一偏移。`paginateBook` 仅在收敛后返回页面和映射。

候选循环或预算耗尽会抛错，不提交新页面、映射或封底状态；导航仍要求输入 key 无冲突。

资源所有权与清理：

- Runtime 持有测量容器和页缓存；正文/目录分页通过 finally 移除本调用测量节点，查询限定在本容器内。
- 插件拥有管理页 DOM；装饰以 ignore 标记放在管理区外。
- cache.reset 清本实例缓存、双向映射、结果和完成标志，并移除本实例封底 style。
- reset 不删除其他样式或插件 DOM，不承担插件销毁或重新 mount。

默认 app 在本次加载分页一次，尚无完整 mount/destroy 管理器。

## 错误与边界

来源 adapter 对无效日期、重复内容策略或不支持的来源格式负责校验；`buildBook` 对无效配置返回带字段路径的诊断。未知主题在 Vite 主题资源入口报告。

assembler 没有统一完整输入验证，调用方必须准备合法模型/配置。

#book-data 缺失或 data-config 非法会在 app 初始读取时报错，没有统一恢复 UI。`paginateBook` 失败时返回诊断；当前 app 捕获失败后仅保留初始目录占位页，不能视为正文完整。插件挂载和 URL 导航重试策略属于 Assets/browser app 的运行职责，不是 `paginateBook` 的 API 保证。

- 正文调度最多 3000 步；
- 如果仍有未消费元素，抛 Error('Pagination work budget exceeded: 3000 steps')，不返回截断页面作为成功。余量重新入队也计入预算；
- 预算不限制所有 HTML 解析或单次拆分的耗时。调用者按失败路径处理，并在重试前确认内容和测量条件。

- 跨移动断点 500ms 防抖后整页重载；
- 同模式内没有保证字体/图片完成后自动重排。构建通过和 JSDOM 有 CSS 都不能证明终端高度正确。原始 HTML 无安全消毒，凭据与非 JSON 对象不得进入载荷；
- 提交或部署失败不属于本契约。

## 兼容与示例

独立来源可从公共 API 组合，无需导入 Site：

```sh
node --input-type=module <<'JS'
import { readFile } from 'node:fs/promises';
import { buildBook } from '@myblog/book-build';
const config = JSON.parse(
  await readFile('packages/site/src/data/book-config.json', 'utf8'),
);
const document = {
  id: 'demo',
  title: '独立书',
  tocTitle: '目录',
  entries: [{ id: 'one', collection: 'json', title: '第一篇', date: new Date('2026-10-01T00:00:00Z'), body: '正文', bodyType: 'markdown', metadata: {} }],
};
const result = buildBook({ document, config });
if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
console.log(result.value.articles[0].source.id); // one
JS
```

在 blog 根执行，预期输出 one，无网络或写盘。Astro 组合由 Site 导入主题 CSS 并调用 Book Build 的 `createBookTheme()`，再渲染 BookShell 和 Runtime Assets；普通 Node 调用不导入 Astro 组件或 Runtime 浏览器 API。

字段、DOM 标识或资源顺序变更必须同步生产者、Site 组合、Runtime 消费者与测试。模块内部搬迁不提供旧路径转发；调用方迁往 api。新增来源先验证正常、非法、缺省、顺序与身份，再验序列化、测量及导航，不把来源判断写进分页器。

## 验证与关联

- [Book API](../../packages/book-build/docs/reference/api.md)、[Runtime API](../../packages/book-runtime/docs/reference/api.md)、[Site API](../../packages/site/docs/reference/api.md) 是两端与组合的权威细节。tests/integration/book-runtime-boundary.test.mjs 和 book-architecture 核对来源、载荷、资源与依赖；
- json-book-source 和 book-runtime 核对模型、派生字段；
- pagination-behavior E2E 核对指定尺寸下的正文高度和文本保留，不验证所有导航；
- runtime-lifecycle 核对缓存重入、reset、测量异常清理及预算失败。

验收分别记录模型/配置错误、生成载荷、测量 CSS、缓存映射、插件挂载与目标页。有限测试不证明全部富文本、终端资源状态或真实 iOS；技术事实和读者任务仍需人工审查。
