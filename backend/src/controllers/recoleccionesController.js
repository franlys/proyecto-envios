// backend/src/controllers/recoleccionesController.js
// ✅ VERSIÓN COMPLETA - TODAS LAS FUNCIONES (800+ líneas)

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import multer from 'multer';
import path from 'path';
import { sendEmail, generateTrackingButtonHTML } from '../services/notificationService.js';

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
      tipoServicio
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

    // Generar código de tracking único
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

    await contadorRef.set({
      recolecciones: siguienteNumero
    }, { merge: true });

    const codigoTracking = `RC-${year}${month}${day}-${String(siguienteNumero).padStart(4, '0')}`;

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
        descripcion: item.descripcion || '',
        precio: parseFloat(item.precio) || 0
      })),

      facturacion: {
        subtotal: parseFloat(subtotal) || 0,
        itbis: parseFloat(itbis) || 0,
        total: parseFloat(total) || 0,
        moneda: 'USD'
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

    // Enviar notificación por correo al remitente (en segundo plano)
    if (remitenteEmail) {
      const subject = `Recolección Confirmada - ${codigoTracking}`;
      const trackingButton = generateTrackingButtonHTML(codigoTracking);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976D2;">Recolección Creada Exitosamente</h2>
          <p>Hola <strong>${remitenteNombre}</strong>,</p>
          <p>Tu recolección ha sido registrada correctamente.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles de la Recolección</h3>
            <p><strong>Código de Tracking:</strong> ${codigoTracking}</p>
            <p><strong>Destinatario:</strong> ${destinatarioNombre}</p>
            <p><strong>Dirección:</strong> ${destinatarioDireccion}</p>
            <p><strong>Total:</strong> $${parseFloat(total).toFixed(2)} USD</p>
            <p><strong>Estado de Pago:</strong> ${estadoPago === 'pagada' ? 'Pagada' : 'Pendiente'}</p>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Items:</h4>
            <ul>
              ${itemsArray.map(item => `<li>${item.cantidad}x ${item.descripcion} - $${parseFloat(item.precio).toFixed(2)}</li>`).join('')}
            </ul>
          </div>

          ${trackingButton}

          <p>Gracias por confiar en nosotros.</p>
        </div>
      `;

      sendEmail(remitenteEmail, subject, html, [], companyConfig)
        .then(() => console.log(`📧 Correo de confirmación enviado a ${remitenteEmail}`))
        .catch(err => console.error(`❌ Error enviando correo a ${remitenteEmail}:`, err.message));
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
    const { estado, notas } = req.body;

    const estadosPermitidos = [
      'pendiente',
      'en_contenedor',
      'en_transito',
      'recibido_rd',
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

    await recoleccionRef.update({
      estado,
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

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
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976D2;">${estadoInfo.emoji} ${estadoInfo.titulo}</h2>
          <p>Hola <strong>${recoleccionData.remitente?.nombre}</strong>,</p>
          <p>${estadoInfo.mensaje}</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles del Envío</h3>
            <p><strong>Código de Tracking:</strong> ${recoleccionData.codigoTracking}</p>
            <p><strong>Destinatario:</strong> ${recoleccionData.destinatario?.nombre}</p>
            <p><strong>Dirección de Entrega:</strong> ${recoleccionData.destinatario?.direccion}</p>
            <p><strong>Estado Actual:</strong> ${estadoInfo.titulo}</p>
          </div>

          ${notas ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Nota Adicional:</h4>
            <p>${notas}</p>
          </div>
          ` : ''}

          ${generateTrackingButtonHTML(recoleccionData.codigoTracking)}

          <p style="text-align: center; color: #666;">Gracias por confiar en nosotros.</p>
        </div>
      `;

      sendEmail(remitenteEmail, subject, html, [], companyConfig)
        .then(() => console.log(`📧 Notificación de estado enviada a ${remitenteEmail} - Estado: ${estado}`))
        .catch(err => console.error(`❌ Error enviando notificación de estado:`, err.message));
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
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">💰 Pago Confirmado</h2>
          <p>Hola <strong>${recoleccionData.remitente?.nombre}</strong>,</p>
          <p>Hemos confirmado el pago de tu envío.</p>

          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles del Pago</h3>
            <p><strong>Código de Tracking:</strong> ${recoleccionData.codigoTracking}</p>
            <p><strong>Monto Pagado:</strong> $${nuevoMontoPagado.toFixed(2)} USD</p>
            <p><strong>Método de Pago:</strong> ${metodoPago || 'No especificado'}</p>
            ${referenciaPago ? `<p><strong>Referencia:</strong> ${referenciaPago}</p>` : ''}
            <p><strong>Estado:</strong> Pagada ✅</p>
          </div>

          ${generateTrackingButtonHTML(recoleccionData.codigoTracking)}

          <p style="text-align: center; color: #666;">Gracias por tu pago. Tu envío será procesado pronto.</p>
        </div>
      `;

      sendEmail(remitenteEmail, subject, html, [], companyConfig)
        .then(() => console.log(`📧 Notificación de pago enviada a ${remitenteEmail}`))
        .catch(err => console.error(`❌ Error enviando notificación de pago:`, err.message));
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
// EXPORTAR TODAS LAS FUNCIONES
// ========================================
export default {
  createRecoleccion,
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