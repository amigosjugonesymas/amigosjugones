# 🛡️ GUÍA DE PROTECCIÓN, MIGRACIÓN Y REGISTRO EN GITHUB / GOOGLE SHEETS
## SiluetaBG — Silueta Jugona: Protocolo de Publicación, Integración y Seguridad

> **IMPORTANTE**: Este documento especifica las instrucciones y configuraciones requeridas para publicar o subir este repositorio a GitHub y conectarlo automáticamente a una hoja de cálculo en **Google Sheets** para registrar a los creadores de desafíos visuales.

---

## 🎯 OBJETIVOS DE MIGRACIÓN Y SEGURIDAD

1. **Registro de Creadores**: Almacenar automáticamente en Google Sheets quién creó el desafío visual (Nombre / Apodo e Instagram), el título del reto, la respuesta correcta, la categoría, el formato y las opciones.
2. **Protección de Código Fuente**: Prevenir copias no autorizadas y validar los nombres reservados de la administración (`@amigosjugonesymas`, `@black`, etc.).

---

## 📋 PASO 1: INTEGRACIÓN CON GOOGLE SHEETS (REGISTRO AUTOMÁTICO DE CREADORES)

Para llevar una bitácora automática de cada desafío de silueta/imagen generado por la comunidad, se utiliza un Webhook ligero mediante **Google Apps Script**:

### 1.1 Crear la Hoja de Cálculo en Google Drive
1. Ir a Google Drive y crear una nueva hoja de cálculo llamada **`Registro_Creadores_SiluetaJugona`**.
2. En la **Fila 1 (Encabezados)**, configurar las siguientes 8 columnas:

| Columna | Nombre del Encabezado | Descripción |
| :--- | :--- | :--- |
| **Columna A** | `Fecha y Hora` | Marca temporal automática |
| **Columna B** | `Nombre Creador` | Nombre / Apodo ingresado |
| **Columna C** | `Instagram` | Instagram del creador (@usuario) |
| **Columna D** | `Título Desafío` | Título ingresado (ej. ¿Cuál es este juego?) |
| **Columna E** | `Respuesta Correcta` | Respuesta correcta ingresada |
| **Columna F** | `Categoría` | Categoría o Tema de la silueta |
| **Columna G** | `Formato` | `1:1` Cuadrado o `9:16` Vertical |
| **Columna H** | `Opciones (A, B, C, D)` | Opciones múltiples si fueron provistas |

---

### 1.2 Código Google Apps Script

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      new Date(),
      data.creatorName || '',
      data.creatorIg || '',
      data.challengeTitle || '',
      data.answerText || '',
      data.category || '',
      data.aspectRatio || '',
      data.options || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 🔒 PASO 2: NOMBRES RESERVADOS

La aplicación cuenta con protección en cliente y servidor para evitar el uso indebido de las cuentas oficiales de la administración:
- `@amigosjugonesymas`
- `@amigosjugones`
- `@black`
- `@jessy`

Cualquier intento de usar estos nombres requerirá la verificación de la contraseña maestra configurada en `PROTECTED_SECRET_PASS`.
