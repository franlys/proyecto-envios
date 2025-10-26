// backend/src/middleware/auth.js
import { admin } from '../config/firebase.js';
import { db } from '../config/firebase.js';

/**
 * Middleware principal de autenticación
 * Verifica el token de Firebase y carga datos del usuario
 */
export const verifyToken = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token no proporcionado',
        hint: 'Envía el header Authorization: Bearer <token>'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // ✅ CORRECCIÓN: Verificar el token con Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // ✅ CORRECCIÓN: Verificar expiración del token
    const now = Math.floor(Date.now() / 1000);
    if (decodedToken.exp < now) {
      return res.status(401).json({ 
        error: 'Token expirado',
        hint: 'Por favor, vuelve a iniciar sesión'
      });
    }

    req.user = decodedToken;
    
    // Obtener datos adicionales del usuario desde Firestore
    const userDoc = await db.collection('usuarios').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado en la base de datos' 
      });
    }

    const userData = userDoc.data();

    // Verificar que el usuario esté activo
    if (userData.activo === false) {
      return res.status(403).json({ 
        error: 'Usuario inactivo',
        hint: 'Contacta al administrador para reactivar tu cuenta'
      });
    }

    // Normalizar rol para compatibilidad
    const rolNormalizado = userData.rol === 'admin' ? 'admin_general' : userData.rol;

    // Agregar datos del usuario a la request
    req.userData = {
      uid: decodedToken.uid,
      email: userData.email,
      nombre: userData.nombre,
      rol: rolNormalizado,
      companyId: userData.companyId,
      activo: userData.activo
    };

    next();

  } catch (error) {
    console.error('❌ Error verificando token:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        error: 'Token expirado',
        hint: 'Por favor, vuelve a iniciar sesión'
      });
    }
    
    if (error.code === 'auth/argument-error') {
      return res.status(401).json({ 
        error: 'Token inválido',
        hint: 'El token proporcionado no es válido'
      });
    }
    
    return res.status(401).json({ 
      error: 'Token inválido o expirado',
      details: error.message 
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

    if (!allowedRoles.includes(req.userData.rol)) {
      return res.status(403).json({ 
        error: 'No tienes permisos para realizar esta acción',
        requiredRoles: allowedRoles,
        yourRole: req.userData.rol
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