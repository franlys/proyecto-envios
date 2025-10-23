// backend/src/config/firebase.js
import admin from 'firebase-admin';

console.log('🔥 Firebase Config v2.0 - Usando variables de entorno');

try {
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_PRIVATE_KEY || 
      !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Faltan variables de entorno de Firebase');
  }

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET // ← AGREGAR ESTA LÍNEA
  });

  console.log('✅ Firebase inicializado correctamente');

} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  process.exit(1);
}

export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage(); // ← AGREGAR ESTA LÍNEA
export { admin };
export default admin;