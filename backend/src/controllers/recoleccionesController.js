// backend/src/controllers/recoleccionesController.js
// ✅ VERSIÓN COMPLETA - TODAS LAS FUNCIONES (800+ líneas)

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import multer from 'multer';
import path from 'path';
import { sendEmail, generateTrackingButtonHTML, generateBrandedEmailHTML } from '../services/notificationService.js';
import { generateInvoicePDF } from '../services/pdfService.js';
import { getNextNCF } from '../utils/ncfUtils.js';
import whatsappService from '../services/whatsappService.js';

// ========================================
// CONFIGURACIÓN DE MULTER
// ========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/recolecciones/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `recoleccion-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes y PDFs'));
    }
  }
});

// ========================================
// CREAR NUEVA RECOLECCIÓN
// ========================================
export const createRecoleccion = async (req, res) => {
  try {
    console.log('📦 Creando nueva recolección...');
    console.log('📥 Body recibido:', JSON.stringify(req.body, null, 2));
    console.log('📋 Tipo de items:', typeof req.body.items);
    console.log('📋 Items raw:', req.body.items);

    const {
      // Datos del remitente
      remitenteNombre,
      remitenteTelefono,
      remitenteEmail,
      remitenteDireccion,

      // Datos del destinatario
      destinatarioNombre,
      destinatarioTelefono,
      destinatarioEmail,
      destinatarioDireccion,
      destinatarioZona,
      destinatarioSector,

      // Items
      items,

      // Facturación
      subtotal,
      itbis,
      total,

      // Pago
      metodoPago,
      estadoPago,
      montoPagado,

      // Otros
      notas,
      tipoServicio,
      ncfSolicitado // 'B01', 'B02', 'B14', 'B15' o null
    } = req.body;

    // ✅ VALIDACIÓN CRÍTICA: Verificar y parsear items
    let itemsArray;

    if (typeof items === 'string') {
      console.log('⚠️ Items recibido como string, parseando...');
      try {
        itemsArray = JSON.parse(items);
      } catch (parseError) {
        console.error('❌ Error parseando items:', parseError);
        return res.status(400).json({
          success: false,
          message: 'El formato de items es inválido',
          hint: 'Los items deben ser un array JSON válido',
          receivedType: typeof items,
          receivedValue: items
        });
      }
    } else if (Array.isArray(items)) {
      console.log('✅ Items recibido como array');
      itemsArray = items;
    } else {
      console.error('❌ Items no es ni string ni array:', typeof items);
      return res.status(400).json({
        success: false,
        message: 'El formato de items es inválido',
        hint: 'Los items deben ser un array',
        receivedType: typeof items,
        receivedValue: items
      });
    }

    if (!Array.isArray(itemsArray)) {
      console.error('❌ itemsArray no es un array después del parseo');
      return res.status(400).json({
        success: false,
        message: 'Los items deben ser un array',
        receivedType: typeof itemsArray
      });
    }

    if (itemsArray.length === 0) {
      console.error('❌ Array de items está vacío');
      return res.status(400).json({
        success: false,
        message: 'Debe incluir al menos un item',
        hint: 'El array de items está vacío'
      });
    }

    console.log(`✅ Items validados: ${itemsArray.length} items`);

    // Validaciones básicas
    if (!remitenteNombre || !destinatarioNombre) {
      return res.status(400).json({
        success: false,
        message: 'Los nombres del remitente y destinatario son obligatorios'
      });
    }

    // Obtener datos del usuario y empresa
    const usuarioId = req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(usuarioId).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();
    const companyId = userData.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Usuario no asociado a ninguna empresa'
      });
    }

    // ======================================================================
    // 🏷️ GENERACIÓN DE ID ESTANDARIZADO (EMI-RC-0000)
    // ======================================================================
    // Usamos una transacción para asegurar unicidad y atomicidad
    const companyRef = db.collection('companies').doc(companyId);
    let codigoTracking;
    let recoleccionesCount;

    try {
      await db.runTransaction(async (t) => {
        const doc = await t.get(companyRef);
        if (!doc.exists) throw new Error('Company not found');

        const data = doc.data();
        // Obtener prefijo o generarlo fallback (Primeras 3 letras mayúsculas)
        const prefijo = data.prefijo || companyId.substring(0, 3).toUpperCase();

        // Incrementar contador
        const nextCount = (data.recolecciones_count || 0) + 1;
        recoleccionesCount = nextCount;

        // Formato: PREFIJO-RC-NUMERO (EMI-RC-0001)
        codigoTracking = `${prefijo}-RC-${String(nextCount).padStart(4, '0')}`; // 4 dígitos inicialmente

        // Actualizar contador en la compañía
        t.update(companyRef, { recolecciones_count: nextCount });
      });
    } catch (e) {
      console.error('Error Transaction ID:', e);
      // Fallback a lógica antigua por seguridad si falla transacción
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9999);
      codigoTracking = `RC-${year}${month}${day}-${random}`;
    }

    // ======================================================================
    // 🏦 GENERACIÓN AUTOMÁTICA DE NCF (Si se solicita)
    // ======================================================================
    let ncfAsignado = null;

    if (ncfSolicitado && companyId) {
      try {
        console.log(`🏦 Solicitando NCF automático tipo ${ncfSolicitado} para compañía ${companyId}`);
        ncfAsignado = await getNextNCF(companyId, ncfSolicitado);
      } catch (ncfError) {
        console.error('❌ Error generando NCF:', ncfError);
        return res.status(400).json({
          success: false,
          message: 'Error generando NCF. Verifique la configuración fiscal.',
          details: ncfError.message
        });
      }
    }

    const recoleccionData = {
      codigoTracking,
      companyId,
      sucursalId: userData.sucursalId || null,
      userId: usuarioId, // ✅ ID del recolector que creó esta recolección

      remitente: {
        nombre: remitenteNombre || '',
        telefono: remitenteTelefono || '',
        email: remitenteEmail || '',
        direccion: remitenteDireccion || ''
      },

      destinatario: {
        nombre: destinatarioNombre || '',
        telefono: destinatarioTelefono || '',
        email: destinatarioEmail || '',
        direccion: destinatarioDireccion || '',
        zona: destinatarioZona || '',
        sector: destinatarioSector || ''
      },

      items: itemsArray.map(item => ({
        cantidad: parseInt(item.cantidad) || 1,
        descripcion: item.descripcion || item.producto || '', // ✅ Soportar ambos campos
        precio: parseFloat(item.precio) || 0
      })),

      facturacion: {
        subtotal: parseFloat(subtotal) || 0,
        itbis: parseFloat(itbis) || 0,
        total: parseFloat(total) || 0,
        moneda: 'USD',
        ncf: ncfAsignado, // ✅ NCF Asignado
        ncfTipo: ncfSolicitado || null
      },

      pago: {
        estado: estadoPago || 'pendiente',
        metodoPago: metodoPago || null,
        montoPagado: parseFloat(montoPagado) || 0,
        montoPendiente: (parseFloat(total) || 0) - (parseFloat(montoPagado) || 0),
        fechaPago: null,
        referenciaPago: '',
        notasPago: '',
        historialPagos: []
      },

      estado: 'pendiente',
      estadoItems: 'completo',
      estadoGeneral: 'sin_confirmar',

      contenedorId: null,
      numeroContenedor: null,

      rutaId: null,
      repartidorId: null,
      fechaAsignacionRuta: null,

      notas: notas || '',
      tipoServicio: tipoServicio || 'standard',
      notas: notas || '',
      tipoServicio: tipoServicio || 'standard',
      fotos: Array.isArray(req.body.fotos) ? req.body.fotos : [], // ✅ Aceptamos fotos directamente

      historial: [{
        accion: 'creacion',
        descripcion: 'Recolección creada',
        usuario: usuarioId,
        fecha: new Date().toISOString()
      }],

      fechaCreacion: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      creadoPor: usuarioId
    };

    console.log('💾 Guardando recolección en Firestore...');

    const docRef = await db.collection('recolecciones').add(recoleccionData);
    const recoleccionId = docRef.id;

    console.log(`✅ Recolección creada: ${codigoTracking} (ID: ${recoleccionId})`);

    // Obtener configuración de la compañía para envío de correo
    let companyConfig = null;
    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        companyConfig = companyDoc.data();
      }
    } catch (error) {
      console.error('⚠️ Error obteniendo configuración de compañía:', error.message);
    }

    // 📄 GENERAR PDF FACTURA (Para enviar por ambos canales)
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateInvoicePDF(recoleccionData, companyConfig);
    } catch (pdfError) {
      console.error('⚠️ Error generando PDF de factura:', pdfError.message);
    }

    // 🟢 NOTIFICACIÓN WHATSAPP (Recolección Directa / Factura)
    if (remitenteTelefono) {
      const montoTotal = parseFloat(total);
      const montoPagadoVal = parseFloat(montoPagado) || 0;
      const montoPendienteVal = montoTotal - montoPagadoVal;

      let detallesPago = `💰 *Total:* $${montoTotal.toFixed(2)}`;

      if (estadoPago === 'parcial' || (estadoPago === 'pendiente' && montoPagadoVal > 0)) {
        detallesPago += `\n💵 *Abonado:* $${montoPagadoVal.toFixed(2)}\n⚠️ *Restante:* $${montoPendienteVal.toFixed(2)}`;
      } else if (estadoPago === 'pendientes') {
        detallesPago += `\n⚠️ *Estado:* Pendiente de Pago`;
      } else if (estadoPago === 'pagada') {
        detallesPago += `\n✅ *Estado:* Pagado`;
      }

      const mensajeWhatsapp = `🧾 *Recolección Exitosa / Factura Generada*\n\nHola *${remitenteNombre}*, gracias por tu envío. Aquí tienes los detalles de tu factura #${codigoTracking}.\n\n📍 Destino: ${destinatarioNombre} (${destinatarioDireccion})\n${detallesPago}\n\nGracias por confiar en nosotros. 🚛`;

      // 1. Enviar mensaje de texto
      whatsappService.sendMessage(companyId, remitenteTelefono, mensajeWhatsapp)
        .then(() => {
          // 2. Enviar PDF adjunto (si se generó correctamente)
          // Esperamos un poco para que lleguen en orden
          if (pdfBuffer) {
            setTimeout(() => {
              whatsappService.sendMediaFile(
                companyId,
                remitenteTelefono,
                pdfBuffer,
                `Factura_${codigoTracking}.pdf`,
                `📄 Tu factura digital`
              ).catch(e => console.error('Error enviando PDF WA:', e.message));
            }, 1500);
          }
        })
        .catch(e => console.error('Error Whatsapp:', e));
    }

    // Enviar notificación por correo al remitente (en segundo plano) con factura PDF
    if (remitenteEmail) {
      const subject = `Factura Generada - ${codigoTracking}`;
      const trackingButton = generateTrackingButtonHTML(codigoTracking);

      const montoTotal = parseFloat(total);
      const montoPagadoVal = parseFloat(montoPagado) || 0;
      const montoPendienteVal = montoTotal - montoPagadoVal;

      let pagoHtml = `<p><strong>Total:</strong> $${montoTotal.toFixed(2)} USD</p>`;

      if (estadoPago === 'parcial' || (estadoPago === 'pendiente' && montoPagadoVal > 0)) {
        pagoHtml += `
          <p><strong>Abonado:</strong> $${montoPagadoVal.toFixed(2)} USD</p>
          <p style="color: #d32f2f;"><strong>Restante:</strong> $${montoPendienteVal.toFixed(2)} USD</p>
          `;
      } else {
        pagoHtml += `<p><strong>Estado de Pago:</strong> ${estadoPago === 'pagada' ? 'Pagada ✅' : 'Pendiente ⚠️'}</p>`;
      }

      const contentHtml = `
          <h2 style="color: #333; margin-top: 0;">Recolección Exitosa / Factura Generada</h2>
          <p>Hola <strong>${remitenteNombre}</strong>,</p>
          <p>Tu envío ha sido procesado exitosamente. Adjuntamos tu factura en formato PDF.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #555;">Detalles de la Factura</h3>
            <p><strong>Código de Tracking:</strong> ${codigoTracking}</p>
            <p><strong>Destinatario:</strong> ${destinatarioNombre}</p>
            <p><strong>Dirección:</strong> ${destinatarioDireccion}</p>
            ${pagoHtml}
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">Items:</h4>
            <ul style="padding-left: 20px; margin-bottom: 0;">
              ${itemsArray.map(item => `<li>${item.cantidad}x ${item.descripcion} - $${parseFloat(item.precio).toFixed(2)}</li>`).join('')}
            </ul>
          </div>

          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1976D2;">
            <p style="margin: 0; color: #1565C0;">
              📄 <strong>Factura adjunta:</strong> Hemos incluido tu factura en PDF como archivo adjunto en este correo.
            </p>
          </div>

          ${trackingButton}

          <p>Gracias por confiar en nosotros.</p>
      `;

      const brandedHtml = generateBrandedEmailHTML(contentHtml, companyConfig, 'pendiente_recoleccion');

      // Preparar adjuntos solo si el PDF existe
      const attachments = pdfBuffer ? [{
        filename: `Factura_${codigoTracking}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }] : [];

      sendEmail(remitenteEmail, subject, brandedHtml, attachments, companyConfig)
        .then(() => console.log(`📧 Correo con factura PDF enviado a ${remitenteEmail}`))
        .catch(err => console.error(`❌ Error enviando correo:`, err.message));
    }

    res.status(201).json({
      success: true,
      message: 'Recolección creada exitosamente',
      data: {
        id: recoleccionId,
        codigoTracking,
        remitente: recoleccionData.remitente,
        destinatario: recoleccionData.destinatario,
        items: recoleccionData.items,
        facturacion: recoleccionData.facturacion,
        pago: recoleccionData.pago
      }
    });

  } catch (error) {
    console.error('❌ Error creando recolección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la recolección',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ========================================
// OBTENER TODAS LAS RECOLECCIONES
// ========================================
export const getRecolecciones = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    const { estado, contenedorId, limit = 50, offset = 0 } = req.query;

    let query = db.collection('recolecciones')
      .where('companyId', '==', companyId);

    if (estado) {
      query = query.where('estado', '==', estado);
    }

    if (contenedorId) {
      query = query.where('contenedorId', '==', contenedorId);
    }

    const snapshot = await query
      .orderBy('fechaCreacion', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const recolecciones = [];
    snapshot.forEach(doc => {
      recolecciones.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: recolecciones,
      total: recolecciones.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo recolecciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las recolecciones',
      error: error.message
    });
  }
};

// ========================================
// OBTENER RECOLECCIÓN POR ID
// ========================================
export const getRecoleccionById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('recolecciones').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Recolección no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo recolección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la recolección',
      error: error.message
    });
  }
};

// ========================================
// BUSCAR POR CÓDIGO DE TRACKING
// ========================================
export const buscarPorCodigoTracking = async (req, res) => {
  try {
    const { codigoTracking } = req.params;
    const companyId = req.userData?.companyId;

    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('codigoTracking', '==', codigoTracking)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ninguna recolección con ese código'
      });
    }

    const doc = snapshot.docs[0];

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...doc.data()
      }
    });

  } catch (error) {
    console.error('❌ Error buscando por código:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar la recolección',
      error: error.message
    });
  }
};

// ========================================
// ACTUALIZAR ESTADO DE RECOLECCIÓN
// ========================================

export const actualizarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas, fotos } = req.body; // ✅ Aceptamos fotos para evidencia

    const estadosPermitidos = [
      'pendiente',
      'en_contenedor',
      'en_transito',
      'recibida_rd',
      'en_ruta',
      'entregado',
      'cancelado'
    ];

    if (!estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado no válido',
        estadosPermitidos
      });
    }

    const recoleccionRef = db.collection('recolecciones').doc(id);
    const doc = await recoleccionRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Recolección no encontrada'
      });
    }

    const historialEntry = {
      accion: 'cambio_estado',
      descripcion: `Estado cambiado a: ${estado}`,
      estadoAnterior: doc.data().estado,
      estadoNuevo: estado,
      notas: notas || '',
      usuario: req.userData?.uid,
      fecha: new Date().toISOString()
    };


    // ✅ ACTUALIZAR FOTOS SI EXISTEN (Evidencia de entrega)
    const updateData = {
      estado,
      estadoGeneral: estado,
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    };

    if (fotos && Array.isArray(fotos) && fotos.length > 0) {
      updateData.fotos = FieldValue.arrayUnion(...fotos);
      // Agregar al historial que se subió evidencia
      updateData.historial = FieldValue.arrayUnion({
        accion: 'evidencia_subida',
        descripcion: `Se subieron ${fotos.length} fotos de evidencia`,
        usuario: req.userData?.uid,
        fecha: new Date().toISOString()
      });
    }

    await recoleccionRef.update(updateData);

    // Obtener datos completos de la recolección para notificación
    const recoleccionData = doc.data();
    const companyId = recoleccionData.companyId;

    // Obtener configuración de la compañía
    let companyConfig = null;
    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        companyConfig = companyDoc.data();
      }
    } catch (error) {
      console.error('⚠️ Error obteniendo configuración de compañía:', error.message);
    }

    // Enviar notificación por correo al remitente (en segundo plano)
    const remitenteEmail = recoleccionData.remitente?.email;
    if (remitenteEmail) {
      const estadosMensajes = {
        'pendiente': {
          titulo: 'Recolección Pendiente',
          mensaje: 'Tu recolección está pendiente de procesamiento.',
          emoji: '⏳'
        },
        'en_contenedor': {
          titulo: 'En Contenedor - Almacén USA',
          mensaje: 'Tu paquete ha sido colocado en un contenedor en nuestro almacén de USA y pronto será enviado.',
          emoji: '📦'
        },
        'en_transito': {
          titulo: 'En Tránsito a República Dominicana',
          mensaje: 'Tu paquete está en camino hacia República Dominicana.',
          emoji: '🚢'
        },
        'recibido_rd': {
          titulo: 'Recibido en Almacén RD',
          mensaje: 'Tu paquete ha llegado a nuestro almacén en República Dominicana y está siendo procesado.',
          emoji: '🏭'
        },
        'en_ruta': {
          titulo: 'En Ruta de Entrega',
          mensaje: 'Tu paquete está en camino hacia su destino final.',
          emoji: '🚚'
        },
        'entregado': {
          titulo: '¡Entregado Exitosamente!',
          mensaje: 'Tu paquete ha sido entregado al destinatario.',
          emoji: '✅'
        },
        'cancelado': {
          titulo: 'Recolección Cancelada',
          mensaje: 'Tu recolección ha sido cancelada.',
          emoji: '❌'
        }
      };

      const estadoInfo = estadosMensajes[estado] || {
        titulo: 'Actualización de Estado',
        mensaje: `El estado de tu envío ha cambiado a: ${estado}`,
        emoji: '📬'
      };

      const subject = `${estadoInfo.emoji} ${estadoInfo.titulo} - ${recoleccionData.codigoTracking}`;
      const contentHtml = `
            <h2 style="color: #333; margin-top: 0;">${estadoInfo.emoji} ${estadoInfo.titulo}</h2>
            <p>Hola <strong>${recoleccionData.remitente?.nombre}</strong>,</p>
            <p>${estadoInfo.mensaje}</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #555;">Detalles del Envío</h3>
              <p><strong>Código de Tracking:</strong> ${recoleccionData.codigoTracking}</p>
              <p><strong>Destinatario:</strong> ${recoleccionData.destinatario?.nombre}</p>
              <p><strong>Dirección de Entrega:</strong> ${recoleccionData.destinatario?.direccion}</p>
              <p><strong>Estado Actual:</strong> ${estadoInfo.titulo}</p>
            </div>

            ${notas ? `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #856404;">Nota Adicional:</h4>
              <p>${notas}</p>
            </div>
            ` : ''}

            ${generateTrackingButtonHTML(recoleccionData.codigoTracking)}

            <p style="text-align: center; color: #666;">Gracias por confiar en nosotros.</p>
        `;

      const brandedHtml = generateBrandedEmailHTML(contentHtml, companyConfig, estado);

      sendEmail(remitenteEmail, subject, brandedHtml, [], companyConfig)
        .then(() => console.log(`📧 Notificación de estado enviada a ${remitenteEmail}`))
        .catch(err => console.error(`❌ Error enviando notificación a ${remitenteEmail}:`, err.message));

      // 🟢 NOTIFICACIÓN WHATSAPP (Cambio de Estado + Evidencia)
      const remitenteTelefono = recoleccionData.remitente?.telefono;
      if (remitenteTelefono) {

        // 1. Enviar TEXTO
        let mensajeWhatsapp = `${estadoInfo.emoji} *Actualización de Estado*: ${recoleccionData.codigoTracking}\n\nHola *${recoleccionData.remitente?.nombre}*,\n\n${estadoInfo.mensaje}\n\nEstado actual: *${estadoInfo.titulo}*\n\nGracias por confiar en nosotros.`;

        // Agregar nota si existe
        if (notas) {
          mensajeWhatsapp += `\n\n📝 *Nota:* ${notas}`;
        }

        whatsappService.sendMessage(companyId, remitenteTelefono, mensajeWhatsapp)
          .then(() => {
            // 2. Enviar EVIDENCIA (Si hay fotos nuevas o existentes y es ENTREGADO)
            if (estado === 'entregado') {
              // Usar las fotos enviadas en este request o las que ya tenga
              const evidencias = (fotos && Array.isArray(fotos) && fotos.length > 0)
                ? fotos
                : (recoleccionData.fotos || []);

              if (evidencias.length > 0) {
                console.log(`📸 Enviando ${evidencias.length} fotos de evidencia por WhatsApp...`);
                // Enviar la primera foto como prueba principal (para no hacer spam)
                const fotoPrincipal = evidencias[0];

                setTimeout(() => {
                  whatsappService.sendMediaUrl(
                    companyId,
                    remitenteTelefono,
                    fotoPrincipal,
                    '📸 Evidencia de entrega',
                    'image'
                  ).catch(e => console.error('Error enviando Foto Evidencia:', e));
                }, 1500);
              }
            }
          })
          .catch(e => console.error('Error WA Status:', e));
      }
    }

    res.json({
      success: true,
      message: 'Estado actualizado exitosamente',
      data: { id, estado }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el estado',
      error: error.message
    });
  }
};

// ========================================
// ACTUALIZAR INFORMACIÓN DE PAGO
// ========================================
export const actualizarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { montoPagado, metodoPago, referenciaPago, notasPago } = req.body;

    const recoleccionRef = db.collection('recolecciones').doc(id);
    const doc = await recoleccionRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Recolección no encontrada'
      });
    }

    const data = doc.data();
    const montoTotal = data.facturacion?.total || 0;
    const nuevoMontoPagado = parseFloat(montoPagado) || 0;
    const montoPendiente = montoTotal - nuevoMontoPagado;

    let estadoPago = 'pendiente';
    if (nuevoMontoPagado >= montoTotal) {
      estadoPago = 'pagada';
    } else if (nuevoMontoPagado > 0) {
      estadoPago = 'parcial';
    }

    const pagoUpdate = {
      'pago.estado': estadoPago,
      'pago.montoPagado': nuevoMontoPagado,
      'pago.montoPendiente': montoPendiente,
      'pago.metodoPago': metodoPago || null,
      'pago.referenciaPago': referenciaPago || '',
      'pago.notasPago': notasPago || '',
      'pago.fechaPago': new Date().toISOString(),
      fechaActualizacion: FieldValue.serverTimestamp()
    };

    const historialPago = {
      monto: nuevoMontoPagado,
      metodoPago: metodoPago || '',
      referencia: referenciaPago || '',
      fecha: new Date().toISOString(),
      usuario: req.userData?.uid
    };

    await recoleccionRef.update({
      ...pagoUpdate,
      'pago.historialPagos': FieldValue.arrayUnion(historialPago)
    });

    // Obtener datos de la recolección para notificación
    const recoleccionData = doc.data();
    const companyId = recoleccionData.companyId;

    // Obtener configuración de la compañía
    let companyConfig = null;
    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        companyConfig = companyDoc.data();
      }
    } catch (error) {
      console.error('⚠️ Error obteniendo configuración de compañía:', error.message);
    }

    // Enviar notificación si el pago fue completado
    const remitenteEmail = recoleccionData.remitente?.email;
    if (remitenteEmail && estadoPago === 'pagada') {
      const subject = `💰 Pago Confirmado - ${recoleccionData.codigoTracking}`;
      const contentHtml = `
              <h2 style="color: #4CAF50; margin-top: 0;">💰 Pago Confirmado</h2>
              <p>Hola <strong>${recoleccionData.remitente?.nombre}</strong>,</p>
              <p>Hemos confirmado el pago de tu envío.</p>

              <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2e7d32;">Detalles del Pago</h3>
                <p><strong>Código de Tracking:</strong> ${recoleccionData.codigoTracking}</p>
                <p><strong>Monto Pagado:</strong> $${nuevoMontoPagado.toFixed(2)} USD</p>
                <p><strong>Método de Pago:</strong> ${metodoPago || 'No especificado'}</p>
                ${referenciaPago ? `<p><strong>Referencia:</strong> ${referenciaPago}</p>` : ''}
                <p><strong>Estado:</strong> Pagada ✅</p>
              </div>

              ${generateTrackingButtonHTML(recoleccionData.codigoTracking)}

              <p style="text-align: center; color: #666;">Gracias por tu pago. Tu envío será procesado pronto.</p>
          `;

      const brandedHtml = generateBrandedEmailHTML(contentHtml, companyConfig, 'confirmada');

      sendEmail(remitenteEmail, subject, brandedHtml, [], companyConfig)
        .then(() => console.log(`📧 Confirmación de pago enviada a ${recoleccionData.remitente?.email}`))
        .catch(err => console.error(`❌ Error enviando confirmación a ${recoleccionData.remitente?.email}:`, err.message));
    }

    res.json({
      success: true,
      message: 'Información de pago actualizada',
      data: {
        id,
        pago: {
          estado: estadoPago,
          montoPagado: nuevoMontoPagado,
          montoPendiente
        }
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el pago',
      error: error.message
    });
  }
};

// ========================================
// ACTUALIZAR RECOLECCIÓN COMPLETA
// ========================================
export const actualizarRecoleccion = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log(`🔍 Actualizando recolección ${id}...`);

    const recoleccionRef = db.collection('recolecciones').doc(id);
    const recoleccionDoc = await recoleccionRef.get();

    if (!recoleccionDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Recolección no encontrada'
      });
    }

    const recoleccionActual = recoleccionDoc.data();
    const companyId = req.userData?.companyId || recoleccionActual.companyId;

    if (recoleccionActual.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para actualizar esta recolección'
      });
    }

    const dataToUpdate = {};

    const camposPermitidos = [
      'remitente.nombre',
      'remitente.telefono',
      'remitente.email',
      'remitente.direccion',
      'destinatario.nombre',
      'destinatario.telefono',
      'destinatario.email',
      'destinatario.direccion',
      'destinatario.zona',
      'destinatario.sector',
      'items',
      'facturacion.subtotal',
      'facturacion.itbis',
      'facturacion.total',
      'pago.estado',
      'pago.metodoPago',
      'pago.montoPagado',
      'pago.montoPendiente',
      'pago.referenciaPago',
      'pago.notasPago',
      'estado',
      'estadoItems',
      'estadoGeneral',
      'rutaId',
      'repartidorId',
      'notas',
      'observaciones',
      'tipoServicio',
      'fechaConfirmacion'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (camposPermitidos.includes(key)) {
        dataToUpdate[key] = value;
      }
    }

    if ('pago.montoPagado' in dataToUpdate) {
      const total = recoleccionActual.facturacion?.total || 0;
      const montoPagado = parseFloat(dataToUpdate['pago.montoPagado']) || 0;
      dataToUpdate['pago.montoPendiente'] = total - montoPagado;

      if (montoPagado >= total) {
        dataToUpdate['pago.estado'] = 'pagada';
      } else if (montoPagado > 0) {
        dataToUpdate['pago.estado'] = 'parcial';
      } else {
        dataToUpdate['pago.estado'] = 'pendiente';
      }
    }

    dataToUpdate.fechaActualizacion = FieldValue.serverTimestamp();

    const historialEntry = {
      accion: 'actualizacion',
      descripcion: 'Datos de recolección actualizados',
      campos: Object.keys(dataToUpdate).filter(k => k !== 'fechaActualizacion'),
      usuario: req.userData?.uid,
      fecha: new Date().toISOString()
    };

    if (dataToUpdate.estadoGeneral === 'confirmada') {
      dataToUpdate.fechaConfirmacion = new Date().toISOString();
      historialEntry.descripcion = 'Factura confirmada por secretaria';
    }

    await recoleccionRef.update({
      ...dataToUpdate,
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log(`✅ Recolección ${id} actualizada`);

    const docActualizado = await recoleccionRef.get();
    const dataActualizada = docActualizado.data();

    // 🟢 NOTIFICACIÓN WHATSAPP cuando secretaria actualiza información
    const remitenteTelefono = dataActualizada.remitente?.telefono;
    if (remitenteTelefono && Object.keys(dataToUpdate).length > 1) { // > 1 porque siempre hay fechaActualizacion
      const camposActualizadosTexto = Object.keys(dataToUpdate)
        .filter(k => k !== 'fechaActualizacion' && k !== 'historial')
        .map(campo => {
          if (campo.includes('remitente.')) return campo.replace('remitente.', 'tu ');
          if (campo.includes('destinatario.')) return campo.replace('destinatario.', 'destinatario ');
          if (campo.includes('pago.')) return campo.replace('pago.', 'pago ');
          if (campo.includes('facturacion.')) return campo.replace('facturacion.', 'facturación ');
          return campo;
        })
        .join(', ');

      let mensajeWhatsapp = `📝 *Actualización de Información*\n\nHola *${dataActualizada.remitente?.nombre}*,\n\nSe ha actualizado la información de tu envío:\n\n📦 *Tracking:* ${dataActualizada.codigoTracking}\n✏️ *Campos actualizados:* ${camposActualizadosTexto}\n\n`;

      // Mostrar información relevante actualizada
      if (dataToUpdate['destinatario.nombre'] || dataToUpdate['destinatario.telefono'] || dataToUpdate['destinatario.direccion']) {
        mensajeWhatsapp += `👤 *Destinatario actualizado:*\n`;
        mensajeWhatsapp += `   Nombre: ${dataActualizada.destinatario?.nombre}\n`;
        if (dataToUpdate['destinatario.telefono']) {
          mensajeWhatsapp += `   Teléfono: ${dataActualizada.destinatario?.telefono}\n`;
        }
        if (dataToUpdate['destinatario.direccion']) {
          mensajeWhatsapp += `   Dirección: ${dataActualizada.destinatario?.direccion}\n`;
        }
        mensajeWhatsapp += '\n';
      }

      if (dataToUpdate['facturacion.total'] || dataToUpdate['pago.estado']) {
        mensajeWhatsapp += `💰 *Información de pago:*\n`;
        if (dataToUpdate['facturacion.total']) {
          mensajeWhatsapp += `   Total: $${dataActualizada.facturacion?.total?.toFixed(2)}\n`;
        }
        if (dataToUpdate['pago.estado']) {
          const estadoPago = dataActualizada.pago?.estado === 'pagada' ? 'Pagada ✅' :
            dataActualizada.pago?.estado === 'parcial' ? 'Pago Parcial ⚠️' : 'Pendiente ⏳';
          mensajeWhatsapp += `   Estado: ${estadoPago}\n`;
        }
        if (dataActualizada.pago?.montoPendiente && dataActualizada.pago.montoPendiente > 0) {
          mensajeWhatsapp += `   Pendiente: $${dataActualizada.pago.montoPendiente.toFixed(2)}\n`;
        }
        mensajeWhatsapp += '\n';
      }

      mensajeWhatsapp += `📅 *Última actualización:* ${new Date().toLocaleString('es-DO')}\n\nGracias por confiar en nosotros.`;

      // Enviar notificación de forma asíncrona
      whatsappService.sendMessage(companyId, remitenteTelefono, mensajeWhatsapp)
        .then(() => console.log(`✅ Notificación de actualización enviada a ${remitenteTelefono}`))
        .catch(err => console.error(`❌ Error enviando notificación de actualización:`, err));
    }

    res.json({
      success: true,
      message: 'Recolección actualizada exitosamente',
      data: {
        id: docActualizado.id,
        codigoTracking: dataActualizada.codigoTracking,
        remitente: dataActualizada.remitente,
        destinatario: dataActualizada.destinatario,
        estado: dataActualizada.estado,
        estadoGeneral: dataActualizada.estadoGeneral,
        pago: dataActualizada.pago
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando recolección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la recolección',
      error: error.message
    });
  }
};

// ========================================
// ELIMINAR RECOLECCIÓN
// ========================================
export const deleteRecoleccion = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await db.collection('recolecciones').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Recolección no encontrada'
      });
    }

    const data = doc.data();

    if (data.contenedorId) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una recolección que está en un contenedor'
      });
    }

    await db.collection('recolecciones').doc(id).delete();

    res.json({
      success: true,
      message: 'Recolección eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando recolección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la recolección',
      error: error.message
    });
  }
};

// ========================================
// OBTENER ESTADÍSTICAS
// ========================================
export const getEstadisticas = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .get();

    const estadisticas = {
      total: snapshot.size,
      porEstado: {
        pendiente: 0,
        en_contenedor: 0,
        en_transito: 0,
        recibido_rd: 0,
        en_ruta: 0,
        entregado: 0
      },
      porPago: {
        pagada: 0,
        pendiente: 0,
        parcial: 0
      },
      montoTotal: 0,
      montoPagado: 0,
      montoPendiente: 0
    };

    snapshot.forEach(doc => {
      const data = doc.data();

      if (estadisticas.porEstado[data.estado] !== undefined) {
        estadisticas.porEstado[data.estado]++;
      }

      if (data.pago?.estado) {
        if (estadisticas.porPago[data.pago.estado] !== undefined) {
          estadisticas.porPago[data.pago.estado]++;
        }
      }

      estadisticas.montoTotal += data.facturacion?.total || 0;
      estadisticas.montoPagado += data.pago?.montoPagado || 0;
      estadisticas.montoPendiente += data.pago?.montoPendiente || 0;
    });

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas',
      error: error.message
    });
  }
};

// ========================================
// CREAR RECOLECCIÓN PÚBLICA (SIN AUTH)
// ========================================
export const createPublicRecoleccion = async (req, res) => {
  try {
    console.log('📦 Creando nueva recolección PÚBLICA (Solicitud Simplificada)...');
    console.log('📥 Body recibido:', JSON.stringify(req.body, null, 2));

    const {
      companyId,
      remitenteNombre,
      remitenteTelefono,
      remitenteEmail,
      remitenteDireccion,
      fechaPreferida,
      horaPreferida,
      items,
      fotos,
      notasAdicionales,
      tipoServicio,
      // Legacy fields (optional for backward compatibility)
      destinatarioNombre,
      destinatarioTelefono,
      destinatarioEmail,
      destinatarioDireccion,
      destinatarioZona,
      destinatarioSector,
      subtotal,
      itbis,
      total,
      notas
    } = req.body;

    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Falta companyId' });
    }

    if (!remitenteNombre || !remitenteTelefono || !remitenteDireccion) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos del remitente (nombre, teléfono, dirección)'
      });
    }

    let itemsArray = items;
    if (typeof items === 'string') {
      try { itemsArray = JSON.parse(items); } catch (e) { itemsArray = []; }
    }
    if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
      return res.status(400).json({ success: false, message: 'Debes agregar al menos un artículo' });
    }

    // Get Company Settings for NCF and Email
    let companyConfig = null;
    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        companyConfig = companyDoc.data();
      } else {
        return res.status(404).json({ success: false, message: 'Compañía inválida' });
      }
    } catch (e) { return res.status(500).json({ success: false, message: 'Error DB' }); }

    // Generate Tracking
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    const contadorRef = db.collection('contadores').doc(companyId);
    const contadorDoc = await contadorRef.get();
    let siguienteNumero = 1;
    if (contadorDoc.exists) {
      siguienteNumero = (contadorDoc.data().recolecciones || 0) + 1;
    }
    await contadorRef.set({ recolecciones: siguienteNumero }, { merge: true });

    const codigoTracking = `RC-${year}${month}${day}-${String(siguienteNumero).padStart(4, '0')}`;

    // Build notes description with pickup preferences
    let notasCompletas = notasAdicionales || 'Solicitud creada desde Web Pública';
    if (fechaPreferida || horaPreferida) {
      notasCompletas += '\n\n📅 Fecha/Hora Preferida:';
      if (fechaPreferida) notasCompletas += ` ${fechaPreferida}`;
      if (horaPreferida) notasCompletas += ` a las ${horaPreferida}`;
    }

    const recoleccionData = {
      codigoTracking,
      companyId,
      sucursalId: null,
      userId: 'PUBLIC_WEB',
      remitente: {
        nombre: remitenteNombre || '',
        telefono: remitenteTelefono || '',
        email: remitenteEmail || '',
        direccion: remitenteDireccion || ''
      },
      destinatario: {
        nombre: destinatarioNombre || 'Por definir',
        telefono: destinatarioTelefono || '',
        email: destinatarioEmail || '',
        direccion: destinatarioDireccion || 'Por definir',
        zona: destinatarioZona || '',
        sector: destinatarioSector || ''
      },
      items: itemsArray.map(item => ({
        cantidad: parseInt(item.cantidad) || 1,
        descripcion: item.descripcion || item.producto || '',
        precio: parseFloat(item.precio) || 0,
        pesoAproximado: item.pesoAproximado || '',
        dimensionesAproximadas: item.dimensionesAproximadas || ''
      })),
      facturacion: {
        subtotal: parseFloat(subtotal) || 0,
        itbis: parseFloat(itbis) || 0,
        total: parseFloat(total) || 0,
        moneda: 'USD',
        ncf: null,
        ncfTipo: null
      },
      pago: {
        estado: 'pendiente',
        metodoPago: null,
        montoPagado: 0,
        montoPendiente: parseFloat(total) || 0,
        fechaPago: null,
        referenciaPago: '',
        notasPago: '',
        historialPagos: []
      },
      solicitudPublica: {
        fechaPreferida: fechaPreferida || null,
        horaPreferida: horaPreferida || null,
        notasCliente: notasAdicionales || ''
      },
      estado: 'pendiente',
      estadoItems: 'completo',
      estadoGeneral: 'sin_confirmar',
      contenedorId: null,
      numeroContenedor: null,
      rutaId: null,
      repartidorId: null,
      fechaAsignacionRuta: null,
      notas: notasCompletas || notas || 'Creado desde Web Pública',
      tipoServicio: tipoServicio || 'standard',
      fotos: Array.isArray(fotos) ? fotos : [],
      historial: [{
        accion: 'creacion_publica',
        descripcion: 'Solicitud de recolección creada desde Web (cliente no especificó destinatario ni precios)',
        usuario: 'PUBLIC',
        fecha: new Date().toISOString()
      }],
      fechaCreacion: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      creadoPor: 'PUBLIC'
    };

    const docRef = await db.collection('recolecciones').add(recoleccionData);

    // 🟢 NOTIFICACIÓN WHATSAPP AL CLIENTE
    if (remitenteTelefono) {
      // Build items summary
      const itemsSummary = itemsArray.map(item =>
        `• ${item.cantidad}x ${item.descripcion}`
      ).join('\n');

      let mensajeWhatsapp = `📦 *Solicitud de Recolección Recibida*\n\nHola *${remitenteNombre}*, ¡gracias por tu solicitud!\n\n🔖 Código: *${codigoTracking}*\n📍 Recolección en: ${remitenteDireccion}\n\n📦 Artículos:\n${itemsSummary}`;

      if (fechaPreferida || horaPreferida) {
        mensajeWhatsapp += `\n\n📅 Fecha preferida: ${fechaPreferida || 'No especificada'}`;
        if (horaPreferida) mensajeWhatsapp += ` a las ${horaPreferida}`;
      }

      mensajeWhatsapp += '\n\n✅ Nuestro equipo revisará tu solicitud y te contactará pronto para confirmar la recolección y completar los detalles del envío.\n\n💡 Tip: Guarda este código de tracking para consultar el estado de tu envío.';

      whatsappService.sendMessage(companyId, remitenteTelefono, mensajeWhatsapp)
        .catch(e => console.error('Error WA Public:', e));
    }

    res.status(201).json({
      success: true,
      message: 'Solicitud enviada exitosamente',
      data: { id: docRef.id, codigoTracking }
    });

  } catch (error) {
    console.error('❌ Error createPublicRecoleccion:', error);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
  }
};

// ========================================
// EXPORTAR TODAS LAS FUNCIONES
// ========================================
export default {
  createRecoleccion,
  createPublicRecoleccion,
  getRecolecciones,
  getRecoleccionById,
  buscarPorCodigoTracking,
  actualizarEstado,
  actualizarPago,
  actualizarRecoleccion,
  deleteRecoleccion,
  getEstadisticas,
  upload
};