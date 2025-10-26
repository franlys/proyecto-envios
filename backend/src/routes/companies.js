// backend/src/routes/companies.js
import express from 'express';
import { verifyToken, checkRole } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(verifyToken);

/**
 * GET /api/companies
 * Obtener todas las compañías
 * - super_admin: ve todas
 * - admin_general: ve solo su compañía
 */
router.get('/', async (req, res) => {
  try {
    let companies = [];

    // Super admin ve todas las compañías
    if (req.userData.rol === 'super_admin') {
      const snapshot = await db.collection('companies').get();
      
      snapshot.forEach(doc => {
        companies.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`✅ Super Admin - ${companies.length} compañías encontradas`);
    } 
    // Admin general solo ve su compañía
    else if (req.userData.companyId) {
      const companyDoc = await db.collection('companies').doc(req.userData.companyId).get();
      
      if (companyDoc.exists) {
        companies.push({
          id: companyDoc.id,
          ...companyDoc.data()
        });
      }

      console.log(`✅ Admin General - Compañía encontrada: ${req.userData.companyId}`);
    }

    res.json({
      success: true,
      count: companies.length,
      data: companies
    });
    
  } catch (error) {
    console.error('Error obteniendo compañías:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener compañías',
      details: error.message
    });
  }
});

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
        plan: 'enterprise',
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
    
    // Contar facturas del mes
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const facturasSnapshot = await db.collection('facturas')
      .where('companyId', '==', req.userData.companyId)
      .get();

    let facturasMesCount = 0;
    facturasSnapshot.forEach(doc => {
      const data = doc.data();
      const fechaCreacion = data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : new Date(data.fechaCreacion || data.createdAt);
      if (fechaCreacion >= startOfMonth) {
        facturasMesCount++;
      }
    });

    // Definir límites por plan
    const planLimits = {
      basic: { usuarios: 5, rutas: 10, facturas_mes: 100 },
      premium: { usuarios: 25, rutas: 50, facturas_mes: 500 },
      enterprise: { usuarios: -1, rutas: -1, facturas_mes: -1 }
    };

    const plan = companyData.plan || 'basic';
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar permisos: super_admin puede ver todas, usuarios solo su compañía
    if (req.userData.rol !== 'super_admin' && req.userData.companyId !== id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes acceso a esta compañía'
      });
    }

    const companyDoc = await db.collection('companies').doc(id).get();
    
    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Compañía no encontrada'
      });
    }

    const companyData = companyDoc.data();
    
    res.json({
      success: true,
      data: {
        id: companyDoc.id,
        nombre: companyData.nombre,
        plan: companyData.plan,
        activo: companyData.activo,
        fechaCreacion: companyData.fechaCreacion
      }
    });
    
  } catch (error) {
    console.error('Error obteniendo compañía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener compañía',
      details: error.message
    });
  }
});

/**
 * POST /api/companies
 * Crear nueva compañía (solo super_admin)
 */
router.post('/', checkRole('super_admin'), async (req, res) => {
  try {
    const { nombre, plan, adminEmail, adminNombre } = req.body;
    
    if (!nombre || !plan || !adminEmail || !adminNombre) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, plan, email y nombre del admin son requeridos'
      });
    }

    const companyData = {
      nombre,
      plan,
      activo: true,
      fechaCreacion: new Date(),
      createdBy: req.userData.uid
    };
    
    const companyRef = await db.collection('companies').add(companyData);
    
    const adminData = {
      email: adminEmail,
      nombre: adminNombre,
      rol: 'admin_general',
      companyId: companyRef.id,
      activo: true,
      fechaCreacion: new Date(),
      createdBy: req.userData.uid
    };
    
    await db.collection('usuarios').add(adminData);
    
    res.status(201).json({
      success: true,
      message: 'Compañía y admin creados exitosamente',
      data: {
        id: companyRef.id,
        ...companyData
      }
    });
    
  } catch (error) {
    console.error('Error creando compañía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear compañía',
      details: error.message
    });
  }
});

/**
 * PATCH /api/companies/:id
 * Actualizar compañía (solo super_admin)
 */
router.patch('/:id', checkRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, plan, activo } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    if (nombre) updateData.nombre = nombre;
    if (plan) updateData.plan = plan;
    if (typeof activo === 'boolean') updateData.activo = activo;

    await db.collection('companies').doc(id).update(updateData);

    res.json({
      success: true,
      message: 'Compañía actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando compañía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar compañía',
      details: error.message
    });
  }
});

/**
 * DELETE /api/companies/:id
 * Eliminar compañía (solo super_admin)
 */
router.delete('/:id', checkRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si hay usuarios asociados
    const usuariosSnapshot = await db.collection('usuarios')
      .where('companyId', '==', id)
      .get();

    if (!usuariosSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una compañía con usuarios asociados',
        usuariosCount: usuariosSnapshot.size
      });
    }

    await db.collection('companies').doc(id).delete();

    res.json({
      success: true,
      message: 'Compañía eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando compañía:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar compañía',
      details: error.message
    });
  }
});

export default router;