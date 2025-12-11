/**
 * Script para actualizar el plan de la empresa de 'enterprise' a 'smart'
 *
 * Ejecutar con: node actualizar_plan_empresa.js
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function actualizarPlan() {
  try {
    console.log('🔄 Actualizando plan de empresa...\n');

    const companyId = 'embarques_ivan';

    // Obtener datos actuales
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      console.log('❌ No se encontró la compañía');
      return;
    }

    const companyData = companyDoc.data();
    console.log(`📋 Compañía: ${companyData.name || 'Sin nombre'}`);
    console.log(`   Plan actual: ${companyData.plan}`);

    // Actualizar a plan 'smart' (equivalente a enterprise)
    await db.collection('companies').doc(companyId).update({
      plan: 'smart',
      planAnterior: companyData.plan,
      planActualizadoAt: new Date(),
      planActualizadoPor: 'sistema_migracion'
    });

    console.log(`\n✅ Plan actualizado exitosamente`);
    console.log(`   Plan nuevo: smart (Plan Smart Logistics)`);
    console.log(`   Plan anterior: ${companyData.plan}`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error al actualizar plan:', error);
    process.exit(1);
  }
}

// Ejecutar
actualizarPlan();
