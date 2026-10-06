---
id: 'scripts-publishing-docs-algorithms-publication'
type: 'algorithm'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: 'publishing'
owner: 'Publishing 模块维护者'
parent: 'packages/publishing/README.md'
related: ['docs/standards/documentation.md']
---

# 内容规划与 Git 提交算法

目录：

- [问题定义](#问题定义)
- [输入与输出](#输入与输出)
- [数据结构](#数据结构)
- [算法步骤](#算法步骤)
- [边界与失败](#边界与失败)
- [复杂度](#复杂度)
- [正确性依据](#正确性依据)
- [测试案例](#测试案例)

## 问题定义

把一份移动输入转换成正文、图片和同名副本删除计划，使这些变更在分支可见性上一起生效。单次提交完整性不等于恰好一次交付；算法没有请求幂等键，也不确认站点部署。

## 输入与输出

输入 data 包含 title、markdown/raw/html、images；repositoryState 包含 headCommitSha、baseTreeSha、existingPaths、posts。

posts 是 life 集合 Markdown 文本及路径。日期、随机后缀和图片时间戳可注入，便于确定性测试。

规划输出 publication={files,commitMessage}。普通 file 为 repoPath 与 Buffer content；删除项为 repoPath 与 delete:true。

提交阶段创建对象并 force:false 更新目标 ref。HTTP 200 只表示更新返回成功，不回传部署结果。

## 数据结构

| 数据              | 用途                     | 边界                                             |
| ----------------- | ------------------------ | ------------------------------------------------ |
| posts[]           | 精确 title 查找覆盖目标  | 读取全部 life 内容，非索引                       |
| existingPaths Set | 删除前检查快照中路径     | 来自递归树，truncated 时拒绝                     |
| images[]          | 按占位符顺序解码         | base64 解码不证明真实图片                        |
| files[]           | 正文、图片及删除操作     | 一个 tree，正文写 packages/site/src/content/life |
| Git tree entries  | blob SHA 或删除 sha:null | 基于 base_tree，不修改其他路径                   |

## 算法步骤

```text
客户端 -> HTTP(token/JSON) -> 仓库快照 -> 转换/规划
                                           |
                                           v
                          blobs -> tree -> commit -> ref
                                                       |
                                                       v
                                                独立构建与部署
```

1. HTTP 路由匹配、JSON 解析及 body.token 鉴权完成后，进入当前服务器实例的 pendingPublish Promise 队列。前项成功或失败后执行本项；读取分支 ref、父 commit 和递归 tree；tree 截断时失败。并行读取 packages/site/src/content/life 下 Markdown blob。
2. 按 truthy 字段优先级选择输入；从显式标题或内容首行获得标题。raw 转换保留硬换行规则。
3. 按 frontmatter title 精确匹配同名文章。匹配路径逆字典序第一项是 canonical，不是按修改时间选最新。
4. 有 canonical 则保留其路径和已有 date；无 canonical 则用日期、slug 和随机后缀新建。其他同名路径成为删除项。
5. markdown/raw 的图片按占位符顺序替换；数量不一致抛错。图片路径是 public/images/mobile/YYYY/MM，正文 URL 去掉 public。旧 HTML data 图片仍有不同路径规则。
6. 普通文件逐个创建 base64 blob；删除项只在快照存在时写 sha:null。创建 tree 与 commit。
7. 非强制更新 ref；若别的请求已推进分支，依赖 GitHub 快进规则拒绝旧父提交，不自动读取新状态重试。

## 边界与失败

同一服务器实例的请求从快照读取到 ref 更新串行执行；独立实例或外部写入仍可能推进 head 并产生冲突。

队列不覆盖直接调用 publishFilesToGitHub，不是分布式锁或持久队列，没有显式 expected-head CAS 字段或自动重试。响应丢失后调用者不知道 ref 是否已更新，重发会产生新图片时间戳，不可称幂等。

先核对 ref、文章路径与正文/图片内容，禁止盲重试。

规划前已读取快照，因此占位符错误虽不提交仍有网络成本。ref 前失败可留下不可达 Git 对象，创建对象过程不是事务。无请求体上限、图片真实性校验、完整日期校验或客户端内容 schema 验证。

缺 webhook token 阻止启动，GitHub token 缺失在实际请求时失败。

## 复杂度

设 L 为 life 文章数，B 为其总字节数，T 为仓库树项数，K 为同标题匹配数，I 为图片数，D 为正文及图片总字节量。树和快照读取时间含 O(T+B) 数据传输，HTTP 调用约为常数次元数据请求加 L 次 blob 读取。

posts 并行读取不能消除总流量。

标题扫描处理 B 字节，canonical 排序为 O(K log K)。图片解码与文件序列化与 D 相关。

提交网络调用包括每个普通文件一次 blob 创建，再 tree、commit、ref；其时延依赖 GitHub，不能以 CPU 线性复杂度描述端到端耗时。空间与 T+B+D 及在途请求有关。

## 正确性依据

files 集合把正文与图片放入一个新 tree，commit 以快照 head 为 parent；最终只通过一次 ref 更新暴露这个 commit，因此目标分支不会先看到缺图正文再看到图片。这不涵盖后续构建成功，也不保证所有 CDN 同时更新。

保留身份仅依赖精确标题和路径排序，改标题即新文章。force:false 避免强制替换已推进历史，但不是自动冲突解决。

只要网络替身遵循 Git API 行为，可验证请求顺序、base_tree、parent 和 force 字段；真实权限及 GitHub 服务状态仍是外部前提。

## 测试案例

| 场景                 | 预期断言                             |
| -------------------- | ------------------------------------ |
| 新 raw 正文，无图片  | 一个新 life 文件，无远端调用的纯计划 |
| 同名覆盖             | 原路径和日期保留，新正文替换旧正文   |
| 多个同名路径         | 逆字典序保留一项，其余删除           |
| 图片占位符数量不一致 | 抛错，不创建 Git 提交                |
| 正文与两图           | 三个普通文件进入同 tree/commit       |
| GitHub 失败或冲突    | 请求失败，不 force 更新、不自动重试  |
| 响应丢失后重发       | 不应宣称幂等，需要仓库人工核对       |

blog 根执行 `node --test packages/publishing/tests/webhook-receiver.test.cjs packages/publishing/tests/publishing-http.test.cjs`；请求替身检验 Git 对象字段，回环 HTTP 测试验证实例队列、鉴权与错误映射，不使用真实 token。

队列测试用受控 Promise 阻塞首项 PATCH，第二项请求体结束后断言尚未读取 ref，分别放行首项成功或失败后验证第二项继续。独立实例冲突和响应丢失仍未覆盖。

[离线教程](../tutorials/getting-started.md) 给出可运行的输入和覆盖案例。

### 一次同名更新的完整追踪

输入快照 head=h0、base_tree=t0，含 packages/site/src/content/life/a.md 与 z.md，二者 title 都是“海边”，日期分别 2026-07-01 与 2026-07-02。

输入 raw 为“海边\\n正文\\n[图片: 云]”，images 为一张 PNG base64，注入 date=2026-10-04、randomSuffix=12、imageTimestamp=999。

标题相等产生两个匹配；逆字典序选择 z.md，沿用 2026-07-02。

输出 files 依次包含 public/images/mobile/2026/10/img-999-012.png、z.md 的新正文 Buffer、a.md 的 delete:true。

正文图片链接是 /images/mobile/2026/10/img-999-012.png，frontmatter 日期保留旧值。

- transport 创建两个 blob b1/b2，tree t1 的三项分别引用 b1、b2、sha:null，以 t0 为 base_tree；
- commit c1 的 tree=t1、parents=[h0]；
- PATCH ref 的 sha=c1、force=false。成功后分支同时看到图和正文并移除 a.md；
- 若 PATCH 拒绝，分支未由本请求推进，c1 可能成为不可达对象。对应不变量是唯一 canonical、图片配对、单一父提交、一次可见更新。输入扫描 O(B)、两个匹配排序 O(2 log 2)，两次 blob 写加三次元数据写；
- 测试断言保留日期、delete 项和 force:false，不推导部署成功。
