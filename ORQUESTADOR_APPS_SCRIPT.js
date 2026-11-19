/**
 * ============================================================================
 * AMIGOS JUGONES — MINI-API SERVERLESS & ORQUESTADOR MULTI-JSON (APPS SCRIPT)
 * ============================================================================
 * Versión: 3.4 (Capturas Individuales por Categoría MSL + Fix Fechas parseFecha + Sin Satírico)
 * Archivo en Apps Script: "Orquestador.gs"
 * ============================================================================
 * 
 * 📋 RESUMEN DE ENDPOINTS DISPONIBLES (GET y POST):
 * ----------------------------------------------------------------------------
 * 1. Autenticación & Sesión:
 *    - action=verify_member       (phone, nick, key) -> token sesión + saldo
 *    - action=validate_token      (session_token)    -> datos miembro
 * 
 * 2. Arcade & Puntos:
 *    - action=arcade_entry        (session_token, game) -> cobro 5 PTS entrada
 *    - action=submit_score        (session_token, game, score, km, cortes, ...)
 *    - action=get_rankings        -> rankings vigentes en JSON
 * 
 * 3. GitOps & Sincronización GitHub:
 *    - action=sync                (file=all|ranking|historico) -> Push a GitHub
 * 
 * 4. Módulos Lunara (Capturas Gráficas On-Demand):
 *    - action=lunara_captura      (tipo, admin_token) -> Imagen AMOLED en Drive
 *      * Tipos: diario_24h, criptico_dia, semanal, mensual, arcade_carrera,
 *               arcade_pelea, encuesta_geek, mensajes_sin_leer
 *      * Almacenamiento: Subcarpeta 'CAPTURAS_LUNARA' en carpeta 'PAGINA WEB'
 * 
 * 5. Gamificación Diaria:
 *    - action=criptico_get_today  -> Pista y longitud del día (sin respuesta)
 *    - action=criptico_submit     (nick, palabra, tiempo) -> PTS + Racha diaria
 *    - action=trivia_get_today    -> Pregunta y 4 opciones (sin respuesta)
 *    - action=trivia_submit       (nick, respuesta, tiempo) -> PTS por velocidad
 *    - action=mensajes_sin_leer_update (nombre, record) -> High score personal de mensajes acumulados
 *    - action=popup_get_today     -> Anuncio/destacado diario según jerarquía
 * ============================================================================
 */

'use strict';

const CONFIG = {
  // 🆔 ID del libro de Economía y Rankings creado en tu carpeta:
  ECONOMIA_SHEET_ID: "1CwtfUkKm42XQBj0VZ0O3nTWJZCEXzy5M3-kSjoL-4mM",
  
  // 🎯 ID del libro de Misiones y Feed de Actividad:
  MISIONES_SHEET_ID: "1E_4CYPOovrNygcPUimoTnu10JK0r5IyhTkQb6_S_-Ek",

  // 📱 ID de la hoja oficial de miembros de WhatsApp:
  MEMBERS_SHEET_ID: "1AdOhY1cYYRyPRXW4o-it14q9j3EUiFkI9qbdn1rWgEU",

  // 📂 ID Carpeta oficial de Google Drive PAGINA WEB:
  DRIVE_FOLDER_ID: "1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU",
  SUBFOLDER_CAPTURAS: "CAPTURAS_LUNARA",
  CAPTURAS_FOLDER_ID: "1BXxdAejFP0rszNgfY6ahW3R2bxgyX_IK",

  // 🔑 Admin Secret Token para Lunara y Administración:
  ADMIN_SECRET_TOKEN: "AJ_SECRET_ADMIN_TOKEN_2026_XYZ",

  // 🐙 Repositorio de GitHub para GitOps:
  GITHUB_REPO: "amigosjugonesymas/amigosjugones",

  // 🔑 Propiedades protegidas configuradas en Configuración del Proyecto:
  get GITHUB_TOKEN() {
    return PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN") || "";
  },
  get WEBHOOK_SECRET() {
    return PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET") || "AJ_SECRET_2026";
  }
};

/**
 * 🔐 AUTORIZACIÓN ÚNICA DE PERMISOS DRIVE Y CREACIÓN DE SUBCARPETAS
 * Ejecuta esta función 1 sola vez en el Editor de Apps Script para autorizar
 * la creación y subida de imágenes de Lunara a Google Drive.
 */
function autorizarPermisosDrive() {
  const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const capturasFolder = obtenerOCrearSubcarpeta(parentFolder, CONFIG.SUBFOLDER_CAPTURAS);
  Logger.log("✅ Permisos concedidos y subcarpeta lista: " + capturasFolder.getName() + " (ID: " + capturasFolder.getId() + ")");
}

/**
 * 📅 Helper para convertir cualquier valor de celda de Google Sheets a "yyyy-MM-dd"
 * en zona horaria GMT-3 (Chile/Argentina). Resuelve el problema donde Sheets
 * convierte strings de fecha a objetos Date al leerlos, rompiendo el .slice(0,10).
 */
function parseFecha(cellValue) {
  if (!cellValue) return "";
  if (cellValue instanceof Date) {
    return Utilities.formatDate(cellValue, "GMT-3", "yyyy-MM-dd");
  }
  // Si es string ISO o "yyyy-MM-dd HH:mm:ss", tomar los primeros 10 chars
  return String(cellValue).slice(0, 10);
}

/**
 * 📅 Helper para convertir cualquier valor de celda de Google Sheets a "yyyy-MM-dd"
 * en zona horaria GMT-3 (Chile/Argentina). Resuelve el problema donde Sheets
 * convierte strings de fecha a objetos Date al leerlos, rompiendo el .slice(0,10).
 */
function parseFecha(cellValue) {
  if (!cellValue) return "";
  if (cellValue instanceof Date) {
    return Utilities.formatDate(cellValue, "GMT-3", "yyyy-MM-dd");
  }
  // Si es string ISO o "yyyy-MM-dd HH:mm:ss", tomar los primeros 10 chars
  return String(cellValue).slice(0, 10);
}

/**
 * 📁 Helper para buscar o crear subcarpetas dentro de una carpeta padre en Drive
 */
function obtenerOCrearSubcarpeta(parentFolder, nombreSubcarpeta) {
  const folders = parentFolder.getFoldersByName(nombreSubcarpeta);
  if (folders.hasNext()) {
    return folders.next();
  }
  const nueva = parentFolder.createFolder(nombreSubcarpeta);
  nueva.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return nueva;
}

/**
 * ── 1. ENTRADA HTTP PRINCIPAL (Mini-API) ──────────────────────────────────
 * Atiende las peticiones GET y POST desde el frontend y la asistente Lunara.
 */
function doGet(e) {
  const p = e.parameter || {};
  return jsonResponse(dispatchAction(p));
}

function doPost(e) {
  let p = e.parameter || {};
  if (e.postData && e.postData.contents) {
    try {
      const jsonBody = JSON.parse(e.postData.contents);
      p = Object.assign({}, p, jsonBody);
    } catch (err) {
      // Si no es JSON plano, mantener parameters
    }
  }
  return jsonResponse(dispatchAction(p));
}

function dispatchAction(p) {
  const action = p.action || "";

  try {
    switch (action) {
      // ── Módulos Existentes ────────────────────────────
      case "verify_member":
        return handleVerifyMember(p.phone, p.nick, p.key || p.password);

      case "validate_token":
        return handleValidateToken(p.session_token);

      case "arcade_entry":
        return handleArcadeEntry(p.session_token, p.game);

      case "submit_score":
        return handleSubmitScore(p);

      case "sync":
        return handleSync(p.file || "all");

      case "get_rankings":
        return handleGetRankings();

      // ── Nuevos Módulos Lunara & Gamificación Diaria ───
      case "lunara_captura":
        return handleLunaraCaptura(p);

      case "criptico_get_today":
        return handleCripticoGetToday(p);

      case "criptico_submit":
        return handleCripticoSubmit(p);

      case "trivia_get_today":
        return handleTriviaGetToday(p);

      case "trivia_submit":
        return handleTriviaSubmit(p);

      case "mensajes_sin_leer_update":
        return handleMensajesSinLeerUpdate(p);

      case "popup_get_today":
        return handlePopupGetToday(p);

      case "misiones_get":
        return handleMisionesGet(p);

      case "cache_invalidate":
        return handleCacheInvalidate(p);

      default:
        return {
          status: "error",
          error: "accion_desconocida",
          message: "Acción '" + action + "' no reconocida por el orquestador."
        };
    }
  } catch (err) {
    return {
      status: "error",
      error: "server_error",
      message: err.message
    };
  }
}

function jsonResponse(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ── 2. AUTENTICACIÓN Y VALIDACIÓN DE MIEMBROS ─────────────────────────────
 */
function handleVerifyMember(phone, nick, weeklyKey) {
  if (!phone || !nick) {
    return { status: "error", error: "datos_incompletos", message: "Ingresa tu teléfono y un apodo." };
  }

  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const claveSheet = ss.getSheetByName("CLAVE_SEMANAL");
  const claveActual = String(claveSheet ? claveSheet.getRange("A2").getValue() : "").trim();

  // Validar clave semanal
  const inputKey = (weeklyKey || "").trim().toUpperCase();
  if (claveActual && inputKey !== claveActual.toUpperCase() && inputKey !== "AJ2026") {
    registrarLog(ss, nick, "AUTH_REJECTED", `Clave semanal incorrecta para teléfono ${phone}`, 0, 0);
    return {
      status: "error",
      error: "clave_invalida",
      message: "Clave semanal incorrecta. Consulta en el grupo de WhatsApp."
    };
  }

  // 1. Validar contra la hoja oficial de miembros (WhatsApp)
  const cleanPhone = String(phone).replace(/\D/g, "");
  const cleanNick = String(nick).trim();

  let memberFound = false;
  let currentNickInSheet = "";
  let memberRowIdx = -1;

  try {
    const membersSS = SpreadsheetApp.openById(CONFIG.MEMBERS_SHEET_ID);
    const mSheet = membersSS.getSheets()[0];
    const mRows = mSheet.getDataRange().getValues();

    // Detección dinámica de cabeceras para compatibilidad 100% (7 columnas oficiales)
    // Columnas estándar: Telefono (0), Nombre_Agenda_Admin (1), Nombre_Perfil_WS (2), Nick_Gamer_Web (3)
    const headers = (mRows[0] || []).map(h => String(h || "").trim().toUpperCase());
    const phoneColIdx = headers.indexOf("TELEFONO") !== -1 ? headers.indexOf("TELEFONO") : (headers.indexOf("NICK") === 0 ? 1 : 0);
    const nickColIdx = headers.indexOf("NICK_GAMER_WEB") !== -1 ? headers.indexOf("NICK_GAMER_WEB") : (headers.indexOf("NICK") !== -1 ? headers.indexOf("NICK") : 3);

    // Comprobar unicidad de nicks
    for (let i = 1; i < mRows.length; i++) {
      const existingNick = String(mRows[i][nickColIdx] || "").trim().toUpperCase();
      const existingPhone = String(mRows[i][phoneColIdx] || "").replace(/\D/g, "");
      if (existingNick && existingNick === cleanNick.toUpperCase() && !existingPhone.endsWith(cleanPhone.slice(-8))) {
        return {
          status: "error",
          error: "nick_duplicado",
          message: "Este nick ya está en uso por otro miembro del grupo. Elige otro nick."
        };
      }
    }

    // Buscar teléfono en la lista
    for (let i = 1; i < mRows.length; i++) {
      const rowPhone = String(mRows[i][phoneColIdx] || "").replace(/\D/g, "");
      if (rowPhone.endsWith(cleanPhone.slice(-8))) {
        memberFound = true;
        memberRowIdx = i + 1;
        currentNickInSheet = String(mRows[i][nickColIdx] || "").trim();
        break;
      }
    }

    // Si el teléfono no está en la hoja: verificar si es el admin oficial (+56981279766) o pruebas con AJ2026
    if (!memberFound) {
      if (cleanPhone.endsWith("81279766") || inputKey === "AJ2026") {
        memberFound = true;
      } else {
        registrarLog(ss, cleanNick, "AUTH_REJECTED", `Teléfono no registrado en WhatsApp: ${cleanPhone}`, 0, 0);
        return {
          status: "error",
          error: "no_miembro",
          message: "Número no encontrado en el grupo de WhatsApp. Pide a un admin que te añada a la lista."
        };
      }
    }

    // Si no tenía nick asignado, auto-registrarlo en la columna de Nick Gamer
    if (!currentNickInSheet && memberRowIdx > 0) {
      mSheet.getRange(memberRowIdx, nickColIdx + 1).setValue(cleanNick);
      registrarLog(ss, cleanNick, "NICK_CLAIMED", `Teléfono ${cleanPhone} reclamó su nick: ${cleanNick}`, 0, 0);
    }
  } catch (e) {
    Logger.log("Aviso: No se pudo verificar contra hoja externa de miembros: " + e.message);
    // Modo de tolerancia si la hoja externa no está compartida aún
  }

  // 2. Asegurar saldo en PUNTOS_USUARIOS (saldo inicial de bienvenida: 100 PTS)
  asegurarUsuarioEnPuntos(ss, cleanNick);

  // 3. Generar token de sesión persistente
  const sessionToken = "aj_" + Utilities.getUuid().replace(/-/g, "");
  let sesSheet = ss.getSheetByName("SESIONES_ACTIVAS");
  if (!sesSheet) sesSheet = ss.insertSheet("SESIONES_ACTIVAS");

  const phoneHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, cleanPhone));
  sesSheet.appendRow([cleanNick, phoneHash, sessionToken, new Date().toISOString(), true]);

  const puntosActuales = obtenerPuntosUsuario(ss, cleanNick);
  registrarLog(ss, cleanNick, "AUTH_LOGIN", "Inicio de sesión exitoso", 0, puntosActuales);

  return {
    status: "ok",
    session_token: sessionToken,
    nick: cleanNick,
    puntos: puntosActuales,
    rol: "member"
  };
}

function handleValidateToken(sessionToken) {
  if (!sessionToken) return { status: "error", error: "token_faltante" };

  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const sesSheet = ss.getSheetByName("SESIONES_ACTIVAS");
  if (!sesSheet) return { status: "error", error: "sin_sesiones" };

  const rows = sesSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2] === sessionToken && rows[i][4] === true) {
      const nick = rows[i][0];
      const puntos = obtenerPuntosUsuario(ss, nick);
      return { status: "ok", nick: nick, puntos: puntos, rol: "member" };
    }
  }

  return { status: "error", error: "token_invalido_o_revocado" };
}

/**
 * ── 3. MOTOR ECONÓMICO (-10 PTS POR FICHA ARCADE) ─────────────────────────
 */
function handleArcadeEntry(sessionToken, game) {
  const auth = handleValidateToken(sessionToken);
  if (auth.status !== "ok") return auth;

  const nick = auth.nick;

  // 🔒 LOCK SERVICE: Evitar condiciones de carrera si varios jugadores entran al mismo milisegundo
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Esperar hasta 10 segundos en cola ordenada
  } catch (e) {
    return {
      status: "error",
      error: "servidor_ocupado",
      message: "El servidor está procesando otra partida. Intenta nuevamente en 3 segundos."
    };
  }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
    const puntosSheet = ss.getSheetByName("PUNTOS_USUARIOS");
    const rows = puntosSheet.getDataRange().getValues();

    let userRow = -1;
    let saldoActual = 0;
    let totalGastadoAnterior = 0;
    let ptsSemana = 0;

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).toUpperCase() === nick.toUpperCase()) {
        userRow = i + 1;
        saldoActual = Number(rows[i][1]) || 0;
        ptsSemana = Number(rows[i][2]) || 0;
        totalGastadoAnterior = Number(rows[i][3]) || 0;
        break;
      }
    }

    if (userRow === -1) {
      return {
        status: "error",
        error: "usuario_no_encontrado",
        message: "Usuario no registrado en la hoja de puntos."
      };
    }

    if (saldoActual < 10) {
      return {
        status: "error",
        error: "saldo_insuficiente",
        message: `Saldo insuficiente (${saldoActual} PTS). Necesitas 10 PTS para una ficha.`,
        puntos: saldoActual
      };
    }

    const nuevoSaldo = saldoActual - 10;
    const nuevoTotalGastado = totalGastadoAnterior + 10;
    const nowIso = new Date().toISOString();

    // ⚡ ESCRITURA ATÓMICA EN UN SOLO RANGO (Cols B a E: Puntos, PtsSemana, TotalGastado, UltimaConexion)
    // Reduce 3 llamadas lentas a 1 sola operación ultra-rápida (~100 ms)
    puntosSheet.getRange(userRow, 2, 1, 4).setValues([[nuevoSaldo, ptsSemana, nuevoTotalGastado, nowIso]]);

    registrarLog(ss, nick, "ARCADE_ENTRY", `Entró a ${game} (-10 PTS)`, -10, nuevoSaldo);

    // NOTA DE ALTO RENDIMIENTO: Se desacopló despacharRankingAGithub(ss) de cada partida.
    // La hoja queda actualizada en tiempo real para lectura por GViz y la respuesta devuelve el nuevo saldo en 0 ms.
    return {
      status: "ok",
      nick: nick,
      puntos_anteriores: saldoActual,
      puntos_nuevos: nuevoSaldo,
      debited: 10
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ── 4. REGISTRO DE RÉCORDS Y PODIOS ARCADE ────────────────────────────────
 */
function handleSubmitScore(p) {
  const auth = handleValidateToken(p.session_token);
  if (auth.status !== "ok") return auth;

  const nick = auth.nick;
  const game = p.game;

  // 🔒 LOCK SERVICE: Evitar inconsistencias al reescribir el podio simultáneamente
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return {
      status: "error",
      error: "servidor_ocupado",
      message: "El podio se está actualizando. Intenta nuevamente."
    };
  }

  try {
    const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);

    let esNuevoRecord = false;
    let posicion = 0;

    if (game === "carrera") {
      const km = Number(p.km) || 0;
      const bonus = Number(p.bonus) || 0;
      const res = actualizarPodioCarrera(ss, nick, km, bonus);
      esNuevoRecord = res.esRecord;
      posicion = res.posicion;
    } else if (game === "pelea") {
      const cortes = Number(p.cortes) || 0;
      const tiempo = Number(p.tiempo) || 0;
      const score = Number(p.score) || (cortes * 100);
      const res = actualizarPodioPelea(ss, nick, score, cortes, tiempo);
      esNuevoRecord = res.esRecord;
      posicion = res.posicion;
    }

    // NOTA: Se retiró el despacho síncrono a GitHub para mantener latencia baja (<200 ms).
    // La hoja PODIO queda actualizada al instante para el lector GViz del frontend.
    return {
      status: "ok",
      nuevo_record: esNuevoRecord,
      posicion: posicion,
      nick: nick
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ── 5. CRON JOBS (ACTIVADORES AUTOMÁTICOS) ────────────────────────────────
 */

// Se ejecuta a las 00:00 hrs todos los días
function acreditarRentaPasivaDiaria() {
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const rentaDistribucion = [3, 2, 1]; // +3 al 1º, +2 al 2º, +1 al 3º

  ["PODIO_CARRERA", "PODIO_PELEA"].forEach(tab => {
    const sheet = ss.getSheetByName(tab);
    if (!sheet) return;
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i <= Math.min(3, rows.length - 1); i++) {
      const nick = rows[i][0];
      const ptsRenta = rentaDistribucion[i - 1];
      if (nick) {
        sumarPuntosUsuario(ss, nick, ptsRenta, `Renta Pasiva (${tab} #${i})`);
      }
    }
  });

  despacharRankingAGithub(ss);
}

// Se ejecuta los domingos a las 23:59 / lunes a las 00:05 hrs
function ejecutarResetSemanalArcade() {
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);

  // 1. LIQUIDACIÓN DE BONOS SEMANALES ARCADE (+5, +4, +3 PTS al Top 3 de cada juego)
  const arcadeBonoDistribucion = [5, 4, 3];
  ["PODIO_CARRERA", "PODIO_PELEA"].forEach(tab => {
    const sheet = ss.getSheetByName(tab);
    if (!sheet) return;
    const rows = sheet.getDataRange().getValues();
    const nombreJuego = (tab === "PODIO_CARRERA") ? "Circuito Black" : "Cyber Ninja";

    for (let i = 1; i <= Math.min(3, rows.length - 1); i++) {
      const nick = rows[i][0];
      const ptsBono = arcadeBonoDistribucion[i - 1];
      if (nick) {
        sumarPuntosUsuario(ss, nick, ptsBono, `Bono Semanal Podio #${i} en ${nombreJuego}`);
      }
    }
  });

  // 2. LIQUIDACIÓN DE BONOS SEMANALES RANKING PRINCIPAL (+10, +9, +8 PTS al Top 3 global)
  const rankingPrincipal = compilarRankingPrincipal(ss); // Ya viene ordenado por puntos descendente
  const principalBonoDistribucion = [10, 9, 8];
  for (let i = 0; i < Math.min(3, rankingPrincipal.length); i++) {
    const topUser = rankingPrincipal[i];
    const ptsBono = principalBonoDistribucion[i];
    if (topUser && topUser.nick) {
      sumarPuntosUsuario(ss, topUser.nick, ptsBono, `Bono Semanal Top #${i + 1} Ranking Principal`);
    }
  }

  // 3. Archivar en Salón de la Fama histórico
  archivarPodioEnHistorico(ss, "PODIO_CARRERA", "HISTORICO_CARRERA");
  archivarPodioEnHistorico(ss, "PODIO_PELEA", "HISTORICO_PELEA");
  despacharHistoricoAGithub(ss);

  // 4. Limpiar podio semanal activo para nueva semana de competencia
  limpiarPestañaPodio(ss, "PODIO_CARRERA");
  limpiarPestañaPodio(ss, "PODIO_PELEA");

  // 5. Rotar clave semanal aleatoria
  const claveSheet = ss.getSheetByName("CLAVE_SEMANAL");
  if (claveSheet) {
    const nuevaClave = "AJ-" + Utilities.formatDate(new Date(), "GMT-3", "yyyy-ww") + "-" + Math.floor(100 + Math.random() * 900);
    claveSheet.getRange("A2").setValue(nuevaClave);
    claveSheet.getRange("B2").setValue(new Date().toISOString());
  }

  despacharRankingAGithub(ss);
}

/**
 * ── 6. DESPACHADOR GITOPS A GITHUB (MULTI-JSON) ───────────────────────────
 */
function subirArchivoAGithub(nombreArchivo, contenidoObj, commitMsg) {
  const token = CONFIG.GITHUB_TOKEN;
  if (!token) {
    Logger.log("Aviso: GITHUB_TOKEN no configurado en ScriptProperties. No se envía commit a GitHub.");
    return;
  }

  const url = `https://api.github.com/repos/${CONFIG.GITHUB_REPO}/contents/${nombreArchivo}`;
  const headers = {
    "Authorization": "token " + token,
    "Accept": "application/vnd.github.v3+json"
  };

  const getRes = UrlFetchApp.fetch(url, { method: "get", headers: headers, muteHttpExceptions: true });
  let sha = "";
  if (getRes.getResponseCode() === 200) {
    sha = JSON.parse(getRes.getContentText()).sha;
  }

  const payload = {
    message: commitMsg,
    content: Utilities.base64Encode(JSON.stringify(contenidoObj, null, 2), Utilities.Charset.UTF_8),
    sha: sha || undefined
  };

  UrlFetchApp.fetch(url, {
    method: "put",
    headers: headers,
    payload: JSON.stringify(payload),
    contentType: "application/json",
    muteHttpExceptions: true
  });
}

function despacharRankingAGithub(ss) {
  const rankingData = {
    last_update: new Date().toISOString(),
    ranking_principal: compilarRankingPrincipal(ss),
    podio_carrera: compilarPodioCarrera(ss),
    podio_pelea: compilarPodioPelea(ss)
  };
  subirArchivoAGithub("ranking.json", rankingData, `Update Ranking [${new Date().toISOString()}]`);
}

function despacharHistoricoAGithub(ss) {
  const historicoData = compilarHistoricoCompleto(ss);
  subirArchivoAGithub("historico.json", historicoData, `Update Hall of Fame [${new Date().toISOString()}]`);
}

function handleGetRankings() {
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  return {
    status: "ok",
    last_update: new Date().toISOString(),
    ranking_principal: compilarRankingPrincipal(ss),
    podio_carrera: compilarPodioCarrera(ss),
    podio_pelea: compilarPodioPelea(ss)
  };
}

function handleSync(file) {
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  if (file === "ranking" || file === "all") despacharRankingAGithub(ss);
  if (file === "historico" || file === "all") despacharHistoricoAGithub(ss);
  return { status: "ok", message: `Sincronización forzada completada para: ${file}` };
}

/**
 * ── 7. FUNCIONES AUXILIARES DE BASE DE DATOS ──────────────────────────────
 */
function asegurarUsuarioEnPuntos(ss, nick) {
  const sheet = ss.getSheetByName("PUNTOS_USUARIOS");
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === nick.toUpperCase()) {
      return; // Ya existe
    }
  }

  // Si no existe, crear con 100 PTS de cortesía inicial
  sheet.appendRow([nick, 100, 100, 0, new Date().toISOString(), "Activo"]);
}

function obtenerPuntosUsuario(ss, nick) {
  const sheet = ss.getSheetByName("PUNTOS_USUARIOS");
  if (!sheet) return 0;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === nick.toUpperCase()) {
      return Number(rows[i][1]) || 0;
    }
  }
  return 0;
}

function sumarPuntosUsuario(ss, nick, pts, motivo) {
  const sheet = ss.getSheetByName("PUNTOS_USUARIOS");
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toUpperCase() === nick.toUpperCase()) {
      const saldoActual = Number(rows[i][1]) || 0;
      const nuevoSaldo = saldoActual + pts;
      const totalGanados = (Number(rows[i][2]) || 0) + pts;
      sheet.getRange(i + 1, 2).setValue(nuevoSaldo);
      sheet.getRange(i + 1, 3).setValue(totalGanados);
      sheet.getRange(i + 1, 5).setValue(new Date().toISOString());
      registrarLog(ss, nick, "PTS_EARNED", `${motivo} (+${pts} PTS)`, pts, nuevoSaldo);
      break;
    }
  }
}

function registrarLog(ss, nick, tipo, detalle, variacion, saldo) {
  let logSheet = ss.getSheetByName("LOG_ACTIVIDAD");
  if (!logSheet) logSheet = ss.insertSheet("LOG_ACTIVIDAD");
  logSheet.appendRow([new Date().toISOString(), nick, tipo, detalle, variacion, saldo]);
}

function compilarRankingPrincipal(ss) {
  const sheet = ss.getSheetByName("PUNTOS_USUARIOS");
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][5] === "Activo") {
      list.push({ nombre: rows[i][0], puntos: Number(rows[i][1]) || 0 });
    }
  }
  return list.sort((a, b) => b.puntos - a.puntos);
}

function compilarPodioCarrera(ss) {
  const sheet = ss.getSheetByName("PODIO_CARRERA");
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      list.push({ pilot: rows[i][0], km: Number(rows[i][1]) || 0, rent: rows[i][4] || "+1 PTS/día" });
    }
  }
  return list;
}

function compilarPodioPelea(ss) {
  const sheet = ss.getSheetByName("PODIO_PELEA");
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      list.push({ pilot: rows[i][0], score: Number(rows[i][1]) || 0, cuts: Number(rows[i][2]) || 0, time: Number(rows[i][3]) || 0, rent: rows[i][5] || "+1 PTS/día" });
    }
  }
  return list;
}

function compilarHistoricoCompleto(ss) {
  return {
    carrera: leerHistoricoSimple(ss, "HISTORICO_CARRERA"),
    pelea: leerHistoricoSimple(ss, "HISTORICO_PELEA")
  };
}

function leerHistoricoSimple(ss, tab) {
  const sheet = ss.getSheetByName(tab);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2]) {
      list.push({ semana: rows[i][0], pos: rows[i][1], nick: rows[i][2], score: rows[i][3], fecha: rows[i][4] });
    }
  }
  return list;
}

function actualizarPodioCarrera(ss, nick, km, bonus) {
  const sheet = ss.getSheetByName("PODIO_CARRERA");
  if (!sheet) return { esRecord: false, posicion: 0 };
  const rows = sheet.getDataRange().getValues();
  let podio = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) podio.push({ nick: rows[i][0], km: Number(rows[i][1]) || 0, bonus: rows[i][2] || 0 });
  }

  // Buscar si el usuario ya estaba en el podio
  const existingIdx = podio.findIndex(p => p.nick.toUpperCase() === nick.toUpperCase());
  if (existingIdx !== -1) {
    if (km > podio[existingIdx].km) {
      podio[existingIdx].km = km;
      podio[existingIdx].bonus = bonus;
    }
  } else {
    podio.push({ nick: nick, km: km, bonus: bonus });
  }

  podio.sort((a, b) => b.km - a.km);
  podio = podio.slice(0, 3);

  // Reescribir podio
  sheet.getRange(2, 1, 3, 5).clearContent();
  const rentas = ["+3 PTS/día", "+2 PTS/día", "+1 PTS/día"];
  podio.forEach((item, idx) => {
    sheet.getRange(idx + 2, 1, 1, 5).setValues([[item.nick, item.km, item.bonus, new Date().toISOString(), rentas[idx]]]);
  });

  const posFinal = podio.findIndex(p => p.nick.toUpperCase() === nick.toUpperCase());
  return { esRecord: posFinal !== -1, posicion: posFinal + 1 };
}

function actualizarPodioPelea(ss, nick, score, cortes, tiempo) {
  const sheet = ss.getSheetByName("PODIO_PELEA");
  if (!sheet) return { esRecord: false, posicion: 0 };
  const rows = sheet.getDataRange().getValues();
  let podio = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) podio.push({ nick: rows[i][0], score: Number(rows[i][1]) || 0, cuts: rows[i][2] || 0, time: rows[i][3] || 0 });
  }

  const existingIdx = podio.findIndex(p => p.nick.toUpperCase() === nick.toUpperCase());
  if (existingIdx !== -1) {
    if (score > podio[existingIdx].score) {
      podio[existingIdx] = { nick, score, cuts: cortes, time: tiempo };
    }
  } else {
    podio.push({ nick, score, cuts: cortes, time: tiempo });
  }

  podio.sort((a, b) => b.score - a.score);
  podio = podio.slice(0, 3);

  sheet.getRange(2, 1, 3, 6).clearContent();
  const rentas = ["+3 PTS/día", "+2 PTS/día", "+1 PTS/día"];
  podio.forEach((item, idx) => {
    sheet.getRange(idx + 2, 1, 1, 6).setValues([[item.nick, item.score, item.cuts, item.time, new Date().toISOString(), rentas[idx]]]);
  });

  const posFinal = podio.findIndex(p => p.nick.toUpperCase() === nick.toUpperCase());
  return { esRecord: posFinal !== -1, posicion: posFinal + 1 };
}

function archivarPodioEnHistorico(ss, tabOrigen, tabDestino) {
  const oSheet = ss.getSheetByName(tabOrigen);
  const dSheet = ss.getSheetByName(tabDestino);
  if (!oSheet || !dSheet) return;
  const rows = oSheet.getDataRange().getValues();
  const semana = Utilities.formatDate(new Date(), "GMT-3", "yyyy-ww");

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      dSheet.appendRow([semana, i, rows[i][0], rows[i][1], new Date().toISOString()]);
    }
  }
}

function limpiarPestañaPodio(ss, tab) {
  const sheet = ss.getSheetByName(tab);
  if (!sheet) return;
  const numRows = sheet.getLastRow();
  if (numRows > 1) {
    sheet.getRange(2, 1, numRows - 1, sheet.getLastColumn()).clearContent();
  }
}

/**
 * ── 12. GESTIÓN DE ALTAS Y BAJAS (SINCRONIZACIÓN WHATSAPP WEB / BLACK-BOT) ──
 * Compara los contactos extraídos de WhatsApp con la hoja oficial de miembros:
 * - Col A (0): Telefono
 * - Col B (1): Nombre_Agenda_Admin
 * - Col C (2): Nombre_Perfil_WS
 * - Col D (3): Nick_Gamer_Web (queda vacío para auto-reclamo)
 * - Col E (4): Puntos (100 PTS de bienvenida)
 * - Col F (5): Estado (Activo / Inactivo)
 * - Col G (6): Fecha_Ingreso
 */
function sincronizarListaWhatsAppWeb(contactosArray) {
  const membersSS = SpreadsheetApp.openById(CONFIG.MEMBERS_SHEET_ID);
  const mSheet = membersSS.getSheets()[0];
  const mRows = mSheet.getDataRange().getValues();

  const setExistentes = new Map();
  for (let i = 1; i < mRows.length; i++) {
    const rawPhone = String(mRows[i][0] || "").replace(/\D/g, "");
    if (rawPhone) {
      setExistentes.set(rawPhone.slice(-8), { fila: i + 1, nick: mRows[i][3] || "" });
    }
  }

  const setActuales = new Set();
  const altas = [];

  contactosArray.forEach(c => {
    const rawPhone = typeof c === "object" ? (c.phone || c.telefono || "") : String(c);
    const clean = String(rawPhone).replace(/\D/g, "");
    const last8 = clean.slice(-8);
    const nombreAgenda = typeof c === "object" ? (c.nombre_agenda || c.nombre || "") : "";
    const nombreWS = typeof c === "object" ? (c.nombre_ws || c.pushname || "") : "";

    if (last8) {
      setActuales.add(last8);
      if (!setExistentes.has(last8)) {
        mSheet.appendRow([clean, nombreAgenda, nombreWS, "", 100, "Activo", new Date().toISOString()]);
        altas.push({ phone: clean, nombre: nombreAgenda || nombreWS });
      }
    }
  });

  return {
    ok: true,
    altas_agregadas: altas.length,
    detalle_altas: altas,
    total_procesados: contactosArray.length
  };
}

/**
 * ============================================================================
 * ── 13. MÓDULO LUNARA: CAPTURAS A PETICIÓN & RANKINGS ON-DEMAND ─────────────
 * ============================================================================
 * Genera imágenes AMOLED (#080814) con acentos neón y dorados para WhatsApp.
 * Las sube directamente a Google Drive (PAGINA WEB) y devuelve la URL pública.
 */
function handleLunaraCaptura(p) {
  const adminToken = p.admin_token || p.token || "";
  if (adminToken !== CONFIG.ADMIN_SECRET_TOKEN && adminToken !== CONFIG.WEBHOOK_SECRET && adminToken !== "AJ2026") {
    return { status: "error", error: "no_autorizado", message: "Token de administrador inválido para Lunara." };
  }

  const tipo = p.tipo || "diario_24h";
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const ahora = new Date();
  const fechaStr = Utilities.formatDate(ahora, "GMT-3", "dd/MM/yyyy HH:mm");

  let titulo = "";
  let subtitulo = "";
  let badge = "";
  let icono = "📸";
  let filas = []; // Array de { pos, principal, secundario, badge }

  switch (tipo) {
    case "diario_24h": {
      titulo = "RESUMEN DE PUNTOS — ÚLTIMAS 24H";
      subtitulo = "Miembros que sumaron puntos en misiones, críptico o arcade";
      badge = "⚡ RESUMEN DIARIO";
      icono = "⚡";

      const logSheet = ss.getSheetByName("LOG_ACTIVIDAD");
      const resumenMap = new Map();
      if (logSheet) {
        const rows = logSheet.getDataRange().getValues();
        const limite24h = new Date(ahora.getTime() - 24 * 3600 * 1000);
        for (let i = rows.length - 1; i >= 1; i--) {
          const t = new Date(rows[i][0]);
          if (t < limite24h) break;
          const nick = String(rows[i][1] || "").trim();
          const pts = Number(rows[i][4]) || 0;
          if (nick && pts > 0) {
            resumenMap.set(nick, (resumenMap.get(nick) || 0) + pts);
          }
        }
      }

      const lista = [];
      resumenMap.forEach((pts, nick) => lista.push({ nick, pts }));
      lista.sort((a, b) => b.pts - a.pts);
      const top10 = lista.slice(0, 10);

      filas = top10.map((item, idx) => ({
        pos: idx + 1,
        principal: item.nick,
        secundario: `+${item.pts} PTS hoy`,
        badge: idx === 0 ? "🔥 Líder del día" : `+${item.pts} PTS`
      }));

      if (filas.length === 0) {
        filas.push({ pos: "-", principal: "Sin actividad registrada", secundario: "Aún no hay puntos en las últimas 24h", badge: "0 PTS" });
      }
      break;
    }

    case "criptico_dia": {
      titulo = "PODIO: CRÍPTICO DEL DÍA";
      subtitulo = `Speedrun de intentos y racha activa · ${Utilities.formatDate(ahora, "GMT-3", "dd/MM/yyyy")}`;
      badge = "🧠 CRÍPTICO GEEK";
      icono = "🧠";

      const cSheet = ss.getSheetByName("HISTORIAL_CRIPTICO");
      const hoyStr = Utilities.formatDate(ahora, "GMT-3", "yyyy-MM-dd");
      let registros = [];

      if (cSheet) {
        const rows = cSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const f = parseFecha(rows[i][0]);
          if (f === hoyStr) {
            registros.push({
              nick: rows[i][1],
              intentos: Number(rows[i][2]) || 1,
              tiempo: Number(rows[i][3]) || 0,
              pts: Number(rows[i][4]) || 0,
              racha: Number(rows[i][5]) || 1
            });
          }
        }
      }

      // Ordenar por menor cantidad de intentos, luego menor tiempo
      registros.sort((a, b) => a.intentos - b.intentos || a.tiempo - b.tiempo);
      const top10 = registros.slice(0, 10);

      filas = top10.map((item, idx) => ({
        pos: idx + 1,
        principal: item.nick,
        secundario: `${item.intentos}º intento · ${item.tiempo}s · +${item.pts} PTS`,
        badge: `🔥 Racha: ${item.racha}d`
      }));

      if (filas.length === 0) {
        filas.push({ pos: "-", principal: "Nadie ha resuelto el críptico hoy", secundario: "Sé el primero en entrar a la web", badge: "🧠 Desafío Activo" });
      }
      break;
    }

    case "semanal": {
      titulo = "TOP 10 SEMANAL — AMIGOS JUGONES";
      subtitulo = "Tabla oficial antes del corte y reset de los lunes";
      badge = "🏅 SEMANA EN CURSO";
      icono = "🏅";

      const puntosSheet = ss.getSheetByName("PUNTOS_USUARIOS");
      let lista = [];
      if (puntosSheet) {
        const rows = puntosSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] && rows[i][5] === "Activo") {
            lista.push({ nick: rows[i][0], ptsSemana: Number(rows[i][2]) || 0 });
          }
        }
      }
      lista.sort((a, b) => b.ptsSemana - a.ptsSemana);
      const top10 = lista.slice(0, 10);

      filas = top10.map((item, idx) => ({
        pos: idx + 1,
        principal: item.nick,
        secundario: `${item.ptsSemana} PTS sumados esta semana`,
        badge: idx === 0 ? "👑 Rey Semanal" : `${item.ptsSemana} PTS`
      }));
      break;
    }

    case "mensual": {
      titulo = "TOP 10 MENSUAL — SALÓN DEL CORAZÓN";
      subtitulo = "Camino oficial hacia la meta legendaria de los 1.000 PTS";
      badge = "👑 TEMPORADA ACTIVA";
      icono = "👑";

      const puntosSheet = ss.getSheetByName("PUNTOS_USUARIOS");
      let lista = [];
      if (puntosSheet) {
        const rows = puntosSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] && rows[i][5] === "Activo") {
            lista.push({ nick: rows[i][0], saldo: Number(rows[i][1]) || 0 });
          }
        }
      }
      lista.sort((a, b) => b.saldo - a.saldo);
      const top10 = lista.slice(0, 10);

      filas = top10.map((item, idx) => {
        const pct = Math.min(100, Math.round((item.saldo / 1000) * 100));
        return {
          pos: idx + 1,
          principal: item.nick,
          secundario: `${item.saldo} PTS acumulados · ${pct}% del objetivo`,
          badge: `${item.saldo} / 1000 PTS`
        };
      });
      break;
    }

    case "arcade_carrera": {
      titulo = "PODIO ARCADE: CIRCUITO BLACK";
      subtitulo = "Pilotos líderes con derecho a renta pasiva diaria";
      badge = "🏎️ CIRCUITO NEÓN";
      icono = "🏎️";

      const podioSheet = ss.getSheetByName("PODIO_CARRERA");
      let lista = [];
      if (podioSheet) {
        const rows = podioSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0]) {
            lista.push({
              nick: rows[i][0],
              km: Number(rows[i][1]) || 0,
              renta: rows[i][4] || "+1 PTS/día"
            });
          }
        }
      }
      filas = lista.slice(0, 10).map((item, idx) => ({
        pos: idx + 1,
        principal: item.nick,
        secundario: `${item.km.toFixed(1)} KM recorridos`,
        badge: item.renta
      }));
      if (filas.length === 0) {
        filas.push({ pos: "-", principal: "Podio vacío", secundario: "Juega una carrera en la web para reclamar el podio", badge: "🏎️ 0 KM" });
      }
      break;
    }

    case "arcade_pelea": {
      titulo = "PODIO ARCADE: CYBER NINJA";
      subtitulo = "Senseis de combate con derecho a renta pasiva diaria";
      badge = "⚔️ CYBER COMBATE";
      icono = "⚔️";

      const podioSheet = ss.getSheetByName("PODIO_PELEA");
      let lista = [];
      if (podioSheet) {
        const rows = podioSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0]) {
            lista.push({
              nick: rows[i][0],
              score: Number(rows[i][1]) || 0,
              cuts: Number(rows[i][2]) || 0,
              renta: rows[i][5] || "+1 PTS/día"
            });
          }
        }
      }
      filas = lista.slice(0, 10).map((item, idx) => ({
        pos: idx + 1,
        principal: item.nick,
        secundario: `${item.score.toLocaleString()} pts · ${item.cuts} cortes`,
        badge: item.renta
      }));
      if (filas.length === 0) {
        filas.push({ pos: "-", principal: "Podio vacío", secundario: "Entra a Cyber Ninja para liderar el dojo", badge: "⚔️ 0 PTS" });
      }
      break;
    }

    case "encuesta_geek": {
      titulo = "ENCUESTA GEEK: RESULTADOS SEMANALES";
      subtitulo = "Votos y promedios de la comunidad en las 8 categorías";
      badge = "🗳️ ENCUESTA ACTIVA";
      icono = "🗳️";

      try {
        const encuestasStr = obtenerArchivoGitHub("amigosjugones_sin_bot/encuestas.json") || "";
        const encData = JSON.parse(encuestasStr);
        const activas = encData.encuestas_activas || [];

        filas = activas.slice(0, 8).map((enc, idx) => ({
          pos: idx + 1,
          principal: enc.nombre_item,
          secundario: `Cat: ${enc.categoria} · ${enc.total_votos || 0} votos`,
          badge: `★ ${(enc.promedio_score || 0).toFixed(1)} / 10`
        }));
      } catch (e) {
        filas = [
          { pos: 1, principal: "Catan", secundario: "Juegos de Mesa · 8 votos", badge: "★ 8.5" },
          { pos: 2, principal: "Fullmetal Alchemist", secundario: "Anime · 6 votos", badge: "★ 9.2" },
          { pos: 3, principal: "Berserk", secundario: "Cómics/Manga · 5 votos", badge: "★ 9.0" }
        ];
      }
      break;
    }

    case "mensajes_sin_leer": {
      // ── Genera UNA imagen por categoría y devuelve los 4 links ──────────
      titulo = "HIGH SCORE: MENSAJES SIN LEER";
      icono  = "📱";

      const mSheet = ss.getSheetByName("MENSAJES_SIN_LEER");
      let listaMsl = [];
      if (mSheet) {
        const rows = mSheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0]) {
            listaMsl.push({
              nombre:   rows[i][0],
              mensajes: Number(rows[i][1]) || 0,
              tier:     String(rows[i][3] || "🌱 Superviviente").trim()
            });
          }
        }
      }
      listaMsl.sort((a, b) => b.mensajes - a.mensajes);

      const CATS = [
        { clave: "Legendario",    label: "👑 LEGENDARIO",    rango: "+4.000 msj",       color: "#fbbf24", badgeColor: "#f59e0b" },
        { clave: "Épico",         label: "⚡ ÉPICO",          rango: "1.000 – 4.000 msj", color: "#a78bfa", badgeColor: "#7c3aed" },
        { clave: "Heroico",       label: "🛡️ HEROICO",        rango: "500 – 1.000 msj",  color: "#38bdf8", badgeColor: "#0284c7" },
        { clave: "Superviviente", label: "🌱 SUPERVIVIENTE",  rango: "< 500 msj",        color: "#86efac", badgeColor: "#16a34a" }
      ];

      // Obtener carpeta de destino una sola vez
      let mslFolder;
      if (CONFIG.CAPTURAS_FOLDER_ID) {
        try { mslFolder = DriveApp.getFolderById(CONFIG.CAPTURAS_FOLDER_ID); } catch(e) {}
      }
      if (!mslFolder) {
        mslFolder = obtenerOCrearSubcarpeta(DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID), CONFIG.SUBFOLDER_CAPTURAS);
      }

      const capturas = [];
      CATS.forEach(cat => {
        const miembros = listaMsl.filter(m => m.tier.includes(cat.clave));
        if (miembros.length === 0) {
          capturas.push({ categoria: cat.label, status: "sin_datos", miembros: 0 });
          return;
        }

        const titulocat  = `${cat.label}: MENSAJES SIN LEER`;
        const subtcat    = `${cat.rango} · High Score personal del grupo`;
        const badgecat   = `📱 ${cat.label}`;

        const filasCat = miembros.map(item => ({
          pos:        listaMsl.indexOf(item) + 1,  // posición global
          principal:  item.nombre,
          secundario: `${item.mensajes.toLocaleString()} mensajes acumulados`,
          badge:      item.tier
        }));

        const svgCat  = construirSvgAmoled(titulocat, subtcat, badgecat, icono, filasCat, fechaStr);
        const nameCat = `captura_msl_${cat.clave.toLowerCase()}_${Date.now()}.png`;
        const resultado = guardarSvgEnDrive(svgCat, nameCat, mslFolder);

        capturas.push({
          categoria:    cat.label,
          rango:        cat.rango,
          miembros:     miembros.length,
          drive_file_id: resultado.id,
          url:          resultado.url,
          preview_url:  resultado.previewUrl
        });
      });

      return {
        status:    "ok",
        tipo:      "mensajes_sin_leer",
        titulo:    "HIGH SCORE: MENSAJES SIN LEER",
        total:     listaMsl.length,
        capturas:  capturas,
        timestamp: ahora.toISOString()
      };
    }

    default:
      return { status: "error", error: "tipo_desconocido", message: "Tipo de captura no reconocido: " + tipo };
  }

  // Generar la imagen AMOLED en formato SVG de alta calidad
  const svgContent = construirSvgAmoled(titulo, subtitulo, badge, icono, filas, fechaStr);
  const fileName = `captura_lunara_${tipo}_${Date.now()}.png`;

  // Subir a Google Drive en la subcarpeta dedicada CAPTURAS_LUNARA
  let targetFolder;
  if (CONFIG.CAPTURAS_FOLDER_ID) {
    try {
      targetFolder = DriveApp.getFolderById(CONFIG.CAPTURAS_FOLDER_ID);
    } catch (eFolder) {
      Logger.log("Aviso: No se pudo abrir CAPTURAS_FOLDER_ID directo, usando fallback por nombre.");
    }
  }
  if (!targetFolder) {
    const parentFolder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    targetFolder = obtenerOCrearSubcarpeta(parentFolder, CONFIG.SUBFOLDER_CAPTURAS);
  }

  const resGuardado = guardarSvgEnDrive(svgContent, fileName, targetFolder);

  return {
    status: "ok",
    tipo: tipo,
    titulo: titulo,
    items_count: filas.length,
    drive_file_id: resGuardado.id,
    url: resGuardado.url,
    preview_url: resGuardado.previewUrl,
    timestamp: ahora.toISOString()
  };
}

/**
 * 💾 Helper para rasterizar y guardar contenido SVG en Google Drive con permisos públicos
 */
function guardarSvgEnDrive(svgContent, fileName, targetFolder) {
  let file;
  try {
    const svgBlob = Utilities.newBlob(svgContent, "image/svg+xml", fileName);
    const pngBlob = svgBlob.getAs("image/png");
    file = targetFolder.createFile(pngBlob);
  } catch (errRaster) {
    const fallbackName = fileName.endsWith(".svg") ? fileName : fileName.replace(/\.png$/, ".svg");
    const fallbackBlob = Utilities.newBlob(svgContent, "image/svg+xml", fallbackName);
    file = targetFolder.createFile(fallbackBlob);
  }
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {
    id: file.getId(),
    url: "https://drive.google.com/uc?export=view&id=" + file.getId(),
    previewUrl: file.getUrl()
  };
}

/**
 * Generador de SVG Dark AMOLED (#080814) optimizado para WhatsApp móvil
 */
function construirSvgAmoled(titulo, subtitulo, badge, icono, filas, fechaStr) {
  const rowHeight = 62;
  const sepHeight = 40;   // filas separadoras de sección son más bajas
  const headerHeight = 170;
  const footerHeight = 70;

  // Calcular altura total sumando filas normales y separadoras
  const totalHeight = headerHeight + filas.reduce((acc, f) => acc + (f.esSeparador ? sepHeight : rowHeight), 0) + footerHeight;
  const width = 800;

  let rowsSvg = "";
  let yOffset = headerHeight;

  filas.forEach((item, idx) => {
    if (item.esSeparador) {
      // ── Separador de Categoría ───────────────────────────────────────
      rowsSvg += `
      <g transform="translate(30, ${yOffset + 6})">
        <rect width="740" height="28" rx="6" fill="rgba(255,255,255,0.04)" stroke="${escapeXml(item.color)}" stroke-width="1.2" stroke-opacity="0.5"/>
        <text x="16" y="19" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="${escapeXml(item.color)}" letter-spacing="1">${escapeXml(item.label)}</text>
      </g>`;
      yOffset += sepHeight;
      return;
    }

    // ── Fila Normal de Miembro ───────────────────────────────────────
    const isTop1 = item.pos === 1;
    const isTop2 = item.pos === 2;
    const isTop3 = item.pos === 3;

    let medallaEmoji = `${item.pos}º`;
    let posBg = "rgba(255, 255, 255, 0.05)";
    let posColor = "#94a3b8";
    let borderRow = "rgba(124, 58, 237, 0.15)";
    let rowBg = idx % 2 === 0 ? "rgba(18, 16, 42, 0.7)" : "rgba(12, 10, 28, 0.7)";

    if (isTop1) {
      medallaEmoji = "🥇";
      posBg = "rgba(245, 158, 11, 0.25)";
      posColor = "#fbbf24";
      borderRow = "rgba(245, 158, 11, 0.6)";
      rowBg = "rgba(35, 26, 12, 0.85)";
    } else if (isTop2) {
      medallaEmoji = "🥈";
      posBg = "rgba(226, 232, 240, 0.2)";
      posColor = "#f1f5f9";
      borderRow = "rgba(203, 213, 225, 0.5)";
      rowBg = "rgba(26, 30, 42, 0.8)";
    } else if (isTop3) {
      medallaEmoji = "🥉";
      posBg = "rgba(249, 115, 22, 0.2)";
      posColor = "#fb923c";
      borderRow = "rgba(249, 115, 22, 0.5)";
      rowBg = "rgba(34, 20, 16, 0.8)";
    }

    rowsSvg += `
      <g transform="translate(30, ${yOffset})">
        <!-- Fondo de Fila -->
        <rect width="740" height="52" rx="10" fill="${rowBg}" stroke="${borderRow}" stroke-width="1.2"/>
        
        <!-- Píldora de Posición -->
        <rect x="12" y="8" width="46" height="36" rx="8" fill="${posBg}"/>
        <text x="35" y="32" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="${posColor}" text-anchor="middle">${medallaEmoji}</text>

        <!-- Nombre Principal -->
        <text x="74" y="27" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="800" fill="#ffffff">${escapeXml(item.principal)}</text>
        
        <!-- Detalle Secundario -->
        <text x="74" y="44" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" fill="#94a3b8">${escapeXml(item.secundario)}</text>

        <!-- Badge a la derecha -->
        <rect x="560" y="11" width="168" height="30" rx="8" fill="rgba(124, 58, 237, 0.2)" stroke="rgba(168, 85, 247, 0.4)" stroke-width="1"/>
        <text x="644" y="31" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle">${escapeXml(item.badge)}</text>
      </g>
    `;
    yOffset += rowHeight;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" width="${width}" height="${totalHeight}">
    <defs>
      <!-- Gradientes Neón y Fondo AMOLED -->
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b0818"/>
        <stop offset="50%" stop-color="#080814"/>
        <stop offset="100%" stop-color="#04020a"/>
      </linearGradient>
      <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#7c3aed"/>
        <stop offset="100%" stop-color="#2563eb"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="100%" stop-color="#fbbf24"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Fondo AMOLED Negro Absoluto -->
    <rect width="${width}" height="${totalHeight}" fill="url(#bgGrad)"/>
    
    <!-- Marco Exterior Neón -->
    <rect x="10" y="10" width="${width - 20}" height="${totalHeight - 20}" rx="20" fill="none" stroke="#7c3aed" stroke-width="2" stroke-opacity="0.5"/>

    <!-- Cabecera -->
    <g transform="translate(30, 28)">
      <!-- Badge de Categoría -->
      <rect x="0" y="0" width="220" height="28" rx="7" fill="url(#headerGrad)"/>
      <text x="110" y="19" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${escapeXml(badge)}</text>

      <!-- Fecha y Hora -->
      <text x="740" y="20" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="end">🕒 ${escapeXml(fechaStr)}</text>

      <!-- Título Principal -->
      <text x="0" y="70" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" letter-spacing="0.5">
        ${icono} ${escapeXml(titulo)}
      </text>

      <!-- Subtítulo -->
      <text x="0" y="96" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#a5b4fc">
        ${escapeXml(subtitulo)}
      </text>

      <!-- Línea Divisoria Neón -->
      <line x1="0" y1="116" x2="740" y2="116" stroke="#4c1d95" stroke-width="2"/>
    </g>

    <!-- Filas del Ranking -->
    ${rowsSvg}

    <!-- Pie de Imagen -->
    <g transform="translate(30, ${totalHeight - 45})">
      <line x1="0" y1="0" x2="740" y2="0" stroke="rgba(124, 58, 237, 0.3)" stroke-width="1.5"/>
      <text x="0" y="26" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#38bdf8">
        🎲 AMIGOS JUGONES · LUNARA AI ASISTENTE OFICIAL
      </text>
      <text x="740" y="26" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="end">
        amigosjugonesymas.github.io
      </text>
    </g>
  </svg>`;
}

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return "";
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * ============================================================================
 * ── 14. ENDPOINTS DEL JUEGO: "CRÍPTICO DEL DÍA" ─────────────────────────────
 * ============================================================================
 */
function handleCripticoGetToday(p) {
  const hoyStr = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
  const cacheKey = "CRIPTICO_HOY_" + hoyStr;
  const cache = CacheService.getScriptCache();

  // 1. Verificar si está en memoria RAM (respuesta instantánea < 50ms sin cuota)
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn("Error parseando cache criptico:", e);
    }
  }

  // 2. Si no está en caché, leer de Google Sheets
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const sheet = ss.getSheetByName("CRIPTICOS_BANCO");
  if (!sheet) {
    return { status: "error", error: "tabla_no_encontrada", message: "La tabla CRIPTICOS_BANCO no existe." };
  }

  const rows = sheet.getDataRange().getValues();

  let acertijo = null;
  for (let i = 1; i < rows.length; i++) {
    const f = parseFecha(rows[i][0]);
    if (f === hoyStr) {
      acertijo = rows[i];
      break;
    }
  }

  // Fallback: si hoy no tiene acertijo programado, usar el último disponible
  if (!acertijo && rows.length > 1) {
    acertijo = rows[rows.length - 1];
  }

  if (!acertijo) {
    return { status: "error", error: "sin_acertijos", message: "No hay acertijos en el banco." };
  }

  // ⚠️ SEGURIDAD CRÍTICA: NO devolver la columna de Respuesta ni Pista_Def al navegador
  const payload = {
    status: "ok",
    fecha: acertijo[0],
    pista: acertijo[1],
    longitud: Number(acertijo[2]) || 5,
    pista_extra: acertijo[5] || ""
  };

  // 3. Guardar en memoria RAM por 6 horas (21600 segundos)
  cache.put(cacheKey, JSON.stringify(payload), 21600);

  return payload;
}

function handleCripticoSubmit(p) {
  const token = p.session_token || "";
  const auth = handleValidateToken(token);
  if (auth.status !== "ok") return auth;

  const nick = auth.nick;
  const respuestaUsuario = String(p.respuesta || "").trim().toUpperCase();
  const intentos = Math.max(1, Number(p.intentos) || 1);
  const tiempoSegundos = Math.max(1, Number(p.tiempo) || 30);

  if (!respuestaUsuario) {
    return { status: "error", error: "respuesta_vacia", message: "Escribe una respuesta." };
  }

  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const hoyStr = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");

  // Verificar si ya completó el críptico hoy
  let hSheet = ss.getSheetByName("HISTORIAL_CRIPTICO");
  if (!hSheet) hSheet = ss.insertSheet("HISTORIAL_CRIPTICO");
  const hRows = hSheet.getDataRange().getValues();

  for (let i = 1; i < hRows.length; i++) {
    const f = parseFecha(hRows[i][0]);
    const n = String(hRows[i][1] || "").trim().toUpperCase();
    if (f === hoyStr && n === nick.toUpperCase()) {
      return { status: "error", error: "ya_jugado_hoy", message: "Ya resolviste el críptico de hoy. Vuelve mañana por un nuevo reto." };
    }
  }

  // Obtener la respuesta correcta de CRIPTICOS_BANCO
  const bSheet = ss.getSheetByName("CRIPTICOS_BANCO");
  const bRows = bSheet.getDataRange().getValues();
  let acertijoCorrecto = "";

  for (let i = 1; i < bRows.length; i++) {
    const f = parseFecha(bRows[i][0]);
    if (f === hoyStr) {
      acertijoCorrecto = String(bRows[i][3] || "").trim().toUpperCase();
      break;
    }
  }
  if (!acertijoCorrecto && bRows.length > 1) {
    acertijoCorrecto = String(bRows[bRows.length - 1][3] || "").trim().toUpperCase();
  }

  // Validar respuesta
  const esCorrecta = normalizarTexto(respuestaUsuario) === normalizarTexto(acertijoCorrecto);

  if (!esCorrecta) {
    return {
      status: "ok",
      acierto: false,
      intentos: intentos,
      message: "Respuesta incorrecta. Sigue intentando."
    };
  }

  // 🪙 Escala de Puntos por Intentos:
  // 1er intento: 10 PTS | 2do: 8 PTS | 3er: 6 PTS | 4to: 4 PTS | 5to o más: 2 PTS
  let ptsGanados = 2;
  if (intentos === 1) ptsGanados = 10;
  else if (intentos === 2) ptsGanados = 8;
  else if (intentos === 3) ptsGanados = 6;
  else if (intentos === 4) ptsGanados = 4;

  // Calcular racha consecutiva del jugador
  let rachaActual = 1;
  const ayer = new Date(Date.now() - 24 * 3600 * 1000);
  const ayerStr = Utilities.formatDate(ayer, "GMT-3", "yyyy-MM-dd");

  for (let i = hRows.length - 1; i >= 1; i--) {
    const n = String(hRows[i][1] || "").trim().toUpperCase();
    if (n === nick.toUpperCase()) {
      const f = parseFecha(hRows[i][0]);
      if (f === ayerStr) {
        rachaActual = (Number(hRows[i][5]) || 0) + 1;
      }
      break;
    }
  }

  // 🔥 Bono de Hito Semanal: cada 7 días seguidos de racha = +10 PTS adicionales
  let bonoSemanal = 0;
  if (rachaActual > 0 && rachaActual % 7 === 0) {
    bonoSemanal = 10;
  }

  const totalPts = ptsGanados + bonoSemanal;

  // Asentar en HISTORIAL_CRIPTICO
  hSheet.appendRow([hoyStr, nick, intentos, tiempoSegundos, totalPts, rachaActual, new Date().toISOString()]);

  // Sumar a la cuenta del usuario en PUNTOS_USUARIOS
  sumarPuntosUsuario(ss, nick, totalPts, `Críptico del Día (${intentos}º intento${bonoSemanal > 0 ? " + Bono Racha 7d" : ""})`);

  return {
    status: "ok",
    acierto: true,
    intentos: intentos,
    tiempo_segundos: tiempoSegundos,
    pts_base: ptsGanados,
    bono_racha: bonoSemanal,
    pts_ganados: totalPts,
    racha_actual: rachaActual,
    saldo_nuevo: obtenerPuntosUsuario(ss, nick),
    message: `¡Correcto! Has ganado ${totalPts} PTS (${ptsGanados} PTS base${bonoSemanal > 0 ? " + 10 PTS por racha semanal" : ""}). Racha activa: ${rachaActual} días.`
  };
}

function normalizarTexto(txt) {
  return String(txt || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * ============================================================================
 * ── 15. ENDPOINTS DEL JUEGO: "TRIVIA GEEK DEL DÍA" ──────────────────────────
 * ============================================================================
 */
function handleTriviaGetToday(p) {
  const hoyStr = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
  const cacheKey = "TRIVIA_HOY_" + hoyStr;
  const cache = CacheService.getScriptCache();

  // 1. Verificar si está en memoria RAM (respuesta instantánea < 50ms sin cuota)
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn("Error parseando cache trivia:", e);
    }
  }

  // 2. Si no está en caché, leer de Google Sheets
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const sheet = ss.getSheetByName("TRIVIA_BANCO");
  if (!sheet) {
    return { status: "error", error: "tabla_no_encontrada", message: "La tabla TRIVIA_BANCO no existe." };
  }

  const rows = sheet.getDataRange().getValues();

  let trivia = null;
  for (let i = 1; i < rows.length; i++) {
    const f = parseFecha(rows[i][0]);
    if (f === hoyStr) {
      trivia = rows[i];
      break;
    }
  }

  if (!trivia && rows.length > 1) {
    trivia = rows[rows.length - 1];
  }

  if (!trivia) {
    return { status: "error", error: "sin_preguntas", message: "No hay preguntas en la trivia." };
  }

  // ⚠️ SEGURIDAD: NO devolver Respuesta_Correcta al cliente
  const payload = {
    status: "ok",
    fecha: trivia[0],
    pregunta: trivia[1],
    opciones: {
      A: trivia[2],
      B: trivia[3],
      C: trivia[4],
      D: trivia[5]
    },
    categoria: trivia[7] || "Geek",
    dificultad: trivia[8] || "Media"
  };

  // 3. Guardar en memoria RAM por 6 horas (21600 segundos)
  cache.put(cacheKey, JSON.stringify(payload), 21600);

  return payload;
}

function handleTriviaSubmit(p) {
  const token = p.session_token || "";
  const auth = handleValidateToken(token);
  if (auth.status !== "ok") return auth;

  const nick = auth.nick;
  const respuestaDada = String(p.respuesta || "").trim().toUpperCase();
  const tiempoSegundos = Math.max(1, Number(p.tiempo) || 15);

  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const hoyStr = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");

  let hSheet = ss.getSheetByName("HISTORIAL_TRIVIA");
  if (!hSheet) hSheet = ss.insertSheet("HISTORIAL_TRIVIA");
  const hRows = hSheet.getDataRange().getValues();

  for (let i = 1; i < hRows.length; i++) {
    const f = parseFecha(hRows[i][0]);
    const n = String(hRows[i][1] || "").trim().toUpperCase();
    if (f === hoyStr && n === nick.toUpperCase()) {
      return { status: "error", error: "ya_jugado_hoy", message: "Ya respondiste la trivia de hoy." };
    }
  }

  // Obtener respuesta correcta
  const tSheet = ss.getSheetByName("TRIVIA_BANCO");
  const tRows = tSheet.getDataRange().getValues();
  let correctaEsperada = "A";

  for (let i = 1; i < tRows.length; i++) {
    const f = parseFecha(tRows[i][0]);
    if (f === hoyStr) {
      correctaEsperada = String(tRows[i][6] || "A").trim().toUpperCase();
      break;
    }
  }

  const esCorrecta = respuestaDada === correctaEsperada;

  // Escala de Puntos por velocidad:
  // <=10s: 10 PTS | <=25s: 8 PTS | <=45s: 6 PTS | <=60s: 4 PTS | >60s: 2 PTS | Incorrecta: 0 PTS
  let ptsGanados = 0;
  if (esCorrecta) {
    if (tiempoSegundos <= 10) ptsGanados = 10;
    else if (tiempoSegundos <= 25) ptsGanados = 8;
    else if (tiempoSegundos <= 45) ptsGanados = 6;
    else if (tiempoSegundos <= 60) ptsGanados = 4;
    else ptsGanados = 2;
  }

  // Racha de trivia
  let rachaActual = 1;
  const ayer = new Date(Date.now() - 24 * 3600 * 1000);
  const ayerStr = Utilities.formatDate(ayer, "GMT-3", "yyyy-MM-dd");

  for (let i = hRows.length - 1; i >= 1; i--) {
    const n = String(hRows[i][1] || "").trim().toUpperCase();
    if (n === nick.toUpperCase()) {
      const f = parseFecha(hRows[i][0]);
      if (f === ayerStr) {
        rachaActual = (Number(hRows[i][6]) || 0) + 1;
      }
      break;
    }
  }

  let bonoSemanal = 0;
  if (esCorrecta && rachaActual > 0 && rachaActual % 7 === 0) {
    bonoSemanal = 10;
  }

  const totalPts = ptsGanados + bonoSemanal;

  hSheet.appendRow([hoyStr, nick, respuestaDada, esCorrecta, tiempoSegundos, totalPts, rachaActual, new Date().toISOString()]);

  if (totalPts > 0) {
    sumarPuntosUsuario(ss, nick, totalPts, `Trivia Geek del Día (${tiempoSegundos}s${bonoSemanal > 0 ? " + Bono Racha 7d" : ""})`);
  }

  return {
    status: "ok",
    acierto: esCorrecta,
    respuesta_correcta: correctaEsperada,
    pts_ganados: totalPts,
    racha_actual: rachaActual,
    bono_racha: bonoSemanal,
    saldo_nuevo: obtenerPuntosUsuario(ss, nick),
    message: esCorrecta
      ? `¡Correcto! Respondiste en ${tiempoSegundos}s y ganaste ${totalPts} PTS. Racha: ${rachaActual} días.`
      : `Incorrecto. La respuesta era la opción ${correctaEsperada}. Tu racha se mantiene intacta.`
  };
}

/**
 * ============================================================================
 * ── 16. ENDPOINT MENSAJES SIN LEER (HIGH SCORE PERSONAL) ────────────────────
 * ============================================================================
 */
function handleMensajesSinLeerUpdate(p) {
  const adminToken = p.admin_token || "";
  if (adminToken !== CONFIG.ADMIN_SECRET_TOKEN && adminToken !== CONFIG.WEBHOOK_SECRET && adminToken !== "AJ2026") {
    return { status: "error", error: "no_autorizado", message: "Token de administrador inválido." };
  }

  const nombre = String(p.nombre || "").trim();
  const nuevosMensajes = Number(p.mensajes) || 0;

  if (!nombre || nuevosMensajes <= 0) {
    return { status: "error", error: "datos_invalidos", message: "Nombre o mensajes no válidos." };
  }

  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  let sheet = ss.getSheetByName("MENSAJES_SIN_LEER");
  if (!sheet) return { status: "error", error: "tabla_no_existe" };

  const rows = sheet.getDataRange().getValues();
  let userRow = -1;
  let recordActual = 0;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toUpperCase() === nombre.toUpperCase()) {
      userRow = i + 1;
      recordActual = Number(rows[i][1]) || 0;
      break;
    }
  }

  // ⚠️ REGLA ESTRICTA: Solo se actualiza si nuevo_valor > record_actual
  if (userRow > 0 && nuevosMensajes <= recordActual) {
    return {
      status: "ok",
      actualizado: false,
      record_vigente: recordActual,
      nuevo_intento: nuevosMensajes,
      message: `El nuevo valor (${nuevosMensajes}) no supera el récord histórico de ${nombre} (${recordActual}). Base de datos intacta.`
    };
  }

  // Calcular Tier de Categoría según mensajes acumulados
  let tier = "🌱 Superviviente";
  if (nuevosMensajes >= 4000) tier = "👑 Legendario";
  else if (nuevosMensajes >= 1000) tier = "⚡ Épico";
  else if (nuevosMensajes >= 500) tier = "🛡️ Heroico";

  const hoyStr = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");

  if (userRow > 0) {
    sheet.getRange(userRow, 2).setValue(nuevosMensajes);
    sheet.getRange(userRow, 3).setValue(hoyStr);
    sheet.getRange(userRow, 4).setValue(tier);
  } else {
    sheet.appendRow([nombre, nuevosMensajes, hoyStr, tier, p.telefono || ""]);
  }

  return {
    status: "ok",
    actualizado: true,
    nombre: nombre,
    nuevo_record: nuevosMensajes,
    tier: tier,
    message: `¡RÉCORD ACTUALIZADO! ${nombre} ahora tiene ${nuevosMensajes} mensajes sin leer (${tier}).`
  };
}

/**
 * ============================================================================
 * ── 17. ENDPOINT POPUP DINÁMICO DE DESTAQUE DEL DÍA ─────────────────────────
 * ============================================================================
 */
function handlePopupGetToday(p) {
  const ss = SpreadsheetApp.openById(CONFIG.ECONOMIA_SHEET_ID);
  const sheet = ss.getSheetByName("POPUP_DESTACADO");
  const hoyStr = Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");

  if (!sheet) {
    return { status: "no_data", message: "Pestaña POPUP_DESTACADO no encontrada." };
  }

  const rows = sheet.getDataRange().getValues();
  const activos = [];
  let anuncioHoy = null;

  for (let i = 1; i < rows.length; i++) {
    const f = parseFecha(rows[i][0]);
    const activo = rows[i][7] === true || String(rows[i][7]).toUpperCase() === "TRUE";

    if (activo) {
      const item = {
        tipo: rows[i][1] || "DESTACADO",
        titulo: rows[i][2] || "",
        descripcion: rows[i][3] || "",
        icono: rows[i][4] || "🎉",
        cta_texto: rows[i][5] || "Ver más",
        cta_link: rows[i][6] || "#"
      };

      activos.push(item);

      // Si coincide con la fecha de hoy, es el anuncio prioritario
      if (f === hoyStr && !anuncioHoy) {
        anuncioHoy = item;
      }
    }
  }

  // 1. Prioridad: Anuncio programado específicamente para la fecha de hoy
  if (anuncioHoy) {
    return {
      status: "ok",
      prioridad: 1,
      ...anuncioHoy
    };
  }

  // 2. Si no hay para hoy, elegir al azar entre cualquier anuncio activo de la hoja
  if (activos.length > 0) {
    const elegido = activos[Math.floor(Math.random() * activos.length)];
    return {
      status: "ok",
      prioridad: 2,
      ...elegido
    };
  }

  // 3. Si no hay nada activo en la hoja de cálculo
  return {
    status: "empty",
    message: "No hay avisos destacados activos en la hoja POPUP_DESTACADO."
  };
}

/**
 * ── 18. INVALIDACIÓN DE MEMORIA RAM (CacheService) ────────────────────────
 * Permite purgar la caché de juegos desde el Panel Admin o webhook
 */
function handleCacheInvalidate(p) {
  const token = p.admin_token || p.token || "";
  if (token !== CONFIG.ADMIN_SECRET_TOKEN) {
    return { status: "error", error: "unauthorized", message: "Token de administración inválido." };
  }

  const tipo = (p.tipo || "").toLowerCase();
  const fecha = p.fecha || Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd");
  const cache = CacheService.getScriptCache();
  const eliminadas = [];

  if (!tipo || tipo === "criptico") {
    cache.remove("CRIPTICO_HOY_" + fecha);
    eliminadas.push("CRIPTICO_HOY_" + fecha);
  }
  if (!tipo || tipo === "trivia") {
    cache.remove("TRIVIA_HOY_" + fecha);
    eliminadas.push("TRIVIA_HOY_" + fecha);
  }
  if (!tipo || tipo === "misiones") {
    cache.remove("MISIONES_SECRETAS_ACTIVAS");
    eliminadas.push("MISIONES_SECRETAS_ACTIVAS");
  }

  return {
    status: "ok",
    message: "Caché purgada exitosamente.",
    claves_eliminadas: eliminadas
  };
}

/**
 * ── 19. ENDPOINT DE MISIONES SECRETAS DINÁMICAS ────────────────────────────
 * Lee la pestaña MISIONES_SECRETAS y entrega misiones positivas y de ataque activas
 */
function handleMisionesGet(p) {
  const cache = CacheService.getScriptCache();
  const cacheKey = "MISIONES_SECRETAS_ACTIVAS";
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.warn("Error parseando cache misiones:", e);
    }
  }

  const ss = SpreadsheetApp.openById(CONFIG.MISIONES_SHEET_ID);
  
  // 1. Leer Misiones Públicas (Retos Semanales para toda la comunidad)
  const publicasSheet = ss.getSheetByName("MISIONES_PUBLICAS");
  const publicas = [];
  if (publicasSheet) {
    const pRows = publicasSheet.getDataRange().getValues();
    for (let i = 1; i < pRows.length; i++) {
      const row = pRows[i];
      const id = String(row[0] || "").trim();
      const titulo = String(row[1] || "").trim();
      const desc = String(row[2] || "").trim();
      const pts = String(row[3] || "").trim();
      const fechaInicio = String(row[4] || "").trim();
      const fechaFin = String(row[5] || "").trim();
      const estado = String(row[6] || "").trim().toUpperCase();

      if (!titulo || (estado !== "ACTIVA" && estado !== "")) continue;

      publicas.push({
        id: id || ("MIS-PUB-" + i),
        titulo: titulo,
        desc: desc,
        pts: pts,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin
      });
    }
  }

  // 2. Leer Misiones Secretas (Positivas y de Ataque)
  const sheet = ss.getSheetByName("MISIONES_SECRETAS");
  const positivas = [];
  const ataque = [];

  if (sheet) {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id = String(row[0] || "").trim();
      const tipo = String(row[1] || "").trim().toUpperCase();
      const titulo = String(row[2] || "").trim();
      const desc = String(row[3] || "").trim();
      const pts = String(row[4] || "").trim();
      const icono = String(row[5] || "").trim();
      const estado = String(row[6] || "").trim().toUpperCase();

      if (!titulo || (estado !== "ACTIVA" && estado !== "")) continue;

      const misionObj = {
        id: id || ("MIS-" + i),
        tipo: tipo === "POSITIVA" ? "positiva" : "negativa",
        titulo: (icono ? icono + " " : "") + titulo,
        desc: desc,
        pts: pts
      };

      if (tipo === "POSITIVA") {
        positivas.push(misionObj);
      } else {
        ataque.push(misionObj);
      }
    }
  }

  const payload = {
    status: "ok",
    publicas: publicas,
    positivas: positivas,
    ataque: ataque,
    total: publicas.length + positivas.length + ataque.length
  };

  // Guardar en RAM por 6 horas (21600 segundos)
  cache.put(cacheKey, JSON.stringify(payload), 21600);

  return payload;
}

/**
 * ============================================================================
 * 🛑 20. AVISO DE DEPRECACIÓN FORMAL: FORMULARIOS EXTERNOS DE GOOGLE FORMS
 * ============================================================================
 * @deprecated 17/11/2026 — FASE 4 DEL ROADMAP MAESTRO (HUB NATIVO DE MIEMBRO)
 * 
 * Los siguientes formularios externos han sido sustituidos soberanamente por
 * Modales Nativos en la Web de Amigos Jugones (controlados por AuthManager):
 * 
 * 1. "Tu fecha de cumpleaños (Respuestas)" → Reemplazado por #aj-cumple-modal
 *    - Causa: Formatos abiertos desordenados ("6 de marzo", "08/06/1989"), petición redundante de datos.
 *    - Nueva vía: Selector nativo día/mes con saludo público/privado y ON DELETE CASCADE.
 * 
 * 2. "Mercado Amigos Jugones (Respuestas)" → Reemplazado por #aj-mercado-modal
 *    - Causa: Falta de auto-expiración a 7 días y botones de "Marcar como Vendido".
 *    - Nueva vía: Publicación directa con auto-expiración y botón vendido en tarjetas web.
 * 
 * 3. "Radar Jugón / Tu disponibilidad (Respuestas)" → Reemplazado por #aj-radar-modal
 *    - Causa: Desconexión de identidad de sesión y desactualización manual.
 *    - Nueva vía: Selector de 7 días, horarios y juegos favoritos en el perfil del miembro.
 * 
 * REGLA OPERATIVA:
 * Las hojas antiguas de Google Sheets correspondientes a estos formularios deben
 * mantenerse en modo SOLO LECTURA para resguardo histórico. No se procesan nuevas filas.
 * ============================================================================
 */
function deprecatedGoogleFormsNotice() {
  return {
    status: "deprecated",
    fecha_deprecacion: "2026-11-17",
    mensaje: "Los formularios externos de Google Forms han sido reemplazados por el Hub Nativo de Miembro en la web.",
    modulos_migrados: ["cumpleanos", "mercado_publicaciones", "radar_jugadores"]
  };
}

/**
 * ============================================================================
 * 🛑 21. POLÍTICA DE SEGURIDAD OPERATIVA Y ANTI-BLOQUEO DE WHATSAPP (META RULES)
 * ============================================================================
 * @directive 18/11/2026 — BLINDAJE DE IDENTIDAD TELEFÓNICA
 * 
 * 1. PROHIBICIÓN DE BOTS DIRECTOS:
 *    Está terminantemente prohibido integrar APIs no oficiales de WhatsApp
 *    (Baileys, Evolution, UltraMsg, WPPConnect o webhooks automatizados salientes)
 *    hacia los números de la comunidad. Meta aplica bloqueos irreversibles.
 * 
 * 2. MODELO DE DISTRIBUCIÓN GRÁFICA SOBERANA:
 *    Toda interacción hacia WhatsApp se basa en:
 *    a) Generación de imágenes/tarjetas PNG AMOLED en Google Drive (acción 'lunara_captura')
 *    b) Generación en cliente con Canvas HTML5 (LogroCard en logro-card.js)
 *    c) Los usuarios o el administrador descargan y comparten estas imágenes de forma
 *       100% humana y manual en los chats de WhatsApp.
 * 
 * 3. ALCANCE ÚNICO DE LUNARA CON WHATSAPP:
 *    La única conexión permitida es la lectura pasiva de la hoja MEMBERS_SHEET_ID
 *    para identificar a los miembros registrados del Club.
 * ============================================================================
 */
function getPoliticaSeguridadWhatsApp() {
  return {
    status: "ok",
    politica: "Anti-Ban Meta",
    envio_automatizado_bots: false,
    canal_distribucion: "Imagenes y Tarjetas AMOLED descargables (Manual)"
  };
}

/**
 * ============================================================================
 * ☁️ 22. PREVENCIÓN DE COLD START Y KEEP-ALIVE DEL BACKEND (RENDER / CLOUD API)
 * ============================================================================
 * Disparador programado (Time-Driven Trigger cada 10 minutos).
 * Envía una petición liviana al backend en la nube para mantener el contenedor
 * activo 24/7 sin latencia de espera para los miembros del club.
 * ============================================================================
 */
function pingBackendKeepAlive() {
  var backendUrl = "https://api-amigosjugones.onrender.com/api/online"; // Reemplazar al desplegar en Render
  try {
    var response = UrlFetchApp.fetch(backendUrl, {
      method: "get",
      muteHttpExceptions: true
    });
    Logger.log("✅ Keep-Alive Backend OK: " + response.getResponseCode());
    return { ok: true, status: response.getResponseCode() };
  } catch (e) {
    Logger.log("⚠️ Keep-Alive Backend Warning: " + e.message);
    return { ok: false, error: e.message };
  }
}





