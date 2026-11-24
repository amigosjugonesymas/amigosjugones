/* === Amigos Jugones — ui-core.js === */
// Extraído de main.js

/**
 * AMIGOS JUGONES V2 — MAIN.JS
 * Motor de navegación SPA, renderizado de secciones y carga de datos.json
 * Diseño: Arcade Dark Mode · Mobile-First
 */

'use strict';

/* ═══════════════════════════════════════════════════════
   ESTADO GLOBAL
   ═══════════════════════════════════════════════════════ */

const App = {
  data: null,
  currentSection: 'inicio', // Se sobreescribe dinámicamente con getCurrentPageId()
  carouselTimers: {},
};

/* ═══════════════════════════════════════════════════════
   INICIALIZACIÓN MULTI-PAGE
   ═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   CARGA DE DATOS
   ═══════════════════════════════════════════════════════ */

function loadData() {
  const loadingScreen = document.getElementById('loading-screen');
  const appContainer = document.getElementById('app-container');
  const cacheBust = Date.now();

  // Función auxiliar de carga segura
  const fetchJsonSafe = (file) =>
    fetch(`${file}?v=${cacheBust}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);

  // Carga paralela esencial ultraligera (Lazy Loading móvil)
  Promise.all([
    fetchJsonSafe('datos.json'),
    fetchJsonSafe('ranking.json')
  ])
    .then(([baseData, rankingData]) => {
      const data = baseData || {};

      // Fusión modular de ranking
      if (rankingData) {
        data.ranking_modular = rankingData;
        if (rankingData.ranking_principal) data.ranking_principal = rankingData.ranking_principal;
        if (rankingData.podio_carrera) data.podio_carrera = rankingData.podio_carrera;
        if (rankingData.podio_pelea) data.podio_pelea = rankingData.podio_pelea;
        if (rankingData.ranking_mensajes_sin_leer) data.ranking_mensajes_sin_leer = rankingData.ranking_mensajes_sin_leer;
      }

      App.data = data;

      // Limpiar cachés antiguas de GViz/Sheets para asegurar datos 100% de SQLite
      try {
        localStorage.removeItem('aj_gviz_cache_main');
        localStorage.removeItem('aj_gviz_cache_race');
        localStorage.removeItem('aj_gviz_cache_fight');
      } catch (e) { }

      // Verificar modo mantenimiento
      if (data.mantenimiento === true) {
        showMaintenance();
        return;
      }

      if (loadingScreen) loadingScreen.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';

      // Sincronizar eventos y alertas automáticas de buzón privado para miembros
      if (typeof window.notifVerificarEventosMacrojuego === 'function') {
        window.notifVerificarEventosMacrojuego(data);
      }

      renderSection(App.currentSection);
    })
    .catch(err => {
      console.warn('Modo local (file://) o fallo al cargar Multi-JSON. Activando fallback offline seguro:', err);
      App.data = App.data || {};
      if (loadingScreen) loadingScreen.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
      renderSection(App.currentSection);
    });
}

function showMaintenance() {
  document.getElementById('loading-screen').style.display = 'none';
  const m = document.getElementById('maintenance-screen');
  if (m) m.style.display = 'flex';
}

/* ═══════════════════════════════════════════════════════
   HELPER DE CARGA DIFERIDA (LAZY LOADING DE SECCIONES)
   ═══════════════════════════════════════════════════════ */

async function ensureDataSection(key, file, el) {
  if (App.data && App.data[key]) return App.data[key];
  if (el) {
    el.innerHTML = `
      <div class="flex items-center justify-center p-30 text-dim" style="min-height:220px;flex-direction:column;gap:12px;">
        <div class="spinner-neon" style="width:36px;height:36px;border:3px solid rgba(255,255,255,0.1);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <div style="font-size:0.85rem;font-weight:600;letter-spacing:0.5px;color:var(--text-dim);">Cargando contenido de ${key}...</div>
      </div>
    `;
  }
  const cacheBust = Date.now();
  try {
    const res = await fetch(`${file}?v=${cacheBust}`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (res) {
      if (key === 'radar' && res.radar) App.data.radar = res.radar;
      else if (key === 'mercado' && res.mercado) App.data.mercado = res.mercado;
      else if (key === 'cumpleanos') App.data.cumpleanos = res;
      else if (key === 'instagram' && res.publicaciones) {
        App.data.instagram = res.publicaciones;
        App.data.instagram_form_url = res.form_url;
      }
      else App.data[key] = res;
    }
  } catch (e) {
    console.warn(`[LazyLoad] Error cargando ${file}:`, e);
  }
  return App.data ? App.data[key] : null;
}

/* ═══════════════════════════════════════════════════════
   ROUTER DE SECCIONES
   ═══════════════════════════════════════════════════════ */

function renderSection(id) {
  const content = document.getElementById('page-content');
  if (!content) return;

  content.innerHTML = '';
  content.className = 'main-content fade-in';

  const d = App.data;

  switch (id) {
    case 'inicio': renderInicio(content, d); break;
    case 'juegos': renderJuegos(content, d); break;
    case 'carrera': renderCarrera(content, d); break;
    case 'pelea': renderPelea(content, d); break;
    case 'eventos': renderEventosDestacados(content, d); break;
    case 'concursos': renderConcursosDestacados(content, d); break;
    case 'calendario':
      ensureDataSection('cumpleanos', 'cumpleanos.json').then(() => renderCalendario(content, App.data));
      break;
    case 'radar':
      ensureDataSection('radar', 'radar.json', content).then(() => renderRadar(content, App.data));
      break;
    case 'encuestas':
      ensureDataSection('encuestas', 'encuestas.json', content).then(() => renderEncuestas(content, App.data));
      break;
    case 'miembros': renderMiembros(content, d); break;
    case 'mercado':
      ensureDataSection('mercado', 'mercado.json', content).then(() => renderMercado(content, App.data));
      break;
    case 'instagram':
      ensureDataSection('instagram', 'instagram.json', content).then(() => renderInstagram(content, App.data));
      break;
    case 'documentos':
      ensureDataSection('documentos', 'documentos.json', content).then(() => renderDocumentos(content, App.data));
      break;
    case 'formularios': renderFormularios(content, d); break;
    case 'realeza': renderRealeza(content, d); break;
    case 'juntas': renderJuntas(content, d); break;
    case 'torneos':
      ensureDataSection('torneos', 'torneos.json', content).then(() => renderTorneos(content, App.data));
      break;
    case 'ranking': renderRankingComunidad(content, d); break;
    case 'sala-de-la-fama':
      if (window.SalaFama && typeof window.SalaFama.initLayout === 'function') {
        // 1. Armar el esqueleto HTML (síncrono) — igual que cualquier otro renderXxx()
        window.SalaFama.initLayout();
        // 2. El footer del sitio se inyecta a continuación normalmente (ver abajo)
        // 3. Iniciar carga de datos async (no sobreescribe el footer ya inyectado)
        //    Se llama después de salir del switch para que el footer ya esté en el DOM
        setTimeout(() => {
          if (typeof window.SalaFama.loadData === 'function') {
            window.SalaFama.loadData();
          }
        }, 0);
      }
      break;
    case 'salon-de-honor':
      if (window.SalonHonor && typeof window.SalonHonor.initLayout === 'function') {
        window.SalonHonor.initLayout();
        setTimeout(() => {
          if (typeof window.SalonHonor.loadData === 'function') {
            window.SalonHonor.loadData();
          }
        }, 0);
      } else if (window.SalonHonor && typeof window.SalonHonor.init === 'function') {
        window.SalonHonor.init();
      }
      break;
    default: renderInicio(content, d);
  }

  // Inyectar el Footer Global en todas las secciones (incluyendo sala-de-la-fama)
  const footerEl = document.createElement('div');
  footerEl.innerHTML = renderGlobalFooter();
  while (footerEl.firstChild) {
    content.appendChild(footerEl.firstChild);
  }
  if (typeof onlineActualizar === 'function') {
    setTimeout(onlineActualizar, 100);
  }
}

function renderGlobalFooter() {
  return `
    <!-- Footer Global Unificado -->
    <footer class="global-footer">
      <div class="global-footer-inner">
        <!-- Widget Usuarios Online -->
        <div class="global-footer-online">
          <div class="online-widget">
            <button class="online-pill" id="btn-online-footer" onclick="onlineTogglePanel(event)" title="Usuarios conectados en este momento">
              <span class="online-dot"></span>
              <span class="online-label">conectando...</span>
            </button>
            <div class="online-panel" style="display:none;">
              <div class="online-panel-header">🟢 En línea ahora</div>
              <div class="online-user-list">
                <div class="online-loading">Cargando...</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pastillas de Información y Ayuda -->
        <div class="global-footer-links">
          <button onclick="window.AuthManager && window.AuthManager.abrirGhostRed()" class="btn-footer-pill" style="border:1px solid rgba(16,185,129,0.5); background:rgba(16,185,129,0.15); color:#6ee7b7; font-weight:800;">👻 GhostRed (Live)</button>
          <button onclick="premiosAbrirModal()" id="btn-premios-footer" class="btn-footer-pill btn-pill-amber">🎁 Premios</button>
          <button onclick="notifAbrirAvisosPublicos()" class="btn-footer-pill btn-pill-blue">📢 Avisos Oficiales</button>
          <button onclick="openPopup('que_hacer')" class="btn-footer-pill btn-pill-purple">🧭 ¿Qué hacer aquí?</button>
          <button onclick="openPopup('puntos')" class="btn-footer-pill">🎯 Ganar Puntos</button>
          <button onclick="openPopup('como_iniciar')" class="btn-footer-pill">🔑 Iniciar Sesión</button>
          <button onclick="openPopup('reglas_grupo')" class="btn-footer-pill">📋 Reglas del Grupo</button>
        </div>

        <!-- Redes Sociales y Copyright -->
        <div class="global-footer-social">
          <div class="social-icons-row">
            <a href="https://www.instagram.com/amigosjugonesymas/" target="_blank" title="Instagram">
              <img src="imagenes/INSTAGRAM.png" alt="Instagram">
            </a>
            <a href="https://wa.me/..." target="_blank" title="WhatsApp">
              <img src="imagenes/WHATSAPP.png" alt="WhatsApp">
            </a>
            <a href="https://boardgamearena.com/..." target="_blank" title="Board Game Arena">
              <img src="imagenes/BGA.png" alt="BGA">
            </a>
          </div>
          <span class="footer-copy-text">© ${new Date().getFullYear()} Amigos Jugones · Tu comunidad de juegos</span>
        </div>
      </div>
    </footer>

    <!-- 👻 BOTÓN FLOTANTE GHOSTRED (FAB NEÓN CYBERPUNK) -->
    <div id="ghostred-fab-container" style="position:fixed; bottom:82px; right:16px; z-index:9999;">
      <button id="btn-ghostred-fab" onclick="window.AuthManager && window.AuthManager.abrirGhostRed()"
        style="display:flex; align-items:center; gap:7px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; border:1px solid rgba(110,231,183,0.5); border-radius:30px; padding:9px 15px; font-weight:800; font-size:0.82rem; cursor:pointer; box-shadow:0 6px 20px rgba(0,0,0,0.6), 0 0 16px rgba(16,185,129,0.35); transition:all 0.2s ease; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);">
        <span style="font-size:1.1rem; filter:drop-shadow(0 0 4px rgba(255,255,255,0.8));">👻</span>
        <span style="letter-spacing:0.3px;">GhostRed</span>
        <span style="width:7px; height:7px; background:#34d399; border-radius:50%; box-shadow:0 0 8px #34d399; display:inline-block; animation:pulseGhostRed 2s infinite;"></span>
      </button>
      <style>
        @keyframes pulseGhostRed {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 10px #34d399; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }
        #btn-ghostred-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.8), 0 0 24px rgba(16,185,129,0.6);
        }
      </style>
    </div>
  `;
}

