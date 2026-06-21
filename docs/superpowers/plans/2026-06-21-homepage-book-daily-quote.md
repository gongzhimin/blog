# 首页书本质感与每日一句实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将首页双页目录增强为自然摊开的平装书，并让 GitHub Actions 每天获取、提交和部署带作者署名的每日一句。

**架构：** 每日一句的网络访问、解析和校验集中在可单测的 Node.js 模块，命令行脚本只负责读取旧 JSON、调用模块并按需写盘。首页继续只读取静态 JSON；现有部署工作流在定时触发时更新数据，并在同一任务内完成构建和部署。书本效果只修改首页 CSS，桌面端使用静态微透视与伪元素，移动端显式取消立体变换。

**技术栈：** Astro 6、Node.js 22 原生 `fetch`、Node Test Runner、JSDOM、CSS 3D Transform、GitHub Actions、Playwright。

---

## 文件结构

- 创建：`src/lib/daily-quote.mjs`
  - 职责：响应解析、数据校验、请求超时、数据源回退。
- 创建：`scripts/update-daily-quote.mjs`
  - 职责：读取现有 JSON，调用获取模块，数据变化时原子写入。
- 创建：`test/daily-quote.test.mjs`
  - 职责：覆盖扇贝、有道、回退和无效响应。
- 修改：`src/data/daily-quote.json`
  - 职责：加入作者字段并保持稳定静态数据结构。
- 修改：`src/components/DailyQuote.astro`
  - 职责：渲染可选作者。
- 修改：`src/pages/index.astro`
  - 职责：传递作者属性。
- 修改：`src/styles/home.css`
  - 职责：实现 B1 平装书弧度、页厚、投影和移动端降级。
- 修改：`test/homepage-render.test.mjs`
  - 职责：验证作者输出和书本辅助结构。
- 修改：`test/homepage-layout.spec.mjs`
  - 职责：验证桌面立体样式与移动端变换归零。
- 修改：`package.json`
  - 职责：提供每日一句更新命令。
- 修改：`.github/workflows/deploy.yml`
  - 职责：每天北京时间 06:15 获取、提交、构建和部署。

## 任务 1：建立每日一句解析与回退模块

**文件：**
- 创建：`test/daily-quote.test.mjs`
- 创建：`src/lib/daily-quote.mjs`

- [ ] **步骤 1：编写失败的解析和回退测试**

测试固定日期 `2026-06-21`，断言：

```js
assert.deepEqual(parseShanbay(payload, date), {
  date,
  english: payload.content,
  chinese: payload.translation,
  author: payload.author,
  source: "shanbay",
});

assert.equal(parseYoudao(payload, date).author, "今日夏至");
assert.equal(await fetchDailyQuote({ fetchImpl, date, previous }), previous);
```

使用注入的 `fetchImpl` 模拟扇贝失败、有道成功和双源失败，不进行真实网络访问。

- [ ] **步骤 2：运行测试并确认失败**

运行：`node --test test/daily-quote.test.mjs`

预期：FAIL，错误包含 `Cannot find module '../src/lib/daily-quote.mjs'`。

- [ ] **步骤 3：实现最小解析、校验与回退**

导出以下接口：

```js
export function isValidQuote(quote, date) {}
export function parseShanbay(payload, date) {}
export function parseYoudao(payload, date) {}
export async function fetchDailyQuote({
  fetchImpl = fetch,
  date,
  previous,
  timeoutMs = 8000,
}) {}
```

`fetchDailyQuote` 依次请求扇贝和有道；每次创建 `AbortController`，响应非 `ok`、JSON 解析失败或数据校验失败时继续下一源，最终返回 `previous`。

- [ ] **步骤 4：运行模块测试**

运行：`node --test test/daily-quote.test.mjs`

预期：全部 PASS。

- [ ] **步骤 5：提交数据模块**

```bash
git add src/lib/daily-quote.mjs test/daily-quote.test.mjs
git commit -m "feat: add daily quote source fallback"
```

## 任务 2：增加更新命令与静态展示

**文件：**
- 创建：`scripts/update-daily-quote.mjs`
- 修改：`package.json`
- 修改：`src/data/daily-quote.json`
- 修改：`src/components/DailyQuote.astro`
- 修改：`src/pages/index.astro`
- 修改：`test/homepage-render.test.mjs`

- [ ] **步骤 1：先修改渲染测试要求作者署名**

将旧的“无作者”断言改为：

```js
assert.equal(
  footer.querySelector(".daily-quote__author").textContent.trim(),
  "— Unknown",
);
```

测试数据中的作者固定为 `Unknown`，确保组件结构可验证。

- [ ] **步骤 2：构建并确认测试失败**

运行：`npm run build && node --test test/homepage-render.test.mjs`

预期：FAIL，`.daily-quote__author` 不存在。

- [ ] **步骤 3：实现作者展示和更新命令**

更新 JSON：

```json
{
  "date": "2026-06-21",
  "english": "The quieter you become, the more you can hear.",
  "chinese": "你越安静，越能听见真正重要的声音。",
  "author": "Unknown",
  "source": "fallback"
}
```

`DailyQuote.astro` 增加 `author?: string`，仅在非空时输出：

```astro
{author && <p class="daily-quote__author">— {author}</p>}
```

创建命令行脚本，以 Asia/Shanghai 当前日期调用 `fetchDailyQuote`；新旧 JSON 序列化一致时不写文件，变化时先写同目录临时文件再重命名。`package.json` 增加：

```json
"update:daily-quote": "node scripts/update-daily-quote.mjs"
```

- [ ] **步骤 4：运行展示与完整 Node 测试**

运行：`npm run build && node --test test/*.test.*`

预期：全部 PASS。

- [ ] **步骤 5：提交静态展示**

```bash
git add scripts/update-daily-quote.mjs package.json src/data/daily-quote.json src/components/DailyQuote.astro src/pages/index.astro test/homepage-render.test.mjs
git commit -m "feat: render scheduled daily quote authors"
```

## 任务 3：实现自然摊开的平装书

**文件：**
- 修改：`src/styles/home.css`
- 修改：`test/homepage-layout.spec.mjs`

- [ ] **步骤 1：增加桌面和移动端样式断言**

桌面端从 `.home-book` 和两张 `.book-page` 读取计算样式，断言：

```js
expect(bookStyle.perspective).not.toBe("none");
expect(leftStyle.transform).not.toBe("none");
expect(rightStyle.transform).not.toBe("none");
expect(bookStyle.filter).not.toBe("none");
```

移动端断言两张纸页的 `transform` 均为 `none`。

- [ ] **步骤 2：运行浏览器测试并确认失败**

运行：`npm run test:e2e`

预期：FAIL，当前 `.home-book` 没有 perspective/filter，纸页没有 transform。

- [ ] **步骤 3：实现 B1 桌面样式**

在桌面端：

- `.home-book` 使用 `perspective`、轻微 `rotateX` 和柔和 `drop-shadow`。
- `.home-book::before` 表现底部页叠厚度。
- `.home-book::after` 改为中央书脊的多层渐变。
- 左右 `.book-page` 使用约 `rotateY(1.5deg)` 的相反微透视。
- 页面背景叠加中央低谷和外缘纸色渐变。
- 底部外侧圆角不同，形成自然摊开的非机械轮廓。

在 `max-width: 720px` 中覆盖：

```css
.home-book {
  perspective: none;
  filter: none;
  transform: none;
}

.home-book::before,
.home-book::after {
  display: none;
}

.book-page,
.book-page:first-child,
.book-page:last-child {
  transform: none;
  border-radius: 0;
}
```

- [ ] **步骤 4：运行首页浏览器测试**

运行：`npm run test:e2e`

预期：全部 PASS，且无水平溢出。

- [ ] **步骤 5：提交书本样式**

```bash
git add src/styles/home.css test/homepage-layout.spec.mjs
git commit -m "feat: shape homepage as an open paperback"
```

## 任务 4：接入定时工作流

**文件：**
- 修改：`.github/workflows/deploy.yml`

- [ ] **步骤 1：增加定时触发与最小权限**

新增：

```yaml
on:
  schedule:
    - cron: '15 22 * * *'

permissions:
  contents: write
```

- [ ] **步骤 2：只在定时运行时更新并提交**

在安装依赖后、构建前增加：

```yaml
- name: Update daily quote
  if: github.event_name == 'schedule'
  run: npm run update:daily-quote

- name: Commit daily quote
  if: github.event_name == 'schedule'
  run: |
    if git diff --quiet -- src/data/daily-quote.json; then
      exit 0
    fi
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git add src/data/daily-quote.json
    git commit -m "chore: update daily quote"
    git push
```

现有构建和部署步骤保持在后面，因此定时任务不会依赖二次 `push` 事件。

- [ ] **步骤 3：检查工作流与项目验证**

运行：

```bash
npm run check
npm test
npm run test:e2e
git diff --check
```

预期：全部通过。

- [ ] **步骤 4：提交自动化**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: refresh and deploy daily quote"
```

## 任务 5：最终验证

- [ ] **步骤 1：运行无写盘的真实接口验证**

通过 `node -e` 导入 `fetchDailyQuote`，以当天日期和当前 JSON 为回退，打印结果但不写文件。

预期：返回 `source` 为 `shanbay` 或 `youdao` 的有效对象；接口不可用时返回现有 JSON。

- [ ] **步骤 2：检查提交和工作区**

运行：

```bash
git status --short
git log -5 --oneline --decorate
```

预期：工作区干净，设计、计划和实现提交均存在。
