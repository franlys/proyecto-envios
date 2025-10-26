// backend/src/routes/facturas.js
import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(verifyToken);

// ============================================
// GET - Estadísticas para Secretaria
// ============================================
router.get('/stats-secretaria', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userData.companyId) {
      return res.status(403).json({ error: 'Usuario sin compañía asignada' });
    }

    // Contar facturas sin confirmar
    let facturasSinConfirmar = 0;
    let facturasConfirmadas = 0;
    let facturasTotal = 0;

    try {
      const facturasSnapshot = await db.collection('facturas')
        .where('companyId', '==', userData.companyId)
        .get();

      facturasSnapshot.forEach(doc => {
        const factura = doc.data();
        facturasTotal++;
        if (factura.estado === 'sin_confirmar') {
          facturasSinConfirmar++;
        } else if (factura.estado === 'confirmada') {
          facturasConfirmadas++;
        }
      });
    } catch (error) {
      console.log('No hay facturas');
    }

    res.json({
      facturasSinConfirmar,
      facturasConfirmadas,
      facturasTotal,
      porcentajeConfirmadas: facturasTotal > 0 
        ? Math.round((facturasConfirmadas / facturasTotal) * 100) 
        : 0
    });
  } catch (error) {
    console.error('Error en stats-secretaria:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ============================================
// GET - Obtener facturas no entregadas
// ============================================
router.get('/no-entregadas', async (req, res) => {
  try {
    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('facturas')
      .where('estado', '==', 'no_entregado');

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const facturasSnapshot = await query.get();

    const facturas = [];

    for (const doc of facturasSnapshot.docs) {
      const facturaData = doc.data();

      // Si tiene rutaId, obtener información de la ruta
      let rutaInfo = null;
      let repartidorInfo = null;

      if (facturaData.rutaId) {
        const rutaDoc = await db.collection('rutas').doc(facturaData.rutaId).get();
        
        if (rutaDoc.exists) {
          const rutaData = rutaDoc.data();
          rutaInfo = {
            id: rutaDoc.id,
            nombre: rutaData.nombre
          };

          if (rutaData.empleadoId) {
            const empleadoDoc = await db.collection('usuarios').doc(rutaData.empleadoId).get();
            if (empleadoDoc.exists) {
              repartidorInfo = {
                id: empleadoDoc.id,
                nombre: empleadoDoc.data().nombre
              };
            }
          }
        }
      }

      facturas.push({
        id: doc.id,
        numeroFactura: facturaData.numeroFactura,
        cliente: facturaData.cliente,
        direccion: facturaData.direccion,
        monto: facturaData.monto || 0,
        rutaId: facturaData.rutaId || null,
        rutaNombre: rutaInfo?.nombre || null,
        repartidorNombre: repartidorInfo?.nombre || null,
        motivoNoEntrega: facturaData.motivoNoEntrega || 'Sin especificar',
        fechaIntento: facturaData.fechaIntento || facturaData.updatedAt,
        observaciones: facturaData.observaciones || ''
      });
    }

    res.json(facturas);
  } catch (error) {
    console.error('Error al obtener facturas no entregadas:', error);
    res.status(500).json({ error: 'Error al obtener facturas no entregadas' });
  }
});

// ============================================
// POST - Reasignar factura
// ============================================
router.post('/reasignar', async (req, res) => {
  try {
    const { facturaId, accion, observaciones, nuevaRutaId } = req.body;

    if (!facturaId || !accion) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }

    if (accion === 'nueva_ruta' && !nuevaRutaId) {
      return res.status(400).json({ 
        error: 'Debe seleccionar una nueva ruta' 
      });
    }

    const facturaRef = db.collection('facturas').doc(facturaId);
    const facturaDoc = await facturaRef.get();

    if (!facturaDoc.exists) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const facturaData = facturaDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && facturaData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a esta factura' });
    }

    const actualizacion = {
      updatedAt: new Date()
    };

    const historialData = {
      facturaId,
      accion,
      observaciones: observaciones || '',
      rutaAnteriorId: facturaData.rutaId || null,
      fechaReasignacion: new Date(),
      usuarioId: req.user.uid,
      motivoAnterior: facturaData.motivoNoEntrega || null,
      companyId: facturaData.companyId // ← NUEVO: Guardar companyId en historial
    };

    if (accion === 'pendiente') {
      actualizacion.estado = 'pendiente';
      actualizacion.rutaId = null;
      actualizacion.motivoNoEntrega = null;
      actualizacion.fechaIntento = null;
      
    } else if (accion === 'nueva_ruta') {
      const nuevaRutaDoc = await db.collection('rutas').doc(nuevaRutaId).get();
      if (!nuevaRutaDoc.exists) {
        return res.status(404).json({ error: 'Nueva ruta no encontrada' });
      }

      const nuevaRutaData = nuevaRutaDoc.data();

      // ← NUEVO: Verificar que la ruta sea de la misma compañía
      if (nuevaRutaData.companyId !== facturaData.companyId) {
        return res.status(400).json({ 
          error: 'No se puede asignar a una ruta de otra compañía' 
        });
      }

      if (nuevaRutaData.estado === 'completada') {
        return res.status(400).json({ 
          error: 'No se puede asignar a una ruta completada' 
        });
      }

      actualizacion.estado = 'asignado';
      actualizacion.rutaId = nuevaRutaId;
      actualizacion.motivoNoEntrega = null;
      actualizacion.fechaIntento = null;
      
      historialData.nuevaRutaId = nuevaRutaId;
    }

    await facturaRef.update(actualizacion);
    await db.collection('historial_reasignaciones').add(historialData);

    res.json({
      message: 'Factura reasignada exitosamente',
      facturaId,
      nuevoEstado: actualizacion.estado,
      nuevaRutaId: actualizacion.rutaId || null
    });

  } catch (error) {
    console.error('Error al reasignar factura:', error);
    res.status(500).json({ error: 'Error al reasignar la factura' });
  }
});

// ============================================
// GET - Obtener historial de una factura
// ============================================
router.get('/:id/historial', async (req, res) => {
  try {
    const { id } = req.params;

    const facturaDoc = await db.collection('facturas').doc(id).get();
    if (!facturaDoc.exists) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const facturaData = facturaDoc.data();

    // ← NUEVO: Verificar permisos
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && facturaData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a esta factura' });
    }

    const historialSnapshot = await db.collection('historial_reasignaciones')
      .where('facturaId', '==', id)
      .orderBy('fechaReasignacion', 'desc')
      .get();

    const historial = [];
    historialSnapshot.forEach(doc => {
      historial.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      factura: {
        id: facturaDoc.id,
        ...facturaData
      },
      historial
    });

  } catch (error) {
    console.error('Error al obtener historial de factura:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// ============================================
// GET - Buscar facturas con filtros
// ============================================
router.get('/buscar', async (req, res) => {
  try {
    const { cliente, numeroFactura, estado, rutaId, fechaDesde, fechaHasta } = req.query;

    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('facturas');

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    if (estado) {
      query = query.where('estado', '==', estado);
    }

    if (rutaId) {
      query = query.where('rutaId', '==', rutaId);
    }

    const snapshot = await query.get();

    let facturas = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      let incluir = true;

      if (cliente && !data.cliente?.toLowerCase().includes(cliente.toLowerCase())) {
        incluir = false;
      }

      if (numeroFactura && !data.numeroFactura?.toLowerCase().includes(numeroFactura.toLowerCase())) {
        incluir = false;
      }

      if (fechaDesde && new Date(data.createdAt?.toDate()) < new Date(fechaDesde)) {
        incluir = false;
      }

      if (fechaHasta && new Date(data.createdAt?.toDate()) > new Date(fechaHasta + 'T23:59:59')) {
        incluir = false;
      }

      if (incluir) {
        facturas.push({
          id: doc.id,
          ...data
        });
      }
    });

    res.json(facturas);
  } catch (error) {
    console.error('Error al buscar facturas:', error);
    res.status(500).json({ error: 'Error al buscar facturas' });
  }
});

// ============================================
// GET - Obtener estadísticas de facturas
// ============================================
router.get('/estadisticas', async (req, res) => {
  try {
    // ← NUEVO: Obtener datos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('facturas');

    // ← NUEVO: Si NO es super_admin, filtrar por compañía
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const facturasSnapshot = await query.get();
    
    let totales = {
      total: 0,
      pendientes: 0,
      asignadas: 0,
      entregadas: 0,
      no_entregadas: 0
    };

    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      totales.total++;
      
      switch(factura.estado) {
        case 'pendiente':
          totales.pendientes++;
          break;
        case 'asignado':
          totales.asignadas++;
          break;
        case 'entregado':
          totales.entregadas++;
          break;
        case 'no_entregado':
          totales.no_entregadas++;
          break;
      }
    });

    res.json({
      totales,
      porcentaje_entrega: totales.total > 0 
        ? Math.round((totales.entregadas / totales.total) * 100) 
        : 0
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;