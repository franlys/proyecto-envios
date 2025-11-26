// backend/src/scripts/verificarEstadosRutas.js
import { db } from '../config/firebase.js';

async function verificarEstadosRutas() {
    try {
        console.log('🔍 Verificando estados de rutas en la base de datos...\n');

        const snapshot = await db.collection('rutas').get();

        console.log(`Total de rutas: ${snapshot.size}\n`);

        const estadosCount = {};
        const rutasPorEstado = {};

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const estado = data.estado || 'sin_estado';

            if (!estadosCount[estado]) {
                estadosCount[estado] = 0;
                rutasPorEstado[estado] = [];
            }

            estadosCount[estado]++;
            rutasPorEstado[estado].push({
                id: doc.id,
                nombre: data.nombre,
                repartidorId: data.repartidorId,
                repartidorNombre: data.repartidorNombre,
                totalFacturas: data.totalFacturas || data.facturas?.length || 0,
                fechaCreacion: data.fechaCreacion?.toDate?.() || data.createdAt?.toDate?.() || 'N/A'
            });
        });

        console.log('📊 Distribución de estados:\n');
        Object.entries(estadosCount).forEach(([estado, count]) => {
            console.log(`  ${estado}: ${count} rutas`);
        });

        console.log('\n📋 Detalle de rutas por estado:\n');
        Object.entries(rutasPorEstado).forEach(([estado, rutas]) => {
            console.log(`\n🏷️  Estado: ${estado} (${rutas.length} rutas)`);
            rutas.forEach(ruta => {
                console.log(`  - ${ruta.nombre} (ID: ${ruta.id})`);
                console.log(`    Repartidor: ${ruta.repartidorNombre || ruta.repartidorId || 'Sin asignar'}`);
                console.log(`    Facturas: ${ruta.totalFacturas}`);
                console.log(`    Creada: ${ruta.fechaCreacion}`);
            });
        });

        // Buscar rutas con estados problemáticos
        const estadosProblematicos = ['carga_finalizada', 'finalizada', 'completada'];
        const rutasProblematicas = snapshot.docs.filter(doc =>
            estadosProblematicos.includes(doc.data().estado)
        );

        if (rutasProblematicas.length > 0) {
            console.log('\n⚠️  RUTAS CON ESTADOS PROBLEMÁTICOS DETECTADAS:\n');
            rutasProblematicas.forEach(doc => {
                const data = doc.data();
                console.log(`  - ${data.nombre} (${doc.id})`);
                console.log(`    Estado actual: ${data.estado}`);
                console.log(`    Debería ser: cargada`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

verificarEstadosRutas();
