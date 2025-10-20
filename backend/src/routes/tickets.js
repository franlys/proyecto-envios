// backend/src/routes/tickets.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { ticketController } from '../controllers/ticketController.js';

const router = express.Router();

router.use(verifyToken);

// POST /api/tickets - Crear nuevo ticket
router.post('/', ticketController.createTicket);

// GET /api/tickets/my-tickets - Obtener tickets del usuario
router.get('/my-tickets', ticketController.getMyTickets);

// GET /api/tickets/all - Obtener todos los tickets (solo super_admin)
router.get('/all', ticketController.getAllTickets);

// PATCH /api/tickets/:id/respond - Responder ticket (solo super_admin)
router.patch('/:id/respond', ticketController.respondTicket);

// PATCH /api/tickets/:id/close - Cerrar ticket
router.patch('/:id/close', ticketController.closeTicket);

export default router;