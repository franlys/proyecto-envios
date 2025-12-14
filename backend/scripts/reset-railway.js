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

async function nukeAndReset() {
    console.log(`☢️ INICIANDO LIMPIEZA TOTAL EN RAILWAY: ${EVOLUTION_URL}`);

    try {
        // 1. Listar todo
        console.log('1️⃣  Listando todas las instancias activas...');
        const listRes = await api.get('/instance/fetchInstances');
        const instances = listRes.data;

        console.log(`   📉 Encontradas: ${instances.length} instancias.`);

        if (instances.length === 0) {
            console.log('   ✅ No hay instancias para borrar. El servidor está limpio.');
        } else {
            // 2. Borrar una por una
            for (const item of instances) {
                const name = item.instance.instanceName;
                console.log(`   🔥 Eliminando: ${name}...`);
                try {
                    await api.delete(`/instance/logout/${name}`);
                } catch (e) { } // Ignorar error de logout

                try {
                    await api.delete(`/instance/delete/${name}`);
                    console.log(`      ✅ Eliminado correctamente.`);
                } catch (error) {
                    console.error(`      ❌ Error eliminando ${name}:`, error.message);
                }
            }
        }

        console.log('\n✨ LIMPIEZA COMPLETADA. El servidor debería estar fresco para nuevas conexiones.');

    } catch (error) {
        console.error('\n🛑 Error General:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

nukeAndReset();
