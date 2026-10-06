/**
 * @file orchestrator.js — 全局分页编排与多篇文章物理页码分配调度器。
 *
 * 核心职能：
 * 1. 驱动每篇文章在无样式溢出的隔离容器中进行 DOM 拆分；
 * 2. 测量动态生成的目录（TOC）所占页数并计算正文物理起止偏移；
 * 3. 编排罗马数字前言/目录页与阿拉伯数字正文页脚，维持全书偶数页码闭合不变量；
 * 4. 为 Turn.js 翻页内核提供随选即取的物理页 DOM 缓存与 ?post=<key> 双向映射。
 */
(function () {
  /**
   * 将正整数转换为经典小写/大写罗马数字，用于目录与前言页码标注。
   *
   * @param {number} n 正整数（如 1 -> 'I', 4 -> 'IV'）
   * @returns {string} 罗马数字字符串
   */
  function toRoman(n) {
    var vals = [
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];
    var r = '';
    for (var i = 0; i < vals.length; i++) {
      while (n >= vals[i][0]) {
        r += vals[i][1];
        n -= vals[i][0];
      }
    }
    return r;
  }

  /**
   * HTML 特殊字符转义安全工具函数。
   *
   * @param {string} str 待转义原始字符串
   * @returns {string} 转义后安全字符串
   */
  function escapeHTML(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * 页面类型枚举常数。
   * 特殊页面（前四页、最后两页、目录页、尾衬页）均不计入正文统计与页码计数；
   * 正文页面（BODY）是全书唯一参与页码统计的页面。
   */
  var PAGE_KIND = {
    FRONT_COVER: 'front_cover', // 物理页 1 (封面外壳)
    INSIDE_FRONT_COVER: 'inside_front_cover', // 物理页 2 (封二)
    TITLE_PAGE: 'title_page', // 物理页 3 (扉页正面)
    IMPRINT_PAGE: 'imprint_page', // 物理页 4 (扉页反面 / 版权题记页)
    TOC: 'toc', // 物理页 5 ~ 4 + N (动态目录页)
    BODY: 'body', // 物理页 5 + N ~ 4 + N + M (正文页)
    ALIGNMENT_ENDPAPER: 'alignment_endpaper', // 偶数对齐尾衬页 (若正文在奇数页结束)
    INSIDE_BACK_COVER: 'inside_back_cover', // 物理页 totalPages - 1 (封三)
    BACK_COVER: 'back_cover', // 物理页 totalPages (封底外壳)
  };

  /**
   * 渲染物理页 3（扉页正面）典雅排版内容。
   *
   * @param {Object} metadata 文档元信息
   * @returns {string} 扉页 HTML
   */
  function renderTitlePage(metadata) {
    var title =
      (metadata && (metadata.documentTitle || metadata.title)) || '志民的博客';
    var subtitle =
      (metadata && metadata.subtitle) || '文字留住瞬间 · 技术笔记与生活随笔';
    var author = (metadata && metadata.author) || '志民';
    return (
      '<div class="book-content special-page title-page">' +
      '<div class="title-page__container">' +
      '<div class="title-page__header"><span class="title-page__tag">COLLECTION</span></div>' +
      '<h1 class="title-page__title">' +
      escapeHTML(title) +
      '</h1>' +
      '<div class="title-page__rule"></div>' +
      '<p class="title-page__subtitle">' +
      escapeHTML(subtitle) +
      '</p>' +
      '<div class="title-page__footer">' +
      '<span class="title-page__author">' +
      escapeHTML(author) +
      '</span>' +
      '<span class="title-page__edition">WEB EDITION</span>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /**
   * 渲染物理页 4（扉页反面 / 版权题记页）典雅排版内容。
   *
   * @param {Object} metadata 文档元信息
   * @returns {string} 版权页 HTML
   */
  function renderImprintPage(metadata) {
    var title =
      (metadata && (metadata.documentTitle || metadata.title)) || '志民的博客';
    var author = (metadata && metadata.author) || '志民';
    var year = (metadata && metadata.year) || new Date().getFullYear();
    return (
      '<div class="book-content special-page imprint-page">' +
      '<div class="imprint-page__container">' +
      '<h2 class="imprint-page__heading">出版说明 / IMPRINT</h2>' +
      '<div class="imprint-page__rule"></div>' +
      '<p class="imprint-page__item"><strong>书名：</strong>' +
      escapeHTML(title) +
      '</p>' +
      '<p class="imprint-page__item"><strong>作者：</strong>' +
      escapeHTML(author) +
      '</p>' +
      '<p class="imprint-page__item"><strong>版本：</strong>博客文集电子典藏版</p>' +
      '<p class="imprint-page__item"><strong>出版时间：</strong>' +
      escapeHTML(String(year)) +
      ' 年</p>' +
      '<div class="imprint-page__statement">' +
      '<p>本书由 Astro 与 Turn.js 仿真排版引擎驱动生成。</p>' +
      '<p>文集收录博主撰写之技术文章与生活随笔，保留原始排版风格与阅读体验。</p>' +
      '<p class="imprint-page__copyright">&copy; ' +
      escapeHTML(String(year)) +
      ' ' +
      escapeHTML(author) +
      '. 保留所有权利。</p>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /**
   * 渲染双页对齐尾衬页内容。
   *
   * @returns {string} 尾衬页 HTML
   */
  function renderAlignmentEndpaper() {
    return (
      '<div class="book-content special-page endpaper-page">' +
      '<div class="endpaper-page__container">' +
      '<div class="endpaper-page__mark">❦</div>' +
      '</div>' +
      '</div>'
    );
  }

  /**
   * 获取指定物理页所属类型。
   *
   * @param {number} page 物理页号
   * @param {Object} [layout] 整书分页布局信息
   * @returns {string|null} 页面类型
   */
  function getPageKind(page, layout) {
    var p = parseInt(page, 10);
    if (!p || p < 1) return null;
    if (p === 1) return PAGE_KIND.FRONT_COVER;
    if (p === 2) return PAGE_KIND.INSIDE_FRONT_COVER;
    if (p === 3) return PAGE_KIND.TITLE_PAGE;
    if (p === 4) return PAGE_KIND.IMPRINT_PAGE;
    if (!layout) return null;
    if (p < layout.bodyStart) return PAGE_KIND.TOC;
    if (p <= layout.bodyEnd) return PAGE_KIND.BODY;
    if (p === layout.backPage) return PAGE_KIND.INSIDE_BACK_COVER;
    if (p === layout.totalPages) return PAGE_KIND.BACK_COVER;
    return PAGE_KIND.ALIGNMENT_ENDPAPER;
  }

  /**
   * 判定指定物理页是否为特殊页面（不计入正文统计与页脚阿拉伯页码）。
   *
   * @param {number} page 物理页号
   * @param {Object} [layout] 整书分页布局信息
   * @returns {boolean} 是否为特殊页面
   */
  function isSpecialPage(page, layout) {
    return getPageKind(page, layout) !== PAGE_KIND.BODY;
  }

  /**
   * 判定指定物理页是否为正文页（参与正文统计与页脚阿拉伯页码计数）。
   *
   * @param {number} page 物理页号
   * @param {Object} [layout] 整书分页布局信息
   * @returns {boolean} 是否为正文页
   */
  function isCountedPage(page, layout) {
    return getPageKind(page, layout) === PAGE_KIND.BODY;
  }

  /**
   * 物理页号转换为正文页码（从 1 开始）；非正文页返回 null。
   *
   * @param {number} page 物理页号
   * @param {Object} [layout] 整书分页布局信息
   * @returns {number|null} 正文页码
   */
  function physicalToBodyPage(page, layout) {
    var p = parseInt(page, 10);
    if (!layout || !p) return null;
    if (p >= layout.bodyStart && p <= layout.bodyEnd) {
      return p - layout.bodyStart + 1;
    }
    return null;
  }

  /**
   * 正文页码转换为物理页号；超出正文范围返回 null。
   *
   * @param {number} bodyPage 正文页码（1 开始）
   * @param {Object} [layout] 整书分页布局信息
   * @returns {number|null} 物理页号
   */
  function bodyToPhysicalPage(bodyPage, layout) {
    var bp = parseInt(bodyPage, 10);
    if (!layout || !bp) return null;
    var total =
      layout.totalBodyPages ||
      (layout.bodyEnd ? layout.bodyEnd - layout.bodyStart + 1 : 0);
    if (bp >= 1 && bp <= total) {
      return layout.bodyStart + bp - 1;
    }
    return null;
  }

  /**
   * 解析封面精灵图配置，提供默认雪碧图资产与贴图坐标回退。
   *
   * @param {Object} [options] 运行参数
   * @param {Object} [options.coverSprite] 外部自定义精灵图配置
   * @returns {{image: string, backgroundSize: string, positions: {back: string, backOuter: string}}}
   */
  function getCoverSprite(options) {
    var sprite = options && options.coverSprite;
    return (
      sprite || {
        image: '/vendor/turnjs/pics/book-covers.jpg',
        backgroundSize: '2400px 600px',
        positions: {
          back: '-968px 0',
          backInside: '-1936px 0',
          backOuter: '-1452px 0',
        },
      }
    );
  }

  /**
   * 动态注入封底与封底外壳的 CSS 背景定位样式规则。
   *
   * @param {number} backPage 封底内侧物理页号（totalPages - 1）
   * @param {number} totalPages 封底外壳物理页号（偶数闭合总页数）
   * @param {{image: string, backgroundSize: string, positions: {back?: string, backInside?: string, backOuter?: string}}} coverSprite 精灵图定位信息
   */
  function injectBackCoverCSS(backPage, totalPages, coverSprite) {
    var positions = coverSprite.positions || {};
    var spriteCSS = document.createElement('style');
    spriteCSS.textContent =
      '.sj-book .p' +
      backPage +
      '{background-color:white;background-image:url(' +
      coverSprite.image +
      ')!important;background-repeat:no-repeat;background-size:' +
      coverSprite.backgroundSize +
      ';background-position:' +
      (positions.backInside || positions.back) +
      '!important}' +
      '.sj-book .p' +
      totalPages +
      '{background-color:white;background-image:url(' +
      coverSprite.image +
      ')!important;background-repeat:no-repeat;background-size:' +
      coverSprite.backgroundSize +
      ';background-position:' +
      positions.backOuter +
      '!important}';
    document.head.appendChild(spriteCSS);
    return spriteCSS;
  }

  /**
   * 创建整书页面缓存管理器实例。
   *
   * @param {Object} [options] 配置选项
   * @param {string} [options.tocTitle='目录'] 目录标题文字
   * @param {Object} [options.coverSprite] 封面精灵图设置
   * @returns {Object} 包含分页驱动、缓存读写与 URL 映射解析的页面缓存对象
   */
  function createBookPageCache(options) {
    var pageCache = {};
    var paginated = false;
    var tocTitle = (options && options.tocTitle) || '目录';
    var coverSprite = getCoverSprite(options);
    var articleToPage = {};
    var pageToArticle = {};
    var paginationResult = null;
    var backCoverStyle = null;

    var metadata = {
      documentTitle:
        (options && (options.documentTitle || options.title)) || '志民的博客',
      subtitle:
        (options && options.subtitle) || '文字留住瞬间 · 技术笔记与生活随笔',
      author: (options && options.author) || '志民',
      year: (options && options.year) || new Date().getFullYear(),
    };

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
      articleToPage = {};
      pageToArticle = {};
      paginationResult = null;
      if (backCoverStyle) backCoverStyle.remove();
      backCoverStyle = null;
    }

    /**
     * 对全书文章执行正文测量、有界目录校准和缓存提交：
     * 第一阶段：各文章独立排版，以假定起始物理页（7）预估各篇跨度；
     * 第二阶段：根据目录页数重建链接，最多校准 8 轮；循环或预算耗尽时抛错，不提交新状态；
     * 第三阶段：提交前置特殊页（扉页正反面）、动态目录页（罗马页码）、正文页（从 1 计数）与封底闭合。
     *
     * @param {Array<{title: string, bodyHTML: string, key?: string}>} articles 待分页的文章数据数组
     * @param {any} [_initialTOC] 保留参数
     * @returns {{totalPages: number, backPage: number, articleStart: number, bodyStart: number, pageCache: Object, articleToPage: Object, pageToArticle: Object}}
     */
    function paginateAll(articles, _initialTOC) {
      if (paginated) {
        return paginationResult;
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
        tocItems +=
          '<li><a href="#page/' +
          articleStarts[a] +
          '">' +
          articles[a].title +
          ' <span>' +
          articleStarts[a] +
          '</span></a></li>';
      }
      var tocHTML =
        '<div class="table-contents"><h1>' +
        tocTitle +
        '</h1><ul>' +
        tocItems +
        '</ul></div><span class="page-number">i</span>';
      var tocLen = window.BookRuntime.Paginator.paginateTOC(tocHTML).length;

      // ── Step 3: calibrate final TOC before committing cache or DOM ──
      // With stable resources, a repeated candidate indicates a cycle.
      // Eight rounds bound work; they are not a convergence guarantee.
      var seenTOCLengths = new Set();
      var tocPages;
      var shift;
      var bodyStart;
      var tocStable = false;
      for (var round = 0; round < 8; round++) {
        if (seenTOCLengths.has(tocLen)) {
          throw new Error('TOC calibration did not converge: cycle');
        }
        seenTOCLengths.add(tocLen);
        shift = 5 + tocLen - 7;
        bodyStart = 5 + tocLen;
        tocItems = '';
        for (var a = 0; a < articles.length; a++) {
          var phys = articleStarts[a] + shift;
          var disp = phys - bodyStart + 1;
          var key = articles[a].key || '';
          tocItems +=
            '<li><a href="?post=' +
            key +
            '" data-page="' +
            phys +
            '">' +
            articles[a].title +
            ' <span>' +
            disp +
            '</span></a></li>';
        }
        tocHTML =
          '<div class="table-contents"><h1>' +
          tocTitle +
          '</h1><ul>' +
          tocItems +
          '</ul></div><span class="page-number">i</span>';
        tocPages = window.BookRuntime.Paginator.paginateTOC(tocHTML);
        if (tocPages.length === tocLen) {
          tocStable = true;
          break;
        }
        tocLen = tocPages.length;
      }
      if (!tocStable) {
        throw new Error('TOC calibration did not converge: 8 rounds exceeded');
      }

      // ── Step 4: store Front Special Pages (Pages 3-4) & TOC pages (Roman numeral footer) ──
      // Physical Page 3: Title Page (扉页正面，典雅书名、作者、题记，不显示页码)
      pageCache[3] = renderTitlePage(metadata);
      // Physical Page 4: Imprint / Colophon (扉页反面 / 版权页，出版信息与版权声明，不显示页码)
      pageCache[4] = renderImprintPage(metadata);

      // TOC Pages: Physical Page 5 ~ 4 + N (动态 N 页，罗马数字页码，不计入正文统计)
      pg = 5;
      for (var tp = 0; tp < tocPages.length; tp++) {
        var romanNum = toRoman(tp + 1);
        var pageHTML = tocPages[tp];
        if (pageHTML.indexOf('<span class="toc-pn">0</span>') !== -1) {
          pageHTML = pageHTML.replace(
            '<span class="toc-pn">0</span>',
            '<span class="page-number">' + romanNum + '</span>',
          );
        } else if (pageHTML.indexOf('<span class="page-number">') !== -1) {
          pageHTML = pageHTML.replace(
            /<span class="page-number">[^<]*<\/span>/,
            '<span class="page-number">' + romanNum + '</span>',
          );
        } else {
          pageHTML += '<span class="page-number">' + romanNum + '</span>';
        }
        pageCache[pg] = pageHTML;
        pg++;
      }

      // ── Step 5: store Body Pages (Arabic footer strictly counting 1 to M) ──
      // 正文页是全书唯一参与页码统计的页面，从 1 线性递增至 totalBodyPages
      var totalBodyPages = 0;
      for (var a = 0; a < articleCache.length; a++) {
        var pages = articleCache[a];
        for (var p = 0; p < pages.length; p++) {
          totalBodyPages++;
          pageCache[pg] = pages[p].replace(
            '<span class="page-number">0</span>',
            '<span class="page-number">' + totalBodyPages + '</span>',
          );
          pg++;
        }
      }
      var bodyEnd = pg - 1;

      // ── Step 6: Back Special Pages & Parity Closure ──
      // 翻页组件要求左右展开的两页为一个完整物理叶片，因此整书总页数必须为偶数。
      // 若正文结束页码 bodyEnd 为偶数，最后正文页位于左侧，右侧即为封三 (pg, 奇数)，封底为 pg + 1 (偶数)。
      // 若 bodyEnd 为奇数，最后正文页位于右侧，需在左侧追加 1 页尾衬页 (pg, 偶数)，封三为 pg + 1 (奇数)，封底为 pg + 2 (偶数)。
      var totalPages;
      var backPage;
      if (bodyEnd % 2 === 0) {
        totalPages = pg + 1;
        backPage = totalPages - 1;
      } else {
        pageCache[pg] = renderAlignmentEndpaper();
        totalPages = pg + 2;
        backPage = totalPages - 1;
      }

      // 预填充封底内页与封底外壳，均为特殊页面，不显示正文页码
      pageCache[backPage] =
        '<div class="book-content special-page back-inside-page"></div>';
      pageCache[totalPages] =
        '<div class="book-content special-page back-cover-page"></div>';

      // Update back-cover DOM.
      var oldBack = document.querySelector('.sj-book .back-side');
      var oldOuter = oldBack ? oldBack.nextElementSibling : null;
      if (oldBack) {
        oldBack.className = oldBack.className.replace(/p\d+/, 'p' + backPage);
      }
      if (oldOuter) {
        oldOuter.className = oldOuter.className.replace(
          /p\d+/,
          'p' + totalPages,
        );
      }

      // ── Build article ↔ page maps for ?post= URL navigation ──
      articleToPage = {};
      pageToArticle = {};
      for (var a = 0; a < articles.length; a++) {
        var phys = articleStarts[a] + shift;
        var key = articles[a].key;
        var pageCount = articleCache[a].length;
        if (key) {
          articleToPage[key] = phys;
          for (var p = 0; p < pageCount; p++) {
            pageToArticle[phys + p] = key;
          }
        }
      }

      backCoverStyle = injectBackCoverCSS(backPage, totalPages, coverSprite);

      paginated = true;

      var layoutInfo = {
        totalPages: totalPages,
        backPage: backPage,
        bodyStart: bodyStart,
        bodyEnd: bodyEnd,
        totalBodyPages: totalBodyPages,
        tocPagesCount: tocPages.length,
        hasAlignmentEndpaper: bodyEnd % 2 !== 0,
      };

      paginationResult = {
        totalPages: totalPages,
        backPage: backPage,
        articleStart: bodyStart,
        bodyStart: bodyStart,
        pageCache: pageCache,
        articleToPage: articleToPage,
        pageToArticle: pageToArticle,
      };

      // 挂载非枚举属性以保证 Object.keys(paginationResult) 严格保持旧版 7 字段兼容
      Object.defineProperties(paginationResult, {
        totalBodyPages: {
          value: totalBodyPages,
          writable: true,
          configurable: true,
          enumerable: false,
        },
        bodyEnd: {
          value: bodyEnd,
          writable: true,
          configurable: true,
          enumerable: false,
        },
        tocPagesCount: {
          value: tocPages.length,
          writable: true,
          configurable: true,
          enumerable: false,
        },
        hasAlignmentEndpaper: {
          value: bodyEnd % 2 !== 0,
          writable: true,
          configurable: true,
          enumerable: false,
        },
        layout: {
          value: layoutInfo,
          writable: true,
          configurable: true,
          enumerable: false,
        },
        getPageKind: {
          value: function (page) {
            return getPageKind(page, layoutInfo);
          },
          writable: true,
          configurable: true,
          enumerable: false,
        },
        isSpecialPage: {
          value: function (page) {
            return isSpecialPage(page, layoutInfo);
          },
          writable: true,
          configurable: true,
          enumerable: false,
        },
        isCountedPage: {
          value: function (page) {
            return isCountedPage(page, layoutInfo);
          },
          writable: true,
          configurable: true,
          enumerable: false,
        },
        physicalToBodyPage: {
          value: function (page) {
            return physicalToBodyPage(page, layoutInfo);
          },
          writable: true,
          configurable: true,
          enumerable: false,
        },
        bodyToPhysicalPage: {
          value: function (bodyPage) {
            return bodyToPhysicalPage(bodyPage, layoutInfo);
          },
          writable: true,
          configurable: true,
          enumerable: false,
        },
      });

      return paginationResult;
    }

    function getPageLayout() {
      return paginationResult ? paginationResult.layout : null;
    }

    return {
      getPageContent: getPageContent,
      isPaginated: isPaginated,
      paginateAll: paginateAll,
      reset: reset,
      setPageContent: setPageContent,
      getArticleToPage: function () {
        return articleToPage;
      },
      getPageToArticle: function () {
        return pageToArticle;
      },
      getPageLayout: getPageLayout,
      getPageKind: function (page) {
        return getPageKind(page, getPageLayout());
      },
      isSpecialPage: function (page) {
        return isSpecialPage(page, getPageLayout());
      },
      isCountedPage: function (page) {
        return isCountedPage(page, getPageLayout());
      },
      physicalToBodyPage: function (page) {
        return physicalToBodyPage(page, getPageLayout());
      },
      bodyToPhysicalPage: function (bodyPage) {
        return bodyToPhysicalPage(bodyPage, getPageLayout());
      },
    };
  }

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.Orchestrator = {
    createPageCache: createBookPageCache,
    toRoman: toRoman,
    PAGE_KIND: PAGE_KIND,
    getPageKind: getPageKind,
    isSpecialPage: isSpecialPage,
    isCountedPage: isCountedPage,
    physicalToBodyPage: physicalToBodyPage,
    bodyToPhysicalPage: bodyToPhysicalPage,
    renderTitlePage: renderTitlePage,
    renderImprintPage: renderImprintPage,
    renderAlignmentEndpaper: renderAlignmentEndpaper,
  };
})();
