// backend/src/controllers/trackingController.js
// ✅ CONTROLADOR PÚBLICO PARA TRACKING DE RECOLECCIONES

import { db } from '../config/firebase.js';
import { validarFormatoTracking } from '../utils/trackingUtils.js';

/**
 * GET /api/tracking/public/:codigo
 * Obtiene información pública de tracking de una recolección
 * SIN autenticación - cualquier persona con el código puede ver el estado
 *
 * @param {string} codigo - Código de tracking (EMI-0001 o RC-20250127-0001)
 * @returns {object} Información sanitizada de la recolección
 */
export const getPublicTracking = async (req, res) => {
  try {
    let { codigo } = req.params;

    // 0. Normalizar código (manejar espacios y ceros faltantes)
    if (codigo) {
      // Reemplazar espacios por guiones (caso de copy-paste erróneo)
      codigo = codigo.replace(/\s+|%20/g, '-').toUpperCase();

      // Si es formato legacy (RC-YYYYMMDD-N), asegurar padding de 4 ceros
      const parts = codigo.split('-');
      if (parts[0] === 'RC' && parts.length === 3) {
        const [prefix, date, number] = parts;
        if (number.length < 4 && /^\d+$/.test(number)) {
          codigo = `${prefix}-${date}-${number.padStart(4, '0')}`;
        }
      }
    }

    // 1. Validar formato del código
    if (!validarFormatoTracking(codigo)) {
      return res.status(400).json({
        success: false,
        error: 'Código de tracking inválido'
      });
    }

    // 2. Buscar recolección por código de tracking
    const recoleccionesRef = db.collection('recolecciones');
    const snapshot = await recoleccionesRef
      .where('codigoTracking', '==', codigo)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Recolección no encontrada',
        message: 'Verifica que el código de tracking sea correcto'
      });
    }

    const recoleccionDoc = snapshot.docs[0];
    const recoleccion = recoleccionDoc.data();

    // 3. Obtener información de la empresa (para mostrar nombre)
    let nombreEmpresa = 'Sistema de Envíos';
    if (recoleccion.companyId) {
      try {
        const companyDoc = await db.collection('companies').doc(recoleccion.companyId).get();
        if (companyDoc.exists) {
          const companyData = companyDoc.data();
          nombreEmpresa = companyData.nombre || companyData.name || nombreEmpresa;
        }
      } catch (error) {
        console.warn('No se pudo obtener información de la empresa:', error.message);
      }
    }

    // 4. Sanitizar datos sensibles (solo mostrar tracking code y empresa)
    // 🔒 SEGURIDAD: Solo exponer información pública mínima
    const datosPublicos = {
      codigoTracking: recoleccion.codigoTracking,
      estadoGeneral: recoleccion.estadoGeneral,
      nombreEmpresa,

      // Fecha de última actualización (solo para referencia)
      updatedAt: recoleccion.updatedAt || null
    };

    // 5. Generar historial de estados (timeline)
    const timeline = generarTimeline(recoleccion);

    // 6. Determinar estado legible
    const estadoLegible = obtenerEstadoLegible(recoleccion.estadoGeneral);

    return res.json({
      success: true,
      recoleccion: datosPublicos,
      timeline,
      estadoActual: {
        codigo: recoleccion.estadoGeneral,
        nombre: estadoLegible.nombre,
        descripcion: estadoLegible.descripcion,
        icono: estadoLegible.icono,
        color: estadoLegible.color
      }
    });

  } catch (error) {
    console.error('❌ Error en getPublicTracking:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener información de tracking',
      message: error.message
    });
  }
};

/**
 * Genera un timeline de estados basado en los datos de la recolección
 */
function generarTimeline(recoleccion) {
  const timeline = [];

  // Orden de estados del flujo normal
  const estados = [
    'pendiente_recoleccion',
    'recolectada',
    'en_contenedor_usa',
    'en_transito_rd',
    'recibida_rd',
    'pendiente_confirmacion',
    'confirmada',
    'en_ruta',
    'lista_para_entregar',
    'entregada'
  ];

  let estadoActual = recoleccion.estadoGeneral;

  // Normalizar estado actual para el timeline
  const mapaEstados = {
    'en_contenedor': 'en_contenedor_usa',
    'en_transito': 'en_transito_rd',
    'recibida': 'recibida_rd',
    'recibida_rd': 'recibida_rd', // Ya está normalizado
    'sin_confirmar': 'pendiente_confirmacion',
    'confirmada_secretaria': 'confirmada',
    'pagada_secretaria': 'confirmada' // Facturas pagadas también se consideran confirmadas
  };
  if (mapaEstados[estadoActual]) {
    estadoActual = mapaEstados[estadoActual];
  }

  const estadoActualIndex = estados.indexOf(estadoActual);

  estados.forEach((estado, index) => {
    const info = obtenerEstadoLegible(estado);

    // ✅ Marcar como completado si el índice es menor al actual
    // Asegurar que -1 (estado no encontrado) no marque todo como completado
    const completado = estadoActualIndex >= 0 && index <= estadoActualIndex;
    const esActual = estado === estadoActual;

    timeline.push({
      estado,
      nombre: info.nombre,
      descripcion: info.descripcion,
      icono: info.icono,
      color: info.color,
      completado,
      actual: esActual,
      fecha: esActual ? recoleccion.updatedAt : null
    });
  });

  return timeline;
}

/**
 * Convierte códigos de estado en texto legible para clientes
 */
function obtenerEstadoLegible(estadoCodigo) {
  const estados = {
    'pendiente_recoleccion': {
      nombre: 'Pendiente de Recolección',
      descripcion: 'Esperando a ser recolectado',
      icono: '📦',
      color: '#FFA500'
    },
    'recolectada': {
      nombre: 'Recolectada',
      descripcion: 'Paquete recolectado exitosamente',
      icono: '✅',
      color: '#4CAF50'
    },
    'en_contenedor_usa': {
      nombre: 'En Contenedor (USA)',
      descripcion: 'Empacado en contenedor en Estados Unidos',
      icono: '📦',
      color: '#2196F3'
    },
    'incompleta_usa': {
      nombre: 'Incompleta (USA)',
      descripcion: 'Faltan artículos en el contenedor',
      icono: '⚠️',
      color: '#FF9800'
    },
    'en_transito_rd': {
      nombre: 'En Tránsito a RD',
      descripcion: 'En camino a República Dominicana',
      icono: '🚢',
      color: '#2196F3'
    },
    'recibida_rd': {
      nombre: 'Recibida en RD',
      descripcion: 'Llegó al almacén en República Dominicana',
      icono: '🏢',
      color: '#4CAF50'
    },
    'pendiente_confirmacion': {
      nombre: 'Pendiente de Confirmación',
      descripcion: 'Esperando confirmación del cliente',
      icono: '⏳',
      color: '#FF9800'
    },
    'confirmada': {
      nombre: 'Confirmada',
      descripcion: 'Cliente confirmó recepción de información',
      icono: '✅',
      color: '#4CAF50'
    },
    'en_ruta': {
      nombre: 'En Ruta de Entrega',
      descripcion: 'El repartidor está en camino',
      icono: '🚚',
      color: '#2196F3'
    },
    'lista_para_entregar': {
      nombre: 'Lista para Entregar',
      descripcion: 'Preparada para entrega',
      icono: '📍',
      color: '#4CAF50'
    },
    'entregada': {
      nombre: 'Entregada',
      descripcion: 'Paquete entregado exitosamente',
      icono: '🎉',
      color: '#4CAF50'
    },
    'no_entregada': {
      nombre: 'No Entregada',
      descripcion: 'No se pudo entregar el paquete',
      icono: '❌',
      color: '#F44336'
    }
  };

  // Mapeo de estados alternativos (para compatibilidad)
  const estadoNormalizado = {
    'en_contenedor': 'en_contenedor_usa',
    'en_transito': 'en_transito_rd',
    'recibida': 'recibida_rd',
    'recibida_rd': 'recibida_rd', // Ya normalizado
    'sin_confirmar': 'pendiente_confirmacion',
    'confirmada_secretaria': 'confirmada',
    'pagada_secretaria': 'confirmada' // Facturas pagadas también confirmadas
  }[estadoCodigo] || estadoCodigo;

  return estados[estadoNormalizado] || {
    nombre: 'Estado Desconocido',
    descripcion: estadoCodigo,
    icono: '❓',
    color: '#9E9E9E'
  };
}

export default {
  getPublicTracking
};
