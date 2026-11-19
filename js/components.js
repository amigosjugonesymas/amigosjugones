/**
 * AMIGOS JUGONES V2 — COMPONENTES DE ESQUELETO (Multi-Page)
 * Maneja la inyección del Sidebar y el Topbar en todas las páginas.
 */

const NAV_ITEMS = [
    { id: 'inicio', icon: '🏠', label: 'Inicio', url: 'index.html', section: 'Principal' },
    { id: 'criptico', icon: '🧠', label: 'Críptico del Día', url: 'criptico.html', section: 'Principal' },
    { id: 'trivia', icon: '🧩', label: 'Trivia Geek', url: 'trivia.html', section: 'Principal' },
    { id: 'juegos', icon: '🎮', label: 'Juegos & Arcade', url: 'juegos.html', section: 'Principal' },
    { id: 'torneos', icon: '🏆', label: 'Torneos BGA', url: 'torneos.html', section: 'Comunidad', cat: 'competencia' },
    { id: 'concursos', icon: '🥇', label: 'Concursos', url: 'concursos.html', section: 'Comunidad', cat: 'competencia' },
    { id: 'eventos', icon: '🌟', label: 'Eventos Destacados', url: 'eventos.html', section: 'Comunidad', cat: 'competencia' },
    { id: 'juntas', icon: '🎲', label: 'Juntas & Partidas', url: 'juntas.html', section: 'Comunidad', cat: 'agenda' },
    { id: 'calendario', icon: '📅', label: 'Calendario', url: 'calendario.html', section: 'Comunidad', cat: 'agenda' },
    { id: 'radar', icon: '🎯', label: 'Radar Jugón', url: 'radar.html', section: 'Comunidad', cat: 'social' },
    { id: 'mercado', icon: '🛍️', label: 'El Mercado Jugón', url: 'mercado.html', section: 'Comunidad', cat: 'social' },
    { id: 'encuestas', icon: '🗳️', label: 'Encuestas Geek', url: 'encuestas.html', section: 'Comunidad', cat: 'social' },
    { id: 'miembros', icon: '⭐', label: 'Miembros Destacados', url: 'miembros.html', section: 'Comunidad', cat: 'social' },
    { id: 'ranking', icon: '📊', label: 'Rankings Comunidad', url: 'ranking.html', section: 'Comunidad', cat: 'social' },
    { id: 'sala-de-la-fama', icon: '🏆', label: 'Sala de la Fama', url: 'sala-de-la-fama.html', section: 'Comunidad', cat: 'social' },
    { id: 'salon-de-honor', icon: '🎖️', label: 'Salón de Honor', url: 'salon-de-honor.html', section: 'Comunidad', cat: 'social' },
    { id: 'instagram', icon: '📸', label: 'Novedades IG', url: 'instagram.html', section: 'Comunidad', cat: 'social' },
    { id: 'documentos', icon: '📄', label: 'Documentos', url: 'documentos.html', section: 'Recursos' },
    { id: 'formularios', icon: '📝', label: 'Formularios', url: 'formularios.html', section: 'Recursos' },
    { id: 'realeza', icon: '👑', label: 'Administración', url: 'realeza.html', section: 'Administración' }
];

// Páginas de juego independientes que pertenecen al ecosistema arcade
const INTERNAL_PAGE_MAP = {
    'carrera.html': { id: 'carrera', icon: '🏎️', label: 'Circuito Carrera' },
    'pelea.html': { id: 'pelea', icon: '⚔️', label: 'Cyber Ninja (Dohyō)' },
    'criptico.html': { id: 'criptico', icon: '🧠', label: 'Críptico del Día' },
    'trivia.html': { id: 'trivia', icon: '🧩', label: 'Trivia Geek del Día' }
};

/**
 * toggleCatGroup() — abre/cierra un grupo de categoría del sidebar
 */
window.toggleCatGroup = function(catId) {
    const body = document.getElementById('catgroup-body-' + catId);
    const hdr  = document.getElementById('catgroup-hdr-' + catId);
    if (!body || !hdr) return;
    const isOpen = body.classList.toggle('cg-open');
    hdr.classList.toggle('cg-active', isOpen);
    const chevron = hdr.querySelector('.cg-chevron');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    try {
        localStorage.setItem('aj_catgroup_' + catId, isOpen ? 'open' : 'closed');
    } catch(e) {}
};

function getCurrentPageId() {
    const path = window.location.pathname || '';
    const cleanPath = path.split('?')[0].split('#')[0];
    const segments = cleanPath.split('/').filter(Boolean);
    const page = segments.pop() || 'index.html';

    if (INTERNAL_PAGE_MAP[page]) {
        return INTERNAL_PAGE_MAP[page].id;
    }
    const item = NAV_ITEMS.find(n => n.url === page);
    if (item) return item.id;

    if (window.App && window.App.currentSection) {
        return window.App.currentSection;
    }
    return 'inicio';
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const currentPageId = getCurrentPageId();

    const mainItems        = NAV_ITEMS.filter(n => n.section === 'Principal');
    const catCompetencia   = NAV_ITEMS.filter(n => n.section === 'Comunidad' && n.cat === 'competencia');
    const catAgenda        = NAV_ITEMS.filter(n => n.section === 'Comunidad' && n.cat === 'agenda');
    const catSocial        = NAV_ITEMS.filter(n => n.section === 'Comunidad' && n.cat === 'social');
    const resourceItems    = NAV_ITEMS.filter(n => n.section === 'Recursos');
    const adminItems       = NAV_ITEMS.filter(n => n.section === 'Administración');

    function getNavLabel(item) {
        if (typeof window.__t === 'function') {
            const i18nKey = 'nav_' + item.id.replace(/-/g, '_');
            const translated = window.__t(i18nKey);
            if (translated && translated !== i18nKey) return translated;
        }
        return item.label;
    }

    function buildNavGroup(items, title) {
        let html = '';
        if (title) {
            const sectionLabel = (typeof window.__t === 'function') ? window.__t('section_' + title.toLowerCase()) || title : title;
            html += `<div class="nav-section-label" style="${title !== 'Principal' ? 'margin-top:8px' : ''}">${sectionLabel}</div>`;
        }
        items.forEach(item => {
            const active = currentPageId === item.id ? ' active' : '';
            const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
            const lbl = getNavLabel(item);
            html += `
                <a href="${item.url}" class="nav-item${active}" data-section="${item.id}">
                    <span class="nav-icon">${item.icon}</span>
                    <span>${lbl}</span>
                    ${badge}
                </a>
            `;
        });
        return html;
    }

    /**
     * buildCatGroup — card-header visual con degradado de color por categoría
     * @param {string} catId   - clave única para localStorage y DOM ids
     * @param {string} icon    - emoji grande de cabecera
     * @param {string} title   - título del grupo
     * @param {string} grad    - clase CSS de degradado del header
     * @param {object[]} items - lista de nav items del grupo
     */
    function buildCatGroup(catId, icon, title, grad, items) {
        const hasActive = items.some(i => i.id === currentPageId);
        let isOpen = false; // Estado base: cerrado por defecto
        try {
            const saved = localStorage.getItem('aj_catgroup_' + catId);
            isOpen = saved === 'open'; // Solo abierto si el usuario lo abrió explícitamente
        } catch(e) { isOpen = false; }
        const count = items.length;
        let html = `
            <div class="cg-wrapper">
                <button class="cg-header ${grad}${isOpen ? ' cg-active' : ''}" id="catgroup-hdr-${catId}"
                        onclick="window.toggleCatGroup('${catId}')" type="button"
                        title="Abrir o cerrar ${title}">
                    <span class="cg-header-left">
                        <span class="cg-big-icon">${icon}</span>
                        <span class="cg-title-wrap">
                            <span class="cg-title">${title}</span>
                            <span class="cg-subtitle">${count} módulos</span>
                        </span>
                    </span>
                    <span class="cg-chevron" style="transform:${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}">&#8964;</span>
                </button>
                <div class="cg-body${isOpen ? ' cg-open' : ''}" id="catgroup-body-${catId}">
        `;
        items.forEach(item => {
            const active = currentPageId === item.id ? ' active' : '';
            const lbl = getNavLabel(item);
            html += `
                <a href="${item.url}" class="nav-item cg-nav-item${active}" data-section="${item.id}">
                    <span class="nav-icon">${item.icon}</span>
                    <span>${lbl}</span>
                </a>
            `;
        });
        html += `</div></div>`;
        return html;
    }

    sidebar.innerHTML = `
        <!-- Brand -->
        <a href="index.html" class="sidebar-brand" style="text-decoration:none;">
            <img src="imagenes/LOGO%20AMIGOS%20JUGONES.png" alt="Logo" class="sidebar-logo">
            <div class="sidebar-brand-text">
                <div class="brand-name">Amigos Jugones</div>
                <div class="brand-sub">Comunidad Gamer</div>
            </div>
        </a>

        <!-- Auth / Saldo de Puntos Badge para Desktop -->
        <div id="aj-sidebar-auth" style="padding: 6px 14px 4px 14px;"></div>

        <!-- Notificaciones Privadas para Desktop (Movimientos de Puntos) -->
        <div style="padding: 0 14px 6px 14px;">
            <div class="notif-widget" style="width: 100%;">
                <button class="notif-sidebar-btn" id="btn-notif-sidebar" onclick="notifAbrirPrivadas()" title="Mis notificaciones y movimientos de puntos">
                    <span style="display: flex; align-items: center; gap: 8px;">
                        <span>🔔</span> <span>Mis Notificaciones</span>
                    </span>
                    <span class="notif-badge" id="notif-badge-sidebar" style="display:none;">0</span>
                </button>
            </div>
        </div>

        <!-- Nav -->
        <nav id="sidebar-nav" class="sidebar-nav">
            ${buildNavGroup(mainItems, 'Principal')}
            <div class="nav-section-label" style="margin-top:10px;">Comunidad</div>
            <div class="cg-container">
                ${buildCatGroup('competencia', '🏆', 'Torneos & Competencia', 'cg-grad-gold', catCompetencia)}
                ${buildCatGroup('agenda', '📅', 'Actividades & Agenda', 'cg-grad-blue', catAgenda)}
                ${buildCatGroup('social', '👥', 'Comunidad & Social', 'cg-grad-pink', catSocial)}
            </div>
            ${buildNavGroup(resourceItems, 'Recursos')}
            ${buildNavGroup(adminItems, 'Administración')}
        </nav>


        <!-- Footer social -->
        <div class="sidebar-footer">
            <!-- Widget Usuarios Online -->
            <div class="online-widget" id="online-widget">
                <button class="online-pill" id="btn-online-toggle" onclick="onlineTogglePanel()">
                    <span class="online-dot" id="online-dot"></span>
                    <span id="online-label">conectando...</span>
                </button>
                <div class="online-panel" id="online-panel" style="display:none;">
                    <div class="online-panel-header">🟢 En línea ahora</div>
                    <div id="online-user-list" class="online-user-list">
                        <div class="online-loading">Cargando...</div>
                    </div>
                </div>
            </div>

            <!-- Redes sociales -->
            <div class="sidebar-social-row">
                <a id="sidebar-ig" href="#" target="_blank" class="sidebar-social-btn ig" title="Instagram">
                    <img src="imagenes/INSTAGRAM.png" alt="Instagram" style="width:32px;height:32px;object-fit:contain;border-radius:0;">
                </a>
                <a id="sidebar-ws" href="#" target="_blank" class="sidebar-social-btn ws" title="WhatsApp">
                    <img src="imagenes/WHATSAPP.png" alt="WhatsApp" style="width:32px;height:32px;object-fit:contain;border-radius:0;">
                </a>
                <a id="sidebar-bga" href="#" target="_blank" class="sidebar-social-btn bga" title="Board Game Arena">
                    <img src="imagenes/BGA.png" alt="BGA" style="width:32px;height:32px;object-fit:contain;border-radius:0;">
                </a>
            </div>
        </div>
    `;

    if (window.AuthManager && typeof window.AuthManager.updateNavbarBadges === 'function') {
        window.AuthManager.updateNavbarBadges();
    }
    if (window.AJSkinEngine && typeof window.AJSkinEngine.applyNav === 'function') {
        window.AJSkinEngine.applyNav();
    }
}

function renderTopbar() {
    const topbar = document.getElementById('topbar');
    if (!topbar) return;

    const currentItem = NAV_ITEMS.find(n => n.id === getCurrentPageId()) || INTERNAL_PAGE_MAP[window.location.pathname.split('/').pop()] || NAV_ITEMS[0];

    topbar.innerHTML = `
        <button id="hamburguesa" class="hamburger" aria-label="Menú" style="flex-shrink:0;">
            <span></span><span></span><span></span>
        </button>
        <div class="topbar-brand" style="min-width:0; flex:1; display:flex; align-items:center; gap:8px; overflow:hidden;">
            <img src="imagenes/LOGO%20AMIGOS%20JUGONES.png" alt="Logo"
                style="width:26px; height:26px; border-radius:50%; object-fit:cover; flex-shrink:0;">
            <span id="topbar-section-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; flex:1; max-width:115px; display:inline-block; font-size:0.85rem;">${currentItem.icon} ${currentItem.label}</span>
        </div>
        <div style="margin-left:auto; display:flex; align-items:center; gap:6px; flex-shrink:0;">
            <!-- Campana de Notificaciones Privadas (Mobile) -->
            <div class="notif-widget" style="flex-shrink:0;">
                <button class="notif-topbar-btn" id="btn-notif-topbar" onclick="notifAbrirPrivadas()" title="Mis notificaciones y movimientos de puntos">
                    <span>🔔</span>
                    <span class="notif-badge" id="notif-badge-topbar" style="display:none;">0</span>
                </button>
            </div>

            <!-- Auth Badge -->
            <div id="aj-auth-badge" style="display:flex; align-items:center; flex-shrink:0;"></div>
        </div>
    `;

    if (window.AuthManager && typeof window.AuthManager.updateNavbarBadges === 'function') {
        window.AuthManager.updateNavbarBadges();
    }
    if (window.AJSkinEngine && typeof window.AJSkinEngine.applyNav === 'function') {
        window.AJSkinEngine.applyNav();
    }
}

// ─── WIDGET DE USUARIOS ONLINE ────────────────────────────────────────────────

/**
 * Genera un color único y consistente para un nick dado.
 */
function onlineNickColor(nick) {
    const colors = ['#7c3aed','#db2777','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#4f46e5'];
    let hash = 0;
    for (let i = 0; i < nick.length; i++) hash = nick.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

/**
 * Genera un avatar de iniciales como elemento HTML.
 */
function onlineAvatarHTML(usuario) {
    const nick = usuario.nick || '?';
    const initials = nick.slice(0, 2).toUpperCase();
    const bg = onlineNickColor(nick);

    if (usuario.avatar_url) {
        return `<img src="${usuario.avatar_url}" class="online-avatar-img" alt="${nick}"
            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="online-avatar-initials" style="background:${bg};display:none;">${initials}</div>`;
    }
    return `<div class="online-avatar-initials" style="background:${bg};">${initials}</div>`;
}

/**
 * Etiqueta legible de la página donde está el usuario.
 */
function onlinePageLabel(pagina) {
    const labels = {
        'inicio': '🏠 Inicio', 'juegos': '🎮 Juegos', 'juntas': '🎲 Juntas',
        'encuestas': '🗳️ Encuestas', 'eventos': '🌟 Eventos', 'concursos': '🏆 Concursos',
        'calendario': '📅 Calendario', 'radar': '🎯 Radar', 'miembros': '⭐ Miembros',
        'mercado': '🛍️ Mercado', 'carrera': '🏎️ Carrera', 'pelea': '⚔️ Ninja',
        'formularios': '📝 Formularios', 'documentos': '📄 Documentos', 'realeza': '👑 Admin',
        'instagram': '📸 Novedades IG', 'torneos': '🏆 Torneos BGA'
    };
    return labels[pagina] || `📍 ${pagina}`;
}

/**
 * Actualiza el panel de usuarios online con los datos del servidor.
 */
function onlineActualizar() {
    var url = (window.AJ_CONFIG && window.AJ_CONFIG.apiUrl) ? window.AJ_CONFIG.apiUrl('/api/online') : '/api/online';
    fetch(url)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(data => {
            const dots = document.querySelectorAll('.online-dot');
            const labels = document.querySelectorAll('.online-label');
            const lists = document.querySelectorAll('.online-user-list');

            if (!dots.length && !labels.length) return;

            if (!data || !data.ok) {
                labels.forEach(l => { l.textContent = 'sin conexión'; });
                dots.forEach(d => {
                    d.style.background = '#6b7280';
                    d.style.animation = 'none';
                });
                return;
            }

            const count = data.count || 0;
            dots.forEach(d => {
                d.style.background = count > 0 ? '#10b981' : '#6b7280';
                d.style.animation = count > 0 ? 'online-pulse 1.5s infinite' : 'none';
            });
            labels.forEach(l => {
                l.textContent = count === 0 ? 'nadie online'
                    : count === 1 ? '1 en línea'
                    : `${count} en línea`;
            });

            const html = count === 0
                ? '<div class="online-empty">Nadie conectado en este momento 🌙</div>'
                : data.usuarios.map(u => `
                    <div class="online-user-row">
                        <div class="online-avatar">
                            ${onlineAvatarHTML(u)}
                        </div>
                        <div class="online-user-info">
                            <div class="online-user-nick">${u.nick}</div>
                            <div class="online-user-page">${onlinePageLabel(u.pagina)}</div>
                        </div>
                    </div>
                `).join('');

            lists.forEach(list => {
                list.innerHTML = html;
            });
        });
}
window.onlineActualizar = onlineActualizar;

/**
 * Abre o cierra el panel de usuarios online.
 */
function onlineTogglePanel(event, targetId) {
    if (event) event.stopPropagation();
    let panel = null;
    if (targetId) {
        panel = document.getElementById(targetId);
    } else if (event && event.currentTarget) {
        const widget = event.currentTarget.closest('.online-widget');
        panel = widget ? widget.querySelector('.online-panel') : null;
    }
    if (!panel) panel = document.querySelector('.online-panel');
    if (!panel) return;

    const isOpen = panel.style.display !== 'none';

    // Cerrar cualquier otro panel abierto
    document.querySelectorAll('.online-panel').forEach(p => {
        if (p !== panel) p.style.display = 'none';
    });

    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) onlineActualizar();
}
window.onlineTogglePanel = onlineTogglePanel;

/**
 * Envía heartbeat al servidor cada 30 segundos si hay usuario logueado.
 */
function onlineHeartbeat() {
    if (!window.AuthManager || !window.AuthManager.isAuthenticated()) return;
    const nick = window.AuthManager.getNick();
    if (!nick || nick === 'Invitado') return;
    const pagina = typeof getCurrentPageId === 'function' ? getCurrentPageId() : 'inicio';
    var url = (window.AJ_CONFIG && window.AJ_CONFIG.apiUrl) ? window.AJ_CONFIG.apiUrl('/api/heartbeat') : '/api/heartbeat';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, pagina })
    })
    .then(r => r.ok ? r.json() : null)
    .then(res => {
        if (res && res.ok && typeof onlineActualizar === 'function') {
            onlineActualizar();
        }
    })
    .catch(() => {});
}
window.onlineHeartbeat = onlineHeartbeat;

// Interacciones para móviles
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!sidebar || !overlay) return;

    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        closeSidebar();
    } else {
        sidebar.style.transform = ''; // Limpiar inline style para que funcione la clase CSS
        sidebar.classList.add('open');
        overlay.classList.add('show');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (!sidebar || !overlay) return;

    sidebar.classList.remove('open');
    sidebar.style.transform = ''; // Limpiar inline style en todos los casos
    overlay.classList.remove('show');
}

window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    // Solo cerrar en móvil, en desktop dejar que el CSS lo maneje
    if (window.innerWidth > 768) {
        sidebar.classList.remove('open');
        sidebar.style.transform = ''; // Limpiar inline style para que CSS tome control
        document.getElementById('overlay')?.classList.remove('show');
    } else {
        // En móvil, si no está abierto, asegurarse de limpiar el inline style también
        if (!sidebar.classList.contains('open')) {
            sidebar.style.transform = '';
        }
    }
});

// ─── SISTEMA DE AVISOS Y NOTIFICACIONES (MODAL POPUP FRONTEND) ─────────────

const SAMPLE_AVISOS = [
    {
        id: 'aviso-1',
        titulo: 'Modificación de Horario en Junta',
        mensaje: 'La mesa de Terraforming Mars de este viernes cambia de horario y comenzará a las 20:00 hrs puntual en la sede central.',
        tipo: 'urgente',
        fecha: 'Hace 25 min'
    },
    {
        id: 'aviso-2',
        titulo: 'Inscripciones Abiertas: Torneo Catan 2026',
        mensaje: 'Ya puedes anotarte en la sección de Concursos. ¡Cupos limitados con premios en juegos de mesa para el podio!',
        tipo: 'evento',
        fecha: 'Hoy 14:30'
    },
    {
        id: 'aviso-3',
        titulo: 'Nueva Función: Presencia en Vivo',
        mensaje: 'Revisa quiénes están conectados en tiempo real tocando el botón verde en el pie de página.',
        tipo: 'info',
        fecha: 'Ayer'
    }
];

let _avisosActivos = [];

// ═════════════════════════════════════════════════════════════════════════════
// 1. AVISOS PÚBLICOS DE LA ADMINISTRACIÓN (Acceso universal sin credenciales)
// ═════════════════════════════════════════════════════════════════════════════

function notifGetPublicosDescartados() {
    try {
        return JSON.parse(localStorage.getItem('aj_avisos_descartados') || '[]');
    } catch (e) {
        return [];
    }
}

function notifGetAvisosPublicosVisibles() {
    const descartados = notifGetPublicosDescartados();
    return _avisosActivos.filter(a => !descartados.includes(a.id));
}

function notifEnsurePublicoModalDOM() {
    let overlay = document.getElementById('notif-publico-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'notif-publico-modal-overlay';
        overlay.className = 'notif-modal-overlay';
        overlay.onclick = (e) => {
            if (e.target && e.target.id === 'notif-publico-modal-overlay') notifCerrarAvisosPublicos();
        };
        overlay.innerHTML = `
            <div class="notif-modal-card" role="dialog" aria-modal="true" aria-labelledby="notif-pub-title" onclick="event.stopPropagation()">
                <div class="notif-modal-header">
                    <div class="notif-modal-title" id="notif-pub-title">
                        <span>📢</span>
                        <span>Avisos de la Administración</span>
                    </div>
                    <button class="notif-modal-close-btn" onclick="notifCerrarAvisosPublicos()" title="Cerrar ventana (Esc)" aria-label="Cerrar">✕</button>
                </div>
                <div style="padding: 0 16px 6px; font-size: 0.78rem; color: var(--text-dim); line-height: 1.4;">
                    Comunicados, torneos y convocatorias oficiales abiertas a toda la comunidad.
                </div>
                <div class="notif-modal-actions" id="notif-pub-actions">
                    <span id="notif-pub-count">0 comunicados</span>
                    <button class="notif-modal-btn-clear" id="notif-pub-btn-clear-all" onclick="notifBorrarTodosPublicos()" title="Descartar todos los avisos">
                        <span>🗑️</span> <span>Descartar todos</span>
                    </button>
                </div>
                <div class="notif-modal-body" id="notif-pub-body">
                    <!-- Avisos generados dinámicamente -->
                </div>
                <div class="notif-modal-footer">
                    <button class="notif-modal-close-main" onclick="notifCerrarAvisosPublicos()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    return overlay;
}

function notifRenderPublicoContent() {
    const body = document.getElementById('notif-pub-body');
    const countEl = document.getElementById('notif-pub-count');
    const clearBtn = document.getElementById('notif-pub-btn-clear-all');
    if (!body) return;

    const visibles = notifGetAvisosPublicosVisibles();

    if (!visibles || !visibles.length) {
        body.innerHTML = `
            <div class="notif-modal-empty">
                <div class="notif-modal-empty-icon">📭</div>
                <div class="notif-modal-empty-title">Sin avisos pendientes</div>
                <div class="notif-modal-empty-sub">Estás al día con todos los comunicados oficiales de la administración.</div>
            </div>
        `;
        if (countEl) countEl.textContent = '0 avisos';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (countEl) countEl.textContent = `${visibles.length} ${visibles.length === 1 ? 'comunicado pendiente' : 'comunicados pendientes'}`;
    if (clearBtn) clearBtn.style.display = 'inline-flex';

    body.innerHTML = visibles.map(a => {
        const badgeLabel = a.tipo === 'urgente' ? '⚠️ Urgente' : (a.tipo === 'evento' ? '🏆 Torneo / Evento' : 'ℹ️ Oficial');
        return `
            <div class="notif-card ${a.tipo || 'info'}" id="notif-card-pub-${a.id}">
                <div class="notif-card-header">
                    <div class="notif-card-left">
                        <span class="notif-card-badge">${badgeLabel}</span>
                        <span class="notif-card-date">${a.fecha || 'Reciente'}</span>
                    </div>
                    <button class="notif-card-btn-del" onclick="notifBorrarPublico('${a.id}')" title="Descartar este comunicado">
                        <span>✕</span> <span>Descartar</span>
                    </button>
                </div>
                <div class="notif-card-title">${a.titulo}</div>
                <div class="notif-card-msg">${a.mensaje}</div>
            </div>
        `;
    }).join('');
}

function notifAbrirAvisosPublicos() {
    const overlay = notifEnsurePublicoModalDOM();
    notifRenderPublicoContent();
    overlay.classList.add('open');
}
window.notifAbrirAvisosPublicos = notifAbrirAvisosPublicos;
window.notifAbrirPopup = notifAbrirAvisosPublicos; // Retrocompatibilidad

function notifCerrarAvisosPublicos() {
    const overlay = document.getElementById('notif-publico-modal-overlay');
    if (overlay) overlay.classList.remove('open');
}
window.notifCerrarAvisosPublicos = notifCerrarAvisosPublicos;
window.notifCerrarPopup = notifCerrarAvisosPublicos; // Retrocompatibilidad

function notifBorrarPublico(id) {
    const descartados = notifGetPublicosDescartados();
    if (!descartados.includes(id)) {
        descartados.push(id);
        localStorage.setItem('aj_avisos_descartados', JSON.stringify(descartados));
    }
    const card = document.getElementById(`notif-card-pub-${id}`);
    if (card) {
        card.classList.add('removing');
        setTimeout(() => {
            if (card.parentNode) card.parentNode.removeChild(card);
            const body = document.getElementById('notif-pub-body');
            if (body && !body.querySelector('.notif-card')) {
                notifRenderPublicoContent();
            } else {
                const countEl = document.getElementById('notif-pub-count');
                const visibles = notifGetAvisosPublicosVisibles();
                if (countEl) countEl.textContent = `${visibles.length} ${visibles.length === 1 ? 'comunicado pendiente' : 'comunicados pendientes'}`;
            }
        }, 220);
    }
}
window.notifBorrarPublico = notifBorrarPublico;

function notifBorrarTodosPublicos() {
    const descartados = notifGetPublicosDescartados();
    _avisosActivos.forEach(a => {
        if (!descartados.includes(a.id)) {
            descartados.push(a.id);
        }
    });
    localStorage.setItem('aj_avisos_descartados', JSON.stringify(descartados));
    notifRenderPublicoContent();
}
window.notifBorrarTodosPublicos = notifBorrarTodosPublicos;

// ═════════════════════════════════════════════════════════════════════════════
// 2. BUZÓN PRIVADO DE NOTIFICACIONES (Requiere autenticación de miembro)
// ═════════════════════════════════════════════════════════════════════════════

function notifGetPrivadasStorageKey(nick) {
    return 'aj_notif_privadas_' + (nick || 'guest').toLowerCase().trim();
}

function notifGetPrivadas(nick) {
    if (!nick || nick === 'Invitado') return [];
    const key = notifGetPrivadasStorageKey(nick);
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        return [];
    }

    // Datos semilla para miembros nuevos (para que vean cómo funciona el buzón)
    const seed = [
        {
            id: 'seed-renta-1',
            tipo: 'renta',
            titulo: '💰 Renta Pasiva Diaria Acreditada',
            mensaje: '¡Excelente rendimiento! Has mantenido posición en el podio arcade y recibiste tu renta pasiva diaria.',
            puntos: '+3 PTS',
            fecha: 'Hoy 00:05',
            leido: false,
            ts: Date.now() - 3600000
        },
        {
            id: 'seed-bono-2',
            tipo: 'bono',
            titulo: '🏆 Bono de Podio Semanal',
            mensaje: 'Completaste el corte de la semana en los puestos de honor del ranking. Se sumaron puntos a tu acumulado.',
            puntos: '+10 PTS',
            fecha: 'Lunes pasado',
            leido: false,
            ts: Date.now() - 86400000
        },
        {
            id: 'seed-mision-3',
            tipo: 'mision',
            titulo: '🎯 Participación Validada en Torneo BGA',
            mensaje: 'Lunara confirmó tu asistencia en la mesa de la comunidad. Tus puntos fueron transferidos a la tabla.',
            puntos: '+2 PTS',
            fecha: 'Hace 3 días',
            leido: true,
            ts: Date.now() - 172800000
        }
    ];
    try {
        localStorage.setItem(key, JSON.stringify(seed));
    } catch(e) {}
    return seed;
}

function notifSavePrivadas(nick, list) {
    if (!nick || nick === 'Invitado') return;
    try {
        localStorage.setItem(notifGetPrivadasStorageKey(nick), JSON.stringify(list || []));
    } catch (e) {}
}

/**
 * Agrega programáticamente una notificación privada a un miembro.
 */
window.notifAgregarPrivada = function(notif, targetNick) {
    const nick = targetNick || (window.AuthManager && window.AuthManager.getNick());
    if (!nick || nick === 'Invitado') return;
    const list = notifGetPrivadas(nick);

    // Evitar duplicados por id si se provee uno específico
    if (notif.id && list.some(item => item.id === notif.id)) {
        return;
    }

    const item = {
        id: notif.id || ('pnotif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        tipo: notif.tipo || 'info', // 'renta', 'bono', 'sabotaje', 'mision', 'torneo', 'junta', 'info'
        titulo: notif.titulo || 'Notificación Personal',
        mensaje: notif.mensaje || '',
        puntos: notif.puntos || '',
        fecha: notif.fecha || 'Reciente',
        leido: false,
        ts: Date.now()
    };
    list.unshift(item);
    notifSavePrivadas(nick, list);
    notifActualizarBadges();
};

/**
 * Verifica y acredita notificaciones automáticas por eventos del Macrojuego
 * (Renta pasiva diaria de Arcade y alertas de posición).
 */
window.notifVerificarEventosMacrojuego = function(d) {
    if (!window.AuthManager || !window.AuthManager.isAuthenticated()) return;
    const nick = window.AuthManager.getNick();
    if (!nick || nick === 'Invitado') return;

    const data = d || (window.App && window.App.data);
    if (!data) return;

    const hoyStr = new Date().toISOString().slice(0, 10);

    // 1. Verificar Renta Pasiva Diaria en Circuito Black
    const podioCarrera = data.podio_carrera || (data.ranking_modular && data.ranking_modular.podio_carrera) || [];
    const rentaValores = { 0: '+3 PTS', 1: '+2 PTS', 2: '+1 PTS' };
    const posCarrera = podioCarrera.findIndex(p => (p.nick || '').toLowerCase() === nick.toLowerCase());
    if (posCarrera >= 0 && posCarrera <= 2) {
        const notifId = `renta_carrera_${nick}_${posCarrera + 1}_${hoyStr}`;
        window.notifAgregarPrivada({
            id: notifId,
            tipo: 'renta',
            titulo: '🏎️ Renta Diaria: Circuito Black',
            mensaje: `¡Felicidades! Mantuviste el puesto #${posCarrera + 1} en Circuito Black y tienes derecho a tu renta pasiva diaria.`,
            puntos: rentaValores[posCarrera],
            fecha: 'Hoy'
        }, nick);
    }

    // 2. Verificar Renta Pasiva Diaria en Cyber Ninja
    const podioPelea = data.podio_pelea || (data.ranking_modular && data.ranking_modular.podio_pelea) || [];
    const posPelea = podioPelea.findIndex(p => (p.nick || '').toLowerCase() === nick.toLowerCase());
    if (posPelea >= 0 && posPelea <= 2) {
        const notifId = `renta_pelea_${nick}_${posPelea + 1}_${hoyStr}`;
        window.notifAgregarPrivada({
            id: notifId,
            tipo: 'renta',
            titulo: '🥷 Renta Diaria: Cyber Ninja',
            mensaje: `¡Gran combate! Mantuviste el puesto #${posPelea + 1} en Cyber Ninja y tienes derecho a tu renta pasiva diaria.`,
            puntos: rentaValores[posPelea],
            fecha: 'Hoy'
        }, nick);
    }
};

function notifEnsurePrivadoModalDOM() {
    let overlay = document.getElementById('notif-privado-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'notif-privado-modal-overlay';
        overlay.className = 'notif-modal-overlay';
        overlay.onclick = (e) => {
            if (e.target && e.target.id === 'notif-privado-modal-overlay') notifCerrarPrivadas();
        };
        overlay.innerHTML = `
            <div class="notif-modal-card" role="dialog" aria-modal="true" aria-labelledby="notif-priv-title" onclick="event.stopPropagation()">
                <div class="notif-modal-header">
                    <div class="notif-modal-title" id="notif-priv-title">
                        <span>🔔</span>
                        <span>Mis Notificaciones</span>
                    </div>
                    <button class="notif-modal-close-btn" onclick="notifCerrarPrivadas()" title="Cerrar buzón (Esc)" aria-label="Cerrar">✕</button>
                </div>
                <div id="notif-priv-user-bar" style="padding: 0 16px 8px; font-size: 0.78rem; color: var(--text-dim); line-height: 1.4;">
                    <!-- Subtítulo con nick -->
                </div>
                <div class="notif-modal-actions" id="notif-priv-actions">
                    <span id="notif-priv-count">0 movimientos</span>
                    <button class="notif-modal-btn-clear" id="notif-priv-btn-clear-all" onclick="notifBorrarTodasPrivadas()" title="Vaciar mi buzón de notificaciones">
                        <span>🗑️</span> <span>Vaciar buzón</span>
                    </button>
                </div>
                <div class="notif-modal-body" id="notif-priv-body">
                    <!-- Tarjetas personales -->
                </div>
                <div class="notif-modal-footer">
                    <button class="notif-modal-close-main" onclick="notifCerrarPrivadas()">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    return overlay;
}

function notifRenderPrivadasContent(nick) {
    const body = document.getElementById('notif-priv-body');
    const countEl = document.getElementById('notif-priv-count');
    const userBar = document.getElementById('notif-priv-user-bar');
    const clearBtn = document.getElementById('notif-priv-btn-clear-all');
    if (!body) return;

    if (userBar) {
        userBar.innerHTML = `Movimientos de <strong style="color:var(--accent-light);">👤 ${nick}</strong> · Rentas pasivas, bonos semanales y misiones.`;
    }

    const list = notifGetPrivadas(nick);

    if (!list || !list.length) {
        body.innerHTML = `
            <div class="notif-modal-empty">
                <div class="notif-modal-empty-icon">📭</div>
                <div class="notif-modal-empty-title">Tu buzón está vacío</div>
                <div class="notif-modal-empty-sub">Aquí recibirás los registros cuando ganes rentas pasivas diarias, bonos de podio semanal o avisos directos.</div>
            </div>
        `;
        if (countEl) countEl.textContent = '0 notificaciones';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? 'notificación guardada' : 'notificaciones guardadas'}`;
    if (clearBtn) clearBtn.style.display = 'inline-flex';

    body.innerHTML = list.map(item => {
        let badgeText = 'ℹ️ Movimiento';
        if (item.tipo === 'renta') badgeText = '💰 Renta Diaria';
        else if (item.tipo === 'bono') badgeText = '🏆 Bono Semanal';
        else if (item.tipo === 'sabotaje') badgeText = '⚔️ Contraataque';
        else if (item.tipo === 'mision') badgeText = '🎯 Misión';

        const isNeg = (item.puntos || '').includes('-');
        const ptsHtml = item.puntos ? `
            <span class="notif-pts-pill ${isNeg ? 'neg' : 'pos'}">
                ${item.puntos}
            </span>
        ` : '';

        return `
            <div class="notif-card ${item.tipo || 'info'}" id="notif-priv-card-${item.id}">
                <div class="notif-card-header">
                    <div class="notif-card-left">
                        <span class="notif-card-badge">${badgeText}</span>
                        <span class="notif-card-date">${item.fecha || 'Reciente'}</span>
                    </div>
                    ${ptsHtml}
                    <button class="notif-card-btn-del" onclick="notifBorrarPrivada('${item.id}')" title="Eliminar este registro">
                        <span>✕</span>
                    </button>
                </div>
                <div class="notif-card-title">${item.titulo}</div>
                <div class="notif-card-msg">${item.mensaje}</div>
            </div>
        `;
    }).join('');
}

function notifAbrirPrivadas() {
    if (!window.AuthManager || !window.AuthManager.isAuthenticated()) {
        if (window.AuthManager && typeof window.AuthManager.showModal === 'function') {
            window.AuthManager.showModal({
                reason: '🔒 Inicia sesión con tu apodo y clave semanal para acceder a tu buzón privado de notificaciones, rentas pasivas y bonos de puntos.'
            });
        } else {
            alert('Debes identificarte como miembro para acceder a tus notificaciones privadas.');
        }
        return;
    }

    const nick = window.AuthManager.getNick();
    const overlay = notifEnsurePrivadoModalDOM();

    // Marcar como leídas al abrir
    const list = notifGetPrivadas(nick);
    let changed = false;
    list.forEach(item => {
        if (!item.leido) {
            item.leido = true;
            changed = true;
        }
    });
    if (changed) {
        notifSavePrivadas(nick, list);
        notifActualizarBadges();
    }

    notifRenderPrivadasContent(nick);
    overlay.classList.add('open');
}
window.notifAbrirPrivadas = notifAbrirPrivadas;

function notifCerrarPrivadas() {
    const overlay = document.getElementById('notif-privado-modal-overlay');
    if (overlay) overlay.classList.remove('open');
}
window.notifCerrarPrivadas = notifCerrarPrivadas;

function notifBorrarPrivada(id) {
    if (!window.AuthManager || !window.AuthManager.isAuthenticated()) return;
    const nick = window.AuthManager.getNick();
    let list = notifGetPrivadas(nick);
    list = list.filter(item => item.id !== id);
    notifSavePrivadas(nick, list);

    const card = document.getElementById(`notif-priv-card-${id}`);
    if (card) {
        card.classList.add('removing');
        setTimeout(() => {
            if (card.parentNode) card.parentNode.removeChild(card);
            const body = document.getElementById('notif-priv-body');
            if (body && !body.querySelector('.notif-card')) {
                notifRenderPrivadasContent(nick);
            } else {
                const countEl = document.getElementById('notif-priv-count');
                if (countEl) countEl.textContent = `${list.length} ${list.length === 1 ? 'notificación guardada' : 'notificaciones guardadas'}`;
            }
        }, 220);
    }
    notifActualizarBadges();
}
window.notifBorrarPrivada = notifBorrarPrivada;

function notifBorrarTodasPrivadas() {
    if (!window.AuthManager || !window.AuthManager.isAuthenticated()) return;
    const nick = window.AuthManager.getNick();
    notifSavePrivadas(nick, []);
    notifRenderPrivadasContent(nick);
    notifActualizarBadges();
}
window.notifBorrarTodasPrivadas = notifBorrarTodasPrivadas;

// ═════════════════════════════════════════════════════════════════════════════
// 3. BADGES REACTIVOS DE NO LEÍDOS (Sidebar & Topbar)
// ═════════════════════════════════════════════════════════════════════════════

function notifActualizarBadges() {
    const isAuth = window.AuthManager && window.AuthManager.isAuthenticated();
    let unreadCount = 0;

    if (isAuth) {
        const nick = window.AuthManager.getNick();
        const list = notifGetPrivadas(nick);
        unreadCount = list.filter(item => !item.leido).length;
    }

    const badges = document.querySelectorAll('.notif-badge');
    badges.forEach(b => {
        if (unreadCount > 0) {
            b.textContent = unreadCount;
            b.style.display = 'inline-block';
        } else {
            b.style.display = 'none';
        }
    });
}
window.notifActualizarBadges = notifActualizarBadges;

function notifCargarAvisos() {
    fetch('/api/avisos')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(data => {
            const avisos = (data && data.ok && Array.isArray(data.avisos) && data.avisos.length) 
                ? data.avisos 
                : SAMPLE_AVISOS;
            _avisosActivos = avisos;

            const overlay = document.getElementById('notif-publico-modal-overlay');
            if (overlay && overlay.classList.contains('open')) {
                notifRenderPublicoContent();
            }
        });
}

// Escuchar tecla Escape para cerrar cualquier modal abierto
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        notifCerrarPrivadas();
        notifCerrarAvisosPublicos();
    }
});

// Reactividad a cambios de autenticación
window.addEventListener('aj:auth-changed', () => {
    notifActualizarBadges();
    if (typeof window.notifVerificarEventosMacrojuego === 'function') {
        window.notifVerificarEventosMacrojuego();
    }
});

// Inicialización de componentes de esqueleto
document.addEventListener('DOMContentLoaded', () => {
    // Auto-registro global de PWA Service Worker para aceleración móvil en toda la comunidad
    if ('serviceWorker' in navigator && !window.__sw_registered) {
        window.__sw_registered = true;
        navigator.serviceWorker.register('./sw.js').catch(function () {});
    }

    renderSidebar();
    renderTopbar();

    const btnMenu = document.getElementById('hamburguesa');
    if (btnMenu) btnMenu.addEventListener('click', toggleSidebar);

    const overlay = document.getElementById('overlay');
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Cerrar paneles flotantes al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.online-widget')) {
            document.querySelectorAll('.online-panel').forEach(p => {
                p.style.display = 'none';
            });
        }
    });

    // Carga inicial de avisos y notificaciones (Sample data o API)
    notifCargarAvisos();
    setInterval(notifCargarAvisos, 60000);

    // Heartbeat inmediato al cargar la página si está logueado
    onlineHeartbeat();
    setInterval(onlineHeartbeat, 30000);

    // Primera actualización de usuarios online (tras el heartbeat inicial)
    setTimeout(onlineActualizar, 400);
    setInterval(onlineActualizar, 30000);

    // Reactividad: heartbeat inmediato al iniciar sesión
    window.addEventListener('aj:auth-changed', () => {
        onlineHeartbeat();
    });
});

// ============================================================================
// MÓDULO DE PREMIOS VISIBLES — MODAL GLOBAL "¿QUÉ PUEDO GANAR?"
// ============================================================================

const PREMIOS_FALLBACK_DEFAULT = {
    ok: true,
    premios: [{
        id: 1,
        temporada: '2026-T1',
        titulo: 'Premio Mayor de la Temporada',
        descripcion_general: 'Un juego de mesa de estrategia y negociación para 2-5 jugadores, ideal para las juntas del grupo. El juego exacto se mantendrá como sorpresa para encender la emoción.',
        donante: 'Amigos Jugones Staff',
        descripcion_donante: 'Donado con cariño de la comunidad para quien más se esfuerce esta temporada',
        meta_puntos: 1000,
        tipo_premio: 'juego_mesa',
        emoji_tipo: '🎲'
    }],
    progreso_lider: {
        puntos: 152,
        meta: 1000,
        porcentaje: 15
    }
};

function premiosEnsureModalDOM() {
    let overlay = document.getElementById('premios-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'premios-modal-overlay';
        overlay.className = 'premios-modal-overlay';
        overlay.innerHTML = `
            <div class="premios-modal" role="dialog" aria-modal="true" aria-labelledby="premios-modal-title">
                <div class="premios-modal-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.4rem;">🎁</span>
                        <h2 id="premios-modal-title" style="margin:0; font-size:1.15rem; font-weight:800; color:var(--text, #fff);">
                            Premios de la Temporada
                        </h2>
                    </div>
                    <button class="premios-modal-close" onclick="premiosCerrarModal()" aria-label="Cerrar modal">✕</button>
                </div>
                <div class="premios-modal-body" id="premios-modal-body">
                    <div style="text-align:center; padding:30px 10px; color:var(--text-dim, #94a3b8);">
                        <div class="spinner" style="margin:0 auto 12px auto;"></div>
                        <div>Cargando premios y progreso de la carrera...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Cerrar al clickear fuera del diálogo
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) premiosCerrarModal();
        });

        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('open')) {
                premiosCerrarModal();
            }
        });
    }
    return overlay;
}

function premiosAbrirModal() {
    const overlay = premiosEnsureModalDOM();
    overlay.classList.add('open');

    // Cargar datos
    fetch('/api/premios')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
        .then(data => {
            if (data && data.ok && Array.isArray(data.premios) && data.premios.length > 0) {
                return data;
            }
            // Fallback a premios.json
            return fetch('premios.json')
                .then(r => r.ok ? r.json() : null)
                .catch(() => null)
                .then(fb => (fb && fb.premios) ? fb : PREMIOS_FALLBACK_DEFAULT);
        })
        .then(data => {
            renderPremiosModalContent(data || PREMIOS_FALLBACK_DEFAULT);
        });
}
window.premiosAbrirModal = premiosAbrirModal;

function premiosCerrarModal() {
    const overlay = document.getElementById('premios-modal-overlay');
    if (overlay) overlay.classList.remove('open');
}
window.premiosCerrarModal = premiosCerrarModal;

function renderPremiosModalContent(data) {
    const body = document.getElementById('premios-modal-body');
    if (!body) return;

    const premios = data.premios || [];
    const progreso = data.progreso_lider || { puntos: 0, meta: 1000, porcentaje: 0 };
    const meta = progreso.meta || 1000;
    const puntosActuales = progreso.puntos || 0;
    const porcentaje = Math.min(100, Math.max(0, progreso.porcentaje || Math.round((puntosActuales / meta) * 100)));
    const faltan = Math.max(0, meta - puntosActuales);

    body.innerHTML = `
        <!-- Banner dorado de competencia -->
        <div style="
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(239, 68, 68, 0.15));
            border: 1px solid rgba(245, 158, 11, 0.45);
            border-radius: var(--radius-md, 12px);
            padding: 16px;
            text-align: center;
            margin-bottom: 20px;
        ">
            <div style="font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #f59e0b; margin-bottom: 4px;">
                🏆 NO ES UN SORTEO — ES UNA CARRERA
            </div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text, #fff); line-height: 1.4;">
                El primer jugador en alcanzar <strong>${meta} PUNTOS</strong> se lleva el premio directamente a su ludoteca.
            </div>
        </div>

        <!-- Lista de Premios -->
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 22px;">
            ${premios.map(p => `
                <div style="
                    background: var(--card2, rgba(255,255,255,0.04));
                    border: 1px solid var(--border, rgba(255,255,255,0.1));
                    border-radius: var(--radius-md, 12px);
                    padding: 16px;
                ">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="
                            font-size: 2rem;
                            width: 50px;
                            height: 50px;
                            background: rgba(245, 158, 11, 0.15);
                            border: 1px solid rgba(245, 158, 11, 0.3);
                            border-radius: var(--radius-md, 12px);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                        ">
                            ${p.emoji_tipo || '🎲'}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                                <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text, #fff);">
                                    ${p.titulo}
                                </h3>
                                <span style="
                                    font-size: 0.72rem;
                                    font-weight: 800;
                                    background: rgba(245, 158, 11, 0.18);
                                    color: #f59e0b;
                                    padding: 3px 8px;
                                    border-radius: 999px;
                                ">
                                    Meta: ${p.meta_puntos || 1000} PTS
                                </span>
                            </div>
                            <p style="margin: 8px 0; font-size: 0.88rem; color: var(--text-dim, #94a3b8); line-height: 1.45;">
                                ${p.descripcion_general}
                            </p>
                            <div style="
                                font-size: 0.78rem;
                                font-weight: 700;
                                color: #ec4899;
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                background: rgba(236, 72, 153, 0.1);
                                padding: 4px 10px;
                                border-radius: 999px;
                                border: 1px solid rgba(236, 72, 153, 0.25);
                            ">
                                <span>💝 Donado por:</span>
                                <strong>${p.donante}</strong>
                            </div>
                            ${p.descripcion_donante ? `
                                <div style="font-size: 0.76rem; color: var(--text-dim, #94a3b8); margin-top: 4px; font-style: italic;">
                                    "${p.descripcion_donante}"
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <!-- Barra de Progreso en Vivo -->
        <div style="
            background: rgba(0,0,0,0.25);
            border: 1px solid var(--border, rgba(255,255,255,0.08));
            border-radius: var(--radius-md, 12px);
            padding: 16px;
            margin-bottom: 22px;
        ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 0.84rem; font-weight: 800; color: var(--text, #fff);">
                    🏎️ ¿Cómo va la carrera?
                </span>
                <span style="font-size: 0.82rem; font-weight: 800; color: #f59e0b;">
                    ${porcentaje}% de la meta
                </span>
            </div>

            <!-- Track de la barra -->
            <div style="
                width: 100%;
                height: 12px;
                background: rgba(255,255,255,0.08);
                border-radius: 999px;
                overflow: hidden;
                position: relative;
            ">
                <div style="
                    width: ${porcentaje}%;
                    height: 100%;
                    background: linear-gradient(90deg, #f59e0b, #ef4444);
                    border-radius: 999px;
                    transition: width 1s ease-in-out;
                "></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 0.76rem; color: var(--text-dim, #94a3b8);">
                <span>Puntero actual: <strong>${puntosActuales} PTS</strong></span>
                <span>Faltan <strong>${faltan} PTS</strong> para ganar</span>
            </div>
        </div>

        <!-- Instrucciones de participación -->
        <div style="margin-bottom: 20px;">
            <div style="font-size: 0.84rem; font-weight: 800; color: var(--text, #fff); margin-bottom: 8px;">
                🎯 ¿Cómo participo para ganar?
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.82rem; color: var(--text-dim, #94a3b8);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color:#10b981; font-weight:bold;">1.</span>
                    <span>Estar en el grupo oficial de WhatsApp de Amigos Jugones.</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color:#10b981; font-weight:bold;">2.</span>
                    <span>Iniciar sesión en la web con tu teléfono y nick registrado.</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color:#10b981; font-weight:bold;">3.</span>
                    <span>Acumular puntos votando en encuestas geek, jugando al arcade, ganando torneos BGA y asistiendo a juntas.</span>
                </div>
            </div>
        </div>

        <!-- Botones de Acción -->
        <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
            <a href="sala-de-la-fama.html" style="
                text-decoration: none;
                padding: 8px 16px;
                border-radius: var(--radius-sm, 8px);
                background: rgba(255,255,255,0.08);
                color: var(--text, #fff);
                font-size: 0.82rem;
                font-weight: 700;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            ">
                <span>🏆</span> Ver Ranking
            </a>
            <a href="juegos.html" style="
                text-decoration: none;
                padding: 8px 16px;
                border-radius: var(--radius-sm, 8px);
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: #000;
                font-size: 0.82rem;
                font-weight: 800;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            ">
                <span>🎮</span> Ir a Ganar Puntos
            </a>
        </div>
    `;
}
