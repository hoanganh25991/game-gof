/*!
 * lock-zoom.js
 * Prevent pinch-zoom and double-tap zoom on mobile (esp. iOS/Safari)
 * Uses a comprehensive approach with viewport meta, universal CSS, and event listeners.
 */
(function () {
  'use strict';

  // 1. Ensure proper viewport meta tag exists
  function ensureViewportMeta() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    // Set comprehensive viewport settings to prevent zoom
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  }

  // 2. Apply universal CSS to prevent double-tap zoom on ALL elements
  function applyUniversalCSS() {
    try {
      const style = document.createElement('style');
      style.id = 'lock-zoom-style';
      style.textContent = `
        * {
          -webkit-tap-highlight-color: rgba(0,0,0,0);
          touch-action: manipulation;
          -ms-touch-action: manipulation;
        }
        
        /* Additional security for specific interactive elements */
        button, a, input, select, textarea, [role="button"] {
          touch-action: manipulation !important;
        }
      `;
      document.head.appendChild(style);
    } catch (e) {
      console.warn('Failed to apply lock-zoom CSS:', e);
    }
  }

  // 3. Prevent double-tap zoom via touch events
  function preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    
    document.addEventListener('touchend', function (event) {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
  }

  // 4. Prevent pinch-zoom via gesture events (iOS)
  function preventPinchZoom() {
    // Prevent gesturestart event (iOS pinch-zoom)
    document.addEventListener('gesturestart', function (event) {
      event.preventDefault();
    }, { passive: false });

    // Prevent touchmove with multiple touches (Android pinch-zoom)
    document.addEventListener('touchmove', function (event) {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    }, { passive: false });
  }

  // 5. Prevent wheel/scroll zoom (desktop + some mobile browsers)
  function preventWheelZoom() {
    document.addEventListener('wheel', function (event) {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    }, { passive: false });
  }

  // Initialize all zoom prevention measures
  function init() {
    ensureViewportMeta();
    applyUniversalCSS();
    preventDoubleTapZoom();
    preventPinchZoom();
    preventWheelZoom();
  }

  // Run immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
