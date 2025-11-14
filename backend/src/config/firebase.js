// backend/src/config/firebase.js
import admin from 'firebase-admin';

console.log('🔥 Firebase Config v2.1 - Con Storage para Recolecciones');

try {
  // Validar variables de entorno
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_PRIVATE_KEY || 
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_STORAGE_BUCKET) {
    throw new Error('Faltan variables de entorno de Firebase. Verifica tu archivo .env');
  }

  // Crear objeto de credenciales
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  // Inicializar Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });

  console.log('✅ Firebase inicializado correctamente');
  console.log(`📦 Storage Bucket: ${process.env.FIREBASE_STORAGE_BUCKET}`);

} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  process.exit(1);
}

// Exportar servicios
export const auth = admin.auth();
export const db = admin.firestore();
export const storage = admin.storage();
export { admin };

export default admin;