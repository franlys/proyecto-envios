// backend/src/routes/recolecciones.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js'; // Asegúrate que este middleware exista y esté configurado

// Importar SOLO las funciones del NUEVO controlador
import {
  createRecoleccion,
  getAllRecolecciones,
  getRecoleccionById
} from '../controllers/recoleccionesController.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas de recolecciones
router.use(verifyToken);

// =========================================
// RUTAS DE RECOLECCIONES (NUEVA LÓGICA)
// =========================================

/**
 * POST /api/recolecciones
 * Crear una nueva recolección con items y fotos
 */
router.post(
  '/', 
  upload.array('fotosRecoleccion', 10), // Middleware para archivos
  createRecoleccion
);

/**
 * GET /api/recolecciones
 * Obtener todas las recolecciones (basado en la nueva lógica)
 */
router.get('/', getAllRecolecciones);

/**
 * GET /api/recolecciones/:id
 * Obtener una recolección nueva por ID de Firestore
 */
router.get('/:id', getRecoleccionById);

// NOTA: Las rutas de actualización (PATCH/PUT) y eliminación (DELETE)
// se añadirán aquí en fases futuras.

export default router;