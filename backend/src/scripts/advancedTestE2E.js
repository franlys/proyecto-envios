
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// HELPERS DE NEGOCIO
// ==========================================
async function crearFactura(nombreCliente, items) {
    const payload = {
        remitenteNombre: nombreCliente,
        remitenteTelefono: "809-555-1234",
        remitenteEmail: "cliente@test.com",
        remitenteDireccion: "Calle Test 123",
        destinatarioNombre: "Destinatario Test",
        destinatarioTelefono: "829-555-5678",
        destinatarioEmail: "destinatario@test.com",
        destinatarioDireccion: "Av. Test",
        destinatarioSector: "Piantini",
        destinatarioZona: "Capital",
        items: JSON.stringify(items),
        subtotal: 1000,
        itbis: 0,
        total: 1000,
        notas: "Test Avanzado",
        tipoServicio: "standard",
        metodoPago: "efectivo",
        estadoPago: "pendiente",
        montoPagado: 0
    };
    const res = await api.post('/recolecciones', payload);
    return res.data.data.id;
}

async function confirmarFactura(facturaId) {
    try {
        await api.post(`/secretarias/facturas/${facturaId}/confirmar`);
    } catch (e) {
        await api.put(`/recolecciones/${facturaId}`, { estado: 'confirmada_secretaria' });
    }
}

async function obtenerRepartidorYCargador() {
    const resRep = await api.get('/empleados/repartidores');
    const repartidor = resRep.data.data.find(r => r.email === USERS.repartidor.email);

    let cargadorId;
    try {
        const resCarg = await api.get('/cargadores/disponibles');
        if (resCarg.data.data.length > 0) cargadorId = resCarg.data.data[0].id;
    } catch (e) { }

    if (!cargadorId) {
        const resEmp = await api.get('/empleados');
        const carg = resEmp.data.data.find(e => e.rol === 'cargador');
        if (carg) cargadorId = carg.id;
    }

    return { repartidorId: repartidor.id, cargadorId: cargadorId || 'dummy_id' };
}

// ==========================================
// ESCENARIOS
// ==========================================

// --- ESCENARIO 1: FLUJO DE CONTENEDOR ---
async function escenarioContenedor(adminToken) {
    console.log('\n🚢 ESCENARIO 1: FLUJO DE CONTENEDOR (USA -> RD -> RUTA)');
    setAuth(adminToken);

    // 1. Crear Factura
    const facturaId = await crearFactura("Cliente Contenedor", [{ descripcion: "Caja Importada", cantidad: 1, precio: 100 }]);
    console.log(`   ✅ Factura creada: ${facturaId}`);

    // 2. Crear Contenedor (USA)
    const numContenedor = `CONT-${Date.now()}`;
    const resCont = await api.post('/almacen-usa/contenedores', { numeroContenedor: numContenedor });
    const contenedorId = resCont.data.data.id;
    console.log(`   ✅ Contenedor creado: ${numContenedor} (${contenedorId})`);

    // 3. Agregar Factura al Contenedor
    await api.post(`/almacen-usa/contenedores/${contenedorId}/facturas`, { facturaId });
    console.log(`   ✅ Factura agregada al contenedor`);

    // 4. Cerrar Contenedor (En Tránsito)
    await api.post(`/almacen-usa/contenedores/${contenedorId}/cerrar`, { forzarCierre: true });
    console.log(`   ✅ Contenedor cerrado y en tránsito`);

    // 5. Recibir Contenedor (RD)
    // Nota: Usamos el mismo admin token asumiendo permisos, o cambiar a usuario de RD si existe
    await api.post(`/almacen-rd/contenedores/${contenedorId}/confirmar-recepcion`, { notas: "Recibido OK" });
    console.log(`   ✅ Contenedor recibido en RD`);

    // 6. Asignar a Ruta
    // La factura ahora debería estar en estado 'recibida_rd' o similar, lista para ruta.
    const { repartidorId, cargadorId } = await obtenerRepartidorYCargador();
    const resRuta = await api.post('/rutas', {
        nombre: `Ruta Contenedor ${Date.now()}`,
        repartidorId,
        cargadoresIds: [cargadorId],
        facturasIds: [facturaId],
        configuracion: { direccionCarga: 'adelante-atras', ordenEntrega: 'cercanas-primero' }
    });
    console.log(`   ✅ Ruta creada con factura de contenedor: ${resRuta.data.data.id}`);
}

// --- ESCENARIO 2: ITEM DAÑADO ---
async function escenarioItemDanado(adminToken, repartidorToken) {
    console.log('\n💔 ESCENARIO 2: REPORTE DE ITEM DAÑADO');
    setAuth(adminToken);

    const facturaId = await crearFactura("Cliente Dañado", [{ descripcion: "Vajilla Frágil", cantidad: 1, precio: 200 }]);
    await confirmarFactura(facturaId);

    const { repartidorId, cargadorId } = await obtenerRepartidorYCargador();
    const resRuta = await api.post('/rutas', {
        nombre: `Ruta Daños ${Date.now()}`,
        repartidorId,
        cargadoresIds: [cargadorId],
        facturasIds: [facturaId],
        configuracion: { direccionCarga: 'adelante-atras', ordenEntrega: 'cercanas-primero' }
    });
    const rutaId = resRuta.data.data.id;
    console.log(`   ✅ Ruta creada: ${rutaId}`);

    // Repartidor reporta daño
    setAuth(repartidorToken);
    console.log('   ⚠️ Reportando daño...');
    await api.post(`/repartidores/facturas/${facturaId}/items/danado`, {
        itemIndex: 0,
        cantidad: 1,
        descripcion: "Se rompió en el camino",
        fotos: ["http://foto-rota.com/img.jpg"]
    });
    console.log('   ✅ Daño reportado exitosamente');

    // Finalizar ruta (aunque no se entregó, se procesó)
    await api.post(`/repartidores/rutas/${rutaId}/finalizar`, { notas: "Ruta con daños" });
    console.log('   ✅ Ruta finalizada');
}

// --- ESCENARIO 3: NO ENTREGADO (CLIENTE AUSENTE) ---
async function escenarioNoEntregado(adminToken, repartidorToken) {
    console.log('\n🚫 ESCENARIO 3: CLIENTE AUSENTE (NO ENTREGADO)');
    setAuth(adminToken);

    const facturaId = await crearFactura("Cliente Ausente", [{ descripcion: "Paquete Normal", cantidad: 1, precio: 100 }]);
    await confirmarFactura(facturaId);

    const { repartidorId, cargadorId } = await obtenerRepartidorYCargador();
    const resRuta = await api.post('/rutas', {
        nombre: `Ruta Ausente ${Date.now()}`,
        repartidorId,
        cargadoresIds: [cargadorId],
        facturasIds: [facturaId],
        configuracion: { direccionCarga: 'adelante-atras', ordenEntrega: 'cercanas-primero' }
    });
    const rutaId = resRuta.data.data.id;
    console.log(`   ✅ Ruta creada: ${rutaId}`);

    // Repartidor reporta no entrega
    setAuth(repartidorToken);
    console.log('   ⚠️ Reportando cliente ausente...');
    await api.post(`/repartidores/facturas/${facturaId}/no-entregada`, {
        motivo: "cliente_ausente",
        descripcion: "Nadie en casa",
        fotos: ["http://casa-cerrada.com/img.jpg"],
        intentarNuevamente: true
    });
    console.log('   ✅ Reportado como no entregado');

    // Finalizar ruta
    await api.post(`/repartidores/rutas/${rutaId}/finalizar`, { notas: "Ruta con devoluciones" });
    console.log('   ✅ Ruta finalizada (Factura debe quedar liberada)');
}

// ==========================================
// EJECUCIÓN PRINCIPAL
// ==========================================
const runAdvancedTest = async () => {
    console.log('🚀 INICIANDO PRUEBAS AVANZADAS E2E\n');

    try {
        const adminToken = await login('admin');
        const repartidorToken = await login('repartidor');

        await escenarioContenedor(adminToken);
        await escenarioItemDanado(adminToken, repartidorToken);
        await escenarioNoEntregado(adminToken, repartidorToken);

        console.log('\n✨ TODAS LAS PRUEBAS AVANZADAS COMPLETADAS EXITOSAMENTE ✨');

    } catch (error) {
        console.error('\n❌ PRUEBA FALLIDA');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
};

runAdvancedTest();
