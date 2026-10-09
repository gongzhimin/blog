import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import yaml from 'js-yaml';
import browserConfig from '../../packages/tooling/src/config/playwright.config.mjs';
import lintConfig from '../../packages/tooling/src/config/eslint.config.mjs';

test('application modules expose API directories and have no legacy source roots', () => {
  for (const path of [
    'packages/site/src/api',
    'packages/book-build/src/api',
    'packages/book-runtime/src/api',
    'packages/publishing/src/api',
    'packages/operations/src/api',
  ]) {
    assert.ok(existsSync(path), `${path} public API must exist`);
  }
  for (const path of [
    'src/pages',
    'src/components',
    'src/lib/book-renderer.js',
    'public/book-runtime/js',
    'scripts/webhook-receiver.cjs',
    'scripts/server-health-check.cjs',
  ]) {
    assert.equal(
      existsSync(path),
      false,
      `${path} must not be a compatibility entry`,
    );
  }
});

test('six independently versioned modules are private npm workspace packages', () => {
  const root = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(root.workspaces, ['packages/*']);

  const packageNames = [
    'site',
    'book-build',
    'book-runtime',
    'publishing',
    'operations',
    'tooling',
  ];
  for (const name of packageNames) {
    const manifestPath = `packages/${name}/package.json`;
    assert.ok(existsSync(manifestPath), `${name} workspace manifest missing`);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.name, `@myblog/${name}`);
    assert.equal(manifest.private, true, `${name} must not be publishable`);
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
    assert.ok(manifest.exports, `${name} must declare public exports`);
    assert.deepEqual(
      Object.keys(manifest.exports),
      ['.'],
      `${name} consumers must import through the package root only`,
    );
  }
});

test('root layout keeps module implementations, CLIs and engineering configuration together', () => {
  for (const path of [
    'packages/tooling/src/api/index.mjs',
    'packages/tooling/src/config/eslint.config.mjs',
    'packages/tooling/src/config/playwright.config.mjs',
    'packages/site/src/cli/update-daily-quote.mjs',
    'packages/publishing/src/cli/publish.cjs',
    'packages/operations/src/cli/health.cjs',
    'packages/site/src/tools/cover-generator/sprite-only.html',
    'packages/site/docs/guides/cover-generator.md',
    'docs/guides/contributing.md',
    'tests/integration',
    'tests/e2e',
  ]) {
    assert.ok(existsSync(path), `missing owned entry: ${path}`);
  }
  for (const path of [
    'scripts',
    'tools',
    'test',
    'CONTRIBUTING.md',
    'eslint.config.mjs',
    'playwright.config.mjs',
  ]) {
    assert.equal(existsSync(path), false, `obsolete root entry: ${path}`);
  }
  const allowed = new Set([
    'README.md',
    'AGENTS.md',
    'package.json',
    'package-lock.json',
    'astro.config.mjs',
    'tsconfig.json',
  ]);
  const files = readdirSync('.', { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);
  assert.deepEqual(
    files.filter((file) => !allowed.has(file)),
    [],
  );
});

test('npm and deployment entries target owned paths and discover both test layers', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(
    scripts['server:publish'],
    'node packages/publishing/src/cli/publish.cjs',
  );
  assert.equal(
    scripts['server:health'],
    'node packages/operations/src/cli/health.cjs',
  );
  assert.equal(
    scripts['update:daily-quote'],
    'node packages/site/src/cli/update-daily-quote.mjs',
  );
  assert.equal(scripts['test:node'], 'node packages/tooling/src/cli/test.mjs');
  assert.equal(
    scripts['check:tests'],
    'node packages/tooling/src/cli/test.mjs --check',
  );
  assert.match(
    scripts['test:e2e'],
    /--config packages\/tooling\/src\/config\/playwright\.config\.mjs/,
  );
  const playwrightConfig = readFileSync(
    'packages/tooling/src/config/playwright.config.mjs',
    'utf8',
  );
  assert.match(playwrightConfig, /new URL\('\.\.\/\.\.\/\.\.\/\.\.\//);
  assert.match(playwrightConfig, /tests\/e2e\//);
  assert.match(
    scripts.lint,
    /--config packages\/tooling\/src\/config\/eslint\.config\.mjs/,
  );
  assert.match(
    readFileSync('packages/operations/src/assets/blog-webhook.service', 'utf8'),
    /ExecStart=\/usr\/bin\/node \/var\/www\/blog\/packages\/publishing\/src\/cli\/publish\.cjs/,
  );
});

test('webhook workflow uploads existing entries and creates their installation directories', () => {
  const workflow = yaml.load(
    readFileSync('.github/workflows/deploy-webhook.yml', 'utf8'),
  );
  for (const event of ['push', 'pull_request']) {
    assert.ok(workflow.on[event].paths.includes('packages/**'));
    assert.ok(workflow.on[event].paths.includes('tests/**'));
    assert.equal(workflow.on[event].paths.includes('src/**'), false);
  }
  const steps = workflow.jobs['deploy-webhook'].steps;
  const upload = steps.find((step) =>
    step.uses?.startsWith('appleboy/scp-action'),
  );
  const install = steps.find((step) =>
    step.uses?.startsWith('appleboy/ssh-action'),
  ).with.script;
  for (const target of upload.with.source.split(',')) {
    assert.ok(existsSync(target), `upload target missing: ${target}`);
  }
  assert.match(
    install,
    /cp -R \/tmp\/blog-webhook-deploy\/packages\/\. \/var\/www\/blog\/packages\//,
  );
  assert.match(
    install,
    /packages\/operations\/src\/assets\/blog-webhook\.service/,
  );
  assert.match(install, /packages\/operations\/src\/cli\/health\.cjs/);
});

test('Astro application and six documentation systems match physical module ownership', () => {
  assert.ok(
    readFileSync('astro.config.mjs', 'utf8').includes(
      "srcDir: './packages/site/src'",
    ),
  );
  const manifest = JSON.parse(
    readFileSync('packages/tooling/src/modules.json', 'utf8'),
  );
  for (const module of manifest.modules) {
    for (const path of [
      'README.md',
      'docs/README.md',
      'docs/explanation/design.md',
      'docs/reference/api.md',
      'docs/tutorials/getting-started.md',
      'docs/guides/change.md',
      'docs/testing/strategy.md',
    ]) {
      assert.ok(
        existsSync(`${module.root}/${path}`),
        `${module.id}: missing ${path}`,
      );
    }
    for (const entry of module.entries)
      assert.ok(
        entry.startsWith(`${module.sourceRoot || module.root}/api/`),
        `${module.id}: private entry ${entry}`,
      );
  }
  for (const path of [
    'docs/pagination-workflow.md',
    'docs/book-runtime-interface.md',
    'docs/ios-shortcuts-image-publishing.md',
    'docs/mobile-responsive-plan.md',
    'docs/optimization-roadmap.md',
    'docs/server-runtime/README.md',
    'docs/server-runtime/rebuild-server.md',
    'docs/reference/book-config.generated.md',
    'docs/reference/homepage-config.generated.md',
  ]) {
    assert.equal(existsSync(path), false, `redirect not removed: ${path}`);
  }
});

test('module manifest registers every discovered test without claiming foreign module tests', () => {
  const { modules } = JSON.parse(
    readFileSync('packages/tooling/src/modules.json', 'utf8'),
  );
  const files = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? files(`${directory}/${entry.name}`)
        : entry.isFile() && /\.(?:test|spec)\.(?:mjs|cjs)$/.test(entry.name)
          ? [`${directory}/${entry.name}`]
          : [],
    );
  const discovered = [
    ...modules.flatMap((module) =>
      files(module.testRoot || (module.sourceRoot || module.root) + '/tests'),
    ),
    ...files('tests/integration'),
    ...files('tests/e2e'),
  ];
  const registered = new Set(modules.flatMap((module) => module.tests));
  assert.deepEqual(
    discovered.filter((file) => !registered.has(file)),
    [],
  );
  assert.deepEqual(
    [...registered].filter((file) => !discovered.includes(file)),
    [],
  );
  for (const module of modules) {
    for (const file of module.tests) {
      assert.ok(
        file.startsWith(
          (module.testRoot || (module.sourceRoot || module.root) + '/tests') +
            '/',
        ) || file.startsWith('tests/'),
        `${module.id}: foreign local test ${file}`,
      );
    }
  }
});

test('acceptance configuration prevents warning, retry, stale build and CI compatibility bypasses', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(scripts.check, /--minimumFailingSeverity hint/);
  assert.match(scripts.lint, /--max-warnings=0/);
  assert.match(scripts.verify, /npm run check:tests/);
  assert.equal(
    scripts['verify:release'],
    'npm run verify && npm run check:packages && npm run test:e2e',
  );
  assert.equal(scripts['pretest:e2e'], 'npm run check:tests && npm run build');
  const contracts = JSON.parse(
    readFileSync('packages/tooling/src/config/tsconfig.contracts.json', 'utf8'),
  );
  assert.equal(contracts.compilerOptions.skipLibCheck, false);
  assert.ok(
    contracts.include.some((path) => path.endsWith('public-api-contracts.ts')),
  );
  assert.ok(
    lintConfig.some((item) => item.files?.includes('packages/**/*.mjs')),
  );
  assert.equal(browserConfig.forbidOnly, true);
  assert.equal(browserConfig.failOnFlakyTests, true);
  assert.equal(browserConfig.retries, 0);
  assert.equal(browserConfig.webServer.reuseExistingServer, false);
  assert.equal(browserConfig.use.baseURL, 'http://127.0.0.1:4392');
  assert.match(browserConfig.webServer.command, /--port 4392/);
  assert.deepEqual(
    browserConfig.projects.map((project) => project.name),
    ['chromium', 'webkit'],
  );
  assert.ok(
    browserConfig.reporter.some(([path]) =>
      path.endsWith('strict-browser-reporter.mjs'),
    ),
  );

  const workflow = yaml.load(
    readFileSync('.github/workflows/deploy.yml', 'utf8'),
  );
  assert.deepEqual(workflow.jobs.deploy.needs, ['verify', 'compatibility']);
  for (const [job, version] of [
    ['verify', '22'],
    ['compatibility', '24'],
  ]) {
    const steps = workflow.jobs[job].steps;
    assert.equal(
      steps.find((step) => step.uses?.startsWith('actions/setup-node')).with[
        'node-version'
      ],
      version,
    );
    assert.ok(steps.some((step) => step.run === 'npm run verify'));
  }
  assert.ok(
    workflow.jobs.verify.steps.some((step) => step.run === 'npm run test:e2e'),
  );
  assert.ok(
    workflow.jobs.verify.steps.some(
      (step) =>
        step.run === 'npx playwright install --with-deps chromium webkit',
    ),
  );
  assert.ok(
    workflow.jobs.verify.steps.some(
      (step) =>
        step.if === 'always()' && step.with?.name === 'browser-evidence',
    ),
  );
});
