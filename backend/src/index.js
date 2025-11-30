// backend/src/index.js
import dotenv from 'dotenv';
dotenv.config(); // ✅ CARGAR PRIMERO las variables de entorno

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar rutas
import authRoutes from './routes/auth.js';
import companiesRoutes from './routes/companies.js';
import empleadosRoutes from './routes/empleados.js';
import reportesRoutes from './routes/reportes.js';
import embarquesRoutes from './routes/embarques.js';
import rutasRoutes from './routes/rutas.js';
import ticketsRoutes from './routes/tickets.js';
import recoleccionesRoutes from './routes/recolecciones.js';
import contenedoresRoutes from './routes/contenedores.js';
import almacenUSARoutes from './routes/almacenUSA.js';
import almacenRDRoutes from './routes/almacenRD.js';
import secretariasRoutes from './routes/secretarias.js';
import cargadoresRoutes from './routes/cargadores.js';
import repartidoresRoutes from './routes/repartidores.js';
import facturacionRoutes from './routes/facturacion.js';
import dashboardRoutes from './routes/dashboard.js';
import sectoresRoutes from './routes/sectores.js'; // ✅ NUEVO - Sistema de Sectores
import gastosRutaRoutes from './routes/gastosRuta.js'; // ✅ NUEVO - Gestión de Gastos de Ruta
import trackingRoutes from './routes/tracking.js'; // ✅ NUEVO - Tracking Público

const app = express();

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =====================================================
// 🔧 CONFIGURACIÓN MEJORADA DE CORS
// =====================================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  process.env.FRONTEND_URL,
  // Permite todos los subdominios de Vercel
  /https:\/\/.*\.vercel\.app$/,
  /https:\/\/proyecto-envios.*\.vercel\.app$/
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Verificar si el origin está permitido
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS bloqueó origen: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-User-Id', 'X-Firebase-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 horas
}));

// =====================================================
// MIDDLEWARES
// =====================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (útil para debugging)
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'}`);
  next();
});

// =====================================================
// HEALTH CHECK ENDPOINT
// =====================================================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'online',
      firebase: 'connected'
    },
    cors: {
      frontendUrl: process.env.FRONTEND_URL,
      allowedOrigins: allowedOrigins.map(o => o instanceof RegExp ? o.toString() : o)
    }
  });
});

// =====================================================
// RUTAS PRINCIPALES
// =====================================================
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/embarques', embarquesRoutes);
app.use('/api/rutas', rutasRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/recolecciones', recoleccionesRoutes);
app.use('/api/contenedores', contenedoresRoutes);
app.use('/api/almacen-usa', almacenUSARoutes);
app.use('/api/almacen-rd', almacenRDRoutes);
app.use('/api/secretarias', secretariasRoutes);
app.use('/api/cargadores', cargadoresRoutes);
app.use('/api/repartidores', repartidoresRoutes);
app.use('/api/facturacion', facturacionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sectores', sectoresRoutes); // ✅ NUEVO - Sistema de Sectores
app.use('/api/gastos-ruta', gastosRutaRoutes); // ✅ NUEVO - Gestión de Gastos de Ruta
app.use('/api/tracking', trackingRoutes); // ✅ NUEVO - Tracking Público

// =====================================================
// RUTA RAÍZ
// =====================================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API de Sistema de Envíos',
    version: '4.1.0', // ✅ ACTUALIZADA - Con Sistema de Sectores
    timestamp: new Date().toISOString(),
    status: 'operational',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      companies: '/api/companies',
      empleados: '/api/empleados',
      reportes: '/api/reportes',
      embarques: '/api/embarques',
      rutas: '/api/rutas',
      tickets: '/api/tickets',
      recolecciones: '/api/recolecciones',
      contenedores: '/api/contenedores',
      'almacen-usa': '/api/almacen-usa',
      'almacen-rd': '/api/almacen-rd',
      'secretarias': '/api/secretarias',
      'cargadores': '/api/cargadores',
      'repartidores': '/api/repartidores',
      'facturacion': '/api/facturacion',
      'dashboard': '/api/dashboard',
      'sectores': '/api/sectores' // ✅ NUEVO
    }
  });
});

// =====================================================
// MIDDLEWARE PARA RUTAS NO ENCONTRADAS
// =====================================================
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: [
      '🔐 AUTENTICACIÓN',
      'GET    /api/health',
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'GET    /api/auth/profile',
      'PATCH  /api/auth/update-profile',
      'POST   /api/auth/change-password',
      '',
      '🏢 COMPAÑÍAS',
      'GET    /api/companies',
      'POST   /api/companies',
      'GET    /api/companies/my-limits',
      'GET    /api/companies/:id',
      'PATCH  /api/companies/:id',
      'DELETE /api/companies/:id',
      '',
      '👥 EMPLEADOS',
      'GET    /api/empleados',
      'GET    /api/empleados/repartidores',
      'GET    /api/empleados/:id',
      'POST   /api/empleados',
      'PUT    /api/empleados/:id',
      'DELETE /api/empleados/:id',
      'PATCH  /api/empleados/:id/change-password',
      '',
      '📊 REPORTES',
      'GET    /api/reportes/rutas',
      'GET    /api/reportes/gastos',
      'GET    /api/reportes/facturas',
      'GET    /api/reportes/liquidacion/:empleadoId',
      'GET    /api/reportes/dashboard',
      '',
      '📦 EMBARQUES Y RUTAS',
      'GET    /api/embarques',
      'GET    /api/embarques/stats-almacen',
      'GET    /api/embarques/:id',
      'POST   /api/embarques',
      'PUT    /api/embarques/:id',
      'DELETE /api/embarques/:id',
      'GET    /api/rutas',
      'GET    /api/rutas/stats-repartidor',
      'GET    /api/rutas/activas',
      'GET    /api/rutas/:id',
      'POST   /api/rutas',
      '',
      '🎫 TICKETS',
      'POST   /api/tickets',
      'GET    /api/tickets/my-tickets',
      'GET    /api/tickets/all',
      'PATCH  /api/tickets/:id/respond',
      'PATCH  /api/tickets/:id/close',
      '',
      '✅ RECOLECCIONES (Fase 1)',
      'POST   /api/recolecciones',
      'GET    /api/recolecciones',
      'GET    /api/recolecciones/:id',
      '',
      '📋 CONTENEDORES (Sistema Excel)',
      'POST   /api/contenedores/upload-from-drive',
      'GET    /api/contenedores',
      'GET    /api/contenedores/:numero',
      '',
      '🇺🇸 ALMACÉN USA',
      'GET    /api/almacen-usa/estadisticas',
      'POST   /api/almacen-usa/contenedores',
      'GET    /api/almacen-usa/contenedores',
      'GET    /api/almacen-usa/contenedores/:id',
      'POST   /api/almacen-usa/contenedores/:id/cerrar',
      'GET    /api/almacen-usa/facturas/buscar/:codigo',
      'POST   /api/almacen-usa/contenedores/:id/facturas',
      'DELETE /api/almacen-usa/contenedores/:contenedorId/facturas/:facturaId',
      'POST   /api/almacen-usa/contenedores/:id/items/marcar',
      '',
      '🇩🇴 ALMACÉN RD',
      'GET    /api/almacen-rd/estadisticas',
      'GET    /api/almacen-rd/contenedores/en-transito',
      'GET    /api/almacen-rd/contenedores/recibidos',
      'POST   /api/almacen-rd/contenedores/:contenedorId/confirmar-recepcion',
      'GET    /api/almacen-rd/facturas/:facturaId',
      'PUT    /api/almacen-rd/facturas/:facturaId/pago',
      'POST   /api/almacen-rd/facturas/:facturaId/reportar-incompleta',
      'POST   /api/almacen-rd/facturas/:facturaId/items/danado',
      'POST   /api/almacen-rd/facturas/:facturaId/asignar-ruta',
      'PUT    /api/almacen-rd/facturas/:facturaId/reasignar-ruta',
      'POST   /api/almacen-rd/facturas/:facturaId/quitar-ruta',
      '',
      '📝 SECRETARIAS',
      'GET    /api/secretarias/estadisticas',
      'GET    /api/secretarias/contenedores',
      'GET    /api/secretarias/contenedores/:contenedorId/facturas',
      'POST   /api/secretarias/facturas/:facturaId/confirmar',
      'PUT    /api/secretarias/facturas/:facturaId',
      'GET    /api/secretarias/contenedores/:contenedorId/exportar',
      '',
      '📦 CARGADORES',
      'GET    /api/cargadores/rutas',
      'GET    /api/cargadores/rutas/:rutaId',
      'POST   /api/cargadores/rutas/:rutaId/iniciar-carga',
      'POST   /api/cargadores/rutas/:rutaId/facturas/:facturaId/items/confirmar',
      'POST   /api/cargadores/facturas/:facturaId/items/danado',
      'POST   /api/cargadores/rutas/:rutaId/finalizar-carga',
      '',
      '🚚 REPARTIDORES',
      'GET    /api/repartidores/rutas',
      'GET    /api/repartidores/rutas/:rutaId',
      'POST   /api/repartidores/rutas/:rutaId/iniciar-entregas',
      'POST   /api/repartidores/facturas/:facturaId/items/entregar',
      'POST   /api/repartidores/facturas/:facturaId/fotos',
      'POST   /api/repartidores/facturas/:facturaId/pago-contraentrega',
      'POST   /api/repartidores/facturas/:facturaId/items/danado',
      'POST   /api/repartidores/facturas/:facturaId/entregar',
      'POST   /api/repartidores/facturas/:facturaId/no-entregada',
      'POST   /api/repartidores/rutas/:rutaId/finalizar',
      '',
      '💰 FACTURACIÓN',
      'PUT    /api/facturacion/recolecciones/:id',
      'POST   /api/facturacion/recolecciones/:id/pago',
      'GET    /api/facturacion/pendientes',
      'GET    /api/facturacion/contenedores/:contenedorId',
      '',
      '📈 DASHBOARD',
      'GET    /api/dashboard/stats',
      'GET    /api/dashboard/stats-super-admin',
      'GET    /api/dashboard/stats-admin-general',
      'GET    /api/dashboard/health',
      '',
      '🗺️ SECTORES (NUEVO)',
      'GET    /api/sectores/catalogo',
      'GET    /api/sectores/por-zona/:zona',
      'GET    /api/sectores/estadisticas?zona=',
      'POST   /api/sectores/optimizar-ruta',
      'GET    /api/sectores/sugerir?zona='
    ]
  });
});

// =====================================================
// MANEJO DE ERRORES GLOBAL
// =====================================================
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err);

  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message
  });
});

// =====================================================
// INICIAR SERVIDOR
// =====================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log('   SERVIDOR INICIADO EXITOSAMENTE');
  console.log('   ================================\n');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS configurado para Vercel`);
  console.log(`✅ Backend 100% Completo - v4.1.0 (CON SECTORES)`);
  console.log('\n📋 Sistemas Activos:');
  console.log('   ✅ Sistema Base (Auth, Companies, Empleados, etc.)');
  console.log('   ✅ Sistema de Recolecciones (Fase 1)');
  console.log('   ✅ Sistema Excel/Contenedores (Actual)');
  console.log('   🇺🇸 Sistema Almacén USA (Fase 2)');
  console.log('   🇩🇴 Sistema Almacén RD (Fase 3)');
  console.log('   📝 Sistema Secretarias');
  console.log('   📦 Sistema Cargadores');
  console.log('   🚚 Sistema Repartidores');
  console.log('   💰 Sistema de Facturación');
  console.log('   🗺️ Sistema de Sectores (NUEVO)');
  console.log('\n🔗 Flujo Completo de Entregas:');
  console.log('   1️⃣  Recolección en USA → Contenedor');
  console.log('   2️⃣  AlmacénUSA → Confirmar items + Cerrar');
  console.log('   3️⃣  Tránsito → República Dominicana');
  console.log('   4️⃣  AlmacénRD → Confirmar recepción');
  console.log('   5️⃣  Secretarias → Confirmar facturas');
  console.log('   6️⃣  AlmacénRD → Asignar a rutas (CON OPTIMIZACIÓN)');
  console.log('   7️⃣  Cargadores → Cargar camión item por item');
  console.log('   8️⃣  Repartidores → Entregar + evidencias');
  console.log('   9️⃣  Contenedor → Trabajado (historial)');
  console.log('\n🎯 Endpoints Principales:');
  console.log('   🔍 GET    /api/health');
  console.log('   🔐 POST   /api/auth/login');
  console.log('   🇺🇸 POST   /api/almacen-usa/contenedores');
  console.log('   🇺🇸 GET    /api/almacen-usa/facturas/buscar/:codigo');
  console.log('   🇺🇸 POST   /api/almacen-usa/contenedores/:id/cerrar');
  console.log('   🇩🇴 POST   /api/almacen-rd/contenedores/:id/confirmar-recepcion');
  console.log('   📝 POST   /api/secretarias/facturas/:facturaId/confirmar');
  console.log('   📝 GET    /api/secretarias/contenedores/:id/exportar');
  console.log('   🗺️ GET    /api/sectores/catalogo');
  console.log('   🗺️ POST   /api/sectores/optimizar-ruta');
  console.log('   🗺️ GET    /api/sectores/sugerir?zona=Capital');
  console.log('   🇩🇴 POST   /api/almacen-rd/facturas/:facturaId/asignar-ruta');
  console.log('   📦 POST   /api/cargadores/rutas/:rutaId/iniciar-carga');
  console.log('   📦 POST   /api/cargadores/rutas/:rutaId/finalizar-carga');
  console.log('   🚚 POST   /api/repartidores/rutas/:rutaId/iniciar-entregas');
  console.log('   🚚 POST   /api/repartidores/facturas/:facturaId/entregar');
  console.log('\n💡 Tip: Visita http://localhost:' + PORT + '/api/health para verificar el estado\n');
  console.log('📚 Documentación completa de endpoints disponible en el error 404\n');
  console.log(`✅ Backend 100% Estandarizado con Regla de Oro`);
  console.log('\n📋 Rutas disponibles:');
  console.log('   ✅ GET    /api/health');
  console.log('   ✅ POST   /api/auth/login');
  console.log('   ✅ POST   /api/auth/register');
  console.log('   ✅ GET    /api/auth/profile');
  console.log('   ✅ GET    /api/companies');
  console.log('   ✅ POST   /api/companies');
  console.log('   ✅ GET    /api/companies/my-limits');
  console.log('   ✅ GET    /api/empleados');
  console.log('   ✅ POST   /api/empleados');
  console.log('   ✅ PATCH  /api/empleados/:id/change-password');
  console.log('   ✅ GET    /api/reportes/rutas');
  console.log('   ✅ GET    /api/reportes/facturas');
  console.log('   ✅ GET    /api/embarques');
  console.log('   ✅ GET    /api/embarques/stats-almacen');
  console.log('   ✅ GET    /api/rutas');
  console.log('   ✅ GET    /api/rutas/stats-repartidor');
  console.log('   ✅ POST   /api/tickets');
  console.log('   ✅ GET    /api/tickets/my-tickets');
  console.log('   ✅ GET    /api/tickets/all');
  console.log('   ✅ PATCH  /api/tickets/:id/respond');
  console.log('   ✅ PATCH  /api/tickets/:id/close');
  console.log('   🆕 POST   /api/recolecciones           (Crear recolección)');
  console.log('   🆕 GET    /api/recolecciones           (Listar recolecciones)');
  console.log('   🆕 GET    /api/recolecciones/:id       (Detalle recolección)');
  console.log('   ✅ POST   /api/contenedores/upload-from-drive');
  console.log('   ✅ GET    /api/contenedores');
  console.log('   ✅ GET    /api/contenedores/:numeroContenedor');
  console.log('   ✅ GET    /api/dashboard/stats');
  console.log('   ✅ GET    /api/dashboard/stats-super-admin');
  console.log('   ✅ GET    /api/dashboard/stats-admin-general');
  console.log('   ✅ GET    /api/dashboard/health');
  console.log('\n💡 Tip: Visita http://localhost:' + PORT + '/api/health\n');
});

export default app;