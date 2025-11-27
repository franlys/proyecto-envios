// Script para buscar facturas por número
import { db } from '../src/config/firebase.js';

const numeroFactura = 'RC-20251127-0049';

async function buscarFactura() {
  try {
    console.log(`\n🔍 Buscando factura: ${numeroFactura}\n`);

    // Buscar por numeroFactura
    console.log('📋 Buscando por numeroFactura...');
    const queryNumero = await db.collection('recolecciones')
      .where('numeroFactura', '==', numeroFactura)
      .get();

    if (!queryNumero.empty) {
      queryNumero.forEach(doc => {
        const data = doc.data();
        console.log(`\n✅ ENCONTRADA (por numeroFactura):`);
        console.log(`ID Real: ${doc.id}`);
        console.log(`Estado: ${data.estado}`);
        console.log(`Items: ${data.items?.length || 0}`);

        if (data.items && data.items.length > 0) {
          data.items.forEach((item, idx) => {
            console.log(`  Item ${idx}: ${item.producto} - Entregado: ${item.entregado ? '✅' : '❌'}`);
          });
        }
      });
      process.exit(0);
      return;
    }

    // Buscar por codigoTracking
    console.log('📋 Buscando por codigoTracking...');
    const queryTracking = await db.collection('recolecciones')
      .where('codigoTracking', '==', numeroFactura)
      .get();

    if (!queryTracking.empty) {
      queryTracking.forEach(doc => {
        const data = doc.data();
        console.log(`\n✅ ENCONTRADA (por codigoTracking):`);
        console.log(`ID Real: ${doc.id}`);
        console.log(`Estado: ${data.estado}`);
        console.log(`Items: ${data.items?.length || 0}`);

        if (data.items && data.items.length > 0) {
          data.items.forEach((item, idx) => {
            console.log(`  Item ${idx}: ${item.producto} - Entregado: ${item.entregado ? '✅' : '❌'}`);
          });
        }
      });
      process.exit(0);
      return;
    }

    // Buscar todas las facturas recientes
    console.log('📋 Listando facturas más recientes...');
    const queryRecientes = await db.collection('recolecciones')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    console.log(`\n📦 Últimas 10 facturas:`);
    queryRecientes.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.numeroFactura || data.codigoTracking || 'sin código'} (${data.estado})`);
    });

    console.log('\n❌ Factura no encontrada con ese número\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

buscarFactura();
