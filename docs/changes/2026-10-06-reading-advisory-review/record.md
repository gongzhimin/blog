---
id: 'changes-2026-10-06-reading-advisory-review'
type: 'record'
status: 'active'
created: '2026-10-06'
modified: '2026-10-08'
scope: '六包阅读任务修正与依赖公告离线匹配'
owner: '项目维护者'
parent: 'docs/changes/README.md'
related:
  - 'docs/testing/strategy.md'
  - 'docs/standards/documentation.md'
---

# 阅读任务修正与依赖公告核对

目录：

- [范围](#范围)
- [实施记录](#实施记录)
- [验证证据](#验证证据)
- [剩余限制](#剩余限制)

## 范围

修正模拟贡献者阅读任务发现的事实与示例缺陷，核对关联文档。10 月 6—7 日下载公共公告数据库，在本机匹配 package-lock.json，未实施依赖升级。10 月 8 日按批准方案实施首批本地整改和有资源限制的合成回归。不上传依赖树，不执行 npm audit、生产探针或发布。

本轮是代理模拟走查，不是独立真人盲测。旧“48 项”没有保留原始 audit JSON，因此不能建立完整的一一对应关系；本记录以当前锁文件和公告快照建立可复核基线。

## 实施记录

### 10 月 8 日首批整改计划与边界

1. 在 Build 和 Site 已登记的 `public-api.test.mjs` 增加真实调用回归；先确认旧版本对畸形图片及 RSS 字段处理失败，保留正常图片对照。
2. 搜索应用源码及 Astro 配置，确认未使用 astro-paper 后，从根与 Site 声明删除；升级根/Build 的 image-size 至至少 2.0.3、根/Site 的 RSS 至至少 4.0.19，同步锁文件。
3. 安装禁用 audit 与生命周期脚本；同步模块测试方案，执行局部回归及 `verify:release`。
4. 优先使用原 OSV 数据库离线复扫，以相同口径比较；原 `evidence.json` 保留为整改前历史证据，不覆盖其锁文件身份。重启后临时数据库已丢失，本次改用持久化的 130 条公告范围重匹配，不能标为最新全库扫描。

本批不迁移 Astro 大版本、不升级主机或生产 Node、不部署、不推送。其余公告仍需逐项处理，不把减少命中数写成全部修复。

旧版失败证据：两模块局部测试退出 1，15 项中 11 项通过、4 项失败。ICNS/JXL 子进程在 128 MiB 堆上限内触发内存耗尽，主测试进程继续执行；RSS 的两种输入产生额外 XML 元素或属性。正常 PNG 对照通过。无攻击内容写入仓库图片目录。

### 10 月 8 日首批整改结果

- Astro 配置及应用源码没有 astro-paper 导入；移除根和 Site 的声明后，构建和浏览器回归通过。
- 锁定 image-size 2.0.4、RSS 4.0.19。前者满足已核对公告的修复下限 2.0.3；回归验证两个畸形图片退出并保留正文，两个 RSS 字段不再生成注入节点或属性。
- npm 安装报告移除 396 个实际安装包。锁文件比较移除 449 个记录（含平台与嵌套记录）、新增 0 个记录，仅上述两个路径改变版本；两种统计口径不同。
- Root、Build、Site 的依赖声明及锁文件同步，公开 API 不变。模块测试方案补充输入、判据、资源限制与覆盖边界。
- 已登记 patch Changeset；`npm run version:status` 退出 0，列出 Build、Site 及精确依赖消费者 Tooling。版本尚未应用，未发布、创建 tag 或提交。应用版本后必须重新验收。
- 原始 `evidence.json` 保留不变。[整改后基线重匹配](after-remediation.json) 保存当前锁文件哈希、消除项和剩余项；不能用该文件替代新公告发现。

### 阅读任务修正

- Runtime README、设计和教程明确只负责分页及页码映射；Turn.js、URL 和交互生命周期由 Site 负责。
- Runtime 示例断言固定夹具的 6 个 HTML 页面、8 页物理总轴、正文起页 6、文章映射及测量节点清理；失败示例检查错误 code。
- Site API、README 和教程说明下游 Markdown 渲染可能读取本地图片；Build API 同步该副作用，删除无条件“无文件读取”描述。
- Site 教程明确先构建再验证 dist，区分内存示例与构建产物的清理。
- Publishing 与 Operations 区分安全导入、内部替身测试和公开入口端到端证据；教程给出实际输出和具名失败用例，不要求先读内部源码。
- 没有发现这些阅读缺陷需要修改已确认的代码契约，本轮未修改实现或依赖。

### 逐项确认方法

1. 固定锁文件哈希、工具版本、数据库时间与完整性证据。不能把陈旧缓存作为当前审计结果。
2. 对每条公告确认包名、安装版本、受影响范围、修复事件、公告更新时间及撤回状态；CVE 与 GHSA 别名不重复计数。
3. 用 `npm explain --offline 包名` 定位引入链。区分根依赖、旧嵌套版本、可选平台版本和实际部署安装，不把锁文件条目等同于线上安装。
4. 阅读公告的触发条件和修复提交，定位项目调用链、攻击者可控输入、运行环境及既有约束。状态从“版本命中”变为“可达待验证”“当前条件不触发”或“待查”，必须留下依据。
5. 对可达项在隔离夹具中建立有资源上限的回归，先验证旧版本失败，再验证修复版本；禁止在主进程运行无限循环或大规模解压 PoC。
6. 选择覆盖同包全部命中公告的版本，检查 Node/框架兼容性和上游依赖约束。升级后执行完整工程及浏览器门禁，再用同一快照复扫；最后更新快照检查新增公告。
7. 只有版本已修复且相关回归通过才标记“已修复”。“当前条件不触发”不是关闭漏洞，也不允许凭严重等级自动认定项目可被攻击。

参考：[OSV 离线模式](https://google.github.io/osv-scanner/usage/offline-mode/) 与 [公共数据导出](https://google.github.io/osv.dev/data/)。官方离线说明中的缓存目录与 v2.6.0 实际行为不一致；本次使用 osv-scalibr 子目录，并设置两个缓存变量。首次数据库定位失败退出 127，不记为零漏洞；修正位置后读取数据库成功。

### 10 月 6—7 日触发条件初核（整改前）

| 包与公告                                                                                                                                   | 项目证据                                                                                                 | 当前结论                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| image-size 2.0.2：[ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)、[JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | Build 的 markdown-renderer.mjs 在图片存在时读取字节并调用 imageSize；同步死循环不能由外围 try/catch 恢复 | 存在调用路径；恶意图片是否可进入内容仓库需结合发布权限判断。两公告修复版本为 2.0.3；未升级、未执行死循环 PoC                      |
| @astrojs/rss 2.4.4、4.0.18：[XML 注入](https://github.com/advisories/GHSA-8j5q-mfj2-5q9q)                                                  | Site 的 rss.xml.js 映射 title/pubDate/description/link，不传 source.title 或 enclosure.type              | 当前字段映射不触发该公告条件；版本仍受影响，修复版本为 4.0.19；不代表其他 RSS 公告已排除                                          |
| tar 7.5.13：[解压资源耗尽](https://github.com/advisories/GHSA-23hp-3jrh-7fpw)                                                              | 引入链为 astro-icon → @iconify/tools → tar                                                               | 已核对当前图标加载不调用解包 helper。该公告的 7.5.19 不能作为全部 tar 公告的修复结论；六条公告最大已列修复为 7.5.21，仍需兼容试验 |

astro-paper 2.2.0 引入旧 Astro 2.10.15 等嵌套依赖；当前应用源文件搜索未发现 astro-paper 导入。是否可以删除仍需核对框架配置、资源和构建结果，不在本次审查中自动删除。

## 验证证据

### 10 月 8 日整改验收

- Node v24.14.1；安装命令 `npm install --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org` 退出 0，只获取公开依赖，无 audit 上传或安装脚本。此前离线安装因缓存缺失退出 1，不记为成功。
- `node --test packages/book-build/tests/public-api.test.mjs packages/site/tests/public-api.test.mjs` 升级后退出 0，15 项通过、无失败或跳过；旧版同命令的 4 项失败见实施记录。
- 首次 `npm run verify:release` 在受限沙箱中退出 1，206 项 Node 测试中 6 项因 `listen EPERM 127.0.0.1` 失败，后续隔离消费及 Chromium 未执行。没有删测试或放宽断言。
- 在允许本地回环监听的环境重跑 `npm run verify:release`，退出 0：完整工程门禁、206 项 Node 测试、实际 tarball 隔离消费与类型检查、19 项 Chromium 测试通过。Astro 检查 127 个文件，错误、警告、提示均为 0。浏览器工具有 NO_COLOR/FORCE_COLOR 环境警告，不影响测试退出码。
- 基线重匹配退出 0：遍历现锁文件的包名/版本，按持久化公告中的 SEMVER introduced、fixed、last_affected、limit 区间比较并按公告 ID 去重。命中从 32 个包名／42 个包版本／130 条公告变为 19／21／79；51 条不再命中。它不是旧 npm audit 的“48 项”统计，也不是 51 项生产漏洞已修复。
- 当前锁文件 SHA-256：`8618e22b37966bb8c00792ed45af1018f3aba9691d19d20e8aeb6e83c28b2140`。未复用旧锁文件或旧浏览器通过结果。

### 文档与工程

- 本次继续评审后的 `npm run verify` 再次退出 0，201 项 Node 测试通过，无失败、取消、跳过或 TODO；Astro 仍为零错误、警告和提示。
- 审查快照与官方扫描逐条比较：130 个唯一 ID、32 个包证据、每项 affected ranges 一致；锁文件哈希未变化。补存公告别名、发布时间及撤回状态，不依赖临时原始 JSON 永久存在。
- 更新后的 Runtime README/教程、Site、Publishing、Operations 安全示例实际执行退出 0，输出与文档一致。
- Operations 替身测试 7 项、Publishing 非监听测试 19 项通过；不将它们记为生产公开入口验收。
- `npm run verify` 退出 0：格式、lint、类型契约、文档、模块边界、测试发现、Astro 检查、构建和 201 项 Node 测试通过；无失败或跳过，Astro 无错误、警告或提示。
- 本轮未修改浏览器行为，未重新执行 E2E；不复用旧浏览器结果作为本轮证据。

### 离线匹配

- 本次继续核对：对全部 32 个包运行离线依赖解释，复跑官方离线扫描，结果仍为 42 个包版本和 130 条公告；退出 1 表示版本命中。未启用网络或调用分析。

- 工具：官方 OSV-Scanner v2.6.0，darwin arm64；二进制 SHA-256 为 `98c460dcd37de25819babd757d04542045b6243113e209edcd4d89fedb0256b4`，与官方发布校验文件一致。没有执行完整 SLSA provenance 验证。
- 数据库：OSV npm 全量快照，HTTP Last-Modified 为 2026-10-06 14:02:43 UTC，217773166 字节；MD5 `1155b71f774887f9ce9a76b0bce64864` 与 GCS ETag 一致。
- 锁文件 SHA-256：`5298add7303a0d531f8614a15f9ed1ea050ac2db6b490fd4bf06ddebcb8cccea`。
- 读取 1101 个包记录，过滤 6 个本地/不可扫描包；命中 32 个不同包名、42 个包版本、130 个不同公告 ID，结果中没有撤回公告。
- 扫描成功加载本地数据库，退出 1 表示存在命中，不是执行错误。未启用调用分析，所以结果只证明版本范围匹配。
- 原始 JSON 和下载文件保留在本机临时目录 `/private/tmp/myblog-advisory-review.lpGXr3/`，未加入源码；临时目录不保证永久保留。下表保留完整命中身份，便于继续逐项处理。

本次实际执行命令（在 blog 根目录；目录与二进制已下载并核验，不适合直接复制到其他机器）：

```sh
OSV_SCALIBR_LOCAL_DB_CACHE_DIRECTORY=/private/tmp/myblog-advisory-review.lpGXr3/db \
OSV_SCANNER_LOCAL_DB_CACHE_DIRECTORY=/private/tmp/myblog-advisory-review.lpGXr3/db \
/private/tmp/myblog-advisory-review.lpGXr3/osv-scanner scan source \
  --offline --lockfile=package-lock.json --format=json \
  --output-file=/private/tmp/myblog-advisory-review.lpGXr3/osv-report.json
```

### 完整逐项静态评审

130 条公告均已核对包版本、引入链和当前输入条件。以下状态都是本地静态证据，不表示攻击复现或生产验收：

- “当前条件不触发”：本轮检查的调用方式缺少公告所需条件；条件变化必须重审，不是永久豁免。
- “当前入口未发现调用”：未找到业务调用路径，不等于证明所有第三方动态调用不可达。
- “条件可达”：相应输入可进入解析/构建路径，尚未执行攻击样例，不宣称已被利用。
- “待确认”：缺少确切间接参数或原生生产环境证据；列明所缺信息，不将其归为低风险。
- 所有命中仍未修复，未得到维护者风险接受；不以“静态不触发”从锁文件结果中删除。

引入链来自本轮对全部 32 个包执行的 `npm explain --offline --json`；实现证据来自当前业务源码、配置、CI 和安装的第三方调用点。公告范围、别名、修改日期及评审证据保存为 [审查快照](evidence.json)，不是运行时配置。原始英文问题名用于精确对照公告，中文条件写在各包条目中。

“公告修复版本”列保留公告的多个维护分支，不代表任意一个都可直接替换当前版本。没有 fixed 事件的公告写“公告未列出”；last_affected 不被伪装成修复版本。升级前必须合并同包全部范围并检查兼容性。

#### @astrojs/rss

- 命中版本：2.4.4、4.0.18。
- 引入链及责任：Site；root → RSS 4.0.18；astro-paper → RSS 2.4.4。
- 触发与项目证据：当前 Site 的 rss.xml.js 不传 source/enclosure。根 RSS 会生成 XML，旧嵌套 RSS 尚未发现调用。加入 source.title/enclosure.type 时重新评审。

| 公告                                                                     | 公告问题                                                  | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | --------------------------------------------------------- | ------------ | -------------- |
| [GHSA-8j5q-mfj2-5q9q](https://github.com/advisories/GHSA-8j5q-mfj2-5q9q) | @astrojs/rss: XML Injection via Unescaped RSS Feed Fields | 4.0.19       | 当前条件不触发 |

#### @babel/core

- 命中版本：7.29.0。
- 引入链及责任：astro-paper → Astro 2 → Babel 7.29.0。
- 触发与项目证据：旧 Astro 的编译链可能读取 sourceMappingURL；项目只运行根 Astro 6，未发现旧主题代码导入。不能把安装时存在解释为正在编译不可信 JS。

| 公告                                                                     | 公告问题                                                      | 公告修复版本        | 静态评审状态       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------- | ------------------ |
| [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) | @babel/core: Arbitrary File Read via sourceMappingURL Comment | 8.0.0-rc.6 / 7.29.6 | 当前入口未发现调用 |

#### @fastify/busboy

- 命中版本：2.1.1。
- 引入链及责任：astro-paper → @astrojs/webapi → undici 5 → busboy。
- 触发与项目证据：Publishing 使用 node:http 和 JSON.parse，不接收 multipart，也不调用 formData；JSDOM 默认不执行输入脚本。没有发现文件名/字段名进入 Busboy 再进入文件或响应头的路径。

| 公告                                                                     | 公告问题                                                                                         | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------ | -------------- |
| [GHSA-gxm5-99cw-xjw9](https://github.com/advisories/GHSA-gxm5-99cw-xjw9) | @fastify/busboy vulnerable to CRLF injection via multipart Content-Disposition filename and name | 3.2.2        | 当前条件不触发 |
| [GHSA-x8mw-p69m-v3mx](https://github.com/advisories/GHSA-x8mw-p69m-v3mx) | @fastify/busboy vulnerable to Denial of Service via prototype-named multipart part header        | 3.2.1        | 当前条件不触发 |

#### astro

- 命中版本：2.10.15、6.1.5。
- 引入链及责任：Site/根 → Astro 6.1.5；astro-paper → Astro 2.10.15。
- 触发与项目证据：astro.config.mjs 未配置 adapter、非根 base 或 SSR；CI 只部署 dist。Site 未发现 middleware、actions、server:defer、client:*、define:vars 或 View Transition 指令。BookShell 展开对象的键由源码固定，post.data 先经内容 Schema。静态部署不排除构建期 XSS 和开发期图片处理风险。旧 Astro 2 尚未发现启动路径。

| 公告                                                                     | 公告问题                                                                                                 | 公告修复版本     | 静态评审状态         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------- | -------------------- |
| [GHSA-26w7-cxv4-gfx2](https://github.com/advisories/GHSA-26w7-cxv4-gfx2) | Astro: Remote code execution through AVIF image optimization                                             | 7.2.8            | 开发图片输入条件可达 |
| [GHSA-2pvr-wf23-7pc7](https://github.com/advisories/GHSA-2pvr-wf23-7pc7) | Astro: Host header SSRF in prerendered error page fetch                                                  | 6.4.6            | 当前条件不触发       |
| [GHSA-376h-93r7-7g6f](https://github.com/advisories/GHSA-376h-93r7-7g6f) | Astro: Authorization bypass from missing path-segment boundary check when stripping the configured base  | 7.2.4            | 当前条件不触发       |
| [GHSA-49w6-73cw-chjr](https://github.com/advisories/GHSA-49w6-73cw-chjr) | Astro's server source code is exposed to the public if sourcemaps are enabled                            | 5.0.8 / 4.16.18  | 当前条件不触发       |
| [GHSA-4g3v-8h47-v7g6](https://github.com/advisories/GHSA-4g3v-8h47-v7g6) | Astro: Reflected XSS via unescaped View Transition animation properties                                  | 7.1.0            | 当前条件不触发       |
| [GHSA-5ff5-9fcw-vg88](https://github.com/advisories/GHSA-5ff5-9fcw-vg88) | Astro's `X-Forwarded-Host` is reflected without validation                                               | 5.14.3           | 当前条件不触发       |
| [GHSA-7pw4-f3q4-r2p2](https://github.com/advisories/GHSA-7pw4-f3q4-r2p2) | Astro: Cross-site scripting via unescaped transition:* directive values on hydrated islands              | 7.0.4            | 当前条件不触发       |
| [GHSA-8hv8-536x-4wqp](https://github.com/advisories/GHSA-8hv8-536x-4wqp) | Astro: Reflected XSS via unescaped slot name                                                             | 6.3.3            | 当前条件不触发       |
| [GHSA-c4pw-33h3-35xw](https://github.com/advisories/GHSA-c4pw-33h3-35xw) | Atro CSRF Middleware Bypass (security.checkOrigin)                                                       | 4.16.17          | 当前条件不触发       |
| [GHSA-f48w-9m4c-m7f5](https://github.com/advisories/GHSA-f48w-9m4c-m7f5) | Astro: XSS via unescaped spread attribute names in renderHTMLElement (incomplete fix for CVE-2026-54298) | 7.0.6            | 当前条件不触发       |
| [GHSA-fvmw-cj7j-j39q](https://github.com/advisories/GHSA-fvmw-cj7j-j39q) | Astro Cloudflare adapter has Stored Cross-site Scripting vulnerability in /_image endpoint               | 5.15.9           | 当前条件不触发       |
| [GHSA-g735-7g2w-hh3f](https://github.com/advisories/GHSA-g735-7g2w-hh3f) | Astro: Remote allowlist bypass via unanchored matchPathname wildcard                                     | 5.18.1           | 当前条件不触发       |
| [GHSA-ggxq-hp9w-j794](https://github.com/advisories/GHSA-ggxq-hp9w-j794) | Astro's middleware authentication checks based on url.pathname can be bypassed via url encoded values    | 5.15.8           | 当前条件不触发       |
| [GHSA-j687-52p2-xcff](https://github.com/advisories/GHSA-j687-52p2-xcff) | Astro: XSS in define:vars via incomplete </script> tag sanitization                                      | 6.1.6            | 当前条件不触发       |
| [GHSA-jrpj-wcv7-9fh9](https://github.com/advisories/GHSA-jrpj-wcv7-9fh9) | Astro: XSS via Unescaped Attribute Names in Spread Props                                                 | 6.4.6            | 当前条件不触发       |
| [GHSA-whqg-ppgf-wp8c](https://github.com/advisories/GHSA-whqg-ppgf-wp8c) | Astro has an Authentication Bypass via Double URL Encoding, a bypass for CVE-2025-64765                  | 5.15.8           | 当前条件不触发       |
| [GHSA-wrwg-2hg8-v723](https://github.com/advisories/GHSA-wrwg-2hg8-v723) | Astro vulnerable to reflected XSS via the server islands feature                                         | 5.15.8           | 当前条件不触发       |
| [GHSA-x3h8-62x9-952g](https://github.com/advisories/GHSA-x3h8-62x9-952g) | Astro Development Server has Arbitrary Local File Read                                                   | 5.14.3           | 旧开发入口未发现调用 |
| [GHSA-xf8x-j4p2-f749](https://github.com/advisories/GHSA-xf8x-j4p2-f749) | Astro allows unauthorized third-party images in _image endpoint                                          | 5.13.2 / 4.16.19 | 当前条件不触发       |
| [GHSA-xr5h-phrj-8vxv](https://github.com/advisories/GHSA-xr5h-phrj-8vxv) | Astro: Server island encrypted parameters vulnerable to cross-component replay                           | 6.1.10           | 当前条件不触发       |

#### baseline-browser-mapping

- 命中版本：2.10.18。
- 引入链及责任：Babel → browserslist → baseline-browser-mapping。
- 触发与项目证据：触发需要调用者提供非法/冲突参数。应用未直接调用该 API；间接 Babel 配置来自受信工程文件，未发现公开请求控制参数的路径。

| 公告                                                                     | 公告问题                                                                               | 公告修复版本 | 静态评审状态       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------ | ------------------ |
| [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | baseline-browser-mapping process termination on invalid input causes denial of service | 2.11.0       | 当前公开输入不触发 |

#### brace-expansion

- 命中版本：1.1.14。
- 引入链及责任：旧 Tailwind/工具 → minimatch 3 → brace-expansion 1.1.14。
- 触发与项目证据：固定的仓库 glob 与恶意可控 pattern 不同。当前应用没有接受 HTTP glob 的接口；不可信 PR 修改构建配置时仍可能攻击 CI。ESLint 的另两份 5.0.12 不在此次命中中，不应跟随 1.x 强制降级。

| 公告                                                                     | 公告问题                                                                                        | 公告修复版本                    | 静态评审状态     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------- | ---------------- |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | brace-expansion: DoS via exponential-time expansion of consecutive non-expanding {} groups      | 5.0.7 / 1.1.16 / 2.1.2          | 构建配置条件可达 |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | brace-expansion: DoS via uncontrolled recursion in parseCommaParts causing stack exhaustion     | 5.0.10 / 3.0.7 / 2.1.5 / 1.1.19 | 构建配置条件可达 |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash      | 5.0.8 / 3.0.3 / 2.1.3 / 1.1.17  | 构建配置条件可达 |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | brace-expansion: Quadratic-time expansion of the `{a},b}` rewrite causes CPU denial of service  | 5.0.12 / 3.0.9 / 2.1.7 / 1.1.21 | 构建配置条件可达 |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | brace-expansion: DoS via uncontrolled recursion on nested brace groups causing stack exhaustion | 5.0.11 / 3.0.8 / 2.1.6 / 1.1.20 | 构建配置条件可达 |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | brace-expansion: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation | 1.1.18 / 2.1.4 / 3.0.6 / 5.0.9  | 构建配置条件可达 |

#### braces

- 命中版本：3.0.3。
- 引入链及责任：chokidar 3/micromatch 4 → braces 3.0.3。
- 触发与项目证据：深层 brace pattern 可令递归 AST 栈耗尽；未发现公开输入作为 glob，工程配置/PR 可改变 pattern。公告未提供修复版本，需上游处理或隔离构建任务，不能虚构 3.0.4 修复。

| 公告                                                                     | 公告问题                                                                               | 公告修复版本 | 静态评审状态     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------ | ---------------- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | braces vulnerable to stack-exhaustion denial of service through deeply nested patterns | 公告未列出   | 构建配置条件可达 |

#### browserslist

- 命中版本：4.28.2。
- 引入链及责任：旧 Babel 构建目标 → browserslist 4.28.2。
- 触发与项目证据：恶意 browserslist-stats.json 或大量不同查询会触发；公开文章字段不被当作查询。审查不可信 PR 的构建统计文件，不能仅关闭单个查询来证明缓存有界。

| 公告                                                                     | 公告问题                                                                                                           | 公告修复版本 | 静态评审状态     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------ | ---------------- |
| [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | Browserslist: Uncaught crash / prototype write via untrusted browserslist-stats.json custom stats (normalizeStats) | 4.28.7       | 构建配置条件可达 |
| [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | Browserslist: Unbounded memory growth (no cache eviction) via distinct query results, leading to eventual OOM      | 4.28.7       | 构建配置条件可达 |

#### cookie

- 命中版本：0.5.0。
- 引入链及责任：astro-paper → Astro 2 → cookie 0.5.0。
- 触发与项目证据：旧 Astro 未启动；Site 无 Cookie 鉴权/序列化路由，Publishing token 在 JSON。根 Astro 的 cookie 1.1.1 不在此次命中中。

| 公告                                                                     | 公告问题                                                                   | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------ | -------------- |
| [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) | cookie accepts cookie name, path, and domain with out of bounds characters | 0.7.0        | 当前条件不触发 |

#### devalue

- 命中版本：4.3.3、5.7.1。
- 引入链及责任：Astro 6 → devalue 5.7.1；旧 Astro 2 → devalue 4.3.3。
- 触发与项目证据：当前 Astro 数据层确实调用 unflatten，不能写成全包不可达。输入由本地内容缓存生成；当前 Schema 为日期、字符串、布尔和普通数组，无 Buffer/custom ArrayBuffer reviver，也没有 Actions/server islands。损坏或恶意改写缓存仍属于构建输入风险。

| 公告                                                                     | 公告问题                                                                                                | 公告修复版本 | 静态评审状态           |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------ | ---------------------- |
| [GHSA-33hq-fvwr-56pm](https://github.com/advisories/GHSA-33hq-fvwr-56pm) | devalue affected by CPU and memory amplification from sparse arrays                                     | 5.6.3        | 构建输入条件可达       |
| [GHSA-4q55-j62x-fr9h](https://github.com/advisories/GHSA-4q55-j62x-fr9h) | devalue: Malformed null-prototype object keys bypass **proto** rejection via property-key coercion      | 5.9.3        | 构建输入条件可达       |
| [GHSA-77vg-94rm-hx3p](https://github.com/advisories/GHSA-77vg-94rm-hx3p) | Svelte devalue: DoS via sparse array deserialization                                                    | 5.8.1        | 构建输入条件可达       |
| [GHSA-8qm3-746x-r74r](https://github.com/advisories/GHSA-8qm3-746x-r74r) | devalue `uneval`ed code can create objects with polluted prototypes when `eval`ed                       | 5.6.3        | 当前未发现 uneval 入口 |
| [GHSA-9rgm-9g3h-6x36](https://github.com/advisories/GHSA-9rgm-9g3h-6x36) | Svelte devalue: DoS via malformed input                                                                 | 5.9.2        | 构建输入条件可达       |
| [GHSA-cfw5-2vxh-hr84](https://github.com/advisories/GHSA-cfw5-2vxh-hr84) | devalue has prototype pollution in devalue.parse and devalue.unflatten                                  | 5.6.4        | 构建输入条件可达       |
| [GHSA-hx4r-w6wj-j8fg](https://github.com/advisories/GHSA-hx4r-w6wj-j8fg) | devalue: Residual sparse-array CPU amplification in uneval                                              | 5.9.3        | 当前未发现 uneval 入口 |
| [GHSA-j22f-vq7h-c4qm](https://github.com/advisories/GHSA-j22f-vq7h-c4qm) | devalue: `stringify`/`uneval` serialize shared memory                                                   | 5.9.3        | 当前无 Buffer 载荷     |
| [GHSA-mcm9-63f2-9j32](https://github.com/advisories/GHSA-mcm9-63f2-9j32) | devalue: Repeated primitive strings cause quadratic expansion in uneval                                 | 5.9.3        | 当前未发现 uneval 入口 |
| [GHSA-mwv9-gp5h-frr4](https://github.com/advisories/GHSA-mwv9-gp5h-frr4) | Sveltejs devalue's `devalue.parse` and `devalue.unflatten` emit objects with `__proto__` own properties | 5.6.4        | 构建输入条件可达       |
| [GHSA-r9w8-h9r3-54w4](https://github.com/advisories/GHSA-r9w8-h9r3-54w4) | devalue: Custom ArrayBuffer revivers can bypass typed-array allocation validation                       | 5.9.3        | 构建输入条件可达       |
| [GHSA-vj54-72f3-p5jv](https://github.com/advisories/GHSA-vj54-72f3-p5jv) | devalue prototype pollution vulnerability                                                               | 5.3.2        | 构建输入条件可达       |
| [GHSA-wf3x-273g-mvxv](https://github.com/advisories/GHSA-wf3x-273g-mvxv) | devalue: Sparse arrays emitted by uneval cause eager allocation when evaluated                          | 5.9.3        | 当前未发现 uneval 入口 |

#### esbuild

- 命中版本：0.17.19、0.18.20、0.27.7。
- 引入链及责任：根 Astro/Vite → 0.27.7；旧 Astro/Vite → 0.17.19、0.18.20。
- 触发与项目证据：公告针对 esbuild 自己的 serve()，不是所有使用 esbuild 转换源码的 Vite 服务器。项目 scripts 和实现未发现 esbuild serve 调用；Windows 特定公告也不适用于本机 macOS。

| 公告                                                                     | 公告问题                                                                                         | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------ | -------------- |
| [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | esbuild enables any website to send any requests to the development server and read the response | 0.25.0       | 当前条件不触发 |
| [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | esbuild allows arbitrary file read when running the development server on Windows                | 0.28.1       | 当前条件不触发 |

#### extract-zip

- 命中版本：2.0.1。
- 引入链及责任：astro-icon → @iconify/tools → extract-zip 2.0.1。
- 触发与项目证据：Iconify 导出 unzip，但当前插件 loadIconifyCollections 读已安装 JSON，loadLocalCollection 读本地 SVG；没有调用下载/解包 helper。仅 import 不执行解包。公告未提供修复版本，启用远程归档导入前必须处理符号链接及目标目录约束。

| 公告                                                                     | 公告问题                                                                 | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------ | -------------- |
| [GHSA-7pqw-9j4j-h8q3](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3) | extract-zip allows arbitrary file writes through symlink archive entries | 公告未列出   | 当前入口不触发 |
| [GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) | extract-zip unvalidated symlink path traversal                           | 公告未列出   | 当前入口不触发 |

#### fast-uri

- 命中版本：3.1.2。
- 引入链及责任：Build 的 Ajv 8.20.0 → fast-uri 3.1.2。
- 触发与项目证据：Build 编译本地固定 Schema，未配置 loadSchema/远端 $ref，也不以 fast-uri 执行出站 URL 白名单。八条公告涉及 URI 解析与实际网络消费者之间的差异；Publishing 的固定 GitHub URL 不经过 fast-uri。

| 公告                                                                     | 公告问题                                                                                  | 公告修复版本          | 静态评审状态   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------- | -------------- |
| [GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6) | fast-uri vulnerable to host confusion via failed IDN canonicalization                     | 4.0.1 / 3.1.3 / 2.4.2 | 当前条件不触发 |
| [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) | fast-uri vulnerable to host confusion via backslash authority introducer                  | 2.4.4 / 3.1.5 / 4.1.2 | 当前条件不触发 |
| [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) | fast-uri vulnerable to server-side request forgery via malformed IPv6 normalization       | 2.4.5 / 3.1.6 / 4.1.3 | 当前条件不触发 |
| [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) | fast-uri vulnerable to server-side request forgery via repeated hostname percent-decoding | 2.4.5 / 3.1.6 / 4.1.3 | 当前条件不触发 |
| [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) | fast-uri vulnerable to inconsistent host case normalization via percent-encoded octets    | 2.4.7 / 3.1.8 / 4.1.5 | 当前条件不触发 |
| [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | fast-uri vulnerable to host confusion via percent-encoded scheme normalization            | 2.4.5 / 3.1.6 / 4.1.3 | 当前条件不触发 |
| [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) | fast-uri vulnerable to authority injection via an unvalidated port in serialize           | 2.4.6 / 3.1.7 / 4.1.4 | 当前条件不触发 |
| [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) | fast-uri vulnerable to host confusion via literal backslash authority delimiter           | 2.4.3 / 3.1.4 / 4.1.1 | 当前条件不触发 |

#### fast-xml-builder

- 命中版本：1.1.4。
- 引入链及责任：Site → RSS 4.0.18 → fast-xml-parser 5.5.12 → builder 1.1.4。
- 触发与项目证据：RSS 的 xmlOptions 未关闭 processEntities，当前 URL 与语言字段不来自任意 XML 属性对象。该公告要求属性值含引号且关闭实体处理；必须与另一个 comment/CDATA 公告分开判断。

| 公告                                                                     | 公告问题                                                                                                 | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------ | -------------- |
| [GHSA-5wm8-gmm8-39j9](https://github.com/advisories/GHSA-5wm8-gmm8-39j9) | fast-xml-builder allows attribute values with unwanted quotes to bypass malicious or unwanted attributes | 1.1.7        | 当前条件不触发 |

#### fast-xml-parser

- 命中版本：4.5.6、5.5.12。
- 引入链及责任：RSS 4.0.18 → 5.5.12；旧 RSS → 4.5.6。
- 触发与项目证据：当前 RSS 只将 description 作为文本，未配置 commentPropName/cdataPropName；customData 是固定 language XML。加入评论节点、CDATA 或任意 customData 时必须重审。

| 公告                                                                     | 公告问题                                                                             | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------ | -------------- |
| [GHSA-gh4j-gqv2-49f6](https://github.com/advisories/GHSA-gh4j-gqv2-49f6) | fast-xml-parser XMLBuilder: XML Comment and CDATA Injection via Unescaped Delimiters | 5.7.0        | 当前条件不触发 |

#### fflate

- 命中版本：0.7.4。
- 引入链及责任：tex-linebreak → @shuding/opentype.js → fflate 0.7.4。
- 触发与项目证据：安装的 opentype.js 导入 inflateSync，公告针对 unzipSync 的 ZIP64 目录遍历，不是全部解压函数。当前业务源码未发现 tex-linebreak 或 unzipSync 调用；不推导所有 inflateSync 安全。

| 公告                                                                     | 公告问题                                                                          | 公告修复版本                           | 静态评审状态   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------- | -------------- |
| [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98) | fflate unzipSync can enter an infinite loop when parsing malformed ZIP64 archives | 0.4.9 / 0.5.4 / 0.6.11 / 0.7.5 / 0.8.3 | 当前入口不触发 |

#### http-cache-semantics

- 命中版本：4.2.0。
- 引入链及责任：根/旧 Astro → http-cache-semantics 4.2.0。
- 触发与项目证据：Astro 的 assets/build/remote.js 构造图片缓存策略，当前未使用跨用户 HTTP 代理或接收客户端 max-stale 的共享缓存。未发现 Astro 图片组件或远端图片 loader。公告未提供修复版本；不得将其判断外推到生产 Nginx 缓存。

| 公告                                                                     | 公告问题                                                                         | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------ | -------------- |
| [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) | http-cache-semantics max-stale handling can disclose cross-user cached responses | 公告未列出   | 当前条件不触发 |

#### image-size

- 命中版本：2.0.2。
- 引入链及责任：Book Build/root → image-size 2.0.2。
- 触发与项目证据：renderMarkdown → injectImageDimensions → readFileSync → imageSize：本地图片字节进入受影响解析器。Publishing 可以写图片，后续 CI 会构建；需发布权限或仓库写入权，不是静态访客直连 Node 解析器。同步无限循环不能被外层 try/catch 终止。

| 公告                                                                     | 公告问题                                                                        | 公告修复版本 | 静态评审状态     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------ | ---------------- |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | image-size: JXL and HEIF parsers allow denial of service through infinite loops | 2.0.3        | 内容输入条件可达 |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | image-size: ICNS parser allows denial of service through an infinite loop       | 2.0.3        | 内容输入条件可达 |

#### js-yaml

- 命中版本：3.14.2。
- 引入链及责任：旧 Astro → gray-matter → js-yaml 3.14.2；工作区工具 → load-yaml-file → 3.14.2。
- 触发与项目证据：两份 3.x 使用 safeLoad，safe 不意味着没有算法 DoS。旧主题未发现调用；另一路可能解析工程锁文件，需防范不可信 PR。根 Astro/Tooling 使用 4.3.2，不在本次命中中；Tooling 还显式使用 JSON_SCHEMA。

| 公告                                                                     | 公告问题                                                                                                  | 公告修复版本   | 静态评审状态     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------- | ---------------- |
| [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources                                 | 4.3.2 / 3.15.2 | 工程输入条件可达 |
| [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) | js-yaml: YAML merge-key chains can force quadratic CPU consumption                                        | 3.15.0 / 4.3.0 | 工程输入条件可达 |
| [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported | 4.3.1 / 3.15.1 | 工程输入条件可达 |
| [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) | JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases                              | 4.2.0 / 3.15.0 | 工程输入条件可达 |

#### katex

- 命中版本：0.17.0。
- 引入链及责任：Book Build/Site → KaTeX 0.17.0。
- 触发与项目证据：Book Build 调用 renderToString 并插入生成 HTML，未显式设 trust。公告需要原型已经污染或攻击者控制 options 原型；KaTeX 自己不提供该污染能力。本轮未证明前置污染链存在，也不能只因默认 trust=false 判安全。

| 公告                                                                     | 公告问题                                                          | 公告修复版本 | 静态评审状态     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------ | ---------------- |
| [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) | KaTeX: Existing prototype pollution can bypass trust restrictions | 0.18.2       | 前置污染链待确认 |

#### nanoid

- 命中版本：3.3.11。
- 引入链及责任：PostCSS → nanoid 3.3.11。
- 触发与项目证据：实际 node_modules/postcss/lib/input.js 使用 nanoid/non-secure 的 nanoid(6)，不是攻击者传入的负数、零或超大整数。当前没有 customAlphabet/customRandom 入口。

| 公告                                                                     | 公告问题                                                               | 公告修复版本    | 静态评审状态   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------- | -------------- |
| [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | nanoid: non-secure generators can loop indefinitely with negative size | 3.3.16 / 5.1.16 | 当前条件不触发 |
| [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | nanoid: custom generators can loop indefinitely when size is zero      | 3.3.18 / 5.1.6  | 当前条件不触发 |
| [GHSA-xwg4-73v4-xw9w](https://github.com/advisories/GHSA-xwg4-73v4-xw9w) | nanoid: Integer Overflow or Wraparound                                 | 3.3.12 / 5.1.11 | 当前条件不触发 |

#### postcss

- 命中版本：8.5.9。
- 引入链及责任：根 Vite 7/旧 Vite 4/Tailwind 3 → PostCSS 8.5.9。
- 触发与项目证据：构建实际处理仓库 CSS；恶意 sourceMappingURL 可进入本地读盘链，尤其不可信 PR。Site 也将配置 CSS 插入 style，内容受信不代表上下文转义得到保证。用户正文不被当作 CSS，但受信边界破坏时条件可达。

| 公告                                                                     | 公告问题                                                                                                                              | 公告修复版本 | 静态评审状态     |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------- |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | PostCSS: Arbitrary file read and information disclosure via attacker-controlled sourceMappingURL in CSS comments                      | 8.5.12       | 构建输入条件可达 |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | PostCSS: incomplete fix of GHSA-6g55-p6wh-862q — attacker-controlled sourceMappingURL reads arbitrary .map files when `from` is unset | 8.5.23       | 构建输入条件可达 |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output                                                                    | 8.5.10       | 构建输入条件可达 |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | PostCSS: Path Traversal in Previous Source Map Auto-Loading (sourceMappingURL) leads to Arbitrary .map File Disclosure                | 8.5.18       | 构建输入条件可达 |

#### postcss-selector-parser

- 命中版本：6.1.2。
- 引入链及责任：旧 Tailwind 3/postcss-nested → parser 6.1.2。
- 触发与项目证据：CSS selector 来自构建文件而非公开请求。深度递归修复 6.1.3 不覆盖平面选择器二次复杂度；后者公告只列 7.1.6，不能假设任意 6.x 更新已修复全部。

| 公告                                                                     | 公告问题                                                                            | 公告修复版本  | 静态评审状态     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------- | ---------------- |
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion        | 7.1.6         | 构建输入条件可达 |
| [GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92) | postcss-selector-parser allows denial of service through uncontrolled AST recursion | 6.1.3 / 7.1.3 | 构建输入条件可达 |

#### sharp

- 命中版本：0.34.5。
- 引入链及责任：根 Astro 6/旧 Astro 2 → sharp 0.34.5。
- 触发与项目证据：Site 未发现 astro:assets Image/Picture/getImage 调用，当前构建无主动图片优化；但根 Astro 开发端点会调用 Sharp，因此可控图像进入开发优化路径时风险仍成立。librsvg/libheif 的 RCE 还取决于 Linux glibc、实际原生库和 Node PIE。未读取生产安装，不以 macOS 检查排除 Linux 风险。

| 公告                                                                     | 公告问题                                                                                                   | 公告修复版本 | 静态评审状态             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------ | ------------------------ |
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 | 0.35.0       | 开发输入及原生环境待确认 |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | sharp: Vulnerabilities in libheif: GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545                             | 0.35.4       | 开发输入及原生环境待确认 |
| [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | sharp : Vulnerability in librsvg dependency CVE-2026-96889                                                 | 0.35.5       | 开发输入及原生环境待确认 |

#### smol-toml

- 命中版本：1.6.1。
- 引入链及责任：Astro 配置/Markdown → smol-toml 1.6.1。
- 触发与项目证据：Site 的 glob 仅收集 *.md，未发现 TOML loader/配置；解析非法 TOML 或大批键时有风险。不可信 PR 引入 TOML 输入后需重审。

| 公告                                                                     | 公告问题                                                                                       | 公告修复版本 | 静态评审状态       |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------ | ------------------ |
| [GHSA-7w5x-hrqm-74c2](https://github.com/advisories/GHSA-7w5x-hrqm-74c2) | smol-toml: Denial of Service via malformed TOML documents                                      | 1.7.1        | 当前入口未发现调用 |
| [GHSA-r4xh-jqrq-34v2](https://github.com/advisories/GHSA-r4xh-jqrq-34v2) | smol-toml: Quadratic-time parse() from parseKey rescanning to end of document on each key line | 1.9.0        | 当前入口未发现调用 |

#### source-map-js

- 命中版本：1.2.1。
- 引入链及责任：PostCSS/Tailwind/css-tree → source-map-js 1.2.1。
- 触发与项目证据：构建期间会处理 source map；索引 map 中巨大 offset 可使事件循环阻塞。与 PostCSS 的 sourceMappingURL 读取链相关，不可信源码包/PR 可改变 map；不能仅限深度来阻止巨大 offset。

| 公告                                                                     | 公告问题                                                                                     | 公告修复版本 | 静态评审状态     |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------ | ---------------- |
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | source-map-js allows event-loop denial of service through indexed source-map section offsets | 1.2.2        | 构建输入条件可达 |

#### sprintf-js

- 命中版本：1.0.3。
- 引入链及责任：旧 js-yaml → argparse 1 → sprintf-js 1.0.3。
- 触发与项目证据：两个 js-yaml 3 安装位置只有 bin/js-yaml.js 导入 argparse，库的 index.js/lib 不导入。argparse 的 sprintf 用于 usage、description 和 help 模板；项目只调用 YAML 库，不运行该 CLI 或接受任意格式模板。公告无修复版本，当前入口未触发不等于上游已修复。

| 公告                                                                     | 公告问题                                                                          | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------ | -------------- |
| [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | sprintf-js vulnerable to denial of service through unbounded precision specifiers | 公告未列出   | 当前入口不触发 |

#### svgo

- 命中版本：3.3.3、4.0.1。
- 引入链及责任：Astro → SVGO 4.0.1；Iconify Tools → SVGO 3.3.3。
- 触发与项目证据：三条公告均针对 opt-in removeScripts 的遗漏。当前 astro-icon 本地优化默认为 preset-default，项目未配置 removeScripts，也不把优化器当作不可信 SVG 安全过滤器；未来允许上传 SVG 仍需真正净化策略，不能以未启用插件推导 SVG 安全。

| 公告                                                                     | 公告问题                                                                                     | 公告修复版本          | 静态评审状态   |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------- | -------------- |
| [GHSA-2p49-hgcm-8545](https://github.com/advisories/GHSA-2p49-hgcm-8545) | SVGO removeScripts plugin leaves some executable scripts intact                              | 2.8.3 / 3.3.4 / 4.0.2 | 当前条件不触发 |
| [GHSA-4vpr-x523-8j87](https://github.com/advisories/GHSA-4vpr-x523-8j87) | SVGO: removeScripts incompletely sanitizes executable HTML in SVG foreignObject elements     | 2.8.4 / 3.3.5 / 4.1.0 | 当前条件不触发 |
| [GHSA-w27v-7q3p-w38r](https://github.com/advisories/GHSA-w27v-7q3p-w38r) | SVGO: removeScripts allows executable links through namespace and control-character bypasses | 2.8.4 / 3.3.5 / 4.1.0 | 当前条件不触发 |

#### tar

- 命中版本：7.5.13。
- 引入链及责任：astro-icon → @iconify/tools → tar 7.5.13。
- 触发与项目证据：Iconify helper 只调用 x({file,C})，但当前图标加载不调用 helper。负大小 replace 和带 member-selection 的 filesFilter 条件也不在该 helper 中。其余解析问题仍在启用远程 TAR 导入时可达；六公告不能只升级到首条 7.5.19。

| 公告                                                                     | 公告问题                                                                                                                                            | 公告修复版本 | 静态评审状态   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------- |
| [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) | node-tar: Decompression/parse DoS via unlimited input                                                                                               | 7.5.19       | 当前入口不触发 |
| [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) | node-tar: Negative tar entry size causes infinite loop in archive replace                                                                           | 7.5.18       | 当前入口不触发 |
| [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) | node-tar: Uncaught Exception DoS via NUL byte in PAX path/linkpath records                                                                          | 7.5.17       | 当前入口不触发 |
| [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) | node-tar: Uncontrolled recursion in mapHas/filesFilter allows uncatchable stack-overflow DoS via crafted long-path tar with member selection        | 7.5.21       | 当前入口不触发 |
| [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh) | node-tar applies PAX size override to intermediary GNU long-name/long-link headers, causing tar parser interpretation differential (file smuggling) | 7.5.16       | 当前入口不触发 |
| [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp) | node-tar: Process crash via PAX numeric path type confusion                                                                                         | 7.5.18       | 当前入口不触发 |

#### undici

- 命中版本：7.25.0、7.27.2、5.29.0。
- 引入链及责任：旧 Astro → 5.29.0；Cheerio → 7.25.0；Publishing/JSDOM → 7.27.2。
- 触发与项目证据：Publishing 的 new JSDOM(html) 使用默认 resources/runScripts：不自动加载子资源、不执行输入脚本；当前没有 fromURL/fromURLRecord、WebSocket 或自定义 cache/retry/dump/SOCKS/BalancePool。默认仍构造 dispatcher，不能据此说 Undici 未安装。Publishing 的 GitHub 请求另用 Node 内置 fetch，版本见运行时核对，不能由锁文件升级证明修复。

| 公告                                                                     | 公告问题                                                                                                                             | 公告修复版本             | 静态评审状态                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | --------------------------------- |
| [GHSA-2gqq-gqf2-x968](https://github.com/advisories/GHSA-2gqq-gqf2-x968) | undici vulnerable to response truncation via oversized chunked responses in the dump interceptor                                     | 7.29.1 / 8.10.2          | 当前条件不触发                    |
| [GHSA-2jfj-6hjv-fm6j](https://github.com/advisories/GHSA-2jfj-6hjv-fm6j) | undici vulnerable to cross-user cookie disclosure via Set-Cookie caching in shared caches                                            | 7.29.1 / 8.10.2          | 当前条件不触发                    |
| [GHSA-2mjp-6q6p-2qxm](https://github.com/advisories/GHSA-2mjp-6q6p-2qxm) | Undici has an HTTP Request/Response Smuggling issue                                                                                  | 6.24.0 / 7.24.0          | 当前条件不触发                    |
| [GHSA-35p6-xmwp-9g52](https://github.com/advisories/GHSA-35p6-xmwp-9g52) | undici vulnerable to HTTP response queue poisoning via keep-alive socket reuse                                                       | 6.27.0 / 7.28.0 / 8.5.0  | JSDOM 无自动网络；内置 fetch 另评 |
| [GHSA-3xpg-4rpp-hhhm](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm) | undici vulnerable to Denial of Service via unbounded decompression of compressed responses                                           | 7.29.1 / 8.10.2          | 当前条件不触发                    |
| [GHSA-4992-7rv2-5pvq](https://github.com/advisories/GHSA-4992-7rv2-5pvq) | Undici has CRLF Injection in undici via `upgrade` option                                                                             | 6.24.0 / 7.24.0          | 当前条件不触发                    |
| [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272) | undici vulnerable to cross-user information disclosure and parse-time crash via degenerate private cache directives                  | 7.29.0 / 8.9.0           | 当前条件不触发                    |
| [GHSA-8436-99hf-9mmv](https://github.com/advisories/GHSA-8436-99hf-9mmv) | undici vulnerable to caching and replay of unsafe HTTP method responses                                                              | 7.29.1 / 8.10.2          | 当前条件不触发                    |
| [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) | undici vulnerable to downstream response desynchronization via retry interceptor                                                     | 6.28.0 / 7.29.0 / 8.9.0  | 当前条件不触发                    |
| [GHSA-g8m3-5g58-fq7m](https://github.com/advisories/GHSA-g8m3-5g58-fq7m) | undici vulnerable to Set-Cookie SameSite attribute downgrade via permissive substring matching                                       | 6.27.0 / 7.28.0 / 8.5.0  | 当前条件不触发                    |
| [GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9) | Undici has an unbounded decompression chain in HTTP responses on Node.js Fetch API via Content-Encoding leads to resource exhaustion | 7.18.2 / 6.23.0          | 当前条件不触发                    |
| [GHSA-hm92-r4w5-c3mj](https://github.com/advisories/GHSA-hm92-r4w5-c3mj) | undici vulnerable to cross-origin request routing via SOCKS5 proxy pool reuse                                                        | 7.28.0 / 8.2.0           | 当前条件不触发                    |
| [GHSA-jr45-8vmc-qm54](https://github.com/advisories/GHSA-jr45-8vmc-qm54) | undici vulnerable to cross-user information disclosure via whitespace around equals in Cache-Control directives                      | 7.29.0 / 8.9.0           | 当前条件不触发                    |
| [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) | undici vulnerable to CRLF Injection via blob-like body 'type' property                                                               | 6.28.0 / 7.29.0 / 8.9.0  | 当前条件不触发                    |
| [GHSA-p88m-4jfj-68fv](https://github.com/advisories/GHSA-p88m-4jfj-68fv) | undici vulnerable to HTTP header injection via Set-Cookie percent-decoding                                                           | 6.27.0 / 7.28.0 / 8.5.0  | 当前条件不触发                    |
| [GHSA-pmjh-fq2x-6v4x](https://github.com/advisories/GHSA-pmjh-fq2x-6v4x) | undici vulnerable to Denial of Service via orphaned RetryHandler response body                                                       | 7.29.1 / 8.10.2          | 当前条件不触发                    |
| [GHSA-pr7r-676h-xcf6](https://github.com/advisories/GHSA-pr7r-676h-xcf6) | undici vulnerable to cross-user information disclosure via shared cache whitespace bypass                                            | 7.28.0 / 8.5.0           | 当前条件不触发                    |
| [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) | undici vulnerable to downstream response splitting via retry interceptor                                                             | 6.28.1 / 7.29.1 / 8.10.2 | 当前条件不触发                    |
| [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) | undici vulnerable to Denial of Service via unrequested WebSocket subprotocol                                                         | 6.28.1 / 7.29.1 / 8.10.2 | 当前条件不触发                    |
| [GHSA-rx4f-c7p8-82vq](https://github.com/advisories/GHSA-rx4f-c7p8-82vq) | undici vulnerable to Denial of Service via WebSocketStream unclean close                                                             | 7.29.1 / 8.10.2          | 当前条件不触发                    |
| [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) | undici vulnerable to cookie attribute injection via unsanitized domain and unparsed setCookie fields                                 | 6.28.0 / 7.29.0 / 8.9.0  | 当前条件不触发                    |
| [GHSA-v9p9-hfj2-hcw8](https://github.com/advisories/GHSA-v9p9-hfj2-hcw8) | Undici has Unhandled Exception in WebSocket Client Due to Invalid server_max_window_bits Validation                                  | 6.24.0 / 7.24.0          | 当前条件不触发                    |
| [GHSA-vmh5-mc38-953g](https://github.com/advisories/GHSA-vmh5-mc38-953g) | undici vulnerable to TLS certificate validation bypass via dropped requestTls in SOCKS5 ProxyAgent                                   | 7.28.0 / 8.5.0           | 当前条件不触发                    |
| [GHSA-vrm6-8vpv-qv8q](https://github.com/advisories/GHSA-vrm6-8vpv-qv8q) | Undici has Unbounded Memory Consumption in WebSocket permessage-deflate Decompression                                                | 6.24.0 / 7.24.0          | 当前条件不触发                    |
| [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q) | undici WebSocket client vulnerable to denial of service via fragment count bypass                                                    | 6.27.0 / 7.28.0 / 8.5.0  | 当前条件不触发                    |
| [GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3) | undici vulnerable to TLS certificate validation bypass via dropped connect options in BalancedPool                                   | 7.29.1 / 8.10.2          | 当前条件不触发                    |

#### vite

- 命中版本：4.5.14、7.3.2。
- 引入链及责任：根 Astro/Tailwind → Vite 7.3.2；旧 Astro → Vite 4.5.14。
- 触发与项目证据：当前 scripts 启动根 Astro，未发现旧 Vite 4 启动路径；配置不设 server.host/--host，但这不是 DNS rebinding 或本机恶意网页的通用免疫。两个根版本命中公告是 Windows 相关，本机为 macOS，生产声明 Linux 静态资源交付；其他开发环境尚未核验。

| 公告                                                                     | 公告问题                                                                              | 公告修复版本                    | 静态评审状态   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------- | -------------- |
| [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) | Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling                   | 8.0.5 / 7.3.2 / 6.4.2           | 当前环境不触发 |
| [GHSA-93m4-6634-74q7](https://github.com/advisories/GHSA-93m4-6634-74q7) | vite allows server.fs.deny bypass via backslash on Windows                            | 7.1.11 / 7.0.8 / 6.4.1 / 5.4.21 | 当前环境不触发 |
| [GHSA-c27g-q93r-2cwf](https://github.com/advisories/GHSA-c27g-q93r-2cwf) | launch-editor vulnerable to command injection via the crafted request on Windows      | 5.4.9                           | 当前环境不触发 |
| [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | vite: `server.fs.deny` bypass on Windows alternate paths                              | 8.0.16 / 7.3.5 / 6.4.3          | 当前环境不触发 |
| [GHSA-g4jq-h2w9-997c](https://github.com/advisories/GHSA-g4jq-h2w9-997c) | Vite middleware may serve files starting with the same name with the public directory | 7.1.5 / 7.0.7 / 6.3.6 / 5.4.20  | 当前环境不触发 |
| [GHSA-jqfw-vq24-v9c3](https://github.com/advisories/GHSA-jqfw-vq24-v9c3) | Vite's `server.fs` settings were not applied to HTML files                            | 7.1.5 / 7.0.7 / 6.3.6 / 5.4.20  | 当前环境不触发 |
| [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) | launch-editor: NTLMv2 hash disclosure via UNC path handling on Windows                | 8.0.16 / 7.3.5 / 6.4.3          | 当前环境不触发 |

#### yaml

- 命中版本：2.7.1。
- 引入链及责任：@astrojs/check → language-server → yaml-language-server → yaml 2.7.1。
- 触发与项目证据：该解析器用于语言工具，不是 Publishing JSON 或 Runtime 数据岛。工程根的另一份 yaml 2.9.0 不在命中中；不可信 YAML 文件进入语言服务器时仍需处理递归深度，不能只 catch YAMLParseError。

| 公告                                                                     | 公告问题                                                                | 公告修复版本   | 静态评审状态     |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------- | ---------------- |
| [GHSA-48c2-rrv3-qjmp](https://github.com/advisories/GHSA-48c2-rrv3-qjmp) | yaml is vulnerable to Stack Overflow via deeply nested YAML collections | 2.8.3 / 1.10.3 | 工程输入条件可达 |

### 运行时与部署边界补核

本机只读查询得到 Node v24.14.1、内置 Undici 7.24.4、darwin。Publishing 的 github.cjs 直接调用全局 fetch，不调用锁文件中的 undici 包；固定出站目标为 GitHub，JSON 请求不启用代理、Cookie/cache/retry 拦截器或 WebSocket。

内置 Undici 仍可能受 keep-alive 队列污染公告影响，成立条件是被控/被攻陷的上游 HTTP/1.1 服务且连接复用；固定 HTTPS 上游缩小输入面，但不证明运行时已修复。锁文件扫描没有包括这一份内置库，因此不将它添加到“130 条”统计中。

[Node 2026 年 7 月安全发布](https://nodejs.org/en/blog/vulnerability/july-2026-security-releases)已更新内置 Undici；[Node 24.21.0 发布说明](https://nodejs.org/en/blog/release/v24.21.0)列出 Undici 7.29.1。建议在单独的运行时升级任务中验证该维护版本或更新的受支持补丁版本。不能仅修改 package.json engines 或 npm 安装 undici 来宣称替换了 Node 内置实现。

CI 使用 Node 22/24 的可变大版本标签，生产 service 使用 /usr/bin/node；都未查询实际远端版本。本机值不能作为生产值。生产部署声明为 Linux + Nginx 静态 dist，Publishing 是独立 node:http 服务，不等于部署 Astro SSR。没有读取生产证书、环境文件或私钥。

### 后续整改顺序及关闭条件

1. 先确认并移除未使用的 astro-paper 依赖，而不是逐个强制覆盖旧 Astro 栈。仅限已证实未使用的声明；执行构建、包隔离消费和浏览器回归后再判断删除安全。
2. 对实际内容解析链优先评估 image-size 2.0.3、RSS 4.0.19；这两个版本分别对应已核对公告，不替代对其传递依赖的复扫。
3. 评估根 Astro 的兼容升级。部分公告只在 7.x 列出修复，不能声称 6.x 小更新解决所有项。Sharp 目标还需覆盖 0.35.5 的 librsvg 修复，不能止于 AVIF 公告的 0.35.4。
4. 更新构建解析链：PostCSS/source-map-js、Ajv/fast-uri、devalue、语言工具及其可升级依赖。优先通过消费者上游约束升级，不用 overrides 静默替换不兼容的大版本。
5. 对无公告修复版本的四个包按实际输入入口处理：不增加不可信 glob、归档和共享缓存；若必须新增则设计输入预算/隔离或替代实现，并取得明确风险决策。
6. 单独更新本地/CI/生产 Node 维护补丁并记录实际版本、内置 Undici 和平台原生库。生产更新必须另行授权，不能远程自动安装。
7. 每组整改增加有资源上限的安全回归、执行 verify:release 和离线复扫。只在受影响范围已消除、相关回归通过且部署证据成立时关闭；不允许把门禁通过当作漏洞已修复。

上述是待实施的安全整改方案，不是本轮已经执行的变更。依赖升级与弃用移除将改变安装、构建和包兼容性，需要确定目标版本后实施；本轮只完成评审与证据整理。

## 剩余限制

- 历史 48 项缺少原始报告，不能精确还原其直接公告与 npm 元漏洞关系；不以本次 130 个公告替换旧计数而不解释口径。
- 全部 130 条已完成版本范围、引入链及静态条件评审；KaTeX 的前置污染链和 Sharp 的三条原生环境条件仍缺确证。没有运行隔离攻击回归、候选升级兼容试验或生产验收。
- OSV 快照不覆盖未公开漏洞、所有系统原生库或生产真实安装。没有对生产机、私钥或环境文件进行读取和扫描。
- 本轮未升级依赖、修改锁文件、提交 Git、推送或发布。
