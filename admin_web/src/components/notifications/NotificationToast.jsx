// admin_web/src/components/notifications/NotificationToast.jsx
import { useEffect } from 'react';

const NotificationToast = ({ notification, onClose, onViewDetails }) => {
  useEffect(() => {
    // Auto-cerrar después de 8 segundos
    const timer = setTimeout(() => {
      onClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in">
      <div className="bg-white rounded-lg shadow-2xl border-l-4 border-red-600 p-4 max-w-md">
        <div className="flex items-start gap-3">
          {/* Icono de alerta */}
          <div className="p-2 bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Contenido */}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">
              ⚠️ Factura No Entregada
            </h3>
            <p className="text-sm text-gray-700 font-medium">
              {notification.factura?.numeroFactura}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Cliente: {notification.factura?.cliente}
            </p>
            <p className="text-sm text-gray-600">
              Motivo: {notification.factura?.motivoNoEntrega || 'Sin especificar'}
            </p>
            
            {notification.factura?.rutaNombre && (
              <p className="text-xs text-gray-500 mt-1">
                Ruta: {notification.factura.rutaNombre} • Repartidor: {notification.factura.repartidorNombre || 'N/A'}
              </p>
            )}

            {/* Botones */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  onViewDetails(notification.factura);
                  onClose();
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition font-medium"
              >
                Ver Detalles
              </button>
              <button
                onClick={onClose}
                className="text-xs text-gray-600 hover:text-gray-800 px-2"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 animate-progress" />
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;