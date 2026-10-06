---
id: 'tooling-docs-reference-api'
type: 'interface'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'tooling'
owner: 'Tooling 维护者'
parent: 'packages/tooling/README.md'
related:
  - 'packages/tooling/src/api/index.mjs'
  - 'packages/tooling/src/cli/verify.mjs'
---

# Tooling API 参考

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

包根面向脚本或 CI 提供一个常见任务：检查一个仓库的工程、文档和模块边界，并返回统一报告。生成配置参考是独立写入任务，通过仓库 CLI `npm run docs:generate` 执行，不与只读检查混在一次 API 调用中。

```js
import { inspectRepository } from '@myblog/tooling';
```

## 接口清单

`@myblog/tooling` 包根仅导出 `inspectRepository(input?)`。模块图、文档元数据、链接及参考生成器是内部实现，不是调用者需要按步骤编排的 API。CLI 面向人类输出格式化文本并设置退出码；函数 API 返回报告对象。

## 输入与配置

### `inspectRepository(input?)`

**签名**：`inspectRepository(input?: InspectRepositoryInput): InspectRepositoryReport`

调用是同步的，因为它只启动一个本地检查子进程；它不会访问网络，也不会修改仓库文件。

| 字段   | 类型                              | 必填 | 默认值          | 约束与作用                             |
| ------ | --------------------------------- | ---- | --------------- | -------------------------------------- |
| `root` | `string`                          | 否   | `process.cwd()` | 要检查的仓库根目录；作为子进程工作目录 |
| `mode` | `'all' \| 'docs' \| 'boundaries'` | 否   | `'all'`         | 选择全部检查、文档检查或源码边界检查   |

不接受任意命令、脚本路径或检查函数。配置参考生成需写文件，使用 CLI 而不是此 API。

## 输出与副作用

返回 `InspectRepositoryReport`：

| 字段          | 类型       | 含义                                         |
| ------------- | ---------- | -------------------------------------------- |
| `ok`          | `boolean`  | 子进程退出码为 0 时为 `true`；表示检查通过   |
| `mode`        | `string`   | 本次请求的检查范围                           |
| `diagnostics` | `string[]` | 子进程标准错误按行拆分的诊断；成功时通常为空 |
| `stdout`      | `string`   | CLI 标准输出原文，保留其结尾换行             |
| `stderr`      | `string`   | CLI 标准错误原文                             |

该函数启动当前包内的 `verify.mjs` 子进程，并以 `root` 为工作目录。子进程从目标 root 读取模块清单和 package manifests，扫描真实 packages 源码及当前工程文档，排除 Site 文章内容与历史资料；检查流程不写文件。输出字段是便于脚本显示/记录的 CLI 文本，不是稳定的机器诊断协议。机器程序应以 `ok` 和 `mode` 判定，不解析 `stdout`。

## 错误与边界

- 不支持的 `mode` 不启动子进程，返回 `ok: false` 和一条诊断。
- 检查发现问题时不抛异常，返回 `ok: false`、非空 `diagnostics` 与原始 stderr。
- 若 Node 子进程无法启动，将启动错误加入 `diagnostics`；子进程非零退出但没有 stderr 时，生成退出状态诊断。
- `root` 不存在或不是仓库时，检查子进程会返回失败报告；不会自动创建或修复目录。
- 该 API 不运行 build、test、部署或生产探针。`mode: 'all'` 指 Tooling 定义的源码/文档静态检查，不等于根目录 `npm run verify` 的所有阶段。
- `spawnSync` 受当前进程权限和操作系统资源限制；子进程当前没有独立超时参数。

## 兼容与示例

以下示例在 blog 根运行。它读取当前仓库，仅输出检查状态，不改文件：

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { inspectRepository } from '@myblog/tooling';

const report = inspectRepository({ mode: 'docs' });
console.log(report.stdout.trim());
if (!report.ok) {
  console.error(report.diagnostics.join('\n'));
  process.exitCode = 1;
}
assert.equal(report.mode, 'docs');
JS
```

预期 stdout 包含 `Engineering docs checks passed` 且 `ok === true`。要生成配置参考，显式运行 `npm run docs:generate`；该命令会写入派生文件。

## 验证与关联

```sh
node --test packages/tooling/tests/public-api.test.mjs
npm run --workspace @myblog/tooling test
npm run check:docs
```

公共入口测试检查导出集合和失败报告；模块测试覆盖底层规则。完整检查顺序与写入型生成命令见 [Tooling README](../../README.md) 和 [变更指南](../guides/change.md)。
