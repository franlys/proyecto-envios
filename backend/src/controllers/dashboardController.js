// backend/src/controllers/dashboardController.js
import { db } from '../config/firebase.js';

/**
 * Obtener estadísticas para Super Admin
 * Ve datos de TODAS las empresas
 */
export const getStatsSuperAdmin = async (req, res) => {
  try {
    console.log('📊 Obteniendo estadísticas Super Admin...');

    // Definir todas las promesas de consulta
    // ✅ CORRECCIÓN: Usar solo 'recolecciones' (facturas es colección legacy/incorrecta)
    const companiesPromise = db.collection('companies').get();
    const usersPromise = db.collection('usuarios').get();
    const recoleccionesPromise = db.collection('recolecciones').get();
    const embarquesPromise = db.collection('embarques').get();
    const rutasPromise = db.collection('rutas').get();

    // Ejecutarlas todas al mismo tiempo
    const [
      companiesSnapshot,
      usersSnapshot,
      recoleccionesSnapshot,
      embarquesSnapshot,
      rutasSnapshot
    ] = await Promise.all([
      companiesPromise,
      usersPromise,
      recoleccionesPromise,
      embarquesPromise,
      rutasPromise
    ]);

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
    // Estados de rutas activas: asignada, cargada, en_entrega
    const rutasActivas = rutasSnapshot.docs.filter(doc => {
      const estado = doc.data().estado;
      return estado === 'asignada' || estado === 'cargada' || estado === 'en_entrega';
    }).length;
    const rutasEnCurso = rutasActivas;

    // ✅ CORRECCIÓN: Contar recolecciones (no facturas)
    const totalFacturas = recoleccionesSnapshot.size;

    // Estadísticas de recolecciones
    const facturasEstados = {
      pendiente: 0,
      asignada: 0,
      entregada: 0,
      no_entregada: 0
    };

    recoleccionesSnapshot.forEach(doc => {
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
      success: true,
      data: {
        empresa: null,
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
      }
    };

    console.log('✅ Estadísticas Super Admin obtenidas');
    res.json(stats);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas Super Admin:', error);
    res.status(500).json({
      success: false,
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
      return res.status(400).json({
        success: false,
        error: 'No se encontró la empresa del usuario'
      });
    }

    console.log(`📊 Obteniendo estadísticas para empresa: ${companyId}`);

    // Definir todas las promesas de consulta
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
    // ✅ CORRECCIÓN: Ya no consultamos 'facturas', usamos recolecciones
    const companyPromise = db.collection('companies').doc(companyId).get();

    // Ejecutarlas todas al mismo tiempo
    const [
      usersSnapshot,
      recoleccionesSnapshot,
      embarquesSnapshot,
      rutasSnapshot,
      companyDoc
    ] = await Promise.all([
      usersPromise,
      recoleccionesPromise,
      embarquesPromise,
      rutasPromise,
      companyPromise
    ]);

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
    // Estados de rutas activas: asignada, cargada, en_entrega
    const rutasActivas = rutasSnapshot.docs.filter(doc => {
      const estado = doc.data().estado;
      return estado === 'asignada' || estado === 'cargada' || estado === 'en_entrega';
    }).length;
    const rutasEnCurso = rutasActivas;
    const rutasCompletadas = rutasSnapshot.docs.filter(doc => doc.data().estado === 'completada').length;

    // DEBUG: Ver qué rutas se están contando
    console.log(`🔍 DEBUG - Total rutas: ${totalRutas}, Activas: ${rutasActivas}, En curso: ${rutasEnCurso}`);
    rutasSnapshot.docs.forEach(doc => {
      const estado = doc.data().estado;
      const companyIdRuta = doc.data().companyId;
      console.log(`  - Ruta ${doc.id}: estado="${estado}", companyId="${companyIdRuta}"`);
    });

    // ✅ CORRECCIÓN: Contar recolecciones de la empresa (no facturas)
    const totalFacturas = recoleccionesSnapshot.size;

    // Estadísticas de recolecciones
    const facturasEstados = {
      pendiente: 0,
      asignada: 0,
      entregada: 0,
      no_entregada: 0
    };

    recoleccionesSnapshot.forEach(doc => {
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

    // Obtener información de la empresa
    const companyData = companyDoc.exists ? companyDoc.data() : null;

    // Respuesta con formato adaptado para el frontend
    const stats = {
      success: true,
      data: {
        empresa: {
          id: companyId,
          nombre: companyData?.nombre || 'Sin nombre',
          plan: companyData?.plan || 'operativo'
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
      }
    };

    console.log('✅ Estadísticas Admin General obtenidas');
    res.json(stats);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas Admin General:', error);
    res.status(500).json({
      success: false,
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
      success: true,
      data: {
        mensaje: 'Estadísticas limitadas para este rol',
        rol: rol
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas públicas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
};

/**
 * 📦 Obtener estadísticas detalladas de un contenedor específico
 * Incluye: progreso, confirmación, entregas, facturas, estados
 */
export const getContenedorStats = async (req, res) => {
  try {
    const { contenedorId } = req.params;
    const { companyId, rol } = req.userData;

    console.log(`📦 Obteniendo estadísticas del contenedor: ${contenedorId}`);

    // Obtener datos del contenedor
    const contenedorDoc = await db.collection('contenedores').doc(contenedorId).get();

    if (!contenedorDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Contenedor no encontrado'
      });
    }

    const contenedorData = contenedorDoc.data();

    // Verificar permisos (solo si no es super_admin)
    if (rol !== 'super_admin' && contenedorData.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver este contenedor'
      });
    }

    // Obtener todas las facturas (recolecciones) del contenedor
    const facturasSnapshot = await db.collection('recolecciones')
      .where('numeroContenedor', '==', contenedorData.numeroContenedor)
      .get();

    const facturas = [];
    facturasSnapshot.forEach(doc => {
      facturas.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Calcular estadísticas
    const totalFacturas = facturas.length;
    const facturasConfirmadas = facturas.filter(f =>
      f.estadoGeneral === 'confirmada' ||
      f.estadoGeneral === 'en_transito' ||
      f.estadoGeneral === 'recibida_rd' ||
      f.estadoGeneral === 'lista_entrega' ||
      f.estadoGeneral === 'en_ruta_entrega' ||
      f.estadoGeneral === 'entregada'
    ).length;

    const facturasEnTransito = facturas.filter(f =>
      f.estadoGeneral === 'en_transito' ||
      f.estadoGeneral === 'recibida_rd' ||
      f.estadoGeneral === 'lista_entrega' ||
      f.estadoGeneral === 'en_ruta_entrega' ||
      f.estadoGeneral === 'entregada'
    ).length;

    const facturasRecibidasRD = facturas.filter(f =>
      f.estadoGeneral === 'recibida_rd' ||
      f.estadoGeneral === 'lista_entrega' ||
      f.estadoGeneral === 'en_ruta_entrega' ||
      f.estadoGeneral === 'entregada'
    ).length;

    const facturasListaEntrega = facturas.filter(f =>
      f.estadoGeneral === 'lista_entrega' ||
      f.estadoGeneral === 'en_ruta_entrega' ||
      f.estadoGeneral === 'entregada'
    ).length;

    const facturasEnRutaEntrega = facturas.filter(f =>
      f.estadoGeneral === 'en_ruta_entrega' ||
      f.estadoGeneral === 'entregada'
    ).length;

    const facturasEntregadas = facturas.filter(f =>
      f.estadoGeneral === 'entregada'
    ).length;

    const facturasNoEntregadas = facturas.filter(f =>
      f.estadoGeneral === 'no_entregada'
    ).length;

    const facturasPendientes = facturas.filter(f =>
      f.estadoGeneral === 'pendiente' ||
      f.estadoGeneral === 'recolectada' ||
      !f.estadoGeneral
    ).length;

    // Calcular porcentajes
    const porcentajeConfirmacion = totalFacturas > 0
      ? Math.round((facturasConfirmadas / totalFacturas) * 100)
      : 0;

    const porcentajeEntrega = totalFacturas > 0
      ? Math.round((facturasEntregadas / totalFacturas) * 100)
      : 0;

    const porcentajeEnTransito = totalFacturas > 0
      ? Math.round((facturasEnTransito / totalFacturas) * 100)
      : 0;

    const porcentajeRecibidasRD = totalFacturas > 0
      ? Math.round((facturasRecibidasRD / totalFacturas) * 100)
      : 0;

    // Calcular progreso general del contenedor
    let progresoGeneral = 0;
    if (totalFacturas > 0) {
      // Lógica de progreso:
      // 0-25%: Recolección (facturas creadas)
      // 25-50%: Confirmación
      // 50-75%: En tránsito
      // 75-90%: Recibidas en RD
      // 90-100%: Entregadas

      if (facturasEntregadas === totalFacturas) {
        progresoGeneral = 100;
      } else if (facturasRecibidasRD > 0) {
        progresoGeneral = 75 + Math.round((facturasEntregadas / totalFacturas) * 25);
      } else if (facturasEnTransito > 0) {
        progresoGeneral = 50 + Math.round((facturasEnTransito / totalFacturas) * 25);
      } else if (facturasConfirmadas > 0) {
        progresoGeneral = 25 + Math.round((facturasConfirmadas / totalFacturas) * 25);
      } else {
        progresoGeneral = Math.round((totalFacturas > 0 ? 25 : 0));
      }
    }

    // Determinar estado actual
    let estadoActual = 'CREADO';
    if (facturasEntregadas === totalFacturas && totalFacturas > 0) {
      estadoActual = 'COMPLETADO';
    } else if (facturasRecibidasRD > 0) {
      estadoActual = 'EN_ENTREGA';
    } else if (facturasEnTransito > 0) {
      estadoActual = 'EN_TRANSITO';
    } else if (facturasConfirmadas > 0) {
      estadoActual = 'CONFIRMADO';
    } else if (totalFacturas > 0) {
      estadoActual = 'EN_RECOLECCION';
    }

    // Calcular valor total
    const valorTotal = facturas.reduce((sum, f) => {
      const precioTotal = (f.items || []).reduce((itemSum, item) => {
        return itemSum + (parseFloat(item.precio) || 0);
      }, 0);
      return sum + precioTotal;
    }, 0);

    // Obtener rutas asociadas al contenedor
    const rutasSnapshot = await db.collection('rutas')
      .where('contenedorId', '==', contenedorId)
      .get();

    const rutas = [];
    rutasSnapshot.forEach(doc => {
      rutas.push({
        id: doc.id,
        nombre: doc.data().nombre,
        tipo: doc.data().tipo,
        estado: doc.data().estado,
        totalPaquetes: (doc.data().facturas || []).length
      });
    });

    // Respuesta completa
    res.json({
      success: true,
      contenedor: {
        id: contenedorId,
        numeroContenedor: contenedorData.numeroContenedor,
        fechaCreacion: contenedorData.createdAt,
        fechaEmbarque: contenedorData.fechaEmbarque,
        estado: estadoActual,
        progresoGeneral,

        // Totales
        totalFacturas,
        valorTotal,
        totalRutas: rutas.length,

        // Estadísticas por estado
        facturasPendientes,
        facturasConfirmadas,
        facturasEnTransito,
        facturasRecibidasRD,
        facturasListaEntrega,
        facturasEnRutaEntrega,
        facturasEntregadas,
        facturasNoEntregadas,

        // Porcentajes
        porcentajeConfirmacion,
        porcentajeEnTransito,
        porcentajeRecibidasRD,
        porcentajeEntrega,

        // Información adicional
        cargadorId: contenedorData.cargadorId,
        notas: contenedorData.notas,

        // Rutas asociadas
        rutas
      },

      // Lista de facturas para análisis detallado
      facturas: facturas.map(f => ({
        id: f.id,
        codigoTracking: f.codigoTracking,
        estadoGeneral: f.estadoGeneral,
        remitente: f.remitente?.nombre,
        destinatario: f.destinatario?.nombre,
        valorItems: (f.items || []).reduce((sum, item) => sum + (parseFloat(item.precio) || 0), 0)
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del contenedor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del contenedor',
      error: error.message
    });
  }
};

/**
 * 🚚 Obtener estadísticas detalladas de una ruta específica
 * Incluye: eficiencia, entregas, facturas pendientes, estados
 */
export const getRutaStats = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { companyId, rol } = req.userData;

    console.log(`🚚 Obteniendo estadísticas de la ruta: ${rutaId}`);

    // Obtener datos de la ruta
    const rutaDoc = await db.collection('rutas').doc(rutaId).get();

    if (!rutaDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const rutaData = rutaDoc.data();

    // Verificar permisos (solo si no es super_admin)
    if (rol !== 'super_admin' && rutaData.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta ruta'
      });
    }

    // Obtener IDs de facturas en la ruta
    const facturasData = rutaData.facturas || [];
    console.log(`📦 Facturas en ruta: ${facturasData.length}`);

    // ✅ CORRECCIÓN: Extraer IDs de los objetos (puede ser un array de strings o de objetos)
    const facturasIds = facturasData.map(item => {
      // Si es un string, es un ID directo
      if (typeof item === 'string') {
        return item;
      }
      // Si es un objeto, extraer el ID
      if (typeof item === 'object' && item !== null) {
        return item.id || item.facturaId;
      }
      return null;
    }).filter(id => id !== null && typeof id === 'string');

    console.log(`📦 IDs válidos extraídos: ${facturasIds.length}`);

    // Obtener todas las facturas (en batches de 30)
    const facturas = [];
    const BATCH_SIZE = 30;

    for (let i = 0; i < facturasIds.length; i += BATCH_SIZE) {
      const batch = facturasIds.slice(i, i + BATCH_SIZE);
      const facturasSnapshot = await db.collection('recolecciones')
        .where('__name__', 'in', batch)
        .get();

      facturasSnapshot.forEach(doc => {
        facturas.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }

    // Calcular estadísticas
    const totalFacturas = facturas.length;

    // Contar por estado
    let facturasEntregadas = 0;
    let facturasPendientes = 0;
    let facturasNoEntregadas = 0;
    let facturasEnRuta = 0;

    facturas.forEach(f => {
      const estado = f.estadoGeneral?.toLowerCase() || f.estado?.toLowerCase();

      if (estado === 'entregada' || estado === 'entregado') {
        facturasEntregadas++;
      } else if (estado === 'no_entregada' || estado === 'no_entregado') {
        facturasNoEntregadas++;
      } else if (estado === 'en_ruta' || estado === 'en_ruta_entrega') {
        facturasEnRuta++;
      } else {
        facturasPendientes++;
      }
    });

    // Calcular porcentajes
    const porcentajeEntrega = totalFacturas > 0
      ? Math.round((facturasEntregadas / totalFacturas) * 100)
      : 0;

    const porcentajeNoEntregadas = totalFacturas > 0
      ? Math.round((facturasNoEntregadas / totalFacturas) * 100)
      : 0;

    const eficiencia = porcentajeEntrega;

    // Calcular valor total
    const valorTotal = facturas.reduce((sum, f) => {
      const precioTotal = (f.items || []).reduce((itemSum, item) => {
        return itemSum + (parseFloat(item.precio) || 0);
      }, 0);
      return sum + precioTotal;
    }, 0);

    // Determinar estado de la ruta
    let estadoRuta = rutaData.estado || 'pendiente';
    let progresoRuta = 0;

    if (totalFacturas > 0) {
      progresoRuta = porcentajeEntrega;
    }

    // Respuesta completa
    res.json({
      success: true,
      data: {
        // Información de la ruta
        id: rutaId,
        nombre: rutaData.nombre,
        tipo: rutaData.tipo,
        estado: estadoRuta,
        fechaCreacion: rutaData.createdAt,
        fechaInicio: rutaData.fechaInicio,
        fechaFin: rutaData.fechaFin,
        repartidorId: rutaData.repartidorId,
        repartidorNombre: rutaData.repartidorNombre,
        zona: rutaData.zona,

        // Totales
        totalFacturas,
        valorTotal,
        progresoRuta,

        // Estadísticas por estado
        facturasEntregadas,
        facturasPendientes,
        facturasNoEntregadas,
        facturasEnRuta,

        // Porcentajes y eficiencia
        porcentajeEntrega,
        porcentajeNoEntregadas,
        eficiencia,

        // Notas
        notas: rutaData.notas
      },

      // Lista de facturas para análisis detallado
      facturas: facturas.map(f => ({
        id: f.id,
        codigoTracking: f.codigoTracking,
        estadoGeneral: f.estadoGeneral,
        destinatario: f.destinatario?.nombre || f.cliente?.nombre,
        direccion: f.destinatario?.direccion || f.cliente?.direccion,
        telefono: f.destinatario?.telefono || f.cliente?.telefono,
        valorItems: (f.items || []).reduce((sum, item) => sum + (parseFloat(item.precio) || 0), 0)
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de la ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de la ruta',
      error: error.message
    });
  }
};