// admin_web/src/components/Layout.jsx
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

// Importar componentes de notificaciones (si existen)
let NotificationListener, NotificationPanel, NotificationToast, ModalDetalleFactura, useNotifications;
try {
  NotificationListener = require('./notifications/NotificationListener').default;
  NotificationPanel = require('./notifications/NotificationPanel').default;
  NotificationToast = require('./notifications/NotificationToast').default;
  ModalDetalleFactura = require('./modals/ModalDetalleFactura').default;
  useNotifications = require('../hooks/useNotifications').useNotifications;
} catch (error) {
  // Si no existen los componentes de notificaciones, usar versiones dummy
  console.log('Componentes de notificaciones no encontrados, usando versiones básicas');
}

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  // Hook de notificaciones (si existe)
  const notificationHook = useNotifications ? useNotifications() : {
    notifications: [],
    showPanel: false,
    currentToast: null,
    unreadCount: 0,
    addNotification: () => {},
    loadExistingNotifications: () => {},
    markAsRead: () => {},
    closeToast: () => {},
    togglePanel: () => {},
    setShowPanel: () => {}
  };

  const {
    notifications,
    showPanel,
    currentToast,
    unreadCount,
    addNotification,
    loadExistingNotifications,
    markAsRead,
    closeToast,
    togglePanel,
    setShowPanel
  } = notificationHook;

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      } else {
        await signOut(auth);
      }
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleViewDetails = (factura) => {
    setSelectedFactura(factura);
    setShowDetalleModal(true);
    if (setShowPanel) setShowPanel(false);
  };

  // Normalizar rol (admin → admin_general)
  const rol = userData?.rol === 'admin' ? 'admin_general' : userData?.rol || 'admin_general';

  // Definir menú completo según rol
  const getMenuByRole = () => {
    const menus = {
      super_admin: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/companies', label: 'Compañías', icon: '🏢' },
        { path: '/tickets-admin', label: 'Tickets', icon: '🎫' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      admin_general: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/recolecciones', label: 'Recolecciones', icon: '📦' },
        { path: '/embarques', label: 'Embarques', icon: '🚢' },
        { path: '/secretarias', label: 'Panel Secretarías', icon: '📋' },
        { path: '/rutas', label: 'Rutas', icon: '🗺️' },
        { path: '/facturas-no-entregadas', label: 'No Entregadas', icon: '⚠️' },
        { path: '/empleados', label: 'Empleados', icon: '👥' },
        { path: '/reportes', label: 'Reportes', icon: '📈' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      recolector: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/recolecciones', label: 'Mis Recolecciones', icon: '📦' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      secretaria: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/secretarias', label: 'Confirmar Facturas', icon: '📋' },
        { path: '/embarques', label: 'Ver Embarques', icon: '🚢' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      almacen: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/embarques', label: 'Embarques', icon: '🚢' },
        { path: '/rutas', label: 'Crear Rutas', icon: '🗺️' },
        { path: '/facturas-no-entregadas', label: 'No Entregadas', icon: '⚠️' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      almacen_rd: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/embarques', label: 'Embarques', icon: '🚢' },
        { path: '/rutas', label: 'Crear Rutas', icon: '🗺️' },
        { path: '/facturas-no-entregadas', label: 'No Entregadas', icon: '⚠️' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      almacen_eeuu: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/recolecciones', label: 'Recolecciones', icon: '📦' },
        { path: '/embarques', label: 'Embarques', icon: '🚢' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      repartidor: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/rutas', label: 'Mis Rutas', icon: '🗺️' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ]
    };

    return menus[rol] || menus.admin_general;
  };

  const menuItems = getMenuByRole();

  const getRolName = () => {
    const roles = {
      super_admin: 'Super Admin',
      admin_general: 'Administrador',
      recolector: 'Recolector',
      secretaria: 'Secretaría',
      almacen: 'Almacén RD',
      almacen_rd: 'Almacén RD',
      almacen_eeuu: 'Almacén EE.UU.',
      repartidor: 'Repartidor'
    };
    return roles[rol] || 'Usuario';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Listener de notificaciones (si existe) */}
      {NotificationListener && (
        <NotificationListener 
          onNewNotification={addNotification}
          onLoadExisting={loadExistingNotifications}
        />
      )}

      {/* Toast de notificación (si existe y hay toast) */}
      {NotificationToast && currentToast && (
        <NotificationToast
          notification={currentToast}
          onClose={closeToast}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Panel de notificaciones (si existe y está visible) */}
      {NotificationPanel && showPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowPanel(false)}
          />
          <NotificationPanel
            notifications={notifications}
            onClose={() => setShowPanel(false)}
            onMarkAsRead={markAsRead}
            onViewDetails={handleViewDetails}
          />
        </>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Sistema de Envíos</h1>
            </div>

            {/* Usuario y notificaciones */}
            <div className="flex items-center gap-4">
              {/* Notificaciones (si existe el componente) */}
              {useNotifications && (
                <button 
                  onClick={togglePanel}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Usuario */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">{userData?.nombre || 'Usuario'}</p>
                    <p className="text-xs text-gray-500">{getRolName()}</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {userData?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">{userData?.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">{userData?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/configuracion');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      ⚙️ Configuración
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-md min-h-[calc(100vh-64px)] sticky top-16">
          <nav className="p-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
                  location.pathname === item.path
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </div>

      {/* Modal de detalle de factura (si existe y hay factura seleccionada) */}
      {ModalDetalleFactura && showDetalleModal && selectedFactura && (
        <ModalDetalleFactura
          factura={selectedFactura}
          onClose={() => {
            setShowDetalleModal(false);
            setSelectedFactura(null);
          }}
        />
      )}
    </div>
  );
};

export default Layout;