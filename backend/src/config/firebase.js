// backend/src/config/firebase.js
import admin from 'firebase-admin';

let firebaseInitialized = false;

try {
  // Verificar que existan las variables de entorno necesarias
  if (!process.env.FIREBASE_PROJECT_ID || 
      !process.env.FIREBASE_PRIVATE_KEY || 
      !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Faltan variables de entorno de Firebase');
  }

  // Configurar Firebase Admin con variables de entorno
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Importante: reemplazar \n
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });

  firebaseInitialized = true;
  console.log('✅ Firebase Admin inicializado correctamente');

} catch (error) {
  console.error('❌ Error inicializando Firebase:', error.message);
  process.exit(1); // Detener la aplicación si Firebase falla
}

// Exportar instancias
export const auth = admin.auth();
export const db = admin.firestore();
export { admin };

export default admin;