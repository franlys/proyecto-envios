// backend/src/routes/contenedores.js
import express from 'express';
import { admin } from '../config/firebase.js';
import { db } from '../config/firebase.js';
import xlsx from 'xlsx';
import path from 'path';
import { verifyToken, checkRole, requireCompany } from '../middleware/auth.js';
import { validateCompanyId, validateNumeroContenedor, validateEstado, sanitizeQueryParams } from '../utils/validators.js';
import { sanitizeFacturaData } from '../utils/sanitizers.js';
import { uploadLimiter } from '../config/rateLimiters.js';

const router = express.Router();

/**
 * POST /api/contenedores/upload-from-drive
 * Recibe archivo Excel desde Google Apps Script y lo procesa
 * ✅ CORREGIDO: Reconoce columnas FACTURAS, RECIBE, TOTAL, DIRECION, TELEFONO, CONTENIDO
 * ✅ SEGURIDAD: Autenticación, validación de archivos, sanitización
 */
router.post('/upload-from-drive',
  uploadLimiter,  // ✅ Rate limiter: 20 uploads/hora
  verifyToken,
  checkRole('admin_general', 'almacen_usa', 'super_admin'),
  async (req, res) => {
    try {
      let { fileName, fileData, base64Data, embarqueId, fileId, companyId } = req.body;

      const excelData = fileData || base64Data;

      // ✅ Validación básica
      if (!fileName || !excelData) {
        return res.status(400).json({
          success: false,
          error: 'Faltan parámetros requeridos: fileName y base64Data (o fileData)'
        });
      }

      // ✅ SEGURIDAD: Validar companyId
      if (companyId) {
        try {
          companyId = validateCompanyId(companyId);
        } catch (validationError) {
          return res.status(400).json({
            success: false,
            error: 'CompanyId inválido',
            details: validationError.message
          });
        }

        // ✅ SEGURIDAD: Verificar que solo pueda subir archivos de su propia compañía
        if (req.userData.rol !== 'super_admin' && companyId !== req.userData.companyId) {
          return res.status(403).json({
            success: false,
            error: 'No puedes subir archivos para otra compañía'
          });
        }
      } else {
        // Si no viene companyId, usar el del usuario autenticado
        companyId = req.userData.companyId;
      }

      // ✅ SEGURIDAD: Validar extensión de archivo
      const allowedExtensions = ['.xlsx', '.xls', '.csv'];
      const fileExtension = path.extname(fileName).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de archivo no permitido',
          allowed: allowedExtensions,
          received: fileExtension
        });
      }

      // ✅ SEGURIDAD: Validar tamaño del archivo (antes de decodificar)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const estimatedSize = (excelData.length * 3) / 4; // Base64 es ~4/3 del tamaño original

      if (estimatedSize > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          error: 'Archivo demasiado grande',
          maxSize: '10MB',
          yourSize: `${Math.round(estimatedSize / 1024 / 1024)}MB`
        });
      }

      console.log('📁 Procesando archivo:', fileName);
      console.log('🏢 CompanyId:', companyId);

      // ✅ SEGURIDAD: Decodificar con try-catch
      let buffer;
      try {
        buffer = Buffer.from(excelData, 'base64');
      } catch (decodeError) {
        return res.status(400).json({
          success: false,
          error: 'Datos base64 inválidos'
        });
      }

      // ✅ SEGURIDAD: Validar magic bytes de Excel
      const excelMagicBytes = {
        xlsx: [0x50, 0x4B, 0x03, 0x04],  // PK.. (ZIP signature)
        xls: [0xD0, 0xCF, 0x11, 0xE0]   // OLE2 signature
      };

      const fileSignature = buffer.slice(0, 4);
      const isValidExcel =
        fileSignature.equals(Buffer.from(excelMagicBytes.xlsx)) ||
        fileSignature.equals(Buffer.from(excelMagicBytes.xls));

      if (!isValidExcel) {
        return res.status(400).json({
          success: false,
          error: 'El archivo no es un Excel válido',
          hint: 'El contenido no coincide con el formato esperado'
        });
      }
      // ✅ SEGURIDAD: Parsear con try-catch y opciones seguras
      let workbook;
      try {
        workbook = xlsx.read(buffer, {
          type: 'buffer',
          cellDates: true,
          cellFormula: false,  // ✅ Deshabilitar fórmulas (riesgo de XXE)
          cellHTML: false      // ✅ Deshabilitar HTML
        });
      } catch (parseError) {
        console.error('❌ Error parseando Excel:', parseError.message);
        return res.status(400).json({
          success: false,
          error: 'El archivo Excel está corrupto o es inválido',
          hint: 'Verifica que el archivo se pueda abrir en Excel/LibreOffice'
        });
      }

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
          // ✅ SEGURIDAD: Sanitizar TODOS los datos antes de guardar
          // ============================================
          const unsanitizedData = {
            numeroFactura,
            cliente,
            direccion,
            telefono,
            monto,
            contenedor,
            contenido,
            sector,
            zona,
            fileId,
            fileName
          };

          const sanitizedData = sanitizeFacturaData(unsanitizedData);

          // Crear objeto de factura con datos sanitizados
          const factura = {
            ...sanitizedData,

            // Estado y asociación con embarque (controlados, no de input)
            estado: 'sin_confirmar',
            embarqueId: embarqueIdParaFacturas,

            // Datos de la empresa (ya validados)
            companyId: companyId,

            // Estado de pago (controlado)
            estadoPago: 'pago_recibir',

            // Metadatos
            fecha: admin.firestore.FieldValue.serverTimestamp(),
            origen: 'google_drive',
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
      // ✅ CORRECCIÓN: Usar 'recolecciones' en lugar de 'facturas'
      const facturasRef = db.collection('recolecciones');

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
 * GET /api/contenedores/disponibles
 * Listar contenedores disponibles para facturas pendientes
 * ✅ SEGURIDAD: Requiere autenticación y validación de companyId
 */
router.get('/disponibles',
  verifyToken,
  requireCompany,
  async (req, res) => {
    try {
      let { companyId } = sanitizeQueryParams(req.query);

      // ✅ SEGURIDAD: Validar companyId si viene en query
      if (companyId) {
        try {
          companyId = validateCompanyId(companyId);
        } catch (validationError) {
          return res.status(400).json({
            success: false,
            error: 'CompanyId inválido',
            details: validationError.message
          });
        }
      }

      // ✅ SEGURIDAD: Solo ver su propia compañía (excepto super_admin)
      const effectiveCompanyId = req.userData.rol === 'super_admin'
        ? companyId
        : req.userData.companyId;

      let query = db.collection('contenedores');

      if (effectiveCompanyId) {
        query = query.where('companyId', '==', effectiveCompanyId);
      }

      const snapshot = await query.get();
      const contenedores = [];

      snapshot.forEach(doc => {
        contenedores.push({
          id: doc.id,
          ...doc.data()
        });
      });

      res.json({
        success: true,
        data: contenedores,
        count: contenedores.length
      });

    } catch (error) {
      console.error('❌ Error obteniendo contenedores disponibles:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener contenedores disponibles',
        details: error.message
      });
    }
  });

/**
 * GET /api/contenedores
 * Listar contenedores de la colección real 'contenedores'
 * ✅ SEGURIDAD: Requiere autenticación y validación
 */
router.get('/',
  verifyToken,
  requireCompany,
  async (req, res) => {
    try {
      let { companyId, estado } = sanitizeQueryParams(req.query);

      // ✅ SEGURIDAD: Validar companyId
      if (companyId) {
        try {
          companyId = validateCompanyId(companyId);
        } catch (validationError) {
          return res.status(400).json({
            success: false,
            error: 'CompanyId inválido'
          });
        }
      }

      // ✅ SEGURIDAD: Validar estado
      if (estado) {
        try {
          estado = validateEstado(estado);
        } catch (validationError) {
          return res.status(400).json({
            success: false,
            error: 'Estado inválido'
          });
        }
      }

      // ✅ SEGURIDAD: Forzar companyId del usuario (excepto super_admin)
      const effectiveCompanyId = req.userData.rol === 'super_admin'
        ? companyId
        : req.userData.companyId;

      let query = db.collection('contenedores');

      if (effectiveCompanyId) {
        query = query.where('companyId', '==', effectiveCompanyId);
      }

      if (estado) {
        query = query.where('estado', '==', estado);
      }

      const snapshot = await query.orderBy('fechaCreacion', 'desc').get();

      const contenedores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fechaCreacion: doc.data().fechaCreacion?.toDate?.() || null,
        fechaCierre: doc.data().fechaCierre?.toDate?.() || null,
        fechaActualizacion: doc.data().fechaActualizacion?.toDate?.() || null
      }));

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
 * ✅ SEGURIDAD: Requiere autenticación y validación
 */
router.get('/:numeroContenedor',
  verifyToken,
  requireCompany,
  async (req, res) => {
    try {
      let { numeroContenedor } = req.params;
      let { companyId } = sanitizeQueryParams(req.query);

      // ✅ SEGURIDAD: Validar numeroContenedor
      try {
        numeroContenedor = validateNumeroContenedor(numeroContenedor);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          error: 'Número de contenedor inválido'
        });
      }

      // ✅ SEGURIDAD: Validar companyId
      if (companyId) {
        try {
          companyId = validateCompanyId(companyId);
        } catch (validationError) {
          return res.status(400).json({
            success: false,
            error: 'CompanyId inválido'
          });
        }
      }

      // ✅ SEGURIDAD: Forzar companyId del usuario
      const effectiveCompanyId = req.userData.rol === 'super_admin'
        ? companyId
        : req.userData.companyId;

      let query = db.collection('recolecciones')
        .where('contenedor', '==', numeroContenedor);

      if (effectiveCompanyId) {
        query = query.where('companyId', '==', effectiveCompanyId);
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
 * DELETE /api/contenedores/:numeroContenedor
 * Eliminar un contenedor (y sus facturas asociadas)
 * ✅ SEGURIDAD: Solo admin_general y propietario
 */
router.delete('/:numeroContenedor',
  verifyToken,
  checkRole('admin_general', 'propietario', 'super_admin'),
  async (req, res) => {
    try {
      let { numeroContenedor } = req.params;
      let { companyId } = sanitizeQueryParams(req.query);

      // ✅ SEGURIDAD: Validar numeroContenedor
      try {
        numeroContenedor = validateNumeroContenedor(numeroContenedor);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          error: 'Número de contenedor inválido'
        });
      }

      // ✅ SEGURIDAD: Validar companyId
      if (companyId) {
        try {
          companyId = validateCompanyId(companyId);
        } catch (validationError) {
          return res.status(400).json({
            success: false,
            error: 'CompanyId inválido'
          });
        }
      }

      // ✅ SEGURIDAD: Solo eliminar de su propia compañía
      const effectiveCompanyId = req.userData.rol === 'super_admin'
        ? companyId
        : req.userData.companyId;

      let query = db.collection('recolecciones')
        .where('contenedor', '==', numeroContenedor);

      if (effectiveCompanyId) {
        query = query.where('companyId', '==', effectiveCompanyId);
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