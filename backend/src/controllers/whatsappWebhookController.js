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

                // 1. Detección de Código de Tracking (Regex: RC-YYYYMMDD-XXXX)
                // Flexible: Acepta espacios, sin guiones, etc.
                const trackingMatch = cleanText.match(/rc[-\s]?\d{4,14}[-\s]?\d{0,6}/i);

                if (trackingMatch) {
                    const rawCode = trackingMatch[0].toUpperCase().replace(/\s/g, '-');
                    // Normalizar formato si es necesario (asumimos formato exacto por ahora o búsqueda elástica)

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

                // 2. Normalización de Intención (Fuzzy Matching Básico)
                let intent = 'unknown';
                if (cleanText.match(/agendar|ajendar|nuevo|envio|recojer|mandar|paquete/i)) intent = 'agendar';
                else if (cleanText.match(/estatus|donde|rastreo|rastrear|guia|ubicacion/i)) intent = 'rastreo';
                else if (cleanText.match(/soporte|ayuda|humano|persona|hablar|error|problema/i)) intent = 'soporte';
                else if (cleanText.match(/hola|buenos|menu|inicio|opciones/i)) intent = 'menu';
                else if (cleanText.match(/precio|costo|cotizar|cuanto/i)) intent = 'cotizar';

                // 3. Ejecutar Acción Según Intención
                if (intent === 'agendar') {
                    const link = `${FRONTEND_URL}/agendar/${companyId}`;
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `📦 *Agendar Recolección*\n\nHola ${pushName}, para solicitar una recolección sin esperas, usa este enlace directo:\n\n👉 ${link}\n\n¡Es rápido y seguro!`);

                } else if (intent === 'rastreo') {
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `🔍 Para rastrear tu envío, envíame el número de guía (Ejemplo: *RC-20251214-0001*).`);

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
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `💲 *Cotizaciones*\n\nPronto podrás cotizar aquí. Por el momento, usa la opción de *Agendar* para ver estimados.`);

                } else if (intent === 'menu') {
                    const link = `${FRONTEND_URL}/agendar/${companyId}`;
                    const menu = `👋 *¡Hola ${pushName}!*\n\nSoy tu asistente virtual. Escribe una opción o lo que necesitas:\n\n📦 *Nuevo Envío* (Escribe "Agendar")\n🚚 *Rastrear* (Escribe tu código RC-...)\n👨‍💻 *Soporte* (Escribe "Ayuda")\n\n¿En qué te ayudo?`;

                    await whatsappService.sendMessage(companyId, remoteJid, menu);
                } else {
                    // Respuesta default para mensajes no entendidos (opcional, para no ser spammy a veces se omite)
                    // await whatsappService.sendMessage(companyId, remoteJid, `🤷‍♂️ No entendí eso. Escribe *Menú* para ver opciones.`);
                }
            }
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        // Don't crash response, already sent 200.
    }
};
