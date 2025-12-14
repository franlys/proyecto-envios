
import axios from 'axios';

const EVOLUTION_URL = 'https://evolution-api-production-0fa7.up.railway.app';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const INSTANCE_NAME = 'company_embarques_ivan_embarques_ivan';

async function checkStatus() {
    try {
        console.log(`📡 Checking status for: ${INSTANCE_NAME}...`);
        const url = `${EVOLUTION_URL}/instance/fetchInstances`;

        const response = await axios.get(url, {
            headers: {
                apikey: API_KEY
            }
        });

        const instance = response.data.find(i => i.instance.instanceName === INSTANCE_NAME);

        if (instance) {
            console.log('\n✅ Instance Found:');
            console.log(`- Name: ${instance.instance.instanceName}`);
            console.log(`- Status: ${instance.instance.status}`);
            console.log(`- State: ${instance.instance.state || 'N/A'}`);
            console.log(`- Owner: ${instance.instance.owner || 'N/A'}`);
            console.log(`- Profile Name: ${instance.instance.profileName || 'N/A'}`);
            console.log('\n🔗 Webhook Config:');
            // Evolution v1 vs v2 structure might differ, checking both
            console.log(JSON.stringify(instance.webhook || {}, null, 2));

            console.log('\n⚙️ Settings:');
            console.log(JSON.stringify(instance.settings || {}, null, 2));
        } else {
            console.log('\n❌ Instance NOT Found in the list.');
            console.log('Available instances:', response.data.map(i => i.instance.instanceName));
        }

    } catch (error) {
        console.error('❌ Error checking status:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
        }
    }
}

checkStatus();
