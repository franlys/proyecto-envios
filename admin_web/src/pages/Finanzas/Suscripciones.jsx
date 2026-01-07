// Página de Suscripciones - Gestión de planes y métodos de pago (PayPal)
import { CreditCard, Check } from 'lucide-react';
import { useState } from 'react';
import PayPalButton from '../../components/PayPalButton';
import { toast } from 'sonner';

const Suscripciones = () => {
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [mostrarPago, setMostrarPago] = useState(false);

  const planes = [
    {
      id: 'basico',
      nombre: 'Básico',
      precio: 29,
      features: ['Hasta 100 facturas/mes', 'Soporte por email', '1 usuario'],
      actual: false
    },
    {
      id: 'pro',
      nombre: 'Pro',
      precio: 79,
      features: ['Facturas ilimitadas', 'Soporte prioritario', '5 usuarios', 'API access'],
      actual: true
    },
    {
      id: 'enterprise',
      nombre: 'Enterprise',
      precio: 199,
      features: ['Todo de Pro', 'Usuarios ilimitados', 'Soporte 24/7', 'Personalización'],
      actual: false
    }
  ];

  const handleSeleccionarPlan = (plan) => {
    if (plan.actual) return;
    setPlanSeleccionado(plan);
    setMostrarPago(true);
  };

  const handlePagoExitoso = (detallesPago) => {
    console.log('Pago exitoso:', detallesPago);
    toast.success(`¡Plan ${planSeleccionado.nombre} activado!`);
    setMostrarPago(false);
    setPlanSeleccionado(null);
    // Aquí actualizar el estado del plan en Firestore
  };

  const handlePagoError = (error) => {
    console.error('Error en pago:', error);
    toast.error('Hubo un problema con el pago');
  };

  const handlePagoCancelado = () => {
    setMostrarPago(false);
    setPlanSeleccionado(null);
  };

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
                onClick={() => handleSeleccionarPlan(plan)}
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

        {/* Modal de Pago con PayPal */}
        {mostrarPago && planSeleccionado && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Cambiar a Plan {planSeleccionado.nombre}
              </h2>

              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">Plan {planSeleccionado.nombre}</span>
                  <span className="font-bold text-slate-900">${planSeleccionado.precio}/mes</span>
                </div>
                <div className="text-sm text-slate-500">
                  Cobro mensual recurrente
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-700 mb-3">
                  Pagar con PayPal:
                </h3>
                <PayPalButton
                  amount={planSeleccionado.precio}
                  currency="USD"
                  description={`Suscripción Plan ${planSeleccionado.nombre}`}
                  invoiceId={null}
                  onSuccess={handlePagoExitoso}
                  onError={handlePagoError}
                  onCancel={handlePagoCancelado}
                />
              </div>

              <button
                onClick={handlePagoCancelado}
                className="w-full py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Métodos de Pago */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Métodos de Pago</h2>

          <div className="flex items-center gap-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="#003087">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .76-.633h4.606a.64.64 0 0 1 .633.74l-3.107 16.878a.77.77 0 0 1-.76.632z"/>
              <path d="M13.736 21.337H9.13a.641.641 0 0 1-.633-.74l3.107-16.878a.77.77 0 0 1 .76-.632h4.605a.64.64 0 0 1 .633.74l-3.106 16.877a.77.77 0 0 1-.76.633z"/>
            </svg>
            <div className="flex-1">
              <p className="font-medium text-slate-900">PayPal</p>
              <p className="text-sm text-slate-600">Método de pago configurado</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
              Activo
            </span>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            <p>Los pagos se procesan de forma segura a través de PayPal.</p>
            <p className="mt-1">Puedes pagar con tu cuenta PayPal o con tarjeta de crédito/débito.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suscripciones;
