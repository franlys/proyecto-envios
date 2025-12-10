import 'dotenv/config';
import { db, admin } from './src/config/firebase.js';

async function fixUserCompany(uid, companyId) {
    try {
        console.log(`Actualizando usuario ${uid} con companyId: ${companyId}`);

        // 1. Actualizar Firestore
        await db.collection('usuarios').doc(uid).update({
            companyId: companyId
        });
        console.log('✅ Firestore actualizado.');

        // 2. Actualizar Custom Claims
        const userRecord = await admin.auth().getUser(uid);
        const currentClaims = userRecord.customClaims || {};

        await admin.auth().setCustomUserClaims(uid, {
            ...currentClaims,
            companyId: companyId
        });
        console.log('✅ Custom Claims actualizados.');

        console.log('Usuario corregido exitosamente.');

    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
    }
}

const uid = 'idpqfFmLAugukUT3IgOHOOVGN4r2';
const companyId = 'embarques_ivan';

fixUserCompany(uid, companyId);
