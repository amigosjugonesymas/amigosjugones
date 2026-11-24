/* === Amigos Jugones — main.js (entry point) === */
// Módulos cargados en orden vía <script> en los HTML — ver index.html
'use strict';

window.addEventListener('DOMContentLoaded', () => {
  // Determinamos en qué página física estamos gracias a components.js
  App.currentSection = typeof getCurrentPageId === 'function' ? getCurrentPageId() : 'inicio';

  // Reactividad inmediata al iniciar o cerrar sesión
  window.addEventListener('aj:auth-changed', () => {
    if (['formularios', 'juegos', 'inicio', 'encuestas'].includes(App.currentSection)) {
      renderSection(App.currentSection);
    }
  });

  loadData();
});

