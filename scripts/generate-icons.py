#!/usr/bin/env python3
"""
Script para generar iconos de Android desde el logo
Requiere: pip install Pillow
"""

import os
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("[ERROR] Error: Pillow no está instalado")
    print("Por favor ejecuta: pip install Pillow")
    exit(1)

# Rutas
script_dir = Path(__file__).parent
source_logo = script_dir.parent / "admin_web" / "src" / "assets" / "logo.png"
output_dir = script_dir.parent / "mobile_app_capacitor" / "android" / "app" / "src" / "main" / "res"

print("\n========================================")
print("  Generar Iconos de Android")
print("========================================\n")

if not source_logo.exists():
    print(f"[ERROR] Error: Logo no encontrado: {source_logo}")
    exit(1)

print(f"[INFO] Logo fuente: {source_logo}")
print(f"[INFO] Directorio destino: {output_dir}\n")

# Cargar logo
print("[LOAD] Cargando logo...")
logo = Image.open(source_logo)
print(f"[OK] Logo cargado: {logo.size[0]}x{logo.size[1]} pixels\n")

# Tamaños de íconos para Android
icon_sizes = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192
}

# Tamaños de foreground para adaptive icons
foreground_sizes = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432
}

print("Generando iconos...\n")

# Generar ic_launcher y ic_launcher_round
for i, (density, size) in enumerate(icon_sizes.items(), 1):
    print(f"[{i}/{len(icon_sizes)}] mipmap-{density} ({size}x{size})")

    mipmap_dir = output_dir / f"mipmap-{density}"
    mipmap_dir.mkdir(parents=True, exist_ok=True)

    # Crear canvas cuadrado con fondo blanco
    canvas = Image.new('RGBA', (size, size), (255, 255, 255, 255))

    # Calcular tamaño del logo con padding (85% del canvas)
    logo_size = int(size * 0.85)
    logo_resized = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Centrar el logo en el canvas
    offset = ((size - logo_size) // 2, (size - logo_size) // 2)
    canvas.paste(logo_resized, offset, logo_resized if logo_resized.mode == 'RGBA' else None)

    # Guardar ic_launcher
    ic_launcher_path = mipmap_dir / "ic_launcher.png"
    canvas.save(ic_launcher_path, "PNG")

    # Guardar ic_launcher_round (mismo que ic_launcher para este caso)
    ic_launcher_round_path = mipmap_dir / "ic_launcher_round.png"
    canvas.save(ic_launcher_round_path, "PNG")

    print(f"  [OK] {ic_launcher_path.name}")
    print(f"  [OK] {ic_launcher_round_path.name}")

print("\nGenerando foreground icons...\n")

# Generar ic_launcher_foreground para adaptive icons
for i, (density, size) in enumerate(foreground_sizes.items(), 1):
    print(f"[{i}/{len(foreground_sizes)}] foreground {density} ({size}x{size})")

    mipmap_dir = output_dir / f"mipmap-{density}"

    # Crear canvas cuadrado con fondo blanco para foreground
    canvas_fg = Image.new('RGBA', (size, size), (255, 255, 255, 255))

    # Logo al 85% para foreground también
    logo_fg_size = int(size * 0.85)
    logo_fg_resized = logo.resize((logo_fg_size, logo_fg_size), Image.Resampling.LANCZOS)

    # Centrar el logo
    offset_fg = ((size - logo_fg_size) // 2, (size - logo_fg_size) // 2)
    canvas_fg.paste(logo_fg_resized, offset_fg, logo_fg_resized if logo_fg_resized.mode == 'RGBA' else None)

    # Guardar ic_launcher_foreground
    ic_foreground_path = mipmap_dir / "ic_launcher_foreground.png"
    canvas_fg.save(ic_foreground_path, "PNG")

    print(f"  [OK] {ic_foreground_path.name}")

print("\n========================================")
print("  [OK] Iconos Generados Exitosamente")
print("========================================\n")
print(f"Los iconos se generaron en:")
print(f"{output_dir}/mipmap-*\n")
