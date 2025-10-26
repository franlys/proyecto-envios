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

  // ✅ CORRECCIÓN: Redireccionar según rol específico
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
      }
      
      // Solo admin_general y super_admin ven este dashboard
      if (rol !== 'admin_general' && rol !== 'super_admin') {
        navigate('/');
        return;
      }
    }
  }, [userData, authLoading, navigate]);

  // ✅ CORRECCIÓN: Cargar estadísticas con manejo de errores completo
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
        
        if (response.data.success) {
          setStats(response.data.stats);
        } else {
          throw new Error(response.data.error || 'Error al cargar estadísticas');
        }

      } catch (err) {
        console.error('❌ Error cargando estadísticas:', err);
        
        // ✅ CORRECCIÓN: Manejo específico de diferentes tipos de errores
        if (err.response) {
          // Error del servidor
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
          // Error de red
          setError('Error de conexión. Verifica tu internet e intenta nuevamente.');
        } else {
          // Otro tipo de error
          setError(err.message || 'Error desconocido al cargar estadísticas');
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && userData) {
      fetchStats();
    }
  }, [userData, authLoading, navigate]);

  // ✅ CORRECCIÓN: Mostrar estados de carga y error apropiadamente
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

  // ✅ CORRECCIÓN: Mostrar error con opción de reintentar
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

  // ✅ CORRECCIÓN: Validar que stats exista antes de renderizar
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
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Embarques Activos"
          value={stats.embarquesActivos || 0}
          icon="📦"
          color="blue"
        />
        <StatCard
          title="Recolecciones Hoy"
          value={stats.recoleccionesHoy || 0}
          icon="🚚"
          color="green"
        />
        <StatCard
          title="Rutas en Curso"
          value={stats.rutasEnCurso || 0}
          icon="🚗"
          color="yellow"
        />
        <StatCard
          title="Facturas Pendientes"
          value={stats.facturasPendientes || 0}
          icon="📄"
          color="red"
        />
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Actividad Reciente</h2>
        {stats.actividadReciente && stats.actividadReciente.length > 0 ? (
          <ul className="space-y-3">
            {stats.actividadReciente.map((actividad, index) => (
              <li key={index} className="flex items-start border-b pb-3 last:border-b-0">
                <span className="text-2xl mr-3">{actividad.icon || '📌'}</span>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{actividad.descripcion}</p>
                  <p className="text-sm text-gray-500">{actividad.fecha}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
        )}
      </div>
    </div>
  );
};

// ✅ CORRECCIÓN: Componente StatCard con validación de props
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color] || colorClasses.blue}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;