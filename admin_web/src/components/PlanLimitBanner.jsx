// admin_web/src/components/PlanLimitBanner.jsx
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PlanLimitBanner = () => {
  const { userData } = useAuth();
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData && userData.companyId) {
      fetchLimits();
    } else {
      setLoading(false);
    }
  }, [userData]);

  const fetchLimits = async () => {
    try {
      const response = await api.get('/companies/my-limits');
      setLimits(response.data);
    } catch (error) {
      console.error('Error cargando límites:', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar nada mientras carga
  if (loading) return null;

  // No mostrar si no hay datos
  if (!limits) return null;

  // Función para calcular porcentaje
  const getPercentage = (current, limit) => {
    if (limit === -1) return 0; // Ilimitado
    if (!limit || limit === 0) return 0;
    return (current / limit) * 100;
  };

  // Colores según porcentaje
  const getColorClass = (percentage) => {
    if (percentage >= 90) return 'bg-rose-50 border-rose-200 text-rose-800';
    if (percentage >= 70) return 'bg-amber-50 border-amber-200 text-amber-800';
    return 'bg-indigo-50 border-indigo-200 text-indigo-800';
  };

  // Color de la barra de progreso
  const getProgressBarColor = (percentage) => {
    if (percentage >= 90) return 'bg-rose-600';
    if (percentage >= 70) return 'bg-amber-600';
    return 'bg-indigo-600';
  };

  // Verificar si hay que mostrar alguna advertencia
  const limitsToShow = [];

  if (limits.repartidores && limits.repartidores.limit !== -1) {
    const percentage = getPercentage(limits.repartidores.current, limits.repartidores.limit);
    if (percentage >= 70) {
      limitsToShow.push({ key: 'repartidores', ...limits.repartidores, percentage });
    }
  }

  if (limits.embarques && limits.embarques.limit !== -1) {
    const percentage = getPercentage(limits.embarques.current, limits.embarques.limit);
    if (percentage >= 70) {
      limitsToShow.push({ key: 'embarques', ...limits.embarques, percentage });
    }
  }

  if (limits.rutas && limits.rutas.limit !== -1) {
    const percentage = getPercentage(limits.rutas.current, limits.rutas.limit);
    if (percentage >= 70) {
      limitsToShow.push({ key: 'rutas', ...limits.rutas, percentage });
    }
  }

  // Si no hay límites que mostrar, no renderizar nada
  if (limitsToShow.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Badge del Plan */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-4 mb-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">
              Plan {limits.plan ? limits.plan.toUpperCase() : 'BASIC'}
            </h3>
            <p className="text-sm opacity-90">Monitorea el uso de tu plan</p>
          </div>
          <a
            href="/planes"
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:shadow-lg transition font-medium text-sm"
          >
            Ver Planes
          </a>
        </div>
      </div>

      {/* Alertas de Límites */}
      {limitsToShow.map((limit) => (
        <div
          key={limit.key}
          className={`border rounded-lg p-4 mb-3 ${getColorClass(limit.percentage)}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm">
                  {limit.name || limit.key}
                </h3>
                {limit.percentage >= 90 && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-xs rounded-full font-bold">
                    ¡CRÍTICO!
                  </span>
                )}
              </div>
              
              <p className="text-xs mt-1">
                Estás usando <strong>{limit.current}</strong> de <strong>{limit.limit}</strong> disponibles
                {limit.remaining > 0 && (
                  <> • Quedan <strong>{limit.remaining}</strong></>
                )}
              </p>
              
              {/* Barra de progreso */}
              <div className="w-full bg-white rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressBarColor(limit.percentage)}`}
                  style={{ width: `${Math.min(limit.percentage, 100)}%` }}
                ></div>
              </div>
              
              <p className="text-xs mt-1 opacity-75">
                {limit.percentage.toFixed(0)}% utilizado
              </p>
            </div>
            
            {limit.percentage >= 80 && (
              <a
                href="/planes"
                className="ml-4 px-4 py-2 bg-white rounded-lg hover:shadow-md transition text-sm font-medium whitespace-nowrap"
              >
                Mejorar Plan
              </a>
            )}
          </div>

          {/* Mensaje de ayuda */}
          {limit.percentage >= 90 && (
            <div className="mt-3 pt-3 border-t border-current opacity-75">
              <p className="text-xs flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>
                  Has alcanzado casi el límite de tu plan. Mejora a un plan superior para continuar sin interrupciones.
                </span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PlanLimitBanner;