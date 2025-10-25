// admin_web/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Dashboard from './pages/Dashboard';
import DashboardSuperAdmin from './pages/DashboardSuperAdmin';
import Companies from './pages/Companies';
import Embarques from './pages/Embarques';
import Rutas from './pages/Rutas';
import Recolecciones from './pages/Recolecciones';
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
  
  if (userData?.rol === 'super_admin') {
    return <DashboardSuperAdmin />;
  }
  
  return <Dashboard />;
};

function AppContent() {
  const { userData } = useAuth();

  if (!userData) {
    return <Login />;
  }

  // Normalizar rol (admin → admin_general para compatibilidad)
  const rol = userData.rol === 'admin' ? 'admin_general' : userData.rol;

  return (
    <Layout>
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
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/rutas" element={<Rutas />} />
            <Route path="/secretarias" element={<PanelSecretarias />} />
            <Route path="/facturas-no-entregadas" element={<FacturasNoEntregadas />} />
            <Route path="/empleados" element={<Empleados />} />
            <Route path="/reportes" element={<Reportes />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA RECOLECTOR (solo recolecciones) */}
        {/* ============================================ */}
        {rol === 'recolector' && (
          <>
            <Route path="/recolecciones" element={<Recolecciones />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA ALMACÉN EE.UU. */}
        {/* ============================================ */}
        {rol === 'almacen_eeuu' && (
          <>
            <Route path="/recolecciones" element={<Recolecciones />} />
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/reportes" element={<Reportes />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA SECRETARÍA */}
        {/* ============================================ */}
        {rol === 'secretaria' && (
          <>
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/rutas" element={<Rutas />} />
            <Route path="/secretarias" element={<PanelSecretarias />} />
            <Route path="/facturas-no-entregadas" element={<FacturasNoEntregadas />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA ALMACÉN RD */}
        {/* ============================================ */}
        {rol === 'almacen_rd' && (
          <>
            <Route path="/embarques" element={<Embarques />} />
            <Route path="/rutas" element={<Rutas />} />
            <Route path="/facturas-no-entregadas" element={<FacturasNoEntregadas />} />
            <Route path="/reportes" element={<Reportes />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS PARA REPARTIDOR */}
        {/* ============================================ */}
        {rol === 'repartidor' && (
          <>
            <Route path="/rutas" element={<Rutas />} />
          </>
        )}

        {/* ============================================ */}
        {/* RUTAS COMUNES PARA TODOS */}
        {/* ============================================ */}
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