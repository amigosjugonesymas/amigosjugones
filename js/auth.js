/**
 * AMIGOS JUGONES V2 — AUTH & ECONOMY MANAGER (AuthManager)
 * Gestión de sesión, persistencia de tokens, saldo de puntos y modo emulación dev.
 * Diseñado para desacoplar el frontend del backend de Google Sheets hasta su despliegue final.
 */

'use strict';

(function (window) {
  // ─── CONFIGURACIÓN ECONÓMICA DINÁMICA (Cero Hardcoding) ─────────────────
  window.CONFIG_ECONOMIA = window.CONFIG_ECONOMIA || {
    meta_temporada_puntos: 1000,
    arcade: {
      costo_ficha_entrada: 10,
      renta_pasiva_diaria: { "1": 3, "2": 2, "3": 1 },
      bono_semanal_podio: { "1": 5, "2": 4, "3": 3 }
    },
    ranking_principal: {
      bono_semanal_podio: { "1": 10, "2": 9, "3": 8 }
    },
    torneos_bga: {
      asistencia: 1,
      podio: { "1": 3, "2": 2, "3": 1 }
    },
    aportes_comunitarios: {
      puntos_por_juego_creado: 1
    }
  };

  // Carga asíncrona de config_economia.json
  try {
    fetch('config_economia.json')
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        if (cfg) {
          window.CONFIG_ECONOMIA = { ...window.CONFIG_ECONOMIA, ...cfg };
        }
      })
      .catch(() => {});
  } catch(e) {}

  // ─── CONFIGURACIÓN MAESTRA AUTH ──────────────────────────────────────────
  const AUTH_CONFIG = {
    // Desacoplado de Apps Script: ahora opera directamente con SQLite local / Turso
    WEBHOOK_URL: '', 
    STORAGE_KEY: 'aj_session_v1',
    get ENTRY_COST() {
      return (window.CONFIG_ECONOMIA && window.CONFIG_ECONOMIA.arcade && window.CONFIG_ECONOMIA.arcade.costo_ficha_entrada) || 10;
    },
    DEV_WEEKLY_KEY: 'AJ2026', // Contraseña oficial para el entorno de pruebas
    VERSION: '2.2.0',
    apiUrl: function (path) {
      if (window.AJ_CONFIG && typeof window.AJ_CONFIG.apiUrl === 'function') {
        return window.AJ_CONFIG.apiUrl(path);
      }
      return path;
    },
    getAdminToken: function () {
      return (window.AJ_CONFIG && window.AJ_CONFIG.ADMIN_TOKEN) || 'AJ_SECRET_ADMIN_TOKEN_2026_XYZ';
    }
  };

  // ─── CLASE AUTONOMICA AUTH MANAGER ───────────────────────────────────────
  class AuthManagerClass {
    constructor() {
      this.session = this.loadSession();
      this.listeners = {
        auth: [],
        points: []
      };
      this.initEvents();
    }

    // Carga de sesión desde localStorage
    loadSession() {
      try {
        const raw = localStorage.getItem(AUTH_CONFIG.STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.nick) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[AuthManager] Error leyendo almacenamiento local:', e);
      }
      return null;
    }

    // Guarda sesión en localStorage y notifica
    saveSession(data) {
      try {
        if (!data) {
          localStorage.removeItem(AUTH_CONFIG.STORAGE_KEY);
          this.session = null;
        } else {
          data.last_active = new Date().toISOString();
          localStorage.setItem(AUTH_CONFIG.STORAGE_KEY, JSON.stringify(data));
          this.session = data;
        }
        this.emitAuthChange();
      } catch (e) {
        console.error('[AuthManager] Error guardando sesión:', e);
      }
    }

    // ─── CONSULTAS DE ESTADO ───────────────────────────────────────────────
    isAuthenticated() {
      return Boolean(this.session && this.session.nick);
    }

    // ─── IDENTIFICADOR ÚNICO DE NAVEGADOR ─────────────────────────────────
    getDeviceId() {
      let devId = localStorage.getItem('aj_device_id');
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        localStorage.setItem('aj_device_id', devId);
      }
      return devId;
    }

    getUser() {
      return this.session ? { ...this.session } : null;
    }

    getToken() {
      return (this.session && (this.session.session_token || this.session.token)) || '';
    }

    getNick() {
      return this.session ? this.session.nick : 'Invitado';
    }

    getPoints() {
      return this.session ? (parseInt(this.session.puntos, 10) || 0) : 0;
    }

    hasEnoughPoints(amount = AUTH_CONFIG.ENTRY_COST) {
      return this.getPoints() >= amount;
    }

    // ─── GESTIÓN ECONÓMICA (-10 PTS / RECARGAS) ───────────────────────────
    debitPoints(amount = AUTH_CONFIG.ENTRY_COST, reason = 'arcade_entry') {
      if (!this.isAuthenticated()) {
        return {
          ok: false,
          error: 'no_session',
          message: 'Debes identificarte como miembro para ingresar a los juegos arcade.'
        };
      }

      const currentPoints = this.getPoints();
      if (currentPoints < amount) {
        return {
          ok: false,
          error: 'saldo_insuficiente',
          currentPoints,
          required: amount,
          message: `Saldo insuficiente (${currentPoints} PTS). Necesitas ${amount} PTS para una ficha de juego.`
        };
      }

      // Descuento local inmediato para latencia cero
      const updatedPoints = currentPoints - amount;
      this.session.puntos = updatedPoints;
      this.saveSession(this.session);
      this.emitPointsChange(updatedPoints, -amount, reason);

      // Sincronización atómica con base de datos SQLite / backend
      this.syncDebitWithBackend(amount, reason);

      return {
        ok: true,
        remaining: updatedPoints,
        debited: amount,
        message: `Ficha canjeada (-${amount} PTS). ¡Buena suerte, ${this.session.nick}!`
      };
    }

    addPoints(amount = 10, reason = 'recharge') {
      if (!this.isAuthenticated()) return;
      const updated = this.getPoints() + amount;
      this.session.puntos = updated;
      this.saveSession(this.session);
      this.emitPointsChange(updated, amount, reason);
      return updated;
    }

    // ─── MODO EMULACIÓN / DESARROLLO ──────────────────────────────────────
    loginDev(nick = 'Nico_Piloto', initialPoints = 100) {
      const devSession = {
        session_token: 'dev_token_' + Math.random().toString(36).substring(2, 9),
        nick: nick.trim() || 'Nico_Piloto',
        phone: '+56900000000',
        puntos: initialPoints,
        rol: 'member',
        is_dev: true,
        login_date: new Date().toLocaleDateString('es-ES')
      };
      this.saveSession(devSession);
      this.closeModal();
      return devSession;
    }

    logout() {
      this.saveSession(null);
    }

    // ─── CONEXIÓN BACKEND — LOGIN CON CONTROL DE DISPOSITIVOS ──────────────
    async loginWithCredentials(phone, nick, password) {
      if (!phone || !password) {
        return { ok: false, error: 'datos_incompletos', message: 'Ingresa tu teléfono y la clave.' };
      }

      const deviceId = this.getDeviceId();
      const loginUrl = (window.AJ_CONFIG && typeof window.AJ_CONFIG.apiUrl === 'function') 
        ? window.AJ_CONFIG.apiUrl('/api/auth/login') 
        : AUTH_CONFIG.apiUrl('/api/auth/login');

      try {
        const res = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: phone.trim(),
            nick: (nick || '').trim(),
            password: password.trim(),
            device_id: deviceId
          })
        });

        let data;
        try { data = await res.json(); } catch(e) { data = {}; }

        if (data.ok) {
          // Construir sesión desde la respuesta
          const sessionData = {
            session_token: 'sqlite_' + Date.now(),
            nick: data.session?.nick || (nick || '').trim(),
            telefono: phone.trim(),
            puntos: data.session?.puntos || 0,
            rol: data.session?.rol || 'miembro',
            tiene_clave_privada: data.tiene_clave_privada || false,
            is_dev: false
          };
          this.saveSession(sessionData);
          this.closeModal();

          // Mostrar banner de sugerencia si aplica
          if (data.sugerir_clave_privada) {
            setTimeout(() => this.mostrarBannerSeguridad(), 600);
          }

          return { ok: true, user: sessionData, sugerir_clave_privada: data.sugerir_clave_privada };
        }

        // Errores específicos de seguridad
        const errMap = {
          'clave_comunitaria_bloqueada': data.mensaje || '🔐 Tu cuenta está protegida con clave privada. Ingresa tu contraseña personal.',
          'limite_dispositivos_alcanzado': data.mensaje || '⚠️ Límite de 2 dispositivos con clave comunitaria. Contacta al administrador o crea una contraseña privada.',
          'usuario_no_encontrado': data.mensaje || 'Este número no está registrado en el grupo de WhatsApp.',
          'clave_invalida': data.mensaje || 'Contraseña incorrecta. Verifica la clave comunitaria del grupo.',
          'clave_incorrecta': data.mensaje || 'Contraseña privada incorrecta.'
        };
        const serverStatusMsg = (res && res.status >= 500) 
          ? '⏳ El servidor en la nube se está reiniciando/actualizando. Espera unos segundos y vuelve a intentar.' 
          : 'Error al iniciar sesión.';
        const userMsg = errMap[data.error] || data.mensaje || (data.error ? ('Error: ' + data.error) : serverStatusMsg);

        // Enriquecer error de límite de dispositivos con botón de WhatsApp
        if (data.error === 'limite_dispositivos_alcanzado') {
          return {
            ok: false,
            error: data.error,
            message: userMsg,
            whatsapp_admin: data.whatsapp_admin,
            sugerir_crear_privada: true
          };
        }

        return { ok: false, error: data.error, message: userMsg };

      } catch (err) {
        console.error('[AuthManager] Error de conexión:', err);
        // Fallback local para entorno sin servidor
        return {
          ok: false,
          error: 'network_error',
          message: '⚠️ No se pudo conectar al servidor local. Asegúrate de que server.py está corriendo en el puerto 8877.'
        };
      }
    }

    async syncDebitWithBackend(amount, reason) {
      if (!this.session) return;
      const nick = this.session.nick || '';

      // 1. Sincronización nativa con la base de datos local SQLite (server.py)
      try {
        const localApiUrl = `/api/debit_points?nick=${encodeURIComponent(nick)}&game=${encodeURIComponent(reason)}&amount=${amount}`;
        fetch(localApiUrl)
          .then(r => r.json())
          .then(data => {
            if (data && data.ok) {
              console.log('[SQLite DB] Saldo sincronizado exitosamente en SQLite:', data.remaining, 'PTS');
            }
          })
          .catch(() => {
            // Modo estático sin servidor Python API (tolera ejecución offline)
          });
      } catch (e) {}

      // 2. Si se llegase a configurar Webhook, sincronizar asíncronamente
      if (AUTH_CONFIG.WEBHOOK_URL) {
        try {
          const token = this.session.session_token || '';
          const url = `${AUTH_CONFIG.WEBHOOK_URL}?action=arcade_entry&session_token=${encodeURIComponent(token)}&game=${encodeURIComponent(reason)}&amount=${amount}`;
          fetch(url).catch(e => console.warn('[AuthManager] Error de sync asíncrona:', e));
        } catch (e) { /**/ }
      }
    }

    // ─── SEGURIDAD: BADGE FLOTANTE CENTRADO Y MODAL CONTRASEÑA PRIVADA ───
    mostrarBannerSeguridad() {
      if (document.getElementById('banner-sugerencia-seguridad')) return;
      if (sessionStorage.getItem('aj_dismiss_security_badge')) return;

      const banner = document.createElement('div');
      banner.id = 'banner-sugerencia-seguridad';
      banner.className = 'aj-security-badge-center';
      banner.innerHTML = `
        <style>
          @keyframes ajBadgeFloatIn {
            from { transform: translate(-50%, -24px) scale(0.92); opacity: 0; }
            to { transform: translate(-50%, 0) scale(1); opacity: 1; }
          }
          .aj-security-badge-center {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 99998;
            max-width: 620px;
            width: max-content;
            background: linear-gradient(135deg, rgba(24, 16, 52, 0.97) 0%, rgba(13, 11, 30, 0.97) 100%);
            border: 1.5px solid rgba(245, 158, 11, 0.65);
            border-radius: 50px;
            padding: 8px 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.65), 0 0 25px rgba(245, 158, 11, 0.22);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            animation: ajBadgeFloatIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @media (max-width: 768px) {
            .aj-security-badge-center {
              top: 66px !important;
              max-width: calc(100% - 24px) !important;
              width: calc(100% - 24px) !important;
              border-radius: 14px !important;
              padding: 10px 14px !important;
              flex-wrap: wrap !important;
              gap: 8px !important;
            }
            .aj-security-badge-center .aj-badge-text {
              font-size: 0.74rem !important;
              line-height: 1.35 !important;
            }
            .aj-security-badge-center .aj-badge-actions {
              width: 100% !important;
              display: flex !important;
              justify-content: flex-end !important;
              gap: 8px !important;
            }
          }
        </style>
        <span style="font-size: 1.3rem; filter: drop-shadow(0 0 8px rgba(245,158,11,0.5));">🛡️</span>
        <div class="aj-badge-text" style="font-size: 0.78rem; color: #f1f5f9; line-height: 1.35;">
          <strong style="color: #f59e0b;">¿Cambiar contraseña?</strong>
          Estás con la clave comunitaria.
          <span style="color: #c084fc; font-weight: 700;">¡Crea tu contraseña privada!</span>
        </div>
        <div class="aj-badge-actions" style="display: flex; align-items: center; gap: 8px;">
          <button onclick="AuthManager.abrirModalCrearPassword()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-weight: 800; border: none; border-radius: 20px; padding: 6px 14px; font-size: 0.75rem; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4); transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🔒 Blindar Cuenta
          </button>
          <button onclick="sessionStorage.setItem('aj_dismiss_security_badge', '1'); document.getElementById('banner-sugerencia-seguridad').remove();" title="Cerrar sugerencia" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 2px 6px; line-height: 1; transition: color 0.15s ease;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#94a3b8'">
            ✕
          </button>
        </div>
      `;
      document.body.appendChild(banner);
    }

    abrirModalCrearPassword() {
      // Cerrar banner si existe
      const banner = document.getElementById('banner-sugerencia-seguridad');
      if (banner) banner.remove();

      let modal = document.getElementById('aj-pwd-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'aj-pwd-modal';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(4,4,14,0.9); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(12px); padding:16px;';
        document.body.appendChild(modal);
      }

      const user = this.getUser();
      const telefono = user ? (user.telefono || user.phone || '') : '';

      modal.innerHTML = `
        <div style="width:100%; max-width:400px; background:linear-gradient(145deg,#111128,#0d0d1e); border:1px solid rgba(168,85,247,0.5); border-radius:16px; padding:28px; box-shadow:0 10px 40px rgba(0,0,0,0.7), 0 0 30px rgba(124,58,237,0.25); position:relative;">
          <button onclick="document.getElementById('aj-pwd-modal').remove()" style="position:absolute;top:14px;right:14px;background:none;border:none;color:#64748b;font-size:1.2rem;cursor:pointer;">✕</button>
          <div style="text-align:center; margin-bottom:20px;">
            <div style="font-size:2.2rem; margin-bottom:6px;">🔒</div>
            <h2 style="font-size:1.2rem; color:#fff; font-weight:800; margin:0 0 4px;">Blindar mi Cuenta</h2>
            <p style="font-size:0.72rem; color:#94a3b8; margin:0;">Crea tu contraseña personal y secreta</p>
          </div>
          <div style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:8px; padding:10px 12px; margin-bottom:18px; font-size:0.73rem; color:#fbbf24; line-height:1.5;">
            ⚠️ <strong>Importante:</strong> Una vez creada tu contraseña privada, la clave comunitaria del grupo <strong>no podrá usarse</strong> para acceder a tu cuenta.
          </div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="font-size:0.73rem; color:#94a3b8; font-weight:600; display:block; margin-bottom:4px;">🔑 Nueva Contraseña (mín. 6 caracteres)</label>
              <input type="password" id="aj-pwd-nueva" placeholder="Tu contraseña secreta" style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid #334155; border-radius:8px; color:#fff; font-size:0.85rem; outline:none; box-sizing:border-box;" oninput="AuthManager._actualizarFuerzaPwd(this.value)" />
              <div id="aj-pwd-fuerza" style="margin-top:5px; height:4px; border-radius:2px; background:#1e293b; transition:all 0.3s;"></div>
              <div id="aj-pwd-fuerza-label" style="font-size:0.68rem; color:#64748b; margin-top:3px;"></div>
            </div>
            <div>
              <label style="font-size:0.73rem; color:#94a3b8; font-weight:600; display:block; margin-bottom:4px;">✅ Confirmar Contraseña</label>
              <input type="password" id="aj-pwd-confirmar" placeholder="Repite tu contraseña" style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid #334155; border-radius:8px; color:#fff; font-size:0.85rem; outline:none; box-sizing:border-box;" />
            </div>
            <div id="aj-pwd-error" style="display:none; font-size:0.73rem; color:#f87171; background:rgba(239,68,68,0.1); padding:8px 10px; border-radius:6px; border:1px solid rgba(239,68,68,0.3);"></div>
            <div id="aj-pwd-ok" style="display:none; font-size:0.73rem; color:#4ade80; background:rgba(74,222,128,0.1); padding:8px 10px; border-radius:6px; border:1px solid rgba(74,222,128,0.3);"></div>
            <button id="aj-pwd-submit" onclick="AuthManager._guardarPasswordPrivada('${telefono}')" style="width:100%; padding:12px; background:linear-gradient(135deg,#7c3aed,#ec4899); color:#fff; font-weight:800; border:none; border-radius:8px; font-size:0.88rem; cursor:pointer; letter-spacing:0.4px;">💾 Guardar y Blindar Cuenta</button>
          </div>
        </div>
      `;
      modal.style.display = 'flex';

      // Focus automático
      setTimeout(() => {
        const inp = document.getElementById('aj-pwd-nueva');
        if (inp) inp.focus();
      }, 100);
    }

    _actualizarFuerzaPwd(pwd) {
      const bar = document.getElementById('aj-pwd-fuerza');
      const label = document.getElementById('aj-pwd-fuerza-label');
      if (!bar || !label) return;
      let fuerza = 0;
      if (pwd.length >= 6) fuerza++;
      if (pwd.length >= 10) fuerza++;
      if (/[A-Z]/.test(pwd)) fuerza++;
      if (/[0-9]/.test(pwd)) fuerza++;
      if (/[^a-zA-Z0-9]/.test(pwd)) fuerza++;
      const niveles = [
        { color: '#ef4444', text: 'Muy débil', w: '20%' },
        { color: '#f97316', text: 'Débil', w: '40%' },
        { color: '#eab308', text: 'Media', w: '60%' },
        { color: '#84cc16', text: 'Fuerte', w: '80%' },
        { color: '#22c55e', text: '¡Excelente!', w: '100%' }
      ];
      const idx = Math.max(0, Math.min(fuerza - 1, 4));
      if (pwd.length === 0) { bar.style.width = '0'; label.textContent = ''; return; }
      bar.style.background = niveles[idx].color;
      bar.style.width = niveles[idx].w;
      label.style.color = niveles[idx].color;
      label.textContent = niveles[idx].text;
    }

    async _guardarPasswordPrivada(telefono) {
      const nuevaInp = document.getElementById('aj-pwd-nueva');
      const confInp = document.getElementById('aj-pwd-confirmar');
      const errDiv = document.getElementById('aj-pwd-error');
      const okDiv = document.getElementById('aj-pwd-ok');
      const btn = document.getElementById('aj-pwd-submit');

      const nueva = nuevaInp ? nuevaInp.value.trim() : '';
      const conf = confInp ? confInp.value.trim() : '';

      if (errDiv) errDiv.style.display = 'none';
      if (okDiv) okDiv.style.display = 'none';

      if (!nueva || nueva.length < 6) {
        if (errDiv) { errDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errDiv.style.display = 'block'; }
        return;
      }
      if (nueva !== conf) {
        if (errDiv) { errDiv.textContent = 'Las contraseñas no coinciden. Vuelve a intentarlo.'; errDiv.style.display = 'block'; }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Guardando... ⏳'; }

      try {
        const phone = telefono || (this.session && (this.session.telefono || this.session.phone)) || '';
        const res = await fetch('/api/auth/crear_password_privada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password: nueva })
        });
        const data = await res.json();

        if (data.ok) {
          // Actualizar sesión local
          if (this.session) {
            this.session.tiene_clave_privada = true;
            this.saveSession(this.session);
          }
          if (okDiv) { okDiv.textContent = data.mensaje || '✅ ¡Cuenta blindada con éxito! Desde ahora solo tu contraseña privada puede dar acceso.'; okDiv.style.display = 'block'; }
          if (btn) { btn.textContent = '✅ Blindada'; }
          setTimeout(() => {
            const m = document.getElementById('aj-pwd-modal');
            if (m) m.remove();
          }, 2500);
        } else {
          if (errDiv) { errDiv.textContent = data.mensaje || 'Error al guardar la contraseña. Inténtalo de nuevo.'; errDiv.style.display = 'block'; }
          if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar y Blindar Cuenta'; }
        }
      } catch(e) {
        if (errDiv) { errDiv.textContent = 'Error de conexión con el servidor.'; errDiv.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar y Blindar Cuenta'; }
      }
    }

    // ─── HUB NATIVO: MÓDULO DE CUMPLEAÑOS (PASO 3) ─────────────────────────
    abrirModalCumpleanos() {
      const isAuth = this.isAuthenticated();
      if (!isAuth) {
        this.showModal({ reason: 'Identifícate con tu WhatsApp de miembro para registrar o editar tu fecha de cumpleaños.' });
        return;
      }

      this.closeModal();

      let modal = document.getElementById('aj-cumple-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'aj-cumple-modal';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(4,4,14,0.92); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); padding:16px; box-sizing:border-box;';
        document.body.appendChild(modal);
      }

      const nick = this.getNick();
      const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];

      modal.innerHTML = `
        <div class="card glow" style="width:100%; max-width:420px; background:linear-gradient(145deg, #13112a 0%, #0c0a1a 100%); border:1px solid rgba(236,72,153,0.45); border-radius:18px; padding:24px 20px; box-shadow:0 12px 45px rgba(0,0,0,0.8), 0 0 30px rgba(236,72,153,0.25); position:relative; box-sizing:border-box;">
          <button onclick="document.getElementById('aj-cumple-modal').remove(); AuthManager.showModal();" style="position:absolute; top:14px; right:14px; background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:4px; line-height:1;" title="Cerrar">✕</button>
          
          <div style="text-align:center; margin-bottom:18px;">
            <div style="font-size:2.5rem; margin-bottom:4px; filter: drop-shadow(0 0 14px rgba(236,72,153,0.55));">🎂</div>
            <h2 style="font-size:1.28rem; color:#fff; font-weight:800; margin:0 0 4px; letter-spacing:-0.3px;">Mi Cumpleaños Jugón</h2>
            <div style="font-size:0.7rem; color:var(--accent-light); font-weight:700; text-transform:uppercase; letter-spacing:1px;">Hub Nativo de Miembro</div>
          </div>

          <div style="background:rgba(236,72,153,0.08); border:1px solid rgba(236,72,153,0.22); border-radius:10px; padding:10px 12px; margin-bottom:18px; font-size:0.75rem; color:#f1f5f9; line-height:1.45;">
            👋 <strong>¡Hola, ${nick}!</strong> Elige tu día y mes. Al estar autenticado <strong>no te pediremos correo, teléfono ni año de nacimiento</strong>.
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <!-- Selectores Día y Mes -->
            <div style="display:flex; gap:10px;">
              <div style="flex:1;">
                <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:5px;">📅 Día</label>
                <select id="aj-cumple-dia" style="width:100%; height:48px; padding:0 10px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:1rem; font-weight:700; outline:none; box-sizing:border-box; cursor:pointer;">
                  ${Array.from({length: 31}, (_, i) => `<option value="${i+1}">${i+1}</option>`).join('')}
                </select>
              </div>
              <div style="flex:1.5;">
                <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:5px;">🗓️ Mes</label>
                <select id="aj-cumple-mes" style="width:100%; height:48px; padding:0 10px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:1rem; font-weight:700; outline:none; box-sizing:border-box; cursor:pointer;">
                  ${meses.map((m, i) => `<option value="${i+1}">${m}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Preferencia de saludo -->
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; display:flex; align-items:flex-start; gap:10px; cursor:pointer;" onclick="const chk=document.getElementById('aj-cumple-publico'); if(chk) chk.checked=!chk.checked;">
              <input type="checkbox" id="aj-cumple-publico" checked style="width:18px; height:18px; margin-top:2px; accent-color:#ec4899; cursor:pointer;" onclick="event.stopPropagation();" />
              <div style="flex:1;">
                <div style="font-size:0.8rem; font-weight:800; color:#fff;">📢 Saludo público en WhatsApp</div>
                <div style="font-size:0.7rem; color:#94a3b8; margin-top:2px; line-height:1.35;">
                  Aparecerás en la lista comunitaria y te felicitaremos en el grupo. Si lo desactivas, solo el Admin tendrá registro.
                </div>
              </div>
            </div>

            <!-- Feedback -->
            <div id="aj-cumple-error" style="display:none; font-size:0.75rem; color:#f87171; background:rgba(239,68,68,0.12); padding:9px 12px; border-radius:8px; border:1px solid rgba(239,68,68,0.3);"></div>
            <div id="aj-cumple-ok" style="display:none; font-size:0.75rem; color:#4ade80; background:rgba(74,222,128,0.12); padding:9px 12px; border-radius:8px; border:1px solid rgba(74,222,128,0.3);"></div>

            <!-- Botones -->
            <button id="aj-cumple-btn-guardar" onclick="AuthManager._guardarCumpleanos('${nick}')" style="width:100%; min-height:48px; background:linear-gradient(135deg, #ec4899 0%, #7c3aed 100%); color:#fff; font-weight:800; border:none; border-radius:10px; font-size:0.92rem; cursor:pointer; letter-spacing:0.3px; box-shadow:0 4px 16px rgba(236,72,153,0.35); transition:transform 0.15s ease;">
              💾 Guardar mi Cumpleaños
            </button>

            <button id="aj-cumple-btn-borrar" onclick="AuthManager._borrarCumpleanos('${nick}')" style="display:none; width:100%; padding:10px; background:transparent; border:1px solid rgba(239,68,68,0.35); color:#f87171; font-weight:700; border-radius:10px; font-size:0.78rem; cursor:pointer; transition:all 0.15s ease;">
              🗑️ Eliminar mi fecha de cumpleaños
            </button>
          </div>
        </div>
      `;
      modal.style.display = 'flex';

      // Cargar valores actuales
      this._precargarModalCumpleanos(nick);
    }

    async _cargarCumpleanosEnPerfil(nick) {
      const el = document.getElementById('aj-perfil-cumple-txt');
      if (!el) return;
      try {
        const cache = localStorage.getItem('aj_cumple_' + nick);
        if (cache) {
          const d = JSON.parse(cache);
          if (d && d.dia && (d.mes_nombre || d.mes)) {
            const mNom = d.mes_nombre || ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][d.mes - 1];
            el.innerHTML = `<span style="color:#f472b6;">🎂 ${d.dia} de ${mNom}</span> <span style="font-size:0.7rem; color:${d.saludo_publico ? '#4ade80' : '#fbbf24'};">(${d.saludo_publico ? 'Público 📢' : 'Privado 🔒'})</span>`;
          }
        }
        const res = await fetch(`/api/cumpleanos/mio?nick=${encodeURIComponent(nick)}`);
        const data = await res.json();
        if (data && data.registrado) {
          localStorage.setItem('aj_cumple_' + nick, JSON.stringify(data));
          el.innerHTML = `<span style="color:#f472b6;">🎂 ${data.dia} de ${data.mes_nombre}</span> <span style="font-size:0.7rem; color:${data.saludo_publico ? '#4ade80' : '#fbbf24'};">(${data.saludo_publico ? 'Público 📢' : 'Privado 🔒'})</span>`;
        } else if (!cache) {
          el.innerHTML = `<span style="color:#94a3b8; font-weight:600;">Sin configurar aún</span>`;
        }
      } catch (e) {
        if (!el.textContent || el.textContent === 'Consultando...') {
          el.innerHTML = `<span style="color:#94a3b8; font-weight:600;">Toca para configurar</span>`;
        }
      }
    }

    async _cargarMisionEnPerfil(nick) {
      const el = document.getElementById('aj-perfil-mision-txt');
      if (!el) return;
      const fechaHoy = new Date().toISOString().slice(0, 10);
      try {
        const res = await fetch(`/api/misiones/estado?nick=${encodeURIComponent(nick)}&fecha=${fechaHoy}&tipo=grupal`);
        const data = await res.json();
        if (data && data.entrega) {
          if (data.entrega.estado === 'aprobado') {
            el.innerHTML = `<span style="color:#34d399; font-weight:800;">✅ ¡Aprobada! (+${data.entrega.puntos_otorgados} PTS)</span>`;
          } else if (data.entrega.estado === 'pendiente') {
            el.innerHTML = `<span style="color:#fbbf24; font-weight:800;">⏳ En revisión del Admin</span>`;
          } else {
            el.innerHTML = `<span style="color:#f87171; font-weight:700;">Rechazada (Toca para reenviar)</span>`;
          }
        } else {
          el.innerHTML = `<span style="color:#38bdf8; font-weight:700;">Disponible (7 retos)</span>`;
        }
      } catch (e) {
        el.innerHTML = `<span style="color:#94a3b8;">Toca para enviar</span>`;
      }
    }

    async _precargarModalCumpleanos(nick) {
      const diaSel = document.getElementById('aj-cumple-dia');
      const mesSel = document.getElementById('aj-cumple-mes');
      const pubChk = document.getElementById('aj-cumple-publico');
      const btnBorrar = document.getElementById('aj-cumple-btn-borrar');

      const cache = localStorage.getItem('aj_cumple_' + nick);
      if (cache) {
        try {
          const d = JSON.parse(cache);
          if (d.dia && diaSel) diaSel.value = d.dia;
          if (d.mes && mesSel) mesSel.value = d.mes;
          if (typeof d.saludo_publico === 'boolean' && pubChk) pubChk.checked = d.saludo_publico;
          if (btnBorrar) btnBorrar.style.display = 'block';
        } catch (e) {}
      }

      try {
        const res = await fetch(`/api/cumpleanos/mio?nick=${encodeURIComponent(nick)}`);
        const data = await res.json();
        if (data && data.registrado) {
          if (diaSel) diaSel.value = data.dia;
          if (mesSel) mesSel.value = data.mes;
          if (pubChk) pubChk.checked = Boolean(data.saludo_publico);
          if (btnBorrar) btnBorrar.style.display = 'block';
          localStorage.setItem('aj_cumple_' + nick, JSON.stringify(data));
        }
      } catch (e) {
        console.warn('[Cumpleaños] Modo offline:', e);
      }
    }

    async _guardarCumpleanos(nick) {
      const diaSel = document.getElementById('aj-cumple-dia');
      const mesSel = document.getElementById('aj-cumple-mes');
      const pubChk = document.getElementById('aj-cumple-publico');
      const btn = document.getElementById('aj-cumple-btn-guardar');
      const errDiv = document.getElementById('aj-cumple-error');
      const okDiv = document.getElementById('aj-cumple-ok');

      if (errDiv) errDiv.style.display = 'none';
      if (okDiv) okDiv.style.display = 'none';

      const dia = parseInt(diaSel.value, 10);
      const mes = parseInt(mesSel.value, 10);
      const saludo_publico = Boolean(pubChk && pubChk.checked);

      if (!dia || !mes) {
        if (errDiv) { errDiv.textContent = 'Selecciona un día y mes válidos.'; errDiv.style.display = 'block'; }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Guardando... ⏳'; }

      const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const payload = { nick, dia, mes, mes_nombre: meses[mes - 1], saludo_publico, registrado: true };

      try {
        const res = await fetch('/api/cumpleanos/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data && data.ok) {
          localStorage.setItem('aj_cumple_' + nick, JSON.stringify(data));
          if (okDiv) { okDiv.textContent = '✅ ' + (data.mensaje || '¡Cumpleaños guardado con éxito!'); okDiv.style.display = 'block'; }
          if (btn) btn.textContent = '✅ Guardado';
          setTimeout(() => {
            const m = document.getElementById('aj-cumple-modal');
            if (m) m.remove();
            this.showModal();
          }, 1300);
        } else {
          localStorage.setItem('aj_cumple_' + nick, JSON.stringify(payload));
          if (okDiv) { okDiv.textContent = '✅ Guardado localmente en tu dispositivo.'; okDiv.style.display = 'block'; }
          setTimeout(() => {
            const m = document.getElementById('aj-cumple-modal');
            if (m) m.remove();
            this.showModal();
          }, 1300);
        }
      } catch (err) {
        localStorage.setItem('aj_cumple_' + nick, JSON.stringify(payload));
        if (okDiv) { okDiv.textContent = '✅ Guardado en tu dispositivo (Modo Offline).'; okDiv.style.display = 'block'; }
        setTimeout(() => {
          const m = document.getElementById('aj-cumple-modal');
          if (m) m.remove();
          this.showModal();
        }, 1300);
      }
    }

    async _borrarCumpleanos(nick) {
      if (!confirm('¿Estás seguro de que deseas eliminar tu fecha de cumpleaños?')) return;
      const btn = document.getElementById('aj-cumple-btn-borrar');
      const okDiv = document.getElementById('aj-cumple-ok');
      if (btn) { btn.disabled = true; btn.textContent = 'Eliminando... ⏳'; }

      try {
        await fetch('/api/cumpleanos/borrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nick })
        });
      } catch (e) {}

      localStorage.removeItem('aj_cumple_' + nick);
      if (okDiv) { okDiv.textContent = '🗑️ Fecha de cumpleaños eliminada.'; okDiv.style.display = 'block'; }
      setTimeout(() => {
        const m = document.getElementById('aj-cumple-modal');
        if (m) m.remove();
        this.showModal();
      }, 900);
    }

    // ─── HUB NATIVO: MÓDULO DE MERCADO JUGÓN (PASO 7) ──────────────────────
    abrirModalMercado() {
      const isAuth = this.isAuthenticated();
      if (!isAuth) {
        this.showModal({ reason: 'Identifícate con tu WhatsApp de miembro para publicar en el Mercado Jugón.' });
        return;
      }

      this.closeModal();

      let modal = document.getElementById('aj-mercado-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'aj-mercado-modal';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(4,4,14,0.92); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); padding:16px; box-sizing:border-box; overflow-y:auto;';
        document.body.appendChild(modal);
      }

      const nick = this.getNick();
      const user = this.getUser() || {};
      const igPre = user.instagram || '';

      modal.innerHTML = `
        <div class="card glow custom-scrollbar" style="width:100%; max-width:460px; max-height:90vh; overflow-y:auto; background:linear-gradient(145deg, #13112a 0%, #0c0a1a 100%); border:1px solid rgba(168,85,247,0.45); border-radius:18px; padding:24px 20px; box-shadow:0 12px 45px rgba(0,0,0,0.8), 0 0 30px rgba(124,58,237,0.25); position:relative; box-sizing:border-box;">
          <button onclick="document.getElementById('aj-mercado-modal').remove()" style="position:absolute; top:14px; right:14px; background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:4px; line-height:1;" title="Cerrar">✕</button>
          
          <div style="text-align:center; margin-bottom:16px;">
            <div style="font-size:2.4rem; margin-bottom:4px; filter: drop-shadow(0 0 14px rgba(168,85,247,0.5));">🛍️</div>
            <h2 style="font-size:1.25rem; color:#fff; font-weight:800; margin:0 0 4px; letter-spacing:-0.3px;">Publicar en el Mercado Jugón</h2>
            <div style="font-size:0.7rem; color:var(--accent-light); font-weight:700; text-transform:uppercase; letter-spacing:1px;">Hub Nativo de Miembro</div>
          </div>

          <div style="background:rgba(124,58,237,0.08); border:1px solid rgba(168,85,247,0.25); border-radius:10px; padding:10px 12px; margin-bottom:16px; font-size:0.75rem; color:#f1f5f9; line-height:1.45;">
            ⏳ <strong>Vigencia automática de 7 días:</strong> Tu anuncio se publicará en toda la web con tu autoría oficial <strong>(${nick})</strong>. Podrás marcarlo como vendido cuando se concrete.
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">🏷️ Categoría</label>
                <select id="aj-merc-cat" style="width:100%; height:44px; padding:0 10px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:0.9rem; font-weight:700; outline:none; box-sizing:border-box;">
                  <option value="Vender">🛒 Vender</option>
                  <option value="Intercambiar">🔄 Intercambiar</option>
                  <option value="Regalar">🎁 Regalar</option>
                  <option value="Buscar">🔍 Buscar</option>
                  <option value="Enseñar">🎓 Enseñar</option>
                  <option value="Servicios">🛠️ Servicios</option>
                </select>
              </div>

              <div style="flex:1; min-width:140px;">
                <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">✨ Estado</label>
                <select id="aj-merc-estado" style="width:100%; height:44px; padding:0 10px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:0.9rem; font-weight:700; outline:none; box-sizing:border-box;">
                  <option value="Nuevo y Sellado">Nuevo y Sellado</option>
                  <option value="Excelente Estado" selected>Excelente Estado</option>
                  <option value="Usado Bueno">Usado Bueno</option>
                  <option value="Incompleto / Desgaste">Incompleto / Desgaste</option>
                  <option value="No aplica">No aplica</option>
                </select>
              </div>
            </div>

            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">🎲 Título del Artículo o Servicio *</label>
              <input type="text" id="aj-merc-titulo" placeholder="Ej: Catan Edición 25 Aniversario" maxlength="80" style="width:100%; height:44px; padding:0 12px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:0.9rem; outline:none; box-sizing:border-box;" />
            </div>

            <div style="display:flex; gap:10px;">
              <div style="flex:1.2;">
                <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">💰 Precio CLP (0 = gratis/trueque)</label>
                <input type="text" id="aj-merc-precio" placeholder="Ej: 25000" style="width:100%; height:44px; padding:0 12px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#f59e0b; font-weight:800; font-family:'JetBrains Mono',monospace; font-size:0.95rem; outline:none; box-sizing:border-box;" />
              </div>
              <div style="flex:0.8;">
                <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">📦 Disponibles</label>
                <input type="number" id="aj-merc-disp" value="1" min="0" style="width:100%; height:44px; padding:0 12px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:0.9rem; outline:none; box-sizing:border-box;" />
              </div>
            </div>

            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">📸 Usuario Instagram / Contacto Público</label>
              <input type="text" id="aj-merc-ig" value="${escapeHtml(igPre)}" placeholder="Ej: tu_instagram (sin @)" style="width:100%; height:44px; padding:0 12px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:0.88rem; outline:none; box-sizing:border-box;" />
            </div>

            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">🖼️ URL de Foto (opcional)</label>
              <input type="url" id="aj-merc-foto" placeholder="https://... (enlace a foto o portada)" style="width:100%; height:44px; padding:0 12px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:0.85rem; outline:none; box-sizing:border-box;" />
            </div>

            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">📝 Descripción / Detalles</label>
              <textarea id="aj-merc-desc" rows="3" placeholder="Idioma, cartas enfundadas, lugar de entrega en Santiago o envíos..." style="width:100%; padding:10px 12px; background:#181530; border:1px solid #3b3563; border-radius:10px; color:#fff; font-size:0.85rem; outline:none; box-sizing:border-box; resize:vertical;"></textarea>
            </div>

            <div id="aj-merc-error" style="display:none; font-size:0.75rem; color:#f87171; background:rgba(239,68,68,0.12); padding:9px 12px; border-radius:8px; border:1px solid rgba(239,68,68,0.3);"></div>
            <div id="aj-merc-ok" style="display:none; font-size:0.75rem; color:#4ade80; background:rgba(74,222,128,0.12); padding:9px 12px; border-radius:8px; border:1px solid rgba(74,222,128,0.3);"></div>

            <button id="aj-merc-btn-submit" onclick="AuthManager._guardarMercado('${nick}')" style="width:100%; min-height:48px; background:linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color:#fff; font-weight:800; border:none; border-radius:10px; font-size:0.92rem; cursor:pointer; letter-spacing:0.3px; box-shadow:0 4px 16px rgba(124,58,237,0.35); transition:transform 0.15s ease;">
              💾 Publicar en el Mercado Jugón
            </button>
          </div>
        </div>
      `;
      modal.style.display = 'flex';
    }

    async _guardarMercado(nick) {
      const cat = document.getElementById('aj-merc-cat').value;
      const estado = document.getElementById('aj-merc-estado').value;
      const titulo = document.getElementById('aj-merc-titulo').value.trim();
      const precio = document.getElementById('aj-merc-precio').value.trim();
      const disp = document.getElementById('aj-merc-disp').value;
      const ig = document.getElementById('aj-merc-ig').value.trim();
      const foto = document.getElementById('aj-merc-foto').value.trim();
      const desc = document.getElementById('aj-merc-desc').value.trim();

      const btn = document.getElementById('aj-merc-btn-submit');
      const errDiv = document.getElementById('aj-merc-error');
      const okDiv = document.getElementById('aj-merc-ok');

      if (errDiv) errDiv.style.display = 'none';
      if (okDiv) okDiv.style.display = 'none';

      if (!titulo) {
        if (errDiv) { errDiv.textContent = 'Por favor ingresa un título para el anuncio.'; errDiv.style.display = 'block'; }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Publicando... ⏳'; }

      const payload = {
        nick,
        categoria: cat,
        titulo,
        estado,
        descripcion: desc,
        foto_url: foto,
        precio_clp: precio,
        disponibles: disp,
        contacto_instagram: ig
      };

      try {
        const res = await fetch('/api/mercado/publicar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data && data.ok) {
          if (okDiv) { okDiv.textContent = '✅ ¡Anuncio publicado exitosamente por 7 días!'; okDiv.style.display = 'block'; }
          if (btn) btn.textContent = '✅ Publicado';
          setTimeout(() => {
            const m = document.getElementById('aj-mercado-modal');
            if (m) m.remove();
            if (typeof renderSection === 'function') {
              renderSection('mercado');
            }
          }, 1400);
        } else {
          if (errDiv) { errDiv.textContent = data.error || 'Error al publicar el anuncio.'; errDiv.style.display = 'block'; }
          if (btn) { btn.disabled = false; btn.textContent = '💾 Publicar en el Mercado Jugón'; }
        }
      } catch (e) {
        if (errDiv) { errDiv.textContent = 'Error de conexión con el servidor.'; errDiv.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = '💾 Publicar en el Mercado Jugón'; }
      }
    }

    // ─── HUB NATIVO: MÓDULO DE RADAR JUGÓN (PASO 10) ───────────────────────
    abrirModalRadar() {
      const isAuth = this.isAuthenticated();
      if (!isAuth) {
        this.showModal({ reason: 'Identifícate con tu WhatsApp de miembro para configurar tu ficha en el Radar Jugón.' });
        return;
      }

      this.closeModal();

      let modal = document.getElementById('aj-radar-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'aj-radar-modal';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(4,4,14,0.92); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); padding:16px; box-sizing:border-box; overflow-y:auto;';
        document.body.appendChild(modal);
      }

      const nick = this.getNick();

      const diasSemana = [
        { key: 'LUNES', short: 'LUN', emoji: '🌙', label: 'Lunes' },
        { key: 'MARTES', short: 'MAR', emoji: '🔥', label: 'Martes' },
        { key: 'MIERCOLES', short: 'MIE', emoji: '⚡', label: 'Miércoles' },
        { key: 'JUEVES', short: 'JUE', emoji: '🎯', label: 'Jueves' },
        { key: 'VIERNES', short: 'VIE', emoji: '🎮', label: 'Viernes' },
        { key: 'SABADO', short: 'SAB', emoji: '🏆', label: 'Sábado' },
        { key: 'DOMINGO', short: 'DOM', emoji: '☀️', label: 'Domingo' }
      ];

      const estilosList = [
        'Eurogames', 'Ameritrash', 'Fillers', 'Party Games',
        'Cooperativos', 'Rol (RPG)', 'Deckbuilders', 'Wargames',
        'Deducción Social', 'Prototipos'
      ];

      modal.innerHTML = `
        <div class="card glow custom-scrollbar" style="width:100%; max-width:490px; max-height:92vh; overflow-y:auto; background:linear-gradient(145deg, #0e1726 0%, #070c16 100%); border:1px solid rgba(14,165,233,0.45); border-radius:18px; padding:24px 20px; box-shadow:0 12px 45px rgba(0,0,0,0.8), 0 0 30px rgba(14,165,233,0.22); position:relative; box-sizing:border-box;">
          <button onclick="document.getElementById('aj-radar-modal').remove()" style="position:absolute; top:14px; right:14px; background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:4px; line-height:1;" title="Cerrar">✕</button>
          
          <div style="text-align:center; margin-bottom:16px;">
            <div style="font-size:2.5rem; margin-bottom:4px; filter: drop-shadow(0 0 14px rgba(14,165,233,0.55));">📡</div>
            <h2 style="font-size:1.28rem; color:#fff; font-weight:800; margin:0 0 4px; letter-spacing:-0.3px;">Mi Ficha de Radar Jugón</h2>
            <div style="font-size:0.7rem; color:#38bdf8; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Hub Nativo de Miembro</div>
          </div>

          <div style="background:rgba(14,165,233,0.08); border:1px solid rgba(14,165,233,0.25); border-radius:10px; padding:10px 12px; margin-bottom:16px; font-size:0.75rem; color:#f1f5f9; line-height:1.45;">
            👋 <strong>¡Hola, ${nick}!</strong> Elige qué días sueles estar disponible para jugar. La comunidad verá tus días activos en el Radar para coordinar partidas sin formularios externos.
          </div>

          <div style="display:flex; flex-direction:column; gap:14px;">
            <!-- Días de Disponibilidad -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <label style="font-size:0.76rem; color:#cbd5e1; font-weight:700;">📅 Días que puedes jugar (toca para activar):</label>
                <div style="display:flex; gap:6px;">
                  <button type="button" onclick="AuthManager._toggleTodosDiasRadar(true)" style="background:rgba(255,255,255,0.06); border:1px solid #334155; color:#94a3b8; font-size:0.65rem; padding:2px 6px; border-radius:5px; cursor:pointer;">Todos</button>
                  <button type="button" onclick="AuthManager._toggleFindeRadar()" style="background:rgba(255,255,255,0.06); border:1px solid #334155; color:#94a3b8; font-size:0.65rem; padding:2px 6px; border-radius:5px; cursor:pointer;">Finde</button>
                  <button type="button" onclick="AuthManager._toggleTodosDiasRadar(false)" style="background:rgba(255,255,255,0.06); border:1px solid #334155; color:#94a3b8; font-size:0.65rem; padding:2px 6px; border-radius:5px; cursor:pointer;">Limpiar</button>
                </div>
              </div>
              <div id="aj-radar-dias-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(56px, 1fr)); gap:6px;">
                ${diasSemana.map(d => `
                  <button type="button" class="aj-radar-day-btn" data-day="${d.key}" onclick="AuthManager._toggleDiaChip(this)" style="min-height:46px; padding:6px 4px; background:#111c30; border:1px solid #1e293b; border-radius:9px; color:#94a3b8; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; transition:all 0.15s ease;">
                    <span style="font-size:0.85rem;">${d.emoji}</span>
                    <span>${d.short}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Horario Preferido -->
            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">⏰ Horario Habitual</label>
              <select id="aj-radar-horario" style="width:100%; height:44px; padding:0 12px; background:#111c30; border:1px solid #1e3a5f; border-radius:10px; color:#fff; font-size:0.9rem; font-weight:600; outline:none; box-sizing:border-box;">
                <option value="Tarde / Noche (17:00 - 21:00)">🌆 Tarde / Noche (17:00 - 21:00)</option>
                <option value="Noche (21:00 - 01:00)">🌙 Noche (21:00 - 01:00)</option>
                <option value="Tarde (13:00 - 17:00)">☀️ Tarde (13:00 - 17:00)</option>
                <option value="Mañana (09:00 - 13:00)">☕ Mañana (09:00 - 13:00)</option>
                <option value="Todo el día / Fines de Semana">🎲 Todo el día / Fines de Semana</option>
                <option value="Horario Flexible / A coordinar">🤝 Horario Flexible / A coordinar</option>
              </select>
            </div>

            <!-- Zona o Comuna -->
            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">📍 Zona / Comuna / Sector de Santiago</label>
              <input type="text" id="aj-radar-zona" placeholder="Ej: Sector Sur y Centro, Providencia, Online..." maxlength="80" style="width:100%; height:44px; padding:0 12px; background:#111c30; border:1px solid #1e3a5f; border-radius:10px; color:#fff; font-size:0.88rem; outline:none; box-sizing:border-box;" />
            </div>

            <!-- Juegos Favoritos -->
            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">🎲 Juegos Favoritos</label>
              <input type="text" id="aj-radar-favs" placeholder="Ej: Catan, Dune Imperium, Faraway, Harmonies" maxlength="120" style="width:100%; height:44px; padding:0 12px; background:#111c30; border:1px solid #1e3a5f; border-radius:10px; color:#fff; font-size:0.88rem; outline:none; box-sizing:border-box;" />
            </div>

            <!-- Estilos de Juego Preferidos (Chips) -->
            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:6px;">🎭 Estilos de Juego Favoritos (toca para añadir):</label>
              <div id="aj-radar-estilos-container" style="display:flex; flex-wrap:wrap; gap:6px;">
                ${estilosList.map(est => `
                  <button type="button" class="aj-radar-estilo-btn" data-estilo="${est}" onclick="AuthManager._toggleEstiloChip(this)" style="padding:5px 10px; background:#111c30; border:1px solid #1e293b; border-radius:8px; color:#94a3b8; font-size:0.74rem; font-weight:600; cursor:pointer; transition:all 0.15s ease;">
                    ${est}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- ¿Qué buscas? / Colección / Mensaje -->
            <div>
              <label style="font-size:0.74rem; color:#cbd5e1; font-weight:700; display:block; margin-bottom:4px;">💬 ¿Qué buscas o qué juegos puedes llevar?</label>
              <textarea id="aj-radar-busca" rows="2" placeholder="Ej: Me gusta probar novedades, suelo llevar fillers a las juntas..." maxlength="150" style="width:100%; padding:10px 12px; background:#111c30; border:1px solid #1e3a5f; border-radius:10px; color:#fff; font-size:0.85rem; outline:none; box-sizing:border-box; resize:vertical;"></textarea>
            </div>

            <div id="aj-radar-error" style="display:none; font-size:0.75rem; color:#f87171; background:rgba(239,68,68,0.12); padding:9px 12px; border-radius:8px; border:1px solid rgba(239,68,68,0.3);"></div>
            <div id="aj-radar-ok" style="display:none; font-size:0.75rem; color:#4ade80; background:rgba(74,222,128,0.12); padding:9px 12px; border-radius:8px; border:1px solid rgba(74,222,128,0.3);"></div>

            <!-- Botones de Acción -->
            <button id="aj-radar-btn-submit" onclick="AuthManager._guardarRadar('${nick}')" style="width:100%; min-height:48px; background:linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color:#fff; font-weight:800; border:none; border-radius:10px; font-size:0.92rem; cursor:pointer; letter-spacing:0.3px; box-shadow:0 4px 16px rgba(14,165,233,0.35); transition:transform 0.15s ease;">
              💾 Guardar mi Disponibilidad
            </button>

            <button id="aj-radar-btn-borrar" onclick="AuthManager._eliminarRadar('${nick}')" style="display:none; width:100%; min-height:36px; background:transparent; color:#f87171; font-weight:700; border:1px solid rgba(239,68,68,0.3); border-radius:8px; font-size:0.78rem; cursor:pointer;">
              🗑️ Eliminar mi Ficha del Radar
            </button>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
      this._precargarModalRadar(nick);
    }

    _toggleDiaChip(btn) {
      const active = btn.classList.toggle('active');
      if (active) {
        btn.style.background = 'linear-gradient(135deg, #0ea5e9, #0284c7)';
        btn.style.borderColor = '#38bdf8';
        btn.style.color = '#fff';
        btn.style.boxShadow = '0 2px 10px rgba(14,165,233,0.4)';
      } else {
        btn.style.background = '#111c30';
        btn.style.borderColor = '#1e293b';
        btn.style.color = '#94a3b8';
        btn.style.boxShadow = 'none';
      }
    }

    _toggleEstiloChip(btn) {
      const active = btn.classList.toggle('active');
      if (active) {
        btn.style.background = 'rgba(14, 165, 233, 0.22)';
        btn.style.borderColor = '#38bdf8';
        btn.style.color = '#38bdf8';
      } else {
        btn.style.background = '#111c30';
        btn.style.borderColor = '#1e293b';
        btn.style.color = '#94a3b8';
      }
    }

    _toggleTodosDiasRadar(activar) {
      const btns = document.querySelectorAll('.aj-radar-day-btn');
      btns.forEach(b => {
        if (activar && !b.classList.contains('active')) this._toggleDiaChip(b);
        if (!activar && b.classList.contains('active')) this._toggleDiaChip(b);
      });
    }

    _toggleFindeRadar() {
      this._toggleTodosDiasRadar(false);
      const findes = ['SABADO', 'DOMINGO'];
      document.querySelectorAll('.aj-radar-day-btn').forEach(b => {
        if (findes.includes(b.dataset.day)) this._toggleDiaChip(b);
      });
    }

    async _cargarRadarEnPerfil(nick) {
      const el = document.getElementById('aj-perfil-radar-txt');
      if (!el) return;
      try {
        const cache = localStorage.getItem('aj_radar_' + nick);
        if (cache) {
          const d = JSON.parse(cache);
          if (d && d.dias_disponibles && d.dias_disponibles.length > 0) {
            el.innerHTML = `<span style="color:#38bdf8;">📡 ${d.dias_disponibles.length} días activos</span> <span style="font-size:0.7rem; color:#94a3b8;">(${d.zona || 'Comunidad'})</span>`;
          }
        }
        const res = await fetch(`/api/radar/mio?nick=${encodeURIComponent(nick)}`);
        const data = await res.json();
        if (data && data.radar && data.radar.registrado) {
          const r = data.radar;
          localStorage.setItem('aj_radar_' + nick, JSON.stringify(r));
          const numDias = (r.dias_disponibles || []).length;
          el.innerHTML = `<span style="color:#38bdf8;">📡 ${numDias} días activos</span> <span style="font-size:0.7rem; color:#94a3b8;">(${r.zona || 'Comunidad'})</span>`;
        } else if (!cache) {
          el.innerHTML = `<span style="color:#94a3b8; font-weight:600;">Sin configurar aún</span>`;
        }
      } catch (e) {
        if (!el.textContent || el.textContent === 'Consultando...') {
          el.innerHTML = `<span style="color:#94a3b8; font-weight:600;">Toca para configurar</span>`;
        }
      }
    }

    async _cargarMisionEnPerfil(nick) {
      const el = document.getElementById('aj-perfil-mision-txt');
      if (!el) return;
      const fechaHoy = new Date().toISOString().slice(0, 10);
      try {
        const res = await fetch(`/api/misiones/estado?nick=${encodeURIComponent(nick)}&fecha=${fechaHoy}&tipo=grupal`);
        const data = await res.json();
        if (data && data.entrega) {
          if (data.entrega.estado === 'aprobado') {
            el.innerHTML = `<span style="color:#34d399; font-weight:800;">✅ ¡Aprobada! (+${data.entrega.puntos_otorgados} PTS)</span>`;
          } else if (data.entrega.estado === 'pendiente') {
            el.innerHTML = `<span style="color:#fbbf24; font-weight:800;">⏳ En revisión del Admin</span>`;
          } else {
            el.innerHTML = `<span style="color:#f87171; font-weight:700;">Rechazada (Toca para reenviar)</span>`;
          }
        } else {
          el.innerHTML = `<span style="color:#38bdf8; font-weight:700;">Disponible (7 retos)</span>`;
        }
      } catch (e) {
        el.innerHTML = `<span style="color:#94a3b8;">Toca para enviar</span>`;
      }
    }

    async _precargarModalRadar(nick) {
      const zonaIn = document.getElementById('aj-radar-zona');
      const horarioSel = document.getElementById('aj-radar-horario');
      const favsIn = document.getElementById('aj-radar-favs');
      const buscaIn = document.getElementById('aj-radar-busca');
      const btnBorrar = document.getElementById('aj-radar-btn-borrar');

      const poblar = (d) => {
        if (d.zona && zonaIn) zonaIn.value = d.zona;
        if (d.horario_preferido && horarioSel) horarioSel.value = d.horario_preferido;
        if (d.favoritos && favsIn) favsIn.value = d.favoritos;
        if (d.busca_jugadores_para && buscaIn) buscaIn.value = d.busca_jugadores_para;
        if (d.coleccion && buscaIn && !buscaIn.value) buscaIn.value = d.coleccion;

        const diasActivos = d.dias_disponibles || [];
        document.querySelectorAll('.aj-radar-day-btn').forEach(b => {
          if (diasActivos.includes(b.dataset.day) && !b.classList.contains('active')) {
            this._toggleDiaChip(b);
          }
        });

        const estilosStr = (d.estilos || '').toLowerCase();
        document.querySelectorAll('.aj-radar-estilo-btn').forEach(b => {
          if (estilosStr.includes(b.dataset.estilo.toLowerCase()) && !b.classList.contains('active')) {
            this._toggleEstiloChip(b);
          }
        });

        if (btnBorrar && (d.registrado || diasActivos.length > 0)) {
          btnBorrar.style.display = 'block';
        }
      };

      const cache = localStorage.getItem('aj_radar_' + nick);
      if (cache) {
        try { poblar(JSON.parse(cache)); } catch (e) {}
      }

      try {
        const res = await fetch(`/api/radar/mio?nick=${encodeURIComponent(nick)}`);
        const data = await res.json();
        if (data && data.radar && data.radar.registrado) {
          poblar(data.radar);
          localStorage.setItem('aj_radar_' + nick, JSON.stringify(data.radar));
        }
      } catch (e) {
        console.warn('[Radar] Modo offline:', e);
      }
    }

    async _guardarRadar(nick) {
      const zona = (document.getElementById('aj-radar-zona')?.value || '').trim();
      const horario = document.getElementById('aj-radar-horario')?.value || 'Tarde / Noche (17:00 - 21:00)';
      const favs = (document.getElementById('aj-radar-favs')?.value || '').trim();
      const busca = (document.getElementById('aj-radar-busca')?.value || '').trim();

      const dias = [];
      document.querySelectorAll('.aj-radar-day-btn.active').forEach(b => {
        dias.push(b.dataset.day);
      });

      const estilos = [];
      document.querySelectorAll('.aj-radar-estilo-btn.active').forEach(b => {
        estilos.push(b.dataset.estilo);
      });

      const errDiv = document.getElementById('aj-radar-error');
      const okDiv = document.getElementById('aj-radar-ok');
      const btn = document.getElementById('aj-radar-btn-submit');

      if (errDiv) errDiv.style.display = 'none';
      if (okDiv) okDiv.style.display = 'none';

      if (dias.length === 0) {
        if (errDiv) {
          errDiv.textContent = 'Por favor selecciona al menos un día que tengas disponible para jugar.';
          errDiv.style.display = 'block';
        }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Guardando... ⏳'; }

      const payload = {
        nick,
        zona: zona || 'Sector Santiago',
        estilos: estilos.join(', '),
        favoritos: favs,
        coleccion: busca,
        dias_disponibles: dias,
        horario_preferido: horario,
        busca_jugadores_para: busca
      };

      // Guardado local inmediato
      localStorage.setItem('aj_radar_' + nick, JSON.stringify({ ...payload, registrado: true }));

      try {
        const res = await fetch('/api/radar/guardar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data && data.ok) {
          if (okDiv) { okDiv.textContent = '✅ ¡Ficha de Radar guardada exitosamente!'; okDiv.style.display = 'block'; }
          if (btn) btn.textContent = '✅ Guardado';
          setTimeout(() => {
            const m = document.getElementById('aj-radar-modal');
            if (m) m.remove();
            if (typeof renderSection === 'function') {
              renderSection('radar');
            }
          }, 1300);
        } else {
          if (errDiv) { errDiv.textContent = data.error || 'Error al guardar la ficha.'; errDiv.style.display = 'block'; }
          if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar mi Disponibilidad'; }
        }
      } catch (e) {
        // Fallback offline
        if (okDiv) { okDiv.textContent = '✅ Guardado localmente en tu dispositivo.'; okDiv.style.display = 'block'; }
        if (btn) btn.textContent = '✅ Guardado';
        setTimeout(() => {
          const m = document.getElementById('aj-radar-modal');
          if (m) m.remove();
          if (typeof renderSection === 'function') {
            renderSection('radar');
          }
        }, 1300);
      }
    }

    async _eliminarRadar(nick) {
      if (!confirm('¿Seguro que deseas eliminar tu ficha del Radar Jugón? Ya no aparecerás en la lista de disponibilidad.')) {
        return;
      }
      localStorage.removeItem('aj_radar_' + nick);
      try {
        await fetch('/api/radar/eliminar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nick })
        });
      } catch (e) {}

      const m = document.getElementById('aj-radar-modal');
      if (m) m.remove();
      if (typeof renderSection === 'function') {
        renderSection('radar');
      }
    }

    // ─── HUB NATIVO: MÓDULO DE MISIONES DIARIAS Y ENTREGA EFÍMERA (PASO 14) ───
    async abrirModalMisiones() {
      const isAuth = this.isAuthenticated();
      if (!isAuth) {
        this.showModal({ reason: 'Identifícate con tu WhatsApp para enviar tus desafíos diarios.' });
        return;
      }

      this.closeModal();

      let modal = document.getElementById('aj-misiones-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'aj-misiones-modal';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(4,4,14,0.92); display:flex; align-items:flex-start; justify-content:center; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); padding:12px 10px 20px; box-sizing:border-box; overflow-y:auto;';
        document.body.appendChild(modal);
      }

      const nick = this.getNick();
      const fechaHoy = new Date().toISOString().slice(0, 10);

      // Desafíos estándar de la tarjeta diaria
      const desafios = [
        { num: 1, title: 'La trama', desc: 'A) Explicar trama absurda / B) Adivinar la de alguien' },
        { num: 2, title: 'Fondo pantalla', desc: 'A) Subir pantalla inicio / B) Calificar del 1 al 10' },
        { num: 3, title: 'Banda sonora', desc: 'A) Compartir tema geek / B) Reaccionar al de alguien' },
        { num: 4, title: 'Versus', desc: 'A) Proponer versus / B) Votar en el de alguien' },
        { num: 5, title: 'El origen', desc: 'A) Contar primer juego o cómic / B) Comentar similitud' },
        { num: 6, title: 'Meme', desc: 'A) Subir meme de galería / B) Responder con sticker o gif' },
        { num: 7, title: 'Dilema', desc: 'A) Crear Prefieres X o Y / B) Responder nominación' }
      ];

      modal.innerHTML = `
        <div class="card glow custom-scrollbar" style="width:100%; max-width:520px; background:linear-gradient(145deg, #101426 0%, #070914 100%); border:1px solid rgba(16,185,129,0.45); border-radius:18px; padding:20px 16px; box-shadow:0 12px 45px rgba(0,0,0,0.8), 0 0 30px rgba(16,185,129,0.2); position:relative; box-sizing:border-box; margin:auto;">
          <button onclick="document.getElementById('aj-misiones-modal').remove()" style="position:absolute; top:12px; right:12px; background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:6px; line-height:1; z-index:1;" title="Cerrar">✕</button>

          <!-- Encabezado -->
          <div style="text-align:center; margin-bottom:14px;">
            <div style="font-size:2rem; margin-bottom:4px; filter: drop-shadow(0 0 14px rgba(16,185,129,0.55));">📋</div>
            <h2 style="font-size:1.15rem; color:#fff; font-weight:800; margin:0 0 4px; letter-spacing:-0.3px;">Mis Desafíos del Día</h2>
            <div style="font-size:0.68rem; color:#34d399; font-weight:700; text-transform:uppercase; letter-spacing:1px;">📅 ${fechaHoy}</div>
          </div>

          <!-- ── Tab switcher ── -->
          <div style="display:flex; gap:6px; margin-bottom:14px; background:rgba(255,255,255,0.04); border-radius:10px; padding:4px;">
            <button id="aj-tab-btn-grupal" onclick="AuthManager._switchMisionTab('grupal')"
              style="flex:1; padding:8px 6px; border:none; border-radius:7px; font-size:0.78rem; font-weight:800; cursor:pointer; transition:all 0.18s ease; background:rgba(16,185,129,0.85); color:#fff;">
              🃏 Retos Grupales
            </button>
            <button id="aj-tab-btn-secreta" onclick="AuthManager._switchMisionTab('secreta')"
              style="flex:1; padding:8px 6px; border:none; border-radius:7px; font-size:0.78rem; font-weight:800; cursor:pointer; transition:all 0.18s ease; background:transparent; color:#94a3b8;">
              🤫 Misión Secreta
            </button>
          </div>

          <!-- Panel Grupal -->
          <div id="aj-panel-grupal">
            <div id="aj-mis-loading" style="text-align:center; padding:20px; color:#94a3b8; font-size:0.85rem;">
              Consultando estado de tu misión de hoy... ⏳
            </div>
            <div id="aj-mis-content" style="display:none;"></div>
          </div>

          <!-- Panel Secreta -->
          <div id="aj-panel-secreta" style="display:none;">
            <div id="aj-sec-loading" style="text-align:center; padding:20px; color:#94a3b8; font-size:0.85rem;">
              Cargando tu misión secreta... 🤫
            </div>
            <div id="aj-sec-content" style="display:none;"></div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      // ── Cargar pestaña Grupal ──
      try {
        const apiBase = AUTH_CONFIG.apiUrl('');
        const resUrl = apiBase
          ? `${apiBase}/api/misiones/estado?nick=${encodeURIComponent(nick)}&fecha=${fechaHoy}&tipo=grupal`
          : `/api/misiones/estado?nick=${encodeURIComponent(nick)}&fecha=${fechaHoy}&tipo=grupal`;
        const res = await fetch(resUrl);
        const data = await res.json();
        const contentDiv = document.getElementById('aj-mis-content');
        const loadingDiv = document.getElementById('aj-mis-loading');
        if (loadingDiv) loadingDiv.style.display = 'none';
        if (!contentDiv) return;

        contentDiv.style.display = 'block';

        if (data && data.entrega) {
          const ent = data.entrega;
          if (ent.estado === 'aprobado') {
            contentDiv.innerHTML = `
              <div style="text-align:center; padding:16px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); border-radius:12px; margin-bottom:12px;">
                <div style="font-size:2rem; margin-bottom:6px;">🎉</div>
                <h3 style="color:#34d399; font-size:1.1rem; font-weight:800; margin:0 0 4px;">¡Misión Aprobada!</h3>
                <p style="color:#cbd5e1; font-size:0.82rem; margin:0 0 8px;">Completaste los desafíos de hoy y recibiste <strong>+${ent.puntos_otorgados} PUNTOS</strong>.</p>
                <div style="font-size:0.72rem; color:#94a3b8;">Revisado por <strong>${ent.admin_revisor || 'Admin'}</strong> · Pruebas purgadas con éxito.</div>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                <button onclick="AuthManager.descargarTarjetaMision('${nick}', '${fechaHoy}', ${ent.puntos_otorgados || 7})" style="width:100%; min-height:44px; background:linear-gradient(135deg, #10b981, #059669); color:#fff; border:none; border-radius:10px; font-weight:800; font-size:0.84rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  📸 Descargar Tarjeta de Victoria (PNG)
                </button>
                <button onclick="AuthManager.compartirTarjetaMisionWhatsApp('${nick}', '${fechaHoy}', ${ent.puntos_otorgados || 7})" style="width:100%; min-height:44px; background:rgba(37,211,102,0.15); border:1px solid #25d366; color:#25d366; border-radius:10px; font-weight:800; font-size:0.84rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  📲 Compartir en WhatsApp (Imagen)
                </button>
              </div>
              <button onclick="document.getElementById('aj-misiones-modal').remove()" style="width:100%; padding:11px; background:#1e293b; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">Entendido</button>
            `;
            return;
          } else if (ent.estado === 'pendiente') {
            contentDiv.innerHTML = `
              <div style="text-align:center; padding:16px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.35); border-radius:12px; margin-bottom:12px;">
                <div style="font-size:2rem; margin-bottom:6px;">⏳</div>
                <h3 style="color:#fbbf24; font-size:1.1rem; font-weight:800; margin:0 0 4px;">Entrega en Revisión</h3>
                <p style="color:#cbd5e1; font-size:0.82rem; margin:0 0 8px;">Tus pruebas ya fueron enviadas. En cuanto el Admin las avale, se suman los puntos y las fotos se purgan.</p>
                <div style="font-size:0.72rem; color:#94a3b8;">Desafíos reportados: <strong>${(ent.desafios_completados || []).length} de 7</strong></div>
              </div>
              <button onclick="document.getElementById('aj-misiones-modal').remove()" style="width:100%; padding:11px; background:#1e293b; color:#fff; border:none; border-radius:10px; font-weight:700; cursor:pointer;">Cerrar</button>
            `;
            return;
          }
        }

        // Formulario de entrega grupal
        const desafiosHtml = desafios.map(d => `
          <label style="display:flex; align-items:flex-start; gap:10px; background:#111827; border:1px solid #1f2937; border-radius:10px; padding:10px 12px; cursor:pointer; font-size:0.85rem; transition:border-color 0.15s ease;">
            <input type="checkbox" class="aj-mis-check" value="${d.num}" checked style="width:18px; height:18px; accent-color:#10b981; margin-top:2px; flex-shrink:0;">
            <div style="flex:1;">
              <strong style="color:#fff; text-transform:uppercase; font-size:0.8rem;">${d.num}. ${d.title}</strong>
              <div style="color:#94a3b8; font-size:0.73rem; margin-top:2px; line-height:1.35;">${d.desc}</div>
            </div>
          </label>
        `).join('');

        contentDiv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:0.73rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">Retos cumplidos hoy (+7 PTS):</span>
            <button type="button" onclick="document.querySelectorAll('.aj-mis-check').forEach(c=>c.checked=true)" style="background:none; border:none; color:#34d399; font-size:0.7rem; font-weight:700; cursor:pointer; text-decoration:underline;">Marcar los 7</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:12px;">
            ${desafiosHtml}
          </div>

          <!-- Multi-upload con compresión WebP cliente -->
          <div style="background:#0b1120; border:1px dashed rgba(16,185,129,0.4); border-radius:12px; padding:12px; text-align:center; margin-bottom:12px;">
            <div style="font-size:1.2rem; margin-bottom:4px;">📎</div>
            <div style="font-size:0.82rem; color:#fff; font-weight:700; margin-bottom:2px;">Adjuntar Pruebas (Capturas)</div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:8px;">Se comprimen en tu móvil y se purgan al ser aprobadas.</div>
            <input type="file" id="aj-mis-file-input" multiple accept="image/*" style="display:none;" onchange="AuthManager._handleArchivosMision(this)">
            <button type="button" onclick="document.getElementById('aj-mis-file-input').click()" style="background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.5); color:#34d399; font-weight:800; border-radius:8px; padding:8px 14px; font-size:0.78rem; cursor:pointer;">
              📸 Seleccionar Fotos de tu Galería
            </button>
            <div id="aj-mis-previews" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-top:8px;"></div>
          </div>

          <div id="aj-mis-error" style="display:none; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; padding:8px 12px; border-radius:8px; font-size:0.76rem; font-weight:600; margin-bottom:10px; text-align:center;"></div>
          <div id="aj-mis-ok" style="display:none; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#6ee7b7; padding:8px 12px; border-radius:8px; font-size:0.78rem; font-weight:700; margin-bottom:10px; text-align:center;"></div>

          <button id="aj-mis-btn-submit" onclick="AuthManager._guardarEntregaMision('${nick}', '${fechaHoy}')" style="width:100%; min-height:48px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:#fff; font-weight:800; border:none; border-radius:10px; font-size:0.9rem; cursor:pointer; letter-spacing:0.3px; box-shadow:0 4px 16px rgba(16,185,129,0.35); transition:transform 0.15s ease;">
            📤 Enviar Pruebas para Revisión
          </button>
        `;
      } catch (e) {
        console.error('[Misiones] Error cargando modal grupal:', e);
        const ld = document.getElementById('aj-mis-loading');
        if (ld) ld.innerHTML = '<span style="color:#fca5a5;">❌ Error al cargar. ¿El servidor está activo?</span>';
      }

      // ── Cargar pestaña Secreta en segundo plano ──
      this._cargarMisionSecreta(nick).catch(() => {});
    }

    // ── Cambio de pestaña en el modal de misiones ──────────────────────────
    _switchMisionTab(tab) {
      const panelGrupal   = document.getElementById('aj-panel-grupal');
      const panelSecreta  = document.getElementById('aj-panel-secreta');
      const btnGrupal     = document.getElementById('aj-tab-btn-grupal');
      const btnSecreta    = document.getElementById('aj-tab-btn-secreta');
      if (!panelGrupal || !panelSecreta) return;

      const activeStyle   = 'background:rgba(16,185,129,0.85); color:#fff;';
      const inactiveStyle = 'background:transparent; color:#94a3b8;';

      if (tab === 'grupal') {
        panelGrupal.style.display  = 'block';
        panelSecreta.style.display = 'none';
        if (btnGrupal)  btnGrupal.style.cssText  += activeStyle;
        if (btnSecreta) btnSecreta.style.cssText  += inactiveStyle;
      } else {
        panelGrupal.style.display  = 'none';
        panelSecreta.style.display = 'block';
        if (btnSecreta) btnSecreta.style.cssText += activeStyle;
        if (btnGrupal)  btnGrupal.style.cssText  += inactiveStyle;
      }
    }

    // ── Carga dinámica de la Misión Secreta desde el Orquestador ──────────
    async _cargarMisionSecreta(nick) {
      const secLoading = document.getElementById('aj-sec-loading');
      const secContent = document.getElementById('aj-sec-content');
      if (!secContent) return;

      try {
        // Pedir misiones al Orquestador (AJ_MISIONES_Y_FEED)
        const orqUrl = window.AJ_CONFIG && window.AJ_CONFIG.ORQUESTADOR_URL
          ? window.AJ_CONFIG.ORQUESTADOR_URL
          : (document.querySelector('meta[name="orquestador-url"]') ? document.querySelector('meta[name="orquestador-url"]').content : '');

        if (!orqUrl) {
          if (secLoading) secLoading.style.display = 'none';
          secContent.style.display = 'block';
          secContent.innerHTML = this._renderMisionSecretaFallback(nick);
          return;
        }

        const res = await fetch(`${orqUrl}?action=misiones_get`, { mode: 'cors' });
        const data = await res.json();
        if (secLoading) secLoading.style.display = 'none';
        secContent.style.display = 'block';

        const positivas = (data && Array.isArray(data.positivas)) ? data.positivas : [];
        const ataque    = (data && Array.isArray(data.ataque))    ? data.ataque    : [];
        const todas     = [...positivas, ...ataque];

        if (todas.length === 0) {
          secContent.innerHTML = this._renderMisionSecretaFallback(nick);
          return;
        }

        // Asignación determinista: índice basado en el nick del usuario (misma misión toda la semana)
        const nickVal = nick.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const mision  = todas[nickVal % todas.length];
        const nickHoy = new Date().toISOString().slice(0, 10);

        secContent.innerHTML = `
          <div style="background:rgba(139,92,246,0.10); border:1px solid rgba(139,92,246,0.4); border-radius:14px; padding:16px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="font-size:1.6rem;">🤫</span>
              <div>
                <div style="font-size:0.68rem; color:#a78bfa; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Tu Misión Secreta Personal</div>
                <div style="font-size:0.65rem; color:#64748b; margin-top:2px;">Solo tú la ves · Recompensa independiente</div>
              </div>
              <span style="margin-left:auto; font-size:0.68rem; background:rgba(139,92,246,0.25); color:#c4b5fd; border-radius:20px; padding:3px 8px; font-weight:700; white-space:nowrap;">${mision.tipo === 'positiva' ? '✨ Positiva' : '⚔️ Ataque'}</span>
            </div>

            <div style="font-size:1rem; color:#fff; font-weight:800; margin-bottom:6px; line-height:1.3;">${mision.titulo}</div>
            <div style="font-size:0.78rem; color:#cbd5e1; line-height:1.4; margin-bottom:12px;">${mision.desc || ''}</div>

            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); border-radius:8px; padding:8px 12px;">
              <div style="font-size:0.72rem; color:#94a3b8;">Recompensa:</div>
              <div style="font-size:0.9rem; font-weight:800; color:#a78bfa;">+${mision.pts || '?'} PTS</div>
            </div>
          </div>

          <!-- Upload de prueba única para Misión Secreta -->
          <div style="background:#0b1120; border:1px dashed rgba(139,92,246,0.4); border-radius:12px; padding:12px; text-align:center; margin-bottom:12px;">
            <div style="font-size:1.2rem; margin-bottom:4px;">📸</div>
            <div style="font-size:0.82rem; color:#fff; font-weight:700; margin-bottom:2px;">Prueba de tu Misión Secreta</div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-bottom:8px;">1 captura que demuestre que la completaste.</div>
            <input type="file" id="aj-sec-file-input" accept="image/*" style="display:none;" onchange="AuthManager._handleArchivosMisionSecreta(this)">
            <button type="button" onclick="document.getElementById('aj-sec-file-input').click()" style="background:rgba(139,92,246,0.18); border:1px solid rgba(139,92,246,0.5); color:#a78bfa; font-weight:800; border-radius:8px; padding:8px 14px; font-size:0.78rem; cursor:pointer;">
              📷 Seleccionar Captura
            </button>
            <div id="aj-sec-preview" style="margin-top:8px;"></div>
          </div>

          <div id="aj-sec-error" style="display:none; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.4); color:#fca5a5; padding:8px 12px; border-radius:8px; font-size:0.76rem; font-weight:600; margin-bottom:10px; text-align:center;"></div>
          <div id="aj-sec-ok"    style="display:none; background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.4); color:#c4b5fd; padding:8px 12px; border-radius:8px; font-size:0.78rem; font-weight:700; margin-bottom:10px; text-align:center;"></div>

          <button id="aj-sec-btn-submit"
            onclick="AuthManager._guardarEntregaMisionSecreta('${nick}', '${nickHoy}', '${mision.id || 'SEC-?'}', '${(mision.pts || '0').toString()}')"
            style="width:100%; min-height:48px; background:linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color:#fff; font-weight:800; border:none; border-radius:10px; font-size:0.9rem; cursor:pointer; letter-spacing:0.3px; box-shadow:0 4px 16px rgba(139,92,246,0.35); transition:transform 0.15s ease;">
            🤫 Enviar Prueba de Misión Secreta
          </button>
        `;
      } catch (e) {
        console.warn('[MisionSecreta] No se pudo cargar desde Orquestador:', e);
        if (secLoading) secLoading.style.display = 'none';
        if (secContent) {
          secContent.style.display = 'block';
          secContent.innerHTML = this._renderMisionSecretaFallback(nick);
        }
      }
    }

    // ── Render fallback si el Orquestador no está disponible ───────────────
    _renderMisionSecretaFallback(nick) {
      return `
        <div style="text-align:center; padding:30px 16px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px dashed #334155;">
          <div style="font-size:2rem; margin-bottom:8px;">🤫</div>
          <div style="color:#fff; font-weight:800; font-size:0.95rem; margin-bottom:4px;">Misión Secreta</div>
          <div style="color:#94a3b8; font-size:0.78rem; margin-bottom:12px; line-height:1.4;">Las misiones secretas se cargan desde el servidor del Orquestador. Verifica que esté en línea o añade misiones en la hoja <strong>MISIONES_SECRETAS</strong> de Google Sheets.</div>
          <div style="font-size:0.72rem; color:#64748b;">¿Eres admin? Añade misiones en tu hoja AJ_MISIONES_Y_FEED.</div>
        </div>
      `;
    }

    // ── Manejo de archivo para Misión Secreta (1 foto) ────────────────────
    _secImagenBase64 = null;

    async _handleArchivosMisionSecreta(input) {
      const file = (input.files || [])[0];
      if (!file) return;
      this._secImagenBase64 = null;
      const preview = document.getElementById('aj-sec-preview');
      if (preview) preview.innerHTML = '<span style="font-size:0.73rem; color:#94a3b8;">Comprimiendo... ⏳</span>';

      try {
        const b64 = await this._comprimirImagenCliente(file, 1000, 1000, 0.72);
        this._secImagenBase64 = { base64: b64, nombre: file.name };
        if (preview) {
          preview.innerHTML = `
            <div style="display:inline-block; position:relative; width:60px; height:60px; border-radius:8px; overflow:hidden; border:2px solid #7c3aed; background:#000;">
              <img src="${b64}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="font-size:0.72rem; color:#a78bfa; font-weight:700; margin-top:4px;">✅ Foto lista</div>
          `;
        }
      } catch (e) {
        if (preview) preview.innerHTML = '<span style="color:#fca5a5; font-size:0.73rem;">❌ Error al comprimir la foto.</span>';
      }
    }

    // ── Guardar entrega de Misión Secreta ─────────────────────────────────
    async _guardarEntregaMisionSecreta(nick, fecha, misionId, pts) {
      const errDiv = document.getElementById('aj-sec-error');
      const okDiv  = document.getElementById('aj-sec-ok');
      const btn    = document.getElementById('aj-sec-btn-submit');

      if (errDiv) errDiv.style.display = 'none';
      if (okDiv)  okDiv.style.display  = 'none';

      if (!this._secImagenBase64) {
        if (errDiv) { errDiv.textContent = 'Adjunta una captura de tu misión secreta antes de enviar.'; errDiv.style.display = 'block'; }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Subiendo prueba... ⏳'; }

      try {
        const apiUrl = AUTH_CONFIG.apiUrl('/api/misiones/subir_pruebas');
        const upRes = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nick, fecha, imagenes: [this._secImagenBase64] })
        });
        const upData = await upRes.json();
        if (!upData || !upData.ok) throw new Error(upData?.error || 'Error subiendo la prueba');

        const entRes = await fetch(AUTH_CONFIG.apiUrl('/api/misiones/entregar'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nick,
            fecha,
            tipo: 'secreta',
            desafios: [misionId],
            pruebas: upData.urls || [],
            mision_id: misionId,
            pts_esperados: parseInt(pts, 10) || 0
          })
        });
        const entData = await entRes.json();

        if (entData && entData.ok) {
          if (okDiv) { okDiv.textContent = '✅ ¡Prueba enviada! El Admin la revisará pronto.'; okDiv.style.display = 'block'; }
          if (btn) btn.textContent = '✅ Enviado';
          this._secImagenBase64 = null;
          setTimeout(() => {
            const m = document.getElementById('aj-misiones-modal');
            if (m) m.remove();
          }, 1800);
        } else {
          if (errDiv) { errDiv.textContent = entData.mensaje || entData.error || 'No se pudo registrar la entrega.'; errDiv.style.display = 'block'; }
          if (btn) { btn.disabled = false; btn.textContent = '🤫 Enviar Prueba de Misión Secreta'; }
        }
      } catch (e) {
        if (errDiv) { errDiv.textContent = 'Error: ' + (e.message || 'Error de red.'); errDiv.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = '🤫 Enviar Prueba de Misión Secreta'; }
      }
    }

    // Almacena en memoria las imágenes base64 comprimidas antes de enviar
    _misionImagenesBase64 = [];

    async _handleArchivosMision(input) {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      this._misionImagenesBase64 = [];
      const previewContainer = document.getElementById('aj-mis-previews');
      if (previewContainer) previewContainer.innerHTML = '<span style="font-size:0.75rem; color:#94a3b8;">Comprimiendo fotos... ⏳</span>';

      for (let i = 0; i < files.length; i++) {
        try {
          const b64 = await this._comprimirImagenCliente(files[i], 1000, 1000, 0.72);
          this._misionImagenesBase64.push({ base64: b64, nombre: files[i].name });
        } catch (e) {
          console.warn('Error comprimiendo foto:', e);
        }
      }

      if (previewContainer) {
        previewContainer.innerHTML = '';
        this._misionImagenesBase64.forEach((img, idx) => {
          const thumb = document.createElement('div');
          thumb.style.cssText = 'position:relative; width:52px; height:52px; border-radius:6px; overflow:hidden; border:1px solid #10b981; background:#000;';
          thumb.innerHTML = `
            <img src="${img.base64}" style="width:100%; height:100%; object-fit:cover;">
            <span style="position:absolute; bottom:1px; right:2px; font-size:0.6rem; background:rgba(0,0,0,0.7); color:#fff; padding:1px 3px; border-radius:3px;">#${idx+1}</span>
          `;
          previewContainer.appendChild(thumb);
        });
        const badge = document.createElement('div');
        badge.style.cssText = 'width:100%; font-size:0.75rem; color:#34d399; font-weight:700; margin-top:4px;';
        badge.textContent = `✅ ${this._misionImagenesBase64.length} foto(s) preparadas y optimizadas`;
        previewContainer.appendChild(badge);
      }
    }

    _comprimirImagenCliente(file, maxWidth = 1000, maxHeight = 1000, quality = 0.72) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth || height > maxHeight) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            // Intentar webp, fallback jpeg
            let dataUrl = canvas.toDataURL('image/webp', quality);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async _guardarEntregaMision(nick, fechaHoy) {
      const checkedBoxes = Array.from(document.querySelectorAll('.aj-mis-check:checked'));
      const desafios = checkedBoxes.map(c => parseInt(c.value, 10));
      const errDiv = document.getElementById('aj-mis-error');
      const okDiv = document.getElementById('aj-mis-ok');
      const btn = document.getElementById('aj-mis-btn-submit');

      if (errDiv) errDiv.style.display = 'none';
      if (okDiv) okDiv.style.display = 'none';

      if (desafios.length === 0) {
        if (errDiv) {
          errDiv.textContent = 'Selecciona al menos un desafío completado.';
          errDiv.style.display = 'block';
        }
        return;
      }

      if (this._misionImagenesBase64.length === 0) {
        if (errDiv) {
          errDiv.textContent = 'Por favor adjunta al menos una foto de prueba de tus desafíos.';
          errDiv.style.display = 'block';
        }
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Subiendo pruebas... ⏳'; }

      try {
        // 1. Subir imágenes temporales
        const upRes = await fetch('/api/misiones/subir_pruebas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nick,
            fecha: fechaHoy,
            imagenes: this._misionImagenesBase64
          })
        });
        const upData = await upRes.json();
        if (!upData || !upData.ok) {
          throw new Error(upData?.error || 'Error subiendo las pruebas');
        }

        const urls = upData.urls || [];

        // 2. Registrar entrega en la base de datos
        if (btn) btn.textContent = 'Registrando entrega... ⏳';
        const entRes = await fetch('/api/misiones/entregar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nick,
            fecha: fechaHoy,
            tipo: 'grupal',
            desafios,
            pruebas: urls
          })
        });
        const entData = await entRes.json();

        if (entData && entData.ok) {
          if (okDiv) {
            okDiv.textContent = '✅ ¡Pruebas enviadas exitosamente! El Admin las revisará con 1 check.';
            okDiv.style.display = 'block';
          }
          if (btn) btn.textContent = '✅ Enviado';
          setTimeout(() => {
            const m = document.getElementById('aj-misiones-modal');
            if (m) m.remove();
          }, 1500);
        } else {
          if (errDiv) {
            errDiv.textContent = entData.mensaje || entData.error || 'No se pudo registrar la entrega.';
            errDiv.style.display = 'block';
          }
          if (btn) { btn.disabled = false; btn.textContent = '📤 Enviar Pruebas para Revisión'; }
        }
      } catch (e) {
        if (errDiv) {
          errDiv.textContent = 'Error: ' + (e.message || 'Error de red al enviar pruebas.');
          errDiv.style.display = 'block';
        }
        if (btn) { btn.disabled = false; btn.textContent = '📤 Enviar Pruebas para Revisión'; }
      }
    }

    // ─── BANDEJA DE MODERACIÓN 1-CHECK ADMIN (PASO 15) ────────────────────────
    async abrirModalAdminMisiones() {
      let modal = document.getElementById('aj-admin-misiones-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'aj-admin-misiones-modal';
        modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(4,4,14,0.92); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); padding:16px; box-sizing:border-box; overflow-y:auto;';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="card glow custom-scrollbar" style="width:100%; max-width:620px; max-height:92vh; overflow-y:auto; background:linear-gradient(145deg, #141124 0%, #090714 100%); border:1px solid rgba(245,158,11,0.45); border-radius:18px; padding:24px 20px; box-shadow:0 12px 45px rgba(0,0,0,0.8), 0 0 30px rgba(245,158,11,0.2); position:relative; box-sizing:border-box;">
          <button onclick="document.getElementById('aj-admin-misiones-modal').remove()" style="position:absolute; top:14px; right:14px; background:none; border:none; color:#94a3b8; font-size:1.3rem; cursor:pointer; padding:4px; line-height:1;" title="Cerrar">✕</button>
          
          <div style="text-align:center; margin-bottom:16px;">
            <div style="font-size:2.5rem; margin-bottom:4px; filter: drop-shadow(0 0 14px rgba(245,158,11,0.55));">🛡️</div>
            <h2 style="font-size:1.28rem; color:#fff; font-weight:800; margin:0 0 4px; letter-spacing:-0.3px;">Bandeja de Moderación de Misiones</h2>
            <div style="font-size:0.7rem; color:#fbbf24; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Modo "Inbox Zero" · 1-Check + Purga Automática</div>
          </div>

          <div id="aj-admin-mis-list" style="display:flex; flex-direction:column; gap:12px;">
            <div style="text-align:center; padding:20px; color:#94a3b8; font-size:0.85rem;">Cargando misiones pendientes... ⏳</div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      try {
        const adminToken = AUTH_CONFIG.getAdminToken();
        const res = await fetch(AUTH_CONFIG.apiUrl(`/api/misiones/pendientes?admin_token=${encodeURIComponent(adminToken)}`), {
          headers: {
            'Authorization': 'Bearer ' + adminToken
          }
        });
        const data = await res.json();
        const listDiv = document.getElementById('aj-admin-mis-list');
        if (!listDiv) return;

        const pendientes = (data && data.pendientes) ? data.pendientes : [];
        if (pendientes.length === 0) {
          listDiv.innerHTML = `
            <div style="text-align:center; padding:30px 20px; background:rgba(255,255,255,0.03); border-radius:12px; border:1px dashed #334155;">
              <div style="font-size:2rem; margin-bottom:6px;">✨</div>
              <div style="color:#fff; font-weight:800; font-size:1rem;">¡Bandeja al día!</div>
              <div style="color:#94a3b8; font-size:0.8rem; margin-top:2px;">No hay misiones pendientes de revisión en este momento.</div>
            </div>
          `;
          return;
        }

        listDiv.innerHTML = pendientes.map(p => {
          const numDesafios = (p.desafios_completados || []).length;
          const fotos = (p.pruebas_urls || []);
          const fotosHtml = fotos.map((f, i) => `
            <a href="${f}" target="_blank" style="display:inline-block; width:64px; height:64px; border-radius:8px; overflow:hidden; border:1px solid #475569; position:relative; background:#000;">
              <img src="${f}" style="width:100%; height:100%; object-fit:cover;" title="Toca para ver foto completa">
            </a>
          `).join('');

          return `
            <div id="aj-mision-row-${p.id}" style="background:#111827; border:1px solid #1f2937; border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:0.95rem; font-weight:800; color:#fff;">👤 ${escapeHtml(p.nick)}</div>
                  <div style="font-size:0.75rem; color:#94a3b8;">📅 Fecha: ${p.fecha_mision} · Enviado: ${p.fecha_envio ? p.fecha_envio.slice(11, 16) : ''}</div>
                </div>
                <span style="font-size:0.74rem; font-weight:800; background:rgba(16,185,129,0.15); color:#34d399; padding:4px 8px; border-radius:6px; border:1px solid rgba(16,185,129,0.3);">
                  ${numDesafios}/7 Retos
                </span>
              </div>

              <!-- Miniaturas de pruebas -->
              <div>
                <div style="font-size:0.72rem; color:#94a3b8; font-weight:700; margin-bottom:6px; text-transform:uppercase;">Pruebas adjuntas (${fotos.length}):</div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                  ${fotosHtml || '<span style="font-size:0.75rem; color:#64748b;">Sin imágenes adjuntas</span>'}
                </div>
              </div>

              <!-- Botones de 1-Check -->
              <div style="display:flex; gap:8px; margin-top:4px;">
                <button onclick="AuthManager._moderarMisionAdmin(${p.id}, 'aprobar', 7)" style="flex:1; min-height:42px; background:linear-gradient(135deg, #10b981, #059669); color:#fff; font-weight:800; font-size:0.82rem; border:none; border-radius:8px; cursor:pointer; box-shadow:0 2px 10px rgba(16,185,129,0.3);">
                  ✔ Aprobar (+7 PTS y Purgar)
                </button>
                <button onclick="AuthManager._moderarMisionAdmin(${p.id}, 'rechazar', 0)" style="min-height:42px; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); color:#f87171; font-weight:700; font-size:0.8rem; padding:0 14px; border-radius:8px; cursor:pointer;">
                  ✕ Rechazar
                </button>
              </div>
            </div>
          `;
        }).join('');
      } catch (e) {
        console.error('Error cargando misiones admin:', e);
      }
    }

    async _moderarMisionAdmin(misionId, accion, puntos = 7) {
      const row = document.getElementById(`aj-mision-row-${misionId}`);
      if (row) {
        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';
      }

      try {
        const adminToken = AUTH_CONFIG.getAdminToken();
        const res = await fetch(AUTH_CONFIG.apiUrl('/api/misiones/moderar'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminToken
          },
          body: JSON.stringify({
            mision_id: misionId,
            accion,
            puntos,
            admin_nick: this.getNick() || 'Admin',
            admin_token: adminToken
          })
        });
        const data = await res.json();
        if (data && data.ok) {
          if (row) {
            row.style.background = accion === 'aprobar' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
            const nickAprobado = data.nick || 'Miembro';
            const fechaHoy = new Date().toISOString().slice(0, 10);
            row.innerHTML = `
              <div style="text-align:center; padding:12px; color:${accion === 'aprobar' ? '#34d399' : '#f87171'}; font-weight:800; font-size:0.85rem; display:flex; flex-direction:column; gap:8px; align-items:center;">
                <div>${accion === 'aprobar' ? `✅ Misión de ${nickAprobado} Aprobada (+${puntos} PTS) y fotos purgadas` : '❌ Misión Rechazada y fotos purgadas'}</div>
                ${accion === 'aprobar' ? `
                  <button onclick="AuthManager.descargarTarjetaMision('${nickAprobado}', '${fechaHoy}', ${puntos})" style="background:#10b981; color:#fff; font-weight:800; border:none; border-radius:8px; padding:7px 12px; font-size:0.78rem; cursor:pointer; display:flex; align-items:center; gap:5px;">
                    📸 Descargar Tarjeta de ${nickAprobado} para WhatsApp
                  </button>
                ` : ''}
              </div>
            `;
            setTimeout(() => row.remove(), accion === 'aprobar' ? 4000 : 1500);
          }
        } else {
          alert('Error: ' + (data?.error || 'No se pudo moderar la misión'));
          if (row) { row.style.opacity = '1'; row.style.pointerEvents = 'auto'; }
        }
      } catch (e) {
        alert('Error de red al moderar');
        if (row) { row.style.opacity = '1'; row.style.pointerEvents = 'auto'; }
      }
    }

    descargarTarjetaMision(nick, fecha, puntos = 7) {
      if (!window.LogroCard || !window.LogroCard.generarTarjetaMisionDiaria) {
        alert('Cargando generador de tarjetas...');
        return;
      }
      const canvas = window.LogroCard.generarTarjetaMisionDiaria({ nick, fecha, puntos });
      window.LogroCard.descargarCanvas(canvas, `mision_${nick}_${fecha}.png`);
    }

    compartirTarjetaMisionWhatsApp(nick, fecha, puntos = 7) {
      if (!window.LogroCard || !window.LogroCard.generarTarjetaMisionDiaria) {
        alert('Cargando generador de tarjetas...');
        return;
      }
      const canvas = window.LogroCard.generarTarjetaMisionDiaria({ nick, fecha, puntos });
      const text = `🎉 ¡Completé todos los Desafíos del Día en Amigos Jugones y sumé +${puntos} PTS oficiales! 🎲🏆`;
      window.LogroCard.compartirCanvas(canvas, `mision_${nick}_${fecha}.png`, text);
    }

    // ─── EVENTOS Y SUSCRIPCIONES ──────────────────────────────────────────
    onAuthChange(fn) {
      if (typeof fn === 'function') this.listeners.auth.push(fn);
    }

    onPointsChange(fn) {
      if (typeof fn === 'function') this.listeners.points.push(fn);
    }

    emitAuthChange() {
      const u = this.getUser();
      this.listeners.auth.forEach(fn => {
        try { fn(u); } catch (e) { console.error(e); }
      });
      this.updateNavbarBadges();
      window.dispatchEvent(new CustomEvent('aj:auth-changed', { detail: u }));
    }

    emitPointsChange(total, delta, reason) {
      this.listeners.points.forEach(fn => {
        try { fn({ total, delta, reason }); } catch (e) { console.error(e); }
      });
      this.updateNavbarBadges();
      window.dispatchEvent(new CustomEvent('aj:points-updated', { detail: { total, delta, reason } }));
    }

    initEvents() {
      window.addEventListener('storage', (e) => {
        if (e.key === AUTH_CONFIG.STORAGE_KEY) {
          this.session = this.loadSession();
          this.emitAuthChange();
        }
      });
      document.addEventListener('DOMContentLoaded', () => {
        this.updateNavbarBadges();
      });
    }

    // ─── ACTUALIZACIÓN DE BADGES EN TOPBAR Y SIDEBAR ───────────────────────
    updateNavbarBadges() {
      const isAuth = this.isAuthenticated();
      const nick = this.getNick();
      const pts = this.getPoints();

      // 1. TOPBAR (Mobile)
      const topbar = document.getElementById('topbar');
      let badgeContainer = document.getElementById('aj-auth-badge');
      if (!badgeContainer && topbar) {
        badgeContainer = document.createElement('div');
        badgeContainer.id = 'aj-auth-badge';
        badgeContainer.style.cssText = 'margin-left: auto; display: flex; align-items: center; gap: 8px;';
        topbar.appendChild(badgeContainer);
      }

      if (badgeContainer) {
        if (isAuth) {
          badgeContainer.innerHTML = `
            <div style="display:flex; align-items:center; gap:5px; background: rgba(124, 58, 237, 0.18); border: 1px solid rgba(168, 85, 247, 0.4); padding: 4px 8px; border-radius: 20px; font-size: 0.72rem; font-family:'JetBrains Mono', monospace; color: var(--accent-light); white-space:nowrap; flex-shrink:0;">
              <span title="Puntos para juegos arcade">🪙 <strong style="color:#f59e0b;">${pts}</strong> PTS</span>
              <span style="color:var(--text-faint);">|</span>
              <span onclick="AuthManager.showModal()" style="color:var(--text); font-weight:700; max-width:85px; cursor:pointer;" class="truncate" title="Ver mi Perfil y Cumpleaños: ${nick}">👤 ${nick}</span>
              <button onclick="AuthManager.logout()" title="Cerrar Sesión" style="background:none; border:none; color:var(--text-dim); cursor:pointer; font-size:0.75rem; padding:0 2px; margin-left:2px;">✕</button>
            </div>
          `;
        } else {
          badgeContainer.innerHTML = `
            <button onclick="AuthManager.showModal()" class="badge badge-purple topbar-auth-btn" style="cursor:pointer; border:1px solid var(--primary); padding: 5px 8px; font-size:0.75rem; font-weight:700; border-radius:20px; display:inline-flex; align-items:center; gap:4px; white-space:nowrap; flex-shrink:0;">
              <span>🔑</span> <span>Identifícate</span>
            </button>
          `;
        }
      }

      // 2. SIDEBAR (Desktop)
      const sidebarBadge = document.getElementById('aj-sidebar-auth');
      if (sidebarBadge) {
        if (isAuth) {
          const tienePrivada = Boolean(this.session && this.session.tiene_clave_privada);
          sidebarBadge.innerHTML = `
            <div style="background: rgba(124, 58, 237, 0.16); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.25);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.68rem; color: var(--accent-light); font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Miembro Verificado</span>
                <button onclick="AuthManager.logout()" title="Cerrar Sesión" style="background:none; border:none; color:var(--text-faint); cursor:pointer; font-size:0.72rem; padding:0 2px;">✕ Salir</button>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span onclick="AuthManager.showModal()" style="color: #fff; font-weight: 800; font-size: 0.92rem; max-width: 110px; cursor:pointer;" class="truncate" title="Abrir Perfil y Cumpleaños: ${nick}">👤 ${nick}</span>
                <span style="font-family:'JetBrains Mono', monospace; font-size: 0.85rem; color: #f59e0b; font-weight: 800; background: rgba(245, 158, 11, 0.15); padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.35);">🪙 ${pts} PTS</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-top: 4px;">
                <button onclick="AuthManager.abrirModalCumpleanos()" title="Mi Cumpleaños" style="font-size:0.68rem; font-weight:700; background:rgba(236,72,153,0.12); border:1px solid rgba(236,72,153,0.35); color:#f472b6; padding:5px 2px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; transition:all .2s;">
                  <span>🎂</span> <span>Cumple</span>
                </button>
                <button onclick="AuthManager.abrirModalRadar()" title="Mi Radar Jugón" style="font-size:0.68rem; font-weight:700; background:rgba(14,165,233,0.12); border:1px solid rgba(14,165,233,0.35); color:#38bdf8; padding:5px 2px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; transition:all .2s;">
                  <span>📡</span> <span>Radar</span>
                </button>
                <button onclick="AuthManager.abrirModalMercado()" title="Publicar en Mercado" style="font-size:0.68rem; font-weight:700; background:rgba(168,85,247,0.12); border:1px solid rgba(168,85,247,0.35); color:#c084fc; padding:5px 2px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px; transition:all .2s;">
                  <span>🛍️</span> <span>Vender</span>
                </button>
              </div>
              ${!tienePrivada ? `
                <button onclick="AuthManager.abrirModalCrearPassword()" style="margin-top:1px; width:100%; font-size:0.7rem; font-weight:700; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.35); color:#fbbf24; padding:5px 8px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; transition:all .2s;">
                  <span>🔒</span> <span>Blindar con Clave Privada</span>
                </button>
              ` : `
                <div style="font-size:0.65rem; color:#4ade80; display:flex; align-items:center; gap:4px; margin-top:2px;">
                  <span>🛡️</span> <span>Cuenta Blindada (Privada)</span>
                </div>
              `}
            </div>
          `;
        } else {
          sidebarBadge.innerHTML = `
            <button onclick="AuthManager.showModal()" style="width: 100%; justify-content: center; cursor: pointer; border: 1px solid rgba(168, 85, 247, 0.4); padding: 8px 10px; font-size: 0.78rem; font-weight: 800; border-radius: 10px; display: flex; align-items: center; gap: 6px; background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(236, 72, 153, 0.25)); color: #fff; transition: all .2s;">
              <span>🔑</span> <span>Identifícate (Miembro)</span>
            </button>
          `;
        }
      }

      // 3. BADGES EN PANTALLAS DE JUEGO / SETUP
      const statusPts = document.getElementById('cb-status-pts');
      if (statusPts) statusPts.textContent = `🪙 ${pts} PTS`;
      const statusNick = document.getElementById('cb-status-nick');
      if (statusNick) statusNick.textContent = `👤 ${nick}`;
      const ninjaPts = document.getElementById('ninja-status-pts');
      if (ninjaPts) ninjaPts.textContent = `🪙 ${pts} PTS`;

      // 4. SINCRONIZACIÓN EN MEMORIA DE LA TABLA DE RANKING
      if (isAuth && window.App && window.App.data && Array.isArray(window.App.data.ranking_principal)) {
        const row = window.App.data.ranking_principal.find(u => u.nombre && u.nombre.toUpperCase() === nick.toUpperCase());
        if (row) row.puntos = pts;
      }

      // 5. SUGERENCIA PROACTIVA CENTRADA: Si está con clave comunitaria
      if (isAuth && (!this.session.tiene_clave_privada) && !sessionStorage.getItem('aj_dismiss_security_badge')) {
        setTimeout(() => this.mostrarBannerSeguridad(), 700);
      }
    }

    // ─── MODAL VISUAL DE AUTENTICACIÓN ─────────────────────────────────────
    showModal(options = {}) {
      let modal = document.getElementById('aj-auth-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'aj-auth-modal';
        modal.className = 'modal-overlay fade-in';
        modal.style.cssText = 'display:flex; position:fixed; inset:0; background:rgba(4, 4, 14, 0.88); z-index:99999; align-items:center; justify-content:center; backdrop-filter:blur(12px); padding: 16px;';
        document.body.appendChild(modal);
      }

      // Si ya está autenticado, mostrar estado de su sesión actual
      if (this.isAuthenticated()) {
        const u = this.getUser() || {};
        const nick = this.getNick();
        const pts = this.getPoints();
        const tienePrivada = Boolean(this.session && this.session.tiene_clave_privada);
        const telefono = u.telefono || u.phone || '';

        modal.innerHTML = `
          <div class="card glow" style="width:100%; max-width:440px; position:relative; padding:28px; border: 1px solid rgba(168, 85, 247, 0.5); background: linear-gradient(145deg, #111128 0%, #0d0d1e 100%); border-radius: var(--radius-lg); box-shadow: 0 10px 40px rgba(0,0,0,0.7), 0 0 30px rgba(124, 58, 237, 0.25);">
            <button onclick="AuthManager.closeModal()" style="position:absolute; top:16px; right:16px; background:none; border:none; color:var(--text-dim); font-size:1.3rem; cursor:pointer; padding:4px;" title="Cerrar">✕</button>
            
            <div style="text-align:center; margin-bottom:16px;">
              <div style="font-size:2.4rem; margin-bottom:4px; filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.5));">⭐</div>
              <h2 style="font-size:1.3rem; color:var(--text); margin-bottom:2px; font-weight:800;">Sesión Activa</h2>
              <div style="font-size:0.75rem; color:#34d399; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Miembro Verificado</div>
            </div>

            <!-- Resumen de cuenta -->
            <div style="background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 16px; display:flex; flex-direction:column; gap:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.78rem; color:var(--text-dim);">🎮 Nick de Jugador:</span>
                <strong style="font-size:0.95rem; color:#fff;">👤 ${nick}</strong>
              </div>
              ${telefono ? `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.78rem; color:var(--text-dim);">📱 Teléfono (WhatsApp):</span>
                <span style="font-size:0.85rem; font-family:'JetBrains Mono',monospace; color:var(--accent-light);">${telefono}</span>
              </div>` : ''}
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.78rem; color:var(--text-dim);">🪙 Saldo Actual:</span>
                <span style="font-family:'JetBrains Mono',monospace; font-size:0.92rem; color:#f59e0b; font-weight:800; background:rgba(245,158,11,0.15); padding:2px 8px; border-radius:6px; border:1px solid rgba(245,158,11,0.35);">${pts} PTS</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.78rem; color:var(--text-dim);">🛡️ Estado de Seguridad:</span>
                ${tienePrivada ? 
                  `<span style="font-size:0.72rem; color:#4ade80; font-weight:700; background:rgba(74,222,128,0.12); padding:3px 8px; border-radius:6px; border:1px solid rgba(74,222,128,0.3);">🔒 Cuenta Blindada (Privada)</span>` :
                  `<span style="font-size:0.72rem; color:#fbbf24; font-weight:700; background:rgba(245,158,11,0.12); padding:3px 8px; border-radius:6px; border:1px solid rgba(245,158,11,0.3);">🔑 Clave Semanal (Comunitaria)</span>`
                }
              </div>
            </div>

            <!-- HUB NATIVO DE MIEMBRO (SOBERANO) -->
            <div style="margin-bottom: 16px; display:flex; flex-direction:column; gap:8px;">
              <div style="font-size:0.7rem; color:var(--accent-light); font-weight:800; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:1px; display:flex; align-items:center; gap:5px;">
                <span>🌟</span> <span>Hub Nativo de Miembro</span>
              </div>

              <!-- 1. Cumpleaños -->
              <div style="background: rgba(236, 72, 153, 0.08); border: 1px solid rgba(236, 72, 153, 0.28); border-radius: var(--radius-sm); padding: 10px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  <span style="font-size:1.5rem; filter: drop-shadow(0 0 8px rgba(236,72,153,0.4)); flex-shrink:0;">🎂</span>
                  <div style="min-width:0;">
                    <div style="font-size:0.66rem; color:var(--text-dim); text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Mi Cumpleaños</div>
                    <div id="aj-perfil-cumple-txt" style="font-size:0.82rem; font-weight:800; color:#fff; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Consultando...</div>
                  </div>
                </div>
                <button onclick="AuthManager.abrirModalCumpleanos()" style="background: linear-gradient(135deg, #ec4899, #be185d); color: #fff; font-weight: 800; border: none; border-radius: 8px; padding: 7px 11px; font-size: 0.74rem; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 10px rgba(236, 72, 153, 0.35); flex-shrink:0;">
                  ⚙️ Configurar
                </button>
              </div>

              <!-- 2. Radar Jugón -->
              <div style="background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(14, 165, 233, 0.28); border-radius: var(--radius-sm); padding: 10px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  <span style="font-size:1.5rem; filter: drop-shadow(0 0 8px rgba(14,165,233,0.4)); flex-shrink:0;">📡</span>
                  <div style="min-width:0;">
                    <div style="font-size:0.66rem; color:var(--text-dim); text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Mi Radar Jugón</div>
                    <div id="aj-perfil-radar-txt" style="font-size:0.82rem; font-weight:800; color:#fff; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Consultando...</div>
                  </div>
                </div>
                <button onclick="AuthManager.abrirModalRadar()" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); color: #fff; font-weight: 800; border: none; border-radius: 8px; padding: 7px 11px; font-size: 0.74rem; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 10px rgba(14, 165, 233, 0.35); flex-shrink:0;">
                  ⚙️ Configurar
                </button>
              </div>

              <!-- 3. Mercado Jugón -->
              <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.28); border-radius: var(--radius-sm); padding: 10px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  <span style="font-size:1.5rem; filter: drop-shadow(0 0 8px rgba(168,85,247,0.4)); flex-shrink:0;">🛍️</span>
                  <div style="min-width:0;">
                    <div style="font-size:0.66rem; color:var(--text-dim); text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Mercado Jugón</div>
                    <div style="font-size:0.82rem; font-weight:800; color:#fff; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Publicar Juegos (7 días)</div>
                  </div>
                </div>
                <button onclick="AuthManager.abrirModalMercado()" style="background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; font-weight: 800; border: none; border-radius: 8px; padding: 7px 11px; font-size: 0.74rem; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 10px rgba(168, 85, 247, 0.35); flex-shrink:0;">
                  🛍️ Publicar
                </button>
              </div>

              <!-- 4. Misión Diaria (Desafíos de Hoy) -->
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.28); border-radius: var(--radius-sm); padding: 10px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px; min-width:0;">
                  <span style="font-size:1.5rem; filter: drop-shadow(0 0 8px rgba(16,185,129,0.4)); flex-shrink:0;">📋</span>
                  <div style="min-width:0;">
                    <div style="font-size:0.66rem; color:var(--text-dim); text-transform:uppercase; font-weight:800; letter-spacing:0.5px;">Desafíos de Hoy</div>
                    <div id="aj-perfil-mision-txt" style="font-size:0.82rem; font-weight:800; color:#fff; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Consultando...</div>
                  </div>
                </div>
                <button onclick="AuthManager.abrirModalMisiones()" style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-weight: 800; border: none; border-radius: 8px; padding: 7px 11px; font-size: 0.74rem; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 10px rgba(16, 185, 129, 0.35); flex-shrink:0;">
                  📤 Enviar Pruebas
                </button>
              </div>

              <!-- 5. Acceso Moderación Admin (Si es Admin) -->
              ${(this.isAdmin && this.isAdmin()) || ['gandulfox86', 'admin'].includes(nick.toLowerCase()) ? `
                <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 10px 12px; display:flex; flex-direction:column; gap:8px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:1.2rem;">🛡️</span>
                      <span style="font-size:0.75rem; font-weight:800; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px;">Panel de Control Admin</span>
                    </div>
                    <span style="font-size:0.68rem; color:#f59e0b; background:rgba(245,158,11,0.15); padding:2px 6px; border-radius:4px; font-weight:700;">PRO</span>
                  </div>
                  <div style="display:flex; gap:6px;">
                    <button onclick="AuthManager.closeModal(); AuthManager.abrirModalAdminMisiones();" style="flex:1; background:#f59e0b; color:#000; font-weight:800; border:none; border-radius:6px; padding:7px 10px; font-size:0.72rem; cursor:pointer;">
                      📋 Misiones Pendientes
                    </button>
                    <a href="https://script.google.com/macros/s/AKfycbw8BmSMYsRsiI4Qq-cmvFiENgCa-2M7plG8mBarmhKeY9QvnfuQshG-CpOm8aEXlyu9tQ/exec" target="_blank" rel="noopener" style="flex:1; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#fff; font-weight:700; border-radius:6px; padding:7px 10px; font-size:0.72rem; cursor:pointer; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:4px;">
                      🌐 Panel Apps Script ↗
                    </a>
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Acciones -->
            <div style="display:flex; flex-direction:column; gap:10px;">
              ${!tienePrivada ? `
                <button onclick="AuthManager.closeModal(); AuthManager.abrirModalCrearPassword();" style="width:100%; padding:10px 14px; font-size:0.82rem; font-weight:800; background:linear-gradient(135deg, #f59e0b, #d97706); color:#000; border:none; border-radius:var(--radius-sm); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  🔒 Blindar Cuenta con Clave Privada
                </button>
              ` : `
                <button onclick="AuthManager.closeModal(); AuthManager.abrirModalCrearPassword();" style="width:100%; padding:9px 14px; font-size:0.8rem; font-weight:700; background:rgba(255,255,255,0.06); border:1px solid var(--border); color:var(--text); border-radius:var(--radius-sm); cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                  🔑 Cambiar mi Contraseña Privada
                </button>
              `}
              <div style="display:flex; gap:10px; margin-top:2px;">
                <button onclick="AuthManager.logout(); AuthManager.showModal();" style="flex:1; padding:9px 12px; font-size:0.78rem; font-weight:700; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#f87171; border-radius:var(--radius-sm); cursor:pointer;">
                  🚪 Cambiar Cuenta
                </button>
                <button onclick="AuthManager.closeModal()" style="flex:1; padding:9px 12px; font-size:0.78rem; font-weight:800; background:rgba(255,255,255,0.08); border:1px solid var(--border); color:#fff; border-radius:var(--radius-sm); cursor:pointer;">
                  ✅ Cerrar
                </button>
              </div>
            </div>
          </div>
        `;
        modal.style.display = 'flex';
        this._cargarCumpleanosEnPerfil(nick);
        this._cargarRadarEnPerfil(nick);
        this._cargarMisionEnPerfil(nick);
        return;
      }

      const isDevPrompt = options.isDevPrompt || false;
      const reasonMsg = options.reason || 'Ingresa tus credenciales del Club Amigos Jugones para identificarte y desbloquear las funciones de miembro.';

      modal.innerHTML = `
        <div class="card glow" style="width:100%; max-width:440px; position:relative; padding:28px; border: 1px solid rgba(168, 85, 247, 0.5); background: linear-gradient(145deg, #111128 0%, #0d0d1e 100%); border-radius: var(--radius-lg); box-shadow: 0 10px 40px rgba(0,0,0,0.7), 0 0 30px rgba(124, 58, 237, 0.25);">
          
          <button onclick="AuthManager.closeModal()" style="position:absolute; top:16px; right:16px; background:none; border:none; color:var(--text-dim); font-size:1.3rem; cursor:pointer; padding:4px;" title="Cerrar">✕</button>
          
          <div style="text-align:center; margin-bottom:14px;">
            <div style="font-size:2.5rem; margin-bottom:4px; filter: drop-shadow(0 0 12px rgba(236, 72, 153, 0.5));">🎲</div>
            <h2 style="font-size:1.35rem; color:var(--text); margin-bottom:2px; font-weight:800; letter-spacing:-0.5px;">Acceso de Miembros</h2>
            <div style="font-size:0.75rem; color:var(--accent-light); font-weight:600; text-transform:uppercase; letter-spacing:1px;">Club Amigos Jugones</div>
          </div>

          <!-- Aclaración: Autenticación por Única Vez -->
          <div style="background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 16px; font-size: 0.76rem; color: var(--text-dim); line-height: 1.45;">
            <strong style="color: var(--accent-light); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <span>🛡️</span> Autenticación por Única Vez
            </strong>
            Al identificarte, el navegador guarda tu credencial segura de miembro. No tendrás que volver a ingresar tus datos ni depender de cambios de clave para usar los juegos y formularios comunitarios.
          </div>

          <p style="font-size:0.78rem; color:var(--text-dim); text-align:center; line-height:1.4; margin-bottom:16px;">
            ${reasonMsg}
          </p>

          <!-- Formulario Directo -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
              <label style="font-size:0.75rem; color:var(--text-dim); font-weight:600; margin-bottom:4px; display:block;">📱 Número de Teléfono (WhatsApp)</label>
              <input type="tel" id="aj-auth-phone" placeholder="+569..." style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text); font-size:0.85rem; outline:none;" />
            </div>

            <div>
              <label style="font-size:0.75rem; color:var(--text-dim); font-weight:600; margin-bottom:4px; display:block;">🎮 Nick de Jugador</label>
              <input type="text" id="aj-auth-nick" placeholder="Tu apodo en el grupo" style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text); font-size:0.85rem; outline:none;" />
            </div>

            <div>
              <label style="font-size:0.75rem; color:var(--text-dim); font-weight:600; margin-bottom:4px; display:block;">🔑 Clave Semanal del Grupo</label>
              <input type="password" id="aj-auth-key" placeholder="Consulta la clave en el grupo de WhatsApp" style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.04); border:1px solid var(--border); border-radius:var(--radius-sm); color:var(--text); font-size:0.85rem; outline:none;" />
            </div>

            <div id="aj-auth-error" style="display:none; color:var(--red); font-size:0.75rem; background:rgba(239, 68, 68, 0.12); padding:8px 10px; border-radius:var(--radius-sm); border:1px solid rgba(239, 68, 68, 0.3);"></div>

            <button id="aj-auth-submit-btn" onclick="AuthManager.handleModalSubmit()" class="arcade-start-btn" style="width:100%; padding:12px; font-size:0.9rem; font-weight:800; text-transform:uppercase; margin-top:4px; background:linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color:white; border:none; border-radius:var(--radius-sm); cursor:pointer; letter-spacing:0.5px; transition:all 0.2s ease;">
              Verificar y Entrar 🚀
            </button>
          </div>

        </div>
      `;
      modal.style.display = 'flex';
    }

    closeModal() {
      const modal = document.getElementById('aj-auth-modal');
      if (modal) modal.style.display = 'none';
    }

    async handleModalSubmit() {
      const phoneInput = document.getElementById('aj-auth-phone');
      const nickInput = document.getElementById('aj-auth-nick');
      const keyInput = document.getElementById('aj-auth-key');
      const errorDiv = document.getElementById('aj-auth-error');
      const btn = document.getElementById('aj-auth-submit-btn');

      const phone = phoneInput ? phoneInput.value.trim() : '';
      const nick = nickInput ? nickInput.value.trim() : '';
      const key = keyInput ? keyInput.value.trim() : '';

      if (!phone || !key) {
        if (errorDiv) {
          errorDiv.textContent = 'Por favor ingresa tu teléfono y la clave.';
          errorDiv.style.display = 'block';
        }
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Verificando... ⏳';
      }

      const res = await this.loginWithCredentials(phone, nick, key);

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Verificar y Entrar 🚀';
      }

      if (!res.ok) {
        if (errorDiv) {
          let msg = res.message || 'Error al validar credenciales.';
          // Enriquecer mensaje para límite de dispositivos
          if (res.error === 'limite_dispositivos_alcanzado') {
            errorDiv.innerHTML = `
              ${msg}
              ${res.sugerir_crear_privada ? `<br><br><button onclick="AuthManager.closeModal(); AuthManager.abrirModalCrearPassword();" style="background:linear-gradient(135deg,#7c3aed,#ec4899); color:#fff; border:none; border-radius:6px; padding:7px 12px; font-size:0.72rem; font-weight:700; cursor:pointer; margin-top:4px;">🔒 Crear Contraseña Privada</button>` : ''}
            `;
          } else {
            errorDiv.textContent = msg;
          }
          errorDiv.style.display = 'block';
        }
      }
    }
  }

  // ─── MODAL PROYECTO MIEMBRO DESTACADO (CREADORES, TIENDAS, etc.) ───────────
  async abrirModalProyecto(categoria = 'creadores') {
    const isAuth = this.isAuthenticated();
    if (!isAuth) {
      this.showModal({ reason: 'Identifícate para registrar tu proyecto en la comunidad.' });
      return;
    }
    this.closeModal();

    const CATS = {
      creadores:      { label: 'Creadores en Amigos Jugones',    icon: '🎬', placeholder_nombre: 'Nombre de tu canal o perfil', placeholder_enlace: 'URL de YouTube, Twitch, etc.' },
      organizaciones: { label: 'Organizaciones en Amigos Jugones', icon: '🏢', placeholder_nombre: 'Nombre de la organización',    placeholder_enlace: 'Web o redes de la organización' },
      tiendas:        { label: 'Tiendas en Amigos Jugones',       icon: '🛍️', placeholder_nombre: 'Nombre de tu tienda',           placeholder_enlace: 'Web o Instagram de la tienda' },
      participantes:  { label: 'Tu perfil en Instagram',          icon: '📷', placeholder_nombre: 'Tu nombre o nickname',          placeholder_enlace: 'URL de tu perfil de Instagram' },
      divulgadores:   { label: 'Tus redes de divulgación',        icon: '📡', placeholder_nombre: 'Tu nombre o canal',             placeholder_enlace: 'URL principal de tus redes' },
    };

    const cat = CATS[categoria] || CATS['creadores'];
    const nick = this.getNick();
    const modalId = 'aj-proyecto-modal';

    let modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(4,4,16,0.92); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:16px;';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="card glow custom-scrollbar" style="width:100%; max-width:480px; background:linear-gradient(145deg,#0f0f1e,#080814); border:1px solid rgba(168,85,247,0.4); border-radius:16px; padding:28px 24px; position:relative; max-height:92vh; overflow-y:auto;">
        <button onclick="document.getElementById('${modalId}').remove()" style="position:absolute; top:12px; right:12px; background:rgba(255,255,255,0.08); border:none; color:#94a3b8; border-radius:8px; width:30px; height:30px; cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center;">✕</button>

        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:2.5rem; margin-bottom:6px; filter:drop-shadow(0 0 14px rgba(168,85,247,0.5));">${cat.icon}</div>
          <h2 style="font-size:1.1rem; color:#fff; font-weight:800; margin:0 0 4px; letter-spacing:0.5px;">${cat.label}</h2>
          <div style="font-size:0.68rem; color:#a855f7; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">REGISTRO COMUNITARIO</div>
        </div>

        <div id="aj-proyecto-msg" style="display:none; padding:10px 14px; border-radius:8px; margin-bottom:14px; font-size:0.82rem; font-weight:600;"></div>

        <form id="aj-proyecto-form" style="display:flex; flex-direction:column; gap:14px;" onsubmit="return false;">
          <div>
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px;">Nombre del proyecto *</label>
            <input id="aj-proy-nombre" type="text" placeholder="${cat.placeholder_nombre}"
              style="width:100%; padding:11px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(168,85,247,0.3); border-radius:8px; color:#fff; font-size:0.88rem; outline:none; box-sizing:border-box;"
              required maxlength="120">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px;">Enlace / URL *</label>
            <input id="aj-proy-enlace" type="url" placeholder="${cat.placeholder_enlace}"
              style="width:100%; padding:11px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(168,85,247,0.3); border-radius:8px; color:#fff; font-size:0.88rem; outline:none; box-sizing:border-box;"
              required maxlength="300">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#94a3b8; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.8px;">Descripción breve (opcional)</label>
            <textarea id="aj-proy-desc" placeholder="Cuéntanos un poco sobre tu proyecto..."
              rows="3" style="width:100%; padding:11px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(168,85,247,0.3); border-radius:8px; color:#fff; font-size:0.85rem; outline:none; resize:vertical; box-sizing:border-box; font-family:inherit;" maxlength="400"></textarea>
          </div>

          <button id="aj-proy-btn" type="submit" onclick="AuthManager._submitProyecto('${categoria}', '${nick}')"
            style="width:100%; padding:13px; background:linear-gradient(135deg,#7c3aed,#a855f7); color:#fff; border:none; border-radius:10px; font-size:0.92rem; font-weight:800; cursor:pointer; letter-spacing:0.5px; text-transform:uppercase; transition:opacity 0.2s;">
            ${cat.icon} Enviar Solicitud
          </button>
        </form>

        <div style="margin-top:16px; text-align:center; font-size:0.72rem; color:#475569; line-height:1.5;">
          Tu solicitud será revisada por el equipo de Amigos Jugones antes de aparecer en la sección.
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  }

  async _submitProyecto(categoria, nick) {
    const btn = document.getElementById('aj-proy-btn');
    const msgDiv = document.getElementById('aj-proyecto-msg');
    const nombre = (document.getElementById('aj-proy-nombre')?.value || '').trim();
    const enlace = (document.getElementById('aj-proy-enlace')?.value || '').trim();
    const desc = (document.getElementById('aj-proy-desc')?.value || '').trim();

    if (!nombre || !enlace) {
      if (msgDiv) {
        msgDiv.style.display = 'block';
        msgDiv.style.background = 'rgba(239,68,68,0.15)';
        msgDiv.style.color = '#f87171';
        msgDiv.style.border = '1px solid rgba(239,68,68,0.3)';
        msgDiv.textContent = '⚠️ Nombre y enlace son obligatorios.';
      }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Enviando... ⏳'; }

    try {
      const apiBase = AUTH_CONFIG.apiUrl('');
      const url = apiBase ? `${apiBase}/api/solicitudes/miembro_destacado` : '/api/solicitudes/miembro_destacado';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, categoria, nombre_proyecto: nombre, enlace, descripcion: desc })
      });
      const data = await res.json();
      if (msgDiv) {
        msgDiv.style.display = 'block';
        if (data.ok) {
          msgDiv.style.background = 'rgba(16,185,129,0.15)';
          msgDiv.style.color = '#34d399';
          msgDiv.style.border = '1px solid rgba(16,185,129,0.3)';
          msgDiv.textContent = '✅ ' + (data.mensaje || '¡Solicitud enviada! Será revisada pronto.');
          document.getElementById('aj-proyecto-form')?.reset();
          if (btn) { btn.disabled = true; btn.textContent = '✅ Enviado'; }
        } else {
          msgDiv.style.background = 'rgba(239,68,68,0.15)';
          msgDiv.style.color = '#f87171';
          msgDiv.style.border = '1px solid rgba(239,68,68,0.3)';
          msgDiv.textContent = '❌ ' + (data.error || 'Error al enviar. Intenta de nuevo.');
          if (btn) { btn.disabled = false; btn.textContent = '🔄 Reintentar'; }
        }
      }
    } catch (err) {
      if (msgDiv) {
        msgDiv.style.display = 'block';
        msgDiv.style.background = 'rgba(239,68,68,0.15)';
        msgDiv.style.color = '#f87171';
        msgDiv.style.border = '1px solid rgba(239,68,68,0.3)';
        msgDiv.textContent = '❌ Error de conexión. Intenta de nuevo.';
      }
      if (btn) { btn.disabled = false; btn.textContent = '🔄 Reintentar'; }
    }
  }

  // Instancia Global
  window.AuthManager = new AuthManagerClass();
  window.cumpleanosAbrirModal = () => window.AuthManager && window.AuthManager.abrirModalCumpleanos();
  window.mercadoAbrirModal = () => window.AuthManager && window.AuthManager.abrirModalMercado();
  window.radarAbrirModal = () => window.AuthManager && window.AuthManager.abrirModalRadar();

})(window);
