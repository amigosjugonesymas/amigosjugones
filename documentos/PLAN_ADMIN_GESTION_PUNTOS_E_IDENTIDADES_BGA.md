# 📑 PLAN MAESTRO: GESTOR DINÁMICO DE PUNTOS Y REGISTRO CENTRAL DE IDENTIDADES BGA
**Amigos Jugones — Especificación Técnica de Arquitectura, Backend y Frontend para Agentes de Desarrollo**
*Fecha de Creación: 24/11/2026 | Versión: 2.0.0 | Destino: `admin_panel/Index.html`, `server.py`, `database/gestor_db.py`, `config_economia.json`*

---

## 🧭 1. RESUMEN EJECUTIVO Y OBJETIVOS

Este documento constituye la **guía técnica exhaustiva e inequívoca** para que cualquier agente de IA o desarrollador implemente dos módulos de gestión en el Panel de Administración de Amigos Jugones (`admin_panel/Index.html`):

1. **Gestor Central de Puntos y Economía Dinámica (Cero Hardcoding):**
   - Una interfaz administrativa donde el Administrador visualiza y modifica en caliente **cualquier valor de puntos** otorgado en la plataforma (Torneos BGA, Arcade, Ranking Principal, Dinámicas y Trivias).
   - Ningún valor numérico de puntos puede estar cableado (hardcoded) en el código fuente.
2. **Registro Maestro de Identidades y Vinculación BGA (Mapeo de 4 Nombres):**
   - Una tabla administrativa centralizada para vincular y sincronizar los cuatro identificadores de cada jugador:
     1. **Teléfono WhatsApp:** Clave primaria única (`telefono`).
     2. **Nick en la Web:** Apodo público de juego registrado por el usuario (`nick_web` / `nick`).
     3. **Nombre Agenda Admin:** Nombre real o etiqueta con la que el admin lo tiene en WhatsApp (`nombre_agenda_admin`).
     4. **Nick en Board Game Arena:** Usuario del jugador en la plataforma BGA (`bga_username`).
   - **Mecanismo de Reconciliación Retroactiva Inmediata:** Si un jugador participó o ganó podio en torneos de BGA siendo un usuario desconocido o no registrado en la web, al momento de que el Administrador escriba su Nick de BGA en la fila correspondiente a su teléfono/cuenta, el sistema detecta de forma automática todos sus torneos históricos pendientes y le acredita sus puntos al instante, actualizando el ranking del club.

---

## 🏗️ 2. MÓDULO 1: GESTOR DE PUNTOS Y ECONOMÍA DINÁMICA

### 2.1. Estructura de Datos Centralizada (`config_economia.json`)
El archivo [`config_economia.json`](file:///i:/PROYECTOS_CON_IA/CODIGOS/BLACKBOT/amigosjugones_sin_bot/config_economia.json) ubicado en la raíz de `amigosjugones_sin_bot` es la **única fuente de la verdad económica**.

```json
{
  "meta_temporada_puntos": 1000,
  "arcade": {
    "costo_ficha_entrada": 10,
    "renta_pasiva_diaria": {
      "1": 3,
      "2": 2,
      "3": 1
    },
    "bono_semanal_podio": {
      "1": 5,
      "2": 4,
      "3": 3
    }
  },
  "ranking_principal": {
    "bono_semanal_podio": {
      "1": 10,
      "2": 9,
      "3": 8
    }
  },
  "torneos_bga": {
    "asistencia": 1,
    "podio": {
      "1": 3,
      "2": 2,
      "3": 1
    }
  },
  "aportes_comunitarios": {
    "puntos_por_juego_creado": 1,
    "puntos_por_voto_encuesta": 1,
    "puntos_por_trivia_correcta": 10,
    "puntos_por_criptico_resuelto": 10
  }
}
```

### 2.2. Especificación de Endpoints Backend (`server.py`)

#### A) `GET /api/admin/config_economia`
* **Seguridad:** Requiere validación de token de administrador (`_is_admin(params)` o header `x-admin-token`).
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "ok": true,
    "config": { ...contenido de config_economia.json... }
  }
  ```

#### B) `POST /api/admin/config_economia`
* **Seguridad:** Requiere token de administrador.
* **Payload Esperado:**
  ```json
  {
    "admin_token": "AJ_SECRET_ADMIN_TOKEN_2026_XYZ",
    "config": {
      "meta_temporada_puntos": 1000,
      "arcade": { ... },
      "ranking_principal": { ... },
      "torneos_bga": {
        "asistencia": 1,
        "podio": { "1": 5, "2": 3, "3": 2 }
      },
      "aportes_comunitarios": { ... }
    }
  }
  ```
* **Lógica de Ejecución:**
  1. Validar que los valores sean enteros no negativos (`>= 0`).
  2. Escribir atómicamente el archivo `config_economia.json` formateado con sangría de 2 espacios.
  3. Devolver `{ "ok": true, "mensaje": "Configuración económica actualizada correctamente." }`.
  4. La próxima lectura de `gestor_db.obtener_puntos_torneo_bga()` o del frontend aplicará los nuevos valores sin reiniciar el servidor.

### 2.3. Especificación de UI en el Panel Admin (`tab-economia`)
En `admin_panel/Index.html`, reemplazar el formulario parcial existente por 4 tarjetas modulares:
1. **🏆 Torneos Board Game Arena (BGA):**
   - Inputs numéricos: `1.º Lugar (Podio)`, `2.º Lugar (Podio)`, `3.er Lugar (Podio)`, `Participación / Asistencia`.
2. **🕹️ Arcade & Minijuegos:**
   - Input: `Costo Entrada por Partida (Ficha)`.
   - Inputs: Renta pasiva diaria (`1º`, `2º`, `3º`).
   - Inputs: Bonos semanales podio Arcade (`1º`, `2º`, `3º`).
3. **👑 Ranking Principal:**
   - Input: `Meta de Temporada (PTS)`.
   - Inputs: Bonos semanales ranking general (`1º`, `2º`, `3º`).
4. **🎲 Aportes y Retos Comunitarios:**
   - Inputs: `Creación de Juego/Dinámica`, `Voto en Encuesta`, `Trivia Correcta`, `Críptico Resuelto`.
- **Botones de Control:**
  - `[ 📥 Cargar Valores Actuales ]`: Lee `/api/admin/config_economia` y rellena los inputs.
  - `[ 💾 Guardar Cambios en Caliente ]`: Envía el JSON y muestra toast de confirmación.

---

## 👥 3. MÓDULO 2: REGISTRO MAESTRO DE IDENTIDADES Y VINCULACIÓN BGA

### 3.1. El Mapeo de Identidad Cuádruple
En la comunidad se cruzan 4 universos de datos para una misma persona:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAPEO DE IDENTIDAD UNIFICADA                    │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. TELÉFONO       │ Identificador único físico (WhatsApp) (PK)         │
│ 2. NICK WEB       │ Apodo público con el que compite en la plataforma  │
│ 3. NOMBRE ADMIN   │ Etiqueta interna de la libreta/agenda de contactos │
│ 4. NICK BGA       │ Nombre de usuario en Board Game Arena              │
└───────────────────┴────────────────────────────────────────────────────┘
```

### 3.2. Ciclo de Vida y Liquidación Automática de Puntos

```
 PASO 1: Torneo en BGA
 ┌───────────────────────────┐
 │ "JuanitoBGA" juega torneo │ ──► Se guarda en torneo_participantes:
 │ y termina 1.º Lugar       │     (bga_username='JuanitoBGA', rank=1,
 └───────────────────────────┘      nick_aj=NULL, puntos_asignados=0)
                                    [PUNTOS RETENIDOS: NO REGISTRADO]

 PASO 2: Usuario se conecta en Web
 ┌───────────────────────────┐
 │ Teléfono: +56912345678    │ ──► Crea cuenta o inicia sesión en la web:
 │ Nick Web: JuanitoMaster   │     (jugadores: tiene_clave_privada=1)
 └───────────────────────────┘

 PASO 3: Admin identifica en WhatsApp y asigna BGA en el Panel
 ┌──────────────────────────────────────────────────────────────┐
 │ Admin abre Tabla Maestra de Identidades en el Panel:         │
 │ 1. Busca el teléfono +56912345678                            │
 │ 2. Sabe que en WhatsApp se llama "Juan Pérez Catan"          │
 │ 3. Descubre que en BGA es "JuanitoBGA"                       │
 │ 4. Escribe bga_username = "JuanitoBGA" y pulsa [💾 Guardar]  │
 └──────────────────────────────────────────────────────────────┘
                               │
                               ▼
 DISPARADOR AUTOMÁTICO (reconciliar_puntos_torneos_pendientes)
 ┌──────────────────────────────────────────────────────────────┐
 │ • Detecta torneo pendiente de "JuanitoBGA" con rank = 1      │
 │ • Lee config_economia.json: 1º Lugar = +3 PTS                │
 │ • Suma +3 PTS a JuanitoMaster en jugadores.puntos            │
 │ • Inserta en historial_transacciones:                        │
 │   'TORNEO_BGA_REGISTRO_WEB' (+3 PTS)                         │
 │ • Actualiza torneo_participantes: puntos_asignados = 3       │
 │ • Recompila y exporta ranking.json                           │
 │ • El Panel muestra: "✅ Se acreditaron +3 PTS a JuanitoMaster"│
 └──────────────────────────────────────────────────────────────┘
```

### 3.3. Especificación de Endpoints Backend

#### A) `GET /api/admin/miembros_identidades`
* **Propósito:** Alimenta la Tabla Maestra con todos los datos cruzados.
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "ok": true,
    "total": 45,
    "miembros": [
      {
        "telefono": "56981279766",
        "nick": "BLACK",
        "nick_web": "BLACK",
        "nombre_agenda_admin": "André Administrador",
        "nombre_perfil_ws": "André",
        "bga_username": "_BLACK",
        "puntos": 952,
        "registrado_web": true,
        "tiene_clave_privada": true,
        "torneos_jugados": 4,
        "torneos_pendientes": 0
      }
    ]
  }
  ```

#### B) `POST /api/admin/vincular_identidad`
* **Propósito:** Actualiza en un solo paso los campos de identidad del miembro y ejecuta la reconciliación automática de torneos.
* **Payload:**
  ```json
  {
    "admin_token": "AJ_SECRET_ADMIN_TOKEN_2026_XYZ",
    "telefono": "56912345678",
    "nuevo_nick": "JuanitoMaster",
    "nick_web": "JuanitoMaster",
    "nombre_agenda": "Juan Pérez Catan",
    "bga_username": "JuanitoBGA"
  }
  ```
* **Respuesta Exitosa (200 OK):**
  ```json
  {
    "ok": true,
    "jugador": { ...datos actualizados... },
    "puntos_retroactivos": [
      { "torneo": "Océanos de Papel", "rank": 1, "puntos": 3 }
    ],
    "total_puntos_sumados": 3,
    "mensaje": "Identidad actualizada. Se liquidaron 1 torneo(s) pendiente(s) otorgando +3 PTS."
  }
  ```

#### C) `POST /api/admin/reconciliar_torneos`
* **Propósito:** Botón de acción rápida para re-evaluar manualmente torneos pendientes de un jugador sin modificar datos.
* **Payload:** `{ "admin_token": "...", "identificador": "56912345678" }`
* **Respuesta:** `{ "ok": true, "puntos_acreditados": [...] }`

### 3.4. Especificación de UI en el Panel Admin (`tab-identidades`)
Se ubicará como una pestaña prioritaria en el menú lateral de navegación:
`👥 Identidades & BGA` (`#tab-identidades`).

1. **Barra de Herramientas Superior:**
   - 🔍 **Buscador Reactivo:** Campo de texto con filtro en vivo que busca por teléfono, nick web, nombre agenda o nick BGA.
   - 🏷️ **Filtro Rápido:** Píldoras de filtrado: `Todos`, `🟢 Registrados Web`, `⏳ Con Torneos Pendientes`, `⚠️ Sin Nick BGA`.
   - ➕ **Botón "Registrar Nuevo Miembro":** Abre modal para dar de alta un número con su nombre y BGA.
2. **Tabla Maestra Responsiva:**
   - `📱 Teléfono`: Con botón de copia rápida de WhatsApp.
   - `🌐 Nick en Web`: Con badge verde si tiene cuenta web activa, o gris `— Sin registrar —`.
   - `📝 Nombre Agenda (WhatsApp)`: Con lápiz de edición rápida.
   - `🎲 Nick BGA`: Con indicador si tiene partidas vinculadas.
   - `💎 Saldo PTS`: Puntos actuales en la temporada.
   - `🏆 Torneos BGA`: Badge `X jugados` o `⏳ Y pendientes`.
   - `⚡ Acciones`:
     - Botón `✏️ Editar Identidad` (abre modal con los 4 campos).
     - Botón `⚡ Reconciliar` (audita torneos y acredita puntos pendientes).
3. **Modal de Edición de Identidad (`modal-editar-identidad`):**
   - 4 campos de texto editables: Teléfono, Nick Web, Nombre Agenda y Nick BGA.
   - Botón `💾 Guardar y Reconciliar Puntos`. Al guardar, si se detectaron puntos de torneos pendientes, muestra una alerta verde con el desglose exacto de los puntos otorgados.

---

## 🔒 4. REGLAS DE SEGURIDAD, INVARIANTES Y CASOS BORDE

1. **Idempotencia Absoluta de Puntos:**
   - En `torneo_participantes`, la columna `puntos_asignados` controla si un torneo ya fue cobrado. Si `puntos_asignados > 0`, **jamás** se le vuelve a otorgar puntaje por ese torneo, sin importar cuántas veces se guarde o se reconcilie.
2. **Condición Inviolable de Registro Web:**
   - Si un participante tiene teléfono y nombre en la agenda, pero **nunca** ha ingresado a la web (no tiene `nick_web` ni clave privada), los puntos de torneos quedan en estado de **espera** (`puntos_asignados = 0`). Solo se acreditan cuando el usuario active su sesión web.
3. **Colisión de Nicks:**
   - Antes de asignar un `nick` o `nick_web`, el sistema valida que no pertenezca ya a otro número de teléfono distinto.
4. **Manejo de Transacciones Atómicas en SQLite:**
   - La suma de puntos en `jugadores`, la inserción en `historial_transacciones` y la actualización en `torneo_participantes` deben ejecutarse dentro del mismo bloque transaccional `with get_db() as conn:`. Si una operación falla, se hace rollback automático.
5. **Cero Hardcoding en el Scraper y Canvas de Lunara:**
   - `tournamentCanvas.js` debe leer la escala de puntos desde los datos devueltos por el backend (`matched_members` / `config`), mostrando los puntos reales configurados por el administrador.

---

## 📋 5. GUÍA PASO A PASO PARA AGENTES EJECUTORES

Los agentes asignados deben seguir esta secuencia ordenada de tareas:

- [ ] **Paso 1: Backend (`gestor_db.py` y `server.py`):**
  - Verificar que `config_economia.json` contenga todas las claves requeridas.
  - Crear los endpoints `GET /api/admin/config_economia` y `POST /api/admin/config_economia`.
  - Crear el endpoint `GET /api/admin/miembros_identidades` optimizado con conteo de torneos pendientes.
  - Asegurar que `vincular_jugador_bga` ejecute `reconciliar_puntos_torneos_pendientes` y devuelva el total de puntos sumados.
- [ ] **Paso 2: Frontend (`admin_panel/Index.html`):**
  - Agregar la pestaña `tab-identidades` en la barra de navegación lateral.
  - Construir la Tabla Maestra de Identidades con búsqueda en vivo y badges de estado.
  - Implementar el Modal de Edición de Identidad con los 4 campos y llamada a `/api/admin/vincular_identidad`.
  - Actualizar `tab-economia` con los inputs de todas las categorías (Torneos BGA, Arcade, Ranking, Dinámicas).
  - Conectar las funciones JavaScript `loadEconomiaConfig()` y `saveEconomiaConfig()`.
- [ ] **Paso 3: Verificación y Compilación:**
  - Ejecutar `python -m py_compile server.py database/gestor_db.py`.
  - Probar en navegador la carga y guardado de la economía.
  - Probar el flujo: Asignar un usuario de BGA con torneos previos a un miembro y verificar la acreditación instantánea en `ranking.json`.
- [ ] **Paso 4: Bitácora de Sesión:**
  - Registrar los cambios en `amigosjugones_sin_bot/sesiones/sesionesblackbot-DDMMYYYY.txt`.
