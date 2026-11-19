import os
import sys
import shutil
from PIL import Image

# Configurar salida de terminal para UTF-8 en Windows (compatible con linters de tipo)
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    getattr(sys.stdout, "reconfigure")(encoding='utf-8')

# Configuración de Rutas Base
BASE_DIR = r"C:\Users\ANDRE\Downloads\PIXEL"
SOURCE_DIR = os.path.join(BASE_DIR, "PARA CONVERTIR")

# Mapeo de carpetas de origen a sus prefijos de salida
PREFIX_MAP = {
    "JUEGOS DE MESA": "JDM - ",
    "JUEGO DE MESA": "JDM - ",
    "SERIES": "S - ",
    "SERIE": "S - ",
    "PELICULAS": "P - ",
    "PELICULA": "P - "
}

# Niveles de pixelado con incrementos de 0.5% (0.005) para juegos de adivinanza
SCALE_LEVELS = {
    1: 0.005, # Nivel 1: scale 0.5% (Ultra difícil)
    2: 0.010, # Nivel 2: scale 1.0% (Difícil)
    3: 0.015, # Nivel 3: scale 1.5% (Medio)
    4: 0.020  # Nivel 4: scale 2.0% (Fácil)
}

# Extensiones de imagen soportadas de origen
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'}

def get_prefix_for_folder(folder_name):
    upper_name = folder_name.strip().upper()
    if upper_name in PREFIX_MAP:
        return PREFIX_MAP[upper_name]
    
    if "JUEGO" in upper_name or "MESA" in upper_name:
        return "JDM - "
    elif "SERIE" in upper_name:
        return "S - "
    elif "PELI" in upper_name:
        return "P - "
    
    return f"{upper_name} - "

def pixelate_image(img, base_scale_factor):
    """
    Simula el comportamiento del motor PixelIt:
    - Si la dimensión > 900px, reduce la escala a la mitad (factor *= 0.5).
    - Usa BILINEAR para achicar y NEAREST para escalar a tamaño original.
    """
    w, h = img.size
    factor = base_scale_factor
    if w > 900 or h > 900:
        factor *= 0.5

    small_w = max(1, int(w * factor))
    small_h = max(1, int(h * factor))
    
    img_small = img.resize((small_w, small_h), Image.Resampling.BILINEAR)
    img_pixelated = img_small.resize((w, h), Image.Resampling.NEAREST)
    return img_pixelated

def prepare_image_for_png(img):
    """ Asegura que la imagen tenga un modo compatible con PNG (RGB o RGBA) """
    if img.mode in ('CMYK', 'P'):
        return img.convert('RGBA' if 'transparency' in img.info else 'RGB')
    return img

def process_pixelation():
    if not os.path.exists(SOURCE_DIR):
        print(f"[ERROR] La carpeta de origen '{SOURCE_DIR}' no existe.")
        return

    print(">>> Iniciando proceso de pixelado (Incrementos de 0.5% - Modo Adivinanza)...")
    print(f"Carpeta de origen: {SOURCE_DIR}")
    print(f"Carpeta de destino: {BASE_DIR}\n")

    subfolders = [f for f in os.listdir(SOURCE_DIR) if os.path.isdir(os.path.join(SOURCE_DIR, f))]
    
    total_images_processed = 0
    total_folders_created = 0

    for folder_name in subfolders:
        folder_path = os.path.join(SOURCE_DIR, folder_name)
        prefix = get_prefix_for_folder(folder_name)
        
        files = [f for f in os.listdir(folder_path) if os.path.splitext(f)[1].lower() in SUPPORTED_EXTENSIONS]
        
        if not files:
            print(f"[INFO] La carpeta '{folder_name}' está vacía. Omitiendo...")
            continue

        print(f"[PROCESANDO] Subcarpeta '{folder_name}' (Prefijo: '{prefix}'). {len(files)} imágenes encontradas.")

        for file_name in files:
            src_file_path = os.path.join(folder_path, file_name)
            name_without_ext, _ = os.path.splitext(file_name)
            
            dest_folder_name = f"{prefix}{name_without_ext}"
            dest_folder_path = os.path.join(BASE_DIR, dest_folder_name)
            
            if os.path.exists(dest_folder_path):
                shutil.rmtree(dest_folder_path)
                
            os.makedirs(dest_folder_path, exist_ok=True)
            total_folders_created += 1

            try:
                with Image.open(src_file_path) as img:
                    img = prepare_image_for_png(img)
                    
                    # 1. Guardar la imagen ORIGINAL en formato PNG
                    dest_original_path = os.path.join(dest_folder_path, f"{name_without_ext}.png")
                    img.save(dest_original_path, format="PNG")

                    # 2. Generar versiones PIXELADAS niveles 1 a 4 en formato PNG (0.5%, 1.0%, 1.5%, 2.0%)
                    for level, factor in SCALE_LEVELS.items():
                        pixel_img = pixelate_image(img, factor)
                        
                        pixel_file_name = f"{name_without_ext} {level}.png"
                        dest_pixel_path = os.path.join(dest_folder_path, pixel_file_name)
                        
                        pixel_img.save(dest_pixel_path, format="PNG")

                print(f"  -> Creada carpeta '{dest_folder_name}': Original + Niveles 1, 2, 3, 4 (Escala 0.5% incremental)")
                total_images_processed += 1
            except Exception as e:
                print(f"  [ERROR] Al procesar '{file_name}': {e}")

    print("\n==========================================")
    print("¡Proceso completado exitosamente!")
    print(f"Resumen: {total_images_processed} imágenes procesadas, {total_folders_created} carpetas creadas en '{BASE_DIR}'.")
    print("==========================================")

if __name__ == "__main__":
    process_pixelation()
