/**
 * Utilidad de compresión de imágenes optimizada para app móvil
 * Sin dependencias externas - usa Canvas API nativo
 *
 * Optimizado para:
 * - Reducir ancho de banda en conexiones móviles
 * - Mantener costos de Firebase Storage bajos
 * - Proporcionar imágenes legibles como evidencia
 */

import React from 'react';

/**
 * Configuración de compresión por defecto
 */
export const DEFAULT_COMPRESSION_CONFIG = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.7,        // 70% calidad
  targetSizeKB: 200,   // Meta: menos de 200KB
  format: 'image/jpeg' // JPEG para mejor compresión
};

/**
 * Convierte un File/Blob a una imagen cargada en memoria
 * @param {File|Blob} file - Archivo de imagen
 * @returns {Promise<HTMLImageElement>}
 */
const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Calcula las dimensiones finales manteniendo aspect ratio
 * @param {number} width - Ancho original
 * @param {number} height - Alto original
 * @param {number} maxWidth - Ancho máximo
 * @param {number} maxHeight - Alto máximo
 * @returns {{width: number, height: number}}
 */
const calculateDimensions = (width, height, maxWidth, maxHeight) => {
  let newWidth = width;
  let newHeight = height;

  // Mantener aspect ratio
  if (width > height) {
    if (width > maxWidth) {
      newWidth = maxWidth;
      newHeight = (height * maxWidth) / width;
    }
  } else {
    if (height > maxHeight) {
      newHeight = maxHeight;
      newWidth = (width * maxHeight) / height;
    }
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  };
};

/**
 * Comprime una imagen usando Canvas API
 * @param {HTMLImageElement} img - Imagen cargada
 * @param {Object} config - Configuración de compresión
 * @returns {Promise<Blob>}
 */
const compressImage = async (img, config) => {
  const { maxWidth, maxHeight, quality, format } = config;

  // Calcular nuevas dimensiones
  const dimensions = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxWidth,
    maxHeight
  );

  // Crear canvas
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext('2d');

  // Configurar calidad de renderizado
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Dibujar imagen redimensionada
  ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);

  // Convertir a Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Error al comprimir imagen'));
        }
      },
      format,
      quality
    );
  });
};

/**
 * Comprime una imagen iterativamente hasta alcanzar el tamaño objetivo
 * @param {HTMLImageElement} img - Imagen cargada
 * @param {Object} config - Configuración de compresión
 * @returns {Promise<Blob>}
 */
const compressToTargetSize = async (img, config) => {
  const { targetSizeKB } = config;
  let quality = config.quality;
  let blob = await compressImage(img, { ...config, quality });
  let attempts = 0;
  const maxAttempts = 5;

  // Si ya está bajo el objetivo, retornar
  if (blob.size / 1024 <= targetSizeKB) {
    return blob;
  }

  // Reducir calidad iterativamente hasta alcanzar objetivo o límite de intentos
  while (blob.size / 1024 > targetSizeKB && attempts < maxAttempts && quality > 0.3) {
    attempts++;
    quality -= 0.1; // Reducir 10% cada vez
    blob = await compressImage(img, { ...config, quality: Math.max(0.3, quality) });
  }

  return blob;
};

/**
 * Función principal de compresión de imagen
 * @param {File|Blob} file - Archivo de imagen a comprimir
 * @param {Object} options - Opciones de compresión (opcional)
 * @param {Function} onProgress - Callback de progreso (opcional)
 * @returns {Promise<{blob: Blob, originalSize: number, compressedSize: number, compressionRatio: number}>}
 */
export const compressImageFile = async (file, options = {}, onProgress = null) => {
  try {
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo no es una imagen válida');
    }

    const originalSize = file.size;

    // Notificar inicio
    if (onProgress) onProgress({ stage: 'loading', progress: 0 });

    // Cargar imagen
    const img = await loadImage(file);

    if (onProgress) onProgress({ stage: 'compressing', progress: 30 });

    // Configuración de compresión
    const config = {
      ...DEFAULT_COMPRESSION_CONFIG,
      ...options
    };

    // Comprimir imagen
    const compressedBlob = await compressToTargetSize(img, config);

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    // Liberar memoria
    URL.revokeObjectURL(img.src);

    const compressedSize = compressedBlob.size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    return {
      blob: compressedBlob,
      originalSize,
      compressedSize,
      compressionRatio: parseFloat(compressionRatio),
      metadata: {
        originalSizeKB: (originalSize / 1024).toFixed(2),
        compressedSizeKB: (compressedSize / 1024).toFixed(2),
        format: config.format,
        dimensions: {
          width: img.naturalWidth,
          height: img.naturalHeight
        }
      }
    };
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    throw error;
  }
};

/**
 * Valida si una imagen necesita compresión
 * @param {File|Blob} file - Archivo de imagen
 * @param {number} thresholdKB - Umbral en KB (default: 200KB)
 * @returns {boolean}
 */
export const needsCompression = (file, thresholdKB = 200) => {
  return (file.size / 1024) > thresholdKB;
};

/**
 * Obtiene información de una imagen sin procesarla
 * @param {File|Blob} file - Archivo de imagen
 * @returns {Promise<{width: number, height: number, size: number, type: string}>}
 */
export const getImageInfo = async (file) => {
  const img = await loadImage(file);
  const info = {
    width: img.naturalWidth,
    height: img.naturalHeight,
    size: file.size,
    sizeKB: (file.size / 1024).toFixed(2),
    type: file.type
  };
  URL.revokeObjectURL(img.src);
  return info;
};

/**
 * Comprime múltiples imágenes en lote
 * @param {File[]} files - Array de archivos de imagen
 * @param {Object} options - Opciones de compresión
 * @param {Function} onProgress - Callback de progreso por imagen
 * @returns {Promise<Array>}
 */
export const compressMultipleImages = async (files, options = {}, onProgress = null) => {
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const result = await compressImageFile(file, options, (progress) => {
        if (onProgress) {
          onProgress({
            fileIndex: i,
            totalFiles: files.length,
            fileName: file.name,
            ...progress
          });
        }
      });

      results.push({
        success: true,
        fileName: file.name,
        ...result
      });
    } catch (error) {
      results.push({
        success: false,
        fileName: file.name,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Convierte un Blob comprimido a File con nombre
 * @param {Blob} blob - Blob comprimido
 * @param {string} fileName - Nombre del archivo
 * @returns {File}
 */
export const blobToFile = (blob, fileName) => {
  return new File([blob], fileName, { type: blob.type });
};

/**
 * Hook personalizado para React (opcional)
 * Uso: const { compress, isCompressing, progress } = useImageCompression();
 */
export const useImageCompression = () => {
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState(null);

  const compress = async (file, options = {}) => {
    setIsCompressing(true);
    setError(null);
    setProgress(0);

    try {
      const result = await compressImageFile(file, options, ({ progress }) => {
        setProgress(progress);
      });

      setIsCompressing(false);
      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message);
      setIsCompressing(false);
      throw err;
    }
  };

  return { compress, isCompressing, progress, error };
};
