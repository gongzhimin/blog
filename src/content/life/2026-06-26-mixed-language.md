---
title: "中英混排测试"
description: "Testing mixed Chinese and English content with various inline elements"
date: 2026-06-26
tags: ["test", "i18n"]
---

Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. 排版是排列文字的艺术和技巧，目的是让书面语言在展示时清晰、可读、美观。中英文混排的一个核心挑战在于：中文字符是等宽的方块字，每个字符占据大约 1em 的宽度；而英文字符是比例宽度，字母 `i` 和 `W` 的宽度差异极大。

在同一个段落中混合使用 Chinese characters 和 English words 时，行高的计算需要同时考虑两种文字的基线对齐。中文字符的视觉中心通常略高于英文字母的 x-height，因此需要使用稍大的行距来确保两种文字在视觉上的和谐共处。The quick brown fox jumps over the lazy dog 这个句子包含了英语中的所有字母，常被用于排版测试。

技术术语的混排尤其常见：我们可以讨论 `flexbox` 布局和 `grid` 系统的区别，也可以比较 `React` 的 `useState` Hook 和 `Vue` 的 `ref` 响应式 API。在命令行中，`ls -la` 和 `git log --oneline` 是日常使用的高频命令。文件路径如 `/usr/local/bin/node` 和配置项如 `"type": "module"` 也是常见的行内代码使用场景。

数字和单位的混排也值得关注：字体大小是 13px，行高是 1.7 倍，内容区宽度是 380px，页高是 582px。在技术文档中，`HTTP/2` 协议、`TLS 1.3` 加密、`UTF-8` 编码等术语频繁出现。版本号如 `v6.1.5`、`v4.2.2` 也需要在排版中正确显示。

最后来一段纯英文段落来测试：The pagination engine uses JSDOM to parse rendered HTML into a DOM tree, then iterates over block-level children to estimate their pixel heights. Each element type has its own line height, padding, and margin configured in the elements table. When an element doesn't fit on the current page, the engine decides whether to split it (based on splitStrategy) or move it entirely to the next page.

