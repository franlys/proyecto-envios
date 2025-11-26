// Script de verificación completa del estado del sistema
import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('❌ Error: Faltan variables de entorno de Firebase');
  process.exit(1);
}

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

async function verificarEstadoGeneral() {
  console.log('═'.repeat(80));
  console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA - EMBARQUES IVÁN');
  console.log('═'.repeat(80));
  console.log('');

  try {
    const companyId = 'embarques_ivan';

    // 1. RUTAS
    console.log('📦 1. ESTADO DE RUTAS');
    console.log('─'.repeat(80));

    const rutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .get();

    const estadosRutas = {};
    let rutasActivas = 0;

    rutasSnapshot.forEach(doc => {
      const estado = doc.data().estado || 'sin_estado';
      estadosRutas[estado] = (estadosRutas[estado] || 0) + 1;

      if (['asignada', 'cargada', 'carga_finalizada', 'en_entrega'].includes(estado)) {
        rutasActivas++;
      }
    });

    console.log(`   Total de rutas: ${rutasSnapshot.size}`);
    console.log(`   Rutas activas: ${rutasActivas}`);
    console.log('   Por estado:');
    Object.entries(estadosRutas).sort((a, b) => b[1] - a[1]).forEach(([estado, count]) => {
      const icon = estado === 'completada' ? '✅' :
                   estado === 'en_entrega' ? '🚚' :
                   estado === 'cargada' || estado === 'carga_finalizada' ? '📦' :
                   estado === 'asignada' ? '📋' : '❓';
      console.log(`      ${icon} ${estado.padEnd(20)}: ${count}`);
    });
    console.log('');

    // 2. FACTURAS/RECOLECCIONES
    console.log('📄 2. ESTADO DE FACTURAS');
    console.log('─'.repeat(80));

    const facturasSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .get();

    const estadosFacturas = {};
    let facturasNoEntregadas = 0;
    let facturasConRutaAsignada = 0;
    let facturasDisponiblesParaRuta = 0;

    facturasSnapshot.forEach(doc => {
      const data = doc.data();
      const estado = data.estado || 'sin_estado';
      estadosFacturas[estado] = (estadosFacturas[estado] || 0) + 1;

      if (estado === 'no_entregada') {
        facturasNoEntregadas++;
      }

      if (data.rutaId) {
        facturasConRutaAsignada++;
      }

      // Facturas disponibles para asignar a ruta
      if (!data.rutaId &&
          estado !== 'entregada' &&
          estado !== 'completada' &&
          estado !== 'cancelada' &&
          estado !== 'pendiente' &&
          estado !== 'en_transito') {
        facturasDisponiblesParaRuta++;
      }
    });

    console.log(`   Total de facturas: ${facturasSnapshot.size}`);
    console.log(`   No entregadas: ${facturasNoEntregadas}`);
    console.log(`   Con ruta asignada: ${facturasConRutaAsignada}`);
    console.log(`   Disponibles para ruta: ${facturasDisponiblesParaRuta}`);
    console.log('   Top 10 estados:');
    Object.entries(estadosFacturas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([estado, count]) => {
        const icon = estado === 'entregada' ? '✅' :
                     estado === 'no_entregada' ? '🚫' :
                     estado === 'en_ruta' ? '🚚' :
                     estado === 'lista_entrega' ? '📦' :
                     estado === 'confirmada_secretaria' ? '📋' : '📄';
        console.log(`      ${icon} ${estado.padEnd(25)}: ${count}`);
      });
    console.log('');

    // 3. CONTENEDORES
    console.log('📦 3. ESTADO DE CONTENEDORES');
    console.log('─'.repeat(80));

    const contenedoresSnapshot = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .get();

    const estadosContenedores = {};

    contenedoresSnapshot.forEach(doc => {
      const estado = doc.data().estado || 'sin_estado';
      estadosContenedores[estado] = (estadosContenedores[estado] || 0) + 1;
    });

    console.log(`   Total de contenedores: ${contenedoresSnapshot.size}`);
    console.log('   Por estado:');
    Object.entries(estadosContenedores).sort((a, b) => b[1] - a[1]).forEach(([estado, count]) => {
      const icon = estado === 'recibido_rd' ? '✅' :
                   estado === 'en_transito' ? '🚢' :
                   estado === 'usa' ? '🇺🇸' : '📦';
      console.log(`      ${icon} ${estado.padEnd(20)}: ${count}`);
    });
    console.log('');

    // 4. USUARIOS
    console.log('👥 4. USUARIOS DEL SISTEMA');
    console.log('─'.repeat(80));

    const usuariosSnapshot = await db.collection('usuarios')
      .where('companyId', '==', companyId)
      .get();

    const rolesCounts = {};
    let usuariosActivos = 0;

    usuariosSnapshot.forEach(doc => {
      const data = doc.data();
      const rol = data.rol || 'sin_rol';
      rolesCounts[rol] = (rolesCounts[rol] || 0) + 1;

      if (data.activo !== false) {
        usuariosActivos++;
      }
    });

    console.log(`   Total de usuarios: ${usuariosSnapshot.size}`);
    console.log(`   Usuarios activos: ${usuariosActivos}`);
    console.log('   Por rol:');
    Object.entries(rolesCounts).sort((a, b) => b[1] - a[1]).forEach(([rol, count]) => {
      const icon = rol === 'super_admin' ? '👑' :
                   rol === 'admin_general' ? '🔧' :
                   rol === 'repartidor' ? '🚚' :
                   rol === 'cargador' ? '📦' :
                   rol === 'almacen_rd' ? '🏭' :
                   rol === 'secretaria' ? '📋' : '👤';
      console.log(`      ${icon} ${rol.padEnd(20)}: ${count}`);
    });
    console.log('');

    // 5. RESUMEN DE ALERTAS
    console.log('⚠️  5. ALERTAS Y RECOMENDACIONES');
    console.log('─'.repeat(80));

    const alertas = [];

    if (facturasNoEntregadas > 0) {
      alertas.push(`📌 ${facturasNoEntregadas} facturas marcadas como no entregadas requieren atención`);
    }

    if (rutasActivas === 0) {
      alertas.push(`📌 No hay rutas activas en el sistema`);
    }

    if (facturasDisponiblesParaRuta > 50) {
      alertas.push(`📌 ${facturasDisponiblesParaRuta} facturas esperando ser asignadas a rutas`);
    }

    const rutasEnEntrega = estadosRutas['en_entrega'] || 0;
    if (rutasEnEntrega > 0) {
      alertas.push(`🚚 ${rutasEnEntrega} ruta(s) actualmente en proceso de entrega`);
    }

    if (alertas.length === 0) {
      console.log('   ✅ No hay alertas críticas');
    } else {
      alertas.forEach(alerta => console.log(`   ${alerta}`));
    }
    console.log('');

    // 6. SALUD DEL SISTEMA
    console.log('💚 6. SALUD DEL SISTEMA');
    console.log('─'.repeat(80));

    const checks = [];

    // Check: Rutas huérfanas (facturas con rutaId que no existe)
    let facturasHuerfanas = 0;
    for (const doc of facturasSnapshot.docs) {
      const data = doc.data();
      if (data.rutaId) {
        const rutaExists = await db.collection('rutas').doc(data.rutaId).get();
        if (!rutaExists.exists) {
          facturasHuerfanas++;
        }
      }
    }

    if (facturasHuerfanas === 0) {
      checks.push('✅ Sin facturas huérfanas (todas las rutaId son válidas)');
    } else {
      checks.push(`⚠️  ${facturasHuerfanas} facturas con rutaId inválida (requiere limpieza)`);
    }

    // Check: Rutas completadas con facturas pendientes
    let rutasConProblemas = 0;
    for (const doc of rutasSnapshot.docs) {
      const data = doc.data();
      if (data.estado === 'completada') {
        const facturas = data.facturas || [];
        const pendientes = facturas.filter(f =>
          f.estado !== 'entregada' && f.estado !== 'no_entregada'
        ).length;

        if (pendientes > 0) {
          rutasConProblemas++;
        }
      }
    }

    if (rutasConProblemas === 0) {
      checks.push('✅ Todas las rutas completadas tienen facturas en estado final');
    } else {
      checks.push(`⚠️  ${rutasConProblemas} rutas completadas con facturas pendientes`);
    }

    checks.forEach(check => console.log(`   ${check}`));
    console.log('');

    console.log('═'.repeat(80));
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Error en verificación:', error);
  }

  process.exit(0);
}

verificarEstadoGeneral();
