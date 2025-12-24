// backend/src/utils/validators.js
// ✅ UTILIDADES DE VALIDACIÓN PARA PREVENIR INYECCIONES

/**
 * Valida y sanitiza un Company ID
 * @param {string} companyId - ID de la compañía a validar
 * @returns {string} CompanyId sanitizado
 * @throws {Error} Si el companyId es inválido
 */
export const validateCompanyId = (companyId) => {
  if (!companyId || typeof companyId !== 'string') {
    throw new Error('companyId es requerido y debe ser un string');
  }

  // Trim
  const cleaned = companyId.trim();

  // Validar longitud
  if (cleaned.length === 0 || cleaned.length > 128) {
    throw new Error('companyId debe tener entre 1 y 128 caracteres');
  }

  // Validar caracteres permitidos (alfanuméricos, guiones y guiones bajos)
  if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) {
    throw new Error('companyId contiene caracteres no permitidos');
  }

  return cleaned;
};

/**
 * Valida un número de contenedor
 * @param {string} numero - Número de contenedor
 * @returns {string} Número sanitizado
 * @throws {Error} Si el número es inválido
 */
export const validateNumeroContenedor = (numero) => {
  if (!numero || typeof numero !== 'string') {
    throw new Error('Número de contenedor es requerido');
  }

  const cleaned = numero.trim().toUpperCase();

  if (cleaned.length === 0 || cleaned.length > 50) {
    throw new Error('Número de contenedor debe tener entre 1 y 50 caracteres');
  }

  // Permitir alfanuméricos, guiones y espacios
  if (!/^[A-Z0-9\s-]+$/.test(cleaned)) {
    throw new Error('Número de contenedor contiene caracteres no permitidos');
  }

  return cleaned;
};

/**
 * Valida un estado de contenedor/factura
 * @param {string} estado - Estado a validar
 * @returns {string} Estado validado
 * @throws {Error} Si el estado no es válido
 */
export const validateEstado = (estado) => {
  const estadosPermitidos = [
    'activo',
    'cerrado',
    'pendiente',
    'cancelado',
    'sin_confirmar',
    'confirmado',
    'en_transito',
    'entregado',
    'no_entregado'
  ];

  if (!estado || typeof estado !== 'string') {
    throw new Error('Estado es requerido');
  }

  const cleaned = estado.trim().toLowerCase();

  if (!estadosPermitidos.includes(cleaned)) {
    throw new Error(`Estado inválido. Debe ser uno de: ${estadosPermitidos.join(', ')}`);
  }

  return cleaned;
};

/**
 * Valida un ID de Firestore
 * @param {string} id - ID a validar
 * @param {string} fieldName - Nombre del campo (para mensajes de error)
 * @returns {string} ID validado
 * @throws {Error} Si el ID es inválido
 */
export const validateFirestoreId = (id, fieldName = 'ID') => {
  if (!id || typeof id !== 'string') {
    throw new Error(`${fieldName} es requerido`);
  }

  const cleaned = id.trim();

  // Firestore IDs tienen máximo 1500 bytes, pero usamos 128 como límite razonable
  if (cleaned.length === 0 || cleaned.length > 128) {
    throw new Error(`${fieldName} debe tener entre 1 y 128 caracteres`);
  }

  // Firestore IDs no pueden contener /
  if (cleaned.includes('/')) {
    throw new Error(`${fieldName} no puede contener caracteres /`);
  }

  return cleaned;
};

/**
 * Valida un parámetro de paginación
 * @param {string|number} value - Valor a validar
 * @param {number} max - Valor máximo permitido
 * @param {number} defaultValue - Valor por defecto
 * @returns {number} Valor validado
 */
export const validatePaginationParam = (value, max = 100, defaultValue = 20) => {
  if (!value) {
    return defaultValue;
  }

  const num = parseInt(value, 10);

  if (isNaN(num) || num < 1) {
    return defaultValue;
  }

  return Math.min(num, max);
};

/**
 * Valida un objeto de query params
 * Remueve propiedades con operadores NoSQL maliciosos
 * @param {object} queryParams - Parámetros de query
 * @returns {object} Query params sanitizados
 */
export const sanitizeQueryParams = (queryParams) => {
  if (!queryParams || typeof queryParams !== 'object') {
    return {};
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(queryParams)) {
    // Rechazar claves que empiecen con $ (operadores NoSQL)
    if (key.startsWith('$')) {
      console.warn(`⚠️ Intento de inyección NoSQL detectado: clave "${key}" rechazada`);
      continue;
    }

    // Si el valor es un objeto, rechazarlo (prevenir inyección de operadores)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      console.warn(`⚠️ Intento de inyección NoSQL detectado: valor objeto en "${key}" rechazado`);
      continue;
    }

    // Si el valor es un array, validar que no contenga objetos
    if (Array.isArray(value)) {
      const hasObjects = value.some(item => typeof item === 'object' && item !== null);
      if (hasObjects) {
        console.warn(`⚠️ Intento de inyección NoSQL detectado: array con objetos en "${key}" rechazado`);
        continue;
      }
    }

    sanitized[key] = value;
  }

  return sanitized;
};

export default {
  validateCompanyId,
  validateNumeroContenedor,
  validateEstado,
  validateFirestoreId,
  validatePaginationParam,
  sanitizeQueryParams
};
