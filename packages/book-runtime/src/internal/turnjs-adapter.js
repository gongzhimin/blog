/**
 * @file turnjs-adapter.js — 第三方 Turn.js 翻页引擎与 jQuery UI 滑块交互适配器。
 *
 * 核心职能：
 * 1. 隔离老旧 jQuery / Turn.js 插件的 DOM 操作与生命周期；
 * 2. 统一管理按需挂载页面（addPage）、伪随机纸张纹理（Paper Texture）与书脊厚度阴影（Depth）；
 * 3. 适配双页（桌面端）与单页（移动端）的视图索引换算（numberOfViews / getViewNumber）；
 * 4. 驱动缩放平移手势、底部滑动条（Slider）与快捷键导航。
 */
(function () {
  /**
   * 基于正弦波与大质数乘积的轻量伪随机数生成器。
   * 为指定页码与盐值生成 [0, 1) 区间内确定性分布的散列值。
   *
   * @param {number} page 物理页号
   * @param {number} salt 随机因子
   * @returns {number} 0 到 1 之间的散列浮点数
   */
  function paperHash(page, salt) {
    var value =
      Math.sin(page * (12.9898 + salt) + salt * 78.233) * 43758.5453123;
    return value - Math.floor(value);
  }

  /**
   * 根据页码计算该页唯一的纸张底纹裁剪偏移百分比。
   * 不变量：同一页码计算出的 x, y 坐标严格确定，重新打开或翻页时保持一致，模拟真实纸张质感。
   *
   * @param {number} page 物理页号
   * @returns {{x: number, y: number}} 百分比坐标对象
   */
  function paperCropForPage(page) {
    var safePage = Math.max(1, parseInt(page, 10) || 1);
    return {
      x: Math.round((5 + paperHash(safePage, 1) * 90) * 100) / 100,
      y: Math.round((5 + paperHash(safePage, 2) * 90) * 100) / 100,
    };
  }

  /**
   * 构造 Turn.js 与 jQuery UI 翻页交互适配器实例。
   *
   * @param {Object} options 翻页适配参数
   * @param {string} [options.bookSelector='.sj-book'] 书籍主容器选择器
   * @param {string} [options.zoomSelector='#book-zoom'] 缩放包裹容器选择器
   * @param {string} [options.sliderSelector='#slider'] 翻页进度滑块选择器
   * @param {string} [options.canvasSelector='#canvas'] 居中画布容器选择器
   * @param {{width: number, height: number}} options.contentPage 正文单页尺寸参数
   * @param {number} options.totalPages 全书偶数闭合总物理页数
   * @param {number} [options.backPage] 封底内侧物理页号
   * @param {number} options.startPage 启动默认导航目标物理页号
   * @param {Object} [options.turnOptions] 透传给 Turn.js 的底层参数
   * @param {Object} [options.paperTexture] 纸张纹理参数
   * @param {Record<number, string>} [options.pageToArticle] 物理页号到文章 key 映射表
   * @param {boolean} [options.isMobile=false] 是否处于单页移动端模式
   * @param {() => void} options.ensurePaginated 确保分页缓存已就绪的回调
   * @param {(page: number) => string} options.getPageContent 检索指定物理页 HTML 内容的回调
   * @returns {Object} 具备 init, mount, turnTo, zoom 等方法的适配器接口
   */
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
    var getPageContent =
      options.getPageContent ||
      function () {
        return '';
      };
    var isTurning = false;
    var coverSettlementFrame = null;

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

      book.find('.own-size').each(function (index) {
        var element = $(this);
        var page = pageNumberFromClass(element) || index + 3;
        applyPaperCrop(element, page);
      });
    }

    function updateDepth(book, newPage) {
      var page = book.turn('page'),
        pages = book.turn('pages'),
        frontDepth = book.children('.book-depth--front'),
        backDepth = book.children('.book-depth--back'),
        maxDepth = 16,
        depthWidth = maxDepth * Math.min(1, (page * 2) / pages);
      newPage = newPage || page;
      if (newPage > 3)
        frontDepth.css({
          width: depthWidth,
          left: 20 - depthWidth,
          zIndex: pages + 1,
        });
      else frontDepth.css({ width: 0, zIndex: pages + 1 });
      depthWidth = maxDepth * Math.min(1, ((pages - page) * 2) / pages);
      if (newPage < pages - 3)
        backDepth.css({
          width: depthWidth,
          right: 20 - depthWidth,
          zIndex: pages + 1,
        });
      else backDepth.css({ width: 0, zIndex: pages + 1 });
    }

    function updateCoverUnderlays(book, newPage) {
      var page = newPage || book.turn('page'),
        pages = book.turn('pages');
      book.toggleClass('book-at-first', page <= 1);
      book.toggleClass('book-at-last', page >= pages);
    }

    function cancelCoverSettlement() {
      if (coverSettlementFrame !== null)
        cancelAnimationFrame(coverSettlementFrame);
      coverSettlementFrame = null;
    }

    // End/turned can precede the plugin removing its last moving page.
    // Observe actual motion completion; a one-shot timer can miss that transition.
    function settleCoverUnderlays(book) {
      cancelCoverSettlement();
      function observe() {
        coverSettlementFrame = null;
        if (!book[0].isConnected || !book.turn('is')) return;
        if (book.turn('animating')) {
          coverSettlementFrame = requestAnimationFrame(observe);
          return;
        }
        updateCoverUnderlays(book);
        updateDepth(book);
        $(sliderSelector).slider('value', getViewNumber(book));
      }
      observe();
    }

    /**
     * 按需向 Turn.js 挂载指定物理页的 DOM 节点。
     * 若页面未提前渲染，触发 ensurePaginated 并在缓存中检索 HTML，应用确定性纸张纹理后动态挂载至 Turn.js。
     *
     * @param {number} page 待加载的物理页号
     * @param {any} book jQuery 包装的书籍容器对象
     */
    function addPage(page, book) {
      if (!book.turn('hasPage', page)) {
        ensurePaginated();
        var content =
          getPageContent(page) ||
          '<div class="book-content"><p>&nbsp;</p></div><span class="page-number">' +
            page +
            '</span>';
        var pageCss = { width: contentPage.width, height: contentPage.height };
        var element = $('<div />', {
          class: 'own-size p' + page,
          css: pageCss,
        }).html(content);
        applyPaperCrop(element, page);
        book.turn('addPage', element, page);
      }
    }

    /**
     * 计算翻页视图（View）总数。
     * 规则：桌面端双页模式下一个 View 包含左右两页（页面总数除以 2 再加 1，含首封与末封各 1 视图）；
     * 移动端单页模式下一个 View 对应单页。
     *
     * @param {any} book
     * @returns {number} 视图总数
     */
    function numberOfViews(book) {
      return isMobile
        ? book.turn('pages')
        : Math.floor(book.turn('pages') / 2) + 1;
    }

    /**
     * 根据当前物理页号换算所属视图序号（View Number），用于底部进度条滑块映射。
     *
     * @param {any} book
     * @param {number} [page] 目标物理页号（缺省时读取当前活动页）
     * @returns {number} 视图序号（从 1 开始）
     */
    function getViewNumber(book, page) {
      return isMobile
        ? page || book.turn('page')
        : parseInt((page || book.turn('page')) / 2 + 1, 10);
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
      $(zoomSelector).mousewheel(function (_event, _delta, deltaX, _deltaY) {
        var data = $(this).data(),
          step = 30,
          flipbook = $(bookSelector),
          actualPos = $(sliderSelector).slider('value') * step;
        if (typeof data.scrollX == 'undefined') {
          data.scrollX = actualPos;
          data.scrollPage = flipbook.turn('page');
        }
        data.scrollX = Math.min(
          $(sliderSelector).slider('option', 'max') * step,
          Math.max(0, data.scrollX + deltaX),
        );
        var actualView = Math.round(data.scrollX / step),
          page = isMobile
            ? clampPageTarget(flipbook, actualView)
            : clampPageTarget(flipbook, actualView * 2 - 2);
        if ($.inArray(data.scrollPage, flipbook.turn('view', page)) == -1) {
          data.scrollPage = page;
          flipbook.turn('page', page);
        }
        if (data.scrollTimer) clearInterval(data.scrollTimer);
        data.scrollTimer = setTimeout(function () {
          data.scrollX = undefined;
          data.scrollPage = undefined;
          data.scrollTimer = undefined;
        }, 1000);
      });
    }

    function mountSlider() {
      $(sliderSelector).slider({
        min: 1,
        max: 100,
        start: function () {
          moveBar(false);
        },
        stop: function () {
          var book = $(bookSelector);
          var target = isMobile
            ? clampPageTarget(book, $(this).slider('value'))
            : clampPageTarget(book, $(this).slider('value') * 2 - 2);
          book.turn('page', target);
        },
      });
    }

    function mountHash() {
      Hash.on('^page\/([0-9]*)$', {
        yep: function (_path, parts) {
          var page = parts[1];
          if (page !== undefined) {
            if ($(bookSelector).turn('is')) $(bookSelector).turn('page', page);
          }
        },
        nop: function () {
          if ($(bookSelector).turn('is'))
            $(bookSelector).turn('page', startPage);
        },
      });
    }

    function mountKeyboard() {
      $(document).keydown(function (e) {
        var previous = 37,
          next = 39;
        switch (e.keyCode) {
          case previous:
            $(bookSelector).turn('previous');
            break;
          case next:
            $(bookSelector).turn('next');
            break;
        }
      });
    }

    function mountTouch() {
      if (!isMobile) return;

      var bookEl = document.querySelector(bookSelector);
      var touchEl = document.querySelector(zoomSelector) || bookEl;
      if (!bookEl || !touchEl) return;

      var startX = 0,
        startY = 0,
        lastX = 0,
        lastY = 0,
        startTime = 0,
        intent = null;
      var TAP_MAX_MOVE = 10;
      var TAP_MAX_TIME = 300;
      var SWIPE_MIN_DISTANCE = 56;
      var SWIPE_INTENT_DISTANCE = 12;

      function isInteractiveTouchTarget(target) {
        while (target && target !== touchEl) {
          if (
            target.tagName === 'A' ||
            target.tagName === 'BUTTON' ||
            target.id === 'slider-bar' ||
            target.id === 'slider'
          ) {
            return true;
          }
          target = target.parentNode;
        }
        return false;
      }

      touchEl.addEventListener(
        'touchstart',
        function (e) {
          if (e.touches.length !== 1) return;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          lastX = startX;
          lastY = startY;
          startTime = Date.now();
          intent = null;
        },
        { passive: true },
      );

      touchEl.addEventListener(
        'touchmove',
        function (e) {
          if (e.touches.length !== 1) return;
          lastX = e.touches[0].clientX;
          lastY = e.touches[0].clientY;

          var dx = lastX - startX;
          var dy = lastY - startY;
          var absX = Math.abs(dx);
          var absY = Math.abs(dy);

          if (!intent && Math.max(absX, absY) >= SWIPE_INTENT_DISTANCE) {
            intent = absX > absY * 1.25 ? 'horizontal' : 'vertical';
          }

          // Once the gesture is clearly horizontal, keep the page from scrolling.
          if (intent === 'horizontal') e.preventDefault();
        },
        { passive: false },
      );

      touchEl.addEventListener(
        'touchend',
        function (e) {
          var book = $(bookSelector);
          if (!book.turn('is') || isTurning) return;

          var dx =
            (e.changedTouches[0] ? e.changedTouches[0].clientX : startX) -
            startX;
          var dy =
            (e.changedTouches[0] ? e.changedTouches[0].clientY : startY) -
            startY;
          var absX = Math.abs(dx);
          var absY = Math.abs(dy);
          var moved = Math.sqrt(dx * dx + dy * dy);
          var elapsed = Date.now() - startTime;

          if (isInteractiveTouchTarget(e.target)) return;

          if (
            intent === 'horizontal' &&
            absX >= SWIPE_MIN_DISTANCE &&
            absX > absY * 1.25
          ) {
            if (dx < 0) book.turn('next');
            else book.turn('previous');
            return;
          }

          // Only handle taps after ruling out swipes.
          if (moved > TAP_MAX_MOVE || elapsed > TAP_MAX_TIME) return;

          // Left third → previous, right two-thirds → next.
          var relX =
            (e.changedTouches[0] || e.touches[0] || {}).clientX || startX;
          var rect = bookEl.getBoundingClientRect();
          var ratio = (relX - rect.left) / rect.width;

          if (ratio < 0.33) {
            book.turn('previous');
          } else if (ratio >= 0.4) {
            book.turn('next');
          }
        },
        { passive: true },
      );
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
          turning: function (_e, page) {
            var book = $(this);
            cancelCoverSettlement();
            book.removeClass('book-at-first book-at-last');
            updateDepth(book, page);
            if (page >= 2) $('.sj-book .p2').addClass('fixed');
            else $('.sj-book .p2').removeClass('fixed');
            if (page < book.turn('pages'))
              $('.sj-book .p' + backPage).addClass('fixed');
            else $('.sj-book .p' + backPage).removeClass('fixed');
            Hash.go('page/' + page).update();
          },
          turned: function (_event, page) {
            isTurning = false;
            var book = $(this);
            settleCoverUnderlays(book);
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
          start: function () {
            isTurning = true;
            cancelCoverSettlement();
            $(this).removeClass('book-at-first book-at-last');
            moveBar(true);
          },
          end: function () {
            isTurning = false;
            var book = $(this);
            updateDepth(book);
            settleCoverUnderlays(book);
            moveBar(false);
          },
          missing: function (_event, pages) {
            for (var i = 0; i < pages.length; i++) {
              addPage(pages[i], $(this));
            }
          },
        },
      });

      if (totalPages !== turnOptions.totalPages) {
        try {
          flipbook.turn('pages', totalPages);
        } catch (e) {}
      }

      $(sliderSelector).slider('option', 'max', numberOfViews(flipbook));
      applyInitialPaperCrops(flipbook);
      updateCoverUnderlays(flipbook);
      Hash.check().update();
      flipbook.addClass('animated');
      $(canvasSelector).css({ visibility: 'visible' });
    }

    function mountTocClicks() {
      $(zoomSelector).on('click', 'a[data-page]', function (e) {
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
      mountTouch();
      mountTocClicks();
      return true;
    }

    return {
      mount: mount,
      clampPageTarget: clampPageTarget,
    };
  }

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.TurnAdapter = {
    create: createTurnJsAdapter,
    paperCropForPage: paperCropForPage,
  };
})();
