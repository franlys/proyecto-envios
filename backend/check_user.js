import 'dotenv/config';
import { db } from './src/config/firebase.js';

async function checkUser(email) {
    try {
        console.log(`Buscando usuario con email: ${email}`);
        const snapshot = await db.collection('usuarios').where('email', '==', email).get();

        if (snapshot.empty) {
            console.log('No se encontró el usuario.');
            return;
        }

        snapshot.forEach(doc => {
            console.log('Usuario encontrado:', doc.id);
            console.log('uid:', doc.id);
            console.log('email:', doc.data().email);
            console.log('rol:', doc.data().rol);
            console.log('companyId:', doc.data().companyId);
        });

    } catch (error) {
        console.error('Error buscando usuario:', error);
    }
}

checkUser('franlysd@embarquesivan.com');
