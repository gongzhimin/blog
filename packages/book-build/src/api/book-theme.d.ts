export type BundledThemeAssets = {
  id: 'classic-paper' | 'plain-manuscript';
  name: string;
  runtime: { id: BundledThemeAssets['id']; name: string };
  styles: {
    fontsCSS: string;
    bookContentCSS: string;
    codeHighlightCSS: string;
    bookTocCSS: string;
    visualCSS: string;
  };
  measurement: { articleCSS: string; tocCSS: string };
};

export type BookThemeSources = {
  fontsCSS: string;
  bookContentCSS: string;
  codeHighlightCSS: string;
  bookTocCSS: string;
  surfaceCSS?: string;
  katexCSS?: string;
};

export function createBookTheme(
  themeId: string | undefined,
  sources: BookThemeSources,
): BundledThemeAssets;
