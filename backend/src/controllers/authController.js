// backend/src/controllers/authController.js
/**
 * CONTROLADOR DE AUTENTICACIÓN
 * Gestión de registro de empleados y login.
 */

import { admin, db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// ========================================
// REGISTRAR NUEVO EMPLEADO
// ========================================
export const register = async (req, res) => {
  const { email, password, nombre, rol, telefono, companyId } = req.body;
  const adminUid = req.headers['x-user-id'];

  try {
    console.log('Iniciando registro para:', email, 'por admin:', adminUid);

    // Validar datos básicos
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, password, nombre y rol son obligatorios' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // ✅ VALIDACIÓN DE ROLES
    const rolesValidos = [
      'admin_general', 
      'secretaria', 
      'repartidor', 
      'recolector', 
      'almacen_eeuu', 
      'almacen_rd',
      'cargador' // <--- ROL AÑADIDO
    ];

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ 
        success: false, 
        error: `Rol no válido. Roles permitidos: ${rolesValidos.join(', ')}` 
      });
    }

    // Obtener datos del administrador que crea
    let adminData = null;
    if (adminUid) {
      const adminDoc = await db.collection('users').doc(adminUid).get();
      if (adminDoc.exists) {
        adminData = adminDoc.data();
      }
    }

    console.log('Admin data:', adminData?.rol);

    // Determinar la companyId
    let finalCompanyId = null;

    if (adminData?.rol === 'super_admin') {
      // Si es super_admin, puede asignar la companyId del body
      finalCompanyId = companyId || null;
      console.log('Super Admin asignando companyId:', finalCompanyId);
    } else if (adminData?.companyId) {
      // Si es admin_general, usa su propia companyId
      finalCompanyId = adminData.companyId;
      console.log('Admin General asignando su companyId:', finalCompanyId);
    } else {
      // Casos borde (p.ej. primer admin)
      console.warn('No se pudo determinar la companyId. Dejando nulo.');
    }

    // 1. Crear usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nombre,
      disabled: false
    });

    console.log('Usuario creado en Auth:', userRecord.uid);

    // 2. Crear documento de usuario en Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    
    const newUser = {
      uid: userRecord.uid,
      nombre: nombre,
      email: email,
      emailNormalizado: email.toLowerCase(),
      rol: rol,
      telefono: telefono || null,
      companyId: finalCompanyId || null,
      activo: true,
      fechaCreacion: FieldValue.serverTimestamp(),
      creadoPor: adminUid || null,
      creadoPorNombre: adminData?.nombre || 'Sistema',
      fotoURL: null
    };

    await userDocRef.set(newUser);

    console.log('Documento de usuario creado en Firestore');

    // 3. Establecer custom claims (rol y companyId)
    await admin.auth().setCustomUserClaims(userRecord.uid, { 
      rol: rol,
      companyId: finalCompanyId || null
    });

    console.log('Custom claims establecidos');

    res.status(201).json({
      success: true,
      message: 'Empleado registrado exitosamente',
      data: {
        uid: userRecord.uid,
        ...newUser
      }
    });

  } catch (error) {
    console.error('❌ Error en el registro:', error);

    // Manejar errores comunes
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ 
        success: false, 
        error: 'El correo electrónico ya está en uso' 
      });
    }
    if (error.code === 'auth/invalid-password') {
      return res.status(400).json({ 
        success: false, 
        error: 'La contraseña no es válida' 
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno al registrar el empleado',
      details: error.message
    });
  }
};

// ========================================
// INICIAR SESIÓN (LOGIN)
// ========================================
export const login = async (req, res) => {
  // Esta función es manejada por Firebase Auth en el frontend
  // Este endpoint solo existiría para login con email/pass personalizado
  // Por ahora, solo devolvemos un placeholder
  res.status(501).json({ 
    success: false, 
    error: 'La autenticación se maneja en el cliente (frontend)' 
  });
};

// ========================================
// OBTENER DATOS DEL USUARIO (POST-LOGIN)
// ========================================
export const getUserData = async (req, res) => {
  const { uid } = req.params;
  const requestingUid = req.userData?.uid; // UID del token verificado

  try {
    if (uid !== requestingUid) {
      return res.status(403).json({ 
        success: false, 
        error: 'No autorizado para ver este perfil' 
      });
    }

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuario no encontrado en Firestore' 
      });
    }

    const userData = userDoc.data();

    // Asegurarse de que el rol está actualizado (claims vs firestore)
    const authUser = await admin.auth().getUser(uid);
    const claims = authUser.customClaims || {};

    if (userData.rol !== claims.rol || userData.companyId !== claims.companyId) {
      console.warn(`Discrepancia de datos para ${uid}. Firestore: ${userData.rol}, Claims: ${claims.rol}. Actualizando claims...`);
      
      // Firestore (la base de datos) es la fuente de verdad
      await admin.auth().setCustomUserClaims(uid, {
        rol: userData.rol,
        companyId: userData.companyId
      });
    }

    res.status(200).json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Error obteniendo datos de usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del usuario',
      details: error.message
    });
  }
};