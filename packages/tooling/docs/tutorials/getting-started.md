---
id: 'tooling-docs-tutorials-getting-started'
type: 'tutorial'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'tooling'
owner: 'Tooling 维护者'
parent: 'packages/tooling/README.md'
related:
  - 'packages/tooling/docs/reference/api.md'
  - 'packages/tooling/docs/algorithms/module-dependencies.md'
---

# 用统一入口检查仓库文档

目录：

- [学习目标](#学习目标)
- [准备环境](#准备环境)
- [练习输入](#练习输入)
- [练习步骤](#练习步骤)
- [预期结果](#预期结果)
- [排错与清理](#排错与清理)
- [后续阅读](#后续阅读)

## 学习目标

完成本教程后，读者可以从 Tooling 包根启动只读文档检查，读取统一状态和诊断，并区分检查任务与写入型参考生成任务。

`inspectRepository` 是脚本使用的默认入口。它封装子进程启动和报告收集；调用者不需要加载模块清单、逐一调用链接/元数据检查器，再自行汇总结果。底层检查器仅供 Tooling 自身和对应单元测试使用。

## 准备环境

在 `blog/` 根目录执行，Node.js 为 22.13+ 或 24+，并已运行 `npm ci`。检查仅读取受管源码、文档及配置；不需要网络、凭据或服务器权限。

## 练习输入

本练习指定 `mode: 'docs'`，检查根目录当前文档、模块文档、元数据、链接和生成参考是否匹配。它不会执行边界检查、Astro 构建、测试或写文件。

故障路径使用不支持的 mode。该输入应在启动子进程前返回结构化失败报告，不应抛出，也不应修改文件。

## 练习步骤

1. 在 `blog/` 根运行：

   ```sh
   node --input-type=module <<'JS'
   import assert from 'node:assert/strict';
   import { inspectRepository } from '@myblog/tooling';

   const report = inspectRepository({ mode: 'docs' });
   console.log(report.stdout.trim());
   if (!report.ok) console.error(report.diagnostics.join('\n'));
   assert.equal(report.mode, 'docs');
   assert.equal(report.ok, true);

   const invalid = inspectRepository({ mode: 'unknown' });
   assert.equal(invalid.ok, false);
   assert.match(invalid.diagnostics[0], /Unsupported inspection mode/);
   console.log('success and invalid-mode results verified');
   JS
   ```

2. 观察成功结果中的 `ok: true` 和标准输出，再观察非法 mode 的诊断。`stdout` 是给人查看的 CLI 文本；脚本只用 `ok` 与 `mode` 做状态判断。

3. 用仓库标准命令复核：

   ```sh
   npm run check:docs
   ```

4. 如需更新生成参考，另行执行 `npm run docs:generate` 并审查 Git 差异。该命令会写入派生文件，不属于本教程的只读检查。

## 预期结果

当当前资料合规时，第一次调用返回 `ok: true`，stdout 包含 `Engineering docs checks passed`；第二次调用返回 `ok: false` 和一条 unsupported-mode 诊断。标准命令退出码为 0。

失败的文档检查返回非空 diagnostics。不要通过解析 stderr 文案推导机器状态，也不要把 `mode: 'docs'` 的通过当作源码边界或运行测试通过。

## 排错与清理

- 若 `@myblog/tooling` 无法解析，确认在仓库根执行且 workspace 依赖已安装。
- 若检查报告配置生成物过期，先运行 `npm run docs:generate`，审查改动后重新检查；不要手工修改生成目标来掩盖来源漂移。
- 若传入的 root 不是仓库，子进程将返回失败报告。Tooling 不会创建目录、恢复工作树或删除任何文件。
- 本教程不创建持久数据，无需清理。

## 后续阅读

- [API 参考](../reference/api.md)：`inspectRepository` 的字段和诊断契约。
- [模块依赖算法](../algorithms/module-dependencies.md)：边界扫描的路径规则和限制。
- [模块设计](../explanation/design.md)：检查器与 CLI 的职责划分。
- [变更指南](../guides/change.md)：修改检查规则时的回归要求。
