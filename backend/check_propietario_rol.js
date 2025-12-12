// Script para verificar el rol del propietario
import { db } from './src/config/firebase.js';

async function checkPropietarioRol() {
  try {
    console.log('🔍 Buscando todos los usuarios...\n');

    const allUsersSnap = await db.collection('usuarios').get();

    console.log(`📋 Total de usuarios en DB: ${allUsersSnap.size}\n`);

    allUsersSnap.forEach(doc => {
      const user = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Nombre: ${user.nombre}`);
      console.log(`  ROL: ${user.rol}`);
      console.log(`  CompanyId: ${user.companyId}`);
      console.log(`  Activo: ${user.activo}`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPropietarioRol();
