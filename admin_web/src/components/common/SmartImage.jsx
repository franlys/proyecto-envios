/**
 * SmartImage - Componente inteligente para fotos con soporte dual:
 *
 * - Formato Antiguo: String URL → Usa directamente para <img> y lightbox
 * - Formato Nuevo: { thumbnail, preview } → Usa thumbnail para carga rápida, preview para lightbox
 *
 * Mantiene compatibilidad total con fotos existentes mientras aprovecha
 * las optimizaciones de thumbnails cuando están disponibles.
 */

import { useState } from 'react';
import { Image as ImageIcon, ZoomIn } from 'lucide-react';

/**
 * Detecta si src es formato nuevo (objeto) o antiguo (string)
 */
const isOptimizedFormat = (src) => {
  return src && typeof src === 'object' && (src.thumbnail || src.preview);
};

/**
 * Extrae las URLs apropiadas según el formato
 */
const getImageUrls = (src) => {
  if (!src) return { thumbnail: null, preview: null, isOptimized: false };

  // Formato nuevo: { thumbnail, preview, metadata }
  if (isOptimizedFormat(src)) {
    return {
      thumbnail: src.thumbnail || src.preview, // Fallback a preview si no hay thumbnail
      preview: src.preview || src.thumbnail,   // Fallback a thumbnail si no hay preview
      isOptimized: true
    };
  }

  // Formato antiguo: String URL
  return {
    thumbnail: src,
    preview: src,
    isOptimized: false
  };
};

/**
 * SmartImage Component
 */
const SmartImage = ({
  src,
  alt = 'Imagen',
  className = '',
  onClick = null,
  showOptimizedBadge = true,
  showZoomIcon = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { thumbnail, preview, isOptimized } = getImageUrls(src);

  // Si no hay URL válida
  if (!thumbnail) {
    return (
      <div className={`${className} bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}>
        <ImageIcon className="text-slate-400" size={32} />
      </div>
    );
  }

  // Si hubo error al cargar la imagen
  if (imageError) {
    return (
      <div className={`${className} bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-4`}>
        <ImageIcon className="text-slate-400 mb-2" size={32} />
        <p className="text-xs text-slate-500 text-center">Error al cargar imagen</p>
      </div>
    );
  }

  const handleClick = () => {
    if (onClick) {
      // Pasar la URL de preview (alta calidad) al handler
      onClick(preview);
    }
  };

  return (
    <div className={`relative ${className} group`}>
      {/* Imagen optimizada (thumbnail para carga rápida) */}
      <img
        src={thumbnail}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        onClick={handleClick}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      />

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse flex items-center justify-center">
          <ImageIcon className="text-slate-400" size={24} />
        </div>
      )}

      {/* Badge de imagen optimizada */}
      {showOptimizedBadge && isOptimized && !isLoading && (
        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          HD
        </div>
      )}

      {/* Icono de zoom al hover */}
      {showZoomIcon && onClick && !isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="text-white drop-shadow-lg" size={32} />
        </div>
      )}
    </div>
  );
};

/**
 * Lightbox simple para mostrar imagen en tamaño completo
 */
export const ImageLightbox = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  // Extraer la URL de preview si es formato optimizado
  const { preview } = getImageUrls(imageUrl);

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <img
        src={preview}
        alt="Vista ampliada"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

/**
 * Hook para usar lightbox en componentes
 */
export const useImageLightbox = () => {
  const [lightboxImage, setLightboxImage] = useState(null);

  const openLightbox = (imageUrl) => {
    setLightboxImage(imageUrl);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const LightboxComponent = lightboxImage ? (
    <ImageLightbox imageUrl={lightboxImage} onClose={closeLightbox} />
  ) : null;

  return {
    openLightbox,
    closeLightbox,
    LightboxComponent
  };
};

export default SmartImage;
