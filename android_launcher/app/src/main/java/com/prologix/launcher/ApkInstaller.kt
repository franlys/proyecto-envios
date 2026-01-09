package com.prologix.launcher

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import java.io.File

class ApkInstaller(private val context: Context) {

    fun downloadAndInstall(url: String, fileName: String) {
        val destination = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName)
        
        if (destination.exists()) {
            destination.delete()
        }

        val request = DownloadManager.Request(Uri.parse(url))
            .setTitle("Descargando $fileName")
            .setDescription("Actualizando aplicación...")
            .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)

        val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val downloadId = downloadManager.enqueue(request)

        // Registrar receiver para cuando termine la descarga
        val onComplete = object : BroadcastReceiver() {
            override fun onReceive(ctxt: Context, intent: Intent) {
                if (downloadId == intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)) {
                    context.unregisterReceiver(this)
                    installApk(destination)
                }
            }
        }
        context.registerReceiver(onComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        Toast.makeText(context, "Descargando actualización...", Toast.LENGTH_SHORT).show()
    }

    private fun installApk(file: File) {
        try {
            val validCtype = "application/vnd.android.package-archive"
            val uri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.packageName + ".provider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW)
            intent.setDataAndType(uri, validCtype)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            context.startActivity(intent)
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Error al instalar: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
