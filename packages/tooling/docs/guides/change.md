---
id: 'tooling-docs-guides-change'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: 'tooling'
owner: 'tooling 维护者'
parent: 'packages/tooling/README.md'
related:
  - 'packages/tooling/docs/explanation/design.md'
  - 'packages/tooling/docs/reference/api.md'
---

# 修改工程约束与生成来源

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

用于修改模块清单、静态规则、文档契约、生成模板及工程 CLI。先说明需要阻止的具体漂移和合法对照；业务功能及生产部署按所属模块指南处理。

规则改变可能影响全仓。修改责任人必须同时说明会接受哪些输入、拒绝哪些输入，以及现有资料需要怎样迁移。

## 前置条件

在 blog 根执行命令，Node 满足 package.json engines，依赖来自锁文件。先查看 git status 与相关差异，记录已有修改；提交哈希不能恢复未提交或未跟踪文件，因此不能单独作为备份。

保存本次将编辑文件的原始内容或可复核补丁，并确认生成目标是否已有用户修改。规则变更先建立失败反例和合法对照，不用放宽断言取得通过。

## 输入与配置

| 变更           | 权威路径（blog 根相对）                         | 影响与验证                                   |
| -------------- | ----------------------------------------------- | -------------------------------------------- |
| 模块归属与依赖 | packages/tooling/src/modules.json               | 公开入口、拥有范围、依赖环；清单及边界测试   |
| 导入与链接规则 | packages/tooling/src/internal/checks.mjs        | TypeScript AST、相对路径与有限 Markdown 语法 |
| 元数据与章节   | packages/tooling/src/internal/documents.mjs     | 文档类型、目录归属、风险示例与全仓迁移       |
| 配置派生       | packages/tooling/src/cli/generate-reference.mjs | 两份参考及首页 Schema，来源与漂移同步        |
| 仓库扫描       | packages/tooling/src/cli/verify.mjs             | 真实扫描范围、聚合诊断和异常退出             |

跨模块调用由 api/index.mjs 和清单 entries 契约约束。禁止将私有入口登记到公开清单，或扩大 owns 吞并其他模块。生成参考的字段事实来自 Book Schema、Site API 与配置；表格渲染在 checks.mjs。

## 操作步骤

1. 记录当前失败证据，选择受影响测试，新增能区分原行为与目标行为的反例和合法对照。
2. 在负责规则的实现位置修改，同步调用者、文档章节、规范和诊断说明。
3. 来源或生成模板改变时先检查派生差异；确认目标无待保留修改后才执行写入生成，再核对目标文件。
4. 仅格式化本次修改文件，运行局部测试与受影响扫描；交付前执行完整工程门禁。

在 blog 根执行对应检查：

```sh
node --test tests/integration/engineering-system.test.mjs packages/tooling/tests/engineering-boundaries.test.mjs packages/tooling/tests/document-contract.test.mjs
npm run check:docs
npm run check:boundaries
node packages/tooling/src/cli/generate-reference.mjs --check
npm run verify
```

若来源有意改变，审查生成器的 --patch 输出或运行 npm run docs:generate，并复核生成目标；--check 不写目标。完整门禁以 package.json 的当前脚本为准，不固定测试数量或耗时。

## 结果核对

断言需同时拒绝新增违规和接受合法对照，诊断应指向实际问题文件。扫描通过只说明当前覆盖规则；不能宣称所有未来输入没有误报。

记录命令、环境、退出码和未执行阶段。生成比对通过表示当前文本一致，不代表字段说明和业务默认值正确；人工核对来源及调用者语义。

## 失败与恢复

先保存首个失败输出及相关差异，区分规则、输入、环境与业务实现问题。误报先缩成合法对照再修正规则，不直接添加宽泛白名单。生成中断可能留下部分更新，逐目标检查，不默认重跑覆盖用户修改。

恢复时对照任务开始保存的文件内容或补丁，仅撤销本次明确行段。未跟踪文件只处理本次新建且已确认无他人内容的具体文件；已有用户修改保留。需要恢复生成目标时，先恢复本次来源变化，再核对目标差异，决定局部修正或重新生成。

不要按目录批量撤销或清理。documentErrors 会拒绝可执行 sh/bash/shell 围栏中的危险 Git 恢复模式和旧清单路径；检测是风险筛查，不能替代工作树核对或 shell 安全审查。不得删除测试、放宽断言或扩大排除范围。

## 关联资料

[设计](../explanation/design.md)、[接口](../reference/api.md)、[测试方案](../testing/strategy.md)、[文档规范](../../../../docs/standards/documentation.md) 和 [贡献指南](../../../../docs/guides/contributing.md) 分别给出责任、契约、证据及跨模块步骤。
