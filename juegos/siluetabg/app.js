/**
 * SiluetaBG AMIGOS JUGONES — Application Logic
 * Visual Challenge HD Canvas Card Generator ("¿Cuál es este juego?")
 * Genera tarjetas PNG en alta definición para WhatsApp y Redes Sociales.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Elementos del DOM ──
  const challengeTitleInput = document.getElementById('challengeTitleInput');
  const answerInput = document.getElementById('answerInput');
  const categoryInput = document.getElementById('categoryInput');
  const explanationInput = document.getElementById('explanationInput');
  const creatorNameInput = document.getElementById('creatorNameInput');
  const creatorIgInput = document.getElementById('creatorIgInput');

  // Control de Imagen Principal
  const imageDropZone = document.getElementById('imageDropZone');
  const imageFileInput = document.getElementById('imageFileInput');
  const imageUrlInput = document.getElementById('imageUrlInput');
  const imagePreviewWrap = document.getElementById('imagePreviewWrap');
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const imageSourceBadge = document.getElementById('imageSourceBadge');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const silhouetteOverlay = document.getElementById('silhouetteOverlay');

  // Controles de Efectos (Silueta y Desenfoque)
  const silhouetteNoticeBox = document.getElementById('silhouetteNoticeBox');
  const solidBgWarning = document.getElementById('solidBgWarning');
  const autoRemoveBgCheck = document.getElementById('autoRemoveBgCheck');
  const blurControlBox = document.getElementById('blurControlBox');
  const blurRangeInput = document.getElementById('blurRangeInput');
  const blurValueLabel = document.getElementById('blurValueLabel');
  const blurPresetBtns = document.querySelectorAll('.btn-blur-preset');

  // Opciones Múltiples
  const toggleOptionsBtn = document.getElementById('toggleOptionsBtn');
  const optionsContainer = document.getElementById('optionsContainer');
  const optionAInput = document.getElementById('optionAInput');
  const optionBInput = document.getElementById('optionBInput');
  const optionCInput = document.getElementById('optionCInput');
  const optionDInput = document.getElementById('optionDInput');

  // Controles Generales
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const loader = document.getElementById('loader');
  const resultsSection = document.getElementById('resultsSection');
  const cardsGrid = document.getElementById('cardsGrid');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // Estado de la Aplicación
  let loadedChallengeImg = null;
  let isOptionsVisible = false;
  let generatedResults = [];
  let brandLogoImg = null;
  let brandQRImg = null;
  let brandBlackLogoImg = null;

  // ── SISTEMA DE SEGURIDAD Y NOMBRES RESERVADOS ──────────────────────────
  const PROTECTED_NAMES = ['amigosjugonesymas', 'amigosjugones', 'black', 'jessy'];
  const PROTECTED_SECRET_PASS = 'admin123';

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
    });
  }

  // ── Helpers de Dibujo en Canvas ──
  function drawRoundRect(ctx, x, y, w, h, radii = 0) {
    if (typeof radii === 'number') {
      radii = { tl: radii, tr: radii, br: radii, bl: radii };
    }
    ctx.beginPath();
    ctx.moveTo(x + radii.tl, y);
    ctx.lineTo(x + w - radii.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radii.tr);
    ctx.lineTo(x + w, y + h - radii.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radii.br, y + h);
    ctx.lineTo(x + radii.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radii.bl);
    ctx.lineTo(x, y + radii.tl);
    ctx.quadraticCurveTo(x, y, x + radii.tl, y);
    ctx.closePath();
  }

  // ── Carga Asíncrona de Branding (Logo, QR, Logo Black) ──
  function loadBrandLogo() {
    return new Promise((resolve) => {
      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        resolve(brandLogoImg);
        return;
      }
      const img = new Image();
      const logoSrc = (typeof window !== 'undefined' && window.BRAND_LOGO_DATA_URL)
        ? window.BRAND_LOGO_DATA_URL
        : 'assets/logo.png';
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
      const qrSrc = (typeof window !== 'undefined' && window.BRAND_QR_DATA_URL)
        ? window.BRAND_QR_DATA_URL
        : 'assets/amigosjugonesymas_qr.png';
      img.src = qrSrc;
      img.onload = () => {
        brandQRImg = img;
        resolve(img);
      };
      img.onerror = () => {
        if (img.src !== 'assets/amigosjugonesymas_qr.png') {
          const fallbackImg = new Image();
          fallbackImg.src = 'assets/amigosjugonesymas_qr.png';
          fallbackImg.onload = () => {
            brandQRImg = fallbackImg;
            resolve(fallbackImg);
          };
          fallbackImg.onerror = () => resolve(null);
        } else {
          resolve(null);
        }
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
      img.onload = () => {
        brandBlackLogoImg = img;
        resolve(img);
      };
      img.onerror = () => {
        const fallbackImg = new Image();
        fallbackImg.src = 'assets/logo_black.png';
        fallbackImg.onload = () => {
          brandBlackLogoImg = fallbackImg;
          resolve(fallbackImg);
        };
        fallbackImg.onerror = () => resolve(null);
      };
    });
  }

  function preloadBrandAssets() {
    return Promise.all([loadBrandLogo(), loadBrandQR(), loadBrandBlackLogo()]);
  }


  // Generador de Silueta Negra en Canvas
  function createSilhouetteCanvas(sourceImg, targetW, targetH, autoRemoveBg = false) {
    const sCanvas = document.createElement('canvas');
    sCanvas.width = targetW;
    sCanvas.height = targetH;
    const sCtx = sCanvas.getContext('2d');

    // Dibuja la imagen escalada
    sCtx.drawImage(sourceImg, 0, 0, targetW, targetH);

    // Obtener píxeles y convertir los no transparentes a silueta oscura
    try {
      const imgData = sCtx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      let cornerR = 255, cornerG = 255, cornerB = 255;
      if (autoRemoveBg) {
        // Muestra de las 4 esquinas para detectar el color de fondo
        const sampleIndices = [
          0,
          (Math.floor(targetW) - 1) * 4,
          ((Math.floor(targetH) - 1) * Math.floor(targetW)) * 4,
          ((Math.floor(targetH) - 1) * Math.floor(targetW) + Math.floor(targetW) - 1) * 4
        ];
        let sr = 0, sg = 0, sb = 0;
        sampleIndices.forEach(idx => {
          if (idx >= 0 && idx + 2 < d.length) {
            sr += d[idx];
            sg += d[idx + 1];
            sb += d[idx + 2];
          }
        });
        cornerR = Math.round(sr / 4);
        cornerG = Math.round(sg / 4);
        cornerB = Math.round(sb / 4);
      }

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const a = d[i + 3];

        if (a <= 25) {
          d[i + 3] = 0; // Transparente
          continue;
        }

        if (autoRemoveBg) {
          // Si el pixel es blanco/muy claro o muy similar al color de las esquinas
          const diffCorner = Math.abs(r - cornerR) + Math.abs(g - cornerG) + Math.abs(b - cornerB);
          const isWhiteLike = (r > 230 && g > 230 && b > 230);
          if (isWhiteLike || diffCorner < 40) {
            d[i + 3] = 0; // Remueve el fondo
            continue;
          }
        }

        d[i] = 12;     // R oscuro
        d[i + 1] = 8;  // G oscuro
        d[i + 2] = 22; // B oscuro
        d[i + 3] = 255; // Opacidad completa
      }
      sCtx.putImageData(imgData, 0, 0);
    } catch (e) {
      console.warn('Filtro de silueta directo no disponible (CORS), usando fallback visual:', e);
    }
    return sCanvas;
  }

  // Detección de imagen sin canal alfa transparente
  function isImageSolidBackground(img) {
    if (!img) return false;
    try {
      const c = document.createElement('canvas');
      c.width = 60;
      c.height = 60;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 60, 60);
      const data = ctx.getImageData(0, 0, 60, 60).data;
      let transparentPixels = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 35) transparentPixels++;
      }
      return transparentPixels < (60 * 60 * 0.025);
    } catch (e) {
      return false;
    }
  }

  // Actualizador dinámico de efectos y vista previa en UI
  function updateEffectUI() {
    const effectMode = document.querySelector('input[name="imageEffect"]:checked')?.value || 'normal';

    if (silhouetteNoticeBox) silhouetteNoticeBox.classList.toggle('hidden', effectMode !== 'silhouette');
    if (blurControlBox) blurControlBox.classList.toggle('hidden', effectMode !== 'blur');

    if (effectMode === 'silhouette') {
      const isSolid = isImageSolidBackground(loadedChallengeImg);
      const isAutoBg = autoRemoveBgCheck && autoRemoveBgCheck.checked;
      if (solidBgWarning) {
        solidBgWarning.classList.toggle('hidden', !isSolid || isAutoBg);
      }
    }

    if (imagePreviewImg && loadedChallengeImg) {
      if (effectMode === 'silhouette') {
        imagePreviewImg.style.filter = 'brightness(0) drop-shadow(0 0 6px #ec4899)';
        if (silhouetteOverlay) silhouetteOverlay.classList.remove('hidden');
      } else if (effectMode === 'blur') {
        const blurVal = parseInt(blurRangeInput?.value || 16, 10);
        const thumbBlur = Math.max(2, Math.round(blurVal / 3.5));
        imagePreviewImg.style.filter = `blur(${thumbBlur}px)`;
        if (silhouetteOverlay) silhouetteOverlay.classList.add('hidden');
      } else {
        imagePreviewImg.style.filter = 'none';
        if (silhouetteOverlay) silhouetteOverlay.classList.add('hidden');
      }
    }
  }

  // ── Creator Attribution Badge (Prominente, arriba del footer y arriba del QR) ──
  function drawCreatorBadge(ctx, canvasW, canvasH, isVertical) {
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

    const fontSize = isVertical ? 28 : 20;
    const badgeH = isVertical ? 58 : 42;

    ctx.save();
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    const textMetrics = ctx.measureText(creatorText);
    const badgeW = Math.min(canvasW - (isVertical ? 80 : 50), Math.max(isVertical ? 660 : 520, textMetrics.width + 60));
    const badgeX = (canvasW - badgeW) / 2;

    // Posición Y estrictamente por encima de la tarjeta QR flotante para que NUNCA se tapen
    // La tarjeta QR flotante empieza en qrTopY:
    // En 1:1 Cuadrado: canvasH - qrCardH - 10 = 1000 - 175 - 10 = 815
    // En 9:16 Stories: footerY - 100 = 1660 - 100 = 1560
    const qrTopY = isVertical ? (1920 - 260 - 100) : (1000 - 175 - 10);
    const badgeY = qrTopY - badgeH - (isVertical ? 18 : 14); // 1484 (vert), 759 (cuad)

    // Sombra y fondo de tarjeta oscura translúcida
    ctx.shadowColor = 'rgba(250, 204, 21, 0.4)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(25, 12, 45, 0.94)';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, isVertical ? 18 : 14);
    ctx.fill();

    // Borde Neón Dorado
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.lineWidth = isVertical ? 2.5 : 2;
    ctx.stroke();

    // Texto Dorado centrado
    ctx.fillStyle = '#ffd100';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(creatorText, canvasW / 2, badgeY + badgeH / 2 + Math.round(fontSize * 0.35));
    ctx.restore();
  }

  // ── Footer Institucional (Idéntico a Trivia con QR flotante y BLACK) ──
  function drawCardFooter(ctx, canvasW, canvasH, isVertical) {
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    ctx.save();

    // Fondo del Footer
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, footerY, canvasW, footerH);

    // Línea superior de acento neón
    const lineGrad = ctx.createLinearGradient(0, footerY, canvasW, footerY);
    lineGrad.addColorStop(0, '#a855f7');
    lineGrad.addColorStop(0.5, '#ec4899');
    lineGrad.addColorStop(1, '#facc15');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, footerY, canvasW, isVertical ? 4 : 2);

    // ── LEFT: Gran Tarjeta Blanca Flotante con el QR (idéntica a Trivia) ──
    const qrCardW = isVertical ? 220 : 175;
    const qrCardH = isVertical ? 220 : 175;
    const qrCardX = isVertical ? 24 : 16;
    const qrCardY = isVertical ? (footerY - 100) : (canvasH - qrCardH - 10);

    // Contenedor de tarjeta blanca con sombra profunda
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    drawRoundRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, isVertical ? 20 : 16);
    ctx.fill();
    ctx.restore();

    // Imagen del código QR preservando su aspecto cuadrado para máxima legibilidad
    if (brandQRImg && (brandQRImg.complete || brandQRImg.naturalWidth > 0)) {
      const qrMargin = isVertical ? 8 : 6;
      const maxW = qrCardW - (qrMargin * 2);
      const maxH = qrCardH - (qrMargin * 2);
      const qrAspect = (brandQRImg.naturalWidth && brandQRImg.naturalHeight)
        ? (brandQRImg.naturalWidth / brandQRImg.naturalHeight)
        : 1;

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

    // ── CENTER: ¡SIGUENOS en INSTAGRAM! + Frase Creativa de Autoría ──
    const centerCenterX = isVertical ? Math.round(canvasW / 2) : (canvasW / 2 + (qrCardW / 4) + 10);

    // Línea 1: Síguenos en Instagram
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? '900 28px "Outfit", sans-serif' : '900 22px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(250, 204, 21, 0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText('📸 ¡SIGUENOS en INSTAGRAM!', centerCenterX, footerY + (isVertical ? 48 : 38));
    ctx.restore();

    // Línea 2: Frase de Autoría
    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? '700 16px "Outfit", sans-serif' : '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Juego creado en Silueta Jugona: Desafíos Visuales — ¡Crea los tuyos!', centerCenterX, footerY + (isVertical ? 92 : 65));
    ctx.restore();

    // ── RIGHT: Sistema creado por + BLACK logo (Base nivelada con la base del QR) ──
    const blackLogoSize = isVertical ? 95 : 80;
    const rightCenterX = isVertical ? (canvasW - 110) : (canvasW - 115);
    const qrCardBaseY = qrCardY + qrCardH;

    if (brandBlackLogoImg && (brandBlackLogoImg.complete || brandBlackLogoImg.naturalWidth > 0)) {
      const logoAspect = (brandBlackLogoImg.naturalWidth && brandBlackLogoImg.naturalHeight)
        ? (brandBlackLogoImg.naturalWidth / brandBlackLogoImg.naturalHeight)
        : 2.5;
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

  // ── RENDER TARJETA 1: EL DESAFÍO VISUAL ──
  function renderSiluetaQuestionCanvas(aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Fondo Cyber Arcade
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#0c071a');
    bgGrad.addColorStop(0.5, '#170c32');
    bgGrad.addColorStop(1, '#200e42');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Halos de fondo decorativos
    ctx.save();
    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.beginPath();
    ctx.arc(isVertical ? 220 : 180, isVertical ? 300 : 180, isVertical ? 320 : 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
    ctx.beginPath();
    ctx.arc(isVertical ? 860 : 820, isVertical ? 1500 : 750, isVertical ? 340 : 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Barra Superior
    const HEADER_H = isVertical ? 170 : 105;
    ctx.fillStyle = 'rgba(10, 6, 22, 0.88)';
    ctx.fillRect(0, 0, canvasW, HEADER_H);

    ctx.fillStyle = '#a855f7';
    ctx.fillRect(0, 0, canvasW, isVertical ? 7 : 6);

    // Logo y Título Superior
    const logoSize = isVertical ? 120 : 75;
    const logoX = isVertical ? 35 : 25;
    const logoY = (HEADER_H - logoSize) / 2;

    if (brandLogoImg && (brandLogoImg.complete || brandLogoImg.naturalWidth > 0)) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
      ctx.shadowBlur = 14;
      ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    const titleX = logoX + logoSize + (isVertical ? 20 : 14);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${isVertical ? '44px' : '28px'} "Outfit", sans-serif`;
    ctx.fillText('SILUETA JUGONA', titleX, isVertical ? 75 : 48);

    ctx.fillStyle = '#facc15';
    ctx.font = `800 ${isVertical ? '22px' : '14px'} "Outfit", sans-serif`;
    ctx.fillText('🎮 DESAFÍO VISUAL · AMIGOS JUGONES', titleX, isVertical ? 112 : 72);

    // Categoría Badge
    const category = (categoryInput.value || '').trim();
    if (category) {
      ctx.save();
      ctx.font = `800 ${isVertical ? '20px' : '13px'} "Outfit", sans-serif`;
      const catText = `🏷️ ${category.toUpperCase()}`;
      const catW = ctx.measureText(catText).width + 24;
      const catH = isVertical ? 36 : 26;
      const catX = isVertical ? 40 : 30;
      const catY = isVertical ? 195 : 120;

      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      drawRoundRect(ctx, catX, catY, catW, catH, 12);
      ctx.fill();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#67e8f9';
      ctx.fillText(catText, catX + 12, catY + (isVertical ? 25 : 18));
      ctx.restore();
    }

    // Título Principal del Desafío ("¿CUÁL ES ESTE JUEGO?")
    const challengeTitle = (challengeTitleInput.value || '¿CUÁL ES ESTE JUEGO?').trim().toUpperCase();
    const promptY = isVertical ? 280 : 175;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${isVertical ? '54px' : '36px'} "Outfit", sans-serif`;
    ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillText(challengeTitle, canvasW / 2, promptY);
    ctx.restore();

    // ── ÁREA CENTRAL DE LA IMAGEN DESAFÍO ──
    const effectMode = document.querySelector('input[name="imageEffect"]:checked')?.value || 'normal';

    const frameW = isVertical ? 920 : 680;
    const frameH = isVertical ? 720 : 400;
    const frameX = (canvasW - frameW) / 2;
    const frameY = isVertical ? 320 : 205;

    // Resplandor del marco
    ctx.save();
    ctx.shadowColor = effectMode === 'silhouette' ? 'rgba(236, 72, 153, 0.6)' : 'rgba(168, 85, 247, 0.5)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#080512';
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 20);
    ctx.fill();
    ctx.restore();

    // Borde Neón
    ctx.strokeStyle = effectMode === 'silhouette' ? '#ec4899' : '#a855f7';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Fondo interior con viñeta
    ctx.save();
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 20);
    ctx.clip();

    const innerGrad = ctx.createRadialGradient(
      frameX + frameW / 2, frameY + frameH / 2, 20,
      frameX + frameW / 2, frameY + frameH / 2, frameW / 1.5
    );
    innerGrad.addColorStop(0, '#1c1038');
    innerGrad.addColorStop(1, '#070310');
    ctx.fillStyle = innerGrad;
    ctx.fillRect(frameX, frameY, frameW, frameH);

    // Dibujo de la Imagen con Efecto
    if (loadedChallengeImg) {
      const padding = 20;
      const innerW = frameW - padding * 2;
      const innerH = frameH - padding * 2;

      // Calcular ajuste centrado tipo 'contain'
      const imgRatio = loadedChallengeImg.naturalWidth / loadedChallengeImg.naturalHeight;
      const targetRatio = innerW / innerH;
      let drawW, drawH;

      if (imgRatio > targetRatio) {
        drawW = innerW;
        drawH = innerW / imgRatio;
      } else {
        drawH = innerH;
        drawW = innerH * imgRatio;
      }

      const drawX = frameX + padding + (innerW - drawW) / 2;
      const drawY = frameY + padding + (innerH - drawH) / 2;

      if (effectMode === 'silhouette') {
        // Modo Silueta estilo Pokémon (con auto-remoción opcional de fondo)
        const autoBg = autoRemoveBgCheck && autoRemoveBgCheck.checked;
        const silCanvas = createSilhouetteCanvas(loadedChallengeImg, drawW, drawH, autoBg);
        
        // Halo de resplandor exterior detrás de la silueta
        ctx.save();
        ctx.shadowColor = 'rgba(236, 72, 153, 0.9)';
        ctx.shadowBlur = 40;
        ctx.drawImage(silCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Silueta limpia superpuesta
        ctx.drawImage(silCanvas, drawX, drawY, drawW, drawH);
      } else if (effectMode === 'blur') {
        // Modo Blur Misterioso Ajustable por Slider
        const blurVal = parseInt(blurRangeInput?.value || 16, 10);
        const blurScale = isVertical ? 2.2 : 1.4;
        const finalBlurPx = Math.round(blurVal * blurScale);

        ctx.save();
        ctx.filter = `blur(${finalBlurPx}px)`;
        ctx.drawImage(loadedChallengeImg, drawX, drawY, drawW, drawH);
        ctx.restore();
      } else {
        // Modo Normal
        ctx.drawImage(loadedChallengeImg, drawX, drawY, drawW, drawH);
      }
    } else {
      // Placeholder si no hay imagen
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = '700 24px "Outfit", sans-serif';
      ctx.fillText('🖼️ SIN IMAGEN CARGADA', frameX + frameW / 2, frameY + frameH / 2);
    }
    ctx.restore();

    // ── OPCIONES MÚLTIPLES O BANNER INFERIOR ──
    const opts = [
      optionAInput.value.trim(),
      optionBInput.value.trim(),
      optionCInput.value.trim(),
      optionDInput.value.trim()
    ].filter(o => o.length > 0);

    const hasOptions = opts.length >= 2;

    if (hasOptions) {
      // Bloques de Opciones Múltiples
      const letters = ['A', 'B', 'C', 'D'];
      const optYStart = isVertical ? 1060 : 635;
      const optW = isVertical ? 920 : 440;
      const optH = isVertical ? 70 : 48;
      const optGapY = isVertical ? 16 : 10;

      if (isVertical) {
        // En vertical: 4 filas apiladas
        opts.forEach((optText, idx) => {
          const oX = (canvasW - optW) / 2;
          const oY = optYStart + idx * (optH + optGapY);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          drawRoundRect(ctx, oX, oY, optW, optH, 14);
          ctx.fill();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Badge Letra
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(oX + 36, oY + optH / 2, 20, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = '900 22px "Outfit", sans-serif';
          ctx.fillText(letters[idx], oX + 36, oY + optH / 2 + 7);

          // Texto Opción
          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 26px "Outfit", sans-serif';
          ctx.fillText(optText, oX + 72, oY + optH / 2 + 8);
        });
      } else {
        // En horizontal (1:1): Grilla 2x2
        const colW = (680 - 16) / 2;
        opts.forEach((optText, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const oX = (canvasW - 680) / 2 + col * (colW + 16);
          const oY = 635 + row * (optH + 10);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
          drawRoundRect(ctx, oX, oY, colW, optH, 12);
          ctx.fill();
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(oX + 26, oY + optH / 2, 14, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.font = '900 16px "Outfit", sans-serif';
          ctx.fillText(letters[idx], oX + 26, oY + optH / 2 + 5);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 17px "Outfit", sans-serif';
          ctx.fillText(optText, oX + 50, oY + optH / 2 + 6);
        });
      }
    } else {
      // Banner de llamada a la acción si no hay opciones
      const calloutY = isVertical ? 1120 : 655;
      const calloutW = isVertical ? 920 : 680;
      const calloutH = isVertical ? 85 : 60;
      const calloutX = (canvasW - calloutW) / 2;

      ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
      drawRoundRect(ctx, calloutX, calloutY, calloutW, calloutH, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#facc15';
      ctx.font = `800 ${isVertical ? '30px' : '20px'} "Outfit", sans-serif`;
      ctx.fillText('💬 ¡Deja tu respuesta en el grupo de WhatsApp!', canvasW / 2, calloutY + (isVertical ? 52 : 36));
    }

    // Badge Creador Prominente (Arriba del footer y arriba del QR)
    drawCreatorBadge(ctx, canvasW, canvasH, isVertical);

    // Footer Oficial
    drawCardFooter(ctx, canvasW, canvasH, isVertical);

    return canvas;
  }

  // ── RENDER TARJETA 2: LA SOLUCIÓN REVELADA ──
  function renderSiluetaAnswerCanvas(aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Fondo Solución
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#061712');
    bgGrad.addColorStop(0.5, '#0b261e');
    bgGrad.addColorStop(1, '#11352a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Halos Dorados y Verdes
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.beginPath();
    ctx.arc(isVertical ? 220 : 180, isVertical ? 300 : 180, isVertical ? 320 : 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
    ctx.beginPath();
    ctx.arc(isVertical ? 860 : 820, isVertical ? 1500 : 750, isVertical ? 340 : 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Barra Superior
    const HEADER_H = isVertical ? 170 : 105;
    ctx.fillStyle = 'rgba(6, 20, 16, 0.9)';
    ctx.fillRect(0, 0, canvasW, HEADER_H);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, canvasW, isVertical ? 7 : 6);

    // Logo y Título Superior
    const logoSize = isVertical ? 120 : 75;
    const logoX = isVertical ? 35 : 25;
    const logoY = (HEADER_H - logoSize) / 2;

    if (brandLogoImg && (brandLogoImg.complete || brandLogoImg.naturalWidth > 0)) {
      ctx.save();
      ctx.shadowColor = 'rgba(16, 185, 129, 0.45)';
      ctx.shadowBlur = 14;
      ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    }

    const titleX = logoX + logoSize + (isVertical ? 20 : 14);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${isVertical ? '44px' : '28px'} "Outfit", sans-serif`;
    ctx.fillText('SILUETA JUGONA', titleX, isVertical ? 75 : 48);

    ctx.fillStyle = '#10b981';
    ctx.font = `800 ${isVertical ? '22px' : '14px'} "Outfit", sans-serif`;
    ctx.fillText('✅ RESPUESTA OFICIAL REVELADA', titleX, isVertical ? 112 : 72);

    // Badge "¡SOLUCIÓN!"
    const badgeW = isVertical ? 360 : 260;
    const badgeH = isVertical ? 50 : 34;
    const badgeX = (canvasW - badgeW) / 2;
    const badgeY = isVertical ? 195 : 120;

    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 16);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#34d399';
    ctx.font = `900 ${isVertical ? '24px' : '17px'} "Outfit", sans-serif`;
    ctx.fillText('🎉 ¡RESPUESTA CORRECTA! 🎉', canvasW / 2, badgeY + (isVertical ? 33 : 23));

    // ── IMAGEN REVELADA A TODO COLOR ──
    const frameW = isVertical ? 860 : 540;
    const frameH = isVertical ? 580 : 280;
    const frameX = (canvasW - frameW) / 2;
    const frameY = isVertical ? 265 : 166;

    // Resplandor Verde
    ctx.save();
    ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#05140e';
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 20);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dibujo de la Imagen Original Completa
    ctx.save();
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 20);
    ctx.clip();

    if (loadedChallengeImg) {
      const padding = 16;
      const innerW = frameW - padding * 2;
      const innerH = frameH - padding * 2;
      const imgRatio = loadedChallengeImg.naturalWidth / loadedChallengeImg.naturalHeight;
      const targetRatio = innerW / innerH;
      let drawW, drawH;

      if (imgRatio > targetRatio) {
        drawW = innerW;
        drawH = innerW / imgRatio;
      } else {
        drawH = innerH;
        drawW = innerH * imgRatio;
      }

      const drawX = frameX + padding + (innerW - drawW) / 2;
      const drawY = frameY + padding + (innerH - drawH) / 2;

      ctx.drawImage(loadedChallengeImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();

    // ── CAJA DE LA RESPUESTA CORRECTA ──
    const answerText = (answerInput.value || 'Respuesta').trim().toUpperCase();
    const ansBoxW = isVertical ? 920 : 680;
    const ansBoxH = isVertical ? 130 : 80;
    const ansBoxX = (canvasW - ansBoxW) / 2;
    const ansBoxY = isVertical ? 865 : 460;

    // Fondo Caja de Respuesta
    const ansGrad = ctx.createLinearGradient(ansBoxX, ansBoxY, ansBoxX + ansBoxW, ansBoxY + ansBoxH);
    ansGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    ansGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.2)');
    ansGrad.addColorStop(1, 'rgba(16, 185, 129, 0.25)');

    ctx.save();
    ctx.shadowColor = 'rgba(250, 204, 21, 0.4)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = ansGrad;
    drawRoundRect(ctx, ansBoxX, ansBoxY, ansBoxW, ansBoxH, 18);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Etiqueta Superior de la Caja
    ctx.textAlign = 'center';
    ctx.fillStyle = '#6ee7b7';
    ctx.font = `800 ${isVertical ? '22px' : '14px'} "Outfit", sans-serif`;
    ctx.fillText('🏆 ERA NADA MÁS Y NADA MENOS QUE:', canvasW / 2, ansBoxY + (isVertical ? 38 : 25));

    // Texto de la Respuesta Ganadora
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${isVertical ? '50px' : '32px'} "Outfit", sans-serif`;
    ctx.fillText(answerText, canvasW / 2, ansBoxY + (isVertical ? 94 : 62));

    // ── DATO CURIOSO / EXPLICACIÓN (OPCIONAL) ──
    const explanation = (explanationInput.value || '').trim();
    if (explanation) {
      const expBoxW = isVertical ? 920 : 680;
      const expBoxH = isVertical ? 140 : 80;
      const expBoxX = (canvasW - expBoxW) / 2;
      const expBoxY = isVertical ? 1015 : 555;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      drawRoundRect(ctx, expBoxX, expBoxY, expBoxW, expBoxH, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = `800 ${isVertical ? '20px' : '13px'} "Outfit", sans-serif`;
      ctx.fillText('💡 DATO CURIOSO:', canvasW / 2, expBoxY + (isVertical ? 36 : 24));

      ctx.fillStyle = '#cbd5e1';
      ctx.font = `500 ${isVertical ? '24px' : '15px'} "Outfit", sans-serif`;
      
      // Ajuste de texto en líneas
      wrapCanvasText(ctx, explanation, canvasW / 2, expBoxY + (isVertical ? 72 : 48), expBoxW - 40, isVertical ? 32 : 20);
    }

    // Badge Creador Prominente (Arriba del footer y arriba del QR)
    drawCreatorBadge(ctx, canvasW, canvasH, isVertical);

    // Footer Oficial
    drawCardFooter(ctx, canvasW, canvasH, isVertical);

    return canvas;
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }

  // ── MANEJO DE IMÁGENES (DRAG DROP / PASTE / FILE / URL) ──
  function processLoadedImage(imgSrc, sourceLabel = 'Imagen Cargada') {
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      loadedChallengeImg = tempImg;
      imagePreviewImg.src = imgSrc;
      imageSourceBadge.textContent = sourceLabel;
      imagePreviewWrap.classList.remove('hidden');
      updateEffectUI();
      validateForm();
    };
    tempImg.onerror = () => {
      alert('⚠️ No se pudo cargar la imagen. Verifica que la URL sea válida o intenta subir el archivo directamente.');
    };
    tempImg.src = imgSrc;
  }

  function clearLoadedImage() {
    loadedChallengeImg = null;
    imagePreviewImg.src = '';
    imagePreviewImg.style.filter = 'none';
    imageFileInput.value = '';
    imageUrlInput.value = '';
    imagePreviewWrap.classList.add('hidden');
    updateEffectUI();
    validateForm();
  }

  // Eventos de Drag & Drop
  ['dragenter', 'dragover'].forEach(evt => {
    imageDropZone.addEventListener(evt, e => {
      e.preventDefault();
      imageDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    imageDropZone.addEventListener(evt, e => {
      e.preventDefault();
      imageDropZone.classList.remove('dragover');
    });
  });

  imageDropZone.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => processLoadedImage(ev.target.result, '📁 Archivo Arrastrado');
      reader.readAsDataURL(files[0]);
    }
  });

  imageDropZone.addEventListener('click', () => {
    imageFileInput.click();
  });

  imageFileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = ev => processLoadedImage(ev.target.result, '📁 Archivo Seleccionado');
      reader.readAsDataURL(e.target.files[0]);
    }
  });

  // Pegar con Ctrl+V (Global y en DropZone)
  window.addEventListener('paste', e => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = ev => processLoadedImage(ev.target.result, '📋 Pegado (Ctrl+V)');
        reader.readAsDataURL(blob);
        break;
      }
    }
  });

  imageUrlInput.addEventListener('input', e => {
    const url = e.target.value.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      processLoadedImage(url, '🔗 URL Externa');
    }
  });

  removeImageBtn.addEventListener('click', clearLoadedImage);

  // Selector de Efecto (Actualiza silueta preview y controles dinámicos)
  document.querySelectorAll('input[name="imageEffect"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.effect-option-card').forEach(c => c.classList.remove('active'));
      radio.closest('.effect-option-card')?.classList.add('active');
      updateEffectUI();
    });
  });

  // Control de Slider de Desenfoque y Presets
  if (blurRangeInput) {
    blurRangeInput.addEventListener('input', () => {
      const v = parseInt(blurRangeInput.value, 10) || 16;
      let desc = 'Medio';
      if (v <= 10) desc = 'Suave';
      else if (v <= 18) desc = 'Medio';
      else if (v <= 30) desc = 'Fuerte';
      else desc = 'Extremo';
      if (blurValueLabel) blurValueLabel.textContent = `${v}px — ${desc}`;

      blurPresetBtns.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.blur, 10) === v);
      });
      updateEffectUI();
    });
  }

  blurPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (blurRangeInput) {
        blurRangeInput.value = btn.dataset.blur;
        blurRangeInput.dispatchEvent(new Event('input'));
      }
    });
  });

  if (autoRemoveBgCheck) {
    autoRemoveBgCheck.addEventListener('change', () => {
      updateEffectUI();
    });
  }

  // Selector de Formato (Aspect Ratio)
  document.querySelectorAll('input[name="aspectRatio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.format-option-card').forEach(c => c.classList.remove('active'));
      radio.closest('.format-option-card')?.classList.add('active');
    });
  });

  // Toggle Opciones
  toggleOptionsBtn.addEventListener('click', () => {
    isOptionsVisible = !isOptionsVisible;
    optionsContainer.classList.toggle('hidden', !isOptionsVisible);
    toggleOptionsBtn.textContent = isOptionsVisible
      ? '➖ Ocultar Opciones Múltiples'
      : '➕ Agregar Opciones Múltiples A, B, C, D (Opcional)';
  });

  // Validación de Formulario
  function validateForm() {
    const hasImg = loadedChallengeImg !== null;
    const hasTitle = challengeTitleInput.value.trim().length > 0;
    const hasAnswer = answerInput.value.trim().length > 0;
    const hasCreatorName = creatorNameInput.value.trim().length > 0;
    const hasCreatorIg = creatorIgInput.value.trim().length > 0;
    const isValid = hasImg && hasTitle && hasAnswer && hasCreatorName && hasCreatorIg;

    generateBtn.disabled = !isValid;
    regenerateBtn.disabled = !isValid;
  }

  [challengeTitleInput, answerInput, creatorNameInput, creatorIgInput].forEach(inp => {
    inp.addEventListener('input', validateForm);
  });

  // ── GENERAR TARJETAS ──
  async function handleGenerate() {
    const creatorName = creatorNameInput.value.trim();
    const creatorIg = creatorIgInput.value.trim();

    // Verificación de seguridad
    const allowed = await checkProtectedNameAccess(creatorName, creatorIg);
    if (!allowed) return;

    loader.classList.remove('hidden');
    generateBtn.disabled = true;

    // Asegurar que los assets de branding (Logo, QR, Logo Black) estén cargados antes del renderizado
    await preloadBrandAssets();

    // Pequeño timeout para fluidez de UI
    setTimeout(() => {
      try {
        const aspectRatio = document.querySelector('input[name="aspectRatio"]:checked')?.value || '1:1';

        const qCanvas = renderSiluetaQuestionCanvas(aspectRatio);
        const aCanvas = renderSiluetaAnswerCanvas(aspectRatio);

        const qUrl = qCanvas.toDataURL('image/png');
        const aUrl = aCanvas.toDataURL('image/png');

        generatedResults = [
          { type: 'question', title: 'Tarjeta 1: El Desafío Visual', url: qUrl, filename: 'siluetabg_desafio.png' },
          { type: 'answer', title: 'Tarjeta 2: Solución Revelada', url: aUrl, filename: 'siluetabg_solucion.png' }
        ];

        displayResults(generatedResults, aspectRatio);

        regenerateBtn.classList.remove('hidden');
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error('Error generando tarjetas:', err);
        alert('Ocurrió un error al generar las tarjetas Canvas.');
      } finally {
        loader.classList.add('hidden');
        generateBtn.disabled = false;
      }
    }, 150);
  }

  function displayResults(results, aspectRatio) {
    cardsGrid.innerHTML = '';
    const isVertical = (aspectRatio === '9:16');

    results.forEach(res => {
      const cardBox = document.createElement('div');
      cardBox.className = 'result-card-box';

      const isQ = res.type === 'question';
      cardBox.innerHTML = `
        <div class="result-card-header">
          <span class="result-badge ${isQ ? 'badge-question' : 'badge-answer'}">
            ${isQ ? '🔍 DESAFÍO VISUAL' : '✅ SOLUCIÓN REVELADA'}
          </span>
          <span style="font-size:0.78rem; color:var(--text-dim); font-weight:700;">
            ${isVertical ? '9:16 Stories' : '1:1 Cuadrado'}
          </span>
        </div>
        <div class="canvas-preview-wrap ${isVertical ? 'vertical-aspect' : ''}">
          <img src="${res.url}" alt="${res.title}">
        </div>
        <button type="button" class="btn-download-single" onclick="downloadImage('${res.url}', '${res.filename}')">
          ⬇️ Descargar Esta Tarjeta (PNG)
        </button>
      `;
      cardsGrid.appendChild(cardBox);
    });
  }

  // Descarga de Imagen
  window.downloadImage = function(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  downloadAllBtn.addEventListener('click', () => {
    if (generatedResults.length < 2) return;
    downloadImage(generatedResults[0].url, generatedResults[0].filename);
    setTimeout(() => {
      downloadImage(generatedResults[1].url, generatedResults[1].filename);
    }, 400);
  });

  generateBtn.addEventListener('click', handleGenerate);
  regenerateBtn.addEventListener('click', handleGenerate);

  // Inicializar
  preloadBrandAssets();
  updateEffectUI();
  validateForm();
});
