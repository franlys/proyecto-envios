import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion } from 'framer-motion';
import {
  Package,
  MapPin,
  Users,
  Activity,
  TrendingUp,
  Warehouse,
  Truck,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShoppingCart
} from 'lucide-react';

// Componente para animar números
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      current = Math.min(current + increment, value);

      if (frame >= steps || current >= value) {
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
      {decimals > 0
        ? displayValue.toFixed(decimals)
        : Math.floor(displayValue).toLocaleString('es-DO')
      }
      {suffix}
    </span>
  );
};

const DashboardPropietario = () => {
  const { userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userData || userData.rol !== 'propietario') {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get('/dashboard/stats');
        console.log('📊 Stats Dashboard Propietario:', response.data);

        const data = response.data;

        const transformedStats = {
          embarquesActivos: data.embarques?.activos || 0,
          recoleccionesHoy: data.recolecciones?.hoy || 0,
          rutasEnCurso: data.rutas?.enCurso || data.rutas?.activas || 0,
          facturasPendientes: data.facturas?.pendientes || 0,
          totalUsuarios: data.usuarios?.total || 0,
          usuariosActivos: data.usuarios?.activos || 0,
          totalRecolecciones: data.recolecciones?.total || 0,
          totalEmbarques: data.embarques?.total || 0,
          totalRutas: data.rutas?.total || 0,
          totalFacturas: data.facturas?.total || 0,
          facturasEntregadas: data.facturas?.entregadas || 0,
          empresa: data.empresa || null
        };

        setStats(transformedStats);

      } catch (err) {
        console.error('❌ Error cargando estadísticas:', err);
        setError(err.response?.data?.error || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && userData) {
      fetchStats();
    }
  }, [userData, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Cargando tu dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-rose-50 to-white dark:from-slate-900 dark:to-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-rose-200 dark:border-rose-900 p-8 max-w-md"
        >
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Error</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Reintentar
          </button>
        </motion.div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Calcular porcentajes y métricas
  const porcentajeEntregas = stats.totalFacturas > 0
    ? Math.round((stats.facturasEntregadas / stats.totalFacturas) * 100)
    : 0;

  const porcentajeUsuariosActivos = stats.totalUsuarios > 0
    ? Math.round((stats.usuariosActivos / stats.totalUsuarios) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 sm:p-6 lg:p-8">
      {/* Header Premium */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Bienvenido, {userData?.nombre}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Vista general de tu operación empresarial
            </p>
          </div>

          {stats.empresa && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl px-6 py-4 shadow-lg border border-slate-200 dark:border-slate-700"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Tu Empresa</p>
                <p className="font-bold text-lg text-slate-900 dark:text-white">{stats.empresa.nombre}</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  Plan: {stats.empresa.plan}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Métricas Principales - Grid Interactivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Rutas en Curso"
          value={stats.rutasEnCurso}
          total={stats.totalRutas}
          icon={MapPin}
          gradient="from-amber-500 to-orange-500"
          delay={0.1}
          onClick={() => navigate('/rutas')}
        />
        <MetricCard
          title="Embarques Activos"
          value={stats.embarquesActivos}
          total={stats.totalEmbarques}
          icon={Package}
          gradient="from-indigo-500 to-blue-500"
          delay={0.2}
          onClick={() => navigate('/embarques')}
        />
        <MetricCard
          title="Equipo Activo"
          value={stats.usuariosActivos}
          total={stats.totalUsuarios}
          icon={Users}
          gradient="from-emerald-500 to-teal-500"
          delay={0.3}
          onClick={() => navigate('/empleados')}
        />
        <MetricCard
          title="Facturas Pendientes"
          value={stats.facturasPendientes}
          total={stats.totalFacturas}
          icon={AlertTriangle}
          gradient="from-rose-500 to-pink-500"
          delay={0.4}
          onClick={() => navigate('/facturas-pendientes-pago')}
        />
      </div>

      {/* Gráficos de Progreso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tasa de Entregas */}
        <ProgressCard
          title="Tasa de Entregas Exitosas"
          value={porcentajeEntregas}
          subtitle={`${stats.facturasEntregadas} de ${stats.totalFacturas} facturas entregadas`}
          icon={CheckCircle2}
          color="emerald"
          delay={0.5}
        />

        {/* Actividad del Equipo */}
        <ProgressCard
          title="Actividad del Equipo"
          value={porcentajeUsuariosActivos}
          subtitle={`${stats.usuariosActivos} de ${stats.totalUsuarios} usuarios activos`}
          icon={Activity}
          color="indigo"
          delay={0.6}
        />
      </div>

      {/* Accesos Rápidos Mejorados */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Accesos Rápidos</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAccessCard
            title="Finanzas"
            description="Ver métricas"
            icon={DollarSign}
            gradient="from-emerald-500 to-teal-500"
            onClick={() => navigate('/finanzas')}
          />
          <QuickAccessCard
            title="Reportes"
            description="Análisis completo"
            icon={BarChart3}
            gradient="from-indigo-500 to-purple-500"
            onClick={() => navigate('/reportes')}
          />
          <QuickAccessCard
            title="Embarques"
            description="Gestionar envíos"
            icon={Warehouse}
            gradient="from-blue-500 to-cyan-500"
            onClick={() => navigate('/embarques')}
          />
          <QuickAccessCard
            title="Rutas"
            description="Ver entregas"
            icon={Truck}
            gradient="from-amber-500 to-orange-500"
            onClick={() => navigate('/rutas')}
          />
        </div>
      </motion.div>
    </div>
  );
};

// Componente de Métrica Interactiva
const MetricCard = ({ title, value, total, icon: Icon, gradient, delay, onClick }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      onClick={onClick}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-xl transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
            <AnimatedNumber value={value} />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            de {total} totales
          </p>
        </div>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="relative h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, delay: delay + 0.3 }}
          className={`h-full bg-gradient-to-r ${gradient}`}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 text-right">
        {percentage}%
      </p>
    </motion.div>
  );
};

// Componente de Progreso Circular
const ProgressCard = ({ title, value, subtitle, icon: Icon, color, delay }) => {
  const colorConfig = {
    emerald: {
      gradient: 'from-emerald-500 to-teal-500',
      stroke: 'stroke-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400'
    },
    indigo: {
      gradient: 'from-indigo-500 to-purple-500',
      stroke: 'stroke-indigo-500',
      text: 'text-indigo-600 dark:text-indigo-400'
    }
  };

  const config = colorConfig[color] || colorConfig.indigo;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            <AnimatedNumber value={value} suffix="%" />
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
        </div>

        <div className="relative w-28 h-28">
          <svg className="transform -rotate-90 w-28 h-28">
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-200 dark:text-slate-700"
            />
            <motion.circle
              cx="56"
              cy="56"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeLinecap="round"
              className={config.stroke}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, delay: delay + 0.3 }}
              style={{
                strokeDasharray: circumference
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${config.text}`}>{value}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente de Acceso Rápido
const QuickAccessCard = ({ title, description, icon: Icon, gradient, onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-xl border-2 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group"
    >
      <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 text-center">{description}</p>
    </motion.button>
  );
};

export default DashboardPropietario;
