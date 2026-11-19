/**
 * ============================================================================
 * AMIGOS JUGONES — GENERADOR DEL CMS PARA DOCUMENTOS, POPUPS Y REGLAS
 * ============================================================================
 * Carpeta Destino Drive: https://drive.google.com/drive/folders/1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU
 * ID Carpeta: 1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU
 * Cuenta Lunara: jokerobscuro@gmail.com
 * ============================================================================
 * Este script crea el libro 'AJ_DOCUMENTOS_Y_REGLAS' con 3 pestañas:
 *  1. COMO_GANAR_PUNTOS  -> Contenido del popup '🎯 Cómo ganar puntos'
 *  2. COMO_INICIAR_SESION -> Contenido del popup '🔑 Cómo iniciar sesión'
 *  3. REGLAS_DEL_GRUPO   -> Contenido del popup '📋 Reglas del grupo'
 *
 * Otorga acceso automático de Editor a Lunara y formatea las hojas.
 * ============================================================================
 */

const FOLDER_ID_DESTINO = "1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU";
const EMAIL_LUNARA = "jokerobscuro@gmail.com";

const PALETA = {
  fondo: "#1e1b4b",   // Púrpura oscuro neón Amigos Jugones
  texto: "#ffffff"
};

/**
 * EJECUTAR ESTA FUNCIÓN:
 * Crea el libro completo con las 3 pestañas y datos precargados.
 */
function crearLibroDocumentosYReglas() {
  Logger.log("Iniciando creación del libro AJ_DOCUMENTOS_Y_REGLAS...");

  const folder = DriveApp.getFolderById(FOLDER_ID_DESTINO);
  if (!folder) throw new Error("No se pudo acceder a la carpeta: " + FOLDER_ID_DESTINO);

  const hojasDef = [
    // ── PESTAÑA 1: CÓMO GANAR PUNTOS ─────────────────────────────────────────
    {
      nombre: "COMO_GANAR_PUNTOS",
      columnas: ["Seccion", "Orden", "Icono", "Titulo", "Descripcion", "Badge_Puntos", "Color_Acento"],
      datos: [
        [
          "BANNER", 1, "🎯 📦 🏆", "LA GRAN META: 1000 PUNTOS",
          "El primer jugador en alcanzar 1000 PUNTOS oficiales se lleva un JUEGO DE MESA FÍSICO REAL directo a su ludoteca.",
          "1000 PTS", "dorado"
        ],
        [
          "COMO_SUMAR", 1, "📋", "Tarjeta de Misión Grupal",
          "Cada mañana sale en el grupo una tarjeta con 7 desafíos sencillos (subir un meme, votar un versus, opinar de un juego). Cumples los 7 y ganas los puntos asignados a la carta diaria (todos los que la cumplan ganan). ¡Importante! Debes cumplir los 7 desafíos para ganar los puntos.",
          "Carta Diaria", "verde"
        ],
        [
          "COMO_SUMAR", 2, "🤫", "Tarjeta de Misión Secreta",
          "Entras a la web y robas tu carta individual del día. Cumples tu reto propio, envías la prueba y sumas puntos (cada miembro tiene retos distintos).",
          "+2 a +3 PTS", "verde"
        ],
        [
          "COMO_SUMAR", 3, "🗳️", "Votar en Encuestas Geek",
          "Entras a la web, votas tu juego, película o personaje favorito en la encuesta semanal y sumas +1 punto al instante.",
          "+1 PT", "verde"
        ],
        [
          "COMO_SUMAR", 4, "🏆", "Torneos Oficiales en Board Game Arena (BGA)",
          "• +1 PUNTO solo por participar en el torneo.\n• Podio: 🥇 1º Lugar +3 PTS | 🥈 2º Lugar +2 PTS | 🥉 3º Lugar +1 PT.",
          "+1 a +3 PTS", "verde"
        ],
        [
          "COMO_SUMAR", 5, "🕹️", "Renta Pasiva en el Arcade",
          "Si marcas un récord y quedas en el Top 3 de la Carrera o la Pelea Ninja, cobras puntos automáticos todos los días mientras nadie te baje del podio:\n🥇 1° Lugar: +3 PTS/día · 🥈 2° Lugar: +2 PTS/día · 🥉 3° Lugar: +1 PT/día.",
          "+1 a +3 PTS/día", "verde"
        ],
        [
          "COMO_SUMAR", 6, "👑", "Bonificación Semanal al Podio",
          "Al corte de los domingos a las 23:59 hrs se premia a los líderes:\n• Top 3 Ranking Principal: 🥇 +10 PTS | 🥈 +9 PTS | 🥉 +8 PTS.\n• Top 3 Arcade (Carrera y Pelea c/u): 🥇 +5 PTS | 🥈 +4 PTS | 🥉 +3 PTS.",
          "+3 a +10 PTS", "verde"
        ],
        [
          "COMO_SUMAR", 7, "🧩", "Aportar a la Comunidad",
          "Creas dinámicas y desafíos para el grupo usando las plantillas web de Generadores de Desafíos (puedes crear varios durante el día). Si forman parte de una misión, solo te dan los puntos de dicha tarjeta de misión.",
          "+1 PT por juego", "verde"
        ],
        [
          "RESTA_PUNTOS", 1, "💥", "Contraatacando (Misión de Sabotaje)",
          "Si vas perdiendo, puedes elegir ejecutar la misión secreta de sabotaje de tu tarjeta personal. Si la cumples sin que te descubran, le descuentas de golpe los puntos que indique la tarjeta a TODOS los que estén por encima de ti en el ranking.",
          "−5 PTS a los líderes", "rojo"
        ],
        [
          "RESTA_PUNTOS", 2, "🏎️", "Apostar en el Arcade",
          "Entrar a competir a la Carrera o a la Pelea cuesta 10 puntos de tu saldo. Es una inversión: arriesgas 10 puntos para intentar conquistar el podio y asegurar tu renta pasiva diaria.",
          "-10 PTS", "rojo"
        ],
        [
          "CATCH_UP", 1, "⚡", "¿Recién llegaste y están muy adelante en el ranking?",
          "Tranquilo: hay misiones diarias especiales que otorgan puntos extra si cumples los retos pero tu puntaje está lejos de los líderes del ranking global (por ejemplo, otorgando puntos extra fijos o doblando la puntuación a quienes estén bajo cierto umbral). Lo indica la tarjeta de las misiones.",
          "Catch-Up", "morado"
        ],
        [
          "REQUISITOS", 1, "📌", "Estar en el Grupo de WhatsApp",
          "Debes estar en el grupo de WhatsApp de Amigos Jugones, cumplir los desafíos y ganar puntos.",
          "Obligatorio", "dorado"
        ],
        [
          "REQUISITOS", 2, "📸", "Enviar Capturas a Administradores",
          "Debes enviarle a algún administrador capturas de pantalla de tus objetivos cumplidos para que registren tu puntuación.",
          "Obligatorio", "dorado"
        ],
        [
          "REQUISITOS", 3, "🔑", "Iniciar Sesión en la Web",
          "Hay algunos juegos en la web que te otorgan puntos automáticos, pero debes iniciar sesión para obtenerlos.",
          "Obligatorio", "dorado"
        ]
      ]
    },

    // ── PESTAÑA 2: CÓMO INICIAR SESIÓN ───────────────────────────────────────
    {
      nombre: "COMO_INICIAR_SESION",
      columnas: ["Seccion", "Orden", "Icono", "Titulo", "Descripcion", "Detalle", "Color_Acento"],
      datos: [
        [
          "BANNER", 1, "🛡️ 🔑 🎲", "Acceso de Miembros",
          "Sistema de Autenticación por Única Vez: tu navegador recuerda tu cuenta de forma segura y permanente sin pedirte contraseñas todos los días.",
          "Seguridad Permanente", "morado"
        ],
        [
          "PASO_A_PASO", 1, "1.", "Haz clic en el botón de acceso",
          "En el menú lateral presiona 🔑 Identifícate (Miembro) (o automáticamente al intentar votar en encuestas o jugar en el arcade).",
          "Menú Lateral", "morado"
        ],
        [
          "PASO_A_PASO", 2, "2.", "Ingresa tus 3 datos",
          "• 📱 Teléfono: Tu número de WhatsApp registrado (ej: +569...).\n• 🎮 Nick: Tu apodo en el grupo (ej: BLACK).\n• 🔑 Clave Semanal: La palabra clave vigente compartida en el grupo de WhatsApp.",
          "3 Campos Clave", "morado"
        ],
        [
          "PASO_A_PASO", 3, "3.", "Presiona: Verificar y Entrar 🚀",
          "El sistema valida tus credenciales y recuerda tu dispositivo permanentemente.",
          "1-Clic", "verde"
        ],
        [
          "BENEFICIOS", 1, "🃏", "Tarjetas de Misiones (Grupal y Secreta)",
          "Desbloquear la tarjeta diaria de 7 desafíos del grupo y robar tu carta individual del día (exclusivo para miembros).",
          "Exclusivo", "verde"
        ],
        [
          "BENEFICIOS", 2, "🪙", "Saldo Oficial de Puntos",
          "Visible en tiempo real en tu tarjeta de miembro.",
          "En Vivo", "verde"
        ],
        [
          "BENEFICIOS", 3, "🗳️", "Votos en Encuestas Geek",
          "Suma +1 PT directo a tu cuenta cada semana.",
          "Semanal", "verde"
        ],
        [
          "BENEFICIOS", 4, "🕹️", "Minijuegos Arcade",
          "Apuesta 10 PTS y asegura tu renta pasiva diaria en el podio.",
          "Renta Diaria", "verde"
        ],
        [
          "BENEFICIOS", 5, "🏆", "Torneos BGA y Formularios",
          "Acceso inmediato y desbloqueado.",
          "Automático", "verde"
        ],
        [
          "BENEFICIOS", 6, "🟢", "Presencia en Vivo",
          "Te muestra en línea con la comunidad.",
          "Comunidad", "verde"
        ]
      ]
    },

    // ── PESTAÑA 3: REGLAS DEL GRUPO ──────────────────────────────────────────
    {
      nombre: "REGLAS_DEL_GRUPO",
      columnas: ["Seccion", "Orden", "Icono", "Titulo", "Descripcion", "Tipo", "Color_Acento"],
      datos: [
        [
          "BANNER", 1, "🎲 🤝 😄", "Amigos Jugones · Comunidad",
          "Una comunidad donde los juegos de mesa son el pretexto perfecto para conectar personas increíbles.",
          "Bienvenida", "verde"
        ],
        [
          "REGLAS", 1, "⚖️", "Derecho de Admisión",
          "La administración se reserva el derecho de admisión y permanencia en la comunidad.",
          "Norma Oficial", "rojo"
        ],
        [
          "RECOMENDACIONES", 1, "📸", "Manda fotos al grupo",
          "Manda fotos al grupo de tus juegos y actividades — ¡nos encanta ver tus colecciones y partidas!",
          "Consejo", "azul"
        ],
        [
          "RECOMENDACIONES", 2, "🔕", "Pon el grupo en silencio",
          "Pon el grupo en silencio — somos muy activos y puede ser abrumador si no lo hacés.",
          "Consejo", "azul"
        ],
        [
          "RECOMENDACIONES", 3, "😌", "Si son muchos mensajes, no te estreses",
          "Si son muchos mensajes, no te estreses leyéndolos todos — incluso tenemos un ranking de mensajes sin leer.",
          "Consejo", "azul"
        ],
        [
          "RECOMENDACIONES", 4, "🎉", "Diviértete en el grupo sin ofender a los demás",
          "Diviértete en el grupo sin ofender a los demás — somos un espacio de diversión y respeto mutuo.",
          "Consejo", "azul"
        ]
      ]
    }
  ];

  crearLibroConHojas(folder, "AJ_DOCUMENTOS_Y_REGLAS", hojasDef);
  Logger.log("✅ Proceso completado con éxito. Libro AJ_DOCUMENTOS_Y_REGLAS creado y compartido.");
}

function crearLibroConHojas(folder, nombreLibro, hojasDef) {
  // Comprobar si ya existe
  const files = folder.getFilesByName(nombreLibro);
  if (files.hasNext()) {
    Logger.log("⚠️ El libro " + nombreLibro + " ya existe en la carpeta. Omitiendo creación.");
    return;
  }

  const ss = SpreadsheetApp.create(nombreLibro);
  const fileDrive = DriveApp.getFileById(ss.getId());
  fileDrive.moveTo(folder);

  hojasDef.forEach(def => {
    let sheet = ss.getSheetByName(def.nombre);
    if (!sheet) {
      sheet = ss.insertSheet(def.nombre);
    } else {
      sheet.clear();
    }

    // Cabeceras
    sheet.appendRow(def.columnas);
    const headerRange = sheet.getRange(1, 1, 1, def.columnas.length);
    headerRange.setBackground(PALETA.fondo)
               .setFontColor(PALETA.texto)
               .setFontWeight("bold")
               .setFontSize(10)
               .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);

    // Datos
    if (def.datos && def.datos.length > 0) {
      def.datos.forEach(row => sheet.appendRow(row));
    }

    // Formato de bordes y alineación
    if (def.datos.length > 0) {
      const dataRange = sheet.getRange(2, 1, def.datos.length, def.columnas.length);
      dataRange.setVerticalAlignment("middle");
    }

    // Ajustar ancho de columnas
    for (let c = 1; c <= def.columnas.length; c++) {
      sheet.autoResizeColumn(c);
    }
  });

  // Borrar Hoja 1 por defecto
  const defSheet = ss.getSheetByName("Hoja 1") || ss.getSheetByName("Sheet1");
  if (defSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defSheet);
  }

  // Compartir con Lunara
  if (EMAIL_LUNARA && EMAIL_LUNARA.includes("@")) {
    try {
      ss.addEditor(EMAIL_LUNARA);
      Logger.log("✅ Acceso otorgado a Lunara en " + nombreLibro);
    } catch (e) {
      Logger.log("⚠️ No se pudo compartir " + nombreLibro + ": " + e.message);
    }
  }

  Logger.log("📄 Creado: " + nombreLibro + " | URL: " + ss.getUrl());
}
