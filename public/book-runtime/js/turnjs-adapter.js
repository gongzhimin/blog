/**
 * turnjs-adapter.js — isolates Turn.js and jQuery UI wiring from book-app.
 */
(function () {
  function paperHash(page, salt) {
    var value = Math.sin(page * (12.9898 + salt) + salt * 78.233) * 43758.5453123;
    return value - Math.floor(value);
  }

  function paperCropForPage(page) {
    var safePage = Math.max(1, parseInt(page, 10) || 1);
    return {
      x: Math.round((5 + paperHash(safePage, 1) * 90) * 100) / 100,
      y: Math.round((5 + paperHash(safePage, 2) * 90) * 100) / 100
    };
  }

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
    var paperTexture = options.paperTexture || {};
    var pageToArticle = options.pageToArticle || {};
    var isMobile = !!options.isMobile;
    var ensurePaginated = options.ensurePaginated || function () {};
    var getPageContent = options.getPageContent || function () { return ''; };
    var isTurning = false;

    function applyPaperCrop(element, page) {
      if (!paperTexture.enabled || !element || !element.length) return;

      var crop = paperCropForPage(page);
      var node = element[0];
      if (!node || !node.style) return;

      node.style.setProperty('--paper-x', crop.x + '%');
      node.style.setProperty('--paper-y', crop.y + '%');
    }

    function pageNumberFromClass(element) {
      var classes = (element.attr('class') || '').split(/\s+/);
      for (var i = 0; i < classes.length; i++) {
        if (/^p[0-9]+$/.test(classes[i])) {
          return parseInt(classes[i].slice(1), 10);
        }
      }
      return null;
    }

    function applyInitialPaperCrops(book) {
      if (!paperTexture.enabled) return;

      book.find('.own-size').each(function(index) {
        var element = $(this);
        var page = pageNumberFromClass(element) || index + 3;
        applyPaperCrop(element, page);
      });
    }

    function updateDepth(book, newPage) {
      var page = book.turn('page'),
        pages = book.turn('pages'),
        maxDepth = 16,
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

    function initDepthScale(totalPages) {
      var scale = totalPages / 110;
      if (scale < 0.5) scale = 0.5;
      else if (scale > 1.5) scale = 1.5;
      $('.sj-book .depth').css('background-size',
        Math.round(scale * 100) + '% 100%');
    }

    function addPage(page, book) {
      if (!book.turn('hasPage', page)) {
        ensurePaginated();
        var content = getPageContent(page) ||
          ('<div class="book-content"><p>&nbsp;</p></div><span class="page-number">' + page + '</span>');
        var pageCss = { width: contentPage.width, height: contentPage.height };
        var element = $('<div />', {
          'class': 'own-size p' + page,
          css: pageCss
        }).html(content);
        applyPaperCrop(element, page);
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

    function mountTapToTurn() {
      if (!isMobile) return;

      var bookEl = document.querySelector(bookSelector);
      if (!bookEl) return;

      var startX = 0, startY = 0, startTime = 0;
      var TAP_MAX_MOVE = 10;
      var TAP_MAX_TIME = 300;

      bookEl.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
      }, { passive: true });

      bookEl.addEventListener('touchend', function(e) {
        var book = $(bookSelector);
        if (!book.turn('is') || isTurning) return;

        var dx = (e.changedTouches[0] ? e.changedTouches[0].clientX : startX) - startX;
        var dy = (e.changedTouches[0] ? e.changedTouches[0].clientY : startY) - startY;
        var moved = Math.sqrt(dx * dx + dy * dy);
        var elapsed = Date.now() - startTime;

        // Only handle taps (minimal movement, short duration) — swipes are
        // handled by Turn.js's native touch support in single mode.
        if (moved > TAP_MAX_MOVE || elapsed > TAP_MAX_TIME) return;

        // Ignore taps on interactive elements
        var target = e.target;
        while (target && target !== bookEl) {
          if (target.tagName === 'A' || target.id === 'slider-bar' || target.id === 'slider') return;
          target = target.parentNode;
        }

        // Left third → previous, right two-thirds → next
        var relX = (e.changedTouches[0] || e.touches[0] || {}).clientX || startX;
        var rect = bookEl.getBoundingClientRect();
        var ratio = (relX - rect.left) / rect.width;

        if (ratio < 0.33) {
          book.turn('previous');
        } else if (ratio >= 0.4) {
          book.turn('next');
        }
      }, { passive: true });
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
            isTurning = false;
            var book = $(this);
            if (page == 2 || page == 3) { book.turn('peel', 'br'); }
            updateDepth(book);
            $(sliderSelector).slider('value', getViewNumber(book, page));

            // Update URL to current article
            var key = pageToArticle[page];
            if (key) {
              var url = window.location.pathname + '?post=' + key;
              if (window.location.search !== '?post=' + key) {
                window.history.replaceState(null, '', url);
                Hash.update();
              }
            }
          },
          start: function() { isTurning = true; moveBar(true); },
          end: function() {
            isTurning = false;
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
      applyInitialPaperCrops(flipbook);
      initDepthScale(totalPages);
      Hash.check().update();
      flipbook.addClass('animated');
      $(canvasSelector).css({ visibility: 'visible' });
    }

    function mountTocClicks() {
      $(zoomSelector).on('click', 'a[data-page]', function(e) {
        var rawHref = this.getAttribute('href');
        if (!rawHref || rawHref.indexOf('?post=') !== 0) return;
        e.preventDefault();
        var page = parseInt(this.getAttribute('data-page'), 10);
        if (!page) return;
        var book = $(bookSelector);
        if (!book.turn('is')) return;
        book.turn('page', page);
        window.history.pushState(null, '', rawHref);
        Hash.update();
      });
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
      mountTapToTurn();
      mountTocClicks();
      return true;
    }

    return {
      mount: mount,
      clampPageTarget: clampPageTarget
    };
  }

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.TurnAdapter = {
    create: createTurnJsAdapter,
    paperCropForPage: paperCropForPage
  };
  window.BookTurnAdapter = window.BookRuntime.TurnAdapter;
})();
