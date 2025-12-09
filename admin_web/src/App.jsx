// admin_web/src/App.jsx
// ✅ ACTUALIZADO: Añadido <Toaster /> para notificaciones profesionales

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'sonner'; // ✅ 1. Importar Toaster
import useHeartbeat from './hooks/useHeartbeat'; // ✅ Heartbeat automático
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Dashboard from './pages/Dashboard';
import DashboardSuperAdmin from './pages/DashboardSuperAdmin';
import Companies from './pages/Companies';
import Embarques from './pages/Embarques';
import Rutas from './pages/Rutas';
// ✅ CORRECCIÓN: Importar DetalleRuta para usar la ruta con parámetro
import DetalleRuta from './pages/DetalleRuta';
import Recolecciones from './pages/Recolecciones';
import NuevaRecoleccion from './pages/NuevaRecoleccion';
import PanelSecretarias from './pages/PanelSecretarias';
import PanelCargadores from './pages/PanelCargadores';
import PanelRepartidores from './pages/PanelRepartidores';
import FacturasNoEntregadas from './pages/FacturasNoEntregadas';
import Empleados from './pages/Empleados';
import Reportes from './pages/Reportes';
import TicketsAdmin from './pages/TicketsAdmin';
import Configuracion from './pages/Configuracion';
import Ayuda from './pages/Ayuda';
import PanelAlmacenUSA from './pages/PanelAlmacenUSA';
import PanelAlmacenRD from './pages/PanelAlmacenRD';
import FacturasPendientesPago from './pages/FacturasPendientesPago';
import PublicTracking from './pages/PublicTracking'; // ✅ NUEVO - Tracking Público
import ImpresionFacturasRuta from './components/ImpresionFacturasRuta'; // ✅ NUEVO - Impresión de facturas
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// ✅ NUEVO - Módulo Financiero (simplificado - sin layout separado)
import FinanzasDashboard from './pages/Finanzas/Dashboard';

// ✅ Sistema de roles y permisos
import ProtectedRoute from './components/auth/ProtectedRoute';
import AccessDenied from './pages/AccessDenied';

// Componente que decide qué Dashboard mostrar según el rol
const DashboardRouter = () => {
  const { userData } = useAuth();

  if (userData?.rol === 'super_admin') {
    return <DashboardSuperAdmin />;
  }

  // Propietario ve el dashboard operativo de su empresa (NO el financiero)
  // El dashboard financiero está en /finanzas
  return <Dashboard />;
};

function AppContent() {
  const { userData, loading } = useAuth();
  const [isExitingLogin, setIsExitingLogin] = useState(false);

  // 💓 Enviar heartbeat automático cada 90 segundos
  useHeartbeat(90000);

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show Login if not authenticated OR if we are in the middle of the exit animation
  if (!userData || isExitingLogin) {
    return (
      <Login
        onLoginStart={() => setIsExitingLogin(true)}
        onExitComplete={() => setIsExitingLogin(false)}
      />
    );
  }

  // Normalizer rol (admin → admin_general para compatibilidad)
  const rol = userData.rol === 'admin' ? 'admin_general' : userData.rol;

  return (
    <Layout>
      {/* ✅ 2. Añadir el componente Toaster aquí - bottom-center para mejor visibilidad en móvil */}
      <Toaster
        richColors
        position="bottom-center"
        expand={true}
        closeButton={true}
        duration={4000}
      />
      <Routes>
        {/* Dashboard dinámico según rol */}
        <Route path="/dashboard" element={<DashboardRouter />} />

        {/* ============================================ */}
        {/* RUTAS PARA SUPER ADMIN */}
        {/* ============================================ */}
        {rol === 'super_admin' && (
          <>
            <Route path="/companies" element={<Companies />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/tickets-admin" element={<TicketsAdmin />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA ADMIN GENERAL (acceso total) */}
        {/* ============================================ */}
        {rol === 'admin_general' && (
          <>
            <Route path="/recolecciones" element={<Recolecciones />} />
            <Route path="/recolecciones/nueva" element={<NuevaRecoleccion />} />
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/rutas" element={<Rutas />} />
            {/* ✅ CORRECCIÓN: Agregar ruta de detalle con parámetro */}
            <Route path="/rutas/:id" element={<DetalleRuta />} />
            <Route path="/secretarias" element={<PanelSecretarias />} />
            <Route path="/cargadores" element={<PanelCargadores />} />
            <Route path="/repartidores" element={<PanelRepartidores />} />
            <Route path="/facturas-no-entregadas" element={<FacturasNoEntregadas />} />
            <Route path="/facturas-pendientes-pago" element={<FacturasPendientesPago />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/almacen-usa" element={<PanelAlmacenUSA />} />
            <Route path="/almacen-rd" element={<PanelAlmacenRD />} />

          </>
        )}

        {/* ============================================ */}
        {/* 💼 MÓDULO FINANCIERO - Solo Propietario y Super Admin */}
        {/* ============================================ */}
        <Route path="/finanzas" element={
          <ProtectedRoute modulo="finanzas">
            <FinanzasDashboard />
          </ProtectedRoute>
        } />

        {/* ============================================ */}
        {/* RUTAS PARA PROPIETARIO (solo dashboards) */}
        {/* ============================================ */}
        {rol === 'propietario' && (
          <>
            {/* El propietario solo ve dashboards - NO operaciones */}
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA RECOLECTOR (solo recolecciones) */}
        {/* ============================================ */}
        {rol === 'recolector' && (
          <>
            <Route path="/recolecciones" element={<Recolecciones />} />
            <Route path="/recolecciones/nueva" element={<NuevaRecoleccion />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA ALMACÉN EE.UU. */}
        {/* ============================================ */}
        {rol === 'almacen_eeuu' && (
          <>
            <Route path="/recolecciones" element={<Recolecciones />} />
            <Route path="/recolecciones/nueva" element={<NuevaRecoleccion />} />
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/almacen-usa" element={<PanelAlmacenUSA />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA SECRETARÍA */}
        {/* ============================================ */}
        {rol === 'secretaria' && (
          <>
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/rutas" element={<Rutas />} />
            {/* ✅ CORRECCIÓN: Agregar ruta de detalle con parámetro */}
            <Route path="/rutas/:id" element={<DetalleRuta />} />
            <Route path="/secretarias" element={<PanelSecretarias />} />
            <Route path="/facturas-no-entregadas" element={<FacturasNoEntregadas />} />
            <Route path="/facturas-pendientes-pago" element={<FacturasPendientesPago />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA CARGADOR (NUEVO) */}
        {/* ============================================ */}
        {rol === 'cargador' && (
          <>
            <Route path="/cargadores" element={<PanelCargadores />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA ALMACÉN RD */}
        {/* ============================================ */}
        {rol === 'almacen_rd' && (
          <>
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/rutas" element={<Rutas />} />
            {/* ✅ CORRECCIÓN: Agregar ruta de detalle con parámetro */}
            <Route path="/rutas/:id" element={<DetalleRuta />} />
            <Route path="/facturas-no-entregadas" element={<FacturasNoEntregadas />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/almacen-rd" element={<PanelAlmacenRD />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA REPARTIDOR (ACTUALIZADO) */}
        {/* ============================================ */}
        {rol === 'repartidor' && (
          <>
            <Route path="/rutas" element={<Rutas />} />
            {/* ✅ CORRECCIÓN: Agregar ruta de detalle con parámetro */}
            <Route path="/rutas/:id" element={<DetalleRuta />} />
            <Route path="/repartidores" element={<PanelRepartidores />} />
            <Route path="/facturas-pendientes-pago" element={<FacturasPendientesPago />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS COMUNES PARA TODOS */}
        {/* ============================================ */}
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/ayuda" element={<Ayuda />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* ============================================ */}
          {/* RUTAS PÚBLICAS (sin autenticación) */}
          {/* ============================================ */}
          <Route path="/tracking" element={<PublicTracking />} />
          <Route path="/tracking/:codigo" element={<PublicTracking />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ============================================ */}
          {/* RUTA DE IMPRESIÓN (sin Layout) */}
          {/* ============================================ */}
          <Route path="/rutas/:rutaId/imprimir" element={<ImpresionFacturasRuta />} />

          {/* ============================================ */}
          {/* RUTAS PRIVADAS (requieren autenticación) */}
          {/* ============================================ */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;