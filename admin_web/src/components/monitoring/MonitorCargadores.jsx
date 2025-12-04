// Componente de monitoreo en tiempo real de cargadores
import { useState } from 'react';
import { useRealtimeRutasEnCarga, useRealtimeUsuarios } from '../../hooks/useRealtimeCollection';
import { Package, Clock, CheckCircle, Box, User, AlertTriangle, RefreshCw } from 'lucide-react';

const MonitorCargadores = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Obtener rutas en carga en tiempo real
  const { data: rutasEnCarga, loading: loadingRutas } = useRealtimeRutasEnCarga();

  // Obtener cargadores activos en tiempo real
  const { data: cargadores, loading: loadingCargadores } = useRealtimeUsuarios('cargador');

  // Función para forzar actualización manual
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Filtrar solo rutas que tienen cargador asignado
  const rutasConCargador = rutasEnCarga.filter(ruta => ruta.cargadorId);

  // Calcular estadísticas
  const cargadoresActivos = rutasConCargador.filter(r => r.estado === 'en_carga').length;
  const rutasCargadas = rutasConCargador.filter(r =>
    r.estado === 'cargada' || r.estado === 'carga_finalizada'
  ).length;

  if (loadingRutas || loadingCargadores) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="ml-3 text-slate-600">Cargando monitor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Monitor de Cargadores</h3>
              <p className="text-sm text-slate-600">Actividad en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-600 transition-colors disabled:opacity-50"
              title="Actualizar manualmente"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-emerald-700">En vivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-600">{cargadores.length}</div>
          <div className="text-xs text-slate-600 mt-1">Cargadores Activos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{cargadoresActivos}</div>
          <div className="text-xs text-slate-600 mt-1">Cargando Ahora</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600">{rutasCargadas}</div>
          <div className="text-xs text-slate-600 mt-1">Listas para Salir</div>
        </div>
      </div>

      {/* Lista de rutas en carga */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Box className="w-4 h-4" />
          Rutas en Proceso
        </h4>

        {rutasConCargador.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay rutas en proceso de carga</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rutasConCargador.map((ruta) => {
              const cargador = cargadores.find(c => c.uid === ruta.cargadorId);
              const itemsCargados = ruta.itemsCargadosRuta || 0;
              const itemsTotal = ruta.itemsTotalRuta || 0;
              const progreso = itemsTotal > 0 ? Math.round((itemsCargados / itemsTotal) * 100) : 0;

              // Calcular tiempo desde inicio de carga
              let tiempoCargando = '';
              if (ruta.fechaInicioCarga) {
                const inicio = new Date(ruta.fechaInicioCarga);
                const ahora = new Date();
                const minutos = Math.floor((ahora - inicio) / 60000);
                if (minutos < 60) {
                  tiempoCargando = `${minutos} min`;
                } else {
                  const horas = Math.floor(minutos / 60);
                  const mins = minutos % 60;
                  tiempoCargando = `${horas}h ${mins}m`;
                }
              }

              return (
                <div
                  key={ruta.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    ruta.estado === 'en_carga'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  {/* Header de la ruta */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-slate-900">{ruta.nombre}</h5>
                        {ruta.estado === 'en_carga' ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                            Cargando
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Completa
                          </span>
                        )}
                      </div>

                      {/* Información del cargador */}
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-3.5 h-3.5" />
                        <span>{cargador?.nombre || 'Cargador no asignado'}</span>
                        {tiempoCargando && (
                          <>
                            <span className="text-slate-400">•</span>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{tiempoCargando}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Items cargados</span>
                      <span className="font-medium">{itemsCargados} / {itemsTotal}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          progreso === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progreso}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Estadísticas de facturas */}
                  <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t border-slate-200">
                    <div className="text-center">
                      <div className="font-semibold text-slate-900">{ruta.totalFacturas || 0}</div>
                      <div className="text-slate-500">Facturas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-slate-900">{progreso}%</div>
                      <div className="text-slate-500">Completado</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-slate-900">
                        {ruta.zona || 'No asignada'}
                      </div>
                      <div className="text-slate-500">Zona</div>
                    </div>
                  </div>

                  {/* Notas de carga si existen */}
                  {ruta.notasCarga && (
                    <div className="mt-3 p-2 bg-white rounded border border-slate-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600">{ruta.notasCarga}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer con última actualización */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
        Actualización automática en tiempo real
      </div>
    </div>
  );
};

export default MonitorCargadores;
