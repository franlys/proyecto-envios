#!/usr/bin/env python3
"""
Script para generar iconos de Android desde la imagen de Gemini
"""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[ERROR] Pillow no esta instalado")
    print("Por favor ejecuta: pip install Pillow")
    exit(1)

# Rutas
script_dir = Path(__file__).parent
source_icon = script_dir.parent / "admin_web" / "src" / "assets" / "app-icon-gemini.png"
output_dir = script_dir.parent / "mobile_app_capacitor" / "android" / "app" / "src" / "main" / "res"

print("\n========================================")
print("  Generar Iconos desde Gemini")
print("========================================\n")

if not source_icon.exists():
    print(f"[ERROR] Icono de Gemini no encontrado: {source_icon}")
    exit(1)

print(f"[INFO] Icono fuente: {source_icon}")
print(f"[INFO] Directorio destino: {output_dir}\n")

# Cargar icono de Gemini
print("[LOAD] Cargando icono de Gemini...")
gemini_icon = Image.open(source_icon)
print(f"[OK] Icono cargado: {gemini_icon.size[0]}x{gemini_icon.size[1]} pixels\n")

# Tamanos de iconos para Android
icon_sizes = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192
}

# Tamanos de foreground para adaptive icons
foreground_sizes = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432
}

print("Generando iconos profesionales de Gemini...\n")

# Generar ic_launcher y ic_launcher_round
for i, (density, size) in enumerate(icon_sizes.items(), 1):
    print(f"[{i}/{len(icon_sizes)}] mipmap-{density} ({size}x{size})")

    mipmap_dir = output_dir / f"mipmap-{density}"
    mipmap_dir.mkdir(parents=True, exist_ok=True)

    # Redimensionar el icono de Gemini
    resized = gemini_icon.resize((size, size), Image.Resampling.LANCZOS)

    # Guardar ic_launcher
    ic_launcher_path = mipmap_dir / "ic_launcher.png"
    resized.save(ic_launcher_path, "PNG")

    # Guardar ic_launcher_round (mismo icono)
    ic_launcher_round_path = mipmap_dir / "ic_launcher_round.png"
    resized.save(ic_launcher_round_path, "PNG")

    print(f"  [OK] {ic_launcher_path.name}")
    print(f"  [OK] {ic_launcher_round_path.name}")

print("\nGenerando foreground icons...\n")

# Generar ic_launcher_foreground para adaptive icons
for i, (density, size) in enumerate(foreground_sizes.items(), 1):
    print(f"[{i}/{len(foreground_sizes)}] foreground {density} ({size}x{size})")

    mipmap_dir = output_dir / f"mipmap-{density}"

    # Redimensionar para foreground
    resized_fg = gemini_icon.resize((size, size), Image.Resampling.LANCZOS)

    # Guardar ic_launcher_foreground
    ic_foreground_path = mipmap_dir / "ic_launcher_foreground.png"
    resized_fg.save(ic_foreground_path, "PNG")

    print(f"  [OK] {ic_foreground_path.name}")

print("\n========================================")
print("  [OK] Iconos de Gemini Generados!")
print("========================================\n")
print(f"Los iconos se generaron en:")
print(f"{output_dir}/mipmap-*\n")
