import axios from 'axios';

const EVOLUTION_URL = 'http://127.0.0.1:8080';
const EVOLUTION_KEY = '429683C4C977415CAAFCCE10F7D57E11';

async function checkStatus() {
    try {
        const res = await axios.get(`${EVOLUTION_URL}/instance/fetchInstances`, {
            headers: { 'apikey': EVOLUTION_KEY }
        });

        // Log simplified status
        res.data.forEach(item => {
            const i = item.instance;
            console.log(`\n📦 Instance: ${i.instanceName}`);
            console.log(`   Status: ${i.status}`); // v1.8.2 uses 'status'
            console.log(`   State: ${i.state}`);   // sometimes 'state'
            console.log(`   Owner: ${i.owner}`);
        });

    } catch (e) {
        console.error(e.message);
    }
}

checkStatus();
