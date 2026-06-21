const CSS_LENGTH_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:rem|px|%|svh|vw|em)$/;
const CSS_ANGLE_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|rad|turn)$/;
const CSS_RATIO_PATTERN =
  /^(?:\d+(?:\.\d+)?|\.\d+)\s*\/\s*(?:\d+(?:\.\d+)?|\.\d+)$/;
const CSS_COLOR_PATTERN =
  /^(?:#[\da-f]{3,8}|rgba?\(\s*[\d.%\s,/-]+\))$/i;

const fields = [
  ["content.siteName", "text"],
  ["content.heroTitle", "text"],
  ["content.life.runningLabel", "text"],
  ["content.life.partLabel", "text"],
  ["content.life.archiveLabel", "text"],
  ["content.technical.runningLabel", "text"],
  ["content.technical.partLabel", "text"],
  ["content.technical.archiveLabel", "text"],

  ["desktop.regions.navigationHeight", "length", "desktop-navigation-height"],
  ["desktop.regions.heroHeight", "length", "desktop-hero-height"],
  ["desktop.regions.bookRegionHeight", "length", "desktop-book-region-height"],
  ["desktop.regions.footerHeight", "length", "desktop-footer-height"],
  ["desktop.regions.siteWidth", "length", "desktop-site-width"],

  ["desktop.book.width", "length", "desktop-book-width"],
  ["desktop.book.aspectRatio", "ratio", "desktop-book-ratio"],
  ["desktop.book.perspective", "length", "desktop-book-perspective"],
  ["desktop.book.rotateX", "angle", "desktop-book-rotate-x"],
  ["desktop.book.shadowOffsetY", "length", "desktop-book-shadow-y"],
  ["desktop.book.shadowBlur", "length", "desktop-book-shadow-blur"],
  ["desktop.book.coverInsetTop", "length", "desktop-cover-inset-top"],
  ["desktop.book.coverInsetInline", "length", "desktop-cover-inset-inline"],
  ["desktop.book.coverInsetBottom", "length", "desktop-cover-inset-bottom"],
  ["desktop.book.coverRadius", "length", "desktop-cover-radius"],
  ["desktop.book.bindingWidth", "length", "desktop-binding-width"],
  ["desktop.book.edgeWidth", "length", "desktop-edge-width"],
  ["desktop.book.gutterWidth", "length", "desktop-gutter-width"],
  ["desktop.book.pagePaddingTop", "length", "desktop-page-padding-top"],
  ["desktop.book.pagePaddingInline", "length", "desktop-page-padding-inline"],
  ["desktop.book.pagePaddingBottom", "length", "desktop-page-padding-bottom"],
  ["desktop.book.partMarginTop", "length", "desktop-part-margin-top"],
  ["desktop.book.partMarginBottom", "length", "desktop-part-margin-bottom"],
  ["desktop.book.partPaddingTop", "length", "desktop-part-padding-top"],
  ["desktop.book.catalogGap", "length", "desktop-catalog-gap"],
  ["desktop.book.catalogColumnGap", "length", "desktop-catalog-column-gap"],
  ["desktop.book.archiveBottom", "length", "desktop-archive-bottom"],

  [
    "desktop.typography.navigationFontSize",
    "length",
    "desktop-navigation-font-size",
  ],
  [
    "desktop.typography.heroTitleFontSize",
    "length",
    "desktop-hero-title-font-size",
  ],
  [
    "desktop.typography.runningHeadFontSize",
    "length",
    "desktop-running-head-font-size",
  ],
  [
    "desktop.typography.partLabelFontSize",
    "length",
    "desktop-part-label-font-size",
  ],
  ["desktop.typography.catalogFontSize", "length", "desktop-catalog-font-size"],
  ["desktop.typography.dateFontSize", "length", "desktop-date-font-size"],
  ["desktop.typography.archiveFontSize", "length", "desktop-archive-font-size"],
  ["desktop.typography.quoteFontSize", "length", "desktop-quote-font-size"],
  ["desktop.typography.footerFontSize", "length", "desktop-footer-font-size"],

  ["mobile.layout.navigationHeight", "length", "mobile-navigation-height"],
  ["mobile.layout.siteInlinePadding", "length", "mobile-site-inline-padding"],
  ["mobile.layout.heroMinHeight", "length", "mobile-hero-min-height"],
  ["mobile.layout.bookGap", "length", "mobile-book-gap"],
  ["mobile.layout.pageMinHeight", "length", "mobile-page-min-height"],
  ["mobile.layout.pagePaddingTop", "length", "mobile-page-padding-top"],
  ["mobile.layout.pagePaddingInline", "length", "mobile-page-padding-inline"],
  ["mobile.layout.pagePaddingBottom", "length", "mobile-page-padding-bottom"],
  ["mobile.layout.partMarginTop", "length", "mobile-part-margin-top"],
  ["mobile.layout.partMarginBottom", "length", "mobile-part-margin-bottom"],
  ["mobile.layout.partPaddingTop", "length", "mobile-part-padding-top"],
  ["mobile.layout.catalogGap", "length", "mobile-catalog-gap"],

  ["mobile.typography.brandFontSize", "length", "mobile-brand-font-size"],
  [
    "mobile.typography.navigationFontSize",
    "length",
    "mobile-navigation-font-size",
  ],
  [
    "mobile.typography.heroTitleFontSize",
    "length",
    "mobile-hero-title-font-size",
  ],
  [
    "mobile.typography.runningHeadFontSize",
    "length",
    "mobile-running-head-font-size",
  ],
  [
    "mobile.typography.partLabelFontSize",
    "length",
    "mobile-part-label-font-size",
  ],
  ["mobile.typography.catalogFontSize", "length", "mobile-catalog-font-size"],
  ["mobile.typography.dateFontSize", "length", "mobile-date-font-size"],
  ["mobile.typography.archiveFontSize", "length", "mobile-archive-font-size"],
  ["mobile.typography.quoteFontSize", "length", "mobile-quote-font-size"],
  [
    "mobile.typography.translationFontSize",
    "length",
    "mobile-translation-font-size",
  ],
  ["mobile.typography.footerFontSize", "length", "mobile-footer-font-size"],

  ["materials.paperColor", "color", "material-paper-color"],
  ["materials.coverColor", "color", "material-cover-color"],
  ["materials.bindingColor", "color", "material-binding-color"],
  ["materials.pageEdgeColor", "color", "material-page-edge-color"],
  ["materials.gutterColor", "color", "material-gutter-color"],
  ["materials.pageTextColor", "color", "material-page-text-color"],
  ["materials.pageMutedColor", "color", "material-page-muted-color"],
  ["materials.pageAccentColor", "color", "material-page-accent-color"],
  ["materials.bookShadowColor", "color", "material-book-shadow-color"],
  [
    "materials.paperTextureOpacity",
    "opacity",
    "material-paper-texture-opacity",
  ],
];

function readPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function fail(path, message) {
  throw new Error(`homepage config: ${path} ${message}`);
}

export function validateHomepageConfig(config) {
  for (const [path, type] of fields) {
    const value = readPath(config, path);

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
  }

  return config;
}

export function buildHomepageCssVariables(config) {
  validateHomepageConfig(config);

  return fields
    .filter(([, , cssName]) => cssName)
    .map(([path, , cssName]) => `--home-${cssName}:${readPath(config, path)}`)
    .join(";");
}
