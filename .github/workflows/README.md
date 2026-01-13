# 🚀 CI/CD Automatizado - ProLogix

Este directorio contiene los workflows de GitHub Actions para automatizar el deployment de la aplicación móvil.

## 📋 Setup Inicial (Una sola vez)

### 1. Crear Service Account en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Project Settings → Service Accounts
3. Click "Generate new private key"
4. Guarda el archivo JSON

### 2. Configurar GitHub Secrets

Ve a tu repositorio → Settings → Secrets and variables → Actions

Agrega estos secrets:

#### `FIREBASE_SERVICE_ACCOUNT`
```json
{
  "type": "service_account",
  "project_id": "embarques-7ad6e",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

> **Importante**: Copia TODO el contenido del archivo JSON que descargaste

### 3. Habilitar permisos en Firebase

En Firebase Console:
- **Storage**: Habilitar reglas de escritura para service account
- **Firestore**: Dar permisos de escritura a `launcher_config` collection

```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /launcher_config/{document=**} {
      allow read: if true;
      allow write: if request.auth != null || request.auth.token.firebase.sign_in_provider == 'service_account';
    }
  }
}
```

```javascript
// Storage Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /launcher-apps/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 🔄 Cómo Funciona

### Workflow: `auto-update-app.yml`

**Se ejecuta cuando**:
- Haces push a `main` con cambios en:
  - `mobile_app_capacitor/**`
  - `admin_web/src/**`
  - `admin_web/public/**`
- Manualmente desde GitHub Actions

**Proceso**:
1. 📥 Descarga el código
2. 🔧 Configura Node.js y Android SDK
3. 📦 Instala dependencias
4. 🏗️ Compila la app web (React)
5. 🔄 Sincroniza con Capacitor
6. 📝 **Incrementa automáticamente** el `versionCode`
7. 🔨 Compila el APK de Android
8. 📊 Calcula checksum SHA-256
9. 📤 Sube el APK a Firebase Storage
10. 📝 Actualiza Firestore con la nueva versión
11. 🎉 Crea GitHub Release con el APK

**Resultado**:
- Los launchers detectan la actualización (máx 1 hora)
- Descargan e instalan automáticamente la nueva versión
- Los usuarios NO necesitan hacer nada

## 📱 Flujo de Actualización

```mermaid
graph TD
    A[Developer hace push] --> B[GitHub Actions detecta cambios]
    B --> C[Compila APK automáticamente]
    C --> D[Sube a Firebase Storage]
    D --> E[Actualiza Firestore]
    E --> F[Launchers detectan actualización]
    F --> G[Descargan e instalan APK]
    G --> H[App actualizada en dispositivos]
```

## 🧪 Probar el Workflow

### Opción 1: Push automático
```bash
# Hacer cualquier cambio en la app
cd mobile_app_capacitor/src
# ... editar archivos ...

git add .
git commit -m "feat: Nueva funcionalidad"
git push origin main

# GitHub Actions se ejecuta automáticamente
```

### Opción 2: Ejecución manual
1. Ve a GitHub → Actions
2. Selecciona "Auto-Update Mobile App"
3. Click "Run workflow"
4. Selecciona branch "main"
5. Click "Run workflow"

## 📊 Monitoreo

### Ver el progreso
1. GitHub → Actions
2. Click en el workflow en ejecución
3. Verás cada paso en tiempo real

### Logs importantes
- `Build Release APK`: Ver si la compilación fue exitosa
- `Upload APK to Firebase Storage`: Confirmar que se subió
- `Update Firestore config`: Verificar actualización de BD

## 🔧 Troubleshooting

### Error: "Permission denied" en Firebase
**Solución**: Verificar que el service account tenga permisos en Firebase Console

### Error: "Gradle build failed"
**Solución**: Verificar que `mobile_app_capacitor/android/build.gradle` esté correctamente configurado

### Error: "versionCode not found"
**Solución**: Asegurar que `mobile_app_capacitor/android/app/build.gradle` tenga `versionCode` definido

### Los launchers no actualizan
**Solución**:
1. Verificar que Firestore se actualizó correctamente
2. Verificar logs del launcher: `adb logcat | grep AppManagementService`
3. Forzar actualización desde menú admin del launcher

## 🎯 Ventajas

✅ **Zero configuración manual** después del setup inicial
✅ **Incremento automático** de versiones
✅ **Validación de integridad** con checksums
✅ **Rollout gradual** (launchers actualizan en ~1 hora)
✅ **Historial completo** en GitHub Releases
✅ **Reversible** (puedes volver a versiones anteriores en Firestore)

## 📝 Versioning

El sistema usa **Semantic Versioning**:
- `versionName`: "1.2.3" (en `package.json`)
- `versionCode`: Auto-incrementado en cada build (1, 2, 3...)

Para cambiar la versión mayor/menor:
```bash
cd mobile_app_capacitor
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.1 → 1.1.0
npm version major  # 1.1.0 → 2.0.0
git push --follow-tags
```

## 🔐 Seguridad

- ✅ Service Account credentials encriptados en GitHub Secrets
- ✅ APKs públicos pero con checksum validation
- ✅ Solo el launcher con Device Owner puede instalar
- ✅ Logs de cada actualización en Firestore

---

**Última actualización**: 2026-01-13
**Mantenido por**: ProLogix Development Team
