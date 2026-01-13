# 🚀 Setup CI/CD - Paso a Paso

## ✅ Paso 1: Obtener Service Account de Firebase (5 minutos)

### 1.1 Ir a Firebase Console

Abre: https://console.firebase.google.com/project/embarques-7ad6e/settings/serviceaccounts/adminsdk

### 1.2 Generar nueva clave

1. Click en "Generate new private key"
2. Click "Generate key" en el modal de confirmación
3. Se descargará un archivo JSON (ej: `embarques-7ad6e-firebase-adminsdk-xxxxx.json`)

⚠️ **IMPORTANTE**: NO subas este archivo a GitHub. Es un secreto.

### 1.3 Copiar el contenido del JSON

Abre el archivo descargado en Notepad y copia TODO el contenido (desde `{` hasta `}`).

---

## ✅ Paso 2: Configurar GitHub Secret (2 minutos)

### 2.1 Ir a Settings de tu repositorio

URL: https://github.com/TU_USUARIO/proyecto-envios/settings/secrets/actions

### 2.2 Crear nuevo secret

1. Click en "New repository secret"
2. Name: `FIREBASE_SERVICE_ACCOUNT`
3. Value: Pega TODO el contenido del JSON que copiaste
4. Click "Add secret"

Debería verse así (oculto por seguridad):
```
FIREBASE_SERVICE_ACCOUNT = *********************
```

---

## ✅ Paso 3: Habilitar Firebase Storage Rules (2 minutos)

### 3.1 Ir a Firebase Storage

URL: https://console.firebase.google.com/project/embarques-7ad6e/storage/embarques-7ad6e.firebasestorage.app/rules

### 3.2 Reemplazar las reglas actuales con estas:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Regla para launcher apps
    match /launcher-apps/{allPaths=**} {
      allow read: if true;  // Público para que los launchers puedan descargar
      allow write: if request.auth != null;  // Solo usuarios autenticados pueden subir
    }

    // Otras reglas existentes...
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

---

## ✅ Paso 4: Verificar Firestore Rules (1 minuto)

### 4.1 Ir a Firestore Rules

URL: https://console.firebase.google.com/project/embarques-7ad6e/firestore/rules

### 4.2 Verificar que tengas esto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regla para launcher config
    match /launcher_config/{document=**} {
      allow read: if true;  // Los launchers pueden leer
      allow write: if request.auth != null;  // Solo autenticados pueden escribir
    }

    // Otras reglas existentes...
  }
}
```

Si no lo tienes, agrégalo y click "Publish"

---

## ✅ Paso 5: Commit y Push del CI/CD (1 minuto)

Ahora vamos a activar el sistema:

```bash
cd c:\Users\elmae\proyecto-envios

# Agregar los archivos del CI/CD
git add .github/workflows/auto-update-app.yml
git add DEPLOYMENT_AUTOMATICO.md
git add SETUP_CICD.md

# Commit
git commit -m "feat: Agregar CI/CD automático para actualización de apps"

# Push
git push origin main
```

---

## ✅ Paso 6: Probar el sistema (5 minutos)

### Opción A: Hacer un cambio pequeño

```bash
# Editar algo en la app
cd mobile_app_capacitor/src/pages
# Abre Home.tsx y cambia un texto...

git add .
git commit -m "test: Probar CI/CD"
git push origin main
```

### Opción B: Ejecución manual (sin cambios)

1. Ve a: https://github.com/TU_USUARIO/proyecto-envios/actions
2. Click en "Auto-Update Mobile App" en el sidebar
3. Click en "Run workflow" (botón azul)
4. Select branch: "main"
5. Click "Run workflow"

### 6.1 Monitorear la ejecución

1. Verás el workflow ejecutándose (~10-15 minutos)
2. Cada paso se mostrará en tiempo real:
   - ✅ Build web assets
   - ✅ Sync Capacitor
   - ✅ Build APK
   - ✅ Upload to Firebase Storage
   - ✅ Update Firestore

### 6.2 Verificar que funcionó

#### En GitHub:
- Ve a "Releases" → Deberías ver un nuevo release creado

#### En Firebase Storage:
- Ve a: https://console.firebase.google.com/project/embarques-7ad6e/storage/embarques-7ad6e.firebasestorage.app/files/~2Flauncher-apps
- Deberías ver: `prologix-repartidor-vX.apk`

#### En Firestore:
- Ve a: https://console.firebase.google.com/project/embarques-7ad6e/firestore/data/~2Flauncher_config~2Fapps_config
- Verifica que `apps[0].versionCode` se incrementó
- Verifica que `apps[0].downloadUrl` apunta al nuevo APK

---

## ✅ Paso 7: Verificar que los launchers actualizan (opcional)

Si tienes un dispositivo con el launcher instalado:

```bash
# Conectar dispositivo por USB
adb logcat | grep AppManagementService

# Esperar a ver (máximo 1 hora):
# 🔍 Iniciando chequeo de apps...
# 📥 Nueva versión disponible: vX
# 📥 Descargando APK...
# ✅ Instalación completada
```

O forzar el check manualmente:
1. Abrir el launcher
2. Tocar título 5 veces
3. PIN: 1234
4. Seleccionar "🔄 Verificar Actualizaciones (Firebase)"

---

## 🎉 ¡Listo! Sistema Activado

Ahora cada vez que hagas `git push` con cambios en:
- `mobile_app_capacitor/**`
- `admin_web/src/**`
- `admin_web/public/**`

El sistema compilará, subirá y desplegará automáticamente la nueva versión.

---

## 🐛 Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT not found"

**Solución**: Volver al Paso 2 y verificar que creaste el secret correctamente.

### Error: "Permission denied" en Firebase Storage

**Solución**:
1. Firebase Console → Storage → Rules
2. Verificar que la regla para `launcher-apps/**` permita write con `request.auth != null`
3. Verificar que el Service Account tiene rol "Firebase Admin SDK Administrator Service Agent"

### Error: "Gradle build failed"

**Solución**: El CI/CD usa Java 17 automáticamente, pero si ves este error verifica:
1. Que `mobile_app_capacitor/android/build.gradle` exista
2. Que no haya errores de sintaxis en los archivos Gradle

### El workflow no se ejecuta

**Solución**:
1. GitHub → Actions → Verificar que Actions esté habilitado
2. Verificar que el archivo esté en `.github/workflows/auto-update-app.yml`
3. Hacer un cambio pequeño y push de nuevo

---

## 📞 ¿Necesitas ayuda?

Si algo no funciona:
1. GitHub → Actions → Click en el workflow fallido → Ver logs
2. Buscar el paso que falló (tendrá una ❌ roja)
3. Leer el mensaje de error
4. Consultar este documento para la solución

---

**¡Éxito!** 🚀
