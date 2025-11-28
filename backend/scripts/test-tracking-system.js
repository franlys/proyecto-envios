// ============================================================================
// PRUEBA DEL SISTEMA DE TRACKING CON PREFIJOS
// ============================================================================
// Crea recolecciones de prueba para verificar la generación de códigos

import { db } from '../src/config/firebase.js';
import { generarCodigoTracking } from '../src/models/Recoleccion.js';

async function pruebaTracking() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 PRUEBA: Sistema de Tracking con Prefijos');
  console.log('='.repeat(80));

  try {
    // 1. Obtener empresa para prueba
    const companiesSnapshot = await db.collection('companies').get();

    if (companiesSnapshot.empty) {
      console.log('\n❌ No hay empresas en la BD');
      return;
    }

    const empresa = companiesSnapshot.docs[0];
    const empresaData = empresa.data();
    const companyId = empresa.id;

    console.log('\n📊 Empresa seleccionada para prueba:');
    console.log(`   Nombre: ${empresaData.nombre || empresaData.name}`);
    console.log(`   ID: ${companyId}`);
    console.log(`   Prefijo: ${empresaData.trackingPrefix || 'NO TIENE'}`);
    console.log(`   Contador actual: ${empresaData.currentTrackingNumber || 0}`);

    if (!empresaData.trackingPrefix) {
      console.log('\n⚠️ Esta empresa NO tiene prefijo asignado');
      console.log('   Ejecuta el script de migración primero:\n');
      console.log('   echo "s" | node -r dotenv/config scripts/migrateTrackingPrefixes.js migrar\n');
      return;
    }

    // 2. Generar 5 códigos de tracking consecutivos
    console.log('\n🔄 Generando 5 códigos de tracking consecutivos...\n');

    const codigosGenerados = [];

    for (let i = 1; i <= 5; i++) {
      console.log(`\n📦 Generando código #${i}:`);
      console.log('-'.repeat(60));

      const codigo = await generarCodigoTracking(companyId);
      codigosGenerados.push(codigo);

      console.log(`✅ Código generado: ${codigo}`);

      // Verificar contador actualizado
      const empresaActualizada = await db.collection('companies').doc(companyId).get();
      const dataActualizada = empresaActualizada.data();

      console.log(`   Contador después: ${dataActualizada.currentTrackingNumber}`);
      console.log(`   Última generación: ${dataActualizada.lastTrackingGenerated || 'N/A'}`);
    }

    // 3. Verificar que todos son únicos
    console.log('\n' + '='.repeat(80));
    console.log('📋 CÓDIGOS GENERADOS:');
    console.log('='.repeat(80));

    codigosGenerados.forEach((codigo, index) => {
      console.log(`${index + 1}. ${codigo}`);
    });

    // Verificar duplicados
    const unicos = new Set(codigosGenerados);
    const hasDuplicados = unicos.size !== codigosGenerados.length;

    console.log('\n' + '='.repeat(80));
    console.log('✅ VALIDACIÓN:');
    console.log('='.repeat(80));
    console.log(`Total generados: ${codigosGenerados.length}`);
    console.log(`Códigos únicos: ${unicos.size}`);

    if (hasDuplicados) {
      console.log('❌ ¡ATENCIÓN! Se encontraron duplicados');
      const duplicados = codigosGenerados.filter((item, index) =>
        codigosGenerados.indexOf(item) !== index
      );
      console.log('Duplicados:', duplicados);
    } else {
      console.log('✅ Todos los códigos son únicos');
    }

    // 4. Verificar secuencia correcta
    const prefijo = empresaData.trackingPrefix;
    const esperados = Array.from({ length: 5 }, (_, i) =>
      `${prefijo}-${String(i + 1).padStart(4, '0')}`
    );

    console.log('\n🔍 Verificación de secuencia:');
    let secuenciaCorrecta = true;

    esperados.forEach((esperado, index) => {
      const generado = codigosGenerados[index];
      const coincide = generado === esperado;

      if (!coincide) secuenciaCorrecta = false;

      const icono = coincide ? '✅' : '❌';
      console.log(`   ${icono} Esperado: ${esperado} | Generado: ${generado}`);
    });

    if (secuenciaCorrecta) {
      console.log('\n✅ La secuencia es correcta');
    } else {
      console.log('\n⚠️ La secuencia no coincide con lo esperado');
      console.log('   Esto puede ocurrir si ya había recolecciones creadas antes');
    }

    // 5. Obtener estado final de la empresa
    const empresaFinal = await db.collection('companies').doc(companyId).get();
    const dataFinal = empresaFinal.data();

    console.log('\n' + '='.repeat(80));
    console.log('📊 ESTADO FINAL DE LA EMPRESA:');
    console.log('='.repeat(80));
    console.log(`Prefijo: ${dataFinal.trackingPrefix}`);
    console.log(`Contador: ${dataFinal.currentTrackingNumber}`);
    console.log(`Próximo código: ${dataFinal.trackingPrefix}-${String(dataFinal.currentTrackingNumber + 1).padStart(4, '0')}`);
    console.log(`Última generación: ${dataFinal.lastTrackingGenerated || 'N/A'}`);

    console.log('\n✅ ¡Prueba completada exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante la prueba:', error);
    console.error(error.stack);
  }
}

// Ejecutar prueba
pruebaTracking().then(() => {
  console.log('🎉 Sistema de tracking funcionando correctamente\n');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
