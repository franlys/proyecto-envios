// backend/src/routes/facturacion.js
/**
 * RUTAS DEL SISTEMA DE FACTURACIÓN
 * Gestión de pagos, precios y estados financieros
 * 
 * Rutas base: /api/facturacion
 */

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  actualizarFacturacion,
  registrarPago,
  getFacturasPendientes,
  getFacturasPorContenedor
} from '../controllers/facturacionController.js';

const router = express.Router();

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
router.use(verifyToken);

// ========================================
// RUTAS DE FACTURACIÓN
// ========================================

/**
 * PUT /api/facturacion/recolecciones/:id
 * Actualizar facturación completa de una recolección
 * Body: { items: [], metodoPago, estadoPago, montoPagado, notas }
 * Roles: admin_general, secretaria
 */
router.put('/recolecciones/:id', actualizarFacturacion);

/**
 * POST /api/facturacion/recolecciones/:id/pago
 * Registrar un pago para una recolección
 * Body: { montoPago, metodoPago, referencia, notas }
 * Roles: admin_general, secretaria, repartidor
 */
router.post('/recolecciones/:id/pago', registrarPago);

/**
 * GET /api/facturacion/pendientes
 * Obtener todas las facturas pendientes de pago
 * Query: ?contenedorId=xxx (opcional)
 * Roles: admin_general, secretaria
 */
router.get('/pendientes', getFacturasPendientes);

/**
 * GET /api/facturacion/contenedores/:contenedorId
 * Obtener todas las facturas de un contenedor con resumen financiero
 * Roles: admin_general, secretaria, almacen_rd
 */
router.get('/contenedores/:contenedorId', getFacturasPorContenedor);

// ========================================
// EXPORTAR ROUTER
// ========================================

export default router;