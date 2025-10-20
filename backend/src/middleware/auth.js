import { auth, db } from '../config/firebase.js';

// Middleware para verificar el token de Firebase
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Obtener datos adicionales del usuario desde Firestore
    const userDoc = await db.collection('usuarios').doc(decodedToken.uid).get();
    
    if (userDoc.exists) {
      req.userData = userDoc.data();
    }
    
    next();
  } catch (error) {
    console.error('Error verificando token:', error);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware para verificar roles específicos
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userData) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (!allowedRoles.includes(req.userData.rol)) {
      return res.status(403).json({ 
        error: 'No tienes permisos para realizar esta acción' 
      });
    }

    next();
  };
};