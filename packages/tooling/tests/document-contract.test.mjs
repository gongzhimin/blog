import test from 'node:test';
import assert from 'node:assert/strict';
import * as documents from '../src/internal/documents.mjs';

const valid = `---
id: "test-readme"
type: "readme"
status: "active"
created: "2026-10-04"
modified: "2026-10-04"
scope: "test"
owner: "maintainer"
parent: "README.md"
related: ["docs/guides/contributing.md"]
---
# Test
${['用途与边界', '能力与限制', '内部结构', '依赖与数据流', '主要接口', '最小使用示例', '配置', '测试与验证', '文档导航'].map((h) => `## ${h}\n具体内容。`).join('\n')}
`;
test('valid metadata and ordered chapters pass', () => {
  assert.equal(typeof documents.documentErrors, 'function');
  assert.deepEqual(documents.documentErrors('test.md', valid), []);
});
test('tutorials have learning chapters and a distinct module directory type', () => {
  const source =
    valid
      .slice(0, valid.indexOf('# Test'))
      .replace('type: "readme"', 'type: "tutorial"')
      .replace('scope: "test"', 'scope: "site"')
      .replace('parent: "README.md"', 'parent: "packages/site/README.md"') +
    '# Learn\n' +
    [
      '学习目标',
      '准备环境',
      '练习输入',
      '练习步骤',
      '预期结果',
      '排错与清理',
      '后续阅读',
    ]
      .map((h) => `## ${h}\n可观察的练习结果。`)
      .join('\n');
  assert.deepEqual(
    documents.documentErrors(
      'packages/site/docs/tutorials/getting-started.md',
      source,
    ),
    [],
  );
  assert.deepEqual(
    documents.moduleDocumentErrors(
      'packages/site/docs/tutorials/getting-started.md',
      source,
      [{ id: 'site', root: 'packages/site' }],
    ),
    [],
  );
  assert.ok(
    documents
      .moduleDocumentErrors('packages/site/docs/guides/change.md', source, [
        { id: 'site', root: 'packages/site' },
      ])
      .some((e) => e.includes('requires type guide')),
  );
});
test('executable shell examples reject blanket restoration and deletion', () => {
  for (const language of ['sh', 'bash', 'shell']) {
    for (const command of [
      'git clean -fd packages/site/src/',
      'git reset --hard',
      'git checkout -- .',
    ]) {
      assert.ok(
        documents
          .documentErrors(
            'test.md',
            valid + `\n  \`\`\`${language}\n${command}\n  \`\`\`\n`,
          )
          .some((e) => e.includes('unsafe recovery command')),
        command,
      );
    }
  }
  assert.deepEqual(
    documents.documentErrors(
      'test.md',
      valid +
        '\n禁止使用 `git clean -fd`。\n```sh\n# git clean -fd is forbidden\ngit diff -- packages/site/src/\n```\n',
    ),
    [],
  );
});
test('obsolete module manifest references fail even without Markdown links', () => {
  assert.ok(
    documents
      .documentErrors(
        'test.md',
        valid + '\n清单为 `engineering.modules.json`。\n',
      )
      .some((e) => e.includes('obsolete manifest path')),
  );
  assert.deepEqual(
    documents.documentErrors(
      'test.md',
      valid + '\n清单为 `packages/tooling/src/modules.json`。\n',
    ),
    [],
  );
});
test('metadata fields follow the documented order', () => {
  assert.ok(
    documents
      .documentErrors(
        'test.md',
        valid.replace(
          'id: "test-readme"\ntype: "readme"',
          'type: "readme"\nid: "test-readme"',
        ),
      )
      .some((e) => e.includes('metadata field order')),
  );
});
test('current Markdown links cannot use machine-local file URLs', () => {
  assert.ok(
    documents
      .documentErrors(
        'test.md',
        valid + '\n[API](file:///Users/example/api.md)\n',
      )
      .some((e) => e.includes('machine-local file URL')),
  );
  assert.deepEqual(
    documents.documentErrors(
      'test.md',
      valid + '\n[API](../packages/site/README.md)\n',
    ),
    [],
  );
});
test('current redirects and Mermaid diagrams are rejected', () => {
  assert.ok(
    documents
      .documentErrors(
        'test.md',
        valid.replace('type: "readme"', 'type: "redirect"'),
      )
      .some((e) => e.includes('redirect')),
  );
  assert.ok(
    documents
      .documentErrors(
        'test.md',
        valid + '\n```mermaid\nflowchart LR\nA-->B\n```\n',
      )
      .some((e) => e.includes('ASCII')),
  );
});
test('module document placement and metadata follow actual ownership', () => {
  const modules = [{ id: 'site', root: 'packages/site' }];
  const source = valid.replace('scope: "test"', 'scope: "book"');
  assert.ok(
    documents
      .moduleDocumentErrors(
        'packages/site/docs/reference/api.md',
        source,
        modules,
      )
      .some((e) => e.includes('type')),
  );
  assert.ok(
    documents
      .moduleDocumentErrors(
        'packages/site/docs/reference/api.md',
        source,
        modules,
      )
      .some((e) => e.includes('scope')),
  );
});
test('missing owner, impossible date and reversed chapters fail', () => {
  assert.equal(typeof documents.documentErrors, 'function');
  const errors = documents.documentErrors(
    'test.md',
    valid
      .replace('owner: "maintainer"\n', '')
      .replace('2026-10-04', '2026-02-30')
      .replace('## 用途与边界', '## 配置'),
  );
  assert.ok(errors.some((e) => e.includes('owner')));
  assert.ok(errors.some((e) => e.includes('created')));
  assert.ok(errors.some((e) => e.includes('chapters')));
});
test('headings inside code fences are not document chapters', () => {
  assert.equal(typeof documents.documentErrors, 'function');
  assert.deepEqual(
    documents.documentErrors('test.md', valid + '\n```md\n## fake\n```\n'),
    [],
  );
});
test('metadata requires stable kebab identifier and populated sections', () => {
  const errors = documents.documentErrors(
    'test.md',
    valid
      .replace('test-readme', 'Bad.ID')
      .replace('## 配置\n具体内容。', '## 配置\n'),
  );
  assert.ok(errors.some((e) => e.includes('id')));
  assert.ok(errors.some((e) => e.includes('empty section')));
});

test('indexes must use their fixed structure', () => {
  const source = valid.replace('type: "readme"', 'type: "index"');
  assert.ok(
    documents
      .documentErrors('test.md', source)
      .some((e) => e.includes('chapters')),
  );
});
test('parent graph permits the root and rejects non-root cycles', () => {
  assert.equal(typeof documents.parentErrors, 'function');
  assert.deepEqual(
    documents.parentErrors(
      new Map([
        ['README.md', { parent: 'README.md' }],
        ['a.md', { parent: 'README.md' }],
      ]),
    ),
    [],
  );
  assert.ok(
    documents
      .parentErrors(
        new Map([
          ['a.md', { parent: 'b.md' }],
          ['b.md', { parent: 'a.md' }],
        ]),
      )
      .some((e) => e.includes('cycle')),
  );
});
test('parent is a document path, not a directory or implementation file', () => {
  for (const parent of ['docs', 'packages/tooling/src/internal/checks.mjs']) {
    assert.ok(
      documents
        .documentErrors(
          'test.md',
          valid.replace('parent: "README.md"', 'parent: "' + parent + '"'),
        )
        .some((e) => e.includes('parent')),
    );
  }
});
test('CommonMark indented fences are not document chapters', () => {
  assert.deepEqual(
    documents.documentErrors('test.md', valid + '\n  ```md\n## fake\n  ```\n'),
    [],
  );
});
test('documents have one main title outside code examples', () => {
  assert.ok(
    documents
      .documentErrors('test.md', valid + '\n# Duplicate\n')
      .some((e) => e.includes('title')),
  );
});
