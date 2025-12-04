// admin_web/src/components/recolecciones/EstadisticasRecolector.jsx
import { useState, useEffect } from 'react';
import { Package, TrendingUp, Clock, DollarSign, Weight } from 'lucide-react';
import api from '../../services/api';

export default function EstadisticasRecolector({ recolectorId }) {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (recolectorId) {
      cargarEstadisticas();
    }
  }, [recolectorId]);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/recolecciones/estadisticas/${recolectorId}`);
      
      if (response.data.success) {
        setEstadisticas(response.data.data);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (!recolectorId) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
        <p className="text-rose-800 text-sm">{error}</p>
      </div>
    );
  }

  if (!estadisticas) {
    return null;
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-indigo-50 rounded-lg shadow-lg p-6 mb-6 border border-indigo-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-indigo-600" />
          Mis Estadísticas
        </h2>
        <button
          onClick={cargarEstadisticas}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Actualizar
        </button>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total de recolecciones */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Total</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {estadisticas.total_recolecciones}
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Recolecciones totales</p>
        </div>

        {/* En proceso */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">En Proceso</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">
                {estadisticas.en_proceso}
              </p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Pendientes de entrega</p>
        </div>

        {/* Entregadas */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Entregadas</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">
                {estadisticas.entregadas}
              </p>
            </div>
            <div className="bg-emerald-100 p-3 rounded-full">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {estadisticas.total_recolecciones > 0
              ? `${Math.round((estadisticas.entregadas / estadisticas.total_recolecciones) * 100)}% del total`
              : '0% del total'}
          </p>
        </div>

        {/* Valor total */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Valor Total</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ${estadisticas.valor_total.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">USD declarados</p>
        </div>
      </div>

      {/* Desglose por estado */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Desglose por Estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(estadisticas.por_estado).map(([estado, cantidad]) => (
            <div key={estado} className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-2xl font-bold text-slate-900">{cantidad}</p>
              <p className="text-xs text-slate-600 mt-1">{estado}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Peso total */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Weight className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Peso Total</p>
              <p className="text-lg font-bold text-slate-900">
                {estadisticas.peso_total.toFixed(2)} lb
              </p>
            </div>
          </div>
        </div>

        {/* Última recolección */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Última Recolección</p>
              <p className="text-lg font-bold text-slate-900">
                {formatearFecha(estadisticas.ultima_recoleccion)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}