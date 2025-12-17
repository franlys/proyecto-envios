import { google } from "googleapis";
import fs from "fs";

console.log("🔍 DIAGNÓSTICO DE CREDENCIALES\n");

try {
  // 1. Verificar que el archivo existe
  console.log("1️⃣ Verificando archivo service-account.json...");
  const fileExists = fs.existsSync("./service-account.json");
  console.log(fileExists ? "   ✅ Archivo encontrado" : "   ❌ Archivo NO encontrado");

  if (!fileExists) {
    console.log("\n❌ ERROR: El archivo service-account.json no existe.");
    process.exit(1);
  }

  // 2. Leer y parsear el archivo
  console.log("\n2️⃣ Leyendo contenido del archivo...");
  const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));
  console.log("   ✅ Archivo JSON válido");

  // 3. Verificar campos requeridos
  console.log("\n3️⃣ Verificando campos requeridos...");
  const requiredFields = [
    "type",
    "project_id",
    "private_key_id",
    "private_key",
    "client_email",
    "client_id"
  ];

  let allFieldsPresent = true;
  requiredFields.forEach(field => {
    const present = !!credentials[field];
    console.log(`   ${present ? "✅" : "❌"} ${field}: ${present ? "OK" : "FALTA"}`);
    if (!present) allFieldsPresent = false;
  });

  if (!allFieldsPresent) {
    console.log("\n❌ ERROR: Faltan campos requeridos en el archivo.");
    process.exit(1);
  }

  // 4. Mostrar información del proyecto
  console.log("\n4️⃣ Información del Service Account:");
  console.log(`   📋 Proyecto: ${credentials.project_id}`);
  console.log(`   📧 Email: ${credentials.client_email}`);
  console.log(`   🔑 Key ID: ${credentials.private_key_id}`);
  console.log(`   🌐 Universe: ${credentials.universe_domain || "googleapis.com"}`);

  // 5. Verificar formato de la private key
  console.log("\n5️⃣ Verificando formato de la private key...");
  const privateKey = credentials.private_key;
  const hasBeginMarker = privateKey.includes("-----BEGIN PRIVATE KEY-----");
  const hasEndMarker = privateKey.includes("-----END PRIVATE KEY-----");
  const hasNewlines = privateKey.includes("\\n");

  console.log(`   ${hasBeginMarker ? "✅" : "❌"} Tiene marcador BEGIN`);
  console.log(`   ${hasEndMarker ? "✅" : "❌"} Tiene marcador END`);
  console.log(`   ${hasNewlines ? "✅" : "❌"} Tiene saltos de línea (\\n)`);

  if (!hasBeginMarker || !hasEndMarker || !hasNewlines) {
    console.log("\n❌ ERROR: Formato de private_key incorrecto.");
    process.exit(1);
  }

  // 6. Verificar hora del sistema
  console.log("\n6️⃣ Verificando hora del sistema...");
  const now = new Date();
  console.log(`   🕐 Hora local: ${now.toLocaleString()}`);
  console.log(`   🌍 Hora UTC: ${now.toISOString()}`);
  console.log(`   ⏱️  Timestamp: ${Math.floor(now.getTime() / 1000)}`);

  // 7. Intentar crear cliente de autenticación
  console.log("\n7️⃣ Creando cliente de autenticación...");
  const auth = new google.auth.GoogleAuth({
    credentials,
    projectId: credentials.project_id,
    scopes: ["https://www.googleapis.com/auth/androidmanagement"],
  });

  console.log("   ✅ Cliente GoogleAuth creado");

  // 8. Obtener Project ID
  console.log("\n8️⃣ Obteniendo Project ID del auth...");
  const projectId = await auth.getProjectId();
  console.log(`   ✅ Project ID obtenido: ${projectId}`);

  // 9. Intentar obtener access token
  console.log("\n9️⃣ Intentando obtener access token...");
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (tokenResponse.token) {
    console.log("   ✅ Access token obtenido exitosamente");
    console.log(`   🔐 Token (primeros 20 chars): ${tokenResponse.token.substring(0, 20)}...`);

    // Mostrar información del token
    const tokenParts = tokenResponse.token.split('.');
    if (tokenParts.length === 3) {
      console.log("   ✅ Token JWT válido (3 partes)");
    }
  } else {
    console.log("   ❌ No se pudo obtener access token");
  }

  // 10. Test final: Crear cliente de Android Management
  console.log("\n🔟 Test final: Creando cliente Android Management...");
  const androidmanagement = google.androidmanagement({
    version: "v1",
    auth,
  });
  console.log("   ✅ Cliente Android Management creado");

  console.log("\n" + "=".repeat(60));
  console.log("✅ DIAGNÓSTICO EXITOSO - CREDENCIALES VÁLIDAS");
  console.log("=".repeat(60));
  console.log("\n💡 Las credenciales están bien configuradas.");
  console.log("   Ahora puedes ejecutar: node generar-url-registro.js\n");

} catch (error) {
  console.log("\n" + "=".repeat(60));
  console.log("❌ ERROR DURANTE EL DIAGNÓSTICO");
  console.log("=".repeat(60));
  console.log("\n📋 Mensaje de error:");
  console.log(`   ${error.message}\n`);

  if (error.response?.data) {
    console.log("📋 Detalles del error:");
    console.log(JSON.stringify(error.response.data, null, 2));
  }

  if (error.stack) {
    console.log("\n📋 Stack trace:");
    console.log(error.stack);
  }

  console.log("\n🔍 Posibles soluciones:\n");
  console.log("1. REGENERAR CREDENCIALES:");
  console.log("   - Ve a Google Cloud Console");
  console.log("   - IAM & Admin → Service Accounts");
  console.log("   - Selecciona tu service account");
  console.log("   - Keys → Add Key → Create New Key → JSON");
  console.log("   - Descarga y reemplaza service-account.json\n");

  console.log("2. VERIFICAR PERMISOS:");
  console.log("   - El service account debe tener rol 'Android Management User'");
  console.log("   - Android Management API debe estar habilitada\n");

  console.log("3. VERIFICAR HORA DEL SISTEMA:");
  console.log("   - Asegúrate de que la hora de tu PC esté correcta");
  console.log("   - JWT usa timestamps y puede fallar si hay desfase\n");

  process.exit(1);
}
