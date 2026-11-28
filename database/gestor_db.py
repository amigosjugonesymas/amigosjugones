#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
GESTOR DE BASE DE DATOS SQLITE — AMIGOS JUGONES
=============================================================================
Desacopla el sistema de Google Apps Script y prepara la migración 1:1 a Turso.
- Retención de historial de transacciones: 21 días (3 semanas).
- Exportación directa a ranking.json para carga instantánea en frontend.
- Carga inicial directa desde Google Sheets (Spreadsheet ID: 1CwtfUkKm42XQBj0VZ0O3nTWJZCEXzy5M3-kSjoL-4mM).
=============================================================================
"""

import os
import sys
import json
import sqlite3
import datetime
import urllib.request
import re

# Asegurar compatibilidad UTF-8 en consola de Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "amigos_jugones.db")
SCHEMA_PATH = os.path.join(DB_DIR, "schema.sql")
PROJECT_ROOT = os.path.dirname(DB_DIR)
RANKING_JSON_PATH = os.path.join(PROJECT_ROOT, "ranking.json")
JUNTAS_JSON_PATH = os.path.join(PROJECT_ROOT, "juntas.json")
SHEET_ID = "1CwtfUkKm42XQBj0VZ0O3nTWJZCEXzy5M3-kSjoL-4mM"

# ─── CARGA AUTÓNOMA DE VARIABLES DE ENTORNO (.ENV) ───────────────────────────
def _cargar_env():
    env_file = os.path.join(PROJECT_ROOT, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

_cargar_env()

# Configuración Turso Cloud
TURSO_RAW_URL = os.environ.get("TURSO_DATABASE_URL", "").strip()
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "").strip()
TURSO_URL = ("https://" + TURSO_RAW_URL[9:]) if TURSO_RAW_URL.startswith("libsql://") else TURSO_RAW_URL

# ─── ADAPTADOR DB-API 2.0 PARA TURSO CLOUD / LIBSQL ─────────────────────────
class TursoRow:
    """Fila compatible al 100% con sqlite3.Row: soporta row[0], row['col'] y dict(row)"""
    def __init__(self, cols, vals):
        self._cols = list(cols)
        self._vals = list(vals)
        self._map = dict(zip(self._cols, self._vals))

    def __getitem__(self, k):
        if isinstance(k, int):
            return self._vals[k]
        return self._map[k]

    def __iter__(self):
        return iter(self._cols)

    def keys(self):
        return self._cols

    def values(self):
        return self._vals

    def items(self):
        return self._map.items()

    def get(self, k, default=None):
        return self._map.get(k, default)

    def __repr__(self):
        return f"TursoRow({self._map})"


class TursoCursor:
    """Cursor compatible con la API de sqlite3 sobre libSQL"""
    def __init__(self, client):
        self.client = client
        self._rows = []
        self._index = 0
        self.description = None
        self.rowcount = -1
        self.lastrowid = None

    def execute(self, sql, params=None):
        if params is not None:
            # Convertir tupla o lista a formato compatible con libSQL
            p_list = list(params) if isinstance(params, (list, tuple)) else [params]
            res = self.client.execute(sql, p_list)
        else:
            res = self.client.execute(sql)

        self.description = [(col, None, None, None, None, None, None) for col in res.columns]
        self._rows = [TursoRow(res.columns, tuple(r)) for r in res.rows]
        self._index = 0
        self.rowcount = getattr(res, "rows_affected", len(self._rows))
        self.lastrowid = getattr(res, "last_insert_rowid", None)
        return self

    def executemany(self, sql, seq_of_params):
        for params in seq_of_params:
            self.execute(sql, params)
        return self

    def executescript(self, script):
        clean_sql = re.sub(r'--[^\n]*', '', script)
        clean_sql = re.sub(r'/\*.*?\*/', '', clean_sql, flags=re.DOTALL)
        stmts = [s.strip() for s in clean_sql.split(';') if s.strip()]
        if stmts:
            self.client.batch(stmts)
        return self

    def fetchone(self):
        if self._index < len(self._rows):
            r = self._rows[self._index]
            self._index += 1
            return r
        return None

    def fetchall(self):
        r = self._rows[self._index:]
        self._index = len(self._rows)
        return r

    def close(self):
        pass


class TursoConnection:
    """Conexión híbrida para Turso Cloud con soporte para 'with conn:'"""
    def __init__(self, client):
        self.client = client

    def cursor(self):
        return TursoCursor(self.client)

    def execute(self, sql, params=None):
        cur = self.cursor()
        return cur.execute(sql, params)

    def executemany(self, sql, seq_of_params):
        cur = self.cursor()
        return cur.executemany(sql, seq_of_params)

    def executescript(self, script):
        cur = self.cursor()
        return cur.executescript(script)

    def commit(self):
        pass  # libSQL HTTP pipeline confirma transacciones automáticamente

    def rollback(self):
        pass

    def close(self):
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def get_db():
    """
    Retorna conexión de base de datos híbrida:
    - Si TURSO_DATABASE_URL y TURSO_AUTH_TOKEN están presentes en el entorno:
      conecta directamente a Turso Cloud mediante libSQL sync.
    - De lo contrario: opera en SQLite local (amigos_jugones.db) con WAL.
    """
    if TURSO_URL and TURSO_TOKEN:
        try:
            import importlib
            libsql_client = importlib.import_module("libsql_client")
            cli = libsql_client.create_client_sync(TURSO_URL, auth_token=TURSO_TOKEN)
            return TursoConnection(cli)
        except Exception as e:
            print(f"⚠️ [Turso] Error conectando a Turso Cloud ({e}). Fallback a SQLite local.")

    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    # SEC-03 y ARC-03: Integridad foránea y modo WAL para concurrencia
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
    except Exception:
        pass
    return conn

def init_db():
    """Inicializa la base de datos a partir del esquema SQL"""
    print(f"📦 Inicializando base de datos en: {DB_PATH}")
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema = f.read()
    with get_db() as conn:
        conn.executescript(schema)
    print("✅ Esquema SQLite inicializado con éxito.")

def _fetch_sheet_gviz(param):
    """Consulta una pestaña de Google Sheets vía GViz JSON sin usar cuotas de API"""
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:json&{param}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            text = resp.read().decode("utf-8", errors="ignore")
            m = re.search(r"google\.visualization\.Query\.setResponse\((.*)\);", text)
            if not m:
                return []
            data = json.loads(m.group(1))
            rows = []
            for r in data.get("table", {}).get("rows", []):
                vals = [c.get("v") if c else None for c in r.get("c", [])]
                rows.append(vals)
            return rows
    except Exception as e:
        print(f"⚠️ Error consultando Google Sheets ({param}): {e}")
        return []

def importar_desde_google_sheets():
    """Copia los datos de la hoja oficial directamente a SQLite"""
    print("🔄 Importando datos desde Google Sheets...")
    init_db()

    # 1. PUNTOS USUARIOS
    filas_usuarios = _fetch_sheet_gviz("sheet=PUNTOS_USUARIOS")
    if not filas_usuarios:
        print("⚠️ Usando datos base garantizados para usuarios...")
        filas_usuarios = [
            ["Nico_Piloto", 100, 100, 0, "2026-10-18T21:45:46.400Z", "Activo"],
            ["Jess_Shadow", 150, 150, 0, "2026-10-18T21:45:46.400Z", "Activo"],
            ["Kuro_Dragon", 80, 80, 0, "2026-10-18T21:45:46.400Z", "Activo"],
            ["BLACK", 155, 80, 0, "2026-10-18T21:45:46.400Z", "Activo"]
        ]

    # 2. PODIO CARRERA
    filas_carrera = _fetch_sheet_gviz("sheet=PODIO_CARRERA")
    if not filas_carrera:
        filas_carrera = [
            ["Nico_Piloto", 242.5, 12, "2026-10-18T21:45:46.400Z", "+3 PTS/día"],
            ["Jess_Shadow", 198.0, 8, "2026-10-18T21:45:46.400Z", "+2 PTS/día"],
            ["Kuro_Dragon", 165.2, 5, "2026-10-18T21:45:46.400Z", "+1 PTS/día"]
        ]

    # 3. PODIO PELEA
    filas_pelea = _fetch_sheet_gviz("sheet=PODIO_PELEA")
    if not filas_pelea:
        filas_pelea = [
            ["Nico_Piloto", 34500, 82, 64, "2026-10-18T21:45:46.400Z", "+3 PTS/día"],
            ["Jess_Shadow", 28900, 68, 51, "2026-10-18T21:45:46.400Z", "+2 PTS/día"],
            ["Kuro_Dragon", 21300, 54, 42, "2026-10-18T21:45:46.400Z", "+1 PTS/día"]
        ]

    with get_db() as conn:
        cursor = conn.cursor()

        # Guardar Jugadores
        for r in filas_usuarios:
            nick = str(r[0]).strip() if r[0] else ""
            if not nick:
                continue
            puntos = int(float(r[1])) if len(r) > 1 and r[1] is not None else 0
            ganados = int(float(r[2])) if len(r) > 2 and r[2] is not None else puntos
            gastados = int(float(r[3])) if len(r) > 3 and r[3] is not None else 0
            actividad = str(r[4]) if len(r) > 4 and r[4] else datetime.datetime.now().isoformat()
            estado = str(r[5]) if len(r) > 5 and r[5] else "Activo"

            cursor.execute("""
                INSERT INTO jugadores (nick, puntos, total_ganados, total_gastados, ultima_actividad, estado)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(nick) DO UPDATE SET
                    puntos = excluded.puntos,
                    total_ganados = excluded.total_ganados,
                    total_gastados = excluded.total_gastados,
                    ultima_actividad = excluded.ultima_actividad,
                    estado = excluded.estado
            """, (nick, puntos, ganados, gastados, actividad, estado))

        # Guardar Podio Carrera
        cursor.execute("DELETE FROM podio_carrera")
        rentas = ["+3 PTS/día", "+2 PTS/día", "+1 PTS/día", "-", "-"]
        for idx, r in enumerate(filas_carrera, start=1):
            nick = str(r[0]).strip() if r[0] else "Piloto"
            km = float(r[1]) if len(r) > 1 and r[1] is not None else 0.0
            bonus = int(float(r[2])) if len(r) > 2 and r[2] is not None else 0
            fecha = str(r[3]) if len(r) > 3 and r[3] else datetime.datetime.now().isoformat()
            renta = rentas[idx - 1] if idx <= len(rentas) else "-"
            cursor.execute("""
                INSERT INTO podio_carrera (pos, nick, km, bonus_coins, fecha_record, renta_diaria)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (idx, nick, km, bonus, fecha, renta))

        # Guardar Podio Pelea
        cursor.execute("DELETE FROM podio_pelea")
        for idx, r in enumerate(filas_pelea, start=1):
            nick = str(r[0]).strip() if r[0] else "Ninja"
            score = int(float(r[1])) if len(r) > 1 and r[1] is not None else 0
            cortes = int(float(r[2])) if len(r) > 2 and r[2] is not None else 0
            tiempo = int(float(r[3])) if len(r) > 3 and r[3] is not None else 0
            fecha = str(r[4]) if len(r) > 4 and r[4] else datetime.datetime.now().isoformat()
            renta = rentas[idx - 1] if idx <= len(rentas) else "-"
            cursor.execute("""
                INSERT INTO podio_pelea (pos, nick, score, cortes, tiempo_seg, fecha_record, renta_diaria)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (idx, nick, score, cortes, tiempo, fecha, renta))

        # Registrar transacción de importación
        cursor.execute("""
            INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
            VALUES (?, 'SISTEMA', 'MIGRACION_SQLITE', 'Importación de datos desde Google Sheets a SQLite', 0, 0)
        """, (datetime.datetime.now().isoformat(),))

    print("✅ Datos importados exitosamente en SQLite.")
    exportar_ranking_json()

def purgar_historial(dias=21):
    """
    Política de retención: Purga registros de transacciones con más de 21 días (3 semanas).
    Mantiene la base de datos ultra compacta y de tamaño mínimo.
    """
    fecha_limite = (datetime.datetime.now() - datetime.timedelta(days=dias)).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM historial_transacciones WHERE timestamp < ?", (fecha_limite,))
        eliminados = cursor.rowcount
        conn.commit()
    print(f"🧹 Purga completada (retención: {dias} días): {eliminados} registros antiguos eliminados.")

def exportar_ranking_json():
    """Genera el archivo ranking.json a partir de los datos en SQLite para consumo frontend"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Jugadores ordenados por puntos descendente
        cursor.execute("SELECT nick, puntos FROM jugadores ORDER BY puntos DESC")
        jugadores = [{"nombre": row["nick"], "puntos": row["puntos"]} for row in cursor.fetchall()]

        # Podio Carrera
        cursor.execute("SELECT pos, nick, km, renta_diaria FROM podio_carrera ORDER BY pos ASC")
        carrera_rows = cursor.fetchall()
        podio_carrera = []
        coches = ["🏎️", "🚀", "⚡", "🏎️", "🚀"]
        for r in carrera_rows:
            podio_carrera.append({
                "pilot": r["nick"],
                "km": r["km"],
                "date": datetime.datetime.now().strftime("%d/%m"),
                "car": coches[(r["pos"] - 1) % len(coches)],
                "rent": r["renta_diaria"]
            })

        # Podio Pelea
        cursor.execute("SELECT pos, nick, score, cortes, tiempo_seg, renta_diaria FROM podio_pelea ORDER BY pos ASC")
        pelea_rows = cursor.fetchall()
        podio_pelea = []
        for r in pelea_rows:
            podio_pelea.append({
                "pilot": r["nick"],
                "score": r["score"],
                "time": r["tiempo_seg"],
                "cuts": r["cortes"],
                "date": datetime.datetime.now().strftime("%d/%m"),
                "rent": r["renta_diaria"]
            })

    # Semana del año
    semana_actual = datetime.date.today().isocalendar()[1]
    mes_actual = datetime.datetime.now().strftime("%B %Y").capitalize()

    payload = {
        "last_update": datetime.datetime.now().isoformat(),
        "semana_activa": f"Semana {semana_actual} / {mes_actual}",
        "ranking_principal": jugadores,
        "podio_carrera": podio_carrera,
        "podio_pelea": podio_pelea
    }

    with open(RANKING_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"📄 Archivo ranking.json actualizado con éxito en: {RANKING_JSON_PATH}")

def registrar_partida(nick, juego, costo=10, metricas=None):
    """
    Registra una jugada: resta puntos al jugador, guarda log y actualiza podio si corresponde.
    """
    now = datetime.datetime.now().isoformat()
    if costo is None or int(costo) <= 0:
        print(f"❌ Monto inválido en registrar_partida: {costo}")
        return False
    costo = int(costo)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT puntos, total_gastados FROM jugadores WHERE nick = ?", (nick,))
        user = cursor.fetchone()
        if not user:
            print(f"❌ Usuario {nick} no encontrado.")
            return False

        saldo_actual = user["puntos"]
        if saldo_actual < costo:
            print(f"❌ Saldo insuficiente para {nick}: tiene {saldo_actual}, requiere {costo}.")
            return False

        nuevo_saldo = saldo_actual - costo
        nuevo_gastado = user["total_gastados"] + costo

        cursor.execute("""
            UPDATE jugadores
            SET puntos = ?, total_gastados = ?, ultima_actividad = ?
            WHERE nick = ?
        """, (nuevo_saldo, nuevo_gastado, now, nick))

        cursor.execute("""
            INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (now, nick, f"JUEGO_{juego.upper()}", f"Partida en {juego}", -costo, nuevo_saldo))

        conn.commit()

    print(f"🎮 Partida registrada para {nick}: -{costo} PTS | Saldo restante: {nuevo_saldo} PTS")
    exportar_ranking_json()
    try:
        verificar_y_otorgar_medallas_automaticas(nick)
    except Exception:
        pass
    return True

def asignar_puntos(nick, puntos, tipo_evento="RETO_MACROJUEGO", descripcion="", autor="Admin"):
    """
    Acredita o descuenta puntos a un jugador por retos diarios, bonus o ajustes.
    Crea el jugador automáticamente si aún no existe.
    """
    now = datetime.datetime.now().isoformat()
    puntos = int(puntos)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT puntos, total_ganados, total_gastados FROM jugadores WHERE nick = ?", (nick,))
        user = cursor.fetchone()

        if user:
            saldo_actual = user["puntos"]
            nuevo_saldo = max(0, saldo_actual + puntos)
            nuevo_ganados = user["total_ganados"] + (puntos if puntos > 0 else 0)
            nuevo_gastados = user["total_gastados"] + (abs(puntos) if puntos < 0 else 0)

            cursor.execute("""
                UPDATE jugadores
                SET puntos = ?, total_ganados = ?, total_gastados = ?, ultima_actividad = ?
                WHERE nick = ?
            """, (nuevo_saldo, nuevo_ganados, nuevo_gastados, now, nick))
        else:
            # Crear jugador nuevo automáticamente si viene de Google Forms
            saldo_actual = 0
            nuevo_saldo = max(0, puntos)
            nuevo_ganados = puntos if puntos > 0 else 0
            nuevo_gastados = 0

            cursor.execute("""
                INSERT INTO jugadores (nick, puntos, total_ganados, total_gastados, ultima_actividad, estado)
                VALUES (?, ?, ?, ?, ?, 'Activo')
            """, (nick, nuevo_saldo, nuevo_ganados, nuevo_gastados, now))

        desc_completa = f"{descripcion} (vía {autor})" if autor else descripcion
        cursor.execute("""
            INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (now, nick, tipo_evento.upper(), desc_completa, puntos, nuevo_saldo))

        conn.commit()

    print(f"✨ [Puntos] {nick}: {'+' if puntos >= 0 else ''}{puntos} PTS | Saldo: {nuevo_saldo} PTS | Tipo: {tipo_evento}")
    exportar_ranking_json()
    return {"ok": True, "nick": nick, "puntos_asignados": puntos, "nuevo_saldo": nuevo_saldo}

def ejecutar_contraataque(nick_atacante: str, puntos_restar: int = 5, descripcion: str = "Misión Contraataque (Caparazón Azul)", autor: str = "Admin") -> dict:
    """
    Mecánica Macrojuego: Descuenta puntos a TODOS los jugadores que estén por encima del atacante.
    Regla de Blindaje Diario (Damage Cap): Ningún jugador puede perder más de 25 PTS en un solo día por sabotajes.
    """
    now = datetime.datetime.now().isoformat()
    fecha_hoy = now[:10]
    puntos_restar = abs(puntos_restar)
    afectados = []

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT puntos FROM jugadores WHERE nick = ?", (nick_atacante,))
        atacante = cursor.fetchone()
        if not atacante:
            print(f"❌ Atacante {nick_atacante} no encontrado.")
            return {"ok": False, "error": "atacante_no_encontrado"}

        puntos_atacante = atacante["puntos"]

        # Buscar todos los que tengan estrictamente más puntos que el atacante
        cursor.execute("SELECT nick, puntos, total_gastados FROM jugadores WHERE puntos > ?", (puntos_atacante,))
        superiores = cursor.fetchall()

        for s in superiores:
            victima = s["nick"]
            saldo_previo = s["puntos"]

            # 🛡️ Regla de Blindaje Diario (Damage Cap: Máximo -25 PTS diarios por sabotajes)
            cursor.execute("""
                SELECT COALESCE(SUM(ABS(variacion_pts)), 0) as total_danio_hoy
                FROM historial_transacciones
                WHERE LOWER(nick) = LOWER(?)
                  AND tipo_evento = 'SABOTAJE_CONTRAATAQUE'
                  AND date(timestamp) = date(?)
            """, (victima, fecha_hoy))
            row_danio = cursor.fetchone()
            danio_previo_hoy = row_danio["total_danio_hoy"] if row_danio else 0

            if danio_previo_hoy >= 25:
                # El jugador está blindado contra más sabotajes hoy
                continue

            descuento_real = min(puntos_restar, 25 - danio_previo_hoy)
            nuevo_saldo = max(0, saldo_previo - descuento_real)
            nuevo_gastados = s["total_gastados"] + descuento_real

            cursor.execute("""
                UPDATE jugadores
                SET puntos = ?, total_gastados = ?, ultima_actividad = ?
                WHERE nick = ?
            """, (nuevo_saldo, nuevo_gastados, now, victima))

            desc_log = f"Impactado por Contraataque de {nick_atacante}: {descripcion} (vía {autor})"
            cursor.execute("""
                INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (now, victima, "SABOTAJE_CONTRAATAQUE", desc_log, -descuento_real, nuevo_saldo))

            afectados.append({"nick": victima, "saldo_previo": saldo_previo, "nuevo_saldo": nuevo_saldo, "descuento": descuento_real})

        conn.commit()

    print(f"💥 [Contraataque] {nick_atacante} impactó a {len(afectados)} líderes (con Damage Cap máx 25 PTS).")
    exportar_ranking_json()
    return {"ok": True, "atacante": nick_atacante, "impactados": len(afectados), "detalles": afectados}

def actualizar_record_carrera(nick, km, bonus_coins=0):
    """
    Evalúa si el resultado de Circuito Black califica para el Top 3 y actualiza el podio oficial.
    """
    now = datetime.datetime.now().isoformat()
    km = float(km)
    bonus_coins = int(bonus_coins)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT pos, nick, km, bonus_coins, fecha_record FROM podio_carrera ORDER BY km DESC")
        filas = [dict(r) for r in cursor.fetchall()]

        # Buscar si el piloto ya tiene registro previo
        previo = next((f for f in filas if f["nick"].lower() == nick.lower()), None)
        if previo:
            if km <= previo["km"]:
                print(f"🏎️ {nick} no superó su récord anterior en Circuito Black ({km} KM <= {previo['km']} KM).")
                return {"ok": True, "podio": False, "pos": previo["pos"], "motivo": "no_supero_record"}
            filas.remove(previo)

        # Insertar nueva marca candidata
        filas.append({
            "nick": nick,
            "km": km,
            "bonus_coins": bonus_coins,
            "fecha_record": now
        })

        # Reordenar de mayor a menor y tomar solo el Top 3
        filas.sort(key=lambda x: x["km"], reverse=True)
        top3 = filas[:3]

        # Verificar si el piloto quedó dentro del Top 3
        posicion = None
        for i, p in enumerate(top3):
            if p["nick"].lower() == nick.lower():
                posicion = i + 1
                break

        if posicion is None:
            print(f"🏎️ {nick} ({km} KM) no logró entrar en el Top 3 de Circuito Black.")
            return {"ok": True, "podio": False, "motivo": "fuera_de_top3"}

        # Reemplazar tabla de podio con las rentas oficiales
        cursor.execute("DELETE FROM podio_carrera")
        rentas = ["+3 PTS/día", "+2 PTS/día", "+1 PTS/día"]
        for i, p in enumerate(top3):
            cursor.execute("""
                INSERT INTO podio_carrera (pos, nick, km, bonus_coins, fecha_record, renta_diaria)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (i + 1, p["nick"], p["km"], p.get("bonus_coins", 0), p.get("fecha_record", now), rentas[i]))

        # Registrar log en historial
        cursor.execute("""
            INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
            VALUES (?, ?, ?, ?, 0, (SELECT puntos FROM jugadores WHERE nick = ?))
        """, (now, nick, "NUEVO_RECORD_CARRERA", f"Récord Circuito Black: {km} KM (Puesto #{posicion} · Renta: {rentas[posicion-1]})", nick))

        conn.commit()

    print(f"🏆 ¡NUEVO PODIO CARRERA! {nick} conquistó el Puesto #{posicion} con {km} KM ({rentas[posicion-1]})")
    exportar_ranking_json()
    return {"ok": True, "podio": True, "pos": posicion, "km": km, "renta": rentas[posicion-1]}

def actualizar_record_pelea(nick, score, cortes=0, tiempo_seg=0):
    """
    Evalúa si el resultado de Cyber Ninja califica para el Top 3 y actualiza el podio oficial.
    """
    now = datetime.datetime.now().isoformat()
    score = int(score)
    cortes = int(cortes)
    tiempo_seg = int(tiempo_seg)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT pos, nick, score, cortes, tiempo_seg, fecha_record FROM podio_pelea ORDER BY score DESC")
        filas = [dict(r) for r in cursor.fetchall()]

        previo = next((f for f in filas if f["nick"].lower() == nick.lower()), None)
        if previo:
            if score <= previo["score"]:
                print(f"⚔️ {nick} no superó su récord anterior en Cyber Ninja ({score} <= {previo['score']}).")
                return {"ok": True, "podio": False, "pos": previo["pos"], "motivo": "no_supero_record"}
            filas.remove(previo)

        filas.append({
            "nick": nick,
            "score": score,
            "cortes": cortes,
            "tiempo_seg": tiempo_seg,
            "fecha_record": now
        })

        filas.sort(key=lambda x: x["score"], reverse=True)
        top3 = filas[:3]

        posicion = None
        for i, p in enumerate(top3):
            if p["nick"].lower() == nick.lower():
                posicion = i + 1
                break

        if posicion is None:
            print(f"⚔️ {nick} ({score} PTS) no logró entrar en el Top 3 de Cyber Ninja.")
            return {"ok": True, "podio": False, "motivo": "fuera_de_top3"}

        cursor.execute("DELETE FROM podio_pelea")
        rentas = ["+3 PTS/día", "+2 PTS/día", "+1 PTS/día"]
        for i, p in enumerate(top3):
            cursor.execute("""
                INSERT INTO podio_pelea (pos, nick, score, cortes, tiempo_seg, fecha_record, renta_diaria)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (i + 1, p["nick"], p["score"], p.get("cortes", 0), p.get("tiempo_seg", 0), p.get("fecha_record", now), rentas[i]))

        cursor.execute("""
            INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
            VALUES (?, ?, ?, ?, 0, (SELECT puntos FROM jugadores WHERE nick = ?))
        """, (now, nick, "NUEVO_RECORD_PELEA", f"Récord Cyber Ninja: {score} pts ({cortes} cortes, {tiempo_seg}s · #{posicion})", nick))

        conn.commit()

    print(f"🏆 ¡NUEVO PODIO PELEA! {nick} conquistó el Puesto #{posicion} con {score} pts ({rentas[posicion-1]})")
    exportar_ranking_json()
    return {"ok": True, "podio": True, "pos": posicion, "score": score, "renta": rentas[posicion-1]}

def liquidar_renta_diaria():
    """
    Mecánica Macrojuego: Cobra y abona automáticamente la renta pasiva diaria (+3, +2, +1 PTS)
    a los campeones que sostienen el Top 3 en Carrera y Pelea.
    """
    now = datetime.datetime.now().strftime("%Y-%m-%d")
    liquidaciones = {}

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Renta Podio Carrera (+3, +2, +1)
        cursor.execute("SELECT pos, nick FROM podio_carrera ORDER BY pos ASC")
        carreras = cursor.fetchall()
        valores_renta = {1: 3, 2: 2, 3: 1}
        for r in carreras:
            p = r["pos"]
            n = r["nick"]
            pts = valores_renta.get(p, 0)
            if n not in liquidaciones:
                liquidaciones[n] = {"total": 0, "detalles": []}
            liquidaciones[n]["total"] += pts
            liquidaciones[n]["detalles"].append(f"Circuito Black #{p} (+{pts} PTS)")

        # 2. Renta Podio Pelea (+3, +2, +1)
        cursor.execute("SELECT pos, nick FROM podio_pelea ORDER BY pos ASC")
        peleas = cursor.fetchall()
        for r in peleas:
            p = r["pos"]
            n = r["nick"]
            pts = valores_renta.get(p, 0)
            if n not in liquidaciones:
                liquidaciones[n] = {"total": 0, "detalles": []}
            liquidaciones[n]["total"] += pts
            liquidaciones[n]["detalles"].append(f"Cyber Ninja #{p} (+{pts} PTS)")

    # 3. Aplicar los puntos a cada beneficiario
    resultados = []
    for nick, info in liquidaciones.items():
        total_pts = info["total"]
        desc = " | ".join(info["detalles"])
        res = asignar_puntos(nick, total_pts, tipo_evento="RENTA_DIARIA_PODIO", descripcion=desc, autor="Sistema_Rentas")
        resultados.append({"nick": nick, "renta_cobrada": total_pts, "detalles": desc, "saldo": res["nuevo_saldo"]})

    print(f"💰 [Renta Pasiva Diaria] {len(resultados)} campeones cobraron su renta diaria.")
    exportar_ranking_json()
    return {"ok": True, "fecha": now, "campeones_liquidados": len(resultados), "detalles": resultados}

def ver_estado():
    """Muestra el estado actual de las tablas en SQLite"""
    with get_db() as conn:
        cursor = conn.cursor()
        print("\n" + "=" * 50)
        print("📊 ESTADO ACTUAL DE LA BASE DE DATOS SQLITE")
        print("=" * 50)

        cursor.execute("SELECT nick, puntos, total_ganados, total_gastados, estado FROM jugadores ORDER BY puntos DESC")
        print("\n🏆 RANKING JUGADORES:")
        for r in cursor.fetchall():
            print(f"  • {r['nick']:<15} | Puntos: {r['puntos']:>4} | Ganados: {r['total_ganados']:>4} | Gastados: {r['total_gastados']:>4} | Estado: {r['estado']}")

        cursor.execute("SELECT pos, nick, km, renta_diaria FROM podio_carrera ORDER BY pos ASC")
        print("\n🏎️ PODIO CIRCUITO BLACK (CARRERA):")
        for r in cursor.fetchall():
            print(f"  #{r['pos']} {r['nick']:<15} | KM: {r['km']:>6.1f} | Renta: {r['renta_diaria']}")

        cursor.execute("SELECT pos, nick, score, cortes, tiempo_seg, renta_diaria FROM podio_pelea ORDER BY pos ASC")
        print("\n⚔️ PODIO CYBER NINJA (PELEA):")
        for r in cursor.fetchall():
            print(f"  #{r['pos']} {r['nick']:<15} | Score: {r['score']:>6} | Cortes: {r['cortes']:>3} | Renta: {r['renta_diaria']}")

        cursor.execute("SELECT COUNT(*) as total FROM historial_transacciones")
        row_tx = cursor.fetchone()
        total_tx = row_tx["total"] if row_tx else 0
        print(f"\n📜 Total registros en historial: {total_tx} (Retención: 21 días / 3 semanas)")
        print("=" * 50 + "\n")

# ============================================================================
# MÓDULO DE ENCUESTAS GEEK SEMANALES
# ============================================================================

def init_encuestas_tables():
    """Inicializa las tablas de encuestas si no existen (aplica el schema completo)"""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS encuestas_catalogo (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                categoria TEXT NOT NULL,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                imagen_url TEXT,
                anio INTEGER,
                estado TEXT NOT NULL DEFAULT 'pendiente',
                fecha_agregado TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS encuestas_activas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                catalogo_id INTEGER NOT NULL,
                categoria TEXT NOT NULL,
                nombre_item TEXT NOT NULL,
                descripcion_item TEXT,
                imagen_url TEXT,
                fecha_inicio TEXT NOT NULL DEFAULT (datetime('now')),
                fecha_fin TEXT NOT NULL,
                activa INTEGER NOT NULL DEFAULT 1,
                total_votos INTEGER NOT NULL DEFAULT 0,
                promedio_score REAL NOT NULL DEFAULT 0.0,
                ganador_siguiente TEXT
            );
            CREATE TABLE IF NOT EXISTS votos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                encuesta_id INTEGER NOT NULL,
                nick TEXT NOT NULL,
                score INTEGER NOT NULL,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(encuesta_id, nick)
            );
            CREATE INDEX IF NOT EXISTS idx_catalogo_categoria ON encuestas_catalogo(categoria, estado);
            CREATE INDEX IF NOT EXISTS idx_encuestas_categoria ON encuestas_activas(categoria, activa);
            CREATE INDEX IF NOT EXISTS idx_votos_encuesta ON votos(encuesta_id);
            CREATE INDEX IF NOT EXISTS idx_votos_nick ON votos(nick);
        """)
        try:
            conn.execute("ALTER TABLE votos ADD COLUMN comentario TEXT")
        except Exception:
            pass
    print("✅ Tablas de encuestas inicializadas.")

def agregar_al_catalogo(categoria, nombre, descripcion=None, imagen_url=None, anio=None):
    """Agrega un ítem al catálogo de una categoría (usado por Lunara o admin)"""
    init_encuestas_tables()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO encuestas_catalogo (categoria, nombre, descripcion, imagen_url, anio) VALUES (?, ?, ?, ?, ?)",
            (categoria.strip().lower(), nombre.strip(), descripcion, imagen_url, anio)
        )
    exportar_encuestas_json()
    print(f"✅ '{nombre}' agregado al catálogo de [{categoria}].")
    return {"ok": True, "mensaje": f"'{nombre}' agregado a {categoria}"}

def crear_encuesta_semanal(categoria, catalogo_id=None):
    """
    Crea una nueva encuesta semanal para una categoría.
    Si no se especifica catalogo_id, elige automáticamente el primer ítem 'pendiente'.
    La encuesta dura 7 días desde ahora.
    """
    init_encuestas_tables()
    now = datetime.datetime.now(datetime.timezone.utc)
    fecha_fin = (now + datetime.timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    fecha_inicio = now.strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        # Cerrar cualquier encuesta activa anterior de la misma categoría
        conn.execute(
            "UPDATE encuestas_activas SET activa = 0 WHERE categoria = ? AND activa = 1",
            (categoria,)
        )
        # Obtener el ítem a usar
        if catalogo_id:
            item = conn.execute(
                "SELECT * FROM encuestas_catalogo WHERE id = ? AND categoria = ?",
                (catalogo_id, categoria)
            ).fetchone()
        else:
            item = conn.execute(
                "SELECT * FROM encuestas_catalogo WHERE categoria = ? AND estado = 'pendiente' ORDER BY id ASC LIMIT 1",
                (categoria,)
            ).fetchone()

        if not item:
            return {"ok": False, "error": f"No hay ítems pendientes en el catálogo de '{categoria}'"}

        # Crear la encuesta
        conn.execute(
            """INSERT INTO encuestas_activas
               (catalogo_id, categoria, nombre_item, descripcion_item, imagen_url, fecha_inicio, fecha_fin)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (item["id"], categoria, item["nombre"], item["descripcion"], item["imagen_url"],
             fecha_inicio, fecha_fin)
        )
        # Marcar el ítem como en votación
        conn.execute(
            "UPDATE encuestas_catalogo SET estado = 'en_votacion' WHERE id = ?",
            (item["id"],)
        )

    exportar_encuestas_json()
    print(f"✅ Encuesta semanal creada: [{categoria}] → '{item['nombre']}' (hasta {fecha_fin})")
    return {"ok": True, "categoria": categoria, "nombre": item["nombre"], "fecha_fin": fecha_fin}

def registrar_voto(encuesta_id, nick, score, comentario=None):
    """
    Registra el voto de un miembro (1-10) con comentario/justificación opcional. Solo un voto por encuesta por nick.
    Otorga automáticamente +1 PTS al votante como incentivo.
    Retorna {"ok": True/False, "error": str o None, "nuevo_promedio": float}
    """
    init_encuestas_tables()
    score = int(score)
    if score < 1 or score > 10:
        return {"ok": False, "error": "El score debe estar entre 1 y 10"}

    nick = nick.strip()
    comentario = str(comentario).strip() if comentario else None
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        # Verificar que la encuesta existe y está activa
        enc = conn.execute(
            "SELECT * FROM encuestas_activas WHERE id = ? AND activa = 1",
            (encuesta_id,)
        ).fetchone()
        if not enc:
            return {"ok": False, "error": "Encuesta no encontrada o cerrada"}

        # Verificar que no haya votado ya
        ya_voto = conn.execute(
            "SELECT id FROM votos WHERE encuesta_id = ? AND nick = ?",
            (encuesta_id, nick)
        ).fetchone()
        if ya_voto:
            return {"ok": False, "error": "Ya votaste en esta encuesta"}

        # Registrar el voto con comentario
        conn.execute(
            "INSERT INTO votos (encuesta_id, nick, score, comentario, timestamp) VALUES (?, ?, ?, ?, ?)",
            (encuesta_id, nick, score, comentario, now)
        )

        # Recalcular promedio y total
        stats = conn.execute(
            "SELECT COUNT(*) as total, AVG(score) as promedio FROM votos WHERE encuesta_id = ?",
            (encuesta_id,)
        ).fetchone()
        total = stats["total"] if stats else 0
        promedio = round(stats["promedio"], 2) if (stats and stats["promedio"]) else 0.0

        conn.execute(
            "UPDATE encuestas_activas SET total_votos = ?, promedio_score = ? WHERE id = ?",
            (total, promedio, encuesta_id)
        )

    # Dar +1 PTS al miembro por votar (incentivo de participación)
    asignar_puntos(nick, 1, "VOTO_ENCUESTA", f"Voto en encuesta '{enc['nombre_item']}' ({score}/10)", "Sistema")
    try:
        verificar_y_otorgar_medallas_automaticas(nick)
    except Exception:
        pass

    exportar_encuestas_json()
    print(f"✅ Voto registrado: {nick} → {score}/10 en '{enc['nombre_item']}' | Promedio: {promedio}/10")
    return {"ok": True, "nuevo_promedio": promedio, "total_votos": total, "pts_otorgados": 1}

def obtener_votos_encuesta(encuesta_id):
    """Retorna la lista de votos de una encuesta (nick, score, comentario, timestamp)"""
    init_encuestas_tables()
    with get_db() as conn:
        votos = conn.execute(
            "SELECT nick, score, comentario, timestamp FROM votos WHERE encuesta_id = ? ORDER BY timestamp DESC",
            (encuesta_id,)
        ).fetchall()
        return [dict(v) for v in votos]

def obtener_encuestas_activas():
    """Retorna todas las encuestas activas con su estado actual"""
    init_encuestas_tables()
    with get_db() as conn:
        encuestas = conn.execute(
            "SELECT * FROM encuestas_activas WHERE activa = 1 ORDER BY categoria ASC"
        ).fetchall()
        resultado = []
        for e in encuestas:
            d = dict(e)
            d["votos_detalle"] = obtener_votos_encuesta(e["id"])
            resultado.append(d)
        return resultado

def obtener_ranking_categoria(categoria, limite=20):
    """Retorna el ranking histórico de una categoría (ítems votados por promedio)"""
    init_encuestas_tables()
    with get_db() as conn:
        rows = conn.execute(
            """SELECT ea.nombre_item, ea.promedio_score, ea.total_votos, ea.fecha_fin,
                      ec.descripcion, ec.anio, ec.imagen_url
               FROM encuestas_activas ea
               LEFT JOIN encuestas_catalogo ec ON ea.catalogo_id = ec.id
               WHERE ea.categoria = ? AND ea.total_votos > 0
               ORDER BY ea.promedio_score DESC, ea.total_votos DESC
               LIMIT ?""",
            (categoria, limite)
        ).fetchall()
        return [dict(r) for r in rows]

def exportar_encuestas_json():
    """Genera encuestas.json con el estado completo para consumo del frontend"""
    init_encuestas_tables()
    encuestas_json_path = os.path.join(PROJECT_ROOT, "encuestas.json")

    with get_db() as conn:
        # Encuestas activas con detalle de votos
        activas_raw = conn.execute(
            "SELECT * FROM encuestas_activas WHERE activa = 1 ORDER BY categoria ASC"
        ).fetchall()
        activas = []
        for e in activas_raw:
            d = dict(e)
            votos_list = conn.execute(
                "SELECT nick, score, comentario, timestamp FROM votos WHERE encuesta_id = ? ORDER BY timestamp DESC",
                (e["id"],)
            ).fetchall()
            d["votos"] = [dict(v) for v in votos_list]
            activas.append(d)

        # Rankings por categoría (historial)
        cats = conn.execute(
            "SELECT DISTINCT categoria FROM encuestas_activas WHERE total_votos > 0"
        ).fetchall()
        rankings = {}
        for cat in cats:
            c = cat["categoria"]
            rows = conn.execute(
                """SELECT ea.nombre_item, ea.promedio_score, ea.total_votos, ea.fecha_fin,
                          ec.descripcion, ec.anio, ec.imagen_url
                   FROM encuestas_activas ea
                   LEFT JOIN encuestas_catalogo ec ON ea.catalogo_id = ec.id
                   WHERE ea.categoria = ? AND ea.total_votos > 0
                   ORDER BY ea.promedio_score DESC, ea.total_votos DESC LIMIT 50""",
                (c,)
            ).fetchall()
            rankings[c] = [dict(r) for r in rows]

        # Catálogos completos por categoría
        catalogos_raw = conn.execute(
            "SELECT * FROM encuestas_catalogo ORDER BY categoria ASC, id ASC"
        ).fetchall()
        catalogos = {}
        for row in catalogos_raw:
            d = dict(row)
            cat = d["categoria"]
            if cat not in catalogos:
                catalogos[cat] = []
            catalogos[cat].append(d)

    payload = {
        "generado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "encuestas_activas": activas,
        "rankings": rankings,
        "catalogos": catalogos
    }

    with open(encuestas_json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"✅ encuestas.json exportado con {len(activas)} encuesta(s) activa(s).")
    return payload

def poblar_catalogo_demo():
    """Carga datos de demostración para todas las categorías (solo para pruebas locales)"""
    init_encuestas_tables()
    demo_data = {
        "juegos_mesa": [
            ("Catan", "El clásico juego de colonización e intercambio de recursos.", None, 1995),
            ("Pandemic", "Cooperativo: salva al mundo de enfermedades letales.", None, 2008),
            ("Ticket to Ride", "Construye rutas ferroviarias en el mapa.", None, 2004),
            ("Azul", "Coloca azulejos en patrones estratégicos.", None, 2017),
            ("Wingspan", "Atrae aves a tu reserva de vida silvestre.", None, 2019),
            ("Dominion", "Deckbuilder pionero de construcción de mazos.", None, 2008),
            ("7 Wonders", "Civileiza tu mundo antiguo en 3 eras.", None, 2010),
            ("Gloomhaven", "RPG de mazmorra cooperativo épico.", None, 2017),
        ],
        "peliculas": [
            ("Inception", "Un ladrón que roba secretos dentro de los sueños.", None, 2010),
            ("Interstellar", "Viaje a través del espacio-tiempo para salvar la humanidad.", None, 2014),
            ("The Matrix", "Un programador descubre la verdad sobre su realidad.", None, 1999),
            ("Avengers: Endgame", "La conclusión épica del universo Marvel.", None, 2019),
            ("Blade Runner 2049", "Un cazarrecompensas descubre un secreto que podría hundir la sociedad.", None, 2017),
            ("Everything Everywhere All at Once", "Multiverso de posibilidades y lavandería.", None, 2022),
        ],
        "series": [
            ("Breaking Bad", "Un profesor de química se convierte en narco-jefe.", None, 2008),
            ("Stranger Things", "Niños vs. criaturas del Lado del Revés.", None, 2016),
            ("The Last of Us", "Supervivencia post-apocalíptica con zombies fúngicos.", None, 2023),
            ("Severance", "Empleados separan quirúrgicamente sus memorias.", None, 2022),
            ("Dark", "Bucles temporales en un pueblo alemán.", None, 2017),
            ("House of the Dragon", "La caída de los Targaryen.", None, 2022),
        ],
        "videojuegos": [
            ("Elden Ring", "RPG de acción en un vasto mundo abierto oscuro.", None, 2022),
            ("The Legend of Zelda: TOTK", "Aventura épica en Hyrule con físicas absurdas.", None, 2023),
            ("Baldur's Gate 3", "RPG por turnos con libertad casi infinita.", None, 2023),
            ("Hollow Knight", "Metroidvania de insectos y lore profundo.", None, 2017),
            ("Hades", "Roguelite del inframundo con narrativa increíble.", None, 2020),
            ("Celeste", "Plataformero sobre escalar montañas y superar ansiedades.", None, 2018),
        ],
        "musica": [
            ("Bohemian Rhapsody - Queen", "La ópera rock más icónica de todos los tiempos.", None, 1975),
            ("Thriller - Michael Jackson", "El álbum más vendido de la historia.", None, 1982),
            ("Dark Side of the Moon - Pink Floyd", "Psicodelia progresiva atemporal.", None, 1973),
            ("Kind of Blue - Miles Davis", "El álbum de jazz más influyente.", None, 1959),
            ("OK Computer - Radiohead", "Distopía musical de los 90.", None, 1997),
        ],
        "anime": [
            ("Fullmetal Alchemist: Brotherhood", "Dos hermanos buscan la Piedra Filosofal.", None, 2009),
            ("Attack on Titan", "La humanidad vs titanes devoradores.", None, 2013),
            ("Steins;Gate", "Viajes en el tiempo y consecuencias devastadoras.", None, 2011),
            ("Hunter x Hunter", "Un niño busca a su padre legendario.", None, 2011),
            ("Neon Genesis Evangelion", "Mechas, psicología y apocalipsis.", None, 1995),
        ],
        "comics_manga": [
            ("Berserk", "El caballero de la espada enorme en un mundo oscuro.", None, 1989),
            ("Watchmen", "Superhéroes decadentes en la Guerra Fría.", None, 1986),
            ("Saga of the Swamp Thing", "Horror ecológico de Alan Moore.", None, 1984),
            ("One Piece", "La búsqueda del tesoro más grande del mundo.", None, 1997),
            ("Vinland Saga", "Vikingos, filosofía pacifista y guerra.", None, 2005),
        ],
        "libros": [
            ("Dune - Frank Herbert", "La política y ecología de un planeta desértico.", None, 1965),
            ("Foundation - Isaac Asimov", "Un matemático prevé la caída del Imperio Galáctico.", None, 1951),
            ("1984 - George Orwell", "Distopía totalitaria y vigilancia absoluta.", None, 1949),
            ("Neuromancer - William Gibson", "El nacimiento del cyberpunk.", None, 1984),
            ("The Hitchhiker's Guide to the Galaxy", "El absurdo y la irreverencia del cosmos.", None, 1979),
        ],
    }

    print("🌱 Poblando catálogo de demostración...")
    for categoria, items in demo_data.items():
        for nombre, desc, img, anio in items:
            with get_db() as conn:
                existe = conn.execute(
                    "SELECT id FROM encuestas_catalogo WHERE categoria = ? AND nombre = ?",
                    (categoria, nombre)
                ).fetchone()
                if not existe:
                    conn.execute(
                        "INSERT INTO encuestas_catalogo (categoria, nombre, descripcion, imagen_url, anio) VALUES (?, ?, ?, ?, ?)",
                        (categoria, nombre, desc, img, anio)
                    )
    exportar_encuestas_json()
    print("✅ Catálogo demo cargado exitosamente.")

def crear_encuestas_semana_demo():
    """Crea una encuesta activa de cada categoría para demostración"""
    categorias = ["juegos_mesa", "peliculas", "series", "videojuegos", "musica", "anime", "comics_manga", "libros"]
    for cat in categorias:
        resultado = crear_encuesta_semanal(cat)
        if resultado.get("ok"):
            print(f"  🗳️  [{cat}] → '{resultado['nombre']}'")
        else:
            print(f"  ⚠️  [{cat}] → {resultado.get('error', 'sin ítems')}")

# =============================================================================
# MÓDULO DE JUNTAS Y PARTIDAS COMUNITARIAS (TURSO / LIBSQL)
# =============================================================================

def obtener_juntas(solo_activas=False, ocultar_pii=True):
    """Devuelve la lista de juntas con todos sus participantes anotados.
    Por defecto oculta teléfonos de WhatsApp para evitar raspado de PII (SEC-02)."""
    with get_db() as conn:
        query = "SELECT * FROM juntas "
        if solo_activas:
            query += "WHERE estado = 'Abierta' "
        query += "ORDER BY CASE estado WHEN 'Abierta' THEN 1 WHEN 'Completada' THEN 2 ELSE 3 END, id DESC"
        
        juntas_rows = conn.execute(query).fetchall()
        resultado = []
        for j in juntas_rows:
            item = dict(j)
            if ocultar_pii:
                item["organizador_whatsapp"] = None

            campos_anotados = "nick, es_anfitrion, fecha_registro" if ocultar_pii else "nick, whatsapp, es_anfitrion, fecha_registro"
            anotados_rows = conn.execute(
                f"SELECT {campos_anotados} FROM juntas_anotados WHERE junta_id = ? ORDER BY es_anfitrion DESC, id ASC",
                (item["id"],)
            ).fetchall()
            item["anotados"] = [dict(a) for a in anotados_rows]
            resultado.append(item)
        return resultado

def exportar_juntas_json():
    """Exporta todas las juntas y sus anotados a juntas.json para compatibilidad y fallback en frontend (sin PII)"""
    try:
        juntas = obtener_juntas(solo_activas=False, ocultar_pii=True)
        payload = {
            "ok": True,
            "generado": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "juntas": juntas
        }
        with open(JUNTAS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return payload
    except Exception as e:
        print(f"⚠️ Error al exportar juntas.json: {e}")
        return {"ok": False, "error": str(e)}

def crear_junta(juego, fecha, hora, lugar, comuna_sector, cupos_totales, organizador_nick, organizador_whatsapp, descripcion_notas=""):
    """Crea una nueva junta y anota al organizador como anfitrión"""
    try:
        cupos_totales = max(2, min(12, int(cupos_totales)))
    except (ValueError, TypeError):
        cupos_totales = 4
    cupos_disp = cupos_totales - 1
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO juntas (juego, fecha, hora, lugar, comuna_sector, cupos_totales, cupos_disponibles, organizador_nick, organizador_whatsapp, descripcion_notas, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Abierta')
        """, (juego, fecha, hora, lugar, comuna_sector, cupos_totales, cupos_disp, organizador_nick, organizador_whatsapp, descripcion_notas))
        junta_id = cursor.lastrowid
        cursor.execute("""
            INSERT INTO juntas_anotados (junta_id, nick, whatsapp, es_anfitrion)
            VALUES (?, ?, ?, 1)
        """, (junta_id, organizador_nick, organizador_whatsapp))
        conn.commit()
        exportar_juntas_json()
        return {"ok": True, "id": junta_id, "juego": juego, "cupos_disponibles": cupos_disp}

def unirse_a_junta(junta_id, nick, whatsapp=""):
    """Anota atómicamente a un usuario a una junta con bloqueo inmediato de transacción"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE")
        junta = cursor.execute("SELECT * FROM juntas WHERE id = ?", (junta_id,)).fetchone()
        if not junta:
            return {"ok": False, "error": "Mesa no encontrada"}
        if junta["estado"] != "Abierta":
            return {"ok": False, "error": f"La mesa no está abierta (Estado: {junta['estado']})"}
        if junta["cupos_disponibles"] <= 0:
            return {"ok": False, "error": "No quedan cupos disponibles en esta mesa"}
        
        # Validar si ya está anotado
        ya_anotado = cursor.execute(
            "SELECT id FROM juntas_anotados WHERE junta_id = ? AND LOWER(nick) = LOWER(?)",
            (junta_id, nick)
        ).fetchone()
        if ya_anotado:
            return {"ok": False, "error": "Ya estás anotado en esta mesa"}

        cursor.execute("""
            INSERT INTO juntas_anotados (junta_id, nick, whatsapp, es_anfitrion)
            VALUES (?, ?, ?, 0)
        """, (junta_id, nick, whatsapp))
        
        nuevos_cupos = junta["cupos_disponibles"] - 1
        nuevo_estado = "Completada" if nuevos_cupos == 0 else "Abierta"
        
        cursor.execute("""
            UPDATE juntas SET cupos_disponibles = ?, estado = ? WHERE id = ?
        """, (nuevos_cupos, nuevo_estado, junta_id))
        conn.commit()
        exportar_juntas_json()
        return {"ok": True, "junta_id": junta_id, "cupos_disponibles": nuevos_cupos, "estado": nuevo_estado}

def bajarse_de_junta(junta_id, nick):
    """Elimina al usuario de una junta y libera el cupo con bloqueo de transacción"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("BEGIN IMMEDIATE")
        anotado = cursor.execute(
            "SELECT id, es_anfitrion FROM juntas_anotados WHERE junta_id = ? AND LOWER(nick) = LOWER(?)",
            (junta_id, nick)
        ).fetchone()
        if not anotado:
            return {"ok": False, "error": "No estás anotado en esta mesa"}
        if anotado["es_anfitrion"]:
            return {"ok": False, "error": "El anfitrión no puede bajarse de la mesa. Puedes cancelar la junta si no se realizará."}

        cursor.execute("DELETE FROM juntas_anotados WHERE id = ?", (anotado["id"],))
        
        junta = cursor.execute("SELECT cupos_disponibles, cupos_totales FROM juntas WHERE id = ?", (junta_id,)).fetchone()
        if not junta:
            return {"ok": False, "error": "Junta no encontrada"}
        nuevos_cupos = min(junta["cupos_totales"] - 1, junta["cupos_disponibles"] + 1)
        
        cursor.execute("""
            UPDATE juntas SET cupos_disponibles = ?, estado = 'Abierta' WHERE id = ?
        """, (nuevos_cupos, junta_id))
        conn.commit()
        exportar_juntas_json()
        return {"ok": True, "junta_id": junta_id, "cupos_disponibles": nuevos_cupos, "estado": "Abierta"}

def cancelar_junta(junta_id, solicitante_nick, es_admin=False):
    """Cancela una junta (solo organizador o admin)"""
    with get_db() as conn:
        cursor = conn.cursor()
        junta = cursor.execute("SELECT * FROM juntas WHERE id = ?", (junta_id,)).fetchone()
        if not junta:
            return {"ok": False, "error": "Mesa no encontrada"}
        if not es_admin and junta["organizador_nick"].lower() != solicitante_nick.lower() and solicitante_nick.lower() not in ["black", "admin"]:
            return {"ok": False, "error": "Solo el organizador o el administrador pueden cancelar esta mesa"}
        
        cursor.execute("UPDATE juntas SET estado = 'Cancelada' WHERE id = ?", (junta_id,))
        conn.commit()
        exportar_juntas_json()
        return {"ok": True, "junta_id": junta_id, "estado": "Cancelada"}

# =============================================================================
# MÓDULO DE PRESENCIA ONLINE Y PERFILES
# =============================================================================

PRESENCIA_TIMEOUT_SEG = 120  # 2 minutos: si no hay heartbeat, se considera offline

def heartbeat(nick, pagina="inicio", avatar_url=None):
    """Registra o actualiza la presencia de un usuario. Llama cada 30s desde el frontend."""
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with get_db() as conn:
        # Obtener avatar_url guardado en perfil si no se pasa uno nuevo
        if avatar_url is None:
            perfil = conn.execute("SELECT avatar_url FROM perfiles WHERE LOWER(nick) = LOWER(?)", (nick,)).fetchone()
            if perfil:
                avatar_url = perfil["avatar_url"]
        conn.execute("""
            INSERT INTO presencia_online (nick, ultima_vez, pagina, avatar_url)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(nick) DO UPDATE SET
                ultima_vez = excluded.ultima_vez,
                pagina = excluded.pagina,
                avatar_url = COALESCE(excluded.avatar_url, presencia_online.avatar_url)
        """, (nick, now, pagina, avatar_url))
        conn.commit()
    return {"ok": True, "nick": nick, "pagina": pagina, "ultima_vez": now}

def obtener_online():
    """Devuelve todos los usuarios activos en los últimos 2 minutos."""
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds=PRESENCIA_TIMEOUT_SEG)).strftime("%Y-%m-%dT%H:%M:%SZ")
    with get_db() as conn:
        rows = conn.execute("""
            SELECT nick, ultima_vez, pagina, avatar_url
            FROM presencia_online
            WHERE ultima_vez >= ?
            ORDER BY ultima_vez DESC
        """, (cutoff,)).fetchall()
    return [dict(r) for r in rows]

def limpiar_presencia_antigua():
    """Elimina registros de presencia con más de 5 minutos de antigüedad."""
    cutoff = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")
    with get_db() as conn:
        conn.execute("DELETE FROM presencia_online WHERE ultima_vez < ?", (cutoff,))
        conn.commit()

def guardar_avatar(nick, avatar_url):
    """Guarda o actualiza la URL del avatar del usuario en su perfil."""
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with get_db() as conn:
        conn.execute("""
            INSERT INTO perfiles (nick, avatar_url, fecha_actualizacion)
            VALUES (?, ?, ?)
            ON CONFLICT(nick) DO UPDATE SET
                avatar_url = excluded.avatar_url,
                fecha_actualizacion = excluded.fecha_actualizacion
        """, (nick, avatar_url, now))
        # Actualizar también en presencia_online si está activo
        conn.execute("""
            UPDATE presencia_online SET avatar_url = ? WHERE LOWER(nick) = LOWER(?)
        """, (avatar_url, nick))
        conn.commit()
    return {"ok": True, "nick": nick, "avatar_url": avatar_url}

def obtener_perfil(nick):
    """Obtiene el perfil completo de un usuario."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM perfiles WHERE LOWER(nick) = LOWER(?)", (nick,)).fetchone()
    return dict(row) if row else {"nick": nick, "avatar_url": None}

# =============================================================================
# MÓDULO DE CUMPLEAÑOS (HUB NATIVO DE MIEMBRO — PASO 2)
# Sustituye el formulario externo de Google Forms.
# Almacena día/mes normalizados con borrado en cascada al eliminar un jugador.
# =============================================================================

CUMPLEANOS_JSON_PATH = os.path.join(PROJECT_ROOT, "cumpleanos.json")

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

def guardar_cumpleanos(nick, dia, mes, saludo_publico=True):
    """
    Guarda o actualiza la fecha de cumpleaños de un miembro.
    - nick: str — identificador único del miembro.
    - dia: int — 1 a 31.
    - mes: int — 1 a 12.
    - saludo_publico: bool — True: aparece en la web. False: solo para admin.
    Retorna: { "ok": bool, "mensaje": str }
    """
    if not (1 <= dia <= 31) or not (1 <= mes <= 12):
        return {"ok": False, "error": "Día o mes fuera de rango válido (dia: 1-31, mes: 1-12)"}

    now = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    saludo_int = 1 if saludo_publico else 0

    with get_db() as conn:
        # Verificar que el nick existe como jugador activo
        jugador = conn.execute(
            "SELECT nick FROM jugadores WHERE LOWER(nick) = LOWER(?)", (nick,)
        ).fetchone()
        if not jugador:
            return {"ok": False, "error": f"El nick '{nick}' no está registrado como miembro activo."}

        conn.execute("""
            INSERT INTO cumpleanos (nick, dia, mes, saludo_publico, fecha_actualizacion)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(nick) DO UPDATE SET
                dia = excluded.dia,
                mes = excluded.mes,
                saludo_publico = excluded.saludo_publico,
                fecha_actualizacion = excluded.fecha_actualizacion
        """, (jugador["nick"], dia, mes, saludo_int, now))
        conn.commit()

    nombre_mes = MESES_ES.get(mes, str(mes))
    print(f"✅ [Cumpleaños] Guardado: {nick} → {dia} de {nombre_mes} (público: {saludo_publico})")
    return {
        "ok": True,
        "mensaje": f"¡Cumpleaños guardado! {dia} de {nombre_mes}.",
        "nick": jugador["nick"],
        "dia": dia,
        "mes": mes,
        "mes_nombre": nombre_mes,
        "saludo_publico": saludo_publico
    }


def obtener_cumpleanos_hoy():
    """
    Retorna lista de nicks cuyo cumpleaños es hoy (día y mes del sistema).
    Solo los que tienen saludo_publico = 1.
    """
    hoy = datetime.datetime.now()
    with get_db() as conn:
        rows = conn.execute("""
            SELECT nick, dia, mes FROM cumpleanos
            WHERE mes = ? AND dia = ? AND saludo_publico = 1
            ORDER BY nick ASC
        """, (hoy.month, hoy.day)).fetchall()
    resultado = [dict(r) for r in rows]
    for r in resultado:
        r["mes_nombre"] = MESES_ES.get(r["mes"], str(r["mes"]))
    return resultado


def obtener_cumpleanos_mes(mes=None):
    """
    Retorna todos los cumpleaños públicos del mes indicado (default: mes actual).
    Ordenados por día ascendente.
    """
    if mes is None:
        mes = datetime.datetime.now().month
    mes = max(1, min(12, int(mes)))
    with get_db() as conn:
        rows = conn.execute("""
            SELECT nick, dia, mes FROM cumpleanos
            WHERE mes = ? AND saludo_publico = 1
            ORDER BY dia ASC
        """, (mes,)).fetchall()
    resultado = [dict(r) for r in rows]
    for r in resultado:
        r["mes_nombre"] = MESES_ES.get(r["mes"], str(r["mes"]))
    return resultado


def borrar_cumpleanos(nick):
    """
    Elimina el registro de cumpleaños de un miembro (por solicitud propia).
    """
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM cumpleanos WHERE LOWER(nick) = LOWER(?)", (nick,)
        )
        eliminado = cur.rowcount > 0
        conn.commit()

    if eliminado:
        print(f"🗑️ [Cumpleaños] Registro eliminado: {nick}")
        return {"ok": True, "mensaje": f"Cumpleaños de '{nick}' eliminado correctamente."}
    else:
        return {"ok": False, "error": f"No se encontró registro de cumpleaños para '{nick}'."}


def exportar_cumpleanos_json():
    """
    Genera cumpleanos.json con todos los cumpleaños públicos ordenados por mes y día.
    NO incluye emails, teléfonos ni años de nacimiento.
    Se sobrescribe cada vez que se llama (proceso idempotente).
    """
    hoy = datetime.datetime.now()
    with get_db() as conn:
        rows = conn.execute("""
            SELECT nick, dia, mes FROM cumpleanos
            WHERE saludo_publico = 1
            ORDER BY mes ASC, dia ASC
        """).fetchall()

    filas = []
    for r in rows:
        filas.append({
            "nick": r["nick"],
            "dia": r["dia"],
            "mes": r["mes"],
            "mes_nombre": MESES_ES.get(r["mes"], str(r["mes"]))
        })

    payload = {
        "cumpleanos": filas,
        "total": len(filas),
        "generado": hoy.strftime("%Y-%m-%dT%H:%M:%S")
    }

    with open(CUMPLEANOS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"✅ [Cumpleaños] cumpleanos.json exportado con {len(filas)} registros.")
    return {"ok": True, "total": len(filas), "archivo": CUMPLEANOS_JSON_PATH}


def obtener_mi_cumpleanos(nick):
    """
    Retorna el cumpleaños registrado de un miembro (para mostrar en su perfil).
    """
    with get_db() as conn:
        row = conn.execute(
            "SELECT nick, dia, mes, saludo_publico FROM cumpleanos WHERE LOWER(nick) = LOWER(?)",
            (nick,)
        ).fetchone()
    if not row:
        return {"ok": False, "registrado": False, "nick": nick}
    return {
        "ok": True,
        "registrado": True,
        "nick": row["nick"],
        "dia": row["dia"],
        "mes": row["mes"],
        "mes_nombre": MESES_ES.get(row["mes"], str(row["mes"])),
        "saludo_publico": bool(row["saludo_publico"])
    }

# =============================================================================
# MÓDULO DE MERCADO JUGÓN NATIVO (HUB NATIVO — PASO 6)
# Sustituye el formulario externo de Google Forms.
# Soporta auto-expiración a 7 días, marcar como vendido y exportación a mercado.json.
# =============================================================================

MERCADO_JSON_PATH = os.path.join(PROJECT_ROOT, "mercado.json")

MERCADO_CATEGORIAS = {
    "vender": "Vender",
    "intercambiar": "Intercambiar",
    "regalar": "Regalar",
    "buscar": "Buscar",
    "ensenar": "Enseñar",
    "enseñar": "Enseñar",
    "servicios": "Servicios"
}

def formatear_precio_clp(precio):
    """Formatea un número o texto a formato moneda CLP: '$ 15.000'"""
    if precio is None or str(precio).strip() == "":
        return "A convenir"
    limpio = re.sub(r"[^\d]", "", str(precio))
    if not limpio:
        return str(precio).strip()
    try:
        val = int(limpio)
        if val == 0:
            return "Gratis"
        return f"$ {val:,}".replace(",", ".")
    except (ValueError, TypeError):
        return str(precio).strip()

def publicar_en_mercado(nick, categoria, titulo, estado_producto="Nuevo", descripcion="",
                         foto_url="", precio_clp=0, disponibles=1, contacto_instagram="", dias_vigencia=7):
    """
    Crea una nueva publicación en el Mercado Jugón.
    - dias_vigencia: default 7 días.
    Retorna { ok: True, id: int, ... }
    """
    nick = str(nick).strip()
    titulo = str(titulo).strip()
    cat_key = str(categoria).strip().lower().replace("ñ", "n")
    categoria_oficial = MERCADO_CATEGORIAS.get(cat_key, "Vender")

    if not nick or not titulo:
        return {"ok": False, "error": "Nick y título son obligatorios."}

    precio_txt = formatear_precio_clp(precio_clp)
    try:
        precio_num = int(re.sub(r"[^\d]", "", str(precio_clp))) if re.sub(r"[^\d]", "", str(precio_clp)) else 0
    except (ValueError, TypeError):
        precio_num = 0

    try:
        disp_num = max(0, int(disponibles))
    except (ValueError, TypeError):
        disp_num = 1

    ahora = datetime.datetime.now()
    expiracion = ahora + datetime.timedelta(days=dias_vigencia)
    now_str = ahora.strftime("%Y-%m-%dT%H:%M:%S")
    exp_str = expiracion.strftime("%Y-%m-%dT%H:%M:%S")

    with get_db() as conn:
        # Asegurar nick en tabla jugadores
        conn.execute("INSERT OR IGNORE INTO jugadores (nick, puntos, estado) VALUES (?, 0, 'Activo')", (nick,))

        cur = conn.cursor()
        cur.execute("""
            INSERT INTO mercado_publicaciones
            (nick, categoria, titulo, estado_producto, descripcion, foto_url, precio_clp, precio_formateado, disponibles, contacto_instagram, vendido, fecha_publicacion, fecha_expiracion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        """, (nick, categoria_oficial, titulo, estado_producto, descripcion, foto_url, precio_num, precio_txt, disp_num, contacto_instagram, now_str, exp_str))
        pub_id = cur.lastrowid
        conn.commit()

    print(f"🛍️ [Mercado] Nueva publicación #{pub_id}: '{titulo}' por {nick} ({categoria_oficial})")
    exportar_mercado_json()

    return {
        "ok": True,
        "id": pub_id,
        "mensaje": f"Publicación #{pub_id} registrada con éxito. Vigencia: 7 días.",
        "titulo": titulo,
        "categoria": categoria_oficial,
        "precio": precio_txt,
        "expira": exp_str
    }

def marcar_producto_vendido(publicacion_id, nick):
    """
    Marca una publicación como vendida (solo el creador o admin).
    """
    with get_db() as conn:
        cur = conn.cursor()
        pub = cur.execute("SELECT * FROM mercado_publicaciones WHERE id = ?", (publicacion_id,)).fetchone()
        if not pub:
            return {"ok": False, "error": f"Publicación #{publicacion_id} no encontrada."}

        if pub["nick"].lower() != nick.lower() and nick.lower() not in ["black", "admin"]:
            return {"ok": False, "error": "Solo el creador de la publicación puede marcarla como vendida."}

        cur.execute("UPDATE mercado_publicaciones SET vendido = 1 WHERE id = ?", (publicacion_id,))
        conn.commit()

    print(f"✅ [Mercado] Publicación #{publicacion_id} marcada como VENDIDA por {nick}.")
    exportar_mercado_json()
    return {"ok": True, "id": publicacion_id, "mensaje": "Producto marcado como vendido."}

def eliminar_publicacion_mercado(publicacion_id, nick):
    """
    Elimina permanentemente una publicación del mercado.
    """
    with get_db() as conn:
        cur = conn.cursor()
        pub = cur.execute("SELECT * FROM mercado_publicaciones WHERE id = ?", (publicacion_id,)).fetchone()
        if not pub:
            return {"ok": False, "error": f"Publicación #{publicacion_id} no encontrada."}

        if pub["nick"].lower() != nick.lower() and nick.lower() not in ["black", "admin"]:
            return {"ok": False, "error": "Solo el creador o un administrador pueden eliminar esta publicación."}

        cur.execute("DELETE FROM mercado_publicaciones WHERE id = ?", (publicacion_id,))
        conn.commit()

    print(f"🗑️ [Mercado] Publicación #{publicacion_id} eliminada por {nick}.")
    exportar_mercado_json()
    return {"ok": True, "id": publicacion_id, "mensaje": "Publicación eliminada correctamente."}

def obtener_mis_publicaciones_mercado(nick):
    """
    Retorna todas las publicaciones activas y recientes del usuario autenticado.
    """
    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, nick, categoria, titulo, estado_producto, descripcion, foto_url,
                   precio_formateado as precio, disponibles, contacto_instagram,
                   vendido, fecha_publicacion, fecha_expiracion
            FROM mercado_publicaciones
            WHERE LOWER(nick) = LOWER(?)
            ORDER BY id DESC
        """, (nick,)).fetchall()
    return [dict(r) for r in rows]

def exportar_mercado_json():
    """
    Compila mercado.json con las publicaciones activas (< 7 días y no vendidas),
    organizadas por categoría en el formato oficial esperado por el frontend.
    Purga o excluye automáticamente registros vencidos.
    """
    hoy_str = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    categorias_dict = {
        "vender": [],
        "intercambiar": [],
        "regalar": [],
        "buscar": [],
        "ensenar": [],
        "servicios": []
    }

    with get_db() as conn:
        rows = conn.execute("""
            SELECT id, nick, categoria, titulo, estado_producto, descripcion, foto_url,
                   precio_formateado, disponibles, contacto_instagram,
                   fecha_publicacion, fecha_expiracion
            FROM mercado_publicaciones
            WHERE vendido = 0 AND fecha_expiracion >= ?
            ORDER BY id DESC
        """, (hoy_str,)).fetchall()

    for r in rows:
        cat_raw = r["categoria"].lower().replace("ñ", "n")
        key = cat_raw if cat_raw in categorias_dict else "vender"
        item = {
            "id": r["id"],
            "timestamp": r["fecha_publicacion"],
            "nick": r["nick"],
            "categoria": r["categoria"],
            "titulo": r["titulo"],
            "estado": r["estado_producto"],
            "descripcion": r["descripcion"] or "",
            "foto": r["foto_url"] or "",
            "precio": r["precio_formateado"] or "A convenir",
            "contacto": r["contacto_instagram"] or r["nick"],
            "exp": r["fecha_expiracion"],
            "disponibles": r["disponibles"]
        }
        categorias_dict[key].append(item)

    total_activas = sum(len(v) for v in categorias_dict.values())
    payload = {
        "last_update": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
        "total_activas": total_activas,
        "mercado": categorias_dict
    }

    with open(MERCADO_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"✅ [Mercado] mercado.json exportado con {total_activas} publicaciones activas.")
    return payload

# =============================================================================
# MÓDULO DE RADAR JUGÓN NATIVO (HUB NATIVO — PASO 9)
# =============================================================================

RADAR_JSON_PATH = os.path.join(PROJECT_ROOT, "radar.json")

def guardar_radar(nick: str, zona: str = "Sector Santiago", estilos: str = "",
                  favoritos: str = "", coleccion: str = "", dias_disponibles: list | None = None,
                  horario_preferido: str = "Tarde / Noche (17:00 - 21:00)",
                  busca_jugadores_para: str = "") -> dict:
    """Guarda o actualiza la ficha del Radar Jugón de un miembro autenticado."""
    if not dias_disponibles:
        dias_disponibles = []
    
    dias_json = json.dumps(dias_disponibles, ensure_ascii=False) if isinstance(dias_disponibles, list) else str(dias_disponibles)
    
    with get_db() as conn:
        conn.execute("""
            INSERT INTO radar_jugadores 
                (nick, zona, estilos, favoritos, coleccion, dias_disponibles, horario_preferido, busca_jugadores_para, fecha_actualizacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(nick) DO UPDATE SET
                zona = excluded.zona,
                estilos = excluded.estilos,
                favoritos = excluded.favoritos,
                coleccion = excluded.coleccion,
                dias_disponibles = excluded.dias_disponibles,
                horario_preferido = excluded.horario_preferido,
                busca_jugadores_para = excluded.busca_jugadores_para,
                fecha_actualizacion = datetime('now')
        """, (nick, zona, estilos, favoritos, coleccion, dias_json, horario_preferido, busca_jugadores_para))
        conn.commit()

    print(f"📡 [Radar] Ficha actualizada para: {nick} ({zona})")
    exportar_radar_json()
    return {"ok": True, "nick": nick, "mensaje": "Ficha de Radar guardada exitosamente."}

def obtener_radar_miembro(nick: str) -> dict:
    """Consulta la ficha de radar de un miembro específico."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM radar_jugadores WHERE LOWER(nick) = LOWER(?)", (nick,)).fetchone()
        if not row:
            return {"ok": True, "radar": {"registrado": False}}
        
        dias = []
        try:
            dias = json.loads(row["dias_disponibles"]) if row["dias_disponibles"] else []
        except Exception:
            dias = []

        return {
            "ok": True,
            "radar": {
                "registrado": True,
                "nick": row["nick"],
                "zona": row["zona"],
                "estilos": row["estilos"],
                "favoritos": row["favoritos"],
                "coleccion": row["coleccion"],
                "dias_disponibles": dias,
                "horario_preferido": row["horario_preferido"],
                "busca_jugadores_para": row["busca_jugadores_para"],
                "fecha_actualizacion": row["fecha_actualizacion"]
            }
        }

def eliminar_radar_miembro(nick: str) -> dict:
    """Elimina la ficha de radar de un miembro."""
    with get_db() as conn:
        conn.execute("DELETE FROM radar_jugadores WHERE LOWER(nick) = LOWER(?)", (nick,))
        conn.commit()
    print(f"🗑️ [Radar] Ficha eliminada para: {nick}")
    exportar_radar_json()
    return {"ok": True, "mensaje": "Ficha de Radar eliminada."}

def exportar_radar_json() -> dict:
    """Exporta el catálogo de fichas de radar a radar.json para consumo web estático."""
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM radar_jugadores ORDER BY nick COLLATE NOCASE ASC").fetchall()
        fichas = []
        for r in rows:
            dias_raw = None
            try:
                dias_raw = json.loads(r["dias_disponibles"]) if r["dias_disponibles"] else []
            except Exception:
                dias_raw = []

            disp_map = {}
            dias_activos = []
            if isinstance(dias_raw, dict):
                disp_map = dias_raw
                for k, v in dias_raw.items():
                    horario_val = v.get("horario", "") if isinstance(v, dict) else str(v)
                    if horario_val and not any(neg in horario_val.lower() for neg in ["no tengo disponible", "no disponible"]):
                        dias_activos.append(k)
            elif isinstance(dias_raw, list):
                dias_activos = dias_raw
                for d in dias_raw:
                    disp_map[d] = {"horario": r["horario_preferido"], "excepcion": ""}

            fichas.append({
                "nick": r["nick"],
                "zona": r["zona"],
                "estilos": r["estilos"],
                "favoritos": r["favoritos"],
                "coleccion": r["coleccion"],
                "dias_disponibles": dias_activos,
                "disponibilidad": disp_map,
                "horario_preferido": r["horario_preferido"],
                "busca_jugadores_para": r["busca_jugadores_para"],
                "fecha_actualizacion": r["fecha_actualizacion"]
            })

    payload = {
        "_meta": {
            "version": "2.0",
            "descripcion": "Radar Jugón Amigos Jugones (exportado soberano)",
            "generado_el": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total": len(fichas)
        },
        "jugadores": fichas
    }

    try:
        with open(RADAR_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"✅ [Radar] radar.json exportado con {len(fichas)} fichas de jugadores.")
    except Exception as e:
        print(f"⚠️ [Radar] Error escribiendo radar.json: {e}")

    return payload

# =============================================================================
# MÓDULO DE MISIONES Y DESAFÍOS DIARIOS (SISTEMA DUAL WEB — FASE 5)
# =============================================================================

MISIONES_UPLOADS_DIR = os.path.join(PROJECT_ROOT, "uploads", "temp_misiones")
os.makedirs(MISIONES_UPLOADS_DIR, exist_ok=True)

def registrar_entrega_mision(nick: str, fecha_mision: str, tipo_mision: str = "grupal",
                             desafios_completados: list | None = None, pruebas_urls: list | None = None) -> dict:
    """Registra la entrega de desafíos de una misión diaria para un jugador.
    Control anti-doble cobro: UNIQUE(nick, fecha_mision, tipo_mision)."""
    if not desafios_completados:
        desafios_completados = []
    if not pruebas_urls:
        pruebas_urls = []

    desafios_json = json.dumps(desafios_completados, ensure_ascii=False)
    pruebas_json = json.dumps(pruebas_urls, ensure_ascii=False)

    try:
        with get_db() as conn:
            conn.execute("""
                INSERT INTO misiones_entregas 
                    (nick, fecha_mision, tipo_mision, desafios_completados, pruebas_urls, estado, fecha_envio)
                VALUES (?, ?, ?, ?, ?, 'pendiente', datetime('now'))
            """, (nick, fecha_mision, tipo_mision, desafios_json, pruebas_json))
            conn.commit()

        print(f"📥 [Misiones] Nueva entrega de {nick} para {fecha_mision} ({tipo_mision}): {len(desafios_completados)} retos.")
        return {"ok": True, "mensaje": "Misión enviada exitosamente para revisión del Administrador."}
    except sqlite3.IntegrityError:
        return {"ok": False, "error": "ya_enviado", "mensaje": f"Ya registraste tu entrega de {tipo_mision} para la fecha {fecha_mision}."}
    except Exception as e:
        return {"ok": False, "error": str(e), "mensaje": "Error registrando la entrega de la misión."}

def obtener_entrega_mision(nick: str, fecha_mision: str, tipo_mision: str = "grupal") -> dict:
    """Consulta el estado de la entrega de misión de un jugador en una fecha."""
    with get_db() as conn:
        row = conn.execute("""
            SELECT * FROM misiones_entregas 
            WHERE LOWER(nick) = LOWER(?) AND fecha_mision = ? AND tipo_mision = ?
        """, (nick, fecha_mision, tipo_mision)).fetchone()
        
        if not row:
            return {"ok": True, "entrega": None}
        
        desafios = []
        pruebas = []
        try:
            desafios = json.loads(row["desafios_completados"]) if row["desafios_completados"] else []
            pruebas = json.loads(row["pruebas_urls"]) if row["pruebas_urls"] else []
        except Exception:
            pass

        return {
            "ok": True,
            "entrega": {
                "id": row["id"],
                "nick": row["nick"],
                "fecha_mision": row["fecha_mision"],
                "tipo_mision": row["tipo_mision"],
                "desafios_completados": desafios,
                "pruebas_urls": pruebas,
                "estado": row["estado"],
                "puntos_otorgados": row["puntos_otorgados"],
                "comentario_admin": row["comentario_admin"],
                "admin_revisor": row["admin_revisor"],
                "fecha_envio": row["fecha_envio"],
                "fecha_revision": row["fecha_revision"]
            }
        }

def obtener_entregas_misiones_dia(nick: str, fecha_mision: str) -> dict:
    """Retorna todas las entregas de misiones de un jugador en una fecha dada indexadas por tipo_mision."""
    with get_db() as conn:
        rows = conn.execute("""
            SELECT * FROM misiones_entregas 
            WHERE LOWER(nick) = LOWER(?) AND fecha_mision = ?
        """, (nick, fecha_mision)).fetchall()
        
        entregas = {}
        for r in rows:
            entregas[r["tipo_mision"]] = {
                "id": r["id"],
                "nick": r["nick"],
                "fecha_mision": r["fecha_mision"],
                "tipo_mision": r["tipo_mision"],
                "estado": r["estado"],
                "puntos_otorgados": r["puntos_otorgados"],
                "comentario_admin": r["comentario_admin"],
                "admin_revisor": r["admin_revisor"],
                "fecha_envio": r["fecha_envio"],
                "fecha_revision": r["fecha_revision"]
            }
        return {"ok": True, "entregas": entregas}

def listar_misiones_pendientes(fecha_mision: str | None = None) -> list:
    """Lista las entregas de misiones en estado 'pendiente' para la bandeja de moderación del admin."""
    with get_db() as conn:
        query = "SELECT * FROM misiones_entregas WHERE estado = 'pendiente'"
        params = []
        if fecha_mision:
            query += " AND fecha_mision = ?"
            params.append(fecha_mision)
        query += " ORDER BY fecha_envio ASC"

        rows = conn.execute(query, params).fetchall()
        entregas = []
        for r in rows:
            desafios = []
            pruebas = []
            try:
                desafios = json.loads(r["desafios_completados"]) if r["desafios_completados"] else []
                pruebas = json.loads(r["pruebas_urls"]) if r["pruebas_urls"] else []
            except Exception:
                pass

            entregas.append({
                "id": r["id"],
                "nick": r["nick"],
                "fecha_mision": r["fecha_mision"],
                "tipo_mision": r["tipo_mision"],
                "desafios_completados": desafios,
                "pruebas_urls": pruebas,
                "estado": r["estado"],
                "fecha_envio": r["fecha_envio"]
            })
        return entregas

def moderar_mision(mision_id: int, accion: str, admin_nick: str = "Admin",
                   comentario: str = "", puntos_custom: int = 7) -> dict:
    """Modera una entrega de misión (aprobar o rechazar).
    REGLA DE ORO DE ALMACENAMIENTO EFÍMERO:
    En cuanto se modera (aprobada o rechazada), se eliminan físicamente los archivos
    de imagen del disco con os.remove() y se limpia la columna pruebas_urls."""
    accion = accion.lower().strip()
    if accion not in ("aprobar", "rechazar"):
        return {"ok": False, "error": "Acción inválida. Use 'aprobar' o 'rechazar'."}

    with get_db() as conn:
        row = conn.execute("SELECT * FROM misiones_entregas WHERE id = ?", (mision_id,)).fetchone()
        if not row:
            return {"ok": False, "error": "Entrega de misión no encontrada."}
        if str(row["estado"] or "").lower() != "pendiente":
            return {"ok": False, "error": f"La misión #{mision_id} ya fue moderada ({row['estado']})."}

        nick = row["nick"]
        puntos_a_sumar = puntos_custom if accion == "aprobar" else 0
        nuevo_estado = "aprobado" if accion == "aprobar" else "rechazado"

        # 1. Si es aprobación:
        if accion == "aprobar":
            es_ataque = (puntos_custom < 0) or ("contraataque" in comentario.lower()) or ("caparaz" in comentario.lower())
            if es_ataque:
                # Mecánica Caparazón Azul / Contraataque:
                # No suma al atacante, sino que descuenta en cascada a todos los que estén estrictamente por encima en el podio.
                pts_descuento = abs(puntos_custom) if puntos_custom < 0 else 10
                ejecutar_contraataque(
                    nick_atacante=nick,
                    puntos_restar=pts_descuento,
                    descripcion=f"Impacto Caparazón Azul ({row['fecha_mision']})",
                    autor=admin_nick
                )
                puntos_a_sumar = 0
            else:
                conn.execute("UPDATE jugadores SET puntos = puntos + ? WHERE LOWER(nick) = LOWER(?)", (puntos_a_sumar, nick))
                # Registrar en historial de transacciones si la tabla existe
                try:
                    row_j = conn.execute("SELECT puntos FROM jugadores WHERE LOWER(nick) = LOWER(?)", (nick,)).fetchone()
                    saldo_act = row_j["puntos"] if row_j else 0
                    conn.execute("""
                        INSERT INTO historial_transacciones (nick, tipo_evento, descripcion, variacion_pts, saldo_resultante, timestamp)
                        VALUES (?, 'MISION_DIARIA', ?, ?, ?, datetime('now'))
                    """, (nick, f"Misión Diaria {row['fecha_mision']} ({row['tipo_mision']})", puntos_a_sumar, saldo_act))
                except Exception:
                    pass

        # 2. Actualizar estado de la misión
        conn.execute("""
            UPDATE misiones_entregas SET
                estado = ?,
                puntos_otorgados = ?,
                comentario_admin = ?,
                admin_revisor = ?,
                pruebas_urls = '[]',
                fecha_revision = datetime('now')
            WHERE id = ?
        """, (nuevo_estado, puntos_a_sumar, comentario, admin_nick, mision_id))
        conn.commit()

    # 3. Purga física inmediata de las imágenes del disco (solo dentro de uploads/temp_misiones)
    purgadas = 0
    try:
        pruebas = json.loads(row["pruebas_urls"]) if row["pruebas_urls"] else []
        safe_base = os.path.realpath(os.path.join(PROJECT_ROOT, "uploads", "temp_misiones"))
        for p in pruebas:
            if not isinstance(p, str):
                continue
            p_rel = p.lstrip("/\\")
            full_path = os.path.realpath(os.path.join(PROJECT_ROOT, p_rel))
            if full_path.startswith(safe_base + os.sep) and os.path.exists(full_path) and os.path.isfile(full_path):
                os.remove(full_path)
                purgadas += 1
    except Exception as e:
        print(f"⚠️ [Misiones] Error durante purga de imágenes: {e}")

    print(f"🛡️ [Misiones] Misión #{mision_id} de {nick}: {nuevo_estado.upper()} por {admin_nick}. ({purgadas} imágenes purgadas)")
    
    # Exportar ranking actualizado si se sumaron puntos
    if accion == "aprobar":
        try:
            exportar_ranking_json()
        except Exception:
            pass

    return {
        "ok": True,
        "mision_id": mision_id,
        "nick": nick,
        "estado": nuevo_estado,
        "puntos_otorgados": puntos_a_sumar,
        "imagenes_purgadas": purgadas,
        "mensaje": f"Misión {nuevo_estado} exitosamente. {purgadas} pruebas purgadas del servidor."
    }


# =============================================================================
# MÓDULO DE ANALYTICS PRIVADO (Google Analytics propio)
# =============================================================================

ANALYTICS_MAX_ROWS = 50000        # Umbral para activar el rolling archive
ANALYTICS_ARCHIVE_DIR = os.path.join(PROJECT_ROOT, "analytics_historico")

def init_analytics_tables():
    """Crea las tablas de analytics si no existen (idempotente)."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS visitas_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                visitor_id TEXT NOT NULL,
                nick TEXT,
                tipo_usuario TEXT NOT NULL DEFAULT 'visitante',
                pagina TEXT NOT NULL,
                titulo_pagina TEXT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                duracion_seg INTEGER,
                dispositivo TEXT DEFAULT 'desktop',
                referrer TEXT,
                session_id TEXT
            );
            CREATE TABLE IF NOT EXISTS analytics_archivos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_archivo TEXT NOT NULL,
                registros_archivados INTEGER NOT NULL DEFAULT 0,
                fecha_inicio TEXT NOT NULL,
                fecha_fin TEXT NOT NULL,
                creado_en TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON visitas_analytics(timestamp);
            CREATE INDEX IF NOT EXISTS idx_analytics_nick ON visitas_analytics(nick);
            CREATE INDEX IF NOT EXISTS idx_analytics_pagina ON visitas_analytics(pagina);
            CREATE INDEX IF NOT EXISTS idx_analytics_visitor ON visitas_analytics(visitor_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_tipo ON visitas_analytics(tipo_usuario);
        """)

def registrar_visita(visitor_id, pagina, titulo_pagina=None, nick=None,
                     tipo_usuario="visitante", dispositivo="desktop",
                     referrer=None, session_id=None):
    """
    Registra una visita de página (pageview) en la tabla visitas_analytics.
    Después de cada inserción verifica si se debe activar el rolling archive.
    Retorna el ID del registro insertado.
    """
    init_analytics_tables()
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    # Sanitizar la página para que siempre sea una ruta limpia
    pagina = pagina.strip() or "/"
    if len(pagina) > 200:
        pagina = pagina[:200]

    with get_db() as conn:
        cur = conn.execute("""
            INSERT INTO visitas_analytics
                (visitor_id, nick, tipo_usuario, pagina, titulo_pagina, timestamp, dispositivo, referrer, session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (visitor_id, nick, tipo_usuario, pagina, titulo_pagina, now, dispositivo, referrer, session_id))
        nuevo_id = cur.lastrowid
        conn.commit()

    # Verificar si es momento de archivar (asíncrono, no bloquea la respuesta)
    _verificar_y_archivar_analytics()
    return {"ok": True, "id": nuevo_id}

def actualizar_duracion_visita(visita_id, duracion_seg):
    """
    Actualiza la duración de una visita cuando el usuario sale de la página
    (llamado via sendBeacon o al cambiar de página en SPA).
    """
    try:
        duracion_seg = max(0, int(duracion_seg))
    except (ValueError, TypeError):
        return {"ok": False, "error": "duracion_invalida"}
    with get_db() as conn:
        conn.execute(
            "UPDATE visitas_analytics SET duracion_seg = ? WHERE id = ?",
            (duracion_seg, visita_id)
        )
        conn.commit()
    return {"ok": True, "id": visita_id, "duracion_seg": duracion_seg}

def obtener_resumen_analytics(dias=30):
    """
    Genera el resumen de analytics para el Panel de Administración.
    Retorna métricas agregadas de los últimos N días:
    - Visitas totales (visitantes + miembros)
    - Usuarios únicos (por visitor_id)
    - Páginas más visitadas
    - Actividad por hora del día
    - Actividad por día de la semana
    - Distribución dispositivo (mobile/desktop/tablet)
    - Ranking de miembros más activos
    - Visitas de hoy vs. ayer
    """
    init_analytics_tables()
    fecha_limite = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=dias)).strftime("%Y-%m-%dT%H:%M:%SZ")
    hoy = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    ayer = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)).strftime("%Y-%m-%d")

    with get_db() as conn:
        # Totales generales
        totales = conn.execute("""
            SELECT
                COUNT(*) as total_visitas,
                COUNT(DISTINCT visitor_id) as visitantes_unicos,
                COUNT(DISTINCT session_id) as sesiones_unicas,
                SUM(CASE WHEN tipo_usuario = 'miembro' THEN 1 ELSE 0 END) as visitas_miembros,
                SUM(CASE WHEN tipo_usuario = 'visitante' THEN 1 ELSE 0 END) as visitas_anonimas,
                AVG(CASE WHEN duracion_seg IS NOT NULL AND duracion_seg > 0 THEN duracion_seg ELSE NULL END) as duracion_promedio
            FROM visitas_analytics
            WHERE timestamp >= ?
        """, (fecha_limite,)).fetchone()

        # Visitas hoy
        row_hoy = conn.execute(
            "SELECT COUNT(*) as c FROM visitas_analytics WHERE DATE(timestamp) = ?",
            (hoy,)
        ).fetchone()
        hoy_count = row_hoy["c"] if row_hoy else 0

        # Visitas ayer
        row_ayer = conn.execute(
            "SELECT COUNT(*) as c FROM visitas_analytics WHERE DATE(timestamp) = ?",
            (ayer,)
        ).fetchone()
        ayer_count = row_ayer["c"] if row_ayer else 0

        # Top 10 páginas más visitadas
        top_paginas = conn.execute("""
            SELECT pagina, titulo_pagina, COUNT(*) as visitas,
                   AVG(CASE WHEN duracion_seg > 0 THEN duracion_seg ELSE NULL END) as duracion_prom
            FROM visitas_analytics
            WHERE timestamp >= ?
            GROUP BY pagina
            ORDER BY visitas DESC
            LIMIT 10
        """, (fecha_limite,)).fetchall()

        # Actividad por hora del día (0-23)
        por_hora = conn.execute("""
            SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hora, COUNT(*) as visitas
            FROM visitas_analytics
            WHERE timestamp >= ?
            GROUP BY hora
            ORDER BY hora ASC
        """, (fecha_limite,)).fetchall()

        # Actividad por día de la semana (0=domingo...6=sábado en SQLite)
        por_dia_semana = conn.execute("""
            SELECT CAST(strftime('%w', timestamp) AS INTEGER) as dia, COUNT(*) as visitas
            FROM visitas_analytics
            WHERE timestamp >= ?
            GROUP BY dia
            ORDER BY dia ASC
        """, (fecha_limite,)).fetchall()

        # Distribución de dispositivos
        dispositivos = conn.execute("""
            SELECT dispositivo, COUNT(*) as total
            FROM visitas_analytics
            WHERE timestamp >= ?
            GROUP BY dispositivo
            ORDER BY total DESC
        """, (fecha_limite,)).fetchall()

        # Top 10 miembros más activos
        top_miembros = conn.execute("""
            SELECT nick, COUNT(*) as visitas, COUNT(DISTINCT DATE(timestamp)) as dias_activo,
                   MAX(timestamp) as ultima_vez
            FROM visitas_analytics
            WHERE tipo_usuario = 'miembro' AND nick IS NOT NULL AND timestamp >= ?
            GROUP BY nick
            ORDER BY visitas DESC
            LIMIT 10
        """, (fecha_limite,)).fetchall()

        # Visitas por día (últimos 30 días)
        visitas_por_dia = conn.execute("""
            SELECT DATE(timestamp) as fecha, COUNT(*) as visitas,
                   COUNT(DISTINCT visitor_id) as unicos
            FROM visitas_analytics
            WHERE timestamp >= ?
            GROUP BY fecha
            ORDER BY fecha ASC
        """, (fecha_limite,)).fetchall()

        # Total registros actuales en la tabla (para saber si está cerca del límite)
        row_tot_reg = conn.execute(
            "SELECT COUNT(*) as c FROM visitas_analytics"
        ).fetchone()
        total_registros = row_tot_reg["c"] if row_tot_reg else 0

        # Archivos históricos disponibles
        archivos = conn.execute(
            "SELECT nombre_archivo, registros_archivados, fecha_inicio, fecha_fin, creado_en FROM analytics_archivos ORDER BY id DESC"
        ).fetchall()

    dias_semana_nombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    hora_mapa = {r["hora"]: r["visitas"] for r in por_hora}
    dia_mapa = {r["dia"]: r["visitas"] for r in por_dia_semana}

    res_totales = dict(totales) if totales else {}
    return {
        "ok": True,
        "periodo_dias": dias,
        "resumen": {
            "total_visitas": res_totales.get("total_visitas") or 0,
            "visitantes_unicos": res_totales.get("visitantes_unicos") or 0,
            "sesiones_unicas": res_totales.get("sesiones_unicas") or 0,
            "visitas_miembros": res_totales.get("visitas_miembros") or 0,
            "visitas_anonimas": res_totales.get("visitas_anonimas") or 0,
            "duracion_promedio_seg": round(res_totales.get("duracion_promedio") or 0, 1),
            "visitas_hoy": hoy_count,
            "visitas_ayer": ayer_count,
            "variacion_hoy_pct": round(((hoy_count - ayer_count) / max(ayer_count, 1)) * 100, 1)
        },
        "top_paginas": [dict(r) for r in top_paginas],
        "por_hora": [{"hora": h, "label": f"{h:02d}:00", "visitas": hora_mapa.get(h, 0)} for h in range(24)],
        "por_dia_semana": [{"dia": d, "label": dias_semana_nombres[d], "visitas": dia_mapa.get(d, 0)} for d in range(7)],
        "dispositivos": [dict(r) for r in dispositivos],
        "top_miembros": [dict(r) for r in top_miembros],
        "visitas_por_dia": [dict(r) for r in visitas_por_dia],
        "capacidad": {
            "registros_actuales": total_registros,
            "limite_antes_de_archivar": ANALYTICS_MAX_ROWS,
            "porcentaje_uso": round((total_registros / ANALYTICS_MAX_ROWS) * 100, 1),
            "archivos_historicos": [dict(r) for r in archivos]
        }
    }

def _verificar_y_archivar_analytics():
    """
    Verifica si la tabla supera ANALYTICS_MAX_ROWS registros.
    Si es así, exporta los 10.000 registros más antiguos a un JSON
    en la carpeta analytics_historico/ y los elimina de la DB.
    Diseñado para ejecutarse rápido y no bloquear el endpoint de registro.
    """
    try:
        with get_db() as conn:
            row_c = conn.execute("SELECT COUNT(*) as c FROM visitas_analytics").fetchone()
            total = row_c["c"] if row_c else 0
            if total < ANALYTICS_MAX_ROWS:
                return  # Aún hay espacio, no hacer nada

            BLOQUE_ARCHIVO = 10000
            # Obtener el bloque más antiguo
            rows = conn.execute("""
                SELECT * FROM visitas_analytics
                ORDER BY timestamp ASC, id ASC
                LIMIT ?
            """, (BLOQUE_ARCHIVO,)).fetchall()

            if not rows:
                return

            datos = [dict(r) for r in rows]
            fecha_inicio = datos[0]["timestamp"]
            fecha_fin = datos[-1]["timestamp"]
            ids_a_borrar = [r["id"] for r in datos]

            # Nombre del archivo basado en el mes del bloque
            try:
                dt = datetime.datetime.fromisoformat(fecha_inicio.replace("Z", "+00:00"))
                sufijo = dt.strftime("%Y_%m_%d_%H%M")
            except Exception:
                sufijo = datetime.datetime.now().strftime("%Y_%m_%d_%H%M")
            nombre_archivo = f"analytics_{sufijo}.json"

            # Crear carpeta si no existe
            os.makedirs(ANALYTICS_ARCHIVE_DIR, exist_ok=True)
            ruta_archivo = os.path.join(ANALYTICS_ARCHIVE_DIR, nombre_archivo)

            payload = {
                "generado": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "registros": len(datos),
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "datos": datos
            }
            with open(ruta_archivo, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)

            # Borrar los registros archivados de la DB
            placeholders = ",".join("?" * len(ids_a_borrar))
            conn.execute(f"DELETE FROM visitas_analytics WHERE id IN ({placeholders})", ids_a_borrar)

            # Registrar el archivo en la tabla de control
            conn.execute("""
                INSERT INTO analytics_archivos (nombre_archivo, registros_archivados, fecha_inicio, fecha_fin)
                VALUES (?, ?, ?, ?)
            """, (nombre_archivo, len(datos), fecha_inicio, fecha_fin))
            conn.commit()

        print(f"🗜️ [Analytics Archive] Archivados {len(datos)} registros → {nombre_archivo}")
        print(f"   📁 Total registros en DB tras purga: {total - len(datos)}")

    except Exception as e:
        print(f"⚠️ [Analytics Archive] Error durante archivado: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# MÓDULO: EL SALÓN DE HONOR (MÉRITOS REALES DE MIEMBROS)
# ─────────────────────────────────────────────────────────────────────────────

def init_logros_tabla():
    """Crea la tabla logros_externos de forma idempotente con columnas de Instagram."""
    with get_db() as conn:
        conn.execute("""
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
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_logros_nick ON logros_externos(nick)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_logros_visible ON logros_externos(visible, destacado)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_logros_categoria ON logros_externos(categoria)")
        conn.commit()

def obtener_logros_externos(categoria=None, solo_destacados=False):
    """
    Obtiene las publicaciones visibles del Salón de Honor.
    Orden: destacados primero, luego por creado_en descendente.
    """
    with get_db() as conn:
        base = "SELECT * FROM logros_externos WHERE visible = 1"
        params = []
        if categoria and categoria != 'todos':
            base += " AND categoria = ?"
            params.append(categoria)
        if solo_destacados:
            base += " AND destacado = 1"
        base += " ORDER BY destacado DESC, creado_en DESC"
        rows = conn.execute(base, params).fetchall()
    return [dict(r) for r in rows]

def obtener_logros_por_nick(nick):
    """Obtiene todos los reconocimientos visibles de un nick específico."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM logros_externos WHERE LOWER(nick) = LOWER(?) AND visible = 1 ORDER BY destacado DESC, creado_en DESC",
            (nick,)
        ).fetchall()
    return [dict(r) for r in rows]

def crear_logro_externo(nick, titulo, descripcion, categoria='general', emoji='🎖️',
                         fecha_logro=None, instagram_user=None, instagram_url=None,
                         enlace=None, imagen_url=None, destacado=0):
    """Crea una nueva tarjeta en el Salón de Honor (solo Admin). Retorna id generado."""
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO logros_externos
               (nick, titulo, descripcion, categoria, emoji_categoria, fecha_logro,
                instagram_user, instagram_url, enlace_referencia, imagen_url, destacado)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (nick, titulo, descripcion, categoria, emoji, fecha_logro,
             instagram_user, instagram_url, enlace, imagen_url, destacado)
        )
        conn.commit()
        return cur.lastrowid

def editar_logro_externo(logro_id, **kwargs):
    """Actualiza campos del logro. Retorna True si tuvo éxito."""
    campos_permitidos = {'titulo', 'descripcion', 'categoria', 'emoji_categoria', 'fecha_logro',
                         'instagram_user', 'instagram_url', 'enlace_referencia', 'imagen_url',
                         'visible', 'destacado'}
    updates = {k: v for k, v in kwargs.items() if k in campos_permitidos}
    if not updates:
        return False
    sets = ", ".join(f"{k} = ?" for k in updates)
    sets += ", actualizado_en = datetime('now')"
    values = list(updates.values()) + [logro_id]
    with get_db() as conn:
        conn.execute(f"UPDATE logros_externos SET {sets} WHERE id = ?", values)
        conn.commit()
    return True

# ─────────────────────────────────────────────────────────────────────────────
# MÓDULO DE PREMIOS VISIBLES DE TEMPORADA
# ─────────────────────────────────────────────────────────────────────────────

def init_premios_tabla():
    """Crea la tabla premios_temporada de forma idempotente."""
    with get_db() as conn:
        conn.execute("""
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
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_premios_temporada ON premios_temporada(temporada, activo)")
        conn.commit()

def obtener_premios_activos():
    """
    Retorna los premios activos + el progreso del líder hacia la meta.
    El nick del líder NO se expone para no revelar quién va ganando.
    """
    with get_db() as conn:
        premios = conn.execute(
            "SELECT * FROM premios_temporada WHERE activo = 1 ORDER BY orden ASC"
        ).fetchall()
        lider = conn.execute(
            "SELECT puntos FROM jugadores WHERE estado = 'Activo' ORDER BY puntos DESC LIMIT 1"
        ).fetchone()

    premios_list = [dict(p) for p in premios]
    meta = premios_list[0]['meta_puntos'] if premios_list else 1000
    puntos_lider = lider['puntos'] if lider else 0
    return {
        "ok": True,
        "premios": premios_list,
        "progreso_lider": {
            "puntos": puntos_lider,
            "meta": meta,
            "porcentaje": min(100, round((puntos_lider / meta) * 100)) if meta else 0
        }
    }

def crear_premio(temporada, titulo, descripcion_general, donante, descripcion_donante=None,
                  meta_puntos=1000, tipo_premio='juego_mesa', emoji_tipo='🎲', imagen_url=None, orden=1):
    """Crea un nuevo premio de temporada (solo Admin). Retorna el id generado."""
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO premios_temporada
               (temporada, titulo, descripcion_general, donante, descripcion_donante,
                meta_puntos, tipo_premio, emoji_tipo, imagen_url, orden)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (temporada, titulo, descripcion_general, donante, descripcion_donante,
             meta_puntos, tipo_premio, emoji_tipo, imagen_url, orden)
        )
        conn.commit()
        return cur.lastrowid

def editar_premio(premio_id, **kwargs):
    """Edita un premio existente. Retorna True si tuvo éxito."""
    campos_permitidos = {'titulo', 'descripcion_general', 'donante', 'descripcion_donante',
                         'meta_puntos', 'tipo_premio', 'emoji_tipo', 'imagen_url', 'activo', 'orden'}
    updates = {k: v for k, v in kwargs.items() if k in campos_permitidos}
    if not updates:
        return False
    sets = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values()) + [premio_id]
    with get_db() as conn:
        conn.execute(f"UPDATE premios_temporada SET {sets} WHERE id = ?", values)
        conn.commit()
    return True


# =============================================================================
# SEGURIDAD, CONTROL DE DISPOSITIVOS Y CONTRASEÑAS PRIVADAS
# =============================================================================

import hashlib
import secrets
import hmac

def normalizar_telefono(phone):
    """Extrae solo dígitos de un teléfono"""
    if not phone:
        return ""
    return re.sub(r"\D", "", str(phone))

def buscar_jugador_por_identificador(identificador):
    """Busca un jugador por teléfono o por nick"""
    clean_id = str(identificador or "").strip()
    digits = normalizar_telefono(clean_id)
    with get_db() as conn:
        cur = conn.cursor()
        if len(digits) >= 7:
            suffix = digits[-8:]
            cur.execute("SELECT * FROM jugadores WHERE telefono LIKE ? OR telefono = ?", (f"%{suffix}", digits))
            row = cur.fetchone()
            if row:
                return dict(row)
        cur.execute("SELECT * FROM jugadores WHERE UPPER(nick) = UPPER(?)", (clean_id,))
        row = cur.fetchone()
        if row:
            return dict(row)
        if digits:
            cur.execute("SELECT * FROM jugadores WHERE telefono = ?", (digits,))
            row = cur.fetchone()
            if row:
                return dict(row)
    return None

# =============================================================================
# 🔒 SEGURIDAD DE ACCESO — CONTROL DE DISPOSITIVOS Y CLAVE PRIVADA PERSONAL
# Implementación del Plan Maestro de Seguridad v1.0
# =============================================================================

import hashlib
import secrets

def _hash_password(password: str, salt: str | None = None) -> tuple:
    """Genera un hash seguro PBKDF2-HMAC-SHA256 para una contraseña.
    Retorna (hash_hex, salt_hex) para almacenamiento."""
    if salt is None:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 260000)
    return dk.hex(), salt

def _verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    """Verifica una contraseña contra su hash almacenado."""
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), stored_salt.encode('utf-8'), 260000)
    return dk.hex() == stored_hash

def _normalize_phone(phone: str) -> str:
    """Normaliza número de teléfono: quita espacios, guiones, paréntesis."""
    return re.sub(r'[\s\-\(\)\+]', '', phone.strip())

def _get_clave_comunitaria_actual() -> str:
    """Retorna la clave comunitaria semanal vigente. Se puede ampliar para leerla de la BD."""
    # Por ahora, clave hardcoded del entorno dev. En producción leer de config_clave.json
    try:
        cfg_path = os.path.join(PROJECT_ROOT, 'config_clave.json')
        if os.path.exists(cfg_path):
            with open(cfg_path, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                return str(cfg.get('clave_comunitaria', 'AJ2026')).strip()
    except Exception:
        pass
    return 'AJ2026'


def init_seguridad_tabla():
    """Crea las columnas de seguridad en jugadores y la tabla dispositivos_miembro.
    Seguro de ejecutar múltiples veces (usa IF NOT EXISTS / IGNORE)."""
    with get_db() as conn:
        # Columnas opcionales en jugadores — se ignoran si ya existen
        for col_sql in [
            "ALTER TABLE jugadores ADD COLUMN password_hash TEXT DEFAULT NULL",
            "ALTER TABLE jugadores ADD COLUMN password_salt TEXT DEFAULT NULL",
            "ALTER TABLE jugadores ADD COLUMN tiene_clave_privada INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE jugadores ADD COLUMN fecha_registro_privada TEXT DEFAULT NULL",
        ]:
            try:
                conn.execute(col_sql)
            except Exception:
                pass  # Columna ya existe

        # Tabla relacional de dispositivos por miembro
        conn.executescript("""
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
            CREATE TABLE IF NOT EXISTS config_seguridad (
                clave TEXT PRIMARY KEY,
                valor TEXT NOT NULL,
                actualizado_en TEXT DEFAULT (datetime('now'))
            );
            INSERT OR IGNORE INTO config_seguridad (clave, valor) VALUES ('limite_dispositivos', '2');
        """)
    print("✅ [Seguridad] Tablas y columnas de seguridad inicializadas.")


def obtener_limite_dispositivos() -> int:
    """Retorna el límite global de navegadores/dispositivos permitidos con clave comunitaria."""
    try:
        with get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS config_seguridad (
                    clave TEXT PRIMARY KEY,
                    valor TEXT NOT NULL,
                    actualizado_en TEXT DEFAULT (datetime('now'))
                )
            """)
            row = conn.execute(
                "SELECT valor FROM config_seguridad WHERE clave = 'limite_dispositivos'"
            ).fetchone()
            if row and row['valor'] is not None:
                val = int(row['valor'])
                return max(1, min(20, val))
    except Exception:
        pass
    return 2


def actualizar_limite_dispositivos(nuevo_limite: object) -> dict:
    """Actualiza el límite global de navegadores/dispositivos (1 a 20)."""
    if isinstance(nuevo_limite, bool) or nuevo_limite is None:
        return {"ok": False, "error": "limite_invalido", "mensaje": "El límite debe ser un número entero."}
    try:
        val = int(str(nuevo_limite).strip())
    except Exception:
        return {"ok": False, "error": "limite_invalido", "mensaje": "El límite debe ser un número entero."}
    if val < 1 or val > 20:
        return {"ok": False, "error": "limite_fuera_de_rango", "mensaje": "El límite debe estar entre 1 y 20 navegadores."}
    try:
        with get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS config_seguridad (
                    clave TEXT PRIMARY KEY,
                    valor TEXT NOT NULL,
                    actualizado_en TEXT DEFAULT (datetime('now'))
                )
            """)
            conn.execute("""
                INSERT INTO config_seguridad (clave, valor, actualizado_en)
                VALUES ('limite_dispositivos', ?, datetime('now'))
                ON CONFLICT(clave) DO UPDATE SET
                    valor = excluded.valor,
                    actualizado_en = datetime('now')
            """, (str(val),))
        return {
            "ok": True,
            "limite_dispositivos": val,
            "mensaje": f"✅ Límite actualizado a {val} navegador(es)/dispositivo(s) por usuario."
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


def verificar_credenciales_miembro(phone: str, password: str, device_id: str = '', nick: str = '') -> dict:
    """Valida las credenciales de un miembro con la lógica completa del plan de seguridad."""
    # Asegurar que la tabla existe antes de operar
    try:
        init_seguridad_tabla()
    except Exception:
        pass

    phone = _normalize_phone(phone)
    password = password.strip()
    device_id = (device_id or '').strip()
    nick = (nick or '').strip()

    if not phone or not password:
        return {"ok": False, "error": "datos_incompletos", "mensaje": "Teléfono y contraseña son obligatorios."}

    clave_comunitaria = _get_clave_comunitaria_actual()

    with get_db() as conn:
        # Buscar jugador por teléfono (campo 'telefono' o 'phone')
        row = conn.execute(
            "SELECT * FROM jugadores WHERE telefono = ? OR telefono = ?",
            (phone, '+' + phone)
        ).fetchone()

        if not row:
            return {"ok": False, "error": "usuario_no_encontrado",
                    "mensaje": "Este número de teléfono no está registrado en el grupo."}

        jugador = dict(row)
        tiene_privada = int(jugador.get('tiene_clave_privada', 0)) == 1

        # Si el usuario ingresó un nick explícito en su login y no colisiona con otro miembro, sincronizarlo
        if nick:
            try:
                colision = conn.execute(
                    "SELECT nick FROM jugadores WHERE UPPER(nick) = UPPER(?) AND telefono != ? AND telefono != ?",
                    (nick, phone, '+' + phone)
                ).fetchone()
                if not colision:
                    conn.execute(
                        "UPDATE jugadores SET nick = ?, nick_web = ? WHERE telefono = ? OR telefono = ?",
                        (nick, nick, phone, '+' + phone)
                    )
                    jugador['nick'] = nick
                    jugador['nick_web'] = nick
            except Exception as e_nick:
                print(f"⚠️ Aviso al actualizar nick en login: {e_nick}")

        # ── RAMA 1: Cuenta con clave privada activa ────────────────────────────
        if tiene_privada:
            if password == clave_comunitaria:
                return {
                    "ok": False,
                    "error": "clave_comunitaria_bloqueada",
                    "mensaje": "🔐 Tu cuenta está protegida con clave privada. La clave del grupo ya no puede usarse para acceder a tu cuenta. Ingresa tu contraseña personal."
                }
            # Validar hash de clave privada
            stored_hash = jugador.get('password_hash') or ''
            stored_salt = jugador.get('password_salt') or ''
            if not stored_hash or not stored_salt:
                return {"ok": False, "error": "clave_privada_no_configurada",
                        "mensaje": "Error interno: clave privada no configurada correctamente."}

            if not _verify_password(password, stored_hash, stored_salt):
                return {"ok": False, "error": "clave_incorrecta",
                        "mensaje": "Contraseña privada incorrecta. Inténtalo de nuevo."}

            # Acreditar torneos históricos pendientes tras autenticación web
            try:
                reconciliar_puntos_torneos_pendientes(phone)
            except Exception:
                pass

            # ✅ Login exitoso con clave privada — sin límite de dispositivos
            return {
                "ok": True,
                "sugerir_clave_privada": False,
                "tiene_clave_privada": True,
                "session": {
                    "nick": jugador.get('nick', ''),
                    "telefono": phone,
                    "puntos": jugador.get('puntos', 0),
                    "rol": jugador.get('rol', 'miembro'),
                    "tiene_clave_privada": True,
                },
                "mensaje": f"✅ Bienvenido, {jugador.get('nick', '')}. Acceso con contraseña privada."
            }

        # ── RAMA 2: Cuenta con clave comunitaria ──────────────────────────────
        if password != clave_comunitaria:
            return {"ok": False, "error": "clave_invalida",
                    "mensaje": "Contraseña incorrecta. Verifica la clave comunitaria del grupo de WhatsApp."}

        # Verificar/registrar device_id
        if device_id:
            existing = conn.execute(
                "SELECT id FROM dispositivos_miembro WHERE telefono = ? AND device_id = ?",
                (phone, device_id)
            ).fetchone()

            if existing:
                # Dispositivo conocido: actualizar último acceso
                conn.execute(
                    "UPDATE dispositivos_miembro SET ultimo_acceso = datetime('now') WHERE telefono = ? AND device_id = ?",
                    (phone, device_id)
                )
            else:
                # Nuevo dispositivo: verificar límite
                row_cnt = conn.execute(
                    "SELECT COUNT(*) as cnt FROM dispositivos_miembro WHERE telefono = ?",
                    (phone,)
                ).fetchone()
                count = row_cnt['cnt'] if row_cnt else 0
                limite_actual = obtener_limite_dispositivos()

                if count >= limite_actual:
                    return {
                        "ok": False,
                        "error": "limite_dispositivos_alcanzado",
                        "limite_dispositivos": limite_actual,
                        "mensaje": f"⚠️ Ya tienes {limite_actual} navegadores/dispositivos vinculados con la clave comunitaria. Para agregar este dispositivo, contacta al administrador o crea una contraseña privada personal.",
                        "whatsapp_admin": "https://wa.me/573001234567"
                    }

                # Registrar nuevo dispositivo
                conn.execute(
                    """INSERT INTO dispositivos_miembro (telefono, device_id, ip_origen, creado_en, ultimo_acceso)
                       VALUES (?, ?, '', datetime('now'), datetime('now'))""",
                    (phone, device_id)
                )

        # Contar dispositivos actuales para el estado
        row_disp = conn.execute(
            "SELECT COUNT(*) as cnt FROM dispositivos_miembro WHERE telefono = ?", (phone,)
        ).fetchone() if device_id else None
        dispositivos_count = row_disp['cnt'] if row_disp else 0

        # Acreditar torneos históricos pendientes tras autenticación web
        try:
            reconciliar_puntos_torneos_pendientes(phone)
        except Exception:
            pass

        # ✅ Login exitoso con clave comunitaria
        return {
            "ok": True,
            "sugerir_clave_privada": True,
            "tiene_clave_privada": False,
            "dispositivos_registrados": dispositivos_count,
            "session": {
                "nick": jugador.get('nick', ''),
                "telefono": phone,
                "puntos": jugador.get('puntos', 0),
                "rol": jugador.get('rol', 'miembro'),
                "tiene_clave_privada": False,
            },
            "mensaje": f"✅ Bienvenido, {jugador.get('nick', '')}."
        }


def establecer_password_privada(phone: str, nueva_password: str) -> dict:
    """Crea o actualiza la contraseña privada personal de un miembro.
    Una vez establecida, la clave comunitaria queda bloqueada para ese número.

    Returns: dict con ok y mensaje.
    """
    phone = _normalize_phone(phone)
    nueva_password = (nueva_password or '').strip()

    if not phone or not nueva_password:
        return {"ok": False, "error": "datos_incompletos", "mensaje": "Teléfono y contraseña son obligatorios."}

    if len(nueva_password) < 6:
        return {"ok": False, "error": "password_muy_corta", "mensaje": "La contraseña debe tener al menos 6 caracteres."}

    try:
        init_seguridad_tabla()
    except Exception:
        pass

    with get_db() as conn:
        row = conn.execute(
            "SELECT nick, COALESCE(tiene_clave_privada, 0) as tiene_clave_privada FROM jugadores WHERE telefono = ? OR telefono = ?",
            (phone, '+' + phone)
        ).fetchone()
        if not row:
            return {"ok": False, "error": "usuario_no_encontrado",
                    "mensaje": "Número de teléfono no registrado."}
        if int(row["tiene_clave_privada"] or 0) == 1:
            return {"ok": False, "error": "cuenta_ya_blindada",
                    "mensaje": "Esta cuenta ya tiene contraseña privada. Solicita al administrador un reseteo si necesitas cambiarla."}

        hash_val, salt_val = _hash_password(nueva_password)
        now = datetime.datetime.now().isoformat()

        conn.execute(
            """UPDATE jugadores
               SET password_hash = ?,
                   password_salt = ?,
                   tiene_clave_privada = 1,
                   fecha_registro_privada = ?
               WHERE telefono = ? OR telefono = ?""",
            (hash_val, salt_val, now, phone, '+' + phone)
        )

        nick = row['nick']
        print(f"🔒 [Seguridad] Clave privada establecida para: {nick} ({phone})")

        # Acreditar torneos históricos pendientes al registrar clave privada en la web
        try:
            reconciliar_puntos_torneos_pendientes(phone)
        except Exception:
            pass

        return {
            "ok": True,
            "mensaje": f"✅ ¡Cuenta blindada! La clave comunitaria ya no puede usarse para entrar como {nick}. Usa siempre tu contraseña personal.",
            "nick": nick
        }


def admin_reset_dispositivos(phone: str) -> dict:
    """Elimina todos los dispositivos vinculados de un miembro para permitir
    nuevas vinculaciones desde 0 (máx. 2 nuevos navegadores con clave comunitaria).

    Returns: dict con ok, dispositivos_eliminados y mensaje.
    """
    phone = _normalize_phone(phone)
    if not phone:
        return {"ok": False, "error": "telefono_requerido"}

    try:
        init_seguridad_tabla()
    except Exception:
        pass

    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM dispositivos_miembro WHERE telefono = ? OR telefono = ?",
            (phone, '+' + phone)
        )
        eliminados = cursor.rowcount

    limite_actual = obtener_limite_dispositivos()
    print(f"🔄 [Admin] Reset dispositivos de {phone}: {eliminados} registros eliminados.")
    return {
        "ok": True,
        "dispositivos_eliminados": eliminados,
        "limite_dispositivos": limite_actual,
        "mensaje": f"✅ Dispositivos reseteados ({eliminados} eliminados). El miembro puede vincular hasta {limite_actual} nuevos navegadores con la clave comunitaria."
    }


def admin_reset_password_privada(phone: str) -> dict:
    """Restablece la cuenta de un miembro al modo de clave comunitaria:
    elimina la contraseña privada y reactiva el límite de 2 dispositivos.

    Returns: dict con ok y mensaje.
    """
    phone = _normalize_phone(phone)
    if not phone:
        return {"ok": False, "error": "telefono_requerido"}

    try:
        init_seguridad_tabla()
    except Exception:
        pass

    with get_db() as conn:
        row = conn.execute(
            "SELECT nick, tiene_clave_privada FROM jugadores WHERE telefono = ? OR telefono = ?",
            (phone, '+' + phone)
        ).fetchone()

        if not row:
            return {"ok": False, "error": "usuario_no_encontrado",
                    "mensaje": "Número de teléfono no registrado."}

        conn.execute(
            """UPDATE jugadores
               SET password_hash = NULL,
                   password_salt = NULL,
                   tiene_clave_privada = 0,
                   fecha_registro_privada = NULL
               WHERE telefono = ? OR telefono = ?""",
            (phone, '+' + phone)
        )

    nick = row['nick']
    print(f"🔑 [Admin] Clave privada reseteada para: {nick} ({phone})")
    return {
        "ok": True,
        "nick": nick,
        "mensaje": f"✅ La cuenta de {nick} ha vuelto al modo de clave comunitaria. También considera resetear sus dispositivos si es necesario."
    }


def obtener_estado_seguridad(phone: str) -> dict | None:
    """Retorna el estado de seguridad actual de un miembro (para mostrar en panel admin o perfil).

    Returns: dict con tiene_clave_privada, dispositivos_count, fecha_registro_privada o None si no existe.
    """
    phone = _normalize_phone(phone)
    try:
        init_seguridad_tabla()
    except Exception:
        pass

    with get_db() as conn:
        row = conn.execute(
            "SELECT nick, tiene_clave_privada, fecha_registro_privada FROM jugadores WHERE telefono = ? OR telefono = ?",
            (phone, '+' + phone)
        ).fetchone()

        if not row:
            return None

        row_cnt = conn.execute(
            "SELECT COUNT(*) as cnt FROM dispositivos_miembro WHERE telefono = ? OR telefono = ?",
            (phone, '+' + phone)
        ).fetchone()
        count = row_cnt['cnt'] if row_cnt else 0

        dispositivos = conn.execute(
            "SELECT device_id, nombre_dispositivo, creado_en, ultimo_acceso FROM dispositivos_miembro WHERE telefono = ? OR telefono = ? ORDER BY ultimo_acceso DESC",
            (phone, '+' + phone)
        ).fetchall()

        return {
            "nick": row['nick'],
            "tiene_clave_privada": bool(int(row['tiene_clave_privada'] or 0)),
            "fecha_registro_privada": row['fecha_registro_privada'],
            "dispositivos_count": count,
            "dispositivos": [dict(d) for d in dispositivos],
            "limite_dispositivos": obtener_limite_dispositivos()
        }


def obtener_miembros_seguridad() -> list[dict[str, object]]:
    """Retorna todos los miembros con su estado real de seguridad y conteo real de dispositivos desde SQLite."""
    try:
        init_seguridad_tabla()
    except Exception:
        pass
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT j.telefono, j.nick, j.nick_web, j.nombre_agenda_admin, j.nombre_perfil_ws,
                       j.estado, j.puntos, COALESCE(j.tiene_clave_privada, 0) as tiene_clave_privada,
                       j.password_hash
                FROM jugadores j
                WHERE j.estado = 'Activo' OR j.estado IS NULL
                ORDER BY COALESCE(j.tiene_clave_privada, 0) DESC, j.puntos DESC, j.nick ASC
            """)
            jugadores_rows = [dict(r) for r in cur.fetchall()]

            disp_rows = cur.execute("""
                SELECT REPLACE(telefono, '+', '') as tel_norm, COUNT(*) as cnt
                FROM dispositivos_miembro
                GROUP BY REPLACE(telefono, '+', '')
            """).fetchall()
            disp_map = {str(r['tel_norm']): int(r['cnt']) for r in disp_rows if r['tel_norm']}

            miembros: list[dict[str, object]] = []
            for j in jugadores_rows:
                raw_phone = _normalize_phone(str(j.get('telefono') or ''))
                if not raw_phone:
                    continue
                tiene_priv = bool(int(j.get('tiene_clave_privada') or 0) == 1 or j.get('password_hash'))
                nick_display = str(j.get('nick_web') or j.get('nick') or '').strip()
                agenda_display = str(j.get('nombre_agenda_admin') or j.get('nombre_perfil_ws') or 'Sin Nombre').strip()
                miembros.append({
                    "telefono": raw_phone,
                    "nick": nick_display,
                    "agenda": agenda_display,
                    "estado": str(j.get('estado') or 'Activo'),
                    "seguridad": "blindada" if tiene_priv else "comunitaria",
                    "dispositivos": disp_map.get(raw_phone, 0),
                    "puntos": int(j.get('puntos') or 0)
                })
            return miembros
    except Exception as e:
        print(f"⚠️ [Seguridad] Error obteniendo miembros seguridad: {e}")
        return []




# =============================================================================
# 🏆 TORNEOS BGA — FUNCIONES DE GESTIÓN
# Sistema de sincronización de torneos de Board Game Arena con Amigos Jugones
# =============================================================================

def _init_torneos_tablas():
    """Crea las tablas de torneos si no existen."""
    sql_torneos = """
    CREATE TABLE IF NOT EXISTS torneos_bga (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id TEXT NOT NULL UNIQUE,
        tournament_name TEXT,
        game TEXT,
        status TEXT,
        current_round INTEGER,
        bga_url TEXT,
        total_players INTEGER DEFAULT 0,
        activo INTEGER DEFAULT 1,
        detalle_json TEXT,
        creado_en TEXT DEFAULT (datetime('now')),
        actualizado_en TEXT DEFAULT (datetime('now'))
    );
    """
    sql_participantes = """
    CREATE TABLE IF NOT EXISTS torneo_participantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id TEXT NOT NULL,
        bga_username TEXT NOT NULL,
        nick_aj TEXT,
        jugador_id INTEGER,
        rank_actual INTEGER,
        score TEXT,
        eliminado INTEGER DEFAULT 0,
        puntos_asignados INTEGER DEFAULT 0,
        actualizado_en TEXT DEFAULT (datetime('now')),
        UNIQUE(tournament_id, bga_username)
    );
    """
    try:
        with get_db() as conn:
            conn.execute(sql_torneos)
            conn.execute(sql_participantes)
            cols = [r[1] for r in conn.execute("PRAGMA table_info(torneos_bga)").fetchall()]
            if "detalle_json" not in cols:
                conn.execute("ALTER TABLE torneos_bga ADD COLUMN detalle_json TEXT")
    except Exception as e:
        print(f"⚠️ [Torneos] Error creando tablas: {e}")

# Inicializar tablas al importar el módulo
try:
    _init_torneos_tablas()
except Exception:
    pass


def guardar_torneo(data: dict) -> dict:
    """Inserta o actualiza un torneo BGA en la base de datos."""
    _init_torneos_tablas()
    tid = str(data.get('tournament_id', '')).strip()
    if not tid:
        return {"ok": False, "error": "tournament_id requerido"}
    detalle_raw = data.get('detalle_json')
    if isinstance(detalle_raw, dict):
        detalle_str = json.dumps(detalle_raw, ensure_ascii=False)
    elif isinstance(detalle_raw, str) and detalle_raw.strip():
        detalle_str = detalle_raw
    else:
        detalle_str = None
    try:
        with get_db() as conn:
            conn.execute("""
                INSERT INTO torneos_bga (tournament_id, tournament_name, game, status, current_round, bga_url, total_players, activo, detalle_json, actualizado_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
                ON CONFLICT(tournament_id) DO UPDATE SET
                    tournament_name = excluded.tournament_name,
                    game = excluded.game,
                    status = excluded.status,
                    current_round = excluded.current_round,
                    bga_url = excluded.bga_url,
                    total_players = excluded.total_players,
                    detalle_json = COALESCE(excluded.detalle_json, torneos_bga.detalle_json),
                    actualizado_en = datetime('now')
            """, (
                tid,
                str(data.get('tournament_name', 'Torneo BGA')),
                str(data.get('game', '')),
                str(data.get('status', 'En progreso')),
                data.get('current_round'),
                str(data.get('bga_url', '')),
                int(data.get('total_players', 0)),
                detalle_str
            ))
        return {"ok": True, "tournament_id": tid}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def guardar_participante_torneo(data: dict) -> dict:
    """Inserta o actualiza un participante de torneo BGA."""
    _init_torneos_tablas()
    try:
        with get_db() as conn:
            conn.execute("""
                INSERT INTO torneo_participantes
                    (tournament_id, bga_username, nick_aj, jugador_id, rank_actual, score, eliminado, actualizado_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(tournament_id, bga_username) DO UPDATE SET
                    nick_aj = excluded.nick_aj,
                    jugador_id = excluded.jugador_id,
                    rank_actual = excluded.rank_actual,
                    score = excluded.score,
                    eliminado = excluded.eliminado,
                    actualizado_en = datetime('now')
            """, (
                str(data.get('tournament_id', '')),
                str(data.get('bga_username', '')),
                data.get('nick_aj'),
                data.get('jugador_id'),
                data.get('rank_actual'),
                str(data.get('score', '')),
                int(data.get('eliminado', 0))
            ))
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def esta_puntos_asignados(tournament_id: str, bga_username: str) -> bool:
    """Verifica si un participante ya recibió puntos para un torneo específico."""
    _init_torneos_tablas()
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT puntos_asignados FROM torneo_participantes 
                WHERE tournament_id = ? AND UPPER(bga_username) = UPPER(?)
            """, (tournament_id, bga_username))
            row = cur.fetchone()
            if row and row["puntos_asignados"] and int(row["puntos_asignados"]) > 0:
                return True
        return False
    except Exception:
        return False


def marcar_puntos_asignados(tournament_id: str, bga_username: str, puntos: int) -> bool:
    """Registra la cantidad de puntos asignados a un participante para evitar duplicidad."""
    _init_torneos_tablas()
    try:
        with get_db() as conn:
            conn.execute("""
                UPDATE torneo_participantes 
                SET puntos_asignados = ?, actualizado_en = datetime('now')
                WHERE tournament_id = ? AND UPPER(bga_username) = UPPER(?)
            """, (puntos, tournament_id, bga_username))
            conn.commit()
        return True
    except Exception:
        return False


CONFIG_ECONOMIA_PATH = os.path.join(PROJECT_ROOT, "config_economia.json")


def obtener_config_economia() -> dict:
    """Retorna la configuración económica oficial de config_economia.json."""
    if os.path.exists(CONFIG_ECONOMIA_PATH):
        try:
            with open(CONFIG_ECONOMIA_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ [Economía] Error leyendo config_economia.json: {e}")
    return {
        "meta_temporada_puntos": 1000,
        "arcade": {
            "costo_ficha_entrada": 10,
            "renta_pasiva_diaria": {"1": 3, "2": 2, "3": 1},
            "bono_semanal_podio": {"1": 5, "2": 4, "3": 3}
        },
        "ranking_principal": {
            "bono_semanal_podio": {"1": 10, "2": 9, "3": 8}
        },
        "torneos_bga": {
            "asistencia": 1,
            "podio": {"1": 3, "2": 2, "3": 1}
        },
        "aportes_comunitarios": {
            "puntos_por_juego_creado": 1,
            "puntos_por_voto_encuesta": 1,
            "puntos_por_trivia_correcta": 10,
            "puntos_por_criptico_resuelto": 10
        }
    }


def guardar_config_economia(nueva_cfg: dict) -> dict:
    """Valida y guarda la configuración económica en config_economia.json."""
    if not isinstance(nueva_cfg, dict):
        return {"ok": False, "error": "configuracion_invalida_debe_ser_objeto"}
    try:
        current = obtener_config_economia()

        def _sanitize_dict(source, target):
            for k, v in source.items():
                if isinstance(v, dict):
                    if k not in target or not isinstance(target[k], dict):
                        target[k] = {}
                    _sanitize_dict(v, target[k])
                elif isinstance(v, (int, float)):
                    target[k] = max(0, int(v))
                elif isinstance(v, str) and v.isdigit():
                    target[k] = max(0, int(v))

        _sanitize_dict(nueva_cfg, current)

        temp_path = CONFIG_ECONOMIA_PATH + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)
        os.replace(temp_path, CONFIG_ECONOMIA_PATH)
        return {"ok": True, "config": current, "mensaje": "Configuración económica actualizada correctamente."}
    except Exception as e:
        print(f"⚠️ [Economía] Error guardando config_economia.json: {e}")
        return {"ok": False, "error": str(e)}


def obtener_puntos_torneo_bga(rank: int) -> tuple[int, str]:
    """
    Retorna los puntos oficiales del club para torneos BGA según config_economia.json y ESTRUCTURA_MACROJUEGO.md:
    🥇 1º Lugar: +3 PTS (Podio 1)
    🥈 2º Lugar: +2 PTS (Podio 2)
    🥉 3º Lugar: +1 PT  (Podio 3)
    🎮 Asistencia / Participación: +1 PT
    """
    pts_podio = {1: 3, 2: 2, 3: 1}
    pts_asistencia = 1
    try:
        cfg = obtener_config_economia()
        bga_cfg = cfg.get("torneos_bga", {})
        podio_map = bga_cfg.get("podio", {})
        pts_podio = {int(k): int(v) for k, v in podio_map.items()}
        pts_asistencia = int(bga_cfg.get("asistencia", pts_asistencia))
    except Exception:
        pass

    if rank in pts_podio:
        return pts_podio[rank], f"{rank}º lugar (Podio BGA)"
    return pts_asistencia, f"{rank}º lugar (Participación BGA)"


def reconciliar_puntos_torneos_pendientes(identificador: str) -> list[dict[str, object]]:
    """
    Revisa si un miembro vinculado tiene participaciones en torneos BGA terminados
    con puntos pendientes de asignar (puntos_asignados == 0 o NULL) y los acredita
    directamente en su saldo oficial sin exigir registro web previo.
    """
    _init_torneos_tablas()
    clean_id = (identificador or "").strip()
    if not clean_id:
        return []

    digits = normalizar_telefono(clean_id)
    puntos_acreditados: list[dict[str, object]] = []

    try:
        with get_db() as conn:
            cur = conn.cursor()
            row = None
            if len(digits) >= 7:
                cur.execute("SELECT * FROM jugadores WHERE telefono LIKE ? OR telefono = ?", (f"%{digits[-8:]}", digits))
                row = cur.fetchone()
            if not row:
                cur.execute("SELECT * FROM jugadores WHERE UPPER(nick) = UPPER(?)", (clean_id,))
                row = cur.fetchone()
            if not row and digits:
                cur.execute("SELECT * FROM jugadores WHERE telefono = ?", (digits,))
                row = cur.fetchone()

            if not row:
                return []

            jugador = dict(row)

            target_nick = str(jugador.get("nick") or "").strip()
            web_nick = str(jugador.get("nick_web") or "").strip()
            bga_user = str(jugador.get("bga_username") or "").strip()
            effective_nick = web_nick or target_nick

            cur.execute(f"""
                SELECT p.id as part_id, p.tournament_id, p.bga_username, p.rank_actual, t.tournament_name
                FROM torneo_participantes p
                LEFT JOIN torneos_bga t ON p.tournament_id = t.tournament_id
                WHERE (p.puntos_asignados IS NULL OR p.puntos_asignados = 0)
                  AND p.rank_actual IS NOT NULL AND p.rank_actual < 999
                  AND {_SQL_TORNEO_BGA_FINALIZADO}
                  AND (
                    (? != '' AND UPPER(p.bga_username) = UPPER(?)) OR
                    (? != '' AND p.nick_aj IS NOT NULL AND UPPER(p.nick_aj) = UPPER(?)) OR
                    (? != '' AND UPPER(p.bga_username) = UPPER(?)) OR
                    (? != '' AND UPPER(p.bga_username) = UPPER(?))
                  )
            """, (
                bga_user, bga_user,
                target_nick, target_nick,
                target_nick, target_nick,
                web_nick, web_nick
            ))
            pending_rows = [dict(r) for r in cur.fetchall()]

            for item in pending_rows:
                part_id = item["part_id"]
                tid = item["tournament_id"]
                rk = int(item["rank_actual"] or 999)
                tname = str(item["tournament_name"] or "Torneo BGA")

                pts, reason = obtener_puntos_torneo_bga(rk)

                cur.execute("UPDATE jugadores SET puntos = COALESCE(puntos, 0) + ? WHERE nick = ?", (pts, target_nick))
                cur.execute("SELECT puntos FROM jugadores WHERE nick = ?", (target_nick,))
                row_s = cur.fetchone()
                nuevo_saldo = int(row_s["puntos"]) if row_s else pts

                now_iso = datetime.datetime.now().isoformat()
                try:
                    cur.execute("""
                        INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
                        VALUES (?, ?, 'TORNEO_BGA_REGISTRO_WEB', ?, ?, ?)
                    """, (now_iso, target_nick, f"Torneo BGA (Acreditado por registro web): {tname} — {reason}", pts, nuevo_saldo))
                except Exception:
                    pass

                cur.execute("""
                    UPDATE torneo_participantes 
                    SET nick_aj = ?, puntos_asignados = ?, actualizado_en = datetime('now')
                    WHERE id = ?
                """, (effective_nick, pts, part_id))

                conn.commit()
                puntos_acreditados.append({
                    "tournament_id": tid,
                    "tournament_name": tname,
                    "rank": rk,
                    "points": pts,
                    "reason": reason
                })

            if puntos_acreditados:
                try:
                    exportar_ranking_json()
                except Exception:
                    pass

        return puntos_acreditados
    except Exception as e:
        print(f"⚠️ [Torneos] Error en reconciliar_puntos_torneos_pendientes: {e}")
        return []


def obtener_jugadores_todos() -> list:
    """Retorna todos los jugadores con nick, telefono, nombre_agenda_admin, nick_web, bga_username y estado web."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT nick, telefono, nombre_agenda_admin, nombre_perfil_ws, 
                       nick_web, COALESCE(bga_username, '') as bga_username, puntos,
                       COALESCE(tiene_clave_privada, 0) as tiene_clave_privada, password_hash
                FROM jugadores 
                WHERE estado = 'Activo' OR estado IS NULL
            """)
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        print(f"⚠️ [Torneos] Error obteniendo jugadores: {e}")
        return []


def obtener_miembros_identidades() -> list[dict[str, object]]:
    """
    Retorna la lista unificada de identidades para la Tabla Maestra del Panel Admin:
    Mapeo de los 4 identificadores (Teléfono, Nick Web, Nombre Agenda Admin, Nick BGA),
    saldo oficial de puntos, estado de registro web y conteo de torneos jugados / pendientes.
    """
    _init_torneos_tablas()
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT 
                    COALESCE(j.telefono, '') as telefono,
                    j.nick,
                    COALESCE(j.nick_web, '') as nick_web,
                    COALESCE(j.nombre_agenda_admin, '') as nombre_agenda_admin,
                    COALESCE(j.nombre_perfil_ws, '') as nombre_perfil_ws,
                    COALESCE(j.bga_username, '') as bga_username,
                    COALESCE(j.puntos, 0) as puntos,
                    COALESCE(j.tiene_clave_privada, 0) as tiene_clave_privada,
                    j.password_hash
                FROM jugadores j
                WHERE j.estado = 'Activo' OR j.estado IS NULL
                ORDER BY j.puntos DESC, j.nick ASC
            """)
            jugadores_raw = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT 
                    p.bga_username,
                    UPPER(p.bga_username) as bga_u,
                    UPPER(COALESCE(p.nick_aj, '')) as nick_aj_u,
                    COALESCE(p.puntos_asignados, 0) as puntos_asig,
                    COALESCE(p.rank_actual, 999) as rank_actual,
                    COALESCE(t.status, '') as t_status,
                    COALESCE(t.activo, 1) as t_activo
                FROM torneo_participantes p
                LEFT JOIN torneos_bga t ON p.tournament_id = t.tournament_id
            """)
            torneos_raw = [dict(r) for r in cur.fetchall()]

            def _es_torneo_terminado(t_row: dict[str, object]) -> bool:
                raw_act = t_row.get("t_activo")
                act = int(str(raw_act)) if raw_act is not None else 1
                return act == 0 or _status_bga_es_finalizado(t_row.get("t_status"))

            res: list[dict[str, object]] = []
            bga_matched_upper: set[str] = set()

            for j in jugadores_raw:
                tel = str(j.get("telefono") or "").strip()
                nick = str(j.get("nick") or "").strip()
                web_nick = str(j.get("nick_web") or "").strip()
                agenda = str(j.get("nombre_agenda_admin") or "").strip()
                ws_name = str(j.get("nombre_perfil_ws") or "").strip()
                bga_u = str(j.get("bga_username") or "").strip()
                
                tiene_priv = int(j.get("tiene_clave_privada") or 0) == 1
                has_hash = bool(j.get("password_hash"))
                reg_web = tiene_priv or has_hash or bool(web_nick)

                bga_cmp = bga_u.upper() if bga_u else None
                nick_cmp = nick.upper() if nick else None
                web_cmp = web_nick.upper() if web_nick else None
                agenda_cmp = agenda.upper() if agenda else None
                ws_cmp = ws_name.upper() if ws_name else None
                cand_names = {c for c in (bga_cmp, nick_cmp, web_cmp, agenda_cmp, ws_cmp) if c}

                t_jugados = 0
                t_pendientes = 0
                pts_pendientes = 0
                inferred_bga = bga_u
                for t in torneos_raw:
                    tbga = str(t["bga_u"] or "").strip()
                    taj = str(t["nick_aj_u"] or "").strip()
                    matched = False
                    if bga_cmp and tbga == bga_cmp:
                        matched = True
                    elif taj and taj in cand_names:
                        matched = True
                    elif tbga and tbga in cand_names:
                        matched = True
                        if not inferred_bga:
                            inferred_bga = str(t.get("bga_username") or "").strip()

                    if matched:
                        if tbga:
                            bga_matched_upper.add(tbga)
                        t_jugados += 1
                        if int(t["puntos_asig"] or 0) == 0:
                            t_pendientes += 1
                            rk = int(t["rank_actual"] or 999)
                            if _es_torneo_terminado(t) and rk < 999:
                                pts_t, _ = obtener_puntos_torneo_bga(rk)
                                pts_pendientes += pts_t

                # Filtrar filas fantasma (ej. seeds demo o nicks importados sin teléfono, sin web,
                # sin agenda, sin BGA y sin torneos jugados) que no aportan nada en Identidades & BGA.
                tiene_vinculo_real = bool(tel or web_nick or agenda or inferred_bga or t_jugados > 0)
                if not tiene_vinculo_real:
                    continue

                res.append({
                    "telefono": tel,
                    "nick": nick,
                    "nick_web": web_nick,
                    "nombre_agenda_admin": agenda,
                    "nombre_perfil_ws": ws_name,
                    "bga_username": inferred_bga,
                    "puntos": int(j.get("puntos") or 0),
                    "puntos_pendientes": pts_pendientes,
                    "registrado_web": reg_web,
                    "tiene_clave_privada": tiene_priv,
                    "torneos_jugados": t_jugados,
                    "torneos_pendientes": t_pendientes
                })

            # Agregar jugadores BGA de torneos que aún no están vinculados a ningún miembro/teléfono
            unlinked_names: dict[str, str] = {}
            unlinked_counts: dict[str, list[int]] = {}
            for t in torneos_raw:
                tbga = str(t.get("bga_u") or "").strip()
                if not tbga or tbga in bga_matched_upper:
                    continue
                if tbga not in unlinked_counts:
                    unlinked_names[tbga] = str(t.get("bga_username") or "").strip()
                    unlinked_counts[tbga] = [0, 0, 0]
                unlinked_counts[tbga][0] += 1
                if int(t["puntos_asig"] or 0) == 0:
                    unlinked_counts[tbga][1] += 1
                    rk = int(t["rank_actual"] or 999)
                    if _es_torneo_terminado(t) and rk < 999:
                        pts_t, _ = obtener_puntos_torneo_bga(rk)
                        unlinked_counts[tbga][2] += pts_t

            for tbga in sorted(unlinked_counts.keys()):
                counts = unlinked_counts[tbga]
                res.append({
                    "telefono": "",
                    "nick": "",
                    "nick_web": "",
                    "nombre_agenda_admin": "",
                    "nombre_perfil_ws": "",
                    "bga_username": unlinked_names[tbga],
                    "puntos": 0,
                    "puntos_pendientes": counts[2],
                    "registrado_web": False,
                    "tiene_clave_privada": False,
                    "torneos_jugados": counts[0],
                    "torneos_pendientes": counts[1],
                    "sin_vincular_bga": True
                })

            return res
    except Exception as e:
        print(f"⚠️ [Identidades] Error en obtener_miembros_identidades: {e}")
        return []


def vincular_jugador_bga(identificador: str, bga_username: str | None = None, nuevo_nick: str | None = None, nombre_agenda: str | None = None, nick_web: str | None = None) -> dict:
    """
    Asocia o actualiza el bga_username, nick, nick_web y/o nombre_agenda_admin de un miembro
    identificado por su teléfono o por su nick actual. Si no existe y se provee teléfono, lo auto-crea.
    Ejecuta reconciliación retroactiva inmediata si el miembro tiene cuenta web activa.
    """
    clean_id = identificador.strip()
    if not clean_id:
        return {"ok": False, "error": "identificador_requerido"}
    
    digits = normalizar_telefono(clean_id)
    try:
        with get_db() as conn:
            cur = conn.cursor()
            row = None
            if len(digits) >= 7:
                suffix = digits[-8:]
                cur.execute("SELECT * FROM jugadores WHERE telefono LIKE ? OR telefono = ?", (f"%{suffix}", digits))
                row = cur.fetchone()
            if not row:
                cur.execute("SELECT * FROM jugadores WHERE UPPER(nick) = UPPER(?)", (clean_id,))
                row = cur.fetchone()
            if not row and digits:
                cur.execute("SELECT * FROM jugadores WHERE telefono = ?", (digits,))
                row = cur.fetchone()

            if not row:
                if len(digits) >= 7:
                    # Auto-crear miembro con teléfono para torneos aunque no esté registrado en la web aún
                    clean_phone = digits
                    chosen_nick = (nuevo_nick or nick_web or nombre_agenda or f"Jugador_{clean_phone[-4:]}").strip()
                    cur.execute("""
                        INSERT INTO jugadores (nick, telefono, nombre_agenda_admin, bga_username, nick_web, puntos, estado)
                        VALUES (?, ?, ?, ?, ?, 0, 'Activo')
                    """, (
                        chosen_nick,
                        clean_phone,
                        (nombre_agenda or "").strip() or None,
                        (bga_username or "").strip() or None,
                        (nick_web or "").strip() or None
                    ))
                    conn.commit()
                    cur.execute("SELECT * FROM jugadores WHERE telefono = ?", (clean_phone,))
                    row = cur.fetchone()

            if not row:
                return {"ok": False, "error": f"Miembro con identificador '{clean_id}' no encontrado en la base de datos."}

            target_nick = str(row["nick"])
            row_telefono = str(row["telefono"] or "")
            updates: list[str] = []
            params: list[object] = []

            if bga_username is not None:
                updates.append("bga_username = ?")
                params.append(bga_username.strip())

            if nombre_agenda is not None:
                updates.append("nombre_agenda_admin = ?")
                params.append(nombre_agenda.strip())

            if nick_web is not None:
                updates.append("nick_web = ?")
                params.append(nick_web.strip() if nick_web.strip() else None)

            if nuevo_nick is not None and nuevo_nick.strip() and nuevo_nick.strip() != target_nick:
                updates.append("nick = ?")
                params.append(nuevo_nick.strip())

            if updates:
                params.append(target_nick)
                sql = f"UPDATE jugadores SET {', '.join(updates)} WHERE nick = ?"
                cur.execute(sql, tuple(params))
                conn.commit()

            cur.execute("""
                SELECT nick, telefono, nombre_agenda_admin, nombre_perfil_ws, nick_web,
                       COALESCE(bga_username, '') as bga_username, puntos 
                FROM jugadores 
                WHERE nick = ? OR telefono = ?
            """, (nuevo_nick or target_nick, row_telefono))
            act = cur.fetchone()

            # Reconciliación automática de torneos pendientes si el miembro está registrado en la web
            puntos_retroactivos = reconciliar_puntos_torneos_pendientes(nuevo_nick or target_nick)
            total_pts = sum(int(str(p.get("points", 0) or 0)) for p in puntos_retroactivos)
            msg = f"Identidad actualizada. Se liquidaron {len(puntos_retroactivos)} torneo(s) pendiente(s) otorgando +{total_pts} PTS." if puntos_retroactivos else "Identidad actualizada correctamente."

            res_data: dict[str, object] = {
                "ok": True,
                "jugador": dict(act) if act else None,
                "puntos_retroactivos": puntos_retroactivos,
                "total_puntos_sumados": total_pts,
                "mensaje": msg
            }
            return res_data
    except Exception as e:
        return {"ok": False, "error": str(e)}


def sumar_puntos_jugador(nick_o_telefono: str, puntos: int, razon: str = "") -> dict:
    """Suma puntos a un jugador por nick o teléfono y registra la transacción en historial_transacciones."""
    clean_id = nick_o_telefono.strip()
    digits = normalizar_telefono(clean_id)
    try:
        with get_db() as conn:
            cur = conn.cursor()
            row = None
            if len(digits) >= 7:
                cur.execute("SELECT nick, puntos FROM jugadores WHERE telefono LIKE ? OR telefono = ?", (f"%{digits[-8:]}", digits))
                row = cur.fetchone()
            if not row:
                cur.execute("SELECT nick, puntos FROM jugadores WHERE UPPER(nick) = UPPER(?)", (clean_id,))
                row = cur.fetchone()

            if not row:
                return {"ok": False, "error": f"Jugador {nick_o_telefono} no encontrado para asignar puntos"}

            nick = row["nick"]
            saldo_anterior = int(row["puntos"] or 0)
            nuevo_saldo = saldo_anterior + puntos

            cur.execute("""
                UPDATE jugadores 
                SET puntos = ?, total_ganados = COALESCE(total_ganados, 0) + ?, ultima_actividad = datetime('now')
                WHERE nick = ?
            """, (nuevo_saldo, puntos, nick))

            # Transacción oficial en historial
            try:
                import datetime as _dt
                now_iso = _dt.datetime.now().isoformat()
                cur.execute("""
                    INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
                    VALUES (?, ?, 'TORNEO_BGA', ?, ?, ?)
                """, (now_iso, nick, razon, puntos, nuevo_saldo))
            except Exception as e_tx:
                print(f"⚠️ Error registrando historial tx torneo: {e_tx}")

            conn.commit()
            try:
                exportar_ranking_json()
            except Exception:
                pass

        # Verificar medallas automáticas (fuera del with para evitar locks)
        try:
            verificar_y_otorgar_medallas_automaticas(nick)
        except Exception as e_med:
            print(f"⚠️ [Medallas] Error en verificación automática post-puntos: {e_med}")

        return {"ok": True, "nick": nick, "puntos_sumados": puntos, "nuevo_saldo": nuevo_saldo}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def obtener_torneos_activos() -> list:
    """Retorna todos los torneos activos con sus participantes vinculados a miembros del club."""
    _init_torneos_tablas()
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT t.*, COUNT(p.id) as participantes_guardados
                FROM torneos_bga t
                LEFT JOIN torneo_participantes p ON t.tournament_id = p.tournament_id
                WHERE t.activo = 1
                GROUP BY t.id
                ORDER BY t.actualizado_en DESC
            """)
            torneos = [dict(r) for r in cur.fetchall()]
            for t in torneos:
                cur.execute("""
                    SELECT p.*, j.telefono, j.nombre_agenda_admin, j.nick_web, j.puntos as puntos_actuales
                    FROM torneo_participantes p
                    LEFT JOIN jugadores j ON (
                        (p.nick_aj IS NOT NULL AND (UPPER(p.nick_aj) = UPPER(j.nick) OR UPPER(p.nick_aj) = UPPER(COALESCE(j.nick_web, '')))) OR 
                        (p.bga_username IS NOT NULL AND UPPER(p.bga_username) = UPPER(COALESCE(j.bga_username, '')))
                    )
                    WHERE p.tournament_id = ?
                    ORDER BY p.rank_actual ASC
                """, (t['tournament_id'],))
                t['participantes'] = [dict(r) for r in cur.fetchall()]
            return torneos
    except Exception as e:
        print(f"⚠️ [Torneos] Error obteniendo torneos activos: {e}")
        return []


def _status_bga_es_finalizado(status: object) -> bool:
    """Detecta si un texto de estado BGA corresponde a torneo finalizado."""
    st = str(status or "").strip().lower()
    return any(kw in st for kw in ("finaliz", "terminad", "complet", "finish", "ended", "over"))


_SQL_TORNEO_BGA_FINALIZADO = (
    "(t.activo = 0 OR "
    "LOWER(COALESCE(t.status, '')) LIKE '%finaliz%' OR "
    "LOWER(COALESCE(t.status, '')) LIKE '%terminad%' OR "
    "LOWER(COALESCE(t.status, '')) LIKE '%complet%' OR "
    "LOWER(COALESCE(t.status, '')) LIKE '%finish%' OR "
    "LOWER(COALESCE(t.status, '')) LIKE '%ended%' OR "
    "LOWER(COALESCE(t.status, '')) LIKE '%over%')"
)


def obtener_torneos_publicos() -> dict:
    """Retorna torneos activos y finalizados sanitizados (sin PII) con detalle_json e inscritos."""
    _init_torneos_tablas()
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT t.*
                FROM torneos_bga t
                ORDER BY t.actualizado_en DESC
            """)
            rows = [dict(r) for r in cur.fetchall()]
            activos = []
            finalizados = []
            for t in rows:
                cur.execute("""
                    SELECT p.bga_username, p.nick_aj, p.rank_actual, p.score, p.eliminado, p.puntos_asignados,
                           j.nick_web
                    FROM torneo_participantes p
                    LEFT JOIN jugadores j ON (
                        (p.nick_aj IS NOT NULL AND (UPPER(p.nick_aj) = UPPER(j.nick) OR UPPER(p.nick_aj) = UPPER(COALESCE(j.nick_web, '')))) OR
                        (p.bga_username IS NOT NULL AND UPPER(p.bga_username) = UPPER(COALESCE(j.bga_username, '')))
                    )
                    WHERE p.tournament_id = ?
                    ORDER BY CASE WHEN p.rank_actual IS NULL OR p.rank_actual <= 0 THEN 9999 ELSE p.rank_actual END ASC,
                             p.bga_username ASC
                """, (t['tournament_id'],))
                t['participantes'] = [dict(r) for r in cur.fetchall()]
                detalle = {}
                raw_det = t.pop('detalle_json', None)
                if raw_det:
                    try:
                        detalle = json.loads(raw_det)
                    except Exception:
                        detalle = {}
                t['detalle'] = detalle
                if _es_torneo_finalizado_row(t):
                    finalizados.append(t)
                else:
                    activos.append(t)
            return {"activos": activos, "finalizados": finalizados}
    except Exception as e:
        print(f"⚠️ [Torneos] Error obteniendo torneos públicos: {e}")
        return {"activos": [], "finalizados": []}


def obtener_ranking_campeones_bga() -> list:
    """Agrega el medallero histórico (1.°, 2.°, 3.°) y listado de torneos ganados por jugador."""
    _init_torneos_tablas()
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT p.tournament_id, p.bga_username, p.nick_aj, p.rank_actual, p.score, p.puntos_asignados,
                       j.nick_web, t.tournament_name, t.game, t.status, t.activo, t.actualizado_en
                FROM torneo_participantes p
                JOIN torneos_bga t ON t.tournament_id = p.tournament_id
                LEFT JOIN jugadores j ON (
                    (p.nick_aj IS NOT NULL AND (UPPER(p.nick_aj) = UPPER(j.nick) OR UPPER(p.nick_aj) = UPPER(COALESCE(j.nick_web, '')))) OR
                    (p.bga_username IS NOT NULL AND UPPER(p.bga_username) = UPPER(COALESCE(j.bga_username, '')))
                )
                WHERE p.rank_actual IN (1, 2, 3)
                  AND {_SQL_TORNEO_BGA_FINALIZADO}
                ORDER BY t.actualizado_en DESC, p.rank_actual ASC
            """)
            rows = [dict(r) for r in cur.fetchall()]
            ranking_map = {}
            for r in rows:
                display_name = (r.get('nick_web') or r.get('nick_aj') or r.get('bga_username') or '').strip()
                if not display_name:
                    continue
                key = display_name.upper()
                if key not in ranking_map:
                    ranking_map[key] = {
                        'jugador': display_name,
                        'bga_username': r.get('bga_username') or '',
                        'vinculado': bool(r.get('nick_aj') or r.get('nick_web')),
                        'oro': 0,
                        'plata': 0,
                        'bronce': 0,
                        'total_podios': 0,
                        'puntos_torneos': 0,
                        'torneos': []
                    }
                entry = ranking_map[key]
                rk = int(r.get('rank_actual') or 0)
                if rk == 1:
                    entry['oro'] += 1
                elif rk == 2:
                    entry['plata'] += 1
                elif rk == 3:
                    entry['bronce'] += 1
                entry['total_podios'] += 1
                entry['puntos_torneos'] += int(r.get('puntos_asignados') or 0)
                entry['torneos'].append({
                    'tournament_id': r.get('tournament_id'),
                    'tournament_name': r.get('tournament_name') or 'Torneo BGA',
                    'game': r.get('game') or '',
                    'rank': rk,
                    'score': r.get('score') or '',
                    'fecha': str(r.get('actualizado_en') or '')[:10]
                })
            res = list(ranking_map.values())
            res.sort(key=lambda x: (-x['oro'], -x['plata'], -x['bronce'], -x['puntos_torneos'], x['jugador'].lower()))
            return res
    except Exception as e:
        print(f"⚠️ [Torneos] Error obteniendo ranking campeones BGA: {e}")
        return []


def finalizar_torneo(tournament_id: str) -> dict:
    """Marca el torneo como finalizado y limpia los datos transitorios."""
    _init_torneos_tablas()
    tid = tournament_id.strip()
    try:
        with get_db() as conn:
            # Marcar como inactivo (mantiene histórico del torneo)
            conn.execute("""
                UPDATE torneos_bga SET activo = 0, status = 'Finalizado', actualizado_en = datetime('now')
                WHERE tournament_id = ?
            """, (tid,))
            # Limpiar participantes transitorios (datos de sesión, no históricos)
            conn.execute("DELETE FROM torneo_participantes WHERE tournament_id = ?", (tid,))
        return {
            "ok": True,
            "tournament_id": tid,
            "mensaje": f"Torneo {tid} finalizado y datos transitorios limpiados."
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


# =============================================================================
# SOLICITUDES DE MIEMBROS DESTACADOS (CREADORES, ORG., TIENDAS, INSTAGRAM, DIVULG.)
# =============================================================================

def guardar_solicitud_miembro(nick: str, categoria: str, nombre_proyecto: str,
                               enlace: str, descripcion: str = '',
                               imagen_url: str = '') -> dict:
    """Guarda una nueva solicitud de miembro destacado (Creadores, Tiendas, etc.)."""
    CATEGORIAS_VALIDAS = {'creadores', 'organizaciones', 'tiendas', 'participantes', 'divulgadores', 'comunidades'}
    nick = nick.strip()
    categoria = categoria.strip().lower()
    nombre_proyecto = nombre_proyecto.strip()
    enlace = enlace.strip()

    if not nick or not categoria or not nombre_proyecto or not enlace:
        return {'ok': False, 'error': 'nick, categoria, nombre_proyecto y enlace son obligatorios'}
    if categoria not in CATEGORIAS_VALIDAS:
        return {'ok': False, 'error': f'categoria_invalida: {categoria}. Válidas: {CATEGORIAS_VALIDAS}'}

    try:
        with get_db() as conn:
            conn.execute("""
                INSERT INTO solicitudes_miembros
                    (nick, categoria, nombre_proyecto, enlace, descripcion, imagen_url)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (nick, categoria, nombre_proyecto, enlace, descripcion or '', imagen_url or ''))
        return {'ok': True, 'mensaje': f'Solicitud de {categoria} registrada. Pendiente de revisión.'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def listar_solicitudes_miembros(estado: str = 'pendiente') -> list:
    """Retorna solicitudes de miembros filtradas por estado (pendiente/aprobado/rechazado)."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            if estado == 'todas':
                cur.execute("""
                    SELECT id, nick, categoria, nombre_proyecto, enlace, descripcion,
                           imagen_url, estado, admin_revisor, fecha_solicitud, fecha_revision
                    FROM solicitudes_miembros ORDER BY fecha_solicitud DESC
                """)
            else:
                cur.execute("""
                    SELECT id, nick, categoria, nombre_proyecto, enlace, descripcion,
                           imagen_url, estado, admin_revisor, fecha_solicitud, fecha_revision
                    FROM solicitudes_miembros WHERE estado = ? ORDER BY fecha_solicitud DESC
                """, (estado,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        print(f"⚠️ [Solicitudes] Error listando: {e}")
        return []


def moderar_solicitud_miembro(solicitud_id: int, accion: str, admin_nick: str = '') -> dict:
    """Aprueba o rechaza una solicitud de miembro destacado."""
    if accion not in ('aprobar', 'rechazar'):
        return {'ok': False, 'error': 'accion debe ser aprobar o rechazar'}
    nuevo_estado = 'aprobado' if accion == 'aprobar' else 'rechazado'
    try:
        with get_db() as conn:
            conn.execute("""
                UPDATE solicitudes_miembros
                SET estado = ?, admin_revisor = ?, fecha_revision = datetime('now')
                WHERE id = ?
            """, (nuevo_estado, admin_nick or 'Admin', solicitud_id))
        return {'ok': True, 'solicitud_id': solicitud_id, 'nuevo_estado': nuevo_estado}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


# =============================================================================
# SOLICITUDES DE EVENTOS Y CONCURSOS DE LA COMUNIDAD
# =============================================================================

def guardar_solicitud_evento(nick: str, categoria: str, nombre: str, organizador: str,
                             fecha_inicio: str, fecha_termino: str, ubicacion: str,
                             descripcion: str, costo: str = 'Gratis',
                             requiere_inscripcion: str = 'No', cupos_limitados: str = 'No',
                             link_red_social: str = '', link_afiche: str = '') -> dict:
    """Registra una nueva solicitud de evento o concurso de la comunidad."""
    categoria = 'Concurso' if categoria.strip().lower() == 'concurso' else 'Evento'
    nick = nick.strip()
    nombre = nombre.strip()
    organizador = organizador.strip()
    ubicacion = ubicacion.strip()
    descripcion = descripcion.strip()
    link_red_social = link_red_social.strip()
    link_afiche = link_afiche.strip()

    if not nick or not nombre or not organizador or not fecha_inicio or not fecha_termino or not ubicacion or not descripcion or not link_red_social or not link_afiche:
        return {'ok': False, 'error': 'Todos los campos obligatorios del evento deben ser completados.'}

    try:
        with get_db() as conn:
            conn.execute("""
                INSERT INTO solicitudes_eventos
                    (nick, categoria, nombre, organizador, fecha_inicio, fecha_termino,
                     ubicacion, descripcion, costo, requiere_inscripcion, cupos_limitados,
                     link_red_social, link_afiche)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (nick, categoria, nombre, organizador, fecha_inicio, fecha_termino,
                  ubicacion, descripcion, costo or 'Gratis', requiere_inscripcion or 'No',
                  cupos_limitados or 'No', link_red_social, link_afiche))
        return {'ok': True, 'mensaje': f'{categoria} registrado con éxito. Pendiente de revisión por el equipo administrador.'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def listar_solicitudes_eventos(estado: str = 'pendiente') -> list:
    """Lista solicitudes de eventos filtradas por estado (pendiente/aprobado/rechazado/todas)."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            if estado == 'todas':
                cur.execute("SELECT * FROM solicitudes_eventos ORDER BY fecha_solicitud DESC")
            else:
                cur.execute("SELECT * FROM solicitudes_eventos WHERE estado = ? ORDER BY fecha_solicitud DESC", (estado,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
    except Exception as e:
        print(f"⚠️ [Eventos] Error listando solicitudes: {e}")
        return []


def moderar_solicitud_evento(evento_id: int, accion: str, admin_nick: str = '') -> dict:
    """Aprueba o rechaza una solicitud de evento o concurso."""
    if accion not in ('aprobar', 'rechazar'):
        return {'ok': False, 'error': 'accion debe ser aprobar o rechazar'}
    nuevo_estado = 'aprobado' if accion == 'aprobar' else 'rechazado'
    try:
        with get_db() as conn:
            conn.execute("""
                UPDATE solicitudes_eventos
                SET estado = ?, admin_revisor = ?, fecha_revision = datetime('now')
                WHERE id = ?
            """, (nuevo_estado, admin_nick or 'Admin', evento_id))
        return {'ok': True, 'evento_id': evento_id, 'nuevo_estado': nuevo_estado}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


# =============================================================================
# CONTROL DIARIO DEL MACROJUEGO & MOTOR DE CATCH-UP AUTOMATIZADO
# =============================================================================

def obtener_o_crear_config_dia(fecha: str | None = None) -> dict:
    """
    Retorna la configuración maestra del Macrojuego para una fecha dada (YYYY-MM-DD).
    Si no existe fila para hoy, la auto-inicializa de forma determinista.
    """
    if not fecha:
        fecha = datetime.datetime.now().strftime("%Y-%m-%d")

    with get_db() as conn:
        row = conn.execute("SELECT * FROM config_diaria_macrojuego WHERE fecha = ?", (fecha,)).fetchone()
        if row:
            return dict(row)

        # Generador determinista de puntos diarios basado en la fecha (40% 5p, 40% 10p, 20% 15p)
        dt = datetime.datetime.strptime(fecha, "%Y-%m-%d")
        seed = dt.year * 10000 + dt.month * 100 + dt.day
        rnd = (seed * 9301 + 49297) % 233280
        val = rnd / 233280.0
        if val < 0.40:
            pts_dia = 5
        elif val < 0.80:
            pts_dia = 10
        else:
            pts_dia = 15

        # Días oficiales de Catch-Up automático: Miércoles (2) y Domingo (6)
        catchup_auto = 1 if dt.weekday() in (2, 6) else 0

        conn.execute("""
            INSERT OR IGNORE INTO config_diaria_macrojuego
                (fecha, pts_grupal, pts_ataque, catchup_activo, catchup_umbral, catchup_multiplicador, damage_cap, notas)
            VALUES (?, ?, 10, ?, 100, 2, 25, 'Inicializado automáticamente')
        """, (fecha, pts_dia, catchup_auto))
        conn.commit()

        row = conn.execute("SELECT * FROM config_diaria_macrojuego WHERE fecha = ?", (fecha,)).fetchone()
        return dict(row) if row else {
            "fecha": fecha, "pts_grupal": pts_dia, "pts_ataque": 10,
            "catchup_activo": catchup_auto, "catchup_umbral": 100,
            "catchup_multiplicador": 2, "damage_cap": 25, "notas": ""
        }


def actualizar_config_dia(fecha: str | None = None, **kwargs) -> dict:
    """
    Actualiza cualquier parámetro de la Ficha Diaria del Macrojuego (puntos, switch x2, umbral, etc.).
    """
    if not fecha:
        fecha = datetime.datetime.now().strftime("%Y-%m-%d")

    # Asegurar que la fila exista
    obtener_o_crear_config_dia(fecha)

    campos_validos = ("pts_grupal", "pts_ataque", "catchup_activo", "catchup_umbral", "catchup_multiplicador", "damage_cap", "notas")
    updates = []
    params = []

    for k, v in kwargs.items():
        if k in campos_validos and v is not None:
            updates.append(f"{k} = ?")
            params.append(v)

    if not updates:
        return obtener_o_crear_config_dia(fecha)

    params.append(fecha)
    sql = f"UPDATE config_diaria_macrojuego SET {', '.join(updates)} WHERE fecha = ?"
    with get_db() as conn:
        conn.execute(sql, params)
        conn.commit()

    return obtener_o_crear_config_dia(fecha)


def acreditar_dia_por_lote(nicks, tipo: str = "grupal", autor: str = "Admin", fecha: str | None = None) -> dict:
    """
    Acredita puntos o detona sabotajes para una lista de jugadores según las reglas del día.
    El Administrador NO pasa números: el sistema calcula automáticamente según la Ficha Diaria,
    aplica Catch-Up x2 si el saldo < umbral, y ejecuta el Caparazón Azul con Damage Cap.
    """
    if not fecha:
        fecha = datetime.datetime.now().strftime("%Y-%m-%d")

    if isinstance(nicks, str):
        nicks = [n.strip() for n in nicks.replace("\n", ",").split(",") if n.strip()]

    if not nicks:
        return {"ok": False, "error": "nicks_vacios", "mensaje": "Ingresa al menos un Nick para acreditar."}

    cfg = obtener_o_crear_config_dia(fecha)
    pts_grupal = cfg.get("pts_grupal", 7)
    pts_ataque = cfg.get("pts_ataque", 10)
    catchup_activo = bool(cfg.get("catchup_activo", 0))
    catchup_umbral = cfg.get("catchup_umbral", 100)
    catchup_multiplicador = cfg.get("catchup_multiplicador", 2)

    tipo = tipo.lower().strip()
    ganadores = []
    impactados_sabotaje = []
    total_saboteadores = 0

    if tipo in ("grupal", "secreta"):
        for nick in nicks:
            with get_db() as conn:
                row = conn.execute("SELECT puntos FROM jugadores WHERE LOWER(nick) = LOWER(?)", (nick,)).fetchone()
                saldo_actual = row["puntos"] if row else 0

            es_catchup = catchup_activo and (saldo_actual < catchup_umbral)
            pts_base = pts_grupal if tipo == "grupal" else 10
            pts_final = (pts_base * catchup_multiplicador) if es_catchup else pts_base

            desc = f"Misión {'Grupal' if tipo == 'grupal' else 'Personal'} ({fecha})"
            if es_catchup:
                desc += f" [⚡ Catch-Up x{catchup_multiplicador}]"

            res = asignar_puntos(
                nick=nick,
                puntos=pts_final,
                tipo_evento="RETO_MACROJUEGO" if tipo == "grupal" else "MISION_SECRETA",
                descripcion=desc,
                autor=autor
            )

            tipo_entrega = "grupal" if tipo == "grupal" else "secreta_positiva"
            try:
                with get_db() as conn:
                    conn.execute("""
                        INSERT INTO misiones_entregas (nick, fecha_mision, tipo_mision, desafios_completados, pruebas_urls, estado, puntos_otorgados, admin_revisor, fecha_revision)
                        VALUES (?, ?, ?, '[]', '[]', 'aprobado', ?, ?, datetime('now'))
                        ON CONFLICT(nick, fecha_mision, tipo_mision) DO UPDATE SET
                            estado = 'aprobado', puntos_otorgados = excluded.puntos_otorgados, admin_revisor = excluded.admin_revisor, fecha_revision = datetime('now')
                    """, (nick, fecha, tipo_entrega, pts_final, autor))
                    conn.commit()
            except Exception:
                pass

            ganadores.append({
                "nick": nick,
                "pts_otorgados": pts_final,
                "catch_up": es_catchup,
                "saldo_nuevo": res.get("nuevo_saldo", saldo_actual + pts_final)
            })

    elif tipo in ("ataque", "caparazon"):
        total_saboteadores = len(nicks)
        for atacante in nicks:
            res_ataque: dict = ejecutar_contraataque(
                nick_atacante=atacante,
                puntos_restar=pts_ataque,
                descripcion=f"Caparazón Azul ({fecha})",
                autor=autor
            )
            detalles = res_ataque.get("detalles")
            if isinstance(detalles, list):
                for af in detalles:
                    if not isinstance(af, dict):
                        continue
                    nick_af = str(af.get("nick", ""))
                    descuento = int(af.get("descuento", pts_ataque))
                    nuevo_saldo = int(af.get("nuevo_saldo", 0))
                    existente = next((x for x in impactados_sabotaje if x["nick"].lower() == nick_af.lower()), None)
                    if existente:
                        existente["descuento_total"] += descuento
                        existente["nuevo_saldo"] = nuevo_saldo
                    else:
                        impactados_sabotaje.append({
                            "nick": nick_af,
                            "descuento_total": descuento,
                            "nuevo_saldo": nuevo_saldo
                        })

    exportar_ranking_json()

    return {
        "ok": True,
        "fecha": fecha,
        "tipo": tipo,
        "config": cfg,
        "ganadores": ganadores,
        "impactados_sabotaje": impactados_sabotaje,
        "total_saboteadores": total_saboteadores
    }


def obtener_reporte_movimientos_dia(fecha: str | None = None) -> dict:
    """
    Retorna los movimientos de puntos de la fecha para generar la tarjeta gráfica (1080x1350).
    Respeta el anonimato de los saboteadores: lista quién ganó puntos, quién fue impactado
    y el conteo total de Caparazones Azules detonados.
    """
    if not fecha:
        fecha = datetime.datetime.now().strftime("%Y-%m-%d")

    cfg = obtener_o_crear_config_dia(fecha)
    ganadores = []
    impactados = []
    saboteadores_count = 0

    with get_db() as conn:
        rows_ganadores = conn.execute("""
            SELECT nick, variacion_pts, descripcion, saldo_resultante
            FROM historial_transacciones
            WHERE variacion_pts > 0 AND date(timestamp) = date(?)
            ORDER BY variacion_pts DESC, timestamp ASC
        """, (fecha,)).fetchall()

        for r in rows_ganadores:
            ganadores.append({
                "nick": r["nick"],
                "pts": r["variacion_pts"],
                "motivo": r["descripcion"] or "Reto Cumplido",
                "saldo": r["saldo_resultante"]
            })

        rows_impactados = conn.execute("""
            SELECT nick, SUM(ABS(variacion_pts)) as total_descuento, MIN(saldo_resultante) as saldo_final
            FROM historial_transacciones
            WHERE tipo_evento = 'SABOTAJE_CONTRAATAQUE' AND date(timestamp) = date(?)
            GROUP BY LOWER(nick)
            ORDER BY total_descuento DESC
        """, (fecha,)).fetchall()

        for r in rows_impactados:
            impactados.append({
                "nick": r["nick"],
                "descuento": r["total_descuento"],
                "saldo_final": r["saldo_final"]
            })

        row_count = conn.execute("""
            SELECT COUNT(DISTINCT nick) as total
            FROM misiones_entregas
            WHERE tipo_mision = 'secreta_ataque' AND fecha_mision = ? AND estado = 'aprobado'
        """, (fecha,)).fetchone()
        saboteadores_count = row_count["total"] if row_count else 0

        if saboteadores_count == 0 and len(impactados) > 0:
            row_tx_count = conn.execute("""
                SELECT COUNT(DISTINCT descripcion) as total
                FROM historial_transacciones
                WHERE tipo_evento = 'SABOTAJE_CONTRAATAQUE' AND date(timestamp) = date(?)
            """, (fecha,)).fetchone()
            saboteadores_count = max(1, row_tx_count["total"] if row_tx_count else 1)

    return {
        "ok": True,
        "fecha": fecha,
        "config": cfg,
        "ganadores": ganadores,
        "impactados_sabotaje": impactados,
        "total_saboteadores": saboteadores_count
    }


# =============================================================================
# 👻 GHOSTRED — CANAL COMUNITARIO EFÍMERO (7 DÍAS) & MODERACIÓN
# =============================================================================

def purgar_chat_expirado() -> int:
    """
    Elimina físicamente los mensajes con más de 7 días de antigüedad.
    Se ejecuta automáticamente en cada lectura y transmisión.
    """
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chat_mensajes WHERE fecha < date('now', '-7 days')")
            purgados = cursor.rowcount
            if purgados > 0:
                conn.commit()
            return purgados
    except Exception as e:
        print(f"[GhostRed] Error en purga automática: {e}")
        return 0


def obtener_o_actualizar_palabras_censuradas(nuevas_palabras: str | None = None) -> list[str]:
    """
    Lee o actualiza la lista de palabras prohibidas separadas por coma en chat_moderacion_config.
    Retorna la lista de palabras limpias en minúsculas.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("CREATE TABLE IF NOT EXISTS chat_moderacion_config (id INTEGER PRIMARY KEY CHECK (id = 1), palabras_censuradas TEXT NOT NULL DEFAULT '', chat_habilitado INTEGER NOT NULL DEFAULT 1)")
        cursor.execute("INSERT OR IGNORE INTO chat_moderacion_config (id, palabras_censuradas, chat_habilitado) VALUES (1, '', 1)")
        
        if nuevas_palabras is not None:
            texto_guardar = nuevas_palabras.strip()
            cursor.execute("UPDATE chat_moderacion_config SET palabras_censuradas = ? WHERE id = 1", (texto_guardar,))
            conn.commit()
            raw = texto_guardar
        else:
            row = cursor.execute("SELECT palabras_censuradas FROM chat_moderacion_config WHERE id = 1").fetchone()
            raw = row["palabras_censuradas"] if row else ""

    palabras = [p.strip().lower() for p in raw.split(",") if p.strip()]
    return palabras


def filtrar_palabras_censuradas(texto: str) -> str:
    """
    Reemplaza términos prohibidos con asteriscos (***) sin alterar mayúsculas del resto del texto.
    """
    if not texto:
        return ""
    palabras = obtener_o_actualizar_palabras_censuradas()
    if not palabras:
        return texto

    texto_filtrado = texto
    for p in palabras:
        patron = re.compile(rf"\b{re.escape(p)}\b", re.IGNORECASE)
        texto_filtrado = patron.sub("***", texto_filtrado)
    return texto_filtrado


def enviar_mensaje_chat(nick: str, mensaje: str) -> dict:
    """
    Inserta un nuevo mensaje en GhostRed tras validar nick y sanitizar contenido.
    """
    nick_limpio = nick.strip()
    msj_limpio = mensaje.strip()

    if not nick_limpio:
        return {"ok": False, "error": "nick_requerido"}
    if not msj_limpio:
        return {"ok": False, "error": "mensaje_vacio"}
    if len(msj_limpio) > 400:
        return {"ok": False, "error": "mensaje_excede_400_caracteres"}

    # 🚫 Prohibir enlaces (anti-spam / anti-phishing)
    patron_links = re.compile(r"(https?://|www\.|(?:\.com|\.org|\.net|\.cl|\.es|\.io|\.me|\.app|\.gg|\.xyz|\.link|\.site|\.online)(?:/|\s|$|[?#]))", re.IGNORECASE)
    if patron_links.search(msj_limpio):
        return {
            "ok": False,
            "error": "links_prohibidos",
            "motivo": "Por seguridad y política anti-spam, no está permitido compartir enlaces en GhostRed."
        }

    purgar_chat_expirado()
    mensaje_final = filtrar_palabras_censuradas(msj_limpio)
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    fecha_hoy = now[:10]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO chat_mensajes (nick, mensaje, timestamp, fecha, eliminado)
            VALUES (?, ?, ?, ?, 0)
        """, (nick_limpio, mensaje_final, now, fecha_hoy))
        nuevo_id = cursor.lastrowid or 0
        conn.commit()

    return {
        "ok": True,
        "mensaje": {
            "id": nuevo_id,
            "nick": nick_limpio,
            "mensaje": mensaje_final,
            "timestamp": now,
            "fecha": fecha_hoy
        }
    }


def obtener_mensajes_chat(desde_id: int | None = None, limite: int = 300) -> dict:
    """
    Retorna el feed de mensajes activos de los últimos 7 días.
    Soporta polling diferencial vía desde_id.
    """
    purgar_chat_expirado()
    limite = min(500, max(10, limite))

    with get_db() as conn:
        cursor = conn.cursor()
        if desde_id and desde_id > 0:
            cursor.execute("""
                SELECT id, nick, mensaje, timestamp, fecha
                FROM chat_mensajes
                WHERE eliminado = 0 AND id > ?
                ORDER BY id ASC
                LIMIT ?
            """, (desde_id, limite))
        else:
            cursor.execute("""
                SELECT id, nick, mensaje, timestamp, fecha
                FROM chat_mensajes
                WHERE eliminado = 0
                ORDER BY id ASC
                LIMIT ?
            """, (limite,))

        filas = [dict(r) for r in cursor.fetchall()]

    return {
        "ok": True,
        "mensajes": filas,
        "total": len(filas)
    }


def obtener_mensajes_chat_admin(limite: int = 200) -> dict:
    """
    Retorna mensajes recientes para el monitor del Panel de Administración,
    incluyendo estado de eliminación y autor de la moderación.
    """
    purgar_chat_expirado()
    limite = min(500, max(20, limite))

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, nick, mensaje, timestamp, fecha, eliminado, eliminado_por
            FROM chat_mensajes
            ORDER BY id DESC
            LIMIT ?
        """, (limite,))
        filas = [dict(r) for r in cursor.fetchall()]

    palabras = obtener_o_actualizar_palabras_censuradas()

    return {
        "ok": True,
        "mensajes": filas,
        "total": len(filas),
        "palabras_censuradas": palabras
    }


def moderar_eliminar_mensaje_chat(mensaje_id: int, admin_nick: str = "Admin") -> dict:
    """
    Marca un mensaje como eliminado por el moderador.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE chat_mensajes
            SET eliminado = 1, eliminado_por = ?
            WHERE id = ?
        """, (admin_nick or "Admin", mensaje_id))
        filas_afectadas = cursor.rowcount
        conn.commit()

    if filas_afectadas > 0:
        return {"ok": True, "id": mensaje_id, "mensaje": "Mensaje purgado exitosamente"}
    return {"ok": False, "error": "mensaje_no_encontrado"}


# ── Tipos de gatillante automático ────────────────────────────────────────────
GATILLANTE_TIPOS = [
    "PUNTOS_TOTALES",       # Puntos acumulados totales (puntos en tabla jugadores)
    "TORNEOS_JUGADOS",      # Torneos BGA jugados
    "TORNEOS_GANADOS",      # Torneos BGA ganados (1.er lugar)
    "PODIOS_BGA",           # Torneos BGA con top-3
    "TRIVIAS_CORRECTAS",    # Respuestas correctas en trivia
    "CRIPTICOS_RESUELTOS",  # Crípticos resueltos
    "VOTOS_ENCUESTA",       # Votos dados en encuestas
    "JUEGOS_CREADOS",       # Juegos publicados en Juntas
    "PARTIDAS_ARCADE",      # Partidas jugadas en arcade (cualquier juego)
    "MANUAL",               # Solo el admin puede otorgarla manualmente
]


def _init_medallas_tablas() -> None:
    """Crea tablas de catálogo de medallas y medallas otorgadas a jugadores, y siembra las medallas base.

    La tabla medallas_catalogo incluye columnas para gatillante automático:
      - gatillante  : tipo de evento (ver GATILLANTE_TIPOS). NULL o 'MANUAL' = solo manual.
      - meta_valor  : umbral numérico para activar (ej. 3 crípticos, 1000 puntos).
      - bonus_puntos: puntos extra que gana el jugador al desbloquear la medalla.
    """
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS medallas_catalogo (
                    codigo      TEXT PRIMARY KEY,
                    nombre      TEXT NOT NULL,
                    emoji       TEXT NOT NULL DEFAULT '🏅',
                    color       TEXT NOT NULL DEFAULT '#ffd700',
                    descripcion TEXT DEFAULT '',
                    gatillante  TEXT DEFAULT 'MANUAL',
                    meta_valor  INTEGER DEFAULT 0,
                    bonus_puntos INTEGER DEFAULT 0,
                    creada_en   TEXT DEFAULT (datetime('now'))
                )
            """)
            # Migración: agregar columnas si la tabla ya existía sin ellas
            for col_def in [
                ("gatillante",   "TEXT DEFAULT 'MANUAL'"),
                ("meta_valor",   "INTEGER DEFAULT 0"),
                ("bonus_puntos", "INTEGER DEFAULT 0"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE medallas_catalogo ADD COLUMN {col_def[0]} {col_def[1]}")
                except Exception:
                    pass  # Columna ya existe

            cur.execute("""
                CREATE TABLE IF NOT EXISTS medallas_jugadores (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    nick            TEXT NOT NULL,
                    codigo_medalla  TEXT NOT NULL,
                    motivo          TEXT DEFAULT '',
                    otorgada_en     TEXT DEFAULT (datetime('now')),
                    UNIQUE(nick, codigo_medalla)
                )
            """)
            # Migración: agregar UNIQUE constraint no es posible en SQLite sin recrear;
            # usaremos INSERT OR IGNORE en la lógica para evitar duplicados.

            # ── Medallas base (manuales, sin gatillante automático) ──────────
            base_medallas = [
                ("oro_gral",        "Rey del Mes",       "👑",  "#ffd700", "1.º lugar del ranking global",          "MANUAL", 0,  50),
                ("plata_gral",      "Subcampeón",        "🥈",  "#c0c0c0", "2.º lugar del ranking global",          "MANUAL", 0,  30),
                ("bronce_gral",     "Bronce",            "🥉",  "#cd7f32", "3.º lugar del ranking global",          "MANUAL", 0,  20),
                ("arcade_piloto",   "As del Circuito",   "🏎️", "#ef4444", "Mejor tiempo en Circuito Black",        "MANUAL", 0,   0),
                ("arcade_ninja",    "Sensei del Dohyō",  "⚔️", "#22d3ee", "Mejor puntaje en Cyber Ninja",          "MANUAL", 0,   0),
                ("mas_activo",      "Incansable",        "⚡",  "#facc15", "Mayor participación en la comunidad",   "MANUAL", 0,   0),
                ("mision_perfecta", "Perfección",        "🌟",  "#f8fafc", "Racha perfecta en misiones diarias",    "MANUAL", 0,   0),
                ("saboteador",      "Caparazón Azul",    "🗡️", "#a855f7", "Hito especial de competencia",          "MANUAL", 0,   0),
                ("bga_champion",    "Mesa de Honor",     "🃏",  "#22c55e", "Campeón de torneo BGA",                 "MANUAL", 0,  25),
            ]
            # ── Medallas automáticas escalonadas ────────────────────────────
            auto_medallas = [
                # Crípticos (3 → 10 → 30)
                ("criptico_bronce",   "Desci­fra­dor",        "🔐", "#f59e0b", "Resolviste 3 crípticos",    "CRIPTICOS_RESUELTOS",  3,  15),
                ("criptico_plata",    "Hacker de Enigmas",   "🔓", "#a3e635", "Resolviste 10 crípticos",   "CRIPTICOS_RESUELTOS", 10,  30),
                ("criptico_oro",      "Maestro del Código",  "🧩", "#ffd700", "Resolviste 30 crípticos",   "CRIPTICOS_RESUELTOS", 30,  60),
                # Torneos jugados (1 → 5 → 15)
                ("torneo_novato",     "Primer Tablero",      "🎲", "#6ee7b7", "Jugaste tu 1.er torneo BGA","TORNEOS_JUGADOS",      1,  10),
                ("torneo_veterano",   "Veterano de Mesa",    "🏟️","#38bdf8", "Jugaste 5 torneos BGA",      "TORNEOS_JUGADOS",      5,  25),
                ("torneo_leyenda",    "Leyenda BGA",         "🌐", "#c084fc", "Jugaste 15 torneos BGA",     "TORNEOS_JUGADOS",     15,  50),
                # Podios BGA (1 → 3 → 10)
                ("podio_bronce",      "En el Podio",         "🥉", "#cd7f32", "Lograste tu 1.er podio BGA","PODIOS_BGA",           1,  20),
                ("podio_plata",       "Coleccionista",       "🥈", "#c0c0c0", "3 podios en torneos BGA",    "PODIOS_BGA",           3,  40),
                ("podio_oro",         "Dominador de Mesas",  "🏆", "#ffd700", "10 podios en torneos BGA",   "PODIOS_BGA",          10,  80),
                # Puntos totales (100 → 500 → 1000)
                ("pts_centena",       "Centurión",           "💯", "#fb923c", "Acumulaste 100 PTS",         "PUNTOS_TOTALES",      100,   0),
                ("pts_quinto",        "Medio Camino",        "⚡", "#facc15", "Acumulaste 500 PTS",         "PUNTOS_TOTALES",      500,  10),
                ("pts_meta",          "Élite del Club",      "👑", "#a855f7", "Alcanzaste los 1000 PTS",    "PUNTOS_TOTALES",     1000,  50),
                # Trivias (5 → 20 → 50)
                ("trivia_aprendiz",   "Curioso Geek",        "🧠", "#67e8f9", "5 trivias correctas",        "TRIVIAS_CORRECTAS",    5,  10),
                ("trivia_experto",    "Mente Privilegiada",  "🎓", "#818cf8", "20 trivias correctas",       "TRIVIAS_CORRECTAS",   20,  25),
                ("trivia_maestro",    "Enciclopedia Viva",   "📚", "#f472b6", "50 trivias correctas",       "TRIVIAS_CORRECTAS",   50,  50),
                # Votos encuesta (5 → 20)
                ("votante_activo",    "Voz del Club",        "🗳️","#4ade80", "Votaste en 5 encuestas",     "VOTOS_ENCUESTA",       5,   5),
                ("votante_leal",      "Demócrata Geek",      "🗣️","#86efac", "Votaste en 20 encuestas",    "VOTOS_ENCUESTA",      20,  15),
                # Arcade (10 → 50)
                ("arcade_jugador",    "Arcade Casual",       "🕹️","#f97316", "10 partidas arcade",         "PARTIDAS_ARCADE",     10,  10),
                ("arcade_adicto",     "Arcade Adicto",       "👾", "#ef4444", "50 partidas arcade",         "PARTIDAS_ARCADE",     50,  30),
                # Juegos creados en Juntas (1 → 5)
                ("anfitrion_novato",  "Anfitrión",           "🎯", "#fbbf24", "Creaste tu 1.er juego",      "JUEGOS_CREADOS",       1,   5),
                ("anfitrion_pro",     "Game Master",         "🎮", "#f59e0b", "Creaste 5 juegos en Juntas", "JUEGOS_CREADOS",       5,  20),
            ]
            for row in base_medallas:
                cod, nom, emo, col, desc, gat, mv, bp = row
                cur.execute(
                    "INSERT OR IGNORE INTO medallas_catalogo (codigo, nombre, emoji, color, descripcion, gatillante, meta_valor, bonus_puntos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (cod, nom, emo, col, desc, gat, mv, bp),
                )
            for row in auto_medallas:
                cod, nom, emo, col, desc, gat, mv, bp = row
                cur.execute(
                    "INSERT OR IGNORE INTO medallas_catalogo (codigo, nombre, emoji, color, descripcion, gatillante, meta_valor, bonus_puntos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (cod, nom, emo, col, desc, gat, mv, bp),
                )
            conn.commit()
    except Exception as e:
        print(f"⚠️ [Medallas] Error inicializando tablas: {e}")


def _obtener_stats_jugador_para_medallas(nick: str, cur) -> dict:
    """Recolecta las estadísticas de un jugador necesarias para evaluar gatillantes automáticos."""
    nk_up = nick.upper()
    stats = {
        "PUNTOS_TOTALES":    0,
        "TORNEOS_JUGADOS":   0,
        "TORNEOS_GANADOS":   0,
        "PODIOS_BGA":        0,
        "TRIVIAS_CORRECTAS": 0,
        "CRIPTICOS_RESUELTOS": 0,
        "VOTOS_ENCUESTA":    0,
        "JUEGOS_CREADOS":    0,
        "PARTIDAS_ARCADE":   0,
    }
    try:
        # Puntos totales y bga_username del jugador
        cur.execute("SELECT COALESCE(puntos, 0) as puntos, COALESCE(bga_username, '') as bga_username FROM jugadores WHERE UPPER(nick) = ?", (nk_up,))
        r = cur.fetchone()
        bga_up = ""
        if r:
            rd = dict(r)
            stats["PUNTOS_TOTALES"] = int(rd.get("puntos") or 0)
            bga_up = str(rd.get("bga_username") or "").strip().upper()

        # Torneos BGA jugados / ganados / podios (tabla real: torneo_participantes)
        try:
            cur.execute("""
                SELECT COUNT(*) as jugados,
                       SUM(CASE WHEN rank_actual = 1 THEN 1 ELSE 0 END) as ganados,
                       SUM(CASE WHEN rank_actual > 0 AND rank_actual <= 3 THEN 1 ELSE 0 END) as podios
                FROM torneo_participantes
                WHERE UPPER(nick_aj) = ? OR UPPER(bga_username) = ? OR (? != '' AND UPPER(bga_username) = ?)
            """, (nk_up, nk_up, bga_up, bga_up))
            tr = cur.fetchone()
            if tr:
                trd = dict(tr)
                stats["TORNEOS_JUGADOS"] = int(trd.get("jugados") or 0)
                stats["TORNEOS_GANADOS"] = int(trd.get("ganados") or 0)
                stats["PODIOS_BGA"]      = int(trd.get("podios") or 0)
        except Exception as e_t:
            print(f"⚠️ [Medallas] Error leyendo torneos de {nick}: {e_t}")

        # Eventos de historial (trivias, crípticos, votos, juegos creados, arcade)
        tipo_map = {
            "TRIVIA_CORRECTA":    "TRIVIAS_CORRECTAS",
            "CRIPTICO_RESUELTO":  "CRIPTICOS_RESUELTOS",
            "ENCUESTA_VOTO":      "VOTOS_ENCUESTA",
            "VOTO_ENCUESTA":      "VOTOS_ENCUESTA",
            "JUNTA_JUEGO_CREADO": "JUEGOS_CREADOS",
            "ARCADE_PARTIDA":     "PARTIDAS_ARCADE",
        }
        try:
            cur.execute("""
                SELECT tipo_evento, COUNT(*) as cnt
                FROM historial_transacciones
                WHERE UPPER(nick) = ?
                GROUP BY tipo_evento
            """, (nk_up,))
            for row in cur.fetchall():
                rowd = dict(row)
                tipo = str(rowd.get("tipo_evento") or "").upper()
                cnt  = int(rowd.get("cnt") or 0)
                if tipo in tipo_map:
                    stats[tipo_map[tipo]] += cnt
                elif tipo.startswith("JUEGO_"):
                    stats["PARTIDAS_ARCADE"] += cnt
        except Exception as e_h:
            print(f"⚠️ [Medallas] Error leyendo historial de {nick}: {e_h}")
    except Exception as e:
        print(f"⚠️ [Medallas] Error leyendo stats de {nick}: {e}")
    return stats


def verificar_y_otorgar_medallas_automaticas(nick: str) -> list[dict]:
    """Evalúa todas las medallas automáticas para un jugador y otorga las que cumpla por primera vez.

    Retorna una lista de medallas recién otorgadas (puede estar vacía).
    """
    _init_medallas_tablas()
    nk = (nick or "").strip()
    if not nk:
        return []
    nk_up = nk.upper()
    nuevas: list[dict] = []
    try:
        with get_db() as conn:
            cur = conn.cursor()
            # Medallas que el jugador ya tiene (para no duplicar)
            cur.execute(
                "SELECT codigo_medalla FROM medallas_jugadores WHERE UPPER(nick) = ?",
                (nk_up,)
            )
            ya_tiene = {str(dict(r).get("codigo_medalla") or "") for r in cur.fetchall()}

            # Catálogo de medallas automáticas
            cur.execute("""
                SELECT codigo, nombre, emoji, color, descripcion, gatillante, meta_valor, bonus_puntos
                FROM medallas_catalogo
                WHERE gatillante IS NOT NULL AND gatillante != 'MANUAL' AND gatillante != ''
                  AND meta_valor > 0
            """)
            automaticas = []
            for r in cur.fetchall():
                rd = dict(r)
                automaticas.append({
                    "codigo":       str(rd.get("codigo") or ""),
                    "nombre":       str(rd.get("nombre") or ""),
                    "emoji":        str(rd.get("emoji") or "🏅"),
                    "color":        str(rd.get("color") or "#ffd700"),
                    "descripcion":  str(rd.get("descripcion") or ""),
                    "gatillante":   str(rd.get("gatillante") or ""),
                    "meta_valor":   int(rd.get("meta_valor") or 0),
                    "bonus_puntos": int(rd.get("bonus_puntos") or 0),
                })

            if not automaticas:
                return []

            stats = _obtener_stats_jugador_para_medallas(nk, cur)

            for med in automaticas:
                cod     = str(med["codigo"])
                gat     = str(med["gatillante"] or "")
                meta    = int(med["meta_valor"] or 0)
                bonus   = int(med["bonus_puntos"] or 0)

                if cod in ya_tiene:
                    continue  # Ya la tiene
                if gat not in stats:
                    continue  # Tipo de gatillante desconocido

                valor_actual = stats[gat]
                if valor_actual >= meta:
                    # Otorgar medalla
                    motivo = f"Auto: {gat} ≥ {meta} (actual: {valor_actual})"
                    try:
                        cur.execute(
                            "INSERT OR IGNORE INTO medallas_jugadores (nick, codigo_medalla, motivo) VALUES (?, ?, ?)",
                            (nk, cod, motivo),
                        )
                        # Bonus de puntos
                        if bonus > 0:
                            cur.execute(
                                "UPDATE jugadores SET puntos = COALESCE(puntos,0) + ?, total_ganados = COALESCE(total_ganados,0) + ? WHERE UPPER(nick) = ?",
                                (bonus, bonus, nk_up)
                            )
                            try:
                                import datetime as _dt
                                cur.execute("""
                                    INSERT INTO historial_transacciones (timestamp, nick, tipo_evento, descripcion, variacion_pts, saldo_resultante)
                                    SELECT datetime('now'), ?, 'MEDALLA_BONUS', ?, ?, COALESCE(puntos,0)
                                    FROM jugadores WHERE UPPER(nick) = ?
                                """, (nk, f"Bonus medalla {med['emoji']} {med['nombre']}", bonus, nk_up))
                            except Exception:
                                pass
                        nuevas.append({
                            "codigo": cod,
                            "nombre": med["nombre"],
                            "emoji":  med["emoji"],
                            "bonus_puntos": bonus,
                        })
                        ya_tiene.add(cod)
                    except Exception as e_ins:
                        print(f"⚠️ [Medallas] Error otorgando {cod} a {nk}: {e_ins}")

            conn.commit()
            if nuevas:
                try:
                    exportar_ranking_json()
                except Exception:
                    pass
    except Exception as e:
        print(f"⚠️ [Medallas] Error en verificar_automaticas({nick}): {e}")
    return nuevas


def verificar_medallas_todos_los_jugadores() -> dict:
    """Recorre todos los jugadores activos y verifica medallas automáticas para cada uno.
    Útil para una pasada batch desde el admin panel."""
    _init_medallas_tablas()
    total_otorgadas = 0
    detalle: list[dict] = []
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT nick FROM jugadores WHERE estado = 'Activo' OR estado IS NULL")
            nicks = [str(r[0]) for r in cur.fetchall() if r[0]]
        for nick in nicks:
            nuevas = verificar_y_otorgar_medallas_automaticas(nick)
            if nuevas:
                total_otorgadas += len(nuevas)
                detalle.append({"nick": nick, "medallas": nuevas})
    except Exception as e:
        return {"ok": False, "error": str(e)}
    return {"ok": True, "total_otorgadas": total_otorgadas, "detalle": detalle}


def obtener_medallas_jugador(nick: str) -> dict:
    """Retorna todas las medallas otorgadas a un jugador desde medallas_jugadores + catálogo."""
    _init_medallas_tablas()
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT mj.codigo_medalla, mj.motivo, mj.otorgada_en,
                       COALESCE(mc.nombre, mj.codigo_medalla) as nombre,
                       COALESCE(mc.emoji, '🏅') as emoji,
                       COALESCE(mc.color, '#ffd700') as color,
                       COALESCE(mc.descripcion, '') as descripcion
                FROM medallas_jugadores mj
                LEFT JOIN medallas_catalogo mc ON mc.codigo = mj.codigo_medalla
                WHERE UPPER(mj.nick) = UPPER(?)
                ORDER BY mj.otorgada_en DESC
            """, (nick,))
            rows = [dict(r) for r in cur.fetchall()]
            medallas = [{
                "codigo":      str(r.get("codigo_medalla") or ""),
                "nombre":      str(r.get("nombre") or r.get("codigo_medalla") or ""),
                "emoji":       str(r.get("emoji") or "🏅"),
                "color":       str(r.get("color") or "#ffd700"),
                "descripcion": str(r.get("descripcion") or ""),
                "motivo":      str(r.get("motivo") or ""),
                "otorgada_en": str(r.get("otorgada_en") or ""),
            } for r in rows]
            return {"ok": True, "nick": nick, "medallas": medallas, "total": len(medallas)}
    except Exception as e:
        print(f"⚠️ [Medallas] Error obteniendo medallas de {nick}: {e}")
        return {"ok": False, "error": str(e), "medallas": []}


def obtener_temporada_ranking() -> dict[str, object]:
    """Retorna el ranking global hacia la meta de temporada, catálogo de medallas y medallas por jugador."""
    _init_medallas_tablas()
    meta_pts = 1000
    try:
        cfg = obtener_config_economia()
        meta_pts = int(cfg.get("meta_temporada_puntos") or 1000)
        if meta_pts <= 0:
            meta_pts = 1000
    except Exception:
        meta_pts = 1000

    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT nick, COALESCE(telefono, '') as telefono,
                       COALESCE(nick_web, '') as nick_web,
                       COALESCE(nombre_agenda_admin, '') as nombre_agenda_admin,
                       COALESCE(bga_username, '') as bga_username,
                       COALESCE(puntos, 0) as puntos,
                       COALESCE(tiene_clave_privada, 0) as tiene_clave_privada,
                       password_hash
                FROM jugadores
                WHERE estado = 'Activo' OR estado IS NULL
                ORDER BY COALESCE(puntos, 0) DESC, nick ASC
            """)
            jugadores_raw = [dict(r) for r in cur.fetchall()]

            cur.execute("SELECT codigo, nombre, emoji, color, descripcion, COALESCE(gatillante,'MANUAL') as gatillante, COALESCE(meta_valor,0) as meta_valor, COALESCE(bonus_puntos,0) as bonus_puntos FROM medallas_catalogo ORDER BY rowid ASC")
            catalogo_rows = cur.fetchall()
            catalogo = []
            for r in catalogo_rows:
                row_dict = dict(r)
                catalogo.append({
                    "codigo":       str(row_dict.get("codigo", "") or ""),
                    "nombre":       str(row_dict.get("nombre", "") or ""),
                    "emoji":        str(row_dict.get("emoji", "🏅") or "🏅"),
                    "color":        str(row_dict.get("color", "#ffd700") or "#ffd700"),
                    "descripcion":  str(row_dict.get("descripcion", "") or ""),
                    "gatillante":   str(row_dict.get("gatillante", "MANUAL") or "MANUAL"),
                    "meta_valor":   int(row_dict.get("meta_valor") or 0),
                    "bonus_puntos": int(row_dict.get("bonus_puntos") or 0),
                })
            cat_map = {str(m["codigo"]): m for m in catalogo}

            cur.execute("SELECT nick, codigo_medalla, motivo, otorgada_en FROM medallas_jugadores ORDER BY id DESC")
            med_rows = [dict(r) for r in cur.fetchall()]
            med_by_nick: dict[str, list[dict[str, object]]] = {}
            for mr in med_rows:
                nk = str(mr.get("nick") or "").strip().upper()
                cod = str(mr.get("codigo_medalla") or "").strip()
                info = cat_map.get(cod, {"codigo": cod, "nombre": cod, "emoji": "🏅", "color": "#ffd700"})
                med_by_nick.setdefault(nk, []).append({
                    "codigo": cod,
                    "nombre": info.get("nombre", cod),
                    "emoji": info.get("emoji", "🏅"),
                    "color": info.get("color", "#ffd700"),
                    "motivo": mr.get("motivo") or "",
                })

            ranking: list[dict[str, object]] = []
            pos = 0
            for j in jugadores_raw:
                tel = str(j.get("telefono") or "").strip()
                nick = str(j.get("nick") or "").strip()
                web_nick = str(j.get("nick_web") or "").strip()
                agenda = str(j.get("nombre_agenda_admin") or "").strip()
                bga = str(j.get("bga_username") or "").strip()
                # Excluir filas demo/huérfanas sin vínculo real
                if not (tel or web_nick or agenda or bga):
                    continue
                pos += 1
                pts = int(j.get("puntos") or 0)
                pct = min(100, round((pts / meta_pts) * 100, 1)) if meta_pts > 0 else 0
                reg_web = bool(web_nick or int(j.get("tiene_clave_privada") or 0) == 1 or j.get("password_hash"))
                display_name = web_nick or agenda or nick
                ranking.append({
                    "posicion": pos,
                    "nick": nick,
                    "display_name": display_name,
                    "telefono": tel,
                    "registrado_web": reg_web,
                    "puntos": pts,
                    "progreso_pct": pct,
                    "meta_alcanzada": pts >= meta_pts,
                    "medallas": med_by_nick.get(nick.upper(), []),
                })

            return {
                "ok": True,
                "meta_puntos": meta_pts,
                "ranking": ranking,
                "catalogo_medallas": catalogo,
            }
    except Exception as e:
        print(f"⚠️ [Temporada] Error en obtener_temporada_ranking: {e}")
        return {"ok": False, "error": str(e), "meta_puntos": meta_pts, "ranking": [], "catalogo_medallas": []}


def crear_medalla_catalogo(nombre: str, emoji: str = "🏅", color: str = "#ffd700", descripcion: str = "", codigo: str = "",
                           gatillante: str = "MANUAL", meta_valor: int = 0, bonus_puntos: int = 0) -> dict[str, object]:
    """Crea una nueva medalla en medallas_catalogo con soporte para gatillante automático."""
    _init_medallas_tablas()
    nom = (nombre or "").strip()
    if not nom:
        return {"ok": False, "error": "nombre_requerido"}
    cod = (codigo or "").strip().lower()
    if not cod:
        import re
        cod = re.sub(r"[^a-z0-9]+", "_", nom.lower()).strip("_")[:32] or f"medalla_{int(datetime.datetime.now().timestamp())}"
    emo = (emoji or "🏅").strip() or "🏅"
    col = (color or "#ffd700").strip() or "#ffd700"
    desc = (descripcion or "").strip()
    gat = (gatillante or "MANUAL").strip().upper()
    if gat not in GATILLANTE_TIPOS:
        gat = "MANUAL"
    mv = max(0, meta_valor or 0)
    bp = max(0, bonus_puntos or 0)
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "INSERT OR REPLACE INTO medallas_catalogo (codigo, nombre, emoji, color, descripcion, gatillante, meta_valor, bonus_puntos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (cod, nom, emo, col, desc, gat, mv, bp),
            )
            conn.commit()
        return {"ok": True, "codigo": cod, "nombre": nom, "emoji": emo, "mensaje": f"Medalla '{emo} {nom}' guardada (gatillante: {gat}, meta: {mv}, bonus: {bp} pts)."}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def otorgar_medalla_jugador(nick: str, codigo_medalla: str, motivo: str = "") -> dict[str, object]:
    """Otorga una medalla del catálogo a un jugador."""
    _init_medallas_tablas()
    nk = (nick or "").strip()
    cod = (codigo_medalla or "").strip()
    if not nk or not cod:
        return {"ok": False, "error": "nick_y_codigo_requeridos"}
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT nombre, emoji FROM medallas_catalogo WHERE codigo = ?", (cod,))
            med = cur.fetchone()
            if not med:
                return {"ok": False, "error": "medalla_no_encontrada"}
            cur.execute(
                "INSERT INTO medallas_jugadores (nick, codigo_medalla, motivo) VALUES (?, ?, ?)",
                (nk, cod, (motivo or "").strip()),
            )
            conn.commit()
        return {"ok": True, "mensaje": f"Medalla {med['emoji']} {med['nombre']} otorgada a {nk}."}
    except Exception as e:
        return {"ok": False, "error": str(e)}



# =============================================================================
# =============================================================================
if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd == "init":
            init_db()
        elif cmd in ["sync", "sync-sheets", "import"]:
            importar_desde_google_sheets()
        elif cmd == "export":
            exportar_ranking_json()
        elif cmd == "status":
            ver_estado()
        elif cmd in ["renta", "rentas", "pay-rent"]:
            liquidar_renta_diaria()
        elif cmd == "purge":
            purgar_historial(21)
        elif cmd == "encuestas-init":
            init_encuestas_tables()
            poblar_catalogo_demo()
            crear_encuestas_semana_demo()
        elif cmd == "encuestas-export":
            exportar_encuestas_json()
        elif cmd == "encuestas-nueva":
            if len(sys.argv) >= 3:
                res = crear_encuesta_semanal(sys.argv[2])
                print(res)
            else:
                print("Uso: python gestor_db.py encuestas-nueva <categoria>")
        else:
            print(f"Comando desconocido: {cmd}")
            print("Uso: python gestor_db.py [init|sync|export|status|rentas|purge|encuestas-init|encuestas-export|encuestas-nueva <cat>]")
    else:
        # Por defecto importar y mostrar estado
        importar_desde_google_sheets()
        ver_estado()

