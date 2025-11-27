// backend/scripts/migrateRutasCargadores.js
// Script de migración para agregar el campo cargadoresIds a las rutas existentes

import { db } from '../src/config/firebase.js';

/**
 * Este script migra todas las rutas existentes para agregar el campo cargadoresIds
 * basándose en el campo cargadorId que ya existe.
 *
 * IMPORTANTE: Este script es IDEMPOTENTE, puede ejecutarse múltiples veces sin causar problemas
 */
async function migrateRutasCargadores() {
  console.log('🚀 Iniciando migración de rutas...\n');

  try {
    // Obtener todas las rutas de la colección
    const rutasSnapshot = await db.collection('rutas').get();

    if (rutasSnapshot.empty) {
      console.log('⚠️  No hay rutas para migrar.');
      return;
    }

    console.log(`📊 Total de rutas encontradas: ${rutasSnapshot.size}\n`);

    let rutasActualizadas = 0;
    let rutasOmitidas = 0;
    let errores = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore permite máximo 500 operaciones por batch

    for (const doc of rutasSnapshot.docs) {
      const rutaData = doc.data();
      const rutaId = doc.id;

      // Verificar si ya tiene el campo cargadoresIds
      if (rutaData.cargadoresIds && Array.isArray(rutaData.cargadoresIds)) {
        console.log(`⏭️  Ruta ${rutaId} - Ya tiene cargadoresIds, omitiendo...`);
        rutasOmitidas++;
        continue;
      }

      // Verificar si tiene cargadorId (singular)
      if (!rutaData.cargadorId) {
        console.log(`⚠️  Ruta ${rutaId} - No tiene cargadorId, omitiendo...`);
        rutasOmitidas++;
        continue;
      }

      // Crear el array cargadoresIds basado en cargadorId
      const cargadoresIds = [rutaData.cargadorId];

      // Agregar la actualización al batch
      const rutaRef = db.collection('rutas').doc(rutaId);
      batch.update(rutaRef, {
        cargadoresIds: cargadoresIds,
        updatedAt: new Date().toISOString()
      });

      batchCount++;
      rutasActualizadas++;

      console.log(`✅ Ruta ${rutaId} - Agregando cargadoresIds: [${cargadoresIds.join(', ')}]`);

      // Si llegamos al límite del batch, ejecutarlo y crear uno nuevo
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`\n📦 Batch de ${batchCount} operaciones ejecutado\n`);
        batchCount = 0;
      }
    }

    // Ejecutar el batch final si tiene operaciones pendientes
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n📦 Batch final de ${batchCount} operaciones ejecutado\n`);
    }

    // Resumen final
    console.log('\n='.repeat(60));
    console.log('📊 RESUMEN DE LA MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Rutas actualizadas: ${rutasActualizadas}`);
    console.log(`⏭️  Rutas omitidas: ${rutasOmitidas}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Total procesadas: ${rutasSnapshot.size}`);
    console.log('='.repeat(60));
    console.log('\n✅ Migración completada exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    throw error;
  }
}

// Ejecutar la migración
migrateRutasCargadores()
  .then(() => {
    console.log('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script finalizado con errores:', error);
    process.exit(1);
  });
