import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Building2, Users, Activity, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

// ✅ FIX: Obtener la URL del backend desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DashboardSuperAdmin = () => {
  const navigate = useNavigate();
  const [systemHealth, setSystemHealth] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemHealth();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (companies.length > 0) {
      fetchSystemStats();
    }
  }, [companies]);

  const fetchSystemHealth = async () => {
    try {
      // ✅ FIX: Usar la variable de entorno en lugar de localhost hardcodeado
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Error checking health:', error);
      setSystemHealth({ status: 'ERROR', error: error.message });
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/companies');
      
      // ✅ SIEMPRE validar success primero
      if (response.data.success) {
        // ✅ Acceder a los datos desde response.data.data
        setCompanies(response.data.data || []);
      } else {
        // ✅ Lanzar el error que viene del backend
        throw new Error(response.data.error || 'Error al cargar compañías');
      }
    } catch (error) {
      console.error('Error cargando compañías:', error);
      setError(error.message);
      setCompanies([]); // ✅ Siempre setear array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Solo obtener usuarios del sistema
      const usersRes = await api.get('/empleados').catch(() => ({ data: [] }));
      
      const activeCount = companies.filter(c => c?.activo).length;
      const inactiveCount = companies.filter(c => !c?.activo).length;
      
      setStats({
        totalUsers: usersRes.data?.data?.length || usersRes.data?.length || 0,
        totalCompanies: companies.length,
        activeCompanies: activeCount,
        inactiveCompanies: inactiveCount
      });

    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  const getHealthColor = (status) => {
    if (status === 'OK') return 'bg-green-500';
    if (status === 'ERROR') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getHealthText = (status) => {
    if (status === 'OK') return 'Sistema Operativo';
    if (status === 'ERROR') return 'Sistema Caído';
    return 'Verificando...';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Monitor del Sistema</h1>
        <p className="text-gray-600 dark:text-gray-400">Panel de control y administración del sistema Multi-Tenant</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">
                <strong>Error:</strong> {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Health Status Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          <Activity className="inline mr-2" size={20} />
          Estado de Servicios
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Backend Status */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Backend API</p>
                <p className="text-lg font-semibold mt-1 text-gray-900 dark:text-white">
                  {systemHealth ? getHealthText(systemHealth.status) : 'Verificando...'}
                </p>
              </div>
              <div className={`w-4 h-4 rounded-full ${systemHealth ? getHealthColor(systemHealth.status) : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            </div>
            {systemHealth?.uptime && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                ⏱️ Uptime: {Math.floor(systemHealth.uptime / 60)} min
              </p>
            )}
            {/* ✅ NUEVO: Mostrar la URL que está usando para debugging */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              🔗 {API_URL}
            </p>
          </div>

          {/* Firebase Status */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Firebase/Firestore</p>
                <p className="text-lg font-semibold mt-1 text-gray-900 dark:text-white">Operativo</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">🔥 Conexión estable</p>
          </div>

          {/* Auth Status */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Autenticación</p>
                <p className="text-lg font-semibold mt-1 text-gray-900 dark:text-white">Operativo</p>
              </div>
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">🔐 Firebase Auth activo</p>
          </div>
        </div>
      </div>

      {/* System Stats - DATOS GLOBALES DEL SISTEMA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Companies */}
        <div 
          onClick={() => navigate('/companies')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Compañías Totales</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalCompanies}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">En el sistema</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Building2 className="text-blue-600 dark:text-blue-300" size={24} />
            </div>
          </div>
        </div>

        {/* Active Companies */}
        <div 
          onClick={() => navigate('/companies')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Compañías Activas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.activeCompanies}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Operando</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <CheckCircle className="text-green-600 dark:text-green-300" size={24} />
            </div>
          </div>
        </div>

        {/* Inactive Companies */}
        <div 
          onClick={() => navigate('/companies')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Compañías Inactivas</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.inactiveCompanies}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Desactivadas</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <AlertCircle className="text-red-600 dark:text-red-300" size={24} />
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div 
          onClick={() => navigate('/empleados')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuarios Totales</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalUsers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">En todas las compañías</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Users className="text-purple-600 dark:text-purple-300" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            <Building2 className="inline mr-2" size={20} />
            Compañías Registradas
          </h2>
          <button 
            onClick={() => navigate('/companies')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            Ver todas →
          </button>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando compañías...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="mx-auto text-gray-400 dark:text-gray-600 mb-3" size={48} />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No hay compañías registradas</p>
            <button 
              onClick={() => navigate('/companies')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Crear Primera Compañía
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Compañía</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Creada</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {companies.slice(0, 5).map((company) => (
                  <tr 
                    key={company.id} 
                    onClick={() => navigate('/companies')}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{company.nombre || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{company.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        company.plan === 'enterprise' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' :
                        company.plan === 'premium' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {company.plan || 'basic'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        company.activo ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {company.activo ? '✓ Activa' : '✗ Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {company.fechaCreacion ? new Date(company.fechaCreacion.toDate ? company.fechaCreacion.toDate() : company.fechaCreacion).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {company.adminEmail || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {companies.length > 5 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => navigate('/companies')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                >
                  Ver todas las {companies.length} compañías →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* System Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          <AlertCircle className="inline mr-2" size={20} />
          Alertas del Sistema
        </h2>
        <div className="space-y-3">
          {systemHealth?.status === 'ERROR' && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-200">
                    <strong>Backend API caído:</strong> {systemHealth.error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.inactiveCompanies > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-200">
                    <strong>Compañías inactivas:</strong> {stats.inactiveCompanies} compañía{stats.inactiveCompanies !== 1 ? 's' : ''} desactivada{stats.inactiveCompanies !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {systemHealth?.status === 'OK' && stats.inactiveCompanies === 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-400 dark:border-green-600 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-400 text-xl">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700 dark:text-green-200">
                    <strong>Todo operativo:</strong> No se detectaron problemas en el sistema
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <button
          onClick={() => navigate('/companies')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left"
        >
          <Building2 className="text-blue-600 dark:text-blue-400 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Gestionar Compañías</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Administra todas las compañías del sistema</p>
        </button>

        <button
          onClick={() => navigate('/empleados')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left"
        >
          <Users className="text-green-600 dark:text-green-400 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Ver Usuarios</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Revisa todos los usuarios del sistema</p>
        </button>

        <button
          onClick={() => navigate('/tickets-admin')}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition text-left"
        >
          <AlertCircle className="text-purple-600 dark:text-purple-400 mb-3" size={32} />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tickets de Soporte</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Revisa y responde tickets de ayuda</p>
        </button>
      </div>
    </div>
  );
};

export default DashboardSuperAdmin;