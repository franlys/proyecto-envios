// admin_web/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const { userData, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-yellow-500 text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sin Datos</h2>
          <p className="text-gray-600">No hay estadísticas disponibles en este momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Dashboard - {userData?.rol === 'super_admin' ? 'Super Admin' : 'Administrador General'}
        </h1>
        <p className="text-gray-600">Bienvenido, {userData?.nombre}</p>
        {stats.empresa && (
          <p className="text-sm text-gray-500 mt-1">
            Empresa: {stats.empresa.nombre} - Plan: {stats.empresa.plan}
          </p>
        )}
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Embarques Activos"
          value={stats.embarquesActivos}
          subtitle={`Total: ${stats.totalEmbarques || 0}`}
          icon="📦"
          color="blue"
        />
        <StatCard
          title="Recolecciones Hoy"
          value={stats.recoleccionesHoy}
          subtitle={`Total: ${stats.totalRecolecciones || 0}`}
          icon="🚚"
          color="green"
        />
        <StatCard
          title="Rutas en Curso"
          value={stats.rutasEnCurso}
          subtitle={`Total: ${stats.totalRutas || 0}`}
          icon="🚗"
          color="yellow"
        />
        <StatCard
          title="Facturas Pendientes"
          value={stats.facturasPendientes}
          subtitle={`Entregadas: ${stats.facturasEntregadas || 0}`}
          icon="📄"
          color="red"
        />
      </div>

      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Usuarios del Sistema</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalUsuarios || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                Activos: {stats.usuariosActivos || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total de Facturas</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalFacturas || 0}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalFacturas > 0 
                  ? `${Math.round((stats.facturasEntregadas / stats.totalFacturas) * 100)}% entregadas`
                  : 'Sin facturas'
                }
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Estado del Sistema</p>
              <p className="text-2xl font-bold text-green-600">Operativo</p>
              <p className="text-xs text-gray-500 mt-1">
                Todos los servicios funcionando
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickAccessButton
            title="Embarques"
            icon="📦"
            color="blue"
            onClick={() => navigate('/embarques')}
          />
          <QuickAccessButton
            title="Recolecciones"
            icon="🚚"
            color="green"
            onClick={() => navigate('/recolecciones')}
          />
          <QuickAccessButton
            title="Rutas"
            icon="🚗"
            color="yellow"
            onClick={() => navigate('/rutas')}
          />
          <QuickAccessButton
            title="Reportes"
            icon="📊"
            color="purple"
            onClick={() => navigate('/reportes')}
          />
        </div>
      </div>
    </div>
  );
};

// Componente StatCard
const StatCard = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color] || colorClasses.blue}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

// Componente QuickAccessButton
const QuickAccessButton = ({ title, icon, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    green: 'bg-green-50 hover:bg-green-100 text-green-600',
    yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600'
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg transition ${colorClasses[color]} flex flex-col items-center justify-center gap-2`}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-sm font-medium">{title}</span>
    </button>
  );
};

export default Dashboard;