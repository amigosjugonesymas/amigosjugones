/**
 * ============================================================================
 * AMIGOS JUGONES — REGISTRADOR PWA & SERVICE WORKER
 * ============================================================================
 */
(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('./sw.js')
        .then(function (reg) {
          console.log('[PWA] Service Worker activo. Ámbito:', reg.scope);

          // Escuchar si hay una actualización pendiente
          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', function () {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nueva versión del sitio lista. Se aplicará al recargar.');
                }
              });
            }
          });
        })
        .catch(function (err) {
          console.warn('[PWA] Registro de Service Worker omitido:', err);
        });
    });
  }
})();

