// backend/src/routes/users.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/users - Obtener todos los usuarios
router.get('/', async (req, res) => {
  try {
    const userData = req.userData;
    let query = db.collection('usuarios');
    
    // Filtrar por compañía si no es super_admin
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }
    
    const snapshot = await query.get();
    const users = [];
    
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ 
      success: true,  // ✅ CORREGIDO
      data: users     // ✅ CORREGIDO
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener usuarios' 
    });
  }
});

// POST /api/users - Crear usuario
router.post('/', async (req, res) => {
  try {
    // TODO: Implementar lógica de creación de usuario
    res.status(501).json({ 
      success: false,
      message: 'Endpoint no implementado. Usa /api/auth/register o /api/empleados' 
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al crear usuario' 
    });
  }
});

export default router;