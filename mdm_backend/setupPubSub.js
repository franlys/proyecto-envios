import { google } from "googleapis";
import fs from "fs";

const credentials = JSON.parse(fs.readFileSync("./service-account.json", "utf8"));
const PROJECT_ID = credentials.project_id;
const TOPIC_NAME = "mdm-notifications";
const SUBSCRIPTION_NAME = "mdm-sub";

const auth = new google.auth.GoogleAuth({
    credentials,
    projectId: PROJECT_ID,
    scopes: [
        "https://www.googleapis.com/auth/androidmanagement",
        "https://www.googleapis.com/auth/pubsub"
    ],
});

const androidmanagement = google.androidmanagement({ version: "v1", auth });
const pubsub = google.pubsub({ version: "v1", auth });

async function setupPubSub(enterpriseName) {
    try {
        const topicPath = `projects/${PROJECT_ID}/topics/${TOPIC_NAME}`;
        const subscriptionPath = `projects/${PROJECT_ID}/subscriptions/${SUBSCRIPTION_NAME}`;

        // 1. Crear Tópico
        try {
            console.log(`📡 Creando tópico: ${topicPath}...`);
            await pubsub.projects.topics.create({ name: topicPath });
            console.log("✅ Tópico creado.");
        } catch (e) {
            if (e.code === 409) console.log("⚠️ El tópico ya existe.");
            else throw e;
        }

        // 2. Dar permisos a Android Management API
        console.log("🔑 Asignando permisos a Android Management...");
        try {
            await pubsub.projects.topics.setIamPolicy({
                resource: topicPath,
                requestBody: {
                    policy: {
                        bindings: [
                            {
                                role: "roles/pubsub.publisher",
                                members: ["serviceAccount:android-cloud-policy@system.gserviceaccount.com"],
                            },
                        ],
                    },
                },
            });
            console.log("✅ Permisos asignados.");
        } catch (e) {
            console.log("⚠️ No se pudo asignar permisos automáticamente (Falta rol de Admin).");
            console.log("👉 IMPORTANTE: Debes hacerlo manualmente en la consola de Google Cloud:");
            console.log("   1. Ve a Pub/Sub > Topics > mdm-notifications");
            console.log("   2. Agrega el principal: android-cloud-policy@system.gserviceaccount.com");
            console.log("   3. Asigna el rol: Pub/Sub Publisher");
        }

        // 3. Crear Suscripción
        try {
            console.log(`📬 Creando suscripción: ${subscriptionPath}...`);
            await pubsub.projects.subscriptions.create({
                name: subscriptionPath,
                requestBody: { topic: topicPath },
            });
            console.log("✅ Suscripción creada.");
        } catch (e) {
            if (e.code === 409) console.log("⚠️ La suscripción ya existe.");
            else throw e;
        }

        // 4. Vincular a la Empresa
        console.log(`🔗 Vinculando tópico a la empresa ${enterpriseName}...`);
        await androidmanagement.enterprises.patch({
            name: enterpriseName,
            updateMask: "pubsubTopic",
            requestBody: {
                pubsubTopic: topicPath,
            },
        });
        console.log("✅ Empresa actualizada con Pub/Sub.");

        console.log("\n🚀 LISTO! Ahora ejecuta 'node escucharLogs.js' para ver los errores en tiempo real.");

    } catch (error) {
        console.error("❌ Error configurando Pub/Sub:", error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
    }
}

const enterpriseName = process.argv[2];
if (enterpriseName) {
    setupPubSub(enterpriseName);
} else {
    console.log("Uso: node setupPubSub.js enterprises/XXXX");
}
