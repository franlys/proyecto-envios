import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Companies = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
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
    supportPhone: '', // ✅ Nuevo campo
    direccion: '',
    plan: 'operativo',
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
        supportPhone: formData.supportPhone, // ✅ Nuevo campo
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
      supportPhone: company.supportPhone || '', // ✅ Nuevo campo
      direccion: company.direccion || '',
      plan: company.plan || 'operativo',
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
      supportPhone: '', // ✅ Nuevo campo
      direccion: '',
      plan: 'operativo',
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
      operativo: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
      automatizado: 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
      smart: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
    };
    return badges[plan] || badges.operativo;
  };

  const getPlanLabel = (plan) => {
    const labels = {
      operativo: 'Plan Operativo',
      automatizado: 'Plan Automatizado',
      smart: 'Plan Smart Logistics'
    };
    return labels[plan] || 'Plan Operativo';
  };

  if (userData?.rol !== 'super_admin') {
    return (
      <div className="p-6">
        <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded">
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestión de Compañías</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Administra las compañías del sistema Multi-Tenant
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          + Nueva Compañía
        </button>
      </div>

      {/* Companies Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Cargando compañías...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">
              No hay compañías registradas
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Crear Primera Compañía
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Compañía
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Creación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Admin Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {company.nombre || 'Sin nombre'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        ID: {company.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanBadge(company.plan)}`}>
                        {getPlanLabel(company.plan)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${company.activo
                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                        }`}>
                        {company.activo ? '✓ Activa' : '✗ Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {company.fechaCreacion
                        ? new Date(company.fechaCreacion.toDate ? company.fechaCreacion.toDate() : company.fechaCreacion).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {company.adminEmail || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => navigate(`/companies/${company.id}/features`)}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 font-medium"
                        >
                          🎛️ Features
                        </button>
                        <button
                          onClick={() => openEditModal(company)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleCompany(company.id, company.activo)}
                          className={`${company.activo
                            ? 'text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300'
                            : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300'
                            }`}
                        >
                          {company.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => openDeleteModal(company)}
                          className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300"
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
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              {modalMode === 'create' ? 'Crear Nueva Compañía' : 'Editar Compañía'}
            </h2>

            <form onSubmit={modalMode === 'create' ? handleCreateCompany : handleUpdateCompany}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de la Compañía *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Embarques Iván"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Se generará un ID automático: {formData.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email del Administrador *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="admin@embarquesivÃ¡n.com"
                    disabled={modalMode === 'edit'}
                  />
                </div>

                {modalMode === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Contraseña del Administrador *
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      🔒 Esta será la contraseña para que el administrador inicie sesión
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="(809) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono de Soporte (Bot Handoff)
                  </label>
                  <input
                    type="tel"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="5215512345678 (Sin símbolos)"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    📞 Este número se enviará cuando el usuario pida "Ayuda" o "Soporte" en WhatsApp.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Santo Domingo, República Dominicana"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Plan *
                  </label>
                  <select
                    required
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="operativo">Plan Operativo (RD$ 50,000/mes)</option>
                    <option value="automatizado">Plan Automatizado (RD$ 75,000/mes)</option>
                    <option value="smart">Plan Smart Logistics (RD$ 120,000/mes)</option>
                  </select>
                </div>

                {/* Configuración de Correo */}
                <div className="border-t border-slate-300 dark:border-slate-600 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Configuración de Correo
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Email de la Compañía
                      </label>
                      <input
                        type="email"
                        value={formData.emailConfig.user}
                        onChange={(e) => setFormData({
                          ...formData,
                          emailConfig: { ...formData.emailConfig, user: e.target.value, from: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="empresa@gmail.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Contraseña de Aplicación de Gmail
                      </label>
                      <input
                        type="password"
                        value={formData.emailConfig.pass}
                        onChange={(e) => setFormData({
                          ...formData,
                          emailConfig: { ...formData.emailConfig, pass: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="wimu etth qgnf qplx"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Contraseña de aplicación generada en Google
                      </p>
                    </div>
                  </div>
                </div>

                {/* Diseño de Factura */}
                <div className="border-t border-slate-300 dark:border-slate-600 pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Diseño de Factura
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Logo de la Compañía
                      </label>

                      {/* Preview del logo */}
                      {formData.invoiceDesign.logoUrl && (
                        <div className="mb-2 p-2 border border-slate-200 dark:border-slate-600 rounded-lg">
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
                          <div className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-center rounded-lg transition-colors">
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
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                        >
                          🔗 URL
                        </button>
                      </div>

                      {/* Input de URL (solo lectura para mostrar la URL actual) */}
                      <input
                        type="url"
                        value={formData.invoiceDesign.logoUrl}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg bg-slate-50 text-sm"
                        placeholder="https://... (carga un archivo o ingresa una URL)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Color Principal
                        </label>
                        <input
                          type="color"
                          value={formData.invoiceDesign.primaryColor}
                          onChange={(e) => setFormData({
                            ...formData,
                            invoiceDesign: { ...formData.invoiceDesign, primaryColor: e.target.value }
                          })}
                          className="w-full h-10 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Color Secundario
                        </label>
                        <input
                          type="color"
                          value={formData.invoiceDesign.secondaryColor}
                          onChange={(e) => setFormData({
                            ...formData,
                            invoiceDesign: { ...formData.invoiceDesign, secondaryColor: e.target.value }
                          })}
                          className="w-full h-10 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Plantilla
                      </label>
                      <select
                        value={formData.invoiceDesign.template}
                        onChange={(e) => setFormData({
                          ...formData,
                          invoiceDesign: { ...formData.invoiceDesign, template: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="modern">Moderna</option>
                        <option value="classic">Clásica</option>
                        <option value="minimal">Minimalista</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Texto de Encabezado
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceDesign.headerText}
                        onChange={(e) => setFormData({
                          ...formData,
                          invoiceDesign: { ...formData.invoiceDesign, headerText: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Gracias por su preferencia"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Texto de Pie de Página
                      </label>
                      <textarea
                        value={formData.invoiceDesign.footerText}
                        onChange={(e) => setFormData({
                          ...formData,
                          invoiceDesign: { ...formData.invoiceDesign, footerText: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
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
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl font-bold text-rose-600 dark:text-rose-400 mb-2">
                ELIMINAR COMPAÑÍA
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Esta acción es <strong>IRREVERSIBLE</strong>
              </p>
            </div>

            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 mb-4">
              <p className="font-semibold text-rose-900 dark:text-rose-200 mb-2">
                Se eliminará permanentemente:
              </p>
              <ul className="text-sm text-rose-800 dark:text-rose-300 space-y-1">
                <li>✗ Compañía: <strong>{companyToDelete.nombre}</strong></li>
                <li>✗ Todos los usuarios de la compañía</li>
                <li>✗ Todos los embarques y facturas</li>
                <li>✗ Todas las rutas y entregas</li>
                <li>✗ Todo el historial</li>
              </ul>
            </div>

            <form onSubmit={handleDeleteCompany}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  🔐 Ingresa tu contraseña de Super Admin para confirmar:
                </label>
                <input
                  type="password"
                  required
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-rose-300 dark:border-rose-700 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  disabled={deleteLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition disabled:opacity-50"
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