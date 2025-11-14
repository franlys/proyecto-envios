// backend/src/controllers/repartidoresController.js
/**
 * CONTROLADOR DE REPARTIDORES
 * Gestión de entregas item por item con evidencias
 * * Funcionalidades:
 * - Ver rutas asignadas al repartidor
 * - Ver facturas con ubicaciones
 * - Confirmar items uno por uno al entregar
 * - Tomar fotos de evidencia
 * - Confirmar pago contraentrega
 * - Reportar items dañados durante entrega
 * - Reportar facturas no entregadas
 * - Marcar factura como entregada
 */

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// ========================================
// OBTENER RUTAS ASIGNADAS AL REPARTIDOR
// ========================================
export const getRutasAsignadas = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;

    console.log('🚚 Repartidor obteniendo rutas asignadas:', repartidorId);

    const snapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .where('repartidorId', '==', repartidorId)
      // ✅ CORREGIDO: Busca 'carga_finalizada' (del cargador) en lugar de 'cargada'
      .where('estado', 'in', ['carga_finalizada', 'en_entrega'])
      .orderBy('fechaCreacion', 'desc')
      .get();

    const rutas = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Calcular progreso de entregas
      const totalFacturas = data.facturas?.length || 0;
      const facturasEntregadas = data.facturas?.filter(f => f.estado === 'entregada').length || 0;
      const facturasNoEntregadas = data.facturas?.filter(f => f.estado === 'no_entregada').length || 0;
      const facturasPendientes = totalFacturas - facturasEntregadas - facturasNoEntregadas;
      const porcentajeEntrega = totalFacturas > 0 ? Math.round((facturasEntregadas / totalFacturas) * 100) : 0;

      // Traducir estado para el frontend del repartidor
      let estadoCliente = data.estado;
      if (data.estado === 'carga_finalizada') {
        estadoCliente = 'cargada'; // El frontend espera 'cargada' para mostrar "Lista"
      }

      return {
        id: doc.id,
        nombre: data.nombre,
        zona: data.zona,
        estado: estadoCliente, // ✅ CORREGIDO: Se envía 'cargada' al frontend
        repartidorId: data.repartidorId,
        repartidorNombre: data.repartidorNombre,
        
        estadisticas: {
          totalFacturas,
          facturasEntregadas,
          facturasNoEntregadas,
          facturasPendientes,
          porcentajeEntrega
        },
        
        fechaCreacion: data.fechaCreacion?.toDate?.() || null,
        fechaAsignacion: data.fechaAsignacionRepartidor?.toDate?.() || null,
        fechaInicioEntrega: data.fechaInicioEntrega?.toDate?.() || null,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || null
      };
    });

    console.log(`✅ ${rutas.length} rutas encontradas`);

    res.json({
      success: true,
      data: rutas,
      total: rutas.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo rutas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las rutas',
      error: error.message
    });
  }
};

// ========================================
// OBTENER DETALLE DE RUTA CON FACTURAS Y MAPA
// ========================================
export const getDetalleRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;

    console.log('📋 Obteniendo detalle de ruta:', rutaId);

    const doc = await db.collection('rutas').doc(rutaId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();

    // Validar permisos
    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
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
        // ✅ CORREGIDO: Usar 'facturaId' (del modelo de ruta LIFO) en lugar de 'id'
        const idFactura = facturaRuta.facturaId || facturaRuta.id;
        
        if (idFactura) {
          const facturaDoc = await db.collection('recolecciones').doc(idFactura).get();
          
          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();
            
            facturasDetalladas.push({
              id: facturaDoc.id,
              codigoTracking: facturaData.codigoTracking,
              
              // Info destinatario
              destinatario: {
                nombre: facturaData.cliente || facturaData.destinatario?.nombre || '',
                telefono: facturaData.telefono || facturaData.destinatario?.telefono || '',
                direccion: facturaData.direccion || facturaData.destinatario?.direccion || '',
                zona: facturaData.zona || facturaData.destinatario?.zona || '',
                email: facturaData.email || facturaData.destinatario?.email || ''
              },
              
              // Items con estado de entrega
              items: (facturaData.items || []).map((item, index) => ({
                ...item,
                index,
                // ✅ CORREGIDO: Usar 'entregado' (del frontend) en lugar de 'itemsEntregados'
                entregado: item.entregado || false 
              })),
              
              // Estado de entrega
              // ✅ CORREGIDO: Calcular itemsEntregados desde el array de items
              itemsEntregados: (facturaData.items || []).filter(i => i.entregado).length,
              itemsTotal: facturaData.items?.length || 0,
              estadoEntrega: facturaData.estadoEntrega || 'pendiente',
              
              // Información de pago
              pago: {
                estado: facturaData.pago?.estado || (facturaData.facturacion?.total > 0 ? 'pendiente' : 'pagada'),
                metodoPago: facturaData.pago?.metodoPago || '',
                montoPagado: facturaData.pago?.montoPagado || 0,
                montoPendiente: facturaData.pago?.montoPendiente || (facturaData.facturacion?.total || 0),
                total: facturaData.facturacion?.total || 0
              },
              
              // Items dañados
              itemsDanados: facturaData.itemsDanados || [],
              
              // Evidencias de entrega
              fotosEntrega: facturaData.fotosEntrega || [],
              firmaCliente: facturaData.firmaCliente || null,
              
              // Reportes
              reporteNoEntrega: facturaData.reporteNoEntrega || null,
              
              // Notas
              notas: facturaData.notas || '',
              notasSecretaria: facturaData.notasSecretaria || '',
              
              // Orden en la ruta
              ordenEntrega: facturaRuta.ordenEntrega || 0,
              
              // Estado general
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
    if (data.estado === 'carga_finalizada') {
      estadoCliente = 'cargada';
    }
    
    const ruta = {
      id: doc.id,
      nombre: data.nombre,
      zona: data.zona,
      estado: estadoCliente, // ✅ CORREGIDO: Enviar 'cargada'
      repartidorId: data.repartidorId,
      repartidorNombre: data.repartidorNombre,
      facturas: facturasDetalladas,
      fechaCreacion: data.fechaCreacion?.toDate?.() || null,
      fechaAsignacion: data.fechaAsignacionRepartidor?.toDate?.() || null,
      fechaInicioEntrega: data.fechaInicioEntrega?.toDate?.() || null
    };

    console.log(`✅ Ruta con ${facturasDetalladas.length} facturas`);

    res.json({
      success: true,
      data: ruta
    });

  } catch (error) {
    console.error('❌ Error obteniendo detalle de ruta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el detalle de la ruta',
      error: error.message
    });
  }
};

// ========================================
// INICIAR ENTREGAS DE RUTA
// ========================================
export const iniciarEntregas = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;
    const nombreRepartidor = req.userData?.nombre || 'Repartidor';

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
        message: 'No tiene permisos'
      });
    }

    // Validar estado
    // ✅ CORREGIDO: Validar 'carga_finalizada' en lugar de 'cargada'
    if (data.estado !== 'carga_finalizada') {
      return res.status(400).json({
        success: false,
        // ✅ CORREGIDO: Mensaje de error
        message: `La ruta no está finalizada de cargar (estado actual: ${data.estado})`
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

    await rutaRef.update({
      estado: 'en_entrega', // Este es el estado correcto para "en reparto"
      fechaInicioEntrega: new Date().toISOString(), // Usar new Date() es más simple
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    // Actualizar facturas a estado 'en_ruta'
    const batch = db.batch();
    for (const factura of data.facturas) {
      // ✅ CORREGIDO: Usar 'facturaId'
      const idFactura = factura.facturaId || factura.id;
      if (idFactura) {
        const facturaRef = db.collection('recolecciones').doc(idFactura);
        batch.update(facturaRef, {
          estado: 'en_ruta', // 'en_ruta' es el estado que usa el controller de rutasAvanzadas
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

    console.log('✅ Entregas iniciadas');

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

// ========================================
// CONFIRMAR ITEM ENTREGADO
// ========================================
export const confirmarItemEntregado = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex } = req.body;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;

    console.log(`📦 Confirmando entrega de item ${itemIndex} de factura ${facturaId}`);

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

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    if (itemIndex < 0 || itemIndex >= data.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    // ✅ CORREGIDO: Actualizar el item DENTRO del array 'items'
    const items = [...data.items]; // Copia
    items[itemIndex].entregado = true; // Marcar como entregado
    items[itemIndex].fechaEntregado = new Date().toISOString();
    items[itemIndex].entregadoPor = repartidorId;

    const itemsTotal = items.length;
    const itemsEntregados = items.filter(i => i.entregado).length;
    const todosEntregados = itemsEntregados === itemsTotal;

    await facturaRef.update({
      items: items, // Sobrescribir el array de items
      estadoEntrega: todosEntregados ? 'completo' : 'parcial',
      fechaActualizacion: new Date().toISOString()
    });

    console.log('✅ Item confirmado como entregado');

    res.json({
      success: true,
      message: 'Item confirmado como entregado',
      data: {
        facturaId,
        itemIndex,
        itemsEntregados: itemsEntregados,
        itemsTotal,
        todosEntregados
      }
    });

  } catch (error) {
    console.error('❌ Error confirmando item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar el item',
      error: error.message
    });
  }
};

// ========================================
// SUBIR FOTOS DE EVIDENCIA
// ========================================
export const subirFotosEvidencia = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { fotos } = req.body; // Array de URLs de fotos
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;
    const nombreRepartidor = req.userData?.nombre || 'Repartidor';

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

    const data = doc.data();

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    const historialEntry = {
      accion: 'fotos_evidencia',
      descripcion: `Fotos de entrega subidas por ${nombreRepartidor}`,
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

    console.log(`✅ ${fotos.length} fotos subidas`);

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

// ========================================
// CONFIRMAR PAGO CONTRAENTREGA
// ========================================
export const confirmarPagoContraentrega = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { montoPagado, metodoPago, referenciaPago, notas } = req.body;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;
    const nombreRepartidor = req.userData?.nombre || 'Repartidor';

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

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    const montoTotal = data.facturacion?.total || 0;
    const montoPagadoNum = parseFloat(montoPagado);
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
      descripcion: `Pago contraentrega confirmado por ${nombreRepartidor}`,
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
      message: 'Pago contraentrega confirmado',
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

// ========================================
// REPORTAR ITEM DAÑADO DURANTE ENTREGA
// ========================================
export const reportarItemDanado = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex, descripcionDano, fotos } = req.body;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;
    const nombreRepartidor = req.userData?.nombre || 'Repartidor';

    console.log(`⚠️ Reportando item dañado: factura ${facturaId}, item ${itemIndex}`);

    if (itemIndex === undefined) {
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

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    if (itemIndex < 0 || itemIndex >= data.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    const item = data.items[itemIndex];
    
    // ✅ CORREGIDO: Mover item de 'items' a 'itemsDanados'
    const items = [...data.items];
    const [itemReportado] = items.splice(itemIndex, 1); // Quitar el item

    const reporteDano = {
      item: itemReportado, // Guardar el item completo
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
      descripcion: `Item dañado reportado durante entrega: ${itemReportado.descripcion}`,
      itemIndex,
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      items: items, // Array actualizado sin el item
      itemsDanados: FieldValue.arrayUnion(reporteDano), // Agregar a items dañados
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

// ========================================
// MARCAR FACTURA COMO ENTREGADA
// ========================================
export const marcarFacturaEntregada = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { firmaCliente, nombreReceptor, notasEntrega } = req.body;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;
    const nombreRepartidor = req.userData?.nombre || 'Repartidor';

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

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    // Validar que todos los items estén entregados
    const itemsTotal = data.items?.length || 0;
    // ✅ CORREGIDO: Contar items 'entregado: true'
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

    console.log('✅ Factura marcada como entregada');
    
    // ✅ ACTUALIZAR RUTA (marcar factura como entregada)
    if (data.rutaId) {
        const rutaRef = db.collection('rutas').doc(data.rutaId);
        const rutaDoc = await rutaRef.get();
        if (rutaDoc.exists) {
            const rutaData = rutaDoc.data();
            const facturas = (rutaData.facturas || []).map(f => {
                if (f.facturaId === facturaId) {
                    return { ...f, estado: 'entregada' };
                }
                return f;
            });
            await rutaRef.update({ 
                facturas,
                facturasEntregadas: (rutaData.facturasEntregadas || 0) + 1
            });
        }
    }

    res.json({
      success: true,
      message: 'Factura marcada como entregada exitosamente',
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

// ========================================
// REPORTAR FACTURA NO ENTREGADA
// ========================================
export const reportarFacturaNoEntregada = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { motivo, descripcion, fotos, intentarNuevamente } = req.body;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;
    const nombreRepartidor = req.userData?.nombre || 'Repartidor';

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

    if (data.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

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
    // ✅ CORREGIDO: Si se intenta nuevamente, debe volver a 'confirmada_secretaria'
    const nuevoEstado = intentarNuevamente !== false ? 'confirmada_secretaria' : 'no_entregada';

    await facturaRef.update({
      estado: nuevoEstado,
      reporteNoEntrega,
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry),
      // Limpiar info de ruta
      rutaId: null,
      repartidorId: null,
      repartidorNombre: null,
      ordenCarga: null,
      ordenEntrega: null,
      fechaAsignacionRuta: null
    });

    console.log('✅ Factura reportada como no entregada');
    
    // ✅ ACTUALIZAR RUTA (marcar factura como no_entregada)
    if (data.rutaId) {
        const rutaRef = db.collection('rutas').doc(data.rutaId);
        const rutaDoc = await rutaRef.get();
        if (rutaDoc.exists) {
            const rutaData = rutaDoc.data();
            const facturas = (rutaData.facturas || []).map(f => {
                if (f.facturaId === facturaId) {
                    return { ...f, estado: 'no_entregada' };
                }
                return f;
            });
            await rutaRef.update({ facturas });
        }
    }

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

// ========================================
// FINALIZAR RUTA
// ========================================
export const finalizarRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { notas } = req.body;
    const companyId = req.userData?.companyId;
    const repartidorId = req.userData?.uid;
    const nombreRepartidor = req.userData?.nombre || 'Repartidor';

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
        message: 'No tiene permisos'
      });
    }

    // Contar facturas por estado DENTRO DEL OBJETO RUTA
    const facturasEntregadas = data.facturas.filter(f => f.estado === 'entregada').length;
    const facturasNoEntregadas = data.facturas.filter(f => f.estado === 'no_entregada').length;
    const facturasPendientes = data.facturas.length - facturasEntregadas - facturasNoEntregadas;

    // ✅ VALIDACIÓN: No se puede finalizar si quedan pendientes
    if (facturasPendientes > 0) {
        return res.status(400).json({
            success: false,
            message: `Aún tienes ${facturasPendientes} factura(s) pendiente(s) por gestionar (entregar o reportar).`
        });
    }

    const historialEntry = {
      accion: 'finalizar_ruta',
      descripcion: `Ruta finalizada por ${nombreRepartidor}`,
      facturasEntregadas,
      facturasNoEntregadas,
      facturasPendientes,
      notas: notas || '',
      usuario: repartidorId,
      nombreUsuario: nombreRepartidor,
      rol: 'repartidor',
      fecha: new Date().toISOString()
    };

    await rutaRef.update({
      estado: 'completada',
      fechaFinalizacion: new Date().toISOString(),
      notasRepartidor: notas || '',
      resumenEntregas: {
        entregadas: facturasEntregadas,
        noEntregadas: facturasNoEntregadas,
        pendientes: facturasPendientes
      },
      fechaActualizacion: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log('✅ Ruta finalizada');

    res.json({
      success: true,
      message: 'Ruta finalizada exitosamente',
      data: {
        rutaId,
        facturasEntregadas,
        facturasNoEntregadas,
        facturasPendientes
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