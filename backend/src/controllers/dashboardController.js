// backend/src/controllers/dashboardController.js
import { db } from '../config/firebase.js';

/**
 * Obtener estadísticas para Super Admin
 * Ve datos de TODAS las empresas
 */
export const getStatsSuperAdmin = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas Super Admin...');

    // Contar empresas
    const companiesSnapshot = await db.collection('companies').get();
    const totalCompanies = companiesSnapshot.size;

    // Contar usuarios totales
    const usersSnapshot = await db.collection('usuarios').get();
    const totalUsers = usersSnapshot.size;

    // Contar por rol
    const rolesCounts = {
      admin_general: 0,
      recolector: 0,
      almacen_eeuu: 0,
      secretaria: 0,
      almacen_rd: 0,
      repartidor: 0
    };

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.rol && rolesCounts.hasOwnProperty(user.rol)) {
        rolesCounts[user.rol]++;
      }
    });

    // Contar recolecciones totales
    const recoleccionesSnapshot = await db.collection('recolecciones').get();
    const totalRecolecciones = recoleccionesSnapshot.size;

    // Contar por estado
    const recoleccionesEstados = {
      pendiente: 0,
      confirmada: 0,
      recolectada: 0,
      en_almacen: 0,
      cancelada: 0
    };

    recoleccionesSnapshot.forEach(doc => {
      const rec = doc.data();
      if (rec.estado && recoleccionesEstados.hasOwnProperty(rec.estado)) {
        recoleccionesEstados[rec.estado]++;
      }
    });

    // Contar embarques totales
    const embarquesSnapshot = await db.collection('embarques').get();
    const totalEmbarques = embarquesSnapshot.size;

    // Contar rutas totales
    const rutasSnapshot = await db.collection('rutas').get();
    const totalRutas = rutasSnapshot.size;

    // Contar facturas totales
    const facturasSnapshot = await db.collection('facturas').get();
    const totalFacturas = facturasSnapshot.size;

    // Estadísticas de facturas
    const facturasEstados = {
      pendiente: 0,
      asignada: 0,
      entregada: 0,
      no_entregada: 0
    };

    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      if (factura.estado && facturasEstados.hasOwnProperty(factura.estado)) {
        facturasEstados[factura.estado]++;
      }
    });

    // Actividad reciente (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecolecciones = recoleccionesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.fecha_creacion && new Date(data.fecha_creacion) >= thirtyDaysAgo;
    }).length;

    const recentEmbarques = embarquesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.fecha_creacion && new Date(data.fecha_creacion) >= thirtyDaysAgo;
    }).length;

    // Respuesta
    const stats = {
      empresas: {
        total: totalCompanies,
        activas: totalCompanies // TODO: agregar campo 'activa' a companies
      },
      usuarios: {
        total: totalUsers,
        porRol: rolesCounts
      },
      recolecciones: {
        total: totalRecolecciones,
        porEstado: recoleccionesEstados,
        ultimos30Dias: recentRecolecciones
      },
      embarques: {
        total: totalEmbarques,
        ultimos30Dias: recentEmbarques
      },
      rutas: {
        total: totalRutas,
        activas: rutasSnapshot.docs.filter(doc => doc.data().estado === 'activa').length
      },
      facturas: {
        total: totalFacturas,
        porEstado: facturasEstados
      }
    };

    console.log('✅ Estadísticas Super Admin obtenidas:', stats);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas Super Admin:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
};

/**
 * Obtener estadísticas para Admin General
 * Ve datos solo de SU empresa
 */
export const getStatsAdminGeneral = async (req, res) => {
  try {
    const { companyId } = req.userData;

    if (!companyId) {
      return res.status(400).json({ error: 'No se encontró la empresa del usuario' });
    }

    console.log(`📊 Obteniendo estadísticas para empresa: ${companyId}`);

    // Contar usuarios de la empresa
    const usersSnapshot = await db.collection('usuarios')
      .where('companyId', '==', companyId)
      .get();
    
    const totalUsers = usersSnapshot.size;

    // Contar por rol
    const rolesCounts = {
      admin_general: 0,
      recolector: 0,
      almacen_eeuu: 0,
      secretaria: 0,
      almacen_rd: 0,
      repartidor: 0
    };

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      if (user.rol && rolesCounts.hasOwnProperty(user.rol)) {
        rolesCounts[user.rol]++;
      }
    });

    // Contar recolecciones de la empresa
    const recoleccionesSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .get();
    
    const totalRecolecciones = recoleccionesSnapshot.size;

    // Contar por estado
    const recoleccionesEstados = {
      pendiente: 0,
      confirmada: 0,
      recolectada: 0,
      en_almacen: 0,
      cancelada: 0
    };

    recoleccionesSnapshot.forEach(doc => {
      const rec = doc.data();
      if (rec.estado && recoleccionesEstados.hasOwnProperty(rec.estado)) {
        recoleccionesEstados[rec.estado]++;
      }
    });

    // Contar embarques de la empresa
    const embarquesSnapshot = await db.collection('embarques')
      .where('companyId', '==', companyId)
      .get();
    
    const totalEmbarques = embarquesSnapshot.size;

    // Contar rutas de la empresa
    const rutasSnapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .get();
    
    const totalRutas = rutasSnapshot.size;

    // Contar facturas de la empresa
    const facturasSnapshot = await db.collection('facturas')
      .where('companyId', '==', companyId)
      .get();
    
    const totalFacturas = facturasSnapshot.size;

    // Estadísticas de facturas
    const facturasEstados = {
      pendiente: 0,
      asignada: 0,
      entregada: 0,
      no_entregada: 0
    };

    facturasSnapshot.forEach(doc => {
      const factura = doc.data();
      if (factura.estado && facturasEstados.hasOwnProperty(factura.estado)) {
        facturasEstados[factura.estado]++;
      }
    });

    // Actividad reciente (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecolecciones = recoleccionesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.fecha_creacion && new Date(data.fecha_creacion) >= thirtyDaysAgo;
    }).length;

    const recentEmbarques = embarquesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.fecha_creacion && new Date(data.fecha_creacion) >= thirtyDaysAgo;
    }).length;

    // Obtener información de la empresa
    const companyDoc = await db.collection('companies').doc(companyId).get();
    const companyData = companyDoc.exists ? companyDoc.data() : null;

    // Respuesta
    const stats = {
      empresa: {
        id: companyId,
        nombre: companyData?.nombre || 'Sin nombre',
        plan: companyData?.plan || 'basic'
      },
      usuarios: {
        total: totalUsers,
        porRol: rolesCounts
      },
      recolecciones: {
        total: totalRecolecciones,
        porEstado: recoleccionesEstados,
        ultimos30Dias: recentRecolecciones
      },
      embarques: {
        total: totalEmbarques,
        ultimos30Dias: recentEmbarques
      },
      rutas: {
        total: totalRutas,
        activas: rutasSnapshot.docs.filter(doc => doc.data().estado === 'activa').length,
        completadas: rutasSnapshot.docs.filter(doc => doc.data().estado === 'completada').length
      },
      facturas: {
        total: totalFacturas,
        porEstado: facturasEstados,
        noEntregadas: facturasEstados.no_entregada
      }
    };

    console.log('✅ Estadísticas Admin General obtenidas:', stats);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas Admin General:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
};

/**
 * Obtener estadísticas generales (público)
 * Para gráficos y widgets básicos
 */
export const getStatsPublic = async (req, res) => {
  try {
    const { companyId, rol } = req.userData;

    // Si es super admin, mostrar stats globales
    if (rol === 'super_admin') {
      return getStatsSuperAdmin(req, res);
    }

    // Si es admin general, mostrar stats de su empresa
    if (rol === 'admin_general') {
      return getStatsAdminGeneral(req, res);
    }

    // Para otros roles, mostrar stats limitadas
    const stats = {
      mensaje: 'Estadísticas limitadas para este rol',
      rol: rol
    };

    res.json(stats);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas públicas:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: error.message 
    });
  }
};