import axios from 'axios';

const EVOLUTION_URL = 'http://127.0.0.1:8080';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';

const api = axios.create({
    baseURL: EVOLUTION_URL,
    headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
    }
});

async function testLowercase() {
    const instanceName = `lowercase_test_${Date.now()}`;
    console.log(`🧪 Testing Lowercase Integration for ${instanceName}`);

    try {
        const createRes = await api.post('/instance/create', {
            instanceName: instanceName,
            token: "debug",
            qrcode: true,
            integration: "whatsapp-baileys" // Lowercase
        });

        console.log('Create Res Keys:', Object.keys(createRes.data));
        if (createRes.data.qrcode) console.log('✅ QR Found in Create!');

        // Poll
        await new Promise(r => setTimeout(r, 2000));
        const connectRes = await api.get(`/instance/connect/${instanceName}`);
        console.log('Connect Res Keys:', Object.keys(connectRes.data));

        if (connectRes.data.base64 || connectRes.data.qrcode) {
            console.log('✅ QR Found in Connect!');
        } else {
            console.log('❌ Still no QR. Data:', JSON.stringify(connectRes.data));
        }

        await api.delete(`/instance/delete/${instanceName}`);

    } catch (e) {
        console.error(e.message);
    }
}

testLowercase();
