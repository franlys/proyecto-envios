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

async function inspectQr() {
    const instanceName = `debug_qr_${Date.now()}`;
    console.log(`🔍 Inspecting QR for ${instanceName}`);

    try {
        // 1. Create
        await api.post('/instance/create', {
            instanceName: instanceName,
            token: "debug",
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        });

        // 2. Poll Connect
        console.log('⏳ Polling for QR...');
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const res = await api.get(`/instance/connect/${instanceName}`);
            console.log(`\n📄 Attempt ${i + 1} Response Keys:`, Object.keys(res.data));
            if (res.data.qrcode || res.data.base64) {
                console.log('FOUND QR DATA!');
                console.log(JSON.stringify(res.data, null, 2));
                break;
            } else {
                console.log('No QR yet. Data:', JSON.stringify(res.data).substring(0, 200));
            }
        }

        // 3. Delete
        await api.delete(`/instance/delete/${instanceName}`);

    } catch (e) {
        console.error(e.message);
        if (e.response) console.log(e.response.data);
    }
}

inspectQr();
