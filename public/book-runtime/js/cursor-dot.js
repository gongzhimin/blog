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
  var lastX = 0;
  var lastY = 0;
  var desiredX = 0;
  var desiredY = 0;
  var rafPending = false;
  var CORNER_SUPPRESS_SIZE = 110;
  var CORNER_SUPPRESS_COOLDOWN_MS = 900;
  var foldSafeUntil = 0;
  var foldSafe = false;
  var hidden = true;
  var book = null;
  var bookRect = null;
  var raf = window.requestAnimationFrame || function (callback) {
    return window.setTimeout(callback, 16);
  };

  dot.classList.add('is-hidden');
  tooltip.classList.add('is-hidden');

  function placeInHost(host) {
    var targetHost = host || document.body;
    if (dot.parentNode !== targetHost) targetHost.appendChild(dot);
    if (tooltip.parentNode !== targetHost) targetHost.appendChild(tooltip);
  }

  function hostForTarget(target) {
    return target && target.closest ? target.closest('.site-nav, .site-topbar') : null;
  }

  function circleIntersectsRect(x, y, rect) {
    return rect &&
      x + half >= rect.left &&
      x - half <= rect.right &&
      y + half >= rect.top &&
      y - half <= rect.bottom;
  }

  function hostForPoint(target, x, y) {
    var directHost = hostForTarget(target);
    if (directHost) return directHost;

    var hosts = document.querySelectorAll('.site-nav, .site-topbar');
    for (var i = 0; i < hosts.length; i++) {
      if (hosts[i].getBoundingClientRect &&
          circleIntersectsRect(x, y, hosts[i].getBoundingClientRect())) {
        return hosts[i];
      }
    }
    return null;
  }

  function refreshBookRect() {
    if (!book || !book.isConnected) book = document.querySelector('.sj-book');
    bookRect = book && book.getBoundingClientRect ? book.getBoundingClientRect() : null;
  }

  function invalidateBookRect() {
    bookRect = null;
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

  function clearHover() {
    dot.classList.remove('hover-link');
    half = 12;
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function setFoldSafe(on) {
    if (foldSafe === on) return;
    foldSafe = on;
    if (on) {
      clearHover();
    }
  }

  function setHidden(on) {
    if (hidden === on) return;
    hidden = on;
    dot.classList.toggle('is-hidden', on);
    tooltip.classList.toggle('is-hidden', on);
    if (on) {
      clearHover();
    }
  }

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

  function writePosition() {
    rafPending = false;
    dot.style.setProperty('--cx', desiredX + 'px');
    dot.style.setProperty('--cy', desiredY + 'px');
    tooltip.style.transform = 'translate3d(' + (desiredX + 18) + 'px, ' + (desiredY + 18) + 'px, 0)';
  }

  function move(x, y) {
    lastX = x;
    lastY = y;
    desiredX = x;
    desiredY = y;
    if (rafPending) return;
    rafPending = true;
    raf(writePosition);
  }

  function setHover(el) {
    if (foldSafe) {
      clearHover();
      return;
    }

    var label = labelFor(el);
    if (el) {
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
    move(lastX, lastY);
  }

  function hideCursor() {
    setHidden(true);
    setFoldSafe(false);
    setHover(null);
  }

  document.addEventListener('mousemove', function (e) {
    placeInHost(hostForPoint(e.target, e.clientX, e.clientY));
    setHidden(false);

    if (inBookCorner(e.clientX, e.clientY)) {
      foldSafeUntil = Date.now() + CORNER_SUPPRESS_COOLDOWN_MS;
      setFoldSafe(true);
      move(e.clientX, e.clientY);
      return;
    }

    if (Date.now() < foldSafeUntil) {
      setFoldSafe(true);
      move(e.clientX, e.clientY);
      return;
    }

    setFoldSafe(false);
    move(e.clientX, e.clientY);
  });

  document.addEventListener('mouseleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  window.addEventListener('resize', invalidateBookRect);
  window.addEventListener('scroll', invalidateBookRect, true);

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
