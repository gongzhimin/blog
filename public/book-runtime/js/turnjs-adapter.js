/**
 * turnjs-adapter.js — isolates Turn.js and jQuery UI wiring from book-app.
 */
(function () {
  function createTurnJsAdapter(options) {
    var bookSelector = options.bookSelector || '.sj-book';
    var zoomSelector = options.zoomSelector || '#book-zoom';
    var sliderSelector = options.sliderSelector || '#slider';
    var canvasSelector = options.canvasSelector || '#canvas';
    var contentPage = options.contentPage;
    var totalPages = options.totalPages;
    var backPage = options.backPage || totalPages - 1;
    var startPage = options.startPage;
    var turnOptions = options.turnOptions || {};
    var isMobile = !!options.isMobile;
    var ensurePaginated = options.ensurePaginated || function () {};
    var getPageContent = options.getPageContent || function () { return ''; };

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
        $('.sj-book .p' + backPage + ' .depth').css({ width: depthWidth, right: 20 - depthWidth });
      else
        $('.sj-book .p' + backPage + ' .depth').css({ width: 0 });
    }

    function addPage(page, book) {
      if (!book.turn('hasPage', page)) {
        ensurePaginated();
        var content = getPageContent(page) ||
          ('<div class="book-content"><p>&nbsp;</p></div><span class="page-number">' + page + '</span>');
        var element = $('<div />', {
          'class': 'own-size p' + page,
          css: { width: contentPage.width, height: contentPage.height }
        }).html(content);
        book.turn('addPage', element, page);
      }
    }

    function numberOfViews(book) {
      return isMobile ? book.turn('pages') : Math.ceil(book.turn('pages') / 2);
    }

    function getViewNumber(book, page) {
      return isMobile ? (page || book.turn('page')) : parseInt((page || book.turn('page')) / 2 + 1, 10);
    }

    function clampPageTarget(book, page) {
      return Math.min(book.turn('pages'), Math.max(1, page));
    }

    function isChrome() {
      return navigator.userAgent.indexOf('Chrome') != -1;
    }

    function moveBar(yes) {
      if (Modernizr && Modernizr.csstransforms) {
        $('#slider .ui-slider-handle').css({ zIndex: yes ? -1 : 10000 });
      }
    }

    function mountMousewheel() {
      $(zoomSelector).mousewheel(function(event, delta, deltaX, deltaY) {
        var data = $(this).data(), step = 30, flipbook = $(bookSelector),
          actualPos = $(sliderSelector).slider('value') * step;
        if (typeof(data.scrollX) == 'undefined') { data.scrollX = actualPos; data.scrollPage = flipbook.turn('page'); }
        data.scrollX = Math.min($(sliderSelector).slider('option', 'max') * step, Math.max(0, data.scrollX + deltaX));
        var actualView = Math.round(data.scrollX / step),
          page = isMobile ? clampPageTarget(flipbook, actualView) : clampPageTarget(flipbook, actualView * 2 - 2);
        if ($.inArray(data.scrollPage, flipbook.turn('view', page)) == -1) { data.scrollPage = page; flipbook.turn('page', page); }
        if (data.scrollTimer) clearInterval(data.scrollTimer);
        data.scrollTimer = setTimeout(function() { data.scrollX = undefined; data.scrollPage = undefined; data.scrollTimer = undefined; }, 1000);
      });
    }

    function mountSlider() {
      $(sliderSelector).slider({
        min: 1, max: 100,
        start: function() { moveBar(false); },
        stop: function() {
          var book = $(bookSelector);
          var target = isMobile ? clampPageTarget(book, $(this).slider('value')) : clampPageTarget(book, $(this).slider('value') * 2 - 2);
          book.turn('page', target);
        }
      });
    }

    function mountHash() {
      Hash.on('^page\/([0-9]*)$', {
        yep: function(path, parts) {
          var page = parts[1];
          if (page !== undefined) { if ($(bookSelector).turn('is')) $(bookSelector).turn('page', page); }
        },
        nop: function() { if ($(bookSelector).turn('is')) $(bookSelector).turn('page', startPage); }
      });
    }

    function mountKeyboard() {
      $(document).keydown(function(e) {
        var previous = 37, next = 39;
        switch (e.keyCode) {
          case previous: $(bookSelector).turn('previous'); break;
          case next: $(bookSelector).turn('next'); break;
        }
      });
    }

    function mountTurn() {
      var flipbook = $(bookSelector);
      flipbook.turn({
        display: isMobile ? 'single' : 'double',
        elevation: turnOptions.elevation,
        acceleration: !isChrome(),
        autoCenter: true,
        gradients: true,
        duration: turnOptions.duration,
        pages: totalPages,
        page: startPage,
        when: {
          turning: function(e, page) {
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
            if (page < book.turn('pages')) $('.sj-book .p' + backPage).addClass('fixed'); else $('.sj-book .p' + backPage).removeClass('fixed');
            Hash.go('page/' + page).update();
          },
          turned: function(e, page) {
            var book = $(this);
            if (page == 2 || page == 3) { book.turn('peel', 'br'); }
            updateDepth(book);
            $(sliderSelector).slider('value', getViewNumber(book, page));
            book.turn('center');
          },
          start: function() { moveBar(true); },
          end: function() {
            var book = $(this);
            updateDepth(book);
            setTimeout(function() { $(sliderSelector).slider('value', getViewNumber(book)); }, 1);
            moveBar(false);
          },
          missing: function(e, pages) {
            for (var i = 0; i < pages.length; i++) { addPage(pages[i], $(this)); }
          }
        }
      });

      if (totalPages !== turnOptions.totalPages) {
        try { flipbook.turn('pages', totalPages); } catch(e) {}
      }

      $(sliderSelector).slider('option', 'max', numberOfViews(flipbook));
      Hash.check().update();
      flipbook.addClass('animated');
      $(canvasSelector).css({ visibility: 'visible' });
    }

    function mount() {
      var flipbook = $(bookSelector);
      if (flipbook.width() == 0 || flipbook.height() == 0) {
        return false;
      }

      mountMousewheel();
      mountSlider();
      mountHash();
      mountKeyboard();
      mountTurn();
      return true;
    }

    return {
      mount: mount,
      clampPageTarget: clampPageTarget
    };
  }

  window.BookTurnAdapter = {
    create: createTurnJsAdapter
  };
})();
