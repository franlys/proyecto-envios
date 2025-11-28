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
    plan: 'basic',
    emailConfig: {
      service: 'gmail',
      user: '',
      pass: '',
      from: ''
    },
    invoiceDesign: {
      logoUrl: '',
      primaryColor: '#1976D2',
      secondaryColor: '#f5f5f5',
      template: 'modern',
      headerText: 'Gracias por su preferencia',
      footerText: ''
    }
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

  // ✅ CORREGIDO: Aplicando la Regla de Oro
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies');
      
      // ✅ CORRECCIÓN: Validar success y acceder a response.data.data
      if (response.data.success) {
        setCompanies(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar compañías');
      }
      
    } catch (error) {
      console.error('❌ Error cargando compañías:', error);
      setCompanies([]);
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
        plan: formData.plan,
        emailConfig: formData.emailConfig,
        invoiceDesign: formData.invoiceDesign
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
      plan: company.plan || 'basic',
      emailConfig: company.emailConfig || {
        service: 'gmail',
        user: '',
        pass: '',
        from: ''
      },
      invoiceDesign: company.invoiceDesign || {
        logoUrl: '',
        primaryColor: '#1976D2',
        secondaryColor: '#f5f5f5',
        template: 'modern',
        headerText: 'Gracias por su preferencia',
        footerText: ''
      }
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
      plan: 'basic',
      emailConfig: {
        service: 'gmail',
        user: '',
        pass: '',
        from: ''
      },
      invoiceDesign: {
        logoUrl: '',
        primaryColor: '#1976D2',
        secondaryColor: '#f5f5f5',
        template: 'modern',
        headerText: 'Gracias por su preferencia',
        footerText: ''
      }
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
    return labels[plan] || 'Básico';
  };

  if (userData?.rol !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Acceso Denegado</p>
          <p className="text-sm">Solo los Super Administradores pueden gestionar compañías.</p>
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
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Administra las compañías del sistema Multi-Tenant
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Nueva Compañía
        </button>
      </div>

      {/* Companies Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando compañías...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              No hay compañías registradas
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Crear Primera Compañía
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Compañía
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Creación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Admin Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {company.nombre || 'Sin nombre'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {company.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanBadge(company.plan)}`}>
                        {getPlanLabel(company.plan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        company.activo 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {company.activo ? '✓ Activa' : '✗ Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {company.fechaCreacion 
                        ? new Date(company.fechaCreacion.toDate ? company.fechaCreacion.toDate() : company.fechaCreacion).toLocaleDateString() 
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {company.adminEmail || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(company)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleCompany(company.id, company.activo)}
                          className={`${
                            company.activo 
                              ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300'
                              : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300'
                          }`}
                        >
                          {company.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => openDeleteModal(company)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          Eliminar
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

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    placeholder="admin@embarquesivÃ¡n.com"
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
                      🔒 Esta será la contraseña para que el administrador inicie sesión
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

                {/* Configuración de Correo */}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Configuración de Correo
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email de la Compañía
                      </label>
                      <input
                        type="email"
                        value={formData.emailConfig.user}
                        onChange={(e) => setFormData({
                          ...formData,
                          emailConfig: { ...formData.emailConfig, user: e.target.value, from: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="empresa@gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Contraseña de Aplicación de Gmail
                      </label>
                      <input
                        type="password"
                        value={formData.emailConfig.pass}
                        onChange={(e) => setFormData({
                          ...formData,
                          emailConfig: { ...formData.emailConfig, pass: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="wimu etth qgnf qplx"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Contraseña de aplicación generada en Google
                      </p>
                    </div>
                  </div>
                </div>

                {/* Diseño de Factura */}
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Diseño de Factura
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Logo de la Compañía
                      </label>

                      {/* Preview del logo */}
                      {formData.invoiceDesign.logoUrl && (
                        <div className="mb-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
                          <img
                            src={formData.invoiceDesign.logoUrl}
                            alt="Logo preview"
                            className="h-16 object-contain mx-auto"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      {/* Botones de carga */}
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <div className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg transition-colors">
                            📤 Subir Logo
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              // Validar tamaño (5MB max)
                              if (file.size > 5 * 1024 * 1024) {
                                alert('El archivo es muy grande. Máximo 5MB');
                                return;
                              }

                              try {
                                const formDataUpload = new FormData();
                                formDataUpload.append('logo', file);

                                const response = await api.post(
                                  `/companies/${selectedCompany.id}/upload-logo`,
                                  formDataUpload,
                                  {
                                    headers: {
                                      'Content-Type': 'multipart/form-data'
                                    }
                                  }
                                );

                                if (response.data.success) {
                                  setFormData({
                                    ...formData,
                                    invoiceDesign: {
                                      ...formData.invoiceDesign,
                                      logoUrl: response.data.logoUrl
                                    }
                                  });
                                  alert('Logo subido exitosamente');
                                } else {
                                  alert('Error: ' + response.data.error);
                                }
                              } catch (error) {
                                console.error('Error subiendo logo:', error);
                                alert(error.response?.data?.error || 'Error al subir logo');
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const url = prompt('Ingresa la URL del logo:', formData.invoiceDesign.logoUrl);
                            if (url !== null) {
                              setFormData({
                                ...formData,
                                invoiceDesign: { ...formData.invoiceDesign, logoUrl: url }
                              });
                            }
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          🔗 URL
                        </button>
                      </div>

                      {/* Input de URL (solo lectura para mostrar la URL actual) */}
                      <input
                        type="url"
                        value={formData.invoiceDesign.logoUrl}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg bg-gray-50 text-sm"
                        placeholder="https://... (carga un archivo o ingresa una URL)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Color Principal
                        </label>
                        <input
                          type="color"
                          value={formData.invoiceDesign.primaryColor}
                          onChange={(e) => setFormData({
                            ...formData,
                            invoiceDesign: { ...formData.invoiceDesign, primaryColor: e.target.value }
                          })}
                          className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Color Secundario
                        </label>
                        <input
                          type="color"
                          value={formData.invoiceDesign.secondaryColor}
                          onChange={(e) => setFormData({
                            ...formData,
                            invoiceDesign: { ...formData.invoiceDesign, secondaryColor: e.target.value }
                          })}
                          className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Plantilla
                      </label>
                      <select
                        value={formData.invoiceDesign.template}
                        onChange={(e) => setFormData({
                          ...formData,
                          invoiceDesign: { ...formData.invoiceDesign, template: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="modern">Moderna</option>
                        <option value="classic">Clásica</option>
                        <option value="minimal">Minimalista</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Texto de Encabezado
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceDesign.headerText}
                        onChange={(e) => setFormData({
                          ...formData,
                          invoiceDesign: { ...formData.invoiceDesign, headerText: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Gracias por su preferencia"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Texto de Pie de Página
                      </label>
                      <textarea
                        value={formData.invoiceDesign.footerText}
                        onChange={(e) => setFormData({
                          ...formData,
                          invoiceDesign: { ...formData.invoiceDesign, footerText: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Términos y condiciones..."
                        rows="3"
                      />
                    </div>
                  </div>
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