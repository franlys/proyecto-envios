// Script para ver factura completa
import { db } from '../src/config/firebase.js';

const facturaId = 'FGFFZZWv6F2rqkWgQ2cZ';

async function verFactura() {
  try {
    console.log(`\n🔍 Verificando factura: ${facturaId}\n`);

    const doc = await db.collection('recolecciones').doc(facturaId).get();

    if (!doc.exists) {
      console.log('❌ Factura NO encontrada');
      return;
    }

    const data = doc.data();

    console.log('📋 DATOS COMPLETOS:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verFactura();
