// backend/src/routes/contenedores.js
import express from 'express';
import { db } from '../config/firebase.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/contenedores/upload-from-drive
 * Recibe archivo Excel desde Google Drive y lo procesa
 * NO REQUIERE AUTENTICACIÓN - Es llamado por Google Apps Script
 */
router.post('/upload-from-drive', async (req, res) => {
  try {
    const { fileName, fileId, fileData, uploadedBy, uploadedAt } = req.body;

    console.log(`📦 Procesando contenedor: ${fileName}`);
    console.log(`👤 Subido por: ${uploadedBy}`);

    // Validar datos
    if (!fileData || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'Archivo o nombre de archivo faltante'
      });
    }

    // Decodificar Base64
    const buffer = Buffer.from(fileData, 'base64');

    // Importar XLSX dinámicamente
    const XLSX = await import('xlsx');

    // Leer Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convertir a JSON (empezando desde fila 2, asumiendo que fila 1 son headers)
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Remover headers (primera fila)
    const rows = data.slice(1).filter(row => row.length > 0 && row[0]); // Solo filas con datos

    console.log(`📊 Total de facturas en el archivo: ${rows.length}`);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El archivo no contiene facturas válidas'
      });
    }

    // Generar ID único para el contenedor
    const contenedorId = `CONT_${Date.now()}`;
    const fechaCarga = new Date();

    // Procesar cada fila (factura)
    const batch = db.batch();
    const facturasImportadas = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Mapeo de columnas según estructura A-K
      const facturaData = {
        // Identificación
        numeroFactura: row[0]?.toString() || `AUTO_${contenedorId}_${i + 1}`,
        contenedor_id: contenedorId,
        
        // Datos del remitente (columnas B-D)
        envia_nombre: row[1] || '',
        envia_direccion: row[2] || '',
        envia_telefono: row[3]?.toString() || '',
        
        // Datos del destinatario (columnas E-G)
        recibe_nombre: row[4] || '',
        recibe_direccion: row[5] || '',
        recibe_telefono: row[6]?.toString() || '',
        
        // Contenido y monto (columnas H-I)
        contenido: row[7] || '',
        total: parseFloat(row[8]) || 0,
        
        // Estados de pago (columnas J-K)
        pago_alexis: row[9] || '',
        notas_inicial: row[10] || '',
        
        // Estados del sistema
        status_confirmacion: 'Pendiente', // Secretarias deben confirmar
        status_entrega: 'Pendiente',
        estado: 'pendiente', // Para compatibilidad con sistema actual
        confirmada_por: null,
        fecha_confirmacion: null,
        
        // Ruta y repartidor
        rutaId: null,
        repartidor_id: null,
        repartidor_nombre: null,
        
        // Entregas parciales
        items: parseContenido(row[7] || ''), // Parsear contenido a items individuales
        items_totales: 0, // Se calcula después
        items_entregados: 0,
        items_pendientes: 0,
        
        // Metadata
        fecha_carga: fechaCarga,
        uploadedBy: uploadedBy,
        sourceFile: fileName,
        driveFileId: fileId,
        
        // Timestamps
        createdAt: fechaCarga,
        updatedAt: fechaCarga
      };

      // Calcular items totales
      facturaData.items_totales = facturaData.items.length;
      facturaData.items_pendientes = facturaData.items.length;

      // Crear documento en Firestore
      const facturaRef = db.collection('facturas').doc();
      batch.set(facturaRef, facturaData);
      
      facturasImportadas.push({
        id: facturaRef.id,
        numeroFactura: facturaData.numeroFactura,
        recibe_nombre: facturaData.recibe_nombre
      });
    }

    // Guardar también información del contenedor
    const contenedorRef = db.collection('contenedores').doc(contenedorId);
    batch.set(contenedorRef, {
      contenedor_id: contenedorId,
      nombre: fileName,
      total_facturas: rows.length,
      facturas_confirmadas: 0,
      facturas_pendientes: rows.length,
      facturas_rechazadas: 0,
      fecha_carga: fechaCarga,
      uploadedBy: uploadedBy,
      sourceFile: fileName,
      driveFileId: fileId,
      status: 'Activo',
      createdAt: fechaCarga,
      updatedAt: fechaCarga
    });

    // Commit del batch
    await batch.commit();

    console.log(`✅ ${rows.length} facturas importadas exitosamente`);

    // Respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Contenedor procesado exitosamente',
      contenedorId: contenedorId,
      facturasImportadas: rows.length,
      facturas: facturasImportadas.slice(0, 5), // Solo las primeras 5 para no saturar
      fileName: fileName
    });

  } catch (error) {
    console.error('❌ Error al procesar contenedor:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Parsear contenido de la columna H en items individuales
 */
function parseContenido(contenido) {
  if (!contenido || typeof contenido !== 'string') {
    return [];
  }

  const items = [];
  const parts = contenido.split(',').map(p => p.trim());

  parts.forEach((part, index) => {
    if (!part) return;

    const match = part.match(/(\d+)/);
    const cantidad = match ? parseInt(match[0]) : 1;
    const nombre = part.replace(/\d+/g, '').replace(/items?|lb|kg/gi, '').trim() || part;

    items.push({
      id: `item_${index + 1}`,
      nombre: nombre,
      cantidad: cantidad,
      descripcion: part,
      status: 'Pendiente',
      entregado_en_ruta: null,
      fecha_entrega: null,
      motivo_no_entrega: null
    });
  });

  return items.length > 0 ? items : [{ 
    id: 'item_1', 
    nombre: contenido, 
    cantidad: 1, 
    descripcion: contenido,
    status: 'Pendiente',
    entregado_en_ruta: null,
    fecha_entrega: null,
    motivo_no_entrega: null
  }];
}

// Aplicar middleware de autenticación para el resto de rutas
router.use(verifyToken);

/**
 * GET /api/contenedores
 * Obtener lista de contenedores
 */
router.get('/', async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    
    let query = db.collection('contenedores');
    
    // Si no es super admin, filtrar por compañía
    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const contenedores = [];
    snapshot.forEach(doc => {
      contenedores.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: contenedores
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
 * Obtener detalle de un contenedor específico
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contenedorDoc = await db.collection('contenedores').doc(id).get();
    
    if (!contenedorDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Contenedor no encontrado'
      });
    }

    const contenedor = {
      id: contenedorDoc.id,
      ...contenedorDoc.data()
    };

    // Obtener facturas del contenedor
    const facturasSnapshot = await db.collection('facturas')
      .where('contenedor_id', '==', id)
      .get();
    
    const facturas = [];
    facturasSnapshot.forEach(doc => {
      facturas.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json({
      success: true,
      data: {
        ...contenedor,
        facturas: facturas
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

export default router;