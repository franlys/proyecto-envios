// backend/src/routes/rutas.js
import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

// ✅ IMPORTAR NUEVOS CONTROLADORES
import {
  getRepartidoresDisponibles,
  getCargadoresDisponibles,
  getFacturasDisponibles,
  crearRutaAvanzada,
  getContenedoresDisponibles // ✅ 1. Importar la nueva función
} from '../controllers/rutasAvanzadasController.js';

const router = express.Router();
router.use(verifyToken);

// ============================================
// ✅ NUEVAS RUTAS PARA SISTEMA AVANZADO
// ============================================

/**
 * GET /api/rutas/repartidores-disponibles
 * Obtener repartidores activos de la compañía
 */
router.get('/repartidores-disponibles', getRepartidoresDisponibles);

/**
 * GET /api/rutas/cargadores-disponibles
 * Obtener cargadores activos de la compañía
 */
router.get('/cargadores-disponibles', getCargadoresDisponibles);

/**
 * GET /api/rutas/contenedores-disponibles
 * Obtener contenedores que tienen facturas confirmadas por secretaría
 */
router.get('/contenedores-disponibles', getContenedoresDisponibles); // ✅ 2. Añadir la nueva ruta


/**
 * GET /api/rutas/facturas-disponibles
 * Obtener facturas en estado "confirmada_secretaria" sin ruta asignada
 * Acepta ?contenedorId=... para filtrar
 */
router.get('/facturas-disponibles', getFacturasDisponibles);

/**
 * POST /api/rutas/crear-avanzada
 * Crear ruta con sistema LIFO y orden de carga/entrega
 */
router.post('/crear-avanzada', crearRutaAvanzada);

// ============================================
// RUTAS EXISTENTES (mantener compatibilidad)
// ============================================

/**
 * GET /api/rutas/stats-repartidor
 * Estadísticas para repartidor
 */
router.get('/stats-repartidor', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userData.companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'Usuario sin compañía asignada' 
      });
    }

    let query = db.collection('rutas')
      .where('companyId', '==', userData.companyId);

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

      if (estado === 'en_proceso' || estado === 'activa' || estado === 'asignada') {
        rutasActivas++;
      } else if (estado === 'completada') {
        rutasCompletadas++;
      } else if (estado === 'pendiente') {
        rutasPendientes++;
      }

      facturasEntregadas += ruta.facturasEntregadas || 0;
      facturasPendientes += (ruta.totalFacturas || 0) - (ruta.facturasEntregadas || 0);
    });

    res.json({
      success: true,
      data: {
        rutasActivas,
        rutasCompletadas,
        rutasPendientes,
        facturasEntregadas,
        facturasPendientes,
        totalRutas: snapshot.size
      }
    });
  } catch (error) {
    console.error('Error en stats-repartidor:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estadísticas de repartidor' 
    });
  }
});

/**
 * GET /api/rutas
 * Obtener todas las rutas
 */
router.get('/', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('rutas');

    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const rutasSnapshot = await query.limit(50).get();

    const rutas = [];
    
    for (const doc of rutasSnapshot.docs) {
      const rutaData = doc.data();
      
      let empleadoData = null;
      if (rutaData.repartidorId) { // Priorizar repartidorId del nuevo sistema
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.repartidorId).get();
        empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
      } else if (rutaData.empleadoId) { // Fallback al sistema antiguo
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
        empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
      }

      // Contar facturas (simplificado)
      const totalFacturas = rutaData.totalFacturas || (Array.isArray(rutaData.facturas) ? rutaData.facturas.length : 0);
      const facturasEntregadas = rutaData.facturasEntregadas || 0;

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
        empleadoNombre: empleadoData?.nombre || rutaData.repartidorNombre || 'Sin asignar',
        totalFacturas: totalFacturas,
        facturasEntregadas: facturasEntregadas,
        facturasNoEntregadas: totalFacturas - facturasEntregadas, // Cálculo simple
        totalGastos,
        montoAsignado: rutaData.montoAsignado || 0
      });
    }

    rutas.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    res.json({
      success: true,
      data: rutas
    });
  } catch (error) {
    console.error('Error al obtener rutas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener rutas' 
    });
  }
});

/**
 * GET /api/rutas/activas
 * Obtener solo rutas activas
 */
router.get('/activas', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('rutas')
      .where('estado', 'in', ['pendiente', 'en_proceso', 'asignada']);

    const rutasSnapshot = await query.limit(50).get();

    const rutas = [];
    
    for (const doc of rutasSnapshot.docs) {
      const rutaData = doc.data();
      
      if (userData.rol !== 'super_admin' && userData.companyId && rutaData.companyId !== userData.companyId) {
        continue;
      }
      
      let empleadoData = null;
      if (rutaData.repartidorId) {
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.repartidorId).get();
        empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
      } else if (rutaData.empleadoId) {
        const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
        empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
      }
      
      const totalFacturas = rutaData.totalFacturas || (Array.isArray(rutaData.facturas) ? rutaData.facturas.length : 0);
      const facturasEntregadas = rutaData.facturasEntregadas || 0;

      rutas.push({
        id: doc.id,
        nombre: rutaData.nombre,
        empleadoNombre: empleadoData?.nombre || rutaData.repartidorNombre || 'Sin asignar',
        totalFacturas: totalFacturas,
        facturasEntregadas: facturasEntregadas,
        estado: rutaData.estado
      });
    }

    res.json({
      success: true,
      data: rutas
    });
  } catch (error) {
    console.error('Error al obtener rutas activas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener rutas activas' 
    });
  }
});

/**
 * POST /api/rutas
 * Crear nueva ruta (método anterior, mantener compatibilidad)
 */
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
        success: false,
        error: 'Faltan datos requeridos' 
      });
    }

    if (!montoAsignado || parseFloat(montoAsignado) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'El monto asignado debe ser mayor a 0' 
      });
    }

    const embarqueDoc = await db.collection('embarques').doc(embarqueId).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Embarque no encontrado' 
      });
    }
    const embarqueData = embarqueDoc.data();

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'No tienes acceso a este embarque' 
      });
    }

    const empleadoDoc = await db.collection('usuarios').doc(empleadoId).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Empleado no encontrado' 
      });
    }

    const nuevaRuta = {
      nombre: nombre || `Ruta ${new Date().toLocaleDateString()}`,
      embarqueId,
      empleadoId, // Guardado por compatibilidad
      repartidorId: empleadoId, // Guardado para nuevo sistema
      repartidorNombre: empleadoDoc.data().nombre,
      companyId: embarqueData.companyId,
      estado: 'pendiente',
      montoAsignado: parseFloat(montoAsignado),
      totalFacturas: facturasIds.length,
      facturasEntregadas: 0,
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
      success: true,
      message: 'Ruta creada exitosamente',
      data: {
        id: rutaRef.id,
        ...nuevaRuta
      }
    });

  } catch (error) {
    console.error('Error al crear ruta:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al crear la ruta' 
    });
  }
});

/**
 * GET /api/rutas/:id
 * Obtener detalle de una ruta
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const rutaDoc = await db.collection('rutas').doc(id).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Ruta no encontrada' 
      });
    }

    const rutaData = rutaDoc.data();

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && rutaData.companyId !== userData.companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'No tienes acceso a esta ruta' 
      });
    }

    let empleadoData = null;
    const repartidorId = rutaData.repartidorId || rutaData.empleadoId;
    if (repartidorId) {
      const empleadoDoc = await db.collection('usuarios').doc(repartidorId).get();
      empleadoData = empleadoDoc.exists ? empleadoDoc.data() : null;
    }

    // Determinar la colección de facturas (nueva vs antigua)
    const esRutaAntigua = !!rutaData.embarqueId;
    const facturasCollection = esRutaAntigua ? 'facturas' : 'recolecciones';

    const facturasSnapshot = await db.collection(facturasCollection)
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
    
    // Sobrescribir facturas si están en el modelo nuevo
    if (Array.isArray(rutaData.facturas) && rutaData.facturas.length > 0 && facturas.length === 0) {
      const facturasPromises = rutaData.facturas.map(f => 
        db.collection('recolecciones').doc(f.facturaId).get()
      );
      const facturasDocs = await Promise.all(facturasPromises);
      facturasDocs.forEach(doc => {
        if(doc.exists) facturas.push({ id: doc.id, ...doc.data() });
      });
    }

    res.json({
      success: true,
      data: {
        id,
        ...rutaData,
        empleado: empleadoData,
        facturas,
        gastos,
        totalGastos,
        balance: (rutaData.montoAsignado || 0) - totalGastos
      }
    });

  } catch (error) {
    console.error('Error al obtener detalle de ruta:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener detalle de la ruta' 
    });
  }
});

/**
 * PUT /api/rutas/:id/cerrar
 * Cierra una ruta y libera las facturas no entregadas
 */
router.put('/:id/cerrar', async (req, res) => {
  try {
    const { id: rutaId } = req.params;
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    const rutaRef = db.collection('rutas').doc(rutaId);
    const rutaDoc = await rutaRef.get();

    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();

    // Validar permisos
    if (userData.rol !== 'super_admin' && rutaData.companyId !== userData.companyId) {
      return res.status(403).json({ success: false, error: 'No tienes acceso a esta ruta' });
    }

    // Determinar la colección de facturas (nueva vs antigua)
    const esRutaAntigua = !!rutaData.embarqueId;
    const facturasCollection = esRutaAntigua ? 'facturas' : 'recolecciones';

    const facturasSnapshot = await db.collection(facturasCollection)
      .where('rutaId', '==', rutaId)
      .get();

    const batch = db.batch();
    let facturasNoEntregadas = 0;

    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      // Si no está entregada, se marca como no_entregado y se quita de la ruta
      if (factura.estado !== 'entregado') {
        facturasNoEntregadas++;
        batch.update(doc.ref, {
          estado: 'no_entregado',
          rutaId: null,
          empleadoId: null,
          rutaNombre: null,
          repartidorId: null,
          repartidorNombre: null,
          ordenCarga: null,
          ordenEntrega: null,
          updatedAt: new Date()
        });
      }
    });

    // Actualizar la ruta
    batch.update(rutaRef, {
      estado: 'completada',
      updatedAt: new Date(),
      facturasNoEntregadas: facturasNoEntregadas,
      historial: FieldValue.arrayUnion({
        accion: 'cerrar_ruta',
        descripcion: `Ruta cerrada por ${userData.nombre}. ${facturasNoEntregadas} facturas no entregadas.`,
        usuario: req.user.uid,
        fecha: new Date().toISOString()
      })
    });

    await batch.commit();

    res.json({
      success: true,
      message: `Ruta cerrada. ${facturasNoEntregadas} facturas marcadas como no entregadas.`
    });

  } catch (error) {
    console.error('Error al cerrar ruta:', error);
    res.status(500).json({ success: false, error: 'Error al cerrar la ruta' });
  }
});


export default router;