// backend/src/routes/contenedores.js
import express from 'express';
import admin from 'firebase-admin';
import xlsx from 'xlsx';

const router = express.Router();

/**
 * POST /api/contenedores/upload-from-drive
 * Recibe archivo Excel desde Google Apps Script y lo procesa
 */
router.post('/upload-from-drive', async (req, res) => {
  try {
    const { fileName, base64Data, embarqueId } = req.body;
    
    // Validaciones
    if (!fileName || !base64Data) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: fileName y base64Data'
      });
    }
    
    console.log(`📦 Procesando contenedor: ${fileName}`);
    
    // Decodificar el archivo Excel de base64
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Extraer número de contenedor del nombre del archivo
    // Ejemplo: "CONTENEDOR_001.xlsx" → "CONTENEDOR_001"
    const numeroContenedor = fileName.replace(/\.(xlsx|xls)$/i, '');
    
    console.log(`📊 Total de filas en Excel: ${rows.length}`);
    
    // Crear documento de contenedor en Firestore
    const contenedorData = {
      numeroContenedor,
      fileName,
      embarqueId: embarqueId || null,
      fechaImportacion: admin.firestore.FieldValue.serverTimestamp(),
      totalFacturas: rows.length - 1, // Sin contar header
      estado: 'procesado'
    };
    
    const contenedorRef = await admin.firestore()
      .collection('contenedores')
      .add(contenedorData);
    
    console.log(`✅ Contenedor creado con ID: ${contenedorRef.id}`);
    
    // Procesar cada fila del Excel (saltando la fila de encabezados)
    const facturas = [];
    const errores = [];
    
    for (let i = 1; i < rows.length; i++) {
      try {
        const row = rows[i];
        
        // Validar que la fila tenga datos
        if (!row || row.length === 0 || !row[0]) {
          console.log(`⚠️ Fila ${i + 1} vacía, saltando...`);
          continue;
        }
        
        // Mapeo de columnas según el Excel:
        // A: FACTURAS, B: ENVIA, C: DIRECION, D: TELEFANO, 
        // E: RECIBE, F: DIRECION, G: TELEFONO, H: CONTENIDO, 
        // I: TOTAL, J: ALEXIS, K: SECRES
        
        const factura = {
          // Datos de la factura
          numeroFactura: row[0]?.toString().trim() || '',
          
          // Datos del remitente (quien envía desde USA)
          remitente: row[1]?.toString().trim() || '',
          direccionRemitente: row[2]?.toString().trim() || '',
          telefonoRemitente: row[3]?.toString().trim() || '',
          
          // Datos del destinatario (quien recibe en RD)
          cliente: row[4]?.toString().trim() || '',
          direccion: row[5]?.toString().trim() || '',
          telefono: row[6]?.toString().trim() || '',
          
          // Datos del paquete
          contenido: row[7]?.toString().trim() || '',
          total: parseFloat(row[8]) || 0,
          
          // Datos administrativos de USA
          estadoPagoOrigen: row[9]?.toString().trim() || '', // PAGADA / P.A / etc
          observacionesOrigen: row[10]?.toString().trim() || '', // Notas de secretarias USA
          
          // Campos del sistema
          numeroContenedor,
          contenedorId: contenedorRef.id,
          embarqueId: embarqueId || null,
          estado: 'sin_confirmar', // Estado inicial para secretarias RD
          zona: 'capital', // Default, secretarias lo ajustarán
          sector: '',
          estadoPago: 'pago_recibir', // Default
          observaciones: '',
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        facturas.push(factura);
        
      } catch (rowError) {
        console.error(`❌ Error procesando fila ${i + 1}:`, rowError);
        errores.push({
          fila: i + 1,
          error: rowError.message
        });
      }
    }
    
    console.log(`📝 Facturas válidas para importar: ${facturas.length}`);
    
    // Guardar todas las facturas en Firestore usando batch
    if (facturas.length > 0) {
      const batchSize = 500; // Firestore permite max 500 ops por batch
      const batches = [];
      
      for (let i = 0; i < facturas.length; i += batchSize) {
        const batch = admin.firestore().batch();
        const chunk = facturas.slice(i, i + batchSize);
        
        chunk.forEach(factura => {
          const facturaRef = admin.firestore().collection('facturas').doc();
          batch.set(facturaRef, factura);
        });
        
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      console.log(`✅ ${facturas.length} facturas guardadas en Firestore`);
    }
    
    // Respuesta exitosa
    res.json({
      success: true,
      message: `Contenedor ${numeroContenedor} procesado exitosamente`,
      contenedorId: contenedorRef.id,
      facturasImportadas: facturas.length,
      errores: errores.length > 0 ? errores : undefined
    });
    
  } catch (error) {
    console.error('❌ Error procesando contenedor:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/contenedores
 * Lista todos los contenedores importados
 */
router.get('/', async (req, res) => {
  try {
    const { embarqueId, limit = 50 } = req.query;
    
    let query = admin.firestore()
      .collection('contenedores')
      .orderBy('fechaImportacion', 'desc')
      .limit(parseInt(limit));
    
    // Filtrar por embarque si se especifica
    if (embarqueId) {
      query = query.where('embarqueId', '==', embarqueId);
    }
    
    const snapshot = await query.get();
    
    const contenedores = snapshot.docs.map(doc => ({
      _id: doc.id,
      ...doc.data(),
      // Convertir timestamps para el frontend
      fechaImportacion: doc.data().fechaImportacion?.toDate?.() || null
    }));
    
    res.json({ 
      success: true,
      data: contenedores,
      total: contenedores.length
    });
    
  } catch (error) {
    console.error('Error al obtener contenedores:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/contenedores/:id
 * Obtiene un contenedor específico con sus facturas
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener contenedor
    const contenedorDoc = await admin.firestore()
      .collection('contenedores')
      .doc(id)
      .get();
    
    if (!contenedorDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Contenedor no encontrado' 
      });
    }
    
    const contenedor = {
      _id: contenedorDoc.id,
      ...contenedorDoc.data(),
      fechaImportacion: contenedorDoc.data().fechaImportacion?.toDate?.() || null
    };
    
    // Obtener facturas del contenedor
    const facturasSnapshot = await admin.firestore()
      .collection('facturas')
      .where('contenedorId', '==', id)
      .orderBy('numeroFactura', 'asc')
      .get();
    
    const facturas = facturasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ 
      success: true,
      data: {
        ...contenedor,
        facturas
      }
    });
    
  } catch (error) {
    console.error('Error al obtener contenedor:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * DELETE /api/contenedores/:id
 * Elimina un contenedor y todas sus facturas (usar con precaución)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el contenedor existe
    const contenedorDoc = await admin.firestore()
      .collection('contenedores')
      .doc(id)
      .get();
    
    if (!contenedorDoc.exists) {
      return res.status(404).json({ 
        success: false,
        error: 'Contenedor no encontrado' 
      });
    }
    
    // Obtener todas las facturas del contenedor
    const facturasSnapshot = await admin.firestore()
      .collection('facturas')
      .where('contenedorId', '==', id)
      .get();
    
    // Eliminar facturas en batches
    const batch = admin.firestore().batch();
    facturasSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Eliminar el contenedor
    batch.delete(contenedorDoc.ref);
    
    await batch.commit();
    
    console.log(`🗑️ Contenedor ${id} eliminado con ${facturasSnapshot.size} facturas`);
    
    res.json({ 
      success: true,
      message: 'Contenedor y facturas eliminados',
      facturasEliminadas: facturasSnapshot.size
    });
    
  } catch (error) {
    console.error('Error al eliminar contenedor:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/contenedores/:id/estadisticas
 * Obtiene estadísticas de un contenedor
 */
router.get('/:id/estadisticas', async (req, res) => {
  try {
    const { id } = req.params;
    
    const facturasSnapshot = await admin.firestore()
      .collection('facturas')
      .where('contenedorId', '==', id)
      .get();
    
    const facturas = facturasSnapshot.docs.map(doc => doc.data());
    
    const estadisticas = {
      total: facturas.length,
      sinConfirmar: facturas.filter(f => f.estado === 'sin_confirmar').length,
      pendientes: facturas.filter(f => f.estado === 'pendiente_contacto').length,
      confirmadas: facturas.filter(f => f.estado === 'confirmada').length,
      enRuta: facturas.filter(f => f.estado === 'en_ruta').length,
      entregadas: facturas.filter(f => f.estado === 'entregado').length,
      noEntregadas: facturas.filter(f => f.estado === 'no_entregado').length,
      
      // Por zona
      porZona: {
        capital: facturas.filter(f => f.zona === 'capital').length,
        cibao: facturas.filter(f => f.zona === 'cibao').length,
        sur: facturas.filter(f => f.zona === 'sur').length,
        local_bani: facturas.filter(f => f.zona === 'local_bani').length
      },
      
      // Estado de pago
      porPago: {
        pagoRecibir: facturas.filter(f => f.estadoPago === 'pago_recibir').length,
        pagado: facturas.filter(f => f.estadoPago === 'pagado').length
      }
    };
    
    res.json({ 
      success: true,
      data: estadisticas
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;