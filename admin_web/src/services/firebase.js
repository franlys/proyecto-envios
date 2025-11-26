// Ruta: admin_web/src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Servicios de Firebase
export const auth = getAuth(app);

// ✅ CORRECCIÓN: Manejo de HMR (Hot Module Replacement)
// Si ya está inicializado, initializeFirestore lanzará error.
// En ese caso, obtenemos la instancia existente.
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache()
  });
} catch (e) {
  // Si falla (probablemente por HMR), usamos la instancia existente
  // console.log('Firestore ya inicializado, usando instancia existente');
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);

// Inicializar persistencia offline automáticamente
// (La configuración real está en firebaseOffline.js para evitar dependencias circulares)
if (typeof window !== 'undefined') {
  // Solo en el navegador, no en SSR
  import('../config/firebaseOffline.js').then(({ initializeOfflinePersistence }) => {
    initializeOfflinePersistence().catch(err => {
      console.warn('No se pudo habilitar persistencia offline:', err);
    });
  });
}

export default app;