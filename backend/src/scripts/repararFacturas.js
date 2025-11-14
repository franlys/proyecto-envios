import { db } from '../config/firebase.js'; // <-- Quítale el '/src'

const repararFacturasViejas = async () => {
  try {
    console.log('🔄 Iniciando reparación de facturas...');
    const recoleccionesRef = db.collection('recolecciones');
    const contenedoresRef = db.collection('contenedores');
    
    // 1. Obtener solo facturas que están (o estuvieron) en un contenedor
    const snapshot = await recoleccionesRef.where('contenedorId', '!=', null).get();

    console.log(`📊 ${snapshot.size} facturas en contenedores encontradas.`);

    if (snapshot.empty) {
      console.log('✅ No hay facturas para reparar. Saliendo.');
      process.exit(0);
      return;
    }

    let facturasReparadas = 0;
    let facturasOmitidas = 0; // Ya estaban bien
    let facturasConError = 0;
    
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const facturaId = doc.id;
      const data = doc.data();
      const contenedorId = data.contenedorId;

      try {
        // 2. Buscar la "copia" (la verdad) dentro del documento contenedor
        const contenedorDoc = await contenedoresRef.doc(contenedorId).get();
        if (!contenedorDoc.exists) {
          console.warn(`⚠️ Contenedor ${contenedorId} no encontrado (Factura ${facturaId}). Omitiendo.`);
          facturasOmitidas++;
          continue;
        }

        const contenedor = contenedorDoc.data();
        // Encontrar la factura específica dentro del array 'facturas' del contenedor
        const facturaEnContenedor = contenedor.facturas?.find(f => f.id === facturaId);

        if (!facturaEnContenedor) {
          console.warn(`⚠️ Factura ${facturaId} no encontrada en el array de ${contenedorId}. Omitiendo.`);
          facturasOmitidas++;
          continue;
        }

        // 3. Estos son los datos CORRECTOS (de la "copia")
        const itemsTotalCorrecto = facturaEnContenedor.itemsTotal || 0;
        const itemsMarcadosCorrecto = facturaEnContenedor.itemsMarcados || 0;
        const estadoItemsCorrecto = facturaEnContenedor.estadoItems || 'pendiente';

        // 4. Comprobar si la factura "original" (data) está desactualizada
        const necesitaReparacion = 
          data.itemsTotal !== itemsTotalCorrecto ||
          data.itemsMarcados !== itemsMarcadosCorrecto ||
          data.estadoItems !== estadoItemsCorrecto;

        if (necesitaReparacion) {
          // 5. Reparar la factura "original" en el batch
          batch.update(doc.ref, {
            itemsTotal: itemsTotalCorrecto,
            itemsMarcados: itemsMarcadosCorrecto,
            estadoItems: estadoItemsCorrecto
          });
          batchCount++;
          facturasReparadas++;
          console.log(`✅ Reparando ${facturaId} (${data.codigoTracking}): ${itemsMarcadosCorrecto}/${itemsTotalCorrecto}, ${estadoItemsCorrecto}`);
        } else {
          facturasOmitidas++;
        }

        // 6. Ejecutar el batch en lotes de 400 para no fallar
        if (batchCount >= 400) {
          await batch.commit();
          console.log(`--- 💾 Lote de ${batchCount} facturas guardado ---`);
          batchCount = 0; // Reiniciar el batch
        }

      } catch (error) {
        console.error(`❌ Error procesando ${facturaId}:`, error.message);
        facturasConError++;
      }
    }

    // 7. Guardar el último lote restante
    if (batchCount > 0) {
      await batch.commit();
      console.log(`--- 💾 Lote final de ${batchCount} facturas guardado ---`);
    }

    console.log('\n📊 RESUMEN DE REPARACIÓN:');
    console.log(`   ✅ Facturas reparadas: ${facturasReparadas}`);
    console.log(`   ⏭️  Facturas omitidas (ya correctas): ${facturasOmitidas}`);
    console.log(`   ❌ Facturas con error: ${facturasConError}`);
    console.log('\n✅ Reparación completada.');
        
    process.exit(0); // Terminar el script

  } catch (error) {
    console.error('❌ Error fatal en la reparación:', error);
    process.exit(1);
  }
};

// Ejecutar la reparación
repararFacturasViejas();