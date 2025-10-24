// backend/src/routes/auth.js
import express from 'express';
import { db, admin } from '../config/firebase.js';

const router = express.Router();

/**
 * GET /api/auth/test
 * Endpoint de prueba
 */
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route working',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/auth/register
 * Registrar nuevo usuario (usado por super_admin o admin_general)
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      nombre, 
      rol, 
      companyId, 
      telefono,
      direccion 
    } = req.body;

    // Validaciones
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({
        error: 'Faltan campos requeridos',
        required: ['email', 'password', 'nombre', 'rol']
      });
    }

    // Roles válidos (incluye recolector y almacen_eeuu)
    const rolesValidos = [
      'super_admin', 
      'admin_general', 
      'admin',           // Compatibilidad con código antiguo
      'recolector',      // Nuevo rol
      'almacen_eeuu',    // Nuevo rol (futuro)
      'secretaria', 
      'almacen',         // Almacén RD
      'repartidor'
    ];

    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        error: 'Rol inválido',
        rolesPermitidos: rolesValidos
      });
    }

    // Validar que si no es super_admin, debe tener companyId
    if (rol !== 'super_admin' && !companyId) {
      return res.status(400).json({
        error: 'Los usuarios de compañía requieren companyId'
      });
    }

    // Validar password mínimo 6 caracteres
    if (password.length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nombre
    });

    // Crear documento en Firestore
    const userData = {
      uid: userRecord.uid,
      email: email,
      nombre: nombre,
      rol: rol,
      activo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Agregar campos opcionales
    if (companyId) userData.companyId = companyId;
    if (telefono) userData.telefono = telefono;
    if (direccion) userData.direccion = direccion;

    await db.collection('usuarios').doc(userRecord.uid).set(userData);

    // Si tiene companyId, obtener información de la compañía
    let companyData = null;
    if (companyId) {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      if (companyDoc.exists) {
        companyData = {
          id: companyId,
          nombre: companyDoc.data().nombre
        };
      }
    }

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        uid: userRecord.uid,
        email: email,
        nombre: nombre,
        rol: rol,
        company: companyData
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    // Manejo de errores específicos de Firebase
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        error: 'El email ya está registrado'
      });
    }

    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        error: 'Email inválido'
      });
    }

    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        error: 'Contraseña muy débil'
      });
    }

    res.status(500).json({
      error: 'Error al crear usuario',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login de usuario (Firebase maneja esto en el frontend)
 * Este endpoint es informativo
 */
router.post('/login', async (req, res) => {
  res.json({ 
    message: 'El login se maneja directamente con Firebase en el frontend',
    hint: 'Usa signInWithEmailAndPassword(auth, email, password)'
  });
});

/**
 * GET /api/auth/profile
 * Obtener perfil del usuario autenticado
 */
router.get('/profile', async (req, res) => {
  try {
    // En una implementación real, verificarías el token aquí
    // Por ahora, asumimos que el uid viene en los headers o query
    const userId = req.headers['x-user-id'] || req.query.uid;

    if (!userId) {
      return res.status(401).json({
        error: 'No autenticado',
        hint: 'Envía el uid en el header X-User-Id'
      });
    }

    const userDoc = await db.collection('usuarios').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }
    
    const userData = userDoc.data();
    
    // Obtener datos de la compañía si existe
    let companyData = null;
    if (userData.companyId) {
      const companyDoc = await db.collection('companies').doc(userData.companyId).get();
      if (companyDoc.exists) {
        companyData = {
          id: userData.companyId,
          nombre: companyDoc.data().nombre,
          plan: companyDoc.data().plan || 'basic'
        };
      }
    }
    
    res.json({
      success: true,
      user: {
        uid: userId,
        email: userData.email,
        nombre: userData.nombre,
        rol: userData.rol,
        activo: userData.activo,
        telefono: userData.telefono || null,
        direccion: userData.direccion || null,
        company: companyData
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ 
      error: 'Error al obtener perfil',
      details: error.message
    });
  }
});

/**
 * PATCH /api/auth/update-profile
 * Actualizar perfil del usuario
 */
router.patch('/update-profile', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.uid;

    if (!userId) {
      return res.status(401).json({
        error: 'No autenticado'
      });
    }

    const { nombre, telefono, direccion } = req.body;

    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (nombre) updateData.nombre = nombre;
    if (telefono) updateData.telefono = telefono;
    if (direccion) updateData.direccion = direccion;

    await db.collection('usuarios').doc(userId).update(updateData);

    // También actualizar en Firebase Auth si cambió el nombre
    if (nombre) {
      await admin.auth().updateUser(userId, {
        displayName: nombre
      });
    }

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      error: 'Error al actualizar perfil',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/change-password
 * Cambiar contraseña (requiere autenticación)
 */
router.post('/change-password', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.uid;
    const { newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: 'No autenticado'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    await admin.auth().updateUser(userId, {
      password: newPassword
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      error: 'Error al cambiar contraseña',
      details: error.message
    });
  }
});

/**
 * GET /api/auth/verify-role/:rol
 * Verificar si un rol es válido
 */
router.get('/verify-role/:rol', (req, res) => {
  const { rol } = req.params;
  
  const rolesValidos = [
    'super_admin', 
    'admin_general', 
    'admin',
    'recolector',
    'almacen_eeuu',
    'secretaria', 
    'almacen', 
    'repartidor'
  ];

  const esValido = rolesValidos.includes(rol);

  res.json({
    rol: rol,
    valido: esValido,
    rolesDisponibles: rolesValidos
  });
});

export default router;