// admin_web/src/components/Layout.jsx
// ✅ ACTUALIZADO: Links de Cargadores + Repartidores + Almacén RD
// ✅ CORREGIDO: Scroll independiente para el contenido principal.

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Bell, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import logo from '../assets/logo.png';
import { useTheme } from '../hooks/useTheme';

// ✅ Importar componentes de notificaciones con imports estáticos
import NotificationListener from './notifications/NotificationListener';
import NotificationPanel from './notifications/NotificationPanel';
import NotificationToast from './notifications/NotificationToast';
import ModalDetalleFactura from './modals/ModalDetalleFactura';
import { useNotifications } from '../hooks/useNotifications';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Estado para controlar el sidebar en móvil

  // ✅ Hook de tema - Aplica modo oscuro automáticamente
  useTheme();

  // ✅ Hook de notificaciones - SIEMPRE se debe llamar
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
  } = useNotifications();

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
        { path: '/finanzas', label: 'Finanzas', icon: '💼' },
        { path: '/companies', label: 'Compañías', icon: '🏢' },
        { path: '/tickets-admin', label: 'Tickets', icon: '🎫' },
        { path: '/configuracion/whatsapp', label: 'WhatsApp Cloud', icon: '📱' }, // ✅ NUEVO
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      // 💼 PROPIETARIO - Dashboard ejecutivo (solo informativo y estadísticas)
      propietario: [
        { path: '/dashboard', label: 'Dashboard Ejecutivo', icon: '📊' },
        { path: '/finanzas', label: 'Finanzas', icon: '💼' },
        { path: '/reportes', label: 'Reportes', icon: '📈' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      // 👨‍💼 ADMIN GENERAL - Operaciones completas (sin finanzas)
      admin_general: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/recolecciones', label: 'Recolecciones', icon: '📦' },
        { path: '/embarques', label: 'Embarques', icon: '🚢' },
        { path: '/almacen-usa', label: 'Almacén USA', icon: '🏭' },
        { path: '/almacen-rd', label: 'Almacén RD', icon: '🚚' },
        { path: '/secretarias', label: 'Panel Secretarías', icon: '📋' },
        { path: '/cargadores', label: 'Panel Cargadores', icon: '📦' },
        { path: '/repartidores', label: 'Panel Repartidores', icon: '🚗' },
        { path: '/rutas', label: 'Rutas', icon: '🗺️' },
        { path: '/facturas-no-entregadas', label: 'No Entregadas', icon: '⚠️' },
        { path: '/facturas-pendientes-pago', label: 'Facturas Pendientes', icon: '💰' },
        { path: '/empleados', label: 'Empleados', icon: '👥' },
        { path: '/reportes', label: 'Reportes', icon: '📈' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      recolector: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/recolecciones', label: 'Mis Recolecciones', icon: '📦' },
        { path: '/pool', label: 'Bolsa de Cargas', icon: '📍' }, // ✅ SOLICITADO
        { path: '/recolecciones/nueva', label: 'Nueva Recolección', icon: '➕' }, // ✅ DIRECTO
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      secretaria_usa: [ // ✅ NUEVO ROL DEFINIDO
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/call-center', label: 'Call Center USA', icon: '📞' },
        { path: '/recolecciones/nueva', label: 'Agendar Cita', icon: '📅' }, // Solicitud explícita del usuario
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      secretaria: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/secretarias', label: 'Confirmar Facturas', icon: '📋' },
        { path: '/embarques', label: 'Ver Embarques', icon: '🚢' },
        { path: '/facturas-pendientes-pago', label: 'Facturas Pendientes', icon: '💰' },
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
        { path: '/almacen-rd', label: 'Almacén RD', icon: '🚚' },
        { path: '/embarques', label: 'Embarques', icon: '🚢' },
        { path: '/rutas', label: 'Crear Rutas', icon: '🗺️' },
        { path: '/facturas-no-entregadas', label: 'No Entregadas', icon: '⚠️' },
        { path: '/reportes', label: 'Reportes', icon: '📈' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      almacen_eeuu: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/recolecciones', label: 'Recolecciones', icon: '📦' },
        { path: '/recolecciones/nueva', label: 'Nueva Recolección', icon: '➕' }, // ✅ DIRECTO
        { path: '/almacen-usa', label: 'Almacén USA', icon: '🏭' },
        { path: '/embarques', label: 'Embarques', icon: '🚢' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      cargador: [ // ✅ NUEVO ROL
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/cargadores', label: 'Mis Rutas', icon: '📦' },
        { path: '/configuracion', label: 'Configuración', icon: '⚙️' },
        { path: '/ayuda', label: 'Ayuda', icon: '❓' }
      ],
      repartidor: [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/repartidores', label: 'Mis Entregas', icon: '🚗' }, // ✅ ACTUALIZADO
        { path: '/rutas', label: 'Ver Rutas', icon: '🗺️' },
        { path: '/facturas-pendientes-pago', label: 'Facturas Pendientes', icon: '💰' },
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
      propietario: 'Propietario',
      admin_general: 'Administrador',
      recolector: 'Recolector',
      secretaria: 'Secretaría',
      cargador: 'Cargador',
      almacen: 'Almacén RD',
      almacen_rd: 'Almacén RD',
      almacen_eeuu: 'Almacén EE.UU.',
      secretaria_usa: 'Secretaría USA', // ✅ Label correcto
      repartidor: 'Repartidor'
    };
    return roles[rol] || 'Usuario';
  };

  // ✅ Roles que tienen acceso a notificaciones de facturas
  const rolesConNotificaciones = ['admin_general', 'super_admin', 'almacen_rd', 'secretaria', 'repartidor'];
  const mostrarNotificaciones = userData?.rol && rolesConNotificaciones.includes(userData.rol);

  return (
    // CAMBIO 1: El div principal ahora es 'h-screen' (altura de pantalla completa),
    // 'flex flex-col' (para apilar header y contenido) y 'overflow-hidden' (para evitar el scroll de la página).
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* Listener de notificaciones (solo para roles con acceso a facturas) */}
      {NotificationListener && mostrarNotificaciones && (
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

      {/* CAMBIO 2: El header ya no es 'sticky'. Ahora es una fila normal en la columna flex. */}
      {/* 'flex-shrink-0' asegura que no se encoja si el contenido crece. */}
      <header className="bg-white border-b border-slate-200 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y título con botón hamburguesa en móvil */}
            <div className="flex items-center gap-3">
              {/* Botón hamburguesa - visible solo en móvil */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center gap-2 sm:gap-3">
                <img src={logo} alt="ProLogix" className="h-10 sm:h-12 w-auto object-contain" />
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                  ProLogix
                </span>
              </div>
            </div>

            {/* Usuario y notificaciones (Sin cambios) */}
            <div className="flex items-center gap-4">
              {/* Notificaciones (si existe el componente) */}
              {useNotifications && (
                <button
                  onClick={togglePanel}
                  className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}

              {/* Usuario */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{userData?.nombre || 'Usuario'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{getRolName()}</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                    {userData?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl py-2 z-50 border border-slate-100 dark:border-slate-700">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{userData?.nombre}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{userData?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/configuracion');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      ⚙️ Configuración
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition flex items-center gap-2"
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

      {/* CAMBIO 3: Este div ahora es el contenedor principal. 'flex-1' hace que ocupe
      // el resto de la altura, y 'overflow-hidden' evita que este div tenga scroll. */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Overlay oscuro para móvil cuando el sidebar está abierto */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* CAMBIO 4: El Sidebar (aside) ahora es responsivo:
        // - En móvil: position fixed, se muestra/oculta con transform
        // - En desktop (lg+): position normal, siempre visible */}
        <aside className={`
          fixed lg:relative
          top-0 left-0 h-full
          w-64 bg-white border-r border-slate-200
          flex flex-col flex-shrink-0
          z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>

          {/* Header del sidebar en móvil */}
          <div className="lg:hidden p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Menú</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              aria-label="Cerrar menú"
            >
              <X size={20} className="text-slate-600 dark:text-slate-400" />
            </button>
          </div>

          {/* CAMBIO 5: La navegación (nav) ahora es 'flex-1' (ocupa el espacio vertical)
          // y 'overflow-y-auto' (permite scroll *sólo* en el menú si es muy largo). */}
          <nav className="flex-1 p-3 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)} // Cerrar sidebar al hacer click en móvil
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 text-sm group ${location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <span className="text-xl flex-shrink-0 opacity-90">{item.icon}</span>
                <span className="font-medium truncate">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Info de usuario en el sidebar (visible en móvil) */}
          <div className="lg:hidden p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {userData?.nombre?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{userData?.nombre || 'Usuario'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{getRolName()}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* CAMBIO 6: El 'main' (contenido principal) ahora es el único que tiene 'overflow-y-auto'.
        // Se quitó 'min-h' que ya no es necesario. Todo el contenido de tus páginas
        // (como Empleados.jsx) que sea más largo que la pantalla, hará que *solo* este
        // 'main' tenga una barra de scroll. */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
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