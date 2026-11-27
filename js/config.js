/**
 * ============================================================================
 * CONFIGURACIÓN MAESTRA UNIVERSAL — AMIGOS JUGONES (EGM ARCHITECTURE v1.0)
 * ============================================================================
 * Autodescubrimiento de entorno para operación fluida tanto en local (dev)
 * como en producción desacoplada (GitHub Pages CDN + Backend Cloud en Render).
 * ============================================================================
 */

(function () {
  'use strict';

  var hostname = window.location.hostname || '';
  var isLocal = ['localhost', '127.0.0.1', ''].includes(hostname) || window.location.protocol === 'file:';

  // Token administrativo para peticiones de moderación y control
  var ADMIN_SECRET_TOKEN = 'AJ_SECRET_ADMIN_TOKEN_2026_XYZ';

  // URLs oficiales de Google Apps Script
  var ORQUESTADOR_URL = 'https://script.google.com/macros/s/AKfycbzYRXiS0j2gBLGDVKexjz_ke7GCSLrD_H9DCVPvPn4FewukHYzHInLOM7Yknsa8f5oyLQ/exec';
  var ADMIN_PANEL_URL = 'https://script.google.com/macros/s/AKfycbwVC59ATBVZSGjpfozQYWTH6QgTeQvSHfEvQ1_ltpJD_PN3GGMYJRiJz-v2-X2HogzaiA/exec';

  // URL del backend Python: en local usa localhost:8877; en producción apunta a Render Cloud oficial
  var PROD_API_URL = 'https://amigosjugones.onrender.com';
  var API_BASE_URL = isLocal ? 'http://localhost:8877' : PROD_API_URL;

  window.AJ_CONFIG = {
    isLocal: isLocal,
    API_URL: API_BASE_URL,
    ORQUESTADOR_URL: ORQUESTADOR_URL,
    ADMIN_PANEL_URL: ADMIN_PANEL_URL,
    ADMIN_TOKEN: ADMIN_SECRET_TOKEN,

    /**
     * Construye una URL completa hacia el backend API de forma resiliente.
     * Si la ruta ya incluye protocolo, la devuelve tal cual.
     */
    apiUrl: function (path) {
      if (!path) return API_BASE_URL;
      if (path.startsWith('http://') || path.startsWith('https://')) return path;
      var cleanPath = path.startsWith('/') ? path : '/' + path;
      return API_BASE_URL + cleanPath;
    },

    /**
     * Retorna cabeceras HTTP estándar incluyendo Authorization si se requiere.
     */
    getHeaders: function (isAdmin) {
      var headers = {
        'Content-Type': 'application/json'
      };
      if (isAdmin) {
        headers['Authorization'] = 'Bearer ' + ADMIN_SECRET_TOKEN;
      }
      return headers;
    }
  };

  // Interceptor global para enrutar automáticamente todas las llamadas /api/* 
  // hacia el backend en producción (Render Cloud) de forma transparente.
  if (typeof window.fetch === 'function') {
    var _rawFetch = window.fetch;
    window.fetch = function (input, init) {
      if (typeof input === 'string') {
        if (input.startsWith('/api/') || input === '/api') {
          input = API_BASE_URL + input;
        } else if (input.startsWith('api/')) {
          input = API_BASE_URL + '/' + input;
        }
      } else if (input && typeof input.url === 'string') {
        try {
          var parsed = new URL(input.url, window.location.href);
          if (parsed.pathname.startsWith('/api/') && !isLocal) {
            input = new Request(API_BASE_URL + parsed.pathname + parsed.search, input);
          }
        } catch (e) {}
      }
      return _rawFetch.call(this, input, init);
    };
  }

  // Log de diagnóstico en consola
  if (isLocal) {
    console.log('⚡ [AJ_CONFIG] Modo DESARROLLO LOCAL activo (' + API_BASE_URL + ')');
  } else {
    console.log('🌐 [AJ_CONFIG] Modo PRODUCCIÓN CLOUD activo (' + API_BASE_URL + ')');
  }
})();
