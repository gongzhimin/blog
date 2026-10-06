import test from 'node:test';
import assert from 'node:assert/strict';
import { validateBookConfig } from '../../packages/book-build/src/internal/config/book-config.mjs';
import { readFile } from 'node:fs/promises';
import { createAstroBlogDocument } from '../../packages/site/src/internal/sources/astro-blog-source.mjs';
import {
  dependencyErrors,
  moduleErrors,
  linkErrors,
  referenceMarkdown,
} from '../../packages/tooling/src/internal/checks.mjs';
import { createJsonBookDocument } from '../../packages/site/src/internal/sources/json-book-source.mjs';
import Ajv2020 from 'ajv/dist/2020.js';

test('Astro dependency checks cover frontmatter and client script imports', async () => {
  const modules = [
    { id: 'site', owns: ['packages/site/src/'], dependencies: [], entries: [] },
    {
      id: 'publishing',
      owns: ['packages/publishing/src/'],
      dependencies: [],
      entries: [],
    },
  ];
  for (const source of [
    "---\nimport '../../../packages/publishing/src/api/index.cjs';\n---\n<div />",
    "<div /><script>import '../../../packages/publishing/src/api/index.cjs';</script>",
  ]) {
    assert.ok(
      dependencyErrors('packages/site/src/example.astro', source, modules).some(
        (error) => error.includes('cannot depend'),
      ),
    );
  }
  assert.ok(
    dependencyErrors(
      'packages/site/src/example.mjs',
      "import '../../unowned/helper.mjs'",
      modules,
    ).some((error) => error.includes('no module owner')),
  );
});

test('homepage editor schema and runtime validator derive from the same field contracts', async () => {
  const module = await import('@myblog/site');
  assert.equal(typeof module.inspectHomepageConfig, 'function');
  const homepage = JSON.parse(
    await readFile(
      new URL(
        '../../packages/site/src/data/homepage-config.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const result = module.inspectHomepageConfig(homepage);
  assert.equal(result.ok, true);
  const schema = result.schema;
  const validate = new Ajv2020({ strict: false }).compile(schema);
  assert.equal(validate(homepage), true);
  for (const [field, value] of [
    ['fontFamily', 'unknown'],
    ['fontSize', '15px'],
  ]) {
    const invalid = structuredClone(homepage);
    invalid.book.pages.life.partLink[field] = value;
    assert.equal(validate(invalid), false);
    assert.equal(module.inspectHomepageConfig(invalid).ok, false);
  }
});

test('content boundaries reject invalid dates and unsupported body formats', () => {
  assert.throws(
    () =>
      createAstroBlogDocument({
        lifePosts: [{ id: 'bad', data: { title: 'bad' } }],
        blogPosts: [],
      }),
    /Invalid post date/,
  );
  assert.throws(
    () =>
      createJsonBookDocument({
        id: 'book',
        title: 'book',
        entries: [{ title: 'entry', bodyType: 'pdf' }],
      }),
    /bodyType/,
  );
  assert.throws(
    () =>
      createJsonBookDocument({
        id: 'book',
        title: 'book',
        entries: [{ title: 'entry', date: 'not-a-date' }],
      }),
    /date/,
  );
});

test('module boundaries reject imports through private implementation files', async () => {
  const modules = [
    {
      id: 'site',
      root: 'packages/site',
      sourceRoot: 'packages/site/src',
      owns: ['packages/site/'],
      dependencies: ['book'],
      entries: ['packages/site/src/api/index.mjs'],
      tests: [],
    },
    {
      id: 'book',
      root: 'packages/book-build',
      sourceRoot: 'packages/book-build/src',
      owns: ['packages/book-build/'],
      dependencies: [],
      entries: ['packages/book-build/src/api/index.mjs'],
      tests: [],
    },
  ];
  assert.equal(
    dependencyErrors(
      'packages/site/src/use.mjs',
      "import '../../../packages/book-build/src/internal/private.mjs'",
      modules,
    ).length,
    1,
  );
  assert.equal(
    dependencyErrors(
      'packages/site/src/use.mjs',
      "import '../../../packages/book-build/src/api/index.mjs'",
      modules,
    ).length,
    1,
  );
  assert.equal(moduleErrors(modules).length, 0);
  const cyclic = structuredClone(modules);
  cyclic[1].dependencies = ['site'];
  assert.ok(moduleErrors(cyclic).some((error) => error.includes('cycle')));
  const unknown = structuredClone(modules);
  unknown[0].dependencies = ['missing'];
  assert.ok(moduleErrors(unknown).some((error) => error.includes('missing')));
});

const config = JSON.parse(
  await readFile(
    new URL('../../packages/site/src/data/book-config.json', import.meta.url),
  ),
);

test('configuration rejects schema-invalid nested values with precise paths', () => {
  for (const [key, value] of [
    ['height', '600'],
    ['mobileBreakpoint', null],
  ]) {
    const invalid = structuredClone(config);
    invalid.book[key] = value;
    assert.throws(
      () => validateBookConfig(invalid),
      new RegExp(`book\\.${key}`),
    );
  }
  const invalid = structuredClone(config);
  invalid.book.coverSprite.positions.front = 42;
  assert.throws(
    () => validateBookConfig(invalid),
    /book\.coverSprite\.positions\.front/,
  );
});

test('engineering checks reject forbidden dependencies and broken relative links', async () => {
  const modules = [
    {
      id: 'book',
      root: 'packages/book-build',
      sourceRoot: 'packages/book-build/src',
      owns: ['packages/book-build/'],
      dependencies: [],
      entries: ['packages/book-build/src/api/index.mjs'],
    },
    {
      id: 'site',
      root: 'packages/site',
      sourceRoot: 'packages/site/src',
      owns: ['packages/site/'],
      dependencies: ['book'],
      entries: ['packages/site/src/api/index.mjs'],
    },
  ];
  assert.equal(
    dependencyErrors(
      'packages/book-build/src/a.mjs',
      "import '../../../packages/site/src/a.mjs';",
      modules,
    ).length,
    1,
  );
  assert.equal(
    dependencyErrors(
      'packages/site/src/a.mjs',
      "export { a } from '../../../packages/book-build/src/api/index.mjs';",
      modules,
    ).length,
    1,
  );
  assert.equal(
    dependencyErrors(
      'packages/book-build/src/a.mjs',
      "const x = require('../../../packages/site/src/a.cjs');",
      modules,
    ).length,
    1,
  );
  assert.equal(
    dependencyErrors(
      'packages/book-build/src/a.mjs',
      "const x = import('../../../packages/site/src/a.mjs');",
      modules,
    ).length,
    1,
  );
  assert.equal(
    dependencyErrors(
      'packages/book-build/src/a.mjs',
      "import('../site/' + name);",
      modules,
    ).length,
    1,
  );
  assert.equal(
    dependencyErrors(
      'packages/book-build/src/a.mjs',
      "// import '../site/a.mjs'",
      modules,
    ).length,
    0,
  );
  assert.equal(
    dependencyErrors(
      'packages/book-build/src/a.mjs',
      'const text = "import \'../site/a.mjs\'";',
      modules,
    ).length,
    0,
  );
  assert.deepEqual(
    await linkErrors('README.md', '[missing](missing.md)', async () => false),
    ['README.md: missing.md'],
  );
  assert.deepEqual(
    await linkErrors(
      'README.md',
      '```md\n[x](missing.md)\n```\n[x](https://example.com)',
      async () => false,
    ),
    [],
  );
  assert.match(
    referenceMarkdown(
      {
        properties: { size: { type: 'number', minimum: 1 } },
        required: ['size'],
      },
      { size: 2 },
    ),
    /size.*number.*是.*2/,
  );
});
