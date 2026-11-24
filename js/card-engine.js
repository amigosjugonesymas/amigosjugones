/* === Amigos Jugones — card-engine.js === */
// Extraído de main.js

/* ═══════════════════════════════════════════════════════
   SECCIÓN 1: INICIO (REDDISEÑO VIEWPORT-FIT / 0 SCROLL)
   ═══════════════════════════════════════════════════════ */

/**
 * Baraja de cartas inicial para el Generador Aleatorio
 * (Estructurada para ser fácilmente reemplazada por el usuario o conectada a Google Sheets)
 */
const STARTER_DECK = [
  {
    titulo: "El Negociador Maestro",
    juego: "Los Colonos de Catan",
    tipo: "Estrategia",
    icono: "🌾",
    rareza: "Épica",
    color: "var(--orange)",
    efecto: "Cambia pacíficamente 1 recurso con un compañero por pura diplomacia y buena onda."
  },
  {
    titulo: "El Monje Estratega",
    juego: "Carcassonne",
    tipo: "Control",
    icono: "🏰",
    rareza: "Rara",
    color: "var(--cyan)",
    efecto: "Coloca tu meeple en un monasterio clave y asegura la victoria de la noche."
  },
  {
    titulo: "Dosis de Inmunidad",
    juego: "Virus!",
    tipo: "Supervivencia",
    icono: "🧪",
    rareza: "Legendaria",
    color: "var(--green)",
    efecto: "Inmuniza un órgano sano. Nadie en la mesa puede contagiarte su mala suerte hoy."
  },
  {
    titulo: "Pionero Marciano",
    juego: "Terraforming Mars",
    tipo: "Producción",
    icono: "🚀",
    rareza: "Mítica",
    color: "var(--accent)",
    efecto: "Aumenta la temperatura de la partida y reclama una ciudadela en Marte."
  },
  {
    titulo: "El Narrador de Sueños",
    juego: "Dixit",
    tipo: "Imaginación",
    icono: "🎭",
    rareza: "Especial",
    color: "var(--primary-light)",
    efecto: "Di una frase críptica: si exactamente la mitad adivina la carta, dominas la ronda."
  },
  {
    titulo: "Arquitecto de Épocas",
    juego: "7 Wonders",
    tipo: "Construcción",
    icono: "🏛️",
    rareza: "Legendaria",
    color: "var(--gold)",
    efecto: "Construye una de las siete maravillas: convocar a todos para la próxima partida."
  }
];

function drawRandomCard() {
  const cardInner = document.getElementById('playing-card-inner');
  const btn = document.getElementById('btn-draw-card');
  if (!cardInner) return;

  const card = STARTER_DECK[Math.floor(Math.random() * STARTER_DECK.length)];

  const titleEl = document.getElementById('card-revealed-title');
  const gameEl = document.getElementById('card-revealed-game');
  const typeEl = document.getElementById('card-revealed-type');
  const iconEl = document.getElementById('card-revealed-icon');
  const effectEl = document.getElementById('card-revealed-effect');

  if (titleEl) titleEl.textContent = card.titulo;
  if (gameEl) gameEl.textContent = card.juego;
  if (typeEl) {
    typeEl.textContent = card.tipo;
    typeEl.style.borderColor = card.color;
    typeEl.style.color = card.color;
  }
  if (iconEl) iconEl.textContent = card.icono;
  if (effectEl) effectEl.textContent = card.efecto;

  cardInner.classList.toggle('flipped');
  if (btn) {
    btn.innerHTML = cardInner.classList.contains('flipped')
      ? '🔄 ¡Sacar Otra Carta!'
      : '✨ ¡Sacar Carta!';
  }
}
window.drawRandomCard = drawRandomCard;

function switchStatsTab(tabId) {
  const buttons = document.querySelectorAll('.stats-tab-btn');
  const contents = document.querySelectorAll('.stats-tab-content');
  buttons.forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  contents.forEach(c => {
    c.style.display = (c.id === `stats-tab-${tabId}`) ? 'flex' : 'none';
  });
}
window.switchStatsTab = switchStatsTab;

function renderNewsTicker(novedadTexto) {
  const items = novedadTexto
    ? novedadTexto.split('\n').filter(t => t.trim().length > 0)
    : ['BLACK RULEZ!', 'Bienvenidos a Amigos Jugones', 'Revisa el radar y únete a las partidas de la semana'];

  const trackContent = items.map(item => `
    <span class="ticker-item">
      <span class="ticker-bullet">✦</span> ${escapeHtml(item)}
    </span>
  `).join('');

  return `
    <div class="news-ticker-container">
      <div class="ticker-badge">
        <span>📢</span>
        <span>NOVEDADES</span>
      </div>
      <div class="ticker-track-wrapper">
        <div class="ticker-track">
          ${trackContent}
          ${trackContent}
        </div>
      </div>
      <button onclick="renderSection('eventos')" class="ticker-action-btn" title="Ver eventos">
        Ver Eventos ❯
      </button>
    </div>
  `;
}

function renderUnifiedStatsWidget(champion, ranking, totalSecciones) {
  return `
    <div class="card flex flex-col glow" style="padding: 12px; min-height: 200px; overflow: hidden;">
      <!-- Pestañas Superiores -->
      <div class="stats-tabs-bar" style="display: flex; gap: 4px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px; flex-shrink: 0;">
        <button class="stats-tab-btn active" data-tab="momento" onclick="switchStatsTab('momento')">
          👑 Momento
        </button>
        <button class="stats-tab-btn" data-tab="ranking" onclick="switchStatsTab('ranking')">
          🏆 Top Ranking
        </button>
        <button class="stats-tab-btn" data-tab="actividad" onclick="switchStatsTab('actividad')">
          🎲 Actividad
        </button>
      </div>

      <!-- Tab 1: Campeón del Momento -->
      <div id="stats-tab-momento" class="stats-tab-content flex flex-col justify-between" style="display: flex; flex: 1;">
        <div class="flex items-center gap-10" style="padding: 4px 0;">
          <div class="stat-icon" style="color: var(--gold); border-color: var(--gold); background: rgba(245, 158, 11, 0.1); width: 44px; height: 44px; font-size: 1.4rem; box-shadow: 0 0 15px rgba(245, 158, 11, 0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            🏆
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.68rem; color: var(--gold); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">👑 Campeón del Momento</div>
            <div class="truncate font-bold" style="font-size: 1.15rem; color: var(--text);">${escapeHtml(champion.nombre)}</div>
            <div style="font-size: 0.74rem; color: var(--text-dim);">${champion.puntos || 0} pts acumulados</div>
          </div>
        </div>
        <div style="margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04);">
          <button onclick="renderSection('eventos')" class="btn btn-ghost" style="display: flex; justify-content: center; width: 100%; padding: 6px; font-size: 0.74rem; text-transform: uppercase;">
            Ver Eventos Destacados ❯
          </button>
        </div>
      </div>

      <!-- Tab 2: Top Ranking -->
      <div id="stats-tab-ranking" class="stats-tab-content flex flex-col justify-between" style="display: none; flex: 1;">
        <div class="flex flex-col gap-6 custom-scrollbar-mini" style="flex: 1; overflow-y: auto; max-height: 100px;">
          ${ranking.length > 0 ? ranking.slice(0, 3).map((r, i) => `
            <div class="flex items-center justify-between" style="font-size: 0.78rem; padding: 2px 4px;">
              <span class="flex items-center gap-6 truncate">
                <span style="color: ${i === 0 ? 'var(--gold)' : i === 1 ? 'var(--silver)' : 'var(--bronze)'}; font-weight: 800;">#${i + 1}</span>
                <span class="truncate">${escapeHtml(r.nombre)}</span>
              </span>
              <span class="badge badge-purple" style="font-size: 0.62rem;">${r.puntos} pts</span>
            </div>
          `).join('') : '<div class="text-dim text-xs" style="text-align:center; padding: 8px 0;">Sin ranking cargado</div>'}
        </div>
        <div style="margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04);">
          <button onclick="renderSection('eventos')" class="btn btn-ghost" style="display: flex; justify-content: center; width: 100%; padding: 6px; font-size: 0.74rem; text-transform: uppercase;">
            Ver Eventos Destacados ❯
          </button>
        </div>
      </div>

      <!-- Tab 3: Actividad -->
      <div id="stats-tab-actividad" class="stats-tab-content flex flex-col justify-between" style="display: none; flex: 1;">
        <div class="flex items-center justify-around" style="padding: 10px 0;">
          <div style="text-align: center;">
            <div style="font-size: 1.4rem; color: var(--accent); font-weight: 800;">${totalSecciones || 12}</div>
            <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">Secciones Activas</div>
          </div>
          <div style="height: 28px; width: 1px; background: rgba(255,255,255,0.1);"></div>
          <div style="text-align: center;">
            <div style="font-size: 1.4rem; color: var(--cyan); font-weight: 800;">24/7</div>
            <div style="font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase;">Comunidad Conectada</div>
          </div>
        </div>
        <div style="margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04);">
          <a href="calendario.html" class="btn btn-ghost" style="display: flex; justify-content: center; width: 100%; padding: 6px; font-size: 0.74rem; text-transform: uppercase;">
            Explorar Calendario ❯
          </a>
        </div>
      </div>
    </div>
  `;
}

// ─── DESAFÍOS BASE DE LA TARJETA DIARIA ──────────────────────────────────────
const DAILY_CHALLENGES = [
  { num: 1, title: 'La trama', desc: 'A) Explicar una trama absurda / B) Adivinar la de alguien del grupo.' },
  { num: 2, title: 'Fondo pantalla', desc: 'A) Subir tu pantalla de inicio / B) Calificar del 1 al 10 la de alguien.' },
  { num: 3, title: 'Banda sonora', desc: 'A) Compartir un tema geek o gamer / B) Reaccionar al de alguien del grupo.' },
  { num: 4, title: 'Versus', desc: 'A) Proponer un enfrentamiento / B) Votar en el de alguien del grupo.' },
  { num: 5, title: 'El origen', desc: 'A) Contar tu primer juego o cómic / B) Comentar similitudes con alguien.' },
  { num: 6, title: 'Meme', desc: 'A) Subir un meme de tu galería / B) Responder con sticker o gif.' },
  { num: 7, title: 'Dilema', desc: 'A) Crear un "Prefieres X o Y" / B) Responder si fuiste nominado.' },
];

// ─── MISIONES SECRETAS PERSONALES (2 VÍAS INDEPENDIENTES) ─────────────────────
// Vía 1: Misión Personal Sana (otorga puntos directos al jugador)
const SECRET_MISSIONS_POSITIVE = [
  { tipo: 'positiva', pts: '+2 PTS', titulo: '🤝 Conector Silencioso', desc: 'Responde el mensaje de alguien del grupo con quien casi no hayas hablado este mes. Captura como prueba.' },
  { tipo: 'positiva', pts: '+2 PTS', titulo: '📸 Reliquia Jugona', desc: 'Sube una foto del juego de mesa más antiguo que tengas en tu repisa. Cuéntanos cómo llegó a tus manos.' },
  { tipo: 'positiva', pts: '+3 PTS', titulo: '🎯 Trivia Artesanal', desc: 'Genera una pregunta de trivia geek original y publícala en el grupo. Recoge las respuestas durante el día.' },
  { tipo: 'positiva', pts: '+2 PTS', titulo: '📚 Recomendación Flash', desc: 'Recomienda un juego o cómic poco conocido argumentando en menos de 3 líneas por qué vale la pena.' },
  { tipo: 'positiva', pts: '+2 PTS', titulo: '🎲 Crónica de Tablero', desc: 'Escribe una micro-reseña de 2 líneas sobre la última partida que jugaste y califícala del 1 al 10.' },
];

// Vía 2: Misión de Contraataque (descuenta puntos a todos los que están por encima en la tabla)
const SECRET_MISSIONS_ATTACK = [
  { tipo: 'negativa', pts: '−5 PTS a los de arriba', titulo: '💣 Caparazón Azul', desc: 'Publica una opinión geek "caliente" que divida el grupo en dos bandos. Si 3 personas debaten, el contraataque es exitoso.' },
  { tipo: 'negativa', pts: '−5 PTS a los de arriba', titulo: '🥷 Ninja Infiltrado', desc: 'Lanza una frase de un personaje icónico SIN decir de quién es. Si nadie lo adivina en 2h, el contraataque es exitoso.' },
  { tipo: 'negativa', pts: '−5 PTS a los de arriba', titulo: '🎭 Actor de Método', desc: 'Adopta el vocabulario de un personaje de ficción 30 min en el chat sin decir cuál es. Si nadie te caza, ganás.' },
  { tipo: 'negativa', pts: '−5 PTS a los de arriba', titulo: '♟️ Jaque Psicológico', desc: 'Pregunta en el grupo quién va liderando y reta públicamente a uno de los punteros a un duelo o predicción.' },
  { tipo: 'negativa', pts: '−5 PTS a los de arriba', titulo: '🧩 Código Enigma', desc: 'Publica un acertijo visual o meme editado sobre un juego de mesa. Si tarda más de 1 hora en resolverse, es exitoso.' },
];

let secretMissionsRevealed = false;
let currentPositiveMission = null;
let currentAttackMission = null;

// Variables de compatibilidad
let secretMissionRevealed = false;
let currentSecretMission = null;

// ── Modal: Misión Pública (Desafío del Día) ────────────────────────────────────
window.openDailyCardModal = function () {
  if (!window.AuthManager || !window.AuthManager.isAuthenticated()) {
    window.AuthManager.showModal({ reason: 'Identifícate con tu WhatsApp para ver y descargar las Misiones del Día.' });
    return;
  }
  const existing = document.getElementById('daily-card-popup');
  if (existing) existing.remove();
  const pts = window._tcgDailyPts || 5;

  let weeklyKey = 'AJ2026';
  try {
    weeklyKey = localStorage.getItem('aj_weekly_key') || 'AJ2026';
  } catch (e) { }

  const challengesHtml = DAILY_CHALLENGES.map(function (c) {
    return `<div style="display:flex;align-items:flex-start;gap:8px;font-size:0.92rem;line-height:1.45;background:rgba(255,255,255,0.04);border-left:3px solid var(--primary);border-radius:4px;padding:7px 10px;">
      <span style="font-weight:800;color:var(--gold);flex-shrink:0;">${c.num}.</span>
      <span><strong style="color:#fff;text-transform:uppercase;">${c.title}:</strong> <span style="color:var(--text-dim);">${c.desc}</span></span>
    </div>`;
  }).join('');
  const modalHtml = `
    <div id="daily-card-popup" class="modal-overlay" style="display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99999;align-items:flex-start;justify-content:center;backdrop-filter:blur(10px);padding:12px;overflow-y:auto;" onclick="if(event.target===this)closeDailyCardModal()">
      <div style="background:linear-gradient(145deg,#0e0c23,#1a1038);border:2px solid rgba(124,58,237,0.7);box-shadow:0 0 40px rgba(124,58,237,0.3);border-radius:16px;width:100%;max-width:520px;padding:20px;position:relative;animation:popIn 0.25s ease-out;box-sizing:border-box;margin:auto;">
        <button onclick="closeDailyCardModal()" style="position:absolute;top:14px;right:16px;background:none;border:none;color:white;font-size:1.6rem;cursor:pointer;opacity:0.7;line-height:1;" title="Cerrar">✕</button>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;margin-right:32px;">
          <div>
            <div style="font-size:0.82rem;font-weight:800;color:var(--primary-light);text-transform:uppercase;letter-spacing:.5px;">🃏 MISIÓN PÚBLICA</div>
            <div style="font-size:0.78rem;color:var(--text-dim);margin-top:2px;">📅 ${getFechaMisionHoy('largo')} · Todo o Nada</div>
          </div>
          <span class="badge badge-purple" style="font-size:0.88rem;padding:4px 12px;font-weight:800;">${pts} PTS</span>
        </div>
        <h3 style="font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:4px;">Los 7 Desafíos del Día</h3>
        <p style="font-size:0.78rem;color:var(--text-dim);margin-bottom:12px;">Completa todos para sumar los puntos. Cada desafío tiene Opción A (crear/proponer) o Opción B (interactuar/reaccionar).</p>
        <div style="display:flex;flex-direction:column;gap:6px;padding-right:4px;">
          ${challengesHtml}
        </div>

        <!-- Clave Semanal Web -->
        <div style="margin-top:12px; padding:10px 14px; background:linear-gradient(135deg, rgba(124,58,237,0.16), rgba(56,189,248,0.08)); border:1px solid rgba(168,85,247,0.4); border-radius:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">🔑</span>
            <span style="font-size:0.82rem; font-weight:800; color:var(--primary-light); text-transform:uppercase; letter-spacing:0.5px;">Clave Semanal Web</span>
          </div>
          <div>
            <input type="text" id="daily-card-weekly-key" value="${escapeHtml(weeklyKey)}" maxlength="16" placeholder="Ej: AJ2026"
              style="width:110px; text-transform:uppercase; font-family:'JetBrains Mono', monospace; font-size:0.9rem; font-weight:900; text-align:center; padding:6px 8px; background:rgba(0,0,0,0.6); border:1px solid rgba(168,85,247,0.7); border-radius:8px; color:var(--gold); outline:none; box-shadow:0 0 10px rgba(124,58,237,0.3);"
              oninput="try{localStorage.setItem('aj_weekly_key', this.value.trim().toUpperCase())}catch(e){}"
            />
          </div>
        </div>

        <!-- Botones acción - siempre visibles, stack vertical en móvil -->
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px;">
          <button onclick="closeDailyCardModal(); if(window.AuthManager) window.AuthManager.abrirModalMisiones();" style="width:100%; min-height:48px; padding:12px 14px; font-size:0.9rem; font-weight:800; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; border-radius:10px; cursor:pointer; box-shadow:0 3px 12px rgba(16,185,129,0.35); touch-action:manipulation;">
            📤 Enviar Pruebas para Revisión
          </button>
          <button onclick="downloadDailyCard();closeDailyCardModal();" style="width:100%; min-height:44px; padding:10px 14px; font-size:0.86rem; font-weight:700; background:linear-gradient(135deg,var(--primary),var(--accent)); color:#fff; border:none; border-radius:10px; cursor:pointer; touch-action:manipulation;">⬇️ Descargar Tarjeta PNG</button>
          <button onclick="closeDailyCardModal()" style="width:100%; min-height:40px; padding:8px 14px; font-size:0.86rem; background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.7); border:1px solid rgba(255,255,255,0.15); border-radius:10px; cursor:pointer; touch-action:manipulation;">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeDailyCardModal = function () {
  const p = document.getElementById('daily-card-popup');
  if (p) p.remove();
};

window.toggleDailyCard = function () {
  // Compatibilidad: ahora llama al modal
  window.openDailyCardModal();
};

// ── UTILIDADES PARA GENERACIÓN DE TARJETAS CANVAS ────────────────────────
function loadCardImage(src) {
  return new Promise(function (resolve) {
    if (!src) return resolve(null);
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { resolve(img); };
    img.onerror = function () { resolve(null); };
    img.src = src;
    if (img.complete && img.naturalWidth) resolve(img);
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCardText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  var words = (text || '').split(' ');
  var line = '';
  var curY = y;
  var linesDrawn = 0;
  for (var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + ' ';
    var metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      if (maxLines && linesDrawn >= maxLines - 1) {
        ctx.fillText(line.trim() + '...', x, curY);
        return curY + lineHeight;
      }
      ctx.fillText(line.trim(), x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
      linesDrawn++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, curY);
  return curY + lineHeight;
}

function drawSciFiCorners(ctx, x, y, w, h, len, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w, y, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y + h, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w, y + h, 2.5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawShieldEmblem(ctx, cx, cy, r, borderCol, fillCol) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy - r * 0.4);
  ctx.lineTo(cx + r * 0.7, cy + r * 0.6);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.7, cy + r * 0.6);
  ctx.lineTo(cx - r, cy - r * 0.4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(245, 197, 24, 0.15)';
  ctx.fill();
  ctx.strokeStyle = borderCol;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function getCardSkinTheme() {
  var skinId = 'default';
  try {
    skinId = document.documentElement.getAttribute('data-skin') ||
      (window.AJSkinEngine && window.AJSkinEngine.current) ||
      localStorage.getItem('aj_skin_override') ||
      'default';
  } catch (e) {
    skinId = 'default';
  }

  var THEMES = {
    default: {
      id: 'default',
      name: 'Arcade Oficial',
      emoji: '🎲',
      bgGrad1: '#160c33',
      bgGrad2: '#080514',
      primary: '#a855f7',
      secondary: '#ec4899',
      accent: '#06b6d4',
      gold: '#f5c518',
      border: '#a855f7',
      badgeBg: 'rgba(168, 85, 247, 0.25)',
      badgeText: '#c084fc',
      tag: 'MISIÓN PÚBLICA · EDICIÓN ARCADE',
      subtag: 'DESAFÍO DEL DÍA'
    },
    halloween: {
      id: 'halloween',
      name: 'Edición Halloween',
      emoji: '🎃',
      bgGrad1: '#260a02',
      bgGrad2: '#0c0312',
      primary: '#ff6b00',
      secondary: '#9333ea',
      accent: '#00e676',
      gold: '#ffb703',
      border: '#ff6b00',
      badgeBg: 'rgba(255, 107, 0, 0.28)',
      badgeText: '#ffa94d',
      tag: '🎃 NOCHE DE HALLOWEEN 🕷️',
      subtag: 'DESAFÍO DEL MÁS ALLÁ'
    },
    navidad: {
      id: 'navidad',
      name: 'Edición Navidad',
      emoji: '🎄',
      bgGrad1: '#1a0505',
      bgGrad2: '#030f08',
      primary: '#ef4444',
      secondary: '#10b981',
      accent: '#facc15',
      gold: '#f5c518',
      border: '#ef4444',
      badgeBg: 'rgba(239, 68, 68, 0.28)',
      badgeText: '#fca5a5',
      tag: '🎄 ESPECIAL NAVIDEÑO 🎅',
      subtag: 'DESAFÍO DEL POLO NORTE'
    },
    san_valentin: {
      id: 'san_valentin',
      name: 'Edición San Valentín',
      emoji: '💝',
      bgGrad1: '#2a081a',
      bgGrad2: '#0e030a',
      primary: '#ec4899',
      secondary: '#f43f5e',
      accent: '#fb7185',
      gold: '#fde047',
      border: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.28)',
      badgeText: '#fda4af',
      tag: '💝 EDICIÓN SAN VALENTÍN 🌹',
      subtag: 'DESAFÍO DE CORAZONES'
    },
    año_nuevo: {
      id: 'año_nuevo',
      name: 'Edición Año Nuevo',
      emoji: '🎆',
      bgGrad1: '#1a1403',
      bgGrad2: '#040510',
      primary: '#f5c518',
      secondary: '#3b82f6',
      accent: '#38bdf8',
      gold: '#fde047',
      border: '#f5c518',
      badgeBg: 'rgba(245, 197, 24, 0.28)',
      badgeText: '#fef08a',
      tag: '🎆 GALA DE AÑO NUEVO 🥂',
      subtag: 'DESAFÍO DE MEDIANOCHE'
    },
    fiestas_patrias: {
      id: 'fiestas_patrias',
      name: 'Edición Fiestas Patrias',
      emoji: '🇨🇱',
      bgGrad1: '#1c070b',
      bgGrad2: '#040b18',
      primary: '#dc2626',
      secondary: '#2563eb',
      accent: '#f5c518',
      gold: '#fde047',
      border: '#dc2626',
      badgeBg: 'rgba(220, 38, 38, 0.28)',
      badgeText: '#fca5a5',
      tag: '🇨🇱 FONDA DIEZIOCHERA ⭐',
      subtag: 'DESAFÍO CRIOLLO'
    },
    dia_del_juego: {
      id: 'dia_del_juego',
      name: 'Edición Día del Videojuego',
      emoji: '🕹️',
      bgGrad1: '#001a09',
      bgGrad2: '#000000',
      primary: '#00ff66',
      secondary: '#ff007f',
      accent: '#00f0ff',
      gold: '#ffea00',
      border: '#00ff66',
      badgeBg: 'rgba(0, 255, 102, 0.22)',
      badgeText: '#69ff94',
      tag: '🕹️ RETRO GAMING 8-BIT 👾',
      subtag: 'QUEST DEL DÍA'
    },
    verano: {
      id: 'verano',
      name: 'Edición Verano',
      emoji: '🌊',
      bgGrad1: '#041f2d',
      bgGrad2: '#020b12',
      primary: '#06b6d4',
      secondary: '#f97316',
      accent: '#facc15',
      gold: '#fde047',
      border: '#06b6d4',
      badgeBg: 'rgba(6, 182, 212, 0.28)',
      badgeText: '#67e8f9',
      tag: '🌊 TEMPORADA VERANIEGA ☀️',
      subtag: 'DESAFÍO PLAYERO'
    },
    invierno: {
      id: 'invierno',
      name: 'Edición Invierno',
      emoji: '❄️',
      bgGrad1: '#051829',
      bgGrad2: '#030811',
      primary: '#38bdf8',
      secondary: '#60a5fa',
      accent: '#bae6fd',
      gold: '#facc15',
      border: '#38bdf8',
      badgeBg: 'rgba(56, 189, 248, 0.28)',
      badgeText: '#7dd3fc',
      tag: '❄️ TEMPORADA DE INVIERNO ⛄',
      subtag: 'DESAFÍO BAJO CERO'
    },
    aniversario: {
      id: 'aniversario',
      name: 'Edición Aniversario',
      emoji: '🏆',
      bgGrad1: '#261a03',
      bgGrad2: '#0a0802',
      primary: '#f5c518',
      secondary: '#d97706',
      accent: '#a855f7',
      gold: '#fde047',
      border: '#f5c518',
      badgeBg: 'rgba(245, 197, 24, 0.28)',
      badgeText: '#fef08a',
      tag: '🏆 GRAN ANIVERSARIO 👑',
      subtag: 'DESAFÍO DE ORO'
    },
    pascua: {
      id: 'pascua',
      name: 'Edición Pascua',
      emoji: '🐣',
      bgGrad1: '#1b0928',
      bgGrad2: '#07030c',
      primary: '#c084fc',
      secondary: '#4ade80',
      accent: '#facc15',
      gold: '#fde047',
      border: '#c084fc',
      badgeBg: 'rgba(192, 132, 252, 0.28)',
      badgeText: '#d8b4fe',
      tag: '🐣 FESTIVAL DE PASCUA 🌸',
      subtag: 'DESAFÍO DE HUEVOS'
    },
    dia_del_amigo: {
      id: 'dia_del_amigo',
      name: 'Edición Día del Amigo',
      emoji: '👫',
      bgGrad1: '#261005',
      bgGrad2: '#0c0502',
      primary: '#f59e0b',
      secondary: '#ef4444',
      accent: '#fbbf24',
      gold: '#fde047',
      border: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.28)',
      badgeText: '#fcd34d',
      tag: '👫 DÍA DEL AMIGO 🎲',
      subtag: 'DESAFÍO FRATERNAL'
    }
  };

  return THEMES[skinId] || THEMES.default;
}

window.downloadDailyCard = async function () {
  const canvas = document.createElement('canvas');
  const ptsEl = document.getElementById('tcg-pts-display');
  const pts = (ptsEl && ptsEl.textContent.trim()) || (window._tcgDailyPts ? String(window._tcgDailyPts) : '5');
  const W = 750, H = 910;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const theme = getCardSkinTheme();

  // Precarga de imágenes
  const logoImg = await loadCardImage('imagenes/LOGO AMIGOS JUGONES.png');
  const shieldImg = await loadCardImage('imagenes/escudo.png');

  // 1. Fondo degradado de alta gama según skin activo
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, theme.bgGrad1);
  bgGrad.addColorStop(0.5, theme.bgGrad2);
  bgGrad.addColorStop(1, '#05030a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Halo ambiental central
  const radGlow = ctx.createRadialGradient(W / 2, 180, 20, W / 2, 180, 360);
  radGlow.addColorStop(0, theme.primary ? (theme.primary + '28') : 'rgba(168,85,247,0.18)');
  radGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radGlow;
  ctx.fillRect(0, 0, W, H);

  // 3. Matriz hexagonal cibernética de fondo
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const hexStep = 44;
  for (let x = 20; x < W - 20; x += hexStep) {
    for (let y = 20; y < H - 20; y += hexStep) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fill();
    }
  }
  ctx.restore();

  // 4. Doble marco tecnológico exterior con resplandor neón
  ctx.save();
  ctx.shadowColor = theme.border;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 3.5;
  roundRectPath(ctx, 14, 14, W - 28, H - 28, 18);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, 22, 22, W - 44, H - 44, 12);
  ctx.stroke();
  ctx.restore();

  // 5. Esquinas Sci-Fi biseladas
  drawSciFiCorners(ctx, 24, 24, W - 48, H - 48, 28, theme.primary);

  // 6. Cabecera (Logo oficial + Badges + Título)
  const headerY = 36;
  if (logoImg) {
    ctx.save();
    const lGlow = ctx.createRadialGradient(82, headerY + 44, 10, 82, headerY + 44, 52);
    lGlow.addColorStop(0, 'rgba(245, 197, 24, 0.35)');
    lGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(82, headerY + 44, 52, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(logoImg, 38, headerY, 88, 88);
    ctx.restore();
  }

  const textLeft = logoImg ? 142 : 44;

  // Badge temático del skin activo
  ctx.save();
  ctx.fillStyle = theme.badgeBg;
  roundRectPath(ctx, textLeft, headerY + 4, 255, 24, 12);
  ctx.fill();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('★ ' + theme.tag + ' ★', textLeft + 12, headerY + 20);
  ctx.restore();

  // Título principal
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText('DESAFÍOS DEL DÍA', textLeft, headerY + 56);
  ctx.restore();

  // Fecha y formato
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '600 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📅 ' + getFechaMisionHoy('largo') + ' · Regla: Todo o Nada', textLeft, headerY + 78);
  ctx.restore();

  // 7. Placa de Puntos y Recompensa Destacada
  const plateY = 138;
  const plateH = 88;
  const plateW = W - 76;
  const plateX = 38;

  ctx.save();
  const plateGrad = ctx.createLinearGradient(plateX, plateY, plateX + plateW, plateY + plateH);
  plateGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  plateGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  ctx.fillStyle = plateGrad;
  roundRectPath(ctx, plateX, plateY, plateW, plateH, 14);
  ctx.fill();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const shieldX = plateX + 16;
  const shieldY = plateY + 6;
  const shieldSize = 76;
  if (shieldImg) {
    ctx.drawImage(shieldImg, shieldX, shieldY, shieldSize * 0.88, shieldSize);
  } else {
    drawShieldEmblem(ctx, shieldX + 36, shieldY + 38, 34, theme.primary, theme.gold);
  }

  // Puntos gigantes y etiqueta
  ctx.fillStyle = '#f5c518';
  ctx.textAlign = 'center';
  ctx.font = '900 34px sans-serif';
  ctx.shadowColor = theme.gold;
  ctx.shadowBlur = 14;
  ctx.fillText(pts, shieldX + 34, shieldY + 44);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('PUNTOS', shieldX + 34, shieldY + 64);

  const infoX = shieldX + 86;
  ctx.textAlign = 'left';
  ctx.fillStyle = theme.gold;
  ctx.font = 'bold 14.5px sans-serif';
  ctx.fillText('🏆 RECOMPENSA OFICIAL: ' + pts + ' PTS ACUMULABLES', infoX, plateY + 28);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '12.5px sans-serif';
  ctx.fillText('Completa los 7 desafíos del día para sumar a la tabla general.', infoX, plateY + 49);

  ctx.fillStyle = theme.badgeText;
  ctx.font = '600 11.5px sans-serif';
  ctx.fillText('⚡ Cada desafío tiene Opción A (crear) u Opción B (reaccionar/votar)', infoX, plateY + 69);
  ctx.restore();

  // 8. Lista de los 7 Desafíos Diarios (En línea + Tipografía más grande y legible)
  const listStartY = 236;
  const itemW = W - 76;
  const itemH = 64;
  const itemSpacing = 8;
  const maxTextW = itemW - 74;

  DAILY_CHALLENGES.forEach(function (c, i) {
    const curY = listStartY + i * (itemH + itemSpacing);

    ctx.save();
    ctx.fillStyle = (i % 2 === 0) ? 'rgba(255, 255, 255, 0.045)' : 'rgba(255, 255, 255, 0.025)';
    roundRectPath(ctx, 38, curY, itemW, itemH, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Barra lateral de acento de color
    ctx.fillStyle = (i % 2 === 0) ? theme.primary : (theme.secondary || theme.accent);
    roundRectPath(ctx, 38, curY, 5, itemH, 3);
    ctx.fill();

    // Chip numérico [01] centrado verticalmente
    const chipX = 52;
    const chipW = 34;
    const chipH = 24;
    const chipY = curY + Math.round((itemH - chipH) / 2);
    ctx.fillStyle = theme.badgeBg;
    roundRectPath(ctx, chipX, chipY, chipW, chipH, 6);
    ctx.fill();
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = theme.gold;
    ctx.font = 'bold 12.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0' + (i + 1), chipX + chipW / 2, chipY + chipH / 2);

    // Título en línea con la misión y tipografía ampliada
    const textX = chipX + chipW + 12;
    const titlePrefix = c.title.toUpperCase() + ': ';

    ctx.font = 'bold 15.5px sans-serif';
    const titleW = ctx.measureText(titlePrefix).width;

    ctx.font = '500 15px sans-serif';
    const words = (c.desc || '').split(' ');
    let line1Words = [];
    let line2Words = [];
    let curLineW = titleW;

    for (let w = 0; w < words.length; w++) {
      const wordW = ctx.measureText(words[w] + ' ').width;
      if (line2Words.length === 0 && (curLineW + wordW <= maxTextW)) {
        line1Words.push(words[w]);
        curLineW += wordW;
      } else {
        line2Words.push(words[w]);
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (line2Words.length === 0) {
      // 1 sola línea centrada verticalmente
      const lineY = curY + Math.round(itemH / 2) + 5;
      ctx.font = 'bold 15.5px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(titlePrefix, textX, lineY);

      if (line1Words.length > 0) {
        ctx.font = '500 15px sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(line1Words.join(' '), textX + titleW, lineY);
      }
    } else {
      // 2 líneas optimizadas
      const line1Y = curY + 26;
      const line2Y = curY + 48;

      // Línea 1: TÍTULO: + texto inicial
      ctx.font = 'bold 15.5px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(titlePrefix, textX, line1Y);

      if (line1Words.length > 0) {
        ctx.font = '500 15px sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(line1Words.join(' '), textX + titleW, line1Y);
      }

      // Línea 2: Continuación
      let line2Text = line2Words.join(' ');
      ctx.font = '500 15px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      while (ctx.measureText(line2Text).width > maxTextW && line2Text.length > 3) {
        line2Text = line2Text.slice(0, -4).trim() + '...';
      }
      ctx.fillText(line2Text, textX, line2Y);
    }

    ctx.restore();
  });

  // 9. Placa de Premio Final y Watermark
  const footY = 744;
  ctx.save();
  const prizeGrad = ctx.createLinearGradient(38, footY, 38 + itemW, footY + 66);
  prizeGrad.addColorStop(0, 'rgba(236, 72, 153, 0.15)');
  prizeGrad.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
  ctx.fillStyle = prizeGrad;
  roundRectPath(ctx, 38, footY, itemW, 66, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ec4899';
  ctx.font = '900 14.5px sans-serif';
  ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
  ctx.shadowBlur = 8;
  ctx.fillText('🎁 EL PRIMERO EN LLEGAR A 1000 PTS GANA UN JUEGO DE MESA COMO PREMIO', W / 2, footY + 26);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '11.5px sans-serif';
  ctx.fillText('Comunidad Amigos Jugones · Temporada 2026 · Tarjeta Oficial Certificada', W / 2, footY + 48);
  ctx.restore();

  // 10. Sello de Clave Semanal Oficial para WhatsApp
  const keyInput = document.getElementById('daily-card-weekly-key');
  let weeklyKey = (keyInput ? keyInput.value.trim().toUpperCase() : '');
  if (!weeklyKey) {
    try { weeklyKey = localStorage.getItem('aj_weekly_key') || 'AJ2026'; } catch (e) { weeklyKey = 'AJ2026'; }
  }

  const keyY = 822;
  const keyBadgeW = 390;
  const keyBadgeH = 38;
  const keyBadgeX = (W - keyBadgeW) / 2;

  ctx.save();
  const keyGrad = ctx.createLinearGradient(keyBadgeX, keyY, keyBadgeX + keyBadgeW, keyY);
  keyGrad.addColorStop(0, 'rgba(124, 58, 237, 0.35)');
  keyGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
  keyGrad.addColorStop(1, 'rgba(124, 58, 237, 0.35)');
  ctx.fillStyle = keyGrad;
  roundRectPath(ctx, keyBadgeX, keyY, keyBadgeW, keyBadgeH, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('🔑 CLAVE SEMANAL WEB: ', keyBadgeX + 115, keyY + 24);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 15px monospace';
  ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText(weeklyKey, keyBadgeX + 265, keyY + 24);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = '11px monospace';
  ctx.fillText('AMIGOS JUGONES · VERIFICACIÓN OFICIAL ' + theme.id.toUpperCase() + ' · AMIGOSJUGONES.CL', W / 2, H - 18);
  ctx.restore();

  // Descarga directa
  const a = document.createElement('a');
  a.download = 'desafio_diario_' + theme.id + '_' + Date.now() + '.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
};

