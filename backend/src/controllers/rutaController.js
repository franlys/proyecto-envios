import { db } from '../config/firebase.js';

// Crear ruta de entrega
export const createRuta = async (req, res) => {
  try {
    const { embarqueId, empleadoId, facturasIds, nombre, montoAsignado } = req.body;

    if (!embarqueId || !empleadoId || !facturasIds || facturasIds.length === 0) {
      return res.status(400).json({ 
        error: 'Embarque, empleado y facturas son requeridos' 
      });
    }

    // ← NUEVO: Obtener companyId del embarque
    const embarqueDoc = await db.collection('embarques').doc(embarqueId).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }
    const embarqueData = embarqueDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    // Validar que todas las facturas estén confirmadas
    const facturasSnapshot = await db.collection('facturas')
      .where('__name__', 'in', facturasIds)
      .get();

    const facturasNoConfirmadas = [];
    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      if (factura.estado !== 'confirmada') {
        facturasNoConfirmadas.push({
          id: doc.id,
          numero: factura.numeroFactura,
          estado: factura.estado
        });
      }
    });

    if (facturasNoConfirmadas.length > 0) {
      return res.status(400).json({ 
        error: 'Solo se pueden asignar facturas confirmadas',
        facturasNoConfirmadas: facturasNoConfirmadas
      });
    }

    // Obtener información del empleado
    const empleadoDoc = await db.collection('usuarios').doc(empleadoId).get();
    if (!empleadoDoc.exists) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const rutaData = {
      nombre: nombre || `Ruta ${new Date().toLocaleDateString()}`,
      embarqueId,
      empleadoId,
      empleadoNombre: empleadoDoc.data().nombre,
      facturasIds,
      totalFacturas: facturasIds.length,
      facturasEntregadas: 0,
      montoAsignado: montoAsignado || 0,
      totalGastos: 0,
      companyId: embarqueData.companyId, // ← NUEVO: Heredar companyId del embarque
      estado: 'pendiente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('rutas').add(rutaData);

    // Actualizar estado de facturas a "asignado"
    const batch = db.batch();
    for (const facturaId of facturasIds) {
      const facturaRef = db.collection('facturas').doc(facturaId);
      batch.update(facturaRef, {
        rutaId: docRef.id,
        rutaNombre: rutaData.nombre,
        repartidorNombre: rutaData.empleadoNombre,
        estado: 'asignado',
        updatedAt: new Date().toISOString()
      });
    }
    await batch.commit();

    res.status(201).json({
      message: 'Ruta creada exitosamente',
      id: docRef.id,
      ...rutaData
    });
  } catch (error) {
    console.error('Error creando ruta:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CORRECCIÓN: Obtener todas las rutas
export const getAllRutas = async (req, res) => {
  try {
    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('rutas');

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .get();
    
    const rutas = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ✅ CORRECCIÓN: Formato estandarizado
    res.json({
      success: true,
      data: rutas
    });
  } catch (error) {
    console.error('Error obteniendo rutas:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CORRECCIÓN: Obtener rutas por empleado
export const getRutasByEmpleado = async (req, res) => {
  try {
    const { empleadoId } = req.params;
    
    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('rutas')
      .where('empleadoId', '==', empleadoId);

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .get();
    
    const rutas = [];
    
    for (const doc of snapshot.docs) {
      const rutaData = doc.data();
      
      // Obtener facturas de la ruta
      const facturasSnapshot = await db.collection('facturas')
        .where('rutaId', '==', doc.id)
        .get();
      
      const facturas = facturasSnapshot.docs.map(fDoc => ({
        id: fDoc.id,
        ...fDoc.data()
      }));
      
      rutas.push({
        id: doc.id,
        ...rutaData,
        facturas
      });
    }

    // ✅ CORRECCIÓN: Formato estandarizado
    res.json({
      success: true,
      data: rutas
    });
  } catch (error) {
    console.error('Error obteniendo rutas por empleado:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CORRECCIÓN: Obtener ruta por ID
export const getRutaById = async (req, res) => {
  try {
    const { id } = req.params;
    const rutaDoc = await db.collection('rutas').doc(id).get();
    
    if (!rutaDoc.exists) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && rutaData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a esta ruta' });
    }

    // Obtener facturas de la ruta
    const facturasSnapshot = await db.collection('facturas')
      .where('rutaId', '==', id)
      .get();
    
    const facturas = facturasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ✅ CORRECCIÓN: Formato estandarizado
    res.json({
      success: true,
      data: {
        id: rutaDoc.id,
        ...rutaData,
        facturas
      }
    });
  } catch (error) {
    console.error('Error obteniendo ruta:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar estado de entrega (desde app móvil)
export const updateEntrega = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { estado, observaciones, motivoNoEntrega } = req.body;

    if (!estado) {
      return res.status(400).json({ error: 'Estado es requerido' });
    }

    // ← NUEVO: Verificar permisos sobre la factura
    const facturaDoc = await db.collection('facturas').doc(facturaId).get();
    if (!facturaDoc.exists) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const facturaData = facturaDoc.data();
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && facturaData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a esta factura' });
    }

    const updates = {
      estado,
      observaciones: observaciones || '',
      updatedAt: new Date().toISOString()
    };

    if (estado === 'entregado') {
      updates.fechaEntrega = new Date().toISOString();
    }

    if (estado === 'no_entregado') {
      updates.motivoNoEntrega = motivoNoEntrega || 'Sin especificar';
      updates.fechaIntento = new Date().toISOString();
    }

    await db.collection('facturas').doc(facturaId).update(updates);

    // Si fue entregada, actualizar contador de ruta
    if (estado === 'entregado') {
      const rutaId = facturaData.rutaId;
      
      if (rutaId) {
        const rutaDoc = await db.collection('rutas').doc(rutaId).get();
        const facturasEntregadas = (rutaDoc.data().facturasEntregadas || 0) + 1;
        
        await db.collection('rutas').doc(rutaId).update({
          facturasEntregadas,
          updatedAt: new Date().toISOString()
        });
      }
    }

    res.json({ message: 'Entrega actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando entrega:', error);
    res.status(500).json({ error: error.message });
  }
};

// Finalizar ruta
export const finalizarRuta = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ← NUEVO: Verificar permisos
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

    await db.collection('rutas').doc(id).update({
      estado: 'completada',
      fechaFinalizacion: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Ruta finalizada exitosamente' });
  } catch (error) {
    console.error('Error finalizando ruta:', error);
    res.status(500).json({ error: error.message });
  }
};