/**
 * book-app.js — Turn.js bootstrap glue.
 *
 * Reads the server‑injected #book-data config, delegates pagination to
 * the orchestrator, and wires up Turn.js with hash routing and slider.
 */
(function () {
  var _bookData = document.getElementById('book-data');
  var BOOK_CONFIG = JSON.parse(_bookData.dataset.config);
  var ARTICLES = BOOK_CONFIG.articles || [];
  var TOC_HTML = BOOK_CONFIG.toc || '';
  var CONTENT_PAGE = BOOK_CONFIG.book.contentPage;
  var PAGINATION_CONFIG = BOOK_CONFIG.runtime && BOOK_CONFIG.runtime.pagination;

  var TOTAL_PAGES = BOOK_CONFIG.book.turn.totalPages;
  var BACK_PAGE = BOOK_CONFIG.book.turn.backPage || TOTAL_PAGES - 1;
  var START_PAGE = BOOK_CONFIG.book.turn.startPage;
  var TURN_OPTIONS = BOOK_CONFIG.book.turn;

  // ── Turn.js helpers ───────────────────────────────────────────────

  function updateDepth(book, newPage) {
    var page = book.turn('page'),
      pages = book.turn('pages'),
      maxDepth = 16 * Math.min(1, pages / 112),
      depthWidth = maxDepth * Math.min(1, page * 2 / pages);
    newPage = newPage || page;
    if (newPage > 3)
      $('.sj-book .p2 .depth').css({ width: depthWidth, left: 20 - depthWidth });
    else
      $('.sj-book .p2 .depth').css({ width: 0 });
    depthWidth = maxDepth * Math.min(1, (pages - page) * 2 / pages);
    if (newPage < pages - 3)
      $('.sj-book .p' + BACK_PAGE + ' .depth').css({ width: depthWidth, right: 20 - depthWidth });
    else
      $('.sj-book .p' + BACK_PAGE + ' .depth').css({ width: 0 });
  }

  function addPage(page, book) {
    if (!book.turn('hasPage', page)) {
      if (!_paginated) paginateAll(ARTICLES, TOC_HTML);

      var content = _pageCache[page] ||
        ('<div class="book-content"><p>&nbsp;</p></div><span class="page-number">' + page + '</span>');
      var element = $('<div />', {
        'class': 'own-size p' + page,
        css: { width: CONTENT_PAGE.width, height: CONTENT_PAGE.height }
      }).html(content);
      book.turn('addPage', element, page);
    }
  }

  function numberOfViews(book) { return Math.ceil(book.turn('pages') / 2); }
  function getViewNumber(book, page) { return parseInt((page || book.turn('page')) / 2 + 1, 10); }
  function isChrome() { return navigator.userAgent.indexOf('Chrome') != -1; }
  function moveBar(yes) {
    if (Modernizr && Modernizr.csstransforms) {
      $('#slider .ui-slider-handle').css({ zIndex: yes ? -1 : 10000 });
    }
  }

  // ── bootstrap ─────────────────────────────────────────────────────

  function loadApp() {
    try {
      if (PAGINATION_CONFIG && PAGINATOR.configure) {
        PAGINATOR.configure(PAGINATION_CONFIG);
      }
      var result = paginateAll(ARTICLES, TOC_HTML);
      TOTAL_PAGES = result.totalPages;
      BACK_PAGE = result.backPage;
      START_PAGE = 5;
    } catch(e) {
      console.error('paginateAll failed:', e);
      _pageCache[5] = TOC_HTML + '<span class="page-number">I</span>';
    }

    var flipbook = $('.sj-book');
    if (flipbook.width() == 0 || flipbook.height() == 0) { setTimeout(loadApp, 10); return; }

    $('#book-zoom').mousewheel(function(event, delta, deltaX, deltaY) {
      var data = $(this).data(), step = 30, flipbook = $('.sj-book'),
        actualPos = $('#slider').slider('value') * step;
      if (typeof(data.scrollX) == 'undefined') { data.scrollX = actualPos; data.scrollPage = flipbook.turn('page'); }
      data.scrollX = Math.min($('#slider').slider('option', 'max') * step, Math.max(0, data.scrollX + deltaX));
      var actualView = Math.round(data.scrollX / step),
        page = Math.min(flipbook.turn('pages'), Math.max(1, actualView * 2 - 2));
      if ($.inArray(data.scrollPage, flipbook.turn('view', page)) == -1) { data.scrollPage = page; flipbook.turn('page', page); }
      if (data.scrollTimer) clearInterval(data.scrollTimer);
      data.scrollTimer = setTimeout(function() { data.scrollX = undefined; data.scrollPage = undefined; data.scrollTimer = undefined; }, 1000);
    });

    $('#slider').slider({
      min: 1, max: 100,
      start: function(event, ui) { moveBar(false); },
      stop: function() { $('.sj-book').turn('page', Math.max(1, $(this).slider('value') * 2 - 2)); }
    });

    Hash.on('^page\/([0-9]*)$', {
      yep: function(path, parts) {
        var page = parts[1];
        if (page !== undefined) { if ($('.sj-book').turn('is')) $('.sj-book').turn('page', page); }
      },
      nop: function(path) { if ($('.sj-book').turn('is')) $('.sj-book').turn('page', START_PAGE); }
    });

    $(document).keydown(function(e) {
      var previous = 37, next = 39;
      switch (e.keyCode) {
        case previous: $('.sj-book').turn('previous'); break;
        case next: $('.sj-book').turn('next'); break;
      }
    });

    flipbook.turn({
      elevation: TURN_OPTIONS.elevation,
      acceleration: !isChrome(),
      autoCenter: true,
      gradients: true,
      duration: TURN_OPTIONS.duration,
      pages: TOTAL_PAGES,
      page: START_PAGE,
      when: {
        turning: function(e, page, view) {
          var book = $(this), currentPage = book.turn('page'), pages = book.turn('pages');
          if (currentPage > 3 && currentPage < pages - 3) {
            if (page == 1) { book.turn('page', 2).turn('stop').turn('page', page); e.preventDefault(); return; }
            else if (page == pages) { book.turn('page', pages - 1).turn('stop').turn('page', page); e.preventDefault(); return; }
          } else if (page > 3 && page < pages - 3) {
            if (currentPage == 1) { book.turn('page', 2).turn('stop').turn('page', page); e.preventDefault(); return; }
            else if (currentPage == pages) { book.turn('page', pages - 1).turn('stop').turn('page', page); e.preventDefault(); return; }
          }
          updateDepth(book, page);
          if (page >= 2) $('.sj-book .p2').addClass('fixed'); else $('.sj-book .p2').removeClass('fixed');
          if (page < book.turn('pages')) $('.sj-book .p' + BACK_PAGE).addClass('fixed'); else $('.sj-book .p' + BACK_PAGE).removeClass('fixed');
          Hash.go('page/' + page).update();
        },
        turned: function(e, page, view) {
          var book = $(this);
          if (page == 2 || page == 3) { book.turn('peel', 'br'); }
          updateDepth(book);
          $('#slider').slider('value', getViewNumber(book, page));
          book.turn('center');
        },
        start: function(e, pageObj) { moveBar(true); },
        end: function(e, pageObj) {
          var book = $(this);
          updateDepth(book);
          setTimeout(function() { $('#slider').slider('value', getViewNumber(book)); }, 1);
          moveBar(false);
        },
        missing: function(e, pages) {
          for (var i = 0; i < pages.length; i++) { addPage(pages[i], $(this)); }
        }
      }
    });

    // Update Turn.js total pages post-init if needed
    if (TOTAL_PAGES !== TURN_OPTIONS.totalPages) {
      try { flipbook.turn('pages', TOTAL_PAGES); } catch(e) {}
    }

    $('#slider').slider('option', 'max', numberOfViews(flipbook));
    Hash.check().update();
    flipbook.addClass('animated');
    $('#canvas').css({ visibility: 'visible' });
  }

  // ── start ─────────────────────────────────────────────────────────

  yepnope({
    test: Modernizr.csstransforms,
    yep: ['/vendor/turnjs/turn.min.js'],
    nope: ['/vendor/turnjs/turn.min.js'],
    complete: loadApp
  });
})();
