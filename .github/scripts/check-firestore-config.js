const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

const db = admin.firestore();

async function checkConfig() {
  try {
    const configRef = db.collection('launcher_config').doc('apps_config');
    const doc = await configRef.get();

    if (!doc.exists) {
      console.log('❌ No existe configuración en Firestore');
      process.exit(1);
    }

    const config = doc.data();

    console.log('📋 ========== CONFIGURACIÓN ACTUAL EN FIRESTORE ==========');
    console.log('');
    console.log(`🕐 Última actualización: ${config.lastUpdated}`);
    console.log(`👤 Actualizado por: ${config.updatedBy}`);
    console.log('');
    console.log('📱 APPS CONFIGURADAS:');
    console.log('');

    config.apps.forEach((app, index) => {
      console.log(`${index + 1}. ${app.appName || app.name}`);
      console.log(`   📦 Package: ${app.packageName}`);
      console.log(`   🔢 Version: ${app.version} (Build ${app.versionCode})`);
      console.log(`   🌐 URL: ${app.downloadUrl}`);
      console.log(`   🔐 Checksum: ${app.checksum?.substring(0, 20)}...`);
      console.log(`   ✅ Enabled: ${app.enabled}`);
      console.log(`   ⚠️  Mandatory: ${app.mandatory}`);
      console.log('');
    });

    console.log('========================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkConfig();
