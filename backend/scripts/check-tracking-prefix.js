// backend/scripts/check-tracking-prefix.js
// Script para verificar qué empresas tienen trackingPrefix configurado

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPrefixes() {
  console.log('📊 Verificando trackingPrefix en todas las empresas...\n');

  const companiesSnap = await db.collection('companies').get();

  if (companiesSnap.empty) {
    console.log('❌ No hay empresas registradas.');
    return;
  }

  let withPrefix = 0;
  let withoutPrefix = 0;

  companiesSnap.docs.forEach(doc => {
    const data = doc.data();
    const hasPrefix = data.trackingPrefix ? true : false;

    if (hasPrefix) {
      withPrefix++;
      console.log(`✅ ${data.nombre || doc.id}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Prefijo: ${data.trackingPrefix}`);
      console.log(`   Plan: ${data.plan || 'No especificado'}`);
    } else {
      withoutPrefix++;
      console.log(`❌ ${data.nombre || doc.id}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   ⚠️  SIN PREFIJO - Usando formato legacy`);
    }
    console.log('');
  });

  console.log('━'.repeat(60));
  console.log(`📈 Resumen:`);
  console.log(`   Con prefijo (nuevo formato): ${withPrefix}`);
  console.log(`   Sin prefijo (formato legacy): ${withoutPrefix}`);
  console.log('━'.repeat(60));

  process.exit(0);
}

checkPrefixes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
