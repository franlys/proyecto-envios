import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion } from 'framer-motion';
import {
  Package,
  Activity,
  TrendingUp,
  Warehouse,
  Truck,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  BarChart3,
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
      if (!userData || (userData.rol !== 'propietario' && userData.rol !== 'super_admin')) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // ✅ Usar el nuevo endpoint de dashboard propietario
        const response = await api.get('/dashboard/propietario');
        console.log('📊 Dashboard Ejecutivo:', response.data);

        // El backend devuelve: { success, companyId, timestamp, data }
        const dashboardData = response.data.data;

        const transformedStats = {
          // Contenedores
          totalContenedores: dashboardData.contenedores?.total || 0,
          contenedoresUSA: dashboardData.contenedores?.enUSA || 0,
          contenedoresRD: dashboardData.contenedores?.enRD || 0,
          contenedoresTransito: dashboardData.contenedores?.enTransito || 0,
          contenedoresTrabajados: dashboardData.contenedores?.trabajados || 0,
          porcentajeTrabajados: dashboardData.contenedores?.porcentajeTrabajados || 0,
          porcentajeConfirmacion: dashboardData.contenedores?.facturas?.porcentajeConfirmacion || 0,
          porcentajeEntregaContenedores: dashboardData.contenedores?.facturas?.porcentajeEntrega || 0,
          facturasConfirmadas: dashboardData.contenedores?.facturas?.confirmadas || 0,
          totalFacturasContenedor: dashboardData.contenedores?.facturas?.total || 0,

          // Rutas
          rutasActivas: dashboardData.rutas?.activas || 0,
          rutasCompletadas: dashboardData.rutas?.completadas || 0,
          rutasPendientes: dashboardData.rutas?.pendientes || 0,
          totalRutas: dashboardData.rutas?.total || 0,
          porcentajeEntregaRutas: dashboardData.rutas?.eficiencia?.porcentajeEntrega || 0,
          facturasEnRutas: dashboardData.rutas?.eficiencia?.totalFacturas || 0,
          facturasEntregadasRutas: dashboardData.rutas?.eficiencia?.entregadas || 0,

          // Facturas
          totalFacturas: dashboardData.facturas?.total || 0,
          facturasEntregadas: dashboardData.facturas?.entregadas || 0,
          facturasPendientes: dashboardData.facturas?.pendientes || 0,
          facturasNoEntregadas: dashboardData.facturas?.noEntregadas || 0,
          facturasEnRuta: dashboardData.facturas?.enRuta || 0,
          porcentajeEntrega: dashboardData.facturas?.porcentajeEntrega || 0,

          // No Entregadas
          totalNoEntregadas: dashboardData.noEntregadas?.total || 0,
          reincidencias: dashboardData.noEntregadas?.reincidencias || 0,
          porcentajeReincidencia: dashboardData.noEntregadas?.porcentajeReincidencia || 0,
          motivosNoEntrega: dashboardData.noEntregadas?.motivos || [],

          // Recolecciones
          recoleccionesHoy: dashboardData.recolecciones?.hoy?.total || 0,
          recoleccionesCompletadas: dashboardData.recolecciones?.hoy?.completadas || 0,
          recoleccionesPendientes: dashboardData.recolecciones?.hoy?.pendientes || 0,

          // Finanzas
          cobrosFinanzas: dashboardData.finanzas?.mes?.cobros || 0,
          gastosFinanzas: dashboardData.finanzas?.mes?.gastos || 0,
          balanceFinanzas: dashboardData.finanzas?.mes?.balance || 0,

          // Compatibilidad con métricas antiguas
          embarquesActivos: 0,
          recoleccionesHoy: dashboardData.recolecciones?.hoy?.total || 0,
          rutasEnCurso: dashboardData.rutas?.activas || 0,
          totalEmbarques: 0,
          empresa: null
        };

        setStats(transformedStats);

      } catch (err) {
        console.error('❌ Error cargando dashboard ejecutivo:', err);
        setError(err.response?.data?.error || 'Error al cargar dashboard');
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

      {/* 📦 Contenedores - Métricas Principales */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
          <Package className="w-6 h-6 mr-2 text-indigo-600" />
          Contenedores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Contenedores"
            value={stats.totalContenedores}
            total={stats.totalContenedores}
            icon={Package}
            gradient="from-indigo-500 to-purple-500"
            delay={0.1}
          />
          <MetricCard
            title="En USA"
            value={stats.contenedoresUSA}
            total={stats.totalContenedores}
            icon={Warehouse}
            gradient="from-blue-500 to-cyan-500"
            delay={0.2}
          />
          <MetricCard
            title="En RD"
            value={stats.contenedoresRD}
            total={stats.totalContenedores}
            icon={CheckCircle2}
            gradient="from-emerald-500 to-teal-500"
            delay={0.3}
          />
          <MetricCard
            title="% Entrega Contenedores"
            value={stats.porcentajeEntregaContenedores || 0}
            total={100}
            icon={TrendingUp}
            gradient="from-emerald-500 to-green-500"
            delay={0.4}
            isPercentage
          />
          <MetricCard
            title="% Confirmación"
            value={stats.porcentajeConfirmacion}
            total={100}
            icon={CheckCircle2}
            gradient="from-purple-500 to-pink-500"
            delay={0.5}
            isPercentage
          />
        </div>
      </motion.div>

      {/* 🗺️ Rutas - Métricas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
          <Truck className="w-6 h-6 mr-2 text-emerald-600" />
          Rutas y Entregas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Rutas Activas"
            value={stats.rutasActivas}
            total={stats.totalRutas}
            icon={Truck}
            gradient="from-emerald-500 to-teal-500"
            delay={0.1}
            onClick={() => navigate('/reportes')}
          />
          <MetricCard
            title="Completadas"
            value={stats.rutasCompletadas}
            total={stats.totalRutas}
            icon={CheckCircle2}
            gradient="from-blue-500 to-indigo-500"
            delay={0.2}
          />
          <MetricCard
            title="% Entrega"
            value={stats.porcentajeEntregaRutas}
            total={100}
            icon={TrendingUp}
            gradient="from-indigo-500 to-purple-500"
            delay={0.3}
            isPercentage
          />
          <MetricCard
            title="Facturas Pendientes"
            value={stats.facturasPendientes}
            total={stats.totalFacturas}
            icon={Clock}
            gradient="from-amber-500 to-orange-500"
            delay={0.4}
          />
        </div>
      </motion.div>

      {/* ⚠️ No Entregadas - Análisis */}
      {stats.totalNoEntregadas > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-rose-600" />
            Análisis de No Entregadas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <MetricCard
              title="Total No Entregadas"
              value={stats.totalNoEntregadas}
              total={stats.totalFacturas}
              icon={AlertTriangle}
              gradient="from-rose-500 to-pink-500"
              delay={0.1}
            />
            <MetricCard
              title="Reincidencias"
              value={stats.reincidencias}
              total={stats.totalNoEntregadas}
              icon={Activity}
              gradient="from-amber-500 to-orange-500"
              delay={0.2}
            />
            <MetricCard
              title="% Reincidencia"
              value={stats.porcentajeReincidencia}
              total={100}
              icon={BarChart3}
              gradient="from-red-500 to-rose-500"
              delay={0.3}
              isPercentage
            />
          </div>

          {/* Motivos de No Entrega */}
          {stats.motivosNoEntrega && stats.motivosNoEntrega.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                Motivos de No Entrega
              </h3>
              <div className="space-y-4">
                {stats.motivosNoEntrega.map((motivo, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {motivo.motivo}
                      </span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {motivo.count} ({motivo.porcentaje}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${motivo.porcentaje}%` }}
                        transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                        className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* 📦 Recolecciones de Hoy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
          <ShoppingCart className="w-6 h-6 mr-2 text-purple-600" />
          Recolecciones de Hoy
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Total Hoy"
            value={stats.recoleccionesHoy}
            total={stats.recoleccionesHoy}
            icon={ShoppingCart}
            gradient="from-purple-500 to-pink-500"
            delay={0.1}
          />
          <MetricCard
            title="Completadas"
            value={stats.recoleccionesCompletadas}
            total={stats.recoleccionesHoy}
            icon={CheckCircle2}
            gradient="from-emerald-500 to-teal-500"
            delay={0.2}
          />
          <MetricCard
            title="Pendientes"
            value={stats.recoleccionesPendientes}
            total={stats.recoleccionesHoy}
            icon={Clock}
            gradient="from-amber-500 to-orange-500"
            delay={0.3}
          />
        </div>
      </motion.div>

      {/* 💰 Resumen Financiero del Mes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-emerald-600" />
          Resumen Financiero del Mes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Cobros</p>
                <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  <AnimatedNumber value={stats.cobrosFinanzas} prefix="RD$ " />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Ingresos del mes
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Gastos</p>
                <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                  <AnimatedNumber value={stats.gastosFinanzas} prefix="RD$ " />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Egresos del mes
                </p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Balance</p>
                <h3 className={`text-3xl font-bold ${stats.balanceFinanzas >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  <AnimatedNumber value={stats.balanceFinanzas} prefix="RD$ " />
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  {stats.balanceFinanzas >= 0 ? 'Ganancia' : 'Pérdida'}
                </p>
              </div>
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stats.balanceFinanzas >= 0 ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-red-500'} flex items-center justify-center shadow-lg`}>
                <DollarSign className="w-7 h-7 text-white" />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

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
const MetricCard = ({ title, value, total, icon: Icon, gradient, delay, onClick, isPercentage = false }) => {
  const percentage = isPercentage ? value : (total > 0 ? Math.round((value / total) * 100) : 0);
  const displayValue = isPercentage ? value : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 ${onClick ? 'cursor-pointer' : ''} hover:shadow-xl transition-all`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
            <AnimatedNumber value={displayValue} suffix={isPercentage ? '%' : ''} />
          </h3>
          {!isPercentage && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              de {total} totales
            </p>
          )}
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
