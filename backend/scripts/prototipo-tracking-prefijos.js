// ============================================================================
// PROTOTIPO: Sistema de Tracking con Prefijos por Empresa
// ============================================================================
// Este script NO modifica la BD, solo simula y valida la lógica

import { db } from '../src/config/firebase.js';

// ============================================================================
// 1. GENERACIÓN DE PREFIJOS ÚNICOS
// ============================================================================

/**
 * Genera un prefijo de 2-4 letras a partir del nombre de la empresa
 * Estrategia:
 * - Prioriza iniciales de palabras significativas
 * - Evita artículos (LA, EL, DE, LOS, LAS)
 * - Limpia caracteres especiales y tildes
 */
function generarPrefijo(nombre) {
  console.log(`\n🔧 Generando prefijo para: "${nombre}"`);

  // 1. Normalizar: mayúsculas, sin tildes, solo letras
  const normalizado = nombre
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
    .replace(/[^A-Z\s]/g, ""); // Solo letras y espacios

  console.log(`   📝 Normalizado: "${normalizado}"`);

  // 2. Separar en palabras y filtrar artículos
  const ARTICULOS = ['LA', 'EL', 'DE', 'DEL', 'LOS', 'LAS', 'Y', 'E'];
  const palabras = normalizado
    .split(/\s+/)
    .filter(p => p.length > 0 && !ARTICULOS.includes(p));

  console.log(`   📋 Palabras significativas:`, palabras);

  let prefijo = '';

  // 3. Estrategias de generación según número de palabras
  if (palabras.length >= 3) {
    // Caso: "Logística Juan Perez" → "LJP"
    prefijo = palabras.slice(0, 3).map(p => p[0]).join('');
    console.log(`   ✓ Estrategia: Iniciales de 3 palabras → "${prefijo}"`);
  }
  else if (palabras.length === 2) {
    // Caso: "Logística Express" → "LOE" (primera letra + primera letra de cada palabra)
    prefijo = palabras[0][0] + palabras[0][1] + palabras[1][0];
    console.log(`   ✓ Estrategia: 2 palabras → "${prefijo}"`);
  }
  else if (palabras.length === 1 && palabras[0].length >= 3) {
    // Caso: "FEDEX" → "FDX"
    const palabra = palabras[0];
    prefijo = palabra[0] + palabra[Math.floor(palabra.length / 2)] + palabra[palabra.length - 1];
    console.log(`   ✓ Estrategia: 1 palabra → "${prefijo}"`);
  }
  else {
    // Fallback
    prefijo = "GEN";
    console.log(`   ⚠️ Estrategia: Fallback → "${prefijo}"`);
  }

  return prefijo.substring(0, 3); // Máximo 3 caracteres
}

/**
 * Verifica si un prefijo ya existe en la BD
 */
async function prefijoExiste(prefijo, excludeCompanyId = null) {
  const query = db.collection('companies')
    .where('trackingPrefix', '==', prefijo);

  const snapshot = await query.get();

  // Filtrar el documento actual si estamos actualizando
  const existentes = snapshot.docs.filter(doc => doc.id !== excludeCompanyId);

  return !existentes.length === 0;
}

/**
 * Genera variaciones del prefijo si ya existe
 * Variaciones: LJU → LJ2, LJ3... → LJA, LJB...
 */
function generarVariacion(prefijoBase, intento) {
  const base = prefijoBase.substring(0, 2);

  if (intento <= 9) {
    // LJU → LJ2, LJ3... LJ9
    return base + intento;
  } else {
    // LJ9 → LJA, LJB... LJZ
    const letra = String.fromCharCode(65 + (intento - 10));
    return base + letra;
  }
}

/**
 * Obtiene un prefijo único para la empresa
 * Si el prefijo generado ya existe, crea variaciones
 */
async function obtenerPrefijoUnico(companyId, nombre) {
  const prefijoBase = generarPrefijo(nombre);
  let prefijoFinal = prefijoBase;
  let intento = 0;

  console.log(`\n🔍 Verificando unicidad del prefijo...`);

  while (intento < 36) { // 9 números + 26 letras
    const existe = await prefijoExiste(prefijoFinal, companyId);

    if (!existe) {
      console.log(`   ✅ Prefijo "${prefijoFinal}" está disponible!`);
      return prefijoFinal;
    }

    intento++;
    prefijoFinal = generarVariacion(prefijoBase, intento);
    console.log(`   ⚠️ "${prefijoBase}" ya existe, probando variación: "${prefijoFinal}"`);
  }

  throw new Error(`❌ No se pudo generar un prefijo único después de 36 intentos para: ${nombre}`);
}

// ============================================================================
// 2. GENERACIÓN DE CÓDIGOS DE TRACKING
// ============================================================================

/**
 * Simula la generación de un código de tracking
 * (En producción, esto usará una transacción de Firestore)
 */
function simularTrackingCode(prefijo, numeroActual) {
  const siguienteNumero = numeroActual + 1;

  // Padding dinámico: crece según necesidad
  const padding = Math.max(4, String(siguienteNumero).length);
  const numeroPadded = String(siguienteNumero).padStart(padding, '0');

  return {
    codigo: `${prefijo}-${numeroPadded}`,
    nuevoContador: siguienteNumero
  };
}

// ============================================================================
// 3. VALIDACIÓN CON DATOS REALES
// ============================================================================

async function validarConDatosReales() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 VALIDACIÓN CON DATOS REALES DE FIRESTORE');
  console.log('='.repeat(80));

  try {
    // Obtener todas las empresas existentes
    const companiesSnapshot = await db.collection('companies').get();

    if (companiesSnapshot.empty) {
      console.log('\n⚠️ No hay empresas en la base de datos');
      return;
    }

    console.log(`\n📊 Encontradas ${companiesSnapshot.size} empresas\n`);

    const resultados = [];

    for (const doc of companiesSnapshot.docs) {
      const data = doc.data();
      const nombre = data.name || data.nombre || 'Sin Nombre';

      console.log('\n' + '-'.repeat(80));
      console.log(`🏢 Empresa: "${nombre}"`);
      console.log(`   ID: ${doc.id}`);

      try {
        // Generar prefijo único
        const prefijo = await obtenerPrefijoUnico(doc.id, nombre);

        // Simular primeros 5 códigos de tracking
        console.log(`\n   📦 Simulación de códigos de tracking:`);
        let contador = data.currentTrackingNumber || 0;

        for (let i = 0; i < 5; i++) {
          const { codigo, nuevoContador } = simularTrackingCode(prefijo, contador);
          console.log(`      ${i + 1}. ${codigo}`);
          contador = nuevoContador;
        }

        // Simular código 9999 y 10000 (para probar padding dinámico)
        console.log(`\n   🔢 Prueba de padding dinámico:`);
        const { codigo: code9999 } = simularTrackingCode(prefijo, 9998);
        const { codigo: code10000 } = simularTrackingCode(prefijo, 9999);
        console.log(`      9999. ${code9999}`);
        console.log(`     10000. ${code10000}`);

        resultados.push({
          id: doc.id,
          nombre,
          prefijo,
          prefijoActual: data.trackingPrefix || 'NO TIENE',
          necesitaMigracion: !data.trackingPrefix
        });

      } catch (error) {
        console.error(`   ❌ Error generando prefijo: ${error.message}`);
        resultados.push({
          id: doc.id,
          nombre,
          error: error.message
        });
      }
    }

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 RESUMEN DE VALIDACIÓN');
    console.log('='.repeat(80));

    console.log('\n┌─────────────────────────────────────┬──────────┬─────────────┐');
    console.log('│ Empresa                             │ Prefijo  │ Estado      │');
    console.log('├─────────────────────────────────────┼──────────┼─────────────┤');

    resultados.forEach(r => {
      const nombreCorto = r.nombre.substring(0, 35).padEnd(35);
      const prefijo = (r.prefijo || 'ERROR').padEnd(8);
      const estado = r.error ? 'ERROR' : (r.necesitaMigracion ? 'NUEVA' : 'OK');
      console.log(`│ ${nombreCorto} │ ${prefijo} │ ${estado.padEnd(11)} │`);
    });

    console.log('└─────────────────────────────────────┴──────────┴─────────────┘');

    const exitosos = resultados.filter(r => !r.error).length;
    const conError = resultados.filter(r => r.error).length;
    const necesitanMigracion = resultados.filter(r => r.necesitaMigracion).length;

    console.log(`\n✅ Exitosos: ${exitosos}`);
    console.log(`❌ Con error: ${conError}`);
    console.log(`🔄 Necesitan migración: ${necesitanMigracion}`);

    // Verificar duplicados
    const prefijos = resultados.map(r => r.prefijo).filter(Boolean);
    const duplicados = prefijos.filter((p, i) => prefijos.indexOf(p) !== i);

    if (duplicados.length > 0) {
      console.log(`\n⚠️ ¡ADVERTENCIA! Prefijos duplicados detectados:`, [...new Set(duplicados)]);
    } else {
      console.log(`\n✅ No se detectaron prefijos duplicados`);
    }

  } catch (error) {
    console.error('\n❌ Error durante la validación:', error);
  }
}

// ============================================================================
// 4. PRUEBAS UNITARIAS
// ============================================================================

function ejecutarPruebasUnitarias() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 PRUEBAS UNITARIAS');
  console.log('='.repeat(80));

  const casosPrueba = [
    { nombre: 'Logística Juan', esperado: 'LJU' },
    { nombre: 'Logística Express', esperado: 'LOE' },
    { nombre: 'ABC Shipping Co.', esperado: 'ASC' },
    { nombre: 'FedEx', esperado: 'FDX' },
    { nombre: 'La Estrella Envíos', esperado: 'EES' },
    { nombre: 'Envíos Rápidos del Este', esperado: 'ERE' },
    { nombre: 'ACME Corporation', esperado: 'ACE' },
    { nombre: 'El Rayo Mensajería', esperado: 'RMS' },
    { nombre: 'DHL', esperado: 'DHL' },
    { nombre: 'Transportes López y Asociados', esperado: 'TLA' },
  ];

  console.log('\n┌─────────────────────────────────────┬──────────┬──────────┬────────┐');
  console.log('│ Nombre Empresa                      │ Esperado │ Obtenido │ Result │');
  console.log('├─────────────────────────────────────┼──────────┼──────────┼────────┤');

  let pasadas = 0;
  let fallidas = 0;

  casosPrueba.forEach(caso => {
    const obtenido = generarPrefijo(caso.nombre);
    const resultado = obtenido === caso.esperado ? '✅ PASS' : '❌ FAIL';

    if (obtenido === caso.esperado) pasadas++;
    else fallidas++;

    const nombreCorto = caso.nombre.substring(0, 35).padEnd(35);
    const esperado = caso.esperado.padEnd(8);
    const obtPad = obtenido.padEnd(8);

    console.log(`│ ${nombreCorto} │ ${esperado} │ ${obtPad} │ ${resultado}  │`);
  });

  console.log('└─────────────────────────────────────┴──────────┴──────────┴────────┘');
  console.log(`\n✅ Pasadas: ${pasadas}/${casosPrueba.length}`);
  console.log(`❌ Fallidas: ${fallidas}/${casosPrueba.length}`);
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n🚀 Iniciando prototipo de sistema de tracking con prefijos...\n');

  // 1. Pruebas unitarias primero
  ejecutarPruebasUnitarias();

  // 2. Validación con datos reales
  await validarConDatosReales();

  console.log('\n✅ Prototipo completado. No se modificó ningún dato en la BD.\n');
  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});
