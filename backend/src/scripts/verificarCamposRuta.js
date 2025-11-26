// Script para verificar los campos de una ruta cargada
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function verificarCamposRuta() {
  console.log('🔍 Verificando estructura de rutas cargadas...\n');

  try {
    const snapshot = await db.collection('rutas')
      .where('companyId', '==', 'embarques_ivan')
      .where('estado', '==', 'cargada')
      .limit(2)
      .get();

    if (snapshot.empty) {
      console.log('❌ No se encontraron rutas en estado "cargada"');
      process.exit(0);
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('═'.repeat(80));
      console.log(`📍 Ruta ID: ${doc.id}`);
      console.log(`   Nombre: ${data.nombre}`);
      console.log(`   Estado: ${data.estado}`);
      console.log('');
      console.log('   Campos del repartidor:');
      console.log(`      repartidorId: ${data.repartidorId || 'NO EXISTE'}`);
      console.log(`      repartidor: ${data.repartidor || 'NO EXISTE'}`);
      console.log(`      repartidorNombre: ${data.repartidorNombre || 'NO EXISTE'}`);
      console.log(`      repartidor.id: ${data.repartidor?.id || 'NO EXISTE'}`);
      console.log(`      repartidor.uid: ${data.repartidor?.uid || 'NO EXISTE'}`);
      console.log('');
      console.log('   Todos los campos:', Object.keys(data).sort().join(', '));
      console.log('');
    });

    console.log('═'.repeat(80));
    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

verificarCamposRuta();
