// backend/src/routes/embarques.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { db } from '../config/firebase.js';

const router = express.Router();

router.use(verifyToken);

// ============================================
// ENDPOINT: Stats para Almacén
// ============================================
router.get('/stats-almacen', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    // Stats de embarques activos
    const embarquesSnapshot = await db.collection('embarques')
      .where('companyId', '==', userData.companyId)
      .where('estado', '==', 'activo')
      .get();
    
    const embarquesActivos = embarquesSnapshot.size;

    // Stats de rutas creadas
    let rutasCreadas = 0;
    try {
      const rutasSnapshot = await db.collection('rutas')
        .where('companyId', '==', userData.companyId)
        .get();
      rutasCreadas = rutasSnapshot.size;
    } catch (error) {
      console.log('No hay rutas');
    }

    // Stats de facturas no entregadas
    let facturasNoEntregadas = 0;
    let facturasListasParaRuta = 0;
    try {
      const facturasSnapshot = await db.collection('facturas')
        .where('companyId', '==', userData.companyId)
        .get();
      
      facturasSnapshot.forEach(doc => {
        const factura = doc.data();
        if (factura.estado === 'no_entregada') {
          facturasNoEntregadas++;
        } else if (factura.estado === 'confirmada' && !factura.ruta_id) {
          facturasListasParaRuta++;
        }
      });
    } catch (error) {
      console.log('No hay facturas');
    }

    res.json({
      embarquesActivos,
      rutasCreadas,
      facturasNoEntregadas,
      facturasListasParaRuta
    });
  } catch (error) {
    console.error('Error en stats-almacen:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de almacén' });
  }
});

// ============================================
// ENDPOINT: GET /api/embarques
// ============================================
router.get('/', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Usuario no encontrado en la base de datos' });
    }

    let query = db.collection('embarques');

    if (userData.rol !== 'super_admin') {
      if (!userData.companyId) {
        return res.status(403).json({ error: 'Usuario sin compañía asignada' });
      }
      query = query.where('companyId', '==', userData.companyId);
    }

    const { estado, limit = 100 } = req.query;

    if (estado) {
      query = query.where('estado', '==', estado);
    }

    // ✅ SIN orderBy para evitar problemas de índices
    const snapshot = await query.limit(parseInt(limit)).get();
    
    const embarques = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      embarques.push({
        id: doc.id,
        nombre: data.nombre,
        descripcion: data.descripcion,
        estado: data.estado || 'activo',
        fechaCreacion: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        companyId: data.companyId,
        totalFacturas: data.totalFacturas || 0,
        facturasEntregadas: data.facturasEntregadas || 0,
        porcentajeCompletado: data.porcentajeCompletado || 0
      });
    });

    // Ordenar en memoria (más simple)
    embarques.sort((a, b) => {
      const dateA = a.fechaCreacion ? new Date(a.fechaCreacion) : new Date(0);
      const dateB = b.fechaCreacion ? new Date(b.fechaCreacion) : new Date(0);
      return dateB - dateA;
    });

    res.json({ embarques });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Error al obtener embarques' });
  }
});

// ============================================
// ENDPOINT: GET /api/embarques/:id
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    const embarqueDoc = await db.collection('embarques').doc(id).get();
    
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    res.json({ id: embarqueDoc.id, ...embarqueData });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener embarque' });
  }
});

// ============================================
// ENDPOINT: POST /api/embarques
// ============================================
router.post('/', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    if (userData.rol !== 'admin' && userData.rol !== 'admin_general' && userData.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo administradores pueden crear embarques' });
    }

    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre del embarque es requerido' });
    }

    const embarqueData = {
      nombre,
      descripcion: descripcion || '',
      companyId: userData.companyId,
      estado: 'activo',
      createdAt: new Date(),
      totalFacturas: 0,
      facturasEntregadas: 0,
      porcentajeCompletado: 0,
      creadoPor: req.user.uid
    };
    
    const docRef = await db.collection('embarques').add(embarqueData);
    
    res.status(201).json({
      id: docRef.id,
      ...embarqueData,
      message: 'Embarque creado exitosamente'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear embarque' });
  }
});

// ============================================
// ENDPOINT: PUT /api/embarques/:id
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'admin' && userData.rol !== 'admin_general' && userData.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo administradores pueden actualizar embarques' });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      actualizadoPor: req.user.uid
    };
    
    await db.collection('embarques').doc(id).update(updateData);
    
    res.json({ message: 'Embarque actualizado exitosamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar embarque' });
  }
});

// ============================================
// ENDPOINT: DELETE /api/embarques/:id
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'admin' && userData.rol !== 'admin_general' && userData.rol !== 'super_admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar embarques' });
    }

    await db.collection('embarques').doc(id).update({
      estado: 'inactivo',
      fechaEliminacion: new Date(),
      eliminadoPor: req.user.uid
    });
    
    res.json({ message: 'Embarque eliminado exitosamente' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al eliminar embarque' });
  }
});

export default router;