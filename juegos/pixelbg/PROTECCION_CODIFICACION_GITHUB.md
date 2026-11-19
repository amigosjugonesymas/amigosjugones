# 🛡️ GUÍA DE PROTECCIÓN, MIGRACIÓN Y REGISTRO EN GITHUB / GOOGLE SHEETS
## Pixel Jugón — Pixel Backgrounds Generator: Protocolo de Publicación, Integración y Seguridad

> **IMPORTANTE**: Este documento especifica las instrucciones y configuraciones requeridas para publicar o subir este repositorio a GitHub y conectarlo automáticamente a una hoja de cálculo en **Google Sheets** para registrar a los creadores de fondos pixelados.

---

## 🎯 OBJETIVOS DE MIGRACIÓN Y SEGURIDAD

1. **Registro de Creadores**: Almacenar automáticamente en Google Sheets quién generó la imagen pixelada (Nombre / Apodo e Instagram), el nombre del archivo/desafío, el tamaño original, el formato (1:1 o 9:16) y la marca temporal.
2. **Protección de Código Fuente**: Prevenir copias no autorizadas u ofuscar scripts antes de desplegar en GitHub Pages o servidores públicos.

---

## 📋 PASO 1: INTEGRACIÓN CON GOOGLE SHEETS (REGISTRO AUTOMÁTICO DE CREADORES)

Para llevar una bitácora automática de cada fondo pixelado generado por la comunidad (quién lo creó, su Instagram, el nombre del juego e imagen y el formato), se utiliza un Webhook ligero mediante **Google Apps Script**:

### 1.1 Crear la Hoja de Cálculo en Google Drive
1. Ir a Google Drive y crear una nueva hoja de cálculo llamada **`Registro_Creadores_PixelJugon`**.
2. En la **Fila 1 (Encabezados)**, configurar las siguientes 7 columnas:

| Columna | Nombre del Encabezado | Descripción |
| :--- | :--- | :--- |
| **Columna A** | `Fecha y Hora` | Marca temporal automática |
| **Columna B** | `Nombre Creador` | Nombre / Apodo ingresado |
| **Columna C** | `Instagram` | Instagram del creador (@usuario) |
| **Columna D** | `Nombre de la Imagen` | Nombre del archivo/desafío generado |
| **Columna E** | `Tamaño / Resolución` | Peso o dimensiones de la imagen original |
| **Columna F** | `Formato` | `1:1` Cuadrado o `9:16` Vertical |
| **Columna G** | `Niveles Pixelado` | Niveles generados (0.5%, 1.0%, 1.5%, 2.0%) |

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
      data.imageName || '',
      data.originalSize || '',
      data.aspectRatio || '',
      data.scaleLevels || ''
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
   - **Descripción**: *Webhook Registro PixelJugon*.
   - **Ejecutar como**: *Tu cuenta (Yo)*.
   - **Quién tiene acceso**: **`Cualquier persona` (Anyone)**.
4. Hacer clic en **Implementar**, autorizar los permisos de la cuenta de Google y **copiar la URL generada** (ejemplo: `https://script.google.com/macros/s/.../exec`).

---

### 1.4 Configurar la URL en `app.js`
En `pixelbg-web/app.js`, asignar la URL copiada a la constante:

```javascript
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID_AQUI/exec';
```

---

### 1.5 PROTOCOLO DE SEGURIDAD PARA NOMBRES RESERVADOS EN PRODUCCIÓN

Para evitar la suplantación de identidad en GitHub Pages (uso público online), la validación de contraseña de administrador y el registro de intentos de uso no autorizado se delegan a **Google Apps Script**:

#### Código Google Apps Script con Validación y Auditoría de Intentos

Reemplazar la función `doPost` en Apps Script por la siguiente versión con soporte de seguridad:

```javascript
var ADMIN_SECRET_PASSWORD = "TU_CONTRASEÑA_SECRETA_AQUI";

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Verificación de nombre reservado
    if (data.action === 'verify_protected_name') {
      var isPasswordValid = (data.password === ADMIN_SECRET_PASSWORD);
      var statusText = isPasswordValid ? '✅ USO AUTORIZADO' : '❌ INTENTO NO AUTORIZADO';
      
      sheet.appendRow([
        new Date(),
        data.creatorName || '',
        data.creatorIg || '',
        'VERIFICACIÓN SEGURIDAD: ' + (data.matchedName || ''),
        statusText,
        'PixelJugon',
        isPasswordValid ? 'Clave correcta' : 'Clave incorrecta / intento no autorizado'
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: isPasswordValid,
        message: isPasswordValid ? 'Acceso concedido' : 'Contraseña incorrecta'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Registro estándar de imagen pixelada generada por usuario
    sheet.appendRow([
      new Date(),
      data.creatorName || '',
      data.creatorIg || '',
      data.imageName || '',
      data.originalSize || '',
      data.aspectRatio || '',
      data.scaleLevels || ''
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

- [x] ¿Se crearon los campos `Nombre / Apodo` e `Instagram` en la interfaz?
- [ ] ¿Se creó la hoja `Registro_Creadores_PixelJugon` en Google Sheets con sus 7 columnas?
- [ ] ¿Se implementó el script en Google Apps Script y se otorgó acceso a *Cualquier persona*?
- [ ] ¿Se probó el envío asíncrono desde el navegador confirmando que llega una nueva fila en Google Sheets?
- [ ] ¿Se ejecutó el comando de ofuscación produciendo `app.min.js`?
- [ ] Listo para despliegue público en GitHub Pages / Vercel.

---
*Documento preparado por BLACK 🥷 para Amigos Jugones.*
