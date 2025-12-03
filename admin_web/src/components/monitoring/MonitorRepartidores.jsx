// Componente de monitoreo en tiempo real de repartidores
import { useState } from 'react';
import { useRealtimeRutasActivas, useRealtimeUsuarios } from '../../hooks/useRealtimeCollection';
import { Truck, MapPin, Clock, Package, CheckCircle, User, XCircle, RefreshCw } from 'lucide-react';

const MonitorRepartidores = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Obtener rutas activas de repartidores en tiempo real (asignadas, cargadas, en_entrega, etc)
  const { data: rutasEnEntrega, loading: loadingRutas } = useRealtimeRutasActivas();

  // Obtener repartidores activos en tiempo real
  const { data: repartidores, loading: loadingRepartidores } = useRealtimeUsuarios('repartidor');

  // Función para forzar actualización manual
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (loadingRutas || loadingRepartidores) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Cargando monitor...</span>
        </div>
      </div>
    );
  }

  // Filtrar solo rutas que tienen repartidor asignado
  const rutasConRepartidor = rutasEnEntrega.filter(ruta => ruta.repartidorId);

  // Calcular estadísticas agregadas
  const totalFacturas = rutasConRepartidor.reduce((sum, r) => sum + (r.totalFacturas || 0), 0);
  const totalEntregadas = rutasConRepartidor.reduce((sum, r) => sum + (r.facturasEntregadas || 0), 0);
  const totalNoEntregadas = rutasConRepartidor.reduce((sum, r) => {
    const facturas = r.facturas || [];
    return sum + facturas.filter(f => f.estado === 'no_entregada').length;
  }, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monitor de Repartidores</h3>
              <p className="text-sm text-gray-500">Entregas en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors disabled:opacity-50"
              title="Actualizar manualmente"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500 ml-1">En vivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{repartidores.length}</div>
          <div className="text-xs text-gray-600 mt-1">Repartidores</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{rutasConRepartidor.length}</div>
          <div className="text-xs text-gray-600 mt-1">En Ruta</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalEntregadas}</div>
          <div className="text-xs text-gray-600 mt-1">Entregadas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{totalNoEntregadas}</div>
          <div className="text-xs text-gray-600 mt-1">No Entregadas</div>
        </div>
      </div>

      {/* Lista de repartidores en ruta */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Rutas Activas
        </h4>

        {rutasConRepartidor.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay repartidores en ruta</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rutasConRepartidor.map((ruta) => {
              const repartidor = repartidores.find(r => r.uid === ruta.repartidorId);
              const totalFacturas = ruta.totalFacturas || 0;
              const entregadas = ruta.facturasEntregadas || 0;
              const facturas = ruta.facturas || [];
              const noEntregadas = facturas.filter(f => f.estado === 'no_entregada').length;
              const pendientes = totalFacturas - entregadas - noEntregadas;
              const progreso = totalFacturas > 0 ? Math.round((entregadas / totalFacturas) * 100) : 0;

              // Calcular tiempo en ruta
              let tiempoEnRuta = '';
              if (ruta.fechaInicioEntrega) {
                const inicio = new Date(ruta.fechaInicioEntrega);
                const ahora = new Date();
                const minutos = Math.floor((ahora - inicio) / 60000);
                if (minutos < 60) {
                  tiempoEnRuta = `${minutos} min`;
                } else {
                  const horas = Math.floor(minutos / 60);
                  const mins = minutos % 60;
                  tiempoEnRuta = `${horas}h ${mins}m`;
                }
              }

              return (
                <div
                  key={ruta.id}
                  className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 transition-all hover:shadow-md"
                >
                  {/* Header de la ruta */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900">{ruta.nombre}</h5>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          En Entrega
                        </span>
                      </div>

                      {/* Información del repartidor */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-medium">{repartidor?.nombre || 'No asignado'}</span>
                        {tiempoEnRuta && (
                          <>
                            <span className="text-gray-400">•</span>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{tiempoEnRuta}</span>
                          </>
                        )}
                        {ruta.zona && (
                          <>
                            <span className="text-gray-400">•</span>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{ruta.zona}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progreso de entregas</span>
                      <span className="font-medium">{entregadas} / {totalFacturas}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          progreso === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progreso}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Estadísticas de entregas */}
                  <div className="grid grid-cols-4 gap-2 text-xs mt-3 pt-3 border-t border-blue-200">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Package className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="font-semibold text-gray-900">{totalFacturas}</div>
                      <div className="text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      </div>
                      <div className="font-semibold text-green-600">{entregadas}</div>
                      <div className="text-gray-500">Entregadas</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <div className="font-semibold text-red-600">{noEntregadas}</div>
                      <div className="text-gray-500">No Entregadas</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="font-semibold text-amber-600">{pendientes}</div>
                      <div className="text-gray-500">Pendientes</div>
                    </div>
                  </div>

                  {/* Gastos de ruta si existen */}
                  {ruta.totalGastos > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between text-xs">
                      <span className="text-gray-600">Gastos reportados:</span>
                      <span className="font-semibold text-gray-900">
                        ${ruta.totalGastos?.toLocaleString('es-DO') || '0'}
                      </span>
                    </div>
                  )}

                  {/* Indicador de progreso visual */}
                  <div className="mt-3 flex items-center justify-center gap-1">
                    {Array.from({ length: Math.min(totalFacturas, 10) }).map((_, i) => {
                      const isEntregada = i < entregadas;
                      const isNoEntregada = i >= entregadas && i < (entregadas + noEntregadas);

                      return (
                        <div
                          key={i}
                          className={`w-6 h-1 rounded-full transition-all ${
                            isEntregada
                              ? 'bg-green-500'
                              : isNoEntregada
                              ? 'bg-red-400'
                              : 'bg-gray-300'
                          }`}
                        />
                      );
                    })}
                    {totalFacturas > 10 && (
                      <span className="text-xs text-gray-500 ml-1">+{totalFacturas - 10}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer con última actualización */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        Actualización automática en tiempo real
      </div>
    </div>
  );
};

export default MonitorRepartidores;
