// ==============================================================================
// 🚫 ACCESS DENIED - Página de acceso denegado
// ==============================================================================
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { getNombreRol } from '../utils/roles';

const AccessDenied = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const userRole = userData?.role || userData?.rol;
  const nombreRol = getNombreRol(userRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header con gradiente */}
          <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-8 py-6">
            <div className="flex items-center justify-center">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                <ShieldX className="w-12 h-12 text-white" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="px-8 py-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Acceso Denegado
            </h1>
            <p className="text-slate-600 mb-6">
              Tu rol actual <span className="font-semibold text-slate-900">"{nombreRol}"</span> no tiene permisos para acceder a esta sección.
            </p>

            {/* Información adicional */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
              <p className="text-sm text-slate-600">
                Si crees que esto es un error, contacta al administrador de tu empresa para solicitar los permisos necesarios.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                Volver atrás
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
              >
                <Home className="w-5 h-5" />
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Footer informativo */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            ProLogix - Sistema de Gestión de Envíos
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
