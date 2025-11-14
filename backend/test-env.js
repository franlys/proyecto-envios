import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔍 === TEST DE VARIABLES ===\n');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || '❌ NO DEFINIDO');
console.log('FIREBASE_STORAGE_BUCKET:', process.env.FIREBASE_STORAGE_BUCKET || '❌ NO DEFINIDO');
console.log('\n========================\n');