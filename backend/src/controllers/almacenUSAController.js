// backend/src/controllers/almacenUSAController.js
// ✅ VERSIÓN CORREGIDA - SINCRONIZACIÓN PERMANENTE

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// Estados válidos del sistema
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
    const { numeroContenedor } = req.body;
    const companyId = req.userData?.companyId;
    const usuarioId = req.userData?.uid;

    if (!numeroContenedor || numeroContenedor.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El número de contenedor es requerido'
      });
    }

    if (!companyId || !usuarioId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const existente = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .where('numeroContenedor', '==', numeroContenedor.trim())
      .get();

    if (!existente.empty) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un contenedor con ese número'
      });
    }

    const contenedorRef = db.collection('contenedores').doc();
    const contenedorId = contenedorRef.id;

    const contenedorData = {
      id: contenedorId,
      companyId,
      numeroContenedor: numeroContenedor.trim(),
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
      data: { id: contenedorId, numeroContenedor: numeroContenedor.trim(), estado: ESTADOS_CONTENEDOR.ABIERTO }
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
// MARCAR/DESMARCAR ITEM
// ========================================
export const marcarItem = async (req, res) => {
  try {
    console.log('--- 🚀 EJECUTANDO MARCAR ITEM ---');

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
export const cerrarContenedor = async (req, res) => {
  try {
    const { id: contenedorId } = req.params;
    const { forzarCierre } = req.body;
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
    if (contenedor.estado !== ESTADOS_CONTENEDOR.ABIERTO) { 
      return res.status(400).json({ success: false, message: 'El contenedor no está abierto' }); 
    }
    if (!contenedor.facturas || contenedor.facturas.length === 0) { 
      return res.status(400).json({ success: false, message: 'No se puede cerrar un contenedor vacío' }); 
    }

    const facturasIncompletas = (contenedor.facturas || []).filter(
      f => f.estadoItems === ESTADOS_ITEMS.INCOMPLETO || f.estadoItems === ESTADOS_ITEMS.PENDIENTE
    );
    if (facturasIncompletas.length > 0 && !forzarCierre) {
      return res.status(400).json({
        success: false,
        message: 'Hay facturas con items sin marcar'
      });
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

    await contenedorRef.update({
      estado: ESTADOS_CONTENEDOR.EN_TRANSITO,
      estadoFacturas,
      fechaCierre: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      cerradoPor: usuarioId,
      historial: FieldValue.arrayUnion(historialEntry)
    });

    const batch = db.batch();
    let facturasActualizadas = 0;
    let facturasConError = 0;

    if (contenedor.facturas && Array.isArray(contenedor.facturas)) {
      for (const factura of contenedor.facturas) {
        if (!factura || !factura.id || typeof factura.id !== 'string' || factura.id.trim() === '') {
          console.warn(`⚠️ Factura sin ID válido en ${contenedorId}`);
          facturasConError++;
          continue;
        }

        try {
          const recoleccionRef = db.collection('recolecciones').doc(factura.id.trim());
          const recoleccionDoc = await recoleccionRef.get();

          if (recoleccionDoc.exists) {
            batch.update(recoleccionRef, {
              estado: ESTADOS_FACTURA.EN_TRANSITO,
              estadoItems: factura.estadoItems || ESTADOS_ITEMS.COMPLETO,
              fechaActualizacion: FieldValue.serverTimestamp(),
              historial: FieldValue.arrayUnion({
                accion: 'contenedor_cerrado',
                descripcion: `Contenedor ${contenedor.numeroContenedor} cerrado y en tránsito a RD`,
                estadoItems: factura.estadoItems,
                fecha: new Date().toISOString()
              })
            });
            facturasActualizadas++;
          } else {
            console.warn(`⚠️ Recolección ${factura.id.trim()} no existe`);
            facturasConError++;
          }
        } catch (error) {
          console.error(`❌ Error en factura ${factura.id.trim()}:`, error.message);
          facturasConError++;
        }
      }
    }

    if (facturasActualizadas > 0) {
      await batch.commit();
    }

    console.log(`✅ Contenedor ${contenedorId} cerrado: ${facturasActualizadas}/${(contenedor.facturas || []).length} facturas`);

    res.json({
      success: true,
      message: 'Contenedor cerrado exitosamente y en tránsito a RD',
      data: {
        contenedorId,
        numeroContenedor: contenedor.numeroContenedor,
        estado: ESTADOS_CONTENEDOR.EN_TRANSITO,
        estadoFacturas,
        estadisticas: contenedor.estadisticas,
        facturasActualizadas,
        facturasConError
      }
    });

  } catch (error) {
    console.error('❌ Error cerrando contenedor:', error);
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
// OBTENER ESTADÍSTICAS DEL ALMACÉN USA
// ========================================
export const getEstadisticasAlmacen = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    const contenedoresSnapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .get();

    const recoleccionesSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('contenedorId', '==', null)
      .get();

    const estadisticas = {
      contenedores: {
        total: contenedoresSnapshot.size,
        abiertos: 0,
        cerrados: 0,
        enTransito: 0
      },
      facturas: {
        disponibles: recoleccionesSnapshot.size,
        enContenedores: 0,
        totalProcesadas: 0
      },
      items: {
        total: 0,
        marcados: 0,
        porMarcar: 0
      },
      montos: {
        total: 0
      }
    };

    contenedoresSnapshot.forEach(doc => {
      const data = doc.data();

      if (data.estado === ESTADOS_CONTENEDOR.ABIERTO) {
        estadisticas.contenedores.abiertos++;
      } else if (data.estado === ESTADOS_CONTENEDOR.EN_TRANSITO) {
        estadisticas.contenedores.enTransito++;
      } else {
        estadisticas.contenedores.cerrados++;
      }

      if (data.estadisticas) {
        estadisticas.facturas.enContenedores += data.estadisticas.totalFacturas || 0;
        estadisticas.items.total += data.estadisticas.totalItems || 0;
        estadisticas.items.marcados += data.estadisticas.itemsMarcados || 0;
        estadisticas.montos.total += data.estadisticas.montoTotal || 0;
      }
    });

    estadisticas.items.porMarcar = estadisticas.items.total - estadisticas.items.marcados;
    estadisticas.facturas.totalProcesadas = estadisticas.facturas.disponibles + estadisticas.facturas.enContenedores;
    estadisticas.montos.total = parseFloat(estadisticas.montos.total.toFixed(2));

    res.json({ success: true, data: estadisticas });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener las estadísticas', error: error.message });
  }
};