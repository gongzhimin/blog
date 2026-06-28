---
title: "综合大杂烩：所有元素混排"
description: "将所有元素类型混合在一起，模拟真实文章场景"
date: 2026-06-23
tags: ["test", "comprehensive"]
---

## 引言

这是一篇综合性的测试文章，包含了 Markdown 中几乎所有常见的元素类型。标题、段落、代码、引用、列表、表格、公式、链接、图片——它们将在一篇文章中交替出现，模拟真实博客文章的复杂结构。

## 代码示例

在开始之前，先看一段 Python 代码：

```python
def paginate(html: str, config: PageConfig) -> list[str]:
    """将 HTML 内容按页面高度切分为多个页面"""
    dom = JSDOM(f"<!DOCTYPE html><body>{html}</body>")
    elements = extract_blocks(dom.window.document.body)
    pages = []
    current_page = []
    current_height = 0

    for el in elements:
        h = estimate_height(el, config)
        if current_height + h <= config.contentHeight:
            current_page.append(el)
            current_height += h
        else:
            pages.append(render(current_page))
            current_page = [el]
            current_height = h

    if current_page:
        pages.append(render(current_page))
    return pages
```

## 性能数据

| 阶段 | 耗时 | 占比 |
|------|------|------|
| Markdown → HTML | 12ms | 2% |
| HTML 解析 (JSDOM) | 45ms | 7.5% |
| 分页计算 | 380ms | 63% |
| 书页组装 | 130ms | 21.5% |
| JSON 序列化 | 33ms | 5.5% |
| **总计** | **~600ms** | **100%** |

## 关键发现

> 分页计算是整个流程中最耗时的阶段，占据了总时间的 63%。这主要是因为 JSDOM 的 DOM 遍历和高度估算需要为每个块级元素逐一计算。对于一篇包含 50 个段落、5 个代码块、3 个表格和若干标题的文章，这个阶段需要处理大约 70 个元素。

### 优化方向

1. 将 JSDOM 实例缓存复用，避免重复初始化
2. 对高度估算结果做缓存——相同 tag 的元素高度是固定的
3. 使用 Web Worker 在构建时并行处理多篇文章

### 已知局限

- **图片高度**：构建时不知道图片真实尺寸，当前使用 200px 固定估值。如果文章包含大量图片，建议适当增大 `img.lineHeight`
- **公式复杂度**：KaTeX 公式的复杂度通过 `<span>` 标签数量来估算，但这个估算对于嵌套分数和大型矩阵可能偏低
- **字体回退**：中文字体回退链（Georgia → PingFang SC → 系统默认）的字符宽度可能与预期不同，这会影响 `charsPerLine` 的准确性

## 小结

布局排版系统已经能够处理文章中的绝大多数元素类型。在常规使用场景下，分页的精度足以保证内容不会溢出到页码区域或被页面底部截断。对于图片和公式等特殊元素，服务端预排版的固有局限可以通过适当调整配置参数来补偿。

