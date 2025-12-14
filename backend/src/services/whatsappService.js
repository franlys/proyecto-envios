import axios from 'axios';
// import admin from '../config/firebase.js'; // Not used in this file yet

// Constantes de configuración
// NOTA: En producción (Railway), process.env.EVOLUTION_API_URL debe estar definido.
// Si no, fallback a la URL de producción de Railway.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEFAULT_URL = IS_PRODUCTION
    ? 'https://evolution-api-production-0fa7.up.railway.app'
    : 'http://localhost:8080';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || DEFAULT_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';

/**
 * Servicio para enviar mensajes de WhatsApp vía Evolution API
 * Busca automáticamente la instancia conectada de la compañía.
 */
class WhatsappService {

    /**
     * Envía un mensaje de texto a un número específico
     * @param {string} companyId - ID de la compañía que envía el mensaje
     * @param {string} phone - Número de teléfono destino (sin formato, solo dígitos)
     * @param {string} text - Contenido del mensaje
     */
    async sendMessage(companyId, phone, text) {
        try {
            if (!companyId || !phone || !text) {
                console.warn('⚠️ WhatsappService: Faltan datos necesarios (companyId, phone, o text)');
                return false;
            }

            // 1. Obtener la instancia de WhatsApp de la compañía desde Firestore
            // Las instancias se llaman "company_[companyId]"
            // Pero mejor buscamos en la API de Evolution cuál está conectada para esa compañía.

            // Opción A: Construir el nombre de la instancia (más rápido)
            // Formato: company_[nombre_normalizado]_[id]
            // Como el nombre normalizado puede variar, mejor consultamos Firestore si tenemos el nombre guardado.
            // O buscamos en Evolution todas las instancias y filtramos.

            // Para optimizar, vamos a intentar deducir el nombre si es posible, o buscar en la lista.
            // Vamos a buscar en la lista de instancias activas.

            const instancesResponse = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
                headers: { 'apikey': EVOLUTION_KEY }
            });

            const instances = instancesResponse.data;

            // Buscamos una instancia que contenga el companyId en su nombre y esté ONLINE
            const activeInstance = instances.find(item => {
                const instanceName = item.instance.instanceName || item.name;
                // El nombre suele contener el ID al final o ser simple.
                // Asumimos que el usuario creó la instancia desde el panel, que usa: company_[name]_[id]
                return instanceName.includes(companyId) && (item.instance.status === 'open' || item.instance.state === 'open');
            });

            if (!activeInstance) {
                console.warn(`⚠️ WhatsappService: No se encontró instancia conectada para companyId: ${companyId}`);
                return false;
            }

            const instanceName = activeInstance.instance.instanceName || activeInstance.instance.name;

            // 2. Formatear número
            // Si es RD (809/829/849) o USA (1...), asegurarse de que tenga el 1 delante.
            let formattedPhone = phone.replace(/\D/g, ''); // Solo dígitos
            if (formattedPhone.length === 10 && (formattedPhone.startsWith('809') || formattedPhone.startsWith('829') || formattedPhone.startsWith('849'))) {
                formattedPhone = '1' + formattedPhone;
            }

            // 3. Enviar mensaje
            console.log(`📨 Enviando WhatsApp desde ${instanceName} a ${formattedPhone}...`);

            const sendResponse = await axios.post(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
                number: formattedPhone,
                options: {
                    delay: 1000,
                    presence: "composing",
                    linkPreview: false
                },
                textMessage: {
                    text: text
                }
            }, {
                headers: { 'apikey': EVOLUTION_KEY }
            });

            console.log('✅ WhatsApp enviado:', sendResponse.data?.key?.id);
            return true;

        } catch (error) {
            console.error('❌ Error WhatsappService:', error.message);
            if (error.response) {
                console.error('Detalles API:', error.response.data);
            }
            return false;
        }
    }
}

export default new WhatsappService();
