const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildLifePostPlan } = require('../scripts/webhook-receiver.cjs');

test('overwrites an existing life post with the same title', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-webhook-'));
  const contentDir = path.join(tmpDir, 'src/content/life');
  fs.mkdirSync(contentDir, { recursive: true });

  const existingPath = path.join(contentDir, '2026-06-20-answer.md');
  fs.writeFileSync(
    existingPath,
    '---\ntitle: "答案"\ndescription: "old"\ndate: 2026-06-20\n---\n\nOld content\n'
  );

  const plan = buildLifePostPlan({
    blogRoot: tmpDir,
    title: '答案',
    markdown: 'New content',
    date: '2026-06-20',
  });

  assert.equal(plan.filepath, existingPath);
  assert.match(plan.frontmatter, /New content/);
});

test('creates a new life post file when no title match exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-webhook-'));
  const plan = buildLifePostPlan({
    blogRoot: tmpDir,
    title: '新的文章',
    markdown: 'Fresh content',
    date: '2026-06-20',
    randomSuffix: 101,
  });

  assert.equal(
    plan.filepath,
    path.join(tmpDir, 'src/content/life/2026-06-20-post-101.md')
  );
  assert.match(plan.frontmatter, /Fresh content/);
});

test('prefers the newest matching life post when duplicates exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-webhook-'));
  const contentDir = path.join(tmpDir, 'src/content/life');
  fs.mkdirSync(contentDir, { recursive: true });

  const olderPath = path.join(contentDir, '2026-06-10-answer.md');
  const newerPath = path.join(contentDir, '2026-06-20-answer-copy.md');
  fs.writeFileSync(
    olderPath,
    '---\ntitle: "答案"\ndescription: "old"\ndate: 2026-06-10\n---\n\nOld content\n'
  );
  fs.writeFileSync(
    newerPath,
    '---\ntitle: "答案"\ndescription: "new"\ndate: 2026-06-20\n---\n\nNewer content\n'
  );

  const plan = buildLifePostPlan({
    blogRoot: tmpDir,
    title: '答案',
    markdown: 'Updated content',
    date: '2026-06-20',
  });

  assert.equal(plan.filepath, newerPath);
  assert.deepEqual(plan.duplicatePaths, [olderPath]);
});
