// admin_web/src/pages/Recolecciones.jsx
// ✅ VERSIÓN CORREGIDA - Usa helpers para mostrar datos correctamente

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Package, Calendar, MapPin, User, Phone, Camera, X, Home, Mail } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  getDestinatario, 
  getRemitente, 
  getNombreCliente, 
  getTelefonoCliente, 
  getDireccionCliente 
} from '../utils/recoleccionHelpers';

const Recolecciones = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [recolecciones, setRecolecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroZona, setFiltroZona] = useState('todas');
  const [showModal, setShowModal] = useState(false);
  const [recoleccionSeleccionada, setRecoleccionSeleccionada] = useState(null);

  useEffect(() => {
    loadRecolecciones();
  }, []);

  const loadRecolecciones = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/recolecciones');
      console.log('📦 Respuesta del servidor:', response.data);
      
      if (response.data.success) {
        setRecolecciones(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar recolecciones');
      }
    } catch (error) {
      console.error('❌ Error cargando recolecciones:', error);
      setRecolecciones([]);
      alert('Error al cargar recolecciones: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (recoleccion) => {
    console.log('🔍 Ver detalle de recolección:', recoleccion);
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

  // ✅ Usar helpers para búsqueda
  const recoleccionesFiltradas = recolecciones.filter(rec => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const nombreCliente = getNombreCliente(rec).toLowerCase();
      const telefonoCliente = getTelefonoCliente(rec).toLowerCase();
      
      const matchSearch = 
        rec.codigoTracking?.toLowerCase().includes(search) ||
        rec.zona?.toLowerCase().includes(search) ||
        rec.sector?.toLowerCase().includes(search) ||
        nombreCliente.includes(search) ||
        telefonoCliente.includes(search) ||
        rec.items?.some(item => 
          item.descripcion?.toLowerCase().includes(search)
        );
      if (!matchSearch) return false;
    }

    if (filtroEstado !== 'todas' && rec.estadoGeneral !== filtroEstado) {
      return false;
    }

    if (filtroZona !== 'todas' && rec.zona !== filtroZona) {
      return false;
    }

    return true;
  });

  const getEstadoBadge = (estado) => {
    const badges = {
      sin_confirmar: 'bg-yellow-100 text-yellow-800',
      pendiente_recoleccion: 'bg-yellow-100 text-yellow-800',
      recolectada: 'bg-green-100 text-green-800',
      en_contenedor_usa: 'bg-purple-100 text-purple-800',
      incompleta_usa: 'bg-orange-100 text-orange-800',
      en_transito_rd: 'bg-indigo-100 text-indigo-800',
      recibida_rd: 'bg-blue-100 text-blue-800',
      pendiente_confirmacion: 'bg-yellow-100 text-yellow-800',
      confirmada: 'bg-blue-100 text-blue-800',
      en_ruta: 'bg-purple-100 text-purple-800',
      lista_para_entregar: 'bg-teal-100 text-teal-800',
      entregada: 'bg-green-100 text-green-800',
      no_entregada: 'bg-red-100 text-red-800'
    };
    return badges[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      sin_confirmar: 'Sin Confirmar',
      pendiente_recoleccion: 'Pendiente Recolección',
      recolectada: 'Recolectada',
      en_contenedor_usa: 'En Contenedor USA',
      incompleta_usa: 'Incompleta USA',
      en_transito_rd: 'En Tránsito RD',
      recibida_rd: 'Recibida RD',
      pendiente_confirmacion: 'Pendiente Confirmación',
      confirmada: 'Confirmada',
      en_ruta: 'En Ruta',
      lista_para_entregar: 'Lista para Entregar',
      entregada: 'Entregada',
      no_entregada: 'No Entregada'
    };
    return textos[estado] || estado;
  };

  const stats = {
    total: recolecciones.length,
    pendientes: recolecciones.filter(r => r.estadoGeneral === 'pendiente_recoleccion' || r.estadoGeneral === 'sin_confirmar').length,
    recolectadas: recolecciones.filter(r => r.estadoGeneral === 'recolectada').length,
    enAlmacen: recolecciones.filter(r => r.estadoGeneral === 'en_contenedor_usa').length
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
            Gestiona todas las recolecciones del sistema
          </p>
        </div>
        
        {(userData?.rol === 'recolector' || 
          userData?.rol === 'admin_general' || 
          userData?.rol === 'super_admin') && (
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por código, zona, nombre..."
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
              <option value="sin_confirmar">Sin Confirmar</option>
              <option value="pendiente_recoleccion">Pendiente Recolección</option>
              <option value="recolectada">Recolectada</option>
              <option value="en_contenedor_usa">En Contenedor USA</option>
              <option value="incompleta_usa">Incompleta USA</option>
              <option value="en_transito_rd">En Tránsito RD</option>
              <option value="recibida_rd">Recibida RD</option>
              <option value="pendiente_confirmacion">Pendiente Confirmación</option>
              <option value="confirmada">Confirmada</option>
              <option value="en_ruta">En Ruta</option>
              <option value="entregada">Entregada</option>
              <option value="no_entregada">No Entregada</option>
            </select>
          </div>

          <div>
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todas">Todas las zonas</option>
              <option value="Capital">Capital</option>
              <option value="Sur">Sur</option>
              <option value="Local">Local (Baní)</option>
              <option value="Cibao">Cibao</option>
              <option value="Este">Este</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendientes}</p>
            </div>
            <Calendar className="text-yellow-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Recolectadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.recolectadas}</p>
            </div>
            <MapPin className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">En Almacén</p>
              <p className="text-2xl font-bold text-purple-600">{stats.enAlmacen}</p>
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
            {searchTerm || filtroEstado !== 'todas' || filtroZona !== 'todas'
              ? 'No se encontraron recolecciones con esos filtros'
              : 'Aún no hay recolecciones registradas'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {recoleccionesFiltradas.map((recoleccion) => {
            // ✅ Usar helpers para obtener datos
            const nombreCliente = getNombreCliente(recoleccion);
            const telefonoCliente = getTelefonoCliente(recoleccion);
            const direccionCliente = getDireccionCliente(recoleccion);

            return (
              <div
                key={recoleccion.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {recoleccion.codigoTracking}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(recoleccion.estadoGeneral)}`}>
                        {getEstadoTexto(recoleccion.estadoGeneral)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(recoleccion.fechaCreacion?.seconds * 1000 || recoleccion.createdAt || Date.now()).toLocaleDateString('es-DO')}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {recoleccion.zona || recoleccion.destinatario?.zona || 'N/A'} 
                        {(recoleccion.sector || recoleccion.destinatario?.sector) && ` - ${recoleccion.sector || recoleccion.destinatario?.sector}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package size={14} />
                        {recoleccion.items?.length || 0} item(s)
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleVerDetalle(recoleccion)}
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
                  >
                    <Eye size={18} />
                    Ver Detalle
                  </button>
                </div>

                {/* ✅ Información del cliente con helpers */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-gray-600" />
                    <span className="font-medium text-gray-900">{nombreCliente}</span>
                    <span className="text-gray-400">•</span>
                    <Phone size={14} className="text-gray-600" />
                    <span className="text-gray-700">{telefonoCliente}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 ml-5">{direccionCliente}</p>
                </div>

                {/* Items Preview */}
                <div className="space-y-2">
                  {(recoleccion.items || []).slice(0, 2).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      <Package className="text-gray-400" size={16} />
                      <div className="flex-1">
                        <p className="font-medium">{item.descripcion}</p>
                        <div className="flex gap-4 text-xs text-gray-600 mt-1">
                          <span>Cantidad: {item.cantidad}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recoleccion.items?.length > 2 && (
                    <p className="text-xs text-gray-500 text-center">
                      Y {recoleccion.items.length - 2} item(s) más...
                    </p>
                  )}
                </div>

                {/* Fotos Badge */}
                {recoleccion.fotos && recoleccion.fotos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Camera size={16} />
                      <span>{recoleccion.fotos.length} foto(s) adjunta(s)</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ Modal de Detalle Mejorado */}
      {showModal && recoleccionSeleccionada && (() => {
        const destinatario = getDestinatario(recoleccionSeleccionada);
        const remitente = getRemitente(recoleccionSeleccionada);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header del Modal */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {recoleccionSeleccionada.codigoTracking}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(recoleccionSeleccionada.estadoGeneral)}`}>
                        {getEstadoTexto(recoleccionSeleccionada.estadoGeneral)}
                      </span>
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin size={14} />
                        {recoleccionSeleccionada.zona || recoleccionSeleccionada.destinatario?.zona}
                        {(recoleccionSeleccionada.sector || recoleccionSeleccionada.destinatario?.sector) && 
                          ` - ${recoleccionSeleccionada.sector || recoleccionSeleccionada.destinatario?.sector}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600 transition"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* ✅ Información del Remitente */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="text-green-600" size={20} />
                    Información del Remitente (Quien Envía)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <User size={18} className="text-gray-500 mt-1" />
                      <div>
                        <label className="text-sm text-gray-600">Nombre</label>
                        <p className="text-gray-900 font-medium">{remitente.nombre}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone size={18} className="text-gray-500 mt-1" />
                      <div>
                        <label className="text-sm text-gray-600">Teléfono</label>
                        <p className="text-gray-900 font-medium">{remitente.telefono}</p>
                      </div>
                    </div>
                    {remitente.email && remitente.email !== 'N/A' && remitente.email !== '' && (
                      <div className="flex items-start gap-2">
                        <Mail size={18} className="text-gray-500 mt-1" />
                        <div>
                          <label className="text-sm text-gray-600">Email</label>
                          <p className="text-gray-900 font-medium">{remitente.email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2 md:col-span-2">
                      <Home size={18} className="text-gray-500 mt-1" />
                      <div>
                        <label className="text-sm text-gray-600">Dirección de Recogida</label>
                        <p className="text-gray-900 font-medium">{remitente.direccion}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ Información del Destinatario */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="text-blue-600" size={20} />
                    Información del Destinatario (Quien Recibe)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <User size={18} className="text-gray-500 mt-1" />
                      <div>
                        <label className="text-sm text-gray-600">Cliente</label>
                        <p className="text-gray-900 font-medium">{destinatario.nombre}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone size={18} className="text-gray-500 mt-1" />
                      <div>
                        <label className="text-sm text-gray-600">Teléfono</label>
                        <p className="text-gray-900 font-medium">{destinatario.telefono}</p>
                      </div>
                    </div>
                    {destinatario.email && destinatario.email !== 'N/A' && destinatario.email !== '' && (
                      <div className="flex items-start gap-2">
                        <Mail size={18} className="text-gray-500 mt-1" />
                        <div>
                          <label className="text-sm text-gray-600">Email</label>
                          <p className="text-gray-900 font-medium">{destinatario.email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-2 md:col-span-2">
                      <Home size={18} className="text-gray-500 mt-1" />
                      <div>
                        <label className="text-sm text-gray-600">Dirección de Entrega</label>
                        <p className="text-gray-900 font-medium">{destinatario.direccion}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Items ({recoleccionSeleccionada.items?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {(recoleccionSeleccionada.items || []).map((item, index) => (
                      <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="text-purple-600" size={20} />
                          <h4 className="font-semibold text-gray-900">Item #{index + 1}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <label className="text-sm text-gray-600">Descripción</label>
                            <p className="text-gray-900">{item.descripcion}</p>
                          </div>
                          <div>
                            <label className="text-sm text-gray-600">Cantidad</label>
                            <p className="text-gray-900">{item.cantidad}</p>
                          </div>
                          {item.precio && (
                            <div>
                              <label className="text-sm text-gray-600">Precio</label>
                              <p className="text-gray-900">${item.precio}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fotos */}
                {recoleccionSeleccionada.fotos && recoleccionSeleccionada.fotos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Fotos de la Recolección ({recoleccionSeleccionada.fotos.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {recoleccionSeleccionada.fotos.map((foto, index) => (
                        <a
                          key={index}
                          href={foto.url || foto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative group"
                        >
                          <img
                            src={foto.url || foto}
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

                {/* Notas */}
                {recoleccionSeleccionada.notas && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Notas</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">{recoleccionSeleccionada.notas}</p>
                    </div>
                  </div>
                )}

                {/* Botón Cerrar */}
                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Recolecciones;