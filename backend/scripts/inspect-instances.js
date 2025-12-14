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

async function inspectInstances() {
    console.log('🔍 Fetching All Instances...');
    try {
        const res = await api.get('/instance/fetchInstances');
        console.log('Instances:', JSON.stringify(res.data, null, 2));

        if (Array.isArray(res.data) && res.data.length > 0) {
            const first = res.data[0];
            const name = first.name || first.instance.instanceName;
            console.log(`\n🔎 Diagnostics for ${name}:`);

            // Check State
            try {
                const stateRes = await api.get(`/instance/connectionState/${name}`);
                console.log('State:', stateRes.data);
            } catch (e) {
                console.log('State Error:', e.message);
            }

            // Check QR
            try {
                const qrRes = await api.get(`/instance/connect/${name}`);
                console.log('QR Response Keys:', Object.keys(qrRes.data));
                if (qrRes.data.base64) console.log('✅ QR Base64 FOUND');
                else console.log('❌ No QR in connect response');
            } catch (e) {
                console.log('QR Error:', e.message);
            }
        } else {
            console.log('⚠️ No instances found.');
        }

    } catch (e) {
        console.error('Fetch Error:', e.message);
        if (e.response) console.log(e.response.data);
    }
}

inspectInstances();
