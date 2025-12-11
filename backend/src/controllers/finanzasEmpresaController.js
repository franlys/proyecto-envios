// Controlador de Finanzas Empresariales - Para Propietarios
// Muestra finanzas operativas de su empresa con conversión de monedas
// Repartidores (RD$) -> USD, Recolectores (USD)
import { db } from '../config/firebase.js';
import {
  PLANES_SAAS,
  obtenerPlan,
  obtenerTodosLosPlanes,
  verificarLimite,
  calcularAhorroAutomatizacion
} from '../config/planesSaaS.js';

/**
 * GET /api/finanzas/empresa/overview
 * Obtiene el overview financiero de la empresa del propietario
 */
export const getOverview = async (req, res) => {
  try {
    const { dateRange = '30' } = req.query;
    const companyId = req.userData?.companyId; // Del middleware de autenticación

    console.log('📊 [Finanzas Empresa] Obteniendo overview para company:', companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'CompanyId requerido'
      });
    }

    // Calcular fechas
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - parseInt(dateRange));

    // Obtener tasa de cambio actual
    const tasaDolar = await obtenerTasaDolar();

    // 1. Calcular ingresos por entregas (facturas entregadas)
    // Nota: No filtramos por fecha en la query porque updatedAt puede ser Timestamp o string
    // Filtraremos en memoria después
    // ✅ CORRECCIÓN: Buscar ambas variantes del estado
    const facturasSnapshot = await db.collection('facturas')
      .where('companyId', '==', companyId)
      .where('estado', 'in', ['entregado', 'entregada'])
      .get();

    let ingresosTotal = 0;
    let totalCobrosFacturas = 0; // ✅ NUEVO: Cobros adicionales en facturas

    facturasSnapshot.forEach(doc => {
      const factura = doc.data();

      // Filtrar por fecha en memoria
      let facturaDate;
      if (factura.updatedAt) {
        if (typeof factura.updatedAt === 'string') {
          facturaDate = new Date(factura.updatedAt);
        } else if (factura.updatedAt.toDate) {
          // Es un Firestore Timestamp
          facturaDate = factura.updatedAt.toDate();
        }
      }

      // Solo contar si está dentro del rango de fechas
      if (facturaDate && facturaDate >= startDate) {
        // ✅ Ingreso base: monto del envío
        ingresosTotal += factura.monto || 0;

        // ✅ NUEVO: Agregar cobros adicionales si existen
        // (pago contra entrega, monto pendiente cobrado, etc.)
        if (factura.pago && factura.pago.montoPagado > 0) {
          totalCobrosFacturas += factura.pago.montoPagado || 0;
        }
      }
    });

    // ✅ NUEVO: Ingresos totales incluyen el monto del envío + cobros
    const ingresosTotales = ingresosTotal + totalCobrosFacturas;

    // 2. Calcular gastos (con conversión de monedas)
    const gastosDesglosados = await calcularGastos(companyId, startDate, tasaDolar);

    const gastosTotal =
      gastosDesglosados.repartidoresUSD +
      gastosDesglosados.recolectoresUSD +
      gastosDesglosados.otrosUSD;

    // 3. Calcular utilidad (usando ingresos totales que incluyen cobros)
    const utilidad = ingresosTotales - gastosTotal;

    // 4. Contar facturas activas
    const facturasActivasSnapshot = await db.collection('facturas')
      .where('companyId', '==', companyId)
      .where('estado', 'in', ['sin_confirmar', 'en_ruta', 'en_almacen'])
      .get();

    // 5. Calcular cambios vs mes anterior (mock - implementar lógica real)
    const cambios = {
      ingresos: 12.5,
      gastos: 8.3,
      utilidad: 18.7,
      facturas: 5.2
    };

    console.log(`✅ [Finanzas Empresa] Ingresos: $${ingresosTotales} (Envíos: $${ingresosTotal} + Cobros: $${totalCobrosFacturas}), Gastos: $${gastosTotal}, Utilidad: $${utilidad}`);

    res.json({
      success: true,
      data: {
        tasaDolar: tasaDolar,
        ingresos: {
          total: ingresosTotales, // ✅ Ahora incluye envíos + cobros
          envios: ingresosTotal, // ✅ NUEVO: Desglose de ingresos por envíos
          cobros: totalCobrosFacturas, // ✅ NUEVO: Desglose de cobros en facturas
          change: cambios.ingresos,
          changeType: 'up'
        },
        gastos: {
          total: gastosTotal,
          change: cambios.gastos,
          changeType: 'down',
          desglose: gastosDesglosados
        },
        utilidad: {
          total: utilidad,
          change: cambios.utilidad,
          changeType: utilidad > 0 ? 'up' : 'down'
        },
        facturasActivas: {
          total: facturasActivasSnapshot.size,
          change: cambios.facturas,
          changeType: 'up'
        }
      }
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al obtener overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos financieros',
      error: error.message
    });
  }
};

/**
 * Calcula los gastos de la empresa con conversión de monedas
 * Repartidores: RD$ -> USD
 * Recolectores: USD
 */
async function calcularGastos(companyId, startDate, tasaDolar) {
  try {
    console.log('💰 [Finanzas Empresa] Calculando gastos...');

    // Por ahora usamos colecciones que existen o retornamos 0
    // TODO: Crear las colecciones de pagos cuando estén disponibles

    // 1. Gastos de Repartidores (en RD$)
    // Esta colección debe ser creada cuando se paguen repartidores
    let gastosRepartidoresRD = 0;
    let gastosRepartidoresUSD = 0;

    try {
      const pagosRepartidoresSnapshot = await db.collection('pagos_repartidores')
        .where('companyId', '==', companyId)
        .where('fecha', '>=', startDate)
        .get();

      pagosRepartidoresSnapshot.forEach(doc => {
        const pago = doc.data();
        gastosRepartidoresRD += pago.monto || 0;
      });

      gastosRepartidoresUSD = gastosRepartidoresRD / tasaDolar;
    } catch (error) {
      console.log('⚠️ [Finanzas Empresa] Colección pagos_repartidores no existe aún');
    }

    // 2. Gastos de Recolectores (en USD)
    let gastosRecolectoresUSD = 0;

    try {
      const pagosRecolectoresSnapshot = await db.collection('pagos_recolectores')
        .where('companyId', '==', companyId)
        .where('fecha', '>=', startDate)
        .get();

      pagosRecolectoresSnapshot.forEach(doc => {
        const pago = doc.data();
        // Los recolectores cobran en USD
        gastosRecolectoresUSD += pago.monto || 0;
      });
    } catch (error) {
      console.log('⚠️ [Finanzas Empresa] Colección pagos_recolectores no existe aún');
    }

    // 3. Otros gastos operacionales
    // Usamos la colección 'gastos' que ya existe
    let otrosGastosUSD = 0;

    try {
      const otrosGastosSnapshot = await db.collection('gastos')
        .where('companyId', '==', companyId)
        .where('fecha', '>=', startDate)
        .get();

      otrosGastosSnapshot.forEach(doc => {
        const gasto = doc.data();
        // Convertir según la moneda del gasto
        if (gasto.moneda === 'RD$' || gasto.moneda === 'DOP') {
          otrosGastosUSD += (gasto.monto || 0) / tasaDolar;
        } else {
          otrosGastosUSD += gasto.monto || 0;
        }
      });
    } catch (error) {
      console.log('⚠️ [Finanzas Empresa] Error al obtener gastos operacionales:', error.message);
    }

    return {
      repartidoresRD: gastosRepartidoresRD,
      repartidoresUSD: gastosRepartidoresUSD,
      recolectoresUSD: gastosRecolectoresUSD,
      otrosUSD: otrosGastosUSD
    };

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al calcular gastos:', error);
    return {
      repartidoresRD: 0,
      repartidoresUSD: 0,
      recolectoresUSD: 0,
      otrosUSD: 0
    };
  }
}

/**
 * GET /api/finanzas/empresa/metricas-mensuales
 * Obtiene métricas mensuales para gráficos
 */
export const getMetricasMensuales = async (req, res) => {
  try {
    const { meses = 6 } = req.query;
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'CompanyId requerido'
      });
    }

    const metricas = [];
    const now = new Date();
    const tasaDolar = await obtenerTasaDolar();

    for (let i = parseInt(meses) - 1; i >= 0; i--) {
      const fecha = new Date(now);
      fecha.setMonth(fecha.getMonth() - i);

      const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

      // Calcular ingresos del mes
      // ✅ CORRECCIÓN: Buscar ambas variantes del estado
      const facturasSnapshot = await db.collection('facturas')
        .where('companyId', '==', companyId)
        .where('estado', 'in', ['entregado', 'entregada'])
        .get();

      let ingresos = 0;
      let cobros = 0; // ✅ NUEVO: Cobros en facturas

      facturasSnapshot.forEach(doc => {
        const factura = doc.data();
        // Filtrar por fecha en memoria
        let facturaDate;
        if (factura.updatedAt) {
          if (typeof factura.updatedAt === 'string') {
            facturaDate = new Date(factura.updatedAt);
          } else if (factura.updatedAt.toDate) {
            facturaDate = factura.updatedAt.toDate();
          }
        }

        // Solo contar si está dentro del rango del mes
        if (facturaDate && facturaDate >= inicioMes && facturaDate <= finMes) {
          ingresos += factura.monto || 0;

          // ✅ NUEVO: Agregar cobros adicionales
          if (factura.pago && factura.pago.montoPagado > 0) {
            cobros += factura.pago.montoPagado || 0;
          }
        }
      });

      // ✅ Ingresos totales incluyen envíos + cobros
      const ingresosTotales = ingresos + cobros;

      // Calcular gastos del mes
      const gastosDesglosados = await calcularGastos(companyId, inicioMes, tasaDolar);
      const gastos = gastosDesglosados.repartidoresUSD + gastosDesglosados.recolectoresUSD + gastosDesglosados.otrosUSD;

      metricas.push({
        mes: fecha.toLocaleString('es-DO', { month: 'short', year: 'numeric' }),
        fecha: fecha.toISOString(),
        ingresos: ingresosTotales, // ✅ Usa ingresos totales (envíos + cobros)
        gastos: gastos,
        utilidad: ingresosTotales - gastos // ✅ Utilidad correcta con cobros incluidos
      });
    }

    res.json({
      success: true,
      data: metricas
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al obtener métricas mensuales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener métricas mensuales',
      error: error.message
    });
  }
};

/**
 * GET /api/finanzas/tasa-dolar
 * Obtiene la tasa de cambio actual del Banco Central
 */
export const getTasaDolar = async (req, res) => {
  try {
    const tasa = await obtenerTasaDolar();

    res.json({
      success: true,
      data: {
        tasa: tasa,
        fecha: new Date().toISOString(),
        fuente: 'Banco Central República Dominicana'
      }
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al obtener tasa de dólar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tasa de cambio',
      error: error.message
    });
  }
};

/**
 * GET /api/finanzas/empresa/suscripcion
 * Obtiene datos de la suscripción SaaS de la empresa
 */
export const getSuscripcion = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'CompanyId requerido'
      });
    }

    // Obtener datos de la empresa
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    const companyData = companyDoc.data();

    // Precios de planes
    const preciosPlanes = {
      enterprise: 1000,
      professional: 400,
      basic: 300
    };

    // Límites por plan
    const limitesPorPlan = {
      enterprise: {
        recolecciones: -1, // Ilimitado
        usuarios: -1, // Ilimitado
        almacenamiento: 'Ilimitado'
      },
      professional: {
        recolecciones: 500,
        usuarios: 15,
        almacenamiento: '100 GB'
      },
      basic: {
        recolecciones: 100,
        usuarios: 5,
        almacenamiento: '10 GB'
      }
    };

    const plan = companyData.plan?.toLowerCase() || 'basic';
    const precio = preciosPlanes[plan] || preciosPlanes.basic;
    const limites = limitesPorPlan[plan] || limitesPorPlan.basic;

    // Calcular próximo pago (asumiendo pago mensual el día 1)
    const now = new Date();
    const proximoPago = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Obtener uso actual
    const uso = await calcularUsoActual(companyId);

    // ✅ Convertir fechaInicio de manera segura
    let fechaInicio = new Date();
    if (companyData.createdAt) {
      if (typeof companyData.createdAt.toDate === 'function') {
        fechaInicio = companyData.createdAt.toDate();
      } else if (typeof companyData.createdAt === 'string' || typeof companyData.createdAt === 'number') {
        fechaInicio = new Date(companyData.createdAt);
      }
    }

    res.json({
      success: true,
      data: {
        plan: companyData.plan || 'Basic',
        precio: precio,
        fechaInicio: fechaInicio,
        proximoPago: proximoPago,
        estado: companyData.active ? 'activo' : 'inactivo',
        limites: limites,
        uso: uso
      }
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al obtener suscripción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos de suscripción',
      error: error.message
    });
  }
};

/**
 * Calcula el uso actual de la empresa
 */
async function calcularUsoActual(companyId) {
  try {
    // Contar recolecciones del mes actual
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    // Obtener todas las facturas y filtrar en memoria
    const recoleccionesSnapshot = await db.collection('facturas')
      .where('companyId', '==', companyId)
      .get();

    // Contar solo las del mes actual
    let recoleccionesMes = 0;
    recoleccionesSnapshot.forEach(doc => {
      const factura = doc.data();
      let facturaDate;

      if (factura.createdAt) {
        if (typeof factura.createdAt === 'string') {
          facturaDate = new Date(factura.createdAt);
        } else if (factura.createdAt.toDate) {
          facturaDate = factura.createdAt.toDate();
        }
      }

      if (facturaDate && facturaDate >= inicioMes) {
        recoleccionesMes++;
      }
    });

    // Contar usuarios activos
    const usuariosSnapshot = await db.collection('users')
      .where('companyId', '==', companyId)
      .where('active', '==', true)
      .get();

    // Contar camiones (empleados con rol 'repartidor')
    const camionesSnapshot = await db.collection('users')
      .where('companyId', '==', companyId)
      .where('rol', '==', 'repartidor')
      .where('active', '==', true)
      .get();

    // Calcular almacenamiento usado (mock - requiere implementación real)
    // TODO: Implementar cálculo real de almacenamiento
    const almacenamientoUsado = '3.2 GB';

    return {
      recolecciones: recoleccionesMes,
      usuarios: usuariosSnapshot.size,
      camiones: camionesSnapshot.size,
      almacenamiento: almacenamientoUsado
    };

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al calcular uso:', error);
    return {
      recolecciones: 0,
      usuarios: 0,
      camiones: 0,
      almacenamiento: '0 GB'
    };
  }
}

/**
 * GET /api/finanzas/empresa/facturas-pendientes
 * Obtiene facturas pendientes de pago al sistema SaaS
 */
export const getFacturasPendientes = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'CompanyId requerido'
      });
    }

    // Buscar facturas pendientes en la colección saas_invoices
    // Si no existe la colección, retornamos array vacío
    let facturasPendientes = [];

    try {
      const facturasSnapshot = await db.collection('saas_invoices')
        .where('companyId', '==', companyId)
        .where('estado', 'in', ['pendiente', 'vencida'])
        .orderBy('fechaVencimiento', 'asc')
        .get();

      facturasSnapshot.forEach(doc => {
        const factura = doc.data();
        facturasPendientes.push({
          id: doc.id,
          numero: factura.numero || doc.id.substring(0, 8).toUpperCase(),
          concepto: factura.concepto || 'Suscripción mensual',
          fecha: (factura.createdAt && typeof factura.createdAt.toDate === 'function') ? factura.createdAt.toDate() : new Date(factura.createdAt || new Date()),
          fechaVencimiento: (factura.fechaVencimiento && typeof factura.fechaVencimiento.toDate === 'function') ? factura.fechaVencimiento.toDate() : new Date(factura.fechaVencimiento || new Date()),
          monto: factura.monto || 0,
          estado: factura.estado || 'pendiente'
        });
      });

    } catch (error) {
      console.log('⚠️ [Finanzas Empresa] Colección saas_invoices no existe aún, retornando array vacío');
    }

    res.json({
      success: true,
      data: facturasPendientes
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al obtener facturas pendientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener facturas pendientes',
      error: error.message
    });
  }
};

/**
 * Obtiene la tasa de cambio del Banco Central de la República Dominicana
 * API: https://www.bancentral.gov.do/
 */
async function obtenerTasaDolar() {
  try {
    // TODO: Integrar con API real del Banco Central
    // Por ahora retornamos una tasa fija

    // API del Banco Central (ejemplo):
    // const response = await axios.get('https://api.bancentral.gov.do/tasas/dolar');
    // return response.data.tasa;

    // Tasa fija temporal
    return 58.50;

  } catch (error) {
    console.error('⚠️ [Finanzas Empresa] Error al obtener tasa del Banco Central, usando tasa por defecto:', error);
    // Tasa por defecto en caso de error
    return 58.50;
  }
}

// ============================================
// ENDPOINTS DE SUSCRIPCIONES SAAS
// ============================================

/**
 * GET /api/finanzas/empresa/planes-disponibles
 * Obtiene todos los planes SaaS disponibles
 */
export const getPlanesDisponibles = async (req, res) => {
  try {
    const planes = obtenerTodosLosPlanes();

    // Calcular ahorro estimado del plan automatizado
    const ahorroAutomatizacion = calcularAhorroAutomatizacion();

    res.json({
      success: true,
      data: {
        planes,
        ahorroAutomatizacion
      }
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al obtener planes disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener planes disponibles',
      error: error.message
    });
  }
};

/**
 * POST /api/finanzas/empresa/cambiar-plan
 * Cambia el plan de suscripción de la empresa
 */
export const cambiarPlan = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    const { nuevoPlanId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'CompanyId requerido'
      });
    }

    if (!nuevoPlanId) {
      return res.status(400).json({
        success: false,
        message: 'nuevoPlanId requerido'
      });
    }

    // Verificar que el plan existe
    const nuevoPlan = obtenerPlan(nuevoPlanId);
    if (!nuevoPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    // Obtener datos actuales de la empresa
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    const companyData = companyDoc.data();
    const planActual = companyData.plan || 'operativo';

    // Verificar límites actuales vs nuevo plan
    const uso = await calcularUsoActual(companyId);
    const advertencias = [];

    // Verificar límite de camiones
    if (nuevoPlan.limites.camiones !== -1 && uso.camiones > nuevoPlan.limites.camiones) {
      advertencias.push(`Actualmente tienes ${uso.camiones} camiones, pero el plan ${nuevoPlan.nombre} solo permite ${nuevoPlan.limites.camiones}`);
    }

    // Verificar límite de usuarios
    if (nuevoPlan.limites.usuarios !== -1 && uso.usuarios > nuevoPlan.limites.usuarios) {
      advertencias.push(`Actualmente tienes ${uso.usuarios} usuarios, pero el plan ${nuevoPlan.nombre} solo permite ${nuevoPlan.limites.usuarios}`);
    }

    // Si hay advertencias, retornarlas
    if (advertencias.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cambiar al plan seleccionado debido a los siguientes problemas',
        advertencias
      });
    }

    // Actualizar el plan en la base de datos
    await db.collection('companies').doc(companyId).update({
      plan: nuevoPlanId,
      planAnterior: planActual,
      planActualizadoAt: new Date(),
      planActualizadoPor: req.userData.uid
    });

    // Crear registro de cambio de plan (para historial)
    await db.collection('cambios_plan').add({
      companyId,
      planAnterior: planActual,
      planNuevo: nuevoPlanId,
      fecha: new Date(),
      usuarioId: req.userData.uid,
      usuarioEmail: req.userData.email
    });

    res.json({
      success: true,
      message: `Plan actualizado exitosamente a ${nuevoPlan.nombre}`,
      data: {
        planAnterior: planActual,
        planNuevo: nuevoPlanId,
        planNombre: nuevoPlan.nombre
      }
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al cambiar plan:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cambiar plan de suscripción',
      error: error.message
    });
  }
};

/**
 * GET /api/finanzas/empresa/verificar-limites
 * Verifica si la empresa está dentro de los límites de su plan actual
 */
export const verificarLimites = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'CompanyId requerido'
      });
    }

    // Obtener datos de la empresa
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Empresa no encontrada'
      });
    }

    const companyData = companyDoc.data();
    const planId = companyData.plan || 'operativo';
    const plan = obtenerPlan(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan no encontrado'
      });
    }

    // Calcular uso actual
    const uso = await calcularUsoActual(companyId);

    // Verificar cada límite
    const verificaciones = {
      camiones: {
        limite: plan.limites.camiones,
        uso: uso.camiones,
        disponible: plan.limites.camiones === -1 ? 'Ilimitado' : plan.limites.camiones - uso.camiones,
        excedido: plan.limites.camiones !== -1 && uso.camiones > plan.limites.camiones,
        porcentaje: plan.limites.camiones === -1 ? 0 : Math.round((uso.camiones / plan.limites.camiones) * 100)
      },
      usuarios: {
        limite: plan.limites.usuarios,
        uso: uso.usuarios,
        disponible: plan.limites.usuarios === -1 ? 'Ilimitado' : plan.limites.usuarios - uso.usuarios,
        excedido: plan.limites.usuarios !== -1 && uso.usuarios > plan.limites.usuarios,
        porcentaje: plan.limites.usuarios === -1 ? 0 : Math.round((uso.usuarios / plan.limites.usuarios) * 100)
      },
      recolecciones: {
        limite: plan.limites.recolecciones,
        uso: uso.recolecciones,
        disponible: plan.limites.recolecciones === -1 ? 'Ilimitado' : plan.limites.recolecciones - uso.recolecciones,
        excedido: plan.limites.recolecciones !== -1 && uso.recolecciones > plan.limites.recolecciones,
        porcentaje: plan.limites.recolecciones === -1 ? 0 : Math.round((uso.recolecciones / plan.limites.recolecciones) * 100)
      }
    };

    // Generar alertas si algún límite está cerca o excedido
    const alertas = [];
    Object.entries(verificaciones).forEach(([tipo, datos]) => {
      if (datos.excedido) {
        alertas.push({
          tipo: 'error',
          recurso: tipo,
          mensaje: `Has excedido el límite de ${tipo}. Límite: ${datos.limite}, Uso: ${datos.uso}`
        });
      } else if (datos.porcentaje >= 80 && datos.porcentaje < 100) {
        alertas.push({
          tipo: 'warning',
          recurso: tipo,
          mensaje: `Estás cerca del límite de ${tipo}. Uso: ${datos.porcentaje}%`
        });
      }
    });

    res.json({
      success: true,
      data: {
        plan: {
          id: planId,
          nombre: plan.nombre
        },
        verificaciones,
        alertas,
        todoOK: alertas.filter(a => a.tipo === 'error').length === 0
      }
    });

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al verificar límites:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar límites del plan',
      error: error.message
    });
  }
};

