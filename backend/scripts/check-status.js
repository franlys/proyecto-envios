import axios from 'axios';

const EVOLUTION_URL = 'http://127.0.0.1:8080';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';

// Check ALL instances
async function checkStatus() {
    console.log('🔍 Checking ALL instances...');
    try {
        const res = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
            headers: { 'apikey': EVOLUTION_KEY }
        });
        console.log('FULL DUMP:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

checkStatus();
