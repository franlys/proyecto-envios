import axios from 'axios';

// Configuración LOCAL
const EVOLUTION_URL = 'http://127.0.0.1:8080';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';

const api = axios.create({
    baseURL: EVOLUTION_URL,
    headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
    }
});

async function debugLocal() {
    const TEST_ID = `local_test_${Date.now()}`;
    console.log(`🐛 Debugging Local API at ${EVOLUTION_URL}`);
    console.log(`📌 Test Instance: ${TEST_ID}\n`);

    try {
        // 1. Create
        console.log('1️⃣  Creating Instance...');
        const createRes = await api.post('/instance/create', {
            instanceName: TEST_ID,
            token: "debug_token",
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        });
        console.log('   ✅ Created. Status:', createRes.data?.instance?.status);

        // 2. Wait and Poll for QR
        console.log('\n2️⃣  Polling for QR (10s)...');
        for (let i = 1; i <= 5; i++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
                const connectRes = await api.get(`/instance/connect/${TEST_ID}`);
                if (connectRes.data?.base64 || connectRes.data?.qrcode?.base64) {
                    console.log('   🎉 QR FOUND!');
                    console.log('   (The API is working, the issue might be frontend/backend communication)');
                    break;
                } else {
                    console.log(`   Attempt ${i}: No QR. Response:`, JSON.stringify(connectRes.data));
                }
            } catch (e) {
                console.log(`   Attempt ${i}: Error`, e.message);
            }
        }

        // 3. Check Connection State
        console.log('\n3️⃣  Checking Connection State...');
        try {
            const stateRes = await api.get(`/instance/connectionState/${TEST_ID}`);
            console.log('   📡 State:', JSON.stringify(stateRes.data, null, 2));
        } catch (e) {
            console.log('   ⚠️ Error getting state:', e.message);
        }

        // 4. Cleanup
        console.log('\n4️⃣  Cleaning up...');
        await api.delete(`/instance/delete/${TEST_ID}`);
        console.log('   ✅ Deleted.');

    } catch (error) {
        console.error('🛑 Critical Error:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

debugLocal();
