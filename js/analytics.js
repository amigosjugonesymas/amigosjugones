/**
 * =============================================================================
 * AMIGOS JUGONES — ANALYTICS PRIVADO
 * =============================================================================
 * Sistema de rastreo tipo Google Analytics, 100% privado y local.
 * Registra pageviews de visitantes anónimos y miembros autenticados.
 * Datos almacenados en Turso (compatible SQLite) con Rolling Archive automático.
 *
 * Funcionamiento:
 *  1. Al cargar la página, registra un pageview con visitor_id anónimo o nick.
 *  2. Al salir de la página (beforeunload / visibilitychange), reporta la duración.
 *  3. Compatible con modo SPA (llamar AJ_Analytics.track() en cada cambio de ruta).
 *  4. No usa cookies. El visitor_id se persiste en localStorage.
 *  5. Respeta al admin: no registra visitas del usuario "BLACK" ni del panel admin.
 * =============================================================================
 */

(function () {
    'use strict';

    const ANALYTICS_ENDPOINT = '/api/analytics/pageview';
    const DURACION_ENDPOINT  = '/api/analytics/duracion';

    // ─── Utilidades ──────────────────────────────────────────────────────────

    /**
     * Genera un UUID v4 simple (no criptográfico, suficiente para visitor_id).
     */
    function _uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * Detecta el tipo de dispositivo basado en el User Agent y tamaño de pantalla.
     * @returns {'mobile'|'tablet'|'desktop'}
     */
    function _detectarDispositivo() {
        const ua = navigator.userAgent.toLowerCase();
        const ancho = window.innerWidth || document.documentElement.clientWidth || 800;
        if (/tablet|ipad|playbook|silk/i.test(ua) || (ancho >= 600 && ancho <= 1024 && /mobile/i.test(ua))) {
            return 'tablet';
        }
        if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua) || ancho < 600) {
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Obtiene o crea el visitor_id persistente en localStorage.
     * @returns {string} UUID único del visitante
     */
    function _getVisitorId() {
        const KEY = 'aj_visitor_id';
        let vid = localStorage.getItem(KEY);
        if (!vid) {
            vid = _uuid();
            localStorage.setItem(KEY, vid);
        }
        return vid;
    }

    /**
     * Obtiene o crea un session_id que dura hasta cerrar la pestaña (sessionStorage).
     * @returns {string} UUID único de la sesión
     */
    function _getSessionId() {
        const KEY = 'aj_session_id';
        let sid = sessionStorage.getItem(KEY);
        if (!sid) {
            sid = _uuid();
            sessionStorage.setItem(KEY, sid);
        }
        return sid;
    }

    /**
     * Obtiene el nick del miembro autenticado, o null si es visitante.
     * @returns {string|null}
     */
    function _getNick() {
        try {
            // Usa AuthManager si está disponible
            if (window.AuthManager && typeof window.AuthManager.isAuthenticated === 'function') {
                if (window.AuthManager.isAuthenticated()) {
                    const nick = window.AuthManager.getCurrentNick
                        ? window.AuthManager.getCurrentNick()
                        : window.AuthManager._data?.nick || null;
                    return nick || null;
                }
            }
            // Fallback: leer desde localStorage
            const raw = localStorage.getItem('aj_session_v1');
            if (raw) {
                const s = JSON.parse(raw);
                return s.nick || null;
            }
        } catch (e) { /* silenciar */ }
        return null;
    }

    /**
     * ¿Es el usuario el administrador (BLACK)?
     * Evitamos registrar visitas del admin para no contaminar las métricas.
     */
    function _esAdmin(nick) {
        if (!nick) return false;
        return nick.toUpperCase() === 'BLACK';
    }

    /**
     * Obtiene la ruta de la página actual de forma limpia.
     * @returns {string} ej: '/ranking.html', '/juegos/carrera.html'
     */
    function _getRuta() {
        const path = window.location.pathname;
        // Normalizar index.html → /
        if (path === '/index.html') return '/';
        return path;
    }

    // ─── Estado interno del tracker ──────────────────────────────────────────

    let _visita_id     = null;   // ID de la visita actual (para actualizar duración)
    let _inicio_ts     = null;   // Timestamp de inicio de la página actual (ms)
    let _pagina_actual = null;   // Ruta de la página actual rastreada
    let _reportado     = false;  // ¿Ya se reportó la duración al salir?
    let _activo        = false;  // ¿El tracker está activo?

    // ─── Core: Registrar pageview ─────────────────────────────────────────────

    /**
     * Registra una visita de página al servidor.
     * Se llama automáticamente al cargar el módulo y se puede llamar manualmente
     * en SPAs al cambiar de ruta: AJ_Analytics.track('/nueva-ruta', 'Título')
     *
     * @param {string} [rutaOverride] - Ruta manual para SPAs
     * @param {string} [tituloOverride] - Título manual para SPAs
     */
    async function track(rutaOverride, tituloOverride) {
        // Reportar duración de la página anterior si la hubo
        if (_visita_id && _inicio_ts) {
            _reportarDuracion();
        }

        // Resetear estado
        _visita_id  = null;
        _inicio_ts  = Date.now();
        _reportado  = false;

        const nick  = _getNick();

        // No registrar visitas del admin
        if (_esAdmin(nick)) return;

        const pagina     = rutaOverride || _getRuta();
        const titulo     = tituloOverride || document.title || '';
        const visitorId  = _getVisitorId();
        const sessionId  = _getSessionId();
        const dispositivo = _detectarDispositivo();
        const referrer   = document.referrer ? new URL(document.referrer).pathname : '';

        _pagina_actual = pagina;

        const payload = {
            visitor_id:  visitorId,
            pagina:      pagina,
            titulo:      titulo.substring(0, 150),
            nick:        nick || '',
            tipo:        nick ? 'miembro' : 'visitante',
            dispositivo: dispositivo,
            referrer:    referrer,
            session_id:  sessionId
        };

        try {
            const res = await fetch(ANALYTICS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.ok) {
                    _visita_id = data.id;
                }
            }
        } catch (e) {
            // Fallo silencioso — analytics nunca debe interrumpir la UX
        }
    }

    // ─── Reportar duración al salir ───────────────────────────────────────────

    /**
     * Calcula la duración y la envía al servidor via sendBeacon (confiable al salir).
     * sendBeacon no bloquea el cierre de la página.
     */
    function _reportarDuracion() {
        if (_reportado || !_visita_id || !_inicio_ts) return;
        _reportado = true;

        const duracion_seg = Math.round((Date.now() - _inicio_ts) / 1000);
        if (duracion_seg < 1) return;  // No reportar si estuvo menos de 1 segundo

        const payload = JSON.stringify({
            visita_id:   _visita_id,
            duracion_seg: duracion_seg
        });

        // sendBeacon es la forma más confiable de enviar datos al cerrar/salir
        const blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon) {
            navigator.sendBeacon(DURACION_ENDPOINT, blob);
        } else {
            // Fallback para navegadores sin sendBeacon (muy raro en 2026)
            fetch(DURACION_ENDPOINT, {
                method: 'POST',
                body: blob,
                keepalive: true
            }).catch(() => {});
        }
    }

    // ─── Hooks de ciclo de vida ───────────────────────────────────────────────

    /**
     * Inicia el tracker. Se llama una vez al cargar el módulo.
     * Registra el primer pageview y adjunta los listeners de salida.
     */
    function _iniciar() {
        if (_activo) return;
        _activo = true;

        // Registrar el pageview inicial
        // Pequeño delay para permitir que AuthManager inicialice primero
        setTimeout(function () {
            track();
        }, 500);

        // Reportar duración al cerrar la pestaña
        window.addEventListener('beforeunload', function () {
            _reportarDuracion();
        });

        // Reportar duración cuando la pestaña se vuelve invisible (cambio de tab, minimizar)
        // Esto es más confiable que beforeunload en móviles
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') {
                _reportarDuracion();
            } else if (document.visibilityState === 'visible') {
                // El usuario volvió — reiniciar el contador de duración si ya habíamos reportado
                if (_reportado && _visita_id) {
                    _inicio_ts = Date.now();
                    _reportado = false;
                }
            }
        });
    }

    // ─── API Pública ──────────────────────────────────────────────────────────

    /**
     * API pública del módulo de Analytics de Amigos Jugones.
     *
     * Métodos:
     *  - AJ_Analytics.track(ruta?, titulo?) → Registra un pageview (usar en SPAs)
     *  - AJ_Analytics.getVisitorId() → Obtiene el visitor_id del usuario actual
     *
     * El tracking comienza automáticamente al cargar este script.
     */
    window.AJ_Analytics = {
        track: track,
        getVisitorId: _getVisitorId,
        getSessionId: _getSessionId
    };

    // ─── Auto-arranque ────────────────────────────────────────────────────────

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _iniciar);
    } else {
        _iniciar();
    }

})();
