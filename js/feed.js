/* === Amigos Jugones — feed.js === */
// Extraído de main.js

function renderCommunityFeed(d) {
  // Generar pool de actividades desde datos reales
  var livePool = generateLiveActivities(d);

  // ── Primeros 4 items del stream ──
  var initialItems = livePool.slice(0, 4);
  var streamHtml = initialItems.map(renderActivityRow).join('');

  // ── Trivia aleatoria del banco ──
  var trivia = TRIVIA_BANK[Math.floor(Math.random() * TRIVIA_BANK.length)];
  var triviaOpcionesHtml = trivia.opciones.map(function (op, i) {
    var isCorr = i === trivia.correcto;
    return '<span style="font-size:0.76rem;' +
      (isCorr
        ? 'background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);color:#4ade80;font-weight:700;'
        : 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;') +
      'border-radius:4px;padding:3px 8px;">' + op + '</span>';
  }).join('');
  var triviaHtml = '<a class="feed-card-item" href="' + (trivia.link || 'encuestas.html') + '" style="border-left:3px solid rgba(124,58,237,0.5);text-decoration:none;background:rgba(124,58,237,0.08);">' +
    '<div style="font-size:0.85rem;font-weight:800;color:var(--primary-light);margin-bottom:5px;">🎯 Trivia Activa</div>' +
    '<div style="font-size:0.84rem;color:var(--text-dim);line-height:1.35;margin-bottom:8px;">' + trivia.pregunta + '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;">' + triviaOpcionesHtml + '</div>' +
    '</a>';

  // ── Radar Jugón Hoy ──
  var DIAS_KEY2 = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  var todayKey2 = DIAS_KEY2[new Date().getDay()];
  var jugadores = (d && d.radar && d.radar.jugadores) ? d.radar.jugadores : [];
  var disponibles = jugadores.filter(function (j) {
    var h = ((j.disponibilidad && j.disponibilidad[todayKey2] && j.disponibilidad[todayKey2].horario) || '').toLowerCase();
    return h && !h.includes('no tengo') && !h.includes('sin disponibilidad');
  });
  var radarCount = disponibles.length > 0 ? disponibles.length : Math.floor(Math.random() * 5) + 2;
  var radarHtml = '<a class="feed-card-item" href="radar.html" style="border-left:3px solid var(--cyan);text-decoration:none;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<span style="font-size:1.15rem;">📡</span>' +
    '<div>' +
    '<div style="font-size:0.86rem;font-weight:800;color:var(--cyan);">Radar Jugón Hoy</div>' +
    '<div style="font-size:0.78rem;color:var(--text-dim);">' + radarCount + ' jugador' + (radarCount > 1 ? 'es' : '') + ' disponible' + (radarCount > 1 ? 's' : '') + ' hoy</div>' +
    '</div>' +
    '</div>' +
    '<span class="badge" style="font-size:0.74rem;background:rgba(6,182,212,0.15);border-color:rgba(6,182,212,0.4);color:var(--cyan);padding:3px 8px;">Ver ❯</span>' +
    '</div>' +
    '</a>';

  // ── Torneo destacado ──
  var torneos = (d && d.torneos && Array.isArray(d.torneos.activos) && d.torneos.activos.length > 0) ? d.torneos.activos : null;
  var torneoDestacado = torneos ? getRandomItem(torneos) : null;
  var torneoHtml = '';
  if (torneoDestacado) {
    torneoHtml = '<a class="feed-card-item" href="torneos.html" style="border-left:3px solid #fbbf24;text-decoration:none;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
      '<span style="font-size:1.15rem;">🏆</span>' +
      '<div style="min-width:0;">' +
      '<div style="font-size:0.86rem;font-weight:800;color:#fbbf24;">Torneo Activo</div>' +
      '<div class="truncate" style="font-size:0.78rem;color:var(--text-dim);">' + escapeHtml(torneoDestacado.titulo || torneoDestacado.juego) + '</div>' +
      '</div>' +
      '</div>' +
      '<span class="badge" style="font-size:0.72rem;background:rgba(245,158,11,0.15);border-color:rgba(245,158,11,0.4);color:#fde68a;padding:2px 7px;">' + (torneoDestacado.inscritos_count || '?') + '/' + (torneoDestacado.cupos_max || '?') + '</span>' +
      '</div>' +
      '<div style="font-size:0.76rem;color:var(--text-faint);margin-top:4px;margin-left:30px;">' + escapeHtml(torneoDestacado.fecha_display || torneoDestacado.estado_label || '') + '</div>' +
      '</a>';
  }

  // ── Mercado Jugón ──
  var mercadoAll = [];
  if (d && d.mercado && typeof d.mercado === 'object') {
    ['vender', 'intercambiar', 'regalar', 'buscar', 'ensenar', 'servicios'].forEach(function (cat) {
      if (Array.isArray(d.mercado[cat])) d.mercado[cat].forEach(function (p) { mercadoAll.push(p); });
    });
  }
  var mercadoDemoItems = [
    { titulo: 'Wingspan + Exp. Europea', tipo: 'INTERCAMBIO', precio: 'Por Gloomhaven' },
    { titulo: 'Catan Base (impecable)', tipo: 'VENTA', precio: '$8.500 CLP' },
    { titulo: 'Clase de estrategia', tipo: 'SERVICIO', precio: '2 partidas demo' },
  ];
  var prodActual = getRandomItem(mercadoAll) || getRandomItem(mercadoDemoItems);
  var prodTipo = (prodActual && prodActual.tipo) ? prodActual.tipo : 'DISPONIBLE';
  var mercadoHtml = '<a class="feed-card-item" href="mercado.html" style="border-left:3px solid var(--accent);text-decoration:none;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;">' +
    '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
    '<span style="font-size:1.15rem;">🛒</span>' +
    '<div style="min-width:0;">' +
    '<div style="font-size:0.86rem;font-weight:800;color:var(--accent);">Mercado Jugón</div>' +
    '<div class="truncate" style="font-size:0.78rem;color:var(--text-dim);">' + escapeHtml((prodActual && (prodActual.titulo || prodActual.nombre)) || 'Explora el mercado') + '</div>' +
    '</div>' +
    '</div>' +
    '<span class="badge" style="font-size:0.72rem;background:rgba(236,72,153,0.15);border-color:rgba(236,72,153,0.4);color:#f9a8d4;padding:2px 7px;">' + prodTipo + '</span>' +
    '</div>' +
    (prodActual && prodActual.precio ? '<div style="font-size:0.78rem;color:var(--gold);font-weight:700;margin-top:4px;margin-left:30px;">' + escapeHtml(prodActual.precio) + '</div>' : '') +
    '</a>';

  // ── Encuesta activa aleatoria ──
  var encuestaActual = getRandomItem((d && d.encuestas && Array.isArray(d.encuestas.encuestas_activas)) ? d.encuestas.encuestas_activas : []);
  var encuestaHtml = '';
  if (encuestaActual) {
    encuestaHtml = '<a class="feed-card-item" href="encuestas.html" style="border-left:3px solid #34d399;text-decoration:none;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<span style="font-size:1.15rem;">📊</span>' +
      '<div style="min-width:0;">' +
      '<div style="font-size:0.86rem;font-weight:800;color:#34d399;">Encuesta Activa</div>' +
      '<div class="truncate" style="font-size:0.78rem;color:var(--text-dim);">' + escapeHtml(encuestaActual.nombre_item || 'Vota ahora') + '</div>' +
      '</div>' +
      '<span class="badge" style="font-size:0.72rem;background:rgba(16,185,129,0.15);border-color:rgba(16,185,129,0.4);color:#34d399;margin-left:auto;padding:2px 7px;">' + (encuestaActual.total_votos || 0) + ' votos</span>' +
      '</div>' +
      '</a>';
  }

  // ── Logros recientes (desde ranking real si hay) ──
  var rankingItems = (d && Array.isArray(d.ranking_principal) && d.ranking_principal.length > 0) ? d.ranking_principal : null;
  var logrosSource = rankingItems ? rankingItems.slice(0, 5).map(function (r, idx) {
    var avatars = ['🧙', '🦊', '🐉', '🌙', '⚡', '🔥', '💎', '🎯'];
    var colors = ['#f5c518', '#e2e8f0', '#fbbf24', '#34d399', '#a78bfa', '#f87171', '#60a5fa', '#fde68a'];
    return { avatar: avatars[idx] || '🎮', nombre: r.nick || r.nombre || 'Jugador', logro: 'Ranking #' + (idx + 1), pts: (r.pts !== undefined ? (r.pts >= 0 ? '+' : '') + r.pts : '+?'), color: colors[idx] || '#fff' };
  }) : FEED_LOGROS;

  var logrosHtml = logrosSource.map(function (l) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.03);">' +
      '<span style="display:flex;align-items:center;gap:6px;">' +
      '<span style="font-size:1.15rem;">' + l.avatar + '</span>' +
      '<span style="display:flex;flex-direction:column;">' +
      '<span style="font-size:0.86rem;font-weight:700;color:#fff;">' + escapeHtml(l.nombre) + '</span>' +
      '<span style="font-size:0.75rem;color:var(--text-faint);">' + escapeHtml(l.logro) + '</span>' +
      '</span>' +
      '</span>' +
      '<span style="font-size:0.86rem;font-weight:800;color:' + l.color + ';">' + l.pts + '</span>' +
      '</div>';
  }).join('');

  // ── Meta de la temporada (dinámica) ──
  var topPts = (rankingItems && rankingItems[0] && rankingItems[0].pts) ? rankingItems[0].pts : 487;
  var topNick = (rankingItems && rankingItems[0] && (rankingItems[0].nick || rankingItems[0].nombre)) ? escapeHtml(rankingItems[0].nick || rankingItems[0].nombre) : 'El Matagigantes 🧙';
  var metaPct = Math.min(100, Math.round(topPts / 1000 * 100));
  var metaHtml = '<div style="background:rgba(245,197,24,0.06);border:1px solid rgba(245,197,24,0.2);border-radius:6px;padding:9px 12px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">' +
    '<div style="font-size:0.84rem;font-weight:800;color:var(--gold);">🎁 Meta de la Temporada</div>' +
    '<div style="font-size:0.74rem;color:var(--text-faint);">Temporada 1</div>' +
    '</div>' +
    '<div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:6px;">Primero en alcanzar <span style="color:var(--gold);font-weight:800;">1000 PTS</span> gana un <span style="color:#fff;font-weight:700;">juego de mesa de su elección</span>.</div>' +
    '<div style="display:flex;align-items:center;gap:6px;">' +
    '<div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">' +
    '<div style="height:6px;width:' + metaPct + '%;background:linear-gradient(90deg,#f5c518,#ec4899);border-radius:3px;transition:width 1s ease;"></div>' +
    '</div>' +
    '<span style="font-size:0.75rem;color:var(--gold);font-weight:800;">' + topPts + '/1000</span>' +
    '</div>' +
    '<div style="font-size:0.72rem;color:var(--text-faint);margin-top:4px;">Líder actual: ' + topNick + '</div>' +
    '</div>';

  return `
    <div class="home-col-feed">
      <div class="community-feed-container">
        <!-- Header feed -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-shrink:0;">
          <div style="font-size:0.92rem;font-weight:800;text-transform:uppercase;color:var(--text-dim);letter-spacing:.5px;">📋 Actividades Recientes</div>
          <div style="display:flex;align-items:center;gap:5px;">
            <span class="live-dot"></span>
            <span id="feed-live-badge" style="font-size:0.74rem;color:var(--text-faint);transition:transform 0.2s;">En vivo</span>
          </div>
        </div>

        <!-- Scroll area -->
        <div class="feed-items-scroll custom-scrollbar-mini" style="gap:10px;">

          <!-- ── Stream de actividades en vivo ── -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 11px;">
            <div id="live-activity-stream">
              ${streamHtml}
            </div>
          </div>

          <!-- Radar -->
          ${radarHtml}

          <!-- Torneo destacado -->
          ${torneoHtml}

          <!-- Trivia aleatoria -->
          ${triviaHtml}

          <!-- Encuesta activa -->
          ${encuestaHtml}

          <!-- Mercado -->
          ${mercadoHtml}

          <!-- Logros recientes -->
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 11px;">
            <div style="font-size:0.82rem;font-weight:800;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:5px;">⭐ Logros Recientes</div>
            ${logrosHtml}
          </div>

          <!-- Meta temporada -->
          ${metaHtml}

        </div>
      </div>
    </div>
  `;
}


