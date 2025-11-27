// Script para ver última factura entregada
import { db } from '../src/config/firebase.js';

async function verUltimaFacturaEntregada() {
  try {
    console.log('\n🔍 Buscando última factura entregada...\n');

    const query = await db.collection('recolecciones')
      .where('estado', '==', 'entregada')
      .limit(5)
      .get();

    if (query.empty) {
      console.log('❌ No se encontraron facturas entregadas');
      return;
    }

    console.log(`\n✅ Se encontraron ${query.docs.length} facturas entregadas\n`);

    query.docs.forEach((doc, index) => {
      const data = doc.data();

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 FACTURA ENTREGADA #${index + 1}:`);
      console.log(`ID: ${doc.id}`);
      console.log(`Código: ${data.codigoTracking || data.numeroFactura}`);
      console.log(`Estado: ${data.estado}`);
      console.log(`\n📧 EMAIL REMITENTE:`);
      console.log(`  data.remitente?.email: ${data.remitente?.email || 'NO EXISTE'}`);
      console.log(`  data.remitenteEmail: ${data.remitenteEmail || 'NO EXISTE'}`);
      console.log(`\n📸 FOTOS DE ENTREGA:`);
      console.log(`  Cantidad: ${data.fotosEntrega?.length || 0}`);
      if (data.fotosEntrega && data.fotosEntrega.length > 0) {
        data.fotosEntrega.forEach((foto, i) => {
          console.log(`  Foto ${i + 1}: ${foto}`);
        });
      }
      console.log(`\n👤 DATOS COMPLETOS REMITENTE:`);
      console.log(JSON.stringify(data.remitente, null, 2));
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verUltimaFacturaEntregada();
