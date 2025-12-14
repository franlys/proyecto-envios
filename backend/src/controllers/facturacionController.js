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

import { db, storage } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore'; // ✅ Importación requerida para reasignarFactura
import { sendInvoiceStatusUpdate, sendEmail, sendWhatsApp } from '../services/notificationService.js';
import { getNextNCF } from '../utils/ncfUtils.js';

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
      notas,
      ncfSolicitado, // 'B01', 'B02', 'B14', 'B15' o null
      ncfTipo // Alternativo
    } = req.body;

    const ncfRequested = ncfSolicitado || ncfTipo;

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

    // ✅ VALIDACIÓN: Prevenir cambios si ya está pagada
    const estadoActual = recoleccionData.facturacion?.estadoPago || recoleccionData.estadoPago;
    if (estadoActual === 'pagada' && estadoPago && estadoPago !== 'pagada') {
      console.log(`⚠️ Intento de cambiar estado de factura pagada bloqueado: ${recoleccionId}`);
      return res.status(400).json({
        success: false,
        error: 'No se puede cambiar el estado de pago de una factura que ya está pagada'
      });
    }

    // ======================================================================
    // 🏦 GENERACIÓN AUTOMÁTICA DE NCF (Si se solicita y no tiene)
    // ======================================================================
    let ncfAsignado = recoleccionData.facturacion?.ncf || null;
    let ncfTipoAsignado = recoleccionData.facturacion?.ncfTipo || null;

    if (ncfRequested && !ncfAsignado && recoleccionData.companyId) {
      try {
        console.log(`🏦 Solicitando NCF automático tipo ${ncfRequested} en actualización`);
        ncfAsignado = await getNextNCF(recoleccionData.companyId, ncfRequested);
        ncfTipoAsignado = ncfRequested;
      } catch (ncfError) {
        console.error('❌ Error generando NCF en update:', ncfError);
        return res.status(400).json({
          success: false,
          message: 'Error generando NCF en actualización.',
          details: ncfError.message
        });
      }
    }

    // Lógica para calcular el total (se mantiene del snippet anterior)
    let totalFactura = recoleccionData.totalFactura || 0;

    const facturacionData = {
      items: items || recoleccionData.facturacion?.items || [],
      metodoPago: metodoPago || recoleccionData.facturacion?.metodoPago,
      estadoPago: estadoPago || recoleccionData.facturacion?.estadoPago || 'pendiente_pago',
      montoPagado: montoPagado !== undefined ? montoPagado : recoleccionData.facturacion?.montoPagado || 0,
      notas: notas || recoleccionData.facturacion?.notas,
      totalFactura: totalFactura,
      updatedAt: new Date().toISOString(),
      ncf: ncfAsignado, // ✅ Preservar o asignar nuevo
      ncfTipo: ncfTipoAsignado
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

    // 🔔 NOTIFICACIONES AUTOMÁTICAS
    // Si el estado de pago cambió, notificar al cliente
    if (estadoPago && estadoPago !== recoleccionData.facturacion?.estadoPago) {
      const clientData = {
        email: recoleccionData.destinatario?.email || recoleccionData.email,
        telefono: recoleccionData.destinatario?.telefono || recoleccionData.telefono,
        nombre: recoleccionData.destinatario?.nombre || recoleccionData.cliente || 'Cliente'
      };

      const invoiceData = {
        id: recoleccionId,
        estado: estadoPago,
        total: facturacionData.totalFactura,
        link: facturacionData.archivoUrl || null
      };

      // Obtener configuración de la compañía
      const companyId = recoleccionData.companyId;
      let companyConfig = null;
      if (companyId) {
        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (companyDoc.exists) {
          companyConfig = companyDoc.data();
        }
      }

      // Ejecutar en segundo plano para no bloquear la respuesta
      sendInvoiceStatusUpdate(clientData, invoiceData, companyConfig)
        .then(res => console.log(`🔔 Notificación enviada para ${recoleccionId}:`, res))
        .catch(err => console.error(`❌ Error enviando notificación para ${recoleccionId}:`, err));
    }

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
    const userData = await getUserDataSafe(req.userData.uid);
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
    const userData = await getUserDataSafe(req.userData.uid);
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
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;

    console.log('🔍 Buscando facturas no entregadas para companyId:', companyId);

    // Obtener TODAS las recolecciones de la compañía y filtrar en memoria
    // Esto es necesario porque necesitamos facturas que:
    // 1. Tengan estado 'no_entregada'
    // 2. Tengan un reporteNoEntrega (independientemente del estado)
    // 3. No estén entregadas ni completadas
    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .get();

    const facturasNoEntregadas = [];

    snapshot.forEach(doc => {
      const data = doc.data();

      // Filtrar: debe tener reporte de no entrega O estar en estado no_entregada
      // Y NO debe estar en estado entregada o completada
      const tieneReporteNoEntrega = !!data.reporteNoEntrega;
      const esNoEntregada = data.estado === 'no_entregada';
      const noEstaEntregada = data.estado !== 'entregada' && data.estado !== 'completada';

      // Debug: log facturas candidatas
      if (esNoEntregada) {
        console.log(`   📦 Candidata ${doc.id}: estado="${data.estado}", reporte=${tieneReporteNoEntrega}, rutaId="${data.rutaId || 'ninguna'}", tracking="${data.codigoTracking || 'sin codigo'}"`);
      }

      if ((tieneReporteNoEntrega || esNoEntregada) && noEstaEntregada) {
        // Mapear campos para el frontend
        facturasNoEntregadas.push({
          id: doc.id,
          numeroFactura: data.codigoTracking || data.numeroFactura || doc.id,
          cliente: data.destinatario?.nombre || data.cliente || 'Sin nombre',
          direccion: data.destinatario?.direccion || data.direccion || 'Sin dirección',
          sector: data.destinatario?.sector || data.sector || '-',
          rutaId: data.rutaId || null,
          rutaNombre: data.rutaNombre || (data.rutaId ? `Ruta ${data.rutaId.substring(0, 8)}` : 'Sin asignar'),
          motivoNoEntrega: data.reporteNoEntrega?.motivo || data.motivoNoEntrega || 'Sin motivo especificado',
          fechaIntento: data.reporteNoEntrega?.fecha || data.fechaIntento || data.fechaActualizacion || null,
          estado: data.estado,
          // Incluir datos completos para el modal de reasignación
          destinatario: data.destinatario || {},
          items: data.items || [],
          facturacion: data.facturacion || {},
          reporteNoEntrega: data.reporteNoEntrega || null
        });
      }
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
// 🔍 DEBUG: VER TODOS LOS ESTADOS DE FACTURAS
// ============================================================
export const debugEstadosFacturas = async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const companyId = userDoc.data()?.companyId;

    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .limit(50)
      .get();

    const facturas = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      facturas.push({
        id: doc.id,
        codigoTracking: data.codigoTracking || 'sin codigo',
        estado: data.estado,
        rutaId: data.rutaId || null,
        tieneReporteNoEntrega: !!data.reporteNoEntrega,
        cliente: data.destinatario?.nombre || data.cliente || 'sin nombre'
      });
    });

    console.log(`📊 DEBUG: ${facturas.length} facturas encontradas`);
    facturas.forEach(f => {
      console.log(`   - ${f.id}: estado="${f.estado}", ruta=${f.rutaId || 'ninguna'}, reporte=${f.tieneReporteNoEntrega}`);
    });

    return res.json({ success: true, data: facturas });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 🔧 REPARAR FACTURAS HUÉRFANAS (Temporal)
// ============================================================
export const repararFacturasHuerfanas = async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.userData.uid).get();
    const companyId = userDoc.data()?.companyId;

    console.log('🔧 Reparando facturas huérfanas...');

    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .get();

    const facturasReparadas = [];
    const batch = db.batch();
    const now = new Date().toISOString();

    snapshot.forEach(doc => {
      const data = doc.data();

      // Buscar facturas sin rutaId que no estén en estados finales
      const sinRuta = !data.rutaId;
      const noEstaEntregada = data.estado !== 'entregada' && data.estado !== 'completada';
      const noTieneEstadoClaro = !data.estado || data.estado === '' || data.estado === 'pendiente';

      if (sinRuta && (noEstaEntregada || noTieneEstadoClaro)) {
        const reporteNoEntrega = {
          motivo: 'factura_huerfana_reparada',
          descripcion: 'Factura huérfana detectada y marcada para reasignación',
          reportadoPor: req.user?.uid || 'sistema',
          nombreReportador: 'Sistema - Reparación',
          intentarNuevamente: true,
          fecha: now
        };

        batch.update(doc.ref, {
          estado: 'no_entregada',
          reporteNoEntrega,
          fechaActualizacion: now,
          historial: FieldValue.arrayUnion({
            accion: 'reparacion_factura_huerfana',
            descripcion: 'Factura marcada como no entregada por reparación del sistema',
            fecha: now
          })
        });

        facturasReparadas.push({
          id: doc.id,
          codigoTracking: data.codigoTracking,
          estadoAnterior: data.estado || 'sin estado'
        });
      }
    });

    if (facturasReparadas.length > 0) {
      await batch.commit();
      console.log(`✅ ${facturasReparadas.length} facturas reparadas`);
    } else {
      console.log('✅ No se encontraron facturas que reparar');
    }

    return res.json({
      success: true,
      message: `${facturasReparadas.length} facturas reparadas`,
      data: facturasReparadas
    });
  } catch (error) {
    console.error('❌ Error reparando facturas:', error);
    return res.status(500).json({ success: false, error: error.message });
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
        reporteNoEntrega: FieldValue.delete(), // ✅ Eliminar el reporte para que no aparezca más en "No Entregadas"
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
        reporteNoEntrega: FieldValue.delete(), // ✅ Eliminar el reporte para que no aparezca más en "No Entregadas"
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

// ========================================\
// 📤 SUBIR FACTURA (PDF/IMAGEN)
// ========================================\
export const subirFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No se ha subido ningún archivo.' });
    }

    console.log(`📤 Subiendo factura para ${id}: ${file.originalname}`);

    const bucket = storage.bucket();
    // Nombre único: facturas/ID_TIMESTAMP_NOMBRE
    const filename = `facturas/${id}_${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(filename);

    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    blobStream.on('error', (error) => {
      console.error('❌ Error subiendo archivo a Storage:', error);
      res.status(500).json({ success: false, error: error.message });
    });

    blobStream.on('finish', async () => {
      // Hacer el archivo público (o usar URLs firmadas, pero público es más fácil para acceso directo)
      await fileUpload.makePublic();
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      // Actualizar Firestore con la URL
      await db.collection('recolecciones').doc(id).update({
        'facturacion.archivoUrl': publicUrl,
        'facturacion.archivoNombre': file.originalname,
        updatedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Factura subida exitosamente',
        url: publicUrl
      });
    });

    blobStream.end(file.buffer);

  } catch (error) {
    console.error('❌ Error en subirFactura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ========================================\
// 📨 ENVIAR FACTURA MANUALMENTE
// ========================================\
export const enviarFactura = async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo, email, telefono } = req.body; // metodo: 'email', 'whatsapp', 'ambos'

    console.log(`📨 Enviando factura ${id} por ${metodo}`);

    const doc = await db.collection('recolecciones').doc(id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Factura no encontrada' });

    const data = doc.data();
    const facturaUrl = data.facturacion?.archivoUrl;

    if (!facturaUrl) {
      return res.status(400).json({ success: false, error: 'No hay factura adjunta para enviar. Por favor sube una primero.' });
    }

    // Priorizar datos del body, luego del documento
    const clientData = {
      email: email || data.destinatario?.email || data.email,
      telefono: telefono || data.destinatario?.telefono || data.telefono,
      nombre: data.destinatario?.nombre || data.cliente || 'Cliente'
    };

    const subject = `Tu Factura #${data.codigoTracking || id}`;
    const contentHtml = `
      <h2 style="color: #1976D2; margin-top: 0;">Tu Factura está lista</h2>
      <p>Hola <strong>${clientData.nombre}</strong>,</p>
      <p>Adjunto encontrarás tu factura correspondiente al envío <strong>#${data.codigoTracking || id}</strong>.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${facturaUrl}" style="background-color: #1976D2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Descargar Factura</a>
      </div>

      <p>Gracias por tu preferencia.</p>
    `;

    // Obtener configuración de la compañía
    const companyId = data.companyId;
    let companyConfig = null;
    if (companyId) {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        companyConfig = companyDoc.data();
      }
    }

    const { generateBrandedEmailHTML } = await import('../services/notificationService.js');
    const brandedHtml = generateBrandedEmailHTML(contentHtml, companyConfig, 'pagada');

    const results = { email: null, whatsapp: null };

    if (metodo === 'email' || metodo === 'ambos') {
      if (clientData.email) {
        results.email = await sendEmail(clientData.email, subject, brandedHtml, [], companyConfig);
      } else {
        results.email = { success: false, error: 'No hay email registrado' };
      }
    }

    if (metodo === 'whatsapp' || metodo === 'ambos') {
      if (clientData.telefono) {
        const waMessage = `Hola ${clientData.nombre}, aquí tienes tu factura del envío #${data.codigoTracking || id}: ${facturaUrl}`;
        results.whatsapp = await sendWhatsApp(clientData.telefono, waMessage, facturaUrl);
      } else {
        results.whatsapp = { success: false, error: 'No hay teléfono registrado' };
      }
    }

    res.json({ success: true, message: 'Proceso de envío completado', results });

  } catch (error) {
    console.error('❌ Error en enviarFactura:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};