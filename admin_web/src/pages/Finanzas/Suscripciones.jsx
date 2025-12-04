// Página de Suscripciones - Gestión de planes y métodos de pago (Stripe)
import { CreditCard, Check } from 'lucide-react';

const Suscripciones = () => {
  const planes = [
    {
      nombre: 'Básico',
      precio: 29,
      features: ['Hasta 100 facturas/mes', 'Soporte por email', '1 usuario'],
      actual: false
    },
    {
      nombre: 'Pro',
      precio: 79,
      features: ['Facturas ilimitadas', 'Soporte prioritario', '5 usuarios', 'API access'],
      actual: true
    },
    {
      nombre: 'Enterprise',
      precio: 199,
      features: ['Todo de Pro', 'Usuarios ilimitados', 'Soporte 24/7', 'Personalización'],
      actual: false
    }
  ];

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Suscripciones y Pagos</h1>
          <p className="text-sm text-slate-600 mt-1">Gestiona tu plan y métodos de pago</p>
        </div>

        {/* Planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {planes.map((plan) => (
            <div
              key={plan.nombre}
              className={`bg-white rounded-xl shadow-sm p-6 ${
                plan.actual
                  ? 'border-2 border-indigo-500 ring-4 ring-indigo-50'
                  : 'border border-slate-200'
              }`}
            >
              {plan.actual && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                    Plan Actual
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold text-slate-900">{plan.nombre}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-4xl font-bold text-slate-900">${plan.precio}</span>
                <span className="text-slate-600 ml-2">/mes</span>
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.actual}
                className={`w-full mt-6 px-4 py-2 rounded-lg font-medium transition-colors ${
                  plan.actual
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {plan.actual ? 'Plan Activo' : 'Cambiar a este plan'}
              </button>
            </div>
          ))}
        </div>

        {/* Métodos de Pago */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Métodos de Pago</h2>
          <div className="flex items-center gap-4 p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            <div className="flex-1">
              <p className="font-medium text-slate-900">•••• •••• •••• 4242</p>
              <p className="text-sm text-slate-600">Expira 12/25</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
              Principal
            </span>
          </div>
          <button className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            + Agregar método de pago
          </button>
        </div>
      </div>
    </div>
  );
};

export default Suscripciones;
