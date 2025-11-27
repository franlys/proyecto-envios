// Script para verificar el estado de una factura específica
import { db } from '../src/config/firebase.js';

const facturaId = 'RC-20251127-0049'; // ID de la factura a verificar

async function checkFactura() {
  try {
    console.log(`\n🔍 Verificando factura: ${facturaId}\n`);

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      console.log('❌ Factura NO encontrada');
      return;
    }

    const data = doc.data();

    console.log('📋 INFORMACIÓN DE LA FACTURA:');
    console.log('================================');
    console.log(`ID: ${doc.id}`);
    console.log(`Estado: ${data.estado}`);
    console.log(`Estado Entrega: ${data.estadoEntrega || 'N/A'}`);
    console.log(`Número Factura: ${data.numeroFactura}`);
    console.log(`Código Tracking: ${data.codigoTracking}`);
    console.log('\n📦 ITEMS:');
    console.log('================================');

    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        console.log(`\nItem ${index}:`);
        console.log(`  - Producto: ${item.producto}`);
        console.log(`  - Cantidad: ${item.cantidad}`);
        console.log(`  - Entregado: ${item.entregado ? '✅ SÍ' : '❌ NO'}`);
        console.log(`  - Fecha Entrega: ${item.fechaEntrega || 'N/A'}`);
        console.log(`  - Dañado: ${item.danado ? '⚠️ SÍ' : 'NO'}`);
      });

      const total = data.items.length;
      const entregados = data.items.filter(i => i.entregado).length;
      console.log(`\n📊 RESUMEN: ${entregados}/${total} items entregados`);
    } else {
      console.log('⚠️ No hay items en esta factura');
    }

    console.log('\n🚚 INFORMACIÓN DE ENTREGA:');
    console.log('================================');
    console.log(`Fotos Evidencia: ${data.fotosEvidencia?.length || 0}`);
    console.log(`Nombre Receptor: ${data.nombreReceptor || 'N/A'}`);
    console.log(`Notas Entrega: ${data.notasEntrega || 'N/A'}`);
    console.log(`Fecha Entrega: ${data.fechaEntrega || 'N/A'}`);

    console.log('\n💰 INFORMACIÓN DE PAGO:');
    console.log('================================');
    console.log(`Estado Pago: ${data.pago?.estado || data.estadoPago || 'N/A'}`);
    console.log(`Método Pago: ${data.pago?.metodoPago || 'N/A'}`);
    console.log(`Pago Contraentrega: ${data.pagoContraentrega ? '✅ SÍ' : 'NO'}`);

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkFactura();
