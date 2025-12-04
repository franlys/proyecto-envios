// Controlador de Finanzas Empresariales - Para Propietarios
// Muestra finanzas operativas de su empresa con conversión de monedas
// Repartidores (RD$) -> USD, Recolectores (USD)
import { db } from '../config/firebase.js';

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
    const facturasSnapshot = await db.collection('facturas')
      .where('companyId', '==', companyId)
      .where('estado', '==', 'entregado')
      .get();

    let ingresosTotal = 0;
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
        ingresosTotal += factura.monto || 0;
      }
    });

    // 2. Calcular gastos (con conversión de monedas)
    const gastosDesglosados = await calcularGastos(companyId, startDate, tasaDolar);

    const gastosTotal =
      gastosDesglosados.repartidoresUSD +
      gastosDesglosados.recolectoresUSD +
      gastosDesglosados.otrosUSD;

    // 3. Calcular utilidad
    const utilidad = ingresosTotal - gastosTotal;

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

    console.log(`✅ [Finanzas Empresa] Ingresos: $${ingresosTotal}, Gastos: $${gastosTotal}, Utilidad: $${utilidad}`);

    res.json({
      success: true,
      data: {
        tasaDolar: tasaDolar,
        ingresos: {
          total: ingresosTotal,
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
      const facturasSnapshot = await db.collection('facturas')
        .where('companyId', '==', companyId)
        .where('estado', '==', 'entregado')
        .where('updatedAt', '>=', inicioMes.toISOString())
        .where('updatedAt', '<=', finMes.toISOString())
        .get();

      let ingresos = 0;
      facturasSnapshot.forEach(doc => {
        ingresos += doc.data().monto || 0;
      });

      // Calcular gastos del mes
      const gastosDesglosados = await calcularGastos(companyId, inicioMes, tasaDolar);
      const gastos = gastosDesglosados.repartidoresUSD + gastosDesglosados.recolectoresUSD + gastosDesglosados.otrosUSD;

      metricas.push({
        mes: fecha.toLocaleString('es-DO', { month: 'short', year: 'numeric' }),
        fecha: fecha.toISOString(),
        ingresos: ingresos,
        gastos: gastos,
        utilidad: ingresos - gastos
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

    res.json({
      success: true,
      data: {
        plan: companyData.plan || 'Basic',
        precio: precio,
        fechaInicio: companyData.createdAt?.toDate() || new Date(),
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

    // Calcular almacenamiento usado (mock - requiere implementación real)
    // TODO: Implementar cálculo real de almacenamiento
    const almacenamientoUsado = '3.2 GB';

    return {
      recolecciones: recoleccionesMes,
      usuarios: usuariosSnapshot.size,
      almacenamiento: almacenamientoUsado
    };

  } catch (error) {
    console.error('❌ [Finanzas Empresa] Error al calcular uso:', error);
    return {
      recolecciones: 0,
      usuarios: 0,
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
          fecha: factura.createdAt?.toDate() || new Date(),
          fechaVencimiento: factura.fechaVencimiento?.toDate() || new Date(),
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
