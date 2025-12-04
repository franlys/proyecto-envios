// admin_web/src/pages/Perfil.jsx
import { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, Shield, Camera, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Perfil = () => {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: ''
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        nombre: userData.nombre || '',
        telefono: userData.telefono || '',
        email: userData.email || ''
      });
      
      if (userData.companyId) {
        fetchCompany();
      }
    }
  }, [userData]);

  const fetchCompany = async () => {
    try {
      const response = await api.get(`/companies/${userData.companyId}`);
      setCompany(response.data);
    } catch (error) {
      console.error('Error cargando compañía:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await api.put(`/empleados/${userData.uid}`, {
        nombre: formData.nombre,
        telefono: formData.telefono
      });

      if (response.data.success) {
        alert('✅ Perfil actualizado exitosamente');
      }
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      alert('❌ Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
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
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-indigo-100 text-indigo-800',
      'secretaria': 'bg-pink-100 text-pink-800',
      'almacen': 'bg-indigo-100 text-indigo-800',
      'repartidor': 'bg-emerald-100 text-emerald-800',
      'empleado': 'bg-emerald-100 text-emerald-800'
    };
    return colors[rol] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
        <p className="text-slate-600">Gestiona tu información personal</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="flex items-end -mt-16 mb-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-white p-2 shadow-lg">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                  {userData?.nombre?.charAt(0).toUpperCase() || 'U'}
                </div>
              </div>
              <button className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-slate-50 transition">
                <Camera size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="ml-6 mb-2">
              <h2 className="text-2xl font-bold text-slate-900">{userData?.nombre}</h2>
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getRolColor(userData?.rol)} mt-1`}>
                {getRolLabel(userData?.rol)}
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="mt-6 space-y-6">
            {/* Información Personal */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Información Personal</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <User size={16} className="inline mr-2" />
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Mail size={16} className="inline mr-2" />
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">El correo no se puede modificar</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Phone size={16} className="inline mr-2" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="(809) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Shield size={16} className="inline mr-2" />
                    Rol en el Sistema
                  </label>
                  <input
                    type="text"
                    value={getRolLabel(userData?.rol)}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Información de la Compañía */}
            {userData?.companyId && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Compañía</h3>
                
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Building2 size={24} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {company?.nombre || 'Cargando...'}
                      </p>
                      <p className="text-sm text-slate-600">
                        Plan: <span className="font-medium capitalize">{company?.plan || 'basic'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sin compañía (Super Admin) */}
            {!userData?.companyId && userData?.rol === 'super_admin' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Compañía</h3>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-purple-800 font-medium">
                    ✨ Eres Super Administrador del sistema
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    Tienes acceso a todas las compañías y configuraciones del sistema
                  </p>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:bg-slate-400"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estadísticas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Último acceso</span>
              <span className="text-sm font-medium text-slate-900">Hoy</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Miembro desde</span>
              <span className="text-sm font-medium text-slate-900">
                {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Seguridad</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
              🔒 Cambiar contraseña
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
              🔐 Autenticación de dos factores
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;