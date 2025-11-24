// Script de limpieza de facturas huérfanas
// Ejecutar con: node -r dotenv/config scripts/limpiarHuerfanas.js

import { db } from '../src/config/firebase.js';

const limpiarFacturasHuerfanas = async () => {
  try {
    console.log('🧹 Iniciando limpieza de facturas huérfanas...\n');

    // Obtener TODAS las rutas
    const rutasSnapshot = await db.collection('rutas').get();

    let rutasActualizadas = 0;
    let facturasRemovidas = 0;
    const detalles = [];

    for (const rutaDoc of rutasSnapshot.docs) {
      const rutaData = rutaDoc.data();
      const facturasOriginales = rutaData.facturas || [];

      if (facturasOriginales.length === 0) continue;

      const facturasValidas = [];

      // Verificar cada factura en el array
      for (const factura of facturasOriginales) {
        const facturaId = factura.facturaId || factura.id;

        if (!facturaId) {
          facturasRemovidas++;
          continue;
        }

        // Verificar si la factura existe y su rutaId coincide
        const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();

        if (facturaDoc.exists) {
          const facturaData = facturaDoc.data();

          // Solo mantener la factura si su rutaId coincide con esta ruta
          if (facturaData.rutaId === rutaDoc.id) {
            facturasValidas.push(factura);
          } else {
            facturasRemovidas++;
            detalles.push({
              rutaId: rutaDoc.id,
              rutaNombre: rutaData.nombre || 'Sin nombre',
              facturaId,
              facturaRutaId: facturaData.rutaId || 'sin rutaId',
              estadoFactura: facturaData.estado
            });
            console.log(`  ❌ Removiendo factura ${facturaId} de ruta "${rutaData.nombre}" (rutaId actual: ${facturaData.rutaId || 'ninguno'})`);
          }
        } else {
          // La factura no existe, removerla
          facturasRemovidas++;
          detalles.push({
            rutaId: rutaDoc.id,
            rutaNombre: rutaData.nombre || 'Sin nombre',
            facturaId,
            razon: 'factura no existe'
          });
          console.log(`  ❌ Removiendo factura ${facturaId} de ruta "${rutaData.nombre}" (no existe en BD)`);
        }
      }

      // Si hubo cambios, actualizar la ruta
      if (facturasValidas.length !== facturasOriginales.length) {
        await rutaDoc.ref.update({
          facturas: facturasValidas,
          totalFacturas: facturasValidas.length,
          updatedAt: new Date().toISOString()
        });

        rutasActualizadas++;
        console.log(`  ✅ Ruta "${rutaData.nombre}" actualizada: ${facturasOriginales.length} -> ${facturasValidas.length} facturas\n`);
      }
    }

    console.log('\n========================================');
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('========================================');
    console.log(`📊 Rutas analizadas: ${rutasSnapshot.size}`);
    console.log(`🔧 Rutas actualizadas: ${rutasActualizadas}`);
    console.log(`🗑️  Facturas huérfanas removidas: ${facturasRemovidas}`);
    console.log('========================================\n');

    if (detalles.length > 0) {
      console.log('📋 Detalle de facturas removidas:');
      detalles.forEach((d, i) => {
        console.log(`   ${i + 1}. Factura ${d.facturaId} de ruta "${d.rutaNombre}" - ${d.razon || `rutaId era: ${d.facturaRutaId}`}`);
      });
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error en limpieza:', error);
    process.exit(1);
  }
};

limpiarFacturasHuerfanas();
