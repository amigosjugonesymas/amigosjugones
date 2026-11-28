/**
 * ============================================================================
 * AMIGOS JUGONES — POPUP DINÁMICO DEL DÍA (MOBILE-FIRST)
 * ============================================================================
 * Consulta el endpoint action=popup_get_today del Orquestador y muestra
 * un aviso destacado al usuario una vez por sesión (sessionStorage).
 * ============================================================================
 */

(function () {
  'use strict';

  const ORQUESTADOR_URL = (window.AJ_CONFIG && window.AJ_CONFIG.ORQUESTADOR_URL)
    || "https://script.google.com/macros/s/AKfycbzYRXiS0j2gBLGDVKexjz_ke7GCSLrD_H9DCVPvPn4FewukHYzHInLOM7Yknsa8f5oyLQ/exec";
  const STORAGE_KEY = 'aj_popup_mostrado_sesion';

  async function initPopupDiario() {
    // 1. Verificar si ya fue mostrado en esta sesión de navegación
    if (sessionStorage.getItem(STORAGE_KEY)) {
      return;
    }

    try {
      const res = await fetch(`${ORQUESTADOR_URL}?action=popup_get_today`);
      const data = await res.json();

      if (!data || data.status !== 'ok' || !data.titulo) {
        return; // No hay anuncio activo para hoy
      }

      mostrarModalPopup(data);
    } catch (err) {
      console.warn('[Popup Diario] No se pudo cargar aviso dinámico:', err);
    }
  }

  function mostrarModalPopup(info) {
    // Evitar duplicados si ya existe en el DOM
    if (document.getElementById('aj-popup-modal')) return;

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'aj-popup-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(4, 4, 12, 0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Tarjeta del Modal (Mobile First)
    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(145deg, #0e0e22 0%, #080814 100%);
      border: 1px solid rgba(124, 58, 237, 0.45);
      border-radius: 20px;
      padding: 24px 20px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(124, 58, 237, 0.25);
      text-align: center;
      position: relative;
      transform: scale(0.92);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-sizing: border-box;
      color: #ffffff;
      font-family: 'Outfit', sans-serif;
    `;

    // Botón Cerrar (X)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Cerrar aviso');
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 14px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(239, 68, 68, 0.2)'; closeBtn.style.color = '#ef4444'; };
    closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(255, 255, 255, 0.08)'; closeBtn.style.color = '#94a3b8'; };

    // Contenido del Modal
    const icono = info.icono || '🎉';
    const tipo = info.tipo || 'DESTACADO';
    const titulo = info.titulo || 'Novedades de la Comunidad';
    const descripcion = info.descripcion || '';
    const ctaTexto = info.cta_texto || 'Ver Más';
    const ctaLink = info.cta_link || '#';

    card.innerHTML = `
      <div style="font-size: 3.2rem; margin-bottom: 8px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));">${icono}</div>
      <div style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 12px;">
        ${tipo}
      </div>
      <h3 style="font-size: 1.35rem; font-weight: 800; margin: 0 0 10px 0; color: #f8fafc; line-height: 1.25;">
        ${titulo}
      </h3>
      <p style="font-size: 0.95rem; color: #94a3b8; line-height: 1.5; margin: 0 0 20px 0;">
        ${descripcion}
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <a href="${ctaLink}" id="aj-popup-cta" style="flex: 1; padding: 12px 20px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 0.95rem; box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4); transition: transform 0.2s, box-shadow 0.2s; display: inline-block;">
          ${ctaTexto}
        </a>
      </div>
    `;

    card.appendChild(closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Animación de entrada
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });

    // Función para cerrar modal
    function cerrar() {
      sessionStorage.setItem(STORAGE_KEY, '1');
      overlay.style.opacity = '0';
      card.style.transform = 'scale(0.92)';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 300);
    }

    closeBtn.addEventListener('click', cerrar);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cerrar();
    });

    const ctaBtn = card.querySelector('#aj-popup-cta');
    if (ctaBtn) {
      ctaBtn.addEventListener('click', () => {
        sessionStorage.setItem(STORAGE_KEY, '1');
      });
    }
  }

  // Ejecutar cuando el DOM esté listo con un pequeño delay de cortesía (1.2s) para no chocar con la carga inicial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initPopupDiario, 1200));
  } else {
    setTimeout(initPopupDiario, 1200);
  }
})();

