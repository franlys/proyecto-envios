// admin_web/src/pages/Empleados.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Search, Edit, Trash2, X, Shield, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function Empleados() {
  const { userData, user } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Formulario de nuevo empleado
  const [nuevoEmpleado, setNuevoEmpleado] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    rol: '',
    activo: true
  });

  const [successMessage, setSuccessMessage] = useState(null);

  // Roles disponibles con nombres amigables
  const rolesDisponibles = [
    { valor: 'recolector', label: 'Recolector', descripcion: 'Recoge paquetes en origen' },
    { valor: 'cargador', label: 'Cargador', descripcion: 'Prepara contenedores para embarque' }, // <-- LÍNEA AÑADIDA
    { valor: 'almacen_eeuu', label: 'Encargado de Almacén (EE.UU.)', descripcion: 'Gestiona almacén en Estados Unidos' },
    { valor: 'almacen_rd', label: 'Encargado de Almacén (RD)', descripcion: 'Gestiona almacén en República Dominicana' },
    { valor: 'repartidor', label: 'Repartidor', descripcion: 'Entrega paquetes a destinatarios' },
    { valor: 'secretaria', label: 'Secretaria', descripcion: 'Gestión administrativa y atención' },
    { valor: 'admin_general', label: 'Administrador General', descripcion: 'Acceso completo al sistema' }
  ];

  // Función para obtener el nombre amigable del rol
  const obtenerNombreRol = (rol) => {
    const rolEncontrado = rolesDisponibles.find(r => r.valor === rol);
    return rolEncontrado ? rolEncontrado.label : rol;
  };

  useEffect(() => {
    cargarEmpleados();
  }, [userData]);

  const cargarEmpleados = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!userData || !user) {
        console.log('⏳ Esperando autenticación...');
        return;
      }

      console.log('📡 Cargando empleados...');
      console.log('👤 Usuario actual:', {
        uid: userData.uid,
        rol: userData.rol,
        companyId: userData.companyId
      });

      // Construir URL según el rol
      let url = '/empleados';
      
      // Si es super_admin, puede ver todos los empleados
      if (userData.rol === 'super_admin') {
        console.log('🔑 Super Admin - Viendo todos los empleados');
        // No agregamos filtros, vemos todos
      } 
      // Si tiene companyId, solo ver empleados de su compañía
      else if (userData.companyId) {
        url += `?companyId=${userData.companyId}`;
        console.log('🏢 Filtrando por companyId:', userData.companyId);
      }
      // Si es admin_general sin companyId (caso legacy), ver todos
      else if (userData.rol === 'admin_general') {
        console.log('🔑 Admin General - Viendo todos los empleados');
      }

      const response = await api.get(url, {
        headers: {
          'X-User-Id': user.uid
        }
      });

      console.log('✅ Respuesta de empleados:', response.data);

      if (response.data.success) {
        setEmpleados(response.data.data || []);
        console.log(`📊 ${response.data.data?.length || 0} empleados cargados`);
      } else {
        throw new Error(response.data.error || 'Error desconocido');
      }
    } catch (err) {
      console.error('❌ Error cargando empleados:', err);
      setError(err.response?.data?.error || err.message || 'Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoEmpleado(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Validaciones
      if (!nuevoEmpleado.nombre || !nuevoEmpleado.email || !nuevoEmpleado.password || !nuevoEmpleado.rol) {
        throw new Error('Por favor completa todos los campos obligatorios');
      }

      if (nuevoEmpleado.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      // Datos a enviar
      const empleadoData = {
        nombre: nuevoEmpleado.nombre,
        email: nuevoEmpleado.email,
        password: nuevoEmpleado.password,
        telefono: nuevoEmpleado.telefono || null,
        rol: nuevoEmpleado.rol,
        companyId: userData.companyId || null
      };

      console.log('📤 Enviando datos:', empleadoData);

      const response = await api.post('/auth/register', empleadoData, {
        headers: {
          'X-User-Id': user.uid
        }
      });

      if (response.data.success) {
        setSuccessMessage('Empleado creado exitosamente');
        setShowModal(false);
        setNuevoEmpleado({
          nombre: '',
          email: '',
          password: '',
          telefono: '',
          rol: '',
          activo: true
        });
        cargarEmpleados();

        // Limpiar mensaje después de 3 segundos
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('❌ Error creando empleado:', err);
      setError(err.response?.data?.error || err.message || 'Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (empleadoId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/empleados/${empleadoId}`, {
        headers: {
          'X-User-Id': user.uid
        }
      });
      
      setSuccessMessage('Empleado eliminado exitosamente');
      cargarEmpleados();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error eliminando empleado:', err);
      setError(err.response?.data?.error || 'Error al eliminar empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (empleadoId, nuevoEstado) => {
    try {
      setLoading(true);
      await api.patch(`/empleados/${empleadoId}/estado`, 
        { activo: nuevoEstado },
        {
          headers: {
            'X-User-Id': user.uid
          }
        }
      );
      
      setSuccessMessage(`Empleado ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`);
      cargarEmpleados();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar empleados
  const empleadosFiltrados = empleados.filter(emp => {
    const matchSearch = emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRol = !filterRol || emp.rol === filterRol;
    const matchEstado = filterEstado === '' || 
                       (filterEstado === 'activo' && emp.activo) ||
                       (filterEstado === 'inactivo' && !emp.activo);
    
    return matchSearch && matchRol && matchEstado;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          Gestión de Empleados
        </h1>
        <p className="text-gray-600 mt-2">
          Administra usuarios y permisos del sistema
        </p>
      </div>

      {/* Estado de carga y debugging */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-yellow-800 mb-2">Estado de carga:</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>Total empleados: {empleados.length}</p>
          <p>Filtrados: {empleadosFiltrados.length}</p>
          <p>Loading: {loading ? 'Sí' : 'No'}</p>
          <p>User: {user?.email || 'No autenticado'} ({userData?.rol})</p>
          <p>Companies: {userData?.companyId || 'Sin compañía'}</p>
        </div>
      </div>

      {/* Mensajes */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los roles</option>
            {rolesDisponibles.map(rol => (
              <option key={rol.valor} value={rol.valor}>{rol.label}</option>
            ))}
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Empleados totales: <span className="font-semibold">{empleados.length}</span> | 
            Después de filtros: <span className="font-semibold">{empleadosFiltrados.length}</span>
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Tabla de empleados */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando empleados...</p>
          </div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron empleados</h3>
            <p className="text-gray-600">
              {searchTerm || filterRol || filterEstado 
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza creando tu primer empleado'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {empleadosFiltrados.map((empleado) => (
                  <tr key={empleado.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {empleado.nombre?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{empleado.nombre}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{empleado.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{empleado.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {obtenerNombreRol(empleado.rol)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleCambiarEstado(empleado.id, !empleado.activo)}
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          empleado.activo 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        } transition-colors cursor-pointer`}
                      >
                        {empleado.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEliminar(empleado.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de nuevo empleado */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Usuario</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={nuevoEmpleado.nombre}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={nuevoEmpleado.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={nuevoEmpleado.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="telefono"
                  value={nuevoEmpleado.telefono}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol / Puesto <span className="text-red-500">*</span>
                </label>
                <select
                  name="rol"
                  value={nuevoEmpleado.rol}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar rol</option>
                  {rolesDisponibles.map(rol => (
                    <option key={rol.valor} value={rol.valor}>
                      {rol.label}
                    </option>
                  ))}
                </select>
                {nuevoEmpleado.rol && (
                  <p className="text-xs text-gray-500 mt-1">
                    {rolesDisponibles.find(r => r.valor === nuevoEmpleado.rol)?.descripcion}
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}