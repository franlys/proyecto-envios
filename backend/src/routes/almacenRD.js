// backend/src/routes/almacenRD.js
// ✅ RUTAS CORREGIDAS COMPLETAS

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getContenedoresEnTransito,
  getContenedoresRecibidos,
  confirmarRecepcion,
  marcarItemDanado,
  asignarFacturaARuta,
  reasignarFactura,
  quitarFacturaDeRuta,
  reportarFacturaIncompleta,
  getDetalleFactura,
  editarPago,
  getEstadisticasAlmacenRD,
  recibirItemRD
} from '../controllers/almacenRDController.js';

const router = express.Router();

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
router.use(verifyToken);

// ========================================
// RUTAS DE ESTADÍSTICAS
// ========================================
router.get('/estadisticas', getEstadisticasAlmacenRD);

// ========================================
// RUTAS DE CONTENEDORES
// ========================================
router.get('/contenedores/en-transito', getContenedoresEnTransito);
router.get('/contenedores/recibidos', getContenedoresRecibidos);
router.post('/contenedores/:contenedorId/confirmar-recepcion', confirmarRecepcion);

// ========================================
// RUTAS DE FACTURAS - INFORMACIÓN Y DETALLE
// ========================================
router.get('/facturas/:facturaId/detalle', getDetalleFactura);
router.put('/facturas/:facturaId/pago', editarPago);

// ========================================
// RUTAS DE FACTURAS - INCIDENCIAS
// ========================================
router.post('/facturas/:facturaId/reportar-incompleta', reportarFacturaIncompleta);
router.post('/facturas/:facturaId/items/danado', marcarItemDanado);
router.post('/facturas/:facturaId/items/recibir', recibirItemRD);

// ========================================
// RUTAS DE ASIGNACIÓN DE RUTAS
// ========================================
router.post('/facturas/:facturaId/asignar-ruta', asignarFacturaARuta);
router.put('/facturas/:facturaId/reasignar-ruta', reasignarFactura);
router.delete('/facturas/:facturaId/ruta', quitarFacturaDeRuta);

export default router;