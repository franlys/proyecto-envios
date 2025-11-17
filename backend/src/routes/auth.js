// backend/src/routes/auth.js
import express from 'express';
import { db, admin } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

// ✅ IMPORTAR LA LÓGICA DE REGISTRO DESDE EL CONTROLADOR
import { register } from '../controllers/authController.js';

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
 * GET /api/auth/profile
 * ✅ CORREGIDO: Ahora devuelve { success: true, data: {...} }
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // ✅ CORRECCIÓN: Envolver datos en 'data'
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
 * ✅ CORREGIDO: Ahora usa la función centralizada de authController.js
 */
router.post('/register', register); // <--- ESTE ES EL CAMBIO PRINCIPAL


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
 * POST /api/auth/refresh-token
 * ✅ CORREGIDO: Devuelve { success: true, data: {...} }
 */
router.post('/refresh-token', verifyToken, async (req, res) => {
  try {
    // ✅ CORRECCIÓN: Envolver userData en 'data'
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
 * Actualizar perfil del usuario
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
 * Verificar si un rol es válido
 */
router.get('/verify-role/:rol', (req, res) => {
  const { rol } = req.params;
  
  // NOTA: Esta lista también debería estar centralizada,
  // pero por ahora la dejamos para no romper la ruta.
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
    'cargador' // <-- Agregado por si acaso, aunque la lógica de registro ya no usa esto
  ];

  const esValido = rolesValidos.includes(rol);

  res.json({
    rol: rol,
    valido: esValido,
    rolesDisponibles: rolesValidos
  });
});

export default router;