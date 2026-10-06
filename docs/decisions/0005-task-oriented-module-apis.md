---
id: 'decision-task-oriented-module-apis'
type: 'decision'
status: 'active'
created: '2026-10-05'
modified: '2026-10-06'
scope: '六个私有 workspace 包的 API、协作和版本'
owner: '项目维护者'
parent: 'docs/decisions/README.md'
related:
  - 'packages/README.md'
  - 'packages/tooling/src/modules.json'
  - 'docs/changes/2026-10-06-independent-workspace-packages/plan.md'
  - 'docs/changes/2026-10-06-independent-workspace-packages/completion.md'
---

# ADR 0005：任务级接口与独立版本 workspace

目录：

- [背景](#背景)
- [备选方案](#备选方案)
- [决定](#决定)
- [后果](#后果)
- [再评估条件](#再评估条件)

## 背景

六模块原来以源码路径互相调用。调用方需要了解配置、内容适配、分页缓存和插件启动顺序；模块迁移后，路径封装仍不足以消除浏览器全局变量越界。

用户要求六个私有 npm workspace 包、独立版本、简单任务接口、明确输入输出。当前决定取代本 ADR 早期的 V1 DTO、RuntimeHandle 和宿主子路径提案；历史实施步骤保留在变更计划，不能用那些签名调用当前包。

## 备选方案

| 方案                           | 后果                              | 结论                |
| ------------------------------ | --------------------------------- | ------------------- |
| 六独立仓库                     | 协同改动需要跨仓库版本与集成      | 当前不需要          |
| 单一包和版本                   | 无独立契约与演进边界              | 不采用              |
| 六私有 workspace、根任务入口   | 独立版本，共享安装和集成验收      | 采用                |
| Runtime 同时提供分页和插件挂载 | 要增加公开接口或混合 DOM 生命周期 | 不采用；插件归 Site |

## 决定

### 包边界与输入输出

每包只开放 package root `.`。默认任务是一个函数；确有独立消费任务的辅助函数从同一根导出，不用 kind 分支隐藏不同领域。当前不是“六包都只导出一个函数”。

| 包           | 公开函数              | 输入                            | 输出与副作用                                            |
| ------------ | --------------------- | ------------------------------- | ------------------------------------------------------- |
| Site         | buildHomepageModel    | 集合、Book 配置、主题、可选引语 | 页面模型或诊断；不读集合、不请求引语上游                |
| Site         | inspectHomepageConfig | 传统首页配置                    | Schema 与校验结果                                       |
| Book Build   | buildBook             | BookDocument、BookConfig        | HTML/目录/运行配置或诊断；图片尺寸处理可能读本地 public |
| Book Build   | renderArticle         | Markdown、标题                  | HTML；受信内容、不净化                                  |
| Book Build   | createBookTheme       | 主题 ID、CSS 字符串             | 显示与测量样式；不读主题文件                            |
| Book Runtime | paginateBook          | 浏览器载荷、已就绪 DOM/样式     | 页数组、物理起页、双向映射或诊断；同步测量 DOM          |
| Publishing   | startServer           | 环境变量                        | HTTP server；显式监听，HTTP 处理可能写 GitHub           |
| Operations   | runHealthChecks       | 默认授权 Linux 环境             | Promise 健康报告；执行 shell/HTTP 探针，不修复服务      |
| Tooling      | inspectRepository     | 可选仓库 root、mode             | 同步检查报告；读取指定仓库、启动检查子进程              |

详细字段、缺省值、失败和限制以各包 API 参考及声明为准。六包均交付类型声明；声明编译与运行行为是不同证据。

### 协作与所有权

```text
Astro 集合/JSON --Site 适配--> BookDocument
                                   |
                                   v buildBook
                              Book Build
                                   |
                                   v HTML + 配置
Site 书壳/资源 --> paginateBook --> Book Runtime
                                   |
                                   v 页数组 + 导航映射
                         Site TurnAdapter --> Turn.js

客户端 --HTTP/JSON--> Publishing --GitHub API--> 内容 ref
内容 ref --CI--> Tooling 门禁 + Site 构建 --> 静态部署
Operations --shell/HTTP 只读探针--> 已部署服务
```

Site 拥有主题文件、Astro 组件、启动、插件适配和光标。Runtime 拥有分页、目录校准与映射；Site 不读取其内部缓存。源码跨包导入使用包名；浏览器仅可从 Runtime 的 API 命名空间调用分页。AST 门禁检查显式点属性与字符串下标，不宣称能分析所有动态别名。

### 函数与失败

函数式风格用于明确的数据任务，不把 DOM、网络和文件操作伪称纯函数。BookDocument 仍含 Date，部分输出共享输入引用；只有浏览器交接经过 JSON/HTML 序列化。Build 渲染本地图片可能读取文件，Runtime 配置仍是共享状态，不支持并发会话隔离。

Build、Site、Runtime 用 ok 判别结果；Publishing 同步返回 server，监听错误通过事件报告；Operations 返回 Promise 报告，意外 runner/validator 错误拒绝；Tooling 返回字符串诊断和原始进程输出。六包不强行套同一个异常包装。

Runtime 每次调用选择当前测量 CSS，空字符串可以清空旧值。目录校准不收敛必须失败，不提交错误导航。Publishing HTTP 200 仅证明内容 ref 更新，不证明部署；响应丢失不能自动重试。

### 版本与验收

包均 private，各自维护 version；Changesets 配置 privatePackages.version=true、tag=false，fixed/linked 为空。版本更新同步消费者精确依赖及锁文件。未配置 publish；不生成 registry tag。工具行为参考 [Changesets 配置](https://changesets.dev/guide/config)。

根 verify 执行结构、类型、构建和 Node；verify:release 再执行六包 tarball 隔离安装/类型编译与 Chromium。实际打包而非仅 dry-run；隔离安装禁 lifecycle scripts，允许从 npm 取得缺失依赖；服务包只导入，不执行生产任务。包根封装由 [Node exports](https://nodejs.org/api/packages.html#package-entry-points) 约束，不是安全沙箱。

## 后果

- 迁移接口时一起改调用方、类型、文档和测试，不维护旧子路径转发层。
- 插件交互变更归 Site；分页变更归 Runtime；跨包行为由集成/E2E 验证。
- 私有版本可以不同；版本联动测试必须验证生产者与消费者的实际变更。
- 打包安装通过不证明生产部署，也不证明 Safari 真机或所有富文本分页。
- 独立新读者任务需实际参与者记录，不由自动绿灯或熟悉源码者自查替代。

## 再评估条件

出现第二个非 Site 阅读器宿主、多会话隔离需求、外部包发布或版本化跨进程协议需求时，重新评估适配器位置、载荷校验和版本兼容；不为潜在用途提前增加公开入口。
