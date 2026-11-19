/**
 * ============================================================================
 * AMIGOS JUGONES — GENERADOR DE TARJETAS DE LOGRO AMOLED (CANVAS CLIENT-SIDE)
 * ============================================================================
 * Versión: 1.0 (Mobile-First · Sin Spoilers · Descarga PNG + WebShare WhatsApp)
 * Archivo: "js/logro-card.js"
 * ============================================================================
 */

(function(window) {
  'use strict';

  function crearCanvas800() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    return canvas;
  }

  function dibujarBaseAmoled(ctx, badgeTipo, nick, fecha) {
    // Fondo gradiente AMOLED
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, '#0d0a20');
    grad.addColorStop(0.5, '#080814');
    grad.addColorStop(1, '#04020a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // Marco exterior Neón
    const borderGrad = ctx.createLinearGradient(0, 0, 800, 800);
    borderGrad.addColorStop(0, '#7c3aed');
    borderGrad.addColorStop(0.5, '#2563eb');
    borderGrad.addColorStop(1, '#38bdf8');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(16, 16, 768, 768, 24);
    ctx.stroke();

    // Marco interior tenue
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(26, 26, 748, 748, 18);
    ctx.stroke();

    // Píldora Club Superior
    ctx.fillStyle = 'rgba(124, 58, 237, 0.25)';
    ctx.beginPath();
    ctx.roundRect(50, 48, 270, 36, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#c084fc';
    ctx.textAlign = 'center';
    ctx.fillText('🎲 AMIGOS JUGONES · OFICIAL', 185, 71);

    // Fecha a la derecha
    ctx.font = '600 14px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    const fechaText = fecha || new Date().toLocaleDateString('es-CL');
    ctx.fillText(`📅 ${fechaText}`, 745, 72);

    // Badge de Reto Central
    const badgeGrad = ctx.createLinearGradient(140, 110, 660, 110);
    badgeGrad.addColorStop(0, '#7c3aed');
    badgeGrad.addColorStop(1, '#2563eb');
    ctx.fillStyle = badgeGrad;
    ctx.beginPath();
    ctx.roundRect(140, 110, 520, 46, 12);
    ctx.fill();

    ctx.font = '900 17px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badgeTipo.toUpperCase(), 400, 139);

    // Píldora Nick del Jugador
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(200, 175, 400, 48, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.font = '900 22px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(`👤 ${nick || 'Gamer'}`, 400, 207);
  }

  function dibujarPieAmoled(ctx) {
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 725);
    ctx.lineTo(750, 725);
    ctx.stroke();

    ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 RETO DIARIO COMPLETADO', 50, 755);

    ctx.font = '600 14px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('amigosjugonesymas.github.io', 750, 755);
  }

  const LogroCard = {
    /**
     * Generar tarjeta de Críptico del Día (sin spoiler de respuesta)
     */
    generarCriptico(opts) {
      const { nick, intentos, segundos, pts, racha, bonoRacha, fecha } = opts;
      const canvas = crearCanvas800();
      const ctx = canvas.getContext('2d');

      dibujarBaseAmoled(ctx, '🧠 CRÍPTICO DEL DÍA · RESUELTO', nick, fecha);

      // Icono central de victoria
      ctx.font = '72px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉', 400, 310);

      // Título de éxito
      ctx.font = '900 28px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('¡ACIERTO TOTAL!', 400, 355);

      // Caja dorada de Puntos
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.beginPath();
      ctx.roundRect(140, 385, 520, 160, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('PUNTOS GANADOS', 400, 420);

      ctx.font = '900 68px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`+${pts || 10} PTS`, 400, 490);

      if (bonoRacha > 0) {
        ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('🌟 ¡Bono Semanal de Racha +10 PTS incluido!', 400, 525);
      }

      // Fila de Estadísticas (Intentos, Tiempo, Racha)
      const m = String(Math.floor(segundos / 60)).padStart(2, '0');
      const s = String(segundos % 60).padStart(2, '0');

      const stats = [
        { label: 'INTENTO', val: `🎯 ${intentos || 1}º` },
        { label: 'TIEMPO', val: `⏱️ ${m}:${s}` },
        { label: 'RACHA', val: `🔥 ${racha || 1} DÍAS` }
      ];

      stats.forEach((st, idx) => {
        const x = 145 + (idx * 175);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.roundRect(x, 570, 160, 78, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 11px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(st.label, x + 80, 595);

        ctx.font = '900 18px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(st.val, x + 80, 628);
      });

      dibujarPieAmoled(ctx);
      return canvas;
    },

    /**
     * Generar tarjeta oficial de Misión Diaria Cumplida (para WhatsApp sin bots)
     */
    generarTarjetaMisionDiaria({ nick, fecha, puntos = 7, numDesafios = 7 }) {
      const canvas = crearCanvas800();
      const ctx = canvas.getContext('2d');

      // Fondo gradiente AMOLED Esmeralda Neón
      const grad = ctx.createLinearGradient(0, 0, 0, 800);
      grad.addColorStop(0, '#061712');
      grad.addColorStop(0.5, '#040d0a');
      grad.addColorStop(1, '#020604');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Marco exterior Neón Esmeralda
      const borderGrad = ctx.createLinearGradient(0, 0, 800, 800);
      borderGrad.addColorStop(0, '#10b981');
      borderGrad.addColorStop(0.5, '#059669');
      borderGrad.addColorStop(1, '#34d399');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(16, 16, 768, 768, 24);
      ctx.stroke();

      // Marco interior tenue
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(26, 26, 748, 748, 18);
      ctx.stroke();

      // Píldora Club Superior
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.beginPath();
      ctx.roundRect(50, 48, 270, 36, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'center';
      ctx.fillText('🎲 AMIGOS JUGONES · OFICIAL', 185, 71);

      // Fecha a la derecha
      ctx.font = '600 14px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      const fechaText = fecha || new Date().toLocaleDateString('es-CL');
      ctx.fillText(`📅 ${fechaText}`, 745, 72);

      // Badge Central de Misión
      const badgeGrad = ctx.createLinearGradient(140, 110, 660, 110);
      badgeGrad.addColorStop(0, '#10b981');
      badgeGrad.addColorStop(1, '#047857');
      ctx.fillStyle = badgeGrad;
      ctx.beginPath();
      ctx.roundRect(140, 110, 520, 46, 12);
      ctx.fill();

      ctx.font = '900 17px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('🃏 MISIÓN DIARIA CUMPLIDA', 400, 139);

      // Emoji/Icono Trofeo Central
      ctx.font = '86px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆', 400, 260);

      // Nick en Oro Neón
      ctx.font = '900 36px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.shadowBlur = 15;
      ctx.fillText(nick || 'Miembro Jugón', 400, 320);
      ctx.shadowBlur = 0;

      // Subtítulo
      ctx.font = '700 18px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('¡Completó todos los Desafíos de Hoy!', 400, 355);

      // Caja de Puntos Gigante
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.beginPath();
      ctx.roundRect(160, 385, 480, 120, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 15px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('RECOMPENSA OFICIAL ACREDITADA', 400, 420);

      ctx.font = '900 52px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = 'rgba(52, 211, 153, 0.6)';
      ctx.shadowBlur = 20;
      ctx.fillText(`+${puntos} PUNTOS`, 400, 480);
      ctx.shadowBlur = 0;

      // 3 Cajas de Stats Inferiores
      const stats = [
        { label: 'DESAFÍOS', val: `${numDesafios} de 7` },
        { label: 'MODALIDAD', val: 'Todo o Nada' },
        { label: 'ESTADO', val: 'Aprobado ✔' }
      ];

      stats.forEach((st, i) => {
        const x = 120 + i * 195;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.roundRect(x, 545, 170, 80, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(st.label, x + 85, 572);

        ctx.font = '900 17px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(st.val, x + 85, 606);
      });

      dibujarPieAmoled(ctx);
      return canvas;
    },

    /**
     * Generar tarjeta de Trivia Geek (sin spoiler de respuesta)
     */
    generarTrivia(opts) {
      const { nick, esCorrecta, segundos, pts, racha, bonoRacha, fecha } = opts;
      const canvas = crearCanvas800();
      const ctx = canvas.getContext('2d');

      const badgeTipo = esCorrecta ? '🧩 TRIVIA GEEK · RESPUESTA CORRECTA' : '🛡️ TRIVIA GEEK · RETO COMPLETADO';
      dibujarBaseAmoled(ctx, badgeTipo, nick, fecha);

      // Icono central
      ctx.font = '72px "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(esCorrecta ? '🎉' : '🛡️', 400, 310);

      // Título
      ctx.font = '900 28px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(esCorrecta ? '¡RESPUESTA CORRECTA!' : '¡RETO COMPLETADO!', 400, 355);

      // Caja de puntos / racha
      ctx.fillStyle = esCorrecta ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)';
      ctx.beginPath();
      ctx.roundRect(140, 385, 520, 160, 20);
      ctx.fill();
      ctx.strokeStyle = esCorrecta ? 'rgba(245, 158, 11, 0.6)' : 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = esCorrecta ? '#fbbf24' : '#38bdf8';
      ctx.fillText(esCorrecta ? 'PUNTOS GANADOS' : 'ESTADO DE RACHA', 400, 420);

      ctx.font = '900 68px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = esCorrecta ? '#f59e0b' : '#38bdf8';
      ctx.fillText(esCorrecta ? `+${pts || 10} PTS` : 'RACHA PROTEGIDA', 400, 490);

      if (bonoRacha > 0) {
        ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('🌟 ¡Bono Semanal de Racha +10 PTS incluido!', 400, 525);
      } else if (!esCorrecta) {
        ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('En la trivia diaria tu racha nunca se rompe por fallar', 400, 525);
      }

      // Fila de Estadísticas (Velocidad, Racha, Estado)
      const stats = [
        { label: 'VELOCIDAD', val: `⏱️ ${segundos || 1}s` },
        { label: 'RACHA ACTIVA', val: `🔥 ${racha || 1} DÍAS` },
        { label: 'ESTADO', val: esCorrecta ? '✅ ACIERTO' : '🛡️ ACTIVO' }
      ];

      stats.forEach((st, idx) => {
        const x = 145 + (idx * 175);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.roundRect(x, 570, 160, 78, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 11px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(st.label, x + 80, 595);

        ctx.font = '900 18px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(st.val, x + 80, 628);
      });

      dibujarPieAmoled(ctx);
      return canvas;
    },

    /**
     * Generar tarjeta oficial de Misión Diaria Cumplida (para WhatsApp sin bots)
     */
    generarTarjetaMisionDiaria({ nick, fecha, puntos = 7, numDesafios = 7 }) {
      const canvas = crearCanvas800();
      const ctx = canvas.getContext('2d');

      // Fondo gradiente AMOLED Esmeralda Neón
      const grad = ctx.createLinearGradient(0, 0, 0, 800);
      grad.addColorStop(0, '#061712');
      grad.addColorStop(0.5, '#040d0a');
      grad.addColorStop(1, '#020604');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 800);

      // Marco exterior Neón Esmeralda
      const borderGrad = ctx.createLinearGradient(0, 0, 800, 800);
      borderGrad.addColorStop(0, '#10b981');
      borderGrad.addColorStop(0.5, '#059669');
      borderGrad.addColorStop(1, '#34d399');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(16, 16, 768, 768, 24);
      ctx.stroke();

      // Marco interior tenue
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(26, 26, 748, 748, 18);
      ctx.stroke();

      // Píldora Club Superior
      ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.beginPath();
      ctx.roundRect(50, 48, 270, 36, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 13px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'center';
      ctx.fillText('🎲 AMIGOS JUGONES · OFICIAL', 185, 71);

      // Fecha a la derecha
      ctx.font = '600 14px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      const fechaText = fecha || new Date().toLocaleDateString('es-CL');
      ctx.fillText(`📅 ${fechaText}`, 745, 72);

      // Badge Central de Misión
      const badgeGrad = ctx.createLinearGradient(140, 110, 660, 110);
      badgeGrad.addColorStop(0, '#10b981');
      badgeGrad.addColorStop(1, '#047857');
      ctx.fillStyle = badgeGrad;
      ctx.beginPath();
      ctx.roundRect(140, 110, 520, 46, 12);
      ctx.fill();

      ctx.font = '900 17px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('🃏 MISIÓN DIARIA CUMPLIDA', 400, 139);

      // Emoji/Icono Trofeo Central
      ctx.font = '86px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆', 400, 260);

      // Nick en Oro Neón
      ctx.font = '900 36px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
      ctx.shadowBlur = 15;
      ctx.fillText(nick || 'Miembro Jugón', 400, 320);
      ctx.shadowBlur = 0;

      // Subtítulo
      ctx.font = '700 18px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('¡Completó todos los Desafíos de Hoy!', 400, 355);

      // Caja de Puntos Gigante
      ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.beginPath();
      ctx.roundRect(160, 385, 480, 120, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 15px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('RECOMPENSA OFICIAL ACREDITADA', 400, 420);

      ctx.font = '900 52px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = 'rgba(52, 211, 153, 0.6)';
      ctx.shadowBlur = 20;
      ctx.fillText(`+${puntos} PUNTOS`, 400, 480);
      ctx.shadowBlur = 0;

      // 3 Cajas de Stats Inferiores
      const stats = [
        { label: 'DESAFÍOS', val: `${numDesafios} de 7` },
        { label: 'MODALIDAD', val: 'Todo o Nada' },
        { label: 'ESTADO', val: 'Aprobado ✔' }
      ];

      stats.forEach((st, i) => {
        const x = 120 + i * 195;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.roundRect(x, 545, 170, 80, 14);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 12px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(st.label, x + 85, 572);

        ctx.font = '900 17px "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(st.val, x + 85, 606);
      });

      dibujarPieAmoled(ctx);
      return canvas;
    },

    /**
     * Descargar imagen generada directamente
     */
    descargarCanvas(canvas, filename) {
      const link = document.createElement('a');
      link.download = filename || 'amigosjugones_logro.png';
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    /**
     * Compartir imagen en WhatsApp / Web Share
     */
    async compartirCanvas(canvas, filename, shareText) {
      if (canvas.toBlob) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            this.descargarCanvas(canvas, filename);
            return;
          }
          const file = new File([blob], filename || 'amigosjugones_logro.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Mi logro en Amigos Jugones',
                text: shareText || '¡Completé mi reto diario en Amigos Jugones! 🎲'
              });
              return;
            } catch (err) {
              if (err.name === 'AbortError') return;
            }
          }
          // Fallback: descarga directa y abrir WhatsApp
          this.descargarCanvas(canvas, filename);
          const wsUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText || '¡Completé mi reto diario en Amigos Jugones! 🎲')}`;
          window.open(wsUrl, '_blank');
        }, 'image/png');
      } else {
        this.descargarCanvas(canvas, filename);
      }
    }
  };

  window.LogroCard = LogroCard;
})(window);

