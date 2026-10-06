---
id: 'scripts-publishing-docs-guides-change'
type: 'guide'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: 'publishing'
owner: 'Publishing 模块维护者'
parent: 'packages/publishing/README.md'
related:
  - 'docs/standards/documentation.md'
  - 'packages/publishing/docs/reference/api.md'
---

# 修改 Publishing 的风险与流程

目录：

- [目标与适用条件](#目标与适用条件)
- [前置条件](#前置条件)
- [输入与配置](#输入与配置)
- [操作步骤](#操作步骤)
- [结果核对](#结果核对)
- [失败与恢复](#失败与恢复)
- [关联资料](#关联资料)

## 目标与适用条件

本指南用于规范修改移动发布与内容推送模块（`packages/publishing`）时的工程步骤、跨系统联动风险评估与紧急回退操作。
适用修改场景包括：

1. 优化或调整客户端文本解析、硬换行规则或图片占位符匹配逻辑（`internal/input.cjs`）；
2. 修改基于标题的历史文稿去重规则、同名文稿覆盖策略或文件名 Slug 生成规则（`internal/planning.cjs`）；
3. 调整 GitHub Git Database API（Blobs/Trees/Commits/Refs）的调用参数或网络异常重试边界（`internal/github.cjs`）；
4. 改进 HTTP Webhook 服务的鉴权中间件、请求分块读取或状态码映射（`internal/http.cjs`）。

**非适用范围**：

- 修改静态站点构建与渲染逻辑（属于 `packages/site` 或 `packages/book-build` 职责）；
- 运维环境 Nginx 反向代理配置或 Systemd 守护进程管理（属于 `packages/operations` 职责）。

## 前置条件

在实施任何代码修改前，必须确认并满足以下前置条件：

1. **工作目录**：所有命令必须在项目根目录（`blog/`）下执行；
2. **环境与依赖**：Node.js 版本满足 22 LTS（>=22.13.0）或 24+，且已运行 `npm ci` 确保本地环境就绪；
3. **工作树基线与备份点**：
   - 执行 `git status -s` 检查工作区状态，确认并保留已有修改；
   - 记录当前提交哈希 `git rev-parse HEAD` 用于比较已提交基线；另行保存未提交差异；
4. **测试隔离说明**：修改本模块的常规单测绝不允许使用生产环境的真实 GitHub Token，一律通过接口注入的虚拟 `request` 替身进行断言。

## 输入与配置

实施修改时，开发人员必须严格对照各子模块的修改风险矩阵与契约约束：

| 修改范畴       | 涉及源码路径            | 核心契约与原则                                           | 联动风险与向下游传播影响                       | 验证与防范策略                                            |
| -------------- | ----------------------- | -------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| 文本与格式解析 | `internal/input.cjs`    | 保持 `raw`、`markdown` 和旧版 `html` 输入的向后兼容性    | 占位符解析偏差可能导致图片遗失或格式挤压       | 验证多段落与带特殊标点的文本解析产物                      |
| 文件发布计划   | `internal/planning.cjs` | 标题全等匹配为唯一同名判定依据，路径逆字典序选 canonical | 错误去重可能导致历史文稿被误删或重复生成       | 必须在模拟快照中测试存在多篇同名文章的场景                |
| 远程 Git 提交  | `internal/github.cjs`   | 必须严格声明 `force: false`，提交信息需保持规范格式      | 强制推送将覆盖远程历史，缺乏快退保护将造成灾难 | 验证分支冲突时 GitHub 拒绝快进的拦截分支                  |
| Webhook 服务端 | `internal/http.cjs`     | 比对 JSON body.token，值不匹配返回 403                   | 鉴权逻辑缺陷将导致外部恶意未授权提交           | 验证 JSON 字段名 trim、缺失与错误 token；请求头不参与鉴权 |

## 操作步骤

### 步骤 1：基线确认与缺陷复现（只读检测）

在修改实现前，先运行现有测试套件，确认当前行为基准：

```sh
# 运行 Publishing 模块全套离线单元与替身测试
node --test packages/publishing/tests/webhook-receiver.test.cjs
```

### 步骤 2：实施代码改动（写入修改）

1. **核心逻辑编写**：在 `packages/publishing/src/internal/` 对应子模块中实施代码改动；
2. **公共契约导出**：若有新函数对外暴露，必须在 `packages/publishing/src/api/index.cjs` 中登记，严禁破坏既有参数签名；
3. **协议文档同步**：若客户端上报字段协议发生演进，同步更新 `packages/publishing/docs/reference/api.md`。

### 步骤 3：模块级单元测试与替身回归

实施修改后，运行自动化测试验证业务逻辑与远程 API 参数组合：

```sh
# 运行核心单元测试（验证规划不变量与请求替身行为）
node --test packages/publishing/tests/webhook-receiver.test.cjs

# 运行全工程自动化门禁（Prettier、ESLint、类型、边界及文档检查）
npm run verify
```

## 结果核对

完成操作后，按照以下清单逐项验收：

1. **命令退出码**：所有测试命令退出码必须为 0，控制台无未捕获异常；
2. **计划生成不变量**：确认同名文章能够成功继承历史文稿的 Frontmatter 日期与文件名路径，多余历史副本被标记为 `delete: true`；
3. **安全提交参数**：确认通过替身捕获的 `PATCH /git/refs/heads/...` 请求体中，`force` 参数明确为 `false`；
4. **未授权拦截**：确认无效 Token 请求能够被安全返回 HTTP 403，未知路径请求返回 HTTP 404。

## 失败与恢复

若在任何验证阶段发生失败，按以下流程实施排查与紧急恢复：

1. **占位符数量校验失败**：若日志显示占位符与图片数量失配，检查正文切分算法是否遗漏了中文标点或全角括号的占位符模式；
2. **分支 Ref 更新失败**：HTTP 400 包括 JSON 解析、规划校验和 GitHub 异常，不能仅据状态码认定冲突。网络超时或响应丢失时先核对目标 ref、文章路径及正文/图片内容，确定远端结果后再决定是否重新提交；禁止盲重试；
3. **局部恢复**：先用 `git status -s` 和目标文件的 `git diff -- <具体文件>` 核对归属与差异。保存本次修改前的文件或补丁，按文件逐段撤销本次新增的改动，保留此前未提交内容。新文件先核对是否仅由本任务创建，并移出工作树保存；不要批量清理整个模块。恢复后重新检查差异并运行受影响测试。
4. 不删除测试或放宽安全断言来取得通过。远端提交、服务配置恢复和重启需要明确目标及相应授权；本地代码恢复不会撤销 GitHub 上的文章提交。

## 关联资料

- [模块设计说明](../explanation/design.md)：系统架构与 Git 对象提交流程；
- [公共接口参考](../reference/api.md)：查看服务启动入参与规划函数签名；
- [模块测试方案](../testing/strategy.md)：查阅网络替身与异常测试覆盖矩阵；
- [全局贡献指南](../../../../docs/guides/contributing.md)：查阅代码风格与提交规范。
