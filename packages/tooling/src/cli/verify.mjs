import { readFile, readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import {
  dependencyErrors,
  linkErrors,
  moduleErrors,
} from '../internal/checks.mjs';
import { buildBook } from '@myblog/book-build';
import {
  documentErrors,
  metadata,
  parentErrors,
  moduleDocumentErrors,
} from '../internal/documents.mjs';

const mode = process.argv[2] || 'all';
if (!['all', 'docs', 'boundaries'].includes(mode))
  throw new Error('unknown engineering mode: ' + mode);
const errors = [];
const exists = async (file) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const { modules } = await readJson('packages/tooling/src/modules.json');
for (const module of modules) {
  const manifest = await readJson(module.root + '/package.json');
  module.packageName = manifest.name;
  if (JSON.stringify(Object.keys(manifest.exports || {})) !== '["."]')
    errors.push(
      `${module.id}: package exports must contain only the root entry`,
    );
}
errors.push(...moduleErrors(modules));

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries
        .filter(
          (entry) =>
            !['node_modules', '.git', 'dist', '.astro', 'vendor'].includes(
              entry.name,
            ),
        )
        .map((entry) => {
          const file = `${directory}/${entry.name}`;
          return entry.isDirectory() ? files(file) : [file];
        }),
    )
  ).flat();
}

const managed = [
  ...(await files('packages')),
  ...(await files('public')),
  ...(await files('docs')).filter(
    (file) =>
      !file.startsWith('docs/archive/') &&
      !file.startsWith('docs/superpowers/'),
  ),
  'README.md',
  'AGENTS.md',
  'docs/archive/README.md',
  'docs/superpowers/README.md',
];
if (mode === 'all' || mode === 'docs') {
  const identifiers = new Map();
  const documentMetadata = new Map();
  for (const module of modules) {
    for (const file of [
      'README.md',
      'docs/README.md',
      'docs/tutorials/getting-started.md',
      'docs/guides/change.md',
      'docs/reference/api.md',
      'docs/explanation/design.md',
      'docs/testing/strategy.md',
    ]) {
      if (!(await exists(`${module.root}/${file}`)))
        errors.push(`${module.id}: missing ${file}`);
    }
    for (const file of [
      ...module.entries,
      ...module.tests,
      ...(module.applicationEntries || []),
    ])
      if (!(await exists(file))) errors.push(`${module.id}: missing ${file}`);
  }
  for (const file of managed.filter(
    (file) =>
      file.endsWith('.md') && !file.startsWith('packages/site/src/content/'),
  )) {
    const source = await readFile(file, 'utf8');
    errors.push(...documentErrors(file, source));
    errors.push(...moduleDocumentErrors(file, source, modules));
    try {
      const meta = metadata(source);
      documentMetadata.set(file, meta);
      if (identifiers.has(meta.id))
        errors.push(file + ': duplicate id with ' + identifiers.get(meta.id));
      identifiers.set(meta.id, file);
      for (const target of [
        meta.parent,
        ...(Array.isArray(meta.related) ? meta.related : []),
      ]) {
        if (
          typeof target !== 'string' ||
          target.startsWith('/') ||
          target.split('/').includes('..') ||
          !(await exists(target))
        )
          errors.push(file + ': invalid metadata target ' + target);
      }
    } catch {
      /* documentErrors already reports parse failures. */
    }
    errors.push(...(await linkErrors(file, source, exists)));
  }
  errors.push(...parentErrors(documentMetadata));
  for (const module of modules) {
    const algorithms = await files(module.root + '/docs');
    if (
      !algorithms.some(
        (file) => file.includes('/algorithms/') && file.endsWith('.md'),
      )
    )
      errors.push(module.id + ': missing algorithm design');
  }
  const config = await readJson('packages/site/src/data/book-config.json');
  const bookCheck = buildBook({
    document: {
      id: 'tooling-check',
      title: 'Tooling check',
      tocTitle: '目录',
      entries: [],
    },
    config,
  });
  if (!bookCheck.ok)
    errors.push(
      ...bookCheck.diagnostics.map(
        (diagnostic) => diagnostic.code + ': ' + diagnostic.message,
      ),
    );
  const generated = spawnSync(
    process.execPath,
    ['packages/tooling/src/cli/generate-reference.mjs', '--check'],
    { encoding: 'utf8' },
  );
  if (generated.status !== 0) errors.push(generated.stderr.trim());
}
if (mode === 'all' || mode === 'boundaries') {
  for (const file of managed.filter(
    (file) =>
      /\.(?:mjs|cjs|js|ts|astro)$/.test(file) &&
      modules.some((module) => file.startsWith(module.sourceRoot + '/')),
  )) {
    const source = await readFile(file, 'utf8');
    errors.push(...dependencyErrors(file, source, modules));
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else if (!process.argv.includes('--generate'))
  console.log(`Engineering ${mode} checks passed`);
