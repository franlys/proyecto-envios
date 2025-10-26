// backend/src/routes/contenedores.js
import express from 'express';
import { admin } from '../config/firebase.js';
import { db } from '../config/firebase.js';
import xlsx from 'xlsx';

const router = express.Router();

/**
 * POST /api/contenedores/upload-from-drive
 * Recibe archivo Excel desde Google Apps Script y lo procesa
 * ✅ CORREGIDO: Acepta tanto 'fileData' como 'base64Data' para compatibilidad
 */
router.post('/upload-from-drive', async (req, res) => {
  try {
    const { fileName, fileData, base64Data, embarqueId, fileId } = req.body;
    
    // ✅ CORRECCIÓN: Aceptar fileData O base64Data
    const excelData = fileData || base64Data;
    
    // Validaciones
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

    // Decodificar base64 a buffer
    const buffer = Buffer.from(excelData, 'base64');
    
    // Leer Excel
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

    // Procesar cada fila del Excel
    const facturas = [];
    const errores = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validar campos requeridos
        const numeroFactura = row['Número de Factura'] || row['Numero de Factura'] || row['factura'];
        const cliente = row['Cliente'] || row['cliente'];
        const monto = parseFloat(row['Monto'] || row['monto'] || 0);
        
        if (!numeroFactura || !cliente) {
          errores.push({
            fila: i + 2, // +2 porque Excel empieza en 1 y tiene header
            error: 'Faltan datos requeridos (número de factura o cliente)',
            datos: row
          });
          continue;
        }

        // Crear objeto de factura
        const factura = {
          numeroFactura: String(numeroFactura).trim(),
          cliente: String(cliente).trim(),
          monto: monto,
          estado: 'pendiente',
          embarqueId: embarqueId || null,
          contenedor: row['Contenedor'] || row['contenedor'] || 'Sin asignar',
          fecha: new Date().toISOString(),
          origen: 'google_drive',
          fileId: fileId || null,
          fileName: fileName
        };

        facturas.push(factura);

      } catch (error) {
        errores.push({
          fila: i + 2,
          error: error.message,
          datos: row
        });
      }
    }

    // Guardar facturas en Firestore
    const batch = db.batch();
    const facturasRef = db.collection('facturas');

    facturas.forEach(factura => {
      const docRef = facturasRef.doc();
      batch.set(docRef, factura);
    });

    await batch.commit();

    console.log(`✅ ${facturas.length} facturas procesadas exitosamente`);

    // Si hay un embarqueId, actualizar el embarque
    if (embarqueId) {
      const embarqueRef = db.collection('embarques').doc(embarqueId);
      await embarqueRef.update({
        totalFacturas: admin.firestore.FieldValue.increment(facturas.length),
        ultimaActualizacion: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Archivo procesado exitosamente',
      procesadas: facturas.length,
      errores: errores.length,
      detalleErrores: errores
    });

  } catch (error) {
    console.error('❌ Error procesando archivo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al procesar archivo',
      details: error.message
    });
  }
});

/**
 * GET /api/contenedores
 * Listar contenedores disponibles
 */
router.get('/', async (req, res) => {
  try {
    const { embarqueId } = req.query;

    let query = db.collection('facturas');

    if (embarqueId) {
      query = query.where('embarqueId', '==', embarqueId);
    }

    const snapshot = await query.get();

    // Agrupar facturas por contenedor
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
      contenedores
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

    const snapshot = await db.collection('facturas')
      .where('contenedor', '==', numeroContenedor)
      .get();

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
      contenedor: {
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

export default router;