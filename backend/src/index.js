// backend/src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importar rutas
import authRoutes from './routes/auth.js';
import companiesRoutes from './routes/companies.js';
import empleadosRoutes from './routes/empleados.js';
import reportesRoutes from './routes/reportes.js';
import embarquesRoutes from './routes/embarques.js';
import rutasRoutes from './routes/rutas.js';
import ticketsRoutes from './routes/tickets.js';
// import facturasRoutes from './routes/facturas.js'; // ⛔ ELIMINADO - Ya no se usa
import recoleccionesRoutes from './routes/recolecciones.js'; // ✅ MANTENIDO
import contenedoresRoutes from './routes/contenedores.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();

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
// app.use('/api/facturas', facturasRoutes); // ⛔ ELIMINADO - Sistema antiguo descontinuado
app.use('/api/recolecciones', recoleccionesRoutes); // ✅ SISTEMA NUEVO
app.use('/api/contenedores', contenedoresRoutes);
app.use('/api/dashboard', dashboardRoutes);

// =====================================================
// RUTA RAÍZ
// =====================================================
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 API de Sistema de Envíos',
    version: '2.0.0',
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
      recolecciones: '/api/recolecciones', // ✅ NUEVO
      contenedores: '/api/contenedores',
      dashboard: '/api/dashboard'
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
      'GET    /api/health',
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'GET    /api/auth/profile',
      'PATCH  /api/auth/update-profile',
      'POST   /api/auth/change-password',
      'GET    /api/companies',
      'POST   /api/companies',
      'GET    /api/companies/my-limits',
      'GET    /api/companies/:id',
      'PATCH  /api/companies/:id',
      'DELETE /api/companies/:id',
      'GET    /api/empleados',
      'GET    /api/empleados/repartidores',
      'GET    /api/empleados/:id',
      'POST   /api/empleados',
      'PUT    /api/empleados/:id',
      'DELETE /api/empleados/:id',
      'PATCH  /api/empleados/:id/change-password',
      'GET    /api/reportes/rutas',
      'GET    /api/reportes/gastos',
      'GET    /api/reportes/facturas',
      'GET    /api/reportes/liquidacion/:empleadoId',
      'GET    /api/reportes/dashboard',
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
      'POST   /api/tickets',
      'GET    /api/tickets/my-tickets',
      'GET    /api/tickets/all',
      'PATCH  /api/tickets/:id/respond',
      'PATCH  /api/tickets/:id/close',
      '✅ POST   /api/recolecciones              (Crear recolección)',
      '✅ GET    /api/recolecciones              (Listar recolecciones)',
      '✅ GET    /api/recolecciones/:id          (Detalle recolección)',
      'POST   /api/contenedores/upload-from-drive',
      'GET    /api/contenedores',
      'GET    /api/contenedores/:numeroContenedor',
      'GET    /api/dashboard/stats',
      'GET    /api/dashboard/stats-super-admin',
      'GET    /api/dashboard/stats-admin-general',
      'GET    /api/dashboard/health'
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