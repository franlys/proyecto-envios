// Script para asignar Plan Enterprise a Embarques Ivan
import { db } from './src/config/firebase.js';

async function asignarPlanEnterprise() {
  try {
    console.log('🔍 Buscando empresa Embarques Ivan...');

    // Buscar la empresa por nombre o ID
    const companiesSnapshot = await db.collection('companies')
      .where('name', '==', 'Embarques Ivan')
      .limit(1)
      .get();

    if (companiesSnapshot.empty) {
      // Si no se encuentra por nombre exacto, buscar por ID
      const companyDoc = await db.collection('companies').doc('embarques_ivan').get();

      if (!companyDoc.exists) {
        console.log('❌ No se encontró la empresa Embarques Ivan');
        return;
      }

      // Actualizar por ID
      await db.collection('companies').doc('embarques_ivan').update({
        plan: 'smart',
        planAsignadoAt: new Date(),
        planAsignadoPor: 'admin_manual',
        planAnterior: companyDoc.data().plan || 'ninguno'
      });

      console.log('✅ Plan Smart Logistics asignado exitosamente a Embarques Ivan (por ID)');
      console.log(`📋 Plan anterior: ${companyDoc.data().plan || 'ninguno'}`);
      console.log('📋 Plan nuevo: smart (120,000 RD$ / $2,050 USD)');

    } else {
      // Actualizar por query
      const companyDoc = companiesSnapshot.docs[0];
      const companyId = companyDoc.id;
      const companyData = companyDoc.data();

      await db.collection('companies').doc(companyId).update({
        plan: 'smart',
        planAsignadoAt: new Date(),
        planAsignadoPor: 'admin_manual',
        planAnterior: companyData.plan || 'ninguno'
      });

      console.log('✅ Plan Smart Logistics asignado exitosamente a Embarques Ivan');
      console.log(`📋 Company ID: ${companyId}`);
      console.log(`📋 Plan anterior: ${companyData.plan || 'ninguno'}`);
      console.log('📋 Plan nuevo: smart (120,000 RD$ / $2,050 USD)');
    }

    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al asignar plan:', error);
    process.exit(1);
  }
}

asignarPlanEnterprise();
