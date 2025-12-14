import whatsappService from '../services/whatsappService.js';
import { db } from '../config/firebase.js';

// URL del Frontend (Debería estar en .env)
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://proyecto-envios.vercel.app';

export const handleWebhook = async (req, res) => {
    try {
        // Evolution API sends different types of events. We care about 'messages.upsert'
        const { type, data, instance } = req.body;

        // Acknowledge receipt immediately to avoid timeouts
        res.status(200).send('OK');

        if (type === 'messages.upsert') {
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
                    }
                } catch (err) {
                    console.error('Error looking up company from instance:', err);
                }

                if (!companyId) {
                    console.warn('⚠️ No companyId found for instance, cannot reply.');
                    return;
                }

                console.log(`📩 Mensaje de ${pushName} (${remoteJid}): ${cleanText}`);

                // 1. "Agendar" / "Nueva" / "Envío"
                if (cleanText.includes('agendar') || cleanText.includes('nuevo') || cleanText.includes('envio')) {
                    const link = `${FRONTEND_URL}/agendar/${companyId}`;
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `📦 *Agendar Recolección*\n\nHola ${pushName}, para solicitar una recolección sin esperas, usa este enlace directo:\n\n👉 ${link}\n\n¡Es rápido y seguro!`);
                }

                // 2. "Estatus" / "Rastreo" / "Donde viene"
                else if (cleanText.includes('estatus') || cleanText.includes('donde') || cleanText.includes('rastreo')) {
                    await whatsappService.sendMessage(companyId, remoteJid,
                        `🔍 Para rastrear tu envío, por favor envíame el número de guía (ej: RC-123456-0001).`);
                }

                // 3. "Hola" / "Menu" / "Buenos dias"
                else if (cleanText === 'hola' || cleanText.includes('buenos') || cleanText === 'menu' || cleanText === 'ayuda') {
                    const link = `${FRONTEND_URL}/agendar/${companyId}`;
                    const menu = `👋 *¡Hola ${pushName}!* Bienvenido.\n\nSoy tu asistente virtual. Aquí tienes algunas opciones rápidas:\n\n📦 *Solicitar Recolección* (Escribe "Agendar", "Nuevo" o "Envío")\n👉 ${link}\n\n🚚 *Rastrear Paquete* (Escribe "Estatus" o "Rastreo")\n\n❓ *Ayuda / Soporte* (Escribe "Soporte")\n\n¿En qué puedo ayudarte hoy?`;

                    await whatsappService.sendMessage(companyId, remoteJid, menu);
                }
            }
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        // Don't crash response, already sent 200.
    }
};
