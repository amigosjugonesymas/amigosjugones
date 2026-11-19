/**
 * RevoltijoBG AMIGOS JUGONES - Application Logic
 * Encrypted Word Challenge Generator for WhatsApp & Community Groups
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const creatorNameInput = document.getElementById('creatorNameInput');
  const creatorIgInput = document.getElementById('creatorIgInput');
  const secretTextInput = document.getElementById('secretTextInput');
  const categoryInput = document.getElementById('categoryInput');
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const loader = document.getElementById('loader');
  const resultsSection = document.getElementById('resultsSection');
  const cardsGrid = document.getElementById('cardsGrid');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // State
  let generatedResults = [];
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

  function drawAntiTheftWatermark(ctx, canvasW = 1000, canvasH = 1000) {
    ctx.save();
    ctx.globalAlpha = 0.045; // Subtle stock-photo style anti-theft watermark
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.rotate(-Math.PI / 7.5);

    const watermarkText = 'SÍGUENOS EN INSTAGRAM @AMIGOSJUGONESYMAS';
    const stepX = 380;
    const stepY = 150;

    const maxDim = Math.max(canvasW, canvasH);
    for (let y = -maxDim; y < maxDim * 2; y += stepY) {
      const rowOffset = (Math.abs(Math.floor(y / stepY)) % 2 === 0) ? 0 : stepX / 2;
      for (let x = -maxDim; x < maxDim * 2; x += stepX) {
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

    // Linea 2: Juego creado en Revoltijo Jugón
    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? '700 16px "Outfit", sans-serif' : '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Juego creado en Revoltijo Jugón: Acertijos Cifrados — ¡Crea los tuyos!', centerCenterX, footerY + (isVertical ? 92 : 65));
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

  // Configuración opcional de Google Apps Script Web App para registro en Google Sheets
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

  // Init Event Listeners
  initEvents();

  function initEvents() {
    const yearElem = document.getElementById('currentYear');
    if (yearElem) {
      yearElem.textContent = new Date().getFullYear();
    }

    function validateForm() {
      const hasName = creatorNameInput ? creatorNameInput.value.trim().length > 0 : true;
      const hasIg = creatorIgInput ? creatorIgInput.value.trim().length > 0 : true;
      const hasText = secretTextInput ? secretTextInput.value.trim().length > 0 : false;
      const isValid = hasName && hasIg && hasText;

      generateBtn.disabled = !isValid;
      if (regenerateBtn) regenerateBtn.disabled = !isValid;
    }

    if (creatorNameInput) creatorNameInput.addEventListener('input', validateForm);
    if (creatorIgInput) creatorIgInput.addEventListener('input', validateForm);
    if (secretTextInput) secretTextInput.addEventListener('input', validateForm);

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

  function sanitizeFilename(str) {
    return str
      .trim()
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_');
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  /* -------------------------------------------------------------------------- */
  /* REVOLTIJO CODING ALGORITHMS                                                */
  /* -------------------------------------------------------------------------- */

  // -------------------------------------------------------------------------
  // MOTOR DE CODIFICACIÓN ALEATORIO MULTISISTEMA (SIN PISTAS)
  // -------------------------------------------------------------------------

  const BASE_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
  const ACCENT_MAP = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U' };

  // -------------------------------------------------------------------------
  // CATÁLOGO DINÁMICO DE EMOJIS (5 OPCIONES CON JUSTIFICACIÓN DE 2-3 PALABRAS POR EMOJI)
  // -------------------------------------------------------------------------
  const DYNAMIC_EMOJI_CATALOG = [
    {
      emoji: '🥑',
      name: 'Palta',
      options: [
        { letter: 'O', desc: 'Representa la vocal O (por forma redonda u óvalo)' },
        { letter: 'A', desc: 'Representa la letra A (por Aguacate)' },
        { letter: 'P', desc: 'Representa la letra P (por Palta)' },
        { letter: 'V', desc: 'Representa la letra V (por fruto Verde)' },
        { letter: 'C', desc: 'Representa la letra C (por Cuezco interno)' }
      ]
    },
    {
      emoji: '🚀',
      name: 'Cohete',
      options: [
        { letter: 'A', desc: 'Representa la letra A (por Astronauta)' },
        { letter: 'C', desc: 'Representa la letra C (por Cohete espacial)' },
        { letter: 'V', desc: 'Representa la letra V (por Velocidad de despegue)' },
        { letter: 'O', desc: 'Representa la vocal O (por Órbita espacial)' },
        { letter: 'E', desc: 'Representa la vocal E (por Espacio exterior)' }
      ]
    },
    {
      emoji: '👑',
      name: 'Corona',
      options: [
        { letter: 'E', desc: 'Representa la vocal E (por Emperador)' },
        { letter: 'R', desc: 'Representa la letra R (por Rey o Reina)' },
        { letter: 'C', desc: 'Representa la letra C (por Corona real)' },
        { letter: 'M', desc: 'Representa la letra M (por Monarquía)' },
        { letter: 'I', desc: 'Representa la vocal I (por Insignia imperial)' }
      ]
    },
    {
      emoji: '⚓',
      name: 'Ancla',
      options: [
        { letter: 'I', desc: 'Representa la vocal I (por Inmersión marina)' },
        { letter: 'A', desc: 'Representa la letra A (por Ancla)' },
        { letter: 'N', desc: 'Representa la letra N (por Navío o Náutico)' },
        { letter: 'M', desc: 'Representa la letra M (por Mar embravecido)' },
        { letter: 'P', desc: 'Representa la letra P (por Puerto de atracadero)' }
      ]
    },
    {
      emoji: '🍕',
      name: 'Pizza',
      options: [
        { letter: 'U', desc: 'Representa la vocal U (por Última porción)' },
        { letter: 'P', desc: 'Representa la letra P (por Pizza Pepperoni)' },
        { letter: 'Q', desc: 'Representa la letra Q (por Queso derretido)' },
        { letter: 'I', desc: 'Representa la vocal I (por receta Italiana)' },
        { letter: 'C', desc: 'Representa la letra C (por Corte de masa)' }
      ]
    },
    {
      emoji: '🎲',
      name: 'Dado',
      options: [
        { letter: 'L', desc: 'Representa la letra L (por Ludo / Azar)' },
        { letter: 'D', desc: 'Representa la letra D (por Dado de 6 caras)' },
        { letter: 'J', desc: 'Representa la letra J (por Juego de mesa)' },
        { letter: 'A', desc: 'Representa la letra A (por Apuesta de azar)' },
        { letter: 'S', desc: 'Representa la letra S (por Suerte del tiro)' }
      ]
    },
    {
      emoji: '💎',
      name: 'Gema',
      options: [
        { letter: 'R', desc: 'Representa la letra R (por Riqueza / Rubí)' },
        { letter: 'G', desc: 'Representa la letra G (por Gema preciosa)' },
        { letter: 'D', desc: 'Representa la letra D (por Diamante tallado)' },
        { letter: 'J', desc: 'Representa la letra J (por Joya brillante)' },
        { letter: 'C', desc: 'Representa la letra C (por Cristal pulido)' }
      ]
    },
    {
      emoji: '🏴‍☠️',
      name: 'Pirata',
      options: [
        { letter: 'M', desc: 'Representa la letra M (por Mar de piratas)' },
        { letter: 'P', desc: 'Representa la letra P (por Parche en ojo)' },
        { letter: 'B', desc: 'Representa la letra B (por Barco bucanero)' },
        { letter: 'C', desc: 'Representa la letra C (por Calavera pirata)' },
        { letter: 'T', desc: 'Representa la letra T (por Tesoro escondido)' }
      ]
    },
    {
      emoji: '🔮',
      name: 'Cristal',
      options: [
        { letter: 'N', desc: 'Representa la letra N (por Nube mágica)' },
        { letter: 'O', desc: 'Representa la vocal O (por Oráculo esférico)' },
        { letter: 'M', desc: 'Representa la letra M (por Misticismo o Magia)' },
        { letter: 'F', desc: 'Representa la letra F (por Fortuna futura)' },
        { letter: 'C', desc: 'Representa la letra C (por Bola de Cristal)' }
      ]
    },
    {
      emoji: '🛡️',
      name: 'Escudo',
      options: [
        { letter: 'D', desc: 'Representa la letra D (por Defensa militar)' },
        { letter: 'E', desc: 'Representa la vocal E (por Escudo protector)' },
        { letter: 'P', desc: 'Representa la letra P (por Protección frontal)' },
        { letter: 'B', desc: 'Representa la letra B (por Blindaje pesado)' },
        { letter: 'G', desc: 'Representa la letra G (por Guardia de combate)' }
      ]
    },
    {
      emoji: '🗡️',
      name: 'Daga',
      options: [
        { letter: 'T', desc: 'Representa la letra T (por Tajo punzante)' },
        { letter: 'D', desc: 'Representa la letra D (por Daga afilada)' },
        { letter: 'A', desc: 'Representa la letra A (por Arma blanca)' },
        { letter: 'C', desc: 'Representa la letra C (por Cuchillo de combate)' },
        { letter: 'P', desc: 'Representa la letra P (por Puñal de mano)' }
      ]
    },
    {
      emoji: '⚔️',
      name: 'Espadas',
      options: [
        { letter: 'C', desc: 'Representa la letra C (por Combate a espadas)' },
        { letter: 'E', desc: 'Representa la vocal E (por Esgrima)' },
        { letter: 'G', desc: 'Representa la letra G (por Guerrero de batalla)' },
        { letter: 'D', desc: 'Representa la letra D (por Duelo de espadas)' },
        { letter: 'B', desc: 'Representa la letra B (por Batalla campal)' }
      ]
    },
    {
      emoji: '💣',
      name: 'Bomba',
      options: [
        { letter: 'B', desc: 'Representa la letra B (por Bomba explosiva)' },
        { letter: 'E', desc: 'Representa la vocal E (por Explosivo en mecha)' },
        { letter: 'M', desc: 'Representa la letra M (por Mecha encendida)' },
        { letter: 'D', desc: 'Representa la letra D (por Detonador)' },
        { letter: 'P', desc: 'Representa la letra P (por Pólvora)' }
      ]
    },
    {
      emoji: '🐉',
      name: 'Dragón',
      options: [
        { letter: 'G', desc: 'Representa la letra G (por Garra de Dragón)' },
        { letter: 'D', desc: 'Representa la letra D (por Dragón mítico)' },
        { letter: 'F', desc: 'Representa la letra F (por Fuego drakónico)' },
        { letter: 'M', desc: 'Representa la letra M (por Monstruo de leyendas)' },
        { letter: 'C', desc: 'Representa la letra C (por Criatura alada)' }
      ]
    },
    {
      emoji: '🧩',
      name: 'Puzzle',
      options: [
        { letter: 'S', desc: 'Representa la letra S (por Solución de enigma)' },
        { letter: 'P', desc: 'Representa la letra P (por Pieza de puzzle)' },
        { letter: 'R', desc: 'Representa la letra R (por Rompecabezas)' },
        { letter: 'E', desc: 'Representa la vocal E (por Encastre)' },
        { letter: 'C', desc: 'Representa la letra C (por Cabeza / Enigma)' }
      ]
    }
  ];

  function getDynamicEmojiForLetter(ch) {
    const baseChar = ACCENT_MAP[ch] || ch;
    const candidates = [];

    DYNAMIC_EMOJI_CATALOG.forEach(item => {
      const matchOpt = item.options.find(opt => opt.letter === baseChar);
      if (matchOpt) {
        candidates.push({
          emoji: item.emoji,
          name: item.name,
          letter: baseChar,
          desc: matchOpt.desc
        });
      }
    });

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Decoy Emojis (Pistas falsas / Iconos opcionales)
  const DECOY_EMOJIS = ['👾', '👻', '🃏', '💥', '🛸', '🌀', '🎭', '⚡'];

  /**
   * Precalcula mapas para los 6 sistemas de codificación y expone un método
   * para codificar cualquier carácter 'ch' usando un sistema seleccionado
   * de forma 100% aleatoria e independiente para ESE carácter específico.
   */
  function createHybridCharacterEncoder() {
    const modes = ['DYNAMIC_RANDOM', 'HEX_ASCII', 'OFFSET_CAESAR', 'POLIBIO', 'ATBASH', 'STANDARD_A1Z26'];
    const maps = {};

    // 1. DYNAMIC_RANDOM
    maps['DYNAMIC_RANDOM'] = {};
    const availableNumbers = [];
    for (let i = 10; i <= 99; i++) availableNumbers.push(i.toString());
    shuffleArray(availableNumbers);
    BASE_ALPHABET.forEach((letter, idx) => {
      maps['DYNAMIC_RANDOM'][letter] = availableNumbers[idx];
    });

    // 2. HEX_ASCII
    maps['HEX_ASCII'] = {};
    BASE_ALPHABET.forEach((letter, idx) => {
      const hex = (65 + idx).toString(16).toUpperCase();
      maps['HEX_ASCII'][letter] = hex.length === 1 ? `0${hex}` : hex;
    });

    // 3. OFFSET_CAESAR
    maps['OFFSET_CAESAR'] = {};
    const shift = Math.floor(Math.random() * 13) + 3;
    BASE_ALPHABET.forEach((letter, idx) => {
      maps['OFFSET_CAESAR'][letter] = `${idx + 1 + shift}`;
    });

    // 4. POLIBIO
    maps['POLIBIO'] = {};
    BASE_ALPHABET.forEach((letter, idx) => {
      const row = Math.floor(idx / 5) + 1;
      const col = (idx % 5) + 1;
      maps['POLIBIO'][letter] = `${row}${col}`;
    });

    // 5. ATBASH
    maps['ATBASH'] = {};
    const total = BASE_ALPHABET.length;
    BASE_ALPHABET.forEach((letter, idx) => {
      maps['ATBASH'][letter] = `${total - idx}`;
    });

    // 6. STANDARD_A1Z26
    maps['STANDARD_A1Z26'] = {};
    BASE_ALPHABET.forEach((letter, idx) => {
      maps['STANDARD_A1Z26'][letter] = `${idx + 1}`;
    });

    // Mapear vocales con tilde a su equivalente base en todos los mapas
    Object.keys(ACCENT_MAP).forEach(accented => {
      const base = ACCENT_MAP[accented];
      modes.forEach(mode => {
        if (maps[mode][base]) maps[mode][accented] = maps[mode][base];
      });
    });

    return function encodeChar(ch) {
      const randomMode = modes[Math.floor(Math.random() * modes.length)];
      return maps[randomMode][ch] || ch;
    };
  }

  /**
   * Une las palabras procesadas aplicando una estrategia de separación aleatoria:
   * 1. Bloque continuo (sin separador evidente / palabras pegadas) (~30%)
   * 2. Separadores simbólicos variables (/, |, ~, •, ✦, ⚡, 🌀) (~45%)
   * 3. Espaciado aleatorio irregular (~25%)
   */
  function joinWordsDynamically(words) {
    if (words.length <= 1) return words.join('');

    const randStrategy = Math.random();

    if (randStrategy < 0.30) {
      // Bloque continuo de caracteres (unión directa con espacio único para ocultar límites)
      return words.join(' ');
    } else if (randStrategy < 0.75) {
      // Separadores simbólicos aleatorios
      const separators = ['   /   ', '   |   ', '   ~   ', '   •   ', '   ✦   ', '   ⚡   ', '   🌀   ', '   //   '];
      const chosenSep = separators[Math.floor(Math.random() * separators.length)];
      return words.join(chosenSep);
    } else {
      // Espaciado aleatorio e irregular entre palabras
      return words.reduce((acc, word, idx) => {
        if (idx === 0) return word;
        const spacesCount = Math.floor(Math.random() * 4) + 2; // 2 a 5 espacios
        const spaces = ' '.repeat(spacesCount);
        return `${acc}${spaces}${word}`;
      }, '');
    }
  }

  // -------------------------------------------------------------------------
  // GENERADOR UNIFICADO DE PISTAS CON EXPLICACIÓN DE CODIFICACIÓN PARA CREADOR
  // -------------------------------------------------------------------------
  function createPistaText(rawText) {
    const intruderLetters = ['X', 'Z', 'K', 'Q', 'W'];
    const words = rawText.toUpperCase().split(/\s+/);
    const encodeChar = createHybridCharacterEncoder();

    const expMap = new Map();

    const processedWords = words.map(word => {
      const chars = word.split('');

      // Codificar cada caracter aleatoriamente seleccionando un cifrado híbrido por carácter
      let encoded = chars.map(ch => {
        const rand = Math.random();
        if ((/[A-ZÑÁÉÍÓÚ]/.test(ch)) && rand < 0.28) {
          const code = encodeChar(ch);
          if (code !== ch && expMap.size < 4) {
            expMap.set(`code_${ch}_${code}`, {
              symbol: code,
              desc: `Código numérico para la letra ${ch}`
            });
          }
          return code;
        }

        if ((/[A-ZÑÁÉÍÓÚ]/.test(ch)) && rand < 0.55) {
          const matchEmoji = getDynamicEmojiForLetter(ch);
          if (matchEmoji) {
            expMap.set(`emoji_${ch}_${matchEmoji.emoji}`, {
              symbol: `${matchEmoji.emoji} (${matchEmoji.name})`,
              desc: matchEmoji.desc
            });
            return matchEmoji.emoji;
          }
        }

        if (/[A-ZÑÁÉÍÓÚ]/.test(ch) && rand < 0.65) {
          expMap.set('blank', {
            symbol: '_ (Blanco)',
            desc: 'Casilla de letra oculta'
          });
          return '_';
        }
        return ch;
      });

      // Mezclar (anagrama) los caracteres del resultado
      encoded = shuffleArray(encoded);

      // Opcionalmente: 0ó1 letra intrusa (~25% chance)
      if (Math.random() < 0.25) {
        const pos = Math.floor(Math.random() * (encoded.length + 1));
        const intruder = intruderLetters[Math.floor(Math.random() * intruderLetters.length)];
        encoded.splice(pos, 0, intruder);
        expMap.set(`intruder_${intruder}`, {
          symbol: `${intruder} (Intrusa)`,
          desc: 'Letra trampa de distracción'
        });
      }

      // Opcionalmente: 0ó1 emoji señuelo (~20% chance)
      if (Math.random() < 0.20) {
        const pos = Math.floor(Math.random() * (encoded.length + 1));
        const decoy = DECOY_EMOJIS[Math.floor(Math.random() * DECOY_EMOJIS.length)];
        encoded.splice(pos, 0, decoy);
        expMap.set(`decoy_${decoy}`, {
          symbol: `${decoy} (Trampa)`,
          desc: 'Emoji señuelo de distracción'
        });
      }

      return encoded.join(' ');
    });

    expMap.set('anagram', {
      symbol: '🔀 Anagrama',
      desc: 'Letras y elementos desordenados'
    });

    const encodedText = joinWordsDynamically(processedWords);
    const explanations = Array.from(expMap.values()).slice(0, 4);

    return { encodedText, explanations };
  }

  /* -------------------------------------------------------------------------- */
  /* CANVAS GENERATION ENGINE                                                   */
  /* -------------------------------------------------------------------------- */

  /* -------------------------------------------------------------------------- */
  /* CANVAS GENERATION ENGINE                                                   */
  /* -------------------------------------------------------------------------- */

  function renderChallengeCanvas(titleHeader, encodedText, categoryLabel, accentColor = '#ffd100', aspectRatio = '1:1') {
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

    // Decorative Geometric Glow Circles
    ctx.save();
    ctx.fillStyle = 'rgba(123, 59, 198, 0.15)';
    ctx.beginPath();
    ctx.arc(isVertical ? 200 : 150, isVertical ? 280 : 150, isVertical ? 320 : 220, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 46, 76, 0.12)';
    ctx.beginPath();
    ctx.arc(isVertical ? 880 : 850, isVertical ? 1640 : 850, isVertical ? 360 : 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top Header Bar
    const HEADER_H = isVertical ? 180 : 110;
    ctx.fillStyle = 'rgba(18, 8, 34, 0.88)';
    ctx.fillRect(0, 0, canvasW, HEADER_H);

    // Accent Pink Top Line
    ctx.fillStyle = '#ff2e4c';
    ctx.fillRect(0, 0, canvasW, isVertical ? 8 : 7);

    if (isVertical) {
      // ── 9:16 Vertical Header: Unified Centered Logo + Title Group ──
      const logoSize = 135;
      const gapX = 20;
      const subText = '🎮 Acertijos Cifrados — Amigos Jugones';

      ctx.font = '900 56px "Outfit", sans-serif';
      const titleW = ctx.measureText('REVOLTIJO JUGÓN').width;
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
      const titleGrad = ctx.createLinearGradient(textX, 0, textX + titleW, 0);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.5, '#ffd100');
      titleGrad.addColorStop(1, '#ff2e4c');

      ctx.font = '900 56px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.55)';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText('REVOLTIJO JUGÓN', textX, centerY - 5);
      ctx.fillStyle = titleGrad;
      ctx.fillText('REVOLTIJO JUGÓN', textX, centerY - 5);
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
      const titleGradX1 = 215;
      const titleGradX2 = 585;
      const titleGrad = ctx.createLinearGradient(titleGradX1, 0, titleGradX2, 0);
      titleGrad.addColorStop(0, '#ffffff');
      titleGrad.addColorStop(0.5, '#ffd100');
      titleGrad.addColorStop(1, '#ff2e4c');

      ctx.font = '900 52px "Outfit", sans-serif';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.55)';
      ctx.shadowBlur = 14;

      ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.lineWidth = 5;
      ctx.strokeText('REVOLTIJO JUGÓN', titleGradX1, HEADER_H / 2 + 18);
      ctx.fillStyle = titleGrad;
      ctx.fillText('REVOLTIJO JUGÓN', titleGradX1, HEADER_H / 2 + 18);
      ctx.restore();

      if (titleHeader && titleHeader.trim()) {
        ctx.fillStyle = '#00c2a8';
        ctx.font = 'bold 22px "Outfit", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(titleHeader, canvasW - 30, HEADER_H / 2 + 10);
        ctx.textAlign = 'left';
      }
    }

    // Central Glassmorphic Card Container
    const cardX = isVertical ? 40 : 50;
    const cardY = HEADER_H + (isVertical ? 25 : 15);
    const cardW = canvasW - (cardX * 2);
    const footerH = isVertical ? 260 : 95;
    const cardH = isVertical ? 1440 : (canvasH - cardY - footerH - 15);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = 'rgba(30, 13, 54, 0.88)';
    drawRoundRect(ctx, cardX, cardY, cardW, cardH, isVertical ? 28 : 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Floating Brand Logo (Only in 1:1 Square Mode)
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

    // Card Border
    ctx.strokeStyle = 'rgba(232, 93, 158, 0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Category / Theme Badge (if present)
    if (categoryLabel && categoryLabel.trim()) {
      const catText = `🏷️ CATEGORÍA: ${categoryLabel.trim().toUpperCase()}`;
      ctx.fillStyle = 'rgba(255, 209, 0, 0.15)';
      const badgeH = isVertical ? 65 : 52;
      const badgeY = cardY + (isVertical ? 45 : 30);
      drawRoundRect(ctx, cardX + (isVertical ? 50 : 40), badgeY, cardW - (isVertical ? 100 : 80), badgeH, 14);
      ctx.fill();

      ctx.fillStyle = '#ffd100';
      ctx.font = isVertical ? 'bold 28px "Outfit", sans-serif' : 'bold 24px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(catText, canvasW / 2, badgeY + (isVertical ? 42 : 35));
      ctx.textAlign = 'left';
    }

    // Encrypted Text Display Box (Center)
    const textBoxY = categoryLabel && categoryLabel.trim() ? cardY + (isVertical ? 135 : 98) : cardY + (isVertical ? 50 : 35);
    const textBoxH = cardH - (textBoxY - cardY) - (isVertical ? 50 : 35);

    ctx.fillStyle = 'rgba(14, 6, 26, 0.8)';
    drawRoundRect(ctx, cardX + (isVertical ? 35 : 25), textBoxY, cardW - (isVertical ? 70 : 50), textBoxH, 18);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Multiline Encrypted Text Wrap
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 20;

    // Aumento significativo de escala de fuente para llenar la caja central
    let fontSize = isVertical ? 82 : 72;
    if (encodedText.length > 22) fontSize = isVertical ? 68 : 58;
    if (encodedText.length > 40) fontSize = isVertical ? 54 : 46;
    if (encodedText.length > 65) fontSize = isVertical ? 42 : 36;
    if (encodedText.length > 95) fontSize = isVertical ? 34 : 28;

    ctx.font = `bold ${fontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';

    wrapText(ctx, encodedText, canvasW / 2, textBoxY + textBoxH / 2 - (fontSize * 0.25), cardW - (isVertical ? 110 : 80), fontSize * 1.4);
    ctx.restore();

    // Anti-theft subtle watermark
    drawAntiTheftWatermark(ctx, canvasW, canvasH);

    // Creator Attribution Badge (Prominent, above footer)
    drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio);

    // Footer Watermark Bar con QR e Inscripción
    drawCardFooter(ctx, canvasW, canvasH, aspectRatio);

    return canvas.toDataURL('image/png');
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Adjust vertical center alignment
    const totalHeight = lines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);

    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k].trim(), x, startY + (k * lineHeight));
    }
  }

  /* -------------------------------------------------------------------------- */
  /* MAIN GENERATE HANDLER                                                      */
  /* -------------------------------------------------------------------------- */

  async function handleGenerate() {
    const rawText = secretTextInput.value.trim();
    const creatorName = creatorNameInput ? creatorNameInput.value.trim() : '';
    const creatorIg = creatorIgInput ? creatorIgInput.value.trim() : '';

    // Validación silenciosa con mensajes amigables (sin la palabra 'obligatorio')
    if (!creatorName) {
      creatorNameInput && creatorNameInput.focus();
      alert('✏️ Debes ingresar un nombre o apodo antes de generar.');
      return;
    }
    if (!creatorIg) {
      creatorIgInput && creatorIgInput.focus();
      alert('📸 Debes ingresar tu Instagram antes de generar.');
      return;
    }
    if (!rawText) return;

    const isAuthorized = await checkProtectedNameAccess(creatorName, creatorIg);
    if (!isAuthorized) return;

    await Promise.all([loadBrandLogo(), loadBrandQR(), loadBrandBlackLogo()]);

    const categoryText = categoryInput ? categoryInput.value.trim() : '';
    const baseName = sanitizeFilename(rawText) || 'RevoltijoBG';
    const aspectRatioInput = document.querySelector('input[name="aspectRatio"]:checked');
    const aspectRatio = aspectRatioInput ? aspectRatioInput.value : '1:1';

    // Show Loader
    loader.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    generateBtn.disabled = true;
    if (regenerateBtn) regenerateBtn.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      // 4 desafíos generados independientemente con el mismo algoritmo aleatorio
      const accentColors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff'];

      const p1 = createPistaText(rawText);
      const p2 = createPistaText(rawText);
      const p3 = createPistaText(rawText);
      const p4 = createPistaText(rawText);

      // Sincronización asíncrona a Google Sheets
      sendToGoogleSheets({
        creatorName: creatorName,
        creatorIg: creatorIg,
        secretText: rawText,
        category: categoryText,
        aspectRatio: aspectRatio,
        p1: p1.encodedText,
        p2: p2.encodedText,
        p3: p3.encodedText,
        p4: p4.encodedText,
        solution: rawText.toUpperCase()
      });

      generatedResults = [
        {
          title: 'Desafío 1',
          filename: `${baseName}_1.png`,
          dataUrl: renderChallengeCanvas('', p1.encodedText, categoryText, accentColors[0], aspectRatio),
          description: 'Codificación aleatoria generada para este desafío.',
          explanations: p1.explanations
        },
        {
          title: 'Desafío 2',
          filename: `${baseName}_2.png`,
          dataUrl: renderChallengeCanvas('', p2.encodedText, categoryText, accentColors[1], aspectRatio),
          description: 'Codificación aleatoria generada para este desafío.',
          explanations: p2.explanations
        },
        {
          title: 'Desafío 3',
          filename: `${baseName}_3.png`,
          dataUrl: renderChallengeCanvas('', p3.encodedText, categoryText, accentColors[2], aspectRatio),
          description: 'Codificación aleatoria generada para este desafío.',
          explanations: p3.explanations
        },
        {
          title: 'Desafío 4',
          filename: `${baseName}_4.png`,
          dataUrl: renderChallengeCanvas('', p4.encodedText, categoryText, accentColors[3], aspectRatio),
          description: 'Codificación aleatoria generada para este desafío.',
          explanations: p4.explanations
        },
        {
          title: 'Solución',
          filename: `${baseName}_Solucion.png`,
          dataUrl: renderChallengeCanvas('Solución', rawText.toUpperCase(), categoryText, '#00c2a8', aspectRatio),
          description: 'La frase o título original para confirmar al ganador.',
          explanations: []
        }
      ];

      displayResults(generatedResults);
    } catch (err) {
      console.error('Error al generar desafíos de Revoltijo:', err);
      alert('Ocurrió un error al codificar el texto.');
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

      let explanationHtml = '';
      if (item.explanations && item.explanations.length > 0) {
        explanationHtml = `
          <div class="card-encoding-info">
            <div class="encoding-info-header">
              <span class="info-icon">💡</span>
              <span class="info-title">Pauta de Codificación (Guía Creador)</span>
            </div>
            <ul class="encoding-list">
              ${item.explanations.map(exp => `
                <li>
                  <span class="code-symbol">${exp.symbol}</span>
                  <span class="code-desc">${exp.desc}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      } else if (item.title === 'Solución') {
        explanationHtml = `
          <div class="card-encoding-info solution-info">
            <div class="encoding-info-header">
              <span class="info-icon">✅</span>
              <span class="info-title">Solución Oficial</span>
            </div>
            <p class="solution-text-desc">Frase original sin cifrar para validar las respuestas del grupo.</p>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="card-image-wrap">
          <img src="${item.dataUrl}" alt="${item.title}" class="card-img">
        </div>
        <div class="card-body">
          <div class="card-info">
            <h3 class="card-title">${item.title}</h3>
            <span class="card-filename">${item.filename}</span>
          </div>
          <p class="section-subtitle" style="font-size:0.82rem; margin-bottom:4px;">${item.description}</p>
          ${explanationHtml}
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
