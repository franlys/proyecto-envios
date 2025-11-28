// ============================================================================
// SCRIPT DE MIGRACIÓN: Asignar Prefijos de Tracking a Empresas Existentes
// ============================================================================
// Este script asigna prefijos únicos a todas las empresas que aún no los tienen

import { db } from '../src/config/firebase.js';
import { obtenerPrefijoUnico, validarPrefijo } from '../src/utils/trackingUtils.js';
import readline from 'readline';

// ============================================================================
// INTERFAZ DE CONFIRMACIÓN
// ============================================================================

function preguntarConfirmacion(pregunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(pregunta, (respuesta) => {
      rl.close();
      resolve(respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si');
    });
  });
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE MIGRACIÓN
// ============================================================================

async function migrarPrefijos(confirmarCadaUno = false) {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 MIGRACIÓN: Asignación de Prefijos de Tracking');
  console.log('='.repeat(80));
  console.log('\nEste script asignará prefijos únicos a todas las empresas que no los tengan.');
  console.log('El proceso es seguro y NO modifica recolecciones existentes.\n');

  try {
    // 1. Obtener todas las empresas
    const companiesSnapshot = await db.collection('companies').get();

    if (companiesSnapshot.empty) {
      console.log('\n⚠️ No hay empresas en la base de datos');
      return;
    }

    console.log(`📊 Total de empresas encontradas: ${companiesSnapshot.size}\n`);

    // 2. Filtrar empresas sin prefijo
    const empresasSinPrefijo = [];
    const empresasConPrefijo = [];

    companiesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.trackingPrefix) {
        empresasSinPrefijo.push({ id: doc.id, ...data });
      } else {
        empresasConPrefijo.push({ id: doc.id, ...data });
      }
    });

    console.log(`✅ Empresas con prefijo: ${empresasConPrefijo.length}`);
    console.log(`🔄 Empresas que necesitan prefijo: ${empresasSinPrefijo.length}\n`);

    if (empresasConPrefijo.length > 0) {
      console.log('Empresas ya migradas:');
      console.log('┌──────────────────────────────────┬──────────┐');
      console.log('│ Nombre                           │ Prefijo  │');
      console.log('├──────────────────────────────────┼──────────┤');
      empresasConPrefijo.forEach(e => {
        const nombre = (e.nombre || e.name || 'Sin Nombre').substring(0, 32).padEnd(32);
        const prefijo = e.trackingPrefix.padEnd(8);
        console.log(`│ ${nombre} │ ${prefijo} │`);
      });
      console.log('└──────────────────────────────────┴──────────┘\n');
    }

    if (empresasSinPrefijo.length === 0) {
      console.log('\n✅ ¡Todas las empresas ya tienen prefijos asignados!');
      console.log('No hay nada que migrar.\n');
      return;
    }

    // 3. Mostrar empresas a migrar
    console.log('Empresas pendientes de migración:');
    console.log('┌──────────────────────────────────┬──────────────────────┐');
    console.log('│ Nombre                           │ Prefijo Propuesto    │');
    console.log('├──────────────────────────────────┼──────────────────────┤');

    const propuestas = [];
    for (const empresa of empresasSinPrefijo) {
      const nombre = empresa.nombre || empresa.name || 'Sin Nombre';
      const prefijoPropuesto = await obtenerPrefijoUnico(empresa.id, nombre);
      propuestas.push({ ...empresa, prefijoPropuesto });

      const nombreCorto = nombre.substring(0, 32).padEnd(32);
      const prefijoPad = prefijoPropuesto.padEnd(20);
      console.log(`│ ${nombreCorto} │ ${prefijoPad} │`);
    }
    console.log('└──────────────────────────────────┴──────────────────────┘\n');

    // 4. Confirmar migración
    const confirmarTodo = await preguntarConfirmacion(
      '\n¿Deseas continuar con la migración de TODAS estas empresas? (s/n): '
    );

    if (!confirmarTodo) {
      console.log('\n❌ Migración cancelada por el usuario\n');
      return;
    }

    // 5. Ejecutar migración
    console.log('\n🚀 Iniciando migración...\n');

    let exitosos = 0;
    let fallidos = 0;

    for (const propuesta of propuestas) {
      const { id, nombre, name, prefijoPropuesto } = propuesta;
      const nombreEmpresa = nombre || name || id;

      try {
        // Si se requiere confirmación individual
        if (confirmarCadaUno) {
          const confirmar = await preguntarConfirmacion(
            `¿Asignar prefijo "${prefijoPropuesto}" a "${nombreEmpresa}"? (s/n): `
          );
          if (!confirmar) {
            console.log(`⏭️  Saltado: ${nombreEmpresa}\n`);
            continue;
          }
        }

        // Actualizar empresa con el prefijo
        await db.collection('companies').doc(id).update({
          trackingPrefix: prefijoPropuesto,
          currentTrackingNumber: 0,
          lastTrackingGenerated: null,
          migratedAt: new Date().toISOString()
        });

        console.log(`✅ ${nombreEmpresa.padEnd(35)} → Prefijo: ${prefijoPropuesto}`);
        exitosos++;

      } catch (error) {
        console.error(`❌ Error en ${nombreEmpresa}: ${error.message}`);
        fallidos++;
      }
    }

    // 6. Resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Exitosos: ${exitosos}`);
    console.log(`❌ Fallidos: ${fallidos}`);
    console.log(`📦 Total procesados: ${exitosos + fallidos}`);

    if (exitosos > 0) {
      console.log('\n✅ ¡Migración completada exitosamente!');
      console.log('\n📝 Próximos pasos:');
      console.log('   1. Las nuevas recolecciones usarán automáticamente el nuevo sistema');
      console.log('   2. Las recolecciones existentes mantendrán su código legacy');
      console.log('   3. Ambos sistemas convivirán sin problemas\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    console.error(error.stack);
  }
}

// ============================================================================
// FUNCIÓN DE VERIFICACIÓN (sin modificar nada)
// ============================================================================

async function verificarEstado() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 VERIFICACIÓN: Estado Actual de Prefijos');
  console.log('='.repeat(80));

  try {
    const companiesSnapshot = await db.collection('companies').get();

    if (companiesSnapshot.empty) {
      console.log('\n⚠️ No hay empresas en la base de datos\n');
      return;
    }

    console.log(`\n📊 Total de empresas: ${companiesSnapshot.size}\n`);

    const resultados = [];

    for (const doc of companiesSnapshot.docs) {
      const data = doc.data();
      const nombre = data.nombre || data.name || 'Sin Nombre';

      resultados.push({
        nombre,
        prefijo: data.trackingPrefix || 'NO ASIGNADO',
        contador: data.currentTrackingNumber || 0,
        ultimoTracking: data.lastTrackingGenerated || 'Nunca',
        estado: data.trackingPrefix ? '✅ OK' : '⚠️ PENDIENTE'
      });
    }

    // Mostrar tabla
    console.log('┌────────────────────────────────┬──────────┬──────────┬─────────────┐');
    console.log('│ Empresa                        │ Prefijo  │ Contador │ Estado      │');
    console.log('├────────────────────────────────┼──────────┼──────────┼─────────────┤');

    resultados.forEach(r => {
      const nombre = r.nombre.substring(0, 30).padEnd(30);
      const prefijo = r.prefijo.padEnd(8);
      const contador = String(r.contador).padEnd(8);
      const estado = r.estado.padEnd(11);
      console.log(`│ ${nombre} │ ${prefijo} │ ${contador} │ ${estado} │`);
    });

    console.log('└────────────────────────────────┴──────────┴──────────┴─────────────┘\n');

    const conPrefijo = resultados.filter(r => r.prefijo !== 'NO ASIGNADO').length;
    const sinPrefijo = resultados.filter(r => r.prefijo === 'NO ASIGNADO').length;

    console.log(`✅ Empresas con prefijo: ${conPrefijo}`);
    console.log(`⚠️ Empresas sin prefijo: ${sinPrefijo}\n`);

    if (sinPrefijo > 0) {
      console.log('💡 Ejecuta el script con modo "migrar" para asignar prefijos\n');
    } else {
      console.log('✅ ¡Todas las empresas tienen prefijos asignados!\n');
    }

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error);
  }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const modo = args[0] || 'verificar';

  if (modo === 'migrar') {
    await migrarPrefijos(false); // false = migrar todo sin preguntar individualmente
  } else if (modo === 'migrar-confirmar') {
    await migrarPrefijos(true); // true = preguntar por cada empresa
  } else if (modo === 'verificar') {
    await verificarEstado();
  } else {
    console.log('\n❌ Modo no reconocido\n');
    console.log('Uso:');
    console.log('  node migrateTrackingPrefixes.js verificar          # Solo verificar estado');
    console.log('  node migrateTrackingPrefixes.js migrar             # Migrar todas automáticamente');
    console.log('  node migrateTrackingPrefixes.js migrar-confirmar   # Confirmar cada empresa\n');
  }

  process.exit(0);
}

main().catch(error => {
  console.error('\n💥 Error fatal:', error);
  process.exit(1);
});
