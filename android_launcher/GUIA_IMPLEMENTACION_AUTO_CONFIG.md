# 🚀 Guía de Implementación: Launcher Auto-Configurable

## 📦 Paso 1: Crear Servicio de Gestión de Apps

### `app/src/main/java/com/prologix/launcher/services/AppManagementService.kt`

```kotlin
package com.prologix.launcher.services

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.security.MessageDigest

data class AppConfig(
    val id: String = "",
    val name: String = "",
    val packageName: String = "",
    val downloadUrl: String = "",
    val version: String = "",
    val versionCode: Int = 0,
    val mandatory: Boolean = true,
    val icon: String = "",
    val launchOnStart: Boolean = false,
    val checksum: String = ""
)

data class LauncherConfig(
    val apps: List<AppConfig> = emptyList(),
    val autoUpdate: Boolean = true,
    val updateCheckInterval: Long = 3600000, // 1 hora
    val adminPassword: String = "1234",
    val kioskMode: Boolean = true,
    val allowedPackages: List<String> = emptyList(),
    val homeApp: String = ""
)

class AppManagementService(private val context: Context) {

    private val db = FirebaseFirestore.getInstance()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var config: LauncherConfig? = null

    companion object {
        private const val CONFIG_DOC = "launcher_config/apps_config"
        private const val DOWNLOAD_DIR = "app_downloads"
    }

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    suspend fun initialize() {
        loadConfig()
        if (config?.autoUpdate == true) {
            startPeriodicCheck()
        }
    }

    private suspend fun loadConfig() {
        try {
            val doc = db.document(CONFIG_DOC).get().await()
            config = doc.toObject(LauncherConfig::class.java)
            println("✅ Config cargada: ${config?.apps?.size} apps")
        } catch (e: Exception) {
            println("❌ Error cargando config: ${e.message}")
        }
    }

    // =========================================================================
    // VERIFICACIÓN DE APPS
    // =========================================================================

    suspend fun checkAndUpdateApps(): UpdateResult {
        val result = UpdateResult()

        config?.apps?.forEach { appConfig ->
            val installedVersion = getInstalledVersionCode(appConfig.packageName)

            when {
                installedVersion == null -> {
                    // App no instalada
                    println("📥 ${appConfig.name} no instalada, descargando...")
                    if (downloadAndInstall(appConfig)) {
                        result.installed.add(appConfig.name)
                    } else {
                        result.failed.add(appConfig.name)
                    }
                }
                installedVersion < appConfig.versionCode -> {
                    // Actualización disponible
                    println("🔄 ${appConfig.name} v$installedVersion → v${appConfig.versionCode}")
                    if (downloadAndInstall(appConfig)) {
                        result.updated.add(appConfig.name)
                    } else {
                        result.failed.add(appConfig.name)
                    }
                }
                else -> {
                    // Ya actualizada
                    println("✅ ${appConfig.name} v$installedVersion (actual)")
                    result.upToDate.add(appConfig.name)
                }
            }
        }

        return result
    }

    private fun getInstalledVersionCode(packageName: String): Int? {
        return try {
            val packageInfo: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(packageName, 0)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode
            }
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }
    }

    // =========================================================================
    // DESCARGA E INSTALACIÓN
    // =========================================================================

    private suspend fun downloadAndInstall(appConfig: AppConfig): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // 1. Descargar APK
                val apkFile = downloadApk(appConfig)

                // 2. Validar checksum
                if (appConfig.checksum.isNotEmpty() && !validateChecksum(apkFile, appConfig.checksum)) {
                    println("❌ Checksum inválido para ${appConfig.name}")
                    apkFile.delete()
                    return@withContext false
                }

                // 3. Instalar
                installApk(apkFile, appConfig.packageName)

                true
            } catch (e: Exception) {
                println("❌ Error instalando ${appConfig.name}: ${e.message}")
                e.printStackTrace()
                false
            }
        }
    }

    private fun downloadApk(appConfig: AppConfig): File {
        val downloadDir = File(context.getExternalFilesDir(null), DOWNLOAD_DIR)
        if (!downloadDir.exists()) downloadDir.mkdirs()

        val apkFile = File(downloadDir, "${appConfig.packageName}-${appConfig.versionCode}.apk")

        if (apkFile.exists()) {
            println("📦 APK ya descargada: ${apkFile.path}")
            return apkFile
        }

        println("📥 Descargando ${appConfig.name} desde ${appConfig.downloadUrl}")

        URL(appConfig.downloadUrl).openStream().use { input ->
            FileOutputStream(apkFile).use { output ->
                input.copyTo(output)
            }
        }

        println("✅ Descarga completa: ${apkFile.length()} bytes")
        return apkFile
    }

    private fun validateChecksum(file: File, expectedChecksum: String): Boolean {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8192)
            var bytesRead = input.read(buffer)
            while (bytesRead != -1) {
                digest.update(buffer, 0, bytesRead)
                bytesRead = input.read(buffer)
            }
        }

        val actualChecksum = digest.digest().joinToString("") { "%02x".format(it) }
        val checksumValue = expectedChecksum.substringAfter(":")

        return actualChecksum == checksumValue
    }

    private fun installApk(apkFile: File, packageName: String) {
        // ✅ MÉTODO 1: Device Owner (Silencioso)
        if (isDeviceOwner()) {
            installSilently(apkFile, packageName)
            return
        }

        // ✅ MÉTODO 2: REQUEST_INSTALL_PACKAGES permission
        installWithIntent(apkFile)
    }

    private fun isDeviceOwner(): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isDeviceOwnerApp(context.packageName)
    }

    private fun installSilently(apkFile: File, packageName: String) {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(context, DeviceAdminReceiver::class.java)

        try {
            dpm.installPackage(
                adminComponent,
                Uri.fromFile(apkFile),
                null
            )
            println("✅ Instalación silenciosa iniciada: $packageName")
        } catch (e: Exception) {
            println("❌ Error en instalación silenciosa: ${e.message}")
            e.printStackTrace()
        }
    }

    private fun installWithIntent(apkFile: File) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(
                Uri.fromFile(apkFile),
                "application/vnd.android.package-archive"
            )
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    }

    // =========================================================================
    // AUTO-UPDATE PERIÓDICO
    // =========================================================================

    private fun startPeriodicCheck() {
        scope.launch {
            while (isActive) {
                delay(config?.updateCheckInterval ?: 3600000)
                println("⏰ Verificando actualizaciones periódicas...")
                checkAndUpdateApps()
            }
        }
    }

    fun stopPeriodicCheck() {
        scope.cancel()
    }

    // =========================================================================
    // LAUNCHER DE APPS
    // =========================================================================

    fun launchApp(packageName: String) {
        val intent = context.packageManager.getLaunchIntentForPackage(packageName)
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
            println("🚀 Lanzando app: $packageName")
        } else {
            println("❌ No se pudo lanzar $packageName")
        }
    }

    fun launchHomeApp() {
        config?.homeApp?.let { launchApp(it) }
    }
}

// =========================================================================
// RESULTADO DE ACTUALIZACIÓN
// =========================================================================

data class UpdateResult(
    val installed: MutableList<String> = mutableListOf(),
    val updated: MutableList<String> = mutableListOf(),
    val upToDate: MutableList<String> = mutableListOf(),
    val failed: MutableList<String> = mutableListOf()
) {
    fun hasChanges() = installed.isNotEmpty() || updated.isNotEmpty()

    override fun toString(): String {
        return """
            Instaladas: ${installed.size}
            Actualizadas: ${updated.size}
            Al día: ${upToDate.size}
            Fallidas: ${failed.size}
        """.trimIndent()
    }
}
```

---

## 📱 Paso 2: Integrar en MainActivity

### `app/src/main/java/com/prologix/launcher/MainActivity.kt`

```kotlin
class MainActivity : AppCompatActivity() {

    private lateinit var appManager: AppManagementService
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        appManager = AppManagementService(this)

        // Inicializar y verificar apps
        lifecycleScope.launch {
            initializeApps()
        }

        // Botón admin (oculto, activar con long press en logo)
        binding.logo.setOnLongClickListener {
            showAdminMenu()
            true
        }
    }

    private suspend fun initializeApps() {
        showLoading(true)

        // Cargar configuración
        appManager.initialize()

        // Verificar y actualizar apps
        val result = appManager.checkAndUpdateApps()

        showLoading(false)

        // Mostrar resultado
        if (result.hasChanges()) {
            showUpdateDialog(result)
        } else {
            // Lanzar app principal
            appManager.launchHomeApp()
        }
    }

    private fun showAdminMenu() {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Menú Admin")
        builder.setMessage("Ingrese contraseña:")

        val input = EditText(this)
        input.inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        builder.setView(input)

        builder.setPositiveButton("OK") { _, _ ->
            val password = input.text.toString()
            // TODO: Validar con config.adminPassword
            if (password == "1234") {
                showAdminOptions()
            } else {
                Toast.makeText(this, "Contraseña incorrecta", Toast.LENGTH_SHORT).show()
            }
        }

        builder.setNegativeButton("Cancelar", null)
        builder.show()
    }

    private fun showAdminOptions() {
        val options = arrayOf(
            "🔄 Forzar actualización",
            "📱 Ver apps instaladas",
            "⚙️ Configuración",
            "🚪 Salir de kiosko"
        )

        val builder = AlertDialog.Builder(this)
        builder.setTitle("Admin")
        builder.setItems(options) { _, which ->
            when (which) {
                0 -> forceUpdate()
                1 -> showInstalledApps()
                2 -> openSettings()
                3 -> exitKioskMode()
            }
        }
        builder.show()
    }

    private fun forceUpdate() {
        lifecycleScope.launch {
            showLoading(true)
            val result = appManager.checkAndUpdateApps()
            showLoading(false)
            Toast.makeText(
                this@MainActivity,
                "Actualizadas: ${result.updated.size}",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun showLoading(show: Boolean) {
        binding.progressBar.visibility = if (show) View.VISIBLE else View.GONE
    }

    private fun showUpdateDialog(result: UpdateResult) {
        val message = buildString {
            if (result.installed.isNotEmpty()) {
                append("Instaladas:\n")
                result.installed.forEach { append("✅ $it\n") }
            }
            if (result.updated.isNotEmpty()) {
                append("\nActualizadas:\n")
                result.updated.forEach { append("🔄 $it\n") }
            }
            if (result.failed.isNotEmpty()) {
                append("\nFallidas:\n")
                result.failed.forEach { append("❌ $it\n") }
            }
        }

        AlertDialog.Builder(this)
            .setTitle("Actualización Completa")
            .setMessage(message)
            .setPositiveButton("OK") { _, _ ->
                appManager.launchHomeApp()
            }
            .show()
    }
}
```

---

## 🔐 Paso 3: Permisos en AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permisos para descarga e instalación -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission android:name="android.permission.INSTALL_PACKAGES"
        tools:ignore="ProtectedPermissions" />

    <application
        android:usesCleartextTraffic="true"
        ...>

        <!-- Device Admin Receiver -->
        <receiver
            android:name=".DeviceAdminReceiver"
            android:permission="android.permission.BIND_DEVICE_ADMIN">
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin" />
            <intent-filter>
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
            </intent-filter>
        </receiver>

    </application>
</manifest>
```

---

## 🎯 Paso 4: Configurar Firebase

1. Ir a Firebase Console
2. Crear colección `launcher_config`
3. Crear documento `apps_config`
4. Agregar configuración inicial:

```javascript
{
  apps: [
    {
      id: "prologix_repartidor",
      name: "ProLogix Repartidor",
      packageName: "com.prologix.envios",
      downloadUrl: "https://tu-servidor.com/apks/prologix-repartidor-v1.2.0.apk",
      version: "1.2.0",
      versionCode: 3,
      mandatory: true,
      launchOnStart: true,
      checksum: "sha256:calcular_con_sha256sum"
    }
  ],
  launcherConfig: {
    autoUpdate: true,
    updateCheckInterval: 3600000,
    adminPassword: "tu_password_seguro",
    kioskMode: true,
    homeApp: "com.prologix.envios"
  }
}
```

---

## 📤 Paso 5: Subir APKs a Servidor

### Opción A: Vercel/Netlify (Public folder)

```bash
# admin_web/public/apks/
admin_web/
└── public/
    └── apks/
        ├── prologix-repartidor-v1.2.0.apk
        ├── prologix-cargador-v1.1.0.apk
        └── checksums.txt

# URL resultante:
# https://tu-dominio.vercel.app/apks/prologix-repartidor-v1.2.0.apk
```

### Opción B: Firebase Storage

```bash
# Subir a Firebase Storage
firebase storage:upload \
  app-release.apk \
  /apks/prologix-repartidor-v1.2.0.apk

# Obtener URL pública
firebase storage:get-url /apks/prologix-repartidor-v1.2.0.apk
```

---

## 🔄 Workflow de Actualización

### Para actualizar app en todos los dispositivos:

1. **Build nueva APK**:
```bash
cd mobile_app_capacitor/android
./gradlew assembleRelease
```

2. **Calcular checksum**:
```bash
sha256sum app-release.apk
# Output: abc123def456... app-release.apk
```

3. **Subir a servidor**:
```bash
# Renombrar
mv app-release.apk prologix-repartidor-v1.3.0.apk

# Subir a Vercel public folder o Firebase Storage
cp prologix-repartidor-v1.3.0.apk ../../admin_web/public/apks/
```

4. **Actualizar Firebase**:
```javascript
// En Firebase Console o con script
{
  id: "prologix_repartidor",
  version: "1.3.0", // ← Cambiar
  versionCode: 4,   // ← Incrementar
  downloadUrl: "https://tu-servidor.com/apks/prologix-repartidor-v1.3.0.apk", // ← Actualizar
  checksum: "sha256:abc123def456..." // ← Nuevo checksum
}
```

5. **✅ Launchers actualizan automáticamente**:
   - Próxima verificación periódica (1 hora)
   - O forzar con menú admin

---

## 🎛️ Panel Admin Web (Futuro)

Crear página para gestionar sin tocar Firebase:

```javascript
// admin_web/src/pages/LauncherConfig.jsx

function LauncherConfig() {
  const [apps, setApps] = useState([]);

  const uploadNewApk = async (file, appId) => {
    // 1. Subir a Firebase Storage
    const downloadUrl = await uploadToStorage(file);

    // 2. Calcular checksum
    const checksum = await calculateChecksum(file);

    // 3. Incrementar versionCode
    const newVersionCode = apps.find(a => a.id === appId).versionCode + 1;

    // 4. Actualizar Firebase
    await updateFirebaseConfig(appId, {
      downloadUrl,
      checksum,
      versionCode: newVersionCode
    });

    // ✅ Listo! Todos los launchers se actualizarán
  };

  return (
    <div>
      <h1>Gestión de Launcher</h1>
      {apps.map(app => (
        <AppCard
          key={app.id}
          app={app}
          onUpdate={(file) => uploadNewApk(file, app.id)}
        />
      ))}
    </div>
  );
}
```

---

¿Quieres que:
1. **Implemente el código completo** en tu launcher actual
2. **Cree el panel admin web** para gestionar apps
3. **Configure Firebase** con la estructura
4. **Otra cosa**?