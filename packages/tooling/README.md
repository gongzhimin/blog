---
id: 'tooling-readme'
type: 'readme'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'tooling'
owner: 'tooling 维护者'
parent: 'packages/README.md'
related:
  - 'packages/README.md'
  - 'packages/tooling/docs/explanation/design.md'
---

# Tooling

目录：

- [用途与边界](#用途与边界)
- [能力与限制](#能力与限制)
- [内部结构](#内部结构)
- [依赖与数据流](#依赖与数据流)
- [主要接口](#主要接口)
- [最小使用示例](#最小使用示例)
- [配置](#配置)
- [测试与验证](#测试与验证)
- [文档导航](#文档导航)

## 用途与边界

Tooling 把模块清单、当前文档及配置参考的一致性要求转为本地与 CI 可重复执行的检查。输入为源码、模块清单、当前 Markdown、Schema 和配置；输出为错误列表、进程退出码或生成文件。不服务页面，不替代业务测试、设计审查和真实部署验收。

## 能力与限制

检查静态模块依赖、入口归属、依赖环、文档链接和生成参考漂移。边界分析不是运行时沙箱：外部包名交给安装锁文件，项目别名明确拒绝，相对路径不补扩展名，Astro 块使用正则提取。链接检查不是完整 Markdown 解析器，也不验证外链或页内锚点。

检查通过仍需核对接口语义、文档技术事实和读者能否完成任务。

## 内部结构

```text
packages/tooling/
+-- src/
|   +-- modules.json          模块归属权威清单
|   +-- api/index.mjs         只读检查任务（启动子进程）
|   +-- api/index.d.ts        检查输入与报告
|   +-- internal/
|   |   +-- checks.mjs        导入、全局边界与链接
|   |   +-- documents.mjs     文档契约
|   |   +-- testing.mjs       测试盘点与摘要判据
|   |   +-- strict-browser-reporter.mjs  浏览器退出门禁
|   +-- cli/
|   |   +-- verify.mjs        文件扫描与诊断
|   |   +-- generate-reference.mjs  参考生成
|   |   +-- test.mjs          Node 执行与零跳过门禁
|   |   +-- packages.mjs      tarball 消费与类型验收
|   +-- config/               ESLint、Playwright、契约 TS
+-- tests/                    规则、版本联动及消费夹具
+-- docs/                     设计、算法、API 与测试
```

`packages/site/src/cli/update-daily-quote.mjs` 归 Site 管理，调用包内引语服务并更新快照，不属于边界检查 CLI，也不是 Site 包根导出。跨模块工程场景和真实生成来源的回归位于根 `tests/integration/`。

## 依赖与数据流

```text
Caller --> inspectRepository API --> verify CLI --> internal checks
                                              |           |
                                              +-- report/exit status
Site API + Book API + Config --> generator --> references + schema
```

模块清单允许 Tooling 依赖 Site 与 Book Build 的公开入口。反向业务依赖不因此成立。TypeScript 提供语法树，Prettier 提供确定的派生产物排版；依赖版本以锁文件为准。

## 主要接口

| 入口                                | 输入                     | 输出 / 副作用            |
| ----------------------------------- | ------------------------ | ------------------------ |
| `check:boundaries`                  | 模块清单与源码           | 成功 0；错误 1；不改源码 |
| `check:docs`                        | 当前资料、配置、生成结果 | 成功 0；错误 1；不写目标 |
| `docs:generate`                     | Schema、说明与当前配置   | 写生成目标               |
| `inspectRepository({ root, mode })` | 仓库目录、检查范围       | 统一报告；只读子进程     |

更多参数和生成目标见 [接口参考](docs/reference/api.md)。CLI 的未知参数行为不是受支持接口，不要依赖其偶然结果。

## 最小使用示例

在已安装依赖的仓库根检查当前文档，不修改真实模块：

```sh
node --input-type=module <<'JS'
import { inspectRepository } from '@myblog/tooling';
const report = inspectRepository({ mode: 'docs' });
console.log(report.stdout.trim());
if (!report.ok) {
  console.error(report.diagnostics.join('\n'));
  process.exitCode = 1;
}
JS
```

成功时输出 `Engineering docs checks passed`。CI 和开发工作流优先使用 `npm run check:docs`、`npm run check:boundaries` 或 `npm run verify`，它们提供标准退出码。

## 配置

[`packages/tooling/src/modules.json`](src/modules.json) 声明 id、root、owns、dependencies、entries、tests、applicationEntries。

跨模块新增调用同时登记允许边及公开入口，不能通过扩大 owns 或删除断言掩盖违规。

配置参考从 Book Schema、Site 字段契约、说明和 JSON 快照生成，不手改派生产物；改变来源后执行 `npm run docs:generate` 并审查差异。

## 测试与验证

```sh
node --test tests/integration/engineering-system.test.mjs
npm run check:boundaries
npm run check:docs
npm run check:tests
```

单元测试制造非法依赖、环、链接及生成约束；workspace-scan 在临时真实布局注入违规文档和依赖，test-policy 校验递归盘点与 Node/浏览器运行结果。check:tests 拒绝漏登记、缺文件、禁用标记和不支持的测试路径。全项目验证运行 `npm run verify`。测试通过只证明被覆盖的规则，未解析的导入形式和技术事实仍需人工审查。详细边界见 [测试方案](docs/testing/strategy.md)。

## 文档导航

- [六包协作总览](../README.md)：Tooling 检查哪些包，以及它与运行时 Operations 的区别。

- [模块设计](docs/explanation/design.md)、[依赖分析算法](docs/algorithms/module-dependencies.md)。
- [接口参考](docs/reference/api.md)、[测试方案](docs/testing/strategy.md)。
- [受控失败练习](docs/tutorials/getting-started.md)、[变更指南](docs/guides/change.md)。
- [文档索引](docs/README.md)、[全局文档规范](../../docs/standards/documentation.md)。
