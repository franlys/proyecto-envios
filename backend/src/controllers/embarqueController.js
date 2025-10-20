import { db } from '../config/firebase.js';

// Crear embarque
export const createEmbarque = async (req, res) => {
  try {
    const { nombre, descripcion, fechaCreacion } = req.body;

    // ← NUEVO: Obtener companyId del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    const embarqueData = {
      nombre,
      descripcion: descripcion || '',
      fechaCreacion: fechaCreacion || new Date().toISOString(),
      estado: 'activo',
      totalFacturas: 0,
      facturasEntregadas: 0,
      companyId: userData.companyId || null, // ← NUEVO: Asignar compañía
      createdBy: req.user.uid,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('embarques').add(embarqueData);

    res.status(201).json({
      message: 'Embarque creado exitosamente',
      id: docRef.id,
      ...embarqueData
    });
  } catch (error) {
    console.error('Error creando embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los embarques
export const getAllEmbarques = async (req, res) => {
  try {
    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('embarques');

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .get();
    
    const embarques = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(embarques);
  } catch (error) {
    console.error('Error obteniendo embarques:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener embarque por ID
export const getEmbarqueById = async (req, res) => {
  try {
    const { id } = req.params;
    const embarqueDoc = await db.collection('embarques').doc(id).get();
    
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    // Si NO es super_admin, verificar que sea de su compañía
    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    // Obtener facturas del embarque
    const facturasSnapshot = await db.collection('facturas')
      .where('embarqueId', '==', id)
      .get();
    
    const facturas = facturasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      id: embarqueDoc.id,
      ...embarqueData,
      facturas
    });
  } catch (error) {
    console.error('Error obteniendo embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar embarque
export const updateEmbarque = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;
    
    // ← NUEVO: Verificar permisos
    const embarqueDoc = await db.collection('embarques').doc(id).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (estado !== undefined) updates.estado = estado;
    updates.updatedAt = new Date().toISOString();

    await db.collection('embarques').doc(id).update(updates);

    res.json({ message: 'Embarque actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar embarque
export const deleteEmbarque = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ← NUEVO: Verificar permisos
    const embarqueDoc = await db.collection('embarques').doc(id).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    // Eliminar facturas asociadas
    const facturasSnapshot = await db.collection('facturas')
      .where('embarqueId', '==', id)
      .get();
    
    const batch = db.batch();
    facturasSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Eliminar embarque
    batch.delete(db.collection('embarques').doc(id));
    
    await batch.commit();

    res.json({ message: 'Embarque eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Importar facturas (desde CSV o manualmente)
export const importFacturas = async (req, res) => {
  try {
    const { embarqueId, facturas } = req.body;

    if (!facturas || !Array.isArray(facturas)) {
      return res.status(400).json({ error: 'Facturas debe ser un array' });
    }

    // ← NUEVO: Verificar permisos sobre el embarque
    const embarqueDoc = await db.collection('embarques').doc(embarqueId).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    const batch = db.batch();
    let count = 0;

    for (const factura of facturas) {
      const facturaRef = db.collection('facturas').doc();
      batch.set(facturaRef, {
        embarqueId,
        companyId: embarqueData.companyId, // ← NUEVO: Heredar companyId del embarque
        numeroFactura: factura.numeroFactura,
        cliente: factura.cliente,
        direccion: factura.direccion,
        telefono: factura.telefono || '',
        monto: factura.monto || 0,
        observaciones: factura.observaciones || '',
        sector: factura.sector || '',
        zona: factura.zona || 'capital',
        estado: 'sin_confirmar',
        estadoPago: 'pago_recibir',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      count++;
    }

    // Actualizar contador de facturas en embarque
    batch.update(db.collection('embarques').doc(embarqueId), {
      totalFacturas: count,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();

    res.json({ 
      message: `${count} facturas importadas exitosamente`,
      count 
    });
  } catch (error) {
    console.error('Error importando facturas:', error);
    res.status(500).json({ error: error.message });
  }
};