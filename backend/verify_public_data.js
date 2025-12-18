import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:5000/api';
// Assuming the user runs this locally where backend is running on 5000
// Or I can simulate the logic using firebase-admin directly if backend is not running. 
// But testing the API is better.

// However, I cannot rely on backend running locally on port 5000 in this environment?
// The user environment instructions say "Your web applications should be built...". 
// I am in the agent environment. The user might have the backend running.
// But I can also write a script that uses firebase-admin to check the data directly and simulate what the controller does.

// Let's do a direct Firestore check script first to verify the data structure again, 
// and then try to hit the URL if possible, or just trust the logic if data is correct.

// actually better to reproduce the code logic.

import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: "json" };

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "embarques-7ad6e.appspot.com" // Update if needed
    });
}

const db = admin.firestore();

async function checkPublicInfo(companyId) {
    console.log(`Checking company: ${companyId}`);
    try {
        const companyDoc = await db.collection('companies').doc(companyId).get();
        if (!companyDoc.exists) {
            console.error('❌ Company not found in Firestore');
            return;
        }

        const companyData = companyDoc.data();

        const fs = await import('fs');

        // Simulation of controller logic
        const responseData = {
            id: companyDoc.id,
            nombre: companyData.nombre,
            telefono: companyData.telefono,
            supportPhone: companyData.supportPhone,
            direccion: companyData.direccion,
            activo: companyData.activo !== false,
            invoiceDesign: companyData.invoiceDesign || {}
        };

        const logContent = `
ID: ${companyDoc.id}
Name: ${companyData.nombre}
Active (activo field): ${companyData.activo}
Active (active field): ${companyData.active}
InvoiceDesign: ${JSON.stringify(companyData.invoiceDesign, null, 2)}
Simulated Response:
${JSON.stringify(responseData, null, 2)}
        `;
        fs.writeFileSync('verification_result.txt', logContent);
        console.log('Verification complete. Check verification_result.txt');


    } catch (error) {
        console.error('Error:', error);
    }
}

checkPublicInfo('embarques_ivan');
