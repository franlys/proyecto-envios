// admin_web/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useRealtimeRutasActivas, useRealtimeUsuarios } from '../hooks/useRealtimeCollection';
import MonitorCargadores from '../components/monitoring/MonitorCargadores';
import MonitorRepartidores from '../components/monitoring/MonitorRepartidores';
import Card, { CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { motion } from 'framer-motion';
import {
  Package,
  TruckIcon,
  MapPin,
  FileText,
  Users,
  Activity,
  TrendingUp
} from 'lucide-react';

// 🎯 Componente para animar números (CountUp effect)
const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1200; // Duración de la animación en ms
    const steps = 60; // Frames de animación
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

const Dashboard = () => {
  const { userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔥 Datos en tiempo real con Firestore listeners
  const { data: rutasActivas } = useRealtimeRutasActivas();
  const { data: usuarios } = useRealtimeUsuarios();

  // Redireccionar según rol específico
  useEffect(() => {
    if (!authLoading && userData) {
      const rol = userData.rol;

      // Redirigir a dashboard específico según rol
      if (rol === 'secretaria') {
        navigate('/secretarias');
        return;
      } else if (rol === 'recolector') {
        navigate('/recolecciones');
        return;
      } else if (rol === 'repartidor') {
        navigate('/rutas');
        return;
      } else if (rol === 'cargador') {
        navigate('/cargadores');
        return;
      } else if (rol === 'almacen_rd') {
        navigate('/embarques');
        return;
      } else if (rol === 'almacen_eeuu') {
        navigate('/almacen-usa');
        return;
      }

      // Solo admin_general y super_admin ven este dashboard
      if (rol !== 'admin_general' && rol !== 'super_admin') {
        navigate('/');
        return;
      }
    }
  }, [userData, authLoading]); // ✅ CORREGIDO: Removido navigate de dependencias

  // ✅ CORRECCIÓN: Cargar estadísticas adaptado al formato real del backend
  useEffect(() => {
    const fetchStats = async () => {
      // Solo cargar stats si el usuario es admin
      if (!userData || (userData.rol !== 'admin_general' && userData.rol !== 'super_admin')) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get('/dashboard/stats');
        console.log('📊 Respuesta del backend:', response.data);

        // ✅ CORRECCIÓN: El backend devuelve directamente los datos, no dentro de data.stats
        const data = response.data;

        // Transformar los datos del backend al formato que espera el frontend
        const transformedStats = {
          embarquesActivos: data.embarques?.activos || 0,
          recoleccionesHoy: data.recolecciones?.hoy || 0,
          rutasEnCurso: data.rutas?.enCurso || data.rutas?.activas || 0,
          facturasPendientes: data.facturas?.pendientes || 0,
          // Datos adicionales que podemos usar
          totalUsuarios: data.usuarios?.total || 0,
          usuariosActivos: data.usuarios?.activos || 0,
          totalRecolecciones: data.recolecciones?.total || 0,
          totalEmbarques: data.embarques?.total || 0,
          totalRutas: data.rutas?.total || 0,
          totalFacturas: data.facturas?.total || 0,
          facturasEntregadas: data.facturas?.entregadas || 0,
          // Información de la empresa
          empresa: data.empresa || null
        };

        console.log('✅ Stats transformadas:', transformedStats);
        setStats(transformedStats);

      } catch (err) {
        console.error('❌ Error cargando estadísticas:', err);

        if (err.response) {
          if (err.response.status === 401) {
            setError('Sesión expirada. Por favor, inicia sesión nuevamente.');
            setTimeout(() => navigate('/login'), 2000);
          } else if (err.response.status === 403) {
            setError('No tienes permisos para ver estas estadísticas.');
          } else if (err.response.status === 500) {
            setError('Error del servidor. Intenta nuevamente más tarde.');
          } else {
            setError(err.response.data?.error || 'Error al cargar estadísticas');
          }
        } else if (err.request) {
          setError('Error de conexión. Verifica tu internet e intenta nuevamente.');
        } else {
          setError(err.message || 'Error desconocido al cargar estadísticas');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && userData) {
      fetchStats();
    }
  }, [userData, authLoading]); // ✅ CORREGIDO: Removido navigate de dependencias

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Activity className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Error</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Reintentar
            </button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Activity className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600 font-medium">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Card className="max-w-md">
          <CardBody className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Sin Datos</h2>
            <p className="text-slate-600">No hay estadísticas disponibles en este momento.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              Dashboard - {userData?.rol === 'super_admin' ? 'Super Admin' : 'Administrador General'}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Bienvenido, {userData?.nombre}</p>
          </div>
        </div>
        {stats.empresa && (
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="info" size="sm">
              {stats.empresa.nombre}
            </Badge>
            <Badge variant="neutral" size="sm">
              Plan: {stats.empresa.plan}
            </Badge>
          </div>
        )}
      </motion.div>

      {/* Estadísticas principales - TIEMPO REAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
          title="Embarques Activos"
          value={stats.embarquesActivos}
          subtitle={`Total: ${stats.totalEmbarques || 0}`}
          icon={Package}
          color="indigo"
          realtime={false}
          delay={0.1}
        />
        <StatCard
          title="Recolecciones Hoy"
          value={stats.recoleccionesHoy}
          subtitle={`Total: ${stats.totalRecolecciones || 0}`}
          icon={TruckIcon}
          color="emerald"
          realtime={false}
          delay={0.2}
        />
        <StatCard
          title="Rutas en Curso"
          value={rutasActivas.length}
          subtitle={`Total registradas: ${stats.totalRutas || 0}`}
          icon={MapPin}
          color="amber"
          realtime={true}
          delay={0.3}
        />
        <StatCard
          title="Usuarios Activos"
          value={usuarios.length}
          subtitle={`Total: ${stats.totalUsuarios || 0}`}
          icon={Users}
          color="slate"
          realtime={true}
          delay={0.4}
        />
      </div>

      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Total de Facturas</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
                <AnimatedNumber value={stats.totalFacturas || 0} />
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                {stats.totalFacturas > 0
                  ? `${Math.round((stats.facturasEntregadas / stats.totalFacturas) * 100)}% entregadas`
                  : 'Sin facturas'
                }
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 ml-3 shadow-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monitores en Tiempo Real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <MonitorCargadores />
        <MonitorRepartidores />
      </div>

      {/* Accesos rápidos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Accesos Rápidos</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAccessButton
            title="Embarques"
            icon={Package}
            color="indigo"
            onClick={() => navigate('/embarques')}
          />
          <QuickAccessButton
            title="Recolecciones"
            icon={TruckIcon}
            color="emerald"
            onClick={() => navigate('/recolecciones')}
          />
          <QuickAccessButton
            title="Rutas"
            icon={MapPin}
            color="amber"
            onClick={() => navigate('/rutas')}
          />
          <QuickAccessButton
            title="Reportes"
            icon={FileText}
            color="slate"
            onClick={() => navigate('/reportes')}
          />
        </div>
      </motion.div>
    </div>
  );
};

// Componente StatCard con diseño enterprise y animaciones
const StatCard = ({ title, value, subtitle, icon: IconComponent, color, realtime = false, delay = 0 }) => {
  const colorConfig = {
    indigo: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600'
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600'
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600'
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600'
    },
    slate: {
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600'
    }
  };

  const config = colorConfig[color] || colorConfig.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow relative"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
            {realtime && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-md">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">En vivo</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-white mb-1">
            <AnimatedNumber value={value} />
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-sm ${config.iconBg}`}>
          {IconComponent && <IconComponent className="w-6 h-6 text-white" />}
        </div>
      </div>
    </motion.div>
  );
};

// Componente QuickAccessButton con diseño enterprise
const QuickAccessButton = ({ title, icon: IconComponent, color, onClick }) => {
  const colorConfig = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
      text: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-800',
      border: 'hover:border-indigo-200 dark:hover:border-indigo-700'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-800',
      border: 'hover:border-emerald-200 dark:hover:border-emerald-700'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-800',
      border: 'hover:border-amber-200 dark:hover:border-amber-700'
    },
    slate: {
      bg: 'bg-slate-50 dark:bg-slate-700/50',
      hover: 'hover:bg-slate-100 dark:hover:bg-slate-700',
      text: 'text-slate-600 dark:text-slate-400',
      iconBg: 'bg-slate-100 dark:bg-slate-600',
      border: 'hover:border-slate-200 dark:hover:border-slate-600'
    }
  };

  const config = colorConfig[color] || colorConfig.indigo;

  return (
    <button
      onClick={onClick}
      className={`${config.bg} ${config.hover} ${config.text} rounded-xl p-4 transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[100px] border border-transparent ${config.border} hover:shadow-sm group`}
    >
      <div className={`${config.iconBg} w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
        {IconComponent && <IconComponent className="w-6 h-6" />}
      </div>
      <span className="text-sm font-medium text-center">{title}</span>
    </button>
  );
};

export default Dashboard;