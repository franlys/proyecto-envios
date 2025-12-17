import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
    createSolicitud,
    createSolicitudPublica,
    getSolicitudes,
    asignarSolicitud,
    aceptarSolicitud,
    rechazarSolicitud,
    completarSolicitud,
    getRecolectoresDisponibles,
    verificarSolicitudesExpiradas
} from '../controllers/solicitudesController.js';

const router = express.Router();

// 📅 ENDPOINT PÚBLICO - Crear solicitud desde formulario web/bot (SIN AUTENTICACIÓN)
router.post('/public', createSolicitudPublica);

// Middleware de autenticación para el resto de rutas
router.use(verifyToken);

// 📅 Crear nueva solicitud (Secretaria)
router.post('/', createSolicitud);

// 📋 Obtener lista de solicitudes (Pool / Historial)
// También verifica y devuelve al pool las solicitudes expiradas
router.get('/', async (req, res, next) => {
    // Verificar solicitudes expiradas antes de devolver la lista
    await verificarSolicitudesExpiradas();
    next();
}, getSolicitudes);

// 👥 Obtener recolectores disponibles (para asignación manual por Secretaria)
router.get('/recolectores', getRecolectoresDisponibles);

// 🙋‍♂️ Asignar/Reclamar solicitud (Secretaria asigna manualmente o Recolector toma del pool)
router.put('/:id/asignar', asignarSolicitud);

// ✅ Aceptar solicitud (Recolector confirma asignación manual)
router.put('/:id/aceptar', aceptarSolicitud);

// ❌ Rechazar solicitud (Recolector declina, vuelve al pool)
router.put('/:id/rechazar', rechazarSolicitud);

// ✅ Completar solicitud (cuando se genera la factura real)
router.put('/:id/completar', completarSolicitud);

export default router;
