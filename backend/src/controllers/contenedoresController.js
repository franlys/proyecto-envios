// backend/src/controllers/contenedoresController.js
// ✅ ACTUALIZADO: Incluye eliminar contenedor, quitar facturas y marcar como trabajado

import { db } from '../config/firebase.js';
import {
  ESTADOS_CONTENEDOR,
  crearContenedor as crearContenedorModelo,
  obtenerContenedores as obtenerContenedoresModelo,
  obtenerContenedorPorId as obtenerContenedorPorIdModelo,
  obtenerContenedorPorNumero as obtenerContenedorPorNumeroModelo,
  agregarFacturaAContenedor as agregarFacturaAContenedorModelo,
  marcarItemIncluido as marcarItemIncluidoModelo,
  cerrarContenedor as cerrarContenedorModelo,
  marcarContenedorRecibidoRD as marcarContenedorRecibidoRDModelo,
  quitarFacturaDeContenedor,
  eliminarContenedor,
  marcarContenedorTrabajado
} from '../models/Contenedor.js';
import { generarNumeroContenedor } from '../utils/trackingUtils.js';

// ========================================
// CREAR NUEVO CONTENEDOR
// ========================================

export const createContenedor = async (req, res) => {
  try {
    console.log('📦 Creando nuevo contenedor...');

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;

    if (!['admin_general', 'almacen_eeuu', 'super_admin'].includes(userData.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para crear contenedores'
      });
    }

    // ✅ GENERACIÓN AUTOMÁTICA DE ID
    const nuevoNumero = await generarNumeroContenedor(companyId);

    // Validar si generó error o vino vacío (aunque lanza throw)
    if (!nuevoNumero) {
      throw new Error('No se pudo generar el número de contenedor');
    }

    const contenedorData = {
      numeroContenedor: nuevoNumero,
      estado: ESTADOS_CONTENEDOR.ABIERTO_USA,
      companyId,
      creadoPor: req.userData.uid
    };

    const contenedor = await crearContenedorModelo(contenedorData);

    console.log('✅ Contenedor creado exitosamente:', contenedor.id);

    return res.status(201).json({
      success: true,
      message: 'Contenedor creado exitosamente',
      data: contenedor
    });

  } catch (error) {
    console.error('❌ Error creando contenedor:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// OBTENER TODOS LOS CONTENEDORES
// ========================================

export const getAllContenedores = async (req, res) => {
  try {
    console.log('📋 Obteniendo contenedores...');

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;

    const filtros = {};
    if (req.query.estado) {
      filtros.estado = req.query.estado;
    }

    const contenedores = await obtenerContenedoresModelo(companyId, filtros);

    console.log(`✅ ${contenedores.length} contenedores encontrados`);

    return res.json({
      success: true,
      data: contenedores,
      count: contenedores.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo contenedores:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// OBTENER CONTENEDOR POR ID
// ========================================

export const getContenedorById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Buscando contenedor con ID: ${id}`);

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();

    const contenedor = await obtenerContenedorPorIdModelo(id);

    if (userData.rol !== 'super_admin' && userData.rol !== 'propietario' && contenedor.companyId !== userData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para acceder a este contenedor'
      });
    }

    console.log('✅ Contenedor encontrado');

    return res.json({
      success: true,
      data: contenedor
    });

  } catch (error) {
    console.error('❌ Error obteniendo contenedor:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// BUSCAR FACTURA POR CÓDIGO
// ========================================

export const buscarFacturaPorCodigo = async (req, res) => {
  try {
    const { codigo } = req.params;
    console.log(`🔍 Buscando factura con código: ${codigo}`);

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();

    let query = db.collection('recolecciones')
      .where('codigoTracking', '==', codigo.toUpperCase());

    if (userData.rol !== 'super_admin') {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query.limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada con ese código'
      });
    }

    const facturaDoc = snapshot.docs[0];
    const facturaData = facturaDoc.data();

    if (facturaData.estadoGeneral !== 'recolectada') {
      return res.status(400).json({
        success: false,
        error: `Esta factura ya está procesada (Estado: ${facturaData.estadoGeneral})`
      });
    }

    if (facturaData.contenedorId) {
      return res.status(400).json({
        success: false,
        error: 'Esta factura ya está asignada a otro contenedor'
      });
    }

    console.log('✅ Factura encontrada y disponible');

    return res.json({
      success: true,
      data: {
        id: facturaDoc.id,
        ...facturaData
      }
    });

  } catch (error) {
    console.error('❌ Error buscando factura:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// AGREGAR FACTURA AL CONTENEDOR
// ========================================

export const agregarFactura = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;
    const { facturaId } = req.body;

    console.log(`📦 Agregando factura ${facturaId} al contenedor ${contenedorId}`);

    if (!facturaId) {
      return res.status(400).json({
        success: false,
        error: 'El ID de la factura es obligatorio'
      });
    }

    const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();

    if (!facturaDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada'
      });
    }

    const facturaData = facturaDoc.data();

    if (facturaData.estadoGeneral !== 'recolectada') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden agregar facturas en estado "recolectada"'
      });
    }

    if (facturaData.contenedorId) {
      return res.status(400).json({
        success: false,
        error: 'Esta factura ya está en otro contenedor'
      });
    }

    const contenedorActualizado = await agregarFacturaAContenedorModelo(contenedorId, {
      facturaId,
      numeroFactura: facturaData.codigoTracking,
      items: facturaData.items || []
    });

    console.log('✅ Factura agregada al contenedor');

    return res.json({
      success: true,
      message: 'Factura agregada al contenedor. Ahora puedes escanear sus items.',
      data: contenedorActualizado
    });

  } catch (error) {
    console.error('❌ Error agregando factura:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// ✅ NUEVO: QUITAR FACTURA DEL CONTENEDOR
// ========================================

export const quitarFactura = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;
    const { facturaId } = req.body;

    console.log(`🗑️ Quitando factura ${facturaId} del contenedor ${contenedorId}`);

    if (!facturaId) {
      return res.status(400).json({
        success: false,
        error: 'El ID de la factura es obligatorio'
      });
    }

    // Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const userData = userDoc.data();

    if (!['admin_general', 'almacen_eeuu', 'super_admin'].includes(userData.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para quitar facturas'
      });
    }

    const contenedorActualizado = await quitarFacturaDeContenedor(contenedorId, facturaId);

    console.log('✅ Factura quitada del contenedor');

    return res.json({
      success: true,
      message: 'Factura quitada exitosamente del contenedor',
      data: contenedorActualizado
    });

  } catch (error) {
    console.error('❌ Error quitando factura:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// MARCAR ITEM COMO INCLUIDO
// ========================================

export const marcarItem = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;
    const { facturaId, itemId } = req.body;

    console.log(`✅ Marcando item ${itemId} de factura ${facturaId} como incluido`);

    if (!facturaId || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren facturaId e itemId'
      });
    }

    const resultado = await marcarItemIncluidoModelo(contenedorId, facturaId, itemId);

    console.log('✅ Item marcado correctamente');

    return res.json({
      success: true,
      message: 'Item marcado como incluido',
      data: resultado
    });

  } catch (error) {
    console.error('❌ Error marcando item:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// CERRAR CONTENEDOR
// ========================================

export const cerrarContenedorEndpoint = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;
    const { confirmarIncompletas } = req.body;

    console.log(`🔒 Cerrando contenedor ${contenedorId}`);

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();

    if (!['admin_general', 'almacen_eeuu', 'super_admin'].includes(userData.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para cerrar contenedores'
      });
    }

    const contenedor = await obtenerContenedorPorIdModelo(contenedorId);

    if (contenedor.facturasIncompletas > 0 && !confirmarIncompletas) {
      return res.status(400).json({
        success: false,
        error: 'Hay facturas incompletas en el contenedor',
        requireConfirmation: true,
        facturasIncompletas: contenedor.facturasIncompletas,
        message: '¿Deseas cerrar el contenedor de todas formas? Las facturas incompletas quedarán marcadas como tales.'
      });
    }

    const contenedorCerrado = await cerrarContenedorModelo(contenedorId, req.userData.uid);

    console.log('✅ Contenedor cerrado exitosamente');

    return res.json({
      success: true,
      message: 'Contenedor cerrado exitosamente',
      data: contenedorCerrado,
      advertencia: contenedorCerrado.facturasIncompletas > 0
        ? `${contenedorCerrado.facturasIncompletas} factura(s) quedaron marcadas como incompletas`
        : null
    });

  } catch (error) {
    console.error('❌ Error cerrando contenedor:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// ✅ NUEVO: MARCAR CONTENEDOR COMO TRABAJADO
// ========================================

export const marcarComoTrabajado = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;

    console.log(`✅ Marcando contenedor ${contenedorId} como trabajado`);

    // Verificar permisos (solo admin general)
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const userData = userDoc.data();

    if (!['admin_general', 'super_admin'].includes(userData.rol)) {
      return res.status(403).json({
        success: false,
        error: 'Solo el administrador general puede marcar contenedores como trabajados'
      });
    }

    const contenedorTrabajado = await marcarContenedorTrabajado(contenedorId, req.userData.uid);

    console.log('✅ Contenedor marcado como trabajado');

    return res.json({
      success: true,
      message: 'Contenedor marcado como trabajado y movido al historial',
      data: contenedorTrabajado
    });

  } catch (error) {
    console.error('❌ Error marcando como trabajado:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// MARCAR CONTENEDOR COMO RECIBIDO EN RD
// ========================================

export const recibirContenedor = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;

    console.log(`📥 Recibiendo contenedor ${contenedorId} en RD`);

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();

    if (!['admin_general', 'almacen_rd', 'super_admin'].includes(userData.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para recibir contenedores'
      });
    }

    const contenedorRecibido = await marcarContenedorRecibidoRDModelo(contenedorId);

    console.log('✅ Contenedor recibido en RD');

    return res.json({
      success: true,
      message: 'Contenedor marcado como recibido en RD',
      data: contenedorRecibido
    });

  } catch (error) {
    console.error('❌ Error recibiendo contenedor:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// ✅ NUEVO: ELIMINAR CONTENEDOR
// ========================================

export const deleteContenedor = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;

    console.log(`🗑️ Eliminando contenedor ${contenedorId}`);

    // Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const userData = userDoc.data();

    if (!['admin_general', 'super_admin'].includes(userData.rol)) {
      return res.status(403).json({
        success: false,
        error: 'Solo los administradores pueden eliminar contenedores'
      });
    }

    await eliminarContenedor(contenedorId);

    console.log('✅ Contenedor eliminado exitosamente');

    return res.json({
      success: true,
      message: 'Contenedor eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando contenedor:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// ESTADÍSTICAS DE CONTENEDORES
// ========================================

export const getContenedoresStats = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas de contenedores...');

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;

    const contenedores = await obtenerContenedoresModelo(companyId);

    const stats = {
      total: contenedores.length,
      porEstado: {
        abiertos: contenedores.filter(c => c.estado === ESTADOS_CONTENEDOR.ABIERTO_USA).length,
        cerrados: contenedores.filter(c => c.estado === ESTADOS_CONTENEDOR.CERRADO_USA).length,
        enTransito: contenedores.filter(c => c.estado === ESTADOS_CONTENEDOR.EN_TRANSITO_RD).length,
        recibidos: contenedores.filter(c => c.estado === ESTADOS_CONTENEDOR.RECIBIDO_RD).length,
        procesados: contenedores.filter(c => c.estado === ESTADOS_CONTENEDOR.PROCESADO_RD).length,
        trabajados: contenedores.filter(c => c.estado === 'trabajado').length
      },
      totalFacturas: contenedores.reduce((sum, c) => sum + c.totalFacturas, 0),
      facturasCompletas: contenedores.reduce((sum, c) => sum + c.facturasCompletas, 0),
      facturasIncompletas: contenedores.reduce((sum, c) => sum + c.facturasIncompletas, 0),
      totalItems: contenedores.reduce((sum, c) => sum + c.totalItems, 0),
      itemsIncluidos: contenedores.reduce((sum, c) => sum + c.itemsIncluidos, 0),
      itemsFaltantes: contenedores.reduce((sum, c) => sum + c.itemsFaltantes, 0)
    };

    console.log('✅ Estadísticas calculadas');

    return res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

export default {
  createContenedor,
  getAllContenedores,
  getContenedorById,
  buscarFacturaPorCodigo,
  agregarFactura,
  quitarFactura,
  marcarItem,
  cerrarContenedorEndpoint,
  marcarComoTrabajado,
  recibirContenedor,
  deleteContenedor,
  getContenedoresStats
};