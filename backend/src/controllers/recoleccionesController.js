// backend/src/controllers/recoleccionesController.js
import { db, admin } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

// ===== FUNCIONES AUXILIARES: DETECCIÓN DE ZONA Y SECTOR =====

/**
 * Determina la zona basada en la dirección del destinatario
 * @param {string} direccion - Dirección completa del destinatario
 * @returns {string} - Zona determinada ('Norte', 'Sur', 'Este', 'Oeste', 'Centro')
 */
const determinarZonaPorDireccion = (direccion) => {
  if (!direccion) return 'Centro'; // Default si no hay dirección
  
  const direccionLower = direccion.toLowerCase();
  
  // Palabras clave para cada zona
  const zonasKeywords = {
    'Norte': ['norte', 'charles de gaulle', 'autopista duarte km', 'villa mella', 'los mina', 'sabana perdida'],
    'Sur': ['sur', 'zona colonial', 'gazcue', 'centro de los héroes', 'mirador sur'],
    'Este': ['este', 'zona oriental', 'boca chica', 'juan dolio', 'san pedro', 'la romana'],
    'Oeste': ['oeste', 'zona universitaria', 'herrera', 'arroyo hondo', 'los jardines', 'los prados'],
    'Centro': ['naco', 'piantini', 'serrallés', 'bella vista', 'churchill']
  };
  
  // Buscar coincidencias
  for (const [zona, keywords] of Object.entries(zonasKeywords)) {
    if (keywords.some(keyword => direccionLower.includes(keyword))) {
      return zona;
    }
  }
  
  return 'Centro'; // Default
};

/**
 * Determina el sector específico basado en la dirección
 * @param {string} direccion - Dirección completa
 * @returns {string|null} - Sector determinado o null
 */
const determinarSectorPorDireccion = (direccion) => {
  if (!direccion) return null;
  
  const direccionLower = direccion.toLowerCase();
  
  // Sectores comunes de Santo Domingo
  const sectores = [
    'Naco', 'Piantini', 'Gazcue', 'Bella Vista', 'Mirador Norte',
    'Los Prados', 'Arroyo Hondo', 'La Esperilla', 'La Julia',
    'Los Cacicazgos', 'Evaristo Morales', 'Serrallés',
    'Zona Colonial', 'Villa Juana', 'Villa Francisca',
    'Cristo Rey', 'Ensanche Luperón', 'Villa Mella',
    'Los Mina', 'Sabana Perdida', 'Herrera', 'Los Jardines'
  ];
  
  // Buscar sector que coincida
  for (const sector of sectores) {
    if (direccionLower.includes(sector.toLowerCase())) {
      return sector;
    }
  }
  
  return null; // No se detectó sector específico
};

// ===== CONTROLADOR PRINCIPAL =====

/**
 * Crear una nueva recolección con items y fotos
 * POST /api/recolecciones
 */
export const createRecoleccion = async (req, res) => {
  try {
    // 1. Obtener datos del usuario autenticado
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    const userData = userDoc.data();
    const companyId = userData.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no asociado a una empresa'
      });
    }
    
    // 2. Extraer datos del body
    const {
      zona,
      cliente,
      direccion,
      telefono,
      email,
      notas,
      items: itemsString // Los items vienen como string JSON
    } = req.body;
    
    // 3. VALIDACIÓN ESTRICTA de campos obligatorios
    if (!zona) {
      return res.status(400).json({
        success: false,
        error: 'El campo "zona" es obligatorio'
      });
    }
    
    if (!cliente) {
      return res.status(400).json({
        success: false,
        error: 'El campo "cliente" es obligatorio'
      });
    }
    
    if (!direccion) {
      return res.status(400).json({
        success: false,
        error: 'El campo "direccion" es obligatorio'
      });
    }
    
    if (!telefono) {
      return res.status(400).json({
        success: false,
        error: 'El campo "telefono" es obligatorio'
      });
    }
    
    // Validar que haya al menos un item
    if (!itemsString) {
      return res.status(400).json({
        success: false,
        error: 'Debe incluir al menos un item en la recolección'
      });
    }
    
    let items;
    try {
      items = JSON.parse(itemsString);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'El formato de "items" es inválido. Debe ser un JSON válido'
      });
    }
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe incluir al menos un item en la recolección'
      });
    }
    
    // Validar que haya al menos una foto
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe incluir al menos una foto de la recolección'
      });
    }
    
    // 4. GENERAR ID DE LA RECOLECCIÓN (antes de subir fotos)
    const recoleccionRef = db.collection('recolecciones').doc();
    const nuevoIdRecoleccion = recoleccionRef.id;
    
    // 5. PROCESAR FOTOS - Subir a Firebase Storage
    const fotosRecoleccionUrls = [];
    const bucket = admin.storage().bucket();
    
    for (const file of req.files) {
      try {
        // Generar nombre único para el archivo
        const nombreArchivoUnico = `recoleccion-${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
        
        // Definir la ruta en Storage
        const rutaStorage = `recolecciones/${nuevoIdRecoleccion}/recoleccion/${nombreArchivoUnico}`;
        const fileRef = bucket.file(rutaStorage);
        
        // Subir el archivo
        await fileRef.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: {
              firebaseStorageDownloadTokens: uuidv4() // Token para URL pública
            }
          }
        });
        
        // Obtener URL pública
        const [metadata] = await fileRef.getMetadata();
        const downloadToken = metadata.metadata.firebaseStorageDownloadTokens;
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(rutaStorage)}?alt=media&token=${downloadToken}`;
        
        fotosRecoleccionUrls.push(publicUrl);
      } catch (uploadError) {
        console.error('Error al subir foto:', uploadError);
        // Continuar con las demás fotos aunque una falle
      }
    }
    
    // Verificar que al menos una foto se haya subido correctamente
    if (fotosRecoleccionUrls.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No se pudo subir ninguna foto. Intente nuevamente'
      });
    }
    
    // 6. PROCESAR ITEMS - Asignar IDs únicos
    const processedItems = items.map(item => ({
      id: uuidv4(),
      descripcion: item.descripcion || 'Sin descripción',
      cantidad: item.cantidad || 1,
      fotoUrl: null, // Se asignará cuando se tome foto individual del item
      estadoItem: 'recolectado',
      contenedorId: null // Se asignará cuando se agregue a un contenedor
    }));
    
    // 7. DETERMINAR SECTOR automáticamente
    const sectorDeterminado = determinarSectorPorDireccion(direccion);
    
    // 8. PREPARAR DATOS PARA FIRESTORE
    const now = admin.firestore.FieldValue.serverTimestamp();
    
    const newRecoleccionData = {
      // Información del cliente/remitente
      cliente,
      direccion,
      telefono,
      email: email || null,
      
      // Zona y Sector
      zona, // Obligatorio (seleccionado por el usuario)
      sector: sectorDeterminado, // Detectado automáticamente
      
      // Items y Fotos
      items: processedItems,
      fotosRecoleccion: fotosRecoleccionUrls,
      fotosEntrega: [], // Se llenarán cuando se entregue
      
      // Estado
      estadoGeneral: 'recolectada', // Estados: recolectada, en_contenedor, en_transito, entregada
      
      // Contenedor (si aplica)
      contenedorId: null, // Se asignará cuando se agregue a un contenedor
      
      // Notas
      notas: notas || '',
      
      // Metadata
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      companyId: companyId
    };
    
    // 9. GUARDAR EN FIRESTORE
    await recoleccionRef.set(newRecoleccionData);
    
    // 10. RESPUESTA EXITOSA (siguiendo la Regla de Oro)
    return res.status(201).json({
      success: true,
      data: {
        id: nuevoIdRecoleccion,
        ...newRecoleccionData,
        createdAt: new Date().toISOString(), // Convertir para la respuesta
        updatedAt: new Date().toISOString()
      },
      message: 'Recolección creada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al crear recolección:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al crear recolección',
      details: error.message
    });
  }
};

// ===== OTRAS FUNCIONES DEL CONTROLADOR (Placeholder - Implementar después) =====

/**
 * Obtener todas las recolecciones de una empresa
 * GET /api/recolecciones
 */
export const getAllRecolecciones = async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const companyId = userDoc.data()?.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no asociado a una empresa'
      });
    }
    
    const snapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const recolecciones = [];
    snapshot.forEach(doc => {
      recolecciones.push({ id: doc.id, ...doc.data() });
    });
    
    return res.status(200).json({
      success: true,
      data: recolecciones
    });
    
  } catch (error) {
    console.error('Error al obtener recolecciones:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener recolecciones',
      details: error.message
    });
  }
};

/**
 * Obtener una recolección por ID
 * GET /api/recolecciones/:id
 */
export const getRecoleccionById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('recolecciones').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Recolección no encontrada'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: { id: doc.id, ...doc.data() }
    });
    
  } catch (error) {
    console.error('Error al obtener recolección:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener recolección',
      details: error.message
    });
  }
};