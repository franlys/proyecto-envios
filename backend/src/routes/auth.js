import express from 'express';
import { db, admin } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';
import { register, forgotPassword, resetPassword, heartbeat } from '../controllers/authController.js';

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
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', forgotPassword);

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', resetPassword);

/**
 * POST /api/auth/heartbeat
 * Registra la actividad del usuario (debe llamarse cada 1-2 minutos)
 */
router.post('/heartbeat', verifyToken, heartbeat);

/**
 * GET /api/auth/verify-role/:rol
 */
router.get('/verify-role/:rol', (req, res) => {
  const { rol } = req.params;

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
    'cargador',
    'propietario'
  ];

  const esValido = rolesValidos.includes(rol);

  res.json({
    rol: rol,
    valido: esValido,
    rolesDisponibles: rolesValidos
  });
});

export default router;