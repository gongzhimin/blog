import { createClassicPaperTheme } from "./classic-paper/theme.mjs";
import { createPlainManuscriptTheme } from "./plain-manuscript/theme.mjs";

const THEME_FACTORIES = {
  "classic-paper": createClassicPaperTheme,
  "plain-manuscript": createPlainManuscriptTheme,
};

export function listBookThemeIds() {
  return Object.keys(THEME_FACTORIES);
}

export function loadBookTheme(themeId = "classic-paper", cssSources) {
  const id = themeId || "classic-paper";
  const factory = THEME_FACTORIES[id];
  if (!factory) {
    throw new Error(`Unknown book theme: ${id}`);
  }
  return factory(cssSources);
}
