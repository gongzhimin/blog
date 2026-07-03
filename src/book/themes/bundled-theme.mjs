import classicFontsCSS from './classic-paper/fonts.css?raw';
import classicContentCSS from './classic-paper/content.css?raw';
import classicCodeHighlightCSS from './classic-paper/code-highlight.css?raw';
import classicTocCSS from './classic-paper/toc.css?raw';
import manuscriptFontsCSS from './plain-manuscript/fonts.css?raw';
import manuscriptContentCSS from './plain-manuscript/content.css?raw';
import manuscriptCodeHighlightCSS from './plain-manuscript/code-highlight.css?raw';
import manuscriptSurfaceCSS from './plain-manuscript/surface.css?raw';
import manuscriptTocCSS from './plain-manuscript/toc.css?raw';
import { createClassicPaperTheme } from './classic-paper/theme.mjs';
import { createPlainManuscriptTheme } from './plain-manuscript/theme.mjs';

const BUNDLED_THEME_FACTORIES = {
  'classic-paper': (sharedSources) =>
    createClassicPaperTheme({
      fontsCSS: classicFontsCSS,
      bookContentCSS: classicContentCSS,
      codeHighlightCSS: classicCodeHighlightCSS,
      bookTocCSS: classicTocCSS,
      ...sharedSources,
    }),
  'plain-manuscript': (sharedSources) =>
    createPlainManuscriptTheme({
      fontsCSS: manuscriptFontsCSS,
      bookContentCSS: manuscriptContentCSS,
      codeHighlightCSS: manuscriptCodeHighlightCSS,
      bookTocCSS: manuscriptTocCSS,
      surfaceCSS: manuscriptSurfaceCSS,
      ...sharedSources,
    }),
};

export function loadBundledBookTheme(themeId = 'classic-paper', sharedSources = {}) {
  const id = themeId || 'classic-paper';
  const factory = BUNDLED_THEME_FACTORIES[id];
  if (!factory) {
    throw new Error(`Unknown book theme: ${id}`);
  }
  return factory(sharedSources);
}
