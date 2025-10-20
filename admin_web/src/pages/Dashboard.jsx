// admin_web/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Package, Truck, FileText, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmbarques: 0,
    rutasActivas: 0,
    facturasNoEntregadas: 0,
    tasaEntrega: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    if (userData) {
      fetchDashboardData();
    }
  }, [userData]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Obtener estadísticas según el rol
      const [embarquesRes, rutasRes, facturasRes] = await Promise.all([
        api.get('/embarques').catch(() => ({ data: [] })),
        api.get('/rutas').catch(() => ({ data: [] })),
        api.get('/facturas/no-entregadas').catch(() => ({ data: [] }))
      ]);

      const embarques = embarquesRes.data?.data || embarquesRes.data || [];
      const rutas = rutasRes.data?.data || rutasRes.data || [];
      const facturasNoEntregadas = facturasRes.data?.facturas || facturasRes.data || [];

      // Calcular tasa de entrega
      const totalFacturas = embarques.reduce((sum, emb) => sum + (emb.facturas?.length || 0), 0);
      const facturasEntregadas = totalFacturas - facturasNoEntregadas.length;
      const tasaEntrega = totalFacturas > 0 ? Math.round((facturasEntregadas / totalFacturas) * 100) : 0;

      setStats({
        totalEmbarques: embarques.length,
        rutasActivas: rutas.filter(r => r.estado === 'en_progreso').length,
        facturasNoEntregadas: facturasNoEntregadas.length,
        tasaEntrega
      });

      // Actividades recientes (últimas rutas)
      const rutasRecientes = rutas
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5)
        .map(ruta => ({
          id: ruta.id,
          tipo: 'ruta',
          nombre: ruta.nombre,
          estado: ruta.estado,
          fecha: ruta.fecha,
          repartidor: ruta.empleadoNombre
        }));

      setRecentActivities(rutasRecientes);

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'pendiente': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'en_progreso': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'completada': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'cancelada': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    };
    return badges[estado] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      'pendiente': 'Pendiente',
      'en_progreso': 'En Progreso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    return textos[estado] || estado;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Bienvenido, {userData?.nombre}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Embarques */}
        <div 
          onClick={() => navigate('/embarques')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Embarques</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalEmbarques}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Total en tu compañía</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Package className="text-blue-600 dark:text-blue-300" size={24} />
            </div>
          </div>
        </div>

        {/* Rutas Activas */}
        <div 
          onClick={() => navigate('/rutas')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rutas</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.rutasActivas}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Total generadas</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Truck className="text-green-600 dark:text-green-300" size={24} />
            </div>
          </div>
        </div>

        {/* Facturas No Entregadas */}
        <div 
          onClick={() => navigate('/facturas-no-entregadas')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Facturas No Entregadas</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.facturasNoEntregadas}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Requieren atención</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
              <AlertCircle className="text-orange-600 dark:text-orange-300" size={24} />
            </div>
          </div>
        </div>

        {/* Tasa de Entrega */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasa de Entrega</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.tasaEntrega}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Efectividad</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <TrendingUp className="text-purple-600 dark:text-purple-300" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Actividad Reciente</h2>
        
        {recentActivities.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto text-gray-400 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 dark:text-gray-400">No hay actividad reciente</p>
            <button 
              onClick={() => navigate('/rutas')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Crear Primera Ruta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div 
                key={activity.id}
                onClick={() => navigate('/rutas')}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Truck className="text-blue-600 dark:text-blue-300" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{activity.nombre}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.repartidor} • {new Date(activity.fecha).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getEstadoBadge(activity.estado)}`}>
                  {getEstadoTexto(activity.estado)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <button
          onClick={() => navigate('/embarques')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left"
        >
          <Package className="text-blue-600 dark:text-blue-400 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Crear Embarque</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Registra un nuevo embarque en el sistema</p>
        </button>

        <button
          onClick={() => navigate('/rutas')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left"
        >
          <Truck className="text-green-600 dark:text-green-400 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Nueva Ruta</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Crea y asigna rutas de entrega</p>
        </button>

        <button
          onClick={() => navigate('/reportes')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left"
        >
          <FileText className="text-purple-600 dark:text-purple-400 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Ver Reportes</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Genera reportes detallados del sistema</p>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;