// backend/src/routes/repartidores.js
/**
 * RUTAS DEL MÓDULO DE REPARTIDORES
 * Gestión de entregas con evidencias y confirmación de pagos
 * 
 * Rutas base: /api/repartidores
 */

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import uploadDisk from '../middleware/uploadDisk.js';
import {
  getRutasAsignadas,
  getDetalleRuta,
  iniciarEntregas,
  confirmarItemEntregado,
  subirFotosEvidencia,
  confirmarPagoContraentrega,
  reportarItemDanado,
  marcarFacturaEntregada,
  reportarFacturaNoEntregada,
  finalizarRuta,
  exportarFacturasRutaParaImpresion
} from '../controllers/repartidoresController.js';

const router = express.Router();

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
router.use(verifyToken);

// ========================================
// RUTAS DE RUTAS (Gestión de rutas asignadas)
// ========================================

/**
 * GET /api/repartidores/rutas
 * Obtener rutas asignadas al repartidor actual
 * Solo muestra rutas en estado 'cargada' o 'en_entrega'
 * Roles: repartidor, admin_general, super_admin
 */
router.get('/rutas', getRutasAsignadas);

/**
 * GET /api/repartidores/rutas/:rutaId/exportar-impresion
 * Exportar facturas de ruta para impresión con logo y detalles completos
 * Roles: repartidor, cargador, admin_general, super_admin
 * IMPORTANTE: Debe estar ANTES de /rutas/:rutaId para evitar conflictos
 */
router.get('/rutas/:rutaId/exportar-impresion', exportarFacturasRutaParaImpresion);

/**
 * POST /api/repartidores/rutas/:rutaId/iniciar-entregas
 * Iniciar el proceso de entregas de una ruta
 * Cambia el estado de 'cargada' a 'en_entrega'
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/rutas/:rutaId/iniciar-entregas', iniciarEntregas);

/**
 * POST /api/repartidores/rutas/:rutaId/finalizar
 * Finalizar ruta y generar resumen de entregas
 * Body: { notas?: string }
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/rutas/:rutaId/finalizar', finalizarRuta);

/**
 * GET /api/repartidores/rutas/:rutaId
 * Obtener detalle completo de una ruta con facturas ordenadas para entrega
 * Roles: repartidor, admin_general, super_admin
 * IMPORTANTE: Debe estar DESPUÉS de rutas específicas como /exportar-impresion
 */
router.get('/rutas/:rutaId', getDetalleRuta);

// ========================================
// RUTAS DE ENTREGAS (Gestión de facturas individuales)
// ========================================

/**
 * POST /api/repartidores/facturas/:facturaId/items/entregar
 * Confirmar un item como entregado
 * Body: { itemIndex: number }
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/facturas/:facturaId/items/entregar', confirmarItemEntregado);

/**
 * POST /api/repartidores/facturas/:facturaId/fotos
 * Subir fotos de evidencia de entrega
 * Body: { fotos: string[] }
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/facturas/:facturaId/fotos', subirFotosEvidencia);

/**
 * POST /api/repartidores/facturas/:facturaId/pago-contraentrega
 * Confirmar pago contraentrega
 * Body: { 
 *   montoPagado: number, 
 *   metodoPago?: string,
 *   referenciaPago?: string,
 *   notas?: string
 * }
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/facturas/:facturaId/pago-contraentrega', confirmarPagoContraentrega);

/**
 * POST /api/repartidores/facturas/:facturaId/items/danado
 * Reportar un item como dañado durante entrega
 * Body: { 
 *   itemIndex: number, 
 *   descripcionDano: string, 
 *   fotos?: string[] 
 * }
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/facturas/:facturaId/items/danado', reportarItemDanado);

/**
 * POST /api/repartidores/facturas/:facturaId/entregar
 * Marcar factura completa como entregada
 * Body: { 
 *   firmaCliente?: string,
 *   nombreReceptor?: string,
 *   notasEntrega?: string
 * }
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/facturas/:facturaId/entregar', marcarFacturaEntregada);

/**
 * POST /api/repartidores/facturas/:facturaId/no-entregada
 * Reportar factura como no entregada
 * Body: { 
 *   motivo: 'cliente_ausente' | 'direccion_incorrecta' | 'cliente_rechazo' | 'otro',
 *   descripcion: string,
 *   fotos?: string[],
 *   intentarNuevamente?: boolean
 * }
 * Roles: repartidor, admin_general, super_admin
 */
router.post('/facturas/:facturaId/no-entregada', reportarFacturaNoEntregada);

// ========================================
// EXPORTAR ROUTER
// ========================================

export default router;