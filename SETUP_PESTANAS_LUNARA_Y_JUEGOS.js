/**
 * ============================================================================
 * AMIGOS JUGONES — SETUP OFICIAL DE PESTAÑAS NUEVAS (LUNARA & JUEGOS)
 * ============================================================================
 * Libro Destino: Economía y Rankings
 * ID: 19kthqFtjF4MTj8zSNe7NEN1YKnpNI9bELcL23rTeEoQ
 * ============================================================================
 * Ejecuta la función `ejecutarSetupPestanasNuevas()` desde el Editor de Apps Script
 * para crear e inicializar las 6 pestañas necesarias para el nuevo sistema.
 * ============================================================================
 */

const SETUP_CONFIG = {
  // Carpeta oficial PAGINA WEB
  FOLDER_ID: "1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU",
  NOMBRE_LIBRO: "AJ_ECONOMIA_Y_RANKINGS",
  PALETA: {
    fondo: "#0f0c29",       // Fondo cabecera púrpura oscuro
    texto: "#38bdf8",       // Texto cian neón
    borde: "#7c3aed"
  }
};

/**
 * 🚀 FUNCIÓN PRINCIPAL DE SETUP
 */
function ejecutarSetupPestanasNuevas() {
  Logger.log("Buscando '" + SETUP_CONFIG.NOMBRE_LIBRO + "' dentro de la carpeta PAGINA WEB (" + SETUP_CONFIG.FOLDER_ID + ")...");
  
  const folder = DriveApp.getFolderById(SETUP_CONFIG.FOLDER_ID);
  if (!folder) throw new Error("No se pudo acceder a la carpeta: " + SETUP_CONFIG.FOLDER_ID);

  const files = folder.getFilesByName(SETUP_CONFIG.NOMBRE_LIBRO);
  if (!files.hasNext()) {
    throw new Error("No se encontró el archivo '" + SETUP_CONFIG.NOMBRE_LIBRO + "' dentro de la carpeta PAGINA WEB.");
  }

  const file = files.next();
  const ss = SpreadsheetApp.open(file);
  
  Logger.log("==========================================================");
  Logger.log("🎯 ARCHIVO OFICIAL LOCALIZADO EN CARPETA 'PAGINA WEB'");
  Logger.log("📄 Nombre: " + ss.getName());
  Logger.log("🆔 ID REAL: " + ss.getId());
  Logger.log("🔗 URL: " + ss.getUrl());
  Logger.log("==========================================================");

  // 1. MENSAJES_SIN_LEER (Récords satíricos de WhatsApp - 32 miembros oficiales)
  setupMensajesSinLeer(ss);

  // 2. CRIPTICOS_BANCO (Banco de acertijos por fecha)
  setupCripticosBanco(ss);

  // 3. HISTORIAL_CRIPTICO (Registros diarios de jugadores en el críptico)
  setupHistorialCriptico(ss);

  // 4. TRIVIA_BANCO (Banco de preguntas geek de opción múltiple)
  setupTriviaBanco(ss);

  // 5. HISTORIAL_TRIVIA (Registros diarios de jugadores en la trivia)
  setupHistorialTrivia(ss);

  // 6. POPUP_DESTACADO (Mensajes y eventos destacados programables por el admin)
  setupPopupDestacado(ss);

  Logger.log("==========================================================");
  Logger.log("🎉 ¡LAS 6 PESTAÑAS NUEVAS FUERON CREADAS EN LA HOJA OFICIAL DE 'PAGINA WEB'!");
  Logger.log("==========================================================");
}

function formatearCabecera(sheet, columnas) {
  sheet.appendRow(columnas);
  const header = sheet.getRange(1, 1, 1, columnas.length);
  header.setBackground(SETUP_CONFIG.PALETA.fondo)
        .setFontColor(SETUP_CONFIG.PALETA.texto)
        .setFontWeight("bold")
        .setFontSize(10)
        .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
  for (let c = 1; c <= columnas.length; c++) {
    sheet.autoResizeColumn(c);
  }
}

/**
 * 1. Pestaña: MENSAJES_SIN_LEER
 */
function setupMensajesSinLeer(ss) {
  let sheet = ss.getSheetByName("MENSAJES_SIN_LEER");
  if (sheet) {
    Logger.log("ℹ️ MENSAJES_SIN_LEER ya existe. Omitiendo recreación.");
    return;
  }
  sheet = ss.insertSheet("MENSAJES_SIN_LEER");
  const columnas = ["Nombre", "Mensajes_Sin_Leer", "Fecha_Record", "Tier", "Telefono_Ref"];
  formatearCabecera(sheet, columnas);

  // Cargar los 32 jugadores base oficiales de ranking.json con sus récords iniciales
  const miembrosBase = [
    ["Tomi",              13416, "2026-10-20", "👑 Legendario", ""],
    ["Alexander",         5164,  "2026-10-20", "👑 Legendario", ""],
    ["Iker",              4927,  "2026-10-20", "👑 Legendario", ""],
    ["Ricardo Ruz",       4567,  "2026-10-20", "👑 Legendario", ""],
    ["Angelina",          4400,  "2026-10-20", "👑 Legendario", ""],
    ["Nicolas Acosta",    4055,  "2026-10-20", "👑 Legendario", ""],
    ["Arturo Vial",       3180,  "2026-10-20", "⚡ Épico",      ""],
    ["Papa Lobo",         2568,  "2026-10-20", "⚡ Épico",      ""],
    ["Felipe Llanos",     2401,  "2026-10-20", "⚡ Épico",      ""],
    ["Maikol",            2133,  "2026-10-20", "⚡ Épico",      ""],
    ["Yessenia",          1862,  "2026-10-20", "⚡ Épico",      ""],
    ["Rodrigo Rivas",     1748,  "2026-10-20", "⚡ Épico",      ""],
    ["Sofia",             1544,  "2026-10-20", "⚡ Épico",      ""],
    ["Diego Pinto",       1423,  "2026-10-20", "⚡ Épico",      ""],
    ["Carola",            1287,  "2026-10-20", "⚡ Épico",      ""],
    ["Matias G",          1155,  "2026-10-20", "⚡ Épico",      ""],
    ["Sasami",            999,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Aurora",            876,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Gerson",            871,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Cecy",              813,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Jacqueline",        695,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Karl",              634,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Jorge Rulo",        563,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Nico Roman",        543,   "2026-10-20", "🛡️ Heroico",    ""],
    ["Mauricio Leiva",    476,   "2026-10-20", "🌱 Superviviente", ""],
    ["Ego",               434,   "2026-10-20", "🌱 Superviviente", ""],
    ["Ismael",            388,   "2026-10-20", "🌱 Superviviente", ""],
    ["Francisco TeclasLudicas", 315, "2026-10-20", "🌱 Superviviente", ""],
    ["BLACK",             307,   "2026-10-20", "🌱 Superviviente", ""],
    ["Roberto Mono",      296,   "2026-10-20", "🌱 Superviviente", ""],
    ["Vasco Nuñez",       194,   "2026-10-20", "🌱 Superviviente", ""],
    ["Anto Orellana",     144,   "2026-10-20", "🌱 Superviviente", ""]
  ];

  miembrosBase.forEach(row => sheet.appendRow(row));
  Logger.log("✅ MENSAJES_SIN_LEER creada con 32 miembros.");
}

/**
 * 2. Pestaña: CRIPTICOS_BANCO
 */
function setupCripticosBanco(ss) {
  let sheet = ss.getSheetByName("CRIPTICOS_BANCO");
  if (sheet) {
    Logger.log("ℹ️ CRIPTICOS_BANCO ya existe. Omitiendo recreación.");
    return;
  }
  sheet = ss.insertSheet("CRIPTICOS_BANCO");
  const columnas = ["Fecha_Asignada", "Pista", "Longitud", "Respuesta", "Pista_Def", "Pista_Extra"];
  formatearCabecera(sheet, columnas);

  // Semilla de los primeros 7 acertijos crípticos geek
  const acertijos = [
    ["2026-11-08", "Clásico de comercio que arruina amistades con ovejas y trigo", 5, "CATAN", "Juego de mesa de Klaus Teuber publicado en 1995", "La isla hexagonal"],
    ["2026-11-09", "Monstruo de bolsillo eléctrico que acompaña a un entrenador eterno", 7, "PIKACHU", "Pokémon número 25 de la Pokédex Nacional", "Roedor amarillo con mejillas rojas"],
    ["2026-11-10", "Caballero oscuro que protege una ciudad corrupta sin usar armas de fuego", 6, "BATMAN", "Superhéroe de Gotham City creado por Bob Kane y Bill Finger", "Bruce Wayne"],
    ["2026-11-11", "Compañero peludo de Han Solo que habla en gruñidos de wookiee", 8, "CHEWBACCA", "Copiloto del Halcón Milenario en Star Wars", "El gigante de Kashyyyk"],
    ["2026-11-12", "Juego de deducción social donde un impostor sabotea la nave", 10, "AMONG US", "Videojuego indie de Innersloth muy popular en pandemia", "Tripulantes contra impostores"],
    ["2026-11-13", "Espada legendaria del Rey Arturo clavada en la roca", 9, "EXCALIBUR", "Arma mítica de la mitología artúrica", "Entregada por la Dama del Lago"],
    ["2026-11-14", "Anillo para gobernarlos a todos y en las tinieblas atarlos", 6, "SAURON", "El Señor Oscuro de Mordor en la obra de Tolkien", "El ojo que todo lo ve"]
  ];

  acertijos.forEach(row => sheet.appendRow(row));
  Logger.log("✅ CRIPTICOS_BANCO creada con 7 acertijos iniciales.");
}

/**
 * 3. Pestaña: HISTORIAL_CRIPTICO
 */
function setupHistorialCriptico(ss) {
  let sheet = ss.getSheetByName("HISTORIAL_CRIPTICO");
  if (sheet) {
    Logger.log("ℹ️ HISTORIAL_CRIPTICO ya existe. Omitiendo recreación.");
    return;
  }
  sheet = ss.insertSheet("HISTORIAL_CRIPTICO");
  const columnas = ["Fecha", "Nick", "Intentos", "Tiempo_Segundos", "PTS_Ganados", "Racha_Actual", "Timestamp"];
  formatearCabecera(sheet, columnas);
  Logger.log("✅ HISTORIAL_CRIPTICO creada con éxito.");
}

/**
 * 4. Pestaña: TRIVIA_BANCO
 */
function setupTriviaBanco(ss) {
  let sheet = ss.getSheetByName("TRIVIA_BANCO");
  if (sheet) {
    Logger.log("ℹ️ TRIVIA_BANCO ya existe. Omitiendo recreación.");
    return;
  }
  sheet = ss.insertSheet("TRIVIA_BANCO");
  const columnas = ["Fecha_Asignada", "Pregunta", "OpcionA", "OpcionB", "OpcionC", "OpcionD", "Respuesta_Correcta", "Categoria", "Dificultad"];
  formatearCabecera(sheet, columnas);

  // Semilla de las primeras 10 preguntas de trivia geek
  const preguntas = [
    ["2026-11-08", "¿Cuántos hexágonos de terreno componen el mapa base de Catan?", "16", "19", "21", "24", "B", "Juegos de Mesa", "Media"],
    ["2026-11-09", "¿En qué año se lanzó la primera consola PlayStation en Japón?", "1992", "1994", "1996", "1998", "B", "Videojuegos", "Media"],
    ["2026-11-10", "¿Cómo se llama la espada de Cloud Strife en Final Fantasy VII?", "Buster Sword", "Masamune", "Gunblade", "Soul Edge", "A", "Videojuegos", "Fácil"],
    ["2026-11-11", "¿Quién diseñó el emblemático juego de mesa Carcassonne?", "Uwe Rosenberg", "Klaus-Jürgen Wrede", "Vlaada Chvátil", "Stefan Feld", "B", "Juegos de Mesa", "Difícil"],
    ["2026-11-12", "¿Qué mineral ficticio es la debilidad más famosa de Superman?", "Vibranium", "Adamantium", "Kryptonita", "Beskar", "C", "Cómics", "Fácil"],
    ["2026-11-13", "¿Cuál es el nombre del protagonista del anime Evangelion?", "Shinji Ikari", "Rei Ayanami", "Asuka Langley", "Kaworu Nagisa", "A", "Anime", "Fácil"],
    ["2026-11-14", "¿En qué juego de mesa los jugadores intentan erradicar 4 virus globales cooperativamente?", "Pandemic", "Virus!", "Plague Inc", "Outbreak", "A", "Juegos de Mesa", "Fácil"],
    ["2026-11-15", "¿Quién dirigió la trilogía cinematográfica de El Señor de los Anillos?", "George Lucas", "Steven Spielberg", "Peter Jackson", "Ridley Scott", "C", "Cine", "Fácil"],
    ["2026-11-16", "¿Cómo se llama la moneda oficial en el universo de The Witcher?", "Gemas", "Rupias", "Coronas", "Septims", "C", "Videojuegos", "Media"],
    ["2026-11-17", "¿Cuál es el recurso más abundante en el juego de mesa Terraforming Mars?", "Titanio", "Plantas", "MegaCréditos", "Energía", "C", "Juegos de Mesa", "Media"]
  ];

  preguntas.forEach(row => sheet.appendRow(row));
  Logger.log("✅ TRIVIA_BANCO creada con 10 preguntas iniciales.");
}

/**
 * 5. Pestaña: HISTORIAL_TRIVIA
 */
function setupHistorialTrivia(ss) {
  let sheet = ss.getSheetByName("HISTORIAL_TRIVIA");
  if (sheet) {
    Logger.log("ℹ️ HISTORIAL_TRIVIA ya existe. Omitiendo recreación.");
    return;
  }
  sheet = ss.insertSheet("HISTORIAL_TRIVIA");
  const columnas = ["Fecha", "Nick", "Respuesta_Dada", "Es_Correcta", "Tiempo_Segundos", "PTS_Ganados", "Racha_Actual", "Timestamp"];
  formatearCabecera(sheet, columnas);
  Logger.log("✅ HISTORIAL_TRIVIA creada con éxito.");
}

/**
 * 6. Pestaña: POPUP_DESTACADO
 */
function setupPopupDestacado(ss) {
  let sheet = ss.getSheetByName("POPUP_DESTACADO");
  if (sheet) {
    Logger.log("ℹ️ POPUP_DESTACADO ya existe. Omitiendo recreación.");
    return;
  }
  sheet = ss.insertSheet("POPUP_DESTACADO");
  const columnas = ["Fecha", "Tipo", "Titulo", "Descripcion", "Icono_Emoji", "CTA_Texto", "CTA_Link", "Activo"];
  formatearCabecera(sheet, columnas);

  // Semilla de anuncios y novedades
  const anuncios = [
    ["2026-11-08", "NOVEDAD", "¡Llegó el Críptico y la Trivia del Día!", "Resuelve el reto diario en la web y mantén tu racha para ganar +10 PTS cada semana.", "🧠", "Jugar Ahora", "criptico.html", true],
    ["2026-11-09", "EVENTO", "Noche de Juegos en BGA", "Este miércoles nos reunimos en Discord para jugar Catan y Harmonies online.", "🎲", "Ver Calendario", "calendario.html", true]
  ];

  anuncios.forEach(row => sheet.appendRow(row));
  Logger.log("✅ POPUP_DESTACADO creada con éxito.");
}

