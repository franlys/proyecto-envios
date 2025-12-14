// backend/src/routes/companies.js
import express from 'express';
import { verifyToken, checkRole } from '../middleware/auth.js';
import multer from 'multer';
import { db } from '../config/firebase.js';
import {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  toggleCompany,
  resetUserPassword,
  deleteCompany,
  uploadCompanyLogo,
  updateCompanyNCFConfig
} from '../controllers/companyController.js';
import { getReporte606 } from '../controllers/reporteFiscalController.js';

// Configurar multer para almacenar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // Límite de 5MB
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  }
});

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(verifyToken);

/**
 * GET /api/companies
 * Obtener todas las compañías (usa el controlador)
 */
router.get('/', getAllCompanies);

/**
 * GET /api/companies/my-limits
 * Obtener límites del plan de la compañía del usuario
 */
router.get('/my-limits', async (req, res) => {
  try {
    console.log('👤 Usuario:', req.userData.uid, '-', req.userData.rol);

    // Si es super_admin, devolver límites ilimitados
    if (req.userData.rol === 'super_admin') {
      const limits = {
        plan: 'smart',
        usuarios: {
          key: 'Usuarios',
          current: 0,
          limit: -1,
          percentage: 0,
          remaining: -1
        },
        rutas: {
          key: 'Rutas Activas',
          current: 0,
          limit: -1,
          percentage: 0,
          remaining: -1
        },
        facturas_mes: {
          key: 'Facturas del Mes',
          current: 0,
          limit: -1,
          percentage: 0,
          remaining: -1
        }
      };
      return res.json({
        success: true,
        data: limits
      });
    }

    if (!req.userData.companyId) {
      return res.status(403).json({
        success: false,
        error: 'Usuario sin compañía asignada'
      });
    }

    // Obtener datos de la compañía
    const companyDoc = await db.collection('companies').doc(req.userData.companyId).get();
    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Compañía no encontrada'
      });
    }

    const companyData = companyDoc.data();

    // Contar usuarios de la compañía
    const usuariosSnapshot = await db.collection('usuarios')
      .where('companyId', '==', req.userData.companyId)
      .where('activo', '==', true)
      .get();

    // Contar rutas activas
    const rutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', req.userData.companyId)
      .where('estado', '==', 'activa')
      .get();

    // ✅ CORRECCIÓN: Contar recolecciones del mes (no facturas)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const recoleccionesSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', req.userData.companyId)
      .get();

    let facturasMesCount = 0;
    recoleccionesSnapshot.forEach(doc => {
      const data = doc.data();
      const fechaCreacion = data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : new Date(data.fechaCreacion || data.createdAt);
      if (fechaCreacion >= startOfMonth) {
        facturasMesCount++;
      }
    });

    // Definir límites por plan
    const planLimits = {
      operativo: { usuarios: 5, rutas: 10, facturas_mes: 100 },
      automatizado: { usuarios: 25, rutas: 50, facturas_mes: 500 },
      smart: { usuarios: -1, rutas: -1, facturas_mes: -1 }
    };

    const plan = companyData.plan || 'operativo';
    const limits = planLimits[plan];

    const currentCounts = {
      usuarios: usuariosSnapshot.size,
      rutas: rutasSnapshot.size,
      facturas_mes: facturasMesCount
    };

    const result = {
      plan,
      usuarios: {
        key: 'Usuarios',
        current: currentCounts.usuarios,
        limit: limits.usuarios,
        percentage: limits.usuarios === -1 ? 0 : Math.round((currentCounts.usuarios / limits.usuarios) * 100),
        remaining: limits.usuarios === -1 ? -1 : limits.usuarios - currentCounts.usuarios
      },
      rutas: {
        key: 'Rutas Activas',
        current: currentCounts.rutas,
        limit: limits.rutas,
        percentage: limits.rutas === -1 ? 0 : Math.round((currentCounts.rutas / limits.rutas) * 100),
        remaining: limits.rutas === -1 ? -1 : limits.rutas - currentCounts.rutas
      },
      facturas_mes: {
        key: 'Facturas del Mes',
        current: currentCounts.facturas_mes,
        limit: limits.facturas_mes,
        percentage: limits.facturas_mes === -1 ? 0 : Math.round((currentCounts.facturas_mes / limits.facturas_mes) * 100),
        remaining: limits.facturas_mes === -1 ? -1 : limits.facturas_mes - currentCounts.facturas_mes
      }
    };

    console.log('✅ Enviando límites:', result);
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error en my-limits:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener límites',
      details: error.message
    });
  }
});

/**
 * GET /api/companies/:id
 * Obtener compañía específica
 */
router.get('/:id', getCompanyById);

/**
 * POST /api/companies
 * Crear nueva compañía (solo super_admin)
 */
router.post('/', createCompany);

/**
 * PUT /api/companies/:id
 * Actualizar compañía (solo super_admin) - Método PUT
 */
router.put('/:id', updateCompany);

/**
 * PATCH /api/companies/:id/toggle
 * Activar/Desactivar compañía (solo super_admin)
 */
router.patch('/:id/toggle', toggleCompany);

/**
 * DELETE /api/companies/:id
 * Eliminar compañía (solo super_admin)
 */
router.delete('/:id', deleteCompany);

/**
 * POST /api/companies/reset-password
 * Resetear contraseña de usuario (solo super_admin)
 */
router.post('/reset-password', resetUserPassword);

/**
 * POST /api/companies/:id/upload-logo
 * Subir logo de compañía (solo super_admin)
 */
router.post('/:id/upload-logo', upload.single('logo'), uploadCompanyLogo);

// Actualizar configuración fiscal (NCF)
router.put('/:id/ncf-config', updateCompanyNCFConfig);

// Generar Reporte 606
router.get('/:id/reporte-606', getReporte606);

export default router;