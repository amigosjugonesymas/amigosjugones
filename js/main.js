let cacheData = {};
let fullOrder = ["Nosotros"];
const todasLasSecciones = ["Nosotros", "Calendario", "Actividades", "Participantes", "Divulgadores", "Creadores", "Organizaciones", "Tiendas", "Documentos", "Inscripciones"];

// Determinar qué sección cargar basado en el nombre del archivo HTML
const paginaActual = window.location.pathname.split("/").pop().replace(".html", "") || "index";
const seccionInicial = (paginaActual === "index") ? "Nosotros" : paginaActual.charAt(0).toUpperCase() + paginaActual.slice(1);

// --- FUNCIONES DE ANALYTICS ---
function trackPageView(name) {
    if (typeof gtag === 'function') {
        gtag('event', 'page_view', {
            page_title: name,
            page_location: window.location.href + '#' + name.toLowerCase()
        });
    }
}

function trackSocialClick(network) {
    if (typeof gtag === 'function') {
        gtag('event', 'social_click', {
            'event_category': 'Engagement',
            'event_label': network
        });
    }
}

// --- LÓGICA DE INTERFAZ ---
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
    document.getElementById('hamburguesa').style.animation = "none";
}

window.onload = () => {
    // El fetch busca el json con preventivo de caché para GitHub
    fetch('datos.json?v=' + new Date().getTime())
    .then(response => response.json())
    .then(res => {
        cacheData[res.initial.nombre] = res.initial.contenido;
        cacheData = {...cacheData, ...res.remaining.contenido};
        fullOrder = ["Nosotros", ...res.remaining.orden];
        renderMenu(fullOrder);
        displayData(seccionInicial);
    })
    .catch(err => console.error("Error cargando JSON:", err));
};

function renderMenu(names) {
    const menuDiv = document.getElementById('menu-items');
    if(!menuDiv) return;
    menuDiv.innerHTML = '';
    names.forEach(name => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerText = name;
        item.onclick = () => { 
            displayData(name); 
            toggleMenu(); 
        };
        menuDiv.appendChild(item);
    });
}

function displayData(name) {
    window.scrollTo(0, 0);
    const indicator = document.getElementById('current-title-display');
    if(indicator) indicator.innerText = name;
    
    // RASTREO DE GOOGLE ANALYTICS
    trackPageView(name);

    const data = cacheData[name];
    const list = document.getElementById('links-list');
    if(!data || !list) return;

    let html = data.introduccion ? `<div class="seccion-intro">${data.introduccion}</div>` : "";

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

    // Footer dinámico con tracking social
    let footerHtml = `
        <div class="section-footer">
            <div class="footer-label">Navegación Rápida</div>
            <div class="footer-btns">
                ${todasLasSecciones.filter(s => s !== name).map(s => `
                    <a href="${s.toLowerCase()}.html" class="footer-btn">${s}</a>
                `).join('')}
            </div>
            <div class="contact-bar">
                <a href="https://www.instagram.com/amigosjugonesymas/" target="_blank" class="social-link link-ig" onclick="trackSocialClick('Instagram')">📸 Instagram</a>
                <a href="https://chat.whatsapp.com/KaZmswdC0Kw5JnTADqojcK" target="_blank" class="social-link link-ws" onclick="trackSocialClick('WhatsApp')">💬 WhatsApp</a>
            </div>
        </div>
    `;
    list.innerHTML += footerHtml;
}

window.renderTable = (btn, parentName, subName) => {
    if(btn) { 
        document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active')); 
        btn.classList.add('active'); 
    }
    const rows = cacheData[parentName].datos[subName];
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
