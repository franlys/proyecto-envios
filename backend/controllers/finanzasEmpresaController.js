// Controlador de Finanzas Empresariales - Para Propietarios
// Muestra finanzas operativas de su empresa con conversión de monedas
// Repartidores (RD$) -> USD, Recolectores (USD)
const db = require('../config/firebase');
const axios = require('axios');

/**
 * GET /api/finanzas/empresa/overview
 * Obtiene el overview financiero de la empresa del propietario
 */
exports.getOverview = async (req, res) => {
  try {
    const { dateRange = '30' } = req.query;
    const { companyId } = req.user; // Del middleware de autenticación

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
    const facturasSnapshot = await db.collection('facturas')
      .where('empresaId', '==', companyId)
      .where('estado', '==', 'entregado')
      .where('fechaEntrega', '>=', startDate)
      .get();

    let ingresosTotal = 0;
    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      // Asumiendo que el precio viene en USD
      ingresosTotal += factura.precio || 0;
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
      .where('empresaId', '==', companyId)
      .where('estado', 'in', ['pendiente', 'en_ruta', 'en_almacen'])
      .get();

    // 5. Calcular cambios vs mes anterior (mock - implementar lógica real)
    const cambios = {
      ingresos: 12.5,
      gastos: 8.3,
      utilidad: 18.7,
      facturas: 5.2
    };

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
    console.error('❌ Error al obtener overview empresa:', error);
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
    // 1. Gastos de Repartidores (en RD$)
    const pagosRepartidoresSnapshot = await db.collection('pagos_repartidores')
      .where('empresaId', '==', companyId)
      .where('fecha', '>=', startDate)
      .get();

    let gastosRepartidoresRD = 0;
    pagosRepartidoresSnapshot.forEach(doc => {
      const pago = doc.data();
      // Asumiendo que los pagos a repartidores vienen en RD$
      gastosRepartidoresRD += pago.monto || 0;
    });

    const gastosRepartidoresUSD = gastosRepartidoresRD / tasaDolar;

    // 2. Gastos de Recolectores (en USD)
    const pagosRecolectoresSnapshot = await db.collection('pagos_recolectores')
      .where('empresaId', '==', companyId)
      .where('fecha', '>=', startDate)
      .get();

    let gastosRecolectoresUSD = 0;
    pagosRecolectoresSnapshot.forEach(doc => {
      const pago = doc.data();
      // Los recolectores cobran en USD
      gastosRecolectoresUSD += pago.monto || 0;
    });

    // 3. Otros gastos (operacionales, etc.)
    const otrosGastosSnapshot = await db.collection('gastos_operacionales')
      .where('empresaId', '==', companyId)
      .where('fecha', '>=', startDate)
      .get();

    let otrosGastosUSD = 0;
    otrosGastosSnapshot.forEach(doc => {
      const gasto = doc.data();
      // Convertir según la moneda del gasto
      if (gasto.moneda === 'RD$' || gasto.moneda === 'DOP') {
        otrosGastosUSD += (gasto.monto || 0) / tasaDolar;
      } else {
        otrosGastosUSD += gasto.monto || 0;
      }
    });

    return {
      repartidoresRD: gastosRepartidoresRD,
      repartidoresUSD: gastosRepartidoresUSD,
      recolectoresUSD: gastosRecolectoresUSD,
      otrosUSD: otrosGastosUSD
    };

  } catch (error) {
    console.error('❌ Error al calcular gastos:', error);
    throw error;
  }
}

/**
 * GET /api/finanzas/empresa/metricas-mensuales
 * Obtiene métricas mensuales para gráficos
 */
exports.getMetricasMensuales = async (req, res) => {
  try {
    const { meses = 6 } = req.query;
    const { companyId } = req.user;

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
        .where('empresaId', '==', companyId)
        .where('estado', '==', 'entregado')
        .where('fechaEntrega', '>=', inicioMes)
        .where('fechaEntrega', '<=', finMes)
        .get();

      let ingresos = 0;
      facturasSnapshot.forEach(doc => {
        ingresos += doc.data().precio || 0;
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
    console.error('❌ Error al obtener métricas mensuales:', error);
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
exports.getTasaDolar = async (req, res) => {
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
    console.error('❌ Error al obtener tasa de dólar:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tasa de cambio',
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
    console.error('⚠️ Error al obtener tasa del Banco Central, usando tasa por defecto:', error);
    // Tasa por defecto en caso de error
    return 58.50;
  }
}
