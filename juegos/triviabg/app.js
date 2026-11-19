/**
 * TriviaBG AMIGOS JUGONES — Application Logic
 * Question & Answer HD Canvas Card Generator for WhatsApp & Social Media
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const questionInput = document.getElementById('questionInput');
  const answerInput = document.getElementById('answerInput');
  const categoryInput = document.getElementById('categoryInput');
  const creatorNameInput = document.getElementById('creatorNameInput');
  const creatorIgInput = document.getElementById('creatorIgInput');

  // Options Controls
  const toggleOptionsBtn = document.getElementById('toggleOptionsBtn');
  const optionsContainer = document.getElementById('optionsContainer');
  const optionAInput = document.getElementById('optionAInput');
  const optionBInput = document.getElementById('optionBInput');
  const optionCInput = document.getElementById('optionCInput');
  const optionDInput = document.getElementById('optionDInput');

  // Evidence Controls
  const toggleEvidenceBtn = document.getElementById('toggleEvidenceBtn');
  const evidenceContainer = document.getElementById('evidenceContainer');
  const evidenceTextInput = document.getElementById('evidenceTextInput');
  const evidenceDropZone = document.getElementById('evidenceDropZone');
  const evidenceImageInput = document.getElementById('evidenceImageInput');
  const evidenceUrlInput = document.getElementById('evidenceUrlInput');
  const evidencePreviewWrap = document.getElementById('evidencePreviewWrap');
  const evidencePreviewImg = document.getElementById('evidencePreviewImg');
  const evidenceSourceBadge = document.getElementById('evidenceSourceBadge');
  const removeEvidenceImgBtn = document.getElementById('removeEvidenceImgBtn');

  // General Controls
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const loader = document.getElementById('loader');
  const resultsSection = document.getElementById('resultsSection');
  const cardsGrid = document.getElementById('cardsGrid');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // State
  let generatedResults = [];
  let isOptionsVisible = false;
  let isEvidenceVisible = false;
  let loadedEvidenceImg = null; // HTMLImageElement if uploaded
  let brandLogoImg = null;
  let brandQRImg = null;
  let brandBlackLogoImg = null;

  // ── SISTEMA DE SEGURIDAD Y PROTECCIÓN DE NOMBRES RESERVADOS ─────────────
  const PROTECTED_NAMES = ['amigosjugonesymas', 'amigosjugones', 'black', 'jessy'];
  const PROTECTED_SECRET_PASS = 'admin123'; // Clave de administración para pruebas locales

  function isProtectedName(str) {
    if (!str) return false;
    const clean = str.toLowerCase().trim().replace(/^@+/, '').replace(/[\s_\-\.]/g, '');
    return PROTECTED_NAMES.some(name => {
      const cleanName = name.toLowerCase().trim().replace(/^@+/, '').replace(/[\s_\-\.]/g, '');
      return clean.includes(cleanName);
    });
  }

  function getMatchedProtectedName(nameStr, igStr) {
    if (isProtectedName(nameStr)) return nameStr.trim();
    if (isProtectedName(igStr)) return igStr.trim();
    return null;
  }

  function checkProtectedNameAccess(nameStr, igStr) {
    const matched = getMatchedProtectedName(nameStr, igStr);
    if (!matched) return Promise.resolve(true);

    return new Promise((resolve) => {
      let modalEl = document.getElementById('protected-name-modal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'protected-name-modal';
        modalEl.style.cssText = `
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(10, 15, 25, 0.88); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
          font-family: 'Outfit', sans-serif;
        `;
        document.body.appendChild(modalEl);
      }

      modalEl.innerHTML = `
        <div style="
          background: #151d2a; border: 1px solid rgba(255, 209, 0, 0.4);
          border-radius: 16px; padding: 28px; max-width: 420px; width: 100%;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7); color: #fff; text-align: center;
        ">
          <div style="font-size: 42px; margin-bottom: 12px;">🔒</div>
          <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #ffd100;">
            Nombre Reservado Detectado
          </h3>
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #cbd5e1; line-height: 1.5;">
            El nombre o IG <strong style="color: #ffd100;">"${matched}"</strong> pertenece al equipo oficial de <strong>Amigos Jugones</strong>.
          </p>
          <p style="margin: 0 0 16px 0; font-size: 13px; color: #94a3b8;">
            Ingresa la contraseña de administrador para continuar:
          </p>
          <input type="password" id="protected-pass-input" placeholder="Contraseña de administrador" style="
            width: 100%; box-sizing: border-box; padding: 12px 14px; margin-bottom: 12px;
            border-radius: 8px; border: 1px solid rgba(255,209,0,0.3); background: #0f172a;
            color: #fff; font-size: 15px; outline: none; text-align: center;
          " />
          <div id="protected-pass-error" style="
            color: #ff4d4d; font-size: 13px; margin-bottom: 12px; display: none; font-weight: 600;
          ">
            ❌ Contraseña incorrecta. Intento no autorizado.
          </div>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="protected-cancel-btn" type="button" style="
              flex: 1; padding: 10px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);
              background: transparent; color: #cbd5e1; font-weight: 600; cursor: pointer;
            ">Cancelar</button>
            <button id="protected-verify-btn" type="button" style="
              flex: 1; padding: 10px 16px; border-radius: 8px; border: none;
              background: #ffd100; color: #000; font-weight: 700; cursor: pointer;
            ">Verificar</button>
          </div>
        </div>
      `;

      modalEl.style.display = 'flex';
      const passInput = modalEl.querySelector('#protected-pass-input');
      const errorEl = modalEl.querySelector('#protected-pass-error');
      const verifyBtn = modalEl.querySelector('#protected-verify-btn');
      const cancelBtn = modalEl.querySelector('#protected-cancel-btn');

      passInput.focus();

      function cleanup() {
        modalEl.style.display = 'none';
        modalEl.innerHTML = '';
      }

      verifyBtn.onclick = () => {
        const val = passInput.value;
        if (val === PROTECTED_SECRET_PASS) {
          cleanup();
          resolve(true);
        } else {
          errorEl.style.display = 'block';
          passInput.style.borderColor = '#ff4d4d';
          passInput.value = '';
          passInput.focus();
        }
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };

      passInput.onkeydown = (e) => {
        if (e.key === 'Enter') verifyBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
      };
    });
  }

  // Safe Cross-Browser Rounded Rectangle Helper (Nativo con Fallback)
  function drawRoundRect(ctx, x, y, w, h, radii = 0) {
    if (typeof ctx.roundRect === 'function') {
      try {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radii);
        return;
      } catch (e) {
        // Fallback a trazado manual si roundRect nativo falla por parámetros
      }
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

  function loadBrandLogo() {
    return new Promise((resolve) => {
      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        resolve(brandLogoImg);
        return;
      }
      const img = new Image();
      const logoSrc = (typeof window !== 'undefined' && window.BRAND_LOGO_DATA_URL) ? window.BRAND_LOGO_DATA_URL : 'assets/logo.png';
      img.src = logoSrc;
      img.onload = () => {
        brandLogoImg = img;
        resolve(img);
      };
      img.onerror = () => {
        if (img.src !== 'assets/logo.png') {
          const fallbackImg = new Image();
          fallbackImg.src = 'assets/logo.png';
          fallbackImg.onload = () => {
            brandLogoImg = fallbackImg;
            resolve(fallbackImg);
          };
          fallbackImg.onerror = () => resolve(null);
        } else {
          resolve(null);
        }
      };
    });
  }

  function loadBrandQR() {
    return new Promise((resolve) => {
      if (brandQRImg && brandQRImg.complete && brandQRImg.naturalWidth > 0) {
        resolve(brandQRImg);
        return;
      }
      const img = new Image();
      const qrSrc = (typeof window !== 'undefined' && window.BRAND_QR_DATA_URL) ? window.BRAND_QR_DATA_URL : 'assets/amigosjugonesymas_qr.png';
      img.src = qrSrc;
      img.onload = () => {
        brandQRImg = img;
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
    });
  }

  function loadBrandBlackLogo() {
    return new Promise((resolve) => {
      if (brandBlackLogoImg && brandBlackLogoImg.complete && brandBlackLogoImg.naturalWidth > 0) {
        resolve(brandBlackLogoImg);
        return;
      }
      const img = new Image();
      const src = (typeof window !== 'undefined' && window.BLACK_LOGO_DATA_URL)
        ? window.BLACK_LOGO_DATA_URL
        : 'assets/logo_black.png';
      img.src = src;
      img.onload = () => { brandBlackLogoImg = img; resolve(img); };
      img.onerror = () => {
        const fb = new Image();
        fb.src = 'assets/logo_black.png';
        fb.onload = () => { brandBlackLogoImg = fb; resolve(fb); };
        fb.onerror = () => resolve(null);
      };
    });
  }

  Promise.all([loadBrandLogo(), loadBrandQR(), loadBrandBlackLogo()]);

  function drawAntiTheftWatermark(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.045; // Subtle stock-photo style anti-theft watermark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.rotate(-Math.PI / 7.5); // ~ -24 degrees slant

    const watermarkText = 'SÍGUENOS EN INSTAGRAM @AMIGOSJUGONESYMAS';
    const stepX = 380;
    const stepY = 150;

    for (let y = -CANVAS_SIZE; y < CANVAS_SIZE * 2; y += stepY) {
      const rowOffset = (Math.abs(Math.floor(y / stepY)) % 2 === 0) ? 0 : stepX / 2;
      for (let x = -CANVAS_SIZE; x < CANVAS_SIZE * 2; x += stepX) {
        ctx.fillText(watermarkText, x + rowOffset, y);
      }
    }

    ctx.restore();
  }

  // ── Creator Attribution Badge (Prominent, above footer) ─────────────────────
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
    // Badge background
    ctx.shadowColor = 'rgba(255, 209, 0, 0.35)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(30, 18, 50, 0.92)';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, isVertical ? 18 : 14);
    ctx.fill();

    // Badge border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.7)';
    ctx.lineWidth = isVertical ? 2.5 : 2;
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#ffd100';
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(creatorText, canvasW / 2, badgeY + badgeH / 2 + Math.round(fontSize * 0.35));
    ctx.restore();
  }

  function drawCardFooter(ctx, canvasW = 1000, canvasH = 1000, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    ctx.save();

    // Footer background
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, footerY, canvasW, footerH);

    // Top separator line
    ctx.fillStyle = 'rgba(255, 209, 0, 0.45)';
    ctx.fillRect(0, footerY, canvasW, 2);

    // ── LEFT: Large Floating White QR Card (Clean without duplicate text) ─────
    const qrCardW = isVertical ? 230 : 180;
    const qrCardH = isVertical ? 230 : 180;
    const qrCardX = isVertical ? 22 : 14;
    const qrCardY = isVertical ? (footerY - 105) : (canvasH - qrCardH - 8);

    // White Card Container
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    drawRoundRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, isVertical ? 20 : 16);
    ctx.fill();
    ctx.restore();

    // QR Code Image inside White Card (preserving exact aspect ratio to ensure scannability)
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

    // ── CENTER: ¡SIGUENOS en INSTAGRAM! + Frase Creativa de Autoría ─────────
    const centerCenterX = isVertical ? Math.round(canvasW / 2) : (canvasW / 2 + (qrCardW / 4) + 10);

    // Linea 1: Siguenos en Instagram
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? '900 28px "Outfit", sans-serif' : '900 22px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText('📸 ¡SIGUENOS en INSTAGRAM!', centerCenterX, footerY + (isVertical ? 48 : 38));
    ctx.restore();

    // Linea 2: Juego creado en Trivia Jugona
    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? '700 16px "Outfit", sans-serif' : '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Juego creado en Trivia Jugona: Desafíos de Trivia — ¡Crea los tuyos!', centerCenterX, footerY + (isVertical ? 92 : 65));
    ctx.restore();

    // ── RIGHT: Sistema creado por + BLACK logo (Floating & Base Leveled with QR Base) ──────
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

  initEvents();

  function initEvents() {
    const yearElem = document.getElementById('currentYear');
    if (yearElem) {
      yearElem.textContent = new Date().getFullYear();
    }
    const validateForm = () => {
      const hasQ = questionInput.value.trim().length > 0;
      const hasA = answerInput.value.trim().length > 0;
      const hasName = creatorNameInput ? creatorNameInput.value.trim().length > 0 : false;
      const hasIg = creatorIgInput ? creatorIgInput.value.trim().length > 0 : false;
      const isValid = hasQ && hasA && hasName && hasIg;
      generateBtn.disabled = !isValid;
      if (regenerateBtn) regenerateBtn.disabled = !isValid;
    };

    questionInput.addEventListener('input', validateForm);
    answerInput.addEventListener('input', validateForm);
    if (creatorNameInput) creatorNameInput.addEventListener('input', validateForm);
    if (creatorIgInput) creatorIgInput.addEventListener('input', validateForm);
    validateForm();

    toggleOptionsBtn.addEventListener('click', () => {
      isOptionsVisible = !isOptionsVisible;
      if (isOptionsVisible) {
        optionsContainer.classList.remove('hidden');
        toggleOptionsBtn.textContent = '➖ Ocultar Opciones Múltiples';
      } else {
        optionsContainer.classList.add('hidden');
        toggleOptionsBtn.textContent = '➕ Agregar Opciones Múltiples A, B, C, D (Opcional)';
      }
    });

    toggleEvidenceBtn.addEventListener('click', () => {
      isEvidenceVisible = !isEvidenceVisible;
      if (isEvidenceVisible) {
        evidenceContainer.classList.remove('hidden');
        toggleEvidenceBtn.textContent = '➖ Ocultar Sección de Evidencia';
      } else {
        evidenceContainer.classList.add('hidden');
        toggleEvidenceBtn.textContent = '📌 Agregar Evidencia / Fuente / Captura de Prueba (Opcional)';
      }
    });

    // Evidence Upload & Click Listener
    if (evidenceDropZone) {
      evidenceDropZone.addEventListener('click', () => evidenceImageInput.click());

      // Drag & Drop
      evidenceDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        evidenceDropZone.classList.add('dragover');
      });
      evidenceDropZone.addEventListener('dragleave', () => {
        evidenceDropZone.classList.remove('dragover');
      });
      evidenceDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        evidenceDropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processFileImage(e.dataTransfer.files[0], '📁 Archivo Arrastrado');
        }
      });
    }

    evidenceImageInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        processFileImage(e.target.files[0], '📁 Imagen desde Dispositivo');
      }
    });

    // Global & DropZone Paste Listener (Ctrl + V)
    document.addEventListener('paste', handleGlobalPaste);

    // URL Input Listener
    if (evidenceUrlInput) {
      evidenceUrlInput.addEventListener('input', handleUrlInput);
    }

    removeEvidenceImgBtn.addEventListener('click', clearEvidenceImage);

    // Format selector card options (1:1 vs 9:16)
    const cardOptionSquare = document.getElementById('cardOptionSquare');
    const cardOptionStory = document.getElementById('cardOptionStory');

    if (cardOptionSquare && cardOptionStory) {
      cardOptionSquare.addEventListener('click', () => {
        cardOptionSquare.classList.add('active');
        cardOptionStory.classList.remove('active');
        const radio = cardOptionSquare.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
      cardOptionStory.addEventListener('click', () => {
        cardOptionStory.classList.add('active');
        cardOptionSquare.classList.remove('active');
        const radio = cardOptionStory.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    }

    generateBtn.addEventListener('click', handleGenerate);
    if (regenerateBtn) regenerateBtn.addEventListener('click', handleGenerate);
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', handleDownloadAll);
  }

  function handleGlobalPaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          // Open evidence container if closed
          if (!isEvidenceVisible) {
            isEvidenceVisible = true;
            evidenceContainer.classList.remove('hidden');
            toggleEvidenceBtn.textContent = '➖ Ocultar Sección de Evidencia';
          }
          processFileImage(file, '📋 Captura desde Portapapeles (Ctrl+V)');
          e.preventDefault();
          break;
        }
      }
    }
  }

  function processFileImage(file, sourceLabel) {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        loadedEvidenceImg = img;
        evidencePreviewImg.src = event.target.result;
        if (evidenceSourceBadge) evidenceSourceBadge.textContent = sourceLabel;
        evidencePreviewWrap.classList.remove('hidden');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleUrlInput(e) {
    const url = e.target.value.trim();
    if (!url) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      loadedEvidenceImg = img;
      evidencePreviewImg.src = url;
      if (evidenceSourceBadge) evidenceSourceBadge.textContent = '🔗 Imagen desde URL';
      evidencePreviewWrap.classList.remove('hidden');
    };
    img.onerror = () => {
      // If CORS or invalid image URL, do not fail silently
    };
    img.src = url;
  }

  function clearEvidenceImage() {
    evidenceImageInput.value = '';
    if (evidenceUrlInput) evidenceUrlInput.value = '';
    loadedEvidenceImg = null;
    evidencePreviewImg.src = '';
    evidencePreviewWrap.classList.add('hidden');
  }

  function sanitizeFilename(str) {
    return str
      .trim()
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_');
  }

  /* -------------------------------------------------------------------------- */
  /* CANVAS GENERATION ENGINE                                                   */
  /* -------------------------------------------------------------------------- */

  const CANVAS_SIZE = 1000;

  function renderTriviaQuestionCanvas(questionText, categoryLabel, optionsArr, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#120822');
    bgGrad.addColorStop(0.5, '#1e0d36');
    bgGrad.addColorStop(1, '#241240');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Decorative Glow Circles
    ctx.save();
    ctx.fillStyle = 'rgba(255, 46, 76, 0.14)';
    ctx.beginPath();
    ctx.arc(isVertical ? 200 : 160, isVertical ? 280 : 160, isVertical ? 320 : 240, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 194, 168, 0.12)';
    ctx.beginPath();
    ctx.arc(isVertical ? 880 : 840, isVertical ? 1640 : 840, isVertical ? 360 : 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top Header Bar
    const HEADER_H = isVertical ? 180 : 110;
    ctx.fillStyle = 'rgba(18, 8, 34, 0.88)';
    ctx.fillRect(0, 0, canvasW, HEADER_H);

    // Top Line Pink Accent
    ctx.fillStyle = '#ff2e4c';
    ctx.fillRect(0, 0, canvasW, isVertical ? 8 : 7);

    if (isVertical) {
      // ── 9:16 Vertical Header: Unified Centered Logo + Title Group ──
      const logoSize = 135;
      const gapX = 20;
      const subText = '🎮 Desafíos de Trivia — Amigos Jugones';

      ctx.font = '900 56px "Outfit", sans-serif';
      const titleW = ctx.measureText('TRIVIA JUGONA').width;
      ctx.font = '700 23px "Outfit", sans-serif';
      const subW = ctx.measureText(subText).width;
      const textW = Math.max(titleW, subW);
      const totalUnitW = logoSize + gapX + textW;

      const startX = Math.round((canvasW - totalUnitW) / 2);
      const logoX = startX;
      const logoY = Math.round((HEADER_H - logoSize) / 2);
      const centerY = Math.round(HEADER_H / 2);

      // Glowing Accent Lines
      const leftLineEnd = startX - 20;
      if (leftLineEnd > 35) {
        ctx.save();
        const leftGrad = ctx.createLinearGradient(35, 0, leftLineEnd, 0);
        leftGrad.addColorStop(0, 'rgba(255, 209, 0, 0.15)');
        leftGrad.addColorStop(1, 'rgba(255, 209, 0, 0.75)');
        ctx.strokeStyle = leftGrad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(35, centerY);
        ctx.lineTo(leftLineEnd, centerY);
        ctx.stroke();
        ctx.restore();
      }

      const rightLineStart = startX + totalUnitW + 20;
      if (canvasW - 35 > rightLineStart + 10) {
        ctx.save();
        const rightGrad = ctx.createLinearGradient(rightLineStart, 0, canvasW - 35, 0);
        rightGrad.addColorStop(0, 'rgba(255, 46, 76, 0.75)');
        rightGrad.addColorStop(1, 'rgba(255, 46, 76, 0.15)');
        ctx.strokeStyle = rightGrad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 46, 76, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(rightLineStart, centerY);
        ctx.lineTo(canvasW - 35, centerY);
        ctx.stroke();
        ctx.restore();
      }

      // Logo
      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
        ctx.shadowBlur = 18;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Title & Subtitle
      const textX = logoX + logoSize + gapX;
      ctx.save();
      const qTitleGrad = ctx.createLinearGradient(textX, 0, textX + titleW, 0);
      qTitleGrad.addColorStop(0, '#ffffff');
      qTitleGrad.addColorStop(0.5, '#ffd100');
      qTitleGrad.addColorStop(1, '#ff2e4c');

      ctx.font = '900 56px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.55)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText('TRIVIA JUGONA', textX, centerY - 5);
      ctx.fillStyle = qTitleGrad;
      ctx.fillText('TRIVIA JUGONA', textX, centerY - 5);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 23px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(subText, textX, centerY + 32);
      ctx.restore();
    } else {
      // 1:1 Square Header
      ctx.save();
      const titleX = 215;
      const titleY = HEADER_H / 2 + 18;
      const qTitleGrad = ctx.createLinearGradient(titleX, 0, titleX + 330, 0);
      qTitleGrad.addColorStop(0, '#ffffff');
      qTitleGrad.addColorStop(0.5, '#ffd100');
      qTitleGrad.addColorStop(1, '#ff2e4c');

      ctx.font = '900 52px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.55)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText('TRIVIA JUGONA', titleX, titleY);
      ctx.fillStyle = qTitleGrad;
      ctx.fillText('TRIVIA JUGONA', titleX, titleY);
      ctx.restore();

      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('DESAFÍO DE TRIVIA', canvasW - 30, HEADER_H / 2 + 10);
      ctx.textAlign = 'left';
    }

    // Central Card Outer Container
    const cardX = 50;
    const cardY = HEADER_H + 15;
    const cardW = canvasW - 100;
    const cardH = isVertical ? 1390 : 675;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = 'rgba(36, 18, 64, 0.85)';
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, isVertical ? 28 : 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 93, 158, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Floating Large Amigos Jugones Brand Logo (Only in 1:1 Square Mode)
    if (!isVertical && brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      const hLogoSize = 190;
      const hLogoX = 18;
      const hLogoY = 16;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(brandLogoImg, hLogoX, hLogoY, hLogoSize, hLogoSize);
      ctx.restore();
    }

    // Central Background Watermark Logo (Discreta)
    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      const wmSize = isVertical ? 480 : 360;
      ctx.drawImage(brandLogoImg, (canvasW - wmSize) / 2, cardY + (cardH - wmSize) / 2, wmSize, wmSize);
      ctx.restore();
    }

    // Category Badge
    let qBoxY = cardY + (isVertical ? 40 : 30);
    if (categoryLabel && categoryLabel.trim()) {
      const catText = `🏷️ CATEGORÍA: ${categoryLabel.trim().toUpperCase()}`;
      ctx.fillStyle = 'rgba(255, 209, 0, 0.15)';
      const badgeH = isVertical ? 60 : 46;
      drawRoundRect(ctx, cardX + 40, cardY + (isVertical ? 30 : 20), cardW - 80, badgeH, 14);
      ctx.fill();

      ctx.fillStyle = '#ffd100';
      ctx.font = isVertical ? 'bold 26px "Outfit", sans-serif' : 'bold 22px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(catText, canvasW / 2, cardY + (isVertical ? 68 : 51));
      ctx.textAlign = 'left';
      qBoxY = cardY + (isVertical ? 115 : 80);
    }

    // Question Text Container (Compact en 9:16 para dejar máximo espacio vertical a las opciones)
    const hasOptions = optionsArr && optionsArr.some(opt => opt && opt.trim());
    const qBoxH = isVertical
      ? (hasOptions ? (categoryLabel && categoryLabel.trim() ? 440 : 500) : 1200)
      : (hasOptions ? (categoryLabel && categoryLabel.trim() ? 345 : 390) : (cardH - (qBoxY - cardY) - 30));

    ctx.fillStyle = 'rgba(14, 6, 26, 0.8)';
    drawRoundRect(ctx, cardX + 25, qBoxY, cardW - 50, qBoxH, 18);
    ctx.fill();

    ctx.strokeStyle = '#ff2e4c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Render Question Text
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff2e4c';
    ctx.shadowBlur = 15;

    let fontSize = isVertical ? (hasOptions ? 50 : 56) : (hasOptions ? 42 : 48);
    if (questionText.length > 45) fontSize = isVertical ? (hasOptions ? 42 : 46) : (hasOptions ? 34 : 40);
    if (questionText.length > 85) fontSize = isVertical ? (hasOptions ? 34 : 38) : (hasOptions ? 28 : 34);
    if (questionText.length > 130) fontSize = isVertical ? (hasOptions ? 28 : 32) : (hasOptions ? 24 : 28);

    ctx.font = `bold ${fontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';

    wrapText(ctx, questionText, canvasW / 2, qBoxY + qBoxH / 2 - (fontSize * 0.2), cardW - 90, fontSize * 1.35);
    ctx.restore();

    // Render Options Grid (if present)
    if (hasOptions) {
      const optY = qBoxY + qBoxH + (isVertical ? 30 : 16);
      const validOptions = optionsArr.filter(opt => opt && opt.trim());
      const isGrid = validOptions.length > 2;
      const labels = ['A', 'B', 'C', 'D'];

      // En 9:16 Vertical para Stories/Reels usamos filas apiladas gigantes para máxima legibilidad
      const useStackedRows = isVertical || !isGrid;

      if (!useStackedRows && isGrid) {
        // 2x2 Grid (para formato 1:1 Cuadrado)
        const colW = (cardW - 70) / 2;
        const rowH = 78;

        validOptions.slice(0, 4).forEach((optText, idx) => {
          const row = Math.floor(idx / 2);
          const col = idx % 2;
          const x = cardX + 25 + (col * (colW + 20));
          const y = optY + (row * (rowH + 14));

          ctx.fillStyle = 'rgba(30, 13, 54, 0.9)';
          drawRoundRect(ctx, x, y, colW, rowH, 14);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 209, 0, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Insignia rosada de la letra
          const badgeSize = 50;
          const badgeX = x + 12;
          const badgeY = y + (rowH - badgeSize) / 2;
          ctx.fillStyle = '#ff2e4c';
          drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 10);
          ctx.fill();

          // Letra A, B, C, D perfectamente centrada en la insignia
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 26px "Outfit", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels[idx], badgeX + badgeSize / 2, badgeY + badgeSize / 2 + 1);
          ctx.restore();

          // Texto de la opción perfectamente centrado verticalmente
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = '500 22px "Outfit", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const truncated = optText.length > 22 ? optText.substring(0, 20) + '...' : optText;
          ctx.fillText(truncated, badgeX + badgeSize + 16, y + rowH / 2);
          ctx.restore();
        });
      } else {
        // Filas Apiladas Gigantes (Ultra legibles y perfectamente centradas)
        validOptions.forEach((optText, idx) => {
          const rowH = isVertical ? 140 : 74;
          const y = optY + (idx * (rowH + (isVertical ? 22 : 10)));
          const optW = cardW - 50;

          ctx.fillStyle = 'rgba(30, 13, 54, 0.95)';
          drawRoundRect(ctx, cardX + 25, y, optW, rowH, 16);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 209, 0, 0.45)';
          ctx.lineWidth = isVertical ? 2.5 : 1.5;
          ctx.stroke();

          // Insignia rosada de la letra
          const badgeSize = isVertical ? 76 : 50;
          const badgeX = cardX + 25 + (isVertical ? 18 : 12);
          const badgeY = y + (rowH - badgeSize) / 2;
          ctx.fillStyle = '#ff2e4c';
          drawRoundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, isVertical ? 14 : 10);
          ctx.fill();

          // Letra A, B, C, D perfectamente centrada en la insignia
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = isVertical ? 'bold 42px "Outfit", sans-serif' : 'bold 26px "Outfit", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels[idx], badgeX + badgeSize / 2, badgeY + badgeSize / 2 + (isVertical ? 2 : 1));
          ctx.restore();

          // Texto de la opción perfectamente centrado verticalmente en la tarjeta
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = isVertical ? 'bold 34px "Outfit", sans-serif' : '500 23px "Outfit", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(optText, badgeX + badgeSize + (isVertical ? 24 : 16), y + rowH / 2);
          ctx.restore();
        });
      }
    }

    // Anti-theft subtle watermark
    drawAntiTheftWatermark(ctx);

    // Creator Attribution Badge (Prominent, above footer)
    drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio);

    // Footer Bar con QR e Inscripción
    drawCardFooter(ctx, canvasW, canvasH, aspectRatio);

    return canvas.toDataURL('image/png');
  }

  function renderTriviaAnswerCanvas(questionText, answerText, categoryLabel, evidenceText, evidenceImg, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#120822');
    bgGrad.addColorStop(0.5, '#190a30');
    bgGrad.addColorStop(1, '#0e2233');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Background Decorative Glow Circles
    ctx.save();
    ctx.fillStyle = 'rgba(0, 194, 168, 0.18)';
    ctx.beginPath();
    ctx.arc(isVertical ? 900 : 850, isVertical ? 240 : 140, isVertical ? 340 : 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(232, 93, 158, 0.15)';
    ctx.beginPath();
    ctx.arc(isVertical ? 180 : 140, isVertical ? 1680 : 860, isVertical ? 350 : 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top Header Bar
    const HEADER_H = isVertical ? 180 : 110;
    ctx.fillStyle = 'rgba(18, 8, 34, 0.9)';
    ctx.fillRect(0, 0, canvasW, HEADER_H);

    // Top Line Turquoise Accent
    ctx.fillStyle = '#00c2a8';
    ctx.fillRect(0, 0, canvasW, isVertical ? 8 : 7);

    if (isVertical) {
      // ── 9:16 Vertical Header: Unified Centered Logo + Title Group ──
      const logoSize = 135;
      const gapX = 20;
      const subText = '🎮 Solución / Respuesta — Amigos Jugones';

      ctx.font = '900 56px "Outfit", sans-serif';
      const titleW = ctx.measureText('TRIVIA JUGONA').width;
      ctx.font = '700 23px "Outfit", sans-serif';
      const subW = ctx.measureText(subText).width;
      const textW = Math.max(titleW, subW);
      const totalUnitW = logoSize + gapX + textW;

      const startX = Math.round((canvasW - totalUnitW) / 2);
      const logoX = startX;
      const logoY = Math.round((HEADER_H - logoSize) / 2);
      const centerY = Math.round(HEADER_H / 2);

      // Glowing Accent Lines
      const leftLineEnd = startX - 20;
      if (leftLineEnd > 35) {
        ctx.save();
        const leftGrad = ctx.createLinearGradient(35, 0, leftLineEnd, 0);
        leftGrad.addColorStop(0, 'rgba(0, 194, 168, 0.15)');
        leftGrad.addColorStop(1, 'rgba(0, 194, 168, 0.75)');
        ctx.strokeStyle = leftGrad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0, 194, 168, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(35, centerY);
        ctx.lineTo(leftLineEnd, centerY);
        ctx.stroke();
        ctx.restore();
      }

      const rightLineStart = startX + totalUnitW + 20;
      if (canvasW - 35 > rightLineStart + 10) {
        ctx.save();
        const rightGrad = ctx.createLinearGradient(rightLineStart, 0, canvasW - 35, 0);
        rightGrad.addColorStop(0, 'rgba(255, 209, 0, 0.75)');
        rightGrad.addColorStop(1, 'rgba(255, 209, 0, 0.15)');
        ctx.strokeStyle = rightGrad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(rightLineStart, centerY);
        ctx.lineTo(canvasW - 35, centerY);
        ctx.stroke();
        ctx.restore();
      }

      // Logo
      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 194, 168, 0.45)';
        ctx.shadowBlur = 18;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Title & Subtitle
      const textX = logoX + logoSize + gapX;
      ctx.save();
      const aTitleGrad = ctx.createLinearGradient(textX, 0, textX + titleW, 0);
      aTitleGrad.addColorStop(0, '#ffffff');
      aTitleGrad.addColorStop(0.5, '#ffd100');
      aTitleGrad.addColorStop(1, '#00c2a8');

      ctx.font = '900 56px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 194, 168, 0.55)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText('TRIVIA JUGONA', textX, centerY - 5);
      ctx.fillStyle = aTitleGrad;
      ctx.fillText('TRIVIA JUGONA', textX, centerY - 5);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 23px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(subText, textX, centerY + 32);
      ctx.restore();
    } else {
      // 1:1 Square Header
      ctx.save();
      const titleX = 215;
      const titleY = HEADER_H / 2 + 18;
      const aTitleGrad = ctx.createLinearGradient(titleX, 0, titleX + 330, 0);
      aTitleGrad.addColorStop(0, '#ffffff');
      aTitleGrad.addColorStop(0.5, '#ffd100');
      aTitleGrad.addColorStop(1, '#00c2a8');

      ctx.font = '900 52px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 194, 168, 0.55)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText('TRIVIA JUGONA', titleX, titleY);
      ctx.fillStyle = aTitleGrad;
      ctx.fillText('TRIVIA JUGONA', titleX, titleY);
      ctx.restore();

      ctx.fillStyle = '#00c2a8';
      ctx.font = 'bold 22px "Outfit", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('SOLUCIÓN / RESPUESTA', canvasW - 30, HEADER_H / 2 + 10);
      ctx.textAlign = 'left';
    }

    // Outer Glassmorphic Card Container
    const cardX = 50;
    const cardY = HEADER_H + 15;
    const cardW = canvasW - 100;
    const cardH = isVertical ? 1390 : 675;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = 'rgba(30, 13, 54, 0.88)';
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, isVertical ? 28 : 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 194, 168, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Floating Large Amigos Jugones Brand Logo (Only in 1:1 Square Mode)
    if (!isVertical && brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      const hLogoSize = 190;
      const hLogoX = 18;
      const hLogoY = 16;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(brandLogoImg, hLogoX, hLogoY, hLogoSize, hLogoSize);
      ctx.restore();
    }

    // Central Background Watermark Logo (Discreta)
    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      const wmSize = isVertical ? 480 : 360;
      ctx.drawImage(brandLogoImg, (canvasW - wmSize) / 2, cardY + (cardH - wmSize) / 2, wmSize, wmSize);
      ctx.restore();
    }

    let currentY = cardY + (isVertical ? 35 : 24);

    // 1. Category Badge (if present)
    if (categoryLabel && categoryLabel.trim()) {
      const catText = `🏷️ CATEGORÍA: ${categoryLabel.trim().toUpperCase()}`;
      ctx.fillStyle = 'rgba(255, 209, 0, 0.15)';
      const badgeH = isVertical ? 60 : 44;
      drawRoundRect(ctx, cardX + 40, currentY, cardW - 80, badgeH, 12);
      ctx.fill();

      ctx.fillStyle = '#ffd100';
      ctx.font = isVertical ? 'bold 26px "Outfit", sans-serif' : 'bold 22px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(catText, canvasW / 2, currentY + (isVertical ? 38 : 30));
      ctx.textAlign = 'left';

      currentY += isVertical ? 75 : 54;
    }

    // 2. Question Section (Clean, without nested heavy dark boxes)
    const hasEvidence = (evidenceText && evidenceText.trim()) || evidenceImg;

    // Question Section Header Label
    ctx.fillStyle = '#e85d9e';
    ctx.font = isVertical ? 'bold 20px "Outfit", sans-serif' : 'bold 16px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('❓ PREGUNTA DE TRIVIA', canvasW / 2, currentY + 12);

    // Question Text Display
    ctx.save();
    ctx.fillStyle = '#ffffff';
    let qFontSize = isVertical ? (hasEvidence ? 28 : 36) : (hasEvidence ? 24 : 30);
    if (questionText.length > 70) qFontSize = isVertical ? 24 : 22;

    ctx.font = `bold ${qFontSize}px "Outfit", sans-serif`;
    const qLineHeight = qFontSize * 1.3;
    const qLines = getWrappedLines(ctx, questionText, cardW - 100);
    const qTextHeight = qLines.length * qLineHeight;

    let qStartY = currentY + (isVertical ? 50 : 44);
    for (let k = 0; k < qLines.length; k++) {
      ctx.fillText(qLines[k], canvasW / 2, qStartY + (k * qLineHeight));
    }
    ctx.restore();

    currentY = qStartY + qTextHeight + (isVertical ? 24 : 16);

    // 3. Hero Answer Banner (The Winner Section)
    const ansBannerY = currentY;
    const ansBannerH = isVertical ? (hasEvidence ? 220 : 500) : (hasEvidence ? 140 : 330);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 194, 168, 0.4)';
    ctx.shadowBlur = 25;

    // Dark Glass Gradient con la paleta oficial (Violeta Oscuro / Neón)
    const heroGrad = ctx.createLinearGradient(cardX + 30, ansBannerY, cardX + cardW - 30, ansBannerY + ansBannerH);
    heroGrad.addColorStop(0, 'rgba(34, 14, 62, 0.95)');
    heroGrad.addColorStop(1, 'rgba(18, 8, 34, 0.95)');
    ctx.fillStyle = heroGrad;
    drawRoundRect(ctx, cardX + 30, ansBannerY, cardW - 60, ansBannerH, 18);
    ctx.fill();

    // Borde Neón Turquesa
    ctx.strokeStyle = '#00c2a8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Insignia del Banner (Pill badge)
    const pillW = isVertical ? 300 : 240;
    const pillH = isVertical ? 38 : 30;
    const pillY = ansBannerY + (isVertical ? 16 : 12);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 194, 168, 0.2)';
    drawRoundRect(ctx, (canvasW - pillW) / 2, pillY, pillW, pillH, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 194, 168, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? 'bold 18px "Outfit", sans-serif' : 'bold 14px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 RESPUESTA CORRECTA', canvasW / 2, pillY + (isVertical ? 25 : 20));
    ctx.restore();

    // Texto de la Respuesta Ganadora (Dorado Resplandeciente)
    ctx.save();
    ctx.fillStyle = '#ffd100';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
    ctx.shadowBlur = 18;

    let ansFontSize = isVertical ? (hasEvidence ? 50 : 64) : (hasEvidence ? 40 : 54);
    if (answerText.length > 30) ansFontSize = isVertical ? (hasEvidence ? 38 : 50) : (hasEvidence ? 32 : 42);
    if (answerText.length > 60) ansFontSize = isVertical ? (hasEvidence ? 28 : 38) : (hasEvidence ? 24 : 32);

    ctx.font = `bold ${ansFontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';

    // Centrar la respuesta visualmente en el área restante del banner (debajo de la insignia)
    const textAreaStartY = pillY + pillH + 8;
    const textAreaEndY = ansBannerY + ansBannerH - 10;
    const textAreaCenterY = (textAreaStartY + textAreaEndY) / 2;

    wrapText(ctx, answerText, canvasW / 2, textAreaCenterY, cardW - 100, ansFontSize * 1.25);
    ctx.restore();

    currentY = ansBannerY + ansBannerH + (isVertical ? 26 : 20);

    // 4. Evidence Section (High Prominence Picture / Text)
    const isImgValid = !!(evidenceImg && evidenceImg.complete && (evidenceImg.naturalWidth || evidenceImg.width) > 0);
    const isTextValid = !!(evidenceText && evidenceText.trim());

    if (isImgValid || isTextValid) {
      const maxContentY = isVertical ? 1520 : 780; // Safety boundary above floating QR card
      const remainingH = Math.max(40, maxContentY - currentY - 10);

      // Evidence Header
      ctx.fillStyle = '#ffd100';
      ctx.font = isVertical ? 'bold 20px "Outfit", sans-serif' : 'bold 16px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📌 EVIDENCIA DE LA RESPUESTA', canvasW / 2, currentY + 12);

      const evContentY = currentY + (isVertical ? 28 : 24);
      const evContentH = Math.max(40, remainingH - 24);

      if (isImgValid) {
        // Draw Large Prominent Screenshot Image
        const imgW = evidenceImg.naturalWidth || evidenceImg.width || 1;
        const imgH = evidenceImg.naturalHeight || evidenceImg.height || 1;

        const maxW = cardW - 80;
        const maxH = isTextValid ? evContentH - 45 : evContentH - 10;

        let drawW = maxW;
        let drawH = (imgH / imgW) * drawW;

        if (drawH > maxH) {
          drawH = Math.max(20, maxH);
          drawW = (imgW / imgH) * drawH;
        }

        const drawX = (canvasW - drawW) / 2;
        const drawY = evContentY + (maxH - drawH) / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 20;
        drawRoundRect(ctx, drawX, drawY, drawW, drawH, 14);
        ctx.clip();
        ctx.drawImage(evidenceImg, drawX, drawY, drawW, drawH);
        ctx.restore();

        ctx.strokeStyle = '#e85d9e';
        ctx.lineWidth = 3;
        drawRoundRect(ctx, drawX, drawY, drawW, drawH, 14);
        ctx.stroke();

        if (isTextValid) {
          ctx.fillStyle = '#ffffff';
          ctx.font = isVertical ? 'bold 22px "Outfit", sans-serif' : 'bold 18px "Outfit", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`" ${evidenceText.trim()} "`, canvasW / 2, drawY + drawH + (isVertical ? 32 : 25));
        }

      } else if (isTextValid) {
        // Text-only Evidence Quote Box
        ctx.fillStyle = 'rgba(14, 6, 26, 0.8)';
        drawRoundRect(ctx, cardX + 40, evContentY, cardW - 80, evContentH - 10, 14);
        ctx.fill();

        ctx.strokeStyle = '#e85d9e';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = isVertical ? 'bold 26px "Outfit", sans-serif' : 'bold 22px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        wrapText(ctx, `"${evidenceText.trim()}"`, canvasW / 2, evContentY + (evContentH / 2) + 5, cardW - 120, isVertical ? 36 : 30);
      }
    }

    // Anti-theft subtle watermark
    drawAntiTheftWatermark(ctx);

    // Creator Attribution Badge (Prominent, above footer)
    drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio);

    // Footer Bar con QR e Inscripción
    drawCardFooter(ctx, canvasW, canvasH, aspectRatio);

    return canvas.toDataURL('image/png');
  }

  function getWrappedLines(ctx, text, maxWidth) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    return lines;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const lines = getWrappedLines(ctx, text, maxWidth);
    const totalHeight = lines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);

    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k], x, startY + (k * lineHeight));
    }
  }

  /* -------------------------------------------------------------------------- */
  /* MAIN GENERATE HANDLER                                                      */
  /* -------------------------------------------------------------------------- */

  async function handleGenerate() {
    const questionText = questionInput.value.trim();
    const answerText = answerInput.value.trim();
    if (!questionText || !answerText) return;

    const cName = creatorNameInput ? creatorNameInput.value.trim() : '';
    const cIg = creatorIgInput ? creatorIgInput.value.trim() : '';

    const isAuthorized = await checkProtectedNameAccess(cName, cIg);
    if (!isAuthorized) return;

    await Promise.all([loadBrandLogo(), loadBrandQR()]);

    const categoryText = categoryInput ? categoryInput.value.trim() : '';
    const evidenceText = evidenceTextInput ? evidenceTextInput.value.trim() : '';
    const baseName = sanitizeFilename(questionText.substring(0, 30)) || 'TriviaBG';

    const aspectRatioInput = document.querySelector('input[name="aspectRatio"]:checked');
    const aspectRatio = aspectRatioInput ? aspectRatioInput.value : '1:1';

    const optionsArr = [
      optionAInput ? optionAInput.value.trim() : '',
      optionBInput ? optionBInput.value.trim() : '',
      optionCInput ? optionCInput.value.trim() : '',
      optionDInput ? optionDInput.value.trim() : ''
    ];

    // Show Loader
    loader.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    generateBtn.disabled = true;
    if (regenerateBtn) regenerateBtn.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      generatedResults = [
        {
          title: 'Tarjeta 1 — La Pregunta',
          filename: `${baseName}_Pregunta.png`,
          dataUrl: renderTriviaQuestionCanvas(questionText, categoryText, optionsArr, aspectRatio),
          description: 'Imagen con el desafío/pregunta lista para compartir en redes.'
        },
        {
          title: 'Tarjeta 2 — Solución',
          filename: `${baseName}_Solucion.png`,
          dataUrl: renderTriviaAnswerCanvas(questionText, answerText, categoryText, evidenceText, loadedEvidenceImg, aspectRatio),
          description: 'Imagen con la respuesta correcta y la evidencia de prueba.'
        }
      ];

      displayResults(generatedResults);
    } catch (err) {
      console.error('Error al generar tarjetas de Trivia:', err);
      alert('Ocurrió un error al procesar las tarjetas de trivia:\n' + (err.message || err) + '\n\n' + (err.stack || ''));
    } finally {
      loader.classList.add('hidden');
      generateBtn.disabled = false;
      if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.classList.remove('hidden');
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* UI RENDERING & DOWNLOADS                                                   */
  /* -------------------------------------------------------------------------- */

  function displayResults(results) {
    cardsGrid.innerHTML = '';

    results.forEach((item) => {
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
          <p class="section-subtitle" style="font-size:0.82rem; margin-bottom:8px;">${item.description}</p>
          <a href="${item.dataUrl}" download="${item.filename}" class="btn-download-card">
            📥 Guardar PNG
          </a>
        </div>
      `;

      cardsGrid.appendChild(card);
    });

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }

  function handleDownloadAll() {
    if (generatedResults.length === 0) return;

    generatedResults.forEach((item, i) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = item.dataUrl;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, i * 350);
    });
  }
});

