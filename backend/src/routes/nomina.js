// backend/src/routes/nomina.js
import express from 'express';
import { generarArchivoBanco } from '../controllers/nominaController.js';

const router = express.Router();

/**
 * POST /api/nomina/generar-archivo-banco
 * Genera archivo TXT para pago de nómina
 */
router.post('/generar-archivo-banco', generarArchivoBanco);

export default router;
