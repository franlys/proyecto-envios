// backend/src/routes/auth.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router(); // ← ESTA LÍNEA FALTABA

// GET /api/auth/test
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route working',
    timestamp: new Date().toISOString()
  });
});

// GET /api/auth/profile  
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const userDoc = await db.collection('usuarios').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const userData = userDoc.data();
    
    let companyData = null;
    if (userData.companyId) {
      const companyDoc = await db.collection('companies').doc(userData.companyId).get();
      if (companyDoc.exists) {
        companyData = companyDoc.data();
      }
    }
    
    res.json({
      uid: userId,
      email: userData.email,
      nombre: userData.nombre,
      rol: userData.rol,
      activo: userData.activo,
      companyId: userData.companyId,
      company: companyData ? {
        id: userData.companyId,
        nombre: companyData.nombre,
        plan: companyData.plan || 'basic'
      } : null
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  res.json({ message: 'Login endpoint - TODO: implement' });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  res.json({ message: 'Register endpoint - TODO: implement' });
});

export default router;