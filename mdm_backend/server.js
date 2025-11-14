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
// 🔹 CREAR EMPRESA EN ANDROID MANAGEMENT
// ===================================================
app.post("/crear-empresa", async (req, res) => {
  try {
    const { nombreEmpresa, emailContacto } = req.body;

    if (!nombreEmpresa || !emailContacto) {
      return res.status(400).json({
        success: false,
        message: "Debe proporcionar nombreEmpresa y emailContacto.",
      });
    }

    const projectId = await auth.getProjectId();
    console.log("🧩 Creando empresa para:", nombreEmpresa);

    const response = await androidmanagement.enterprises.create({
      projectId,
      agreementAccepted: true, // Campo en el nivel correcto
      requestBody: {
        enterpriseDisplayName: nombreEmpresa,
        contactInfo: { 
          contactEmail: emailContacto 
        },
      },
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