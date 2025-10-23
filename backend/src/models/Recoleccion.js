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
}

export default Recoleccion;