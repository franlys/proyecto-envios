import express from 'express';
import axios from 'axios';
import { handleWebhook } from '../controllers/whatsappWebhookController.js';


const router = express.Router();

// Configuración de Evolution API
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DEFAULT_URL = IS_PRODUCTION
    ? 'https://evolution-api-production-0fa7.up.railway.app'
    : 'http://localhost:8080';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || DEFAULT_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';

// Cliente Axios pre-configurado
const evolutionClient = axios.create({
    baseURL: EVOLUTION_URL,
    headers: {
        'apikey': EVOLUTION_KEY,
        'Content-Type': 'application/json'
    }
});

// Helper para manejar errores de Axios
const handleAxiosError = (res, error) => {
    console.error('Error Proxy WhatsApp:', error.message);
    if (error.response) {
        console.error('Detalles:', error.response.data);
        return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Error de conexión con Evolution API' });
};

// 1. Obtener todas las instancias
router.get('/instances', async (req, res) => {
    try {
        const response = await evolutionClient.get('/instance/fetchInstances');
        res.json(response.data);
    } catch (error) {
        handleAxiosError(res, error);
    }
});

// 2. Crear una nueva instancia
router.post('/instance', async (req, res) => {
    try {
        console.log('📡 Creando instancia WhatsApp:', req.body.instanceName);

        // 🔹 INYECCIÓN AUTOMÁTICA DE WEBHOOK
        // Determinamos la URL pública de este backend (Railway o Localhost)
        const host = req.get('host'); // e.g. "backend-production.railway.app" or "localhost:8080"
        const protocol = IS_PRODUCTION ? 'https' : 'http';
        const webhookUrl = `${protocol}://${host}/api/whatsapp/webhook`;

        // Modificamos el payload para incluir el webhook
        const payload = {
            ...req.body,
            webhook: webhookUrl,
            webhook_by_events: true,
            events: ['MESSAGES_UPSERT']
        };

        console.log(`🔗 Configurando Webhook en: ${webhookUrl}`);

        const response = await evolutionClient.post('/instance/create', payload);
        console.log('✅ Instancia creada (Data):', JSON.stringify(response.data, null, 2));
        res.json(response.data);
    } catch (error) {
        handleAxiosError(res, error);
    }
});

// 3. Conectar / Obtener QR de una instancia
router.get('/instance/:instanceName/connect', async (req, res) => {
    try {
        const { instanceName } = req.params;
        console.log(`📡 Solicitando conexión para: ${instanceName}`);
        const response = await evolutionClient.get(`/instance/connect/${instanceName}`);
        console.log(`✅ Respuesta Connect (${instanceName}):`, JSON.stringify(response.data, null, 2));
        res.json(response.data);
    } catch (error) {
        handleAxiosError(res, error);
    }
});

// 4. Eliminar / Desconectar una instancia
router.delete('/instance/:instanceName', async (req, res) => {
    try {
        const { instanceName } = req.params;

        // Primero hacemos logout por si acaso
        try {
            await evolutionClient.delete(`/instance/logout/${instanceName}`);
        } catch (e) { /* Ignorar si ya estaba desconectado */ }

        // Luego eliminamos la instancia
        const response = await evolutionClient.delete(`/instance/delete/${instanceName}`);
        res.json(response.data);
    } catch (error) {
        handleAxiosError(res, error);
    }
});

// 5. WEBHOOK para recibir mensajes (Chatbot)
// Evolution API puede enviar a /webhook o /webhook/messages-upsert
router.post('/webhook*', handleWebhook);

export default router;
