// Componente de monitoreo en tiempo real de cargadores
import { useRealtimeRutasEnCarga, useRealtimeUsuarios } from '../../hooks/useRealtimeCollection';
import { Package, Clock, CheckCircle, Box, User, AlertTriangle } from 'lucide-react';

const MonitorCargadores = () => {
  // Obtener rutas en carga en tiempo real
  const { data: rutasEnCarga, loading: loadingRutas } = useRealtimeRutasEnCarga();

  // Obtener cargadores activos en tiempo real
  const { data: cargadores, loading: loadingCargadores } = useRealtimeUsuarios('cargador');

  // Calcular estadísticas
  const cargadoresActivos = rutasEnCarga.filter(r => r.estado === 'en_carga').length;
  const rutasCargadas = rutasEnCarga.filter(r =>
    r.estado === 'cargada' || r.estado === 'carga_finalizada'
  ).length;

  if (loadingRutas || loadingCargadores) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Cargando monitor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monitor de Cargadores</h3>
              <p className="text-sm text-gray-500">Actividad en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 ml-1">En vivo</span>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{cargadores.length}</div>
          <div className="text-xs text-gray-600 mt-1">Cargadores Activos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{cargadoresActivos}</div>
          <div className="text-xs text-gray-600 mt-1">Cargando Ahora</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{rutasCargadas}</div>
          <div className="text-xs text-gray-600 mt-1">Listas para Salir</div>
        </div>
      </div>

      {/* Lista de rutas en carga */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Box className="w-4 h-4" />
          Rutas en Proceso
        </h4>

        {rutasEnCarga.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay rutas en proceso de carga</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rutasEnCarga.map((ruta) => {
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
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  {/* Header de la ruta */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-gray-900">{ruta.nombre}</h5>
                        {ruta.estado === 'en_carga' ? (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                            Cargando
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Completa
                          </span>
                        )}
                      </div>

                      {/* Información del cargador */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-3.5 h-3.5" />
                        <span>{cargador?.nombre || 'Cargador no asignado'}</span>
                        {tiempoCargando && (
                          <>
                            <span className="text-gray-400">•</span>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{tiempoCargando}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Items cargados</span>
                      <span className="font-medium">{itemsCargados} / {itemsTotal}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          progreso === 100 ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${progreso}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Estadísticas de facturas */}
                  <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-3 border-t border-gray-200">
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{ruta.totalFacturas || 0}</div>
                      <div className="text-gray-500">Facturas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">{progreso}%</div>
                      <div className="text-gray-500">Completado</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {ruta.zona || 'No asignada'}
                      </div>
                      <div className="text-gray-500">Zona</div>
                    </div>
                  </div>

                  {/* Notas de carga si existen */}
                  {ruta.notasCarga && (
                    <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-gray-600">{ruta.notasCarga}</div>
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
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        Actualización automática en tiempo real
      </div>
    </div>
  );
};

export default MonitorCargadores;
