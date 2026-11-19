/**
 * AMIGOS JUGONES — MOTOR DE TRADUCCIÓN i18n
 * Detección automática por navigator.language (patrón Terapias Fácil)
 * Soporta parámetro ?lang= y recae en fallback estático es.json
 */

'use strict';

const i18nEngine = {
  currentLang: 'es',
  translations: {},
  initialized: false,

  init: async function () {
    if (this.initialized) return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const langParam = urlParams.get('lang');
      const userLang = navigator.language || navigator.userLanguage || 'es';

      let targetLang = 'es';
      if (langParam) {
        targetLang = langParam.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 10);
      } else if (userLang) {
        targetLang = userLang.split('-')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 10);
      }
      if (!targetLang) targetLang = 'es';

      this.currentLang = targetLang;
      await this.loadDictionary(targetLang);
      this.initialized = true;
      this.applyTranslations();
    } catch (e) {
      console.warn('[i18n] Fallback seguro activado:', e);
      this.currentLang = 'es';
      this.initialized = true;
    }
  },

  loadDictionary: async function (lang) {
    try {
      const res = await fetch(`i18n/${lang}.json?v=${Date.now()}`);
      if (res.ok) {
        this.translations = await res.json();
      } else {
        // Fallback a español si no existe el idioma del navegador
        const fallback = await fetch(`i18n/es.json?v=${Date.now()}`);
        if (fallback.ok) {
          this.translations = await fallback.json();
        }
      }
    } catch (e) {
      console.warn(`[i18n] Error cargando i18n/${lang}.json:`, e);
    }
  },

  t: function (key, params = {}) {
    let text = this.translations[key] || key;
    if (typeof text === 'string') {
      Object.keys(params).forEach(p => {
        text = text.replace(new RegExp(`{{${p}}}`, 'g'), params[p]);
      });
    }
    return text;
  },

  applyTranslations: function () {
    // 1. Textos directos
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.translations[key]) {
        el.innerText = this.translations[key];
      }
    });

    // 2. Placeholders de inputs
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (this.translations[key]) {
        el.placeholder = this.translations[key];
      }
    });

    // 3. Título de la página
    if (this.translations['app_title']) {
      document.title = this.translations['app_title'];
    }
  }
};

// Exponer en window
window.i18nEngine = i18nEngine;
window.__t = function (key, params) {
  return window.i18nEngine ? window.i18nEngine.t(key, params) : key;
};

// Arranque automático no invasivo
document.addEventListener('DOMContentLoaded', () => {
  if (window.i18nEngine && typeof window.i18nEngine.init === 'function') {
    window.i18nEngine.init();
  }
});

