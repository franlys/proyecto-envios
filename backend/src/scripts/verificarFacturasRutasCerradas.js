// Script para verificar facturas de rutas cerradas (completadas)
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

async function verificarFacturasRutasCerradas() {
  console.log('🔍 Verificando facturas de rutas cerradas (completadas)...\n');

  try {
    // 1. Obtener rutas completadas de embarques_ivan (sin orderBy para evitar índice)
    const rutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', 'embarques_ivan')
      .where('estado', '==', 'completada')
      .limit(10) // Últimas 10 rutas cerradas
      .get();

    // Ordenar manualmente en memoria por fecha de finalización
    const rutasOrdenadas = rutasSnapshot.docs.sort((a, b) => {
      const fechaA = a.data().fechaFinalizacion || a.data().fechaCierre || '';
      const fechaB = b.data().fechaFinalizacion || b.data().fechaCierre || '';
      return fechaB.localeCompare(fechaA);
    }).slice(0, 5);

    console.log(`📊 Rutas completadas encontradas: ${rutasSnapshot.size}\n`);

    if (rutasSnapshot.empty) {
      console.log('⚠️  No hay rutas completadas para verificar');
      process.exit(0);
    }

    // 2. Analizar cada ruta cerrada
    for (const rutaDoc of rutasOrdenadas) {
      const rutaData = rutaDoc.data();
      const rutaId = rutaDoc.id;

      console.log('═'.repeat(80));
      console.log(`📍 RUTA: ${rutaData.nombre || rutaId}`);
      console.log(`   ID: ${rutaId}`);
      console.log(`   Estado: ${rutaData.estado}`);
      console.log(`   Fecha cierre: ${rutaData.fechaFinalizacion || rutaData.fechaCierre || 'N/A'}`);
      console.log(`   Repartidor: ${rutaData.repartidorNombre || rutaData.repartidorId || 'N/A'}`);

      const facturas = rutaData.facturas || [];
      console.log(`   Total facturas en ruta: ${facturas.length}`);

      // Contar estados en el array de facturas de la ruta
      const estadosEnRuta = {
        entregada: 0,
        no_entregada: 0,
        pendiente: 0,
        otros: 0
      };

      facturas.forEach(f => {
        if (f.estado === 'entregada') {
          estadosEnRuta.entregada++;
        } else if (f.estado === 'no_entregada') {
          estadosEnRuta.no_entregada++;
        } else if (!f.estado || f.estado === 'asignado' || f.estado === 'en_ruta') {
          estadosEnRuta.pendiente++;
        } else {
          estadosEnRuta.otros++;
        }
      });

      console.log('\n   📦 ESTADOS EN RUTA:');
      console.log(`      ✅ Entregadas: ${estadosEnRuta.entregada}`);
      console.log(`      🚫 No entregadas: ${estadosEnRuta.no_entregada}`);
      console.log(`      ⏳ Pendientes/Sin estado: ${estadosEnRuta.pendiente}`);
      console.log(`      ❓ Otros: ${estadosEnRuta.otros}`);

      // 3. Verificar el estado REAL de cada factura en la colección recolecciones
      console.log('\n   🔍 VERIFICANDO ESTADOS EN BASE DE DATOS:');

      let facturasVerificadas = 0;
      let facturasNoEntregadasReal = 0;
      let facturasConReporte = 0;
      let facturasPendientesReal = 0;

      for (const factura of facturas) {
        const facturaId = factura.facturaId || factura.id;

        if (facturaId) {
          try {
            const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();

            if (facturaDoc.exists) {
              facturasVerificadas++;
              const facturaData = facturaDoc.data();
              const estadoReal = facturaData.estado;
              const tieneReporte = !!facturaData.reporteNoEntrega;
              const tieneRutaAsignada = !!facturaData.rutaId;

              if (estadoReal === 'no_entregada') {
                facturasNoEntregadasReal++;
              }

              if (tieneReporte) {
                facturasConReporte++;
              }

              if (estadoReal !== 'entregada' && estadoReal !== 'no_entregada') {
                facturasPendientesReal++;
                console.log(`      ⚠️  Factura ${facturaData.codigoTracking || facturaId}:`);
                console.log(`         Estado BD: "${estadoReal}"`);
                console.log(`         Estado en ruta: "${factura.estado}"`);
                console.log(`         Tiene reporte: ${tieneReporte ? 'Sí' : 'No'}`);
                console.log(`         RutaId en BD: ${facturaData.rutaId || 'ninguna'}`);
                console.log(`         💡 Esta factura debería estar marcada como "no_entregada"`);
                console.log('');
              }
            } else {
              console.log(`      ❌ Factura ${facturaId} no existe en BD`);
            }
          } catch (err) {
            console.log(`      ❌ Error verificando factura ${facturaId}: ${err.message}`);
          }
        }
      }

      console.log('\n   📊 RESUMEN DE VERIFICACIÓN:');
      console.log(`      Facturas verificadas: ${facturasVerificadas}/${facturas.length}`);
      console.log(`      Con estado "no_entregada" en BD: ${facturasNoEntregadasReal}`);
      console.log(`      Con reporte de no entrega: ${facturasConReporte}`);
      console.log(`      ⚠️  Pendientes sin marcar: ${facturasPendientesReal}`);

      if (facturasPendientesReal > 0) {
        console.log(`\n      🚨 PROBLEMA DETECTADO: ${facturasPendientesReal} factura(s) no fueron marcadas como "no_entregada" al cerrar la ruta`);
      } else {
        console.log('\n      ✅ Todas las facturas tienen el estado correcto');
      }

      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('\n✅ Verificación completada\n');

    // 4. Verificar cuántas facturas aparecen en el endpoint de no entregadas
    console.log('🔍 Verificando endpoint de facturas no entregadas...\n');

    const recoleccionesSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', 'embarques_ivan')
      .where('estado', '==', 'no_entregada')
      .get();

    console.log(`📦 Facturas con estado "no_entregada": ${recoleccionesSnapshot.size}`);

    if (recoleccionesSnapshot.size > 0) {
      console.log('\nDetalle:');
      recoleccionesSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.codigoTracking || doc.id}`);
        console.log(`     Motivo: ${data.reporteNoEntrega?.motivo || 'sin motivo'}`);
        console.log(`     Ruta: ${data.rutaId || 'sin ruta'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }

  process.exit(0);
}

verificarFacturasRutasCerradas();
