/**
 * orchestrator.js — Global pagination orchestration.
 *
 * paginateAll() runs once: paginates every article, measures the TOC,
 * computes display page numbers, and fills _pageCache.
 */

/** Cache: physicalPage → assembled HTML string */
var _pageCache = {};
/** Has the paginator finished? */
var _paginated = false;

function toRoman(n) {
  var vals = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  var r = '';
  for (var i = 0; i < vals.length; i++) {
    while (n >= vals[i][0]) { r += vals[i][1]; n -= vals[i][0]; }
  }
  return r;
}

function paginateAll(articles, initialTOC) {
  if (_paginated) return Object.keys(_pageCache).length;

  // ── Step 1: paginate articles, cache results + record starts ──
  var articleCache = [];
  var articleStarts = [];
  var pg = 7;
  for (var a = 0; a < articles.length; a++) {
    articleStarts.push(pg);
    var pages = PAGINATOR.paginateArticle(articles[a]);
    articleCache.push(pages);
    pg += pages.length;
  }

  // ── Step 2: paginate TOC with estimated starts to get page count ──
  var tocItems = '';
  for (var a = 0; a < articles.length; a++) {
    tocItems += '<li><a href="#page/' + articleStarts[a] + '">' +
      articles[a].title + ' <span>' + articleStarts[a] + '</span></a></li>';
  }
  var tocHTML = '<div class="table-contents"><h1>目录</h1><ul>' + tocItems +
    '</ul></div><span class="page-number">i</span>';
  var tocLen = PAGINATOR.paginateTOC(tocHTML).length;

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
  tocHTML = '<div class="table-contents"><h1>目录</h1><ul>' + tocItems +
    '</ul></div><span class="page-number">i</span>';
  var tocPages = PAGINATOR.paginateTOC(tocHTML);

  // ── Step 4: store TOC pages (Roman numeral footer) ──
  pg = 5;
  for (var tp = 0; tp < tocPages.length; tp++) {
    _pageCache[pg] = tocPages[tp].replace('<span class="toc-pn">0</span>',
      '<span class="page-number">' + toRoman(pg - 4) + '</span>');
    pg++;
  }

  // ── Step 5: store article pages (Arabic footer, starting from 1) ──
  var articleStart = pg;
  for (var a = 0; a < articleCache.length; a++) {
    var pages = articleCache[a];
    for (var p = 0; p < pages.length; p++) {
      _pageCache[pg] = pages[p].replace('<span class="page-number">0</span>',
        '<span class="page-number">' + (pg - articleStart + 1) + '</span>');
      pg++;
    }
  }

  // Parity and back‑cover
  var totalPages = pg % 2 === 0 ? pg + 2 : pg + 1;
  var backPage = totalPages - 1;

  // Update back‑cover DOM
  var oldBack = document.querySelector('.sj-book .back-side');
  var oldOuter = oldBack ? oldBack.nextElementSibling : null;
  if (oldBack) {
    oldBack.className = oldBack.className.replace(/p\d+/, 'p' + backPage);
  }
  if (oldOuter) {
    oldOuter.className = oldOuter.className.replace(/p\d+/, 'p' + totalPages);
  }

  // Inject back‑cover sprite CSS
  var spriteCSS = document.createElement('style');
  spriteCSS.textContent =
    '.sj-book .p' + backPage + '{background-color:white;background-image:url(/vendor/turnjs/pics/book-covers.jpg)!important;background-repeat:no-repeat;background-size:2400px 600px;background-position:-960px 0!important}' +
    '.sj-book .p' + totalPages + '{background-color:white;background-image:url(/vendor/turnjs/pics/book-covers.jpg)!important;background-repeat:no-repeat;background-size:2400px 600px;background-position:-1440px 0!important}';
  document.head.appendChild(spriteCSS);

  _paginated = true;
  return {
    totalPages: totalPages,
    backPage: backPage,
    articleStart: articleStart,
    bodyStart: bodyStart
  };
}
