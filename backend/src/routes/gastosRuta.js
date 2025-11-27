// backend/src/routes/gastosRuta.js
/**
 * RUTAS DE GASTOS DE RUTA
 * Gestión de gastos del repartidor
 */

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { agregarGasto, obtenerGastos } from '../controllers/gastosRutaController.js';

const router = express.Router();

// Middleware de autenticación
router.use(verifyToken);

/**
 * POST /api/gastos-ruta/:rutaId
 * Agregar un gasto a una ruta
 * Body: { tipo: string, monto: number, descripcion?: string }
 */
router.post('/:rutaId', agregarGasto);

/**
 * GET /api/gastos-ruta/:rutaId
 * Obtener todos los gastos de una ruta
 */
router.get('/:rutaId', obtenerGastos);

export default router;
