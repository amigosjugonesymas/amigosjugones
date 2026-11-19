/**
 * ═══════════════════════════════════════════════════════════
 * COLLAGEBG — AMIGOS JUGONES
 * Desafíos de Imagen Combinada HD Canvas Card Generator
 * Motor interactivo de Collage con Drag & Drop, Escalado,
 * Quitado de fondo inteligente y renderizado HD en Canvas 2D.
 * ═══════════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Elementos del DOM: Identidad del Creador ──
  const creatorNameInput = document.getElementById('creatorNameInput');
  const creatorIgInput = document.getElementById('creatorIgInput');

  // ── Elementos del DOM: Imagen Principal ──
  const mainImageDropZone = document.getElementById('mainImageDropZone');
  const mainImageFileInput = document.getElementById('mainImageFileInput');
  const mainImagePreviewWrap = document.getElementById('mainImagePreviewWrap');
  const mainImagePreviewImg = document.getElementById('mainImagePreviewImg');
  const mainImageSourceBadge = document.getElementById('mainImageSourceBadge');
  const removeMainImageBtn = document.getElementById('removeMainImageBtn');

  // ── Elementos del DOM: Editor Visual de Collage ──
  const collageEditorSection = document.getElementById('collageEditorSection');
  const collageCanvas = document.getElementById('collageCanvas');
  const collageMainImage = document.getElementById('collageMainImage');
  const overlaysContainer = document.getElementById('overlaysContainer');
  const collageTextOverlay = document.getElementById('collageTextOverlay');
  const collageTextContent = document.getElementById('collageTextContent');

  // ── Elementos del DOM: Overlays & Texto ──
  const addOverlayBtn = document.getElementById('addOverlayBtn');
  const overlaySlotsContainer = document.getElementById('overlaySlotsContainer');
  const showTextOverlayCheck = document.getElementById('showTextOverlayCheck');
  const textOverlayControls = document.getElementById('textOverlayControls');
  const overlayTextInput = document.getElementById('overlayTextInput');
  const overlayTextColor = document.getElementById('overlayTextColor');
  const overlayTextSize = document.getElementById('overlayTextSize');
  const overlayTextSizeLabel = document.getElementById('overlayTextSizeLabel');

  // ── Elementos del DOM: Pregunta y Respuesta ──
  const challengeTitleInput = document.getElementById('challengeTitleInput');
  const answerInput = document.getElementById('answerInput');
  const categoryInput = document.getElementById('categoryInput');

  // ── Elementos del DOM: Formato & Acciones ──
  const cardOptionSquare = document.getElementById('cardOptionSquare');
  const cardOptionStory = document.getElementById('cardOptionStory');
  const generateBtn = document.getElementById('generateBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  const loader = document.getElementById('loader');
  const resultsSection = document.getElementById('resultsSection');
  const cardsGrid = document.getElementById('cardsGrid');
  const downloadAllBtn = document.getElementById('downloadAllBtn');

  // ── Estado Global de la Aplicación ──
  const state = {
    mainImage: null,
    mainImageSrc: '',
    overlays: [], // { id, img, src, pctX, pctY, scale, domEl, slotEl }
    textOverlay: {
      visible: false,
      text: 'TEXTO',
      pctX: 0.5,
      pctY: 0.20,
      color: '#ffffff',
      size: 36,
      border: 'shadow'
    },
    aspectRatio: '1:1',
    generatedResults: []
  };

  let overlayIdCounter = 0;
  let brandLogoImg = null;
  let brandQRImg = null;
  let brandBlackLogoImg = null;

  // ── 1. SISTEMA DE SEGURIDAD Y NOMBRES RESERVADOS ──────────────────────────
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
        if (passInput.value === PROTECTED_SECRET_PASS) {
          cleanup();
          resolve(true);
        } else {
          errorEl.style.display = 'block';
          passInput.style.borderColor = '#ff4d4d';
          passInput.value = '';
          passInput.focus();
        }
      };

      passInput.onkeydown = (e) => {
        if (e.key === 'Enter') verifyBtn.onclick();
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
    });
  }

  // ── 2. CARGA ROBUSTA DE ASSETS DE MARCA ───────────────────────────────────
  function loadBrandImage(srcCandidate, fallbackPath) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      const source = (srcCandidate && typeof srcCandidate === 'string' && srcCandidate.length > 50)
        ? srcCandidate
        : fallbackPath;

      img.onload = () => resolve(img);
      img.onerror = () => {
        if (source !== fallbackPath && fallbackPath) {
          const fb = new Image();
          fb.crossOrigin = 'Anonymous';
          fb.onload = () => resolve(fb);
          fb.onerror = () => resolve(null);
          fb.src = fallbackPath;
        } else {
          resolve(null);
        }
      };
      img.src = source;
    });
  }

  async function loadBrandAssets() {
    if (!brandLogoImg || !brandLogoImg.complete || brandLogoImg.naturalWidth === 0) {
      const logoData = (typeof window !== 'undefined' && window.BRAND_LOGO_DATA_URL) ? window.BRAND_LOGO_DATA_URL : null;
      brandLogoImg = await loadBrandImage(logoData, 'assets/logo.png');
    }
    if (!brandQRImg || !brandQRImg.complete || brandQRImg.naturalWidth === 0) {
      const qrData = (typeof window !== 'undefined' && window.BRAND_QR_DATA_URL) ? window.BRAND_QR_DATA_URL : null;
      brandQRImg = await loadBrandImage(qrData, 'assets/amigosjugonesymas_qr.png');
    }
    if (!brandBlackLogoImg || !brandBlackLogoImg.complete || brandBlackLogoImg.naturalWidth === 0) {
      const blackData = (typeof window !== 'undefined' && window.BLACK_LOGO_DATA_URL) ? window.BLACK_LOGO_DATA_URL : null;
      brandBlackLogoImg = await loadBrandImage(blackData, 'assets/logo_black.png');
    }
  }

  // ── 3. VALIDACIÓN DEL FORMULARIO ──────────────────────────────────────────
  function validateForm() {
    const hasMainImg = state.mainImage !== null;
    const hasName = creatorNameInput && creatorNameInput.value.trim().length > 0;
    const hasIg = creatorIgInput && creatorIgInput.value.trim().length > 0;
    const hasQuestion = challengeTitleInput && challengeTitleInput.value.trim().length > 0;
    const hasAnswer = answerInput && answerInput.value.trim().length > 0;

    const isValid = hasMainImg && hasName && hasIg && hasQuestion && hasAnswer;
    generateBtn.disabled = !isValid;
  }

  [creatorNameInput, creatorIgInput, challengeTitleInput, answerInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('input', validateForm);
      inp.addEventListener('change', validateForm);
    }
  });

  // ── 4. CARGA DE LA IMAGEN PRINCIPAL ───────────────────────────────────────
  function handleMainImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.mainImage = img;
        state.mainImageSrc = e.target.result;

        mainImagePreviewImg.src = state.mainImageSrc;
        mainImagePreviewWrap.classList.remove('hidden');
        mainImageSourceBadge.textContent = file.name || 'Archivo Cargado';

        collageMainImage.src = state.mainImageSrc;
        collageEditorSection.classList.remove('hidden');

        // Scroll suave al editor
        collageEditorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        validateForm();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearMainImage() {
    state.mainImage = null;
    state.mainImageSrc = '';
    mainImageFileInput.value = '';
    mainImagePreviewImg.src = '';
    mainImagePreviewWrap.classList.add('hidden');
    collageMainImage.src = '';
    collageEditorSection.classList.add('hidden');
    validateForm();
  }

  if (removeMainImageBtn) {
    removeMainImageBtn.addEventListener('click', clearMainImage);
  }

  if (mainImageDropZone) {
    mainImageDropZone.addEventListener('click', () => mainImageFileInput.click());

    mainImageDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      mainImageDropZone.classList.add('dragover');
    });

    mainImageDropZone.addEventListener('dragleave', () => {
      mainImageDropZone.classList.remove('dragover');
    });

    mainImageDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      mainImageDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleMainImageFile(e.dataTransfer.files[0]);
      }
    });

    mainImageDropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        mainImageFileInput.click();
      }
    });
  }

  if (mainImageFileInput) {
    mainImageFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleMainImageFile(e.target.files[0]);
      }
    });
  }

  // Pegar imagen con Ctrl+V
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (let item of e.clipboardData.items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleMainImageFile(file);
          break;
        }
      }
    }
  });

  // ── 5. MOTOR DE DRAG & DROP INTERACTIVO (CANVAS DOM) ──────────────────────
  function setupDraggable(element, onMoveCallback, getInitialPct) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialPctX = 0.5;
    let initialPctY = 0.5;

    function onPointerDown(e) {
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      isDragging = true;
      element.classList.add('active');

      const init = getInitialPct();
      initialPctX = init.pctX;
      initialPctY = init.pctY;

      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      e.preventDefault();

      const curX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const curY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      const deltaX = curX - startX;
      const deltaY = curY - startY;

      const rect = collageCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      let newPctX = initialPctX + (deltaX / rect.width);
      let newPctY = initialPctY + (deltaY / rect.height);

      // Clampeo para mantener dentro de límites visibles
      newPctX = Math.max(0.04, Math.min(0.96, newPctX));
      newPctY = Math.max(0.04, Math.min(0.96, newPctY));

      element.style.left = `${newPctX * 100}%`;
      element.style.top = `${newPctY * 100}%`;

      if (onMoveCallback) {
        onMoveCallback(newPctX, newPctY);
      }
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      element.classList.remove('active');

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }

    element.addEventListener('pointerdown', onPointerDown);
  }

  // ── 6. GESTIÓN DE OVERLAYS (IMÁGENES SECUNDARIAS) ──────────────────────────
  function updateOverlayElement(overlay) {
    if (!overlay.domEl) return;
    overlay.domEl.style.left = `${overlay.pctX * 100}%`;
    overlay.domEl.style.top = `${overlay.pctY * 100}%`;
    overlay.domEl.style.width = `${overlay.scale * 100}%`;
  }

  function addOverlayImage(file) {
    if (state.overlays.length >= 3) {
      alert('Se permite un máximo de 3 imágenes secundarias por desafío.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        overlayIdCounter++;
        const id = overlayIdCounter;

        // Posiciones agradables predeterminadas
        const index = state.overlays.length;
        const defaultPositions = [
          { x: 0.32, y: 0.50 },
          { x: 0.70, y: 0.45 },
          { x: 0.50, y: 0.72 }
        ];
        const initialPos = defaultPositions[index] || { x: 0.5, y: 0.5 };

        // Crear elemento DOM en el Canvas
        const domEl = document.createElement('div');
        domEl.className = 'collage-overlay-el';
        domEl.dataset.overlayId = id;

        const imgEl = document.createElement('img');
        imgEl.src = e.target.result;
        imgEl.alt = `Pista ${id}`;
        domEl.appendChild(imgEl);

        overlaysContainer.appendChild(domEl);

        // Crear objeto de estado
        const overlay = {
          id: id,
          img: img,
          src: e.target.result,
          pctX: initialPos.x,
          pctY: initialPos.y,
          scale: 0.32, // 32% del ancho del marco
          domEl: domEl,
          slotEl: null
        };

        updateOverlayElement(overlay);

        // Configurar arrastre
        setupDraggable(
          domEl,
          (newX, newY) => {
            overlay.pctX = newX;
            overlay.pctY = newY;
          },
          () => ({ pctX: overlay.pctX, pctY: overlay.pctY })
        );

        // Crear tarjeta de Slot en el panel de control
        const slotEl = createOverlaySlotCard(overlay);
        overlay.slotEl = slotEl;
        overlaySlotsContainer.appendChild(slotEl);

        state.overlays.push(overlay);
        updateAddOverlayBtnState();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updateAddOverlayBtnState() {
    if (addOverlayBtn) {
      if (state.overlays.length >= 3) {
        addOverlayBtn.disabled = true;
        addOverlayBtn.textContent = 'Máximo 3 imágenes';
        addOverlayBtn.style.opacity = '0.5';
      } else {
        addOverlayBtn.disabled = false;
        addOverlayBtn.textContent = '➕ Agregar imagen';
        addOverlayBtn.style.opacity = '1';
      }
    }
  }

  function removeOverlay(id) {
    const idx = state.overlays.findIndex(o => o.id === id);
    if (idx === -1) return;

    const overlay = state.overlays[idx];
    if (overlay.domEl && overlay.domEl.parentNode) {
      overlay.domEl.parentNode.removeChild(overlay.domEl);
    }
    if (overlay.slotEl && overlay.slotEl.parentNode) {
      overlay.slotEl.parentNode.removeChild(overlay.slotEl);
    }

    state.overlays.splice(idx, 1);
    updateAddOverlayBtnState();
  }

  // Quitado de fondo inteligente local en Canvas (Alpha keying de esquinas y blanco)
  function removeBackgroundFromOverlay(overlay, btnEl) {
    if (!overlay || !overlay.img) return;

    btnEl.classList.add('working');
    btnEl.textContent = '⏳ Procesando...';

    setTimeout(() => {
      try {
        const c = document.createElement('canvas');
        const origW = overlay.img.naturalWidth || overlay.img.width;
        const origH = overlay.img.naturalHeight || overlay.img.height;
        c.width = origW;
        c.height = origH;
        const ctx = c.getContext('2d');
        ctx.drawImage(overlay.img, 0, 0);

        const imgData = ctx.getImageData(0, 0, origW, origH);
        const d = imgData.data;

        // Muestrear las 4 esquinas para detectar color de fondo predominante
        const sampleCoords = [
          [0, 0],
          [origW - 1, 0],
          [0, origH - 1],
          [origW - 1, origH - 1]
        ];

        let sr = 0, sg = 0, sb = 0;
        sampleCoords.forEach(([x, y]) => {
          const idx = (y * origW + x) * 4;
          sr += d[idx];
          sg += d[idx + 1];
          sb += d[idx + 2];
        });
        const cornerR = Math.round(sr / 4);
        const cornerG = Math.round(sg / 4);
        const cornerB = Math.round(sb / 4);

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const a = d[i + 3];

          if (a <= 25) {
            d[i + 3] = 0;
            continue;
          }

          const diffCorner = Math.abs(r - cornerR) + Math.abs(g - cornerG) + Math.abs(b - cornerB);
          const isWhiteLike = (r > 235 && g > 235 && b > 235);
          const isCornerMatch = diffCorner < 45;

          if (isWhiteLike || isCornerMatch) {
            d[i + 3] = 0;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const newSrc = c.toDataURL('image/png');

        const newImg = new Image();
        newImg.onload = () => {
          overlay.img = newImg;
          overlay.src = newSrc;
          if (overlay.domEl) {
            const innerImg = overlay.domEl.querySelector('img');
            if (innerImg) innerImg.src = newSrc;
          }
          if (overlay.slotEl) {
            const thumbImg = overlay.slotEl.querySelector('.slot-thumb-img');
            if (thumbImg) thumbImg.src = newSrc;
          }
          btnEl.classList.remove('working');
          btnEl.textContent = '✅ Sin fondo';
          btnEl.disabled = true;
          btnEl.style.opacity = '0.7';
        };
        newImg.src = newSrc;
      } catch (err) {
        console.error('Error al remover fondo:', err);
        btnEl.classList.remove('working');
        btnEl.textContent = '❌ Error';
      }
    }, 50);
  }

  function createOverlaySlotCard(overlay) {
    const card = document.createElement('div');
    card.className = 'overlay-slot-card';
    card.dataset.overlayId = overlay.id;

    card.innerHTML = `
      <div class="slot-thumb-wrap" title="Clic para ver tamaño">
        <img src="${overlay.src}" alt="Thumb" class="slot-thumb-img">
      </div>
      <div class="slot-controls">
        <div class="slot-title">Pista Superpuesta #${overlay.id}</div>
        <div class="slot-slider-row">
          <span class="slot-slider-label">Tamaño: <strong class="scale-val-label">${Math.round(overlay.scale * 100)}%</strong></span>
          <input type="range" class="slot-scale-slider" min="0.10" max="0.90" step="0.02" value="${overlay.scale}">
        </div>
      </div>
      <div class="slot-actions">
        <button type="button" class="btn-removebg-slot" title="Remover fondo blanco o sólido">✨ Quitar fondo</button>
        <button type="button" class="btn-delete-slot">🗑️ Eliminar</button>
      </div>
    `;

    const slider = card.querySelector('.slot-scale-slider');
    const scaleValLabel = card.querySelector('.scale-val-label');
    const removeBgBtn = card.querySelector('.btn-removebg-slot');
    const deleteBtn = card.querySelector('.btn-delete-slot');

    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      overlay.scale = val;
      scaleValLabel.textContent = `${Math.round(val * 100)}%`;
      updateOverlayElement(overlay);
    });

    removeBgBtn.addEventListener('click', () => {
      removeBackgroundFromOverlay(overlay, removeBgBtn);
    });

    deleteBtn.addEventListener('click', () => {
      removeOverlay(overlay.id);
    });

    return card;
  }

  if (addOverlayBtn) {
    addOverlayBtn.addEventListener('click', () => {
      if (state.overlays.length >= 3) {
        alert('Se permite un máximo de 3 imágenes superpuestas.');
        return;
      }
      const tmpInput = document.createElement('input');
      tmpInput.type = 'file';
      tmpInput.accept = 'image/*';
      tmpInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          addOverlayImage(e.target.files[0]);
        }
      };
      tmpInput.click();
    });
  }

  // ── 7. GESTIÓN DE TEXTO SUPERPUESTO (OPCIONAL) ────────────────────────────
  function updateTextOverlayStyles() {
    if (!collageTextOverlay) return;

    if (!state.textOverlay.visible) {
      collageTextOverlay.classList.add('hidden');
      return;
    }

    collageTextOverlay.classList.remove('hidden');
    collageTextContent.textContent = state.textOverlay.text || 'TEXTO';
    collageTextOverlay.style.left = `${state.textOverlay.pctX * 100}%`;
    collageTextOverlay.style.top = `${state.textOverlay.pctY * 100}%`;
    collageTextOverlay.style.color = state.textOverlay.color;

    // Tamaño de fuente directamente en px en el editor DOM (sin multiplicadores falsos)
    collageTextOverlay.style.fontSize = `${state.textOverlay.size}px`;
    if (overlayTextSizeLabel) {
      overlayTextSizeLabel.textContent = `${state.textOverlay.size}px`;
    }

    // Borde / sombra
    if (state.textOverlay.border === 'none') {
      collageTextOverlay.style.textShadow = 'none';
      collageTextOverlay.style.webkitTextStroke = '0px transparent';
    } else if (state.textOverlay.border === 'shadow') {
      collageTextOverlay.style.textShadow = '0 3px 12px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.95)';
      collageTextOverlay.style.webkitTextStroke = '0px transparent';
    } else if (state.textOverlay.border === 'stroke') {
      collageTextOverlay.style.textShadow = 'none';
      collageTextOverlay.style.webkitTextStroke = '2px #000000';
    } else if (state.textOverlay.border === 'stroke-white') {
      collageTextOverlay.style.textShadow = 'none';
      collageTextOverlay.style.webkitTextStroke = '2px #ffffff';
    }
  }

  if (showTextOverlayCheck) {
    showTextOverlayCheck.addEventListener('change', (e) => {
      state.textOverlay.visible = e.target.checked;
      textOverlayControls.classList.toggle('hidden', !state.textOverlay.visible);
      updateTextOverlayStyles();
    });
  }

  if (overlayTextInput) {
    overlayTextInput.addEventListener('input', (e) => {
      state.textOverlay.text = e.target.value.trim() || 'TEXTO';
      updateTextOverlayStyles();
    });
  }

  if (overlayTextColor) {
    overlayTextColor.addEventListener('input', (e) => {
      state.textOverlay.color = e.target.value;
      updateTextOverlayStyles();
    });
  }

  if (overlayTextSize) {
    overlayTextSize.addEventListener('input', (e) => {
      const size = parseInt(e.target.value, 10);
      state.textOverlay.size = size;
      updateTextOverlayStyles();
    });
  }

  document.querySelectorAll('input[name="textBorder"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.textOverlay.border = e.target.value;
      updateTextOverlayStyles();
    });
  });

  // Drag del texto en canvas
  if (collageTextOverlay) {
    setupDraggable(
      collageTextOverlay,
      (newX, newY) => {
        state.textOverlay.pctX = newX;
        state.textOverlay.pctY = newY;
      },
      () => ({ pctX: state.textOverlay.pctX, pctY: state.textOverlay.pctY })
    );
  }



  // Quick Tags para la pregunta
  document.querySelectorAll('.quick-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const targetId = tag.dataset.target;
      const val = tag.dataset.value;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.value = val;
        validateForm();
      }
    });
  });

  // Selector de Formato (1:1 vs 9:16)
  function setAspectRatio(ratio) {
    state.aspectRatio = ratio;
    const isStory = ratio === '9:16';

    if (cardOptionSquare) cardOptionSquare.classList.toggle('active', !isStory);
    if (cardOptionStory) cardOptionStory.classList.toggle('active', isStory);

    const squareRadio = document.querySelector('input[name="aspectRatio"][value="1:1"]');
    const storyRadio = document.querySelector('input[name="aspectRatio"][value="9:16"]');
    if (squareRadio) squareRadio.checked = !isStory;
    if (storyRadio) storyRadio.checked = isStory;
  }

  if (cardOptionSquare) cardOptionSquare.addEventListener('click', () => setAspectRatio('1:1'));
  if (cardOptionStory) cardOptionStory.addEventListener('click', () => setAspectRatio('9:16'));

  // ── 9. HELPERS DE CANVAS 2D ───────────────────────────────────────────────
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

  function getWrappedLines(ctx, text, maxWidth) {
    if (!text) return [];
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

  // ── 10. BADGE DEL CREADOR (CON POSICIONAMIENTO QUE NUNCA TAPA EL QR NI EL CONTENIDO) ──
  function drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio, overrideBadgeY = null) {
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

    const fontSize = isVertical ? 30 : 20;
    const badgeH = isVertical ? 62 : 44;

    ctx.save();
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    const textMetrics = ctx.measureText(creatorText);
    const badgeW = Math.min(canvasW - (isVertical ? 80 : 50), Math.max(isVertical ? 660 : 480, textMetrics.width + 56));
    const badgeX = (canvasW - badgeW) / 2;

    let badgeY = overrideBadgeY;
    if (badgeY === null) {
      const qrCardH = isVertical ? 230 : 175;
      const qrTopY = isVertical ? (footerY - 105) : (canvasH - qrCardH - 10);
      badgeY = qrTopY - badgeH - (isVertical ? 18 : 12);
    }

    // Fondo del Badge
    ctx.shadowColor = 'rgba(255, 209, 0, 0.35)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(30, 18, 50, 0.94)';
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, isVertical ? 18 : 14);
    ctx.fill();

    // Borde
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.7)';
    ctx.lineWidth = isVertical ? 2.5 : 2;
    ctx.stroke();

    // Texto
    ctx.fillStyle = '#ffd100';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(creatorText, canvasW / 2, badgeY + badgeH / 2 + Math.round(fontSize * 0.35));
    ctx.restore();
  }

  // ── 11. FOOTER CON QR FLOTANTE Y MARCA ────────────────────────────────────
  function drawCardFooter(ctx, canvasW = 1000, canvasH = 1000, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    ctx.save();

    // Fondo del footer
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, footerY, canvasW, footerH);

    // Línea separadora superior dorada
    ctx.fillStyle = 'rgba(255, 209, 0, 0.45)';
    ctx.fillRect(0, footerY, canvasW, 2);

    // ── IZQUIERDA: Tarjeta QR Flotante Blanca ──
    const qrCardW = isVertical ? 230 : 175;
    const qrCardH = isVertical ? 230 : 175;
    const qrCardX = isVertical ? 24 : 14;
    const qrCardY = isVertical ? (footerY - 105) : (canvasH - qrCardH - 10);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#ffffff';
    drawRoundRect(ctx, qrCardX, qrCardY, qrCardW, qrCardH, isVertical ? 20 : 16);
    ctx.fill();
    ctx.restore();

    // Imagen del QR
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

    // ── CENTRO: SÍGUENOS EN INSTAGRAM + Frase del juego ──
    const centerCenterX = isVertical ? Math.round(canvasW / 2) : (canvasW / 2 + (qrCardW / 4) + 10);

    // Línea 1
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? '900 28px "Outfit", sans-serif' : '900 21px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.fillText('📸 ¡SIGUENOS en INSTAGRAM!', centerCenterX, footerY + (isVertical ? 48 : 36));
    ctx.restore();

    // Línea 2
    ctx.save();
    ctx.fillStyle = '#00c2a8';
    ctx.font = isVertical ? '700 16px "Outfit", sans-serif' : '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Juego creado en CollageBG: Desafíos de Imagen Combinada', centerCenterX, footerY + (isVertical ? 92 : 64));
    ctx.restore();

    // ── DERECHA: Logo BLACK Flotante Nivelado ──
    const blackLogoSize = isVertical ? 95 : 75;
    const rightCenterX = isVertical ? (canvasW - 110) : (canvasW - 115);
    const qrCardBaseY = qrCardY + qrCardH;

    if (brandBlackLogoImg && brandBlackLogoImg.complete && brandBlackLogoImg.naturalWidth > 0) {
      const logoAspect = brandBlackLogoImg.naturalWidth / brandBlackLogoImg.naturalHeight;
      const logoW = Math.round(blackLogoSize * logoAspect);
      const logoH = blackLogoSize;
      const logoX = rightCenterX - Math.round(logoW / 2);
      const logoDrawY = qrCardBaseY - logoH;
      const textY = logoDrawY - (isVertical ? 16 : 12);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = isVertical ? '600 16px "Outfit", sans-serif' : '600 13px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 10;
      ctx.fillText('Sistema creado por', rightCenterX, textY);
      ctx.restore();

      ctx.save();
      ctx.drawImage(brandBlackLogoImg, logoX, logoDrawY, logoW, logoH);
      ctx.restore();
    }

    ctx.restore();
  }

  // ── 12. DIBUJADO DE LA COMPOSICIÓN DEL COLLAGE EN CANVAS (100% PROPORCIONAL) ──
  function drawCollageComposition(ctx, frameX, frameY, frameW, frameH) {
    if (!state.mainImage) return;

    // 1. Marco contenedor con sombra profunda
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 24;
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 18);
    ctx.fillStyle = '#0c0617';
    ctx.fill();
    ctx.restore();

    // 2. Imagen Principal (Recortada al área interior con cover fit)
    ctx.save();
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 18);
    ctx.clip();

    const origW = state.mainImage.naturalWidth || state.mainImage.width;
    const origH = state.mainImage.naturalHeight || state.mainImage.height;

    const imgAspect = origW / origH;
    const frameAspect = frameW / frameH;
    let sW, sH, sX, sY;

    if (imgAspect > frameAspect) {
      sH = origH;
      sW = origH * frameAspect;
      sX = (origW - sW) / 2;
      sY = 0;
    } else {
      sW = origW;
      sH = origW / frameAspect;
      sX = 0;
      sY = (origH - sH) / 2;
    }

    ctx.drawImage(state.mainImage, sX, sY, sW, sH, frameX, frameY, frameW, frameH);

    // 3. Imágenes superpuestas (Overlays con escala y posición exacta)
    state.overlays.forEach(overlay => {
      if (!overlay.img || !overlay.img.complete) return;

      const ovOrigW = overlay.img.naturalWidth || overlay.img.width;
      const ovOrigH = overlay.img.naturalHeight || overlay.img.height;
      const ovAspect = ovOrigW / ovOrigH;

      // Ancho exactamente proporcional al ancho del marco
      const targetW = frameW * overlay.scale;
      const targetH = targetW / ovAspect;

      const targetX = frameX + (overlay.pctX * frameW) - (targetW / 2);
      const targetY = frameY + (overlay.pctY * frameH) - (targetH / 2);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(overlay.img, targetX, targetY, targetW, targetH);
      ctx.restore();
    });

    // 4. Texto Superpuesto (Proporción exacta del preview DOM)
    if (state.textOverlay.visible && state.textOverlay.text) {
      const textX = frameX + (state.textOverlay.pctX * frameW);
      const textY = frameY + (state.textOverlay.pctY * frameH);

      // El factor de escala exacto respecto al ancho visible del editor DOM
      const domCanvasW = (collageCanvas && collageCanvas.clientWidth > 0) ? collageCanvas.clientWidth : 540;
      const scaleRatio = frameW / domCanvasW;
      const canvasFontSize = Math.max(16, Math.round(state.textOverlay.size * scaleRatio));

      ctx.save();
      ctx.font = `900 ${canvasFontSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (state.textOverlay.border === 'shadow') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = state.textOverlay.color;
        ctx.fillText(state.textOverlay.text, textX, textY);
      } else if (state.textOverlay.border === 'stroke') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(3, canvasFontSize * 0.12);
        ctx.strokeText(state.textOverlay.text, textX, textY);
        ctx.fillStyle = state.textOverlay.color;
        ctx.fillText(state.textOverlay.text, textX, textY);
      } else if (state.textOverlay.border === 'stroke-white') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(3, canvasFontSize * 0.12);
        ctx.strokeText(state.textOverlay.text, textX, textY);
        ctx.fillStyle = state.textOverlay.color;
        ctx.fillText(state.textOverlay.text, textX, textY);
      } else {
        ctx.fillStyle = state.textOverlay.color;
        ctx.fillText(state.textOverlay.text, textX, textY);
      }

      ctx.restore();
    }

    ctx.restore();

    // Borde brillante neón alrededor del marco
    ctx.save();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.65)';
    ctx.lineWidth = 3.5;
    drawRoundRect(ctx, frameX, frameY, frameW, frameH, 18);
    ctx.stroke();
    ctx.restore();
  }

  // ── 13. RENDERIZADO TARJETA 1: PREGUNTA ────────────────────────────────────
  function renderCollageQuestionCanvas(questionText, categoryLabel, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Fondo Cyberpunk Dark Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#100620');
    bgGrad.addColorStop(0.5, '#1b0c33');
    bgGrad.addColorStop(1, '#23113e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Destellos Neón Circulares
    ctx.save();
    ctx.fillStyle = 'rgba(168, 85, 247, 0.16)';
    ctx.beginPath();
    ctx.arc(isVertical ? 220 : 180, isVertical ? 320 : 180, isVertical ? 360 : 250, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 46, 76, 0.14)';
    ctx.beginPath();
    ctx.arc(isVertical ? 860 : 820, isVertical ? 1600 : 820, isVertical ? 380 : 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Header Bar Superior ──
    const HEADER_H = isVertical ? 170 : 100;
    ctx.fillStyle = 'rgba(18, 8, 34, 0.9)';
    ctx.fillRect(0, 0, canvasW, HEADER_H);

    ctx.fillStyle = '#ec4899';
    ctx.fillRect(0, 0, canvasW, isVertical ? 8 : 6);

    // Título y Logo del Header
    if (isVertical) {
      const logoSize = 130;
      const gapX = 20;
      const subText = '🧩 Desafíos Visuales — Amigos Jugones';

      ctx.font = '900 54px "Outfit", sans-serif';
      const titleW = ctx.measureText('COLLAGE JUGÓN').width;
      ctx.font = '700 22px "Outfit", sans-serif';
      const subW = ctx.measureText(subText).width;
      const textW = Math.max(titleW, subW);
      const totalUnitW = logoSize + gapX + textW;

      const startX = Math.round((canvasW - totalUnitW) / 2);
      const logoX = startX;
      const logoY = Math.round((HEADER_H - logoSize) / 2);
      const centerY = Math.round(HEADER_H / 2);

      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
        ctx.shadowBlur = 18;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      const textX = logoX + logoSize + gapX;
      ctx.save();
      const aTitleGrad = ctx.createLinearGradient(textX, 0, textX + titleW, 0);
      aTitleGrad.addColorStop(0, '#ffffff');
      aTitleGrad.addColorStop(0.5, '#ffd100');
      aTitleGrad.addColorStop(1, '#a855f7');

      ctx.font = '900 54px "Outfit", sans-serif';
      ctx.fillStyle = aTitleGrad;
      ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
      ctx.shadowBlur = 14;
      ctx.fillText('COLLAGE JUGÓN', textX, centerY - 6);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 22px "Outfit", sans-serif';
      ctx.fillText(subText, textX, centerY + 30);
      ctx.restore();
    } else {
      const logoSize = 78;
      const logoX = 24;
      const logoY = (HEADER_H - logoSize) / 2;

      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(255, 209, 0, 0.45)';
        ctx.shadowBlur = 14;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      const titleX = 118;
      const titleY = HEADER_H / 2 + 8;
      ctx.save();
      const aTitleGrad = ctx.createLinearGradient(titleX, 0, titleX + 320, 0);
      aTitleGrad.addColorStop(0, '#ffffff');
      aTitleGrad.addColorStop(0.5, '#ffd100');
      aTitleGrad.addColorStop(1, '#a855f7');

      ctx.font = '900 40px "Outfit", sans-serif';
      ctx.fillStyle = aTitleGrad;
      ctx.shadowColor = 'rgba(168, 85, 247, 0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText('COLLAGE JUGÓN', titleX, titleY);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 15px "Outfit", sans-serif';
      ctx.fillText('Desafíos Visuales Combinados', titleX, titleY + 22);
      ctx.restore();

      if (categoryLabel) {
        ctx.save();
        ctx.font = '700 15px "Outfit", sans-serif';
        const catW = ctx.measureText(categoryLabel).width + 24;
        const catH = 30;
        const catX = canvasW - catW - 24;
        const catY = (HEADER_H - catH) / 2;
        ctx.fillStyle = 'rgba(255, 209, 0, 0.15)';
        drawRoundRect(ctx, catX, catY, catW, catH, 15);
        ctx.fill();
        ctx.strokeStyle = '#ffd100';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffd100';
        ctx.textAlign = 'center';
        ctx.fillText(categoryLabel, catX + catW / 2, catY + 20);
        ctx.restore();
      }
    }

    // ── Área del Collage y Bloques Inferiores ──
    let frameX, frameY, frameW, frameH;
    let questionCardY, questionCardH;

    if (isVertical) {
      // 9:16 Vertical Stories (1080x1920)
      frameW = 920;
      frameH = 920; // Cuadrado 1:1 idéntico al editor
      frameX = (canvasW - frameW) / 2;
      frameY = 200;

      drawCollageComposition(ctx, frameX, frameY, frameW, frameH);

      questionCardY = 1160;
      questionCardH = 260;

      // Tarjeta de la Pregunta
      ctx.save();
      ctx.fillStyle = 'rgba(24, 12, 44, 0.94)';
      drawRoundRect(ctx, frameX, questionCardY, frameW, questionCardH, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 209, 0, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffd100';
      ctx.font = '900 42px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.4)';
      ctx.shadowBlur = 10;
      wrapText(ctx, questionText, canvasW / 2, questionCardY + questionCardH / 2, frameW - 60, 48);
      ctx.restore();

      // Badge y Footer
      drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio);
      drawCardFooter(ctx, canvasW, canvasH, aspectRatio);

    } else {
      // 1:1 Cuadrado (1000x1000)
      frameW = 500;
      frameH = 500; // Cuadrado 1:1 idéntico al editor
      frameX = (canvasW - frameW) / 2;
      frameY = 118;

      drawCollageComposition(ctx, frameX, frameY, frameW, frameH);

      // Tarjeta de la Pregunta (debajo del collage sin solapar nada)
      questionCardY = 632;
      questionCardH = 105;
      const cardW = 720;
      const cardX = (canvasW - cardW) / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(24, 12, 44, 0.94)';
      drawRoundRect(ctx, cardX, questionCardY, cardW, questionCardH, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 209, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffd100';
      ctx.font = '900 32px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.4)';
      ctx.shadowBlur = 10;
      wrapText(ctx, questionText, canvasW / 2, questionCardY + questionCardH / 2, cardW - 50, 38);
      ctx.restore();

      // Badge de Creador en Y=752 (encima del QR Y=815 y debajo de la tarjeta Y=737)
      drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio, 752);
      drawCardFooter(ctx, canvasW, canvasH, aspectRatio);
    }

    return canvas.toDataURL('image/png');
  }

  // ── 14. RENDERIZADO TARJETA 2: RESPUESTA REVELADA ─────────────────────────
  function renderCollageAnswerCanvas(questionText, answerText, categoryLabel, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const canvasW = isVertical ? 1080 : 1000;
    const canvasH = isVertical ? 1920 : 1000;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // Fondo Cyberpunk Dark Gradient (Acento Turquesa/Esmeralda)
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#0c1a24');
    bgGrad.addColorStop(0.5, '#122533');
    bgGrad.addColorStop(1, '#1b1236');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Destellos Turquesa & Dorado
    ctx.save();
    ctx.fillStyle = 'rgba(0, 194, 168, 0.18)';
    ctx.beginPath();
    ctx.arc(isVertical ? 900 : 850, isVertical ? 240 : 140, isVertical ? 340 : 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 209, 0, 0.14)';
    ctx.beginPath();
    ctx.arc(isVertical ? 180 : 140, isVertical ? 1680 : 860, isVertical ? 350 : 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── Header Bar Superior ──
    const HEADER_H = isVertical ? 170 : 100;
    ctx.fillStyle = 'rgba(12, 26, 36, 0.9)';
    ctx.fillRect(0, 0, canvasW, HEADER_H);

    ctx.fillStyle = '#00c2a8';
    ctx.fillRect(0, 0, canvasW, isVertical ? 8 : 6);

    // Título y Logo del Header
    if (isVertical) {
      const logoSize = 130;
      const gapX = 20;
      const subText = '🏆 Solución Revelada — Amigos Jugones';

      ctx.font = '900 54px "Outfit", sans-serif';
      const titleW = ctx.measureText('COLLAGE JUGÓN').width;
      ctx.font = '700 22px "Outfit", sans-serif';
      const subW = ctx.measureText(subText).width;
      const textW = Math.max(titleW, subW);
      const totalUnitW = logoSize + gapX + textW;

      const startX = Math.round((canvasW - totalUnitW) / 2);
      const logoX = startX;
      const logoY = Math.round((HEADER_H - logoSize) / 2);
      const centerY = Math.round(HEADER_H / 2);

      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 194, 168, 0.45)';
        ctx.shadowBlur = 18;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      const textX = logoX + logoSize + gapX;
      ctx.save();
      const aTitleGrad = ctx.createLinearGradient(textX, 0, textX + titleW, 0);
      aTitleGrad.addColorStop(0, '#ffffff');
      aTitleGrad.addColorStop(0.5, '#ffd100');
      aTitleGrad.addColorStop(1, '#00c2a8');

      ctx.font = '900 54px "Outfit", sans-serif';
      ctx.fillStyle = aTitleGrad;
      ctx.shadowColor = 'rgba(0, 194, 168, 0.6)';
      ctx.shadowBlur = 14;
      ctx.fillText('COLLAGE JUGÓN', textX, centerY - 6);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 22px "Outfit", sans-serif';
      ctx.fillText(subText, textX, centerY + 30);
      ctx.restore();
    } else {
      const logoSize = 78;
      const logoX = 24;
      const logoY = (HEADER_H - logoSize) / 2;

      if (brandLogoImg && brandLogoImg.complete && brandLogoImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 194, 168, 0.45)';
        ctx.shadowBlur = 14;
        ctx.drawImage(brandLogoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      const titleX = 118;
      const titleY = HEADER_H / 2 + 8;
      ctx.save();
      const aTitleGrad = ctx.createLinearGradient(titleX, 0, titleX + 320, 0);
      aTitleGrad.addColorStop(0, '#ffffff');
      aTitleGrad.addColorStop(0.5, '#ffd100');
      aTitleGrad.addColorStop(1, '#00c2a8');

      ctx.font = '900 40px "Outfit", sans-serif';
      ctx.fillStyle = aTitleGrad;
      ctx.shadowColor = 'rgba(0, 194, 168, 0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText('COLLAGE JUGÓN', titleX, titleY);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#00c2a8';
      ctx.font = '700 15px "Outfit", sans-serif';
      ctx.fillText('Solución / Respuesta del Desafío', titleX, titleY + 22);
      ctx.restore();

      if (categoryLabel) {
        ctx.save();
        ctx.font = '700 15px "Outfit", sans-serif';
        const catW = ctx.measureText(categoryLabel).width + 24;
        const catH = 30;
        const catX = canvasW - catW - 24;
        const catY = (HEADER_H - catH) / 2;
        ctx.fillStyle = 'rgba(0, 194, 168, 0.15)';
        drawRoundRect(ctx, catX, catY, catW, catH, 15);
        ctx.fill();
        ctx.strokeStyle = '#00c2a8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#00c2a8';
        ctx.textAlign = 'center';
        ctx.fillText(categoryLabel, catX + catW / 2, catY + 20);
        ctx.restore();
      }
    }

    // ── Composición del Collage y Banner de Respuesta ──
    if (isVertical) {
      // 9:16 Vertical Stories (1080x1920)
      const frameW = 920;
      const frameH = 920; // Cuadrado 1:1
      const frameX = (canvasW - frameW) / 2;
      const frameY = 200;

      drawCollageComposition(ctx, frameX, frameY, frameW, frameH);

      const answerBannerY = 1150;
      const answerBannerH = 250;

      // Banner de Respuesta
      ctx.save();
      ctx.fillStyle = 'rgba(15, 30, 44, 0.94)';
      drawRoundRect(ctx, frameX, answerBannerY, frameW, answerBannerH, 20);
      ctx.fill();
      ctx.strokeStyle = '#00c2a8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Pill Superior "🏆 RESPUESTA CORRECTA"
      const pillW = 340;
      const pillH = 42;
      const pillX = (canvasW - pillW) / 2;
      const pillY = answerBannerY + 20;

      ctx.fillStyle = 'rgba(0, 194, 168, 0.2)';
      drawRoundRect(ctx, pillX, pillY, pillW, pillH, 20);
      ctx.fill();
      ctx.strokeStyle = '#00c2a8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#00c2a8';
      ctx.font = '900 22px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 RESPUESTA CORRECTA', canvasW / 2, pillY + 28);

      // Texto de la Respuesta Ganadora (Dorado Resplandeciente)
      ctx.fillStyle = '#ffd100';
      ctx.font = '900 50px "Outfit", sans-serif';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.6)';
      ctx.shadowBlur = 18;
      wrapText(ctx, answerText, canvasW / 2, answerBannerY + 155, frameW - 80, 58);
      ctx.restore();

      // Badge y Footer
      drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio);
      drawCardFooter(ctx, canvasW, canvasH, aspectRatio);

    } else {
      // 1:1 Cuadrado (1000x1000)
      const frameW = 500;
      const frameH = 500; // Cuadrado 1:1 idéntico al editor
      const frameX = (canvasW - frameW) / 2;
      const frameY = 118;

      drawCollageComposition(ctx, frameX, frameY, frameW, frameH);

      const cardW = 720;
      const cardX = (canvasW - cardW) / 2;
      const answerBannerY = 632;
      const answerBannerH = 105;

      // Banner de Respuesta
      ctx.save();
      ctx.fillStyle = 'rgba(15, 30, 44, 0.94)';
      drawRoundRect(ctx, cardX, answerBannerY, cardW, answerBannerH, 16);
      ctx.fill();
      ctx.strokeStyle = '#00c2a8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Pill Superior
      const pillW = 260;
      const pillH = 30;
      const pillX = (canvasW - pillW) / 2;
      const pillY = answerBannerY + 10;

      ctx.fillStyle = 'rgba(0, 194, 168, 0.2)';
      drawRoundRect(ctx, pillX, pillY, pillW, pillH, 15);
      ctx.fill();
      ctx.strokeStyle = '#00c2a8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#00c2a8';
      ctx.font = '900 15px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 RESPUESTA CORRECTA', canvasW / 2, pillY + 20);

      // Texto Respuesta en Dorado
      ctx.fillStyle = '#ffd100';
      ctx.font = '900 36px "Outfit", sans-serif';
      ctx.shadowColor = 'rgba(255, 209, 0, 0.6)';
      ctx.shadowBlur = 14;
      wrapText(ctx, answerText, canvasW / 2, answerBannerY + 70, cardW - 50, 40);
      ctx.restore();

      // Badge de Creador en Y=752 (claramente por debajo de la tarjeta Y=737 y sobre el QR Y=815)
      drawCreatorBadge(ctx, canvasW, canvasH, aspectRatio, 752);
      drawCardFooter(ctx, canvasW, canvasH, aspectRatio);
    }

    return canvas.toDataURL('image/png');
  }

  // ── 15. MANEJADOR PRINCIPAL DE GENERACIÓN ─────────────────────────────────
  function sanitizeFilename(str) {
    return (str || '')
      .trim()
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_');
  }

  async function handleGenerate() {
    const questionText = challengeTitleInput ? challengeTitleInput.value.trim() : '';
    const answerText = answerInput ? answerInput.value.trim() : '';

    if (!state.mainImage || !questionText || !answerText) {
      alert('Por favor completa todos los campos requeridos (Nombre, IG, Imagen Principal, Pregunta y Respuesta).');
      return;
    }

    const cName = creatorNameInput ? creatorNameInput.value.trim() : '';
    const cIg = creatorIgInput ? creatorIgInput.value.trim() : '';

    // Verificación de nombres protegidos
    const isAuthorized = await checkProtectedNameAccess(cName, cIg);
    if (!isAuthorized) return;

    // Carga de assets de marca garantizada
    await loadBrandAssets();

    const categoryText = categoryInput ? categoryInput.value.trim() : '';
    const baseName = sanitizeFilename(questionText.substring(0, 30)) || 'CollageBG';
    const aspectRatio = state.aspectRatio;

    // Mostrar Loader
    loader.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    generateBtn.disabled = true;
    if (regenerateBtn) regenerateBtn.disabled = true;

    await new Promise(r => setTimeout(r, 150));

    try {
      state.generatedResults = [
        {
          title: 'Tarjeta 1 — El Desafío (Pregunta)',
          filename: `${baseName}_Pregunta.png`,
          dataUrl: renderCollageQuestionCanvas(questionText, categoryText, aspectRatio),
          description: 'Imagen del reto visual para compartir en tus grupos y redes.'
        },
        {
          title: 'Tarjeta 2 — Solución (Respuesta)',
          filename: `${baseName}_Solucion.png`,
          dataUrl: renderCollageAnswerCanvas(questionText, answerText, categoryText, aspectRatio),
          description: 'Imagen con la respuesta correcta revelada.'
        }
      ];

      displayResults(state.generatedResults);
    } catch (err) {
      console.error('Error al generar tarjetas de CollageBG:', err);
      alert('Ocurrió un error al generar las tarjetas:\n' + (err.message || err));
    } finally {
      loader.classList.add('hidden');
      generateBtn.disabled = false;
      if (regenerateBtn) {
        regenerateBtn.disabled = false;
        regenerateBtn.classList.remove('hidden');
      }
    }
  }

  // ── 16. DESPLIEGUE DE RESULTADOS Y DESCARGA ────────────────────────────────
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
          <p class="section-subtitle" style="font-size:0.82rem; margin-bottom:12px;">${item.description}</p>
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
    if (!state.generatedResults || state.generatedResults.length === 0) return;

    state.generatedResults.forEach((item, i) => {
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

  if (generateBtn) generateBtn.addEventListener('click', handleGenerate);
  if (regenerateBtn) regenerateBtn.addEventListener('click', handleGenerate);
  if (downloadAllBtn) downloadAllBtn.addEventListener('click', handleDownloadAll);

  // Inicialización
  loadBrandAssets();
  validateForm();
});
