/**
 * ============================================================================
 * AMIGOS JUGONES — GENERADOR COMPLETO DEL CMS DE GOOGLE SHEETS
 * ============================================================================
 * Carpeta Destino: https://drive.google.com/drive/folders/1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU
 * ID Carpeta: 1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU
 * Cuenta Lunara: jokerobscuro@gmail.com
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
 * Crea los 3 libros faltantes del ecosistema sin tocar el de Economía ya creado.
 */
function crearDocumentosFaltantes() {
  Logger.log("Iniciando creación de los documentos faltantes del CMS...");

  const folder = DriveApp.getFolderById(FOLDER_ID_DESTINO);
  if (!folder) throw new Error("No se pudo acceder a la carpeta: " + FOLDER_ID_DESTINO);

  // ── 1. LIBRO 2: AJ_RADAR_Y_DISPONIBILIDAD ───────────────────────────────
  crearLibroConHojas(folder, "AJ_RADAR_Y_DISPONIBILIDAD", [
    {
      nombre: "JUGADORES_RADAR",
      columnas: ["Nick", "Zona", "Estilos_Favoritos", "Juegos_Favoritos", "Coleccion", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"],
      datos: [
        ["BLACK", "Sector Sur y Centro de Santiago", "Eurogames, Ameri, Fillers, Party Games", "Riverside, Faraway, Harmonies", "Me gusta probar juegos nuevos", "No disponible", "Tarde/Noche", "Tarde/Noche", "Tarde/Noche", "Tarde/Noche", "Tarde/Noche", "Tarde/Noche"],
        ["Ricardragon", "1.5 hrs desde Quilicura", "Eurogames, Ameri, RPG, Wargames", "Varios", "Preguntarme", "Mañana y Tarde", "Mañana y Tarde", "Mañana y Tarde", "Mañana y Tarde", "Mañana y Tarde", "Mañana y Tarde", "Mañana y Tarde"]
      ]
    },
    {
      nombre: "ZONAS_Y_ESTILOS",
      columnas: ["Categoria", "Valor_Permitido", "Descripcion"],
      datos: [
        ["Zona", "Santiago Centro", "Comunas centrales"],
        ["Zona", "Sector Sur", "San Miguel, La Cisterna, etc."],
        ["Zona", "Sector Oriente", "Providencia, Las Condes, etc."],
        ["Estilo", "Eurogames", "Gestión y colocación de trabajadores"],
        ["Estilo", "Ameritrash / Temáticos", "Dados, miniaturas y conflicto"],
        ["Estilo", "Party Games / Fillers", "Juegos rápidos y risas"]
      ]
    }
  ]);

  // ── 2. LIBRO 3: AJ_COMUNIDAD_Y_RECURSOS ─────────────────────────────────
  crearLibroConHojas(folder, "AJ_COMUNIDAD_Y_RECURSOS", [
    {
      nombre: "MERCADO_COMPRAVENTA",
      columnas: ["Timestamp", "Nick", "Categoria", "Titulo", "Estado", "Precio", "Contacto", "Foto_URL", "Expira", "Disponibles", "Activo"],
      datos: [
        [new Date().toISOString(), "BLACK", "Vender", "BATMAN (Compact Comics)", "Nuevo", "$ 15.000", "amigosjugones", "https://static.dc.com/2026-02/Dark-Knight-Returns-Compact-Comics-Edition.jpg", new Date(Date.now() + 7*24*3600*1000).toISOString(), 1, true]
      ]
    },
    {
      nombre: "CALENDARIO_EVENTOS",
      columnas: ["Fecha", "Titulo", "Descripcion", "Lugar", "Tipo", "Hora", "Enlace_Inscripcion"],
      datos: [
        ["2026-10-25", "Noche de Juegos en BGA", "Partidas online del club en Board Game Arena", "Discord / BGA", "Comunidad", "21:00", ""]
      ]
    },
    {
      nombre: "EVENTOS_DESTACADOS",
      columnas: ["Titulo", "Subtitulo", "Fecha", "Lugar", "Imagen_URL", "Boton_Texto", "Boton_URL"],
      datos: [
        ["Torneo de Primavera Amigos Jugones", "Gran encuentro competitivo de juegos de mesa", "Noviembre 2026", "Santiago", "imagenes/LOGO AMIGOS JUGONES.png", "Más información", ""]
      ]
    },
    {
      nombre: "DOCUMENTOS_REGLAMENTOS",
      columnas: ["Titulo", "Categoria", "Descripcion", "Enlace_PDF_o_Web", "Fecha_Actualizacion"],
      datos: [
        ["Reglamento General del Club", "Normativa", "Bases de convivencia y participación en el grupo de WhatsApp", "#", new Date().toLocaleDateString("es-CL")]
      ]
    },
    {
      nombre: "DIRECTORIO_STAFF",
      columnas: ["Nick", "Rol", "Titulo_Honorifico", "Contacto", "Avatar_URL"],
      datos: [
        ["BLACK", "Fundador / Administrador", "Emperador de la Mesa", "@amigosjugones", ""]
      ]
    },
    {
      nombre: "CONFIG_SITIO",
      columnas: ["Clave", "Valor", "Descripcion"],
      datos: [
        ["mantenimiento", "FALSE", "Si es TRUE muestra la pantalla de mantenimiento"],
        ["banner_novedad_activo", "TRUE", "Muestra el banner superior en Inicio"],
        ["banner_novedad_texto", "¡Bienvenidos a la nueva versión de Amigos Jugones! 🎲", "Texto del anuncio principal"]
      ]
    }
  ]);

  // ── 3. LIBRO 4: AJ_MISIONES_Y_FEED ──────────────────────────────────────
  crearLibroConHojas(folder, "AJ_MISIONES_Y_FEED", [
    {
      nombre: "MISIONES_PUBLICAS",
      columnas: ["ID_Mision", "Titulo", "Descripcion", "Recompensa_PTS", "Fecha_Inicio", "Fecha_Fin", "Estado"],
      datos: [
        ["MIS-001", "Primer Podio de la Semana", "Alcanza el podio en Circuito Black o Cyber Ninja", 50, new Date().toISOString(), "", "Activa"]
      ]
    },
    {
      nombre: "MISIONES_SECRETAS",
      columnas: ["ID_Mision", "Nick_Objetivo", "Mision_Texto", "Recompensa_PTS", "Estado"],
      datos: []
    },
    {
      nombre: "FEED_ACTIVIDAD",
      columnas: ["Timestamp", "Nick", "Icono", "Texto_Evento", "Puntos"],
      datos: [
        [new Date().toISOString(), "SISTEMA", "🎲", "Se ha inicializado el CMS del club", 0]
      ]
    }
  ]);

  Logger.log("==================================================");
  Logger.log("🎉 ¡ECOSISTEMA CMS CREADO AL 100% EN GOOGLE DRIVE!");
  Logger.log("📁 Carpeta: PAGINA WEB (" + FOLDER_ID_DESTINO + ")");
  Logger.log("==================================================");
}

/**
 * Función auxiliar para crear y formatear un libro
 */
function crearLibroConHojas(folder, nombreLibro, hojasDef) {
  // Verificar si ya existe en la carpeta para no duplicar
  const files = folder.getFilesByName(nombreLibro);
  if (files.hasNext()) {
    Logger.log("ℹ️ El libro " + nombreLibro + " ya existe. Omitiendo creación.");
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

    // Ajustar ancho
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
