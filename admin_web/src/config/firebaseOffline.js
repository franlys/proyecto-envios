/**
 * Configuración de Persistencia Offline para Firebase
 *
 * Habilita IndexedDB para que la app funcione sin conexión.
 * Los datos se sincronizan automáticamente cuando vuelve internet.
 */

import React from 'react';
import { db } from '../services/firebase';
import { enableIndexedDbPersistence, enableNetwork, disableNetwork } from 'firebase/firestore';
import { toast } from 'sonner';

let persistenceEnabled = false;
let isOnline = true;

/**
 * Inicializar persistencia offline
 */
export const initializeOfflinePersistence = async () => {
  if (persistenceEnabled) {
    console.log('✅ Persistencia offline ya habilitada');
    return { success: true, alreadyEnabled: true };
  }

  // ✅ CORRECCIÓN: La persistencia ya se inicializó en firebase.js
  // Solo verificamos y configuramos listeners
  // Detectar cambios en conexión de red
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Estado inicial
  if (!navigator.onLine) {
    handleOffline();
  }
};

/**
 * Handler cuando vuelve la conexión
 */
const handleOnline = async () => {
  if (!isOnline) {
    isOnline = true;
    console.log('🌐 Conexión restaurada - Sincronizando...');

    try {
      await enableNetwork(db);
      toast.success('Conexión restaurada - Sincronizando datos', {
        duration: 3000,
        icon: '🌐'
      });
    } catch (err) {
      console.error('Error al reactivar red:', err);
    }
  }
};

/**
 * Handler cuando se pierde la conexión
 */
const handleOffline = async () => {
  if (isOnline) {
    isOnline = false;
    console.log('📴 Sin conexión - Modo offline activado');

    toast.warning('Sin conexión a internet - Modo offline activado', {
      duration: 5000,
      icon: '📴',
      description: 'Tus cambios se guardarán localmente y se sincronizarán cuando vuelva internet'
    });
  }
};

/**
 * Forzar sincronización manual
 */
export const forceSyncData = async () => {
  if (!navigator.onLine) {
    toast.error('No hay conexión a internet');
    return { success: false };
  }

  try {
    // Reactivar red para forzar sync
    await disableNetwork(db);
    await enableNetwork(db);

    toast.success('Sincronización completada', {
      duration: 2000
    });

    return { success: true };
  } catch (err) {
    console.error('Error en sincronización:', err);
    toast.error('Error al sincronizar datos');
    return { success: false, error: err };
  }
};

/**
 * Verificar si hay datos pendientes de sincronización
 */
export const hasPendingWrites = () => {
  // Firebase maneja esto internamente, pero podemos exponer el estado
  return !isOnline && persistenceEnabled;
};

/**
 * Obtener estado de conexión
 */
export const getConnectionStatus = () => ({
  isOnline,
  persistenceEnabled,
  hasPendingWrites: hasPendingWrites()
});

/**
 * Limpiar listeners (para cleanup)
 */
export const cleanupOfflineListeners = () => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
};

/**
 * Hook de React para estado de conexión
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = React.useState(getConnectionStatus());

  React.useEffect(() => {
    const updateStatus = () => setStatus(getConnectionStatus());

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return status;
};

export default {
  initializeOfflinePersistence,
  forceSyncData,
  hasPendingWrites,
  getConnectionStatus,
  cleanupOfflineListeners
};
