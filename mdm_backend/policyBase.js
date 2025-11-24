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
    const policyName = "policy_test";

    const response = await androidmanagement.enterprises.policies.patch({
      name: `${enterpriseName}/policies/${policyName}`,
      updateMask: "*",
      requestBody: {
        applications: [
          { packageName: "com.whatsapp", installType: "FORCE_INSTALLED" },
          { packageName: "com.android.dialer", installType: "FORCE_INSTALLED" },
          { packageName: "com.android.messaging", installType: "FORCE_INSTALLED" },
          { packageName: "com.android.camera", installType: "FORCE_INSTALLED" },
          {
            packageName: "com.google.enterprise.webapp.x0584a28b54e4d851",
            installType: "FORCE_INSTALLED",
            defaultPermissionPolicy: "GRANT",
          },
        ],
        keyguardDisabled: true,
        statusBarDisabled: true,
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

export async function crearPolicyDebug(enterpriseName) {
  try {
    const policyName = "policy_debug";
    console.log("🛠️ Creando política de DEBUG (sin app personalizada)...");

    const response = await androidmanagement.enterprises.policies.patch({
      name: `${enterpriseName}/policies/${policyName}`,
      updateMask: "*",
      requestBody: {
        applications: [
          { packageName: "com.google.android.apps.work.clouddpc", installType: "FORCE_INSTALLED" }
        ],
        debuggingFeaturesAllowed: true,
        usbFileTransferDisabled: false,
        playStoreMode: "BLACKLIST",
      },
    });

    console.log(`✅ Política de DEBUG creada: ${response.data.name}`);
  } catch (error) {
    console.error("❌ Error creando política de debug:", error.message);
  }
}

export async function crearPolicyEmpty(enterpriseName) {
  try {
    const policyName = "policy_empty";
    console.log("🛠️ Creando política VACÍA (sin restricciones)...");

    const response = await androidmanagement.enterprises.policies.patch({
      name: `${enterpriseName}/policies/${policyName}`,
      updateMask: "*",
      requestBody: {
        // Política completamente vacía
      },
    });

    console.log(`✅ Política VACÍA creada: ${response.data.name}`);
  } catch (error) {
    console.error("❌ Error creando política vacía:", error.message);
  }
}

// Ejecutar según argumentos
if (process.argv[2] === "crear") {
  const enterpriseName = process.argv[3];
  crearPolicyBase(enterpriseName);
} else if (process.argv[2] === "debug") {
  const enterpriseName = process.argv[3];
  crearPolicyDebug(enterpriseName);
} else if (process.argv[2] === "empty") {
  const enterpriseName = process.argv[3];
  crearPolicyEmpty(enterpriseName);
}