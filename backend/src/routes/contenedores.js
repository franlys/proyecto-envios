// backend/src/routes/contenedores.js
import express from 'express';
import { admin } from '../config/firebase.js';
import { db } from '../config/firebase.js';
import xlsx from 'xlsx';

const router = express.Router();

/**
 * POST /api/contenedores/upload-from-drive
 * Recibe archivo Excel desde Google Apps Script y lo procesa
 * ✅ CORREGIDO: Reconoce columnas FACTURAS, RECIBE, TOTAL, DIRECION, TELEFONO, CONTENIDO
 */
router.post('/upload-from-drive', async (req, res) => {
  try {
    const { fileName, fileData, base64Data, embarqueId, fileId, companyId } = req.body;
    
    const excelData = fileData || base64Data;
    
    if (!fileName || !excelData) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos: fileName y base64Data (o fileData)',
        received: {
          fileName: !!fileName,
          fileData: !!fileData,
          base64Data: !!base64Data
        }
      });
    }

    console.log('📁 Procesando archivo:', fileName);
    console.log('🏢 CompanyId recibido:', companyId);

    // Convertir base64 a buffer
    const buffer = Buffer.from(excelData, 'base64');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`📊 Filas encontradas: ${data.length}`);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El archivo Excel está vacío'
      });
    }

    // Mostrar las columnas detectadas (primera fila)
    console.log('🔍 Columnas detectadas:', Object.keys(data[0]));

    const facturas = [];
    const errores = [];

    // Crear embarque si no existe
    let embarqueIdParaFacturas = embarqueId;
    
    if (!embarqueIdParaFacturas && companyId) {
      console.log('📦 Creando embarque automático...');
      const nuevoEmbarque = {
        nombre: `Embarque ${fileName}`,
        descripcion: `Importado desde ${fileName}`,
        fechaCreacion: new Date().toISOString(),
        estado: 'activo',
        totalFacturas: 0,
        facturasEntregadas: 0,
        companyId: companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        origen: 'google_drive',
        fileId: fileId || null
      };

      const embarqueRef = await db.collection('embarques').add(nuevoEmbarque);
      embarqueIdParaFacturas = embarqueRef.id;
      console.log('✅ Embarque creado:', embarqueIdParaFacturas);
    }

    // Procesar cada fila del Excel
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // ============================================
        // ✅ CORRECCIÓN PRINCIPAL: Reconocer columnas del CSV
        // ============================================
        
        // Número de factura: FACTURAS, Número de Factura, factura, Factura
        const numeroFactura = 
          row['FACTURAS'] || 
          row['Número de Factura'] || 
          row['Numero de Factura'] || 
          row['factura'] || 
          row['Factura'];

        // Cliente: RECIBE, Cliente, cliente
        const cliente = 
          row['RECIBE'] || 
          row['Cliente'] || 
          row['cliente'];

        // Dirección: DIRECION (con y sin "(Recibe)"), Dirección, Direccion, direccion
        const direccion = 
          row['DIRECION'] || 
          row['DIRECION (Recibe)'] || 
          row['Dirección'] || 
          row['Direccion'] || 
          row['direccion'] || 
          '';

        // Teléfono: TELEFONO (con y sin "(Recibe)"), Teléfono, Telefono, telefono
        const telefono = 
          row['TELEFONO'] || 
          row['TELEFONO (Recibe)'] || 
          row['Teléfono'] || 
          row['Telefono'] || 
          row['telefono'] || 
          '';

        // Monto: TOTAL, Monto, monto
        const monto = parseFloat(
          row['TOTAL'] || 
          row['Monto'] || 
          row['monto'] || 
          0
        );

        // Contenedor: Contenedor, contenedor
        const contenedor = 
          row['Contenedor'] || 
          row['contenedor'] || 
          'Sin asignar';

        // Contenido: CONTENIDO, Contenido, contenido
        const contenido = 
          row['CONTENIDO'] || 
          row['Contenido'] || 
          row['contenido'] || 
          '';

        // Sector y Zona (opcional)
        const sector = 
          row['Sector'] || 
          row['sector'] || 
          '';
        
        const zona = 
          row['Zona'] || 
          row['zona'] || 
          'capital';

        // ============================================
        // Validación de datos requeridos
        // ============================================
        if (!numeroFactura || !cliente) {
          errores.push({
            fila: i + 2, // +2 porque Excel empieza en 1 y hay encabezado
            error: 'Faltan datos requeridos (número de factura o cliente)',
            datos: row
          });
          continue;
        }

        // ============================================
        // Crear objeto de factura
        // ============================================
        const factura = {
          numeroFactura: String(numeroFactura).trim(),
          cliente: String(cliente).trim(),
          direccion: String(direccion).trim(),
          telefono: String(telefono).trim(),
          monto: monto,
          contenedor: String(contenedor).trim(),
          contenido: String(contenido).trim(),
          sector: String(sector).trim(),
          zona: String(zona).trim(),
          
          // Estado y asociación con embarque
          estado: 'sin_confirmar',
          embarqueId: embarqueIdParaFacturas,
          
          // Datos de la empresa
          companyId: companyId || null,
          
          // Estado de pago
          estadoPago: 'pago_recibir',
          
          // Metadatos
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          origen: 'google_drive',
          fileId: fileId || null,
          fileName: fileName,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        facturas.push(factura);

      } catch (error) {
        errores.push({
          fila: i + 2,
          error: `Error procesando fila: ${error.message}`,
          datos: row
        });
      }
    }

    // ============================================
    // Guardar facturas en Firestore
    // ============================================
    console.log(`💾 Guardando ${facturas.length} facturas en Firestore...`);
    
    const batch = db.batch();
    const facturasRef = db.collection('facturas');

    facturas.forEach(factura => {
      const docRef = facturasRef.doc();
      batch.set(docRef, factura);
    });

    await batch.commit();

    console.log(`✅ ${facturas.length} facturas guardadas exitosamente`);

    // ============================================
    // Actualizar contador en el embarque
    // ============================================
    if (embarqueIdParaFacturas) {
      const embarqueRef = db.collection('embarques').doc(embarqueIdParaFacturas);
      await embarqueRef.update({
        totalFacturas: admin.firestore.FieldValue.increment(facturas.length),
        ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Embarque actualizado con contador de facturas');
    }

    // ============================================
    // Respuesta exitosa
    // ============================================
    res.json({
      success: true,
      message: 'Archivo procesado exitosamente',
      data: {
        procesadas: facturas.length,
        errores: errores.length,
        embarqueId: embarqueIdParaFacturas,
        fileName: fileName
      },
      detalleErrores: errores.length > 0 ? errores : undefined
    });

  } catch (error) {
    console.error('❌ Error procesando archivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar archivo',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/contenedores
 * Listar contenedores disponibles
 */
router.get('/', async (req, res) => {
  try {
    const { embarqueId, companyId } = req.query;

    let query = db.collection('facturas');

    if (embarqueId) {
      query = query.where('embarqueId', '==', embarqueId);
    }

    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    const snapshot = await query.get();

    const contenedoresMap = new Map();

    snapshot.forEach(doc => {
      const factura = doc.data();
      const contenedor = factura.contenedor || 'Sin asignar';

      if (!contenedoresMap.has(contenedor)) {
        contenedoresMap.set(contenedor, {
          numeroContenedor: contenedor,
          facturas: [],
          totalMonto: 0,
          totalFacturas: 0
        });
      }

      const contenedorData = contenedoresMap.get(contenedor);
      contenedorData.facturas.push({
        id: doc.id,
        ...factura
      });
      contenedorData.totalMonto += factura.monto || 0;
      contenedorData.totalFacturas += 1;
    });

    const contenedores = Array.from(contenedoresMap.values());

    res.json({
      success: true,
      data: contenedores,
      count: contenedores.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo contenedores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contenedores',
      details: error.message
    });
  }
});

/**
 * GET /api/contenedores/:numeroContenedor
 * Obtener detalles de un contenedor específico
 */
router.get('/:numeroContenedor', async (req, res) => {
  try {
    const { numeroContenedor } = req.params;
    const { companyId } = req.query;

    let query = db.collection('facturas')
      .where('contenedor', '==', numeroContenedor);

    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Contenedor no encontrado'
      });
    }

    const facturas = [];
    let totalMonto = 0;

    snapshot.forEach(doc => {
      const factura = { id: doc.id, ...doc.data() };
      facturas.push(factura);
      totalMonto += factura.monto || 0;
    });

    res.json({
      success: true,
      data: {
        numeroContenedor,
        facturas,
        totalMonto,
        totalFacturas: facturas.length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo contenedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener contenedor',
      details: error.message
    });
  }
});

/**
 * DELETE /api/contenedores/:id
 * Eliminar un contenedor (y sus facturas asociadas)
 */
router.delete('/:numeroContenedor', async (req, res) => {
  try {
    const { numeroContenedor } = req.params;
    const { companyId } = req.query;

    let query = db.collection('facturas')
      .where('contenedor', '==', numeroContenedor);

    if (companyId) {
      query = query.where('companyId', '==', companyId);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'Contenedor no encontrado'
      });
    }

    // Eliminar todas las facturas del contenedor
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.json({
      success: true,
      message: `Contenedor ${numeroContenedor} y ${snapshot.size} facturas eliminadas`,
      facturasEliminadas: snapshot.size
    });

  } catch (error) {
    console.error('❌ Error eliminando contenedor:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar contenedor',
      details: error.message
    });
  }
});

export default router;