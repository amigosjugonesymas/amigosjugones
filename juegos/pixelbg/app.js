/**
 * PixelBG AMIGOS JUGONES - Application Logic
 * Comunidad de Juegos de Mesa y Más
 * Client-Side Image Pixelation Engine
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
      const logoSrc = (typeof window !== 'undefined' && window.BLACK_LOGO_DATA_URL) ? window.BLACK_LOGO_DATA_URL : 'assets/logo_black.png';
      img.src = logoSrc;
      img.onload = () => {
        brandBlackLogoImg = img;
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
    });
  }

  Promise.all([loadBrandLogo(), loadBrandQR(), loadBrandBlackLogo()]);

  const yearElem = document.getElementById('currentYear');
  if (yearElem) {
    yearElem.textContent = new Date().getFullYear();
  }

  function drawStockWatermark(ctx, x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.globalAlpha = 0.06; // Subtle stock-photo style anti-theft text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.rotate(-Math.PI / 7.5);

    const watermarkText = 'SÍGUENOS EN INSTAGRAM @AMIGOSJUGONESYMAS';
    const stepX = 400;
    const stepY = 150;

    const maxDim = Math.max(w, h) * 2;
    for (let cy = -maxDim; cy < maxDim * 2; cy += stepY) {
      const rowOffset = (Math.abs(Math.floor(cy / stepY)) % 2 === 0) ? 0 : stepX / 2;
      for (let cx = -maxDim; cx < maxDim * 2; cx += stepX) {
        ctx.fillText(watermarkText, cx + rowOffset, cy);
      }
    }

    ctx.restore();
  }

  function drawTopLeftBrandBadge(ctx, x = 20, y = 20) {
    if (!brandLogoImg || !brandLogoImg.complete || brandLogoImg.naturalWidth <= 0) return;

    ctx.save();
    const badgeW = 240;
    const badgeH = 50;

    ctx.fillStyle = 'rgba(15, 7, 29, 0.90)';
    drawRoundRect(ctx, x, y, badgeW, badgeH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 209, 0, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.drawImage(brandLogoImg, x + 8, y + 6, 38, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AMIGOS JUGONES', x + 54, y + 30);

    ctx.restore();
  }

  function drawStoryHeader(ctx, canvasW = 1080, headerH = 200) {
    ctx.save();

    // Dark header panel (no separator line)
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, 0, canvasW, headerH);

    const logoSize = 145;
    const gapX = 24;

    // Dynamically measure title & subtitle width to center logo + text as one unified unit
    const subText = '\uD83C\uDFAE Fondos Pixelados \u2014 Amigos Jugones';
    ctx.font = '900 58px "Outfit", sans-serif';
    const titleW = ctx.measureText('PIXEL JUGÓN').width;

    ctx.font = '700 25px "Outfit", sans-serif';
    const subW = ctx.measureText(subText).width;

    const textW = Math.max(titleW, subW);
    const totalUnitW = logoSize + gapX + textW;

    const startX = Math.round((canvasW - totalUnitW) / 2);
    const logoX = startX;
    const logoY = Math.round((headerH - logoSize) / 2);
    const centerY = Math.round(headerH / 2);

    // Decorative Glowing Side Accent Lines framing the central unit
    const leftLineEnd = startX - 25;
    if (leftLineEnd > 50) {
      ctx.save();
      const leftGrad = ctx.createLinearGradient(45, 0, leftLineEnd, 0);
      leftGrad.addColorStop(0, 'rgba(255, 209, 0, 0.15)');
      leftGrad.addColorStop(1, 'rgba(255, 209, 0, 0.75)');
      ctx.strokeStyle = leftGrad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(45, centerY);
      ctx.lineTo(leftLineEnd, centerY);
      ctx.stroke();
      ctx.restore();
    }

    const rightLineStart = startX + totalUnitW + 25;
    if (canvasW - 45 > rightLineStart + 10) {
      ctx.save();
      const rightGrad = ctx.createLinearGradient(rightLineStart, 0, canvasW - 45, 0);
      rightGrad.addColorStop(0, 'rgba(0, 194, 168, 0.75)');
      rightGrad.addColorStop(1, 'rgba(0, 194, 168, 0.15)');
      ctx.strokeStyle = rightGrad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 194, 168, 0.5)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(rightLineStart, centerY);
      ctx.lineTo(canvasW - 45, centerY);
      ctx.stroke();
      ctx.restore();
    }

    // Logo drawn attached to the left of title
    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
      ctx.shadowBlur = 20;
      ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    // Title & Subtitle — attached right next to the logo
    const textX = logoX + logoSize + gapX;

    ctx.save();
    ctx.fillStyle = '#ffd100';
    ctx.font = '900 58px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.55)';
    ctx.shadowBlur = 18;
    ctx.fillText('PIXEL JUGÓN', textX, centerY - 6);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = '700 25px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(subText, textX, centerY + 36);
    ctx.restore();

    ctx.restore();
  }

  function drawSquareHeader(ctx, canvasW = 1000, headerH = 140) {
    ctx.save();

    // Dark header panel (no separator line)
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, 0, canvasW, headerH);

    const logoSize = 105;
    const gapX = 18;

    // Dynamically measure title & subtitle width to center logo + text as one unified unit
    const subText = '\uD83C\uDFAE Fondos Pixelados \u2014 Amigos Jugones';
    ctx.font = '900 42px "Outfit", sans-serif';
    const titleW = ctx.measureText('PIXEL JUGÓN').width;

    ctx.font = '700 19px "Outfit", sans-serif';
    const subW = ctx.measureText(subText).width;

    const textW = Math.max(titleW, subW);
    const totalUnitW = logoSize + gapX + textW;

    const startX = Math.round((canvasW - totalUnitW) / 2);
    const logoX = startX;
    const logoY = Math.round((headerH - logoSize) / 2);
    const centerY = Math.round(headerH / 2);

    // Decorative Glowing Side Accent Lines framing the central unit
    const leftLineEnd = startX - 20;
    if (leftLineEnd > 35) {
      ctx.save();
      const leftGrad = ctx.createLinearGradient(35, 0, leftLineEnd, 0);
      leftGrad.addColorStop(0, 'rgba(255, 209, 0, 0.15)');
      leftGrad.addColorStop(1, 'rgba(255, 209, 0, 0.75)');
      ctx.strokeStyle = leftGrad;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
      ctx.shadowBlur = 6;
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
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 194, 168, 0.5)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(rightLineStart, centerY);
      ctx.lineTo(canvasW - 35, centerY);
      ctx.stroke();
      ctx.restore();
    }

    // Logo drawn attached to the left of title
    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
      ctx.shadowBlur = 16;
      ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    // Title & Subtitle — attached right next to the logo
    const textX = logoX + logoSize + gapX;

    ctx.save();
    ctx.fillStyle = '#ffd100';
    ctx.font = '900 42px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.5)';
    ctx.shadowBlur = 14;
    ctx.fillText('PIXEL JUGÓN', textX, centerY - 5);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = '700 19px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(subText, textX, centerY + 26);
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draws centered Category Badge pill below the header
   */
  function drawCategoryBadge(ctx, canvasW, badgeY, categoryLabel, isVertical = false) {
    if (!categoryLabel || !categoryLabel.trim()) return;
    const catText = `\uD83C\uDFF7\uFE0F CATEGOR\u00CDA: ${categoryLabel.trim().toUpperCase()}`;
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

  function drawBrandWatermarkOverlay(ctx, w, h) {
    // 1. Trama de texto de marca de agua tipo foto de stock (SÍGUENOS EN INSTAGRAM @AMIGOSJUGONESYMAS)
    drawStockWatermark(ctx, 0, 0, w, h);

    // 2. Insignia de Logo en Esquina Superior Izquierda (Orilla)
    drawTopLeftBrandBadge(ctx, 16, 16);

    // 3. Insignia de Autoría en Esquina Inferior Derecha (con QR + Logo + Marca)
    ctx.save();
    const hasQR = brandQRImg && brandQRImg.complete && brandQRImg.naturalWidth > 0;
    const badgeW = hasQR ? 320 : 220;
    const badgeH = 38;
    const badgeX = w - badgeW - 16;
    const badgeY = h - badgeH - 16;

    ctx.fillStyle = 'rgba(15, 7, 29, 0.88)';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();

    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let curX = badgeX + 8;

    if (hasQR) {
      ctx.fillStyle = '#ffffff';
      drawRoundRect(ctx, curX, badgeY + 4, 30, 30, 6);
      ctx.fill();

      const maxW = 26;
      const maxH = 26;
      const qrAspect = brandQRImg.naturalWidth / brandQRImg.naturalHeight;
      let drawW = maxW;
      let drawH = maxW / qrAspect;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = maxH * qrAspect;
      }
      const drawX = curX + 2 + (maxW - drawW) / 2;
      const drawY = badgeY + 6 + (maxH - drawH) / 2;

      ctx.save();
      drawRoundRect(ctx, drawX, drawY, drawW, drawH, 4);
      ctx.clip();
      ctx.drawImage(brandQRImg, drawX, drawY, drawW, drawH);
      ctx.restore();
      curX += 36;
    }

    if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
      ctx.drawImage(brandLogoImg, curX, badgeY + 5, 28, 28);
      curX += 34;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Creado por BLACK 🥷 AMIGOS JUGONES', curX, badgeY + 23);
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

  function drawCardFooterOnCanvas(ctx, canvasW = 1000, canvasH = 1000, aspectRatio = '1:1') {
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

    // ── CENTER: SÍGUENOS EN INSTAGRAM + Subtitle (Centered on Canvas/Image) ─────────
    const centerCenterX = Math.round(canvasW / 2);

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
    ctx.font = isVertical ? '700 16px "Outfit", sans-serif' : '700 14px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 Juego creado en Pixel Jugón: Fondos Pixelados — ¡Crea los tuyos!', centerCenterX, footerY + (isVertical ? 92 : 66));
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

  // Increment scale levels by 0.5% (0.005) steps for maximum guessing difficulty
  const SCALES = [
    { level: 'Original', badge: 'Original PNG', scale: 1.0, suffix: '' },
    { level: 'Nivel 1', badge: 'Escala 0.5% (Ultra Difícil)', scale: 0.005, suffix: ' 1' },
    { level: 'Nivel 2', badge: 'Escala 1.0% (Difícil)', scale: 0.010, suffix: ' 2' },
    { level: 'Nivel 3', badge: 'Escala 1.5% (Medio)', scale: 0.015, suffix: ' 3' },
    { level: 'Nivel 4', badge: 'Escala 2.0% (Fácil)', scale: 0.020, suffix: ' 4' }
  ];

  // --------------------------------------------------------------------------
  // Event Listeners: File Upload, Drag-and-Drop & Format Selector
  // --------------------------------------------------------------------------

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
    generateBtn.disabled = !hasFile || !hasName || !hasIg || !hasImageName;
  }

  if (creatorNameInput) creatorNameInput.addEventListener('input', validateForm);
  if (creatorIgInput) creatorIgInput.addEventListener('input', validateForm);
  imageNameInput.addEventListener('input', validateForm);

  generateBtn.addEventListener('click', processImage);
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
        // Normalize resolution & sharpness before pixelation
        loadedImage = await IMAGE_NORMALIZER.normalizeImage(img);
        validateForm();
      };
      img.src = e.target.result;

      dropzoneContent.classList.add('hidden');
      filePreviewInfo.classList.remove('hidden');
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

    dropzoneContent.classList.remove('hidden');
    filePreviewInfo.classList.add('hidden');
    resultsSection.classList.add('hidden');
    cardsGrid.innerHTML = '';
    generatedOutputs = [];
  }

  // --------------------------------------------------------------------------
  // Core Processing Engine (0.5% Steps Scale Increments & 9:16 Format Support)
  // --------------------------------------------------------------------------

  async function processImage() {
    if (!loadedImage || !currentFile) return;

    const creatorName = creatorNameInput ? creatorNameInput.value.trim() : '';
    const creatorIg = creatorIgInput ? creatorIgInput.value.trim() : '';

    const isAuthorized = await checkProtectedNameAccess(creatorName, creatorIg);
    if (!isAuthorized) return;

    const categoryText = categoryInput ? categoryInput.value.trim() : '';

    if (!creatorName) {
      alert('Por favor ingresa tu Nombre o Apodo antes de generar los fondos pixelados.');
      if (creatorNameInput) creatorNameInput.focus();
      return;
    }

    await Promise.all([loadBrandLogo(), loadBrandQR(), loadBrandBlackLogo()]);

    const baseName = imageNameInput.value.trim() || 'AmigosJugones_Pixel';
    const aspectRatio = document.querySelector('input[name="aspectRatio"]:checked')?.value || '1:1';

    resultsSection.classList.add('hidden');
    loader.classList.remove('hidden');

    setTimeout(() => {
      generatedOutputs = [];
      cardsGrid.innerHTML = '';

      const origW = loadedImage.naturalWidth || loadedImage.width;
      const origH = loadedImage.naturalHeight || loadedImage.height;

      SCALES.forEach(scaleConfig => {
        let pngDataUrl = '';

        if (aspectRatio === '9:16') {
          pngDataUrl = generateStoryPng(loadedImage, origW, origH, scaleConfig.scale, categoryText);
        } else {
          // 1:1 Framed: Header + Image + Footer
          pngDataUrl = generateSquarePng(loadedImage, origW, origH, scaleConfig.scale, categoryText);
        }

        const ratioSuffix = aspectRatio === '9:16' ? '_story' : '';
        const filename = `${baseName}${ratioSuffix}${scaleConfig.suffix}.png`;

        generatedOutputs.push({
          level: scaleConfig.level,
          badge: scaleConfig.badge + (aspectRatio === '9:16' ? ' (9:16)' : ''),
          filename: filename,
          dataUrl: pngDataUrl
        });
      });

      renderCards(aspectRatio);

      // Regitro asíncrono en Google Sheets
      const sizeStr = fileSizeDisplay ? fileSizeDisplay.textContent : `${origW}x${origH}`;
      sendToGoogleSheets({
        creatorName: creatorName,
        creatorIg: creatorIg,
        imageName: baseName,
        category: categoryText,
        originalSize: sizeStr,
        aspectRatio: aspectRatio,
        scaleLevels: 'Original, Nivel 1 (0.5%), Nivel 2 (1.0%), Nivel 3 (1.5%), Nivel 4 (2.0%)',
        timestamp: new Date().toISOString()
      });

      loader.classList.add('hidden');
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }

  /**
   * Generates a 9:16 Instagram Story (1080x1920) PNG canvas with pixelated/original image + brand footer
   */
  /**
   * Generates a 9:16 Instagram Story / Reel (1080x1920) PNG canvas
   */
  function generateStoryPng(img, w, h, baseScaleFactor, categoryLabel = '') {
    const canvasW = 1080;
    const canvasH = 1920;
    const headerH = 200;
    const footerH = 260;

    // 1. Build pixelated image canvas
    let imgCanvas = document.createElement('canvas');
    imgCanvas.width = w;
    imgCanvas.height = h;
    let imgCtx = imgCanvas.getContext('2d');

    if (baseScaleFactor === 1.0) {
      imgCtx.drawImage(img, 0, 0);
    } else {
      let scaleFactor = baseScaleFactor;
      if (w > 900 || h > 900) {
        scaleFactor *= 0.5;
      }
      const smallW = Math.max(1, Math.floor(w * scaleFactor));
      const smallH = Math.max(1, Math.floor(h * scaleFactor));

      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = smallW;
      smallCanvas.height = smallH;
      const smallCtx = smallCanvas.getContext('2d');
      smallCtx.imageSmoothingEnabled = true;
      smallCtx.imageSmoothingQuality = 'medium';
      smallCtx.drawImage(img, 0, 0, w, h, 0, 0, smallW, smallH);

      imgCtx.imageSmoothingEnabled = false;
      imgCtx.mozImageSmoothingEnabled = false;
      imgCtx.webkitImageSmoothingEnabled = false;
      imgCtx.msImageSmoothingEnabled = false;
      imgCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
    }

    // 2. Output 9:16 canvas
    const storyCanvas = document.createElement('canvas');
    storyCanvas.width = canvasW;
    storyCanvas.height = canvasH;
    const ctx = storyCanvas.getContext('2d');

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#120822');
    bgGrad.addColorStop(0.5, '#1e0d36');
    bgGrad.addColorStop(1, '#241240');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Decorative Glow Circles
    ctx.save();
    ctx.fillStyle = 'rgba(255, 46, 76, 0.12)';
    ctx.beginPath();
    ctx.arc(200, 280, 320, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 194, 168, 0.10)';
    ctx.beginPath();
    ctx.arc(880, 1640, 360, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Category floating below header + image box centered in remaining space
    const hasCategory_st = categoryLabel && categoryLabel.trim();
    const catH_st = hasCategory_st ? 50 : 0;
    const catPad_st = hasCategory_st ? 18 : 0;
    const catY_st = headerH + catPad_st;
    const contentTop = headerH + (hasCategory_st ? catPad_st + catH_st + 16 : 15);
    const footerY_calc = canvasH - footerH;
    const availableH = footerY_calc - contentTop - 20;

    const boxW = Math.min(canvasW - 40, 1040);
    const boxH = Math.min(availableH, boxW);
    const boxX = Math.round((canvasW - boxW) / 2);
    const boxY = Math.round(contentTop + (availableH - boxH) / 2);

    // White box background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Fit & draw pixelated image inside box
    const fitScale = Math.min(boxW / w, boxH / h);
    const drawW = Math.round(w * fitScale);
    const drawH = Math.round(h * fitScale);
    const drawX = boxX + Math.round((boxW - drawW) / 2);
    const drawY = boxY + Math.round((boxH - drawH) / 2);

    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.drawImage(imgCanvas, 0, 0, w, h, drawX, drawY, drawW, drawH);

    // Watermark clipped to box
    ctx.save();
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.clip();
    drawStockWatermark(ctx, boxX, boxY, boxW, boxH);
    ctx.restore();

    // Header (clean, no category inside), floating category badge, Creator Badge, Footer
    drawStoryHeader(ctx, canvasW, headerH);
    drawCategoryBadge(ctx, canvasW, catY_st, categoryLabel, true);
    drawCreatorBadge(ctx, canvasW, canvasH, '9:16');
    drawCardFooterOnCanvas(ctx, canvasW, canvasH, '9:16');

    return storyCanvas.toDataURL('image/png');
  }

  /**
   * Generates a 1:1 Cuadrado (1000×1000) PNG canvas
   */
  function generateSquarePng(img, w, h, baseScaleFactor, categoryLabel = '') {
    const canvasW = 1000;
    const canvasH = 1000;
    const headerH = 140;
    const footerH = 95;

    // 1. Build pixelated image canvas
    let imgCanvas = document.createElement('canvas');
    imgCanvas.width = w;
    imgCanvas.height = h;
    let imgCtx = imgCanvas.getContext('2d');

    if (baseScaleFactor === 1.0) {
      imgCtx.drawImage(img, 0, 0);
    } else {
      let scaleFactor = baseScaleFactor;
      if (w > 900 || h > 900) {
        scaleFactor *= 0.5;
      }
      const smallW = Math.max(1, Math.floor(w * scaleFactor));
      const smallH = Math.max(1, Math.floor(h * scaleFactor));

      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = smallW;
      smallCanvas.height = smallH;
      const smallCtx = smallCanvas.getContext('2d');
      smallCtx.imageSmoothingEnabled = true;
      smallCtx.imageSmoothingQuality = 'medium';
      smallCtx.drawImage(img, 0, 0, w, h, 0, 0, smallW, smallH);

      imgCtx.imageSmoothingEnabled = false;
      imgCtx.mozImageSmoothingEnabled = false;
      imgCtx.webkitImageSmoothingEnabled = false;
      imgCtx.msImageSmoothingEnabled = false;
      imgCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
    }

    // 2. Output 1:1 canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = canvasW;
    outCanvas.height = canvasH;
    const ctx = outCanvas.getContext('2d');

    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#120822');
    bgGrad.addColorStop(0.5, '#1e0d36');
    bgGrad.addColorStop(1, '#241240');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Decorative Glow Circles
    ctx.save();
    ctx.fillStyle = 'rgba(255, 46, 76, 0.12)';
    ctx.beginPath();
    ctx.arc(150, 150, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 194, 168, 0.10)';
    ctx.beginPath();
    ctx.arc(850, 850, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Category floating below header + image box centered in remaining space
    const hasCategory_sq = categoryLabel && categoryLabel.trim();
    const catH_sq = hasCategory_sq ? 38 : 0;
    const catPad_sq = hasCategory_sq ? 12 : 0;
    const catY_sq = headerH + catPad_sq;
    const contentTop_sq = headerH + (hasCategory_sq ? catPad_sq + catH_sq + 10 : 10);
    const footerY_sq = canvasH - footerH;
    const availableH_sq = footerY_sq - contentTop_sq - 12;

    const boxW = Math.min(canvasW - 40, 770);
    const boxH = Math.min(availableH_sq, boxW);
    const boxX = Math.round((canvasW - boxW) / 2);
    const boxY = Math.round(contentTop_sq + (availableH_sq - boxH) / 2);

    // White box background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Fit & draw pixelated image inside box
    const fitScale = Math.min(boxW / w, boxH / h);
    const drawW = Math.round(w * fitScale);
    const drawH = Math.round(h * fitScale);
    const drawX = boxX + Math.round((boxW - drawW) / 2);
    const drawY = boxY + Math.round((boxH - drawH) / 2);

    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    ctx.drawImage(imgCanvas, 0, 0, w, h, drawX, drawY, drawW, drawH);

    // Watermark clipped to box
    ctx.save();
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.clip();
    drawStockWatermark(ctx, boxX, boxY, boxW, boxH);
    ctx.restore();

    // Header (clean, no category inside), floating category badge, Creator Badge, Footer
    drawSquareHeader(ctx, canvasW, headerH);
    drawCategoryBadge(ctx, canvasW, catY_sq, categoryLabel, false);
    drawCreatorBadge(ctx, canvasW, canvasH, '1:1');
    drawCardFooterOnCanvas(ctx, canvasW, canvasH, '1:1');

    return outCanvas.toDataURL('image/png');
  }

  /**
   * Generates Pixelated PNG using 0.5% scale increments.
   * If image dimensions > 900px, applies PixelIt adaptive factor reduction (scaleFactor *= 0.5).
   */
  function generatePixelatedPng(img, w, h, baseScaleFactor) {
    let scaleFactor = baseScaleFactor;

    // PixelIt adaptive rule for images > 900px
    if (w > 900 || h > 900) {
      scaleFactor *= 0.5;
    }

    const smallW = Math.max(1, Math.floor(w * scaleFactor));
    const smallH = Math.max(1, Math.floor(h * scaleFactor));

    // Step 1: Small Canvas (Bilinear downscale)
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = smallW;
    smallCanvas.height = smallH;
    const smallCtx = smallCanvas.getContext('2d');
    smallCtx.imageSmoothingEnabled = true;
    smallCtx.imageSmoothingQuality = 'medium';
    smallCtx.drawImage(img, 0, 0, w, h, 0, 0, smallW, smallH);

    // Step 2: Output Canvas (Nearest Neighbor upscale for crisp pixel blocks)
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = w;
    outputCanvas.height = h;
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.imageSmoothingEnabled = false;
    outputCtx.mozImageSmoothingEnabled = false;
    outputCtx.webkitImageSmoothingEnabled = false;
    outputCtx.msImageSmoothingEnabled = false;

    outputCtx.drawImage(smallCanvas, 0, 0, smallW, smallH, 0, 0, w, h);

    // Marca de agua de autoría de Amigos Jugones
    drawBrandWatermarkOverlay(outputCtx, w, h);

    return outputCanvas.toDataURL('image/png');
  }

  // --------------------------------------------------------------------------
  // UI Rendering & Mobile Downloads
  // --------------------------------------------------------------------------

  function renderCards(aspectRatio = '1:1') {
    cardsGrid.innerHTML = '';
    const isVertical = aspectRatio === '9:16';

    generatedOutputs.forEach((item, index) => {
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
