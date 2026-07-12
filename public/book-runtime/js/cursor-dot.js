/**
 * cursor-dot.js — custom cursor dot, self-contained.
 *
 * Creates a .cursor-dot element, tracks mouse with RAF + easing,
 * and toggles .hover-link when hovering over interactive elements.
 * No dependencies.  Include this script on any page that wants the dot.
 */
(function () {
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(dot);

  var x = 0, y = 0, rx = 0, ry = 0, half = 24;

  function setHover(on) {
    if (on) { dot.classList.add('hover-link'); half = 32; }
    else    { dot.classList.remove('hover-link'); half = 24; }
  }

  document.addEventListener('mousemove', function (e) {
    x = e.clientX;
    y = e.clientY;
  });

  document.addEventListener('mouseover', function (e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.tagName === 'A' || el.tagName === 'BUTTON' ||
          (el.closest && el.closest('a, button'))) {
        setHover(true);
        return;
      }
      el = el.parentNode;
    }
    setHover(false);
  });

  (function tick() {
    rx += (x - rx) * 0.25;
    ry += (y - ry) * 0.25;
    dot.style.transform = 'translate(' + (rx - half) + 'px, ' + (ry - half) + 'px)';
    requestAnimationFrame(tick);
  })();
})();
