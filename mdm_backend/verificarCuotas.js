import { google } from "googleapis";
import fs from "fs";

const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));

const auth = new google.auth.GoogleAuth({
    credentials,
    projectId: credentials.project_id,
    scopes: ["https://www.googleapis.com/auth/androidmanagement"],
});

const androidmanagement = google.androidmanagement({ version: "v1", auth });

async function verificarEstado() {
    try {
        console.log("📊 Verificando estado del proyecto y empresa...\n");

        // Listar todas las empresas
        const empresas = await androidmanagement.enterprises.list();
        console.log("🏢 Empresas encontradas:", empresas.data.enterprises?.length || 0);

        if (empresas.data.enterprises) {
            for (const empresa of empresas.data.enterprises) {
                console.log(`\n  - ${empresa.name}`);
                console.log(`    Estado: ${empresa.enabledNotificationTypes || 'Sin notificaciones'}`);

                // Listar dispositivos de esta empresa
                try {
                    const dispositivos = await androidmanagement.enterprises.devices.list({
                        parent: empresa.name
                    });
                    console.log(`    Dispositivos: ${dispositivos.data.devices?.length || 0}`);

                    if (dispositivos.data.devices) {
                        dispositivos.data.devices.forEach((d, i) => {
                            console.log(`      ${i + 1}. ${d.name} - Estado: ${d.state}`);
                        });
                    }
                } catch (e) {
                    console.log(`    Error listando dispositivos: ${e.message}`);
                }

                // Listar tokens activos
                try {
                    const tokens = await androidmanagement.enterprises.enrollmentTokens.list({
                        parent: empresa.name
                    });
                    console.log(`    Tokens activos: ${tokens.data.enrollmentTokens?.length || 0}`);
                } catch (e) {
                    console.log(`    Error listando tokens: ${e.message}`);
                }
            }
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.response?.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        }
    }
}

verificarEstado();
