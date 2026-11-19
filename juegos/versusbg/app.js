/**
 * Versus Jugón AMIGOS JUGONES — Application Logic
 * HD Canvas Card Generator for Versus & "¿Qué Prefieres?" Challenges
 * 2-Stage Workflow: 1. Launch Challenge | 2. Publish Real Voting Results (with localStorage auto-save)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const versusForm = document.getElementById('versusForm');
  const questionInput = document.getElementById('questionInput');
  const categoryInput = document.getElementById('categoryInput');
  const creatorNameInput = document.getElementById('creatorNameInput');
  const creatorIgInput = document.getElementById('creatorIgInput');

  // Mode Switcher Elements
  const modeTabChallenge = document.getElementById('modeTabChallenge');
  const modeTabResults = document.getElementById('modeTabResults');
  const formHeaderTitle = document.getElementById('formHeaderTitle');
  const formHeaderSubtitle = document.getElementById('formHeaderSubtitle');
  const resultsInputSection = document.getElementById('resultsInputSection');

  // Option A Elements
  const optionATextInput = document.getElementById('optionATextInput');
  const dropZoneA = document.getElementById('dropZoneA');
  const imageInputA = document.getElementById('imageInputA');
  const urlInputA = document.getElementById('urlInputA');
  const previewWrapA = document.getElementById('previewWrapA');
  const previewImgA = document.getElementById('previewImgA');
  const removeImgBtnA = document.getElementById('removeImgBtnA');

  // Option B Elements
  const optionBTextInput = document.getElementById('optionBTextInput');
  const dropZoneB = document.getElementById('dropZoneB');
  const imageInputB = document.getElementById('imageInputB');
  const urlInputB = document.getElementById('urlInputB');
  const previewWrapB = document.getElementById('previewWrapB');
  const previewImgB = document.getElementById('previewImgB');
  const removeImgBtnB = document.getElementById('removeImgBtnB');

  // Voting Results Controls
  const votosAInput = document.getElementById('votosAInput');
  const votosBInput = document.getElementById('votosBInput');
  const voteSummaryTotal = document.getElementById('voteSummaryTotal');
  const voteSummaryPercents = document.getElementById('voteSummaryPercents');
  const voteSlider = document.getElementById('voteSlider');
  const voteValA = document.getElementById('voteValA');
  const voteValB = document.getElementById('voteValB');
  const winnerSelect = document.getElementById('winnerSelect');
  const noteInput = document.getElementById('noteInput');

  // Saved Session Banner Elements
  const savedSessionBanner = document.getElementById('savedSessionBanner');
  const savedSummaryText = document.getElementById('savedSummaryText');
  const loadSavedBtn = document.getElementById('loadSavedBtn');
  const clearSavedBtn = document.getElementById('clearSavedBtn');

  // Preview & Buttons
  const livePreviewCanvas = document.getElementById('livePreviewCanvas');
  const prevTabChallenge = document.getElementById('prevTabChallenge');
  const prevTabResults = document.getElementById('prevTabResults');
  const generateChallengeBtn = document.getElementById('generateChallengeBtn');
  const generateResultsBtn = document.getElementById('generateResultsBtn');
  const resetFormBtn = document.getElementById('resetFormBtn');
  const quickDownloadBtn = document.getElementById('quickDownloadBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const loader = document.getElementById('loader');
  const resultsSection = document.getElementById('resultsSection');
  const cardsGrid = document.getElementById('cardsGrid');

  // State
  let activeMode = 'challenge'; // 'challenge' | 'results'
  let activePreviewTab = 'challenge'; // 'challenge' | 'results'
  let loadedImgA = null;
  let loadedImgB = null;
  let dataUrlA = null;
  let dataUrlB = null;
  let brandLogoImg = null;
  let brandQRImg = null;
  let brandBlackLogoImg = null;
  let livePreviewTimer = null;

  const STORAGE_KEY = 'versus_saved_data_v2';

  // ── SISTEMA DE SEGURIDAD Y PROTECCIÓN DE NOMBRES RESERVADOS ─────────────
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

      passInput.onkeyup = (e) => {
        if (e.key === 'Enter') verifyBtn.click();
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
    });
  }

  // ── INICIALIZACIÓN DE MARCAS / LOGOS ASÍNCRONOS ────────────────────────
  function initBrandAssets() {
    return Promise.all([
      new Promise((res) => {
        const img = new Image();
        img.onload = () => { brandLogoImg = img; res(); };
        img.onerror = () => res();
        // logoData.js exports window.BRAND_LOGO_DATA_URL (base64)
        img.src = (window.BRAND_LOGO_DATA_URL) ? window.BRAND_LOGO_DATA_URL : 'assets/logo.png';
      }),
      new Promise((res) => {
        const img = new Image();
        img.onload = () => { brandQRImg = img; res(); };
        img.onerror = () => res();
        // qrData.js exports window.BRAND_QR_DATA_URL (base64)
        img.src = (window.BRAND_QR_DATA_URL) ? window.BRAND_QR_DATA_URL : 'assets/amigosjugonesymas_qr.png';
      }),
      new Promise((res) => {
        const img = new Image();
        img.onload = () => { brandBlackLogoImg = img; res(); };
        img.onerror = () => res();
        // blackLogoData.js exports window.BLACK_LOGO_DATA_URL (base64)
        img.src = (window.BLACK_LOGO_DATA_URL) ? window.BLACK_LOGO_DATA_URL : 'assets/logo_black.png';
      })
    ]);
  }

  // ── MANEJO DE IMÁGENES DE OPCIÓN A Y OPCIÓN B ──────────────────────────
  function setupImageUploaders() {
    dropZoneA.addEventListener('click', () => imageInputA.click());
    imageInputA.addEventListener('change', (e) => handleImageFile(e.target.files[0], 'A'));
    urlInputA.addEventListener('input', () => handleImageUrl(urlInputA.value, 'A'));
    removeImgBtnA.addEventListener('click', () => removeImage('A'));

    dropZoneB.addEventListener('click', () => imageInputB.click());
    imageInputB.addEventListener('change', (e) => handleImageFile(e.target.files[0], 'B'));
    urlInputB.addEventListener('input', () => handleImageUrl(urlInputB.value, 'B'));
    removeImgBtnB.addEventListener('click', () => removeImage('B'));

    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (document.activeElement && (document.activeElement.id === 'dropZoneB' || document.activeElement.id === 'optionBTextInput' || document.activeElement.id === 'urlInputB')) {
            handleImageFile(file, 'B');
          } else {
            handleImageFile(file, 'A');
          }
          break;
        }
      }
    });
  }

  function handleImageFile(file, target) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => loadImageDataUrl(e.target.result, target);
    reader.readAsDataURL(file);
  }

  function handleImageUrl(url, target) {
    if (!url.trim()) return;
    loadImageDataUrl(url.trim(), target);
  }

  async function loadImageDataUrl(srcUrl, target) {
    if (!srcUrl) return;

    let finalSrc = srcUrl;
    if (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) {
      let dataUrlResult = null;
      try {
        const res = await fetch(srcUrl);
        if (res.ok) {
          const blob = await res.blob();
          dataUrlResult = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        }
      } catch (e) {
        console.warn('Fetch directo de la imagen falló por CORS, intentando proxies CORS:', e);
      }

      if (!dataUrlResult) {
        const proxies = [
          `https://corsproxy.io/?${encodeURIComponent(srcUrl)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(srcUrl)}`
        ];
        for (const proxyUrl of proxies) {
          try {
            const pRes = await fetch(proxyUrl);
            if (pRes.ok) {
              const pBlob = await pRes.blob();
              dataUrlResult = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(pBlob);
              });
              if (dataUrlResult) break;
            }
          } catch (pe) {
            console.warn('Fallback proxy CORS falló:', pe);
          }
        }
      }

      if (dataUrlResult) {
        finalSrc = dataUrlResult;
      }
    }

    const img = new Image();
    if (finalSrc.startsWith('http://') || finalSrc.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = async () => {
      let finalImg = img;
      if (window.IMAGE_NORMALIZER && typeof window.IMAGE_NORMALIZER.normalizeImage === 'function') {
        try {
          const normalized = await window.IMAGE_NORMALIZER.normalizeImage(img);
          if (normalized) {
            finalImg = normalized;
          }
        } catch (err) {
          console.warn('Normalización de imagen omitida por seguridad:', err);
        }
      }

      if (target === 'A') {
        loadedImgA = finalImg;
        dataUrlA = finalImg.src || finalSrc;
        previewImgA.src = dataUrlA;
        previewWrapA.classList.remove('hidden');
      } else {
        loadedImgB = finalImg;
        dataUrlB = finalImg.src || finalSrc;
        previewImgB.src = dataUrlB;
        previewWrapB.classList.remove('hidden');
      }
      saveFormState();
      scheduleLivePreviewUpdate();
    };

    img.onerror = () => {
      console.error('Error al cargar la imagen:', srcUrl);
      alert('No se pudo cargar la imagen provista. Comprueba que el archivo o la URL sean válidos.');
    };

    img.src = finalSrc;
  }

  function removeImage(target) {
    if (target === 'A') {
      loadedImgA = null;
      dataUrlA = null;
      imageInputA.value = '';
      urlInputA.value = '';
      previewWrapA.classList.add('hidden');
    } else {
      loadedImgB = null;
      dataUrlB = null;
      imageInputB.value = '';
      urlInputB.value = '';
      previewWrapB.classList.add('hidden');
    }
    saveFormState();
    scheduleLivePreviewUpdate();
  }

  // ── MANEJO DEL WORKFLOW DE 2 ETAPAS Y CONTROLES ───────────────────────
  function setupWorkflowListeners() {
    modeTabChallenge.addEventListener('click', () => setMode('challenge'));
    modeTabResults.addEventListener('click', () => setMode('results'));

    const inputs = [
      questionInput, categoryInput, creatorNameInput, creatorIgInput,
      optionATextInput, optionBTextInput, noteInput, winnerSelect
    ];
    inputs.forEach(el => {
      if (el) el.addEventListener('input', () => {
        saveFormState();
        scheduleLivePreviewUpdate();
      });
    });

    votosAInput.addEventListener('input', syncVotesFromNumeric);
    votosBInput.addEventListener('input', syncVotesFromNumeric);

    voteSlider.addEventListener('input', () => {
      const valA = parseInt(voteSlider.value, 10);
      const valB = 100 - valA;
      voteValA.textContent = `${valA}%`;
      voteValB.textContent = `${valB}%`;
      saveFormState();
      scheduleLivePreviewUpdate();
    });

    document.querySelectorAll('input[name="aspectRatio"]').forEach(radio => {
      radio.addEventListener('change', () => {
        document.querySelectorAll('.format-option-card').forEach(card => card.classList.remove('active'));
        const activeCard = radio.closest('.format-option-card');
        if (activeCard) activeCard.classList.add('active');
        saveFormState();
        scheduleLivePreviewUpdate();
      });
    });

    prevTabChallenge.addEventListener('click', () => {
      activePreviewTab = 'challenge';
      prevTabChallenge.classList.add('active');
      prevTabResults.classList.remove('active');
      quickDownloadBtn.innerHTML = '📥 Descargar Tarjeta de Desafío (PNG HD)';
      updateLivePreview();
    });

    prevTabResults.addEventListener('click', () => {
      activePreviewTab = 'results';
      prevTabResults.classList.add('active');
      prevTabChallenge.classList.remove('active');
      quickDownloadBtn.innerHTML = '📥 Descargar Tarjeta de Resultados (PNG HD)';
      updateLivePreview();
    });

    generateChallengeBtn.addEventListener('click', () => handleGenerateSingleCard('challenge'));
    generateResultsBtn.addEventListener('click', () => handleGenerateSingleCard('results'));
    quickDownloadBtn.addEventListener('click', () => handleGenerateSingleCard(activePreviewTab));
    resetFormBtn.addEventListener('click', resetAllForm);

    loadSavedBtn.addEventListener('click', restoreSavedState);
    clearSavedBtn.addEventListener('click', clearSavedState);
  }

  function setMode(mode) {
    activeMode = mode;
    if (mode === 'challenge') {
      modeTabChallenge.classList.add('active');
      modeTabResults.classList.remove('active');
      formHeaderTitle.textContent = '⚔️ Crear Nuevo Desafío Versus';
      formHeaderSubtitle.textContent = 'Define las opciones A vs B para que tu grupo vote en WhatsApp';
      generateChallengeBtn.classList.remove('hidden');
      generateResultsBtn.classList.add('hidden');

      activePreviewTab = 'challenge';
      prevTabChallenge.classList.add('active');
      prevTabResults.classList.remove('active');
      quickDownloadBtn.innerHTML = '📥 Descargar Tarjeta de Desafío (PNG HD)';
    } else {
      modeTabResults.classList.add('active');
      modeTabChallenge.classList.remove('active');
      formHeaderTitle.textContent = '📊 Publicar Resultados de Votación';
      formHeaderSubtitle.textContent = 'Ingresa los votos reales obtenidos en WhatsApp para revelar al ganador';
      generateChallengeBtn.classList.add('hidden');
      generateResultsBtn.classList.remove('hidden');

      activePreviewTab = 'results';
      prevTabResults.classList.add('active');
      prevTabChallenge.classList.remove('active');
      quickDownloadBtn.innerHTML = '📥 Descargar Tarjeta de Resultados (PNG HD)';
    }
    updateLivePreview();
  }

  function syncVotesFromNumeric() {
    let numA = parseInt(votosAInput.value, 10);
    let numB = parseInt(votosBInput.value, 10);
    if (isNaN(numA) || numA < 0) numA = 0;
    if (isNaN(numB) || numB < 0) numB = 0;

    const total = numA + numB;
    let percA = 50;
    let percB = 50;

    if (total > 0) {
      percA = Math.round((numA / total) * 100);
      percB = 100 - percA;
    }

    voteSlider.value = percA;
    voteValA.textContent = `${percA}%`;
    voteValB.textContent = `${percB}%`;

    voteSummaryTotal.textContent = `🗳️ Total Votos: ${total}`;
    voteSummaryPercents.textContent = `🔴 A: ${percA}% vs 🔵 B: ${percB}%`;

    saveFormState();
    scheduleLivePreviewUpdate();
  }

  function scheduleLivePreviewUpdate() {
    clearTimeout(livePreviewTimer);
    livePreviewTimer = setTimeout(updateLivePreview, 120);
  }

  function getSelectedAspectRatio() {
    const checked = document.querySelector('input[name="aspectRatio"]:checked');
    return checked ? checked.value : '1:1';
  }

  function updateLivePreview() {
    const aspect = getSelectedAspectRatio();
    const canvasW = 1080;
    const canvasH = (aspect === '9:16') ? 1920 : 1080;

    livePreviewCanvas.width = canvasW;
    livePreviewCanvas.height = canvasH;

    const ctx = livePreviewCanvas.getContext('2d');
    const formData = extractFormData();

    if (activePreviewTab === 'challenge') {
      renderChallengeCanvas(ctx, canvasW, canvasH, aspect, formData);
    } else {
      renderResultsCanvas(ctx, canvasW, canvasH, aspect, formData);
    }
  }

  function extractFormData() {
    const valA = parseInt(voteSlider.value, 10);
    const valB = 100 - valA;
    return {
      category: categoryInput.value.trim(),
      creatorName: creatorNameInput.value.trim(),
      creatorIg: creatorIgInput.value.trim(),
      question: questionInput.value.trim() || '¿Qué prefieres?',
      optionAText: optionATextInput.value.trim() || 'Opción A',
      optionBText: optionBTextInput.value.trim() || 'Opción B',
      imgA: loadedImgA,
      imgB: loadedImgB,
      votosNumA: parseInt(votosAInput.value, 10) || 0,
      votosNumB: parseInt(votosBInput.value, 10) || 0,
      voteA: valA,
      voteB: valB,
      winner: winnerSelect.value,
      note: noteInput.value.trim()
    };
  }

  // ── AUTO-GUARDADO Y RESTAURACIÓN EN LOCALSTORAGE ───────────────────────
  function saveFormState() {
    try {
      const state = {
        question: questionInput.value,
        category: categoryInput.value,
        creatorName: creatorNameInput.value,
        creatorIg: creatorIgInput.value,
        optionAText: optionATextInput.value,
        optionBText: optionBTextInput.value,
        dataUrlA: dataUrlA,
        dataUrlB: dataUrlB,
        votosA: votosAInput.value,
        votosB: votosBInput.value,
        voteSliderVal: voteSlider.value,
        winner: winnerSelect.value,
        note: noteInput.value,
        aspectRatio: getSelectedAspectRatio(),
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  function checkSavedSession() {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (!savedRaw) return;
      const data = JSON.parse(savedRaw);
      if (data && (data.optionAText || data.optionBText || data.question)) {
        savedSummaryText.textContent = `Dilema: "${data.question || '¿Qué prefieres?'}" — [${data.optionAText || 'Opción A'} vs ${data.optionBText || 'Opción B'}]`;
        savedSessionBanner.classList.remove('hidden');
      }
    } catch (e) {
      console.warn(e);
    }
  }

  function restoreSavedState() {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (!savedRaw) return;
      const data = JSON.parse(savedRaw);

      if (data.question) questionInput.value = data.question;
      if (data.category) categoryInput.value = data.category;
      if (data.creatorName) creatorNameInput.value = data.creatorName;
      if (data.creatorIg) creatorIgInput.value = data.creatorIg;
      if (data.optionAText) optionATextInput.value = data.optionAText;
      if (data.optionBText) optionBTextInput.value = data.optionBText;
      if (data.votosA) votosAInput.value = data.votosA;
      if (data.votosB) votosBInput.value = data.votosB;
      if (data.winner) winnerSelect.value = data.winner;
      if (data.note) noteInput.value = data.note;

      if (data.dataUrlA) loadImageDataUrl(data.dataUrlA, 'A');
      if (data.dataUrlB) loadImageDataUrl(data.dataUrlB, 'B');

      if (data.aspectRatio) {
        const radio = document.querySelector(`input[name="aspectRatio"][value="${data.aspectRatio}"]`);
        if (radio) {
          radio.checked = true;
          document.querySelectorAll('.format-option-card').forEach(card => card.classList.remove('active'));
          const parent = radio.closest('.format-option-card');
          if (parent) parent.classList.add('active');
        }
      }

      syncVotesFromNumeric();
      savedSessionBanner.classList.add('hidden');
      scheduleLivePreviewUpdate();
    } catch (e) {
      console.error(e);
    }
  }

  function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
    savedSessionBanner.classList.add('hidden');
  }

  function resetAllForm() {
    if (!confirm('¿Deseas reiniciar todos los campos y comenzar un nuevo Versus?')) return;
    versusForm.reset();
    removeImage('A');
    removeImage('B');
    clearSavedState();
    questionInput.value = '¿Qué prefieres?';
    votosAInput.value = '10';
    votosBInput.value = '10';
    voteSlider.value = '50';
    syncVotesFromNumeric();
    setMode('challenge');
  }

  // ── AUXILIARES DE RENDERIZADO CANVAS ────────────────────────────────────
  function drawRoundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
  }

  function getWrappedTextLines(ctx, text, maxWidth) {
    if (!text) return [''];
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  function drawBackgroundGrid(ctx, canvasW, canvasH) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const step = 60;
    for (let x = 0; x < canvasW; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
    for (let y = 0; y < canvasH; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAntiTheftWatermark(ctx, canvasW, canvasH) {
    ctx.save();
    ctx.font = '900 24px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.textAlign = 'center';
    ctx.rotate(-Math.PI / 8);
    for (let y = -canvasH; y < canvasH * 2; y += 180) {
      for (let x = -canvasW; x < canvasW * 2; x += 360) {
        ctx.fillText('AMIGOS JUGONES — VERSUS', x, y);
      }
    }
    ctx.restore();
  }

  function drawCardHeader(ctx, canvasW = 1080, aspectRatio = '1:1') {
    const isVertical = (aspectRatio === '9:16');
    const headerH = isVertical ? 200 : 140;

    ctx.save();

    // Dark header panel
    ctx.fillStyle = 'rgba(10, 4, 20, 0.96)';
    ctx.fillRect(0, 0, canvasW, headerH);

    const logoSize = isVertical ? 145 : 105;
    const gapX = isVertical ? 24 : 18;

    const mainTitleStr = 'VERSUS JUGÓN';
    const subTitleStr = '⚔️ DESAFÍOS DE VERSUS — Amigos Jugones';

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

    // Bottom separator line
    ctx.fillStyle = 'rgba(255, 209, 0, 0.8)';
    ctx.fillRect(0, headerH - 3, canvasW, 3);

    ctx.restore();
    return headerH;
  }

  function drawCategoryBadge(ctx, canvasW, badgeY, categoryStr, isVertical) {
    const catText = `🏷️ CATEGORÍA: ${(categoryStr || 'DESAFÍO GENERAL').toUpperCase()}`;
    ctx.save();
    ctx.font = isVertical ? 'bold 24px "Outfit", sans-serif' : 'bold 18px "Outfit", sans-serif';
    const textW = ctx.measureText(catText).width;
    const badgeW = textW + (isVertical ? 48 : 36);
    const badgeH = isVertical ? 48 : 36;
    const badgeX = (canvasW - badgeW) / 2;

    ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.85)';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, isVertical ? 14 : 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd100';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catText, canvasW / 2, badgeY + badgeH / 2 + 1);
    ctx.restore();
    return badgeH;
  }

  function drawCreatorBadge(ctx, canvasW, footerY, nameStr, igStr, isVertical) {
    const cleanIg = (igStr || '').replace(/^@+/, '');
    let creatorText = '';
    if (cleanIg && nameStr) creatorText = `👤 Desafío creado por ${nameStr} (@${cleanIg})`;
    else if (cleanIg) creatorText = `👤 Desafío creado por @${cleanIg}`;
    else if (nameStr) creatorText = `👤 Desafío creado por ${nameStr}`;

    if (!creatorText) return;

    const fontSize = isVertical ? 28 : 20;
    const badgeH = isVertical ? 56 : 42;

    ctx.save();
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    const textMetrics = ctx.measureText(creatorText);
    const badgeW = Math.min(canvasW - (isVertical ? 80 : 50), Math.max(isVertical ? 660 : 520, textMetrics.width + 60));
    const badgeX = (canvasW - badgeW) / 2;

    // Posición Y estrictamente por encima de la tarjeta QR flotante para que NUNCA se tapen
    const qrTopY = isVertical ? (footerY - 105) : (footerY - 93);
    const badgeY = qrTopY - badgeH - (isVertical ? 18 : 14);
    ctx.fillStyle = 'rgba(30, 18, 50, 0.92)';
    ctx.strokeStyle = 'rgba(255, 209, 0, 0.7)';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, isVertical ? 16 : 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd100';
    ctx.font = `700 ${fontSize}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(creatorText, canvasW / 2, badgeY + badgeH / 2 + 1);
    ctx.restore();
  }

  function drawCardFooterOnCanvas(ctx, canvasW = 1080, canvasH = 1080, aspectRatio = '1:1') {
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

    // ── LEFT: White Floating QR Card ─────
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

    // ── CENTER: ¡SÍGUENOS en INSTAGRAM! + Subtítulo ─────
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
    ctx.fillText('⚔️ Juego creado en Versus Jugón: Desafíos de Versus — ¡Crea los tuyos!', centerCenterX, footerY + (isVertical ? 92 : 65));
    ctx.restore();

    // ── RIGHT: Sistema creado por + BLACK logo ─────
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

  // ── RENDERIZADO TARJETA 1: DESAFÍO VERSUS ────────────────────────────────
  function renderChallengeCanvas(ctx, canvasW, canvasH, aspectRatio, data) {
    const isVertical = (aspectRatio === '9:16');
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    // Background
    ctx.fillStyle = '#120822';
    ctx.fillRect(0, 0, canvasW, canvasH);
    const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, 50, canvasW / 2, canvasH / 2, canvasW * 0.8);
    grad.addColorStop(0, 'rgba(123, 59, 198, 0.25)');
    grad.addColorStop(1, 'rgba(18, 8, 34, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    drawBackgroundGrid(ctx, canvasW, canvasH);
    drawAntiTheftWatermark(ctx, canvasW, canvasH);

    const headerH = drawCardHeader(ctx, canvasW, aspectRatio);
    let curY = headerH + (isVertical ? 28 : 16);

    // Category Badge
    const catH = drawCategoryBadge(ctx, canvasW, curY, data.category, isVertical);
    curY += catH + (isVertical ? 30 : 18);

    // Question Box
    const qBoxW = canvasW - (isVertical ? 80 : 60);
    const qBoxH = isVertical ? 110 : 80;
    const qBoxX = (canvasW - qBoxW) / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 209, 0, 0.12)';
    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, qBoxX, curY, qBoxW, qBoxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd100';
    ctx.font = isVertical ? '900 38px "Outfit", sans-serif' : '900 28px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 209, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.fillText(data.question, canvasW / 2, curY + (qBoxH / 2));
    ctx.restore();

    curY += qBoxH + (isVertical ? 36 : 20);

    // VERSUS CARDS LAYOUT (A vs B)
    const creatorMargin = (data.creatorName || data.creatorIg) ? (isVertical ? 90 : 65) : 10;
    const availableH = footerY - curY - creatorMargin;

    if (!isVertical) {
      const cardW = (canvasW - 100) / 2;
      const cardH = availableH - 20;
      const cardY = curY;

      drawOptionCard(ctx, 40, cardY, cardW, cardH, 'A', data.optionAText, data.imgA, '#ff2e4c', false);
      drawOptionCard(ctx, 40 + cardW + 20, cardY, cardW, cardH, 'B', data.optionBText, data.imgB, '#00c2a8', false);
      drawVsCircle(ctx, canvasW / 2, cardY + (cardH / 2), 64);
    } else {
      const cardW = canvasW - 80;
      const cardH = (availableH - 60) / 2;

      drawOptionCard(ctx, 40, curY, cardW, cardH, 'A', data.optionAText, data.imgA, '#ff2e4c', true);
      const cardBY = curY + cardH + 50;
      drawOptionCard(ctx, 40, cardBY, cardW, cardH, 'B', data.optionBText, data.imgB, '#00c2a8', true);
      drawVsCircle(ctx, canvasW / 2, curY + cardH + 25, 84);
    }

    drawCreatorBadge(ctx, canvasW, footerY, data.creatorName, data.creatorIg, isVertical);
    drawCardFooterOnCanvas(ctx, canvasW, canvasH, aspectRatio);
  }

  // ── RENDERIZADO TARJETA 2: RESULTADOS Y VOTACIÓN ────────────────────────
  function renderResultsCanvas(ctx, canvasW, canvasH, aspectRatio, data) {
    const isVertical = (aspectRatio === '9:16');
    const footerH = isVertical ? 260 : 95;
    const footerY = canvasH - footerH;

    // Background
    ctx.fillStyle = '#120822';
    ctx.fillRect(0, 0, canvasW, canvasH);
    const grad = ctx.createRadialGradient(canvasW / 2, canvasH / 2, 50, canvasW / 2, canvasH / 2, canvasW * 0.8);
    grad.addColorStop(0, 'rgba(42, 18, 76, 0.4)');
    grad.addColorStop(1, 'rgba(12, 6, 24, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    drawBackgroundGrid(ctx, canvasW, canvasH);
    drawAntiTheftWatermark(ctx, canvasW, canvasH);

    const headerH = drawCardHeader(ctx, canvasW, aspectRatio);
    let curY = headerH + (isVertical ? 28 : 16);

    // Results Header Badge
    const totalVotosStr = (data.votosNumA + data.votosNumB > 0) ? ` (${data.votosNumA + data.votosNumB} VOTOS TOTALES)` : '';
    const catText = `📊 RESULTADOS DE VOTACIÓN DEL GRUPO${totalVotosStr}`;
    ctx.save();
    ctx.font = isVertical ? '900 24px "Outfit", sans-serif' : '900 18px "Outfit", sans-serif';
    const textW = ctx.measureText(catText).width;
    const badgeW = textW + 40;
    const badgeH = isVertical ? 48 : 36;
    ctx.fillStyle = 'rgba(255, 209, 0, 0.15)';
    ctx.strokeStyle = '#ffd100';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, (canvasW - badgeW) / 2, curY, badgeW, badgeH, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd100';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(catText, canvasW / 2, curY + badgeH / 2);
    ctx.restore();

    curY += badgeH + (isVertical ? 30 : 18);

    // Dilemma Question Title
    ctx.save();
    ctx.font = isVertical ? '900 42px "Outfit", sans-serif' : '900 30px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(data.question, canvasW / 2, curY + 20);
    ctx.restore();

    curY += (isVertical ? 65 : 45);

    // VOTING BARS & OPTIONS DISPLAY
    const barW = canvasW - (isVertical ? 100 : 80);
    const barH = isVertical ? 64 : 48;
    const barX = (canvasW - barW) / 2;

    // Visual Percentage Bar
    ctx.save();
    drawRoundRect(ctx, barX, curY, barW, barH, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    const widthA = (barW * data.voteA) / 100;
    const widthB = barW - widthA;

    if (data.voteA > 0) {
      drawRoundRect(ctx, barX, curY, Math.max(widthA, 16), barH, { tl: 16, bl: 16, tr: (data.voteA === 100 ? 16 : 0), br: (data.voteA === 100 ? 16 : 0) });
      ctx.fillStyle = '#ff2e4c';
      ctx.fill();
    }

    if (data.voteB > 0) {
      drawRoundRect(ctx, barX + widthA, curY, Math.max(widthB, 16), barH, { tr: 16, br: 16, tl: (data.voteB === 100 ? 16 : 0), bl: (data.voteB === 100 ? 16 : 0) });
      ctx.fillStyle = '#00c2a8';
      ctx.fill();
    }

    // Percentage Labels on Bar
    ctx.fillStyle = '#ffffff';
    ctx.font = isVertical ? '900 32px "Outfit", sans-serif' : '900 24px "Outfit", sans-serif';
    ctx.textBaseline = 'middle';

    if (data.voteA >= 15) {
      ctx.textAlign = 'left';
      ctx.fillText(`${data.voteA}%`, barX + 20, curY + barH / 2);
    }
    if (data.voteB >= 15) {
      ctx.textAlign = 'right';
      ctx.fillText(`${data.voteB}%`, barX + barW - 20, curY + barH / 2);
    }
    ctx.restore();

    curY += barH + (isVertical ? 35 : 22);

    // WINNER ANNOUNCEMENT BADGE
    let winnerTitle = '';
    let winnerBg = '#ffd100';
    let winnerTextCol = '#000';

    if (data.winner === 'a' || (data.winner === 'auto' && data.voteA > data.voteB)) {
      winnerTitle = `🏆 GANADORA: OPCIÓN A (${data.voteA}%)`;
      winnerBg = '#ff2e4c';
      winnerTextCol = '#fff';
    } else if (data.winner === 'b' || (data.winner === 'auto' && data.voteB > data.voteA)) {
      winnerTitle = `🏆 GANADORA: OPCIÓN B (${data.voteB}%)`;
      winnerBg = '#00c2a8';
      winnerTextCol = '#fff';
    } else {
      winnerTitle = `🤝 EMPATE TÉCNICO EN EL GRUPO (${data.voteA}% - ${data.voteB}%)`;
      winnerBg = '#ffd100';
      winnerTextCol = '#000';
    }

    const winW = canvasW - (isVertical ? 120 : 100);
    const winH = isVertical ? 76 : 54;
    const winX = (canvasW - winW) / 2;

    ctx.save();
    ctx.fillStyle = winnerBg;
    ctx.shadowColor = winnerBg;
    ctx.shadowBlur = 20;
    drawRoundRect(ctx, winX, curY, winW, winH, 16);
    ctx.fill();

    ctx.fillStyle = winnerTextCol;
    ctx.font = isVertical ? '900 34px "Outfit", sans-serif' : '900 24px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(winnerTitle, canvasW / 2, curY + winH / 2);
    ctx.restore();

    curY += winH + (isVertical ? 35 : 22);

    // OPTIONS DETAILS SUMMARY - PROMINENT FULL CARDS
    const creatorY = footerY - (isVertical ? 75 : 54);
    const availableH = creatorY - curY - (isVertical ? 25 : 15);
    const optBoxW = (canvasW - (isVertical ? 100 : 80)) / 2;
    const optBoxH = Math.max(availableH, isVertical ? 500 : 320);

    drawResultOptionSummary(ctx, barX, curY, optBoxW, optBoxH, 'OPCIÓN A', data.optionAText, `${data.voteA}%`, data.imgA, '#ff2e4c', isVertical);
    drawResultOptionSummary(ctx, barX + optBoxW + 20, curY, optBoxW, optBoxH, 'OPCIÓN B', data.optionBText, `${data.voteB}%`, data.imgB, '#00c2a8', isVertical);

    drawCreatorBadge(ctx, canvasW, footerY, data.creatorName, data.creatorIg, isVertical);
    drawCardFooterOnCanvas(ctx, canvasW, canvasH, aspectRatio);
  }

  // ── DIBUJO DE TARJETAS DE OPCIÓN ────────────────────────────────────────
  function drawOptionCard(ctx, x, y, width, height, badgeLetter, titleText, imgObj, accentColor, isVertical) {
    ctx.save();
    const hasImage = (imgObj && imgObj.complete && imgObj.naturalWidth > 0);

    if (hasImage) {
      ctx.save();
      drawRoundRect(ctx, x, y, width, height, 18);
      ctx.clip();

      const aspectImg = imgObj.naturalWidth / imgObj.naturalHeight;
      const aspectBox = width / height;
      let drawW, drawH, drawX, drawY;

      if (aspectImg > aspectBox) {
        drawH = height;
        drawW = height * aspectImg;
        drawX = x - (drawW - width) / 2;
        drawY = y;
      } else {
        drawW = width;
        drawH = width / aspectImg;
        drawX = x;
        drawY = y - (drawH - height) / 2;
      }

      ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);

      const gradH = isVertical ? 220 : 160;
      const grad = ctx.createLinearGradient(0, y + height - gradH, 0, y + height);
      grad.addColorStop(0, 'rgba(10, 4, 20, 0)');
      grad.addColorStop(0.5, 'rgba(10, 4, 20, 0.7)');
      grad.addColorStop(1, 'rgba(10, 4, 20, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + height - gradH, width, gradH);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 14;
      drawRoundRect(ctx, x, y, width, height, 18);
      ctx.stroke();
      ctx.restore();

      const badgeW = isVertical ? 140 : 110;
      const badgeH = isVertical ? 40 : 32;
      ctx.save();
      ctx.fillStyle = accentColor;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      drawRoundRect(ctx, x + 16, y + 16, badgeW, badgeH, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = isVertical ? '900 22px "Outfit", sans-serif' : '900 16px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`OPCIÓN ${badgeLetter}`, x + 16 + (badgeW / 2), y + 16 + (badgeH / 2));
      ctx.restore();

      const fontSize = isVertical ? 32 : 22;
      ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;
      
      const maxTextW = width - 64;
      const lines = getWrappedTextLines(ctx, titleText, maxTextW);
      const lineHeight = isVertical ? 38 : 28;
      const textHeight = lines.length * lineHeight;
      
      const bannerPaddingV = isVertical ? 18 : 12;
      const bannerH = textHeight + (bannerPaddingV * 2);
      const bannerW = width - 32;
      const bannerX = x + 16;
      const bannerY = y + height - bannerH - 16;

      ctx.save();
      ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 12;
      drawRoundRect(ctx, bannerX, bannerY, bannerW, bannerH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;

      const startY = bannerY + bannerPaddingV + (lineHeight / 2);
      lines.forEach((lineStr, idx) => {
        ctx.fillText(lineStr, x + (width / 2), startY + (idx * lineHeight));
      });
      ctx.restore();

    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(20, 10, 36, 0.88)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 14;
      drawRoundRect(ctx, x, y, width, height, 18);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      const badgeW = isVertical ? 140 : 110;
      const badgeH = isVertical ? 40 : 32;
      ctx.fillStyle = accentColor;
      drawRoundRect(ctx, x + 16, y + 16, badgeW, badgeH, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = isVertical ? '900 22px "Outfit", sans-serif' : '900 16px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`OPCIÓN ${badgeLetter}`, x + 16 + (badgeW / 2), y + 16 + (badgeH / 2));

      ctx.fillStyle = '#ffffff';
      const fontSize = isVertical ? 38 : 26;
      ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxTextW = width - 40;
      const lines = getWrappedTextLines(ctx, titleText, maxTextW);
      const lineHeight = isVertical ? 46 : 34;
      const totalTextH = lines.length * lineHeight;
      const startY = y + (height / 2) - (totalTextH / 2) + (lineHeight / 2);

      lines.forEach((lineStr, idx) => {
        ctx.fillText(lineStr, x + (width / 2), startY + (idx * lineHeight));
      });

      ctx.restore();
    }

    ctx.restore();
  }

  function drawResultOptionSummary(ctx, x, y, width, height, badgeStr, textStr, percentStr, imgObj, accentColor, isVertical) {
    ctx.save();
    const hasImage = (imgObj && imgObj.complete && imgObj.naturalWidth > 0);

    if (hasImage) {
      ctx.save();
      drawRoundRect(ctx, x, y, width, height, 18);
      ctx.clip();

      const aspectImg = imgObj.naturalWidth / imgObj.naturalHeight;
      const aspectBox = width / height;
      let drawW, drawH, drawX, drawY;

      if (aspectImg > aspectBox) {
        drawH = height;
        drawW = height * aspectImg;
        drawX = x - (drawW - width) / 2;
        drawY = y;
      } else {
        drawW = width;
        drawH = width / aspectImg;
        drawX = x;
        drawY = y - (drawH - height) / 2;
      }

      ctx.drawImage(imgObj, drawX, drawY, drawW, drawH);

      const gradH = isVertical ? 220 : 160;
      const grad = ctx.createLinearGradient(0, y + height - gradH, 0, y + height);
      grad.addColorStop(0, 'rgba(10, 4, 20, 0)');
      grad.addColorStop(0.5, 'rgba(10, 4, 20, 0.7)');
      grad.addColorStop(1, 'rgba(10, 4, 20, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y + height - gradH, width, gradH);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 14;
      drawRoundRect(ctx, x, y, width, height, 18);
      ctx.stroke();
      ctx.restore();

      // Top-Left Badge
      const badgeW = isVertical ? 140 : 110;
      const badgeH = isVertical ? 40 : 32;
      ctx.save();
      ctx.fillStyle = accentColor;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      drawRoundRect(ctx, x + 16, y + 16, badgeW, badgeH, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = isVertical ? '900 22px "Outfit", sans-serif' : '900 16px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeStr, x + 16 + (badgeW / 2), y + 16 + (badgeH / 2));
      ctx.restore();

      // Top-Right Percentage Badge
      const percW = isVertical ? 110 : 90;
      const percH = isVertical ? 40 : 32;
      const percX = x + width - percW - 16;
      ctx.save();
      ctx.fillStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      drawRoundRect(ctx, percX, y + 16, percW, percH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accentColor;
      ctx.font = isVertical ? '900 26px "Outfit", sans-serif' : '900 20px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(percentStr, percX + (percW / 2), y + 16 + (percH / 2));
      ctx.restore();

      // Bottom Floating Text Pill
      const fontSize = isVertical ? 30 : 20;
      ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;
      
      const maxTextW = width - 48;
      const lines = getWrappedTextLines(ctx, textStr, maxTextW);
      const lineHeight = isVertical ? 36 : 26;
      const textHeight = lines.length * lineHeight;
      
      const bannerPaddingV = isVertical ? 16 : 10;
      const bannerH = textHeight + (bannerPaddingV * 2);
      const bannerW = width - 32;
      const bannerX = x + 16;
      const bannerY = y + height - bannerH - 16;

      ctx.save();
      ctx.fillStyle = 'rgba(10, 4, 20, 0.88)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 12;
      drawRoundRect(ctx, bannerX, bannerY, bannerW, bannerH, 14);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;

      const startY = bannerY + bannerPaddingV + (lineHeight / 2);
      lines.forEach((lineStr, idx) => {
        ctx.fillText(lineStr, x + (width / 2), startY + (idx * lineHeight));
      });
      ctx.restore();

    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(20, 10, 36, 0.88)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 14;
      drawRoundRect(ctx, x, y, width, height, 18);
      ctx.fill();
      ctx.stroke();

      const badgeW = isVertical ? 140 : 110;
      const badgeH = isVertical ? 40 : 32;
      ctx.fillStyle = accentColor;
      drawRoundRect(ctx, x + 16, y + 16, badgeW, badgeH, 10);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = isVertical ? '900 22px "Outfit", sans-serif' : '900 16px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeStr, x + 16 + (badgeW / 2), y + 16 + (badgeH / 2));

      const percW = isVertical ? 110 : 90;
      const percH = isVertical ? 40 : 32;
      const percX = x + width - percW - 16;
      ctx.fillStyle = 'rgba(10, 4, 20, 0.9)';
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      drawRoundRect(ctx, percX, y + 16, percW, percH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accentColor;
      ctx.font = isVertical ? '900 26px "Outfit", sans-serif' : '900 20px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(percentStr, percX + (percW / 2), y + 16 + (percH / 2));

      ctx.fillStyle = '#ffffff';
      const fontSize = isVertical ? 34 : 24;
      ctx.font = `900 ${fontSize}px "Outfit", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxTextW = width - 40;
      const lines = getWrappedTextLines(ctx, textStr, maxTextW);
      const lineHeight = isVertical ? 42 : 32;
      const totalTextH = lines.length * lineHeight;
      const startY = y + (height / 2) - (totalTextH / 2) + (lineHeight / 2);

      lines.forEach((lineStr, idx) => {
        ctx.fillText(lineStr, x + (width / 2), startY + (idx * lineHeight));
      });

      ctx.restore();
    }
  }

  function drawVsCircle(ctx, centerX, centerY, radius) {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 209, 0, 0.8)';
    ctx.shadowBlur = 24;

    const grad = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
    grad.addColorStop(0, '#ffd100');
    grad.addColorStop(1, '#ff2e4c');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#120822';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.font = `900 ${Math.round(radius * 0.9)}px "Outfit", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('VS', centerX, centerY + 2);

    ctx.restore();
  }

  // ── GENERACIÓN Y DESCARGA DE TARJETAS HD FINAL ─────────────────────────
  async function handleGenerateSingleCard(targetType) {
    const nameStr = creatorNameInput.value.trim();
    const igStr = creatorIgInput.value.trim();

    // Validar campos requeridos de identidad
    if (!nameStr || !igStr) {
      alert('Por favor ingresa tu Nombre/Apodo y tu Instagram antes de generar la tarjeta.');
      creatorNameInput.focus();
      return;
    }

    const allowed = await checkProtectedNameAccess(nameStr, igStr);
    if (!allowed) return;

    if (!optionATextInput.value.trim() || !optionBTextInput.value.trim()) {
      alert('Por favor ingresa los nombres de la Opción A y la Opción B.');
      return;
    }

    loader.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    cardsGrid.innerHTML = '';

    setTimeout(() => {
      try {
        const aspect = getSelectedAspectRatio();
        const canvasW = 1080;
        const canvasH = (aspect === '9:16') ? 1920 : 1080;
        const formData = extractFormData();

        if (targetType === 'challenge') {
          const canvas1 = document.createElement('canvas');
          canvas1.width = canvasW;
          canvas1.height = canvasH;
          const ctx1 = canvas1.getContext('2d');
          renderChallengeCanvas(ctx1, canvasW, canvasH, aspect, formData);

          appendResultCard(canvas1, 'Tarjeta 1: Desafío Versus', 'versus-desafío.png');
          triggerDownload(canvas1, 'versus-desafío-hd.png');
        } else if (targetType === 'results') {
          const canvas2 = document.createElement('canvas');
          canvas2.width = canvasW;
          canvas2.height = canvasH;
          const ctx2 = canvas2.getContext('2d');
          renderResultsCanvas(ctx2, canvasW, canvasH, aspect, formData);

          appendResultCard(canvas2, 'Tarjeta 2: Resultados del Grupo', 'versus-resultados.png');
          triggerDownload(canvas2, 'versus-resultados-hd.png');
        } else {
          // Both
          const canvas1 = document.createElement('canvas');
          canvas1.width = canvasW; canvas1.height = canvasH;
          renderChallengeCanvas(canvas1.getContext('2d'), canvasW, canvasH, aspect, formData);

          const canvas2 = document.createElement('canvas');
          canvas2.width = canvasW; canvas2.height = canvasH;
          renderResultsCanvas(canvas2.getContext('2d'), canvasW, canvasH, aspect, formData);

          appendResultCard(canvas1, '1. Tarjeta de Desafío Versus', 'versus-desafío.png');
          appendResultCard(canvas2, '2. Tarjeta de Resultados del Grupo', 'versus-resultados.png');

          triggerDownload(canvas1, 'versus-desafío-hd.png');
          setTimeout(() => triggerDownload(canvas2, 'versus-resultados-hd.png'), 300);
        }

        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        console.error('Error generating card:', err);
        alert('Ocurrió un error al generar la tarjeta PNG.');
      } finally {
        loader.classList.add('hidden');
      }
    }, 300);
  }

  function safeCanvasToDataURL(canvas) {
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Canvas export tainted:', e);
      return null;
    }
  }

  function appendResultCard(canvas, titleStr, filenameStr) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card-result-item';

    const dataUrl = safeCanvasToDataURL(canvas);
    if (!dataUrl) {
      alert(`No se pudo generar la vista previa de "${titleStr}" porque la imagen web provista tiene restricciones de seguridad (CORS). Descarga la foto a tu dispositivo y súbela como archivo.`);
      return;
    }

    const imgPreview = new Image();
    imgPreview.src = dataUrl;
    imgPreview.className = 'result-canvas-preview';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-download-single';
    downloadBtn.innerHTML = `📥 Descargar ${titleStr} (PNG HD)`;
    downloadBtn.onclick = () => triggerDownload(canvas, filenameStr);

    cardEl.appendChild(imgPreview);
    cardEl.appendChild(downloadBtn);
    cardsGrid.appendChild(cardEl);
  }

  function triggerDownload(canvas, filename) {
    try {
      const dataUrl = safeCanvasToDataURL(canvas);
      if (!dataUrl) {
        alert('No se pudo exportar la imagen en HD porque la imagen desde la web tiene restricciones CORS. Descarga la foto a tu dispositivo y súbela mediante la opción de "Subir Archivo".');
        return;
      }
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Trigger download error:', e);
      alert('Error al procesar la descarga de la tarjeta.');
    }
  }

  // ── INICIALIZACIÓN PRINCIPAL ───────────────────────────────────────────
  async function init() {
    await initBrandAssets();
    setupImageUploaders();
    setupWorkflowListeners();
    checkSavedSession();
    syncVotesFromNumeric();
    updateLivePreview();
  }

  init();
});
