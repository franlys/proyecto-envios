// backend/src/routes/facturacion.js
// backend/src/routes/facturacion.js
/**
 * RUTAS DEL SISTEMA DE FACTURACIÓN
 * Gestión de pagos, precios y estados financieros
 * * Rutas base: /api/facturacion
 */

import express from 'express';
import multer from 'multer'; // ✅ Importar multer
import { verifyToken } from '../middleware/auth.js';
import {
  actualizarFacturacion,
  registrarPago,
  getFacturasPendientes,
  getFacturasPorContenedor,
  // ✅ CORRECCIÓN: Se importa la nueva función del controller
  getFacturasNoEntregadas,
  reasignarFactura,
  subirFactura, // <-- Nueva función
  enviarFactura, // <-- Nueva función
  debugEstadosFacturas,
  repararFacturasHuerfanas
} from '../controllers/facturacionController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // ✅ Configurar multer en memoria
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================\
router.use(verifyToken);

// ========================================\
// RUTAS DE FACTURACIÓN
// ========================================\

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
 * POST /api/facturacion/recolecciones/:id/upload
 * Subir archivo de factura (PDF/Imagen)
 * Body: form-data con key 'factura'
 * Roles: admin_general, secretaria
 */
router.post('/recolecciones/:id/upload', upload.single('factura'), subirFactura);

/**
 * POST /api/facturacion/recolecciones/:id/send
 * Enviar factura por Email/WhatsApp
 * Body: { metodo: 'email'|'whatsapp'|'ambos', email, telefono }
 * Roles: admin_general, secretaria
 */
router.post('/recolecciones/:id/send', enviarFactura);

/**
 * GET /api/facturacion/pendientes
 * Obtener todas las facturas pendientes de pago
 * Query: ?contenedorId=xxx (opcional)
 * Roles: admin_general, secretaria
 */
router.get('/pendientes', getFacturasPendientes);

// ✅ RUTA CORREGIDA: Resuelve el error 404 en el frontend.
/**
 * POST /api/facturacion/reasignar
 * Reasignar una factura no entregada a pendiente o a otra ruta activa
 * Body: { facturaId, accion, observaciones, nuevaRutaId }
 * Roles: admin_general, secretaria
 */
router.post('/reasignar', reasignarFactura); // <-- Nueva ruta POST

/**
 * GET /api/facturacion/no-entregadas
 * Obtener todas las facturas no entregadas
 * Roles: admin_general, secretaria, almacen_rd
 */
router.get('/no-entregadas', getFacturasNoEntregadas);

/**
 * GET /api/facturacion/debug-estados
 * DEBUG: Ver todos los estados de facturas
 * Temporal para debugging
 */
router.get('/debug-estados', debugEstadosFacturas);

/**
 * POST /api/facturacion/reparar-huerfanas
 * REPARACIÓN: Marcar facturas huérfanas como no_entregada
 * Temporal para reparar facturas que quedaron sin estado
 */
router.post('/reparar-huerfanas', repararFacturasHuerfanas);

/**
 * GET /api/facturacion/contenedores/:contenedorId
 * Obtener todas las facturas de un contenedor.
 * Roles: admin_general, secretaria, almacen_rd
 */
router.get('/contenedores/:contenedorId', getFacturasPorContenedor);


export default router;