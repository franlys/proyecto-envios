
import 'dotenv/config';
import { db } from '../config/firebase.js';

async function listCompanies() {
    console.log('📋 Listando compañías...');
    const snapshot = await db.collection('companies').get();
    snapshot.forEach(doc => {
        console.log(`ID: ${doc.id} | Nombre: ${doc.data().nombre}`);
    });
}

listCompanies();
