---
'@myblog/book-build': patch
'@myblog/site': patch
---

修复本地图片尺寸解析与 RSS 字段处理的依赖漏洞，移除未使用的 astro-paper 及其旧框架依赖。保留公开 API，并增加受限图片解析和 XML 字段往返回归。
