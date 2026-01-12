// ============================================================================
// COMPONENTE: OfflineQueueIndicator
// ============================================================================
// Indicador visual del estado de la cola offline y sincronización

import { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';

const OfflineQueueIndicator = () => {
  const {
    stats,
    isOnline,
    isSyncing,
    hasPending,
    syncNow
  } = useOfflineQueue();

  const [showDetails, setShowDetails] = useState(false);
  const [syncAnimation, setSyncAnimation] = useState(false);

  // Mostrar animación al sincronizar
  useEffect(() => {
    if (isSyncing) {
      setSyncAnimation(true);
    } else {
      // Mantener animación 1s después de finalizar
      const timeout = setTimeout(() => setSyncAnimation(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [isSyncing]);

  // Auto-cerrar detalles después de 5s
  useEffect(() => {
    if (showDetails && !isSyncing) {
      const timeout = setTimeout(() => setShowDetails(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [showDetails, isSyncing]);

  // ==========================================================================
  // RENDER DEL INDICADOR COMPACTO
  // ==========================================================================

  return (
    <div className="fixed bottom-20 right-3 z-40 flex flex-col gap-2 items-end">
      {/* Badge Principal */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-full shadow-lg
          transition-all duration-300 text-xs sm:text-sm font-medium
          ${isOnline
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'bg-rose-500 text-white hover:bg-rose-600'
          }
          ${syncAnimation ? 'ring-4 ring-indigo-300 ring-opacity-50' : ''}
        `}
      >
        {/* Icono de Conexión */}
        {isOnline ? (
          <Wifi size={16} className="flex-shrink-0" />
        ) : (
          <WifiOff size={16} className="flex-shrink-0" />
        )}

        {/* Estado de Sincronización */}
        {isSyncing && (
          <Loader size={14} className="animate-spin flex-shrink-0" />
        )}

        {/* Contador de Pendientes */}
        {hasPending && !isSyncing && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs font-bold">
            {stats.pending}
          </span>
        )}

        {/* Texto del Estado */}
        <span className="hidden xs:inline whitespace-nowrap">
          {isSyncing ? 'Sincronizando...' :
           hasPending ? `${stats.pending} pendiente${stats.pending > 1 ? 's' : ''}` :
           isOnline ? 'Online' : 'Offline'}
        </span>
      </button>

      {/* Panel de Detalles (expandible) */}
      {showDetails && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-3 sm:p-4 max-w-xs w-72 border border-slate-200 dark:border-slate-700 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              {isOnline ? (
                <Cloud size={16} className="text-emerald-600" />
              ) : (
                <CloudOff size={16} className="text-rose-600" />
              )}
              Cola de Sincronización
            </h4>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ×
            </button>
          </div>

          {/* Estadísticas */}
          <div className="space-y-2 mb-3">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-400">Estado:</span>
              <span className={`font-bold ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isOnline ? 'Conectado' : 'Sin conexión'}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-400">Pendientes:</span>
              <span className="font-bold text-amber-600">{stats.pending}</span>
            </div>

            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-slate-600 dark:text-slate-400">Completadas:</span>
              <span className="font-bold text-emerald-600">{stats.completed}</span>
            </div>

            {stats.failed > 0 && (
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-slate-600 dark:text-slate-400">Fallidas:</span>
                <span className="font-bold text-rose-600">{stats.failed}</span>
              </div>
            )}
          </div>

          {/* Desglose por Tipo */}
          {stats.byType && Object.keys(stats.byType).length > 0 && (
            <div className="mb-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Por tipo:
              </p>
              <div className="space-y-1">
                {Object.entries(stats.byType).map(([tipo, count]) => (
                  <div key={tipo} className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 truncate">
                      {tipo.replace('_', ' ').toLowerCase()}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón de Sincronización Manual */}
          {isOnline && hasPending && (
            <button
              onClick={() => syncNow()}
              disabled={isSyncing}
              className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2 text-xs sm:text-sm font-medium
                       transition-all"
            >
              {isSyncing ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Sincronizar Ahora
                </>
              )}
            </button>
          )}

          {/* Mensajes de Estado */}
          {!isOnline && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-800 dark:text-amber-200">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <p>Las operaciones se guardarán y sincronizarán cuando recuperes la conexión.</p>
            </div>
          )}

          {isOnline && !hasPending && (
            <div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle size={14} className="flex-shrink-0" />
              <p>Todo sincronizado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineQueueIndicator;
