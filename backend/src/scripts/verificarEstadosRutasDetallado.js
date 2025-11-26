// Script para verificar y reportar estados de rutas en la base de datos
import dotenv from 'dotenv';
import admin from 'firebase-admin';

// Cargar variables de entorno ANTES de cualquier otra cosa
dotenv.config();

// Verificar variables de entorno
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('❌ Error: Faltan variables de entorno de Firebase en .env');
  process.exit(1);
}

// Inicializar Firebase Admin directamente
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

async function verificarEstadosRutas() {
  console.log('🔍 Verificando estados de rutas en la BD...\n');

  try {
    // Obtener todas las rutas de embarques_ivan
    const snapshot = await db.collection('rutas')
      .where('companyId', '==', 'embarques_ivan')
      .get();

    console.log(`📊 Total de rutas encontradas: ${snapshot.size}\n`);

    // Agrupar por estado
    const rutasPorEstado = {};
    const rutasDetalle = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const estado = data.estado || 'sin_estado';

      if (!rutasPorEstado[estado]) {
        rutasPorEstado[estado] = 0;
      }
      rutasPorEstado[estado]++;

      rutasDetalle.push({
        id: doc.id,
        nombre: data.nombre,
        estado: data.estado,
        repartidorId: data.repartidorId,
        repartidorNombre: data.repartidorNombre,
        totalFacturas: data.totalFacturas || (data.facturas || []).length,
        facturasEntregadas: data.facturasEntregadas || 0,
        fechaCreacion: data.fechaCreacion || data.createdAt,
        fechaInicioEntrega: data.fechaInicioEntrega || null
      });
    });

    // Mostrar resumen por estado
    console.log('📈 RESUMEN POR ESTADO:');
    console.log('─────────────────────────────────────────');
    Object.entries(rutasPorEstado).forEach(([estado, cantidad]) => {
      console.log(`  ${estado.padEnd(20)}: ${cantidad} ruta(s)`);
    });
    console.log('');

    // Mostrar rutas activas en detalle
    console.log('🚚 RUTAS ACTIVAS (no completadas):');
    console.log('─────────────────────────────────────────');

    const rutasActivas = rutasDetalle.filter(r =>
      r.estado !== 'completada' &&
      r.estado !== 'cancelada'
    );

    if (rutasActivas.length === 0) {
      console.log('  No hay rutas activas');
    } else {
      rutasActivas.forEach(ruta => {
        console.log(`\n  📍 Ruta: ${ruta.nombre}`);
        console.log(`     ID: ${ruta.id}`);
        console.log(`     Estado: ${ruta.estado}`);
        console.log(`     Repartidor: ${ruta.repartidorNombre || ruta.repartidorId || 'Sin asignar'}`);
        console.log(`     Facturas: ${ruta.facturasEntregadas}/${ruta.totalFacturas} entregadas`);
        console.log(`     Fecha creación: ${ruta.fechaCreacion}`);
        if (ruta.fechaInicioEntrega) {
          console.log(`     Fecha inicio entrega: ${ruta.fechaInicioEntrega}`);
        }
      });
    }

    console.log('\n');

    // Identificar rutas con estados problemáticos
    console.log('⚠️  RUTAS QUE NECESITAN ATENCIÓN:');
    console.log('─────────────────────────────────────────');

    let problemasEncontrados = false;

    // Rutas sin estado
    const rutasSinEstado = rutasDetalle.filter(r => !r.estado || r.estado === 'sin_estado');
    if (rutasSinEstado.length > 0) {
      problemasEncontrados = true;
      console.log(`\n  ❌ ${rutasSinEstado.length} ruta(s) sin estado definido:`);
      rutasSinEstado.forEach(r => {
        console.log(`     - ${r.nombre} (ID: ${r.id})`);
      });
    }

    // Rutas con estado 'carga_finalizada' que deberían ser 'cargada'
    const rutasCargaFinalizada = rutasDetalle.filter(r => r.estado === 'carga_finalizada');
    if (rutasCargaFinalizada.length > 0) {
      problemasEncontrados = true;
      console.log(`\n  ⚠️  ${rutasCargaFinalizada.length} ruta(s) en estado 'carga_finalizada' (legacy):`);
      rutasCargaFinalizada.forEach(r => {
        console.log(`     - ${r.nombre} (ID: ${r.id}) - Repartidor: ${r.repartidorNombre || 'N/A'}`);
      });
      console.log(`     💡 Nota: El sistema ahora acepta ambos estados ('cargada' y 'carga_finalizada')`);
    }

    // Rutas asignadas sin repartidor
    const rutasAsignadasSinRepartidor = rutasDetalle.filter(r =>
      r.estado === 'asignada' && !r.repartidorId
    );
    if (rutasAsignadasSinRepartidor.length > 0) {
      problemasEncontrados = true;
      console.log(`\n  ⚠️  ${rutasAsignadasSinRepartidor.length} ruta(s) asignadas sin repartidor:`);
      rutasAsignadasSinRepartidor.forEach(r => {
        console.log(`     - ${r.nombre} (ID: ${r.id})`);
      });
    }

    if (!problemasEncontrados) {
      console.log('  ✅ No se encontraron problemas');
    }

    console.log('\n');
    console.log('✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error verificando estados:', error);
  }

  process.exit(0);
}

verificarEstadosRutas();
