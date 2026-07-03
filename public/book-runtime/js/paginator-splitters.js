/**
 * paginator-splitters.js — block splitting strategies for the runtime paginator.
 *
 * Split functions are pure helpers. They receive the measurement container and
 * return { el, rest } | false.
 */
(function () {
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

  var INLINE_TAGS = { code:1, strong:1, em:1, b:1, i:1, a:1, span:1,
    u:1, s:1, del:1, ins:1, sub:1, sup:1, mark:1, small:1,
    abbr:1, dfn:1, cite:1, q:1, kbd:1, samp:1, var:1 };

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
    var openTags = openInlineTags(origHTML, cut);
    var closePart = openTags.slice().reverse().map(function(t){ return '</' + t + '>'; }).join('');
    var reopenPart = openTags.map(function(t){ return '<' + t + '>'; }).join('');
    el.innerHTML = origHTML.substring(0, cut) + closePart;
    var rest = document.createElement(tag);
    rest.innerHTML = reopenPart + origHTML.substring(cut);
    rest.className = 'no-indent';
    return { el: el, rest: rest };
  }

  function splitPre(el, inner, maxH) {
    var code = el.querySelector('code') || el;
    var origHTML = code.innerHTML;
    var htmlLines = origHTML.split('\n');
    if (htmlLines.length < 2) return false;
    inner.appendChild(el);
    for (var n = htmlLines.length - 1; n >= 1; n--) {
      code.innerHTML = htmlLines.slice(0, n).join('\n');
      if (inner.scrollHeight <= maxH) {
        var restEl = el.cloneNode(true);
        var restCode = restEl.querySelector('code') || restEl;
        var openTags = openInlineTags(code.innerHTML, code.innerHTML.length);
        var closeTags = openTags.slice().reverse().map(function(t){ return '</' + t + '>'; }).join('');
        code.innerHTML = code.innerHTML + closeTags;
        var reopenTags = openTags.map(function(t){ return '<' + t + '>'; }).join('');
        restCode.innerHTML = reopenTags + htmlLines.slice(n).join('\n');
        inner.removeChild(el);
        return { el: el, rest: restEl };
      }
    }
    code.innerHTML = origHTML;
    inner.removeChild(el);
    return false;
  }

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
    while (el.children.length < items.length)
      el.appendChild(items[el.children.length]);
    if (keep >= items.length) return false;

    var rest = el.cloneNode(false);
    for (var i = keep; i < items.length; i++)
      rest.appendChild(items[i].cloneNode(true));
    if (el.tagName === 'OL') {
      var origStart = parseInt(el.getAttribute('start')) || 1;
      rest.setAttribute('start', origStart + keep);
    }
    while (el.children.length > keep) el.removeChild(el.lastChild);
    return { el: el, rest: rest };
  }

  function pinColWidths(table) {
    var rows = table.querySelectorAll('tr');
    if (rows.length === 0) return;

    var colCount = 0;
    for (var r = 0; r < rows.length; r++) {
      var n = rows[r].querySelectorAll('td, th').length;
      if (n > colCount) colCount = n;
    }
    if (colCount === 0) return;

    var maxWidths = [];
    for (var c = 0; c < colCount; c++) maxWidths.push(0);
    for (var r2 = 0; r2 < rows.length; r2++) {
      var cells = rows[r2].querySelectorAll('td, th');
      for (var c2 = 0; c2 < cells.length; c2++) {
        var w = cells[c2].getBoundingClientRect().width;
        if (w > maxWidths[c2]) maxWidths[c2] = w;
      }
    }

    for (var r3 = 0; r3 < rows.length; r3++) {
      var rowCells = rows[r3].querySelectorAll('td, th');
      for (var c3 = 0; c3 < rowCells.length; c3++) {
        rowCells[c3].style.width = maxWidths[c3] + 'px';
        rowCells[c3].style.boxSizing = 'border-box';
      }
    }
  }

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

    var rest = document.createElement('table');
    for (var a = 0; a < el.attributes.length; a++)
      rest.setAttribute(el.attributes[a].name, el.attributes[a].value);
    var thead = el.querySelector('thead');
    if (thead) rest.appendChild(thead.cloneNode(true));
    var restTbody = document.createElement('tbody');
    for (var i = keep; i < allRows.length; i++)
      restTbody.appendChild(allRows[i].cloneNode(true));
    rest.appendChild(restTbody);

    var rowsToRemove = [];
    for (var j = keep; j < allRows.length; j++) rowsToRemove.push(allRows[j]);
    for (var r = 0; r < rowsToRemove.length; r++) {
      if (rowsToRemove[r].parentNode) rowsToRemove[r].parentNode.removeChild(rowsToRemove[r]);
    }
    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.appendChild(rest);
    return { el: el, rest: wrap };
  }

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.PaginatorSplitters = {
    splitList: splitList,
    splitPre: splitPre,
    splitTable: splitTable,
    splitText: splitText
  };
})();
