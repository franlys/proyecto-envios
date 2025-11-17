// backend/src/routes/auth.js
import express from 'express';
import { db, admin } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

// ✅ 1. IMPORTAR LA FUNCIÓN CORRECTA DEL CONTROLADOR
import { register } from '../controllers/authController.js';

const router = express.Router();

/**
 * GET /api/auth/test
 */
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route working',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/auth/profile
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        uid: req.userData.uid,
        email: req.userData.email,
        nombre: req.userData.nombre,
        rol: req.userData.rol,
        companyId: req.userData.companyId,
        activo: req.userData.activo
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil del usuario',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/register
 * ✅ 2. USAR LA FUNCIÓN DEL CONTROLADOR
 * (Toda la lógica antigua de este archivo fue eliminada)
 */
router.post('/register', register);


/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  res.json({ 
    message: 'El login se maneja directamente con Firebase en el frontend',
    hint: 'Usa signInWithEmailAndPassword(auth, email, password)'
  });
});

/**
 * POST /api/auth/refresh-token
 */
router.post('/refresh-token', verifyToken, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Token válido',
      data: req.userData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error validando token'
    });
  }
});

/**
 * PATCH /api/auth/update-profile
 * (Esta ruta parece ser de 'empleados.js' o 'userController.js',
 * pero la dejamos como estaba en tu archivo original)
 */
router.patch('/update-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.userData.uid;
    const { nombre, telefono, direccion } = req.body;

    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (nombre) updateData.nombre = nombre;
    if (telefono) updateData.telefono = telefono;
    if (direccion) updateData.direccion = direccion;

    // NOTA: Esta lógica usa 'usuarios' que es la misma colección
    await db.collection('usuarios').doc(userId).update(updateData);

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
 */
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const userId = req.userData.uid;
    const { newPassword } = req.body;

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
 */
router.get('/verify-role/:rol', (req, res) => {
  const { rol } = req.params;
  
  // Esta lista SÍ debe incluir 'cargador'
  const rolesValidos = [
    'super_admin', 
    'admin_general', 
    'admin',
    'recolector',
    'almacen_rd',
    'almacen_eeuu',
    'secretaria', 
    'almacen', 
    'repartidor',
    'cargador' // <-- AÑADIDO AQUÍ TAMBIÉN
  ];

  const esValido = rolesValidos.includes(rol);

  res.json({
    rol: rol,
    valido: esValido,
    rolesDisponibles: rolesValidos
  });
});

export default router;