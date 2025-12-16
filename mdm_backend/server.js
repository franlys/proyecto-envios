import express from "express";
import { google } from "googleapis";
import fs from "fs";

const app = express();
app.use(express.json());

// ===================================================
// 🔹 CARGAR CREDENCIALES DE LA CUENTA DE SERVICIO
// ===================================================
const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));

const auth = new google.auth.GoogleAuth({
  credentials,
  projectId: credentials.project_id, // ✅ Corrección clave
  scopes: ["https://www.googleapis.com/auth/androidmanagement"],
});

const androidmanagement = google.androidmanagement({
  version: "v1",
  auth,
});

// ===================================================
// 🔹 TEST DE CONEXIÓN (Verifica la conexión con Google)
// ===================================================
app.get("/test", async (req, res) => {
  try {
    const projectId = await auth.getProjectId();
    console.log("✅ Conexión establecida con el proyecto:", projectId);
    res.json({ success: true, projectId });
  } catch (error) {
    console.error("❌ Error probando conexión:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===================================================
// 🔹 CALLBACK DE REGISTRO (Google redirige aquí)
// ===================================================
app.get("/callback-registro", async (req, res) => {
  try {
    const enterpriseToken = req.query.enterpriseToken;
    const error = req.query.error;

    // Si hubo error en el registro
    if (error) {
      console.error("❌ Error en el registro:", error);
      return res.send(`
        <html>
          <head><title>Error en Registro</title></head>
          <body style="font-family:Arial;padding:40px;text-align:center;">
            <h1 style="color:red;">❌ Error en el Registro</h1>
            <p>Hubo un problema durante el registro de la empresa:</p>
            <pre style="background:#f5f5f5;padding:20px;border-radius:8px;">${error}</pre>
            <p>Por favor, intenta nuevamente ejecutando el script de registro.</p>
          </body>
        </html>
      `);
    }

    // Si no hay token, mostrar error
    if (!enterpriseToken) {
      console.error("❌ No se recibió enterpriseToken");
      return res.send(`
        <html>
          <head><title>Token No Recibido</title></head>
          <body style="font-family:Arial;padding:40px;text-align:center;">
            <h1 style="color:orange;">⚠️ Token No Recibido</h1>
            <p>No se recibió el token de la empresa.</p>
            <p>Esto puede ocurrir si cancelaste el registro o si hubo un problema de conexión.</p>
            <p>Por favor, ejecuta nuevamente el script de registro.</p>
          </body>
        </html>
      `);
    }

    console.log("✅ Enterprise Token recibido:", enterpriseToken);
    console.log("🧩 Completando registro de la empresa...");

    // Crear la empresa usando el token
    const projectId = await auth.getProjectId();
    const response = await androidmanagement.enterprises.create({
      projectId,
      enterpriseToken,
      signupUrlName: req.query.signupUrlName || undefined, // Opcional
    });

    const enterprise = response.data;
    console.log("✅ Empresa creada exitosamente:", enterprise.name);
    console.log("📋 Nombre:", enterprise.enterpriseDisplayName || "Sin nombre");

    // Guardar información de la empresa en un archivo JSON local
    const enterpriseInfo = {
      name: enterprise.name,
      displayName: enterprise.enterpriseDisplayName,
      createdAt: new Date().toISOString(),
      projectId: projectId,
    };

    fs.writeFileSync(
      "./empresa-registrada.json",
      JSON.stringify(enterpriseInfo, null, 2)
    );

    // Respuesta HTML de éxito
    res.send(`
      <html>
        <head>
          <title>Registro Exitoso</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
        </head>
        <body style="font-family:Arial;padding:40px;text-align:center;background:#f0f9ff;">
          <div style="max-width:600px;margin:0 auto;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="color:#10b981;">✅ Registro Completado</h1>
            <p style="font-size:18px;color:#374151;">Tu empresa ha sido registrada exitosamente en Android Enterprise.</p>

            <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;text-align:left;">
              <h3 style="margin-top:0;color:#1f2937;">📋 Información de la Empresa:</h3>
              <p><strong>ID:</strong> <code style="background:#e5e7eb;padding:4px 8px;border-radius:4px;">${enterprise.name}</code></p>
              <p><strong>Nombre:</strong> ${enterprise.enterpriseDisplayName || "No especificado"}</p>
              <p><strong>Proyecto:</strong> ${projectId}</p>
            </div>

            <div style="background:#fef3c7;padding:16px;border-radius:8px;border-left:4px solid #f59e0b;margin:20px 0;text-align:left;">
              <h4 style="margin:0 0 8px 0;color:#92400e;">📌 Siguiente Paso:</h4>
              <p style="margin:0;color:#78350f;">Ahora puedes crear políticas y generar códigos QR para inscribir dispositivos.</p>
            </div>

            <p style="margin-top:30px;color:#6b7280;font-size:14px;">
              La información se guardó en <code>empresa-registrada.json</code>
            </p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("❌ Error en callback de registro:", error);
    const googleError = error.response?.data?.error?.message || error.message;

    res.send(`
      <html>
        <head><title>Error al Crear Empresa</title></head>
        <body style="font-family:Arial;padding:40px;text-align:center;">
          <h1 style="color:red;">❌ Error al Crear Empresa</h1>
          <p>Hubo un problema al crear la empresa en Android Management:</p>
          <pre style="background:#f5f5f5;padding:20px;border-radius:8px;text-align:left;overflow:auto;">${googleError}</pre>
          <p>Por favor, contacta al soporte técnico.</p>
        </body>
      </html>
    `);
  }
});

// ===================================================
// 🔹 CREAR EMPRESA MANUALMENTE (con Enterprise Token)
// ===================================================
// Este endpoint es para crear la empresa manualmente si
// ya tienes un enterpriseToken de otra fuente
app.post("/crear-empresa", async (req, res) => {
  try {
    const { enterpriseToken } = req.body;

    if (!enterpriseToken) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar enterpriseToken obtenido del registro.",
        info: "Ejecuta 'node generar-url-registro.js' para obtener el token."
      });
    }

    const projectId = await auth.getProjectId();
    console.log("🧩 Creando empresa con token...");

    const response = await androidmanagement.enterprises.create({
      projectId,
      enterpriseToken,
    });

    console.log("✅ Empresa creada:", response.data.name);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Error creando empresa:", error);
    const googleError = error.response?.data?.error?.message || error.message;
    res.status(500).json({ success: false, error: googleError });
  }
});

// ===================================================
// 🔹 GENERAR TOKEN DE INSCRIPCIÓN (QR PARA DISPOSITIVOS)
// ===================================================
app.post("/generar-qr", async (req, res) => {
  try {
    const { enterpriseName, policyName } = req.body;

    if (!enterpriseName || !policyName) {
      return res.status(400).json({
        success: false,
        message: "Debe indicar enterpriseName y policyName.",
      });
    }

    // ✅ CORRECCIÓN: La función correcta es 'enrollmentTokens.create'
    const response = await androidmanagement.enterprises.enrollmentTokens.create({
      parent: enterpriseName,
      requestBody: {
        policyName: `${enterpriseName}/policies/${policyName}`,
      },
    });

    console.log("✅ Token de inscripción creado:", response.data.name);
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Error generando QR:", error);
    const googleError = error.response?.data?.error?.message || error.message;
    res.status(500).json({ success: false, error: googleError });
  }
});

import QRCode from "qrcode";

// Mostrar QR simple (GET)
// Uso: /show-qr?text=valor_a_codificar
app.get("/show-qr", async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) return res.status(400).send("Falta query param ?text=...");

    // Genera dataURL PNG
    const dataUrl = await QRCode.toDataURL(text, { margin: 2, scale: 6 });

    // Respuesta HTML simple con la imagen
    res.send(`
      <html>
        <head><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
        <body style="display:flex;flex-direction:column;align-items:center;gap:12px;font-family:Arial;padding:20px;">
          <h2>Escanea este QR para inscripción MDM</h2>
          <img src="${dataUrl}" alt="QR" style="max-width:90vw;"/>
          <p style="font-size:0.9rem;word-break:break-all;max-width:90vw;">
            Texto codificado: <br/><strong>${escapeHtml(text)}</strong>
          </p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Error generando QR:", err);
    res.status(500).send("Error generando QR");
  }
});

// helper para escapar texto en HTML
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ===================================================
// 🔹 PUERTO LOCAL
// ===================================================
const PORT = process.env.PORT || 5080;
app.listen(PORT, () => {
  console.log(`🚀 Servidor MDM escuchando en http://localhost:${PORT}`);
});