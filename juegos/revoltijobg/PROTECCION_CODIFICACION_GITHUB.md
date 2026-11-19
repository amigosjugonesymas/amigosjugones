# 🛡️ GUÍA DE PROTECCIÓN Y OFUSCACIÓN DE CODIFICACIÓN EN GITHUB
## RevoltijoBG — Protocolo de Anti-Trampas y Seguridad de Código Fuente

> **IMPORTANTE**: Este documento especifica las instrucciones y modificaciones de código que deben ejecutarse **antes de publicar o subir este repositorio a GitHub** u otros servidores públicos, evitando que usuarios avanzados puedan inspeccionar `app.js`, copiar los alfabetos de cifrado o des-ofuscar los acertijos de la comunidad.

---

## 🎯 OBJETIVO DE SEGURIDAD

Evitar que cualquier usuario pueda:
1. Abrir Inspeccionar Elemento (`F12` / DevTools) en el navegador o ver los archivos en GitHub.
2. Leer las tablas `DYNAMIC_EMOJI_CATALOG`, `BASE_ALPHABET` o `ACCENT_MAP`.
3. Revertir la codificación de las pistas o crear un script automatizado para hacer trampa.

---

## 📋 PASOS A SEGUIR ANTES DEL DEPLOY A GITHUB

### 1. Cifrado / Encapsulamiento del Catálogo en Memoria (Base64 + XOR)
En lugar de mantener `DYNAMIC_EMOJI_CATALOG` como un array de objetos legibles en texto plano dentro de `app.js`:

- Convertir la estructura JSON del catálogo a un String codificado en Base64 con una clave XOR dinámica.
- **Ejemplo del Cambio a Realizar en `app.js`**:
  ```javascript
  // EN LUGAR DE:
  // const DYNAMIC_EMOJI_CATALOG = [ { emoji: '🥑', name: 'Palta', options: [...] } ];

  // USAR:
  const _0x5a1f = "eyJlbW9qaSI6IvCfpYEiLCJuYW1lIjoiUGFsdGEiLCJvcHRpb25zIjpb...==";
  const DYNAMIC_EMOJI_CATALOG = JSON.parse(atob(_0x5a1f));
  ```

---

### 2. Ofuscación del Archivo Principal (`app.js` -> `app.min.js`)
Antes de realizar el `git push`:
1. Pasar `app.js` por una herramienta de ofuscación de JavaScript (ejemplo: `javascript-obfuscator` o `uglify-js`).
2. Configurar la ofuscación con:
   - **Compactación**: `compact: true`
   - **Ofuscación de Nombres de Variables y Funciones**: `identifierNamesGenerator: 'hexadecimal'`
   - **Transformación de Cadenas de Texto**: `stringArray: true`, `stringArrayEncoding: ['base64', 'rc4']`
   - **Protección de Consola**: `disableConsoleOutput: true` (opcional)

- **Comando de Generación**:
  ```bash
  npx javascript-obfuscator app.js --output app.min.js --string-array true --string-array-encoding 'base64' --compact true
  ```
3. En `index.html`, cambiar la importación:
  ```html
  <!-- Reemplazar app.js por app.min.js en la versión pública -->
  <script src="app.min.js"></script>
  ```

---

### 3. Encapsulamiento en IIFE y Supresión de Variables Globales
Asegurar que ninguna función de cifrado quede expuesta en la ventana global `window` o accesible mediante la consola del navegador:

```javascript
(function() {
  'use strict';
  // Todo el código de RevoltijoBG encapsulado aquí de forma privada
})();
```

---

### 4. Configuración del Archivo `.gitignore`
Asegurarse de incluir los archivos de desarrollo fuente en `.gitignore` si se desea mantener un repositorio público limpio sin exponer la versión sin ofuscar:

```gitignore
# Archivos de desarrollo sin ofuscar (Opcional si el repo es público)
# app.js
# scratch/
```

---

## 📊 INTEGRACIÓN CON GOOGLE SHEETS (REGISTRO AUTOMÁTICO DE CREADORES)

Para llevar una bitácora automática de cada acertijo generado por la comunidad (quién lo creó, su Instagram, la frase secreta y las pistas generadas), se utiliza una conexión ligera sin servidores intermediarios mediante **Google Apps Script**:

### Paso 1: Crear la Hoja de Cálculo en Google Drive
1. Crear una hoja en blanco en Google Sheets llamada `Registro_Creadores_RevoltijoBG`.
2. En la Fila 1 (Encabezados), colocar las siguientes columnas:
   - **Columna A**: `Fecha y Hora`
   - **Columna B**: `Nombre Creador`
   - **Columna C**: `Instagram`
   - **Columna D**: `Frase Secreta`
   - **Columna E**: `Categoría`
   - **Columna F**: `Formato`
   - **Columna G**: `Pista 1`
   - **Columna H**: `Pista 2`
   - **Columna I**: `Pista 3`
   - **Columna J**: `Pista 4`
   - **Columna K**: `Solución`

### Paso 2: Crear el Webhook con Google Apps Script
1. Ir al menú **Extensiones > Apps Script**.
2. Borrar cualquier código existente y pegar el siguiente Script oficial:

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    sheet.appendRow([
      new Date(),
      data.creatorName || '',
      data.creatorIg || '',
      data.secretText || '',
      data.category || '',
      data.aspectRatio || '',
      data.p1 || '',
      data.p2 || '',
      data.p3 || '',
      data.p4 || '',
      data.solution || ''
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Paso 3: Publicar como Aplicación Web (Web App)
1. Hacer clic en **Implementar > Nueva implementación**.
2. Elegir tipo: **Aplicación web**.
3. Configuración:
   - **Ejecutar como**: *Tu cuenta (Yo)*.
   - **Quién tiene acceso**: *Cualquier persona (Anyone)*.
4. Autorizar los permisos requeridos y copiar la URL generada (`https://script.google.com/macros/s/.../exec`).

### Paso 4: Enlazar la URL en `app.js`
En `app.js`, asignar la URL obtenida a la constante:

```javascript
const GOOGLE_SHEETS_WEBAPP_URL = 'https://script.google.com/macros/s/TU_SCRIPT_ID/exec';
```

---

### Paso 5: Protocolo de Seguridad para Nombres Reservados en Producción

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
        'RevoltijoBG',
        '-', '-', '-', '-',
        isPasswordValid ? 'Clave correcta' : 'Clave incorrecta / intento no autorizado'
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ 
        success: isPasswordValid,
        message: isPasswordValid ? 'Acceso concedido' : 'Contraseña incorrecta'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Registro estándar de desafío de acróstico generado por usuario
    sheet.appendRow([
      new Date(),
      data.creatorName || '',
      data.creatorIg || '',
      data.secretText || '',
      data.category || '',
      data.aspectRatio || '',
      data.p1 || '',
      data.p2 || '',
      data.p3 || '',
      data.p4 || '',
      data.solution || ''
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

## 🚀 CHECKLIST FINAL ANTES DE SUBIR A GITHUB

- [ ] ¿Se obligó la entrada de `Nombre` e `Instagram` en el formulario?
- [ ] ¿Se configuró la URL de Google Apps Script en `GOOGLE_SHEETS_WEBAPP_URL`?
- [ ] ¿Se ejecutó el script de ofuscación para generar `app.min.js`?
- [ ] ¿Se actualizó `index.html` para cargar `app.min.js`?
- [ ] ¿Se verificó que `window.DYNAMIC_EMOJI_CATALOG` retorne `undefined` en la consola?
- [ ] ¿Se probó la generación de canvas en local para confirmar que no rompió la codificación?
- [ ] Listo para subir a GitHub.

---
*Documento preparado por BLACK 🥷 para Amigos Jugones.*
