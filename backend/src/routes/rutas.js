// backend/src/routes/rutas.js
import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
router.use(verifyToken);

// ============================================
// GET - Estadísticas para Repartidor
// ============================================
router.get('/stats-repartidor', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    // Base query
    let query = db.collection('rutas')
      .where('companyId', '==', userData.companyId);

    // Si es repartidor, filtrar por su ID
    if (userData.rol === 'repartidor') {
      query = query.where('empleadoId', '==', req.user.uid);
    }

    const snapshot = await query.get();

    let rutasActivas = 0;
    let rutasCompletadas = 0;
    let rutasPendientes = 0;
    let facturasEntregadas = 0;
    let facturasPendientes = 0;

    snapshot.forEach(doc => {
      const ruta = doc.data();
      const estado = ruta.estado?.toLowerCase() || '';

      if (estado === 'en_proceso' || estado === 'activa') {
        rutasActivas++;
      } else if (estado === 'completada') {
        rutasCompletadas++;
      } else if (estado === 'pendiente') {
        rutasPendientes++;
      }

      // Contar facturas
      facturasEntregadas += ruta.facturasEntregadas || 0;
      facturasPendientes += ruta.facturasPendientes || 0;
    });

    res.json({
      rutasActivas,
      rutasCompletadas,
      rutasPendientes,
      facturasEntregadas,
      facturasPendientes,
      totalRutas: snapshot.size
    });
  } catch (error) {
    console.error('Error en stats-repartidor:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de repartidor' });
  }
});

// ============================================
// GET - Obtener todas las rutas (SIMPLIFICADO - SIN orderBy)
// ============================================
router.get('/', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('rutas');

    // Solo filtrar por companyId, SIN orderBy para evitar índices
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const rutasSnapshot = await query.limit(50).get(); // Límite simple

    const rutas = [];
    
    for (const doc of rutasSnapshot.docs) {
      const rutaData = doc.data();
      
      // Obtener datos del empleado
      let empleadoData = null;
      if (rutaData.empleadoId) {
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
        empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
      }

      // Contar facturas (simplificado)
      const facturasSnapshot = await db.collection('facturas')
        .where('rutaId', '==', doc.id)
        .limit(100)
        .get();

      let facturasEntregadas = 0;
      let facturasNoEntregadas = 0;
      
      facturasSnapshot.forEach(facturaDoc => {
        const factura = facturaDoc.data();
        if (factura.estado === 'entregado') {
          facturasEntregadas++;
        } else if (factura.estado === 'no_entregado') {
          facturasNoEntregadas++;
        }
      });

      // Calcular total de gastos (simplificado)
      const gastosSnapshot = await db.collection('gastos')
        .where('rutaId', '==', doc.id)
        .limit(50)
        .get();

      let totalGastos = 0;
      gastosSnapshot.forEach(gastoDoc => {
        totalGastos += gastoDoc.data().monto || 0;
      });

      rutas.push({
        id: doc.id,
        ...rutaData,
        empleadoNombre: empleadoData?.nombre || 'Sin asignar',
        totalFacturas: facturasSnapshot.size,
        facturasEntregadas,
        facturasNoEntregadas,
        totalGastos,
        montoAsignado: rutaData.montoAsignado || 0
      });
    }

    // Ordenar en memoria después de obtener los datos
    rutas.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA; // Orden descendente
    });

    res.json(rutas);
  } catch (error) {
    console.error('Error al obtener rutas:', error);
    res.status(500).json({ error: 'Error al obtener rutas' });
  }
});

// ============================================
// GET - Obtener solo rutas activas (SIMPLIFICADO)
// ============================================
router.get('/activas', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('rutas')
      .where('estado', 'in', ['pendiente', 'en_proceso']);

    // NO agregar más filtros para evitar índices compuestos
    const rutasSnapshot = await query.limit(50).get();

    const rutas = [];
    
    for (const doc of rutasSnapshot.docs) {
      const rutaData = doc.data();
      
      // Filtrar por compañía en memoria si es necesario
      if (userData.rol !== 'super_admin' && userData.companyId && rutaData.companyId !== userData.companyId) {
        continue;
      }
      
      // Obtener datos del empleado
      let empleadoData = null;
      if (rutaData.empleadoId) {
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
        empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
      }

      // Contar facturas
      const facturasSnapshot = await db.collection('facturas')
        .where('rutaId', '==', doc.id)
        .get();

      let facturasEntregadas = 0;
      facturasSnapshot.forEach(facturaDoc => {
        if (facturaDoc.data().estado === 'entregado') {
          facturasEntregadas++;
        }
      });

      rutas.push({
        id: doc.id,
        nombre: rutaData.nombre,
        empleadoNombre: empleadoData?.nombre || 'Sin asignar',
        totalFacturas: facturasSnapshot.size,
        facturasEntregadas,
        estado: rutaData.estado
      });
    }

    res.json(rutas);
  } catch (error) {
    console.error('Error al obtener rutas activas:', error);
    res.status(500).json({ error: 'Error al obtener rutas activas' });
  }
});

// ============================================
// POST - Crear nueva ruta
// ============================================
router.post('/', async (req, res) => {
  try {
    const { 
      embarqueId, 
      empleadoId, 
      facturasIds, 
      nombre,
      montoAsignado
    } = req.body;

    if (!embarqueId || !empleadoId || !facturasIds || facturasIds.length === 0) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }

    if (!montoAsignado || parseFloat(montoAsignado) <= 0) {
      return res.status(400).json({ 
        error: 'El monto asignado debe ser mayor a 0' 
      });
    }

    const embarqueDoc = await db.collection('embarques').doc(embarqueId).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }
    const embarqueData = embarqueDoc.data();

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    const empleadoDoc = await db.collection('usuarios').doc(empleadoId).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const nuevaRuta = {
      nombre: nombre || `Ruta ${new Date().toLocaleDateString()}`,
      embarqueId,
      empleadoId,
      companyId: embarqueData.companyId,
      estado: 'pendiente',
      montoAsignado: parseFloat(montoAsignado),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const rutaRef = await db.collection('rutas').add(nuevaRuta);

    const batch = db.batch();
    
    for (const facturaId of facturasIds) {
      const facturaRef = db.collection('facturas').doc(facturaId);
      batch.update(facturaRef, {
        rutaId: rutaRef.id,
        estado: 'asignado',
        updatedAt: new Date()
      });
    }

    await batch.commit();

    res.status(201).json({
      id: rutaRef.id,
      ...nuevaRuta,
      message: 'Ruta creada exitosamente'
    });

  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(500).json({ error: 'Error al crear la ruta' });
  }
});

// ============================================
// GET - Obtener detalle de una ruta
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rutaDoc = await db.collection('rutas').doc(id).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && rutaData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a esta ruta' });
    }

    let empleadoData = null;
    if (rutaData.empleadoId) {
      const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
      empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
    }

    const facturasSnapshot = await db.collection('facturas')
      .where('rutaId', '==', id)
      .get();

    const facturas = [];
    facturasSnapshot.forEach(doc => {
      facturas.push({
        id: doc.id,
        ...doc.data()
      });
    });

    const gastosSnapshot = await db.collection('gastos')
      .where('rutaId', '==', id)
      .get();

    const gastos = [];
    let totalGastos = 0;
    gastosSnapshot.forEach(doc => {
      const gasto = { id: doc.id, ...doc.data() };
      gastos.push(gasto);
      totalGastos += gasto.monto || 0;
    });

    res.json({
      id,
      ...rutaData,
      empleado: empleadoData,
      facturas,
      gastos,
      totalGastos,
      balance: (rutaData.montoAsignado || 0) - totalGastos
    });

  } catch (error) {
    console.error('Error al obtener detalle de ruta:', error);
    res.status(500).json({ error: 'Error al obtener detalle de la ruta' });
  }
});

export default router;