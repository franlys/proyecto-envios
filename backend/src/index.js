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
import facturasRoutes from './routes/facturas.js'; // ✅ AGREGADO

dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// =====================================================
// HEALTH CHECK ENDPOINT
// =====================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'online',
      firebase: 'connected'
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
app.use('/api/facturas', facturasRoutes); // ✅ AGREGADO

// =====================================================
// RUTA RAÍZ
// =====================================================
app.get('/', (req, res) => {
  res.json({ 
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
      facturas: '/api/facturas' // ✅ AGREGADO
    }
  });
});

// =====================================================
// MIDDLEWARE PARA RUTAS NO ENCONTRADAS
// =====================================================
app.use('*', (req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    method: req.method,
    path: req.originalUrl,
    availableEndpoints: [
      'GET    /api/health',
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'GET    /api/companies',
      'POST   /api/companies',
      'GET    /api/empleados',
      'POST   /api/empleados',
      'PATCH  /api/empleados/change-password/:id',
      'GET    /api/reportes/rutas',
      'GET    /api/reportes/facturas',
      'GET    /api/embarques',
      'GET    /api/rutas',
      'GET    /api/facturas',              // ✅ AGREGADO
      'GET    /api/facturas/no-entregadas', // ✅ AGREGADO
      'POST   /api/tickets',
      'GET    /api/tickets/my-tickets',
      'GET    /api/tickets/all',
      'PATCH  /api/tickets/:id/respond',
      'PATCH  /api/tickets/:id/close'
    ]
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
  console.log('\n📋 Rutas disponibles:');
  console.log('   ✅ GET    /api/health');
  console.log('   ✅ POST   /api/auth/login');
  console.log('   ✅ POST   /api/auth/register');
  console.log('   ✅ GET    /api/companies');
  console.log('   ✅ POST   /api/companies');
  console.log('   ✅ GET    /api/empleados');
  console.log('   ✅ POST   /api/empleados');
  console.log('   ✅ PATCH  /api/empleados/change-password/:id');
  console.log('   ✅ GET    /api/reportes/rutas');
  console.log('   ✅ GET    /api/reportes/facturas');
  console.log('   ✅ GET    /api/embarques');
  console.log('   ✅ GET    /api/rutas');
  console.log('   ✅ GET    /api/facturas              ← NUEVO');
  console.log('   ✅ GET    /api/facturas/no-entregadas ← NUEVO');
  console.log('   ✅ POST   /api/tickets');
  console.log('   ✅ GET    /api/tickets/my-tickets');
  console.log('   ✅ GET    /api/tickets/all');
  console.log('   ✅ PATCH  /api/tickets/:id/respond');
  console.log('   ✅ PATCH  /api/tickets/:id/close');
  console.log('\n💡 Tip: Visita http://localhost:' + PORT + '/api/health\n');
});

export default app;