import { db } from '../config/firebase.js';

/**
 * Lista de sectores conocidos para detección automática.
 * Esta lista puede ampliarse fácilmente según las necesidades.
 */
const sectoresConocidos = [
  // Santo Domingo y DN
  'gazcue', 'piantini', 'naco', 'bella vista', 'serrallés', 'mirador sur',
  'los cacicazgos', 'paraíso', 'renacimiento', 'los prados', 'arroyo hondo',
  'los rios', 'la esperilla', 'la julia', 'los restauradores', 'ensanche ozama',
  'villa juana', 'centro de los heroes', 'villa francisca', 'san carlos',
  'ciudad nueva', 'zona colonial', 'zona universitaria', 'los mina',
  'villa mella', 'sabana perdida', 'herrera', 'los alcarrizos',
  
  // Santiago
  'bella vista', 'cerros de gurabo', 'los jardines', 'jardines metropolitanos',
  'los salados', 'cienfuegos', 'pueblo nuevo', 'ensanche libertad',
  'la otra banda', 'gurabo', 'hato mayor', 'tamboril',
  
  // Cibao
  'la vega', 'moca', 'san francisco de macoris', 'salcedo', 'tenares',
  
  // Sur
  'azua centro', 'barahona centro', 'san juan centro', 'san cristobal centro',
  
  // Este
  'san pedro centro', 'la romana centro', 'higuey', 'bávaro', 'punta cana',
  'juan dolio', 'guayacanes',
  
  // Baní
  'pueblo', 'el centro', 'los robles', 'las americas', 'villa fundacion'
];

/**
 * Determina la zona geográfica basada en palabras clave en la dirección.
 * @param {string} direccion La dirección completa de la factura.
 * @returns {string} El ID de la zona ('capital', 'local_bani', 'cibao', 'sur', 'este').
 */
const determinarZonaPorDireccion = (direccion) => {
  if (!direccion) return 'capital'; // Por defecto

  const dir = direccion.toLowerCase();

  // 1. Local (Baní) - Prioridad alta por ser más específico
  if (dir.includes('bani') || dir.includes('baní')) {
    return 'local_bani';
  }

  // 2. Este (Nueva zona)
  if (dir.includes('san pedro') || 
      dir.includes('la romana') || 
      dir.includes('higuey') || 
      dir.includes('higüey') ||
      dir.includes('punta cana') || 
      dir.includes('bávaro') ||
      dir.includes('bavaro') ||
      dir.includes('juan dolio') ||
      dir.includes('el seibo') ||
      dir.includes('hato mayor')) {
    return 'este';
  }

  // 3. Cibao (Ampliado)
  if (dir.includes('santiago') || 
      dir.includes('cibao') || 
      dir.includes('la vega') || 
      dir.includes('san francisco de macoris') ||
      dir.includes('san francisco') || 
      dir.includes('moca') ||
      dir.includes('salcedo') ||
      dir.includes('mao') ||
      dir.includes('puerto plata') ||
      dir.includes('sosúa') ||
      dir.includes('sosua') ||
      dir.includes('cabarete') ||
      dir.includes('espaillat') ||
      dir.includes('valverde')) {
    return 'cibao';
  }

  // 4. Sur (Ampliado)
  if (dir.includes('azua') || 
      dir.includes('barahona') || 
      dir.includes('san juan') || 
      dir.includes('san cristobal') ||
      dir.includes('san cristóbal') ||
      dir.includes('peravia') ||
      dir.includes('ocoa') ||
      dir.includes('pedernales') ||
      dir.includes('independencia') ||
      dir.includes('bahoruco')) {
    return 'sur';
  }

  // 5. Capital (Default) - Incluye Santo Domingo y DN
  // Si contiene indicadores de Santo Domingo o si no coincide con ninguna zona
  if (dir.includes('santo domingo') || 
      dir.includes('distrito nacional') ||
      dir.includes('dn') ||
      dir.includes('gazcue') ||
      dir.includes('piantini') ||
      dir.includes('naco')) {
    return 'capital';
  }

  // Default final
  return 'capital';
};

/**
 * Determina el sector específico basado en palabras clave en la dirección.
 * @param {string} direccion La dirección completa de la factura.
 * @returns {string} El nombre del sector encontrado o cadena vacía.
 */
const determinarSectorPorDireccion = (direccion) => {
  if (!direccion) return '';

  const dir = direccion.toLowerCase();

  // Buscar coincidencias de sectores conocidos
  for (const sector of sectoresConocidos) {
    // Usar regex para buscar palabras completas (evitar coincidencias parciales)
    const regex = new RegExp(`\\b${sector.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(dir)) {
      // Capitalizar la primera letra de cada palabra del sector
      return sector
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  return '';
};

// Crear embarque
export const createEmbarque = async (req, res) => {
  try {
    const { nombre, descripcion, fechaCreacion } = req.body;

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    const embarqueData = {
      nombre,
      descripcion: descripcion || '',
      fechaCreacion: fechaCreacion || new Date().toISOString(),
      estado: 'activo',
      totalFacturas: 0,
      facturasEntregadas: 0,
      companyId: userData.companyId || null,
      createdBy: req.user.uid,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('embarques').add(embarqueData);

    res.status(201).json({
      message: 'Embarque creado exitosamente',
      id: docRef.id,
      ...embarqueData
    });
  } catch (error) {
    console.error('Error creando embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los embarques
export const getAllEmbarques = async (req, res) => {
  try {
    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();

    let query = db.collection('embarques');

    if (userData.rol !== 'super_admin' && userData.companyId) {
      query = query.where('companyId', '==', userData.companyId);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .get();
    
    const embarques = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: embarques
    });
  } catch (error) {
    console.error('Error obteniendo embarques:', error);
    res.status(500).json({ error: error.message });
  }
};

// Obtener embarque por ID
export const getEmbarqueById = async (req, res) => {
  try {
    const { id } = req.params;
    const embarqueDoc = await db.collection('embarques').doc(id).get();
    
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    const facturasSnapshot = await db.collection('facturas')
      .where('embarqueId', '==', id)
      .get();
    
    const facturas = facturasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: {
        id: embarqueDoc.id,
        ...embarqueData,
        facturas
      }
    });
  } catch (error) {
    console.error('Error obteniendo embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Actualizar embarque
export const updateEmbarque = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;
    
    const embarqueDoc = await db.collection('embarques').doc(id).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    const updates = {};
    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (estado !== undefined) updates.estado = estado;
    updates.updatedAt = new Date().toISOString();

    await db.collection('embarques').doc(id).update(updates);

    res.json({ message: 'Embarque actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Eliminar embarque
export const deleteEmbarque = async (req, res) => {
  try {
    const { id } = req.params;
    
    const embarqueDoc = await db.collection('embarques').doc(id).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    const facturasSnapshot = await db.collection('facturas')
      .where('embarqueId', '==', id)
      .get();
    
    const batch = db.batch();
    facturasSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    batch.delete(db.collection('embarques').doc(id));
    
    await batch.commit();

    res.json({ message: 'Embarque eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando embarque:', error);
    res.status(500).json({ error: error.message });
  }
};

// Importar facturas (desde CSV o manualmente)
export const importFacturas = async (req, res) => {
  try {
    const { embarqueId, facturas } = req.body;

    if (!facturas || !Array.isArray(facturas)) {
      return res.status(400).json({ error: 'Facturas debe ser un array' });
    }

    const embarqueDoc = await db.collection('embarques').doc(embarqueId).get();
    if (!embarqueDoc.exists) {
      return res.status(404).json({ error: 'Embarque no encontrado' });
    }

    const userDoc = await db.collection('usuarios').doc(req.user.uid).get();
    const userData = userDoc.data();
    const embarqueData = embarqueDoc.data();

    if (userData.rol !== 'super_admin' && embarqueData.companyId !== userData.companyId) {
      return res.status(403).json({ error: 'No tienes acceso a este embarque' });
    }

    const batch = db.batch();
    let count = 0;

    for (const factura of facturas) {
      const facturaRef = db.collection('facturas').doc();
      
      // Obtener dirección
      const direccion = factura.direccion || '';
      
      // Determinar zona automáticamente (o usar la proporcionada)
      const zonaDeterminada = factura.zona || determinarZonaPorDireccion(direccion);
      
      // Determinar sector automáticamente (o usar el proporcionado)
      const sectorDeterminado = factura.sector || determinarSectorPorDireccion(direccion);

      batch.set(facturaRef, {
        embarqueId,
        companyId: embarqueData.companyId,
        numeroFactura: factura.numeroFactura,
        cliente: factura.cliente,
        direccion: direccion,
        telefono: factura.telefono || '',
        monto: factura.monto || 0,
        observaciones: factura.observaciones || '',
        sector: sectorDeterminado,
        zona: zonaDeterminada,
        estado: 'sin_confirmar',
        estadoPago: 'pago_recibir',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      count++;
    }

    // Actualizar contador de facturas en embarque
    batch.update(db.collection('embarques').doc(embarqueId), {
      totalFacturas: count,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();

    res.json({ 
      message: `${count} facturas importadas exitosamente`,
      count 
    });
  } catch (error) {
    console.error('Error importando facturas:', error);
    res.status(500).json({ error: error.message });
  }
};