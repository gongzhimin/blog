---
id: 'decision-physical-modules-public-api'
type: 'decision'
status: 'active'
created: '2026-10-04'
modified: '2026-10-06'
scope: '跨模块组织与公开接口'
owner: '项目维护者'
parent: 'docs/decisions/README.md'
related:
  - 'packages/tooling/src/modules.json'
  - 'docs/architecture/overview.md'
  - 'docs/standards/documentation.md'
---

# ADR 0004：物理模块、公开 API 与唯一资料位置

目录：

- [背景](#背景)
- [备选方案](#备选方案)
- [决定](#决定)
- [后果](#后果)
- [再评估条件](#再评估条件)

## 背景

- 仅用 owns 清单声明散落的 src/pages、src/data 属于 Site，不能使应用边界清楚。自研浏览器源码位于 public，绕过构建；
- 服务的薄脚本继续暴露旧路径；
- 迁移占位文档形成第二层导航。用户明确允许改变源码、内容路径、资源 URL 和启动命令，不要求兼容旧布局。

本决定替代 ADR 0001 的目录/薄入口选择、ADR 0002 的编辑器转发 schema，以及 ADR 0003 的重定向文档策略。三份完整旧决策保留为历史，不作为当前接口。

2026-10-06 起，关于单根项目交付且暂不采用独立 workspace package 的选择由已接受的 [ADR 0005](0005-task-oriented-module-apis.md) 替代。本 ADR 中的物理模块、公开 API、源码归属及文档唯一位置仍为当前约束。

## 备选方案

| 方案                                 | 收益                                   | 代价/结论                                             |
| ------------------------------------ | -------------------------------------- | ----------------------------------------------------- |
| 声明归属但保持旧目录和入口           | 修改少                                 | ownership 与读者看到的结构不一致；拒绝                |
| 实际模块树 + api/internal + 单一交付 | 边界可定位、静态可检查、迁移后无旧副本 | 必须一次更新调用、构建、CI与服务资产；采用            |
| npm workspaces + 独立版本            | 包级exports与独立生命周期              | 当前无独立发布需求，增加锁文件/服务安装成本；暂不采用 |

## 决定

- src/site 是完整 Astro 应用，srcDir 明确配置；
- src/book、book-runtime、publishing、operations 是实际模块；
- 工程工具保留 src/engineering。各模块拥有 api、internal、README、固定 docs。跨模块只导入登记 api 文件，Book schema/types 也由 api 公开。Vite主题入口与可Node导入的Book API分开。

Runtime通过Astro/Vite构建浏览器资源，public仅保留静态和第三方资产。BookShell不加载Runtime，Site显式组合两个模块。

Publishing按输入、规划、Git、HTTP责任拆分；Operations按探针、执行、报告拆分。CLI改为publish/health，旧入口和旧文档全部删除，不提供转发。

保持内容原件和已测试业务不变量，不将路径调整视为修改鉴权、原子提交或分页算法的授权。所有图用ASCII，模块设计/API/算法分别拥有独立的完整资料。

## 后果

旧资源路径、服务脚本和内容仓库路径不再有效；部署时必须同时安装完整模块树、使用新CLI和新内容路径。只上传入口文件会缺内部实现。仓库未保留旧站点源树或兼容wrapper，生产升级需要使用完整当前版本，回退使用完整上一版本，不混装。

api/internal是受检查的单仓库约定，不是运行时沙箱或npm exports强封装。浏览器仍有单实例window.BookRuntime协议，静态依赖门禁不能证明DOM、HTTP或Git协作隔离。真实上线未执行，不能以本地验证声称生产生效。

## 再评估条件

出现独立消费者、版本或依赖安装需求时评估拆包；出现多书同页需求时评估运行时实例生命周期。任何新公共入口同时更新API参考、模块清单和边界测试；目录或协议变化更新全部消费者，不重新引入历史跳转层。
