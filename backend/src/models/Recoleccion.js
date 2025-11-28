// backend/src/models/Recoleccion.js
import { db, storage } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';
import {
  generarCodigoTracking as generarTrackingNuevo,
  generarCodigoTrackingLegacy
} from '../utils/trackingUtils.js';

/**
 * MODELO DE RECOLECCIÓN - FASE 1
 * Estructura completa con items, fotos y zonas
 */

// ========================================
// CONSTANTES Y ENUMS
// ========================================

export const ESTADOS_RECOLECCION = {
  PENDIENTE_RECOLECCION: 'pendiente_recoleccion',
  RECOLECTADA: 'recolectada',
  EN_CONTENEDOR_USA: 'en_contenedor_usa',
  INCOMPLETA_USA: 'incompleta_usa',
  EN_TRANSITO_RD: 'en_transito_rd',
  RECIBIDA_RD: 'recibida_rd',
  PENDIENTE_CONFIRMACION: 'pendiente_confirmacion',
  CONFIRMADA: 'confirmada',
  EN_RUTA: 'en_ruta',
  LISTA_PARA_ENTREGAR: 'lista_para_entregar',
  ENTREGADA: 'entregada',
  NO_ENTREGADA: 'no_entregada'
};

export const ESTADOS_ITEM = {
  RECOLECTADO: 'recolectado',
  EN_CONTENEDOR_USA: 'en_contenedor_usa',
  RECIBIDO_RD: 'recibido_rd',
  CARGADO_CAMION: 'cargado_camion',
  ENTREGADO: 'entregado'
};

export const ZONAS = {
  CAPITAL: 'Capital',
  SUR: 'Sur',
  LOCAL: 'Local', // Baní
  CIBAO: 'Cibao',
  ESTE: 'Este'
};

// ========================================
// SECTORES POR ZONA (para autodetección)
// ========================================

const SECTORES_CONOCIDOS = {
  capital: [
    'gazcue', 'piantini', 'naco', 'bella vista', 'serrallés', 'mirador sur',
    'los cacicazgos', 'paraíso', 'renacimiento', 'los prados', 'arroyo hondo',
    'los rios', 'la esperilla', 'la julia', 'los restauradores', 'ensanche ozama',
    'villa juana', 'centro de los heroes', 'villa francisca', 'san carlos',
    'ciudad nueva', 'zona colonial', 'zona universitaria', 'los mina',
    'villa mella', 'sabana perdida', 'herrera', 'los alcarrizos'
  ],
  cibao: [
    'santiago', 'bella vista', 'cerros de gurabo', 'los jardines', 
    'jardines metropolitanos', 'los salados', 'cienfuegos', 'pueblo nuevo', 
    'ensanche libertad', 'la otra banda', 'gurabo', 'hato mayor', 'tamboril',
    'la vega', 'moca', 'san francisco de macoris', 'salcedo', 'tenares'
  ],
  sur: [
    'azua centro', 'barahona centro', 'san juan centro', 'san cristobal centro',
    'azua', 'barahona', 'san juan', 'san cristóbal', 'peravia', 'ocoa'
  ],
  este: [
    'san pedro centro', 'la romana centro', 'higuey', 'higüey', 'bávaro', 
    'bavaro', 'punta cana', 'juan dolio', 'guayacanes', 'el seibo', 'hato mayor'
  ],
  local: [
    'bani', 'baní', 'pueblo', 'el centro', 'los robles', 'las americas', 
    'villa fundacion'
  ]
};

// ========================================
// FUNCIONES DE DETECCIÓN AUTOMÁTICA
// ========================================

/**
 * Detecta automáticamente la zona basándose en la dirección
 */
export const detectarZona = (direccion) => {
  if (!direccion) return null;
  
  const dir = direccion.toLowerCase();
  
  // 1. Local (Baní) - Prioridad alta
  if (dir.includes('bani') || dir.includes('baní')) {
    return ZONAS.LOCAL;
  }
  
  // 2. Este
  if (dir.includes('san pedro') || dir.includes('la romana') || 
      dir.includes('higuey') || dir.includes('higüey') ||
      dir.includes('punta cana') || dir.includes('bávaro') || 
      dir.includes('bavaro') || dir.includes('juan dolio')) {
    return ZONAS.ESTE;
  }
  
  // 3. Cibao
  if (dir.includes('santiago') || dir.includes('cibao') || 
      dir.includes('la vega') || dir.includes('moca') ||
      dir.includes('san francisco de macoris')) {
    return ZONAS.CIBAO;
  }
  
  // 4. Sur
  if (dir.includes('azua') || dir.includes('barahona') || 
      dir.includes('san juan') || dir.includes('san cristobal') ||
      dir.includes('san cristóbal')) {
    return ZONAS.SUR;
  }
  
  // 5. Capital (por defecto)
  return ZONAS.CAPITAL;
};

/**
 * Detecta el sector específico basándose en la dirección
 */
export const detectarSector = (direccion, zona) => {
  if (!direccion || !zona) return '';
  
  const dir = direccion.toLowerCase();
  const zonaKey = zona.toLowerCase();
  const sectoresZona = SECTORES_CONOCIDOS[zonaKey] || [];
  
  for (const sector of sectoresZona) {
    const regex = new RegExp(`\\b${sector.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(dir)) {
      // Capitalizar primera letra de cada palabra
      return sector
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  
  return '';
};

// ========================================
// GENERADOR DE CÓDIGO DE TRACKING
// ========================================

/**
 * Genera un código de tracking único usando el nuevo sistema de prefijos
 *
 * Formato nuevo: [PREFIJO]-[SECUENCIAL]
 * Ejemplos: EMI-0001, LOE-0002, TRS-9999, EMI-10000
 *
 * Formato legacy: RC-YYYYMMDD-XXXX (solo para empresas sin prefijo)
 *
 * @param {string} companyId - ID de la empresa
 * @returns {Promise<string>} Código de tracking único
 */
export const generarCodigoTracking = async (companyId) => {
  try {
    // Verificar si la empresa tiene prefijo configurado
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      throw new Error('Empresa no encontrada');
    }

    const companyData = companyDoc.data();

    // Si tiene prefijo, usar nuevo sistema
    if (companyData.trackingPrefix) {
      console.log(`✅ Usando nuevo sistema de tracking para: ${companyData.nombre || companyId}`);
      return await generarTrackingNuevo(companyId);
    }

    // Si no tiene prefijo, usar sistema legacy (compatibilidad temporal)
    console.warn(`⚠️ Empresa sin prefijo, usando sistema legacy para: ${companyData.nombre || companyId}`);
    console.warn(`⚠️ Ejecuta el script de migración para asignar prefijos`);
    return await generarCodigoTrackingLegacy();

  } catch (error) {
    console.error(`❌ Error generando código de tracking:`, error);
    // Fallback a legacy en caso de error
    return await generarCodigoTrackingLegacy();
  }
};

// ========================================
// SUBIDA DE FOTOS A FIREBASE STORAGE
// ========================================

/**
 * Sube múltiples fotos a Firebase Storage
 * @param {Array} files - Array de archivos de Multer
 * @param {string} recoleccionId - ID de la recolección
 * @returns {Promise<Array>} URLs de las fotos subidas
 */
export const subirFotosRecoleccion = async (files, recoleccionId, companyId) => {
  if (!files || files.length === 0) return [];
  
  const bucket = storage.bucket();
  const urls = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = `recolecciones/${companyId}/${recoleccionId}/foto_${i + 1}_${Date.now()}.jpg`;
    const fileUpload = bucket.file(fileName);
    
    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      public: true
    });
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    urls.push(publicUrl);
  }
  
  return urls;
};

// ========================================
// CLASE MODELO DE RECOLECCIÓN
// ========================================

export class Recoleccion {
  constructor(data) {
    // Información básica del destinatario
    this.cliente = data.cliente || '';
    this.telefono = data.telefono || '';
    this.email = data.email || '';
    this.direccion = data.direccion || '';
    
    // Ubicación
    this.zona = data.zona || null;
    this.sector = data.sector || '';
    
    // Items de la recolección
    this.items = data.items || [];
    
    // Fotos
    this.fotosRecoleccion = data.fotosRecoleccion || [];
    this.fotosEntrega = data.fotosEntrega || [];
    
    // Contenedor
    this.contenedorId = data.contenedorId || null;
    this.itemsCompletos = data.itemsCompletos !== undefined ? data.itemsCompletos : true;
    
    // Estados
    this.estadoGeneral = data.estadoGeneral || ESTADOS_RECOLECCION.RECOLECTADA;
    
    // Tracking
    this.codigoTracking = data.codigoTracking || null;
    
    // Notas
    this.notas = data.notas || '';
    
    // Metadata
    this.companyId = data.companyId || null;
    this.recolectorId = data.recolectorId || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
  
  /**
   * Convierte el objeto a formato JSON para Firestore
   */
  toFirestore() {
    return {
      cliente: this.cliente,
      telefono: this.telefono,
      email: this.email,
      direccion: this.direccion,
      zona: this.zona,
      sector: this.sector,
      items: this.items,
      fotosRecoleccion: this.fotosRecoleccion,
      fotosEntrega: this.fotosEntrega,
      contenedorId: this.contenedorId,
      itemsCompletos: this.itemsCompletos,
      estadoGeneral: this.estadoGeneral,
      codigoTracking: this.codigoTracking,
      notas: this.notas,
      companyId: this.companyId,
      recolectorId: this.recolectorId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * Valida que todos los campos obligatorios estén presentes
   */
  validar() {
    const errores = [];
    
    if (!this.cliente || this.cliente.trim() === '') {
      errores.push('El nombre del cliente es obligatorio');
    }
    
    if (!this.telefono || this.telefono.trim() === '') {
      errores.push('El teléfono es obligatorio');
    }
    
    if (!this.direccion || this.direccion.trim() === '') {
      errores.push('La dirección es obligatoria');
    }
    
    if (!this.zona) {
      errores.push('La zona es obligatoria');
    }
    
    if (!this.items || this.items.length === 0) {
      errores.push('Debe agregar al menos un item');
    }
    
    // Validar que cada item tenga descripción
    this.items.forEach((item, index) => {
      if (!item.descripcion || item.descripcion.trim() === '') {
        errores.push(`El item ${index + 1} debe tener una descripción`);
      }
    });
    
    if (!this.fotosRecoleccion || this.fotosRecoleccion.length === 0) {
      errores.push('Debe subir al menos una foto de la recolección');
    }
    
    return errores;
  }
}

// ========================================
// FUNCIONES DEL MODELO
// ========================================

/**
 * Crea una nueva recolección en Firestore
 */
export const crearRecoleccion = async (recoleccionData) => {
  const recoleccion = new Recoleccion(recoleccionData);
  
  // Validar
  const errores = recoleccion.validar();
  if (errores.length > 0) {
    throw new Error(`Validación fallida: ${errores.join(', ')}`);
  }
  
  // Generar código de tracking
  if (!recoleccion.codigoTracking) {
    recoleccion.codigoTracking = await generarCodigoTracking(recoleccion.companyId);
  }
  
  // Guardar en Firestore
  const docRef = await db.collection('recolecciones').add(recoleccion.toFirestore());
  
  return {
    id: docRef.id,
    ...recoleccion.toFirestore()
  };
};

/**
 * Obtiene todas las recolecciones de una compañía
 * ✅ CORREGIDO: Sin orderBy para evitar necesidad de índice compuesto
 */
export const obtenerRecolecciones = async (companyId, filtros = {}) => {
  let query = db.collection('recolecciones').where('companyId', '==', companyId);
  
  // Aplicar filtros opcionales
  if (filtros.estadoGeneral) {
    query = query.where('estadoGeneral', '==', filtros.estadoGeneral);
  }
  
  if (filtros.zona) {
    query = query.where('zona', '==', filtros.zona);
  }
  
  if (filtros.contenedorId) {
    query = query.where('contenedorId', '==', filtros.contenedorId);
  }
  
  // ✅ CORRECCIÓN: Sin orderBy para evitar necesidad de índice compuesto
  const snapshot = await query.get();
  
  // Obtener documentos
  const recolecciones = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // ✅ Ordenar en JavaScript por createdAt descendente
  recolecciones.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Descendente (más nuevo primero)
  });
  
  return recolecciones;
};

/**
 * Obtiene una recolección por ID
 */
export const obtenerRecoleccionPorId = async (id) => {
  const doc = await db.collection('recolecciones').doc(id).get();
  
  if (!doc.exists) {
    throw new Error('Recolección no encontrada');
  }
  
  return {
    id: doc.id,
    ...doc.data()
  };
};

/**
 * Actualiza una recolección
 */
export const actualizarRecoleccion = async (id, updates) => {
  updates.updatedAt = new Date().toISOString();
  
  await db.collection('recolecciones').doc(id).update(updates);
  
  return obtenerRecoleccionPorId(id);
};

export default {
  Recoleccion,
  ESTADOS_RECOLECCION,
  ESTADOS_ITEM,
  ZONAS,
  detectarZona,
  detectarSector,
  generarCodigoTracking,
  subirFotosRecoleccion,
  crearRecoleccion,
  obtenerRecolecciones,
  obtenerRecoleccionPorId,
  actualizarRecoleccion
};