#!/usr/bin/env python3
"""
Script para generar iconos profesionales de Android
Crea un icono simple con el simbolo del paquete en fondo de color
"""

import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("[ERROR] Pillow no esta instalado")
    print("Por favor ejecuta: pip install Pillow")
    exit(1)

# Rutas
script_dir = Path(__file__).parent
source_logo = script_dir.parent / "admin_web" / "src" / "assets" / "logo.png"
output_dir = script_dir.parent / "mobile_app_capacitor" / "android" / "app" / "src" / "main" / "res"

print("\n========================================")
print("  Generar Icono Profesional de Android")
print("========================================\n")

if not source_logo.exists():
    print(f"[ERROR] Logo no encontrado: {source_logo}")
    exit(1)

print(f"[INFO] Logo fuente: {source_logo}")
print(f"[INFO] Directorio destino: {output_dir}\n")

# Cargar logo original
print("[LOAD] Cargando logo original...")
logo_original = Image.open(source_logo)
print(f"[OK] Logo cargado: {logo_original.size[0]}x{logo_original.size[1]} pixels\n")

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

# Color de fondo: Blanco para que el logo se vea limpio y profesional
BACKGROUND_COLOR = (255, 255, 255)  # Blanco (#FFFFFF)

print("Generando iconos profesionales...\n")
print("Diseno: Fondo blanco con logo ProLogix centrado\n")

# Generar ic_launcher y ic_launcher_round
for i, (density, size) in enumerate(icon_sizes.items(), 1):
    print(f"[{i}/{len(icon_sizes)}] mipmap-{density} ({size}x{size})")

    mipmap_dir = output_dir / f"mipmap-{density}"
    mipmap_dir.mkdir(parents=True, exist_ok=True)

    # Crear canvas con fondo de color
    canvas = Image.new('RGB', (size, size), BACKGROUND_COLOR)

    # Calcular tamano del logo con padding (75% del canvas)
    logo_size = int(size * 0.75)
    logo_resized = logo_original.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Centrar el logo en el canvas
    offset = ((size - logo_size) // 2, (size - logo_size) // 2)

    # Convertir canvas a RGBA para poder pegar con transparencia
    canvas_rgba = canvas.convert('RGBA')
    if logo_resized.mode == 'RGBA':
        canvas_rgba.paste(logo_resized, offset, logo_resized)
    else:
        canvas_rgba.paste(logo_resized, offset)
    canvas = canvas_rgba.convert('RGB')

    # Guardar ic_launcher
    ic_launcher_path = mipmap_dir / "ic_launcher.png"
    canvas.save(ic_launcher_path, "PNG")

    # Para ic_launcher_round, crear version con esquinas redondeadas
    canvas_round = canvas.copy().convert('RGBA')

    # Crear mascara circular
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)

    # Aplicar mascara
    output_round = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output_round.paste(canvas_round, (0, 0))
    output_round.putalpha(mask)

    # Guardar ic_launcher_round
    ic_launcher_round_path = mipmap_dir / "ic_launcher_round.png"
    output_round.save(ic_launcher_round_path, "PNG")

    print(f"  [OK] {ic_launcher_path.name}")
    print(f"  [OK] {ic_launcher_round_path.name}")

print("\nGenerando foreground icons...\n")

# Generar ic_launcher_foreground para adaptive icons
for i, (density, size) in enumerate(foreground_sizes.items(), 1):
    print(f"[{i}/{len(foreground_sizes)}] foreground {density} ({size}x{size})")

    mipmap_dir = output_dir / f"mipmap-{density}"

    # Crear canvas con fondo de color para foreground
    canvas_fg = Image.new('RGB', (size, size), BACKGROUND_COLOR)

    # Logo al 75% para foreground tambien
    logo_fg_size = int(size * 0.75)
    logo_fg_resized = logo_original.resize((logo_fg_size, logo_fg_size), Image.Resampling.LANCZOS)

    # Centrar el logo
    offset_fg = ((size - logo_fg_size) // 2, (size - logo_fg_size) // 2)

    canvas_fg_rgba = canvas_fg.convert('RGBA')
    if logo_fg_resized.mode == 'RGBA':
        canvas_fg_rgba.paste(logo_fg_resized, offset_fg, logo_fg_resized)
    else:
        canvas_fg_rgba.paste(logo_fg_resized, offset_fg)
    canvas_fg = canvas_fg_rgba.convert('RGB')

    # Guardar ic_launcher_foreground
    ic_foreground_path = mipmap_dir / "ic_launcher_foreground.png"
    canvas_fg.save(ic_foreground_path, "PNG")

    print(f"  [OK] {ic_foreground_path.name}")

print("\n========================================")
print("  [OK] Iconos Profesionales Generados")
print("========================================\n")
print(f"Diseno: Fondo azul-morado #{BACKGROUND_COLOR[0]:02x}{BACKGROUND_COLOR[1]:02x}{BACKGROUND_COLOR[2]:02x}")
print(f"Los iconos se generaron en:")
print(f"{output_dir}/mipmap-*\n")
