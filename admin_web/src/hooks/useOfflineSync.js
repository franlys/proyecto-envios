// admin_web/src/hooks/useOfflineSync.js
// 🔄 Hook para sincronización offline/online - Recolector y Cargadores

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const STORAGE_KEYS = {
  RECOLECCIONES: 'offline_recolecciones',
  SOLICITUDES: 'offline_solicitudes',
  PENDING_ACTIONS: 'offline_pending_actions',
  LAST_SYNC: 'offline_last_sync',
  IS_ONLINE: 'offline_is_online'
};

/**
 * Hook para gestión de modo offline
 * Guarda datos localmente y sincroniza cuando hay conexión
 */
export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncIntervalRef = useRef(null);

  // Detectar cambios en conexión
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conexión restaurada');
      setIsOnline(true);
      toast.success('Conexión restaurada', {
        description: 'Sincronizando datos pendientes...'
      });
      syncPendingActions();
    };

    const handleOffline = () => {
      console.log('📴 Sin conexión - Modo offline activado');
      setIsOnline(false);
      toast.warning('Sin conexión', {
        description: 'Los datos se guardarán localmente'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar estado inicial
    setIsOnline(navigator.onLine);

    // Sincronizar cada 5 minutos si está online
    syncIntervalRef.current = setInterval(() => {
      if (navigator.onLine) {
        syncPendingActions();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Actualizar contador de acciones pendientes
  useEffect(() => {
    updatePendingCount();
  }, []);

  const updatePendingCount = () => {
    const pending = getPendingActions();
    setPendingCount(pending.length);
  };

  // Guardar datos en localStorage
  const saveToLocalStorage = useCallback((key, data) => {
    try {
      const timestamp = new Date().toISOString();
      const dataWithTimestamp = {
        data,
        timestamp,
        version: '1.0'
      };
      localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
      console.log(`💾 Guardado en localStorage: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
      toast.error('Error guardando datos localmente');
      return false;
    }
  }, []);

  // Leer datos de localStorage
  const loadFromLocalStorage = useCallback((key) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      return parsed.data;
    } catch (error) {
      console.error('❌ Error leyendo de localStorage:', error);
      return null;
    }
  }, []);

  // Guardar acción pendiente para sincronizar después
  const savePendingAction = useCallback((action) => {
    try {
      const pending = getPendingActions();
      const newAction = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        retries: 0,
        ...action
      };
      pending.push(newAction);
      localStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(pending));
      updatePendingCount();
      console.log('📝 Acción pendiente guardada:', newAction.type);
      return newAction.id;
    } catch (error) {
      console.error('❌ Error guardando acción pendiente:', error);
      return null;
    }
  }, []);

  // Obtener acciones pendientes
  const getPendingActions = () => {
    try {
      const pending = localStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
      return pending ? JSON.parse(pending) : [];
    } catch (error) {
      console.error('❌ Error leyendo acciones pendientes:', error);
      return [];
    }
  };

  // Sincronizar acciones pendientes
  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) {
      console.log('⏸️ Sincronización cancelada:', !navigator.onLine ? 'Sin conexión' : 'Ya sincronizando');
      return;
    }

    const pending = getPendingActions();
    if (pending.length === 0) {
      console.log('✅ No hay acciones pendientes');
      return;
    }

    console.log(`🔄 Sincronizando ${pending.length} acciones pendientes...`);
    setIsSyncing(true);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const action of pending) {
      try {
        await executeAction(action);
        results.success++;

        // Eliminar acción exitosa
        const updated = getPendingActions().filter(a => a.id !== action.id);
        localStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(updated));
      } catch (error) {
        console.error(`❌ Error sincronizando acción ${action.id}:`, error);
        results.failed++;
        results.errors.push({ action: action.type, error: error.message });

        // Incrementar contador de reintentos
        action.retries = (action.retries || 0) + 1;
        if (action.retries >= 3) {
          console.warn(`⚠️ Acción ${action.id} falló 3 veces, se eliminará`);
          const updated = getPendingActions().filter(a => a.id !== action.id);
          localStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(updated));
        }
      }
    }

    setIsSyncing(false);
    updatePendingCount();

    // Actualizar timestamp de última sincronización
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    if (results.success > 0) {
      console.log(`✅ Sincronización completada: ${results.success} exitosas`);
      toast.success('Sincronización completada', {
        description: `${results.success} acciones sincronizadas`
      });
    }

    if (results.failed > 0) {
      console.warn(`⚠️ ${results.failed} acciones fallaron`);
      toast.error('Algunas acciones no se pudieron sincronizar', {
        description: 'Se reintentarán más tarde'
      });
    }
  }, [isSyncing]);

  // Ejecutar acción según su tipo
  const executeAction = async (action) => {
    console.log(`▶️ Ejecutando acción: ${action.type}`);

    switch (action.type) {
      case 'CREATE_RECOLECCION':
        return await executeCreateRecoleccion(action);

      case 'UPDATE_RECOLECCION':
        return await executeUpdateRecoleccion(action);

      case 'UPLOAD_PHOTO':
        return await executeUploadPhoto(action);

      case 'CONFIRMAR_ITEM_CARGA':
        return await executeConfirmarItemCarga(action);

      default:
        throw new Error(`Tipo de acción desconocido: ${action.type}`);
    }
  };

  // Implementaciones de acciones (se personalizan según la API)
  const executeCreateRecoleccion = async (actionPayload) => {
    // Importar dinámicamente para evitar ciclos de dependencia
    const api = (await import('../services/api')).default;

    console.log('📤 Ejecutando CREATE_RECOLECCION:', actionPayload.payload);

    const response = await api.post('/recolecciones', actionPayload.payload);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error creando recolección');
    }

    // Si había una solicitud asociada, marcarla como completada
    if (actionPayload.solicitudId) {
      try {
        await api.put(`/solicitudes/${actionPayload.solicitudId}/completar`, {
          codigoRecoleccion: response.data.data?.id || null
        });
        console.log(`✅ Solicitud ${actionPayload.solicitudId} marcada como completada`);
      } catch (error) {
        console.warn('⚠️ No se pudo marcar solicitud como completada:', error);
      }
    }

    console.log('✅ Recolección creada exitosamente:', response.data.data?.codigoTracking);
    return response.data;
  };

  const executeUpdateRecoleccion = async (actionPayload) => {
    const api = (await import('../services/api')).default;

    console.log('📤 Ejecutando UPDATE_RECOLECCION:', actionPayload);

    const { id, ...updateData } = actionPayload.payload;
    const response = await api.put(`/recolecciones/${id}`, updateData);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error actualizando recolección');
    }

    console.log('✅ Recolección actualizada exitosamente');
    return response.data;
  };

  const executeUploadPhoto = async (actionPayload) => {
    console.log('📤 Ejecutando UPLOAD_PHOTO:', actionPayload);

    // Esta función se puede implementar si se necesita subir fotos pendientes
    // Por ahora, las fotos se suben sincronamente en NuevaRecoleccion
    console.log('ℹ️ UPLOAD_PHOTO no requiere implementación (fotos se suben en tiempo real)');
    return { success: true };
  };

  const executeConfirmarItemCarga = async (actionPayload) => {
    const api = (await import('../services/api')).default;

    console.log('📤 Ejecutando CONFIRMAR_ITEM_CARGA:', actionPayload.payload);

    const { rutaId, facturaId, itemIndex } = actionPayload.payload;

    const response = await api.post(
      `/cargadores/rutas/${rutaId}/facturas/${facturaId}/items/confirmar`,
      { itemIndex }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'Error confirmando item de carga');
    }

    console.log('✅ Item de carga confirmado exitosamente');
    return response.data;
  };

  // Forzar sincronización manual
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      toast.warning('Sin conexión', {
        description: 'No se puede sincronizar sin conexión a internet'
      });
      return;
    }

    await syncPendingActions();
  }, [isOnline, syncPendingActions]);

  // Limpiar todos los datos offline
  const clearOfflineData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    setPendingCount(0);
    toast.success('Datos offline eliminados');
    console.log('🗑️ Datos offline eliminados');
  }, []);

  return {
    // Estado
    isOnline,
    isSyncing,
    pendingCount,

    // Métodos de almacenamiento
    saveToLocalStorage,
    loadFromLocalStorage,
    savePendingAction,
    getPendingActions,

    // Métodos de sincronización
    syncPendingActions,
    forceSync,
    clearOfflineData,

    // Constantes
    STORAGE_KEYS
  };
};

export default useOfflineSync;
