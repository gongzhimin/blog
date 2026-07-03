/**
 * paginator-core.js — shared measurement helpers for the runtime paginator.
 */
(function () {
  var paginationConfig = {
    articleWidth: 380,
    articleHeight: 471,
    tocWidth: 380,
    tocHeight: 400
  };

  function configure(options) {
    options = options || {};
    if (options.articleWidth) paginationConfig.articleWidth = options.articleWidth;
    if (options.articleHeight) paginationConfig.articleHeight = options.articleHeight;
    if (options.tocWidth) paginationConfig.tocWidth = options.tocWidth;
    if (options.tocHeight) paginationConfig.tocHeight = options.tocHeight;
  }

  function getConfig() {
    return {
      articleWidth: paginationConfig.articleWidth,
      articleHeight: paginationConfig.articleHeight,
      tocWidth: paginationConfig.tocWidth,
      tocHeight: paginationConfig.tocHeight
    };
  }

  function createMeasureContainer(options) {
    var measure = document.createElement('div');
    measure.style.cssText = 'position:absolute;opacity:0;width:' + options.width + 'px;top:0;left:0;pointer-events:none';
    measure.innerHTML = '<style>' + options.css + '</style><div id="' + options.innerId + '"></div>';
    document.body.appendChild(measure);

    var inner = document.getElementById(options.innerId);
    inner.style.height = options.height + 'px';
    inner.style.width = options.width + 'px';

    return {
      measure: measure,
      inner: inner
    };
  }

  window.BookRuntime = window.BookRuntime || {};
  window.BookRuntime.PaginatorCore = {
    configure: configure,
    createMeasureContainer: createMeasureContainer,
    getConfig: getConfig
  };
})();
