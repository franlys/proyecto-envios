// ============================================================================
// HOOK: useOfflineQueue
// ============================================================================
// Hook de React para usar el servicio de cola offline en componentes

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../services/offlineQueueService';

/**
 * Hook para gestionar operaciones offline con sincronización automática
 * @returns {Object} Estado y métodos del offline queue
 */
export const useOfflineQueue = () => {
  // ==========================================================================
  // ESTADO
  // ==========================================================================

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    isSyncing: false,
    isOnline: navigator.onLine
  });

  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // ==========================================================================
  // MÉTODOS
  // ==========================================================================

  /**
   * Agregar operación a la cola
   * @param {Object} operation - {type, data, priority}
   * @returns {Promise<string>} ID de la operación
   */
  const addOperation = useCallback(async (operation) => {
    try {
      const opId = await offlineQueue.addOperation(operation);
      updateStats(); // Actualizar stats después de agregar
      return opId;
    } catch (error) {
      console.error('❌ Error agregando operación:', error);
      throw error;
    }
  }, []);

  /**
   * Forzar sincronización manual
   * @returns {Promise<Object>} Resultado de la sincronización
   */
  const syncNow = useCallback(async () => {
    try {
      setSyncError(null);
      const result = await offlineQueue.sync();
      setLastSyncResult(result);
      updateStats();
      return result;
    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
      setSyncError(error.message);
      throw error;
    }
  }, []);

  /**
   * Actualizar estadísticas desde el servicio
   */
  const updateStats = useCallback(() => {
    const currentStats = offlineQueue.getStats();
    setStats(currentStats);
  }, []);

  /**
   * Obtener operaciones pendientes
   */
  const getPendingOperations = useCallback(() => {
    return offlineQueue.getPendingOperations();
  }, []);

  /**
   * Limpiar operaciones completadas
   */
  const clearCompleted = useCallback(async () => {
    await offlineQueue.clearCompleted();
    updateStats();
  }, [updateStats]);

  /**
   * Verificar si hay operaciones pendientes
   */
  const hasPendingOperations = useCallback(() => {
    return offlineQueue.hasPendingOperations();
  }, []);

  // ==========================================================================
  // HELPERS ESPECÍFICOS POR TIPO DE OPERACIÓN
  // ==========================================================================

  /**
   * Marcar entrega como completada (wrapper para addOperation)
   */
  const markDeliveryCompleted = useCallback(async ({
    recoleccionId,
    lat,
    lng,
    photo,
    companyId
  }) => {
    return await addOperation({
      type: 'UPDATE_DELIVERY_STATUS',
      data: {
        recoleccionId,
        status: 'entregada',
        lat,
        lng,
        photo,
        companyId
      },
      priority: 1 // Máxima prioridad
    });
  }, [addOperation]);

  /**
   * Marcar entrega como fallida
   */
  const markDeliveryFailed = useCallback(async ({
    recoleccionId,
    motivo,
    lat,
    lng,
    companyId
  }) => {
    return await addOperation({
      type: 'MARK_DELIVERY_FAILED',
      data: {
        recoleccionId,
        motivo,
        lat,
        lng,
        companyId
      },
      priority: 2 // Alta prioridad
    });
  }, [addOperation]);

  /**
   * Registrar gasto
   */
  const registerExpense = useCallback(async (expenseData) => {
    return await addOperation({
      type: 'REGISTER_EXPENSE',
      data: expenseData,
      priority: 5 // Prioridad media
    });
  }, [addOperation]);

  /**
   * Actualizar ubicación
   */
  const updateLocation = useCallback(async ({ userId, lat, lng }) => {
    return await addOperation({
      type: 'UPDATE_USER_LOCATION',
      data: { userId, lat, lng },
      priority: 8 // Baja prioridad
    });
  }, [addOperation]);

  // ==========================================================================
  // EFECTOS
  // ==========================================================================

  /**
   * Configurar listeners de sincronización al montar
   */
  useEffect(() => {
    // Actualizar stats iniciales
    updateStats();

    // Listener para eventos de sincronización
    const unsubscribe = offlineQueue.addSyncListener((event) => {
      switch (event.type) {
        case 'sync_started':
          console.log('🔄 Sincronización iniciada:', event.total, 'operaciones');
          updateStats();
          break;

        case 'sync_completed':
          console.log('✅ Sincronización completada:', event.result);
          setLastSyncResult(event.result);
          updateStats();
          break;

        case 'operation_added':
          console.log('➕ Operación agregada:', event.operation.type);
          updateStats();
          break;

        case 'operation_completed':
          console.log('✅ Operación completada:', event.operation.type);
          updateStats();
          break;

        case 'operation_failed':
          console.log('❌ Operación fallida:', event.operation.type, event.error);
          updateStats();
          break;

        default:
          break;
      }
    });

    // Listener para cambios de conectividad
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada');
      updateStats();
    };

    const handleOffline = () => {
      console.log('📴 Conexión perdida');
      updateStats();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStats]);

  /**
   * Actualizar stats periódicamente (cada 30s)
   */
  useEffect(() => {
    const interval = setInterval(() => {
      updateStats();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [updateStats]);

  // ==========================================================================
  // RETORNO
  // ==========================================================================

  return {
    // Estado
    stats,
    lastSyncResult,
    syncError,
    isOnline: stats.isOnline,
    isSyncing: stats.isSyncing,
    hasPending: stats.pending > 0,

    // Métodos genéricos
    addOperation,
    syncNow,
    getPendingOperations,
    clearCompleted,
    hasPendingOperations,

    // Métodos específicos (helpers)
    markDeliveryCompleted,
    markDeliveryFailed,
    registerExpense,
    updateLocation
  };
};

export default useOfflineQueue;
