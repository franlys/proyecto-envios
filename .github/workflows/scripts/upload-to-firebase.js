#!/usr/bin/env node

/**
 * Script para subir APK a Firebase Storage y actualizar Firestore
 * Uso: node upload-to-firebase.js <apk-path> <version-code> <version-name>
 */

import admin from 'firebase-admin';
import { createReadStream, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { basename } from 'path';

// Leer credenciales de Firebase
const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
);

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'embarques-7ad6e.firebasestorage.app'
});

const storage = admin.storage();
const db = admin.firestore();

/**
 * Calcula el checksum SHA-256 de un archivo
 */
async function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve('sha256:' + hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Sube el APK a Firebase Storage
 */
async function uploadAPK(apkPath, versionCode) {
  const bucket = storage.bucket();
  const fileName = `prologix-repartidor-v${versionCode}.apk`;
  const destination = `launcher-apps/${fileName}`;

  console.log(`📤 Subiendo ${basename(apkPath)} a Firebase Storage...`);

  await bucket.upload(apkPath, {
    destination: destination,
    metadata: {
      contentType: 'application/vnd.android.package-archive',
      metadata: {
        versionCode: versionCode.toString(),
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'GitHub Actions'
      }
    },
    public: true
  });

  const file = bucket.file(destination);
  const [metadata] = await file.getMetadata();

  console.log(`✅ APK subido exitosamente: ${fileName}`);
  return `https://storage.googleapis.com/${bucket.name}/${destination}`;
}

/**
 * Actualiza la configuración en Firestore
 */
async function updateFirestoreConfig(downloadUrl, versionCode, versionName, checksum) {
  console.log('📝 Actualizando configuración en Firestore...');

  const configRef = db.collection('launcher_config').doc('apps_config');
  const configDoc = await configRef.get();

  if (!configDoc.exists) {
    throw new Error('Documento de configuración no encontrado en Firestore');
  }

  const config = configDoc.data();
  const apps = config.apps || [];

  // Actualizar la primera app (ProLogix Repartidor)
  if (apps.length > 0) {
    apps[0] = {
      ...apps[0],
      downloadUrl: downloadUrl,
      version: versionName,
      versionCode: parseInt(versionCode),
      checksum: checksum,
      lastUpdated: new Date().toISOString()
    };

    await configRef.update({
      apps: apps,
      lastUpdated: new Date().toISOString(),
      updatedBy: 'GitHub Actions CI/CD'
    });

    console.log('✅ Configuración de Firestore actualizada');
    console.log(`   Version: ${versionName} (Build ${versionCode})`);
    console.log(`   URL: ${downloadUrl}`);
    console.log(`   Checksum: ${checksum}`);
  } else {
    throw new Error('No hay apps configuradas en Firestore');
  }
}

/**
 * Main function
 */
async function main() {
  const [apkPath, versionCode, versionName] = process.argv.slice(2);

  if (!apkPath || !versionCode || !versionName) {
    console.error('❌ Uso: node upload-to-firebase.js <apk-path> <version-code> <version-name>');
    process.exit(1);
  }

  try {
    console.log('🚀 Iniciando proceso de deployment...');
    console.log(`   APK: ${apkPath}`);
    console.log(`   Version: ${versionName} (Build ${versionCode})`);

    // 1. Calcular checksum
    console.log('\n📊 Calculando checksum...');
    const checksum = await calculateChecksum(apkPath);
    console.log(`✅ Checksum: ${checksum}`);

    // 2. Subir a Firebase Storage
    console.log('\n📤 Subiendo a Firebase Storage...');
    const downloadUrl = await uploadAPK(apkPath, versionCode);

    // 3. Actualizar Firestore
    console.log('\n📝 Actualizando Firestore...');
    await updateFirestoreConfig(downloadUrl, versionCode, versionName, checksum);

    console.log('\n✅ Deployment completado exitosamente!');
    console.log('\n📱 Los launchers detectarán esta actualización automáticamente.');

    // Output para GitHub Actions
    console.log(`\n::set-output name=download_url::${downloadUrl}`);
    console.log(`::set-output name=checksum::${checksum}`);

  } catch (error) {
    console.error('\n❌ Error en el deployment:', error.message);
    process.exit(1);
  }
}

main();
