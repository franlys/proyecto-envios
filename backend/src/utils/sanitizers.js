// backend/src/utils/sanitizers.js
// ✅ UTILIDADES DE SANITIZACIÓN PARA PREVENIR XSS

/**
 * Sanitiza un string removiendo HTML/JS peligroso
 * @param {*} input - Input a sanitizar
 * @param {number} maxLength - Longitud máxima permitida
 * @returns {string} String sanitizado
 */
export const sanitizeString = (input, maxLength = 500) => {
  if (input === null || input === undefined) {
    return '';
  }

  // Convertir a string
  let cleaned = String(input).trim();

  // Limitar longitud (prevenir DoS)
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }

  // Remover caracteres de control ASCII
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '');

  // Escapar caracteres HTML peligrosos
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return cleaned;
};

/**
 * Sanitiza un número asegurando que sea válido y positivo
 * @param {*} input - Input a sanitizar
 * @param {boolean} allowNegative - Permitir números negativos
 * @returns {number} Número sanitizado
 */
export const sanitizeNumber = (input, allowNegative = false) => {
  const num = parseFloat(input);

  // Validar que sea un número válido
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }

  // Prevenir números negativos si no están permitidos
  if (!allowNegative && num < 0) {
    return 0;
  }

  // Limitar a 2 decimales (para montos)
  return Math.round(num * 100) / 100;
};

/**
 * Sanitiza un teléfono removiendo caracteres no numéricos
 * @param {*} input - Input a sanitizar
 * @returns {string} Teléfono sanitizado
 */
export const sanitizePhone = (input) => {
  if (!input) {
    return '';
  }

  let cleaned = String(input).trim();

  // Remover todo excepto números, espacios, guiones, paréntesis y +
  cleaned = cleaned.replace(/[^\d\s\-\(\)\+]/g, '');

  // Limitar longitud
  if (cleaned.length > 20) {
    cleaned = cleaned.substring(0, 20);
  }

  return cleaned;
};

/**
 * Sanitiza un email
 * @param {*} input - Input a sanitizar
 * @returns {string} Email sanitizado
 */
export const sanitizeEmail = (input) => {
  if (!input) {
    return '';
  }

  let cleaned = String(input).trim().toLowerCase();

  // Limitar longitud
  if (cleaned.length > 254) { // RFC 5321
    cleaned = cleaned.substring(0, 254);
  }

  // Validación básica de formato
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned)) {
    return '';
  }

  return cleaned;
};

/**
 * Sanitiza un objeto completo recursivamente
 * @param {object} obj - Objeto a sanitizar
 * @param {object} schema - Schema de sanitización
 * @returns {object} Objeto sanitizado
 */
export const sanitizeObject = (obj, schema) => {
  if (!obj || typeof obj !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [key, config] of Object.entries(schema)) {
    if (obj[key] === undefined) {
      continue;
    }

    const value = obj[key];
    const { type, maxLength, allowNegative } = config;

    switch (type) {
      case 'string':
        sanitized[key] = sanitizeString(value, maxLength);
        break;
      case 'number':
        sanitized[key] = sanitizeNumber(value, allowNegative);
        break;
      case 'phone':
        sanitized[key] = sanitizePhone(value);
        break;
      case 'email':
        sanitized[key] = sanitizeEmail(value);
        break;
      default:
        // Por defecto, tratar como string
        sanitized[key] = sanitizeString(value, maxLength || 500);
    }
  }

  return sanitized;
};

/**
 * Schema de sanitización para facturas/recolecciones
 */
export const FACTURA_SANITIZATION_SCHEMA = {
  numeroFactura: { type: 'string', maxLength: 50 },
  cliente: { type: 'string', maxLength: 200 },
  direccion: { type: 'string', maxLength: 500 },
  telefono: { type: 'phone', maxLength: 20 },
  monto: { type: 'number', allowNegative: false },
  contenedor: { type: 'string', maxLength: 50 },
  contenido: { type: 'string', maxLength: 1000 },
  sector: { type: 'string', maxLength: 100 },
  zona: { type: 'string', maxLength: 50 },
  fileId: { type: 'string', maxLength: 128 },
  fileName: { type: 'string', maxLength: 255 }
};

/**
 * Sanitiza datos de factura específicamente
 * @param {object} facturaData - Datos de factura sin sanitizar
 * @returns {object} Factura sanitizada
 */
export const sanitizeFacturaData = (facturaData) => {
  return sanitizeObject(facturaData, FACTURA_SANITIZATION_SCHEMA);
};

export default {
  sanitizeString,
  sanitizeNumber,
  sanitizePhone,
  sanitizeEmail,
  sanitizeObject,
  sanitizeFacturaData,
  FACTURA_SANITIZATION_SCHEMA
};
