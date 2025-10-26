// admin_web/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TruckIcon, Users, DollarSign, AlertTriangle, CheckCircle, Clock, FileText, MapPin, Phone, Bell } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [recentData, setRecentData] = useState([]);
  const [error, setError] = useState(null);

  // Normalizar rol (admin → admin_general)
  const rol = userData?.rol === 'admin' ? 'admin_general' : userData?.rol || 'admin_general';

  useEffect(() => {
    loadDashboardData();
  }, [rol]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar datos según el rol
      switch (rol) {
        case 'super_admin':
          const superAdminRes = await api.get('/dashboard/super-admin-stats');
          setStats(superAdminRes.data);
          break;
          
        case 'admin_general':
          const adminRes = await api.get('/dashboard/stats');
          setStats(adminRes.data);
          break;
          
        case 'secretaria':
          const secretariaRes = await api.get('/facturas/stats-secretaria');
          setStats(secretariaRes.data);
          const facturasRes = await api.get('/facturas?estado=sin_confirmar&limit=5');
          setRecentData(facturasRes.data.facturas || []);
          break;
          
        case 'recolector':
          const recolectorRes = await api.get('/recolecciones/stats');
          setStats(recolectorRes.data);
          const recoleccionesRes = await api.get('/recolecciones?limit=5');
          setRecentData(recoleccionesRes.data.recolecciones || []);
          break;
          
        case 'almacen':
        case 'almacen_rd':
        case 'almacen_eeuu':
          const almacenRes = await api.get('/embarques/stats-almacen');
          setStats(almacenRes.data);
          const embarquesRes = await api.get('/embarques?estado=activo&limit=5');
          setRecentData(embarquesRes.data.embarques || []);
          break;
          
        case 'repartidor':
          const repartidorRes = await api.get('/rutas/stats-repartidor');
          setStats(repartidorRes.data);
          const rutasRes = await api.get('/rutas?estado=en_proceso&limit=5');
          setRecentData(rutasRes.data.rutas || []);
          break;
          
        default:
          const defaultRes = await api.get('/dashboard/stats');
          setStats(defaultRes.data);
      }
    } catch (error) {
      // ✅ MEJOR MANEJO DE ERRORES
      console.error('Error cargando dashboard:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        endpoint: error.config?.url
      });
      
      setError(error.response?.data?.error || error.message || 'Error al cargar el dashboard');
      
      // Usar datos por defecto si falla
      setStats({
        // Stats generales
        totalEmbarques: 0,
        rutasActivas: 0,
        totalEmpleados: 0,
        facturasEntregadas: 0,
        facturasPendientes: 0,
        facturasNoEntregadas: 0,
        totalGastos: 0,
        totalIngresos: 0,
        // Stats de recolector
        recoleccionesHoy: 0,
        recoleccionesTotales: 0,
        enTransito: 0,
        completadas: 0,
        // Stats de almacén
        embarquesActivos: 0,
        rutasCreadas: 0,
        facturasListasParaRuta: 0,
        // Stats de secretaria
        facturasSinConfirmar: 0,
        facturasConfirmadas: 0,
        facturasTotal: 0,
        // Stats de repartidor
        rutasCompletadas: 0,
        rutasPendientes: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-900">Error al cargar el dashboard</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => loadDashboardData()}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // DASHBOARD SUPER ADMIN
  if (rol === 'super_admin') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard Super Admin</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Compañías</p>
                <p className="text-3xl font-bold">{stats.totalCompanies || 0}</p>
              </div>
              <Package className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-green-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Total Usuarios</p>
                <p className="text-3xl font-bold">{stats.totalUsers || 0}</p>
              </div>
              <Users className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-yellow-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">Tickets Abiertos</p>
                <p className="text-3xl font-bold">{stats.openTickets || 0}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-yellow-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD ADMIN GENERAL
  if (rol === 'admin_general') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Embarques Activos</p>
                <p className="text-3xl font-bold">{stats.totalEmbarques || 0}</p>
              </div>
              <Package className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-green-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Rutas Activas</p>
                <p className="text-3xl font-bold">{stats.rutasActivas || 0}</p>
              </div>
              <TruckIcon className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-purple-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Total Empleados</p>
                <p className="text-3xl font-bold">{stats.totalEmpleados || 0}</p>
              </div>
              <Users className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-orange-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Facturas Entregadas</p>
                <p className="text-3xl font-bold">{stats.facturasEntregadas || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-orange-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Facturas Pendientes</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.facturasPendientes || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Facturas No Entregadas</h3>
            <p className="text-3xl font-bold text-red-600">{stats.facturasNoEntregadas || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Gastos</h3>
            <p className="text-3xl font-bold text-gray-700">${stats.totalGastos || 0}</p>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD SECRETARIA
  if (rol === 'secretaria') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Panel de Secretaría</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">Facturas Sin Confirmar</p>
                <p className="text-3xl font-bold">{stats.facturasSinConfirmar || 0}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-green-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Facturas Confirmadas</p>
                <p className="text-3xl font-bold">{stats.facturasConfirmadas || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-blue-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total de Facturas</p>
                <p className="text-3xl font-bold">{stats.facturasTotal || 0}</p>
              </div>
              <FileText className="h-12 w-12 text-blue-200" />
            </div>
          </div>
        </div>

        {recentData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Facturas Recientes Sin Confirmar</h2>
            <div className="space-y-2">
              {recentData.map((factura) => (
                <div key={factura.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>{factura.numeroFactura}</span>
                  <span className="text-sm text-gray-600">{factura.cliente}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // DASHBOARD RECOLECTOR
  if (rol === 'recolector') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">¡Hola, {userData?.nombre}!</h1>
        <p className="text-gray-600 mb-8">Panel de Recolecciones - Estados Unidos</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Recolecciones Hoy</p>
                <p className="text-3xl font-bold">{stats.recoleccionesHoy || stats.hoy || 0}</p>
              </div>
              <Clock className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-purple-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Total Recolecciones</p>
                <p className="text-3xl font-bold">{stats.recoleccionesTotales || stats.total || 0}</p>
              </div>
              <Package className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-orange-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">En Tránsito</p>
                <p className="text-3xl font-bold">{stats.enTransito || stats.enProceso || 0}</p>
              </div>
              <TruckIcon className="h-12 w-12 text-orange-200" />
            </div>
          </div>

          <div className="bg-green-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Completadas</p>
                <p className="text-3xl font-bold">{stats.completadas || stats.entregadas || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recolecciones Recientes</h2>
          {recentData.length > 0 ? (
            <div className="space-y-2">
              {recentData.map((recoleccion) => (
                <div key={recoleccion.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{recoleccion.tracking_numero}</p>
                    <p className="text-sm text-gray-600">{recoleccion.remitente?.nombre || 'Sin remitente'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    recoleccion.status === 'Entregado' ? 'bg-green-100 text-green-800' :
                    recoleccion.status === 'En tránsito' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {recoleccion.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay recolecciones recientes</p>
          )}
        </div>
      </div>
    );
  }

  // DASHBOARD ALMACÉN
  if (rol === 'almacen' || rol === 'almacen_rd' || rol === 'almacen_eeuu') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Panel de Almacén</h1>
        <p className="text-gray-600 mb-8">Gestión de embarques y rutas de entrega</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Embarques Activos</p>
                <p className="text-3xl font-bold">{stats.embarquesActivos || 0}</p>
              </div>
              <Package className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-green-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Rutas Creadas</p>
                <p className="text-3xl font-bold">{stats.rutasCreadas || 0}</p>
              </div>
              <TruckIcon className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-red-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100">Facturas No Entregadas</p>
                <p className="text-3xl font-bold">{stats.facturasNoEntregadas || 0}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-200" />
            </div>
          </div>

          <div className="bg-purple-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Listas para Ruta</p>
                <p className="text-3xl font-bold">{stats.facturasListasParaRuta || 0}</p>
              </div>
              <FileText className="h-12 w-12 text-purple-200" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Embarques Recientes</h2>
          {recentData.length > 0 ? (
            <div className="space-y-2">
              {recentData.map((embarque) => (
                <div key={embarque.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{embarque.nombre}</p>
                    <p className="text-sm text-gray-600">{embarque.descripcion}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    embarque.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {embarque.estado}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay embarques recientes</p>
          )}
        </div>
      </div>
    );
  }

  // DASHBOARD REPARTIDOR
  if (rol === 'repartidor') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Panel de Repartidor</h1>
        <p className="text-gray-600 mb-8">Gestión de rutas y entregas</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Rutas Activas</p>
                <p className="text-3xl font-bold">{stats.rutasActivas || 0}</p>
              </div>
              <TruckIcon className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-green-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Facturas Entregadas</p>
                <p className="text-3xl font-bold">{stats.facturasEntregadas || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-yellow-500 text-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100">Facturas Pendientes</p>
                <p className="text-3xl font-bold">{stats.facturasPendientes || 0}</p>
              </div>
              <Clock className="h-12 w-12 text-yellow-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Rutas Completadas</h3>
            <p className="text-3xl font-bold text-green-600">{stats.rutasCompletadas || 0}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Rutas Pendientes</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.rutasPendientes || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Rutas Recientes</h2>
          {recentData.length > 0 ? (
            <div className="space-y-2">
              {recentData.map((ruta) => (
                <div key={ruta.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{ruta.nombre}</p>
                    <p className="text-sm text-gray-600">Facturas: {ruta.totalFacturas || 0}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    ruta.estado === 'completada' ? 'bg-green-100 text-green-800' :
                    ruta.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ruta.estado}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay rutas recientes</p>
          )}
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="text-gray-600">Bienvenido al sistema</p>
    </div>
  );
};

export default Dashboard;