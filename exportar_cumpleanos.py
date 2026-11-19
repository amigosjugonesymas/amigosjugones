#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
EXPORTADOR SOBERANO DE CUMPLEAÑOS — AMIGOS JUGONES
=============================================================================
Lee la tabla 'cumpleanos' de database/amigos_jugones.db y compila cumpleanos.json
garantizando privacidad estricta (Zero-Knowledge / Cero PII):
- NO incluye correos electrónicos.
- NO incluye números de teléfono.
- NO incluye años de nacimiento.
- Solo exporta miembros con saludo_publico = 1.
=============================================================================
"""

import os
import sys
import json
import sqlite3
import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "amigos_jugones.db")
OUTPUT_JSON_PATH = os.path.join(BASE_DIR, "cumpleanos.json")

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}

# ─── SEMILLERO DE RESPUESTAS HISTÓRICAS DE GOOGLE FORMS ──────────────────────
# Normalizadas desde la captura real de "Tu fecha de cumpleaños (Respuestas)"
HISTORICO_CUMPLEANOS = [
    {"nick": "Ricardo", "dia": 6, "mes": 3, "publico": 1},
    {"nick": "Erick (Quiltro)", "dia": 7, "mes": 10, "publico": 0},
    {"nick": "Catalina", "dia": 6, "mes": 12, "publico": 1},
    {"nick": "Ilako", "dia": 31, "mes": 5, "publico": 1},
    {"nick": "Mauricio Leiva", "dia": 6, "mes": 3, "publico": 0},
    {"nick": "Gerson", "dia": 27, "mes": 11, "publico": 1},
    {"nick": "Rayen", "dia": 1, "mes": 10, "publico": 0},
    {"nick": "Alejandra Verdejo", "dia": 22, "mes": 5, "publico": 0},
    {"nick": "Arturo Vial Arqueros", "dia": 10, "mes": 9, "publico": 1},
    {"nick": "Cecy", "dia": 8, "mes": 1, "publico": 1},
    {"nick": "Álvaro", "dia": 7, "mes": 9, "publico": 1},
    {"nick": "Denisse neko", "dia": 19, "mes": 3, "publico": 1},
    {"nick": "angel", "dia": 19, "mes": 10, "publico": 1},
    {"nick": "Felipe Llanos", "dia": 20, "mes": 6, "publico": 1},
    {"nick": "Camilo", "dia": 28, "mes": 2, "publico": 1},
    {"nick": "Estefi", "dia": 21, "mes": 6, "publico": 1},
    {"nick": "Teclas ludicas", "dia": 20, "mes": 4, "publico": 1},
    {"nick": "Gandulfox86", "dia": 28, "mes": 6, "publico": 1},
    {"nick": "Víctor", "dia": 8, "mes": 6, "publico": 0},
    {"nick": "Darki", "dia": 4, "mes": 3, "publico": 1},
]

def sembrar_historico_si_vacio(conn):
    """Inserta las respuestas históricas normalizadas si la tabla está vacía"""
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM cumpleanos")
    total = cur.fetchone()[0]
    if total <= 1: # Si solo estaba el de prueba (BLACK)
        print("🌱 Sembrando registros históricos normalizados de cumpleaños...")
        for h in HISTORICO_CUMPLEANOS:
            # Asegurar que el nick existe en jugadores para satisfacer la FK
            cur.execute("""
                INSERT OR IGNORE INTO jugadores (nick, puntos, estado)
                VALUES (?, 0, 'Activo')
            """, (h["nick"],))
            cur.execute("""
                INSERT OR REPLACE INTO cumpleanos (nick, dia, mes, saludo_publico)
                VALUES (?, ?, ?, ?)
            """, (h["nick"], h["dia"], h["mes"], h["publico"]))
        conn.commit()
        print(f"✅ {len(HISTORICO_CUMPLEANOS)} registros históricos sembrados correctamente.")

def exportar_cumpleanos():
    """Genera cumpleanos.json a partir de la base de datos"""
    if not os.path.exists(DB_PATH):
        print(f"❌ Base de datos no encontrada en: {DB_PATH}")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Sembrar si está vacío
    sembrar_historico_si_vacio(conn)

    # Consulta solo miembros con saludo_publico = 1
    cur = conn.cursor()
    cur.execute("""
        SELECT nick, dia, mes
        FROM cumpleanos
        WHERE saludo_publico = 1
        ORDER BY mes ASC, dia ASC, nick ASC
    """)
    filas = cur.fetchall()

    hoy = datetime.datetime.now()
    lista_cumpleanos = []
    por_mes = {m: [] for m in range(1, 13)}

    for r in filas:
        item = {
            "nick": r["nick"],
            "dia": r["dia"],
            "mes": r["mes"],
            "mes_nombre": MESES_ES.get(r["mes"], str(r["mes"]))
        }
        lista_cumpleanos.append(item)
        por_mes[r["mes"]].append(item)

    payload = {
        "cumpleanos": lista_cumpleanos,
        "total": len(lista_cumpleanos),
        "mes_actual": hoy.month,
        "mes_actual_nombre": MESES_ES.get(hoy.month, ""),
        "total_mes_actual": len(por_mes[hoy.month]),
        "por_mes": {MESES_ES[m]: por_mes[m] for m in range(1, 13)},
        "generado": hoy.strftime("%Y-%m-%dT%H:%M:%S")
    }

    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    conn.close()
    print(f"🎉 [Exportador] {len(lista_cumpleanos)} cumpleaños públicos exportados a: {OUTPUT_JSON_PATH}")
    print(f"📅 Festejados del mes actual ({MESES_ES.get(hoy.month)}): {len(por_mes[hoy.month])}")
    return payload

if __name__ == "__main__":
    exportar_cumpleanos()
