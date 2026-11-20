#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
SERVIDOR LOCAL AMIGOS JUGONES — PUENTE NATIVO CON SQLITE
=============================================================================
Sirve la aplicación web completa en http://localhost:8877 y provee endpoints
para escribir y leer directamente desde database/amigos_jugones.db y ranking.json.
=============================================================================
"""

import http.server
import socketserver
import urllib.parse
import json
import os
import sys
import re
from datetime import datetime, timezone, timedelta

# Asegurar encoding UTF-8 en Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, 'database'))
try:
    import gestor_db
except ImportError:
    from database import gestor_db

ADMIN_SECRET_TOKEN = os.environ.get("ADMIN_TOKEN", "AJ_SECRET_ADMIN_TOKEN_2026_XYZ")

def _safe_int(val, default=0):
    if isinstance(val, (list, tuple)):
        val = val[0] if val else default
    if val is None or val == "":
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default

def _safe_str(val, default=""):
    if isinstance(val, (list, tuple)):
        val = val[0] if val else default
    if val is None:
        return default
    return str(val).strip()

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8888))

class AJRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _is_admin(self, params=None):
        """Valida que la petición provenga del Administrador autorizado."""
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            if token == ADMIN_SECRET_TOKEN:
                return True
        if params and isinstance(params, dict):
            p_tok = params.get('admin_token')
            if isinstance(p_tok, list) and p_tok:
                p_tok = p_tok[0]
            if p_tok == ADMIN_SECRET_TOKEN:
                return True
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if qs.get('admin_token', [''])[0] == ADMIN_SECRET_TOKEN:
            return True
        return False

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        # ─── API: ESTADO DE SEGURIDAD Y LOGIN GET ─────────────────────────
        if parsed.path == '/api/auth/estado':
            phone = params.get('phone', params.get('telefono', ['']))[0].strip()
            if not phone:
                self._send_json({"ok": False, "error": "telefono_requerido"}, 400)
                return
            res = gestor_db.obtener_estado_seguridad(phone)
            if res:
                self._send_json({"ok": True, "seguridad": res}, 200)
            else:
                self._send_json({"ok": False, "error": "usuario_no_encontrado"}, 404)
            return

        if parsed.path == '/api/auth/login':
            phone = _safe_str(params.get('phone', params.get('telefono', '')))
            password = _safe_str(params.get('password', params.get('key', '')))
            device_id = _safe_str(params.get('device_id', ''))
            nick = _safe_str(params.get('nick', params.get('nombre', '')))
            if not phone or not password:
                self._send_json({"ok": False, "error": "datos_incompletos"}, 400)
                return
            try:
                res = gestor_db.verificar_credenciales_miembro(phone, password, device_id, nick)
                status_code = 200 if res.get("ok") else (403 if res.get("error") == "limite_dispositivos_alcanzado" else 401)
                self._send_json(res, status_code)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: DEDUCCIÓN DE PUNTOS EN SQLITE (-10 PTS) ─────────────────────
        if parsed.path == '/api/debit_points':
            nick = params.get('nick', [''])[0].strip()
            game = params.get('game', ['arcade'])[0].strip()
            try:
                costo = int(params.get('amount', [10])[0])
            except ValueError:
                costo = 10

            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return

            exito = gestor_db.registrar_partida(nick, game, costo)
            if exito:
                with gestor_db.get_db() as conn:
                    cur = conn.cursor()
                    cur.execute("SELECT puntos FROM jugadores WHERE nick = ?", (nick,))
                    row = cur.fetchone()
                    saldo = row["puntos"] if row else 0
                print(f"✅ [SQLite API] Jugada registrada: {nick} -{costo} PTS | Saldo: {saldo} PTS")
                self._send_json({"ok": True, "nick": nick, "remaining": saldo, "debited": costo})
            else:
                self._send_json({"ok": False, "error": "saldo_insuficiente_o_usuario_no_encontrado"}, 400)
            return

        # ─── BLOQUEO DE SEGURIDAD SEC-01: Puntos Admin NUNCA por GET ─────────
        if parsed.path == '/api/admin/puntos':
            self._send_json({"ok": False, "error": "metodo_no_permitido_use_post_con_token"}, 405)
            return

        # ─── API: REPORTE DE RÉCORD ARCADE (CARRERA / PELEA) ─────────────────
        if parsed.path == '/api/submit_score':
            self._handle_submit_score(params)
            return

        # ─── API: LIQUIDACIÓN DE RENTA DIARIA ARCADE ─────────────────────────
        if parsed.path == '/api/admin/rentas':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            res = gestor_db.liquidar_renta_diaria()
            self._send_json(res, 200)
            return

        # ─── API: TORNEOS BGA — OBTENER ACTIVOS (Panel Admin) ────────────────
        if parsed.path == '/api/torneos':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            try:
                torneos = gestor_db.obtener_torneos_activos()
                self._send_json({"ok": True, "torneos": torneos, "total": len(torneos)})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ADMIN — OBTENER LISTA DE MIEMBROS CON BGA (Panel Admin) ────
        if parsed.path == '/api/admin/miembros_bga':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            try:
                miembros = gestor_db.obtener_jugadores_todos()
                self._send_json({"ok": True, "miembros": miembros, "total": len(miembros)})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ESTADO DE LA BASE DE DATOS ───────────────────────────────────
        if parsed.path == '/api/status':
            with gestor_db.get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT nick, puntos, total_ganados, total_gastados FROM jugadores ORDER BY puntos DESC")
                jugadores = [dict(r) for r in cur.fetchall()]
            self._send_json({"ok": True, "db": "SQLite amigos_jugones.db", "jugadores": jugadores})
            return

        # ─── API: ENCUESTAS GEEK — LISTA DE ENCUESTAS ACTIVAS ────────────────
        if parsed.path == '/api/encuestas':
            try:
                gestor_db.init_encuestas_tables()
                encuestas = gestor_db.obtener_encuestas_activas()
                # Rankings por categoría
                with gestor_db.get_db() as conn:
                    cats = conn.execute(
                        "SELECT DISTINCT categoria FROM encuestas_activas WHERE total_votos > 0"
                    ).fetchall()
                    rankings = {}
                    for cat in cats:
                        c = cat["categoria"]
                        rankings[c] = gestor_db.obtener_ranking_categoria(c)
                self._send_json({"ok": True, "encuestas": encuestas, "rankings": rankings})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: RANKING HISTÓRICO DE CATEGORÍA ─────────────────────────────
        if parsed.path == '/api/encuestas/ranking':
            categoria = params.get('categoria', [''])[0].strip()
            if not categoria:
                self._send_json({"ok": False, "error": "categoria requerida"}, 400)
                return
            try:
                ranking = gestor_db.obtener_ranking_categoria(categoria)
                self._send_json({"ok": True, "categoria": categoria, "ranking": ranking})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: OBTENER JUNTAS & PARTIDAS (Turso/SQLite) ────────────────────
        if parsed.path == '/api/juntas':
            try:
                solo_activas = params.get('activas', ['0'])[0] in ['1', 'true', 'True']
                juntas = gestor_db.obtener_juntas(solo_activas=solo_activas)
                self._send_json({"ok": True, "juntas": juntas})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: PRESENCIA ONLINE ────────────────────────────────────────────
        if parsed.path == '/api/online':
            try:
                gestor_db.limpiar_presencia_antigua()
                usuarios = gestor_db.obtener_online()
                self._send_json({"ok": True, "count": len(usuarios), "usuarios": usuarios})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: PERFIL DE USUARIO (GET) ────────────────────────────────────
        if parsed.path == '/api/perfil':
            nick = params.get('nick', [''])[0].strip() if isinstance(params.get('nick', ''), list) else str(params.get('nick', '')).strip()
            if not nick:
                self._send_json({"ok": False, "error": "nick requerido"}, 400)
                return
            try:
                perfil = gestor_db.obtener_perfil(nick)
                self._send_json({"ok": True, "perfil": perfil})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: AVISOS Y COMUNICADOS (NOTIFICACIONES) ───────────────────────
        if parsed.path == '/api/avisos':
            try:
                with gestor_db.get_db() as conn:
                    cur = conn.cursor()
                    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='avisos'")
                    has_table = cur.fetchone()
                    if has_table:
                        cur.execute("SELECT id, autor_nick, titulo, mensaje, tipo, creado_en FROM avisos WHERE activo = 1 ORDER BY id DESC")
                        rows = cur.fetchall()
                        avisos = [dict(r) for r in rows]
                    else:
                        avisos = []
                self._send_json({"ok": True, "avisos": avisos})
            except Exception as e:
                self._send_json({"ok": True, "avisos": []})
            return

        # ─── API: ANALYTICS — RESUMEN PARA PANEL ADMIN ────────────────────────
        if parsed.path == '/api/analytics/resumen':
            try:
                dias = int(params.get('dias', [30])[0]) if params.get('dias') else 30
                dias = max(1, min(365, dias))  # Limitar entre 1 y 365 días
                res = gestor_db.obtener_resumen_analytics(dias)
                self._send_json(res)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: EL SALÓN DE HONOR (MÉRITOS REALES DE MIEMBROS) ─────────────
        if parsed.path == '/api/logros':
            try:
                categoria = params.get('categoria', [''])[0].strip() or None
                destacados_raw = params.get('destacados', ['0'])[0]
                solo_destacados = destacados_raw in ['1', 'true', 'True']
                nick = params.get('nick', [''])[0].strip() or None
                if nick:
                    logros = gestor_db.obtener_logros_por_nick(nick)
                else:
                    logros = gestor_db.obtener_logros_externos(categoria=categoria, solo_destacados=solo_destacados)
                self._send_json({"ok": True, "logros": logros})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: PREMIOS VISIBLES DE TEMPORADA ───────────────────────────────
        if parsed.path == '/api/premios':
            try:
                res = gestor_db.obtener_premios_activos()
                self._send_json(res)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CUMPLEAÑOS — CONSULTAS PÚBLICAS (GET) ───────────────────────
        # GET /api/cumpleanos/hoy → cumpleaños de hoy (público)
        if parsed.path == '/api/cumpleanos/hoy':
            try:
                resultado = gestor_db.obtener_cumpleanos_hoy()
                self._send_json({"ok": True, "cumpleanos": resultado, "total": len(resultado)})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # GET /api/cumpleanos/mes?mes=11 → cumpleaños del mes indicado (público)
        if parsed.path == '/api/cumpleanos/mes':
            try:
                mes_raw = params.get('mes', [None])[0]
                mes = int(mes_raw) if mes_raw else None
                resultado = gestor_db.obtener_cumpleanos_mes(mes)
                from gestor_db import MESES_ES
                nombre_mes = MESES_ES.get(mes if mes else 0, "")
                self._send_json({
                    "ok": True,
                    "mes": mes,
                    "mes_nombre": nombre_mes,
                    "cumpleanos": resultado,
                    "total": len(resultado)
                })
            except ValueError:
                self._send_json({"ok": False, "error": "El parámetro 'mes' debe ser un número entre 1 y 12"}, 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # GET /api/cumpleanos/mio?nick=Gandulfox86 → cumpleaños propio (sesión)
        if parsed.path == '/api/cumpleanos/mio':
            nick = params.get('nick', [''])[0].strip()
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            try:
                resultado = gestor_db.obtener_mi_cumpleanos(nick)
                self._send_json(resultado)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: MERCADO JUGÓN NATIVO — CONSULTAS (GET) ──────────────────────
        # GET /api/mercado/mias?nick=Gandulfox86 → mis publicaciones
        if parsed.path == '/api/mercado/mias':
            nick = params.get('nick', [''])[0].strip()
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            try:
                res = gestor_db.obtener_mis_publicaciones_mercado(nick)
                self._send_json({"ok": True, "publicaciones": res, "total": len(res)})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # GET /api/mercado/activas → catálogo activo ordenado
        if parsed.path == '/api/mercado/activas':
            try:
                data = gestor_db.exportar_mercado_json()
                self._send_json({"ok": True, "mercado": data.get("mercado", {})})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: RADAR JUGÓN NATIVO — CONSULTAS (GET) (PASO 9) ───────────────
        # GET /api/radar/mio?nick=Gandulfox86
        if parsed.path == '/api/radar/mio':
            nick = params.get('nick', [''])[0].strip()
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            try:
                res = gestor_db.obtener_radar_miembro(nick)
                self._send_json(res)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # GET /api/radar/lista
        if parsed.path == '/api/radar/lista':
            try:
                data = gestor_db.exportar_radar_json()
                self._send_json(data)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: MISIONES DIARIAS — CONSULTAS (GET) (FASE 5) ─────────────────
        # GET /api/misiones/estado?nick=...&fecha=YYYY-MM-DD&tipo=grupal
        if parsed.path == '/api/misiones/estado':
            nick = params.get('nick', [''])[0].strip()
            fecha = params.get('fecha', [datetime.now().strftime('%Y-%m-%d')])[0].strip()
            tipo = params.get('tipo', ['grupal'])[0].strip()
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            try:
                if tipo == 'todas':
                    res = gestor_db.obtener_entregas_misiones_dia(nick, fecha)
                else:
                    res = gestor_db.obtener_entrega_mision(nick, fecha, tipo)
                self._send_json(res)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # GET /api/misiones/pendientes?fecha=YYYY-MM-DD
        if parsed.path == '/api/misiones/pendientes':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            fecha = params.get('fecha', [''])[0].strip() or None
            try:
                pendientes = gestor_db.listar_misiones_pendientes(fecha)
                self._send_json({"ok": True, "pendientes": pendientes, "total": len(pendientes)})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ── GET /api/admin/solicitudes_miembros ─────────────────────────────
        if parsed.path == '/api/admin/solicitudes_miembros':
            if not self._check_admin_token(params):
                self._send_json({'ok': False, 'error': 'No autorizado'}, 401)
                return
            estado_filtro = _safe_str(params.get('estado', 'pendiente')) or 'pendiente'
            resultado = gestor_db.listar_solicitudes_miembros(estado_filtro)
            self._send_json({'ok': True, 'solicitudes': resultado, 'total': len(resultado)}, 200)
            return

        # ── GET /api/admin/solicitudes_eventos ──────────────────────────────
        if parsed.path == '/api/admin/solicitudes_eventos':
            if not self._check_admin_token(params):
                self._send_json({'ok': False, 'error': 'No autorizado'}, 401)
                return
            estado_filtro = _safe_str(params.get('estado', 'pendiente')) or 'pendiente'
            resultado = gestor_db.listar_solicitudes_eventos(estado_filtro)
            self._send_json({'ok': True, 'solicitudes': resultado, 'total': len(resultado)}, 200)
            return


        # ─── ARCHIVOS ESTÁTICOS ───────────────────────────────────────────────
        super().do_GET()


    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""

        params = {}
        content_type = self.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            try:
                params = json.loads(body)
            except Exception:
                params = {}
        else:
            # form-urlencoded
            qs = urllib.parse.parse_qs(body)
            params = {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in qs.items()}

        # Mezclar con query params si existen
        query_params = urllib.parse.parse_qs(parsed.query)
        for k, v in query_params.items():
            if k not in params:
                params[k] = v[0] if len(v) == 1 else v

        # ─── API: LOGIN CON CONTROL DE DISPOSITIVOS Y CLAVE PRIVADA ─────────
        if parsed.path == '/api/auth/login':
            phone = _safe_str(params.get('phone', params.get('telefono', '')))
            password = _safe_str(params.get('password', params.get('key', '')))
            device_id = _safe_str(params.get('device_id', ''))
            nick = _safe_str(params.get('nick', params.get('nombre', '')))

            if not phone or not password:
                self._send_json({"ok": False, "error": "datos_incompletos", "mensaje": "Teléfono y contraseña son obligatorios."}, 400)
                return

            try:
                res = gestor_db.verificar_credenciales_miembro(phone, password, device_id, nick)
                status_code = 200 if res.get("ok") else (403 if res.get("error") == "limite_dispositivos_alcanzado" else 401)
                self._send_json(res, status_code)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CREAR CONTRASEÑA PRIVADA PERSONAL ─────────────────────────
        if parsed.path == '/api/auth/crear_password_privada':
            phone = str(params.get('phone', params.get('telefono', ''))).strip()
            password = str(params.get('password', params.get('nueva_password', ''))).strip()

            if not phone or not password:
                self._send_json({"ok": False, "error": "datos_incompletos", "mensaje": "Teléfono y nueva contraseña son obligatorios."}, 400)
                return

            try:
                res = gestor_db.establecer_password_privada(phone, password)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ADMIN — RESETEAR DISPOSITIVOS VINCULADOS ──────────────────
        if parsed.path == '/api/admin/reset_dispositivos':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            phone = str(params.get('phone', params.get('telefono', ''))).strip()
            if not phone:
                self._send_json({"ok": False, "error": "telefono_requerido"}, 400)
                return
            try:
                res = gestor_db.admin_reset_dispositivos(phone)
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ADMIN — RESETEAR CONTRASEÑA PRIVADA A COMUNITARIA ─────────
        if parsed.path == '/api/admin/reset_password':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            phone = str(params.get('phone', params.get('telefono', ''))).strip()
            if not phone:
                self._send_json({"ok": False, "error": "telefono_requerido"}, 400)
                return
            try:
                res = gestor_db.admin_reset_password_privada(phone)
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        if parsed.path == '/api/admin/puntos':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            self._handle_admin_points(params)
            return

        if parsed.path == '/api/submit_score':
            self._handle_submit_score(params)
            return

        if parsed.path == '/api/admin/rentas':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            res = gestor_db.liquidar_renta_diaria()
            self._send_json(res, 200)
            return

        # ─── API: TORNEOS BGA — SINCRONIZAR DESDE EXTENSIÓN ─────────────────
        if parsed.path == '/api/torneos/sincronizar':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            try:
                tournament_id = str(params.get('tournamentId', '')).strip()
                tournament_name = str(params.get('tournamentName', 'Torneo BGA')).strip()
                game = str(params.get('game', '')).strip()
                status = str(params.get('status', 'En progreso')).strip()
                current_round = params.get('currentRound')
                players = params.get('players', [])
                url = str(params.get('url', '')).strip()
                total_players = _safe_int(params.get('totalPlayers', len(players)))

                if not tournament_id:
                    self._send_json({"ok": False, "error": "tournamentId es requerido"}, 400)
                    return
                if not isinstance(players, list):
                    players = []

                # Guardar/actualizar torneo en DB
                gestor_db.guardar_torneo({
                    'tournament_id': tournament_id,
                    'tournament_name': tournament_name,
                    'game': game,
                    'status': status,
                    'current_round': current_round,
                    'bga_url': url,
                    'total_players': total_players
                })

                # Obtener todos los jugadores AJ para fuzzy matching
                jugadores_aj = gestor_db.obtener_jugadores_todos()

                def normalize(s):
                    import unicodedata
                    s = str(s).lower().strip()
                    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
                    return s

                def fuzzy_match(bga_name, jugadores):
                    bga_norm = normalize(bga_name)
                    # 1. Prioridad Máxima: coincidencia exacta con bga_username configurado
                    for j in jugadores:
                        if j.get('bga_username') and normalize(j['bga_username']) == bga_norm:
                            return j
                    # 2. Coincidencia exacta con nick_web
                    for j in jugadores:
                        if j.get('nick_web') and normalize(j['nick_web']) == bga_norm:
                            return j
                    # 3. Coincidencia exacta con nick del jugador
                    for j in jugadores:
                        if j.get('nick') and normalize(j['nick']) == bga_norm:
                            return j
                    # 4. Coincidencia exacta con nombre de agenda admin
                    for j in jugadores:
                        if j.get('nombre_agenda_admin') and normalize(j['nombre_agenda_admin']) == bga_norm:
                            return j
                    # 5. Coincidencia parcial / substring
                    for j in jugadores:
                        nick_norm = normalize(j.get('nick', ''))
                        nick_web_norm = normalize(j.get('nick_web', ''))
                        bga_user_norm = normalize(j.get('bga_username', ''))
                        agenda_norm = normalize(j.get('nombre_agenda_admin', ''))
                        if bga_norm and ((bga_norm in nick_norm or nick_norm in bga_norm) or
                                         (nick_web_norm and (bga_norm in nick_web_norm or nick_web_norm in bga_norm)) or
                                         (bga_user_norm and (bga_norm in bga_user_norm or bga_user_norm in bga_norm)) or
                                         (agenda_norm and (bga_norm in agenda_norm or agenda_norm in bga_norm))):
                            return j
                    return None

                # Escala de puntos por posición
                def calcular_puntos(rank, total):
                    if rank == 1:
                        return 100, "1er lugar"
                    elif rank == 2:
                        return 70, "2do lugar"
                    elif rank == 3:
                        return 50, "3er lugar"
                    elif rank <= 6:
                        return 30, f"{rank}to lugar (top 6)"
                    elif rank <= (total // 2 + 1):
                        return 15, f"{rank}to lugar (mitad superior)"
                    else:
                        return 5, f"{rank}to lugar (participación)"

                matched_players = 0
                points_assigned = []

                # Solo asignar puntos si el torneo está terminado (status indica final)
                is_finished = any(kw in status.lower() for kw in ['finaliz', 'terminad', 'complet', 'finish', 'ended', 'over'])

                for player in players:
                    if isinstance(player, dict):
                        bga_name = _safe_str(player.get('name', ''))
                        rank = _safe_int(player.get('rank', 999), 999)
                        score = _safe_str(player.get('score', ''))
                        eliminated = bool(player.get('eliminated', False))
                        bga_user_id = _safe_str(player.get('bgaUserId', ''))
                    elif isinstance(player, str):
                        bga_name = player.strip()
                        rank = 999
                        score = ''
                        eliminated = False
                        bga_user_id = ''
                    else:
                        continue

                    if not bga_name:
                        continue

                    # Buscar coincidencia en jugadores AJ
                    matched = fuzzy_match(bga_name, jugadores_aj)

                    # Guardar participante
                    gestor_db.guardar_participante_torneo({
                        'tournament_id': tournament_id,
                        'bga_username': bga_name,
                        'nick_aj': matched['nick'] if matched else None,
                        'jugador_id': None,
                        'rank_actual': rank,
                        'score': score,
                        'eliminado': 1 if eliminated else 0
                    })

                    if matched:
                        matched_players += 1
                        # Asignar puntos solo si torneo terminado
                        if is_finished and rank < 999:
                            pts, reason = calcular_puntos(rank, total_players)
                            gestor_db.sumar_puntos_jugador(matched['nick'], pts, f"Torneo BGA: {tournament_name} — {reason}")
                            points_assigned.append({
                                'nick': matched['nick'],
                                'bga_username': bga_name,
                                'rank': rank,
                                'points': pts,
                                'reason': reason
                            })

                self._send_json({
                    "ok": True,
                    "tournament_id": tournament_id,
                    "tournament_name": tournament_name,
                    "total_players": total_players,
                    "matched_players": matched_players,
                    "points_assigned": points_assigned,
                    "is_finished": is_finished,
                    "mensaje": f"Torneo '{tournament_name}' sincronizado. {matched_players} miembros AJ identificados."
                })
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: TORNEOS BGA — FINALIZAR Y LIMPIAR DB ──────────────────────
        if parsed.path == '/api/torneos/finalizar':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            try:
                tournament_id = str(params.get('tournamentId', '')).strip()
                if not tournament_id:
                    self._send_json({"ok": False, "error": "tournamentId es requerido"}, 400)
                    return
                res = gestor_db.finalizar_torneo(tournament_id)
                self._send_json(res)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ADMIN — VINCULAR MIEMBRO CON USUARIO BGA / NICK ───────────
        if parsed.path == '/api/admin/vincular_bga':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            try:
                identificador = _safe_str(params.get('telefono', params.get('nick', params.get('identificador', ''))))
                bga_username = _safe_str(params.get('bga_username')) if params.get('bga_username') is not None else None
                nuevo_nick = _safe_str(params.get('nuevo_nick')) if params.get('nuevo_nick') is not None else None
                nombre_agenda = _safe_str(params.get('nombre_agenda')) if params.get('nombre_agenda') is not None else None
                nick_web = _safe_str(params.get('nick_web')) if params.get('nick_web') is not None else None

                if not identificador:
                    self._send_json({"ok": False, "error": "telefono_o_nick_requerido"}, 400)
                    return

                res = gestor_db.vincular_jugador_bga(
                    identificador=identificador,
                    bga_username=bga_username,
                    nuevo_nick=nuevo_nick,
                    nombre_agenda=nombre_agenda,
                    nick_web=nick_web
                )
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: GUARDAR JSON (Skin engine / admin-skins.html) ──────────────
        if parsed.path == '/save-json':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            try:
                file_name = params.get('file', '')
                if isinstance(file_name, list):
                    file_name = file_name[0]
                file_name = os.path.basename(str(file_name).strip())  # sanitize
                if not file_name.endswith('.json'):
                    self._send_json({"ok": False, "error": "solo_archivos_json_permitidos"}, 400)
                    return
                data_to_write = params.get('data')
                if not file_name or data_to_write is None:
                    self._send_json({"ok": False, "error": "file y data son requeridos"}, 400)
                    return
                target_path = os.path.join(BASE_DIR, file_name)
                if isinstance(data_to_write, str):
                    json_str = data_to_write
                else:
                    json_str = json.dumps(data_to_write, ensure_ascii=False, indent=2)
                with open(target_path, 'w', encoding='utf-8') as f:
                    f.write(json_str)
                print(f"✅ [save-json] Guardado: {file_name}")
                self._send_json({"ok": True, "file": file_name})
            except Exception as e:
                print(f"❌ [save-json] Error: {e}")
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        if parsed.path == '/api/debit_points':
            nick = params.get('nick', '')
            game = params.get('game', 'arcade')
            costo = _safe_int(params.get('amount', 10), 10)
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            exito = gestor_db.registrar_partida(nick, game, costo)
            if exito:
                with gestor_db.get_db() as conn:
                    cur = conn.cursor()
                    cur.execute("SELECT puntos FROM jugadores WHERE nick = ?", (nick,))
                    row = cur.fetchone()
                    saldo = row["puntos"] if row else 0
                self._send_json({"ok": True, "nick": nick, "remaining": saldo, "debited": costo})
            else:
                self._send_json({"ok": False, "error": "saldo_insuficiente_o_usuario_no_encontrado"}, 400)
            return

        # ─── API: VOTAR EN ENCUESTA GEEK (+1 PTS al votante) ─────────────────
        if parsed.path == '/api/encuestas/votar':
            nick = params.get('nick', '')
            if isinstance(nick, list): nick = nick[0]
            nick = str(nick).strip()

            encuesta_id = _safe_int(params.get('encuesta_id', 0), 0)
            score = _safe_int(params.get('score', 0), 0)

            comentario = params.get('comentario', '')
            if isinstance(comentario, list): comentario = comentario[0]
            comentario = str(comentario).strip()

            if not nick or not encuesta_id or score < 1 or score > 10:
                self._send_json({"ok": False, "error": "Parámetros inválidos (nick, encuesta_id, score 1-10)"}, 400)
                return

            try:
                res = gestor_db.registrar_voto(encuesta_id, nick, score, comentario)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CREAR NUEVA ENCUESTA SEMANAL (admin/Lunara) ────────────────
        if parsed.path == '/api/encuestas/nueva':
            categoria = params.get('categoria', '')
            if isinstance(categoria, list): categoria = categoria[0]
            categoria = str(categoria).strip().lower()

            catalogo_id_raw = params.get('catalogo_id', None)
            catalogo_id = _safe_int(catalogo_id_raw, None) if catalogo_id_raw else None

            if not categoria:
                self._send_json({"ok": False, "error": "categoria requerida"}, 400)
                return

            try:
                res = gestor_db.crear_encuesta_semanal(categoria, catalogo_id)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: AGREGAR ÍTEM AL CATÁLOGO (Lunara / admin) ──────────────────
        if parsed.path == '/api/encuestas/catalogo':
            categoria = params.get('categoria', '')
            if isinstance(categoria, list): categoria = categoria[0]
            nombre = params.get('nombre', '')
            if isinstance(nombre, list): nombre = nombre[0]
            descripcion = params.get('descripcion', None)
            if isinstance(descripcion, list): descripcion = descripcion[0]
            anio_raw = params.get('anio', None)
            anio = None
            if anio_raw:
                try:
                    anio = int(anio_raw if not isinstance(anio_raw, list) else anio_raw[0])
                except (ValueError, TypeError):
                    anio = None

            if not categoria or not nombre:
                self._send_json({"ok": False, "error": "categoria y nombre son obligatorios"}, 400)
                return

            try:
                res = gestor_db.agregar_al_catalogo(categoria, nombre, descripcion, None, anio)
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CREAR NUEVA JUNTA / MESA ──────────────────────────────────
        if parsed.path == '/api/juntas':
            juego = str(params.get('juego', '')).strip()
            fecha = str(params.get('fecha', '')).strip()
            hora = str(params.get('hora', '')).strip()
            lugar = str(params.get('lugar', '')).strip()
            comuna_sector = str(params.get('comuna_sector', '')).strip()
            cupos_totales = params.get('cupos_totales', 4)
            organizador_nick = str(params.get('organizador_nick', '')).strip()
            organizador_whatsapp = str(params.get('organizador_whatsapp', '')).strip()
            descripcion_notas = str(params.get('descripcion_notas', '')).strip()

            if not juego or not fecha or not lugar or not organizador_nick:
                self._send_json({"ok": False, "error": "juego, fecha, lugar y organizador_nick son obligatorios"}, 400)
                return

            try:
                res = gestor_db.crear_junta(
                    juego=juego, fecha=fecha, hora=hora, lugar=lugar,
                    comuna_sector=comuna_sector, cupos_totales=cupos_totales,
                    organizador_nick=organizador_nick, organizador_whatsapp=organizador_whatsapp,
                    descripcion_notas=descripcion_notas
                )
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ANOTARSE EN MESA / JUNTA ──────────────────────────────────
        if parsed.path == '/api/juntas/unirse':
            junta_id = _safe_int(params.get('junta_id', 0), 0)
            nick = str(params.get('nick', '')).strip()
            whatsapp = str(params.get('whatsapp', '')).strip()

            if not junta_id or not nick:
                self._send_json({"ok": False, "error": "junta_id y nick son obligatorios"}, 400)
                return

            try:
                res = gestor_db.unirse_a_junta(junta_id, nick, whatsapp)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: BAJARSE DE MESA / JUNTA ───────────────────────────────────
        if parsed.path == '/api/juntas/bajarse':
            junta_id = _safe_int(params.get('junta_id', 0), 0)
            nick = str(params.get('nick', '')).strip()

            if not junta_id or not nick:
                self._send_json({"ok": False, "error": "junta_id y nick son obligatorios"}, 400)
                return

            try:
                res = gestor_db.bajarse_de_junta(junta_id, nick)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CANCELAR MESA / JUNTA ─────────────────────────────────────
        if parsed.path == '/api/juntas/cancelar':
            junta_id = _safe_int(params.get('junta_id', 0), 0)
            nick = str(params.get('nick', '')).strip()

            if not junta_id or not nick:
                self._send_json({"ok": False, "error": "junta_id y nick son obligatorios"}, 400)
                return

            try:
                res = gestor_db.cancelar_junta(junta_id, nick)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: HEARTBEAT (PRESENCIA ONLINE) ─────────────────────────────
        if parsed.path == '/api/heartbeat':
            nick = str(params.get('nick', '')).strip()
            pagina = str(params.get('pagina', 'inicio')).strip()
            avatar_url = str(params.get('avatar_url', '') or '').strip() or None

            if not nick or nick == 'Invitado':
                self._send_json({"ok": False, "error": "nick requerido"}, 400)
                return
            try:
                res = gestor_db.heartbeat(nick, pagina, avatar_url)
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ANALYTICS — REGISTRAR PAGEVIEW ──────────────────────────
        if parsed.path == '/api/analytics/pageview':
            visitor_id = str(params.get('visitor_id', '')).strip()
            pagina     = str(params.get('pagina', '/')).strip()
            titulo     = str(params.get('titulo', '') or '').strip() or None
            nick       = str(params.get('nick', '') or '').strip() or None
            tipo       = str(params.get('tipo', 'visitante')).strip()
            dispositivo = str(params.get('dispositivo', 'desktop')).strip()
            referrer   = str(params.get('referrer', '') or '').strip() or None
            session_id = str(params.get('session_id', '') or '').strip() or None

            if not visitor_id or not pagina:
                self._send_json({"ok": False, "error": "visitor_id y pagina son obligatorios"}, 400)
                return

            # Validar dispositivo
            if dispositivo not in ('mobile', 'desktop', 'tablet'):
                dispositivo = 'desktop'
            # Validar tipo_usuario
            if tipo not in ('visitante', 'miembro'):
                tipo = 'visitante'
            # Si tiene nick, forzar tipo miembro
            if nick:
                tipo = 'miembro'
            else:
                nick = None

            try:
                res = gestor_db.registrar_visita(
                    visitor_id=visitor_id,
                    pagina=pagina,
                    titulo_pagina=titulo,
                    nick=nick,
                    tipo_usuario=tipo,
                    dispositivo=dispositivo,
                    referrer=referrer,
                    session_id=session_id
                )
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: ANALYTICS — ACTUALIZAR DURACIÓN EN PÁGINA ──────────────
        if parsed.path == '/api/analytics/duracion':
            visita_id  = _safe_int(params.get('visita_id', 0), 0)
            duracion   = _safe_int(params.get('duracion_seg', 0), 0)

            if not visita_id:
                self._send_json({"ok": False, "error": "visita_id es obligatorio"}, 400)
                return
            try:
                res = gestor_db.actualizar_duracion_visita(visita_id, duracion)
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: GUARDAR AVATAR DE PERFIL ───────────────────────────────
        if parsed.path == '/api/perfil/avatar':
            nick = str(params.get('nick', '')).strip()
            avatar_url = str(params.get('avatar_url', '')).strip()

            if not nick or not avatar_url:
                self._send_json({"ok": False, "error": "nick y avatar_url son obligatorios"}, 400)
                return
            try:
                res = gestor_db.guardar_avatar(nick, avatar_url)
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CREAR/EDITAR EN SALÓN DE HONOR (ADMIN) ─────────────────────
        if parsed.path == '/api/admin/logros':
            try:
                logro_id = _safe_int(params.get('id', 0), 0)
                nick = str(params.get('nick', '')).strip()
                titulo = str(params.get('titulo', '')).strip()
                descripcion = str(params.get('descripcion', '')).strip()
                categoria = str(params.get('categoria', 'general')).strip()
                emoji = str(params.get('emoji_categoria', params.get('emoji', '🎖️'))).strip()
                fecha_logro = params.get('fecha_logro', None)
                instagram_user = params.get('instagram_user', None)
                instagram_url = params.get('instagram_url', None)
                enlace = params.get('enlace_referencia', params.get('enlace', None))
                imagen_url = params.get('imagen_url', None)
                destacado = _safe_int(params.get('destacado', 0), 0)
                visible = _safe_int(params.get('visible', 1), 1)

                if logro_id > 0:
                    res = gestor_db.editar_logro_externo(
                        logro_id,
                        titulo=titulo,
                        descripcion=descripcion,
                        categoria=categoria,
                        emoji_categoria=emoji,
                        fecha_logro=fecha_logro,
                        instagram_user=instagram_user,
                        instagram_url=instagram_url,
                        enlace_referencia=enlace,
                        imagen_url=imagen_url,
                        destacado=destacado,
                        visible=visible
                    )
                    self._send_json({"ok": True, "id": logro_id, "actualizado": res})
                else:
                    if not nick or not titulo or not descripcion:
                        self._send_json({"ok": False, "error": "nick, titulo y descripcion son obligatorios"}, 400)
                        return
                    new_id = gestor_db.crear_logro_externo(
                        nick=nick,
                        titulo=titulo,
                        descripcion=descripcion,
                        categoria=categoria,
                        emoji=emoji,
                        fecha_logro=fecha_logro,
                        instagram_user=instagram_user,
                        instagram_url=instagram_url,
                        enlace=enlace,
                        imagen_url=imagen_url,
                        destacado=destacado
                    )
                    self._send_json({"ok": True, "id": new_id, "creado": True})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CREAR/EDITAR PREMIO DE TEMPORADA (ADMIN) ───────────────────
        if parsed.path == '/api/admin/premios':
            try:
                premio_id = _safe_int(params.get('id', 0), 0)
                temporada = str(params.get('temporada', '2026-T1')).strip()
                titulo = str(params.get('titulo', '')).strip()
                descripcion_general = str(params.get('descripcion_general', params.get('descripcion', ''))).strip()
                donante = str(params.get('donante', '')).strip()
                descripcion_donante = params.get('descripcion_donante', None)
                meta_puntos = _safe_int(params.get('meta_puntos', 1000), 1000)
                tipo_premio = str(params.get('tipo_premio', 'juego_mesa')).strip()
                emoji_tipo = str(params.get('emoji_tipo', '🎲')).strip()
                imagen_url = params.get('imagen_url', None)
                activo = _safe_int(params.get('activo', 1), 1)
                orden = _safe_int(params.get('orden', 1), 1)

                if premio_id > 0:
                    res = gestor_db.editar_premio(
                        premio_id,
                        titulo=titulo,
                        descripcion_general=descripcion_general,
                        donante=donante,
                        descripcion_donante=descripcion_donante,
                        meta_puntos=meta_puntos,
                        tipo_premio=tipo_premio,
                        emoji_tipo=emoji_tipo,
                        imagen_url=imagen_url,
                        activo=activo,
                        orden=orden
                    )
                    self._send_json({"ok": True, "id": premio_id, "actualizado": res})
                else:
                    if not titulo or not descripcion_general or not donante:
                        self._send_json({"ok": False, "error": "titulo, descripcion_general y donante son obligatorios"}, 400)
                        return
                    new_id = gestor_db.crear_premio(
                        temporada=temporada,
                        titulo=titulo,
                        descripcion_general=descripcion_general,
                        donante=donante,
                        descripcion_donante=descripcion_donante,
                        meta_puntos=meta_puntos,
                        tipo_premio=tipo_premio,
                        emoji_tipo=emoji_tipo,
                        imagen_url=imagen_url,
                        orden=orden
                    )
                    self._send_json({"ok": True, "id": new_id, "creado": True})
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CUMPLEAÑOS — GUARDAR / ACTUALIZAR (POST) ───────────────────
        if parsed.path == '/api/cumpleanos/guardar':
            nick = str(params.get('nick', '')).strip()
            dia = _safe_int(params.get('dia', 0), 0)
            mes = _safe_int(params.get('mes', 0), 0)
            saludo_raw = params.get('saludo_publico', True)
            if isinstance(saludo_raw, str):
                saludo_publico = saludo_raw.lower() not in ('0', 'false', 'no')
            else:
                saludo_publico = bool(saludo_raw)

            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            if not (1 <= dia <= 31) or not (1 <= mes <= 12):
                self._send_json({"ok": False, "error": "dia_o_mes_invalido", "mensaje": "Día (1-31) y Mes (1-12) son obligatorios."}, 400)
                return

            try:
                res = gestor_db.guardar_cumpleanos(nick, dia, mes, saludo_publico)
                if res.get("ok"):
                    gestor_db.exportar_cumpleanos_json()
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CUMPLEAÑOS — BORRAR (POST) ─────────────────────────────────
        if parsed.path == '/api/cumpleanos/borrar':
            nick = str(params.get('nick', '')).strip()
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            try:
                res = gestor_db.borrar_cumpleanos(nick)
                if res.get("ok"):
                    gestor_db.exportar_cumpleanos_json()
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: CUMPLEAÑOS — EXPORTAR JSON (POST/GET) ───────────────────────
        if parsed.path == '/api/cumpleanos/exportar':
            try:
                res = gestor_db.exportar_cumpleanos_json()
                self._send_json(res, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: MERCADO JUGÓN NATIVO — ACCIONES (POST) ──────────────────────
        # POST /api/mercado/publicar
        if parsed.path == '/api/mercado/publicar':
            nick = str(params.get('nick', '')).strip()
            categoria = str(params.get('categoria', 'Vender')).strip()
            titulo = str(params.get('titulo', '')).strip()
            estado = str(params.get('estado', 'Nuevo')).strip()
            descripcion = str(params.get('descripcion', '')).strip()
            foto = str(params.get('foto', params.get('foto_url', ''))).strip()
            precio = params.get('precio', params.get('precio_clp', 0))
            disponibles = params.get('disponibles', 1)
            contacto = str(params.get('contacto', params.get('contacto_instagram', ''))).strip()

            if not nick or not titulo:
                self._send_json({"ok": False, "error": "nick_y_titulo_requeridos", "mensaje": "El título del producto es obligatorio."}, 400)
                return

            try:
                res = gestor_db.publicar_en_mercado(
                    nick=nick,
                    categoria=categoria,
                    titulo=titulo,
                    estado_producto=estado,
                    descripcion=descripcion,
                    foto_url=foto,
                    precio_clp=precio,
                    disponibles=disponibles,
                    contacto_instagram=contacto
                )
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # POST /api/mercado/vender
        if parsed.path == '/api/mercado/vender':
            pub_id = _safe_int(params.get('id', params.get('publicacion_id', 0)), 0)
            nick = str(params.get('nick', '')).strip()
            if not pub_id or not nick:
                self._send_json({"ok": False, "error": "id_y_nick_requeridos"}, 400)
                return
            try:
                res = gestor_db.marcar_producto_vendido(pub_id, nick)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # POST /api/mercado/eliminar
        if parsed.path in ('/api/mercado/eliminar', '/api/mercado/borrar'):
            pub_id = _safe_int(params.get('id', params.get('publicacion_id', 0)), 0)
            nick = str(params.get('nick', '')).strip()
            if not pub_id or not nick:
                self._send_json({"ok": False, "error": "id_y_nick_requeridos"}, 400)
                return
            try:
                res = gestor_db.eliminar_publicacion_mercado(pub_id, nick)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # POST /api/mercado/exportar
        if parsed.path == '/api/mercado/exportar':
            try:
                res = gestor_db.exportar_mercado_json()
                self._send_json({"ok": True, "resumen": res}, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: RADAR JUGÓN NATIVO (POST) (PASO 9) ──────────────────────────
        # POST /api/radar/guardar
        if parsed.path == '/api/radar/guardar':
            nick = _safe_str(params.get('nick'))
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            try:
                dias_raw = params.get('dias_disponibles', [])
                dias_list = dias_raw if isinstance(dias_raw, list) else [str(dias_raw)]
                res = gestor_db.guardar_radar(
                    nick=nick,
                    zona=_safe_str(params.get('zona'), 'Sector Santiago'),
                    estilos=_safe_str(params.get('estilos')),
                    favoritos=_safe_str(params.get('favoritos')),
                    coleccion=_safe_str(params.get('coleccion')),
                    dias_disponibles=dias_list,
                    horario_preferido=_safe_str(params.get('horario_preferido'), 'Tarde / Noche (17:00 - 21:00)'),
                    busca_jugadores_para=_safe_str(params.get('busca_jugadores_para'))
                )
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # POST /api/radar/eliminar o /api/radar/borrar
        if parsed.path in ('/api/radar/eliminar', '/api/radar/borrar'):
            nick = _safe_str(params.get('nick'))
            if not nick:
                self._send_json({"ok": False, "error": "nick_requerido"}, 400)
                return
            try:
                res = gestor_db.eliminar_radar_miembro(nick)
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # POST /api/radar/exportar
        if parsed.path == '/api/radar/exportar':
            try:
                res = gestor_db.exportar_radar_json()
                self._send_json({"ok": True, "resumen": res}, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ─── API: MISIONES DIARIAS Y PRUEBAS EFÍMERAS (POST) (FASE 5) ────────
        # POST /api/misiones/subir_pruebas
        # Acepta JSON con { "nick": "...", "fecha": "YYYY-MM-DD", "imagenes": [ { "base64": "...", "nombre": "p1.webp" } ] }
        # Guarda las imágenes temporalmente en uploads/temp_misiones/
        if parsed.path == '/api/misiones/subir_pruebas':
            nick = _safe_str(params.get('nick'))
            fecha = _safe_str(params.get('fecha'), datetime.now(timezone.utc).strftime('%Y-%m-%d'))
            imagenes = params.get('imagenes', [])
            if not nick or not imagenes:
                self._send_json({"ok": False, "error": "nick_e_imagenes_requeridos"}, 400)
                return
            try:
                import base64
                import uuid
                guardadas = []
                dest_dir = os.path.join(BASE_DIR, "uploads", "temp_misiones")
                os.makedirs(dest_dir, exist_ok=True)

                # Garbage Collection preventivo (SIM-02): purgar fotos huérfanas > 48 horas
                try:
                    ahora_ts = datetime.now(timezone.utc).timestamp()
                    for f_existente in os.listdir(dest_dir):
                        ruta_existente = os.path.join(dest_dir, f_existente)
                        if os.path.isfile(ruta_existente):
                            if ahora_ts - os.path.getmtime(ruta_existente) > 172800: # 48 horas
                                os.remove(ruta_existente)
                except Exception:
                    pass

                for idx, img_data in enumerate(imagenes):
                    if not isinstance(img_data, dict):
                        continue
                    b64_str = _safe_str(img_data.get('base64', ''))
                    if ',' in b64_str:
                        b64_str = b64_str.split(',', 1)[1]
                    file_bytes = base64.b64decode(b64_str)
                    clean_nick = re.sub(r'[^a-zA-Z0-9_-]', '', nick)
                    img_name = _safe_str(img_data.get('nombre', ''))
                    ext = "webp" if "webp" in img_name.lower() else "jpg"
                    unique_name = f"{fecha}_{clean_nick}_{uuid.uuid4().hex[:8]}_{idx+1}.{ext}"
                    file_path = os.path.join(dest_dir, unique_name)
                    with open(file_path, "wb") as f_img:
                        f_img.write(file_bytes)
                    guardadas.append(f"/uploads/temp_misiones/{unique_name}")

                self._send_json({"ok": True, "urls": guardadas, "total": len(guardadas)}, 200)
            except Exception as e:
                self._send_json({"ok": False, "error": f"Error subiendo pruebas: {e}"}, 500)
            return

        # POST /api/misiones/entregar
        if parsed.path == '/api/misiones/entregar':
            nick = _safe_str(params.get('nick'))
            fecha = _safe_str(params.get('fecha'), datetime.now(timezone.utc).strftime('%Y-%m-%d'))
            tipo = _safe_str(params.get('tipo'), 'grupal')
            desafios_raw = params.get('desafios', [])
            desafios = desafios_raw if isinstance(desafios_raw, list) else [str(desafios_raw)]
            pruebas_raw = params.get('pruebas', [])
            pruebas = pruebas_raw if isinstance(pruebas_raw, list) else [str(pruebas_raw)]
            if not nick or not desafios:
                self._send_json({"ok": False, "error": "nick_y_desafios_requeridos"}, 400)
                return
            try:
                res = gestor_db.registrar_entrega_mision(
                    nick=nick,
                    fecha_mision=fecha,
                    tipo_mision=tipo,
                    desafios_completados=desafios,
                    pruebas_urls=pruebas
                )
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # POST /api/misiones/moderar
        # 1-Check Admin: aprueba o rechaza y purga físicamente las imágenes del servidor
        if parsed.path == '/api/misiones/moderar':
            if not self._is_admin(params):
                self._send_json({"ok": False, "error": "unauthorized_admin_token_required"}, 401)
                return
            mision_id_raw = params.get('mision_id')
            mision_id = _safe_int(mision_id_raw)
            accion = _safe_str(params.get('accion'), 'aprobar')
            admin_nick = _safe_str(params.get('admin_nick'), 'Admin')
            comentario = _safe_str(params.get('comentario'))
            puntos = _safe_int(params.get('puntos'), 7)
            if not mision_id:
                self._send_json({"ok": False, "error": "mision_id_requerido"}, 400)
                return
            try:
                res = gestor_db.moderar_mision(
                    mision_id=mision_id,
                    accion=accion,
                    admin_nick=admin_nick,
                    comentario=comentario,
                    puntos_custom=puntos
                )
                self._send_json(res, 200 if res.get("ok") else 400)
            except Exception as e:
                self._send_json({"ok": False, "error": str(e)}, 500)
            return

        # ── POST /api/solicitudes/miembro_destacado ─────────────────────────
        if parsed.path == '/api/solicitudes/miembro_destacado':
            nick = _safe_str(params.get('nick'))
            categoria = _safe_str(params.get('categoria')).lower()
            nombre_proyecto = _safe_str(params.get('nombre_proyecto'))
            enlace = _safe_str(params.get('enlace'))
            descripcion = _safe_str(params.get('descripcion'))
            imagen_url = _safe_str(params.get('imagen_url'))
            if not nick or not categoria or not nombre_proyecto or not enlace:
                self._send_json({'ok': False, 'error': 'Campos nick, categoria, nombre_proyecto y enlace son obligatorios'}, 400)
                return
            res = gestor_db.guardar_solicitud_miembro(nick, categoria, nombre_proyecto, enlace, descripcion, imagen_url)
            self._send_json(res, 200 if res.get('ok') else 400)
            return

        # ── POST /api/admin/solicitudes_miembros ────────────────────────────
        if parsed.path == '/api/admin/solicitudes_miembros':
            if not self._check_admin_token(params):
                self._send_json({'ok': False, 'error': 'No autorizado'}, 401)
                return
            estado_filtro = _safe_str(params.get('estado', 'pendiente')) or 'pendiente'
            resultado = gestor_db.listar_solicitudes_miembros(estado_filtro)
            self._send_json({'ok': True, 'solicitudes': resultado, 'total': len(resultado)}, 200)
            return

        # ── POST /api/admin/moderar_solicitud ───────────────────────────────
        if parsed.path == '/api/admin/moderar_solicitud':
            if not self._check_admin_token(params):
                self._send_json({'ok': False, 'error': 'No autorizado'}, 401)
                return
            try:
                sol_id = int(_safe_str(params.get('solicitud_id', '0')) or 0)
            except (ValueError, TypeError):
                sol_id = 0
            accion = _safe_str(params.get('accion')).lower()
            admin_nick = _safe_str(params.get('admin_nick', 'Admin')) or 'Admin'
            if not sol_id or not accion:
                self._send_json({'ok': False, 'error': 'solicitud_id y accion son obligatorios'}, 400)
                return
            res = gestor_db.moderar_solicitud_miembro(sol_id, accion, admin_nick)
            self._send_json(res, 200 if res.get('ok') else 400)
            return

        # ── POST /api/solicitudes/evento ────────────────────────────────────
        if parsed.path == '/api/solicitudes/evento':
            nick = _safe_str(params.get('nick'))
            categoria = _safe_str(params.get('categoria', 'Evento'))
            nombre = _safe_str(params.get('nombre'))
            organizador = _safe_str(params.get('organizador'))
            fecha_inicio = _safe_str(params.get('fecha_inicio'))
            fecha_termino = _safe_str(params.get('fecha_termino'))
            ubicacion = _safe_str(params.get('ubicacion'))
            descripcion = _safe_str(params.get('descripcion'))
            costo = _safe_str(params.get('costo', 'Gratis')) or 'Gratis'
            requiere_inscripcion = _safe_str(params.get('requiere_inscripcion', 'No')) or 'No'
            cupos_limitados = _safe_str(params.get('cupos_limitados', 'No')) or 'No'
            link_red_social = _safe_str(params.get('link_red_social'))
            link_afiche = _safe_str(params.get('link_afiche'))

            if not nick or not nombre or not organizador or not fecha_inicio or not fecha_termino or not ubicacion or not descripcion or not link_red_social or not link_afiche:
                self._send_json({'ok': False, 'error': 'Todos los campos obligatorios deben ser completados'}, 400)
                return

            res = gestor_db.guardar_solicitud_evento(
                nick=nick, categoria=categoria, nombre=nombre, organizador=organizador,
                fecha_inicio=fecha_inicio, fecha_termino=fecha_termino, ubicacion=ubicacion,
                descripcion=descripcion, costo=costo, requiere_inscripcion=requiere_inscripcion,
                cupos_limitados=cupos_limitados, link_red_social=link_red_social, link_afiche=link_afiche
            )
            self._send_json(res, 200 if res.get('ok') else 400)
            return

        # ── POST /api/admin/solicitudes_eventos ─────────────────────────────
        if parsed.path == '/api/admin/solicitudes_eventos':
            if not self._check_admin_token(params):
                self._send_json({'ok': False, 'error': 'No autorizado'}, 401)
                return
            estado_filtro = _safe_str(params.get('estado', 'pendiente')) or 'pendiente'
            resultado = gestor_db.listar_solicitudes_eventos(estado_filtro)
            self._send_json({'ok': True, 'solicitudes': resultado, 'total': len(resultado)}, 200)
            return

        # ── POST /api/admin/moderar_evento ──────────────────────────────────
        if parsed.path == '/api/admin/moderar_evento':
            if not self._check_admin_token(params):
                self._send_json({'ok': False, 'error': 'No autorizado'}, 401)
                return
            try:
                evento_id = int(_safe_str(params.get('evento_id', '0')) or 0)
            except (ValueError, TypeError):
                evento_id = 0
            accion = _safe_str(params.get('accion')).lower()
            admin_nick = _safe_str(params.get('admin_nick', 'Admin')) or 'Admin'
            if not evento_id or not accion:
                self._send_json({'ok': False, 'error': 'evento_id y accion son obligatorios'}, 400)
                return
            res = gestor_db.moderar_solicitud_evento(evento_id, accion, admin_nick)
            self._send_json(res, 200 if res.get('ok') else 400)
            return

        self._send_json({"ok": False, "error": "endpoint_no_encontrado"}, 404)



    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _handle_admin_points(self, params):
        # Normalizar parámetros
        nick = params.get('nick', '')
        if isinstance(nick, list):
            nick = nick[0]
        nick = str(nick).strip()

        tipo = params.get('tipo', 'TARJETA_DIARIA')
        if isinstance(tipo, list):
            tipo = tipo[0]
        tipo = str(tipo).strip().upper()

        motivo = params.get('motivo', 'Carga desde Google Forms')
        if isinstance(motivo, list):
            motivo = motivo[0]
        motivo = str(motivo).strip()

        autor = params.get('autor', 'Admin')
        if isinstance(autor, list):
            autor = autor[0]
        autor = str(autor).strip()

        if not nick:
            self._send_json({"ok": False, "error": "nick_es_obligatorio"}, 400)
            return

        # Operación especial: CONTRAATAQUE (Caparazón Azul)
        if tipo == 'CONTRAATAQUE':
            try:
                puntos_restar = int(params.get('puntos', 5))
            except (ValueError, TypeError):
                puntos_restar = 5
            res = gestor_db.ejecutar_contraataque(nick, puntos_restar, motivo, autor)
            self._send_json(res, 200 if res.get("ok") else 400)
            return

        # Operación regular: ASIGNACIÓN DE PUNTOS
        try:
            puntos = int(params.get('puntos', 0))
        except (ValueError, TypeError):
            puntos = 0

        # Si viene de Google Forms con tipo predeterminado y puntos en 0, autocalcular:
        if puntos == 0:
            if '5' in tipo:
                puntos = 5
            elif '10' in tipo:
                puntos = 10
            elif '15' in tipo:
                puntos = 15
            elif 'BONUS' in tipo:
                puntos = 1
            elif 'RENTA_3' in tipo or 'RENTA 3' in tipo:
                puntos = 3
            elif 'RENTA_2' in tipo or 'RENTA 2' in tipo:
                puntos = 2
            elif 'RENTA_1' in tipo or 'RENTA 1' in tipo:
                puntos = 1

        res = gestor_db.asignar_puntos(nick, puntos, tipo, motivo, autor)
        self._send_json(res, 200)

    def _handle_submit_score(self, params):
        def _get_val(k, default=None):
            v = params.get(k, default)
            return v[0] if isinstance(v, list) and len(v) > 0 else v

        nick = str(_get_val('nick', '')).strip()
        game = str(_get_val('game', 'carrera')).strip().lower()

        if not nick:
            self._send_json({"ok": False, "error": "nick_requerido"}, 400)
            return

        if game in ['carrera', 'circuito_black']:
            try:
                km = float(_get_val('km', _get_val('score', 0)))
            except (ValueError, TypeError):
                km = 0.0
            try:
                bonus = int(_get_val('bonus', 0))
            except (ValueError, TypeError):
                bonus = 0
            res = gestor_db.actualizar_record_carrera(nick, km, bonus)
            self._send_json(res, 200)
            return

        if game in ['pelea', 'cyber_ninja', 'dohyo']:
            try:
                score = int(_get_val('score', 0))
            except (ValueError, TypeError):
                score = 0
            try:
                cortes = int(_get_val('cortes', 0))
            except (ValueError, TypeError):
                cortes = 0
            try:
                tiempo = int(_get_val('tiempo', 0))
            except (ValueError, TypeError):
                tiempo = 0
            res = gestor_db.actualizar_record_pelea(nick, score, cortes, tiempo)
            self._send_json(res, 200)
            return

        self._send_json({"ok": False, "error": f"juego_desconocido: {game}"}, 400)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        self.wfile.write(body)

    def _check_admin_token(self, params):
        """Verifica el token de administrador en los parámetros."""
        import os
        ADMIN_TOKEN = os.environ.get('AJ_ADMIN_TOKEN', 'AJ_SECRET_ADMIN_TOKEN_2026_XYZ')
        token = params.get('token', '')
        if isinstance(token, list):
            token = token[0] if token else ''
        return str(token).strip() == ADMIN_TOKEN

    def end_headers(self):
        # Desactivar caché para archivos de datos dinámicos
        if self.path.endswith('.json') or '/api/' in self.path:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), AJRequestHandler) as httpd:
        print(f"🚀 Servidor Amigos Jugones (SQLite Nativo Multihilo) listo en: http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido.")

if __name__ == '__main__':
    run_server()
