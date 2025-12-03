import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, generateBrandedEmailHTML } from '../services/notificationService.js';

// ==========================================================================
// 📋 OBTENER RUTAS ASIGNADAS AL CARGADOR (Soporte Híbrido + Robusto)
// ==========================================================================
export const getRutasAsignadas = async (req, res) => {
  try {
    // Soporte dual para autenticación
    const cargadorId = req.user?.uid || req.userData?.uid;
    
    // Obtener datos del usuario para validar la compañía
    const userDoc = await db.collection('usuarios').doc(cargadorId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    
    const userData = userDoc.data();
    const companyId = userData.companyId;

    console.log('🚚 Cargador buscando rutas:', cargadorId, 'Empresa:', companyId);

    const rutasRef = db.collection('rutas');
    let rutasDocs = [];

    // DIAGNÓSTICO: Ver TODAS las rutas de la compañía
    const todasRutas = await rutasRef
      .where('companyId', '==', companyId)
      .get();
    console.log(`📊 Total rutas en compañía: ${todasRutas.size}`);
    todasRutas.docs.forEach(doc => {
      const d = doc.data();
      console.log(`   - Ruta ${doc.id}: estado="${d.estado}", cargadorId="${d.cargadorId}", cargadoresIds=${JSON.stringify(d.cargadoresIds)}`);
    });

    // ESTRATEGIA DE BÚSQUEDA HÍBRIDA
    // 1. Intentar búsqueda avanzada por array 'cargadoresIds'
    try {
      console.log('🔍 Intentando búsqueda con array-contains...');
      const snapshotArray = await rutasRef
        .where('companyId', '==', companyId)
        .where('cargadoresIds', 'array-contains', cargadorId)
        .where('estado', 'in', ['asignada', 'en_carga'])
        .get();

      rutasDocs = [...snapshotArray.docs];
      console.log(`✅ Búsqueda array: ${rutasDocs.length} rutas`);
    } catch (e) {
      console.warn('⚠️ Búsqueda por array falló (índice faltante):', e.message);
    }

    // 2. Búsqueda fallback por campo simple 'cargadorId'
    console.log('🔍 Intentando búsqueda con cargadorId simple...');
    const snapshotSimple = await rutasRef
      .where('companyId', '==', companyId)
      .where('cargadorId', '==', cargadorId)
      .where('estado', 'in', ['asignada', 'en_carga'])
      .get();

    console.log(`✅ Búsqueda simple: ${snapshotSimple.docs.length} rutas`);

    // Evitar duplicados si la primera búsqueda funcionó parcialmente
    const idsExistentes = new Set(rutasDocs.map(d => d.id));
    snapshotSimple.docs.forEach(doc => {
      if (!idsExistentes.has(doc.id)) {
        rutasDocs.push(doc);
      }
    });

    // 3. Procesar y formatear datos
    const rutas = rutasDocs.map(doc => {
      const data = doc.data();
      const facturas = data.facturas || [];
      
      // Calcular estadísticas en tiempo real
      const totalItems = facturas.reduce((sum, f) => sum + (f.itemsTotal || f.items?.length || 0), 0) || data.itemsTotalRuta || 0;
      const itemsCargados = facturas.reduce((sum, f) => sum + (f.itemsCargados || 0), 0) || data.itemsCargadosRuta || 0;
      const facturasCargadas = facturas.filter(f => f.estadoCarga === 'cargada').length;
      const porcentajeCarga = totalItems > 0 ? Math.round((itemsCargados / totalItems) * 100) : 0;

      return {
        id: doc.id,
        nombre: data.nombre,
        zona: data.zona || 'Zona General',
        estado: data.estado,
        repartidorNombre: data.repartidorNombre || data.empleadoNombre || 'Sin asignar',
        cargadorId: data.cargadorId,
        cargadorNombre: data.cargadorNombre,
        
        // Estadísticas estandarizadas
        estadisticas: {
          totalFacturas: facturas.length,
          facturasCargadas: facturasCargadas,
          totalItems: totalItems,
          itemsCargados: itemsCargados,
          porcentajeCarga: porcentajeCarga
        },
        
        // Fechas con manejo dual de timestamps
        fechaCreacion: data.fechaCreacion?.toDate?.() || data.createdAt || new Date().toISOString(),
        fechaAsignacion: data.fechaAsignacion?.toDate?.() || data.fechaAsignacion || null,
        fechaActualizacion: data.fechaActualizacion?.toDate?.() || data.updatedAt || null
      };
    });

    // 4. Ordenar en memoria (workaround para limitación de Firestore con 'in')
    rutas.sort((a, b) => {
      const dateA = new Date(a.fechaCreacion);
      const dateB = new Date(b.fechaCreacion);
      return dateB - dateA; // Más reciente primero
    });

    console.log(`✅ Total: ${rutas.length} rutas activas`);
    
    res.json({ 
      success: true, 
      data: rutas, 
      total: rutas.length 
    });

  } catch (error) {
    console.error('❌ Error crítico obteniendo rutas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener las rutas',
      error: error.message 
    });
  }
};

// ==========================================================================
// 📦 OBTENER DETALLE DE RUTA (Con Facturas Completas)
// ==========================================================================
export const getDetalleRuta = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const cargadorId = req.user?.uid || req.userData?.uid;
    
    console.log('📋 Obteniendo detalle de ruta:', rutaId);

    const doc = await db.collection('rutas').doc(rutaId).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    const data = doc.data();
    
    // Verificar permisos (misma compañía)
    const userDoc = await db.collection('usuarios').doc(cargadorId).get();
    const userData = userDoc.data();
    
    if (data.companyId !== userData.companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene autorización para ver esta ruta'
      });
    }

    // Verificar asignación al cargador (soporte híbrido)
    const esAsignado = data.cargadorId === cargadorId || 
                       (data.cargadoresIds && data.cargadoresIds.includes(cargadorId));
    
    if (!esAsignado) {
      return res.status(403).json({
        success: false,
        message: 'Esta ruta no está asignada a usted'
      });
    }

    // Obtener detalles completos de facturas desde 'recolecciones'
    const facturasDetalladas = [];

    if (data.facturas && data.facturas.length > 0) {
      for (const facturaRuta of data.facturas) {
        const facturaId = facturaRuta.id || facturaRuta.facturaId;
        
        if (facturaId) {
          const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
          
          if (facturaDoc.exists) {
            const facturaData = facturaDoc.data();
            
            // Determinar qué items están cargados
            const itemsCargadosIndices = facturaRuta.itemsCargadosIndices || [];
            
            facturasDetalladas.push({
              id: facturaDoc.id,
              codigoTracking: facturaData.codigoTracking,
              
              // Info básica del destinatario
              destinatario: {
                nombre: facturaData.destinatario?.nombre || 'Sin nombre',
                direccion: facturaData.destinatario?.direccion || 'Sin dirección',
                zona: facturaData.destinatario?.zona || '',
                telefono: facturaData.destinatario?.telefono || ''
              },
              
              // Items con estado de carga individual
              items: (facturaData.items || []).map((item, index) => ({
                ...item,
                index,
                cargado: itemsCargadosIndices.includes(index) || item.cargado || false,
                fechaCarga: item.fechaCarga || null,
                cargadoPor: item.cargadoPor || null
              })),
              
              // Estado de carga
              estadoCarga: facturaRuta.estadoCarga || 'pendiente',
              itemsTotal: facturaData.items?.length || 0,
              itemsCargados: facturaRuta.itemsCargados || 0,
              porcentajeCarga: facturaData.items?.length > 0 
                ? Math.round((facturaRuta.itemsCargados || 0) / facturaData.items.length * 100)
                : 0,
              
              // Items dañados (filtrados por momento)
              itemsDanados: (facturaData.itemsDanados || []).filter(
                d => d.momentoReporte === 'carga' || d.etapa === 'carga'
              ),
              
              // Fotos y notas
              fotos: facturaData.fotos || [],
              notas: facturaData.notas || '',
              notasSecretaria: facturaData.notasSecretaria || '',
              
              fechaUltimaCarga: facturaRuta.fechaUltimaCarga || null
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
      repartidorNombre: data.repartidorNombre || data.empleadoNombre,
      facturas: facturasDetalladas,
      itemsTotalRuta: data.itemsTotalRuta || 0,
      itemsCargadosRuta: data.itemsCargadosRuta || 0,
      fechaCreacion: data.fechaCreacion?.toDate?.() || data.createdAt || null,
      fechaAsignacion: data.fechaAsignacion?.toDate?.() || null,
      fechaInicioCarga: data.fechaInicioCarga?.toDate?.() || data.fechaInicioCarga || null
    };

    console.log(`✅ Ruta con ${facturasDetalladas.length} facturas detalladas`);

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

// ==========================================================================
// 🚀 INICIAR CARGA DE RUTA
// ==========================================================================
export const iniciarCarga = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const cargadorId = req.user?.uid || req.userData?.uid;
    const nombreCargador = req.user?.nombre || req.userData?.nombre || 'Cargador';

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
    const userDoc = await db.collection('usuarios').doc(cargadorId).get();
    const userData = userDoc.data();
    
    if (data.companyId !== userData.companyId) {
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
      updatedAt: new Date().toISOString(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    console.log('✅ Carga iniciada exitosamente');

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

// ==========================================================================
// ✅ CONFIRMAR ITEM CARGADO (Transacción Atómica)
// ==========================================================================
export const confirmarItemCargado = async (req, res) => {
  try {
    const { rutaId, facturaId } = req.params;
    const { itemIndex } = req.body;
    const cargadorId = req.user?.uid || req.userData?.uid;

    console.log(`✅ Confirmando item: ruta ${rutaId}, factura ${facturaId}, item ${itemIndex}`);

    if (itemIndex === undefined || itemIndex < 0) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    const rutaRef = db.collection('rutas').doc(rutaId);
    
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rutaRef);
      if (!doc.exists) throw new Error("La ruta no existe");
      
      const data = doc.data();
      
      // Validar estado
      if (data.estado !== 'en_carga') {
        throw new Error("La ruta no está en proceso de carga");
      }
      
      // Obtener factura original para validar item
      const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
      if (!facturaDoc.exists) throw new Error("Factura no encontrada");
      
      const facturaOriginal = facturaDoc.data();
      if (itemIndex >= facturaOriginal.items.length) {
        throw new Error("Índice de item fuera de rango");
      }
      
      // Clonar array de facturas
      const facturas = [...(data.facturas || [])];
      const facturaIdx = facturas.findIndex(f => f.id === facturaId || f.facturaId === facturaId);
      
      if (facturaIdx === -1) throw new Error("La factura no pertenece a esta ruta");

      const factura = { ...facturas[facturaIdx] };
      const items = [...(factura.items || facturaOriginal.items)];
      
      // Inicializar array de índices cargados si no existe
      if (!factura.itemsCargadosIndices) {
        factura.itemsCargadosIndices = [];
      }

      // Verificar si ya estaba cargado
      if (!factura.itemsCargadosIndices.includes(itemIndex)) {
        // Marcar item como cargado
        if (items[itemIndex]) {
          items[itemIndex].cargado = true;
          items[itemIndex].cargadoPor = cargadorId;
          items[itemIndex].fechaCarga = new Date().toISOString();
        }
        
        factura.items = items;
        factura.itemsCargadosIndices.push(itemIndex);
        factura.itemsCargados = factura.itemsCargadosIndices.length;
        
        // Determinar estado de carga
        const itemsTotal = facturaOriginal.items.length;
        factura.itemsTotal = itemsTotal;
        factura.estadoCarga = factura.itemsCargados >= itemsTotal ? 'cargada' : 'en_carga';
        factura.fechaUltimaCarga = new Date().toISOString();

        // Actualizar en array
        facturas[facturaIdx] = factura;
        
        // Actualizar contadores globales
        const itemsCargadosRuta = (data.itemsCargadosRuta || 0) + 1;

        // Ejecutar actualización
        transaction.update(rutaRef, {
          facturas: facturas,
          itemsCargadosRuta: itemsCargadosRuta,
          updatedAt: new Date().toISOString(),
          fechaActualizacion: FieldValue.serverTimestamp()
        });
        
        // Actualizar también en recolecciones
        const facturaRef = db.collection('recolecciones').doc(facturaId);
        transaction.update(facturaRef, {
          itemsCargados: factura.itemsCargados,
          estadoCarga: factura.estadoCarga,
          fechaActualizacion: FieldValue.serverTimestamp()
        });
      }
    });

    console.log('✅ Item confirmado como cargado');

    // Enviar notificacion si la factura completa fue cargada
    const rutaDoc = await rutaRef.get();
    const rutaData = rutaDoc.data();
    const facturaActualizada = rutaData.facturas.find(f => f.id === facturaId || f.facturaId === facturaId);

    if (facturaActualizada && facturaActualizada.estadoCarga === 'cargada') {
      // Obtener datos completos de la factura
      const facturaDoc = await db.collection('recolecciones').doc(facturaId).get();
      if (facturaDoc.exists) {
        const facturaData = facturaDoc.data();
        const destinatarioEmail = facturaData.destinatario?.email;
        const remitenteEmail = facturaData.remitente?.email;

        // Obtener configuracion de la compania
        const companyId = rutaData.companyId;
        let companyConfig = null;
        try {
          const companyDoc = await db.collection('companies').doc(companyId).get();
          if (companyDoc.exists) {
            companyConfig = companyDoc.data();
          }
        } catch (error) {
          console.error('Error obteniendo configuracion de compania:', error.message);
        }

        // Enviar correo al DESTINATARIO
        if (destinatarioEmail) {
          const subject = `Tu paquete fue cargado para entrega - ${facturaData.codigoTracking}`;
          const contentHTML = `
            <h2 style="color: #2c3e50; margin-top: 0;">Tu paquete fue cargado en el camion</h2>
            <p>Hola <strong>${facturaData.destinatario?.nombre}</strong>,</p>
            <p>Tu paquete ha sido cargado en el camion de reparto y saldra pronto para entrega.</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Detalles del Envio</h3>
              <p><strong>Codigo de Tracking:</strong> ${facturaData.codigoTracking}</p>
              <p><strong>Destinatario:</strong> ${facturaData.destinatario?.nombre}</p>
              <p><strong>Direccion de Entrega:</strong> ${facturaData.destinatario?.direccion}</p>
              <p><strong>Sector:</strong> ${facturaData.destinatario?.sector || 'N/A'}</p>
            </div>

            <p>Pronto recibiras otra notificacion cuando el camion salga en ruta.</p>
            <p>Gracias por confiar en nosotros.</p>
          `;

          const brandedHTML = generateBrandedEmailHTML(contentHTML, companyConfig, 'cargada', facturaData.codigoTracking);

          sendEmail(destinatarioEmail, subject, brandedHTML, [], companyConfig)
            .then(() => console.log(`Notificacion enviada al DESTINATARIO: ${destinatarioEmail} - Cargada`))
            .catch(err => console.error(`Error enviando notificacion al destinatario:`, err.message));
        }

        // Enviar correo al REMITENTE
        if (remitenteEmail) {
          const subject = `Tu envio a ${facturaData.destinatario?.nombre} fue cargado - ${facturaData.codigoTracking}`;
          const contentHTML = `
            <h2 style="color: #2c3e50; margin-top: 0;">Tu envio fue cargado para entrega</h2>
            <p>Hola <strong>${facturaData.remitente?.nombre}</strong>,</p>
            <p>El paquete que enviaste a <strong>${facturaData.destinatario?.nombre}</strong> ha sido cargado en el camion de reparto y saldra pronto para entrega.</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Detalles del Envio</h3>
              <p><strong>Codigo de Tracking:</strong> ${facturaData.codigoTracking}</p>
              <p><strong>Destinatario:</strong> ${facturaData.destinatario?.nombre}</p>
              <p><strong>Direccion de Entrega:</strong> ${facturaData.destinatario?.direccion}</p>
              <p><strong>Sector:</strong> ${facturaData.destinatario?.sector || 'N/A'}</p>
            </div>

            <p>Pronto recibiras otra notificacion cuando el camion salga en ruta.</p>
            <p>Gracias por confiar en nosotros.</p>
          `;

          const brandedHTML = generateBrandedEmailHTML(contentHTML, companyConfig, 'cargada', facturaData.codigoTracking);

          sendEmail(remitenteEmail, subject, brandedHTML, [], companyConfig)
            .then(() => console.log(`Notificacion enviada al REMITENTE: ${remitenteEmail} - Cargada`))
            .catch(err => console.error(`Error enviando notificacion al remitente:`, err.message));
        }
      }
    }

    res.json({
      success: true,
      message: 'Item marcado como cargado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error confirmando item:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error al confirmar el item',
      error: error.message 
    });
  }
};

// ==========================================================================
// ⚠️ REPORTAR ITEM DAÑADO (Sincronización Recolección <-> Ruta)
// ==========================================================================
export const reportarItemDanado = async (req, res) => {
  try {
    const { facturaId } = req.params;
    const { itemIndex, descripcionDano, fotos } = req.body;
    const cargadorId = req.user?.uid || req.userData?.uid;
    const nombreCargador = req.user?.nombre || req.userData?.nombre || 'Cargador';

    console.log(`⚠️ Reportando item dañado: factura ${facturaId}, item ${itemIndex}`);

    if (itemIndex === undefined || itemIndex < 0) {
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

    // 1. Actualizar colección principal 'recolecciones'
    const facturaRef = db.collection('recolecciones').doc(facturaId);
    const facturaDoc = await facturaRef.get();
    
    if (!facturaDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Factura no encontrada' 
      });
    }

    const facturaData = facturaDoc.data();
    
    // Validar permisos
    const userDoc = await db.collection('usuarios').doc(cargadorId).get();
    const userData = userDoc.data();
    
    if (facturaData.companyId !== userData.companyId) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos'
      });
    }

    if (itemIndex >= facturaData.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Índice de item inválido'
      });
    }

    const item = facturaData.items[itemIndex];
    
    const itemDanadoData = {
      itemIndex,
      item: {
        cantidad: item.cantidad,
        descripcion: item.descripcion,
        precio: item.precio || 0
      },
      descripcionDano: descripcionDano.trim(),
      fotos: fotos || [],
      reportadoPor: cargadorId,
      nombreReportador: nombreCargador,
      rolReportador: 'cargador',
      momentoReporte: 'carga',
      etapa: 'carga',
      fecha: new Date().toISOString()
    };

    const historialEntry = {
      accion: 'item_danado_carga',
      descripcion: `Item dañado: ${item.descripcion} - ${descripcionDano}`,
      itemIndex,
      usuario: cargadorId,
      nombreUsuario: nombreCargador,
      rol: 'cargador',
      fecha: new Date().toISOString()
    };
      
    // Agregar a recolección
    await facturaRef.update({
      itemsDanados: FieldValue.arrayUnion(itemDanadoData),
      historial: FieldValue.arrayUnion(historialEntry),
      fechaActualizacion: FieldValue.serverTimestamp()
    });
      
    // 2. Sincronizar con la copia en 'rutas'
    if (facturaData.rutaId) {
      const rutaRef = db.collection('rutas').doc(facturaData.rutaId);
      
      await db.runTransaction(async (transaction) => {
        const rDoc = await transaction.get(rutaRef);
        if (rDoc.exists) {
          const rData = rDoc.data();
          const facturas = [...(rData.facturas || [])];
          const fIdx = facturas.findIndex(f => f.id === facturaId || f.facturaId === facturaId);
          
          if (fIdx !== -1) {
            const factura = { ...facturas[fIdx] };
            if (!factura.itemsDanados) factura.itemsDanados = [];
            
            factura.itemsDanados.push(itemDanadoData);
            facturas[fIdx] = factura;
            
            transaction.update(rutaRef, { 
              facturas,
              updatedAt: new Date().toISOString(),
              fechaActualizacion: FieldValue.serverTimestamp()
            });
          }
        }
      });
    }

    console.log('✅ Item dañado reportado exitosamente');

    res.json({ 
      success: true, 
      message: 'Item dañado reportado exitosamente',
      data: itemDanadoData
    });

  } catch (error) {
    console.error('❌ Error reportando daño:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al reportar el item dañado',
      error: error.message 
    });
  }
};

// ==========================================================================
// 🏁 FINALIZAR CARGA (Con validación inteligente)
// ==========================================================================
export const finalizarCarga = async (req, res) => {
  try {
    const { rutaId } = req.params;
    const { notas, forzarFinalizacion } = req.body;
    const cargadorId = req.user?.uid || req.userData?.uid;
    const nombreCargador = req.user?.nombre || req.userData?.nombre || 'Cargador';

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
    const userDoc = await db.collection('usuarios').doc(cargadorId).get();
    const userData = userDoc.data();
    
    if (data.companyId !== userData.companyId) {
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

    // Verificar facturas incompletas
    const facturasIncompletas = (data.facturas || []).filter(f => 
      f.estadoCarga !== 'cargada' && 
      (f.itemsCargados || 0) < (f.itemsTotal || f.items?.length || 0)
    );
    
    if (facturasIncompletas.length > 0 && !forzarFinalizacion) {
      return res.status(400).json({
        success: false,
        message: 'Hay facturas con items sin cargar',
        requiereConfirmacion: true,
        facturasIncompletas: facturasIncompletas.map(f => ({
          id: f.id,
          codigoTracking: f.codigoTracking,
          itemsCargados: f.itemsCargados || 0,
          itemsTotal: f.itemsTotal || f.items?.length || 0
        }))
      });
    }

    const historialEntry = {
      accion: 'finalizar_carga',
      descripcion: `Carga finalizada por ${nombreCargador}${facturasIncompletas.length > 0 ? ' (forzada con items pendientes)' : ''}`,
      notas: notas || '',
      usuario: cargadorId,
      nombreUsuario: nombreCargador,
      rol: 'cargador',
      fecha: new Date().toISOString()
    };

    // Actualizar ruta a estado final
    // 'cargada' es el estado estándar, pero mantenemos compatibilidad con 'carga_finalizada'
    await rutaRef.update({
      estado: 'cargada', // Estado que activa visibilidad para repartidor
      fechaFinCarga: FieldValue.serverTimestamp(),
      notasCargador: notas || '',
      notasCarga: notas || '', // Alias por compatibilidad
      updatedAt: new Date().toISOString(),
      fechaActualizacion: FieldValue.serverTimestamp(),
      historial: FieldValue.arrayUnion(historialEntry)
    });

    // Actualizar facturas individuales a 'lista_entrega'
    const batch = db.batch();
    for (const factura of data.facturas || []) {
      const facturaId = factura.id || factura.facturaId;
      if (facturaId) {
        const facturaRef = db.collection('recolecciones').doc(facturaId);
        batch.update(facturaRef, {
          estado: 'lista_entrega',
          estadoCarga: factura.estadoCarga || 'cargada',
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
        totalFacturas: data.facturas?.length || 0,
        facturasCompletas: (data.facturas?.length || 0) - facturasIncompletas.length,
        facturasIncompletas: facturasIncompletas.length
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