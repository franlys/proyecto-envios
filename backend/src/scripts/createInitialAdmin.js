import { auth, db } from '../src/config/firebase.js';

async function createInitialAdmin() {
  try {
    console.log('🔧 Creando usuario administrador inicial...');

    const adminData = {
      email: 'admin@envios.com',
      password: 'Admin123456',
      nombre: 'Administrador General',
      rol: 'admin_general'
    };

    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email: adminData.email,
      password: adminData.password,
      displayName: adminData.nombre
    });

    // Guardar en Firestore
    await db.collection('usuarios').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: adminData.email,
      nombre: adminData.nombre,
      rol: adminData.rol,
      telefono: '',
      activo: true,
      createdAt: new Date().toISOString()
    });

    console.log('✅ Administrador creado exitosamente!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('ℹ️  El administrador ya existe');
      process.exit(0);
    } else {
      console.error('❌ Error creando administrador:', error.message);
      process.exit(1);
    }
  }
}

createInitialAdmin();