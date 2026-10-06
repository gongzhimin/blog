/**
 * @file paginator.js — 运行时文章正文与目录物理分页调度器。
 *
 * 职能：
 * 1. 预处理正文 DOM（引用块扁平化、嵌套列表提升、图片尺寸固化）；
 * 2. 挂载测量沙箱容器，逐元素追加并探测高度溢出；
 * 3. 调度文本、列表、表格与代码块的专用拆分器（PaginatorSplitters）；
 * 4. 自动生成分页结构与临时占位页脚。
 */
(function () {
  var Core = window.BookRuntime.PaginatorCore;
  var Splitters = window.BookRuntime.PaginatorSplitters;

  /**
   * 扁平化多段引用块。将包含多个子元素的 <blockquote> 拆解为多个独立单子元素的 <blockquote>，
   * 消除跨页分页时外层容器嵌套导致的断裂与边距塌陷。
   *
   * @param {Element[]} elems DOM 元素列表（就地变更）
   */
  function flattenBlockquotes(elems) {
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
  }

  /**
   * 提取并展平嵌套列表结构。将嵌套在 <li> 内的子 <ul>/<ol> 提升为同级独立列表节点，
   * 并赋予对应的层级样式类（list-lvl-X），确保分页算法可对深层列表逐项跨页分割。
   *
   * @param {Element[]} elems DOM 元素列表（就地变更）
   */
  function extractNestedLists(elems) {
    for (var li = 0; li < elems.length; li++) {
      var el = elems[li];
      if (el.tagName !== 'UL' && el.tagName !== 'OL' && el.tagName !== 'DL')
        continue;

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
  }

  /**
   * 将已加载图片真实的 naturalWidth / naturalHeight 写入为显式属性，
   * 杜绝测量容器克隆与重新渲染时发生异步布局抖动。
   *
   * @param {Element[]} elems DOM 元素列表（就地变更）
   */
  function remeasureImages(elems) {
    for (var mi = 0; mi < elems.length; mi++) {
      if (elems[mi].tagName === 'IMG' && elems[mi].naturalWidth > 0) {
        elems[mi].setAttribute('width', elems[mi].naturalWidth);
        elems[mi].setAttribute('height', elems[mi].naturalHeight);
      }
    }
  }

  /**
   * 将单篇长文章的 HTML 内容流式分配至固定尺寸的书页中。
   *
   * @param {{title: string, dateStr: string, bodyHTML: string}} article 文章实体
   * @returns {string[]} 分页后的 HTML 字符串数组（每项为一个包含 .book-content 与 .page-number 的完整页面）
   */
  function paginateArticle(article) {
    var config = Core.getConfig();
    var maxH = config.articleHeight;
    var measurement = Core.createMeasureContainer({
      css: config.articleCSS,
      height: maxH,
      innerId: '__bap_inner',
      width: config.articleWidth,
    });
    var measure = measurement.measure;
    var inner = measurement.inner;
    try {
      var firstHdr =
        '<h1 style="font-size:17px;font-weight:700;margin:0 0 8px;line-height:1.25;color:#222">' +
        article.title +
        '</h1><p style="color:#999;font-size:11px;margin-bottom:18px">' +
        article.dateStr +
        '</p>';
      var contHdr =
        '<p style="color:#999;font-size:10px;text-align:center;margin-bottom:14px">' +
        article.title +
        '（续）</p>';
      var pages = [];

      function savePage(html) {
        if (html.trim())
          pages.push(
            '<div class="book-content">' +
              html +
              '</div><span class="page-number">0</span>',
          );
      }
      function newPage() {
        inner.innerHTML = contHdr;
      }

      var tmp = document.createElement('div');
      tmp.innerHTML = article.bodyHTML;
      var elems = Array.from(tmp.children);
      flattenBlockquotes(elems);
      extractNestedLists(elems);
      remeasureImages(elems);

      inner.innerHTML = firstHdr;
      var safety = 0;
      for (var i = 0; i < elems.length; i++) {
        if (safety++ >= 3000) {
          throw new Error('Pagination work budget exceeded: 3000 steps');
        }
        var el = elems[i].cloneNode(true);
        inner.appendChild(el);

        if (inner.scrollHeight > maxH) {
          inner.removeChild(inner.lastChild);
          var tag = el.tagName.toLowerCase();
          var result = false;
          var isText =
            tag === 'p' ||
            tag === 'blockquote' ||
            tag === 'li' ||
            /^h[1-6]$/.test(tag);
          var isHeading = /^h[1-6]$/.test(tag);

          if (isText && !isHeading && el.textContent.length > 5)
            result = Splitters.splitText(el, inner, maxH);
          else if (tag === 'ul' || tag === 'ol' || tag === 'dl')
            result = Splitters.splitList(el, inner, maxH);
          else if (tag === 'table')
            result = Splitters.splitTable(el, inner, maxH);
          else if (isHeading) {
            savePage(inner.innerHTML);
            newPage();
            inner.appendChild(elems[i].cloneNode(true));
            if (i + 1 < elems.length) {
              i++;
              inner.appendChild(elems[i].cloneNode(true));
            }
            continue;
          } else if (tag === 'pre')
            result = Splitters.splitPre(el, inner, maxH);

          if (result) {
            inner.appendChild(result.el);
            elems.splice(i + 1, 0, result.rest);
          } else {
            savePage(inner.innerHTML);
            newPage();
            var retryEl = elems[i].cloneNode(true);
            inner.appendChild(retryEl);
            if (inner.scrollHeight > maxH) {
              inner.removeChild(inner.lastChild);
              var retryResult = false;
              var retryTag = retryEl.tagName.toLowerCase();
              if (retryTag === 'table')
                retryResult = Splitters.splitTable(retryEl, inner, maxH);
              else if (retryTag === 'pre')
                retryResult = Splitters.splitPre(retryEl, inner, maxH);
              else if (
                retryTag === 'p' ||
                retryTag === 'blockquote' ||
                retryTag === 'li'
              )
                // A continuation can exceed an otherwise empty page too.
                retryResult = Splitters.splitText(retryEl, inner, maxH);
              else if (
                retryTag === 'ul' ||
                retryTag === 'ol' ||
                retryTag === 'dl'
              )
                retryResult = Splitters.splitList(retryEl, inner, maxH);
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
      return pages.length > 0
        ? pages
        : [
            '<div class="book-content"><p>&nbsp;</p></div><span class="page-number">0</span>',
          ];
    } finally {
      measure.remove();
    }
  }

  /**
   * 将目录（TOC）条目列表流式拆分为一页或多页固定高度的目录页。
   *
   * @param {string} html 包含 h1 与 ul/li 列表的原始目录 HTML
   * @returns {string[]} 分页后的目录 HTML 字符串数组（每项包含 .table-contents 与 .toc-pn 占位符）
   */
  function paginateTOC(html) {
    var config = Core.getConfig();
    var measurement = Core.createMeasureContainer({
      css: config.tocCSS,
      height: config.tocHeight,
      innerId: '__toc',
      width: config.tocWidth,
    });
    var measure = measurement.measure;
    var toc = measurement.inner;
    try {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var h1 = tmp.querySelector('h1');
      var listItems = Array.from(tmp.querySelectorAll('li'));
      var pages = [];
      toc.innerHTML = '';
      if (h1) {
        toc.appendChild(h1.cloneNode(true));
      }
      var ul = document.createElement('ul');
      toc.appendChild(ul);
      for (var i = 0; i < listItems.length; i++) {
        ul.appendChild(listItems[i].cloneNode(true));
        if (toc.scrollHeight > config.tocHeight) {
          ul.removeChild(ul.lastChild);
          var pageHtml = toc.innerHTML;
          if (pageHtml.trim())
            pages.push(
              '<div class="table-contents">' +
                pageHtml +
                '</div><span class="toc-pn">0</span>',
            );
          toc.innerHTML = '<ul></ul>';
          ul = toc.querySelector('ul');
          ul.appendChild(listItems[i].cloneNode(true));
        }
      }
      var last = toc.innerHTML;
      if (last.trim())
        pages.push(
          '<div class="table-contents">' +
            last +
            '</div><span class="toc-pn">0</span>',
        );
      return pages.length > 0
        ? pages
        : [
            '<div class="table-contents"><p>&nbsp;</p></div><span class="toc-pn">0</span>',
          ];
    } finally {
      measure.remove();
    }
  }

  var api = {
    configure: Core.configure,
    getConfig: Core.getConfig,
    paginateArticle: paginateArticle,
    paginateTOC: paginateTOC,
  };

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.Paginator = api;
})();
