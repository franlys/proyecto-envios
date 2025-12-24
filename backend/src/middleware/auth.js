// backend/src/middleware/auth.js
import { admin } from '../config/firebase.js';
import { db } from '../config/firebase.js';

/**
 * Middleware principal de autenticación
 * Verifica el token de Firebase y carga datos del usuario
 */
export const verifyToken = async (req, res, next) => {
  try {
    // ✅ CORRECCIÓN CRÍTICA: Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    // ✅ Validar que existe el header y tiene el formato correcto
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Credenciales de autenticación inválidas'
        // ✅ SEGURIDAD: NO exponer receivedHeaders
      });
    }

    // ✅ Extraer el token después de "Bearer "
    const token = authHeader.split('Bearer ')[1];
    
    if (!token || token.trim() === '') {
      return res.status(401).json({ 
        error: 'Token inválido',
        hint: 'El token está vacío'
      });
    }

    // ✅ Verificar el token con Firebase Admin
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (verifyError) {
      console.error('❌ Error verificando token:', verifyError.message);
      
      if (verifyError.code === 'auth/id-token-expired') {
        return res.status(401).json({ 
          error: 'Token expirado',
          hint: 'Por favor, vuelve a iniciar sesión para obtener un nuevo token'
        });
      }
      
      if (verifyError.code === 'auth/argument-error') {
        return res.status(401).json({ 
          error: 'Token con formato inválido',
          hint: 'El token proporcionado no es válido'
        });
      }

      return res.status(401).json({ 
        error: 'Token inválido',
        details: verifyError.message 
      });
    }

    // ✅ SEGURIDAD: Firebase SDK ya validó expiración en verifyIdToken
    // NO necesitamos validar exp manualmente (evita doble validación)

    req.user = decodedToken;
    
    // ✅ Obtener datos adicionales del usuario desde Firestore
    const userDoc = await db.collection('usuarios').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado en la base de datos',
        hint: 'El usuario existe en Auth pero no en Firestore'
      });
    }

    const userData = userDoc.data();

    // ✅ Verificar que el usuario esté activo
    if (userData.activo === false) {
      return res.status(403).json({ 
        error: 'Usuario inactivo',
        hint: 'Contacta al administrador para reactivar tu cuenta'
      });
    }

    // ✅ Normalizar rol para compatibilidad
    const rolNormalizado = userData.rol === 'admin' ? 'admin_general' : userData.rol;

    // ✅ Agregar datos del usuario a la request
    req.userData = {
      uid: decodedToken.uid,
      email: userData.email,
      nombre: userData.nombre,
      rol: rolNormalizado,
      companyId: userData.companyId,
      sucursalId: userData.sucursalId || null,
      activo: userData.activo
    };

    console.log(`✅ Token verificado para: ${userData.email} (${rolNormalizado})`);
    next();

  } catch (error) {
    console.error('❌ Error en middleware de autenticación:', error);
    
    return res.status(500).json({ 
      error: 'Error interno del servidor al verificar autenticación',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * Uso: checkRole('admin_general', 'secretaria')
 */
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userData) {
      return res.status(403).json({ 
        error: 'No autorizado',
        hint: 'Debes iniciar sesión primero'
      });
    }

    const userRole = req.userData.rol;
    const hasPermission = allowedRoles.includes(userRole);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos suficientes para realizar esta acción'
        // ✅ SEGURIDAD: NO exponer requiredRoles ni yourRole
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario pertenece a una empresa
 */
export const requireCompany = (req, res, next) => {
  if (!req.userData || !req.userData.companyId) {
    return res.status(403).json({ 
      error: 'No tienes una empresa asignada',
      hint: 'Contacta al administrador'
    });
  }
  next();
};

/**
 * Middleware para verificar que el usuario es super_admin
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.userData || req.userData.rol !== 'super_admin') {
    return res.status(403).json({
      error: 'Acceso denegado',
      hint: 'Solo super_admin puede realizar esta acción'
    });
  }
  next();
};

/**
 * Middleware para verificar acceso a finanzas
 * Solo propietario y super_admin pueden ver datos financieros
 */
export const requireFinancialAccess = (req, res, next) => {
  if (!req.userData) {
    return res.status(403).json({
      error: 'No autorizado',
      hint: 'Debes iniciar sesión primero'
    });
  }

  const userRole = req.userData.rol;
  const hasAccess = userRole === 'propietario' || userRole === 'super_admin';

  if (!hasAccess) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos suficientes'
      // ✅ SEGURIDAD: NO exponer hint específico ni yourRole
    });
  }

  next();
};

export default {
  verifyToken,
  checkRole,
  requireCompany,
  requireSuperAdmin,
  requireFinancialAccess
};