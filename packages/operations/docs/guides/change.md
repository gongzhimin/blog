---
id: 'operations-docs-guides-change'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'operations'
owner: 'operations 维护者'
parent: 'packages/operations/README.md'
related:
  - 'packages/operations/docs/explanation/design.md'
  - 'packages/operations/docs/reference/api.md'
---

# 修改健康检查与服务契约

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

本指南用于规范修改运维巡检模块（`packages/operations`）时的工程步骤、服务契约联动与紧急回退操作。
适用修改场景包括：

1. 增加或调整生产环境默认健康巡检探针（`internal/probes.cjs`）；
2. 优化命令执行调度器、重试延迟策略或异常捕获逻辑（`internal/execution.cjs`）；
3. 改进控制台巡检报告文本输出（`internal/report.cjs`）；
4. 调整 Systemd 服务模板、Nginx 反向代理配置或 Webhook 环境变量声明（`server-runtime/`）。

**非适用范围**：

- 在探针中引入具有写盘、服务重启或自动数据库迁移等副作用的主动运维动作；
- 修改移动端文章发布规划或 GitHub API 提交逻辑（属于 `packages/publishing` 职责）。

## 前置条件

在实施代码或配置修改前，必须确认并满足以下条件：

1. **工作目录**：所有验证命令必须在项目根目录（`blog/`）下执行；
2. **环境与依赖**：Node.js 版本满足 22 LTS（>=22.13.0）或 24+，且已运行 `npm ci`；
3. **工作树基线与备份点**：
   - 执行 `git status -s` 检查工作区状态，确认并保留已有修改；
   - 记录当前提交哈希 `git rev-parse HEAD` 用于比较已提交基线；另行保存未提交差异；
4. **安全红线**：修改探针命令时，严禁使用任何 `cat /etc/nginx/...` 或直接输出 `.env` 敏感凭据内容的探测命令，防止将机密 Token 输出至 CI/CD 控制台日志。

## 输入与配置

实施修改时，开发人员必须严格对照各子模块的修改风险矩阵与契约约束：

| 修改范畴       | 涉及源码路径             | 核心契约与原则                                                         | 联动风险与向下游传播影响                 | 验证与防范策略                                          |
| -------------- | ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| 探针定义与规则 | `internal/probes.cjs`    | 保持只读原则，明确单项探针成功条件与重试预算                           | 探针过于严苛将导致正常发布被误拦截       | 必须覆盖命令返回非 0 与自定义 `validate` 失败分支       |
| 执行调度引擎   | `internal/execution.cjs` | 保证顺序执行，普通非零退出继续后续项；runner/validate 抛错拒绝 Promise | 异常吞没将导致整个巡检进程静默假死       | 验证 `runner` 抛出致命异常时的 Promise 拒绝处理         |
| 终端报告渲染   | `internal/report.cjs`    | 结构化输出 `PASS`/`FAIL`，仅保留最新一次失败的 stderr                  | 错误信息过长会导致控制台刷屏             | 核对 stderr/stdout/退出码回退；当前报告不截断或自动脱敏 |
| 服务契约与模板 | `server-runtime/`        | 核对 GitHub Actions 工作流中的服务名与路径                             | 服务名或端口修改将破坏生产部署与健康检查 | 同步更新 CI 脚本与生产恢复手册中的引用                  |

## 操作步骤

### 步骤 1：确立基线与缺陷复现（只读分析）

在修改探针或调度逻辑前，先运行现有测试套件确认行为基准：

```sh
# 运行 Operations 模块核心单元测试
node --test packages/operations/tests/server-health-check.test.mjs
```

### 步骤 2：实施代码与配置修改（写入修改）

1. **核心逻辑编写**：在 `packages/operations/src/internal/` 对应子模块中实施改动；
2. **公共入口维护**：若调整了函数签名或新增公开方法，必须在 `packages/operations/src/api/index.cjs` 登记公开导出；顶层 `packages/operations/src/cli/health.cjs` 仅调用 CLI 所需 API；
3. **部署模板联动**：若修改了探针依赖的端口或服务名，同步更新 `server-runtime/` 下的示例服务定义。

### 步骤 3：模块级单元测试与工程门禁验证

实施修改后，依次执行离线测试与全工程门禁校验：

```sh
# 1. 运行核心单元测试（验证探针清单与重试逻辑）
node --test packages/operations/tests/server-health-check.test.mjs

# 2. 运行服务公共接口契约测试
node --test tests/integration/service-api.test.cjs

# 3. 运行全工程统一门禁（格式化、Lint、类型、边界及文档检查）
npm run verify
```

## 结果核对

完成操作后，按照以下清单逐项验收：

1. **命令退出码**：所有测试与工程检查命令退出码必须为 0；
2. **探针清单完整**：确认默认导出的健康探针清单包含预期的检查项，且顺序符合设计定义；
3. **敏感凭据脱敏**：确认探针命令未包含直接读取或打印敏感 Token 的指令；
4. **错误留存准确**：确认模拟失败场景下，报告中能够准确携带该项的 `stderr` 输出。

## 失败与恢复

若在任何验证阶段发生失败，按以下流程实施排查与紧急恢复：

1. **探针断言失败**：检查新增探针的命令语法是否符合 Bash 标准规范，确认其在目标系统上能以退出码 0 表示就绪；
2. **重试超时假死**：检查是否在重试逻辑中误写了死循环，确认每次重试均有递减的计数器与固定延迟；
3. **局部恢复**：先用 `git status -s` 和目标文件的 `git diff -- <具体文件>` 核对归属与差异。保存本次修改前的文件或补丁，按文件逐段撤销本次新增的改动，保留此前未提交内容。新文件先核对是否仅由本任务创建，并移出工作树保存；不要批量清理整个模块。恢复后重新检查差异并运行受影响测试。
4. 不删除测试或放宽安全断言来取得通过。远端提交、服务配置恢复和重启需要明确目标及相应授权；本地代码恢复不会撤销 GitHub 上的文章提交。

## 关联资料

- [模块设计说明](../explanation/design.md)：系统架构与重试控制机制；
- [公共接口参考](../reference/api.md)：查看 `runHealthChecks` 完整参数契约；
- [模块测试方案](../testing/strategy.md)：查阅自动化测试与覆盖矩阵；
- [全局部署指南](../../../../docs/operations/deployment.md)：了解生产环境服务部署与恢复。
