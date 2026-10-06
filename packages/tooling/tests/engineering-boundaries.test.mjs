import test from 'node:test';
import assert from 'node:assert/strict';
import { dependencyErrors, moduleErrors } from '../src/internal/checks.mjs';
const modules = [
  {
    id: 'site',
    packageName: '@myblog/site',
    root: 'packages/site',
    sourceRoot: 'packages/site/src',
    owns: ['packages/site/'],
    dependencies: ['book'],
    entries: ['packages/site/src/api/index.mjs'],
  },
  {
    id: 'book',
    packageName: '@myblog/book-build',
    root: 'packages/book-build',
    sourceRoot: 'packages/book-build/src',
    owns: ['packages/book-build/'],
    dependencies: [],
    entries: ['packages/book-build/src/api/index.mjs'],
  },
];
test('package-name imports enforce dependency direction and root-only exports', () => {
  for (const source of [
    "import '@myblog/site'",
    "export * from '@myblog/site'",
    "const site = require('@myblog/site')",
    "const site = import('@myblog/site')",
  ]) {
    assert.ok(
      dependencyErrors('packages/book-build/src/use.mjs', source, modules).some(
        (error) => error.includes('cannot depend on site'),
      ),
      source,
    );
  }
  for (const source of [
    "import '@myblog/book-build/src/internal/private.mjs'",
    "import '@myblog/book-build/theme'",
    "import '@myblog/unknown'",
  ]) {
    assert.notDeepEqual(
      dependencyErrors('packages/site/src/use.mjs', source, modules),
      [],
      source,
    );
  }
  assert.deepEqual(
    dependencyErrors(
      'packages/site/src/use.mjs',
      "import '@myblog/book-build'",
      modules,
    ),
    [],
  );
});
test('private files are rejected as entries and cross-package relative imports', () => {
  const bad = structuredClone(modules);
  bad[1].entries = ['packages/book-build/src/internal/private.mjs'];
  assert.ok(moduleErrors(bad).some((e) => e.includes('api/')));
  assert.ok(
    dependencyErrors(
      'packages/site/src/use.mjs',
      "import '../../../packages/book-build/src/internal/private.mjs'",
      bad,
    ).some((e) =>
      e.includes('cross-package imports must use the package name'),
    ),
  );
});
test('project aliases cannot bypass module ownership', () => {
  assert.ok(
    dependencyErrors(
      'packages/site/src/use.mjs',
      "import '@/book/internal/private.mjs'",
      modules,
    ).some((e) => e.includes('alias')),
  );
});
test('module roots cannot claim unrelated source trees', () => {
  const bad = structuredClone(modules);
  bad[0].owns.push('src/components/');
  assert.ok(moduleErrors(bad).some((e) => e.includes('ownership')));
});
test('application entry declarations cannot claim another module tree', () => {
  const bad = structuredClone(modules);
  bad[0].owns.push('packages/book-build/src/internal/private.mjs');
  bad[0].applicationEntries = ['packages/book-build/src/internal/private.mjs'];
  assert.ok(moduleErrors(bad).some((e) => e.includes('application entry')));
});
test('public API has a legal positive control', () => {
  assert.deepEqual(moduleErrors(modules), []);
  assert.deepEqual(
    dependencyErrors(
      'packages/site/src/use.mjs',
      "import '@myblog/book-build'",
      modules,
    ),
    [],
  );
});

test('application entries are exact CLI files inside the owning module', () => {
  const good = structuredClone(modules);
  good[0].applicationEntries = ['packages/site/src/cli/update-daily-quote.mjs'];
  assert.deepEqual(moduleErrors(good), []);
  for (const entry of [
    'scripts/update-daily-quote.mjs',
    'packages/book-build/src/cli/foreign.mjs',
    'packages/site/src/cli/../../book/cli/foreign.mjs',
    'packages/site/src/cli/nested/task.mjs',
    'packages/site/src/cli/',
  ]) {
    const bad = structuredClone(good);
    bad[0].applicationEntries = [entry];
    assert.ok(
      moduleErrors(bad).some((error) => error.includes('application entry')),
      entry,
    );
  }
});

test('an application entry cannot extend ownership outside the module root', () => {
  const bad = structuredClone(modules);
  bad[0].owns.push('scripts/update-daily-quote.mjs');
  bad[0].applicationEntries = ['scripts/update-daily-quote.mjs'];
  assert.ok(moduleErrors(bad).some((error) => error.includes('ownership')));
});
