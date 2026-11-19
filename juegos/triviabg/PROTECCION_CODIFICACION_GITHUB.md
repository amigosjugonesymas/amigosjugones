# 🛡️ GUÍA DE PROTECCIÓN, MIGRACIÓN Y REGISTRO EN GITHUB / GOOGLE SHEETS
## TriviaBG — Trivia Jugona: Protocolo de Publicación, Integración y Seguridad

> **IMPORTANTE**: Este documento especifica las instrucciones y configuraciones requeridas para publicar o subir este repositorio a GitHub y conectarlo automáticamente a una hoja de cálculo en **Google Sheets** para registrar a los creadores de trivias.

---

## 🎯 OBJETIVOS DE MIGRACIÓN Y SEGURIDAD

1. **Registro de Creadores**: Almacenar automáticamente en Google Sheets quién creó la trivia (Nombre / Apodo e Instagram), la pregunta, la respuesta correcta, opciones, categoría, formato y evidencia de prueba.
2. **Protección de Código Fuente**: Prevenir copias no autorizadas u ofuscar scripts antes de desplegar en GitHub Pages o servidores públicos.

---

## 📋 PASO 1: INTEGRACIÓN CON GOOGLE SHEETS (REGISTRO AUTOMÁTICO DE CREADORES)

Para llevar una bitácora automática de cada desafío de trivia generado por la comunidad (quién lo creó, su Instagram, la pregunta, la respuesta y la evidencia), se utiliza un Webhook ligero mediante **Google Apps Script**:

### 1.1 Crear la Hoja de Cálculo en Google Drive
1. Ir a Google Drive y crear una nueva hoja de cálculo llamada **`Registro_Creadores_TriviaJugona`**.
2. En la **Fila 1 (Encabezados)**, configurar las siguientes 9 columnas:

| Columna | Nombre del Encabezado | Descripción |
| :--- | :--- | :--- |
| **Columna A** | `Fecha y Hora` | Marca temporal automática |
| **Columna B** | `Nombre Creador` | Nombre / Apodo ingresado |
| **Columna C** | `Instagram` | Instagram del creador (@usuario) |
| **Columna D** | `Pregunta / Desafío` | Texto de la pregunta |
| **Columna E** | `Respuesta Correcta` | Respuesta correcta ingresada |
| **Columna F** | `Categoría` | Categoría o Tema de la trivia |
| **Columna G** | `Formato` | `1:1` Cuadrado o `9:16` Vertical |
| **Columna H** | `Opciones (A, B, C, D)` | Opciones múltiples si fueron provistas |
| **Columna I** | `Evidencia` | Texto o resumen de evidencia |

---

### 1.2 Crear el Webhook con Google Apps Script
1. En la hoja de cálculo recién creada, ir al menú **Extensiones > Apps Script**.
2. Borrar cualquier código por defecto y pegar la siguiente función oficial:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      new Date(),
      data.creatorName || '',
      data.creatorIg || '',
      data.questionText || '',
      data.answerText || '',
      data.category || '',
      data.aspectRatio || '',
      data.options || '',
      data.evidence || ''
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

### 1.3 Publicar la Aplicación Web (Web App)
1. En la esquina superior derecha del editor de Apps Script, hacer clic en **Implementar > Nueva implementación**.
2. Seleccionar tipo: **Aplicación web**.
3. Configurar exactamente así:
   - **Descripción**: *Webhook Registro TriviaBG*.
   - **Ejecutar como**: *Tu cuenta (Yo)*.
   - **Quién tiene acceso**: **`Cualquier persona` (Anyone)**.
4. Hacer clic en **Implementar**, autorizar los permisos de la cuenta de Google y **copiar la URL generada** (ejemplo: `https://script.google.com/macros/s/.../exec`).

---

### 1.4 Configurar la URL en `app.js`
En `triviabg-web/app.js`, asignar la URL copiada a la constante:

```javascript
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec';
```

---

### 1.5 PROTOCOLO DE SEGURIDAD PARA NOMBRES RESERVADOS EN PRODUCCIÓN

Para evitar la suplantación de identidad en GitHub Pages (uso público online), la validación de contraseña de administrador y el registro de intentos de uso no autorizado se delegan al servidor de **Google Apps Script**:

#### 1.5.1 Código Google Apps Script con Validación y Registro de Intento

Reemplazar el código de Apps Script por el siguiente manejador que soporta validación de claves y auditoría de intentos:

```javascript
// Contraseña secreta de administración en el servidor
var ADMIN_SECRET_PASSWORD = "TU_CONTRASEÑA_SECRETA_AQUI";

// Nombres y perfiles protegidos del grupo
var PROTECTED_NAMES_LIST = ['amigosjugonesymas', 'amigosjugones', 'black', 'jessy'];

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Si la petición es una verificación de nombre reservado
    if (data.action === 'verify_protected_name') {
      var isPasswordValid = (data.password === ADMIN_SECRET_PASSWORD);
      var statusText = isPasswordValid ? '✅ USO AUTORIZADO' : '❌ INTENTO NO AUTORIZADO';
      
      // Registrar intento en la hoja de cálculo
      sheet.appendRow([
        new Date(),
        data.creatorName || '',
        data.creatorIg || '',
        'VERIFICACIÓN SEGURIDAD: ' + (data.matchedName || ''),
        statusText,
        data.gameName || 'TriviaBG',
        '-',
        '-',
        isPasswordValid ? 'Clave correcta' : 'Clave incorrecta / intento no autorizado'
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: isPasswordValid,
        message: isPasswordValid ? 'Acceso concedido' : 'Contraseña incorrecta'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Registro estándar de juego generado por usuario
    sheet.appendRow([
      new Date(),
      data.creatorName || '',
      data.creatorIg || '',
      data.questionText || '',
      data.answerText || '',
      data.category || '',
      data.aspectRatio || '',
      data.options || '',
      data.evidence || ''
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

#### 1.5.2 Migración del Cliente a Producción

En `app.js`, para producción online:
1. Reemplazar la comparación local `PROTECTED_SECRET_PASS` por la consulta remota `fetch(GOOGLE_SHEETS_WEBAPP_URL)` enviando `{ action: 'verify_protected_name', password, creatorName, creatorIg, matchedName, gameName: 'TriviaBG' }`.
2. Ofuscar `app.js` a `app.min.js` siguiendo el **Paso 2**.

---

## 📋 PASO 2: OFUSCACIÓN Y COMPACTACIÓN ANTES DE GITHUB PUSH

Antes de realizar el commit y push final al repositorio público de GitHub:

1. **Pasar `app.js` por un ofuscador**:
   ```bash
   npx javascript-obfuscator app.js --output app.min.js --compact true --string-array true --string-array-encoding 'base64'
   ```
2. **Actualizar `index.html`**:
   ```html
   <!-- Reemplazar app.js por app.min.js en producción -->
   <script src="app.min.js"></script>
   ```

---

## 🚀 CHECKLIST DE MIGRACIÓN

- [ ] ¿Se crearon los campos `Nombre / Apodo` e `Instagram` en la interfaz cuando se requiera el registro?
- [ ] ¿Se creó la hoja `Registro_Creadores_TriviaJugona` en Google Sheets con sus 9 columnas?
- [ ] ¿Se implementó el script en Google Apps Script y se otorgó acceso a *Cualquier persona*?
- [ ] ¿Se probó el envío asíncrono desde el navegador confirmando que llega una nueva fila en Google Sheets?
- [ ] ¿Se agregó `<link rel="icon" type="image/png" href="assets/logo.png">` en `index.html`?
- [ ] Listo para despliegue público en GitHub Pages / Vercel.

---
*Documento preparado por BLACK 🥷 para Amigos Jugones.*
