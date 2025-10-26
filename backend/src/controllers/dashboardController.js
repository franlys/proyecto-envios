// backend/src/controllers/dashboardController.js
import { db } from '../config/firebase.js';

/**
 * Obtener estadísticas para Super Admin
 * Ve datos de TODAS las empresas
 */
export const getStatsSuperAdmin = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas Super Admin...');

    // --- INICIA REPARACIÓN ---
    // 1. Definir todas las promesas de consulta
    const companiesPromise = db.collection('companies').get();
    const usersPromise = db.collection('usuarios').get();
    const recoleccionesPromise = db.collection('recolecciones').get();
    const embarquesPromise = db.collection('embarques').get();
    const rutasPromise = db.collection('rutas').get();
    const facturasPromise = db.collection('facturas').get();

    // 2. Ejecutarlas todas al mismo tiempo
    const [
      companiesSnapshot,
      usersSnapshot,
      recoleccionesSnapshot,
      embarquesSnapshot,
      rutasSnapshot,
      facturasSnapshot
    ] = await Promise.all([
      companiesPromise,
      usersPromise,
      recoleccionesPromise,
      embarquesPromise,
      rutasPromise,
      facturasPromise
    ]);
    // --- TERMINA REPARACIÓN ---

    // Contar empresas
    const totalCompanies = companiesSnapshot.size;
    const activeCompanies = companiesSnapshot.docs.filter(doc => doc.data().activo !== false).length;

    // Contar usuarios totales
    const totalUsers = usersSnapshot.size;
    const activeUsers = usersSnapshot.docs.filter(doc => doc.data().activo === true).length;

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
    const totalRecolecciones = recoleccionesSnapshot.size;

    // Contar recolecciones de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recoleccionesHoy = recoleccionesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const fechaCreacion = data.fecha_creacion?.toDate ? data.fecha_creacion.toDate() : new Date(data.fecha_creacion);
      return fechaCreacion >= today;
    }).length;

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
      const estado = rec.estado || rec.status || 'pendiente';
      if (recoleccionesEstados.hasOwnProperty(estado.toLowerCase())) {
        recoleccionesEstados[estado.toLowerCase()]++;
      }
    });

    // Contar embarques totales
    const totalEmbarques = embarquesSnapshot.size;
    const embarquesActivos = embarquesSnapshot.docs.filter(doc => 
      doc.data().estado === 'activo' || doc.data().estado === 'en_proceso'
    ).length;

    // Contar rutas totales
    const totalRutas = rutasSnapshot.size;
    const rutasActivas = rutasSnapshot.docs.filter(doc => 
      doc.data().estado === 'activa' || doc.data().estado === 'en_proceso'
    ).length;
    const rutasEnCurso = rutasActivas; // Alias

    // Contar facturas totales
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
      const estado = (factura.estado || 'pendiente').toLowerCase();
      if (facturasEstados.hasOwnProperty(estado)) {
        facturasEstados[estado]++;
      }
    });

    // Actividad reciente (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecolecciones = recoleccionesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const fechaCreacion = data.fecha_creacion?.toDate ? data.fecha_creacion.toDate() : new Date(data.fecha_creacion);
      return fechaCreacion >= thirtyDaysAgo;
    }).length;

    const recentEmbarques = embarquesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const fechaCreacion = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || data.fecha_creacion);
      return fechaCreacion >= thirtyDaysAgo;
    }).length;

    // Respuesta con formato adaptado para el frontend
    const stats = {
      empresa: null, // Super admin no tiene empresa específica
      usuarios: {
        total: totalUsers,
        activos: activeUsers,
        porRol: rolesCounts
      },
      recolecciones: {
        total: totalRecolecciones,
        hoy: recoleccionesHoy,
        porEstado: recoleccionesEstados,
        ultimos30Dias: recentRecolecciones
      },
      embarques: {
        total: totalEmbarques,
        activos: embarquesActivos,
        ultimos30Dias: recentEmbarques
      },
      rutas: {
        total: totalRutas,
        activas: rutasActivas,
        enCurso: rutasEnCurso
      },
      facturas: {
        total: totalFacturas,
        pendientes: facturasEstados.pendiente,
        entregadas: facturasEstados.entregada,
        noEntregadas: facturasEstados.no_entregada,
        porEstado: facturasEstados
      },
      empresas: {
        total: totalCompanies,
        activas: activeCompanies
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

    // --- INICIA REPARACIÓN ---
    // 1. Definir todas las promesas de consulta
    const usersPromise = db.collection('usuarios')
      .where('companyId', '==', companyId)
      .get();
    const recoleccionesPromise = db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .get();
    const embarquesPromise = db.collection('embarques')
      .where('companyId', '==', companyId)
      .get();
    const rutasPromise = db.collection('rutas')
      .where('companyId', '==', companyId)
      .get();
    const facturasPromise = db.collection('facturas')
      .where('companyId', '==', companyId)
      .get();
    const companyPromise = db.collection('companies').doc(companyId).get();

    // 2. Ejecutarlas todas al mismo tiempo
    const [
      usersSnapshot,
      recoleccionesSnapshot,
      embarquesSnapshot,
      rutasSnapshot,
      facturasSnapshot,
      companyDoc
    ] = await Promise.all([
      usersPromise,
      recoleccionesPromise,
      embarquesPromise,
      rutasPromise,
      facturasPromise,
      companyPromise
    ]);
    // --- TERMINA REPARACIÓN ---

    // Contar usuarios de la empresa
    const totalUsers = usersSnapshot.size;
    const activeUsers = usersSnapshot.docs.filter(doc => doc.data().activo === true).length;

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
    const totalRecolecciones = recoleccionesSnapshot.size;

    // Contar recolecciones de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recoleccionesHoy = recoleccionesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const fechaCreacion = data.fecha_creacion?.toDate ? data.fecha_creacion.toDate() : new Date(data.fecha_creacion);
      return fechaCreacion >= today;
    }).length;

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
      const estado = rec.estado || rec.status || 'pendiente';
      if (recoleccionesEstados.hasOwnProperty(estado.toLowerCase())) {
        recoleccionesEstados[estado.toLowerCase()]++;
      }
    });

    // Contar embarques de la empresa
    const totalEmbarques = embarquesSnapshot.size;
    const embarquesActivos = embarquesSnapshot.docs.filter(doc => 
      doc.data().estado === 'activo' || doc.data().estado === 'en_proceso'
    ).length;

    // Contar rutas de la empresa
    const totalRutas = rutasSnapshot.size;
    const rutasActivas = rutasSnapshot.docs.filter(doc => 
      doc.data().estado === 'activa' || doc.data().estado === 'en_proceso'
    ).length;
    const rutasEnCurso = rutasActivas;
    const rutasCompletadas = rutasSnapshot.docs.filter(doc => doc.data().estado === 'completada').length;

    // Contar facturas de la empresa
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
      const estado = (factura.estado || 'pendiente').toLowerCase();
      if (facturasEstados.hasOwnProperty(estado)) {
        facturasEstados[estado]++;
      }
    });

    // Actividad reciente (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRecolecciones = recoleccionesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const fechaCreacion = data.fecha_creacion?.toDate ? data.fecha_creacion.toDate() : new Date(data.fecha_creacion);
      return fechaCreacion >= thirtyDaysAgo;
    }).length;

    const recentEmbarques = embarquesSnapshot.docs.filter(doc => {
      const data = doc.data();
      const fechaCreacion = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || data.fecha_creacion);
      return fechaCreacion >= thirtyDaysAgo;
    }).length;

    // Obtener información de la empresa (ya obtenida en Promise.all)
    const companyData = companyDoc.exists ? companyDoc.data() : null;

    // Respuesta con formato adaptado para el frontend
    const stats = {
      empresa: {
        id: companyId,
        nombre: companyData?.nombre || 'Sin nombre',
        plan: companyData?.plan || 'basic'
      },
      usuarios: {
        total: totalUsers,
        activos: activeUsers,
        porRol: rolesCounts
      },
      recolecciones: {
        total: totalRecolecciones,
        hoy: recoleccionesHoy,
        porEstado: recoleccionesEstados,
        ultimos30Dias: recentRecolecciones
      },
      embarques: {
        total: totalEmbarques,
        activos: embarquesActivos,
        ultimos30Dias: recentEmbarques
      },
      rutas: {
        total: totalRutas,
        activas: rutasActivas,
        enCurso: rutasEnCurso,
        completadas: rutasCompletadas
      },
      facturas: {
        total: totalFacturas,
        pendientes: facturasEstados.pendiente,
        entregadas: facturasEstados.entregada,
        noEntregadas: facturasEstados.no_entregada,
        porEstado: facturasEstados
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