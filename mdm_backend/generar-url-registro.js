import { google } from "googleapis";
import fs from "fs";

// ===================================================
// 🔹 SCRIPT PARA GENERAR URL DE REGISTRO ENTERPRISE
// ===================================================
// Este script genera la URL que el administrador debe abrir
// en su navegador para completar el registro de la empresa
// en Android Enterprise (MDM).
//
// IMPORTANTE: Se requiere una cuenta Gmail que NO esté
// asociada a otra gestión de dispositivos Android.
// ===================================================

async function generarURLRegistro() {
  try {
    console.log("🔧 Cargando credenciales de servicio...");

    // Cargar credenciales
    const credentials = JSON.parse(
      fs.readFileSync("./service-account.json", "utf8")
    );

    // Configurar autenticación
    const auth = new google.auth.GoogleAuth({
      credentials,
      projectId: credentials.project_id,
      scopes: ["https://www.googleapis.com/auth/androidmanagement"],
    });

    const androidmanagement = google.androidmanagement({
      version: "v1",
      auth,
    });

    const projectId = await auth.getProjectId();
    console.log("✅ Conectado al proyecto:", projectId);
    console.log("📝 Generando URL de registro...\n");

    // Generar signup URL
    // La callback URL es donde Google redirigirá después del registro
    const response = await androidmanagement.signupUrls.create({
      projectId: projectId,
      callbackUrl: "http://localhost:5080/callback-registro", // Nuestro servidor local
    });

    const signupUrl = response.data.url;
    const completionToken = response.data.name; // Este es el ID para verificar después

    console.log("┌────────────────────────────────────────────────────────────────┐");
    console.log("│  ✅ URL DE REGISTRO GENERADA EXITOSAMENTE                      │");
    console.log("└────────────────────────────────────────────────────────────────┘\n");

    console.log("🔗 PASO 1: Abre esta URL en tu navegador:\n");
    console.log("   " + signupUrl);
    console.log("\n📋 INSTRUCCIONES:\n");
    console.log("   1. Haz clic en el enlace de arriba");
    console.log("   2. Inicia sesión con tu cuenta de Gmail/Workspace");
    console.log("   3. Completa el registro (nombre de empresa, aceptar términos)");
    console.log("   4. Al finalizar, serás redirigido a localhost:5080");
    console.log("   5. El token se procesará automáticamente\n");

    console.log("⚠️  IMPORTANTE:");
    console.log("   - Asegúrate de que el servidor esté corriendo (npm start)");
    console.log("   - Usa una cuenta Gmail que NO esté asociada a otro MDM");
    console.log("   - El token expirará en 30 días si no se usa\n");

    console.log("📌 Completion Token ID (para referencia):");
    console.log("   " + completionToken + "\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("\n❌ ERROR generando URL de registro:");
    console.error("   Mensaje:", error.message);

    if (error.response?.data?.error) {
      console.error("   Detalle:", JSON.stringify(error.response.data.error, null, 2));
    }

    console.error("\n🔍 Posibles causas:");
    console.error("   - Archivo service-account.json no encontrado o inválido");
    console.error("   - API de Android Management no habilitada en Google Cloud");
    console.error("   - Credenciales sin permisos suficientes\n");

    process.exit(1);
  }
}

// Ejecutar
generarURLRegistro();
