import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// Helper para obtener ID de compañía de forma segura
const getUserDataSafe = async (uid) => {
  const userDoc = await db.collection('usuarios').doc(uid).get();
  if (!userDoc.exists) return null;
  return userDoc.data();
};

// ============================================================
// 📋 OBTENER TODAS LAS RUTAS (Con protección de fallo)
// ============================================================
export const getAllRutas = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.user.uid);
    if (!userData || !userData.companyId) {
      console.warn(`Usuario ${req.user.uid} sin compañía o no existe en BD.`);
      return res.json({ success: true, data: [] });
    }

    let query = db.collection('rutas');

    if (userData.rol !== 'super_admin') {
      query = query.where('companyId', '==', userData.companyId);
    }

    // Intentamos consulta ordenada
    try {
      const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
      const rutas = procesarRutasSnapshot(snapshot);
      return res.json({ success: true, data: rutas });
    } catch (indexError) {
      console.warn("⚠️ Falta índice para ordenar rutas. Usando consulta simple.", indexError.message);
      // Fallback: Consulta sin ordenamiento (evita error 500)
      const snapshot = await query.limit(50).get();
      const rutas = procesarRutasSnapshot(snapshot);
      // Ordenar manualmente en memoria
      rutas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, data: rutas });
    }
  } catch (error) {
    console.error('❌ Error crítico en getAllRutas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Función auxiliar para procesar rutas de forma segura
const procesarRutasSnapshot = (snapshot) => {
  return snapshot.docs.map(doc => {
    const data = doc.data();
    const totalFacturas = data.totalFacturas || (data.facturas ? data.facturas.length : 0);
    const facturasEntregadas = data.facturasEntregadas || 0;
    return {
      id: doc.id,
      ...data,
      totalFacturas,
      facturasEntregadas,
      facturasNoEntregadas: totalFacturas - facturasEntregadas,
      totalGastos: data.totalGastos || 0,
      empleadoNombre: data.repartidorNombre || data.empleadoNombre || 'Sin asignar',
      montoAsignado: data.montoAsignado || 0
    };
  });
};

// ============================================================
// 🚚 CREAR RUTA AVANZADA (Con validación robusta)
// ============================================================
export const createRutaAvanzada = async (req, res) => {
  try {
    const { 
      nombre, repartidorId, cargadoresIds, facturasIds,   
      configuracion, montoAsignado
    } = req.body;

    if (!repartidorId || !cargadoresIds?.length || !facturasIds?.length) {
      return res.status(400).json({ success: false, error: 'Faltan datos (repartidor, cargadores o facturas)' });
    }

    const userData = await getUserDataSafe(req.user.uid);
    if (!userData?.companyId) return res.status(403).json({ error: 'Usuario sin compañía asignada' });

    // Obtener facturas
    const facturasSnapshot = await db.collection('recolecciones')
      .where('__name__', 'in', facturasIds)
      .get();

    const facturasParaRuta = [];
    let totalItems = 0;
    
    facturasSnapshot.forEach(doc => {
      const f = doc.data();
      const items = f.items || [];
      totalItems += items.length;

      facturasParaRuta.push({
        id: doc.id,
        facturaId: doc.id,
        codigoTracking: f.codigoTracking || f.numeroFactura || 'S/N',
        cliente: f.cliente || f.destinatario?.nombre || 'Cliente',
        direccion: f.direccion || f.destinatario?.direccion || '',
        zona: f.zona || '',
        sector: f.sector || '',
        items: items,
        itemsCargados: 0,
        itemsTotal: items.length,
        itemsCargadosIndices: [],
        estadoCarga: 'pendiente',
        estado: 'asignado'
      });
    });

    const repDoc = await db.collection('usuarios').doc(repartidorId).get();
    const repNombre = repDoc.exists ? repDoc.data().nombre : 'Repartidor';

    const nuevaRuta = {
      nombre: nombre || `Ruta ${new Date().toLocaleDateString()}`,
      companyId: userData.companyId,
      creadoPor: req.user.uid,
      repartidorId,
      repartidorNombre: repNombre,
      empleadoId: repartidorId,
      empleadoNombre: repNombre,
      cargadoresIds,
      cargadorId: cargadoresIds[0],
      facturas: facturasParaRuta,
      facturasIds,
      totalFacturas: facturasIds.length,
      facturasEntregadas: 0,
      montoAsignado: parseFloat(montoAsignado || 0),
      totalGastos: 0,
      itemsTotalRuta: totalItems,
      itemsCargadosRuta: 0,
      estado: 'asignada',
      configuracion: configuracion || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('rutas').add(nuevaRuta);

    const batch = db.batch();
    facturasSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        estado: 'asignada',
        rutaId: docRef.id,
        repartidorId,
        repartidorNombre: repNombre,
        fechaAsignacionRuta: new Date().toISOString()
      });
    });
    await batch.commit();

    res.status(201).json({ success: true, message: 'Ruta creada', data: { id: docRef.id, ...nuevaRuta } });
  } catch (error) {
    console.error('Error creating ruta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 🔍 DETALLE DE RUTA
// ============================================================
export const getRutaById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('rutas').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Ruta no encontrada' });
    
    const rutaData = doc.data();
    const gastosSnap = await db.collection('gastos').where('rutaId', '==', id).get();
    
    let totalGastos = 0;
    const gastos = [];
    gastosSnap.forEach(g => {
      const d = g.data();
      totalGastos += (d.monto || 0);
      gastos.push({ id: g.id, ...d });
    });

    res.json({ success: true, data: { id: doc.id, ...rutaData, gastos, totalGastos, balance: (rutaData.montoAsignado || 0) - totalGastos } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 🛠️ RECURSOS (Solución Error 500 Contenedores)
// ============================================================

export const getContenedoresDisponibles = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.user.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    try {
      // Intento 1: Consulta Óptima (Requiere Índice)
      const snapshot = await db.collection('contenedores')
        .where('companyId', '==', userData.companyId)
        .where('estado', 'in', ['abierto', 'en_proceso', 'cerrado'])
        .orderBy('fechaCreacion', 'desc')
        .limit(20)
        .get();
      res.json({ success: true, data: snapshot.docs.map(d => ({id: d.id, ...d.data()})) });
    } catch (indexError) {
      console.warn("⚠️ Error índices Contenedores. Usando fallback simple.", indexError.message);
      // Intento 2: Consulta Simple (Sin Ordenar)
      const snapshot = await db.collection('contenedores')
        .where('companyId', '==', userData.companyId)
        .where('estado', 'in', ['abierto', 'en_proceso', 'cerrado'])
        .limit(20)
        .get();
      
      // Ordenar en memoria
      const data = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      data.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
      
      res.json({ success: true, data });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getFacturasDisponibles = async (req, res) => {
  try {
    const { contenedorId } = req.query;
    const userData = await getUserDataSafe(req.user.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    let query = db.collection('recolecciones')
      .where('companyId', '==', userData.companyId)
      .where('estado', 'in', ['confirmada', 'confirmada_secretaria', 'pendiente_ruta']);
    
    if (contenedorId) query = query.where('contenedorId', '==', contenedorId);
    
    const snapshot = await query.limit(100).get();
    res.json({ success: true, data: snapshot.docs.map(d => ({id: d.id, ...d.data()})) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getRepartidoresDisponibles = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.user.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    const snap = await db.collection('usuarios')
      .where('companyId', '==', userData.companyId)
      .where('rol', '==', 'repartidor')
      .where('activo', '==', true).get();
    res.json({ success: true, data: snap.docs.map(d => ({id: d.id, ...d.data()})) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getCargadoresDisponibles = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.user.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    const snap = await db.collection('usuarios')
      .where('companyId', '==', userData.companyId)
      .where('rol', '==', 'cargador')
      .where('activo', '==', true).get();
    res.json({ success: true, data: snap.docs.map(d => ({id: d.id, ...d.data()})) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Auxiliares
export const cerrarRuta = async (req, res) => {
    try {
        await db.collection('rutas').doc(req.params.id).update({
            estado: 'completada', fechaCierre: new Date().toISOString()
        });
        res.json({ success: true });
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updateEntrega = async (req, res) => res.json({msg: 'ok'});
export const finalizarRuta = async (req, res) => res.json({msg: 'ok'});
export const getStatsRepartidor = async (req, res) => res.json({success: true, data: {}});
export const getRutasActivas = async (req, res) => getAllRutas(req, res);
export const createRuta = async (req, res) => createRutaAvanzada(req, res);