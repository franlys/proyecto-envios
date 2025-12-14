// backend/src/routes/recolecciones.routes.js
// ✅ RUTAS COMPLETAS CON MIDDLEWARE DE AUTENTICACIÓN

import express from 'express';
import { verifyToken, checkRole } from '../middleware/auth.js';
import {
  createRecoleccion,
  createPublicRecoleccion,
  getRecolecciones,
  getRecoleccionById,
  buscarPorCodigoTracking,
  actualizarEstado,
  actualizarPago,
  actualizarRecoleccion,
  deleteRecoleccion,
  getEstadisticas,
  upload
} from '../controllers/recoleccionesController.js';

const router = express.Router();

// ========================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================

/**
 * GET /api/recolecciones/test
 * Endpoint de prueba
 */
router.get('/test', (req, res) => {
  res.json({
    message: 'Recolecciones routes working',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/recolecciones/public
 * Crear recolección desde la Web (Sin Auth)
 * Requiere: companyId en body
 */
router.post('/public', createPublicRecoleccion);

// ========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================

/**
 * POST /api/recolecciones
 * Crear nueva recolección
 * Requiere: autenticación
 * Roles permitidos: recolector, admin_general, super_admin, almacen_eeuu
 */
router.post('/',
  verifyToken,  // ✅ CRÍTICO: Middleware de autenticación
  createRecoleccion
);

/**
 * GET /api/recolecciones
 * Obtener todas las recolecciones de la empresa
 * Requiere: autenticación
 * Query params: estado, contenedorId, limit, offset
 */
router.get('/',
  verifyToken,
  getRecolecciones
);

/**
 * GET /api/recolecciones/estadisticas
 * Obtener estadísticas de recolecciones
 * Requiere: autenticación
 * IMPORTANTE: Esta ruta debe ir ANTES de /:id para evitar conflictos
 */
router.get('/estadisticas',
  verifyToken,
  getEstadisticas
);

/**
 * GET /api/recolecciones/tracking/:codigoTracking
 * Buscar recolección por código de tracking
 * Requiere: autenticación
 */
router.get('/tracking/:codigoTracking',
  verifyToken,
  buscarPorCodigoTracking
);

/**
 * GET /api/recolecciones/:id
 * Obtener recolección por ID
 * Requiere: autenticación
 */
router.get('/:id',
  verifyToken,
  getRecoleccionById
);

/**
 * PUT /api/recolecciones/:id
 * Actualizar recolección completa
 * Requiere: autenticación
 */
router.put('/:id',
  verifyToken,
  actualizarRecoleccion
);

/**
 * PATCH /api/recolecciones/:id/estado
 * Actualizar solo el estado de la recolección
 * Requiere: autenticación
 */
router.patch('/:id/estado',
  verifyToken,
  actualizarEstado
);

/**
 * PATCH /api/recolecciones/:id/pago
 * Actualizar información de pago
 * Requiere: autenticación
 */
router.patch('/:id/pago',
  verifyToken,
  actualizarPago
);

/**
 * DELETE /api/recolecciones/:id
 * Eliminar recolección
 * Requiere: autenticación
 * Solo se puede eliminar si no está en un contenedor
 */
router.delete('/:id',
  verifyToken,
  deleteRecoleccion
);

/**
 * POST /api/recolecciones/:id/upload-fotos
 * Subir fotos de una recolección
 * Requiere: autenticación
 * Acepta hasta 5 fotos
 */
router.post('/:id/upload-fotos',
  verifyToken,
  upload.array('fotos', 5),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se han subido fotos'
        });
      }

      const fotos = req.files.map(file => ({
        url: `/uploads/recolecciones/${file.filename}`,
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        uploadDate: new Date().toISOString()
      }));

      // Actualizar recolección con las fotos
      const { db } = await import('../config/firebase.js');
      const { FieldValue } = await import('firebase-admin/firestore');

      await db.collection('recolecciones').doc(id).update({
        fotos: FieldValue.arrayUnion(...fotos),
        fechaActualizacion: FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        message: 'Fotos subidas exitosamente',
        data: { fotos }
      });

    } catch (error) {
      console.error('❌ Error subiendo fotos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir las fotos',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/recolecciones/:id/fotos/:filename
 * Eliminar una foto específica de la recolección
 * Requiere: autenticación
 */
router.delete('/:id/fotos/:filename',
  verifyToken,
  async (req, res) => {
    try {
      const { id, filename } = req.params;

      const { db } = await import('../config/firebase.js');
      const { FieldValue } = await import('firebase-admin/firestore');

      // Obtener la recolección
      const doc = await db.collection('recolecciones').doc(id).get();

      if (!doc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Recolección no encontrada'
        });
      }

      const data = doc.data();
      const fotos = data.fotos || [];

      // Encontrar la foto a eliminar
      const fotoToRemove = fotos.find(f => f.filename === filename);

      if (!fotoToRemove) {
        return res.status(404).json({
          success: false,
          message: 'Foto no encontrada'
        });
      }

      // Eliminar del array
      await db.collection('recolecciones').doc(id).update({
        fotos: FieldValue.arrayRemove(fotoToRemove),
        fechaActualizacion: FieldValue.serverTimestamp()
      });

      // TODO: Eliminar archivo físico del servidor si es necesario
      // fs.unlinkSync(path.join('uploads/recolecciones', filename));

      res.json({
        success: true,
        message: 'Foto eliminada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando foto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la foto',
        error: error.message
      });
    }
  }
);

export default router;