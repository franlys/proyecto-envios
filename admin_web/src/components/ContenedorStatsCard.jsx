// admin_web/src/components/ContenedorStatsCard.jsx
// 📦 Componente de Estadísticas de Contenedor con Selector

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  TruckIcon,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const ContenedorStatsCard = () => {
  const { user } = useAuth();
  const [contenedores, setContenedores] = useState([]);
  const [contenedorSeleccionado, setContenedorSeleccionado] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    cargarContenedores();
  }, [user]);

  useEffect(() => {
    if (contenedorSeleccionado) {
      cargarEstadisticasContenedor(contenedorSeleccionado);
    }
  }, [contenedorSeleccionado]);

  const cargarContenedores = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/contenedores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const contenedoresLista = data.contenedores || [];
        setContenedores(contenedoresLista);

        // Auto-seleccionar el más reciente
        if (contenedoresLista.length > 0 && !contenedorSeleccionado) {
          setContenedorSeleccionado(contenedoresLista[0].id);
        }
      }
    } catch (error) {
      console.error('Error cargando contenedores:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticasContenedor = async (contenedorId) => {
    setLoadingStats(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dashboard/contenedor/${contenedorId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.contenedor);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const obtenerColorProgreso = (porcentaje) => {
    if (porcentaje >= 90) return 'from-emerald-500 to-green-600';
    if (porcentaje >= 70) return 'from-blue-500 to-indigo-600';
    if (porcentaje >= 40) return 'from-amber-500 to-orange-600';
    return 'from-rose-500 to-red-600';
  };

  const obtenerColorEstado = (estado) => {
    const colores = {
      CREADO: 'bg-slate-100 text-slate-700',
      EN_RECOLECCION: 'bg-blue-100 text-blue-700',
      CONFIRMADO: 'bg-indigo-100 text-indigo-700',
      EN_TRANSITO: 'bg-purple-100 text-purple-700',
      EN_ENTREGA: 'bg-amber-100 text-amber-700',
      COMPLETADO: 'bg-emerald-100 text-emerald-700'
    };
    return colores[estado] || 'bg-gray-100 text-gray-700';
  };

  const obtenerTextoEstado = (estado) => {
    const textos = {
      CREADO: 'Creado',
      EN_RECOLECCION: 'En Recolección',
      CONFIRMADO: 'Confirmado',
      EN_TRANSITO: 'En Tránsito',
      EN_ENTREGA: 'En Entrega',
      COMPLETADO: 'Completado'
    };
    return textos[estado] || estado;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (contenedores.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center">
          <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">No hay contenedores disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de Contenedor */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          📦 Selecciona un Contenedor
        </label>
        <select
          value={contenedorSeleccionado || ''}
          onChange={(e) => setContenedorSeleccionado(e.target.value)}
          className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 font-medium text-slate-800"
        >
          {contenedores.map((contenedor) => (
            <option key={contenedor.id} value={contenedor.id}>
              {contenedor.numeroContenedor} - {new Date(contenedor.createdAt).toLocaleDateString('es-DO')}
            </option>
          ))}
        </select>
      </div>

      {/* Estadísticas del Contenedor */}
      {loadingStats ? (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="ml-3 text-slate-600">Cargando estadísticas...</span>
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Header del Contenedor */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">{stats.numeroContenedor}</h3>
                <p className="text-indigo-100 text-sm">
                  Creado: {new Date(stats.fechaCreacion).toLocaleDateString('es-DO')}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${obtenerColorEstado(stats.estado)}`}>
                {obtenerTextoEstado(stats.estado)}
              </span>
            </div>

            {/* Barra de Progreso General */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progreso General</span>
                <span className="font-bold">{stats.progresoGeneral}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${obtenerColorProgreso(stats.progresoGeneral)} transition-all duration-500 rounded-full flex items-center justify-end pr-2`}
                  style={{ width: `${stats.progresoGeneral}%` }}
                >
                  {stats.progresoGeneral > 10 && (
                    <span className="text-xs font-bold text-white drop-shadow">
                      {stats.progresoGeneral}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Facturas */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                  <Package className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="text-3xl font-bold text-slate-800">{stats.totalFacturas}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">Total Facturas</p>
              <p className="text-xs text-slate-500 mt-1">${stats.valorTotal.toFixed(2)}</p>
            </div>

            {/* Confirmadas */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-3xl font-bold text-purple-600">{stats.facturasConfirmadas}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">Confirmadas</p>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.porcentajeConfirmacion}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{stats.porcentajeConfirmacion}% del total</p>
            </div>

            {/* En Tránsito */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg">
                  <TruckIcon className="h-6 w-6 text-amber-600" />
                </div>
                <span className="text-3xl font-bold text-amber-600">{stats.facturasEnTransito}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">En Tránsito</p>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.porcentajeEnTransito}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{stats.porcentajeEnTransito}% del total</p>
            </div>

            {/* Entregadas */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <span className="text-3xl font-bold text-emerald-600">{stats.facturasEntregadas}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">Entregadas</p>
              <div className="mt-2 w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                  style={{ width: `${stats.porcentajeEntrega}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{stats.porcentajeEntrega}% del total</p>
            </div>
          </div>

          {/* Detalles Adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pendientes */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{stats.facturasPendientes}</p>
                  <p className="text-sm text-slate-600">Pendientes</p>
                </div>
              </div>
            </div>

            {/* Recibidas en RD */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-800">{stats.facturasRecibidasRD}</p>
                  <p className="text-sm text-slate-600">Recibidas en RD</p>
                  <p className="text-xs text-slate-500">{stats.porcentajeRecibidasRD}%</p>
                </div>
              </div>
            </div>

            {/* No Entregadas */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-800">{stats.facturasNoEntregadas}</p>
                  <p className="text-sm text-slate-600">No Entregadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rutas Asociadas */}
          {stats.rutas && stats.rutas.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
              <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TruckIcon className="h-5 w-5 text-indigo-600" />
                Rutas Asociadas ({stats.totalRutas})
              </h4>
              <div className="space-y-2">
                {stats.rutas.map((ruta) => (
                  <div
                    key={ruta.id}
                    className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{ruta.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {ruta.tipo === 'recoleccion' ? 'Recolección' : 'Entrega'} • {ruta.totalPaquetes} paquetes
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      {ruta.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ContenedorStatsCard;
