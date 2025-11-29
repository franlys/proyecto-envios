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
      message: 'Error al obtener las rutas asignadas',
      error: error.message
    });
  }
};

// ==========================================================================
// OBTENER DETALLE DE UNA RUTA
// ==========================================================================
export const getDetalleRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log('📍 Obteniendo detalle de ruta:', rutaId);

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    // Validar que la ruta pertenezca al repartidor
    if (data.repartidorId !== repartidorId) {
      success: false,
        message: 'Error al obtener el detalle de la ruta',
          error: error.message
    });
  }
};

// ==========================================================================
// INICIAR RUTA (CAMBIAR ESTADO A EN_RUTA)
// ==========================================================================
export const iniciarEntregas = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log('🚀 Iniciando ruta:', rutaId);

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

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se subieron archivos'
      });
    }

    console.log(`📸 Subiendo ${files.length} fotos para factura ${facturaId}`);

    // En un entorno real, aquí se subirían los archivos a Cloud Storage (Firebase Storage / S3)
    // y se obtendrían las URLs públicas.
    // Como estamos simulando, asumimos que multer guardó los archivos y generamos URLs locales o simuladas.

    // NOTA: Para producción, implementar subida real a Firebase Storage
    const fotoUrls = files.map(file => {
      // URL simulada o ruta relativa al servidor
      return `/uploads/evidencia/${file.filename}`;
    });

    const facturaRef = db.collection('recolecciones').doc(facturaId);

    await facturaRef.update({
      fotosEntrega: FieldValue.arrayUnion(...fotoUrls),
      fechaActualizacion: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Fotos subidas exitosamente',
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
    const montoTotal = data.facturacion?.total || 0;
    const montoPagadoNum = parseFloat(montoPagado);

    // Validar monto
    if (isNaN(montoPagadoNum) || montoPagadoNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Monto pagado inválido'
      });
    }

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

    const historialEntry = {
      accion: 'factura_entregada',
      descripcion: `Factura entregada por ${nombreRepartidor}`,
      nombreReceptor: nombreReceptor || '',
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      estado: 'entregada',
      estadoGeneral: 'entregada', // ✅ Sincronizar estadoGeneral
      estadoEntrega: 'completo',
      firmaCliente: firmaCliente || null,
      nombreReceptor: nombreReceptor || '',
      notasEntrega: notasEntrega || '',
      entregadoPor: repartidorId,
      entregadoPorNombre: nombreRepartidor,
      fechaEntrega: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    // Actualizar ruta si existe
    if (data.rutaId) {
      const rutaRef = db.collection('rutas').doc(data.rutaId);
      await db.runTransaction(async (transaction) => {
        const rDoc = await transaction.get(rutaRef);
        if (rDoc.exists) {
          const rData = rDoc.data();
          const facturas = [...(rData.facturas || [])];
          const idx = facturas.findIndex(f => (f.id === facturaId || f.facturaId === facturaId));

          if (idx !== -1) {
            facturas[idx].estado = 'entregada';
            const facturasEntregadas = (rData.facturasEntregadas || 0) + 1;

            transaction.update(rutaRef, {
              facturas,
              facturasEntregadas,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
    }

    console.log('✅ Factura marcada como entregada');

    // 📧 ENVIAR EMAIL AL REMITENTE CON FOTOS DE EVIDENCIA
    const remitenteEmail = data.remitente?.email || data.remitenteEmail;

    if (remitenteEmail) {
      console.log(`📧 Enviando notificación de entrega a: ${remitenteEmail}`);

      // Obtener configuración de la compañía
      let companyConfig = null;
      if (data.companyId) {
        try {
          const companyDoc = await db.collection('companies').doc(data.companyId).get();
          if (companyDoc.exists) {
            companyConfig = companyDoc.data();
          }
        } catch (error) {
          console.error('⚠️ Error obteniendo configuración de compañía:', error.message);
        }
      }

      const subject = `📦 ¡Paquete Entregado! - ${data.codigoTracking}`;
      const contentHTML = `
        <h2 style="color: #2c3e50; margin-top: 0;">¡Tu paquete ha sido entregado! 🎉</h2>
        <p>Hola <strong>${data.remitente?.nombre || 'Cliente'}</strong>,</p>
        <p>Nos complace informarte que tu envío ha sido entregado exitosamente.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Detalles de la Entrega</h3>
          <p><strong>Código:</strong> ${data.codigoTracking}</p>
          <p><strong>Recibido por:</strong> ${nombreReceptor || 'No especificado'}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-DO')}</p>
          ${notasEntrega ? `<p><strong>Notas:</strong> ${notasEntrega}</p>` : ''}
        </div>

        <p>Adjunto encontrarás las fotos de evidencia de la entrega.</p>
        <p>Gracias por confiar en nosotros.</p>
      `;

      const brandedHTML = generateBrandedEmailHTML(contentHTML, companyConfig, 'entregada', data.codigoTracking);

      // Enviar correo (sin adjuntos reales por ahora, las fotos están en el link de tracking)
      sendEmail(remitenteEmail, subject, brandedHTML, [], companyConfig)
        .then(() => console.log(`📧 Notificación de entrega enviada a ${remitenteEmail}`))
        .catch(err => console.error(`❌ Error enviando notificación de entrega:`, err.message));
    } else {
      console.warn('⚠️ No se encontró email del remitente para notificar entrega');
    }

    res.json({
      success: true,
      message: 'Factura entregada exitosamente',
      data: {
        facturaId,
        codigoTracking: data.codigoTracking,
        entregadoPor: nombreRepartidor,
        fechaEntrega: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error marcando factura entregada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar la factura como entregada',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const marcarFacturaEntregada = entregarFactura;

// ==========================================================================
// 🚫 REPORTAR FACTURA NO ENTREGADA
// ==========================================================================
export const reportarNoEntrega = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { motivo, descripcion, fotos, intentarNuevamente } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`⚠️ Reportando factura no entregada:`, facturaId);

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'El motivo es requerido'
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

    const reporteNoEntrega = {
      motivo, // 'cliente_ausente', 'direccion_incorrecta', 'cliente_rechazo', 'otro'
      descripcion: descripcion || '',
      fotos: fotos || [],
      reportadoPor: repartidorId,
      nombreReportador: nombreRepartidor,
      intentarNuevamente: intentarNuevamente !== false, // Por defecto true
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: 'factura_no_entregada',
      descripcion: `No entregada: ${motivo} - ${descripcion || ''}`,
      motivo,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    // Determinar nuevo estado
    // Si se intenta nuevamente, vuelve a 'confirmada_secretaria'
    const nuevoEstado = intentarNuevamente !== false ? 'confirmada_secretaria' : 'no_entregada';

    await facturaRef.update({
      estado: nuevoEstado,
      estadoGeneral: nuevoEstado, // ✅ Sincronizar estadoGeneral
      reporteNoEntrega,
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry),
      // Limpiar información de ruta para reasignación
      rutaId: null,
      repartidorId: null,
      repartidorNombre: null,
      ordenCarga: null,
      ordenEntrega: null,
      fechaAsignacionRuta: null
    });

    // Actualizar ruta si existe
    if (data.rutaId) {
      const rutaRef = db.collection('rutas').doc(data.rutaId);
      await db.runTransaction(async (transaction) => {
        const rDoc = await transaction.get(rutaRef);
        if (rDoc.exists) {
          const rData = rDoc.data();
          const facturas = [...(rData.facturas || [])];
          const idx = facturas.findIndex(f => (f.id === facturaId || f.facturaId === facturaId));

          if (idx !== -1) {
            facturas[idx].estado = 'no_entregada';
            facturas[idx].reporteNoEntrega = reporteNoEntrega;

            transaction.update(rutaRef, {
              facturas,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
    }

    console.log('✅ Factura reportada como no entregada');

    res.json({
      success: true,
      message: 'Factura reportada como no entregada',
      data: {
        facturaId,
        motivo,
        intentarNuevamente: intentarNuevamente !== false,
        nuevoEstado
      }
    });

  } catch (error) {
    console.error('❌ Error reportando no entrega:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reportar la no entrega',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const reportarFacturaNoEntregada = reportarNoEntrega;

// ==========================================================================
// 🏁 FINALIZAR RUTA COMPLETA
// ==========================================================================
export const finalizarRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { notas } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const companyId = userDoc.data()?.companyId;
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log('🏁 Finalizando ruta:', rutaId);

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    // Validar permisos
    if (data.companyId !== companyId || data.repartidorId !== repartidorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para finalizar esta ruta'
      });
    }

    // Calcular resumen final
    const facturas = data.facturas || [];
    const facturasEntregadas = facturas.filter(f => f.estado === 'entregada').length;
    const facturasNoEntregadas = facturas.filter(f => f.estado === 'no_entregada').length;
    const facturasPendientes = facturas.length - facturasEntregadas - facturasNoEntregadas;

    // Procesar facturas pendientes - marcarlas automáticamente como no_entregadas
    const batch = db.batch();
    const now = new Date().toISOString();

    if (facturasPendientes > 0) {
      console.log(`⚠️ Marcando ${facturasPendientes} factura(s) pendiente(s) como no entregadas automáticamente`);

      for (const facturaRuta of facturas) {
        if (facturaRuta.estado !== 'entregada' && facturaRuta.estado !== 'no_entregada') {
          const facturaId = facturaRuta.facturaId || facturaRuta.id;
          const recoleccionRef = db.collection('recolecciones').doc(facturaId);

          // Crear reporte de no entrega
          const reporteNoEntrega = {
            motivo: 'ruta_cerrada_sin_entregar',
            descripcion: 'Factura no entregada al cerrar la ruta',
            reportadoPor: repartidorId,
            nombreReportador: nombreRepartidor,
            intentarNuevamente: true,
            fecha: now
          };

          const historialFacturaEntry = {
            accion: 'factura_no_entregada',
            descripcion: 'Ruta cerrada sin entregar esta factura',
            motivo: 'ruta_cerrada_sin_entregar',
            usuarioId: repartidorId,
            nombreUsuario: nombreRepartidor,
            rol: 'repartidor',
            fecha: now
          };

          // Actualizar el documento de la recolección
          batch.update(recoleccionRef, {
            estado: 'no_entregada',
            estadoGeneral: 'no_entregada', // ✅ Sincronizar estadoGeneral
            reporteNoEntrega,
            rutaId: FieldValue.delete(),
            repartidorId: FieldValue.delete(),
            repartidorNombre: FieldValue.delete(),
            ordenCarga: FieldValue.delete(),
            ordenEntrega: FieldValue.delete(),
            fechaAsignacionRuta: FieldValue.delete(),
            historial: FieldValue.arrayUnion(historialFacturaEntry),
            fechaActualizacion: now
          });

          // Actualizar en el array de facturas de la ruta
          facturaRuta.estado = 'no_entregada';
          facturaRuta.reporteNoEntrega = reporteNoEntrega;
        }
      }
    }

    // Recalcular resumen después de procesar pendientes
    const facturasEntregadasFinal = facturas.filter(f => f.estado === 'entregada').length;
    const facturasNoEntregadasFinal = facturas.filter(f => f.estado === 'no_entregada').length;
    const facturasPendientesFinal = facturas.length - facturasEntregadasFinal - facturasNoEntregadasFinal;

    const historialEntry = {
      accion: 'finalizar_ruta',
      descripcion: `Ruta finalizada por ${nombreRepartidor}`,
      facturasEntregadas: facturasEntregadasFinal,
      facturasNoEntregadas: facturasNoEntregadasFinal,
      facturasPendientes: facturasPendientesFinal,
      facturasAutoMarcadas: facturasPendientes,
      notas: notas || '',
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: now
    };

    batch.update(rutaRef, {
      estado: 'completada',
      fechaFinalizacion: now,
      notasRepartidor: notas || '',
      facturas: facturas,
      resumenFinal: {
        entregadas: facturasEntregadasFinal,
        noEntregadas: facturasNoEntregadasFinal,
        pendientes: facturasPendientesFinal
      },
      resumenEntregas: {
        entregadas: facturasEntregadasFinal,
        noEntregadas: facturasNoEntregadasFinal,
        pendientes: facturasPendientesFinal
      },
      fechaActualizacion: now,
      updatedAt: now,
      historial: FieldValue.arrayUnion(historialEntry)
    });

    await batch.commit();

    console.log('✅ Ruta finalizada exitosamente');

    res.json({
      success: true,
      message: facturasPendientes > 0
        ? `Ruta finalizada. ${facturasPendientes} factura(s) pendiente(s) marcadas como no entregadas automáticamente.`
        : 'Ruta finalizada exitosamente',
      data: {
        rutaId,
        facturasEntregadas: facturasEntregadasFinal,
        facturasNoEntregadas: facturasNoEntregadasFinal,
        facturasPendientes: facturasPendientesFinal,
        facturasAutoMarcadas: facturasPendientes
      }
    });

  } catch (error) {
    console.error('❌ Error finalizando ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al finalizar la ruta',
      error: error.message
    });
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