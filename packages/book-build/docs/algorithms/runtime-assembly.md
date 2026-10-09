---
id: 'src-book-docs-algorithms-runtime-assembly'
type: 'algorithm'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: 'book-build'
owner: 'Book Build 维护者'
parent: 'packages/book-build/README.md'
related:
  - 'packages/book-build/docs/explanation/design.md'
  - 'packages/book-build/docs/reference/api.md'
---

# 阅读载荷、文章 key 与占位目录算法

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

在静态构建阶段，异构输入源（如 Astro 文稿集合或独立 JSON 小书）已被解析为统一的 `BookDocument` 规范模型。

然而，构建机环境脱离了客户端真实视口、字体抗锯齿与屏幕像素密度的物理上下文，无法在服务器端直接计算出精确的真实折行与物理页数。
本算法需要解决的核心问题是：如何在构建期将规范模型确定性地组装为客户端书壳可消费的标准静态阅读载荷（包含富文本 HTML、初始占位目录与几何配置），并为每篇文稿生成短小、抗混淆且幂等的 URL 锚点标识（`key`）。

算法的成功判据包括：

1. **保真与隔离**：条目遍历顺序严格保真，输入配置对象在组装过程中实现完全的深拷贝隔离，原始配置不被就地修改；
2. **确定性键值映射**：相同的文稿 ID 必须恒定映射为相同的可读短哈希键（采用 CRC32 与 proquint 编码）；
3. **占位页码推导**：基于输入文章数量，利用线性启发式规则（$9 + 3n$）快速推导出供 Turn.js 初始化容器骨架的预估总页数与占位目录，确保客户端能无闪烁挂载骨架并在后续阶段由真实物理测量无缝替换。

本算法明确不承担真实客户端排版折行计算与未授权 HTML 深度净化职责。

## 输入与输出

公开调用入口是包根 `buildBook(input)`；内部 `buildBookRuntime` 负责确定性组装，`internal/` 路径不作为集成契约。外层入口先校验 Book Schema，再执行正文处理与载荷生成，并将可预期失败映射为 `Result` 诊断。

输入 document、可 JSON 序列化的 bookConfig、renderMarkdown、stripLeadingTitle，以及可选日期与罗马页码回调。输出 document 原引用、articles、toc、克隆后 config。

前提是调用方已校验配置且 document.entries 可遍历；assembler 不自动校验。回调或 JSON clone 失败直接抛错。

## 数据结构

每篇 article 保存 title、dateStr、bodyHTML、key 和 source{id,collection}。key 格式为五字母音节、连字符、五字母音节。

配置追加 articles、toc、source、runtime.pagination 和 runtime.mobilePagination；turn 保存 startPage、totalPages、backPage。

CRC32 使用 32 位寄存器、初值 0xffffffff、反射多项式 0xedb88320、最终异或 0xffffffff，结果转无符号数。proquint 的辅音表为 bdfghjklmnprstvz，元音表为 aiou。

## 算法步骤

1. 按 entries 原顺序遍历。先 stripLeadingTitle(body || '', title)，即 HTML 条目也经过此回调。
2. bodyType=html 时直接使用处理后正文，否则调用 renderMarkdown。日期由 formatDate 生成。
3. 对 id 的 UTF-8 字节做 CRC32，每字节异或后迭代八次右移及条件多项式异或。
4. 将 CRC32 拆为高、低两个 16 位值。每段按 4/2/4/2/4 位映射辅音/元音/辅音/元音/辅音，连接为 key。
5. 目录第 i 项（i 从 0）链接物理占位页 7+i，显示号 1+i；目录页标来自 romanTocPage(5)。
6. JSON 克隆配置，写 startPage=7、totalPages=9+3n、backPage=8+3n。桌面几何写入 runtime.pagination；移动配置存在时转换为 runtime.mobilePagination，否则后者为 null。再写文章和来源摘要。

例如 n=2 时估计 totalPages=15、backPage=14，目录指向 7、8。这不表示第一篇只有一页，也不保证估计总页数为偶数。n=0 时总页数仍为 9。

## 边界与失败

- 相同 id 即使 collection 不同也得到相同 key；
- 不同 id 的 CRC32 也可能碰撞，本包生成阶段不检测或重试；Runtime 分页前拒绝重复非空导航键，错误码为 `BOOK_RUNTIME_DUPLICATE_KEY`。标题及 tocTitle 拼接进 HTML，当前信任边界不是净化器。循环配置 JSON clone 失败；
- undefined、函数等值不能完整保留。原配置不修改，但返回 document 是原引用。缺 book.turn 等嵌套结构可直接抛 TypeError。没有事务或部分载荷恢复。

## 复杂度

令 n 为文章数、u 为所有 id UTF-8 字节总数、c 为 JSON 配置序列化大小、h 为输出 HTML 总大小。

key 计算 O(u)，目录与记录组装 O(n+h)，配置 clone O(c)；总计 O(n+u+c+h+R)，R 为渲染及标题处理回调成本，不能把复杂 Markdown 渲染假称固定 O(1)。

空间 O(n+u_max+c+h)，u_max 为单个 id 字节数，原正文未整体复制为第二份文档。

## 正确性依据

map 保持一对一关系与输入顺序，source 可追踪原 id/collection。纯确定性 CRC32 和位映射保证同 id 的 key 稳定，但不保证唯一。JSON clone 后写入隔离原配置，只适用于可序列化值。

目录及总页数公式证明占位值可重复生成，不证明实际分页、可读性或内容安全；这些由 Runtime 测量和浏览器测试负责。

## 测试案例

| 输入或故障                | 预期                                             | 验证位置                            |
| ------------------------- | ------------------------------------------------ | ----------------------------------- |
| 两项 JSON、第一项无日期   | 顺序保留、epoch 默认、总页数 15                  | 入门教程、json-book-source.test.mjs |
| 同 id 重复构建            | key 相同且符合音节格式                           | book-runtime.test.mjs               |
| HTML 条目与 Markdown 条目 | 前者不调用 Markdown renderer，二者都调用标题处理 | book-runtime.test.mjs 与教程        |
| 原配置                    | 构建后不等于新对象，原内容保留                   | book-runtime.test.mjs               |
| n=0、n=1                  | 估计总页数 9、12                                 | 可针对 assembler 增补公式断言       |
| 不同 collection 相同 id   | key 相同                                         | 已知缺口；不能写成唯一性保证        |
| renderer 抛错或循环配置   | 抛错，不返回部分成功                             | 新回归需断言具体错误来源            |

配置、主题和浏览器证据分工见 [测试方案](../testing/strategy.md)。真实目录页码重建属于 Book Runtime，不归本算法。

### 两章与异常的完整案例

输入 document.id=practice、tocTitle=目录，entries 顺序如下：

- 第一项：id=first、title=第一章、bodyType=markdown，body 为 `# 第一章\\n\\n你好 **世界**。`。
- 第二项：id=second、title=第二章、bodyType=html，body 为 `<p>受信 HTML</p>`。

第一章省略日期，第二章日期2026-01-02；配置来自已校验的 Site 实例，formatDate 固定取 ISO 日期，romanTocPage 使用正式函数。

- source 输出第一章日期1970-01-01 UTC、collection=json且顺序不变。assembler 先删除匹配首标题，第一章走Markdown得到strong世界，第二章不调用Markdown；
- key 分别为 nanud-vunil、rimiz-dajon，dateStr 分别为1970-01-01、2026-01-02，source保留first/second。目录占位链接7、8，页脚v；
- config.book.turn为startPage=7、totalPages=15、backPage=14，source.entryCount=2。原config不改写，输出document===输入document；
- Runtime仍需重新测量真实页码。

- 同一例把第二章bodyType改pdf，JSON转换在模型形成前抛Error；
- 把renderer换为抛“render failed”的回调，组装停止且没有部分payload；
- 把config改循环对象，JSON clone抛错。此例用顺序/正文分支/原对象/占位公式形成独立期望，CRC32仅证明稳定不证明唯一。完整可运行断言见[教程](../tutorials/getting-started.md)，n=2公式代入得到15，渲染成本与两章正文长度相关。
