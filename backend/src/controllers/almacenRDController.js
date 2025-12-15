// backend/src/controllers/almacenRDController.js
// âœ… VERSIÃ“N DEFINITIVA - Lee itemsTotal/itemsMarcados desde recolecciones originales
// Sincroniza permanentemente entre contenedor y recolecciones

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, generateBrandedEmailHTML, generateTrackingButtonHTML } from '../services/notificationService.js';
import whatsappService from '../services/whatsappService.js';

// ========================================
// CONSTANTES DE ESTADOS
// ========================================
const ESTADOS_CONTENEDOR = {
  ABIERTO: 'abierto',
  EN_TRANSITO: 'en_transito_rd',
  RECIBIDO: 'recibido_rd',
  TRABAJADO: 'trabajado'
};

const ESTADOS_FACTURA = {
  PENDIENTE: 'pendiente',
  EN_CONTENEDOR: 'en_contenedor',
  EN_TRANSITO: 'en_transito',
  RECIBIDA: 'recibida_rd',
  EN_RUTA: 'en_ruta',
  ENTREGADA: 'entregada'
};

const ESTADOS_ITEMS = {
  PENDIENTE: 'pendiente',
  INCOMPLETO: 'incompleto',
  COMPLETO: 'completo'
};

const ESTADOS_PAGO = {
  PENDIENTE: 'pendiente',
  PARCIAL: 'parcial',
  PAGADA: 'pagada',
  CONTRAENTREGA: 'contraentrega'
};

// ========================================
// HELPER: Normalizar ID de factura
// ========================================
const normalizeFacturaRef = (factura) => {
  if (!factura) return null;
  return factura.id || factura.facturaId || factura.recoleccionId || null;
};

// ========================================
// HELPER: Calcular estado de items
// ========================================
const calcularEstadoItems = (itemsMarcados, itemsTotal) => {
  const marcados = Number(itemsMarcados) || 0;
  const total = Number(itemsTotal) || 0;

  if (marcados === 0 || total === 0) return ESTADOS_ITEMS.PENDIENTE;
  if (marcados === total) return ESTADOS_ITEMS.COMPLETO;
  return ESTADOS_ITEMS.INCOMPLETO;
};

// ========================================
// OBTENER CONTENEDORES EN TRÃNSITO
// ========================================
export const getContenedoresEnTransito = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('ðŸ“¦ Obteniendo contenedores en tránsito para company:', companyId);

    const snapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .where('estado', '==', ESTADOS_CONTENEDOR.EN_TRANSITO)
      .orderBy('fechaCierre', 'desc')
      .get();

    const contenedores = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        numeroContenedor: data.numeroContenedor,
        estado: data.estado,
        facturas: data.facturas || [],
        estadisticas: data.estadisticas || {},
        estadoFacturas: data.estadoFacturas || {},
        fechaCreacion: data.fechaCreacion?.toDate?.() || null,
        fechaCierre: data.fechaCierre?.toDate?.() || null,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || null,
        cerradoPor: data.cerradoPor || null,
        historial: data.historial || []
      };
    });

    console.log(`âœ… ${contenedores.length} contenedores en tránsito encontrados`);

    res.json({
      success: true,
      data: contenedores,
      total: contenedores.length
    });

  } catch (error) {
    console.error('âŒ Error obteniendo contenedores en tránsito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los contenedores',
      error: error.message
    });
  }
};

// ========================================
// OBTENER CONTENEDORES RECIBIDOS
// ========================================
export const getContenedoresRecibidos = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('ðŸ“¦ Obteniendo contenedores recibidos para company:', companyId);

    const snapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .where('estado', '==', ESTADOS_CONTENEDOR.RECIBIDO)
      .orderBy('fechaRecepcion', 'desc')
      .get();

    const contenedores = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        numeroContenedor: data.numeroContenedor,
        estado: data.estado,
        facturas: data.facturas || [],
        estadisticas: data.estadisticas || {},
        estadoFacturas: data.estadoFacturas || {},
        fechaCreacion: data.fechaCreacion?.toDate?.() || null,
        fechaCierre: data.fechaCierre?.toDate?.() || null,
        fechaRecepcion: data.fechaRecepcion?.toDate?.() || null,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || null,
        recibidoPor: data.recibidoPor || null,
        historial: data.historial || []
      };
    });

    console.log(`âœ… ${contenedores.length} contenedores recibidos encontrados`);

    res.json({
      success: true,
      data: contenedores,
      total: contenedores.length
    });

  } catch (error) {
    console.error('âŒ Error obteniendo contenedores recibidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los contenedores',
      error: error.message
    });
  }
};

// ========================================
// CONFIRMAR RECEPCIÃ“N DE CONTENEDOR
// âœ…âœ…âœ… SOLUCIÃ“N CRÃTICA APLICADA âœ…âœ…âœ…
// ========================================
export const confirmarRecepcion = async (req, res) => {
  try {
    // âœ… CORRECCIÃ“N 1: Leer contenedorId desde req.params
    const { contenedorId } = req.params;
    const { notas } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    // ValidaciÃ³n de parÃ¡metros
    if (!contenedorId || contenedorId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de contenedor requerido'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('ðŸ“¦ Confirmando recepciÃ³n de contenedor:', contenedorId);

    // Obtener contenedor
    const contenedorRef = db.collection('contenedores').doc(contenedorId.trim());
    const doc = await contenedorRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Contenedor no encontrado'
      });
    }

    const contenedor = doc.data();

    // Validar permisos
    if (contenedor.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a este contenedor'
      });
    }

    // Validar estado
    if (contenedor.estado !== ESTADOS_CONTENEDOR.EN_TRANSITO) {
      return res.status(400).json({
        success: false,
        message: `El contenedor no está en tránsito. Estado actual: ${contenedor.estado}`
      });
    }

    // Crear entrada de historial
    const historialEntry = {
      accion: 'confirmar_recepcion',
      descripcion: 'Contenedor recibido en almacén RD',
      usuario: usuarioId,
      fecha: new Date().toISOString(),
      notas: notas || ''
    };

    // Actualizar estado del contenedor
    await contenedorRef.update({
      estado: ESTADOS_CONTENEDOR.RECIBIDO,
      fechaRecepcion: FieldValue.serverTimestamp(),
      recibidoPor: usuarioId,
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log('âœ… Contenedor actualizado a estado recibido_rd');

    // âœ…âœ…âœ… SOLUCIÃ“N CRÃTICA: Actualizar facturas en batch âœ…âœ…âœ…
    const batch = db.batch();
    let facturasActualizadas = 0;
    let facturasConError = 0;
    const erroresDetallados = [];

    console.log('ðŸ” Procesando facturas del contenedor...');
    console.log(`Total de facturas en contenedor: ${contenedor.facturas?.length || 0}`);

    if (Array.isArray(contenedor.facturas) && contenedor.facturas.length > 0) {
      for (let i = 0; i < contenedor.facturas.length; i++) {
        const factura = contenedor.facturas[i];

        // Normalizar ID de factura
        const facturaId = normalizeFacturaRef(factura);

        if (!facturaId || typeof facturaId !== 'string' || facturaId.trim() === '') {
          console.warn(`âš ï¸ Factura #${i} sin ID vÃ¡lido en contenedor ${contenedorId}`);
          facturasConError++;
          erroresDetallados.push({
            indice: i,
            error: 'ID invÃ¡lido o vacÃ­o',
            factura: factura
          });
          continue;
        }

        try {
          // Obtener factura original desde recolecciones
          const recoleccionRef = db.collection('recolecciones').doc(facturaId.trim());
          const recoleccionDoc = await recoleccionRef.get();

          if (!recoleccionDoc.exists) {
            console.warn(`âš ï¸ RecolecciÃ³n ${facturaId} no existe en la base de datos`);
            facturasConError++;
            erroresDetallados.push({
              indice: i,
              facturaId: facturaId,
              error: 'Documento no existe en recolecciones'
            });
            continue;
          }

          // âœ…âœ…âœ… SOLUCIÃ“N DEFINITIVA: Leer desde la factura ORIGINAL âœ…âœ…âœ…
          const facturaOriginal = recoleccionDoc.data();

          // Leer itemsTotal desde la factura original (fuente de verdad)
          const itemsTotal = facturaOriginal.itemsTotal ??
            (Array.isArray(facturaOriginal.items) ? facturaOriginal.items.length : 0);

          // Leer itemsMarcados desde la factura original
          const itemsMarcados = facturaOriginal.itemsMarcados ?? 0;

          // Calcular estado de items basado en conteos reales
          const estadoItems = calcularEstadoItems(itemsMarcados, itemsTotal);
          const estadoFactura = (estadoItems === ESTADOS_ITEMS.COMPLETO) ? 'completa' : 'incompleta';

          console.log(`ðŸ“Š Factura ${facturaId}:`, {
            itemsTotal,
            historial: FieldValue.arrayUnion({
              accion: 'recibido_rd',
              descripcion: `Factura recibida en RD desde contenedor ${contenedor.numeroContenedor}`,
              itemsMarcados: itemsMarcados,
              itemsTotal: itemsTotal,
              estadoItems: estadoItems,
              contenedorId: contenedorId,
              numeroContenedor: contenedor.numeroContenedor || null,
              fecha: new Date().toISOString()
            })
          });

          facturasActualizadas++;
          console.log(`âœ… Factura ${facturaId} preparada: ${itemsMarcados}/${itemsTotal} items - ${estadoItems}`);

        } catch (error) {
          console.error(`âŒ Error procesando factura ${facturaId}:`, error.message);
          facturasConError++;
          erroresDetallados.push({
            indice: i,
            facturaId: facturaId,
            error: error.message
          });
        }
      }
    } else {
      console.warn('âš ï¸ Contenedor sin facturas o facturas no es un array');
    }

    // Ejecutar batch si hay operaciones
    if (facturasActualizadas > 0) {
      await batch.commit();
      console.log(`âœ… Batch ejecutado: ${facturasActualizadas} facturas actualizadas`);
    } else {
      console.warn('â„¹ï¸ No habÃ­a facturas vÃ¡lidas para actualizar');
    }

    // âœ… CORRECCIÃ“N 3: Devolver contenedor actualizado en la respuesta
    const contenedorDocActualizado = await contenedorRef.get();
    const contenedorActualizadoData = {
      id: contenedorDocActualizado.id,
      ...contenedorDocActualizado.data(),
      fechaRecepcion: contenedorDocActualizado.data().fechaRecepcion?.toDate?.() || null,
      fechaActualizacion: contenedorDocActualizado.data().fechaActualizacion?.toDate?.() || null
    };

    // Preparar respuesta
    const resultado = {
      contenedor: contenedorActualizadoData,
      resumen: {
        facturasActualizadas,
        facturasConError
      }
    };

    if (facturasConError > 0) {
      resultado.errores = erroresDetallados;
    }

    // âœ… ENVIAR NOTIFICACIÃ“N A TODOS LOS REMITENTES (en segundo plano)
    if (Array.isArray(contenedor.facturas) && contenedor.facturas.length > 0) {
      // Obtener configuración de la compañía
      let companyConfig = null;
      try {
        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (companyDoc.exists) {
          companyConfig = companyDoc.data();
        }
      } catch (error) {
        console.error('âš ï¸ Error obteniendo configuración de compañía:', error.message);
      }

      for (const factura of contenedor.facturas) {
        const facturaId = normalizeFacturaRef(factura);
        if (!facturaId) continue;

        try {
          const recoleccionDoc = await db.collection('recolecciones').doc(facturaId.trim()).get();
          if (!recoleccionDoc.exists) continue;

          const facturaData = recoleccionDoc.data();
          const destinatarioEmail = facturaData.destinatario?.email;
          const remitenteEmail = facturaData.remitente?.email;

          // Enviar correo al DESTINATARIO (quien recibe)
          if (destinatarioEmail) {
            const subject = `Tu paquete llego a RD - ${facturaData.codigoTracking}`;
            const contentHTML = `
              <h2 style="color: #2c3e50; margin-top: 0;">Tu paquete llego a Republica Dominicana</h2>
              <p>Hola <strong>${facturaData.destinatario?.nombre}</strong>,</p>
              <p>Tu paquete ha llegado a nuestro almacen en Republica Dominicana y esta siendo procesado.</p>

              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles del Envio</h3>
                <p><strong>Codigo de Tracking:</strong> ${facturaData.codigoTracking}</p>
                <p><strong>Contenedor:</strong> ${contenedor.numeroContenedor}</p>
                <p><strong>Destinatario:</strong> ${facturaData.destinatario?.nombre}</p>
                <p><strong>Direccion de Entrega:</strong> ${facturaData.destinatario?.direccion}</p>
              </div>

              <p>Pronto sera asignado a una ruta para su entrega final.</p>
              <p>Gracias por confiar en nosotros.</p>
            `;

            const brandedHTML = generateBrandedEmailHTML(contentHTML, companyConfig, 'recibida_rd', facturaData.codigoTracking);

            sendEmail(destinatarioEmail, subject, brandedHTML, [], companyConfig)
              .then(() => console.log(`Notificacion enviada al DESTINATARIO: ${destinatarioEmail} - Recibido en RD`))
              .catch(err => console.error(`Error enviando notificacion al destinatario:`, err.message));
          }

          // Enviar correo al REMITENTE (quien envia)
          if (remitenteEmail) {
            const subject = `Tu envio a ${facturaData.destinatario?.nombre} llego a RD - ${facturaData.codigoTracking}`;
            const contentHTML = `
              <h2 style="color: #2c3e50; margin-top: 0;">Tu envio llego a Republica Dominicana</h2>
              <p>Hola <strong>${facturaData.remitente?.nombre}</strong>,</p>
              <p>Te informamos que el paquete que enviaste a <strong>${facturaData.destinatario?.nombre}</strong> ha llegado a nuestro almacen en Republica Dominicana y esta siendo procesado.</p>

              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Detalles del Envio</h3>
                <p><strong>Codigo de Tracking:</strong> ${facturaData.codigoTracking}</p>
                <p><strong>Contenedor:</strong> ${contenedor.numeroContenedor}</p>
                <p><strong>Destinatario:</strong> ${facturaData.destinatario?.nombre}</p>
                <p><strong>Direccion de Entrega:</strong> ${facturaData.destinatario?.direccion}</p>
              </div>

              <p>Pronto sera asignado a una ruta para su entrega final.</p>
              <p>Gracias por confiar en nosotros.</p>
            `;

            const brandedHTML = generateBrandedEmailHTML(contentHTML, companyConfig, 'recibida_rd', facturaData.codigoTracking);

            sendEmail(remitenteEmail, subject, brandedHTML, [], companyConfig)
              .then(() => console.log(`Notificacion enviada al REMITENTE: ${remitenteEmail} - Recibido en RD`))
              .catch(err => console.error(`Error enviando notificacion al remitente:`, err.message));
          }
          // 🟢 NOTIFICACIÓN WHATSAPP AL DESTINATARIO
          const destTelefono = facturaData.destinatario?.telefono;
          if (destTelefono) {
            const mensajeWhatsapp = `🏭 *Recibido en RD*: ${facturaData.codigoTracking}\n\nHola *${facturaData.destinatario?.nombre}*,\n\n¡Buenas noticias! Tu paquete ha llegado a nuestro almacén en República Dominicana.\n\nPronto será procesado para entrega.`;
            whatsappService.sendMessage(companyId, destTelefono, mensajeWhatsapp).catch(e => console.error('Error WA Dest RD:', e));
          }

          // 🟢 NOTIFICACIÓN WHATSAPP AL REMITENTE
          const remTelefono = facturaData.remitente?.telefono;
          if (remTelefono) {
            const mensajeWhatsapp = `🏭 *Tu envío llegó a RD*: ${facturaData.codigoTracking}\n\nHola *${facturaData.remitente?.nombre}*,\n\nEl paquete enviado a ${facturaData.destinatario?.nombre} ya está en República Dominicana.\n\nTe mantendremos informado.`;
            whatsappService.sendMessage(companyId, remTelefono, mensajeWhatsapp).catch(e => console.error('Error WA Rem RD:', e));
          }

        } catch (error) {
          console.error(`âŒ Error enviando notificación para factura ${facturaId}:`, error.message);
        }
      }
    }

    res.json({
      success: true,
      message: facturasConError > 0
        ? `Recepción confirmada con ${facturasConError} error(es)`
        : 'Recepción confirmada exitosamente',
      data: resultado
    });

  } catch (error) {
    console.error('âŒ Error confirmando recepciÃ³n:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar la recepciÃ³n',
      error: error.message
    });
  }
};

// ========================================
// OBTENER DETALLE DE FACTURA
// ========================================
export const getDetalleFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const companyId = req.userData?.companyId;

    if (!facturaId || facturaId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura invÃ¡lido'
      });
    }

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const doc = await db.collection('recolecciones').doc(facturaId.trim()).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta factura'
      });
    }

    const facturaDetallada = {
      id: doc.id,
      codigoTracking: data.codigoTracking || '',
      remitente: data.remitente || {},
      destinatario: data.destinatario || {},
      items: data.items || [],
      itemsTotal: data.itemsTotal || 0,
      itemsMarcados: data.itemsMarcados || 0,
      estadoItems: data.estadoItems || ESTADOS_ITEMS.PENDIENTE,
      estadoFactura: data.estadoFactura || 'incompleta',
      itemsDanados: data.itemsDanados || [],
      facturacion: data.facturacion || {},
      pago: data.pago || {
        estado: ESTADOS_PAGO.PENDIENTE,
        montoPagado: 0,
        montoPendiente: data.facturacion?.total || 0
      },
      estado: data.estado || ESTADOS_FACTURA.PENDIENTE,
      contenedorId: data.contenedorId || null,
      numeroContenedor: data.numeroContenedor || null,
      rutaId: data.rutaId || null,
      repartidorId: data.repartidorId || null,
      fechaAsignacionRuta: data.fechaAsignacionRuta?.toDate?.() || null,
      reporteIncompleto: data.reporteIncompleto || null,
      notas: data.notas || '',
      fotos: data.fotos || [],
      historial: data.historial || [],
      fechaCreacion: data.fechaCreacion?.toDate?.() || null,
      fechaActualizacion: data.fechaActualizacion?.toDate?.() || null
    };

    res.json({ success: true, data: facturaDetallada });

  } catch (error) {
    console.error('âŒ Error obteniendo detalle de factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el detalle de la factura',
      error: error.message
    });
  }
};

// ========================================
// EDITAR INFORMACIÃ“N DE PAGO
// ========================================
export const editarPago = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { estado, metodoPago, montoPagado, referenciaPago, notasPago } = req.body;

    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;
    const rol = req.userData?.rol;

    if (!facturaId || facturaId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura invÃ¡lido'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const rolesPermitidos = ['admin_general', 'admin_almacen_rd', 'secretaria', 'repartidor'];

    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para editar informaciÃ³n de pago'
      });
    }

    const estadosPermitidos = Object.values(ESTADOS_PAGO);
    if (estado && !estadosPermitidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado de pago no vÃ¡lido. Valores permitidos: ${estadosPermitidos.join(', ')}`
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId.trim());
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta factura'
      });
    }

    const montoTotal = data.facturacion?.total || 0;
    const nuevoMontoPagado = montoPagado !== undefined ? parseFloat(montoPagado) : (data.pago?.montoPagado || 0);
    const montoPendiente = Math.max(0, montoTotal - nuevoMontoPagado);

    let estadoPago = estado;
    if (!estadoPago) {
      if (nuevoMontoPagado >= montoTotal) {
        estadoPago = ESTADOS_PAGO.PAGADA;
      } else if (nuevoMontoPagado > 0) {
        estadoPago = ESTADOS_PAGO.PARCIAL;
      } else {
        estadoPago = ESTADOS_PAGO.PENDIENTE;
      }
    }

    const historialPago = {
      monto: nuevoMontoPagado,
      metodoPago: metodoPago || data.pago?.metodoPago || '',
      referencia: referenciaPago || '',
      fecha: new Date().toISOString(),
      usuario: usuarioId,
      rol: rol,
      notas: notasPago || ''
    };

    const updateData = {
      'pago.estado': estadoPago,
      'pago.montoPagado': nuevoMontoPagado,
      'pago.montoPendiente': montoPendiente,
      'pago.fechaPago': new Date().toISOString(),
      fechaActualizacion: FieldValue.serverTimestamp()
    };

    if (metodoPago) updateData['pago.metodoPago'] = metodoPago;
    if (referenciaPago) updateData['pago.referenciaPago'] = referenciaPago;
    if (notasPago) updateData['pago.notasPago'] = notasPago;

    updateData['pago.historialPagos'] = FieldValue.arrayUnion(historialPago);

    const historialEntry = {
      accion: 'edicion_pago',
      descripcion: `InformaciÃ³n de pago actualizada: ${estadoPago}`,
      monto: nuevoMontoPagado,
      estadoPago: estadoPago,
      usuario: usuarioId,
      rol: rol,
      fecha: new Date().toISOString()
    };
    updateData.historial = FieldValue.arrayUnion(historialEntry);

    await facturaRef.update(updateData);

    res.json({
      success: true,
      message: 'InformaciÃ³n de pago actualizada correctamente',
      data: {
        facturaId,
        codigoTracking: data.codigoTracking,
        pago: {
          estado: estadoPago,
          montoPagado: nuevoMontoPagado,
          montoPendiente: montoPendiente,
          montoTotal: montoTotal,
          metodoPago: metodoPago || data.pago?.metodoPago || '',
          referenciaPago: referenciaPago || '',
          fechaPago: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('âŒ Error editando informaciÃ³n de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al editar la informaciÃ³n de pago',
      error: error.message
    });
  }
};

// ========================================
// ASIGNAR FACTURA A RUTA
// ========================================
export const asignarFacturaARuta = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { ruta } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!facturaId || facturaId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura invÃ¡lido'
      });
    }

    if (!ruta || ruta.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Ruta requerida'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId.trim());
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta factura'
      });
    }

    if (data.estado !== ESTADOS_FACTURA.RECIBIDA) {
      return res.status(400).json({
        success: false,
        message: `La factura debe estar en estado "recibida" para asignarla a una ruta. Estado actual: ${data.estado}`
      });
    }

    const historialEntry = {
      accion: 'asignar_ruta',
      descripcion: `Factura asignada a ruta ${ruta}`,
      ruta: ruta.trim(),
      usuario: usuarioId,
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      rutaAsignada: ruta.trim(),
      fechaAsignacionRuta: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    res.json({
      success: true,
      message: 'Factura asignada a ruta exitosamente',
      data: {
        facturaId,
        codigoTracking: data.codigoTracking,
        ruta: ruta.trim()
      }
    });

  } catch (error) {
    console.error('âŒ Error asignando factura a ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar la factura a la ruta',
      error: error.message
    });
  }
};
// ========================================
// REASIGNAR FACTURA A NUEVA RUTA
// ========================================
export const reasignarFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { nuevaRuta, motivo } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!facturaId || facturaId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura invÃ¡lido'
      });
    }

    if (!nuevaRuta || nuevaRuta.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'La nueva ruta es requerida'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId.trim());
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta factura'
      });
    }

    const historialEntry = {
      accion: 'reasignar_ruta',
      descripcion: 'Factura reasignada a una nueva ruta',
      rutaAnterior: data.rutaAsignada || null,
      nuevaRuta: nuevaRuta.trim(),
      motivo: motivo || '',
      usuario: usuarioId,
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      rutaAsignada: nuevaRuta.trim(),
      fechaAsignacionRuta: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    res.json({
      success: true,
      message: 'Factura reasignada a nueva ruta exitosamente',
      data: {
        facturaId,
        codigoTracking: data.codigoTracking,
        nuevaRuta: nuevaRuta.trim()
      }
    });

  } catch (error) {
    console.error('âŒ Error reasignando factura:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reasignar la factura',
      error: error.message
    });
  }
};

// ========================================
// QUITAR FACTURA DE RUTA
// ========================================
export const quitarFacturaDeRuta = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { motivo } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!facturaId || facturaId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura invÃ¡lido'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId.trim());
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta factura'
      });
    }

    if (!data.rutaAsignada) {
      return res.status(400).json({
        success: false,
        message: 'La factura no está asignada a ninguna ruta'
      });
    }

    const historialEntry = {
      accion: 'quitar_ruta',
      descripcion: 'Factura removida de ruta de entrega',
      rutaAnterior: data.rutaAsignada,
      motivo: motivo || '',
      usuario: usuarioId,
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      rutaAsignada: null,
      fechaAsignacionRuta: null,
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    res.json({
      success: true,
      message: 'Factura removida de ruta exitosamente',
      data: {
        facturaId,
        codigoTracking: data.codigoTracking
      }
    });

  } catch (error) {
    console.error('âŒ Error quitando factura de ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al quitar la factura de la ruta',
      error: error.message
    });
  }
};

// ========================================
// MARCAR ITEM COMO DAÃ‘ADO
// ========================================
export const marcarItemDanado = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex, danado, notasDano } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!facturaId || facturaId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura invÃ¡lido'
      });
    }

    if (itemIndex === undefined || itemIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Ãndice de item requerido'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId.trim());
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta factura'
      });
    }

    if (!Array.isArray(data.items) || itemIndex < 0 || itemIndex >= data.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Ãndice de item invÃ¡lido'
      });
    }

    const item = data.items[itemIndex];

    const itemDanado = {
      itemIndex,
      item: {
        cantidad: item.cantidad || 0,
        descripcion: item.descripcion || '',
        precio: item.precio || 0
      },
      danado: !!danado,
      notasDano: notasDano || '',
      reportadoPor: usuarioId,
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: danado ? 'item_danado' : 'item_normal',
      descripcion: danado
        ? `Item marcado como daÃ±ado: ${item.descripcion}`
        : `Item marcado como normal: ${item.descripcion}`,
      itemIndex,
      usuario: usuarioId,
      fecha: new Date().toISOString()
    };

    const updateData = {
      historial: FieldValue.arrayUnion(historialEntry),
      fechaActualizacion: FieldValue.serverTimestamp()
    };

    if (danado) {
      updateData.itemsDanados = FieldValue.arrayUnion(itemDanado);
    } else {
      // Remover de items daÃ±ados si se marca como normal
      const itemsDanadosActuales = data.itemsDanados || [];
      const itemsDanadosFiltrados = itemsDanadosActuales.filter(
        id => id.itemIndex !== itemIndex
      );
      updateData.itemsDanados = itemsDanadosFiltrados;
    }

    await facturaRef.update(updateData);

    res.json({
      success: true,
      message: danado ? 'Item marcado como daÃ±ado' : 'Item marcado como normal',
      data: itemDanado
    });

  } catch (error) {
    console.error('âŒ Error marcando item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar el item',
      error: error.message
    });
  }
};

// ========================================
// REPORTAR FACTURA COMO INCOMPLETA
// ========================================
export const reportarFacturaIncompleta = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { motivo, itemsFaltantes } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!facturaId || facturaId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ID de factura invÃ¡lido'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId.trim());
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para acceder a esta factura'
      });
    }

    const reporte = {
      motivo: motivo || '',
      itemsFaltantes: itemsFaltantes || [],
      reportadoPor: usuarioId,
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: 'reporte_incompleta',
      descripcion: 'Factura reportada como incompleta',
      motivo: motivo || '',
      usuario: usuarioId,
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      estadoItems: ESTADOS_ITEMS.INCOMPLETO,
      estadoFactura: 'incompleta',
      reporteIncompleto: reporte,
      historial: FieldValue.arrayUnion(historialEntry),
      fechaActualizacion: FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Factura reportada como incompleta',
      data: reporte
    });

  } catch (error) {
    console.error('âŒ Error reportando factura incompleta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reportar la factura',
      error: error.message
    });
  }
};

// ========================================
// OBTENER ESTADÃSTICAS DEL ALMACÃ‰N RD
// ========================================
export const getEstadisticasAlmacenRD = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    console.log('ðŸ“Š Calculando estadÃ­sticas del almacén RD');

    const contenedoresSnapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .get();

    const facturasSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('estado', 'in', [
        ESTADOS_FACTURA.RECIBIDA,
        ESTADOS_FACTURA.EN_RUTA,
        ESTADOS_FACTURA.ENTREGADA
      ])
      .get();

    const estadisticas = {
      contenedores: {
        total: contenedoresSnapshot.size,
        enTransito: 0,
        recibidos: 0,
        trabajados: 0
      },
      facturas: {
        total: facturasSnapshot.size,
        recibidas: 0,
        enRuta: 0,
        entregadas: 0,
        completas: 0,
        incompletas: 0,
        conItemsDanados: 0
      },
      items: {
        total: 0,
        marcados: 0,
        pendientes: 0,
        danados: 0
      },
      pagos: {
        pendientes: 0,
        parciales: 0,
        pagadas: 0,
        contraentrega: 0
      },
      montos: {
        total: 0,
        pagado: 0,
        pendiente: 0
      }
    };

    contenedoresSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.estado === ESTADOS_CONTENEDOR.EN_TRANSITO) {
        estadisticas.contenedores.enTransito++;
      } else if (data.estado === ESTADOS_CONTENEDOR.RECIBIDO) {
        estadisticas.contenedores.recibidos++;
      } else if (data.estado === ESTADOS_CONTENEDOR.TRABAJADO) {
        estadisticas.contenedores.trabajados++;
      }
    });

    facturasSnapshot.forEach(doc => {
      const data = doc.data();

      if (data.estado === ESTADOS_FACTURA.RECIBIDA) {
        estadisticas.facturas.recibidas++;
      } else if (data.estado === ESTADOS_FACTURA.EN_RUTA) {
        estadisticas.facturas.enRuta++;
      } else if (data.estado === ESTADOS_FACTURA.ENTREGADA) {
        estadisticas.facturas.entregadas++;
      }

      if (data.estadoItems === ESTADOS_ITEMS.COMPLETO) {
        estadisticas.facturas.completas++;
      } else if (data.estadoItems === ESTADOS_ITEMS.INCOMPLETO) {
        estadisticas.facturas.incompletas++;
      }

      if (data.itemsDanados && data.itemsDanados.length > 0) {
        estadisticas.facturas.conItemsDanados++;
        estadisticas.items.danados += data.itemsDanados.length;
      }

      const itemsTotal = data.itemsTotal || 0;
      const itemsMarcados = data.itemsMarcados || 0;
      estadisticas.items.total += itemsTotal;
      estadisticas.items.marcados += itemsMarcados;
      estadisticas.items.pendientes += (itemsTotal - itemsMarcados);

      const estadoPago = data.pago?.estado || ESTADOS_PAGO.PENDIENTE;
      if (estadoPago === ESTADOS_PAGO.PENDIENTE) {
        estadisticas.pagos.pendientes++;
      } else if (estadoPago === ESTADOS_PAGO.PARCIAL) {
        estadisticas.pagos.parciales++;
      } else if (estadoPago === ESTADOS_PAGO.PAGADA) {
        estadisticas.pagos.pagadas++;
      } else if (estadoPago === ESTADOS_PAGO.CONTRAENTREGA) {
        estadisticas.pagos.contraentrega++;
      }

      estadisticas.montos.total += data.facturacion?.total || 0;
      estadisticas.montos.pagado += data.pago?.montoPagado || 0;
      estadisticas.montos.pendiente += data.pago?.montoPendiente || (data.facturacion?.total || 0);
    });

    estadisticas.montos.total = parseFloat(estadisticas.montos.total.toFixed(2));
    estadisticas.montos.pagado = parseFloat(estadisticas.montos.pagado.toFixed(2));
    estadisticas.montos.pendiente = parseFloat(estadisticas.montos.pendiente.toFixed(2));

    console.log('âœ… EstadÃ­sticas calculadas');

    res.json({ success: true, data: estadisticas });

  } catch (error) {
    console.error('âŒ Error obteniendo estadÃ­sticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las estadÃ­sticas',
      error: error.message
    });
  }
};

// ========================================
// EXPORTAR TODAS LAS FUNCIONES
// ========================================
export default {
  getContenedoresEnTransito,
  getContenedoresRecibidos,
  confirmarRecepcion,
  getDetalleFactura,
  editarPago,
  asignarFacturaARuta,
  reasignarFactura,
  quitarFacturaDeRuta,
  marcarItemDanado,
  reportarFacturaIncompleta,
  getEstadisticasAlmacenRD
};
