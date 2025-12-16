// backend/src/helpers/contenedorProgressHelper.js
/**
 * Helper para calcular y gestionar el progreso de contenedores
 */

/**
 * Estados de contenedor y su progreso asociado
 */
export const CONTENEDOR_ESTADOS = {
  CREADO: { label: 'Creado', progreso: 0 },
  EN_RECOLECCION: { label: 'En recolección', progreso: 25 },
  CONFIRMADO: { label: 'Facturas confirmadas', progreso: 50 },
  EN_TRANSITO: { label: 'En tránsito a RD', progreso: 75 },
  RECIBIDO_RD: { label: 'Recibido en RD', progreso: 100 }
};

/**
 * Calcula el progreso de un contenedor basado en sus facturas
 * @param {Object} contenedor - Datos del contenedor
 * @param {Array} recolecciones - Recolecciones asociadas al contenedor
 * @returns {Object} - Estado y progreso del contenedor
 */
export function calcularProgresoContenedor(contenedor, recolecciones = []) {
  if (!contenedor) {
    return { estado: 'CREADO', progreso: 0, label: 'Creado' };
  }

  // Si tiene estado explícito en el contenedor, usarlo
  if (contenedor.estado) {
    const estadoUpper = contenedor.estado.toUpperCase();
    if (CONTENEDOR_ESTADOS[estadoUpper]) {
      return {
        estado: estadoUpper,
        ...CONTENEDOR_ESTADOS[estadoUpper]
      };
    }
  }

  // Calcular basado en las recolecciones
  if (recolecciones.length === 0) {
    return {
      estado: 'CREADO',
      ...CONTENEDOR_ESTADOS.CREADO
    };
  }

  const totalFacturas = recolecciones.length;
  const facturasConfirmadas = recolecciones.filter(r =>
    r.estadoGeneral === 'confirmada' || r.estadoGeneral === 'en_transito' || r.estadoGeneral === 'recibida_rd'
  ).length;
  const facturasEnTransito = recolecciones.filter(r =>
    r.estadoGeneral === 'en_transito' || r.estadoGeneral === 'recibida_rd'
  ).length;
  const facturasRecibidas = recolecciones.filter(r =>
    r.estadoGeneral === 'recibida_rd'
  ).length;

  // Determinar estado según progreso
  if (facturasRecibidas === totalFacturas && totalFacturas > 0) {
    return {
      estado: 'RECIBIDO_RD',
      ...CONTENEDOR_ESTADOS.RECIBIDO_RD
    };
  }

  if (facturasEnTransito > 0) {
    const progresoTransito = 75 + (facturasRecibidas / totalFacturas) * 25;
    return {
      estado: 'EN_TRANSITO',
      label: 'En tránsito a RD',
      progreso: Math.round(progresoTransito)
    };
  }

  if (facturasConfirmadas === totalFacturas && totalFacturas > 0) {
    return {
      estado: 'CONFIRMADO',
      ...CONTENEDOR_ESTADOS.CONFIRMADO
    };
  }

  if (facturasConfirmadas > 0) {
    const progresoConfirmacion = 25 + (facturasConfirmadas / totalFacturas) * 25;
    return {
      estado: 'EN_RECOLECCION',
      label: 'En recolección',
      progreso: Math.round(progresoConfirmacion)
    };
  }

  return {
    estado: 'EN_RECOLECCION',
    ...CONTENEDOR_ESTADOS.EN_RECOLECCION
  };
}

/**
 * Obtiene el siguiente estado de un contenedor
 * @param {string} estadoActual - Estado actual del contenedor
 * @returns {string} - Siguiente estado
 */
export function getSiguienteEstado(estadoActual) {
  const estados = Object.keys(CONTENEDOR_ESTADOS);
  const indiceActual = estados.findIndex(e => e === estadoActual);

  if (indiceActual === -1 || indiceActual === estados.length - 1) {
    return estadoActual;
  }

  return estados[indiceActual + 1];
}

/**
 * Verifica si un contenedor está listo para el siguiente estado
 * @param {Object} contenedor - Datos del contenedor
 * @param {Array} recolecciones - Recolecciones asociadas
 * @param {string} nuevoEstado - Estado al que se quiere avanzar
 * @returns {Object} - { ready: boolean, motivo: string }
 */
export function puedeAvanzarEstado(contenedor, recolecciones, nuevoEstado) {
  const estadoActual = contenedor.estado?.toUpperCase() || 'CREADO';

  switch (nuevoEstado) {
    case 'CONFIRMADO':
      // Todas las facturas deben estar confirmadas
      const todasConfirmadas = recolecciones.every(r =>
        r.estadoGeneral === 'confirmada' ||
        r.estadoGeneral === 'en_transito' ||
        r.estadoGeneral === 'recibida_rd'
      );
      return {
        ready: todasConfirmadas,
        motivo: todasConfirmadas ? null : 'No todas las facturas están confirmadas'
      };

    case 'EN_TRANSITO':
      // Debe estar confirmado primero
      if (estadoActual !== 'CONFIRMADO') {
        return {
          ready: false,
          motivo: 'El contenedor debe estar confirmado primero'
        };
      }
      return { ready: true, motivo: null };

    case 'RECIBIDO_RD':
      // Debe estar en tránsito
      if (estadoActual !== 'EN_TRANSITO') {
        return {
          ready: false,
          motivo: 'El contenedor debe estar en tránsito primero'
        };
      }
      return { ready: true, motivo: null };

    default:
      return { ready: true, motivo: null };
  }
}

/**
 * Calcula el ETA (Estimated Time of Arrival) de un contenedor
 * @param {Object} contenedor - Datos del contenedor
 * @returns {Object} - { etaFecha, etaHora, diasRestantes }
 */
export function calcularETA(contenedor) {
  if (!contenedor.fechaEmbarque) {
    return { etaFecha: null, etaHora: null, diasRestantes: null };
  }

  // Tiempo estimado de tránsito: 7-10 días
  const DIAS_TRANSITO = 10;
  const fechaEmbarque = new Date(contenedor.fechaEmbarque);
  const fechaETA = new Date(fechaEmbarque);
  fechaETA.setDate(fechaETA.getDate() + DIAS_TRANSITO);

  const ahora = new Date();
  const diasRestantes = Math.ceil((fechaETA - ahora) / (1000 * 60 * 60 * 24));

  return {
    etaFecha: fechaETA.toLocaleDateString('es-DO'),
    etaHora: '14:00', // Hora estimada por defecto
    diasRestantes: Math.max(0, diasRestantes)
  };
}

/**
 * Obtiene resumen completo del contenedor
 * @param {Object} contenedor - Datos del contenedor
 * @param {Array} recolecciones - Recolecciones asociadas
 * @returns {Object} - Resumen completo
 */
export function getContenedorResumen(contenedor, recolecciones = []) {
  const progressInfo = calcularProgresoContenedor(contenedor, recolecciones);
  const eta = calcularETA(contenedor);

  const totalFacturas = recolecciones.length;
  const valorTotal = recolecciones.reduce((sum, r) =>
    sum + (r.facturacion?.total || 0), 0
  );

  return {
    numeroContenedor: contenedor.numeroContenedor,
    ...progressInfo,
    totalFacturas,
    valorTotal,
    ...eta,
    fechaCreacion: contenedor.fechaCreacion,
    fechaEmbarque: contenedor.fechaEmbarque,
    fechaRecepcion: contenedor.fechaRecepcion
  };
}
