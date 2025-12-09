// backend/src/controllers/repartidoresController.js
// ✅ VERSIÓN DEFINITIVA - GESTIÓN DE REPARTIDORES Y ENTREGAS
// Incluye sincronización de estadoGeneral y notificaciones de entrega

import { db, storage } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, generateBrandedEmailHTML } from '../services/notificationService.js';

// ==========================================================================
// HELPER: Convertir URLs de Firebase Storage a URLs públicas accesibles
// ==========================================================================
async function getPublicUrls(fotosUrls) {
  if (!fotosUrls || fotosUrls.length === 0) {
    console.log('⚠️ No hay fotos para procesar');
    return [];
  }

  const bucket = storage.bucket();
  const publicUrls = [];

  console.log(`\n🔄 Procesando ${fotosUrls.length} fotos...`);

  for (let i = 0; i < fotosUrls.length; i++) {
    const url = fotosUrls[i];
    console.log(`\n📸 Foto ${i + 1}/${fotosUrls.length}:`);
    console.log(`   URL original: ${url.substring(0, 100)}...`);

    try {
      // Extraer el path del archivo desde la URL
      let filePath = url;

      // Si es una URL completa de Firebase Storage, extraer el path
      if (url.includes('firebasestorage.googleapis.com')) {
        const urlParts = url.split('/o/')[1];
        if (urlParts) {
          filePath = decodeURIComponent(urlParts.split('?')[0]);
          console.log(`   Path extraído: ${filePath.substring(0, 80)}...`);
        } else {
          console.log(`   ⚠️ No se pudo extraer path de URL de Firebase Storage`);
        }
      } else {
        console.log(`   ℹ️ No es URL de Firebase Storage, usando como path directo`);
      }

      // Intentar hacer el archivo público y obtener URL pública
      const file = bucket.file(filePath);

      // Verificar si existe primero
      const [exists] = await file.exists();
      console.log(`   ¿Existe el archivo? ${exists ? '✅ Sí' : '❌ No'}`);

      if (!exists) {
        console.log(`   ⚠️ Archivo no existe, usando URL original`);
        publicUrls.push(url);
        continue;
      }

      try {
        // Hacer el archivo público
        await file.makePublic();

        // Generar URL pública
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        publicUrls.push(publicUrl);
        console.log(`   ✅ URL pública: ${publicUrl.substring(0, 100)}...`);
      } catch (makePublicError) {
        // Si ya es público o no se puede hacer público, intentar con signed URL
        console.log(`   ⚠️ No se pudo hacer público (${makePublicError.message})`);
        console.log(`   🔄 Intentando generar signed URL...`);

        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
        });

        publicUrls.push(signedUrl);
        console.log(`   ✅ URL firmada: ${signedUrl.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error(`   ❌ Error procesando URL: ${error.message}`);
      // Si falla todo, usar la URL original
      publicUrls.push(url);
      console.log(`   ℹ️ Usando URL original como fallback`);
    }
  }

  return publicUrls;
}

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

    // ✅ Enriquecer facturas con información completa desde recolecciones
    let facturasEnriquecidas = [];
    if (data.facturas && Array.isArray(data.facturas)) {
      for (const factura of data.facturas) {
        try {
          const facturaId = factura.id || factura.facturaId || factura.recoleccionId;
          if (!facturaId) {
            console.warn('⚠️ Factura sin ID en ruta:', rutaId);
            facturasEnriquecidas.push(factura);
            continue;
          }

          const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();

            // 🔍 DEBUG: Log items para ver si tienen el flag entregado
            console.log(`🔍 DEBUG Factura ${facturaId} items desde Firestore:`,
              facturaData.items?.map((item, idx) => ({
                index: idx,
                descripcion: item.descripcion,
                entregado: item.entregado,
                fechaEntrega: item.fechaEntrega
              }))
            );

            facturasEnriquecidas.push({
              ...factura,  // ✅ Spread PRIMERO (para no sobreescribir datos de Firestore)
              id: facturaDoc.id,
              numeroFactura: facturaData.numeroFactura || facturaData.codigoTracking,
              codigoTracking: facturaData.codigoTracking,
              estado: facturaData.estado || 'pendiente',
              destinatario: facturaData.destinatario || {},
              items: facturaData.items || [],  // ✅ Esto ahora NO será sobreescrito
              itemsTotal: facturaData.itemsTotal || (facturaData.items?.length || 0),
              itemsEntregados: (facturaData.items || []).filter(i => i.entregado).length,
              pago: facturaData.pago || {
                total: 0,
                estado: 'pendiente',
                montoPagado: 0,
                montoPendiente: 0
              },
              fotosEntrega: facturaData.fotosEntrega || []
            });
          } else {
            console.warn('⚠️ Factura no encontrada:', facturaId);
            facturasEnriquecidas.push(factura);
          }
        } catch (error) {
          console.error('❌ Error enriqueciendo factura:', error);
          facturasEnriquecidas.push(factura);
        }
      }
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...data,
        facturas: facturasEnriquecidas,
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

    // ✅ Enviar correos de notificación a destinatarios
    if (data.facturas && data.facturas.length > 0) {
      // Obtener configuración de la compañía
      let companyConfig = null;
      const companyId = data.companyId;
      if (companyId) {
        try {
          const companyDoc = await db.collection('companies').doc(companyId).get();
          if (companyDoc.exists) {
            companyConfig = companyDoc.data();
          }
        } catch (error) {
          console.error('⚠️ Error obteniendo configuración de compañía:', error.message);
        }
      }

      // Enviar notificación a cada destinatario
      for (const factura of data.facturas) {
        const facturaId = factura.id || factura.facturaId;
        if (!facturaId) continue;

        try {
          const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
          if (!facturaDoc.exists) continue;

          const facturaData = facturaDoc.data();
          const destinatarioEmail = facturaData.destinatario?.email;
          const remitenteEmail = facturaData.remitente?.email;

          console.log(`📬 Datos de correo para ${facturaData.codigoTracking}:`);
          console.log(`   Remitente: ${facturaData.remitente?.nombre} (${remitenteEmail || 'sin email'})`);
          console.log(`   Destinatario: ${facturaData.destinatario?.nombre} (${destinatarioEmail || 'sin email'})`);

          // ✅ ENVIAR CORREO AL DESTINATARIO (quien recibe)
          if (destinatarioEmail) {
            const subjectDestinatario = `🚚 Tu paquete está en camino - ${facturaData.codigoTracking}`;
            const contentDestinatario = `
              <h2 style="color: #2c3e50; margin-top: 0;">🚚 Tu paquete está en camino</h2>
              <p>Hola <strong>${facturaData.destinatario?.nombre}</strong>,</p>
              <p>¡Buenas noticias! El paquete que te envió <strong>${facturaData.remitente?.nombre}</strong> ha salido para entrega y pronto llegará a tu dirección.</p>

              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles del Envío</h3>
                <p><strong>Código de Tracking:</strong> ${facturaData.codigoTracking}</p>
                <p><strong>Remitente:</strong> ${facturaData.remitente?.nombre}</p>
                <p><strong>Destinatario:</strong> ${facturaData.destinatario?.nombre}</p>
                <p><strong>Dirección de Entrega:</strong> ${facturaData.destinatario?.direccion}</p>
                ${facturaData.destinatario?.telefono ? `<p><strong>Teléfono:</strong> ${facturaData.destinatario.telefono}</p>` : ''}
              </div>

              <p style="color: #666;">Por favor, mantente atento a nuestro repartidor. Te contactará pronto.</p>
              <p>Gracias por confiar en nosotros.</p>
            `;

            const brandedHTMLDestinatario = generateBrandedEmailHTML(contentDestinatario, companyConfig, 'en_ruta', facturaData.codigoTracking);

            sendEmail(destinatarioEmail, subjectDestinatario, brandedHTMLDestinatario, [], companyConfig)
              .then(() => console.log(`📧 Notificación enviada al DESTINATARIO: ${destinatarioEmail}`))
              .catch(err => console.error(`❌ Error enviando a destinatario:`, err.message));
          }

          // ✅ ENVIAR CORREO AL REMITENTE (quien envía)
          if (remitenteEmail) {
            const subjectRemitente = `🚚 Paquete en camino a ${facturaData.destinatario?.nombre} - ${facturaData.codigoTracking}`;
            const contentRemitente = `
              <h2 style="color: #2c3e50; margin-top: 0;">🚚 Tu envío está en camino</h2>
              <p>Hola <strong>${facturaData.remitente?.nombre}</strong>,</p>
              <p>Te informamos que el paquete que enviaste a <strong>${facturaData.destinatario?.nombre}</strong> ha salido para entrega.</p>

              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles del Envío</h3>
                <p><strong>Código de Tracking:</strong> ${facturaData.codigoTracking}</p>
                <p><strong>Destinatario:</strong> ${facturaData.destinatario?.nombre}</p>
                <p><strong>Dirección de Entrega:</strong> ${facturaData.destinatario?.direccion}</p>
                ${facturaData.destinatario?.telefono ? `<p><strong>Teléfono del Destinatario:</strong> ${facturaData.destinatario.telefono}</p>` : ''}
              </div>

              <p>El paquete llegará pronto a su destino. Te notificaremos cuando sea entregado.</p>
              <p>Gracias por confiar en nosotros.</p>
            `;

            const brandedHTMLRemitente = generateBrandedEmailHTML(contentRemitente, companyConfig, 'en_ruta', facturaData.codigoTracking);

            sendEmail(remitenteEmail, subjectRemitente, brandedHTMLRemitente, [], companyConfig)
              .then(() => console.log(`📧 Notificación enviada al REMITENTE: ${remitenteEmail}`))
              .catch(err => console.error(`❌ Error enviando a remitente:`, err.message));
          }
        } catch (error) {
          console.error(`❌ Error enviando notificación para factura ${facturaId}:`, error.message);
        }
      }
    }

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

    console.log(`🔍 DEBUG Guardando item ${itemIndex} con entregado=true:`, {
      descripcion: items[itemIndex].descripcion,
      entregado: items[itemIndex].entregado,
      fechaEntrega: items[itemIndex].fechaEntrega
    });

    await facturaRef.update({
      items,
      fechaActualizacion: new Date().toISOString()
    });

    console.log(`✅ Item ${itemIndex} guardado en Firestore`);

    // 🔄 ACTUALIZAR CONTADORES EN LA COLECCIÓN RUTAS
    // Buscar la ruta que contiene esta factura y actualizar itemsEntregadosRuta
    try {
      // Buscar rutas activas que contengan esta factura
      const rutasSnapshot = await db.collection('rutas')
        .where('companyId', '==', data.companyId)
        .where('estado', 'in', ['asignada', 'cargada', 'en_entrega'])
        .get();

      let rutaEncontrada = null;

      for (const rutaDoc of rutasSnapshot.docs) {
        const rutaData = rutaDoc.data();
        const tieneFactura = (rutaData.facturas || []).some(f => f.id === facturaId);

        if (tieneFactura) {
          rutaEncontrada = { id: rutaDoc.id, data: rutaData };
          break;
        }
      }

      if (rutaEncontrada) {
        // 🔄 CONTAR FACTURAS COMPLETAMENTE ENTREGADAS (no items individuales)
        let facturasEntregadas = 0;

        for (const factura of (rutaEncontrada.data.facturas || [])) {
          const facturaSnapshot = await db.collection('recolecciones').doc(factura.id).get();
          if (facturaSnapshot.exists) {
            const facturaData = facturaSnapshot.data();
            const items = facturaData.items || [];

            // Una factura está completamente entregada si TODOS sus items están entregados
            const todosEntregados = items.length > 0 && items.every(i => i.entregado === true);

            if (todosEntregados) {
              facturasEntregadas++;
            }
          }
        }

        // Actualizar el contador de FACTURAS entregadas en la ruta
        await db.collection('rutas').doc(rutaEncontrada.id).update({
          facturasEntregadas: facturasEntregadas,
          fechaActualizacion: new Date().toISOString()
        });

        console.log(`✅ Contador de ruta ${rutaEncontrada.id} actualizado: ${facturasEntregadas} facturas completamente entregadas`);
      } else {
        console.log('ℹ️ No se encontró ruta activa para esta factura');
      }
    } catch (rutaError) {
      console.warn('⚠️ No se pudo actualizar contador de ruta:', rutaError.message);
      // No fallar la operación principal si falla la actualización de ruta
    }

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

    // ✅ Validar que la factura no haya sido entregada ya
    if (data.estado === 'entregada' || data.estadoGeneral === 'entregada') {
      return res.status(400).json({
        success: false,
        message: 'Esta factura ya fue entregada anteriormente',
        fechaEntrega: data.fechaEntrega
      });
    }

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

    // ✅ Enviar correo de confirmación con información completa
    try {
      // Obtener configuración de la compañía
      let companyConfig = null;
      const companyId = data.companyId;
      if (companyId) {
        try {
          const companyDoc = await db.collection('companies').doc(companyId).get();
          if (companyDoc.exists) {
            companyConfig = companyDoc.data();
          }
        } catch (error) {
          console.error('⚠️ Error obteniendo configuración de compañía:', error.message);
        }
      }

      const destinatarioEmail = data.destinatario?.email;
      const remitenteEmail = data.remitente?.email;

      console.log(`📬 Datos de correo de entrega para ${data.codigoTracking}:`);
      console.log(`   Remitente: ${data.remitente?.nombre} (${remitenteEmail || 'sin email'})`);
      console.log(`   Destinatario: ${data.destinatario?.nombre} (${destinatarioEmail || 'sin email'})`);

      // 🔐 Generar URLs firmadas para las fotos (válidas por 7 días)
      console.log(`📸 Generando URLs públicas para ${fotosEntrega.length} fotos...`);
      console.log(`   URLs originales:`, fotosEntrega);
      const fotosPublicas = await getPublicUrls(fotosEntrega);
      console.log(`✅ URLs públicas generadas exitosamente:`, fotosPublicas);

      // Calcular totales de items
      const totalItems = data.items?.length || 0;
      const itemsEntregados = (data.items || []).filter(i => i.entregado).length;

      // ✅ ENVIAR CORREO AL DESTINATARIO (quien recibió)
      if (destinatarioEmail) {
        const subjectDestinatario = `✅ Entrega Exitosa - ${data.codigoTracking}`;
        const contentDestinatario = `
          <h2 style="color: #2c3e50; margin-top: 0;">✅ ¡Entrega Exitosa!</h2>
          <p>Hola <strong>${data.destinatario?.nombre}</strong>,</p>
          <p>El paquete que te envió <strong>${data.remitente?.nombre}</strong> ha sido entregado exitosamente.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles de la Entrega</h3>
            <p><strong>Código de Tracking:</strong> ${data.codigoTracking}</p>
            <p><strong>Remitente:</strong> ${data.remitente?.nombre}</p>
            <p><strong>Recibido por:</strong> ${nombreReceptor || data.destinatario?.nombre}</p>
            <p><strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-DO', {
              dateStyle: 'full',
              timeStyle: 'short'
            })}</p>
            <p><strong>Dirección:</strong> ${data.destinatario?.direccion}</p>
            <p><strong>Items Entregados:</strong> ${itemsEntregados} de ${totalItems}</p>
            ${data.pago?.estado === 'pagada' ? `<p><strong>Pago:</strong> ✅ Confirmado (${data.pago.metodoPago || 'N/A'})</p>` : ''}
            ${notasEntrega ? `<p><strong>Notas:</strong> ${notasEntrega}</p>` : ''}
          </div>

          ${fotosPublicas && fotosPublicas.length > 0 ? `
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">📸 Evidencia Fotográfica</h3>
            <p style="margin-bottom: 15px;">Se capturaron ${fotosPublicas.length} foto(s) como evidencia de la entrega:</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
              ${fotosPublicas.map((foto, idx) => `
                <div style="text-align: center;">
                  <img src="${foto}" alt="Evidencia ${idx + 1}" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                  <p style="margin-top: 5px; font-size: 12px; color: #666;">Foto ${idx + 1}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <p>Gracias por confiar en nosotros para tu envío.</p>
          <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta sobre tu entrega, no dudes en contactarnos.</p>
        `;

        const brandedHTMLDestinatario = generateBrandedEmailHTML(contentDestinatario, companyConfig, 'entregada', data.codigoTracking);

        await sendEmail(destinatarioEmail, subjectDestinatario, brandedHTMLDestinatario, [], companyConfig);
        console.log(`📧 Correo de entrega enviado al DESTINATARIO: ${destinatarioEmail}`);
      }

      // ✅ ENVIAR CORREO AL REMITENTE (quien envió)
      if (remitenteEmail) {
        const subjectRemitente = `✅ Paquete entregado a ${data.destinatario?.nombre} - ${data.codigoTracking}`;
        const contentRemitente = `
          <h2 style="color: #2c3e50; margin-top: 0;">✅ ¡Tu envío fue entregado!</h2>
          <p>Hola <strong>${data.remitente?.nombre}</strong>,</p>
          <p>Te confirmamos que el paquete que enviaste a <strong>${data.destinatario?.nombre}</strong> ha sido entregado exitosamente.</p>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Detalles de la Entrega</h3>
            <p><strong>Código de Tracking:</strong> ${data.codigoTracking}</p>
            <p><strong>Destinatario:</strong> ${data.destinatario?.nombre}</p>
            <p><strong>Recibido por:</strong> ${nombreReceptor || data.destinatario?.nombre}</p>
            <p><strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-DO', {
              dateStyle: 'full',
              timeStyle: 'short'
            })}</p>
            <p><strong>Dirección de Entrega:</strong> ${data.destinatario?.direccion}</p>
            <p><strong>Items Entregados:</strong> ${itemsEntregados} de ${totalItems}</p>
            ${data.pago?.estado === 'pagada' ? `<p><strong>Pago:</strong> ✅ Confirmado (${data.pago.metodoPago || 'N/A'})</p>` : ''}
          </div>

          ${fotosPublicas && fotosPublicas.length > 0 ? `
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">📸 Evidencia Fotográfica de la Entrega</h3>
            <p style="margin-bottom: 15px;">Se capturaron ${fotosPublicas.length} foto(s) como evidencia:</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
              ${fotosPublicas.map((foto, idx) => `
                <div style="text-align: center;">
                  <img src="${foto}" alt="Evidencia ${idx + 1}" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
                  <p style="margin-top: 5px; font-size: 12px; color: #666;">Foto ${idx + 1}</p>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <p>Gracias por confiar en nosotros para tus envíos.</p>
          <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
        `;

        const brandedHTMLRemitente = generateBrandedEmailHTML(contentRemitente, companyConfig, 'entregada', data.codigoTracking);

        await sendEmail(remitenteEmail, subjectRemitente, brandedHTMLRemitente, [], companyConfig);
        console.log(`📧 Correo de entrega enviado al REMITENTE: ${remitenteEmail}`);
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
// EXPORTAR FACTURAS DE RUTA PARA IMPRESIÓN
// ==========================================================================
export const exportarFacturasRutaParaImpresion = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const companyId = req.userData?.companyId;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log(`🖨️ Exportando facturas de ruta ${rutaId} para impresión`);

    // Obtener datos de la ruta
    const rutaRef = db.collection('rutas').doc(rutaId);
    const rutaDoc = await rutaRef.get();

    if (!rutaDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const rutaData = rutaDoc.data();

    // Verificar permisos
    if (rutaData.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta ruta'
      });
    }

    // Obtener configuración de la compañía (logo, nombre, etc.)
    let companyConfig = null;
    try {
      console.log(`🏢 Obteniendo configuración de compañía ID: ${companyId}`);
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        companyConfig = companyDoc.data();
        console.log(`✅ Compañía encontrada: ${companyConfig.nombre || companyConfig.name || 'Sin nombre'}`);
        console.log(`📷 Logo URL: ${companyConfig.invoiceDesign?.logoUrl || companyConfig.logo || 'Sin logo'}`);
      } else {
        console.warn(`⚠️ No se encontró compañía con ID: ${companyId}`);
      }
    } catch (error) {
      console.error('⚠️ Error obteniendo configuración de compañía:', error.message);
    }

    // Enriquecer facturas con información completa
    const facturasCompletas = [];
    if (rutaData.facturas && Array.isArray(rutaData.facturas)) {
      for (const factura of rutaData.facturas) {
        try {
          const facturaId = factura.id || factura.facturaId || factura.recoleccionId;
          if (!facturaId) continue;

          const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();
            facturasCompletas.push({
              id: facturaDoc.id,
              numeroFactura: facturaData.numeroFactura || facturaData.codigoTracking,
              codigoTracking: facturaData.codigoTracking,

              // Información del destinatario
              destinatario: {
                nombre: facturaData.destinatario?.nombre || '',
                telefono: facturaData.destinatario?.telefono || '',
                direccion: facturaData.destinatario?.direccion || '',
                sector: facturaData.destinatario?.sector || '',
                ciudad: facturaData.destinatario?.ciudad || '',
                provincia: facturaData.destinatario?.provincia || ''
              },

              // Información del remitente
              remitente: {
                nombre: facturaData.remitente?.nombre || '',
                telefono: facturaData.remitente?.telefono || ''
              },

              // Items
              items: (facturaData.items || []).map(item => ({
                descripcion: item.descripcion || '',
                cantidad: item.cantidad || 1,
                peso: item.peso || 0,
                entregado: item.entregado || false
              })),
              itemsTotal: facturaData.itemsTotal || (facturaData.items?.length || 0),
              itemsEntregados: (facturaData.items || []).filter(i => i.entregado).length,

              // Información de pago
              pago: {
                total: facturaData.pago?.total || 0,
                estado: facturaData.pago?.estado || 'pendiente',
                montoPagado: facturaData.pago?.montoPagado || 0,
                montoPendiente: facturaData.pago?.montoPendiente || (facturaData.pago?.total || 0),
                metodoPago: facturaData.pago?.metodoPago || '',
                referenciaPago: facturaData.pago?.referenciaPago || ''
              },

              // Estado
              estado: facturaData.estado || 'pendiente',
              estadoGeneral: facturaData.estadoGeneral || facturaData.estado || 'pendiente',

              // Notas
              notas: facturaData.notas || '',
              notasInternas: facturaData.notasInternas || '',

              // Fechas
              fechaCreacion: facturaData.fechaCreacion?.toDate?.() || facturaData.fechaCreacion,
              fechaEntrega: facturaData.fechaEntrega?.toDate?.() || facturaData.fechaEntrega
            });
          }
        } catch (error) {
          console.error(`❌ Error procesando factura ${factura.id}:`, error);
        }
      }
    }

    // Obtener información del repartidor
    let repartidorInfo = null;
    if (rutaData.repartidorId) {
      try {
        const repartidorDoc = await db.collection('usuarios').doc(rutaData.repartidorId).get();
        if (repartidorDoc.exists) {
          const repartidorData = repartidorDoc.data();
          repartidorInfo = {
            nombre: repartidorData.name || repartidorData.nombre || '',
            telefono: repartidorData.phone || repartidorData.telefono || ''
          };
        }
      } catch (error) {
        console.error('⚠️ Error obteniendo info del repartidor:', error.message);
      }
    }

    // Responder con todos los datos necesarios para la impresión
    res.json({
      success: true,
      data: {
        // Información de la ruta
        ruta: {
          id: rutaDoc.id,
          nombre: rutaData.nombre || '',
          zona: rutaData.zona || '',
          estado: rutaData.estado || '',
          fechaCreacion: rutaData.fechaCreacion?.toDate?.() || rutaData.fechaCreacion,
          fechaAsignacion: rutaData.fechaAsignacion?.toDate?.() || rutaData.fechaAsignacion,
          vehiculo: rutaData.vehiculo || '',
          repartidor: repartidorInfo
        },

        // Información de la compañía
        company: {
          nombre: companyConfig?.nombre || companyConfig?.name || 'Empresa',
          logo: companyConfig?.invoiceDesign?.logoUrl || companyConfig?.logo || '',
          telefono: companyConfig?.telefono || companyConfig?.phone || '',
          email: companyConfig?.emailConfig?.from || companyConfig?.adminEmail || companyConfig?.email || '',
          direccion: companyConfig?.direccion || companyConfig?.address || ''
        },

        // Facturas completas
        facturas: facturasCompletas,

        // Estadísticas
        stats: {
          totalFacturas: facturasCompletas.length,
          totalItems: facturasCompletas.reduce((sum, f) => sum + f.itemsTotal, 0),
          itemsEntregados: facturasCompletas.reduce((sum, f) => sum + f.itemsEntregados, 0),
          montoTotal: facturasCompletas.reduce((sum, f) => sum + (f.pago?.total || 0), 0),
          montoPendiente: facturasCompletas.reduce((sum, f) => sum + (f.pago?.montoPendiente || 0), 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error exportando facturas de ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al exportar facturas de ruta',
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
  finalizarRuta,
  exportarFacturasRutaParaImpresion
};