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
                        `🤔 No estoy seguro de entender. Pero puedo ayudarte con:\n\n📦 Agendar envíos\n🔍 Rastrear paquetes (envía tu código EMI-XXXX)\n💲 Cotizaciones\n👨‍💻 Soporte\n\nEscribe *Menú* para ver todas las opciones.`);
                }
            }
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        // Don't crash response, already sent 200.
    }
};
