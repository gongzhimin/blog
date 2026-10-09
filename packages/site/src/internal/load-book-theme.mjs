import { createBookTheme } from '@myblog/book-build';
import katexCSS from 'katex/dist/katex.min.css?raw';
import classicFontsCSS from '../styles/book-themes/classic-paper/fonts.css?raw';
import classicSpecialCSS from './presentation/special-pages/classic-paper.css?raw';
import manuscriptSpecialCSS from './presentation/special-pages/plain-manuscript.css?raw';
import classicContentCSS from '../styles/book-themes/classic-paper/content.css?raw';
import classicHighlightCSS from '../styles/book-themes/classic-paper/code-highlight.css?raw';
import classicTocCSS from '../styles/book-themes/classic-paper/toc.css?raw';
import manuscriptFontsCSS from '../styles/book-themes/plain-manuscript/fonts.css?raw';
import manuscriptContentCSS from '../styles/book-themes/plain-manuscript/content.css?raw';
import manuscriptHighlightCSS from '../styles/book-themes/plain-manuscript/code-highlight.css?raw';
import manuscriptTocCSS from '../styles/book-themes/plain-manuscript/toc.css?raw';
import manuscriptSurfaceCSS from '../styles/book-themes/plain-manuscript/surface.css?raw';

const THEME_SOURCES = {
  'classic-paper': {
    fontsCSS: classicFontsCSS,
    bookContentCSS: classicContentCSS,
    codeHighlightCSS: classicHighlightCSS,
    bookTocCSS: classicTocCSS,
  },
  'plain-manuscript': {
    fontsCSS: manuscriptFontsCSS,
    bookContentCSS: manuscriptContentCSS,
    codeHighlightCSS: manuscriptHighlightCSS,
    bookTocCSS: manuscriptTocCSS,
    surfaceCSS: manuscriptSurfaceCSS,
  },
};

export function loadSiteBookTheme(themeId) {
  const id = themeId || 'classic-paper';
  const theme = createBookTheme(id, {
    ...THEME_SOURCES[id],
    katexCSS,
  });
  theme.styles.visualCSS +=
    id === 'classic-paper' ? classicSpecialCSS : manuscriptSpecialCSS;
  return theme;
}
