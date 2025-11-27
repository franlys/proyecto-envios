// Script temporal para verificar rutas del cargador
import { db } from '../src/config/firebase.js';

async function checkRutas() {
  try {
    console.log('🔍 Verificando rutas del cargador...\n');

    // Buscar usuario cargador "manolo"
    const usuariosSnapshot = await db.collection('usuarios')
      .where('email', '==', 'cargador@embarquesivan.com')
      .get();

    if (usuariosSnapshot.empty) {
      console.log('❌ No se encontró el usuario cargador');
      return;
    }

    const cargadorDoc = usuariosSnapshot.docs[0];
    const cargadorData = cargadorDoc.data();
    const cargadorId = cargadorDoc.id;
    const companyId = cargadorData.companyId;

    console.log('👤 Cargador encontrado:');
    console.log('   ID:', cargadorId);
    console.log('   Nombre:', cargadorData.nombre);
    console.log('   Email:', cargadorData.email);
    console.log('   CompanyId:', companyId);
    console.log('   Rol:', cargadorData.rol);
    console.log('');

    // Buscar todas las rutas de la compañía
    console.log('📊 Buscando TODAS las rutas de la compañía...\n');
    const todasRutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .get();

    console.log(`Total rutas en la compañía: ${todasRutasSnapshot.size}\n`);

    todasRutasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`📦 Ruta: ${doc.id}`);
      console.log(`   Nombre: ${data.nombre}`);
      console.log(`   Estado: ${data.estado}`);
      console.log(`   CargadorId: ${data.cargadorId || 'N/A'}`);
      console.log(`   CargadoresIds: ${data.cargadoresIds ? JSON.stringify(data.cargadoresIds) : 'N/A'}`);
      console.log(`   RepartidorId: ${data.repartidorId || data.empleadoId || 'N/A'}`);
      console.log(`   ¿Asignada a este cargador?: ${data.cargadorId === cargadorId || (data.cargadoresIds && data.cargadoresIds.includes(cargadorId))}`);
      console.log('');
    });

    // Buscar rutas que DEBERÍAN aparecer (estados asignada o en_carga)
    console.log('🔍 Buscando rutas en estados "asignada" o "en_carga"...\n');
    const rutasActivasSnapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .where('estado', 'in', ['asignada', 'en_carga'])
      .get();

    console.log(`Rutas activas (asignada/en_carga): ${rutasActivasSnapshot.size}\n`);

    rutasActivasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`✅ Ruta ACTIVA: ${doc.id}`);
      console.log(`   Nombre: ${data.nombre}`);
      console.log(`   Estado: ${data.estado}`);
      console.log(`   CargadorId: ${data.cargadorId || 'N/A'}`);
      console.log(`   CargadoresIds: ${data.cargadoresIds ? JSON.stringify(data.cargadoresIds) : 'N/A'}`);
      console.log('');
    });

    // Buscar con array-contains
    console.log('🔍 Buscando con array-contains en cargadoresIds...\n');
    try {
      const rutasArraySnapshot = await db.collection('rutas')
        .where('companyId', '==', companyId)
        .where('cargadoresIds', 'array-contains', cargadorId)
        .get();

      console.log(`Rutas con array-contains: ${rutasArraySnapshot.size}\n`);

      rutasArraySnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`🎯 Ruta con ARRAY: ${doc.id}`);
        console.log(`   Nombre: ${data.nombre}`);
        console.log(`   Estado: ${data.estado}`);
        console.log(`   CargadoresIds: ${JSON.stringify(data.cargadoresIds)}`);
        console.log('');
      });
    } catch (error) {
      console.log('❌ Error en búsqueda con array-contains:', error.message);
    }

    // Buscar con cargadorId simple
    console.log('🔍 Buscando con cargadorId simple...\n');
    const rutasSimpleSnapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .where('cargadorId', '==', cargadorId)
      .get();

    console.log(`Rutas con cargadorId simple: ${rutasSimpleSnapshot.size}\n`);

    rutasSimpleSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`🎯 Ruta SIMPLE: ${doc.id}`);
      console.log(`   Nombre: ${data.nombre}`);
      console.log(`   Estado: ${data.estado}`);
      console.log(`   CargadorId: ${data.cargadorId}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRutas()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
