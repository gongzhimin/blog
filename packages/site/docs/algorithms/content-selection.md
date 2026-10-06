---
id: 'src-site-docs-algorithms-content-selection'
type: 'algorithm'
status: 'active'
created: '2026-10-04'
modified: '2026-10-04'
scope: 'site'
owner: 'Site 维护者'
parent: 'packages/site/README.md'
related:
  - 'packages/site/docs/explanation/design.md'
  - 'packages/site/docs/reference/api.md'
---

# 书籍内容选择与排序算法

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

生活与技术集合需要合成连续阅读的书籍。目标是排除草稿、保持来源可追踪、按发布时间倒序；不是统一所有站点入口的内容政策。

## 输入与输出

输入 lifePosts、blogPosts 为数组，文章具有 id、data.title、data.draft、data.pubDatetime 或 data.date，以及可选 body。被保留文章的日期必须为有限 Date。

输出固定书籍标识 zhimin-blog 和 BookEntry 数组。非法日期抛 Error，错误文本包含文章 id；没有部分成功返回值。

## 数据结构

转换条目保存 id、collection（life/blog）、title、date、body、bodyType=markdown、metadata。body 缺失为空字符串；metadata 与原 data 共享引用。

合并数组为新数组，排序不改变两份原数组。Date 也不是深复制值。

## 算法步骤

1. 分别过滤两组文章，条件是 data.draft 为假值；因此真值不仅包括 boolean true。
2. 为保留项建立条目：日期采用 pubDatetime ?? date，并检查 instanceof Date 及 valueOf 有限。错误的非 null pubDatetime 不回退 date。
3. 按 life 后 blog 合并新数组。
4. 比较器使用 b.date.valueOf() - a.date.valueOf()。相同时间维持稳定顺序，即原集合顺序及 life 先于 blog。
5. 返回固定文档头和排序结果。不调用 renderer，不读文件或网络。

示例：life=[A(01-01),D(草稿且无日期)]，blog=[B(01-03),C(01-01)]，输出 [B,A,C]；D 在日期检查前被排除。

## 边界与失败

- 两组空数组返回空 entries；
- 草稿无日期不会触发错误；
- 非草稿缺日期中断转换。重复 id 不拒绝，可能导致后续文章 key 冲突。标题不完整校验。metadata 后续写入会反映到原文章 data；
- 消费者不得假定快照不可变。

## 复杂度

令 n 为总输入条目，k 为非草稿条目。过滤和转换为 O(n)，排序按比较排序模型为 O(k log k)，空间 O(k)。具体 JS 排序算法由引擎决定，不承诺某个内部实现；条目正文字符串仅引用，不按总字符数复制正文。

## 正确性依据

过滤得到的每个条目必满足草稿条件；转换建立固定来源标签和 markdown 类型。日期检查使比较器的两个操作数有限。排序比较器使任意相邻条目的时间非增序。新合并数组隔离原数组次序，但不能证明数据深不可变或 id 唯一。

## 测试案例

| 输入                                   | 预期                   | 证据                            |
| -------------------------------------- | ---------------------- | ------------------------------- |
| 两组空数组                             | entries=[]             | 可调用 adapter 直接断言         |
| 草稿 D 无日期，非草稿 A 有日期         | 仅 A；不抛错           | 教程断言；public-api.test.mjs   |
| A 早于 B                               | B 在前；原数组顺序不变 | book-runtime.test.mjs           |
| pubDatetime 为 invalid Date，date 有效 | 抛含 id 的错误         | 单独断言优先级，不允许回退      |
| 相同日期 life A、blog C                | A 在 C 前              | public-api.test.mjs             |
| 重复 id                                | 两项均保留             | 当前限制，不应期待 adapter 拒绝 |

验证命令及覆盖缺口见 [测试方案](../testing/strategy.md)，完整离线例见 [教程](../tutorials/getting-started.md)。
