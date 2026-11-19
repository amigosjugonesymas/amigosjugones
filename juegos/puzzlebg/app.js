/**
 * Puzzle Jugón — AMIGOS JUGONES - Application Logic
 * Comunidad de Juegos de Mesa y Más
 * 14x14 Micro-Grid Fragment Generator with High-Quality Bicubic Zoom
 * Framed 1080x1440 canvas: Header (160px) + Image (1080px) + Footer (200px)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const dropzoneContent = document.getElementById('dropzoneContent');
  const filePreviewInfo = document.getElementById('filePreviewInfo');
  const thumbnailPreview = document.getElementById('thumbnailPreview');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const fileSizeDisplay = document.getElementById('fileSizeDisplay');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const imageNameInput = document.getElementById('imageNameInput');
  const categoryInput = document.getElementById('categoryInput');
  const creatorNameInput = document.getElementById('creatorNameInput');
  const creatorIgInput = document.getElementById('creatorIgInput');
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const regenerateHeaderBtn = document.getElementById('regenerateHeaderBtn');
  const loader = document.getElementById('loader');
  const resultsSection = document.getElementById('resultsSection');
  const cardsGrid = document.getElementById('cardsGrid');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // Configuración de Google Apps Script Web App para registro en Google Sheets
  const GOOGLE_SHEETS_WEBAPP_URL = ''; // Pegar la URL del ejecutable de Google Apps Script aquí

  function sendToGoogleSheets(payload) {
    if (!GOOGLE_SHEETS_WEBAPP_URL) return;
    try {
      fetch(GOOGLE_SHEETS_WEBAPP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.warn('Sync a Google Sheets:', err));
    } catch (e) {
      console.warn('Sync a Google Sheets error:', e);
    }
  }

  // State Variables
  let currentFile = null;
  let loadedImage = null;
  let generatedOutputs = []; // Array of { level, badge, filename, dataUrl }
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

  const yearElem = document.getElementById('currentYear');
  if (yearElem) {
    yearElem.textContent = new Date().getFullYear();
  }

  function drawAntiTheftWatermark(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.045; // Subtle stock-photo style anti-theft watermark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.rotate(-Math.PI / 7.5);

    const watermarkText = 'SÍGUENOS EN INSTAGRAM @AMIGOSJUGONESYMAS';
    const stepX = 380;
    const stepY = 150;

    const maxDim = Math.max(w, h);
    for (let y = -maxDim; y < maxDim * 2; y += stepY) {
      const rowOffset = (Math.abs(Math.floor(y / stepY)) % 2 === 0) ? 0 : stepX / 2;
      for (let x = -maxDim; x < maxDim * 2; x += stepX) {
        ctx.fillText(watermarkText, x + rowOffset, y);
      }
    }

    ctx.restore();
  }

  /**
   * Draws the top header bar for Puzzle Jugón framed canvases.
   */
  function drawPuzzleHeader(ctx, canvasW, headerH) {
    const isStory = headerH > 140;
    ctx.save();

    // Dark header background
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, 0, canvasW, headerH);

    // Bottom separator gold line
    ctx.fillStyle = 'rgba(255, 209, 0, 0.45)';
    ctx.fillRect(0, headerH - 2, canvasW, 2);

    if (isStory) {
      // ── 9:16 Vertical Header: Unified Centered Logo + Title Group ──
      const logoSize = 145;
      const gapX = 22;
      const subText = '🧩 Pistas Reveladoras — Amigos Jugones';

      ctx.font = '900 58px "Outfit", sans-serif';
      const titleW = ctx.measureText('PUZZLE JUGÓN').width;
      ctx.font = '700 25px "Outfit", sans-serif';
      const subW = ctx.measureText(subText).width;
      const textW = Math.max(titleW, subW);
      const totalUnitW = logoSize + gapX + textW;

      const startX = Math.round((canvasW - totalUnitW) / 2);
      const logoX = startX;
      const logoY = Math.round((headerH - logoSize) / 2);
      const centerY = Math.round(headerH / 2);

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
        rightGrad.addColorStop(0, 'rgba(0, 194, 168, 0.75)');
        rightGrad.addColorStop(1, 'rgba(0, 194, 168, 0.15)');
        ctx.strokeStyle = rightGrad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0, 194, 168, 0.5)';
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
        ctx.shadowBlur = 20;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Title & Subtitle
      const textX = logoX + logoSize + gapX;
      ctx.save();
      ctx.fillStyle = '#ffd100';
      ctx.font = '900 58px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.55)';
      ctx.shadowBlur = 18;
      ctx.fillText('PUZZLE JUGÓN', textX, centerY - 6);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 25px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(subText, textX, centerY + 36);
      ctx.restore();
    } else {
      // 1:1 Square Header
      const logoSize = 105;
      const logoX = 35;
      const logoY = Math.round((headerH - logoSize) / 2);

      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
        ctx.shadowBlur = 12;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      const textX = logoX + logoSize + 18;
      const centerY = Math.round(headerH / 2);

      ctx.save();
      ctx.fillStyle = '#ffd100';
      ctx.font = '900 42px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.fillText('PUZZLE JUGÓN', textX, centerY - 5);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 19px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🧩 Pistas Reveladoras — Amigos Jugones', textX, centerY + 26);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draws centered Category Badge pill below the header
   */
  function drawCategoryBadge(ctx, canvasW, badgeY, categoryLabel, isVertical = false) {
    if (!categoryLabel || !categoryLabel.trim()) return;
    const catText = `🏷️ CATEGORÍA: ${categoryLabel.trim().toUpperCase()}`;
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
    const qrTopY = isVertical ? (footerY - 105) : (canvasH - (isVertical ? 230 : 190) - 8);
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

  /**
   * Draws bottom footer bar matching standard layout (QR left, text center, BLACK logo right).
   */
  function drawPuzzleFooter(ctx, canvasW, canvasH, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    ctx.save();

    // Dark footer background
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, footerY, canvasW, footerH);

    // Top separator gold line
    ctx.fillStyle = 'rgba(255, 209, 0, 0.45)';
    ctx.fillRect(0, footerY, canvasW, 2);

    // ── LEFT: Enlarged White QR Card ──────────────────────────────
    const qrCardW = isVertical ? 230 : 190;
    const qrCardH = isVertical ? 230 : 190;
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
      let dW = maxW, dH = maxW / qrAspect;
      if (dH > maxH) { dH = maxH; dW = maxH * qrAspect; }
      const dX = qrCardX + qrMargin + (maxW - dW) / 2;
      const dY = qrCardY + qrMargin + (maxH - dH) / 2;
      ctx.drawImage(brandQRImg, dX, dY, dW, dH);
    }

    // ── CENTER: SÍGUENOS EN INSTAGRAM + Subtitle (Centered on Canvas) ─────────
    const centerCenterX = isVertical ? Math.round(canvasW / 2) : Math.round(canvasW / 2 + (qrCardW / 4) + 10);

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? '900 28px "Outfit", sans-serif' : '900 22px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText('📸 ¡SIGUENOS en INSTAGRAM!', centerCenterX, footerY + (isVertical ? 48 : 38));
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? '700 16px "Outfit", sans-serif' : '700 14px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧩 Juego creado en Puzzle Jugón: Pistas Reveladoras — ¡Crea los tuyos!', centerCenterX, footerY + (isVertical ? 92 : 66));
    ctx.restore();

    // ── RIGHT: Floating BLACK Logo Unit (Base Leveled with QR Card Base) ──────────────────────
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

  function drawBrandWatermarkOverlay(ctx, w, h) {
    // 1. Marca de Agua Central Discreta (14% Opacidad)
    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      const wmSize = Math.min(w, h) * 0.38;
      ctx.drawImage(brandLogoImg, (w - wmSize) / 2, (h - wmSize) / 2, wmSize, wmSize);
      ctx.restore();
    }

    // 2. Trama de Marca de Agua Anti-Robo
    drawAntiTheftWatermark(ctx, w, h);

    // 3. Insignia de Autoría en Esquina Inferior Derecha (con QR + Logo Batman + Marca)
    ctx.save();
    const hasQR = brandQRImg && brandQRImg.complete && brandQRImg.naturalWidth > 0;
    const badgeW = Math.min(w - 30, 360);
    const badgeH = 46;
    const badgeX = w - badgeW - 16;
    const badgeY = h - badgeH - 16;

    ctx.fillStyle = 'rgba(10, 4, 20, 0.92)';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 209, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let curX = badgeX + 8;

    // Mini QR en la insignia (preservando relación de aspecto exacta para escaneo)
    if (hasQR) {
      ctx.fillStyle = '#ffffff';
      drawRoundRect(ctx, curX, badgeY + 4, 38, 38, 6);
      ctx.fill();

      const maxW = 34;
      const maxH = 34;
      const qrAspect = brandQRImg.naturalWidth / brandQRImg.naturalHeight;
      let drawW = maxW;
      let drawH = maxW / qrAspect;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = maxH * qrAspect;
      }
      const drawX = curX + 2 + (maxW - drawW) / 2;
      const drawY = badgeY + 6 + (maxH - drawH) / 2;

      ctx.drawImage(brandQRImg, drawX, drawY, drawW, drawH);
      curX += 46;
    }

    // Logo Amigos Jugones
    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.drawImage(brandLogoImg, curX, badgeY + 5, 36, 36);
      curX += 42;
    }

    // Texto Autoría + BLACK Batman Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = '500 12px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Sistema creado por', curX, badgeY + 28);

    if (brandBlackLogoImg && brandBlackLogoImg.complete && brandBlackLogoImg.naturalWidth > 0) {
      const bLogoSize = 32;
      const bAspect = brandBlackLogoImg.naturalWidth / brandBlackLogoImg.naturalHeight;
      const bLogoW = Math.round(bLogoSize * bAspect);
      ctx.drawImage(brandBlackLogoImg, badgeX + badgeW - bLogoW - 10, badgeY + (badgeH - bLogoSize) / 2, bLogoW, bLogoSize);
    }
    ctx.restore();
  }

  // 4 Single-Fragment Clue Levels + Original Solution
  const CLUE_LEVELS = [
    { level: 'Original', badge: 'Original PNG (Solución)', clueIndex: -1, suffix: '' },
    { level: 'Nivel 1', badge: 'Pista 1 (Detalle Micro 1)', clueIndex: 0, suffix: ' 1' },
    { level: 'Nivel 2', badge: 'Pista 2 (Detalle Micro 2)', clueIndex: 1, suffix: ' 2' },
    { level: 'Nivel 3', badge: 'Pista 3 (Detalle Micro 3)', clueIndex: 2, suffix: ' 3' },
    { level: 'Nivel 4', badge: 'Pista 4 (Detalle Micro 4)', clueIndex: 3, suffix: ' 4' }
  ];

  // Ultra-Dense 14x14 Grid = 196 micro-squares for maximum guessing challenge!
  const GRID_SIZE = 14;

  // --------------------------------------------------------------------------
  // Event Listeners: File Upload & Drag-and-Drop
  // --------------------------------------------------------------------------

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelected(files[0]);
    }
  });

  dropzone.addEventListener('click', (e) => {
    if (e.target !== fileInput && e.target !== removeFileBtn) {
      fileInput.click();
    }
  });

  // Clipboard Paste Support (Ctrl+V)
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleFileSelected(file);
          break;
        }
      }
    }
  });

  const cardOptionSquare = document.getElementById('cardOptionSquare');
  const cardOptionStory = document.getElementById('cardOptionStory');
  if (cardOptionSquare && cardOptionStory) {
    cardOptionSquare.addEventListener('click', () => {
      cardOptionSquare.classList.add('active');
      cardOptionStory.classList.remove('active');
      const radio = cardOptionSquare.querySelector('input');
      if (radio) radio.checked = true;
    });
    cardOptionStory.addEventListener('click', () => {
      cardOptionStory.classList.add('active');
      cardOptionSquare.classList.remove('active');
      const radio = cardOptionStory.querySelector('input');
      if (radio) radio.checked = true;
    });
  }

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetForm();
  });

  function validateForm() {
    const hasFile = currentFile !== null;
    const hasName = creatorNameInput ? creatorNameInput.value.trim().length > 0 : true;
    const hasIg = creatorIgInput ? creatorIgInput.value.trim().length > 0 : true;
    const hasImageName = imageNameInput ? imageNameInput.value.trim().length > 0 : true;
    const isValid = hasFile && hasName && hasIg && hasImageName;
    generateBtn.disabled = !isValid;
    regenerateBtn.disabled = !isValid;
  }

  if (creatorNameInput) creatorNameInput.addEventListener('input', validateForm);
  if (creatorIgInput) creatorIgInput.addEventListener('input', validateForm);
  imageNameInput.addEventListener('input', validateForm);

  generateBtn.addEventListener('click', processSingleFragmentClues);
  regenerateBtn.addEventListener('click', processSingleFragmentClues);
  if (regenerateHeaderBtn) {
    regenerateHeaderBtn.addEventListener('click', processSingleFragmentClues);
  }
  downloadAllBtn.addEventListener('click', downloadAllImages);

  // --------------------------------------------------------------------------
  // File Handling & Form Helpers
  // --------------------------------------------------------------------------

  function handleFileSelected(file) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona o pega un archivo de imagen válido (PNG, JPG, WEBP, etc.).');
      return;
    }

    currentFile = file;

    const sizeInKb = (file.size / 1024).toFixed(1);
    fileSizeDisplay.textContent = `${sizeInKb} KB`;

    const fullFileName = file.name || 'imagen_pegada.png';
    const lastDotIndex = fullFileName.lastIndexOf('.');
    let rawName = lastDotIndex > 0 ? fullFileName.substring(0, lastDotIndex) : fullFileName;
    if (rawName.toLowerCase() === 'image' || rawName.toLowerCase() === 'blob' || !rawName) {
      rawName = 'ImagenPegada';
    }

    fileNameDisplay.textContent = fullFileName;
    imageNameInput.value = rawName;
    imageNameInput.disabled = false;
    if (categoryInput) categoryInput.disabled = false;
    validateForm();

    const reader = new FileReader();
    reader.onload = (e) => {
      thumbnailPreview.src = e.target.result; // Preview shows original

      const img = new Image();
      img.onload = async () => {
        // Normalize resolution & sharpness before fragment extraction
        loadedImage = await IMAGE_NORMALIZER.normalizeImage(img);
      };
      img.src = e.target.result;

      dropzoneContent.classList.add('hidden');
      filePreviewInfo.classList.remove('hidden');
      regenerateBtn.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  function resetForm() {
    currentFile = null;
    loadedImage = null;
    fileInput.value = '';
    imageNameInput.value = '';
    imageNameInput.disabled = true;
    if (categoryInput) {
      categoryInput.value = '';
      categoryInput.disabled = true;
    }
    generateBtn.disabled = true;
    regenerateBtn.disabled = true;

    dropzoneContent.classList.remove('hidden');
    filePreviewInfo.classList.add('hidden');
    regenerateBtn.classList.add('hidden');
    resultsSection.classList.add('hidden');
    cardsGrid.innerHTML = '';
    generatedOutputs = [];
  }

  // --------------------------------------------------------------------------
  // Core Engine: 14x14 Micro-Grid & High-Quality Bicubic Fragment Zoom
  // --------------------------------------------------------------------------

  async function processSingleFragmentClues() {
    const creatorName = creatorNameInput ? creatorNameInput.value.trim() : '';
    const creatorIg = creatorIgInput ? creatorIgInput.value.trim() : '';
    const categoryText = categoryInput ? categoryInput.value.trim() : '';

    if (!creatorName) {
      alert('Por favor ingresa tu Nombre o Apodo antes de generar las pistas.');
      if (creatorNameInput) creatorNameInput.focus();
      return;
    }

    const isAuthorized = await checkProtectedNameAccess(creatorName, creatorIg);
    if (!isAuthorized) return;

    const targetImg = loadedImage || (thumbnailPreview && thumbnailPreview.src ? thumbnailPreview : null);
    if (!targetImg || !currentFile) {
      alert('Por favor selecciona una imagen antes de generar.');
      return;
    }

    await Promise.all([loadBrandLogo(), loadBrandQR(), loadBrandBlackLogo()]);

    const baseName = imageNameInput.value.trim() || 'AmigosJugones_Pista';
    const aspectRatio = document.querySelector('input[name="aspectRatio"]:checked')?.value || '1:1';

    generateBtn.disabled = true;
    regenerateBtn.disabled = true;
    if (regenerateHeaderBtn) regenerateHeaderBtn.disabled = true;

    resultsSection.classList.add('hidden');
    loader.classList.remove('hidden');

    setTimeout(() => {
      try {
        generatedOutputs = [];
        cardsGrid.innerHTML = '';

        const w = targetImg.naturalWidth || targetImg.width || 1000;
        const h = targetImg.naturalHeight || targetImg.height || 1000;

        // Downsample inspection canvas for ultra-fast smart tile sampling (max 800px)
        const sampleSize = Math.min(Math.max(w, h), 800);
        const sampleW = Math.round(w >= h ? sampleSize : (w * sampleSize / h));
        const sampleH = Math.round(h >= w ? sampleSize : (h * sampleSize / w));

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sampleW;
        tempCanvas.height = sampleH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(targetImg, 0, 0, sampleW, sampleH);

        const N = GRID_SIZE;
        const tileW = sampleW / N;
        const tileH = sampleH / N;

        // Select 4 distinct interesting tiles (ignoring outer borders and blank white spaces)
        const selectedTileIndices = selectSmartClueTiles(tempCtx, sampleW, sampleH, N, tileW, tileH, 4);

        CLUE_LEVELS.forEach(levelConfig => {
          let pngDataUrl = '';

          if (levelConfig.clueIndex === -1) {
            // Original PNG con Header + Footer + Marca de Agua
            pngDataUrl = generateFramedOriginalPng(targetImg, w, h, categoryText, aspectRatio);
          } else {
            // Pista con Header + Footer + Fragment Zoom (framed)
            const rawTileIdx = selectedTileIndices[levelConfig.clueIndex];
            const tileIndexToReveal = (typeof rawTileIdx === 'number' && !isNaN(rawTileIdx)) ? rawTileIdx : 0;
            pngDataUrl = generateFramedCluePng(targetImg, w, h, N, tileIndexToReveal, categoryText, aspectRatio);
          }

          const ratioSuffix = aspectRatio === '9:16' ? '_story' : '';
          const filename = `${baseName}${ratioSuffix}${levelConfig.suffix}.png`;

          generatedOutputs.push({
            level: levelConfig.level,
            badge: levelConfig.badge + (aspectRatio === '9:16' ? ' (9:16)' : ''),
            filename: filename,
            dataUrl: pngDataUrl
          });
        });

        // Registro asíncrono en Google Sheets
        sendToGoogleSheets({
          creatorName: creatorName,
          creatorIg: creatorIg,
          imageName: baseName,
          category: categoryText,
          fragmentCount: 4,
          format: aspectRatio,
          timestamp: new Date().toISOString()
        });

        renderCards(aspectRatio);
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error('Error generando pistas en Puzzle Jugón:', err);
        alert('Ocurrió un inconveniente al generar las pistas. Por favor intenta nuevamente.');
      } finally {
        loader.classList.add('hidden');
        generateBtn.disabled = false;
        regenerateBtn.disabled = false;
        if (regenerateHeaderBtn) regenerateHeaderBtn.disabled = false;
      }
    }, 150);
  }

  /**
   * Smartly selects 'count' distinct tile indices from 14x14 grid:
   * 1. Prefers inner tiles (ignores outer border rows/columns).
   * 2. Checks color variance & transparency to discard solid white or blank tiles.
   */
  function selectSmartClueTiles(ctx, w, h, N, tileW, tileH, count) {
    const innerCandidates = [];
    const allCandidates = [];

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const index = r * N + c;
        const x = c * tileW;
        const y = r * tileH;

        // Inner tiles ignore outer 3 rows/cols for 14x14 grid
        const isInner = r >= 3 && r <= N - 4 && c >= 3 && c <= N - 4;
        const isInteresting = isTileInteresting(ctx, x, y, tileW, tileH);

        if (isInteresting) {
          if (isInner) {
            innerCandidates.push(index);
          }
          allCandidates.push(index);
        }
      }
    }

    // Shuffle candidates
    shuffleArray(innerCandidates);
    shuffleArray(allCandidates);

    const result = [];
    innerCandidates.forEach(idx => {
      if (result.length < count && !result.includes(idx)) {
        result.push(idx);
      }
    });

    allCandidates.forEach(idx => {
      if (result.length < count && !result.includes(idx)) {
        result.push(idx);
      }
    });

    let fallbackIdx = 0;
    while (result.length < count && fallbackIdx < N * N) {
      if (!result.includes(fallbackIdx)) {
        result.push(fallbackIdx);
      }
      fallbackIdx++;
    }

    return result;
  }

  /**
   * Checks if a tile region contains meaningful image content
   */
  function isTileInteresting(ctx, x, y, tileW, tileH) {
    try {
      const marginX = Math.floor(tileW * 0.1);
      const marginY = Math.floor(tileH * 0.1);
      const sampleX = Math.max(0, Math.floor(x + marginX));
      const sampleY = Math.max(0, Math.floor(y + marginY));
      const sampleW = Math.max(1, Math.floor(tileW - marginX * 2));
      const sampleH = Math.max(1, Math.floor(tileH - marginY * 2));

      const imgData = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);
      const data = imgData.data;
      const pixelCount = data.length / 4;

      if (pixelCount === 0) return false;

      let totalR = 0, totalG = 0, totalB = 0;
      let transparentPixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 50) transparentPixels++;

        totalR += r;
        totalG += g;
        totalB += b;
      }

      if (transparentPixels / pixelCount > 0.25) return false;

      const meanR = totalR / pixelCount;
      const meanG = totalG / pixelCount;
      const meanB = totalB / pixelCount;

      if (meanR > 240 && meanG > 240 && meanB > 240) return false;

      let varianceSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const diffR = data[i] - meanR;
        const diffG = data[i + 1] - meanG;
        const diffB = data[i + 2] - meanB;
        varianceSum += (diffR * diffR + diffG * diffG + diffB * diffB);
      }

      const stdDev = Math.sqrt(varianceSum / (pixelCount * 3));
      return stdDev >= 10;
    } catch (e) {
      return true;
    }
  }

  /**
   * Generates a framed PNG for the original/solution image (1:1 1000×1000 or 9:16 1080×1920):
   */
  function generateFramedOriginalPng(img, w, h, categoryLabel = '', aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;
    const headerH = isVertical ? 200 : 140;
    const footerH = isVertical ? 260 : 95;

    const out = document.createElement('canvas');
    out.width = canvasW;
    out.height = canvasH;
    const ctx = out.getContext('2d');

    // Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#120822');
    bgGrad.addColorStop(0.5, '#1e0d36');
    bgGrad.addColorStop(1, '#241240');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Decorative Glow Circles
    ctx.save();
    ctx.fillStyle = 'rgba(232, 93, 158, 0.12)';
    ctx.beginPath();
    ctx.arc(isVertical ? 200 : 150, isVertical ? 280 : 150, isVertical ? 320 : 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 194, 168, 0.10)';
    ctx.beginPath();
    ctx.arc(isVertical ? 880 : 850, isVertical ? 1640 : 850, isVertical ? 360 : 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Determine category badge location & content bounds
    const hasCategory = categoryLabel && categoryLabel.trim();
    const catY = headerH + (isVertical ? 18 : 12);
    const catH = hasCategory ? (isVertical ? 50 : 38) : 0;

    const contentStartY = headerH + (hasCategory ? catH + (isVertical ? 25 : 18) : (isVertical ? 35 : 20));
    const contentMaxH = canvasH - footerH - contentStartY - (isVertical ? 35 : 20);

    const maxBoxSize = isVertical ? 1040 : 770;
    const boxW = Math.min(canvasW - (isVertical ? 80 : 60), maxBoxSize);
    const boxH = Math.min(contentMaxH, boxW);
    const boxX = Math.round((canvasW - boxW) / 2);
    const boxY = Math.round(contentStartY + (contentMaxH - boxH) / 2);

    // White image background box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Fit image inside container box
    const fitScale = Math.min(boxW / w, boxH / h);
    const dW = Math.round(w * fitScale);
    const dH = Math.round(h * fitScale);
    const dX = boxX + Math.round((boxW - dW) / 2);
    const dY = boxY + Math.round((boxH - dH) / 2);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h, dX, dY, dW, dH);

    // Watermark clipped to box
    ctx.save();
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.clip();
    drawAntiTheftWatermark(ctx, canvasW, canvasH);
    ctx.restore();

    // Header, Category Badge, Creator Badge, and Footer
    drawPuzzleHeader(ctx, canvasW, headerH);
    drawCategoryBadge(ctx, canvasW, catY, categoryLabel, isVertical);
    drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio);
    drawPuzzleFooter(ctx, canvasW, canvasH, aspectRatio);

    return out.toDataURL('image/png');
  }

  /**
   * Generates a framed clue PNG (1:1 1000×1000 or 9:16 1080×1920):
   */
  function generateFramedCluePng(img, w, h, N, revealedTileIndex, categoryLabel = '', aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;
    const headerH = isVertical ? 200 : 140;
    const footerH = isVertical ? 260 : 95;

    const out = document.createElement('canvas');
    out.width = canvasW;
    out.height = canvasH;
    const ctx = out.getContext('2d');

    // Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#120822');
    bgGrad.addColorStop(0.5, '#1e0d36');
    bgGrad.addColorStop(1, '#241240');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Decorative Glow Circles
    ctx.save();
    ctx.fillStyle = 'rgba(232, 93, 158, 0.12)';
    ctx.beginPath();
    ctx.arc(isVertical ? 200 : 150, isVertical ? 280 : 150, isVertical ? 320 : 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 194, 168, 0.10)';
    ctx.beginPath();
    ctx.arc(isVertical ? 880 : 850, isVertical ? 1640 : 850, isVertical ? 360 : 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Determine category badge location & content bounds
    const hasCategory = categoryLabel && categoryLabel.trim();
    const catY = headerH + (isVertical ? 18 : 12);
    const catH = hasCategory ? (isVertical ? 50 : 38) : 0;

    const contentStartY = headerH + (hasCategory ? catH + (isVertical ? 25 : 18) : (isVertical ? 35 : 20));
    const contentMaxH = canvasH - footerH - contentStartY - (isVertical ? 35 : 20);

    const maxBoxSize = isVertical ? 1040 : 770;
    const boxW = Math.min(canvasW - (isVertical ? 80 : 60), maxBoxSize);
    const boxH = Math.min(contentMaxH, boxW);
    const boxX = Math.round((canvasW - boxW) / 2);
    const boxY = Math.round(contentStartY + (contentMaxH - boxH) / 2);

    // 14x14 Grid & Highlight
    const fitScale = Math.min(boxW / w, boxH / h);
    const dW = Math.round(w * fitScale);
    const dH = Math.round(h * fitScale);
    const dX = boxX + Math.round((boxW - dW) / 2);
    const dY = boxY + Math.round((boxH - dH) / 2);

    const tileW_orig = w / N;
    const tileH_orig = h / N;
    const tileW = dW / N;
    const tileH = dH / N;

    // Grid lines over image area
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(232, 93, 158, 0.22)';
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        ctx.strokeRect(dX + col * tileW, dY + row * tileH, tileW, tileH);
      }
    }

    // Highlight tile location
    const tRow = Math.floor(revealedTileIndex / N);
    const tCol = revealedTileIndex % N;
    const hlX = dX + tCol * tileW;
    const hlY = dY + tRow * tileH;

    ctx.fillStyle = 'rgba(255, 209, 0, 0.25)';
    ctx.fillRect(hlX, hlY, tileW, tileH);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.9)';
    ctx.strokeRect(hlX, hlY, tileW, tileH);

    // Zoomed fragment — 52% of container box
    const srcX = tCol * tileW_orig;
    const srcY = tRow * tileH_orig;
    const zoomSize = Math.round(boxH * 0.52);
    const zoomX = Math.round((canvasW - zoomSize) / 2);
    const zoomY = Math.round(boxY + (boxH - zoomSize) / 2);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(img, srcX, srcY, tileW_orig, tileH_orig, zoomX, zoomY, zoomSize, zoomSize);
    ctx.restore();

    // Gold border around fragment
    ctx.lineWidth = Math.max(3, canvasW * 0.004);
    ctx.strokeStyle = '#ffd100';
    ctx.strokeRect(zoomX, zoomY, zoomSize, zoomSize);

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.strokeRect(zoomX + 2, zoomY + 2, zoomSize - 4, zoomSize - 4);

    // Header, Category Badge, Creator Badge, and Footer
    drawPuzzleHeader(ctx, canvasW, headerH);
    drawCategoryBadge(ctx, canvasW, catY, categoryLabel, isVertical);
    drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio);
    drawPuzzleFooter(ctx, canvasW, canvasH, aspectRatio);

    return out.toDataURL('image/png');
  }

  /**
   * Generates a high-quality clue PNG (LEGACY — no longer called directly):

   * 1. Draws 14x14 background grid with highlighted position indicator.
   * 2. Scales UP the micro-fragment prominently using Bicubic High Quality smoothing
   *    so it is large, clear, and unpixelated!
   */
  function generateZoomedTileCanvasPng(img, w, h, N, revealedTileIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const tileW = w / N;
    const tileH = h / N;

    // Fill canvas with dark background
    ctx.fillStyle = '#0f071d';
    ctx.fillRect(0, 0, w, h);

    // 1. Draw subtle 14x14 background grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(232, 93, 158, 0.15)'; // Pinkish purple grid lines

    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        ctx.strokeRect(col * tileW, row * tileH, tileW, tileH);
      }
    }

    // Determine row & col of revealed micro-fragment
    const row = Math.floor(revealedTileIndex / N);
    const col = revealedTileIndex % N;
    const srcX = col * tileW;
    const srcY = row * tileH;

    // Highlight exact grid location on full map
    ctx.fillStyle = 'rgba(255, 209, 0, 0.2)';
    ctx.fillRect(srcX, srcY, tileW, tileH);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.85)';
    ctx.strokeRect(srcX, srcY, tileW, tileH);

    // 2. ENLARGED HIGH-QUALITY FRAGMENT VIEW (Bicubic High-Quality Interpolation)
    // Calculate prominent zoomed size (takes ~50% of image canvas)
    const targetW = Math.min(w, h) * 0.50;
    const targetH = Math.min(w, h) * 0.50;
    const targetX = (w - targetW) / 2;
    const targetY = (h - targetH) / 2;

    // Enable high-quality bicubic smoothing for clear enlargement without blockiness
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw shadow behind enlarged fragment container
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;

    // Draw high quality enlarged fragment
    ctx.drawImage(img, srcX, srcY, tileW, tileH, targetX, targetY, targetW, targetH);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw gold border around enlarged clue frame
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.006);
    ctx.strokeStyle = '#ffd100';
    ctx.strokeRect(targetX, targetY, targetW, targetH);

    // Inner subtle glow line
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.strokeRect(targetX + 2, targetY + 2, targetW - 4, targetH - 4);

    // Marca de agua de autoría de Amigos Jugones
    drawBrandWatermarkOverlay(ctx, w, h);

    return canvas.toDataURL('image/png');
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }

  // --------------------------------------------------------------------------
  // UI Rendering & Mobile Downloads
  // --------------------------------------------------------------------------

  function renderCards(aspectRatio = '1:1') {
    cardsGrid.innerHTML = '';
    const isVertical = aspectRatio === '9:16';

    generatedOutputs.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'result-card';

      const isOriginal = item.level === 'Original';
      const badgeClass = isOriginal ? 'card-badge original' : 'card-badge';
      const wrapClass = isVertical ? 'card-image-wrap vertical' : 'card-image-wrap';

      card.innerHTML = `
        <div class="${wrapClass}">
          <span class="${badgeClass}">${item.badge}</span>
          <img src="${item.dataUrl}" alt="${item.filename}" class="card-img">
        </div>
        <div class="card-body">
          <div class="card-info">
            <h3 class="card-title">${item.level}</h3>
            <span class="card-filename">${item.filename}</span>
          </div>
          <a href="${item.dataUrl}" download="${item.filename}" class="btn-download-card">
            📥 Guardar PNG
          </a>
        </div>
      `;

      cardsGrid.appendChild(card);
    });
  }

  function downloadAllImages() {
    if (!generatedOutputs || generatedOutputs.length === 0) return;

    generatedOutputs.forEach((item, index) => {
      setTimeout(() => {
        const tempLink = document.createElement('a');
        tempLink.href = item.dataUrl;
        tempLink.download = item.filename;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
      }, index * 350);
    });
  }
});
