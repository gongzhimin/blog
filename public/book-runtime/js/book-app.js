/**
 * book-app.js — runtime bootstrap.
 *
 * Reads the server-injected #book-data config, prepares pagination, and
 * delegates Turn.js details to BookTurnAdapter.
 */
(function () {
  var _bookData = document.getElementById('book-data');
  var BOOK_CONFIG = JSON.parse(_bookData.dataset.config);
  var ARTICLES = BOOK_CONFIG.articles || [];
  var TOC_HTML = BOOK_CONFIG.toc || '';
  var CONTENT_PAGE = BOOK_CONFIG.book.contentPage;
  var PAGINATION_CONFIG = BOOK_CONFIG.runtime && BOOK_CONFIG.runtime.pagination;
  var MOBILE_PAGINATION = BOOK_CONFIG.runtime && BOOK_CONFIG.runtime.mobilePagination;
  var MOBILE_BREAKPOINT = 800;

  // Detect mobile via physical screen width because the desktop viewport meta
  // locks to 1050px until mobile mode is selected.
  var physicalScreenWidth = window.screen && window.screen.width;
  var isMobile = (window.matchMedia && window.matchMedia('(max-width: 800px)').matches)
              || (physicalScreenWidth && physicalScreenWidth < MOBILE_BREAKPOINT);
  if (isMobile) {
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.content = 'width=device-width, initial-scale=1';
  }

  var TOTAL_PAGES = BOOK_CONFIG.book.turn.totalPages;
  var BACK_PAGE = BOOK_CONFIG.book.turn.backPage || TOTAL_PAGES - 1;
  var START_PAGE = BOOK_CONFIG.book.turn.startPage;
  var TURN_OPTIONS = BOOK_CONFIG.book.turn;

  function getPaginationConfig() {
    return (isMobile && MOBILE_PAGINATION) ? MOBILE_PAGINATION : PAGINATION_CONFIG;
  }

  function configurePagination() {
    var pagination = getPaginationConfig();
    if (pagination && PAGINATOR.configure) {
      PAGINATOR.configure(pagination);
    }
  }

  function runPagination() {
    if (_paginated) return;

    try {
      configurePagination();
      var result = paginateAll(ARTICLES, TOC_HTML);
      TOTAL_PAGES = result.totalPages;
      BACK_PAGE = result.backPage;
      START_PAGE = 5;
    } catch(e) {
      console.error('paginateAll failed:', e);
      _pageCache[5] = TOC_HTML + '<span class="page-number">I</span>';
    }
  }

  function loadApp() {
    runPagination();

    var adapter = BookTurnAdapter.create({
      bookSelector: '.sj-book',
      zoomSelector: '#book-zoom',
      sliderSelector: '#slider',
      canvasSelector: '#canvas',
      contentPage: CONTENT_PAGE,
      totalPages: TOTAL_PAGES,
      backPage: BACK_PAGE,
      startPage: START_PAGE,
      turnOptions: TURN_OPTIONS,
      isMobile: isMobile,
      ensurePaginated: runPagination,
      getPageContent: function(page) {
        return _pageCache[page];
      }
    });

    if (!adapter.mount()) {
      setTimeout(loadApp, 10);
    }
  }

  yepnope({
    test: Modernizr.csstransforms,
    yep: ['/vendor/turnjs/turn.min.js'],
    nope: ['/vendor/turnjs/turn.min.js'],
    complete: loadApp
  });
})();
