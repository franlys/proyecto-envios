
import dotenv from 'dotenv';
dotenv.config();
import { db } from './src/config/firebase.js';

async function fixCompany() {
    try {
        console.log('🔧 Reparando compañía embarques_ivan...');
        const companyRef = db.collection('companies').doc('embarques_ivan');
        const doc = await companyRef.get();

        if (!doc.exists) {
            console.error('❌ Compañía no encontrada');
            return;
        }

        console.log('Datos actuales:', doc.data().active);

        await companyRef.update({
            active: true,
            updatedAt: new Date().toISOString()
        });

        console.log('✅ Compañía marcada como ACTIVA correctamente.');
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixCompany();
