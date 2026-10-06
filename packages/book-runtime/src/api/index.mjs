import '../internal/paginator-core.js';
import '../internal/paginator-splitters.js';
import '../internal/paginator.js';
import '../internal/orchestrator.js';

/**
 * Paginate one Book Build payload using the browser's measured layout.
 * Turn.js mounting remains the responsibility of Site.
 *
 * @param {object} payload Book Build runtime payload, including articles, toc,
 * runtime.pagination, book, and source.
 * @returns {{ok:true,value:object}|{ok:false,diagnostics:Array<{code:string,phase:string,message:string}>}}
 */
export function paginateBook(payload) {
  try {
    if (!payload || !Array.isArray(payload.articles))
      throw new TypeError('payload.articles must be an array');

    const runtimeConfig = payload.runtime;
    const mobile =
      (window.outerWidth || window.innerWidth) <
      (payload.book?.mobileBreakpoint || 800);
    const pagination =
      (mobile && runtimeConfig?.mobilePagination) || runtimeConfig?.pagination;
    if (!pagination)
      throw new TypeError('payload.runtime.pagination is required');

    const measureCss = window.MEASURE_CSS || {};
    window.BookRuntime.Paginator.configure({
      ...pagination,
      articleCSS: pagination.articleCSS ?? measureCss.article ?? '',
      tocCSS: pagination.tocCSS ?? measureCss.toc ?? '',
    });

    const cache = window.BookRuntime.Orchestrator.createPageCache({
      coverSprite: payload.book?.coverSprite,
      tocTitle: payload.source?.tocTitle || '目录',
      documentTitle: payload.source?.documentTitle || '',
      author: payload.footer?.content?.author || '志民',
    });
    const layout = cache.paginateAll(payload.articles, payload.toc || '');
    const pages = Object.keys(layout.pageCache)
      .map(Number)
      .sort((a, b) => a - b)
      .map((physicalPage) => ({
        physicalPage,
        html: layout.pageCache[physicalPage],
      }));

    return {
      ok: true,
      value: {
        totalPages: layout.totalPages,
        backPage: layout.backPage,
        articleStart: layout.articleStart,
        bodyStart: layout.bodyStart,
        pages,
        articleToPage: { ...layout.articleToPage },
        pageToArticle: { ...layout.pageToArticle },
      },
    };
  } catch (error) {
    return {
      ok: false,
      diagnostics: [
        {
          code: 'BOOK_RUNTIME_PAGINATION_FAILED',
          phase: 'paginate',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

window.BookRuntime = window.BookRuntime || {};
window.BookRuntime.API = { paginateBook };
