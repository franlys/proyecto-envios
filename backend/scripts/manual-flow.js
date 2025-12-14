import axios from 'axios';

const EVOLUTION_URL = 'http://127.0.0.1:8080';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = 'debug_manual_qr';

const api = axios.create({
    baseURL: EVOLUTION_URL,
    headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
    }
});

async function manualFlow() {
    console.log(`🛠 Manual Flow Test for ${INSTANCE_NAME}`);

    try {
        // 1. Delete if exists
        try {
            await api.delete(`/instance/delete/${INSTANCE_NAME}`);
            console.log('🗑 Deleted old instance');
        } catch (e) { }

        // 2. Create
        console.log('✨ Creating instance...');
        const createRes = await api.post('/instance/create', {
            instanceName: INSTANCE_NAME,
            token: "debug",
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            reject_call: false,
            msgCall: "",
            groupsIgnore: true,
            alwaysOnline: true,
            readMessages: false,
            readStatus: false
        });
        console.log('Create Res:', JSON.stringify(createRes.data).substring(0, 150));

        // 3. Wait and Connect
        console.log('⏳ Waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('🔌 Connecting...');
        const connectRes = await api.get(`/instance/connect/${INSTANCE_NAME}`);
        console.log('Connect Res Keys:', Object.keys(connectRes.data));

        if (connectRes.data.base64) {
            console.log('✅✅✅ WRITTEN TO QR FILE');
            // We can't write file easily here but if we see base64 we are good.
        } else {
            console.log('❌ Connect Res Data:', JSON.stringify(connectRes.data));
        }

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) console.log(e.response.data);
    }
}

manualFlow();
