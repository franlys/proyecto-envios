// backend/src/controllers/rutasAvanzadasController.js
/**
 * ✅ CONTROLADOR DE RUTAS AVANZADAS - VERSIÓN FINAL ACTUALIZADA
 * Sistema LIFO con orden de carga y entrega
 * 
 * CORRECCIONES IMPLEMENTADAS:
 * ✅ Fix de visibilidad para cargadores (cargadorId agregado al schema)
 * ✅ Fix de visibilidad para repartidores (estado 'asignada' incluido en filtros)
 * ✅ Importación correcta de FieldPath
 */

import { db } from '../config/firebase.js';
// ✅ CORRECCIÓN 1: Importar FieldPath correctamente
import { FieldValue, FieldPath } from 'firebase-admin/firestore';

// ========================================
// MAPEO DE SECTORES A ZONAS
// ========================================
const SECTOR_A_ZONA = {
  // Capital
  'Los Mina': 'Capital', 'San Isidro': 'Capital', 'Boca Chica': 'Capital',
  'Villa Mella': 'Capital', 'Villa Consuelo': 'Capital', 'Cristo Rey': 'Capital',
  'Gazcue': 'Capital', 'Piantini': 'Capital', 'Yaguate': 'Capital',
  'Los Alcarrizos': 'Capital', 'Herrera': 'Capital', 'La Julia': 'Capital',
  'Arroyo Hondo': 'Capital', 'Naco': 'Capital', 'Bella Vista': 'Capital',
  'Zona Colonial': 'Capital', 'Pantoja': 'Capital', 'San Cristóbal Centro': 'Capital',
  'Villa Francisca': 'Capital', 'Los Tres Brazos': 'Capital', 'Ensanche Ozama': 'Capital',
  'Simón Bolívar': 'Capital', 'Villas Agrícolas': 'Capital', 'Villa Altagracia': 'Capital',
  'Hato Nuevo': 'Capital', 'La Agustina': 'Capital', 'Paraíso': 'Capital',
  'Mirador Sur': 'Capital', 'Evaristo Morales': 'Capital', 'Nigua': 'Capital',
  'Palenque': 'Capital', 'Bajos de Haina': 'Capital', 'Villa Altagracia Sur': 'Capital',
  'Los Jardines': 'Capital', 'Los Jardines Metropolitanos': 'Capital',

  // Cibao
  'Santiago Centro': 'Cibao', 'Centro Histórico': 'Cibao', 'Gurabo': 'Cibao',
  'Tamboril': 'Cibao', 'La Vega Centro': 'Cibao', 'Jarabacoa': 'Cibao',
  'Constanza': 'Cibao', 'Moca Centro': 'Cibao', 'Bonao': 'Cibao',
  'Licey al Medio': 'Cibao', 'Navarrete': 'Cibao', 'Villa González': 'Cibao',
  'Jánico': 'Cibao', 'Villa Olga': 'Cibao', 'Cienfuegos': 'Cibao',
  'San Francisco de Macorís': 'Cibao', 'Salcedo': 'Cibao', 'Mao': 'Cibao',

  // Este
  'San Pedro Centro': 'Este', 'La Romana Centro': 'Este', 'Bávaro': 'Este',
  'Punta Cana': 'Este', 'Higüey Centro': 'Este', 'Los Llanos': 'Este',
  'Puerto Nuevo': 'Este', 'Quisqueya': 'Este', 'Casa de Campo': 'Este',
  'Caleta': 'Este', 'Guaymate': 'Este', 'Punta Cana Resort': 'Este',
  'Cabeza de Toro': 'Este', 'Arena Gorda': 'Este', 'Otra Banda': 'Este',
  'El Seibo': 'Este', 'Miches': 'Este',

  // Sur
  'Azua Centro': 'Sur', 'Barahona Centro': 'Sur', 'San Juan Centro': 'Sur',
  'Ocoa Centro': 'Sur', 'Las Charcas': 'Sur', 'Padre Las Casas': 'Sur',
  'Peralta': 'Sur', 'Cabral': 'Sur', 'Polo': 'Sur', 'Vicente Noble': 'Sur',
  'El Cercado': 'Sur', 'Las Matas de Farfán': 'Sur', 'Bohechío': 'Sur',
  'Neiba': 'Sur', 'Jimaní': 'Sur', 'Elías Piña': 'Sur', 'Pedernales': 'Sur',

  // Local (Baní y alrededores)
  'Baní Centro': 'Local', 'Sabana Buey': 'Local', 'Matanzas': 'Local',
  'Sombrero': 'Local', 'Villa Fundación': 'Local', 'Yaguate Centro': 'Local',
  'Los Robles': 'Local', 'Pueblo Nuevo': 'Local', 'Ensanche La Fé': 'Local',
  'El Cachón': 'Local', 'Paya': 'Local', 'Las Calderas': 'Local',
  'Catalina': 'Local', 'Las Salinas': 'Local', 'Playa El Manglito': 'Local',
  'Palmar de Ocoa': 'Local'
};

// ========================================
// OBTENER REPARTIDORES DISPONIBLES
// ========================================
export const getRepartidoresDisponibles = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o sin compañía'
      });
    }

    console.log('🚚 Obteniendo repartidores para company:', companyId);

    const snapshot = await db.collection('usuarios')
      .where('companyId', '==', companyId)
      .where('rol', '==', 'repartidor')
      .where('activo', '==', true)
      .get();

    const repartidores = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre || 'Sin nombre',
        email: data.email || '',
        telefono: data.telefono || ''
      };
    });

    console.log(`✅ ${repartidores.length} repartidores encontrados`);

    res.json({
      success: true,
      data: repartidores
    });

  } catch (error) {
    console.error('❌ Error obteniendo repartidores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener repartidores',
      error: error.message
    });
  }
};

// ========================================
// OBTENER CARGADORES DISPONIBLES
// ========================================
export const getCargadoresDisponibles = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado o sin compañía'
      });
    }

    console.log('👷 Obteniendo cargadores para company:', companyId);

    const snapshot = await db.collection('usuarios')
      .where('companyId', '==', companyId)
      .where('rol', '==', 'cargador')
      .where('activo', '==', true)
      .get();

    const cargadores = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        nombre: data.nombre || 'Sin nombre',
        email: data.email || '',
        telefono: data.telefono || ''
      };
    });

    console.log(`✅ ${cargadores.length} cargadores encontrados`);

    res.json({
      success: true,
      data: cargadores
    });

  } catch (error) {
    console.error('❌ Error obteniendo cargadores:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cargadores',
      error: error.message
    });
  }
};

// ========================================
// OBTENER CONTENEDORES CON FACTURAS DISPONIBLES
// ========================================
export const getContenedoresDisponibles = async (req, res) => {
  try {
    const companyId = req.userData?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    console.log('📦 Buscando contenedores con facturas confirmadas...');

    // 1. Buscar todas las facturas confirmadas por secretaría que no están en ruta
    const facturasSnapshot = await db.collection('recolecciones')
      .where('companyId', '==', companyId)
      .where('estado', '==', 'confirmada_secretaria')
      .get();

    const facturasSinRuta = facturasSnapshot.docs
      .map(doc => doc.data())
      .filter(factura => !factura.rutaId && !factura.rutaAsignada);

    if (facturasSinRuta.length === 0) {
      console.log('✅ No se encontraron facturas pendientes en ningún contenedor.');
      return res.json({ success: true, data: [] });
    }

    // 2. Agrupar por contenedorId y contar
    const contadores = facturasSinRuta.reduce((acc, factura) => {
      if (factura.contenedorId) {
        acc[factura.contenedorId] = (acc[factura.contenedorId] || 0) + 1;
      }
      return acc;
    }, {});

    const contenedorIds = Object.keys(contadores);
    if (contenedorIds.length === 0) {
      console.log('✅ No hay contenedores con facturas pendientes.');
      return res.json({ success: true, data: [] });
    }

    // 3. Obtener los documentos de esos contenedores
    // Nota: Firestore 'in' query está limitado a 30 IDs.
    if (contenedorIds.length > 30) {
      console.warn(`⚠️ Se encontraron ${contenedorIds.length} contenedores, pero la consulta se limita a 30.`);
    }
    const contenedoresSnapshot = await db.collection('contenedores')
      // ✅ CORRECCIÓN 2: Usar FieldPath (importado) en lugar de db.FieldPath
      .where(FieldPath.documentId(), 'in', contenedorIds.slice(0, 30))
      .get();

    const contenedores = contenedoresSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        numeroContenedor: data.numeroContenedor,
        facturasPendientes: contadores[doc.id] || 0 // Usar el conteo real
      };
      // VALIDACIONES
      // ========================================
      if (!companyId || !usuarioId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!nombre || !repartidorId || !cargadoresIds || !facturasIds) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: nombre, repartidorId, cargadoresIds, facturasIds'
        });
      }

      if (!Array.isArray(cargadoresIds) || cargadoresIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe haber al menos un cargador asignado'
        });
      }

      if (!Array.isArray(facturasIds) || facturasIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Debe haber al menos una factura asignada'
        });
      }

      console.log(`🚀 Creando ruta avanzada: ${nombre}`);
      console.log(`📦 Facturas: ${facturasIds.length}`);
      console.log(`🚚 Repartidor: ${repartidorId}`);
      console.log(`👷 Cargadores: ${cargadoresIds.length}`);

      // ========================================
      // VERIFICAR REPARTIDOR
      // ========================================
      const repartidorDoc = await db.collection('usuarios').doc(repartidorId).get();
      if (!repartidorDoc.exists) {
        return res.status(404).json({
          success: false,
          message: 'Repartidor no encontrado'
        });
      }

      const repartidorData = repartidorDoc.data();
      if (repartidorData.companyId !== companyId) {
        return res.status(403).json({
          success: false,
          message: 'El repartidor no pertenece a tu compañía'
        });
      }

      // ========================================
      // VERIFICAR CARGADORES
      // ========================================
      const cargadoresPromises = cargadoresIds.map(id =>
        db.collection('usuarios').doc(id).get()
      );
      const cargadoresSnap = await Promise.all(cargadoresPromises);

      const cargadoresData = [];
      for (let i = 0; i < cargadoresSnap.length; i++) {
        const doc = cargadoresSnap[i];
        if (!doc.exists) {
          return res.status(404).json({
            success: false,
            message: `Cargador ${cargadoresIds[i]} no encontrado`
          });
        }
        const data = doc.data();
        if (data.companyId !== companyId) {
          return res.status(403).json({
            success: false,
            message: 'Uno o más cargadores no pertenecen a tu compañía'
          });
        }
        cargadoresData.push({ id: doc.id, nombre: data.nombre });
      }

      // ========================================
      // CALCULAR ORDEN DE CARGA Y ENTREGA (LIFO)
      // ========================================
      const direccionCarga = configuracion?.direccionCarga || 'adelante-atras';
      const ordenEntrega = configuracion?.ordenEntrega || 'cercanas-primero';

      let facturasOrdenadas = [...facturasIds].map((id, index) => ({
        facturaId: id,
        ordenOriginal: index + 1
      }));

      // Si es "lejanas primero", invertir
      if (ordenEntrega === 'lejanas-primero') {
        facturasOrdenadas.reverse();
      }

      // Aplicar LIFO según dirección de carga
      const facturasConOrden = facturasOrdenadas.map((item, index) => {
        if (direccionCarga === 'atras-adelante') {
          // Carga desde atrás: última en cargar = primera en entregar
          return {
            facturaId: item.facturaId,
            ordenCarga: facturasOrdenadas.length - index,
            ordenEntrega: index + 1
          };
        } else {
          // Carga desde adelante: primera en cargar = última en entregar
          return {
            facturaId: item.facturaId,
            ordenCarga: index + 1,
            ordenEntrega: facturasOrdenadas.length - index
          };
        }
      });

      console.log('📊 Orden calculado:', facturasConOrden);

      // ========================================
      // CREAR DOCUMENTO DE RUTA
      // ========================================
      const rutaData = {
        nombre: nombre.trim(),
        companyId,
        repartidorId,
        repartidorNombre: repartidorData.nombre,

        // ✅ CORRECCIÓN 3: AÑADIR ID Y NOMBRE DEL CARGADOR PRINCIPAL PARA FILTRADO
        // Esto soluciona la invisibilidad del cargador
        cargadorId: cargadoresIds[0],
        cargadorNombre: cargadoresData.find(c => c.id === cargadoresIds[0])?.nombre || cargadoresIds[0],

        // ✅ CORRECCIÓN 4: AGREGAR ARRAY DE CARGADORES PARA BÚSQUEDA POR ARRAY-CONTAINS
        cargadoresIds: cargadoresIds, // Array de IDs de cargadores para queries

        cargadores: cargadoresData,
        facturas: facturasConOrden,
        configuracion: {
          direccionCarga,
          ordenEntrega,
          sistemaLIFO: true
        },
        estado: 'asignada',
        totalFacturas: facturasIds.length,
        facturasEntregadas: 0,
        createdAt: FieldValue.serverTimestamp(),
        fechaCreacion: FieldValue.serverTimestamp(),
        createdBy: usuarioId,
        fechaActualizacion: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        historial: [
          {
            accion: 'crear_ruta',
            descripcion: `Ruta creada con ${facturasIds.length} facturas`,
            usuario: usuarioId,
            fecha: new Date().toISOString()
          }
        ]
      };

      const rutaRef = await db.collection('rutas').add(rutaData);
      console.log(`✅ Ruta creada con ID: ${rutaRef.id}`);

      // ========================================
      // ACTUALIZAR FACTURAS EN BATCH
      // ========================================
      const batch = db.batch();

      for (const facturaInfo of facturasConOrden) {
        const facturaRef = db.collection('recolecciones').doc(facturaInfo.facturaId);

        batch.update(facturaRef, {
          estado: 'en_ruta',
          rutaId: rutaRef.id,
          rutaNombre: nombre.trim(),
          repartidorId,
          repartidorNombre: repartidorData.nombre,
          ordenCarga: facturaInfo.ordenCarga,
          ordenEntrega: facturaInfo.ordenEntrega,
          fechaAsignacionRuta: FieldValue.serverTimestamp(),
          fechaActualizacion: FieldValue.serverTimestamp(),
          historial: FieldValue.arrayUnion({
            accion: 'asignar_ruta',
            descripcion: `Asignada a ruta: ${nombre}`,
            rutaId: rutaRef.id,
            ordenCarga: facturaInfo.ordenCarga,
            ordenEntrega: facturaInfo.ordenEntrega,
            usuario: usuarioId,
            fecha: new Date().toISOString()
          })
        });
      }

      await batch.commit();
      console.log(`✅ ${facturasConOrden.length} facturas actualizadas`);

      // ========================================
      // RESPUESTA EXITOSA
      // ========================================
      res.status(201).json({
        success: true,
        message: 'Ruta creada exitosamente',
        data: {
          id: rutaRef.id,
          nombre: nombre.trim(),
          totalFacturas: facturasIds.length,
          repartidor: repartidorData.nombre,
          cargadores: cargadoresData.length,
          configuracion: rutaData.configuracion
        }
      });

    } catch (error) {
      console.error('❌ Error creando ruta avanzada:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear la ruta',
        error: error.message
      });
    }
  };

  // ========================================
  // EXPORTAR CONTROLADORES
  // ========================================
  export default {
    getRepartidoresDisponibles,
    getCargadoresDisponibles,
    getContenedoresDisponibles,
    getFacturasDisponibles,
    crearRutaAvanzada
  };