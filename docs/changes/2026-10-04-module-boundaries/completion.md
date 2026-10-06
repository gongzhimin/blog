---
id: 'module-boundaries-completion'
type: 'record'
status: 'historical'
created: '2026-10-04'
modified: '2026-10-04'
scope: '模块源码、公开API、设计资料与迁移验收'
owner: '项目维护者'
parent: 'docs/changes/README.md'
related:
  [
    'docs/changes/2026-10-04-module-boundaries/plan.md',
    'docs/decisions/0004-physical-modules-and-public-api.md',
  ]
---

# 物理模块与文档系统重构验收

## 范围

按用户授权，不以旧源码位置、内容路径、资源URL和服务器命令为约束。保留16份文章原件及已测试业务规则，继续原脏工作区，不提交、不推送、不部署、不写真实GitHub仓库。

## 实施记录

- Site完整收拢Astro应用，srcDir为src/site；content/data实际移动，发布文件计划、每日一句、CI和loader同步。
- Book公开api/index、types、schema、BookShell与独立Vite主题入口，Node API不依赖?raw；实现放internal。BookShell只输出DOM/载荷/测量CSS，Site组合Runtime。
- Runtime源码从public移入src/book-runtime，通过Assets/Cursor构建资源；删除旧资源副本及旧全局别名。
- Publishing拆输入/文件计划/Git/HTTP，Operations拆探针/执行/报告，Tooling拆公开API和内部实现；publish/health是新真实CLI，不是旧入口转发。
- service归Operations/assets；删除旧service和重复示例、旧服务脚本、renderer转发、九份迁移占位文档及旧interface.md。
- 六模块统一README及docs实际目录、九字段元数据、固定章节、逐成员API、ASCII图、算法结构/复杂度/正确性/具体案例。共享制度和跨模块协议留根docs，完整历史标状态；ADR0004替代旧目录及中转策略。

两阶段交叉审查先核对规格与边界，再核对实现、失败及示例。必修复包括Runtime API粒度、重复paginateAll返回、reset清理限制、ref更新后才HTTP成功、Site几何字段/限额和过时兼容措辞，均已关闭。各模块离线示例实际执行，服务网络使用注入替身。

## 验证证据

2026-10-04本地，Node v24.14.1、npm 11.11.0：

| 命令/检查                        | 本次结果                                   | 范围                                                    |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| 基线npm run test:node            | 108通过，0失败/跳过                        | 重构前                                                  |
| module-layout首次运行            | 预期失败：Site API缺失；迁移后通过         | 真实结构反例                                            |
| 服务/工程边界/文档反例           | 先红后绿                                   | 旧入口、private API、错误归属、redirect/Mermaid         |
| npm run docs:generate -- --check | 退出0                                      | 三个生成目标一致                                        |
| 最终npm run verify               | 退出0；123项Node通过，0失败/跳过；23页构建 | 格式、lint、模型、文档、边界、Astro、构建、Node全部执行 |
| npm run test:e2e                 | 退出0；Chromium11项通过                    | 翻页、触摸、窄屏、纹理、光标、全文连续与分页高度        |
| 内容迁移核对                     | 16份保留                                   | 未因目录搬迁丢失正文                                    |
| 文档示例/两阶段审查              | 可运行示例执行成功，必修复关闭             | 契约事实与读者任务                                      |
| git diff --check                 | 退出0                                      | 已跟踪差异无空白错误                                    |

集成中旧路径断言的失败已更新为公开API/新构建资源断言，未删除行为测试。Astro结果0 errors、0 warnings、19 hints，为沿用z导出的deprecated提示。Chromium有NO_COLOR/FORCE_COLOR环境提示，不影响结果。证据是本轮时点记录，后续修改必须重新验证。

## 剩余限制

api/internal是单仓库门禁约定，不是权限沙箱或独立包封装。Runtime单例、挂载重试与reset清理限制，受信HTML、有限哈希key、发布限额/重试缺口及非事务部署仍按当前设计记录，本轮不扩大行为实现。

Chromium不证明iOS真机或所有字体环境，全文连续/高度不证明强调及属性跨页语义。没有真实投稿、GitHub写入、生产重建或线上探针证据；部署定义已同步但生产未升级，须另行授权。
