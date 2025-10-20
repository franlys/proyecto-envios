import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Companies = () => {
  const { userData } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    adminEmail: '',
    adminPassword: '',
    telefono: '',
    direccion: '',
    plan: 'basic'
  });

  // Estados para eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (userData?.rol === 'super_admin') {
      fetchCompanies();
    }
  }, [userData]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies');
      setCompanies(response.data || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar compañías');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    
    try {
      await api.post('/companies', formData);
      alert('Compañía y administrador creados exitosamente');
      setShowModal(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al crear compañía');
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    
    try {
      await api.put(`/companies/${selectedCompany.id}`, {
        nombre: formData.nombre,
        telefono: formData.telefono,
        direccion: formData.direccion,
        plan: formData.plan
      });

      alert('Compañía actualizada exitosamente');
      setShowModal(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al actualizar compañía');
    }
  };

  const handleToggleCompany = async (id, currentStatus) => {
    if (!confirm(`¿Estás seguro de ${currentStatus ? 'desactivar' : 'activar'} esta compañía?`)) {
      return;
    }

    try {
      await api.patch(`/companies/${id}/toggle`);
      alert('Estado de compañía actualizado');
      fetchCompanies();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al cambiar estado');
    }
  };

  const handleDeleteCompany = async (e) => {
    e.preventDefault();
    
    if (!companyToDelete || !deletePassword) {
      alert('Contraseña requerida');
      return;
    }

    if (!confirm(`⚠️ ADVERTENCIA CRÍTICA\n\n¿Estás ABSOLUTAMENTE SEGURO de eliminar "${companyToDelete.nombre}"?\n\n` +
      `Esto eliminará PERMANENTEMENTE:\n` +
      `- Todos los usuarios de la compañía\n` +
      `- Todos los embarques y facturas\n` +
      `- Todas las rutas y entregas\n` +
      `- Todo el historial\n\n` +
      `ESTA ACCIÓN NO SE PUEDE DESHACER`)) {
      return;
    }

    try {
      setDeleteLoading(true);
      
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('../services/firebase');
      
      try {
        await signInWithEmailAndPassword(auth, userData.email, deletePassword);
      } catch (authError) {
        alert('❌ Contraseña incorrecta');
        setDeleteLoading(false);
        return;
      }

      const response = await api.delete(`/companies/${companyToDelete.id}`);

      alert(`✅ ${response.data.message}\n\n` +
        `Eliminados:\n` +
        `- ${response.data.stats.usuarios} usuarios\n` +
        `- ${response.data.stats.embarques} embarques\n` +
        `- ${response.data.stats.rutas} rutas\n` +
        `- ${response.data.stats.facturas} facturas\n` +
        `- ${response.data.stats.gastos} gastos`);
      
      setShowDeleteModal(false);
      setCompanyToDelete(null);
      setDeletePassword('');
      fetchCompanies();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al eliminar compañía');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (company) => {
    setModalMode('edit');
    setSelectedCompany(company);
    setFormData({
      nombre: company.nombre,
      adminEmail: company.adminEmail,
      adminPassword: '',
      telefono: company.telefono || '',
      direccion: company.direccion || '',
      plan: company.plan || 'basic'
    });
    setShowModal(true);
  };

  const openDeleteModal = (company) => {
    setCompanyToDelete(company);
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      adminEmail: '',
      adminPassword: '',
      telefono: '',
      direccion: '',
      plan: 'basic'
    });
    setSelectedCompany(null);
  };

  const getPlanBadge = (plan) => {
    const badges = {
      basic: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      premium: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      enterprise: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    };
    return badges[plan] || badges.basic;
  };

  const getPlanLabel = (plan) => {
    const labels = {
      basic: 'Básico',
      premium: 'Premium',
      enterprise: 'Enterprise'
    };
    return labels[plan] || plan;
  };

  if (userData?.rol !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
          <p className="text-red-800 dark:text-red-200 text-lg font-medium">
            ⛔ No tienes permisos para acceder a esta página
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Compañías</h1>
          <p className="text-gray-600 dark:text-gray-400">Administra las empresas del sistema Multi-Tenant</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <span>+</span>
          Nueva Compañía
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Compañías</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{companies.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <span className="text-2xl">🏢</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Activas</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                {companies.filter(c => c.activo).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inactivas</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                {companies.filter(c => !c.activo).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <span className="text-2xl">⛔</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Premium</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {companies.filter(c => c.plan === 'premium' || c.plan === 'enterprise').length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Compañías */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando compañías...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No hay compañías registradas</p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">Crea la primera compañía para empezar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <div key={company.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{company.nombre}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">ID: {company.id}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  company.activo 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  {company.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span>📧</span>
                  <span>{company.adminEmail}</span>
                </div>
                {company.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>📞</span>
                    <span>{company.telefono}</span>
                  </div>
                )}
                {company.direccion && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>📍</span>
                    <span>{company.direccion}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPlanBadge(company.plan)}`}>
                  Plan {getPlanLabel(company.plan)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(company.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
                <button
                  onClick={() => openEditModal(company)}
                  className="flex-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-2 rounded text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleCompany(company.id, company.activo)}
                  className={`flex-1 px-3 py-2 rounded text-sm transition ${
                    company.activo 
                      ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50' 
                      : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50'
                  }`}
                >
                  {company.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => openDeleteModal(company)}
                  className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-3 py-2 rounded text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                  title="Eliminar permanentemente"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {modalMode === 'create' ? 'Crear Nueva Compañía' : 'Editar Compañía'}
            </h2>
            
            <form onSubmit={modalMode === 'create' ? handleCreateCompany : handleUpdateCompany}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre de la Compañía *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Embarques Iván"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Se generará un ID automático: {formData.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email del Administrador *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@embarquesiván.com"
                    disabled={modalMode === 'edit'}
                  />
                </div>

                {modalMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contraseña del Administrador *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      🔑 Esta será la contraseña para que el administrador inicie sesión
                    </p>
                  </div>
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
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Santo Domingo, República Dominicana"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan *
                  </label>
                  <select
                    required
                    value={formData.plan}
                    onChange={(e) => setFormData({...formData, plan: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="basic">Básico</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
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
                  {modalMode === 'create' ? 'Crear Compañía' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar Compañía */}
      {showDeleteModal && companyToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                ELIMINAR COMPAÑÍA
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Esta acción es <strong>IRREVERSIBLE</strong>
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="font-semibold text-red-900 dark:text-red-200 mb-2">
                Se eliminará permanentemente:
              </p>
              <ul className="text-sm text-red-800 dark:text-red-300 space-y-1">
                <li>✗ Compañía: <strong>{companyToDelete.nombre}</strong></li>
                <li>✗ Todos los usuarios de la compañía</li>
                <li>✗ Todos los embarques y facturas</li>
                <li>✗ Todas las rutas y entregas</li>
                <li>✗ Todo el historial</li>
              </ul>
            </div>

            <form onSubmit={handleDeleteCompany}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  🔐 Ingresa tu contraseña de Super Admin para confirmar:
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 dark:border-red-700 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Tu contraseña de Super Admin"
                  disabled={deleteLoading}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCompanyToDelete(null);
                    setDeletePassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleteLoading ? 'Eliminando...' : 'Eliminar Permanentemente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;