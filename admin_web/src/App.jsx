import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/auth/Login'; // ← CORREGIDO
import Dashboard from './pages/Dashboard';
import DashboardSuperAdmin from './pages/DashboardSuperAdmin';
import Companies from './pages/Companies';
import Embarques from './pages/Embarques';
import Rutas from './pages/Rutas';
import PanelSecretarias from './pages/PanelSecretarias';
import FacturasNoEntregadas from './pages/FacturasNoEntregadas';
import Empleados from './pages/Empleados';
import Reportes from './pages/Reportes';
import TicketsAdmin from './pages/TicketsAdmin';
import Configuracion from './pages/Configuracion';
import Ayuda from './pages/Ayuda';

// Componente que decide qué Dashboard mostrar según el rol
const DashboardRouter = () => {
  const { userData } = useAuth();
  
  // Si es SuperAdmin, mostrar DashboardSuperAdmin
  if (userData?.rol === 'super_admin') {
    return <DashboardSuperAdmin />;
  }
  
  // Si es cualquier otro rol, mostrar Dashboard de compañía
  return <Dashboard />;
};

function AppContent() {
  const { userData } = useAuth();

  if (!userData) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        {/* Dashboard dinámico según rol */}
        <Route path="/dashboard" element={<DashboardRouter />} />
        
        {/* SuperAdmin Routes */}
        {userData.rol === 'super_admin' && (
          <>
            <Route path="/companies" element={<Companies />} />
            <Route path="/tickets-admin" element={<TicketsAdmin />} />
          </>
        )}

        {/* Company Users Routes */}
        {userData.rol !== 'super_admin' && (
          <>
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/rutas" element={<Rutas />} />
            <Route path="/secretarias" element={<PanelSecretarias />} />
            <Route path="/facturas-no-entregadas" element={<FacturasNoEntregadas />} />
            <Route path="/reportes" element={<Reportes />} />
          </>
        )}

        {/* Common Routes */}
        <Route path="/empleados" element={<Empleados />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/ayuda" element={<Ayuda />} />
        
        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;