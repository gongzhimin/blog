---
title: "边界情况测试"
description: "测试各种边界情况：超长单词、连续短段落、空元素"
date: 2026-06-25
tags: ["test", "edge-cases"]
---

## 超长单词

Lopadotemachoselachogaleokranioleipsanodrimhypotrimmatosilphioparaomelitokatakechymenokichlepikossyphophattoperisteralektryonoptekephalliokigklopeleiolagoiosiraiobaphetraganopterygon 是一个古希腊单词。

## 连续短段落

这是一个短段落。

这也是一个短段落。

这还是一个短段落。

连续短段落不应该因为频繁的段落间距而看起来支离破碎。

## 连续标题

### 第一个标题

### 第二个标题

### 第三个标题

连续标题之间没有正文内容。排版系统应该避免在页面底部留下孤立的标题——这就是孤行保护的作用。

## 无内容段落

正文内容从这里开始。上面可能有一些空的或几乎空的段落。排版系统应该正确处理空内容的情况，不应该因为空段落而产生空的书页。

## 纯符号内容

`!@#$%^&*()_+-=[]{}|;':",./<>?`

`┌─┬─┐│├─┼─┤│└─┴─┘`

纯符号和制表符的宽度与普通字符不同。Unicode 全角符号如 `！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？＠［＼］＾＿｀｛｜｝～` 占据两个英文字符的宽度。

