import { google } from "googleapis";
import fs from "fs";

const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));
const PROJECT_ID = credentials.project_id;
const SUBSCRIPTION_NAME = "mdm-sub";

const auth = new google.auth.GoogleAuth({
    credentials,
    projectId: PROJECT_ID,
    scopes: ["https://www.googleapis.com/auth/pubsub"],
});

const pubsub = google.pubsub({ version: "v1", auth });

async function escucharLogs() {
    const subscriptionPath = `projects/${PROJECT_ID}/subscriptions/${SUBSCRIPTION_NAME}`;
    console.log(`🎧 Escuchando logs en: ${subscriptionPath}... (Presiona Ctrl+C para salir)`);

    while (true) {
        try {
            const response = await pubsub.projects.subscriptions.pull({
                subscription: subscriptionPath,
                requestBody: { maxMessages: 10 },
            });

            const messages = response.data.receivedMessages || [];

            for (const msg of messages) {
                const data = Buffer.from(msg.message.data, 'base64').toString('utf-8');
                const parsed = JSON.parse(data);

                console.log("\n------------------------------------------------");
                console.log("🔔 NOTIFICACIÓN RECIBIDA:");
                console.log(`Tipo: ${parsed.notificationType || 'Desconocido'}`);

                if (parsed.statusReport) {
                    console.log("📊 Reporte de Estado:", JSON.stringify(parsed.statusReport, null, 2));
                }
                if (parsed.usageLog) {
                    console.log("📜 Log de Uso:", JSON.stringify(parsed.usageLog, null, 2));
                }
                if (parsed.command) {
                    console.log("⚙️ Comando:", JSON.stringify(parsed.command, null, 2));
                }

                // Confirmar recepción (ACK)
                await pubsub.projects.subscriptions.acknowledge({
                    subscription: subscriptionPath,
                    requestBody: { ackIds: [msg.ackId] },
                });
            }

            // Esperar un poco antes de volver a consultar (polling simple)
            await new Promise(r => setTimeout(r, 2000));

        } catch (error) {
            console.error("❌ Error escuchando:", error.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

escucharLogs();
