export type BookEntry = {
  id: string;
  collection: string;
  title: string;
  date: Date;
  body: string;
  bodyType: 'markdown' | 'html';
  metadata: Record<string, unknown>;
};

export type BookDocument = {
  id: string;
  title: string;
  tocTitle: string;
  description?: string;
  metadata?: Record<string, unknown>;
  entries: BookEntry[];
};

export type JsonBookEntryInput = {
  id?: string;
  title: string;
  date?: string;
  body?: string;
  bodyType?: string;
  metadata?: Record<string, unknown>;
};

export type JsonBookInput = {
  id: string;
  title: string;
  description?: string;
  tocTitle?: string;
  entries?: JsonBookEntryInput[];
  metadata?: Record<string, unknown>;
};

export type BookConfig = Record<string, unknown> & {
  book: {
    turn: {
      startPage: number;
      totalPages: number;
      [key: string]: unknown;
    };
    pagination?: Record<string, any>;
    [key: string]: unknown;
  };
  [key: string]: any;
};

export type RuntimeArticle = {
  title: string;
  dateStr: string;
  bodyHTML: string;
  key: string;
  source: { id: string; collection: string };
};

export type BookRuntime = {
  document: BookDocument;
  articles: RuntimeArticle[];
  toc: string;
  config: BookConfig;
};

export type ThemeSources = {
  fontsCSS: string;
  bookContentCSS: string;
  codeHighlightCSS: string;
  bookTocCSS: string;
  katexCSS: string;
  surfaceCSS?: string;
};

export type BookTheme = {
  id: 'classic-paper' | 'plain-manuscript';
  name: string;
  runtime: { id: string; name: string };
  styles: {
    fontsCSS: string;
    bookContentCSS: string;
    codeHighlightCSS: string;
    bookTocCSS: string;
    visualCSS: string;
  };
  measurement: { articleCSS: string; tocCSS: string };
};
