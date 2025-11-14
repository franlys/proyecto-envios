// backend/src/routes/almacenUSA.js
// ✅ RUTAS CORREGIDAS - Con /items/marcar

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  crearContenedor,
  getContenedores,
  getContenedorById,
  buscarFactura,
  agregarFactura,
  quitarFactura,
  marcarItem,
  cerrarContenedor,
  getEstadisticasAlmacen
} from '../controllers/almacenUSAController.js';

const router = express.Router();

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
router.use(verifyToken);

// ========================================
// RUTAS DE ESTADÍSTICAS
// ========================================
router.get('/estadisticas', getEstadisticasAlmacen);

// ========================================
// RUTAS DE CONTENEDORES
// ========================================
router.post('/contenedores', crearContenedor);
router.get('/contenedores', getContenedores);
router.get('/contenedores/:id', getContenedorById);
router.post('/contenedores/:id/cerrar', cerrarContenedor);

// ========================================
// RUTAS DE FACTURAS
// ========================================
router.get('/facturas/buscar/:codigoTracking', buscarFactura);
router.post('/contenedores/:contenedorId/facturas', agregarFactura);
router.delete('/contenedores/:contenedorId/facturas/:facturaId', quitarFactura);

// ========================================
// RUTAS DE ITEMS
// ✅ CORRECCIÓN: Ruta /items/marcar agregada
// ========================================
router.post('/contenedores/:contenedorId/items/marcar', marcarItem);

export default router;