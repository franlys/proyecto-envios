import axios from 'axios';

const EVOLUTION_URL = 'https://evolution-api-production-0fa7.up.railway.app';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';

const api = axios.create({
    baseURL: EVOLUTION_URL,
    headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
    }
});

async function testFreshInstance() {
    const TEST_ID = `railway_check_${Date.now()}`;
    console.log(`🚂 Testing Redeployed Railway API: ${TEST_ID}`);

    try {
        // 1. Crear
        console.log('1️⃣  Creating Instance...');
        const createRes = await api.post('/instance/create', {
            instanceName: TEST_ID,
            token: "debug_token",
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        });
        console.log('   ✅ Creada:', createRes.data?.instance?.instanceName);

        // 2. Esperar un poco (Simular delay)
        console.log('   ⏳ Esperando 3s para generación de QR...');
        await new Promise(r => setTimeout(r, 3000));

        // 3. Obtener QR
        console.log('2️⃣  Obteniendo QR...');
        const connectRes = await api.get(`/instance/connect/${TEST_ID}`);

        if (connectRes.data?.base64 || connectRes.data?.qrcode?.base64) {
            console.log('   🎉 ¡ÉXITO! QR Recibido correctamente.');
            console.log('   ✅ Conclusión: La API funciona, el nombre anterior estaba corrupto.');
        } else {
            console.log('   ❌ FALLO: No se recibió QR (Count: 0).');
            console.log('   ⚠️ Conclusión: La API de Railway tiene problemas generales (no es solo el nombre).');
            console.log('   Dump:', JSON.stringify(connectRes.data, null, 2));
        }

        // 4. Limpieza
        console.log('3️⃣  Eliminando instancia de prueba...');
        await api.delete(`/instance/delete/${TEST_ID}`);
        console.log('   🗑️ Eliminada.');

    } catch (error) {
        console.error('🛑 Error en el Test:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

testFreshInstance();
