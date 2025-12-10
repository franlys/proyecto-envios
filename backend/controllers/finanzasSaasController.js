// Controlador de Finanzas SaaS - Para Super Admin
// Muestra métricas del negocio SaaS (suscripciones), NO las finanzas privadas de las empresas
const db = require('../config/firebase');

/**
 * GET /api/finanzas/saas/overview
 * Obtiene el overview financiero del negocio SaaS
 */
exports.getOverview = async (req, res) => {
  try {
    const { dateRange = '30' } = req.query; // 7, 30, 90 días

    // Calcular fechas
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - parseInt(dateRange));

    // 1. Obtener todas las empresas activas
    const empresasSnapshot = await db.collection('empresas')
      .where('activo', '==', true)
      .get();

    const empresasActivas = empresasSnapshot.size;

    // 2. Calcular MRR (Monthly Recurring Revenue)
    let mrrTotal = 0;
    const empresasPorPlan = {
      enterprise: { count: 0, mrr: 0 },
      professional: { count: 0, mrr: 0 },
      basic: { count: 0, mrr: 0 }
    };

    // Precios de los planes (deben venir de configuración)
    const preciosPlanes = {
      enterprise: 1000,
      professional: 400,
      basic: 300
    };

    empresasSnapshot.forEach(doc => {
      const empresa = doc.data();
      const plan = empresa.plan?.toLowerCase() || 'basic';
      const precio = preciosPlanes[plan] || preciosPlanes.basic;

      mrrTotal += precio;
      if (empresasPorPlan[plan]) {
        empresasPorPlan[plan].count++;
        empresasPorPlan[plan].mrr += precio;
      }
    });

    // 3. Calcular ARR (Annual Recurring Revenue)
    const arr = mrrTotal * 12;

    // 4. Obtener facturas generadas por el servicio SaaS (facturas a las empresas)
    const facturasSnapshot = await db.collection('facturas_saas')
      .where('fechaCreacion', '>=', startDate)
      .get();

    const facturasGeneradas = facturasSnapshot.size;

    // 5. Calcular cambios vs mes anterior (mock por ahora - implementar lógica real)
    const cambios = {
      mrr: 15.3,
      empresasActivas: 8.5,
      facturasGeneradas: 12.0,
      arr: 18.2
    };

    res.json({
      success: true,
      data: {
        mrr: {
          total: mrrTotal,
          change: cambios.mrr
        },
        empresasActivas: {
          total: empresasActivas,
          change: cambios.empresasActivas
        },
        facturasGeneradas: {
          total: facturasGeneradas,
          change: cambios.facturasGeneradas
        },
        arr: {
          total: arr,
          change: cambios.arr
        },
        empresasPorPlan: Object.entries(empresasPorPlan).map(([plan, data]) => ({
          plan: plan.charAt(0).toUpperCase() + plan.slice(1),
          count: data.count,
          mrr: data.mrr
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener overview SaaS:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos financieros SaaS',
      error: error.message
    });
  }
};

/**
 * GET /api/finanzas/saas/empresas
 * Obtiene lista de empresas suscritas con sus métricas
 */
exports.getEmpresasSuscritas = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const empresasSnapshot = await db.collection('empresas')
      .where('activo', '==', true)
      .orderBy('fechaSuscripcion', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const empresas = [];
    const preciosPlanes = {
      enterprise: 1000,
      professional: 400,
      basic: 300
    };

    for (const doc of empresasSnapshot.docs) {
      const empresa = doc.data();
      const plan = empresa.plan?.toLowerCase() || 'basic';

      empresas.push({
        id: doc.id,
        nombre: empresa.nombre,
        plan: empresa.plan || 'Basic',
        mrr: preciosPlanes[plan] || preciosPlanes.basic,
        fechaSuscripcion: empresa.fechaSuscripcion?.toDate() || new Date(),
        estado: empresa.activo ? 'activo' : 'inactivo',
        contacto: empresa.contacto || {}
      });
    }

    res.json({
      success: true,
      data: empresas,
      total: empresasSnapshot.size
    });

  } catch (error) {
    console.error('❌ Error al obtener empresas suscritas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener empresas suscritas',
      error: error.message
    });
  }
};

/**
 * GET /api/finanzas/saas/metricas-mensuales
 * Obtiene métricas mensuales para gráficos
 */
exports.getMetricasMensuales = async (req, res) => {
  try {
    const { meses = 6 } = req.query;

    // Generar datos de los últimos N meses
    const metricas = [];
    const now = new Date();

    for (let i = parseInt(meses) - 1; i >= 0; i--) {
      const fecha = new Date(now);
      fecha.setMonth(fecha.getMonth() - i);

      // TODO: Implementar cálculo real desde Firestore
      // Por ahora datos mock con crecimiento progresivo
      const baseRevenue = 10000 + (i * 500);

      metricas.push({
        mes: fecha.toLocaleString('es-DO', { month: 'short', year: 'numeric' }),
        fecha: fecha.toISOString(),
        mrr: baseRevenue + Math.random() * 1000,
        empresasNuevas: Math.floor(Math.random() * 5) + 1,
        churn: Math.floor(Math.random() * 2)
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
