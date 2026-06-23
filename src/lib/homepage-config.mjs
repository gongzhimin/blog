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

function clampedTextFields(path, cssName) {
  return [
    [`${path}.fontFamily`, "font", `${cssName}-font-family`],
    [`${path}.minimumSize`, "length", `${cssName}-minimum-size`],
    [`${path}.fluidSize`, "length", `${cssName}-fluid-size`],
    [`${path}.maximumSize`, "length", `${cssName}-maximum-size`],
    [`${path}.lightColor`, "color", `${cssName}-light-color`],
    [`${path}.darkColor`, "color", `${cssName}-dark-color`],
  ];
}

function bookTextFields(path, cssName) {
  return [
    [`${path}.fontFamily`, "font", `${cssName}-font-family`],
    [`${path}.fontSize`, "bookFontSize", `${cssName}-font-size`],
    [`${path}.lightColor`, "color", `${cssName}-light-color`],
    [`${path}.darkColor`, "color", `${cssName}-dark-color`],
  ];
}

const fields = [
  ["navigation.content.siteName", "text"],
  ["navigation.content.title", "text"],
  ["navigation.size.minimumHeight", "length", "navigation-size-minimum-height"],
  ["navigation.size.fluidHeight", "length", "navigation-size-fluid-height"],
  ["navigation.size.maximumHeight", "length", "navigation-size-maximum-height"],
  [
    "navigation.spacing.inlineGapFixed",
    "length",
    "navigation-spacing-inline-gap-fixed",
  ],
  [
    "navigation.spacing.inlineGapProportional",
    "length",
    "navigation-spacing-inline-gap-proportional",
  ],
  ["navigation.spacing.sectionGap", "length", "navigation-spacing-section-gap"],
  ["navigation.spacing.linkGap", "length", "navigation-spacing-link-gap"],
  ...clampedTextFields("navigation.brand", "navigation-brand"),
  ["navigation.title.maximumWidth", "length", "navigation-title-maximum-width"],
  ["navigation.title.hideThreshold", "length"],
  ...clampedTextFields("navigation.title", "navigation-title"),
  ...["life", "technical", "about", "rss"].flatMap((link) => [
    [`navigation.links.${link}.label`, "text"],
    [`navigation.links.${link}.href`, "text"],
    ...clampedTextFields(
      `navigation.links.${link}`,
      `navigation-links-${link}`,
    ),
  ]),
  ["navigation.themeToggle.size", "length", "navigation-theme-toggle-size"],
  [
    "navigation.themeToggle.iconSize",
    "length",
    "navigation-theme-toggle-icon-size",
  ],

  ["book.size.viewportWidth", "length", "book-size-viewport-width"],
  ["book.size.minimumWidth", "length", "book-size-minimum-width"],
  ["book.size.aspectRatio", "ratio", "book-size-aspect-ratio"],
  ["book.stage.inlineGapFixed", "length", "book-stage-inline-gap-fixed"],
  [
    "book.stage.inlineGapProportional",
    "length",
    "book-stage-inline-gap-proportional",
  ],
  ["book.stage.paddingTop", "length", "book-stage-padding-top"],
  ["book.stage.paddingBottom", "length", "book-stage-padding-bottom"],
  ["book.perspective.distance", "length", "book-perspective-distance"],
  ["book.perspective.rotateX", "angle", "book-perspective-rotate-x"],
  ["book.shadow.offsetY", "length", "book-shadow-offset-y"],
  ["book.shadow.blur", "length", "book-shadow-blur"],
  ["book.shadow.color", "color", "book-shadow-color"],
  ["book.cover.insetTop", "length", "book-cover-inset-top"],
  ["book.cover.insetInline", "length", "book-cover-inset-inline"],
  ["book.cover.insetBottom", "length", "book-cover-inset-bottom"],
  ["book.cover.radius", "length", "book-cover-radius"],
  ["book.cover.color", "color", "book-cover-color"],
  ["book.pageEdges.width", "length", "book-page-edges-width"],
  ["book.pageEdges.color", "color", "book-page-edges-color"],
  ["book.innerSpine.width", "length", "book-inner-spine-width"],
  ["book.innerSpine.color", "color", "book-inner-spine-color"],
  [
    "book.innerSpine.centerColor",
    "color",
    "book-inner-spine-center-color",
  ],
  ["book.innerSpine.seamWidth", "length", "book-inner-spine-seam-width"],
  ["book.innerSpine.seamColor", "color", "book-inner-spine-seam-color"],
  [
    "book.innerSpine.seamShadowBlur",
    "length",
    "book-inner-spine-seam-shadow-blur",
  ],
  [
    "book.innerSpine.seamShadowColor",
    "color",
    "book-inner-spine-seam-shadow-color",
  ],
  ["book.innerSpine.capWidth", "length", "book-inner-spine-cap-width"],
  ["book.innerSpine.capHeight", "length", "book-inner-spine-cap-height"],
  ["book.innerSpine.capRadius", "length", "book-inner-spine-cap-radius"],
  ["book.paper.color", "color", "book-paper-color"],
  ["book.paper.textColor", "color", "book-paper-text-color"],
  ["book.paper.mutedColor", "color", "book-paper-muted-color"],
  ["book.paper.accentColor", "color", "book-paper-accent-color"],
  ["book.paper.textureOpacity", "opacity", "book-paper-texture-opacity"],
  ["book.pages.shared.rotationY", "angle", "book-pages-shared-rotation-y"],
  [
    "book.pages.shared.innerShadowWidth",
    "length",
    "book-pages-shared-inner-shadow-width",
  ],
  [
    "book.pages.shared.innerShadowColor",
    "color",
    "book-pages-shared-inner-shadow-color",
  ],

  ...["life", "technical"].flatMap((page) => {
    const root = `book.pages.${page}`;
    const cssRoot = `book-pages-${page}`;
    return [
      [`${root}.content.outerRunningLabel`, "text"],
      [`${root}.content.innerRunningLabel`, "text"],
      [`${root}.content.partLabel`, "text"],
      [`${root}.content.partHref`, "text"],
      [`${root}.content.archiveLabel`, "text"],
      [`${root}.content.archiveHref`, "text"],
      [`${root}.content.homepageFolio`, "text"],
      [`${root}.layout.paddingTop`, "length", `${cssRoot}-layout-padding-top`],
      [
        `${root}.layout.paddingInline`,
        "length",
        `${cssRoot}-layout-padding-inline`,
      ],
      [
        `${root}.layout.paddingBottom`,
        "length",
        `${cssRoot}-layout-padding-bottom`,
      ],
      [
        `${root}.layout.partMarginTop`,
        "length",
        `${cssRoot}-layout-part-margin-top`,
      ],
      [
        `${root}.layout.partMarginBottom`,
        "length",
        `${cssRoot}-layout-part-margin-bottom`,
      ],
      [
        `${root}.layout.partPaddingTop`,
        "length",
        `${cssRoot}-layout-part-padding-top`,
      ],
      [`${root}.layout.catalogGap`, "length", `${cssRoot}-layout-catalog-gap`],
      [
        `${root}.layout.catalogColumnGap`,
        "length",
        `${cssRoot}-layout-catalog-column-gap`,
      ],
      [
        `${root}.layout.archiveBottom`,
        "length",
        `${cssRoot}-layout-archive-bottom`,
      ],
      [
        `${root}.layout.folioBottom`,
        "length",
        `${cssRoot}-layout-folio-bottom`,
      ],
      [`${root}.catalog.wideMaximumEntries`, "positiveInteger"],
      [`${root}.catalog.narrowMaximumEntries`, "positiveInteger"],
      [`${root}.catalog.narrowBookWidth`, "length"],
      [`${root}.catalog.extremeBookWidth`, "length"],
      [
        `${root}.catalog.titleMaximumLines`,
        "positiveInteger",
        `${cssRoot}-catalog-title-maximum-lines`,
      ],
      [`${root}.catalog.wideDateFormat`, "dateFormat"],
      [`${root}.catalog.compactDateFormat`, "dateFormat"],
      [
        `${root}.catalog.narrowRowGap`,
        "length",
        `${cssRoot}-catalog-narrow-row-gap`,
      ],
      ...bookTextFields(`${root}.runningOuter`, `${cssRoot}-running-outer`),
      ...bookTextFields(`${root}.runningInner`, `${cssRoot}-running-inner`),
      ...bookTextFields(`${root}.partLink`, `${cssRoot}-part-link`),
      ...bookTextFields(`${root}.catalogTitle`, `${cssRoot}-catalog-title`),
      ...bookTextFields(`${root}.catalogDate`, `${cssRoot}-catalog-date`),
      ...bookTextFields(`${root}.archiveLink`, `${cssRoot}-archive-link`),
      ...bookTextFields(`${root}.folio`, `${cssRoot}-folio`),
    ];
  }),

  ["footer.content.copyrightLabel", "text"],
  ["footer.size.minimumHeight", "length", "footer-size-minimum-height"],
  [
    "footer.spacing.inlineGapFixed",
    "length",
    "footer-spacing-inline-gap-fixed",
  ],
  [
    "footer.spacing.inlineGapProportional",
    "length",
    "footer-spacing-inline-gap-proportional",
  ],
  ["footer.spacing.paddingTop", "length", "footer-spacing-padding-top"],
  ["footer.spacing.paddingBottom", "length", "footer-spacing-padding-bottom"],
  [
    "footer.spacing.englishTranslationGap",
    "length",
    "footer-spacing-english-translation-gap",
  ],
  [
    "footer.spacing.translationMetaGap",
    "length",
    "footer-spacing-translation-meta-gap",
  ],
  [
    "footer.spacing.authorCopyrightGap",
    "length",
    "footer-spacing-author-copyright-gap",
  ],
  ...clampedTextFields("footer.quoteEnglish", "footer-quote-english"),
  ...clampedTextFields("footer.quoteTranslation", "footer-quote-translation"),
  ...clampedTextFields("footer.quoteAuthor", "footer-quote-author"),
  ...clampedTextFields("footer.copyright", "footer-copyright"),

  ...["life", "technical"].flatMap((directory) => [
    [`directories.${directory}.folio.content`, "text"],
    [
      `directories.${directory}.folio.fontFamily`,
      "font",
      `directories-${directory}-folio-font-family`,
    ],
    [
      `directories.${directory}.folio.fontSize`,
      "length",
      `directories-${directory}-folio-font-size`,
    ],
    [
      `directories.${directory}.folio.lightColor`,
      "color",
      `directories-${directory}-folio-light-color`,
    ],
    [
      `directories.${directory}.folio.darkColor`,
      "color",
      `directories-${directory}-folio-dark-color`,
    ],
  ]),
];

export const FIELDS = fields;

function readPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function fail(path, message) {
  throw new Error(`homepage config: ${path} ${message}`);
}

function validateField(path, type, value) {
  if (value === undefined || value === null) fail(path, "is required");

  if (type === "text" && (typeof value !== "string" || !value.trim())) {
    fail(path, "must be a non-empty string");
  }
  if (
    (type === "length" || type === "bookFontSize") &&
    (typeof value !== "string" || !CSS_LENGTH_PATTERN.test(value))
  ) {
    fail(path, `must be a CSS length, received ${JSON.stringify(value)}`);
  }
  if (type === "bookFontSize" && !value.endsWith("cqw")) {
    fail(path, "must use cqw");
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
    fail(path, "must be a CSS color");
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

  if (!parseAspectRatio(config.book.size.aspectRatio)) {
    fail("book.size.aspectRatio", "must contain positive values");
  }

  for (const page of ["life", "technical"]) {
    const catalog = config.book.pages[page].catalog;
    if (catalog.narrowMaximumEntries > catalog.wideMaximumEntries) {
      fail(
        `book.pages.${page}.catalog.narrowMaximumEntries`,
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
      return `--home-${cssName}:${
        type === "font" ? FONT_FAMILIES[value] : value
      }`;
    });

  variables.push(
    `--home-book-size-aspect-ratio-number:${parseAspectRatio(
      config.book.size.aspectRatio,
    )}`,
  );
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
    row-gap: var(--home-book-pages-${section}-catalog-narrow-row-gap);
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
@container home-navigation (max-width: ${config.navigation.title.hideThreshold}) {
  .home-navigation__title {
    display: none;
  }

  .home-navigation__inner {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
${buildCatalogResponsiveStyles("life", config.book.pages.life.catalog)}
${buildCatalogResponsiveStyles(
  "technical",
  config.book.pages.technical.catalog,
)}
`.trim();
}
