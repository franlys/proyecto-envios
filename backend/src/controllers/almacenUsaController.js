// backend/src/controllers/almacenUsaController.js
// ✅ VERSIÓN CORREGIDA - SINCRONIZACIÓN PERMANENTE

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, generateBrandedEmailHTML } from '../services/notificationService.js';
import { generarNumeroContenedor } from '../utils/trackingUtils.js';
import whatsappService from '../services/whatsappService.js';

// Estados válidos del sistema
const ESTADOS_CONTENEDOR = {
  ABIERTO: 'abierto',
  EN_TRANSITO: 'en_transito_rd', // Estado después de cerrar en USA
  RECIBIDO: 'recibido_rd',
  TRABAJADO: 'trabajado'
};

const ESTADOS_FACTURA = {
  PENDIENTE: 'pendiente',
  EN_CONTENEDOR: 'en_contenedor',
  EN_TRANSITO: 'en_transito', // Estado que se asigna al cerrar el contenedor
  RECIBIDA: 'recibida',
  ENTREGADA: 'entregada'
};

const ESTADOS_ITEMS = {
  PENDIENTE: 'pendiente',
  INCOMPLETO: 'incompleto',
  COMPLETO: 'completo'
};

// ========================================
// CREAR NUEVO CONTENEDOR
// ========================================
export const crearContenedor = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    // ✅ GENERACIÓN AUTOMÁTICA DE ID
    const nuevoNumero = await generarNumeroContenedor(companyId);

    // Validar generación
    if (!nuevoNumero) {
      throw new Error('No se pudo generar el número de contenedor');
    }

    const contenedorRef = db.collection('contenedores').doc();
    const contenedorId = contenedorRef.id;

    const contenedorData = {
      id: contenedorId,
      companyId,
      numeroContenedor: nuevoNumero,
      facturas: [],
      estado: ESTADOS_CONTENEDOR.ABIERTO,
      estadoFacturas: { completas: 0, incompletas: 0, total: 0 },
      estadisticas: { totalFacturas: 0, totalItems: 0, itemsMarcados: 0, montoTotal: 0 },
      creadoPor: usuarioId,
      fechaCreacion: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: [{
        accion: 'creacion',
        descripcion: 'Contenedor creado',
        usuario: usuarioId,
        fecha: new Date().toISOString()
      }]
    };

    await contenedorRef.set(contenedorData);
    res.status(201).json({
      success: true,
      message: 'Contenedor creado exitosamente',
      message: 'Contenedor creado exitosamente',
      data: { id: contenedorId, numeroContenedor: nuevoNumero, estado: ESTADOS_CONTENEDOR.ABIERTO }
    });
  } catch (error) {
    console.error('Error creando contenedor:', error);
    res.status(500).json({ success: false, message: 'Error al crear el contenedor', error: error.message });
  }
};

// ========================================
// BUSCAR FACTURA POR CÓDIGO DE TRACKING
// ========================================
export const buscarFactura = async (req, res) => {
  try {
    const { codigoTracking } = req.params;
    const companyId = req.userData?.companyId;

    console.log('🔍 Buscando factura:', codigoTracking);
    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('codigoTracking', '==', codigoTracking)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: 'No se encontró ninguna factura con ese código' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log('✅ Factura encontrada:', { id: doc.id, codigoTracking: data.codigoTracking, itemsCount: data.items?.length || 0 });

    if (data.contenedorId) {
      return res.status(400).json({
        success: false,
        message: 'Esta factura ya está asignada a un contenedor',
        contenedorId: data.contenedorId,
        numeroContenedor: data.numeroContenedor
      });
    }

    const facturaCompleta = {
      id: doc.id,
      codigoTracking: data.codigoTracking,
      remitente: data.remitente || {},
      destinatario: data.destinatario || {},
      items: data.items || [],
      itemsTotal: data.itemsTotal || 0,
      itemsMarcados: data.itemsMarcados || 0,
      facturacion: data.facturacion || {},
      estado: data.estado,
      estadoItems: data.estadoItems || ESTADOS_ITEMS.PENDIENTE,
      fechaCreacion: data.fechaCreacion?.toDate?.() || null
    };

    res.json({ success: true, data: facturaCompleta });
  } catch (error) {
    console.error('Error buscando factura:', error);
    res.status(500).json({ success: false, message: 'Error al buscar la factura', error: error.message });
  }
};

// ========================================
// AGREGAR FACTURA AL CONTENEDOR
// ========================================
export const agregarFactura = async (req, res) => {
  try {
    const { contenedorId } = req.params;
    const { facturaId } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!facturaId) {
      return res.status(400).json({ success: false, message: 'ID de factura requerido' });
    }

    console.log('📦 Agregando factura al contenedor:', { contenedorId, facturaId });

    const result = await db.runTransaction(async (transaction) => {
      const contenedorRef = db.collection('contenedores').doc(contenedorId);
      const contenedorDoc = await transaction.get(contenedorRef);
      if (!contenedorDoc.exists) { throw new Error('CONTENEDOR_NO_ENCONTRADO'); }
      const contenedor = contenedorDoc.data();

      if (contenedor.companyId !== companyId) { throw new Error('SIN_PERMISOS'); }
      if (contenedor.estado !== ESTADOS_CONTENEDOR.ABIERTO) { throw new Error('CONTENEDOR_NO_ABIERTO'); }

      const facturaRef = db.collection('recolecciones').doc(facturaId);
      const facturaDoc = await transaction.get(facturaRef);
      if (!facturaDoc.exists) { throw new Error('FACTURA_NO_ENCONTRADA'); }
      const factura = facturaDoc.data();

      if (!factura.items || factura.items.length === 0) { throw new Error('FACTURA_SIN_ITEMS'); }
      if (factura.companyId !== companyId) { throw new Error('SIN_PERMISOS_FACTURA'); }
      if (factura.contenedorId) { throw new Error('FACTURA_YA_EN_CONTENEDOR'); }

      // ✅ COPIAR ITEMS COMPLETOS CON TODOS LOS CAMPOS
      const itemsCompletos = (factura.items || []).map(item => ({
        cantidad: item.cantidad,
        descripcion: item.descripcion,
        precio: item.precio,
        marcado: false
      }));
      console.log('✅ Items preparados:', itemsCompletos.length);

      const facturaParaContenedor = {
        id: facturaId,
        codigoTracking: factura.codigoTracking,
        remitente: factura.remitente || {},
        destinatario: factura.destinatario || {},

        // ✅✅✅ CRÍTICO: GUARDAR ITEMS COMPLETOS ✅✅✅
        items: itemsCompletos,
        itemsTotal: itemsCompletos.length,
        itemsMarcados: 0,
        estadoItems: ESTADOS_ITEMS.PENDIENTE,

        facturacion: factura.facturacion || {},
        pago: factura.pago || {},
        fechaAgregada: new Date().toISOString()
      };

      const facturasActualizadas = [...(contenedor.facturas || []), facturaParaContenedor];

      const estadisticasActualizadas = {
        totalFacturas: facturasActualizadas.length,
        totalItems: facturasActualizadas.reduce((sum, f) => sum + (f.itemsTotal || 0), 0),
        itemsMarcados: facturasActualizadas.reduce((sum, f) => sum + (f.itemsMarcados || 0), 0),
        montoTotal: facturasActualizadas.reduce((sum, f) => sum + (f.facturacion?.total || 0), 0)
      };

      const historialEntry = {
        accion: 'agregar_factura',
        descripcion: `Factura ${factura.codigoTracking} agregada`,
        facturaId,
        codigoTracking: factura.codigoTracking,
        itemsCount: itemsCompletos.length,
        usuario: usuarioId,
        fecha: new Date().toISOString()
      };

      // 1. Actualizar la "copia" en el contenedor
      transaction.update(contenedorRef, {
        facturas: facturasActualizadas,
        estadisticas: estadisticasActualizadas,
        fechaActualizacion: FieldValue.serverTimestamp(),
        historial: FieldValue.arrayUnion(historialEntry)
      });

      // 2. ✅✅✅ SOLUCIÓN PERMANENTE: Sincronizar desde el inicio ✅✅✅
      transaction.update(facturaRef, {
        contenedorId,
        numeroContenedor: contenedor.numeroContenedor,
        estado: ESTADOS_FACTURA.EN_CONTENEDOR,
        estadoGeneral: ESTADOS_FACTURA.EN_CONTENEDOR, // ✅ Sincronizar estadoGeneral

        // Guardar conteos REALES desde el principio
        itemsTotal: itemsCompletos.length,
        itemsMarcados: 0,
        estadoItems: ESTADOS_ITEMS.PENDIENTE,

        fechaActualizacion: FieldValue.serverTimestamp(),
        historial: FieldValue.arrayUnion({
          accion: 'agregada_a_contenedor',
          descripcion: `Agregada al contenedor ${contenedor.numeroContenedor}`,
          contenedorId,
          usuario: usuarioId,
          fecha: new Date().toISOString()
        })
      });

      return {
        contenedorId,
        facturaId,
        codigoTracking: factura.codigoTracking,
        itemsTotal: itemsCompletos.length,
        estadisticas: estadisticasActualizadas
      };
    });

    console.log('✅ Factura agregada exitosamente');

    // ✅ ENVIAR NOTIFICACIÓN AL REMITENTE (en segundo plano)
    const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
    const facturaData = facturaDoc.data();
    const remitenteEmail = facturaData.remitente?.email;

    if (remitenteEmail) {
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

      const subject = `📦 En Contenedor - Almacén USA - ${facturaData.codigoTracking}`;
      const contentHTML = `
        <h2 style="color: #2c3e50; margin-top: 0;">📦 En Contenedor - Almacén USA</h2>
        <p>Hola <strong>${facturaData.remitente?.nombre}</strong>,</p>
        <p>Tu paquete ha sido colocado en un contenedor en nuestro almacén de USA y pronto será enviado.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Detalles del Envío</h3>
          <p><strong>Código de Tracking:</strong> ${facturaData.codigoTracking}</p>
          <p><strong>Contenedor:</strong> ${result.contenedorId}</p>
          <p><strong>Destinatario:</strong> ${facturaData.destinatario?.nombre}</p>
          <p><strong>Dirección de Entrega:</strong> ${facturaData.destinatario?.direccion}</p>
        </div>

        <p>Gracias por confiar en nosotros.</p>
      `;

      const brandedHTML = generateBrandedEmailHTML(contentHTML, companyConfig, 'en_contenedor_usa', facturaData.codigoTracking);

      sendEmail(remitenteEmail, subject, brandedHTML, [], companyConfig)
        .then(() => console.log(`📧 Notificación EMAIL enviada a ${remitenteEmail} - Factura agregada a contenedor`))
        .catch(err => console.error(`❌ Error enviando notificación:`, err.message));
    }

    // 📲 Enviar notificación WhatsApp al remitente
    const remitenteTelefono = facturaData.remitente?.telefono;
    if (remitenteTelefono) {
      const mensajeWhatsapp = `📦 *En Contenedor - Almacén USA*\n\nHola *${facturaData.remitente?.nombre}*,\n\nTu paquete *${facturaData.codigoTracking}* ha sido colocado en el contenedor y pronto será enviado a República Dominicana.\n\n📦 Contenedor: ${result.contenedorId}\n👤 Destinatario: ${facturaData.destinatario?.nombre}\n📍 Dirección: ${facturaData.destinatario?.direccion}\n\nTe notificaremos cuando el contenedor salga en tránsito.\n\nGracias por confiar en nosotros.`;

      whatsappService.sendMessage(companyId, remitenteTelefono, mensajeWhatsapp)
        .then(() => console.log(`📲 Notificación WHATSAPP enviada al remitente: ${remitenteTelefono}`))
        .catch(e => console.error('❌ Error WA Remitente EnContenedor:', e));
    }

    res.json({
      success: true,
      message: 'Factura agregada al contenedor exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error agregando factura:', error);
    const errorMessages = {
      'CONTENEDOR_NO_ENCONTRADO': 'Contenedor no encontrado',
      'SIN_PERMISOS': 'No tiene permisos',
      'CONTENEDOR_NO_ABIERTO': 'El contenedor no está abierto',
      'FACTURA_NO_ENCONTRADA': 'Factura no encontrada',
      'SIN_PERMISOS_FACTURA': 'No tiene permisos',
      'FACTURA_YA_EN_CONTENEDOR': 'Esta factura ya está en un contenedor',
      'FACTURA_SIN_ITEMS': 'No se puede agregar una factura sin items'
    };
    const message = errorMessages[error.message] || 'Error al agregar la factura al contenedor';
    res.status(400).json({ success: false, message, error: error.message });
  }
};

// ========================================
// MARCAR/DESMARCAR UNIDAD INDIVIDUAL
// ========================================
export const marcarUnidadIndividual = async (req, res) => {
  try {
    console.log('--- 🚀 MARCAR UNIDAD INDIVIDUAL ---');

    const { contenedorId } = req.params;
    const { facturaId, itemIndex, unidadIndex } = req.body;
    const companyId = req.userData?.companyId;

    const result = await db.runTransaction(async (transaction) => {
      const contenedorRef = db.collection('contenedores').doc(contenedorId);
      const contenedorDoc = await transaction.get(contenedorRef);

      if (!contenedorDoc.exists) { throw new Error('CONTENEDOR_NO_ENCONTRADO'); }
      const contenedor = contenedorDoc.data();

      if (contenedor.companyId !== companyId) { throw new Error('SIN_PERMISOS'); }
      if (contenedor.estado !== ESTADOS_CONTENEDOR.ABIERTO) { throw new Error('CONTENEDOR_NO_ABIERTO'); }

      const facturaIndex = (contenedor.facturas || []).findIndex(f => f.id === facturaId);
      if (facturaIndex === -1) { throw new Error('FACTURA_NO_ENCONTRADA'); }

      const facturasActualizadas = JSON.parse(JSON.stringify(contenedor.facturas || []));
      const factura = facturasActualizadas[facturaIndex];

      if (!Array.isArray(factura.items) || itemIndex < 0 || itemIndex >= factura.items.length) {
        throw new Error('ITEM_INVALIDO');
      }

      const item = factura.items[itemIndex];

      // Inicializar estructura de unidades si no existe
      if (!item.unidades || !Array.isArray(item.unidades)) {
        item.unidades = [];
        for (let i = 0; i < item.cantidad; i++) {
          item.unidades.push({
            numero: i + 1,
            marcado: false,
            fechaMarcado: null
          });
        }
      }

      // Validar índice de unidad
      if (unidadIndex < 0 || unidadIndex >= item.unidades.length) {
        throw new Error('UNIDAD_INVALIDA');
      }

      // Toggle marcado de la unidad
      const unidad = item.unidades[unidadIndex];
      unidad.marcado = !unidad.marcado;
      unidad.fechaMarcado = unidad.marcado ? new Date().toISOString() : null;

      // Contar unidades marcadas en este item
      const unidadesMarcadasItem = item.unidades.filter(u => u.marcado).length;
      item.marcado = unidadesMarcadasItem === item.cantidad; // Item completo solo si todas sus unidades están marcadas

      // Calcular estadísticas a nivel de factura (UNIDADES FÍSICAS, no items)
      let totalUnidadesFisicas = 0;
      let unidadesMarcadas = 0;

      factura.items.forEach(itm => {
        const cantidadUnidades = itm.cantidad || 1;
        totalUnidadesFisicas += cantidadUnidades;

        if (itm.unidades && Array.isArray(itm.unidades)) {
          unidadesMarcadas += itm.unidades.filter(u => u.marcado).length;
        }
      });

      // Actualizar estadísticas de factura
      factura.itemsTotal = factura.items.length; // Total de ITEMS (líneas)
      factura.unidadesTotales = totalUnidadesFisicas; // Total de UNIDADES FÍSICAS
      factura.itemsMarcados = factura.items.filter(i => i.marcado).length; // Items COMPLETOS
      factura.unidadesMarcadas = unidadesMarcadas; // Unidades físicas marcadas

      // Estado de factura basado en UNIDADES
      if (unidadesMarcadas === 0) {
        factura.estadoItems = ESTADOS_ITEMS.PENDIENTE;
      } else if (unidadesMarcadas === totalUnidadesFisicas) {
        factura.estadoItems = ESTADOS_ITEMS.COMPLETO;
      } else {
        factura.estadoItems = ESTADOS_ITEMS.INCOMPLETO;
      }

      // Calcular estadísticas globales del contenedor
      const estadisticasActualizadas = {
        totalFacturas: facturasActualizadas.length,
        totalItems: facturasActualizadas.reduce((sum, f) => sum + (f.itemsTotal || 0), 0),
        totalUnidades: facturasActualizadas.reduce((sum, f) => sum + (f.unidadesTotales || 0), 0),
        itemsMarcados: facturasActualizadas.reduce((sum, f) => sum + (f.itemsMarcados || 0), 0),
        unidadesMarcadas: facturasActualizadas.reduce((sum, f) => sum + (f.unidadesMarcadas || 0), 0),
        montoTotal: facturasActualizadas.reduce((sum, f) => sum + (f.facturacion?.total || 0), 0)
      };

      // Actualizar contenedor
      transaction.update(contenedorRef, {
        facturas: facturasActualizadas,
        estadisticas: estadisticasActualizadas,
        fechaActualizacion: FieldValue.serverTimestamp()
      });

      // Sincronizar a recolecciones
      const recoleccionRef = db.collection('recolecciones').doc(facturaId);
      transaction.update(recoleccionRef, {
        itemsMarcados: factura.itemsMarcados,
        itemsTotal: factura.itemsTotal,
        unidadesTotales: factura.unidadesTotales,
        unidadesMarcadas: factura.unidadesMarcadas,
        estadoItems: factura.estadoItems,
        fechaActualizacion: FieldValue.serverTimestamp()
      });

      return {
        facturaId,
        itemIndex,
        unidadIndex,
        unidadMarcada: unidad.marcado,
        unidadesMarcadasItem: unidadesMarcadasItem,
        totalUnidadesItem: item.cantidad,
        unidadesMarcadas: factura.unidadesMarcadas,
        unidadesTotales: factura.unidadesTotales,
        estadoItems: factura.estadoItems,
        estadisticas: estadisticasActualizadas
      };
    });

    res.json({
      success: true,
      message: result.unidadMarcada ? 'Unidad marcada' : 'Unidad desmarcada',
      data: result
    });
  } catch (error) {
    console.error('Error marcando unidad:', error);
    const errorMessages = {
      'CONTENEDOR_NO_ENCONTRADO': 'Contenedor no encontrado',
      'SIN_PERMISOS': 'No tiene permisos',
      'CONTENEDOR_NO_ABIERTO': 'El contenedor no está abierto',
      'FACTURA_NO_ENCONTRADA': 'Factura no encontrada en el contenedor',
      'ITEM_INVALIDO': 'Índice de item inválido',
      'UNIDAD_INVALIDA': 'Índice de unidad inválido'
    };
    const message = errorMessages[error.message] || 'Error al marcar la unidad';
    res.status(400).json({ success: false, message, error: error.message });
  }
};

// ========================================
// MARCAR/DESMARCAR ITEM (Legacy - mantener para compatibilidad)
// ========================================
export const marcarItem = async (req, res) => {
  try {
    console.log('--- 🚀 EJECUTANDO MARCAR ITEM (LEGACY) ---');

    const { contenedorId } = req.params;
    const { facturaId, itemIndex, marcado } = req.body;
    const companyId = req.userData?.companyId;

    const result = await db.runTransaction(async (transaction) => {
      const contenedorRef = db.collection('contenedores').doc(contenedorId);
      const contenedorDoc = await transaction.get(contenedorRef);

      if (!contenedorDoc.exists) { throw new Error('CONTENEDOR_NO_ENCONTRADO'); }
      const contenedor = contenedorDoc.data();

      if (contenedor.companyId !== companyId) { throw new Error('SIN_PERMISOS'); }
      if (contenedor.estado !== ESTADOS_CONTENEDOR.ABIERTO) { throw new Error('CONTENEDOR_NO_ABIERTO'); }

      const facturaIndex = (contenedor.facturas || []).findIndex(f => f.id === facturaId);
      if (facturaIndex === -1) { throw new Error('FACTURA_NO_ENCONTRADA'); }

      const facturasActualizadas = JSON.parse(JSON.stringify(contenedor.facturas || []));
      const factura = facturasActualizadas[facturaIndex];

      if (!Array.isArray(factura.items) || itemIndex < 0 || itemIndex >= factura.items.length) {
        throw new Error('ITEM_INVALIDO');
      }

      // Actualizar marcado
      factura.items[itemIndex].marcado = !!marcado;
      factura.itemsMarcados = factura.items.filter(item => item.marcado).length;

      if (factura.itemsMarcados === 0) {
        factura.estadoItems = ESTADOS_ITEMS.PENDIENTE;
      } else if (factura.itemsMarcados === factura.itemsTotal) {
        factura.estadoItems = ESTADOS_ITEMS.COMPLETO;
      } else {
        factura.estadoItems = ESTADOS_ITEMS.INCOMPLETO;
      }

      const estadisticasActualizadas = {
        totalFacturas: facturasActualizadas.length,
        totalItems: facturasActualizadas.reduce((sum, f) => sum + (f.itemsTotal || 0), 0),
        itemsMarcados: facturasActualizadas.reduce((sum, f) => sum + (f.itemsMarcados || 0), 0),
        montoTotal: facturasActualizadas.reduce((sum, f) => sum + (f.facturacion?.total || 0), 0)
      };

      // 1. Actualizar la "copia" en el contenedor
      transaction.update(contenedorRef, {
        facturas: facturasActualizadas,
        estadisticas: estadisticasActualizadas,
        fechaActualizacion: FieldValue.serverTimestamp()
      });

      // 2. ✅✅✅ SOLUCIÓN PERMANENTE: Sincronizar a recolecciones ✅✅✅
      const recoleccionRef = db.collection('recolecciones').doc(facturaId);
      transaction.update(recoleccionRef, {
        itemsMarcados: factura.itemsMarcados,
        itemsTotal: factura.itemsTotal,
        estadoItems: factura.estadoItems,
        fechaActualizacion: FieldValue.serverTimestamp()
      });

      return {
        facturaId,
        itemIndex,
        marcado: !!marcado,
        itemsMarcados: factura.itemsMarcados,
        itemsTotal: factura.itemsTotal,
        estadoItems: factura.estadoItems,
        estadisticas: estadisticasActualizadas
      };
    });

    res.json({
      success: true,
      message: marcado ? 'Item marcado' : 'Item desmarcado',
      data: result
    });
  } catch (error) {
    console.error('Error marcando item:', error);
    const errorMessages = {
      'CONTENEDOR_NO_ENCONTRADO': 'Contenedor no encontrado',
      'SIN_PERMISOS': 'No tiene permisos',
      'CONTENEDOR_NO_ABIERTO': 'El contenedor no está abierto',
      'FACTURA_NO_ENCONTRADA': 'Factura no encontrada en el contenedor',
      'ITEM_INVALIDO': 'Índice de item inválido'
    };
    const message = errorMessages[error.message] || 'Error al marcar el item';
    res.status(400).json({ success: false, message, error: error.message });
  }
};

// ========================================
// QUITAR FACTURA DEL CONTENEDOR
// ========================================
export const quitarFactura = async (req, res) => {
  try {
    const { contenedorId, facturaId } = req.params;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    const result = await db.runTransaction(async (transaction) => {
      const contenedorRef = db.collection('contenedores').doc(contenedorId);
      const contenedorDoc = await transaction.get(contenedorRef);
      if (!contenedorDoc.exists) { throw new Error('CONTENEDOR_NO_ENCONTRADO'); }
      const contenedor = contenedorDoc.data();

      if (contenedor.companyId !== companyId) { throw new Error('SIN_PERMISOS'); }
      if (contenedor.estado !== ESTADOS_CONTENEDOR.ABIERTO) { throw new Error('CONTENEDOR_NO_ABIERTO'); }

      const facturaIndex = (contenedor.facturas || []).findIndex(f => f.id === facturaId);
      if (facturaIndex === -1) { throw new Error('FACTURA_NO_ENCONTRADA'); }

      const facturaRemovida = contenedor.facturas[facturaIndex];
      const facturasActualizadas = (contenedor.facturas || []).filter(f => f.id !== facturaId);

      const estadisticasActualizadas = {
        totalFacturas: facturasActualizadas.length,
        totalItems: facturasActualizadas.reduce((sum, f) => sum + (f.itemsTotal || 0), 0),
        itemsMarcados: facturasActualizadas.reduce((sum, f) => sum + (f.itemsMarcados || 0), 0),
        montoTotal: facturasActualizadas.reduce((sum, f) => sum + (f.facturacion?.total || 0), 0)
      };

      const historialEntry = {
        accion: 'quitar_factura',
        descripcion: `Factura ${facturaRemovida.codigoTracking} removida`,
        facturaId,
        codigoTracking: facturaRemovida.codigoTracking,
        itemsMarcadosAntes: facturaRemovida.itemsMarcados,
        usuario: usuarioId,
        fecha: new Date().toISOString()
      };

      transaction.update(contenedorRef, {
        facturas: facturasActualizadas,
        estadisticas: estadisticasActualizadas,
        fechaActualizacion: FieldValue.serverTimestamp(),
        historial: FieldValue.arrayUnion(historialEntry)
      });

      const recoleccionRef = db.collection('recolecciones').doc(facturaId);
      const recoleccionDoc = await transaction.get(recoleccionRef);

      if (recoleccionDoc.exists) {
        const estadoOriginal = recoleccionDoc.data().estadoOriginal || ESTADOS_FACTURA.PENDIENTE;

        transaction.update(recoleccionRef, {
          contenedorId: null,
          numeroContenedor: null,
          estado: estadoOriginal,
          estadoGeneral: estadoOriginal, // ✅ Sincronizar estadoGeneral
          itemsMarcados: 0,
          estadoItems: ESTADOS_ITEMS.PENDIENTE,
          fechaActualizacion: FieldValue.serverTimestamp(),
          historial: FieldValue.arrayUnion({
            accion: 'removida_de_contenedor',
            descripcion: `Removida del contenedor ${contenedor.numeroContenedor}`,
            itemsMarcadosAntes: facturaRemovida.itemsMarcados,
            usuario: usuarioId,
            fecha: new Date().toISOString()
          })
        });
      }

      return {
        facturaId,
        codigoTracking: facturaRemovida.codigoTracking,
        estadisticas: estadisticasActualizadas
      };
    });

    res.json({
      success: true,
      message: 'Factura removida del contenedor',
      data: result
    });

  } catch (error) {
    console.error('Error quitando factura:', error);
    const errorMessages = {
      'CONTENEDOR_NO_ENCONTRADO': 'Contenedor no encontrado',
      'SIN_PERMISOS': 'No tiene permisos',
      'CONTENEDOR_NO_ABIERTO': 'El contenedor no está abierto',
      'FACTURA_NO_ENCONTRADA': 'Factura no encontrada en el contenedor'
    };
    const message = errorMessages[error.message] || 'Error al quitar la factura';
    res.status(400).json({ success: false, message, error: error.message });
  }
};

// ========================================
// CERRAR CONTENEDOR
// ========================================
// ==========================================================================
// 🔴 CERRAR CONTENEDOR (Con Transacción Atómica - Anti Race Condition)
// ==========================================================================
export const cerrarContenedor = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;
    const { forzarCierre } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    console.log(`🔒 Intentando cerrar contenedor: ${contenedorId} (Transacción)`);

    const contenedorRef = db.collection('contenedores').doc(contenedorId);
    let contenedorDataPostTransaction = null;

    // ✅ EJECUTAR LÓGICA DE CIERRE EN TRANSACCIÓN
    await db.runTransaction(async (transaction) => {
      const contenedorDoc = await transaction.get(contenedorRef);

      if (!contenedorDoc.exists) {
        throw new Error('Contenedor no encontrado');
      }

      const contenedor = contenedorDoc.data();

      // 1. Validaciones dentro de la transacción (Consistencia)
      if (contenedor.companyId !== companyId) {
        throw new Error('No tiene permisos para cerrar este contenedor');
      }
      if (contenedor.estado !== ESTADOS_CONTENEDOR.ABIERTO) {
        throw new Error(`El contenedor no está abierto (Estado: ${contenedor.estado})`);
      }
      if (!contenedor.facturas || contenedor.facturas.length === 0) {
        throw new Error('No se puede cerrar un contenedor vacío');
      }

      const facturasIncompletas = (contenedor.facturas || []).filter(
        f => f.estadoItems === ESTADOS_ITEMS.INCOMPLETO || f.estadoItems === ESTADOS_ITEMS.PENDIENTE
      );

      if (facturasIncompletas.length > 0 && !forzarCierre) {
        const error = new Error('Hay facturas con items sin marcar');
        error.code = 'FACTURAS_INCOMPLETAS';
        throw error;
      }

      const estadoFacturas = {
        completas: (contenedor.facturas || []).filter(f => f.estadoItems === ESTADOS_ITEMS.COMPLETO).length,
        incompletas: (contenedor.facturas || []).filter(f => f.estadoItems !== ESTADOS_ITEMS.COMPLETO).length,
        total: (contenedor.facturas || []).length
      };

      const historialEntry = {
        accion: 'cerrar_contenedor',
        descripcion: `Contenedor cerrado en USA`,
        facturasCompletas: estadoFacturas.completas,
        facturasIncompletas: estadoFacturas.incompletas,
        forzado: !!forzarCierre,
        usuario: usuarioId,
        fecha: new Date().toISOString()
      };

      // 2. Actualizar Contenedor
      transaction.update(contenedorRef, {
        estado: ESTADOS_CONTENEDOR.EN_TRANSITO,
        estadoFacturas,
        fechaCierre: FieldValue.serverTimestamp(),
        fechaActualizacion: FieldValue.serverTimestamp(),
        cerradoPor: usuarioId,
        historial: FieldValue.arrayUnion(historialEntry)
      });

      // 3. Actualizar Facturas
      // Nota: Iteramos para actualizar cada doc individualmente en la transacción.
      // Firestore tiene límite de 500 operaciones por tx. Asumimos < 500.
      for (const factura of contenedor.facturas || []) {
        if (!factura || !factura.id) continue;
        const recoleccionRef = db.collection('recolecciones').doc(factura.id.trim());

        transaction.update(recoleccionRef, {
          estado: ESTADOS_FACTURA.EN_TRANSITO,
          estadoGeneral: ESTADOS_FACTURA.EN_TRANSITO,
          estadoItems: factura.estadoItems || ESTADOS_ITEMS.COMPLETO,
          fechaActualizacion: FieldValue.serverTimestamp(),
          historial: FieldValue.arrayUnion({
            accion: 'contenedor_cerrado',
            descripcion: `Contenedor ${contenedor.numeroContenedor} cerrado y en tránsito a RD`,
            estadoItems: factura.estadoItems,
            fecha: new Date().toISOString()
          })
        });
      }

      // Guardamos datos para usar DESPUÉS de commitear (Notificaciones)
      contenedorDataPostTransaction = { ...contenedor, estadoFacturas };
    });

    console.log(`✅ Transacción de cierre exitosa para ${contenedorId}`);

    // ==============================================================
    // 📨 NOTIFICACIONES (FUERA DE LA TRANSACCIÓN)
    // ==============================================================
    // Solo llegamos aquí si la transacción fue exitosa (commit).
    // Si falla, tira error y no envía spam.

    const contenedor = contenedorDataPostTransaction;

    // 1. Notificar a Almacén RD
    try {
      const { default: whatsappNotificationService } = await import('../services/whatsappNotificationService.js');
      await whatsappNotificationService.notifyAlmacenRDContenedorEnTransito(companyId, {
        numeroContenedor: contenedor.numeroContenedor,
        totalFacturas: contenedor.facturas?.length || 0,
        facturasCompletas: contenedor.estadoFacturas.completas,
        facturasIncompletas: contenedor.estadoFacturas.incompletas,
        fechaCierre: new Date().toISOString()
      });
    } catch (error) {
      console.error('⚠️ Error notificando almacén RD (No crítico):', error.message);
    }

    // 2. Notificaciones a Clientes (Background)
    if (contenedor.facturas && Array.isArray(contenedor.facturas)) {
      // Ejecutar en background sin await para no bloquear respuesta
      (async () => {
        let companyConfig = null;
        try {
          const companyDoc = await db.collection('companies').doc(companyId).get();
          if (companyDoc.exists) companyConfig = companyDoc.data();
        } catch (e) { console.error('Error config company:', e); }

        for (const factura of contenedor.facturas) {
          if (!factura?.id) continue;
          try {
            const recDoc = await db.collection('recolecciones').doc(factura.id).get();
            if (!recDoc.exists) continue;
            const fData = recDoc.data();

            // Email Remitente
            if (fData.remitente?.email) {
              const subject = `🚢 En Tránsito a República Dominicana - ${fData.codigoTracking}`;
              const content = `<h2 style="color: #2c3e50;">🚢 En Tránsito a RD</h2><p>Tu paquete ${fData.codigoTracking} va en camino en el contenedor ${contenedor.numeroContenedor}.</p>`;
              const html = generateBrandedEmailHTML(content, companyConfig, 'en_transito_rd', fData.codigoTracking);
              sendEmail(fData.remitente.email, subject, html, [], companyConfig).catch(e => console.error(e));
            }

            // WhatsApps
            if (fData.remitente?.telefono) {
              const msg = `🚢 *En Tránsito a RD*: ${fData.codigoTracking}\n\nTu paquete va en camino en el contenedor *${contenedor.numeroContenedor}*.`;
              whatsappService.sendMessage(companyId, fData.remitente.telefono, msg).catch(e => console.error(e));
            }
            if (fData.destinatario?.telefono) {
              const msg = `🚢 *Paquete en Camino*: ${fData.codigoTracking}\n\nEl paquete de ${fData.remitente?.nombre} va en camino a RD.`;
              whatsappService.sendMessage(companyId, fData.destinatario.telefono, msg).catch(e => console.error(e));
            }

          } catch (err) {
            console.error(`Error notif factura ${factura.id}:`, err.message);
          }
        }
      })();
    }

    res.json({
      success: true,
      message: 'Contenedor cerrado exitosamente y en tránsito a RD',
      data: {
        contenedorId,
        numeroContenedor: contenedor.numeroContenedor,
        estado: ESTADOS_CONTENEDOR.EN_TRANSITO,
        estadoFacturas: contenedor.estadoFacturas
      }
    });

  } catch (error) {
    console.error('❌ Error cerrando contenedor:', error);
    if (error.code === 'FACTURAS_INCOMPLETAS') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: 'Error al cerrar el contenedor',
      error: error.message
    });
  }
};

// ========================================
// OBTENER CONTENEDORES
// ========================================
export const getContenedores = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    const { estado } = req.query;

    let query = db.collection('contenedores')
      .where('companyId', '==', companyId);

    if (estado) {
      query = query.where('estado', '==', estado);
    }

    const snapshot = await query.orderBy('fechaCreacion', 'desc').get();

    const contenedores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      fechaCreacion: doc.data().fechaCreacion?.toDate?.() || null,
      fechaCierre: doc.data().fechaCierre?.toDate?.() || null,
      fechaActualizacion: doc.data().fechaActualizacion?.toDate?.() || null
    }));

    res.json({
      success: true,
      data: contenedores,
      total: contenedores.length
    });

  } catch (error) {
    console.error('Error obteniendo contenedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los contenedores',
      error: error.message
    });
  }
};

// ========================================
// OBTENER CONTENEDOR POR ID
// ========================================
export const getContenedorById = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.userData?.companyId;

    const doc = await db.collection('contenedores').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Contenedor no encontrado' });
    }

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({ success: false, message: 'No tiene permisos' });
    }

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...data,
        fechaCreacion: data.fechaCreacion?.toDate?.() || null,
        fechaCierre: data.fechaCierre?.toDate?.() || null,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || null
      }
    });

  } catch (error) {
    console.error('Error obteniendo contenedor:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el contenedor', error: error.message });
  }
};

// ========================================
// MARCAR CONTENEDOR COMO TRABAJADO
// ========================================
export const marcarTrabajado = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    const contenedorRef = db.collection('contenedores').doc(contenedorId);
    const contenedorDoc = await contenedorRef.get();

    if (!contenedorDoc.exists) {
      return res.status(404).json({ success: false, message: 'Contenedor no encontrado' });
    }
    const contenedor = contenedorDoc.data();

    if (contenedor.companyId !== companyId) {
      return res.status(403).json({ success: false, message: 'No tiene permisos' });
    }

    if (contenedor.estado !== ESTADOS_CONTENEDOR.RECIBIDO) {
      return res.status(400).json({ success: false, message: 'El contenedor no ha sido recibido' });
    }

    const historialEntry = {
      accion: 'marcar_trabajado',
      descripcion: 'Contenedor marcado como trabajado',
      usuario: usuarioId,
      fecha: new Date().toISOString()
    };

    await contenedorRef.update({
      estado: ESTADOS_CONTENEDOR.TRABAJADO,
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    res.json({
      success: true,
      message: 'Contenedor marcado como trabajado exitosamente',
      data: { id: contenedorId, estado: ESTADOS_CONTENEDOR.TRABAJADO }
    });

  } catch (error) {
    console.error('Error marcando contenedor como trabajado:', error);
    res.status(500).json({ success: false, message: 'Error al marcar el contenedor', error: error.message });
  }
};

// ========================================
// OBTENER ESTADÍSTICAS DEL ALMACÉN
// ========================================
export const getEstadisticasAlmacen = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    const contenedoresSnapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .get();

    const stats = {
      contenedoresAbiertos: 0,
      contenedoresEnTransito: 0,
      contenedoresRecibidos: 0,
      contenedoresTrabajados: 0,
      totalFacturas: 0,
      totalItems: 0
    };

    contenedoresSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.estado === ESTADOS_CONTENEDOR.ABIERTO) stats.contenedoresAbiertos++;
      if (data.estado === ESTADOS_CONTENEDOR.EN_TRANSITO) stats.contenedoresEnTransito++;
      if (data.estado === ESTADOS_CONTENEDOR.RECIBIDO) stats.contenedoresRecibidos++;
      if (data.estado === ESTADOS_CONTENEDOR.TRABAJADO) stats.contenedoresTrabajados++;

      stats.totalFacturas += (data.facturas || []).length;
      stats.totalItems += (data.facturas || []).reduce((sum, f) => sum + (f.itemsTotal || 0), 0);
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
  }
};

export default {
  crearContenedor,
  buscarFactura,
  agregarFactura,
  marcarItem,
  quitarFactura,
  cerrarContenedor,
  getContenedores,
  getContenedorById,
  marcarTrabajado,
  getEstadisticasAlmacen
};