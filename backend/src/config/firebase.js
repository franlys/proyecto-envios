import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Leer el archivo de credenciales
  const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, '../../serviceAccountKey.json'), 'utf8')
  );

  console.log('✅ Firebase Config - Project ID:', serviceAccount.project_id);

  // Inicializar Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log('✅ Firebase Admin inicializado correctamente');

} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  process.exit(1);
}

// Referencias a los servicios
const db = admin.firestore();
const auth = admin.auth();

console.log('✅ Firestore y Auth listos');

export { admin, db, auth };