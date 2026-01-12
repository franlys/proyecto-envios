// Script para generar iconos PWA de diferentes tamaños
// Por ahora crea placeholders SVG, luego puedes reemplazar con sharp/jimp

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const sizes = [72, 96, 128, 144, 192, 512];

const generateSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#4F46E5"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">PL</text>
</svg>`;
};

console.log('🎨 Generando iconos PWA...\n');

sizes.forEach(size => {
  const svg = generateSVGIcon(size);
  const filename = `icon-${size}.png`;
  const svgFilename = `icon-${size}.svg`;

  // Guardar SVG temporalmente
  const svgPath = path.join(publicDir, svgFilename);
  fs.writeFileSync(svgPath, svg);

  console.log(`✅ Generado: ${svgFilename} (${size}x${size})`);
});

console.log(`
\n✅ Iconos SVG generados exitosamente!

📝 NOTA IMPORTANTE:
Los iconos generados son placeholders SVG con las letras "PL" (ProLogix).

Para producción, deberías:
1. Crear un logo real en 512x512px
2. Usar una herramienta como:
   - https://realfavicongenerator.net/
   - https://www.pwabuilder.com/imageGenerator
   - O instalar 'sharp' para generar PNG desde el logo

Ubicación: ${publicDir}
`);
