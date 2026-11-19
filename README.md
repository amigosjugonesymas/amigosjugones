# 🎲 Amigos Jugones — Plataforma Web Comunitaria & Gamificada

> **Ecosistema Jamstack Serverless ($0 Costo) para la comunidad de juegos de mesa Amigos Jugones.**  
> Combina la web pública en GitHub Pages, base de datos en Google Sheets/Drive, lógica serverless en Google Apps Script, extensión de navegador Lunara y un Panel de Administración privado con login 2FA de Google.

---

## ⚡ 1. Arquitectura del Sistema en 30 Segundos

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   WEB PÚBLICA (GitHub Pages)   │         │    EXTENSIÓN LUNARA (Chrome)   │
│   • HTML5 + Vanilla JS + CSS   │         │    • Asistente de IA (Gemini)  │
│   • Canvas 2D/3D (Juegos)      │         │    • Sincronización WhatsApp   │
│   • Tarjetas AMOLED (Client)   │         │    • Comandos por voz y chat   │
└───────────────┬────────────────┘         └───────────────┬────────────────┘
                │                                          │
                ▼                                          ▼
┌───────────────────────────────────────────────────────────────────────────┐
│               ORQUESTADOR SERVERLESS (Google Apps Script v3.4)            │
│   • Web App URL: https://script.google.com/macros/s/AKfycbzQ.../exec      │
│   • Endpoints: Trivias, Crípticos, Récords WhatsApp, Generador SVG/PNG    │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS (Google Drive / Sheets)                  │
│   📁 Carpeta Central: PAGINA WEB (ID: 1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU)  │
│   ├── 📱 Miembros activos (Whitelist oficial de teléfonos)                │
│   ├── 📊 AJ_ECONOMIA_Y_RANKINGS (Puntos, Sesiones, Trivias, Crípticos)    │
│   ├── 📊 AJ_COMUNIDAD_Y_RECURSOS (Avisos, Juntas, Encuestas, Salón Honor) │
│   └── 📂 CAPTURAS_LUNARA (Infografías AMOLED generadas para WhatsApp)     │
└─────────────────────────────────────▲─────────────────────────────────────┘
                                      │
┌─────────────────────────────────────┴─────────────────────────────────────┐
│             PANEL DE ADMINISTRACIÓN PRIVADO (admin_panel/)                │
│   • Despliegue en Apps Script ("Solo Yo" con Google 2FA)                  │
│   • 13 Módulos: Miembros, Analytics, Economía, Capturas y CRUD de Juegos  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 2. Lo que se ha Implementado (Hitos del Proyecto)

1. **Retos Diarios con Racha y Anti-Trampas (Zero-Knowledge):**
   - **🧠 Críptico del Día (`criptico.html`):** Acertijo temático con pista y cálculo de intentos. La palabra secreta se queda en el servidor y nunca viaja al navegador.
   - **🧩 Trivia Geek del Día (`trivia.html`):** Pregunta diaria con 4 opciones. La respuesta correcta se valida en el servidor sin exponerse en DevTools.
   - **🔥 Sistema de Racha Diaria:** Acumulación de días consecutivos con bono semanal (+10 PTS a los 7 días).
2. **Tarjetas de Logro AMOLED (`js/logro-card.js`):**
   - Generación instantánea en el navegador vía Canvas (800x800) en formato Dark AMOLED (`#080814`).
   - Sin spoilers (no muestra la solución) + integración con **WebShare API** para compartir directo en WhatsApp.
3. **Estudio de Capturas On-Demand & Infografías de WhatsApp:**
   - Orquestador v3.4 genera gráficos vectoriales y los guarda automáticamente en Google Drive.
   - **📱 Mensajes Sin Leer modularizados en 4 imágenes individuales:** *👑 Legendario (+4k)*, *⚡ Épico (1k-4k)*, *🛡️ Heroico (500-1k)* y *🌱 Superviviente (<500)*.
4. **Panel de Administración Privado v2.0 (`admin_panel/`):**
   - 13 módulos de gestión en tiempo real.
   - Nuevo **Módulo 13 (CRUD)**: Formularios visuales para programar Crípticos, Trivias, Popups y modificar récords de WhatsApp sin editar celdas de Sheets a mano.
   - **Módulo de Capturas On-Demand**: Generación de infografías con 1 solo clic.
   - **Analytics & Rolling Archive**: Purga atómica de registros antiguos para mantener la base de datos veloz.
5. **Seguridad y Control de Identidad:**
   - Cruce de identidades (Teléfono de WhatsApp vs Nombre de Agenda vs Nick Gamer).
   - Control de máximo 2 navegadores por cuenta comunitaria y reseteo de claves privadas.

---

## 🗂️ 3. Estructura de Archivos Clave

```text
amigosjugones_sin_bot/
├── index.html              → Portada oficial del club y accesos rápidos
├── criptico.html           → Juego diario: Críptico con racha y tarjeta AMOLED
├── trivia.html             → Juego diario: Trivia Geek con racha y tarjeta AMOLED
├── juntas.html             → Mesas presenciales y búsqueda de compañeros
├── torneos.html            → Convocatorias y partidas en Board Game Arena (BGA)
├── salon_fama.html         → Campeones históricos y snapshots mensuales
├── salon-de-honor.html     → Méritos y logros comunitarios externos
├── popup-diario.js         → Motor del popup modal destacado de portada
│
├── js/
│   ├── main.js             → Lógica principal, routing y footer global
│   ├── auth.js             → Autenticación con teléfono y control de PIN/sesión
│   ├── components.js       → Sidebar, Topbar y Buzón Privado de Notificaciones
│   ├── logro-card.js       → Motor Canvas para tarjetas de logro sin spoilers
│   ├── skin-engine.js      → Motor de las 14 skins estacionales dinámicas
│   └── analytics.js        → Rastreo privado de tráfico web
│
├── admin_panel/            → Panel de Administración Privado para Google Apps Script
│   ├── Config.gs           → Constantes, IDs de Drive, Sheets y tokens
│   ├── Codigo.gs           → Backend API (13 módulos y despachador handleApiRequest)
│   └── Index.html          → Interfaz visual oscura AMOLED para el Administrador
│
├── ORQUESTADOR_APPS_SCRIPT.js → Servidor serverless activo para la web pública
└── documentos/             → 20 especificaciones técnicas y guías de arquitectura
```

---

## ⚙️ 4. Configuración y URLs Activas

| Servicio / Componente | URL / ID |
|---|---|
| **Web Pública (GitHub Pages)** | `https://amigosjugonesymas.github.io` |
| **Orquestador Web App (v3.4)** | `https://script.google.com/macros/s/AKfycbzQM6reTFqdJpsCDBb9uDzkppSPEtELYxIe4iUkSXIMGCWenccTxJOJgEWGn1AuV7H9ww/exec` |
| **Carpeta Raíz Drive (PAGINA WEB)** | `1sVdmSlz5-y8sR8J52Bp-lnUuyy3aKkOU` |
| **Subcarpeta Capturas (Drive)** | `1BXxdAejFP0rszNgfY6ahW3R2bxgyX_IK` |
| **Libro AJ_ECONOMIA_Y_RANKINGS** | `1CwtfUkKm42XQBj0VZ0O3nTWJZCEXzy5M3-kSjoL-4mM` |
| **Hoja Maestra Miembros Activos** | `1AdOhY1cYYRyPRXW4o-it14q9j3EUiFkI9qbdn1rWgEU` |
| **Token Secreto Admin** | `AJ_SECRET_ADMIN_TOKEN_2026_XYZ` |

---

## 🛠️ 5. Endpoints Principales del Orquestador

Para invocar desde el navegador, scripts o Lunara:

```bash
# Obtener Críptico de hoy (Zero-Knowledge: sin palabra secreta)
GET ?action=criptico_get_today

# Enviar intento de Críptico (+10 PTS si acierta)
POST/GET ?action=criptico_submit&session_token=...&palabra=CATAN&tiempo=15

# Obtener Trivia de hoy (sin respuesta correcta)
GET ?action=trivia_get_today

# Enviar respuesta de Trivia
POST/GET ?action=trivia_submit&session_token=...&respuesta=B&tiempo=4

# Generar Captura On-Demand a Google Drive
GET ?action=lunara_captura&tipo=mensajes_sin_leer&admin_token=AJ_SECRET_ADMIN_TOKEN_2026_XYZ
# Tipos disponibles: diario_24h, criptico_hoy, semanal, mensual, carrera_espacial, pelea_ninja, encuestas, mensajes_sin_leer
```

---

## 🔄 6. Comandos para Despliegues Rápidos

### Actualizar la Web Pública en GitHub:
```bash
git add .
git commit -m "update: mejoras en la plataforma"
git push origin main
```

### Probar la Web Localmente con Servidor Python:
```bash
python -m http.server 8877
# Abrir en: http://localhost:8877
```

---

## 📖 7. Próximos Pasos Recomendados
Consulta la guía completa en:  
👉 [`documentos/PLAN_SIGUIENTES_PASOS_IMPLEMENTACION.md`](documentos/PLAN_SIGUIENTES_PASOS_IMPLEMENTACION.md)

