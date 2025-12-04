// ==============================================================================
// 🔐 PROTECTED ROUTE - Guard de roles y permisos
// ==============================================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tieneAcceso } from '../../utils/roles';

/**
 * Componente para proteger rutas según permisos de rol
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente a renderizar si tiene acceso
 * @param {string} props.modulo - Nombre del módulo a verificar (ej: 'finanzas', 'recolecciones')
 * @param {string} props.redirectTo - Ruta a la que redirigir si no tiene acceso (default: '/access-denied')
 */
const ProtectedRoute = ({ children, modulo, redirectTo = '/access-denied' }) => {
  const { user, userData, loading } = useAuth();

  // Mostrar loader mientras se carga el usuario
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si no se especifica módulo, solo verificar autenticación (comportamiento anterior)
  if (!modulo) {
    return children;
  }

  // Verificar si el usuario tiene acceso al módulo
  const userRole = userData?.role || userData?.rol; // Soportar ambos nombres
  const hasAccess = tieneAcceso(userRole, modulo);

  if (!hasAccess) {
    console.warn(`⚠️ Acceso denegado: Usuario con rol "${userRole}" intentó acceder a módulo "${modulo}"`);
    return <Navigate to={redirectTo} replace />;
  }

  // Usuario autenticado y con permisos correctos
  return children;
};

export default ProtectedRoute;