---
'@myblog/site': patch
'@myblog/book-build': patch
'@myblog/book-runtime': patch
'@myblog/tooling': patch
---

修复闭合封面快速预览取消、开合动画中的虚封页和相邻内页运动时的内封页遮挡；隔离书籍层叠上下文，底衬只绘制衬边。显式区分扉页与封底内侧切片，增加可选扉页位置配置及逐帧、多点像素和特殊页可见性回归。固定页处理限定当前宿主；Runtime 拒绝重复导航键，新增 BOOK_RUNTIME_DUPLICATE_KEY 诊断，成功结果不变。浏览器门禁使用独立测试端口并覆盖 Chromium/WebKit；包入口不变。
