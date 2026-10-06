/**
 * Site's reader bootstrap. Pagination and page-cache mechanics stay in Runtime.
 *
 * Reads the server-injected #book-data config, prepares pagination, and
 * delegates Turn.js details to BookRuntime.TurnAdapter.
 */
(function () {
  var _bookData = document.getElementById('book-data');
  var BOOK_CONFIG = JSON.parse(_bookData.dataset.config);
  var TOC_HTML = BOOK_CONFIG.toc || '';
  var CONTENT_PAGE = BOOK_CONFIG.book.contentPage;
  var MOBILE_CONTENT_PAGE = BOOK_CONFIG.book.mobileContentPage || CONTENT_PAGE;
  var MOBILE_BREAKPOINT = BOOK_CONFIG.book.mobileBreakpoint || 800;
  var paginationResult = null;
  var pageContent = {};

  function getPageContent(page) {
    return pageContent[page];
  }

  function getArticleToPage() {
    return (paginationResult && paginationResult.articleToPage) || {};
  }

  function getPageToArticle() {
    return (paginationResult && paginationResult.pageToArticle) || {};
  }

  // Detect mobile via actual window width, bypassing the viewport meta lock.
  var isMobile =
    sessionStorage.getItem('book-mobile') === '1' ||
    (window.outerWidth || window.innerWidth) < MOBILE_BREAKPOINT;
  if (isMobile) {
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.content = 'width=device-width, initial-scale=1';
    sessionStorage.removeItem('book-mobile');
  }

  var TOTAL_PAGES = BOOK_CONFIG.book.turn.totalPages;
  var BACK_PAGE = BOOK_CONFIG.book.turn.backPage || TOTAL_PAGES - 1;
  var START_PAGE = BOOK_CONFIG.book.turn.startPage;
  var TURN_OPTIONS = BOOK_CONFIG.book.turn;

  function runPagination() {
    if (paginationResult) return;

    try {
      var result = window.BookRuntime.API.paginateBook(BOOK_CONFIG);
      if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
      paginationResult = result.value;
      pageContent = {};
      paginationResult.pages.forEach(function (page) {
        pageContent[page.physicalPage] = page.html;
      });
      TOTAL_PAGES = paginationResult.totalPages;
      BACK_PAGE = paginationResult.backPage;
      START_PAGE = 5;
    } catch (e) {
      console.error('paginateAll failed:', e);
      paginationResult = { articleToPage: {}, pageToArticle: {} };
      pageContent = {
        5: TOC_HTML + '<span class="page-number">I</span>',
      };
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
      getPageContent: function (page) {
        return getPageContent(page);
      },
      pageToArticle: getPageToArticle(),
    });
  }

  function navigateToArticle() {
    var params = new URLSearchParams(window.location.search);
    var postKey = params.get('post');
    if (!postKey) return;
    var articleToPage = getArticleToPage();
    var targetPage = articleToPage[postKey];
    if (!targetPage) return;

    var attempts = 0;
    function tryNavigate() {
      var book = $('.sj-book');
      if (book.turn('is')) {
        book.turn('page', targetPage);
      } else if (attempts++ < 30) {
        setTimeout(tryNavigate, 100);
      }
    }
    tryNavigate();
  }

  function loadApp() {
    runPagination();
    var adapter = createAdapter();
    if (!adapter.mount()) {
      setTimeout(loadApp, 10);
      return;
    }
    navigateToArticle();
  }

  // Resize listener — reload page when crossing the mobile breakpoint.
  // A full reload is the most reliable way to switch between single/double
  // page mode, since Turn.js does not cleanly rebuild after destroy().
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var nowMobile = detectMobile();
      if (isMobile !== nowMobile) {
        if (nowMobile) sessionStorage.setItem('book-mobile', '1');
        else sessionStorage.removeItem('book-mobile');
        window.location.reload();
      }
    }, 500);
  });

  function onReady() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(loadApp);
    } else {
      loadApp();
    }
  }

  yepnope({
    test: Modernizr.csstransforms,
    yep: ['/vendor/turnjs/turn.min.js'],
    nope: ['/vendor/turnjs/turn.min.js'],
    complete: onReady,
  });
})();
