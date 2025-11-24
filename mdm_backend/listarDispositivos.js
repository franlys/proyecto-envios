import { google } from "googleapis";
import fs from "fs";

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

async function listarDispositivos(enterpriseName) {
    try {
        console.log(`🔍 Buscando dispositivos en ${enterpriseName}...`);
        const response = await androidmanagement.enterprises.devices.list({
            parent: enterpriseName,
        });

        const devices = response.data.devices || [];
        console.log(`📱 Total dispositivos encontrados: ${devices.length}`);

        devices.forEach((device, index) => {
            console.log(`${index + 1}. ${device.name} (${device.state})`);
        });

    } catch (error) {
        console.error("❌ Error listando dispositivos:", error.message);
    }
}

const enterpriseName = process.argv[2];
if (enterpriseName) {
    listarDispositivos(enterpriseName);
} else {
    console.log("Uso: node listarDispositivos.js enterprises/XXXX");
}
