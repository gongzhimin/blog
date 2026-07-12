/**
 * cursor-dot.js — custom cursor dot, self-contained.
 *
 * Creates a .cursor-dot element and a .cursor-tooltip label.
 * Hover can be disabled with data-cursor-hover="false" or scoped to
 * navigation with data-cursor-hover="nav". No dependencies.
 */
(function () {
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(dot);

  var tooltip = document.createElement('div');
  tooltip.className = 'cursor-tooltip';
  tooltip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tooltip);

  function cssNumber(name, fallback) {
    var raw = window.getComputedStyle
      ? window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
      : '';
    var value = parseFloat(raw);
    return Number.isFinite ? (Number.isFinite(value) ? value : fallback) : (isNaN(value) ? fallback : value);
  }

  var hoverMode = document.body.getAttribute('data-cursor-hover') || 'all';
  var HOVER = hoverMode !== 'false';
  var baseHalf = cssNumber('--cursor-dot-size', 24) / 2;
  var hoverScale = cssNumber('--cursor-dot-hover-scale', 1.5);
  var half = baseHalf;
  var hoverHalf = baseHalf * hoverScale;
  var pendingX = 0;
  var pendingY = 0;
  var pendingTarget = null;
  var rafQueued = false;
  var hidden = true;
  var foldSafe = false;
  var foldSafeUntil = 0;
  var CORNER_SUPPRESS_SIZE = 110;
  var CORNER_SUPPRESS_COOLDOWN_MS = 900;
  var book = null;
  var bookRect = null;
  var raf = window.requestAnimationFrame || function (callback) {
    return window.setTimeout(callback, 16);
  };

  dot.classList.add('is-hidden');
  tooltip.classList.add('is-hidden');

  /* ── Host relocation (nav z-index) ──────────────────────────── */

  function placeInHost(host) {
    var targetHost = host || document.body;
    if (dot.parentNode !== targetHost) targetHost.appendChild(dot);
    if (tooltip.parentNode !== targetHost) targetHost.appendChild(tooltip);
  }

  function hostForTarget(target) {
    return target && target.closest ? target.closest('.site-nav, .site-topbar') : null;
  }

  var _hostCache = null;
  var _hostRects = null;

  function refreshHostCache() {
    _hostCache = document.querySelectorAll('.site-nav, .site-topbar');
    _hostRects = [];
    for (var i = 0; i < _hostCache.length; i++) {
      _hostRects.push(_hostCache[i].getBoundingClientRect());
    }
  }

  function invalidateHostCache() { _hostCache = null; _hostRects = null; }

  function refreshBookRect() {
    if (!book || !book.isConnected) book = document.querySelector('.sj-book');
    bookRect = book && book.getBoundingClientRect ? book.getBoundingClientRect() : null;
  }

  function invalidateBookRect() { bookRect = null; }

  function hostForPoint(target, x, y) {
    var directHost = hostForTarget(target);
    if (directHost) return directHost;
    if (!_hostCache) refreshHostCache();
    for (var i = 0; i < _hostRects.length; i++) {
      var r = _hostRects[i];
      if (r && x + half >= r.left && x - half <= r.right &&
          y + half >= r.top && y - half <= r.bottom) {
        return _hostCache[i];
      }
    }
    return null;
  }

  function inBookCorner(x, y) {
    if (!bookRect) refreshBookRect();
    var rect = bookRect;
    if (!rect) return false;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return false;

    var nearX = (x - rect.left) <= CORNER_SUPPRESS_SIZE ||
      (rect.right - x) <= CORNER_SUPPRESS_SIZE;
    var nearY = (y - rect.top) <= CORNER_SUPPRESS_SIZE ||
      (rect.bottom - y) <= CORNER_SUPPRESS_SIZE;

    return nearX && nearY;
  }

  /* ── Visibility ─────────────────────────────────────────────── */

  function clearHover() {
    dot.classList.remove('hover-link');
    half = baseHalf;
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function setFoldSafe(on) {
    if (foldSafe === on) return;
    foldSafe = on;
    if (on) clearHover();
  }

  function setHidden(on) {
    if (hidden === on) return;
    hidden = on;
    dot.classList.toggle('is-hidden', on);
    tooltip.classList.toggle('is-hidden', on);
    if (on) setHover(null);
  }

  function hideCursor() {
    setHidden(true);
    setFoldSafe(false);
    setHover(null);
  }

  /* ── Hover ──────────────────────────────────────────────────── */

  function labelFor(el) {
    if (!el) return '';
    return (
      el.getAttribute('data-cursor-label') ||
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      (el.textContent || '').trim()
    );
  }

  function interactiveTarget(target) {
    if (!target || !target.closest) return null;
    var el = target.closest('[data-cursor-label], a, button, [role="button"]');
    if (!el) return null;
    if (el.closest('.table-contents')) return null;
    if (hoverMode === 'nav' &&
        !el.closest('.site-nav, .site-topbar') &&
        !el.hasAttribute('data-cursor-label')) {
      return null;
    }
    return el;
  }

  function tooltipAllowed(el) {
    return Boolean(el && !el.closest('.table-contents'));
  }

  function setHover(el) {
    if (foldSafe) {
      clearHover();
      return;
    }

    if (el) {
      var label = labelFor(el);
      dot.classList.add('hover-link');
      half = hoverHalf;
      if (label && tooltipAllowed(el)) {
        tooltip.textContent = label;
        tooltip.classList.add('is-visible');
        tooltip.setAttribute('aria-hidden', 'false');
      } else {
        tooltip.classList.remove('is-visible');
        tooltip.setAttribute('aria-hidden', 'true');
      }
    } else {
      clearHover();
    }
  }

  /* ── Positioning ────────────────────────────────────────────── */

  function tick() {
    rafQueued = false;
    setHidden(false);
    placeInHost(hostForPoint(pendingTarget, pendingX, pendingY));
    dot.style.setProperty('--cx', pendingX + 'px');
    dot.style.setProperty('--cy', pendingY + 'px');
    tooltip.style.transform = 'translate3d(' + (pendingX + 18) + 'px, ' + (pendingY + 18) + 'px, 0)';
  }

  function scheduleTick() {
    if (rafQueued) return;
    rafQueued = true;
    raf(tick);
  }

  /* ── Event binding ──────────────────────────────────────────── */

  document.addEventListener('mousemove', function (e) {
    pendingX = e.clientX;
    pendingY = e.clientY;
    pendingTarget = e.target;

    if (inBookCorner(e.clientX, e.clientY)) {
      foldSafeUntil = Date.now() + CORNER_SUPPRESS_COOLDOWN_MS;
      setFoldSafe(true);
      scheduleTick();
      return;
    }

    if (Date.now() < foldSafeUntil) {
      setFoldSafe(true);
      scheduleTick();
      return;
    }

    setFoldSafe(false);
    scheduleTick();
  });

  document.addEventListener('mouseleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  window.addEventListener('resize', function () { invalidateHostCache(); invalidateBookRect(); });
  window.addEventListener('scroll', invalidateHostCache, true);

  if (HOVER) {
    document.addEventListener('mouseover', function (e) {
      placeInHost(hostForPoint(e.target, e.clientX, e.clientY));
      setHover(interactiveTarget(e.target));
    });

    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget) {
        setHover(null);
      }
    });
  }
})();
