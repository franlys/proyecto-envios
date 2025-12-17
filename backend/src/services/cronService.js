import cron from 'node-cron';
import { db } from '../config/firebase.js';
import whatsappService from './whatsappService.js';

// ==========================================
// SERVICIO DE CRON JOBS (TAREAS PROGRAMADAS)
// ==========================================

export const initCronJobs = () => {
    console.log('⏰ Inicializando Cron Jobs...');

    // 1. RECORDATORIOS DE PAGO (Diario a las 9:00 AM)
    // Sintaxis: '0 9 * * *' = Minuto 0, Hora 9, Cualquier día
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Ejecutando Recordatorio de Pagos Automático...');
        await checkAndSendPaymentReminders();
    }, {
        timezone: "America/Santo_Domingo" // Ajustar a tu zona horaria
    });

    // Log de inicio
    console.log('✅ Tarea Programada: Recordatorio de Pagos (09:00 AM)');

    // 2. REPORTE DIARIO DE ENTREGAS FALLIDAS (Diario a las 8:00 PM)
    // Sintaxis: '0 20 * * *' = Minuto 0, Hora 20 (8:00 PM), Cualquier día
    cron.schedule('0 20 * * *', async () => {
        console.log('⏰ Ejecutando Reporte Diario de Entregas Fallidas...');
        await sendDailyFailedDeliveriesReport();
    }, {
        timezone: "America/Santo_Domingo"
    });

    console.log('✅ Tarea Programada: Reporte Diario de Entregas Fallidas (08:00 PM)');
};

// Lógica de Cobranza
const checkAndSendPaymentReminders = async () => {
    try {
        // Buscar recolecciones pendientes de pago
        // OPTIMIZACIÓN: En producción, deberíamos filtrar por fecha también (ej: > 3 días de antigüedad)
        // Por ahora, traemos todas las pendientes.
        const snapshot = await db.collection('recolecciones')
            .where('pago.estado', '==', 'pendiente')
            .where('estado', '==', 'entregado') // Solo cobrar si ya se entregó el servicio (Opcional, depende de tu regla)
            .get();

        if (snapshot.empty) {
            console.log('✅ No hay pagos pendientes para cobrar hoy.');
            return;
        }

        console.log(`💰 Procesando ${snapshot.size} cuentas pendientes...`);

        let enviados = 0;

        // Procesar cada deuda
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const remitenteTelefono = data.remitente?.telefono;
            const nombre = data.remitente?.nombre || 'Cliente';
            const montoPendiente = data.pago?.montoPendiente || 0;
            const codigoTracking = data.codigoTracking;
            const companyId = data.companyId; // Necesario para saber QUÉ whatsapp envía

            // Validaciones
            if (!remitenteTelefono || montoPendiente <= 0 || !companyId) continue;

            // Mensaje Amable
            const mensaje = `👋 Hola *${nombre}*, esperamos que estés bien.\n\n` +
                `Te recordamos amablemente que tienes un saldo pendiente de *$${montoPendiente}* ` +
                `correspondiente al envío *${codigoTracking}*.\n\n` +
                `Agradecemos tu pronto pago para seguir brindándote el mejor servicio. 🚚\n\n` +
                `_Si ya realizaste el pago, por favor omite este mensaje._`;

            // Enviar WhatsApp (con pequeño delay artificial para no saturar si son muchos)
            await new Promise(r => setTimeout(r, 2000)); // 2 segundos entre mensajes

            try {
                await whatsappService.sendMessage(companyId, remitenteTelefono, mensaje);
                console.log(`✅ Recordatorio enviado a ${nombre} (${codigoTracking})`);
                enviados++;
            } catch (error) {
                console.error(`❌ Error enviando a ${nombre}:`, error.message);
            }
        }

        console.log(`🏁 Cobranza finalizada. Mensajes enviados: ${enviados}/${snapshot.size}`);

    } catch (error) {
        console.error('❌ Error fatal en Cron de Cobranza:', error);
    }
};

// ==========================================
// REPORTE DIARIO DE ENTREGAS FALLIDAS
// ==========================================
const sendDailyFailedDeliveriesReport = async () => {
    try {
        console.log('📊 Generando reporte diario de entregas fallidas...');

        // Obtener todas las compañías activas
        const companiesSnapshot = await db.collection('companies').get();

        if (companiesSnapshot.empty) {
            console.log('⚠️ No hay compañías registradas');
            return;
        }

        // Procesar cada compañía
        for (const companyDoc of companiesSnapshot.docs) {
            const companyId = companyDoc.id;
            const companyData = companyDoc.data();

            console.log(`📦 Procesando compañía: ${companyData.nombre || companyId}`);

            // Obtener entregas fallidas de hoy
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const mañana = new Date(hoy);
            mañana.setDate(mañana.getDate() + 1);

            // Buscar recolecciones con reporte de no entrega de hoy
            const snapshot = await db.collection('recolecciones')
                .where('companyId', '==', companyId)
                .where('estado', '==', 'no_entregada')
                .get();

            if (snapshot.empty) {
                console.log(`✅ ${companyData.nombre}: Sin entregas fallidas hoy`);
                continue;
            }

            // Filtrar solo las del día de hoy
            const entregasHoy = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const reporteNoEntrega = data.reporteNoEntrega;

                if (reporteNoEntrega && reporteNoEntrega.fecha) {
                    const fechaReporte = new Date(reporteNoEntrega.fecha);
                    if (fechaReporte >= hoy && fechaReporte < mañana) {
                        entregasHoy.push({
                            id: doc.id,
                            codigoTracking: data.codigoTracking,
                            rutaCodigo: data.rutaId || 'N/A',
                            repartidorNombre: data.repartidorNombre || 'N/A',
                            motivo: reporteNoEntrega.motivo || 'No especificado',
                            evidencias: reporteNoEntrega.evidencias || null,
                            clienteNombre: data.cliente || data.destinatario?.nombre || 'N/A',
                            clienteTelefono: data.destinatario?.telefono || 'N/A'
                        });
                    }
                }
            });

            if (entregasHoy.length === 0) {
                console.log(`✅ ${companyData.nombre}: Sin entregas fallidas nuevas hoy`);
                continue;
            }

            // Enviar reporte usando el servicio de notificaciones
            const { default: whatsappNotificationService } = await import('./whatsappNotificationService.js');

            await whatsappNotificationService.sendDailyFailedDeliveriesReport(companyId, entregasHoy);

            console.log(`✅ Reporte enviado para ${companyData.nombre}: ${entregasHoy.length} entregas fallidas`);
        }

        console.log('🏁 Reporte diario de entregas fallidas completado');

    } catch (error) {
        console.error('❌ Error fatal en Reporte Diario de Entregas Fallidas:', error);
    }
};
