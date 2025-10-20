// backend/src/routes/empleadoRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();
router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const userData = req.userData;
    let query = db.collection('usuarios')
      .where('rol', '==', 'empleado');
    
    // Filtrar por compañía si no es super_admin
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }
    
    const snapshot = await query.get();
    const empleados = [];
    
    snapshot.forEach(doc => {
      empleados.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ data: empleados });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

export default router;