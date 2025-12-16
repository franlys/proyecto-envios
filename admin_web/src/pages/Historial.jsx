// admin_web/src/pages/Historial.jsx
// 📚 Sistema de Historial con Filtros Avanzados
// Acceso: admin_general, almacen_rd

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  PhotoIcon,
  CalendarIcon,
  TruckIcon,
  ArchiveBoxIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const Historial = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rutas, setRutas] = useState([]);
  const [filteredRutas, setFilteredRutas] = useState([]);
  const [showFilters, setShowFilters] = useState(true);

  // Estados de filtros
  const [filters, setFilters] = useState({
    busqueda: '',
    contenedor: '',
    fechaInicio: '',
    fechaFin: '',
    tipo: '', // recoleccion, entrega
    estado: '', // pendiente, en_curso, completada, etc.
    repartidor: '',
    zona: ''
  });

  // Estados para selección y vista de detalles
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [fotoModalVisible, setFotoModalVisible] = useState(false);
  const [fotoActual, setFotoActual] = useState(null);

  // Cargar rutas históricas
  useEffect(() => {
    cargarHistorialRutas();
  }, [user]);

  const cargarHistorialRutas = async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/rutas/historial`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRutas(data.rutas || []);
        setFilteredRutas(data.rutas || []);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    aplicarFiltros();
  }, [filters, rutas]);

  const aplicarFiltros = () => {
    let resultado = [...rutas];

    // Filtro de búsqueda general
    if (filters.busqueda) {
      const busqueda = filters.busqueda.toLowerCase();
      resultado = resultado.filter(ruta =>
        ruta.nombre?.toLowerCase().includes(busqueda) ||
        ruta.id?.toLowerCase().includes(busqueda) ||
        ruta.repartidorNombre?.toLowerCase().includes(busqueda) ||
        ruta.zona?.toLowerCase().includes(busqueda)
      );
    }

    // Filtro por contenedor
    if (filters.contenedor) {
      resultado = resultado.filter(ruta =>
        ruta.numeroContenedor?.toLowerCase().includes(filters.contenedor.toLowerCase())
      );
    }

    // Filtro por fechas
    if (filters.fechaInicio) {
      resultado = resultado.filter(ruta => {
        const fechaRuta = new Date(ruta.fechaCreacion || ruta.createdAt);
        const fechaInicio = new Date(filters.fechaInicio);
        return fechaRuta >= fechaInicio;
      });
    }

    if (filters.fechaFin) {
      resultado = resultado.filter(ruta => {
        const fechaRuta = new Date(ruta.fechaCreacion || ruta.createdAt);
        const fechaFin = new Date(filters.fechaFin);
        fechaFin.setHours(23, 59, 59); // Incluir todo el día
        return fechaRuta <= fechaFin;
      });
    }

    // Filtro por tipo
    if (filters.tipo) {
      resultado = resultado.filter(ruta => ruta.tipo === filters.tipo);
    }

    // Filtro por estado
    if (filters.estado) {
      resultado = resultado.filter(ruta => ruta.estado === filters.estado);
    }

    // Filtro por repartidor
    if (filters.repartidor) {
      resultado = resultado.filter(ruta =>
        ruta.repartidorNombre?.toLowerCase().includes(filters.repartidor.toLowerCase())
      );
    }

    // Filtro por zona
    if (filters.zona) {
      resultado = resultado.filter(ruta =>
        ruta.zona?.toLowerCase().includes(filters.zona.toLowerCase())
      );
    }

    setFilteredRutas(resultado);
  };

  const limpiarFiltros = () => {
    setFilters({
      busqueda: '',
      contenedor: '',
      fechaInicio: '',
      fechaFin: '',
      tipo: '',
      estado: '',
      repartidor: '',
      zona: ''
    });
  };

  const handleFilterChange = (campo, valor) => {
    setFilters(prev => ({ ...prev, [campo]: valor }));
  };

  const verDetallesRuta = (ruta) => {
    setRutaSeleccionada(ruta);
    setMostrarDetalles(true);
  };

  const verFoto = (foto) => {
    setFotoActual(foto);
    setFotoModalVisible(true);
  };

  const obtenerColorEstado = (estado) => {
    const colores = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      en_curso: 'bg-blue-100 text-blue-800',
      en_ruta: 'bg-indigo-100 text-indigo-800',
      cargada: 'bg-purple-100 text-purple-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800'
    };
    return colores[estado] || 'bg-gray-100 text-gray-800';
  };

  const obtenerIconoTipo = (tipo) => {
    return tipo === 'recoleccion' ? (
      <ArchiveBoxIcon className="h-5 w-5 text-indigo-600" />
    ) : (
      <TruckIcon className="h-5 w-5 text-emerald-600" />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            📚 Historial de Rutas
          </h1>
          <p className="text-slate-600">
            Consulta y filtra el historial completo de rutas, contenedores y fotos
          </p>
        </div>

        {/* Panel de Filtros */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 mb-6 overflow-hidden">
          <div
            className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center gap-3">
              <FunnelIcon className="h-6 w-6 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-800">Filtros Avanzados</h2>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                {filteredRutas.length} resultados
              </span>
            </div>
            {showFilters ? (
              <ChevronUpIcon className="h-5 w-5 text-slate-600" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-slate-600" />
            )}
          </div>

          {showFilters && (
            <div className="p-6 space-y-4">
              {/* Fila 1: Búsqueda general */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Búsqueda General
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={filters.busqueda}
                    onChange={(e) => handleFilterChange('busqueda', e.target.value)}
                    placeholder="Buscar por código, repartidor, zona..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Fila 2: Filtros específicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Contenedor */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    N° Contenedor
                  </label>
                  <input
                    type="text"
                    value={filters.contenedor}
                    onChange={(e) => handleFilterChange('contenedor', e.target.value)}
                    placeholder="EMI-CNT-XXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha Inicio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={filters.fechaInicio}
                    onChange={(e) => handleFilterChange('fechaInicio', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Fecha Fin */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={filters.fechaFin}
                    onChange={(e) => handleFilterChange('fechaFin', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tipo de Ruta
                  </label>
                  <select
                    value={filters.tipo}
                    onChange={(e) => handleFilterChange('tipo', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="recoleccion">Recolección</option>
                    <option value="entrega">Entrega</option>
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={filters.estado}
                    onChange={(e) => handleFilterChange('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En Curso</option>
                    <option value="en_ruta">En Ruta</option>
                    <option value="cargada">Cargada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                {/* Repartidor */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Repartidor
                  </label>
                  <input
                    type="text"
                    value={filters.repartidor}
                    onChange={(e) => handleFilterChange('repartidor', e.target.value)}
                    placeholder="Nombre del repartidor"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Zona */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Zona
                  </label>
                  <input
                    type="text"
                    value={filters.zona}
                    onChange={(e) => handleFilterChange('zona', e.target.value)}
                    placeholder="Zona de entrega"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Botón limpiar filtros */}
              <div className="flex justify-end">
                <button
                  onClick={limpiarFiltros}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Rutas */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredRutas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 text-center">
            <DocumentTextIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">No se encontraron rutas con los filtros aplicados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRutas.map((ruta) => (
              <div
                key={ruta.id}
                className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => verDetallesRuta(ruta)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icono tipo */}
                    <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                      {obtenerIconoTipo(ruta.tipo)}
                    </div>

                    {/* Información principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-800">
                          {ruta.nombre || ruta.id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${obtenerColorEstado(ruta.estado)}`}>
                          {ruta.estado?.replace('_', ' ').toUpperCase()}
                        </span>
                        {ruta.numeroContenedor && (
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            📦 {ruta.numeroContenedor}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <UserIcon className="h-4 w-4" />
                          {ruta.repartidorNombre || 'Sin asignar'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPinIcon className="h-4 w-4" />
                          {ruta.zona || 'Sin zona'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <CalendarIcon className="h-4 w-4" />
                          {new Date(ruta.fechaCreacion || ruta.createdAt).toLocaleDateString('es-DO')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <ArchiveBoxIcon className="h-4 w-4" />
                          {ruta.facturas?.length || 0} paquetes
                        </div>
                      </div>

                      {/* Indicador de fotos */}
                      {ruta.fotos && ruta.fotos.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-indigo-600">
                          <PhotoIcon className="h-4 w-4" />
                          {ruta.fotos.length} foto{ruta.fotos.length > 1 ? 's' : ''} disponible{ruta.fotos.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón ver detalles */}
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    <EyeIcon className="h-5 w-5" />
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalles */}
      {mostrarDetalles && rutaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{rutaSeleccionada.nombre || rutaSeleccionada.id}</h2>
                <p className="text-indigo-100 text-sm mt-1">
                  Detalles completos de la ruta
                </p>
              </div>
              <button
                onClick={() => setMostrarDetalles(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">📋 Información General</h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                  <div>
                    <p className="text-sm text-slate-600">Tipo</p>
                    <p className="font-medium text-slate-800">{rutaSeleccionada.tipo === 'recoleccion' ? 'Recolección' : 'Entrega'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Estado</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${obtenerColorEstado(rutaSeleccionada.estado)}`}>
                      {rutaSeleccionada.estado?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Repartidor</p>
                    <p className="font-medium text-slate-800">{rutaSeleccionada.repartidorNombre || 'Sin asignar'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Zona</p>
                    <p className="font-medium text-slate-800">{rutaSeleccionada.zona || 'Sin zona'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Fecha Creación</p>
                    <p className="font-medium text-slate-800">
                      {new Date(rutaSeleccionada.fechaCreacion || rutaSeleccionada.createdAt).toLocaleString('es-DO')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Paquetes</p>
                    <p className="font-medium text-slate-800">{rutaSeleccionada.facturas?.length || 0}</p>
                  </div>
                  {rutaSeleccionada.numeroContenedor && (
                    <div className="col-span-2">
                      <p className="text-sm text-slate-600">N° Contenedor</p>
                      <p className="font-medium text-indigo-600">{rutaSeleccionada.numeroContenedor}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Paquetes */}
              {rutaSeleccionada.facturas && rutaSeleccionada.facturas.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">📦 Paquetes en la Ruta</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {rutaSeleccionada.facturas.map((factura, index) => (
                      <div key={index} className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{factura.codigoTracking || `Paquete ${index + 1}`}</p>
                          {factura.destinatario && (
                            <p className="text-sm text-slate-600">{factura.destinatario.nombre}</p>
                          )}
                        </div>
                        {factura.estadoGeneral && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${obtenerColorEstado(factura.estadoGeneral)}`}>
                            {factura.estadoGeneral.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fotos */}
              {rutaSeleccionada.fotos && rutaSeleccionada.fotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">📸 Fotos de la Ruta</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {rutaSeleccionada.fotos.map((foto, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        onClick={() => verFoto(foto)}
                      >
                        <img
                          src={foto.url || foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                          <EyeIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        {foto.descripcion && (
                          <p className="text-xs text-slate-600 mt-1">{foto.descripcion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de eventos */}
              {rutaSeleccionada.historial && rutaSeleccionada.historial.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">🕐 Historial de Eventos</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {rutaSeleccionada.historial.map((evento, index) => (
                      <div key={index} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
                        <ClockIcon className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{evento.descripcion || evento.accion}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(evento.fecha).toLocaleString('es-DO')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {(rutaSeleccionada.notas || rutaSeleccionada.notasCargador || rutaSeleccionada.notasRepartidor) && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">📝 Notas</h3>
                  <div className="space-y-2">
                    {rutaSeleccionada.notas && (
                      <div className="bg-amber-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-amber-900 mb-1">Notas Generales:</p>
                        <p className="text-sm text-amber-800">{rutaSeleccionada.notas}</p>
                      </div>
                    )}
                    {rutaSeleccionada.notasCargador && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-1">Notas del Cargador:</p>
                        <p className="text-sm text-blue-800">{rutaSeleccionada.notasCargador}</p>
                      </div>
                    )}
                    {rutaSeleccionada.notasRepartidor && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-green-900 mb-1">Notas del Repartidor:</p>
                        <p className="text-sm text-green-800">{rutaSeleccionada.notasRepartidor}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Foto */}
      {fotoModalVisible && fotoActual && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setFotoModalVisible(false)}
        >
          <div className="relative max-w-5xl w-full">
            <button
              onClick={() => setFotoModalVisible(false)}
              className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors z-10"
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
            <img
              src={fotoActual.url || fotoActual}
              alt="Foto ampliada"
              className="w-full h-auto rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {fotoActual.descripcion && (
              <div className="mt-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-white text-center">{fotoActual.descripcion}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Historial;
