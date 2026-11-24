/* === Amigos Jugones — rankings.js === */
// Extraído de main.js

// ─── DATOS DEMO (se sobreescriben si llegan datos reales desde datos.json) ─────
const DEMO_RANKING_MAIN = [
  { nombre: 'El Matagigantes', puntos: 487, avatar: '🧙', tendencia: '▲' },
  { nombre: 'Comandante Yuki', puntos: 421, avatar: '🦊', tendencia: '▲' },
  { nombre: 'Lord Cachas', puntos: 398, avatar: '🐉', tendencia: '▼' },
  { nombre: 'Nyx la Errante', puntos: 355, avatar: '🌙', tendencia: '▲' },
  { nombre: 'El Crusher', puntos: 312, avatar: '🔨', tendencia: '─' },
  { nombre: 'Kira Stormborn', puntos: 278, avatar: '⚡', tendencia: '▲' },
  { nombre: 'Darth Pollito', puntos: 241, avatar: '🐥', tendencia: '▼' },
  { nombre: 'Max Lannister', puntos: 199, avatar: '🦁', tendencia: '▼' },
];
const DEMO_RANKING_RACE = [
  { nombre: 'Turbo Yuki', puntos: 2800, avatar: '🏎️', tendencia: '▲', monedas: 310 },
  { nombre: 'El Matagigantes', puntos: 2450, avatar: '🧙', tendencia: '▲', monedas: 280 },
  { nombre: 'Kira Stormborn', puntos: 1980, avatar: '⚡', tendencia: '▲', monedas: 200 },
  { nombre: 'Lord Cachas', puntos: 1740, avatar: '🐉', tendencia: '▼', monedas: 150 },
  { nombre: 'El Crusher', puntos: 1520, avatar: '🔨', tendencia: '─', monedas: 120 },
];
const DEMO_RANKING_FIGHT = [
  { nombre: 'Lord Cachas', puntos: 940, avatar: '🐉', ratio: '8V/2D' },
  { nombre: 'Darth Pollito', puntos: 820, avatar: '🐥', ratio: '7V/3D' },
  { nombre: 'Max Lannister', puntos: 760, avatar: '🦁', ratio: '6V/4D' },
  { nombre: 'Nyx la Errante', puntos: 680, avatar: '🌙', ratio: '5V/5D' },
  { nombre: 'El Crusher', puntos: 590, avatar: '🔨', ratio: '5V/5D' },
];

// ─── CARGA DE RANKING DESDE BASE DE DATOS SQLITE (ranking.json) ────────────
// Desacoplado al 100% de Google Apps Script: los datos se leen directamente
// desde ranking.json generado por database/gestor_db.py a partir de amigos_jugones.db.

function buildRankRows(list, medals, extraFn, myNick) {
  var normMyNick = (myNick || '').toLowerCase().trim();
  return list.slice(0, 8).map(function (r, i) {
    var nombre = r.nombre || r.pilot || '';
    var isMe = normMyNick && nombre.toLowerCase().trim() === normMyNick;
    var trendColor = r.tendencia === '▲' ? '#4ade80' : r.tendencia === '▼' ? '#f87171' : '#94a3b8';
    var extra = extraFn ? extraFn(r) : '';
    var pctW = Math.round((r.puntos / (list[0].puntos || 1)) * 100);
    var rowBg = isMe
      ? 'background:linear-gradient(90deg,rgba(124,58,237,0.28) 0%,rgba(236,72,153,0.1) 100%);border-left:3px solid var(--primary);padding-left:5px;border-radius:4px;'
      : '';
    var barColor = isMe ? 'linear-gradient(90deg,var(--primary),#ec4899)' : 'linear-gradient(90deg,var(--primary),var(--accent))';
    var medal = medals[i] || ((i + 1) + '°');
    return '<div class="ranking-row-item" style="flex-direction:column;gap:4px;' + rowBg + '">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">' +
      '<span style="display:flex;align-items:center;gap:5px;">' +
      '<span style="font-size:0.95rem;">' + medal + '</span>' +
      '<span style="font-size:0.85rem;">' + (r.avatar || '👤') + '</span>' +
      '<span class="truncate" style="font-size:0.88rem;font-weight:700;max-width:115px;">' + escapeHtml(nombre) + '</span>' +
      (r.tendencia ? '<span style="font-size:0.75rem;color:' + trendColor + ';font-weight:800;">' + r.tendencia + '</span>' : '') +
      (isMe ? '<span style="font-size:0.6rem;font-weight:800;background:var(--primary);color:#fff;padding:1px 4px;border-radius:3px;letter-spacing:0.3px;flex-shrink:0;">TÚ</span>' : '') +
      '</span>' +
      '<span class="badge badge-purple" style="font-size:0.75rem;padding:2px 7px;' + (isMe ? 'background:rgba(124,58,237,0.5);border-color:var(--primary);' : '') + '">' + r.puntos + ' pts</span>' +
      '</div>' +
      '<div style="width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">' +
      '<div style="height:4px;width:' + pctW + '%;background:' + barColor + ';border-radius:2px;"></div>' +
      '</div>' +
      extra +
      '</div>';
  }).join('');
}

function renderHomeTriptychRankings(rankingArg) {
  // Datos del usuario autenticado
  var myNick = (window.AuthManager && window.AuthManager.isAuthenticated()) ? window.AuthManager.getNick() : null;
  var myPts = (window.AuthManager && window.AuthManager.isAuthenticated()) ? window.AuthManager.getPoints() : 0;

  // 1. Construir lista principal directamente desde ranking.json (SQLite)
  var mainList = [];
  if (App.data && Array.isArray(App.data.ranking_principal) && App.data.ranking_principal.length > 0) {
    mainList = App.data.ranking_principal.map(function (r) {
      var itemNick = r.nick || r.nombre || '—';
      return Object.assign({ avatar: '👤', tendencia: '─' }, r, { nombre: itemNick, nick: itemNick });
    });
  } else if (rankingArg && rankingArg.length > 0) {
    mainList = rankingArg.map(function (r) {
      var itemNick = r.nick || r.nombre || '—';
      return Object.assign({ avatar: '👤', tendencia: '─' }, r, { nombre: itemNick, nick: itemNick });
    });
  } else if (myNick) {
    mainList = [{ nombre: myNick, nick: myNick, puntos: myPts, avatar: '⚡', tendencia: '─' }];
  } else {
    mainList = DEMO_RANKING_MAIN.slice();
  }

  // 2. SINCRONIZACIÓN ATÓMICA CON EL SALDO REAL DEL USUARIO AUTENTICADO
  if (myNick) {
    var foundIndex = -1;
    for (var i = 0; i < mainList.length; i++) {
      var entryIdent = (mainList[i].nick || mainList[i].nombre || '').toLowerCase().trim();
      if (entryIdent === myNick.toLowerCase().trim()) {
        foundIndex = i;
        break;
      }
    }
    if (foundIndex >= 0) {
      mainList[foundIndex].puntos = myPts;
    } else {
      mainList.push({ nombre: myNick, nick: myNick, puntos: myPts, avatar: '⚡', tendencia: '─' });
    }
    mainList.sort(function (a, b) { return b.puntos - a.puntos; });
  }

  var medals8 = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  var champion = mainList[0] || { nombre: '—', puntos: 0, avatar: '👑' };
  var pctMeta = Math.min(100, Math.round((champion.puntos / 1000) * 100));

  // 3. Podio Carrera (sincronizado desde SQLite / ranking.json)
  var carreraList;
  if (App.data && Array.isArray(App.data.podio_carrera) && App.data.podio_carrera.length > 0) {
    carreraList = App.data.podio_carrera.map(function (r) {
      return { nombre: r.pilot, puntos: r.km, avatar: r.car || '🏎️', tendencia: '─', _extra: r.rent };
    });
  } else {
    carreraList = DEMO_RANKING_RACE.map(function (r) {
      return { nombre: r.nombre, puntos: r.puntos, avatar: r.avatar || '🏎️', tendencia: r.tendencia || '─', _extra: (r.monedas || 0) + ' 🪙 invertidas' };
    });
  }

  // 4. Podio Pelea (sincronizado desde SQLite / ranking.json)
  var peleaList;
  if (App.data && Array.isArray(App.data.podio_pelea) && App.data.podio_pelea.length > 0) {
    peleaList = App.data.podio_pelea.map(function (r) {
      return { nombre: r.pilot, puntos: r.score, avatar: '⚔️', tendencia: '─', _extra: r.rent };
    });
  } else {
    peleaList = DEMO_RANKING_FIGHT.map(function (r) {
      return { nombre: r.nombre, puntos: r.puntos, avatar: r.avatar || '⚔️', tendencia: r.tendencia || '─', _extra: r.ratio || '' };
    });
  }

  var rowsMain = buildRankRows(mainList, medals8, null, myNick);
  var rowsRace = buildRankRows(carreraList, medals8, function (r) {
    return r._extra ? '<div style="font-size:0.72rem;color:var(--gold);text-align:right;margin-top:1px;">' + escapeHtml(r._extra) + '</div>' : '';
  }, myNick);
  var rowsFight = buildRankRows(peleaList, medals8, function (r) {
    return r._extra ? '<div style="font-size:0.72rem;color:var(--cyan);text-align:right;margin-top:1px;">' + escapeHtml(r._extra) + '</div>' : '';
  }, myNick);

  var dataSource = '<span id="rt-data-indicator" style="font-size:0.62rem;color:#4ade80;opacity:0.9;" title="Base de Datos SQLite activa y sincronizada">● SQLite</span>';

  return `
    <div class="home-col-rankings">
      <div class="triptych-container">
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-shrink:0;">
          <div style="font-size:0.92rem;font-weight:800;text-transform:uppercase;color:var(--gold);letter-spacing:.5px;">🏆 Rankings</div>
          ${dataSource}
        </div>
        <!-- Tabs -->
        <div style="display:flex;gap:4px;margin-bottom:10px;flex-shrink:0;">
          <button class="triptych-tab-btn active" id="rt-btn-main"  onclick="switchRankTab('main')"  style="font-size:0.8rem;">🏆 Principal</button>
          <button class="triptych-tab-btn"        id="rt-btn-race"  onclick="switchRankTab('race')"  style="font-size:0.8rem;">🏎️ Carrera</button>
          <button class="triptych-tab-btn"        id="rt-btn-fight" onclick="switchRankTab('fight')" style="font-size:0.8rem;">⚔️ Pelea</button>
        </div>
        <!-- Líder badge -->
        <div class="ranking-leader-badge" style="flex-shrink:0;">
          <div style="font-size:1.8rem;">${champion.avatar || '👑'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.75rem;color:var(--gold);text-transform:uppercase;font-weight:700;letter-spacing:.5px;">Líder Temporada · Meta 1000 PTS</div>
            <div style="font-size:1.15rem;font-weight:800;color:#fff;">${escapeHtml(champion.nombre)}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
              <div style="flex:1;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
                <div style="height:6px;width:${pctMeta}%;background:linear-gradient(90deg,#f5c518,#ec4899);border-radius:3px;"></div>
              </div>
              <span style="font-size:0.75rem;color:var(--gold);font-weight:700;">${champion.puntos} / 1000</span>
            </div>
          </div>
        </div>
        <!-- Panels -->
        <div id="rt-panel-main"  style="flex:1;min-height:0;overflow-y:auto;" class="custom-scrollbar-mini">${rowsMain}</div>
        <div id="rt-panel-race"  style="display:none;flex:1;min-height:0;overflow-y:auto;" class="custom-scrollbar-mini">${rowsRace}</div>
        <div id="rt-panel-fight" style="display:none;flex:1;min-height:0;overflow-y:auto;" class="custom-scrollbar-mini">${rowsFight}</div>
        <!-- Footer -->
        <div style="margin-top:auto;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);flex-shrink:0;">
          <button onclick="renderSection('eventos')" class="btn btn-ghost" style="display:flex;justify-content:center;width:100%;padding:8px;font-size:0.82rem;text-transform:uppercase;font-weight:700;">Ver Eventos ❯</button>
        </div>
      </div>
    </div>
  `;
}




// ─── BANCO DE TRIVIA (juegos de mesa) ────────────────────────────────────────
const TRIVIA_BANK = [
  { pregunta: '¿Cuántos jugadores puede tener Pandemic simultáneamente?', opciones: ['2', '4 ✓', '6', '8'], correcto: 1, link: 'encuestas.html' },
  { pregunta: '¿Cuántos recursos necesitas para construir una ciudad en Catan?', opciones: ['2T+3M', '3T+2M', '2T+2G ✓', '1T+3G'], correcto: 2, link: 'encuestas.html' },
  { pregunta: '¿Qué juego usa dados de ataque y dados de defensa en Catan?', opciones: ['Agricola', 'Carcassonne', 'Catan ✓', 'Wingspan'], correcto: 2, link: 'encuestas.html' },
  { pregunta: '¿En Wingspan, ¿cuántos huevos tiene la capacidad máxima de una bandeja de 5 espacios?', opciones: ['3', '4', '5 ✓', '6'], correcto: 2, link: 'encuestas.html' },
  { pregunta: '¿Cuántas cartas de desarrollo se roban al inicio en 7 Wonders?', opciones: ['5', '6', '7 ✓', '8'], correcto: 2, link: 'encuestas.html' },
  { pregunta: '¿Qué recurso produce el bosque en Terraforming Mars?', opciones: ['Titanio', 'Acero', 'Plantas ✓', 'Energía'], correcto: 2, link: 'encuestas.html' },
  { pregunta: '¿En Carcassonne, ¿qué obtienes al completar una catedral?', opciones: ['0 pts', '2 pts extra', '3 pts extra ✓', '1 meeple'], correcto: 2, link: 'encuestas.html' },
  { pregunta: '¿Cuántos jugadores admite Gloomhaven en su modo base?', opciones: ['2', '4 ✓', '6', '8'], correcto: 1, link: 'encuestas.html' },
  { pregunta: '¿Qué tipo de juego es Azul (Azul)?', opciones: ['Wargame', 'Eurogame Abstracto ✓', 'RPG', 'Filler'], correcto: 1, link: 'encuestas.html' },
  { pregunta: '¿Cuántas fases tiene una ronda en Agricola?', opciones: ['3', '4', '5', '6 ✓'], correcto: 3, link: 'encuestas.html' },
];

// ─── FALLBACK DE NOVEDADES (si no hay datos reales) ───────────────────────────
const FEED_NOVEDADES_FALLBACK = [
  { icon: '💣', tag: 'arcade', color: 'var(--accent)', texto: 'Darth Pollito ejecutó un Caparazón Azul. Lord Cachas y El Crusher perdieron 5 PTS.' },
  { icon: '🏆', tag: 'arcade', color: 'var(--gold)', texto: 'El Matagigantes completó los 7 desafíos del día. +5 PTS acreditados.' },
  { icon: '🏎️', tag: 'arcade', color: '#facc15', texto: 'Nueva Carrera disponible. Top 3 recibirá renta pasiva de +2 PTS/día.' },
  { icon: '⚔️', tag: 'arcade', color: '#a78bfa', texto: 'Lord Cachas vs. El Crusher en Dohyō — Lord Cachas ganó con ratio 8V/2D.' },
  { icon: '🎯', tag: 'encuesta', color: 'var(--primary-light)', texto: 'Trivia Artesanal de Kira Stormborn activa en el grupo. ¡Respóndela antes de las 23:59!' },
  { icon: '🌟', tag: 'evento', color: '#34d399', texto: 'Nyx la Errante es el Miembro Destacado de la semana por su constancia.' },
  { icon: '🛒', tag: 'mercado', color: 'var(--accent)', texto: 'Nuevo ítem en el Mercado: Wingspan + Exp. Europea. Intercambio por Gloomhaven.' },
  { icon: '📅', tag: 'evento', color: 'var(--primary-light)', texto: 'Próxima partida grupal: Sáb 12/Oct · 15:00 hs · Terraforming Mars.' },
];

const FEED_LOGROS = [
  { avatar: '🧙', nombre: 'El Matagigantes', logro: 'Racha de 7 días', pts: '+35', color: '#f5c518' },
  { avatar: '🦊', nombre: 'Comandante Yuki', logro: 'Primer Contraataque', pts: '−5★', color: '#f87171' },
  { avatar: '🐉', nombre: 'Lord Cachas', logro: 'Rey del Dohyō', pts: '+10', color: '#a78bfa' },
  { avatar: '🌙', nombre: 'Nyx la Errante', logro: 'Miembro Destacado', pts: '+3', color: '#34d399' },
  { avatar: '⚡', nombre: 'Kira Stormborn', logro: 'Trivia Artesanal', pts: '+3', color: '#60a5fa' },
];

// ─── GENERADOR DE ACTIVIDADES EN VIVO ─────────────────────────────────────────
function generateLiveActivities(d) {
  var pool = [];

  // ── Torneos activos ──
  var torneos = (d && d.torneos && Array.isArray(d.torneos.activos)) ? d.torneos.activos : [];
  torneos.forEach(function (t) {
    var inscritosLabel = t.inscritos_count ? t.inscritos_count + '/' + (t.cupos_max || '?') + ' inscriptos' : '';
    pool.push({
      icon: '🏆', tag: 'torneo', link: 'torneos.html',
      color: '#fbbf24',
      texto: 'Torneo «' + (t.juego || t.titulo) + '» · ' + (t.estado_label || t.estado || 'Activo') + (inscritosLabel ? ' · ' + inscritosLabel : '') + (t.fecha_display ? ' · ' + t.fecha_display : ''),
    });
  });

  // ── Rincón de la fama ──
  var fama = (d && d.torneos && Array.isArray(d.torneos.rincon_fama)) ? d.torneos.rincon_fama : [];
  fama.forEach(function (f) {
    pool.push({
      icon: '🥇', tag: 'torneo', link: 'torneos.html',
      color: '#fde68a',
      texto: '🏅 Campeón de «' + f.juego + '»: ' + (f.oro && f.oro.nick ? f.oro.nick : '?') + ' en ' + (f.torneo_titulo || f.juego) + (f.fecha ? ' · ' + f.fecha : ''),
    });
  });

  // ── Instagram / Novedades ──
  var igPosts = Array.isArray(d && d.instagram) ? d.instagram : [];
  igPosts.forEach(function (p) {
    pool.push({
      icon: '📸', tag: 'ig', link: 'instagram.html',
      color: '#f472b6',
      texto: '📷 ' + escapeHtml(p.nick || '') + ' publicó: «' + escapeHtml(p.titulo || '') + '»' + (p.categoria ? ' · ' + p.categoria : ''),
    });
  });

  // ── Mercado ──
  var mercadoAll = [];
  if (d && d.mercado && typeof d.mercado === 'object') {
    ['vender', 'intercambiar', 'regalar', 'buscar', 'ensenar', 'servicios'].forEach(function (cat) {
      if (Array.isArray(d.mercado[cat])) d.mercado[cat].forEach(function (p) {
        mercadoAll.push({ item: p, cat: cat });
      });
    });
  }
  mercadoAll.slice(0, 5).forEach(function (m) {
    var catLabels = { vender: 'VENTA', intercambiar: 'INTERCAMBIO', regalar: 'REGALO', buscar: 'BUSCO', ensenar: 'ENSEÑANZA', servicios: 'SERVICIO' };
    pool.push({
      icon: '🛒', tag: 'mercado', link: 'mercado.html',
      color: '#c084fc',
      texto: '[' + (catLabels[m.cat] || m.cat.toUpperCase()) + '] ' + escapeHtml((m.item.titulo || m.item.nombre) || 'ítem disponible') + (m.item.precio ? ' · ' + escapeHtml(m.item.precio) : '') + (m.item.nick ? ' — ' + escapeHtml(m.item.nick) : ''),
    });
  });

  // ── Radar: jugadores disponibles hoy ──
  var DIAS_KEY = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  var todayKey = DIAS_KEY[new Date().getDay()];
  var jugadores = (d && d.radar && d.radar.jugadores) ? d.radar.jugadores : [];
  var disponibles = jugadores.filter(function (j) {
    var h = ((j.disponibilidad && j.disponibilidad[todayKey] && j.disponibilidad[todayKey].horario) || '').toLowerCase();
    return h && !h.includes('no tengo') && !h.includes('sin disponibilidad');
  });
  if (disponibles.length > 0) {
    pool.push({
      icon: '📡', tag: 'radar', link: 'radar.html',
      color: '#22d3ee',
      texto: disponibles.length + ' jugador' + (disponibles.length > 1 ? 'es disponibles' : ' disponible') + ' hoy · ' + disponibles.slice(0, 3).map(function (j) { return j.nick; }).join(', ') + (disponibles.length > 3 ? ' y más…' : ''),
    });
    disponibles.slice(0, 3).forEach(function (j) {
      pool.push({
        icon: '🎮', tag: 'radar', link: 'radar.html',
        color: '#22d3ee',
        texto: escapeHtml(j.nick) + ' está disponible hoy' + (j.favoritos ? ' · Favoritos: ' + escapeHtml(j.favoritos.split(',')[0].trim()) : '') + (j.zona ? ' · ' + escapeHtml(j.zona) : ''),
      });
    });
  }

  // ── Encuestas activas ──
  var encuestas = (d && d.encuestas && Array.isArray(d.encuestas.encuestas_activas)) ? d.encuestas.encuestas_activas : [];
  encuestas.slice(0, 3).forEach(function (e) {
    pool.push({
      icon: '📊', tag: 'encuesta', link: 'encuestas.html',
      color: '#34d399',
      texto: 'Encuesta activa: «' + escapeHtml(e.nombre_item || e.categoria || 'Votación') + '»' + (e.total_votos ? ' · ' + e.total_votos + ' votos' : ' · ¡Vota ahora!') + (e.fecha_fin ? ' · Cierra ' + e.fecha_fin.split(' ')[0] : ''),
    });
  });

  // ── Eventos destacados ──
  var eventos = Array.isArray(d && d.eventos_destacados) ? d.eventos_destacados : [];
  eventos.slice(0, 3).forEach(function (e) {
    pool.push({
      icon: '📅', tag: 'evento', link: 'eventos.html',
      color: '#60a5fa',
      texto: '🗓️ Próximo evento: «' + escapeHtml(e.titulo || e.nombre || 'Evento') + '»' + (e.fecha ? ' · ' + escapeHtml(e.fecha) : '') + (e.hora ? ' · ' + escapeHtml(e.hora) : ''),
    });
  });

  // ── Fallback si pool vacío ──
  if (pool.length < 4) {
    FEED_NOVEDADES_FALLBACK.forEach(function (n) { pool.push(n); });
  }

  // Mezclar aleatoriamente
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  return pool;
}

// ─── RENDER DE UNA FILA DE ACTIVIDAD ─────────────────────────────────────────
function renderActivityRow(item) {
  var tagColors = {
    torneo: 'tag-torneo',
    ig: 'tag-ig',
    mercado: 'tag-mercado',
    radar: 'tag-radar',
    evento: 'tag-evento',
    encuesta: 'tag-encuesta',
    arcade: 'tag-arcade',
  };
  var tagLabels = {
    torneo: 'TORNEO',
    ig: 'INSTAGRAM',
    mercado: 'MERCADO',
    radar: 'RADAR',
    evento: 'EVENTO',
    encuesta: 'ENCUESTA',
    arcade: 'ARCADE',
  };
  var tagCls = tagColors[item.tag] || 'tag-arcade';
  var tagLbl = tagLabels[item.tag] || (item.tag || 'INFO').toUpperCase();
  var href = item.link ? ' href="' + item.link + '"' : '';
  var el = item.link ? 'a' : 'div';
  return '<' + el + ' class="feed-activity-row anim-enter"' + href + '>' +
    '<span style="font-size:1.2rem;flex-shrink:0;margin-top:1px;">' + item.icon + '</span>' +
    '<div style="flex:1;min-width:0;">' +
    '<div style="font-size:0.83rem;color:var(--text-dim);line-height:1.4;">' +
    '<span class="feed-activity-tag ' + tagCls + '">' + tagLbl + '</span>' +
    item.texto +
    '</div>' +
    '</div>' +
    '</' + el + '>';
}

// ─── ROTADOR EN VIVO ──────────────────────────────────────────────────────────
var _liveRotatorTimer = null;
var _livePool = [];
var _livePoolIdx = 0;

function startLiveActivityRotator(pool) {
  if (_liveRotatorTimer) clearInterval(_liveRotatorTimer);
  _livePool = pool || _livePool;
  _livePoolIdx = 4; // ya mostramos los primeros 4

  _liveRotatorTimer = setInterval(function () {
    var container = document.getElementById('live-activity-stream');
    if (!container) { clearInterval(_liveRotatorTimer); return; }

    if (_livePoolIdx >= _livePool.length) _livePoolIdx = 0;
    var nextItem = _livePool[_livePoolIdx++];
    if (!nextItem) return;

    // Crear el nuevo elemento
    var div = document.createElement('div');
    div.innerHTML = renderActivityRow(nextItem);
    var newRow = div.firstElementChild;
    if (!newRow) return;

    // Prepend con animación
    container.insertBefore(newRow, container.firstChild);

    // Quitar .anim-enter para que no re-anime después de la primera vez
    setTimeout(function () { newRow.classList.remove('anim-enter'); }, 600);

    // Limitar el stream a máximo 7 filas
    while (container.children.length > 7) {
      var last = container.lastElementChild;
      if (last) {
        last.style.transition = 'opacity 0.3s, transform 0.3s';
        last.style.opacity = '0';
        last.style.transform = 'translateX(20px)';
        setTimeout(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); }(last), 350);
      }
    }

    // Hacer pulsar el badge "En vivo"
    var liveBadge = document.getElementById('feed-live-badge');
    if (liveBadge) {
      liveBadge.style.transform = 'scale(1.15)';
      setTimeout(function () { liveBadge.style.transform = ''; }, 250);
    }
  }, 5000);
}

