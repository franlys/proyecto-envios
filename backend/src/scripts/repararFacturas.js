// backend/src/scripts/repararFacturas.js
/**
 * SCRIPT DE REPARACIÓN DE ESTADOS DE FACTURAS HISTÓRICAS
 * Busca facturas que quedaron en estado 'en_ruta'/'asignada' tras el cierre de rutas
 * y las cambia a 'no_entregada' para permitir su reasignación.
 * * EJECUCIÓN:
 * 1. Asegura que el archivo serviceAccountKey.json está disponible.
 * 2. Configura la variable de entorno: export GOOGLE_APPLICATION_CREDENTIALS="/ruta/a/serviceAccountKey.json"
 * 3. Ejecuta: node backend/src/scripts/repararFacturas.js
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as path from 'path';

// ⚠️ AJUSTA LA RUTA DE TU CLAVE DE SERVICIO AQUÍ
// ----------------------------------------------------
// SI USAS UN ARCHIVO DE CLAVE:
// const serviceAccount = require(path.resolve('./backend/serviceAccountKey.json'));

// initializeApp({
//   credential: cert(serviceAccount),
// });
// ----------------------------------------------------

// 🚀 MÉTODO RECOMENDADO (Si configuraste GOOGLE_APPLICATION_CREDENTIALS):
// Usa la inicialización predeterminada de la aplicación (Google Application Default Credentials)
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();


// ============================================================
// FUNCIÓN PRINCIPAL DE REPARACIÓN DE ESTADO DE FACTURAS
// ============================================================
const repararFacturasNoEntregadas = async () => {
  console.log('------------------------------------------------');
  console.log('🚀 INICIANDO REPARACIÓN DE ESTADO DE FACTURAS HISTÓRICAS 🚀');
  console.log('------------------------------------------------');

  try {
    // 1. Obtener todas las rutas que ya fueron marcadas como FINALIZADAS
    const rutasSnapshot = await db.collection('rutas')
      .where('estado', '==', 'completada')
      .get();
    
    if (rutasSnapshot.empty) {
      console.log('✅ No se encontraron rutas completadas para revisar.');
      return;
    }

    const rutasCompletadasIds = rutasSnapshot.docs.map(doc => doc.id);
    let facturasActualizadasCount = 0;
    const now = new Date().toISOString();

    console.log(`🔎 Rutas completadas encontradas: ${rutasCompletadasIds.length}`);

    // Procesamos en lotes de 10 IDs de ruta para cumplir con el límite de 'in' de Firestore
    const batchSize = 10;
    for (let i = 0; i < rutasCompletadasIds.length; i += batchSize) {
      const currentRutaIds = rutasCompletadasIds.slice(i, i + batchSize);
      
      // 2. Buscar facturas que aún tengan estados de "en ruta" o "asignada"
      const facturasPendientesSnapshot = await db.collection('recolecciones')
        .where('rutaId', 'in', currentRutaIds)
        .where('estado', 'in', ['en_ruta', 'asignada']) // Estados que deberían ser 'no_entregada'
        .get();

      if (facturasPendientesSnapshot.empty) {
        continue;
      }
      
      const batch = db.batch();
      
      facturasPendientesSnapshot.forEach(doc => {
        facturasActualizadasCount++;
        const facturaRef = db.collection('recolecciones').doc(doc.id);
        
        // 3. Actualizar el estado a 'no_entregada' y desvincular de la ruta
        batch.update(facturaRef, {
          estado: 'no_entregada', 
          rutaId: FieldValue.delete(),
          repartidorId: FieldValue.delete(),
          repartidorNombre: FieldValue.delete(),
          fechaActualizacion: now,
          historial: FieldValue.arrayUnion({
            estado: 'no_entregada',
            fecha: now,
            descripcion: 'Corregido por script de mantenimiento: Ruta cerrada sin entrega.'
          })
        });
      });
      
      await batch.commit();
      console.log(`   - Procesados ${facturasActualizadasCount} documentos hasta ahora...`);
    }

    console.log('------------------------------------------------');
    console.log(`🎉 REPARACIÓN FINALIZADA. ${facturasActualizadasCount} facturas corregidas.`);
    console.log('------------------------------------------------');

  } catch (error) {
    console.error('❌ ERROR CRÍTICO DURANTE EL SCRIPT DE REPARACIÓN:', error);
  }
};

repararFacturasNoEntregadas();