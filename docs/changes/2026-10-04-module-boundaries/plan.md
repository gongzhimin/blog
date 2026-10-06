---
id: 'module-boundaries-plan'
type: 'record'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: '源码物理模块、公开 API 与设计资料'
owner: '项目维护者'
parent: 'docs/changes/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/tooling/src/modules.json'
---

# 模块边界重构实施计划

目录：

- [范围](#范围)
- [实施记录](#实施记录)
- [验证证据](#验证证据)
- [剩余限制](#剩余限制)

## 范围

按用户批准的结构重构，不以旧路径、命令或资源地址为约束。删除导航占位文档和废弃转发实现，同步所有消费者。文章和图片原件不得丢失；现有业务语义作为重构基线，不添加生产发布、提交或外部写入。

目标组织：

```text
src/site/             Astro 应用，srcDir 指向此处
src/book/             公开 api/、私有 internal/、模块 docs/
src/book-runtime/     浏览器公开组件与入口、私有实现、docs/
src/publishing/       HTTP、规划、转换和 Git transport，api/ + internal/
src/operations/       探针定义、执行汇总与报告，api/ + internal/
src/engineering/  工程工具；其公开 API 同样在 api/
scripts/              真正的 CLI 入口，不保留旧入口转发
public/               静态资源；不保存自研模块源文件和模块文档
```

每模块固定 README.md、docs/README.md、explanation/design.md、algorithms/、reference/api.md、tutorials/getting-started.md、guides/change.md、testing/strategy.md。

跨模块 import 只进入登记的 api/ 文件，模型类型也从公开入口引用。

## 实施记录

### 任务 1：建立结构反例与公开接口

- [x] 添加 tests/integration/module-layout.test.mjs：断言 Astro srcDir、五个源码模块及六套文档；拒绝 src 根散落页面、旧 shims、redirect 文档、Mermaid 和跨模块私有入口。
- [x] 先运行 node --test tests/integration/module-layout.test.mjs，观察断言失败；保留原行为测试的断言，仅改变其新 API 和源码位置。
- [x] Book 迁移实现到 internal/，api/index.mjs 汇集运行函数，api/types.mjs 提供权威模型类型，BookShell.astro 作为公开组件；Site 引用公开入口，页面完整收进 src/site。
- [x] 配置与内容迁入 Site 范围，统一修改 loaders、发布规划、引用、生成器、daily quote 和流水线路径；不留下原路径转发。

### 任务 2：服务责任分离

- [x] Publishing 先建立 api/index.cjs 的行为回归，再拆转换、文件计划、GitHub transport 和 HTTP 生命周期至 src/publishing/internal。
- [x] Operations 先保留七项探针、重试与汇总断言，再迁入 src/operations/api 与 internal。
- [x] 新 CLI src/publishing/cli/publish.cjs 和 src/operations/cli/health.cjs 调用唯一 API；删除旧 webhook-receiver/server-health-check 入口及 scripts 下旧模块。
- [x] 更新 service、部署 source/install 列表及恢复手册；不执行真实服务器命令。

### 任务 3：浏览器模块源与交付分离

- [x] 将 public/book-runtime 的自研实现及资料迁至 src/book-runtime/api、internal 和 docs，移除 public 旧源。
- [x] 公开 Assets.astro、Cursor.astro 与有顺序的运行入口；Site 组合 Runtime，Book Shell 只输出载荷与书壳。
- [x] 浏览器脚本通过构建产生资源，公开组件负责加载；保留分页及交互行为断言，不保留旧资源副本。
- [x] 先局部 Node 回归，集成构建后运行 Chromium 分页、翻页、触摸和窄屏验证。

### 任务 4：文档契约与工具

- [x] 删除九个 redirect 文件，更新当前引用和原读取旧导航的测试；历史原件只用于历史。
- [x] 文档规范取消重定向和 Mermaid；固定各类型章节、目录、元数据、API 签名/条件/错误/副作用要求。
- [x] 工程工具 api/index.mjs 汇集纯检查函数；脚本是 CLI，内部 helper 不登记为公共入口。
- [x] 为模块目录、API 文档、公开入口、图格式及元数据关系增添反例；更新 manifest 和生成参考来源。
- [x] 用 ASCII 框图/时序图重写系统上下文、模块依赖、部署与各模块设计，从责任与不变量推导方案，不以源码遍历为主线。

## 验证证据

基线执行 npm run test:node。集成执行 npm run docs:generate、npm run verify、npm run test:e2e；另实际运行公开 API 的离线例子。

结构测试必须证明旧源、旧入口、旧导航不存在，新 API 可调用。审查分规格覆盖与代码质量两阶段，最后核对文档与公开导出一致。

## 剩余限制

服务网络与健康探针用替身测试，构建与浏览器使用本地环境。开发依赖升级、安全审计和真实上线不属于本任务。已有未提交工作保持原地，不从 HEAD 覆盖它们。实施中若要改变业务输入或错误协议，先写具体行为回归，不把重构当成新行为授权。
