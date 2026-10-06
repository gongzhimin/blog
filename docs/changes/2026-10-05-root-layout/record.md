---
id: 'root-layout-consolidation'
type: 'record'
status: 'historical'
created: '2026-10-05'
modified: '2026-10-05'
scope: '跨模块目录、工程入口与测试归属'
owner: '项目维护者'
parent: 'docs/architecture/overview.md'
related:
  - 'docs/standards/documentation.md'
  - 'docs/testing/strategy.md'
---

# 根目录收拢计划与执行记录

目录：

- [范围](#范围)
- [实施记录](#实施记录)
- [验证证据](#验证证据)
- [剩余限制](#剩余限制)

## 范围

目标是减少项目根的非必要入口，并使实现、CLI、测试和文档按责任归属。用户已批准此结构及本地实施；不提交、推送或部署。

根保留 README、AGENTS、npm 清单与锁文件、Astro 和 TypeScript 配置，以及 src、tests、docs、public 和平台配置。生成物、依赖、编辑器和代理环境目录不按源码目录处理，不删除已有用户数据。

```text
scripts/engineering/ --> src/engineering/       完整工程模块
scripts/publish.cjs  --> src/publishing/cli/    发布服务入口
scripts/health.cjs   --> src/operations/cli/    只读巡检入口
scripts/update-daily-quote.mjs --> src/site/cli/ 站点快照入口
tools/cover-generator/ --> src/site/tools/cover-generator/
CONTRIBUTING.md --> docs/guides/contributing.md
test/ --> 模块 tests/ + tests/integration/ + tests/e2e/
eslint.config.mjs + playwright.config.mjs --> src/engineering/config/
```

封面母版含站点书名与作者信息，归 Site，不归通用 Book 算法。工具说明进入 Site 的 docs/guides，不建立第七个模块或旧路径跳转页。

测试依赖一个模块的实现与数据时随模块迁移；读取构建产物、跨模块源码、共享部署资产或生成参考的案例留在集成层。混合文件拆分时保留原用例名称与断言。

## 实施记录

在当前脏工作区原地执行，保留已有未提交内容。以当前文件为迁移来源，不以 HEAD 恢复文件，也不创建缺少未提交模块的新工作树。

### 任务 1：建立结构与入口验收

- [x] 修改 `test/module-layout.test.mjs`，要求六模块位于 src、CLI 位于所属模块、旧根入口不存在、测试发现覆盖模块及集成层。
- [x] 修改 `test/engineering-boundaries.test.mjs`，增加模块内 CLI 合法对照与跨模块 CLI、路径上跳非法对照。
- [x] 运行 `node --test test/module-layout.test.mjs test/engineering-boundaries.test.mjs`，确认新增断言因旧布局失败，而不是导入或语法错误。

核心结构断言：

```js
assert.ok(existsSync('src/engineering/api/index.mjs'));
assert.ok(existsSync('src/publishing/cli/publish.cjs'));
assert.equal(existsSync('scripts'), false);
assert.equal(existsSync('tools'), false);
assert.equal(existsSync('test'), false);
```

### 任务 2：迁移实现、CLI、配置及资产

- [x] 用文件移动补丁迁移 Engineering、三个 CLI、贡献指南和两份工程配置，不保留旧文件。
- [x] 调整 CLI 内部相对导入、引语快照地址、工程生成器来源及契约 tsconfig 路径。
- [x] 收紧 `src/engineering/internal/checks.mjs`：owns 只允许本模块根；applicationEntries 必须是本模块 cli 下的明确文件，禁止上跳。
- [x] 将封面 HTML/CSS 移动到 Site 并纳入格式检查；图片不改内容，核对迁移前后摘要；说明迁入 `src/site/docs/guides/cover-generator.md`，禁止覆盖 vendor。

### 任务 3：整理测试与命令

- [x] 将单模块案例归入 `src/<module>/tests/`，跨模块案例归入 `tests/integration/`，Playwright 案例归入 `tests/e2e/`。
- [x] 拆分首页配置、Turn 适配和文档契约中的混合案例，保持名称与断言。
- [x] 更新 package.json 的 Node 测试发现、格式、lint、契约、生成与服务命令；Playwright 显式配置 testDir、outputDir 和 webServer.cwd，不依赖配置的新目录。
- [x] 更新模块清单 tests、applicationEntries 和边界扫描；增加 CLI 副作用替身测试，不启动真实发布或巡检。

### 任务 4：同步 CI、部署与文档

- [x] 更新 `.github/workflows/deploy-webhook.yml` 的触发范围、测试路径、上传及安装路径；更新 systemd 的 ExecStart，不执行部署。
- [x] 更新全部当前文档的元数据、链接、命令及目录图；历史记录保留时点路径，新增本轮记录说明当前位置。
- [x] 更新外层工作区 AGENTS 的贡献指南链接，避免入口约定指向已删除文件。
- [x] 为 root 布局、模块 CLI 和测试归属补充规范；README 与架构图区分源码、测试和生成物。

## 验证证据

执行命令均在 blog 根进行。先建立旧布局下的失败断言，再运行迁移后的局部测试与全部门禁。

```sh
npm run check:docs
npm run check:boundaries
npm run check:contracts
npm run test:node
npm run verify
npm run test:e2e
git diff --check
```

另扫描当前资料和工作流中的旧路径；历史资料及“旧路径必须不存在”的测试断言不等同于过时入口。检查配置移动后仍发现所有 Node 和浏览器案例，没有以遗漏文件取得通过。

### 实际结果

环境：2026-10-05，本地 macOS、Node.js v24.14.1；命令在 blog 根执行。

| 验证                 | 本轮结果与范围                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 结构与边界红绿       | 原布局下 11 项中新增 4 项失败、7 项通过；迁移与规则修正后全部通过                                                                          |
| 工作流与生成来源红绿 | 新工作流路径和旧 Schema 来源说明各产生一个预期失败；同步源定义与 CI 后通过                                                                 |
| 清单完整性红绿       | 新增三个局部测试文件未登记时失败；登记后通过，不放宽检查                                                                                   |
| 完整工程门禁         | npm run verify 退出 0；格式、Lint、类型、文档、边界、Astro、构建和 162 项 Node 测试通过，无失败/跳过；Astro 0 errors、0 warnings、19 hints |
| 浏览器回归           | npm run test:e2e 退出 0；本轮构建产物、Chromium、11 项通过，无失败/跳过                                                                    |
| 测试发现             | 18 份模块 Node 文件、14 份全局集成 Node 文件、2 份 E2E 文件；清单与磁盘一致，混合文件拆分保留原具名断言                                    |
| CLI 与工具           | 新增 6 项离线案例通过；Publishing 显式启动一次，Operations 报告/退出/异常分支，Site 快照相对路径和两份封面素材存在性                       |
| 素材完整性           | 四张 JPEG 迁移前后 SHA-256 一致；未修改 public/vendor 或实际封面配置                                                                       |
| 独立只读复核         | 未发现 Critical/Important；修正入门指南的 src/content 旧路径和永久测试数量表述；复核未执行生产操作                                         |
| 文档导航与排版       | 当前资料 H2 目录名称、顺序和锚点另行扫描通过；生成参考来自新 CLI，日期回归仍通过；git diff --check 通过                                    |

初轮 Node 基线在沙箱内遇到 127.0.0.1 监听 EPERM；申请本机监听权限后 HTTP 基线 7 项通过。完整门禁和 E2E 使用获准的本地权限执行，不跳过 HTTP、不连接真实 GitHub。

根受控非隐藏文件由九份收拢为六份：README、AGENTS、package/lock、Astro 和 TypeScript 配置。源码组织目录由 src/docs/public/scripts/test/tools 收拢为 src/docs/public/tests；隐藏平台配置、依赖与生成目录保留。

旧文件和目录不再作为入口。文件内容迁到新位置；只移除空的旧目录，不执行整仓恢复或递归清空。贡献指南在 docs/guides，封面说明在 Site docs/guides，工程配置由 npm 直接定位，没有兼容转发或“文档已迁移”占位。

历史资料保留时点命令和结果，仅更新失效导航及元数据关联目标。更新关联关系时刷新 modified，文档 id 和 created 保持不变。

## 剩余限制

目录迁移没有改变发布、阅读和健康检查的业务算法；Engineering 的拥有关系及 CLI 登记规则已收紧。实际服务器尚未按新路径安装，CI 尚未由本轮推送触发；这些不能用本地绿灯代替。

没有提交、推送、部署、读取密钥或执行默认生产探针。服务器可能仍留有此前安装的旧文件，需在获准的部署与清理流程中核对；仓库不保留旧入口。浏览器证据限 Chromium，不承诺 Safari 或封面母版的新视觉设计已验收。
