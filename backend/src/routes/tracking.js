// backend/src/routes/tracking.js
// ✅ RUTAS PÚBLICAS PARA TRACKING DE RECOLECCIONES

import express from 'express';
import { getPublicTracking } from '../controllers/trackingController.js';

const router = express.Router();

// ========================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================

/**
 * GET /api/tracking/public/:codigo
 * Obtiene información de tracking de una recolección
 * SIN autenticación - acceso público para clientes
 *
 * Ejemplos:
 * - /api/tracking/public/EMI-0001
 * - /api/tracking/public/RC-20250127-0001
 */
router.get('/public/:codigo', getPublicTracking);

/**
 * GET /api/tracking/test
 * Endpoint de prueba
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Tracking routes working',
    timestamp: new Date().toISOString()
  });
});

export default router;
