// Dashboard Financiero Principal - Router de vistas según rol
import { useAuth } from '../../context/AuthContext';
import FinanzasSaaS from './FinanzasSaaS';
import FinanzasEmpresa from './FinanzasEmpresa';

const Dashboard = () => {
  const { userData } = useAuth();

  // Super Admin ve las finanzas del negocio SaaS (suscripciones)
  if (userData?.rol === 'super_admin') {
    return <FinanzasSaaS />;
  }

  // Propietarios ven las finanzas de su empresa (operaciones)
  if (userData?.rol === 'propietario') {
    return <FinanzasEmpresa />;
  }

  // Fallback para roles no autorizados
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Acceso No Autorizado
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          No tienes permisos para acceder a este módulo
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
