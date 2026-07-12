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

  var half = 12;

  function setHover(on) {
    if (on) { dot.classList.add('hover-link'); half = 18; }
    else    { dot.classList.remove('hover-link'); half = 12; }
  }

  document.addEventListener('mousemove', function (e) {
    dot.style.transform = 'translate(' + (e.clientX - half) + 'px, ' + (e.clientY - half) + 'px)';
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

})();
