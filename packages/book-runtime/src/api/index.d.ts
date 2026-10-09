export type PaginationConfig = {
  articleWidth: number;
  articleHeight: number;
  tocWidth: number;
  tocHeight: number;
  articleCSS?: string | null;
  tocCSS?: string | null;
};
export type BookRuntimePayload = {
  articles: Array<{
    key: string;
    title: string;
    dateStr: string;
    bodyHTML: string;
  }>;
  toc?: string;
  specialPages?: Record<
    | 'frontCover'
    | 'frontInside'
    | 'titlePage'
    | 'imprintPage'
    | 'backInside'
    | 'backCover',
    { html: string }
  >;
  runtime: {
    pagination: PaginationConfig;
    mobilePagination?: PaginationConfig | null;
  };
  book?: { mobileBreakpoint?: number; coverSprite?: Record<string, unknown> };
  source?: { tocTitle?: string; documentTitle?: string };
  footer?: { content?: { author?: string } };
};
export type BookPagination = {
  totalPages: number;
  backPage: number;
  articleStart: number;
  bodyStart: number;
  pages: Array<{ physicalPage: number; html: string }>;
  articleToPage: Record<string, number>;
  pageToArticle: Record<number, string>;
};
export type PaginationResult =
  | { ok: true; value: BookPagination }
  | {
      ok: false;
      diagnostics: Array<{
        code: 'BOOK_RUNTIME_PAGINATION_FAILED' | 'BOOK_RUNTIME_DUPLICATE_KEY';
        phase: 'paginate';
        message: string;
      }>;
    };
/** Browser only. Requires window and document.body before importing the package. */
export function paginateBook(payload: BookRuntimePayload): PaginationResult;
