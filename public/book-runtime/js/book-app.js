/**
 * book-app.js — runtime bootstrap.
 *
 * Reads the server-injected #book-data config, prepares pagination, and
 * delegates Turn.js details to BookRuntime.TurnAdapter.
 */
(function () {
  var _bookData = document.getElementById('book-data');
  var BOOK_CONFIG = JSON.parse(_bookData.dataset.config);
  var ARTICLES = BOOK_CONFIG.articles || [];
  var TOC_HTML = BOOK_CONFIG.toc || '';
  var CONTENT_PAGE = BOOK_CONFIG.book.contentPage;
  var MOBILE_CONTENT_PAGE = BOOK_CONFIG.book.mobileContentPage || CONTENT_PAGE;
  var PAGINATION_CONFIG = BOOK_CONFIG.runtime && BOOK_CONFIG.runtime.pagination;
  var MOBILE_PAGINATION = BOOK_CONFIG.runtime && BOOK_CONFIG.runtime.mobilePagination;
  var MOBILE_BREAKPOINT = BOOK_CONFIG.book.mobileBreakpoint || 800;
  var pageCache = window.BookRuntime.Orchestrator.createPageCache({
    coverSprite: BOOK_CONFIG.book.coverSprite,
    tocTitle: BOOK_CONFIG.source && BOOK_CONFIG.source.tocTitle || '目录'
  });

  // Detect mobile via actual window width, bypassing the viewport meta lock.
  var isMobile = sessionStorage.getItem('book-mobile') === '1'
              || (window.outerWidth || window.innerWidth) < MOBILE_BREAKPOINT;
  if (isMobile) {
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.content = 'width=device-width, initial-scale=1';
    sessionStorage.removeItem('book-mobile');
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
    if (pagination && window.BookRuntime.Paginator.configure) {
      if (typeof MEASURE_CSS !== 'undefined') {
        pagination.articleCSS = MEASURE_CSS.article;
        pagination.tocCSS = MEASURE_CSS.toc;
      }
      window.BookRuntime.Paginator.configure(pagination);
    }
  }

  function runPagination() {
    if (pageCache.isPaginated()) return;

    try {
      configurePagination();
      var result = pageCache.paginateAll(ARTICLES, TOC_HTML);
      TOTAL_PAGES = result.totalPages;
      BACK_PAGE = result.backPage;
      START_PAGE = 5;
    } catch(e) {
      console.error('paginateAll failed:', e);
      pageCache.reset();
      pageCache.setPageContent(5, TOC_HTML + '<span class="page-number">I</span>');
    }
  }

  function detectMobile() {
    // Check actual browser window width, not viewport (which is locked to 1050)
    var winW = window.outerWidth || window.innerWidth;
    return winW < MOBILE_BREAKPOINT;
  }

  function createAdapter() {
    return window.BookRuntime.TurnAdapter.create({
      bookSelector: '.sj-book',
      zoomSelector: '#book-zoom',
      sliderSelector: '#slider',
      canvasSelector: '#canvas',
      contentPage: isMobile ? MOBILE_CONTENT_PAGE : CONTENT_PAGE,
      totalPages: TOTAL_PAGES,
      backPage: BACK_PAGE,
      startPage: START_PAGE,
      turnOptions: TURN_OPTIONS,
      paperTexture: BOOK_CONFIG.book.paperTexture,
      isMobile: isMobile,
      ensurePaginated: runPagination,
      getPageContent: function(page) {
        return pageCache.getPageContent(page);
      }
    });
  }

  function loadApp() {
    runPagination();
    var adapter = createAdapter();
    if (!adapter.mount()) {
      setTimeout(loadApp, 10);
    }
  }

  // Resize listener — reload page when crossing the mobile breakpoint.
  // A full reload is the most reliable way to switch between single/double
  // page mode, since Turn.js does not cleanly rebuild after destroy().
  var resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      var nowMobile = detectMobile();
      if (isMobile !== nowMobile) {
        if (nowMobile) sessionStorage.setItem('book-mobile', '1');
        else sessionStorage.removeItem('book-mobile');
        window.location.reload();
      }
    }, 500);
  });

  yepnope({
    test: Modernizr.csstransforms,
    yep: ['/vendor/turnjs/turn.min.js'],
    nope: ['/vendor/turnjs/turn.min.js'],
    complete: loadApp
  });
})();
