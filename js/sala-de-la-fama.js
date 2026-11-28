/**
 * SALA DE LA FAMA — Amigos Jugones
 * Carga los JSON de temporadas desde /temporadas/ y renderiza
 * el historial de campeones mensuales con medallas especiales.
 * Mobile-First · Sin dependencias externas
 */

'use strict';

const SalaFama = {

  /* ── Estado ─────────────────────────────────────────────── */
  index:           null,   // datos de temporadas/index.json
  temporadaActual: null,   // datos del JSON de la temporada activa
  claveActiva:     null,   // clave seleccionada ej: '2026-10'

  /* ── Tabla de Medallas ───────────────────────────────────── */
  MEDALLAS: {
    oro_gral:        { nombre: 'Rey del Mes',     emoji: '👑', color: '#ffd700' },
    plata_gral:      { nombre: 'Subcampeón',       emoji: '🥈', color: '#c0c0c0' },
    bronce_gral:     { nombre: 'Bronce',           emoji: '🥉', color: '#cd7f32' },
    arcade_piloto:   { nombre: 'As del Circuito',  emoji: '🏎️', color: '#ef4444' },
    arcade_ninja:    { nombre: 'Sensei del Dohyō', emoji: '⚔️', color: '#22d3ee' },
    mas_activo:      { nombre: 'Incansable',       emoji: '⚡', color: '#facc15' },
    mision_perfecta: { nombre: 'Perfección',       emoji: '🌟', color: '#f8fafc' },
    saboteador:      { nombre: 'Caparazón Azul',   emoji: '🗡️', color: '#a855f7' },
    bga_champion:    { nombre: 'Mesa de Honor',    emoji: '🃏', color: '#22c55e' },
  },

  /* ── Posición → emoji/clase CSS ─────────────────────────── */
  POS_EMOJI: { 1: '🥇', 2: '🥈', 3: '🥉' },
  POS_CLASS: { 1: 'p1', 2: 'p2', 3: 'p3' },

  /* ─────────────────────────────────────────────────────────
     INIT: punto de entrada
     main.js llama initLayout() (síncrono) para armar el esqueleto,
     luego inyecta el footer global del sitio (igual que todas las páginas),
     y finalmente llama loadData() (async) para cargar las temporadas.
  ─────────────────────────────────────────────────────────── */

  /** Devuelve el título e icono adaptado al skin activo */
  getThemedTitle() {
    if (window.AJSkinEngine && typeof window.AJSkinEngine.getNavCustom === 'function') {
      const custom = window.AJSkinEngine.getNavCustom('sala-de-la-fama');
      if (custom && custom.icon && custom.label) {
        return `${custom.icon} ${custom.label}`;
      }
    }
    return '🏆 Sala de la Fama';
  },

  /** SÍNCRONO: arma el HTML esqueleto y aplica los estilos del layout */
  initLayout() {
    const content = document.getElementById('page-content');
    if (!content) return;
    if (content.querySelector('#temporadas-nav')) return; // Ya construido

    // Aplicar el mismo layout que Inicio: flex-column con altura fija 100vh
    content.style.cssText = 'height:100vh; max-height:100vh; overflow:hidden; display:flex; flex-direction:column; padding:16px 20px 0 20px; box-sizing:border-box;';

    content.innerHTML = `
      <!-- 1. Header row: idéntico al de Inicio y demás páginas -->
      <div class="home-header-row" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-shrink:0; width:100%; flex-wrap:wrap; gap:10px;">
        <div>
          <h1 id="sala-fama-header-title" class="home-title-compact" style="font-size:clamp(1.3rem,2.8vw,1.8rem); font-weight:800; margin:0; line-height:1.2;">${this.getThemedTitle()}</h1>
          <p class="home-sub-compact" style="color:var(--text-dim); font-size:0.85rem; margin:2px 0 0;">Histórico de campeones mensuales, podios arcade y honores del grupo</p>
        </div>
        <div class="badge badge-purple" style="padding:6px 14px; font-size:0.82rem; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
          <span class="live-dot" style="background:#ffd700;"></span><span>Histórico Oficial</span>
        </div>
      </div>

      <!-- 2. Viewport interno scrolleable (el interior se mueve, el footer del sitio queda fijo abajo) -->
      <div class="fama-scroll-viewport" style="flex:1 1 auto; overflow-y:auto; min-height:0; width:100%; padding-right:6px; box-sizing:border-box;">

        <!-- Mis Logros -->
        <div id="mis-logros-wrap" style="margin-bottom:20px;"></div>

        <!-- Navegación por Años y Meses -->
        <div style="margin-bottom:20px;">
          <div id="temporadas-anios" style="margin-bottom:10px;"></div>
          <div class="tabs-bar" id="temporadas-nav" style="margin-bottom:0;"></div>
        </div>

        <!-- Contenido de la Temporada seleccionada -->
        <div id="temporada-contenido" style="margin-bottom:24px;"></div>

      </div>

      <!-- El footer del sitio se inyecta por main.js justo después (igual que en todas las páginas) -->
    `;
  },

  /** ASÍNCRONO: carga los datos de temporadas y renderiza el contenido */
  async loadData() {
    try {
      await this.cargarIndex();
      if (this.index && this.index.temporadas && this.index.temporadas.length > 0) {
        const masReciente = this.index.temporadas[0];
        this.claveActiva = masReciente.clave;
        this.anioActivo = masReciente.clave.split('-')[0];
        this.actualizarMisLogrosHeader();
        this.renderNav();
        await this.cargarTemporada(masReciente.clave);
      } else {
        this.renderVacio('No hay temporadas registradas aún.');
      }
    } catch (err) {
      console.error('[SalaFama] Error al inicializar:', err);
      this.renderVacio('No se pudo cargar el historial. Intenta más tarde.');
    }
  },

  /** Compatibilidad: init() llama initLayout() + inyecta footer + loadData() (para sala-de-la-fama.html standalone) */
  async init() {
    const content = document.getElementById('page-content');
    if (!content) return;

    if (!content.querySelector('#temporadas-nav')) {
      this.initLayout();
    }

    // Inyectar footer del sitio SOLO si no existe ya
    if (typeof renderGlobalFooter === 'function' && !content.querySelector('.global-footer')) {
      const footerEl = document.createElement('div');
      footerEl.innerHTML = renderGlobalFooter();
      while (footerEl.firstChild) {
        content.appendChild(footerEl.firstChild);
      }
      if (typeof onlineActualizar === 'function') {
        setTimeout(onlineActualizar, 100);
      }
    }

    await this.loadData();
  },

  actualizarMisLogrosHeader() {
    const cont = document.getElementById('mis-logros-wrap');
    if (!cont) return;

    // Verificar autenticación: AuthManager primero, luego fallback directo a localStorage
    let isAuth = false;
    let nick = '';
    if (window.AuthManager && typeof window.AuthManager.isAuthenticated === 'function') {
      isAuth = window.AuthManager.isAuthenticated();
      nick = window.AuthManager.getNick();
    }
    // Fallback: leer localStorage directamente por si AuthManager aún no procesó la sesión
    if (!isAuth || !nick || nick === 'Invitado') {
      try {
        const raw = localStorage.getItem('aj_session_v1');
        if (raw) {
          const s = JSON.parse(raw);
          if (s && s.nick && s.nick !== 'Invitado') {
            isAuth = true;
            nick = s.nick;
          }
        }
      } catch(e) {}
    }

    if (isAuth && nick && nick !== 'Invitado') {
      this.renderMochila(nick, 'mis-logros-wrap');
    } else {
      cont.innerHTML = `
        <div class="card" style="padding:16px 20px; border:1px dashed var(--border); background:var(--card2); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:1.8rem;">🎒</span>
            <div>
              <div style="font-size:0.92rem; font-weight:800; color:var(--text);">Mis Logros</div>
              <div style="font-size:0.78rem; color:var(--text-dim);">Identifícate como miembro para ver tus medallas y honores acumulados.</div>
            </div>
          </div>
          <button onclick="window.AuthManager && window.AuthManager.showModal()" class="badge badge-purple" style="cursor:pointer; border:1px solid var(--primary); padding: 7px 16px; font-size:0.8rem; font-weight:700; border-radius:20px; display:inline-flex; align-items:center; gap:6px;">
            <span>🔑</span> <span>Identificarme</span>
          </button>
        </div>`;
    }
  },

  /* ─────────────────────────────────────────────────────────
     CARGA DE DATOS
  ───────────────────────────────────────────────────────── */
  async cargarIndex() {
    const v = Date.now();
    const res = await fetch(`temporadas/index.json?v=${v}`);
    if (!res.ok) throw new Error(`index.json → HTTP ${res.status}`);
    this.index = await res.json();
  },

  async cargarTemporada(clave) {
    this.claveActiva = clave;
    if (clave) {
      this.anioActivo = clave.split('-')[0];
    }
    this.renderNav();

    const t = this.index.temporadas.find(x => x.clave === clave);
    if (!t) return;

    try {
      const v = Date.now();
      const res = await fetch(`${t.archivo}?v=${v}`);
      if (!res.ok) throw new Error(`${t.archivo} → HTTP ${res.status}`);
      this.temporadaActual = await res.json();
      this.renderTemporada(this.temporadaActual);
    } catch (err) {
      console.error('[SalaFama] Error cargando temporada:', err);
      this.renderVacio(`No se pudo cargar la temporada ${clave}.`);
    }
  },

  /* ─────────────────────────────────────────────────────────
     AÑOS Y MESES (SOPORTE ESCALABLE PARA 24+ MESES)
  ───────────────────────────────────────────────────────── */
  obtenerAnios() {
    if (!this.index?.temporadas) return [];
    const anios = [...new Set(this.index.temporadas.map(t => t.clave.split('-')[0]))];
    return anios.sort((a, b) => b.localeCompare(a));
  },

  seleccionarAnio(anio) {
    this.anioActivo = anio;
    const tAnio = this.index.temporadas.filter(t => t.clave.startsWith(anio));
    if (tAnio.length > 0) {
      this.cargarTemporada(tAnio[0].clave);
    } else {
      this.renderNav();
    }
  },

  /* ─────────────────────────────────────────────────────────
     RENDER NAV — Usando la barra de pestañas nativa (.tabs-bar)
  ───────────────────────────────────────────────────────── */
  renderNav() {
    const aniosCont = document.getElementById('temporadas-anios');
    const nav = document.getElementById('temporadas-nav');
    if (!nav || !this.index) return;

    const anios = this.obtenerAnios();

    // 1. Selector de Años (si hay más de 1 año registrado en el historial)
    if (anios.length > 1 && aniosCont) {
      aniosCont.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-dim); text-transform:uppercase; letter-spacing:1px;">Año:</span>
          ${anios.map(a => `
            <button class="tab-btn${a === this.anioActivo ? ' active' : ''}" style="padding:4px 14px; font-size:0.8rem; border-radius:var(--radius-sm);" onclick="SalaFama.seleccionarAnio('${a}')">
              📅 ${a}
            </button>
          `).join('')}
        </div>
      `;
    } else if (aniosCont) {
      aniosCont.innerHTML = '';
    }

    // 2. Meses filtrados por el año activo con la clase .tab-btn nativa
    const temporadasVisibles = this.anioActivo
      ? this.index.temporadas.filter(t => t.clave.startsWith(this.anioActivo))
      : this.index.temporadas;

    nav.innerHTML = temporadasVisibles.map(t => {
      const isActive = t.clave === this.claveActiva;
      const icono = isActive ? '👑' : '🏆';
      return `
        <button
          class="tab-btn${isActive ? ' active' : ''}"
          id="pill-${t.clave}"
          data-clave="${t.clave}"
          aria-pressed="${isActive}"
          onclick="SalaFama.cargarTemporada('${t.clave}')"
          style="display:inline-flex; align-items:center; gap:6px;"
        >
          <span>${icono}</span>
          <span>${t.nombre}</span>
        </button>
      `;
    }).join('');
  },

  actualizarPills() {
    this.renderNav();
  },

  /* ─────────────────────────────────────────────────────────
     RENDER TEMPORADA — Tarjeta completa
  ───────────────────────────────────────────────────────── */
  renderTemporada(data) {
    const contenedor = document.getElementById('temporada-contenido');
    if (!contenedor) return;

    // Calcular totales para metadatos
    const totalJugadores = data.total_jugadores_activos || data.ranking_general?.length || '—';
    const totalPuntosBonos = data.ranking_general
      ?.reduce((sum, r) => sum + (r.bonus_otorgado || 0), 0) || 0;

    contenedor.innerHTML = `
      <article class="temporada-card" id="temporada-card-${data.clave}">

        <!-- Cabecera de la tarjeta -->
        <div class="temporada-card-header">
          <h2 class="temporada-card-title">🏆 ${data.nombre}</h2>
          <div class="temporada-card-meta">
            <span>📅 ${this.formatFecha(data.fecha_inicio)} → ${this.formatFecha(data.fecha_cierre)}</span>
            <span>👥 ${totalJugadores} jugadores</span>
            ${totalPuntosBonos > 0 ? `<span>🎁 ${totalPuntosBonos} PTS repartidos</span>` : ''}
          </div>
        </div>

        <!-- Contenido en 2 columnas en desktop -->
        <div class="fama-dos-col">

          <!-- Ranking General -->
          <div class="fama-seccion">
            <p class="fama-seccion-titulo">🏅 Ranking General del Mes</p>
            ${this.renderRankingGeneral(data.ranking_general)}
          </div>

          <!-- Podios Arcade -->
          <div class="fama-seccion">
            <p class="fama-seccion-titulo">🏎️ Circuito Black — Top Pilotos</p>
            ${this.renderPodioArcade(data.podio_arcade_carrera, 'carrera')}
            <p class="fama-seccion-titulo" style="margin-top:14px;">⚔️ Cyber Ninja — Top Senseis</p>
            ${this.renderPodioArcade(data.podio_arcade_ninja, 'ninja')}
          </div>

        </div>

        <!-- Medallas Especiales -->
        <div class="fama-seccion">
          <p class="fama-seccion-titulo">🎖️ Medallas Especiales del Mes</p>
          ${this.renderMedallasEspeciales(data.medallas_especiales)}
        </div>

      </article>
    `;
  },

  /* ─────────────────────────────────────────────────────────
     RENDER RANKING GENERAL
  ───────────────────────────────────────────────────────── */
  renderRankingGeneral(filas) {
    if (!filas || !filas.length) return '<p class="fama-empty">Sin datos.</p>';

    return `<div class="ranking-lista">
      ${filas.map((f, i) => {
        const delay = i * 0.07;
        const posClass = this.POS_CLASS[f.pos] || 'pn';
        const posEmoji = this.POS_EMOJI[f.pos] || f.pos;
        const medallaEmojis = (f.medallas || [])
          .map(m => this.MEDALLAS[m]?.emoji || '')
          .filter(Boolean)
          .join('');
        const bonusHTML = f.bonus_otorgado > 0
          ? `<span class="ranking-bonus">+${f.bonus_otorgado} PTS</span>` : '';

        return `
          <div class="ranking-row pos-${f.pos}" style="animation-delay:${delay}s">
            <div class="pos-badge ${posClass}">${posEmoji}</div>
            <span class="ranking-nick">${this.esc(f.nick)}</span>
            ${medallaEmojis ? `<div class="ranking-medallas-mini"><span>${medallaEmojis}</span></div>` : ''}
            <span class="ranking-puntos">${f.puntos.toLocaleString()} PTS</span>
            ${bonusHTML}
          </div>`;
      }).join('')}
    </div>`;
  },

  /* ─────────────────────────────────────────────────────────
     RENDER PODIO ARCADE
  ───────────────────────────────────────────────────────── */
  renderPodioArcade(podio, tipo) {
    if (!podio || !podio.length) return '<p class="fama-empty">Sin datos.</p>';

    const unidad  = tipo === 'carrera' ? 'km' : 'pts';
    const getter  = tipo === 'carrera'
      ? (f) => `${parseFloat(f.km).toFixed(1)} km`
      : (f) => `${f.score?.toLocaleString()} pts`;

    return `<div class="arcade-podio">
      ${podio.map(f => `
        <div class="arcade-fila">
          <span class="arcade-pos">${this.POS_EMOJI[f.pos] || f.pos}</span>
          <span class="arcade-nick">${this.esc(f.nick)}</span>
          <span class="arcade-valor">${getter(f)}</span>
          ${f.medalla ? `<span class="arcade-crown">👑</span>` : ''}
        </div>`).join('')}
    </div>`;
  },

  /* ─────────────────────────────────────────────────────────
     RENDER MEDALLAS ESPECIALES
  ───────────────────────────────────────────────────────── */
  renderMedallasEspeciales(especiales) {
    if (!especiales) return '<p class="fama-empty">Sin datos.</p>';

    const items = Object.entries(especiales).map(([cod, info], i) => {
      const def   = this.MEDALLAS[cod] || { emoji: '🏅', nombre: cod, color: '#888' };
      const delay = i * 0.06;
      return `
        <div class="medalla-especial-card" style="animation-delay:${delay}s" title="${def.nombre}">
          <span class="medalla-especial-emoji">${def.emoji}</span>
          <span class="medalla-especial-nombre">${def.nombre}</span>
          <span class="medalla-especial-nick">${this.esc(info.nick)}</span>
          <span class="medalla-especial-valor">${info.valor} ${info.unidad}</span>
        </div>`;
    });

    return `<div class="medallas-grid">${items.join('')}</div>`;
  },

  /* ─────────────────────────────────────────────────────────
     UTILIDADES
  ───────────────────────────────────────────────────────── */
  renderVacio(msg) {
    const c = document.getElementById('temporada-contenido');
    if (c) c.innerHTML = `
      <div class="fama-empty">
        <span class="fama-empty-icon">🏆</span>
        <p>${msg}</p>
      </div>`;
  },

  formatFecha(isoStr) {
    if (!isoStr) return '—';
    const [y, m, d] = isoStr.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
  },

  /** Escapa HTML para prevenir XSS */
  esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /* ─────────────────────────────────────────────────────────
     VITRINA: Mochila de Logros del jugador logueado
     Llamar desde main.js pasando el nick actual
  ───────────────────────────────────────────────────────── */
  async renderMochila(nick, contenedorId) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor || !nick) return;

    // Mostrar spinner inmediatamente para evitar que se vea el card de "Identifícate"
    contenedor.innerHTML = `<div style="text-align:center; padding:14px; color:var(--text-dim); font-size:0.85rem;"><span class="spinner"></span> Cargando logros de ${this.esc(nick)}...</div>`;

    try {
      // Cargar index si no está cargado
      if (!this.index) await this.cargarIndex();

      const medallas = [];

      // 1. Medallas en vivo desde Render (automáticas + otorgadas en DB)
      try {
        const apiUrl = window.AJ_CONFIG && typeof window.AJ_CONFIG.apiUrl === 'function'
          ? window.AJ_CONFIG.apiUrl(`/api/medallas/mias?nick=${encodeURIComponent(nick)}`)
          : `/api/medallas/mias?nick=${encodeURIComponent(nick)}`;
        const liveRes = await fetch(apiUrl);
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData && liveData.ok && Array.isArray(liveData.medallas)) {
            liveData.medallas.forEach(m => {
              const cod = String(m.codigo || '').trim();
              if (!cod) return;
              const fechaStr = m.otorgada_en ? String(m.otorgada_en).slice(0, 10) : 'Temporada Actual';
              medallas.push({
                cod,
                temporada: m.motivo || fechaStr,
                nombre: m.nombre,
                emoji: m.emoji,
                color: m.color,
                descripcion: m.descripcion
              });
            });
          }
        }
      } catch (liveErr) {
        console.warn('[SalaFama] No se pudieron cargar medallas en vivo:', liveErr);
      }

      // 2. Medallas históricas desde JSON estáticos de temporadas cerradas
      for (const t of this.index.temporadas) {
        const res = await fetch(`${t.archivo}?v=${Date.now()}`);
        if (!res.ok) continue;
        const data = await res.json();

        // Buscar medallas del nick en ranking_general
        const fila = data.ranking_general?.find(f => f.nick === nick);
        if (fila?.medallas?.length) {
          fila.medallas.forEach(cod => {
            if (!medallas.find(m => m.cod === cod && m.temporada === t.nombre)) {
              medallas.push({ cod, temporada: t.nombre });
            }
          });
        }

        // Buscar medallas especiales
        if (data.medallas_especiales) {
          Object.entries(data.medallas_especiales).forEach(([cod, info]) => {
            if (info.nick === nick && !medallas.find(m => m.cod === cod && m.temporada === t.nombre)) {
              medallas.push({ cod, temporada: t.nombre });
            }
          });
        }
      }

      if (medallas.length === 0) {
        contenedor.innerHTML = `
          <div class="card" style="padding:18px 20px; border:1px solid var(--border); background:var(--card); margin-bottom:24px;">
            <p class="mochila-title" style="margin:0 0 8px; font-weight:800; font-size:0.95rem; color:var(--text);">🎒 Mis Logros — 👤 ${this.esc(nick)}</p>
            <p class="mochila-empty" style="color:var(--text-dim); margin:0;">Aún no tienes medallas registradas. ¡Compite en torneos, trivias y crípticos para desbloquear logros! 🎮</p>
          </div>`;
        return;
      }

      const badgesHTML = medallas.map((m, i) => {
        const def = this.MEDALLAS[m.cod] || {
          nombre: m.nombre || m.cod,
          emoji: m.emoji || '🏅',
          color: m.color || '#ffd700'
        };
        const tooltip = `${def.nombre}${m.descripcion ? ' — ' + m.descripcion : ''} (${m.temporada})`;
        return `
          <div class="mochila-item" title="${this.esc(tooltip)}" style="animation-delay:${i * 0.05}s; border-color:${this.esc(def.color)}50;">
            <span class="medal-emoji">${this.esc(def.emoji)}</span>
            <span class="medal-name" style="font-size:0.72rem; font-weight:700; color:var(--text, #fff); text-align:center; max-width:85px; line-height:1.2;">${this.esc(def.nombre)}</span>
            <span class="medal-season" style="font-size:0.62rem; color:var(--text-dim, rgba(255,255,255,0.5)); margin-top:2px;">${this.esc(m.temporada)}</span>
          </div>`;
      }).join('');

      contenedor.innerHTML = `
        <div class="card" style="padding:18px 20px; border:1px solid var(--border); background:var(--card); margin-bottom:24px; box-shadow:0 4px 16px rgba(0,0,0,0.25);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div style="margin:0; font-weight:800; font-size:0.98rem; color:var(--text); display:flex; align-items:center; gap:8px;">
              <span>🎒</span> <span>Mis Logros — <strong style="color:var(--accent-light, #c084fc);">${this.esc(nick)}</strong></span>
            </div>
            <span class="badge badge-purple" style="font-size:0.75rem; font-weight:700; padding:3px 10px; border-radius:12px;">
              ${medallas.length} ${medallas.length === 1 ? 'medalla' : 'medallas'}
            </span>
          </div>
          <div class="mochila-grid">${badgesHTML}</div>
        </div>`;

    } catch (err) {
      console.warn('[SalaFama] Logros no disponibles:', err);
    }
  }
};

/* ── Reactividad de autenticación para la Sala de la Fama ── */
window.addEventListener('aj:auth-changed', () => {
  if (document.body.classList.contains('page-sala-fama')) {
    SalaFama.actualizarMisLogrosHeader();
  }
  const perfilWrap = document.getElementById('mochila-perfil-wrap');
  if (perfilWrap && window.SalaFama) {
    if (window.AuthManager && window.AuthManager.isAuthenticated()) {
      SalaFama.renderMochila(window.AuthManager.getNick(), 'mochila-perfil-wrap');
    } else {
      perfilWrap.innerHTML = '';
    }
  }
});

/* ── Arranque automático si estamos en sala-de-la-fama.html ── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('page-sala-fama')) {
    let initialized = false;
    const startFama = () => {
      if (initialized) return;
      const content = document.getElementById('page-content');
      if (content && content.querySelector('#temporadas-nav')) {
        initialized = true;
        if (!SalaFama.temporadaActual) {
          SalaFama.loadData();
        }
        return;
      }
      if (content && document.getElementById('app-container')?.style.display !== 'none') {
        initialized = true;
        SalaFama.init();
      }
    };

    const interval = setInterval(() => {
      if (document.getElementById('app-container')?.style.display !== 'none') {
        clearInterval(interval);
        startFama();
      }
    }, 60);

    setTimeout(() => {
      clearInterval(interval);
      startFama();
    }, 600);
  }
});

// Exponer explícitamente en window para consumo desde main.js y components.js
window.SalaFama = SalaFama;
