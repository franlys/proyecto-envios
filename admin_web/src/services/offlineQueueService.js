// ============================================================================
// SERVICIO DE COLA OFFLINE
// ============================================================================
// Guarda operaciones realizadas sin conexión y las sincroniza automáticamente
// cuando la conexión se restaura

import { storageService, STORAGE_KEYS } from './storageService';
import { db } from './firebase';
import api from './api';

class OfflineQueueService {
  constructor() {
    this.queue = [];
    this.isSyncing = false;
    this.syncListeners = [];
    this.isInitialized = false;
  }

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================

  /**
   * Inicializar el servicio (cargar cola del storage)
   */
  async init() {
    if (this.isInitialized) return;

    try {
      const savedQueue = await storageService.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      this.queue = savedQueue || [];
      this.isInitialized = true;

      console.log(`📦 Cola offline inicializada: ${this.queue.length} operaciones pendientes`);

      // Si hay operaciones pendientes y hay conexión, sincronizar
      if (this.queue.length > 0 && navigator.onLine) {
        console.log('🔄 Hay conexión, sincronizando cola automáticamente...');
        setTimeout(() => this.sync(), 2000); // Delay de 2s para no bloquear init
      }

      // Listener para cambios de conectividad
      window.addEventListener('online', () => {
        console.log('🌐 Conexión restaurada, sincronizando cola...');
        this.sync();
      });

    } catch (error) {
      console.error('❌ Error inicializando cola offline:', error);
      this.queue = [];
    }
  }

  // ==========================================================================
  // OPERACIONES DE COLA
  // ==========================================================================

  /**
   * Agregar operación a la cola
   * @param {Object} operation - {type, data, priority}
   */
  async addOperation(operation) {
    const op = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retries: 0,
      status: 'pending',
      priority: operation.priority || 5, // 1=highest, 10=lowest
      ...operation
    };

    this.queue.push(op);
    await this.saveQueue();

    console.log('➕ Operación agregada a cola offline:', {
      id: op.id,
      type: op.type,
      priority: op.priority
    });

    // Notificar listeners
    this.notifyListeners({ type: 'operation_added', operation: op });

    // Si hay conexión, intentar sincronizar
    if (navigator.onLine) {
      setTimeout(() => this.sync(), 500);
    }

    return op.id;
  }

  /**
   * Guardar cola en storage persistente
   */
  async saveQueue() {
    try {
      await storageService.setItem(STORAGE_KEYS.OFFLINE_QUEUE, this.queue);
      await storageService.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } catch (error) {
      console.error('❌ Error guardando cola:', error);
    }
  }

  /**
   * Obtener operaciones pendientes
   * @returns {Array}
   */
  getPendingOperations() {
    return this.queue.filter(op => op.status === 'pending');
  }

  /**
   * Obtener operación por ID
   * @param {string} id
   * @returns {Object|null}
   */
  getOperation(id) {
    return this.queue.find(op => op.id === id) || null;
  }

  /**
   * Eliminar operación de la cola
   * @param {string} id
   */
  async removeOperation(id) {
    const index = this.queue.findIndex(op => op.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      console.log(`🗑️ Operación ${id} eliminada de la cola`);
    }
  }

  /**
   * Limpiar operaciones completadas
   */
  async clearCompleted() {
    const before = this.queue.length;
    this.queue = this.queue.filter(op => op.status !== 'completed');
    await this.saveQueue();
    const removed = before - this.queue.length;
    if (removed > 0) {
      console.log(`🧹 ${removed} operaciones completadas eliminadas`);
    }
  }

  // ==========================================================================
  // SINCRONIZACIÓN
  // ==========================================================================

  /**
   * Sincronizar todas las operaciones pendientes
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  async sync() {
    // Evitar sincronizaciones concurrentes
    if (this.isSyncing) {
      console.log('⏳ Ya hay una sincronización en progreso...');
      return { skipped: true };
    }

    // Verificar conexión
    if (!navigator.onLine) {
      console.log('📴 Sin conexión, sincronización pospuesta');
      return { skipped: true, reason: 'offline' };
    }

    const pendingOps = this.getPendingOperations();
    if (pendingOps.length === 0) {
      console.log('✅ Cola vacía, nada que sincronizar');
      return { success: 0, failed: 0, total: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'sync_started', total: pendingOps.length });

    console.log(`🔄 Sincronizando ${pendingOps.length} operaciones...`);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Ordenar por prioridad (1=highest first)
    const sortedOps = [...pendingOps].sort((a, b) => a.priority - b.priority);

    // Procesar cada operación secuencialmente
    for (const op of sortedOps) {
      try {
        console.log(`🔄 Procesando: ${op.type} (${op.id})`);

        await this.executeOperation(op);

        // Marcar como completada
        op.status = 'completed';
        op.completedAt = new Date().toISOString();
        results.success++;

        this.notifyListeners({
          type: 'operation_completed',
          operation: op,
          progress: { current: results.success + results.failed, total: sortedOps.length }
        });

      } catch (error) {
        console.error(`❌ Error en operación ${op.id}:`, error);

        op.retries++;
        op.lastError = error.message;
        op.lastRetryAt = new Date().toISOString();

        // Si ha fallado muchas veces, marcar como failed
        if (op.retries >= 3) {
          op.status = 'failed';
          results.failed++;
        }

        results.errors.push({
          id: op.id,
          type: op.type,
          error: error.message
        });

        this.notifyListeners({
          type: 'operation_failed',
          operation: op,
          error: error.message
        });
      }
    }

    // Guardar estado actualizado
    await this.saveQueue();

    // Limpiar completadas si son muchas
    if (results.success > 10) {
      await this.clearCompleted();
    }

    this.isSyncing = false;

    const finalResult = {
      success: results.success,
      failed: results.failed,
      total: sortedOps.length,
      errors: results.errors
    };

    console.log('✅ Sincronización completada:', finalResult);

    this.notifyListeners({
      type: 'sync_completed',
      result: finalResult
    });

    return finalResult;
  }

  // ==========================================================================
  // EJECUCIÓN DE OPERACIONES
  // ==========================================================================

  /**
   * Ejecutar una operación específica
   * @param {Object} op - Operación a ejecutar
   */
  async executeOperation(op) {
    switch (op.type) {
      case 'UPDATE_DELIVERY_STATUS':
        return await this.updateDeliveryStatus(op.data);

      case 'CREATE_RECOLECCION':
        return await this.createRecoleccion(op.data);

      case 'REGISTER_EXPENSE':
        return await this.registerExpense(op.data);

      case 'UPDATE_USER_LOCATION':
        return await this.updateUserLocation(op.data);

      case 'MARK_DELIVERY_FAILED':
        return await this.markDeliveryFailed(op.data);

      default:
        throw new Error(`Tipo de operación desconocido: ${op.type}`);
    }
  }

  /**
   * Actualizar estado de entrega
   */
  async updateDeliveryStatus({ recoleccionId, status, lat, lng, photo, motivo, companyId }) {
    const updateData = {
      estadoGeneral: status,
      updatedAt: new Date().toISOString()
    };

    if (lat && lng) {
      updateData.ubicacionEntrega = { lat, lng };
    }

    if (photo) {
      updateData.fotoComprobante = photo;
    }

    if (motivo) {
      updateData.motivoNoEntrega = motivo;
    }

    await db.collection('recolecciones').doc(recoleccionId).update(updateData);
    console.log(`✅ Delivery ${recoleccionId} actualizado a: ${status}`);
  }

  /**
   * Crear nueva recolección
   */
  async createRecoleccion(data) {
    const result = await db.collection('recolecciones').add({
      ...data,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Recolección creada:', result.id);
    return result.id;
  }

  /**
   * Registrar gasto
   */
  async registerExpense(data) {
    await db.collection('gastos').add({
      ...data,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Gasto registrado');
  }

  /**
   * Actualizar ubicación del usuario
   */
  async updateUserLocation({ userId, lat, lng }) {
    await db.collection('usuarios').doc(userId).update({
      lastLocation: { lat, lng },
      lastLocationUpdate: new Date().toISOString()
    });
    console.log('✅ Ubicación actualizada');
  }

  /**
   * Marcar entrega como fallida
   */
  async markDeliveryFailed({ recoleccionId, motivo, lat, lng }) {
    await db.collection('recolecciones').doc(recoleccionId).update({
      estadoGeneral: 'no_entregada',
      motivoNoEntrega: motivo,
      ubicacionIntento: lat && lng ? { lat, lng } : null,
      fechaIntento: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Entrega ${recoleccionId} marcada como fallida`);
  }

  // ==========================================================================
  // LISTENERS Y EVENTOS
  // ==========================================================================

  /**
   * Agregar listener para eventos de sincronización
   * @param {Function} callback
   */
  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => this.removeSyncListener(callback);
  }

  /**
   * Eliminar listener
   * @param {Function} callback
   */
  removeSyncListener(callback) {
    this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
  }

  /**
   * Notificar a todos los listeners
   * @param {Object} event
   */
  notifyListeners(event) {
    this.syncListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error en listener:', error);
      }
    });
  }

  // ==========================================================================
  // ESTADÍSTICAS Y ESTADO
  // ==========================================================================

  /**
   * Obtener estadísticas de la cola
   * @returns {Object}
   */
  getStats() {
    const byType = {};
    const byStatus = {};

    this.queue.forEach(op => {
      byType[op.type] = (byType[op.type] || 0) + 1;
      byStatus[op.status] = (byStatus[op.status] || 0) + 1;
    });

    const pending = this.getPendingOperations();
    const oldestPending = pending.length > 0 ? pending[0].timestamp : null;

    return {
      total: this.queue.length,
      pending: pending.length,
      completed: byStatus.completed || 0,
      failed: byStatus.failed || 0,
      byType,
      byStatus,
      oldestOperation: oldestPending,
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine
    };
  }

  /**
   * Verificar si hay operaciones pendientes
   * @returns {boolean}
   */
  hasPendingOperations() {
    return this.getPendingOperations().length > 0;
  }

  /**
   * Limpiar toda la cola (¡PELIGROSO!)
   */
  async clearAll() {
    this.queue = [];
    await this.saveQueue();
    console.log('🧹 Cola completamente limpiada');
  }
}

// Instancia singleton
export const offlineQueue = new OfflineQueueService();

// Auto-inicializar
offlineQueue.init();

export default offlineQueue;
