/**
 * Turn.js bootstrap with runtime pagination.
 *
 * Articles arrive as raw body HTML.  The first time a page is needed
 * the paginator runs in a hidden measurement container, splitting
 * only at block‑element boundaries (never mid‑paragraph).  Long
 * <pre> and <table> elements are the sole exception.
 */

var _bookData = document.getElementById('book-data');
var BOOK_CONFIG = JSON.parse(_bookData.dataset.config);
var ARTICLES = BOOK_CONFIG.articles || [];
var TOTAL_PAGES = BOOK_CONFIG.book.turn.totalPages;
var START_PAGE = BOOK_CONFIG.book.turn.startPage;
var BACK_PAGE = BOOK_CONFIG.book.turn.backPage || TOTAL_PAGES - 1;
var CONTENT_PAGE = BOOK_CONFIG.book.contentPage;
var TURN_OPTIONS = BOOK_CONFIG.book.turn;
var TOC_HTML = BOOK_CONFIG.toc || '';

// ── runtime paginator ──────────────────────────────────────────

/** Cache: pageNumber → assembled HTML string */
var _pageCache = {};
/** Which article does each page belong to? */
var _pageArticle = {};
/** Page ranges for each article: [startPage, endPage) */
var _articleRanges = [];
/** Has the paginator finished for all articles? */
var _paginated = false;

function fmtDate(d) {
  return d;
}

/**
 * Paginate one article into page‑sized chunks.
 * Uses a hidden measurement container with the exact .book-content CSS.
 */
function paginateArticle(article) {
  var maxH = 471;
  var cw = 380;

  var measure = document.createElement('div');
  measure.style.cssText = 'position:absolute;opacity:0;width:' + cw + 'px;top:0;left:0;pointer-events:none';
  measure.innerHTML =
    '<style>' +
    '#__bap_inner { font-family:Georgia,"Times New Roman",serif;font-size:13px;line-height:1.7;color:#3a3a3a;overflow:hidden;overflow-wrap:break-word;word-break:break-word }' +
    '#__bap_inner h1 { font-size:17px;font-weight:700;margin:0 0 8px;line-height:1.25;color:#222 }' +
    '#__bap_inner h2 { font-size:14px;font-weight:600;margin:14px 0 6px;color:#333 }' +
    '#__bap_inner h3 { font-size:13px;font-weight:600;margin:10px 0 4px;color:#444 }' +
    '#__bap_inner p  { margin:0 0 7px;text-indent:1em }' +
    '#__bap_inner p:first-of-type { text-indent:0 }' +
    '#__bap_inner .no-indent { text-indent:0 }' +
    '#__bap_inner pre { font-size:10px;line-height:1.4;background:#f5f2eb;padding:5px 7px;margin:7px 0;border-radius:3px;white-space:pre-wrap }' +
    '#__bap_inner code { font-size:10px;background:#f5f2eb;padding:1px 3px;border-radius:2px }' +
    '#__bap_inner pre code { background:transparent;padding:0 }' +
    '#__bap_inner blockquote { margin:7px 0;padding:3px 7px 3px 9px;border-left:2px solid #c9b99a;color:#666;font-size:12px;font-style:italic }' +
    '#__bap_inner ul,#__bap_inner ol { padding-left:16px;margin:0 0 7px }' +
    '#__bap_inner li { margin-bottom:1px }' +
    '#__bap_inner .list-lvl-1 { padding-left:16px }' +
    '#__bap_inner .list-lvl-2 { padding-left:32px }' +
    '#__bap_inner .list-lvl-3 { padding-left:48px }' +
    '#__bap_inner table { width:100%;font-size:10px;border-collapse:collapse;margin:7px 0 }' +
    '#__bap_inner th,#__bap_inner td { padding:3px 5px;border-bottom:1px solid #ddd;text-align:left }' +
    '#__bap_inner img { max-width:100%;max-height:440px;margin:7px auto;display:block }' +
    '#__bap_inner .katex-display { margin:7px 0 }' +
    '</style>' +
    '<div id="__bap_inner"></div>';
  document.body.appendChild(measure);
  var inner = document.getElementById('__bap_inner');
  inner.style.height = maxH + 'px';

  var firstHdr = '<h1 style="font-size:17px;font-weight:700;margin:0 0 8px;line-height:1.25;color:#222">' +
    article.title + '</h1><p style="color:#999;font-size:11px;margin-bottom:18px">' +
    article.dateStr + '</p>';
  var contHdr = '<p style="color:#999;font-size:10px;text-align:center;margin-bottom:14px">' +
    article.title + '（续）</p>';

  function savePage() {
    var html = inner.innerHTML;
    if (html.trim()) pages.push('<div class="book-content">' + html + '</div><span class="page-number">0</span>');
  }
  function newPage() { inner.innerHTML = contHdr; }

  /** Map visible‑char count → byte offset in rawHTML (skipping tags). */
  function charToHTML(html, target) {
    var vis = 0, inTag = false, off = html.length;
    for (var j = 0; j < html.length; j++) {
      var ch = html[j];
      if (ch === '<') inTag = true;
      else if (ch === '>') inTag = false;
      else if (!inTag) { if (vis >= target) { off = j; break; } vis++; }
    }
    return off;
  }

  /** Split text element by binary search inside the real container. */
  function splitText(el) {
    var tag = el.tagName.toLowerCase();
    var origHTML = el.innerHTML;
    var origText = el.textContent;
    inner.appendChild(el);
    var lo = 10, hi = origText.length, best = 0;
    for (var iter = 0; iter < 15; iter++) {
      var mid = Math.floor((lo + hi) / 2);
      // Preserve inline HTML (<code>, <strong>, etc.) so widths match
      var htmlOff = charToHTML(origHTML, mid);
      el.innerHTML = origHTML.substring(0, htmlOff);
      if (inner.scrollHeight <= maxH) { best = mid; lo = mid + 1; }
      else { hi = mid; }
    }
    inner.removeChild(el);
    if (best === 0 || best >= origText.length - 3) { el.innerHTML = origHTML; return false; }
    var cut = charToHTML(origHTML, best);
    el.innerHTML = origHTML.substring(0, cut);
    inner.appendChild(el);
    var rest = document.createElement(tag);
    rest.innerHTML = origHTML.substring(cut);
    rest.className = 'no-indent';
    elems.splice(i + 1, 0, rest);
    return true;
  }

  /** Split pre by removing lines from the end until it fits. */
  function splitPre(el) {
    var code = el.querySelector('code') || el;
    var lines = code.textContent.split('\n');
    if (lines.length < 2) return false;
    inner.appendChild(el);
    var origLines = lines.slice();
    for (var n = lines.length - 1; n >= 1; n--) {
      code.textContent = origLines.slice(0, n).join('\n');
      if (inner.scrollHeight <= maxH) {
        var restEl = el.cloneNode(true);
        (restEl.querySelector('code') || restEl).textContent = origLines.slice(n).join('\n');
        elems.splice(i + 1, 0, restEl);
        return true;
      }
    }
    code.textContent = origLines.join('\n');
    inner.removeChild(el);
    return false;
  }

  /** Split UL/OL/DL by removing children from the end until it fits. */
  function splitList(el) {
    var items = Array.from(el.children);
    if (items.length < 2) return false;
    inner.appendChild(el);
    var keep = items.length;
    for (var n = items.length - 1; n >= 0; n--) {
      el.removeChild(items[n]);
      if (el.children.length === 0) { keep = items.length; break; }
      if (inner.scrollHeight <= maxH) { keep = n; break; }
    }
    inner.removeChild(el);
    // Restore all items
    while (el.children.length < items.length)
      el.appendChild(items[el.children.length]);
    if (keep >= items.length) return false;
    // Build rest list
    var rest = el.cloneNode(false);
    for (var n = keep; n < items.length; n++)
      rest.appendChild(items[n].cloneNode(true));
    if (el.tagName === 'OL') {
      var origStart = parseInt(el.getAttribute('start')) || 1;
      rest.setAttribute('start', origStart + keep);
    }
    // Remove excess from original
    while (el.children.length > keep) el.removeChild(el.lastChild);
    elems.splice(i + 1, 0, rest);
    return true;
  }

  /** Split TABLE by removing tbody rows from the end until it fits.
   *  Each half keeps the thead. */
  function splitTable(el) {
    // Gather data rows from every tbody (or direct tr if no tbody)
    var tbodies = el.querySelectorAll('tbody');
    if (tbodies.length === 0) {
      // Browser auto-wraps tr in tbody, but be safe
      var directRows = el.querySelectorAll('tr');
      if (directRows.length < 2) return false;
      // Create tbody wrapper for measurement
      var tmpTbody = document.createElement('tbody');
      for (var d = 0; d < directRows.length; d++)
        tmpTbody.appendChild(directRows[d].cloneNode(true));
      el.appendChild(tmpTbody);
      tbodies = [tmpTbody];
    }
    var allRows = [];
    for (var tb = 0; tb < tbodies.length; tb++) {
      var trs = Array.from(tbodies[tb].children);
      for (var tr = 0; tr < trs.length; tr++) allRows.push(trs[tr]);
    }
    if (allRows.length < 2) return false;

    // Measure on a clone
    var test = el.cloneNode(true);
    var testTbodies = test.querySelectorAll('tbody');
    var testRows = [];
    for (var tb2 = 0; tb2 < testTbodies.length; tb2++) {
      var trs2 = Array.from(testTbodies[tb2].children);
      for (var tr2 = 0; tr2 < trs2.length; tr2++) testRows.push(trs2[tr2]);
    }
    inner.appendChild(test);
    var keep = testRows.length;
    for (var n = testRows.length - 1; n >= 1; n--) {
      testRows[n].parentNode.removeChild(testRows[n]);
      if (test.querySelectorAll('tbody tr, tr').length === 0) { keep = testRows.length; break; }
      if (inner.scrollHeight <= maxH) { keep = n; break; }
    }
    inner.removeChild(test);
    if (keep >= allRows.length) return false;

    // Build rest table
    var rest = document.createElement('table');
    for (var a = 0; a < el.attributes.length; a++)
      rest.setAttribute(el.attributes[a].name, el.attributes[a].value);
    var thead = el.querySelector('thead');
    if (thead) rest.appendChild(thead.cloneNode(true));
    var restTbody = document.createElement('tbody');
    for (var n = keep; n < allRows.length; n++)
      restTbody.appendChild(allRows[n].cloneNode(true));
    rest.appendChild(restTbody);

    // Reduce original: keep rows 0..keep-1
    var rowsToRemove = [];
    for (var n = keep; n < allRows.length; n++) rowsToRemove.push(allRows[n]);
    for (var r = 0; r < rowsToRemove.length; r++) {
      if (rowsToRemove[r].parentNode) rowsToRemove[r].parentNode.removeChild(rowsToRemove[r]);
    }

    elems.splice(i + 1, 0, rest);
    return true;
  }

  var tmp = document.createElement('div');
  tmp.innerHTML = article.bodyHTML;


  var elems = Array.from(tmp.children);

  // Fix column widths on cloned tables so split halves stay aligned.
  // Must be called while the table is in the measurement container.
  function pinColWidths(table) {
    var rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;
    var colCount = 0;
    var cells = rows[0].querySelectorAll('td, th');
    colCount = cells.length;
    if (colCount === 0) return;
    // Measure widths while still in DOM
    var widths = [];
    for (var c = 0; c < cells.length; c++) {
      widths.push(cells[c].getBoundingClientRect().width);
    }
    // Apply to all rows
    for (var r = 0; r < rows.length; r++) {
      var rCells = rows[r].querySelectorAll('td, th');
      for (var c = 0; c < Math.min(rCells.length, widths.length); c++) {
        rCells[c].style.width = widths[c] + 'px';
        rCells[c].style.boxSizing = 'border-box';
      }
    }
  }

  // Flatten blockquotes with multiple children: wrap each child
  // in its own <blockquote> so it flows independently.
  for (var bi = 0; bi < elems.length; bi++) {
    if (elems[bi].tagName === 'BLOCKQUOTE' && elems[bi].children.length > 1) {
      var kids = Array.from(elems[bi].children);
      var flat = [];
      for (var k = 0; k < kids.length; k++) {
        var w = document.createElement('div');
        w.innerHTML = '<blockquote>' + kids[k].outerHTML + '</blockquote>';
        flat.push(w.firstChild);
      }
      elems.splice(bi, 1);
      for (var f = flat.length - 1; f >= 0; f--) elems.splice(bi, 0, flat[f]);
      bi += flat.length - 1;
    }
  }

  // Extract nested UL/OL from LI elements into sibling list containers.
  // This keeps LI content simple so splitText never severs HTML structure.
  // Depth classes handle indentation — no DOM nesting needed.
  for (var li = 0; li < elems.length; li++) {
    var el = elems[li];
    if (el.tagName !== 'UL' && el.tagName !== 'OL' && el.tagName !== 'DL') continue;

    var depth = 1;
    var cls = el.className || '';
    var m = cls.match(/list-lvl-(\d+)/);
    if (m) depth = parseInt(m[1]);
    if (!m) el.className = (cls + ' list-lvl-1').trim();

    var items = Array.from(el.children);
    var extracted = [];

    for (var j = items.length - 1; j >= 0; j--) {
      var childLi = items[j];
      var liKids = Array.from(childLi.children);
      for (var c = liKids.length - 1; c >= 0; c--) {
        if (liKids[c].tagName === 'UL' || liKids[c].tagName === 'OL') {
          var nested = liKids[c];
          childLi.removeChild(nested);
          var nCls = (nested.className || '') + ' list-lvl-' + (depth + 1);
          nested.className = nCls.trim();
          extracted.unshift(nested);
        }
      }
      // Remove LI if it became empty after extraction
      if (!childLi.textContent.trim() && childLi.children.length === 0) {
        el.removeChild(childLi);
      }
    }

    // Insert extracted lists after current position in elems
    for (var e = extracted.length - 1; e >= 0; e--) {
      elems.splice(li + 1, 0, extracted[e]);
    }
  }

  // Re-measure images now that they may have loaded
  for (var mi = 0; mi < elems.length; mi++) {
    if (elems[mi].tagName === 'IMG' && elems[mi].naturalWidth > 0) {
      elems[mi].setAttribute('width', elems[mi].naturalWidth);
      elems[mi].setAttribute('height', elems[mi].naturalHeight);
    }
  }

  var pages = [];
  inner.innerHTML = firstHdr;

  var safety = 0;
  for (var i = 0; i < elems.length && safety++ < 3000; i++) {
    var el = elems[i].cloneNode(true);
    inner.appendChild(el);

    if (inner.scrollHeight > maxH) {
      inner.removeChild(inner.lastChild);
      var tag = el.tagName.toLowerCase();
      var split = false;
      var isText = tag === 'p' || tag === 'blockquote' || tag === 'li' || /^h[1-6]$/.test(tag);
      var isHeading = /^h[1-6]$/.test(tag);
      if (isText && !isHeading && el.textContent.length > 5) split = splitText(el);
      else if (tag === 'ul' || tag === 'ol' || tag === 'dl') { split = splitList(el); if (split) inner.appendChild(el); }
      else if (tag === 'table') { split = splitTable(el); if (split) inner.appendChild(el); }
      else if (isHeading) {
        savePage(); newPage();
        inner.appendChild(elems[i].cloneNode(true));
        if (i + 1 < elems.length) {
          i++;
          inner.appendChild(elems[i].cloneNode(true));
        }
        continue;
      }
      else if (tag === 'pre') split = splitPre(el);
      if (!split) {
        savePage(); newPage();
        var retryEl = elems[i].cloneNode(true);
        inner.appendChild(retryEl);
        if (inner.scrollHeight > maxH) {
          inner.removeChild(inner.lastChild);
          // Retry splitting on the clean page
          var retrySplit = false;
          if (tag === 'table') { retrySplit = splitTable(retryEl); if (retrySplit) inner.appendChild(retryEl); }
          else if (tag === 'ul' || tag === 'ol' || tag === 'dl') { retrySplit = splitList(retryEl); if (retrySplit) inner.appendChild(retryEl); }
          if (!retrySplit) inner.appendChild(retryEl); // still fails — accept overflow
        }
      }
    }
  }

  savePage();
  document.body.removeChild(measure);
  return pages.length > 0 ? pages : ['<div class="book-content"><p>&nbsp;</p></div><span class="page-number">0</span>'];
}


function paginateTOC() {
  var maxH = 400;
  var cw = 380;
  var measure = document.createElement('div');
  measure.style.cssText = 'position:absolute;opacity:0;width:' + cw + 'px;top:0;left:0;pointer-events:none';
  measure.innerHTML =
    '<style>' +
    '#__toc { font-family:Georgia,"Times New Roman",serif;font-size:16px;line-height:1.7;color:#3a3a3a;overflow:hidden;overflow-wrap:break-word;word-break:break-word;width:300px;margin:80px auto }' +
    '#__toc h1 { font-size:28px;font-weight:700;margin:0 0 20px;text-align:center }' +
    '#__toc ul { list-style:none;padding:0;margin:0 }' +
    '#__toc li { margin-bottom:8px;font-size:15px }' +
    '#__toc a { color:#8b7355;text-decoration:none }' +
    '#__toc span { color:#aaa;font-size:12px;margin-left:6px }' +
    '</style>' +
    '<div id="__toc"></div>';
  document.body.appendChild(measure);
  var toc = document.getElementById('__toc');
  toc.style.height = maxH + 'px';
  var tmp = document.createElement('div');
  tmp.innerHTML = TOC_HTML;
  var h1 = tmp.querySelector('h1');
  var listItems = Array.from(tmp.querySelectorAll('li'));
  var pages = [];
  toc.innerHTML = '';
  if (h1) { toc.appendChild(h1.cloneNode(true)); }
  var ul = document.createElement('ul');
  toc.appendChild(ul);
  for (var i = 0; i < listItems.length; i++) {
    ul.appendChild(listItems[i].cloneNode(true));
    if (toc.scrollHeight > maxH) {
      ul.removeChild(ul.lastChild);
      var html = toc.innerHTML;
      if (html.trim()) pages.push('<div class="table-contents">' + html + '</div><span class="toc-pn">0</span>');
      toc.innerHTML = '<ul></ul>';
      ul = toc.querySelector('ul');
      ul.appendChild(listItems[i].cloneNode(true));
    }
  }
  var last = toc.innerHTML;
  if (last.trim()) pages.push('<div class="table-contents">' + last + '</div><span class="toc-pn">0</span>');
  document.body.removeChild(measure);
  return pages.length > 0 ? pages : ['<div class="table-contents"><p>&nbsp;</p></div><span class="toc-pn">0</span>'];
}


/**
 * Run the paginator for ALL articles upfront.
 * Returns the total number of content pages.
 */
function toRoman(n) {
  var vals = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  var r = '';
  for (var i = 0; i < vals.length; i++) {
    while (n >= vals[i][0]) { r += vals[i][1]; n -= vals[i][0]; }
  }
  return r;
}

function paginateAll() {
  if (_paginated) return Object.keys(_pageCache).length;

  // ── Step 1: paginate articles, cache results + record starts
  var articleCache = [];
  var articleStarts = [];
  var pg = 7;
  for (var a = 0; a < ARTICLES.length; a++) {
    articleStarts.push(pg);
    var pages = paginateArticle(ARTICLES[a]);
    articleCache.push(pages);
    pg += pages.length;
  }

  // ── Step 2: paginate TOC with estimated starts to get its page count
  var tocItems = '';
  for (var a = 0; a < ARTICLES.length; a++) {
    tocItems += '<li><a href="#page/' + articleStarts[a] + '">' +
      ARTICLES[a].title + ' <span>' + articleStarts[a] + '</span></a></li>';
  }
  TOC_HTML = '<div class="table-contents"><h1>目录</h1><ul>' + tocItems +
    '</ul></div><span class="page-number">i</span>';
  var tocLen = paginateTOC().length;

  // ── Step 3: real physical starts = estimate + TOC page shift
  var shift = (5 + tocLen) - 7;
  START_PAGE = 5 + tocLen;
  // Rebuild TOC — href uses physical page, span shows display page
  tocItems = '';
  for (var a = 0; a < ARTICLES.length; a++) {
    var phys = articleStarts[a] + shift;
    var disp = phys - START_PAGE + 1;
    tocItems += '<li><a href="#page/' + phys + '">' + ARTICLES[a].title +
      ' <span>' + disp + '</span></a></li>';
  }
  TOC_HTML = '<div class="table-contents"><h1>目录</h1><ul>' + tocItems +
    '</ul></div><span class="page-number">i</span>';
  var tocPages = paginateTOC();

  // ── Step 4: store TOC pages — Roman numeral footer
  pg = 5;
  for (var tp = 0; tp < tocPages.length; tp++) {
    _pageCache[pg] = tocPages[tp].replace('<span class="toc-pn">0</span>',
      '<span class="page-number">' + toRoman(pg - 4) + '</span>');
    pg++;
  }

  // ── Step 5: store article pages — Arabic footer starting from 1
  START_PAGE = pg;
  for (var a = 0; a < articleCache.length; a++) {
    var pages = articleCache[a];
    for (var p = 0; p < pages.length; p++) {
      _pageCache[pg] = pages[p].replace('<span class="page-number">0</span>',
        '<span class="page-number">' + (pg - START_PAGE + 1) + '</span>');
      pg++;
    }
  }
  // Parity: back‑inside cover on ODD page, back‑outer on EVEN page
  TOTAL_PAGES = pg % 2 === 0 ? pg + 2 : pg + 1;
  BACK_PAGE = TOTAL_PAGES - 1;

  // Update back‑cover div classes
  var oldBack = document.querySelector('.sj-book .back-side');
  var oldOuter = oldBack ? oldBack.nextElementSibling : null;
  if (oldBack) {
    oldBack.className = oldBack.className.replace(/p\d+/, 'p' + BACK_PAGE);
  }
  if (oldOuter) {
    oldOuter.className = oldOuter.className.replace(/p\d+/, 'p' + TOTAL_PAGES);
  }

  // Inject updated back‑cover sprite CSS for the real page numbers
  var spriteCSS = document.createElement('style');
  spriteCSS.textContent =
    '.sj-book .p' + BACK_PAGE + '{background-color:white;background-image:url(/vendor/turnjs/pics/book-covers.jpg)!important;background-position:-960px 0!important}' +
    '.sj-book .p' + TOTAL_PAGES + '{background-color:white;background-image:url(/vendor/turnjs/pics/book-covers.jpg)!important;background-position:-1440px 0!important}';
  document.head.appendChild(spriteCSS);

  START_PAGE = 5; // default open at first TOC page
  _paginated = true;
  return pg - 7;
}

// ── Turn.js glue ───────────────────────────────────────────────

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
    // Ensure pagination is done
    if (!_paginated) paginateAll();
    // After pagination, TOTAL_PAGES may have changed — update Turn.js
    if (TOTAL_PAGES !== book.turn('pages')) {
      // Turn.js doesn't support changing pages after init easily,
      // so we just use the cached content.
    }

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

function loadApp() {
  try { paginateAll(); } catch(e) {
    console.error('paginateAll failed:', e);
    // Fallback: show at least TOC and empty pages
    _pageCache[5] = TOC_HTML + '<span class="page-number">I</span>';
  }

  var flipbook = $('.sj-book');
  if (flipbook.width() == 0 || flipbook.height() == 0) { setTimeout(loadApp, 10); return; }

  $('#book-zoom').mousewheel(function(event, delta, deltaX, deltaY) {
    var data = $(this).data(), step = 30, flipbook = $('.sj-book'), actualPos = $('#slider').slider('value') * step;
    if (typeof(data.scrollX) == 'undefined') { data.scrollX = actualPos; data.scrollPage = flipbook.turn('page'); }
    data.scrollX = Math.min($('#slider').slider('option', 'max') * step, Math.max(0, data.scrollX + deltaX));
    var actualView = Math.round(data.scrollX / step), page = Math.min(flipbook.turn('pages'), Math.max(1, actualView * 2 - 2));
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

  // Update Turn.js total pages if changed after pagination
  if (TOTAL_PAGES !== TURN_OPTIONS.totalPages) {
    try { flipbook.turn('pages', TOTAL_PAGES); } catch(e) {}
  }

  $('#slider').slider('option', 'max', numberOfViews(flipbook));
  Hash.check().update();
  flipbook.addClass('animated');
  $('#canvas').css({ visibility: 'visible' });
}

yepnope({
  test: Modernizr.csstransforms,
  yep: ['/vendor/turnjs/turn.min.js'],
  nope: ['/vendor/turnjs/turn.min.js'],
  complete: loadApp
});
