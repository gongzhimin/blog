import type { BookConfig, BookDocument, BookRuntime } from './types.js';

export type {
  BookConfig,
  BookDocument,
  BookEntry,
  BookRuntime,
  BookRuntimeConfig,
  RuntimePagination,
  JsonBookEntryInput,
  JsonBookInput,
  RuntimeArticle,
} from './types.js';

export { renderArticle } from './content.js';
export { createBookTheme } from './book-theme.js';

export type Diagnostic = {
  code: 'BOOK_CONFIG_INVALID' | 'BOOK_BUILD_FAILED';
  phase: 'validate' | 'build';
  message: string;
};

export type Result<T> =
  { ok: true; value: T } | { ok: false; diagnostics: Diagnostic[] };

export type BuildBookInput = {
  document: BookDocument;
  config: BookConfig;
};

/** Validates configuration and builds the complete browser payload. */
export function buildBook(input: BuildBookInput): Result<BookRuntime>;
