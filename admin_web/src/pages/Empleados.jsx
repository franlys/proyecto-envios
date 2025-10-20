import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserCheck, UserX, Building2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Empleados = () => {
  const { userData } = useAuth();
  const [empleados, setEmpleados] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState('all');
  const [filterActivo, setFilterActivo] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'repartidor',
    companyId: ''
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedEmpleadoForPassword, setSelectedEmpleadoForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isSuperAdmin = userData?.rol === 'super_admin';

  useEffect(() => {
    fetchEmpleados();
    if (isSuperAdmin) {
      fetchCompanies();
    }
  }, [filterRol, filterActivo, filterCompany]);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      
      if (Array.isArray(response.data)) {
        setCompanies(response.data);
      } else {
        console.warn('Respuesta de companies no es array, usando array vacío');
        setCompanies([]);
      }
    } catch (error) {
      console.error('Error cargando compañías:', error);
      setCompanies([]);
    }
  };

  const fetchEmpleados = async () => {
    try {
      setLoading(true);
      
      let url = '/empleados';
      const params = new URLSearchParams();
      
      if (filterRol !== 'all') params.append('rol', filterRol);
      if (filterActivo !== 'all') params.append('activo', filterActivo);
      
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      
      let empleadosList = [];
      
      if (response.data && response.data.success && response.data.empleados) {
        empleadosList = response.data.empleados;
      } else if (Array.isArray(response.data)) {
        empleadosList = response.data;
      } else {
        empleadosList = [];
      }
      
      if (isSuperAdmin && filterCompany !== 'all') {
        empleadosList = empleadosList.filter(emp => emp.companyId === filterCompany);
      }
      
      setEmpleados(empleadosList);
      
    } catch (error) {
      console.error('❌ Error cargando empleados:', error);
      setEmpleados([]);
      alert(`❌ Error: ${error.response?.data?.error || 'Error al cargar empleados'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmpleado = async (e) => {
    e.preventDefault();
    
    if (isSuperAdmin && formData.rol !== 'super_admin' && !formData.companyId) {
      alert('❌ Debes seleccionar una compañía para este usuario');
      return;
    }
    
    try {
      const dataToSend = { ...formData };
      
      if (formData.rol === 'super_admin') {
        delete dataToSend.companyId;
      }
      
      const response = await api.post('/empleados', dataToSend);

      if (response.data.success) {
        alert('✅ Empleado creado exitosamente');
        setShowModal(false);
        resetForm();
        await fetchEmpleados();
      } else {
        alert(`❌ ${response.data.error || 'Error al crear empleado'}`);
      }
    } catch (error) {
      console.error('❌ Error creando empleado:', error);
      alert(`❌ ${error.response?.data?.error || 'Error al crear empleado'}`);
    }
  };

  const handleUpdateEmpleado = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put(`/empleados/${selectedEmpleado.id}`, {
        nombre: formData.nombre,
        telefono: formData.telefono,
        rol: formData.rol
      });

      if (response.data.success) {
        alert('✅ Empleado actualizado exitosamente');
        setShowModal(false);
        resetForm();
        fetchEmpleados();
      }
    } catch (error) {
      alert(`❌ ${error.response?.data?.error || 'Error al actualizar empleado'}`);
    }
  };

  const handleToggleEmpleado = async (id, currentStatus) => {
    if (!confirm(`¿Estás seguro de ${currentStatus ? 'desactivar' : 'activar'} este empleado?`)) {
      return;
    }

    try {
      const response = await api.patch(`/empleados/toggle/${id}`);

      if (response.data.success) {
        alert(`✅ ${response.data.message}`);
        fetchEmpleados();
      }
    } catch (error) {
      alert(`❌ ${error.response?.data?.error || 'Error al cambiar estado del empleado'}`);
    }
  };

  const handleDeleteEmpleado = async (id, nombre) => {
    if (!confirm(`¿ESTÁS SEGURO de eliminar permanentemente a ${nombre}?\n\nEsta acción NO se puede deshacer.`)) {
      return;
    }

    try {
      const response = await api.delete(`/empleados/delete/${id}`);

      if (response.data.success) {
        alert('✅ Empleado eliminado permanentemente');
        fetchEmpleados();
      }
    } catch (error) {
      alert(`❌ ${error.response?.data?.error || 'Error al eliminar empleado'}`);
    }
  };

  const openPasswordModal = (empleado) => {
    setSelectedEmpleadoForPassword(empleado);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedEmpleadoForPassword(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      alert('❌ Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const response = await api.patch(`/empleados/change-password/${selectedEmpleadoForPassword.id}`, {
        newPassword
      });

      if (response.data.success) {
        alert(`✅ Contraseña actualizada exitosamente para ${selectedEmpleadoForPassword.nombre}`);
        closePasswordModal();
      }
    } catch (error) {
      alert(`❌ ${error.response?.data?.error || 'Error al cambiar contraseña'}`);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (empleado) => {
    setModalMode('edit');
    setSelectedEmpleado(empleado);
    setFormData({
      nombre: empleado.nombre,
      email: empleado.email,
      password: '',
      telefono: empleado.telefono || '',
      rol: empleado.rol,
      companyId: empleado.companyId || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      telefono: '',
      rol: 'repartidor',
      companyId: ''
    });
    setSelectedEmpleado(null);
  };

  const getRolLabel = (rol) => {
    const roles = {
      'super_admin': 'Super Administrador',
      'admin': 'Administrador General',
      'secretaria': 'Secretaria',
      'almacen': 'Encargado de Almacén',
      'repartidor': 'Repartidor',
      'empleado': 'Repartidor'
    };
    return roles[rol] || rol;
  };

  const getRolColor = (rol) => {
    const colors = {
      'super_admin': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'admin': 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
      'secretaria': 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
      'almacen': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'repartidor': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'empleado': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    };
    return colors[rol] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getCompanyName = (companyId) => {
    if (!companyId) return 'Sin compañía';
    if (!Array.isArray(companies)) return companyId;
    const company = companies.find(c => c.id === companyId);
    return company?.nombre || companyId;
  };

  const filteredEmpleados = empleados.filter(emp => {
    const matchSearch = emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {isSuperAdmin ? 'Gestión de Usuarios del Sistema' : 'Gestión de Empleados'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isSuperAdmin ? 'Administra usuarios de todas las compañías' : 'Administra usuarios y permisos del sistema'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Debug Info */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Estado de carga:</h3>
        <div className="text-sm text-yellow-700 dark:text-yellow-300">
          <p>Total empleados: {empleados.length}</p>
          <p>Filtrados: {filteredEmpleados.length}</p>
          <p>Loading: {loading ? 'Sí' : 'No'}</p>
          <p>User: {userData?.email} ({userData?.rol})</p>
          <p>Companies: {companies.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className={`grid grid-cols-1 ${isSuperAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isSuperAdmin && (
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las compañías</option>
              {Array.isArray(companies) && companies.map(company => (
                <option key={company.id} value={company.id}>{company.nombre}</option>
              ))}
            </select>
          )}

          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los roles</option>
            {isSuperAdmin && <option value="super_admin">Super Administradores</option>}
            <option value="admin">Administradores</option>
            <option value="secretaria">Secretarias</option>
            <option value="almacen">Encargados de Almacén</option>
            <option value="repartidor">Repartidores</option>
          </select>

          <select
            value={filterActivo}
            onChange={(e) => setFilterActivo(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>
      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando empleados...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                {isSuperAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Compañía</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmpleados.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? "7" : "6"} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {loading ? 'Cargando...' : 'No se encontraron empleados'}
                    <div className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                      Empleados totales: {empleados.length} | Después de filtros: {filteredEmpleados.length}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmpleados.map((empleado) => (
                  <tr key={empleado.id || empleado.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{empleado.nombre}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{empleado.email}</div>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                          <Building2 size={16} className="mr-2 text-gray-400" />
                          {getCompanyName(empleado.companyId)}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{empleado.telefono || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRolColor(empleado.rol)}`}>
                        {getRolLabel(empleado.rol)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        empleado.activo 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {empleado.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(empleado)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        
                        <button
                          onClick={() => openPasswordModal(empleado)}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 text-lg"
                          title="Cambiar contraseña"
                        >
                          🔑
                        </button>
                        
                        <button
                          onClick={() => handleToggleEmpleado(empleado.id || empleado.uid, empleado.activo)}
                          className={empleado.activo ? 'text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300' : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300'}
                          title={empleado.activo ? 'Desactivar' : 'Activar'}
                        >
                          {empleado.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>

                        <button
                          onClick={() => handleDeleteEmpleado(empleado.id || empleado.uid, empleado.nombre)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Eliminar permanentemente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {modalMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
            </h2>
            
            <form onSubmit={modalMode === 'create' ? handleCreateEmpleado : handleUpdateEmpleado}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Juan Pérez"
                  />
                </div>

                {modalMode === 'create' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="juan@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contraseña *
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(809) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rol / Puesto *
                  </label>
                  <select
                    required
                    value={formData.rol}
                    onChange={(e) => setFormData({...formData, rol: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="repartidor">Repartidor</option>
                    <option value="secretaria">Secretaria</option>
                    <option value="almacen">Encargado de Almacén</option>
                    <option value="admin">Administrador General</option>
                    {isSuperAdmin && <option value="super_admin">Super Administrador</option>}
                  </select>
                </div>

                {isSuperAdmin && modalMode === 'create' && formData.rol !== 'super_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Compañía *
                    </label>
                    <select
                      required
                      value={formData.companyId}
                      onChange={(e) => setFormData({...formData, companyId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona una compañía</option>
                      {Array.isArray(companies) && companies.map(company => (
                        <option key={company.id} value={company.id}>{company.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de cambiar contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Cambiar Contraseña
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Cambiar contraseña para: <strong>{selectedEmpleadoForPassword?.nombre}</strong>
            </p>
            
            <form onSubmit={handleChangePassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Confirma la contraseña"
                    minLength={6}
                  />
                </div>

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-600 dark:text-red-400 text-sm">⚠️ Las contraseñas no coinciden</p>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={newPassword !== confirmPassword || newPassword.length < 6}
                >
                  🔑 Cambiar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empleados;