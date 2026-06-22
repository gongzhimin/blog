const CSS_LENGTH_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:rem|px|%|svh|svw|vw|vh|em|cqw|cqh|cqi|cqb)$/;
const CSS_ANGLE_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|rad|turn)$/;
const CSS_RATIO_PATTERN =
  /^(?<width>\d+(?:\.\d+)?)\s*\/\s*(?<height>\d+(?:\.\d+)?)$/;
const CSS_COLOR_PATTERN =
  /^(?:#[\da-f]{3,8}|rgba?\(\s*[\d.%\s,/-]+\))$/i;
const DATE_FORMAT_PATTERN = /^(?:YYYY|MM|DD|[.\-/\s])+$/;

const FONT_FAMILIES = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  monospace: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
};

const textStyleDescriptors = [
  ["navigation.brand", "navigation-brand"],
  ["navigation.title", "navigation-title"],
  ["navigation.lifeLink", "navigation-life-link"],
  ["navigation.technicalLink", "navigation-technical-link"],
  ["navigation.aboutLink", "navigation-about-link"],
  ["navigation.rssLink", "navigation-rss-link"],
  ["lifePage.runningOuter", "life-page-running-outer"],
  ["lifePage.runningInner", "life-page-running-inner"],
  ["lifePage.partLink", "life-page-part-link"],
  ["lifePage.catalogTitle", "life-page-catalog-title"],
  ["lifePage.catalogDate", "life-page-catalog-date"],
  ["lifePage.archiveLink", "life-page-archive-link"],
  ["lifePage.folio", "life-page-folio"],
  ["technicalPage.runningOuter", "technical-page-running-outer"],
  ["technicalPage.runningInner", "technical-page-running-inner"],
  ["technicalPage.partLink", "technical-page-part-link"],
  ["technicalPage.catalogTitle", "technical-page-catalog-title"],
  ["technicalPage.catalogDate", "technical-page-catalog-date"],
  ["technicalPage.archiveLink", "technical-page-archive-link"],
  ["technicalPage.folio", "technical-page-folio"],
  ["footer.quoteEnglish", "footer-quote-english"],
  ["footer.quoteTranslation", "footer-quote-translation"],
  ["footer.quoteAuthor", "footer-quote-author"],
  ["footer.copyright", "footer-copyright"],
  ["lifeDirectory.folio", "life-directory-folio"],
  ["technicalDirectory.folio", "technical-directory-folio"],
];

const baseFields = [
  ["content.siteName", "text"],
  ["content.navigationTitle", "text"],
  ["content.copyrightLabel", "text"],
  ["content.navigation.lifeLabel", "text"],
  ["content.navigation.technicalLabel", "text"],
  ["content.navigation.aboutLabel", "text"],
  ["content.navigation.rssLabel", "text"],
  ["content.life.outerRunningLabel", "text"],
  ["content.life.innerRunningLabel", "text"],
  ["content.life.partLabel", "text"],
  ["content.life.archiveLabel", "text"],
  ["content.life.homepageFolio", "text"],
  ["content.life.directoryFolio", "text"],
  ["content.technical.outerRunningLabel", "text"],
  ["content.technical.innerRunningLabel", "text"],
  ["content.technical.partLabel", "text"],
  ["content.technical.archiveLabel", "text"],
  ["content.technical.homepageFolio", "text"],
  ["content.technical.directoryFolio", "text"],

  ["layout.navigation.minimumHeight", "length", "layout-navigation-minimum-height"],
  ["layout.navigation.fluidHeight", "length", "layout-navigation-fluid-height"],
  ["layout.navigation.maximumHeight", "length", "layout-navigation-maximum-height"],
  ["layout.navigation.inlineGapFixed", "length", "layout-navigation-inline-gap-fixed"],
  [
    "layout.navigation.inlineGapProportional",
    "length",
    "layout-navigation-inline-gap-proportional",
  ],
  ["layout.navigation.sectionGap", "length", "layout-navigation-section-gap"],
  ["layout.navigation.linkGap", "length", "layout-navigation-link-gap"],
  ["layout.navigation.titleMaxWidth", "length", "layout-navigation-title-max-width"],
  ["layout.navigation.titleHideThreshold", "length"],
  ["layout.navigation.themeToggleSize", "length", "layout-navigation-theme-toggle-size"],
  ["layout.navigation.themeIconSize", "length", "layout-navigation-theme-icon-size"],

  ["layout.bookRegion.minimumHeight", "length", "layout-book-region-minimum-height"],
  ["layout.bookRegion.inlineGapFixed", "length", "layout-book-region-inline-gap-fixed"],
  [
    "layout.bookRegion.inlineGapProportional",
    "length",
    "layout-book-region-inline-gap-proportional",
  ],
  ["layout.bookRegion.blockGapFixed", "length", "layout-book-region-block-gap-fixed"],
  [
    "layout.bookRegion.blockGapProportional",
    "length",
    "layout-book-region-block-gap-proportional",
  ],

  ["layout.book.aspectRatio", "ratio", "layout-book-aspect-ratio"],
  ["layout.book.referenceMinimumWidth", "length", "layout-book-reference-minimum-width"],
  ["layout.book.referenceMinimumHeight", "length", "layout-book-reference-minimum-height"],
  ["layout.book.perspective", "length", "layout-book-perspective"],
  ["layout.book.rotateX", "angle", "layout-book-rotate-x"],
  ["layout.book.shadowOffsetY", "length", "layout-book-shadow-offset-y"],
  ["layout.book.shadowBlur", "length", "layout-book-shadow-blur"],
  ["layout.book.coverInsetTop", "length", "layout-book-cover-inset-top"],
  ["layout.book.coverInsetInline", "length", "layout-book-cover-inset-inline"],
  ["layout.book.coverInsetBottom", "length", "layout-book-cover-inset-bottom"],
  ["layout.book.coverRadius", "length", "layout-book-cover-radius"],
  ["layout.book.bindingWidth", "length", "layout-book-binding-width"],
  ["layout.book.edgeWidth", "length", "layout-book-edge-width"],
  ["layout.book.gutterWidth", "length", "layout-book-gutter-width"],

  ...["lifePage", "technicalPage"].flatMap((page) => {
    const cssPage = page === "lifePage" ? "life-page" : "technical-page";
    return [
      [`layout.${page}.paddingTop`, "length", `layout-${cssPage}-padding-top`],
      [`layout.${page}.paddingInline`, "length", `layout-${cssPage}-padding-inline`],
      [`layout.${page}.paddingBottom`, "length", `layout-${cssPage}-padding-bottom`],
      [`layout.${page}.partMarginTop`, "length", `layout-${cssPage}-part-margin-top`],
      [
        `layout.${page}.partMarginBottom`,
        "length",
        `layout-${cssPage}-part-margin-bottom`,
      ],
      [`layout.${page}.partPaddingTop`, "length", `layout-${cssPage}-part-padding-top`],
      [`layout.${page}.catalogGap`, "length", `layout-${cssPage}-catalog-gap`],
      [
        `layout.${page}.catalogColumnGap`,
        "length",
        `layout-${cssPage}-catalog-column-gap`,
      ],
      [`layout.${page}.archiveBottom`, "length", `layout-${cssPage}-archive-bottom`],
      [`layout.${page}.folioBottom`, "length", `layout-${cssPage}-folio-bottom`],
    ];
  }),

  ["layout.footer.minimumHeight", "length", "layout-footer-minimum-height"],
  ["layout.footer.fluidHeight", "length", "layout-footer-fluid-height"],
  ["layout.footer.maximumHeight", "length", "layout-footer-maximum-height"],
  ["layout.footer.inlineGapFixed", "length", "layout-footer-inline-gap-fixed"],
  [
    "layout.footer.inlineGapProportional",
    "length",
    "layout-footer-inline-gap-proportional",
  ],
  ["layout.footer.paddingTop", "length", "layout-footer-padding-top"],
  ["layout.footer.paddingBottom", "length", "layout-footer-padding-bottom"],
  [
    "layout.footer.englishTranslationGap",
    "length",
    "layout-footer-english-translation-gap",
  ],
  ["layout.footer.translationMetaGap", "length", "layout-footer-translation-meta-gap"],
  ["layout.footer.authorCopyrightGap", "length", "layout-footer-author-copyright-gap"],

  ...["life", "technical"].flatMap((catalog) => [
    [`catalogs.${catalog}.wideMaximumEntries`, "positiveInteger"],
    [`catalogs.${catalog}.narrowMaximumEntries`, "positiveInteger"],
    [`catalogs.${catalog}.narrowBookWidth`, "length"],
    [`catalogs.${catalog}.extremeBookWidth`, "length"],
    [`catalogs.${catalog}.titleMaximumLines`, "positiveInteger"],
    [`catalogs.${catalog}.wideDateFormat`, "dateFormat"],
    [`catalogs.${catalog}.compactDateFormat`, "dateFormat"],
    [`catalogs.${catalog}.narrowRowGap`, "length", `catalog-${catalog}-narrow-row-gap`],
  ]),

  ["materials.paperColor", "color", "material-paper-color"],
  ["materials.coverColor", "color", "material-cover-color"],
  ["materials.bindingColor", "color", "material-binding-color"],
  ["materials.pageEdgeColor", "color", "material-page-edge-color"],
  ["materials.gutterColor", "color", "material-gutter-color"],
  ["materials.pageTextColor", "color", "material-page-text-color"],
  ["materials.pageMutedColor", "color", "material-page-muted-color"],
  ["materials.pageAccentColor", "color", "material-page-accent-color"],
  ["materials.bookShadowColor", "color", "material-book-shadow-color"],
  ["materials.paperTextureOpacity", "opacity", "material-paper-texture-opacity"],
];

const textStyleFields = textStyleDescriptors.flatMap(([path, cssName]) => {
  const basePath = `textStyles.${path}`;
  return [
    [`${basePath}.fontFamily`, "font", `text-${cssName}-font-family`],
    [`${basePath}.minimumSize`, "length", `text-${cssName}-minimum-size`],
    [`${basePath}.fluidSize`, "length", `text-${cssName}-fluid-size`],
    [`${basePath}.maximumSize`, "length", `text-${cssName}-maximum-size`],
    [`${basePath}.lightColor`, "color", `text-${cssName}-light-color`],
    [`${basePath}.darkColor`, "color", `text-${cssName}-dark-color`],
  ];
});

const fields = [...baseFields, ...textStyleFields];

function readPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function fail(path, message) {
  throw new Error(`homepage config: ${path} ${message}`);
}

function validateField(path, type, value) {
  if (value === undefined || value === null) {
    fail(path, "is required");
  }

  if (type === "text" && (typeof value !== "string" || !value.trim())) {
    fail(path, "must be a non-empty string");
  }

  if (
    type === "length" &&
    (typeof value !== "string" || !CSS_LENGTH_PATTERN.test(value))
  ) {
    fail(path, `must be a CSS length, received ${JSON.stringify(value)}`);
  }

  if (
    type === "angle" &&
    (typeof value !== "string" || !CSS_ANGLE_PATTERN.test(value))
  ) {
    fail(path, `must be a CSS angle, received ${JSON.stringify(value)}`);
  }

  if (
    type === "ratio" &&
    (typeof value !== "string" || !CSS_RATIO_PATTERN.test(value))
  ) {
    fail(path, `must be a CSS aspect ratio, received ${JSON.stringify(value)}`);
  }

  if (
    type === "color" &&
    (typeof value !== "string" || !CSS_COLOR_PATTERN.test(value))
  ) {
    fail(path, `must be a CSS color, received ${JSON.stringify(value)}`);
  }

  if (
    type === "opacity" &&
    (typeof value !== "number" || value < 0 || value > 1)
  ) {
    fail(path, "must be between 0 and 1");
  }

  if (type === "font" && !Object.hasOwn(FONT_FAMILIES, value)) {
    fail(path, "must be one of serif, sans, monospace");
  }

  if (type === "positiveInteger" && (!Number.isInteger(value) || value < 1)) {
    fail(path, "must be a positive integer");
  }

  if (
    type === "dateFormat" &&
    (typeof value !== "string" || !DATE_FORMAT_PATTERN.test(value))
  ) {
    fail(path, "must contain only YYYY, MM, DD and separators");
  }
}

function parseAspectRatio(value) {
  const match = CSS_RATIO_PATTERN.exec(value);
  if (!match) return null;

  const width = Number(match.groups.width);
  const height = Number(match.groups.height);
  if (width <= 0 || height <= 0) return null;

  return width / height;
}

export function validateHomepageConfig(config) {
  for (const [path, type] of fields) {
    validateField(path, type, readPath(config, path));
  }

  if (!parseAspectRatio(config.layout.book.aspectRatio)) {
    fail("layout.book.aspectRatio", "must contain positive values");
  }

  for (const catalog of ["life", "technical"]) {
    if (
      config.catalogs[catalog].narrowMaximumEntries >
      config.catalogs[catalog].wideMaximumEntries
    ) {
      fail(
        `catalogs.${catalog}.narrowMaximumEntries`,
        "must not exceed wideMaximumEntries",
      );
    }
  }

  return config;
}

export function buildHomepageCssVariables(config) {
  validateHomepageConfig(config);

  const variables = fields
    .filter(([, , cssName]) => cssName)
    .map(([path, type, cssName]) => {
      const value = readPath(config, path);
      const cssValue = type === "font" ? FONT_FAMILIES[value] : value;
      return `--home-${cssName}:${cssValue}`;
    });

  variables.push(
    `--home-layout-book-aspect-ratio-number:${parseAspectRatio(
      config.layout.book.aspectRatio,
    )}`,
  );

  for (const catalog of ["life", "technical"]) {
    variables.push(
      `--home-catalog-${catalog}-title-maximum-lines:${config.catalogs[catalog].titleMaximumLines}`,
    );
  }

  return variables.join(";");
}

function buildCatalogResponsiveStyles(section, catalog) {
  return `
@container home-book (max-width: ${catalog.narrowBookWidth}) {
  [data-section="${section}"] .catalog-entry--narrow-hidden {
    display: none;
  }

  [data-section="${section}"] .catalog-entry a {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "title title"
      ". date";
    row-gap: var(--home-catalog-${section}-narrow-row-gap);
  }

  [data-section="${section}"] .catalog-entry__title {
    grid-area: title;
  }

  [data-section="${section}"] .catalog-entry__leader {
    display: none;
  }

  [data-section="${section}"] .catalog-entry__date--desktop {
    display: inline;
    grid-area: date;
  }

  [data-section="${section}"] .catalog-entry__date--compact {
    display: none;
  }
}

@container home-book (max-width: ${catalog.extremeBookWidth}) {
  [data-section="${section}"] .catalog-entry__date--desktop {
    display: none;
  }

  [data-section="${section}"] .catalog-entry__date--compact {
    display: inline;
    grid-area: date;
  }
}
`;
}

export function buildHomepageResponsiveStyles(config) {
  validateHomepageConfig(config);

  return `
@container home-navigation (max-width: ${config.layout.navigation.titleHideThreshold}) {
  .home-navigation__title {
    display: none;
  }

  .home-navigation__inner {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
${buildCatalogResponsiveStyles("life", config.catalogs.life)}
${buildCatalogResponsiveStyles("technical", config.catalogs.technical)}
`.trim();
}
