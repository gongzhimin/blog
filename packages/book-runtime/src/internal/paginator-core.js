/**
 * paginator-core.js — shared measurement helpers for the runtime paginator.
 */
(function () {
  var paginationConfig = {
    articleWidth: 380,
    articleHeight: 471,
    tocWidth: 380,
    tocHeight: 400,
    articleCSS: '',
    tocCSS: '',
  };

  /**
   * 合并更新运行时测量配置。
   *
   * @param {Object} [options]
   */
  function configure(options) {
    options = options || {};
    if (options.articleWidth)
      paginationConfig.articleWidth = options.articleWidth;
    if (options.articleHeight)
      paginationConfig.articleHeight = options.articleHeight;
    if (options.tocWidth) paginationConfig.tocWidth = options.tocWidth;
    if (options.tocHeight) paginationConfig.tocHeight = options.tocHeight;
    if (typeof options.articleCSS === 'string')
      paginationConfig.articleCSS = options.articleCSS;
    if (typeof options.tocCSS === 'string')
      paginationConfig.tocCSS = options.tocCSS;
  }

  /**
   * 获取当前生效的测量参数浅拷贝对象。
   *
   * @returns {typeof paginationConfig}
   */
  function getConfig() {
    return {
      articleWidth: paginationConfig.articleWidth,
      articleHeight: paginationConfig.articleHeight,
      tocWidth: paginationConfig.tocWidth,
      tocHeight: paginationConfig.tocHeight,
      articleCSS: paginationConfig.articleCSS,
      tocCSS: paginationConfig.tocCSS,
    };
  }

  /**
   * 创建用于离屏测量的隔离 DOM 节点。
   *
   * 不变量约束：必须将 inner 容器的几何严格固定为目标宽高，防止测量抖动。
   * 调用方在使用完毕后必须显式调用 measure.remove() 释放内存。
   *
   * @param {{width: number, height: number, css: string, innerId: string}} options
   * @returns {{measure: HTMLDivElement, inner: HTMLElement}}
   */
  function createMeasureContainer(options) {
    var measure = document.createElement('div');
    measure.style.cssText =
      'position:absolute;opacity:0;width:' +
      options.width +
      'px;top:0;left:0;pointer-events:none';
    measure.innerHTML =
      '<style>' +
      options.css +
      '</style><div id="' +
      options.innerId +
      '"></div>';
    document.body.appendChild(measure);

    var inner = measure.querySelector('[id]');
    inner.style.height = options.height + 'px';
    inner.style.width = options.width + 'px';

    return {
      measure: measure,
      inner: inner,
    };
  }

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.PaginatorCore = {
    configure: configure,
    createMeasureContainer: createMeasureContainer,
    getConfig: getConfig,
  };
})();
