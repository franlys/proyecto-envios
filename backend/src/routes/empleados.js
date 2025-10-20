// backend/src/routes/empleados.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';
import { empleadoController } from '../controllers/empleadoController.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', empleadoController.createEmpleado);
router.get('/', empleadoController.getEmpleados);

router.get('/repartidores', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && !userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    let query = db.collection('usuarios').where('rol', '==', 'repartidor');

    if (userData.rol !== 'super_admin') {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query.get();

    const repartidores = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      repartidores.push({
        id: doc.id,
        nombre: data.nombre || data.displayName || 'Sin nombre',
        email: data.email,
        telefono: data.telefono,
        activo: data.activo,
        companyId: data.companyId,
        fechaCreacion: data.fechaCreacion,
        vehiculo: data.vehiculo,
        licencia: data.licencia,
        zona: data.zona
      });
    });

    console.log(`✅ Repartidores encontrados: ${repartidores.length}`);
    res.json(repartidores);
  } catch (error) {
    console.error('Error obteniendo repartidores:', error);
    res.status(500).json({ error: 'Error al obtener repartidores' });
  }
});

router.get('/secretarias', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && !userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    let query = db.collection('usuarios').where('rol', '==', 'secretaria');

    if (userData.rol !== 'super_admin') {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query.get();

    const secretarias = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      secretarias.push({
        id: doc.id,
        nombre: data.nombre || data.displayName || 'Sin nombre',
        email: data.email,
        telefono: data.telefono,
        activo: data.activo,
        companyId: data.companyId,
        fechaCreacion: data.fechaCreacion,
        area: data.area,
        permisos: data.permisos
      });
    });

    res.json(secretarias);
  } catch (error) {
    console.error('Error obteniendo secretarias:', error);
    res.status(500).json({ error: 'Error al obtener secretarias' });
  }
});

router.get('/admins', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && !userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    let query = db.collection('usuarios').where('rol', '==', 'admin');

    if (userData.rol !== 'super_admin') {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query.get();

    const admins = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      admins.push({
        id: doc.id,
        nombre: data.nombre || data.displayName || 'Sin nombre',
        email: data.email,
        telefono: data.telefono,
        activo: data.activo,
        companyId: data.companyId,
        fechaCreacion: data.fechaCreacion,
        nivel: data.nivel,
        permisos: data.permisos
      });
    });

    res.json(admins);
  } catch (error) {
    console.error('Error obteniendo administradores:', error);
    res.status(500).json({ error: 'Error al obtener administradores' });
  }
});

router.put('/:id', empleadoController.updateEmpleado);
router.patch('/toggle/:id', empleadoController.toggleEmpleado);
router.delete('/delete/:id', empleadoController.deleteEmpleado);

// ✅ NUEVO: Ruta para cambiar contraseña
router.patch('/change-password/:id', empleadoController.changePassword);

export default router;