// backend/src/routes/tickets.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { ticketController } from '../controllers/ticketController.js';

const router = express.Router();

// =====================================================
// MIDDLEWARE DE AUTENTICACIÓN
// =====================================================
// Todas las rutas de tickets requieren autenticación
router.use(verifyToken);

// =====================================================
// RUTAS DE TICKETS
// =====================================================

/**
 * @route   POST /api/tickets
 * @desc    Crear un nuevo ticket de soporte
 * @access  Private (todos los usuarios autenticados)
 * @body    { asunto, mensaje, prioridad?, categoria? }
 */
router.post('/', ticketController.createTicket);

/**
 * @route   GET /api/tickets/my-tickets
 * @desc    Obtener todos los tickets del usuario actual
 * @access  Private (usuario autenticado)
 * @returns { success: true, data: [tickets] }
 */
router.get('/my-tickets', ticketController.getMyTickets);

/**
 * @route   GET /api/tickets/all
 * @desc    Obtener todos los tickets del sistema
 * @access  Private (solo super_admin)
 * @returns { success: true, data: [tickets] }
 */
router.get('/all', ticketController.getAllTickets);

/**
 * @route   PATCH /api/tickets/:id/respond
 * @desc    Responder a un ticket (agregar respuesta)
 * @access  Private (solo super_admin)
 * @params  id - ID del ticket
 * @body    { respuesta: string }
 */
router.patch('/:id/respond', ticketController.respondTicket);

/**
 * @route   PATCH /api/tickets/:id/close
 * @desc    Cerrar un ticket
 * @access  Private (creador del ticket o super_admin)
 * @params  id - ID del ticket
 */
router.patch('/:id/close', ticketController.closeTicket);

// =====================================================
// ✅ EXPORTACIÓN POR DEFECTO
// =====================================================
export default router;