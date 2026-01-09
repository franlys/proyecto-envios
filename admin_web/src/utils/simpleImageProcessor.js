/**
 * Procesador simple de imágenes para móvil
 *
 * Convierte cualquier imagen a JPEG compatible con:
 * - WhatsApp
 * - Navegadores web
 * - Vistas en móvil
 *
 * Sin compresión compleja, solo conversión de formato.
 */

/**
 * Convierte una imagen a formato JPEG universal
 * @param {File} file - Archivo de imagen original
 * @param {number} quality - Calidad JPEG (0-1), default 0.85
 * @returns {Promise<{blob: Blob, fileName: string}>}
 */
export const convertToJPEG = async (file, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    // Validar que es una imagen
    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }

    // Si ya es JPEG y menor a 5MB, retornar tal cual
    if (file.type === 'image/jpeg' && file.size < 5 * 1024 * 1024) {
      resolve({
        blob: file,
        fileName: file.name
      });
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };

      img.onload = () => {
        try {
          // Crear canvas con tamaño original
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Si es muy grande (>3000px), reducir
          const maxDimension = 3000;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF'; // Fondo blanco para JPEGs
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a JPEG
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Generar nombre de archivo JPEG
                const baseName = file.name.replace(/\.[^/.]+$/, '');
                const fileName = `${baseName}.jpg`;

                resolve({
                  blob,
                  fileName
                });
              } else {
                reject(new Error('Error al convertir imagen'));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Procesa un archivo de imagen para subirlo a Firebase
 * Garantiza formato JPEG compatible con todos los dispositivos
 *
 * @param {File} file - Archivo original
 * @returns {Promise<Blob>} - Blob JPEG listo para subir
 */
export const processImageForUpload = async (file) => {
  try {
    console.log(`📸 Procesando imagen: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    const result = await convertToJPEG(file, 0.85);

    console.log(`✅ Imagen procesada: ${result.fileName} (${(result.blob.size / 1024).toFixed(2)} KB)`);

    return result.blob;
  } catch (error) {
    console.error(`❌ Error procesando imagen ${file.name}:`, error);

    // Si falla la conversión, intentar subir el archivo original
    console.warn('⚠️ Usando archivo original sin procesar');
    return file;
  }
};

/**
 * Procesa múltiples imágenes en lote
 * @param {File[]} files - Array de archivos
 * @returns {Promise<Blob[]>}
 */
export const processMultipleImages = async (files) => {
  const results = [];

  for (const file of files) {
    try {
      const blob = await processImageForUpload(file);
      results.push(blob);
    } catch (error) {
      console.error(`Error procesando ${file.name}:`, error);
      // Incluir el archivo original si falla
      results.push(file);
    }
  }

  return results;
};

export default {
  convertToJPEG,
  processImageForUpload,
  processMultipleImages
};
