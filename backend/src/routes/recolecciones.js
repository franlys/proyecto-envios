// backend/src/routes/recolecciones.js
import express from 'express';
import { admin } from '../config/firebase.js';
import Recoleccion from '../models/Recoleccion.js';
import upload from '../middleware/upload.js';
import ImageCompression from '../utils/imageCompression.js';

const router = express.Router();
const storage = admin.storage().bucket();

/**
 * GET /api/recolecciones
 * Listar todas las recolecciones con filtros
 */
router.get('/', async (req, res) => {
  try {
    const { 
      status,
      recolector_id,
      tracking,
      fecha_inicio,
      fecha_fin,
      contenedor_id,
      limit = 50 
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (status) filtros.status = status;
    if (recolector_id) filtros.recolector_id = recolector_id;
    if (tracking) filtros.tracking_numero = tracking;
    if (contenedor_id) filtros.contenedor_id = contenedor_id;
    
    // Filtro por rango de fechas
    if (fecha_inicio && fecha_fin) {
      filtros.fecha_recoleccion = {
        $gte: new Date(fecha_inicio),
        $lte: new Date(fecha_fin)
      };
    }

    const recolecciones = await Recoleccion.obtenerConFiltros(
      filtros, 
      parseInt(limit), 
      0
    );

    res.json({
      success: true,
      count: recolecciones.length,
      data: recolecciones,
      filtros: filtros
    });

  } catch (error) {
    console.error('Error listando recolecciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar recolecciones',
      details: error.message
    });
  }
});

/**
 * GET /api/recolecciones/buscar/:termino
 * Búsqueda rápida por tracking o nombre
 */
router.get('/buscar/:termino', async (req, res) => {
  try {
    const { termino } = req.params;

    const recolecciones = await Recoleccion.buscarPorTermino(termino);

    res.json({
      success: true,
      data: recolecciones,
      count: recolecciones.length
    });

  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({
      success: false,
      error: 'Error en búsqueda',
      details: error.message
    });
  }
});

/**
 * GET /api/recolecciones/estadisticas/:recolector_id
 * Obtener estadísticas de un recolector
 */
router.get('/estadisticas/:recolector_id', async (req, res) => {
  try {
    const { recolector_id } = req.params;

    const estadisticas = await Recoleccion.obtenerEstadisticasRecolector(recolector_id);

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
});

/**
 * GET /api/recolecciones/recolector/:recolectorId
 * Listar recolecciones de un recolector específico
 */
router.get('/recolector/:recolectorId', async (req, res) => {
  try {
    const { recolectorId } = req.params;
    const { status, fecha_desde, limit } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (fecha_desde) filters.fecha_desde = fecha_desde;
    if (limit) filters.limit = parseInt(limit);

    const recolecciones = await Recoleccion.listByRecolector(recolectorId, filters);

    res.json({
      success: true,
      count: recolecciones.length,
      data: recolecciones
    });

  } catch (error) {
    console.error('Error listando recolecciones del recolector:', error);
    res.status(500).json({
      success: false,
      error: 'Error al listar recolecciones',
      details: error.message
    });
  }
});

/**
 * GET /api/recolecciones/:trackingNumero
 * Obtener detalle de una recolección por tracking
 */
router.get('/:trackingNumero', async (req, res) => {
  try {
    const { trackingNumero } = req.params;

    const recoleccion = await Recoleccion.getByTracking(trackingNumero);

    if (!recoleccion) {
      return res.status(404).json({ 
        success: false,
        error: 'Recolección no encontrada' 
      });
    }

    res.json({
      success: true,
      data: recoleccion
    });

  } catch (error) {
    console.error('Error obteniendo recolección:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener recolección',
      details: error.message
    });
  }
});

/**
 * POST /api/recolecciones
 * Crear nueva recolección
 */
router.post('/', async (req, res) => {
  try {
    const {
      recolector_id,
      recolector_nombre,
      ubicacion,
      descripcion,
      peso,
      peso_unidad,
      valor_declarado,
      remitente,
      destinatario,
      pago
    } = req.body;

    // Validaciones básicas
    if (!recolector_id || !remitente || !destinatario || !pago) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Crear recolección (sin fotos por ahora)
    const recoleccion = await Recoleccion.create({
      recolector_id,
      recolector_nombre,
      ubicacion: ubicacion || null,
      descripcion,
      peso,
      peso_unidad: peso_unidad || 'lb',
      valor_declarado: valor_declarado || 0,
      fotos: [],
      remitente,
      destinatario,
      pago
    });

    res.status(201).json({
      success: true,
      message: 'Recolección creada exitosamente',
      data: recoleccion
    });

  } catch (error) {
    console.error('Error creando recolección:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear recolección',
      details: error.message
    });
  }
});

/**
 * PATCH /api/recolecciones/:trackingNumero/estado
 * Cambiar estado de una recolección
 */
router.patch('/:trackingNumero/estado', async (req, res) => {
  try {
    const { trackingNumero } = req.params;
    const { nuevo_estado, usuario, notas } = req.body;

    // Estados válidos
    const estadosValidos = [
      'Recolectado',
      'En almacén EE.UU.',
      'En contenedor',
      'En tránsito',
      'En almacén RD',
      'Confirmado',
      'En ruta',
      'Entregado'
    ];

    if (!estadosValidos.includes(nuevo_estado)) {
      return res.status(400).json({
        success: false,
        error: 'Estado inválido',
        estadosValidos: estadosValidos
      });
    }

    const actualizado = await Recoleccion.cambiarEstado(
      trackingNumero, 
      nuevo_estado, 
      usuario, 
      notas
    );

    if (!actualizado) {
      return res.status(404).json({
        success: false,
        error: 'Recolección no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado correctamente',
      data: {
        tracking_numero: trackingNumero,
        nuevo_estado: nuevo_estado
      }
    });

  } catch (error) {
    console.error('Error cambiando estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cambiar estado',
      details: error.message
    });
  }
});

/**
 * PATCH /api/recolecciones/:trackingNumero/status
 * Actualizar status de una recolección (método alternativo)
 */
router.patch('/:trackingNumero/status', async (req, res) => {
  try {
    const { trackingNumero } = req.params;
    const { status, usuario, notas, contenedor_id } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false,
        error: 'Status es requerido' 
      });
    }

    // Validar status válidos
    const statusValidos = [
      'Recolectado',
      'En almacén EE.UU.',
      'En contenedor',
      'En tránsito',
      'En almacén RD',
      'Confirmado',
      'En ruta',
      'Entregado'
    ];

    if (!statusValidos.includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Status inválido' 
      });
    }

    await Recoleccion.updateStatus(trackingNumero, status, {
      usuario,
      notas,
      contenedor_id
    });

    res.json({
      success: true,
      message: 'Status actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando status:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar status',
      details: error.message
    });
  }
});

/**
 * POST /api/recolecciones/:trackingNumero/fotos
 * Subir fotos de una recolección
 */
router.post('/:trackingNumero/fotos', upload.array('fotos', 5), async (req, res) => {
  try {
    const { trackingNumero } = req.params;

    // Verificar que la recolección existe
    const recoleccion = await Recoleccion.getByTracking(trackingNumero);
    if (!recoleccion) {
      return res.status(404).json({ 
        success: false,
        error: 'Recolección no encontrada' 
      });
    }

    // Verificar que se subieron archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No se recibieron archivos' 
      });
    }

    const fotosUrls = [];

    // Procesar cada foto
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      // Comprimir imagen
      const compressedBuffer = await ImageCompression.compress(file.buffer);
      
      // Nombre del archivo en Storage
      const fileName = `${trackingNumero}_${Date.now()}_${i}.jpg`;
      const filePath = `recolecciones/${trackingNumero}/${fileName}`;
      
      // Subir a Firebase Storage
      const fileUpload = storage.file(filePath);
      await fileUpload.save(compressedBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          metadata: {
            tracking: trackingNumero,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Hacer el archivo público
      await fileUpload.makePublic();

      // Obtener URL pública
      const publicUrl = `https://storage.googleapis.com/${storage.name}/${filePath}`;
      fotosUrls.push(publicUrl);
    }

    // Agregar URLs a la recolección
    await Recoleccion.agregarFotos(trackingNumero, fotosUrls);

    res.json({
      success: true,
      message: `${fotosUrls.length} foto(s) subida(s) exitosamente`,
      fotos: fotosUrls
    });

  } catch (error) {
    console.error('Error subiendo fotos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al subir fotos',
      details: error.message
    });
  }
});

export default router;