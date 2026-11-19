// ==========================================================================
// Pistas Jugonas AMIGOS JUGONES — App Engine (Slots Dinámicos 1-5 & Official Card Design)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── SEGURIDAD: NOMBRES RESERVADOS ─────────────────────────────────────────
  const PROTECTED_NAMES = ['amigosjugonesymas', 'amigosjugones', 'black', 'jessy'];
  const PROTECTED_SECRET_PASS = 'admin123';

  function isProtectedName(str) {
    if (!str) return false;
    const clean = str.toLowerCase().trim().replace(/^@+/, '').replace(/[\s_\-\.]/g, '');
    return PROTECTED_NAMES.some(n => {
      return clean.includes(n.toLowerCase().replace(/[\s_\-\.]/g, ''));
    });
  }

  function checkProtectedNameAccess(nameStr, igStr) {
    const matched = isProtectedName(nameStr) ? nameStr.trim()
      : isProtectedName(igStr) ? igStr.trim() : null;
    if (!matched) return Promise.resolve(true);

    return new Promise((resolve) => {
      let modalEl = document.getElementById('protected-name-modal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'protected-name-modal';
        modalEl.style.cssText = `
          position:fixed;inset:0;z-index:99999;
          background:rgba(10,15,25,0.88);backdrop-filter:blur(8px);
          display:flex;align-items:center;justify-content:center;padding:20px;
          font-family:'Outfit',sans-serif;
        `;
        document.body.appendChild(modalEl);
      }
      modalEl.innerHTML = `
        <div style="background:#151d2a;border:1px solid rgba(255,209,0,0.4);
          border-radius:16px;padding:28px;max-width:420px;width:100%;
          box-shadow:0 20px 50px rgba(0,0,0,0.7);color:#fff;text-align:center;">
          <div style="font-size:42px;margin-bottom:12px;">🔒</div>
          <h3 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#ffd100;">Nombre Reservado</h3>
          <p style="margin:0 0 16px;font-size:14px;color:#cbd5e1;line-height:1.5;">
            <strong style="color:#ffd100;">"${matched}"</strong> pertenece al equipo oficial de <strong>Amigos Jugones</strong>.
          </p>
          <input type="password" id="protected-pass-input" placeholder="Contraseña de administrador"
            style="width:100%;box-sizing:border-box;padding:12px 14px;margin-bottom:12px;
            border-radius:8px;border:1px solid rgba(255,209,0,0.3);background:#0f172a;
            color:#fff;font-size:15px;outline:none;text-align:center;" />
          <div id="protected-pass-error" style="color:#ff4d4d;font-size:13px;margin-bottom:12px;display:none;font-weight:600;">
            Contraseña incorrecta.
          </div>
          <div style="display:flex;gap:10px;justify-content:center;">
            <button id="btn-cancel-protected" style="padding:10px 18px;border-radius:8px;
              border:1px solid #475569;background:transparent;color:#cbd5e1;font-weight:600;cursor:pointer;">
              Cancelar
            </button>
            <button id="btn-verify-protected" style="padding:10px 20px;border-radius:8px;border:none;
              background:linear-gradient(135deg,#ffd100,#e85d9e);color:#0f172a;font-weight:800;cursor:pointer;">
              Verificar y Continuar
            </button>
          </div>
        </div>`;
      modalEl.style.display = 'flex';
      const inp = document.getElementById('protected-pass-input');
      const err = document.getElementById('protected-pass-error');
      inp.focus();
      function check() {
        if (inp.value.trim() === PROTECTED_SECRET_PASS) {
          modalEl.style.display = 'none'; resolve(true);
        } else {
          err.style.display = 'block'; inp.style.borderColor = '#ff4d4d';
          inp.value = ''; inp.focus();
        }
      }
      document.getElementById('btn-verify-protected').onclick = check;
      inp.onkeydown = e => { if (e.key === 'Enter') check(); };
      document.getElementById('btn-cancel-protected').onclick = () => {
        modalEl.style.display = 'none'; resolve(false);
      };
    });
  }

  // ── HELPER ROUNDRECT ──────────────────────────────────────────────────────
  function drawRoundRect(ctx, x, y, w, h, radii = 0) {
    if (typeof ctx.roundRect === 'function') {
      try {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radii);
        return;
      } catch (e) {}
    }
    let r = 0;
    if (typeof radii === 'number') {
      r = radii;
    } else if (Array.isArray(radii) && radii.length > 0) {
      r = radii[0];
    }
    r = Math.min(Math.abs(r || 0), Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ── ESTADO & MARCA ────────────────────────────────────────────────────────
  const MAX_SLOTS = 5;
  const MIN_SLOTS = 1;
  let currentMode         = 'multi';
  let currentPreviewTab   = 'clues';
  let generatedResults    = [];
  let liveDebounceTimer   = null;

  // Slot data: { clue: string, answer: string }
  let slots = [{ clue: '', answer: '' }];

  let brandLogoImg = null;
  let brandQRImg = null;
  let brandBlackLogoImg = null;

  function loadBrandLogo() {
    return new Promise((resolve) => {
      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        resolve(brandLogoImg); return;
      }
      const img = new Image();
      const src = (typeof window !== 'undefined' && window.BRAND_LOGO_DATA_URL) ? window.BRAND_LOGO_DATA_URL : 'assets/logo.png';
      img.src = src;
      img.onload = () => { brandLogoImg = img; resolve(img); };
      img.onerror = () => {
        if (img.src !== 'assets/logo.png') {
          const fb = new Image(); fb.src = 'assets/logo.png';
          fb.onload = () => { brandLogoImg = fb; resolve(fb); };
          fb.onerror = () => resolve(null);
        } else resolve(null);
      };
    });
  }

  function loadBrandQR() {
    return new Promise((resolve) => {
      if (brandQRImg && brandQRImg.complete && brandQRImg.naturalWidth > 0) {
        resolve(brandQRImg); return;
      }
      const img = new Image();
      const src = (typeof window !== 'undefined' && window.BRAND_QR_DATA_URL) ? window.BRAND_QR_DATA_URL : 'assets/amigosjugonesymas_qr.png';
      img.src = src;
      img.onload = () => { brandQRImg = img; resolve(img); };
      img.onerror = () => {
        if (img.src !== 'assets/amigosjugonesymas_qr.png') {
          const fb = new Image(); fb.src = 'assets/amigosjugonesymas_qr.png';
          fb.onload = () => { brandQRImg = fb; resolve(fb); };
          fb.onerror = () => resolve(null);
        } else resolve(null);
      };
    });
  }

  function loadBrandBlackLogo() {
    return new Promise((resolve) => {
      if (brandBlackLogoImg && brandBlackLogoImg.complete && brandBlackLogoImg.naturalWidth > 0) {
        resolve(brandBlackLogoImg); return;
      }
      const img = new Image();
      const src = (typeof window !== 'undefined' && window.BLACK_LOGO_DATA_URL) ? window.BLACK_LOGO_DATA_URL : 'assets/logo_black.png';
      img.src = src;
      img.onload = () => { brandBlackLogoImg = img; resolve(img); };
      img.onerror = () => {
        if (img.src !== 'assets/logo_black.png') {
          const fb = new Image(); fb.src = 'assets/logo_black.png';
          fb.onload = () => { brandBlackLogoImg = fb; resolve(fb); };
          fb.onerror = () => resolve(null);
        } else resolve(null);
      };
    });
  }

  Promise.all([loadBrandLogo(), loadBrandQR(), loadBrandBlackLogo()]).then(() => {
    scheduleLiveUpdate();
  });

  // DOM refs
  const tabModeMulti          = document.getElementById('tabModeMulti');
  const tabModeSingle         = document.getElementById('tabModeSingle');
  const clueSlotsList         = document.getElementById('clueSlotsList');
  const addClueBtn            = document.getElementById('addClueBtn');
  const slotsCounter          = document.getElementById('slotsCounter');
  const singleAnswerContainer = document.getElementById('singleAnswerContainer');
  const ratioSquareLabel     = document.getElementById('ratioSquareLabel');
  const ratioVerticalLabel   = document.getElementById('ratioVerticalLabel');
  const ratioInputs          = document.getElementsByName('aspectRatio');
  const creatorNameInput     = document.getElementById('creatorNameInput');
  const creatorIgInput       = document.getElementById('creatorIgInput');
  const categoryInput        = document.getElementById('categoryInput');
  const generateBtn          = document.getElementById('generateBtn');
  const regenerateBtn        = document.getElementById('regenerateBtn');
  const loader               = document.getElementById('loader');
  const resultsSection       = document.getElementById('resultsSection');
  const cardsGrid            = document.getElementById('cardsGrid');
  const downloadAllBtn       = document.getElementById('downloadAllBtn');
  const livePreviewCanvas    = document.getElementById('livePreviewCanvas');
  const prevTabClues         = document.getElementById('prevTabClues');
  const prevTabAnswers       = document.getElementById('prevTabAnswers');
  const cluesCanvas          = document.getElementById('cluesCanvas');
  const answersCanvas        = document.getElementById('answersCanvas');

  // ── RENDERIZADO DE SLOTS EN EL DOM ────────────────────────────────────────
  function renderSlots() {
    clueSlotsList.innerHTML = '';
    const isMulti = currentMode === 'multi';

    slots.forEach((slot, i) => {
      const div = document.createElement('div');
      div.className = 'clue-slot';
      div.dataset.index = i;

      const canRemove = slots.length > MIN_SLOTS;
      const removeBtn = canRemove
        ? `<button type="button" class="btn-remove-slot" data-remove="${i}">✕ Eliminar</button>`
        : '';

      const answerField = isMulti ? `
        <div>
          <p class="slot-field-label">✅ Respuesta / Juego</p>
          <input type="text" class="form-control slot-answer"
            data-index="${i}"
            placeholder="Ej. Catan, 7 Wonders..."
            value="${escHtml(slot.answer)}"
            autocomplete="off">
        </div>` : '';

      div.innerHTML = `
        <div class="clue-slot-header">
          <div class="clue-slot-label">
            <span class="badge-num">${i + 1}</span>
            ${isMulti ? `Pista ${i + 1} + Juego ${i + 1}` : `Pista ${i + 1}`}
          </div>
          ${removeBtn}
        </div>
        <div class="clue-slot-body ${isMulti ? 'with-answer' : ''}">
          <div>
            <p class="slot-field-label">🔍 Pista</p>
            <textarea class="form-control clue-textarea slot-clue"
              data-index="${i}" rows="3"
              placeholder="Texto o emojis... ej: ⚡️🏭🔌"
            >${escHtml(slot.clue)}</textarea>
          </div>
          ${answerField}
        </div>`;

      clueSlotsList.appendChild(div);
    });

    // Update counter and add button
    slotsCounter.textContent = `${slots.length} / ${MAX_SLOTS}`;
    addClueBtn.disabled = slots.length >= MAX_SLOTS;

    // Single mode answer section
    if (currentMode === 'single') {
      singleAnswerContainer.classList.remove('hidden');
    } else {
      singleAnswerContainer.classList.add('hidden');
    }

    // Re-attach input listeners
    attachSlotListeners();
    scheduleLiveUpdate();
  }

  function escHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function attachSlotListeners() {
    clueSlotsList.querySelectorAll('.slot-clue').forEach(el => {
      el.addEventListener('input', e => {
        const idx = parseInt(e.target.dataset.index);
        slots[idx].clue = e.target.value;
        scheduleLiveUpdate();
      });
    });
    clueSlotsList.querySelectorAll('.slot-answer').forEach(el => {
      el.addEventListener('input', e => {
        const idx = parseInt(e.target.dataset.index);
        slots[idx].answer = e.target.value;
        scheduleLiveUpdate();
      });
    });
    clueSlotsList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.remove);
        if (slots.length > MIN_SLOTS) {
          slots.splice(idx, 1);
          renderSlots();
        }
      });
    });
  }

  // ── MODO: MULTI / SINGLE ──────────────────────────────────────────────────
  tabModeMulti.addEventListener('click', () => {
    currentMode = 'multi';
    tabModeMulti.classList.add('active');
    tabModeSingle.classList.remove('active');
    renderSlots();
  });

  tabModeSingle.addEventListener('click', () => {
    currentMode = 'single';
    tabModeSingle.classList.add('active');
    tabModeMulti.classList.remove('active');
    renderSlots();
  });

  // ADD SLOT
  addClueBtn.addEventListener('click', () => {
    if (slots.length < MAX_SLOTS) {
      slots.push({ clue: '', answer: '' });
      renderSlots();
      const newTextareas = clueSlotsList.querySelectorAll('.slot-clue');
      const last = newTextareas[newTextareas.length - 1];
      if (last) last.focus();
    }
  });

  // RATIO
  ratioInputs.forEach(radio => {
    radio.addEventListener('change', e => {
      if (e.target.value === '1:1') {
        ratioSquareLabel.classList.add('active');
        ratioVerticalLabel.classList.remove('active');
      } else {
        ratioVerticalLabel.classList.add('active');
        ratioSquareLabel.classList.remove('active');
      }
      scheduleLiveUpdate();
    });
  });

  [creatorNameInput, creatorIgInput, categoryInput].forEach(el => {
    if (el) el.addEventListener('input', scheduleLiveUpdate);
  });

  // Single answer inputs
  ['singleAnsInput','singleCatInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', scheduleLiveUpdate);
  });

  // ── CANVAS ENGINE: OFFICIAL AMIGOS JUGONES DESIGN STANDARD ─────────────

  function getAspectRatio() {
    const r = document.querySelector('input[name="aspectRatio"]:checked');
    return r ? r.value : '1:1';
  }

  // 1. Subtle Anti-Theft Watermark Overlay
  function drawAntiTheftWatermark(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.rotate(-Math.PI / 7.5);

    const watermarkText = 'SÍGUENOS EN INSTAGRAM @AMIGOSJUGONESYMAS';
    const stepX = 380;
    const stepY = 150;
    const maxDim = Math.max(w, h) * 2;

    for (let y = -maxDim; y < maxDim * 2; y += stepY) {
      const rowOffset = (Math.abs(Math.floor(y / stepY)) % 2 === 0) ? 0 : stepX / 2;
      for (let x = -maxDim; x < maxDim * 2; x += stepX) {
        ctx.fillText(watermarkText, x + rowOffset, y);
      }
    }
    ctx.restore();
  }

  // 2. Background Grid Overlay (Matching Suite standard)
  function drawBackgroundGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 93, 158, 0.08)';
    ctx.lineWidth = 1;
    const step = 60;
    for (let x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Overall Background
  function drawBackground(ctx, w, h) {
    ctx.fillStyle = '#120822';
    ctx.fillRect(0, 0, w, h);

    const g1 = ctx.createRadialGradient(0, 0, 10, w * 0.4, h * 0.4, w * 0.8);
    g1.addColorStop(0, 'rgba(123, 59, 198, 0.35)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    const g2 = ctx.createRadialGradient(w, h, 10, w * 0.6, h * 0.6, w * 0.8);
    g2.addColorStop(0, 'rgba(255, 46, 76, 0.28)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    drawBackgroundGrid(ctx, w, h);
    drawAntiTheftWatermark(ctx, w, h);
  }

  // 4. Official Suite Card Header (Story 9:16 & Square 1:1)
  function drawCardHeader(ctx, canvasW = 1080, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const headerH = isVertical ? 200 : 140;

    ctx.save();

    // Dark header panel
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, 0, canvasW, headerH);

    const logoSize = isVertical ? 145 : 105;
    const gapX = isVertical ? 24 : 18;

    const mainTitleStr = 'PISTAS JUGONAS';
    const subTitleStr = '🧩 Pistas Reveladoras — Amigos Jugones';

    ctx.font = isVertical ? '900 58px "Outfit", sans-serif' : '900 42px "Outfit", sans-serif';
    const titleW = ctx.measureText(mainTitleStr).width;

    ctx.font = isVertical ? '700 25px "Outfit", sans-serif' : '700 19px "Outfit", sans-serif';
    const subW = ctx.measureText(subTitleStr).width;

    const textW = Math.max(titleW, subW);
    const totalUnitW = logoSize + gapX + textW;

    const startX = Math.round((canvasW - totalUnitW) / 2);
    const logoX = startX;
    const logoY = Math.round((headerH - logoSize) / 2);
    const centerY = Math.round(headerH / 2);

    // Decorative Glowing Side Lines framing central unit
    const leftLineEnd = startX - (isVertical ? 25 : 20);
    const leftLineStart = isVertical ? 45 : 35;
    if (leftLineEnd > leftLineStart) {
      ctx.save();
      const leftGrad = ctx.createLinearGradient(leftLineStart, 0, leftLineEnd, 0);
      leftGrad.addColorStop(0, 'rgba(255, 209, 0, 0.15)');
      leftGrad.addColorStop(1, 'rgba(255, 209, 0, 0.75)');
      ctx.strokeStyle = leftGrad;
      ctx.lineWidth = isVertical ? 4 : 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
      ctx.shadowBlur = isVertical ? 8 : 6;
      ctx.beginPath();
      ctx.moveTo(leftLineStart, centerY);
      ctx.lineTo(leftLineEnd, centerY);
      ctx.stroke();
      ctx.restore();
    }

    const rightLineStart = startX + totalUnitW + (isVertical ? 25 : 20);
    const rightLineEnd = canvasW - (isVertical ? 45 : 35);
    if (rightLineEnd > rightLineStart + 10) {
      ctx.save();
      const rightGrad = ctx.createLinearGradient(rightLineStart, 0, rightLineEnd, 0);
      rightGrad.addColorStop(0, 'rgba(0, 194, 168, 0.75)');
      rightGrad.addColorStop(1, 'rgba(0, 194, 168, 0.15)');
      ctx.strokeStyle = rightGrad;
      ctx.lineWidth = isVertical ? 4 : 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 194, 168, 0.5)';
      ctx.shadowBlur = isVertical ? 8 : 6;
      ctx.beginPath();
      ctx.moveTo(rightLineStart, centerY);
      ctx.lineTo(rightLineEnd, centerY);
      ctx.stroke();
      ctx.restore();
    }

    // Logo drawn next to title
    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
      ctx.shadowBlur = isVertical ? 20 : 16;
      ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    // Title & Subtitle text
    const textX = logoX + logoSize + gapX;

    ctx.save();
    ctx.fillStyle = '#ffd100';
    ctx.font = isVertical ? '900 58px "Outfit", sans-serif' : '900 42px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.55)';
    ctx.shadowBlur = isVertical ? 18 : 14;
    ctx.fillText(mainTitleStr, textX, centerY - (isVertical ? 6 : 5));
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? '700 25px "Outfit", sans-serif' : '700 19px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(subTitleStr, textX, centerY + (isVertical ? 36 : 26));
    ctx.restore();

    ctx.restore();
    return headerH;
  }

  // 5. Category Badge Pill (Centered below header)
  function drawCategoryBadge(ctx, canvasW, badgeY, categoryLabel, isVertical = false) {
    const rawCat = categoryLabel || (categoryInput ? categoryInput.value : '');
    const cleanCat = rawCat.trim() || 'JUEGO DE MESA';
    const catText = `🏷️ CATEGORÍA: ${cleanCat.toUpperCase()}`;

    ctx.save();
    ctx.font = isVertical ? 'bold 24px "Outfit", sans-serif' : 'bold 18px "Outfit", sans-serif';
    const textWidth = ctx.measureText(catText).width;
    const badgeW = textWidth + (isVertical ? 48 : 34);
    const badgeH = isVertical ? 50 : 38;
    const badgeX = (canvasW - badgeW) / 2;

    ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.85)';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, isVertical ? 16 : 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd100';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.fillText(catText, canvasW / 2, badgeY + badgeH / 2 + 1);
    ctx.restore();

    return badgeH;
  }

  // 6. Creator Attribution Badge (Prominent above footer)
  function drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio) {
    const isVertical = (aspectRatio === '9:16');
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    const creatorName = creatorNameInput ? creatorNameInput.value.trim() : '';
    const creatorIg = creatorIgInput ? creatorIgInput.value.trim() : '';
    const cleanIg = creatorIg.replace(/^@+/, '');

    let creatorText = '';
    if (cleanIg && creatorName) {
      creatorText = `👤 Desafío creado por ${creatorName} (@${cleanIg})`;
    } else if (cleanIg) {
      creatorText = `👤 Desafío creado por @${cleanIg}`;
    } else if (creatorName) {
      creatorText = `👤 Desafío creado por ${creatorName}`;
    }

    if (!creatorText) return;

    const fontSize = isVertical ? 30 : 22;
    const badgeH = isVertical ? 62 : 46;

    ctx.save();
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    const textMetrics = ctx.measureText(creatorText);
    const badgeW = Math.min(canvasW - (isVertical ? 80 : 50), Math.max(isVertical ? 660 : 520, textMetrics.width + 60));
    const badgeX = (canvasW - badgeW) / 2;

    // Posición Y estrictamente por encima de la tarjeta QR flotante para que NUNCA se tapen
    const qrTopY = isVertical ? (footerY - 105) : (canvasH - (isVertical ? 230 : 180) - 8);
    const badgeY = qrTopY - badgeH - (isVertical ? 18 : 14);
    ctx.shadowColor = 'rgba(255, 209, 0, 0.35)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(30, 18, 50, 0.92)';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, isVertical ? 18 : 14);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.7)';
    ctx.lineWidth = isVertical ? 2.5 : 2;
    ctx.stroke();

    ctx.fillStyle = '#ffd100';
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(creatorText, canvasW / 2, badgeY + badgeH / 2 + Math.round(fontSize * 0.35));
    ctx.restore();
  }

  // 7. Official Suite Card Footer (QR + Instagram + BLACK Logo)
  function drawCardFooterOnCanvas(ctx, canvasW = 1080, canvasH = 1080, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    ctx.save();

    // Footer panel background
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, footerY, canvasW, footerH);

    // Top separator line
    ctx.fillStyle = 'rgba(255, 209, 0, 0.45)';
    ctx.fillRect(0, footerY, canvasW, 2);

    // LEFT: White Floating QR Card
    const qrCardW = isVertical ? 230 : 180;
    const qrCardH = isVertical ? 230 : 180;
    const qrCardX = isVertical ? 22 : 14;
    const qrCardY = isVertical ? (footerY - 105) : (canvasH - qrCardH - 8);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    drawRoundRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, isVertical ? 20 : 16);
    ctx.fill();
    ctx.restore();

    if (brandQRImg && brandQRImg.complete && brandQRImg.naturalWidth > 0) {
      const qrMargin = isVertical ? 8 : 6;
      const maxW = qrCardW - (qrMargin * 2);
      const maxH = qrCardH - (qrMargin * 2);
      const qrAspect = brandQRImg.naturalWidth / brandQRImg.naturalHeight;

      let drawW = maxW;
      let drawH = maxW / qrAspect;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = maxH * qrAspect;
      }
      const drawX = qrCardX + qrMargin + (maxW - drawW) / 2;
      const drawY = qrCardY + qrMargin + (maxH - drawH) / 2;
      ctx.drawImage(brandQRImg, drawX, drawY, drawW, drawH);
    }

    // CENTER: SÍGUENOS en INSTAGRAM + Subtitle
    const centerCenterX = isVertical ? Math.round(canvasW / 2) : Math.round(canvasW / 2 + (qrCardW / 4) + 10);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? '900 28px "Outfit", sans-serif' : '900 22px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText('📸 ¡SÍGUENOS en INSTAGRAM!', centerCenterX, footerY + (isVertical ? 48 : 38));
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? '700 16px "Outfit", sans-serif' : '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧩 Juego creado en Pistas Jugonas: Pistas Reveladoras — ¡Crea los tuyos!', centerCenterX, footerY + (isVertical ? 92 : 65));
    ctx.restore();

    // RIGHT: Floating BLACK Logo Unit
    const blackLogoSize = isVertical ? 95 : 80;
    const rightCenterX = isVertical ? (canvasW - 110) : (canvasW - 115);
    const qrCardBaseY = qrCardY + qrCardH;

    if (brandBlackLogoImg && brandBlackLogoImg.complete && brandBlackLogoImg.naturalWidth > 0) {
      const logoAspect = brandBlackLogoImg.naturalWidth / brandBlackLogoImg.naturalHeight;
      const logoW = Math.round(blackLogoSize * logoAspect);
      const logoH = blackLogoSize;
      const logoX = rightCenterX - Math.round(logoW / 2);
      const logoDrawY = qrCardBaseY - logoH;
      const textY = logoDrawY - (isVertical ? 18 : 14);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = isVertical ? '600 16px "Outfit", sans-serif' : '600 14px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 10;
      ctx.fillText('Sistema creado por', rightCenterX, textY);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(brandBlackLogoImg, logoX, logoDrawY, logoW, logoH);
      ctx.restore();
    } else {
      const logoDrawY = qrCardBaseY - (isVertical ? 50 : 35);
      const textY = logoDrawY - (isVertical ? 18 : 14);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = isVertical ? '600 16px "Outfit", sans-serif' : '600 14px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 10;
      ctx.fillText('Sistema creado por', rightCenterX, textY);

      ctx.font = isVertical ? 'bold 26px "Outfit", sans-serif' : 'bold 20px "Outfit", sans-serif';
      ctx.fillText('BLACK 🥷', rightCenterX, logoDrawY + (isVertical ? 25 : 18));
      ctx.restore();
    }

    ctx.restore();
  }

  // 8. Card Container & Pill Helpers
  function drawSlotCard(ctx, x, y, w, h, r = 18) {
    ctx.save();
    ctx.fillStyle = 'rgba(30, 13, 54, 0.85)';
    ctx.strokeStyle = 'rgba(232, 93, 158, 0.35)';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSlotPill(ctx, x, y, num) {
    ctx.save();
    const r = 26;
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#7b3bc6');
    g.addColorStop(1, '#ff2e4c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '900 24px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), x, y);
    ctx.restore();
  }

  function drawTextWrapped(ctx, text, x, y, maxW, maxFs = 22) {
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const isShort = text.length < 35 && !text.includes('\n');
    const fs = isShort ? Math.min(40, maxFs + 12) : maxFs;
    ctx.font = `600 ${fs}px "Outfit", sans-serif`;
    ctx.fillStyle = '#ffffff';

    const words = text.split(' ');
    let line = '', lines = [];
    for (let n = 0; n < words.length; n++) {
      const t = line + words[n] + ' ';
      if (ctx.measureText(t).width > maxW && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = t;
      }
    }
    lines.push(line.trim());

    const lineHeight = fs * 1.35;
    const totalH = lines.length * lineHeight;
    const sy = y - (totalH / 2);

    lines.forEach((l, k) => {
      ctx.fillText(l, x, sy + k * lineHeight);
    });
    ctx.restore();
  }

  // ── RENDER CLUES CANVAS ───────────────────────────────────────────────────
  function renderClues(target, ratio) {
    const isVertical = ratio === '9:16';
    const w = 1080, h = isVertical ? 1920 : 1080;
    target.width = w; target.height = h;
    const ctx = target.getContext('2d');

    drawBackground(ctx, w, h);
    const headerH = drawCardHeader(ctx, w, ratio);

    const catBadgeH = drawCategoryBadge(ctx, w, headerH + (isVertical ? 20 : 14), categoryInput ? categoryInput.value : '', isVertical);

    const footerH = isVertical ? 260 : 95;
    const hasCreator = (creatorNameInput && creatorNameInput.value.trim()) || (creatorIgInput && creatorIgInput.value.trim());

    const contentStartY = headerH + catBadgeH + (isVertical ? 35 : 22);
    const contentEndY = h - footerH - (hasCreator ? (isVertical ? 95 : 68) : (isVertical ? 30 : 20));
    const availHeight = contentEndY - contentStartY;

    const px = isVertical ? 60 : 50;
    const cw = w - (px * 2);
    const n = slots.length;
    const gap = isVertical ? 24 : 14;
    const ch = Math.floor((availHeight - gap * (n - 1)) / n);

    slots.forEach((slot, i) => {
      const cy = contentStartY + i * (ch + gap);
      drawSlotCard(ctx, px, cy, cw, ch, isVertical ? 20 : 16);

      const pillX = px + (isVertical ? 48 : 42);
      const pillY = cy + ch / 2;
      drawSlotPill(ctx, pillX, pillY, i + 1);

      const clueText = slot.clue.trim() || `Pista ${i + 1}...`;
      const textX = px + (isVertical ? 105 : 92);
      const maxTextW = cw - (isVertical ? 125 : 110);
      drawTextWrapped(ctx, clueText, textX, pillY, maxTextW, isVertical ? 24 : 20);
    });

    drawCreatorBadge(ctx, w, h, ratio);
    drawCardFooterOnCanvas(ctx, w, h, ratio);

    return target.toDataURL('image/png');
  }

  // ── RENDER ANSWERS CANVAS ─────────────────────────────────────────────────
  function renderAnswers(target, ratio) {
    const isVertical = ratio === '9:16';
    const w = 1080, h = isVertical ? 1920 : 1080;
    target.width = w; target.height = h;
    const ctx = target.getContext('2d');

    drawBackground(ctx, w, h);
    const headerH = drawCardHeader(ctx, w, ratio);

    const catBadgeH = drawCategoryBadge(ctx, w, headerH + (isVertical ? 20 : 14), categoryInput ? categoryInput.value : '', isVertical);

    const footerH = isVertical ? 260 : 95;
    const hasCreator = (creatorNameInput && creatorNameInput.value.trim()) || (creatorIgInput && creatorIgInput.value.trim());

    const contentStartY = headerH + catBadgeH + (isVertical ? 35 : 22);
    const contentEndY = h - footerH - (hasCreator ? (isVertical ? 95 : 68) : (isVertical ? 30 : 20));
    const availHeight = contentEndY - contentStartY;

    const px = isVertical ? 60 : 50;
    const cw = w - (px * 2);
    const n = slots.length;

    if (currentMode === 'multi') {
      const gap = isVertical ? 24 : 14;
      const ch = Math.floor((availHeight - gap * (n - 1)) / n);

      slots.forEach((slot, i) => {
        const cy = contentStartY + i * (ch + gap);
        drawSlotCard(ctx, px, cy, cw, ch, isVertical ? 20 : 16);

        const pillX = px + (isVertical ? 48 : 42);
        const pillY = cy + ch / 2;
        drawSlotPill(ctx, pillX, pillY, i + 1);

        const ansText = slot.answer.trim() || `Juego ${i + 1}`;
        const textX = px + (isVertical ? 105 : 92);
        const maxTextW = cw - (isVertical ? 125 : 110);

        ctx.save();
        ctx.font = isVertical ? '800 32px "Outfit", sans-serif' : '800 24px "Outfit", sans-serif';
        ctx.fillStyle = '#ffd100';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(255, 209, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.fillText(ansText, textX, pillY);
        ctx.restore();
      });

    } else {
      // Single mode: clue cards + final Solución card
      const singleAns = (document.getElementById('singleAnsInput')?.value.trim()) || 'Juego Solución';
      const singleCat = (document.getElementById('singleCatInput')?.value.trim()) || '';

      const total = n + 1;
      const gap = isVertical ? 20 : 12;
      const ch = Math.floor((availHeight - gap * (total - 1)) / total);

      slots.forEach((slot, i) => {
        const cy = contentStartY + i * (ch + gap);
        drawSlotCard(ctx, px, cy, cw, ch, isVertical ? 18 : 14);

        const pillX = px + (isVertical ? 44 : 38);
        const pillY = cy + ch / 2;
        drawSlotPill(ctx, pillX, pillY, i + 1);

        const clueText = slot.clue.trim() || `Pista ${i + 1}...`;
        const textX = px + (isVertical ? 98 : 86);
        const maxTextW = cw - (isVertical ? 115 : 100);
        drawTextWrapped(ctx, clueText, textX, pillY, maxTextW, isVertical ? 20 : 16);
      });

      // Final Solución Card
      const solY = contentStartY + n * (ch + gap);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 209, 0, 0.15)';
      ctx.strokeStyle = '#ffd100';
      ctx.lineWidth = 3;
      drawRoundRect(ctx, px, solY, cw, ch, isVertical ? 20 : 16);
      ctx.fill();
      ctx.stroke();

      const centerY = solY + ch / 2;
      ctx.font = isVertical ? '900 20px "Outfit", sans-serif' : '900 16px "Outfit", sans-serif';
      ctx.fillStyle = '#e85d9e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('🏆 JUEGO SOLUCIÓN DETECTADO 🏆', w / 2, solY + (isVertical ? 14 : 8));

      ctx.font = isVertical ? '900 36px "Outfit", sans-serif' : '900 26px "Outfit", sans-serif';
      ctx.fillStyle = '#ffd100';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText(singleAns, w / 2, solY + (isVertical ? 44 : 30));

      if (singleCat) {
        ctx.font = isVertical ? '600 16px "Outfit", sans-serif' : '600 13px "Outfit", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`(${singleCat})`, w / 2, solY + (isVertical ? 86 : 62));
      }
      ctx.restore();
    }

    drawCreatorBadge(ctx, w, h, ratio);
    drawCardFooterOnCanvas(ctx, w, h, ratio);

    return target.toDataURL('image/png');
  }

  // ── LIVE PREVIEW ──────────────────────────────────────────────────────────
  function updateLivePreview() {
    if (!livePreviewCanvas) return;
    const ratio = getAspectRatio();
    try {
      if (currentPreviewTab === 'clues') renderClues(livePreviewCanvas, ratio);
      else renderAnswers(livePreviewCanvas, ratio);
    } catch(e) { console.warn('Preview error:', e); }
  }

  function scheduleLiveUpdate() {
    clearTimeout(liveDebounceTimer);
    liveDebounceTimer = setTimeout(updateLivePreview, 180);
  }

  prevTabClues.addEventListener('click', () => {
    currentPreviewTab = 'clues';
    prevTabClues.classList.add('active');
    prevTabAnswers.classList.remove('active');
    updateLivePreview();
  });

  prevTabAnswers.addEventListener('click', () => {
    currentPreviewTab = 'answers';
    prevTabAnswers.classList.add('active');
    prevTabClues.classList.remove('active');
    updateLivePreview();
  });

  // ── GENERATE ──────────────────────────────────────────────────────────────
  async function handleGenerate() {
    const name = creatorNameInput ? creatorNameInput.value.trim() : '';
    const ig   = creatorIgInput ? creatorIgInput.value.trim() : '';

    // Validar campos requeridos de identidad
    if (!name || !ig) {
      alert('Por favor ingresa tu Nombre/Apodo y tu Instagram antes de generar las tarjetas.');
      if (creatorNameInput) creatorNameInput.focus();
      return;
    }

    const ok   = await checkProtectedNameAccess(name, ig);
    if (!ok) return;

    const ratio   = getAspectRatio();
    const suffix  = ratio === '1:1' ? '1x1' : '9x16';

    loader.classList.remove('hidden');
    generateBtn.disabled = true;
    await new Promise(r => setTimeout(r, 120));

    try {
      const cluesUrl   = renderClues(cluesCanvas, ratio);
      const answersUrl = renderAnswers(answersCanvas, ratio);

      generatedResults = [
        {
          title: 'Tarjeta — Pistas',
          filename: `PistasJugonas_Pistas_${suffix}.png`,
          dataUrl: cluesUrl,
          description: `${slots.length} pista${slots.length > 1 ? 's' : ''} en HD lista para compartir.`
        },
        {
          title: 'Tarjeta — Solución',
          filename: `PistasJugonas_Solucion_${suffix}.png`,
          dataUrl: answersUrl,
          description: 'Imagen con las respuestas/solución oficial revelada.'
        }
      ];

      displayResults(generatedResults);

      // Auto-download both
      generatedResults.forEach((item, i) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = item.dataUrl; a.download = item.filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }, i * 350);
      });

    } catch(err) {
      console.error(err);
      alert('Error al generar las tarjetas:\n' + (err.message || err));
    } finally {
      loader.classList.add('hidden');
      generateBtn.disabled = false;
      if (regenerateBtn) { regenerateBtn.disabled = false; regenerateBtn.classList.remove('hidden'); }
    }
  }

  function displayResults(results) {
    cardsGrid.innerHTML = '';
    results.forEach((item, i) => {
      const isSol = i === 1;
      const card = document.createElement('div');
      card.className = 'result-card';
      card.innerHTML = `
        <div class="card-image-wrap">
          <img src="${item.dataUrl}" alt="${item.title}" class="card-img">
        </div>
        <div class="card-body">
          <div class="card-info">
            <h3 class="card-title">${item.title}</h3>
            <span class="card-filename">${item.filename}</span>
          </div>
          <p class="section-subtitle" style="font-size:0.84rem;margin-bottom:14px;">${item.description}</p>
          <a href="${item.dataUrl}" download="${item.filename}"
            class="btn-download-card${isSol ? ' btn-download-card-gold' : ''}">
            📥 Guardar PNG
          </a>
        </div>`;
      cardsGrid.appendChild(card);
    });
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }

  function handleDownloadAll() {
    if (!generatedResults.length) { handleGenerate(); return; }
    generatedResults.forEach((item, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = item.dataUrl; a.download = item.filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }, i * 350);
    });
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  slots[0].clue   = 'El zumbido de los transformadores apenas oculta el olor a carbón quemado. Las ciudades exigen luz a gritos...';
  slots[0].answer = 'Alta Tensión (Power Grid)';

  slots.push({ clue: "Espumas que se alzan en la trastienda, un maletín abierto sobre la mesa y la tensión constante...", answer: "Cash'n Guns" });

  renderSlots();

  generateBtn.addEventListener('click', handleGenerate);
  if (regenerateBtn)  regenerateBtn.addEventListener('click', handleGenerate);
  if (downloadAllBtn) downloadAllBtn.addEventListener('click', handleDownloadAll);

  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});
