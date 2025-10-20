// admin_web/src/pages/Configuracion.jsx
import { useState } from 'react';
import { Settings, Bell, Lock, Palette, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Configuracion = () => {
  const { userData } = useAuth();
  const [saving, setSaving] = useState(false);
  
  // Estados para configuraciones
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [notifTickets, setNotifTickets] = useState(true);
  const [tema, setTema] = useState('claro');
  const [colorAccent, setColorAccent] = useState('blue');
  const [idioma, setIdioma] = useState('es');
  const [zonaHoraria, setZonaHoraria] = useState('America/Santo_Domingo');

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const config = {
        notificaciones: {
          email: notifEmail,
          push: notifPush,
          tickets: notifTickets
        },
        apariencia: {
          tema,
          colorAccent
        },
        idioma,
        zonaHoraria
      };

      localStorage.setItem('userConfig', JSON.stringify(config));

      // Aplicar tema inmediatamente
      if (tema === 'oscuro') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      alert('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('❌ Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración</h1>
        <p className="text-gray-600 dark:text-gray-400">Personaliza tu experiencia en el sistema</p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {/* Notificaciones */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Notificaciones</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Notificaciones por email</span>
              <input 
                type="checkbox" 
                checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded" 
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Notificaciones push</span>
              <input 
                type="checkbox" 
                checked={notifPush}
                onChange={(e) => setNotifPush(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded" 
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Alertas de nuevos tickets</span>
              <input 
                type="checkbox" 
                checked={notifTickets}
                onChange={(e) => setNotifTickets(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded" 
              />
            </label>
          </div>
        </div>

        {/* Seguridad */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="text-red-600 dark:text-red-400" size={24} />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Seguridad</h2>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => alert('Función de cambio de contraseña en desarrollo')}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
            >
              <p className="font-medium text-gray-900 dark:text-white">Cambiar contraseña</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Actualiza tu contraseña regularmente</p>
            </button>

            <button 
              onClick={() => alert('Función de 2FA en desarrollo')}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
            >
              <p className="font-medium text-gray-900 dark:text-white">Autenticación de dos factores</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Agrega una capa extra de seguridad</p>
            </button>

            <button 
              onClick={() => alert('Función de cerrar sesiones en desarrollo')}
              className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition"
            >
              <p className="font-medium text-gray-900 dark:text-white">Cerrar otras sesiones</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Desconecta todos los demás dispositivos</p>
            </button>
          </div>
        </div>

        {/* Apariencia */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="text-purple-600 dark:text-purple-400" size={24} />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Apariencia</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tema
              </label>
              <select 
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="claro">Claro</option>
                <option value="oscuro">Oscuro</option>
                <option value="automatico">Automático</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color de acento
              </label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setColorAccent('blue')}
                  className={`w-10 h-10 bg-blue-600 rounded-lg border-2 ${colorAccent === 'blue' ? 'border-blue-800' : 'border-transparent hover:border-blue-800'}`}
                ></button>
                <button 
                  onClick={() => setColorAccent('purple')}
                  className={`w-10 h-10 bg-purple-600 rounded-lg border-2 ${colorAccent === 'purple' ? 'border-purple-800' : 'border-transparent hover:border-purple-800'}`}
                ></button>
                <button 
                  onClick={() => setColorAccent('green')}
                  className={`w-10 h-10 bg-green-600 rounded-lg border-2 ${colorAccent === 'green' ? 'border-green-800' : 'border-transparent hover:border-green-800'}`}
                ></button>
                <button 
                  onClick={() => setColorAccent('red')}
                  className={`w-10 h-10 bg-red-600 rounded-lg border-2 ${colorAccent === 'red' ? 'border-red-800' : 'border-transparent hover:border-red-800'}`}
                ></button>
              </div>
            </div>
          </div>
        </div>

        {/* Idioma */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="text-green-600 dark:text-green-400" size={24} />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Idioma y región</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Idioma
              </label>
              <select 
                value={idioma}
                onChange={(e) => setIdioma(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zona horaria
              </label>
              <select 
                value={zonaHoraria}
                onChange={(e) => setZonaHoraria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/Santo_Domingo">América/Santo Domingo (GMT-4)</option>
                <option value="America/New_York">América/New York (GMT-5)</option>
                <option value="America/Los_Angeles">América/Los Angeles (GMT-8)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
};

export default Configuracion;