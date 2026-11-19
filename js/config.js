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
  var ORQUESTADOR_URL = 'https://script.google.com/macros/s/AKfycby9ZbAUxHH2V29_wYSB7g78te7_lwWAgdPwPOvSA0PH0Lfe8hA4rsTMgUbRKGxHJToicQ/exec';
  var ADMIN_PANEL_URL = 'https://script.google.com/macros/s/AKfycbw8BmSMYsRsiI4Qq-cmvFiENgCa-2M7plG8mBarmhKeY9QvnfuQshG-CpOm8aEXlyu9tQ/exec';

  // URL del backend Python: en local usa localhost:8877; en producción apunta al contenedor cloud
  var PROD_API_URL = 'https://api-amigosjugones.onrender.com'; // Sustituir por URL definitiva al desplegar en Render
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

  // Log de diagnóstico en consola
  if (isLocal) {
    console.log('⚡ [AJ_CONFIG] Modo DESARROLLO LOCAL activo (' + API_BASE_URL + ')');
  } else {
    console.log('🌐 [AJ_CONFIG] Modo PRODUCCIÓN CLOUD activo (' + API_BASE_URL + ')');
  }
})();
