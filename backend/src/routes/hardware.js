// backend/src/routes/hardware.js
// Rutas para gestión de hardware (Zebra RFID y Scanners Manuales)

import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getHardwareConfig,
  cambiarSistemaHardware,
  agregarScanner,
  agregarImpresora,
  toggleSistemaHardware,
  agregarConsumible
} from '../controllers/hardwareController.js';

const router = express.Router();

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
router.use(verifyToken);

// ========================================
// RUTAS DE CONFIGURACIÓN GENERAL
// ========================================

// Obtener configuración de hardware de una compañía
router.get('/:companyId', getHardwareConfig);

// Cambiar sistema de hardware (RFID Zebra <-> Barcode Manual)
router.post('/:companyId/cambiar-sistema', cambiarSistemaHardware);

// Activar/Desactivar sistema de hardware
router.patch('/:companyId/toggle', toggleSistemaHardware);

// ========================================
// RUTAS PARA SCANNERS MANUALES
// ========================================

// Agregar scanner manual
router.post('/:companyId/scanners', agregarScanner);

// Eliminar scanner
router.delete('/:companyId/dispositivos/:dispositivoId', eliminarDispositivo);

// ========================================
// RUTAS PARA IMPRESORAS TÉRMICAS
// ========================================

// Agregar impresora térmica
// Agregar impresora térmica
router.post('/:companyId/impresoras', agregarImpresora);

// ========================================
// RUTAS PARA CONSUMIBLES
// ========================================

// Agregar consumible (etiquetas, etc)
router.post('/:companyId/consumibles', agregarConsumible);

// ========================================
// RUTAS DE CONFIGURACIÓN DE CÓDIGOS DE BARRAS
// ========================================

// Actualizar configuración de códigos de barras
router.patch('/:companyId/barcode-config', actualizarConfigBarcode);

export default router;
