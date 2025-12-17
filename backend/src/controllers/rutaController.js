import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// Helper para obtener ID de compañía de forma segura
const getUserDataSafe = async (uid) => {
  const userDoc = await db.collection('usuarios').doc(uid).get();
  if (!userDoc.exists) return null;
  return userDoc.data();
};

// ============================================================
// 📋 OBTENER TODAS LAS RUTAS (Con protección de fallo)
// ============================================================
export const getAllRutas = async (req, res) => {
  try {
    const userData = req.userData || await getUserDataSafe(req.userData?.uid);
    if (!userData || !userData.companyId) {
      console.warn(`Usuario ${req.userData?.uid} sin compañía o no existe en BD.`);
      return res.json({ success: true, data: [] });
    }

    let query = db.collection('rutas');

    if (userData.rol !== 'super_admin' && userData.rol !== 'propietario' && userData.rol !== 'admin_general') {
      query = query.where('companyId', '==', userData.companyId);
    }

    // Si es repartidor, solo mostrar sus rutas asignadas
    if (userData.rol === 'repartidor') {
      query = query.where('repartidorId', '==', req.userData.uid);
    }

    // Intentamos consulta ordenada
    try {
      const snapshot = await query.orderBy('createdAt', 'desc').limit(50).get();
      const rutas = procesarRutasSnapshot(snapshot);
      return res.json({ success: true, data: rutas });
    } catch (indexError) {
      console.warn("⚠️ Falta índice para ordenar rutas. Usando consulta simple.", indexError.message);
      // Fallback: Consulta sin ordenamiento (evita error 500)
      const snapshot = await query.limit(50).get();
      const rutas = procesarRutasSnapshot(snapshot);
      // Ordenar manualmente en memoria
      rutas.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, data: rutas });
    }
  } catch (error) {
    console.error('❌ Error crítico en getAllRutas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Función auxiliar para procesar rutas de forma segura
const procesarRutasSnapshot = (snapshot) => {
  return snapshot.docs.map(doc => {
    const data = doc.data();

    // Validación defensiva de data
    if (!data || typeof data !== 'object') {
      return {
        id: doc.id,
        totalFacturas: 0,
        facturasEntregadas: 0,
        facturasNoEntregadas: 0,
        totalGastos: 0,
        empleadoNombre: 'Sin asignar',
        montoAsignado: 0
      };
    }

    // Calcular totalFacturas de forma defensiva
    let totalFacturas = 0;
    if (data.totalFacturas && !isNaN(data.totalFacturas)) {
      totalFacturas = parseInt(data.totalFacturas);
    } else if (data.facturas && Array.isArray(data.facturas)) {
      totalFacturas = data.facturas.length;
    }

    const facturasEntregadas = parseInt(data.facturasEntregadas) || 0;
    const totalGastos = parseFloat(data.totalGastos) || 0;
    const montoAsignado = parseFloat(data.montoAsignado) || 0;

    return {
      id: doc.id,
      ...data,
      totalFacturas,
      facturasEntregadas,
      facturasNoEntregadas: totalFacturas - facturasEntregadas,
      totalGastos,
      empleadoNombre: data.repartidorNombre || data.empleadoNombre || 'Sin asignar',
      montoAsignado
    };
  });
};

// ============================================================
// 🚚 CREAR RUTA AVANZADA (Con validación robusta)
// ============================================================
export const createRutaAvanzada = async (req, res) => {
  try {
    const {
      nombre, repartidorId, cargadoresIds, facturasIds,
      configuracion, montoAsignado
    } = req.body;

    if (!repartidorId || !cargadoresIds?.length || !facturasIds?.length) {
      return res.status(400).json({ success: false, error: 'Faltan datos (repartidor, cargadores o facturas)' });
    }

    const userData = await getUserDataSafe(req.userData.uid);
    if (!userData?.companyId) return res.status(403).json({ error: 'Usuario sin compañía asignada' });

    // =========================================================
    // 🛡️ ENFORCEMENT DE LÍMITES SAAS (Rutas Activas)
    // =========================================================
    const companyDoc = await db.collection('companies').doc(userData.companyId).get();
    if (!companyDoc.exists) return res.status(404).json({ error: 'Compañía no encontrada' });
    const companyData = companyDoc.data();
    const plan = companyData.plan || 'operativo';

    // Límites de Rutas Simultáneas
    const PLAN_LIMITS = {
      operativo: 10,
      automatizado: 25,
      smart: Infinity
    };

    const limit = PLAN_LIMITS[plan] || 10; // Default a operativo si plan desconocido

    if (limit !== Infinity) {
      // Contar rutas activas (no completadas ni canceladas)
      // Nota: Firestore count() es más eficiente pero requiere admin SDK v11+ o query simple. 
      // Usaremos get().size por compatibilidad segura si no estamos seguros de la versión,
      // pero idealmente count().
      const activeRoutesSnap = await db.collection('rutas')
        .where('companyId', '==', userData.companyId)
        .where('estado', 'in', ['asignada', 'en_curso', 'pendiente']) // Estados activos
        .get();

      const activeCount = activeRoutesSnap.size;

      if (activeCount >= limit) {
        return res.status(403).json({
          success: false,
          error: 'Límite de rutas alcanzado',
          message: `Tu plan '${plan.toUpperCase()}' solo permite ${limit} rutas activas simultáneamente. Tienes ${activeCount} rutas en curso. Por favor finaliza rutas antiguas o actualiza al plan Smart.`
        });
      }
    }
    // =========================================================

    // Obtener facturas
    const facturasSnapshot = await db.collection('recolecciones')
      .where('__name__', 'in', facturasIds)
      .get();

    const facturasParaRuta = [];
    let totalItems = 0;

    facturasSnapshot.forEach(doc => {
      const f = doc.data();

      // Validación defensiva de datos de factura
      if (!f || typeof f !== 'object') {
        console.warn(`⚠️ Factura ${doc.id} tiene datos inválidos, omitiendo...`);
        return;
      }

      const items = Array.isArray(f.items) ? f.items : [];
      totalItems += items.length;

      // Extraer datos del destinatario de forma defensiva
      const destinatario = f.destinatario || {};
      const clienteNombre = f.cliente || destinatario.nombre || 'Cliente';
      const clienteDireccion = f.direccion || destinatario.direccion || '';
      const clienteZona = f.zona || destinatario.zona || '';
      const clienteSector = f.sector || destinatario.sector || '';

      facturasParaRuta.push({
        id: doc.id,
        facturaId: doc.id,
        codigoTracking: f.codigoTracking || f.numeroFactura || 'S/N',
        cliente: clienteNombre,
        direccion: clienteDireccion,
        zona: clienteZona,
        sector: clienteSector,
        items: items,
        itemsCargados: 0,
        itemsTotal: items.length,
        itemsCargadosIndices: [],
        estadoCarga: 'pendiente',
        estado: 'asignado'
      });
    });

    const repDoc = await db.collection('usuarios').doc(repartidorId).get();
    const repNombre = repDoc.exists ? repDoc.data().nombre : 'Repartidor';

    const nuevaRuta = {
      nombre: nombre || `Ruta ${new Date().toLocaleDateString()}`,
      companyId: userData.companyId,
      creadoPor: req.userData.uid,
      repartidorId,
      repartidorNombre: repNombre,
      // ✅ ESTANDARIZACIÓN: Solo usar repartidorId (eliminado empleadoId duplicado)
      cargadoresIds,
      cargadorId: cargadoresIds[0],
      facturas: facturasParaRuta,
      facturasIds,
      totalFacturas: facturasIds.length,
      facturasEntregadas: 0,
      montoAsignado: parseFloat(montoAsignado || 0),
      totalGastos: 0,
      itemsTotalRuta: totalItems,
      itemsCargadosRuta: 0,
      estado: 'asignada',
      configuracion: configuracion || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('rutas').add(nuevaRuta);

    const batch = db.batch();
    facturasSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        estado: 'asignada',
        rutaId: docRef.id,
        repartidorId,
        repartidorNombre: repNombre,
        fechaAsignacionRuta: new Date().toISOString()
      });
    });
    await batch.commit();

    // =====================================================
    // 📧 NOTIFICACIÓN POR CORREO AL REPARTIDOR
    // =====================================================
    try {
      // 1. Obtener configuración de la compañía
      let companyConfig = null;
      if (userData.companyId) {
        const companyDoc = await db.collection('companies').doc(userData.companyId).get();
        if (companyDoc.exists) {
          companyConfig = companyDoc.data();
        }
      }

      // 2. Obtener email del repartidor
      const repartidorDoc = await db.collection('usuarios').doc(repartidorId).get();
      const repartidorEmail = repartidorDoc.exists ? repartidorDoc.data().email : null;

      if (repartidorEmail) {
        const { sendEmail, generateBrandedEmailHTML } = await import('../services/notificationService.js');

        const subject = `🚚 Nueva Ruta Asignada: ${nuevaRuta.nombre}`;
        const contentHtml = `
            <h2 style="color: #1976D2; margin-top: 0;">Nueva Ruta Asignada</h2>
            <p>Hola <strong>${repNombre}</strong>,</p>
            <p>Se te ha asignado una nueva ruta de entrega.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #555;">Detalles de la Ruta</h3>
              <p><strong>Nombre:</strong> ${nuevaRuta.nombre}</p>
              <p><strong>Facturas a Entregar:</strong> ${facturasIds.length}</p>
              <p><strong>Fecha Asignación:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <p>Por favor, ingresa a la aplicación para ver los detalles y comenzar la ruta.</p>
        `;

        const brandedHtml = generateBrandedEmailHTML(contentHtml, companyConfig, 'en_ruta');

        // 3. Enviar correo
        sendEmail(repartidorEmail, subject, brandedHtml, [], companyConfig)
          .then(() => console.log(`📧 Notificación de ruta enviada a ${repartidorEmail}`))
          .catch(err => console.error('❌ Error enviando email de ruta:', err));
      }
    } catch (emailError) {
      console.error('⚠️ Error en notificación de ruta:', emailError);
    }

    res.status(201).json({ success: true, message: 'Ruta creada', data: { id: docRef.id, ...nuevaRuta } });
  } catch (error) {
    console.error('Error creating ruta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getRutaById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('rutas').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Ruta no encontrada' });

    const rutaData = doc.data();

    // Validación defensiva de rutaData
    if (!rutaData || typeof rutaData !== 'object') {
      return res.status(500).json({
        success: false,
        error: 'Datos de ruta corruptos o inválidos'
      });
    }

    // ✅ GASTOS: Leer desde el array 'gastos' dentro del documento de ruta
    const gastosArray = Array.isArray(rutaData.gastos) ? rutaData.gastos : [];
    let totalGastos = 0;
    const gastos = [];

    gastosArray.forEach(g => {
      // Validación defensiva de cada gasto
      if (!g || typeof g !== 'object') return;

      const monto = parseFloat(g.monto);
      if (!isNaN(monto) && monto > 0) {
        totalGastos += monto;
      }
      gastos.push(g);
    });

    const montoAsignado = parseFloat(rutaData.montoAsignado) || 0;
    const balance = montoAsignado - totalGastos;

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...rutaData,
        gastos,
        totalGastos,
        balance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 🛑 FINALIZAR RUTA (Lógica para Facturas No Entregadas)
// Implementación de la lógica solicitada para marcar facturas pendientes como 'no_entregada'.
// ============================================================
export const finalizarRuta = async (req, res) => {
  try {
    // Se asume que el ID de la ruta viene en el path params o en el cuerpo.
    const rutaId = req.params.id || req.body.id;
    if (!rutaId) {
      return res.status(400).json({ success: false, error: 'ID de ruta requerido' });
    }

    const rutaRef = db.collection('rutas').doc(rutaId);
    const rutaDoc = await rutaRef.get();

    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();

    // Validación defensiva de rutaData
    if (!rutaData || typeof rutaData !== 'object') {
      return res.status(500).json({
        success: false,
        error: 'Datos de ruta corruptos o inválidos'
      });
    }

    const facturasEnRuta = Array.isArray(rutaData.facturas) ? rutaData.facturas : [];

    const batch = db.batch();
    let facturasNoEntregadasCount = 0;
    const now = new Date().toISOString();

    // 1. Procesar todas las facturas de la ruta
    for (const facturaRuta of facturasEnRuta) {
      // Validación defensiva de facturaRuta
      if (!facturaRuta || typeof facturaRuta !== 'object') {
        console.warn('⚠️ Factura en ruta tiene datos inválidos, omitiendo...');
        continue;
      }

      // Se asume que si el estado NO es 'entregada' (sino 'asignado', 'no_encontrado', etc.),
      // debe ser reasignada.
      if (facturaRuta.estado !== 'entregada') {
        facturasNoEntregadasCount++;
        const facturaId = facturaRuta.facturaId || facturaRuta.id; // El ID de la recolección

        // Validar que facturaId es válido
        if (!facturaId || typeof facturaId !== 'string' || facturaId.trim() === '') {
          console.warn('⚠️ facturaId inválido en ruta, omitiendo...');
          continue;
        }

        const recoleccionRef = db.collection('recolecciones').doc(facturaId);

        // Crear reporte de no entrega
        const reporteNoEntrega = {
          motivo: 'ruta_cerrada_sin_entregar',
          descripcion: 'Factura no entregada al cerrar la ruta',
          reportadoPor: req.user?.uid || 'sistema',
          nombreReportador: 'Sistema',
          intentarNuevamente: true,
          fecha: now
        };

        const historialEntry = {
          accion: 'factura_no_entregada',
          descripcion: 'Ruta cerrada sin entregar esta factura',
          motivo: 'ruta_cerrada_sin_entregar',
          fecha: now
        };

        // 1.1. Actualizar el documento de la recolección (la factura)
        batch.update(recoleccionRef, {
          estado: 'no_entregada', // Estado para que aparezca en el panel de reasignación
          reporteNoEntrega, // Agregar reporte para que aparezca en facturas no entregadas
          rutaId: FieldValue.delete(), // Desvincular de la ruta
          repartidorId: FieldValue.delete(),
          repartidorNombre: FieldValue.delete(),
          historial: FieldValue.arrayUnion(historialEntry),
          fechaActualizacion: now
        });
      }
    }

    // 2. Actualizar el estado de la ruta a 'completada'
    batch.update(rutaRef, {
      estado: 'completada',
      fechaCierre: now,
      // Importante: Actualizar el contador de facturas no entregadas
      facturasNoEntregadas: facturasNoEntregadasCount,
      updatedAt: now,
    });

    await batch.commit();

    // 3. Respuesta final
    res.json({
      success: true,
      message: `Ruta finalizada. ${facturasNoEntregadasCount} facturas marcadas como no entregadas.`,
      data: { id: rutaId }
    });

  } catch (error) {
    console.error('❌ Error en finalizarRuta:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 🛠️ RECURSOS (Solución Error 500 Contenedores)
// ============================================================

export const getContenedoresDisponibles = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.userData.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    console.log('📦 Buscando contenedores disponibles para crear rutas...');

    try {
      // Buscar contenedores recibidos en RD (estado: recibido_rd)
      const snapshot = await db.collection('contenedores')
        .where('companyId', '==', userData.companyId)
        .where('estado', '==', 'recibido_rd')
        .orderBy('fechaRecepcion', 'desc')
        .limit(20)
        .get();

      const contenedores = snapshot.docs.map(doc => ({
        id: doc.id,
        numeroContenedor: doc.data().numeroContenedor,
        estado: doc.data().estado,
        facturas: doc.data().facturas || [],
        estadisticas: doc.data().estadisticas || {},
        fechaRecepcion: doc.data().fechaRecepcion?.toDate?.() || null
      }));

      console.log(`✅ Encontrados ${contenedores.length} contenedores recibidos en RD`);
      res.json({ success: true, data: contenedores });
    } catch (indexError) {
      console.warn("⚠️ Error con índice de fecha, intentando sin orderBy...", indexError.message);

      // Fallback: sin orderBy
      const snapshot = await db.collection('contenedores')
        .where('companyId', '==', userData.companyId)
        .where('estado', '==', 'recibido_rd')
        .limit(20)
        .get();

      const contenedores = snapshot.docs.map(doc => ({
        id: doc.id,
        numeroContenedor: doc.data().numeroContenedor,
        estado: doc.data().estado,
        facturas: doc.data().facturas || [],
        estadisticas: doc.data().estadisticas || {},
        fechaRecepcion: doc.data().fechaRecepcion?.toDate?.() || null
      }));

      // Ordenar en memoria
      contenedores.sort((a, b) => {
        const dateA = a.fechaRecepcion || new Date(0);
        const dateB = b.fechaRecepcion || new Date(0);
        return dateB - dateA;
      });

      res.json({ success: true, data: contenedores });
    }
  } catch (e) {
    console.error('❌ Error obteniendo contenedores:', e);
    res.status(500).json({ error: e.message });
  }
};

export const getFacturasDisponibles = async (req, res) => {
  try {
    const { contenedorId } = req.query;
    const userData = await getUserDataSafe(req.userData.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    console.log('📦 Buscando facturas disponibles para rutas...');
    console.log(`   Company: ${userData.companyId}`);
    console.log(`   Contenedor: ${contenedorId || 'Todos'}`);

    // Buscar TODAS las facturas de la compañía (o del contenedor si se especifica)
    let query = db.collection('recolecciones')
      .where('companyId', '==', userData.companyId);

    if (contenedorId) {
      query = query.where('contenedorId', '==', contenedorId);
    }

    const snapshot = await query.limit(500).get();

    // Estados que NO deben aparecer como disponibles:
    const estadosExcluidos = ['entregada', 'completada', 'cancelada', 'en_ruta'];

    // Filtrar en memoria:
    // 1. NO debe tener rutaId asignada
    // 2. NO debe estar en estados excluidos
    // 3. Debe estar confirmada por secretaria (confirmada_secretaria) O en estados posteriores
    const facturas = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const estado = data.estado || '';

      // Solo incluir si:
      // - NO tiene ruta asignada
      // - NO está en estados excluidos
      // - Ya fue confirmada por secretaria (o estados posteriores)
      const tieneRutaAsignada = data.rutaId || data.rutaAsignada;
      const estadoExcluido = estadosExcluidos.includes(estado);
      const noConfirmada = estado === 'pendiente' || estado === 'en_transito' || estado === '';

      if (!tieneRutaAsignada && !estadoExcluido && !noConfirmada) {
        facturas.push({
          id: doc.id,
          codigoTracking: data.codigoTracking || doc.id,
          cliente: data.destinatario?.nombre || 'Sin nombre',
          direccion: data.destinatario?.direccion || 'Sin dirección',
          sector: data.destinatario?.sector || data.sector || 'Sin Sector',
          zona: data.destinatario?.zona || data.zona || 'Sin Zona',
          telefono: data.destinatario?.telefono || '',
          items: data.items || [],
          itemsTotal: data.itemsTotal || data.items?.length || 0,
          facturacion: data.facturacion || {},
          pago: data.pago || {},
          estado: data.estado,
          contenedorId: data.contenedorId,
          numeroContenedor: data.numeroContenedor
        });
      }
    });

    console.log(`✅ Encontradas ${facturas.length} facturas disponibles (de ${snapshot.size} total)`);
    res.json({ success: true, data: facturas });
  } catch (e) {
    console.error('❌ Error obteniendo facturas disponibles:', e);
    res.status(500).json({ error: e.message });
  }
};

export const getRepartidoresDisponibles = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.userData.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    const snap = await db.collection('usuarios')
      .where('companyId', '==', userData.companyId)
      .where('rol', '==', 'repartidor')
      .where('activo', '==', true).get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getCargadoresDisponibles = async (req, res) => {
  try {
    const userData = await getUserDataSafe(req.userData.uid);
    if (!userData?.companyId) return res.json({ success: true, data: [] });

    const snap = await db.collection('usuarios')
      .where('companyId', '==', userData.companyId)
      .where('rol', '==', 'cargador')
      .where('activo', '==', true).get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Auxiliares
export const cerrarRuta = async (req, res) => {
  try {
    const rutaId = req.params.id;
    const rutaRef = db.collection('rutas').doc(rutaId);
    const rutaDoc = await rutaRef.get();

    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, error: 'Ruta no encontrada' });
    }

    const rutaData = rutaDoc.data();
    const facturasEnRuta = Array.isArray(rutaData.facturas) ? rutaData.facturas : [];

    // ✅ VALIDACIÓN: Verificar que todas las facturas estén entregadas
    let facturasNoEntregadas = 0;
    for (const facturaRuta of facturasEnRuta) {
      if (facturaRuta && facturaRuta.estado !== 'entregada') {
        facturasNoEntregadas++;
      }
    }

    // ❌ Si hay facturas sin entregar, rechazar el cierre automático
    if (facturasNoEntregadas > 0) {
      return res.status(400).json({
        success: false,
        error: `No se puede cerrar la ruta. Hay ${facturasNoEntregadas} factura(s) sin entregar. Use el endpoint /finalizar para cerrar con facturas pendientes.`,
        facturasNoEntregadas
      });
    }

    // ✅ Si todas están entregadas, proceder al cierre
    await rutaRef.update({
      estado: 'completada',
      fechaCierre: new Date().toISOString(),
      facturasNoEntregadas: 0
    });

    res.json({ success: true, message: 'Ruta cerrada exitosamente' });
  } catch (e) {
    console.error('❌ Error cerrando ruta:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};
export const updateEntrega = async (req, res) => res.json({ msg: 'ok' });
// export const finalizarRuta ya está implementada arriba
export const getStatsRepartidor = async (req, res) => res.json({ success: true, data: {} });
export const getRutasActivas = async (req, res) => getAllRutas(req, res);
export const createRuta = async (req, res) => createRutaAvanzada(req, res);

/**
 * 📚 Obtener historial completo de rutas con información detallada
 * Incluye: facturas, fotos, eventos del historial, notas
 * Acceso: admin_general, almacen_rd
 */
export const getHistorialRutas = async (req, res) => {
  try {
    const { companyId, rol } = req.userData;

    // Verificar permisos
    if (!['admin_general', 'almacen_rd', 'propietario', 'super_admin'].includes(rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder al historial'
      });
    }

    console.log(`📚 Obteniendo historial de rutas para companyId: ${companyId}`);

    // Obtener todas las rutas con paginación opcional
    const limit = parseInt(req.query.limit) || 500; // Default 500 rutas
    let query = db.collection('rutas')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const rutasSnapshot = await query.get();

    if (rutasSnapshot.empty) {
      return res.json({
        success: true,
        rutas: [],
        total: 0
      });
    }

    // Procesar cada ruta y enriquecer con datos
    const rutasPromises = rutasSnapshot.docs.map(async (doc) => {
      const rutaData = doc.data();
      const rutaId = doc.id;

      // Obtener información del repartidor si existe
      let repartidorNombre = 'Sin asignar';
      if (rutaData.repartidorId) {
        try {
          const repartidorDoc = await db.collection('usuarios').doc(rutaData.repartidorId).get();
          if (repartidorDoc.exists) {
            repartidorNombre = repartidorDoc.data().nombre;
          }
        } catch (err) {
          console.warn(`⚠️ Error obteniendo repartidor ${rutaData.repartidorId}:`, err.message);
        }
      }

      // Obtener información del contenedor si existe
      let numeroContenedor = null;
      if (rutaData.contenedorId) {
        try {
          const contenedorDoc = await db.collection('contenedores').doc(rutaData.contenedorId).get();
          if (contenedorDoc.exists) {
            numeroContenedor = contenedorDoc.data().numeroContenedor;
          }
        } catch (err) {
          console.warn(`⚠️ Error obteniendo contenedor ${rutaData.contenedorId}:`, err.message);
        }
      }

      // Obtener facturas de la ruta con sus fotos
      let facturas = [];
      if (rutaData.facturas && rutaData.facturas.length > 0) {
        const facturasPromises = rutaData.facturas.map(async (facturaId) => {
          try {
            const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
            if (facturaDoc.exists) {
              const facturaData = facturaDoc.data();
              return {
                id: facturaDoc.id,
                codigoTracking: facturaData.codigoTracking,
                destinatario: facturaData.destinatario,
                estadoGeneral: facturaData.estadoGeneral,
                fotos: facturaData.fotos || [],
                fotosEntrega: facturaData.fotosEntrega || [],
                fotosNoEntrega: facturaData.fotosNoEntrega || []
              };
            }
          } catch (err) {
            console.warn(`⚠️ Error obteniendo factura ${facturaId}:`, err.message);
          }
          return null;
        });

        const facturasResult = await Promise.all(facturasPromises);
        facturas = facturasResult.filter(f => f !== null);
      }

      // Recopilar todas las fotos de la ruta
      const todasLasFotos = [];

      // Fotos de las facturas
      facturas.forEach(factura => {
        if (factura.fotos) todasLasFotos.push(...factura.fotos);
        if (factura.fotosEntrega) todasLasFotos.push(...factura.fotosEntrega);
        if (factura.fotosNoEntrega) todasLasFotos.push(...factura.fotosNoEntrega);
      });

      // Fotos de la ruta misma (si existen)
      if (rutaData.fotos) todasLasFotos.push(...rutaData.fotos);
      if (rutaData.fotosCarga) todasLasFotos.push(...rutaData.fotosCarga);

      return {
        id: rutaId,
        nombre: rutaData.nombre,
        tipo: rutaData.tipo,
        estado: rutaData.estado,
        repartidorId: rutaData.repartidorId,
        repartidorNombre,
        numeroContenedor,
        zona: rutaData.zona,
        direccionCarga: rutaData.direccionCarga,
        fechaCreacion: rutaData.createdAt,
        fechaSalida: rutaData.fechaSalida,
        fechaCierre: rutaData.fechaCierre,
        fechaFinalizacion: rutaData.fechaFinalizacion,
        fechaInicioCarga: rutaData.fechaInicioCarga,
        fechaFinCarga: rutaData.fechaFinCarga,
        facturas,
        fotos: todasLasFotos,
        historial: rutaData.historial || [],
        notas: rutaData.notas,
        notasCargador: rutaData.notasCargador,
        notasRepartidor: rutaData.notasRepartidor,
        totalPaquetes: facturas.length,
        cargadoresIds: rutaData.cargadoresIds || []
      };
    });

    const rutas = await Promise.all(rutasPromises);

    console.log(`✅ Historial cargado: ${rutas.length} rutas`);

    // ✅ NUEVO: Incluir solicitudes de recolección (citas del Call Center y Bot WhatsApp)
    try {
      const solicitudesSnapshot = await db.collection('solicitudes_recoleccion')
        .where('companyId', '==', companyId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      console.log(`📋 Encontradas ${solicitudesSnapshot.size} solicitudes de recolección`);

      const solicitudesPromises = solicitudesSnapshot.docs.map(async (doc) => {
        const solicitudData = doc.data();

        // Obtener nombre del recolector si está asignada
        let recolectorNombre = 'Sin asignar';
        if (solicitudData.recolectorId) {
          try {
            const recolectorDoc = await db.collection('usuarios').doc(solicitudData.recolectorId).get();
            if (recolectorDoc.exists) {
              recolectorNombre = recolectorDoc.data().nombre;
            }
          } catch (err) {
            console.warn(`⚠️ Error obteniendo recolector ${solicitudData.recolectorId}:`, err.message);
          }
        }

        return {
          id: doc.id,
          nombre: `Solicitud de ${solicitudData.cliente?.nombre || 'Cliente'}`,
          tipo: 'recoleccion',
          estado: solicitudData.estado || 'pendiente',
          repartidorId: solicitudData.recolectorId || null,
          repartidorNombre,
          numeroContenedor: null,
          zona: solicitudData.ubicacion?.sector || '',
          direccionCarga: solicitudData.ubicacion?.direccion || '',
          fechaCreacion: solicitudData.createdAt,
          fechaSalida: solicitudData.programacion?.fecha || null,
          fechaCierre: null,
          fechaFinalizacion: solicitudData.updatedAt,
          facturas: [],
          fotos: [],
          historial: [],
          notas: solicitudData.notas || '',
          totalPaquetes: 0,
          // ✅ Identificador especial para distinguirlas en el frontend
          esSolicitud: true,
          clienteNombre: solicitudData.cliente?.nombre || '',
          clienteTelefono: solicitudData.cliente?.telefono || '',
          horaPreferida: solicitudData.programacion?.hora || ''
        };
      });

      const solicitudes = await Promise.all(solicitudesPromises);

      // Combinar rutas y solicitudes, ordenar por fecha
      const todosLosItems = [...rutas, ...solicitudes].sort((a, b) => {
        const fechaA = new Date(a.fechaCreacion);
        const fechaB = new Date(b.fechaCreacion);
        return fechaB - fechaA; // Más recientes primero
      });

      console.log(`✅ Total combinado: ${todosLosItems.length} items (${rutas.length} rutas + ${solicitudes.length} solicitudes)`);

      res.json({
        success: true,
        rutas: todosLosItems, // Nombre mantenido como 'rutas' para compatibilidad con frontend
        total: todosLosItems.length
      });
    } catch (solicitudError) {
      console.error('⚠️ Error cargando solicitudes, devolviendo solo rutas:', solicitudError);

      // Fallback: si falla la carga de solicitudes, devolver solo rutas
      res.json({
        success: true,
        rutas,
        total: rutas.length
      });
    }

  } catch (error) {
    console.error('❌ Error obteniendo historial de rutas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial',
      error: error.message
    });
  }
};