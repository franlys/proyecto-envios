// admin_web/src/pages/PanelAlmacenUSA.jsx
// ✅ VERSIÓN CONSOLIDADA COMPLETA
// Incluye TODAS las funcionalidades:
// - Crear, eliminar contenedores
// - Buscar y agregar facturas (con búsqueda global)
// - Quitar facturas del contenedor
// - Marcar items
// - Cerrar contenedores con validación
// - Marcar como trabajado
// - Pestañas de Activos/Historial

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  getNombreCliente,
  getRemitente,
  getDestinatario,
  contarItems
} from '../utils/recoleccionHelpers';
import { 
  Package, 
  Search, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  Lock,
  Eye,
  ArrowLeft,
  Box,
  Loader,
  Trash,
  CheckCircle,
  History
} from 'lucide-react';

const PanelAlmacenUSA = () => {
  const navigate = useNavigate();

  // Estados principales
  const [contenedores, setContenedores] = useState([]);
  const [contenedorActivo, setContenedorActivo] = useState(null);
  const [vistaActual, setVistaActual] = useState('lista'); // 'lista' | 'crear' | 'trabajar'
  const [tabActiva, setTabActiva] = useState('activos'); // 'activos' | 'historial'

  // Estados para crear contenedor
  const [numeroContenedor, setNumeroContenedor] = useState('');

  // Estados para trabajar con contenedor
  const [busquedaFactura, setBusquedaFactura] = useState('');
  const [facturaEncontrada, setFacturaEncontrada] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [itemsMarcados, setItemsMarcados] = useState({});

  // Estados para búsqueda global
  const [busquedaGlobal, setBusquedaGlobal] = useState('');
  const [resultadoGlobal, setResultadoGlobal] = useState(null);
  const [modalBusquedaGlobal, setModalBusquedaGlobal] = useState(false);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [modalQuitarFactura, setModalQuitarFactura] = useState(null);
  const [modalMarcarTrabajado, setModalMarcarTrabajado] = useState(null);
  const [facturasIncompletas, setFacturasIncompletas] = useState([]);

  // ========================================
  // CARGAR CONTENEDORES
  // ========================================
  useEffect(() => {
    cargarContenedores();
  }, []);

  const cargarContenedores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/almacen-usa/contenedores');
      
      if (response.data.success) {
        setContenedores(response.data.data);
      }
    } catch (err) {
      console.error('Error cargando contenedores:', err);
      setError('Error al cargar los contenedores');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar contenedores según la pestaña activa
  const contenedoresFiltrados = contenedores.filter(c => {
    if (tabActiva === 'activos') {
      return c.estado !== 'trabajado';
    } else {
      return c.estado === 'trabajado';
    }
  });

  // ========================================
  // CREAR NUEVO CONTENEDOR
  // ========================================
  const handleCrearContenedor = async (e) => {
    e.preventDefault();
    
    if (!numeroContenedor.trim()) {
      setError('El número de contenedor es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/almacen-usa/contenedores', {
        numeroContenedor: numeroContenedor.trim()
      });

      if (response.data.success) {
        setSuccessMessage('Contenedor creado exitosamente');
        setNumeroContenedor('');
        setContenedorActivo(response.data.data);
        setVistaActual('trabajar');
        await cargarContenedores();
      }
    } catch (err) {
      console.error('Error creando contenedor:', err);
      setError(err.response?.data?.message || 'Error al crear el contenedor');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // BUSCAR FACTURA POR CÓDIGO
  // ========================================
  const handleBuscarFactura = async (e) => {
    e.preventDefault();
    
    if (!busquedaFactura.trim()) {
      setError('Ingresa un código de tracking');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setFacturaEncontrada(null);

      const response = await api.get(`/almacen-usa/facturas/buscar/${busquedaFactura.trim()}`);

      if (response.data.success) {
        setFacturaEncontrada(response.data.data);
        setSuccessMessage('Factura encontrada');
      }
    } catch (err) {
      console.error('Error buscando factura:', err);
      setError(err.response?.data?.message || 'Factura no encontrada');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // BÚSQUEDA GLOBAL DE FACTURA
  // ========================================
  const handleBusquedaGlobal = async (e) => {
    e.preventDefault();
    
    if (!busquedaGlobal.trim()) {
      setError('Ingresa un código de tracking');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResultadoGlobal(null);

      const response = await api.get(`/almacen-usa/facturas/buscar/${busquedaGlobal.trim()}`);

      if (response.data.success) {
        setResultadoGlobal(response.data.data);
        setModalBusquedaGlobal(true);
      }
    } catch (err) {
      console.error('Error en búsqueda global:', err);
      setError(err.response?.data?.message || 'Factura no encontrada');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // AGREGAR FACTURA AL CONTENEDOR
  // ========================================
  const handleAgregarFactura = async () => {
    if (!facturaEncontrada || !contenedorActivo) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.post(
        `/almacen-usa/contenedores/${contenedorActivo.id}/facturas`,
        { facturaId: facturaEncontrada.id }
      );

      if (response.data.success) {
        setSuccessMessage('Factura agregada al contenedor');
        
        // Recargar contenedor activo
        await cargarContenedorActivo(contenedorActivo.id);
        
        setFacturaEncontrada(null);
        setBusquedaFactura('');
      }
    } catch (err) {
      console.error('Error agregando factura:', err);
      setError(err.response?.data?.message || 'Error al agregar la factura');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // CARGAR CONTENEDOR ACTIVO
  // ========================================
  const cargarContenedorActivo = async (contenedorId) => {
    try {
      const response = await api.get(`/almacen-usa/contenedores/${contenedorId}`);
      
      if (response.data.success) {
        setContenedorActivo(response.data.data);
      }
    } catch (err) {
      console.error('Error cargando contenedor:', err);
      setError('Error al cargar el contenedor');
    }
  };

  // ========================================
  // QUITAR FACTURA DEL CONTENEDOR
  // ========================================
  const handleQuitarFactura = async (facturaId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.delete(
        `/almacen-usa/contenedores/${contenedorActivo.id}/facturas/${facturaId}`
      );

      if (response.data.success) {
        setSuccessMessage('Factura quitada del contenedor');
        
        await cargarContenedorActivo(contenedorActivo.id);
        
        setModalQuitarFactura(null);
        
        // Si estábamos viendo los items de esta factura, cerrar la vista
        if (facturaSeleccionada?.id === facturaId) {
          setFacturaSeleccionada(null);
        }
      }
    } catch (err) {
      console.error('Error quitando factura:', err);
      setError(err.response?.data?.message || 'Error al quitar la factura');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // MARCAR/DESMARCAR ITEM
  // ========================================
  const handleMarcarItem = async (facturaId, itemIndex, marcado) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(
        `/almacen-usa/contenedores/${contenedorActivo.id}/items/marcar`,
        {
          facturaId,
          itemIndex,
          marcado
        }
      );

      if (response.data.success) {
        await cargarContenedorActivo(contenedorActivo.id);
        
        setSuccessMessage(marcado ? 'Item marcado' : 'Item desmarcado');
        
        // Actualizar la factura seleccionada
        if (facturaSeleccionada && facturaSeleccionada.id === facturaId) {
          const facturaActualizada = contenedorActivo.facturas.find(
            f => f.id === facturaId
          );
          if (facturaActualizada) {
            setFacturaSeleccionada(facturaActualizada);
          }
        }
      }
    } catch (err) {
      console.error('Error marcando item:', err);
      setError(err.response?.data?.message || 'Error al marcar el item');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // CERRAR CONTENEDOR
  // ========================================
  const handleCerrarContenedor = async (forzar = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(
        `/almacen-usa/contenedores/${contenedorActivo.id}/cerrar`,
        { forzarCierre: forzar }
      );

      if (response.data.success) {
        setSuccessMessage('Contenedor cerrado exitosamente');
        setModalCerrar(false);
        setFacturasIncompletas([]);
        setVistaActual('lista');
        setContenedorActivo(null);
        await cargarContenedores();
      }
    } catch (err) {
      console.error('Error cerrando contenedor:', err);
      
      if (err.response?.data?.requiereConfirmacion) {
        setFacturasIncompletas(err.response.data.facturasIncompletas);
        setModalCerrar(true);
      } else {
        setError(err.response?.data?.message || 'Error al cerrar el contenedor');
      }
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // ELIMINAR CONTENEDOR
  // ========================================
  const handleEliminarContenedor = async (contenedorId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.delete(`/almacen-usa/contenedores/${contenedorId}`);

      if (response.data.success) {
        setSuccessMessage('Contenedor eliminado exitosamente');
        setModalEliminar(null);
        
        if (contenedorActivo?.id === contenedorId) {
          setVistaActual('lista');
          setContenedorActivo(null);
        }
        
        await cargarContenedores();
      }
    } catch (err) {
      console.error('Error eliminando contenedor:', err);
      setError(err.response?.data?.message || 'Error al eliminar el contenedor');
      setModalEliminar(null);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // MARCAR CONTENEDOR COMO TRABAJADO
  // ========================================
  const handleMarcarTrabajado = async (contenedorId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/almacen-usa/contenedores/${contenedorId}/trabajado`);

      if (response.data.success) {
        setSuccessMessage('Contenedor marcado como trabajado');
        setModalMarcarTrabajado(null);
        
        if (contenedorActivo?.id === contenedorId) {
          setVistaActual('lista');
          setContenedorActivo(null);
        }
        
        await cargarContenedores();
      }
    } catch (err) {
      console.error('Error marcando como trabajado:', err);
      setError(err.response?.data?.message || 'Error al marcar como trabajado');
      setModalMarcarTrabajado(null);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // FUNCIONES DE VISTA
  // ========================================
  const abrirContenedor = async (contenedor) => {
    setContenedorActivo(contenedor);
    await cargarContenedorActivo(contenedor.id);
    setVistaActual('trabajar');
  };

  const volverALista = () => {
    setVistaActual('lista');
    setContenedorActivo(null);
    setFacturaSeleccionada(null);
    setBusquedaFactura('');
    setFacturaEncontrada(null);
    cargarContenedores();
  };

  // ========================================
  // LIMPIAR MENSAJES
  // ========================================
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  // ========================================
  // RENDERS
  // ========================================

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Box className="text-indigo-600" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Almacén USA
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Gestión de contenedores y escaneo de items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Búsqueda Global */}
            {vistaActual === 'lista' && (
              <form onSubmit={handleBusquedaGlobal} className="flex gap-2">
                <input
                  type="text"
                  value={busquedaGlobal}
                  onChange={(e) => setBusquedaGlobal(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Buscar factura..."
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  <Search size={20} />
                </button>
              </form>
            )}

            {vistaActual !== 'lista' && (
              <button
                onClick={volverALista}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
              >
                <ArrowLeft size={20} />
                Volver
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check size={20} />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto">
        {/* VISTA: LISTA DE CONTENEDORES */}
        {vistaActual === 'lista' && (
          <div>
            {/* Tabs: Activos / Historial */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setTabActiva('activos')}
                  className={`px-6 py-3 rounded-lg transition font-semibold ${
                    tabActiva === 'activos'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Box size={20} />
                    Activos ({contenedores.filter(c => c.estado !== 'trabajado').length})
                  </div>
                </button>
                <button
                  onClick={() => setTabActiva('historial')}
                  className={`px-6 py-3 rounded-lg transition font-semibold ${
                    tabActiva === 'historial'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <History size={20} />
                    Historial ({contenedores.filter(c => c.estado === 'trabajado').length})
                  </div>
                </button>
              </div>

              {tabActiva === 'activos' && (
                <button
                  onClick={() => setVistaActual('crear')}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus size={20} />
                  Nuevo Contenedor
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="animate-spin text-indigo-600" size={48} />
              </div>
            ) : contenedoresFiltrados.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-12 text-center">
                <Package className="mx-auto text-slate-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  No hay contenedores {tabActiva === 'historial' ? 'en el historial' : ''}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {tabActiva === 'activos' 
                    ? 'Crea tu primer contenedor para empezar a gestionar el inventario'
                    : 'Los contenedores trabajados aparecerán aquí'}
                </p>
                {tabActiva === 'activos' && (
                  <button
                    onClick={() => setVistaActual('crear')}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Crear Contenedor
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contenedoresFiltrados.map(contenedor => (
                  <div
                    key={contenedor.id}
                    className="bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-lg transition p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Box className="text-indigo-600" size={32} />
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            {contenedor.numeroContenedor}
                          </h3>
                          <span className={`text-sm px-2 py-1 rounded ${
                            contenedor.estado === 'abierto' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : contenedor.estado === 'trabajado'
                              ? 'bg-slate-100 text-slate-800'
                              : contenedor.estado === 'recibido_rd'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {contenedor.estado === 'abierto' 
                              ? 'Abierto' 
                              : contenedor.estado === 'trabajado'
                              ? 'Trabajado'
                              : contenedor.estado === 'recibido_rd'
                              ? 'Recibido RD'
                              : contenedor.estado === 'en_transito_rd'
                              ? 'En Tránsito'
                              : 'Cerrado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Total Facturas:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {contenedor.estadisticas?.totalFacturas || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Items:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {contenedor.estadisticas?.itemsMarcados || 0} / {contenedor.estadisticas?.totalItems || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Monto:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ${(contenedor.estadisticas?.montoTotal || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirContenedor(contenedor)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                      >
                        <Eye size={20} />
                        Ver
                      </button>

                      {/* Botón Eliminar - Solo para contenedores abiertos */}
                      {contenedor.estado === 'abierto' && (
                        <button
                          onClick={() => setModalEliminar(contenedor)}
                          className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
                        >
                          <Trash size={20} />
                        </button>
                      )}

                      {/* Botón Marcar Trabajado - Solo para contenedores recibidos en RD */}
                      {contenedor.estado === 'recibido_rd' && (
                        <button
                          onClick={() => setModalMarcarTrabajado(contenedor)}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                        >
                          <CheckCircle size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA: CREAR CONTENEDOR */}
        {vistaActual === 'crear' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">
              Crear Nuevo Contenedor
            </h2>

            <form onSubmit={handleCrearContenedor} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Número de Contenedor *
                </label>
                <input
                  type="text"
                  value={numeroContenedor}
                  onChange={(e) => setNumeroContenedor(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: CNT-001"
                  required
                />
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Ingresa un identificador único para este contenedor
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus size={20} />
                      Crear Contenedor
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={volverALista}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VISTA: TRABAJAR CON CONTENEDOR */}
        {vistaActual === 'trabajar' && contenedorActivo && (
          <div className="space-y-6">
            {/* Info del contenedor */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Box className="text-indigo-600" size={40} />
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {contenedorActivo.numeroContenedor}
                    </h2>
                    <span className={`text-sm px-3 py-1 rounded inline-block mt-1 ${
                      contenedorActivo.estado === 'abierto' 
                        ? 'bg-emerald-100 text-emerald-800'
                        : contenedorActivo.estado === 'trabajado'
                        ? 'bg-slate-100 text-slate-800'
                        : contenedorActivo.estado === 'recibido_rd'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {contenedorActivo.estado === 'abierto' 
                        ? 'Abierto' 
                        : contenedorActivo.estado === 'trabajado'
                        ? 'Trabajado'
                        : contenedorActivo.estado === 'recibido_rd'
                        ? 'Recibido RD'
                        : contenedorActivo.estado === 'en_transito_rd'
                        ? 'En Tránsito'
                        : 'Cerrado'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {contenedorActivo.estadisticas?.totalFacturas || 0}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Facturas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {contenedorActivo.estadisticas?.totalItems || 0}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Items</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {contenedorActivo.estadisticas?.itemsMarcados || 0}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Marcados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-indigo-600">
                      ${(contenedorActivo.estadisticas?.montoTotal || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {contenedorActivo.estado === 'abierto' && (
                    <>
                      <button
                        onClick={() => handleCerrarContenedor(false)}
                        disabled={loading || !contenedorActivo.facturas?.length}
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        <Lock size={20} />
                        Cerrar
                      </button>
                      <button
                        onClick={() => setModalEliminar(contenedorActivo)}
                        disabled={loading}
                        className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        <Trash size={20} />
                        Eliminar
                      </button>
                    </>
                  )}
                  
                  {contenedorActivo.estado === 'recibido_rd' && (
                    <button
                      onClick={() => setModalMarcarTrabajado(contenedorActivo)}
                      disabled={loading}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle size={20} />
                      Marcar Trabajado
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Buscar y Agregar Factura */}
            {contenedorActivo.estado === 'abierto' && !facturaSeleccionada && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Buscar Factura
                </h3>

                <form onSubmit={handleBuscarFactura} className="flex flex-col sm:flex-row gap-3 mb-4">
                  <input
                    type="text"
                    value={busquedaFactura}
                    onChange={(e) => setBusquedaFactura(e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Código de tracking (Ej: RC-20250130-0001)"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader className="animate-spin" size={20} />
                    ) : (
                      <Search size={20} />
                    )}
                    Buscar
                  </button>
                </form>

                {facturaEncontrada && (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {facturaEncontrada.codigoTracking}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {facturaEncontrada.destinatario?.nombre || 'Destinatario'}
                        </p>
                      </div>
                      <span className="text-sm font-medium px-2 py-1 bg-indigo-100 text-indigo-800 rounded">
                        {facturaEncontrada.items?.length || 0} items
                      </span>
                    </div>

                    <button
                      onClick={handleAgregarFactura}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Plus size={20} />
                      Agregar al Contenedor
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Lista de facturas en el contenedor */}
            {!facturaSeleccionada && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Facturas en el Contenedor ({contenedorActivo.facturas?.length || 0})
                </h3>

                {contenedorActivo.facturas && contenedorActivo.facturas.length > 0 ? (
                  <div className="space-y-3">
                    {contenedorActivo.facturas.map(factura => (
                      <div
                        key={factura.id}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 dark:text-white">
                              {factura.codigoTracking}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Items: {factura.itemsMarcados || 0} / {factura.itemsTotal || 0}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <span className={`px-3 py-1 rounded text-sm font-medium flex-1 sm:flex-none text-center ${
                              factura.estadoItems === 'completo'
                                ? 'bg-emerald-100 text-emerald-800'
                                : factura.estadoItems === 'incompleto'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {factura.estadoItems === 'completo' ? 'Completa' : 
                               factura.estadoItems === 'incompleto' ? 'Incompleta' : 
                               'Pendiente'}
                            </span>

                            <button
                              onClick={() => setFacturaSeleccionada(factura)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                            >
                              <Eye size={18} />
                              Ver
                            </button>

                            {contenedorActivo.estado === 'abierto' && (
                              <button
                                onClick={() => setModalQuitarFactura(factura)}
                                className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition flex items-center gap-2"
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Package className="mx-auto mb-3 text-slate-400" size={48} />
                    <p>No hay facturas en este contenedor</p>
                    <p className="text-sm mt-1">Usa el buscador para agregar facturas</p>
                  </div>
                )}
              </div>
            )}

            {/* Vista de items de la factura seleccionada */}
            {facturaSeleccionada && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Items de {facturaSeleccionada.codigoTracking}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {contenedorActivo.estado === 'abierto' 
                        ? 'Marca cada item escaneado' 
                        : 'Vista de solo lectura'}
                    </p>
                  </div>

                  <button
                    onClick={() => setFacturaSeleccionada(null)}
                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-2"
                  >
                    <ArrowLeft size={20} />
                    Volver
                  </button>
                </div>

                <div className="space-y-3">
                  {facturaSeleccionada.items && facturaSeleccionada.items.length > 0 ? (
                    facturaSeleccionada.items.map((item, index) => {
                      const estaEscaneado = item.marcado;

                      return (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 transition ${
                            estaEscaneado
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                  #{index + 1}
                                </span>
                                <h4 className="font-semibold text-slate-900 dark:text-white">
                                  {item.descripcion || item.producto || 'Sin descripción'}
                                </h4>
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-400">
                                <span>Cantidad: {item.cantidad}</span>
                                <span>•</span>
                                <span>${item.precio}</span>
                              </div>
                            </div>

                            {contenedorActivo.estado === 'abierto' ? (
                              <button
                                onClick={() => handleMarcarItem(facturaSeleccionada.id, index, !estaEscaneado)}
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 disabled:opacity-50 whitespace-nowrap ${
                                  estaEscaneado
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {estaEscaneado ? (
                                  <>
                                    <Check size={18} />
                                    Marcado
                                  </>
                                ) : (
                                  <>
                                    <Search size={18} />
                                    Marcar
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                estaEscaneado
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                {estaEscaneado ? 'Marcado' : 'Sin marcar'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No hay items en esta factura
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmación para cerrar con incompletas */}
      {modalCerrar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-amber-600" size={32} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Facturas Incompletas
              </h3>
            </div>

            <p className="text-slate-700 dark:text-slate-300 mb-2">
              Hay <strong>{facturasIncompletas.length}</strong> factura(s) con items sin marcar:
            </p>

            <ul className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {facturasIncompletas.map((f) => (
                <li key={f.id} className="text-sm bg-slate-50 dark:bg-slate-700 p-2 rounded">
                  <span className="font-medium">{f.codigoTracking}</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {' '}• {f.itemsMarcados}/{f.itemsTotal} marcados
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Si cierras el contenedor ahora, estas facturas quedarán marcadas como <strong>INCOMPLETAS</strong>.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleCerrarContenedor(true)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
              >
                {loading ? 'Cerrando...' : 'Cerrar de Todas Formas'}
              </button>
              <button
                onClick={() => {
                  setModalCerrar(false);
                  setFacturasIncompletas([]);
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar contenedor */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-rose-600" size={32} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Eliminar Contenedor
              </h3>
            </div>

            <p className="text-slate-700 dark:text-slate-300 mb-2">
              ¿Estás seguro de que deseas eliminar el contenedor <strong>{modalEliminar.numeroContenedor}</strong>?
            </p>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {modalEliminar.estadisticas?.totalFacturas > 0 ? (
                <>
                  Este contenedor tiene <strong>{modalEliminar.estadisticas.totalFacturas}</strong> factura(s). 
                  Las facturas volverán a estar disponibles.
                </>
              ) : (
                <>Esta acción no se puede deshacer.</>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleEliminarContenedor(modalEliminar.id)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para quitar factura */}
      {modalQuitarFactura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-amber-600" size={32} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Quitar Factura
              </h3>
            </div>

            <p className="text-slate-700 dark:text-slate-300 mb-2">
              ¿Estás seguro de que deseas quitar la factura <strong>{modalQuitarFactura.codigoTracking}</strong> del contenedor?
            </p>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              La factura volverá a estar disponible y podrá ser agregada a otro contenedor.
              {modalQuitarFactura.itemsMarcados > 0 && (
                <> Los {modalQuitarFactura.itemsMarcados} item(s) marcados se resetearán.</>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleQuitarFactura(modalQuitarFactura.id)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition disabled:opacity-50"
              >
                {loading ? 'Quitando...' : 'Quitar Factura'}
              </button>
              <button
                onClick={() => setModalQuitarFactura(null)}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para marcar como trabajado */}
      {modalMarcarTrabajado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="text-emerald-600" size={32} />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Marcar como Trabajado
              </h3>
            </div>

            <p className="text-slate-700 dark:text-slate-300 mb-2">
              ¿Estás seguro de que deseas marcar el contenedor <strong>{modalMarcarTrabajado.numeroContenedor}</strong> como trabajado?
            </p>

            <p className="text-slate-600 dark:text-slate-400 mb-6">
              El contenedor se moverá al <strong>HISTORIAL</strong> y ya no aparecerá en la lista de activos.
              Esta acción indica que todas las facturas han sido procesadas correctamente.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleMarcarTrabajado(modalMarcarTrabajado.id)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Marcar Trabajado'}
              </button>
              <button
                onClick={() => setModalMarcarTrabajado(null)}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de búsqueda global */}
      {modalBusquedaGlobal && resultadoGlobal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Resultado de Búsqueda
              </h3>
              <button
                onClick={() => {
                  setModalBusquedaGlobal(false);
                  setResultadoGlobal(null);
                  setBusquedaGlobal('');
                }}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white">
                    {resultadoGlobal.codigoTracking}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Cliente: {resultadoGlobal.destinatario?.nombre || 'N/A'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  resultadoGlobal.estado === 'pendiente'
                    ? 'bg-emerald-100 text-emerald-800'
                    : resultadoGlobal.estado === 'en_contenedor'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {resultadoGlobal.estado?.toUpperCase().replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Total Items:</span>
                  <span className="ml-2 font-semibold text-slate-900 dark:text-white">
                    {resultadoGlobal.items?.length || 0}
                  </span>
                </div>
                {resultadoGlobal.contenedorId && (
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Contenedor:</span>
                    <span className="ml-2 font-semibold text-indigo-600">
                      {contenedores.find(c => c.id === resultadoGlobal.contenedorId)?.numeroContenedor || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {resultadoGlobal.estado === 'pendiente' && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-4">
                <p className="text-emerald-800 dark:text-emerald-200 text-sm">
                  ✓ Esta factura está disponible para ser agregada a un contenedor
                </p>
              </div>
            )}

            {resultadoGlobal.estado === 'en_contenedor' && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
                <p className="text-indigo-800 dark:text-indigo-200 text-sm">
                  ℹ Esta factura ya está en un contenedor
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalBusquedaGlobal(false);
                  setResultadoGlobal(null);
                  setBusquedaGlobal('');
                }}
                className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAlmacenUSA;