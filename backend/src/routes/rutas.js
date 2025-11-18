import express from 'express';
import { verifyToken } from '../middleware/auth.js';

// ✅ IMPORTAMOS EL CONTROLADOR UNIFICADO
import {
  getAllRutas,
  getRutasActivas,
  getRutaById,
  createRutaAvanzada,
  createRuta,
  cerrarRuta,
  updateEntrega,
  finalizarRuta,
  getRepartidoresDisponibles,
  getCargadoresDisponibles,
  getContenedoresDisponibles,
  getFacturasDisponibles,
  getStatsRepartidor
} from '../controllers/rutaController.js';

const router = express.Router();
router.use(verifyToken);

// ============================================
// 1. RECURSOS (Para llenar los selects del modal)
// ============================================
router.get('/repartidores-disponibles', getRepartidoresDisponibles);
router.get('/cargadores-disponibles', getCargadoresDisponibles);
router.get('/contenedores-disponibles', getContenedoresDisponibles);
router.get('/facturas-disponibles', getFacturasDisponibles);

// ============================================
// 2. GESTIÓN PRINCIPAL DE RUTAS
// ============================================

// Listar rutas (Corrección del Error 500)
router.get('/', getAllRutas);
router.get('/activas', getRutasActivas);

// Crear ruta (Sistema Avanzado Web)
router.post('/crear-avanzada', createRutaAvanzada);
router.post('/', createRuta); // Compatibilidad

// Estadísticas
router.get('/stats-repartidor', getStatsRepartidor);

// ============================================
// 3. OPERACIONES ESPECÍFICAS
// ============================================
router.get('/:id', getRutaById);
router.put('/:id/cerrar', cerrarRuta);
router.put('/:id/finalizar', finalizarRuta);
router.put('/:facturaId/entrega', updateEntrega);

export default router;