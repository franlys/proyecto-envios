// Script para verificar el valor exacto del campo 'estado' en facturas entregadas
import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/config/firebase.js';

async function verificarEstadoFacturas() {
  try {
    console.log('\n🔍 Verificando estados de facturas entregadas...\n');

    // Buscar facturas con cualquier variante de "entregada"
    const snapshot = await db.collection('facturas')
      .where('estado', 'in', ['entregada', 'entregado'])
      .limit(10)
      .get();

    if (snapshot.empty) {
      console.log('❌ No se encontraron facturas con estado "entregada" o "entregado"');

      // Intentar buscar facturas con estadoGeneral
      const snapshot2 = await db.collection('facturas')
        .where('estadoGeneral', '==', 'entregada')
        .limit(5)
        .get();

      console.log(`\n📊 Facturas con estadoGeneral="entregada": ${snapshot2.size}`);

      snapshot2.forEach(doc => {
        const data = doc.data();
        console.log(`\nFactura: ${doc.id}`);
        console.log(`  Código: ${data.codigoTracking || 'N/A'}`);
        console.log(`  estado: "${data.estado}"`);
        console.log(`  estadoGeneral: "${data.estadoGeneral}"`);
        console.log(`  Tipo de estado: ${typeof data.estado}`);
      });
    } else {
      console.log(`✅ Se encontraron ${snapshot.size} facturas entregadas\n`);

      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`Factura: ${doc.id}`);
        console.log(`  Código: ${data.codigoTracking || 'N/A'}`);
        console.log(`  estado: "${data.estado}"`);
        console.log(`  estadoGeneral: "${data.estadoGeneral}"`);
        console.log(`  fechaEntrega: ${data.fechaEntrega || 'N/A'}`);
        console.log(`  Tipo de estado: ${typeof data.estado}`);
        console.log(`  Valor exacto en bytes: ${Buffer.from(data.estado || '').toString('hex')}`);
        console.log('---');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarEstadoFacturas();
