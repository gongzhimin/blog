# iOS 同名文章 GitHub 覆盖实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让 iOS 提交以 GitHub 当前分支为准覆盖同名 Markdown，并避免服务器工作目录与 GitHub 分叉。

**架构：** webhook 先读取 GitHub commit/tree 和文章 blob，生成只包含 GitHub 真实路径的原子提交计划，再通过 Git Data API 更新分支。服务器本地目录只承载运行时代码，不再承载待同步文章状态。

**技术栈：** Node.js 22、GitHub Git Data API、node:test、Astro

---

## 文件结构

- 修改：`scripts/webhook-receiver.cjs`，读取 GitHub 文章索引、生成覆盖计划并原子提交。
- 修改：`test/webhook-receiver.test.cjs`，验证 GitHub 同名覆盖、新建和重复清理行为。
- 创建：`docs/superpowers/specs/2026-06-20-github-source-mobile-overwrite-design.md`，记录一致性设计。
- 创建：`docs/superpowers/plans/2026-06-20-github-source-mobile-overwrite.md`，记录实现步骤。

### 任务 1：GitHub 文章覆盖计划

**文件：**
- 修改：`scripts/webhook-receiver.cjs`
- 测试：`test/webhook-receiver.test.cjs`

- [ ] **步骤 1：编写失败的测试**

测试以 GitHub 文章数组作为输入，断言同名文章沿用原路径与日期：

```js
const plan = buildGitHubLifePostPlan({
  posts: [{ repoPath: 'src/content/life/existing.md', content: existing }],
  title: '答案',
  markdown: 'New content',
  date: '2026-06-20',
});
assert.equal(plan.repoPath, 'src/content/life/existing.md');
assert.match(plan.frontmatter, /date: 2026-06-19/);
```

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`

预期：FAIL，`buildGitHubLifePostPlan` 尚未导出。

- [ ] **步骤 3：编写最少实现代码**

实现 `buildGitHubLifePostPlan`，只根据 GitHub 返回的文章内容匹配 frontmatter 标题，并返回目标路径、内容和重复路径。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`

预期：同名覆盖、新建和重复文章测试全部 PASS。

### 任务 2：从 GitHub 当前分支读取文章

**文件：**
- 修改：`scripts/webhook-receiver.cjs`
- 测试：`test/webhook-receiver.test.cjs`

- [ ] **步骤 1：编写失败的测试**

使用注入的请求函数模拟 GitHub ref、commit、tree 和 blob 响应，断言只读取 `src/content/life/*.md`。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`

预期：FAIL，GitHub 文章读取函数尚不存在。

- [ ] **步骤 3：编写最少实现代码**

新增 GitHub 仓库上下文读取函数，返回 `headCommitSha`、`baseTreeSha`、完整 tree 路径集合和 life 文章内容。

- [ ] **步骤 4：运行测试验证通过**

运行：`npm test`

预期：GitHub tree 与 blob 读取测试 PASS。

### 任务 3：原子发布与本地无写入

**文件：**
- 修改：`scripts/webhook-receiver.cjs`
- 测试：`test/webhook-receiver.test.cjs`

- [ ] **步骤 1：编写失败的测试**

断言发布计划的删除项必须存在于 GitHub tree，并断言 webhook 处理流程不调用 `fs.writeFileSync` 或 `fs.unlinkSync` 写文章和图片。

- [ ] **步骤 2：运行测试验证失败**

运行：`npm test`

预期：FAIL，现有实现仍先写服务器文件。

- [ ] **步骤 3：编写最少实现代码**

将图片仅保存在内存中并加入 GitHub tree；移除文章、图片的服务器本地写入；复用已读取的 GitHub commit/tree 创建提交。

- [ ] **步骤 4：运行完整验证**

运行：

```bash
npm test
node --check scripts/webhook-receiver.cjs
npm run build
```

预期：全部命令退出码为 0。

### 任务 4：部署核验

**文件：**
- 修改：无

- [ ] **步骤 1：提交并推送**

```bash
git add scripts/webhook-receiver.cjs test/webhook-receiver.test.cjs docs/superpowers
git commit -m "fix: overwrite mobile posts from github state"
git push origin main
```

- [ ] **步骤 2：确认服务器部署**

检查 `blog-webhook.service` 为 active，服务器脚本校验值与本地一致，日志中没有新的启动错误。

- [ ] **步骤 3：确认线上链路**

通过一次同名文章发布验证 GitHub Markdown 和网站内容一致；如不主动修改用户文章，则只验证服务版本和静态站点健康状态。
