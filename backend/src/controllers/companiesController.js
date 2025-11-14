// backend/src/controllers/cargadoresController.js
import { db } from '../config/firebase.js';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';

// ========================================
// FUNCIÓN HELPER PARA OBTENER FACTURAS DE RUTA
// ========================================

/**
 * Obtiene los documentos de 'recolecciones' asociados a una ruta
 */
const getFacturasDeRuta = async (rutaData) => {
  const facturaIds = rutaData.facturas.map(f => f.facturaId);
  if (facturaIds.length === 0) {
    return [];
  }
  
  // Usar 'in' para obtener todos los documentos de 'recolecciones' de una vez
  const recoleccionesSnap = await db.collection('recolecciones')
    .where(FieldPath.documentId(), 'in', facturaIds)
    .get();
    
  return recoleccionesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ========================================
// FUNCIÓN HELPER PARA CALCULAR ESTADÍSTICAS
// ========================================

/**
 * Calcula las estadísticas de carga (como en el frontend)
 */
const calcularEstadisticas = (recolecciones) => {
  let totalItems = 0;
  let itemsCargados = 0;

  for (const factura of recolecciones) {
    const itemsEnFactura = factura.items ? factura.items.length : 0;
    const itemsDanadosEnFactura = factura.itemsDanados ? factura.itemsDanados.length : 0;
    
    // El total incluye items pendientes + items ya dañados
    totalItems += itemsEnFactura + itemsDanadosEnFactura;
    
    // Los cargados son solo los que tienen .cargado = true
    if (factura.items) {
      itemsCargados += factura.items.filter(item => item.cargado === true).length;
    }
  }

  const porcentajeCarga = totalItems > 0 ? Math.round((itemsCargados / totalItems) * 100) : 0;
  
  return {
    totalFacturas: recolecciones.length,
    totalItems,
    itemsCargados,
    porcentajeCarga,
  };
};

// ========================================
// OBTENER RUTAS ASIGNADAS (VISTA LISTA)
// ========================================

/**
 * @desc    Obtener rutas asignadas al cargador logueado
 * @route   GET /api/cargadores/rutas
 */
export const getRutasAsignadas = async (req, res) => {
  try {
    const cargadorId = req.userData.uid;
    const companyId = req.userData.companyId;

    // 1. Buscar rutas de la compañía en estado 'asignada' o 'en_carga'
    const rutasSnap = await db.collection('rutas')
      .where('companyId', '==', companyId)
      .where('estado', 'in', ['asignada', 'en_carga'])
      .get();

    // 2. Filtrar en JavaScript solo las que pertenecen a este cargador
    //    (Firestore no permite 'array-contains' en un objeto de array + otro 'where')
    const misRutasDocs = rutasSnap.docs.filter(doc => {
      const cargadores = doc.data().cargadores || [];
      return cargadores.some(c => c.id === cargadorId);
    });

    // 3. Obtener estadísticas para cada ruta
    const rutasConStatsPromises = misRutasDocs.map(async (rutaDoc) => {
      const rutaData = rutaDoc.data();
      
      // Obtener las facturas (recolecciones) de esta ruta
      const recolecciones = await getFacturasDeRuta(rutaData);
      
      // Calcular estadísticas
      const estadisticas = calcularEstadisticas(recolecciones);
      
      return {
        id: rutaDoc.id,
        nombre: rutaData.nombre,
        zona: rutaData.zona || 'Sin Zona', // Asumir que ruta tiene zona
        estado: rutaData.estado,
        estadisticas: estadisticas,
      };
    });

    const rutasConStats = await Promise.all(rutasConStatsPromises);

    res.json({ success: true, data: rutasConStats });

  } catch (error) {
    console.error('Error cargando rutas asignadas:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// ========================================
// OBTENER DETALLE DE RUTA (VISTA DETALLE)
// ========================================

/**
 * @desc    Obtener el detalle de una ruta específica
 * @route   GET /api/cargadores/rutas/:rutaId
 */
export const getDetalleRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const cargadorId = req.userData.uid;

    // 1. Obtener la ruta
    const rutaRef = db.collection('rutas').doc(rutaId);
    const rutaDoc = await rutaRef.get();

    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
    }
    const rutaData = rutaDoc.data();

    // 2. Validar permisos
    if (rutaData.companyId !== req.userData.companyId || !rutaData.cargadores.some(c => c.id === cargadorId)) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver esta ruta' });
    }

    // 3. Obtener todas las facturas (recolecciones) de la ruta
    const recolecciones = await getFacturasDeRuta(rutaData);
    
    // 4. Crear un mapa para acceso rápido
    const recoleccionesMap = recolecciones.reduce((acc, rec) => {
      acc[rec.id] = rec;
      return acc;
    }, {});
    
    // 5. Combinar datos de la ruta (orden) con datos de la recolección (items, cliente)
    const facturasCombinadas = rutaData.facturas.map(facturaRuta => {
      const detalleRecoleccion = recoleccionesMap[facturaRuta.facturaId] || {};
      
      return {
        ...detalleRecoleccion, // items, destinatario, codigoTracking, etc.
        id: facturaRuta.facturaId, // Asegurar que el ID sea el de la factura
        ordenCarga: facturaRuta.ordenCarga,
        ordenEntrega: facturaRuta.ordenEntrega
      };
    });
    
    // 6. Ordenar por ordenCarga (como en el frontend)
    facturasCombinadas.sort((a, b) => (a.ordenCarga || 0) - (b.ordenCarga || 0));

    res.json({
      success: true,
      data: {
        ...rutaData,
        id: rutaDoc.id,
        facturas: facturasCombinadas // Enviar las facturas completas y ordenadas
      }
    });

  } catch (error) {
    console.error('Error cargando detalle de ruta:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// ========================================
// INICIAR CARGA
// ========================================

/**
 * @desc    Marcar una ruta como "en_carga"
 * @route   POST /api/cargadores/rutas/:rutaId/iniciar-carga
 */
export const iniciarCarga = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const cargadorId = req.userData.uid;
    const cargadorNombre = req.userData.nombre;

    const rutaRef = db.collection('rutas').doc(rutaId);
    const rutaDoc = await rutaRef.get();

    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
    }
    const rutaData = rutaDoc.data();

    // Validar permisos
    if (rutaData.companyId !== req.userData.companyId || !rutaData.cargadores.some(c => c.id === cargadorId)) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para iniciar esta ruta' });
    }

    if (rutaData.estado !== 'asignada') {
      return res.status(400).json({ success: false, message: 'Esta ruta no se puede iniciar' });
    }

    // Actualizar ruta
    await rutaRef.update({
      estado: 'en_carga',
      fechaInicioCarga: new Date().toISOString(),
      historial: FieldValue.arrayUnion({
        accion: 'iniciar_carga',
        descripcion: `Carga iniciada por ${cargadorNombre}`,
        usuario: cargadorId,
        fecha: new Date().toISOString()
      })
    });

    res.json({ success: true, message: 'Carga iniciada exitosamente' });

  } catch (error) {
    console.error('Error iniciando carga:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// ========================================
// CONFIRMAR ITEM CARGADO
// ========================================

/**
 * @desc    Confirmar que un item ha sido cargado
 * @route   POST /api/cargadores/rutas/:rutaId/facturas/:facturaId/items/confirmar
 */
export const confirmarItemCargado = async (req, res) => {
  try {
    const { rutaId, facturaId } = req.params;
    const { itemIndex } = req.body;
    const cargadorId = req.userData.uid;

    if (itemIndex === undefined || itemIndex < 0) {
      return res.status(400).json({ success: false, message: 'Índice de item inválido' });
    }

    // 1. Validar permisos sobre la ruta
    const rutaDoc = await db.collection('rutas').doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
    }
    const rutaData = rutaDoc.data();

    if (rutaData.estado !== 'en_carga') {
      return res.status(403).json({ success: false, message: 'La ruta no está en proceso de carga' });
    }
    if (!rutaData.cargadores.some(c => c.id === cargadorId)) {
      return res.status(403).json({ success: false, message: 'No tienes permiso en esta ruta' });
    }
    if (!rutaData.facturas.some(f => f.facturaId === facturaId)) {
      return res.status(403).json({ success: false, message: 'Esa factura no pertenece a esta ruta' });
    }

    // 2. Actualizar el item en la 'recoleccion'
    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const facturaDoc = await facturaRef.get();
    if (!facturaDoc.exists) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }

    const facturaData = facturaDoc.data();
    const items = [...facturaData.items]; // Copia del array

    if (itemIndex >= items.length) {
      return res.status(400).json({ success: false, message: 'Índice de item fuera de rango' });
    }
    
    // 3. Marcar como cargado
    items[itemIndex].cargado = true;
    items[itemIndex].fechaCargado = new Date().toISOString();
    items[itemIndex].cargadoPor = cargadorId;

    await facturaRef.update({
      items: items
    });

    res.json({ success: true, message: 'Item confirmado' });

  } catch (error) {
    console.error('Error confirmando item:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// ========================================
// REPORTAR ITEM DAÑADO
// ========================================

/**
 * @desc    Reportar un item como dañado
 * @route   POST /api/cargadores/facturas/:facturaId/items/danado
 */
export const reportarItemDanado = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex, descripcionDano, fotos } = req.body;
    const cargadorId = req.userData.uid;
    const cargadorNombre = req.userData.nombre;

    if (itemIndex === undefined || itemIndex < 0 || !descripcionDano) {
      return res.status(400).json({ success: false, message: 'Índice y descripción son requeridos' });
    }

    // 1. Obtener la factura (recoleccion)
    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const facturaDoc = await facturaRef.get();
    if (!facturaDoc.exists) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada' });
    }
    
    const facturaData = facturaDoc.data();
    const rutaId = facturaData.rutaId;

    if (!rutaId) {
      return res.status(403).json({ success: false, message: 'La factura no está en una ruta' });
    }

    // 2. Validar permisos a través de la ruta
    const rutaDoc = await db.collection('rutas').doc(rutaId).get();
    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, message: 'Ruta asociada no encontrada' });
    }
    const rutaData = rutaDoc.data();

    if (rutaData.estado !== 'en_carga') {
      return res.status(403).json({ success: false, message: 'La ruta no está en proceso de carga' });
    }
    if (!rutaData.cargadores.some(c => c.id === cargadorId)) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para reportar daños en esta ruta' });
    }

    // 3. Mover el item de 'items' a 'itemsDanados'
    const items = [...facturaData.items];
    if (itemIndex >= items.length) {
      return res.status(400).json({ success: false, message: 'Índice de item fuera de rango' });
    }

    const [itemReportado] = items.splice(itemIndex, 1); // Quitar el item

    const reporteDano = {
      item: itemReportado,
      descripcionDano,
      fotos: fotos || [],
      fechaReporte: new Date().toISOString(),
      reportadoPor: cargadorId,
      reportadoPorNombre: cargadorNombre,
      fase: 'carga' // Para saber que se dañó durante la carga
    };

    const itemsDanados = [...(facturaData.itemsDanados || []), reporteDano];

    // 4. Actualizar la factura
    await facturaRef.update({
      items: items,
      itemsDanados: itemsDanados
    });

    res.json({ success: true, message: 'Item dañado reportado' });

  } catch (error) {
    console.error('Error reportando daño:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

// ========================================
// FINALIZAR CARGA
// ========================================

/**
 * @desc    Marcar una ruta como "carga_finalizada"
 * @route   POST /api/cargadores/rutas/:rutaId/finalizar-carga
 */
export const finalizarCarga = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { notas } = req.body;
    const cargadorId = req.userData.uid;
    const cargadorNombre = req.userData.nombre;

    // 1. Obtener la ruta y validar permisos
    const rutaRef = db.collection('rutas').doc(rutaId);
    const rutaDoc = await rutaRef.get();

    if (!rutaDoc.exists) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
    }
    const rutaData = rutaDoc.data();

    if (rutaData.estado !== 'en_carga') {
      return res.status(403).json({ success: false, message: 'La ruta no está en proceso de carga' });
    }
    if (!rutaData.cargadores.some(c => c.id === cargadorId)) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para finalizar esta ruta' });
    }

    // 2. VALIDACIÓN (como en el frontend): Verificar items pendientes
    const recolecciones = await getFacturasDeRuta(rutaData);
    const facturasIncompletas = [];

    for (const factura of recolecciones) {
      const itemsPendientes = (factura.items || []).filter(item => !item.cargado).length;
      
      if (itemsPendientes > 0) {
        // Calcular totales para el mensaje de error (como en el frontend)
        const itemsTotal = (factura.items || []).length + (factura.itemsDanados || []).length;
        const itemsCargados = (factura.items || []).filter(item => item.cargado).length;
        
        facturasIncompletas.push({
          id: factura.id,
          codigoTracking: factura.codigoTracking || factura.id,
          itemsTotal: itemsTotal,
          itemsCargados: itemsCargados,
        });
      }
    }

    // 3. Si hay incompletas, enviar el error que espera el frontend
    if (facturasIncompletas.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Hay items pendientes de cargar.',
        requiereConfirmacion: true, // El frontend usa esto
        facturasIncompletas: facturasIncompletas
      });
    }

    // 4. Si todo OK, finalizar la carga
    await rutaRef.update({
      estado: 'carga_finalizada',
      notasCarga: notas || '',
      fechaCargaFinalizada: new Date().toISOString(),
      historial: FieldValue.arrayUnion({
        accion: 'finalizar_carga',
        descripcion: `Carga finalizada por ${cargadorNombre}`,
        usuario: cargadorId,
        fecha: new Date().toISOString()
      })
    });
    
    // (Opcional) Actualizar estado de todas las recolecciones a 'lista_para_entregar'
    const batch = db.batch();
    for (const factura of recolecciones) {
        const facRef = db.collection('recolecciones').doc(factura.id);
        batch.update(facRef, { 
            estado: 'lista_para_entregar', // O el estado que uses
            fechaActualizacion: FieldValue.serverTimestamp()
        });
    }
    await batch.commit();

    res.json({ success: true, message: 'Carga finalizada exitosamente' });

  } catch (error) {
    console.error('Error finalizando carga:', error);
    res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};