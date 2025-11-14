// backend/src/controllers/cargadoresController.js
/**
 * ✅ CONTROLADOR DE CARGADORES - VERSIÓN COMPLETA
 * 
 * Gestión de carga de camiones item por item
 * 
 * Funcionalidades:
 * - Ver rutas asignadas al cargador
 * - Ver facturas de la ruta con items detallados
 * - Confirmar items uno por uno al cargar
 * - Reportar items dañados durante carga (con fotos)
 * - Marcar ruta como cargada/lista para entrega
 * - Validaciones completas de permisos y estado
 */

import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

// ========================================
// 📋 OBTENER RUTAS ASIGNADAS AL CARGADOR
// ========================================
export const getRutasAsignadas = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    const cargadorId = req.userData?.uid;

    console.log('🚚 Cargador obteniendo rutas asignadas:', cargadorId);

    const snapshot = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .where('cargadorId', '==', cargadorId)
      .where('estado', 'in', ['asignada', 'en_carga'])
      .orderBy('fechaCreacion', 'desc')
      .get();

    const rutas = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Calcular progreso de carga
      const totalItems = data.facturas?.reduce((sum, f) => sum + (f.items?.length || 0), 0) || 0;
      const itemsCargados = data.facturas?.reduce((sum, f) => sum + (f.itemsCargados || 0), 0) || 0;
      const porcentajeCarga = totalItems > 0 ? Math.round((itemsCargados / totalItems) * 100) : 0;

      return {
        id: doc.id,
        nombre: data.nombre,
        zona: data.zona,
        estado: data.estado,
        cargadorId: data.cargadorId,
        cargadorNombre: data.cargadorNombre,
        
        estadisticas: {
          totalFacturas: data.facturas?.length || 0,
          facturasCargadas: data.facturas?.filter(f => f.estadoCarga === 'cargada').length || 0,
          totalItems,
          itemsCargados,
          porcentajeCarga
        },
        
        fechaCreacion: data.fechaCreacion?.toDate?.() || null,
        fechaAsignacion: data.fechaAsignacion?.toDate?.() || null,
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
// 📦 OBTENER DETALLE DE RUTA CON FACTURAS
// ========================================
export const getDetalleRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const companyId = req.userData?.companyId;
    const cargadorId = req.userData?.uid;

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
        message: 'No tiene permisos para ver esta ruta'
      });
    }

    if (data.cargadorId !== cargadorId) {
      return res.status(403).json({
        success: false,
        message: 'Esta ruta no está asignada a usted'
      });
    }

    // Obtener detalles completos de cada factura
    const facturasDetalladas = [];

    if (data.facturas && data.facturas.length > 0) {
      for (const facturaRuta of data.facturas) {
        if (facturaRuta.id) {
          const facturaDoc = await db.collection('recolecciones').doc(facturaRuta.id).get();
          
          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();
            
            facturasDetalladas.push({
              id: facturaDoc.id,
              codigoTracking: facturaData.codigoTracking,
              
              // Info básica
              destinatario: {
                nombre: facturaData.destinatario?.nombre || 'Sin nombre',
                direccion: facturaData.destinatario?.direccion || 'Sin dirección',
                zona: facturaData.destinatario?.zona || '',
                telefono: facturaData.destinatario?.telefono || ''
              },
              
              // Items con estado de carga
              items: (facturaData.items || []).map((item, index) => ({
                ...item,
                index,
                cargado: facturaRuta.itemsCargadosIndices?.includes(index) || false
              })),
              
              // Estado de carga
              estadoCarga: facturaRuta.estadoCarga || 'pendiente',
              itemsTotal: facturaData.items?.length || 0,
              itemsCargados: facturaRuta.itemsCargados || 0,
              porcentajeCarga: facturaData.items?.length > 0 
                ? Math.round((facturaRuta.itemsCargados || 0) / facturaData.items.length * 100)
                : 0,
              
              // Items dañados reportados durante carga
              itemsDanados: facturaData.itemsDanados?.filter(
                d => d.momentoReporte === 'carga'
              ) || [],
              
              // Fotos de los items
              fotos: facturaData.fotos || [],
              
              // Notas
              notas: facturaData.notas || '',
              notasSecretaria: facturaData.notasSecretaria || ''
            });
          }
        }
      }
    }

    const ruta = {
      id: doc.id,
      nombre: data.nombre,
      zona: data.zona,
      estado: data.estado,
      cargadorId: data.cargadorId,
      cargadorNombre: data.cargadorNombre,
      facturas: facturasDetalladas,
      fechaCreacion: data.fechaCreacion?.toDate?.() || null,
      fechaAsignacion: data.fechaAsignacion?.toDate?.() || null
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
// 🚀 INICIAR CARGA DE RUTA
// ========================================
export const iniciarCarga = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const companyId = req.userData?.companyId;
    const cargadorId = req.userData?.uid;
    const nombreCargador = req.userData?.nombre || 'Cargador';

    console.log('🚀 Iniciando carga de ruta:', rutaId);

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
    if (data.companyId !== companyId || data.cargadorId !== cargadorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para iniciar esta carga'
      });
    }

    // Validar estado
    if (data.estado !== 'asignada') {
      return res.status(400).json({
        success: false,
        message: `La ruta no está en estado asignada (estado actual: ${data.estado})`
      });
    }

    const historialEntry = {
      accion: 'inicio_carga',
      descripcion: `Carga iniciada por ${nombreCargador}`,
      usuario: cargadorId,
      nombreUsuario: nombreCargador,
      rol: 'cargador',
      fecha: new Date().toISOString()
    };

    await rutaRef.update({
      estado: 'en_carga',
      fechaInicioCarga: FieldValue.serverTimestamp(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log('✅ Carga iniciada');

    res.json({
      success: true,
      message: 'Carga iniciada exitosamente',
      data: {
        rutaId,
        estado: 'en_carga'
      }
    });

  } catch (error) {
    console.error('❌ Error iniciando carga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar la carga',
      error: error.message
    });
  }
};

// ========================================
// ✅ CONFIRMAR ITEM CARGADO
// ========================================
export const confirmarItemCargado = async (req, res) => {
  try {
    const { rutaId, facturaId } = req.params;
    const { itemIndex } = req.body;
    const companyId = req.userData?.companyId;
    const cargadorId = req.userData?.uid;

    console.log(`✅ Confirmando item cargado: ruta ${rutaId}, factura ${facturaId}, item ${itemIndex}`);

    if (itemIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item requerido'
      });
    }

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
    if (data.companyId !== companyId || data.cargadorId !== cargadorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    // Validar estado
    if (data.estado !== 'en_carga') {
      return res.status(400).json({
        success: false,
        message: 'La ruta no está en proceso de carga'
      });
    }

    // Obtener datos de la factura
    const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
    
    if (!facturaDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Factura no encontrada'
      });
    }

    const factura = facturaDoc.data();

    if (itemIndex < 0 || itemIndex >= factura.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    // Actualizar array de facturas en la ruta
    const facturasActualizadas = data.facturas.map(f => {
      if (f.id === facturaId) {
        const itemsCargadosIndices = f.itemsCargadosIndices || [];
        
        // Agregar índice si no está ya
        if (!itemsCargadosIndices.includes(itemIndex)) {
          itemsCargadosIndices.push(itemIndex);
        }

        const itemsCargados = itemsCargadosIndices.length;
        const itemsTotal = factura.items.length;
        const estadoCarga = itemsCargados === itemsTotal ? 'cargada' : 'en_carga';

        return {
          ...f,
          itemsCargadosIndices,
          itemsCargados,
          estadoCarga,
          fechaUltimaCarga: new Date().toISOString()
        };
      }
      return f;
    });

    await rutaRef.update({
      facturas: facturasActualizadas,
      fechaActualizacion: FieldValue.serverTimestamp()
    });

    // Actualizar en recolección
    const facturaRuta = facturasActualizadas.find(f => f.id === facturaId);
    
    await db.collection('recolecciones').doc(facturaId).update({
      itemsCargados: facturaRuta.itemsCargados,
      estadoCarga: facturaRuta.estadoCarga,
      fechaActualizacion: FieldValue.serverTimestamp()
    });

    console.log('✅ Item confirmado como cargado');

    res.json({
      success: true,
      message: 'Item confirmado como cargado',
      data: {
        facturaId,
        itemIndex,
        itemsCargados: facturaRuta.itemsCargados,
        itemsTotal: factura.items.length,
        estadoCarga: facturaRuta.estadoCarga
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
// ⚠️ REPORTAR ITEM DAÑADO DURANTE CARGA
// ========================================
export const reportarItemDanado = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex, descripcionDano, fotos } = req.body;
    const companyId = req.userData?.companyId;
    const cargadorId = req.userData?.uid;
    const nombreCargador = req.userData?.nombre || 'Cargador';

    console.log(`⚠️ Reportando item dañado: factura ${facturaId}, item ${itemIndex}`);

    if (itemIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item requerido'
      });
    }

    if (!descripcionDano || descripcionDano.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'La descripción del daño es obligatoria'
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

    // Validar permisos
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
    
    const itemDanado = {
      itemIndex,
      item: {
        cantidad: item.cantidad,
        descripcion: item.descripcion,
        precio: item.precio
      },
      descripcionDano: descripcionDano.trim(),
      fotos: fotos || [],
      reportadoPor: cargadorId,
      nombreReportador: nombreCargador,
      rolReportador: 'cargador',
      momentoReporte: 'carga',
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: 'item_danado_carga',
      descripcion: `Item dañado reportado durante carga: ${item.descripcion}`,
      itemIndex,
      usuario: cargadorId,
      nombreUsuario: nombreCargador,
      rol: 'cargador',
      fecha: new Date().toISOString()
    };

    await facturaRef.update({
      itemsDanados: FieldValue.arrayUnion(itemDanado),
      historial: FieldValue.arrayUnion(historialEntry),
      fechaActualizacion: FieldValue.serverTimestamp()
    });

    console.log('✅ Item dañado reportado');

    res.json({
      success: true,
      message: 'Item dañado reportado exitosamente',
      data: itemDanado
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
// 🏁 FINALIZAR CARGA DE RUTA
// ========================================
export const finalizarCarga = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { notas } = req.body;
    const companyId = req.userData?.companyId;
    const cargadorId = req.userData?.uid;
    const nombreCargador = req.userData?.nombre || 'Cargador';

    console.log('🏁 Finalizando carga de ruta:', rutaId);

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
    if (data.companyId !== companyId || data.cargadorId !== cargadorId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    // Validar estado
    if (data.estado !== 'en_carga') {
      return res.status(400).json({
        success: false,
        message: 'La ruta no está en proceso de carga'
      });
    }

    // Verificar que todas las facturas estén cargadas
    const facturasIncompletas = data.facturas.filter(f => f.estadoCarga !== 'cargada');
    
    if (facturasIncompletas.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hay facturas con items sin cargar',
        requiereConfirmacion: true,
        facturasIncompletas: facturasIncompletas.map(f => ({
          id: f.id,
          codigoTracking: f.codigoTracking,
          itemsCargados: f.itemsCargados || 0,
          itemsTotal: f.itemsTotal || 0
        }))
      });
    }

    const historialEntry = {
      accion: 'finalizar_carga',
      descripcion: `Carga finalizada por ${nombreCargador}`,
      notas: notas || '',
      usuario: cargadorId,
      nombreUsuario: nombreCargador,
      rol: 'cargador',
      fecha: new Date().toISOString()
    };

    // Actualizar ruta
    await rutaRef.update({
      estado: 'cargada',
      fechaFinCarga: FieldValue.serverTimestamp(),
      notasCargador: notas || '',
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    // Actualizar facturas a estado 'lista_entrega'
    const batch = db.batch();
    for (const factura of data.facturas) {
      if (factura.id) {
        const facturaRef = db.collection('recolecciones').doc(factura.id);
        batch.update(facturaRef, {
          estado: 'lista_entrega',
          fechaActualizacion: FieldValue.serverTimestamp(),
          historial: FieldValue.arrayUnion({
            accion: 'ruta_cargada',
            descripcion: 'Ruta cargada, lista para entrega',
            fecha: new Date().toISOString()
          })
        });
      }
    }
    await batch.commit();

    console.log('✅ Carga finalizada exitosamente');

    res.json({
      success: true,
      message: 'Carga finalizada exitosamente. Ruta lista para entregas.',
      data: {
        rutaId,
        estado: 'cargada',
        totalFacturas: data.facturas.length
      }
    });

  } catch (error) {
    console.error('❌ Error finalizando carga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al finalizar la carga',
      error: error.message
    });
  }
};