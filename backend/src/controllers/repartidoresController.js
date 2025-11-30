// backend/src/controllers/repartidoresController.js
// ✅ VERSIÓN DEFINITIVA - GESTIÓN DE REPARTIDORES Y ENTREGAS
// Incluye sincronización de estadoGeneral y notificaciones de entrega

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, generateBrandedEmailHTML } from '../services/notificationService.js';

// ==========================================================================
// OBTENER RUTAS ASIGNADAS AL REPARTIDOR
// ==========================================================================
export const getRutasAsignadas = async (req, res) => {
  try {
    const repartidorId = req.user?.uid || req.userData?.uid;
    const companyId = req.userData?.companyId;

    if (!repartidorId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('🚚 Obteniendo rutas para repartidor:', repartidorId);

    // Buscar rutas activas asignadas a este repartidor
    const rutasRef = db.collection('rutas');
    const snapshot = await rutasRef
      .where('repartidorId', '==', repartidorId)
      .where('companyId', '==', companyId)
      .where('estado', 'in', ['asignada', 'en_ruta'])
      .orderBy('fechaCreacion', 'desc')
      .get();

    const rutas = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre,
        estado: data.estado,
        fechaAsignacion: data.fechaAsignacion?.toDate?.() || null,
        totalFacturas: data.facturas?.length || 0,
        facturasEntregadas: data.facturasEntregadas || 0,
        zona: data.zona || '',
        vehiculo: data.vehiculo || ''
      };
    });

    res.json({
      success: true,
      data: rutas
    });

  } catch (error) {
    console.error('❌ Error obteniendo rutas asignadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener rutas asignadas',
      error: error.message
    });
  }
};

// ==========================================================================
// OBTENER DETALLE DE RUTA
// ==========================================================================
export const getDetalleRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log(`🚚 Obteniendo detalle de ruta ${rutaId}`);

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    if (data.repartidorId !== repartidorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para ver esta ruta'
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...data,
        fechaAsignacion: data.fechaAsignacion?.toDate?.() || data.fechaAsignacion,
        fechaCreacion: data.fechaCreacion?.toDate?.() || data.fechaCreacion
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo detalle de ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener detalle de ruta',
      error: error.message
    });
  }
};

// ==========================================================================
// INICIAR ENTREGAS (CAMBIAR ESTADO A EN_RUTA)
// ==========================================================================
export const iniciarEntregas = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log(`🚀 Iniciando entregas para ruta ${rutaId}`);

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    if (data.repartidorId !== repartidorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para iniciar esta ruta'
      });
    }

    if (data.estado !== 'asignada') {
      return res.status(400).json({
        success: false,
        message: `La ruta no está en estado 'asignada'. Estado actual: ${data.estado}`
      });
    }

    const batch = db.batch();
    const now = new Date().toISOString();

    // Actualizar estado de la ruta
    batch.update(rutaRef, {
      estado: 'en_ruta',
      fechaInicio: now,
      fechaActualizacion: now
    });

    // Actualizar estado de todas las facturas en la ruta
    if (data.facturas && data.facturas.length > 0) {
      for (const factura of data.facturas) {
        const facturaId = factura.id || factura.facturaId;
        const facturaRef = db.collection('recolecciones').doc(facturaId);

        batch.update(facturaRef, {
          estado: 'en_ruta',
          estadoGeneral: 'en_ruta', // ✅ Sincronizar estadoGeneral
          fechaActualizacion: now
        });
      }
    }

    await batch.commit();

    console.log('✅ Ruta iniciada exitosamente');

    res.json({
      success: true,
      message: 'Ruta iniciada exitosamente',
      data: {
        rutaId,
        estado: 'en_ruta',
        fechaInicio: now
      }
    });

  } catch (error) {
    console.error('❌ Error iniciando ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar la ruta',
      error: error.message
    });
  }
};

// ==========================================================================
// ENTREGAR ITEM INDIVIDUAL
// ==========================================================================
export const entregarItem = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log(`📦 Entregando item ${itemIndex} de factura ${facturaId}`);

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();
    const items = [...(data.items || [])];

    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    // Marcar item como entregado
    items[itemIndex].entregado = true;
    items[itemIndex].fechaEntrega = new Date().toISOString();

    await facturaRef.update({
      items,
      fechaActualizacion: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Item marcado como entregado',
      data: items[itemIndex]
    });

  } catch (error) {
    console.error('❌ Error entregando item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al entregar el item',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const confirmarItemEntregado = entregarItem;

// ==========================================================================
// SUBIR FOTOS DE EVIDENCIA
// ==========================================================================
export const subirFotos = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const files = req.files; // Array de archivos subidos por multer
    const { fotos } = req.body; // URLs enviadas por el frontend

    let fotoUrls = [];

    // CASO 1: URLs enviadas por el frontend (Firebase)
    if (fotos && Array.isArray(fotos) && fotos.length > 0) {
      fotoUrls = fotos;
      console.log(`📸 Recibidas ${fotoUrls.length} URLs de fotos para factura ${facturaId}`);
    }
    // CASO 2: Archivos subidos directamente (Multer)
    else if (files && files.length > 0) {
      console.log(`📸 Subiendo ${files.length} archivos para factura ${facturaId}`);
      fotoUrls = files.map(file => `/uploads/evidencia/${file.filename}`);
    }
    // ERROR: No hay fotos
    else {
      return res.status(400).json({
        success: false,
        message: 'No se subieron archivos ni se enviaron URLs'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId);

    await facturaRef.update({
      fotosEntrega: FieldValue.arrayUnion(...fotoUrls),
      fechaActualizacion: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Fotos guardadas exitosamente',
      data: fotoUrls
    });

  } catch (error) {
    console.error('❌ Error subiendo fotos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir las fotos',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const subirFotosEvidencia = subirFotos;

// ==========================================================================
// CONFIRMAR PAGO (CONTRAENTREGA)
// ==========================================================================
export const confirmarPago = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { montoPagado, metodoPago, referenciaPago } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`💰 Confirmando pago para factura ${facturaId}: ${montoPagado}`);

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();
    const montoTotal = data.pago?.total || 0;
    const montoPagadoNum = parseFloat(montoPagado);

    const montoPendiente = Math.max(0, montoTotal - montoPagadoNum);
    const estadoPago = montoPendiente === 0 ? 'pagada' : 'parcial';

    const historialPago = {
      monto: montoPagadoNum,
      metodoPago: metodoPago || 'efectivo',
      referencia: referenciaPago || '',
      fecha: new Date().toISOString(),
      cobradoPor: repartidorId,
      nombreCobrador: nombreRepartidor
    };

    const historialEntry = {
      accion: 'pago_contraentrega',
      descripcion: `Pago recibido por ${nombreRepartidor}: ${montoPagadoNum}`,
      monto: montoPagadoNum,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      'pago.estado': estadoPago,
      'pago.montoPagado': montoPagadoNum,
      'pago.montoPendiente': montoPendiente,
      'pago.metodoPago': metodoPago || 'efectivo',
      'pago.referenciaPago': referenciaPago || '',
      'pago.fechaPago': new Date().toISOString(),
      'pago.historialPagos': FieldValue.arrayUnion(historialPago),
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log('✅ Pago contraentrega confirmado');

    res.json({
      success: true,
      message: 'Pago contraentrega confirmado exitosamente',
      data: {
        facturaId,
        montoPagado: montoPagadoNum,
        montoPendiente,
        estadoPago
      }
    });

  } catch (error) {
    console.error('❌ Error confirmando pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar el pago',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const confirmarPagoContraentrega = confirmarPago;

// ==========================================================================
// ⚠️ REPORTAR ITEM DAÑADO DURANTE ENTREGA
// ==========================================================================
export const reportarDano = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex, descripcionDano, fotos } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`⚠️ Reportando item dañado: factura ${facturaId}, item ${itemIndex}`);

    if (itemIndex === undefined || itemIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item requerido'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();
    const items = [...(data.items || [])];

    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    // Remover item del array y agregarlo a items dañados
    const [itemReportado] = items.splice(itemIndex, 1);

    const reporteDano = {
      item: itemReportado,
      descripcionDano: descripcionDano || '',
      fotos: fotos || [],
      reportadoPor: repartidorId,
      nombreReportador: nombreRepartidor,
      rolReportador: 'repartidor',
      momentoReporte: 'entrega',
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: 'item_danado_entrega',
      descripcion: `Item dañado reportado: ${itemReportado.descripcion}`,
      itemIndex,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      items,
      itemsDanados: FieldValue.arrayUnion(reporteDano),
      historial: FieldValue.arrayUnion(historialEntry),
      fechaActualizacion: new Date().toISOString()
    });

    console.log('✅ Item dañado reportado y movido');

    res.json({
      success: true,
      message: 'Item dañado reportado exitosamente',
      data: reporteDano
    });

  } catch (error) {
    console.error('❌ Error reportando item dañado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reportar el item dañado',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const reportarItemDanado = reportarDano;

// ==========================================================================
// ✅ MARCAR FACTURA COMO ENTREGADA
// ==========================================================================
export const entregarFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { firmaCliente, nombreReceptor, notasEntrega } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`✅ Marcando factura como entregada:`, facturaId);

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    // Validar que todos los items estén entregados
    const itemsTotal = data.items?.length || 0;
    const itemsEntregados = (data.items || []).filter(i => i.entregado).length;

    if (itemsEntregados < itemsTotal) {
      return res.status(400).json({
        success: false,
        message: 'No se han confirmado todos los items',
        itemsEntregados,
        itemsTotal
      });
    }

    // Validar fotos de evidencia
    const fotosEntrega = data.fotosEntrega || [];
    if (fotosEntrega.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos una foto de evidencia'
      });
    }

    await facturaRef.update({
      estado: 'entregada',
      estadoGeneral: 'entregada',
      fechaEntrega: new Date().toISOString(),
      firmaCliente: firmaCliente || '',
      nombreReceptor: nombreReceptor || '',
      notasEntrega: notasEntrega || '',
      fechaActualizacion: new Date().toISOString()
    });

    // Enviar correo de confirmación
    try {
      const remitenteEmail = data.remitente?.email || data.cliente?.email;
      if (remitenteEmail) {
        const html = generateBrandedEmailHTML(
          'Entrega Exitosa',
          `Su envío ${data.numeroFactura || facturaId} ha sido entregado a ${nombreReceptor || 'Destinatario'}.`,
          [
            { label: 'Recibido por', value: nombreReceptor || 'N/A' },
            { label: 'Fecha', value: new Date().toLocaleString() }
          ]
        );
        await sendEmail(remitenteEmail, 'Entrega Confirmada - ProLogix', html);
      }
    } catch (emailError) {
      console.warn('⚠️ Error enviando correo de confirmación:', emailError);
    }

    res.json({
      success: true,
      message: 'Factura marcada como entregada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error entregando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error al entregar la factura',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const marcarFacturaEntregada = entregarFactura;

// ==========================================================================
// REPORTAR FACTURA COMO NO ENTREGADA
// ==========================================================================
export const reportarNoEntrega = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { motivo, descripcion, fotos, intentarNuevamente } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log(`🚫 Reportando NO entrega para factura ${facturaId}`);

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    await facturaRef.update({
      estado: 'no_entregada',
      estadoGeneral: 'no_entregada',
      motivoNoEntrega: motivo,
      descripcionNoEntrega: descripcion,
      fotosNoEntrega: fotos || [],
      intentarNuevamente: intentarNuevamente || false,
      fechaNoEntrega: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Reporte de no entrega registrado'
    });

  } catch (error) {
    console.error('❌ Error reportando no entrega:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reportar no entrega',
      error: error.message
    });
  }
};

export const reportarFacturaNoEntregada = reportarNoEntrega;

export const finalizarRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { notas } = req.body;

    const rutaRef = db.collection('rutas').doc(rutaId);
    await rutaRef.update({
      estado: 'finalizada',
      fechaFin: new Date().toISOString(),
      notasFinalizacion: notas || ''
    });

    res.json({ success: true, message: 'Ruta finalizada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================================================
// EXPORTACIÓN DE TODAS LAS FUNCIONES
// ==========================================================================
export default {
  getRutasAsignadas,
  getDetalleRuta,
  iniciarEntregas,
  entregarItem,
  confirmarItemEntregado,
  subirFotos,
  subirFotosEvidencia,
  confirmarPago,
  confirmarPagoContraentrega,
  reportarDano,
  reportarItemDanado,
  entregarFactura,
  marcarFacturaEntregada,
  reportarNoEntrega,
  reportarFacturaNoEntregada,
  finalizarRuta
};