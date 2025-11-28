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
    const { codigo } = req.params;

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

    // 4. Sanitizar datos sensibles (solo mostrar lo necesario para tracking)
    const datosPublicos = {
      codigoTracking: recoleccion.codigoTracking,
      estadoGeneral: recoleccion.estadoGeneral,
      cliente: recoleccion.cliente || 'Cliente',
      direccion: recoleccion.direccion || '',
      zona: recoleccion.zona || '',
      sector: recoleccion.sector || '',

      // Fotos (si existen)
      fotosRecoleccion: recoleccion.fotosRecoleccion || [],
      fotosEntrega: recoleccion.fotosEntrega || [],

      // Items (sin información sensible)
      items: (recoleccion.items || []).map(item => ({
        descripcion: item.descripcion || 'Artículo',
        cantidad: item.cantidad || 1,
        estado: item.estado || 'recolectado'
      })),

      // Fechas
      createdAt: recoleccion.createdAt || null,
      updatedAt: recoleccion.updatedAt || null,

      // Información de entrega (si fue entregada)
      fechaEntrega: recoleccion.fechaEntrega || null,

      // Contenedor (si aplica)
      contenedorId: recoleccion.contenedorId || null,
      itemsCompletos: recoleccion.itemsCompletos !== undefined ? recoleccion.itemsCompletos : true,

      // Empresa
      nombreEmpresa,

      // Notas públicas (si existen)
      notas: recoleccion.notas || ''
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

  const estadoActual = recoleccion.estadoGeneral;
  const estadoActualIndex = estados.indexOf(estadoActual);

  estados.forEach((estado, index) => {
    const info = obtenerEstadoLegible(estado);

    timeline.push({
      estado,
      nombre: info.nombre,
      descripcion: info.descripcion,
      icono: info.icono,
      completado: index <= estadoActualIndex,
      actual: estado === estadoActual,
      fecha: estado === estadoActual ? recoleccion.updatedAt : null
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

  return estados[estadoCodigo] || {
    nombre: 'Estado Desconocido',
    descripcion: estadoCodigo,
    icono: '❓',
    color: '#9E9E9E'
  };
}

export default {
  getPublicTracking
};
