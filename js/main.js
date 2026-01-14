/**
 * MAIN.JS - AMIGOS JUGONES
 * Gestión de contenidos, navegación y Radar de Jugones
 */

window.cacheData = {};
let fullOrder = ["Nosotros"];

// 1. CAMBIO: Se incluye "Radar" y se renombra "Inscripciones" a "Formularios"
const todasLasSecciones = ["Nosotros", "Radar", "Calendario", "Actividades", "Participantes", "Divulgadores", "Creadores", "Organizaciones", "Tiendas", "Documentos", "Formularios"];

// Determinar sección actual por URL
const path = window.location.pathname.split("/").pop();
const paginaActual = path.replace(".html", "") || "index";

// Ajuste para el nombre visual de la sección inicial
let seccionInicial = (paginaActual === "index" || paginaActual === "") 
    ? "Nosotros" 
    : paginaActual.charAt(0).toUpperCase() + paginaActual.slice(1);

// 2. CAMBIO: Si la página es inscripciones, el título visual debe ser Formularios
if (paginaActual === "inscripciones") seccionInicial = "Formularios";

// --- UTILIDADES ---
function getContrastYIQ(hexcolor){
    if (!hexcolor || hexcolor === "#ffffff" || hexcolor === "transparent") return "black";
    hexcolor = hexcolor.replace("#", "");
    if(hexcolor.length === 3) hexcolor = hexcolor.split('').map(s => s+s).join('');
    var r = parseInt(hexcolor.substr(0,2),16);
    var g = parseInt(hexcolor.substr(2,2),16);
    var b = parseInt(hexcolor.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'black' : 'white';
}

function toggleMenu() { 
    document.getElementById('sidebar').classList.toggle('open'); 
    document.getElementById('overlay').classList.toggle('show'); 
    if(document.getElementById('hamburguesa')) document.getElementById('hamburguesa').style.animation = "none";
}

// --- CARGA INICIAL ---
window.onload = () => {
    fetch('datos.json?v=' + new Date().getTime())
    .then(response => response.json())
    .then(res => {
        // Mapear los datos de "Inscripciones" del JSON al nombre "Formularios" en la caché
        window.cacheData = {
            "Nosotros": res.initial.contenido,
            ...res.remaining.contenido,
            "Formularios": res.remaining.contenido["Inscripciones"], // Vincular datos
            "disponibilidad": res.disponibilidad 
        };
        
        // 3. CAMBIO: Asegurar que el orden del menú use el nombre nuevo
        fullOrder = ["Nosotros", "Radar", ...res.remaining.orden.map(n => n === "Inscripciones" ? "Formularios" : n)];
        
        renderMenu(fullOrder);
        
        if (paginaActual === "radar") {
            initRadar();
        } else {
            displayData(seccionInicial, false); 
        }
    })
    .catch(err => console.error("Error cargando JSON:", err));
};

// --- MENÚ Y NAVEGACIÓN ---
function renderMenu(names) {
    const menuDiv = document.getElementById('menu-items');
    if(!menuDiv) return;
    menuDiv.innerHTML = '';
    names.forEach(name => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerText = name;
        item.onclick = () => { 
            let url;
            const cleanName = name.toLowerCase();
            if (cleanName === 'nosotros') url = 'index.html';
            else if (cleanName === 'radar') url = 'radar.html';
            else if (cleanName === 'formularios') url = 'inscripciones.html'; // Mantiene el archivo original
            else url = cleanName + '.html';
            window.location.href = url;
        };
        menuDiv.appendChild(item);
    });
}

// --- RENDERIZADO DE SECCIONES ESTÁNDAR ---
function displayData(name, shouldPushState = true) {
    window.scrollTo(0, 0);
    
    const indicator = document.getElementById('current-title-display');
    if(indicator) indicator.innerText = name;
    
    const data = window.cacheData[name];
    const list = document.getElementById('links-list');
    if(!data || !list) return;

    // Se mantiene la excepción de Nosotros
    let html = (name !== "Nosotros" && data.introduccion) 
               ? `<div class="seccion-intro">${data.introduccion}</div>` 
               : "";

    if (data.tipo === 'subpestañas') {
        let tabs = Object.keys(data.datos);
        html += `<div class="sub-nav">`;
        tabs.forEach((t, i) => {
            html += `<div class="sub-tab ${i===0?'active':''}" onclick="renderTable(this, '${name}', '${t}')">${t}</div>`;
        });
        html += `</div><div id="table-place"></div>`;
        list.innerHTML = html;
        if(tabs.length > 0) renderTable(null, name, tabs[0]);
    } else {
        list.innerHTML = html + renderOthers(data);
    }

    list.innerHTML += renderFooter(name);
}

// --- (Las funciones renderTable y renderOthers se mantienen igual) ---

function renderTable(btn, parentName, subName) {
    if(btn) { 
        document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active')); 
        btn.classList.add('active'); 
    }
    const rows = window.cacheData[parentName].datos[subName];
    if(!rows || rows.length === 0) return;

    let html = `<div class="table-scroll"><table>`;
    rows.forEach((row, i) => {
        if (i === 0) {
            let bgColor = row[0].color || '#112F4F';
            let textColor = getContrastYIQ(bgColor);
            html += `<tr><th colspan="${row.length}" class="table-main-title" style="background-color: ${bgColor}; color: ${textColor};">${row[0].texto}</th></tr>`;
        } else {
            html += `<tr>`;
            row.forEach(cellObj => {
                let tag = (i === 1) ? 'th' : 'td';
                let bgColor = cellObj.color || '#ffffff';
                let textColor = (i === 1) ? getContrastYIQ(bgColor) : 'black';
                html += `<${tag} style="background-color: ${bgColor}; color: ${textColor};">${cellObj.texto || ''}</${tag}>`;
            });
            html += `</tr>`;
        }
    });
    document.getElementById('table-place').innerHTML = html + `</table></div>`;
}

function renderOthers(data) {
    if(data.tipo === 'calendar') {
        return `<iframe src="https://calendar.google.com/calendar/embed?src=amigosjugonesymas%40gmail.com&ctz=America%2FSantiago" style="border:0; width:100%; height:600px; border-radius:12px;"></iframe>`;
    }
    if(data.tipo === 'botones') {
        return `<div class="button-grid">` + 
            data.items.map(b => `<a href="${b.url}" target="_blank" class="custom-button">${b.nombre}</a>`).join('') + 
        `</div>`;
    }
    if(data.tipo === 'nosotros_block') {
        let nHtml = '<div class="nosotros-contenedor">';
        let bloqueAgrupado = ""; 
        data.items.forEach((it) => {
            if(it.esTitulo) {
                if(bloqueAgrupado !== "") {
                    nHtml += `<div class="nosotros-bloque-texto-agrupado">${bloqueAgrupado}</div>`;
                    bloqueAgrupado = "";
                }
                nHtml += `<div class="nosotros-titulo-principal">${it.titulo}</div>`;
            } else {
                let textoLimpio = it.contenido.replace(/\n/g, '<br>');
                let prefijo = it.titulo ? `<span>${it.titulo}:</span> ` : "";
                bloqueAgrupado += `<p>${prefijo}${textoLimpio}</p>`;
            }
        });
        if(bloqueAgrupado !== "") nHtml += `<div class="nosotros-bloque-texto-agrupado">${bloqueAgrupado}</div>`;
        return nHtml + '</div>';
    }
    return "";
}

// --- LÓGICA DEL RADAR (Igual que antes) ---
function initRadar() {
    const root = document.getElementById('radar-root');
    const indicator = document.getElementById('current-title-display');
    if(!root) return;
    if(indicator) indicator.innerText = "Radar";

    const dataDisp = window.cacheData["disponibilidad"];
    const introHtml = (dataDisp && dataDisp.introduccionFichas) 
        ? `<div class="seccion-intro">${dataDisp.introduccionFichas}</div>` 
        : "";

    root.innerHTML = `
        ${introHtml}
        <div class="day-selector">
            ${["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"].map((d, i) => 
                `<button class="day-btn ${i===0?'active':''}" onclick="renderRadarDay('${d}', this)">${d.substring(0,3)}</button>`
            ).join('')}
        </div>
        <div id="playerList"></div>
        ${renderFooter("Radar")}
    `;
    renderRadarDay('LUNES', document.querySelector('.day-btn.active'));
}

window.renderRadarDay = (day, btn) => {
    if(btn) {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    const list = document.getElementById('playerList');
    const players = window.cacheData.disponibilidad.dias[day] || [];
    
    if(players.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 40px; color:#999;">No hay jugones registrados para este día.</div>';
        return;
    }

    list.innerHTML = players.map((p, idx) => `
        <div class="player-card ${p.horario.toLowerCase().includes('no') ? 'not-available' : ''}" onclick="toggleRadarDetail(${idx})">
            <div>
                <strong style="font-size:1.1rem; color:var(--primary);">${p.nick}</strong><br>
                <small style="font-weight:600;"><i class="bi bi-clock"></i> ${p.horario}</small>
                
                ${p.excepcion ? `
                    <div style="font-size: 0.85rem; color: #666; font-style: italic; margin-top: 5px; border-top: 1px solid #eee; padding-top: 3px;">
                        <i class="bi bi-chat-dots-fill" style="font-size: 0.75rem;"></i> ${p.excepcion}
                    </div>` : ''}
            </div>
            <i class="bi bi-plus-circle-fill" style="color:var(--accent);"></i>
        </div>
        <div id="radar-det-${idx}" class="user-detail"></div>
    `).join('');
};

window.toggleRadarDetail = (idx) => {
    const el = document.getElementById(`radar-det-${idx}`);
    if(el.style.display === 'block') { el.style.display = 'none'; return; }
    
    const nick = document.querySelectorAll('.player-card strong')[idx].innerText;
    const f = window.cacheData.disponibilidad.fichas.find(ficha => ficha.nick === nick) || {};
    const d = window.cacheData.disponibilidad.dias[document.querySelector('.day-btn.active').innerText.toUpperCase()] || [];
    const pData = d.find(p => p.nick === nick) || {};

    el.innerHTML = `
        <div class="grid-ficha">
            <div><span class="label-ficha">📍 Sectores</span><span class="val-ficha">${f.sectores || '-'}</span></div>
            <div><span class="label-ficha">🎲 Estilos</span><span class="val-ficha">${f.categorias || '-'}</span></div>
            <div style="grid-column: span 2"><span class="label-ficha">🎒 Colección / Puedo llevar</span><span class="val-ficha">${f.coleccion || '-'}</span></div>
            <div style="grid-column: span 2"><span class="label-ficha">❤️ Favoritos</span><span class="val-ficha">${f.favoritos || '-'}</span></div>
        </div>
        ${pData.excepcion ? `<div class="excepcion-box"><strong>Nota del día:</strong> ${pData.excepcion}</div>` : ''}
    `;
    el.style.display = 'block';
};

// --- FOOTER COMÚN ---
function renderFooter(currentName) {
    return `
        <div class="section-footer">
            <div class="footer-label">Navegación Rápida</div>
            <div class="footer-btns">
                ${todasLasSecciones.filter(s => s !== currentName).map(s => `
                    <a href="${s.toLowerCase() === 'nosotros' ? 'index.html' : (s.toLowerCase() === 'formularios' ? 'inscripciones.html' : s.toLowerCase() + '.html')}" class="footer-btn">${s}</a>
                `).join('')}
            </div>
            <div class="contact-bar">
                <a href="https://www.instagram.com/amigosjugonesymas/" target="_blank" class="social-link link-ig">📸 Instagram</a>
                <a href="https://chat.whatsapp.com/KaZmswdC0Kw5JnTADqojcK" target="_blank" class="social-link link-ws">💬 WhatsApp</a>
            </div>
        </div>
    `;
}
