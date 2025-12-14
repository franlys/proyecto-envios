import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    createSolicitud,
    getSolicitudes,
    asignarSolicitud,
    completarSolicitud
} from '../controllers/solicitudesController.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(verifyToken);

// 📅 Crear nueva solicitud (Secretaria)
router.post('/', createSolicitud);

// 📋 Obtener lista de solicitudes (Pool / Historial)
router.get('/', getSolicitudes);

// 🙋‍♂️ Asignar/Reclamar solicitud
router.put('/:id/asignar', asignarSolicitud);

// ✅ Completar solicitud
router.put('/:id/completar', completarSolicitud);

export default router;
