import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { referenceMarkdown } from '../internal/checks.mjs';
import { metadata } from '../internal/documents.mjs';
import { inspectHomepageConfig } from '@myblog/site';

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const bookSchema = await readJson(
  'packages/book-build/src/api/book-config.schema.json',
);
const bookConfig = await readJson('packages/site/src/data/book-config.json');
const homepageConfig = await readJson(
  'packages/site/src/data/homepage-config.json',
);
const homepageContract = inspectHomepageConfig(homepageConfig);
if (!homepageContract.ok) throw new Error(homepageContract.diagnostic);
const homepageSchema = homepageContract.schema;
const outputs = [
  [
    'packages/book-build/docs/reference/book-config.generated.md',
    referenceMarkdown(bookSchema, bookConfig),
    'markdown',
  ],
  [
    'packages/site/docs/reference/homepage-config.generated.md',
    referenceMarkdown(homepageSchema, homepageConfig, '经典视图组件配置参考'),
    'markdown',
  ],
  [
    'packages/site/src/data/homepage-config.schema.json',
    JSON.stringify(homepageSchema, null, 2),
    'json',
  ],
];
const patches = [];
for (const [target, content, parser] of outputs) {
  const old = await readFile(target, 'utf8').catch(() => null);
  let generatedContent = content;
  if (parser === 'markdown') {
    const book = target.includes('/book-build/');
    const title = content.split('\n')[0];
    const table = content.slice(content.indexOf('<!-- prettier-ignore -->'));
    const configPath = book
      ? 'packages/site/src/data/book-config.json'
      : 'packages/site/src/data/homepage-config.json';
    const definition = book
      ? 'packages/book-build/src/api/book-config.schema.json'
      : 'packages/site/src/api/homepage-config.mjs';
    const body = `${title}

目录：

- [适用范围](#适用范围)
- [接口清单](#接口清单)
- [输入与配置](#输入与配置)
- [输出与副作用](#输出与副作用)
- [错误与边界](#错误与边界)
- [兼容与示例](#兼容与示例)
- [验证与关联](#验证与关联)

## 适用范围

${book ? '供书籍配置、主题和浏览器测量维护者查询 Book 配置。' : '供 Site 页面与传统首页组件维护者查询 Homepage 配置。'} 当前值来自 ${configPath}，不是所有主题/组件的默认回退。参考表展示可提取约束，不替代完整校验、API 或设计。

## 接口清单

定义来源为 ${definition}。字段以点号路径展开；必填相对于直接父对象，父对象可选时不意味着其所有子字段无条件必填。只从权威定义和当前配置生成，不手动编辑本文件。

## 输入与配置

${table.trimEnd()}

## 输出与副作用

${book ? 'buildBook 以 Book Schema 校验配置并组装浏览器载荷；失败以带阶段和 code 的 diagnostics 返回。成功载荷中的初始页数是估值，浏览器分页后会重新计算。' : 'validateHomepageConfig 读取 FIELDS 并检查字段及跨字段关系；CSS 组合函数输出变量和响应样式，不修改 DOM。验证返回原配置，不提供深不可变副本。'}

生成器读取配置、调用接口并启动 Prettier 子进程。普通模式写两份参考和首页 Schema；--check 只比较，--patch 输出补丁。生成无外部网络，不代表无文件/进程副作用。

## 错误与边界

${book ? '类型、必填、数值和组合规则以完整 Schema 为准；不能把所有 number 一概写成正整数，Schema 通过也不证明 CSS 与浏览器实际布局相同。theme.id 需对应已登记主题；构建 totalPages 是估值，不是最终页数。' : '长度、字体、颜色、透明度等采用接口声明的格式与范围，不是完整 CSS 解析。书页字体大小要求 cqw；比例、目录条目数量及宽窄关系由校验函数补充，不能只看编辑器 Schema。阈值有效仍需实际布局验证。'}

表不表达所有额外键、条件组合、运行行为或语义限制。修改几何、字体、图片及断点必须核对生产者与 Runtime 并追加浏览器证据。

## 兼容与示例

完整配置样例为 ${configPath}。修改定义、说明或配置后运行 npm run docs:generate，再检查差异与测试。字段更名/删除时同步消费者；跨已部署版本的过渡需显式设计，不自动添加兼容转发层。

## 验证与关联

运行 npm run check:docs 检查结构与漂移，运行 npm run verify 检查工程和行为。几何与布局变化追加 npm run test:e2e。生成日期只在内容变化时更新，--check 不刷新日期。

[模块 README](../../README.md) · [公共 API](api.md) · [测试方案](../testing/strategy.md) · [文档规范](../../../../docs/standards/documentation.md)
`;
    let created = '2026-10-04';
    let modified = created;
    if (old) {
      const meta = metadata(old);
      created = meta.created;
      modified = meta.modified;
      const previousBody = old.replace(/^---\n[\s\S]*?\n---\n\n/, '');
      const formattedBody = spawnSync(
        process.execPath,
        ['node_modules/prettier/bin/prettier.cjs', '--parser', 'markdown'],
        { input: body, encoding: 'utf8' },
      ).stdout;
      if (previousBody !== formattedBody && !process.argv.includes('--check'))
        modified = new Date().toISOString().slice(0, 10);
    }
    const root = book ? 'packages/book-build' : 'packages/site';
    generatedContent =
      '---\nid: "' +
      (book ? 'book-config-reference' : 'homepage-config-reference') +
      '"\ntype: "interface"\nstatus: "active"\ncreated: "' +
      created +
      '"\nmodified: "' +
      modified +
      '"\nscope: "' +
      root +
      '"\nowner: "' +
      (book ? 'Book Build' : 'Site') +
      ' 维护者"\nparent: "' +
      root +
      '/README.md"\nrelated: ["' +
      (book
        ? 'packages/book-build/src/api/book-config.schema.json'
        : 'packages/site/src/api/homepage-config.mjs') +
      '", "' +
      (book
        ? 'packages/site/src/data/book-config.json'
        : 'packages/site/src/data/homepage-config.json') +
      '"]\n---\n\n' +
      body;
  }
  const result = spawnSync(
    process.execPath,
    ['node_modules/prettier/bin/prettier.cjs', '--parser', parser],
    { input: generatedContent, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  if (process.argv.includes('--check')) {
    if (old !== result.stdout) {
      console.error(target + ' is stale; run npm run docs:generate');
      process.exitCode = 1;
    }
  } else if (process.argv.includes('--patch')) {
    if (old === result.stdout) continue;
    const lines = result.stdout
      .trimEnd()
      .split('\n')
      .map((line) => '+' + line)
      .join('\n');
    patches.push(
      old === null
        ? '*** Add File: ' + target + '\n' + lines
        : '*** Update File: ' +
            target +
            '\n@@\n' +
            old
              .trimEnd()
              .split('\n')
              .map((line) => '-' + line)
              .join('\n') +
            '\n' +
            lines,
    );
  } else {
    await writeFile(target, result.stdout);
    console.log('Generated ' + target);
  }
}
if (process.argv.includes('--patch'))
  console.log('*** Begin Patch\n' + patches.join('\n') + '\n*** End Patch');
