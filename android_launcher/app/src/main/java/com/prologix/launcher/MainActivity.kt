package com.prologix.launcher

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.prologix.launcher.adapter.AppAdapter

class MainActivity : AppCompatActivity() {

    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponentName: ComponentName

    // 🛡️ LISTA BLANCA BASE (Apps que SABEMOS que queremos)
    // Se complementará con detección automática (Universal)
    private val baseWhitelist = mutableListOf(
        "com.prologix.app",      // ✅ CORREGIDO: Nombre real de tu App
        "com.prologix.launcher",
        "com.whatsapp",
        "com.waze",
        "com.google.android.apps.maps",
        "com.google.android.apps.mapslite", // ✅ AGREGADO: Maps Go/Lite
        "com.android.chrome",
        "com.android.settings",
        
        // Paquetes conocidos de este dispositivo (Spreadtrum/Unisoc)
        "com.sprd.quickcamera", 
        "com.android.camera2", // ✅ AGREGADO: Cámara detectada en debug
        "com.android.gallery3d",
        "com.android.dialer",
        "com.android.systemui" // Interfaz del sistema
    )
    
    // Lista final que usaremos (Base + Dinámicas)
    private val finalWhitelist = mutableSetOf<String>()

    private var adminClickCount = 0

    // ⬇️ FUNCIÓN PARA ACTUALIZAR MANUALMENTE
    private fun checkForUpdates() {
        val installer = ApkInstaller(this)
        installer.downloadAndInstall(
            "https://github.com/franlys/proyecto-envios/releases/download/v1.0.0/app-debug.apk", 
            "prologix_driver.apk"
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // 1. CONSTRUIR LISTA INTELIGENTE (Detectar Cámara, Teléfono, etc.)
        buildUniversalWhitelist()

        // Configurar Admin
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponentName = ComponentName(this, MyDeviceAdminReceiver::class.java)

        // 🕵️ SECRET MENU
        findViewById<android.widget.TextView>(R.id.titleTextView).setOnClickListener {
            adminClickCount++
            if (adminClickCount >= 5) {
                adminClickCount = 0
                showAdminPinDialog()
            }
        }

        setupAppGrid()

        // 🛡️ CONFIGURACIÓN DE KIOSK (DEVICE OWNER)
        // 🛡️ CONFIGURACIÓN DE KIOSK (DEVICE OWNER)
        // 🛡️ CONFIGURACIÓN DE KIOSK (DEVICE OWNER)
        // ❌ ELIMINADO: El usuario pidió quitar el "Screen Pinning" (Fijar Pantalla).
        // Ahora funcionamos simplemente como el Launcher por Defecto.
        if (devicePolicyManager.isDeviceOwnerApp(packageName)) {
            Toast.makeText(this, "Modo Device Owner Activo (Sin Bloqueo)", Toast.LENGTH_SHORT).show()
        }
    }
    
    // ... (rest of class)



    private fun buildUniversalWhitelist() {
        finalWhitelist.clear()
        finalWhitelist.addAll(baseWhitelist)

        val pm = packageManager
        
        // 📸 BUSCAR CÁMARA DEFAULT
        val cameraIntent = Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
        pm.resolveActivity(cameraIntent, 0)?.activityInfo?.packageName?.let {
            finalWhitelist.add(it)
        }

        // 📞 BUSCAR TELÉFONO DEFAULT
        val dialIntent = Intent(Intent.ACTION_DIAL)
        pm.resolveActivity(dialIntent, 0)?.activityInfo?.packageName?.let {
            finalWhitelist.add(it)
        }

        // 🖼️ BUSCAR GALERÍA (Más difícil, probamos con abrir imagen)
        val galleryIntent = Intent(Intent.ACTION_VIEW).apply { type = "image/*" }
        pm.resolveActivity(galleryIntent, 0)?.activityInfo?.packageName?.let {
            finalWhitelist.add(it)
        }
    }

    private fun showAdminPinDialog() {
        val input = android.widget.EditText(this)
        input.inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Admin Access")
            .setMessage("Ingrese PIN de Administrador")
            .setView(input)
            .setPositiveButton("Entrar") { _, _ ->
                if (input.text.toString() == "1234") { 
                    showAdminOptions()
                } else {
                    Toast.makeText(this, "PIN Incorrecto", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showAdminOptions() {
        val options = arrayOf(
            "🔄 Actualizar Prologix Driver", 
            "🟢 Instalar WhatsApp", 
            "🗺️ Instalar Google Maps",
            "🏠 Configurar Launcher Default", 
            "🔵 Configurar Bluetooth", // Nuevo: Para emparejar impresora
            "🚫 Deshabilitar Launcher Base",
            "🐛 Debug Paquetes (Instalados)",
            "📋 Ver Whitelist (Activa)"
        )
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Menú Administrativo")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> checkForUpdates()
                    1 -> installWhatsApp()
                    2 -> installGoogleMaps()
                    3 -> openHomeSettings()
                    4 -> openBluetoothSettings() // Nuevo
                    5 -> disableSystemLauncher()
                    6 -> showPackageDebug()
                    7 -> showWhitelistDebug()
                }
            }
            .show()
    }

    private fun openBluetoothSettings() {
        try {
            val intent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "No se pudo abrir config. Bluetooth", Toast.LENGTH_SHORT).show()
        }
    }

    private fun disableSystemLauncher() {
        // Intenta deshabilitar los launchers comunes para evitar conflictos
        // Esto requiere ser Device Owner (que ya lo somos)
        val targets = listOf(
            "com.android.launcher3",
            "com.sprd.launcher",  // Spreadtrum
            "com.android.quickstep"
        )
        
        var successCount = 0
        targets.forEach { pkg ->
            try {
                devicePolicyManager.setApplicationHidden(adminComponentName, pkg, true)
                successCount++
            } catch (e: Exception) {
                // Probablemente no existe ese paquete, ignorar
            }
        }
        
        if (successCount > 0) {
            Toast.makeText(this, "Launcher base deshabilitado. Reinicia.", Toast.LENGTH_LONG).show()
        } else {
            Toast.makeText(this, "No se encontró el launcher base para deshabilitar.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun installGoogleMaps() {
        // Enlace genérico para descargar Maps (APKMirror/Uptodown)
        // Nota: Idealmente deberías hospedar este APK en tu propio servidor
        ApkInstaller(this).downloadAndInstall(
            "https://d.apkpure.com/b/APK/com.google.android.apps.maps?version=latest", 
            "maps.apk"
        )
        Toast.makeText(this, "Intentando descargar Maps...", Toast.LENGTH_SHORT).show()
    }

    private fun showWhitelistDebug() {
         androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Whitelist Activa")
            .setMessage(finalWhitelist.joinToString("\n"))
            .setPositiveButton("OK", null)
            .show()
    }

    private fun installWhatsApp() {
        // Enlace directo oficial de WhatsApp
        ApkInstaller(this).downloadAndInstall(
            "https://www.whatsapp.com/android/current/WhatsApp.apk",
            "whatsapp.apk"
        )
    }

    private fun openHomeSettings() {
         try {
            val intent = Intent(android.provider.Settings.ACTION_HOME_SETTINGS)
            startActivity(intent)
        } catch (e: Exception) {
            val intent = Intent(android.provider.Settings.ACTION_SETTINGS)
            startActivity(intent)
        }
    }

    private fun exitKioskMode() {
        stopLockTask()
        openHomeSettings()
        Toast.makeText(this, "Selecciona otro Launcher para salir", Toast.LENGTH_LONG).show()
    }

    override fun onResume() {
        super.onResume()
        // Refrescar lista por si se instaló algo nuevo (Maps, WhatsApp)
        buildUniversalWhitelist()
        setupAppGrid()
    }

    private fun setupAppGrid() {
        val recyclerView = findViewById<RecyclerView>(R.id.appsRecyclerView)
        recyclerView.layoutManager = GridLayoutManager(this, 3)
        
        val launcherApps = getSystemService(Context.LAUNCHER_APPS_SERVICE) as android.content.pm.LauncherApps
        val userHandle = android.os.Process.myUserHandle()
        val pm = packageManager
        
        val appsToShow = mutableListOf<AppInfo>()

        // 🏷️ MAPA DE NOMBRES AMIGABLES
        // Si el sistema nos da "com.android.camera2", nosotros mostramos "Cámara"
        val friendlyLabels = mapOf(
            "com.google.android.apps.mapslite" to "Google Maps",
            "com.google.android.apps.maps" to "Google Maps",
            "com.android.camera2" to "Cámara",
            "com.sprd.quickcamera" to "Cámara",
            "com.sec.android.app.camera" to "Cámara", // Samsung
            "com.android.gallery3d" to "Galería",
            "com.sec.android.gallery3d" to "Galería", // Samsung
            "com.android.dialer" to "Teléfono",
            "com.samsung.android.dialer" to "Teléfono", // Samsung
            "com.android.settings" to "Ajustes",
            "com.android.chrome" to "Chrome",
            "com.whatsapp" to "WhatsApp",
            "com.waze" to "Waze",
            "com.prologix.app" to "Prologix Driver"
        )

        finalWhitelist.forEach { pkg ->
            if (pkg == "com.android.systemui" || pkg == packageName) return@forEach

            var label = friendlyLabels[pkg] ?: pkg // Primero intentamos el nombre amigable
            var icon: android.graphics.drawable.Drawable? = null
            var isInstalled = false
            
            // 1. Intento Principal: LauncherApps
            try {
                val activities = launcherApps.getActivityList(pkg, userHandle)
                if (activities.isNotEmpty()) {
                    if (label == pkg) label = activities[0].label.toString()
                    icon = activities[0].getBadgedIcon(0)
                    isInstalled = true
                }
            } catch (e: Exception) { }

            // 2. FALLBACK ESPECÍFICO
            if (!isInstalled) {
                try {
                    val appInfo = pm.getApplicationInfo(pkg, 0)
                    // Verificar si está habilitada
                    if (appInfo.enabled) {
                         if (label == pkg) label = pm.getApplicationLabel(appInfo).toString()
                         icon = pm.getApplicationIcon(pkg)
                         isInstalled = true
                    }
                } catch (e: Exception) { }
            }
            
            // 3. SOLO AGREGAR SI REALMENTE EXISTE
            if (isInstalled && icon != null) {
                 appsToShow.add(AppInfo(label, pkg, icon))
            } else if (isInstalled && icon == null) {
                // Si existe pero no pudimos cargar icono, usamos genérico
                 try {
                     icon = ContextCompat.getDrawable(this, android.R.drawable.sym_def_app_icon)
                     appsToShow.add(AppInfo(label, pkg, icon!!))
                 } catch(e: Exception) {}
            }
        }
        
        // Eliminar duplicados por Nombre (Ej. si detecta dos Cámaras)
        val uniqueApps = appsToShow.distinctBy { it.name }
        
        // Ordenar y mostrar
        val sortedApps = uniqueApps.sortedBy { it.name }.toMutableList()
        recyclerView.adapter = AppAdapter(sortedApps) { appInfo ->
            launchApp(appInfo.packageName)
        }
    }

    private fun launchApp(packageName: String) {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        if (launchIntent != null) {
            startActivity(launchIntent)
        } else {
            Toast.makeText(this, "Error al abrir App", Toast.LENGTH_SHORT).show()
        }
    }

    // 🔒 BLOQUEAR BOTÓN ATRÁS (BACK)
    @Deprecated("Deprecated in Java")
    @android.annotation.SuppressLint("MissingSuperCall")
    override fun onBackPressed() {
        // No llamamos a super.onBackPressed() para bloquear la acción
    }

    // 🔍 HERRAMIENTA DE DEBUG
    private fun showPackageDebug() {
        val packages = packageManager.getInstalledApplications(0)
            .map { it.packageName }
            .filter { 
                it.contains("camera", ignoreCase = true) || 
                it.contains("gallery", ignoreCase = true) || 
                it.contains("dialer", ignoreCase = true) ||
                it.contains("maps", ignoreCase = true) || // 🗺️ BUSCAR MAPS
                it.contains("prologix", ignoreCase = true) 
            }
            .sorted()
            .joinToString("\n")

        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Debug de Paquetes")
            .setMessage(packages.ifEmpty { "No se encontraron coinciciencias." })
            .setPositiveButton("Cerrar", null)
            .show()
    }
}
