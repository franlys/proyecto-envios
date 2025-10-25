// backend/src/models/Recoleccion.js
import { db, admin } from '../config/firebase.js';
import TrackingGenerator from './TrackingGenerator.js';

class Recoleccion {
  
  /**
   * Crear nueva recolección
   * @param {Object} data Datos de la recolección
   * @returns {Promise<Object>} Recolección creada
   */
  static async create(data) {
    try {
      // Generar tracking único
      const trackingNumero = await TrackingGenerator.generate();
      
      const recoleccion = {
        tracking_numero: trackingNumero,
        fecha_recoleccion: data.fecha_recoleccion || new Date().toISOString(),
        recolector_id: data.recolector_id,
        recolector_nombre: data.recolector_nombre,
        
        // Ubicación GPS
        ubicacion: data.ubicacion || null,
        
        // Paquete
        paquete: {
          fotos: data.fotos || [],
          descripcion: data.descripcion || '',
          peso: data.peso || null,
          peso_unidad: data.peso_unidad || 'lb',
          valor_declarado: data.valor_declarado || 0,
          rfid_tag: null // Para implementación futura
        },
        
        // Remitente
        remitente: {
          nombre: data.remitente.nombre,
          direccion: data.remitente.direccion,
          ciudad: data.remitente.ciudad || '',
          estado: data.remitente.estado || '',
          zip: data.remitente.zip || '',
          telefono: data.remitente.telefono,
          email: data.remitente.email || null
        },
        
        // Destinatario
        destinatario: {
          nombre: data.destinatario.nombre,
          ciudad: data.destinatario.ciudad,
          sector: data.destinatario.sector || '',
          telefono: data.destinatario.telefono,
          telefono_alt: data.destinatario.telefono_alt || null,
          direccion_completa: data.destinatario.direccion_completa,
          coordenadas: data.destinatario.coordenadas || null
        },
        
        // Pago
        pago: {
          status: data.pago.status,
          momento_pago: data.pago.momento_pago,
          metodo: data.pago.metodo || null,
          monto: data.pago.monto || 0,
          moneda: data.pago.moneda || 'USD',
          comprobante_foto: data.pago.comprobante_foto || null
        },
        
        // Estado
        status: 'Recolectado',
        contenedor_id: null,
        factura_id: null,
        ruta_id: null,
        
        // Trazabilidad
        historial: [
          {
            fecha: new Date().toISOString(),
            accion: 'Recolectado',
            usuario: data.recolector_nombre,
            ubicacion: data.ubicacion || null
          }
        ],
        
        // Metadatos
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Guardar en Firestore
      const docRef = db.collection('recolecciones').doc(trackingNumero);
      await docRef.set(recoleccion);
      
      return {
        id: trackingNumero,
        ...recoleccion
      };
      
    } catch (error) {
      console.error('Error creando recolección:', error);
      throw error;
    }
  }
  
  /**
   * Obtener recolección por tracking
   */
  static async getByTracking(trackingNumero) {
    try {
      const doc = await db.collection('recolecciones').doc(trackingNumero).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error obteniendo recolección:', error);
      throw error;
    }
  }
  
  /**
   * Listar recolecciones de un recolector
   */
  static async listByRecolector(recolectorId, filters = {}) {
    try {
      let query = db.collection('recolecciones')
        .where('recolector_id', '==', recolectorId);
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.fecha_desde) {
        query = query.where('fecha_recoleccion', '>=', filters.fecha_desde);
      }
      
      query = query.orderBy('fecha_recoleccion', 'desc');
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      const snapshot = await query.get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error listando recolecciones:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar status de recolección
   */
  static async updateStatus(trackingNumero, nuevoStatus, data = {}) {
    try {
      const docRef = db.collection('recolecciones').doc(trackingNumero);
      
      const updateData = {
        status: nuevoStatus,
        updatedAt: new Date().toISOString(),
        historial: admin.firestore.FieldValue.arrayUnion({
          fecha: new Date().toISOString(),
          accion: nuevoStatus,
          usuario: data.usuario || 'Sistema',
          notas: data.notas || null
        })
      };
      
      if (nuevoStatus === 'En almacén EE.UU.') {
        updateData.fecha_llegada_almacen = new Date().toISOString();
      }
      
      if (nuevoStatus === 'En contenedor') {
        updateData.contenedor_id = data.contenedor_id;
      }
      
      await docRef.update(updateData);
      
    } catch (error) {
      console.error('Error actualizando status:', error);
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Obtener recolecciones con filtros avanzados
   * Eliminado .offset() que no existe en Firestore
   */
  static async obtenerConFiltros(filtros = {}, limit = 100, lastDoc = null) {
    try {
      let query = db.collection('recolecciones');
      
      // Aplicar filtros
      if (filtros.status) {
        query = query.where('status', '==', filtros.status);
      }
      
      if (filtros.recolector_id) {
        query = query.where('recolector_id', '==', filtros.recolector_id);
      }
      
      if (filtros.tracking_numero) {
        query = query.where('tracking_numero', '==', filtros.tracking_numero);
      }
      
      if (filtros.contenedor_id) {
        query = query.where('contenedor_id', '==', filtros.contenedor_id);
      }
      
      // Filtro por rango de fechas
      if (filtros.fecha_recoleccion) {
        if (filtros.fecha_recoleccion.$gte) {
          query = query.where('fecha_recoleccion', '>=', filtros.fecha_recoleccion.$gte.toISOString());
        }
        if (filtros.fecha_recoleccion.$lte) {
          query = query.where('fecha_recoleccion', '<=', filtros.fecha_recoleccion.$lte.toISOString());
        }
      }
      
      // Ordenar
      query = query.orderBy('fecha_recoleccion', 'desc');
      
      // ✅ Paginación con cursor (en lugar de .offset())
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      query = query.limit(limit);
      
      const snapshot = await query.get();
      
      const recolecciones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Retornar también el último documento para paginación
      const ultimoDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      
      return {
        data: recolecciones,
        lastDoc: ultimoDoc,
        hasMore: snapshot.docs.length === limit
      };
      
    } catch (error) {
      console.error('Error obteniendo recolecciones con filtros:', error);
      throw error;
    }
  }
  
  /**
   * Búsqueda rápida por término (tracking o nombre)
   */
  static async buscarPorTermino(termino) {
    try {
      const resultados = [];
      
      // Buscar por tracking exacto
      const trackingDoc = await db.collection('recolecciones').doc(termino).get();
      if (trackingDoc.exists) {
        resultados.push({
          id: trackingDoc.id,
          ...trackingDoc.data()
        });
        return resultados;
      }
      
      // Buscar por nombre de destinatario (parcial)
      const snapshot = await db.collection('recolecciones')
        .orderBy('destinatario.nombre')
        .startAt(termino)
        .endAt(termino + '\uf8ff')
        .limit(10)
        .get();
      
      snapshot.docs.forEach(doc => {
        resultados.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return resultados;
      
    } catch (error) {
      console.error('Error en búsqueda:', error);
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de un recolector
   */
  static async obtenerEstadisticasRecolector(recolectorId) {
    try {
      const snapshot = await db.collection('recolecciones')
        .where('recolector_id', '==', recolectorId)
        .get();
      
      const recolecciones = snapshot.docs.map(doc => doc.data());
      
      // Contar por estado
      const porEstado = {};
      recolecciones.forEach(rec => {
        porEstado[rec.status] = (porEstado[rec.status] || 0) + 1;
      });
      
      // Calcular totales
      const total = recolecciones.length;
      const enProceso = recolecciones.filter(r => 
        !['Entregado', 'Cancelado'].includes(r.status)
      ).length;
      
      const valorTotal = recolecciones.reduce((sum, r) => 
        sum + (r.paquete.valor_declarado || 0), 0
      );
      
      const pesoTotal = recolecciones.reduce((sum, r) => 
        sum + (r.paquete.peso || 0), 0
      );
      
      return {
        recolector_id: recolectorId,
        total_recolecciones: total,
        en_proceso: enProceso,
        entregadas: porEstado['Entregado'] || 0,
        por_estado: porEstado,
        valor_total: valorTotal,
        peso_total: pesoTotal,
        ultima_recoleccion: recolecciones[0]?.fecha_recoleccion || null
      };
      
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }
  
  /**
   * Cambiar estado de recolección con historial
   */
  static async cambiarEstado(trackingNumero, nuevoEstado, usuario, notas = null) {
    try {
      const docRef = db.collection('recolecciones').doc(trackingNumero);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const updateData = {
        status: nuevoEstado,
        updatedAt: new Date().toISOString(),
        historial: admin.firestore.FieldValue.arrayUnion({
          fecha: new Date().toISOString(),
          accion: `Cambio de estado a: ${nuevoEstado}`,
          usuario: usuario || 'Sistema',
          notas: notas || null
        })
      };
      
      // Agregar campos específicos según el estado
      if (nuevoEstado === 'En almacén EE.UU.') {
        updateData.fecha_llegada_almacen_eeuu = new Date().toISOString();
      }
      
      if (nuevoEstado === 'En almacén RD') {
        updateData.fecha_llegada_almacen_rd = new Date().toISOString();
      }
      
      if (nuevoEstado === 'Entregado') {
        updateData.fecha_entrega = new Date().toISOString();
      }
      
      await docRef.update(updateData);
      
      return {
        id: trackingNumero,
        ...doc.data(),
        ...updateData
      };
      
    } catch (error) {
      console.error('Error cambiando estado:', error);
      throw error;
    }
  }
  
  /**
   * Agregar fotos a una recolección
   */
  static async agregarFotos(trackingNumero, urls) {
    try {
      const docRef = db.collection('recolecciones').doc(trackingNumero);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      await docRef.update({
        'paquete.fotos': admin.firestore.FieldValue.arrayUnion(...urls),
        updatedAt: new Date().toISOString()
      });
      
      return true;
      
    } catch (error) {
      console.error('Error agregando fotos:', error);
      throw error;
    }
  }
}

export default Recoleccion;