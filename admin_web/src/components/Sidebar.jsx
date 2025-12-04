// admin_web/src/components/Sidebar.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Phone, 
  FileX, 
  Users, 
  BarChart3, 
  Building2,
  HelpCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  PackagePlus // ✅ NUEVO: Icono para Nueva Recolección
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['super_admin', 'admin', 'secretaria', 'almacen', 'repartidor']
    },
    {
      name: 'Compañías',
      path: '/companies',
      icon: Building2,
      roles: ['super_admin']
    },
    {
      name: 'Nueva Recolección', // ✅ NUEVO: Enlace para crear recolección
      path: '/recolecciones/nueva',
      icon: PackagePlus,
      roles: ['admin', 'recolector', 'almacen_eeuu'],
      badge: 'Nuevo'
    },
    {
      name: 'Embarques',
      path: '/embarques',
      icon: Package,
      roles: ['admin', 'secretaria', 'almacen']
    },
    {
      name: 'Rutas',
      path: '/rutas',
      icon: Truck,
      roles: ['admin', 'secretaria', 'repartidor']
    },
    {
      name: 'Panel Secretarias',
      path: '/secretarias',
      icon: Phone,
      roles: ['admin', 'secretaria']
    },
    {
      name: 'Facturas No Entregadas',
      path: '/facturas-no-entregadas',
      icon: FileX,
      roles: ['admin', 'secretaria']
    },
    {
      name: 'Empleados',
      path: '/empleados',
      icon: Users,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Reportes',
      path: '/reportes',
      icon: BarChart3,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Tickets de Soporte',
      path: '/tickets-admin',
      icon: MessageSquare,
      roles: ['super_admin'],
      badge: 'Nuevo'
    }
  ];

  const bottomMenuItems = [
    {
      name: 'Ayuda',
      path: '/soporte',
      icon: HelpCircle,
      roles: ['super_admin', 'admin', 'secretaria', 'almacen', 'repartidor']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userData?.rol)
  );

  const filteredBottomItems = bottomMenuItems.filter(item =>
    item.roles.includes(userData?.rol)
  );

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className={`bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Sistema de Envíos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">v2.0</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition text-slate-700 dark:text-slate-300"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={collapsed ? item.name : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm font-medium">
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Menu */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="space-y-1">
          {filteredBottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={collapsed ? item.name : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="flex-1 text-left text-sm font-medium">
                    {item.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400">Sesión activa como:</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {userData?.nombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {userData?.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;