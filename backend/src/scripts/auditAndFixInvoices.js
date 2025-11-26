import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

async function auditAndFixInvoices() {
    try {
        console.log('🔍 Auditando facturas huérfanas o bloqueadas...\n');

        // 1. Obtener todas las facturas que tienen ruta asignada
        const facturasSnapshot = await db.collection('recolecciones')
            .where('rutaId', '!=', null)
            .get();

        console.log(`Total de facturas con ruta asignada: ${facturasSnapshot.size}`);

        const facturasHuerfanas = [];
        const rutasCache = {};

        for (const doc of facturasSnapshot.docs) {
            const factura = doc.data();
            const rutaId = factura.rutaId;

            if (!rutaId) continue;

            // Cachear rutas para no consultar repetidamente
            if (!rutasCache[rutaId]) {
                const rutaDoc = await db.collection('rutas').doc(rutaId).get();
                rutasCache[rutaId] = rutaDoc.exists ? rutaDoc.data() : null;
                if (rutasCache[rutaId]) {
                    rutasCache[rutaId].exists = true;
                } else {
                    rutasCache[rutaId] = { exists: false };
                }
            }

            const ruta = rutasCache[rutaId];

            // Criterios de orfandad:
            // 1. La ruta no existe
            // 2. La ruta está "completada", "cancelada" o "finalizada" pero la factura no está "entregada"
            // 3. El usuario indicó que cerró todas las rutas viejas, así que si la ruta no está activa, liberamos.

            const rutaActiva = ruta.exists && ['asignada', 'cargada', 'en_entrega', 'carga_finalizada'].includes(ruta.estado);
            const facturaEntregada = factura.estado === 'entregada';

            if (!ruta.exists || (!rutaActiva && !facturaEntregada)) {
                facturasHuerfanas.push({
                    id: doc.id,
                    codigo: factura.codigoTracking,
                    rutaId: rutaId,
                    rutaEstado: ruta.exists ? ruta.estado : 'NO_EXISTE',
                    facturaEstado: factura.estado
                });
            }
        }

        console.log(`\n⚠️  Se encontraron ${facturasHuerfanas.length} facturas huérfanas o en rutas cerradas.`);

        if (facturasHuerfanas.length > 0) {
            console.log('\n📋 Detalle:');
            facturasHuerfanas.forEach(f => {
                console.log(`  - Factura ${f.codigo} (${f.id})`);
                console.log(`    Estado: ${f.facturaEstado}`);
                console.log(`    Ruta: ${f.rutaId} (Estado: ${f.rutaEstado})`);
            });

            // PREGUNTAR SI SE QUIERE CORREGIR (Simulado aquí, lo haremos automático si el usuario lo pidió)
            // El usuario dijo: "corramos un script para asegurarnos... y asi poder reasignarlas"
            // Así que vamos a proceder a limpiar.

            console.log('\n🛠️  Procediendo a liberar facturas...');

            const batch = db.batch();
            let count = 0;
            const batches = [];

            facturasHuerfanas.forEach(f => {
                const ref = db.collection('recolecciones').doc(f.id);

                // Resetear a estado 'confirmada_secretaria' para que pueda ser reasignada
                batch.update(ref, {
                    rutaId: FieldValue.delete(),
                    rutaNombre: FieldValue.delete(),
                    repartidorId: FieldValue.delete(),
                    repartidorNombre: FieldValue.delete(),
                    ordenCarga: FieldValue.delete(),
                    ordenEntrega: FieldValue.delete(),
                    fechaAsignacionRuta: FieldValue.delete(),
                    estado: 'confirmada_secretaria', // Estado listo para ser asignado
                    historial: FieldValue.arrayUnion({
                        accion: 'liberacion_automatica',
                        descripcion: 'Factura liberada de ruta cerrada/inexistente por script de auditoría',
                        fecha: new Date().toISOString()
                    })
                });
                count++;
            });

            await batch.commit();
            console.log(`✅ ${count} facturas han sido liberadas y están listas para reasignar.`);
        } else {
            console.log('✅ No se encontraron facturas huérfanas. Todo está limpio.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

auditAndFixInvoices();
