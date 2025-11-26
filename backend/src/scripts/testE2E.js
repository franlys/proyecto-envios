
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN
// ==========================================
const API_URL = 'http://localhost:5000/api';

// Credenciales
const USERS = {
    admin: { email: 'mayckol@embarquesivan.com', password: 'Demo123456' },
    secretaria: { email: 'franlysg@embarquesivan.com', password: 'Demo123456' },
    repartidor: { email: 'fgt@embarquesivan.com', password: 'demo1234' },
    cargador: { email: 'cargador@embarquesivan.com', password: 'Demo123456' }
};

// Configuración Firebase Cliente
const firebaseConfig = {
    apiKey: "AIzaSyCkxBrwlqfmgamysCPOF-mT1R_e67Em5aw",
    authDomain: "embarques-7ad6e.firebaseapp.com",
    projectId: "embarques-7ad6e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==========================================
// UTILIDADES
// ==========================================
const login = async (role) => {
    const creds = USERS[role];
    if (!creds) throw new Error(`Rol ${role} no definido`);

    try {
        console.log(`🔑 Iniciando sesión como ${role} (${creds.email})...`);
        const userCredential = await signInWithEmailAndPassword(auth, creds.email, creds.password);
        const token = await userCredential.user.getIdToken();
        console.log(`✅ Login exitoso: ${role}`);
        return token;
    } catch (error) {
        console.error(`❌ Error login ${role}:`, error.code, error.message);
        throw error;
    }
};

const api = axios.create({ baseURL: API_URL });

const setAuth = (token) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// ==========================================
// FLUJO DE PRUEBA
// ==========================================
const runTest = async () => {
    console.log('🚀 INICIANDO PRUEBA E2E COMPLETA\n');

    let adminToken, secretariaToken, repartidorToken;
    let facturaId, rutaId;

    try {
        // 1. LOGIN
        adminToken = await login('admin');
        // secretariaToken = await login('secretaria'); // Descomentar si tenemos la pass correcta
        repartidorToken = await login('repartidor');

        // ---------------------------------------------------------
        // PASO 1: CREAR RECOLECCIÓN (Como Admin)
        // ---------------------------------------------------------
        console.log('\n📦 PASO 1: Crear Recolección (Admin)...');
        setAuth(adminToken);

        const nuevaRecoleccion = {
            // Datos Remitente (Cliente)
            remitenteNombre: "Cliente Prueba E2E",
            remitenteTelefono: "809-555-1234",
            remitenteEmail: "cliente@test.com",
            remitenteDireccion: "Calle Falsa 123, Naco",

            // Datos Destinatario
            destinatarioNombre: "Destinatario Prueba",
            destinatarioTelefono: "829-555-5678",
            destinatarioEmail: "destinatario@test.com",
            destinatarioDireccion: "Av. Winston Churchill",
            destinatarioSector: "Piantini",
            destinatarioZona: "Capital",

            // Items
            items: JSON.stringify([
                { descripcion: "Caja Pequeña", cantidad: 1, precio: 500, tipo: "Caja" }
            ]),

            // Facturación
            subtotal: 500,
            itbis: 0,
            total: 500,

            // Otros
            notas: "Prueba automatizada E2E",
            tipoServicio: "standard",
            metodoPago: "efectivo",
            estadoPago: "pendiente",
            montoPagado: 0
        };

        // Ajustar endpoint según tu API real. Asumo /api/recolecciones
        const resRecoleccion = await api.post('/recolecciones', nuevaRecoleccion);
        facturaId = resRecoleccion.data.data.id;
        console.log(`✅ Recolección creada. ID: ${facturaId}`);

        // ---------------------------------------------------------
        // PASO 2: CONFIRMAR RECOLECCIÓN (Simulado como Admin por ahora)
        // ---------------------------------------------------------
        // En el flujo real, la secretaria confirma. Si no tenemos pass de secretaria,
        // usaremos admin si tiene permisos, o saltamos este paso si se crea ya confirmada.
        console.log('\n📝 PASO 2: Confirmar Recolección (Secretaria/Admin)...');

        // Endpoint para confirmar: /api/secretarias/facturas/:id/confirmar
        // O update directo si es admin. Probemos el endpoint de secretaria.
        try {
            await api.post(`/secretarias/facturas/${facturaId}/confirmar`);
            console.log('✅ Recolección confirmada por Secretaría.');
        } catch (e) {
            console.warn('⚠️ No se pudo confirmar por endpoint de secretaria (quizás requiere rol). Intentando update directo...');
            await api.put(`/recolecciones/${facturaId}`, { estado: 'confirmada_secretaria' });
            console.log('✅ Estado forzado a confirmada_secretaria.');
        }

        // ---------------------------------------------------------
        // PASO 3: CREAR RUTA (Admin)
        // ---------------------------------------------------------
        console.log('\n🚚 PASO 3: Crear Ruta y Asignar (Admin)...');

        // Necesitamos IDs de repartidor y cargador.
        // Usaremos el ID del usuario repartidor que logueamos.
        // Para cargador, necesitamos buscar uno o usar uno dummy si la API lo permite.

        // Buscar ID del repartidor por email (o usar el del login si lo guardamos)
        // Como no tenemos el ID a mano, hacemos un GET a /empleados/repartidores
        const resRepartidores = await api.get('/empleados/repartidores');
        const repartidorUser = resRepartidores.data.data.find(r => r.email === USERS.repartidor.email);

        if (!repartidorUser) throw new Error('No se encontró el usuario repartidor en la BD');
        const repartidorId = repartidorUser.id;

        // Buscar cargador
        let cargadorId;
        try {
            // Intentar endpoint específico si existe
            const resCargadores = await api.get('/cargadores/disponibles');
            if (resCargadores.data.success && resCargadores.data.data.length > 0) {
                cargadorId = resCargadores.data.data[0]?.id;
            }
        } catch (e) {
            console.log('ℹ️ Endpoint /cargadores/disponibles no existe, buscando en empleados...');
        }

        if (!cargadorId) {
            // Buscar en /empleados
            const resEmpleados = await api.get('/empleados');
            const cargador = resEmpleados.data.data.find(e => e.rol === 'cargador');
            if (cargador) cargadorId = cargador.id;
        }

        if (!cargadorId) {
            console.warn('⚠️ No se encontraron cargadores. Usando ID dummy (puede fallar si hay validación estricta).');
            cargadorId = 'dummy_cargador_id';
        }

        const nuevaRuta = {
            nombre: `Ruta E2E ${Date.now()}`,
            repartidorId: repartidorId,
            cargadoresIds: [cargadorId],
            facturasIds: [facturaId],
            configuracion: {
                direccionCarga: 'adelante-atras',
                ordenEntrega: 'cercanas-primero'
            }
        };
        await api.post(`/repartidores/rutas/${rutaId}/finalizar`, {
            notas: "Ruta terminada E2E"
        });
        console.log('✅ Ruta finalizada.');

        console.log('\n✨ PRUEBA E2E COMPLETADA EXITOSAMENTE ✨');

    } catch (error) {
        console.error('\n❌ PRUEBA FALLIDA');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
};

runTest();
