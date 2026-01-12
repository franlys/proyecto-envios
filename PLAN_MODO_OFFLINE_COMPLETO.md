# 🔌 Plan Completo: Modo Offline para App Móvil

## 📊 Estado Actual vs Estado Objetivo

### ❌ **Estado Actual (Limitaciones)**
```
mobile_app_capacitor/
└── www/index.html  →  Redirige a https://proyecto-envios.vercel.app
                        ↓
                    Requiere conexión SIEMPRE para cargar
                        ↓
                    No funciona offline sin primera carga
```

**Problemas identificados:**
1. ✅ Firebase offline persistence ESTÁ implementado (IndexedDB)
2. ✅ Detección de conectividad ESTÁ implementada
3. ✅ Indicadores visuales ESTÁN implementados
4. ❌ **PROBLEMA PRINCIPAL**: App es un redirect, no un bundle local
5. ❌ Sin Service Worker para cachear assets
6. ❌ Sin PWA manifest
7. ❌ Sin almacenamiento nativo (Capacitor Storage)

### ✅ **Estado Objetivo**
- App funciona 100% offline después de primera instalación
- Datos críticos (rutas, paquetes) se sincronizan automáticamente
- Operaciones offline se guardan en cola y se envían al reconectar
- Service Worker cachea todos los assets (JS, CSS, imágenes)
- PWA completo que funciona en web Y en app nativa

---

## 🎯 Estrategia de Implementación (3 Fases)

### **FASE 1: PWA + Service Worker** (Esencial)
**Objetivo**: Cachear toda la aplicación para funcionar offline

**Ventajas:**
- Funciona en web (Chrome mobile) SIN instalar app
- También funciona en Capacitor
- Estándar web (no vendor lock-in)
- Cachea assets automáticamente

**Implementación:**

#### 1. Instalar Workbox (Service Worker framework)
```bash
cd admin_web
npm install workbox-webpack-plugin workbox-core workbox-routing workbox-strategies workbox-precaching --save
```

#### 2. Configurar Vite para generar Service Worker
```javascript
// admin_web/vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ProLogix - Sistema de Envíos',
        short_name: 'ProLogix',
        description: 'Sistema de gestión de envíos y logística',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutos
              }
            }
          }
        ]
      }
    })
  ]
})
```

#### 3. Registrar Service Worker
```javascript
// admin_web/src/main.jsx
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva versión disponible. ¿Recargar?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App lista para funcionar offline')
  }
})
```

#### 4. Crear PWA Manifest
```json
// admin_web/public/manifest.json
{
  "name": "ProLogix - Sistema de Envíos",
  "short_name": "ProLogix",
  "description": "Sistema de gestión de envíos y logística",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icon-96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icon-128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icon-144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "productivity", "logistics"],
  "shortcuts": [
    {
      "name": "Nueva Recolección",
      "url": "/recolecciones/nueva",
      "icons": [{ "src": "/icon-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Mis Rutas",
      "url": "/repartidor/rutas",
      "icons": [{ "src": "/icon-96.png", "sizes": "96x96" }]
    }
  ]
}
```

---

### **FASE 2: Capacitor Storage Plugin** (Datos Críticos)
**Objetivo**: Almacenar datos críticos en storage nativo (más rápido y confiable que IndexedDB)

**Ventajas:**
- Storage nativo de Android/iOS
- Más rápido que IndexedDB
- Mejor para datos pequeños (configuración, token, última ruta)
- Funciona aunque el WebView crashee

**Implementación:**

#### 1. Instalar plugin
```bash
cd mobile_app_capacitor
npm install @capacitor/preferences
npx cap sync
```

#### 2. Crear servicio de storage híbrido
```javascript
// admin_web/src/services/storageService.js
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const storageService = {
  // Guardar dato
  async setItem(key, value) {
    if (isNative) {
      await Preferences.set({ key, value: JSON.stringify(value) });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  },

  // Obtener dato
  async getItem(key) {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } else {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  },

  // Eliminar dato
  async removeItem(key) {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  // Limpiar todo
  async clear() {
    if (isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  }
};

// Datos críticos a almacenar:
export const STORAGE_KEYS = {
  USER_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  CURRENT_ROUTE: 'current_route',
  PENDING_DELIVERIES: 'pending_deliveries',
  OFFLINE_QUEUE: 'offline_queue',
  LAST_SYNC: 'last_sync_timestamp',
  COMPANY_DATA: 'company_data'
};
```

#### 3. Usar en componentes
```javascript
// Ejemplo: Guardar ruta actual del repartidor
import { storageService, STORAGE_KEYS } from '@/services/storageService';

// Guardar
await storageService.setItem(STORAGE_KEYS.CURRENT_ROUTE, {
  id: 'ruta-123',
  deliveries: [...],
  startedAt: Date.now()
});

// Recuperar (incluso offline)
const currentRoute = await storageService.getItem(STORAGE_KEYS.CURRENT_ROUTE);
```

---

### **FASE 3: Cola de Operaciones Offline** (Sincronización)
**Objetivo**: Guardar operaciones offline y sincronizar al reconectar

**Ventajas:**
- Repartidor puede marcar entregas offline
- Datos se sincronizan automáticamente
- No se pierde información

**Implementación:**

#### 1. Crear servicio de cola offline
```javascript
// admin_web/src/services/offlineQueueService.js
import { storageService, STORAGE_KEYS } from './storageService';
import { db } from '@/config/firebase';

class OfflineQueueService {
  constructor() {
    this.queue = [];
    this.isSyncing = false;
  }

  // Inicializar (cargar cola del storage)
  async init() {
    const savedQueue = await storageService.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    this.queue = savedQueue || [];
    console.log(`📦 Cola offline cargada: ${this.queue.length} operaciones pendientes`);
  }

  // Agregar operación a la cola
  async addOperation(operation) {
    const op = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      ...operation
    };

    this.queue.push(op);
    await this.saveQueue();
    console.log('➕ Operación agregada a cola offline:', op);

    // Intentar sincronizar inmediatamente si hay conexión
    if (navigator.onLine) {
      this.sync();
    }
  }

  // Guardar cola en storage
  async saveQueue() {
    await storageService.setItem(STORAGE_KEYS.OFFLINE_QUEUE, this.queue);
  }

  // Sincronizar cola con el servidor
  async sync() {
    if (this.isSyncing || this.queue.length === 0) return;

    this.isSyncing = true;
    console.log(`🔄 Sincronizando ${this.queue.length} operaciones...`);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Procesar cada operación
    for (let i = 0; i < this.queue.length; i++) {
      const op = this.queue[i];

      try {
        await this.executeOperation(op);
        results.success++;
        // Remover de la cola
        this.queue.splice(i, 1);
        i--;
      } catch (error) {
        console.error('Error sincronizando operación:', op, error);
        results.failed++;
        results.errors.push({ op, error: error.message });
      }
    }

    await this.saveQueue();
    this.isSyncing = false;

    console.log('✅ Sincronización completada:', results);
    return results;
  }

  // Ejecutar una operación específica
  async executeOperation(op) {
    switch (op.type) {
      case 'UPDATE_DELIVERY_STATUS':
        return await this.updateDeliveryStatus(op.data);

      case 'CREATE_RECOLECCION':
        return await this.createRecoleccion(op.data);

      case 'REGISTER_EXPENSE':
        return await this.registerExpense(op.data);

      case 'UPLOAD_PHOTO':
        return await this.uploadPhoto(op.data);

      default:
        throw new Error(`Tipo de operación desconocido: ${op.type}`);
    }
  }

  // Operaciones específicas
  async updateDeliveryStatus({ recoleccionId, status, lat, lng, photo, motivo }) {
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

  async createRecoleccion(data) {
    await db.collection('recolecciones').add(data);
    console.log('✅ Recolección creada');
  }

  async registerExpense(data) {
    await db.collection('gastos').add(data);
    console.log('✅ Gasto registrado');
  }

  async uploadPhoto({ path, base64 }) {
    // Implementar upload a Firebase Storage o tu backend
    console.log('✅ Foto subida');
  }

  // Obtener estadísticas de la cola
  getStats() {
    return {
      total: this.queue.length,
      byType: this.queue.reduce((acc, op) => {
        acc[op.type] = (acc[op.type] || 0) + 1;
        return acc;
      }, {}),
      oldestOperation: this.queue[0]?.timestamp,
      isSyncing: this.isSyncing
    };
  }
}

export const offlineQueue = new OfflineQueueService();
```

#### 2. Hook para usar la cola
```javascript
// admin_web/src/hooks/useOfflineQueue.js
import { useState, useEffect } from 'react';
import { offlineQueue } from '@/services/offlineQueueService';

export const useOfflineQueue = () => {
  const [stats, setStats] = useState(offlineQueue.getStats());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Actualizar stats cada 5 segundos
    const interval = setInterval(() => {
      setStats(offlineQueue.getStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const addOperation = async (type, data) => {
    await offlineQueue.addOperation({ type, data });
    setStats(offlineQueue.getStats());
  };

  const syncNow = async () => {
    setIsSyncing(true);
    const results = await offlineQueue.sync();
    setStats(offlineQueue.getStats());
    setIsSyncing(false);
    return results;
  };

  return {
    stats,
    isSyncing,
    addOperation,
    syncNow,
    hasPendingOperations: stats.total > 0
  };
};
```

#### 3. Uso en componente de repartidor
```javascript
// Ejemplo: Marcar entrega como completada (funciona offline)
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

function RepartidorEntrega({ recoleccionId }) {
  const { addOperation, stats } = useOfflineQueue();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const marcarEntregada = async () => {
    // Agregar a la cola (funciona online y offline)
    await addOperation('UPDATE_DELIVERY_STATUS', {
      recoleccionId,
      status: 'entregada',
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      timestamp: Date.now()
    });

    toast.success(
      isOnline
        ? 'Entrega marcada y sincronizada'
        : 'Entrega guardada. Se sincronizará al reconectar.'
    );
  };

  return (
    <div>
      <button onClick={marcarEntregada}>
        Marcar Entregada
      </button>

      {stats.total > 0 && (
        <div className="bg-yellow-100 p-2 rounded">
          ⚠️ {stats.total} operaciones pendientes de sincronizar
        </div>
      )}
    </div>
  );
}
```

---

### **FASE 4: Network Plugin** (Detección Nativa Mejorada)
**Objetivo**: Detección nativa de conectividad más precisa que browser events

**Implementación:**

#### 1. Instalar plugin
```bash
cd mobile_app_capacitor
npm install @capacitor/network
npx cap sync
```

#### 2. Servicio de conectividad mejorado
```javascript
// admin_web/src/services/networkService.js
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

class NetworkService {
  constructor() {
    this.isOnline = true;
    this.networkType = 'unknown';
    this.listeners = [];
  }

  async init() {
    if (isNative) {
      // Usar plugin nativo
      const status = await Network.getStatus();
      this.isOnline = status.connected;
      this.networkType = status.connectionType;

      Network.addListener('networkStatusChange', status => {
        this.isOnline = status.connected;
        this.networkType = status.connectionType;
        this.notifyListeners(status);
      });
    } else {
      // Usar browser events
      this.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners({ connected: true });
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners({ connected: false });
      });
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  notifyListeners(status) {
    this.listeners.forEach(cb => cb(status));
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      networkType: this.networkType,
      isWifi: this.networkType === 'wifi',
      isCellular: this.networkType === 'cellular',
      hasGoodConnection: this.isOnline && (this.networkType === 'wifi' || this.networkType === 'cellular')
    };
  }
}

export const networkService = new NetworkService();
```

---

## 📱 Arquitectura Final Offline-First

```
┌─────────────────────────────────────────────────────┐
│              CAPACITOR APP (Nativa)                 │
│  ┌────────────────────────────────────────────┐    │
│  │         React App (bundled local)          │    │
│  │                                             │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │    Service Worker (PWA)              │  │    │
│  │  │  - Cachea assets (JS, CSS, imgs)     │  │    │
│  │  │  - Cachea API responses              │  │    │
│  │  │  - Responde offline                  │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  │                                             │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │  IndexedDB (Firebase Persistence)    │  │    │
│  │  │  - Recolecciones cacheadas           │  │    │
│  │  │  - Rutas cacheadas                   │  │    │
│  │  │  - Usuarios cacheados                │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  │                                             │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │  Capacitor Storage (Nativo)          │  │    │
│  │  │  - Token de autenticación            │  │    │
│  │  │  - Configuración de usuario          │  │    │
│  │  │  - Última ruta activa                │  │    │
│  │  │  - Cola de operaciones offline       │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  │                                             │    │
│  │  ┌──────────────────────────────────────┐  │    │
│  │  │  Offline Queue Service               │  │    │
│  │  │  - Guarda operaciones pendientes     │  │    │
│  │  │  - Auto-sync al reconectar           │  │    │
│  │  │  - Retry con backoff                 │  │    │
│  │  └──────────────────────────────────────┘  │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                         ↕️
                  (Solo si online)
                         ↕️
┌─────────────────────────────────────────────────────┐
│                    BACKEND                          │
│  - Firebase Firestore                               │
│  - API REST (Railway)                               │
│  - WhatsApp (Evolution API)                         │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Plan de Implementación (Prioridades)

### **Sprint 1: PWA + Service Worker** (Esencial - 2-3 días)
**Prioridad:** 🔥 CRÍTICA

**Tareas:**
1. ✅ Instalar `vite-plugin-pwa`
2. ✅ Configurar `vite.config.js` con estrategias de cache
3. ✅ Crear `manifest.json` con iconos
4. ✅ Generar iconos de todos los tamaños (72, 96, 128, 144, 192, 512)
5. ✅ Registrar service worker en `main.jsx`
6. ✅ Modificar `mobile_app_capacitor/www/index.html` para que sirva el bundle local
7. ✅ Build y sync: `npm run build && npx cap copy && npx cap sync`
8. ✅ Probar en modo avión

**Resultado:** App funciona 100% offline después de primera carga

---

### **Sprint 2: Capacitor Storage + Offline Queue** (Importante - 3-4 días)
**Prioridad:** 🟡 ALTA

**Tareas:**
1. ✅ Instalar `@capacitor/preferences`
2. ✅ Crear `storageService.js`
3. ✅ Crear `offlineQueueService.js`
4. ✅ Crear hook `useOfflineQueue.js`
5. ✅ Integrar en componentes de repartidor
6. ✅ Agregar indicadores visuales de sincronización
7. ✅ Testing con operaciones offline

**Resultado:** Repartidores pueden marcar entregas sin conexión

---

### **Sprint 3: Network Plugin + Optimizaciones** (Opcional - 2 días)
**Prioridad:** 🟢 MEDIA

**Tareas:**
1. ✅ Instalar `@capacitor/network`
2. ✅ Crear `networkService.js`
3. ✅ Mejorar detección de conectividad
4. ✅ Agregar estrategias según tipo de red (WiFi vs cellular)
5. ✅ Optimizar sincronización

**Resultado:** Detección más precisa y uso inteligente de datos móviles

---

## 🧪 Testing del Modo Offline

### **Test 1: Primera Carga Offline**
```
1. Instalar app fresca (sin cache)
2. Activar modo avión
3. Abrir app
4. ❌ Debe mostrar: "Necesitas conexión para la primera carga"
```

### **Test 2: Offline después de Primera Carga**
```
1. Abrir app con conexión (carga todo)
2. Activar modo avión
3. Abrir app
4. ✅ Debe funcionar completamente
5. Ver rutas cacheadas
6. Marcar entregas (guardan en cola)
```

### **Test 3: Sincronización al Reconectar**
```
1. Offline: Marcar 3 entregas como completadas
2. Ver badge "3 operaciones pendientes"
3. Reconectar WiFi
4. ✅ Auto-sincronización automática
5. ✅ Badge desaparece
6. ✅ Datos visibles en dashboard web
```

### **Test 4: Pérdida de Conexión Durante Operación**
```
1. Iniciar marcado de entrega
2. Desconectar WiFi a mitad del proceso
3. ✅ Operación debe completarse localmente
4. ✅ Guardar en cola
5. ✅ Sincronizar al reconectar
```

---

## 📊 Comparación: Antes vs Después

| Aspecto | Antes (Actual) | Después (Con Offline) |
|---------|----------------|----------------------|
| **Primera carga sin conexión** | ❌ No funciona | ❌ No funciona (requiere primera carga) |
| **App después de primera carga** | ❌ Requiere conexión | ✅ 100% funcional offline |
| **Ver rutas asignadas** | ❌ Requiere conexión | ✅ Funcionan offline (cacheadas) |
| **Marcar entregas** | ❌ Requiere conexión | ✅ Funciona offline (cola) |
| **Sincronización** | Manual / refresh | ✅ Automática al reconectar |
| **Datos críticos** | Solo IndexedDB | ✅ IndexedDB + Capacitor Storage |
| **Indicadores visuales** | ✅ Ya implementados | ✅ Mejorados con estado de cola |
| **Tamaño app** | ~2MB (redirect) | ~10-15MB (bundle completo) |

---

## 💰 Impacto en Planes

### **Plan Operativo** (50k/mes)
- ✅ Modo offline BÁSICO
- ✅ Cachea rutas y entregas del día actual
- ✅ Cola offline (máximo 50 operaciones)
- ❌ Sin sincronización en background

### **Plan Automatizado** (100k/mes)
- ✅ Modo offline COMPLETO
- ✅ Cachea hasta 30 días de historial
- ✅ Cola offline ilimitada
- ✅ Sincronización en background
- ✅ Retry automático con backoff

### **Plan Smart** (Personalizado)
- ✅ Todo lo anterior +
- ✅ Sincronización inteligente (solo cambios)
- ✅ Compresión de datos
- ✅ Priorización de operaciones críticas

---

## 🎯 Recomendación Final

**Para tu primer cliente (plan operativo + custom features):**

✅ **Implementar:**
1. PWA + Service Worker (Sprint 1) - CRÍTICO
2. Offline Queue básico (Sprint 2 simplificado) - IMPORTANTE

❌ **NO implementar aún:**
3. Network Plugin (puede esperar)
4. Optimizaciones avanzadas (puede esperar)

**Razón:** Con solo Sprint 1 y 2, el repartidor puede:
- Trabajar todo el día sin conexión
- Ver sus rutas y paquetes
- Marcar entregas
- Todo se sincroniza al volver a tener WiFi

**Tiempo de implementación:** 5-7 días
**Complejidad:** Media
**ROI:** Alto (fundamental para operaciones en campo)

---

## 📝 Próximos Pasos

¿Quieres que implemente alguna de estas fases ahora? Te recomiendo empezar con:

1. **PWA + Service Worker** (más impacto, menos complejidad)
2. Luego **Offline Queue** (funcionalidad crítica)
3. Después optimizar según feedback de usuarios

¿Procedemos con Sprint 1 (PWA)?
