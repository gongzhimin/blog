---
id: 'operations-health-algorithm'
type: 'algorithm'
status: 'active'
created: '2026-10-04'
modified: '2026-10-05'
scope: 'operations'
owner: 'operations 维护者'
parent: 'packages/operations/docs/explanation/design.md'
related:
  - 'packages/operations/docs/reference/api.md'
---

# 健康检查重试与汇总算法

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

对有序探针数组执行有限重试，返回逐项判定，并在普通失败后继续其他探针。总结果只在每项成功时为真。业务问题是服务启动后可能短暂不可达，且一次失败不应阻止取得其他诊断。算法不是自动恢复，也不验证发布事务。

## 输入与输出

输入 checks 数组，及 `runner(command)` 异步函数。合法定义包含 id、label、command；可选 retries 为非负整数、retryDelayMs 为非负毫秒、validate 为同步谓词。

runner 解析为数字 code、字符串 stdout/stderr。

输出 `{ok, results}`；每项 `{id,label,ok,error}`。异常输出不是结果数组的一项，而是 Promise 拒绝。实现不先验证输入形状，因此本文合法域是调用者前置条件，不是已有 Schema 校验。

## 数据结构

- checks：顺序数组，顺序决定执行和结果顺序。
- result：当前项最近一次 runner 输出；每次尝试覆盖，不存完整历史。
- ok：当前项是否通过。
- results：每项恰好一个终态报告。
- attempts：`Math.max(1, Number(retries || 0) + 1)`；合法整数域内等于 retries + 1。

## 算法步骤

1. 创建空 results；从首项顺序遍历 checks。
2. 计算 attempts，初始化 result=null、ok=false。
3. 调用并等待 runner(command)。
4. 仅当 code===0 时调用可选 validate；无 validate 则 code===0 即通过。
5. 通过或已经到最后一次尝试时退出内层循环；否则等待 retryDelayMs 后重试。
6. 通过记录空 error；失败优先取 stderr，再取 stdout，否则取 exit code N，最后 trim。
7. 记录该项，继续下一项；所有项结束后以 every 汇总 ok。

```text
CLI -> 探针定义 -> 顺序执行 -> 系统/HTTP
                    |              |
                    +-- 重试 <-----+
                    |
                    v
              逐项结果 -> 报告 -> 退出码
```

## 边界与失败

空数组输出 ok=true，但不等于默认七项已执行。code 非数字零不通过。错误仅保存最后一次尝试，初次失败可能丢失。runner 或 validate 抛异常立即拒绝，中止后续项。

- 不要传 NaN、负数、分数次数或无穷值；
- 当前强制转换可能导致零次执行、超出预期次数甚至无限重试，并非受支持协议。默认本地端口最多九次、间隔 500 ms、curl 单次 5 s；
- 其他系统命令无统一 timeout，不能给整个调用保证固定截止时间。

## 复杂度

设探针数 n，第 i 项最多尝试 aᵢ 次。忽略外部命令成本，调度时间 O(Σaᵢ + n)，报告空间 O(n)，额外循环状态 O(1)。

实际耗时为各次 runner 耗时之和，加未终止尝试之间的等待。默认本地端口部分最坏名义预算为 9×5 s + 8×0.5 s = 49 s，但进程调度/启动额外成本不在内；systemctl/sudo 没有截止保证，所以全调用不存在可证明的有限墙钟上界。

## 正确性依据

在合法有限输入、runner 每次终止、validate 不抛异常的前提下：

- 第 k 次尝试前，最多已执行 k-1 次，循环不会超过 attempts。
- 成功后立即停止，失败耗尽后也停止，所以每项有唯一终态。
- 每项终态只追加一次，results 的数量和顺序与 checks 一致。
- 总体 every 为真当且仅当所有终态 ok 为真。
- 普通失败不退出外层循环，故其他探针仍执行。

上述证明不覆盖挂起命令或异常拒绝；这些情形需要调用层处理。

## 测试案例

| 输入条件                        | 应有结果 / 观测          | 证据方式              |
| ------------------------------- | ------------------------ | --------------------- |
| 单项 code=0，无 validate        | 一次执行、ok=true        | 注入 runner 计数      |
| code=0，validate=false          | 项失败；不是通过         | 纯函数测试            |
| 初次失败，第二次成功，retries=2 | 两次执行后停止           | 记录调用次数          |
| 永远失败，retries=2             | 三次，保留最后 stderr    | 注入不同错误          |
| 第一项失败、第二项成功          | 两项结果，总 ok=false    | 验证执行顺序          |
| 空 checks                       | 空 results、ok=true      | 断言边界              |
| runner 或 validate 抛异常       | Promise 拒绝，后续未执行 | assert.rejects 与计数 |

执行现有回归：`node --test packages/operations/tests/server-health-check.test.mjs`。矩阵列出算法必须覆盖的验收，不声称每行已有独立测试；新增或调整重试前须核对测试文件并补足未覆盖项。真实网络和 sudo 权限另行验证。
