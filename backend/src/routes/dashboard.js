// backend/src/routes/dashboard.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.use(verifyToken);

// ============================================
// ENDPOINT: Stats para Super Admin
// ============================================
router.get('/super-admin-stats', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Contar compañías
    const companiesSnapshot = await db.collection('companies').get();
    const totalCompanies = companiesSnapshot.size;

    // Contar usuarios
    const usersSnapshot = await db.collection('usuarios').get();
    const totalUsers = usersSnapshot.size;

    // Contar tickets (si existe la colección)
    let openTickets = 0;
    try {
      const ticketsSnapshot = await db.collection('tickets')
        .where('estado', '==', 'abierto')
        .get();
      openTickets = ticketsSnapshot.size;
    } catch (error) {
      console.log('No hay colección de tickets');
    }

    res.json({
      totalCompanies,
      totalUsers,
      openTickets,
      systemStatus: 'operational'
    });
  } catch (error) {
    console.error('Error en super-admin-stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ============================================
// ENDPOINT: Stats para Admin General
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    // Stats de embarques
    const embarquesSnapshot = await db.collection('embarques')
      .where('companyId', '==', userData.companyId)
      .where('estado', '==', 'activo')
      .get();
    const totalEmbarques = embarquesSnapshot.size;

    // Stats de rutas
    let rutasActivas = 0;
    try {
      const rutasSnapshot = await db.collection('rutas')
        .where('companyId', '==', userData.companyId)
        .where('estado', '==', 'en_proceso')
        .get();
      rutasActivas = rutasSnapshot.size;
    } catch (error) {
      console.log('No hay rutas');
    }

    // Stats de empleados
    const empleadosSnapshot = await db.collection('usuarios')
      .where('companyId', '==', userData.companyId)
      .get();
    const totalEmpleados = empleadosSnapshot.size;

    // Stats de facturas (si existen)
    let facturasEntregadas = 0;
    let facturasPendientes = 0;
    let facturasNoEntregadas = 0;
    try {
      const facturasSnapshot = await db.collection('facturas')
        .where('companyId', '==', userData.companyId)
        .get();
      
      facturasSnapshot.forEach(doc => {
        const factura = doc.data();
        if (factura.estado === 'entregada') facturasEntregadas++;
        else if (factura.estado === 'pendiente') facturasPendientes++;
        else if (factura.estado === 'no_entregada') facturasNoEntregadas++;
      });
    } catch (error) {
      console.log('No hay facturas');
    }

    res.json({
      totalEmbarques,
      rutasActivas,
      totalEmpleados,
      facturasEntregadas,
      facturasPendientes,
      facturasNoEntregadas,
      totalGastos: 0,
      totalIngresos: 0
    });
  } catch (error) {
    console.error('Error en stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;