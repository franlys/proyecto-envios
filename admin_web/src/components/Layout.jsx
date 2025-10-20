// admin_web/src/components/Layout.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, FileText, Users, BarChart3, Settings, LogOut, HelpCircle, Building2, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userData, setUserData } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getRolDisplay = (rol) => {
    const roles = {
      'super_admin': 'Super Administrador',
      'admin': 'Administrador General',
      'secretaria': 'Secretaria',
      'almacen': 'Encargado de Almacén',
      'repartidor': 'Repartidor'
    };
    return roles[rol] || rol;
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Sistema de Envíos</h1>
          <p className="text-sm text-gray-400">v2.0</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {/* Dashboard - Todos */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === '/dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>

            {/* ==================== SUPER ADMIN ONLY ==================== */}
            {userData?.rol === 'super_admin' && (
              <>
                <Link
                  to="/companies"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === '/companies'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Building2 size={20} />
                  <span>Compañías</span>
                </Link>

                <Link
                  to="/empleados"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === '/empleados'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Users size={20} />
                  <span>Empleados</span>
                </Link>

                <Link
                  to="/tickets-admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === '/tickets-admin'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <HelpCircle size={20} />
                  <span>Tickets de Soporte</span>
                  {userData?.newTickets > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Nuevo
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* ==================== COMPANY USERS (admin, secretaria, almacen, repartidor) ==================== */}
            {userData?.rol !== 'super_admin' && (
              <>
                {/* Embarques - admin, secretaria, almacen */}
                {['admin', 'secretaria', 'almacen'].includes(userData?.rol) && (
                  <Link
                    to="/embarques"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === '/embarques'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Package size={20} />
                    <span>Embarques</span>
                  </Link>
                )}

                {/* Rutas - admin, secretaria, almacen */}
                {['admin', 'secretaria', 'almacen'].includes(userData?.rol) && (
                  <Link
                    to="/rutas"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === '/rutas'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Truck size={20} />
                    <span>Rutas</span>
                  </Link>
                )}

                {/* Panel Secretarias - admin, secretaria */}
                {['admin', 'secretaria'].includes(userData?.rol) && (
                  <Link
                    to="/secretarias"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === '/secretarias'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Briefcase size={20} />
                    <span>Panel Secretarias</span>
                  </Link>
                )}

                {/* Facturas No Entregadas - admin, secretaria, almacen */}
                {['admin', 'secretaria', 'almacen'].includes(userData?.rol) && (
                  <Link
                    to="/facturas-no-entregadas"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === '/facturas-no-entregadas'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <FileText size={20} />
                    <span>Facturas No Entregadas</span>
                  </Link>
                )}

                {/* Empleados - solo admin de compañía */}
                {userData?.rol === 'admin' && (
                  <Link
                    to="/empleados"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === '/empleados'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Users size={20} />
                    <span>Empleados</span>
                  </Link>
                )}

                {/* Reportes - admin, secretaria, almacen */}
                {['admin', 'secretaria', 'almacen'].includes(userData?.rol) && (
                  <Link
                    to="/reportes"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      location.pathname === '/reportes'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <BarChart3 size={20} />
                    <span>Reportes</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </nav>

        {/* Footer con Ayuda y User */}
        <div className="border-t border-gray-700">
          {/* Ayuda */}
          <Link
            to="/ayuda"
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              location.pathname === '/ayuda'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <HelpCircle size={20} />
            <span>Ayuda</span>
          </Link>

          {/* User Info */}
          <div className="p-4 bg-gray-900">
            <p className="text-sm text-gray-400">Sesión activa como:</p>
            <p className="font-medium truncate">{userData?.nombre || 'Usuario'}</p>
            <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Sistema de Envíos</h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notificaciones */}
              <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* User Dropdown */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {userData?.nombre?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{userData?.nombre}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getRolDisplay(userData?.rol)}</p>
                </div>
              </div>

              {/* Configuración */}
              <Link
                to="/configuracion"
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Settings size={20} />
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;