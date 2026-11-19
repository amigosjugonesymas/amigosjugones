/**
 * AMIGOS JUGONES — EL SALÓN DE HONOR (js/salon-de-honor.js)
 * Vitrina comunitaria de méritos reales de los miembros (estilo Mercado Jugón).
 * Reconocimientos gestionados exclusivamente por la Administración.
 * NO OTORGA PUNTOS. 100% compatible con variables CSS y skins estacionales.
 */

(function () {
    'use strict';

    let allLogros = [];
    let currentCategory = 'todos';
    let currentSearch = '';

    const CATEGORIAS_CONFIG = {
        'todos':       { label: 'Todos los Méritos', emoji: '🌟' },
        'diseno':      { label: 'Diseño de Juegos',  emoji: '🎲' },
        'concurso':    { label: 'Torneos & Premios', emoji: '🏆' },
        'arte':        { label: 'Arte & Miniaturas', emoji: '🎨' },
        'escritura':   { label: 'Libros & Cómics',   emoji: '📚' },
        'digital':     { label: 'Canales & Digital', emoji: '💻' },
        'general':     { label: 'Comunidad & Honor', emoji: '🎖️' }
    };

    /** 1. Construye el esqueleto HTML estático idéntico a radar.html / mercado.html */
    function initLayoutSalonHonor() {
        const container = document.getElementById('page-content');
        if (!container) return;

        const heroHtml = (typeof renderSectionHero === 'function')
            ? renderSectionHero('🎖️ Salón de Honor', 'Nuestra vitrina comunitaria · Méritos reales de los miembros en el mundo exterior')
            : `<div class="section-hero">
                <h1>🎖️ Salón de Honor</h1>
                <p>Nuestra vitrina comunitaria · Méritos reales de los miembros en el mundo exterior</p>
               </div>`;

        container.innerHTML = `
            <!-- ═══ 1. HEADER COHERENTE CON RADAR / MERCADO / RESTO DEL SITIO ═══ -->
            <div class="radar-header-v2 flex justify-between items-center gap-24 mb-16" style="flex-wrap: wrap; flex-shrink: 0;">
                <div style="flex: 1 1 45%; min-width: 300px;">
                    ${heroHtml}
                </div>
                <div class="radar-cta-card card">
                    <div class="cta-icon">🎖️</div>
                    <div class="cta-text-wrap">
                        <div class="cta-title">¿Tienes un mérito?</div>
                        <p class="cta-desc">Cuéntaselo a los admins para que tu proyecto, juego o premio aparezca en esta vitrina.</p>
                    </div>
                    <div id="honor-cta-actions" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; flex-shrink:0;">
                        <a href="https://instagram.com/amigosjugones" target="_blank" rel="noopener noreferrer" class="btn btn-primary cta-btn">
                            <span style="font-size: 1.1rem;">📸</span>
                            <span>Contactar por Instagram</span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- ═══ 2. BANNER DESCRIPTIVO COHERENTE CON RADAR ═══ -->
            <div class="radar-desc-banner" style="margin-bottom: 12px; flex-shrink: 0;">
                🎖️ Vitrina comunitaria exclusiva para celebrar proyectos, autorías de juegos de mesa publicados, torneos ganados y méritos reales conseguidos por miembros de <strong>Amigos Jugones</strong> en el exterior. Curado por la Administración · Honor puro (no otorga puntos).
            </div>

            <!-- ═══ 3. TABS BAR Y BUSCADOR COMPACTO (FLEXIBLE) ═══ -->
            <div class="flex justify-between items-center gap-12 mb-12 honor-controls-bar" style="flex-wrap: wrap; flex-shrink: 0;">
                <div class="tabs-bar honor-tabs-bar" id="honor-tabs" style="margin-bottom: 0;">
                    ${renderTabsHtml()}
                </div>
                <div class="honor-search-wrap" style="position: relative; min-width: 220px; max-width: 320px; flex: 1;">
                    <input type="text" id="honor-search-input" placeholder="Buscar por nick, juego o hito..." style="
                        width: 100%;
                        padding: 7px 12px 7px 32px;
                        background: var(--card);
                        border: 1px solid var(--border);
                        border-radius: var(--radius-sm, 8px);
                        color: var(--text);
                        font-size: 0.82rem;
                        outline: none;
                        transition: border-color 0.2s;
                    ">
                    <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.82rem; opacity: 0.5; pointer-events: none;">🔍</span>
                </div>
            </div>

            <!-- ═══ 4. CONTENEDOR DE PANELES CON SCROLL INTERNO (IDÉNTICO A #radar-panels) ═══ -->
            <div id="honor-panels">
                <div id="honor-cards-container">
                    <div id="honor-cards-grid" class="honor-cards-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                        gap: 14px;
                        padding-bottom: 8px;
                    ">
                        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-dim, #94a3b8);">
                            <div class="spinner" style="margin: 0 auto 12px auto;"></div>
                            <div>Cargando publicaciones del Salón de Honor...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupEventListeners();
        setTimeout(() => { if (typeof injectAdminButton === 'function') injectAdminButton(); }, 300);
    }

    /** Inicialización completa con inyección de layout, footer si falta, y carga de datos */
    function initSalonHonor() {
        initLayoutSalonHonor();
        const content = document.getElementById('page-content');
        if (content && typeof renderGlobalFooter === 'function' && !content.querySelector('.global-footer')) {
            const footerEl = document.createElement('div');
            footerEl.innerHTML = renderGlobalFooter();
            while (footerEl.firstChild) {
                content.appendChild(footerEl.firstChild);
            }
        }
        loadSalonHonorData();
    }

    /** Renderiza las pestañas estándar del sitio (.tabs-bar) */
    function renderTabsHtml() {
        return Object.entries(CATEGORIAS_CONFIG).map(([key, cfg]) => {
            const active = (key === currentCategory);
            const count = (key === 'todos')
                ? allLogros.filter(i => i.visible !== 0).length
                : allLogros.filter(i => i.visible !== 0 && i.categoria === key).length;
            return `
                <button class="tab-btn honor-tab-btn ${active ? 'active' : ''}" data-tab="${key}">
                    <span class="honor-tab-left">${cfg.emoji} ${cfg.label}</span>
                    ${count > 0 ? `<span class="honor-tab-count">${count}</span>` : ''}
                </button>
            `;
        }).join('');
    }

    /** Asigna eventos de interacción */
    function setupEventListeners() {
        const searchInput = document.getElementById('honor-search-input');
        if (searchInput) {
            searchInput.value = currentSearch;
            searchInput.addEventListener('input', (e) => {
                currentSearch = (e.target.value || '').trim().toLowerCase();
                renderCards();
            });
        }

        const tabsContainer = document.getElementById('honor-tabs');
        if (tabsContainer) {
            tabsContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.tab-btn');
                if (!btn) return;
                const tab = btn.getAttribute('data-tab');
                if (!tab) return;
                currentCategory = tab;
                tabsContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderCards();
            });
        }
    }

    /** Carga datos desde la API con fallback al archivo JSON */
    function loadSalonHonorData() {
        fetch('/api/logros')
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
            .then(data => {
                if (data && data.ok && Array.isArray(data.logros) && data.logros.length > 0) {
                    return data.logros;
                }
                // Fallback a logros.json
                return fetch('logros.json')
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
                    .then(fb => (fb && fb.logros) ? fb.logros : []);
            })
            .then(logros => {
                allLogros = logros || [];
                const tabsEl = document.getElementById('honor-tabs');
                if (tabsEl) tabsEl.innerHTML = renderTabsHtml();
                renderCards();
                // Ocultar pantalla de carga si existe
                const ls = document.getElementById('loading-screen');
                if (ls) ls.style.display = 'none';
                const app = document.getElementById('app-container');
                if (app) app.style.display = 'flex';
            });
    }

    /** Renderiza las tarjetas filtradas */
    function renderCards() {
        const grid = document.getElementById('honor-cards-grid');
        if (!grid) return;

        let filtered = allLogros.filter(item => {
            // Filtro por visibilidad
            if (item.visible !== undefined && item.visible === 0) return false;

            // Filtro categoría
            if (currentCategory !== 'todos' && item.categoria !== currentCategory) {
                return false;
            }

            // Filtro búsqueda
            if (currentSearch) {
                const matchNick = (item.nick || '').toLowerCase().includes(currentSearch);
                const matchTitulo = (item.titulo || '').toLowerCase().includes(currentSearch);
                const matchDesc = (item.descripcion || '').toLowerCase().includes(currentSearch);
                const matchIg = (item.instagram_user || '').toLowerCase().includes(currentSearch);
                if (!matchNick && !matchTitulo && !matchDesc && !matchIg) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--card, #121224); border: 1px dashed var(--border, rgba(255,255,255,0.15)); border-radius: var(--radius-lg, 16px);">
                    <div style="font-size: 3rem; margin-bottom: 12px;">🎖️</div>
                    <h3 style="color: var(--text, #fff); font-size: 1.15rem; margin-bottom: 8px;">Aún no hay méritos en esta categoría</h3>
                    <p style="color: var(--text-dim, #94a3b8); font-size: 0.88rem; max-width: 480px; margin: 0 auto 16px auto;">
                        ¿Tienes un juego publicado, ganaste un concurso o creaste algo memorable? Comunícaselo al Admin para sumarlo al Salón de Honor.
                    </p>
                    <a href="https://instagram.com/amigosjugones" target="_blank" rel="noopener noreferrer" style="
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
                        color: #fff;
                        padding: 8px 18px;
                        border-radius: 999px;
                        font-size: 0.82rem;
                        font-weight: 700;
                        text-decoration: none;
                    ">
                        📸 Contactar por Instagram
                    </a>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(item => buildHonorCardHtml(item)).join('');

        // Inyectar botones de edición en cada tarjeta si el usuario es admin
        if (typeof isAdmin === 'function' && isAdmin()) {
            setTimeout(() => {
                grid.querySelectorAll('.honor-card').forEach((card, idx) => {
                    if (card.querySelector('.honor-card-edit-btn')) return;
                    const item = filtered[idx];
                    if (!item) return;
                    const actionsDiv = card.querySelector('[style*="border-top"]');
                    if (!actionsDiv) return;
                    const editBtn = document.createElement('button');
                    editBtn.className = 'honor-card-edit-btn';
                    editBtn.innerHTML = '✏️ Editar';
                    editBtn.onclick = () => window.SalonHonor.abrirModal(item);
                    actionsDiv.appendChild(editBtn);
                });
            }, 0);
        }
    }

    /** Construye el HTML de una tarjeta tipo Mercado Jugón */
    function buildHonorCardHtml(item) {
        const catCfg = CATEGORIAS_CONFIG[item.categoria] || CATEGORIAS_CONFIG['general'];
        const isDestacado = (item.destacado === 1);
        const emoji = item.emoji_categoria || catCfg.emoji;

        // Limpiar usuario de Instagram si trae '@'
        let igUser = (item.instagram_user || '').trim();
        if (igUser.startsWith('@')) igUser = igUser.substring(1);

        const igUrl = item.instagram_url || (igUser ? `https://instagram.com/${encodeURIComponent(igUser)}` : null);

        // Header visual (foto o placeholder artístico)
        const headerMedia = item.imagen_url ? `
            <div style="
                width: 100%;
                height: 180px;
                background-image: url('${escapeHtml(item.imagen_url)}');
                background-size: cover;
                background-position: center;
                border-top-left-radius: var(--radius-lg, 16px);
                border-top-right-radius: var(--radius-lg, 16px);
                position: relative;
            ">
                <div style="position: absolute; inset:0; background: linear-gradient(to top, var(--card, #121224) 0%, transparent 60%);"></div>
            </div>
        ` : `
            <div style="
                width: 100%;
                height: 90px;
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(139, 92, 246, 0.15));
                border-top-left-radius: var(--radius-lg, 16px);
                border-top-right-radius: var(--radius-lg, 16px);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.8rem;
                opacity: 0.85;
            ">
                ${emoji}
            </div>
        `;

        return `
            <article class="honor-card ${isDestacado ? 'destacado' : ''}" style="
                background: var(--card, #121224);
                border: 1px solid ${isDestacado ? 'var(--primary, #f59e0b)' : 'var(--border, rgba(255,255,255,0.1))'};
                border-radius: var(--radius-lg, 16px);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
                box-shadow: ${isDestacado ? '0 8px 24px rgba(245, 158, 11, 0.15)' : '0 4px 14px rgba(0,0,0,0.2)'};
            ">
                ${headerMedia}

                <div style="padding: 16px 18px 18px 18px; display: flex; flex-direction: column; flex: 1;">
                    
                    <!-- Badges superiores -->
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px;">
                        <span style="
                            font-size: 0.72rem;
                            font-weight: 800;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            padding: 4px 10px;
                            border-radius: 999px;
                            background: rgba(245, 158, 11, 0.15);
                            color: #f59e0b;
                            border: 1px solid rgba(245, 158, 11, 0.3);
                        ">
                            ${emoji} ${catCfg.label}
                        </span>

                        ${isDestacado ? `
                            <span style="
                                font-size: 0.7rem;
                                font-weight: 800;
                                padding: 3px 8px;
                                border-radius: 999px;
                                background: linear-gradient(135deg, #ffd700, #f59e0b);
                                color: #000;
                            ">
                                ⭐ DESTACADO
                            </span>
                        ` : ''}
                    </div>

                    <!-- Ficha del Miembro -->
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <div style="
                            width: 38px;
                            height: 38px;
                            border-radius: 50%;
                            background: linear-gradient(135deg, var(--primary, #f59e0b), var(--accent, #8b5cf6));
                            color: #000;
                            font-weight: 800;
                            font-size: 1rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border: 2px solid var(--border, rgba(255,255,255,0.2));
                        ">
                            ${escapeHtml((item.nick || 'AJ').substring(0, 2).toUpperCase())}
                        </div>
                        <div>
                            <div style="font-size: 1rem; font-weight: 800; color: var(--text, #fff); line-height: 1.2;">
                                ${escapeHtml(item.nick || 'Miembro')}
                            </div>
                            ${item.fecha_logro ? `
                                <div style="font-size: 0.75rem; color: var(--text-dim, #94a3b8);">
                                    📅 ${escapeHtml(item.fecha_logro)}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Título del Mérito -->
                    <h3 style="
                        font-size: 1.12rem;
                        font-weight: 800;
                        color: var(--text, #fff);
                        margin: 0 0 8px 0;
                        line-height: 1.35;
                    ">
                        ${escapeHtml(item.titulo || '')}
                    </h3>

                    <!-- Descripción -->
                    <p style="
                        font-size: 0.88rem;
                        color: var(--text-dim, #94a3b8);
                        line-height: 1.5;
                        margin: 0 0 16px 0;
                        flex: 1;
                    ">
                        ${escapeHtml(item.descripcion || '')}
                    </p>

                    <!-- Acciones / Redes Sociales (Estilo Mercado Jugón) -->
                    <div style="
                        margin-top: auto;
                        padding-top: 14px;
                        border-top: 1px solid var(--border, rgba(255,255,255,0.08));
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                        align-items: center;
                    ">
                        ${igUrl ? `
                            <a href="${escapeHtml(igUrl)}" target="_blank" rel="noopener noreferrer" style="
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                background: linear-gradient(135deg, rgba(131,58,180,0.2), rgba(253,29,29,0.2));
                                border: 1px solid rgba(253,29,29,0.4);
                                color: var(--text, #fff);
                                padding: 6px 12px;
                                border-radius: var(--radius-sm, 8px);
                                font-size: 0.78rem;
                                font-weight: 700;
                                text-decoration: none;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.borderColor='#fd1d1d'; this.style.transform='translateY(-1px)';" onmouseout="this.style.borderColor='rgba(253,29,29,0.4)'; this.style.transform='none';">
                                <span>📸</span>
                                <span>${igUser ? '@' + escapeHtml(igUser) : 'Instagram'}</span>
                            </a>
                        ` : ''}

                        ${item.enlace_referencia ? `
                            <a href="${escapeHtml(item.enlace_referencia)}" target="_blank" rel="noopener noreferrer" style="
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                background: rgba(255,255,255,0.06);
                                border: 1px solid var(--border, rgba(255,255,255,0.15));
                                color: var(--text, #fff);
                                padding: 6px 12px;
                                border-radius: var(--radius-sm, 8px);
                                font-size: 0.78rem;
                                font-weight: 700;
                                text-decoration: none;
                                transition: all 0.2s ease;
                            " onmouseover="this.style.borderColor='var(--primary, #f59e0b)';" onmouseout="this.style.borderColor='var(--border, rgba(255,255,255,0.15))';">
                                <span>🌐</span>
                                <span>Ver Más</span>
                            </a>
                        ` : ''}
                    </div>

                </div>
            </article>
        `;
    }

    /** Helper para sanitizar strings y evitar XSS */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MÓDULO ADMIN: Formulario de Publicar / Editar un mérito en el Salón de Honor
    // Solo se muestra si el usuario está autenticado como admin
    // ─────────────────────────────────────────────────────────────────────────

    function isAdmin() {
        return window.AuthManager && typeof window.AuthManager.isAdmin === 'function'
            ? window.AuthManager.isAdmin()
            : (window.AuthManager && window.AuthManager.getSession && window.AuthManager.getSession()
                ? (window.AuthManager.getSession().rol === 'admin')
                : false);
    }

    /** Inyecta el botón admin en la card CTA del Salón de Honor */
    function injectAdminButton() {
        if (!isAdmin()) return;
        const actions = document.getElementById('honor-cta-actions');
        if (!actions || document.getElementById('btn-honor-admin')) return;
        const btn = document.createElement('button');
        btn.id = 'btn-honor-admin';
        btn.className = 'btn btn-primary cta-btn';
        btn.style.cssText = 'background: var(--gold, #f59e0b); color: #000; font-weight: 800; border: none; padding: 10px 18px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);';
        btn.innerHTML = '<span>✨</span><span>Publicar Mérito</span>';
        btn.onclick = () => abrirModalHonor(null);
        actions.appendChild(btn);
    }

    /** Renderiza el overlay modal de administración */
    function ensureAdminModal() {
        let ov = document.getElementById('honor-admin-modal-overlay');
        if (ov) return ov;
        ov = document.createElement('div');
        ov.id = 'honor-admin-modal-overlay';
        ov.className = 'honor-modal-overlay';
        ov.innerHTML = `
            <div class="honor-modal" id="honor-admin-modal" role="dialog" aria-modal="true">
                <div class="honor-modal-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.4rem;">🎖️</span>
                        <h2 id="honor-admin-modal-title" style="margin:0; font-size:1.1rem; font-weight:800; color:var(--text,#fff);">
                            Publicar Mérito
                        </h2>
                    </div>
                    <button onclick="window.SalonHonor.cerrarModal()" aria-label="Cerrar"
                            style="background:transparent; border:none; color:var(--text-dim,#94a3b8); font-size:1.2rem; cursor:pointer; padding:4px 8px; border-radius:var(--radius-sm,6px); transition:color .2s, background .2s;"
                            onmouseover="this.style.background='rgba(255,255,255,.08)';"
                            onmouseout="this.style.background='transparent';">✕</button>
                </div>
                <form class="honor-modal-body" id="honor-admin-form" onsubmit="return false;">
                    <input type="hidden" id="honor-form-id" value="">

                    <div>
                        <label for="honor-form-nick">👤 Nick del Miembro *</label>
                        <input type="text" id="honor-form-nick" placeholder="Ej: ShadowDragon" required>
                    </div>

                    <div>
                        <label for="honor-form-titulo">🏆 Título del Mérito *</label>
                        <input type="text" id="honor-form-titulo" placeholder="Ej: Autor de NeoTactics (Juego Publicado)" required>
                    </div>

                    <div>
                        <label for="honor-form-descripcion">📝 Descripción *</label>
                        <textarea id="honor-form-descripcion" rows="3" placeholder="Describe brevemente el logro o mérito..." required style="resize:vertical;"></textarea>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div>
                            <label for="honor-form-categoria">📂 Categoría</label>
                            <select id="honor-form-categoria">
                                <option value="diseno">🎲 Diseño de Juegos</option>
                                <option value="concurso">🏆 Torneos &amp; Premios</option>
                                <option value="arte">🎨 Arte &amp; Miniaturas</option>
                                <option value="escritura">📚 Libros &amp; Cómics</option>
                                <option value="digital">💻 Canales &amp; Digital</option>
                                <option value="general" selected>🎖️ Comunidad &amp; Honor</option>
                            </select>
                        </div>
                        <div>
                            <label for="honor-form-fecha">📅 Año del Logro</label>
                            <input type="text" id="honor-form-fecha" placeholder="2026">
                        </div>
                    </div>

                    <div>
                        <label for="honor-form-ig">📸 Usuario de Instagram (sin @)</label>
                        <input type="text" id="honor-form-ig" placeholder="Ej: shadowdragon_games">
                    </div>

                    <div>
                        <label for="honor-form-enlace">🌐 Enlace de Referencia (opcional)</label>
                        <input type="url" id="honor-form-enlace" placeholder="https://...">
                    </div>

                    <div>
                        <label for="honor-form-imagen">🖼️ URL de Imagen/Portada (opcional)</label>
                        <input type="url" id="honor-form-imagen" placeholder="https://...">
                    </div>

                    <div style="display:flex; align-items:center; gap:8px;">
                        <input type="checkbox" id="honor-form-destacado" style="width:auto; accent-color:var(--primary,#f59e0b);">
                        <label for="honor-form-destacado" style="margin:0; cursor:pointer;">⭐ Marcar como Destacado</label>
                    </div>

                    <div id="honor-form-error" style="color:#f87171; font-size:0.82rem; display:none; padding:8px; background:rgba(248,113,113,.1); border-radius:var(--radius-sm,6px);"></div>

                    <div style="display:flex; gap:10px; justify-content:flex-end; padding-top:4px;">
                        <button type="button" onclick="window.SalonHonor.cerrarModal()"
                                style="padding:9px 18px; border-radius:var(--radius-md,10px); border:1px solid var(--border); background:transparent; color:var(--text-dim); font-weight:700; cursor:pointer;">
                            Cancelar
                        </button>
                        <button type="submit" id="honor-form-submit-btn"
                                onclick="window.SalonHonor.submitForm()"
                                style="padding:9px 20px; border-radius:var(--radius-md,10px); border:none; background:var(--primary,#f59e0b); color:#000; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:6px; transition:opacity .2s;">
                            🎖️ Publicar
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(ov);
        // Cerrar al clickear fuera
        ov.addEventListener('click', (e) => { if (e.target === ov) window.SalonHonor.cerrarModal(); });
        // ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && ov.classList.contains('open')) window.SalonHonor.cerrarModal();
        });
        return ov;
    }

    /** Abre el modal admin. Si se pasa un item, lo precarga para edición. */
    function abrirModalHonor(item) {
        if (!isAdmin()) return;
        const ov = ensureAdminModal();
        // Reset / carga
        document.getElementById('honor-form-id').value = item ? (item.id || '') : '';
        document.getElementById('honor-form-nick').value = item ? (item.nick || '') : '';
        document.getElementById('honor-form-titulo').value = item ? (item.titulo || '') : '';
        document.getElementById('honor-form-descripcion').value = item ? (item.descripcion || '') : '';
        document.getElementById('honor-form-categoria').value = item ? (item.categoria || 'general') : 'general';
        document.getElementById('honor-form-fecha').value = item ? (item.fecha_logro || '') : '';
        document.getElementById('honor-form-ig').value = item ? (item.instagram_user || '') : '';
        document.getElementById('honor-form-enlace').value = item ? (item.enlace_referencia || '') : '';
        document.getElementById('honor-form-imagen').value = item ? (item.imagen_url || '') : '';
        document.getElementById('honor-form-destacado').checked = item ? (item.destacado === 1) : false;
        document.getElementById('honor-form-error').style.display = 'none';
        document.getElementById('honor-admin-modal-title').textContent = item ? '✏️ Editar Mérito' : '✨ Publicar Mérito';
        document.getElementById('honor-form-submit-btn').textContent = item ? '💾 Guardar Cambios' : '🎖️ Publicar';
        ov.classList.add('open');
        setTimeout(() => { const el = document.getElementById('honor-form-nick'); if (el) el.focus(); }, 80);
    }

    /** Envía el formulario a la API */
    function submitHonorForm() {
        const id = document.getElementById('honor-form-id').value;
        const nick = document.getElementById('honor-form-nick').value.trim();
        const titulo = document.getElementById('honor-form-titulo').value.trim();
        const descripcion = document.getElementById('honor-form-descripcion').value.trim();
        const categoria = document.getElementById('honor-form-categoria').value;
        const fecha_logro = document.getElementById('honor-form-fecha').value.trim();
        const instagram_user = document.getElementById('honor-form-ig').value.trim().replace(/^@/, '');
        const instagram_url = instagram_user ? `https://instagram.com/${encodeURIComponent(instagram_user)}` : '';
        const enlace_referencia = document.getElementById('honor-form-enlace').value.trim();
        const imagen_url = document.getElementById('honor-form-imagen').value.trim();
        const destacado = document.getElementById('honor-form-destacado').checked ? 1 : 0;
        const errEl = document.getElementById('honor-form-error');

        if (!nick || !titulo || !descripcion) {
            errEl.textContent = '❌ Nick, título y descripción son obligatorios.';
            errEl.style.display = 'block';
            return;
        }
        errEl.style.display = 'none';

        const btn = document.getElementById('honor-form-submit-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Guardando...';

        const payload = { nick, titulo, descripcion, categoria, fecha_logro, instagram_user, instagram_url, enlace_referencia, imagen_url, destacado };
        if (id) payload.id = parseInt(id, 10);

        fetch('/api/admin/logros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .catch(() => null)
        .then(res => {
            btn.disabled = false;
            btn.textContent = id ? '💾 Guardar Cambios' : '🎖️ Publicar';
            if (res && res.ok) {
                window.SalonHonor.cerrarModal();
                loadSalonHonorData();
            } else {
                errEl.textContent = '⚠️ ' + ((res && res.error) || 'Error al guardar. Verifica que el servidor esté activo.');
                errEl.style.display = 'block';
            }
        });
    }

    /** Cierra el modal admin */
    function cerrarModalHonor() {
        const ov = document.getElementById('honor-admin-modal-overlay');
        if (ov) ov.classList.remove('open');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH: Añadir botón editar en cada tarjeta admin (rehook después de render)
    // ─────────────────────────────────────────────────────────────────────────

    /** Versión parchada de renderCards que inyecta botones edit para admins */
    const _origRenderCards = renderCards;

    function renderCardsWithAdminHooks() {
        _origRenderCards();
        if (!isAdmin()) return;
        // Inyectar botón editar en cada tarjeta (usando data attr)
        document.querySelectorAll('.honor-card').forEach((card, idx) => {
            if (card.querySelector('.honor-card-edit-btn')) return;
            const item = allLogros.filter(i => i.visible !== 0)[idx];
            if (!item) return;
            const actionsDiv = card.querySelector('div:last-child');
            if (!actionsDiv) return;
            const editBtn = document.createElement('button');
            editBtn.className = 'honor-card-edit-btn';
            editBtn.innerHTML = '✏️ Editar';
            editBtn.onclick = () => abrirModalHonor(item);
            actionsDiv.appendChild(editBtn);
        });
    }

    // Exponer globalmente
    window.SalonHonor = {
        init: initSalonHonor,
        initLayout: initLayoutSalonHonor,
        loadData: loadSalonHonorData,
        abrirModal: abrirModalHonor,
        cerrarModal: cerrarModalHonor,
        submitForm: submitHonorForm
    };

    // Auto-arranque si estamos en salon-de-honor.html
    document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname || '';
        if (path.includes('salon-de-honor.html') || document.body.classList.contains('page-salon-honor')) {
            initSalonHonor();
        }
    });

    // Escuchar cambios de auth para mostrar/ocultar botón admin dinámicamente
    if (window.AuthManager && typeof window.AuthManager.onAuthChange === 'function') {
        window.AuthManager.onAuthChange(() => {
            injectAdminButton();
        });
    }

})();
