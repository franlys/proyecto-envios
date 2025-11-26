
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// CONFIGURACIÓN
// ==========================================
const API_URL = 'http://localhost:5000/api';
const NUM_FACTURAS = 50;
const NUM_CONTENEDORES = 5;
const FACTURAS_POR_CONTENEDOR = 10;
const CONCURRENCY_LIMIT = 10; // Lotes de peticiones simultáneas

// Credenciales
const USERS = {
    admin: { email: 'mayckol@embarquesivan.com', password: 'Demo123456' },
    repartidor: { email: 'fgt@embarquesivan.com', password: 'demo1234' }
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
const api = axios.create({ baseURL: API_URL });

const login = async (role) => {
    const creds = USERS[role];
    try {
        const userCredential = await signInWithEmailAndPassword(auth, creds.email, creds.password);
        return await userCredential.user.getIdToken();
    } catch (error) {
        console.error(`❌ Error login ${role}:`, error.message);
        throw error;
    }
};

const setAuth = (token) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Función para ejecutar promesas en lotes (evitar saturación)
async function processInBatches(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
        console.log(`   ...procesados ${Math.min(i + batchSize, items.length)}/${items.length}`);
    }
    return results;
}

// ==========================================
// GENERADORES DE DATOS
// ==========================================
const generarFacturaPayload = (i) => ({
    remitenteNombre: `Cliente Estrés ${i}`,
    remitenteTelefono: "809-555-0000",
    remitenteEmail: `cliente${i}@stress.com`,
    remitenteDireccion: `Calle Estrés ${i}`,
    destinatarioNombre: `Destinatario Estrés ${i}`,
    destinatarioTelefono: "829-555-0000",
    destinatarioEmail: `dest${i}@stress.com`,
    destinatarioDireccion: `Av. Carga ${i}`,
    destinatarioSector: "Naco",
    destinatarioZona: "Capital",
    items: JSON.stringify([{ descripcion: "Item Test", cantidad: 1, precio: 100 }]),
    subtotal: 100,
    itbis: 0,
    total: 100,
    notas: `Generado por Stress Test ${Date.now()}`,
    tipoServicio: "standard",
    metodoPago: "efectivo",
    estadoPago: "pendiente",
    montoPagado: 0
});

// ==========================================
// PRUEBA DE ESTRÉS
// ==========================================
const runStressTest = async () => {
    console.log('🔥 INICIANDO PRUEBA DE ESTRÉS 🔥');
    console.log(`Objetivo: ${NUM_FACTURAS} facturas, ${NUM_CONTENEDORES} contenedores.`);

    const startTime = Date.now();

    try {
        // 1. Login
        const adminToken = await login('admin');
        setAuth(adminToken);
        console.log('✅ Login Admin exitoso');

        // 2. Crear Facturas Masivas
        console.log(`\n📦 Creando ${NUM_FACTURAS} facturas...`);
        const indicesFacturas = Array.from({ length: NUM_FACTURAS }, (_, i) => i + 1);

        const facturasIds = await processInBatches(indicesFacturas, CONCURRENCY_LIMIT, async (i) => {
            try {
                const res = await api.post('/recolecciones', generarFacturaPayload(i));
                return res.data.data.id;
            } catch (e) {
                console.error(`❌ Error creando factura ${i}:`, e.message);
                return null;
            }
        });

        const facturasValidas = facturasIds.filter(id => id !== null);
        console.log(`✅ ${facturasValidas.length} facturas creadas exitosamente.`);

        if (facturasValidas.length === 0) throw new Error("No se crearon facturas");

        // 3. Crear Contenedores y Asignar
        console.log(`\n🚢 Creando ${NUM_CONTENEDORES} contenedores y asignando facturas...`);
        const contenedoresIds = [];

        for (let i = 0; i < NUM_CONTENEDORES; i++) {
            const numContenedor = `STRESS-${Date.now()}-${i}`;
            const resCont = await api.post('/almacen-usa/contenedores', { numeroContenedor: numContenedor });
            const contenedorId = resCont.data.data.id;
            contenedoresIds.push(contenedorId);

            // Tomar un lote de facturas para este contenedor
            const startIdx = i * FACTURAS_POR_CONTENEDOR;
            const facturasLote = facturasValidas.slice(startIdx, startIdx + FACTURAS_POR_CONTENEDOR);

            if (facturasLote.length > 0) {
                // Asignar concurrentemente
                await processInBatches(facturasLote, CONCURRENCY_LIMIT, async (facturaId) => {
                    await api.post(`/almacen-usa/contenedores/${contenedorId}/facturas`, { facturaId });
                });
                console.log(`   ✅ Contenedor ${numContenedor}: ${facturasLote.length} facturas asignadas.`);

                // Cerrar contenedor
                await api.post(`/almacen-usa/contenedores/${contenedorId}/cerrar`, { forzarCierre: true });

                // Recibir en RD
                await api.post(`/almacen-rd/contenedores/${contenedorId}/confirmar-recepcion`, { notas: "Stress Test" });
            }
        }
        console.log(`✅ ${NUM_CONTENEDORES} contenedores procesados (USA -> RD).`);

        // 4. Crear Rutas Masivas
        console.log(`\n🚚 Creando rutas y asignando...`);

        // Obtener IDs necesarios
        const resRep = await api.get('/empleados/repartidores');
        const repartidorId = resRep.data.data[0]?.id; // Usar el primero disponible

        const resCarg = await api.get('/empleados');
        const cargadorId = resCarg.data.data.find(e => e.rol === 'cargador')?.id || 'dummy_cargador';

        if (!repartidorId) throw new Error("No hay repartidores disponibles");

        // Crear una ruta por cada contenedor (para simplificar)
        for (let i = 0; i < contenedoresIds.length; i++) {
            const startIdx = i * FACTURAS_POR_CONTENEDOR;
            const facturasLote = facturasValidas.slice(startIdx, startIdx + FACTURAS_POR_CONTENEDOR);

            if (facturasLote.length > 0) {
                const resRuta = await api.post('/rutas', {
                    nombre: `Ruta Stress ${i}`,
                    repartidorId,
                    cargadoresIds: [cargadorId],
                    facturasIds: facturasLote,
                    configuracion: { direccionCarga: 'adelante-atras', ordenEntrega: 'cercanas-primero' }
                });
                console.log(`   ✅ Ruta ${i} creada con ${facturasLote.length} facturas.`);
            }
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n✨ PRUEBA DE ESTRÉS COMPLETADA ✨`);
        console.log(`⏱️ Tiempo total: ${duration.toFixed(2)} segundos`);
        console.log(`📊 Tasa: ${(NUM_FACTURAS / duration).toFixed(2)} facturas/segundo`);

    } catch (error) {
        console.error('\n❌ PRUEBA DE ESTRÉS FALLIDA');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
};

runStressTest();
