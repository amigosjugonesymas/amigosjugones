/* === Amigos Jugones — renderers.js === */
// Extraído de main.js

function renderInicio(el, d) {
  // Reset estado misiones secretas en cada renderizado
  secretMissionsRevealed = false;
  currentPositiveMission = null;
  currentAttackMission = null;
  secretMissionRevealed = false;
  currentSecretMission = null;

  // Ranking principal: de ranking.json (sincronizado por Apps Script) o legado de datos.json
  let ranking = d?.ranking_principal || d?.rankingInteraccion || [];
  try {
    if (!ranking.length) {
      const actData = d?.remaining?.contenido?.['Actividades']?.datos;
      if (actData) ranking = parseActivityRanking(actData['Ranking Interacción (Beta)'] || actData['Ganadores Triviaverso'] || ranking);
    }
  } catch (e) { console.warn('No ranking data'); }

  // Puntos de la tarjeta del día: dinámico determinista (5, 10 o 15 PTS) según el macrojuego
  // Permite sobrescritura explícita desde datos.json si se especifica tarjeta_diaria.pts
  function calcularPtsMisionDiaria() {
    if (d?.tarjeta_diaria?.pts) return Number(d.tarjeta_diaria.pts);
    const ahora = new Date();
    // Semilla determinista diaria (Año * 10000 + Mes * 100 + Día)
    const semilla = ahora.getFullYear() * 10000 + (ahora.getMonth() + 1) * 100 + ahora.getDate();
    // Función hash simple para distribución uniforme
    const hash = Math.sin(semilla) * 10000;
    const rand = hash - Math.floor(hash);
    if (rand < 0.40) return 5;       // 40% probabilidad: 5 PTS
    if (rand < 0.80) return 10;      // 40% probabilidad: 10 PTS
    return 15;                       // 20% probabilidad: 15 PTS (Día Legendario)
  }
  const ptsDelDia = calcularPtsMisionDiaria();

  el.innerHTML = `
    <!-- Encabezado Compacto -->
    <div class="home-header-row">
      <div>
        <h1 class="home-title-compact">🎮 Amigos Jugones</h1>
        <p class="home-sub-compact">Tu cuartel general de juegos · Comunidad activa</p>
      </div>
      <div class="badge badge-green flex items-center gap-4" style="padding:5px 12px;font-size:0.82rem;">
        <span class="live-dot"></span> Activo
      </div>
    </div>

    <!-- Ticker eliminado: novedades ahora en Columna C -->

    <!-- GRID 3 COLUMNAS: Misiones | Rankings | Feed -->
    <div class="home-3col-grid">

      <!-- ── COLUMNA A: Misiones & Arcade ── -->
      <div class="home-col-missions">
        <!-- Encabezado de columna -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:6px;">
          <div style="font-size:0.92rem;font-weight:800;text-transform:uppercase;color:var(--primary-light);letter-spacing:.5px;" title="${getFechaMisionHoy('largo')}">🎯 Misiones del Día</div>
          <span class="badge" title="${getFechaMisionHoy('largo')}" style="font-size:0.72rem;background:rgba(124,58,237,0.22);border-color:rgba(124,58,237,0.5);color:#ddd6fe;padding:2px 8px;font-weight:700;letter-spacing:0.3px;">${getFechaMisionHoy()}</span>
        </div>
        <!-- Grid 2 tarjetas lado a lado -->
        <div class="home-missions-card-grid">
          ${renderTCGDailyWidget(ptsDelDia)}
          ${renderPersonalMissionCard()}
        </div>
        ${renderArcadeLauncher()}
      </div>

      <!-- ── COLUMNA B: Tríptico de Rankings ── -->
      ${renderHomeTriptychRankings(ranking)}

      <!-- ── COLUMNA C: Feed de Comunidad ── -->
      ${renderCommunityFeed(d)}

    </div>
  `;
  // Arrancar rotador en vivo (usa el mismo pool generado en renderCommunityFeed)
  setTimeout(function () {
    startLiveActivityRotator(generateLiveActivities(d));
  }, 300);

  // Prefetch no bloqueante en background para poblar datos secundarios sin consumo al boot
  setTimeout(function () {
    ['radar.json', 'instagram.json', 'mercado.json', 'torneos.json', 'encuestas.json'].forEach(function (f) {
      const key = f.replace('.json', '');
      if (!App.data || !App.data[key]) {
        fetch(f + '?v=' + Date.now())
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (res) {
            if (res && App.data) {
              if (key === 'radar' && res.radar) App.data.radar = res.radar;
              else if (key === 'mercado' && res.mercado) App.data.mercado = res.mercado;
              else if (key === 'instagram' && res.publicaciones) {
                App.data.instagram = res.publicaciones;
                App.data.instagram_form_url = res.form_url;
              }
              else App.data[key] = res;
            }
          })
          .catch(function () { });
      }
    });
  }, 2000);
}



// --- Helpers Dinámicos para Dashboard ---

function getRandomItem(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function renderStatCardH(icon, value, label, colorType = 'primary') {
  // colorType puede ser 'primary' o 'accent'
  const isPrimary = colorType === 'primary';
  const borderColor = isPrimary ? 'var(--primary)' : 'var(--accent)';
  const bgColor = isPrimary ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)';

  return `
    <div class="champion-card" style="background: var(--card); border-color: var(--border); padding: 4px 10px; min-height: 40px;">
      <div class="champion-avatar" style="border-color: ${borderColor}; background: ${bgColor}; width: 34px; height: 34px; font-size: 1.2rem;">
        ${icon}
      </div>
      <div>
        <div class="champion-label" style="color:var(--text-faint);">${escapeHtml(label)}</div>
        <div class="champion-name" style="font-size:1.1rem; margin-top:2px; color:var(--text);">${escapeHtml(value)}</div>
      </div>
    </div>
  `;
}

/**
 * Mini-resumen del Radar Jugón para la Home (datos.radar.jugadores)
 * Muestra los disponibles de hoy con sus horarios.
 */
function renderRadarHoyResumen(d) {
  const DIAS_KEY = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const todayKey = DIAS_KEY[new Date().getDay()]; // 0=DOM, 1=LUN ...

  const jugadores = d?.radar?.jugadores || [];

  const disponibles = jugadores.filter(j => {
    const h = (j.disponibilidad?.[todayKey]?.horario || '').toLowerCase();
    return h && !h.includes('no tengo disponible') && !h.includes('no suelo poder') && !h.includes('sin disponibilidad');
  });

  if (disponibles.length === 0) {
    return `<div class="text-dim text-xs" style="text-align:center; padding: 16px 0;">Día muy tranquilo. Ningún jugador ha reportado disponibilidad.</div>`;
  }

  // Fisher-Yates array shuffle (nombres al azar)
  let shuffled = [...disponibles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const MAX_SHOW = 3;
  const toShow = shuffled.slice(0, MAX_SHOW);
  const remaining = shuffled.length - MAX_SHOW;

  let html = toShow.map(j => {
    const horario = j.disponibilidad[todayKey].horario;
    return `
      <div style="border-left: 2px solid var(--green); padding: 8px 0 8px 12px; margin-bottom: 8px; background: rgba(34,197,94,0.04); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
        <div style="font-weight: 700; font-size: 0.85rem;">${escapeHtml(j.nick || j.nombre)}</div>
        <div style="font-size: 0.73rem; color: var(--text-dim); margin-top: 2px;">⏰ ${escapeHtml(horario)}</div>
      </div>
    `;
  }).join('');

  if (remaining > 0) {
    html += `<div class="text-dim text-xs" style="text-align:center; padding-top:2px; margin-bottom: 8px; opacity: 0.8;">y ${remaining} jugador(es) más hoy...</div>`;
  }

  return html;
}

function renderHomeParticipantList(players) {
  return `
    <div class="card h-full">
      <div class="flex items-center gap-8 mb-12">
        <span style="font-size:1.4rem;">👥</span>
        <span class="font-bold">Última Actividad</span>
      </div>
      <div class="flex flex-col gap-10" style="padding-top: 12px;">
        ${players.length > 0 ? players.map(p => `
          <div class="flex items-center justify-between">
            <span class="text-sm">${escapeHtml(p.nombre)}</span>
            <span class="badge badge-purple" style="font-size:0.65rem;">${p.puntos} pts</span>
          </div>
        `).join('') : '<div class="text-dim text-xs">Sin actividad reciente</div>'}
      </div>
    </div>
  `;
}

function renderHomeRandomProduct(p) {
  if (!p) {
    p = {
      titulo: "Producto de Muestra",
      precio: "$ 15.000",
      foto: ""
    };
  }

  const tituloLen = (p.titulo || p.nombre || '').length;
  const fontSize = tituloLen > 30 ? '0.8rem' : '0.9rem';

  const imgHTML = p.foto
    ? `<img src="${escapeHtml(p.foto)}" style="width:100%; height:100%; object-fit:cover; object-position:center;">`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;background:var(--card2);color:var(--accent);">🛒</div>`;

  /* AJUSTE PIXEL-PERFECT: min-height 210px es el límite final para evitar scroll en Home */
  return `
    <div class="card h-full flex flex-col" style="padding: 14px; gap: 10px; overflow: hidden; min-height: 210px;">

      <div class="font-bold" style="color: var(--accent); font-size: 0.75rem; letter-spacing: 0.5px; flex-shrink: 0; text-align: center; text-transform: uppercase;">
        🛒 MERCADO JUGÓN <span style="color: var(--text-faint);">✦</span> PRODUCTO DESTACADO
      </div>

      <!-- Ventana de Imagen Fija y Centrada (Reducida para evitar scroll) - 104px height -->
      <div style="height: 104px; width: 100%; border-radius: var(--radius-sm); border: 1px solid rgba(124,58,237,0.3); overflow: hidden; background: var(--card2); flex-shrink: 0; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
        ${imgHTML}
      </div>

      <!-- Fila: título + precio -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex: 1; min-height: 0;">
        <div class="font-bold" style="font-size: ${fontSize}; line-height: 1.25; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: var(--text);" title="${escapeHtml(p.titulo || p.nombre)}">
          ${escapeHtml(p.titulo || p.nombre)}
        </div>
        <div class="font-bold" style="color: var(--gold); text-shadow: 0 0 8px rgba(245, 158, 11, 0.4); font-size: 1rem; flex-shrink: 0; white-space: nowrap;">
          ${escapeHtml(p.precio || 'Consultar')}
        </div>
      </div>

      <!-- Botón -->
      <div style="flex-shrink: 0; margin-top: auto;">
        <a href="mercado.html" class="btn btn-ghost" style="display: flex; justify-content: center; width: 100%; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; text-transform: uppercase; border: 1px solid rgba(124,58,237,0.2);">
          VER MÁS
        </a>
      </div>
    </div>
  `;
}
function renderHomeRandomEvent(e) {
  /* NOTA TÉCNICA: min-height de 210px e imagen de 104px asegura encaje perfecto en grid Inicio */
  if (!e) {
    // Estado vacío replicando la estructura del widget de Mercado
    return `
    <div class="card h-full flex flex-col" style="padding: 14px; gap: 10px; overflow: hidden; min-height: 210px;">
      <div class="font-bold" style="color: var(--cyan); font-size: 0.75rem; letter-spacing: 0.5px; flex-shrink: 0; text-align: center; text-transform: uppercase;">
        🎪 EVENTOS DESTACADOS
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-faint);">
        <div style="font-size: 2rem;">📅</div>
        <p style="font-size: 0.82rem; text-align: center;">Próximo Evento</p>
        <p style="font-size: 0.74rem; text-align: center; color: var(--text-faint);">Pronto habrá novedades en el calendario.</p>
      </div>
    </div>`;
  }

  const bgImage = e.imagen || '';
  const imgHTML = bgImage
    ? `<img src="${escapeHtml(bgImage)}" style="width:100%; height:100%; object-fit:cover; object-position:center;">`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2.5rem;background:var(--card2);color:var(--cyan);">🎪</div>`;

  const fechaStr = formatEventDateForCard(e.fecha_inicio || e.fecha || '');
  const lugar = e.lugar ? escapeHtml(e.lugar) : '';

  return `
    <div class="card h-full flex flex-col" style="padding: 14px; gap: 10px; overflow: hidden; min-height: 210px;">

      <div class="font-bold" style="color: var(--cyan); font-size: 0.75rem; letter-spacing: 0.5px; flex-shrink: 0; text-align: center; text-transform: uppercase;">
        🎪 EVENTOS DESTACADOS <span style="color: var(--text-faint);">✦</span> PRÓXIMO EVENTO
      </div>

      <!-- Imagen del Evento - 104px height -->
      <div style="height: 104px; width: 100%; border-radius: var(--radius-sm); border: 1px solid rgba(6,182,212,0.3); overflow: hidden; background: var(--card2); flex-shrink: 0; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
        ${imgHTML}
      </div>

      <!-- Título + Fecha -->
      <div style="display: flex; flex-direction: column; gap: 3px; flex: 1; min-height: 0; overflow: hidden;">
        <div class="font-bold" style="font-size: 0.9rem; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: var(--text);">
          ${escapeHtml(e.titulo || 'Evento')}
        </div>
        ${fechaStr ? `<div style="font-size: 0.74rem; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(fechaStr)}</div>` : ''}
        ${lugar ? `<div style="font-size: 0.72rem; color: var(--text-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📍 ${lugar}</div>` : ''}
      </div>

      <!-- Botón VER MÁS -->
      <div style="flex-shrink: 0; margin-top: auto;">
        <a href="calendario.html" class="btn btn-ghost" style="display: flex; justify-content: center; width: 100%; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; text-transform: uppercase; border: 1px solid rgba(6,182,212,0.2);">
          VER MÁS
        </a>
      </div>
    </div>
  `;
}

function renderHomeRandomMember(m) {
  // Nuevo formato soberano: datos.miembro_destacado
  if (!m) {
    m = {
      nombre: "Amigo Jugón X",
      categoria: "divulgadores",
      icono: "📢",
      url: "#",
      imagen: ""
    };
  }

  const iconoPorCategoria = { participantes: '🎮', divulgadores: '📢', creadores: '🎨', organizaciones: '🏛️', tiendas: '🛒' };
  const icono = m.icono || iconoPorCategoria[m.categoria] || '⭐';

  // Contenedor visual del avatar (Imagen o Icono)
  const avatarHTML = m.imagen
    ? `<div class="member-featured-circle"><img src="${escapeHtml(m.imagen)}" alt="Logo" class="member-featured-img"></div>`
    : `<div class="member-featured-circle"><div class="member-featured-icon">${icono}</div></div>`;

  const nameLen = (m.nombre || '').length;
  const fontSize = nameLen > 30 ? '0.85rem' : nameLen > 20 ? '0.95rem' : '1.05rem';

  return `
    <div class="card h-full flex flex-col items-center justify-center text-center w-full" style="padding: 16px; gap: 12px; align-items: center; overflow: hidden;">
      
      <div class="font-bold text-gold w-full text-center" style="font-size: 0.85rem; letter-spacing: 0.5px; text-align: center; margin: 0 auto; flex-shrink: 0;">
        <span style="color:var(--gold);">★</span> MIEMBRO DESTACADO
      </div>

      <div class="flex flex-col items-center justify-center w-full min-w-0" style="gap: 8px; align-items: center; flex: 1; min-height: 0; overflow: hidden;">
        ${avatarHTML}
        <div class="w-full min-w-0 text-center" style="padding: 0 4px; text-align: center; overflow: hidden;">
          <div class="font-bold line-clamp-2 text-center" style="font-size: ${fontSize}; width: 100%; text-align: center; margin: 0 auto; height: 2.6em; display: flex; align-items: center; justify-content: center; line-height: 1.25;" title="${escapeHtml(m.nombre)}">
            ${escapeHtml(m.nombre)}
          </div>
          <div class="text-dim truncate lowercase w-full text-center" style="font-size: 0.8rem; letter-spacing: 1px; margin-top: 2px; text-align: center; margin: 0 auto; opacity: 0.8;">
            ${escapeHtml(m.categoria || 'miembro')}
          </div>
        </div>
      </div>

      <div class="w-full" style="margin-top: auto; padding: 0 4px; flex-shrink: 0;">
        <a href="${m.url ? escapeHtml(m.url) : '#miembros'}" target="_blank" rel="noopener" class="btn btn-ghost" style="display: flex; justify-content: center; width: 100%; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; text-transform: uppercase;">
          Ver más
        </a>
      </div>

    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN 3: CALENDARIO
   ═══════════════════════════════════════════════════════ */

function renderCalendario(el, d) {
  const calUrl = d?.calendario?.embedUrl || '';

  el.innerHTML = `
    <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
      <div style="flex: 1 1 45%; min-width: 320px;">
        ${renderSectionHero('📅 Calendario Jugón', 'Revisa la agenda oficial de partidas, juntas y actividades de la comunidad.')}
      </div>
      <div class="radar-cta-card card">
        <div class="cta-icon">📸</div>
        <div class="cta-text-wrap">
          <div class="cta-title">¿TIENES UN EVENTO O CONCURSO?</div>
          <p class="cta-desc">¿Organizas un evento o torneo jugón? Queremos que la comunidad lo sepa y participe.</p>
        </div>
        <a href="https://www.instagram.com/amigosjugonesymas/" target="_blank" rel="noopener noreferrer" class="btn btn-primary cta-btn">
          <span style="font-size: 1.2rem;">✨</span>
          <span>Enviar Propuesta</span>
        </a>
      </div>
    </div>

    <div class="calendario-main-panel" style="display:flex; flex-direction:column; gap:16px;">
      <div class="card" style="padding:0; overflow:hidden; border-radius:14px; width:100%; min-height:540px; display:flex; flex-direction:column; background:rgba(14,10,30,0.85); border:1px solid rgba(124,58,237,0.3); box-shadow:0 10px 30px rgba(0,0,0,0.5);">
        ${calUrl
      ? `<iframe src="${calUrl}" style="width:100%; height:100%; min-height:560px; flex:1; border:none; display:block; filter:invert(0.9) hue-rotate(180deg);" frameborder="0"></iframe>`
      : `<div class="empty-state" style="padding: 60px; flex:1;">
               <div class="empty-icon">📅</div>
               <p>El calendario se configura en <code>datos.json</code> → <code>calendario.embedUrl</code></p>
             </div>`
    }
      </div>

      <div class="flex justify-center items-center gap-12" style="margin-top: 4px; flex-wrap: wrap;">
        <a href="https://calendar.google.com/calendar/u/1?cid=YW1pZ29zanVnb25lc3ltYXNAZ21haWwuY29t" target="_blank" rel="noopener noreferrer" class="btn btn-purple" style="padding: 8px 18px; font-size: 0.82rem;">
          <span>📅</span> Abrir en Google Calendar
        </a>
        <a href="eventos.html" class="btn btn-outline" style="padding: 8px 18px; font-size: 0.82rem; border-color: rgba(124,58,237,0.4); text-decoration:none;">
          <span>🌟</span> Ver Eventos Destacados
        </a>
        <a href="concursos.html" class="btn btn-outline" style="padding: 8px 18px; font-size: 0.82rem; border-color: rgba(236,72,153,0.4); text-decoration:none;">
          <span>🏆</span> Ver Concursos
        </a>
      </div>

      <!-- SECCIÓN CUMPLEAÑOS DE LA COMUNIDAD (PASO 5) -->
      ${renderCalendarioCumpleanos(d?.cumpleanos)}
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   WIDGET: CUMPLEAÑOS DE LA COMUNIDAD (MOBILE-FIRST)
   ═══════════════════════════════════════════════════════ */

function renderCalendarioCumpleanos(cumpleData) {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const mesesCortos = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  const lista = (cumpleData && Array.isArray(cumpleData.cumpleanos)) ? cumpleData.cumpleanos : [];
  window._cumpleanosListaCache = lista;

  const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
  const currentNick = (window.AuthManager && window.AuthManager.getNick()) || '';

  // Contar cuántos en cada mes
  const conteoPorMes = {};
  for (let m = 1; m <= 12; m++) conteoPorMes[m] = 0;
  lista.forEach(c => {
    if (conteoPorMes[c.mes] !== undefined) conteoPorMes[c.mes]++;
  });

  return `
    <div class="card glow" style="margin-top: 14px; padding: 22px 20px; border-radius: 16px; background: linear-gradient(145deg, rgba(20, 14, 40, 0.95) 0%, rgba(12, 10, 26, 0.95) 100%); border: 1px solid rgba(236, 72, 153, 0.35); box-shadow: 0 10px 35px rgba(0,0,0,0.6);">
      
      <!-- Encabezado de la Sección de Cumpleaños -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="font-size:2.2rem; filter:drop-shadow(0 0 10px rgba(236,72,153,0.5));">🎂</div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size:1.25rem; font-weight:800; color:#fff; margin:0; letter-spacing:-0.3px;">Cumpleaños de la Comunidad</h2>
              <span class="badge badge-purple" style="font-size:0.65rem; padding:2px 7px;">HUB NATIVO</span>
            </div>
            <p style="font-size:0.75rem; color:var(--text-dim); margin:2px 0 0 0;">Celebremos juntos las fechas de los amigos del Club.</p>
          </div>
        </div>

        <div>
          ${isAuth ? `
            <button onclick="AuthManager.abrirModalCumpleanos()" style="background:linear-gradient(135deg, #ec4899 0%, #7c3aed 100%); color:#fff; font-weight:800; border:none; border-radius:10px; padding:9px 16px; font-size:0.8rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 4px 14px rgba(236,72,153,0.35); transition:transform 0.15s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
              <span>🎂</span> <span>Configurar mi Fecha</span>
            </button>
          ` : `
            <button onclick="AuthManager.showModal({ reason: 'Identifícate con tu WhatsApp de miembro para registrar tu fecha de cumpleaños.' })" style="background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.4); color:#f472b6; font-weight:800; border-radius:10px; padding:9px 14px; font-size:0.78rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px;">
              <span>🔑</span> <span>Inicia sesión para agregar el tuyo</span>
            </button>
          `}
        </div>
      </div>

      <!-- Selector de Meses Horizontal Táctil -->
      <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:14px; -webkit-overflow-scrolling:touch; scrollbar-width:thin;" class="custom-scrollbar">
        <button onclick="filtrarCumpleanosMes(0, this)" class="btn-mes-tab" style="padding:6px 14px; font-size:0.75rem; font-weight:700; border-radius:20px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.04); color:#cbd5e1; cursor:pointer; white-space:nowrap; transition:all 0.15s ease;">
          🌟 Todos (${lista.length})
        </button>
        ${meses.map((m, i) => {
    const mNum = i + 1;
    const esActivo = mNum === mesActual;
    const count = conteoPorMes[mNum];
    return `
            <button onclick="filtrarCumpleanosMes(${mNum}, this)" class="btn-mes-tab ${esActivo ? 'active-mes' : ''}" style="padding:6px 12px; font-size:0.75rem; font-weight:700; border-radius:20px; border:1px solid ${esActivo ? '#ec4899' : 'rgba(255,255,255,0.1)'}; background:${esActivo ? 'rgba(236,72,153,0.22)' : 'rgba(255,255,255,0.03)'}; color:${esActivo ? '#fff' : '#94a3b8'}; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:5px; transition:all 0.15s ease;">
              <span>${mesesCortos[i]}</span>
              ${count > 0 ? `<span style="font-size:0.65rem; background:${esActivo ? '#ec4899' : 'rgba(255,255,255,0.1)'}; color:#fff; padding:1px 5px; border-radius:10px;">${count}</span>` : ''}
            </button>
          `;
  }).join('')}
      </div>

      <!-- Contenedor Dinámico de Tarjetas -->
      <div id="cumple-grid-cards">
        ${renderCumpleanosCards(lista, mesActual, diaActual, currentNick)}
      </div>
    </div>
  `;
}

function renderCumpleanosCards(lista, mesFiltro, diaActual, currentNick) {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const diaHoy = hoy.getDate();

  let filtrados = lista;
  if (mesFiltro > 0) {
    filtrados = lista.filter(c => c.mes === mesFiltro);
  }

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  if (!filtrados.length) {
    const nombreMes = mesFiltro > 0 ? meses[mesFiltro - 1] : '';
    return `
      <div style="text-align:center; padding:36px 16px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); border-radius:12px;">
        <div style="font-size:2.2rem; margin-bottom:6px;">🎂</div>
        <div style="font-size:0.9rem; font-weight:700; color:#fff;">No hay cumpleaños registrados ${nombreMes ? 'en ' + nombreMes : ''} aún</div>
        <p style="font-size:0.75rem; color:#94a3b8; margin:4px 0 14px 0;">¿Cumples años este mes? ¡Agrégate a la lista para saludarte!</p>
        <button onclick="AuthManager.abrirModalCumpleanos()" style="background:rgba(236,72,153,0.15); border:1px solid rgba(236,72,153,0.4); color:#f472b6; font-weight:700; border-radius:8px; padding:7px 14px; font-size:0.78rem; cursor:pointer;">
          🎂 Configurar mi Cumpleaños
        </button>
      </div>
    `;
  }

  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(230px, 1fr)); gap:12px;">
      ${filtrados.map(c => {
    const esHoy = (c.mes === mesActual && c.dia === diaHoy);
    const esUsuario = (currentNick && c.nick && currentNick.toLowerCase() === c.nick.toLowerCase());
    const saludoMsg = encodeURIComponent(`¡Hola ${c.nick}! 🎂🎉 Te mando un saludo muy grande de feliz cumpleaños desde la comunidad de Amigos Jugones. ¡Que tengas un gran día lleno de juegos de mesa! 🎲✨`);

    return `
          <div class="card" style="padding:14px 16px; border-radius:12px; background:${esHoy ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${esHoy ? '#f59e0b' : (esUsuario ? 'rgba(236,72,153,0.45)' : 'rgba(255,255,255,0.08)')}; display:flex; flex-direction:column; justify-content:space-between; gap:10px; position:relative; box-shadow:${esHoy ? '0 0 20px rgba(245,158,11,0.3)' : 'none'}; transition:transform 0.15s ease;">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:38px; height:38px; border-radius:10px; background:${esHoy ? 'linear-gradient(135deg, #f59e0b, #ec4899)' : 'rgba(124, 58, 237, 0.2)'}; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">
                  ${esHoy ? '🎉' : '🎂'}
                </div>
                <div>
                  <div style="font-size:0.92rem; font-weight:800; color:#fff; line-height:1.2; word-break:break-word;">${escapeHtml(c.nick)}</div>
                  <div style="font-size:0.75rem; color:#f472b6; font-weight:700; margin-top:2px;">
                    🗓️ ${c.dia} de ${c.mes_nombre}
                  </div>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                ${esHoy ? `<span class="badge" style="background:#f59e0b; color:#000; font-weight:900; font-size:0.62rem; padding:2px 6px; border-radius:6px; animation:pulse 1.5s infinite;">¡HOY! 🌟</span>` : ''}
                ${esUsuario ? `<span class="badge badge-purple" style="font-size:0.62rem; padding:1px 6px;">TÚ ⭐</span>` : ''}
              </div>
            </div>

            <!-- Botón para saludar -->
            <div style="margin-top:2px; display:flex; justify-content:flex-end;">
              <a href="https://api.whatsapp.com/send?text=${saludoMsg}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:5px; font-size:0.72rem; font-weight:700; color:#4ade80; background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.3); padding:4px 9px; border-radius:6px; text-decoration:none; transition:all 0.15s ease;">
                <span>📲</span> <span>Saludar en WhatsApp</span>
              </a>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;
}

window.filtrarCumpleanosMes = function (mesNum, btn) {
  // Actualizar estilos activos de los botones
  document.querySelectorAll('.btn-mes-tab').forEach(b => {
    b.style.border = '1px solid rgba(255,255,255,0.1)';
    b.style.background = 'rgba(255,255,255,0.03)';
    b.style.color = '#94a3b8';
  });
  if (btn) {
    btn.style.border = '1px solid #ec4899';
    btn.style.background = 'rgba(236,72,153,0.22)';
    btn.style.color = '#fff';
  }

  const container = document.getElementById('cumple-grid-cards');
  if (container) {
    const lista = window._cumpleanosListaCache || [];
    const currentNick = (window.AuthManager && window.AuthManager.getNick()) || '';
    const hoy = new Date();
    container.innerHTML = renderCumpleanosCards(lista, mesNum, hoy.getDate(), currentNick);
  }
};


function formatEventDateForCard(dateStr) {
  if (!dateStr) return 'Fecha por definir';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return String(dateStr);
    return d.toLocaleString('es-CL', { weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', ' -');
  } catch (e) {
    return String(dateStr);
  }
}

function renderConcursoFeaturedCard(c) {
  const bgImage = c.imagen || 'https://images.unsplash.com/photo-1605333391783-d25a666e9499?auto=format&fit=crop&q=80&w=800';
  return `
    <div class="featured-scroll-card" style="border: 1px solid rgba(236,72,153,0.4);">
      <div style="height: 180px; position: relative; overflow: hidden; flex-shrink: 0;">
        <img src="${escapeHtml(bgImage)}" alt="${escapeHtml(c.titulo || 'Concurso')}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.5s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
        <div style="position:absolute; bottom:0; left:0; right:0; height:60px; background: linear-gradient(to bottom, transparent, #0f0f1a);"></div>
        <div style="position:absolute; top:10px; left:10px; z-index:2;">
          <span style="background:rgba(236,72,153,0.92); backdrop-filter:blur(8px); color:#fff; font-size:0.65rem; font-weight:700; padding:3px 9px; border-radius:20px; letter-spacing:0.5px; text-transform:uppercase;">🏅 Concurso</span>
        </div>
      </div>
      <div style="background: #0f0f1a; padding: 10px 12px 20px; display:flex; flex-direction:column; flex-grow:1;">
        <div style="font-size:0.9rem; font-weight:900; text-transform:uppercase; text-align:center; color:#ec4899; line-height:1.2; margin-bottom:9px; letter-spacing:0.3px;">${escapeHtml(c.titulo || 'Concurso')}</div>
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(236,72,153,0.25); border-radius:8px; padding:8px 10px; display:flex; flex-direction:column; gap:5px; margin-bottom:9px; font-size:0.74rem; color:#cbd5e1;">
          ${c.fecha_inicio ? `<div style="display:flex; gap:6px; align-items:center;"><span>📅</span><span><strong style="color:#ec4899;">Inicio:</strong> ${formatEventDateForCard(c.fecha_inicio)}</span></div>` : ''}
          ${c.fecha_termino ? `<div style="display:flex; gap:6px; align-items:center;"><span>🏁</span><span><strong style="color:#ec4899;">Fin:</strong> ${formatEventDateForCard(c.fecha_termino)}</span></div>` : ''}
          ${c.lugar ? `<div style="display:flex; gap:6px; align-items:flex-start;"><span style="margin-top:1px;">📍</span><span><strong style="color:#ec4899;">Lugar:</strong> ${escapeHtml(c.lugar)}</span></div>` : ''}
          ${c.organizador ? `<div style="display:flex; gap:6px; align-items:center;"><span>🏛️</span><span><strong style="color:#ec4899;">Organiza:</strong> <span style="color:#f472b6;">${escapeHtml(c.organizador)}</span></span></div>` : ''}
          ${c.descripcion ? `
          <div style="border-top:1px solid rgba(255,255,255,0.07); margin-top:3px; padding-top:5px; color:#94a3b8; line-height:1.4; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; height:100px;">
            ${escapeHtml(c.descripcion)}
          </div>` : ''}
        </div>
        <a href="${c.url ? escapeHtml(c.url) : '#'}" target="_blank" rel="noopener"
           style="display:block; text-align:center; padding:8px 0; background: linear-gradient(135deg, #be185d, #ec4899); color:#fff; font-weight:800; font-size:0.75rem; border-radius:8px; text-decoration:none; letter-spacing:0.5px; margin-top:auto; box-shadow:0 4px 12px rgba(236,72,153,0.4); transition:opacity 0.2s;"
           onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
          VER MÁS ↗
        </a>
      </div>
    </div>
  `;
}

function renderEventFeaturedCard(e) {
  const bgImage = e.imagen || 'https://images.unsplash.com/photo-1605333391783-d25a666e9499?auto=format&fit=crop&q=80&w=800';
  return `
    <div class="featured-scroll-card" style="border: 1px solid rgba(124,58,237,0.4);">
      <div style="height: 180px; position: relative; overflow: hidden; flex-shrink: 0;">
        <img src="${escapeHtml(bgImage)}" alt="${escapeHtml(e.titulo)}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.5s ease;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'">
        <div style="position:absolute; bottom:0; left:0; right:0; height:60px; background: linear-gradient(to bottom, transparent, #0f0f1a);"></div>
        <div style="position:absolute; top:10px; left:10px; z-index:2;">
          <span style="background:rgba(124,58,237,0.92); backdrop-filter:blur(8px); color:#fff; font-size:0.65rem; font-weight:700; padding:3px 9px; border-radius:20px; letter-spacing:0.5px; text-transform:uppercase;">🌟 Evento</span>
        </div>
      </div>
      <div style="background: #0f0f1a; padding: 10px 12px 20px; display:flex; flex-direction:column; flex-grow:1;">
        <div style="font-size:0.9rem; font-weight:900; text-transform:uppercase; text-align:center; color:#fff; line-height:1.2; margin-bottom:9px; letter-spacing:0.3px;">${escapeHtml(e.titulo || 'Evento')}</div>
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(124,58,237,0.25); border-radius:8px; padding:8px 10px; display:flex; flex-direction:column; gap:5px; margin-bottom:9px; font-size:0.74rem; color:#cbd5e1;">
          <div style="display:flex; gap:6px; align-items:center;">
            <span>📅</span><span><b style="color:#e2e8f0;">Fecha:</b> ${escapeHtml(formatEventDateForCard(e.fecha || e.fecha_inicio))}</span>
          </div>
          ${e.hora ? `<div style="display:flex; gap:6px; align-items:center;"><span>⏰</span><span><b style="color:#e2e8f0;">Hora:</b> ${escapeHtml(e.hora)}</span></div>` : ''}
          <div style="display:flex; gap:6px; align-items:flex-start;">
            <span style="margin-top:1px;">📍</span><span><b style="color:#e2e8f0;">Lugar:</b> ${escapeHtml(e.ubicacion || e.lugar || 'Por confirmar')}</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span>🏛️</span><span><b style="color:#e2e8f0;">Organiza:</b> <span style="color:#a78bfa; font-weight:700;">${escapeHtml(e.autor || e.organizador || 'Comunidad')}</span></span>
          </div>
          ${e.descripcion ? `
          <div style="border-top:1px solid rgba(255,255,255,0.07); margin-top:3px; padding-top:5px; color:#94a3b8; line-height:1.4; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; height:100px;">
            ${escapeHtml(e.descripcion)}
          </div>` : ''}
        </div>
        <a href="${e.link || e.url || '#'}" target="_blank" rel="noopener" style="display:block; text-align:center; background:linear-gradient(135deg,#7c3aed,#9333ea); color:#fff; font-size:0.75rem; font-weight:800; padding:8px 0; border-radius:8px; text-decoration:none; letter-spacing:0.5px; margin-top:auto; box-shadow:0 4px 12px rgba(124,58,237,0.4); transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">VER MÁS ↗</a>
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN 5: RADAR JUGÓN
   ═══════════════════════════════════════════════════════ */

function renderRadar(el, d) {
  const radarData = d?.radar || {};
  const jugadores = radarData.jugadores || [];
  const descripcion = radarData.descripcion || '';

  const DIAS_CONFIG = [
    { key: 'LUNES', label: 'Lunes', short: 'LUN', emoji: '🌙' },
    { key: 'MARTES', label: 'Martes', short: 'MAR', emoji: '🔥' },
    { key: 'MIERCOLES', label: 'Miércoles', short: 'MIE', emoji: '⚡' },
    { key: 'JUEVES', label: 'Jueves', short: 'JUE', emoji: '🎯' },
    { key: 'VIERNES', label: 'Viernes', short: 'VIE', emoji: '🎮' },
    { key: 'SABADO', label: 'Sábado', short: 'SAB', emoji: '🏆' },
    { key: 'DOMINGO', label: 'Domingo', short: 'DOM', emoji: '☀️' }
  ];

  const todayRaw = new Date().getDay();
  const todayIndex = todayRaw === 0 ? 6 : todayRaw - 1;

  const estaDisponible = (j, diaKey) => {
    const h = (j.disponibilidad?.[diaKey]?.horario || '').toLowerCase();
    return h && !h.includes('no tengo disponible') && !h.includes('no suelo poder') && !h.includes('sin disponibilidad');
  };

  if (jugadores.length === 0) {
    el.innerHTML = `
      <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
        <div style="flex: 1 1 45%; min-width: 320px;">
          ${renderSectionHero('📡 Radar Jugón', '¿Quién se motiva hoy? · Disponibilidad proactiva de la comunidad')}
        </div>
        <div class="radar-cta-card card">
          <div class="cta-icon">📝</div>
          <div class="cta-text-wrap">
            <div class="cta-title">¿Quieres aparecer aquí?</div>
            <p class="cta-desc">Completa tu ficha de disponibilidad para que la comunidad sepa cuándo motivarse contigo.</p>
          </div>
          <button onclick="AuthManager.abrirModalRadar()" class="btn btn-primary cta-btn" style="border:none; cursor:pointer;">
            <span style="font-size: 1.2rem;">🤝</span>
            <span>¡Quiero unirme al Radar!</span>
          </button>
        </div>
      </div>
      ${renderComingSoon('📡', 'Radar Jugón', 'Los datos de disponibilidad se están sincronizando. Agrega jugadores en la pestaña FICHA JUGADORES.')}
    `;
    return;
  }

  el.innerHTML = `
    <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
      <div style="flex: 1 1 45%; min-width: 320px;">
        ${renderSectionHero('📡 Radar Jugón', '¿Quién se motiva hoy? · Disponibilidad proactiva de la comunidad')}
      </div>
      <div class="radar-cta-card card">
        <div class="cta-icon">📝</div>
        <div class="cta-text-wrap">
          <div class="cta-title">¿Quieres aparecer aquí?</div>
          <p class="cta-desc">Completa tu ficha de disponibilidad para que la comunidad sepa cuándo motivarse contigo.</p>
        </div>
        <button onclick="AuthManager.abrirModalRadar()" class="btn btn-primary cta-btn" style="border:none; cursor:pointer;">
          <span style="font-size: 1.2rem;">🤝</span>
          <span>¡Quiero unirme al Radar!</span>
        </button>
      </div>
    </div>
    
    ${descripcion ? `<div class="radar-desc-banner">${escapeHtml(descripcion)}</div>` : ''}

    <div class="tabs-bar" id="radar-tabs" style="margin-bottom: 20px;">
      ${DIAS_CONFIG.map((dia, i) => {
    const disponiblesHoy = jugadores.filter(j => estaDisponible(j, dia.key)).length;
    const isToday = i === todayIndex;
    return `<button class="tab-btn radar-day-tab ${isToday ? 'active' : ''}" 
          data-tab="${dia.key}">
          ${dia.emoji} ${dia.short}
          ${disponiblesHoy > 0 ? `<sup style="font-size:0.65rem; margin-left:3px; opacity:0.8;">${disponiblesHoy}</sup>` : ''}
          ${isToday ? '<span class="badge badge-gold" style="font-size:0.55rem; padding:1px 5px; margin-left:4px;">HOY</span>' : ''}
        </button>`;
  }).join('')}
    </div>

    <div id="radar-panels">
      ${DIAS_CONFIG.map((dia, i) => {
    const isToday = i === todayIndex;
    const jugadoresConDisp = jugadores.filter(j => estaDisponible(j, dia.key));
    const jugadoresSinDisp = jugadores.filter(j => !estaDisponible(j, dia.key));
    const todosOrdenados = [...jugadoresConDisp, ...jugadoresSinDisp];

    return `<div class="tab-panel ${isToday ? 'active' : ''}" data-panel="${dia.key}">
          <div class="radar-players-list-v3">
            ${todosOrdenados.length === 0
        ? `<div class="empty-state"><div class="empty-icon">📡</div><p>Sin jugadores registrados.</p></div>`
        : todosOrdenados.map((j, jIdx) => {
          const disp = j.disponibilidad?.[dia.key] || {};
          const disponible = estaDisponible(j, dia.key);
          const uniqueId = `radar-player-${dia.key}-${jIdx}`;
          return `
                  <div class="radar-card-v3 ${disponible ? 'radar-card-available' : 'radar-card-busy'}" id="${uniqueId}">
                    <div class="radar-card-header" onclick="toggleRadarProfile('${uniqueId}')">
                      <div class="radar-card-info">
                        <div class="radar-card-nick">${escapeHtml(j.nick || j.nombre || '?')}</div>
                        <div class="radar-card-horario">
                          <span class="radar-clock-icon">⏰</span>
                          ${disponible
              ? `<span style="color: var(--green);">${escapeHtml(disp.horario)}</span>`
              : `<span style="color: var(--text-faint);">No tengo disponible este día</span>`
            }
                        </div>
                        ${disp.excepcion ? `<div class="radar-card-excepcion">💬 ${escapeHtml(disp.excepcion)}</div>` : ''}
                      </div>
                      <button class="radar-expand-btn" aria-label="Expandir perfil">
                        <span class="radar-expand-icon">＋</span>
                      </button>
                    </div>
                    <div class="radar-profile-panel" style="display:none;">
                      <div class="radar-profile-grid">
                        ${j.zona ? `<div class="radar-profile-block">
                          <div class="radar-profile-label">📍 SECTORES</div>
                          <div class="radar-profile-value">${escapeHtml(j.zona)}</div>
                        </div>` : ''}
                        ${j.estilos ? `<div class="radar-profile-block">
                          <div class="radar-profile-label">🎲 ESTILOS</div>
                          <div class="radar-profile-value">${escapeHtml(j.estilos)}</div>
                        </div>` : ''}
                        ${j.coleccion ? `<div class="radar-profile-block radar-profile-full">
                          <div class="radar-profile-label">🎒 COLECCIÓN / PUEDO LLEVAR</div>
                          <div class="radar-profile-value">${escapeHtml(j.coleccion)}</div>
                        </div>` : ''}
                        ${j.favoritos ? `<div class="radar-profile-block radar-profile-full">
                          <div class="radar-profile-label">❤ FAVORITOS</div>
                          <div class="radar-profile-value">${escapeHtml(j.favoritos)}</div>
                        </div>` : ''}
                      </div>
                    </div>
                  </div>
                `;
        }).join('')
      }
          </div>
        </div>`;
  }).join('')}
    </div>
  `;

  setupTabs(el, 'radar-tabs', 'radar-panels');
}

function toggleRadarProfile(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const panel = card.querySelector('.radar-profile-panel');
  const icon = card.querySelector('.radar-expand-icon');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (icon) icon.textContent = isOpen ? '＋' : '－';
  card.classList.toggle('radar-card-expanded', !isOpen);
}
window.toggleRadarProfile = toggleRadarProfile;

/* ═══════════════════════════════════════════════════════
   SECCIÓN 6: MIEMBROS DESTACADOS
   ═══════════════════════════════════════════════════════ */

function renderMiembros(el, d) {
  const miembros = d?.miembros || {};

  const cats = [
    { key: 'participantes', icono: '🎮', label: 'Perfiles Personales' },
    { key: 'divulgadores', icono: '📢', label: 'Divulgadores' },
    { key: 'creadores', icono: '🎨', label: 'Creadores' },
    { key: 'organizaciones', icono: '🏛️', label: 'Organizaciones' },
    { key: 'tiendas', icono: '🛒', label: 'Tiendas' },
    { key: 'comunidades', icono: '🌍', label: 'Comunidades' }
  ];

  const tabsHTML = cats.map((c, i) => {
    const lista = miembros[c.key]?.lista || [];
    return `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${c.key}">${c.icono} ${c.label} <span class="nav-badge">${lista.length}</span></button>`;
  }).join('');

  const panelsHTML = cats.map((c, i) => {
    const cat = miembros[c.key] || { descripcion: '', lista: [] };
    const descHTML = cat.descripcion
      ? `<div class="section-description" style="font-style:italic; color:var(--text-dim); margin-bottom:16px; padding: 12px 16px; border-left: 3px solid var(--primary); background: rgba(255,255,255,0.03); border-radius: 4px;">${c.icono} ${escapeHtml(cat.descripcion)}</div>`
      : '';
    const gridHTML = cat.lista.length > 0
      ? `<div class="members-grid">${cat.lista.map(m => `
          <a href="${m.url ? escapeHtml(m.url) : '#'}" target="_blank" rel="noopener" class="member-card-btn">
            <span class="member-card-icon">${c.icono}</span>
            <span class="member-card-name">${escapeHtml(m.nombre)}</span>
          </a>`).join('')}</div>`
      : `<div style="text-align:center; padding:48px; color:var(--text-dim);"><div style="font-size:3rem;">${c.icono}</div><p>Aún no hay ${c.label.toLowerCase()} del grupo registrados.</p></div>`;

    return `<div class="tab-panel${i === 0 ? ' active' : ''}" data-panel="${c.key}">${descHTML}${gridHTML}</div>`;
  }).join('');

  el.innerHTML = `
    <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
      <div style="flex: 1 1 45%; min-width: 320px;">
        ${renderSectionHero('⭐ Miembros Destacados', 'La gente increíble que forma nuestra comunidad')}
      </div>
      <div class="radar-cta-card card">
        <div class="cta-icon">⭐</div>
        <div class="cta-text-wrap">
          <div class="cta-title">¿Aparecer aquí?</div>
          <p class="cta-desc">Completa el formulario para ser parte de los Miembros Destacados y compartir tus proyectos o redes con la comunidad.</p>
        </div>
        <button onclick="AuthManager.abrirModalProyecto()" class="btn btn-primary cta-btn" style="border:none; cursor:pointer;">
          <span style="font-size: 1.2rem;">📝</span>
          <span>¡Quiero participar!</span>
        </button>
      </div>
    </div>
    <!-- 🎒 Mis Logros (Medallas del Miembro Conectado) -->
    <div id="mochila-perfil-wrap" style="margin-bottom: 24px;"></div>
    <div class="tabs-bar" id="miembros-tabs">${tabsHTML}</div>
    <div id="miembros-panels">${panelsHTML}</div>
  `;

  setupTabs(el, 'miembros-tabs', 'miembros-panels');

  // Renderizar Mis Logros si el miembro está autenticado
  if (window.SalaFama && typeof window.SalaFama.renderMochila === 'function') {
    if (window.AuthManager && window.AuthManager.isAuthenticated()) {
      const currentNick = window.AuthManager.getNick();
      window.SalaFama.renderMochila(currentNick, 'mochila-perfil-wrap');
    }
  }
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN 7: MERCADO JUGÓN
   ═══════════════════════════════════════════════════════ */

function renderMercado(el, d) {
  const merc = d?.mercado || {};

  const venderRaw = merc.vender || [];
  const vender = venderRaw.filter(p => !isExpired(p.fechaExpiracion));

  const intercambiarRaw = merc.intercambiar || [];
  const intercambiar = intercambiarRaw.filter(p => !isExpired(p.fechaExpiracion));

  const regalarRaw = merc.regalar || [];
  const regalar = regalarRaw.filter(p => !isExpired(p.fechaExpiracion));

  const buscarRaw = merc.buscar || [];
  const buscar = buscarRaw.filter(p => !isExpired(p.fechaExpiracion));

  const ensenarRaw = merc.ensenar || [];
  const ensenar = ensenarRaw.filter(p => !isExpired(p.fechaExpiracion));

  const serviciosRaw = merc.servicios || [];
  const servicios = serviciosRaw.filter(p => !isExpired(p.fechaExpiracion));

  el.innerHTML = `
    <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
      <div style="flex: 1 1 45%; min-width: 320px;">
        ${renderSectionHero('🛒 El Mercado Jugón', 'Anuncios y servicios de la comunidad · Sin comisiones · Transparente')}
      </div>
      <div class="radar-cta-card card">
        <div class="cta-icon">📦</div>
        <div class="cta-text-wrap">
          <div class="cta-title">¿Quieres publicar aquí?</div>
          <p class="cta-desc">Publica tus juegos, accesorios o servicios en el Mercado Jugón. Sin comisiones, directo a la comunidad.</p>
        </div>
        <button onclick="AuthManager.abrirModalMercado()" class="btn btn-primary cta-btn" style="border:none; cursor:pointer;">
          <span style="font-size: 1.2rem;">🤝</span>
          <span>¡Publicar Anuncio!</span>
        </button>
      </div>
    </div>

    <div class="tabs-bar" id="merc-tabs">
      <button class="tab-btn active" data-tab="vender">🛒 Vender <span class="nav-badge">${vender.length}</span></button>
      <button class="tab-btn" data-tab="intercambiar">🔄 Intercambiar <span class="nav-badge">${intercambiar.length}</span></button>
      <button class="tab-btn" data-tab="regalar">🎁 Regalar <span class="nav-badge">${regalar.length}</span></button>
      <button class="tab-btn" data-tab="buscar">🔍 Buscar <span class="nav-badge">${buscar.length}</span></button>
      <button class="tab-btn" data-tab="ensenar">🎓 Enseñar <span class="nav-badge">${ensenar.length}</span></button>
      <button class="tab-btn" data-tab="servicios">🛠️ Servicios <span class="nav-badge">${servicios.length}</span></button>
    </div>

    <div id="merc-panels">
      <div class="tab-panel active" data-panel="vender">
        ${renderMarketGrid(vender, 'Venta', '🛒 Artículos en Venta')}
      </div>
      <div class="tab-panel" data-panel="intercambiar">
        ${renderMarketGrid(intercambiar, 'Intercambio', '🔄 Trueques Jugones')}
      </div>
      <div class="tab-panel" data-panel="regalar">
        ${renderMarketGrid(regalar, 'Regalo', '🎁 Regalos de Corazón')}
      </div>
      <div class="tab-panel" data-panel="buscar">
        ${renderMarketGrid(buscar, 'Busca', '🔍 Pedidos de la Comunidad')}
      </div>
      <div class="tab-panel" data-panel="ensenar">
        ${renderMarketGrid(ensenar, 'Clase', '🎓 Clases y Mentorías')}
      </div>
      <div class="tab-panel" data-panel="servicios">
        ${renderMarketGrid(servicios, 'Servicio', '🛠️ Otros Servicios')}
      </div>
    </div>
  `;

  setupTabs(el, 'merc-tabs', 'merc-panels');
}

function renderMarketGrid(items, type, title) {
  if (!items || items.length === 0) {
    return renderComingSoon('🛒', title, `No hay anuncios activos en esta categoría por ahora.`);
  }
  return `
    <div class="market-flex-grid">
      ${items.map(p => renderProductCardFull(p)).join('')}
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN: NOVEDADES INSTAGRAM (Feed de 7 Días)
   ═══════════════════════════════════════════════════════ */

function renderInstagram(el, d) {
  const postsRaw = d?.instagram || [];
  const formUrl = d?.instagram_form_url || 'https://forms.gle/placeholder_novedades_ig';

  // Función para calcular expiración (7 días exactos)
  function calcularExpiracion(post) {
    const ahora = new Date();
    let fechaExp = post.exp ? new Date(post.exp) : null;
    if (!fechaExp && post.timestamp) {
      fechaExp = new Date(new Date(post.timestamp).getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    if (!fechaExp) return { expirado: false, label: '⏳ Activo', nivel: 'ok' };

    const diffMs = fechaExp - ahora;
    if (diffMs <= 0) return { expirado: true, label: 'Expirado', nivel: 'exp' };

    const diffDias = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const diffHoras = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (diffDias > 1) {
      return { expirado: false, label: `⏳ Quedan ${diffDias} días`, nivel: 'ok' };
    } else if (diffDias === 1) {
      return { expirado: false, label: `⏳ Queda 1 día`, nivel: 'alerta' };
    } else {
      return { expirado: false, label: `⏳ Expira en ${diffHoras}h`, nivel: 'urgente' };
    }
  }

  // Filtrar publicaciones vigentes de los últimos 7 días
  const postsVigentes = postsRaw
    .map(p => ({ ...p, _expInfo: calcularExpiracion(p) }))
    .filter(p => !p._expInfo.expirado);

  const partidas = postsVigentes.filter(p => p.categoria === 'partidas');
  const reels = postsVigentes.filter(p => p.categoria === 'reels');
  const pintura = postsVigentes.filter(p => p.categoria === 'pintura');
  const resenas = postsVigentes.filter(p => p.categoria === 'resenas');

  // Comprobar autenticación para el botón de CTA
  const isAuth = window.AuthManager && typeof window.AuthManager.isAuthenticated === 'function' && window.AuthManager.isAuthenticated();
  const ctaButtonHtml = isAuth
    ? `<button onclick="AuthManager.abrirModalProyecto('participantes')" class="btn btn-primary cta-btn" style="border:none; cursor:pointer; background: linear-gradient(135deg, #db2777, #7c3aed, #f59e0b);">
         <span style="font-size: 1.2rem;">📸</span>
         <span>¡Promocionar en IG!</span>
       </button>`
    : `<button onclick="AuthManager.showModal('login')" class="btn btn-primary cta-btn" style="background: linear-gradient(135deg, #4f46e5, #7c3aed);">
         <span style="font-size: 1.2rem;">🔒</span>
         <span>Inicia sesión para compartir</span>
       </button>`;

  el.innerHTML = `
    <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
      <div style="flex: 1 1 45%; min-width: 320px;">
        ${renderSectionHero('📸 Novedades IG de la Comunidad', 'Publicaciones, fotos y reels compartidos por miembros · Vigencia de 7 días')}
      </div>
      <div class="radar-cta-card card" style="border-color: rgba(219, 39, 119, 0.35);">
        <div class="cta-icon" style="background: linear-gradient(135deg, rgba(219,39,119,0.2), rgba(124,58,237,0.2)); border: 1px solid rgba(219,39,119,0.4);">📸</div>
        <div class="cta-text-wrap">
          <div class="cta-title">¿Quieres promocionar tu Instagram aquí?</div>
          <p class="cta-desc">Comparte tus fotos de juegos, reels o proyectos con Amigos Jugones. Caducidad automática cada 7 días para mantener el feed fresco.</p>
        </div>
        ${ctaButtonHtml}
      </div>
    </div>

    <div class="tabs-bar" id="ig-tabs">
      <button class="tab-btn active" data-tab="todas">✨ Todas <span class="nav-badge">${postsVigentes.length}</span></button>
      <button class="tab-btn" data-tab="partidas">🎲 Partidas & Fotos <span class="nav-badge">${partidas.length}</span></button>
      <button class="tab-btn" data-tab="reels">🎬 Reels & Videos <span class="nav-badge">${reels.length}</span></button>
      <button class="tab-btn" data-tab="pintura">🎨 Pintura & Minis <span class="nav-badge">${pintura.length}</span></button>
      <button class="tab-btn" data-tab="resenas">📖 Reseñas <span class="nav-badge">${resenas.length}</span></button>
    </div>

    <div id="ig-panels">
      <div class="tab-panel active" data-panel="todas">
        ${renderInstagramGrid(postsVigentes, 'Todas las Novedades')}
      </div>
      <div class="tab-panel" data-panel="partidas">
        ${renderInstagramGrid(partidas, 'Partidas & Fotos de Mesas')}
      </div>
      <div class="tab-panel" data-panel="reels">
        ${renderInstagramGrid(reels, 'Reels & Videos Lúdicos')}
      </div>
      <div class="tab-panel" data-panel="pintura">
        ${renderInstagramGrid(pintura, 'Miniaturas & Pintura')}
      </div>
      <div class="tab-panel" data-panel="resenas">
        ${renderInstagramGrid(resenas, 'Reseñas & Unboxings')}
      </div>
    </div>
  `;

  setupTabs(el, 'ig-tabs', 'ig-panels');
}

function renderInstagramGrid(items, title) {
  if (!items || items.length === 0) {
    return renderComingSoon('📸', title, 'No hay publicaciones activas en esta categoría en los últimos 7 días.');
  }

  return `
    <div class="ig-feed-grid">
      ${items.map(p => renderInstagramCard(p)).join('')}
    </div>
  `;
}

function renderInstagramCard(p) {
  const badgeMap = {
    'partidas': { icon: '🎲', label: 'Partida' },
    'reels': { icon: '🎬', label: 'Reel' },
    'pintura': { icon: '🎨', label: 'Pintura' },
    'resenas': { icon: '📖', label: 'Reseña' }
  };
  const cat = badgeMap[p.categoria] || { icon: '📸', label: 'Post' };
  const expNivel = p._expInfo?.nivel || 'ok';
  const expLabel = p._expInfo?.label || '⏳ 7 días';
  const igHandle = p.ig_user ? `@${p.ig_user.replace('@', '')}` : '@amigosjugones';
  const igLink = p.link || `https://www.instagram.com/${p.ig_user ? p.ig_user.replace('@', '') : ''}`;

  return `
    <article class="ig-card card">
      <div class="ig-card-header">
        <div class="ig-user-info">
          <div class="ig-avatar-badge">${(p.nick || 'J').slice(0, 2).toUpperCase()}</div>
          <div class="ig-user-meta">
            <span class="ig-user-nick">${p.nick || 'Jugón'}</span>
            <a href="${igLink}" target="_blank" class="ig-user-handle" title="Visitar perfil en Instagram">${igHandle}</a>
          </div>
        </div>
        <span class="ig-exp-badge ${expNivel}">${expLabel}</span>
      </div>

      <div class="ig-card-media">
        <img src="${p.foto || 'imagenes/LOGO%20AMIGOS%20JUGONES.png'}" alt="${p.titulo}" class="ig-card-img" loading="lazy" onerror="this.src='imagenes/LOGO%20AMIGOS%20JUGONES.png'">
        <span class="ig-cat-badge">${cat.icon} ${cat.label}</span>
      </div>

      <div class="ig-card-content">
        <h3 class="ig-card-title">${p.titulo}</h3>
        <p class="ig-card-desc">${p.descripcion}</p>
      </div>

      <div class="ig-card-footer">
        <a href="${igLink}" target="_blank" class="ig-card-btn" rel="noopener noreferrer">
          <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          <span>Ver en Instagram</span>
        </a>
      </div>
    </article>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN: TORNEOS PRIVADOS BGA & RINCÓN DE LA FAMA
   ═══════════════════════════════════════════════════════ */

function renderTorneos(el, d) {
  const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
  const torneosObj = d?.torneos || {};
  const activos = torneosObj.activos || [];
  const fama = torneosObj.rincon_fama || [];

  // Muro de seguridad: Si no está autenticado, pantalla de bloqueo
  if (!isAuth) {
    el.innerHTML = `
      ${renderSectionHero('🏆 Torneos Privados BGA', 'Competencias oficiales en Board Game Arena exclusivas para la comunidad', 'ACCESO EXCLUSIVO')}
      
      <div class="card glow" style="margin: 30px auto; max-width: 620px; text-align: center; padding: 44px 24px; border: 1px solid rgba(245, 158, 11, 0.45); background: linear-gradient(145deg, #161226 0%, #0d0c1c 100%); border-radius: var(--radius-lg); box-shadow: 0 12px 45px rgba(0,0,0,0.7), 0 0 25px rgba(245, 158, 11, 0.15);">
        <div style="font-size: 3.8rem; margin-bottom: 12px; filter: drop-shadow(0 0 16px rgba(245, 158, 11, 0.45));">🔒</div>
        <h2 style="color: var(--text, #fff); font-size: 1.45rem; font-weight: 800; margin-bottom: 10px;">Sala Privada de Torneos BGA</h2>
        <p style="color: var(--text-dim, #9ca3af); font-size: 0.92rem; max-width: 480px; margin: 0 auto 18px auto; line-height: 1.6;">
          Los torneos de Board Game Arena y sus enlaces directos son de carácter estrictamente privado para los miembros de <strong>Amigos Jugones</strong> para evitar intrusos.
        </p>

        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 12px 16px; margin: 0 auto 24px auto; max-width: 480px; font-size: 0.8rem; color: #fde68a; line-height: 1.45; text-align: left;">
          <strong style="color: #f59e0b; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span>🛡️</span> Protección de Enlace Seguro
          </strong>
          Identifícate con tu Nick de miembro verificado para desbloquear los enlaces de acceso directo a los torneos activos y consultar el Rincón de la Fama.
        </div>

        <button onclick="AuthManager.showModal({ reason: 'Identifícate con tus credenciales de miembro para ingresar a los torneos privados de BGA.' })" class="btn btn-primary" style="padding: 13px 30px; font-size: 0.95rem; font-weight: 800; background: linear-gradient(135deg, #f59e0b 0%, #db2777 50%, #7c3aed 100%); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.35);">
          Desbloquear Torneos 🏆
        </button>
      </div>
    `;
    return;
  }

  // Si está autenticado: Renderizar Lobby en Vivo, Historial y Salón de Campeones
  el.innerHTML = `
    <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
      <div style="flex: 1 1 45%; min-width: 300px;">
        ${renderSectionHero('🏆 Torneos Privados BGA', 'Seguimiento en vivo de inscritos, rondas, podios y Salón de Campeones')}
      </div>
      <div class="radar-cta-card card" style="border-color: rgba(245, 158, 11, 0.35);">
        <div class="cta-icon" style="background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(219,39,119,0.2)); border: 1px solid rgba(245,158,11,0.4);">⚔️</div>
        <div class="cta-text-wrap">
          <div class="cta-title">¿Cómo participar en los torneos?</div>
          <p class="cta-desc">Inscríbete en BGA con tu cuenta. El progreso, los cruces y tus medallas históricas se actualizan automáticamente.</p>
        </div>
      </div>
    </div>

    <div class="tabs-bar" id="torneo-tabs">
      <button class="tab-btn active" data-tab="activos">🔥 En Vivo <span class="nav-badge" id="torneo-badge-activos">${activos.length}</span></button>
      <button class="tab-btn" data-tab="finalizados">🏁 Finalizados <span class="nav-badge" id="torneo-badge-finalizados">0</span></button>
      <button class="tab-btn" data-tab="fama">👑 Salón de Campeones <span class="nav-badge" id="torneo-badge-fama">${fama.length}</span></button>
    </div>

    <div id="torneo-panels">
      <div class="tab-panel active" data-panel="activos" id="torneo-panel-activos">
        ${renderTorneosActivosGrid(activos)}
      </div>
      <div class="tab-panel" data-panel="finalizados" id="torneo-panel-finalizados">
        <div class="torneo-loading-box">⏳ Cargando historial de torneos BGA...</div>
      </div>
      <div class="tab-panel" data-panel="fama" id="torneo-panel-fama">
        ${renderRinconFamaGrid(fama)}
      </div>
    </div>
  `;

  setupTabs(el, 'torneo-tabs', 'torneo-panels');
  _cargarTorneosEnVivo(activos, fama);
}

async function _cargarTorneosEnVivo(activosFallback, famaFallback) {
  const apiUrl = window.AJ_CONFIG && typeof window.AJ_CONFIG.apiUrl === 'function'
    ? window.AJ_CONFIG.apiUrl('/api/torneos/publico')
    : '/api/torneos/publico';
  try {
    const resp = await fetch(apiUrl);
    if (!resp.ok) return;
    const data = await resp.json();
    if (!data || !data.ok) return;

    const activosLive = Array.isArray(data.activos) ? data.activos : [];
    const finalizadosLive = Array.isArray(data.finalizados) ? data.finalizados : [];
    const campeonesLive = Array.isArray(data.campeones) ? data.campeones : [];

    const pActivos = document.getElementById('torneo-panel-activos');
    const pFin = document.getElementById('torneo-panel-finalizados');
    const pFama = document.getElementById('torneo-panel-fama');
    const bAct = document.getElementById('torneo-badge-activos');
    const bFin = document.getElementById('torneo-badge-finalizados');
    const bFama = document.getElementById('torneo-badge-fama');

    if (pActivos) {
      const htmlAct = renderTorneosActivosLive(activosLive, activosFallback);
      pActivos.innerHTML = htmlAct;
      if (bAct) bAct.textContent = String(activosLive.length || (activosFallback ? activosFallback.length : 0));
    }
    if (pFin) {
      pFin.innerHTML = renderTorneosFinalizadosLive(finalizadosLive);
      if (bFin) bFin.textContent = String(finalizadosLive.length);
    }
    if (pFama) {
      pFama.innerHTML = renderSalonCampeonesLive(campeonesLive, famaFallback);
      if (bFama) bFama.textContent = String(campeonesLive.length || (famaFallback ? famaFallback.length : 0));
    }
  } catch (e) {
    // Fallback silencioso a datos.json ya renderizado
  }
}

function renderTorneosActivosLive(liveItems, fallbackItems) {
  if ((!liveItems || liveItems.length === 0) && (!fallbackItems || fallbackItems.length === 0)) {
    return renderComingSoon('🏆', 'Torneos BGA', 'No hay torneos activos en este momento. ¡Atento a los avisos oficiales para la próxima convocatoria!');
  }
  const liveCards = (liveItems || []).map(t => renderTorneoLiveCard(t, false)).join('');
  const liveUrls = new Set((liveItems || []).map(t => String(t.bga_url || '').trim()).filter(Boolean));
  const extraFallback = (fallbackItems || []).filter(f => !liveUrls.has(String(f.bga_url || '').trim()));
  const fallbackCards = extraFallback.map(t => renderTorneoCard(t)).join('');
  return `<div class="torneo-live-stack">${liveCards}${fallbackCards ? `<div class="torneo-grid">${fallbackCards}</div>` : ''}</div>`;
}

function renderTorneosFinalizadosLive(items) {
  if (!items || items.length === 0) {
    return renderComingSoon('🏁', 'Historial de Torneos', 'Aún no hay torneos finalizados sincronizados desde BGA.');
  }
  return `<div class="torneo-live-stack">${items.map(t => renderTorneoLiveCard(t, true)).join('')}</div>`;
}

function _getTorneoProgressStep(t, isFinished) {
  if (isFinished) return { pct: 100, label: 'Finalizado', step: 3 };
  const st = String(t.status || '').toLowerCase();
  const hasRounds = t.detalle && t.detalle.bracket && Array.isArray(t.detalle.bracket.rounds) && t.detalle.bracket.rounds.length > 0;
  const hasScores = Array.isArray(t.participantes) && t.participantes.some(p => p.rank_actual && Number(p.rank_actual) < 999);
  if (st.includes('curso') || st.includes('progreso') || hasRounds || hasScores || Number(t.current_round || 0) > 0) {
    const rnd = t.current_round ? `Ronda ${t.current_round}` : 'En Curso';
    return { pct: 66, label: rnd, step: 2 };
  }
  return { pct: 33, label: 'Inscripciones', step: 1 };
}

function renderTorneoLiveCard(t, isFinished) {
  const nombre = escapeHtml(t.tournament_name || 'Torneo BGA');
  const juego = escapeHtml(t.game || 'Board Game Arena');
  const participantes = Array.isArray(t.participantes) ? t.participantes : [];
  const totalPlayers = Math.max(Number(t.total_players || 0), participantes.length);
  const prog = _getTorneoProgressStep(t, isFinished);
  const detalle = t.detalle || {};
  const hasBracket = detalle.bracket && Array.isArray(detalle.bracket.rounds) && detalle.bracket.rounds.length > 0;
  const bgaUrl = escapeHtml(t.bga_url || 'https://boardgamearena.com');
  const fechaStr = escapeHtml(String(t.actualizado_en || '').slice(0, 10));

  return `
    <article class="torneo-live-card card ${isFinished ? 'is-finished' : 'is-active'}">
      <div class="torneo-live-top">
        <div class="torneo-live-title-wrap">
          <div class="torneo-live-badges">
            <span class="torneo-game-pill">🎲 ${juego}</span>
            <span class="torneo-state-pill ${isFinished ? 'done' : 'live'}">
              ${isFinished ? '🏁 Finalizado' : `<span class="live-dot"></span> ${escapeHtml(prog.label)}`}
            </span>
          </div>
          <h3 class="torneo-live-title">${nombre}</h3>
          <div class="torneo-live-sub">👥 ${totalPlayers} participantes · 🕒 Act. ${fechaStr || 'reciente'}</div>
        </div>
        <a href="${bgaUrl}" target="_blank" rel="noopener noreferrer" class="btn-torneo-bga-sm">
          <span>Ver en BGA ↗</span>
        </a>
      </div>

      <div class="torneo-progress-track" aria-label="Progreso del torneo">
        <div class="torneo-progress-fill" style="width:${prog.pct}%"></div>
        <div class="torneo-progress-steps">
          <span class="${prog.step >= 1 ? 'done' : ''}">1. Inscritos</span>
          <span class="${prog.step >= 2 ? 'done' : ''}">2. En Juego</span>
          <span class="${prog.step >= 3 ? 'done' : ''}">3. Podio</span>
        </div>
      </div>

      ${isFinished ? renderTorneoPodiumHTML(t, participantes, detalle) : ''}

      <details class="torneo-accordion" ${!isFinished && participantes.length > 0 && participantes.length <= 16 ? '' : ''}>
        <summary>👥 Lista de inscritos (${participantes.length})</summary>
        <div class="torneo-inscritos-chips">
          ${participantes.length === 0
            ? '<span class="torneo-empty-note">Aún no se sincronizaron participantes.</span>'
            : participantes.map(p => {
                const club = p.nick_web || p.nick_aj;
                const bga = p.bga_username || '';
                const rk = (p.rank_actual && Number(p.rank_actual) < 999) ? `#${p.rank_actual} ` : '';
                return `
                  <span class="torneo-player-chip ${club ? 'linked' : ''}">
                    ${rk ? `<strong>${rk}</strong>` : ''}
                    <span>${escapeHtml(club || bga)}</span>
                    ${club && bga && club.toLowerCase() !== bga.toLowerCase() ? `<small>BGA: ${escapeHtml(bga)}</small>` : ''}
                  </span>
                `;
              }).join('')}
        </div>
      </details>

      ${hasBracket ? `
        <details class="torneo-accordion" ${!isFinished ? 'open' : ''}>
          <summary>⚔️ Cuadro de llaves (${detalle.bracket.rounds.length} rondas)</summary>
          ${renderTorneoBracketHTML(detalle.bracket)}
        </details>
      ` : (participantes.some(p => p.rank_actual && Number(p.rank_actual) < 999) ? `
        <details class="torneo-accordion" ${!isFinished ? 'open' : ''}>
          <summary>📊 Clasificación actual</summary>
          ${renderTorneoSwissHTML(participantes)}
        </details>
      ` : '')}
    </article>
  `;
}

function renderTorneoPodiumHTML(t, participantes, detalle) {
  const pod = detalle && detalle.podium ? detalle.podium : null;
  let first = pod && pod.first ? [pod.first] : [];
  let second = pod && pod.second ? [pod.second] : [];
  let thirds = pod && Array.isArray(pod.thirds) ? pod.thirds : [];

  if (first.length === 0) first = participantes.filter(p => Number(p.rank_actual) === 1);
  if (second.length === 0) second = participantes.filter(p => Number(p.rank_actual) === 2);
  if (thirds.length === 0) thirds = participantes.filter(p => Number(p.rank_actual) === 3);

  const fmtNames = (arr, fallback) => {
    if (!arr || arr.length === 0) return fallback;
    return arr.map(x => escapeHtml(x.nick_web || x.nick_aj || x.name || x.bga_username || fallback)).join('<br>');
  };

  return `
    <div class="fama-podium torneo-podium-live">
      <div class="fama-step plata">
        <div class="fama-step-badge">🥈 2.°</div>
        <div class="fama-step-nick">${fmtNames(second, '—')}</div>
        <div class="fama-step-pillar"></div>
      </div>
      <div class="fama-step oro">
        <div class="fama-crown">👑</div>
        <div class="fama-step-badge">🥇 1.° CAMPEÓN</div>
        <div class="fama-step-nick">${fmtNames(first, '—')}</div>
        <div class="fama-step-pillar"></div>
      </div>
      <div class="fama-step bronce">
        <div class="fama-step-badge">🥉 3.°${thirds.length > 1 ? ` (x${thirds.length})` : ''}</div>
        <div class="fama-step-nick">${fmtNames(thirds, '—')}</div>
        <div class="fama-step-pillar"></div>
      </div>
    </div>
  `;
}

function renderTorneoBracketHTML(bracket) {
  const rounds = bracket.rounds || [];
  return `
    <div class="torneo-bracket-scroll">
      ${rounds.map(r => `
        <div class="torneo-bracket-round">
          <div class="torneo-bracket-round-title">${escapeHtml(r.name || 'Ronda')}</div>
          <div class="torneo-bracket-matches">
            ${(r.matches || []).map(m => {
              const st = String(m.status || '').toLowerCase();
              const isLive = st.includes('curso') || st.includes('progreso');
              const pList = Array.isArray(m.players) ? m.players : [];
              return `
                <div class="torneo-match-box ${isLive ? 'is-live' : ''}">
                  <div class="torneo-match-status">${escapeHtml(m.status || '')}</div>
                  ${pList.map(pl => {
                    const isWin = String(pl.rank || '') === '1' || pl.isWinner;
                    return `
                      <div class="torneo-match-player ${isWin ? 'winner' : ''}">
                        <span>${escapeHtml(pl.name || 'Por definir')}</span>
                        ${pl.rank ? `<small>${escapeHtml(String(pl.rank))}.°</small>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTorneoSwissHTML(participantes) {
  const sorted = [...participantes].sort((a, b) => (Number(a.rank_actual || 999) - Number(b.rank_actual || 999)));
  return `
    <div class="torneo-swiss-list">
      ${sorted.map(p => {
        const rk = Number(p.rank_actual || 0);
        const medal = rk === 1 ? '🥇' : rk === 2 ? '🥈' : rk === 3 ? '🥉' : (rk > 0 && rk < 999 ? `#${rk}` : '•');
        const name = escapeHtml(p.nick_web || p.nick_aj || p.bga_username || 'Jugador');
        const score = escapeHtml(String(p.score || ''));
        return `
          <div class="torneo-swiss-row rank-${rk <= 3 ? rk : 'other'}">
            <span class="swiss-rank">${medal}</span>
            <span class="swiss-name">${name}</span>
            <span class="swiss-score">${score ? `⭐ ${score}` : ''}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSalonCampeonesLive(campeones, famaFallback) {
  if (!campeones || campeones.length === 0) {
    return renderRinconFamaGrid(famaFallback);
  }
  return `
    <div class="campeones-list">
      ${campeones.map((c, idx) => `
        <details class="campeon-row card" ${idx < 3 ? 'open' : ''}>
          <summary class="campeon-summary">
            <div class="campeon-rank">#${idx + 1}</div>
            <div class="campeon-info">
              <div class="campeon-name">${escapeHtml(c.jugador)} ${c.vinculado ? '<span class="campeon-linked" title="Miembro web verificado">🔗</span>' : ''}</div>
              <div class="campeon-xp">⭐ ${Number(c.puntos_torneos || 0)} XP · ${c.total_podios} podio(s)</div>
            </div>
            <div class="campeon-medals">
              ${c.oro ? `<span class="medal-pill oro">🥇 ${c.oro}</span>` : ''}
              ${c.plata ? `<span class="medal-pill plata">🥈 ${c.plata}</span>` : ''}
              ${c.bronce ? `<span class="medal-pill bronce">🥉 ${c.bronce}</span>` : ''}
            </div>
          </summary>
          <div class="campeon-torneos-list">
            ${(c.torneos || []).map(t => {
              const m = t.rank === 1 ? '🥇 1.°' : t.rank === 2 ? '🥈 2.°' : '🥉 3.°';
              return `
                <div class="campeon-torneo-item">
                  <span>${m}</span>
                  <strong>${escapeHtml(t.tournament_name)}</strong>
                  <small>🎲 ${escapeHtml(t.game || 'BGA')} · ${escapeHtml(t.fecha || '')}</small>
                </div>
              `;
            }).join('')}
          </div>
        </details>
      `).join('')}
    </div>
  `;
}

function renderTorneosActivosGrid(items) {
  if (!items || items.length === 0) {
    return renderComingSoon('🏆', 'Torneos BGA', 'No hay torneos activos en este momento. ¡Atento a los avisos oficiales para la próxima convocatoria!');
  }

  return `
    <div class="torneo-grid">
      ${items.map(t => renderTorneoCard(t)).join('')}
    </div>
  `;
}

function renderTorneoCard(t) {
  const currentNick = window.AuthManager ? (window.AuthManager.getNick() || '').toUpperCase() : '';
  const isAdmin = currentNick === 'BLACK' || (window.AuthManager && window.AuthManager.isAdmin && window.AuthManager.isAdmin());

  const statusClass = t.estado === 'en_curso' ? 'en_curso' : 'inscripciones';
  const statusBadge = t.estado_label || (t.estado === 'en_curso' ? '🟢 En Curso' : '🟡 Inscripciones');

  return `
    <article class="torneo-card card">
      <div class="torneo-card-media">
        <img src="${t.imagen || 'imagenes/LOGO%20AMIGOS%20JUGONES.png'}" alt="${t.juego}" class="torneo-card-img" loading="lazy">
        <span class="torneo-status-badge ${statusClass}">${statusBadge}</span>
        <span class="torneo-game-tag">🎲 ${t.juego}</span>
      </div>

      <div class="torneo-card-body">
        <h3 class="torneo-card-title">${t.titulo}</h3>
        
        <div class="torneo-meta-list">
          <div class="torneo-meta-item">
            <span>📅</span> <span><strong>Horario:</strong> ${t.fecha_display || (t.fecha + ' ' + t.hora)}</span>
          </div>
          <div class="torneo-meta-item">
            <span>⏱️</span> <span><strong>Modalidad:</strong> ${t.modalidad || 'En vivo'}</span>
          </div>
          <div class="torneo-meta-item">
            <span>♟️</span> <span><strong>Formato:</strong> ${t.formato || 'Suizo'}</span>
          </div>
          <div class="torneo-meta-item">
            <span>👥</span> <span><strong>Cupos:</strong> ${t.inscritos_count || 0} / ${t.cupos_max || 16} jugadores</span>
          </div>
          ${t.puntos_premio ? `
          <div class="torneo-meta-item premio">
            <span>🎁</span> <span><strong>Premio:</strong> ${t.puntos_premio}</span>
          </div>` : ''}
        </div>
      </div>

      <div class="torneo-card-footer">
        <a href="${t.bga_url || 'https://boardgamearena.com'}" target="_blank" class="btn-torneo-bga" rel="noopener noreferrer">
          <span>🏆</span> <span>Entrar al Torneo en BGA ↗</span>
        </a>
        ${isAdmin ? `
          <button onclick="revocarTorneo('${t.id}')" class="btn-torneo-revocar" title="Revocar torneo (solo administradores)">
            <span>🚫</span> <span>Revocar</span>
          </button>
        ` : ''}
      </div>
    </article>
  `;
}

function revocarTorneo(id) {
  if (confirm('¿Estás seguro de que deseas revocar/cancelar este torneo? Se removerá del panel para los miembros.')) {
    const btn = event.target.closest('button');
    const card = btn ? btn.closest('.torneo-card') : null;
    if (card) {
      card.style.opacity = '0.3';
      card.style.pointerEvents = 'none';
      setTimeout(() => card.remove(), 400);
    }
    alert('Torneo revocado. Puedes notificar al grupo o a Lunara para cancelar la mesa en BGA.');
  }
}
window.revocarTorneo = revocarTorneo;

function renderRinconFamaGrid(items) {
  if (!items || items.length === 0) {
    return renderComingSoon('👑', 'Rincón de la Fama', 'Aún no se han registrado podios históricos de torneos BGA.');
  }

  return `
    <div class="fama-grid">
      ${items.map(f => renderFamaCard(f)).join('')}
    </div>
  `;
}

function renderFamaCard(f) {
  return `
    <article class="fama-card card">
      <div class="fama-card-header">
        <div class="fama-header-info">
          <span class="fama-game-badge">🎲 ${f.juego}</span>
          <h3 class="fama-title">${f.torneo_titulo}</h3>
          <span class="fama-date">📅 ${f.fecha} · ${f.participantes || 0} competidores</span>
        </div>
      </div>

      <!-- Podio de Honor (3 escalones) -->
      <div class="fama-podium">
        <!-- 2do Lugar (Plata) -->
        <div class="fama-step plata">
          <div class="fama-step-badge">🥈 2°</div>
          <div class="fama-step-nick">${f.plata?.nick || 'Plata'}</div>
          <div class="fama-step-pillar"></div>
        </div>

        <!-- 1er Lugar (Oro - Centro más alto) -->
        <div class="fama-step oro">
          <div class="fama-crown">👑</div>
          <div class="fama-step-badge">🥇 1° CAMPEÓN</div>
          <div class="fama-step-nick">${f.oro?.nick || 'Oro'}</div>
          <div class="fama-step-pillar"></div>
        </div>

        <!-- 3er Lugar (Bronce) -->
        <div class="fama-step bronce">
          <div class="fama-step-badge">🥉 3°</div>
          <div class="fama-step-nick">${f.bronce?.nick || 'Bronce'}</div>
          <div class="fama-step-pillar"></div>
        </div>
      </div>

      ${f.descripcion ? `
        <div class="fama-desc">
          <span>📜</span> <em>"${f.descripcion}"</em>
        </div>
      ` : ''}
    </article>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN 9: DOCUMENTOS
   ═══════════════════════════════════════════════════════ */

function renderDocumentos(el, d) {
  const docObj = d?.documentos || {};
  let docs = docObj.texto || d?.documentos_texto || [];
  if (docs.length === 0) docs = getDefaultDocs();

  const imagenes = docObj.imagenes || d?.documentos_imagenes || [];
  const audios = docObj.audios || d?.documentos_audios || [];
  const manuales = docObj.manuales || d?.documentos_manuales || [];

  el.innerHTML = `
    ${renderSectionHero('📄 Recursos & Documentos', 'Manuales, audios y materiales gráficos oficiales de la comunidad')}

    <div class="tabs-bar" id="doc-tabs">
      <button class="tab-btn active" data-tab="texto">📄 Documentos</button>
      <button class="tab-btn" data-tab="imagenes">🖼️ Imágenes</button>
      <button class="tab-btn" data-tab="audios">🎙️ Audios</button>
      <button class="tab-btn" data-tab="manuales">🎲 Manuales JDM</button>
    </div>

    <div id="doc-panels">
      <div class="tab-panel active" data-panel="texto">
        ${renderDocGrid(docs, 'documento', '📄 Reglamentos del Grupo')}
      </div>
      <div class="tab-panel" data-panel="imagenes">
        ${renderDocGrid(imagenes, 'imagen', '🖼️ Galería de Materiales')}
      </div>
      <div class="tab-panel" data-panel="audios">
        ${renderDocGrid(audios, 'audio', '🎙️ Podcasts y Audio-Cápsulas')}
      </div>
      <div class="tab-panel" data-panel="manuales">
        ${renderDocGrid(manuales, 'manual', '🎲 Reglamentos de Juegos de Mesa')}
      </div>
    </div>
  `;

  setupTabs(el, 'doc-tabs', 'doc-panels');
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN 9B: FORMULARIOS
   ═══════════════════════════════════════════════════════ */

function renderFormularios(el, d) {
  const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
  const forms = d?.remaining?.contenido?.Inscripciones?.items || buildFormsList(d?.formularios) || getDefaultForms();

  if (!isAuth) {
    el.innerHTML = `
      ${renderSectionHero('📝 Formularios del Ecosistema', 'Los formularios oficiales de Amigos Jugones · Tu participación alimenta la web', 'EXCLUSIVO MIEMBROS')}
      
      <div class="card glow" style="margin: 30px auto; max-width: 620px; text-align: center; padding: 40px 24px; border: 1px solid rgba(168, 85, 247, 0.45); background: linear-gradient(145deg, #121028 0%, #0d0d1e 100%); border-radius: var(--radius-lg); box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
        <div style="font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 0 16px rgba(236, 72, 153, 0.45));">🔒</div>
        <h2 style="color: var(--text); font-size: 1.4rem; font-weight: 800; margin-bottom: 8px;">Área Exclusiva para Miembros</h2>
        <p style="color: var(--text-dim); font-size: 0.9rem; max-width: 480px; margin: 0 auto 16px auto; line-height: 1.6;">
          Los formularios del ecosistema (Mercado, Radar Jugón, Creadores, Tiendas, Cumpleaños, etc.) son exclusivos para los integrantes del grupo de WhatsApp.
        </p>

        <!-- Aclaración: Autenticación por Única Vez -->
        <div style="background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: var(--radius-sm); padding: 12px 14px; margin: 0 auto 22px auto; max-width: 480px; font-size: 0.78rem; color: var(--text-dim); line-height: 1.45; text-align: left;">
          <strong style="color: var(--accent-light); display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
            <span>🛡️</span> Autenticación por Única Vez
          </strong>
          Al identificarte, el navegador guarda tu credencial segura de miembro. No tendrás que volver a ingresar tus datos ni depender de las rotaciones de clave semanal para acceder a los formularios.
        </div>

        <button onclick="AuthManager.showModal({ reason: 'Identifícate con tus credenciales de miembro para acceder a los formularios oficiales.' })" class="arcade-start-btn" style="padding: 13px 26px; font-size: 0.95rem; font-weight: 800; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase;">
          Desbloquear Formularios 🚀
        </button>
        <div style="margin-top: 18px; font-size: 0.75rem; color: var(--text-faint);">
          Para pruebas de desarrollo, puedes usar la clave <code>AJ2026</code> o el botón de <em>Acceso Rápido (Dev Mode)</em> en el modal.
        </div>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    ${renderSectionHero('📝 Formularios del Ecosistema', 'Los formularios oficiales de Amigos Jugones · Tu participación alimenta la web')}
    <div class="formularios-auth-banner" style="display:flex; justify-content:space-between; align-items:center; background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.3); border-radius:var(--radius-sm); padding:10px 16px; margin-bottom:20px;">
      <div style="font-size:0.85rem; color:var(--text); font-weight:600;">
        🔓 Sesión activa como <strong>${escapeHtml(window.AuthManager.getNick())}</strong>. Formularios desbloqueados.
      </div>
      <span class="badge formularios-verified-badge" style="background:rgba(16, 185, 129, 0.2); color:var(--green); border:1px solid var(--green); font-size:0.7rem; flex-shrink:0; text-align:center; justify-content:center;">Miembro Verificado</span>
    </div>
    <div class="grid-2">
      ${forms.map(f => `
        <div class="form-card" role="button" tabindex="0" style="cursor:pointer;"
          onclick="${f.onclick || 'void(0)'}"
          onkeydown="if(event.key==='Enter'||event.key===' '){${f.onclick || 'void(0)'}}"
        >
          <div class="form-icon">${f.icono || '📝'}</div>
          <div class="form-info">
            <div class="form-name">${escapeHtml(f.nombre)}</div>
            <div class="form-sub">${escapeHtml(f.descripcion || '')}</div>
            ${f.alimenta ? `<div class="form-feeds">→ Alimenta: ${escapeHtml(f.alimenta)}</div>` : ''}
          </div>
          <span class="doc-arrow text-green">→</span>
        </div>
      `).join('')}
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   ENCUESTAS GEEK SEMANALES — FORMATO 9:16 & SABOR COMUNITARIO
   ═══════════════════════════════════════════════════════ */

const ENCUESTAS_CATEGORIAS = {
  juegos_mesa: { label: 'Juegos de Mesa', icon: '🎲', color: '#7c3aed', glow: 'rgba(124,58,237,0.4)', grad: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
  peliculas: { label: 'Películas', icon: '🎬', color: '#dc2626', glow: 'rgba(220,38,38,0.4)', grad: 'linear-gradient(135deg,#7f1d1d,#dc2626)' },
  series: { label: 'Series', icon: '📺', color: '#0284c7', glow: 'rgba(2,132,199,0.4)', grad: 'linear-gradient(135deg,#0c4a6e,#0284c7)' },
  videojuegos: { label: 'Videojuegos', icon: '🎮', color: '#16a34a', glow: 'rgba(22,163,74,0.4)', grad: 'linear-gradient(135deg,#14532d,#16a34a)' },
  musica: { label: 'Música', icon: '🎵', color: '#d97706', glow: 'rgba(217,119,6,0.4)', grad: 'linear-gradient(135deg,#78350f,#d97706)' },
  anime: { label: 'Anime', icon: '⛩️', color: '#e11d48', glow: 'rgba(225,29,72,0.4)', grad: 'linear-gradient(135deg,#881337,#e11d48)' },
  comics_manga: { label: 'Cómics & Manga', icon: '📚', color: '#9333ea', glow: 'rgba(147,51,234,0.4)', grad: 'linear-gradient(135deg,#581c87,#9333ea)' },
  libros: { label: 'Libros', icon: '📖', color: '#0891b2', glow: 'rgba(8,145,178,0.4)', grad: 'linear-gradient(135deg,#164e63,#0891b2)' },
};

const ENCUESTAS_PUNTUACIONES = [
  { score: 10, icon: '👑', color: '#10b981', bg: 'rgba(16,185,129,0.18)', border: '#10b981', label: 'Obra Maestra', desc: 'Me lo llevo a la tumba. Perfección absoluta.' },
  { score: 9, icon: '🔥', color: '#22c55e', bg: 'rgba(34,197,94,0.16)', border: '#22c55e', label: 'Joya Absoluta', desc: 'Imprescindible. Nunca digo que no a una partida.' },
  { score: 8, icon: '✨', color: '#06b6d4', bg: 'rgba(6,182,212,0.16)', border: '#06b6d4', label: 'Muy Bueno', desc: 'Partidaza garantizada. Siempre cumple y divierte.' },
  { score: 7, icon: '🎲', color: '#3b82f6', bg: 'rgba(59,130,246,0.16)', border: '#3b82f6', label: 'Cumplidor', desc: 'Buen juego. Sale con agrado a mesa.' },
  { score: 6, icon: '⚖️', color: '#818cf8', bg: 'rgba(129,140,248,0.16)', border: '#818cf8', label: 'Pasable', desc: 'Tiene cositas, pero no me enamora ni me mata.' },
  { score: 5, icon: '🥱', color: '#eab308', bg: 'rgba(234,179,8,0.16)', border: '#eab308', label: 'Reguleque / Meh', desc: 'Mucho ruido y pocas nueces. Muy sobrevalorado.' },
  { score: 4, icon: '📉', color: '#f97316', bg: 'rgba(249,115,22,0.16)', border: '#f97316', label: 'Flojo', desc: 'Le falta testeo o alma. Se me hace eterno en mesa.' },
  { score: 3, icon: '🛑', color: '#ef4444', bg: 'rgba(239,68,68,0.16)', border: '#ef4444', label: 'Malo', desc: 'Dolor de cabeza. Hay 100 mejores para jugar.' },
  { score: 2, icon: '🗑️', color: '#dc2626', bg: 'rgba(220,38,38,0.16)', border: '#dc2626', label: 'Infumable', desc: 'Una tortura en la mesa. Casi para usar de leña.' },
  { score: 1, icon: '💀', color: '#991b1b', bg: 'rgba(153,27,27,0.18)', border: '#991b1b', label: 'Crimen Lúdico', desc: 'Pisa-papeles carísimo. Ni a mi peor enemigo.' }
];

window._encuestaSelected = window._encuestaSelected || {};

function _encuestaCountdown(fechaFin) {
  if (!fechaFin) return '—';
  const fin = new Date(fechaFin.endsWith('Z') ? fechaFin : fechaFin + 'Z');
  const diff = fin - new Date();
  if (diff <= 0) return 'Cerrada';
  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${mins}m`;
  return `${mins} min`;
}

function _encuestaStars(score) {
  const full = Math.round(score);
  return Array.from({ length: 10 }, (_, i) =>
    `<span style="color:${i < full ? '#f59e0b' : 'rgba(255,255,255,0.15)'}; font-size:0.75rem;">★</span>`
  ).join('');
}

function renderEncuestas(el, d) {
  const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
  const nick = isAuth ? window.AuthManager.getNick() : null;
  const enc_data = d?.encuestas;
  const activas = enc_data?.encuestas_activas || [];
  const rankings = enc_data?.rankings || {};
  const categorias = Object.keys(ENCUESTAS_CATEGORIAS);

  // ── GATE: No autenticado ─────────────────────────────────────────────────
  if (!isAuth) {
    el.innerHTML = `
      <div class="enc-layout-wrapper" style="justify-content:center; align-items:center;">
        <div class="card glow" style="max-width: 520px; text-align: center; padding: 36px 24px; border: 1px solid rgba(99,102,241,0.4); background: linear-gradient(145deg, #0e0d29 0%, #070712 100%); border-radius: 20px;">
          <div style="font-size: 3.2rem; margin-bottom: 10px; filter: drop-shadow(0 0 16px rgba(99,102,241,0.5));">🗳️</div>
          <h2 style="color: var(--text); font-size: 1.35rem; font-weight: 800; margin-bottom: 8px;">Votaciones Exclusivas de la Comunidad</h2>
          <p style="color: var(--text-dim); font-size: 0.85rem; max-width: 440px; margin: 0 auto 16px auto; line-height: 1.5;">
            Participa en los debates semanales del 1 al 10 y construye el ranking oficial. <strong style="color:var(--accent-light);">Ganas +1 PTS</strong> por cada veredicto que emitas.
          </p>
          <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:6px; margin-bottom:20px;">
            ${Object.values(ENCUESTAS_CATEGORIAS).map(c =>
      `<span style="background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.3); border-radius:20px; padding:3px 10px; font-size:0.72rem; color:var(--text-dim);">${c.icon} ${c.label}</span>`
    ).join('')}
          </div>
          <button onclick="AuthManager.showModal({ reason: 'Identifícate para votar en las Encuestas Geek y ganar +1 PTS.' })"
            style="padding: 12px 26px; font-size: 0.9rem; font-weight: 800; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border: none; border-radius: 10px; cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 4px 18px rgba(99,102,241,0.4);">
            Entrar a Votar 🗳️
          </button>
        </div>
      </div>
    `;
    return;
  }

  // ── CABECERA Y ESTRUCTURA NO-SCROLL ──────────────────────────────────────
  const pts = window.AuthManager.getPoints();

  el.innerHTML = `
    <div class="enc-layout-wrapper">
      <!-- Barra superior compacta -->
      <div class="enc-top-bar">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.3rem;">🗳️</span>
          <span style="font-size:0.95rem; font-weight:900; letter-spacing:-0.3px; color:var(--text);">Encuestas Geek</span>
          <span style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#22c55e; border-radius:12px; padding:1px 8px; font-size:0.65rem; font-weight:800; letter-spacing:0.5px;">+1 PTS X VOTO</span>
        </div>

        <!-- Pestañas de categorías con scroll horizontal suave -->
        <div class="enc-category-tabs" id="enc-tabs">
          ${categorias.map((cat, i) => {
    const cfg = ENCUESTAS_CATEGORIAS[cat];
    const enc = activas.find(e => e.categoria === cat);
    const voted = enc?.votos?.some(v => v.nick === nick);
    const isFirst = i === 0;
    return `
              <button id="enc-tab-${cat}" onclick="encuestasMostrarPanel('${cat}')"
                class="enc-tab-btn"
                style="background:${isFirst ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isFirst ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.09)'}; border-radius:20px; padding:4px 11px; font-size:0.72rem; font-weight:700; color:${isFirst ? 'white' : 'var(--text-dim)'}; cursor:pointer; display:flex; align-items:center; gap:4px;">
                <span>${cfg.icon}</span>
                <span>${cfg.label}</span>
                ${voted ? `<span style="background:#22c55e; color:white; border-radius:50%; width:13px; height:13px; font-size:0.5rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">✓</span>` : ''}
              </button>`;
  }).join('')}
        </div>

        <!-- Nick y balance -->
        <div style="display:flex; align-items:center; gap:6px; background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.3); border-radius:16px; padding:3px 10px; flex-shrink:0;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--text);">${escapeHtml(nick)}</span>
          <span style="font-size:0.7rem; color:var(--accent-light); font-weight:800; font-family:var(--font-mono);">🪙 ${pts} PTS</span>
        </div>
      </div>

      <!-- Escenario Principal: tarjetas separadas en grid, scrollable -->
      <div class="enc-main-stage">
        ${categorias.map((cat, i) => {
    const cfg = ENCUESTAS_CATEGORIAS[cat];
    const enc = activas.find(e => e.categoria === cat);
    const rnk = rankings[cat] || [];
    return `
            <div id="enc-panel-${cat}" class="enc-panel" style="display:${i === 0 ? 'grid' : 'none'};">
              ${_renderEncuestasCards(cat, cfg, enc, rnk, nick)}
            </div>`;
  }).join('')}
      </div>
    </div>
  `;

  _encuestaIniciarCountdowns();
}

function _getTrendLabel(avg, total) {
  if (total === 0) return 'Sin votos aún';
  if (avg >= 9.0) return '🔥 Aclamación Unánime';
  if (avg >= 7.5) return '✨ Joya Recomendada';
  if (avg >= 6.0) return '🎲 Opinión Favorable';
  if (avg >= 4.5) return '⚖️ Debate Dividido';
  return '🛑 Recepción Crítica';
}

function _renderEncuestasCards(cat, cfg, enc, rnk, nick) {
  const nickClean = (nick || '').trim().toLowerCase();
  const voted = enc?.votos?.some(v => (v.nick || '').trim().toLowerCase() === nickClean);
  const myVote = voted ? enc.votos.find(v => (v.nick || '').trim().toLowerCase() === nickClean) : null;
  const total = enc?.total_votos || 0;
  const avg = enc?.promedio_score || 0;
  const votos = enc?.votos || [];

  // Sin encuesta activa
  if (!enc) {
    return `
      <div class="enc-card" style="grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:52px 24px; text-align:center; opacity:0.75;">
        <div style="font-size:3.5rem; margin-bottom:14px; filter:drop-shadow(0 0 20px ${cfg.color}66);">\u23F3</div>
        <div style="font-size:1.1rem; font-weight:900; color:var(--text); margin-bottom:6px;">Sin votaci\u00f3n activa esta semana</div>
        <div style="font-size:0.8rem; color:var(--text-dim);">El administrador abrir\u00e1 la pr\u00f3xima ronda de ${cfg.icon} ${cfg.label} pronto.</div>
      </div>`;
  }

  // \u2500\u2500 TARJETA 1: PORTADA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const cardCover = `
    <div class="enc-card enc-card-cover" style="background:linear-gradient(175deg, ${cfg.color}22 0%, rgba(13,12,35,0.85) 55%); border-color:${cfg.color}44;">
      ${enc.imagen_url
      ? `<img src="${enc.imagen_url}" alt="${escapeHtml(enc.nombre_item)}" class="enc-cover-img">`
      : `<div class="enc-cover-placeholder" style="background:linear-gradient(145deg, ${cfg.color}28, rgba(13,12,35,0.9));">
             <span style="font-size:4rem; filter:drop-shadow(0 0 22px ${cfg.color})">${cfg.icon}</span>
             <span style="font-size:0.65rem; color:${cfg.color}; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Portada Gen\u00e9rica</span>
           </div>`
    }
      <div class="enc-cover-meta">
        <div style="display:inline-flex; align-items:center; gap:6px; background:${cfg.color}22; border:1px solid ${cfg.color}55; border-radius:20px; padding:3px 12px; margin-bottom:8px;">
          <span style="font-size:0.9rem;">${cfg.icon}</span>
          <span style="font-size:0.68rem; font-weight:800; color:${cfg.color}; text-transform:uppercase; letter-spacing:0.5px;">${cfg.label}</span>
        </div>
        <div style="font-size:1.05rem; font-weight:900; color:var(--text); line-height:1.25; margin-bottom:4px;">${escapeHtml(enc.nombre_item)}</div>
        ${enc.descripcion_item ? `<div style="font-size:0.72rem; color:var(--text-dim); line-height:1.4; margin-bottom:8px;">${escapeHtml(enc.descripcion_item)}</div>` : ''}
        <div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">
          ${total > 0 ? `<span style="font-size:0.72rem; font-weight:800; color:#f59e0b; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); padding:2px 10px; border-radius:10px;">★ ${avg.toFixed(1)}/10 · ${total} votos</span>` : ''}
        </div>
      </div>
      <div class="enc-cover-footer">
        <div class="enc-cover-info-card">
          <div class="enc-cover-info-row">
            <span class="enc-live-indicator"><span class="enc-live-dot"></span> Votación Activa</span>
            <span class="enc-reward-pill">🪙 +1 PTS</span>
          </div>
          <div class="enc-cover-timer-row">
            <span class="enc-timer-label">⏱️ Tiempo restante</span>
            <span id="enc-countdown-${enc.id}" data-fin="${enc.fecha_fin}" class="enc-countdown">${_encuestaCountdown(enc.fecha_fin)}</span>
          </div>
        </div>
        <button type="button" class="enc-share-btn" onclick="navigator.clipboard.writeText(window.location.href); if (typeof mostrarNotificacion === 'function') mostrarNotificacion('¡Enlace de votación copiado al portapapeles! 📋');">
          <span>🔗 Compartir Encuesta</span>
        </button>
      </div>
    </div>`;

  // \u2500\u2500 TARJETA 2: VOTACI\u00d3N / RESULTADO \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  let cardVoting;
  if (voted) {
    const scoreItem = ENCUESTAS_PUNTUACIONES.find(p => p.score === myVote.score) || { icon: '🎲', label: 'Voto Registrado', color: 'var(--accent-light)' };
    cardVoting = `
      <div class="enc-card enc-card-voting" style="border-color:rgba(34,197,94,0.38); background:linear-gradient(145deg, rgba(16,185,129,0.07), rgba(13,12,35,0.85));">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
          <span style="font-size:1.1rem;">🗳\ufe0f</span>
          <span style="font-size:0.82rem; font-weight:900; color:var(--text);">Tu Veredicto Oficial</span>
          <span style="margin-left:auto; font-size:0.62rem; color:#22c55e; font-weight:800; background:rgba(34,197,94,0.12); padding:2px 8px; border-radius:10px; border:1px solid rgba(34,197,94,0.3);">\u2713 REGISTRADO</span>
        </div>

        <div style="text-align:center; padding:22px 16px; background:linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.06)); border:1px solid rgba(16,185,129,0.3); border-radius:16px; margin-bottom:14px;">
          <div style="font-size:4.5rem; font-weight:900; font-family:var(--font-mono); color:white; line-height:1; text-shadow:0 0 30px ${scoreItem.color};">${myVote.score}</div>
          <div style="font-size:0.85rem; color:rgba(255,255,255,0.3); margin-bottom:6px;">/ 10</div>
          <div style="font-size:1.1rem; font-weight:800; color:${scoreItem.color}; margin-bottom:4px;">${scoreItem.icon} ${scoreItem.label}</div>
          ${myVote.comentario ? `
            <div style="background:rgba(0,0,0,0.35); border-radius:10px; padding:8px 12px; margin-top:10px; font-size:0.75rem; color:var(--text); font-style:italic; border-left:3px solid #22c55e; text-align:left; line-height:1.4;">
              &ldquo;${escapeHtml(myVote.comentario)}&rdquo;
            </div>` : ''}
        </div>

        <div style="font-size:0.68rem; font-weight:800; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">📊 Distribuci\u00f3n de la Comunidad</div>
        <div class="enc-options-container">
          ${Array.from({ length: 10 }, (_, i) => 10 - i).map(n => {
      const count = votos.filter(v => v.score === n).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const pInfo = ENCUESTAS_PUNTUACIONES.find(p => p.score === n);
      const isMyScore = n === myVote.score;
      return `
              <div style="background:rgba(255,255,255,0.02); border-radius:10px; padding:5px 9px; position:relative; overflow:hidden; border:1px solid ${isMyScore ? pInfo.color + '55' : 'rgba(255,255,255,0.05)'};">
                <div style="position:absolute; left:0; top:0; bottom:0; width:${pct}%; background:${pInfo.color}22; transition:width 0.5s ease;"></div>
                <div style="position:relative; display:flex; align-items:center; justify-content:space-between; font-size:0.7rem; z-index:1;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-family:var(--font-mono); font-weight:900; color:${pInfo.color}; width:16px;">${n}</span>
                    <span style="color:var(--text); font-weight:600;">${pInfo.label}</span>
                    ${isMyScore ? `<span style="font-size:0.58rem; color:#22c55e; font-weight:800;">\u2190 TU VOTO</span>` : ''}
                  </div>
                  <span style="font-family:var(--font-mono); font-size:0.67rem; color:var(--text-dim);">${count} (${pct}%)</span>
                </div>
              </div>`;
    }).join('')}
        </div>
        <div style="text-align:center; margin-top:10px; font-size:0.68rem; color:var(--text-faint);">
          🪙 +1 PTS ganado por votar
        </div>
      </div>`;
  } else {
    cardVoting = `
      <div class="enc-card enc-card-voting">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
          <span style="font-size:1.1rem;">🗳\ufe0f</span>
          <span style="font-size:0.82rem; font-weight:900; color:var(--text);">Emite tu Veredicto</span>
          <span style="margin-left:auto; font-size:0.62rem; color:#22c55e; font-weight:800; background:rgba(34,197,94,0.12); padding:2px 8px; border-radius:10px; border:1px solid rgba(34,197,94,0.3);">+1 PTS</span>
        </div>
        <div style="font-size:0.7rem; color:var(--text-dim); margin-bottom:8px;">\u00bfQu\u00e9 nota le pones a <strong style="color:var(--text);">${escapeHtml(enc.nombre_item)}</strong> en la mesa?</div>

        <div class="enc-options-container" id="enc-opts-${cat}">
          ${ENCUESTAS_PUNTUACIONES.map(opt => `
            <div class="enc-option-row" id="enc-opt-${cat}-${opt.score}" onclick="encuestaSeleccionarScore('${cat}', ${opt.score})"
              style="--sel-bg:${opt.bg}; --sel-border:${opt.border}; --sel-glow:${opt.color}44;">
              <div class="enc-num-badge" style="background:${opt.color};">${opt.score}</div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:5px; line-height:1.15;">
                  <span style="font-size:0.85rem;">${opt.icon}</span>
                  <span style="font-size:0.8rem; font-weight:800; color:white;">${opt.label}</span>
                </div>
                <div style="font-size:0.67rem; color:var(--text-dim); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${opt.desc}</div>
              </div>
            </div>
          `).join('')}
          <div class="enc-option-row" id="enc-opt-${cat}-mani" onclick="encuestaSeleccionarMani('${cat}')"
            style="--sel-bg:rgba(180,83,9,0.18); --sel-border:#b45309; --sel-glow:rgba(180,83,9,0.3); opacity:0.75;">
            <div class="enc-num-badge" style="background:#78350f;">🫘</div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:0.8rem; font-weight:800; color:#f59e0b;">Man\u00ed...</div>
              <div style="font-size:0.67rem; color:var(--text-dim);">Paso / Solo vengo por el bardo y a mirar los votos</div>
            </div>
          </div>
        </div>

        <div style="padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); margin-top:4px;">
          <input type="text" id="enc-comment-${cat}" class="enc-comment-input"
            placeholder="\u00bfPor qu\u00e9? (opcional) ej: fluye genial a 4 jugadores..."
            maxlength="140">
          <button id="enc-btn-submit-${cat}" onclick="encuestaEnviarVoto('${cat}', ${enc.id})"
            disabled
            style="width:100%; padding:10px 12px; border-radius:12px; font-size:0.82rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; border:none; background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color:white; cursor:not-allowed; opacity:0.4; transition:all 0.2s;">
            Selecciona una nota para votar 🗳\ufe0f
          </button>
        </div>
      </div>`;
  }

  // \u2500\u2500 TARJETA 3: GR\u00c1FICO DE TENDENCIA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const cardChart = `
    <div class="enc-card enc-card-chart">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.1rem;">📊</span>
          <span style="font-size:0.82rem; font-weight:900; color:var(--text);">Tendencia de Respuestas</span>
        </div>
        <span style="font-size:0.68rem; font-weight:800; color:#10b981; background:rgba(16,185,129,0.12); padding:2px 9px; border-radius:10px;">
          ${total > 0 ? `Prom: ${avg.toFixed(1)}/10 \u00b7 ${total} votos` : 'Sin votos a\u00fan'}
        </span>
      </div>
      <div class="enc-trend-chart">
        ${Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
    const pInfo = ENCUESTAS_PUNTUACIONES.find(p => p.score === num);
    const count = votos.filter(v => v.score === num).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const barHeight = total > 0 ? (count > 0 ? Math.max(pct, 12) : 5) : 10;
    return `
            <div class="enc-trend-col" title="${num}/10 (${pInfo.label}): ${count} votos (${pct}%)">
              <div class="enc-trend-val">${count > 0 ? count : ''}</div>
              <div class="enc-trend-bar-track">
                <div class="enc-trend-bar-fill" style="height:${barHeight}%; background:${pInfo.color}; opacity:${total > 0 && count === 0 ? 0.18 : 1};"></div>
              </div>
              <div class="enc-trend-num" style="color:${pInfo.color};">${num}</div>
            </div>`;
  }).join('')}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-size:0.63rem; color:var(--text-faint); padding:0 2px;">
        <span>💀 Cr\u00edtico</span>
        <span style="color:var(--accent-light); font-weight:700;">${_getTrendLabel(avg, total)}</span>
        <span>👑 Obra Maestra</span>
      </div>
    </div>`;

  // \u2500\u2500 TARJETA 4: RANKING / PODIO \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const top1 = rnk[0] || (total > 0 ? { nombre_item: enc.nombre_item, promedio_score: avg, total_votos: total } : null);
  const top2 = rnk[1] || null;
  const top3 = rnk[2] || null;
  const restRnk = rnk.slice(3);

  const cardRanking = `
    <div class="enc-card enc-card-ranking">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.1rem;">🏆</span>
          <span style="font-size:0.82rem; font-weight:900; color:var(--text);">Podio &amp; Clasificaci\u00f3n</span>
        </div>
        <span style="font-size:0.6rem; font-weight:800; color:#f59e0b; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:2px 8px;">EN VIVO</span>
      </div>
      <div style="font-size:0.63rem; color:var(--text-dim); margin-top:2px; margin-bottom:2px;">${cfg.icon} ${cfg.label} \u00b7 Temporada Oficial</div>

      <div class="enc-podium-container">
        <div class="enc-podium-card gold">
          <span style="font-size:1.4rem; flex-shrink:0;">🥇</span>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.78rem; font-weight:900; color:white; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${top1 ? escapeHtml(top1.nombre_item) : `En disputa: ${escapeHtml(enc.nombre_item)}`}
            </div>
            <div style="font-size:0.65rem; color:#f59e0b; font-weight:700; margin-top:2px;">
              ${top1 ? `\u2605 ${top1.promedio_score.toFixed(1)}/10 \u00b7 ${top1.total_votos} votos` : 'Candidato n\u00ba1 al trono 👑'}
            </div>
          </div>
          <div style="font-size:0.68rem; font-weight:900; font-family:var(--font-mono); color:#f59e0b; background:rgba(245,158,11,0.2); padding:3px 8px; border-radius:8px; flex-shrink:0;">#1</div>
        </div>
        <div class="enc-podium-card silver">
          <span style="font-size:1.25rem; flex-shrink:0;">🥈</span>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.78rem; font-weight:900; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${top2 ? escapeHtml(top2.nombre_item) : 'Segundo Lugar \u00b7 En disputa'}
            </div>
            <div style="font-size:0.65rem; color:var(--text-dim); margin-top:2px;">
              ${top2 ? `\u2605 ${top2.promedio_score.toFixed(1)}/10 \u00b7 ${top2.total_votos} votos` : 'Candidato en clasificaci\u00f3n'}
            </div>
          </div>
          <div style="font-size:0.68rem; font-weight:900; font-family:var(--font-mono); color:#94a3b8; background:rgba(148,163,184,0.15); padding:3px 8px; border-radius:8px; flex-shrink:0;">#2</div>
        </div>
        <div class="enc-podium-card bronze">
          <span style="font-size:1.25rem; flex-shrink:0;">🥉</span>
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.78rem; font-weight:900; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${top3 ? escapeHtml(top3.nombre_item) : 'Tercer Lugar \u00b7 En disputa'}
            </div>
            <div style="font-size:0.65rem; color:var(--text-dim); margin-top:2px;">
              ${top3 ? `\u2605 ${top3.promedio_score.toFixed(1)}/10 \u00b7 ${top3.total_votos} votos` : 'Candidato en clasificaci\u00f3n'}
            </div>
          </div>
          <div style="font-size:0.68rem; font-weight:900; font-family:var(--font-mono); color:#d97706; background:rgba(217,119,6,0.15); padding:3px 8px; border-radius:8px; flex-shrink:0;">#3</div>
        </div>
      </div>

      ${restRnk.length > 0 ? `
        <div style="font-size:0.63rem; font-weight:800; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.5px; margin-top:10px; margin-bottom:4px;">Clasificaci\u00f3n General</div>
        <div class="enc-ranking-list">
          ${restRnk.map((item, idx) => `
            <div style="display:flex; align-items:center; gap:10px; padding:6px 10px; border-radius:10px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04);">
              <span style="font-size:0.65rem; font-weight:900; font-family:var(--font-mono); color:var(--text-dim); width:20px; text-align:center;">#${idx + 4}</span>
              <span style="flex:1; font-size:0.72rem; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.nombre_item)}</span>
              <span style="font-size:0.65rem; font-family:var(--font-mono); color:#f59e0b;">\u2605 ${item.promedio_score.toFixed(1)}</span>
            </div>`).join('')}
        </div>` : `
        <div style="margin-top:12px; text-align:center; padding:16px 12px; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.08); border-radius:12px; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
          <div style="font-size:1.5rem; margin-bottom:4px;">📋</div>
          <div style="font-size:0.75rem; font-weight:700; color:var(--text);">Próximos Candidatos</div>
          <div style="font-size:0.68rem; color:var(--text-dim); margin-top:2px;">El ranking completo se llenará con las votaciones de la temporada</div>
        </div>`}
    </div>`;

  // \u2500\u2500 TARJETA 5: MURO DE VEREDICTOS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  const cardVerdicts = `
    <div class="enc-card enc-card-verdicts">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.1rem;">💬</span>
          <span style="font-size:0.82rem; font-weight:900; color:var(--text);">Muro de Veredictos</span>
        </div>
        <span style="font-size:0.65rem; color:var(--accent-light); font-weight:700;">${votos.length} veredicto${votos.length !== 1 ? 's' : ''} \u00b7 Feed en Vivo</span>
      </div>

      <div class="enc-verdicts-list">
        ${votos.length > 0 ? [...votos].reverse().map(v => {
    const pInfo = ENCUESTAS_PUNTUACIONES.find(p => p.score === v.score) || { icon: '🎲', color: '#6366f1', label: '' };
    const initials = (v.nick[0] || '?').toUpperCase();
    return `
            <div style="background:rgba(255,255,255,0.03); border-radius:12px; padding:10px 12px; border:1px solid rgba(255,255,255,0.06); transition:border-color 0.2s;" onmouseover="this.style.borderColor='${pInfo.color}44'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:${v.comentario ? '7px' : '0'};">
                <div style="width:30px; height:30px; border-radius:50%; background:${pInfo.color}; display:flex; align-items:center; justify-content:center; font-size:0.72rem; font-weight:900; color:white; flex-shrink:0; box-shadow:0 0 10px ${pInfo.color}55;">
                  ${initials}
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:0.75rem; font-weight:700; color:var(--text); line-height:1;">${escapeHtml(v.nick)}</div>
                  <div style="font-size:0.62rem; color:var(--text-dim); margin-top:1px;">${pInfo.icon} ${pInfo.label}</div>
                </div>
                <div style="flex-shrink:0; text-align:right;">
                  <div style="font-size:1.2rem; font-weight:900; font-family:var(--font-mono); color:${pInfo.color}; line-height:1;">${v.score}</div>
                  <div style="font-size:0.58rem; color:rgba(255,255,255,0.3);">/10</div>
                </div>
              </div>
              ${v.comentario ? `
                <div style="font-size:0.7rem; color:var(--text-dim); line-height:1.4; font-style:italic; padding:7px 10px; background:rgba(0,0,0,0.3); border-radius:8px; border-left:2px solid ${pInfo.color}77;">
                  &ldquo;${escapeHtml(v.comentario)}&rdquo;
                </div>` : ''}
            </div>`;
  }).join('') : `
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px 16px; text-align:center; opacity:0.7;">
            <div style="font-size:2rem; margin-bottom:8px;">\u2728</div>
            <div style="font-size:0.78rem; color:var(--text-dim); font-weight:700;">Sin veredictos a\u00fan esta semana</div>
            <div style="font-size:0.68rem; color:var(--text-faint); margin-top:4px;">\u00a1S\u00e9 el primero en votar y ganar +1 PTS!</div>
          </div>`}
      </div>
    </div>`;

  return cardCover + cardVoting + cardRanking + cardChart + cardVerdicts;
}

// DEPRECATED stubs mantenidos por compatibilidad
function _renderEncuestasStage(cat, cfg, enc, rnk, nick) {
  return _renderEncuestasCards(cat, cfg, enc, rnk, nick);
}

function _buildRankingAdemanHtml(cat, cfg, enc, rnk) {
  return '';
}



// ── Interacciones de la Encuesta ──────────────────────────────────────────
window.encuestasMostrarPanel = function (cat) {
  Object.keys(ENCUESTAS_CATEGORIAS).forEach(c => {
    const p = document.getElementById(`enc-panel-${c}`);
    if (p) p.style.display = (c === cat ? 'grid' : 'none');
    const tab = document.getElementById(`enc-tab-${c}`);
    if (tab) {
      if (c === cat) {
        tab.style.background = 'rgba(99,102,241,0.25)';
        tab.style.borderColor = 'rgba(99,102,241,0.6)';
        tab.style.color = 'white';
      } else {
        tab.style.background = 'rgba(255,255,255,0.04)';
        tab.style.borderColor = 'rgba(255,255,255,0.09)';
        tab.style.color = 'var(--text-dim)';
      }
    }
  });
};

window.encuestaSeleccionarScore = function (cat, score) {
  window._encuestaSelected[cat] = { score: score };

  // Quitar seleccion previa
  document.querySelectorAll(`#enc-opts-${cat} .enc-option-row`).forEach(row => {
    row.classList.remove('selected');
  });

  const row = document.getElementById(`enc-opt-${cat}-${score}`);
  if (row) row.classList.add('selected');

  const pInfo = ENCUESTAS_PUNTUACIONES.find(p => p.score === score);
  const btn = document.getElementById(`enc-btn-submit-${cat}`);
  if (btn && pInfo) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.style.background = `linear-gradient(135deg, ${pInfo.color}, #7c3aed)`;
    btn.innerHTML = `Votar ${score}/10 (${pInfo.label}) 🗳️ (+1 PTS)`;
  }

  // Foco opcional en comentario
  const commentInput = document.getElementById(`enc-comment-${cat}`);
  if (commentInput && !commentInput.value) {
    commentInput.placeholder = `¿Por qué ${score}/10? (opcional) ej: ${pInfo.desc}`;
  }
};

window.encuestaSeleccionarMani = function (cat) {
  // Comodín Maní: se registra con nota neutral o 5 con comentario de maní
  window.encuestaSeleccionarScore(cat, 5);
  const commentInput = document.getElementById(`enc-comment-${cat}`);
  if (commentInput) commentInput.value = '🥜 Maní... solo vengo por el bardo / ver votos';
};

window.encuestaEnviarVoto = async function (cat, encuestaId) {
  const sel = window._encuestaSelected[cat];
  if (!sel || !sel.score) {
    alert('Por favor selecciona una puntuación del 1 al 10.');
    return;
  }

  const nick = window.AuthManager ? window.AuthManager.getNick() : null;
  if (!nick) {
    if (window.AuthManager) window.AuthManager.showModal({ reason: 'Identifícate para votar.' });
    return;
  }

  const commentInput = document.getElementById(`enc-comment-${cat}`);
  const comentario = commentInput ? commentInput.value.trim() : '';

  const btn = document.getElementById(`enc-btn-submit-${cat}`);
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.innerHTML = 'Enviando veredicto... ⏳';
  }

  try {
    const url = (window.AJ_CONFIG && typeof window.AJ_CONFIG.apiUrl === 'function')
      ? window.AJ_CONFIG.apiUrl('/api/encuestas/votar')
      : '/api/encuestas/votar';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nick: nick,
        encuesta_id: encuestaId,
        score: sel.score,
        comentario: comentario
      })
    });

    const data = await res.json();
    if (data.ok) {
      if (window.AuthManager && typeof window.AuthManager.addPoints === 'function') {
        window.AuthManager.addPoints(1, `Voto en encuesta #${encuestaId}`);
      }

      // Actualizar datos locales
      try {
        const newEnc = await fetch('encuestas.json?v=' + Date.now()).then(r => r.ok ? r.json() : null);
        if (newEnc && window.App && window.App.data) {
          window.App.data.encuestas = newEnc;
        }
      } catch (err) { }

      // Re-render
      if (typeof renderSection === 'function') {
        renderSection('encuestas');
        encuestasMostrarPanel(cat);
      }
    } else if (data.error && data.error.includes('Ya votaste')) {
      // Si el servidor indica que ya votó, recargar para mostrar el voto registrado
      try {
        const newEnc = await fetch('encuestas.json?v=' + Date.now()).then(r => r.ok ? r.json() : null);
        if (newEnc && window.App && window.App.data) {
          window.App.data.encuestas = newEnc;
        }
      } catch (err) { }
      if (typeof renderSection === 'function') {
        renderSection('encuestas');
        encuestasMostrarPanel(cat);
      }
    } else {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = 'Reintentar Voto 🗳️';
      }
      alert(`❌ ${data.error || 'Error al registrar el voto'}`);
    }
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = 'Reintentar Voto 🗳️';
    }
    alert('❌ No se pudo conectar con el servidor. ¿Está activo server.py?');
  }
};


function _encuestaIniciarCountdowns() {
  const countdowns = document.querySelectorAll('[id^="enc-countdown-"]');
  countdowns.forEach(el => {
    const fin = el.dataset.fin;
    if (!fin) return;
    const update = () => { el.textContent = _encuestaCountdown(fin); };
    update();
    const timer = setInterval(() => {
      update();
      if (_encuestaCountdown(fin) === 'Cerrada') clearInterval(timer);
    }, 60000);
  });
}


/* ═══════════════════════════════════════════════════════
   HELPERS DE RENDER
   ═══════════════════════════════════════════════════════ */


function renderSectionHero(title, desc, badge) {
  return `
    <div class="section-hero">
      ${badge ? `<div class="home-hero-badge"><span class="live-dot"></span>${badge}</div>` : ''}
      <h1>${title}</h1>
      ${desc ? `<p>${desc}</p>` : ''}
    </div>
  `;
}

function renderStatCard(icon, value, label) {
  return `
    <div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>
  `;
}

function renderEventCard(evento) {
  const fecha = new Date(evento.fecha);
  const dia = fecha.getDate ? fecha.getDate() : '?';
  const mes = fecha.toLocaleString ? fecha.toLocaleString('es-CL', { month: 'short' }) : '';
  return `
    <div class="event-card">
      <div class="event-date">
        <div class="event-day">${dia}</div>
        <div class="event-month">${mes}</div>
      </div>
      <div class="event-info">
        <div class="event-title">${escapeHtml(evento.titulo || 'Próximo Evento')}</div>
        <div class="event-desc">${escapeHtml(evento.descripcion || '')}</div>
      </div>
    </div>
  `;
}

function renderPlaceholderCard(icon, title, desc) {
  return `
    <div class="card" style="display:flex; align-items:center; gap:16px; opacity:0.6;">
      <div style="font-size:2rem;">${icon}</div>
      <div>
        <div class="font-bold">${title}</div>
        <div class="text-sm text-dim">${desc}</div>
      </div>
    </div>
  `;
}

function renderStatCardH(icon, value, label, type = 'primary') {
  return `
    <div class="stat-card" style="display: flex; flex-direction: row; align-items: center; gap: 12px; padding: 10px 14px; flex: 1; border-color: rgba(255,255,255,0.05);">
      <div class="stat-icon ${type}">${icon}</div>
      <div style="flex: 1; min-width: 0; z-index: 1;">
        <div class="stat-label" style="margin-bottom: 2px;">${label}</div>
        <div class="stat-val" style="font-size: 1.1rem; margin-top: 0;">${value}</div>
      </div>
      <div class="stat-bg-icon">👑</div>
    </div>
  `;
}

function renderRankingPanel(players, title) {
  if (!players || players.length === 0) {
    return renderComingSoon('🏆', title, 'Aún no hay datos para este ranking.');
  }

  const sorted = [...players].sort((a, b) => (b.puntos || 0) - (a.puntos || 0));
  const maxPts = sorted[0]?.puntos || 1;
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return `
    <div class="podium mb-16" >
      ${top3[1] ? `<div class="podium-slot p2"><div class="podium-avatar">🥈</div><div class="podium-name">${escapeHtml(top3[1].nombre)}</div><div class="podium-pts">${top3[1].puntos} pts</div><div class="podium-block">2</div></div>` : ''}
      ${top3[0] ? `<div class="podium-slot p1"><div class="podium-avatar">🥇</div><div class="podium-name">${escapeHtml(top3[0].nombre)}</div><div class="podium-pts">${top3[0].puntos} pts</div><div class="podium-block">1</div></div>` : ''}
      ${top3[2] ? `<div class="podium-slot p3"><div class="podium-avatar">🥉</div><div class="podium-name">${escapeHtml(top3[2].nombre)}</div><div class="podium-pts">${top3[2].puntos} pts</div><div class="podium-block">3</div></div>` : ''}
    </div>
    ${rest.length > 0 ? `
    <div class="card">
      <table class="rank-table">
        <thead><tr><th>#</th><th>Jugador</th><th>Puntos</th><th class="hide-mobile">Progreso</th></tr></thead>
        <tbody>
          ${rest.map((p, i) => `
            <tr>
              <td><div class="rank-pos">${i + 4}</div></td>
              <td><div class="rank-name">${escapeHtml(p.nombre)}</div></td>
              <td><div class="rank-pts">${p.puntos}</div></td>
              <td class="rank-bar-wrap"><div class="rank-bar" style="width:${Math.round((p.puntos / maxPts) * 100)}%"></div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>` : ''
    }
  `;
}

function renderComingSoon(icon, title, desc) {
  return `
    <div class="card" style = "text-align:center; padding:60px 20px;" >
      <div style="font-size:3rem; margin-bottom:16px; opacity:0.5;">${icon}</div>
      <div class="font-bold mb-8">${title}</div>
      <p class="text-dim text-sm">${desc}</p>
    </div>
    `;
}

function renderMemberGrid(members, title, defaultIcon, linkField) {
  if (!members || members.length === 0) {
    return `<div class="empty-state" ><div class="empty-icon">${defaultIcon}</div><p>Aún no hay ${title.toLowerCase()} registrados.</p></div> `;
  }
  return `
    <div class="grid-2" >
      ${members.map(m => {
    const link = m[linkField] || m.url || m.instagram || m.web || '';
    const name = m.nombre || m.name || '—';
    const sub = m.descripcion || m.sub || '';
    return `
          <a href="${link || '#'}" target="${link ? '_blank' : '_self'}" class="member-card">
            <div class="member-avatar">${defaultIcon}</div>
            <div class="member-info">
              <div class="member-name">${escapeHtml(name)}</div>
              <div class="member-sub">${escapeHtml(sub)}</div>
            </div>
            <div class="member-action">${link ? '↗' : ''}</div>
          </a>
        `;
  }).join('')
    }
    </div>
    `;
}

function renderMemberCardSmall(m) {
  const link = m.instagram || m.url || m.web || '#';
  return `
    <a href = "${link}" target = "_blank" class="member-card" >
      <div class="member-avatar">${m.tipo === 'tienda' ? '🛍️' : m.tipo === 'divulgador' ? '📢' : '⭐'}</div>
      <div class="member-info">
        <div class="member-name">${escapeHtml(m.nombre || '—')}</div>
        <div class="member-sub">${escapeHtml(m.tipo || 'Miembro')}</div>
      </div>
      <span class="member-action">↗</span>
    </a >
    `;
}

function renderProductCardSmall(p) {
  return `
    <div class="product-card" >
      <div class="product-img">${p.foto ? `<img src="${p.foto}" alt="${escapeHtml(p.nombre)}" style="height:180px;width:100%;object-fit:cover;">` : '🎲'}</div>
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.nombre || 'Sin título')}</div>
        ${p.precio ? `<div class="product-price">${escapeHtml(p.precio)}</div>` : ''}
        <div class="product-meta">${escapeHtml(p.categoria || 'Juego de Mesa')}</div>
      </div>
    </div>
    `;
}

function renderProductCardFull(p) {
  const badgeColor = {
    'Vender': 'badge-green',
    'Intercambiar': 'badge-cyan',
    'Regalar': 'badge-purple',
    'Buscar': 'badge-gold',
    'Enseñar': 'badge-primary',
    'Servicios': 'badge-accent'
  };

  const currentNick = (window.AuthManager && window.AuthManager.getNick()) || '';
  const esMio = Boolean(currentNick && p.nick && (currentNick.toLowerCase() === p.nick.toLowerCase() || currentNick.toLowerCase() === 'black' || currentNick.toLowerCase() === 'admin'));
  const pubId = p.id || 0;
  const fechaExp = p.fechaExpiracion || p.exp;

  return `
    <div class="product-card">
      <div class="product-img">
        ${p.foto ? `<img src="${escapeHtml(p.foto)}" alt="${escapeHtml(p.titulo)}" onerror="this.src='imagenes/LOGO%20AMIGOS%20JUGONES.png'">` : '🎲'}
      </div>
      <div class="product-body">
        <div class="flex items-center gap-8 mb-8" style="flex-wrap: wrap;">
          <span class="badge ${badgeColor[p.categoria] || 'badge-purple'}">${escapeHtml(p.categoria || 'Mercado')}</span>
          ${p.estado ? `<span class="badge badge-outline text-xs">${escapeHtml(p.estado)}</span>` : ''}
          ${(p.disponibles && p.disponibles.toString().trim() !== "0") ? `<span class="badge badge-gold text-xs" style="margin-left:auto;">📦 Disp: ${escapeHtml(p.disponibles)}</span>` : ''}
        </div>
        <div class="flex items-baseline justify-between gap-12 mb-4" style="padding: 0 4px;">
          <div class="product-name">${escapeHtml(p.titulo || p.nombre || 'Sin título')}</div>
          ${p.precio ? `<div class="product-price">${escapeHtml(p.precio)}</div>` : ''}
        </div>
        
        ${p.descripcion ? `<div class="product-meta">${escapeHtml(p.descripcion)}</div>` : ''}
        
        <div class="product-footer" style="margin-top: auto;">
          <div class="text-xs text-dim mb-4 text-center">Publicado por: <span class="text-gold">${escapeHtml(p.nick || 'Miembro')}</span></div>
          
          <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-bottom: 8px;">
            ${p.contacto ? `
              <a href="https://instagram.com/${escapeHtml(p.contacto.replace('@', ''))}" target="_blank" class="btn btn-ghost" style="width: 100%; justify-content: center; font-size: 0.8rem; gap: 8px;">
                <span>📸</span> ${escapeHtml(p.contacto)}
              </a>
            ` : '<div class="text-xs text-dim italic text-center">Sin datos de contacto</div>'}
          </div>
          
          <div class="product-expiry">
            ${fechaExp ? `Vigente hasta: ${new Date(fechaExp).toLocaleDateString('es-CL')}` : ''}
          </div>

          ${esMio && pubId ? `
            <div style="display:flex; gap:6px; margin-top:8px;">
              <button onclick="mercadoMarcarVendido(${pubId})" style="flex:1; background:rgba(74,222,128,0.15); border:1px solid rgba(74,222,128,0.4); color:#4ade80; font-weight:800; border-radius:6px; padding:6px 8px; font-size:0.75rem; cursor:pointer;" title="Marcar como concretado/vendido">
                ✅ Vendido
              </button>
              <button onclick="mercadoEliminar(${pubId})" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); color:#f87171; font-weight:700; border-radius:6px; padding:6px 10px; font-size:0.75rem; cursor:pointer;" title="Eliminar anuncio">
                🗑️
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

window.mercadoMarcarVendido = async function (id) {
  if (!id) return;
  if (!confirm('¿Deseas marcar este artículo como VENDIDO? Se retirará de la vitrina pública.')) return;
  const nick = (window.AuthManager && window.AuthManager.getNick()) || '';
  try {
    const res = await fetch('/api/mercado/vender', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nick })
    });
    const data = await res.json();
    if (data && data.ok) {
      if (App && App.data) App.data.mercado = null;
      ensureDataSection('mercado', 'mercado.json').then(() => renderSection('mercado'));
    } else {
      alert(data.error || 'No se pudo actualizar.');
    }
  } catch (e) {
    alert('Error al comunicarse con el servidor.');
  }
};

window.mercadoEliminar = async function (id) {
  if (!id) return;
  if (!confirm('¿Estás seguro de que deseas eliminar este anuncio permanentemente?')) return;
  const nick = (window.AuthManager && window.AuthManager.getNick()) || '';
  try {
    const res = await fetch('/api/mercado/eliminar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nick })
    });
    const data = await res.json();
    if (data && data.ok) {
      if (App && App.data) App.data.mercado = null;
      ensureDataSection('mercado', 'mercado.json').then(() => renderSection('mercado'));
    } else {
      alert(data.error || 'No se pudo eliminar.');
    }
  } catch (e) {
    alert('Error al comunicarse con el servidor.');
  }
};

function renderCatalogGrid(items, type, title) {
  if (!items || items.length === 0) {
    return renderComingSoon('🗂️', title, 'El catálogo se carga desde Google Sheets vía Apps Script.');
  }
  return `
    <div class="grid-3" >
      ${items.map(item => `
        <div class="book-card">
          <div class="book-cover">
            ${item.imagen ? `<img src="${item.imagen}" alt="${escapeHtml(item.titulo || item.nombre)}" style="height:200px;width:100%;object-fit:cover;">` : '🎲'}
          </div>
          <div class="book-body">
            <div class="book-title">${escapeHtml(item.titulo || item.nombre || '—')}</div>
            ${item.genero ? `<div class="book-author">${escapeHtml(item.genero)}</div>` : ''}
            ${item.votos ? `<div class="book-stars">${'⭐'.repeat(Math.min(parseInt(item.votos) || 0, 5))}</div>` : ''}
            ${item.propuesto ? `<div class="book-reader">Propuesto por ${escapeHtml(item.propuesto)}</div>` : ''}
          </div>
        </div>
      `).join('')
    }
    </div>
    `;
}

function renderDocGrid(items, type, title) {
  if (!items || items.length === 0) {
    const icons = { documento: '📄', imagen: '🖼️', audio: '🎙️', manual: '🎲' };
    return renderComingSoon(icons[type] || '📂', title, `No hay recursos disponibles en esta categoría.`);
  }

  return `
    <div class="grid-2">
      ${items.map(doc => `
        <a href="${doc.url || '#'}" target="_blank" class="doc-card">
          <div class="doc-icon">${doc.icono || (type === 'audio' ? '🎙️' : type === 'imagen' ? '🖼️' : '📄')}</div>
          <div class="doc-info">
            <div class="doc-name">${escapeHtml(doc.nombre)}</div>
            <div class="doc-sub">${escapeHtml(doc.descripcion || 'Reglamento oficial del grupo')}</div>
          </div>
          <span class="doc-arrow">→</span>
        </a>
      `).join('')}
    </div>
  `;
}

function rankingToRows(ranking) {
  if (!ranking || ranking.length === 0) return '<div class="empty-state"><p>Sin resultados aún.</p></div>';
  return `
    < table class="rank-table" >
      <thead><tr><th>#</th><th>Nick</th><th>Habitaciones</th><th>Tiempo</th><th>Puntos</th></tr></thead>
      <tbody>
        ${ranking.map((p, i) => `
          <tr>
            <td class="rank-pos ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">${['🥇', '🥈', '🥉'][i] || i + 1}</td>
            <td class="rank-name">${escapeHtml(p.nick || p.nombre || '—')}</td>
            <td>${p.habitaciones || 0}</td>
            <td class="font-mono text-sm">${p.tiempo || '—'}</td>
            <td class="rank-pts">${p.puntos || 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table >
    `;
}

/* ── Default Data (cuando datos.json no tiene ciertas claves) ── */
function getDefaultDocs() {
  return [
    { nombre: 'Triviaverso', icono: '🧠', descripcion: 'Reglamento del Triviaverso', url: '#' },
    { nombre: 'Geekstories', icono: '🎭', descripcion: 'Guía de Geekstories', url: '#' },
    { nombre: 'El Desafío de la Semana', icono: '⚔️', descripcion: 'Reglamento del Desafío semanal', url: '#' },
    { nombre: 'Adivina la Canción', icono: '🎵', descripcion: 'Reglas del juego musical', url: '#' },
    { nombre: 'Miembro VIP de la Semana', icono: '⭐', descripcion: 'Cómo se elige al VIP semanal', url: '#' },
    { nombre: 'El Templo de la Verdad', icono: '🏛️', descripcion: 'Reglamento del Templo', url: '#' },
    { nombre: 'PixelBG', icono: '🎮', descripcion: 'Guía de PixelBG', url: '#' },
    { nombre: 'Rescata un Juego', icono: '🛡️', descripcion: 'Reglas de Rescata un Juego', url: '#' },
    { nombre: 'Geekversus', icono: '⚡', descripcion: 'Reglamento del Versus', url: '#' },
    { nombre: 'Crónicas Jugonas', icono: '📜', descripcion: 'Las crónicas de la comunidad', url: '#' },
  ];
}

function getDefaultForms() {
  return [
    {
      nombre: 'Eventos y Concursos de la Comunidad',
      icono: '👑',
      descripcion: 'Promueve tu torneo, tarde de juegos o concurso',
      alimenta: 'Cartelera y Calendario',
      onclick: "AuthManager.abrirModalEvento('Evento')"
    },
    {
      nombre: 'Disponibilidad para jugar',
      icono: '⏰',
      descripcion: 'Indica tus días, horarios y juegos preferidos',
      alimenta: 'Radar Jugón',
      onclick: "AuthManager.abrirModalRadar()"
    },
    {
      nombre: 'Mercado Amigos Jugones',
      icono: '🛒',
      descripcion: 'Publica tu juego a la venta, trueque o servicio',
      alimenta: 'El Mercado Jugón',
      onclick: "AuthManager.abrirModalMercado()"
    },
    {
      nombre: 'Tu fecha de cumpleaños',
      icono: '🎂',
      descripcion: 'Para ser saludado y celebrado en el grupo',
      alimenta: 'Recordatorios del grupo',
      onclick: "AuthManager.abrirModalCumpleanos()"
    },
    {
      nombre: 'Miembros Destacados de la Comunidad',
      icono: '⭐',
      descripcion: 'Registra tu perfil, creador, tienda, organización o divulgación',
      alimenta: 'Sección Miembros Destacados',
      onclick: "AuthManager.abrirModalProyecto()"
    },
    {
      nombre: 'Misiones Diarias (Envío de Pruebas)',
      icono: '🃏',
      descripcion: 'Envía tus capturas o pruebas de retos diarios y secretos',
      alimenta: 'Puntos y Desafíos Diarios',
      onclick: "AuthManager.abrirModalMisiones()"
    },
  ];
}

function buildFormsList(formsObj) {
  if (!formsObj) return getDefaultForms();
  const defaults = getDefaultForms();
  return defaults.map(f => ({
    ...f,
    url: formsObj[f.nombre.toLowerCase().replace(/\s/g, '_')] || formsObj[f.nombre] || ''
  }));
}

function parseActivityRanking(actividad) {
  if (!actividad || !Array.isArray(actividad)) return [];
  // asume array de objetos con nombre/nombre_participante + puntos/victorias
  return actividad.map(item => ({
    nombre: item.nombre || item.nombre_participante || item.jugador || '—',
    puntos: item.puntos || item.victorias || item.ganadas || 0,
  }));
}

function getRandomMembers(d, limit = 3) {
  const contenido = d?.remaining?.contenido || {};
  const participantes = d?.participantes || contenido['Participantes']?.items || [];
  const divulgadores = d?.divulgadores || contenido['Divulgadores']?.items || [];
  const tiendas = d?.tiendas || contenido['Tiendas']?.items || [];

  const all = [
    ...participantes.map(m => ({ ...m, tipo: 'participante' })),
    ...divulgadores.map(m => ({ ...m, tipo: 'divulgador' })),
    ...tiendas.map(m => ({ ...m, tipo: 'tienda' })),
  ];
  return all.sort(() => Math.random() - 0.5).slice(0, limit);
}

/* ═══════════════════════════════════════════════════════
   SIDEBAR & MOBILE
   ═══════════════════════════════════════════════════════ */

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

/* ═══════════════════════════════════════════════════════
   TABS GENÉRICO
   ═══════════════════════════════════════════════════════ */

function setupTabs(container, tabsId, panelsId) {
  const tabsBar = container.querySelector ? container.querySelector(`#${tabsId}`) : document.getElementById(tabsId);
  const panelsWrap = container.querySelector ? container.querySelector(`#${panelsId}`) : document.getElementById(panelsId);
  if (!tabsBar || !panelsWrap) return;

  tabsBar.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabsBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      panelsWrap.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      panelsWrap.querySelector(`[data-panel="${target}"]`)?.classList.add('active');
    });
  });
}

/* ═══════════════════════════════════════════════════════
   COUNTDOWN
   ═══════════════════════════════════════════════════════ */

function startCountdown(target) {
  clearInterval(App._countdown);
  App._countdown = setInterval(() => {
    const diff = target - Date.now();
    if (diff <= 0) { clearInterval(App._countdown); return; }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v).padStart(2, '0'); };
    set('cd-d', d); set('cd-h', h); set('cd-m', m); set('cd-s', s);
  }, 1000);
}

/* ═══════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════ */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function getDiaEmoji(dia) {
  const map = { Lunes: '🌙', Martes: '🔥', Miércoles: '💧', Jueves: '⚡', Viernes: '🎉', Sábado: '🎲', Domingo: '☀️' };
  return map[dia] || '📅';
}


/* ═══════════════════════════════════════════════════════
   SECCIÓN: RANKINGS DE LA COMUNIDAD
   ═══════════════════════════════════════════════════════ */

function renderRankingComunidad(el, d) {
  const msgRanking = (App.data && Array.isArray(App.data.ranking_mensajes_sin_leer))
    ? App.data.ranking_mensajes_sin_leer
    : [];

  if (window.innerWidth > 768) {
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.height = '100vh';
    el.style.maxHeight = '100vh';
    el.style.overflow = 'hidden';
    el.style.padding = '16px';
    el.style.boxSizing = 'border-box';
  }

  // Definición de Tiers de acumulación de mensajes
  const TIERS = [
    {
      id: 'todos',
      name: 'Todos',
      fullName: 'Ranking Histórico General',
      icon: '🌐',
      color: '#4ade80',
      activeBg: 'rgba(34, 197, 94, 0.16)',
      activeBorder: 'rgba(74, 222, 128, 0.45)',
      badgeText: '32 JUGADORES',
      desc: 'Tabla y podio general con todos los miembros registrados en la historia de Amigos Jugones.',
      gradient1: 'linear-gradient(180deg,#16a34a,#15803d)',
      gradient2: 'linear-gradient(180deg,#15803d,#166534)',
      gradient3: 'linear-gradient(180deg,#166534,#14532d)',
      barGradient: 'linear-gradient(90deg,#15803d,#4ade80)',
      filter: () => true
    },
    {
      id: 'legendario',
      name: 'Legendario (+4k)',
      fullName: 'Tier Legendario · Reyes del Silencio',
      icon: '👑',
      color: '#fbbf24',
      activeBg: 'rgba(251, 191, 36, 0.16)',
      activeBorder: 'rgba(251, 191, 36, 0.45)',
      badgeText: '+4.000 MENSAJES',
      desc: 'Los inalcanzables. Una acumulación casi mitológica que desafía las leyes de la mensajería instantánea.',
      gradient1: 'linear-gradient(180deg,#d97706,#b45309)',
      gradient2: 'linear-gradient(180deg,#b45309,#92400e)',
      gradient3: 'linear-gradient(180deg,#92400e,#78350f)',
      barGradient: 'linear-gradient(90deg,#b45309,#fbbf24)',
      filter: p => p.mensajes >= 4000
    },
    {
      id: 'epico',
      name: 'Épico (1k - 4k)',
      fullName: 'Tier Épico · Veteranos de 4 Cifras',
      icon: '⚡',
      color: '#38bdf8',
      activeBg: 'rgba(56, 189, 248, 0.16)',
      activeBorder: 'rgba(56, 189, 248, 0.45)',
      badgeText: '1.000 A 3.999 MENSAJES',
      desc: 'Días completos de silencio acumulado. Entran al grupo, ven la cifra de cuatro dígitos y eligen la paz mental 😄.',
      gradient1: 'linear-gradient(180deg,#0284c7,#0369a1)',
      gradient2: 'linear-gradient(180deg,#0369a1,#075985)',
      gradient3: 'linear-gradient(180deg,#075985,#0c4a6e)',
      barGradient: 'linear-gradient(90deg,#0369a1,#38bdf8)',
      filter: p => p.mensajes >= 1000 && p.mensajes < 4000
    },
    {
      id: 'heroico',
      name: 'Heroico (500 - 1k)',
      fullName: 'Tier Heroico · Escudo Anti-Spam',
      icon: '🛡️',
      color: '#c084fc',
      activeBg: 'rgba(192, 132, 252, 0.16)',
      activeBorder: 'rgba(192, 132, 252, 0.45)',
      badgeText: '500 A 999 MENSAJES',
      desc: 'Resistentes al bombardeo constante de notificaciones del chat. No son tantos como para asustarse, pero sí para ignorarlos un buen rato.',
      gradient1: 'linear-gradient(180deg,#7c3aed,#6d28d9)',
      gradient2: 'linear-gradient(180deg,#6d28d9,#5b21b6)',
      gradient3: 'linear-gradient(180deg,#5b21b6,#4c1d95)',
      barGradient: 'linear-gradient(90deg,#7c3aed,#c084fc)',
      filter: p => p.mensajes >= 500 && p.mensajes < 1000
    },
    {
      id: 'superviviente',
      name: 'Superviviente (<500)',
      fullName: 'Tier Superviviente · Al Borde del Día',
      icon: '🌱',
      color: '#4ade80',
      activeBg: 'rgba(74, 222, 128, 0.16)',
      activeBorder: 'rgba(74, 222, 128, 0.45)',
      badgeText: 'MENOS DE 500 MENSAJES',
      desc: 'El club de los que casi están al día, pero no del todo 😄. Con una buena tarde de lectura podrían ponerse al corriente.',
      gradient1: 'linear-gradient(180deg,#16a34a,#15803d)',
      gradient2: 'linear-gradient(180deg,#15803d,#166534)',
      gradient3: 'linear-gradient(180deg,#166534,#14532d)',
      barGradient: 'linear-gradient(90deg,#15803d,#4ade80)',
      filter: p => p.mensajes < 500
    }
  ];

  // Helper para generar el HTML de un panel de Tier
  function buildTierPanelHTML(t, allRanking) {
    const list = allRanking
      .map((p, originalIdx) => ({ ...p, globalRank: originalIdx + 1 }))
      .filter(t.filter);

    const tierMax = list[0]?.mensajes || 1;
    const top3 = list.slice(0, 3);
    const rest = list.slice(3);

    // Podio (si hay 3 o más jugadores en el tier)
    const podiumHTML = top3.length >= 3 ? `
      <div class="podium mb-16">
        ${top3[1] ? `
          <div class="podium-slot p2">
            <div class="podium-avatar" style="font-size:2rem;">${t.icon}</div>
            <div class="podium-name">${escapeHtml(top3[1].nombre)}</div>
            <div class="podium-pts" style="color:${t.color};">${top3[1].mensajes.toLocaleString()} 📨</div>
            <div style="font-size:0.7rem; color:var(--text-faint); margin-bottom:4px;">#${top3[1].globalRank} Global</div>
            <div class="podium-block" style="background:${t.gradient2};">2</div>
          </div>` : ''}
        ${top3[0] ? `
          <div class="podium-slot p1">
            <div class="podium-avatar" style="font-size:2.5rem;">${t.icon}</div>
            <div class="podium-name">${escapeHtml(top3[0].nombre)}</div>
            <div class="podium-pts" style="color:${t.color}; font-size:1.1rem; font-weight:900;">${top3[0].mensajes.toLocaleString()} 📨</div>
            <div style="font-size:0.7rem; color:var(--text-faint); margin-bottom:4px;">#${top3[0].globalRank} Global</div>
            <div class="podium-block" style="background:${t.gradient1};">1</div>
          </div>` : ''}
        ${top3[2] ? `
          <div class="podium-slot p3">
            <div class="podium-avatar" style="font-size:2rem;">${t.icon}</div>
            <div class="podium-name">${escapeHtml(top3[2].nombre)}</div>
            <div class="podium-pts" style="color:${t.color};">${top3[2].mensajes.toLocaleString()} 📨</div>
            <div style="font-size:0.7rem; color:var(--text-faint); margin-bottom:4px;">#${top3[2].globalRank} Global</div>
            <div class="podium-block" style="background:${t.gradient3};">3</div>
          </div>` : ''}
      </div>` : '';

    const tableItems = top3.length >= 3 ? rest : list;
    const startOffset = top3.length >= 3 ? 4 : 1;

    const tableHTML = tableItems.length > 0 ? `
      <div class="card" style="padding:0; overflow:hidden; margin-bottom:24px;">
        <table class="rank-table" style="width:100%;">
          <thead><tr>
            <th style="width:64px; text-align:center;"># Tier</th>
            <th>Jugador</th>
            <th style="width:110px; text-align:center;" class="hide-mobile">Global</th>
            <th style="text-align:right;">📨 Mensajes</th>
            <th class="hide-mobile" style="width:180px;">Racha Tier</th>
          </tr></thead>
          <tbody>
            ${tableItems.map((p, i) => {
      const localPos = startOffset + i;
      const pct = Math.round((p.mensajes / tierMax) * 100);
      return `<tr>
                <td style="text-align:center;"><div class="rank-pos" style="border-color:${t.activeBorder}; color:${t.color};">${localPos}</div></td>
                <td><div class="rank-name">${t.icon} ${escapeHtml(p.nombre)}</div></td>
                <td style="text-align:center;" class="hide-mobile">
                  <span class="badge" style="background:rgba(255,255,255,0.06); color:var(--text-dim); font-size:0.72rem; font-weight:700;">#${p.globalRank}</span>
                </td>
                <td style="text-align:right;">
                  <span style="font-size:0.92rem;font-weight:700;color:${t.color};">${p.mensajes.toLocaleString()}</span>
                </td>
                <td class="rank-bar-wrap hide-mobile">
                  <div class="rank-bar" style="width:${pct}%;background:${t.barGradient};"></div>
                </td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>` : '';

    const emptyHTML = list.length === 0 ? `
      <div class="card" style="text-align:center; padding:40px 20px;">
        <div style="font-size:2.5rem; margin-bottom:12px; opacity:0.6;">${t.icon}</div>
        <div class="font-bold mb-8">Sin jugadores en este tier</div>
        <p class="text-dim text-sm">Actualmente nadie se encuentra en este rango de acumulación.</p>
      </div>` : '';

    return `
      <!-- Banner explicativo del Tier -->
      <div style="margin-bottom:20px; padding:14px 18px; background:linear-gradient(135deg, ${t.activeBg}, rgba(10,10,20,0.4)); border:1px solid ${t.activeBorder}; border-radius:12px; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap;">
        <div style="display:flex; align-items:flex-start; gap:12px; flex:1 1 300px;">
          <div style="font-size:2rem; flex-shrink:0;">${t.icon}</div>
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
              <span style="font-weight:900; color:${t.color}; font-size:1.02rem;">${t.fullName}</span>
              <span class="badge" style="background:${t.activeBg}; border:1px solid ${t.activeBorder}; color:${t.color}; font-size:0.7rem; font-weight:800; padding:2px 8px;">${t.badgeText}</span>
            </div>
            <p style="font-size:0.83rem; color:var(--text-dim); margin:0; line-height:1.5;">${t.desc}</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; align-self:center;">
          <span class="badge" style="background:rgba(255,255,255,0.06); color:var(--text); font-size:0.8rem; font-weight:700; padding:6px 12px; border:1px solid rgba(255,255,255,0.1);">
            👥 ${list.length} en este tier
          </span>
        </div>
      </div>

      <!-- Podio top 3 si aplica -->
      ${podiumHTML}

      <!-- Tabla de posiciones -->
      ${tableHTML}

      <!-- Estado vacío si aplica -->
      ${emptyHTML}
    `;
  }

  el.innerHTML = `
    <style>
      .ranking-tiers-bar {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 12px;
        margin-bottom: 18px;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .ranking-tiers-bar::-webkit-scrollbar {
        display: none;
      }
      .tier-tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text-dim);
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: all 0.2s ease;
        user-select: none;
      }
      .tier-tab-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text);
        transform: translateY(-1px);
      }
      .tier-tab-btn.active {
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
      }
      .tier-tab-count {
        font-size: 0.72rem;
        padding: 2px 7px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.1);
        font-family: 'JetBrains Mono', monospace;
        font-weight: 800;
      }
      .tier-tab-btn-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* ── En Móvil: Disposición en Columna Vertical ── */
      @media (max-width: 768px) {
        .ranking-tiers-bar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-x: visible;
          padding-bottom: 0;
          margin-bottom: 16px;
        }
        .tier-tab-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          box-sizing: border-box;
          font-size: 0.88rem;
          min-height: 44px;
        }
        .tier-tab-btn-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .tier-tab-btn-left span:first-child {
          font-size: 1.15rem;
        }
      }
    </style>

    <div class="ranking-scroll-viewport" style="flex: 1 1 auto; overflow-y: auto; min-height: 0; padding-right: 6px;">
      <!-- Hero -->
      <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap:wrap;">
        <div style="flex:1 1 45%; min-width:280px;">
          ${renderSectionHero('📊 Rankings de la Comunidad', 'Estadísticas históricas y récords del grupo Amigos Jugones')}
        </div>
        <div class="radar-cta-card card" style="border-color:rgba(74,222,128,0.2); background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(16,185,129,0.04));">
          <div class="cta-icon" style="font-size:2rem;">📱</div>
          <div class="cta-text-wrap">
            <div class="cta-title" style="color:#4ade80;">Mensajes Sin Leer</div>
            <p class="cta-desc">El ranking más legendario del grupo. Cuantos más mensajes acumulás sin leer, más alto en la leyenda. Una competencia que nació sola… y que la comunidad pidió preservar para siempre.</p>
          </div>
          <div class="badge" style="background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(74,222,128,0.3);font-size:0.82rem;padding:6px 14px;">
            ${msgRanking.length} jugadores registrados
          </div>
        </div>
      </div>

      <!-- Tabs principales (expandible a futuro con más rankings) -->
      <div class="tabs-bar" id="ranking-tabs">
        <button class="tab-btn active" data-tab="mensajes">📱 Mensajes Sin Leer</button>
      </div>

      <div id="ranking-panels">
        <div class="tab-panel active" data-panel="mensajes">

          <!-- Barra de Sub-Pestañas / Tiers -->
          <div class="ranking-tiers-bar" id="ranking-tier-tabs">
            ${TIERS.map((t, idx) => {
    const count = msgRanking.filter(t.filter).length;
    const isFirst = idx === 0;
    const activeStyle = isFirst
      ? `background:${t.activeBg}; border-color:${t.activeBorder}; color:${t.color};`
      : '';
    return `
                <button class="tier-tab-btn ${isFirst ? 'active' : ''}"
                  data-tier="${t.id}"
                  data-color="${t.color}"
                  data-active-bg="${t.activeBg}"
                  data-active-border="${t.activeBorder}"
                  style="${activeStyle}">
                  <div class="tier-tab-btn-left">
                    <span>${t.icon}</span>
                    <span>${t.name}</span>
                  </div>
                  <span class="tier-tab-count">${count}</span>
                </button>
              `;
  }).join('')}
          </div>

          <!-- Contenedor de Paneles de Tiers -->
          <div id="ranking-tier-panels">
            ${TIERS.map((t, idx) => `
              <div class="tier-panel" data-tier-panel="${t.id}" style="${idx === 0 ? 'display:block;' : 'display:none;'}">
                ${buildTierPanelHTML(t, msgRanking)}
              </div>
            `).join('')}
          </div>

        </div>
      </div>
    </div>
  `;

  setupTabs(el, 'ranking-tabs', 'ranking-panels');

  // Setup interacción de sub-tabs de Tiers
  const tierTabsBar = el.querySelector('#ranking-tier-tabs');
  const tierPanelsWrap = el.querySelector('#ranking-tier-panels');
  if (tierTabsBar && tierPanelsWrap) {
    tierTabsBar.querySelectorAll('.tier-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tier;
        tierTabsBar.querySelectorAll('.tier-tab-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'rgba(255, 255, 255, 0.04)';
          b.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          b.style.color = 'var(--text-dim)';
        });
        tierPanelsWrap.querySelectorAll('.tier-panel').forEach(p => {
          p.style.display = 'none';
        });

        btn.classList.add('active');
        btn.style.background = btn.dataset.activeBg || 'rgba(74, 222, 128, 0.16)';
        btn.style.borderColor = btn.dataset.activeBorder || 'rgba(74, 222, 128, 0.45)';
        btn.style.color = btn.dataset.color || 'var(--text)';

        const activePanel = tierPanelsWrap.querySelector(`[data-tier-panel="${target}"]`);
        if (activePanel) activePanel.style.display = 'block';
      });
    });
  }
}


/* ═══════════════════════════════════════════════════════
   SECCIÓN: ADMINISTRACIÓN (ex La Realeza)
   ═══════════════════════════════════════════════════════ */

function renderRealeza(el, d) {

  /* La información de los administradores ahora viene dinámicamente del JSON del backend */
  const admins = d.administradores && d.administradores.length > 0 ? d.administradores : [];

  const renderAdminCard = (a) => `
    <div class="admin-card">
      <!-- Banner superior con avatar superpuesto -->
      <div class="admin-card-banner">
        <div class="admin-avatar-wrap">
          ${a.perfil
      ? `<img src="${escapeHtml(a.perfil)}" alt="${escapeHtml(a.nick || '')}" class="admin-avatar-img">`
      : `<div class="admin-avatar-placeholder">👑</div>`
    }
        </div>
      </div>

      <!-- Cuerpo -->
      <div class="admin-card-body">
        <!-- Badge de rango con corona circular -->
        <div class="admin-honor-badge">
          <div class="crown-circle">
            ${a.imagen_rol ? `<img src="${escapeHtml(a.imagen_rol)}" alt="Rango" style="width:75%; height:75%; object-fit:contain;">` : '👑'}
          </div>
          <span class="rank-text">${escapeHtml(a.rol || 'Administrador')}</span>
        </div>

        <div class="admin-nombre">${escapeHtml(a.nick || '')}</div>
        <div class="admin-cargo">${escapeHtml(a.funcion || '')}</div>
        <p class="admin-bio">${escapeHtml(a.bio || '')}</p>
      </div>

      <!-- Botones de contacto -->
      <div class="admin-card-actions">
        ${a.link_ig ? `<a href="${escapeHtml(a.link_ig.startsWith('http') ? a.link_ig : 'https://instagram.com/' + a.link_ig)}" target="_blank" class="admin-btn admin-btn-ig" title="Instagram">
          <img src="imagenes/INSTAGRAM.png" alt="IG">
        </a>` : ''}
        ${!a.link_ig
      ? `<span style="color:var(--text-dim); font-size:0.78rem; font-style:italic;">Datos próximamente</span>`
      : ''}
      </div>
    </div>
  `;

  el.innerHTML = `
    <div class="section-hero">
      <h1>👑 Administración</h1>
      <p>Conoce al equipo fundador y administrador de Amigos Jugones.</p>
    </div>
    <div class="admin-grid">
      ${admins.map(renderAdminCard).join('')}
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN: EVENTOS IMPORTANTES (FORMATO INSTAGRAM FEED)
   ═══════════════════════════════════════════════════════ */

function renderEventosDestacados(el, d) {
  // Obtenemos los eventos desde datos.json (soporta múltiples claves para flexibilidad)
  const rawEvents = d.eventos_destacados || d.eventos_importantes || d.eventos || [];

  // Parseador de fechas flexible (DD/MM/AAAA o AAAA-MM-DD + HH:MM)
  function parseEventDate(fechaStr, horaStr) {
    if (!fechaStr) return null;
    const str = String(fechaStr).trim();
    let day, month, year;

    if (str.includes('/')) {
      const parts = str.split('/');
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    } else {
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    let hours = 23, minutes = 59, seconds = 59;
    if (horaStr) {
      const m = String(horaStr).match(/(\d{1,2}):(\d{2})/);
      if (m) {
        hours = parseInt(m[1], 10);
        minutes = parseInt(m[2], 10);
        seconds = 0;
      }
    }

    const dateObj = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  // Auto-borrado: filtrar los eventos cuya fecha límite ya llegó o expiró
  const now = new Date();
  const activeEvents = rawEvents.filter(ev => {
    const expDate = parseEventDate(ev.fecha, ev.hora);
    if (!expDate) return true; // Si no hay fecha especificada, se mantiene visible
    return now < expDate; // Solo se muestra si AÚN NO ha llegado a la fecha del evento
  });

  // Helper: badge de cuenta regresiva (countdown)
  function getCountdownBadge(fechaStr, horaStr) {
    const target = parseEventDate(fechaStr, horaStr);
    if (!target) return '';
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return '🔥 ¡Hoy!';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays === 0) {
      return diffHours <= 1 ? '⚡ ¡En breve!' : `⏰ Hoy en ${diffHours}h`;
    }
    if (diffDays === 1) return '⚡ Mañana';
    return `⏳ Faltan ${diffDays} días`;
  }

  // Helper: formato de fecha amigable
  function formatFriendlyDate(fechaStr, horaStr) {
    const target = parseEventDate(fechaStr, horaStr);
    if (!target) return fechaStr || 'Próximamente';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSem = dias[target.getDay()];
    const diaNum = target.getDate();
    const mes = meses[target.getMonth()];
    const anio = target.getFullYear();
    let res = `${diaSem}, ${diaNum} ${mes} ${anio}`;
    if (horaStr && horaStr !== 'Todo el día') {
      res += ` · ${horaStr}`;
    }
    return res;
  }

  // Helper: formatear hashtags con estilo
  function formatCaptionHashtags(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    return escaped
      .replace(/#([\wñáéíóúÁÉÍÓÚ]+)/g, '<span class="ig-hashtag">#$1</span>')
      .replace(/\n/g, '<br>');
  }

  // Renderizar tarjeta individual de Instagram
  function renderInstagramCard(ev) {
    const imgUrl = ev.imagen || ev.foto || 'imagenes/LOGO AMIGOS JUGONES.png';
    const linkUrl = ev.link || ev.url || 'https://www.instagram.com/amigosjugonesymas/';
    const countdown = getCountdownBadge(ev.fecha, ev.hora);
    const fechaTexto = formatFriendlyDate(ev.fecha, ev.hora);
    const autor = ev.autor || 'amigosjugonesymas';
    const avatarUrl = ev.avatar || 'imagenes/LOGO AMIGOS JUGONES.png';
    const ubicacion = ev.ubicacion || 'Amigos Jugones Oficial';
    const titulo = ev.titulo ? escapeHtml(ev.titulo) : '';
    const descFormateada = formatCaptionHashtags(ev.descripcion || '');

    return `
      <article class="ig-card">
        <!-- Cabecera estilo Instagram -->
        <header class="ig-card-header">
          <div class="ig-user-profile">
            <div class="ig-avatar-ring">
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(autor)}" class="ig-avatar-img">
            </div>
            <div class="ig-user-meta">
              <div class="ig-username">
                <span>${escapeHtml(autor)}</span>
                <span class="ig-verified-badge" title="Verificado">✓</span>
              </div>
              <div class="ig-location">${escapeHtml(ubicacion)}</div>
            </div>
          </div>
          <button class="ig-more-btn" title="Opciones" aria-label="Opciones">•••</button>
        </header>

        <!-- Media / Foto de Instagram -->
        <div class="ig-card-media">
          <img src="${escapeHtml(imgUrl)}" alt="${titulo || 'Evento Amigos Jugones'}" class="ig-media-img" loading="lazy">
          ${countdown ? `<div class="ig-badge-countdown">${countdown}</div>` : ''}
          <div class="ig-badge-date">📅 ${escapeHtml(ev.fecha || 'Evento')}</div>
        </div>

        <!-- Botón de enlace directo a la publicación -->
        <div class="ig-card-actions">
          <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="ig-btn-publication">
            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            <span>Ver Publicación en Instagram ↗</span>
          </a>
        </div>

        <!-- Cuerpo / Caption del post -->
        <div class="ig-card-content">
          ${titulo ? `<div class="ig-caption-title">${titulo}</div>` : ''}
          <div class="ig-caption-text">
            <strong>${escapeHtml(autor)}</strong> ${descFormateada}
          </div>
          <div class="ig-event-schedule">
            <span>🗓️</span>
            <span>${escapeHtml(fechaTexto)}</span>
          </div>
        </div>
      </article>
    `;
  }

  // Inyección del layout completo con scroll interno
  el.innerHTML = `
    <div class="events-page-wrapper">
      <!-- Encabezado Estándar Amigos Jugones -->
      <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
        <div style="flex: 1 1 45%; min-width: 320px;">
          ${renderSectionHero('🌟 Eventos Destacados', 'Convocatorias oficiales, torneos y quedadas de la comunidad.')}
        </div>
        <div class="radar-cta-card card">
          <div class="cta-icon">📸</div>
          <div class="cta-text-wrap">
            <div class="cta-title">¿TIENES UN EVENTO?</div>
            <p class="cta-desc">¿Organizas un evento o concurso jugón? Queremos que la comunidad lo sepa y participe.</p>
          </div>
          <button onclick="AuthManager.abrirModalEvento('Evento')" class="btn btn-primary cta-btn" style="border:none; cursor:pointer;">
            <span style="font-size: 1.2rem;">✨</span>
            <span>Enviar Evento</span>
          </button>
        </div>
      </div>

      <!-- Viewport con scroll interno para los eventos (3 por fila) -->
      <div class="events-scroll-viewport">
        ${activeEvents.length > 0 ? `
          <div class="events-ig-grid">
            ${activeEvents.map(renderInstagramCard).join('')}
          </div>
        ` : `
          <div class="events-empty-state">
            <div class="events-empty-icon">🎲</div>
            <div class="events-empty-title">No hay eventos activos en este momento</div>
            <p class="events-empty-sub">
              Todos los eventos programados han concluido. ¡Vuelve pronto o revisa nuestro perfil oficial para enterarte de los nuevos lanzamientos!
            </p>
            <a href="https://www.instagram.com/amigosjugonesymas/" target="_blank" rel="noopener noreferrer" class="ig-btn-publication" style="max-width:280px;">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              <span>Ver Instagram Oficial ↗</span>
            </a>
          </div>
        `}
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN: CONCURSOS DESTACADOS (FORMATO INSTAGRAM FEED)
   ═══════════════════════════════════════════════════════ */

function renderConcursosDestacados(el, d) {
  // Obtenemos los concursos desde datos.json (soporta múltiples claves para flexibilidad)
  const rawConcursos = d.concursos_destacados || d.concursos || [];

  // Parseador de fechas flexible (DD/MM/AAAA o AAAA-MM-DD + HH:MM)
  function parseConcursoDate(fechaStr, horaStr) {
    if (!fechaStr) return null;
    const str = String(fechaStr).trim();
    let day, month, year;

    if (str.includes('/')) {
      const parts = str.split('/');
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts[0].length === 4) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      } else {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      }
    } else {
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    let hours = 23, minutes = 59, seconds = 59;
    if (horaStr) {
      const m = String(horaStr).match(/(\d{1,2}):(\d{2})/);
      if (m) {
        hours = parseInt(m[1], 10);
        minutes = parseInt(m[2], 10);
        seconds = 0;
      }
    }

    const dateObj = new Date(year, month, day, hours, minutes, seconds);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  // Auto-borrado: filtrar los concursos cuya fecha límite ya llegó o expiró
  const now = new Date();
  const activeConcursos = rawConcursos.filter(c => {
    const expDate = parseConcursoDate(c.fecha || c.fecha_termino, c.hora);
    if (!expDate) return true; // Si no hay fecha especificada, se mantiene visible
    return now < expDate; // Solo se muestra si AÚN NO ha llegado a la fecha límite
  });

  // Helper: badge de cuenta regresiva (countdown)
  function getCountdownBadge(fechaStr, horaStr) {
    const target = parseConcursoDate(fechaStr, horaStr);
    if (!target) return '🏅 Concurso';
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return '🔥 ¡Cierra Hoy!';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffDays === 0) {
      return diffHours <= 1 ? '⚡ ¡Última Hora!' : `⏰ Cierra en ${diffHours}h`;
    }
    if (diffDays === 1) return '⚡ Cierra Mañana';
    return `⏳ Quedan ${diffDays} días`;
  }

  // Helper: formato de fecha amigable
  function formatFriendlyDate(fechaStr, horaStr) {
    const target = parseConcursoDate(fechaStr, horaStr);
    if (!target) return fechaStr || 'Próximamente';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSem = dias[target.getDay()];
    const diaNum = target.getDate();
    const mes = meses[target.getMonth()];
    const anio = target.getFullYear();
    let res = `${diaSem}, ${diaNum} ${mes} ${anio}`;
    if (horaStr && horaStr !== 'Todo el día') {
      res += ` · ${horaStr}`;
    }
    return res;
  }

  // Helper: formatear hashtags con estilo
  function formatCaptionHashtags(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    return escaped
      .replace(/#([\wñáéíóúÁÉÍÓÚ]+)/g, '<span class="ig-hashtag">#$1</span>')
      .replace(/\n/g, '<br>');
  }

  // Renderizar tarjeta individual de Concurso estilo Instagram
  function renderConcursoInstagramCard(c) {
    const imgUrl = c.imagen || c.foto || 'imagenes/LOGO AMIGOS JUGONES.png';
    const linkUrl = c.link || c.url || 'https://www.instagram.com/amigosjugonesymas/';
    const countdown = getCountdownBadge(c.fecha || c.fecha_termino, c.hora);
    const fechaTexto = formatFriendlyDate(c.fecha || c.fecha_termino, c.hora);
    const autor = c.autor || c.organizador || 'amigosjugonesymas';
    const avatarUrl = c.avatar || 'imagenes/LOGO AMIGOS JUGONES.png';
    const ubicacion = c.ubicacion || c.lugar || 'Comunidad Amigos Jugones';
    const titulo = c.titulo ? escapeHtml(c.titulo) : '';
    const descFormateada = formatCaptionHashtags(c.descripcion || '');

    return `
      <article class="ig-card" style="border-color: rgba(236,72,153,0.35);">
        <!-- Cabecera estilo Instagram -->
        <header class="ig-card-header">
          <div class="ig-user-profile">
            <div class="ig-avatar-ring" style="border-color:#ec4899;">
              <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(autor)}" class="ig-avatar-img">
            </div>
            <div class="ig-user-meta">
              <div class="ig-username">
                <span>${escapeHtml(autor)}</span>
                <span class="ig-verified-badge" title="Verificado" style="color:#ec4899;">✓</span>
              </div>
              <div class="ig-location">${escapeHtml(ubicacion)}</div>
            </div>
          </div>
          <button class="ig-more-btn" title="Opciones" aria-label="Opciones">•••</button>
        </header>

        <!-- Media / Foto de Instagram -->
        <div class="ig-card-media">
          <img src="${escapeHtml(imgUrl)}" alt="${titulo || 'Concurso Amigos Jugones'}" class="ig-media-img" loading="lazy">
          ${countdown ? `<div class="ig-badge-countdown" style="border-color:rgba(236,72,153,0.6); color:#fbcfe8; background:rgba(14,11,30,0.88);">${countdown}</div>` : ''}
          <div class="ig-badge-date" style="border-color:rgba(245,158,11,0.5); color:#fef08a;">🏆 ${escapeHtml(c.fecha || c.fecha_termino || 'Concurso')}</div>
        </div>

        <!-- Botón de enlace directo a la publicación -->
        <div class="ig-card-actions">
          <a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="ig-btn-publication" style="background:linear-gradient(135deg,rgba(190,24,93,0.4),rgba(236,72,153,0.3)); border-color:rgba(236,72,153,0.6);">
            <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            <span>Ver Bases y Participar en Instagram ↗</span>
          </a>
        </div>

        <!-- Cuerpo / Caption del post -->
        <div class="ig-card-content">
          ${titulo ? `<div class="ig-caption-title" style="color:#fbcfe8;">${titulo}</div>` : ''}
          <div class="ig-caption-text">
            <strong>${escapeHtml(autor)}</strong> ${descFormateada}
          </div>
          <div class="ig-event-schedule" style="background:rgba(236,72,153,0.12); border-color:rgba(236,72,153,0.3);">
            <span>🏁</span>
            <span>Cierre: <strong>${escapeHtml(fechaTexto)}</strong></span>
          </div>
        </div>
      </article>
    `;
  }

  // Inyección del layout completo con scroll interno
  el.innerHTML = `
    <div class="events-page-wrapper">
      <!-- Encabezado Estándar Amigos Jugones -->
      <div class="radar-header-v2 flex justify-between items-center gap-24 mb-24" style="flex-wrap: wrap;">
        <div style="flex: 1 1 45%; min-width: 320px;">
          ${renderSectionHero('🏆 Concursos Destacados', 'Participa en torneos, sorteos y desafíos de la comunidad Amigos Jugones.')}
        </div>
        <div class="radar-cta-card card">
          <div class="cta-icon">🎁</div>
          <div class="cta-text-wrap">
            <div class="cta-title">¿TIENES UN CONCURSO?</div>
            <p class="cta-desc">¿Organizas un torneo o concurso para la comunidad jugona? Queremos que todos se enteren y participen.</p>
          </div>
          <button onclick="AuthManager.abrirModalEvento('Concurso')" class="btn btn-primary cta-btn" style="border:none; cursor:pointer;">
            <span style="font-size: 1.2rem;">✨</span>
            <span>Enviar Concurso</span>
          </button>
        </div>
      </div>

      <!-- Viewport con scroll interno para los concursos (3 por fila) -->
      <div class="events-scroll-viewport">
        ${activeConcursos.length > 0 ? `
          <div class="events-ig-grid">
            ${activeConcursos.map(renderConcursoInstagramCard).join('')}
          </div>
        ` : `
          <div class="events-empty-state">
            <div class="events-empty-icon">🏆</div>
            <div class="events-empty-title">No hay concursos activos en este momento</div>
            <p class="events-empty-sub">
              Actualmente no hay sorteos ni torneos abiertos. ¡Vuelve pronto o revisa nuestro perfil oficial de Instagram para participar en los próximos lanzamientos!
            </p>
            <a href="https://www.instagram.com/amigosjugonesymas/" target="_blank" rel="noopener noreferrer" class="ig-btn-publication" style="max-width:280px; background:linear-gradient(135deg,rgba(190,24,93,0.4),rgba(236,72,153,0.3)); border-color:rgba(236,72,153,0.6);">
              <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              <span>Ver Instagram Oficial ↗</span>
            </a>
          </div>
        `}
      </div>
    </div>
  `;
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN: JUEGOS & GENERADORES (SUITE ARCADE)
   ═══════════════════════════════════════════════════════ */

const GAMES_CATALOG = [
  {
    id: 'collagebg',
    title: 'CollageBG',
    tagline: 'Desafíos Visuales Combinados',
    icon: '🧩',
    color: '#a855f7',
    badge: 'NUEVO',
    desc: 'Combina una imagen central con hasta 3 imágenes secundarias móviles y texto para retos visuales.',
    url: 'juegos/collagebg/index.html'
  },
  {
    id: 'triviabg',
    title: 'TriviaBG',
    tagline: 'Preguntas y Opciones Múltiples',
    icon: '❓',
    color: '#ec4899',
    badge: 'POPULAR',
    desc: 'Genera tarjetas de preguntas y respuestas con 4 opciones A/B/C/D listas para compartir.',
    url: 'juegos/triviabg/index.html'
  },
  {
    id: 'versusbg',
    title: 'VersusBG',
    tagline: 'Duelo y Votación Directa',
    icon: '⚔️',
    color: '#f97316',
    badge: 'DUELOS',
    desc: 'Crea enfrentamientos cara a cara entre dos juegos, personajes o temas con votación.',
    url: 'juegos/versusbg/index.html'
  },
  {
    id: 'siluetabg',
    title: 'SiluetaBG',
    tagline: 'Adivina la Forma Misteriosa',
    icon: '👤',
    color: '#06b6d4',
    badge: 'SOMBRAS',
    desc: 'Convierte portadas e imágenes en siluetas negras para poner a prueba el ojo del grupo.',
    url: 'juegos/siluetabg/index.html'
  },
  {
    id: 'revoltijobg',
    title: 'RevoltijoBG',
    tagline: 'Anagramas y Letras Mezcladas',
    icon: '🔤',
    color: '#ffd100',
    badge: 'LETRAS',
    desc: 'Desordena palabras clave o títulos de juegos de mesa para descifrar en tiempo récord.',
    url: 'juegos/revoltijobg/index.html'
  },
  {
    id: 'puzzlebg',
    title: 'PuzzleBG',
    tagline: 'Rompecabezas por Piezas',
    icon: '🧩',
    color: '#10b981',
    badge: 'PIEZAS',
    desc: 'Divide una escena en cuadrícula desordenada para adivinar el juego completo.',
    url: 'juegos/puzzlebg/index.html'
  },
  {
    id: 'pistasbg',
    title: 'PistasBG',
    tagline: 'Deducción Progresiva',
    icon: '🔍',
    color: '#3b82f6',
    badge: 'PISTAS',
    desc: 'Revela hasta 4 pistas consecutivas para que el grupo adivine antes de la solución.',
    url: 'juegos/pistasbg/index.html'
  },
  {
    id: 'pixelbg',
    title: 'PixelBG',
    tagline: 'Pixel Art Retroarcade',
    icon: '👾',
    color: '#e11d48',
    badge: 'PIXEL',
    desc: 'Pixeliza portadas o fotos con distintos niveles de resolución retro pixelada.',
    url: 'juegos/pixelbg/index.html'
  }
];

let activeGameId = 'collagebg';

function renderJuegos(el, d) {
  const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
  const currentNick = window.AuthManager ? window.AuthManager.getNick() : 'Invitado';
  const currentPoints = window.AuthManager ? window.AuthManager.getPoints() : 0;
  const cbRanking = typeof getCbRanking === 'function' ? getCbRanking() : (CB_DEFAULT_RANKING || []);

  // Bloqueo total si no está autenticado (Área exclusiva para miembros)
  if (!isAuth) {
    el.innerHTML = `
      ${renderSectionHero('🎮 Hub Central de Juegos', 'Minijuegos competitivos neón y generadores de desafíos oficiales', 'EXCLUSIVO MIEMBROS')}
      
      <div class="card glow" style="margin: 30px auto; max-width: 620px; text-align: center; padding: 40px 24px; border: 1px solid rgba(168, 85, 247, 0.45); background: linear-gradient(145deg, #121028 0%, #0d0d1e 100%); border-radius: var(--radius-lg); box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
        <div style="font-size: 3.5rem; margin-bottom: 12px; filter: drop-shadow(0 0 16px rgba(236, 72, 153, 0.45));">🔒</div>
        <h2 style="color: var(--text); font-size: 1.4rem; font-weight: 800; margin-bottom: 8px;">Zona Exclusiva para Miembros</h2>
        <p style="color: var(--text-dim); font-size: 0.9rem; max-width: 480px; margin: 0 auto 16px auto; line-height: 1.6;">
          Los minijuegos arcade competitivos y la suite de generadores del club están reservados para los integrantes del grupo de WhatsApp. Identifícate para desbloquear el acceso completo.
        </p>

        <!-- Aclaración: Autenticación por Única Vez -->
        <div style="background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: var(--radius-sm); padding: 12px 14px; margin: 0 auto 22px auto; max-width: 480px; font-size: 0.78rem; color: var(--text-dim); line-height: 1.45; text-align: left;">
          <strong style="color: var(--accent-light); display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
            <span>🛡️</span> Autenticación por Única Vez
          </strong>
          Al identificarte, el navegador guarda tu credencial segura de miembro. No tendrás que volver a ingresar tus datos ni depender de las rotaciones de clave semanal para jugar, canjear fichas y cobrar la renta pasiva diaria.
        </div>

        <button onclick="AuthManager.showModal({ reason: 'Identifícate con tus credenciales de miembro para ingresar al Hub de Juegos y Generadores.' })" class="arcade-start-btn" style="padding: 13px 26px; font-size: 0.95rem; font-weight: 800; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase;">
          Desbloquear Juegos 🚀
        </button>
        <div style="margin-top: 18px; font-size: 0.75rem; color: var(--text-faint);">
          Para pruebas de desarrollo, puedes usar la clave <code>AJ2026</code> o el botón de <em>Acceso Rápido (Dev Mode)</em> en el modal.
        </div>
      </div>
    `;
    return;
  }

  // Obtener ranking de ninja de localStorage o mock
  let ninjaRanking = [];
  try {
    const rawNinja = localStorage.getItem('cb_ninja_ranking');
    if (rawNinja) ninjaRanking = JSON.parse(rawNinja);
  } catch (e) { }
  if (!ninjaRanking || ninjaRanking.length === 0) {
    ninjaRanking = [
      { pilot: 'Nico (Sensei)', score: 34500, time: 64, cuts: 82, rent: '+3 PTS/día' },
      { pilot: 'Jess_Shadow', score: 28900, time: 51, cuts: 68, rent: '+2 PTS/día' },
      { pilot: 'Kuro_Dragon', score: 21300, time: 42, cuts: 54, rent: '+1 PTS/día' }
    ];
  }

  el.innerHTML = `
    <div class="games-suite-page">

      <!-- Encabezado Principal y Perfil de Miembro Compacto -->
      <div class="radar-header-v2 flex justify-between items-center gap-16 mb-8" style="flex-wrap: wrap;">
        <div style="flex: 1 1 auto; min-width: 260px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
            <h1 style="font-size: 1.55rem; font-weight: 900; margin: 0; background: linear-gradient(90deg, var(--primary-light), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🎮 Hub Central de Juegos</h1>
            <span class="badge badge-purple" style="font-size:0.65rem; padding: 2px 7px;">SUITE JUGONA</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-dim); margin: 0;">Minijuegos competitivos neón y generadores de desafíos oficiales del Club.</p>
        </div>
        
        <div class="card glow" style="padding: 6px 14px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.12) 100%); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: var(--radius); display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.72rem; text-transform: uppercase; color: var(--accent-light); font-weight: 700;">👤</span>
            <span style="font-size: 0.95rem; font-weight: 800; color: var(--text);">${escapeHtml(currentNick)}</span>
            <span class="badge badge-purple" style="font-size: 0.62rem; padding: 1px 6px;">VERIFICADO</span>
          </div>
          <div style="height: 18px; width: 1px; background: rgba(255,255,255,0.12);"></div>
          <div style="font-size: 0.85rem; font-family: 'JetBrains Mono', monospace; color: var(--gold); font-weight: 700;">
            🪙 ${currentPoints} PTS
          </div>
          <div style="font-size: 0.7rem; color: var(--text-dim);">
            🎟️ Ficha: <strong style="color:var(--text); font-family:'JetBrains Mono', monospace;">10 PTS</strong>
          </div>
          <button onclick="AuthManager.logout();" class="tab-btn" style="padding: 4px 10px; font-size: 0.72rem; border-radius: var(--radius-sm); border: 1px solid var(--border); color: var(--text-dim); background: rgba(255,255,255,0.04); cursor: pointer;">
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      <!-- PESTAÑAS ESTÁNDAR DEL SITIO -->
      <div class="tabs-bar flex justify-between items-center" id="juegos-tabs" style="margin-bottom: 8px;">
        <div class="flex items-center gap-8">
          <button class="tab-btn active" data-tab="arcade">🕹️ Máquinas Arcade</button>
          <button class="tab-btn" data-tab="generadores">🧩 Generadores de Desafíos</button>
        </div>
        <div style="margin-left: auto;">
          <span class="badge" style="background:rgba(16, 185, 129, 0.15); color:var(--green); border:1px solid var(--green); font-size:0.68rem; padding:3px 10px;">100% Gratis · Comunidad</span>
        </div>
      </div>

      <div id="juegos-panels">
        
        <!-- PANEL 1: MÁQUINAS ARCADE -->
        <div class="tab-panel active" data-panel="arcade">
          <div class="flex items-center gap-8 mb-12">
            <span style="font-size: 1.15rem;">🕹️</span>
            <h2 style="font-size: 1.1rem; font-weight: 800; color: var(--text);">Máquinas Arcade Competitivas</h2>
            <span class="badge badge-purple" style="margin-left: auto; font-size: 0.68rem; padding: 2px 8px;">Top 3 cobra Renta Diaria (+3/+2/+1 PTS)</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px;">
            
            <!-- TARJETA ARCADE: CIRCUITO BLACK -->
            <div class="card glow" style="position:relative; overflow:hidden; padding: 16px 20px; border: 1px solid rgba(236, 72, 153, 0.4); background: linear-gradient(145deg, #13112c 0%, #0d0d1e 100%); border-radius: var(--radius-lg);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div>
                  <span class="badge" style="background:rgba(236, 72, 153, 0.2); color:var(--accent-light); border:1px solid var(--accent); font-size:0.68rem; font-weight:800;">3D ARCADE · VELOCIDAD</span>
                  <h3 style="font-size:1.2rem; font-weight:900; color:var(--text); margin-top:4px; display:flex; align-items:center; gap:8px;">
                    🏎️ Circuito Black
                  </h3>
                </div>
                <div style="font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:var(--gold); background:rgba(245, 158, 11, 0.15); border:1px solid rgba(245, 158, 11, 0.4); padding:3px 8px; border-radius:var(--radius-sm);">
                  -10 PTS / ficha
                </div>
              </div>

              <p style="font-size:0.78rem; color:var(--text-dim); line-height:1.4; margin-bottom:12px;">
                Carrera retro tridimensional a 250 km/h. Esquiva obstáculos, recolecta monedas doradas y asegura tu cupo en el Salón de la Fama.
              </p>

              <!-- Podio Semanal Resumido -->
              <div style="background:rgba(0,0,0,0.3); border-radius:var(--radius-sm); padding:8px 10px; margin-bottom:14px; border:1px solid var(--border);">
                <div style="font-size:0.68rem; color:var(--text-faint); font-weight:700; text-transform:uppercase; margin-bottom:4px;">🏆 Podio Semanal Activo:</div>
                ${cbRanking.slice(0, 3).map((r, i) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; padding:2px 0; border-bottom: ${i < 2 ? '1px dashed rgba(255,255,255,0.06)' : 'none'};">
                    <span style="color:var(--text); font-weight:600;">${['🥇', '🥈', '🥉'][i]} ${escapeHtml(r.pilot)}</span>
                    <span style="font-family:'JetBrains Mono', monospace; color:var(--accent-light);">${r.km} KM <span style="font-size:0.68rem; color:var(--gold);">(${r.rent})</span></span>
                  </div>
                `).join('')}
              </div>

              <button onclick="window.gotoArcade('carrera.html', 'circuito_black')" class="arcade-start-btn" style="display:block; width:100%; text-align:center; padding:10px; border:none; cursor:pointer; font-size:0.8rem; font-weight:800; text-transform:uppercase; background:linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color:white; border-radius:var(--radius-sm); letter-spacing:0.5px; box-shadow:0 4px 15px rgba(236, 72, 153, 0.3);">
                Entrar a la Pista (-10 PTS) 🚀
              </button>
            </div>

            <!-- TARJETA ARCADE: CYBER NINJA (DOHYŌ) -->
            <div class="card glow" style="position:relative; overflow:hidden; padding: 16px 20px; border: 1px solid rgba(6, 182, 212, 0.4); background: linear-gradient(145deg, #0f172a 0%, #0d0d1e 100%); border-radius: var(--radius-lg);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <div>
                  <span class="badge" style="background:rgba(6, 182, 212, 0.2); color:var(--cyan); border:1px solid var(--cyan); font-size:0.68rem; font-weight:800;">360° REFLEJOS · TATAMI</span>
                  <h3 style="font-size:1.2rem; font-weight:900; color:var(--text); margin-top:4px; display:flex; align-items:center; gap:8px;">
                    ⚔️ Cyber Ninja (Dohyō)
                  </h3>
                </div>
                <div style="font-family:'JetBrains Mono', monospace; font-size:0.75rem; color:var(--gold); background:rgba(245, 158, 11, 0.15); border:1px solid rgba(245, 158, 11, 0.4); padding:3px 8px; border-radius:var(--radius-sm);">
                  -10 PTS / ficha
                </div>
              </div>

              <p style="font-size:0.78rem; color:var(--text-dim); line-height:1.4; margin-bottom:12px;">
                Supervivencia orbital y reflejos. Corta con precisión a los invasores mecánicos antes de que invadan el círculo sagrado del club.
              </p>

              <!-- Podio Semanal Resumido -->
              <div style="background:rgba(0,0,0,0.3); border-radius:var(--radius-sm); padding:8px 10px; margin-bottom:14px; border:1px solid var(--border);">
                <div style="font-size:0.68rem; color:var(--text-faint); font-weight:700; text-transform:uppercase; margin-bottom:4px;">🏆 Podio Semanal Activo:</div>
                ${ninjaRanking.slice(0, 3).map((r, i) => `
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; padding:2px 0; border-bottom: ${i < 2 ? '1px dashed rgba(255,255,255,0.06)' : 'none'};">
                    <span style="color:var(--text); font-weight:600;">${['🥇', '🥈', '🥉'][i]} ${escapeHtml(r.pilot)}</span>
                    <span style="font-family:'JetBrains Mono', monospace; color:var(--cyan);">${(r.score || 0).toLocaleString()} PTS <span style="font-size:0.68rem; color:var(--gold);">(${r.rent || '+1 PTS'})</span></span>
                  </div>
                `).join('')}
              </div>

              <button onclick="window.gotoArcade('pelea.html', 'cyber_ninja')" class="arcade-start-btn" style="display:block; width:100%; text-align:center; padding:10px; border:none; cursor:pointer; font-size:0.8rem; font-weight:800; text-transform:uppercase; background:linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color:white; border-radius:var(--radius-sm); letter-spacing:0.5px; box-shadow:0 4px 15px rgba(6, 182, 212, 0.3);">
                Entrar al Dohyō (-10 PTS) ⚔️
              </button>
            </div>

          </div>
        </div>

        <!-- PANEL 2: GENERADORES DE DESAFÍOS -->
        <div class="tab-panel" data-panel="generadores">
          <div class="games-appstore-scroll">
            <div class="games-appstore-grid">
              ${GAMES_CATALOG.map(game => `
                <a href="${game.url}" target="_blank" rel="noopener noreferrer"
                   class="game-appstore-card"
                   style="--game-color: ${game.color};"
                   title="Abrir ${game.title}">

                  <!-- Glow de fondo -->
                  <div class="game-card-glow"></div>

                  <!-- Cabecera de la tarjeta -->
                  <div class="game-card-header">
                    <div class="game-card-icon-wrap">
                      <span class="game-card-icon">${game.icon}</span>
                    </div>
                    <div class="game-card-meta">
                      ${game.badge ? `<span class="game-card-badge">${game.badge}</span>` : ''}
                    </div>
                  </div>

                  <!-- Cuerpo -->
                  <div class="game-card-body">
                    <div class="game-card-title">${game.title}</div>
                    <div class="game-card-tagline">${game.tagline}</div>
                    <p class="game-card-desc">${game.desc}</p>
                  </div>

                  <!-- Pie de la tarjeta -->
                  <div class="game-card-footer">
                    <span class="game-card-open-btn">
                      Crear desafío
                      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </span>
                    <span class="game-card-ext-icon" title="Abre en nueva pestaña">↗</span>
                  </div>

                  <!-- Barra de color inferior -->
                  <div class="game-card-color-bar"></div>
                </a>
              `).join('')}
            </div>
          </div>
        </div>

      </div>

    </div>
  `;

  // Activar pestañas con el helper nativo de Amigos Jugones
  setupTabs(el, 'juegos-tabs', 'juegos-panels');
}

/* ═══════════════════════════════════════════════════════
   SECCIÓN: CIRCUITO BLACK — JUEGO DE CARRERAS ARCADE
   Motor: Canvas 2D | Perspectiva 3D | Obstáculos reales
   ═══════════════════════════════════════════════════════ */

// ─── ESTADO DEL MINI-RANKING (localStorage + datos.json) ───────────────────

const CB_DEFAULT_RANKING = [
  { pilot: 'Nico (Admin)', km: 2840, date: '12/10', car: '🏎️', rent: '+3 PTS/día' },
  { pilot: 'Jess_RedBlack', km: 2210, date: '11/10', car: '🚀', rent: '+2 PTS/día' },
  { pilot: 'Lord Ricardragon', km: 1750, date: '10/10', car: '⚡', rent: '+1 PTS/día' },
  { pilot: 'Karlita', km: 1120, date: '09/10', car: '🏎️', rent: '-' },
  { pilot: 'Angel V.', km: 880, date: '08/10', car: '🚀', rent: '-' }
];

function getCbRanking() {
  try {
    const d = localStorage.getItem('cb_ranking_v2');
    if (d) return JSON.parse(d);
  } catch (e) { /**/ }
  return CB_DEFAULT_RANKING;
}

function saveCbRanking(ranking) {
  try { localStorage.setItem('cb_ranking_v2', JSON.stringify(ranking)); } catch (e) { /**/ }
}

function updateCbRankingWithScore(pilot, km) {
  let ranking = getCbRanking();
  const dateStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  const car = ['🏎️', '🚀', '⚡'][Math.floor(Math.random() * 3)];
  ranking.push({ pilot, km, date: dateStr, car, rent: '-' });
  ranking.sort((a, b) => b.km - a.km);
  ranking = ranking.slice(0, 5);
  const rents = ['+3 PTS/día', '+2 PTS/día', '+1 PTS/día'];
  ranking.forEach((r, i) => { r.rent = rents[i] || '-'; });
  saveCbRanking(ranking);
}

// ─── MOTOR DEL JUEGO ARCADE (Canvas 2D) ────────────────────────────────────

let cbLogoImg = null;
let cbCanUseLogoImg = (typeof window !== 'undefined' && window.location.protocol !== 'file:');
function getCbLogo() {
  if (!cbLogoImg && cbCanUseLogoImg) {
    try {
      cbLogoImg = new Image();
      cbLogoImg.crossOrigin = 'anonymous';
      cbLogoImg.src = 'imagenes/LOGO AMIGOS JUGONES.png';
    } catch (e) {
      cbCanUseLogoImg = false;
    }
  }
  return cbLogoImg;
}
if (cbCanUseLogoImg) getCbLogo();

let cbGame = null; // referencia al loop del juego

function renderCarrera(el, d) {
  if (d && Array.isArray(d.carrera_ranking) && d.carrera_ranking.length > 0) {
    saveCbRanking(d.carrera_ranking);
  }

  // Detener cualquier loop de juego anterior
  if (cbGame && cbGame.running) {
    cbGame.running = false;
    cbGame.cleanup();
  }

  const isAuth = Boolean(window.AuthManager && window.AuthManager.isAuthenticated());
  const currentNick = isAuth ? window.AuthManager.getNick() : (localStorage.getItem('cb_pilot_name') || '');
  const currentPoints = isAuth ? window.AuthManager.getPoints() : 0;

  el.innerHTML = `
    <div class="carrera-suite-page">

      <!-- Encabezado -->
      <div class="radar-header-v2 flex justify-between items-center gap-24 mb-16" style="flex-wrap:wrap;">
        <div>
          <div class="title-with-badge flex items-center gap-12 mb-8">
            <h1 class="text-3xl font-extrabold m-0 flex items-center gap-8" style="color:#fff;letter-spacing:-0.5px;">
              <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones" style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(245,158,11,0.6));">
              Circuito Black
            </h1>
            <span class="badge" style="background:rgba(249,115,22,.15);color:#f97316;border:1px solid rgba(249,115,22,.4);font-size:.72rem;font-weight:800;">ARCADE · SUMIDERO</span>
          </div>
          <p class="text-sm m-0" style="color:var(--text-dim);line-height:1.5;">
            Esquiva los autos rivales y acumula la mayor distancia. El <strong>Top 3 del podio</strong> cobra <strong>renta pasiva diaria</strong> de puntos. <kbd style="background:rgba(255,255,255,.1);border-radius:4px;padding:1px 6px;">← →</kbd> / <kbd style="background:rgba(255,255,255,.1);border-radius:4px;padding:1px 6px;">A D</kbd> o toca los laterales de la pantalla.
          </p>
        </div>
        <div class="card glow flex items-center gap-12" style="padding:10px 18px;border-color:rgba(249,115,22,.4);background:rgba(249,115,22,.05);">
          <span style="font-size:1.5rem;">🎫</span>
          <div>
            <div style="font-size:.7rem;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Ticket de Entrada</div>
            <div style="font-size:.95rem;font-weight:800;color:#f97316;">10 PTS por tanda</div>
          </div>
        </div>
      </div>

      <!-- Grid principal -->
      <div class="carrera-scroll-viewport">
        <div class="carrera-layout-grid">

          <!-- Columna 1: Canvas del juego -->
          <div id="cb-game-col" class="flex flex-col gap-12">
            <!-- Pantalla de setup / resultado -->
            <div id="cb-screen-setup" class="card glow flex flex-col gap-16" style="padding:24px;border-color:rgba(236,72,153,.4);">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-12">
                  <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones" style="width:68px;height:68px;object-fit:contain;filter:drop-shadow(0 0 18px rgba(245,158,11,0.65)) drop-shadow(0 0 6px rgba(245,158,11,0.35));">
                  <div>
                    <h2 class="text-xl font-extrabold m-0" style="color:#fff;">Parrilla de Salida</h2>
                    <p class="text-xs m-0" style="color:var(--text-dim);">Ingresa tu nick y elige tu bólido oficial.</p>
                  </div>
                </div>
                <button type="button" onclick="window.cbToggleFullscreen()" class="cb-hud-btn" style="padding:7px 12px;font-size:0.8rem;gap:6px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:8px;">
                  ⛶ Pantalla Completa
                </button>
              </div>

              <!-- Tarjeta de Saldo y Estado del Piloto -->
              <div id="cb-player-status-card" style="display:flex; justify-content:space-between; align-items:center; background:rgba(124,58,237,0.15); border:1px solid rgba(168,85,247,0.35); padding:12px 16px; border-radius:10px;">
                <div>
                  <div style="font-size:0.72rem; color:var(--text-dim); text-transform:uppercase; font-weight:700;">Piloto Identificado</div>
                  <div style="font-size:0.95rem; font-weight:800; color:#fff;" id="cb-status-nick">${isAuth ? `👤 ${currentNick}` : 'Invitado (Sin verificar)'}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:0.72rem; color:var(--text-dim); text-transform:uppercase; font-weight:700;">Tu Saldo Actual</div>
                  <div style="font-family:'JetBrains Mono',monospace; font-size:1.15rem; font-weight:900; color:#f59e0b;" id="cb-status-pts">🪙 ${currentPoints} PTS</div>
                </div>
              </div>

              <div>
                <label style="display:block;font-size:.8rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">Tu Nick en WhatsApp:</label>
                <input type="text" id="cb-pilot-input" placeholder="Ej: Nico, Jess, Ricardragon..."
                  value="${escapeHtml(currentNick || '')}" maxlength="25"
                  style="width:100%;padding:12px 16px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:1rem;font-weight:700;outline:none;box-sizing:border-box;">
              </div>

              <!-- Selector de color de bólido -->
              <div>
                <label style="display:block;font-size:.8rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">Elige tu Bólido:</label>
                <div style="display:flex;gap:10px;">
                  ${[
      { id: 'cyan', name: 'Cyber Phantom', color: '#06b6d4' },
      { id: 'pink', name: 'Crimson Fury', color: '#ec4899' },
      { id: 'gold', name: 'Neon Viper', color: '#f59e0b' }
    ].map(car => `
                    <div class="cb-car-pick card" onclick="window.cbPickCar('${car.id}')" data-carid="${car.id}"
                      style="flex:1;padding:12px;cursor:pointer;text-align:center;border-color:rgba(255,255,255,.08);transition:all .2s;">
                      <div style="width:38px;height:26px;background:${car.color};border-radius:6px;margin:0 auto 6px;box-shadow:0 0 12px ${car.color}88;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(255,255,255,0.3);">
                        <img src="imagenes/LOGO AMIGOS JUGONES.png" style="width:22px;height:22px;object-fit:contain;">
                      </div>
                      <span style="font-size:.78rem;font-weight:700;color:var(--text-dim);">${car.name}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div style="background:rgba(0,0,0,.4);border-radius:10px;padding:14px;font-size:.82rem;line-height:1.6;color:var(--text-dim);border-left:3px solid var(--accent);">
                <strong style="color:#fff;">Controles:</strong><br>
                🖥️ <strong>Flechas ← →</strong> o teclas <strong>A / D</strong> para cambiar de carril.<br>
                📱 <strong>Desliza</strong> el dedo izquierda / derecha en el canvas.<br>
                Sobrevive el máximo tiempo posible y acumula KM. 3 vidas. 🏁
              </div>

              <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,.45);padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.08);">
                <div class="flex items-center gap-8">
                  <span style="font-size:1.1rem;">⛶</span>
                  <div>
                    <div style="font-size:.82rem;font-weight:800;color:#fff;">Jugar en Pantalla Completa</div>
                    <div style="font-size:.68rem;color:var(--text-dim);">Entrar automáticamente en pantalla completa al arrancar</div>
                  </div>
                </div>
                <input type="checkbox" id="cb-auto-fullscreen-check" checked style="width:18px;height:18px;accent-color:#06b6d4;cursor:pointer;">
              </div>

              <button onclick="window.cbLaunchGame()" class="cb-btn-nitro" style="width:100%;font-size:1.15rem;padding:16px;">
                🚦 ARRANCAR MOTOR (-10 PTS)
              </button>
            </div>

            <!-- Contenedor Arcade de Circuito Black (oculto hasta arrancar) -->
            <div id="cb-canvas-wrapper" style="display:none;">
              <div id="cb-game-cabinet">
                <canvas id="cb-canvas"></canvas>
                <!-- Barra de Controles Arcade (HUD interactivo HTML ubicado abajo para no obstruir los KM ni la telemetría) -->
                <!-- No se graba en el video porque son botones HTML fuera del canvas -->
                <div id="cb-hud-controls" style="position:absolute;bottom:12px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;pointer-events:auto;z-index:6;">
                  <div style="display:flex;gap:6px;align-items:center;">
                    <button id="cb-btn-record" onclick="window.cbToggleRecord()" title="Grabar Partida (MP4 con audio)" class="cb-hud-btn" style="background:rgba(220,38,38,0.3);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;font-weight:800;font-size:0.68rem;padding:5px 9px;border-radius:6px;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(0,0,0,0.5);">
                      <span class="cb-rec-pulse cb-blinking" style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;box-shadow:0 0 6px #ef4444;margin-right:4px;"></span>
                      <span id="cb-rec-text">REC</span>
                    </button>
                  </div>
                  <div style="display:flex;gap:5px;align-items:center;">
                    <button id="cb-btn-music" onclick="window.cbToggleMusic()" title="Silenciar / Activar Música" class="cb-hud-btn" style="width:28px;height:28px;padding:0;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.5);">🎵</button>
                    <button id="cb-btn-sfx" onclick="window.cbToggleSfx()" title="Silenciar / Activar Efectos" class="cb-hud-btn" style="width:28px;height:28px;padding:0;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.5);">🔊</button>
                    <button id="cb-btn-fs" onclick="window.cbToggleFullscreen()" title="Pantalla Completa" class="cb-hud-btn" style="width:28px;height:28px;padding:0;font-size:0.85rem;box-shadow:0 2px 8px rgba(0,0,0,0.5);">⛶</button>
                  </div>
                </div>

                <!-- Overlay de pausa / flash / arrancada -->
                <div id="cb-overlay-msg" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.75);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10;backdrop-filter:blur(6px);">
                  <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones" style="width:80px;height:80px;object-fit:contain;filter:drop-shadow(0 0 20px rgba(245,158,11,0.7)) drop-shadow(0 0 8px rgba(245,158,11,0.4));margin-bottom:4px;">
                  <div id="cb-overlay-icon" style="font-size:4rem;"></div>
                  <div id="cb-overlay-title" style="font-size:2rem;font-weight:900;color:#fff;"></div>
                  <div id="cb-overlay-sub" style="font-size:.9rem;color:var(--text-dim);text-align:center;max-width:280px;"></div>
                  <button id="cb-overlay-btn" style="margin-top:8px;padding:12px 28px;background:linear-gradient(135deg,#f97316,#ec4899);border:none;border-radius:10px;color:#fff;font-size:1rem;font-weight:800;cursor:pointer;"></button>
                </div>
              </div>
            </div>
          </div>

          <!-- Columna 2: Mini-Ranking -->
          <div class="card glow flex flex-col gap-16" style="padding:20px;border-color:rgba(6,182,212,.3);">
            <div class="flex justify-between items-center" style="border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:12px;">
              <div>
                <div class="text-xs uppercase font-bold" style="color:var(--cyan);letter-spacing:1px;">Mini-Ranking Oficial</div>
                <h3 class="text-lg font-extrabold m-0" style="color:#fff;">🏆 Podio de la Pista</h3>
              </div>
              <span class="badge" style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3);font-size:.7rem;">💧 Renta Pasiva</span>
            </div>
            <p class="text-xs m-0" style="color:var(--text-dim);line-height:1.4;">
              El <strong>Top 3</strong> cobra puntos pasivos todos los días. Nadie puede destronarte sin superar tu marca.
            </p>
            <div class="cb-ranking-list" id="cb-ranking-list">
              ${renderCbRankingRows()}
            </div>
            <div class="card" style="padding:12px;background:rgba(0,0,0,.4);border-color:rgba(255,255,255,.06);font-size:.78rem;line-height:1.5;color:var(--text-dim);">
              <strong style="color:var(--text);">¿Cómo reclamar tu marca?</strong><br>
              Al terminar la partida, copia tu ficha de telemetría y envíala al grupo de WhatsApp. El Administrador dicta a Lunara tu resultado para validar el podio.
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Inicializar selección de bólido
  window.cbPickCar('cyan');
}

// ─── ENTRADA ARCADE DESDE JUEGOS.HTML ──────────────────────────────────────
// Valida autenticación y saldo antes de dirigir a la cabina del juego.
window.gotoArcade = function (url, gameKey) {
  if (window.AuthManager) {
    if (!window.AuthManager.isAuthenticated()) {
      window.AuthManager.showModal({
        reason: 'Identifícate como miembro del club para acceder a los juegos arcade y competir por la renta pasiva semanal.'
      });
      return;
    }

    if (!window.AuthManager.hasEnoughPoints(10)) {
      alert(`⚠️ Saldo insuficiente (${window.AuthManager.getPoints()} PTS). Necesitas al menos 10 PTS para canjear una ficha de juego.`);
      return;
    }
  }

  // Navegar a la página del juego
  window.location.href = url;
};

function renderCbRankingRows() {
  const ranking = getCbRanking();
  return ranking.map((r, i) => {
    const medals = ['🥇 1°', '🥈 2°', '🥉 3°'];
    const podiumClasses = ['podium-1', 'podium-2', 'podium-3'];
    const rentBadges = [
      '<span class="cb-rent-tag">+3 PTS/día</span>',
      '<span class="cb-rent-tag">+2 PTS/día</span>',
      '<span class="cb-rent-tag">+1 PTS/día</span>'
    ];
    return `
      <div class="cb-ranking-row ${podiumClasses[i] || ''}">
        <div class="flex items-center gap-10">
          <span style="font-weight:800;font-size:.95rem;min-width:32px;">${medals[i] || `${i + 1}°`}</span>
          <div>
            <div style="font-weight:700;color:#fff;font-size:.88rem;">${escapeHtml(r.pilot)}</div>
            <div style="font-size:.7rem;color:var(--text-dim);">${r.car || '🏎️'} · ${r.date || ''}</div>
          </div>
        </div>
        <div class="text-right">
          <div style="font-family:'JetBrains Mono',monospace;font-weight:800;color:var(--cyan);font-size:1.05rem;">${r.km.toLocaleString('es')} PTS</div>
          ${rentBadges[i] || ''}
        </div>
      </div>`;
  }).join('');
}

// ─── SELECCIÓN DE BÓLIDO ────────────────────────────────────────────────────
let cbSelectedCarColor = '#06b6d4';

window.cbPickCar = function (id) {
  const colors = { cyan: '#06b6d4', pink: '#ec4899', gold: '#f59e0b' };
  cbSelectedCarColor = colors[id] || '#06b6d4';
  document.querySelectorAll('.cb-car-pick').forEach(el => {
    const isSelected = el.dataset.carid === id;
    el.style.borderColor = isSelected ? cbSelectedCarColor : 'rgba(255,255,255,0.08)';
    el.style.background = isSelected ? 'rgba(255,255,255,0.07)' : '';
    el.querySelector('span').style.color = isSelected ? '#fff' : 'var(--text-dim)';
  });
};

// ─── LANZADOR DEL JUEGO ─────────────────────────────────────────────────────
window.cbLaunchGame = function () {
  const input = document.getElementById('cb-pilot-input');
  let name = input ? input.value.trim() : '';

  // Validación con AuthManager si está disponible
  if (window.AuthManager) {
    if (!window.AuthManager.isAuthenticated()) {
      window.AuthManager.showModal({
        reason: 'Identifícate con tus credenciales de miembro para competir en Circuito Black y validar tu puesto en el ranking semanal.'
      });
      return;
    }

    // Auto-completar nombre con el nick verificado
    const userNick = window.AuthManager.getNick();
    if (userNick && userNick !== 'Invitado') {
      name = userNick;
      if (input) input.value = userNick;
    }

    // Cobro de ficha arcade (-10 PTS) al arrancar el motor
    const debitRes = window.AuthManager.debitPoints(10, 'circuito_black');
    if (!debitRes.ok) {
      alert(`⚠️ ${debitRes.message}`);
      return;
    }

    // Actualizar visualmente el saldo en la pantalla de setup y ranking en memoria
    const ptsEl = document.getElementById('cb-status-pts');
    if (ptsEl) ptsEl.textContent = `🪙 ${debitRes.remaining} PTS`;
    if (window.App && window.App.data && Array.isArray(window.App.data.ranking_principal)) {
      const row = window.App.data.ranking_principal.find(u => u.nombre && u.nombre.toUpperCase() === name.toUpperCase());
      if (row) row.puntos = debitRes.remaining;
    }
  }

  if (!name) { alert('⚠️ Ingresa tu Nick de WhatsApp antes de arrancar.'); if (input) input.focus(); return; }
  localStorage.setItem('cb_pilot_name', name);

  const setup = document.getElementById('cb-screen-setup');
  const wrapper = document.getElementById('cb-canvas-wrapper');
  if (setup) setup.style.display = 'none';
  if (wrapper) wrapper.style.display = 'block';

  // Entrar a pantalla completa automáticamente si está habilitado
  const autoFs = document.getElementById('cb-auto-fullscreen-check');
  if (!autoFs || autoFs.checked) {
    if (wrapper) {
      if (wrapper.requestFullscreen) {
        wrapper.requestFullscreen().catch(err => console.warn('Fullscreen al arrancar:', err));
      } else if (wrapper.webkitRequestFullscreen) {
        wrapper.webkitRequestFullscreen();
      }
    }
  }

  // Pequeña pantalla de cuenta regresiva
  const ovMsg = document.getElementById('cb-overlay-msg');
  const ovIcon = document.getElementById('cb-overlay-icon');
  const ovTitle = document.getElementById('cb-overlay-title');
  const ovSub = document.getElementById('cb-overlay-sub');
  const ovBtn = document.getElementById('cb-overlay-btn');
  if (ovMsg) ovMsg.style.display = 'flex';
  if (ovIcon) ovIcon.textContent = '🚦';
  if (ovTitle) ovTitle.textContent = '¡LISTOS!';
  if (ovSub) ovSub.textContent = 'Usa ← → para cambiar de carril. Esquiva los autos rivales. Ficha canjeada (-10 PTS).';
  if (ovBtn) {
    ovBtn.textContent = '🏎️ ¡ARRANCAR!';
    ovBtn.onclick = () => {
      if (ovMsg) ovMsg.style.display = 'none';
      if ((!autoFs || autoFs.checked) && !document.fullscreenElement) {
        if (wrapper && wrapper.requestFullscreen) wrapper.requestFullscreen().catch(e => { });
      }
      startCbGame(name, cbSelectedCarColor);
    };
  }
};

// ─── SISTEMA DE AUDIO WEB AUDIO API ─────────────────────────────────────────
let cbAudioCtx = null;
let cbMasterGain = null;
let cbAudioDest = null;
let cbMusicGain = null;
let cbSfxGain = null;
let cbMusicMuted = false;
let cbSfxMuted = false;
let cbEngineOsc = null;
let cbEngineGain = null;
let cbSynthInterval = null;
let cbMusicNodes = [];

function getCbAudioCtx() {
  if (!cbAudioCtx) {
    try {
      cbAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (cbAudioCtx.createMediaStreamDestination) {
        cbAudioDest = cbAudioCtx.createMediaStreamDestination();
      }
      cbMasterGain = cbAudioCtx.createGain();
      cbMasterGain.gain.setValueAtTime(0.7, cbAudioCtx.currentTime);
      cbMasterGain.connect(cbAudioCtx.destination);
      if (cbAudioDest) {
        cbMasterGain.connect(cbAudioDest);
      }

      cbMusicGain = cbAudioCtx.createGain();
      cbMusicGain.gain.setValueAtTime(cbMusicMuted ? 0 : 0.4, cbAudioCtx.currentTime);
      cbMusicGain.connect(cbMasterGain);

      cbSfxGain = cbAudioCtx.createGain();
      cbSfxGain.gain.setValueAtTime(cbSfxMuted ? 0 : 0.7, cbAudioCtx.currentTime);
      cbSfxGain.connect(cbMasterGain);
    } catch (e) {
      console.warn('AudioContext error:', e);
    }
  }
  if (cbAudioCtx && cbAudioCtx.state === 'suspended') {
    cbAudioCtx.resume().catch(() => { });
  }
  return cbAudioCtx;
}

// Melodía Synthwave Arcade retro agradable (notas cálidas y envolventes, NO cancinas)
const CB_SYNTH_NOTES = [
  // A minor / Synthwave groove
  110.00, 110.00, 130.81, 146.83, 164.81, 146.83, 130.81, 110.00,
  164.81, 196.00, 220.00, 196.00, 164.81, 146.83, 130.81, 110.00
];
let cbSynthStep = 0;

function playCbSynthNote(ctx, freq, duration = 0.12) {
  if (cbMusicMuted || !ctx || !cbMusicGain) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle'; // Tono suave y cálido en lugar de estridente
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + duration);

    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(g);
    g.connect(cbMusicGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch (e) { }
}

// Iniciar música y ronroneo suave de motor
function startCbMusic(speed = 3.5) {
  if (cbMusicMuted) return;
  const ctx = getCbAudioCtx();
  if (!ctx) return;
  stopCbMusic();

  // 1. Ronroneo de motor suave (onda senoidal con filtro paso bajo, muy confortable)
  try {
    cbEngineOsc = ctx.createOscillator();
    cbEngineGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    cbEngineOsc.type = 'sine';
    const baseFreq = 50 + (speed - 3.5) * 6;
    cbEngineOsc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, ctx.currentTime);

    cbEngineGain.gain.setValueAtTime(0.14, ctx.currentTime);

    cbEngineOsc.connect(filter);
    filter.connect(cbEngineGain);
    cbEngineGain.connect(cbMusicGain);

    cbEngineOsc.start();
    cbMusicNodes = [cbEngineOsc];
  } catch (e) { }

  // 2. Arpegiador / Bajo Synthwave cadencioso (130 BPM aprox)
  cbSynthStep = 0;
  if (cbSynthInterval) clearInterval(cbSynthInterval);
  cbSynthInterval = setInterval(() => {
    if (cbMusicMuted || !cbAudioCtx) return;
    const note = CB_SYNTH_NOTES[cbSynthStep % CB_SYNTH_NOTES.length];
    playCbSynthNote(cbAudioCtx, note, 0.14);
    cbSynthStep++;
  }, 160);
}

function updateCbEngineSpeed(speed) {
  if (!cbEngineOsc || !cbAudioCtx || cbMusicMuted) return;
  try {
    const baseFreq = 50 + (speed - 3.5) * 8;
    cbEngineOsc.frequency.linearRampToValueAtTime(baseFreq, cbAudioCtx.currentTime + 0.3);
  } catch (e) { }
}

function stopCbMusic() {
  if (cbSynthInterval) {
    clearInterval(cbSynthInterval);
    cbSynthInterval = null;
  }
  cbMusicNodes.forEach(n => { try { n.stop(); } catch (e) { } });
  cbMusicNodes = [];
  cbEngineOsc = null;
}

// SFX: colisión agradable y contundente sin estridencias
function playCbCrashSfx() {
  if (cbSfxMuted) return;
  const ctx = getCbAudioCtx();
  if (!ctx || !cbSfxGain) return;
  try {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.35, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length * 2.2);
    }
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(550, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.35);
    src.buffer = buf;
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    src.connect(filter);
    filter.connect(g);
    g.connect(cbSfxGain);
    src.start();
  } catch (e) { }
}

// SFX: esquivar rival (whoosh suave aerodinámico)
function playCbWhooshSfx() {
  if (cbSfxMuted) return;
  const ctx = getCbAudioCtx();
  if (!ctx || !cbSfxGain) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.22);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.connect(filter);
    filter.connect(g);
    g.connect(cbSfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (e) { }
}

// SFX: Game Over (secuencia retro clásica)
function playCbGameOverSfx() {
  if (cbSfxMuted) return;
  const ctx = getCbAudioCtx();
  if (!ctx || !cbSfxGain) return;
  try {
    [0, 0.15, 0.3, 0.48].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freqs = [330, 277, 220, 165];
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
      g.gain.setValueAtTime(0.18, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      osc.connect(g);
      g.connect(cbSfxGain);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.19);
    });
  } catch (e) { }
}

// SFX: Subida de nivel / Nueva zona (campana neón triunfal)
function playCbLevelUpSfx() {
  if (cbSfxMuted) return;
  const ctx = getCbAudioCtx();
  if (!ctx || !cbSfxGain) return;
  try {
    [0, 0.1, 0.2].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const freqs = [440, 554, 659];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.22);
      osc.connect(g);
      g.connect(cbSfxGain);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.23);
    });
  } catch (e) { }
}

// SFX: recoger moneda (ting clásico brillante de dos tonos)
function playCbCoinSfx() {
  if (cbSfxMuted) return;
  const ctx = getCbAudioCtx();
  if (!ctx || !cbSfxGain) return;
  try {
    const t0 = ctx.currentTime;
    [987.77, 1318.51].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.08);
      g.gain.setValueAtTime(0.22, t0 + idx * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.08 + 0.18);
      osc.connect(g);
      g.connect(cbSfxGain);
      osc.start(t0 + idx * 0.08);
      osc.stop(t0 + idx * 0.08 + 0.19);
    });
  } catch (e) { }
}

// SFX: recoger corazón de vida (arpegio mágico triunfal)
function playCbHeartSfx() {
  if (cbSfxMuted) return;
  const ctx = getCbAudioCtx();
  if (!ctx || !cbSfxGain) return;
  try {
    const t0 = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.06);
      g.gain.setValueAtTime(0.2, t0 + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.06 + 0.24);
      osc.connect(g);
      g.connect(cbSfxGain);
      osc.start(t0 + idx * 0.06);
      osc.stop(t0 + idx * 0.06 + 0.25);
    });
  } catch (e) { }
}

// Controles de mute (globales)
window.cbToggleMusic = function () {
  cbMusicMuted = !cbMusicMuted;
  const btn = document.getElementById('cb-btn-music');
  if (cbMusicGain && cbAudioCtx) {
    cbMusicGain.gain.setValueAtTime(cbMusicMuted ? 0 : 0.4, cbAudioCtx.currentTime);
  }
  if (cbMusicMuted) {
    stopCbMusic();
    if (btn) { btn.textContent = '🔇'; btn.style.opacity = '0.45'; btn.style.borderColor = 'rgba(255,50,50,.4)'; }
  } else {
    if (btn) { btn.textContent = '🎵'; btn.style.opacity = '1'; btn.style.borderColor = 'rgba(255,255,255,.2)'; }
    if (cbGame && cbGame.running) startCbMusic(3.5);
  }
};

window.cbToggleSfx = function () {
  cbSfxMuted = !cbSfxMuted;
  const btn = document.getElementById('cb-btn-sfx');
  if (cbSfxGain && cbAudioCtx) {
    cbSfxGain.gain.setValueAtTime(cbSfxMuted ? 0 : 0.7, cbAudioCtx.currentTime);
  }
  if (cbSfxMuted) {
    if (btn) { btn.textContent = '🔕'; btn.style.opacity = '0.45'; btn.style.borderColor = 'rgba(255,50,50,.4)'; }
  } else {
    if (btn) { btn.textContent = '🔊'; btn.style.opacity = '1'; btn.style.borderColor = 'rgba(255,255,255,.2)'; }
  }
};

// ─── CONTROL DE PANTALLA COMPLETA ──────────────────────────────────────────
window.cbToggleFullscreen = function () {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  if (!isFs) {
    const wrapper = document.getElementById('cb-canvas-wrapper');
    const target = (wrapper && wrapper.style.display !== 'none') ? wrapper : (document.getElementById('cb-game-col') || document.documentElement);
    if (target.requestFullscreen) {
      target.requestFullscreen().catch(err => console.warn(err));
    } else if (target.webkitRequestFullscreen) {
      target.webkitRequestFullscreen();
    } else if (target.msRequestFullscreen) {
      target.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.warn(err));
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
};

function updateFullscreenIcon() {
  const btn = document.getElementById('cb-btn-fs');
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  if (btn) {
    btn.innerHTML = isFs ? '🗗' : '⛶';
    btn.title = isFs ? 'Salir de Pantalla Completa' : 'Pantalla Completa';
  }
}
document.addEventListener('fullscreenchange', updateFullscreenIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);

// ─── SISTEMA DE GRABACIÓN DE PARTIDA (CANVAS MEDIA RECORDER) ───────────────
let cbMediaRecorder = null;
let cbRecordedChunks = [];
let cbIsRecording = false;
let cbLastVideoBlob = null;
let cbLastVideoUrl = null;
let cbLastVideoMime = '';
let cbLastVideoExt = 'mp4';
let cbStopResolve = null;

// Precarga de insignia Amigos Jugones para el HUD del canvas grabado
const cbLogoBadgeImg = new Image();
cbLogoBadgeImg.src = 'imagenes/LOGO AMIGOS JUGONES.png';

// ── CONVERTIDOR WEBM A MP4 EN EL NAVEGADOR (FFmpeg WASM Single-Threaded) ────
let cbFfmpegInstance = null;
let cbFfmpegLoadingPromise = null;
let cbLastConvertedMp4Blob = null;
let cbLastConvertedMp4Url = null;
let cbIsConvertingMp4 = false;

// Carga asíncrona no bloqueante de bibliotecas FFmpeg WASM
async function loadFFmpegLib() {
  if (typeof window === 'undefined') return false;
  if (window.FFmpegWASM && window.FFmpegUtil) return true;
  try {
    const loadScript = (src) => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    if (!window.FFmpegWASM) {
      await loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.12.15/dist/umd/ffmpeg.js');
    }
    if (!window.FFmpegUtil) {
      await loadScript('https://unpkg.com/@ffmpeg/util@0.12.2/dist/umd/index.js');
    }
    return !!(window.FFmpegWASM && window.FFmpegUtil);
  } catch (e) {
    console.warn('No se pudo precargar FFmpeg desde CDN:', e);
    return false;
  }
}

async function getFFmpeg() {
  if (cbFfmpegInstance) return cbFfmpegInstance;
  if (cbFfmpegLoadingPromise) return cbFfmpegLoadingPromise;

  cbFfmpegLoadingPromise = (async () => {
    const ok = await loadFFmpegLib();
    if (!ok || !window.FFmpegWASM || !window.FFmpegUtil) return null;

    try {
      const { FFmpeg } = window.FFmpegWASM;
      const { toBlobURL } = window.FFmpegUtil;
      const ffmpeg = new FFmpeg();

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      });
      cbFfmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (err) {
      console.warn('Error inicializando instancia FFmpeg WASM:', err);
      return null;
    } finally {
      cbFfmpegLoadingPromise = null;
    }
  })();

  return cbFfmpegLoadingPromise;
}

// Inicia precarga en segundo plano al cargar el módulo
if (typeof window !== 'undefined') {
  setTimeout(() => { loadFFmpegLib().catch(() => { }); }, 1200);
}

// Transcodifica un Blob WebM a MP4 real (H.264 + AAC) para máxima compatibilidad WhatsApp
async function convertWebmBlobToMp4(webmBlob) {
  if (!webmBlob || webmBlob.size === 0) return null;
  try {
    const ffmpeg = await getFFmpeg();
    if (!ffmpeg) return null;

    const { fetchFile } = window.FFmpegUtil;
    await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

    // Conversión con ultrafast para que tarde solo 2-3 segundos
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '26',
      '-c:a', 'aac',
      '-b:a', '128k',
      'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4');
    const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });

    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp4');
    } catch (e) { }

    return mp4Blob;
  } catch (err) {
    console.error('Error al convertir WebM a MP4:', err);
    return null;
  }
}

// Detecta el mejor MIME type para grabación (priorizando MP4 nativo con audio en Chrome 126+, Safari y Edge)
function getBestRecordingConfig() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return { mime: '', ext: 'mp4', hasAudio: false };
  }

  // 1. Prioridad Máxima: MP4 con audio nativo (Chrome 126+, Safari 14.1+, Edge)
  // Genera directamente archivo .mp4 sin necesidad de transcodificación
  const mp4AudioCandidates = [
    'video/mp4;codecs="avc1.424028, mp4a.40.2"',
    'video/mp4;codecs="avc1,mp4a.40.2"',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1.424028',
    'video/mp4'
  ];
  for (const m of mp4AudioCandidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) {
        const hasAudioCodec = m.includes('mp4a') || m.includes(',');
        return { mime: m, ext: 'mp4', hasAudio: hasAudioCodec };
      }
    } catch (e) { }
  }

  // 2. WebM con audio (vp9+opus / vp8+opus): Firefox o entornos donde MP4 nativo no esté habilitado
  const webmAudioCandidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];
  for (const m of webmAudioCandidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) {
        const hasAudioCodec = m.includes('opus') || m.includes(',');
        return { mime: m, ext: 'webm', hasAudio: hasAudioCodec };
      }
    } catch (e) { }
  }

  // 3. MP4 puro (sin audio) como fallback
  const mp4Candidates = ['video/mp4;codecs=avc1', 'video/mp4;codecs=h264'];
  for (const m of mp4Candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) {
        return { mime: m, ext: 'mp4', hasAudio: false };
      }
    } catch (e) { }
  }

  return { mime: '', ext: 'webm', hasAudio: false };
}

function startRecordingCanvas(canvas) {
  if (!canvas) return;
  if (cbMediaRecorder && cbMediaRecorder.state !== 'inactive') {
    try { cbMediaRecorder.stop(); } catch (e) { }
  }
  cbRecordedChunks = [];
  cbLastVideoBlob = null;
  cbLastConvertedMp4Blob = null;
  cbIsConvertingMp4 = false;
  if (cbLastConvertedMp4Url) {
    try { URL.revokeObjectURL(cbLastConvertedMp4Url); } catch (e) { }
    cbLastConvertedMp4Url = null;
  }
  if (cbLastVideoUrl) {
    try { URL.revokeObjectURL(cbLastVideoUrl); } catch (e) { }
    cbLastVideoUrl = null;
  }

  if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    console.warn('Canvas captureStream o MediaRecorder no soportado en este navegador');
    updateRecButtonUI(false);
    return;
  }

  try {
    const videoStream = canvas.captureStream(30);
    const cfg = getBestRecordingConfig();
    cbLastVideoMime = cfg.mime;
    cbLastVideoExt = cfg.ext;

    // Intentar combinar audio si el formato lo soporta y el AudioContext está disponible
    let finalStream = videoStream;
    if (cfg.hasAudio && cbAudioDest && cbAudioDest.stream) {
      try {
        const audioTracks = cbAudioDest.stream.getAudioTracks();
        if (audioTracks && audioTracks.length > 0) {
          finalStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...audioTracks
          ]);
        }
      } catch (audioErr) {
        console.warn('No se pudo combinar audio, grabando solo video:', audioErr);
        finalStream = videoStream;
      }
    }

    const options = {};
    if (cfg.mime) {
      options.mimeType = cfg.mime;
      options.videoBitsPerSecond = 1500000; // 1.5 Mbps, nítido y liviano
      if (cfg.hasAudio) {
        options.audioBitsPerSecond = 128000; // 128 kbps audio
      }
    }

    try {
      cbMediaRecorder = new MediaRecorder(finalStream, options);
    } catch (errOpt) {
      console.warn('MediaRecorder con opciones falló, intentando sin audio:', errOpt);
      try {
        cbMediaRecorder = new MediaRecorder(videoStream, options);
      } catch (errFallback) {
        cbMediaRecorder = new MediaRecorder(videoStream);
      }
      cbLastVideoMime = cbMediaRecorder.mimeType || 'video/webm';
      cbLastVideoExt = cbLastVideoMime.includes('mp4') ? 'mp4' : 'webm';
    }

    cbMediaRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) {
        cbRecordedChunks.push(e.data);
      }
    };

    cbMediaRecorder.onerror = function (err) {
      console.warn('MediaRecorder error:', err);
    };

    cbMediaRecorder.onstop = function () {
      if (cbRecordedChunks.length > 0) {
        const type = cbLastVideoMime || (cbLastVideoExt === 'mp4' ? 'video/mp4' : 'video/webm');
        cbLastVideoBlob = new Blob(cbRecordedChunks, { type });
        if (cbLastVideoUrl) URL.revokeObjectURL(cbLastVideoUrl);
        cbLastVideoUrl = URL.createObjectURL(cbLastVideoBlob);
        attachVideoToTelemetryOverlay();
      }
      if (cbStopResolve) {
        const resolve = cbStopResolve;
        cbStopResolve = null;
        resolve(cbLastVideoBlob);
      }
    };

    // Enviar bloques cada 500ms garantizando que no se pierdan fotogramas
    cbMediaRecorder.start(500);
    cbIsRecording = true;
    updateRecButtonUI(true);
  } catch (err) {
    console.warn('Error al iniciar MediaRecorder:', err);
    cbIsRecording = false;
    updateRecButtonUI(false);
  }
}

function stopRecordingCanvas() {
  return new Promise((resolve) => {
    if (!cbMediaRecorder || cbMediaRecorder.state === 'inactive') {
      cbIsRecording = false;
      updateRecButtonUI(false);
      resolve(cbLastVideoBlob);
      return;
    }

    cbStopResolve = resolve;

    try {
      if (typeof cbMediaRecorder.requestData === 'function') {
        cbMediaRecorder.requestData();
      }
    } catch (e) { }

    try {
      cbMediaRecorder.stop();
    } catch (e) {
      resolve(cbLastVideoBlob);
    }

    cbIsRecording = false;
    updateRecButtonUI(false);

    // Salvaguarda de 450ms si el evento onstop se demora
    setTimeout(() => {
      if (cbStopResolve) {
        if (!cbLastVideoBlob && cbRecordedChunks.length > 0) {
          const type = cbLastVideoMime || (cbLastVideoExt === 'mp4' ? 'video/mp4' : 'video/webm');
          cbLastVideoBlob = new Blob(cbRecordedChunks, { type });
          if (cbLastVideoUrl) URL.revokeObjectURL(cbLastVideoUrl);
          cbLastVideoUrl = URL.createObjectURL(cbLastVideoBlob);
          attachVideoToTelemetryOverlay();
        }
        const fn = cbStopResolve;
        cbStopResolve = null;
        fn(cbLastVideoBlob);
      }
    }, 450);
  });
}

function updateRecButtonUI(isRec) {
  const btn = document.getElementById('cb-btn-record');
  const text = document.getElementById('cb-rec-text');
  const dot = btn ? btn.querySelector('.cb-rec-pulse') : null;
  if (!btn) return;
  if (isRec) {
    btn.style.background = 'rgba(220,38,38,0.35)';
    btn.style.borderColor = '#ef4444';
    btn.style.color = '#fecaca';
    if (text) text.textContent = 'REC';
    if (dot) {
      dot.style.background = '#ef4444';
      dot.style.boxShadow = '0 0 8px #ef4444';
      dot.classList.add('cb-blinking');
    }
  } else {
    btn.style.background = 'rgba(0,0,0,0.7)';
    btn.style.borderColor = 'rgba(255,255,255,0.2)';
    btn.style.color = 'rgba(255,255,255,0.7)';
    if (text) text.textContent = 'GRABAR';
    if (dot) {
      dot.style.background = 'rgba(255,255,255,0.4)';
      dot.style.boxShadow = 'none';
      dot.classList.remove('cb-blinking');
    }
  }
}

window.cbToggleRecord = function () {
  const canvas = document.getElementById('cb-canvas');
  if (!canvas) return;
  if (cbIsRecording) {
    stopRecordingCanvas();
  } else {
    startRecordingCanvas(canvas);
  }
};

function attachVideoToTelemetryOverlay() {
  const container = document.getElementById('cb-video-container');
  const vid = document.getElementById('cb-recorded-video');
  if (container && vid && cbLastVideoUrl) {
    vid.src = cbLastVideoUrl;
    container.style.display = 'block';
  }
}

// ─── MOTOR ARCADE DE CANVAS ─────────────────────────────────────────────────
function startCbGame(pilotName, carColor) {
  const canvas = document.getElementById('cb-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Detener loop anterior si existe
  if (cbGame && cbGame.running) { cbGame.running = false; }

  // Dimensiones responsivas arcade: relación 9:16 nativa (360x640)
  const W = 360;
  const H = 640;

  canvas.width = W;
  canvas.height = H;

  // ── CONSTANTES DE PISTA ──────────────────────────────────────────────────
  const LANES = 3;
  const LANE_W = Math.round(W / LANES);

  const HORIZON_Y = Math.round(H * 0.13);
  const ROAD_BOTTOM_LEFT = 0;
  const ROAD_BOTTOM_RIGHT = W;
  const ROAD_TOP_LEFT = Math.round(W * 0.28);
  const ROAD_TOP_RIGHT = Math.round(W * 0.72);

  // Posición del jugador: Centrado en la mitad de la pista (~58% de altura de pantalla)
  // Brinda amplia visibilidad hacia adelante (~370px) y hacia atrás (~270px) para reaccionar con holgura
  const PLAYER_Y = Math.round(H * 0.58);
  const PLAYER_PROGRESS = (PLAYER_Y - HORIZON_Y) / (H - HORIZON_Y);

  function getLaneCenterX(laneIdx, prog = PLAYER_PROGRESS) {
    const frac = (laneIdx + 0.5) / LANES;
    const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
    const botX = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
    return topX + (botX - topX) * prog;
  }

  const laneCenters = [
    getLaneCenterX(0, PLAYER_PROGRESS),
    getLaneCenterX(1, PLAYER_PROGRESS),
    getLaneCenterX(2, PLAYER_PROGRESS)
  ];

  // ── CONSTANTES VISUALES Y ESCALA DE PERSPECTIVA ───────────────────────────
  const BASE_CAR_H = Math.round(H * 0.15); // Altura en el fondo (1.0 scale = 96px)
  const BASE_CAR_W = Math.round(BASE_CAR_H * 0.58); // Ancho en el fondo = 56px
  const PLAYER_SCALE = 0.2 + PLAYER_PROGRESS * 0.8; // Escala en la posición del jugador
  const CAR_H = Math.round(BASE_CAR_H * PLAYER_SCALE); // Altura auto del jugador (~60px)
  const CAR_W = Math.round(BASE_CAR_W * PLAYER_SCALE); // Ancho auto del jugador (~35px)

  // ── ESTADO DEL JUEGO ─────────────────────────────────────────────────────
  let running = true;
  let lives = 3;
  let km = 0;
  let speed = 3.5;       // velocidad base
  let score = 0;
  let frame = 0;
  let invincible = 0;    // frames de inmunidad tras colisión
  let gameOver = false;
  let paused = false;

  // Dificultad y zonas
  let currentZone = 1;
  let zoneNeonColor = '#06b6d4';
  let zoneBanner = null;

  // Posición del jugador (índice de carril 0,1,2)
  let playerLane = 1;
  let playerTargetLane = 1;
  let playerX = laneCenters[1]; // posición suavizada

  // ── OBSTÁCULOS Y TRÁFICO ─────────────────────────────────────────────────
  const ENEMY_COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#22c55e', '#64748b'];
  const REAR_CAR_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'];
  let enemies = [];           // Autos frontales (vienen de frente)
  let rearCars = [];          // Autos traseros (vienen desde atrás, te adelantan)
  let obstacles = [];         // Obstáculos en pista: aceite y rocas
  let collectibles = [];      // Coleccionables en pista: corazones de vida y monedas
  let coinsCollected = 0;     // Total de monedas recolectadas
  let lastHeartKm = 0;        // Marca de kilometraje para generar corazón cada 500 km
  let coinTimer = 0;
  let coinInterval = 130;     // Temporizador para monedas aleatorias
  let floatingTexts = [];     // Textos flotantes (+1 VIDA, +50 PTS)
  let spawnTimer = 0;
  let spawnInterval = 90;
  let rearSpawnTimer = 0;
  let rearSpawnInterval = 220; // Cada ~3-4 seg aparece un auto trasero
  let obstacleTimer = 0;
  let obstacleInterval = 300;  // Cada ~5 seg aparece un obstáculo

  // Estado de skid (derrape por aceite)
  let skidFrames = 0;
  let skidDir = 0; // -1 izquierda, +1 derecha

  // ── LÍNEAS DE CARRETERA (scroll) ─────────────────────────────────────────
  let roadOffset = 0;

  // ── PARTÍCULAS Y RESTOS DE CHOQUE ─────────────────────────────────────────
  let particles = [];
  let debris = [];

  function spawnParticles(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * 4 + 1;
      particles.push({
        x, y, vx: Math.cos(angle) * vel, vy: Math.sin(angle) * vel,
        alpha: 1, color, size: Math.random() * 6 + 3, life: 35 + Math.random() * 20
      });
    }
  }

  function spawnWreckage(x, y, color1, color2) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * 5 + 2;
      debris.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - 2,
        size: Math.random() * 8 + 4,
        color: Math.random() < 0.5 ? color1 : color2,
        alpha: 1,
        life: 42 + Math.random() * 20,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.3
      });
    }
  }

  // ── COORDENADAS EN PERSPECTIVA ────────────────────────────────────────────
  // Convierte (lane 0-2, progress 0=top..1=bottom) a coordenadas canvas
  function perspCoord(lane, progress) {
    const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * (lane / LANES);
    const botX = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * (lane / LANES);
    const topY = HORIZON_Y;
    const botY = H;
    const x = topX + (botX - topX) * progress;
    const y = topY + (botY - topY) * progress;
    return { x, y };
  }

  function laneXAtProgress(laneCenter, progress) {
    const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * (laneCenter / W);
    const botX = laneCenter;
    return topX + (botX - topX) * progress;
  }

  // ── SPAWN ENEMIGO (DISTRIBUCIÓN ALEATORIA EQUILIBRADA EN LOS 3 CARRILES) ─
  let lastSpawnedLane = -1;

  function spawnEnemy() {
    // Generador aleatorio balanceado en 0, 1 y 2 sin sesgo contra el centro
    let candidates = [0, 1, 2].filter(l => l !== lastSpawnedLane);
    if (Math.random() < 0.25) candidates.push(lastSpawnedLane);
    const lane = candidates[Math.floor(Math.random() * candidates.length)];
    lastSpawnedLane = lane;

    // Evitar que dos enemigos aparezcan montados en el mismo carril
    const tooClose = enemies.some(e => e.lane === lane && e.progress < 0.22);
    if (tooClose) return;

    // Velocidad variable para que los rivales fluyan dinámicamente
    const baseRivalSpeed = 0.0075 + (speed / 3.5) * 0.0025;
    const variance = (Math.random() - 0.5) * 0.003;

    enemies.push({
      lane,
      progress: 0,          // 0=horizonte..1=fuera de pantalla
      speed: Math.max(0.005, baseRivalSpeed + variance),
      color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
      hit: false
    });
  }

  // ── SPAWN AUTO TRASERO (va en la misma dirección, aparece abajo) ──────────
  function spawnRearCar() {
    const lane = Math.floor(Math.random() * LANES);
    // No acumular demasiados en el mismo carril
    if (rearCars.filter(r => r.lane === lane && !r.exploded).length >= 1) return;
    rearCars.push({
      lane,
      progress: 1.08,   // Empieza fuera de pantalla por abajo
      speed: 0.0075 + Math.random() * 0.003, // Velocidad progresiva que permite ver la advertencia y esquivar
      color: REAR_CAR_COLORS[Math.floor(Math.random() * REAR_CAR_COLORS.length)],
      exploded: false
    });
  }

  // ── SPAWN OBSTÁCULO (aceite o roca) ──────────────────────────────────────
  function spawnObstacle() {
    const lane = Math.floor(Math.random() * LANES);
    const type = Math.random() < 0.55 ? 'oil' : 'rock';
    obstacles.push({
      lane,
      progress: 0.05,  // Aparece cerca del horizonte y baja hacia el jugador
      type,
      hit: false,
      wobble: Math.random() * Math.PI * 2 // Para animación de roca cayendo
    });
  }

  // ── DIBUJAR MANCHA DE ACEITE ─────────────────────────────────────────────
  function drawOilSlick(x, y, scale) {
    ctx.save();
    ctx.globalAlpha = 0.78;
    const rw = 26 * scale;
    const rh = 11 * scale;
    // Reflejo iridiscente
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rw);
    grad.addColorStop(0, 'rgba(180,100,255,0.9)');
    grad.addColorStop(0.35, 'rgba(0,220,200,0.75)');
    grad.addColorStop(0.65, 'rgba(255,50,180,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── DIBUJAR ROCA ─────────────────────────────────────────────────────────
  function drawRock(x, y, scale, wobble) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(wobble) * 0.3);
    const r = 12 * scale;
    // Sombra
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 8 * scale;
    // Cuerpo de la roca con forma irregular
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, -r * 0.5);
    ctx.lineTo(r, r * 0.3);
    ctx.lineTo(r * 0.4, r);
    ctx.lineTo(-r * 0.5, r * 0.8);
    ctx.lineTo(-r, r * 0.2);
    ctx.lineTo(-r * 0.6, -r * 0.6);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.3, r * 0.35, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── DIBUJAR CORAZÓN FLOTANTE EN PISTA ────────────────────────────────────
  function drawHeartItem(x, y, scale, bob) {
    ctx.save();
    const floatY = y + Math.sin(bob) * 5 * scale;
    const s = 14 * scale;

    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14 * scale;

    ctx.fillStyle = 'rgba(239,68,68,0.25)';
    ctx.beginPath();
    ctx.arc(x, floatY, s * 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    const topCurve = s * 0.35;
    ctx.moveTo(x, floatY + s * 0.2);
    ctx.bezierCurveTo(x, floatY - topCurve, x - s, floatY - topCurve, x - s, floatY + s * 0.2);
    ctx.bezierCurveTo(x - s, floatY + (s + topCurve) / 2, x, floatY + (s + topCurve) / 1.35, x, floatY + s);
    ctx.bezierCurveTo(x, floatY + (s + topCurve) / 1.35, x + s, floatY + (s + topCurve) / 2, x + s, floatY + s * 0.2);
    ctx.bezierCurveTo(x + s, floatY - topCurve, x, floatY - topCurve, x, floatY + s * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - s * 0.35, floatY + s * 0.05, s * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── DIBUJAR MONEDA GIRATORIA ─────────────────────────────────────────────
  function drawCoinItem(x, y, scale, rot) {
    ctx.save();
    const s = 12 * scale;
    const widthFactor = Math.abs(Math.cos(rot));
    const w = Math.max(3, s * widthFactor);

    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10 * scale;

    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.ellipse(x, y, w, s, 0, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(x - w, y - s, x + w, y + s);
    grad.addColorStop(0, '#fef08a');
    grad.addColorStop(0.5, '#f59e0b');
    grad.addColorStop(1, '#d97706');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(2, w * 0.85), s * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    if (widthFactor > 0.45) {
      ctx.fillStyle = '#78350f';
      ctx.font = `bold ${Math.round(10 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', x, y);
    }

    ctx.restore();
  }

  // ── SPAWN DE COLECCIONABLES (CORAZONES Y MONEDAS) ─────────────────────────
  function spawnCollectible(type) {
    const busyLanes = obstacles.filter(o => o.progress < 0.25).map(o => o.lane);
    const freeLanes = [0, 1, 2].filter(l => !busyLanes.includes(l));
    const lane = freeLanes.length > 0 ? freeLanes[Math.floor(Math.random() * freeLanes.length)] : Math.floor(Math.random() * LANES);
    collectibles.push({
      type,
      lane,
      progress: 0.05,
      rotation: Math.random() * Math.PI,
      bob: Math.random() * Math.PI * 2,
      collected: false
    });
  }

  function spawnFloatingText(text, x, y, color) {
    floatingTexts.push({
      text, x, y, color,
      vy: -1.3,
      alpha: 1,
      life: 38
    });
  }

  // ── DIBUJAR CARRETERA ────────────────────────────────────────────────────
  function drawRoad() {
    // 1. Cielo compacto (solo 13% superior de la pantalla)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
    skyGrad.addColorStop(0, '#020208');
    skyGrad.addColorStop(0.5, '#0e0524');
    skyGrad.addColorStop(1, '#22073d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, HORIZON_Y);

    // 2. Silueta ciudad cyberpunk con edificios y ventanas iluminadas
    ctx.fillStyle = '#080314';
    for (let i = 0; i < 16; i++) {
      const bx = (i * W / 15) - W * 0.04;
      const bw = W / 13;
      const bh = 11 + Math.sin(i * 2.1) * 7;
      ctx.fillRect(bx, HORIZON_Y - bh, bw, bh);
      // Ventanitas de neón
      if (i % 2 === 0) {
        ctx.fillStyle = (i % 4 === 0) ? 'rgba(6,182,212,0.65)' : 'rgba(236,72,153,0.65)';
        ctx.fillRect(bx + 3, HORIZON_Y - bh + 3, 2.5, 2.5);
        ctx.fillRect(bx + 8, HORIZON_Y - bh + 3, 2.5, 2.5);
        ctx.fillStyle = '#080314';
      }
    }

    // 3. Línea neón brillante divisoria en el horizonte
    ctx.strokeStyle = 'rgba(6,182,212,0.85)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y);
    ctx.lineTo(W, HORIZON_Y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. Asfalto de la pista (87% del canvas)
    ctx.fillStyle = '#080812';
    ctx.beginPath();
    ctx.moveTo(ROAD_TOP_LEFT, HORIZON_Y);
    ctx.lineTo(ROAD_TOP_RIGHT, HORIZON_Y);
    ctx.lineTo(ROAD_BOTTOM_RIGHT, H);
    ctx.lineTo(ROAD_BOTTOM_LEFT, H);
    ctx.closePath();
    ctx.fill();

    // 5. Bordes laterales de pista con neón dinámico según zona
    const neonEdge = zoneNeonColor || '#ec4899';
    ctx.strokeStyle = neonEdge;
    ctx.lineWidth = 3;
    ctx.shadowColor = neonEdge;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(ROAD_TOP_LEFT, HORIZON_Y);
    ctx.lineTo(ROAD_BOTTOM_LEFT, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ROAD_TOP_RIGHT, HORIZON_Y);
    ctx.lineTo(ROAD_BOTTOM_RIGHT, H);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 6. Líneas divisorias de carriles con scroll continuo
    for (let lane = 1; lane < LANES; lane++) {
      const frac = lane / LANES;
      const segments = 16;
      for (let seg = 0; seg < segments; seg++) {
        const prog0 = (seg / segments + roadOffset) % 1;
        const prog1 = ((seg + 0.45) / segments + roadOffset) % 1;
        if (prog0 > prog1) continue;
        const x0a = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
        const x0b = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
        const x0 = x0a + (x0b - x0a) * prog0;
        const y0 = HORIZON_Y + (H - HORIZON_Y) * prog0;
        const x1 = x0a + (x0b - x0a) * prog1;
        const y1 = HORIZON_Y + (H - HORIZON_Y) * prog1;
        const alpha = 0.25 + prog0 * 0.65;
        ctx.strokeStyle = `rgba(6,182,212,${alpha})`;
        ctx.lineWidth = 1 + prog0 * 2.2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }

    // 7. Cartel holográfico de cambio de zona / nivel
    if (zoneBanner && zoneBanner.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = zoneBanner.alpha;
      ctx.font = '900 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = zoneBanner.color || '#38bdf8';
      ctx.shadowColor = zoneBanner.color || '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillText(zoneBanner.text, W / 2, HORIZON_Y + 40);
      ctx.restore();
      zoneBanner.alpha -= 0.015;
      if (zoneBanner.alpha <= 0) zoneBanner = null;
    }
  }

  // ── DIBUJAR AUTO DE CARRERAS ARCADE REAL ─────────────────────────────────
  function drawCar(cx, cy, w, h, color, isPlayer, facingDown = false) {
    ctx.save();
    ctx.translate(cx, cy);

    // Los rivales bajan hacia el jugador (de frente)
    if (facingDown) {
      ctx.rotate(Math.PI);
    }

    // 1. Sombra bajo el auto y neumáticos
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.62, h * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 4 NEUMÁTICOS ANCHOS DE COMPETICIÓN (visibles a los costados)
    const tireW = w * 0.22;
    const tireH = h * 0.26;
    const fTireY = -h * 0.30;
    const rTireY = h * 0.22;
    const lTireX = -w * 0.55;
    const rTireX = w * 0.55 - tireW;

    function renderTire(tx, ty, tw, th) {
      // Goma negra
      ctx.fillStyle = '#0f1117';
      roundRect(ctx, tx, ty, tw, th, 3);
      ctx.fill();
      // Borde del neumático
      ctx.strokeStyle = '#232936';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Rin / llanta central
      ctx.fillStyle = isPlayer ? color : '#64748b';
      ctx.fillRect(tx + tw * 0.3, ty + th * 0.22, tw * 0.4, th * 0.56);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx + tw * 0.45, ty + th * 0.4, tw * 0.15, th * 0.2);
    }

    renderTire(lTireX, fTireY, tireW, tireH);
    renderTire(rTireX, fTireY, tireW, tireH);
    renderTire(lTireX - 1, rTireY, tireW * 1.1, tireH * 1.08); // Ruedas traseras más anchas
    renderTire(rTireX - 1, rTireY, tireW * 1.1, tireH * 1.08);

    // 3. CARROCERÍA AERODINÁMICA ESCULPIDA (GT / Hypercar)
    // Silueta con trompa afilada, guardabarros anchos y cintura estrecha
    const bw = w * 0.74;
    const half = bw / 2;

    ctx.beginPath();
    // Splitter delantero (trompa)
    ctx.moveTo(-half * 0.65, -h * 0.50);
    ctx.lineTo(half * 0.65, -h * 0.50);
    // Guardabarros delantero derecho
    ctx.lineTo(half * 0.95, -h * 0.38);
    ctx.lineTo(half * 1.04, -h * 0.18);
    // Cintura lateral / toma de aire derecha
    ctx.lineTo(half * 0.82, -h * 0.04);
    ctx.lineTo(half * 0.82, h * 0.10);
    // Guardabarros trasero derecho ensanchado
    ctx.lineTo(half * 1.08, h * 0.24);
    ctx.lineTo(half * 1.02, h * 0.44);
    // Cola y difusor trasero
    ctx.lineTo(-half * 1.02, h * 0.44);
    // Guardabarros trasero izquierdo ensanchado
    ctx.lineTo(-half * 1.08, h * 0.24);
    // Cintura lateral izquierda
    ctx.lineTo(-half * 0.82, h * 0.10);
    ctx.lineTo(-half * 0.82, -h * 0.04);
    // Guardabarros delantero izquierdo
    ctx.lineTo(-half * 1.04, -h * 0.18);
    ctx.lineTo(-half * 0.95, -h * 0.38);
    ctx.closePath();

    // Gradiente brillante de la carrocería
    const bodyGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    bodyGrad.addColorStop(0, lightenColor(color, 40));
    bodyGrad.addColorStop(0.35, color);
    bodyGrad.addColorStop(0.7, darkenColor(color, 25));
    bodyGrad.addColorStop(1, darkenColor(color, 50));
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. FRANJAS DEPORTIVAS (Racing Stripes)
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-bw * 0.10, -h * 0.48, bw * 0.20, h * 0.88);

    // 4b. EMBLEMA OFICIAL AMIGOS JUGONES EN EL CAPÓ (LIVERY DE COMPETICIÓN)
    if (isPlayer) {
      const logo = getCbLogo();
      const logoSize = Math.round(bw * 0.70);
      const logoY = -h * 0.33;

      // Base circular blanca con resplandor dorado de competición
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, logoY, logoSize * 0.54, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.85)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (cbCanUseLogoImg && logo && logo.complete && logo.naturalWidth > 0) {
        try {
          ctx.clip();
          ctx.drawImage(logo, -logoSize * 0.5, logoY - logoSize * 0.5, logoSize, logoSize);
        } catch (e) {
          cbCanUseLogoImg = false;
        }
      } else {
        ctx.fillStyle = '#1e1b4b';
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.font = `900 ${Math.round(logoSize * 0.44)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AJ', 0, logoY);
      }
      ctx.restore();
    }

    // 5. TOMAS DE AIRE LATERALES (Sidepods oscuros)
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(-half * 0.80, -h * 0.02, bw * 0.12, h * 0.10);
    ctx.fillRect(half * 0.68, -h * 0.02, bw * 0.12, h * 0.10);

    // 6. CABINA Y PARABRISAS (Cockpit aerodinámico curvo)
    const cpW = bw * 0.58;
    const cpH = h * 0.36;
    const cpY = -h * 0.10;

    ctx.beginPath();
    ctx.moveTo(-cpW * 0.65, cpY - cpH * 0.45);
    ctx.lineTo(cpW * 0.65, cpY - cpH * 0.45);
    ctx.lineTo(cpW, cpY + cpH * 0.50);
    ctx.lineTo(-cpW, cpY + cpH * 0.50);
    ctx.closePath();

    const glassGrad = ctx.createLinearGradient(0, cpY - cpH * 0.5, 0, cpY + cpH * 0.5);
    glassGrad.addColorStop(0, '#0f172a');
    glassGrad.addColorStop(0.35, '#1e293b');
    glassGrad.addColorStop(1, '#0b0f19');
    ctx.fillStyle = glassGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Reflejo diagonal de brillo en el parabrisas
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-cpW * 0.3, cpY + cpH * 0.3);
    ctx.lineTo(cpW * 0.2, cpY - cpH * 0.3);
    ctx.stroke();

    // Cubierta trasera de motor con ranuras (louvers)
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, -cpW * 0.50, cpY + cpH * 0.10, cpW, cpH * 0.46, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let ly = cpY + cpH * 0.20; ly <= cpY + cpH * 0.52; ly += 3.5) {
      ctx.beginPath();
      ctx.moveTo(-cpW * 0.32, ly);
      ctx.lineTo(cpW * 0.32, ly);
      ctx.stroke();
    }

    // 7. ESPEJOS RETROVISORES
    ctx.fillStyle = color;
    ctx.fillRect(-half * 1.05, cpY - 2, bw * 0.18, 3.5);
    ctx.fillRect(half * 0.87, cpY - 2, bw * 0.18, 3.5);

    // 8. ALERÓN TRASERO DE COMPETICIÓN (Spoiler prominente con aletas)
    const spW = w * 0.92;
    const spH = h * 0.10;
    const spY = h * 0.37;

    // Soportes del alerón (carbono)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-spW * 0.28, spY - 3, 3, 6);
    ctx.fillRect(spW * 0.28 - 3, spY - 3, 3, 6);

    // Barra principal del alerón
    const spGrad = ctx.createLinearGradient(-spW / 2, 0, spW / 2, 0);
    spGrad.addColorStop(0, darkenColor(color, 40));
    spGrad.addColorStop(0.5, color);
    spGrad.addColorStop(1, darkenColor(color, 40));
    ctx.fillStyle = spGrad;
    roundRect(ctx, -spW / 2, spY, spW, spH, 2);
    ctx.fill();

    // Aletas laterales del alerón (Endplates)
    ctx.fillStyle = lightenColor(color, 35);
    ctx.fillRect(-spW / 2 - 2, spY - 2, 3, spH + 4);
    ctx.fillRect(spW / 2 - 1, spY - 2, 3, spH + 4);

    // 9. LUCES TRASERAS Y TUBOS DE ESCAPE
    // Luces rojas traseras de posición
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fillRect(-bw * 0.42, h * 0.43, bw * 0.28, 3);
    ctx.fillRect(bw * 0.14, h * 0.43, bw * 0.28, 3);
    ctx.shadowBlur = 0;

    // Tubos de escape dobles cromados
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-bw * 0.16, h * 0.45, 4, 3);
    ctx.fillRect(bw * 0.16 - 4, h * 0.45, 4, 3);

    // 10. FAROS DELANTEROS LED
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = '#fef08a';
    ctx.shadowBlur = 10;
    ctx.fillRect(-bw * 0.36, -h * 0.50, bw * 0.22, 3.5);
    ctx.fillRect(bw * 0.14, -h * 0.50, bw * 0.22, 3.5);
    ctx.shadowBlur = 0;

    // Conos de luz proyectados hacia adelante
    if (isPlayer) {
      ctx.save();
      const beamGrad = ctx.createLinearGradient(0, -h * 0.5, 0, -h * 2.2);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.3, -h * 0.5);
      ctx.lineTo(-bw * 1.1, -h * 2.2);
      ctx.lineTo(bw * 1.1, -h * 2.2);
      ctx.lineTo(bw * 0.3, -h * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Neón bajo el auto (underglow del jugador)
    if (isPlayer && !gameOver) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-half, h * 0.35);
      ctx.lineTo(half, h * 0.35);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function lightenColor(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + amt);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  function darkenColor(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n >> 16) - amt);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff) - amt);
    return `rgb(${r},${g},${b})`;
  }

  // ── ACTUALIZAR HUD ───────────────────────────────────────────────────────
  function updateHud() {
    const hudKm = document.getElementById('cb-hud-km');
    const hudSpeed = document.getElementById('cb-hud-speed');
    const hudLives = document.getElementById('cb-hud-lives');
    const displaySpeed = Math.round(120 + (speed - 3.5) * 30);
    if (hudKm) hudKm.textContent = `${Math.round(km).toLocaleString('es')} KM`;
    if (hudSpeed) hudSpeed.textContent = `${displaySpeed} km/h`;
    if (hudLives) {
      const hearts = ['❤️', '❤️', '❤️'];
      const empty = '🖤';
      hudLives.innerHTML = Array.from({ length: 3 }, (_, i) => i < lives ? hearts[i] : empty).join('');
    }
  }

  // ── MOSTRAR OVERLAY ──────────────────────────────────────────────────────
  function showOverlay(icon, title, sub, btnText, btnAction) {
    const ovMsg = document.getElementById('cb-overlay-msg');
    const ovIcon = document.getElementById('cb-overlay-icon');
    const ovTitle = document.getElementById('cb-overlay-title');
    const ovSub = document.getElementById('cb-overlay-sub');
    const ovBtn = document.getElementById('cb-overlay-btn');
    if (ovMsg) ovMsg.style.display = 'flex';
    if (ovIcon) ovIcon.textContent = icon;
    if (ovTitle) ovTitle.textContent = title;
    if (ovSub) ovSub.textContent = sub;
    if (ovBtn) { ovBtn.textContent = btnText; ovBtn.onclick = btnAction; }
  }

  function hideOverlay() {
    const ovMsg = document.getElementById('cb-overlay-msg');
    if (ovMsg) ovMsg.style.display = 'none';
  }

  // ── DETECCIÓN DE COLISIÓN (AABB 2D EXACTO POR PIXELES) ────────────────────
  function checkCollision(enemy) {
    if (enemy.hit || enemy.destroyed || invincible > 0) return false;

    // Calcular posición real y tamaño actual del rival en el canvas
    const frac = enemy.lane / LANES + 0.5 / LANES;
    const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
    const botX = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
    const ex = topX + (botX - topX) * enemy.progress;
    const ey = HORIZON_Y + (H - HORIZON_Y) * enemy.progress;
    const scale = 0.2 + enemy.progress * 0.8;
    const ew = BASE_CAR_W * scale;
    const eh = BASE_CAR_H * scale;

    // Cajas de colisión físicas reales (76% del ancho y 76% del alto del chasis)
    const pLeft = playerX - CAR_W * 0.38;
    const pRight = playerX + CAR_W * 0.38;
    const pTop = PLAYER_Y - CAR_H * 0.38;
    const pBottom = PLAYER_Y + CAR_H * 0.38;

    const eLeft = ex - ew * 0.38;
    const eRight = ex + ew * 0.38;
    const eTop = ey - eh * 0.38;
    const eBottom = ey + eh * 0.38;

    const hitX = (pLeft < eRight) && (pRight > eLeft);
    const hitY = (pTop < eBottom) && (pBottom > eTop);

    return hitX && hitY;
  }

  // ── DIBUJO DEL HUD DIRECTO EN CANVAS (PARA GRABACIÓN EN VIDEO) ────────────
  function drawCanvasHud(kmVal, speedVal, livesVal, zoneVal, coinsVal = 0) {
    ctx.save();

    function drawPill(x, y, w, h, bg, border, shadow) {
      ctx.save();
      ctx.fillStyle = bg;
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 6; }
      ctx.beginPath();
      const r = 6;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 1. Insignia oficial Amigos Jugones (Top Left)
    drawPill(8, 5, 126, 25, 'rgba(0,0,0,0.85)', 'rgba(245,158,11,0.7)', 'rgba(245,158,11,0.3)');
    if (cbLogoBadgeImg.complete && cbLogoBadgeImg.naturalWidth > 0) {
      ctx.drawImage(cbLogoBadgeImg, 11, 7, 21, 21);
    } else {
      ctx.font = '14px sans-serif';
      ctx.fillText('🏆', 12, 22);
    }
    ctx.font = '900 8.5px "Inter", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('AMIGOS JUGONES', 36, 21);

    // 2. Monedas recolectadas y bonus (Top Center)
    drawPill(140, 5, 76, 25, 'rgba(0,0,0,0.85)', 'rgba(245,158,11,0.65)', 'rgba(245,158,11,0.25)');
    ctx.font = '11px sans-serif';
    ctx.fillText('🪙', 144, 21.5);
    ctx.font = '900 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`${coinsVal}`, 158, 21.5);
    ctx.font = '700 7px "Inter", sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`+${coinsVal * 50}P`, 178, 21);

    // 3. Vidas (Top Right)
    const livesW = 68;
    const livesX = W - 8 - livesW;
    drawPill(livesX, 5, livesW, 25, 'rgba(0,0,0,0.85)', 'rgba(239,68,68,0.5)', 'rgba(239,68,68,0.25)');
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const heartChar = i < livesVal ? '❤️' : '🖤';
      ctx.fillText(heartChar, livesX + 15 + i * 19, 21.5);
    }
    ctx.textAlign = 'left';

    // 4. Panel de DISTANCIA (Dato clave grabado en cada frame)
    drawPill(8, 34, 110, 36, 'rgba(3,11,26,0.88)', 'rgba(56,189,248,0.55)', 'rgba(56,189,248,0.3)');
    ctx.font = '800 7.5px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.95)';
    ctx.fillText('DISTANCIA', 16, 45);

    ctx.font = '900 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56,189,248,0.55)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${Math.round(kmVal).toLocaleString('es')} KM`, 16, 62);
    ctx.shadowBlur = 0;

    // 5. Panel de VELOCIDAD (Top Right, debajo de vidas)
    const spdW = 95;
    const spdX = W - 8 - spdW;
    drawPill(spdX, 34, spdW, 36, 'rgba(25,14,3,0.88)', 'rgba(245,158,11,0.55)', 'rgba(245,158,11,0.3)');
    ctx.font = '800 7.5px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(148,163,184,0.95)';
    ctx.fillText('VELOCIDAD', spdX + 10, 45);

    const displaySpeed = Math.round(120 + (speedVal - 3.5) * 30);
    ctx.font = '900 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = 'rgba(245,158,11,0.55)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${displaySpeed} km/h`, spdX + 10, 62);
    ctx.shadowBlur = 0;

    // 6. Badge de ZONA (Centro)
    const zoneW = 78;
    const zoneX = Math.round((W - zoneW) / 2);
    const zoneColors = { 1: '#06b6d4', 2: '#ec4899', 3: '#f59e0b', 4: '#ef4444' };
    const zCol = zoneColors[zoneVal] || '#06b6d4';
    drawPill(zoneX, 39, zoneW, 26, 'rgba(0,0,0,0.82)', zCol, zCol);
    ctx.font = '900 8.5px "Inter", sans-serif';
    ctx.fillStyle = zCol;
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ ZONA ${zoneVal}`, W / 2, 56);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ── DIBUJO DE ESTAMPADO FINAL EN CANVAS TRAS CHOQUE ───────────────────────
  function drawGameOverCanvas(finalKm, pilotName, isPodium, coins = 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 3, 18, 0.88)';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = isPodium ? 'rgba(245,158,11,0.8)' : 'rgba(56,189,248,0.7)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(16, 95, W - 32, H - 190);

    // Emblema Oficial Grande de Amigos Jugones en el estampado del video
    const goLogo = getCbLogo() || cbLogoBadgeImg;
    const goLogoSize = 46;
    const goLogoY = 108;
    if (goLogo && goLogo.complete && goLogo.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, goLogoY + goLogoSize / 2, goLogoSize * 0.54, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.85)';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.clip();
      ctx.drawImage(goLogo, W / 2 - goLogoSize / 2, goLogoY, goLogoSize, goLogoSize);
      ctx.restore();
    } else {
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isPodium ? '🏆' : '🏁', W / 2, goLogoY + 34);
    }

    ctx.textAlign = 'center';
    ctx.font = '900 9.5px "Inter", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('AMIGOS JUGONES · CIRCUITO BLACK', W / 2, goLogoY + goLogoSize + 15);

    ctx.font = '900 16px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isPodium ? '¡ZONA DE PODIO!' : 'FIN DE CARRERA', W / 2, goLogoY + goLogoSize + 34);

    ctx.font = '700 8.5px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('PILOTO', W / 2, 222);
    ctx.font = '900 14px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pilotName.toUpperCase(), W / 2, 238);

    const bonusPts = coins * 50;
    const totalScore = finalKm + bonusPts;

    // Puntaje Total Grande
    ctx.font = '700 8.5px "Inter", sans-serif';
    ctx.fillStyle = isPodium ? 'rgba(245,158,11,0.85)' : 'rgba(56,189,248,0.8)';
    ctx.fillText('PUNTAJE TOTAL', W / 2, 274);

    ctx.font = '900 34px "JetBrains Mono", monospace';
    ctx.fillStyle = isPodium ? '#f59e0b' : '#38bdf8';
    ctx.shadowColor = isPodium ? 'rgba(245,158,11,0.7)' : 'rgba(56,189,248,0.7)';
    ctx.shadowBlur = 14;
    ctx.fillText(`${totalScore.toLocaleString('es')}`, W / 2, 312);
    ctx.shadowBlur = 0;

    // Desglose en números más chicos (Kms Recorridos y Bonus de Monedas)
    ctx.font = '700 8px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('DESGLOSE DE PUNTOS', W / 2, 342);

    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`KMS RECORRIDOS: ${finalKm.toLocaleString('es')} KM`, W / 2, 360);

    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`BONUS MONEDAS (${coins}): +${bonusPts} PTS`, W / 2, 380);

    ctx.restore();
  }

  // ── GAME OVER ────────────────────────────────────────────────────────────
  function triggerGameOver() {
    gameOver = true;
    running = false;
    cleanup();
    stopCbMusic();
    playCbGameOverSfx();
    spawnParticles(playerX, PLAYER_Y, carColor, 20);

    const finalKm = Math.round(km);
    const pilotName = localStorage.getItem('cb_pilot_name') || 'Piloto';
    const bonusCoins = coinsCollected;
    const bonusPts = bonusCoins * 50;
    const totalScore = finalKm + bonusPts;
    const code = `#CB-${totalScore}-${Math.floor(Math.random() * 8999 + 1000)}`;
    const isPodium = (() => { const r = getCbRanking(); return r.length < 3 || totalScore >= r[2].km; })();

    // El puntaje del minijuego NO se suma al Ranking Principal.
    // Guardar récord en el podio oficial de SQLite
    const activeNick = (window.AuthManager && window.AuthManager.isAuthenticated()) ? window.AuthManager.getNick() : pilotName;
    if (activeNick) {
      const submitUrl = `/api/submit_score?nick=${encodeURIComponent(activeNick)}&game=carrera&km=${finalKm}&bonus=${bonusCoins}&score=${totalScore}`;
      fetch(submitUrl)
        .then(r => r.json())
        .then(res => {
          if (res && res.podio) {
            console.log(`🏆 [CircuitoBlack] ¡${activeNick} entró al Podio #${res.pos}! (${res.renta})`);
          }
        })
        .catch(e => console.warn('[CircuitoBlack] Error reportando récord a SQLite:', e));
    }

    // Guardar en ranking local con el puntaje total
    updateCbRankingWithScore(pilotName, totalScore);

    // Refrescar ranking en UI
    const rankEl = document.getElementById('cb-ranking-list');
    if (rankEl) rankEl.innerHTML = renderCbRankingRows();

    // Mantener el estampado de game-over en canvas a 30 FPS hasta que la grabación pare de verdad.
    // El clearInterval se mueve DENTRO del .then() para que el último frame del video sea siempre
    // el resumen de carrera y no un frame de juego vacío. Duración mínima de 5 segundos.
    let freezeTicks = 0;
    const freezeStartTime = Date.now();
    let cbStopInitiated = false;
    const freezeInterval = setInterval(() => {
      drawGameOverCanvas(finalKm, pilotName, isPodium, bonusCoins);
      freezeTicks++;
      const elapsedFreeze = Date.now() - freezeStartTime;
      if (elapsedFreeze >= 5000 && !cbStopInitiated) { // 5 segundos completos a 30fps
        cbStopInitiated = true;
        // Pedimos parar la grabación, pero el loop sigue dibujando mientras el MediaRecorder termina
        stopRecordingCanvas().then(() => {
          clearInterval(freezeInterval); // Ahora sí paramos el dibujado
          showTelemetryOverlay(finalKm, pilotName, isPodium, code, bonusCoins, bonusPts, totalScore);
        });
      }
    }, 32);
  }

  function showTelemetryOverlay(finalKm, pilotName, isPodium, code, bonusCoins, bonusPts, totalScore) {
    const cabinet = document.getElementById('cb-game-cabinet') || document.getElementById('cb-canvas-wrapper');
    if (!cabinet) return;

    // Eliminar overlay anterior si existe
    const prev = document.getElementById('cb-telemetry-result');
    if (prev) prev.remove();

    const videoExtUpper = (cbLastVideoExt || 'mp4').toUpperCase();

    // Crear overlay absoluto dentro del gabinete
    const telCard = document.createElement('div');
    telCard.id = 'cb-telemetry-result';
    telCard.style.cssText = `
      position:absolute;inset:0;z-index:20;
      background:linear-gradient(160deg,rgba(5,3,18,.97) 0%,rgba(15,5,35,.97) 100%);
      backdrop-filter:blur(12px);
      display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
      padding:18px 16px 22px;gap:10px;
      overflow-y:auto;box-sizing:border-box;
      animation:fadeInDown .45s cubic-bezier(.22,1,.36,1);
      border-radius:14px;
    `;
    telCard.innerHTML = `
      <!-- Borde neón animado -->
      <div style="position:absolute;inset:0;border-radius:14px;pointer-events:none;
        border:2px solid ${isPodium ? 'rgba(245,158,11,.7)' : 'rgba(6,182,212,.55)'};
        box-shadow:0 0 30px ${isPodium ? 'rgba(245,158,11,.25)' : 'rgba(6,182,212,.2)'} inset;"></div>

      <!-- Header con Logo Oficial Amigos Jugones -->
      <div style="text-align:center;margin-bottom:2px;">
        <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones" style="width:84px;height:84px;object-fit:contain;margin-bottom:6px;filter:drop-shadow(0 0 20px rgba(245,158,11,0.7)) drop-shadow(0 0 8px rgba(245,158,11,0.4));">
        <div style="font-size:.62rem;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:2px;font-weight:700;">Resultados de Carrera · Amigos Jugones</div>
      </div>

      <!-- Badge podio/final -->
      <span style="
        display:inline-block;padding:4px 16px;
        background:${isPodium ? 'rgba(245,158,11,.18)' : 'rgba(6,182,212,.14)'};
        border:1px solid ${isPodium ? 'rgba(245,158,11,.6)' : 'rgba(6,182,212,.5)'};
        border-radius:999px;font-size:.7rem;font-weight:800;letter-spacing:1.5px;
        color:${isPodium ? '#f59e0b' : '#38bdf8'};text-transform:uppercase;
      ">${isPodium ? '¡ZONA DE PODIO!' : 'MARCA FINAL'}</span>

      <!-- Piloto -->
      <div style="text-align:center;">
        <div style="font-size:.6rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:2px;">Piloto</div>
        <div style="font-size:1.35rem;font-weight:900;color:#fff;letter-spacing:-.5px;">${escapeHtml(pilotName)}</div>
      </div>

      <!-- Puntaje Total Grande -->
      <div style="text-align:center;line-height:1;margin:2px 0 4px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:clamp(2.6rem,11vw,4rem);font-weight:900;
          color:${isPodium ? '#f59e0b' : '#38bdf8'};text-shadow:0 0 32px ${isPodium ? 'rgba(245,158,11,.75)' : 'rgba(56,189,248,.75)'};
          letter-spacing:-1px;">${totalScore.toLocaleString('es')}</div>
        <div style="font-size:.72rem;font-weight:800;color:${isPodium ? 'rgba(245,158,11,.85)' : 'rgba(56,189,248,.8)'};text-transform:uppercase;letter-spacing:3px;margin-top:4px;">Puntaje Total</div>
      </div>

      <!-- Desglose: Kms Recorridos y Bonus Monedas en números más chicos -->
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:9px 16px;width:100%;max-width:270px;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
        <div style="text-align:left;">
          <div style="font-size:0.62rem;color:rgba(255,255,255,0.55);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">Kms Recorridos</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:1.02rem;color:#38bdf8;font-weight:800;">${finalKm.toLocaleString('es')} KM</div>
        </div>
        <div style="color:rgba(255,255,255,0.3);font-weight:900;font-size:1.2rem;padding:0 6px;">+</div>
        <div style="text-align:right;">
          <div style="font-size:0.62rem;color:rgba(255,255,255,0.55);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">Bonus Monedas (${bonusCoins})</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:1.02rem;color:#f59e0b;font-weight:800;">+${bonusPts} PTS</div>
        </div>
      </div>

      <!-- Video Replay de la Partida -->
      <div id="cb-video-container" style="width:100%;max-width:240px;position:relative;border-radius:10px;overflow:hidden;border:1px solid rgba(6,182,212,.4);box-shadow:0 0 16px rgba(6,182,212,.2);background:#000;display:${cbLastVideoUrl ? 'block' : 'none'};">
        <video id="cb-recorded-video" ${cbLastVideoUrl ? `src="${cbLastVideoUrl}"` : ''} autoplay loop muted playsinline style="width:100%;max-height:95px;object-fit:cover;display:block;"></video>
        <div style="position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,.75);padding:2px 6px;border-radius:4px;font-size:.58rem;color:#38bdf8;font-weight:700;">▶ REPLAY</div>
      </div>

      ${isPodium ? `<div style="font-size:.8rem;color:#f59e0b;font-weight:700;text-align:center;">🎉 ¡Entraste al podio de renta pasiva!</div>` : ''}

      <!-- Código verificador -->
      <div style="font-family:'JetBrains Mono',monospace;font-size:.6rem;color:rgba(255,255,255,.25);letter-spacing:1px;">${code}</div>

      <!-- Saldo de Puntos Restante -->
      <div style="font-family:'JetBrains Mono',monospace; font-size:0.82rem; color:var(--text-dim); text-align:center; background:rgba(0,0,0,0.4); padding:6px 14px; border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
        🪙 Saldo de Puntos Restante: <strong style="color:#f59e0b;">${window.AuthManager ? window.AuthManager.getPoints() : 0} PTS</strong>
      </div>

      <!-- Botones Principales -->
      <div style="width:100%;display:flex;flex-direction:column;gap:8px;margin-top:4px;">
        <button id="cb-btn-share-main" onclick="window.cbShareVideo(${finalKm},'${escapeHtml(pilotName)}','${code}',${bonusCoins})" class="cb-share-video-btn" style="font-size:0.96rem;padding:14px;box-shadow:0 0 20px rgba(16,185,129,0.35);">
          🎬 Compartir Carrera (Descargar MP4)
        </button>
        <button onclick="window.cbRestartGame()" class="cb-btn-nitro" style="width:100%;justify-content:center;padding:12px;font-size:.95rem;">🔄 Nueva Tanda (-10 PTS)</button>
      </div>
    `;
    cabinet.appendChild(telCard);
    attachVideoToTelemetryOverlay();

    // Iniciar automáticamente conversión de WebM a MP4 en segundo plano si el video grabado es WebM
    if (cbLastVideoBlob && cbLastVideoBlob.size > 0 && cbLastVideoExt === 'webm' && !cbLastConvertedMp4Blob && !cbIsConvertingMp4) {
      cbIsConvertingMp4 = true;
      convertWebmBlobToMp4(cbLastVideoBlob).then((mp4Blob) => {
        cbIsConvertingMp4 = false;
        if (mp4Blob && mp4Blob.size > 0) {
          cbLastConvertedMp4Blob = mp4Blob;
          if (cbLastConvertedMp4Url) URL.revokeObjectURL(cbLastConvertedMp4Url);
          cbLastConvertedMp4Url = URL.createObjectURL(mp4Blob);
        }
      }).catch(() => {
        cbIsConvertingMp4 = false;
      });
    }
  }

  // ── LOOP PRINCIPAL ───────────────────────────────────────────────────────
  function gameLoop() {
    if (!running || gameOver) return;

    frame++;

    // Scroll de carretera
    roadOffset = (roadOffset + speed * 0.005) % 1;

    // Aumentar velocidad gradualmente (cada 300 frames ~5 seg)
    if (frame % 300 === 0 && speed < 9) {
      speed += 0.35;
      spawnInterval = Math.max(45, spawnInterval - 8);
      updateCbEngineSpeed(speed);
      playCbLevelUpSfx();
    }

    // ── DIFICULTAD INCREMENTAL ─────────────────────────────────────────────
    // 1. Velocidad progresa de 3.5 (~120 km/h) a 6.8 (~245 km/h)
    speed = 3.5 + Math.min(3.5, (km / 350) * 1.5);

    // 2. Intervalo de spawn se reduce con la velocidad
    spawnInterval = Math.max(36, Math.round(82 - (speed - 3.5) * 12));

    // 3. Zonas temáticas según distancia
    let targetZone = 1;
    let targetNeon = '#06b6d4';
    if (km >= 900) {
      targetZone = 4;
      targetNeon = '#ef4444';
    } else if (km >= 550) {
      targetZone = 3;
      targetNeon = '#f59e0b';
    } else if (km >= 250) {
      targetZone = 2;
      targetNeon = '#ec4899';
    }

    if (targetZone !== currentZone) {
      currentZone = targetZone;
      zoneBanner = {
        text: currentZone === 2 ? '⚡ ZONA 2: TURBO EXPRESS · 160+ KM/H ⚡' :
          currentZone === 3 ? '🔥 ZONA 3: TRÁFICO INTENSO · 200+ KM/H 🔥' :
            '☠️ ZONA 4: VELOCIDAD TERMINAL · 240+ KM/H ☠️',
        alpha: 1.0,
        color: targetNeon
      };
      playCbLevelUpSfx();
    }
    zoneNeonColor = targetNeon;

    // Actualizar audio del motor y tempo synthwave con la velocidad
    updateCbEngineSpeed(speed);

    // Acumular KM
    km += speed * 0.06;

    // Reducir invincibilidad
    if (invincible > 0) invincible--;

    // Spawn de enemigos frontales
    spawnTimer++;
    if (spawnTimer >= spawnInterval) {
      spawnTimer = 0;
      spawnEnemy();
    }

    // Spawn de autos traseros
    rearSpawnTimer++;
    if (rearSpawnTimer >= rearSpawnInterval) {
      rearSpawnTimer = 0;
      spawnRearCar();
    }

    // Spawn de obstáculos
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
      obstacleTimer = 0;
      spawnObstacle();
    }

    // Spawn de Corazón de Vida: Cada 500 km recorridos
    if (km - lastHeartKm >= 500) {
      lastHeartKm = Math.floor(km / 500) * 500;
      spawnCollectible('heart');
      spawnFloatingText('¡CORAZÓN EN PISTA! ❤️', W / 2, HORIZON_Y + 28, '#ef4444');
    }

    // Spawn de Monedas: Aleatorio en la pista
    coinTimer++;
    if (coinTimer >= coinInterval) {
      coinTimer = 0;
      coinInterval = 120 + Math.floor(Math.random() * 80); // Cada ~2-3 seg
      spawnCollectible('coin');
    }

    // Mover jugador (suavizado + derrape por aceite)
    if (skidFrames > 0) {
      // Derrape: mover al carril adyacente involuntariamente
      const skidTarget = Math.max(0, Math.min(LANES - 1, playerTargetLane + skidDir));
      const skidX = laneCenters[skidTarget];
      playerX += (skidX - playerX) * 0.12;
      skidFrames--;
    } else {
      const targetX = laneCenters[playerTargetLane];
      playerX += (targetX - playerX) * 0.18;
    }

    // Mover enemigos frontales
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.destroyed) { enemies.splice(i, 1); continue; }
      e.progress += e.speed * (speed / 3.5);
      if (e.progress > 1.05) { enemies.splice(i, 1); continue; }

      // Colisión con jugador
      if (!e.hit && checkCollision(e)) {
        e.hit = true;
        lives--;
        invincible = 80;
        spawnParticles(playerX, PLAYER_Y, '#ef4444', 18);
        playCbCrashSfx();
        if (lives <= 0) { triggerGameOver(); return; }
      } else if (!e.hit && Math.abs(e.progress - PLAYER_PROGRESS) < 0.08) {
        const approxX = getLaneCenterX(e.lane, e.progress);
        if (Math.abs(approxX - playerX) < CAR_W * 1.8 && Math.abs(approxX - playerX) > CAR_W * 0.5) {
          playCbWhooshSfx();
        }
      }
    }

    // Mover autos traseros (van de abajo → horizonte)
    for (let i = rearCars.length - 1; i >= 0; i--) {
      const r = rearCars[i];
      r.progress -= r.speed * (speed / 3.5); // Sube hacia el horizonte
      if (r.progress < -0.05) { rearCars.splice(i, 1); continue; }
      if (r.exploded) { rearCars.splice(i, 1); continue; }

      // 1. Colisión auto trasero con auto frontal (¡choque destructivo total!)
      let destroyedInCrash = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e.hit || e.destroyed || e.lane !== r.lane) continue;
        if (Math.abs(e.progress - r.progress) < 0.08) {
          // ¡Choque frontal espectacular: ambos autos se estrellan y destruyen!
          const frac = r.lane / LANES + 0.5 / LANES;
          const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
          const botX = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
          const colProg = (r.progress + e.progress) * 0.5;
          const cx = topX + (botX - topX) * colProg;
          const cy = HORIZON_Y + (H - HORIZON_Y) * colProg;

          spawnParticles(cx, cy, '#f59e0b', 26);
          spawnParticles(cx, cy, '#ef4444', 22);
          spawnParticles(cx, cy, '#ffffff', 12);
          spawnWreckage(cx, cy, r.color, e.color);
          playCbCrashSfx();

          r.exploded = true;
          e.destroyed = true;
          e.hit = true;
          enemies.splice(j, 1); // EL AUTO FRONTAL QUEDA TOTALMENTE DESTRUIDO Y ELIMINADO
          destroyedInCrash = true;
          break;
        }
      }
      if (destroyedInCrash) {
        rearCars.splice(i, 1);
        continue;
      }

      // 2. Colisión auto trasero con el jugador (choque por alcance si el jugador no esquiva)
      if (!r.exploded && invincible === 0) {
        const frac = r.lane / LANES + 0.5 / LANES;
        const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
        const botX = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
        const rx = topX + (botX - topX) * r.progress;
        const ry = HORIZON_Y + (H - HORIZON_Y) * r.progress;
        const rScale = 0.2 + r.progress * 0.8;
        const rw = BASE_CAR_W * rScale;
        const rh = BASE_CAR_H * rScale;

        const pLeft = playerX - CAR_W * 0.38;
        const pRight = playerX + CAR_W * 0.38;
        const pTop = PLAYER_Y - CAR_H * 0.38;
        const pBottom = PLAYER_Y + CAR_H * 0.38;

        const rLeft = rx - rw * 0.38;
        const rRight = rx + rw * 0.38;
        const rTop = ry - rh * 0.38;
        const rBottom = ry + rh * 0.38;

        const hitX = (pLeft < rRight) && (pRight > rLeft);
        const hitY = (pTop < rBottom) && (pBottom > rTop);

        if (hitX && hitY) {
          // El auto trasero choca por detrás al jugador: no pasa flotando por debajo
          r.exploded = true;
          lives--;
          invincible = 75;
          spawnParticles(playerX, PLAYER_Y, '#ef4444', 22);
          spawnParticles(playerX, PLAYER_Y, '#f59e0b', 16);
          spawnWreckage(rx, ry, r.color, carColor);
          playCbCrashSfx();
          rearCars.splice(i, 1);
          if (lives <= 0) { triggerGameOver(); return; }
          continue;
        }
      }

      // 3. Whoosh al pasar junto al jugador si lo adelanta en carril contiguo
      if (Math.abs(r.progress - PLAYER_PROGRESS) < 0.08) {
        const approxX = getLaneCenterX(r.lane, r.progress);
        if (Math.abs(approxX - playerX) < CAR_W * 2.2 && Math.abs(approxX - playerX) > CAR_W * 0.5) {
          playCbWhooshSfx();
        }
      }
    }

    // Mover obstáculos y detectar colisión con jugador
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      ob.progress += 0.006 * (speed / 3.5);
      ob.wobble += 0.15;
      if (ob.progress > 1.05) { obstacles.splice(i, 1); continue; }
      if (ob.hit) continue;

      // Posición perspectiva del obstáculo
      const frac = ob.lane / LANES + 0.5 / LANES;
      const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
      const botX = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
      const obX = topX + (botX - topX) * ob.progress;
      const obY = HORIZON_Y + (H - HORIZON_Y) * ob.progress;
      const obScale = 0.3 + ob.progress * 0.7;
      const hitRadius = 16 * obScale;

      if (Math.abs(obX - playerX) < hitRadius + CAR_W * 0.38
        && Math.abs(obY - PLAYER_Y) < hitRadius + CAR_H * 0.35 && invincible === 0) {
        ob.hit = true;
        if (ob.type === 'oil') {
          // Aceite: derrape sin daño
          skidFrames = 55;
          skidDir = (Math.random() < 0.5 ? -1 : 1);
          spawnParticles(playerX, PLAYER_Y, 'rgba(180,100,255,0.8)', 10);
        } else {
          // Roca: daño
          lives--;
          invincible = 70;
          spawnParticles(playerX, PLAYER_Y, '#94a3b8', 18);
          playCbCrashSfx();
          if (lives <= 0) { triggerGameOver(); return; }
        }
      }
    }

    // Mover coleccionables (corazones y monedas) y detectar recogida
    for (let i = collectibles.length - 1; i >= 0; i--) {
      const c = collectibles[i];
      c.progress += 0.007 * (speed / 3.5);
      c.rotation += 0.08;
      c.bob += 0.12;

      if (c.progress > 1.05) {
        collectibles.splice(i, 1);
        continue;
      }
      if (c.collected) continue;

      const frac = c.lane / LANES + 0.5 / LANES;
      const topX = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
      const botX = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
      const cx = topX + (botX - topX) * c.progress;
      const cy = HORIZON_Y + (H - HORIZON_Y) * c.progress;
      const cScale = 0.3 + c.progress * 0.7;
      const hitRadius = 20 * cScale;

      if (Math.abs(cx - playerX) < hitRadius + CAR_W * 0.42
        && Math.abs(cy - PLAYER_Y) < hitRadius + CAR_H * 0.40) {
        c.collected = true;
        if (c.type === 'heart') {
          if (lives < 3) {
            lives++;
            spawnFloatingText('+1 VIDA ❤️', playerX, PLAYER_Y - 26, '#ef4444');
          } else {
            coinsCollected += 5; // Bonus si ya tiene vidas al máximo
            spawnFloatingText('MAX VIDA! +250 PTS 💖', playerX, PLAYER_Y - 26, '#ec4899');
          }
          spawnParticles(playerX, PLAYER_Y, '#ef4444', 22);
          spawnParticles(playerX, PLAYER_Y, '#f472b6', 16);
          playCbHeartSfx();
        } else if (c.type === 'coin') {
          coinsCollected++;
          spawnFloatingText('+50 PTS 🪙', playerX, PLAYER_Y - 26, '#f59e0b');
          spawnParticles(playerX, PLAYER_Y, '#f59e0b', 16);
          spawnParticles(playerX, PLAYER_Y, '#fbbf24', 12);
          playCbCoinSfx();
        }
        collectibles.splice(i, 1);
      }
    }

    // Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.15;
      p.alpha -= 1 / p.life;
      if (p.alpha <= 0) { particles.splice(i, 1); }
    }

    // ── DIBUJO ──────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    drawRoad();

    // ── Construir lista unificada de objetos para pintar en orden Z (progress) ──
    const drawQueue = [];

    // Obstáculos (aceite y rocas) — se pintan sobre el asfalto
    for (const ob of obstacles) {
      if (ob.progress < 0.04 || ob.hit) continue;
      const frac = ob.lane / LANES + 0.5 / LANES;
      const topX2 = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
      const botX2 = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
      const ox = topX2 + (botX2 - topX2) * ob.progress;
      const oy = HORIZON_Y + (H - HORIZON_Y) * ob.progress;
      const oScale = 0.3 + ob.progress * 0.7;
      drawQueue.push({
        progress: ob.progress - 0.002, draw: () => {
          if (ob.type === 'oil') drawOilSlick(ox, oy, oScale);
          else drawRock(ox, oy, oScale, ob.wobble);
        }
      });
    }

    // Coleccionables (corazones y monedas)
    for (const c of collectibles) {
      if (c.progress < 0.03 || c.collected) continue;
      const frac = c.lane / LANES + 0.5 / LANES;
      const topX2 = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
      const botX2 = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
      const cx = topX2 + (botX2 - topX2) * c.progress;
      const cy = HORIZON_Y + (H - HORIZON_Y) * c.progress;
      const cScale = 0.3 + c.progress * 0.7;
      drawQueue.push({
        progress: c.progress,
        draw: () => {
          if (c.type === 'heart') drawHeartItem(cx, cy, cScale, c.bob);
          else drawCoinItem(cx, cy, cScale, c.rotation);
        }
      });
    }

    // Enemigos frontales
    for (const e of enemies) {
      if (e.progress < 0.02 || e.destroyed) continue;
      const frac = e.lane / LANES + 0.5 / LANES;
      const topX2 = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
      const botX2 = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
      const ex = topX2 + (botX2 - topX2) * e.progress;
      const ey = HORIZON_Y + (H - HORIZON_Y) * e.progress;
      const scale = 0.2 + e.progress * 0.8;
      const ew = BASE_CAR_W * scale, eh = BASE_CAR_H * scale;
      const flashColor = (e.hit && invincible > 70) ? '#ffffff' : e.color;
      drawQueue.push({ progress: e.progress, draw: () => drawCar(ex, ey, ew, eh, flashColor, false, true) });
    }

    // Autos traseros
    for (const r of rearCars) {
      if (r.progress > 1.05 || r.progress < -0.05 || r.exploded) continue;
      const frac = r.lane / LANES + 0.5 / LANES;
      const topX2 = ROAD_TOP_LEFT + (ROAD_TOP_RIGHT - ROAD_TOP_LEFT) * frac;
      const botX2 = ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * frac;
      const rx = topX2 + (botX2 - topX2) * r.progress;
      const ry = HORIZON_Y + (H - HORIZON_Y) * r.progress;
      const rScale = 0.2 + r.progress * 0.8;
      const rw = BASE_CAR_W * rScale, rh = BASE_CAR_H * rScale;
      drawQueue.push({ progress: r.progress, draw: () => drawCar(rx, ry, rw, rh, r.color, false, false) });
    }

    // Auto del jugador en la cola Z para ordenamiento perfecto de capas
    const showPlayer = invincible === 0 || Math.floor(invincible / 5) % 2 === 0;
    if (showPlayer) {
      const flashPX = invincible > 0 ? playerX + (Math.random() - 0.5) * 4 : playerX;
      drawQueue.push({
        progress: PLAYER_PROGRESS,
        draw: () => {
          drawCar(flashPX, PLAYER_Y, CAR_W, CAR_H, carColor, true, false);
          // Escape del auto del jugador (llamas)
          if (frame % 3 < 2) {
            ctx.fillStyle = `rgba(249,115,22,${0.3 + Math.random() * 0.5})`;
            ctx.beginPath();
            ctx.ellipse(flashPX - CAR_W * 0.22, PLAYER_Y + CAR_H * 0.52, 3, 6 + Math.random() * 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(flashPX + CAR_W * 0.22, PLAYER_Y + CAR_H * 0.52, 3, 6 + Math.random() * 3, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Ordenar por progress ascendente → los más lejanos primero, los más cercanos encima
    drawQueue.sort((a, b) => a.progress - b.progress);
    for (const item of drawQueue) item.draw();

    // Restos de choques (debris / wreckage)
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.16;
      d.rot += d.vRot;
      d.alpha -= 1 / d.life;
      if (d.alpha <= 0) {
        debris.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, d.alpha);
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.7);
      ctx.restore();
    }

    // Textos flotantes (+1 VIDA, +50 PTS)
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= 1 / ft.life;
      if (ft.alpha <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = '900 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // Flechas neón de alerta en el borde inferior para advertir autos traseros que se aproximan
    for (const r of rearCars) {
      if (r.exploded || r.progress <= PLAYER_PROGRESS + 0.05) continue;
      const laneX = getLaneCenterX(r.lane, 0.98);
      ctx.save();
      ctx.font = '900 13px sans-serif';
      ctx.fillStyle = (frame % 16 < 8) ? '#f59e0b' : '#ef4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.textAlign = 'center';
      ctx.fillText('▲', laneX, H - 10);
      ctx.restore();
    }

    // Indicador visual de derrape (borde violeta parpadeante)
    if (skidFrames > 30) {
      ctx.fillStyle = 'rgba(180,100,255,0.09)';
      ctx.fillRect(0, 0, W, H);
    }

    // Partículas
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Vidas como flash rojo en bordes si quedan pocas
    if (lives === 1 && invincible === 0 && frame % 20 < 10) {
      ctx.fillStyle = 'rgba(239,68,68,0.08)';
      ctx.fillRect(0, 0, W, H);
    }

    // Dibujar HUD completo de telemetría directamente sobre el canvas
    // Así queda grabado permanentemente en el video MP4 de la partida
    drawCanvasHud(km, speed, lives, currentZone, coinsCollected);

    updateHud();
    cbGame._raf = requestAnimationFrame(gameLoop);
  }

  // ── CONTROLES DE TECLADO ─────────────────────────────────────────────────
  function onKeyDown(e) {
    if (!running) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      playerTargetLane = Math.max(0, playerTargetLane - 1);
      playerLane = playerTargetLane;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      playerTargetLane = Math.min(LANES - 1, playerTargetLane + 1);
      playerLane = playerTargetLane;
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // ── CONTROLES TÁCTILES Y CLIC ─────────────────────────────────────────────
  let touchStartX = 0;
  function onTouchStart(e) { touchStartX = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (!running) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 25) {
      if (dx < 0) playerTargetLane = Math.max(0, playerTargetLane - 1);
      else playerTargetLane = Math.min(LANES - 1, playerTargetLane + 1);
      playerLane = playerTargetLane;
    }
  }
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });

  function onCanvasClick(e) {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.45) {
      playerTargetLane = Math.max(0, playerTargetLane - 1);
    } else if (clickX > rect.width * 0.55) {
      playerTargetLane = Math.min(LANES - 1, playerTargetLane + 1);
    }
    playerLane = playerTargetLane;
  }
  canvas.addEventListener('click', onCanvasClick);

  // ── LIMPIEZA ─────────────────────────────────────────────────────────────
  function cleanup() {
    document.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('click', onCanvasClick);
    if (cbGame && cbGame._raf) { cancelAnimationFrame(cbGame._raf); cbGame._raf = null; }
  }

  // Registramos la referencia global
  cbGame = { running: true, cleanup, _raf: null };

  // Iniciar música de motor
  startCbMusic(speed);

  // Iniciar grabación de video de la partida
  startRecordingCanvas(canvas);

  // Iniciar loop
  cbGame._raf = requestAnimationFrame(gameLoop);
}

// ─── ACCIONES GLOBALES ───────────────────────────────────────────────────────

window.cbRestartGame = function () {
  // Limpiar resultado anterior
  const prev = document.getElementById('cb-telemetry-result');
  if (prev) prev.remove();

  const content = document.getElementById('page-content');
  if (content) renderCarrera(content, App.data);
};

window.cbShareTelemetry = function (km, pilot, code, coins = 0) {
  const ranking = getCbRanking();
  const pos = ranking.findIndex(r => r.pilot === pilot);
  const posStr = pos >= 0 ? `Posición en Podio: ${pos + 1}°` : 'Sin podio esta vez';
  const bonusPts = (coins || 0) * 50;
  const totalScore = (km || 0) + bonusPts;

  const text = `🏎️ *CIRCUITO BLACK — TELEMETRÍA OFICIAL*\n` +
    `👤 *Piloto:* ${pilot}\n` +
    `⭐ *PUNTAJE TOTAL:* ${totalScore.toLocaleString('es')} PTS\n` +
    `📏 *Kms Recorridos:* ${(km || 0).toLocaleString('es')} KM\n` +
    `🪙 *Bonus Monedas (${coins || 0}):* +${bonusPts} PTS\n` +
    `🏆 ${posStr}\n` +
    `🛡️ *Verificación:* ${code}\n\n` +
    `@Admin ¡Anota mi marca en el Mini-Ranking para cobrar Renta Pasiva! 🏁`;

  navigator.clipboard.writeText(text).then(() => {
    alert('📋 ¡Telemetría copiada!\nPégala en el grupo de WhatsApp para que el Admin la registre con Lunara.');
  }).catch(() => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  });
};

window.cbShareVideo = async function (km, pilot, code, coins = 0) {
  const finalKm = km || 0;
  const bonusCoins = coins || 0;
  const bonusPts = bonusCoins * 50;
  const totalScore = finalKm + bonusPts;
  const cleanPilot = (pilot || 'piloto').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Asegurar blob si existen chunks
  if ((!cbLastVideoBlob || cbLastVideoBlob.size === 0) && cbRecordedChunks && cbRecordedChunks.length > 0) {
    try {
      const type = cbLastVideoMime || (cbLastVideoExt === 'mp4' ? 'video/mp4' : 'video/webm');
      cbLastVideoBlob = new Blob(cbRecordedChunks, { type });
      if (cbLastVideoUrl) URL.revokeObjectURL(cbLastVideoUrl);
      cbLastVideoUrl = URL.createObjectURL(cbLastVideoBlob);
    } catch (e) { }
  }

  // Si la conversión a MP4 está en progreso, esperar brevemente
  if (!cbLastConvertedMp4Blob && cbIsConvertingMp4) {
    let waited = 0;
    while (cbIsConvertingMp4 && waited < 45) {
      await new Promise(r => setTimeout(r, 100));
      waited++;
    }
  }

  function triggerDirectDownload(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 120);
  }

  const shareBtn = document.getElementById('cb-btn-share-main');

  // Si aún no está convertido y tenemos WebM, convertirlo ahora
  if (!cbLastConvertedMp4Blob && cbLastVideoExt === 'webm' && cbLastVideoBlob && cbLastVideoBlob.size > 0) {
    if (shareBtn) shareBtn.innerHTML = '⏳ Convirtiendo a MP4...';
    try {
      cbIsConvertingMp4 = true;
      const mp4Blob = await convertWebmBlobToMp4(cbLastVideoBlob);
      cbIsConvertingMp4 = false;
      if (mp4Blob && mp4Blob.size > 0) {
        cbLastConvertedMp4Blob = mp4Blob;
        if (cbLastConvertedMp4Url) URL.revokeObjectURL(cbLastConvertedMp4Url);
        cbLastConvertedMp4Url = URL.createObjectURL(mp4Blob);
      }
    } catch (e) {
      cbIsConvertingMp4 = false;
    }
  }

  if (shareBtn) shareBtn.innerHTML = '🎬 Compartir Carrera (Descargar MP4)';

  // Seleccionar Blob final y URL asegurando extensión .mp4
  let targetBlob = cbLastConvertedMp4Blob;
  let targetUrl = cbLastConvertedMp4Url;
  let finalFileName = `circuito-black-${cleanPilot}-${finalKm}km.mp4`;

  if (!targetBlob && cbLastVideoExt === 'mp4' && cbLastVideoBlob && cbLastVideoBlob.size > 0) {
    targetBlob = cbLastVideoBlob;
    targetUrl = cbLastVideoUrl || URL.createObjectURL(targetBlob);
  }

  if (!targetBlob && cbLastVideoBlob && cbLastVideoBlob.size > 0) {
    targetBlob = cbLastVideoBlob;
    finalFileName = `circuito-black-${cleanPilot}-${finalKm}km.${cbLastVideoExt || 'mp4'}`;
    targetUrl = cbLastVideoUrl || URL.createObjectURL(targetBlob);
  }

  if (targetBlob && targetBlob.size > 0) {
    // 1. Descarga directa del archivo MP4
    triggerDirectDownload(targetUrl, finalFileName);

    // 2. Copia de la ficha oficial de telemetría al portapapeles
    const text = `🏎️ *CIRCUITO BLACK — TELEMETRÍA OFICIAL*\n` +
      `👤 *Piloto:* ${pilot}\n` +
      `⭐ *PUNTAJE TOTAL:* ${totalScore.toLocaleString('es')} PTS\n` +
      `📏 *Kms Recorridos:* ${finalKm.toLocaleString('es')} KM\n` +
      `🪙 *Bonus Monedas (${bonusCoins}):* +${bonusPts} PTS\n` +
      `🛡️ *Código:* ${code}\n\n` +
      `*¡Adjunto el video MP4 de mi partida para validar mi récord en el grupo!* 🏁`;

    try {
      await navigator.clipboard.writeText(text);
      alert(`🎥 ¡Video MP4 descargado y datos copiados al portapapeles!\n\nPega el mensaje en el grupo de WhatsApp y adjunta el archivo "${finalFileName}" para validar tu marca en el podio.`);
    } catch (e) {
      alert(`🎥 ¡Video MP4 descargado con éxito!\n\nAdjunta el archivo "${finalFileName}" en el grupo de WhatsApp para que el Admin valide tu posición.`);
    }
  } else {
    // Si no hubo video grabado o está vacío, compartir ficha de datos en texto
    window.cbShareTelemetry(km, pilot, code, bonusCoins);
  }
};

window.cbDownloadVideo = window.cbShareVideo;

function renderPelea(el, d) {
  if (typeof window.initPeleaNinja === 'function') {
    window.initPeleaNinja(el, d);
  } else {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;text-align:center;gap:16px;">
        <div style="font-size:3rem;animation:pulse 1.5s infinite;">⚔️</div>
        <h2 style="color:#fff;font-weight:900;letter-spacing:1px;">CYBER NINJA: DOHYŌ SLASH</h2>
        <p style="color:var(--text-dim);max-width:360px;">Cargando motor de combate 360° y sintetizador de audio...</p>
      </div>
    `;
    // Si pelea_ninja.js tarda un tick en registrarse
    const checkInterval = setInterval(() => {
      if (typeof window.initPeleaNinja === 'function') {
        clearInterval(checkInterval);
        window.initPeleaNinja(el, d);
      }
    }, 50);
    setTimeout(() => clearInterval(checkInterval), 3000);
  }
}


/* ═══════════════════════════════════════════════════════
   JUNTAS & PARTIDAS COMUNITARIAS
   ═══════════════════════════════════════════════════════ */

function renderJuntas(el, d) {
  const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
  const nick = isAuth ? window.AuthManager.getNick() : null;

  // ── Wrapper no-scroll exclusivo para Desktop (> 768px) ──────────────────
  if (window.innerWidth > 768) {
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.height = '100vh';
    el.style.overflow = 'hidden';
    el.style.padding = '0';
    el.style.boxSizing = 'border-box';
  } else {
    el.style.display = 'block';
    el.style.height = 'auto';
    el.style.maxHeight = 'none';
    el.style.overflow = 'visible';
    el.style.padding = '0';
    el.style.boxSizing = 'border-box';
  }

  el.innerHTML = `
    <!-- TOP BAR JUNTAS -->
    <div class="juntas-topbar">
      <div class="juntas-topbar-left">
        <span style="font-size:1.4rem;">🎲</span>
        <span class="juntas-topbar-title">Juntas &amp; Partidas</span>
        <span class="juntas-badge-live">EN VIVO</span>
      </div>
      <div class="juntas-topbar-right">
        ${isAuth
      ? `<button id="btn-proponer-junta" class="juntas-btn-proponer" onclick="juntasAbrirModalNueva()">
              ＋ Proponer Junta
             </button>`
      : `<button class="juntas-btn-login" onclick="AuthManager.showModal({ reason: 'Identifícate para proponer o anotarte en juntas.' })">
              🔐 Entrar
             </button>`
    }
      </div>
    </div>

    <!-- SUBTÍTULO -->
    <div class="juntas-subtitle">
      Partidas autogestionadas por la comunidad · Anótate con un click · Coordina por WhatsApp
    </div>

    <!-- LISTA SCROLLABLE -->
    <div id="juntas-list" class="juntas-list">
      <div class="juntas-loading">
        <div class="spinner" style="width:32px;height:32px;"></div>
        <span>Cargando mesas...</span>
      </div>
    </div>

    <!-- MODAL NUEVA JUNTA -->
    <div id="modal-nueva-junta" class="juntas-modal-overlay" style="display:none;" onclick="juntasCerrarModalNueva(event)">
      <div class="juntas-modal" onclick="event.stopPropagation()">
        <div class="juntas-modal-header">
          <span>🎲 Proponer Nueva Junta</span>
          <button class="juntas-modal-close" onclick="juntasCerrarModalNueva()">✕</button>
        </div>
        <div class="juntas-modal-body">
          <div class="juntas-form-group">
            <label>Juego *</label>
            <input id="junta-juego" type="text" placeholder="Ej: Catan, Terraforming Mars..." class="juntas-input" maxlength="80">
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div class="juntas-form-group">
              <label>Fecha *</label>
              <input id="junta-fecha" type="date" class="juntas-input" style="color-scheme:dark;">
            </div>
            <div class="juntas-form-group">
              <label>Hora</label>
              <input id="junta-hora" type="time" class="juntas-input" style="color-scheme:dark;">
            </div>
          </div>
          <div class="juntas-form-group">
            <label>Lugar / Dirección *</label>
            <input id="junta-lugar" type="text" placeholder="Ej: Casa de Juanito, calle X" class="juntas-input" maxlength="120">
          </div>
          <div class="juntas-form-group">
            <label>Comuna / Sector</label>
            <input id="junta-comuna" type="text" placeholder="Ej: Las Condes, Santiago Centro..." class="juntas-input" maxlength="60">
          </div>
          <div class="juntas-form-group">
            <label>Cupos totales (incluido tú)</label>
            <select id="junta-cupos" class="juntas-input juntas-select">
              ${[2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}"${n === 4 ? ' selected' : ''}>${n} jugadores</option>`).join('')}
            </select>
          </div>
          <div class="juntas-form-group">
            <label>WhatsApp de contacto <span style="font-size:0.7rem;color:var(--text-dim);font-weight:400;">(pre-llenado desde tu sesión)</span></label>
            <input id="junta-whatsapp" type="text" placeholder="+569 XXXX XXXX" class="juntas-input" maxlength="20" value="${(AuthManager.getUser() && AuthManager.getUser().phone) ? AuthManager.getUser().phone : ''}">
          </div>
          <div class="juntas-form-group">
            <label>Notas adicionales</label>
            <textarea id="junta-notas" placeholder="Traer fichas, llevar algo de tomar..." class="juntas-input juntas-textarea" maxlength="300"></textarea>
          </div>
          <div id="junta-form-error" class="juntas-form-error" style="display:none;"></div>
          <button id="btn-crear-junta" class="juntas-btn-submit" onclick="juntasCrear()">
            🎲 Publicar Mesa
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL TOAST -->
    <div id="juntas-toast" class="juntas-toast" style="display:none;"></div>
  `;

  // Cargar juntas desde la API
  juntasCargarLista(nick);
}

// ── Carga la lista desde /api/juntas con fallback resiliente a juntas.json ───
function juntasCargarLista(nick) {
  const container = document.getElementById('juntas-list');
  if (!container) return;

  fetch('/api/juntas?v=' + Date.now())
    .then(r => {
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      if (!r.ok || !ct.includes('application/json')) {
        // Fallback para servidor estático o GitHub Pages Jamstack
        return fetch('juntas.json?v=' + Date.now()).then(r2 => {
          if (!r2.ok) throw new Error('No se pudo obtener juntas.json');
          return r2.json();
        });
      }
      return r.json();
    })
    .then(data => {
      if (!data.ok) throw new Error(data.error || 'Error desconocido');
      juntasRenderLista(container, data.juntas || [], nick);
    })
    .catch(err => {
      // Reintento final de seguridad con juntas.json local
      fetch('juntas.json?v=' + Date.now())
        .then(r3 => r3.json())
        .then(data3 => {
          if (data3 && data3.ok) {
            juntasRenderLista(container, data3.juntas || [], nick);
          } else {
            throw new Error('Fallback vacío');
          }
        })
        .catch(() => {
          container.innerHTML = `
            <div class="juntas-empty">
              <div style="font-size:2.5rem;margin-bottom:8px;">⚠️</div>
              <div style="color:var(--text-dim)">No se pudo cargar las mesas.</div>
              <div style="font-size:0.75rem;color:var(--text-faint);margin-top:4px;">${err.message}</div>
              <button onclick="juntasCargarLista(window._juntasNick)" style="margin-top:12px;padding:8px 18px;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);border-radius:8px;color:var(--text);cursor:pointer;">🔄 Reintentar</button>
            </div>`;
        });
    });
  window._juntasNick = nick;
}

// ── Parser de fechas para ordenar cronológicamente ──────────────────────────
function juntasParseFecha(fechaStr, horaStr) {
  if (!fechaStr) return 9999999999999;
  const m = String(fechaStr).match(/(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
  let day = 1, month = 1, year = 2026;
  if (m) {
    day = parseInt(m[1], 10);
    month = parseInt(m[2], 10) - 1;
    if (m[3]) {
      year = parseInt(m[3], 10);
      if (year < 100) year += 2000;
    } else {
      year = 2026;
    }
  }
  let hour = 0, minute = 0;
  if (horaStr) {
    const hm = String(horaStr).match(/(\d{1,2}):(\d{2})/);
    if (hm) {
      hour = parseInt(hm[1], 10);
      minute = parseInt(hm[2], 10);
    }
  }
  return new Date(year, month, day, hour, minute).getTime();
}

// ── Renderiza las tarjetas de junta ──────────────────────────────────────────
function juntasRenderLista(container, juntas, nick) {
  if (!juntas.length) {
    container.innerHTML = `
      <div class="juntas-empty">
        <div style="font-size:2.8rem;margin-bottom:10px;filter:drop-shadow(0 0 14px rgba(124,58,237,0.4));">🎲</div>
        <div style="font-size:1.05rem;font-weight:700;color:var(--text);margin-bottom:6px;">No hay mesas activas</div>
        <div style="color:var(--text-dim);font-size:0.85rem;">¡Sé el primero en proponer una junta!</div>
      </div>`;
    return;
  }

  // Orden cronológico: desde la fecha más cercana a la más lejana
  const ordenadas = [...juntas].sort((a, b) => {
    return juntasParseFecha(a.fecha, a.hora) - juntasParseFecha(b.fecha, b.hora);
  });

  const abiertas = ordenadas.filter(j => j.estado === 'Abierta');
  const otras = ordenadas.filter(j => j.estado !== 'Abierta');

  let html = '';

  if (abiertas.length) {
    html += `<div class="juntas-section-label">🟢 Mesas Abiertas (${abiertas.length})</div>`;
    html += `<div class="juntas-grid">${abiertas.map(j => juntasCardHTML(j, nick)).join('')}</div>`;
  }

  if (otras.length) {
    html += `<div class="juntas-section-label" style="margin-top:16px;">⏸ Cerradas / Canceladas (${otras.length})</div>`;
    html += `<div class="juntas-grid">${otras.map(j => juntasCardHTML(j, nick)).join('')}</div>`;
  }

  container.innerHTML = html;
}

// ── Genera el HTML de una tarjeta de junta compacta ─────────────────────────
function juntasCardHTML(j, nick) {
  const abierta = j.estado === 'Abierta';
  const cancelada = j.estado === 'Cancelada';
  const completa = j.estado === 'Completada';
  const cuposUsados = (j.cupos_totales - j.cupos_disponibles);
  const yaAnotado = nick && j.anotados.some(a => a.nick.toLowerCase() === nick.toLowerCase());
  const esOrg = nick && j.organizador_nick.toLowerCase() === nick.toLowerCase();

  // Slots visuales compactos estilo chips
  const slotsHTML = Array.from({ length: j.cupos_totales }, (_, i) => {
    const anotado = j.anotados[i];
    if (anotado) {
      const isAnf = anotado.es_anfitrion;
      return `<div class="junta-slot junta-slot--ocupado" title="${escapeHtml(anotado.nick)}${isAnf ? ' (anfitrión)' : ''}">
        <span class="junta-slot-ico">${isAnf ? '👑' : '👤'}</span>
        <span class="junta-slot-nick">${escapeHtml(anotado.nick.length > 9 ? anotado.nick.slice(0, 8) + '…' : anotado.nick)}</span>
      </div>`;
    } else {
      return `<div class="junta-slot junta-slot--libre"><span class="junta-slot-ico" style="opacity:0.45;">🪑</span><span class="junta-slot-nick">libre</span></div>`;
    }
  }).join('');

  // Estado badge
  const estadoBadge = abierta
    ? `<span class="junta-badge junta-badge--abierta">🟢 Abierta</span>`
    : completa
      ? `<span class="junta-badge junta-badge--completa">🔴 Completa</span>`
      : `<span class="junta-badge junta-badge--cancelada">❌ Cancelada</span>`;

  // Botón de acción compacto
  let actionBtn = '';
  if (nick && abierta && !yaAnotado && !esOrg) {
    actionBtn = `<button class="junta-action-btn junta-action-btn--unirse" onclick="juntasUnirse(${j.id})">
      ＋ Anotarme
    </button>`;
  } else if (nick && yaAnotado && !esOrg) {
    actionBtn = `<button class="junta-action-btn junta-action-btn--bajarse" onclick="juntasBajarse(${j.id})">
      Bajarme
    </button>`;
  } else if (esOrg && !cancelada) {
    actionBtn = `<button class="junta-action-btn junta-action-btn--cancelar" onclick="juntasCancelar(${j.id})">
      🗑 Cancelar
    </button>`;
  } else if (!nick) {
    actionBtn = `<button class="junta-action-btn junta-action-btn--login" onclick="AuthManager.showModal({ reason: 'Identifícate para anotarte en mesas.' })">
      🔐 Entrar
    </button>`;
  }

  return `
    <div class="junta-card${cancelada ? ' junta-card--cancelada' : ''}${completa ? ' junta-card--completa' : ''}" id="junta-card-${j.id}">
      <div class="junta-card-header">
        <div class="junta-card-game">
          <span class="junta-game-icon">🎲</span>
          <span class="junta-game-name">${escapeHtml(j.juego)}</span>
        </div>
        ${estadoBadge}
      </div>

      <div class="junta-card-meta">
        <div class="junta-meta-row">
          <span class="junta-meta-item">
            <span class="junta-meta-icon">📅</span>
            <strong>${escapeHtml(j.fecha)}</strong>${j.hora ? ' · ' + escapeHtml(j.hora) : ''}
          </span>
          <span class="junta-meta-item">
            <span class="junta-meta-icon">📍</span>
            <span>${escapeHtml(j.lugar)}${j.comuna_sector ? ' (' + escapeHtml(j.comuna_sector) + ')' : ''}</span>
          </span>
        </div>
        ${j.descripcion_notas ? `
        <div class="junta-meta-item junta-meta-notas">
          <span class="junta-meta-icon">📝</span>
          <span>${escapeHtml(j.descripcion_notas)}</span>
        </div>` : ''}
      </div>

      <!-- Slots compactos -->
      <div class="junta-slots-wrapper">
        <div class="junta-slots-label">
          <span>Cupos</span>
          <span class="junta-cupos-counter">${cuposUsados}/${j.cupos_totales}</span>
        </div>
        <div class="junta-slots">${slotsHTML}</div>
      </div>

      <!-- Footer: org + WhatsApp + acción -->
      <div class="junta-card-footer">
        <div class="junta-org">
          <span style="opacity:0.6;font-size:0.68rem;">Organiza:</span>
          <span class="junta-org-nick">👑 ${escapeHtml(j.organizador_nick)}</span>
          ${j.organizador_whatsapp
      ? `<a href="https://wa.me/${j.organizador_whatsapp.replace(/\D/g, '').replace(/^0/, '56')}" target="_blank" class="junta-wa-link" title="Coordinar por WhatsApp">💬</a>`
      : ''}
        </div>
        ${actionBtn}
      </div>
    </div>`;
}

// ── Anotarse en una junta ─────────────────────────────────────────────────────
window.juntasUnirse = function (juntaId) {
  const nick = window.AuthManager && window.AuthManager.getNick();
  if (!nick) { AuthManager.showModal({ reason: 'Identifícate para anotarte.' }); return; }

  fetch('/api/juntas/unirse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ junta_id: juntaId, nick })
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        juntasToast('✅ ¡Te anotaste en la mesa!');
        juntasCargarLista(nick);
      } else {
        juntasToast('⚠️ ' + (res.error || 'No se pudo anotar'), true);
      }
    })
    .catch(() => juntasToast('❌ Error de red', true));
};

// ── Bajarse de una junta ──────────────────────────────────────────────────────
window.juntasBajarse = function (juntaId) {
  const nick = window.AuthManager && window.AuthManager.getNick();
  if (!nick) return;

  if (!confirm('¿Seguro que quieres bajarte de esta mesa?')) return;

  fetch('/api/juntas/bajarse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ junta_id: juntaId, nick })
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        juntasToast('👋 Te bajaste de la mesa');
        juntasCargarLista(nick);
      } else {
        juntasToast('⚠️ ' + (res.error || 'Error'), true);
      }
    })
    .catch(() => juntasToast('❌ Error de red', true));
};

// ── Cancelar una junta (solo organizador) ─────────────────────────────────────
window.juntasCancelar = function (juntaId) {
  const nick = window.AuthManager && window.AuthManager.getNick();
  if (!nick) return;

  if (!confirm('¿Seguro que quieres CANCELAR esta junta? Se notificará a todos los anotados.')) return;

  fetch('/api/juntas/cancelar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ junta_id: juntaId, nick })
  })
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        juntasToast('🗑 Junta cancelada');
        juntasCargarLista(nick);
      } else {
        juntasToast('⚠️ ' + (res.error || 'Error'), true);
      }
    })
    .catch(() => juntasToast('❌ Error de red', true));
};

// ── Abrir/cerrar modal de nueva junta ────────────────────────────────────────
window.juntasAbrirModalNueva = function () {
  const m = document.getElementById('modal-nueva-junta');
  if (m) { m.style.display = 'flex'; setTimeout(() => m.classList.add('juntas-modal-visible'), 10); }
};

window.juntasCerrarModalNueva = function (event) {
  if (event && event.target !== document.getElementById('modal-nueva-junta')) return;
  const m = document.getElementById('modal-nueva-junta');
  if (m) { m.classList.remove('juntas-modal-visible'); setTimeout(() => m.style.display = 'none', 200); }
};

// ── Crear nueva junta ─────────────────────────────────────────────────────────
window.juntasCrear = function () {
  const nick = window.AuthManager && window.AuthManager.getNick();
  if (!nick) return;

  const juego = document.getElementById('junta-juego').value.trim();
  const fechaRaw = document.getElementById('junta-fecha').value.trim(); // YYYY-MM-DD
  const hora = document.getElementById('junta-hora').value.trim();
  const lugar = document.getElementById('junta-lugar').value.trim();
  const comuna = document.getElementById('junta-comuna').value.trim();
  const cupos = parseInt(document.getElementById('junta-cupos').value);
  const wp = document.getElementById('junta-whatsapp').value.trim();
  const notas = document.getElementById('junta-notas').value.trim();
  const errEl = document.getElementById('junta-form-error');

  if (!juego || !fechaRaw || !lugar) {
    errEl.textContent = '⚠️ Juego, fecha y lugar son obligatorios.';
    errEl.style.display = 'block';
    return;
  }

  // Convertir YYYY-MM-DD a formato legible "Lunes 22/10"
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dtParts = fechaRaw.split('-');
  const dtObj = new Date(parseInt(dtParts[0]), parseInt(dtParts[1]) - 1, parseInt(dtParts[2]));
  const diaNombre = diasSemana[dtObj.getDay()];
  const fecha = `${diaNombre} ${dtParts[2]}/${dtParts[1]}`;
  errEl.style.display = 'none';

  const btn = document.getElementById('btn-crear-junta');
  if (btn) btn.disabled = true;

  fetch('/api/juntas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      juego, fecha, hora, lugar,
      comuna_sector: comuna,
      cupos_totales: cupos,
      organizador_nick: nick,
      organizador_whatsapp: wp,
      descripcion_notas: notas
    })
  })
    .then(r => r.json())
    .then(res => {
      if (btn) btn.disabled = false;
      if (res.ok) {
        // Cerrar modal sin esperar evento
        const m = document.getElementById('modal-nueva-junta');
        if (m) { m.classList.remove('juntas-modal-visible'); m.style.display = 'none'; }
        juntasToast('🎲 ¡Mesa publicada! Ya estás anotado como anfitrión.');
        juntasCargarLista(nick);
      } else {
        if (errEl) { errEl.textContent = '⚠️ ' + (res.error || 'Error al crear'); errEl.style.display = 'block'; }
      }
    })
    .catch(() => {
      if (btn) btn.disabled = false;
      if (errEl) { errEl.textContent = '❌ Error de red. ¿El servidor está activo?'; errEl.style.display = 'block'; }
    });
};

// ── Toast de feedback ─────────────────────────────────────────────────────────
function juntasToast(msg, isError = false) {
  const t = document.getElementById('juntas-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  t.style.background = isError ? 'rgba(239,68,68,0.9)' : 'rgba(16,185,129,0.9)';
  t.classList.add('juntas-toast-visible');
  setTimeout(() => { t.classList.remove('juntas-toast-visible'); setTimeout(() => t.style.display = 'none', 300); }, 3000);
}

