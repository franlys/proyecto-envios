import whatsappService from '../src/services/whatsappService.js';

// Mock variable env if not set (for local test)
if (!process.env.EVOLUTION_API_URL) {
    process.env.EVOLUTION_API_URL = 'http://127.0.0.1:8080';
    process.env.EVOLUTION_API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
}

const COMPANY_ID = 'company_embarques_ivan_embarques_ivan'; // Using instance name as ID for quick dirty test logic since logic searches by name
// Wait, my logic searches by string includes. 
// If `companyId` is "franlys-corp", and instance is "company_franlys-corp_123", it finds it.
// In the user's case, instance is "company_embarques_ivan_embarques_ivan".
// If I pass "embarques_ivan", it should match.

const TEST_PHONE = '18092328741';

async function testService() {
    console.log('🧪 Testing WhatsappService...');
    const result = await whatsappService.sendMessage(
        'embarques_ivan',
        TEST_PHONE,
        '🔔 Prueba de Integración de Servicio:\nSi lees esto, el código de backend está listo para enviar notificaciones automáticas.'
    );
    console.log('Resultado:', result);
}

testService();
