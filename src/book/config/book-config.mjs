const REQUIRED_PATHS = [
  "theme.id",
  "nav.brand.text",
  "nav.links.items",
  "book.canvasWidth",
  "book.width",
  "book.height",
  "book.mobileBreakpoint",
  "book.mobileCanvas.width",
  "book.mobileCanvas.paddingY",
  "book.contentPage.width",
  "book.contentPage.height",
  "book.mobileContentPage.width",
  "book.mobileContentPage.height",
  "book.turn.elevation",
  "book.turn.duration",
  "book.turn.totalPages",
  "book.turn.startPage",
  "book.coverSprite.image",
  "book.coverSprite.backgroundSize",
  "book.coverSprite.positions.front",
  "book.coverSprite.positions.frontInside",
  "book.coverSprite.positions.backInside",
  "book.coverSprite.positions.back",
  "book.coverSprite.positions.backOuter",
  "book.pagination.contentWidth",
  "book.pagination.contentHeight",
  "book.pagination.tocWidth",
  "book.pagination.tocHeight",
  "footer.content.copyright",
  "backgrounds.light.fabric",
];

const POSITIVE_NUMBER_PATHS = [
  "nav.height",
  "book.canvasWidth",
  "book.width",
  "book.height",
  "book.mobileBreakpoint",
  "book.mobileCanvas.width",
  "book.mobileCanvas.paddingY",
  "book.contentPage.width",
  "book.contentPage.height",
  "book.mobileContentPage.width",
  "book.mobileContentPage.height",
  "book.turn.elevation",
  "book.turn.duration",
  "book.turn.totalPages",
  "book.turn.startPage",
  "book.pagination.contentWidth",
  "book.pagination.contentHeight",
  "book.pagination.tocWidth",
  "book.pagination.tocHeight",
];

function valueAt(object, path) {
  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    return current[key];
  }, object);
}

export function validateBookConfig(config) {
  for (const path of REQUIRED_PATHS) {
    if (valueAt(config, path) === undefined) {
      throw new Error(`${path} is required`);
    }
  }

  for (const path of POSITIVE_NUMBER_PATHS) {
    const value = valueAt(config, path);
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new Error(`${path} must be a positive number`);
    }
  }

  if (!Array.isArray(config.nav.links.items) || config.nav.links.items.length === 0) {
    throw new Error("nav.links.items must be a non-empty array");
  }

  if (typeof config.book.coverSprite.image !== "string" || !config.book.coverSprite.image) {
    throw new Error("book.coverSprite.image must be a non-empty string");
  }

  return config;
}
