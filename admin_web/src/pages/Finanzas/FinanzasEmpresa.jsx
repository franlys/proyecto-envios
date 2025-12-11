// 💼 MÓDULO FINANCIERO COMPLETO PARA PROPIETARIOS
// Incluye: Ingresos, Gastos, Suscripción SaaS, Facturas Pendientes, Estado de Cuenta
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Truck,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  BarChart3,
  RefreshCw,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import ComparadorPlanes from './ComparadorPlanes';

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

const KPICard = ({ title, value, change, changeType, icon: Icon, prefix = '', suffix = '', delay = 0 }) => {
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
              {changeType === 'up' ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span className={`text-sm font-medium ${changeType === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {change}%
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-500">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${changeType === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
          <Icon className={`w-6 h-6 ${changeType === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  );
};

const FinanzasEmpresa = () => {
  const { userData } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, suscripcion, facturas
  const [tasaDolar, setTasaDolar] = useState(58.50);

  // Datos financieros operativos
  const [data, setData] = useState({
    ingresos: { total: 0, change: 0, changeType: 'up' },
    gastos: { total: 0, change: 0, changeType: 'down', desglose: { repartidoresRD: 0, repartidoresUSD: 0, recolectoresUSD: 0, otrosUSD: 0 } },
    utilidad: { total: 0, change: 0, changeType: 'up' },
    facturasActivas: { total: 0, change: 0, changeType: 'up' },
    tasaDolar: 58.50
  });

  // Datos de suscripción SaaS
  const [suscripcion, setSuscripcion] = useState({
    plan: 'Basic',
    precio: 300,
    fechaInicio: new Date(),
    proximoPago: new Date(),
    estado: 'activo',
    limites: {
      recolecciones: 100,
      usuarios: 5,
      almacenamiento: '10 GB'
    },
    uso: {
      recolecciones: 45,
      usuarios: 3,
      almacenamiento: '3.2 GB'
    }
  });

  // Facturas pendientes
  const [facturasPendientes, setFacturasPendientes] = useState([]);

  // Métricas mensuales para gráficas
  const [metricasMensuales, setMetricasMensuales] = useState([]);

  // Planes SaaS disponibles
  const [planesDisponibles, setPlanesDisponibles] = useState([]);
  const [planActual, setPlanActual] = useState(null);
  const [cambiandoPlan, setCambiandoPlan] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch overview financiero
        const overviewRes = await api.get(`/finanzas/empresa/overview?dateRange=${dateRange}`);
        if (overviewRes.data.success) {
          setData(overviewRes.data.data);
          setTasaDolar(overviewRes.data.data.tasaDolar || 58.50);
        }

        // Fetch suscripción data
        const suscripcionRes = await api.get('/finanzas/empresa/suscripcion');
        if (suscripcionRes.data.success) {
          setSuscripcion(suscripcionRes.data.data);
        }

        // Fetch facturas pendientes
        const facturasRes = await api.get('/finanzas/empresa/facturas-pendientes');
        if (facturasRes.data.success) {
          setFacturasPendientes(facturasRes.data.data);
        }

        // Fetch métricas mensuales para gráficas (últimos 12 meses)
        const metricasRes = await api.get('/finanzas/empresa/metricas-mensuales?meses=12');
        if (metricasRes.data.success) {
          setMetricasMensuales(metricasRes.data.data);
        }

        // Fetch planes disponibles para SaaS
        const planesRes = await api.get('/finanzas/empresa/planes-disponibles');
        if (planesRes.data.success) {
          setPlanesDisponibles(planesRes.data.data.planes);
        }

      } catch (error) {
        console.error('Error fetching company finance data:', error);
        toast.error('Error al cargar finanzas de la empresa');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  // Función para cambiar de plan
  const handleCambiarPlan = async (nuevoPlanId) => {
    try {
      setCambiandoPlan(true);
      const response = await api.post('/finanzas/empresa/cambiar-plan', {
        nuevoPlanId
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Actualizar el plan actual en la suscripción
        setSuscripcion(prev => ({
          ...prev,
          plan: response.data.data.planNombre
        }));
        setPlanActual(nuevoPlanId);
      }
    } catch (error) {
      console.error('Error al cambiar plan:', error);
      if (error.response?.data?.advertencias) {
        toast.error(error.response.data.message);
        error.response.data.advertencias.forEach(adv => {
          toast.warning(adv);
        });
      } else {
        toast.error(error.response?.data?.message || 'Error al cambiar plan');
      }
    } finally {
      setCambiandoPlan(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Finanzas de la Empresa</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Gestiona tus ingresos, gastos y suscripción al sistema
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador de Tasa de Cambio */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                Tasa: RD$ {tasaDolar.toFixed(2)} / USD
              </span>
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Exportar Reporte
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          {[
            { id: 'overview', label: 'Resumen Financiero', icon: BarChart3 },
            { id: 'suscripcion', label: 'Suscripción SaaS', icon: CreditCard },
            { id: 'facturas', label: 'Facturas Pendientes', icon: Receipt }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* TAB 1: RESUMEN FINANCIERO */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Finanzas Operativas</h2>
              <div className="flex gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
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
                        ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Ingresos Totales"
                value={data.ingresos.total}
                prefix="$"
                change={data.ingresos.change}
                changeType={data.ingresos.changeType}
                icon={TrendingUp}
                delay={0}
              />
              <KPICard
                title="Gastos Totales"
                value={data.gastos.total}
                prefix="$"
                change={data.gastos.change}
                changeType={data.gastos.changeType}
                icon={TrendingDown}
                delay={0.1}
              />
              <KPICard
                title="Utilidad Neta"
                value={data.utilidad.total}
                prefix="$"
                change={data.utilidad.change}
                changeType={data.utilidad.changeType}
                icon={DollarSign}
                delay={0.2}
              />
              <KPICard
                title="Facturas Activas"
                value={data.facturasActivas.total}
                change={data.facturasActivas.change}
                changeType={data.facturasActivas.changeType}
                icon={Package}
                delay={0.3}
              />
            </div>

            {/* Desglose de Gastos con Gráfica de Pastel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Desglose de Gastos</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Todos los valores convertidos a USD. Repartidores cobran en RD$, Recolectores en USD.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Gráfica de Pastel */}
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Repartidores', value: data.gastos.desglose.repartidoresUSD, color: '#6366f1' },
                          { name: 'Recolectores', value: data.gastos.desglose.recolectoresUSD, color: '#10b981' },
                          { name: 'Otros', value: data.gastos.desglose.otrosUSD, color: '#f59e0b' }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[
                          { color: '#6366f1' },
                          { color: '#10b981' },
                          { color: '#f59e0b' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Estadísticas Detalladas */}
                <div className="space-y-4">
                {/* Repartidores */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Repartidores</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        ${data.gastos.desglose.repartidoresUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        RD$ {data.gastos.desglose.repartidoresRD.toLocaleString('es-DO')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.gastos.desglose.repartidoresUSD / (data.gastos.total || 1)) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">
                      {Math.round((data.gastos.desglose.repartidoresUSD / (data.gastos.total || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Recolectores */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Recolectores</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        ${data.gastos.desglose.recolectoresUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">USD</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.gastos.desglose.recolectoresUSD / (data.gastos.total || 1)) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">
                      {Math.round((data.gastos.desglose.recolectoresUSD / (data.gastos.total || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Otros */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Otros Gastos</span>
                    </div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      ${data.gastos.desglose.otrosUSD.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(data.gastos.desglose.otrosUSD / (data.gastos.total || 1)) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="h-full bg-amber-500"
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-10 text-right">
                      {Math.round((data.gastos.desglose.otrosUSD / (data.gastos.total || 1)) * 100)}%
                    </span>
                  </div>
                </div>
                </div>
              </div>
            </motion.div>

            {/* Gráficas de Tendencias Mensuales */}
            {metricasMensuales.length > 0 && (
              <>
                {/* Gráfica de Ingresos vs Gastos */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                    Tendencia Mensual: Ingresos vs Gastos
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metricasMensuales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="mes"
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Ingresos"
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="gastos"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Gastos"
                        dot={{ fill: '#ef4444', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>

                {/* Gráfica de Utilidad Mensual */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                    Utilidad Neta Mensual
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metricasMensuales}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="mes"
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis
                        stroke="#64748b"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${value.toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        formatter={(value) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                      />
                      <Legend />
                      <Bar
                        dataKey="utilidad"
                        fill="#6366f1"
                        name="Utilidad Neta"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: SUSCRIPCIÓN SAAS */}
        {activeTab === 'suscripcion' && (
          <div className="space-y-6">
            <ComparadorPlanes
              planes={planesDisponibles}
              planActual={suscripcion.plan?.toLowerCase()}
              onCambiarPlan={handleCambiarPlan}
              cambiando={cambiandoPlan}
            />

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-12">Plan Actual - Detalles</h2>

            {/* Tarjeta de Plan Actual */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">Plan {suscripcion.plan}</h3>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {suscripcion.estado === 'activo' ? '✓ Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="text-indigo-100">Acceso completo al sistema de gestión de envíos</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">${suscripcion.precio}</div>
                  <div className="text-indigo-100 text-sm">por mes</div>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm text-indigo-100">Fecha de Inicio</span>
                  </div>
                  <div className="font-semibold">{new Date(suscripcion.fechaInicio).toLocaleDateString()}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm text-indigo-100">Próximo Pago</span>
                  </div>
                  <div className="font-semibold">{new Date(suscripcion.proximoPago).toLocaleDateString()}</div>
                </div>
              </div>
            </motion.div>

            {/* Límites y Uso */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
              >
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Recolecciones</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Uso actual</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {suscripcion.uso.recolecciones} / {suscripcion.limites.recolecciones === -1 ? 'Ilimitado' : suscripcion.limites.recolecciones}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: suscripcion.limites.recolecciones === -1 ? '0%' : `${(suscripcion.uso.recolecciones / suscripcion.limites.recolecciones) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {suscripcion.limites.recolecciones === -1
                      ? 'Sin límite'
                      : `${((suscripcion.uso.recolecciones / suscripcion.limites.recolecciones) * 100).toFixed(1)}% utilizado`
                    }
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
              >
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Usuarios</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Uso actual</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {suscripcion.uso.usuarios} / {suscripcion.limites.usuarios === -1 ? 'Ilimitado' : suscripcion.limites.usuarios}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: suscripcion.limites.usuarios === -1 ? '0%' : `${(suscripcion.uso.usuarios / suscripcion.limites.usuarios) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {suscripcion.limites.usuarios === -1
                      ? 'Sin límite'
                      : `${((suscripcion.uso.usuarios / suscripcion.limites.usuarios) * 100).toFixed(1)}% utilizado`
                    }
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
              >
                <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Almacenamiento</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Uso actual</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {suscripcion.uso.almacenamiento} / {suscripcion.limites.almacenamiento}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all" style={{ width: '32%' }} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500">32% utilizado</p>
                </div>
              </motion.div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm">
                Actualizar Plan
              </button>
              <button className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium">
                Ver Historial de Pagos
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: FACTURAS PENDIENTES */}
        {activeTab === 'facturas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Facturas Pendientes de Pago</h2>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {facturasPendientes.length} facturas pendientes
                </span>
              </div>
            </div>

            {facturasPendientes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center"
              >
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  ¡Todo al día!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  No tienes facturas pendientes de pago en este momento
                </p>
              </motion.div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Número
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Concepto
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Fecha
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Monto
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Estado
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {facturasPendientes.map((factura, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">
                          {factura.numero}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {factura.concepto}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {factura.fecha}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-right text-slate-900 dark:text-white">
                          ${factura.monto}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            Pendiente
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium">
                            Pagar Ahora
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanzasEmpresa;
