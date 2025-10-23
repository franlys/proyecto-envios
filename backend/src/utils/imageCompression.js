// backend/src/utils/imageCompression.js
import sharp from 'sharp';

/**
 * Comprime y optimiza imágenes
 */
export default class ImageCompression {
  
  /**
   * Comprime imagen manteniendo calidad razonable
   * @param {Buffer} imageBuffer Buffer de la imagen
   * @returns {Promise<Buffer>} Imagen comprimida
   */
  static async compress(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(1920, 1920, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 80,
          progressive: true
        })
        .toBuffer();
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      throw error;
    }
  }
  
  /**
   * Genera thumbnail
   * @param {Buffer} imageBuffer 
   * @returns {Promise<Buffer>}
   */
  static async thumbnail(imageBuffer) {
    try {
      return await sharp(imageBuffer)
        .resize(300, 300, {
          fit: 'cover'
        })
        .jpeg({
          quality: 70
        })
        .toBuffer();
    } catch (error) {
      console.error('Error generando thumbnail:', error);
      throw error;
    }
  }
}