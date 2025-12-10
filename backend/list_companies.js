import 'dotenv/config';
import { db } from './src/config/firebase.js';

async function listCompanies() {
    try {
        console.log('Listando empresas...');
        const snapshot = await db.collection('companies').get();

        if (snapshot.empty) {
            console.log('No se encontraron empresas.');
            return;
        }

        snapshot.forEach(doc => {
            console.log(`ID: ${doc.id}, Nombre: ${doc.data().nombre || doc.data().name}`);
        });

    } catch (error) {
        console.error('Error listando empresas:', error);
    }
}

listCompanies();
