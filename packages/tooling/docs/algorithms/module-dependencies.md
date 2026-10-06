---
id: 'tooling-dependency-algorithm'
type: 'algorithm'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: 'tooling'
owner: 'tooling 维护者'
parent: 'packages/tooling/docs/explanation/design.md'
related:
  - 'packages/tooling/docs/reference/api.md'
---

# 模块依赖图与源码边界分析

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

给定声明的模块依赖图和源码导入，判断依赖图是否自洽，以及跨模块调用是否同时满足“允许依赖”和“公开入口”。源码归属由 owns 决定，目录层次本身不建立允许边。算法不解析运行时生成的模块名，也不承担完整打包解析器职责。

## 输入与输出

- 图检查输入 modules：每项至少有 id、root、owns、dependencies、entries；
- applicationEntries 可选。源码检查另输入仓库根相对 file 和 source。输出错误字符串数组；
- 合法结果为空数组。清单形状由调用者保证，当前函数不完整校验所有字段类型。

定义 owner(f) 为 modules 中首个 owns 匹配 f 的模块。以斜杠结尾的 owns 按路径前缀匹配，其余按完整路径相等匹配。重叠拥有范围产生顺序依赖，不是合法设计。

## 数据结构

- names：模块 id 集合，识别重复 id。
- visiting：深度优先遍历当前递归路径，识别回边。
- visited：已完成节点集合，避免重复完成检查。
- TypeScript SourceFile：源码语法树。
- errors：按发现顺序追加诊断，不去重。
- modules 原数组：owner 和目标节点查找采用线性扫描，未建立路径索引。

## 算法步骤

图检查：

1. 遍历模块，向 names 加 id，重复则记录错误。
2. 从每个模块发起 DFS；若 id 已在 visiting 中，记录 dependency cycle；已 visited 则返回。
3. 把当前 id 加入 visiting，遍历 dependencies，缺失目标报错，否则递归。
4. 检查 owns 只能是 root/，拒绝重叠 owns；applicationEntries 只能是本模块 root/cli/ 的明确文件，拒绝跨模块、上跳和嵌套目录；检查 entries 必须在 root/api/ 且 owner 等于当前模块。
5. 从 visiting 删除，加入 visited。

源码检查：

1. Astro 文件以正则提取 frontmatter 与 script 块，用替换为 .ts 的文件名逐块分析；其他代码直接创建语法树。
2. 确认 from=owner(file)，无归属则返回错误。
3. 遍历 import/export、require()、import()；非字面量路径要求显式静态边界。
4. 外部包导入跳过；项目别名拒绝，但非 Site 导入 astro: 报错。
5. 相对路径去除查询串，与文件目录连接并用 POSIX normalize 规范化。
6. 找到 to；显式代码扩展名的无归属目标报错。
7. 跨模块时先检查 from.dependencies 包含 to.id，再检查目标既在 to.root/api/ 中，也在 to.entries 中。

```text
Source --> Astro 块提取或直接解析 --> TypeScript AST
                                            |
                                            v
modules.json --> owner + allowed edges --> import/export/require 节点
                                            |
                         +------------------+-------------------+
                         |                  |                   |
                         v                  v                   v
                  计算路径:拒绝      外部包:跳过      相对路径:normalize
                                                               |
                                                               v
                                                 同模块或依赖边+公开入口
                                                               |
                                                               v
                                                        diagnostics 数组
```

图表示 dependencyErrors 的处理阶段，箭头是数据与判决顺序。moduleErrors 的 DFS 独立检查声明图；实际文件存在性由 CLI 及构建检查负责。

## 边界与失败

图中节点 id 应唯一、拥有范围应无歧义；否则诊断并不形成完整可靠的拓扑结论。相对路径不补扩展名、不寻址 index、不 realpath，不验证文件存在；这些检查不等价于实际 Node/Vite 解析。

外部包名跳过；项目别名拒绝。Astro 提取不是完整解析器，模板表达式不参与依赖遍历。静态 require 名称被识别，但不做作用域绑定分析。算法不追踪 re-export 的运行时值、不校验 HTTP 或 window 全局协议。

跨模块运行时协议须另写契约并人工核对。

## 复杂度

设模块数 V、依赖边 E、入口数 K、平均 owns 数 P，源码 AST 节点数 S、导入数 I。查找依赖目标线性 O(V)，owner 最坏 O(VP)。

设 owns 条目总数为 Q（平均 P 时 Q=VP），拥有范围两两比较最坏 O(Q²)。

图遍历在唯一 id 合法图上为 O(V + EV + KVP)，连同拥有范围检查为 O(Q² + V + EV + KVP)，不是通常邻接表实现的 O(V+E)。

源码语法遍历 O(S)，归属查找 O((I+1)VP)，公开入口 includes 另有相应线性成本。空间为 AST 的 O(S)、图状态 O(V)、递归栈 O(V) 和错误输出。文件扫描/读取/格式化不包含在上述纯函数成本内。

## 正确性依据

DFS 当前递归路径 visiting 中再次发现节点说明存在回边，从而有环。已完成节点 visited 不需再展开，因为其可达边已检查。每条声明边都查找目标，因此缺失模块不能被接受。入口逐一比较 owner，使“公开入口属于另一模块”被拒绝。

源码合法域中，每个被识别相对导入都依次经过允许边和公开入口判定；跨模块通过必须同时满足两条件。证明仅适用于被解析和规范化的导入，不扩张为整个运行系统的依赖完备性。

## 测试案例

| 案例                                | 期望                          |
| ----------------------------------- | ----------------------------- |
| 重复 id                             | duplicate module              |
| A→不存在 B                          | missing dependency            |
| A→B→A、自环                         | dependency cycle              |
| A 入口由 B 拥有                     | another owner                 |
| 同模块导入私有文件                  | 允许                          |
| A 未允许 B，却导入 B 入口           | cannot depend                 |
| A 允许 B，却导入 B 私有文件         | private implementation        |
| import(variable)、require(variable) | explicit static boundary      |
| 非 Site 导入 astro:content          | Astro content belongs to site |
| 注释或普通字符串含 import 文本      | 不应误判为导入                |
| Astro frontmatter/script 非法边     | 提取后的分析应报违规          |

- 执行 `node --test tests/integration/engineering-system.test.mjs packages/tooling/tests/engineering-boundaries.test.mjs packages/tooling/tests/document-contract.test.mjs` 和 `npm run check:boundaries`。矩阵是规则验收清单；
- 新增语法支持时先补回归，不能把未解析形式称为已覆盖。项目别名以拒绝策略封闭绕过入口；
- 真实模块解析仍需另行设计。
