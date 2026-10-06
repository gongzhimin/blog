import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('homepage consumes book config and the shared book runtime', async () => {
  const [page, app, adapter, homepageStyles] = await Promise.all([
    readFile(
      new URL('../../packages/site/src/pages/index.astro', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../../packages/site/src/internal/book-app.js', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL(
        '../../packages/book-runtime/src/internal/turnjs-adapter.js',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../../packages/site/src/internal/presentation/build-homepage-styles.mjs',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);

  assert.match(
    page,
    /import bookConfig from ['"]\.\.\/data\/book-config\.json['"]/,
  );
  assert.match(page, /from ['"]\.\.\/api\/index\.mjs['"]/);
  assert.doesNotMatch(page, /from ['"]\.\.\/lib\/book-renderer\.js['"]/);
  assert.ok(
    page.includes("import BookShell from '../components/BookShell.astro';"),
  );
  assert.ok(
    page.includes(
      "import BookRuntimeAssets from '../components/BookRuntimeAssets.astro';",
    ),
  );
  assert.match(page, /from ['"]\.\.\/api\/index\.mjs['"]/);
  assert.match(page, /loadSiteBookTheme\(bookConfig\.theme\?\.id/);
  assert.match(page, /buildHomepageModel\(\{/);
  assert.match(page, /<BookShell/);
  assert.match(page, /<BookRuntimeAssets/);
  assert.match(page, /buildHomepageModel\(\{[\s\S]*bookConfig,[\s\S]*theme/);
  assert.match(page, /const \{ runConfig, homepageStyles/);
  assert.match(homepageStyles, /mobileCanvas\.width/);
  assert.match(homepageStyles, /mobileContentPage\.height/);
  assert.doesNotMatch(page, /#canvas \{ width: 370px/);
  assert.doesNotMatch(page, /data-config=\{JSON\.stringify\(runConfig\)\}/);
  assert.doesNotMatch(page, /src="\/book-runtime\/js\/book-app\.js"/);
  assert.doesNotMatch(page, /src="\/vendor\/turnjs\/js\/book-app\.js"/);
  assert.doesNotMatch(page, /src="\/vendor\/turnjs\/jquery/);
  assert.doesNotMatch(page, /href="\/vendor\/turnjs\/css\/steve-jobs\.css"/);
  assert.doesNotMatch(page, /bookContentCSS\.replace/);
  assert.doesNotMatch(page, /bookTocCSS\.replace/);
  assert.doesNotMatch(page, /createClassicPaperTheme/);
  assert.doesNotMatch(page, /function loadApp\(/);
  assert.doesNotMatch(page, /const homepageStyles = `\n/);
  assert.doesNotMatch(page, /updateDepth = function/);

  assert.match(app, /BACK_PAGE/);
  assert.match(app, /BOOK_CONFIG\.book\.turn\.totalPages/);
  assert.match(app, /BOOK_CONFIG\.book\.mobileBreakpoint/);
  assert.match(app, /paginationResult\.pages/);
  assert.doesNotMatch(app, /width: 370, height: 507/);
  assert.match(app, /window\.BookRuntime\.API\.paginateBook\(BOOK_CONFIG\)/);
  assert.match(app, /paginationResult\.articleToPage/);
  assert.match(app, /window\.BookRuntime\.TurnAdapter\.create/);
  assert.doesNotMatch(app, /Hash\.check\(\)\.update\(\)/);
  assert.doesNotMatch(app, /function updateDepth/);
  assert.doesNotMatch(app, /ARTICLE_H/);
  assert.doesNotMatch(app, /nop:[\s\S]{0,140}turn\('page', 1\)/);
  assert.doesNotMatch(app, /\.p111\b/);
  assert.doesNotMatch(app, /turn\.html4/);

  assert.match(adapter, /Hash\.check\(\)\.update\(\)/);
  assert.match(adapter, /nop:[\s\S]{0,140}startPage/);
  assert.match(adapter, /function updateDepth/);
  assert.doesNotMatch(adapter, /ARTICLE_H/);
  assert.doesNotMatch(adapter, /nop:[\s\S]{0,140}turn\('page', 1\)/);
  assert.doesNotMatch(adapter, /\.p111\b/);
  assert.doesNotMatch(adapter, /turn\.html4/);
});
