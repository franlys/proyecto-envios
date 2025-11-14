// backend/src/routes/cargadores.js
/**
 * ✅ RUTAS DEL SISTEMA DE CARGADORES - VERSIÓN COMPLETA
 * 
 * Endpoints para la gestión de carga de camiones
 */

import express from 'express';
import { verifyToken, checkRole } from '../middleware/auth.js';
import {
  getRutasAsignadas,
  getDetalleRuta,
  iniciarCarga,
  confirmarItemCargado,
  reportarItemDanado,
  finalizarCarga,
} from '../controllers/cargadoresController.js';

const router = express.Router();

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
// Todas las rutas de cargadores requieren autenticación
router.use(verifyToken);

// Opcionalmente, puedes asegurar que solo el rol 'cargador' (o 'admin_general') acceda
// Descomenta la línea siguiente si quieres restringir por rol:
// router.use(checkRole('cargador', 'admin_general', 'super_admin'));

// ========================================
// RUTAS DE CARGADORES
// ========================================

/**
 * @route   GET /api/cargadores/rutas
 * @desc    Obtener rutas asignadas al cargador logueado (con estadísticas)
 * @access  Private (Cargador)
 * @returns {Object} { success, data: rutas[], total }
 */
router.get('/rutas', getRutasAsignadas);

/**
 * @route   GET /api/cargadores/rutas/:rutaId
 * @desc    Obtener el detalle completo de una ruta (con facturas y items)
 * @access  Private (Cargador)
 * @params  rutaId - ID de la ruta
 * @returns {Object} { success, data: { ruta con facturas detalladas } }
 */
router.get('/rutas/:rutaId', getDetalleRuta);

/**
 * @route   POST /api/cargadores/rutas/:rutaId/iniciar-carga
 * @desc    Marcar una ruta como "en_carga" (cambiar estado de asignada → en_carga)
 * @access  Private (Cargador)
 * @params  rutaId - ID de la ruta
 * @returns {Object} { success, message, data: { rutaId, estado } }
 */
router.post('/rutas/:rutaId/iniciar-carga', iniciarCarga);

/**
 * @route   POST /api/cargadores/rutas/:rutaId/facturas/:facturaId/items/confirmar
 * @desc    Confirmar que un item específico ha sido cargado al camión
 * @access  Private (Cargador)
 * @params  rutaId - ID de la ruta
 * @params  facturaId - ID de la factura/recolección
 * @body    { itemIndex: number }
 * @returns {Object} { success, message, data: { facturaId, itemIndex, itemsCargados, itemsTotal, estadoCarga } }
 */
router.post(
  '/rutas/:rutaId/facturas/:facturaId/items/confirmar',
  confirmarItemCargado
);

/**
 * @route   POST /api/cargadores/facturas/:facturaId/items/danado
 * @desc    Reportar un item como dañado durante la carga (lo agrega a itemsDanados)
 * @access  Private (Cargador)
 * @params  facturaId - ID de la factura/recolección
 * @body    { itemIndex: number, descripcionDano: string, fotos?: string[] }
 * @returns {Object} { success, message, data: itemDanado }
 */
router.post('/facturas/:facturaId/items/danado', reportarItemDanado);

/**
 * @route   POST /api/cargadores/rutas/:rutaId/finalizar-carga
 * @desc    Finalizar carga de ruta (cambiar estado de en_carga → cargada)
 *          Valida que todos los items estén cargados antes de permitir finalizar
 * @access  Private (Cargador)
 * @params  rutaId - ID de la ruta
 * @body    { notas?: string }
 * @returns {Object} { success, message, data: { rutaId, estado, totalFacturas } }
 */
router.post('/rutas/:rutaId/finalizar-carga', finalizarCarga);

export default router;