// Script para reparar facturas de rutas cerradas que no fueron marcadas como no_entregada
import dotenv from 'dotenv';
import admin from 'firebase-admin';

// Cargar variables de entorno
dotenv.config();

// Verificar variables de entorno
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('❌ Error: Faltan variables de entorno de Firebase en .env');
  process.exit(1);
}

// Inicializar Firebase Admin
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

async function repararFacturasRutasCerradas() {
  console.log('🔧 REPARACIÓN: Marcando facturas pendientes de rutas cerradas como "no_entregada"\n');

  try {
    // 1. Obtener rutas completadas
    const rutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', 'embarques_ivan')
      .where('estado', '==', 'completada')
      .get();

    console.log(`📊 Rutas completadas encontradas: ${rutasSnapshot.size}\n`);

    if (rutasSnapshot.empty) {
      console.log('✅ No hay rutas completadas para reparar');
      process.exit(0);
    }

    let totalFacturasReparadas = 0;
    let totalRutasConProblemas = 0;
    const facturasParaReparar = [];

    // 2. Identificar facturas que necesitan reparación
    for (const rutaDoc of rutasSnapshot.docs) {
      const rutaData = rutaDoc.data();
      const rutaId = rutaDoc.id;
      const facturas = rutaData.facturas || [];

      let facturasProblemaEnRuta = 0;

      for (const factura of facturas) {
        const facturaId = factura.facturaId || factura.id;

        if (facturaId) {
          try {
            const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();

            if (facturaDoc.exists) {
              const facturaData = facturaDoc.data();
              const estadoReal = facturaData.estado;

              // Si la factura NO está entregada y NO está marcada como no_entregada
              if (estadoReal !== 'entregada' && estadoReal !== 'no_entregada') {
                facturasProblemaEnRuta++;
                facturasParaReparar.push({
                  id: facturaId,
                  codigoTracking: facturaData.codigoTracking || facturaId,
                  estadoActual: estadoReal,
                  rutaId: rutaId,
                  rutaNombre: rutaData.nombre
                });
              }
            }
          } catch (err) {
            console.log(`   ❌ Error verificando factura ${facturaId}: ${err.message}`);
          }
        }
      }

      if (facturasProblemaEnRuta > 0) {
        totalRutasConProblemas++;
        console.log(`📍 Ruta "${rutaData.nombre}" (${rutaId}): ${facturasProblemaEnRuta} factura(s) para reparar`);
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   Rutas con problemas: ${totalRutasConProblemas}`);
    console.log(`   Facturas para reparar: ${facturasParaReparar.length}`);

    if (facturasParaReparar.length === 0) {
      console.log('\n✅ No hay facturas para reparar');
      process.exit(0);
    }

    // 3. Confirmar reparación
    console.log(`\n⚠️  Se van a marcar ${facturasParaReparar.length} facturas como "no_entregada"`);
    console.log(`   Esto incluirá:`);
    console.log(`   - Cambiar el estado a "no_entregada"`);
    console.log(`   - Crear un reporte de no entrega`);
    console.log(`   - Limpiar la asignación de ruta/repartidor`);
    console.log(`   - Agregar entrada al historial`);

    // En producción, pedirías confirmación del usuario aquí
    // Para este script, lo hacemos automáticamente

    console.log(`\n🔧 Iniciando reparación...\n`);

    // 4. Reparar facturas usando batch
    const batchSize = 500; // Firestore límite de batch
    let processed = 0;

    while (processed < facturasParaReparar.length) {
      const batch = db.batch();
      const batchFacturas = facturasParaReparar.slice(processed, processed + batchSize);

      for (const factura of batchFacturas) {
        const facturaRef = db.collection('recolecciones').doc(factura.id);

        const reporteNoEntrega = {
          motivo: 'ruta_cerrada_sin_entregar',
          descripcion: 'Factura no entregada al cerrar la ruta (reparación automática)',
          reportadoPor: 'sistema',
          nombreReportador: 'Sistema de Reparación',
          intentarNuevamente: true,
          fecha: new Date().toISOString()
        };

        const historialEntry = {
          accion: 'reparacion_automatica',
          descripcion: `Reparación: Factura marcada como no_entregada (estaba en "${factura.estadoActual}")`,
          motivo: 'ruta_cerrada_sin_entregar',
          rutaOriginal: factura.rutaId,
          fecha: new Date().toISOString()
        };

        batch.update(facturaRef, {
          estado: 'no_entregada',
          reporteNoEntrega,
          rutaId: admin.firestore.FieldValue.delete(),
          repartidorId: admin.firestore.FieldValue.delete(),
          repartidorNombre: admin.firestore.FieldValue.delete(),
          ordenCarga: admin.firestore.FieldValue.delete(),
          ordenEntrega: admin.firestore.FieldValue.delete(),
          fechaAsignacionRuta: admin.firestore.FieldValue.delete(),
          historial: admin.firestore.FieldValue.arrayUnion(historialEntry),
          fechaActualizacion: new Date().toISOString(),
          _reparadaAutomaticamente: true,
          _fechaReparacion: new Date().toISOString()
        });

        console.log(`   ✅ ${factura.codigoTracking} - estado: "${factura.estadoActual}" → "no_entregada"`);
      }

      await batch.commit();
      processed += batchFacturas.length;
      totalFacturasReparadas += batchFacturas.length;

      console.log(`   📦 Procesadas: ${processed}/${facturasParaReparar.length}`);
    }

    console.log(`\n✅ REPARACIÓN COMPLETADA`);
    console.log(`   Total de facturas reparadas: ${totalFacturasReparadas}`);
    console.log(`\n💡 Estas facturas ahora:`);
    console.log(`   - Aparecerán en "Facturas No Entregadas"`);
    console.log(`   - Estarán disponibles para reasignación`);
    console.log(`   - Tienen un reporte de no entrega con motivo: "ruta_cerrada_sin_entregar"`);

  } catch (error) {
    console.error('❌ Error en reparación:', error);
  }

  process.exit(0);
}

repararFacturasRutasCerradas();
