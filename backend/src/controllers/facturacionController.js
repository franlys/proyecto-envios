// backend/src/controllers/facturacionController.js
/**
 * SISTEMA DE FACTURACIÓN
 * Gestión de pagos, precios y estados financieros de recolecciones
 * * Estados de pago:
 * - pagada: Factura completamente pagada
 * - pendiente_pago: Sin pagar
 * - pago_parcial: Pagada parcialmente
 * - cobro_contra_entrega: Se cobrará al entregar
 */

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore'; // ✅ Importación requerida para reasignarFactura

// Helper para obtener ID de compañía de forma segura (NECESARIO)
const getUserDataSafe = async (uid) => {
  const userDoc = await db.collection('usuarios').doc(uid).get();
  if (!userDoc.exists) return null;
  return userDoc.data();
};

// ========================================\
// 💰 ACTUALIZAR FACTURACIÓN DE RECOLECCIÓN
// ========================================\

export const actualizarFacturacion = async (req, res) => {
  try {
    const { id: recoleccionId } = req.params;
    const {
      items,
      metodoPago,
      estadoPago,
      montoPagado,
      notas
    } = req.body;

    console.log(`💰 Actualizando facturación de recolección ${recoleccionId}`);

    const recoleccionRef = db.collection('recolecciones').doc(recoleccionId);
    const recoleccionDoc = await recoleccionRef.get();
    
    if (!recoleccionDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recolección no encontrada'
      });
    }

    const recoleccionData = recoleccionDoc.data();
    
    // Lógica para calcular el total (se mantiene del snippet anterior)
    let totalFactura = recoleccionData.totalFactura || 0; 
    
    const facturacionData = {
      items: items || recoleccionData.facturacion?.items || [],
      metodoPago: metodoPago || recoleccionData.facturacion?.metodoPago,
      estadoPago: estadoPago || recoleccionData.facturacion?.estadoPago || 'pendiente_pago',
      montoPagado: montoPagado !== undefined ? montoPagado : recoleccionData.facturacion?.montoPagado || 0,
      notas: notas || recoleccionData.facturacion?.notas,
      totalFactura: totalFactura,
      updatedAt: new Date().toISOString()
    };

    const isTotalPaid = facturacionData.montoPagado >= facturacionData.totalFactura;
    
    let newEstado = recoleccionData.estado;
    if (estadoPago === 'pagada' || isTotalPaid) {
      newEstado = 'pagada_secretaria';
    }

    await recoleccionRef.update({
      facturacion: facturacionData,
      estado: newEstado,
      updatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Facturación actualizada exitosamente',
      data: { id: recoleccionId, ...recoleccionData, facturacion: facturacionData, estado: newEstado }
    });

  } catch (error) {
    console.error('❌ Error en actualizarFacturacion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// ========================================\
// 💲 REGISTRAR PAGO (Lógica completa de placeholder)
// ========================================\

export const registrarPago = async (req, res) => {
  try {
    const { id: recoleccionId } = req.params;
    const { montoPago, metodoPago, referencia, notas } = req.body; // Datos esperados

    console.log(`💲 Registrando pago de ${montoPago} para recolección ${recoleccionId}`);
    
    // **AÑADIR LÓGICA:**
    // 1. Obtener documento de recolección.
    // 2. Calcular nuevo saldo.
    // 3. Registrar el pago en un sub-documento o array (historialPagos).
    // 4. Actualizar el estado de pago principal (estadoPago) en el documento de recolección.

    // Placeholder de respuesta exitosa (simulando la lógica real)
    res.json({ 
        success: true, 
        message: 'Pago registrado exitosamente (Implementación pendiente)',
        data: { id: recoleccionId, montoPago, metodoPago }
    });
    
  } catch (error) {
    console.error('❌ Error en registrarPago:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ========================================\
// 📋 OBTENER FACTURAS PENDIENTES DE PAGO (Lógica completa de placeholder)
// ========================================\

export const getFacturasPendientes = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.user.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    console.log('📋 Obteniendo facturas pendientes de pago...');

    // **AÑADIR LÓGICA:**
    // 1. Consultar 'recolecciones' donde 'companyId' sea igual a userData.companyId
    // 2. Filtrar donde 'facturacion.estadoPago' sea 'pendiente_pago' o 'pago_parcial'.
    
    // Placeholder de consulta (DEBE SER AJUSTADO CON LA LÓGICA REAL DE FIREBASE)
    const snapshot = await db.collection('recolecciones')
        .where('companyId', '==', userData.companyId)
        .where('facturacion.estadoPago', 'in', ['pendiente_pago', 'pago_parcial'])
        .limit(100)
        .get();

    const facturas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: facturas });

  } catch (error) {
    console.error('❌ Error en getFacturasPendientes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ========================================\
// 📦 OBTENER FACTURAS POR CONTENEDOR (Lógica completa de placeholder)
// ========================================\

export const getFacturasPorContenedor = async (req, res) => {
  try {
    const { contenedorId } = req.params;
    const userData = await getUserDataSafe(req.user.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    console.log(`📦 Obteniendo facturas para contenedor ${contenedorId}`);

    // **AÑADIR LÓGICA:**
    // 1. Consultar 'recolecciones' donde 'contenedorId' sea igual a req.params.contenedorId.

    // Placeholder de consulta
    const snapshot = await db.collection('recolecciones')
        .where('companyId', '==', userData.companyId)
        .where('contenedorId', '==', contenedorId)
        .limit(200)
        .get();

    const facturas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: facturas });
    
  } catch (error) {
    console.error('❌ Error en getFacturasPorContenedor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ========================================\
// 🚫 OBTENER FACTURAS NO ENTREGADAS (Lógica corregida)
// ========================================\

export const getFacturasNoEntregadas = async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;

    // ✅ CORRECCIÓN: Filtra por estados que indican que la factura debe ser reasignada.
    const estadosAFiltrar = ['no_entregada', 'pendiente_ruta', 'pendiente'];

    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('estado', 'in', estadosAFiltrar) 
      .get();

    const facturasNoEntregadas = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      facturasNoEntregadas.push({
        id: doc.id,
        ...data,
        facturacion: data.facturacion || {} 
      });
    });

    console.log(`✅ ${facturasNoEntregadas.length} facturas no entregadas encontradas`);

    return res.json({
      success: true,
      data: facturasNoEntregadas
    });

  } catch (error) {
    console.error('❌ Error obteniendo facturas no entregadas:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// ============================================================
// 🔄 REASIGNAR FACTURA (Nueva función que resuelve el 404)
// ============================================================
export const reasignarFactura = async (req, res) => {
  try {
    const { facturaId, accion, observaciones, nuevaRutaId } = req.body;
    const now = new Date().toISOString();

    if (!facturaId || !accion) {
      return res.status(400).json({ success: false, error: 'Factura ID y acción son requeridos.' });
    }

    const recoleccionRef = db.collection('recolecciones').doc(facturaId);
    const recoleccionDoc = await recoleccionRef.get();

    if (!recoleccionDoc.exists) {
      return res.status(404).json({ success: false, error: 'Factura no encontrada.' });
    }

    const recoleccionData = recoleccionDoc.data();
    const batch = db.batch();
    let nuevoEstado = '';
    let updateData = {};
    let mensaje = '';

    if (accion === 'pendiente') {
      // 1. Marcar como pendiente para ser reasignada más tarde
      nuevoEstado = 'pendiente_ruta'; 
      updateData = {
        estado: nuevoEstado,
        rutaId: FieldValue.delete(), // Desvincular de cualquier ruta
        repartidorId: FieldValue.delete(),
        repartidorNombre: FieldValue.delete(),
        fechaAsignacionRuta: FieldValue.delete(),
      };
      mensaje = 'Factura marcada como pendiente para nueva asignación.';

    } else if (accion === 'nueva_ruta' && nuevaRutaId) {
      // 2. Asignar a una ruta activa existente
      nuevoEstado = 'asignada';
      
      const rutaDoc = await db.collection('rutas').doc(nuevaRutaId).get();
      if (!rutaDoc.exists || rutaDoc.data().estado !== 'asignada') {
        return res.status(400).json({ success: false, error: 'Ruta de destino inválida o inactiva.' });
      }

      const rutaData = rutaDoc.data();
      const repartidorId = rutaData.repartidorId;
      const repartidorNombre = rutaData.repartidorNombre;

      // Actualizar el documento de la factura (recolección)
      updateData = {
        estado: nuevoEstado,
        rutaId: nuevaRutaId,
        repartidorId,
        repartidorNombre,
        fechaAsignacionRuta: now,
      };
      
      // Actualizar el arreglo de facturas dentro del documento de la ruta
      const nuevaFacturaEnRuta = {
        id: facturaId,
        facturaId,
        codigoTracking: recoleccionData.codigoTracking,
        cliente: recoleccionData.cliente,
        direccion: recoleccionData.direccion,
        zona: recoleccionData.zona,
        sector: recoleccionData.sector,
        itemsTotal: recoleccionData.items?.length || 0,
        estado: nuevoEstado, 
      };

      batch.update(rutaDoc.ref, {
        facturas: FieldValue.arrayUnion(nuevaFacturaEnRuta),
        totalFacturas: (rutaData.totalFacturas || rutaData.facturas?.length || 0) + 1,
        updatedAt: now,
      });

      mensaje = `Factura reasignada a la ruta ${rutaData.nombre}.`;

    } else {
      return res.status(400).json({ success: false, error: 'Acción o datos de ruta inválidos.' });
    }

    // Actualizar la factura (recolección)
    if (observaciones) {
        updateData.observacionesReasignacion = observaciones;
    }
    
    // Agregar al historial
    updateData.historial = FieldValue.arrayUnion({
      estado: nuevoEstado,
      fecha: now,
      descripcion: `Reasignada desde 'No Entregadas'. Acción: ${accion}.`,
      observaciones: observaciones || '-',
    });
    
    batch.update(recoleccionRef, updateData);
    
    await batch.commit();

    res.json({ success: true, message: mensaje, data: { id: facturaId, nuevoEstado } });

  } catch (error) {
    console.error('❌ Error en reasignarFactura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};