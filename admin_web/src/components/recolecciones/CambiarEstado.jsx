// admin_web/src/components/recolecciones/CambiarEstado.jsx
import { useState } from 'react';
import { X, CheckCircle, Package, Plane, Warehouse, Truck, Home } from 'lucide-react';
import api from '../../services/api';

export default function CambiarEstado({ recoleccion, onClose, onActualizado }) {
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const estados = [
    { 
      valor: 'Recolectado', 
      label: 'Recolectado', 
      icon: Package,
      color: 'bg-blue-500',
      descripcion: 'Paquete recogido por el recolector'
    },
    { 
      valor: 'En almacén EE.UU.', 
      label: 'En almacén EE.UU.', 
      icon: Warehouse,
      color: 'bg-purple-500',
      descripcion: 'Llegó al almacén en Estados Unidos'
    },
    { 
      valor: 'En contenedor', 
      label: 'En contenedor', 
      icon: Package,
      color: 'bg-indigo-500',
      descripcion: 'Cargado en contenedor para envío'
    },
    { 
      valor: 'En tránsito', 
      label: 'En tránsito', 
      icon: Plane,
      color: 'bg-yellow-500',
      descripcion: 'En camino a República Dominicana'
    },
    { 
      valor: 'En almacén RD', 
      label: 'En almacén RD', 
      icon: Warehouse,
      color: 'bg-orange-500',
      descripcion: 'Llegó al almacén en República Dominicana'
    },
    { 
      valor: 'Confirmado', 
      label: 'Confirmado', 
      icon: CheckCircle,
      color: 'bg-teal-500',
      descripcion: 'Confirmado por secretaría'
    },
    { 
      valor: 'En ruta', 
      label: 'En ruta', 
      icon: Truck,
      color: 'bg-cyan-500',
      descripcion: 'En ruta con el repartidor'
    },
    { 
      valor: 'Entregado', 
      label: 'Entregado', 
      icon: Home,
      color: 'bg-green-500',
      descripcion: 'Entregado al destinatario'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nuevoEstado) {
      setError('Por favor selecciona un estado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.patch(
        `/recolecciones/${recoleccion.tracking_numero}/estado`,
        {
          nuevo_estado: nuevoEstado,
          usuario: 'Usuario Actual', // TODO: Obtener del contexto de autenticación
          notas: notas || null
        }
      );

      if (response.data.success) {
        onActualizado();
        onClose();
      }
    } catch (err) {
      console.error('Error cambiando estado:', err);
      setError(err.response?.data?.error || 'Error al cambiar estado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Cambiar Estado</h2>
            <p className="text-sm text-gray-600 mt-1">
              Tracking: <span className="font-mono font-semibold">{recoleccion.tracking_numero}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Estado actual */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Estado actual:</p>
            <p className="text-lg font-semibold text-gray-900">{recoleccion.status}</p>
          </div>

          {/* Selección de nuevo estado */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Seleccionar nuevo estado:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {estados.map((estado) => {
                const Icon = estado.icon;
                const isSelected = nuevoEstado === estado.valor;
                const isCurrent = recoleccion.status === estado.valor;
                
                return (
                  <button
                    key={estado.valor}
                    type="button"
                    onClick={() => setNuevoEstado(estado.valor)}
                    disabled={isCurrent}
                    className={`
                      relative p-4 rounded-lg border-2 text-left transition-all
                      ${isCurrent 
                        ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-50' 
                        : isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${estado.color} bg-opacity-20`}>
                        <Icon className={`w-5 h-5 ${estado.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {estado.label}
                          {isCurrent && (
                            <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                              Actual
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{estado.descripcion}</p>
                      </div>
                    </div>
                    {isSelected && !isCurrent && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas adicionales */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas adicionales (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder="Agregar notas sobre el cambio de estado..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !nuevoEstado}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Actualizando...' : 'Confirmar Cambio'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Timeline de estados (visual) */}
        <div className="px-6 pb-6">
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Flujo de estados:</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {estados.map((estado, index) => {
                const Icon = estado.icon;
                const isCompleted = estados.findIndex(e => e.valor === recoleccion.status) >= index;
                
                return (
                  <div key={estado.valor} className="flex items-center">
                    <div className={`
                      flex flex-col items-center p-2 rounded-lg min-w-[80px]
                      ${isCompleted ? estado.color + ' bg-opacity-10' : 'bg-gray-50'}
                    `}>
                      <Icon className={`w-4 h-4 ${isCompleted ? estado.color.replace('bg-', 'text-') : 'text-gray-400'}`} />
                      <span className={`text-[10px] mt-1 text-center ${isCompleted ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {estado.label}
                      </span>
                    </div>
                    {index < estados.length - 1 && (
                      <div className={`w-6 h-0.5 ${isCompleted ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}