// backend/src/controllers/facturasController.js
import { db } from '../config/firebase.js';

/**
 * GET - Estadísticas para Secretaria
 */
export const getStatsSecretaria = async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (!userData.companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'Usuario sin compañía asignada' 
      });
    }

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
      console.log('No hay facturas disponibles');
    }

    res.json({
      success: true,
      data: {
        facturasSinConfirmar,
        facturasConfirmadas,
        facturasTotal,
        porcentajeConfirmadas: facturasTotal > 0 
          ? Math.round((facturasConfirmadas / facturasTotal) * 100) 
          : 0
      }
    });
  } catch (error) {
    console.error('Error en stats-secretaria:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estadísticas' 
    });
  }
};

/**
 * GET - Obtener facturas no entregadas
 */
export const getFacturasNoEntregadas = async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('facturas')
      .where('estado', '==', 'no_entregado');

    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const facturasSnapshot = await query.get();
    const facturas = [];

    for (const doc of facturasSnapshot.docs) {
      const facturaData = doc.data();

      let rutaInfo = null;
      let repartidorInfo = null;

      // Obtener información de la ruta si existe
      if (facturaData.rutaId) {
        const rutaDoc = await db.collection('rutas').doc(facturaData.rutaId).get();
        
        if (rutaDoc.exists) {
          const rutaData = rutaDoc.data();
          rutaInfo = {
            id: rutaDoc.id,
            nombre: rutaData.nombre
          };

          // Obtener información del repartidor si existe
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

    res.json({ 
      success: true, 
      data: facturas 
    });
  } catch (error) {
    console.error('Error al obtener facturas no entregadas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener facturas no entregadas' 
    });
  }
};

/**
 * POST - Reasignar factura
 */
export const reasignarFactura = async (req, res) => {
  try {
    const { facturaId, accion, observaciones, nuevaRutaId } = req.body;

    // Validaciones básicas
    if (!facturaId || !accion) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltan datos requeridos: facturaId y accion' 
      });
    }

    if (accion === 'nueva_ruta' && !nuevaRutaId) {
      return res.status(400).json({ 
        success: false,
        error: 'Debe seleccionar una nueva ruta' 
      });
    }

    // Verificar que la factura existe
    const facturaRef = db.collection('facturas').doc(facturaId);
    const facturaDoc = await facturaRef.get();

    if (!facturaDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Factura no encontrada' 
      });
    }

    const facturaData = facturaDoc.data();

    // Verificar permisos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && facturaData.companyId !== userData.companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'No tienes acceso a esta factura' 
      });
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
      companyId: facturaData.companyId
    };

    // Procesar acción
    if (accion === 'pendiente') {
      actualizacion.estado = 'pendiente';
      actualizacion.rutaId = null;
      actualizacion.motivoNoEntrega = null;
      actualizacion.fechaIntento = null;
      
    } else if (accion === 'nueva_ruta') {
      // Verificar que la nueva ruta existe
      const nuevaRutaDoc = await db.collection('rutas').doc(nuevaRutaId).get();
      if (!nuevaRutaDoc.exists) {
        return res.status(404).json({ 
          success: false,
          error: 'Nueva ruta no encontrada' 
        });
      }

      const nuevaRutaData = nuevaRutaDoc.data();

      // Verificar que la ruta pertenece a la misma compañía
      if (nuevaRutaData.companyId !== facturaData.companyId) {
        return res.status(400).json({ 
          success: false,
          error: 'No se puede asignar a una ruta de otra compañía' 
        });
      }

      // Verificar que la ruta no está completada
      if (nuevaRutaData.estado === 'completada') {
        return res.status(400).json({ 
          success: false,
          error: 'No se puede asignar a una ruta completada' 
        });
      }

      actualizacion.estado = 'asignado';
      actualizacion.rutaId = nuevaRutaId;
      actualizacion.motivoNoEntrega = null;
      actualizacion.fechaIntento = null;
      
      historialData.nuevaRutaId = nuevaRutaId;
    }

    // Actualizar factura y guardar historial
    await facturaRef.update(actualizacion);
    await db.collection('historial_reasignaciones').add(historialData);

    res.json({
      success: true,
      message: 'Factura reasignada exitosamente',
      data: {
        facturaId,
        nuevoEstado: actualizacion.estado,
        nuevaRutaId: actualizacion.rutaId || null
      }
    });

  } catch (error) {
    console.error('Error al reasignar factura:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al reasignar la factura' 
    });
  }
};

/**
 * GET - Obtener historial de una factura
 */
export const getHistorialFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la factura existe
    const facturaDoc = await db.collection('facturas').doc(id).get();
    if (!facturaDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Factura no encontrada' 
      });
    }

    const facturaData = facturaDoc.data();

    // Verificar permisos del usuario
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    if (userData.rol !== 'super_admin' && facturaData.companyId !== userData.companyId) {
      return res.status(403).json({ 
        success: false,
        error: 'No tienes acceso a esta factura' 
      });
    }

    // Obtener historial de reasignaciones
    const historialSnapshot = await db.collection('historial_reasignaciones')
      .where('facturaId', '==', id)
      .orderBy('fechaReasignacion', 'desc')
      .get();

    const historial = [];
    for (const doc of historialSnapshot.docs) {
      const data = doc.data();
      
      // Enriquecer con información del usuario que hizo la acción
      let usuarioInfo = null;
      if (data.usuarioId) {
        const usuarioDoc = await db.collection('usuarios').doc(data.usuarioId).get();
        if (usuarioDoc.exists) {
          usuarioInfo = {
            id: usuarioDoc.id,
            nombre: usuarioDoc.data().nombre,
            email: usuarioDoc.data().email
          };
        }
      }

      historial.push({
        id: doc.id,
        ...data,
        usuario: usuarioInfo
      });
    }

    res.json({
      success: true,
      data: {
        factura: {
          id: facturaDoc.id,
          ...facturaData
        },
        historial
      }
    });

  } catch (error) {
    console.error('Error al obtener historial de factura:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener historial' 
    });
  }
};

/**
 * GET - Buscar facturas con filtros
 * ✅ MEJORADO: Incluye filtro por embarqueId y mejor manejo de rutaId
 */
export const buscarFacturas = async (req, res) => {
  try {
    // ✅ CORRECCIÓN: Añadir 'embarqueId' a los parámetros
    const { 
      cliente, 
      numeroFactura, 
      estado, 
      rutaId, 
      fechaDesde, 
      fechaHasta, 
      embarqueId 
    } = req.query;

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('facturas');

    // Filtrar por compañía (excepto super_admin)
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    // Filtrar por estado
    if (estado) {
      query = query.where('estado', '==', estado);
    }

    // ✅ NUEVO: Filtro por embarqueId
    // Permite obtener solo las facturas de un contenedor específico
    if (embarqueId) {
      query = query.where('embarqueId', '==', embarqueId);
    }

    // ✅ MEJORADO: Manejo correcto del filtro rutaId
    if (rutaId) {
      // Si el frontend pide 'rutaId=null', buscamos facturas sin ruta asignada
      if (rutaId === 'null') {
        query = query.where('rutaId', '==', null);
      } else {
        // Si pide un ID de ruta específico
        query = query.where('rutaId', '==', rutaId);
      }
    }

    const snapshot = await query.get();

    let facturas = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      let incluir = true;

      // Filtros adicionales aplicados en memoria (después de la consulta)
      // Estos no se pueden hacer en Firestore por limitaciones de índices

      if (cliente && !data.cliente?.toLowerCase().includes(cliente.toLowerCase())) {
        incluir = false;
      }

      if (numeroFactura && !data.numeroFactura?.toLowerCase().includes(numeroFactura.toLowerCase())) {
        incluir = false;
      }

      if (fechaDesde && data.createdAt) {
        const fechaFactura = new Date(data.createdAt.toDate());
        const fechaDesdeObj = new Date(fechaDesde);
        if (fechaFactura < fechaDesdeObj) {
          incluir = false;
        }
      }

      if (fechaHasta && data.createdAt) {
        const fechaFactura = new Date(data.createdAt.toDate());
        const fechaHastaObj = new Date(fechaHasta + 'T23:59:59');
        if (fechaFactura > fechaHastaObj) {
          incluir = false;
        }
      }

      if (incluir) {
        facturas.push({
          id: doc.id,
          ...data,
          // Convertir timestamps a formato ISO para el frontend
          createdAt: data.createdAt?.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString()
        });
      }
    });

    res.json({ 
      success: true, 
      data: facturas,
      count: facturas.length 
    });

  } catch (error) {
    console.error('Error al buscar facturas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al buscar facturas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET - Obtener estadísticas de facturas
 * ✅ MEJORADO: Incluye más detalles en las estadísticas
 */
export const getEstadisticasFacturas = async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('facturas');

    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const facturasSnapshot = await query.get();
    
    let totales = {
      total: 0,
      sin_confirmar: 0,
      confirmada: 0,
      pendiente: 0,
      asignado: 0,
      en_ruta: 0,
      entregado: 0,
      no_entregado: 0
    };

    let montoTotal = 0;
    let montoEntregado = 0;

    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      totales.total++;
      
      // Contar por estado
      if (totales.hasOwnProperty(factura.estado)) {
        totales[factura.estado]++;
      }

      // Sumar montos
      const monto = parseFloat(factura.monto) || 0;
      montoTotal += monto;
      if (factura.estado === 'entregado') {
        montoEntregado += monto;
      }
    });

    // Calcular porcentajes
    const porcentajeEntrega = totales.total > 0 
      ? Math.round((totales.entregado / totales.total) * 100) 
      : 0;

    const porcentajeNoEntrega = totales.total > 0
      ? Math.round((totales.no_entregado / totales.total) * 100)
      : 0;

    const tasaExito = (totales.entregado + totales.no_entregado) > 0
      ? Math.round((totales.entregado / (totales.entregado + totales.no_entregado)) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        totales,
        montos: {
          total: montoTotal,
          entregado: montoEntregado,
          pendiente: montoTotal - montoEntregado
        },
        porcentajes: {
          entrega: porcentajeEntrega,
          no_entrega: porcentajeNoEntrega,
          tasa_exito: tasaExito
        }
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estadísticas' 
    });
  }
};