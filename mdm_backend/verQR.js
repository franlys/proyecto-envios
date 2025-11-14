import qrcode from "qrcode-terminal";
import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// 🧩 Mostrar QR en consola o navegador
app.post("/mostrar-qr", async (req, res) => {
  try {
    const { qrUrl } = req.body;
    if (!qrUrl) {
      return res.status(400).json({ success: false, message: "Falta qrUrl" });
    }

    console.log("🔗 Enlace QR recibido:", qrUrl);
    qrcode.generate(qrUrl, { small: true });
    res.json({ success: true, message: "QR mostrado en consola" });
  } catch (error) {
    console.error("❌ Error mostrando QR:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔹 Servidor local de QR
const PORT = 5090;
app.listen(PORT, () =>
  console.log(`📱 Servidor QR activo en http://localhost:${PORT}`)
);
