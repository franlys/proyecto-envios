// admin_web/src/pages/Recolecciones.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Package, Calendar, MapPin, User, Phone, DollarSign, Camera } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Recolecciones = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [recolecciones, setRecolecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [recoleccionSeleccionada, setRecoleccionSeleccionada] = useState(null);

  useEffect(() => {
    loadRecolecciones();
  }, [filtroEstado]);

  const loadRecolecciones = async () => {
    try {
      setLoading(true);
      let url = '/recolecciones';
      
      // Si es recolector, filtrar por su ID
      if (userData?.rol === 'recolector') {
        url += `?recolectorId=${userData.uid}`;
      }
      
      // Agregar filtro de estado si no es "todas"
      if (filtroEstado !== 'todas') {
        url += `${url.includes('?') ? '&' : '?'}estado=${filtroEstado}`;
      }

      const response = await api.get(url);
      console.log('📦 Recolecciones cargadas:', response.data);
      
      // ✅ CORRECCIÓN: Aplicar la Regla de Oro
      if (response.data.success) {
        setRecolecciones(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar recolecciones');
      }
    } catch (error) {
      console.error('❌ Error cargando recolecciones:', error);
      setRecolecciones([]);
      alert('Error al cargar recolecciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (recoleccion) => {
    setRecoleccionSeleccionada(recoleccion);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setRecoleccionSeleccionada(null);
  };

  const handleNuevaRecoleccion = () => {
    navigate('/recolecciones/nueva');
  };

  const recoleccionesFiltradas = recolecciones.filter(rec => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      rec.codigoTracking?.toLowerCase().includes(search) ||
      rec.remitente?.nombre?.toLowerCase().includes(search) ||
      rec.destinatario?.nombre?.toLowerCase().includes(search) ||
      rec.descripcion?.toLowerCase().includes(search)
    );
  });

  const getEstadoBadge = (estado) => {
    const badges = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      confirmada: 'bg-blue-100 text-blue-800',
      recolectada: 'bg-green-100 text-green-800',
      en_almacen: 'bg-purple-100 text-purple-800',
      cancelada: 'bg-red-100 text-red-800'
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      pendiente: 'Pendiente',
      confirmada: 'Confirmada',
      recolectada: 'Recolectada',
      en_almacen: 'En Almacén',
      cancelada: 'Cancelada'
    };
    return textos[estado] || estado;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recolecciones</h1>
          <p className="text-gray-600 mt-1">
            {userData?.rol === 'recolector' 
              ? 'Gestiona tus recolecciones asignadas' 
              : 'Gestiona todas las recolecciones del sistema'}
          </p>
        </div>
        
        {(userData?.rol === 'recolector' || userData?.rol === 'admin_general' || userData?.rol === 'almacen_eeuu') && (
          <button
            onClick={handleNuevaRecoleccion}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={20} />
            Nueva Recolección
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por código, remitente, destinatario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todas">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmada">Confirmadas</option>
              <option value="recolectada">Recolectadas</option>
              <option value="en_almacen">En Almacén</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total</p>
              <p className="text-2xl font-bold text-gray-900">{recolecciones.length}</p>
            </div>
            <Package className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {recolecciones.filter(r => r.estado === 'pendiente').length}
              </p>
            </div>
            <Calendar className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Recolectadas</p>
              <p className="text-2xl font-bold text-green-600">
                {recolecciones.filter(r => r.estado === 'recolectada').length}
              </p>
            </div>
            <MapPin className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">En Almacén</p>
              <p className="text-2xl font-bold text-purple-600">
                {recolecciones.filter(r => r.estado === 'en_almacen').length}
              </p>
            </div>
            <Package className="text-purple-600" size={32} />
          </div>
        </div>
      </div>

      {/* Lista de Recolecciones */}
      {recoleccionesFiltradas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay recolecciones
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'No se encontraron recolecciones con ese criterio de búsqueda'
              : 'Aún no hay recolecciones registradas'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recoleccionesFiltradas.map((recoleccion) => (
            <div
              key={recoleccion._id || recoleccion.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {recoleccion.codigoTracking}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(recoleccion.estado)}`}>
                      {getEstadoTexto(recoleccion.estado)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {new Date(recoleccion.fecha_recoleccion).toLocaleDateString('es-DO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <button
                  onClick={() => handleVerDetalle(recoleccion)}
                  className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
                >
                  <Eye size={18} />
                  Ver Detalle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-start gap-2">
                  <Package className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                  <div>
                    <p className="text-xs text-gray-500">Descripción</p>
                    <p className="text-sm font-medium text-gray-900">
                      {recoleccion.descripcion || 'Sin descripción'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                  <div>
                    <p className="text-xs text-gray-500">Remitente</p>
                    <p className="text-sm font-medium text-gray-900">
                      {recoleccion.remitente?.nombre || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <User className="text-gray-400 flex-shrink-0 mt-1" size={18} />
                  <div>
                    <p className="text-xs text-gray-500">Destinatario</p>
                    <p className="text-sm font-medium text-gray-900">
                      {recoleccion.destinatario?.nombre || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <MapPin className="text-gray-400" size={16} />
                  <p className="text-xs text-gray-600">
                    {recoleccion.direccion_recoleccion || 'Sin dirección'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="text-gray-400" size={16} />
                  <p className="text-xs text-gray-600">
                    {recoleccion.remitente?.telefono || 'Sin teléfono'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="text-gray-400" size={16} />
                  <p className="text-xs text-gray-600">
                    ${recoleccion.valor_declarado || '0.00'}
                  </p>
                </div>
              </div>

              {recoleccion.fotos && recoleccion.fotos.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="text-gray-400" size={16} />
                    <p className="text-xs text-gray-600">
                      {recoleccion.fotos.length} foto(s) adjunta(s)
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalle */}
      {showModal && recoleccionSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {recoleccionSeleccionada.codigoTracking}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(recoleccionSeleccionada.estado)}`}>
                    {getEstadoTexto(recoleccionSeleccionada.estado)}
                  </span>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información del Paquete</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Descripción</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.descripcion || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Peso</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.peso || 'N/A'} lbs</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Dimensiones</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.dimensiones || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Valor Declarado</label>
                      <p className="text-gray-900 font-medium">${recoleccionSeleccionada.valor_declarado || '0.00'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Remitente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Nombre</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.remitente?.nombre || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Teléfono</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.remitente?.telefono || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600">Dirección</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.direccion_recoleccion || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Destinatario</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Nombre</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.destinatario?.nombre || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Teléfono</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.destinatario?.telefono || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600">Dirección</label>
                      <p className="text-gray-900 font-medium">{recoleccionSeleccionada.destinatario?.direccion || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {recoleccionSeleccionada.fotos && recoleccionSeleccionada.fotos.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Fotos del Paquete</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {recoleccionSeleccionada.fotos.map((foto, index) => (
                        <a
                          key={index}
                          href={foto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group"
                        >
                          <img
                            src={foto}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:opacity-75 transition"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Eye className="text-white" size={24} />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {recoleccionSeleccionada.historial && recoleccionSeleccionada.historial.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Historial de Estados</h3>
                    <div className="space-y-3">
                      {recoleccionSeleccionada.historial.map((entry, index) => (
                        <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {getEstadoTexto(entry.estado)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(entry.fecha).toLocaleString('es-DO')}
                            </p>
                            {entry.comentario && (
                              <p className="text-xs text-gray-600 mt-1">{entry.comentario}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recolecciones;