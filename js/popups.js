/* === Amigos Jugones — popups.js === */
// Extraído de main.js

/**
 * Renderizador dinámico de Popups desde documentos.json (CMS de Google Sheets / Lunara)
 */
function renderPopupFromDocumentos(id, doc) {
  if (!doc) return '';

  if (id === 'reglas_grupo') {
    const banner = doc.banner || {};
    const reglas = doc.reglas || [];
    const recom = doc.recomendaciones || [];

    const reglasHtml = reglas.map(r => `
      <div style="background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:8px; border-left:3px solid #f87171; display:flex; gap:10px; align-items:flex-start;">
        <span style="color:#f87171; font-weight:800; font-size:1rem; flex-shrink:0;">${r.num || ''}.</span>
        <span style="color:var(--text); line-height:1.5;">${r.texto}</span>
      </div>
    `).join('');

    const recomHtml = recom.map(rec => `
      <div style="background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:8px; border-left:3px solid #60a5fa; display:flex; gap:10px; align-items:flex-start;">
        <span style="color:#60a5fa; font-weight:800; flex-shrink:0;">${rec.num || ''}.</span>
        <span style="color:var(--text-dim); line-height:1.5;">${rec.icono || ''} <strong style="color:var(--text);">${rec.titulo}</strong> ${rec.texto}</span>
      </div>
    `).join('');

    return `
      <div style="display:flex; flex-direction:column; gap:18px;">
        <!-- Banner principal -->
        <div style="background:linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.1)); border:1px solid rgba(74,222,128,0.35); border-radius:12px; padding:18px; text-align:center;">
          <div style="font-size:1.9rem; margin-bottom:8px;">${banner.iconos || '🎲 🤝 😄'}</div>
          <div style="font-size:1.1rem; font-weight:800; color:#4ade80; text-transform:uppercase; letter-spacing:0.5px;">${banner.titulo || 'Amigos Jugones · Comunidad'}</div>
          <p style="margin:8px 0 0; color:var(--text-dim); font-size:0.88rem; line-height:1.5;">${banner.descripcion || ''}</p>
        </div>

        <!-- REGLAS -->
        <div style="background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.25); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; font-weight:800; color:#f87171; font-size:0.95rem; text-transform:uppercase;">
            <span>⚖️</span> Reglas
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
            ${reglasHtml}
          </div>
        </div>

        <!-- RECOMENDACIONES -->
        <div style="background:rgba(59,130,246,0.07); border:1px solid rgba(59,130,246,0.25); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; font-weight:800; color:#60a5fa; font-size:0.95rem; text-transform:uppercase;">
            <span>💡</span> Recomendaciones
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
            ${recomHtml}
          </div>
        </div>
      </div>
    `;
  } else if (id === 'como_iniciar') {
    const banner = doc.banner || {};
    const pasos = doc.pasos || [];
    const beneficios = doc.beneficios || [];

    const pasosHtml = pasos.map(p => `
      <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #a855f7;">
        <strong style="color:var(--text);">${p.num}. ${p.titulo}:</strong><br>
        <span style="color:var(--text-dim);">${p.descripcion}</span>
      </div>
    `).join('');

    const beneficiosHtml = beneficios.map(b => `
      <div>${b.icono || '✨'} <strong style="color:var(--text);">${b.titulo}:</strong> ${b.descripcion}</div>
    `).join('');

    return `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Banner Informativo -->
        <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(236, 72, 153, 0.15)); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">${banner.iconos || '🛡️ 🔑 🎲'}</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-light); text-transform: uppercase; letter-spacing: 0.5px;">${banner.titulo || 'Acceso de Miembros'}</div>
          <p style="margin: 8px 0 0 0; color: var(--text); font-size: 0.92rem; line-height: 1.5;">
            ${banner.descripcion || ''}
          </p>
        </div>

        <!-- Pasos Concisos -->
        <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; font-weight: 800; color: #c084fc; font-size: 0.95rem; text-transform: uppercase;">
            <span>📋</span> Paso a Paso Rápido
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem; line-height: 1.5;">
            ${pasosHtml}
          </div>
        </div>

        <!-- Beneficios al identificarte -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 10px; font-weight: 800; color: #34d399; font-size: 0.95rem; text-transform: uppercase;">
            <span>✨</span> ¿Qué se activa en tu cuenta?
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: var(--text-dim); line-height: 1.45;">
            ${beneficiosHtml}
          </div>
        </div>

        <!-- Botón de acción directa -->
        <div style="text-align: center; margin-top: 6px;">
          <button onclick="closePopup(); if(window.AuthManager) window.AuthManager.showModal();" class="arcade-start-btn" style="padding: 12px 24px; font-size: 0.9rem; font-weight: 800; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 4px 18px rgba(124, 58, 237, 0.35);">
            ${(window.AuthManager && window.AuthManager.isAuthenticated()) ? `👤 Ver Mi Cuenta (${window.AuthManager.getNick()})` : `🔑 Abrir Ventana de Inicio de Sesión`}
          </button>
        </div>
      </div>
    `;
  } else if (id === 'puntos') {
    const banner = doc.banner || {};
    const comoSumar = doc.como_sumar || [];
    const restaPuntos = doc.resta_puntos || [];
    const catchUp = doc.catch_up || {};
    const requisitos = doc.requisitos || [];

    const sumarHtml = comoSumar.map(s => `
      <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
        <strong style="color:var(--text);">${s.num ? s.num + '. ' : ''}${s.icono || ''} ${s.titulo}${s.badge ? ' (<span style=\"color:#34d399;\">' + s.badge + '</span>)' : ''}:</strong><br>
        <span style="color:var(--text-dim);">${s.descripcion}</span>
      </div>
    `).join('');

    const restaHtml = restaPuntos.map(r => `
      <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #f87171;">
        <strong style="color:var(--text);">${r.icono || ''} ${r.titulo}${r.badge ? ' (<span style=\"color:#f87171;\">' + r.badge + '</span>)' : ''}:</strong><br>
        <span style="color:var(--text-dim);">${r.descripcion}</span>
      </div>
    `).join('');

    const reqHtml = requisitos.map(rq => `
      <div style="display:flex; gap:8px; align-items:flex-start;">
        <span style="color:#fbbf24; font-weight:bold;">${rq.num || '•'}.</span>
        <span>${rq.texto}</span>
      </div>
    `).join('');

    return `
      <div style="display:flex; flex-direction:column; gap:18px;">
        <!-- Banner La Meta -->
        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.15)); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">${banner.iconos || '🎯 📦 🏆'}</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px;">${banner.titulo || 'LA GRAN META: 1000 PUNTOS'}</div>
          <p style="margin: 8px 0 0 0; color: var(--text); font-size: 0.95rem; line-height: 1.5;">
            ${banner.descripcion || ''}
          </p>
        </div>

        <!-- Sección Ganar Puntos -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; font-weight: 800; color: #34d399; font-size: 1rem; text-transform: uppercase;">
            <span>🟢</span> ¿Cómo sumas puntos?
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem; line-height: 1.5;">
            ${sumarHtml}
          </div>
        </div>

        <!-- Sección Resta de Puntos y Frenar Líderes -->
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; font-weight: 800; color: #f87171; font-size: 1rem; text-transform: uppercase;">
            <span>🔴</span> ¿Cómo puedes perder puntos o frenar a los líderes?
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem; line-height: 1.5;">
            ${restaHtml}
          </div>
        </div>

        <!-- Sección Catch-up -->
        <div style="background: rgba(147, 51, 234, 0.08); border: 1px solid rgba(147, 51, 234, 0.25); border-radius: 12px; padding: 14px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 8px; font-weight: 800; color: #c084fc; font-size: 0.95rem; text-transform: uppercase;">
            <span>⚡</span> ${catchUp.titulo || '¿Recién llegaste y están muy adelante en el ranking?'}
          </div>
          <p style="margin: 0; color: var(--text-dim); font-size: 0.85rem; line-height: 1.5;">
            ${catchUp.descripcion || ''}
          </p>
        </div>

        <!-- Sección Requisitos Obligatorios -->
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 10px; font-weight: 800; color: #fbbf24; font-size: 0.95rem; text-transform: uppercase;">
            <span>📌</span> Requisitos para Obtener Puntos
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--text-dim);">
            ${reqHtml}
          </div>
        </div>
      </div>
    `;
  }
  return '';
}

/**
 * Sistema de Popups para Links Legales/Mansión
 */
function openPopup(id) {
  const titles = {
    'que_hacer': '🧭 ¿Qué puedes hacer en la página web?',
    'reglamento': '📜 Reglamento del Grupo',
    'terminos': '🛡 Términos y Condiciones',
    'puntos': '🎯 ¿Cómo ganar puntos en Amigos Jugones?',
    'como_iniciar': '🔑 Cómo Iniciar Sesión en Amigos Jugones',
    'reglas_grupo': '📋 Reglas y Recomendaciones del Grupo'
  };

  let customContent = '';

  // 1. Intento dinámico desde documentos.json (CMS de Google Sheets / Lunara)
  if (App.data && App.data.documentos) {
    const docKey = (id === 'puntos') ? 'como_ganar_puntos' : id;
    if (App.data.documentos[docKey]) {
      customContent = renderPopupFromDocumentos(id, App.data.documentos[docKey]);
    }
  }

  // 2. Fallbacks estáticos si documentos.json no está disponible
  if (!customContent && id === 'reglas_grupo') {
    customContent = `
      <div style="display:flex; flex-direction:column; gap:18px;">

        <!-- Banner principal -->
        <div style="background:linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.1)); border:1px solid rgba(74,222,128,0.35); border-radius:12px; padding:18px; text-align:center;">
          <div style="font-size:1.9rem; margin-bottom:8px;">🎲 🤝 😄</div>
          <div style="font-size:1.1rem; font-weight:800; color:#4ade80; text-transform:uppercase; letter-spacing:0.5px;">Amigos Jugones · Comunidad</div>
          <p style="margin:8px 0 0; color:var(--text-dim); font-size:0.88rem; line-height:1.5;">Una comunidad donde los juegos de mesa son el pretexto perfecto para conectar personas increíbles.</p>
        </div>

        <!-- REGLAS -->
        <div style="background:rgba(239,68,68,0.07); border:1px solid rgba(239,68,68,0.25); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; font-weight:800; color:#f87171; font-size:0.95rem; text-transform:uppercase;">
            <span>⚖️</span> Reglas
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
            <div style="background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:8px; border-left:3px solid #f87171; display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#f87171; font-weight:800; font-size:1rem; flex-shrink:0;">1.</span>
              <span style="color:var(--text); line-height:1.5;">La <strong>administración se reserva el derecho de admisión</strong>.</span>
            </div>
          </div>
        </div>

        <!-- RECOMENDACIONES -->
        <div style="background:rgba(59,130,246,0.07); border:1px solid rgba(59,130,246,0.25); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; font-weight:800; color:#60a5fa; font-size:0.95rem; text-transform:uppercase;">
            <span>💡</span> Recomendaciones
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem;">
            <div style="background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:8px; border-left:3px solid #60a5fa; display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#60a5fa; font-weight:800; flex-shrink:0;">1.</span>
              <span style="color:var(--text-dim); line-height:1.5;">📸 <strong style="color:var(--text);">Manda fotos al grupo</strong> de tus juegos y actividades — ¡nos encanta ver tus colecciones y partidas!</span>
            </div>
            <div style="background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:8px; border-left:3px solid #60a5fa; display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#60a5fa; font-weight:800; flex-shrink:0;">2.</span>
              <span style="color:var(--text-dim); line-height:1.5;">🔕 <strong style="color:var(--text);">Pon el grupo en silencio</strong> — somos muy activos y puede ser abrumador si no lo hacés.</span>
            </div>
            <div style="background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:8px; border-left:3px solid #60a5fa; display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#60a5fa; font-weight:800; flex-shrink:0;">3.</span>
              <span style="color:var(--text-dim); line-height:1.5;">😌 <strong style="color:var(--text);">Si son muchos mensajes, no te estreses</strong> leyéndolos todos — incluso tenemos un <a href="ranking.html" onclick="closePopup()" style="color:#4ade80; font-weight:700;">📱 ranking de eso</a>.</span>
            </div>
            <div style="background:rgba(0,0,0,0.25); padding:10px 12px; border-radius:8px; border-left:3px solid #60a5fa; display:flex; gap:10px; align-items:flex-start;">
              <span style="color:#60a5fa; font-weight:800; flex-shrink:0;">4.</span>
              <span style="color:var(--text-dim); line-height:1.5;">🎉 <strong style="color:var(--text);">Diviértete en el grupo sin ofender a los demás</strong> — somos un espacio de diversión y respeto mutuo.</span>
            </div>
          </div>
        </div>

      </div>
    `;
  } else if (id === 'como_iniciar') {
    customContent = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Banner Informativo -->
        <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(236, 72, 153, 0.15)); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">🛡️ 🔑 🎲</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-light); text-transform: uppercase; letter-spacing: 0.5px;">Acceso de Miembros</div>
          <p style="margin: 8px 0 0 0; color: var(--text); font-size: 0.92rem; line-height: 1.5;">
            Sistema de <strong style="color:var(--accent-light);">Autenticación por Única Vez</strong>: tu navegador recuerda tu cuenta de forma segura y permanente sin pedirte contraseñas todos los días.
          </p>
        </div>

        <!-- Pasos Concisos -->
        <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; font-weight: 800; color: #c084fc; font-size: 0.95rem; text-transform: uppercase;">
            <span>📋</span> Paso a Paso Rápido
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem; line-height: 1.5;">
            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #a855f7;">
              <strong style="color:var(--text);">1. Haz clic en el botón de acceso:</strong><br>
              <span style="color:var(--text-dim);">En el menú lateral presiona <strong style="color:#c084fc;">🔑 Identifícate (Miembro)</strong> (o automáticamente al intentar votar en encuestas o jugar en el arcade).</span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #a855f7;">
              <strong style="color:var(--text);">2. Ingresa tus 3 datos:</strong><br>
              <span style="color:var(--text-dim);">
                • 📱 <strong style="color:var(--text);">Teléfono:</strong> Tu número de WhatsApp registrado (ej: <code>+569...</code>).<br>
                • 🎮 <strong style="color:var(--text);">Nick:</strong> Tu apodo en el grupo (ej: <code>BLACK</code>).<br>
                • 🔑 <strong style="color:var(--text);">Clave Semanal:</strong> La palabra clave vigente compartida en el grupo de WhatsApp.
              </span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #a855f7;">
              <strong style="color:var(--text);">3. Presiona:</strong> <strong style="color:#34d399;">Verificar y Entrar 🚀</strong>
            </div>
          </div>
        </div>

        <!-- Beneficios al identificarte -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 10px; font-weight: 800; color: #34d399; font-size: 0.95rem; text-transform: uppercase;">
            <span>✨</span> ¿Qué se activa en tu cuenta?
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; color: var(--text-dim); line-height: 1.45;">
            <div>🃏 <strong style="color:var(--text);">Tarjetas de Misiones (Grupal y Secreta):</strong> Desbloquear la tarjeta diaria de 7 desafíos del grupo y robar tu carta individual del día (exclusivo para miembros).</div>
            <div>🪙 <strong style="color:var(--text);">Saldo Oficial de Puntos:</strong> Visible en tiempo real en tu tarjeta de miembro.</div>
            <div>🗳️ <strong style="color:var(--text);">Votos en Encuestas Geek:</strong> Suma +1 PT directo a tu cuenta cada semana.</div>
            <div>🕹️ <strong style="color:var(--text);">Minijuegos Arcade:</strong> Apuesta 10 PTS y asegura tu renta pasiva diaria en el podio.</div>
            <div>🏆 <strong style="color:var(--text);">Torneos BGA y Formularios:</strong> Acceso inmediato y desbloqueado.</div>
            <div>🟢 <strong style="color:var(--text);">Presencia en Vivo:</strong> Te muestra en línea con la comunidad.</div>
          </div>
        </div>

        <!-- Botón de acción directa -->
        <div style="text-align: center; margin-top: 6px;">
          <button onclick="closePopup(); if(window.AuthManager) window.AuthManager.showModal();" class="arcade-start-btn" style="padding: 12px 24px; font-size: 0.9rem; font-weight: 800; background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; letter-spacing: 0.5px; text-transform: uppercase; box-shadow: 0 4px 18px rgba(124, 58, 237, 0.35);">
            ${(window.AuthManager && window.AuthManager.isAuthenticated()) ? `👤 Ver Mi Cuenta (${window.AuthManager.getNick()})` : `🔑 Abrir Ventana de Inicio de Sesión`}
          </button>
        </div>
      </div>
    `;
  } else if (id === 'puntos') {
    customContent = `
      <div style="display:flex; flex-direction:column; gap:18px;">
        <!-- Banner La Meta -->
        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(239, 68, 68, 0.15)); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">🎯 📦 🏆</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px;">LA GRAN META: 1000 PUNTOS</div>
          <p style="margin: 8px 0 0 0; color: var(--text); font-size: 0.95rem; line-height: 1.5;">
            El primer jugador en alcanzar <strong style="color:#fbbf24;">1000 PUNTOS</strong> oficiales se lleva un <strong style="color:#38bdf8;">JUEGO DE MESA FÍSICO REAL</strong> directo a su ludoteca.
          </p>
        </div>

        <!-- Sección Ganar Puntos -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; font-weight: 800; color: #34d399; font-size: 1rem; text-transform: uppercase;">
            <span>🟢</span> ¿Cómo sumas puntos?
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem; line-height: 1.5;">
            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
              <strong style="color:var(--text);">1. 📋 Tarjeta de Misión Grupal (<span style="color:#34d399;">+5 a +15 PTS</span>):</strong><br>
              <span style="color:var(--text-dim);">
                Cada mañana se activa una tarjeta con 7 desafíos sencillos. Cumples los 7 y ganas los puntos asignados a la carta diaria (rotación de +5 a +15 PTS; todos los que la cumplan ganan exactamente la misma cantidad).<br>
                • <strong style="color:#34d399;">⚡ Bono Activador (+3 PTS):</strong> Cualquiera puede sacar la tarjeta de la web y ponerla en el grupo. El primero en hacerlo gana <strong>+3 PTS</strong> enviando su captura de prueba.<br>
                • <strong style="color:#f87171;">⚠️ Regla de Activación:</strong> Si la tarjeta no está puesta en el grupo, <em>nadie puede sumar puntos ese día</em>.<br>
                <span style="color:#f59e0b; font-weight:600;">¡Importante! Debes cumplir los 7 desafíos para cobrar los puntos de la tarjeta ("Todo o Nada").</span>
              </span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
              <strong style="color:var(--text);">2. 🤫 Tarjeta de Misión Secreta (<span style="color:#34d399;">+5 a +15 PTS</span>):</strong><br>
              <span style="color:var(--text-dim);">Entras a la web y robas tu carta individual del día. Cumples tu reto propio (Vía Positiva), envías la prueba y sumas de +5 a +15 PTS (los retos son diferentes pero la recompensa fijada para el día es idéntica para todos los que la cumplan).</span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
              <strong style="color:var(--text);">3. 🗳️ Votar en Encuestas Geek (<span style="color:#34d399;">+1 PT</span>):</strong><br>
              <span style="color:var(--text-dim);">Entras a la web, votas tu juego, película o personaje favorito en la encuesta semanal y sumas +1 punto al instante.</span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
              <strong style="color:var(--text);">4. 🏆 Torneos Oficiales en Board Game Arena (BGA):</strong><br>
              <span style="color:var(--text-dim);">• <strong style="color:#34d399;">+1 PUNTO</strong> solo por participar en el torneo.<br>• Podio: 🥇 1º Lugar <strong style="color:#fbbf24;">+3 PTS</strong> | 🥈 2º Lugar <strong style="color:#94a3b8;">+2 PTS</strong> | 🥉 3º Lugar <strong style="color:#d97706;">+1 PT</strong>.</span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
              <strong style="color:var(--text);">5. 🕹️ Renta Pasiva en el Arcade (<span style="color:#34d399;">+1 a +3 PTS diarios</span>):</strong><br>
              <span style="color:var(--text-dim);">Si marcas un récord y quedas en el Top 3 de la Carrera o la Pelea Ninja, cobras puntos automáticos todos los días mientras nadie te baje del podio:<br>🥇 1° Lugar: <strong style="color:#fbbf24;">+3 PTS/día</strong> · 🥈 2° Lugar: <strong style="color:#94a3b8;">+2 PTS/día</strong> · 🥉 3° Lugar: <strong style="color:#d97706;">+1 PT/día</strong>.</span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #34d399;">
              <strong style="color:var(--text);">6. 🧩 Aportar a la Comunidad (<span style="color:#34d399;">+1 PT por juego</span>):</strong><br>
              <span style="color:var(--text-dim);">Creas dinámicas y desafíos para el grupo usando las plantillas web de Generadores de Desafíos (puedes crear varios durante el día). Si forman parte de una misión, solo te dan los puntos de dicha tarjeta de misión.</span>
            </div>
          </div>
        </div>

        <!-- Sección Resta de Puntos y Frenar Líderes -->
        <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 12px; font-weight: 800; color: #f87171; font-size: 1rem; text-transform: uppercase;">
            <span>🔴</span> ¿Cómo puedes perder puntos o frenar a los líderes?
          </div>
          <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.88rem; line-height: 1.5;">
            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #f87171;">
              <strong style="color:var(--text);">💥 Contraatacando (Caparazón Azul / Sabotaje) (<span style="color:#f87171;">-10 a -20 PTS</span>):</strong><br>
              <span style="color:var(--text-dim);">Si vas perdiendo, puedes elegir ejecutar la misión secreta de sabotaje de tu tarjeta personal en WhatsApp. Si la cumples sin que te descubran, le descuentas de golpe el valor del día (-10 a -20 PTS) a <strong style="color:#fff;">TODOS los que estén estrictamente por encima de ti en el ranking</strong>. Los ataques de varios miembros se acumulan en cascada, concentrando el mayor castigo sobre los líderes de la cima.</span>
            </div>

            <div style="background: rgba(0,0,0,0.25); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #f87171;">
              <strong style="color:var(--text);">🏎️ Apostar en el Arcade (<span style="color:#f87171;">-10 PTS</span>):</strong><br>
              <span style="color:var(--text-dim);">Entrar a competir a la Carrera o a la Pelea cuesta 10 puntos de tu saldo. Es una inversión: arriesgas 10 puntos para intentar conquistar el podio y asegurar tu renta pasiva diaria.</span>
            </div>
          </div>
        </div>

        <!-- Sección Catch-up -->
        <div style="background: rgba(147, 51, 234, 0.08); border: 1px solid rgba(147, 51, 234, 0.25); border-radius: 12px; padding: 14px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 8px; font-weight: 800; color: #c084fc; font-size: 0.95rem; text-transform: uppercase;">
            <span>⚡</span> ¿Recién llegaste y están muy adelante en el ranking?
          </div>
          <p style="margin: 0; color: var(--text-dim); font-size: 0.85rem; line-height: 1.5;">
            Tranquilo: hay misiones diarias especiales que otorgan puntos extra si cumples los retos pero tu puntaje está lejos de los líderes del ranking global (por ejemplo, otorgando puntos extra fijos o doblando la puntuación a quienes estén bajo cierto umbral). Lo indica la tarjeta de las misiones.
          </p>
        </div>

        <!-- Sección Requisitos Obligatorios -->
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 16px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom: 10px; font-weight: 800; color: #fbbf24; font-size: 0.95rem; text-transform: uppercase;">
            <span>📌</span> Requisitos para Obtener Puntos
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; color: var(--text-dim);">
            <div style="display:flex; gap:8px; align-items:flex-start;">
              <span style="color:#fbbf24; font-weight:bold;">1.</span>
              <span><strong style="color:var(--text);">Debes estar en el grupo de WhatsApp de Amigos Jugones</strong>, cumplir los desafíos y ganar puntos.</span>
            </div>
            <div style="display:flex; gap:8px; align-items:flex-start;">
              <span style="color:#fbbf24; font-weight:bold;">2.</span>
              <span><strong style="color:var(--text);">Debes enviarle a algún administrador capturas de pantalla</strong> de tus objetivos cumplidos para que registren tu puntuación (o enviarlas mediante el módulo web).</span>
            </div>
            <div style="display:flex; gap:8px; align-items:flex-start;">
              <span style="color:#fbbf24; font-weight:bold;">3.</span>
              <span><strong style="color:var(--text);">Hay algunos juegos en la web que te otorgan puntos automáticos</strong>, pero debes iniciar sesión para obtenerlos.</span>
            </div>
            <div style="display:flex; gap:8px; align-items:flex-start;">
              <span style="color:#fbbf24; font-weight:bold;">4.</span>
              <span><strong style="color:#fbbf24;">🛡️ Requisito de Activación:</strong> Para reclamar y validar los puntos de las Misiones (Grupal de 7 retos o Tarjeta Secreta), tu número debe tener un <strong>Nick activado en la página web</strong>. Los puntos de torneos BGA y actividad general se acumulan automáticamente a tu teléfono.</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (id === 'que_hacer') {
    customContent = `
      <div style="display:flex; flex-direction:column; gap:18px;">

        <!-- Banner Encabezado -->
        <div style="background:linear-gradient(135deg, rgba(124, 58, 237, 0.22) 0%, rgba(6, 182, 212, 0.18) 50%, rgba(236, 72, 153, 0.18) 100%); border:1px solid rgba(168, 85, 247, 0.45); border-radius:14px; padding:18px 20px; text-align:center; position:relative; overflow:hidden;">
          <div style="font-size:2rem; margin-bottom:6px;">🧭 🎲 ✨</div>
          <div style="font-size:1.15rem; font-weight:900; background:linear-gradient(90deg, #a78bfa, #38bdf8, #f472b6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; text-transform:uppercase; letter-spacing:0.5px;">
            Guía de Actividades en la Web
          </div>
          <p style="margin:8px 0 0; color:var(--text); font-size:0.9rem; line-height:1.5;">
            Conoce todo lo que puedes explorar, jugar, ganar y coordinar dentro de <strong>Amigos Jugones</strong>.
          </p>
        </div>

        <!-- SECCIÓN 1: EL MACROJUEGO -->
        <div style="background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.35); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:900; color:#fbbf24; font-size:0.95rem; text-transform:uppercase;">
              <span>🎯</span> 1. El Macrojuego (Camino a los 1000 Pts = Juego Físico Real)
            </div>
            <span class="badge" style="background:rgba(245, 158, 11, 0.2); color:#fbbf24; border:1px solid #fbbf24; font-size:0.68rem; font-weight:800;">PREMIO REAL</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem; line-height:1.5;">
            <div style="background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border-left:3px solid #fbbf24;">
              <strong style="color:var(--text); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                <span>📋</span> Misión del Día:
              </strong>
              <span style="color:var(--text-dim);">
                Ver y descargar la tarjeta diaria con <strong>7 desafíos Todo o Nada</strong> para el grupo de WhatsApp <span style="color:#fbbf24; font-weight:700;">(+5, +10 o +15 PTS)</span>.
              </span>
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border-left:3px solid #fbbf24;">
              <strong style="color:var(--text); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                <span>🤫</span> Misión Secreta:
              </strong>
              <span style="color:var(--text-dim);">
                Abrir tu sobre confidencial diario para sumar puntos de forma individual o lanzar un <strong>sabotaje</strong> que descuenta puntos a todos los líderes que estén por encima de ti.
              </span>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: JUEGOS & ARCADE COMPETITIVO -->
        <div style="background:rgba(124, 58, 237, 0.08); border:1px solid rgba(168, 85, 247, 0.35); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:900; color:#c084fc; font-size:0.95rem; text-transform:uppercase;">
              <span>🕹️</span> 2. Juegos & Arcade Competitivo
            </div>
            <span class="badge" style="background:rgba(124, 58, 237, 0.2); color:#c084fc; border:1px solid #c084fc; font-size:0.68rem; font-weight:800;">ZONA ARCADE</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem; line-height:1.5;">
            <div style="background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border-left:3px solid #a855f7;">
              <strong style="color:var(--text); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                <span>🏎️⚔️</span> Máquinas Arcade (Circuito Black 3D & Cyber Ninja):
              </strong>
              <span style="color:var(--text-dim);">
                Gastar una ficha <span style="color:#f87171; font-weight:700;">(10 PTS)</span> para competir en velocidad o reflejos y asegurar podio para cobrar <strong>renta pasiva diaria</strong> <span style="color:#34d399; font-weight:700;">(+3, +2 o +1 PTS/día)</span>.
              </span>
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border-left:3px solid #a855f7;">
              <strong style="color:var(--text); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                <span>🧩</span> 8 Generadores de Desafíos <span style="color:#34d399; font-weight:700;">(+1 PT c/u)</span>:
              </strong>
              <span style="color:var(--text-dim);">
                Diseñar y exportar tarjetas de <strong>Trivia, Versus, Siluetas, Collages, Pistas, Puzzles, Pixel Art y Anagramas</strong> para compartir con el grupo.
              </span>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: ACTIVIDADES COMUNITARIAS -->
        <div style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.35); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:900; color:#34d399; font-size:0.95rem; text-transform:uppercase;">
              <span>🤝</span> 3. Actividades Comunitarias
            </div>
            <span class="badge" style="background:rgba(16, 185, 129, 0.2); color:#34d399; border:1px solid #34d399; font-size:0.68rem; font-weight:800;">EN VIVO & SOCIAL</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; font-size:0.88rem; line-height:1.5;">
            <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; border-left:3px solid #10b981;">
              🏆 <strong style="color:var(--text);">Torneos BGA:</strong> <span style="color:var(--text-dim);">Inscribirte en torneos de mesa online oficiales <strong style="color:#34d399;">(+1 a +3 PTS)</strong>.</span>
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; border-left:3px solid #10b981;">
              🎯 <strong style="color:var(--text);">Radar Jugón:</strong> <span style="color:var(--text-dim);">Publicar si estás disponible hoy para jugar, tus juegos y tu comuna.</span>
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; border-left:3px solid #10b981;">
              🗳️ <strong style="color:var(--text);">Encuestas Geek:</strong> <span style="color:var(--text-dim);">Votar temas y dilemas lúdicos de la semana <strong style="color:#34d399;">(+1 PT instantáneo)</strong>.</span>
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; border-left:3px solid #10b981;">
              📅 <strong style="color:var(--text);">Juntas & Calendario:</strong> <span style="color:var(--text-dim);">Convocatorias a partidas presenciales y cronograma del mes.</span>
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px; border-left:3px solid #10b981;">
              🛍️ <strong style="color:var(--text);">Mercado Jugón:</strong> <span style="color:var(--text-dim);">Comprar, vender o intercambiar juegos usados entre miembros.</span>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 4: RANKINGS & PREMIOS MENSUALES -->
        <div style="background:rgba(236, 72, 153, 0.08); border:1px solid rgba(236, 72, 153, 0.35); border-radius:12px; padding:16px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:6px;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:900; color:#f472b6; font-size:0.95rem; text-transform:uppercase;">
              <span>📊</span> 4. Rankings & Premios Mensuales
            </div>
            <span class="badge" style="background:rgba(236, 72, 153, 0.2); color:#f472b6; border:1px solid #f472b6; font-size:0.68rem; font-weight:800;">PODIOS</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:0.88rem; line-height:1.5;">
            <div style="background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border-left:3px solid #ec4899;">
              <strong style="color:var(--text); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                <span>🥇</span> Ranking Principal:
              </strong>
              <span style="color:var(--text-dim);">
                Seguir la carrera acumulada hacia la meta de los <strong>1000 PTS</strong>.
              </span>
            </div>
            <div style="background:rgba(0,0,0,0.3); padding:10px 12px; border-radius:8px; border-left:3px solid #ec4899;">
              <strong style="color:var(--text); display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                <span>👑</span> Rankings Mensuales ("Los Mejores del Mes"):
              </strong>
              <span style="color:var(--text-dim);">
                Competir mes a mes en Arcade y Actividades para ganar <strong>bonificaciones de puntos extra automáticos</strong>.
              </span>
            </div>
          </div>
        </div>

        <!-- Botón de acción al pie -->
        <div style="text-align:center; margin-top:6px;">
          <button onclick="closePopup()" class="arcade-start-btn" style="padding:10px 24px; font-size:0.85rem; font-weight:800; background:linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%); color:white; border:none; border-radius:var(--radius-sm); cursor:pointer; letter-spacing:0.5px; text-transform:uppercase; box-shadow:0 4px 18px rgba(124, 58, 237, 0.35);">
            ¡Entendido, a Jugar! 🚀
          </button>
        </div>

      </div>
    `;
  } else if ((id === 'reglamento' || id === 'terminos') && App.data && App.data.reglamento_terminos) {
    // Tratamiento para las secciones dinámicas servidas por Google Sheets
    const list = App.data.reglamento_terminos[id] || [];
    if (list.length > 0) {
      customContent = list.map(item => {
        const text = item.trim();
        // Regla 1: Todo mayúsculas = Título con padding
        // Verificamos que sea uppercase, tenga más de 2 caracteres, contenga letras y no inicie con número
        if (text === text.toUpperCase() && text.length > 2 && /[A-Z]/.test(text) && !/^\d/.test(text)) {
          return `<h3 style="color:var(--accent-light); margin-top:24px; margin-bottom:12px; font-size:1.15rem; text-transform:uppercase;">${escapeHtml(text)}</h3>`;
        }
        // Regla 2: Inicia con número = Margen extra como punto de lista
        else if (/^\d/.test(text)) {
          return `<p style="margin-left:12px; margin-bottom:14px; line-height:1.6; color:var(--text);">${escapeHtml(text)}</p>`;
        }
        // Párrafo normal
        else {
          return `<p style="margin-bottom:14px; line-height:1.6; color:var(--text-dim);">${escapeHtml(text)}</p>`;
        }
      }).join('');
    }
  }

  // Fallback si no hay data de sheets por x motivo
  if (!customContent) {
    customContent = `
      <p>Próximamente aquí: Contenido detallado para <strong>${id}</strong>.</p>
      <p>Estamos preparando la información oficial para la versión 2.5.</p>
    `;
  }

  const modalHtml = `
    <div id="global-popup" class="modal-overlay fade-in" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(10px);">
      <div class="card glow" style="width:90%; max-width:${['puntos', 'que_hacer'].includes(id) ? '680px' : '600px'}; max-height:85vh; overflow-y:auto; position:relative; padding:30px; border-color:var(--primary);">
        <button onclick="closePopup()" style="position:absolute; top:15px; right:15px; background:none; border:none; color:white; font-size:1.5rem; cursor:pointer; opacity:0.6;">✕</button>
        <h2 style="margin-top:0; color:var(--primary-light); font-size:1.35rem;">${titles[id] || 'Información'}</h2>
        <div style="margin-top:20px; text-align:left;">
          ${customContent}
        </div>
        <div style="margin-top:30px; text-align:right;">
          <button class="tab-btn active" onclick="closePopup()">Entendido</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closePopup() {
  const p = document.getElementById('global-popup');
  if (p) p.remove();
}
