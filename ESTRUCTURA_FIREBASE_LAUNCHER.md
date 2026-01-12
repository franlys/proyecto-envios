# 📱 Estructura Firebase para Launcher Auto-Configurable

## Colección: `launcher_config`

### Documento: `apps_config`

```javascript
{
  // Lista de apps que el launcher debe gestionar
  apps: [
    {
      id: "prologix_repartidor",
      name: "ProLogix Repartidor",
      packageName: "com.prologix.envios",
      downloadUrl: "https://tu-servidor.com/apks/prologix-repartidor.apk",
      version: "1.2.0",
      versionCode: 3,
      mandatory: true, // Si es obligatoria o opcional
      icon: "https://tu-servidor.com/icons/repartidor.png",
      launchOnStart: true, // Auto-lanzar al inicio
      checksum: "sha256:abc123..." // Para validar integridad
    },
    {
      id: "prologix_cargador",
      name: "ProLogix Cargador",
      packageName: "com.prologix.cargador",
      downloadUrl: "https://tu-servidor.com/apks/prologix-cargador.apk",
      version: "1.1.0",
      versionCode: 2,
      mandatory: true,
      icon: "https://tu-servidor.com/icons/cargador.png",
      launchOnStart: false
    },
    {
      id: "whatsapp_business",
      name: "WhatsApp Business",
      packageName: "com.whatsapp.w4b",
      downloadUrl: "https://play.google.com/store/apps/details?id=com.whatsapp.w4b",
      version: "auto", // Auto-detectar desde Play Store
      versionCode: 0,
      mandatory: false, // Opcional
      icon: "https://cdn.icon-icons.com/icons2/2397/PNG/512/whatsapp_logo_icon_145109.png",
      playStoreApp: true // Indica que es de Play Store
    }
  ],

  // Configuración del launcher
  launcherConfig: {
    autoUpdate: true,
    updateCheckInterval: 3600000, // 1 hora en ms
    allowUserInstall: false, // Solo admin puede instalar
    adminPassword: "1234", // Password para acciones admin
    kioskMode: true,
    allowedPackages: [ // Apps que pueden abrirse
      "com.prologix.envios",
      "com.prologix.cargador",
      "com.android.settings" // Solo con password admin
    ],
    homeApp: "com.prologix.envios", // App principal
    theme: {
      primaryColor: "#4F46E5",
      backgroundColor: "#F9FAFB",
      logo: "https://tu-servidor.com/logo.png"
    }
  },

  // Metadatos
  lastUpdated: "2026-01-12T20:00:00Z",
  updatedBy: "admin@prologix.com"
}
```

## Ejemplo de Actualización

Cuando actualizas la app de repartidor:

```javascript
// Antes
{
  id: "prologix_repartidor",
  version: "1.2.0",
  versionCode: 3,
  downloadUrl: "https://servidor.com/apks/prologix-repartidor-v1.2.0.apk"
}

// Después (subes nueva APK y actualizas Firebase)
{
  id: "prologix_repartidor",
  version: "1.3.0", // ← Cambias esto
  versionCode: 4,    // ← Y esto
  downloadUrl: "https://servidor.com/apks/prologix-repartidor-v1.3.0.apk" // ← Y esto
}

// ✅ Todos los launchers detectan automáticamente la nueva versión
```

## Flujo de Actualización

```
1. Launcher inicia
2. Lee `launcher_config/apps_config` de Firebase
3. Compara versiones instaladas vs configuradas
4. Si hay diferencias:
   - Descarga nueva APK
   - Valida checksum
   - Instala automáticamente (Device Owner)
5. Muestra notificación "App actualizada a v1.3.0"
```

## Panel Admin (Futuro)

Crear página web admin para actualizar config sin tocar Firebase directamente:

```
admin.prologix.com/launcher-config
├── Apps instaladas
│   ├── ProLogix Repartidor v1.2.0 [Actualizar]
│   ├── ProLogix Cargador v1.1.0 [✓ Actual]
│   └── [+ Agregar nueva app]
├── Subir APK nueva
├── Ver dispositivos activos
└── Forzar actualización remota
```
