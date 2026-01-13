// ============================================================================
// UTILIDADES DE TRACKING CON PREFIJOS POR EMPRESA
// ============================================================================
// Sistema de tracking: [PREFIJO]-[SECUENCIAL]
// Ejemplo: EMI-0001, EMI-0002...

import { db } from '../config/firebase.js';
import { FieldPath } from 'firebase-admin/firestore';

// ============================================================================
// GENERACIÓN DE PREFIJOS ÚNICOS
// ============================================================================

/**
 * Genera un prefijo de 2-4 letras a partir del nombre de la empresa
 *
 * Estrategia:
 * - 3+ palabras: Iniciales de las 3 primeras palabras (TRS = Transportes Rápidos Santo)
 * - 2 palabras: Primera letra + segunda letra de palabra 1 + primera letra de palabra 2 (LOE = Logística Express)
 * - 1 palabra: Primera + mitad + última letra (FDX = FedEx)
 * - Evita artículos: LA, EL, DE, DEL, LOS, LAS, Y, E
 *
 * @param {string} nombre - Nombre de la empresa
 * @returns {string} Prefijo de 3 letras (mayúsculas, sin tildes)
 */
function generarPrefijo(nombre) {
  // 1. Normalizar: mayúsculas, sin tildes, solo letras
  const normalizado = nombre
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
    .replace(/[^A-Z\s]/g, ""); // Solo letras y espacios

  // 2. Separar en palabras y filtrar artículos
  const ARTICULOS = ['LA', 'EL', 'DE', 'DEL', 'LOS', 'LAS', 'Y', 'E', 'CO', 'SA', 'SRL', 'LTDA'];
  const palabras = normalizado
    .split(/\s+/)
    .filter(p => p.length > 0 && !ARTICULOS.includes(p));

  let prefijo = '';

  // 3. Estrategias de generación según número de palabras
  if (normalizado === 'EMBARQUES IVAN' || normalizado === 'EMBARQUESIVAN') {
    prefijo = 'EMI';
  }
  else if (palabras.length >= 3) {
    // Caso: "Transportes Rápidos Santo" → "TRS"
    prefijo = palabras.slice(0, 3).map(p => p[0]).join('');
  }
  else if (palabras.length === 2) {
    // Caso: "Logística Express" → "LOE"
    prefijo = palabras[0][0] + palabras[0][1] + palabras[1][0];
  }
  else if (palabras.length === 1 && palabras[0].length >= 3) {
    // Caso: "FEDEX" → "FDX"
    const palabra = palabras[0];
    prefijo = palabra[0] + palabra[Math.floor(palabra.length / 2)] + palabra[palabra.length - 1];
  }
  else {
    // Fallback para nombres muy cortos o inválidos
    prefijo = "GEN";
  }

  return prefijo.substring(0, 3); // Máximo 3 caracteres
}

/**
 * Verifica si un prefijo ya existe en la base de datos
 *
 * @param {string} prefijo - Prefijo a verificar
 * @param {string|null} excludeCompanyId - ID de empresa a excluir (para actualizaciones)
 * @returns {Promise<boolean>} true si el prefijo ya existe, false si está disponible
 */
async function prefijoExiste(prefijo, excludeCompanyId = null) {
  const query = db.collection('companies')
    .where('trackingPrefix', '==', prefijo);

  const snapshot = await query.get();

  // Filtrar el documento actual si estamos actualizando
  const existentes = snapshot.docs.filter(doc => doc.id !== excludeCompanyId);

  return existentes.length > 0;
}

/**
 * Genera variaciones del prefijo si ya existe
 *
 * Variaciones:
 * - LOE → LO2, LO3... LO9 (números 2-9)
 * - LO9 → LOA, LOB... LOZ (letras A-Z)
 *
 * @param {string} prefijoBase - Prefijo base de 3 letras
 * @param {number} intento - Número de intento (1-36)
 * @returns {string} Variación del prefijo
 */
function generarVariacion(prefijoBase, intento) {
  const base = prefijoBase.substring(0, 2);

  if (intento <= 9) {
    // LOE → LO2, LO3... LO9
    return base + intento;
  } else {
    // LO9 → LOA, LOB... LOZ
    const letra = String.fromCharCode(65 + (intento - 10));
    return base + letra;
  }
}

/**
 * Obtiene un prefijo único para la empresa
 *
 * Si el prefijo generado ya existe, crea variaciones hasta encontrar uno disponible.
 * Máximo 36 intentos (9 números + 26 letras)
 *
 * @param {string} companyId - ID de la empresa
 * @param {string} nombre - Nombre de la empresa
 * @returns {Promise<string>} Prefijo único de 3 caracteres
 * @throws {Error} Si no se puede generar un prefijo único después de 36 intentos
 */
export async function obtenerPrefijoUnico(companyId, nombre) {
  const prefijoBase = generarPrefijo(nombre);
  let prefijoFinal = prefijoBase;
  let intento = 0;

  while (intento < 36) { // 9 números + 26 letras + original
    const existe = await prefijoExiste(prefijoFinal, companyId);

    if (!existe) {
      console.log(`✅ Prefijo único generado: "${prefijoFinal}" para "${nombre}"`);
      return prefijoFinal;
    }

    intento++;
    prefijoFinal = generarVariacion(prefijoBase, intento);
    console.log(`⚠️ Prefijo "${prefijoBase}" ya existe, probando variación: "${prefijoFinal}"`);
  }

  throw new Error(`No se pudo generar un prefijo único después de 36 intentos para: ${nombre}`);
}

// ============================================================================
// GENERACIÓN DE CÓDIGOS DE TRACKING
// ============================================================================

/**
 * Genera un nuevo código de tracking para una empresa usando transacción atómica
 *
 * Formato: [PREFIJO]-[SECUENCIAL]
 * Ejemplos: EMI-0001, EMI-0002, EMI-9999, EMI-10000
 *
 * El padding es dinámico: crece automáticamente más allá de 9999
 *
 * @param {string} companyId - ID de la empresa
 * @returns {Promise<string>} Código de tracking único (ej: "EMI-0001")
 * @throws {Error} Si la empresa no existe o no tiene prefijo configurado
 */
export async function generarCodigoTracking(companyId) {
  return await db.runTransaction(async (transaction) => {
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await transaction.get(companyRef);

    if (!companyDoc.exists) {
      throw new Error('Empresa no encontrada');
    }

    const data = companyDoc.data();

    // Verificar que la empresa tenga prefijo
    if (!data.trackingPrefix) {
      throw new Error(
        'La empresa no tiene un prefijo de tracking configurado. ' +
        'Ejecuta el script de migración primero.'
      );
    }

    const prefix = data.trackingPrefix;
    const nextNumber = (data.currentTrackingNumber || 0) + 1;

    // Actualizar contador atómicamente
    transaction.update(companyRef, {
      currentTrackingNumber: nextNumber,
      lastTrackingGenerated: new Date().toISOString()
    });

    // Formatear con padding dinámico
    // 0001, 0002... 9999, 10000, 10001...
    const padding = Math.max(4, String(nextNumber).length);
    const paddedNumber = String(nextNumber).padStart(padding, '0');

    const codigoTracking = `${prefix}-${paddedNumber}`;

    console.log(`📦 Código de tracking generado: ${codigoTracking} (Empresa: ${data.name})`);

    return codigoTracking;
  });
}

/**
 * Genera un nuevo número de contenedor usando transacción atómica
 * 
 * Formato: [PREFIJO]-CNT-[SECUENCIAL]
 * Ejemplos: EMI-CNT-0001, EMI-CNT-0002
 * 
 * @param {string} companyId - ID de la empresa
 * @returns {Promise<string>} Número de contenedor único
 */
export async function generarNumeroContenedor(companyId) {
  return await db.runTransaction(async (transaction) => {
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await transaction.get(companyRef);

    if (!companyDoc.exists) {
      throw new Error('Empresa no encontrada');
    }

    const data = companyDoc.data();

    // Verificar prefijo
    if (!data.trackingPrefix) {
      throw new Error('La empresa no tiene un prefijo configurado.');
    }

    const prefix = data.trackingPrefix;
    const nextNumber = (data.currentContainerNumber || 0) + 1;

    // Actualizar contador
    transaction.update(companyRef, {
      currentContainerNumber: nextNumber,
      lastContainerGenerated: new Date().toISOString()
    });

    // Formatear: PREFIJO-CNT-0001
    const padding = Math.max(3, String(nextNumber).length); // Al menos 3 dígitos
    const paddedNumber = String(nextNumber).padStart(padding, '0');

    const numeroContenedor = `${prefix}-CNT-${paddedNumber}`;

    console.log(`📦 Contenedor generado: ${numeroContenedor} (Empresa: ${data.name})`);

    return numeroContenedor;
  });
}

/**
 * Genera código de tracking con sistema legacy (RC-YYYYMMDD-XXXX)
 *
 * Solo para compatibilidad con empresas que aún no tienen prefijo.
 * Se debe migrar a usar generarCodigoTracking() lo antes posible.
 *
 * @deprecated Usar generarCodigoTracking() en su lugar
 * @returns {Promise<string>} Código de tracking en formato legacy
 */
export async function generarCodigoTrackingLegacy() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `RC-${year}${month}${day}-${random}`;
}

/**
 * Valida el formato de un código de tracking
 *
 * Formatos válidos:
 * - Nuevo con RC: EMI-RC-0001, LOE-RC-9999 (formato actual)
 * - Nuevo simple: EMI-0001, LOE-9999 (legacy simple)
 * - Legacy completo: RC-20250127-0001
 *
 * @param {string} codigo - Código de tracking a validar
 * @returns {boolean} true si el formato es válido
 */
export function validarFormatoTracking(codigo) {
  if (!codigo || typeof codigo !== 'string') return false;

  // Formato nuevo con RC: [2-3 letras]-RC-[4+ dígitos]
  const formatoNuevoConRC = /^[A-Z0-9]{2,3}-RC-\d{4,}$/;

  // Formato nuevo simple: [2-3 letras/números]-[4+ dígitos]
  const formatoNuevoSimple = /^[A-Z0-9]{2,3}-\d{4,}$/;

  // Formato legacy: RC-YYYYMMDD-XXXX
  const formatoLegacy = /^RC-\d{8}-\d{4}$/;

  return formatoNuevoConRC.test(codigo) || formatoNuevoSimple.test(codigo) || formatoLegacy.test(codigo);
}

/**
 * Extrae el prefijo de empresa de un código de tracking
 *
 * @param {string} codigo - Código de tracking (ej: "EMI-0001")
 * @returns {string|null} Prefijo (ej: "EMI") o null si es legacy
 */
export function extraerPrefijo(codigo) {
  if (!validarFormatoTracking(codigo)) return null;

  if (codigo.startsWith('RC-')) return null; // Legacy no tiene prefijo

  return codigo.split('-')[0];
}

// ============================================================================
// VALIDACIONES
// ============================================================================

/**
 * Prefijos reservados que no se pueden usar
 * (palabras ofensivas, confusas o reservadas del sistema)
 */
const PREFIJOS_RESERVADOS = [
  'XXX', 'FUK', 'ASS', 'SEX', 'DIE', 'KKK', 'WTF',
  'RC', 'SYS', 'ADM', 'API', 'TMP', 'DEV', 'TST'
];

/**
 * Valida que un prefijo sea válido y no esté reservado
 *
 * @param {string} prefijo - Prefijo a validar
 * @returns {boolean} true si es válido
 */
export function validarPrefijo(prefijo) {
  if (!prefijo || typeof prefijo !== 'string') return false;

  // Debe ser 2-3 caracteres alfanuméricos mayúsculas
  if (!/^[A-Z0-9]{2,3}$/.test(prefijo)) return false;

  // No debe estar en la lista de reservados
  if (PREFIJOS_RESERVADOS.includes(prefijo)) return false;

  return true;
}
