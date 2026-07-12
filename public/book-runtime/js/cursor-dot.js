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

  var hoverMode = document.body.getAttribute('data-cursor-hover') || 'all';
  var HOVER = hoverMode !== 'false';
  var half = 12;
  var hoverHalf = 24;
  var desiredX = 0;
  var desiredY = 0;
  var rafPending = false;
  var hidden = true;
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

  /* ── Visibility ─────────────────────────────────────────────── */

  function setHidden(on) {
    if (hidden === on) return;
    hidden = on;
    dot.classList.toggle('is-hidden', on);
    tooltip.classList.toggle('is-hidden', on);
    if (on) setHover(null);
  }

  function hideCursor() {
    setHidden(true);
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
      dot.classList.remove('hover-link');
      half = 12;
      tooltip.classList.remove('is-visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }
  }

  /* ── Positioning ────────────────────────────────────────────── */

  function writePosition() {
    rafPending = false;
    dot.style.setProperty('--cx', desiredX + 'px');
    dot.style.setProperty('--cy', desiredY + 'px');
    tooltip.style.transform = 'translate3d(' + (desiredX + 18) + 'px, ' + (desiredY + 18) + 'px, 0)';
  }

  function move(x, y) {
    desiredX = x;
    desiredY = y;
    if (rafPending) return;
    rafPending = true;
    raf(writePosition);
  }

  /* ── Event binding ──────────────────────────────────────────── */

  document.addEventListener('mousemove', function (e) {
    placeInHost(hostForPoint(e.target, e.clientX, e.clientY));
    setHidden(false);
    move(e.clientX, e.clientY);
  });

  document.addEventListener('mouseleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  window.addEventListener('resize', invalidateHostCache);
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
