-- ============================================================================
-- AMIGOS JUGONES — ESQUEMA SQLITE / LIBSQL (TURSO COMPATIBLE)
-- ============================================================================
-- Compatible al 100% con SQLite3 y Turso (libSQL).
-- Política de retención de transacciones: 21 días (3 semanas).
-- ============================================================================

CREATE TABLE IF NOT EXISTS jugadores (
    nick TEXT PRIMARY KEY,
    puntos INTEGER NOT NULL DEFAULT 0,
    total_ganados INTEGER NOT NULL DEFAULT 0,
    total_gastados INTEGER NOT NULL DEFAULT 0,
    ultima_actividad TEXT,
    estado TEXT NOT NULL DEFAULT 'Activo',
    telefono TEXT,
    nombre_agenda_admin TEXT,
    nombre_perfil_ws TEXT,
    password_hash TEXT DEFAULT NULL,
    password_salt TEXT DEFAULT NULL,
    tiene_clave_privada INTEGER NOT NULL DEFAULT 0,
    fecha_registro_privada TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS podio_carrera (
    pos INTEGER PRIMARY KEY,
    nick TEXT NOT NULL,
    km REAL NOT NULL DEFAULT 0,
    bonus_coins INTEGER NOT NULL DEFAULT 0,
    fecha_record TEXT,
    renta_diaria TEXT DEFAULT '-'
);

CREATE TABLE IF NOT EXISTS podio_pelea (
    pos INTEGER PRIMARY KEY,
    nick TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    cortes INTEGER NOT NULL DEFAULT 0,
    tiempo_seg INTEGER NOT NULL DEFAULT 0,
    fecha_record TEXT,
    renta_diaria TEXT DEFAULT '-'
);

CREATE TABLE IF NOT EXISTS historial_transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    nick TEXT NOT NULL,
    tipo_evento TEXT NOT NULL,
    descripcion TEXT,
    variacion_pts INTEGER NOT NULL DEFAULT 0,
    saldo_resultante INTEGER NOT NULL DEFAULT 0
);

-- Índices de alto rendimiento para consultas inmediatas
CREATE INDEX IF NOT EXISTS idx_jugadores_puntos ON jugadores(puntos DESC);
CREATE INDEX IF NOT EXISTS idx_jugadores_telefono ON jugadores(telefono);
CREATE INDEX IF NOT EXISTS idx_transacciones_nick ON historial_transacciones(nick);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON historial_transacciones(timestamp);

-- ============================================================================
-- CONTROL DE SESIONES ACTIVAS Y AUTENTICACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS sesiones_activas (
    token TEXT PRIMARY KEY,
    nick TEXT NOT NULL,
    telefono TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    activo INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sesiones_nick ON sesiones_activas(nick);
CREATE INDEX IF NOT EXISTS idx_sesiones_telefono ON sesiones_activas(telefono);

CREATE TABLE IF NOT EXISTS dispositivos_miembro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telefono TEXT NOT NULL,
    device_id TEXT NOT NULL,
    nombre_dispositivo TEXT,
    ip_origen TEXT,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    ultimo_acceso TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(telefono, device_id)
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_telefono ON dispositivos_miembro(telefono);
CREATE INDEX IF NOT EXISTS idx_dispositivos_device ON dispositivos_miembro(device_id);

-- ============================================================================
-- SISTEMA DE ENCUESTAS GEEK SEMANALES
-- ============================================================================

-- Catálogo de elementos por categoría (administrado por Lunara / admin)
CREATE TABLE IF NOT EXISTS encuestas_catalogo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria TEXT NOT NULL,           -- 'juegos_mesa', 'peliculas', 'series', etc.
    nombre TEXT NOT NULL,              -- Nombre del ítem (ej: "Catan")
    descripcion TEXT,                  -- Descripción corta opcional
    imagen_url TEXT,                   -- URL de imagen opcional
    anio INTEGER,                      -- Año de lanzamiento (opcional)
    estado TEXT NOT NULL DEFAULT 'pendiente',  -- 'pendiente', 'votado', 'archivado'
    fecha_agregado TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Encuestas activas (una por semana por categoría)
CREATE TABLE IF NOT EXISTS encuestas_activas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalogo_id INTEGER NOT NULL REFERENCES encuestas_catalogo(id),
    categoria TEXT NOT NULL,
    nombre_item TEXT NOT NULL,
    descripcion_item TEXT,
    imagen_url TEXT,
    fecha_inicio TEXT NOT NULL DEFAULT (datetime('now')),
    fecha_fin TEXT NOT NULL,           -- Siempre 7 días después del inicio
    activa INTEGER NOT NULL DEFAULT 1, -- 1=activa, 0=cerrada
    total_votos INTEGER NOT NULL DEFAULT 0,
    promedio_score REAL NOT NULL DEFAULT 0.0,
    ganador_siguiente TEXT            -- Nick del que tendrá +1 PTS por haber votado
);

-- Registro de votos individuales
CREATE TABLE IF NOT EXISTS votos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    encuesta_id INTEGER NOT NULL REFERENCES encuestas_activas(id),
    nick TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(encuesta_id, nick)          -- Un solo voto por miembro por encuesta
);

-- Índices para encuestas
CREATE INDEX IF NOT EXISTS idx_catalogo_categoria ON encuestas_catalogo(categoria, estado);
CREATE INDEX IF NOT EXISTS idx_encuestas_categoria ON encuestas_activas(categoria, activa);
CREATE INDEX IF NOT EXISTS idx_votos_encuesta ON votos(encuesta_id);
CREATE INDEX IF NOT EXISTS idx_votos_nick ON votos(nick);

-- ============================================================================
-- MÓDULO DE JUNTAS Y PARTIDAS COMUNITARIAS (TURSO / LIBSQL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS juntas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    juego TEXT NOT NULL,
    fecha TEXT NOT NULL,                  -- ej. 'Viernes 12/06' o YYYY-MM-DD
    hora TEXT NOT NULL,                   -- ej. '19:30'
    lugar TEXT NOT NULL,                  -- ej. 'Metro Grecia', 'Quinahue 7116'
    comuna_sector TEXT,                   -- ej. 'Santiago Centro', 'Ñuñoa', etc.
    cupos_totales INTEGER NOT NULL CHECK(cupos_totales BETWEEN 2 AND 12),
    cupos_disponibles INTEGER NOT NULL,
    organizador_nick TEXT NOT NULL,
    organizador_whatsapp TEXT NOT NULL,
    descripcion_notas TEXT,               -- 'Traer picoteo. Explicamos reglas'
    estado TEXT NOT NULL DEFAULT 'Abierta' CHECK(estado IN ('Abierta', 'Completada', 'Cancelada', 'Finalizada')),
    fecha_creacion TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS juntas_anotados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    junta_id INTEGER NOT NULL REFERENCES juntas(id) ON DELETE CASCADE,
    nick TEXT NOT NULL,
    whatsapp TEXT,
    es_anfitrion INTEGER NOT NULL DEFAULT 0 CHECK(es_anfitrion IN (0, 1)),
    fecha_registro TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(junta_id, nick)                -- Evita duplicados de un mismo usuario en una mesa
);

CREATE INDEX IF NOT EXISTS idx_juntas_estado_fecha ON juntas(estado, fecha);
CREATE INDEX IF NOT EXISTS idx_juntas_anotados ON juntas_anotados(junta_id);

-- ============================================================================
-- MÓDULO DE PRESENCIA ONLINE Y PERFILES DE USUARIO
-- ============================================================================

-- Presencia en tiempo real (heartbeat cada 30 segundos desde el frontend)
CREATE TABLE IF NOT EXISTS presencia_online (
    nick TEXT PRIMARY KEY,
    ultima_vez TEXT NOT NULL DEFAULT (datetime('now')),
    pagina TEXT NOT NULL DEFAULT 'inicio',
    avatar_url TEXT
);

-- Perfiles persistentes de usuario (foto, bio, etc.)
CREATE TABLE IF NOT EXISTS perfiles (
    nick TEXT PRIMARY KEY,
    avatar_url TEXT,
    bio TEXT,
    fecha_actualizacion TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_presencia_ultima_vez ON presencia_online(ultima_vez);

-- ============================================================================
-- MÓDULO DE TEMPORADAS, MEDALLAS Y SALA DE LA FAMA
-- ============================================================================

-- Control de temporadas mensuales
CREATE TABLE IF NOT EXISTS temporadas (
    clave TEXT PRIMARY KEY,                     -- '2026-10' (YYYY-MM)
    nombre TEXT NOT NULL,                       -- 'Octubre 2026'
    fecha_inicio TEXT NOT NULL,                 -- '2026-10-01'
    fecha_fin TEXT,                             -- '2026-10-31' (null si activa)
    activa INTEGER NOT NULL DEFAULT 1,          -- 1=activa, 0=cerrada
    snapshot_url TEXT,                          -- URL al JSON en GitHub
    puntos_otorgados INTEGER NOT NULL DEFAULT 0 -- 1 si ya se distribuyeron bonus
);

-- Registro de medallas por jugador (acumulativas de por vida)
CREATE TABLE IF NOT EXISTS medallas_jugador (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nick TEXT NOT NULL,
    codigo_medalla TEXT NOT NULL,               -- 'oro_gral', 'arcade_piloto', etc.
    nombre_medalla TEXT NOT NULL,               -- 'Rey del Mes', 'As del Circuito', etc.
    emoji_medalla TEXT NOT NULL,                -- '👑', '🏎️', etc.
    color_medalla TEXT NOT NULL DEFAULT '#ffd700', -- color hex para la UI
    temporada TEXT NOT NULL,                    -- '2026-10'
    nombre_temporada TEXT NOT NULL,             -- 'Octubre 2026'
    fecha_otorgada TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Snapshot del ranking mensual (se llena al cierre, NO en tiempo real)
CREATE TABLE IF NOT EXISTS ranking_mensual_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temporada TEXT NOT NULL,
    categoria TEXT NOT NULL,                    -- 'general', 'arcade_carrera', 'arcade_ninja', 'actividad', 'bga'
    posicion INTEGER NOT NULL,
    nick TEXT NOT NULL,
    valor INTEGER NOT NULL DEFAULT 0,           -- puntos, km, score según categoría
    unidad TEXT NOT NULL DEFAULT 'PTS',         -- 'PTS', 'KM', 'score', etc.
    bonus_otorgado INTEGER NOT NULL DEFAULT 0   -- PTS extra dados como premio
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_medallas_nick ON medallas_jugador(nick);
CREATE INDEX IF NOT EXISTS idx_medallas_temporada ON medallas_jugador(temporada);
CREATE INDEX IF NOT EXISTS idx_snapshot_temporada ON ranking_mensual_snapshot(temporada, categoria);
CREATE INDEX IF NOT EXISTS idx_temporadas_activa ON temporadas(activa);

-- ============================================================================
-- MÓDULO DE ANALYTICS PRIVADO (Google Analytics propio)
-- ============================================================================
-- Registra visitas de visitantes (anónimos) y miembros autenticados.
-- Estrategia Rolling Archive: cuando supera ANALYTICS_MAX_ROWS registros,
-- se exporta el bloque más antiguo a JSON local y se purga de Turso para
-- mantenerse siempre dentro del free tier.
-- ============================================================================

-- Registro de visitas individuales (pageviews)
CREATE TABLE IF NOT EXISTS visitas_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,           -- UUID anónimo persistido en localStorage (visitante) o nick (miembro)
    nick TEXT,                          -- NULL si es visitante no autenticado
    tipo_usuario TEXT NOT NULL DEFAULT 'visitante' CHECK(tipo_usuario IN ('visitante', 'miembro')),
    pagina TEXT NOT NULL,               -- ruta relativa, ej: '/', '/ranking.html', '/juegos.html'
    titulo_pagina TEXT,                 -- document.title de la página visitada
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    duracion_seg INTEGER,               -- segundos en la página (se actualiza al salir / beacon)
    dispositivo TEXT DEFAULT 'desktop' CHECK(dispositivo IN ('mobile', 'desktop', 'tablet')),
    referrer TEXT,                      -- document.referrer al llegar a la página
    session_id TEXT                     -- UUID por sesión de navegación (se genera al abrir el sitio)
);

-- Registro de archivos de analytics históricos (rolling archive)
CREATE TABLE IF NOT EXISTS analytics_archivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_archivo TEXT NOT NULL,       -- 'analytics_2026_10.json'
    registros_archivados INTEGER NOT NULL DEFAULT 0,
    fecha_inicio TEXT NOT NULL,         -- timestamp del registro más antiguo archivado
    fecha_fin TEXT NOT NULL,            -- timestamp del registro más reciente archivado
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices para analytics
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON visitas_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_nick ON visitas_analytics(nick);
CREATE INDEX IF NOT EXISTS idx_analytics_pagina ON visitas_analytics(pagina);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON visitas_analytics(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_tipo ON visitas_analytics(tipo_usuario);

-- ============================================================================
-- MÓDULO: EL SALÓN DE HONOR (MÉRITOS REALES DE MIEMBROS)
-- ============================================================================
-- Reconocimientos de honor curados exclusivamente por el Admin.
-- NO OTORGAN PUNTOS. Son permanentes y visibles para todo el público.
-- Formato tipo "Mercado Jugón" con enlace a Instagram y ficha de mérito.
-- ============================================================================

CREATE TABLE IF NOT EXISTS logros_externos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nick TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'general',
    emoji_categoria TEXT NOT NULL DEFAULT '🎖️',
    fecha_logro TEXT,
    instagram_user TEXT,
    instagram_url TEXT,
    enlace_referencia TEXT,
    imagen_url TEXT,
    visible INTEGER NOT NULL DEFAULT 1,
    destacado INTEGER NOT NULL DEFAULT 0,
    creado_en TEXT NOT NULL DEFAULT (datetime('now')),
    actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logros_nick ON logros_externos(nick);
CREATE INDEX IF NOT EXISTS idx_logros_visible ON logros_externos(visible, destacado);
CREATE INDEX IF NOT EXISTS idx_logros_categoria ON logros_externos(categoria);

-- ============================================================================
-- MÓDULO DE PREMIOS VISIBLES
-- ============================================================================
-- Premios de temporada gestionados por el Admin.
-- Visibles para todos en el Footer sin necesitar login.
-- ============================================================================

CREATE TABLE IF NOT EXISTS premios_temporada (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temporada TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion_general TEXT NOT NULL,
    donante TEXT NOT NULL,
    descripcion_donante TEXT,
    meta_puntos INTEGER NOT NULL DEFAULT 1000,
    tipo_premio TEXT NOT NULL DEFAULT 'juego_mesa',
    emoji_tipo TEXT NOT NULL DEFAULT '🎲',
    imagen_url TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    orden INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_premios_temporada ON premios_temporada(temporada, activo);

-- ============================================================================
-- CUMPLEAÑOS DE MIEMBROS (HUB NATIVO)
-- Sustitución soberana del formulario externo de Google Forms.
-- Vinculado directamente a jugadores(nick) con borrado en cascada (ON DELETE CASCADE).
-- ============================================================================

CREATE TABLE IF NOT EXISTS cumpleanos (
    nick TEXT PRIMARY KEY REFERENCES jugadores(nick) ON DELETE CASCADE,
    dia INTEGER NOT NULL CHECK(dia BETWEEN 1 AND 31),
    mes INTEGER NOT NULL CHECK(mes BETWEEN 1 AND 12),
    saludo_publico INTEGER NOT NULL DEFAULT 1 CHECK(saludo_publico IN (0, 1)),
    fecha_actualizacion TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cumpleanos_fecha ON cumpleanos(mes, dia);

-- ============================================================================
-- MERCADO JUGÓN NATIVO (HUB NATIVO — PASO 6)
-- Sustitución soberana del formulario externo de Google Forms.
-- Expiración automática a 7 días, soporte para marcar vendido y borrado en cascada.
-- ============================================================================

CREATE TABLE IF NOT EXISTS mercado_publicaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nick TEXT NOT NULL REFERENCES jugadores(nick) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    titulo TEXT NOT NULL,
    estado_producto TEXT NOT NULL DEFAULT 'Nuevo',
    descripcion TEXT,
    foto_url TEXT,
    precio_clp INTEGER DEFAULT 0,
    precio_formateado TEXT,
    disponibles INTEGER NOT NULL DEFAULT 1,
    contacto_instagram TEXT,
    vendido INTEGER NOT NULL DEFAULT 0 CHECK(vendido IN (0, 1)),
    fecha_publicacion TEXT NOT NULL DEFAULT (datetime('now')),
    fecha_expiracion TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mercado_activo ON mercado_publicaciones(vendido, fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_mercado_nick ON mercado_publicaciones(nick);
CREATE INDEX IF NOT EXISTS idx_mercado_categoria ON mercado_publicaciones(categoria);

-- ============================================================================
-- RADAR JUGÓN NATIVO (HUB NATIVO — PASO 9)
-- Disponibilidad semanal, horarios, juegos favoritos y zona de los miembros.
-- Sustituye el formulario externo de Google Forms.
-- ============================================================================

CREATE TABLE IF NOT EXISTS radar_jugadores (
    nick TEXT PRIMARY KEY REFERENCES jugadores(nick) ON DELETE CASCADE,
    zona TEXT NOT NULL DEFAULT 'Sector Santiago',
    estilos TEXT NOT NULL DEFAULT '',
    favoritos TEXT NOT NULL DEFAULT '',
    coleccion TEXT NOT NULL DEFAULT '',
    dias_disponibles TEXT NOT NULL DEFAULT '[]',     -- JSON array: ["LUNES","SABADO"]
    horario_preferido TEXT NOT NULL DEFAULT 'Tarde / Noche (17:00 - 21:00)',
    busca_jugadores_para TEXT NOT NULL DEFAULT '',
    fecha_actualizacion TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_radar_zona ON radar_jugadores(zona);

-- ============================================================================
-- MISIONES Y DESAFÍOS DIARIOS (SISTEMA DUAL WEB — FASE 5)
-- Pruebas efímeras con purga física automática de imágenes post-revisión.
-- Control estricto anti-doble cobro: UNIQUE(nick, fecha_mision, tipo_mision).
-- ============================================================================

CREATE TABLE IF NOT EXISTS misiones_entregas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nick TEXT NOT NULL REFERENCES jugadores(nick) ON DELETE CASCADE,
    fecha_mision TEXT NOT NULL,                     -- 'YYYY-MM-DD'
    tipo_mision TEXT NOT NULL DEFAULT 'grupal',      -- 'grupal' | 'secreta'
    desafios_completados TEXT NOT NULL DEFAULT '[]', -- JSON array de números de retos cumplidos [1,2,3,4,5,6,7]
    pruebas_urls TEXT DEFAULT '[]',                 -- JSON array con rutas locales temporales. Se purga al revisar.
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'aprobado', 'rechazado')),
    puntos_otorgados INTEGER NOT NULL DEFAULT 0,
    comentario_admin TEXT DEFAULT '',
    admin_revisor TEXT DEFAULT NULL,
    fecha_envio TEXT NOT NULL DEFAULT (datetime('now')),
    fecha_revision TEXT DEFAULT NULL,
    UNIQUE(nick, fecha_mision, tipo_mision)
);

CREATE INDEX IF NOT EXISTS idx_misiones_estado ON misiones_entregas(estado, fecha_mision);
CREATE INDEX IF NOT EXISTS idx_misiones_nick ON misiones_entregas(nick);

