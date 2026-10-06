import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FIELDS,
  buildHomepageResponsiveStyles,
  buildHomepageCssVariables,
  validateHomepageConfig,
} from '../src/internal/config/homepage-config.mjs';

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

const config = await readJson('../src/data/homepage-config.json');
const schema = await readJson('../src/data/homepage-config.schema.json');
const bookConfig = await readJson('../src/data/book-config.json');

test('homepage config is grouped by component and produces component variables', () => {
  assert.deepEqual(
    Object.keys(config)
      .filter((key) => key !== '$schema')
      .sort(),
    ['book', 'directories', 'footer', 'navigation'],
  );
  assert.equal('content' in config, false);
  assert.equal('layout' in config, false);
  assert.equal('catalogs' in config, false);
  assert.equal('textStyles' in config, false);
  assert.equal('materials' in config, false);

  assert.doesNotThrow(() => validateHomepageConfig(config));
  assert.equal(config.navigation.content.siteName, 'ZHIMIN');
  assert.equal(config.footer.content.copyrightLabel, 'Zhimin 的博客书');
  assert.equal(config.book.size.viewportWidth, '72vw');
  assert.equal(config.book.size.minimumWidth, '36rem');
  assert.equal(config.book.size.aspectRatio, '1.8 / 1');
  assert.equal(config.book.pageEdges.width, '2%');
  assert.equal(config.book.innerSpine.seamWidth, '1px');
  assert.equal(config.book.pages.life.catalog.narrowMaximumEntries, 3);
  assert.equal(config.book.pages.technical.catalog.narrowMaximumEntries, 3);
  assert.equal(config.book.pages.life.catalogTitle.fontSize, '0.55cqw');
  assert.equal(config.book.pages.technical.catalogTitle.fontSize, '0.55cqw');
  assert.equal('minimumSize' in config.book.pages.life.catalogTitle, false);

  const css = buildHomepageCssVariables(config);
  assert.match(css, /--home-book-size-viewport-width:72vw/);
  assert.match(css, /--home-book-size-minimum-width:36rem/);
  assert.match(css, /--home-book-size-aspect-ratio:1\.8 \/ 1/);
  assert.match(css, /--home-book-size-aspect-ratio-number:1\.8/);
  assert.match(css, /--home-book-inner-spine-seam-width:1px/);
  assert.match(css, /--home-book-pages-life-catalog-title-font-size:0\.55cqw/);
  assert.match(
    css,
    /--home-book-pages-technical-catalog-title-font-size:0\.55cqw/,
  );
  assert.match(css, /--home-book-cover-color:#f0f0f0/);

  const responsiveCss = buildHomepageResponsiveStyles(config);
  assert.match(
    responsiveCss,
    new RegExp(
      `@container home-navigation \\(max-width: ${config.navigation.title.hideThreshold.replace('.', '\\.')}\\)`,
    ),
  );
  assert.match(
    responsiveCss,
    new RegExp(
      `@container home-book \\(max-width: ${config.book.pages.life.catalog.narrowBookWidth.replace('.', '\\.')}\\)`,
    ),
  );
});

test('homepage config reports component paths for missing values', () => {
  const invalid = structuredClone(config);
  delete invalid.book.size.aspectRatio;

  assert.throws(
    () => validateHomepageConfig(invalid),
    /book\.size\.aspectRatio is required/,
  );
});

test('book text sizes must use cqw only', () => {
  const invalid = structuredClone(config);
  invalid.book.pages.life.catalogTitle.fontSize = '0.8rem';

  assert.throws(
    () => validateHomepageConfig(invalid),
    /book\.pages\.life\.catalogTitle\.fontSize must use cqw/,
  );
});

test('homepage config rejects invalid colors and opacity', () => {
  const invalidColor = structuredClone(config);
  invalidColor.book.paper.color = 'white-ish';
  assert.throws(
    () => validateHomepageConfig(invalidColor),
    /book\.paper\.color must be a CSS color/,
  );

  const invalidOpacity = structuredClone(config);
  invalidOpacity.book.paper.textureOpacity = 1.2;
  assert.throws(
    () => validateHomepageConfig(invalidOpacity),
    /book\.paper\.textureOpacity must be between 0 and 1/,
  );
});

test('homepage config rejects unsupported font families and entry counts', () => {
  const invalidFont = structuredClone(config);
  invalidFont.navigation.brand.fontFamily = 'comic';
  assert.throws(
    () => validateHomepageConfig(invalidFont),
    /navigation\.brand\.fontFamily must be one of serif, sans, monospace/,
  );

  const invalidCount = structuredClone(config);
  invalidCount.book.pages.life.catalog.narrowMaximumEntries = 0;
  assert.throws(
    () => validateHomepageConfig(invalidCount),
    /book\.pages\.life\.catalog\.narrowMaximumEntries must be a positive integer/,
  );
});

test('schema and tuning fields expose component groups', () => {
  assert.match(schema.description, /homepage-config API/);
  assert.doesNotMatch(schema.description, /api\/index\.mjs/);
  assert.deepEqual(schema.required, [
    'navigation',
    'book',
    'footer',
    'directories',
  ]);
  assert.match(
    schema.properties.book.properties.innerSpine.description,
    /书内脊/,
  );
  assert.match(
    schema.properties.book.properties.pages.properties.life.description,
    /生活/,
  );
  assert.ok(FIELDS.some(([path]) => path === 'book.size.viewportWidth'));
  assert.ok(
    FIELDS.some(([path]) => path === 'book.pages.life.catalogTitle.fontSize'),
  );
  assert.equal(
    FIELDS.some(([path]) => path.startsWith('textStyles.')),
    false,
  );
});

test('turnjs book config defines navigation, page geometry, and pagination', () => {
  assert.equal(bookConfig.theme.id, 'classic-paper');
  assert.equal(bookConfig.book.mobileBreakpoint, 800);
  assert.equal(bookConfig.nav.brand.text, 'ZHIMIN');
  assert.deepEqual(
    bookConfig.nav.links.items.map((item) => item.href),
    ['/life', '/blog', '/about', '/rss.xml'],
  );
  assert.equal(bookConfig.book.width, 960);
  assert.equal(bookConfig.book.height, 600);
  assert.equal(bookConfig.book.contentPage.width, 460);
  assert.equal(bookConfig.book.contentPage.height, 582);
  assert.deepEqual(bookConfig.book.mobileCanvas, {
    width: 370,
    paddingY: 16,
  });
  assert.deepEqual(bookConfig.book.mobileContentPage, {
    width: 370,
    height: 507,
  });
  assert.equal(
    bookConfig.book.coverSprite.image,
    '/vendor/turnjs/pics/book-covers.jpg',
  );
  assert.equal(bookConfig.book.coverSprite.backgroundSize, '2400px 600px');
  assert.equal(bookConfig.book.coverSprite.positions.back, '-968px 0');
  assert.equal(bookConfig.book.turn.startPage, 7);
  assert.equal(bookConfig.book.pagination.contentWidth, 380);
  assert.equal(bookConfig.book.pagination.contentHeight, 471);
  assert.equal('charsPerLine' in bookConfig.book.pagination, false);
  assert.equal('elements' in bookConfig.book.pagination, false);
});

test('directory folios consume separate component styles', async () => {
  const css = await readFile(
    new URL('../src/styles/global.css', import.meta.url),
    'utf8',
  );

  assert.match(css, /--home-directories-life-folio-font-size/);
  assert.match(css, /--home-directories-technical-folio-font-size/);
});
