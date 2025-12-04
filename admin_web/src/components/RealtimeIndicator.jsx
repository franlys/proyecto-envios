/**
 * Indicador Visual de Actividad en Tiempo Real
 *
 * Muestra un punto pulsante verde cuando hay conexión activa
 * y notifica visualmente cuando llegan nuevos datos
 */

import { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';

/**
 * Indicador de conexión en tiempo real
 */
export const LiveIndicator = ({
  isLive = true,
  size = 'sm',
  showText = true,
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full ${
          isLive
            ? 'bg-emerald-500 animate-pulse'
            : 'bg-slate-400'
        }`}
      />
      {showText && (
        <span className={`${textSizes[size]} ${
          isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
        } font-medium`}>
          {isLive ? 'En vivo' : 'Sin conexión'}
        </span>
      )}
    </div>
  );
};

/**
 * Badge de "Nuevos Datos" con animación
 */
export const NewDataBadge = ({
  show = false,
  count = 0,
  onDismiss,
  message = 'Nuevos datos disponibles'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
    }
  }, [show]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
      <div className="bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {count > 0 && (
            <p className="text-xs opacity-90 mt-0.5">
              {count} {count === 1 ? 'nuevo elemento' : 'nuevos elementos'}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/**
 * Indicador de estado de conexión global
 */
export const ConnectionStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null; // Solo mostrar cuando está offline

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
        <WifiOff size={16} />
        <span className="text-sm font-medium">Sin conexión - Modo offline</span>
      </div>
    </div>
  );
};

/**
 * Indicador de actividad de sincronización
 */
export const SyncIndicator = ({ isSyncing = false }) => {
  if (!isSyncing) return null;

  return (
    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm">
      <Activity className="w-4 h-4 animate-pulse" />
      <span>Sincronizando...</span>
    </div>
  );
};

/**
 * Pulso visual para indicar cambios en datos
 */
export const DataChangePulse = ({ show = false, children }) => {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (show) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <div className={`transition-all duration-300 ${
      isPulsing ? 'ring-2 ring-indigo-500 ring-opacity-50 scale-[1.02]' : ''
    }`}>
      {children}
    </div>
  );
};

/**
 * Badge flotante para notificaciones en tiempo real
 */
export const FloatingNotificationBadge = ({ count = 0, onClick }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-110 animate-bounce-subtle"
    >
      <div className="relative">
        <Activity className="w-6 h-6" />
        <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      </div>
    </button>
  );
};

export default {
  LiveIndicator,
  NewDataBadge,
  ConnectionStatusIndicator,
  SyncIndicator,
  DataChangePulse,
  FloatingNotificationBadge
};
