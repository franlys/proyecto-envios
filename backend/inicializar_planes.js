/**
 * Script para inicializar el campo 'plan' en todas las compañías existentes
 *
 * Ejecutar con: node inicializar_planes.js
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

async function inicializarPlanes() {
  try {
    console.log('🔍 Verificando compañías sin plan asignado...\n');

    const companiesSnapshot = await db.collection('companies').get();

    if (companiesSnapshot.empty) {
      console.log('❌ No se encontraron compañías en la base de datos.');
      return;
    }

    let actualizadas = 0;
    let yaConPlan = 0;

    for (const doc of companiesSnapshot.docs) {
      const companyData = doc.data();
      const companyId = doc.id;

      console.log(`\n📋 Compañía: ${companyData.name || 'Sin nombre'}`);
      console.log(`   ID: ${companyId}`);

      if (companyData.plan) {
        console.log(`   ✅ Ya tiene plan: ${companyData.plan}`);
        yaConPlan++;
      } else {
        // Asignar plan por defecto: 'operativo'
        await db.collection('companies').doc(companyId).update({
          plan: 'operativo',
          planAsignadoAt: new Date(),
          planAsignadoPor: 'sistema'
        });

        console.log(`   ✨ Plan asignado: operativo (Plan por defecto)`);
        actualizadas++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN:');
    console.log('='.repeat(50));
    console.log(`Total de compañías: ${companiesSnapshot.size}`);
    console.log(`Ya tenían plan: ${yaConPlan}`);
    console.log(`Actualizadas: ${actualizadas}`);
    console.log('='.repeat(50));

    if (actualizadas > 0) {
      console.log('\n✅ Todas las compañías ahora tienen un plan asignado.');
      console.log('📌 Plan por defecto: Plan Operativo (RD$ 50,000/mes)');
    } else {
      console.log('\n✅ Todas las compañías ya tenían un plan asignado.');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error al inicializar planes:', error);
    process.exit(1);
  }
}

// Ejecutar
inicializarPlanes();
