
import axios from 'axios';

const EVOLUTION_URL = 'https://evolution-api-production-0fa7.up.railway.app';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = 'company_embarques_ivan_embarques_ivan';
const WEBHOOK_URL = 'https://proyecto-envios-production.up.railway.app/api/whatsapp/webhook';

async function setWebhook() {
    try {
        console.log(`📡 Setting Webhook for: ${INSTANCE_NAME}...`);
        const url = `${EVOLUTION_URL}/webhook/set/${INSTANCE_NAME}`;

        const payload = {
            url: WEBHOOK_URL,
            webhook_by_events: true,
            events: ['MESSAGES_UPSERT'],
            enabled: true
        };

        const response = await axios.post(url, payload, {
            headers: {
                apikey: API_KEY
            }
        });

        console.log('✅ Webhook Set Successfully!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Error setting webhook:', error.message);
        if (error.response) {
            console.error('Response Data:', JSON.stringify(error.response.data, null, 4));
        }
    }
}

setWebhook();
