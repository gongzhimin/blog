/**
 * orchestrator.js — Global pagination orchestration.
 *
 * BookRuntime.Orchestrator.createPageCache() creates one page-cache instance:
 * it paginates every article, measures the TOC, computes display page numbers,
 * and serves physical pages to the Turn.js adapter.
 */
(function () {
  function toRoman(n) {
    var vals = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    var r = '';
    for (var i = 0; i < vals.length; i++) {
      while (n >= vals[i][0]) { r += vals[i][1]; n -= vals[i][0]; }
    }
    return r;
  }

  function getCoverSprite(options) {
    var sprite = options && options.coverSprite;
    return sprite || {
      image: '/vendor/turnjs/pics/book-covers.jpg',
      backgroundSize: '2400px 600px',
      positions: {
        back: '-968px 0',
        backOuter: '-1452px 0'
      }
    };
  }

  function injectBackCoverCSS(backPage, totalPages, coverSprite) {
    var positions = coverSprite.positions || {};
    var spriteCSS = document.createElement('style');
    spriteCSS.textContent =
      '.sj-book .p' + backPage + '{background-color:white;background-image:url(' + coverSprite.image + ')!important;background-repeat:no-repeat;background-size:' + coverSprite.backgroundSize + ';background-position:' + positions.back + '!important}' +
      '.sj-book .p' + totalPages + '{background-color:white;background-image:url(' + coverSprite.image + ')!important;background-repeat:no-repeat;background-size:' + coverSprite.backgroundSize + ';background-position:' + positions.backOuter + '!important}';
    document.head.appendChild(spriteCSS);
  }

  function createBookPageCache(options) {
    var pageCache = {};
    var paginated = false;
    var tocTitle = (options && options.tocTitle) || '目录';
    var coverSprite = getCoverSprite(options);

    function getPageContent(page) {
      return pageCache[page];
    }

    function setPageContent(page, content) {
      pageCache[page] = content;
    }

    function isPaginated() {
      return paginated;
    }

    function reset() {
      pageCache = {};
      paginated = false;
    }

    function paginateAll(articles, initialTOC) {
      if (paginated) {
        return {
          totalPages: Object.keys(pageCache).length,
          pageCache: pageCache
        };
      }

      // ── Step 1: paginate articles, cache results + record starts ──
      var articleCache = [];
      var articleStarts = [];
      var pg = 7;
      for (var a = 0; a < articles.length; a++) {
        articleStarts.push(pg);
        var pages = window.BookRuntime.Paginator.paginateArticle(articles[a]);
        articleCache.push(pages);
        pg += pages.length;
      }

      // ── Step 2: paginate TOC with estimated starts to get page count ──
      var tocItems = '';
      for (var a = 0; a < articles.length; a++) {
        tocItems += '<li><a href="#page/' + articleStarts[a] + '">' +
          articles[a].title + ' <span>' + articleStarts[a] + '</span></a></li>';
      }
      var tocHTML = '<div class="table-contents"><h1>' + tocTitle + '</h1><ul>' + tocItems +
        '</ul></div><span class="page-number">i</span>';
      var tocLen = window.BookRuntime.Paginator.paginateTOC(tocHTML).length;

      // ── Step 3: compute real starts, rebuild TOC with display numbers ──
      var shift = (5 + tocLen) - 7;
      var bodyStart = 5 + tocLen;
      tocItems = '';
      for (var a = 0; a < articles.length; a++) {
        var phys = articleStarts[a] + shift;
        var disp = phys - bodyStart + 1;
        tocItems += '<li><a href="#page/' + phys + '">' + articles[a].title +
          ' <span>' + disp + '</span></a></li>';
      }
      tocHTML = '<div class="table-contents"><h1>' + tocTitle + '</h1><ul>' + tocItems +
        '</ul></div><span class="page-number">i</span>';
      var tocPages = window.BookRuntime.Paginator.paginateTOC(tocHTML);

      // ── Step 4: store TOC pages (Roman numeral footer) ──
      pg = 5;
      for (var tp = 0; tp < tocPages.length; tp++) {
        pageCache[pg] = tocPages[tp].replace('<span class="toc-pn">0</span>',
          '<span class="page-number">' + toRoman(pg - 4) + '</span>');
        pg++;
      }

      // ── Step 5: store article pages (Arabic footer, starting from 1) ──
      var articleStart = pg;
      for (var a = 0; a < articleCache.length; a++) {
        var pages = articleCache[a];
        for (var p = 0; p < pages.length; p++) {
          pageCache[pg] = pages[p].replace('<span class="page-number">0</span>',
            '<span class="page-number">' + (pg - articleStart + 1) + '</span>');
          pg++;
        }
      }

      // Parity and back-cover
      var totalPages = pg % 2 === 0 ? pg + 2 : pg + 1;
      var backPage = totalPages - 1;

      // Pre-fill back-cover and blank parity pages so the fallback
      // doesn't stamp a physical page number onto them.
      pageCache[backPage] = '<div class="book-content"></div>';
      pageCache[totalPages] = '<div class="book-content"></div>';
      if (pg < backPage) pageCache[pg] = '<div class="book-content"></div>';

      // Update back-cover DOM.
      var oldBack = document.querySelector('.sj-book .back-side');
      var oldOuter = oldBack ? oldBack.nextElementSibling : null;
      if (oldBack) {
        oldBack.className = oldBack.className.replace(/p\d+/, 'p' + backPage);
      }
      if (oldOuter) {
        oldOuter.className = oldOuter.className.replace(/p\d+/, 'p' + totalPages);
      }

      injectBackCoverCSS(backPage, totalPages, coverSprite);

      paginated = true;
      return {
        totalPages: totalPages,
        backPage: backPage,
        articleStart: articleStart,
        bodyStart: bodyStart,
        pageCache: pageCache
      };
    }

    return {
      getPageContent: getPageContent,
      isPaginated: isPaginated,
      paginateAll: paginateAll,
      reset: reset,
      setPageContent: setPageContent
    };
  }

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.Orchestrator = {
    createPageCache: createBookPageCache,
    toRoman: toRoman
  };
  window.BookOrchestrator = window.BookRuntime.Orchestrator;
})();
