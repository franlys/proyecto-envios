import express from 'express';
import * as finanzasSaasController from '../controllers/finanzasSaasController.js';
import * as finanzasEmpresaController from '../controllers/finanzasEmpresaController.js';
import { verifyToken as authenticate, checkRole as authorize } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// RUTAS FINANZAS SAAS - Solo Super Admin
// ============================================

/**
 * GET /api/finanzas/saas/overview
 * Obtiene overview del negocio SaaS (MRR, ARR, empresas, etc.)
 */
router.get(
    '/saas/overview',
    authenticate,
    authorize('super_admin'),
    finanzasSaasController.getOverview
);

/**
 * GET /api/finanzas/saas/empresas
 * Lista de empresas suscritas con sus métricas
 */
router.get(
    '/saas/empresas',
    authenticate,
    authorize('super_admin'),
    finanzasSaasController.getEmpresasSuscritas
);

/**
 * GET /api/finanzas/saas/metricas-mensuales
 * Métricas mensuales para gráficos (MRR, churn, etc.)
 */
router.get(
    '/saas/metricas-mensuales',
    authenticate,
    authorize('super_admin'),
    finanzasSaasController.getMetricasMensuales
);

// ============================================
// RUTAS FINANZAS EMPRESARIALES - Propietarios
// ============================================

/**
 * GET /api/finanzas/empresa/overview
 * Overview financiero de la empresa (ingresos, gastos, utilidad)
 */
router.get(
    '/empresa/overview',
    authenticate,
    authorize('propietario'),
    finanzasEmpresaController.getOverview
);

/**
 * GET /api/finanzas/empresa/metricas-mensuales
 * Métricas mensuales de la empresa
 */
router.get(
    '/empresa/metricas-mensuales',
    authenticate,
    authorize('propietario'),
    finanzasEmpresaController.getMetricasMensuales
);

/**
 * GET /api/finanzas/empresa/suscripcion
 * Obtiene datos de suscripción SaaS de la empresa
 */
router.get(
    '/empresa/suscripcion',
    authenticate,
    authorize('propietario'),
    finanzasEmpresaController.getSuscripcion
);

/**
 * GET /api/finanzas/empresa/facturas-pendientes
 * Obtiene facturas pendientes de pago al sistema
 */
router.get(
    '/empresa/facturas-pendientes',
    authenticate,
    authorize('propietario'),
    finanzasEmpresaController.getFacturasPendientes
);

/**
 * GET /api/finanzas/tasa-dolar
 * Obtiene tasa de cambio actual (accesible para propietarios)
 */
router.get(
    '/tasa-dolar',
    authenticate,
    authorize('propietario', 'admin_general'),
    finanzasEmpresaController.getTasaDolar
);

export default router;
