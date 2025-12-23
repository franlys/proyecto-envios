// backend/src/routes/dashboard.js
import express from 'express';
import {
  getStatsSuperAdmin,
  getStatsAdminGeneral,
  getStatsPublic,
  getContenedorStats,
  getRutaStats
} from '../controllers/dashboardController.js';
import { getDashboardPropietario } from '../controllers/dashboardPropietarioController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/dashboard/propietario
 * @desc    Dashboard ejecutivo con todas las métricas para propietario
 * @access  Private (propietario, super_admin)
 */
router.get('/propietario',
  verifyToken,
  checkRole('propietario', 'super_admin'),
  getDashboardPropietario
);

/**
 * @route   GET /api/dashboard/stats-super-admin
 * @desc    Obtener estadísticas globales (solo super_admin)
 * @access  Private (super_admin)
 */
router.get('/stats-super-admin', verifyToken, async (req, res) => {
  try {
    // Verificar que sea super_admin
    if (req.userData.rol !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'Solo super admins pueden acceder a estas estadísticas' 
      });
    }

    await getStatsSuperAdmin(req, res);
  } catch (error) {
    console.error('❌ Error en ruta stats-super-admin:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/dashboard/stats-admin-general
 * @desc    Obtener estadísticas de la empresa (solo admin_general)
 * @access  Private (admin_general)
 */
router.get('/stats-admin-general', verifyToken, async (req, res) => {
  try {
    // Verificar que sea admin_general
    if (req.userData.rol !== 'admin_general' && req.userData.rol !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'Solo admin general puede acceder a estas estadísticas' 
      });
    }

    await getStatsAdminGeneral(req, res);
  } catch (error) {
    console.error('❌ Error en ruta stats-admin-general:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/dashboard/stats
 * @desc    Obtener estadísticas según el rol del usuario
 * @access  Private
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { rol } = req.userData;

    console.log(`📊 Solicitando stats para rol: ${rol}`);

    // Redirigir según el rol
    if (rol === 'super_admin') {
      return await getStatsSuperAdmin(req, res);
    }

    if (rol === 'admin_general') {
      return await getStatsAdminGeneral(req, res);
    }

    // Para otros roles, devolver estadísticas básicas
    await getStatsPublic(req, res);

  } catch (error) {
    console.error('❌ Error en ruta stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/dashboard/health
 * @desc    Verificar que el módulo de dashboard está funcionando
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    module: 'Dashboard',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/dashboard/stats-super-admin',
      'GET /api/dashboard/stats-admin-general',
      'GET /api/dashboard/stats',
      'GET /api/dashboard/contenedor/:contenedorId'
    ]
  });
});

/**
 * @route   GET /api/dashboard/contenedor/:contenedorId
 * @desc    Obtener estadísticas detalladas de un contenedor específico
 * @access  Private (admin_general, propietario, almacen_rd)
 */
router.get('/contenedor/:contenedorId',
  verifyToken,
  checkRole('admin_general', 'propietario', 'almacen_rd', 'super_admin'),
  getContenedorStats
);

/**
 * @route   GET /api/dashboard/ruta/:rutaId
 * @desc    Obtener estadísticas detalladas de una ruta específica
 * @access  Private (admin_general, propietario, repartidor)
 */
router.get('/ruta/:rutaId',
  verifyToken,
  checkRole('admin_general', 'propietario', 'repartidor', 'super_admin'),
  getRutaStats
);

export default router;