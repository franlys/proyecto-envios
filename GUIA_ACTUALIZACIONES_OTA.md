# 📱 Guía de Actualizaciones OTA (Over-The-Air)

## 🎯 ¿Qué son las actualizaciones OTA?

Las actualizaciones **Over-The-Air (OTA)** permiten actualizar el contenido de la app (HTML, CSS, JS) **SIN necesidad de redistribuir la APK** a través de Google Play Store o instalación manual.

---

## 🚀 Métodos de Actualización

### ✅ Método 1: PWA Auto-Update (RECOMENDADO)

**¿Cómo funciona?**
- El Service Worker detecta automáticamente nuevas versiones
- Descarga los archivos actualizados en segundo plano
- Solicita al usuario refrescar la app

**Ventajas:**
- ✅ 100% automático
- ✅ Sin servidores adicionales
- ✅ Gratis
- ✅ Ya implementado en tu proyecto

**Desventajas:**
- ⚠️ Requiere que la app se abra para detectar updates
- ⚠️ No hay control de versiones por empresa

---

### 🔄 Método 2: Capacitor Live Updates (Ionic Appflow)

**¿Qué es?**
- Servicio oficial de Ionic para OTA updates
- Control granular de versiones
- Rollback instantáneo
- Analytics de instalación

**Costo:**
- Plan Starter: Gratis (hasta 10,000 actualizaciones/mes)
- Plan Growth: $499/mes
- Plan Scale: Custom

**Implementación:**
```bash
npm install @ionic/appflow-plugin
```

**Configuración:**
```javascript
// capacitor.config.json
{
  "plugins": {
    "LiveUpdates": {
      "appId": "TU_APP_ID",
      "channel": "production",
      "autoUpdateMethod": "background"
    }
  }
}
```

---

### 🛠️ Método 3: Capacitor Updater (Código Abierto)

**¿Qué es?**
- Plugin open-source para self-hosted updates
- Control total sobre el proceso
- Sin costos de servicio

**Instalación:**
```bash
npm install @capgo/capacitor-updater
```

**Configuración:**
```javascript
// src/services/updaterService.js
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export async function checkForUpdates() {
  const latest = await CapacitorUpdater.download({
    url: 'https://tu-servidor.com/updates/latest.zip',
  });

  await CapacitorUpdater.set(latest);
}
```

---

## 📦 Método PWA (Implementado - RECOMENDADO para ti)

### Tu Configuración Actual

Ya tienes implementado el método PWA en:
- **[vite.config.js](admin_web/vite.config.js)**: Configuración de PWA
- **[main.jsx](admin_web/src/main.jsx)**: Registro de Service Worker

### ¿Cómo Funciona?

1. **Build:** `npm run build` en `admin_web/`
2. **Vite Plugin PWA** genera:
   - `sw.js` (Service Worker)
   - `manifest.webmanifest`
   - Precache de archivos
3. **Capacitor** copia todo a `mobile_app_capacitor/www/`
4. **App Android** sirve los archivos desde `assets/public/`

### ¿Cómo se Actualiza?

#### **En Web (Vercel/Hosting):**
```bash
# 1. Build
cd admin_web
npm run build

# 2. Deploy a Vercel (automático con Git push)
git push origin main

# ✅ Los usuarios web recibirán la actualización automáticamente
```

#### **En Android (APK Instalada):**

**PROBLEMA:**
Los archivos están dentro de la APK en `assets/public/`, **NO se actualizan automáticamente**.

**SOLUCIÓN - Opción A: Actualizar APK completa**

```bash
# 1. Build web
cd admin_web
npm run build

# 2. Copiar a Capacitor
cp -r dist/* ../mobile_app_capacitor/www/

# 3. Sync Capacitor
cd ../mobile_app_capacitor
npx cap sync android

# 4. Build APK
cd android
./gradlew assembleRelease

# 5. Firmar APK (ver sección "Firma de APK" abajo)

# 6. Distribuir APK manualmente o subir a Play Store
```

**SOLUCIÓN - Opción B: Migrar a Remote Assets (Arquivos remotos)**

---

## 🌐 Opción B: Remote Assets (Actualización Real OTA)

### ¿Qué es?

En lugar de servir archivos desde `assets/public/` (interno de la APK), la app carga los archivos desde una URL remota (ej: Vercel).

### Ventajas
- ✅ Actualizaciones instantáneas sin redistribuir APK
- ✅ Usuarios reciben updates automáticamente
- ✅ Un solo deploy (web) actualiza web + mobile

### Desventajas
- ⚠️ Requiere conexión a internet para primera carga
- ⚠️ Puede haber delay en carga inicial
- ⚠️ Cambios en configuración de Capacitor

### Implementación

#### **Paso 1: Configurar Server URL**

```javascript
// capacitor.config.json
{
  "appId": "com.prologix.envios",
  "appName": "ProLogix",
  "webDir": "www",
  "server": {
    "url": "https://tu-dominio.vercel.app",
    "cleartext": true,
    "allowNavigation": [
      "https://tu-dominio.vercel.app",
      "https://*.firebaseapp.com",
      "https://*.googleapis.com"
    ]
  },
  "android": {
    "allowMixedContent": true
  }
}
```

#### **Paso 2: Modificar AndroidManifest.xml**

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
    ...
    android:usesCleartextTraffic="true">

    <meta-data
        android:name="SERVER_URL"
        android:value="https://tu-dominio.vercel.app" />
</application>
```

#### **Paso 3: Build y Deploy**

```bash
# 1. Deploy web a Vercel
cd admin_web
npm run build
# (Git push automático despliega)

# 2. Build APK (solo una vez con nueva config)
cd ../mobile_app_capacitor
npx cap sync android
cd android
./gradlew assembleRelease

# 3. Distribuir APK (SOLO ESTA VEZ)

# ✅ Futuras actualizaciones: Solo deploy web
```

---

## 🔐 Firma de APK para Distribución

### Generar Keystore (Solo la primera vez)

```bash
keytool -genkey -v -keystore prologix-release.keystore \
  -alias prologix \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### Configurar en Gradle

```groovy
// android/app/build.gradle

android {
    ...
    signingConfigs {
        release {
            storeFile file("../../prologix-release.keystore")
            storePassword "TU_PASSWORD"
            keyAlias "prologix"
            keyPassword "TU_PASSWORD"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Build Signed APK

```bash
cd mobile_app_capacitor/android
./gradlew assembleRelease

# APK firmada en:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 📤 Distribución de APK

### Opción 1: Google Play Store (Recomendado)

**Ventajas:**
- Distribución automática
- Actualizaciones gestionadas
- Analytics
- Reviews de usuarios

**Proceso:**
1. Crear cuenta de desarrollador ($25 único)
2. Subir APK a Play Console
3. Completar listing (descripción, screenshots)
4. Publicar

**Actualizaciones:**
```bash
# 1. Incrementar versionCode en build.gradle
# android/app/build.gradle
android {
    defaultConfig {
        ...
        versionCode 2
        versionName "1.1.0"
    }
}

# 2. Build nueva APK
./gradlew assembleRelease

# 3. Subir a Play Console

# ✅ Google distribuye automáticamente a usuarios
```

---

### Opción 2: Distribución Manual (Firebase App Distribution)

**Ventajas:**
- Testing beta gratis
- No requiere Play Store
- Control de quién instala

**Instalación:**
```bash
npm install -g firebase-tools
firebase login
```

**Distribución:**
```bash
# Subir APK a Firebase
firebase appdistribution:distribute \
  android/app/build/outputs/apk/release/app-release.apk \
  --app TU_FIREBASE_APP_ID \
  --groups "repartidores,testers"

# ✅ Firebase envía notificaciones a instaladores
```

---

### Opción 3: Distribución Directa (APK Download)

**Proceso:**
1. Subir APK a servidor (ej: Vercel /public/prologix.apk)
2. Compartir link de descarga
3. Usuarios instalan manualmente

**Consideraciones:**
- ⚠️ Requiere activar "Instalar desde fuentes desconocidas"
- ⚠️ No hay auto-updates
- ⚠️ Difícil de gestionar con muchos usuarios

---

## 🎯 Nuestra Recomendación para ProLogix

### Setup Inicial (Solo una vez)

**1. Remote Assets + Play Store**
```bash
# Configurar Remote Assets
# (Ver "Opción B: Remote Assets" arriba)

# Build APK firmada
cd mobile_app_capacitor/android
./gradlew assembleRelease

# Subir a Google Play Store
# (Proceso manual en Play Console)
```

### Workflow de Actualizaciones

**Actualización de Contenido (HTML/CSS/JS):**
```bash
# ✅ Solo esto:
cd admin_web
npm run build
git push origin main

# Vercel despliega automáticamente
# ✅ Apps Android se actualizan automáticamente al abrirse
```

**Actualización de Plugins o Config Nativa:**
```bash
# 1. Actualizar código nativo
cd mobile_app_capacitor
npm install @capacitor/nuevo-plugin

# 2. Sync
npx cap sync android

# 3. Incrementar version en build.gradle
# versionCode: 2, versionName: "1.1.0"

# 4. Build APK
cd android
./gradlew assembleRelease

# 5. Subir a Play Store
# (Proceso manual en Play Console)

# ✅ Google distribuye a usuarios en 1-3 días
```

---

## 📊 Comparación de Métodos

| Método | Costo | Complejidad | Auto-Update | Control | Rollback |
|--------|-------|-------------|-------------|---------|----------|
| **PWA Auto (Local)** | Gratis | Baja | ❌ | Bajo | ❌ |
| **PWA + Remote Assets** | Gratis | Media | ✅ | Medio | Manual |
| **Ionic Appflow** | $0-499/mes | Baja | ✅ | Alto | ✅ |
| **Capacitor Updater** | Gratis* | Alta | ✅ | Alto | ✅ |
| **Play Store** | $25 único | Media | ✅ | Medio | Manual |

*Gratis pero requieres tu propio servidor para hosting de updates

---

## 🚨 Casos Especiales

### ¿Qué pasa si un usuario no tiene internet?

**Con Remote Assets:**
- Primera apertura: Necesita internet
- Después: Service Worker cachea todo
- Offline: Funciona perfectamente

**Con Assets Locales (APK):**
- Siempre funciona offline
- Pero no recibe updates sin nueva APK

### ¿Cómo forzar actualización?

**Método 1: Incrementar versión en Service Worker**
```javascript
// vite.config.js
VitePWA({
  workbox: {
    // Cambiar cualquier config fuerza re-download
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  }
})
```

**Método 2: Desde la app**
```javascript
// main.jsx
const updateSW = registerSW({
  onNeedRefresh() {
    // Forzar actualización sin preguntar
    updateSW(true);
  }
});
```

---

## 📝 Checklist de Deployment

### Primera Distribución
- [ ] Configurar Remote Assets en capacitor.config.json
- [ ] Generar keystore para firma
- [ ] Configurar signing en build.gradle
- [ ] Build APK firmada
- [ ] Crear cuenta de Play Store ($25)
- [ ] Subir APK a Play Console
- [ ] Completar listing (nombre, descripción, screenshots)
- [ ] Publicar en Play Store

### Actualizaciones Futuras (Solo Web)
- [ ] Build: `npm run build` en admin_web
- [ ] Deploy: `git push origin main`
- [ ] Vercel despliega automáticamente
- [ ] ✅ Apps móviles se actualizan solas

### Actualizaciones Nativas (Plugins/Config)
- [ ] Modificar código nativo
- [ ] Incrementar versionCode en build.gradle
- [ ] Build APK: `./gradlew assembleRelease`
- [ ] Subir nueva versión a Play Store
- [ ] Esperar aprobación de Google (1-3 días)

---

## 💡 Tips y Mejores Prácticas

### 1. Versionado Semántico
```
versionName: "MAJOR.MINOR.PATCH"
- MAJOR: Cambios incompatibles
- MINOR: Nuevas funcionalidades
- PATCH: Bug fixes

Ejemplos:
1.0.0 → Primera versión
1.1.0 → Nueva feature (offline mode)
1.1.1 → Bug fix
2.0.0 → Cambio arquitectural grande
```

### 2. Testing Before Deploy
```bash
# Siempre testear antes de deploy
cd admin_web
npm run build
npm run preview  # Servidor local de producción

# Abrir en navegador y probar
```

### 3. Rollback de Emergencia
```bash
# Si deploy web tiene bug crítico:
git revert HEAD
git push origin main

# Vercel revierte automáticamente
# Apps móviles vuelven a versión anterior
```

### 4. Logs de Versión
```javascript
// admin_web/src/main.jsx
console.log('🚀 ProLogix v1.2.0 - Build 2025-01-12');
console.log('📦 Service Worker:', navigator.serviceWorker.controller ? 'Active' : 'None');
```

---

## 🎉 Resumen Final

### Tu Mejor Opción: **Remote Assets + Play Store**

**Por qué:**
1. ✅ **Actualizaciones automáticas** para cambios de código web
2. ✅ **Gratis** (solo $25 único de Play Store)
3. ✅ **Usuarios reciben updates** sin reinstalar APK
4. ✅ **Ya tienes PWA implementado** (Service Worker listo)

### Workflow Ideal:

**90% de updates (web):**
```bash
git push origin main
# ✅ Listo, todos actualizados
```

**10% de updates (nativos):**
```bash
./gradlew assembleRelease
# Subir a Play Store
# Esperar 1-3 días aprobación
```

---

## 📞 Soporte

### Recursos:
- **Capacitor Docs**: https://capacitorjs.com/docs
- **PWA Docs**: https://vite-pwa-org.netlify.app/
- **Play Console**: https://play.google.com/console
- **Firebase App Distribution**: https://firebase.google.com/docs/app-distribution

### Troubleshooting:
- **App no actualiza**: Forzar cierre + reabrir
- **Service Worker no registra**: Verificar HTTPS
- **APK no instala**: Verificar firma y permisos

---

**¿Preguntas? Consulta la documentación o pregunta en el equipo.**

Última actualización: 2026-01-12
Versión de la guía: 1.0.0
