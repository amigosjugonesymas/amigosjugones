# 🗄️ Base de Datos SQLite — Amigos Jugones

Esta carpeta contiene la base de datos local SQLite y las herramientas de gestión que desacoplan la plataforma web de Google Apps Script, eliminando los cuellos de botella de cuotas y facilitando la migración 1:1 directa a **Turso (libSQL)**.

---

## 📁 Archivos del Módulo

| Archivo | Descripción |
|---|---|
| `amigos_jugones.db` | Archivo binario de base de datos SQLite con los datos de usuarios, rankings y juegos. |
| `schema.sql` | Definición de tablas DDL e índices optimizados para SQLite y Turso. |
| `gestor_db.py` | Script en Python para administración, importación desde Google Sheets, exportación a `ranking.json` y purga de logs. |

---

## 📊 Tablas y Estructura de Datos

### 1. `jugadores`
Almacena el saldo de puntos y métricas generales de cada miembro del club.
* `nick` (TEXT PRIMARY KEY): Nombre único del jugador (ej. `BLACK`, `Jess_Shadow`).
* `puntos` (INTEGER): Saldo actual de puntos canjeables / utilizables en juegos.
* `total_ganados` (INTEGER): Puntos acumulados históricamente.
* `total_gastados` (INTEGER): Puntos consumidos históricamente.
* `ultima_actividad` (TEXT ISO 8601): Marca de tiempo del último evento.
* `estado` (TEXT): `Activo` o `Inactivo`.

### 2. `podio_carrera`
Tabla de posiciones del juego *Circuito Black* (carrera.html).
* `pos` (INTEGER PRIMARY KEY): Puesto en el podio (1, 2, 3...).
* `nick` (TEXT): Piloto.
* `km` (REAL): Distancia recorrida récord.
* `bonus_coins` (INTEGER): Monedas recolectadas en pista.
* `fecha_record` (TEXT): Fecha del registro.
* `renta_diaria` (TEXT): Renta pasiva otorgada (`+3 PTS/día`, `+2 PTS/día`, `+1 PTS/día`).

### 3. `podio_pelea`
Tabla de posiciones del juego *Cyber Ninja Slash* (pelea.html).
* `pos` (INTEGER PRIMARY KEY): Puesto en el podio (1, 2, 3...).
* `nick` (TEXT): Luchador / Sensei.
* `score` (INTEGER): Puntuación alcanzada.
* `cortes` (INTEGER): Número de cortes exitosos.
* `tiempo_seg` (INTEGER): Segundos sobrevividos.
* `fecha_record` (TEXT): Fecha del registro.
* `renta_diaria` (TEXT): Renta pasiva otorgada.

### 4. `historial_transacciones`
Log transaccional de consumo y otorgamiento de puntos.
* **Política de Retención:** 21 días (3 semanas). Los registros con más de 21 días se eliminan periódicamente para mantener el archivo ultra liviano (< 2 MB).
* `id` (INTEGER PRIMARY KEY AUTOINCREMENT).
* `timestamp` (TEXT ISO 8601).
* `nick` (TEXT).
* `tipo_evento` (TEXT): Ej. `JUEGO_CARRERA`, `JUEGO_PELEA`, `RENTA_PASIVA`.
* `descripcion` (TEXT).
* `variacion_pts` (INTEGER): Ej. `-10` por jugar, `+3` por renta.
* `saldo_resultante` (INTEGER).

---

## 🛠️ Comandos de Administración (`gestor_db.py`)

Desde la raíz del proyecto (`amigosjugones_sin_bot`):

```bash
# Ver estado actual de tablas, podios y jugadores
python database/gestor_db.py status

# Sincronizar e importar datos desde la hoja activa de Google Sheets
python database/gestor_db.py sync

# Exportar los datos actuales de SQLite a ranking.json para la web
python database/gestor_db.py export

# Purgar transacciones con más de 21 días (3 semanas)
python database/gestor_db.py purge
```

---

## 🚀 Migración Futura a Turso (libSQL)

Dado que Turso es una distribución nativa de SQLite en la nube:
1. Este archivo `amigos_jugones.db` puede exportarse a SQL (`.dump`).
2. Se sube directamente con el CLI de Turso:
   ```bash
   turso db create amigos-jugones --from-dump database/dump.sql
   ```
3. No requiere transformar esquemas ni adaptar consultas SQL.
