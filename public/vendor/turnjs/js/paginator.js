/**
 * paginator.js — Runtime page-breaking engine.
 *
 * paginateArticle(article)  → string[]  (one <div class="book-content"> per page)
 * paginateTOC()             → string[]  (one <div class="table-contents"> per page)
 *
 * Measurement happens in real DOM containers styled identically to the
 * book pages.  Split functions are pure helpers — they receive the
 * measurement context as parameters and return { el, rest } | false.
 */
var PAGINATOR = (function () {
  var M = MEASURE_CSS;

  // ── helpers ──────────────────────────────────────────────────────

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

  // ── inline tag preservation ─────────────────────────────────────

  var INLINE_TAGS = { code:1, strong:1, em:1, b:1, i:1, a:1, span:1,
    u:1, s:1, del:1, ins:1, sub:1, sup:1, mark:1, small:1,
    abbr:1, dfn:1, cite:1, q:1, kbd:1, samp:1, var:1 };

  /** Find which inline tags are open at byte offset `cut` in `html`. */
  function openInlineTags(html, cut) {
    var before = html.substring(0, cut);
    var stack = [];
    var re = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    var m;
    while ((m = re.exec(before)) !== null) {
      var name = m[1].toLowerCase();
      if (INLINE_TAGS[name]) {
        if (m[0].substring(0, 2) === '</') {
          var idx = stack.lastIndexOf(name);
          if (idx >= 0) stack.splice(idx, 1);
        } else if (!/\/>$/.test(m[0])) {
          stack.push(name);
        }
      }
    }
    return stack;
  }

  // ── split functions — pure, no closure over i / elems ────────────

  /** Split a text‑level element (p, li, blockquote, h1‑h6) by binary
   *  search inside the measurement container.
   *  Returns { el, rest } where `el` is the reduced original and
   *  `rest` is a new element with the overflow, or false. */
  function splitText(el, inner, maxH) {
    var tag = el.tagName.toLowerCase();
    var origHTML = el.innerHTML;
    var origText = el.textContent;
    inner.appendChild(el);
    var lo = 10, hi = origText.length, best = 0;
    for (var iter = 0; iter < 15; iter++) {
      var mid = Math.floor((lo + hi) / 2);
      var htmlOff = charToHTML(origHTML, mid);
      el.innerHTML = origHTML.substring(0, htmlOff);
      if (inner.scrollHeight <= maxH) { best = mid; lo = mid + 1; }
      else { hi = mid; }
    }
    inner.removeChild(el);
    if (best === 0 || best >= origText.length - 3) { el.innerHTML = origHTML; return false; }
    var cut = charToHTML(origHTML, best);

    // Preserve inline tags across the split boundary:
    // tags still open at `cut` are closed in Part 1 and reopened in Part 2.
    var openTags = openInlineTags(origHTML, cut);
    var closePart = openTags.slice().reverse().map(function(t){ return '</' + t + '>'; }).join('');
    var reopenPart = openTags.map(function(t){ return '<' + t + '>'; }).join('');

    el.innerHTML = origHTML.substring(0, cut) + closePart;
    var rest = document.createElement(tag);
    rest.innerHTML = reopenPart + origHTML.substring(cut);
    rest.className = 'no-indent';
    return { el: el, rest: rest };
  }

  /** Split <pre> by removing lines from the end, preserving inner HTML. */
  function splitPre(el, inner, maxH) {
    var code = el.querySelector('code') || el;
    // Split the inner HTML by newline boundaries, keeping tags intact
    var origHTML = code.innerHTML;
    var htmlLines = origHTML.split('\n');
    if (htmlLines.length < 2) return false;
    inner.appendChild(el);
    for (var n = htmlLines.length - 1; n >= 1; n--) {
      code.innerHTML = htmlLines.slice(0, n).join('\n');
      if (inner.scrollHeight <= maxH) {
        var restEl = el.cloneNode(true);
        var restCode = restEl.querySelector('code') || restEl;
        // Preserve inline tags across the split boundary
        var openTags = openInlineTags(code.innerHTML, code.innerHTML.length);
        var closeTags = openTags.slice().reverse().map(function(t){ return '</' + t + '>'; }).join('');
        code.innerHTML = code.innerHTML + closeTags;
        var reopenTags = openTags.map(function(t){ return '<' + t + '>'; }).join('');
        restCode.innerHTML = reopenTags + htmlLines.slice(n).join('\n');
        inner.removeChild(el);
        return { el: el, rest: restEl };
      }
    }
    code.innerHTML = origHTML; // restore
    inner.removeChild(el);
    return false;
  }

  /** Split UL/OL/DL by removing children from the end. */
  function splitList(el, inner, maxH) {
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

    var rest = el.cloneNode(false);
    for (var n = keep; n < items.length; n++)
      rest.appendChild(items[n].cloneNode(true));
    if (el.tagName === 'OL') {
      var origStart = parseInt(el.getAttribute('start')) || 1;
      rest.setAttribute('start', origStart + keep);
    }
    // Reduce original
    while (el.children.length > keep) el.removeChild(el.lastChild);
    return { el: el, rest: rest };
  }

  /** Pin column widths so split table halves stay aligned.
   *  Must be called while the table is in the DOM. */
  /** Pin column widths based on the widest content in each column
   *  across ALL rows, so every row (and every split sub-table)
   *  gets the same proportional column allocation. */
  function pinColWidths(table) {
    var rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;

    // Count columns (handle rows with different cell counts)
    var colCount = 0;
    for (var r = 0; r < rows.length; r++) {
      var n = rows[r].querySelectorAll('td, th').length;
      if (n > colCount) colCount = n;
    }
    if (colCount === 0) return;

    // Max natural width per column across all rows
    var maxWidths = [];
    for (var c = 0; c < colCount; c++) maxWidths.push(0);
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll('td, th');
      for (var c = 0; c < cells.length; c++) {
        var w = cells[c].getBoundingClientRect().width;
        if (w > maxWidths[c]) maxWidths[c] = w;
      }
    }

    // Apply max widths to every cell
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll('td, th');
      for (var c = 0; c < cells.length; c++) {
        cells[c].style.width = maxWidths[c] + 'px';
        cells[c].style.boxSizing = 'border-box';
      }
    }
  }

  /** Split TABLE by removing tbody rows from the end. */
  function splitTable(el, inner, maxH) {
    var tbodies = el.querySelectorAll('tbody');
    if (tbodies.length === 0) {
      var directRows = el.querySelectorAll('tr');
      if (directRows.length < 2) return false;
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

    // Pin widths on a clone in DOM
    inner.appendChild(el);
    pinColWidths(el);
    var test = el.cloneNode(true);
    inner.removeChild(el);

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

    // Reduce original
    var rowsToRemove = [];
    for (var n = keep; n < allRows.length; n++) rowsToRemove.push(allRows[n]);
    for (var r = 0; r < rowsToRemove.length; r++) {
      if (rowsToRemove[r].parentNode) rowsToRemove[r].parentNode.removeChild(rowsToRemove[r]);
    }
    // Wrap rest in .table-wrap so horizontal scroll works on split pages too
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.appendChild(rest);
    return { el: el, rest: wrap };
  }

  // ── article pagination ───────────────────────────────────────────

  var ARTICLE_H = 471;
  var ARTICLE_W = 380;

  function paginateArticle(article) {
    var maxH = ARTICLE_H;
    var cw = ARTICLE_W;

    var measure = document.createElement('div');
    measure.style.cssText = 'position:absolute;opacity:0;width:' + cw + 'px;top:0;left:0;pointer-events:none';
    measure.innerHTML = '<style>' + M.article + '</style><div id="__bap_inner"></div>';
    document.body.appendChild(measure);
    var inner = document.getElementById('__bap_inner');
    inner.style.height = maxH + 'px';

    var firstHdr = '<h1 style="font-size:17px;font-weight:700;margin:0 0 8px;line-height:1.25;color:#222">' +
      article.title + '</h1><p style="color:#999;font-size:11px;margin-bottom:18px">' +
      article.dateStr + '</p>';
    var contHdr = '<p style="color:#999;font-size:10px;text-align:center;margin-bottom:14px">' +
      article.title + '（续）</p>';

    function savePage(html) {
      if (html.trim()) pages.push('<div class="book-content">' + html + '</div><span class="page-number">0</span>');
    }
    function newPage() { inner.innerHTML = contHdr; }

    var tmp = document.createElement('div');
    tmp.innerHTML = article.bodyHTML;

    var elems = Array.from(tmp.children);

    // Flatten blockquotes with multiple children
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

    // Extract nested UL/OL/DL from LI elements
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
        if (!childLi.textContent.trim() && childLi.children.length === 0) {
          el.removeChild(childLi);
        }
      }

      for (var e = extracted.length - 1; e >= 0; e--) {
        elems.splice(li + 1, 0, extracted[e]);
      }
    }

    // Re-measure images
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
        var result = false;
        var isText = tag === 'p' || tag === 'blockquote' || tag === 'li' || /^h[1-6]$/.test(tag);
        var isHeading = /^h[1-6]$/.test(tag);

        if (isText && !isHeading && el.textContent.length > 5)
          result = splitText(el, inner, maxH);
        else if (tag === 'ul' || tag === 'ol' || tag === 'dl')
          result = splitList(el, inner, maxH);
        else if (tag === 'table')
          result = splitTable(el, inner, maxH);
        else if (isHeading) {
          savePage(inner.innerHTML); newPage();
          inner.appendChild(elems[i].cloneNode(true));
          if (i + 1 < elems.length) {
            i++;
            inner.appendChild(elems[i].cloneNode(true));
          }
          continue;
        }
        else if (tag === 'pre')
          result = splitPre(el, inner, maxH);

        if (result) {
          inner.appendChild(result.el);
          elems.splice(i + 1, 0, result.rest);
        } else {
          savePage(inner.innerHTML); newPage();
          var retryEl = elems[i].cloneNode(true);
          inner.appendChild(retryEl);
          if (inner.scrollHeight > maxH) {
            inner.removeChild(inner.lastChild);
            var retryResult = false;
            var retryTag = retryEl.tagName.toLowerCase();
            if (retryTag === 'table')
              retryResult = splitTable(retryEl, inner, maxH);
            else if (retryTag === 'ul' || retryTag === 'ol' || retryTag === 'dl')
              retryResult = splitList(retryEl, inner, maxH);
            if (retryResult) {
              inner.appendChild(retryResult.el);
              elems.splice(i + 1, 0, retryResult.rest);
            } else {
              inner.appendChild(retryEl);
            }
          }
        }
      }
    }

    savePage(inner.innerHTML);
    document.body.removeChild(measure);
    return pages.length > 0 ? pages : ['<div class="book-content"><p>&nbsp;</p></div><span class="page-number">0</span>'];
  }

  // ── TOC pagination ────────────────────────────────────────────────

  var TOC_H = 400;

  function paginateTOC(html) {
    var maxH = TOC_H;
    var cw = 380;
    var measure = document.createElement('div');
    measure.style.cssText = 'position:absolute;opacity:0;width:' + cw + 'px;top:0;left:0;pointer-events:none';
    measure.innerHTML = '<style>' + M.toc + '</style><div id="__toc"></div>';
    document.body.appendChild(measure);
    var toc = document.getElementById('__toc');
    toc.style.height = maxH + 'px';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
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
        var pageHtml = toc.innerHTML;
        if (pageHtml.trim()) pages.push('<div class="table-contents">' + pageHtml + '</div><span class="toc-pn">0</span>');
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

  // ── public API ────────────────────────────────────────────────────

  return {
    paginateArticle: paginateArticle,
    paginateTOC: paginateTOC,
    ARTICLE_H: ARTICLE_H,
    TOC_H: TOC_H
  };
})();
