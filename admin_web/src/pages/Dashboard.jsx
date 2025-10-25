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

  // Normalizar rol (admin → admin_general)
  const rol = userData?.rol === 'admin' ? 'admin_general' : userData?.rol || 'admin_general';

  useEffect(() => {
    loadDashboardData();
  }, [rol]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
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
      console.error('Error cargando dashboard:', error);
      // Usar datos por defecto si falla
      setStats({
        totalEmbarques: 0,
        rutasActivas: 0,
        totalEmpleados: 0,
        facturasEntregadas: 0,
        facturasPendientes: 0,
        facturasNoEntregadas: 0,
        totalGastos: 0,
        totalIngresos: 0
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

  // DASHBOARD SUPER ADMIN
  if (rol === 'super_admin') {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Super Admin</h1>
          <p className="text-gray-600 mt-2">Gestión completa del sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Compañías</p>
                <p className="text-4xl font-bold mt-2">{stats.totalCompanies || 0}</p>
              </div>
              <Package className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Usuarios</p>
                <p className="text-4xl font-bold mt-2">{stats.totalUsers || 0}</p>
              </div>
              <Users className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Tickets Abiertos</p>
                <p className="text-4xl font-bold mt-2">{stats.openTickets || 0}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Sistema</p>
                <p className="text-2xl font-bold mt-2">Operativo</p>
              </div>
              <CheckCircle className="w-12 h-12 text-orange-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/companies')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Gestionar Compañías</h3>
                <p className="text-gray-600 text-sm mt-1">Administrar empresas del sistema</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/tickets-admin')}
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-4">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Ver Tickets</h3>
                <p className="text-gray-600 text-sm mt-1">Gestionar solicitudes de soporte</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // DASHBOARD ADMIN GENERAL
  if (rol === 'admin_general') {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard General</h1>
          <p className="text-gray-600 mt-2">Vista completa del sistema de envíos</p>
        </div>

        {/* Stats Cards - Fila 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Embarques</p>
                <p className="text-4xl font-bold mt-2">{stats.totalEmbarques || 0}</p>
              </div>
              <Package className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Rutas Activas</p>
                <p className="text-4xl font-bold mt-2">{stats.rutasActivas || 0}</p>
              </div>
              <TruckIcon className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Empleados</p>
                <p className="text-4xl font-bold mt-2">{stats.totalEmpleados || 0}</p>
              </div>
              <Users className="w-12 h-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Total Ingresos</p>
                <p className="text-4xl font-bold mt-2">${(stats.totalIngresos || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Stats Cards - Fila 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Entregas Completadas
                </p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.facturasEntregadas || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  Facturas Pendientes
                </p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.facturasPendientes || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  No Entregadas
                </p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.facturasNoEntregadas || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                  Total Gastos
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-2">${(stats.totalGastos || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button onClick={() => navigate('/embarques')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-4"><Package className="w-8 h-8 text-blue-600" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Gestionar Embarques</h3>
                <p className="text-gray-600 text-sm mt-1">Ver y administrar contenedores</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/rutas')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-4"><TruckIcon className="w-8 h-8 text-green-600" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Crear Rutas</h3>
                <p className="text-gray-600 text-sm mt-1">Asignar facturas a repartidores</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/empleados')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <div className="flex items-center gap-4">
              <div className="bg-purple-100 rounded-full p-4"><Users className="w-8 h-8 text-purple-600" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Gestionar Empleados</h3>
                <p className="text-gray-600 text-sm mt-1">Administrar equipo de trabajo</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/recolecciones')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 rounded-full p-4"><FileText className="w-8 h-8 text-orange-600" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Recolecciones</h3>
                <p className="text-gray-600 text-sm mt-1">Ver recolecciones de EE.UU.</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/secretarias')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 rounded-full p-4"><CheckCircle className="w-8 h-8 text-indigo-600" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Panel Secretarías</h3>
                <p className="text-gray-600 text-sm mt-1">Confirmar facturas</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/reportes')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1 text-left">
            <div className="flex items-center gap-4">
              <div className="bg-pink-100 rounded-full p-4"><FileText className="w-8 h-8 text-pink-600" /></div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Ver Reportes</h3>
                <p className="text-gray-600 text-sm mt-1">Análisis y estadísticas</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // DASHBOARD SECRETARIA
  if (rol === 'secretaria') {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Secretaría</h1>
          <p className="text-gray-600 mt-2">Gestiona y confirma las facturas de envío</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pendientes de Confirmar</p>
                <p className="text-4xl font-bold mt-2">{stats.facturasPendientes || 0}</p>
              </div>
              <Clock className="w-12 h-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Confirmadas</p>
                <p className="text-4xl font-bold mt-2">{stats.facturasConfirmadas || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Confirmadas Hoy</p>
                <p className="text-4xl font-bold mt-2">{stats.facturasHoy || 0}</p>
              </div>
              <Package className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Por Cobrar</p>
                <p className="text-4xl font-bold mt-2">${(stats.totalPorCobrar || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <button onClick={() => navigate('/secretarias')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-4"><Phone className="w-8 h-8 text-blue-600" /></div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-bold text-gray-800">Confirmar Facturas</h3>
                <p className="text-gray-600 text-sm mt-1">Validar datos de clientes y direcciones</p>
              </div>
              <div className="text-3xl text-blue-600">→</div>
            </div>
          </button>

          <button onClick={() => navigate('/embarques')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-4"><Package className="w-8 h-8 text-green-600" /></div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-bold text-gray-800">Ver Embarques</h3>
                <p className="text-gray-600 text-sm mt-1">Revisar contenedores y envíos</p>
              </div>
              <div className="text-3xl text-green-600">→</div>
            </div>
          </button>
        </div>

        {/* Últimas facturas pendientes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Últimas Facturas Pendientes</h2>
            <button onClick={() => navigate('/secretarias')} className="text-blue-600 hover:text-blue-700 font-medium">Ver todas →</button>
          </div>

          {recentData.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">¡Excelente! No hay facturas pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentData.map((factura) => (
                <div key={factura.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{factura.numeroFactura}</p>
                      <p className="text-sm text-gray-600 mt-1">{factura.cliente}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {factura.direccion || 'Sin dirección'}
                      </p>
                    </div>
                    <button onClick={() => navigate('/secretarias')} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                      Confirmar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // DASHBOARD RECOLECTOR
  if (rol === 'recolector') {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">¡Hola, {userData?.nombre}!</h1>
          <p className="text-gray-600 mt-2">Panel de Recolecciones - Estados Unidos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Recolecciones Hoy</p>
                <p className="text-4xl font-bold mt-2">{stats.recoleccionesHoy || 0}</p>
              </div>
              <Clock className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Recolecciones</p>
                <p className="text-4xl font-bold mt-2">{stats.recoleccionesTotales || 0}</p>
              </div>
              <Package className="w-12 h-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">En Tránsito</p>
                <p className="text-4xl font-bold mt-2">{stats.enTransito || 0}</p>
              </div>
              <TruckIcon className="w-12 h-12 text-orange-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completadas</p>
                <p className="text-4xl font-bold mt-2">{stats.completadas || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-200" />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <button onClick={() => navigate('/recolecciones')} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-center gap-4">
              <Package className="w-8 h-8" />
              <div className="text-center">
                <h3 className="text-xl font-bold">Crear Nueva Recolección</h3>
                <p className="text-blue-100 text-sm mt-1">Registra un nuevo paquete recogido</p>
              </div>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Mis Recolecciones Recientes</h2>
            <button onClick={() => navigate('/recolecciones')} className="text-blue-600 hover:text-blue-700 font-medium">Ver todas →</button>
          </div>

          {recentData.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No hay recolecciones registradas</p>
              <button onClick={() => navigate('/recolecciones')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                Crear Primera Recolección
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentData.map((recoleccion) => (
                <div key={recoleccion.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{recoleccion.codigoTracking}</p>
                      <p className="text-sm text-gray-600 mt-1">{recoleccion.cliente}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      recoleccion.estado === 'completada' ? 'bg-green-100 text-green-800' :
                      recoleccion.estado === 'en_transito' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {recoleccion.estado === 'completada' ? 'Completada' :
                       recoleccion.estado === 'en_transito' ? 'En Tránsito' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Fecha:</p>
                      <p className="text-gray-800 font-medium">{new Date(recoleccion.fechaRecoleccion).toLocaleDateString('es-DO')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Dirección:</p>
                      <p className="text-gray-800 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {recoleccion.direccionRecoleccion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // DASHBOARD REPARTIDOR
  if (rol === 'repartidor') {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">¡Hola, {userData?.nombre}!</h1>
          <p className="text-gray-600 mt-2">Panel de Repartidor - República Dominicana</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Rutas Activas</p>
                <p className="text-4xl font-bold mt-2">{stats.rutasActivas || 0}</p>
              </div>
              <TruckIcon className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Entregas Completadas</p>
                <p className="text-4xl font-bold mt-2">{stats.facturasEntregadas || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Pendientes de Entrega</p>
                <p className="text-4xl font-bold mt-2">{stats.facturasPendientes || 0}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Total Cobrado</p>
                <p className="text-4xl font-bold mt-2">${(stats.totalCobrado || 0).toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <button onClick={() => navigate('/rutas')} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center justify-center gap-4">
              <MapPin className="w-8 h-8" />
              <div className="text-center">
                <h3 className="text-xl font-bold">Ver Mis Rutas</h3>
                <p className="text-blue-100 text-sm mt-1">Gestiona tus entregas y rutas asignadas</p>
              </div>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Mis Rutas Activas</h2>
            <button onClick={() => navigate('/rutas')} className="text-blue-600 hover:text-blue-700 font-medium">Ver todas →</button>
          </div>

          {recentData.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No tienes rutas activas en este momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentData.map((ruta) => (
                <div key={ruta.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate('/rutas')}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{ruta.nombre}</p>
                      <p className="text-sm text-gray-600 mt-1">{ruta.zona}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">En Proceso</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Facturas:</p>
                      <p className="text-gray-800 font-medium">{ruta.totalFacturas || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Entregadas:</p>
                      <p className="text-green-600 font-medium">{ruta.facturasEntregadas || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pendientes:</p>
                      <p className="text-yellow-600 font-medium">{ruta.facturasPendientes || 0}</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-green-500 h-full transition-all" style={{ width: `${ruta.totalFacturas ? ((ruta.facturasEntregadas || 0) / ruta.totalFacturas) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // DASHBOARD ALMACÉN (almacen, almacen_rd, almacen_eeuu)
  if (rol === 'almacen' || rol === 'almacen_rd' || rol === 'almacen_eeuu') {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Panel de Almacén</h1>
          <p className="text-gray-600 mt-2">Gestión de embarques y rutas de entrega</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Embarques Activos</p>
                <p className="text-4xl font-bold mt-2">{stats.embarquesActivos || 0}</p>
              </div>
              <Package className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Rutas Creadas</p>
                <p className="text-4xl font-bold mt-2">{stats.rutasCreadas || 0}</p>
              </div>
              <TruckIcon className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">No Entregadas</p>
                <p className="text-4xl font-bold mt-2">{stats.facturasNoEntregadas || 0}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Listas Para Ruta</p>
                <p className="text-4xl font-bold mt-2">{stats.facturasListasParaRuta || 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <button onClick={() => navigate('/embarques')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 rounded-full p-4"><Package className="w-8 h-8 text-blue-600" /></div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-bold text-gray-800">Ver Embarques</h3>
                <p className="text-gray-600 text-sm mt-1">Gestionar contenedores</p>
              </div>
              <div className="text-3xl text-blue-600">→</div>
            </div>
          </button>

          <button onClick={() => navigate('/rutas')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 rounded-full p-4"><MapPin className="w-8 h-8 text-green-600" /></div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-bold text-gray-800">Crear Rutas</h3>
                <p className="text-gray-600 text-sm mt-1">Asignar repartidores</p>
              </div>
              <div className="text-3xl text-green-600">→</div>
            </div>
          </button>

          <button onClick={() => navigate('/facturas-no-entregadas')} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-100 rounded-full p-4"><AlertTriangle className="w-8 h-8 text-yellow-600" /></div>
              <div className="text-left flex-1">
                <h3 className="text-lg font-bold text-gray-800">No Entregadas</h3>
                <p className="text-gray-600 text-sm mt-1">Reasignar facturas</p>
              </div>
              <div className="text-3xl text-yellow-600">→</div>
            </div>
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Embarques Activos</h2>
            <button onClick={() => navigate('/embarques')} className="text-blue-600 hover:text-blue-700 font-medium">Ver todos →</button>
          </div>

          {recentData.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No hay embarques activos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentData.map((embarque) => (
                <div key={embarque.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{embarque.numeroContenedor || embarque.codigoTracking}</p>
                      <p className="text-sm text-gray-600 mt-1">{embarque.origen} → {embarque.destino}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">Activo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Facturas:</p>
                      <p className="text-gray-800 font-medium">{embarque.totalFacturas || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Confirmadas:</p>
                      <p className="text-green-600 font-medium">{embarque.facturasConfirmadas || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pendientes:</p>
                      <p className="text-yellow-600 font-medium">{embarque.facturasPendientes || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-2">Sistema de Gestión de Envíos</p>
      </div>
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
        <p className="font-bold">Rol no reconocido</p>
        <p className="text-sm">Por favor, contacta al administrador para verificar tu rol.</p>
      </div>
    </div>
  );
};

export default Dashboard;