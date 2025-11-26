/**
 * Ejemplos de Implementación de Optimistic UI
 *
 * Muestra cómo usar los hooks optimizados para crear
 * una experiencia de usuario instantánea y sin latencia.
 */

import { useState } from 'react';
import { CheckCircle, Loader, Package } from 'lucide-react';
import { useOptimisticAction, useMisRutasActivas } from '../hooks/useRealtimeOptimized';
import { LiveIndicator, DataChangePulse } from '../components/RealtimeIndicator';
import api from '../services/api';

/**
 * Ejemplo 1: Marcar item como entregado con Optimistic UI
 */
export const OptimisticEntregaExample = ({ facturaId, itemIndex, item }) => {
  const [itemEstado, setItemEstado] = useState(item);
  const { executeWithOptimism, isProcessing } = useOptimisticAction();

  const handleMarcarEntregado = async () => {
    await executeWithOptimism({
      // 1. Actualización optimista INMEDIATA
      optimisticUpdate: () => {
        setItemEstado(prev => ({ ...prev, entregado: true, _optimistic: true }));
      },

      // 2. Acción real en servidor
      serverAction: async () => {
        await api.post(`/repartidores/facturas/${facturaId}/items/entregar`, {
          itemIndex
        });
      },

      // 3. Rollback si falla
      rollback: () => {
        setItemEstado(prev => ({ ...prev, entregado: false, _optimistic: false }));
      },

      // 4. Mensajes
      successMessage: '✅ Item entregado',
      errorMessage: '❌ Error al entregar item'
    });
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${
        itemEstado.entregado
          ? 'bg-green-50 border-green-500'
          : 'bg-white border-gray-200'
      } ${itemEstado._optimistic ? 'opacity-70' : 'opacity-100'}`}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {itemEstado.entregado ? (
            <CheckCircle className="text-green-600" size={24} />
          ) : (
            <Package className="text-gray-400" size={24} />
          )}
          <span className={itemEstado.entregado ? 'line-through text-gray-500' : ''}>
            {item.descripcion}
          </span>
          {itemEstado._optimistic && (
            <span className="text-xs text-gray-500 italic">(Guardando...)</span>
          )}
        </div>

        {!itemEstado.entregado && (
          <button
            onClick={handleMarcarEntregado}
            disabled={isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isProcessing ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <CheckCircle size={18} />
            )}
            Entregar
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Ejemplo 2: Lista de rutas con tiempo real y notificaciones
 */
export const RutasEnTiempoRealExample = () => {
  const { data: rutas, loading, hasNewData, clearNewDataIndicator } = useMisRutasActivas();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con indicador en vivo */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Mis Rutas Activas</h2>
        <LiveIndicator isLive={true} showText={true} />
      </div>

      {/* Badge de nuevos datos */}
      {hasNewData && (
        <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex items-center justify-between">
            <p className="text-blue-800 font-medium">
              📦 Hay nuevas rutas disponibles
            </p>
            <button
              onClick={clearNewDataIndicator}
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Marcar como visto
            </button>
          </div>
        </div>
      )}

      {/* Lista de rutas */}
      <div className="grid gap-4">
        {rutas.map((ruta) => (
          <DataChangePulse key={ruta.id} show={hasNewData}>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <h3 className="text-lg font-bold">{ruta.nombre}</h3>
              <p className="text-sm text-gray-600 mt-1">{ruta.zona}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {ruta.estado}
                </span>
                <span className="text-sm text-gray-500">
                  {ruta.totalFacturas} facturas
                </span>
              </div>
            </div>
          </DataChangePulse>
        ))}
      </div>

      {rutas.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package size={48} className="mx-auto mb-4 opacity-30" />
          <p>No tienes rutas activas por el momento</p>
        </div>
      )}
    </div>
  );
};

/**
 * Ejemplo 3: Búsqueda con debouncing
 */
export const SearchWithDebounceExample = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (debouncedSearch.trim()) {
      performSearch(debouncedSearch);
    } else {
      setResults([]);
    }
  }, [debouncedSearch]);

  const performSearch = async (query) => {
    setSearching(true);
    try {
      // Simulación de búsqueda
      const response = await api.get(`/search/facturas?q=${query}`);
      setResults(response.data.data || []);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar facturas..."
          className="w-full px-4 py-3 border rounded-lg pr-10"
        />
        {searching && (
          <div className="absolute right-3 top-3">
            <Loader className="animate-spin text-gray-400" size={20} />
          </div>
        )}
      </div>

      {debouncedSearch && (
        <p className="text-xs text-gray-500 mt-2">
          Buscando: "{debouncedSearch}"
        </p>
      )}

      <div className="mt-4 space-y-2">
        {results.map((result) => (
          <div key={result.id} className="p-3 bg-gray-50 rounded">
            {result.codigoTracking}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Hook de debounce (copiado para el ejemplo)
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default {
  OptimisticEntregaExample,
  RutasEnTiempoRealExample,
  SearchWithDebounceExample
};
