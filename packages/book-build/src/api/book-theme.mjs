import { createClassicPaperTheme } from '../internal/themes/classic-paper/theme.mjs';
import { createPlainManuscriptTheme } from '../internal/themes/plain-manuscript/theme.mjs';

const BUNDLED_THEME_FACTORIES = {
  'classic-paper': createClassicPaperTheme,
  'plain-manuscript': createPlainManuscriptTheme,
};

export function createBookTheme(themeId = 'classic-paper', sources = {}) {
  const id = themeId || 'classic-paper';
  if (!Object.hasOwn(BUNDLED_THEME_FACTORIES, id)) {
    throw new Error(`Unknown book theme: ${id}`);
  }
  const factory = BUNDLED_THEME_FACTORIES[id];
  if (!sources || typeof sources !== 'object' || Array.isArray(sources))
    throw new TypeError('theme sources must be an object');
  for (const name of [
    'fontsCSS',
    'bookContentCSS',
    'codeHighlightCSS',
    'bookTocCSS',
  ]) {
    if (typeof sources[name] !== 'string') {
      throw new TypeError(`Missing theme CSS source: ${name}`);
    }
  }
  if (id === 'plain-manuscript' && typeof sources.surfaceCSS !== 'string') {
    throw new TypeError('Missing theme CSS source: surfaceCSS');
  }
  if (sources.katexCSS !== undefined && typeof sources.katexCSS !== 'string')
    throw new TypeError('theme CSS source katexCSS must be a string');
  return factory({ ...sources, katexCSS: sources.katexCSS ?? '' });
}
