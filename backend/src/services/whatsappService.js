import axios from 'axios';
import { storage } from '../config/firebase.js';

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
 * Convierte una URL de Firebase Storage a una URL firmada accesible públicamente
 * Esto es necesario porque WhatsApp no puede acceder a URLs con tokens de Firebase
 * @param {string} url - URL de Firebase Storage (puede ser firebasestorage.googleapis.com o storage.googleapis.com)
 * @returns {Promise<string>} - URL firmada válida por 7 días
 */
async function convertToSignedUrl(url) {
    try {
        const bucket = storage.bucket();
        let filePath = url;

        // Si es una URL completa de Firebase Storage, extraer el path
        if (url.includes('firebasestorage.googleapis.com')) {
            const urlParts = url.split('/o/')[1];
            if (urlParts) {
                filePath = decodeURIComponent(urlParts.split('?')[0]);
                console.log(`📸 Path extraído para WhatsApp: ${filePath.substring(0, 80)}...`);
            }
        } else if (url.includes('storage.googleapis.com')) {
            // Formato: https://storage.googleapis.com/bucket-name/path
            const parts = url.split('.googleapis.com/')[1];
            if (parts) {
                const pathParts = parts.split('/');
                pathParts.shift(); // Remover bucket name
                filePath = pathParts.join('/');
                console.log(`📸 Path extraído para WhatsApp: ${filePath.substring(0, 80)}...`);
            }
        }

        const file = bucket.file(filePath);

        // Verificar si existe
        const [exists] = await file.exists();
        if (!exists) {
            console.error(`❌ Archivo no existe en Storage: ${filePath}`);
            return url; // Retornar URL original como fallback
        }

        // Generar signed URL válida por 7 días
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
        });

        console.log(`✅ Signed URL generada para WhatsApp (válida 7 días)`);
        return signedUrl;

    } catch (error) {
        console.error(`❌ Error generando signed URL para WhatsApp: ${error.message}`);
        return url; // Retornar URL original como fallback
    }
}

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
                console.warn(`Details: companyId=${companyId}, phone=${phone}, text=${typeof text}`);
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

            // 2. Formatear número para WhatsApp
            // Evolution API espera formato: número@s.whatsapp.net
            // Para RD: 1809XXXXXXX@s.whatsapp.net
            let formattedPhone = phone.replace(/\D/g, ''); // Solo dígitos

            // Si el número tiene 10 dígitos y empieza con 809/829/849, agregar prefijo 1
            if (formattedPhone.length === 10 && (formattedPhone.startsWith('809') || formattedPhone.startsWith('829') || formattedPhone.startsWith('849'))) {
                formattedPhone = '1' + formattedPhone;
            }

            // Si ya tiene 11 dígitos y empieza con 1809/1829/1849, está bien
            // Si tiene otro formato, dejarlo como está

            const whatsappNumber = `${formattedPhone}@s.whatsapp.net`;

            // 3. Enviar mensaje
            console.log(`📨 Enviando WhatsApp desde ${instanceName} a ${whatsappNumber}...`);

            const payload = {
                number: whatsappNumber,
                options: {
                    delay: 1000,
                    presence: "composing",
                    linkPreview: false
                },
                textMessage: {
                    text: text
                }
            };

            console.log(`📤 Payload completo:`, JSON.stringify(payload, null, 2));

            const sendResponse = await axios.post(`${EVOLUTION_URL}/message/sendText/${instanceName}`, payload, {
                headers: { 'apikey': EVOLUTION_KEY }
            });

            console.log('✅ WhatsApp enviado:', sendResponse.data?.key?.id);
            return true;

        } catch (error) {
            console.error('❌ Error WhatsappService:', error.message);
            if (error.response) {
                console.error('Detalles API:', JSON.stringify(error.response.data, null, 2));
            }
            return false;
        }
    }
    /**
     * Envía un archivo multimedia (PDF, imagen)
     * @param {string} companyId - ID de la compañía
     * @param {string} phone - Número de teléfono
     * @param {Buffer} fileBuffer - Buffer del archivo
     * @param {string} fileName - Nombre del archivo (ej: factura.pdf)
     * @param {string} caption - Texto opcional
     * @param {string} mimeType - Tipo MIME (default: application/pdf)
     */
    async sendMediaFile(companyId, phone, fileBuffer, fileName, caption = '', mimeType = 'application/pdf') {
        try {
            if (!companyId || !phone || !fileBuffer) {
                console.warn('⚠️ WhatsappService: Faltan datos para enviar media');
                return false;
            }

            // 1. Obtener Instancia (reutilizar lógica)
            // TODO: Refactorizar búsqueda de instancia a método privado
            const instancesResponse = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
                headers: { 'apikey': EVOLUTION_KEY }
            });
            const instances = instancesResponse.data;
            const activeInstance = instances.find(item => {
                const instanceName = item.instance.instanceName || item.name;
                return instanceName.includes(companyId) && (item.instance.status === 'open' || item.instance.state === 'open');
            });

            if (!activeInstance) {
                console.warn(`⚠️ WhatsappService: No se encontró instancia conectada para enviar media`);
                return false;
            }

            const instanceName = activeInstance.instance.instanceName || activeInstance.instance.name;

            // 2. Formatear teléfono
            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.length === 10 && (formattedPhone.startsWith('809') || formattedPhone.startsWith('829') || formattedPhone.startsWith('849'))) {
                formattedPhone = '1' + formattedPhone;
            }

            // 3. Preparar Base64
            const base64Content = fileBuffer.toString('base64');

            // 4. Determinar tipo de media según mimeType
            const isImage = mimeType.startsWith('image/');
            const mediaType = isImage ? 'image' : 'document';

            // 5. Enviar Media
            console.log(`📎 Enviando ${mediaType} (${fileName}) desde ${instanceName} a ${formattedPhone}...`);

            const sendResponse = await axios.post(`${EVOLUTION_URL}/message/sendMedia/${instanceName}`, {
                number: formattedPhone,
                options: {
                    delay: 1000,
                    presence: "composing"
                },
                mediaMessage: {
                    mediatype: mediaType,
                    fileName: fileName,
                    caption: caption,
                    media: base64Content,
                    mimetype: mimeType
                }
            }, {
                headers: { 'apikey': EVOLUTION_KEY }
            });

            console.log('✅ WhatsApp Media enviado:', sendResponse.data?.key?.id);
            return true;

        } catch (error) {
            console.error('❌ Error enviando media WhatsApp:', error.message);
            if (error.response) console.error('Detalles API:', error.response.data);
            return false;
        }
    }

    /**
     * Envía un archivo multimedia vía URL
     * Útil para enviar fotos de Firebase Storage sin descargarlas
     * Convierte automáticamente URLs de Firebase a signed URLs accesibles por WhatsApp
     *
     * @param {string} companyId - ID de la compañía
     * @param {string} phone - Número de teléfono
     * @param {string} mediaUrl - URL pública del archivo
     * @param {string} caption - Texto opcional
     * @param {string} mediaType - "image", "video", "document"
     * @param {string} mimeType - "image/jpeg", "application/pdf" (opcional)
     */
    async sendMediaUrl(companyId, phone, mediaUrl, caption = '', mediaType = 'image', mimeType = '') {
        try {
            if (!companyId || !phone || !mediaUrl) {
                console.warn('⚠️ WhatsappService: Faltan datos para enviar media URL');
                return false;
            }

            // 🔄 NUEVO: Convertir URL de Firebase Storage a signed URL para WhatsApp
            console.log(`📸 URL original: ${mediaUrl.substring(0, 100)}...`);
            const accessibleUrl = await convertToSignedUrl(mediaUrl);
            console.log(`📸 URL para WhatsApp: ${accessibleUrl.substring(0, 100)}...`);

            // 1. Obtener Instancia
            // TODO: Refactorizar esto para no duplicar lógica
            const instancesResponse = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
                headers: { 'apikey': EVOLUTION_KEY }
            });
            const instances = instancesResponse.data;
            const activeInstance = instances.find(item => {
                const instanceName = item.instance.instanceName || item.name;
                return instanceName.includes(companyId) && (item.instance.status === 'open' || item.instance.state === 'open');
            });

            if (!activeInstance) return false;
            const instanceName = activeInstance.instance.instanceName || activeInstance.instance.name;

            // 2. Formatear teléfono
            let formattedPhone = phone.replace(/\D/g, '');
            if (formattedPhone.length === 10 && (['809', '829', '849'].some(p => formattedPhone.startsWith(p)))) {
                formattedPhone = '1' + formattedPhone;
            }

            // 3. Payload con signed URL
            const payload = {
                number: formattedPhone,
                options: { delay: 1000, presence: "composing" },
                mediaMessage: {
                    mediatype: mediaType,
                    // fileName: "evidence", // Opcional
                    caption: caption,
                    media: accessibleUrl // ✅ Usar signed URL en lugar de la original
                }
            };

            if (mimeType) payload.mediaMessage.mimetype = mimeType;

            // 4. Enviar
            console.log(`📡 Enviando Media URL (${mediaType}) desde ${instanceName}...`);
            await axios.post(`${EVOLUTION_URL}/message/sendMedia/${instanceName}`, payload, {
                headers: { 'apikey': EVOLUTION_KEY }
            });

            console.log('✅ WhatsApp Media URL enviado con signed URL');
            return true;

        } catch (error) {
            console.error('❌ Error enviando media URL WhatsApp:', error.message);
            return false;
        }
    }
}

export default new WhatsappService();
