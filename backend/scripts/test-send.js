import axios from 'axios';

// Config
const EVOLUTION_URL = 'http://127.0.0.1:8080';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';

// ⚠️ CAMBIA ESTO POR TU NÚMERO (Con código de país, ej: 18295550000)
// Si no lo cambias, intentará enviarse a sí mismo (a veces falla si no está soportado).
const NUMBER_TO_SEND = '18092328741';

async function sendTestMessage() {
    try {
        // 1. Buscar una instancia conectada
        console.log('🔍 Buscando instancia conectada...');
        const instancesRes = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
            headers: { 'apikey': EVOLUTION_KEY }
        });

        const connectedInstance = instancesRes.data.find(i => i.instance.status === 'open');

        if (!connectedInstance) {
            console.error('❌ No hay ninguna instancia conectada. Escanea el QR primero.');
            return;
        }

        const instanceName = connectedInstance.instance.instanceName;
        console.log(`✅ Usando instancia: ${instanceName}`);

        // 2. Enviar mensaje
        console.log(`📨 Enviando mensaje a ${NUMBER_TO_SEND}...`);

        await axios.post(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
            number: NUMBER_TO_SEND,
            options: {
                delay: 1200,
                presence: "composing",
                linkPreview: false
            },
            textMessage: {
                text: "¡Hola! Esto es una prueba exitosa desde tu Sistema de Envíos 🚀\nEvolution API v1.8.2 funcionando."
            }
        }, {
            headers: { 'apikey': EVOLUTION_KEY }
        });

        console.log('✅ Mensaje enviado correctamente.');

    } catch (error) {
        console.error('❌ Error enviando mensaje:', error.message);
        if (error.response) console.error('Detalles:', error.response.data);
    }
}

sendTestMessage();
