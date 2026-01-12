// ============================================================================
// SERVICIO DE RED - Capacitor Network Plugin
// ============================================================================
// Detección robusta de conectividad con eventos nativos

import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

class NetworkService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.listeners = [];
    this.currentStatus = {
      connected: navigator.onLine,
      connectionType: 'unknown'
    };
    this.isInitialized = false;
  }

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================

  /**
   * Inicializar el servicio
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Obtener status inicial
      if (this.isNative) {
        const status = await Network.getStatus();
        this.currentStatus = {
          connected: status.connected,
          connectionType: status.connectionType
        };
        console.log('📡 Network Service (Native):', this.currentStatus);
      } else {
        this.currentStatus = {
          connected: navigator.onLine,
          connectionType: navigator.onLine ? 'wifi' : 'none'
        };
        console.log('📡 Network Service (Web):', this.currentStatus);
      }

      // Configurar listeners
      this.setupListeners();
      this.isInitialized = true;

    } catch (error) {
      console.error('❌ Error inicializando Network Service:', error);
      // Fallback a navigator.onLine
      this.currentStatus.connected = navigator.onLine;
    }
  }

  // ==========================================================================
  // LISTENERS
  // ==========================================================================

  /**
   * Configurar event listeners
   */
  setupListeners() {
    if (this.isNative) {
      // Native: Usar Capacitor Network plugin
      Network.addListener('networkStatusChange', (status) => {
        console.log('📡 Network status changed (Native):', status);

        const wasConnected = this.currentStatus.connected;
        this.currentStatus = {
          connected: status.connected,
          connectionType: status.connectionType
        };

        // Notificar a listeners si cambió el estado de conexión
        if (wasConnected !== status.connected) {
          this.notifyListeners(this.currentStatus);
        }
      });
    } else {
      // Web: Usar window events
      window.addEventListener('online', () => {
        console.log('📡 Network online (Web)');
        this.currentStatus.connected = true;
        this.currentStatus.connectionType = 'wifi';
        this.notifyListeners(this.currentStatus);
      });

      window.addEventListener('offline', () => {
        console.log('📡 Network offline (Web)');
        this.currentStatus.connected = false;
        this.currentStatus.connectionType = 'none';
        this.notifyListeners(this.currentStatus);
      });
    }
  }

  // ==========================================================================
  // API PÚBLICA
  // ==========================================================================

  /**
   * Verificar si hay conexión
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    if (this.isNative) {
      try {
        const status = await Network.getStatus();
        return status.connected;
      } catch (error) {
        console.warn('⚠️ Error checking network status, fallback to navigator.onLine');
        return navigator.onLine;
      }
    }
    return navigator.onLine;
  }

  /**
   * Obtener status completo de la red
   * @returns {Promise<Object>}
   */
  async getStatus() {
    if (this.isNative) {
      try {
        return await Network.getStatus();
      } catch (error) {
        console.warn('⚠️ Error getting network status');
        return {
          connected: navigator.onLine,
          connectionType: 'unknown'
        };
      }
    }
    return {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none'
    };
  }

  /**
   * Obtener tipo de conexión
   * @returns {string} 'wifi' | 'cellular' | 'none' | 'unknown'
   */
  getConnectionType() {
    return this.currentStatus.connectionType;
  }

  /**
   * Verificar si está en WiFi
   * @returns {boolean}
   */
  isWiFi() {
    return this.currentStatus.connectionType === 'wifi';
  }

  /**
   * Verificar si está en datos móviles
   * @returns {boolean}
   */
  isCellular() {
    return this.currentStatus.connectionType === 'cellular';
  }

  // ==========================================================================
  // SUSCRIPCIONES
  // ==========================================================================

  /**
   * Agregar listener para cambios de red
   * @param {Function} callback - (status) => void
   * @returns {Function} Función para remover listener
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => this.removeListener(callback);
  }

  /**
   * Remover listener
   * @param {Function} callback
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Notificar a todos los listeners
   * @param {Object} status
   */
  notifyListeners(status) {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('❌ Error en network listener:', error);
      }
    });
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================

  /**
   * Verificar si puede hacer operaciones pesadas (solo WiFi)
   * @returns {boolean}
   */
  canDoHeavyOperations() {
    // Solo permitir uploads/downloads grandes en WiFi
    return this.currentStatus.connected && this.isWiFi();
  }

  /**
   * Obtener descripción legible del estado
   * @returns {string}
   */
  getStatusDescription() {
    if (!this.currentStatus.connected) {
      return 'Sin conexión';
    }

    switch (this.currentStatus.connectionType) {
      case 'wifi':
        return 'WiFi';
      case 'cellular':
        return 'Datos móviles';
      case '2g':
        return 'Datos móviles (2G)';
      case '3g':
        return 'Datos móviles (3G)';
      case '4g':
        return 'Datos móviles (4G)';
      case '5g':
        return 'Datos móviles (5G)';
      default:
        return 'Conectado';
    }
  }
}

// Instancia singleton
export const networkService = new NetworkService();

// Auto-inicializar
networkService.init();

export default networkService;
