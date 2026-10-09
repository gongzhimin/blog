---
id: 'book-runtime-docs-algorithms-pagination'
type: 'algorithm'
status: 'active'
created: '2026-10-04'
modified: '2026-10-09'
scope: 'book-runtime'
owner: 'Book Runtime 模块维护者'
parent: 'packages/book-runtime/README.md'
related: ['docs/standards/documentation.md']
---

# 浏览器测量分页算法

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

在客户端浏览器呈现拟真翻页书时，必须解决将长短不一的富文本 HTML 文稿动态排布至固定物理尺寸视口（如桌面端双页 $460 \times 582\text{px}$ 或移动端单页 $370 \times 507\text{px}$）的核心排版问题。
具体问题定义为：给定按顺序排列的文稿富文本 HTML 片段集合以及当前视口的几何约束，设计一套能够在浏览器真实渲染树中执行的测量与切分算法，将长文本、代码块、列表与表格自适应拆分为离散的物理页数组。

算法的成功判据包括：

1. **语义完整性**：文章正文在被多页切分后，全文拼接文本与原始输入严格一致，无字符丢失或重复，嵌套加粗（`<strong>`）与斜体（`<em>`）跨页时标签闭合无损；
2. **盒模型物理适配**：每一页在实际浏览器中的渲染高度严格小于或等于容器可用高度（不产生垂直滚动条或被容器硬裁剪）；
3. **导航一致性**：目录链接、文章导航键映射和缓存中的正文起页必须一致。key 是导航键，不是无碰撞的身份标识；正确定位要求输入键不冲突、测量期间资源稳定且目录校准成功。

本文说明文本前缀二分搜索与有界目录校准。上述是设计验收目标，不是当前全部能力已得到证明：不可拆分超高块仍可能溢出，跨页行内语义仍需专项测试。重复非空导航键在测量前被拒绝；资源晚到和任意 HTML 不在无溢出保证范围内。

## 输入与输出

输入为 title、dateStr、bodyHTML、可选文章 key，以及 articleWidth/articleHeight 等配置。HTML 和标题来自可信上游；本层没有净化。字体和图片尺寸稳定是可靠测量的前提，代码没有统一等待屏障。

- Paginator 输出 HTML 字符串数组；
- 页脚 0 是待替换标记。Orchestrator 输出物理页缓存、文章起页、页到文章映射及页面拓扑。全书物理页划分为四层：
  1. **前置特殊页**：物理页 1（封面）、2（封二）、3（扉页正面 `TITLE_PAGE`）、4（扉页反面/出版说明 `IMPRINT_PAGE`）；
  2. **动态目录页**：从物理页 5 开始，占 $T$ 页（物理页 $5 \sim 4+T$，页脚使用罗马数字）；
  3. **正文主体页**：从物理页 $bodyStart = 5+T$ 开始，到 $bodyEnd = bodyStart + M - 1$（仅正文页参与页码统计，页码严格计 $1 \sim M$）；
  4. **后置特殊页**：若 $bodyEnd$ 为奇数，自动插入 1 页对齐尾衬页（`ALIGNMENT_ENDPAPER`）保持偶数跨页对齐；紧随物理倒数第二页（封三）和物理最后一页（封底）。
- 前四页、目录页、对齐尾衬页和最后两页均**不计入**正文页码统计；`totalBodyPages = M`。

## 数据结构

| 数据                     | 表示                            | 约束                                                                                                                                      |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| elems                    | 从 bodyHTML 建立的 DOM 元素数组 | 分割余量可插回后续位置                                                                                                                    |
| inner                    | 隐藏但参与布局的容器            | scrollHeight 用于溢出判断                                                                                                                 |
| pages                    | 已完成页面 HTML 数组            | 顺序不得倒置                                                                                                                              |
| articlePages             | 每篇文章的页数组                | 文章按输入顺序组装                                                                                                                        |
| pageCache                | 物理页 → HTML                   | 包含物理页 3、4（扉页正反面）、$5 \sim 4+T$（目录）、$bodyStart \sim bodyEnd$ 及可选的对齐尾衬页                                          |
| PAGE_KIND                | 页面类型枚举                    | `FRONT_COVER`, `INSIDE_FRONT_COVER`, `TITLE_PAGE`, `IMPRINT_PAGE`, `TOC`, `BODY`, `ALIGNMENT_ENDPAPER`, `INSIDE_BACK_COVER`, `BACK_COVER` |
| articleStarts / key 映射 | 文章导航键 → 物理起页           | 不是显示页码，不保证键无冲突                                                                                                              |

## 算法步骤

- 实现分三层：`paginator-core.js` 管理共享几何配置并建立测量容器；
- `paginator-splitters.js` 提供文本、代码、列表和表格分割策略；
- `paginator.js` 编排正文与目录测量，公开 Paginator 接口。加载顺序必须与这三层依赖一致。

```text
article HTML -> ordered elems -> clone/append -> measure height
                                  ^                  |
                                  |            fits? +--yes-> commit
                                  |                  |
                                  |                  no
                                  |                  |
                         remainder <- split prefix <-+-> save/open page
article pages -> provisional TOC -> candidate T
                                       |
                                       v
                       rebuild links(bodyStart=5+T) -> measure T'
                                       ^                  |
                                       |          T'=T? --+--yes--> commit cache/maps
                                       |                  |
                                       +-- T=T' <-- no ----+
                                          |
                             repeated candidate / 8 rounds
                                          |
                                          v
                                    throw; no commit
```

1. 从 HTML 建立 DOM，预处理多子节点 blockquote 和嵌套列表，并补充部分顶层图片尺寸。
2. 首页写 title/date；续页使用续页标题。逐元素克隆、试放并读取高度。
3. 溢出时先从当前页撤回元素。段落、blockquote、li 等文本用可见字符数量二分搜索前缀；Range 克隆内容并保留原元素属性。
4. 代码块按解码后文本的换行位置切分，Range 保留嵌套属性并将换行保留在前片，避免拼接时丢失行分隔符；列表按子项、表格按行处理；可保留部分内容时把余量插入 elems，继续下一轮。
5. 本页无法放入则保存并开新页。文本、代码块、列表与表格在新页再次尝试分割；不能分割的元素可能整块放入并溢出。
6. Orchestrator 先分页文章，再用预估起页测量目录，得到候选 T。按 bodyStart=5+T 重建目录链接并重新测量；测得页数等于 T 才接受，否则更新 T，继续校准。
7. 写入前置特殊页：将载荷的 frontCover、frontInside、titlePage、imprintPage 原样映射到 1、2、3、4。文案和版面由 Site 生成，Runtime 不维护第二套模板；
8. 注入动态目录页（物理页 $5 \sim 4+T$），写入罗马数字页脚（I, II, ...）；
9. 注入正文主体页（物理页 $bodyStart \sim bodyEnd$），写入从 1 开始严格递增的阿拉伯数字页脚；全书仅正文页参与页码统计，`totalBodyPages = M`；
10. 若正文结束在右侧奇数页（`bodyEnd % 2 !== 0`），注入 1 页对齐尾衬页（`renderAlignmentEndpaper`）占位，确保封三与封底始终闭合在左侧偶数页跨页，消除末页多余空白；
11. 计算总页数并生成封底样式，返回页面与映射。Site 的适配器消费该结果，在 Turn.js missing 事件中装配页面；交互状态收敛不属于分页算法。

- 目录最多初测一次加校准 8 轮。校准输入的候选页数再次出现时抛 `TOC calibration did not converge: cycle`；
- 8 轮未稳定时抛 `TOC calibration did not converge: 8 rounds exceeded`。只有稳定后才提交页面缓存、导航映射、封底 class 和样式；
- 这两类失败保留调用前缓存和 DOM 状态。8 轮是工作上限，不是收敛证明，也没有给单次布局设置时间上限。

## 边界与失败

空内容仍通过默认页面处理；HTML 无效由浏览器解析，不做输入契约验证。超高图片及不可分割块不保证无溢出。3000步预算耗尽但仍有待处理元素时抛明确 Error，不返回截断成功。

正好3000个简单段落是合法对照；分割余量也计入步数，因此该数值不是支持的原始段落数上限。

测量 CSS 同源不保证字体、图片和设备相同。分页正常及异常路径均在 finally 中删除本调用测量容器，Core 从局部 measure 查找 inner，不抓取其它同 ID 节点。共享配置仍不提供并发会话隔离。

reset 清本实例缓存、两份映射和保存结果，不清插件 DOM 或宿主样式；Runtime 不再注入封底 style。缓存生成后资源变化不会自动重排。

## 复杂度

设 N 为处理元素及分割余量数量，C 为文本可见字符总数，P 为输出页数，Q 为真实布局测量次数。主循环最多 3000 次，但 HTML 解析、克隆和单次分割仍可能处理大内容；这不是资源预算保证。

一个长度 c 的文本分割使用 O(log c) 次前缀搜索，每次 Range 克隆/序列化可触达 O(c) 内容，还引起浏览器布局。总成本应写成 DOM 解析、各次克隆及 Q 次 layout 的和，不能声称整体 O(N) 或 O(C log C)。

布局由浏览器、CSS 和资源状态决定，没有可移植的固定单次上界。

- 缓存空间与输出 HTML 总字节量相关；
- 待处理 DOM、分割克隆与每篇页数组也占空间。目录最多测量 9 次；
- 每轮重建全部链接并调用目录分页，成本计入各轮 DOM 克隆与布局测量之和。候选集合最多保存 8 项。

## 正确性依据

在“每次拆分产生非空前缀、余量严格减少、未触及上限”的条件下，算法按原顺序提交前缀，再处理余量，因此可保持文本顺序。这是一项条件性依据，不覆盖每种 HTML 结构；HTML 属性与列表/表格语义要另行测试。

接受目录时，生成链接所用候选 T 与实际页数组长度相等。因此正文缓存从 5+T 开始，链接 data-page、articleToPage 与 pageToArticle 都采用同一偏移；正文显示页码严格从 1 开始独立递增至 M，不计入特殊页面。

编排先用 Map 记录每个非空导航键的文章索引，重复时抛出 `BOOK_RUNTIME_DUPLICATE_KEY`，不测量正文、不提交缓存、映射或封底 DOM。检查需 O(A) 次键查询及 O(A) 空间，A 为文章数；不证明哈希本身无碰撞。字体/图片测量后变化会破坏高度前提。偶数总页数及封底位置不证明正文均完整。

## 测试案例

文本与代码切分回归位于 runtime-lifecycle.test.mjs：实体、emoji、含 `>` 的属性、嵌套链接和代码 token 的属性必须保留；前后片 textContent 拼接必须等于原文，代码换行不可丢失。重复键回归检查零测量、状态不提交及修正后可重试；公开入口检查失败 code、phase、索引和无部分 value。Chromium/WebKit 的 pagination-behavior.spec.mjs 另验证 rich text 与 80 行代码的独立高度，不以 JSDOM 代替布局证据。

### 具体缓存与映射追踪

取文章 A={key:'a',title:'甲',dateStr:'2026/10/04',bodyHTML:'<p>甲文</p>'}、B={key:'b',title:'乙',dateStr:'2026/10/04',bodyHTML:'<p>乙文</p>'}。

在固定测量条件下，设文章分页分别得到 [A1,A2]、[B1]，两次目录测量均得到一页 T1；这是编排案例的明确前提，不声称短正文必然生成两页。

```text
stage          provisional starts     shift/bodyStart     physical cache
articles       a=7, b=9               unset               empty
first TOC      T=1                    -1 / 6              empty
final TOC      a=6, b=8               -1 / 6              3=TitlePage, 4=ImprintPage, 5=T1(footer I)
body           a=6, b=8               -1 / 6              6=A1(页码 1), 7=A2(页码 2), 8=B1(页码 3)
finish         bodyEnd=8 (偶数，无衬页) total=10,back=9    9=封三(未计入), 10=封底(未计入)
```

终态：

- pageCache 包含物理页 3、4、5、6、7、8；物理页 1（封面）、2（封二）、9（封三）、10（封底）由外壳节点承载。
- articleToPage={a:6,b:8}，pageToArticle={6:'a',7:'a',8:'b'}。
- bodyStart=articleStart=6，bodyEnd=8，totalBodyPages=3。
- isSpecialPage(p) 对 1, 2, 3, 4, 9, 10 返回 true；对 6, 7, 8 返回 false。
- isCountedPage(p) 仅对 6, 7, 8 返回 true。
- 目录 data-page 为 6 和 8，显示页码为 1 和 3；Turn.js 接收物理页码。
- 封三 class 为 p9、外封底为 p10；Site 的角色类背景保持不变，不注入按页号绑定的 CSS。

复用与 reset：

- 再次 paginateAll 返回同一个对象，不重新测量；totalPages=10、backPage=9、bodyStart=articleStart=6、totalBodyPages=3。
- reset 清本实例缓存、两份映射、完成标志和保存结果，保留宿主样式。
- reset 不卸载插件 DOM，缓存重建不是插件重新挂载。

| 输入 / 条件                | 应断言                           | 当前证据与缺口                                                                     |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| 短文本含 strong            | 文本与标签保留，测量节点正常清除 | 离线教程可运行；不是跨页语义证明                                                   |
| 多页长段落，两种宽度       | 拼接文本一致，实际内容高度不超限 | pagination-behavior 浏览器回归                                                     |
| 极长不可分割图片           | 不无限循环；暴露溢出             | 已知能力限制，需独立案例                                                           |
| 目录测量增长/缩减/多轮变化 | 链接、双向映射和实际起页一致     | runtime-lifecycle 的三个 TOC calibration aligns 用例；真实浏览器大目录点击仍需补充 |
| 目录循环/8轮不稳定         | 明确抛错，不提交状态，可重试     | runtime-lifecycle 的两个 TOC calibration rejects 用例                              |
| 字体或图片迟加载           | 记录分页前后高度差               | 无自动失效，应作为缺口验收                                                         |
| 3000 次循环边界            | 全文未丢失或明确失败             | runtime-lifecycle：3000简单段落完整，3001抛预算Error                               |

blog 根执行 `npm run build && npm run test:e2e`；Node/JSDOM 只验证 DOM 协议，不能替代布局证据。详细范围见 [测试方案](../testing/strategy.md)。
