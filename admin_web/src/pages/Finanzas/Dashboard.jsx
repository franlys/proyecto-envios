// Dashboard Financiero Principal - Estilo Bento Grid Enterprise
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

// Componente de animación de números (CountUp)
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000; // 1 segundo
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString('es-DO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
};

// Componente de tarjeta KPI
const KPICard = ({ title, value, change, changeType, icon: Icon, prefix = '', suffix = '', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900">
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={prefix === '$' ? 2 : 0} />
            </h3>
          </div>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {changeType === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              )}
              <span className={`text-sm font-medium ${changeType === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {change}%
              </span>
              <span className="text-sm text-slate-500">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${changeType === 'up' ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
          <Icon className={`w-6 h-6 ${changeType === 'up' ? 'text-emerald-600' : 'text-indigo-600'}`} strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const { userData } = useAuth();
  const [dateRange, setDateRange] = useState('30'); // 30 días por defecto
  const [loading, setLoading] = useState(true);

  // Mock data - TODO: Conectar con backend real
  const mockData = {
    ingresos: {
      total: 45750.50,
      change: 12.5,
      changeType: 'up'
    },
    gastos: {
      total: 23400.00,
      change: 8.3,
      changeType: 'down'
    },
    utilidad: {
      total: 22350.50,
      change: 18.7,
      changeType: 'up'
    },
    facturasActivas: {
      total: 156,
      change: 5.2,
      changeType: 'up'
    }
  };

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => setLoading(false), 500);
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-slate-50">
      {/* Header con breadcrumbs y acciones */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Overview Financiero</h1>
              <p className="text-sm text-slate-600 mt-1">
                Empresa: <span className="font-medium text-slate-900">{userData?.companyName || 'Cargando...'}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Selector de rango de fecha */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                {[
                  { value: '7', label: '7 días' },
                  { value: '30', label: '30 días' },
                  { value: '90', label: '90 días' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDateRange(option.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      dateRange === option.value
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                <Download className="w-4 h-4" />
                Exportar Reporte
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Bento Grid */}
      <div className="p-8 space-y-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Ingresos Totales"
            value={mockData.ingresos.total}
            prefix="$"
            change={mockData.ingresos.change}
            changeType={mockData.ingresos.changeType}
            icon={TrendingUp}
            delay={0}
          />
          <KPICard
            title="Gastos Totales"
            value={mockData.gastos.total}
            prefix="$"
            change={mockData.gastos.change}
            changeType={mockData.gastos.changeType}
            icon={TrendingDown}
            delay={0.1}
          />
          <KPICard
            title="Utilidad Neta"
            value={mockData.utilidad.total}
            prefix="$"
            change={mockData.utilidad.change}
            changeType={mockData.utilidad.changeType}
            icon={DollarSign}
            delay={0.2}
          />
          <KPICard
            title="Facturas Activas"
            value={mockData.facturasActivas.total}
            change={mockData.facturasActivas.change}
            changeType={mockData.facturasActivas.changeType}
            icon={Package}
            delay={0.3}
          />
        </div>

        {/* Bento Grid Layout - Dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Ingresos (2/3) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Ingresos Mensuales</h3>
                <p className="text-sm text-slate-600">Tendencia de ingresos recurrentes (MRR)</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-xs font-medium text-emerald-700">Ingresos</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-rose-50 rounded-lg">
                  <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                  <span className="text-xs font-medium text-rose-700">Gastos</span>
                </div>
              </div>
            </div>

            {/* Placeholder para gráfico - Integrar Recharts */}
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200 border-dashed">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Gráfico de ingresos (Integrar Recharts)</p>
              </div>
            </div>
          </motion.div>

          {/* Resumen de Gastos (1/3) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Gastos por Categoría</h3>

            <div className="space-y-4">
              {[
                { category: 'Nómina', amount: 12000, percent: 51, color: 'bg-indigo-500' },
                { category: 'Operaciones', amount: 6500, percent: 28, color: 'bg-emerald-500' },
                { category: 'Marketing', amount: 3200, percent: 14, color: 'bg-amber-500' },
                { category: 'Otros', amount: 1700, percent: 7, color: 'bg-slate-400' }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.category}</span>
                    <span className="font-semibold text-slate-900">${item.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-10 text-right">{item.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Transacciones Recientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Transacciones Recientes</h3>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Ver todas →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Descripción</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Categoría</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Monto</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: '2025-12-01', desc: 'Pago de ruta #1234', category: 'Operaciones', amount: 1250, type: 'ingreso', status: 'completado' },
                  { date: '2025-12-01', desc: 'Nómina Diciembre', category: 'Nómina', amount: -12000, type: 'gasto', status: 'completado' },
                  { date: '2025-11-30', desc: 'Servicio de hosting', category: 'Tecnología', amount: -250, type: 'gasto', status: 'pendiente' }
                ].map((tx, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-600">{tx.date}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{tx.desc}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-sm font-semibold text-right ${
                      tx.type === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      ${Math.abs(tx.amount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tx.status === 'completado'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {tx.status === 'completado' ? '✓ Completado' : '⏳ Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
