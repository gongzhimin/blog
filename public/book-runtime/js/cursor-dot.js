/**
 * cursor-dot.js — custom cursor dot, self-contained.
 *
 * Creates a .cursor-dot element and tracks mouse position.
 * Hover effects are handled by page-level CSS via :has().
 * No dependencies.  Include this script on any page that wants the dot.
 */
(function () {
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;

  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(dot);

  var half = 12;

  document.addEventListener('mousemove', function (e) {
    dot.style.transform = 'translate(' + (e.clientX - half) + 'px, ' + (e.clientY - half) + 'px)';
  });
})();
