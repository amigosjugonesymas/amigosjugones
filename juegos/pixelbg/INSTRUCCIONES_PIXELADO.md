# 🎨 Guía de Instrucciones: Automatización de Pixelado Masivo de Imágenes (Conversión a PNG)

Este documento detalla el funcionamiento, la estructura y los comandos para ejecutar el script de pixelado automatizado de imágenes utilizando la **escala exacta del motor Pixel It (Block Size / Scale 1, 2, 3, 4)** con conversión automática a **formato PNG**.

---

## 📌 1. Ubicación de los Archivos del Proyecto

Todos los archivos del script residen dentro del repositorio del proyecto:
`H:\PROYECTOS_CON_IA\CODIGOS\BLACKBOT\pixelit-master\`

- 📜 **Script Principal Python:** [pixelate_batch.py](file:///H:/PROYECTOS_CON_IA/CODIGOS/BLACKBOT/pixelit-master/pixelate_batch.py)
- ⚡ **Ejecutable Batch de Windows:** [pixelar.bat](file:///H:/PROYECTOS_CON_IA/CODIGOS/BLACKBOT/pixelit-master/pixelar.bat)
- 📘 **Instrucciones:** [INSTRUCCIONES_PIXELADO.md](file:///H:/PROYECTOS_CON_IA/CODIGOS/BLACKBOT/pixelit-master/INSTRUCCIONES_PIXELADO.md)

---

## 📂 2. Estructura de Carpetas de Trabajo

* **Carpeta de Origen (Imágenes a Procesar):** `C:\Users\ANDRE\Downloads\PIXEL\PARA CONVERTIR\`
* **Carpeta Raíz / Destino Final:** `C:\Users\ANDRE\Downloads\PIXEL\`

Dentro de `PARA CONVERTIR` se organizan las imágenes por categorías:

| Carpeta de Origen | Prefijo Automático de Salida | Ejemplo de Carpeta Creada |
| :--- | :--- | :--- |
| `JUEGOS DE MESA` | `JDM - ` | `C:\Users\ANDRE\Downloads\PIXEL\JDM - castillos de borgoña\` |
| `SERIES` | `S - ` | `C:\Users\ANDRE\Downloads\PIXEL\S - el exorcista\` |
| `PELICULAS` | `P - ` | `C:\Users\ANDRE\Downloads\PIXEL\P - avatar\` |

> ⚠️ **Nota:** Si alguna carpeta de origen está vacía, el sistema la detecta e ignora automáticamente.

---

## ⚙️ 3. Reglas de Conversión Forzada a PNG

Independientemente del formato de la imagen de origen (`.jpg`, `.webp`, `.bmp`, `.tiff`, etc.), **todas las imágenes generadas se guardan obligatoriamente en formato `.png`**:

1. **Creación de Carpeta Individual:** Con el prefijo correspondiente + nombre de la imagen.
2. **Imagen Original en PNG:** Se convierte y guarda la imagen original como `[NombreOriginal].png`.
3. **4 Niveles de Pixelado en PNG:**
   - `[NombreOriginal] 1.png` ➔ **Nivel 1 (Scale 1 = 0.01 / 1%):** Bloques gigantes ultra pixelados.
   - `[NombreOriginal] 2.png` ➔ **Nivel 2 (Scale 2 = 0.02 / 2%):** Bloques grandes.
   - `[NombreOriginal] 3.png` ➔ **Nivel 3 (Scale 3 = 0.03 / 3%):** Bloques medianos.
   - `[NombreOriginal] 4.png` ➔ **Nivel 4 (Scale 4 = 0.04 / 4%):** Bloques definidos.

---

## 💻 4. Comandos para Ejecutar desde la Terminal

Puedes lanzar el proceso de pixelado masivo ejecutando cualquiera de las siguientes opciones:

### Opción A: Comando Directo en Python (Desde cualquier ubicación)
```bash
python H:\PROYECTOS_CON_IA\CODIGOS\BLACKBOT\pixelit-master\pixelate_batch.py
```

### Opción B: Ejecutable `.bat` en Windows
Ejecutando el archivo `pixelar.bat` guardado en la carpeta del repositorio:
```cmd
H:\PROYECTOS_CON_IA\CODIGOS\BLACKBOT\pixelit-master\pixelar.bat
```
*(O haciendo doble clic directo sobre `pixelar.bat`).*
