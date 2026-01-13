# 🚀 Sistema de Deployment Automático - ProLogix

## 📋 Resumen

Este sistema automatiza completamente la actualización de la app móvil en los dispositivos de campo.

## ✨ ¿Qué se automatiza?

| Paso | Antes (Manual) | Ahora (Automático) |
|------|---------------|-------------------|
| 1. Compilar APK | ✋ Manual (15 min) | ✅ GitHub Actions |
| 2. Subir a servidor | ✋ Manual | ✅ Firebase Storage |
| 3. Actualizar Firestore | ✋ Manual | ✅ Script automático |
| 4. Instalar en dispositivos | ✋ Manual | ✅ Launcher (1 hora) |

**Resultado**: Solo haces `git push` y TODO sucede automáticamente.

## 🎯 Flujo Completo

```
1. Developer hace cambios en mobile_app_capacitor/
2. git add . && git commit -m "feat: nueva funcionalidad" && git push
3. GitHub Actions detecta el push
4. Compila APK automáticamente (Java + Gradle)
5. Incrementa versionCode automáticamente (1 → 2 → 3...)
6. Calcula checksum SHA-256 del APK
7. Sube APK a Firebase Storage
8. Actualiza Firestore con nueva versión
9. Crea GitHub Release con APK adjunto
10. Launchers detectan nueva versión (cada hora)
11. Descargan e instalan automáticamente
12. ✅ TODOS los dispositivos actualizados sin tocarlos
```

## 📱 Para el Backend y Admin Web

**Ya está funcionando** (si usas Railway/Vercel con auto-deploy):

```bash
# Hacer cambios en backend o admin_web
git add .
git commit -m "fix: Envío de fotos por WhatsApp"
git push origin main

# Railway detecta el push y redeploy automáticamente en ~2 minutos
```

## 📱 Para la App Móvil (NUEVO)

**Ahora también automático**:

```bash
# Hacer cambios en mobile_app_capacitor/src
git add .
git commit -m "feat: Nueva funcionalidad para repartidores"
git push origin main

# GitHub Actions:
# - Compila APK (~10 min)
# - Sube a Firebase Storage
# - Actualiza Firestore
# - Launchers instalan en ~1 hora

# ✅ Sin tocar un solo dispositivo físicamente
```

## 🔧 Setup Inicial (Una sola vez)

### 1. Crear Service Account en Firebase

1. [Firebase Console](https://console.firebase.google.com/) → Settings → Service Accounts
2. Click "Generate new private key"
3. Guarda el archivo JSON (no lo subas a GitHub!)

### 2. Configurar GitHub Secret

1. GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Value: **TODO el contenido del archivo JSON** (incluye las llaves `{}`)
5. Click "Add secret"

### 3. Habilitar Firebase Storage Rules

Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /launcher-apps/{allPaths=**} {
      allow read: if true;  // Público para descargas
      allow write: if request.auth != null;  // Solo autenticados
    }
  }
}
```

### 4. Verificar Firestore Rules

Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /launcher_config/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🧪 Probar el Sistema

### Opción 1: Hacer un cambio real

```bash
cd mobile_app_capacitor/src/pages
# Editar cualquier archivo...

git add .
git commit -m "test: Probar CI/CD"
git push origin main
```

### Opción 2: Ejecución manual (sin hacer cambios)

1. GitHub → Actions tab
2. Click "Auto-Update Mobile App"
3. Click "Run workflow"
4. Select branch "main"
5. Click "Run workflow"

### Ver el progreso en tiempo real

1. GitHub → Actions
2. Click en el workflow en ejecución
3. Verás cada paso: Build → Upload → Update Firestore → Release

## 📊 Monitoreo

### Ver releases creados

- GitHub → Releases
- Cada build genera un release con:
  - Número de versión
  - APK descargable
  - Checksum SHA-256
  - Changelog automático

### Ver logs del launcher

```bash
# En el dispositivo con el launcher
adb logcat | grep AppManagementService

# Deberías ver:
# 🔍 Iniciando chequeo de apps...
# 📱 Verificando: ProLogix Repartidor
# 📥 Nueva versión disponible: v2 (actual: v1)
# 📥 Descargando APK...
# ✅ Instalación completada
```

### Verificar Firestore se actualizó

Firebase Console → Firestore → `launcher_config/apps_config`:

```json
{
  "apps": [{
    "versionCode": 2,  // ← Se incrementó automáticamente
    "downloadUrl": "https://storage.googleapis.com/...",
    "checksum": "sha256:...",
    "lastUpdated": "2026-01-13T..."
  }],
  "lastUpdated": "2026-01-13T...",
  "updatedBy": "GitHub Actions CI/CD"
}
```

## ⚡ Ventajas del Sistema

✅ **Zero Touch**: Nunca más conectar dispositivos por USB
✅ **Rollout Gradual**: Dispositivos actualizan en ~1 hora (evita bugs masivos)
✅ **Validación**: Checksum SHA-256 previene archivos corruptos
✅ **Historial**: GitHub Releases mantiene todas las versiones
✅ **Reversible**: Cambiar Firestore a versión anterior = rollback instantáneo
✅ **Escalable**: Funciona con 1 dispositivo o 1000
✅ **Logs completos**: GitHub Actions + Launcher logs = debugging fácil

## 🐛 Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT secret not found"

**Solución**: Agregar el secret en GitHub (ver Setup Inicial)

### Error: "Permission denied" al subir a Firebase Storage

**Solución**: Verificar que el Service Account tenga permisos de Storage Admin en Firebase Console → Settings → Service Accounts

### Error: "Gradle build failed"

**Solución**: Verificar que `mobile_app_capacitor/android` compile localmente:
```bash
cd mobile_app_capacitor/android
./gradlew assembleRelease
```

### Los launchers no detectan la actualización

**Verificar**:
1. Firestore se actualizó correctamente (Firebase Console)
2. El launcher está corriendo (no forzado a cerrar)
3. El dispositivo tiene conexión a internet
4. Forzar check manual: Menú admin → "Verificar Actualizaciones"

### Error: "versionCode not found"

**Solución**: Verificar que `mobile_app_capacitor/android/app/build.gradle` tenga:
```gradle
android {
    defaultConfig {
        versionCode 1
        versionName "1.0.0"
    }
}
```

## 🔄 Rollback (Volver a Versión Anterior)

Si una actualización causa problemas:

### Opción 1: Rollback en Firestore (Instantáneo)

1. Firebase Console → Firestore → `launcher_config/apps_config`
2. Editar `apps[0]`:
   ```json
   {
     "versionCode": 1,  // ← Versión anterior
     "downloadUrl": "URL de la versión anterior",
     "checksum": "checksum de la versión anterior"
   }
   ```
3. Guardar
4. Launchers detectarán la "actualización" a la versión anterior

### Opción 2: Revertir commit en GitHub

```bash
git revert HEAD
git push origin main
# Se compilará nuevamente con los cambios revertidos
```

## 📈 Escalar a Múltiples Apps

Para gestionar múltiples apps (ej: app de almacén, app de admin):

1. Agregar más entries en `launcher_config/apps_config`:
   ```json
   {
     "apps": [
       {
         "id": "repartidor",
         "packageName": "com.prologix.envios",
         "versionCode": 2,
         "downloadUrl": "..."
       },
       {
         "id": "almacen",
         "packageName": "com.prologix.almacen",
         "versionCode": 1,
         "downloadUrl": "..."
       }
     ]
   }
   ```

2. Crear workflow adicional para cada app:
   - `.github/workflows/auto-update-almacen.yml`
   - Cambiar `paths` para detectar cambios en carpeta específica

## 🎓 Best Practices

### 1. Commits descriptivos
```bash
# ✅ Bueno
git commit -m "feat: Agregar firma digital a entregas"
git commit -m "fix: Resolver crash al abrir cámara offline"

# ❌ Malo
git commit -m "cambios"
git commit -m "fix"
```

### 2. Testear localmente primero
```bash
cd mobile_app_capacitor
npm run build
npx cap sync
cd android
./gradlew assembleRelease
# Si compila localmente, funcionará en CI/CD
```

### 3. Versioning semántico
- `1.0.0` → `1.0.1`: Bugfix
- `1.0.1` → `1.1.0`: Nueva funcionalidad
- `1.1.0` → `2.0.0`: Cambio breaking

Actualizar en `package.json`:
```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.1 → 1.1.0
npm version major  # 1.1.0 → 2.0.0
```

### 4. Monitorear los primeros updates

Después de activar el sistema:
- Ver logs de GitHub Actions (primeras 3 ejecuciones)
- Ver logs de al menos 1 dispositivo durante update
- Verificar Firestore se actualiza correctamente

## 📞 Soporte

Si algo no funciona:

1. **Logs de GitHub Actions**: GitHub → Actions → Click en workflow fallido
2. **Logs del Launcher**: `adb logcat | grep AppManagementService`
3. **Firestore**: Verificar que la config sea correcta
4. **Firebase Storage**: Verificar que el APK se subió

---

**Última actualización**: 2026-01-13
**Sistema implementado por**: Claude AI + ProLogix Team
**Status**: ✅ Listo para producción
