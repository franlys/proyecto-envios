import fs from "fs";

console.log("🔧 REPARANDO ARCHIVO service-account.json\n");

try {
  // Leer archivo actual
  console.log("1️⃣ Leyendo archivo actual...");
  const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));
  console.log("   ✅ Archivo leído correctamente");

  // Verificar si la private_key necesita reparación
  console.log("\n2️⃣ Verificando private_key...");
  const privateKey = credentials.private_key;

  // Contar cuántos \n literales tiene (deberían ser saltos de línea reales)
  const literalNewlines = (privateKey.match(/\\n/g) || []).length;
  const realNewlines = (privateKey.match(/\n/g) || []).length;

  console.log(`   📊 Saltos de línea literales (\\n): ${literalNewlines}`);
  console.log(`   📊 Saltos de línea reales: ${realNewlines}`);

  if (literalNewlines === 0 && realNewlines > 0) {
    console.log("\n   ✅ La private_key ya está correcta, no necesita reparación.");
    console.log("\n💡 Si aún tienes problemas, intenta:");
    console.log("   1. Descargar nuevas credenciales de Google Cloud Console");
    console.log("   2. Verificar que la hora de tu sistema esté correcta");
    console.log("   3. Verificar que la API de Android Management esté habilitada\n");
    process.exit(0);
  }

  console.log("\n3️⃣ Reparando formato...");

  // Crear backup del archivo original
  const backupPath = "./service-account.json.backup";
  fs.writeFileSync(backupPath, JSON.stringify(credentials, null, 2));
  console.log(`   📦 Backup creado: ${backupPath}`);

  // Reparar la private_key: reemplazar \n literales por saltos de línea reales
  credentials.private_key = privateKey.replace(/\\n/g, '\n');

  console.log("   ✅ Formato reparado");

  // Verificar el resultado
  const repairedKey = credentials.private_key;
  const hasBegin = repairedKey.includes("-----BEGIN PRIVATE KEY-----");
  const hasEnd = repairedKey.includes("-----END PRIVATE KEY-----");
  const hasRealNewlines = repairedKey.includes('\n');

  console.log("\n4️⃣ Verificando reparación...");
  console.log(`   ${hasBegin ? "✅" : "❌"} Tiene marcador BEGIN`);
  console.log(`   ${hasEnd ? "✅" : "❌"} Tiene marcador END`);
  console.log(`   ${hasRealNewlines ? "✅" : "❌"} Tiene saltos de línea reales`);

  if (!hasBegin || !hasEnd || !hasRealNewlines) {
    console.log("\n❌ ERROR: La reparación no fue exitosa.");
    console.log("   Por favor, descarga nuevas credenciales de Google Cloud Console.\n");
    process.exit(1);
  }

  // Guardar archivo reparado
  console.log("\n5️⃣ Guardando archivo reparado...");
  fs.writeFileSync("./service-account.json", JSON.stringify(credentials, null, 2));
  console.log("   ✅ Archivo guardado exitosamente");

  console.log("\n" + "=".repeat(60));
  console.log("✅ REPARACIÓN COMPLETADA");
  console.log("=".repeat(60));
  console.log("\n📋 Resumen:");
  console.log(`   - Archivo original respaldado en: ${backupPath}`);
  console.log("   - service-account.json reparado");
  console.log(`   - Private key ahora tiene ${(repairedKey.match(/\n/g) || []).length} saltos de línea reales`);

  console.log("\n🚀 Siguiente paso:");
  console.log("   Ejecuta: node diagnostico.js");
  console.log("   Si todo está bien, ejecuta: node generar-url-registro.js\n");

} catch (error) {
  console.log("\n❌ ERROR durante la reparación:");
  console.log(`   ${error.message}\n`);

  if (error.code === 'ENOENT') {
    console.log("💡 El archivo service-account.json no existe.");
    console.log("   Por favor, descarga las credenciales de Google Cloud Console.\n");
  }

  process.exit(1);
}
