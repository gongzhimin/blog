---
'@myblog/site': patch
'@myblog/book-runtime': minor
---

Site 将六种特殊页抽为独立私有定义，初始书壳与运行时使用同一 HTML，版面 CSS 与正文主题分离。Runtime 接受可选 specialPages，返回包含前四页及动态尾页的完整页缓存；不再生成个人博客出版文案或注入封底素材样式。不传 specialPages 的消费者须自行提供展示内容与 CSS。
