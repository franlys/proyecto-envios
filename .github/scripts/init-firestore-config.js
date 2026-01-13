const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();

async function initConfig() {
  try {
    const configRef = db.collection('launcher_config').doc('apps_config');
    const doc = await configRef.get();

    if (!doc.exists) {
      console.log('📝 Configuración no existe, creando...');

      // Crear configuración inicial
      await configRef.set({
        apps: [{
          id: 'prologix-repartidor',
          packageName: 'com.prologix.app',
          appName: 'ProLogix Repartidor',
          version: process.env.VERSION_NAME || '1.0',
          versionCode: parseInt(process.env.VERSION_CODE) || 1,
          downloadUrl: process.env.DOWNLOAD_URL || '',
          checksum: process.env.CHECKSUM || '',
          mandatory: false,
          enabled: true
        }],
        lastUpdated: new Date().toISOString(),
        updatedBy: 'GitHub Actions CI/CD (Initial Setup)'
      });

      console.log('✅ Configuración inicial creada');
    } else {
      console.log('✅ Configuración ya existe, actualizando...');

      const config = doc.data();
      const apps = config.apps || [];

      if (apps.length === 0) {
        // Agregar primera app
        apps.push({
          id: 'prologix-repartidor',
          packageName: 'com.prologix.app',
          appName: 'ProLogix Repartidor',
          version: process.env.VERSION_NAME,
          versionCode: parseInt(process.env.VERSION_CODE),
          downloadUrl: process.env.DOWNLOAD_URL,
          checksum: process.env.CHECKSUM,
          mandatory: false,
          enabled: true
        });
      } else {
        // Actualizar primera app
        apps[0].version = process.env.VERSION_NAME;
        apps[0].versionCode = parseInt(process.env.VERSION_CODE);
        apps[0].downloadUrl = process.env.DOWNLOAD_URL;
        apps[0].checksum = process.env.CHECKSUM;
      }

      await configRef.update({
        apps: apps,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'GitHub Actions CI/CD'
      });
    }

    console.log('✅ Firestore actualizado correctamente');
    console.log(`   Version: ${process.env.VERSION_NAME} (Build ${process.env.VERSION_CODE})`);
    console.log(`   URL: ${process.env.DOWNLOAD_URL}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initConfig();
