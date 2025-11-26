// Script para simular la llamada del endpoint de repartidores
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
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

async function probarEndpoint() {
  console.log('🧪 PROBANDO ENDPOINT /api/repartidores/rutas\n');

  try {
    // Primero, encontrar el UID del repartidor franlys
    const usuariosSnapshot = await db.collection('usuarios')
      .where('companyId', '==', 'embarques_ivan')
      .where('rol', '==', 'repartidor')
      .get();

    if (usuariosSnapshot.empty) {
      console.log('❌ No se encontró ningún repartidor');
      process.exit(1);
    }

    const repartidor = usuariosSnapshot.docs[0];
    const repartidorId = repartidor.id;
    const repartidorData = repartidor.data();
    const companyId = repartidorData.companyId;

    console.log(`👤 Repartidor encontrado:`);
    console.log(`   ID: ${repartidorId}`);
    console.log(`   Nombre: ${repartidorData.nombre || 'Sin nombre'}`);
    console.log(`   Email: ${repartidorData.email || 'Sin email'}`);
    console.log(`   CompanyId: ${companyId}`);
    console.log('');

    // Simular la consulta del endpoint
    console.log(`🔍 Buscando rutas con la query:`);
    console.log(`   companyId == "${companyId}"`);
    console.log(`   repartidorId == "${repartidorId}"`);
    console.log(`   estado IN ['asignada', 'cargada', 'carga_finalizada', 'en_entrega']`);
    console.log('');

    const snapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .where('repartidorId', '==', repartidorId)
      .where('estado', 'in', ['asignada', 'cargada', 'carga_finalizada', 'en_entrega'])
      .get();

    console.log(`📊 RESULTADO: ${snapshot.size} ruta(s) encontrada(s)\n`);

    if (snapshot.empty) {
      console.log('⚠️  No se encontraron rutas');
      console.log('');
      console.log('🔍 Verificando si hay rutas del repartidor sin filtro de estado:');

      const snapshotSinFiltro = await db.collection('rutas')
        .where('companyId', '==', companyId)
        .where('repartidorId', '==', repartidorId)
        .get();

      console.log(`   Total rutas del repartidor (cualquier estado): ${snapshotSinFiltro.size}`);

      if (snapshotSinFiltro.size > 0) {
        console.log('\n   Estados de las rutas:');
        snapshotSinFiltro.forEach(doc => {
          const data = doc.data();
          console.log(`      - ${data.nombre}: estado="${data.estado}"`);
        });
      }
    } else {
      snapshot.forEach(doc => {
        const data = doc.data();
        const facturas = data.facturas || [];

        const facturasEntregadas = facturas.filter(f => f.estado === 'entregada').length;
        const facturasNoEntregadas = facturas.filter(f => f.estado === 'no_entregada').length;
        const totalFacturas = data.totalFacturas || facturas.length;
        const facturasPendientes = totalFacturas - facturasEntregadas - facturasNoEntregadas;

        console.log(`📍 Ruta: ${data.nombre}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Estado: ${data.estado}`);
        console.log(`   Facturas: ${facturasEntregadas}/${totalFacturas} entregadas`);
        console.log(`   No entregadas: ${facturasNoEntregadas}`);
        console.log(`   Pendientes: ${facturasPendientes}`);
        console.log(`   Fecha creación: ${data.fechaCreacion || data.createdAt}`);
        console.log('');
      });
    }

    console.log('✅ Prueba completada');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

probarEndpoint();
