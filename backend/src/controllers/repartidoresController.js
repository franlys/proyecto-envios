// backend/src/controllers/repartidoresController.js
/**
 * ✅ CONTROLADOR DE REPARTIDORES - VERSIÓN UNIFICADA Y OPTIMIZADA
 * Gestión completa del ciclo de entrega item por item
 * 
 * CORRECCIONES IMPLEMENTADAS:
 * ✅ Estado 'asignada' agregado al filtro para visibilidad inmediata de rutas
 * 
 * Funcionalidades:
 * ✅ Ver rutas asignadas con estadísticas en tiempo real
 * ✅ Detalle de ruta con facturas y ubicaciones
 * ✅ Iniciar entregas (transición a estado 'en_entrega')
 * ✅ Confirmar items individuales con evidencias
 * ✅ Subir fotos de entrega
 * ✅ Confirmar pagos contraentrega
 * ✅ Reportar items dañados
 * ✅ Marcar facturas como entregadas
 * ✅ Reportar facturas no entregadas
 * ✅ Finalizar ruta completa
 */

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// ==========================================================================
// 🚚 OBTENER RUTAS ASIGNADAS AL REPARTIDOR
// ==========================================================================
export const getRutasAsignadas = async (req, res) => {
  try {
    const repartidorId = req.user?.uid || req.userData?.uid;

    // Obtener datos del usuario para validar la compañía
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const companyId = userDoc.data().companyId;
    console.log('🚛 Repartidor buscando rutas:', repartidorId, 'Empresa:', companyId);

    // Buscar rutas asignadas
    // ✅ CORRECCIÓN 5: Incluir TODOS los estados relevantes
    // Estados visibles:
    // - 'asignada': Rutas recién creadas, listas para planificación
    // - 'cargada': Carga terminada en sistema legacy, listo para salir
    // - 'carga_finalizada': Carga terminada en sistema nuevo, listo para salir
    // - 'en_entrega': Ruta en proceso
    // NOTA: No podemos usar .orderBy() con .where('estado', 'in') debido a limitación de Firestore
    // Ver: https://firebase.google.com/docs/firestore/query-data/queries#limitations
    // Ordenaremos manualmente en memoria después (es eficiente para < 100 rutas)
    const snapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .where('repartidorId', '==', repartidorId)
      .where('estado', 'in', ['asignada', 'cargada', 'carga_finalizada', 'en_entrega'])
      .get();

    const rutas = snapshot.docs.map(doc => {
      const data = doc.data();
      const facturas = data.facturas || [];

      // Calcular estadísticas en tiempo real
      const totalFacturas = data.totalFacturas || facturas.length || 0;
      const facturasEntregadas = facturas.filter(f => f.estado === 'entregada').length || 0;
      const facturasNoEntregadas = facturas.filter(f => f.estado === 'no_entregada').length || 0;
      const facturasPendientes = totalFacturas - facturasEntregadas - facturasNoEntregadas;
      const porcentajeEntrega = totalFacturas > 0 ? Math.round((facturasEntregadas / totalFacturas) * 100) : 0;

      // Traducir estado para el frontend
      let estadoTexto = data.estado;
      let estadoCliente = data.estado;

      if (data.estado === 'asignada') {
        estadoTexto = 'Planificada';
        estadoCliente = 'asignada';
      } else if (data.estado === 'cargada' || data.estado === 'carga_finalizada') {
        estadoTexto = 'Lista para Salir';
        estadoCliente = 'cargada'; // El frontend espera 'cargada'
      } else if (data.estado === 'en_entrega') {
        estadoTexto = 'En Ruta';
        estadoCliente = 'en_entrega';
      }

      return {
        id: doc.id,
        nombre: data.nombre,
        zona: data.zona || 'Zona General',
        estado: estadoCliente,
        estadoTexto,
        repartidorId: data.repartidorId,
        repartidorNombre: data.repartidorNombre,

        estadisticas: {
          totalFacturas,
          facturasEntregadas,
          facturasNoEntregadas,
          facturasPendientes,
          porcentajeEntrega
        },

        fechaCreacion: data.fechaCreacion?.toDate?.() || data.createdAt?.toDate?.() || new Date().toISOString(),
        fechaAsignacion: data.fechaAsignacionRepartidor?.toDate?.() || null,
        fechaInicioEntrega: data.fechaInicioEntrega?.toDate?.() || null,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || data.updatedAt?.toDate?.() || null
      };
    });

    console.log(`✅ Encontradas ${rutas.length} rutas activas para el repartidor`);

    // Ordenar rutas manualmente por fechaCreacion (más recientes primero)
    const rutasOrdenadas = rutas.sort((a, b) => {
      const fechaA = new Date(a.fechaCreacion);
      const fechaB = new Date(b.fechaCreacion);
      return fechaB - fechaA; // Orden descendente
    });

    res.json({
      success: true,
      data: rutasOrdenadas,
      total: rutasOrdenadas.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo rutas repartidor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las rutas',
      error: error.message
    });
  }
};

// ==========================================================================
// 📦 OBTENER DETALLE DE RUTA CON FACTURAS COMPLETAS
// ==========================================================================
export const getDetalleRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const repartidorId = req.user?.uid || req.userData?.uid;

    const doc = await db.collection('rutas').doc(rutaId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    // Verificar permisos
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const companyId = userDoc.data()?.companyId;

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No autorizado - empresa diferente'
      });
    }

    if (data.repartidorId !== repartidorId) {
      return res.status(403).json({
        success: false,
        message: 'Esta ruta no está asignada a usted'
      });
    }

    // Obtener detalles completos de cada factura
    const facturasDetalladas = [];

    if (data.facturas && data.facturas.length > 0) {
      for (const facturaRuta of data.facturas) {
        const idFactura = facturaRuta.facturaId || facturaRuta.id;

        if (idFactura) {
          const facturaDoc = await db.collection('recolecciones').doc(idFactura).get();

          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();

            // Procesar items con estado de entrega
            const items = (facturaData.items || []).map((item, index) => ({
              ...item,
              index,
              entregado: item.entregado || false,
              fechaEntrega: item.fechaEntrega || item.fechaEntregado || null,
              entregadoPor: item.entregadoPor || null
            }));

            // Calcular estadísticas de items
            const itemsTotal = items.length;
            const itemsEntregados = items.filter(i => i.entregado).length;

            // Datos del destinatario unificados
            const destinatario = {
              nombre: facturaData.cliente || facturaData.destinatario?.nombre || 'Cliente',
              telefono: facturaData.telefono || facturaData.destinatario?.telefono || '',
              direccion: facturaData.direccion || facturaData.destinatario?.direccion || 'Sin dirección',
              zona: facturaData.zona || facturaData.destinatario?.zona || '',
              email: facturaData.email || facturaData.destinatario?.email || ''
            };

            // Información de pago
            const montoTotal = facturaData.facturacion?.total || 0;
            const montoPagado = facturaData.pago?.montoPagado || 0;
            const pago = {
              estado: facturaData.pago?.estado || (montoTotal > 0 ? 'pendiente' : 'pagada'),
              metodoPago: facturaData.pago?.metodoPago || '',
              montoPagado,
              montoPendiente: facturaData.pago?.montoPendiente || (montoTotal - montoPagado),
              total: montoTotal,
              referenciaPago: facturaData.pago?.referenciaPago || '',
              fechaPago: facturaData.pago?.fechaPago || null
            };

            facturasDetalladas.push({
              id: facturaDoc.id,
              codigoTracking: facturaData.codigoTracking,
              destinatario,
              items,
              itemsEntregados,
              itemsTotal,
              estadoEntrega: facturaData.estadoEntrega || 'pendiente',
              pago,
              itemsDanados: facturaData.itemsDanados || [],
              fotosEntrega: facturaData.fotosEntrega || [],
              firmaCliente: facturaData.firmaCliente || null,
              nombreReceptor: facturaData.nombreReceptor || '',
              notasEntrega: facturaData.notasEntrega || '',
              reporteNoEntrega: facturaData.reporteNoEntrega || null,
              notas: facturaData.notas || '',
              notasSecretaria: facturaData.notasSecretaria || '',
              ordenEntrega: facturaRuta.ordenEntrega || 0,
              estado: facturaData.estado
            });
          }
        }
      }
    }

    // Ordenar por orden de entrega
    facturasDetalladas.sort((a, b) => a.ordenEntrega - b.ordenEntrega);

    // Traducir estado para el frontend
    let estadoCliente = data.estado;
    if (data.estado === 'carga_finalizada' || data.estado === 'cargada') {
      estadoCliente = 'cargada';
    }

    const ruta = {
      id: doc.id,
      nombre: data.nombre,
      zona: data.zona,
      estado: estadoCliente,
      repartidorId: data.repartidorId,
      repartidorNombre: data.repartidorNombre,
      facturas: facturasDetalladas,
      fechaCreacion: data.fechaCreacion?.toDate?.() || data.createdAt?.toDate?.() || null,
      fechaAsignacion: data.fechaAsignacionRepartidor?.toDate?.() || null,
      fechaInicioEntrega: data.fechaInicioEntrega?.toDate?.() || null,
      fechaActualizacion: data.fechaActualizacion?.toDate?.() || data.updatedAt?.toDate?.() || null
    };

    console.log(`✅ Detalle de ruta con ${facturasDetalladas.length} facturas`);

    res.json({
      success: true,
      data: ruta
    });

  } catch (error) {
    console.error('❌ Error detalle ruta repartidor:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el detalle de la ruta',
      error: error.message
    });
  }
};

// ==========================================================================
// 🚀 INICIAR ENTREGAS (Cambio de estado a 'en_entrega')
// ==========================================================================
export const iniciarEntregas = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const companyId = userDoc.data()?.companyId;
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log('🚀 Iniciando entregas de ruta:', rutaId);

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    // Validar permisos
    if (data.companyId !== companyId || data.repartidorId !== repartidorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para iniciar esta ruta'
      });
    }

    // Validar estado - aceptar tanto 'cargada' como 'carga_finalizada'
    if (data.estado !== 'carga_finalizada' && data.estado !== 'cargada') {
      return res.status(400).json({
        success: false,
        message: `La ruta no está lista para iniciar (estado actual: ${data.estado}). Debe estar en estado 'cargada' o 'carga_finalizada'`
      });
    }

    const historialEntry = {
      accion: 'inicio_entregas',
      descripcion: `Entregas iniciadas por ${nombreRepartidor}`,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    // Actualizar ruta
    await rutaRef.update({
      estado: 'en_entrega',
      fechaInicioEntrega: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    // Actualizar facturas a estado 'en_ruta'
    const batch = db.batch();
    for (const factura of (data.facturas || [])) {
      const idFactura = factura.facturaId || factura.id;
      if (idFactura) {
        const facturaRef = db.collection('recolecciones').doc(idFactura);
        batch.update(facturaRef, {
          estado: 'en_ruta',
          fechaActualizacion: new Date().toISOString(),
          historial: FieldValue.arrayUnion({
            accion: 'inicio_entregas',
            descripcion: 'Repartidor inició entregas',
            fecha: new Date().toISOString()
          })
        });
      }
    }
    await batch.commit();

    console.log('✅ Entregas iniciadas exitosamente');

    res.json({
      success: true,
      message: 'Entregas iniciadas exitosamente',
      data: {
        rutaId,
        estado: 'en_entrega'
      }
    });

  } catch (error) {
    console.error('❌ Error iniciando entregas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar las entregas',
      error: error.message
    });
  }
};

// ==========================================================================
// ✅ CONFIRMAR ITEM INDIVIDUAL ENTREGADO
// ==========================================================================
export const entregarItem = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;

    console.log(`📦 Confirmando entrega de item ${itemIndex} de factura ${facturaId}`);

    if (itemIndex === undefined || itemIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item requerido'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const fDoc = await facturaRef.get();

    if (!fDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const fData = fDoc.data();
    const items = [...(fData.items || [])];

    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    // Marcar item como entregado
    items[itemIndex].entregado = true;
    items[itemIndex].fechaEntrega = new Date().toISOString();
    items[itemIndex].entregadoPor = repartidorId;

    const itemsTotal = items.length;
    const itemsEntregados = items.filter(i => i.entregado).length;
    const todosEntregados = itemsEntregados === itemsTotal;

    await facturaRef.update({
      items,
      estadoEntrega: todosEntregados ? 'completo' : 'parcial',
      fechaActualizacion: new Date().toISOString()
    });

    // Sincronizar con ruta si existe
    if (fData.rutaId) {
      const rutaRef = db.collection('rutas').doc(fData.rutaId);
      await db.runTransaction(async (transaction) => {
        const rDoc = await transaction.get(rutaRef);
        if (rDoc.exists) {
          const rData = rDoc.data();
          const facturas = [...(rData.facturas || [])];
          const idx = facturas.findIndex(f => (f.id === facturaId || f.facturaId === facturaId));

          if (idx !== -1 && facturas[idx].items && facturas[idx].items[itemIndex]) {
            facturas[idx].items[itemIndex].entregado = true;
            transaction.update(rutaRef, {
              facturas,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
    }

    console.log('✅ Item marcado como entregado');

    res.json({
      success: true,
      message: 'Item confirmado como entregado',
      data: {
        facturaId,
        itemIndex,
        itemsEntregados,
        itemsTotal,
        todosEntregados
      }
    });

  } catch (error) {
    console.error('❌ Error entregando item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar el item',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const confirmarItemEntregado = entregarItem;

// ==========================================================================
// 📸 SUBIR FOTOS DE EVIDENCIA
// ==========================================================================
export const subirFotos = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { fotos } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`📸 Subiendo fotos de evidencia para factura ${facturaId}`);

    if (!fotos || !Array.isArray(fotos) || fotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos una foto'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const historialEntry = {
      accion: 'fotos_evidencia',
      descripcion: `${fotos.length} foto(s) de entrega subidas por ${nombreRepartidor}`,
      cantidadFotos: fotos.length,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      fotosEntrega: FieldValue.arrayUnion(...fotos),
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log(`✅ ${fotos.length} fotos subidas exitosamente`);

    res.json({
      success: true,
      message: 'Fotos de evidencia subidas exitosamente',
      data: {
        facturaId,
        cantidadFotos: fotos.length
      }
    });

  } catch (error) {
    console.error('❌ Error subiendo fotos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir las fotos',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const subirFotosEvidencia = subirFotos;

// ==========================================================================
// 💰 CONFIRMAR PAGO CONTRAENTREGA
// ==========================================================================
export const confirmarPago = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { montoPagado, metodoPago, referenciaPago, notas } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`💰 Confirmando pago contraentrega para factura ${facturaId}`);

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();
    const montoTotal = data.facturacion?.total || 0;
    const montoPagadoNum = parseFloat(montoPagado) || 0;
    const montoPendiente = montoTotal - montoPagadoNum;

    let estadoPago = 'pendiente';
    if (montoPagadoNum >= montoTotal) {
      estadoPago = 'pagada';
    } else if (montoPagadoNum > 0) {
      estadoPago = 'parcial';
    }

    const historialPago = {
      monto: montoPagadoNum,
      metodoPago: metodoPago || 'efectivo',
      referencia: referenciaPago || '',
      fecha: new Date().toISOString(),
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      notas: notas || '',
      tipo: 'contraentrega'
    };

    const historialEntry = {
      accion: 'pago_contraentrega',
      descripcion: `Pago contraentrega confirmado por ${nombreRepartidor} - $${montoPagadoNum}`,
      monto: montoPagadoNum,
      estadoPago,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      'pago.estado': estadoPago,
      'pago.montoPagado': montoPagadoNum,
      'pago.montoPendiente': montoPendiente,
      'pago.metodoPago': metodoPago || 'efectivo',
      'pago.referenciaPago': referenciaPago || '',
      'pago.fechaPago': new Date().toISOString(),
      'pago.historialPagos': FieldValue.arrayUnion(historialPago),
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log('✅ Pago contraentrega confirmado');

    res.json({
      success: true,
      message: 'Pago contraentrega confirmado exitosamente',
      data: {
        facturaId,
        montoPagado: montoPagadoNum,
        montoPendiente,
        estadoPago
      }
    });

  } catch (error) {
    console.error('❌ Error confirmando pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar el pago',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const confirmarPagoContraentrega = confirmarPago;

// ==========================================================================
// ⚠️ REPORTAR ITEM DAÑADO DURANTE ENTREGA
// ==========================================================================
export const reportarDano = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex, descripcionDano, fotos } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`⚠️ Reportando item dañado: factura ${facturaId}, item ${itemIndex}`);

    if (itemIndex === undefined || itemIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item requerido'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();
    const items = [...(data.items || [])];

    if (itemIndex < 0 || itemIndex >= items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    // Remover item del array y agregarlo a items dañados
    const [itemReportado] = items.splice(itemIndex, 1);

    const reporteDano = {
      item: itemReportado,
      descripcionDano: descripcionDano || '',
      fotos: fotos || [],
      reportadoPor: repartidorId,
      nombreReportador: nombreRepartidor,
      rolReportador: 'repartidor',
      momentoReporte: 'entrega',
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: 'item_danado_entrega',
      descripcion: `Item dañado reportado: ${itemReportado.descripcion}`,
      itemIndex,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      items,
      itemsDanados: FieldValue.arrayUnion(reporteDano),
      historial: FieldValue.arrayUnion(historialEntry),
      fechaActualizacion: new Date().toISOString()
    });

    console.log('✅ Item dañado reportado y movido');

    res.json({
      success: true,
      message: 'Item dañado reportado exitosamente',
      data: reporteDano
    });

  } catch (error) {
    console.error('❌ Error reportando item dañado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reportar el item dañado',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const reportarItemDanado = reportarDano;

// ==========================================================================
// ✅ MARCAR FACTURA COMO ENTREGADA
// ==========================================================================
export const entregarFactura = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { firmaCliente, nombreReceptor, notasEntrega } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`✅ Marcando factura como entregada:`, facturaId);

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    // Validar que todos los items estén entregados
    const itemsTotal = data.items?.length || 0;
    const itemsEntregados = (data.items || []).filter(i => i.entregado).length;

    if (itemsEntregados < itemsTotal) {
      return res.status(400).json({
        success: false,
        message: 'No se han confirmado todos los items',
        itemsEntregados,
        itemsTotal
      });
    }

    // Validar fotos de evidencia
    const fotosEntrega = data.fotosEntrega || [];
    if (fotosEntrega.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos una foto de evidencia'
      });
    }

    const historialEntry = {
      accion: 'factura_entregada',
      descripcion: `Factura entregada por ${nombreRepartidor}`,
      nombreReceptor: nombreReceptor || '',
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      estado: 'entregada',
      estadoEntrega: 'completo',
      firmaCliente: firmaCliente || null,
      nombreReceptor: nombreReceptor || '',
      notasEntrega: notasEntrega || '',
      entregadoPor: repartidorId,
      entregadoPorNombre: nombreRepartidor,
      fechaEntrega: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    // Actualizar ruta si existe
    if (data.rutaId) {
      const rutaRef = db.collection('rutas').doc(data.rutaId);
      await db.runTransaction(async (transaction) => {
        const rDoc = await transaction.get(rutaRef);
        if (rDoc.exists) {
          const rData = rDoc.data();
          const facturas = [...(rData.facturas || [])];
          const idx = facturas.findIndex(f => (f.id === facturaId || f.facturaId === facturaId));

          if (idx !== -1) {
            facturas[idx].estado = 'entregada';
            const facturasEntregadas = (rData.facturasEntregadas || 0) + 1;

            transaction.update(rutaRef, {
              facturas,
              facturasEntregadas,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
    }

    console.log('✅ Factura marcada como entregada');

    res.json({
      success: true,
      message: 'Factura entregada exitosamente',
      data: {
        facturaId,
        codigoTracking: data.codigoTracking,
        entregadoPor: nombreRepartidor,
        fechaEntrega: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error marcando factura entregada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar la factura como entregada',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const marcarFacturaEntregada = entregarFactura;

// ==========================================================================
// 🚫 REPORTAR FACTURA NO ENTREGADA
// ==========================================================================
export const reportarNoEntrega = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { motivo, descripcion, fotos, intentarNuevamente } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log(`⚠️ Reportando factura no entregada:`, facturaId);

    if (!motivo) {
      return res.status(400).json({
        success: false,
        message: 'El motivo es requerido'
      });
    }

    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const doc = await facturaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const data = doc.data();

    const reporteNoEntrega = {
      motivo, // 'cliente_ausente', 'direccion_incorrecta', 'cliente_rechazo', 'otro'
      descripcion: descripcion || '',
      fotos: fotos || [],
      reportadoPor: repartidorId,
      nombreReportador: nombreRepartidor,
      intentarNuevamente: intentarNuevamente !== false, // Por defecto true
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: 'factura_no_entregada',
      descripcion: `No entregada: ${motivo} - ${descripcion || ''}`,
      motivo,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    // Determinar nuevo estado
    // Si se intenta nuevamente, vuelve a 'confirmada_secretaria'
    const nuevoEstado = intentarNuevamente !== false ? 'confirmada_secretaria' : 'no_entregada';

    await facturaRef.update({
      estado: nuevoEstado,
      reporteNoEntrega,
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry),
      // Limpiar información de ruta para reasignación
      rutaId: null,
      repartidorId: null,
      repartidorNombre: null,
      ordenCarga: null,
      ordenEntrega: null,
      fechaAsignacionRuta: null
    });

    // Actualizar ruta si existe
    if (data.rutaId) {
      const rutaRef = db.collection('rutas').doc(data.rutaId);
      await db.runTransaction(async (transaction) => {
        const rDoc = await transaction.get(rutaRef);
        if (rDoc.exists) {
          const rData = rDoc.data();
          const facturas = [...(rData.facturas || [])];
          const idx = facturas.findIndex(f => (f.id === facturaId || f.facturaId === facturaId));

          if (idx !== -1) {
            facturas[idx].estado = 'no_entregada';
            facturas[idx].reporteNoEntrega = reporteNoEntrega;

            transaction.update(rutaRef, {
              facturas,
              updatedAt: new Date().toISOString()
            });
          }
        }
      });
    }

    console.log('✅ Factura reportada como no entregada');

    res.json({
      success: true,
      message: 'Factura reportada como no entregada',
      data: {
        facturaId,
        motivo,
        intentarNuevamente: intentarNuevamente !== false,
        nuevoEstado
      }
    });

  } catch (error) {
    console.error('❌ Error reportando no entrega:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reportar la no entrega',
      error: error.message
    });
  }
};

// Alias para compatibilidad
export const reportarFacturaNoEntregada = reportarNoEntrega;

// ==========================================================================
// 🏁 FINALIZAR RUTA COMPLETA
// ==========================================================================
export const finalizarRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { notas } = req.body;
    const repartidorId = req.user?.uid || req.userData?.uid;
    const userDoc = await db.collection('usuarios').doc(repartidorId).get();
    const companyId = userDoc.data()?.companyId;
    const nombreRepartidor = userDoc.data()?.nombre || req.userData?.nombre || 'Repartidor';

    console.log('🏁 Finalizando ruta:', rutaId);

    const rutaRef = db.collection('rutas').doc(rutaId);
    const doc = await rutaRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    // Validar permisos
    if (data.companyId !== companyId || data.repartidorId !== repartidorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para finalizar esta ruta'
      });
    }

    // Calcular resumen final
    const facturas = data.facturas || [];
    const facturasEntregadas = facturas.filter(f => f.estado === 'entregada').length;
    const facturasNoEntregadas = facturas.filter(f => f.estado === 'no_entregada').length;
    const facturasPendientes = facturas.length - facturasEntregadas - facturasNoEntregadas;

    // Procesar facturas pendientes - marcarlas automáticamente como no_entregadas
    const batch = db.batch();
    const now = new Date().toISOString();

    if (facturasPendientes > 0) {
      console.log(`⚠️ Marcando ${facturasPendientes} factura(s) pendiente(s) como no entregadas automáticamente`);

      for (const facturaRuta of facturas) {
        if (facturaRuta.estado !== 'entregada' && facturaRuta.estado !== 'no_entregada') {
          const facturaId = facturaRuta.facturaId || facturaRuta.id;
          const recoleccionRef = db.collection('recolecciones').doc(facturaId);

          // Crear reporte de no entrega
          const reporteNoEntrega = {
            motivo: 'ruta_cerrada_sin_entregar',
            descripcion: 'Factura no entregada al cerrar la ruta',
            reportadoPor: repartidorId,
            nombreReportador: nombreRepartidor,
            intentarNuevamente: true,
            fecha: now
          };

          const historialFacturaEntry = {
            accion: 'factura_no_entregada',
            descripcion: 'Ruta cerrada sin entregar esta factura',
            motivo: 'ruta_cerrada_sin_entregar',
            usuarioId: repartidorId,
            nombreUsuario: nombreRepartidor,
            rol: 'repartidor',
            fecha: now
          };

          // Actualizar el documento de la recolección
          batch.update(recoleccionRef, {
            estado: 'no_entregada',
            reporteNoEntrega,
            rutaId: FieldValue.delete(),
            repartidorId: FieldValue.delete(),
            repartidorNombre: FieldValue.delete(),
            ordenCarga: FieldValue.delete(),
            ordenEntrega: FieldValue.delete(),
            fechaAsignacionRuta: FieldValue.delete(),
            historial: FieldValue.arrayUnion(historialFacturaEntry),
            fechaActualizacion: now
          });

          // Actualizar en el array de facturas de la ruta
          facturaRuta.estado = 'no_entregada';
          facturaRuta.reporteNoEntrega = reporteNoEntrega;
        }
      }
    }

    // Recalcular resumen después de procesar pendientes
    const facturasEntregadasFinal = facturas.filter(f => f.estado === 'entregada').length;
    const facturasNoEntregadasFinal = facturas.filter(f => f.estado === 'no_entregada').length;
    const facturasPendientesFinal = facturas.length - facturasEntregadasFinal - facturasNoEntregadasFinal;

    const historialEntry = {
      accion: 'finalizar_ruta',
      descripcion: `Ruta finalizada por ${nombreRepartidor}`,
      facturasEntregadas: facturasEntregadasFinal,
      facturasNoEntregadas: facturasNoEntregadasFinal,
      facturasPendientes: facturasPendientesFinal,
      facturasAutoMarcadas: facturasPendientes,
      notas: notas || '',
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: now
    };

    batch.update(rutaRef, {
      estado: 'completada',
      fechaFinalizacion: now,
      notasRepartidor: notas || '',
      facturas: facturas,
      resumenFinal: {
        entregadas: facturasEntregadasFinal,
        noEntregadas: facturasNoEntregadasFinal,
        pendientes: facturasPendientesFinal
      },
      resumenEntregas: {
        entregadas: facturasEntregadasFinal,
        noEntregadas: facturasNoEntregadasFinal,
        pendientes: facturasPendientesFinal
      },
      fechaActualizacion: now,
      updatedAt: now,
      historial: FieldValue.arrayUnion(historialEntry)
    });

    await batch.commit();

    console.log('✅ Ruta finalizada exitosamente');

    res.json({
      success: true,
      message: facturasPendientes > 0
        ? `Ruta finalizada. ${facturasPendientes} factura(s) pendiente(s) marcadas como no entregadas automáticamente.`
        : 'Ruta finalizada exitosamente',
      data: {
        rutaId,
        facturasEntregadas: facturasEntregadasFinal,
        facturasNoEntregadas: facturasNoEntregadasFinal,
        facturasPendientes: facturasPendientesFinal,
        facturasAutoMarcadas: facturasPendientes
      }
    });

  } catch (error) {
    console.error('❌ Error finalizando ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al finalizar la ruta',
      error: error.message
    });
  }
};

// ==========================================================================
// EXPORTACIÓN DE TODAS LAS FUNCIONES
// ==========================================================================
export default {
  getRutasAsignadas,
  getDetalleRuta,
  iniciarEntregas,
  entregarItem,
  confirmarItemEntregado,
  subirFotos,
  subirFotosEvidencia,
  confirmarPago,
  confirmarPagoContraentrega,
  reportarDano,
  reportarItemDanado,
  entregarFactura,
  marcarFacturaEntregada,
  reportarNoEntrega,
  reportarFacturaNoEntregada,
  finalizarRuta
}