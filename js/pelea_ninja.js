/**
 * AMIGOS JUGONES — CYBER NINJA: DOHYŌ SLASH
 * Minijuego Arcade 360° en Canvas 2D + Web Audio API + Grabación MP4
 * Control: Rotación continua + Auto-Corte Frontal por Proximidad
 */

'use strict';

(function () {
  // Estado y configuraciones globales del minijuego
  const NJ = {
    canvas: null,
    ctx: null,
    width: 360,
    height: 640,
    running: false,
    animId: null,

    // Entidad Ninja
    ninja: {
      x: 180,
      y: 320,
      angle: -Math.PI / 2, // mirando hacia arriba al iniciar
      targetAngle: -Math.PI / 2,
      rotationSpeed: 0.12, // velocidad de giro en radianes por frame (~6.8° por frame)
      attackRadius: 82,   // rango de corte de la katana
      attackArc: (100 * Math.PI) / 180, // cono frontal de 100°
      bodyRadius: 24,
      lives: 3,
      maxLives: 3,
      invulnerableTimer: 0,
      slashAnimTimer: 0,
      slashAngle: 0,
      burstEnergy: 0, // 0 a 100%
      isSpinningBurst: false,
      burstSpinTimer: 0
    },

    // Controles activos
    input: {
      left: false,
      right: false,
      burst: false
    },

    // Colecciones activas
    projectiles: [],
    particles: [],
    floatingTexts: [],
    fragments: [],

    // Métricas y Cronómetro
    startTime: 0,
    elapsedMs: 0,
    score: 0,
    cutCount: 0,
    combo: 1,
    maxCombo: 1,
    pilotName: 'Gladiador',
    ticketCost: 10,

    // Dificultad progresiva
    nextSpawnTime: 0,
    nextHeartTime: 14000, // primer corazón a los 14 segundos
    spawnInterval: 1400, // ms entre proyectiles inicial
    gameTimeSec: 0,

    // Audio & Efectos
    audioCtx: null,
    sfxEnabled: true,
    musicEnabled: true,
    bgmTimer: null,
    bgmStep: 0,
    screenShake: 0,

    // Grabación de Video
    recorder: null,
    recordedChunks: [],
    videoBlob: null,
    videoUrl: null,
    videoExt: 'mp4',
    isRecording: false,
    stopInitiated: false,
    audioDest: null
  };

  // Logo oficial para el Canvas HUD
  let njBadgeLogoImg = null;
  function getNjBadgeLogo() {
    if (!njBadgeLogoImg && typeof Image !== 'undefined') {
      try {
        njBadgeLogoImg = new Image();
        njBadgeLogoImg.crossOrigin = 'anonymous';
        njBadgeLogoImg.src = 'imagenes/LOGO AMIGOS JUGONES.png';
      } catch (e) {}
    }
    return njBadgeLogoImg;
  }
  getNjBadgeLogo();

  // ─── GESTIÓN DE AUDIO (Web Audio API Sintetizado) ───────────────────────────

  function getAudioCtx() {
    if (!NJ.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        NJ.audioCtx = new AudioContextClass();
      }
    }
    if (NJ.audioCtx && NJ.audioCtx.state === 'suspended') {
      NJ.audioCtx.resume();
    }
    return NJ.audioCtx;
  }

  function playSlashSfx() {
    if (!NJ.sfxEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1. Zumbido metálico agudo
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      if (NJ.audioDest) gain.connect(NJ.audioDest);

      osc.start(now);
      osc.stop(now + 0.13);

      // 2. Ruido blanco de impacto/corte
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(2500, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      if (NJ.audioDest) noiseGain.connect(NJ.audioDest);

      noise.start(now);
      noise.stop(now + 0.09);
    } catch (e) {}
  }

  function playHitDamageSfx() {
    if (!NJ.sfxEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.28);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      if (NJ.audioDest) gain.connect(NJ.audioDest);

      osc.start(now);
      osc.stop(now + 0.29);
    } catch (e) {}
  }

  function playBurstSfx() {
    if (!NJ.sfxEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.45);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      if (NJ.audioDest) gain.connect(NJ.audioDest);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch (e) {}
  }

  function playBonusSfx() {
    if (!NJ.sfxEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [587.33, 880, 1174.66].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.25, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.14);

        osc.connect(gain);
        gain.connect(ctx.destination);
        if (NJ.audioDest) gain.connect(NJ.audioDest);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } catch (e) {}
  }

  function playHeartCollectSfx() {
    if (!NJ.sfxEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Arpegio brillante celestial C5 - E5 - G5 - C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.3, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        if (NJ.audioDest) gain.connect(NJ.audioDest);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.23);
      });
    } catch (e) {}
  }

  function playHeartBrokenSfx() {
    if (!NJ.sfxEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      if (NJ.audioDest) gain.connect(NJ.audioDest);

      osc.start(now);
      osc.stop(now + 0.21);
    } catch (e) {}
  }

  // Sintetizador de música de fondo (Retro Cyber Beat acompasado)
  function startBgm() {
    stopBgm();
    if (!NJ.musicEnabled) return;

    const baseNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83]; // A2, C3, D3, E3
    NJ.bgmStep = 0;

    NJ.bgmTimer = setInterval(() => {
      if (!NJ.running || !NJ.musicEnabled) return;
      const ctx = getAudioCtx();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const freq = baseNotes[NJ.bgmStep % baseNotes.length];
        NJ.bgmStep++;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = (NJ.bgmStep % 2 === 0) ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const vol = (NJ.bgmStep % 4 === 0) ? 0.15 : 0.09;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        if (NJ.audioDest) gain.connect(NJ.audioDest);

        osc.start(now);
        osc.stop(now + 0.19);
      } catch (e) {}
    }, 220); // ~136 BPM
  }

  function stopBgm() {
    if (NJ.bgmTimer) {
      clearInterval(NJ.bgmTimer);
      NJ.bgmTimer = null;
    }
  }

  // ─── MINI-RANKING LOCAL DE PELEA ──────────────────────────────────────────

  function loadNinjaRanking() {
    try {
      const raw = localStorage.getItem('cb_ninja_ranking');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { pilot: 'Lord Cachas',   timeSec: 74.2, cuts: 82, score: 1152, avatar: '🐉', rent: '+3 PTS/día' },
      { pilot: 'Darth Pollito', timeSec: 61.5, cuts: 68, score: 955,  avatar: '🐥', rent: '+2 PTS/día' },
      { pilot: 'Max Lannister', timeSec: 48.8, cuts: 52, score: 748,  avatar: '🦁', rent: '+1 PTS/día' },
      { pilot: 'Nyx la Errante',timeSec: 36.4, cuts: 39, score: 559,  avatar: '🌙', rent: '-' },
      { pilot: 'El Crusher',    timeSec: 25.1, cuts: 24, score: 371,  avatar: '🔨', rent: '-' }
    ];
  }

  function saveNinjaRanking(ranking) {
    try {
      localStorage.setItem('cb_ninja_ranking', JSON.stringify(ranking));
    } catch (e) {}
  }

  function updateNinjaRanking(pilot, timeSec, cuts, score) {
    let list = loadNinjaRanking();
    const existing = list.find(r => r.pilot.toLowerCase() === pilot.toLowerCase());
    if (existing) {
      if (score > existing.score) {
        existing.timeSec = timeSec;
        existing.cuts = cuts;
        existing.score = score;
      }
    } else {
      list.push({ pilot, timeSec, cuts, score, avatar: '🥷', rent: '-' });
    }
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, 5);
    const rents = ['+3 PTS/día', '+2 PTS/día', '+1 PTS/día'];
    list.forEach((r, i) => { r.rent = rents[i] || '-'; });
    saveNinjaRanking(list);
    return list;
  }

  function renderNinjaRankingRows() {
    const list = loadNinjaRanking();
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    return list.map((r, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.1rem;">${medals[i] || '•'}</span>
          <span style="font-size:1.1rem;">${r.avatar || '🥷'}</span>
          <div>
            <div style="font-size:.9rem;font-weight:800;color:#fff;">${escapeHtml(r.pilot)}</div>
            <div style="font-size:.72rem;color:var(--text-dim);">${r.timeSec.toFixed(1)}s · ${r.cuts} cortes</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:.92rem;font-weight:900;color:#ec4899;">${r.score.toLocaleString('es')} PTS</div>
          <div style="font-size:.7rem;color:#10b981;font-weight:700;">${r.rent}</div>
        </div>
      </div>
    `).join('');
  }

  // ─── GRABACIÓN DE VIDEO NATIVA (MP4/WebM) ──────────────────────────────────

  function getBestRecordingConfig() {
    const candidates = [
      { mime: 'video/mp4;codecs="avc1.424028, mp4a.40.2"', ext: 'mp4', hasAudio: true },
      { mime: 'video/mp4;codecs=avc1,mp4a.40.2',           ext: 'mp4', hasAudio: true },
      { mime: 'video/mp4',                                 ext: 'mp4', hasAudio: false },
      { mime: 'video/webm;codecs=vp9,opus',                ext: 'webm', hasAudio: true },
      { mime: 'video/webm;codecs=vp8,opus',                ext: 'webm', hasAudio: true },
      { mime: 'video/webm',                                ext: 'webm', hasAudio: false }
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) {
        return c;
      }
    }
    return { mime: '', ext: 'webm', hasAudio: false };
  }

  function startRecording() {
    if (!NJ.isRecording || !NJ.canvas) return;
    NJ.recordedChunks = [];
    NJ.videoBlob = null;
    NJ.videoUrl = null;
    NJ.stopInitiated = false;

    try {
      const stream = NJ.canvas.captureStream(30);
      const cfg = getBestRecordingConfig();
      NJ.videoExt = cfg.ext;

      const ctx = getAudioCtx();
      if (ctx && cfg.hasAudio) {
        try {
          if (!NJ.audioDest) {
            NJ.audioDest = ctx.createMediaStreamDestination();
          }
          const audioTracks = NJ.audioDest.stream.getAudioTracks();
          if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0]);
          }
        } catch (e) {}
      }

      const options = { videoBitsPerSecond: 1600000 };
      if (cfg.mime) options.mimeType = cfg.mime;

      NJ.recorder = new MediaRecorder(stream, options);
      NJ.recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          NJ.recordedChunks.push(e.data);
        }
      };
      NJ.recorder.start(500);
    } catch (e) {
      console.warn('Fallo al iniciar grabación en Cyber Ninja:', e);
    }
  }

  function stopRecording() {
    return new Promise((resolve) => {
      if (!NJ.recorder || NJ.recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const finishBlob = () => {
        try {
          const mime = (NJ.recordedChunks[0] && NJ.recordedChunks[0].type) || 'video/mp4';
          NJ.videoBlob = new Blob(NJ.recordedChunks, { type: mime });
          NJ.videoUrl = URL.createObjectURL(NJ.videoBlob);
        } catch (e) {}
        resolve(NJ.videoBlob);
      };

      NJ.recorder.onstop = () => {
        finishBlob();
      };

      try {
        NJ.recorder.stop();
      } catch (e) {
        finishBlob();
      }

      setTimeout(() => {
        if (!NJ.videoBlob && NJ.recordedChunks.length > 0) {
          finishBlob();
        }
      }, 500);
    });
  }

  // ─── MECÁNICAS Y ENTIDADES ────────────────────────────────────────────────

  function spawnProjectile() {
    // Generar proyectil en el borde de un círculo exterior de radio R_SPAWN (~240px)
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 260;
    const x = NJ.ninja.x + Math.cos(angle) * spawnDist;
    const y = NJ.ninja.y + Math.sin(angle) * spawnDist;

    // Calcular velocidad base según el tiempo transcurrido (dificultad progresiva)
    const sec = NJ.gameTimeSec;
    let baseSpeed = 2.4 + Math.min(2.2, (sec / 30) * 1.2);

    // Tipos de proyectil: 70% Shuriken, 20% Kunai veloz, 10% Orbe Dorado
    const roll = Math.random();
    let type = 'shuriken';
    let color = '#06b6d4'; // cian
    let radius = 12;

    if (roll > 0.85) {
      type = 'kunai';
      color = '#ef4444'; // rojo peligro
      baseSpeed *= 1.35;
      radius = 10;
    } else if (roll < 0.12 && NJ.ninja.lives < NJ.ninja.maxLives) {
      type = 'orb_bonus';
      color = '#f59e0b'; // dorado
      radius = 14;
      baseSpeed *= 0.85;
    }

    // Dirección hacia el centro (x, y) -> (ninja.x, ninja.y)
    const dx = NJ.ninja.x - x;
    const dy = NJ.ninja.y - y;
    const dist = Math.hypot(dx, dy);
    const vx = (dx / dist) * baseSpeed;
    const vy = (dy / dist) * baseSpeed;

    NJ.projectiles.push({
      x, y, vx, vy,
      type, color, radius,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      active: true
    });
  }

  function spawnHeart() {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 260;
    const x = NJ.ninja.x + Math.cos(angle) * spawnDist;
    const y = NJ.ninja.y + Math.sin(angle) * spawnDist;

    // Velocidad más suave para dar tiempo de girar y apartar la katana
    const baseSpeed = 1.9;
    const dx = NJ.ninja.x - x;
    const dy = NJ.ninja.y - y;
    const dist = Math.hypot(dx, dy);
    const vx = (dx / dist) * baseSpeed;
    const vy = (dy / dist) * baseSpeed;

    NJ.projectiles.push({
      x, y, vx, vy,
      type: 'heart',
      color: '#ff2e63',
      radius: 14,
      rotation: 0,
      rotSpeed: 0,
      active: true
    });

    addFloatingText('❤️ ¡CORAZÓN! (¡DÉJALO PASAR AL CUERPO!)', NJ.ninja.x, NJ.ninja.y - 70, '#ff2e63');
  }

  function createCutFragments(p, cutAngle) {
    // Crea 2 fragmentos que se separan perpendiculares al corte
    const perpAngle = cutAngle + Math.PI / 2;
    const speed = 3.5;
    [-1, 1].forEach((dir) => {
      NJ.fragments.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(perpAngle) * speed * dir + (Math.random() - 0.5),
        vy: Math.sin(perpAngle) * speed * dir + (Math.random() - 0.5),
        color: p.color,
        size: p.radius * 0.8,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: dir * 0.2,
        life: 1.0
      });
    });

    // Chispas neón
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 4;
      NJ.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: Math.random() > 0.5 ? '#fff' : p.color,
        size: 2 + Math.random() * 3,
        life: 1.0,
        decay: 0.04 + Math.random() * 0.03
      });
    }
  }

  function addFloatingText(text, x, y, color = '#fff') {
    NJ.floatingTexts.push({
      text, x, y, color,
      life: 1.0,
      vy: -1.4
    });
  }

  // ─── BUCLE DE ACTUALIZACIÓN (FÍSICAS Y LÓGICA) ──────────────────────────────

  function updateGame(deltaMs) {
    if (!NJ.running) return;

    NJ.elapsedMs += deltaMs;
    NJ.gameTimeSec = NJ.elapsedMs / 1000;

    // Reducir timers
    if (NJ.ninja.invulnerableTimer > 0) NJ.ninja.invulnerableTimer -= deltaMs;
    if (NJ.ninja.slashAnimTimer > 0) NJ.ninja.slashAnimTimer -= deltaMs;
    if (NJ.screenShake > 0) NJ.screenShake -= 0.6;

    // Manejo de giro continuo
    if (NJ.input.left) {
      NJ.ninja.angle -= NJ.ninja.rotationSpeed;
    }
    if (NJ.input.right) {
      NJ.ninja.angle += NJ.ninja.rotationSpeed;
    }

    // Normalizar ángulo entre -PI y PI
    NJ.ninja.angle = Math.atan2(Math.sin(NJ.ninja.angle), Math.cos(NJ.ninja.angle));

    // Torbellino 360° en ejecución
    if (NJ.ninja.isSpinningBurst) {
      NJ.ninja.burstSpinTimer -= deltaMs;
      NJ.ninja.angle += 0.55; // rotación súper rápida
      if (NJ.ninja.burstSpinTimer <= 0) {
        NJ.ninja.isSpinningBurst = false;
      }
    }

    // Spawner progresivo de proyectiles normales
    if (NJ.elapsedMs >= NJ.nextSpawnTime) {
      spawnProjectile();

      // Ajustar intervalo de spawn según segundos jugados
      // De 1400ms al inicio baja gradualmente a ~450ms a los 60s
      const minInterval = 420;
      const dec = Math.min(950, (NJ.gameTimeSec / 60) * 950);
      NJ.spawnInterval = 1400 - dec;

      // Ocasionalmente spawnear ráfaga doble si pasaron más de 25s
      if (NJ.gameTimeSec > 25 && Math.random() > 0.6) {
        setTimeout(spawnProjectile, 180);
      }

      NJ.nextSpawnTime = NJ.elapsedMs + NJ.spawnInterval;
    }

    // Spawner de corazón (cada 20 a 26 segundos)
    if (NJ.elapsedMs >= NJ.nextHeartTime) {
      spawnHeart();
      NJ.nextHeartTime = NJ.elapsedMs + (20000 + Math.random() * 6000);
    }

    // Actualizar proyectiles y detectar auto-corte o colisión
    const ninjaX = NJ.ninja.x;
    const ninjaY = NJ.ninja.y;

    for (let i = NJ.projectiles.length - 1; i >= 0; i--) {
      const p = NJ.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      const dx = p.x - ninjaX;
      const dy = p.y - ninjaY;
      const dist = Math.hypot(dx, dy);

      // Ángulo relativo desde el ninja hacia el proyectil
      const angleToP = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToP - NJ.ninja.angle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      // 1. AUTO-CORTE: si entra en el radio de la katana y dentro del cono frontal
      const inFrontArc = (angleDiff <= NJ.ninja.attackArc / 2) || NJ.ninja.isSpinningBurst;

      if (dist <= NJ.ninja.attackRadius && inFrontArc && p.active) {
        p.active = false;

        // CASO ESPECIAL: CORAZÓN CORTADO (¡FALLO! NO DEBÍAS CORTARLO)
        if (p.type === 'heart') {
          createCutFragments(p, angleToP);
          playHeartBrokenSfx();
          NJ.screenShake = 2.5;
          addFloatingText('¡ROTO! NO DEBÍAS CORTARLO ❌', p.x, p.y, '#ef4444');
          NJ.projectiles.splice(i, 1);
          continue;
        }

        createCutFragments(p, angleToP);
        playSlashSfx();
        NJ.screenShake = 3.5;

        NJ.ninja.slashAnimTimer = 160; // ms de animación del slash
        NJ.ninja.slashAngle = angleToP;

        NJ.cutCount++;
        NJ.combo++;
        if (NJ.combo > NJ.maxCombo) NJ.maxCombo = NJ.combo;

        // Puntos
        let earnedPts = 10 * NJ.combo;
        if (p.type === 'orb_bonus') {
          earnedPts += 100;
          if (NJ.ninja.lives < NJ.ninja.maxLives) {
            NJ.ninja.lives++;
            addFloatingText('+1 ESCUDO 🛡️', ninjaX, ninjaY - 40, '#10b981');
          }
          playBonusSfx();
        }
        NJ.score += earnedPts;

        // Cargar energía de Torbellino
        if (NJ.ninja.burstEnergy < 100) {
          NJ.ninja.burstEnergy = Math.min(100, NJ.ninja.burstEnergy + 10);
        }

        const comboLabel = NJ.combo > 2 ? ` +${earnedPts} (x${NJ.combo})` : ` +${earnedPts}`;
        addFloatingText(comboLabel, p.x, p.y, p.color);

        NJ.projectiles.splice(i, 1);
        continue;
      }

      // 2. CONTACTO CON EL CUERPO DEL JUGADOR
      if (dist <= NJ.ninja.bodyRadius + p.radius && p.active) {
        // CASO ESPECIAL: CORAZÓN ABSORBIDO CON ÉXITO POR EL CUERPO
        if (p.type === 'heart') {
          p.active = false;
          playHeartCollectSfx();

          if (NJ.ninja.lives < NJ.ninja.maxLives) {
            NJ.ninja.lives++;
            addFloatingText('+1 ESCUDO REGENERADO ❤️', ninjaX, ninjaY - 35, '#10b981');
          } else {
            NJ.score += 300;
            addFloatingText('+300 PTS FULL ESCUDO ❤️', ninjaX, ninjaY - 35, '#f59e0b');
          }

          // Partículas de corazón y chispas
          for (let k = 0; k < 16; k++) {
            const a = Math.random() * Math.PI * 2;
            NJ.particles.push({
              x: ninjaX, y: ninjaY,
              vx: Math.cos(a) * (2 + Math.random() * 3),
              vy: Math.sin(a) * (2 + Math.random() * 3),
              color: Math.random() > 0.5 ? '#ff2e63' : '#f59e0b',
              size: 3.5,
              life: 1.0,
              decay: 0.03
            });
          }

          NJ.projectiles.splice(i, 1);
          continue;
        }

        // IMPACTO DE DAÑO NORMAL (SHURIKEN / KUNAI)
        if (NJ.ninja.invulnerableTimer <= 0) {
          p.active = false;
          NJ.ninja.lives--;
          NJ.combo = 1;
          NJ.ninja.invulnerableTimer = 1200; // 1.2s de invulnerabilidad
          NJ.screenShake = 7.0;
          playHitDamageSfx();
          addFloatingText('¡IMPACTO! 💥', ninjaX, ninjaY - 20, '#ef4444');

          // Partículas rojas de advertencia
          for (let k = 0; k < 18; k++) {
            const a = Math.random() * Math.PI * 2;
            NJ.particles.push({
              x: ninjaX, y: ninjaY,
              vx: Math.cos(a) * (2 + Math.random() * 4),
              vy: Math.sin(a) * (2 + Math.random() * 4),
              color: '#ef4444',
              size: 3,
              life: 1.0,
              decay: 0.04
            });
          }

          NJ.projectiles.splice(i, 1);

          if (NJ.ninja.lives <= 0) {
            triggerGameOver();
            return;
          }
        }
      }
    }

    // Actualizar fragmentos
    for (let i = NJ.fragments.length - 1; i >= 0; i--) {
      const f = NJ.fragments[i];
      f.x += f.vx;
      f.y += f.vy;
      f.rot += f.rotSpeed;
      f.life -= 0.035;
      if (f.life <= 0) NJ.fragments.splice(i, 1);
    }

    // Actualizar partículas
    for (let i = NJ.particles.length - 1; i >= 0; i--) {
      const pt = NJ.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life -= pt.decay;
      if (pt.life <= 0) NJ.particles.splice(i, 1);
    }

    // Actualizar textos flotantes
    for (let i = NJ.floatingTexts.length - 1; i >= 0; i--) {
      const ft = NJ.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.03;
      if (ft.life <= 0) NJ.floatingTexts.splice(i, 1);
    }
  }

  // Activar Torbellino de Emergencia 360°
  function triggerBurst() {
    if (NJ.ninja.isSpinningBurst) return;

    if (NJ.ninja.burstEnergy < 100) {
      addFloatingText(`🌀 CARGANDO: ${Math.floor(NJ.ninja.burstEnergy)}%`, NJ.ninja.x, NJ.ninja.y - 45, '#06b6d4');
      return;
    }

    NJ.ninja.burstEnergy = 0;
    NJ.ninja.isSpinningBurst = true;
    NJ.ninja.burstSpinTimer = 450; // ms de giro torbellino
    playBurstSfx();
    NJ.screenShake = 6.0;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(60); } catch (e) {}
    }

    // Destruir proyectiles cercanos al instante
    NJ.projectiles.forEach((p) => {
      createCutFragments(p, Math.atan2(p.y - NJ.ninja.y, p.x - NJ.ninja.x));
      NJ.cutCount++;
      NJ.score += 25;
    });
    NJ.projectiles = [];
    addFloatingText('🌀 ¡TORBELLINO 360°!', NJ.ninja.x, NJ.ninja.y - 50, '#ec4899');
  }

  function updateBurstButtonUI() {
    const btn = document.getElementById('ninja-burst-btn');
    const label = document.getElementById('ninja-burst-label');
    if (!btn || !label) return;

    const energy = Math.floor(NJ.ninja.burstEnergy);
    if (energy >= 100) {
      // ¡100% CARGADO! Botón iluminado neón rosa palpitante
      const pulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.05;
      btn.style.background = 'linear-gradient(135deg, #ec4899, #f43f5e)';
      btn.style.border = '2px solid #ffffff';
      btn.style.color = '#ffffff';
      btn.style.boxShadow = '0 0 22px rgba(236,72,153,0.9), 0 0 10px rgba(255,255,255,0.7)';
      btn.style.transform = `scale(${pulse})`;
      label.textContent = '🌀 ¡360° LISTO!';
    } else {
      // Cargándose: atenuado con porcentaje numérico
      btn.style.background = 'rgba(15, 23, 42, 0.88)';
      btn.style.border = '1.5px solid rgba(6, 182, 212, 0.45)';
      btn.style.color = 'rgba(255, 255, 255, 0.7)';
      btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
      btn.style.transform = 'scale(1)';
      label.textContent = `🌀 ${energy}%`;
    }
  }

  // ─── RENDERIZADO EN CANVAS 2D ──────────────────────────────────────────────

  function drawDohyo(ctx) {
    const cx = NJ.ninja.x;
    const cy = NJ.ninja.y;

    // Fondo oscuro profundo
    ctx.fillStyle = '#080814';
    ctx.fillRect(0, 0, NJ.width, NJ.height);

    // Cuadrícula sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < NJ.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, NJ.height);
      ctx.stroke();
    }
    for (let y = 0; y < NJ.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(NJ.width, y);
      ctx.stroke();
    }

    // Tatami circular exterior
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13, 13, 30, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Borde circular de neón interior (Área de combate)
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Resplandor del Arco de Corte Frontal
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const startA = NJ.ninja.angle - NJ.ninja.attackArc / 2;
    const endA = NJ.ninja.angle + NJ.ninja.attackArc / 2;
    ctx.arc(cx, cy, NJ.ninja.attackRadius, startA, endA);
    ctx.closePath();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawNinja(ctx) {
    const cx = NJ.ninja.x;
    const cy = NJ.ninja.y;
    const angle = NJ.ninja.angle;

    // Si está en tiempo de invulnerabilidad, parpadea
    if (NJ.ninja.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // 1. Bufanda cibernética que ondea hacia atrás
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    const wave = Math.sin(Date.now() * 0.015) * 6;
    ctx.quadraticCurveTo(-26, wave, -38, wave * 1.5);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // 2. Katana de Plasma extendida al frente
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(NJ.ninja.attackRadius - 6, 0);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.stroke();

    // Filo blanco intenso en el centro de la hoja
    ctx.beginPath();
    ctx.moveTo(14, 6);
    ctx.lineTo(NJ.ninja.attackRadius - 10, 0);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // 3. Cuerpo del Ninja (Círculo blindado)
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1b4b'; // azul índigo oscuro
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Visor neón apuntando al frente
    ctx.beginPath();
    ctx.arc(8, 0, 5, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.fill();

    ctx.restore();

    // 4. Nodos de Escudo Cibernético orbitando alrededor
    const shieldCount = NJ.ninja.lives;
    const orbitRadius = 30;
    const orbitSpeed = Date.now() * 0.003;
    for (let i = 0; i < shieldCount; i++) {
      const a = orbitSpeed + (i * Math.PI * 2) / shieldCount;
      const sx = cx + Math.cos(a) * orbitRadius;
      const sy = cy + Math.sin(a) * orbitRadius;

      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981'; // verde esmeralda
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    // 5. Animación de tajo relámpago (Slash Arc)
    if (NJ.ninja.slashAnimTimer > 0) {
      ctx.save();
      ctx.beginPath();
      const slashA = NJ.ninja.slashAngle;
      ctx.arc(cx, cy, NJ.ninja.attackRadius, slashA - 0.7, slashA + 0.7);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawProjectiles(ctx) {
    NJ.projectiles.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'shuriken') {
        // Shuriken de 4 puntas
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2;
          ctx.lineTo(Math.cos(a) * p.radius, Math.sin(a) * p.radius);
          const midA = a + Math.PI / 4;
          ctx.lineTo(Math.cos(midA) * (p.radius * 0.35), Math.sin(midA) * (p.radius * 0.35));
        }
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
      } else if (p.type === 'kunai') {
        // Kunai puntiagudo veloz
        ctx.beginPath();
        ctx.moveTo(p.radius * 1.4, 0);
        ctx.lineTo(-p.radius, -p.radius * 0.6);
        ctx.lineTo(-p.radius * 0.4, 0);
        ctx.lineTo(-p.radius, p.radius * 0.6);
        ctx.closePath();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.fill();
      } else if (p.type === 'orb_bonus') {
        // Esfera dorada pulsante
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 14;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      } else if (p.type === 'heart') {
        // Corazón neón latiendo (¡Dejar pasar al cuerpo!)
        const pulse = 1.0 + Math.sin(Date.now() * 0.012) * 0.18;
        ctx.scale(pulse, pulse);
        ctx.beginPath();
        const topY = -p.radius * 0.35;
        ctx.moveTo(0, topY);
        ctx.bezierCurveTo(0, -p.radius, -p.radius, -p.radius, -p.radius, topY);
        ctx.bezierCurveTo(-p.radius, (p.radius + topY) / 2, 0, p.radius * 1.15, 0, p.radius * 1.35);
        ctx.bezierCurveTo(0, p.radius * 1.15, p.radius, (p.radius + topY) / 2, p.radius, topY);
        ctx.bezierCurveTo(p.radius, -p.radius, 0, -p.radius, 0, topY);
        ctx.closePath();
        ctx.fillStyle = '#ff2e63';
        ctx.shadowColor = '#ff2e63';
        ctx.shadowBlur = 16;
        ctx.fill();

        // Destello interior blanco
        ctx.beginPath();
        ctx.arc(-p.radius * 0.3, topY * 0.7, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fill();
      }

      ctx.restore();
    });
  }

  function drawFragments(ctx) {
    NJ.fragments.forEach((f) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.beginPath();
      ctx.moveTo(-f.size, -f.size / 2);
      ctx.lineTo(f.size, 0);
      ctx.lineTo(-f.size / 2, f.size);
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    });
  }

  function drawParticles(ctx) {
    NJ.particles.forEach((pt) => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    });
  }

  function drawFloatingTexts(ctx) {
    ctx.save();
    ctx.font = '800 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    NJ.floatingTexts.forEach((ft) => {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.restore();
  }

  function drawCanvasHud(ctx) {
    // 1. Insignia Oficial Amigos Jugones (Top Left en Canvas - Queda estampada en el video MP4)
    ctx.save();
    const pillX = 10;
    const pillY = 10;
    const pillW = 126;
    const pillH = 26;
    ctx.fillStyle = 'rgba(8, 8, 20, 0.88)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const r = 6;
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillW - r, pillY);
    ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
    ctx.lineTo(pillX + pillW, pillY + pillH - r);
    ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
    ctx.lineTo(pillX + r, pillY + pillH);
    ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r);
    ctx.lineTo(pillX, pillY + r);
    ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const badgeLogo = getNjBadgeLogo();
    if (badgeLogo && badgeLogo.complete && badgeLogo.naturalWidth > 0) {
      ctx.drawImage(badgeLogo, pillX + 4, pillY + 2.5, 21, 21);
    } else {
      ctx.font = '13px sans-serif';
      ctx.fillText('🥷', pillX + 6, pillY + 18);
    }
    ctx.font = '900 8.5px "Inter", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.shadowBlur = 0;
    ctx.fillText('AMIGOS JUGONES', pillX + 28, pillY + 17);
    ctx.restore();

    // 2. Cronómetro de Supervivencia arriba al centro
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '900 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;

    const totalSec = NJ.elapsedMs / 1000;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const ms = Math.floor((totalSec % 1) * 100);
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    ctx.fillText(timeStr, NJ.width / 2, 42);

    ctx.font = '700 9px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 0;
    ctx.fillText('TIEMPO DE SUPERVIVENCIA', NJ.width / 2, 56);
    ctx.restore();

    // 3. Cortes y Combo (debajo de la insignia oficial, a la izquierda)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ec4899';
    ctx.fillText(`⚔️ ${NJ.cutCount} CORTES`, 12, 54);

    if (NJ.combo > 1) {
      ctx.font = '900 13px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fillText(`COMBO x${NJ.combo}!`, 12, 70);
    }
    ctx.restore();

    // 4. Escudo / Vidas y Puntos a la derecha
    ctx.save();
    ctx.textAlign = 'right';
    let shieldsStr = '';
    for (let i = 0; i < NJ.ninja.maxLives; i++) {
      shieldsStr += i < NJ.ninja.lives ? '🛡️' : '🖤';
    }
    ctx.font = '14px sans-serif';
    ctx.fillText(shieldsStr, NJ.width - 12, 34);

    ctx.font = '800 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText(`${NJ.score} PTS`, NJ.width - 12, 52);
    ctx.restore();

    // 4. Barra de Torbellino 360° abajo
    const barW = 140;
    const barH = 8;
    const bx = (NJ.width - barW) / 2;
    const by = NJ.height - 38;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(bx, by, barW, barH);

    const fillW = (NJ.ninja.burstEnergy / 100) * barW;
    ctx.fillStyle = NJ.ninja.burstEnergy >= 100 ? '#ec4899' : '#06b6d4';
    if (NJ.ninja.burstEnergy >= 100) {
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 8;
    }
    ctx.fillRect(bx, by, fillW, barH);

    ctx.textAlign = 'center';
    ctx.font = '700 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = NJ.ninja.burstEnergy >= 100 ? '#fff' : 'rgba(255,255,255,0.6)';
    ctx.fillText(
      NJ.ninja.burstEnergy >= 100 ? '🌀 TORBELLINO LISTO (TOCAR)' : 'CARGA TORBELLINO',
      NJ.width / 2,
      by - 5
    );
    ctx.restore();
  }

  // Estampado final de resumen en el canvas (grabado en los últimos frames del video)
  function drawGameOverCanvas(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 8, 20, 0.9)';
    ctx.fillRect(0, 0, NJ.width, NJ.height);

    const cx = NJ.width / 2;

    // Logo oficial de Amigos Jugones (si está disponible)
    const logoImg = typeof getCbLogo === 'function' ? getCbLogo() : null;
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      const s = 76;
      ctx.drawImage(logoImg, cx - s / 2, 70, s, s);
    } else {
      ctx.font = '46px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️', cx, 120);
    }

    ctx.textAlign = 'center';
    ctx.font = '800 12px "Outfit", sans-serif';
    ctx.fillStyle = '#06b6d4';
    ctx.letterSpacing = '1px';
    ctx.fillText('RESULTADOS DOHYŌ · AMIGOS JUGONES', cx, 172);

    ctx.font = '900 24px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('FIN DEL COMBATE', cx, 205);

    // Puntaje Total Protagónico
    ctx.font = '800 11px "Outfit", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('PUNTAJE TOTAL', cx, 250);

    ctx.font = '900 44px "JetBrains Mono", monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
    ctx.shadowBlur = 16;
    ctx.fillText(NJ.score.toLocaleString('es'), cx, 298);
    ctx.shadowBlur = 0;

    // Desglose
    const sec = (NJ.elapsedMs / 1000).toFixed(1);
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`⏱️ TIEMPO: ${sec}s  ·  ⚔️ CORTES: ${NJ.cutCount}`, cx, 340);
    ctx.fillText(`🔥 COMBO MÁX: x${NJ.maxCombo}`, cx, 365);

    // Piloto
    ctx.font = '800 14px "Outfit", sans-serif';
    ctx.fillStyle = '#ec4899';
    ctx.fillText(`GLADIADOR: ${NJ.pilotName.toUpperCase()}`, cx, 420);

    ctx.font = '600 10px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('AMIGOS JUGONES · CIRCUITO DOHYŌ 360°', cx, NJ.height - 30);

    ctx.restore();
  }

  // Loop principal de animación
  let lastTimestamp = 0;
  function gameLoop(timestamp) {
    if (!NJ.running) return;
    const deltaMs = Math.min(60, timestamp - (lastTimestamp || timestamp));
    lastTimestamp = timestamp;

    updateGame(deltaMs);

    NJ.ctx.save();
    if (NJ.screenShake > 0) {
      const sx = (Math.random() - 0.5) * NJ.screenShake;
      const sy = (Math.random() - 0.5) * NJ.screenShake;
      NJ.ctx.translate(sx, sy);
    }

    drawDohyo(NJ.ctx);
    drawFragments(NJ.ctx);
    drawProjectiles(NJ.ctx);
    drawParticles(NJ.ctx);
    drawNinja(NJ.ctx);
    drawFloatingTexts(NJ.ctx);
    drawCanvasHud(NJ.ctx);

    NJ.ctx.restore();

    updateBurstButtonUI();

    NJ.animId = requestAnimationFrame(gameLoop);
  }

  // ─── FIN DE PARTIDA & TELEMETRÍA ──────────────────────────────────────────

  function triggerGameOver() {
    NJ.running = false;
    stopBgm();

    const timeSec = parseFloat((NJ.elapsedMs / 1000).toFixed(1));
    const finalScore = NJ.score;
    const cuts = NJ.cutCount;
    const maxCombo = NJ.maxCombo;

    // Actualizar ranking local
    updateNinjaRanking(NJ.pilotName, timeSec, cuts, finalScore);

    // Reportar récord a SQLite para disputar el Podio de Cyber Ninja y Renta Pasiva Diaria
    const activeNinjaNick = (window.AuthManager && window.AuthManager.isAuthenticated()) ? window.AuthManager.getNick() : NJ.pilotName;
    if (activeNinjaNick) {
      const submitNinjaUrl = `/api/submit_score?nick=${encodeURIComponent(activeNinjaNick)}&game=pelea&cortes=${cuts}&tiempo=${timeSec}&score=${finalScore}`;
      fetch(submitNinjaUrl)
        .then(r => r.json())
        .then(res => {
          if (res && res.podio) {
            console.log(`⚔️ [CyberNinja] ¡${activeNinjaNick} entró al Podio #${res.pos}! (${res.renta})`);
          }
        })
        .catch(e => console.warn('[CyberNinja] Error reportando récord a SQLite:', e));
    }

    // Mantener dibujo del canvas a 30fps para estampar la tarjeta en el video por al menos 5 segundos
    let freezeTicks = 0;
    const freezeStartTime = Date.now();
    const freezeInterval = setInterval(() => {
      freezeTicks++;
      drawGameOverCanvas(NJ.ctx);

      const elapsedFreeze = Date.now() - freezeStartTime;
      // Esperar al menos 5000ms (5 segundos completos)
      if (elapsedFreeze >= 5000 && !NJ.stopInitiated) {
        NJ.stopInitiated = true;
        stopRecording().then((blob) => {
          clearInterval(freezeInterval);
          showNinjaTelemetry(timeSec, cuts, maxCombo, finalScore);
        });
      }
    }, 32);
  }

  function showNinjaTelemetry(timeSec, cuts, maxCombo, finalScore) {
    const cabinet = document.getElementById('cb-game-cabinet');
    if (!cabinet) return;

    let overlay = document.getElementById('cb-ninja-telemetry');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cb-ninja-telemetry';
      overlay.style.cssText =
        'position:absolute;inset:0;background:rgba(8,8,20,0.92);backdrop-filter:blur(10px);z-index:25;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;color:#fff;text-align:center;animation:fadeIn .3s ease;';
      cabinet.appendChild(overlay);
    }

    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:12px;">
        <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones"
          style="width:84px;height:84px;object-fit:contain;filter:drop-shadow(0 0 20px rgba(245,158,11,0.7)) drop-shadow(0 0 8px rgba(245,158,11,0.4));">
        <div style="font-size:.78rem;font-weight:800;color:#06b6d4;letter-spacing:1px;text-transform:uppercase;">
          Resultados de Combate · Dohyō
        </div>
      </div>

      <div style="font-size:clamp(2.6rem, 11vw, 4rem);font-weight:900;color:#38bdf8;font-family:'JetBrains Mono',monospace;line-height:1;filter:drop-shadow(0 0 16px rgba(56,189,248,0.6));">
        ${finalScore.toLocaleString('es')}
      </div>
      <div style="font-size:.78rem;font-weight:800;color:#f59e0b;letter-spacing:2px;margin-bottom:12px;">
        PUNTAJE TOTAL (PTS)
      </div>

      <div style="display:flex;justify-content:space-around;width:100%;max-width:280px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:10px 14px;margin-bottom:16px;">
        <div>
          <div style="font-size:.7rem;color:var(--text-dim);font-weight:700;">SUPERVIVENCIA</div>
          <div style="font-size:1.15rem;font-weight:900;color:#06b6d4;font-family:'JetBrains Mono',monospace;">${timeSec}s</div>
        </div>
        <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
        <div>
          <div style="font-size:.7rem;color:var(--text-dim);font-weight:700;">CORTES</div>
          <div style="font-size:1.15rem;font-weight:900;color:#ec4899;font-family:'JetBrains Mono',monospace;">${cuts}</div>
        </div>
        <div style="width:1px;background:rgba(255,255,255,0.1);"></div>
        <div>
          <div style="font-size:.7rem;color:var(--text-dim);font-weight:700;">MÁX COMBO</div>
          <div style="font-size:1.15rem;font-weight:900;color:#f59e0b;font-family:'JetBrains Mono',monospace;">x${maxCombo}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:280px;">
        <button id="nj-btn-share" onclick="window.ninjaShareFight(${timeSec}, ${cuts}, ${maxCombo}, ${finalScore})"
          class="cb-btn-nitro" style="width:100%;justify-content:center;font-size:1rem;padding:13px;background:linear-gradient(135deg,#06b6d4,#ec4899);border:none;">
          🎬 Compartir Combate (Descargar MP4)
        </button>
        <button onclick="window.ninjaRestartGame()"
          class="cb-btn-nitro" style="width:100%;justify-content:center;padding:11px;font-size:.92rem;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);">
          🔄 Nueva Tanda (-10 PTS)
        </button>
      </div>
    `;

    // Actualizar la lista del ranking en el HTML lateral si existe
    const rankEl = document.getElementById('cb-ninja-ranking-list');
    if (rankEl) {
      rankEl.innerHTML = renderNinjaRankingRows();
    }
  }

  // ─── CONTROLADORES PÚBLICOS EN WINDOW ──────────────────────────────────────

  window.ninjaLaunchGame = function () {
    const inputEl = document.getElementById('cb-ninja-pilot-input');
    let pilot = (inputEl && inputEl.value.trim()) || 'Gladiador';

    // Validación y cobro con AuthManager
    if (window.AuthManager) {
      if (!window.AuthManager.isAuthenticated()) {
        window.AuthManager.showModal({
          reason: 'Identifícate con tus credenciales de miembro para ingresar al Dohyō de Cyber Ninja y registrar tu posición en el podio.'
        });
        return;
      }

      // Auto-asignar nick autenticado
      const userNick = window.AuthManager.getNick();
      if (userNick && userNick !== 'Invitado') {
        pilot = userNick;
        if (inputEl) inputEl.value = userNick;
      }

      // Cobro de ficha arcade (-10 PTS)
      const debitRes = window.AuthManager.debitPoints(10, 'cyber_ninja');
      if (!debitRes.ok) {
        alert(`⚠️ ${debitRes.message}`);
        return;
      }

      // Sincronizar saldo en memoria en la tabla de ranking
      if (window.App && window.App.data && Array.isArray(window.App.data.ranking_principal)) {
        const row = window.App.data.ranking_principal.find(u => u.nombre && u.nombre.toUpperCase() === pilot.toUpperCase());
        if (row) row.puntos = debitRes.remaining;
      }
    }

    NJ.pilotName = pilot;
    localStorage.setItem('cb_ninja_pilot_name', pilot);

    // Descontar puntos de ticket si está logueado en App.data legacy
    if (window.App && window.App.data && window.App.data.currentUser) {
      if (typeof window.App.data.currentUser.puntos === 'number') {
        window.App.data.currentUser.puntos = Math.max(0, window.App.data.currentUser.puntos - NJ.ticketCost);
      }
    }

    // Ocultar pantalla de setup y mostrar contenedor arcade
    const setupEl = document.getElementById('cb-ninja-setup');
    const cabinetEl = document.getElementById('cb-canvas-wrapper');
    if (setupEl) setupEl.style.display = 'none';
    if (cabinetEl) cabinetEl.style.display = 'block';

    // Entrar a pantalla completa automáticamente si está habilitado
    const autoFs = document.getElementById('cb-ninja-auto-fullscreen-check');
    if (!autoFs || autoFs.checked) {
      if (cabinetEl) {
        if (cabinetEl.requestFullscreen) {
          cabinetEl.requestFullscreen().catch((err) => console.warn('Fullscreen al arrancar:', err));
        } else if (cabinetEl.webkitRequestFullscreen) {
          cabinetEl.webkitRequestFullscreen();
        }
      }
    }

    const canvas = document.getElementById('cb-canvas');
    if (!canvas) return;

    NJ.canvas = canvas;
    NJ.ctx = canvas.getContext('2d');
    NJ.canvas.width = NJ.width;
    NJ.canvas.height = NJ.height;

    // Reset de estado
    NJ.ninja.angle = -Math.PI / 2;
    NJ.ninja.lives = NJ.ninja.maxLives;
    NJ.ninja.burstEnergy = 0;
    NJ.ninja.invulnerableTimer = 0;
    NJ.ninja.isSpinningBurst = false;

    NJ.projectiles = [];
    NJ.particles = [];
    NJ.fragments = [];
    NJ.floatingTexts = [];

    NJ.elapsedMs = 0;
    NJ.score = 0;
    NJ.cutCount = 0;
    NJ.combo = 1;
    NJ.maxCombo = 1;
    NJ.spawnInterval = 1400;
    NJ.nextSpawnTime = 800; // primer proyectil en 800ms
    NJ.nextHeartTime = 14000;
    NJ.running = true;

    // Iniciar grabación de video y música
    NJ.isRecording = true;
    startRecording();
    startBgm();

    lastTimestamp = performance.now();
    requestAnimationFrame(gameLoop);
  };

  window.ninjaToggleFullscreen = function () {
    const cabinetEl = document.getElementById('cb-canvas-wrapper') || document.getElementById('cb-game-cabinet');
    if (!document.fullscreenElement) {
      if (cabinetEl && cabinetEl.requestFullscreen) {
        cabinetEl.requestFullscreen().catch((err) => console.warn(err));
      } else if (cabinetEl && cabinetEl.webkitRequestFullscreen) {
        cabinetEl.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  window.ninjaToggleMusic = function () {
    NJ.musicEnabled = !NJ.musicEnabled;
    if (!NJ.musicEnabled) stopBgm();
    else if (NJ.running) startBgm();
    const btn = document.getElementById('ninja-btn-music');
    if (btn) btn.style.opacity = NJ.musicEnabled ? '1' : '0.4';
  };

  window.ninjaToggleSfx = function () {
    NJ.sfxEnabled = !NJ.sfxEnabled;
    const btn = document.getElementById('ninja-btn-sfx');
    if (btn) btn.style.opacity = NJ.sfxEnabled ? '1' : '0.4';
  };

  window.ninjaRestartGame = function () {
    const overlay = document.getElementById('cb-ninja-telemetry');
    if (overlay) overlay.style.display = 'none';

    window.ninjaLaunchGame();
  };

  window.ninjaShareFight = async function (timeSec, cuts, maxCombo, totalScore) {
    const cleanPilot = NJ.pilotName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFileName = `dohyo-ninja-${cleanPilot}-${timeSec}s.mp4`;

    // 1. Descarga del video si está disponible
    if (NJ.videoUrl) {
      const a = document.createElement('a');
      a.href = NJ.videoUrl;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // 2. Copia de la ficha oficial de combate al portapapeles
    const text =
      `🥋 *CYBER NINJA — TELEMETRÍA OFICIAL DEL DOHYŌ*\n` +
      `👤 *Gladiador:* ${NJ.pilotName}\n` +
      `⭐ *PUNTAJE TOTAL:* ${totalScore.toLocaleString('es')} PTS\n` +
      `⏱️ *Supervivencia:* ${timeSec}s\n` +
      `⚔️ *Cortes Totales:* ${cuts}\n` +
      `🔥 *Récord de Combo:* x${maxCombo}\n` +
      `🎟️ *Costo:* -10 PTS (Ticket Arcade)\n\n` +
      `*¡Adjunto el video de mi combate para validar mi posición en el podio!* 🏆`;

    try {
      await navigator.clipboard.writeText(text);
      alert(
        `🎥 ¡Video descargado y ficha copiada al portapapeles!\n\nPega el mensaje en WhatsApp y adjunta "${finalFileName}" para reclamar tu renta pasiva en el podio.`
      );
    } catch (e) {
      alert(`🎥 ¡Video descargado!\n\nAdjunta "${finalFileName}" en WhatsApp para que el Admin valide tu posición.`);
    }
  };

  // Controles de botones táctiles
  window.ninjaRotateLeft = function (isDown) {
    NJ.input.left = isDown;
  };

  window.ninjaRotateRight = function (isDown) {
    NJ.input.right = isDown;
  };

  window.ninjaTriggerBurst = function () {
    triggerBurst();
  };

  // Listeners de teclado
  window.addEventListener('keydown', (e) => {
    if (!NJ.running) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      NJ.input.left = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      NJ.input.right = true;
    }
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      triggerBurst();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      NJ.input.left = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      NJ.input.right = false;
    }
  });

  // ─── MONTAJE DEL ESQUELETO Y GABINETE ARCADE (initPeleaNinja) ───────────────

  window.initPeleaNinja = function (el, d) {
    el.innerHTML = `
      <div class="carrera-suite-page">

        <!-- Encabezado Estándar Amigos Jugones -->
        <div class="radar-header-v2 flex justify-between items-center gap-24 mb-16" style="flex-wrap:wrap;">
          <div>
            <div class="title-with-badge flex items-center gap-12 mb-8">
              <h1 class="text-3xl font-extrabold m-0 flex items-center gap-8" style="color:#fff;letter-spacing:-0.5px;">
                <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones"
                  style="width:34px;height:34px;object-fit:contain;filter:drop-shadow(0 0 8px rgba(245,158,11,0.6));">
                Cyber Ninja
              </h1>
              <span class="badge" style="background:rgba(236,72,153,.15);color:#ec4899;border:1px solid rgba(236,72,153,.4);font-size:.72rem;font-weight:800;">DOHYŌ 360° · SUMIDERO</span>
            </div>
            <p class="text-sm m-0" style="color:var(--text-dim);line-height:1.5;">
              Gira tu katana de plasma y corta los proyectiles al vuelo. El <strong>Top 3 del dohyō</strong> cobra <strong>renta pasiva diaria</strong>. Rota con <kbd style="background:rgba(255,255,255,.1);border-radius:4px;padding:1px 6px;">← →</kbd> / <kbd style="background:rgba(255,255,255,.1);border-radius:4px;padding:1px 6px;">A D</kbd> (o laterales táctiles) y desata el Torbellino 360° con <kbd style="background:rgba(255,255,255,.1);border-radius:4px;padding:1px 6px;">ESPACIO</kbd> o el botón central.
            </p>
          </div>
          <div class="card glow flex items-center gap-12" style="padding:10px 18px;border-color:rgba(236,72,153,.4);background:rgba(236,72,153,.05);">
            <span style="font-size:1.5rem;">🎫</span>
            <div>
              <div style="font-size:.7rem;color:var(--text-dim);text-transform:uppercase;font-weight:700;">Ticket de Entrada</div>
              <div style="font-size:.95rem;font-weight:800;color:#ec4899;">10 PTS por tanda</div>
            </div>
          </div>
        </div>

        <!-- Grid Principal del Gabinete y Ranking -->
        <div class="carrera-scroll-viewport">
          <div class="carrera-layout-grid">

            <!-- Columna 1: Gabinete del Juego -->
            <div id="cb-ninja-col" class="flex flex-col gap-12">

              <!-- Pantalla de Setup / Entrada -->
              <div id="cb-ninja-setup" class="card glow flex flex-col gap-16" style="padding:24px;border-color:rgba(236,72,153,.4);">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-12">
                    <img src="imagenes/LOGO AMIGOS JUGONES.png" alt="Amigos Jugones"
                      style="width:68px;height:68px;object-fit:contain;filter:drop-shadow(0 0 18px rgba(245,158,11,0.65)) drop-shadow(0 0 6px rgba(245,158,11,0.35));">
                    <div>
                      <h2 class="text-xl font-extrabold m-0" style="color:#fff;">Acceso al Dohyō</h2>
                      <p class="text-xs m-0" style="color:var(--text-dim);">Ingresa tu nick para registrar tu marca de supervivencia.</p>
                    </div>
                  </div>
                  <button type="button" onclick="window.ninjaToggleFullscreen()" class="cb-hud-btn" style="padding:7px 12px;font-size:0.8rem;gap:6px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:8px;">
                    ⛶ Pantalla Completa
                  </button>
                </div>

                <div>
                  <label style="display:block;font-size:.8rem;font-weight:700;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px;">Tu Nick en WhatsApp:</label>
                  <input type="text" id="cb-ninja-pilot-input" placeholder="Ej: Nico, Jess, Ricardragon..."
                    value="${escapeHtml(localStorage.getItem('cb_ninja_pilot_name') || '')}" maxlength="25"
                    style="width:100%;padding:12px 16px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font-size:1rem;font-weight:700;outline:none;box-sizing:border-box;">
                </div>

                <!-- Checkbox de Pantalla Completa Automática -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;">
                  <label for="cb-ninja-auto-fullscreen-check" style="font-size:.85rem;color:#fff;font-weight:700;cursor:pointer;">
                    ⛶ Entrar a pantalla completa automáticamente
                  </label>
                  <input type="checkbox" id="cb-ninja-auto-fullscreen-check" checked style="width:18px;height:18px;accent-color:#ec4899;cursor:pointer;">
                </div>

                <!-- Tarjeta explicativa de controles táctiles mobile-first y corazón invertido -->
                <div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.25);border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:6px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.3rem;">📱</span>
                    <strong style="font-size:.85rem;color:#fff;">Controles Mobile-First:</strong>
                  </div>
                  <div style="font-size:.78rem;color:var(--text-dim);line-height:1.4;">
                    • Rota con los pulgares en los laterales. El ninja <span style="color:#38bdf8;font-weight:700;">corta automáticamente</span> proyectiles en su arco frontal.<br>
                    • 🌀 <strong>TORBELLINO 360°:</strong> Se carga al cortar proyectiles. Al llegar al 100%, pulsa el <span style="color:#ec4899;font-weight:700;">botón central iluminado</span> (o Espacio en PC) para arrasar la arena.<br>
                    • ❤️ <strong>CORAZÓN:</strong> ¡Mecánica invertida! Si lo cortas con la katana <span style="color:#ef4444;font-weight:700;">se rompe y falla</span>. ¡Debes apartar la espada y <span style="color:#10b981;font-weight:700;">dejar que te golpee en el cuerpo</span> para regenerar tu escudo!
                  </div>
                </div>

                <button onclick="window.ninjaLaunchGame()" class="cb-btn-nitro"
                  style="width:100%;font-size:1.15rem;padding:16px;background:linear-gradient(135deg,#06b6d4,#ec4899);border:none;">
                  ⚔️ ENTRAR AL DOHYŌ (-10 PTS)
                </button>
              </div>

              <!-- Contenedor del Gabinete 9:16 (Oculto al inicio) -->
              <div id="cb-canvas-wrapper" style="display:none;position:relative;">
                <div id="cb-game-cabinet" style="position:relative;width:100%;max-width:360px;margin:0 auto;aspect-ratio:9/16;background:#080814;border:2px solid rgba(236,72,153,0.3);border-radius:20px;overflow:hidden;box-shadow:0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(236,72,153,0.2);">
                  <canvas id="cb-canvas" style="width:100%;height:100%;display:block;"></canvas>

                  <!-- Barra de Controles Arcade (HUD interactivo HTML) -->
                  <div id="cb-hud-controls" style="position:absolute;bottom:12px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;pointer-events:auto;z-index:18;">
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button id="ninja-btn-record" title="Grabando Partida (MP4 con audio)" class="cb-hud-btn" style="background:rgba(220,38,38,0.3);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;font-weight:800;font-size:0.68rem;padding:5px 9px;border-radius:6px;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(0,0,0,0.5);">
                        <span class="cb-rec-pulse cb-blinking" style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block;box-shadow:0 0 6px #ef4444;margin-right:4px;"></span>
                        <span id="ninja-rec-text">REC</span>
                      </button>
                    </div>
                    <div style="display:flex;gap:5px;align-items:center;">
                      <button id="ninja-btn-music" onclick="window.ninjaToggleMusic()" title="Silenciar / Activar Música" class="cb-hud-btn" style="width:28px;height:28px;padding:0;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.5);">🎵</button>
                      <button id="ninja-btn-sfx" onclick="window.ninjaToggleSfx()" title="Silenciar / Activar Efectos" class="cb-hud-btn" style="width:28px;height:28px;padding:0;font-size:0.8rem;box-shadow:0 2px 8px rgba(0,0,0,0.5);">🔊</button>
                      <button id="ninja-btn-fs" onclick="window.ninjaToggleFullscreen()" title="Pantalla Completa" class="cb-hud-btn" style="width:28px;height:28px;padding:0;font-size:0.85rem;box-shadow:0 2px 8px rgba(0,0,0,0.5);">⛶</button>
                    </div>
                  </div>

                  <!-- Zonas táctiles de control (Ergonomía pulgar izquierdo/derecho en móvil) -->
                  <div id="ninja-touch-left"
                    onpointerdown="window.ninjaRotateLeft(true)"
                    onpointerup="window.ninjaRotateLeft(false)"
                    onpointerleave="window.ninjaRotateLeft(false)"
                    style="position:absolute;bottom:42px;left:0;width:38%;height:45%;z-index:15;display:flex;align-items:flex-end;padding:14px;box-sizing:border-box;user-select:none;touch-action:none;">
                    <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.08);border:1.5px solid rgba(6,182,212,0.5);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#06b6d4;box-shadow:0 0 12px rgba(6,182,212,0.3);">
                      ⟲
                    </div>
                  </div>

                  <!-- Botón Táctil de Torbellino 360° (Centrado, grande, ultra accesible con pulgares) -->
                  <div id="ninja-touch-burst"
                    onclick="window.ninjaTriggerBurst()"
                    style="position:absolute;bottom:46px;left:50%;transform:translateX(-50%);z-index:22;user-select:none;touch-action:manipulation;">
                    <button id="ninja-burst-btn" type="button" style="min-width:112px;height:46px;padding:0 14px;border-radius:23px;display:flex;align-items:center;justify-content:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:0.82rem;font-weight:900;letter-spacing:0.5px;cursor:pointer;outline:none;user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;background:rgba(15,23,42,0.88);border:1.5px solid rgba(6,182,212,0.45);color:rgba(255,255,255,0.7);box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:background 0.2s, border-color 0.2s, box-shadow 0.2s;">
                      <span id="ninja-burst-label">🌀 0%</span>
                    </button>
                  </div>

                  <div id="ninja-touch-right"
                    onpointerdown="window.ninjaRotateRight(true)"
                    onpointerup="window.ninjaRotateRight(false)"
                    onpointerleave="window.ninjaRotateRight(false)"
                    style="position:absolute;bottom:42px;right:0;width:38%;height:45%;z-index:15;display:flex;align-items:flex-end;justify-content:flex-end;padding:14px;box-sizing:border-box;user-select:none;touch-action:none;">
                    <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.08);border:1.5px solid rgba(6,182,212,0.5);display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:#06b6d4;box-shadow:0 0 12px rgba(6,182,212,0.3);">
                      ⟳
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Columna 2: Mini-Ranking de Pelea (Renta Pasiva) -->
            <div class="card glow flex flex-col gap-16" style="padding:20px;border-color:rgba(236,72,153,.3);">
              <div class="flex justify-between items-center" style="border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:12px;">
                <div>
                  <div class="text-xs uppercase font-bold" style="color:#ec4899;letter-spacing:1px;">Mini-Ranking Oficial</div>
                  <h3 class="text-lg font-extrabold m-0" style="color:#fff;">⚔️ Podio del Dohyō</h3>
                </div>
                <span class="badge" style="background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3);font-size:.7rem;">💧 Renta Pasiva</span>
              </div>
              <p class="text-xs m-0" style="color:var(--text-dim);line-height:1.4;">
                El <strong>Top 3</strong> cobra puntos pasivos todos los días. Para destronar al líder debes superar su récord de puntos y tiempo.
              </p>
              <div class="cb-ranking-list" id="cb-ninja-ranking-list">
                ${renderNinjaRankingRows()}
              </div>
              <div class="card" style="padding:12px;background:rgba(0,0,0,.4);border-color:rgba(255,255,255,.06);font-size:.78rem;line-height:1.5;color:var(--text-dim);">
                <strong style="color:var(--text);">¿Cómo reclamar tu trono?</strong><br>
                Al terminar el combate, descarga tu video MP4 y comparte la ficha oficial en el grupo de WhatsApp. Lunara procesará tu récord automáticamente.
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  };
})();
