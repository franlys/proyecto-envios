// Layout principal del módulo financiero con navegación sidebar
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  BarChart3,
  Settings
} from 'lucide-react';

const FinanzasLayout = () => {
  const navItems = [
    {
      to: '/finanzas/dashboard',
      icon: LayoutDashboard,
      label: 'Overview',
      description: 'Resumen ejecutivo'
    },
    {
      to: '/finanzas/transacciones',
      icon: Receipt,
      label: 'Transacciones',
      description: 'Historial detallado'
    },
    {
      to: '/finanzas/suscripciones',
      icon: CreditCard,
      label: 'Suscripciones',
      description: 'Planes y pagos'
    },
    {
      to: '/finanzas/reportes',
      icon: BarChart3,
      label: 'Reportes',
      description: 'Analytics y exportación'
    },
    {
      to: '/finanzas/configuracion',
      icon: Settings,
      label: 'Configuración',
      description: 'Datos fiscales'
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - Estilo Enterprise con fondo oscuro */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Header del módulo */}
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            💼 ProLogix Finance
          </h2>
          <p className="text-sm text-slate-400 mt-1">Panel Financiero Corporativo</p>
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs opacity-70">{item.description}</div>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Footer con info de la empresa */}
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 text-center">
            Sistema Multi-Tenant
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default FinanzasLayout;
