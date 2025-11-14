// backend/src/models/Contenedor.js
// ✅ CORREGIDO: Ahora guarda los items completos al agregar facturas

import { db } from '../config/firebase.js';

// ========================================
// CONSTANTES
// ========================================

export const ESTADOS_CONTENEDOR = {
  ABIERTO_USA: 'abierto_usa',
  CERRADO_USA: 'cerrado_usa',
  EN_TRANSITO_RD: 'en_transito_rd',
  RECIBIDO_RD: 'recibido_rd',
  PROCESADO_RD: 'procesado_rd'
};

export const ESTADO_FACTURA_EN_CONTENEDOR = {
  INCOMPLETA: 'incompleta',
  COMPLETA: 'completa'
};

// ========================================
// CLASE CONTENEDOR
// ========================================

class Contenedor {
  constructor(data) {
    this.id = data.id || null;
    this.numeroContenedor = data.numeroContenedor;
    this.estado = data.estado || ESTADOS_CONTENEDOR.ABIERTO_USA;
    this.companyId = data.companyId;
    this.creadoPor = data.creadoPor;
    this.cerradoPor = data.cerradoPor || null;
    this.recibidoPor = data.recibidoPor || null;
    
    // Facturas agregadas al contenedor
    this.facturas = data.facturas || [];
    
    // Estadísticas
    this.totalFacturas = data.totalFacturas || 0;
    this.facturasCompletas = data.facturasCompletas || 0;
    this.facturasIncompletas = data.facturasIncompletas || 0;
    this.totalItems = data.totalItems || 0;
    this.itemsIncluidos = data.itemsIncluidos || 0;
    this.itemsFaltantes = data.itemsFaltantes || 0;
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.fechaCierre = data.fechaCierre || null;
    this.fechaRecepcion = data.fechaRecepcion || null;
  }
  
  /**
   * Actualiza las estadísticas del contenedor basándose en las facturas
   */
  actualizarEstadisticas() {
    this.totalFacturas = this.facturas.length;
    this.facturasCompletas = this.facturas.filter(f => f.estadoFactura === ESTADO_FACTURA_EN_CONTENEDOR.COMPLETA).length;
    this.facturasIncompletas = this.facturas.filter(f => f.estadoFactura === ESTADO_FACTURA_EN_CONTENEDOR.INCOMPLETA).length;
    
    this.totalItems = this.facturas.reduce((sum, f) => sum + f.totalItems, 0);
    this.itemsIncluidos = this.facturas.reduce((sum, f) => sum + f.itemsIncluidos.length, 0);
    this.itemsFaltantes = this.totalItems - this.itemsIncluidos;
    
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * Convierte el objeto a formato Firestore
   */
  toFirestore() {
    return {
      numeroContenedor: this.numeroContenedor,
      estado: this.estado,
      companyId: this.companyId,
      creadoPor: this.creadoPor,
      cerradoPor: this.cerradoPor,
      recibidoPor: this.recibidoPor,
      facturas: this.facturas,
      totalFacturas: this.totalFacturas,
      facturasCompletas: this.facturasCompletas,
      facturasIncompletas: this.facturasIncompletas,
      totalItems: this.totalItems,
      itemsIncluidos: this.itemsIncluidos,
      itemsFaltantes: this.itemsFaltantes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      fechaCierre: this.fechaCierre,
      fechaRecepcion: this.fechaRecepcion
    };
  }
}

// ========================================
// FUNCIONES DEL MODELO
// ========================================

/**
 * Crear un nuevo contenedor
 */
export const crearContenedor = async (datosContenedor) => {
  const { numeroContenedor, companyId, creadoPor } = datosContenedor;
  
  // Verificar que no exista un contenedor con el mismo número
  const existente = await db.collection('contenedores')
    .where('numeroContenedor', '==', numeroContenedor)
    .where('companyId', '==', companyId)
    .limit(1)
    .get();
  
  if (!existente.empty) {
    throw new Error('Ya existe un contenedor con ese número');
  }
  
  // Crear contenedor
  const contenedor = new Contenedor({
    numeroContenedor,
    companyId,
    creadoPor,
    estado: ESTADOS_CONTENEDOR.ABIERTO_USA
  });
  
  // Guardar en Firestore
  const docRef = await db.collection('contenedores').add(contenedor.toFirestore());
  
  return {
    id: docRef.id,
    ...contenedor.toFirestore()
  };
};

/**
 * Obtener todos los contenedores de una compañía
 * ✅ CORREGIDO: Sin orderBy para evitar necesidad de índice compuesto
 */
export const obtenerContenedores = async (companyId, filtros = {}) => {
  let query = db.collection('contenedores')
    .where('companyId', '==', companyId);
  
  if (filtros.estado) {
    query = query.where('estado', '==', filtros.estado);
  }
  
  // ✅ CORRECCIÓN: Sin orderBy para evitar necesidad de índice compuesto
  // Ordenaremos en JavaScript después de obtener los datos
  
  const snapshot = await query.get();
  
  // Obtener documentos
  const contenedores = [];
  snapshot.forEach(doc => {
    contenedores.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  // ✅ Ordenar en JavaScript por createdAt descendente
  contenedores.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Descendente (más nuevo primero)
  });
  
  return contenedores;
};

/**
 * Obtener un contenedor por ID
 */
export const obtenerContenedorPorId = async (contenedorId) => {
  const doc = await db.collection('contenedores').doc(contenedorId).get();
  
  if (!doc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  return {
    id: doc.id,
    ...doc.data()
  };
};

/**
 * Obtener un contenedor por número
 */
export const obtenerContenedorPorNumero = async (numeroContenedor, companyId) => {
  const snapshot = await db.collection('contenedores')
    .where('numeroContenedor', '==', numeroContenedor)
    .where('companyId', '==', companyId)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    throw new Error('Contenedor no encontrado');
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  };
};

/**
 * ✅ CORREGIDO: Agregar una factura al contenedor (CON ITEMS COMPLETOS)
 */
export const agregarFacturaAContenedor = async (contenedorId, datosFactura) => {
  const { facturaId, numeroFactura, items } = datosFactura;
  
  console.log('📦 [MODELO] Agregando factura al contenedor');
  console.log('📦 [MODELO] Items recibidos:', items?.length || 0);
  
  // Obtener el contenedor
  const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();
  if (!contenedorDoc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  const contenedorActual = contenedorDoc.data();
  
  // Verificar que el contenedor esté abierto
  if (contenedorActual.estado !== ESTADOS_CONTENEDOR.ABIERTO_USA) {
    throw new Error('El contenedor ya está cerrado');
  }
  
  // Verificar que la factura no esté ya en el contenedor
  const facturaExistente = contenedorActual.facturas.find(f => f.facturaId === facturaId);
  if (facturaExistente) {
    throw new Error('Esta factura ya está en el contenedor');
  }
  
  // ✅ CREAR OBJETO DE FACTURA CON ITEMS COMPLETOS
  const facturaEnContenedor = {
    facturaId,
    numeroFactura,
    
    // ✅ CRÍTICO: Guardar items completos (no solo IDs)
    items: items || [],
    totalItems: items?.length || 0,
    
    // Control de escaneo
    itemsIncluidos: [],
    itemsFaltantes: (items || []).map(item => item.id),
    
    // Estado y metadata
    estadoFactura: ESTADO_FACTURA_EN_CONTENEDOR.INCOMPLETA,
    fechaAgregado: new Date().toISOString()
  };
  
  console.log('✅ [MODELO] Factura preparada con', facturaEnContenedor.totalItems, 'items completos');
  
  // Actualizar el array de facturas
  const facturasActualizadas = [...contenedorActual.facturas, facturaEnContenedor];
  
  // Crear objeto Contenedor para recalcular estadísticas
  const contenedor = new Contenedor({
    ...contenedorActual,
    facturas: facturasActualizadas,
    updatedAt: new Date().toISOString()
  });
  
  contenedor.actualizarEstadisticas();
  
  // Guardar en Firestore
  await db.collection('contenedores').doc(contenedorId).update(contenedor.toFirestore());
  
  // Actualizar el estado de la recolección
  await db.collection('recolecciones').doc(facturaId).update({
    estadoGeneral: 'en_contenedor_usa',
    contenedorId: contenedorId,
    fechaContenedor: new Date().toISOString()
  });
  
  console.log('✅ [MODELO] Factura guardada exitosamente con items completos');
  
  return contenedor.toFirestore();
};

/**
 * Marca un item específico como incluido en el contenedor
 */
export const marcarItemIncluido = async (contenedorId, facturaId, itemId) => {
  console.log('✅ [MODELO] Marcando item:', itemId);
  
  // Obtener el contenedor
  const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();
  if (!contenedorDoc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  const contenedorActual = contenedorDoc.data();
  
  // Verificar que el contenedor esté abierto
  if (contenedorActual.estado !== ESTADOS_CONTENEDOR.ABIERTO_USA) {
    throw new Error('El contenedor ya está cerrado');
  }
  
  // Buscar la factura en el contenedor
  const facturaIndex = contenedorActual.facturas.findIndex(f => f.facturaId === facturaId);
  if (facturaIndex === -1) {
    throw new Error('Factura no encontrada en el contenedor');
  }
  
  const facturaActual = contenedorActual.facturas[facturaIndex];
  
  // Verificar que el item esté en itemsFaltantes
  if (!facturaActual.itemsFaltantes.includes(itemId)) {
    throw new Error('Este item ya fue marcado como incluido o no pertenece a esta factura');
  }
  
  // Mover el item de itemsFaltantes a itemsIncluidos
  const facturasActualizadas = [...contenedorActual.facturas];
  facturasActualizadas[facturaIndex] = {
    ...facturaActual,
    itemsIncluidos: [...facturaActual.itemsIncluidos, itemId],
    itemsFaltantes: facturaActual.itemsFaltantes.filter(id => id !== itemId),
    estadoFactura: (facturaActual.itemsIncluidos.length + 1) === facturaActual.totalItems 
      ? ESTADO_FACTURA_EN_CONTENEDOR.COMPLETA 
      : ESTADO_FACTURA_EN_CONTENEDOR.INCOMPLETA
  };
  
  console.log('✅ [MODELO] Item marcado. Total:', facturasActualizadas[facturaIndex].itemsIncluidos.length, '/', facturaActual.totalItems);
  
  // Crear objeto Contenedor para recalcular estadísticas
  const contenedor = new Contenedor({
    ...contenedorActual,
    facturas: facturasActualizadas,
    updatedAt: new Date().toISOString()
  });
  
  contenedor.actualizarEstadisticas();
  
  // Guardar en Firestore
  await db.collection('contenedores').doc(contenedorId).update(contenedor.toFirestore());
  
  return {
    itemId,
    itemsIncluidos: facturasActualizadas[facturaIndex].itemsIncluidos.length,
    totalItems: facturaActual.totalItems,
    estadoFactura: facturasActualizadas[facturaIndex].estadoFactura
  };
};

/**
 * Cerrar un contenedor
 */
export const cerrarContenedor = async (contenedorId, cerradoPor) => {
  console.log('🔒 [MODELO] Cerrando contenedor');
  
  const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();
  if (!contenedorDoc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  const contenedorActual = contenedorDoc.data();
  
  if (contenedorActual.estado !== ESTADOS_CONTENEDOR.ABIERTO_USA) {
    throw new Error('El contenedor ya está cerrado');
  }
  
  // Actualizar estado del contenedor
  const contenedor = new Contenedor({
    ...contenedorActual,
    estado: ESTADOS_CONTENEDOR.CERRADO_USA,
    cerradoPor,
    fechaCierre: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  await db.collection('contenedores').doc(contenedorId).update(contenedor.toFirestore());
  
  // Actualizar estado de todas las facturas en el contenedor
  const batch = db.batch();
  
  for (const factura of contenedorActual.facturas) {
    const recoleccionRef = db.collection('recolecciones').doc(factura.facturaId);
    
    const nuevoEstado = factura.estadoFactura === ESTADO_FACTURA_EN_CONTENEDOR.COMPLETA
      ? 'en_transito_rd'
      : 'incompleta_usa';
    
    batch.update(recoleccionRef, {
      estadoGeneral: nuevoEstado,
      fechaCierre: new Date().toISOString()
    });
  }
  
  await batch.commit();
  
  console.log('✅ [MODELO] Contenedor cerrado');
  
  return contenedor.toFirestore();
};

/**
 * Marcar contenedor como recibido en RD
 */
export const marcarContenedorRecibidoRD = async (contenedorId) => {
  console.log('📥 [MODELO] Recibiendo contenedor en RD');
  
  const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();
  if (!contenedorDoc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  const contenedorActual = contenedorDoc.data();
  
  if (contenedorActual.estado !== ESTADOS_CONTENEDOR.CERRADO_USA) {
    throw new Error('El contenedor debe estar cerrado en USA antes de ser recibido en RD');
  }
  
  // Actualizar estado del contenedor
  const contenedor = new Contenedor({
    ...contenedorActual,
    estado: ESTADOS_CONTENEDOR.RECIBIDO_RD,
    fechaRecepcion: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  await db.collection('contenedores').doc(contenedorId).update(contenedor.toFirestore());
  
  // Actualizar estado de todas las facturas
  const batch = db.batch();
  
  for (const factura of contenedorActual.facturas) {
    const recoleccionRef = db.collection('recolecciones').doc(factura.facturaId);
    batch.update(recoleccionRef, {
      estadoGeneral: 'recibida_rd',
      fechaRecepcion: new Date().toISOString()
    });
  }
  
  await batch.commit();
  
  console.log('✅ [MODELO] Contenedor recibido en RD');
  
  return contenedor.toFirestore();
};

/**
 * ✅ NUEVO: Quitar una factura del contenedor
 */
export const quitarFacturaDeContenedor = async (contenedorId, facturaId) => {
  console.log('🗑️ [MODELO] Quitando factura del contenedor');
  
  const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();
  if (!contenedorDoc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  const contenedorActual = contenedorDoc.data();
  
  // Solo se pueden quitar facturas de contenedores abiertos
  if (contenedorActual.estado !== ESTADOS_CONTENEDOR.ABIERTO_USA) {
    throw new Error('Solo se pueden quitar facturas de contenedores abiertos');
  }
  
  // Buscar la factura en el contenedor
  const facturaIndex = contenedorActual.facturas.findIndex(f => f.facturaId === facturaId);
  if (facturaIndex === -1) {
    throw new Error('Factura no encontrada en el contenedor');
  }
  
  // Quitar la factura del array
  const facturasActualizadas = contenedorActual.facturas.filter(f => f.facturaId !== facturaId);
  
  // Crear objeto Contenedor para recalcular estadísticas
  const contenedor = new Contenedor({
    ...contenedorActual,
    facturas: facturasActualizadas,
    updatedAt: new Date().toISOString()
  });
  
  contenedor.actualizarEstadisticas();
  
  // Guardar en Firestore
  await db.collection('contenedores').doc(contenedorId).update(contenedor.toFirestore());
  
  // Actualizar el estado de la recolección (volver a recolectada)
  await db.collection('recolecciones').doc(facturaId).update({
    estadoGeneral: 'recolectada',
    contenedorId: null,
    fechaContenedor: null
  });
  
  console.log('✅ [MODELO] Factura quitada del contenedor');
  
  return contenedor.toFirestore();
};

/**
 * ✅ NUEVO: Eliminar contenedor completo
 */
export const eliminarContenedor = async (contenedorId) => {
  console.log('🗑️ [MODELO] Eliminando contenedor');
  
  const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();
  if (!contenedorDoc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  const contenedorActual = contenedorDoc.data();
  
  // Solo se pueden eliminar contenedores abiertos o vacíos
  if (contenedorActual.estado !== ESTADOS_CONTENEDOR.ABIERTO_USA) {
    throw new Error('Solo se pueden eliminar contenedores en estado abierto');
  }
  
  // Actualizar estado de todas las facturas (volver a recolectada)
  const batch = db.batch();
  
  for (const factura of contenedorActual.facturas || []) {
    const recoleccionRef = db.collection('recolecciones').doc(factura.facturaId);
    batch.update(recoleccionRef, {
      estadoGeneral: 'recolectada',
      contenedorId: null,
      fechaContenedor: null
    });
  }
  
  await batch.commit();
  
  // Eliminar el contenedor
  await db.collection('contenedores').doc(contenedorId).delete();
  
  console.log('✅ [MODELO] Contenedor eliminado');
  
  return { success: true };
};

/**
 * ✅ NUEVO: Marcar contenedor como trabajado (historial)
 */
export const marcarContenedorTrabajado = async (contenedorId, trabajadoPor) => {
  console.log('✅ [MODELO] Marcando contenedor como trabajado');
  
  const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();
  if (!contenedorDoc.exists) {
    throw new Error('Contenedor no encontrado');
  }
  
  const contenedorActual = contenedorDoc.data();
  
  // Solo se pueden marcar como trabajados contenedores recibidos en RD
  if (contenedorActual.estado !== ESTADOS_CONTENEDOR.RECIBIDO_RD) {
    throw new Error('Solo se pueden marcar como trabajados contenedores recibidos en RD');
  }
  
  // Actualizar estado del contenedor
  const updates = {
    estado: 'trabajado',
    trabajadoPor: trabajadoPor,
    fechaTrabajado: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await db.collection('contenedores').doc(contenedorId).update(updates);
  
  console.log('✅ [MODELO] Contenedor marcado como trabajado');
  
  return {
    ...contenedorActual,
    ...updates
  };
};

export default Contenedor;