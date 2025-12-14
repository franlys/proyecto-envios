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
                const instanceName = instance; // Evolution instance name usually contains the company ID logic?

                // We need to resolve CompanyId from InstanceName.
                // Assuming instanceName format: "company_[companyId]" or similar.
                // Or we lookup in Firestore which company has this instance name.
                // For efficiency, let's look up by instance name query.

                // Quick Fix: Extract from name if formatted correctly: "company_EMPRESA_ID"
                // If not, we might need a lookup.

                // Let's implement a simple keyword menu for now.
                console.log(`📩 Mensaje de ${pushName} (${remoteJid}): ${cleanText}`);

                // 1. "Agendar" / "Nueva" / "Envío"
                if (cleanText.includes('agendar') || cleanText.includes('nuevo') || cleanText.includes('envio')) {
                    // Try to extract companyId from instance Name
                    // Format: company_NAME_ID or just NAME if unique.
                    // We can check our `companies` collection where `instanceName` == instance.

                    // ... Lookup logic ...
                    const companiesRef = db.collection('companies');
                    const snapshot = await companiesRef.where('whatsappInstanceName', '==', instance).limit(1).get();

                    let companyId = null;
                    if (!snapshot.empty) {
                        companyId = snapshot.docs[0].id;
                    } else {
                        // Fallback: If instance name *is* the companyId prefixed?
                        // Let's try to assume a default or ask admin to fix map.
                        // For now, let's rely on finding it.
                    }

                    if (companyId) {
                        const link = `${FRONTEND_URL}/agendar/${companyId}`;
                        await whatsappService.sendMessage(companyId, remoteJid,
                            `📦 *Agendar Recolección*\n\nHola ${pushName}, para solicitar una recolección sin esperas, usa este enlace directo:\n\n👉 ${link}\n\n¡Es rápido y seguro!`);
                    }
                }

                // 2. "Estatus" / "Rastreo" / "Donde viene"
                else if (cleanText.includes('estatus') || cleanText.includes('donde') || cleanText.includes('rastreo')) {
                    // Logic to ask for tracking number or parse it if present (RC-...)
                    const match = text.match(/RC-\d{6}-\d{4}/i);
                    if (match) {
                        const tracking = match[0].toUpperCase();
                        // Lookup
                        // ... (To be implemented: Service to find status by tracking)
                        // For now generic response:
                        // await whatsappService.sendMessage(instance, remoteJid, `🔍 Buscando guía ${tracking}...`);
                    } else {
                        // Ask for it
                        // whatsappService.sendMessage(...)
                    }
                }

                // 3. "Hola" / "Menu"
                else if (cleanText === 'hola' || cleanText === 'buenos dias' || cleanText === 'buenas') {
                    // Welcome
                    // whatsappService.sendMessage(...)
                }
            }
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        // Don't crash response, already sent 200.
    }
};
