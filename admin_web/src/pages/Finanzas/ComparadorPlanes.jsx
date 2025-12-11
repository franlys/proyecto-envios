import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles, Zap, Crown } from 'lucide-react';

const ComparadorPlanes = ({ planes, planActual, onCambiarPlan, cambiando }) => {
  const [planSeleccionado, setPlanSeleccionado] = useState(null);

  if (!planes || planes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 dark:text-slate-400">Cargando planes...</p>
      </div>
    );
  }

  // Ordenar planes por precio
  const planesOrdenados = [...planes].sort((a, b) => a.precio - b.precio);

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'operativo':
        return <Check className="w-5 h-5" />;
      case 'automatizado':
        return <Zap className="w-5 h-5" />;
      case 'smart':
        return <Crown className="w-5 h-5" />;
      default:
        return <Check className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Elige el Plan Perfecto para tu Empresa
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Compara características y selecciona el plan que mejor se adapte a tus necesidades
        </p>
      </div>

      {/* Comparador de Planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planesOrdenados.map((plan, index) => {
          const esPlanActual = planActual === plan.id;
          const esPopular = plan.popular;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-2xl border-2 ${
                esPopular
                  ? 'border-emerald-500 shadow-xl shadow-emerald-500/20'
                  : esPlanActual
                  ? 'border-indigo-500 shadow-lg'
                  : 'border-slate-200 dark:border-slate-700'
              } bg-white dark:bg-slate-800 overflow-hidden hover:shadow-2xl transition-all duration-300`}
            >
              {/* Badge de Popular o Plan Actual */}
              {esPopular && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 rounded-bl-lg text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  RECOMENDADO
                </div>
              )}
              {esPlanActual && !esPopular && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white px-4 py-1 rounded-bl-lg text-xs font-bold">
                  TU PLAN ACTUAL
                </div>
              )}

              <div className="p-6">
                {/* Header del Plan */}
                <div className="text-center mb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                  >
                    {getPlanIcon(plan.id)}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {plan.nombre}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {plan.descripcion}
                  </p>
                </div>

                {/* Precio */}
                <div className="text-center mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-bold text-slate-900 dark:text-white">
                      RD$ {plan.precio.toLocaleString()}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">/mes</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                    ~${plan.precioUSD} USD
                  </div>
                </div>

                {/* Límites */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Camiones:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {plan.limites.camiones === -1 ? 'Ilimitados' : `Hasta ${plan.limites.camiones}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Usuarios:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {plan.limites.usuarios === -1 ? 'Ilimitados' : plan.limites.usuarios}
                    </span>
                  </div>
                </div>

                {/* Características destacadas (solo primeras 5) */}
                <div className="space-y-2 mb-6">
                  {plan.caracteristicas.slice(0, 8).map((caracteristica, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      {caracteristica.incluido ? (
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          caracteristica.destacado ? 'text-emerald-500' : 'text-slate-400'
                        }`} />
                      ) : (
                        <X className="w-4 h-4 mt-0.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      )}
                      <span className={
                        caracteristica.incluido
                          ? caracteristica.destacado
                            ? 'text-slate-900 dark:text-white font-medium'
                            : 'text-slate-600 dark:text-slate-400'
                          : 'text-slate-400 dark:text-slate-600 line-through'
                      }>
                        {caracteristica.nombre}
                      </span>
                    </div>
                  ))}
                  {plan.caracteristicas.length > 8 && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                      + {plan.caracteristicas.length - 8} características más
                    </p>
                  )}
                </div>

                {/* Botón de Acción */}
                <button
                  onClick={() => {
                    if (!esPlanActual) {
                      onCambiarPlan(plan.id);
                    }
                  }}
                  disabled={esPlanActual || cambiando}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                    esPlanActual
                      ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      : esPopular
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } ${cambiando ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {cambiando
                    ? 'Cambiando...'
                    : esPlanActual
                    ? 'Plan Actual'
                    : 'Seleccionar Plan'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Tabla comparativa completa */}
      <div className="mt-12">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 text-center">
          Comparación Detallada de Características
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left p-4 text-sm font-semibold text-slate-900 dark:text-white">
                  Característica
                </th>
                {planesOrdenados.map(plan => (
                  <th key={plan.id} className="text-center p-4 text-sm font-semibold text-slate-900 dark:text-white">
                    {plan.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Obtener todas las características únicas */}
              {Array.from(new Set(planesOrdenados.flatMap(p => p.caracteristicas.map(c => c.nombre)))).map((nombreCaract, idx) => (
                <tr key={idx} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    {nombreCaract}
                  </td>
                  {planesOrdenados.map(plan => {
                    const caracteristica = plan.caracteristicas.find(c => c.nombre === nombreCaract);
                    return (
                      <td key={plan.id} className="p-4 text-center">
                        {caracteristica ? (
                          caracteristica.incluido ? (
                            <div className="flex flex-col items-center gap-1">
                              <Check className="w-5 h-5 text-emerald-500" />
                              {caracteristica.valor && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {caracteristica.valor}
                                </span>
                              )}
                            </div>
                          ) : (
                            <X className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                          )
                        ) : (
                          <X className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparadorPlanes;
