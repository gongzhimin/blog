const CSS_LENGTH_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:rem|px|%|svh|vw|em)$/;
const CSS_ANGLE_PATTERN =
  /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:deg|rad|turn)$/;
const CSS_RATIO_PATTERN =
  /^(?:\d+(?:\.\d+)?|\.\d+)\s*\/\s*(?:\d+(?:\.\d+)?|\.\d+)$/;
const CSS_COLOR_PATTERN =
  /^(?:#[\da-f]{3,8}|rgba?\(\s*[\d.%\s,/-]+\))$/i;

const FONT_FAMILIES = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  monospace: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
};

export const HOMEPAGE_TEXT_STYLE_ROLES = [
  "navigationBrand",
  "navigationTitle",
  "navigationLinks",
  "runningOuter",
  "runningInner",
  "partLink",
  "catalogTitle",
  "catalogDate",
  "archiveLink",
  "folio",
  "quoteEnglish",
  "quoteTranslation",
  "quoteAuthor",
  "copyright",
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

  ["desktop.regions.navigationHeight", "length", "desktop-navigation-height"],
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
  ["desktop.book.folioBottom", "length", "desktop-folio-bottom"],

  ["mobile.layout.navigationHeight", "length", "mobile-navigation-height"],
  ["mobile.layout.siteInlinePadding", "length", "mobile-site-inline-padding"],
  ["mobile.layout.bookGap", "length", "mobile-book-gap"],
  ["mobile.layout.pageMinHeight", "length", "mobile-page-min-height"],
  ["mobile.layout.pagePaddingTop", "length", "mobile-page-padding-top"],
  ["mobile.layout.pagePaddingInline", "length", "mobile-page-padding-inline"],
  ["mobile.layout.pagePaddingBottom", "length", "mobile-page-padding-bottom"],
  ["mobile.layout.partMarginTop", "length", "mobile-part-margin-top"],
  ["mobile.layout.partMarginBottom", "length", "mobile-part-margin-bottom"],
  ["mobile.layout.partPaddingTop", "length", "mobile-part-padding-top"],
  ["mobile.layout.catalogGap", "length", "mobile-catalog-gap"],

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

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

const textStyleFields = HOMEPAGE_TEXT_STYLE_ROLES.flatMap((role) => {
  const cssRole = toKebabCase(role);
  const path = `textStyles.${role}`;

  return [
    [`${path}.fontFamily`, "font", `text-${cssRole}-font-family`],
    [`${path}.desktopSize`, "length", `text-${cssRole}-desktop-size`],
    [`${path}.mobileSize`, "length", `text-${cssRole}-mobile-size`],
    [`${path}.lightColor`, "color", `text-${cssRole}-light-color`],
    [`${path}.darkColor`, "color", `text-${cssRole}-dark-color`],
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
}

export function validateHomepageConfig(config) {
  for (const [path, type] of fields) {
    validateField(path, type, readPath(config, path));
  }

  return config;
}

export function buildHomepageCssVariables(config) {
  validateHomepageConfig(config);

  return fields
    .filter(([, , cssName]) => cssName)
    .map(([path, type, cssName]) => {
      const value = readPath(config, path);
      const cssValue = type === "font" ? FONT_FAMILIES[value] : value;
      return `--home-${cssName}:${cssValue}`;
    })
    .join(";");
}
