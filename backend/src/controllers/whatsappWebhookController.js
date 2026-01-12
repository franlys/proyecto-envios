import whatsappService from '../services/whatsappService.js';
import { db } from '../config/firebase.js';

// URL del Frontend (Debería estar en .env)
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://proyecto-envios.vercel.app';

export const handleWebhook = async (req, res) => {
    try {
        console.log('⚡️ WEBHOOK RECEIVED ⚡️');
        console.log('Payload:', JSON.stringify(req.body, null, 2));

        // Evolution API v1.x uses 'type', v2.x might use 'event'.
        // Based on previous logs, we injected "events": ["MESSAGES_UPSERT"]
        // Let's handle both structures to be safe.
        const { type, event, instance, data } = req.body;
        const eventType = type || event; // Normalize event type

        console.log(`🔍 Event Type: ${eventType}, Instance: ${instance}`);

        // Acknowledge receipt immediately
        res.status(200).send('OK');

        if (eventType === 'messages.upsert' || eventType === 'MESSAGES_UPSERT') {
            const messageData = data;


            // Basic checks
            if (!messageData.key.fromMe && messageData.message) {
                // Extract content
                const remoteJid = messageData.key.remoteJid; // e.g., 18092223333@s.whatsapp.net
                const pushName = messageData.pushName || 'Cliente';

                let text = '';
                if (messageData.message.conversation) {
                    text = messageData.message.conversation;
                } else if (messageData.message.extendedTextMessage?.text) {
                    text = messageData.message.extendedTextMessage.text;
                }

                if (!text) return; // Non-text message

                const cleanText = text.trim().toLowerCase();
                const instanceName = instance;

                // 🔹 REFACTOR: Lookup CompanyId FIRST
                let companyId = null;
                try {
                    const companiesRef = db.collection('companies');
                    // Find company where 'whatsappInstanceName' matches the webhook instance
                    const snapshot = await companiesRef.where('whatsappInstanceName', '==', instanceName).limit(1).get();

                    if (!snapshot.empty) {
                        companyId = snapshot.docs[0].id;
                        const companyData = snapshot.docs[0].data();
                        console.log(`🏢 Webhook matches Company: ${companyData.name} (${companyId})`);
                    } else {
                        console.warn(`⚠️ Webhook received for unknown instance: ${instanceName}`);

                        // 🟥 SELF-HEALING: Smart Suffix Search
                        // El ID puede contener guiones bajos, por lo que 'split' simple puede fallar.
                        // Ejemplo: company_embarques_ivan_embarques_ivan -> ID real: embarques_ivan
                        // Estrategia: Probar sufijos incrementalmente desde el final.

                        const parts = instanceName.split('_');
                        // Ignoramos el prefijo 'company' si existe, para no probar todo el string
                        const searchParts = parts[0] === 'company' ? parts.slice(1) : parts;

                        // Probamos combinaciones desde el final hacia atrás (hasta 4 niveles de profundidad)
                        let recoveredCompanyId = null;

                        for (let i = 1; i <= Math.min(4, searchParts.length); i++) {
                            const potentialId = searchParts.slice(-i).join('_');
                            console.log(`🔄 Self-Healing Attempt ${i}: Checking ID '${potentialId}'...`);

                            const docRef = companiesRef.doc(potentialId);
                            const doc = await docRef.get();

                            if (doc.exists) {
                                console.log(`✅ Company Found! ID matches: ${potentialId}`);
                                await docRef.update({ whatsappInstanceName: instanceName });
                                recoveredCompanyId = potentialId;
                                console.log(`🎉 Self-Healing Successful for: ${doc.data().name}`);
                                break; // Encontrado, salir del loop
                            }
                        }

                        if (recoveredCompanyId) {
                            companyId = recoveredCompanyId;
                        } else {
                            console.error(`❌ Self-Healing failed: Could not find company for instance ${instanceName}`);
                        }
                    }
                } catch (err) {
                    console.error('Error looking up company from instance:', err);
                }

                if (!companyId) {
                    console.warn('⚠️ No companyId found for instance, cannot reply.');
                    return;
                }

                console.log(`📩 Mensaje de ${pushName} (${remoteJid}): ${cleanText}`);

                // =============================================
                // 🧠 INTELIGENCIA DEL BOT (Versión Mejorada)
                // =============================================

                // 1. Detección de Código de Tracking
                // Formatos válidos:
                // - Nuevo: EMI-0001, LOE-9999, TRS-10000 (2-3 letras/números + 4+ dígitos)
                // - Legacy: RC-20251214-0001 (formato antiguo con fecha)
                // Flexible: Acepta espacios en lugar de guiones
                const trackingMatch = cleanText.match(/\b([A-Z0-9]{2,3})[-\s]?(\d{4,})\b|rc[-\s]?\d{8}[-\s]?\d{4}/i);

                if (trackingMatch) {
                    let rawCode;

                    // Si es formato nuevo (captura grupos 1 y 2)
                    if (trackingMatch[1] && trackingMatch[2]) {
                        rawCode = `${trackingMatch[1]}-${trackingMatch[2]}`.toUpperCase();
                    } else {
                        // Es formato legacy RC-YYYYMMDD-XXXX
                        rawCode = trackingMatch[0].toUpperCase().replace(/\s/g, '-');
                    }

                    console.log(`🔎 Detectado posible tracking: ${rawCode}`);

                    const recoleccionesRef = db.collection('recolecciones');
                    // Buscar por 'codigoTracking'
                    const snapshot = await recoleccionesRef
                        .where('companyId', '==', companyId)
                        .where('codigoTracking', '==', rawCode)
                        .limit(1)
                        .get();

                    if (!snapshot.empty) {
                        const data = snapshot.docs[0].data();
                        const estado = data.estado.toUpperCase().replace('_', ' ');
                        const historial = data.historial && data.historial.length > 0 ? data.historial[data.historial.length - 1].descripcion : 'Sin movimientos recientes';

                        let msg = `📦 *Estatus del Envío*\n*${rawCode}*\n\n📊 *Estado:* ${estado}\n📍 *Último Movimiento:* ${historial}\n\n`;

                        if (data.estado === 'pendiente') msg += '⏳ Tu paquete está en espera de recolección.';
                        else if (data.estado === 'en_transito') msg += '🚢 Tu paquete va en camino a RD.';
                        else if (data.estado === 'recibida_rd') msg += '🇩🇴 Tu paquete ya está en República Dominicana.';
                        else if (data.estado === 'entregado') msg += '✅ ¡Paquete entregado!';

                        await whatsappService.sendMessage(companyId, remoteJid, msg);
                        return; // Detener flujo aquí
                    } else {
                        await whatsappService.sendMessage(companyId, remoteJid, `❌ No encontré ningún envío con el código *${rawCode}*.\nPor favor verifica y vuelve a intentar.`);
                        return;
                    }
                }

                // =============================================
                // 🔹 SISTEMA DE COMANDOS POR ROL
                // =============================================

                // Identificar usuario y rol
                let userRole = null;
                let userName = null;
                let userId = null;
                try {
                    const usuariosSnapshot = await db.collection('usuarios')
                        .where('companyId', '==', companyId)
                        .where('whatsappFlota', '==', remoteJid.split('@')[0])
                        .limit(1)
                        .get();

                    if (!usuariosSnapshot.empty) {
                        const userData = usuariosSnapshot.docs[0].data();
                        userRole = userData.rol;
                        userName = userData.nombre;
                        userId = usuariosSnapshot.docs[0].id;
                        console.log(`✅ EMPLEADO identificado: ${userName} | Rol: ${userRole} | WhatsApp Flota: ${remoteJid.split('@')[0]}`);
                    } else {
                        console.log(`👤 CLIENTE detectado: ${pushName} | WhatsApp: ${remoteJid.split('@')[0]} (no registrado como empleado)`);
                    }
                } catch (err) {
                    console.error('Error verificando rol de usuario:', err);
                }

                // Si no hay rol identificado, continuar con el flujo normal del bot
                const esCliente = !userRole; // No tiene rol = es un cliente
                if (esCliente) {
                    console.log('👤 Usuario no identificado como empleado, usando bot público (CLIENTE)');
                }

                // =============================================================================
                // 🔒 VALIDACIÓN: BLOQUEAR COMANDOS DE EMPLEADOS PARA CLIENTES
                // =============================================================================
                // Lista de comandos exclusivos para empleados
                const COMANDOS_EMPLEADOS = [
                    'reasignar', 'info', 'lista',                           // Secretaria
                    'mis rutas', 'ruta actual', 'próxima entrega',          // Repartidor
                    'gastos', 'registrar gasto', 'pendientes',
                    'mis citas', 'pool', 'próxima cita', 'aceptar', 'rechazar', // Recolector
                    'contenedor', 'pendientes usa', 'stats almacen',        // Almacén USA
                    'recibidos', 'disponibles',                             // Almacén RD
                    'stats', 'alertas', 'reporte semanal',                  // Admin/Propietario
                    'top repartidores', 'zonas críticas', 'últimos recibidos'
                ];

                // Detectar si el cliente está intentando usar un comando de empleado
                if (esCliente) {
                    const comandoIntentado = COMANDOS_EMPLEADOS.find(cmd =>
                        cleanText.startsWith(cmd.toLowerCase()) ||
                        cleanText === cmd.toLowerCase()
                    );

                    if (comandoIntentado) {
                        console.log(`🚫 Cliente intentó usar comando de empleado: "${comandoIntentado}"`);
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `🔒 *Comando no disponible*\n\n` +
                            `El comando *"${comandoIntentado}"* es exclusivo para empleados.\n\n` +
                            `✨ *Como cliente puedes:*\n` +
                            `📦 Agendar envíos - Escribe "agendar"\n` +
                            `🔍 Rastrear paquetes - Envía tu código (ej: EMI-0001)\n` +
                            `💲 Consultar precios - Escribe "precio"\n` +
                            `👨‍💻 Hablar con soporte - Escribe "soporte"\n\n` +
                            `Escribe *"menú"* para ver todas las opciones.`
                        );
                        return; // Detener ejecución
                    }
                }

                // =============================================================================
                // 📋 COMANDOS PARA SECRETARIAS/ADMIN (Gestión de entregas fallidas)
                // =============================================================================
                const esSecretaria = ['secretaria', 'secretaria_usa', 'admin_general', 'propietario'].includes(userRole);

                if (esSecretaria && cleanText.match(/^reasignar/i)) {
                    console.log('🔄 Comando REASIGNAR detectado');

                    // Extraer código de tracking o "todo"
                    // Acepta cualquier prefijo de 2-3 caracteres: EMI-0001, LOE-9999, etc.
                    const reasignarMatch = cleanText.match(/reasignar\s+(todo|all|([A-Z0-9]{2,3})[-\s]?(\d{4,}))/i);

                    if (!reasignarMatch) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `⚠️ *Formato incorrecto*\n\nUsa:\n• \`reasignar [CODIGO]\` - Ejemplo: reasignar EMI-0245\n• \`reasignar todo\` - Reasigna todas las entregas fallidas de hoy`);
                        return;
                    }

                    const comando = reasignarMatch[1].toLowerCase();

                    if (comando === 'todo' || comando === 'all') {
                        // Reasignar todas las entregas fallidas de hoy
                        console.log('📦 Reasignando TODAS las entregas fallidas del día...');

                        const hoy = new Date();
                        hoy.setHours(0, 0, 0, 0);
                        const mañana = new Date(hoy);
                        mañana.setDate(mañana.getDate() + 1);

                        const snapshot = await db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'no_entregada')
                            .get();

                        if (snapshot.empty) {
                            await whatsappService.sendMessage(companyId, remoteJid,
                                `✅ No hay entregas fallidas pendientes.`);
                            return;
                        }

                        // Filtrar solo las del día de hoy
                        const facturasHoy = [];
                        snapshot.docs.forEach(doc => {
                            const data = doc.data();
                            if (data.reporteNoEntrega && data.reporteNoEntrega.fecha) {
                                const fechaReporte = new Date(data.reporteNoEntrega.fecha);
                                if (fechaReporte >= hoy && fechaReporte < mañana) {
                                    facturasHoy.push({ id: doc.id });
                                }
                            }
                        });

                        if (facturasHoy.length === 0) {
                            await whatsappService.sendMessage(companyId, remoteJid,
                                `✅ No hay entregas fallidas de hoy para reasignar.`);
                            return;
                        }

                        // Batch update
                        const batch = db.batch();
                        facturasHoy.forEach(({ id }) => {
                            const facturaRef = db.collection('recolecciones').doc(id);
                            batch.update(facturaRef, {
                                estado: 'recibida_rd', // Vuelve a estado disponible para rutas
                                rutaId: null,
                                repartidorId: null,
                                repartidorNombre: null,
                                reporteNoEntrega: null,
                                historial: db.FieldValue.arrayUnion({
                                    accion: 'reasignacion_masiva',
                                    descripcion: 'Reasignada por secretaria vía WhatsApp (comando: reasignar todo)',
                                    usuario: remoteJid.split('@')[0],
                                    fecha: new Date().toISOString()
                                })
                            });
                        });

                        await batch.commit();

                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ *Reasignación Masiva Completada*\n\n📦 *${facturasHoy.length} facturas* vueltas a estado disponible.\n\nYa puedes crear nuevas rutas con estos paquetes.`);

                        console.log(`✅ ${facturasHoy.length} facturas reasignadas masivamente`);
                        return;

                    } else {
                        // Reasignar factura específica
                        // Normalizar código: Si tiene grupos 2 y 3, es formato nuevo (LOE-9999)
                        let codigoTracking;
                        if (reasignarMatch[2] && reasignarMatch[3]) {
                            codigoTracking = `${reasignarMatch[2]}-${reasignarMatch[3]}`.toUpperCase();
                        } else {
                            codigoTracking = reasignarMatch[1].toUpperCase();
                        }
                        console.log(`📦 Reasignando factura: ${codigoTracking}`);

                        const facturaSnapshot = await db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('codigoTracking', '==', codigoTracking)
                            .limit(1)
                            .get();

                        if (facturaSnapshot.empty) {
                            await whatsappService.sendMessage(companyId, remoteJid,
                                `❌ No encontré la factura *${codigoTracking}*.\n\nVerifica el código y vuelve a intentar.`);
                            return;
                        }

                        const facturaDoc = facturaSnapshot.docs[0];
                        const facturaData = facturaDoc.data();

                        if (facturaData.estado !== 'no_entregada') {
                            await whatsappService.sendMessage(companyId, remoteJid,
                                `⚠️ La factura *${codigoTracking}* no está en estado "no_entregada".\n\n📊 Estado actual: *${facturaData.estado}*`);
                            return;
                        }

                        // Actualizar a estado disponible
                        await db.collection('recolecciones').doc(facturaDoc.id).update({
                            estado: 'recibida_rd',
                            rutaId: null,
                            repartidorId: null,
                            repartidorNombre: null,
                            reporteNoEntrega: null,
                            historial: db.FieldValue.arrayUnion({
                                accion: 'reasignacion_individual',
                                descripcion: 'Reasignada por secretaria vía WhatsApp',
                                usuario: remoteJid.split('@')[0],
                                fecha: new Date().toISOString()
                            })
                        });

                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ *Factura Reasignada*\n\n📦 *${codigoTracking}*\n\nVuelta a estado disponible. Ya puedes agregarla a una nueva ruta.`);

                        console.log(`✅ Factura ${codigoTracking} reasignada`);
                        return;
                    }
                }

                // COMANDO: INFO (Solo para secretarias)
                // Acepta cualquier formato de tracking
                if (esSecretaria && cleanText.match(/^info\s+([A-Z0-9]{2,3})[-\s]?(\d{4,})/i)) {
                    console.log('ℹ️ Comando INFO detectado');

                    const infoMatch = cleanText.match(/info\s+(([A-Z0-9]{2,3})[-\s]?(\d{4,}))/i);
                    // Normalizar código
                    let codigoTracking;
                    if (infoMatch[2] && infoMatch[3]) {
                        codigoTracking = `${infoMatch[2]}-${infoMatch[3]}`.toUpperCase();
                    } else {
                        codigoTracking = infoMatch[1].toUpperCase().replace(/\s/g, '-');
                    }

                    const facturaSnapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .where('codigoTracking', '==', codigoTracking)
                        .limit(1)
                        .get();

                    if (facturaSnapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `❌ No encontré la factura *${codigoTracking}*.`);
                        return;
                    }

                    const facturaData = facturaSnapshot.docs[0].data();
                    const reporteNoEntrega = facturaData.reporteNoEntrega || {};

                    let mensaje = `📋 *Información de Factura*\n\n`;
                    mensaje += `📦 *Código:* ${codigoTracking}\n`;
                    mensaje += `📊 *Estado:* ${facturaData.estado}\n`;
                    mensaje += `👤 *Cliente:* ${facturaData.cliente || facturaData.destinatario?.nombre || 'N/A'}\n`;
                    mensaje += `📍 *Dirección:* ${facturaData.direccion || facturaData.destinatario?.direccion || 'N/A'}\n`;

                    if (facturaData.estado === 'no_entregada') {
                        mensaje += `\n❌ *ENTREGA FALLIDA*\n`;
                        mensaje += `🚚 *Repartidor:* ${facturaData.repartidorNombre || 'N/A'}\n`;
                        mensaje += `📝 *Motivo:* ${reporteNoEntrega.motivo || 'No especificado'}\n`;
                        mensaje += `📅 *Fecha reporte:* ${reporteNoEntrega.fecha ? new Date(reporteNoEntrega.fecha).toLocaleString('es-DO') : 'N/A'}\n`;
                        mensaje += `\n💡 Para reasignar: \`reasignar ${codigoTracking}\``;
                    }

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: LISTA (Solo para secretarias) - Ver entregas fallidas de hoy
                if (esSecretaria && cleanText.match(/^(lista|listar|fallidas|pendientes)$/i)) {
                    console.log('📋 Comando LISTA detectado');

                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    const mañana = new Date(hoy);
                    mañana.setDate(mañana.getDate() + 1);

                    const snapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .where('estado', '==', 'no_entregada')
                        .get();

                    const facturasHoy = [];
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        if (data.reporteNoEntrega && data.reporteNoEntrega.fecha) {
                            const fechaReporte = new Date(data.reporteNoEntrega.fecha);
                            if (fechaReporte >= hoy && fechaReporte < mañana) {
                                facturasHoy.push({
                                    codigo: data.codigoTracking,
                                    motivo: data.reporteNoEntrega.motivo || 'No especificado',
                                    repartidor: data.repartidorNombre || 'N/A'
                                });
                            }
                        }
                    });

                    if (facturasHoy.length === 0) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No hay entregas fallidas hoy. ¡Todo perfecto!`);
                        return;
                    }

                    let mensaje = `📋 *ENTREGAS FALLIDAS HOY*\n📅 ${new Date().toLocaleDateString('es-DO')}\n📦 Total: ${facturasHoy.length}\n\n`;

                    facturasHoy.slice(0, 10).forEach((f, i) => {
                        mensaje += `${i + 1}. *${f.codigo}*\n   Motivo: ${f.motivo}\n   Chofer: ${f.repartidor}\n\n`;
                    });

                    if (facturasHoy.length > 10) {
                        mensaje += `\n_...y ${facturasHoy.length - 10} más._\n`;
                    }

                    mensaje += `\n💡 *Comandos disponibles:*\n`;
                    mensaje += `• \`info [CODIGO]\` - Ver detalles de una factura\n`;
                    mensaje += `• \`reasignar [CODIGO]\` - Reasignar una factura\n`;
                    mensaje += `• \`reasignar todo\` - Reasignar todas`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // =============================================================================
                // 🚚 COMANDOS PARA REPARTIDORES
                // =============================================================================
                const esRepartidor = userRole === 'repartidor';

                // COMANDO: mis rutas
                if (esRepartidor && cleanText.match(/^(mis\s*rutas|rutas|mi\s*ruta)$/i)) {
                    console.log('🚚 Comando MIS RUTAS detectado');

                    const snapshot = await db.collection('rutas')
                        .where('companyId', '==', companyId)
                        .where('repartidorId', '==', userId)
                        .where('estado', 'in', ['asignada', 'en_curso', 'cargada'])
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No tienes rutas activas en este momento.`);
                        return;
                    }

                    let mensaje = `🚚 *TUS RUTAS ACTIVAS*\n\n`;
                    snapshot.docs.forEach((doc, i) => {
                        const ruta = doc.data();
                        mensaje += `${i + 1}. *${ruta.nombre || doc.id}*\n`;
                        mensaje += `   Estado: ${ruta.estado}\n`;
                        mensaje += `   Paquetes: ${ruta.facturas?.length || 0}\n`;
                        mensaje += `   Zona: ${ruta.zona || 'N/A'}\n\n`;
                    });

                    mensaje += `💡 *Comandos:*\n`;
                    mensaje += `• \`gastos\` - Ver gastos de hoy\n`;
                    mensaje += `• \`pendientes\` - Paquetes sin entregar`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: gastos (repartidor)
                if (esRepartidor && cleanText.match(/^gastos$/i)) {
                    console.log('💰 Comando GASTOS detectado');

                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);

                    const snapshot = await db.collection('rutas')
                        .where('companyId', '==', companyId)
                        .where('repartidorId', '==', userId)
                        .get();

                    let totalGastos = 0;
                    let gastosDetalle = [];

                    snapshot.docs.forEach(doc => {
                        const ruta = doc.data();
                        const fechaCreacion = new Date(ruta.createdAt);
                        if (fechaCreacion >= hoy && ruta.gastos) {
                            ruta.gastos.forEach(g => {
                                totalGastos += parseFloat(g.monto || 0);
                                gastosDetalle.push({ tipo: g.tipo, monto: g.monto, ruta: ruta.nombre || doc.id });
                            });
                        }
                    });

                    if (gastosDetalle.length === 0) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No has registrado gastos hoy.`);
                        return;
                    }

                    let mensaje = `💰 *TUS GASTOS HOY*\n📅 ${new Date().toLocaleDateString('es-DO')}\n\n`;
                    gastosDetalle.forEach((g, i) => {
                        mensaje += `${i + 1}. ${g.tipo}: $${g.monto}\n   Ruta: ${g.ruta}\n\n`;
                    });
                    mensaje += `💵 *Total: $${totalGastos.toFixed(2)}*`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: ruta actual (repartidor)
                if (esRepartidor && cleanText.match(/^ruta\s*actual$/i)) {
                    console.log('🚚 Comando RUTA ACTUAL detectado');

                    const snapshot = await db.collection('rutas')
                        .where('companyId', '==', companyId)
                        .where('repartidorId', '==', userId)
                        .where('estado', '==', 'en_curso')
                        .limit(1)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `📭 No tienes ninguna ruta en curso en este momento.\n\n💡 Usa \`mis rutas\` para ver todas tus rutas activas.`);
                        return;
                    }

                    const rutaDoc = snapshot.docs[0];
                    const ruta = rutaDoc.data();
                    const facturas = ruta.facturas || [];
                    const entregados = facturas.filter(f => f.estado === 'entregado').length;
                    const pendientes = facturas.length - entregados;

                    let mensaje = `🚚 *RUTA EN CURSO*\n\n`;
                    mensaje += `📋 *${ruta.nombre || rutaDoc.id}*\n`;
                    mensaje += `📍 Zona: ${ruta.zona || 'N/A'}\n`;
                    mensaje += `📦 Total paquetes: ${facturas.length}\n`;
                    mensaje += `✅ Entregados: ${entregados}\n`;
                    mensaje += `⏳ Pendientes: ${pendientes}\n`;
                    mensaje += `💰 Gastos: $${ruta.totalGastos || 0}\n`;
                    mensaje += `🕐 Inicio: ${new Date(ruta.inicioReal || ruta.createdAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}\n\n`;
                    mensaje += `💡 Usa \`próxima entrega\` para ver el siguiente paquete`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: próxima entrega (repartidor)
                if (esRepartidor && cleanText.match(/^pr[oó]xima\s*entrega$/i)) {
                    console.log('📦 Comando PRÓXIMA ENTREGA detectado');

                    const snapshot = await db.collection('rutas')
                        .where('companyId', '==', companyId)
                        .where('repartidorId', '==', userId)
                        .where('estado', '==', 'en_curso')
                        .limit(1)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `📭 No tienes ninguna ruta en curso.`);
                        return;
                    }

                    const ruta = snapshot.docs[0].data();
                    const facturas = ruta.facturas || [];
                    const proximaPendiente = facturas.find(f => !['entregado', 'no_entregada'].includes(f.estado));

                    if (!proximaPendiente) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ ¡Has completado todas las entregas! 🎉\n\n💡 Usa \`gastos\` para revisar tus gastos antes de cerrar la ruta.`);
                        return;
                    }

                    // Obtener datos completos de la factura
                    const facturaDoc = await db.collection('recolecciones').doc(proximaPendiente.id).get();
                    const facturaData = facturaDoc.exists ? facturaDoc.data() : {};

                    let mensaje = `📦 *PRÓXIMA ENTREGA*\n\n`;
                    mensaje += `🏷️ Código: *${proximaPendiente.codigoTracking || proximaPendiente.id}*\n`;
                    mensaje += `👤 Cliente: ${facturaData.destinatario?.nombre || 'N/A'}\n`;
                    mensaje += `📱 Teléfono: ${facturaData.destinatario?.telefono || 'N/A'}\n`;
                    mensaje += `📍 Dirección: ${facturaData.destinatario?.direccion || 'N/A'}\n`;
                    if (facturaData.destinatario?.referencia) {
                        mensaje += `📌 Referencia: ${facturaData.destinatario.referencia}\n`;
                    }
                    mensaje += `💰 Valor: $${facturaData.pago?.monto || 0}\n`;
                    mensaje += `💵 A cobrar: $${facturaData.pago?.montoPendiente || 0}`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: registrar gasto [tipo] [monto] (repartidor)
                if (esRepartidor && cleanText.match(/^registrar\s*gasto/i)) {
                    console.log('💰 Comando REGISTRAR GASTO detectado');

                    const match = cleanText.match(/^registrar\s*gasto\s+(.+?)\s+(\d+(?:\.\d+)?)$/i);

                    if (!match) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `❌ Formato incorrecto.\n\n📝 *Uso correcto:*\n\`registrar gasto [tipo] [monto]\`\n\n*Ejemplos:*\n• \`registrar gasto gasolina 500\`\n• \`registrar gasto peaje 50\`\n• \`registrar gasto comida 150\``);
                        return;
                    }

                    const tipoGasto = match[1].trim();
                    const montoGasto = parseFloat(match[2]);

                    // Buscar ruta activa
                    const snapshot = await db.collection('rutas')
                        .where('companyId', '==', companyId)
                        .where('repartidorId', '==', userId)
                        .where('estado', 'in', ['asignada', 'en_curso', 'cargada'])
                        .limit(1)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `❌ No tienes una ruta activa para registrar gastos.`);
                        return;
                    }

                    const rutaRef = snapshot.docs[0].ref;
                    const rutaData = snapshot.docs[0].data();

                    const nuevoGasto = {
                        id: `gasto_${Date.now()}`,
                        tipo: tipoGasto,
                        monto: montoGasto,
                        descripcion: `Registrado vía WhatsApp`,
                        fecha: new Date().toISOString(),
                        registradoPor: userId,
                        nombreRegistrador: userName
                    };

                    const gastosActuales = rutaData.gastos || [];
                    gastosActuales.push(nuevoGasto);
                    const totalGastos = gastosActuales.reduce((sum, g) => sum + (g.monto || 0), 0);

                    await rutaRef.update({
                        gastos: gastosActuales,
                        totalGastos: totalGastos,
                        updatedAt: new Date().toISOString()
                    });

                    await whatsappService.sendMessage(companyId, remoteJid,
                        `✅ Gasto registrado exitosamente\n\n💰 *${tipoGasto}*: $${montoGasto}\n📊 Total gastos hoy: $${totalGastos.toFixed(2)}`);
                    return;
                }

                // COMANDO: pendientes (repartidor)
                if (esRepartidor && cleanText.match(/^pendientes$/i)) {
                    console.log('📦 Comando PENDIENTES detectado');

                    const snapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .where('repartidorId', '==', userId)
                        .where('estado', 'in', ['asignado', 'en_ruta'])
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No tienes paquetes pendientes. ¡Excelente trabajo!`);
                        return;
                    }

                    let mensaje = `📦 *PAQUETES PENDIENTES*\n\n`;
                    snapshot.docs.slice(0, 10).forEach((doc, i) => {
                        const paquete = doc.data();
                        mensaje += `${i + 1}. *${paquete.codigoTracking}*\n`;
                        mensaje += `   Cliente: ${paquete.cliente || paquete.destinatario?.nombre || 'N/A'}\n`;
                        mensaje += `   Dirección: ${paquete.destinatario?.direccion || 'N/A'}\n\n`;
                    });

                    if (snapshot.docs.length > 10) {
                        mensaje += `_...y ${snapshot.docs.length - 10} más._\n\n`;
                    }

                    mensaje += `📊 Total: ${snapshot.docs.length} paquetes`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // =============================================================================
                // 📦 COMANDOS PARA RECOLECTORES
                // =============================================================================
                const esRecolector = userRole === 'recolector';

                // COMANDO: mis citas (recolector)
                if (esRecolector && cleanText.match(/^(mis\s*citas|citas|solicitudes)$/i)) {
                    console.log('📅 Comando MIS CITAS detectado');

                    const snapshot = await db.collection('solicitudes_recoleccion')
                        .where('companyId', '==', companyId)
                        .where('recolectorId', '==', userId)
                        .where('estado', 'in', ['asignada_pendiente', 'asignada'])
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No tienes citas asignadas.\n\n💡 Escribe \`pool\` para ver solicitudes disponibles.`);
                        return;
                    }

                    let mensaje = `📅 *TUS CITAS ASIGNADAS*\n\n`;
                    snapshot.docs.forEach((doc, i) => {
                        const cita = doc.data();
                        const cliente = cita.cliente || {};
                        const programacion = cita.programacion || {};
                        mensaje += `${i + 1}. *${cliente.nombre}*\n`;
                        mensaje += `   📅 ${programacion.fecha} a las ${programacion.hora}\n`;
                        mensaje += `   📍 ${cita.ubicacion?.direccion || 'N/A'}\n`;
                        if (cita.estado === 'asignada_pendiente') {
                            mensaje += `   ⏰ *PENDIENTE ACEPTACIÓN*\n`;
                        }
                        mensaje += `\n`;
                    });

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: pool (recolector)
                if (esRecolector && cleanText.match(/^pool$/i)) {
                    console.log('🔄 Comando POOL detectado');

                    const snapshot = await db.collection('solicitudes_recoleccion')
                        .where('companyId', '==', companyId)
                        .where('estado', '==', 'pendiente')
                        .limit(10)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No hay solicitudes disponibles en el pool.`);
                        return;
                    }

                    let mensaje = `🔄 *SOLICITUDES DISPONIBLES*\n\n`;
                    snapshot.docs.forEach((doc, i) => {
                        const solicitud = doc.data();
                        const cliente = solicitud.cliente || {};
                        const programacion = solicitud.programacion || {};
                        mensaje += `${i + 1}. ${cliente.nombre}\n`;
                        mensaje += `   📅 ${programacion.fecha} - ${programacion.hora}\n`;
                        mensaje += `   📍 ${solicitud.ubicacion?.sector || 'N/A'}\n\n`;
                    });

                    mensaje += `💡 Para tomar una solicitud, usa el sistema web.`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: aceptar [ID] (recolector)
                if (esRecolector && cleanText.match(/^aceptar\s+/i)) {
                    console.log('✅ Comando ACEPTAR detectado');

                    const match = cleanText.match(/^aceptar\s+(.+)$/i);
                    if (!match) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `❌ Formato incorrecto.\n\n📝 *Uso:* \`aceptar [ID]\`\n*Ejemplo:* \`aceptar SOL-001\``);
                        return;
                    }

                    const solicitudId = match[1].trim();

                    // Buscar la solicitud
                    const snapshot = await db.collection('solicitudes_recoleccion')
                        .where('companyId', '==', companyId)
                        .where('recolectorId', '==', userId)
                        .where('estado', '==', 'asignada_pendiente')
                        .get();

                    const solicitudDoc = snapshot.docs.find(doc =>
                        doc.id.includes(solicitudId) || doc.data().codigo === solicitudId
                    );

                    if (!solicitudDoc) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `❌ No se encontró la solicitud *${solicitudId}* pendiente de tu aceptación.\n\n💡 Usa \`mis citas\` para ver tus asignaciones.`);
                        return;
                    }

                    // Actualizar estado a asignada (confirmada)
                    await solicitudDoc.ref.update({
                        estado: 'asignada',
                        aceptadaEn: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });

                    const solicitud = solicitudDoc.data();
                    const cliente = solicitud.cliente || {};
                    const programacion = solicitud.programacion || {};

                    await whatsappService.sendMessage(companyId, remoteJid,
                        `✅ *Solicitud aceptada exitosamente*\n\n` +
                        `👤 Cliente: ${cliente.nombre}\n` +
                        `📅 Fecha: ${programacion.fecha}\n` +
                        `🕐 Hora: ${programacion.hora}\n` +
                        `📍 Dirección: ${solicitud.ubicacion?.direccion || 'N/A'}\n\n` +
                        `📱 Teléfono cliente: ${cliente.telefono || 'N/A'}`);
                    return;
                }

                // COMANDO: rechazar [ID] [motivo] (recolector)
                if (esRecolector && cleanText.match(/^rechazar\s+/i)) {
                    console.log('❌ Comando RECHAZAR detectado');

                    const match = cleanText.match(/^rechazar\s+(\S+)\s*(.*)$/i);
                    if (!match) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `❌ Formato incorrecto.\n\n📝 *Uso:* \`rechazar [ID] [motivo]\`\n*Ejemplo:* \`rechazar SOL-001 no puedo llegar a tiempo\``);
                        return;
                    }

                    const solicitudId = match[1].trim();
                    const motivo = match[2].trim() || 'No especificado';

                    // Buscar la solicitud
                    const snapshot = await db.collection('solicitudes_recoleccion')
                        .where('companyId', '==', companyId)
                        .where('recolectorId', '==', userId)
                        .where('estado', '==', 'asignada_pendiente')
                        .get();

                    const solicitudDoc = snapshot.docs.find(doc =>
                        doc.id.includes(solicitudId) || doc.data().codigo === solicitudId
                    );

                    if (!solicitudDoc) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `❌ No se encontró la solicitud *${solicitudId}* pendiente de tu aceptación.`);
                        return;
                    }

                    // Devolver al pool
                    await solicitudDoc.ref.update({
                        estado: 'pendiente',
                        recolectorId: null,
                        recolectorNombre: null,
                        motivoRechazo: motivo,
                        rechazadaEn: new Date().toISOString(),
                        rechazadaPor: userName,
                        updatedAt: new Date().toISOString()
                    });

                    await whatsappService.sendMessage(companyId, remoteJid,
                        `✅ Solicitud rechazada. Ha sido devuelta al pool.\n\n📝 Motivo registrado: ${motivo}`);
                    return;
                }

                // COMANDO: próxima cita (recolector)
                if (esRecolector && cleanText.match(/^pr[oó]xima\s*cita$/i)) {
                    console.log('📅 Comando PRÓXIMA CITA detectado');

                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);

                    const snapshot = await db.collection('solicitudes_recoleccion')
                        .where('companyId', '==', companyId)
                        .where('recolectorId', '==', userId)
                        .where('estado', 'in', ['asignada_pendiente', 'asignada'])
                        .get();

                    // Filtrar y ordenar por fecha/hora
                    const citasHoy = [];
                    snapshot.docs.forEach(doc => {
                        const cita = doc.data();
                        const programacion = cita.programacion || {};
                        if (programacion.fecha) {
                            const [dia, mes, anio] = programacion.fecha.split('/');
                            const fechaCita = new Date(anio, mes - 1, dia);
                            if (fechaCita >= hoy) {
                                citasHoy.push({ id: doc.id, ...cita, fechaCita, programacion });
                            }
                        }
                    });

                    if (citasHoy.length === 0) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `📅 No tienes citas programadas próximamente.\n\n💡 Usa \`pool\` para ver solicitudes disponibles.`);
                        return;
                    }

                    // Ordenar por fecha/hora
                    citasHoy.sort((a, b) => a.fechaCita - b.fechaCita);
                    const proxima = citasHoy[0];

                    let mensaje = `📅 *TU PRÓXIMA CITA*\n\n`;
                    mensaje += `👤 Cliente: *${proxima.cliente?.nombre}*\n`;
                    mensaje += `📱 Teléfono: ${proxima.cliente?.telefono || 'N/A'}\n`;
                    mensaje += `📅 Fecha: ${proxima.programacion?.fecha}\n`;
                    mensaje += `🕐 Hora: ${proxima.programacion?.hora}\n`;
                    mensaje += `📍 Dirección: ${proxima.ubicacion?.direccion || 'N/A'}\n`;
                    if (proxima.ubicacion?.referencia) {
                        mensaje += `📌 Referencia: ${proxima.ubicacion.referencia}\n`;
                    }
                    if (proxima.notas) {
                        mensaje += `📝 Notas: ${proxima.notas}\n`;
                    }
                    if (proxima.estado === 'asignada_pendiente') {
                        mensaje += `\n⏰ *PENDIENTE ACEPTACIÓN*\n`;
                        mensaje += `💡 Usa \`aceptar ${proxima.id}\` para confirmar`;
                    }

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // =============================================================================
                // 📦 COMANDOS PARA ALMACÉN USA
                // =============================================================================
                const esAlmacenUsa = userRole === 'almacen_usa';

                // COMANDO: contenedor (almacén USA)
                if (esAlmacenUsa && cleanText.match(/^contenedor$/i)) {
                    console.log('📦 Comando CONTENEDOR detectado');

                    const snapshot = await db.collection('contenedores')
                        .where('companyId', '==', companyId)
                        .where('estado', '==', 'abierto')
                        .limit(1)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No hay contenedores abiertos actualmente.`);
                        return;
                    }

                    const contenedor = snapshot.docs[0].data();
                    const stats = contenedor.estadisticas || {};

                    let mensaje = `📦 *CONTENEDOR ACTUAL*\n\n`;
                    mensaje += `🔢 *Número:* ${contenedor.numeroContenedor}\n`;
                    mensaje += `📊 *Estado:* ${contenedor.estado}\n`;
                    mensaje += `📦 *Facturas:* ${contenedor.facturas?.length || 0}\n`;
                    mensaje += `✅ *Completas:* ${stats.completas || 0}\n`;
                    mensaje += `⚠️ *Incompletas:* ${stats.incompletas || 0}\n\n`;
                    mensaje += `💡 *Comandos:*\n`;
                    mensaje += `• \`pendientes usa\` - Ver pendientes\n`;
                    mensaje += `• \`stats usa\` - Estadísticas del día`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: pendientes usa
                if (esAlmacenUsa && cleanText.match(/^pendientes\s*usa$/i)) {
                    console.log('📋 Comando PENDIENTES USA detectado');

                    const snapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .where('estado', 'in', ['pendiente', 'en_revision'])
                        .limit(15)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No hay paquetes pendientes de procesar.`);
                        return;
                    }

                    let mensaje = `📋 *PAQUETES PENDIENTES*\n\n`;
                    snapshot.docs.forEach((doc, i) => {
                        const pkg = doc.data();
                        mensaje += `${i + 1}. *${pkg.codigoTracking}*\n`;
                        mensaje += `   De: ${pkg.remitente?.nombre || 'N/A'}\n`;
                        mensaje += `   Items: ${pkg.items?.length || 0}\n\n`;
                    });

                    if (snapshot.size > 15) {
                        mensaje += `_...y más paquetes pendientes._\n\n`;
                    }

                    mensaje += `📊 Total: ${snapshot.size} paquetes`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: stats almacen (almacén USA)
                if (esAlmacenUsa && cleanText.match(/^stats\s*almacen$/i)) {
                    console.log('📊 Comando STATS ALMACEN detectado');

                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);

                    const [pendientes, enRevision, procesadosHoy, contenedorAbierto] = await Promise.all([
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'pendiente')
                            .get(),
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'en_revision')
                            .get(),
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'en_transito')
                            .get(),
                        db.collection('contenedores')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'abierto')
                            .limit(1)
                            .get()
                    ]);

                    let mensaje = `📊 *ESTADÍSTICAS ALMACÉN USA*\n`;
                    mensaje += `📅 ${new Date().toLocaleDateString('es-DO')}\n\n`;
                    mensaje += `📦 Pendientes: ${pendientes.size}\n`;
                    mensaje += `🔍 En revisión: ${enRevision.size}\n`;
                    mensaje += `✅ Procesados hoy: ${procesadosHoy.size}\n`;
                    mensaje += `📦 Contenedor abierto: ${contenedorAbierto.empty ? 'No' : 'Sí'}\n`;

                    if (!contenedorAbierto.empty) {
                        const contenedor = contenedorAbierto.docs[0].data();
                        mensaje += `   └─ ${contenedor.nombre}: ${contenedor.facturas?.length || 0} paquetes`;
                    }

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: últimos recibidos (almacén USA)
                if (esAlmacenUsa && cleanText.match(/^[uú]ltimos\s*recibidos$/i)) {
                    console.log('📦 Comando ÚLTIMOS RECIBIDOS detectado');

                    const snapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .orderBy('createdAt', 'desc')
                        .limit(10)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `📭 No hay paquetes registrados.`);
                        return;
                    }

                    let mensaje = `📦 *ÚLTIMOS PAQUETES RECIBIDOS*\n\n`;
                    snapshot.docs.forEach((doc, i) => {
                        const pkg = doc.data();
                        const fecha = new Date(pkg.createdAt);
                        mensaje += `${i + 1}. *${pkg.codigoTracking}*\n`;
                        mensaje += `   De: ${pkg.remitente?.nombre || 'N/A'}\n`;
                        mensaje += `   Estado: ${pkg.estado}\n`;
                        mensaje += `   🕐 ${fecha.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}\n\n`;
                    });

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // =============================================================================
                // 🇩🇴 COMANDOS PARA ALMACÉN RD
                // =============================================================================
                const esAlmacenRD = userRole === 'almacen_rd';

                // COMANDO: recibidos (almacén RD)
                if (esAlmacenRD && cleanText.match(/^(recibidos|disponibles)$/i)) {
                    console.log('📦 Comando RECIBIDOS detectado');

                    const snapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .where('estado', '==', 'recibida_rd')
                        .limit(15)
                        .get();

                    if (snapshot.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No hay paquetes recibidos pendientes de asignar.`);
                        return;
                    }

                    let mensaje = `📦 *PAQUETES DISPONIBLES PARA RUTAS*\n\n`;
                    snapshot.docs.forEach((doc, i) => {
                        const pkg = doc.data();
                        mensaje += `${i + 1}. *${pkg.codigoTracking}*\n`;
                        mensaje += `   Cliente: ${pkg.destinatario?.nombre || 'N/A'}\n`;
                        mensaje += `   Zona: ${pkg.zona || 'N/A'}\n\n`;
                    });

                    if (snapshot.size > 15) {
                        mensaje += `_...y más paquetes disponibles._\n\n`;
                    }

                    mensaje += `📊 Total: ${snapshot.size} paquetes\n\n`;
                    mensaje += `💡 Listos para crear rutas en el sistema.`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // =============================================================================
                // 👔 COMANDOS PARA ADMIN GENERAL Y PROPIETARIO
                // =============================================================================
                const esAdmin = ['admin_general', 'propietario'].includes(userRole);

                // COMANDO: stats (admin/propietario)
                if (esAdmin && cleanText.match(/^stats$/i)) {
                    console.log('📊 Comando STATS detectado');

                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);

                    // Contar facturas del día
                    const [entregadas, pendientes, fallidas, rutas] = await Promise.all([
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'entregada')
                            .get(),
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', 'in', ['asignado', 'en_ruta'])
                            .get(),
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'no_entregada')
                            .get(),
                        db.collection('rutas')
                            .where('companyId', '==', companyId)
                            .where('estado', 'in', ['asignada', 'en_curso', 'cargada'])
                            .get()
                    ]);

                    let mensaje = `📊 *ESTADÍSTICAS EN VIVO*\n`;
                    mensaje += `📅 ${new Date().toLocaleDateString('es-DO')}\n\n`;
                    mensaje += `✅ Entregadas: ${entregadas.size}\n`;
                    mensaje += `📦 En proceso: ${pendientes.size}\n`;
                    mensaje += `❌ Fallidas: ${fallidas.size}\n`;
                    mensaje += `🚚 Rutas activas: ${rutas.size}\n\n`;

                    const total = entregadas.size + pendientes.size + fallidas.size;
                    if (total > 0) {
                        const tasa = ((entregadas.size / total) * 100).toFixed(1);
                        mensaje += `📈 Tasa de éxito: ${tasa}%`;
                    }

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: alertas (admin/propietario)
                if (esAdmin && cleanText.match(/^alertas$/i)) {
                    console.log('⚠️ Comando ALERTAS detectado');

                    const [fallidas, rutasAtrasadas, sinAsignar] = await Promise.all([
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'no_entregada')
                            .get(),
                        db.collection('rutas')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'en_curso')
                            .get(),
                        db.collection('recolecciones')
                            .where('companyId', '==', companyId)
                            .where('estado', '==', 'recibida_rd')
                            .get()
                    ]);

                    let mensaje = `⚠️ *ALERTAS DEL SISTEMA*\n\n`;

                    if (fallidas.size > 0) {
                        mensaje += `❌ ${fallidas.size} entregas fallidas\n`;
                    }
                    if (rutasAtrasadas.size > 0) {
                        mensaje += `🚚 ${rutasAtrasadas.size} rutas en curso\n`;
                    }
                    if (sinAsignar.size > 10) {
                        mensaje += `📦 ${sinAsignar.size} paquetes sin asignar\n`;
                    }

                    if (fallidas.size === 0 && sinAsignar.size <= 10) {
                        mensaje += `✅ Todo funcionando correctamente.\n`;
                    }

                    mensaje += `\n💡 *Comandos:*\n`;
                    mensaje += `• \`stats\` - Ver estadísticas\n`;
                    mensaje += `• \`fallidas\` - Ver entregas fallidas`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: reporte semanal (admin/propietario)
                if (esAdmin && cleanText.match(/^reporte\s*semanal$/i)) {
                    console.log('📊 Comando REPORTE SEMANAL detectado');

                    const hoy = new Date();
                    const hace7dias = new Date(hoy);
                    hace7dias.setDate(hace7dias.getDate() - 7);

                    const snapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .get();

                    // Filtrar por fecha
                    let entregadas = 0;
                    let fallidas = 0;
                    let ingresoTotal = 0;

                    snapshot.docs.forEach(doc => {
                        const factura = doc.data();
                        const fechaCreacion = new Date(factura.createdAt);
                        if (fechaCreacion >= hace7dias) {
                            if (factura.estado === 'entregado') {
                                entregadas++;
                                ingresoTotal += factura.pago?.monto || 0;
                            } else if (factura.estado === 'no_entregada') {
                                fallidas++;
                            }
                        }
                    });

                    const total = entregadas + fallidas;
                    const tasaExito = total > 0 ? ((entregadas / total) * 100).toFixed(1) : 0;

                    let mensaje = `📊 *REPORTE SEMANAL*\n`;
                    mensaje += `📅 ${hace7dias.toLocaleDateString('es-DO')} - ${hoy.toLocaleDateString('es-DO')}\n\n`;
                    mensaje += `📦 Total entregas: ${entregadas}\n`;
                    mensaje += `❌ Fallidas: ${fallidas}\n`;
                    mensaje += `📈 Tasa de éxito: ${tasaExito}%\n`;
                    mensaje += `💰 Ingresos: $${ingresoTotal.toLocaleString('es-DO')}\n\n`;
                    mensaje += `💡 Usa \`top repartidores\` para ver el ranking`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: top repartidores (admin/propietario)
                if (esAdmin && cleanText.match(/^top\s*repartidores$/i)) {
                    console.log('🏆 Comando TOP REPARTIDORES detectado');

                    const hoy = new Date();
                    const hace7dias = new Date(hoy);
                    hace7dias.setDate(hace7dias.getDate() - 7);

                    const snapshot = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .where('estado', '==', 'entregado')
                        .get();

                    // Agrupar por repartidor
                    const ranking = {};
                    snapshot.docs.forEach(doc => {
                        const factura = doc.data();
                        const repartidor = factura.repartidorNombre || 'Sin asignar';
                        if (!ranking[repartidor]) {
                            ranking[repartidor] = 0;
                        }
                        ranking[repartidor]++;
                    });

                    // Convertir a array y ordenar
                    const topRepartidores = Object.entries(ranking)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);

                    if (topRepartidores.length === 0) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `📊 No hay datos de entregas aún.`);
                        return;
                    }

                    let mensaje = `🏆 *TOP 5 REPARTIDORES*\n`;
                    mensaje += `📅 Última semana\n\n`;
                    topRepartidores.forEach(([nombre, entregas], i) => {
                        const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📍';
                        mensaje += `${medalla} ${i + 1}. *${nombre}*\n`;
                        mensaje += `   └─ ${entregas} entregas exitosas\n\n`;
                    });

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: zonas críticas (admin/propietario)
                if (esAdmin && cleanText.match(/^zonas\s*cr[ií]ticas$/i)) {
                    console.log('📍 Comando ZONAS CRÍTICAS detectado');

                    const fallidas = await db.collection('recolecciones')
                        .where('companyId', '==', companyId)
                        .where('estado', '==', 'no_entregada')
                        .get();

                    if (fallidas.empty) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `✅ No hay zonas críticas. ¡Todo va bien!`);
                        return;
                    }

                    // Agrupar por zona
                    const zonas = {};
                    fallidas.docs.forEach(doc => {
                        const factura = doc.data();
                        const zona = factura.zona || 'Sin zona';
                        if (!zonas[zona]) {
                            zonas[zona] = 0;
                        }
                        zonas[zona]++;
                    });

                    // Convertir a array y ordenar
                    const zonasOrdenadas = Object.entries(zonas)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5);

                    let mensaje = `📍 *ZONAS CON MÁS ENTREGAS FALLIDAS*\n\n`;
                    zonasOrdenadas.forEach(([zona, cantidad], i) => {
                        mensaje += `${i + 1}. *${zona}*\n`;
                        mensaje += `   └─ ${cantidad} entregas fallidas\n\n`;
                    });

                    mensaje += `💡 Revisar estrategia para estas zonas`;

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // COMANDO: ayuda/comandos (para TODOS: empleados y clientes)
                if (cleanText.match(/^(ayuda|comandos|help)$/i)) {
                    console.log('❓ Comando AYUDA detectado');

                    let mensaje = '';

                    // ========================================
                    // AYUDA PARA EMPLEADOS
                    // ========================================
                    if (userRole) {
                        mensaje = `💡 *COMANDOS DISPONIBLES*\n\n`;
                        mensaje += `👤 Tu rol: *${userRole}*\n\n`;

                        if (esSecretaria) {
                            mensaje += `📋 *Secretaria:*\n`;
                            mensaje += `• \`lista\` - Ver entregas fallidas\n`;
                            mensaje += `• \`info [CODIGO]\` - Ver detalles de factura\n`;
                            mensaje += `• \`reasignar [CODIGO]\` - Reasignar factura\n`;
                            mensaje += `• \`reasignar todo\` - Reasignar todas\n\n`;
                        }

                        if (esRepartidor) {
                            mensaje += `🚚 *Repartidor:*\n`;
                            mensaje += `• \`mis rutas\` - Ver rutas activas\n`;
                            mensaje += `• \`ruta actual\` - Ruta en curso\n`;
                            mensaje += `• \`próxima entrega\` - Siguiente paquete\n`;
                            mensaje += `• \`gastos\` - Ver gastos del día\n`;
                            mensaje += `• \`registrar gasto [tipo] [monto]\`\n`;
                            mensaje += `• \`pendientes\` - Paquetes sin entregar\n\n`;
                        }

                        if (esRecolector) {
                            mensaje += `📦 *Recolector:*\n`;
                            mensaje += `• \`mis citas\` - Ver citas asignadas\n`;
                            mensaje += `• \`pool\` - Ver solicitudes disponibles\n`;
                            mensaje += `• \`próxima cita\` - Tu próxima cita\n`;
                            mensaje += `• \`aceptar [ID]\` - Aceptar asignación\n`;
                            mensaje += `• \`rechazar [ID] [motivo]\` - Rechazar\n\n`;
                        }

                        if (esAlmacenUsa) {
                            mensaje += `📦 *Almacén USA:*\n`;
                            mensaje += `• \`contenedor\` - Info del contenedor actual\n`;
                            mensaje += `• \`pendientes usa\` - Ver pendientes\n`;
                            mensaje += `• \`stats almacen\` - Estadísticas\n`;
                            mensaje += `• \`últimos recibidos\` - Últimos 10\n\n`;
                        }

                        if (esAlmacenRD) {
                            mensaje += `🇩🇴 *Almacén RD:*\n`;
                            mensaje += `• \`recibidos\` - Paquetes para rutas\n`;
                            mensaje += `• \`disponibles\` - Lo mismo que recibidos\n\n`;
                        }

                        if (esAdmin) {
                            mensaje += `👔 *Admin/Propietario:*\n`;
                            mensaje += `• \`stats\` - Estadísticas en vivo\n`;
                            mensaje += `• \`alertas\` - Ver alertas del sistema\n`;
                            mensaje += `• \`reporte semanal\` - Resumen 7 días\n`;
                            mensaje += `• \`top repartidores\` - Ranking\n`;
                            mensaje += `• \`zonas críticas\` - Zonas con fallos\n\n`;
                        }

                        mensaje += `💬 Todos los comandos funcionan por WhatsApp.`;
                    }
                    // ========================================
                    // AYUDA PARA CLIENTES
                    // ========================================
                    else {
                        mensaje = `💡 *¿QUÉ PUEDO HACER?*\n\n`;
                        mensaje += `👋 Hola ${pushName}, soy tu asistente virtual. Puedo ayudarte con:\n\n`;
                        mensaje += `📦 *Agendar Recolección*\n`;
                        mensaje += `   Escribe: "agendar", "nuevo envío", "pickup"\n\n`;
                        mensaje += `🔍 *Rastrear tu Envío*\n`;
                        mensaje += `   Envía tu código: EMI-0001, LOE-9999\n`;
                        mensaje += `   O escribe: "dónde está", "rastrear"\n\n`;
                        mensaje += `💲 *Consultar Precios*\n`;
                        mensaje += `   Escribe: "precio", "cuánto cuesta", "tarifa"\n\n`;
                        mensaje += `👨‍💻 *Hablar con Soporte*\n`;
                        mensaje += `   Escribe: "soporte", "ayuda", "agente"\n\n`;
                        mensaje += `🕐 *Horarios y Ubicación*\n`;
                        mensaje += `   Escribe: "horario" o "dirección"\n\n`;
                        mensaje += `📋 Para ver el menú completo, escribe *"menú"*`;
                    }

                    await whatsappService.sendMessage(companyId, remoteJid, mensaje);
                    return;
                }

                // 2. Normalización de Intención (IA Conversacional Avanzada)
                let intent = 'unknown';

                // ✅ AGENDAR / SOLICITAR RECOLECCIÓN - Variaciones amplias
                if (cleanText.match(/agendar|ajendar|agendrr|ajend|nuevo\s*envio|nueva\s*recoleccion|envio|emvio|enbio|recojer|recoje|recoja|recolectar|recoleccion|mandar|enviar|paquete|bulto|caja|sobre|courier|pickup|solicitar|solicito|quiero\s*(enviar|mandar)|como\s*(envio|mando)|necesito\s*(enviar|mandar)|programar|coordinar|como\s*hago|hacer\s*envio|crear\s*envio|pedido\s*nuevo/i)) {
                    intent = 'agendar';
                }

                // ✅ RASTREO / TRACKING - Variaciones amplias
                else if (cleanText.match(/estatus|status|estado|donde\s*esta|donde\s*anda|donde\s*va|donde\s*se\s*encuentra|rastreo|rastrear|rastrea|ubicacion|ubicar|track|seguir|seguimiento|consulta|consultar|ver\s*(mi\s*)?paquete|como\s*va|guia|numero\s*de\s*guia|codigo|ver\s*(el\s*)?estado|en\s*que\s*(estado|parte)|localizar|buscar\s*mi|informacion\s*de\s*(mi\s*)?envio/i)) {
                    intent = 'rastreo';
                }

                // ✅ SOPORTE / AYUDA - Variaciones amplias
                else if (cleanText.match(/soporte|suporte|ayuda|ayudar|ayudame|help|auxilio|asistencia|humano|persona|agente|representante|hablar\s*con|quiero\s*hablar|comunicar|contactar|problema|error|fallo|issue|queja|reclamo|devolucion|no\s*llego|perdido|dañado|incompleto|mal\s*estado|no\s*(me\s*)?funciona|no\s*aparece|no\s*puedo/i)) {
                    intent = 'soporte';
                }

                // ✅ MENÚ / INICIO - Variaciones amplias
                else if (cleanText.match(/hola|ola|buenos|buenas|buen\s*dia|menu|menú|opciones|inicio|start|comenzar|empezar|que\s*puedes|que\s*haces|como\s*funciona|info|informacion|servicios/i)) {
                    intent = 'menu';
                }

                // ✅ COTIZACIÓN / PRECIOS - Variaciones amplias
                else if (cleanText.match(/precio|precios|tarifa|tarifas|costo|costos|cuanto\s*cuesta|cuanto\s*vale|cuanto\s*sale|cuanto\s*es|cuanto\s*cobran|cotizar|cotizacion|cotización|presupuesto|estimado|valor|rate|fees|cuanto\s*me\s*cobran|cuanto\s*pagaria|barato|economico/i)) {
                    intent = 'cotizar';
                }

                // ✅ HORARIOS - Nueva intención
                else if (cleanText.match(/horario|horarios|hora|horas|cuando\s*abren|cuando\s*cierran|abren|cierran|disponible|abierto|cerrado|atencion|atención|trabajan|que\s*dia|dias\s*de\s*(atencion|trabajo)|sabado|domingo|festivo/i)) {
                    intent = 'horarios';
                }

                // ✅ UBICACIÓN / DIRECCIÓN - Nueva intención
                else if (cleanText.match(/direccion|dirección|ubicacion|ubicación|donde\s*estan|donde\s*quedan|como\s*llego|sucursal|oficina|almacen|bodega|warehouse|address|location|maps|mapa/i)) {
                    intent = 'ubicacion';
                }

                // ✅ GRACIAS / DESPEDIDA - Nueva intención (cortesía)
                else if (cleanText.match(/gracias|muchas\s*gracias|te\s*agradezco|thank|adios|chao|bye|hasta\s*luego|nos\s*vemos|perfecto|excelente|ok|vale|entendido|listo/i)) {
                    intent = 'gracias';
                }

                // 3. Ejecutar Acción Según Intención
                if (intent === 'agendar') {
                    const link = `${FRONTEND_URL}/agendar/${companyId}`;
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `📦 *Agendar Recolección*\n\nHola ${pushName}, para solicitar una recolección sin esperas, usa este enlace directo:\n\n👉 ${link}\n\n¡Es rápido y seguro!`);

                } else if (intent === 'rastreo') {
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `🔍 Para rastrear tu envío, envíame el número de guía.\n\n*Ejemplos:*\n• EMI-0001\n• LOE-9999\n• RC-20251214-0001`);

                } else if (intent === 'soporte') {
                    // Obtener configuración de soporte de la compañía (si existe)
                    let supportPhone = '';
                    try {
                        const companyDoc = await db.collection('companies').doc(companyId).get();
                        if (companyDoc.exists) {
                            supportPhone = companyDoc.data().supportPhone || '';
                        }
                    } catch (e) { console.error('Error fetching company support:', e); }

                    if (supportPhone) {
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `👨‍💻 *Soporte Humano*\n\nPara asistencia personalizada, por favor contacta a nuestro equipo de soporte:\n\n📞 *WhatsApp:* https://wa.me/${supportPhone.replace('+', '')}\n\nTe atenderemos lo antes posible.`);
                    } else {
                        // Fallback si no hay teléfono configurado
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `👨‍💻 *Soporte*\n\nUn agente revisará tu caso pronto. Por favor deja tu mensaje detallado aquí.`);
                    }

                } else if (intent === 'cotizar') {
                    const linkCotizar = `${FRONTEND_URL}/agendar/${companyId}`;
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `💲 *Cotizaciones*\n\nHola ${pushName}, para obtener una cotización personalizada, agenda tu recolección aquí:\n\n👉 ${linkCotizar}\n\nNuestro equipo te contactará con el precio exacto según peso, destino y dimensiones.`);

                } else if (intent === 'horarios') {
                    // Obtener horarios de la compañía si están configurados
                    let horarioMsg = `🕐 *Horarios de Atención*\n\n`;
                    try {
                        const companyDoc = await db.collection('companies').doc(companyId).get();
                        if (companyDoc.exists) {
                            const companyData = companyDoc.data();
                            if (companyData.horarios) {
                                horarioMsg += companyData.horarios;
                            } else {
                                horarioMsg += `📅 *Lunes a Viernes:* 9:00 AM - 6:00 PM\n📅 *Sábados:* 9:00 AM - 1:00 PM\n📅 *Domingos:* Cerrado\n\n💡 Para recolecciones urgentes, contáctanos directamente.`;
                            }
                        }
                    } catch (e) {
                        horarioMsg += `📅 *Lunes a Viernes:* 9:00 AM - 6:00 PM\n📅 *Sábados:* 9:00 AM - 1:00 PM\n\n💡 Contáctanos para horarios especiales.`;
                    }
                    await whatsappService.sendMessage(companyId, remoteJid, horarioMsg);

                } else if (intent === 'ubicacion') {
                    // Obtener ubicación de la compañía
                    let ubicacionMsg = `📍 *Nuestra Ubicación*\n\n`;
                    try {
                        const companyDoc = await db.collection('companies').doc(companyId).get();
                        if (companyDoc.exists) {
                            const companyData = companyDoc.data();
                            if (companyData.direccion) {
                                ubicacionMsg += `${companyData.direccion}\n\n`;
                            }
                            if (companyData.googleMapsLink) {
                                ubicacionMsg += `🗺️ Ver en Google Maps:\n${companyData.googleMapsLink}\n\n`;
                            }
                            ubicacionMsg += `📞 ¿Necesitas indicaciones? Escribe *Soporte* para hablar con nuestro equipo.`;
                        } else {
                            ubicacionMsg += `📞 Escribe *Soporte* para obtener nuestra dirección y coordinar tu visita.`;
                        }
                    } catch (e) {
                        ubicacionMsg += `📞 Escribe *Soporte* para obtener nuestra dirección.`;
                    }
                    await whatsappService.sendMessage(companyId, remoteJid, ubicacionMsg);

                } else if (intent === 'gracias') {
                    const respuestas = [
                        `¡De nada ${pushName}! 😊 Estoy aquí cuando me necesites.`,
                        `¡Un placer ayudarte! 🙌 Escribe *Menú* si necesitas algo más.`,
                        `¡Para servirte! 💙 Que tengas un excelente día.`,
                        `¡Siempre a la orden! ✨ No dudes en escribir si necesitas ayuda.`
                    ];
                    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
                    await whatsappService.sendMessage(companyId, remoteJid, respuesta);

                } else if (intent === 'menu') {
                    const linkMenu = `${FRONTEND_URL}/agendar/${companyId}`;
                    const menu = `👋 *¡Hola ${pushName}!*\n\nSoy tu asistente virtual 24/7. Puedo ayudarte con:\n\n📦 *Agendar Recolección*\n   Escribe: "nuevo envío", "agendar", "solicitar pickup"\n\n🔍 *Rastrear Envío*\n   Envía tu código: EMI-0001\n   O escribe: "dónde está mi paquete", "rastrear"\n\n💲 *Cotizar*\n   Escribe: "precio", "cuánto cuesta", "tarifa"\n\n👨‍💻 *Soporte Humano*\n   Escribe: "ayuda", "hablar con agente", "problema"\n\n🕐 *Horarios*\n   Escribe: "horario", "cuándo abren"\n\n📍 *Ubicación*\n   Escribe: "dirección", "dónde están"\n\n🚀 *Enlace Directo:*\n${linkMenu}\n\n¿En qué te ayudo hoy?`;

                    await whatsappService.sendMessage(companyId, remoteJid, menu);
                } else {
                    // Respuesta inteligente para mensajes no entendidos
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `🤔 No estoy seguro de entender. Pero puedo ayudarte con:\n\n📦 Agendar envíos\n🔍 Rastrear paquetes (envía tu código de seguimiento)\n💲 Cotizaciones\n👨‍💻 Soporte\n\nEscribe *Menú* para ver todas las opciones.`);
                }
            }
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        // Don't crash response, already sent 200.
    }
};
