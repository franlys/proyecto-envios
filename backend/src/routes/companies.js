// backend/src/routes/companies.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/companies - Obtener todas las compañías (solo super_admin)
router.get('/', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Solo super administradores pueden ver todas las compañías' 
      });
    }

    const snapshot = await db.collection('companies').get();
    const companies = [];
    
    snapshot.forEach(doc => {
      companies.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ Compañías encontradas: ${companies.length}`);
    res.json(companies);
    
  } catch (error) {
    console.error('Error obteniendo compañías:', error);
    res.status(500).json({ error: 'Error al obtener compañías' });
  }
});

// GET /api/companies/my-limits - Límites del plan de la compañía del usuario
router.get('/my-limits', async (req, res) => {
  try {
    console.log('👤 Usuario autenticado:', req.user?.uid);
    
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    console.log('📊 UserData:', userData);

    if (!userData) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si es super_admin, devolver límites ilimitados
    if (userData.rol === 'super_admin') {
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
      return res.json(limits);
    }

    if (!userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    // Obtener datos de la compañía
    const companyDoc = await db.collection('companies').doc(userData.companyId).get();
    if (!companyDoc.exists) {
      return res.status(404).json({ error: 'Compañía no encontrada' });
    }

    const companyData = companyDoc.data();
    
    // Contar usuarios de la compañía
    const usuariosSnapshot = await db.collection('usuarios')
      .where('companyId', '==', userData.companyId)
      .where('activo', '==', true)
      .get();
    
    // Contar rutas activas
    const rutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', userData.companyId)
      .where('estado', '==', 'activa')
      .get();
    
    // Contar facturas del mes sin filtro de fecha en query
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const facturasSnapshot = await db.collection('facturas')
      .where('companyId', '==', userData.companyId)
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
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error en my-limits:', error);
    res.status(500).json({ error: 'Error al obtener límites: ' + error.message });
  }
});

// ✅ NUEVA RUTA: GET /api/companies/:id - Obtener compañía específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    // Verificar permisos: super_admin puede ver todas, usuarios solo su compañía
    if (userData.rol !== 'super_admin' && userData.companyId !== id) {
      return res.status(403).json({ 
        error: 'No tienes acceso a esta compañía' 
      });
    }

    const companyDoc = await db.collection('companies').doc(id).get();
    
    if (!companyDoc.exists) {
      return res.status(404).json({ error: 'Compañía no encontrada' });
    }

    const companyData = companyDoc.data();
    
    res.json({
      id: companyDoc.id,
      nombre: companyData.nombre,
      plan: companyData.plan,
      activo: companyData.activo,
      fechaCreacion: companyData.fechaCreacion
    });
    
  } catch (error) {
    console.error('Error obteniendo compañía:', error);
    res.status(500).json({ error: 'Error al obtener compañía' });
  }
});

// POST /api/companies - Crear nueva compañía (solo super_admin)
router.post('/', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin') {
      return res.status(403).json({ 
        error: 'Solo super administradores pueden crear compañías' 
      });
    }

    const { nombre, plan, adminEmail, adminNombre } = req.body;
    
    if (!nombre || !plan || !adminEmail || !adminNombre) {
      return res.status(400).json({ 
        error: 'Nombre, plan, email y nombre del admin son requeridos' 
      });
    }

    const companyData = {
      nombre,
      plan,
      activo: true,
      fechaCreacion: new Date()
    };
    
    const companyRef = await db.collection('companies').add(companyData);
    
    const adminData = {
      email: adminEmail,
      nombre: adminNombre,
      rol: 'admin',
      companyId: companyRef.id,
      activo: true,
      fechaCreacion: new Date(),
      createdBy: req.user.uid
    };
    
    await db.collection('usuarios').add(adminData);
    
    res.status(201).json({
      id: companyRef.id,
      ...companyData,
      message: 'Compañía y admin creados exitosamente'
    });
    
  } catch (error) {
    console.error('Error creando compañía:', error);
    res.status(500).json({ error: 'Error al crear compañía' });
  }
});

export default router;