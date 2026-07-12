/**
 * cursor-dot.js — custom cursor dot, self-contained.
 *
 * Creates a .cursor-dot element and tracks mouse position.
 * Hover on links/buttons is enabled unless <body> has
 * data-cursor-hover="false".  No dependencies.
 */
(function () {
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(dot);

  var HOVER = document.body.getAttribute('data-cursor-hover') !== 'false';
  var half = 12;
  var hoverHalf = 18;

  function setHover(on) {
    if (on) { dot.classList.add('hover-link'); half = hoverHalf; }
    else    { dot.classList.remove('hover-link'); half = 12; }
  }

  document.addEventListener('mousemove', function (e) {
    dot.style.transform = 'translate(' + (e.clientX - half) + 'px, ' + (e.clientY - half) + 'px)';
  });

  if (HOVER) {
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
  }
})();
