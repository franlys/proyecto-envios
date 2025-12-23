// backend/src/controllers/dashboardPropietarioController.js
import { db } from '../config/firebase.js';

/**
 * 📊 DASHBOARD EJECUTIVO PARA PROPIETARIO
 *
 * Este endpoint devuelve TODAS las métricas y KPIs necesarios
 * para que el propietario tenga una vista completa del negocio
 * sin necesidad de usar los paneles operativos.
 */
export const getDashboardPropietario = async (req, res) => {
  try {
    const { companyId, rol } = req.userData;

    // Solo propietario y super_admin pueden acceder
    if (rol !== 'propietario' && rol !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo el propietario puede acceder al dashboard ejecutivo'
      });
    }

    console.log(`📊 [Dashboard Propietario] Generando métricas para companyId: ${companyId}`);

    // ====================================
    // 📦 MÉTRICAS DE CONTENEDORES
    // ====================================
    const contenedoresMetrics = await getContenedoresMetrics(companyId);

    // ====================================
    // 🗺️ MÉTRICAS DE RUTAS
    // ====================================
    const rutasMetrics = await getRutasMetrics(companyId);

    // ====================================
    // 📋 MÉTRICAS DE FACTURAS
    // ====================================
    const facturasMetrics = await getFacturasMetrics(companyId);

    // ====================================
    // ⚠️ MÉTRICAS DE NO ENTREGADAS
    // ====================================
    const noEntregadasMetrics = await getNoEntregadasMetrics(companyId);

    // ====================================
    // 📅 MÉTRICAS DE SOLICITUDES
    // ====================================
    const solicitudesMetrics = await getSolicitudesMetrics(companyId);

    // ====================================
    // 💰 MÉTRICAS FINANCIERAS
    // ====================================
    const financialMetrics = await getFinancialMetrics(companyId);

    // Respuesta completa
    res.json({
      success: true,
      companyId,
      timestamp: new Date(),
      data: {
        contenedores: contenedoresMetrics,
        rutas: rutasMetrics,
        facturas: facturasMetrics,
        noEntregadas: noEntregadasMetrics,
        solicitudes: solicitudesMetrics,
        finanzas: financialMetrics
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener dashboard propietario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al cargar dashboard ejecutivo'
    });
  }
};

// ====================================
// 📦 CONTENEDORES - Métricas
// ====================================
async function getContenedoresMetrics(companyId) {
  try {
    const contenedoresSnap = await db.collection('contenedores')
      .where('companyId', '==', companyId)
      .get();

    let totalContenedores = 0;
    let contenedoresUSA = 0;
    let contenedoresRD = 0;
    let contenedoresEnTransito = 0;
    let contenedoresTrabajados = 0; // ✅ Contenedores con estado 'trabajado'
    let totalFacturas = 0;
    let facturasConfirmadas = 0;
    let facturasEntregadas = 0; // ✅ Facturas entregadas en contenedores

    // Recolectar todos los IDs de facturas de todos los contenedores
    const todasLasFacturasIds = [];

    contenedoresSnap.forEach(doc => {
      const contenedor = doc.data();
      totalContenedores++;

      // Clasificar por ubicación
      if (contenedor.estado === 'en_usa' || contenedor.estado === 'abierto') {
        contenedoresUSA++;
      } else if (contenedor.estado === 'recibido_rd' || contenedor.estado === 'en_rd') {
        contenedoresRD++;
      } else if (contenedor.estado === 'en_transito') {
        contenedoresEnTransito++;
      } else if (contenedor.estado === 'trabajado') {
        contenedoresTrabajados++;
      }

      // Contar facturas y confirmaciones (con validación defensiva)
      const facturas = contenedor?.facturas;
      if (facturas && Array.isArray(facturas)) {
        totalFacturas += facturas.length;

        // ✅ CORRECCIÓN: Usar confirmadaPorSecretaria para contar confirmadas
        facturasConfirmadas += facturas.filter(f => {
          if (!f || typeof f !== 'object') return false;
          return f.confirmadaPorSecretaria === true;
        }).length;

        // ✅ Recolectar IDs de facturas para consulta posterior
        facturas.forEach(f => {
          if (f && f.id && typeof f.id === 'string') {
            todasLasFacturasIds.push(f.id);
          }
        });
      }
    });

    // ✅ CORRECCIÓN: Consultar recolecciones en lotes DESPUÉS del forEach
    if (todasLasFacturasIds.length > 0) {
      for (let i = 0; i < todasLasFacturasIds.length; i += 30) {
        const batch = todasLasFacturasIds.slice(i, i + 30);
        const recoleccionesSnapshot = await db.collection('recolecciones')
          .where('__name__', 'in', batch)
          .get();

        recoleccionesSnapshot.forEach(recoleccionDoc => {
          const data = recoleccionDoc.data();
          const estadoGeneral = data.estadoGeneral?.toLowerCase() || data.estado?.toLowerCase();
          if (estadoGeneral === 'entregada' || estadoGeneral === 'entregado') {
            facturasEntregadas++;
          }
        });
      }
    }

    const porcentajeConfirmacion = totalFacturas > 0
      ? Math.round((facturasConfirmadas / totalFacturas) * 100)
      : 0;

    const porcentajeEntrega = totalFacturas > 0
      ? Math.round((facturasEntregadas / totalFacturas) * 100)
      : 0;

    const porcentajeTrabajados = totalContenedores > 0
      ? Math.round((contenedoresTrabajados / totalContenedores) * 100)
      : 0;

    return {
      total: totalContenedores,
      enUSA: contenedoresUSA,
      enRD: contenedoresRD,
      enTransito: contenedoresEnTransito,
      trabajados: contenedoresTrabajados,
      porcentajeTrabajados,
      facturas: {
        total: totalFacturas,
        confirmadas: facturasConfirmadas,
        porcentajeConfirmacion,
        entregadas: facturasEntregadas,
        porcentajeEntrega
      }
    };
  } catch (error) {
    console.error('Error obteniendo métricas de contenedores:', error);
    return null;
  }
}

// ====================================
// 🗺️ RUTAS - Métricas
// ====================================
async function getRutasMetrics(companyId) {
  try {
    const rutasSnap = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .get();

    let totalRutas = 0;
    let rutasActivas = 0;
    let rutasCompletadas = 0;
    let rutasPendientes = 0;
    let totalFacturasEnRutas = 0;
    let facturasEntregadas = 0;

    // ✅ OPTIMIZACIÓN N+1: Array para recolectar todos los IDs de facturas
    const todasLasFacturasIds = [];

    // Primera pasada: Contar rutas y recolectar IDs
    for (const doc of rutasSnap.docs) {
      const ruta = doc.data();
      totalRutas++;

      // Clasificar por estado
      // ✅ RUTAS ACTIVAS: asignada, cargada, en_ruta (todas las que están en operación)
      if (['asignada', 'cargada', 'en_ruta', 'en_carga', 'activa', 'en_progreso'].includes(ruta.estado)) {
        rutasActivas++;
      } else if (ruta.estado === 'completada' || ruta.estado === 'finalizada') {
        rutasCompletadas++;
      } else if (ruta.estado === 'pendiente') {
        rutasPendientes++;
      }

      // Contar facturas en esta ruta (con validación defensiva)
      const facturasRuta = ruta?.facturas;
      if (facturasRuta && Array.isArray(facturasRuta)) {
        totalFacturasEnRutas += facturasRuta.length;

        // ✅ OPTIMIZACIÓN: Recopilar IDs para batch query en lugar de N+1
        // Solo agregamos IDs válidos con validación defensiva
        facturasRuta.forEach(facturaId => {
          if (facturaId && typeof facturaId === 'string' && facturaId.trim() !== '') {
            todasLasFacturasIds.push(facturaId);
          }
        });
      }
    }

    // ✅ OPTIMIZACIÓN N+1: Batch query para todas las facturas
    // Firestore permite hasta 30 IDs por query con 'in', así que dividimos en batches
    console.log(`📊 [Rutas] IDs de facturas encontrados: ${todasLasFacturasIds.length}`);
    if (todasLasFacturasIds.length > 0) {
      const BATCH_SIZE = 30;
      for (let i = 0; i < todasLasFacturasIds.length; i += BATCH_SIZE) {
        const batch = todasLasFacturasIds.slice(i, i + BATCH_SIZE);
        console.log(`📊 [Rutas] Consultando batch ${i/BATCH_SIZE + 1}: ${batch.length} IDs`);
        try {
          const recoleccionesSnapshot = await db.collection('recolecciones')
            .where('__name__', 'in', batch)
            .get();

          console.log(`📊 [Rutas] Documentos encontrados en batch: ${recoleccionesSnapshot.size}`);

          recoleccionesSnapshot.forEach(doc => {
            const recoleccionData = doc.data();
            // Validación defensiva para evitar crashes
            if (!recoleccionData || typeof recoleccionData !== 'object') return;

            const estadoGeneral = recoleccionData.estadoGeneral?.toLowerCase() || recoleccionData.estado?.toLowerCase();

            if (estadoGeneral === 'entregada' || estadoGeneral === 'entregado') {
              facturasEntregadas++;
              console.log(`📊 [Rutas] Factura entregada encontrada: ${doc.id}`);
            }
          });
        } catch (error) {
          console.warn('⚠️ Error en batch query de recolecciones:', error.message);
        }
      }
    }

    console.log(`📊 [Rutas] RESUMEN: ${totalFacturasEnRutas} facturas en rutas, ${facturasEntregadas} entregadas`);

    const porcentajeEntrega = totalFacturasEnRutas > 0
      ? Math.round((facturasEntregadas / totalFacturasEnRutas) * 100)
      : 0;

    return {
      total: totalRutas,
      activas: rutasActivas,
      completadas: rutasCompletadas,
      pendientes: rutasPendientes,
      eficiencia: {
        totalFacturas: totalFacturasEnRutas,
        entregadas: facturasEntregadas,
        porcentajeEntrega
      }
    };
  } catch (error) {
    console.error('Error obteniendo métricas de rutas:', error);
    return null;
  }
}

// ====================================
// 📋 RECOLECCIONES - Métricas Generales
// ====================================
// ✅ CORRECCIÓN: Usar 'recolecciones' en lugar de 'facturas'
async function getFacturasMetrics(companyId) {
  try {
    const facturasSnap = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .get();

    let totalFacturas = 0;
    let entregadas = 0;
    let pendientes = 0;
    let noEntregadas = 0;
    let enRuta = 0;

    const estadosContador = {};
    const facturasEjemplo = []; // Guardar algunas facturas para debugging

    facturasSnap.forEach((doc, index) => {
      const factura = doc.data();
      totalFacturas++;

      // ✅ USAR CAMPO 'estadoGeneral' O 'estado' (ambos se actualizan al entregar)
      const estadoGeneral = factura.estadoGeneral?.toLowerCase() || factura.estado?.toLowerCase() || null;

      // Para facturas sin estadoGeneral ni estado, verificar si está confirmada
      let estadoFinal;
      if (estadoGeneral) {
        estadoFinal = estadoGeneral;
      } else if (factura.confirmada === true) {
        estadoFinal = 'confirmada';
      } else if (factura.confirmada === false || factura.confirmada === undefined) {
        estadoFinal = 'sin_confirmar';
      } else {
        estadoFinal = 'sin_estado';
      }

      // Contador de estados para debugging
      estadosContador[estadoFinal] = (estadosContador[estadoFinal] || 0) + 1;

      // Guardar primeras 5 facturas como ejemplo
      if (index < 5) {
        facturasEjemplo.push({
          id: doc.id,
          estadoGeneral: factura.estadoGeneral,
          estado: factura.estado,
          confirmada: factura.confirmada,
          estadoFinal,
          numero: factura.numero || factura.numeroFactura || 'N/A'
        });
      }

      // ✅ Clasificar según el estado final
      if (estadoFinal === 'entregada' || estadoFinal === 'entregado') {
        entregadas++;
      } else if (estadoFinal === 'no_entregada' || estadoFinal === 'no_entregado') {
        noEntregadas++;
      } else if (estadoFinal === 'en_ruta') {
        enRuta++;
      } else {
        // Pendientes: incluye sin_confirmar, confirmada (pero no entregada), etc.
        pendientes++;
      }
    });

    console.log('📊 Estados de facturas encontrados:', estadosContador);
    console.log('📋 Ejemplos de facturas (primeras 5):', facturasEjemplo);
    console.log(`📊 Totales: ${totalFacturas} facturas - ${entregadas} entregadas, ${pendientes} pendientes, ${noEntregadas} no entregadas, ${enRuta} en ruta`);

    const porcentajeEntrega = totalFacturas > 0
      ? Math.round((entregadas / totalFacturas) * 100)
      : 0;

    return {
      total: totalFacturas,
      entregadas,
      pendientes,
      noEntregadas,
      enRuta,
      porcentajeEntrega
    };
  } catch (error) {
    console.error('Error obteniendo métricas de facturas:', error);
    return null;
  }
}

// ====================================
// ⚠️ NO ENTREGADAS - Análisis Detallado
// ====================================
async function getNoEntregadasMetrics(companyId) {
  try {
    // ✅ CORRECCIÓN: Usar 'recolecciones' en lugar de 'facturas'
    // Buscar recolecciones usando 'estadoGeneral' en lugar de 'estado'
    // Primero intentar con estadoGeneral, si no hay resultados intentar con estado
    let facturasSnap = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('estadoGeneral', 'in', ['no_entregada', 'no_entregado'])
      .get();

    // Si no hay resultados con estadoGeneral, buscar con estado (para compatibilidad)
    if (facturasSnap.empty) {
      facturasSnap = await db.collection('recolecciones')
        .where('companyId', '==', companyId)
        .where('estado', 'in', ['no_entregada', 'no_entregado'])
        .get();
    }

    let totalNoEntregadas = 0;
    let motivosCount = {};
    let reincidenciasCount = 0;
    const facturasReincidentes = new Set();

    facturasSnap.forEach(doc => {
      const factura = doc.data();
      totalNoEntregadas++;

      // Contar motivos
      const motivo = factura.motivoNoEntrega || 'Sin especificar';
      motivosCount[motivo] = (motivosCount[motivo] || 0) + 1;

      // Detectar reincidencias (facturas con más de 1 intento fallido)
      if (factura.intentosEntrega && factura.intentosEntrega > 1) {
        reincidenciasCount++;
        facturasReincidentes.add(doc.id);
      }
    });

    // Calcular porcentajes de motivos
    const motivosArray = Object.entries(motivosCount).map(([motivo, count]) => ({
      motivo,
      count,
      porcentaje: totalNoEntregadas > 0
        ? Math.round((count / totalNoEntregadas) * 100)
        : 0
    })).sort((a, b) => b.count - a.count);

    const porcentajeReincidencia = totalNoEntregadas > 0
      ? Math.round((reincidenciasCount / totalNoEntregadas) * 100)
      : 0;

    return {
      total: totalNoEntregadas,
      reincidencias: reincidenciasCount,
      porcentajeReincidencia,
      motivos: motivosArray,
      facturasReincidentes: facturasReincidentes.size
    };
  } catch (error) {
    console.error('Error obteniendo métricas de no entregadas:', error);
    return null;
  }
}

// ====================================
// 💰 FINANZAS - Resumen
// ====================================
// ====================================
// 📅 SOLICITUDES - Métricas
// ====================================
async function getSolicitudesMetrics(companyId) {
  try {
    const solicitudesSnap = await db.collection('solicitudes_recoleccion')
      .where('companyId', '==', companyId)
      .get();

    let pendientes = 0;
    let asignadas = 0;
    let completadas = 0;
    let canceladas = 0;

    // Métricas adicionales
    let asignadasManual = 0;
    let asignadasAuto = 0;
    let solicitudesHoy = 0;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    solicitudesSnap.forEach(doc => {
      const data = doc.data();

      // Contar por estado
      switch (data.estado) {
        case 'pendiente':
          pendientes++;
          break;
        case 'asignada':
          asignadas++;
          if (data.tipoAsignacion === 'manual') asignadasManual++;
          if (data.tipoAsignacion === 'auto') asignadasAuto++;
          break;
        case 'completada':
          completadas++;
          break;
        case 'cancelada':
          canceladas++;
          break;
      }

      // Contar solicitudes creadas hoy
      if (data.createdAt) {
        const fechaCreacion = typeof data.createdAt === 'string'
          ? new Date(data.createdAt)
          : data.createdAt.toDate ? data.createdAt.toDate() : null;

        if (fechaCreacion && fechaCreacion >= hoy) {
          solicitudesHoy++;
        }
      }
    });

    const total = solicitudesSnap.size;
    const porcentajePendientes = total > 0 ? ((pendientes / total) * 100).toFixed(1) : 0;
    const porcentajeCompletadas = total > 0 ? ((completadas / total) * 100).toFixed(1) : 0;

    return {
      total,
      pendientes,
      asignadas,
      completadas,
      canceladas,
      solicitudesHoy,
      asignacionManual: asignadasManual,
      asignacionAuto: asignadasAuto,
      porcentajePendientes: parseFloat(porcentajePendientes),
      porcentajeCompletadas: parseFloat(porcentajeCompletadas)
    };

  } catch (error) {
    console.error('❌ Error calculando métricas de solicitudes:', error);
    return {
      total: 0,
      pendientes: 0,
      asignadas: 0,
      completadas: 0,
      canceladas: 0,
      solicitudesHoy: 0,
      asignacionManual: 0,
      asignacionAuto: 0,
      porcentajePendientes: 0,
      porcentajeCompletadas: 0
    };
  }
}

// ====================================
// 💰 FINANZAS - Métricas
// ====================================
async function getFinancialMetrics(companyId) {
  try {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    let totalGastosRutas = 0;
    let totalCobrosRutas = 0;

    // ✅ Obtener rutas para extraer gastos del array y calcular cobros
    const rutasSnap = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .get();

    // ✅ Iterar rutas y sumar gastos del mes actual desde el array
    rutasSnap.forEach(rutaDoc => {
      const ruta = rutaDoc.data();
      const gastosArray = ruta.gastos || [];

      // Sumar gastos del mes actual (con validación defensiva)
      gastosArray.forEach(gasto => {
        // Validar que gasto existe y es un objeto
        if (!gasto || typeof gasto !== 'object') return;

        let fechaGasto = null;

        // Manejar diferentes formatos de fecha
        if (gasto.fecha) {
          try {
            if (typeof gasto.fecha === 'string') {
              fechaGasto = new Date(gasto.fecha);
            } else if (gasto.fecha instanceof Date) {
              fechaGasto = gasto.fecha;
            } else if (gasto.fecha.toDate && typeof gasto.fecha.toDate === 'function') {
              fechaGasto = gasto.fecha.toDate();
            }
          } catch (err) {
            console.warn('⚠️ Error parseando fecha de gasto:', err.message);
          }
        }

        // Solo contar gastos del mes actual
        if (fechaGasto && !isNaN(fechaGasto.getTime()) && fechaGasto >= inicioMes) {
          const monto = parseFloat(gasto.monto);
          if (!isNaN(monto) && monto > 0) {
            totalGastosRutas += monto;
          }
        }
      });
    });

    // ✅ NUEVA LÓGICA DE INGRESOS (V2): Basada en Recolecciones
    // Esto captura pagos USA, pre-pagos y contra-entrega, independientemente de si están en una ruta

    // Query A: Entregados (captura contra entrega)
    const recoleccionesEntregadasPromise = db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('estado', 'in', ['entregado', 'entregada', 'Entregado', 'Entregada'])
      .get();

    // Query B: Pagados (captura pagos USA/Pre-pagos aunque no estén entregados)
    const recoleccionesPagadasPromise = db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('pago.estadoPago', '==', 'pagado')
      .get();

    const [entregadasSnap, pagadasSnap] = await Promise.all([
      recoleccionesEntregadasPromise,
      recoleccionesPagadasPromise
    ]);

    // Usar un Map para unificar y evitar duplicados
    const recoleccionesUnificadas = new Map();

    const procesarDoc = (doc) => {
      const data = doc.data();
      if (!recoleccionesUnificadas.has(doc.id)) {
        recoleccionesUnificadas.set(doc.id, data);
      }
    };

    entregadasSnap.forEach(procesarDoc);
    pagadasSnap.forEach(procesarDoc);

    let totalIngresos = 0;

    // Iterar sobre los valores únicos para sumar ingresos del mes actual
    for (const recoleccion of recoleccionesUnificadas.values()) {
      let fechaReferencia;

      // Priorizar fecha de pago, luego entrega, luego update
      if (recoleccion.pago?.fechaPago) {
        fechaReferencia = typeof recoleccion.pago.fechaPago === 'string'
          ? new Date(recoleccion.pago.fechaPago)
          : recoleccion.pago.fechaPago.toDate ? recoleccion.pago.fechaPago.toDate() : null;
      }

      if (!fechaReferencia && recoleccion.updatedAt) {
        fechaReferencia = typeof recoleccion.updatedAt === 'string'
          ? new Date(recoleccion.updatedAt)
          : recoleccion.updatedAt.toDate ? recoleccion.updatedAt.toDate() : null;
      }

      // Solo contar si está dentro del mes actual
      if (fechaReferencia && fechaReferencia >= inicioMes) {
        // Usar facturacion.total (ingreso real) en lugar de montoCobro
        const ingreso = recoleccion.facturacion?.total || 0;
        if (ingreso > 0) {
          totalIngresos += ingreso;
        }
      }
    }

    const balanceMes = totalIngresos - totalGastosRutas;

    return {
      mes: {
        cobros: totalIngresos, // Renombrado conceptualmente, pero mantenemos 'cobros' por compatibilidad frontend
        gastos: totalGastosRutas,
        balance: balanceMes
      }
    };
  } catch (error) {
    console.error('Error obteniendo métricas financieras:', error);
    return null;
  }
}

export default {
  getDashboardPropietario
};
