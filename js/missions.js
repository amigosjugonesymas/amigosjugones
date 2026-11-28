/* === Amigos Jugones — missions.js === */
// Extraído de main.js

function updateSecretCardsTeasers() {
  const cPersonal = document.getElementById('card-personal-missions');
  if (cPersonal && currentPositiveMission && currentAttackMission) {
    const posSlot = cPersonal.querySelector('.positive-slot .slot-title-text');
    const atkSlot = cPersonal.querySelector('.attack-slot .slot-title-text');
    if (posSlot && atkSlot) {
      posSlot.textContent = currentPositiveMission.titulo;
      atkSlot.textContent = currentAttackMission.titulo;
    } else {
      cPersonal.innerHTML = `
        <div style="font-size:2rem;margin-bottom:4px;">🥷</div>
        <div style="font-size:0.88rem;font-weight:800;color:var(--accent);text-transform:uppercase;letter-spacing:.4px;">Tarjeta Personal</div>
        <div style="font-size:0.74rem;color:var(--text-dim);margin-top:1px;">2 pruebas · Solo tuya</div>
        <div style="display:flex;flex-direction:column;gap:3px;margin-top:5px;width:100%;">
          <span class="badge" style="font-size:0.7rem;background:rgba(16,185,129,0.2);border-color:#10b981;color:#6ee7b7;padding:1px 6px;">⭐ ${escapeHtml(currentPositiveMission.titulo)}</span>
          <span class="badge" style="font-size:0.7rem;background:rgba(239,68,68,0.2);border-color:#ef4444;color:#fca5a5;padding:1px 6px;">⚔️ ${escapeHtml(currentAttackMission.titulo)}</span>
        </div>
        <span style="font-size:0.75rem;color:var(--cyan);font-weight:700;margin-top:6px;">🔍 Toca para ver</span>
      `;
    }
  }
}

let dynamicPositiveMissions = null;
let dynamicAttackMissions = null;

async function fetchDynamicMisiones() {
  try {
    const orqUrl = (window.AJ_CONFIG && window.AJ_CONFIG.ORQUESTADOR_URL)
      || "https://script.google.com/macros/s/AKfycbzYRXiS0j2gBLGDVKexjz_ke7GCSLrD_H9DCVPvPn4FewukHYzHInLOM7Yknsa8f5oyLQ/exec";
    const url = `${orqUrl}?action=misiones_get`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'ok') {
      if (Array.isArray(data.positivas) && data.positivas.length > 0) dynamicPositiveMissions = data.positivas;
      if (Array.isArray(data.ataque) && data.ataque.length > 0) dynamicAttackMissions = data.ataque;
    }
  } catch (e) {
    console.warn("[Misiones] Usando banco de respaldo local:", e);
  }
}

// Prefetch en background al iniciar la app
fetchDynamicMisiones();

// Generación determinista diaria por usuario para Misión Secreta y Contraataque
window.generateSecretMissions = function () {
  if (!secretMissionsRevealed) {
    const poolPos = (dynamicPositiveMissions && dynamicPositiveMissions.length > 0) ? dynamicPositiveMissions : SECRET_MISSIONS_POSITIVE;
    const poolAtk = (dynamicAttackMissions && dynamicAttackMissions.length > 0) ? dynamicAttackMissions : SECRET_MISSIONS_ATTACK;

    const user = (window.AuthManager && window.AuthManager.getUser()) || {};
    const seedStr = (user.telefono || user.nick || 'guest') + '_' + new Date().toISOString().slice(0, 10);

    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);

    currentPositiveMission = poolPos[absHash % poolPos.length];
    currentAttackMission = poolAtk[(absHash >> 3) % poolAtk.length];
    secretMissionsRevealed = true;
    secretMissionRevealed = true;
    currentSecretMission = currentAttackMission;
    updateSecretCardsTeasers();
  }
};

window.openSecretMissionModal = function (initialTab) {
  if (!window.AuthManager || !window.AuthManager.isAuthenticated()) {
    window.AuthManager.showModal({ reason: 'Identifícate con tu WhatsApp para desbloquear y revelar tu Misión Secreta.' });
    return;
  }
  if (!secretMissionsRevealed) {
    window.generateSecretMissions();
  }
  const tab = initialTab || 'positive';
  const existing = document.getElementById('secret-mission-popup');
  if (existing) existing.remove();

  const isPos = tab === 'positive';
  const m = isPos ? currentPositiveMission : currentAttackMission;
  const accentColor = isPos ? '#34d399' : '#f87171';
  const badgeBg = isPos ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
  const borderColor = isPos ? '#10b981' : '#ef4444';
  const tag = isPos ? '⭐ MISIÓN PERSONAL (VÍA SANA)' : '⚔️ CONTRAATAQUE (SABOTAJE)';
  const tip = isPos
    ? '💡 Publica tu prueba o captura en el chat de WhatsApp al cumplirla para que el Administrador sume tus puntos.'
    : '💣 Ejecuta esta prueba en el grupo de WhatsApp sin ser descubierto. Si nadie te frena, ¡se le descontarán los puntos indicados a TODOS los que estén por encima de ti en el ranking!';
  const downloadFn = isPos ? 'downloadPositiveMission()' : 'downloadAttackMission()';

  const modalHtml = `
    <div id="secret-mission-popup" class="modal-overlay" style="display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(10px);padding:16px;" onclick="if(event.target===this)closeSecretMissionModal()">
      <div style="background:linear-gradient(145deg, #120e29, #1c1236);border:2px solid ${borderColor};box-shadow:0 0 35px ${isPos ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'};border-radius:16px;width:100%;max-width:520px;padding:24px;position:relative;animation:popIn 0.25s ease-out;">

        <!-- Botón Cerrar -->
        <button onclick="closeSecretMissionModal()" style="position:absolute;top:14px;right:16px;background:none;border:none;color:white;font-size:1.6rem;cursor:pointer;opacity:0.7;line-height:1;" title="Cerrar">✕</button>

        <!-- Tabs de cambio entre misiones dentro del popup -->
        <div style="display:flex;gap:6px;margin-bottom:18px;margin-right:32px;">
          <button onclick="openSecretMissionModal('positive')" class="btn" style="flex:1;padding:8px 10px;font-size:0.82rem;font-weight:700;border-radius:8px;background:${isPos ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)'};color:${isPos ? '#34d399' : 'var(--text-dim)'};border:1px solid ${isPos ? '#10b981' : 'rgba(255,255,255,0.1)'};">
            ⭐ Misión Personal
          </button>
          <button onclick="openSecretMissionModal('attack')" class="btn" style="flex:1;padding:8px 10px;font-size:0.82rem;font-weight:700;border-radius:8px;background:${!isPos ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'};color:${!isPos ? '#f87171' : 'var(--text-dim)'};border:1px solid ${!isPos ? '#ef4444' : 'rgba(255,255,255,0.1)'};">
            ⚔️ Contraataque
          </button>
        </div>

        <!-- Cabecera de la Misión -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:0.85rem;font-weight:800;color:${accentColor};letter-spacing:.5px;">${tag}</span>
          <span class="badge" style="font-size:0.82rem;background:${badgeBg};border:1px solid ${accentColor};color:${accentColor};padding:3px 10px;font-weight:800;">
            ${escapeHtml(m.pts)}
          </span>
        </div>

        <!-- Misión en Línea con Tipografía Ampliada -->
        <div style="background:rgba(0,0,0,0.35);border:1.5px solid ${borderColor};border-radius:12px;padding:16px;margin-bottom:14px;box-shadow:inset 0 0 20px rgba(0,0,0,0.35);">
          <div style="font-size:1.02rem;line-height:1.55;color:#e2e8f0;">
            <strong style="color:#fff;font-size:1.15rem;display:inline;margin-right:6px;">${escapeHtml(m.titulo.toUpperCase())}:</strong>
            <span>${escapeHtml(m.desc)}</span>
          </div>
        </div>

        <!-- Instrucciones de Ejecución -->
        <div style="font-size:0.8rem;color:var(--text-dim);background:rgba(255,255,255,0.03);border-radius:8px;padding:10px;margin-bottom:18px;line-height:1.4;">
          ${tip}
        </div>

        <!-- Botones de Acción -->
        <div style="display:flex;gap:8px;">
          <button onclick="downloadCombinedMissionsCard()" class="btn btn-primary" style="flex:1;padding:12px 14px;font-size:0.88rem;font-weight:800;background:linear-gradient(135deg,#059669,#dc2626);border:none;border-radius:8px;box-shadow:0 0 16px rgba(16,185,129,0.35);">
            ⬇️ Descargar Tarjeta Unificada (Ambas Misiones) PNG
          </button>
          <button onclick="closeSecretMissionModal()" class="btn btn-ghost" style="padding:10px 14px;font-size:0.84rem;">
            Cerrar
          </button>
        </div>

      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.closeSecretMissionModal = function () {
  const p = document.getElementById('secret-mission-popup');
  if (p) p.remove();
};

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (window.closeSecretMissionModal) window.closeSecretMissionModal();
    if (window.closeDailyCardModal) window.closeDailyCardModal();
  }
});

// ── DESCARGA DE TARJETA UNIFICADA (Misión Personal + Contraataque en 1 sola imagen) ──
window.downloadCombinedMissionsCard = async function () {
  if (!secretMissionsRevealed || !currentPositiveMission || !currentAttackMission) {
    window.generateSecretMissions();
  }

  const canvas = document.createElement('canvas');
  const W = 750, H = 910;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const theme = getCardSkinTheme();
  const logoImg = await loadCardImage('imagenes/LOGO AMIGOS JUGONES.png');

  // 1. Fondo tecnológico con gradiente adaptado al skin
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0d0818');
  bgGrad.addColorStop(0.5, '#07050f');
  bgGrad.addColorStop(1, '#040207');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Matriz hexagonal cibernética de fondo
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

  // 3. Halos atmosféricos duales (Esmeralda arriba / Carmesí abajo)
  const topGlow = ctx.createRadialGradient(W / 2, 280, 20, W / 2, 280, 280);
  topGlow.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
  topGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  const botGlow = ctx.createRadialGradient(W / 2, 640, 20, W / 2, 640, 280);
  botGlow.addColorStop(0, 'rgba(239, 68, 68, 0.14)');
  botGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = botGlow;
  ctx.fillRect(0, 0, W, H);

  // 4. Doble marco exterior de seguridad con glow del skin
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

  drawSciFiCorners(ctx, 24, 24, W - 48, H - 48, 28, theme.primary);

  // 5. Cabecera Oficial (Logo Amigos Jugones + Insignias de Clasificación)
  const headerY = 34;
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

  ctx.save();
  // Badge Clasificado
  ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
  roundRectPath(ctx, textLeft, headerY + 4, 160, 24, 6);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🔒 CLASIFICADO · SOLO TUYA', textLeft + 8, headerY + 20);

  // Badge Skin activo
  ctx.fillStyle = theme.badgeBg;
  roundRectPath(ctx, textLeft + 170, headerY + 4, 150, 24, 6);
  ctx.fill();
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = theme.badgeText;
  ctx.fillText(theme.emoji + ' ' + theme.name, textLeft + 178, headerY + 20);
  ctx.restore();

  // Título de la tarjeta unificada
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText('TARJETA DE MISIONES SECRETAS', textLeft, headerY + 56);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '600 13px sans-serif';
  ctx.fillText('📅 ' + getFechaMisionHoy('largo') + ' · 2 Pruebas Confidenciales', textLeft, headerY + 78);
  ctx.restore();

  const cardW = W - 76; // 674px

  // Helper de renderizado de misión secreta en línea con tipografía ampliada
  function drawSecretMissionInline(missionTitle, missionDesc, startX, startY, maxW, titleColor, descColor) {
    const titlePrefix = missionTitle.toUpperCase() + ': ';
    ctx.font = 'bold 18.5px sans-serif';
    const titleW = ctx.measureText(titlePrefix).width;

    ctx.font = '500 16.5px sans-serif';
    const words = (missionDesc || '').split(' ');
    let lines = [];
    let currentWords = [];
    let currentWidth = titleW;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordW = ctx.measureText(word + ' ').width;

      if (currentWidth + wordW <= maxW) {
        currentWords.push(word);
        currentWidth += wordW;
      } else {
        lines.push(currentWords.join(' '));
        currentWords = [word];
        currentWidth = wordW;
      }
    }
    if (currentWords.length > 0) {
      lines.push(currentWords.join(' '));
    }

    const lineHeight = 26;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Línea 1: TÍTULO: + texto inicial
    ctx.font = 'bold 18.5px sans-serif';
    ctx.fillStyle = titleColor;
    ctx.fillText(titlePrefix, startX, startY);

    if (lines.length > 0) {
      ctx.font = '500 16.5px sans-serif';
      ctx.fillStyle = descColor;
      ctx.fillText(lines[0], startX + titleW, startY);
    }

    // Líneas subsiguientes
    for (let l = 1; l < lines.length; l++) {
      ctx.font = '500 16.5px sans-serif';
      ctx.fillStyle = descColor;
      ctx.fillText(lines[l], startX, startY + l * lineHeight);
    }
  }

  // 6. TARJETA SUPERIOR: Misión Personal (Vía Sana) (Y: 134 to 444)
  const posCardY = 134;
  const posCardH = 310;

  ctx.save();
  const posGrad = ctx.createLinearGradient(38, posCardY, 38, posCardY + posCardH);
  posGrad.addColorStop(0, 'rgba(10, 36, 22, 0.94)');
  posGrad.addColorStop(1, 'rgba(5, 18, 12, 0.98)');
  ctx.fillStyle = posGrad;
  roundRectPath(ctx, 38, posCardY, cardW, posCardH, 16);
  ctx.fill();

  ctx.shadowColor = 'rgba(16, 185, 129, 0.35)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Header interno de la tarjeta positiva
  ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
  roundRectPath(ctx, 48, posCardY + 10, cardW - 20, 40, 8);
  ctx.fill();

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('⭐ MISIÓN PERSONAL (VÍA SANA)', 62, posCardY + 35);

  // Pastilla grande de Recompensa
  const rewW = 135;
  const rewX = 38 + cardW - rewW - 16;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
  roundRectPath(ctx, rewX, posCardY + 14, rewW, 32, 16);
  ctx.fill();
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '900 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(currentPositiveMission.pts, rewX + rewW / 2, posCardY + 35);

  // Contenedor principal con misión en línea
  const pBoxY = posCardY + 58;
  const pBoxH = 168;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  roundRectPath(ctx, 50, pBoxY, cardW - 24, pBoxH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Texto en línea: TÍTULO: Descripción con tipografía grande y legible
  drawSecretMissionInline(
    currentPositiveMission.titulo,
    currentPositiveMission.desc,
    66,
    pBoxY + 38,
    cardW - 56,
    '#ffffff',
    '#e2e8f0'
  );

  // Tip de validación
  const pTipY = posCardY + 236;
  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
  roundRectPath(ctx, 50, pTipY, cardW - 24, 60, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12.5px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('💡 CÓMO RECLAMAR TUS PUNTOS:', 66, pTipY + 23);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 12.5px sans-serif';
  ctx.fillText('Publica tu prueba o captura en el chat de WhatsApp al cumplirla para sumar a la tabla.', 66, pTipY + 45);
  ctx.restore();

  // 7. DIVISOR CENTRAL HUD TECNOLÓGICO (Y: 460)
  const divY = 460;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(48, divY);
  ctx.lineTo(W / 2 - 130, divY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W / 2 + 130, divY);
  ctx.lineTo(W - 48, divY);
  ctx.stroke();

  // Badge central
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  roundRectPath(ctx, W / 2 - 125, divY - 14, 250, 28, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f5c518';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚔️ O BIEN ELIGE EL SABOTAJE ⚔️', W / 2, divY + 4);
  ctx.restore();

  // 8. TARJETA INFERIOR: Misión de Contraataque (Sabotaje) (Y: 476 to 786)
  const atkCardY = 476;
  const atkCardH = 310;

  ctx.save();
  const atkGrad = ctx.createLinearGradient(38, atkCardY, 38, atkCardY + atkCardH);
  atkGrad.addColorStop(0, 'rgba(46, 12, 16, 0.94)');
  atkGrad.addColorStop(1, 'rgba(22, 5, 8, 0.98)');
  ctx.fillStyle = atkGrad;
  roundRectPath(ctx, 38, atkCardY, cardW, atkCardH, 16);
  ctx.fill();

  ctx.shadowColor = 'rgba(239, 68, 68, 0.35)';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Header interno de la tarjeta de ataque
  ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
  roundRectPath(ctx, 48, atkCardY + 10, cardW - 20, 40, 8);
  ctx.fill();

  ctx.fillStyle = '#fca5a5';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('⚔️ CONTRAATAQUE (SABOTAJE)', 62, atkCardY + 35);

  // Pastilla grande de Impacto
  const impW = 185;
  const impX = 38 + cardW - impW - 16;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
  roundRectPath(ctx, impX, atkCardY + 14, impW, 32, 16);
  ctx.fill();
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fecaca';
  ctx.font = '900 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(currentAttackMission.pts, impX + impW / 2, atkCardY + 35);

  // Contenedor principal con misión de ataque en línea
  const aBoxY = atkCardY + 58;
  const aBoxH = 168;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  roundRectPath(ctx, 50, aBoxY, cardW - 24, aBoxH, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Texto en línea: TÍTULO: Descripción con tipografía grande y legible
  drawSecretMissionInline(
    currentAttackMission.titulo,
    currentAttackMission.desc,
    66,
    aBoxY + 38,
    cardW - 56,
    '#ffffff',
    '#e2e8f0'
  );

  // Tip de victoria
  const aTipY = atkCardY + 236;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  roundRectPath(ctx, 50, aTipY, cardW - 24, 60, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 12.5px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('💣 CONDICIÓN DE VICTORIA DEL SABOTAJE:', 66, aTipY + 23);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 12.5px sans-serif';
  ctx.fillText('Ejecuta la prueba en el chat sin ser descubierto. ¡Descuenta puntos a los de arriba!', 66, aTipY + 45);
  ctx.restore();

  // 9. Footer Confidencial y Watermark
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('⚠️ DOCUMENTO CONFIDENCIAL · NO COMPARTAS ANTES DE EJECUTAR PARA NO SER DESCUBIERTO', W / 2, 822);

  // Sello de Clave Semanal Web para referencia directa
  const keyInput = document.getElementById('daily-card-weekly-key');
  let weeklyKey = (keyInput ? keyInput.value.trim().toUpperCase() : '');
  if (!weeklyKey) {
    try { weeklyKey = localStorage.getItem('aj_weekly_key') || 'AJ2026'; } catch (e) { weeklyKey = 'AJ2026'; }
  }

  const keyY = 844;
  const keyBadgeW = 390;
  const keyBadgeH = 34;
  const keyBadgeX = (W - keyBadgeW) / 2;

  const keyGrad = ctx.createLinearGradient(keyBadgeX, keyY, keyBadgeX + keyBadgeW, keyY);
  keyGrad.addColorStop(0, 'rgba(124, 58, 237, 0.35)');
  keyGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
  keyGrad.addColorStop(1, 'rgba(124, 58, 237, 0.35)');
  ctx.fillStyle = keyGrad;
  roundRectPath(ctx, keyBadgeX, keyY, keyBadgeW, keyBadgeH, 8);
  ctx.fill();

  ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c518';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('🔑 CLAVE SEMANAL WEB: ', keyBadgeX + 115, keyY + 22);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 14px monospace';
  ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText(weeklyKey, keyBadgeX + 265, keyY + 22);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.font = '11px monospace';
  ctx.fillText('AMIGOS JUGONES OFICIAL · TARJETA UNIFICADA ' + theme.id.toUpperCase() + ' · AMIGOSJUGONES.CL', W / 2, H - 18);
  ctx.restore();

  // Descarga directa
  const a = document.createElement('a');
  a.download = 'misiones_secretas_unificadas_' + theme.id + '_' + Date.now() + '.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
};

// Aliases para retrocompatibilidad total
window.downloadBothMissions = window.downloadCombinedMissionsCard;
window.downloadSecretMission = window.downloadCombinedMissionsCard;
window.downloadPositiveMission = window.downloadCombinedMissionsCard;
window.downloadAttackMission = window.downloadCombinedMissionsCard;
window.generateSecretMission = window.generateSecretMissions;

window.switchRankTab = function (tab) {
  ['main', 'race', 'fight'].forEach(function (t) {
    var btn = document.getElementById('rt-btn-' + t);
    var panel = document.getElementById('rt-panel-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
  });
};

// --- Función para obtener fecha dinámica de misiones (día + fecha + año) ---
function getFechaMisionHoy(formato) {
  const ahora = new Date();
  const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diasLargos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesLargos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const diaSemanaC = diasCortos[ahora.getDay()];
  const diaSemanaL = diasLargos[ahora.getDay()];
  const diaNum = ahora.getDate();
  const mesC = mesesCortos[ahora.getMonth()];
  const mesL = mesesLargos[ahora.getMonth()];
  const anio = ahora.getFullYear();

  if (formato === 'largo') {
    return `${diaSemanaL}, ${diaNum} de ${mesL} de ${anio}`;
  }
  if (formato === 'titulo') {
    return `${diaSemanaL} ${diaNum} ${mesC} ${anio}`;
  }
  // Formato por defecto para badge: día abreviado + número de día + mes + año (ej: "Sáb, 10 Oct 2026")
  return `${diaSemanaC}, ${diaNum} ${mesC} ${anio}`;
}

function renderTCGDailyWidget(ptsValue) {
  var pts = ptsValue || 5;
  window._tcgDailyPts = pts;
  return `
    <div id="card-daily-public" class="tcg-mission-card" onclick="openDailyCardModal()" title="Toca para ver las Misiones del Día">

      <!-- Efecto Holo-Foil iridiscente de carta coleccionable -->
      <div class="tcg-holo-foil"></div>

      <!-- Fondo HUD Sci-Fi: Patrón hexagonal y circuitos vectoriales -->
      <div class="tcg-scifi-hex-grid"></div>

      <!-- Esquinas tecnológicas cortadas Sci-Fi (Chamfered HUD Brackets) -->
      <div class="tcg-hud-chamfer-corners">
        <span class="hud-corner top-left"></span>
        <span class="hud-corner top-right"></span>
        <span class="hud-corner bottom-left"></span>
        <span class="hud-corner bottom-right"></span>
      </div>

      <!-- Marco interior con glow -->
      <div class="tcg-inner-frame">

        <!-- Jerarquía superior: Insignias badge semitransparentes -->
        <div class="tcg-card-top-tag">
          <span class="tcg-tag-badge tcg-badge-public">★ MISIÓN PÚBLICA ★</span>
          <span class="tcg-tag-badge tcg-badge-code">⚡ #01-DAILY</span>
        </div>

        <!-- Título superior con relieve cibernético -->
        <div class="tcg-card-title">
          <span>MISIONES</span>
          <span>DEL DÍA</span>
        </div>

        <!-- Divisor Sci-Fi HUD con medidor de energía -->
        <div class="tcg-hud-divider">
          <span class="tcg-hud-line"></span>
          <span class="tcg-hud-gem">◆</span>
          <span class="tcg-hud-line"></span>
        </div>

        <!-- Insignia Central: Escudo Oficial Metálico con Halo de Energía -->
        <div class="tcg-shield-wrap">
          <div class="tcg-energy-halo tcg-shield-halo"></div>

          <div class="tcg-shield-container">
            <img src="imagenes/escudo.png" alt="Escudo de Puntos Misiones del Día" class="tcg-shield-img" />
            <div class="tcg-shield-content">
              <span class="tcg-medal-pts">${pts}</span>
              <span class="tcg-medal-label">PTS</span>
            </div>
          </div>
        </div>

        <!-- Placa de texto de recompensa con logo integrado -->
        <div class="tcg-reward-plate">
          <div class="tcg-card-footer-text">
            EL PRIMERO EN LLEGAR A<br>
            <strong>1000</strong> PUNTOS SE LLEVA UN<br>
            JUEGO DE MESA COMO PREMIO
          </div>
          <div class="tcg-card-logo">
            <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones">
          </div>
        </div>

        <!-- Botón llamativo para ver los desafíos y disparar el popup -->
        <button type="button" class="tcg-action-btn" onclick="event.stopPropagation(); openDailyCardModal();" title="Toca para ver los desafíos de hoy">
          <span class="tcg-btn-shimmer"></span>
          <span class="tcg-btn-content">🎯 VER MISIONES DEL DÍA</span>
        </button>

      </div>
    </div>
  `;
}

function renderPersonalMissionCard() {
  // Tarjeta Personal Secreta con arquitectura visual simétrica a la carta TCG pública
  const revealed = secretMissionsRevealed;
  const posTit = (revealed && currentPositiveMission) ? currentPositiveMission.titulo : '???';
  const atkTit = (revealed && currentAttackMission) ? currentAttackMission.titulo : '???';
  return `
    <div id="card-personal-missions" class="home-mission-card personal-card" onclick="openSecretMissionModal('positive')" title="Toca para ver tu Tarjeta Personal Secreta">

      <!-- Efecto Holo-Foil iridiscente en tonos carmesí/magenta -->
      <div class="tcg-holo-foil personal-holo"></div>

      <!-- Fondo HUD Sci-Fi: Patrón hexagonal y circuitos vectoriales -->
      <div class="tcg-scifi-hex-grid personal-grid"></div>

      <!-- Esquinas tecnológicas cortadas Sci-Fi en rosa/violeta -->
      <div class="tcg-hud-chamfer-corners">
        <span class="hud-corner top-left pink-corner"></span>
        <span class="hud-corner top-right pink-corner"></span>
        <span class="hud-corner bottom-left pink-corner"></span>
        <span class="hud-corner bottom-right pink-corner"></span>
      </div>

      <!-- Marco interior con glow -->
      <div class="tcg-inner-frame">

        <!-- Jerarquía superior: Insignias badge semitransparentes -->
        <div class="tcg-card-top-tag">
          <span class="tcg-tag-badge personal-badge-secret">🔒 CLASIFICADO</span>
          <span class="tcg-tag-badge personal-badge-solo">SOLO TUYA</span>
        </div>

        <!-- Título superior con relieve cibernético: MISIÓN / SECRETA -->
        <div class="tcg-card-title personal-title">
          <span>MISIÓN</span>
          <span>SECRETA</span>
        </div>

        <!-- Indicador HUD / acento triangular neón -->
        <div class="personal-sub-indicator">▲</div>

        <!-- Contenedor central: Sobre Top Secret confidencial -->
        <div class="personal-envelope-wrap">
          <div class="personal-envelope-halo"></div>
          <img src="imagenes/sobre top secret.png" alt="Sobre Top Secret" class="personal-envelope-img" />
        </div>

        <!-- Placa de misiones secretas con 2 slots HUD estilizados -->
        <div class="personal-missions-plate">
          <div class="personal-slot-item positive-slot">
            <span class="slot-badge-icon">⭐</span>
            <div class="slot-text-wrap">
              <span class="slot-tag-label">APOYO</span>
              <span class="slot-title-text">${escapeHtml(posTit)}</span>
            </div>
          </div>
          <div class="personal-slot-item attack-slot">
            <span class="slot-badge-icon">⚔️</span>
            <div class="slot-text-wrap">
              <span class="slot-tag-label">ATAQUE:</span>
              <span class="slot-title-text">${escapeHtml(atkTit)}</span>
            </div>
          </div>
        </div>

        <!-- Botón llamativo con Shimmer para ver la misión secreta -->
        <button type="button" class="tcg-action-btn personal-action-btn" onclick="event.stopPropagation(); openSecretMissionModal('positive');" title="Toca para ver o revelar tus misiones secretas">
          <span class="tcg-btn-shimmer"></span>
          <span class="tcg-btn-content">🔐 VER MISIÓN SECRETA</span>
        </button>

      </div>
    </div>
  `;
}

function renderArcadeLauncher() {
  return `
    <div class="arcade-launcher-wrap">
      <div class="arcade-launcher-header">
        <span class="arcade-header-title">🎮 Juegos & Arcade</span>
        <span class="arcade-header-badge">⚡ SUITE OFICIAL</span>
      </div>
      <div class="arcade-launcher-grid" style="grid-template-columns: 1fr;">

        <!-- Banner Unificado: Suite de Juegos & Arcade -->
        <a href="juegos.html" class="microgames-unified-banner" title="Entrar a la Suite de Juegos y Arcade">
          <div class="arcade-banner-main-col">
            <div class="arcade-banner-icon">🕹️</div>
            <div class="arcade-banner-text-block">
              <div class="arcade-banner-tags-row">
                <span class="arcade-tag-pill">⚡ ARCADE & GENERADORES</span>
                <span class="arcade-renta-pill">Top 3 Renta Diaria (+3/+2/+1 PTS)</span>
              </div>
              <div class="arcade-game-title">Suite de Juegos & Máquinas Arcade</div>
              <div class="arcade-game-subtitle">Circuito Black · Cyber Ninja · CollageBG · TriviaBG · VersusBG y más</div>
            </div>
          </div>
          <span class="arcade-start-btn arcade-banner-hub-btn">
            Entrar al Hub ➔
          </span>
        </a>

      </div>
    </div>
  `;
}

