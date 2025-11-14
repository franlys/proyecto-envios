// backend/src/routes/secretarias.js
/**
 * RUTAS DEL MÓDULO DE SECRETARIAS
 * Gestión de confirmación y edición de facturas
 * 
 * Rutas base: /api/secretarias
 */

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getContenedoresRecibidos,
  getFacturasDelContenedor,
  confirmarFactura,
  editarFactura,
  exportarFacturasConfirmadas,
  getEstadisticasSecretarias
} from '../controllers/secretariasController.js';

const router = express.Router();

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
router.use(verifyToken);

// ========================================
// RUTAS DE ESTADÍSTICAS
// ========================================

/**
 * GET /api/secretarias/estadisticas
 * Obtener estadísticas generales de trabajo
 * Roles: secretaria, admin_general, super_admin
 */
router.get('/estadisticas', getEstadisticasSecretarias);

// ========================================
// RUTAS DE CONTENEDORES
// ========================================

/**
 * GET /api/secretarias/contenedores
 * Obtener contenedores recibidos en RD (estado: 'recibido_rd')
 * Roles: secretaria, admin_general, super_admin
 */
router.get('/contenedores', getContenedoresRecibidos);

/**
 * GET /api/secretarias/contenedores/:contenedorId/facturas
 * Obtener todas las facturas de un contenedor con detalles completos
 * Roles: secretaria, admin_general, super_admin
 */
router.get('/contenedores/:contenedorId/facturas', getFacturasDelContenedor);

/**
 * GET /api/secretarias/contenedores/:contenedorId/exportar
 * Exportar facturas confirmadas del contenedor para organización de rutas
 * Retorna: { numeroFactura, zona, direccion }
 * Roles: secretaria, admin_general, super_admin
 */
router.get('/contenedores/:contenedorId/exportar', exportarFacturasConfirmadas);

// ========================================
// RUTAS DE FACTURAS
// ========================================

/**
 * POST /api/secretarias/facturas/:facturaId/confirmar
 * Confirmar una factura como verificada
 * Body: { notasSecretaria?: string }
 * Roles: secretaria, admin_general, super_admin
 */
router.post('/facturas/:facturaId/confirmar', confirmarFactura);

/**
 * PUT /api/secretarias/facturas/:facturaId
 * Editar información de una factura
 * Body: {
 *   destinatario?: { nombre, telefono, email, direccion, zona },
 *   pago?: { estado, metodoPago, montoPagado, referenciaPago },
 *   notasSecretaria?: string
 * }
 * Roles: secretaria, admin_general, super_admin
 */
router.put('/facturas/:facturaId', editarFactura);

// ========================================
// EXPORTAR ROUTER
// ========================================

export default router;