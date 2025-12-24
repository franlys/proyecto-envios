// backend/scripts/migrate-custom-claims.js
/**
 * Script para migrar usuarios de Firestore a Custom Claims
 *
 * Este script lee todos los usuarios de Firestore y configura
 * custom claims (companyId y rol) en Firebase Auth.
 *
 * IMPORTANTE: Ejecutar ANTES de desplegar las nuevas Firestore Rules
 *
 * Uso:
 *   node scripts/migrate-custom-claims.js
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

/**
 * Migrar un usuario individual
 */
async function migrateUser(userId, userData) {
  try {
    // Validar que tiene los campos necesarios
    if (!userData.companyId || !userData.rol) {
      console.warn(`⚠️  Usuario ${userId} no tiene companyId o rol en Firestore. Saltando...`);
      return { success: false, reason: 'missing_fields' };
    }

    // Obtener usuario de Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(userId);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.warn(`⚠️  Usuario ${userId} existe en Firestore pero NO en Auth. Saltando...`);
        return { success: false, reason: 'not_in_auth' };
      }
      throw error;
    }

    // Verificar si ya tiene custom claims
    const currentClaims = userRecord.customClaims || {};
    if (currentClaims.companyId === userData.companyId && currentClaims.rol === userData.rol) {
      console.log(`✓ Usuario ${userId} ya tiene claims correctos. Saltando...`);
      return { success: true, reason: 'already_migrated' };
    }

    // Setear custom claims
    await admin.auth().setCustomUserClaims(userId, {
      companyId: userData.companyId,
      rol: userData.rol
    });

    console.log(`✅ Usuario ${userId} migrado: ${userData.rol} @ ${userData.companyId}`);
    return { success: true, reason: 'migrated' };

  } catch (error) {
    console.error(`❌ Error con usuario ${userId}:`, error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

/**
 * Migrar todos los usuarios
 */
async function migrateAllUsers() {
  console.log('🚀 Iniciando migración de custom claims...\n');

  const stats = {
    total: 0,
    migrated: 0,
    alreadyMigrated: 0,
    missingFields: 0,
    notInAuth: 0,
    errors: 0
  };

  try {
    // Obtener todos los usuarios de Firestore
    console.log('📖 Leyendo usuarios de Firestore...');
    const usersSnapshot = await db.collection('usuarios').get();
    stats.total = usersSnapshot.size;

    console.log(`📊 Total de usuarios encontrados: ${stats.total}\n`);

    // Migrar cada usuario
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      const result = await migrateUser(userId, userData);

      // Actualizar estadísticas
      if (result.success) {
        if (result.reason === 'migrated') {
          stats.migrated++;
        } else if (result.reason === 'already_migrated') {
          stats.alreadyMigrated++;
        }
      } else {
        if (result.reason === 'missing_fields') {
          stats.missingFields++;
        } else if (result.reason === 'not_in_auth') {
          stats.notInAuth++;
        } else {
          stats.errors++;
        }
      }
    }

    // Mostrar resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Total de usuarios:           ${stats.total}`);
    console.log(`✅ Migrados exitosamente:     ${stats.migrated}`);
    console.log(`✓  Ya tenían claims:          ${stats.alreadyMigrated}`);
    console.log(`⚠️  Sin companyId/rol:        ${stats.missingFields}`);
    console.log(`⚠️  No existen en Auth:       ${stats.notInAuth}`);
    console.log(`❌ Errores:                   ${stats.errors}`);
    console.log('='.repeat(60));

    // Verificación final
    const migrationSuccess = stats.migrated + stats.alreadyMigrated;
    const migrationTotal = stats.total - stats.missingFields - stats.notInAuth;

    if (migrationSuccess === migrationTotal) {
      console.log('\n✅ MIGRACIÓN COMPLETA AL 100%');
      console.log('\n📋 Próximos pasos:');
      console.log('   1. Desplegar Firestore Rules nuevas');
      console.log('   2. Pedir a usuarios que hagan logout y login');
      console.log('   3. Validar funcionamiento en producción');
    } else {
      console.log('\n⚠️  MIGRACIÓN INCOMPLETA');
      console.log(`   ${stats.errors} usuarios tuvieron errores`);
      console.log('   Revisar logs arriba para detalles');
    }

  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error);
    process.exit(1);
  }
}

/**
 * Migrar un solo usuario (para testing)
 */
async function migrateSingleUser(userId) {
  console.log(`🚀 Migrando usuario individual: ${userId}\n`);

  try {
    const userDoc = await db.collection('usuarios').doc(userId).get();

    if (!userDoc.exists) {
      console.error(`❌ Usuario ${userId} no existe en Firestore`);
      process.exit(1);
    }

    const userData = userDoc.data();
    const result = await migrateUser(userId, userData);

    if (result.success) {
      console.log('\n✅ Usuario migrado exitosamente');
    } else {
      console.error(`\n❌ Error: ${result.reason}`);
      if (result.error) {
        console.error(`   Detalle: ${result.error}`);
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Verificar custom claims de un usuario
 */
async function verifyClaims(userId) {
  console.log(`🔍 Verificando custom claims de usuario: ${userId}\n`);

  try {
    // Datos de Firestore
    const userDoc = await db.collection('usuarios').doc(userId).get();
    if (!userDoc.exists) {
      console.error(`❌ Usuario ${userId} no existe en Firestore`);
      process.exit(1);
    }
    const userData = userDoc.data();

    console.log('📄 Datos en Firestore:');
    console.log(`   companyId: ${userData.companyId}`);
    console.log(`   rol: ${userData.rol}`);
    console.log(`   nombre: ${userData.nombre}`);
    console.log(`   email: ${userData.email}\n`);

    // Datos de Auth
    const userRecord = await admin.auth().getUser(userId);
    const claims = userRecord.customClaims || {};

    console.log('🔐 Custom Claims en Auth:');
    console.log(`   companyId: ${claims.companyId || '❌ NO CONFIGURADO'}`);
    console.log(`   rol: ${claims.rol || '❌ NO CONFIGURADO'}\n`);

    // Validación
    if (claims.companyId === userData.companyId && claims.rol === userData.rol) {
      console.log('✅ Custom claims están correctos');
    } else {
      console.log('⚠️  Custom claims NO coinciden con Firestore');
      console.log('   Ejecutar migración para corregir');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// =============================================================================
// EJECUCIÓN
// =============================================================================

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'all':
    migrateAllUsers()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
    break;

  case 'single':
    if (!arg) {
      console.error('❌ Error: Debes proporcionar un userId');
      console.log('Uso: node migrate-custom-claims.js single <userId>');
      process.exit(1);
    }
    migrateSingleUser(arg)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
    break;

  case 'verify':
    if (!arg) {
      console.error('❌ Error: Debes proporcionar un userId');
      console.log('Uso: node migrate-custom-claims.js verify <userId>');
      process.exit(1);
    }
    verifyClaims(arg)
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
    break;

  default:
    console.log('📖 USO DEL SCRIPT DE MIGRACIÓN\n');
    console.log('Migrar todos los usuarios:');
    console.log('  node scripts/migrate-custom-claims.js all\n');
    console.log('Migrar un solo usuario (testing):');
    console.log('  node scripts/migrate-custom-claims.js single <userId>\n');
    console.log('Verificar custom claims de un usuario:');
    console.log('  node scripts/migrate-custom-claims.js verify <userId>\n');
    process.exit(0);
}
