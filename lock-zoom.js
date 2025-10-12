/*!
 * lock-zoom.js
 * Prevent pinch-zoom and double-tap zoom on mobile (esp. iOS/Safari)
 * Also reduces double-tap zoom triggers on common interactive UI elements.
 */
(function () {
  'use strict';

  // Reduce double-tap zoom triggers on interactive UI
  try {
    var style = document.createElement('style');
    style.id = 'lock-zoom-style';
    style.textContent =
      "html, body, canvas, #ui-root, #skillWheel, button, .icon-btn, .skill-btn, #bottomLeftGroup button { -webkit-tap-highlight-color: rgba(0,0,0,0); touch-action: manipulation; -ms-touch-action: manipulation; }";
    document.head.appendChild(style);
  } catch (e2) {}
})();
