// backend/src/middleware/authSimple.js
import { db } from '../config/firebase.js';

/**
 * Middleware de autenticación simple usando X-User-Id
 * Para uso temporal hasta implementar JWT completo
 */
export const verifyUser = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        hint: 'Envía el header X-User-Id con tu UID de Firebase'
      });
    }

    // Obtener datos del usuario desde Firestore
    const userDoc = await db.collection('usuarios').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const userData = userDoc.data();

    // Verificar que el usuario esté activo
    if (!userData.activo) {
      return res.status(403).json({
        success: false,
        error: 'Usuario inactivo'
      });
    }

    // Agregar datos del usuario al request
    req.user = {
      uid: userId,
      ...userData
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({
      success: false,
      error: 'Error en autenticación',
      details: error.message
    });
  }
};

/**
 * Middleware para verificar roles específicos
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para esta acción',
        requiredRoles: allowedRoles,
        yourRole: req.user.rol
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario pertenece a una compañía
 */
export const requireCompany = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado'
    });
  }

  // Super admin no necesita compañía
  if (req.user.rol === 'super_admin') {
    return next();
  }

  if (!req.user.companyId) {
    return res.status(403).json({
      success: false,
      error: 'Usuario sin compañía asignada'
    });
  }

  next();
};