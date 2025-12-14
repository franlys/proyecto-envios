import axios from 'axios';

const EVOLUTION_URL = 'http://127.0.0.1:8080';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = 'company_embarques_ivan_embarques_ivan';

const api = axios.create({
    baseURL: EVOLUTION_URL,
    headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
    }
});

async function testSpecificInstance() {
    console.log(`🎯 Testing Specific Instance: ${INSTANCE_NAME}`);

    try {
        // 1. Check State
        try {
            const state = await api.get(`/instance/connectionState/${INSTANCE_NAME}`);
            console.log('Current State:', state.data);
        } catch (e) {
            console.log('State check failed (might not exist):', e.message);
        }

        // 2. Try Connect (Get QR)
        console.log('📸 Requesting QR...');
        const res = await api.get(`/instance/connect/${INSTANCE_NAME}`);
        console.log('Connect Response Keys:', Object.keys(res.data));

        if (res.data.base64 || res.data.qrcode) {
            console.log('✅ QR FOUND for specific instance!');
        } else {
            console.log('❌ NO QR. Full Dump:', JSON.stringify(res.data, null, 2));
        }

    } catch (e) {
        console.error('Test Failed:', e.message);
        if (e.response) console.log('Data:', e.response.data);
    }
}

testSpecificInstance();
