import { google } from "googleapis";
import fs from "fs";

// Carga las credenciales (igual que en los otros archivos)
const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));
const auth = new google.auth.GoogleAuth({
  credentials,
  projectId: credentials.project_id,
  scopes: ["https://www.googleapis.com/auth/androidmanagement"],
});
const androidmanagement = google.androidmanagement({
  version: "v1",
  auth,
});

/**
 * Función para registrar tu APK como una "WebApp" en Google.
 * Esto es necesario para poder instalarlo desde una URL.
 */
async function registrarWebApp(enterpriseName) {
  try {
    console.log("🧩 Registrando tu APK como WebApp en Google...");
    
    const response = await androidmanagement.enterprises.webApps.create({
      parent: enterpriseName,
      requestBody: {
        // El título que se verá en el teléfono
        title: "App Repartidor", 
        
        // La URL de tu APK en GitHub
        startUrl: "https://github.com/franlys/apk-host-repartidor/releases/download/v1.0.0.2/mobile_app.1.apk",
        
        // Cómo se debe mostrar (standalone = app normal)
        displayMode: "STANDALONE", 
      },
    });

    console.log("✅ ¡WebApp registrada exitosamente!");
    console.log("Este es el 'name' (guárdalo):", response.data.name);
    
    // ESTO ES LO MÁS IMPORTANTE
    console.log("👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇👇");
    console.log("COPIA ESTE 'packageName' y pégalo en tu policyBase.js:");
    console.log(response.data.name.split("/").pop()); // Extrae el 'packageName'
    console.log("👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆");

  } catch (error) {
    const googleError = error.response?.data?.error?.message || error.message;
    console.error("❌ Error registrando la WebApp:", googleError);
  }
}

// Tomar el enterpriseName desde la terminal
const enterpriseName = process.argv[2]; 
if (!enterpriseName) {
  console.error("❌ Debes pasar tu enterpriseName. Ej: node registrarApp.js enterprises/LC0xxxxxxx");
} else {
  registrarWebApp(enterpriseName);
}