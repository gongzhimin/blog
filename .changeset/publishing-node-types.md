---
'@myblog/publishing': patch
'@myblog/tooling': patch
---

Publishing 显式携带公开 HTTP Server 声明所需的 Node 类型依赖。包验收增加 Publishing 单包类型编译，避免其他 workspace 包的间接依赖掩盖缺失声明。
