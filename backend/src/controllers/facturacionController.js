// backend/src/controllers/facturacionController.js
/**
 * SISTEMA DE FACTURACIÓN
 * Gestión de pagos, precios y estados financieros de recolecciones
 * 
 * Estados de pago:
 * - pagada: Factura completamente pagada
 * - pendiente_pago: Sin pagar
 * - pago_parcial: Pagada parcialmente
 * - cobro_contra_entrega: Se cobrará al entregar
 */

import { db } from '../config/firebase.js';

// ========================================
// ACTUALIZAR FACTURACIÓN DE RECOLECCIÓN
// ========================================

export const actualizarFacturacion = async (req, res) => {
  try {
    const { id: recoleccionId } = req.params;
    const {
      items,           // Array de items con precios
      metodoPago,      // efectivo, transferencia, tarjeta
      estadoPago,      // pagada, pendiente_pago, pago_parcial, cobro_contra_entrega
      montoPagado,     // Monto pagado (para pagos parciales)
      notas
    } = req.body;

    console.log(`💰 Actualizando facturación de recolección ${recoleccionId}`);

    // Obtener recolección
    const recoleccionDoc = await db.collection('recolecciones').doc(recoleccionId).get();
    
    if (!recoleccionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recolección no encontrada'
      });
    }

    const recoleccionData = recoleccionDoc.data();

    // Calcular totales
    let subtotal = 0;
    const itemsConPrecios = items.map(item => {
      const precio = parseFloat(item.precio) || 0;
      const cantidad = parseInt(item.cantidad) || 1;
      const totalItem = precio * cantidad;
      
      subtotal += totalItem;
      
      return {
        ...item,
        precio,
        cantidad,
        total: totalItem
      };
    });

    const impuestos = subtotal * 0.18; // ITBIS 18% (RD)
    const total = subtotal + impuestos;

    // Calcular saldo pendiente
    let saldoPendiente = total;
    let montoPagadoActual = parseFloat(montoPagado) || 0;

    if (estadoPago === 'pagada') {
      montoPagadoActual = total;
      saldoPendiente = 0;
    } else if (estadoPago === 'pago_parcial') {
      saldoPendiente = total - montoPagadoActual;
    }

    // Preparar objeto de facturación
    const facturacion = {
      items: itemsConPrecios,
      subtotal: subtotal,
      impuestos: impuestos,
      total: total,
      estadoPago: estadoPago || 'pendiente_pago',
      metodoPago: metodoPago || null,
      montoPagado: montoPagadoActual,
      saldoPendiente: saldoPendiente,
      notas: notas || '',
      fechaUltimaActualizacion: new Date().toISOString(),
      actualizadoPor: req.userData.uid
    };

    // Actualizar en Firestore
    await db.collection('recolecciones').doc(recoleccionId).update({
      items: itemsConPrecios,
      facturacion: facturacion,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Facturación actualizada exitosamente');

    return res.json({
      success: true,
      message: 'Facturación actualizada exitosamente',
      data: {
        recoleccionId,
        facturacion
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando facturación:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// REGISTRAR PAGO
// ========================================

export const registrarPago = async (req, res) => {
  try {
    const { id: recoleccionId } = req.params;
    const {
      montoPago,
      metodoPago,
      referencia,
      notas
    } = req.body;

    console.log(`💵 Registrando pago para recolección ${recoleccionId}`);

    if (!montoPago || montoPago <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto del pago debe ser mayor a 0'
      });
    }

    // Obtener recolección
    const recoleccionDoc = await db.collection('recolecciones').doc(recoleccionId).get();
    
    if (!recoleccionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recolección no encontrada'
      });
    }

    const recoleccionData = recoleccionDoc.data();
    const facturacion = recoleccionData.facturacion || {};

    const total = facturacion.total || 0;
    const montoPagadoAnterior = facturacion.montoPagado || 0;
    const nuevoMontoPagado = montoPagadoAnterior + parseFloat(montoPago);
    const nuevoSaldoPendiente = total - nuevoMontoPagado;

    // Determinar nuevo estado
    let nuevoEstadoPago = 'pago_parcial';
    if (nuevoSaldoPendiente <= 0) {
      nuevoEstadoPago = 'pagada';
    } else if (nuevoMontoPagado === 0) {
      nuevoEstadoPago = 'pendiente_pago';
    }

    // Crear registro de pago
    const pago = {
      id: `pago_${Date.now()}`,
      monto: parseFloat(montoPago),
      metodoPago: metodoPago,
      referencia: referencia || '',
      notas: notas || '',
      fecha: new Date().toISOString(),
      registradoPor: req.userData.uid
    };

    // Actualizar facturación
    const historialPagos = facturacion.historialPagos || [];
    historialPagos.push(pago);

    const facturacionActualizada = {
      ...facturacion,
      montoPagado: nuevoMontoPagado,
      saldoPendiente: nuevoSaldoPendiente > 0 ? nuevoSaldoPendiente : 0,
      estadoPago: nuevoEstadoPago,
      ultimoPago: pago,
      historialPagos: historialPagos,
      fechaUltimaActualizacion: new Date().toISOString()
    };

    // Guardar en Firestore
    await db.collection('recolecciones').doc(recoleccionId).update({
      facturacion: facturacionActualizada,
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Pago registrado exitosamente');

    return res.json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: {
        recoleccionId,
        pago,
        estadoPago: nuevoEstadoPago,
        montoPagado: nuevoMontoPagado,
        saldoPendiente: nuevoSaldoPendiente > 0 ? nuevoSaldoPendiente : 0
      }
    });

  } catch (error) {
    console.error('❌ Error registrando pago:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// OBTENER FACTURAS PENDIENTES
// ========================================

export const getFacturasPendientes = async (req, res) => {
  try {
    const { contenedorId } = req.query;
    
    console.log('📋 Obteniendo facturas pendientes de pago');

    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;

    // Query base
    let query = db.collection('recolecciones')
      .where('companyId', '==', companyId);

    // Filtrar por contenedor si se especifica
    if (contenedorId) {
      query = query.where('contenedorId', '==', contenedorId);
    }

    const snapshot = await query.get();

    // Filtrar solo las que tienen saldo pendiente
    const facturasPendientes = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const facturacion = data.facturacion || {};
      
      // Solo incluir si tiene facturación y saldo pendiente > 0
      if (facturacion.saldoPendiente && facturacion.saldoPendiente > 0) {
        facturasPendientes.push({
          id: doc.id,
          ...data,
          facturacion
        });
      }
    });

    // Ordenar por monto pendiente (mayor a menor)
    facturasPendientes.sort((a, b) => {
      return b.facturacion.saldoPendiente - a.facturacion.saldoPendiente;
    });

    // Calcular totales
    const totalPendiente = facturasPendientes.reduce((sum, factura) => {
      return sum + (factura.facturacion.saldoPendiente || 0);
    }, 0);

    const totalPagado = facturasPendientes.reduce((sum, factura) => {
      return sum + (factura.facturacion.montoPagado || 0);
    }, 0);

    console.log(`✅ ${facturasPendientes.length} facturas pendientes encontradas`);

    return res.json({
      success: true,
      data: facturasPendientes,
      resumen: {
        totalFacturas: facturasPendientes.length,
        totalPendiente: totalPendiente,
        totalPagado: totalPagado
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo facturas pendientes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// OBTENER FACTURAS POR CONTENEDOR
// ========================================

export const getFacturasPorContenedor = async (req, res) => {
  try {
    const { contenedorId } = req.params;
    
    console.log(`📦 Obteniendo facturas del contenedor ${contenedorId}`);

    const snapshot = await db.collection('recolecciones')
      .where('contenedorId', '==', contenedorId)
      .get();

    const facturas = [];
    let totalGeneral = 0;
    let totalPagado = 0;
    let totalPendiente = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const facturacion = data.facturacion || {};
      
      facturas.push({
        id: doc.id,
        ...data,
        facturacion
      });

      totalGeneral += facturacion.total || 0;
      totalPagado += facturacion.montoPagado || 0;
      totalPendiente += facturacion.saldoPendiente || 0;
    });

    // Agrupar por estado de pago
    const porEstado = {
      pagadas: facturas.filter(f => f.facturacion?.estadoPago === 'pagada').length,
      pendientes: facturas.filter(f => f.facturacion?.estadoPago === 'pendiente_pago').length,
      parciales: facturas.filter(f => f.facturacion?.estadoPago === 'pago_parcial').length,
      contraEntrega: facturas.filter(f => f.facturacion?.estadoPago === 'cobro_contra_entrega').length
    };

    console.log('✅ Facturas del contenedor obtenidas');

    return res.json({
      success: true,
      data: facturas,
      resumen: {
        totalFacturas: facturas.length,
        totalGeneral: totalGeneral,
        totalPagado: totalPagado,
        totalPendiente: totalPendiente,
        porEstado: porEstado
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo facturas del contenedor:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
};

// ========================================
// EXPORTAR
// ========================================

export default {
  actualizarFacturacion,
  registrarPago,
  getFacturasPendientes,
  getFacturasPorContenedor
};