// ============================================================================
// SERVICIO DE STORAGE HÍBRIDO
// ============================================================================
// Usa Capacitor Preferences en móvil nativo, localStorage en web
// Proporciona una API unificada para ambos entornos

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

console.log(`📱 Storage Service inicializado en modo: ${isNative ? 'NATIVO' : 'WEB'}`);

// ============================================================================
// KEYS para datos críticos
// ============================================================================
export const STORAGE_KEYS = {
  // Autenticación
  USER_TOKEN: 'auth_token',
  USER_DATA: 'user_data',

  // Repartidor
  CURRENT_ROUTE: 'current_route',
  PENDING_DELIVERIES: 'pending_deliveries',

  // Cola offline
  OFFLINE_QUEUE: 'offline_queue',
  LAST_SYNC: 'last_sync_timestamp',

  // Empresa
  COMPANY_DATA: 'company_data',
  COMPANY_FEATURES: 'company_features',

  // Cache
  CACHED_ROUTES: 'cached_routes',
  CACHED_RECOLECCIONES: 'cached_recolecciones'
};

// ============================================================================
// API del Servicio
// ============================================================================
export const storageService = {
  /**
   * Guardar dato (soporta cualquier tipo JSON-serializable)
   * @param {string} key - Clave
   * @param {any} value - Valor (se convierte a JSON automáticamente)
   */
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);

      if (isNative) {
        await Preferences.set({ key, value: jsonValue });
        console.log(`💾 [NATIVO] Guardado: ${key}`);
      } else {
        localStorage.setItem(key, jsonValue);
        console.log(`💾 [WEB] Guardado: ${key}`);
      }
    } catch (error) {
      console.error(`❌ Error guardando ${key}:`, error);
      throw error;
    }
  },

  /**
   * Obtener dato
   * @param {string} key - Clave
   * @returns {Promise<any|null>} Valor parseado o null si no existe
   */
  async getItem(key) {
    try {
      let jsonValue;

      if (isNative) {
        const { value } = await Preferences.get({ key });
        jsonValue = value;
      } else {
        jsonValue = localStorage.getItem(key);
      }

      if (!jsonValue) {
        return null;
      }

      const parsed = JSON.parse(jsonValue);
      console.log(`📖 [${isNative ? 'NATIVO' : 'WEB'}] Leído: ${key}`);
      return parsed;
    } catch (error) {
      console.error(`❌ Error leyendo ${key}:`, error);
      return null;
    }
  },

  /**
   * Eliminar dato
   * @param {string} key - Clave
   */
  async removeItem(key) {
    try {
      if (isNative) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
      console.log(`🗑️ [${isNative ? 'NATIVO' : 'WEB'}] Eliminado: ${key}`);
    } catch (error) {
      console.error(`❌ Error eliminando ${key}:`, error);
    }
  },

  /**
   * Limpiar todo el storage
   */
  async clear() {
    try {
      if (isNative) {
        await Preferences.clear();
      } else {
        localStorage.clear();
      }
      console.log(`🧹 [${isNative ? 'NATIVO' : 'WEB'}] Storage limpiado`);
    } catch (error) {
      console.error('❌ Error limpiando storage:', error);
    }
  },

  /**
   * Obtener todas las keys almacenadas
   * @returns {Promise<string[]>} Array de keys
   */
  async keys() {
    try {
      if (isNative) {
        const { keys } = await Preferences.keys();
        return keys;
      } else {
        return Object.keys(localStorage);
      }
    } catch (error) {
      console.error('❌ Error obteniendo keys:', error);
      return [];
    }
  },

  /**
   * Verificar si una key existe
   * @param {string} key - Clave
   * @returns {Promise<boolean>}
   */
  async hasItem(key) {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch (error) {
      return false;
    }
  },

  /**
   * Obtener múltiples items a la vez
   * @param {string[]} keys - Array de claves
   * @returns {Promise<Object>} Objeto con key: value
   */
  async getMultiple(keys) {
    const result = {};
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.getItem(key);
      })
    );
    return result;
  },

  /**
   * Guardar múltiples items a la vez
   * @param {Object} items - Objeto con key: value
   */
  async setMultiple(items) {
    await Promise.all(
      Object.entries(items).map(([key, value]) =>
        this.setItem(key, value)
      )
    );
  },

  /**
   * Obtener estadísticas del storage
   * @returns {Promise<Object>}
   */
  async getStats() {
    try {
      const keys = await this.keys();
      const sizes = await Promise.all(
        keys.map(async (key) => {
          const value = await this.getItem(key);
          const size = JSON.stringify(value).length;
          return { key, size };
        })
      );

      const totalSize = sizes.reduce((sum, item) => sum + item.size, 0);

      return {
        totalKeys: keys.length,
        totalSizeBytes: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        items: sizes.sort((a, b) => b.size - a.size) // Ordenar por tamaño desc
      };
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error);
      return null;
    }
  }
};

// ============================================================================
// HELPERS ESPECÍFICOS
// ============================================================================

/**
 * Guardar token de autenticación
 * @param {string} token
 */
export const saveAuthToken = async (token) => {
  await storageService.setItem(STORAGE_KEYS.USER_TOKEN, token);
};

/**
 * Obtener token de autenticación
 * @returns {Promise<string|null>}
 */
export const getAuthToken = async () => {
  return await storageService.getItem(STORAGE_KEYS.USER_TOKEN);
};

/**
 * Eliminar token (logout)
 */
export const clearAuthToken = async () => {
  await storageService.removeItem(STORAGE_KEYS.USER_TOKEN);
};

/**
 * Guardar ruta actual del repartidor
 * @param {Object} route
 */
export const saveCurrentRoute = async (route) => {
  await storageService.setItem(STORAGE_KEYS.CURRENT_ROUTE, {
    ...route,
    savedAt: new Date().toISOString()
  });
};

/**
 * Obtener ruta actual del repartidor
 * @returns {Promise<Object|null>}
 */
export const getCurrentRoute = async () => {
  return await storageService.getItem(STORAGE_KEYS.CURRENT_ROUTE);
};

/**
 * Limpiar ruta actual
 */
export const clearCurrentRoute = async () => {
  await storageService.removeItem(STORAGE_KEYS.CURRENT_ROUTE);
};

// ============================================================================
// MIGRACIÓN desde localStorage legacy
// ============================================================================
/**
 * Migrar datos de localStorage a Capacitor Preferences (solo en primera carga)
 */
export const migrateFromLocalStorage = async () => {
  if (!isNative) return; // Solo en nativo

  console.log('🔄 Iniciando migración desde localStorage...');

  const legacyKeys = ['token', 'user', 'company'];
  let migrated = 0;

  for (const oldKey of legacyKeys) {
    try {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue) {
        // Mapear a nuevas keys
        const newKey = oldKey === 'token' ? STORAGE_KEYS.USER_TOKEN : `legacy_${oldKey}`;
        await storageService.setItem(newKey, JSON.parse(oldValue));
        localStorage.removeItem(oldKey);
        migrated++;
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo migrar ${oldKey}:`, error);
    }
  }

  console.log(`✅ Migración completada: ${migrated} items migrados`);
};

// Auto-migrar en primera carga (si es nativo)
if (isNative) {
  migrateFromLocalStorage();
}

export default storageService;
