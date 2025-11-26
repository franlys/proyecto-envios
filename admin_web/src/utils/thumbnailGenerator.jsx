/**
 * Sistema de Generación de Thumbnails para Imágenes
 *
 * Genera miniaturas pequeñas (200px) para listas y vistas previas,
 * reduciendo drásticamente el tiempo de carga del dashboard.
 *
 * Estrategia:
 * - Thumbnail (200px): Para listas y grids
 * - Preview (1024px): Para vista detallada
 * - Original: Nunca se sube (siempre comprimido)
 */

import React from 'react';
import { compressImageFile } from './imageCompression';

/**
 * Configuraciones de tamaño por tipo de imagen
 */
export const IMAGE_SIZES = {
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.6,
    targetSizeKB: 30, // Thumbnails súper pequeños
    format: 'image/jpeg'
  },
  preview: {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.7,
    targetSizeKB: 200,
    format: 'image/jpeg'
  },
  highQuality: {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.8,
    targetSizeKB: 300,
    format: 'image/jpeg'
  }
};

/**
 * Genera thumbnail y preview de una imagen
 *
 * @param {File} file - Archivo de imagen original
 * @param {Object} options - Opciones de generación
 * @returns {Promise<{thumbnail: Blob, preview: Blob, metadata: Object}>}
 */
export const generateImageVariants = async (file, options = {}) => {
  const {
    generateThumbnail = true,
    generatePreview = true,
    onProgress = null
  } = options;

  const results = {};

  try {
    // Generar thumbnail (200px - para listas)
    if (generateThumbnail) {
      if (onProgress) onProgress({ stage: 'thumbnail', progress: 33 });

      const thumbnailResult = await compressImageFile(
        file,
        IMAGE_SIZES.thumbnail,
        (prog) => {
          if (onProgress) {
            onProgress({
              stage: 'thumbnail',
              progress: 33 + (prog.progress * 0.33)
            });
          }
        }
      );

      results.thumbnail = {
        blob: thumbnailResult.blob,
        size: thumbnailResult.compressedSize,
        sizeKB: thumbnailResult.metadata.compressedSizeKB
      };
    }

    // Generar preview (1024px - para vista detallada)
    if (generatePreview) {
      if (onProgress) onProgress({ stage: 'preview', progress: 66 });

      const previewResult = await compressImageFile(
        file,
        IMAGE_SIZES.preview,
        (prog) => {
          if (onProgress) {
            onProgress({
              stage: 'preview',
              progress: 66 + (prog.progress * 0.33)
            });
          }
        }
      );

      results.preview = {
        blob: previewResult.blob,
        size: previewResult.compressedSize,
        sizeKB: previewResult.metadata.compressedSizeKB
      };
    }

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    // Metadatos combinados
    const originalSizeKB = (file.size / 1024).toFixed(2);
    const totalCompressedKB = (
      (results.thumbnail?.size || 0) +
      (results.preview?.size || 0)
    ) / 1024;

    results.metadata = {
      originalSizeKB,
      totalCompressedKB: totalCompressedKB.toFixed(2),
      thumbnailSizeKB: results.thumbnail?.sizeKB || 0,
      previewSizeKB: results.preview?.sizeKB || 0,
      compressionRatio: ((1 - totalCompressedKB / originalSizeKB) * 100).toFixed(1)
    };

    return results;
  } catch (error) {
    console.error('Error generando variantes de imagen:', error);
    throw error;
  }
};

/**
 * Genera solo thumbnail (para casos donde no se necesita preview)
 */
export const generateThumbnailOnly = async (file, onProgress = null) => {
  try {
    const result = await compressImageFile(
      file,
      IMAGE_SIZES.thumbnail,
      onProgress
    );

    return {
      blob: result.blob,
      size: result.compressedSize,
      sizeKB: result.metadata.compressedSizeKB,
      originalSizeKB: result.metadata.originalSizeKB
    };
  } catch (error) {
    console.error('Error generando thumbnail:', error);
    throw error;
  }
};

/**
 * Procesa múltiples imágenes generando thumbnails y previews
 */
export const processMultipleImages = async (files, options = {}) => {
  const {
    generateThumbnail = true,
    generatePreview = true,
    onProgress = null
  } = options;

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const variants = await generateImageVariants(file, {
        generateThumbnail,
        generatePreview,
        onProgress: (progress) => {
          if (onProgress) {
            onProgress({
              fileIndex: i,
              totalFiles: files.length,
              fileName: file.name,
              ...progress
            });
          }
        }
      });

      results.push({
        success: true,
        fileName: file.name,
        ...variants
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
 * Convierte Blob a File con nombre específico
 */
export const variantBlobToFile = (blob, originalName, variant = 'thumbnail') => {
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const newName = `${baseName}_${variant}.${extension}`;

  return new File([blob], newName, { type: blob.type });
};

/**
 * Estrategia de nombres para Storage
 */
export const getStoragePathForVariant = (basePath, variant) => {
  const parts = basePath.split('/');
  const fileName = parts[parts.length - 1];
  const directory = parts.slice(0, -1).join('/');

  const extension = fileName.split('.').pop();
  const baseName = fileName.replace(/\.[^/.]+$/, '');

  return `${directory}/${baseName}_${variant}.${extension}`;
};

/**
 * Upload de imagen con thumbnails a Firebase Storage
 *
 * Sube ambas versiones (thumbnail y preview) con nombres diferenciados
 */
export const uploadImageWithThumbnails = async (
  file,
  storagePath,
  uploadFunction, // Función de upload (ref, uploadBytes, getDownloadURL)
  options = {}
) => {
  const { onProgress = null } = options;

  try {
    // Generar variantes
    if (onProgress) onProgress({ stage: 'generating', progress: 0 });

    const variants = await generateImageVariants(file, {
      onProgress: (prog) => {
        if (onProgress) {
          onProgress({
            stage: 'generating',
            progress: prog.progress * 0.5 // 50% para generación
          });
        }
      }
    });

    const urls = {};

    // Upload thumbnail
    if (variants.thumbnail) {
      if (onProgress) onProgress({ stage: 'uploading-thumbnail', progress: 50 });

      const thumbnailFile = variantBlobToFile(
        variants.thumbnail.blob,
        file.name,
        'thumb'
      );
      const thumbnailPath = getStoragePathForVariant(storagePath, 'thumb');

      urls.thumbnail = await uploadFunction(thumbnailFile, thumbnailPath);
    }

    // Upload preview
    if (variants.preview) {
      if (onProgress) onProgress({ stage: 'uploading-preview', progress: 75 });

      const previewFile = variantBlobToFile(
        variants.preview.blob,
        file.name,
        'preview'
      );
      const previewPath = getStoragePathForVariant(storagePath, 'preview');

      urls.preview = await uploadFunction(previewFile, previewPath);
    }

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    return {
      success: true,
      urls,
      metadata: variants.metadata
    };
  } catch (error) {
    console.error('Error en upload con thumbnails:', error);
    throw error;
  }
};

/**
 * Componente de React para lazy loading de imágenes con thumbnail
 */
export const useLazyImage = (thumbnailUrl, fullUrl) => {
  const [currentSrc, setCurrentSrc] = React.useState(thumbnailUrl);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!fullUrl) {
      setIsLoading(false);
      return;
    }

    // Precargar imagen completa
    const img = new Image();
    img.onload = () => {
      setCurrentSrc(fullUrl);
      setIsLoading(false);
    };
    img.onerror = () => {
      setIsLoading(false);
    };
    img.src = fullUrl;
  }, [fullUrl]);

  return { src: currentSrc, isLoading };
};

/**
 * Componente de imagen con progressive loading
 */
export const ProgressiveImage = ({
  thumbnailUrl,
  fullUrl,
  alt = '',
  className = '',
  onClick = null
}) => {
  const { src, isLoading } = useLazyImage(thumbnailUrl, fullUrl);

  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className={`${className} transition-all duration-300 ${
          isLoading ? 'blur-sm' : 'blur-0'
        }`}
        onClick={onClick}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 bg-opacity-50">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default {
  IMAGE_SIZES,
  generateImageVariants,
  generateThumbnailOnly,
  processMultipleImages,
  variantBlobToFile,
  getStoragePathForVariant,
  uploadImageWithThumbnails,
  useLazyImage,
  ProgressiveImage
};
