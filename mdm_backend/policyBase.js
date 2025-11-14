import { google } from "googleapis";
import fs from "fs";

// Carga las credenciales de la cuenta de servicio
const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));

// Configura la autenticación de Google
const auth = new google.auth.GoogleAuth({
  credentials,
  projectId: credentials.project_id,
  scopes: ["https://www.googleapis.com/auth/androidmanagement"],
});

const androidmanagement = google.androidmanagement({
  version: "v1",
  auth,
});

export async function crearPolicyBase(enterpriseName) {
  try {
    // ----------------------------------------------------
    //  CAMBIO 1: Creamos una política de prueba
    // ----------------------------------------------------
    const policyName = "policy_test";

    const response = await androidmanagement.enterprises.policies.patch({
      name: `${enterpriseName}/policies/${policyName}`,
      updateMask: "*", // Aplica todos los cambios
      requestBody: {
        applications: [
          // Solo apps públicas para la prueba
          { packageName: "com.whatsapp", installType: "FORCE_INSTALLED" },
          { packageName: "com.android.dialer", installType: "FORCE_INSTALLED" },
          { packageName: "com.android.messaging", installType: "FORCE_INSTALLED" },
          { packageName: "com.android.camera", installType: "FORCE_INSTALLED" },
          
          // ----------------------------------------------------
          //  CAMBIO 2: Tu APK está DESACTIVADA para esta prueba
          // ----------------------------------------------------
          /*
          {
            packageName: "com.google.enterprise.webapp.x9145183fbf6dae79", 
            installType: "FORCE_INSTALLED",
            defaultPermissionPolicy: "GRANT", 
          },
          */
        ],
        
        // --- Restricciones del dispositivo ---
        keyguardDisabled: true, 
        statusBarDisabled: true, 
        
        // Mantenemos tus cambios de USB y Debug
        usbFileTransferDisabled: false, 
        debuggingFeaturesAllowed: true, 
        
        bluetoothConfigDisabled: true, 
        cameraDisabled: false, 
        kioskCustomLauncherEnabled: false, 
        playStoreMode: "BLACKLIST", 
        systemUpdate: { type: "AUTOMATIC" }, 
        passwordRequirements: { passwordMinimumLength: 0 }, 
        defaultPermissionPolicy: "GRANT", 
      },
    });

    console.log(`✅ Política de PRUEBA creada: ${response.data.name}`);
  } catch (error) {
    const googleError = error.response?.data?.error?.message || error.message;
    console.error("❌ Error creando política de prueba:", googleError);
  }
}

// Ejecutar directamente para probar
if (process.argv[2] === "crear") {
  const enterpriseName = process.argv[3]; // Ejemplo: enterprises/LC03abc123
  crearPolicyBase(enterpriseName);
}