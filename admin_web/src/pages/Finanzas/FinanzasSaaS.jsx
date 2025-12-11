// Vista Financiera para Super Admin - Métricas del Negocio SaaS
// Muestra ingresos por suscripciones, no las finanzas privadas de las empresas
import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Building2,
  CreditCard,
  Users,
  DollarSign,
  ArrowUpRight,
  Download,
  BarChart3,
  Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { toast } from 'sonner';
import AdminPlanesSaaS from './AdminPlanesSaaS';

const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
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
      {displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  );
};

const KPICard = ({ title, value, change, icon: Icon, prefix = '', suffix = '', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={prefix === '$' ? 2 : 0} />
            </h3>
          </div>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {change}%
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-500">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
          <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  );
};

const FinanzasSaaS = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' o 'admin'
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);

  // Mock data - Métricas del negocio SaaS
  const [data, setData] = useState({
    mrr: { total: 0, change: 0 },
    empresasActivas: { total: 0, change: 0 },
    facturasGeneradas: { total: 0, change: 0 },
    arr: { total: 0, change: 0 },
    empresasPorPlan: []
  });
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, empresasRes] = await Promise.all([
          api.get(`/finanzas/saas/overview?dateRange=${dateRange}`),
          api.get('/finanzas/saas/empresas?limit=5')
        ]);

        if (overviewRes.data.success) {
          setData(overviewRes.data.data);
        }
        if (empresasRes.data.success) {
          setEmpresas(empresasRes.data.data);
        }
      } catch (error) {
        console.error('Error fetching SaaS data:', error);
        toast.error('Error al cargar datos financieros');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  useEffect(() => {
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
    <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">💼 Finanzas SaaS</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Métricas de ingresos por suscripciones empresariales
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'overview'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'admin'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  <Settings className="w-4 h-4" />
                  Administración
                </button>
              </div>

              {activeTab === 'overview' && (
                <>
                  {/* Selector de rango */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                    {[
                      { value: '7', label: '7 días' },
                      { value: '30', label: '30 días' },
                      { value: '90', label: '90 días' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDateRange(option.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${dateRange === option.value
                          ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 space-y-6">
        {activeTab === 'admin' && <AdminPlanesSaaS />}

        {activeTab === 'overview' && (
          <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="MRR (Ingreso Mensual Recurrente)"
            value={data.mrr.total}
            prefix="$"
            change={data.mrr.change}
            icon={DollarSign}
            delay={0}
          />
          <KPICard
            title="Empresas Activas"
            value={data.empresasActivas.total}
            change={data.empresasActivas.change}
            icon={Building2}
            delay={0.1}
          />
          <KPICard
            title="Facturas Generadas"
            value={data.facturasGeneradas.total}
            change={data.facturasGeneradas.change}
            icon={CreditCard}
            delay={0.2}
          />
          <KPICard
            title="ARR (Ingreso Anual)"
            value={data.arr.total}
            prefix="$"
            change={data.arr.change}
            icon={TrendingUp}
            delay={0.3}
          />
        </div>

        {/* Gráfico y Lista de Empresas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de MRR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Crecimiento MRR</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Ingresos mensuales recurrentes</p>
            </div>

            <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 border-dashed">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-500">Gráfico de MRR (Próximamente)</p>
              </div>
            </div>
          </motion.div>

          {/* Distribución por Plan */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Distribución por Plan</h3>

            <div className="space-y-4">
              {[
                { plan: 'Enterprise', count: 5, mrr: 5000, color: 'bg-indigo-500' },
                { plan: 'Professional', count: 12, mrr: 4800, color: 'bg-emerald-500' },
                { plan: 'Basic', count: 7, mrr: 2700, color: 'bg-amber-500' }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{item.plan}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">${item.mrr}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.mrr / (data.mrr?.total || 1)) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.6 + index * 0.1 }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.count} empresas</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Tabla de Empresas Suscritas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Empresas Suscritas</h3>
            <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
              Ver todas →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Empresa</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Plan</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">MRR</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Fecha Suscripción</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((empresa, index) => (
                  <tr key={index} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{empresa.nombre}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                        {empresa.plan}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900 dark:text-white">
                      ${empresa.mrr}/mes
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                      {new Date(empresa.fechaSuscripcion).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${empresa.estado === 'activo'
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                        }`}>
                        {empresa.estado === 'activo' ? '✓ Activo' : '✕ Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default FinanzasSaaS;
