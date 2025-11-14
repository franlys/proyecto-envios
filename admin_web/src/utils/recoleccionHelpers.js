// admin_web/src/utils/recoleccionHelpers.js
// 🛡️ Helpers para manejar recolecciones con nueva y antigua estructura

/**
 * Extrae datos del destinatario de manera segura
 * Funciona con estructura nueva (destinatario.nombre) y antigua (nombreRecibe)
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {Object} Datos del destinatario normalizados
 */
export const getDestinatario = (recoleccion) => {
  if (!recoleccion) {
    return {
      nombre: 'N/A',
      telefono: 'N/A',
      direccion: 'N/A',
      email: 'N/A'
    };
  }

  return {
    nombre: recoleccion.destinatario?.nombre || recoleccion.nombreRecibe || 'N/A',
    telefono: recoleccion.destinatario?.telefono || recoleccion.telefono || 'N/A',
    direccion: recoleccion.destinatario?.direccion || recoleccion.direccion || 'N/A',
    email: recoleccion.destinatario?.email || recoleccion.email || ''
  };
};

/**
 * Extrae datos del remitente de manera segura
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {Object} Datos del remitente normalizados
 */
export const getRemitente = (recoleccion) => {
  if (!recoleccion || !recoleccion.remitente) {
    return {
      nombre: 'N/A',
      telefono: 'N/A',
      direccion: 'N/A',
      email: ''
    };
  }

  return {
    nombre: recoleccion.remitente.nombre || 'N/A',
    telefono: recoleccion.remitente.telefono || 'N/A',
    direccion: recoleccion.remitente.direccion || 'N/A',
    email: recoleccion.remitente.email || ''
  };
};

/**
 * Verifica si una recolección usa la estructura nueva
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {boolean} True si usa estructura nueva
 */
export const isNuevaEstructura = (recoleccion) => {
  return !!(recoleccion?.destinatario || recoleccion?.remitente);
};

/**
 * Obtiene el nombre del cliente (destinatario) para mostrar
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {string} Nombre del cliente
 */
export const getNombreCliente = (recoleccion) => {
  return recoleccion?.destinatario?.nombre || recoleccion?.nombreRecibe || 'Sin nombre';
};

/**
 * Obtiene el teléfono del cliente (destinatario) para mostrar
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {string} Teléfono del cliente
 */
export const getTelefonoCliente = (recoleccion) => {
  return recoleccion?.destinatario?.telefono || recoleccion?.telefono || 'N/A';
};

/**
 * Obtiene la dirección del cliente (destinatario) para mostrar
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {string} Dirección del cliente
 */
export const getDireccionCliente = (recoleccion) => {
  return recoleccion?.destinatario?.direccion || recoleccion?.direccion || 'N/A';
};

/**
 * Obtiene todos los datos de entrega
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {Object} Datos de entrega normalizados
 */
export const getDatosEntrega = (recoleccion) => {
  return {
    zona: recoleccion?.zona || 'N/A',
    sector: recoleccion?.sector || '',
    destinatario: getDestinatario(recoleccion),
    notas: recoleccion?.notas || ''
  };
};

/**
 * Formatea el estado de la recolección para mostrar
 * 
 * @param {string} estado - Estado de la recolección
 * @returns {Object} { label: string, color: string }
 */
export const formatearEstado = (estado) => {
  const estados = {
    'recolectada': { label: 'Recolectada', color: 'green' },
    'en_almacen': { label: 'En Almacén', color: 'blue' },
    'en_transito': { label: 'En Tránsito', color: 'yellow' },
    'entregada': { label: 'Entregada', color: 'gray' },
    'pendiente': { label: 'Pendiente', color: 'orange' }
  };

  return estados[estado] || { label: estado || 'Desconocido', color: 'gray' };
};

/**
 * Cuenta los items de una recolección de manera segura
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {number} Cantidad de items
 */
export const contarItems = (recoleccion) => {
  return recoleccion?.items?.length || 0;
};

/**
 * Verifica si una recolección tiene fotos
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {boolean} True si tiene fotos
 */
export const tieneFotos = (recoleccion) => {
  return !!(recoleccion?.fotosRecoleccion?.length > 0);
};

/**
 * Obtiene las fotos de recolección de manera segura
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {Array} Array de URLs de fotos
 */
export const getFotosRecoleccion = (recoleccion) => {
  return recoleccion?.fotosRecoleccion || [];
};

/**
 * Obtiene las fotos de entrega de manera segura
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {Array} Array de URLs de fotos
 */
export const getFotosEntrega = (recoleccion) => {
  return recoleccion?.fotosEntrega || [];
};

/**
 * Verifica si todos los items están completos
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {boolean} True si todos los items están completos
 */
export const todosItemsCompletos = (recoleccion) => {
  if (!recoleccion?.items || recoleccion.items.length === 0) {
    return false;
  }

  return recoleccion.items.every(item => 
    item.estadoItem === 'verificado' || 
    item.estadoItem === 'entregado'
  );
};

/**
 * Obtiene resumen de items por estado
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {Object} { total, completos, pendientes, verificados }
 */
export const getResumenItems = (recoleccion) => {
  const items = recoleccion?.items || [];
  
  return {
    total: items.length,
    recolectados: items.filter(i => i.estadoItem === 'recolectado').length,
    verificados: items.filter(i => i.estadoItem === 'verificado').length,
    entregados: items.filter(i => i.estadoItem === 'entregado').length
  };
};

/**
 * Formatea una fecha ISO para mostrar
 * 
 * @param {string} isoDate - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
export const formatearFecha = (isoDate) => {
  if (!isoDate) return 'N/A';
  
  const fecha = new Date(isoDate);
  const opciones = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return fecha.toLocaleDateString('es-DO', opciones);
};

/**
 * Obtiene el código de tracking de manera segura
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {string} Código de tracking
 */
export const getCodigoTracking = (recoleccion) => {
  return recoleccion?.codigoTracking || 'N/A';
};

/**
 * Verifica si una recolección está en un contenedor
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {boolean} True si está en contenedor
 */
export const estaEnContenedor = (recoleccion) => {
  return !!recoleccion?.contenedorId;
};

/**
 * Obtiene el ID del contenedor de manera segura
 * 
 * @param {Object} recoleccion - Objeto de recolección
 * @returns {string|null} ID del contenedor o null
 */
export const getContenedorId = (recoleccion) => {
  return recoleccion?.contenedorId || null;
};

// Exportar todo como default también
export default {
  getDestinatario,
  getRemitente,
  isNuevaEstructura,
  getNombreCliente,
  getTelefonoCliente,
  getDireccionCliente,
  getDatosEntrega,
  formatearEstado,
  contarItems,
  tieneFotos,
  getFotosRecoleccion,
  getFotosEntrega,
  todosItemsCompletos,
  getResumenItems,
  formatearFecha,
  getCodigoTracking,
  estaEnContenedor,
  getContenedorId
};