// admin_web/src/pages/Recolecciones.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Plus, 
  MapPin, 
  Calendar, 
  User, 
  Phone,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import FiltrosRecolecciones from '../components/recolecciones/FiltrosRecolecciones';
import EstadisticasRecolector from '../components/recolecciones/EstadisticasRecolector';
import CambiarEstado from '../components/recolecciones/CambiarEstado';

export default function Recolecciones() {
  const { userData } = useAuth();
  const [recolecciones, setRecolecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtrosActivos, setFiltrosActivos] = useState({});
  const [recoleccionSeleccionada, setRecoleccionSeleccionada] = useState(null);
  const [mostrarCambiarEstado, setMostrarCambiarEstado] = useState(false);

  // Determinar si el usuario es recolector
  const esRecolector = userData?.rol === 'recolector';

  useEffect(() => {
    cargarRecolecciones();
  }, [userData]);

  const cargarRecolecciones = async (filtros = {}) => {
    try {
      setLoading(true);
      setError(null);

      let url = '/recolecciones';
      const params = new URLSearchParams();

      // Si es recolector, solo ver sus recolecciones
      if (esRecolector && userData?.uid) {
        params.append('recolector_id', userData.uid);
      }

      // Agregar filtros adicionales
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.tracking) params.append('tracking', filtros.tracking);
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await api.get(url);

      if (response.data.success) {
        setRecolecciones(response.data.data);
      }
    } catch (err) {
      console.error('Error cargando recolecciones:', err);
      setError('Error al cargar recolecciones');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = (filtros) => {
    setFiltrosActivos(filtros);
    cargarRecolecciones(filtros);
  };

  const handleLimpiarFiltros = () => {
    setFiltrosActivos({});
    cargarRecolecciones();
  };

  const handleAbrirCambiarEstado = (recoleccion) => {
    setRecoleccionSeleccionada(recoleccion);
    setMostrarCambiarEstado(true);
  };

  const handleCerrarCambiarEstado = () => {
    setRecoleccionSeleccionada(null);
    setMostrarCambiarEstado(false);
  };

  const handleEstadoActualizado = () => {
    cargarRecolecciones(filtrosActivos);
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-DO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerColorEstado = (estado) => {
    const colores = {
      'Recolectado': 'bg-blue-100 text-blue-800 border-blue-200',
      'En almacén EE.UU.': 'bg-purple-100 text-purple-800 border-purple-200',
      'En contenedor': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'En tránsito': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'En almacén RD': 'bg-orange-100 text-orange-800 border-orange-200',
      'Confirmado': 'bg-teal-100 text-teal-800 border-teal-200',
      'En ruta': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Entregado': 'bg-green-100 text-green-800 border-green-200'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            {esRecolector ? 'Mis Recolecciones' : 'Gestión de Recolecciones'}
          </h1>
          <p className="text-gray-600 mt-2">
            {esRecolector 
              ? 'Administra tus recolecciones y consulta su estado'
              : 'Visualiza y gestiona todas las recolecciones del sistema'
            }
          </p>
        </div>

        {/* Estadísticas (solo para recolectores) */}
        {esRecolector && userData?.uid && (
          <EstadisticasRecolector recolectorId={userData.uid} />
        )}

        {/* Filtros */}
        <FiltrosRecolecciones 
          onFiltrar={handleFiltrar}
          onLimpiar={handleLimpiarFiltros}
        />

        {/* Acciones rápidas */}
        <div className="bg-white rounded-lg shadow mb-6 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {recolecciones.length} recolección{recolecciones.length !== 1 ? 'es' : ''} encontrada{recolecciones.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => cargarRecolecciones(filtrosActivos)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
            {esRecolector && (
              <button
                onClick={() => window.location.href = '/recolecciones/nueva'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nueva Recolección
              </button>
            )}
          </div>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Cargando recolecciones...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Lista de recolecciones */}
        {!loading && !error && recolecciones.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay recolecciones
            </h3>
            <p className="text-gray-600 mb-6">
              {esRecolector 
                ? 'Aún no has registrado ninguna recolección'
                : 'No se encontraron recolecciones con los filtros seleccionados'
              }
            </p>
            {esRecolector && (
              <button
                onClick={() => window.location.href = '/recolecciones/nueva'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Crear Primera Recolección
              </button>
            )}
          </div>
        )}

        {/* Grid de recolecciones */}
        {!loading && !error && recolecciones.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {recolecciones.map((recoleccion) => (
              <div
                key={recoleccion.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
              >
                <div className="p-6">
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 font-mono">
                          {recoleccion.tracking_numero || recoleccion.id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${obtenerColorEstado(recoleccion.status)}`}>
                          {recoleccion.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatearFecha(recoleccion.fecha_recoleccion)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!esRecolector && (
                        <button
                          onClick={() => handleAbrirCambiarEstado(recoleccion)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Cambiar estado"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => window.location.href = `/recolecciones/${recoleccion.tracking_numero || recoleccion.id}`}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Información principal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Destinatario */}
                    <div className="border-l-4 border-blue-500 pl-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">DESTINATARIO</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {recoleccion.destinatario?.nombre}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {recoleccion.destinatario?.ciudad}
                        {recoleccion.destinatario?.sector && ` - ${recoleccion.destinatario.sector}`}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {recoleccion.destinatario?.telefono}
                      </p>
                    </div>

                    {/* Remitente */}
                    <div className="border-l-4 border-purple-500 pl-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">REMITENTE</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {recoleccion.remitente?.nombre}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {recoleccion.remitente?.ciudad}, {recoleccion.remitente?.estado}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {recoleccion.remitente?.telefono}
                      </p>
                    </div>
                  </div>

                  {/* Detalles del paquete */}
                  <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                    {recoleccion.paquete?.peso && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Peso</p>
                        <p className="font-semibold text-gray-900">
                          {recoleccion.paquete.peso} {recoleccion.paquete.peso_unidad}
                        </p>
                      </div>
                    )}
                    {recoleccion.paquete?.valor_declarado > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Valor</p>
                        <p className="font-semibold text-gray-900">
                          ${recoleccion.paquete.valor_declarado}
                        </p>
                      </div>
                    )}
                    {recoleccion.pago?.status && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Pago</p>
                        <p className="font-semibold text-gray-900">
                          {recoleccion.pago.status}
                        </p>
                      </div>
                    )}
                    {recoleccion.paquete?.fotos && recoleccion.paquete.fotos.length > 0 && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Fotos</p>
                        <p className="font-semibold text-gray-900">
                          {recoleccion.paquete.fotos.length}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de cambiar estado */}
        {mostrarCambiarEstado && recoleccionSeleccionada && (
          <CambiarEstado
            recoleccion={recoleccionSeleccionada}
            onClose={handleCerrarCambiarEstado}
            onActualizado={handleEstadoActualizado}
          />
        )}
      </div>
    </div>
  );
}