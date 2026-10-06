/**
 * paginator-splitters.js — block splitting strategies for the runtime paginator.
 *
 * Split functions mutate DOM nodes in a browser measurement container and
 * return { el, rest } | false.
 */
(function () {
  // DOM ranges count decoded text, not HTML bytes, and retain ancestor attributes.
  function textFragments(source, target) {
    var document = source.ownerDocument;
    var walker = document.createTreeWalker(source, 4);
    var node,
      remaining = target;
    while ((node = walker.nextNode())) {
      if (remaining > node.data.length) {
        remaining -= node.data.length;
        continue;
      }
      if (
        remaining > 0 &&
        remaining < node.data.length &&
        /[\uD800-\uDBFF]/.test(node.data[remaining - 1]) &&
        /[\uDC00-\uDFFF]/.test(node.data[remaining])
      )
        remaining--;
      var head = document.createRange();
      head.selectNodeContents(source);
      head.setEnd(node, remaining);
      var tail = document.createRange();
      tail.selectNodeContents(source);
      tail.setStart(node, remaining);
      return { head: head.cloneContents(), tail: tail.cloneContents() };
    }
    return {
      head: source.cloneNode(true),
      tail: document.createDocumentFragment(),
    };
  }

  function splitText(el, inner, maxH) {
    var origHTML = el.innerHTML;
    var origText = el.textContent;
    var source = el.cloneNode(true);
    inner.appendChild(el);
    var lo = 10,
      hi = origText.length,
      best = 0;
    for (var iter = 0; iter < 15; iter++) {
      var mid = Math.floor((lo + hi) / 2);
      el.replaceChildren(textFragments(source, mid).head);
      if (inner.scrollHeight <= maxH) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    inner.removeChild(el);
    if (best === 0 || best >= origText.length - 3) {
      el.innerHTML = origHTML;
      return false;
    }
    var fragments = textFragments(source, best);
    el.replaceChildren(fragments.head);
    // Continuations retain the source element's styling and metadata.
    var rest = el.cloneNode(false);
    rest.replaceChildren(fragments.tail);
    rest.classList.add('no-indent');
    return { el: el, rest: rest };
  }

  function splitPre(el, inner, maxH) {
    var code = el.querySelector('code') || el;
    var origHTML = code.innerHTML;
    var origText = code.textContent;
    var lines = origText.split('\n');
    if (lines.length < 2) return false;
    var source = code.cloneNode(true);
    inner.appendChild(el);
    for (var n = lines.length - 1; n >= 1; n--) {
      // Keep the separator in the prefix: concatenating pages must reproduce source text.
      var offset = lines.slice(0, n).join('\n').length + 1;
      if (offset >= origText.length) continue;
      var fragments = textFragments(source, offset);
      code.replaceChildren(fragments.head);
      if (inner.scrollHeight <= maxH) {
        var restEl = el.cloneNode(true);
        var restCode = restEl.querySelector('code') || restEl;
        restCode.replaceChildren(fragments.tail);
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
      if (el.children.length === 0) {
        keep = items.length;
        break;
      }
      if (inner.scrollHeight <= maxH) {
        keep = n;
        break;
      }
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
      if (test.querySelectorAll('tbody tr, tr').length === 0) {
        keep = testRows.length;
        break;
      }
      if (inner.scrollHeight <= maxH) {
        keep = n;
        break;
      }
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
      if (rowsToRemove[r].parentNode)
        rowsToRemove[r].parentNode.removeChild(rowsToRemove[r]);
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
    splitText: splitText,
  };
})();
