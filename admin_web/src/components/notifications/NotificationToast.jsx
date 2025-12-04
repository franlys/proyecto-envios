// admin_web/src/components/notifications/NotificationToast.jsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.95 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
        className="fixed top-20 right-4 z-50"
      >
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl border-l-4 border-rose-600 dark:border-rose-500 p-4 max-w-md">
        <div className="flex items-start gap-3">
          {/* Icono de alerta */}
          <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-full">
            <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Contenido */}
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">
              ⚠️ Factura No Entregada
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
              {notification.factura?.numeroFactura}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Cliente: {notification.factura?.cliente}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Motivo: {notification.factura?.motivoNoEntrega || 'Sin especificar'}
            </p>
            
            {notification.factura?.rutaNombre && (
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
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
                className="text-xs bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-1.5 rounded hover:bg-indigo-700 dark:hover:bg-indigo-600 transition font-medium"
              >
                Ver Detalles
              </button>
              <button
                onClick={onClose}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2"
              >
                Cerrar
              </button>
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="mt-3 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 8, ease: "linear" }}
            className="h-full bg-rose-600 dark:bg-rose-500"
          />
        </div>
      </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationToast;