// admin_web/src/pages/PanelAlmacenRD.jsx
/**
 * PANEL DE ALMACÉN RD - VERSIÓN CORREGIDA COMPLETA
 * ✅ Todas las llamadas usan /almacen-rd/ correctamente
 * ✅ Usa response.data.data.contenedor después de confirmarRecepcion
 * ✅ Normaliza acceso a campos de facturas
 * ✅✅✅ CORREGIDO: Ahora muestra el estado correcto usando estadoItems ✅✅✅
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Package, Truck, CheckCircle, AlertTriangle, Eye, ArrowLeft, Loader, MapPin,
  FileText, Settings, X, Edit, Box, User, Phone, Mail, DollarSign, Calendar,
  CreditCard, Clock, Printer
} from 'lucide-react';

const PanelAlmacenRD = () => {
  const navigate = useNavigate();

  // Estados principales
  const [contenedores, setContenedores] = useState([]);
  const [contenedorActivo, setContenedorActivo] = useState(null);
  const [tabActiva, setTabActiva] = useState('en_transito');
  const [vistaActual, setVistaActual] = useState('lista');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);

  // Contadores separados para cada tab
  const [contadorEnTransito, setContadorEnTransito] = useState(0);
  const [contadorRecibidos, setContadorRecibidos] = useState(0);

  // Estados de modales
  const [modalConfirmarRecepcion, setModalConfirmarRecepcion] = useState(false);
  const [modalMarcarDanado, setModalMarcarDanado] = useState(null);
  const [modalAsignarRuta, setModalAsignarRuta] = useState(null);
  const [modalReasignarRuta, setModalReasignarRuta] = useState(null);
  const [modalQuitarRuta, setModalQuitarRuta] = useState(null);
  const [modalReportarIncompleta, setModalReportarIncompleta] = useState(null);
  const [modalDetalleFull, setModalDetalleFull] = useState(false);
  const [modalEditarPago, setModalEditarPago] = useState(false);

  // Estados de formularios
  const [notasRecepcion, setNotasRecepcion] = useState('');
  const [notasDano, setNotasDano] = useState('');
  const [rutaSeleccionada, setRutaSeleccionada] = useState('');
  const [motivoReasignacion, setMotivoReasignacion] = useState('');
  const [motivoQuitar, setMotivoQuitar] = useState('');
  const [motivoIncompleta, setMotivoIncompleta] = useState('');
  const [itemsFaltantes, setItemsFaltantes] = useState('');
  const [infoPago, setInfoPago] = useState({
    metodoPago: '', montoPago: '', estadoPago: 'pendiente',
    referenciaPago: '', notasPago: ''
  });

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const RUTAS_DISPONIBLES = [
    { value: 'Capital', label: '🏙️ Capital (Santo Domingo)', color: 'blue' },
    { value: 'Sur', label: '🌊 Sur', color: 'green' },
    { value: 'Cibao', label: '⛰️ Cibao (Santiago)', color: 'purple' },
    { value: 'Este', label: '🏖️ Este (Punta Cana)', color: 'yellow' },
    { value: 'Local', label: '🏘️ Local (Baní)', color: 'orange' }
  ];

  useEffect(() => { cargarContenedores(); }, [tabActiva]);

  const cargarContenedores = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar contenedores de la tab activa
      const endpoint = tabActiva === 'en_transito'
        ? '/almacen-rd/contenedores/en-transito'
        : '/almacen-rd/contenedores/recibidos';
      const response = await api.get(endpoint);
      if (response.data.success) {
        setContenedores(response.data.data);
      }

      // Cargar contadores de ambas tabs en paralelo
      const [transitoRes, recibidosRes] = await Promise.all([
        api.get('/almacen-rd/contenedores/en-transito'),
        api.get('/almacen-rd/contenedores/recibidos')
      ]);

      if (transitoRes.data.success) {
        setContadorEnTransito(transitoRes.data.data.length);
      }
      if (recibidosRes.data.success) {
        setContadorRecibidos(recibidosRes.data.data.length);
      }
    } catch (err) {
      setError('Error al cargar los contenedores');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarRecepcion = async () => {
    if (!contenedorActivo) return;
    try {
      setLoading(true);
      setError(null);

      console.log('📦 Confirmando recepción del contenedor:', contenedorActivo.id);

      const response = await api.post(
        `/almacen-rd/contenedores/${contenedorActivo.id}/confirmar-recepcion`,
        { notas: notasRecepcion }
      );

      if (response.data.success) {
        setSuccessMessage('Contenedor recibido exitosamente en RD');
        setModalConfirmarRecepcion(false);
        setNotasRecepcion('');

        if (response.data?.data?.contenedor) {
          console.log('✅ Usando contenedor del response');
          setContenedorActivo(response.data.data.contenedor);
        } else {
          console.log('⚠️ Fallback: Consultando endpoint');
          const contenedorResponse = await api.get(`/almacen-rd/contenedores/${contenedorActivo.id}`);
          setContenedorActivo(contenedorResponse.data.data);
        }

        await cargarContenedores();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al confirmar recepción');
      console.error('Error confirmando recepción:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarDanado = async (itemId, danado) => {
    if (!contenedorActivo || !facturaSeleccionada) return;
    try {
      setLoading(true);

      const facturaId = facturaSeleccionada.id || facturaSeleccionada.facturaId;

      const response = await api.post(
        `/almacen-rd/facturas/${facturaId}/items/danado`,
        { itemIndex: itemId, danado, notasDano }
      );

      if (response.data.success) {
        setSuccessMessage(danado ? 'Item marcado como dañado' : 'Item marcado como normal');
        setModalMarcarDanado(null);
        setNotasDano('');

        if (response.data?.data?.contenedor) {
          setContenedorActivo(response.data.data.contenedor);
        } else {
          const contenedorResponse = await api.get(`/almacen-rd/contenedores/${contenedorActivo.id}`);
          setContenedorActivo(contenedorResponse.data.data);
        }

        const facturaActualizada = contenedorActivo.facturas?.find(
          f => (f.id || f.facturaId) === facturaId
        );
        if (facturaActualizada) setFacturaSeleccionada(facturaActualizada);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al marcar item');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarRuta = async () => {
    if (!contenedorActivo || !modalAsignarRuta || !rutaSeleccionada) return;
    try {
      setLoading(true);

      const facturaId = modalAsignarRuta.id || modalAsignarRuta.facturaId;

      const response = await api.post(
        `/almacen-rd/facturas/${facturaId}/asignar-ruta`,
        { ruta: rutaSeleccionada }
      );

      if (response.data.success) {
        setSuccessMessage(`Factura asignada a ruta ${rutaSeleccionada}`);
        setModalAsignarRuta(null);
        setRutaSeleccionada('');

        if (response.data?.data?.contenedor) {
          setContenedorActivo(response.data.data.contenedor);
        } else {
          const contenedorResponse = await api.get(`/almacen-rd/contenedores/${contenedorActivo.id}`);
          setContenedorActivo(contenedorResponse.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al asignar ruta');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReasignarRuta = async () => {
    if (!modalReasignarRuta || !rutaSeleccionada) return;
    try {
      setLoading(true);

      const facturaId = modalReasignarRuta.id || modalReasignarRuta.facturaId;

      const response = await api.put(
        `/almacen-rd/facturas/${facturaId}/reasignar-ruta`,
        { nuevaRuta: rutaSeleccionada, motivo: motivoReasignacion }
      );

      if (response.data.success) {
        setSuccessMessage(`Factura reasignada a ${rutaSeleccionada}`);
        setModalReasignarRuta(null);
        setRutaSeleccionada('');
        setMotivoReasignacion('');

        if (response.data?.data?.contenedor) {
          setContenedorActivo(response.data.data.contenedor);
        } else {
          const contenedorResponse = await api.get(`/almacen-rd/contenedores/${contenedorActivo.id}`);
          setContenedorActivo(contenedorResponse.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al reasignar factura');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuitarDeRuta = async () => {
    if (!modalQuitarRuta) return;
    try {
      setLoading(true);

      const facturaId = modalQuitarRuta.id || modalQuitarRuta.facturaId;

      const response = await api.delete(
        `/almacen-rd/facturas/${facturaId}/ruta`,
        { data: { motivo: motivoQuitar } }
      );

      if (response.data.success) {
        setSuccessMessage('Factura quitada de la ruta');
        setModalQuitarRuta(null);
        setMotivoQuitar('');

        if (response.data?.data?.contenedor) {
          setContenedorActivo(response.data.data.contenedor);
        } else {
          const contenedorResponse = await api.get(`/almacen-rd/contenedores/${contenedorActivo.id}`);
          setContenedorActivo(contenedorResponse.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al quitar de ruta');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportarIncompleta = async () => {
    if (!contenedorActivo || !modalReportarIncompleta) return;
    try {
      setLoading(true);

      const facturaId = modalReportarIncompleta.id || modalReportarIncompleta.facturaId;

      const response = await api.post(
        `/almacen-rd/facturas/${facturaId}/reportar-incompleta`,
        {
          motivo: motivoIncompleta,
          itemsFaltantes: itemsFaltantes.split(',').map(i => i.trim()).filter(i => i)
        }
      );

      if (response.data.success) {
        setSuccessMessage('Factura reportada como incompleta');
        setModalReportarIncompleta(null);
        setMotivoIncompleta('');
        setItemsFaltantes('');

        if (response.data?.data?.contenedor) {
          setContenedorActivo(response.data.data.contenedor);
        } else {
          const contenedorResponse = await api.get(`/almacen-rd/contenedores/${contenedorActivo.id}`);
          setContenedorActivo(contenedorResponse.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al reportar factura');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalleFull = async (facturaId) => {
    try {
      setLoading(true);
      const response = await api.get(`/almacen-rd/facturas/${facturaId}/detalle`);
      if (response.data.success) {
        setFacturaSeleccionada(response.data.data);
        setModalDetalleFull(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar el detalle');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirEditarPago = (factura) => {
    setFacturaSeleccionada(factura);
    setInfoPago({
      metodoPago: factura.pago?.metodoPago || '',
      montoPago: factura.pago?.montoPagado || '',
      estadoPago: factura.pago?.estado || 'pendiente',
      referenciaPago: factura.pago?.referenciaPago || '',
      notasPago: factura.pago?.notasPago || ''
    });
    setModalEditarPago(true);
  };

  const handleGuardarInfoPago = async () => {
    try {
      setLoading(true);

      const facturaId = facturaSeleccionada.id || facturaSeleccionada.facturaId;

      const response = await api.put(
        `/almacen-rd/facturas/${facturaId}/pago`,
        {
          estado: infoPago.estadoPago,
          metodoPago: infoPago.metodoPago,
          montoPagado: parseFloat(infoPago.montoPago) || 0,
          referenciaPago: infoPago.referenciaPago,
          notasPago: infoPago.notasPago
        }
      );

      if (response.data.success) {
        setSuccessMessage('Información de pago actualizada');
        setModalEditarPago(false);

        if (modalDetalleFull) {
          await handleVerDetalleFull(facturaId);
        }

        if (contenedorActivo) {
          const contenedorResponse = await api.get(`/almacen-rd/contenedores/${contenedorActivo.id}`);
          setContenedorActivo(contenedorResponse.data.data);
        }

        await cargarContenedores();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el pago');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirContenedor = (contenedor) => {
    setContenedorActivo(contenedor);
    setVistaActual('detalle');
    setFacturaSeleccionada(null);
  };

  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  const EstadoPagoBadge = ({ estado }) => {
    const colores = {
      pendiente: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      pagada: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      contraentrega: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };
    const textos = {
      pendiente: 'Pendiente', parcial: 'Pago Parcial',
      pagada: 'Pagada', contraentrega: 'Contra Entrega'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colores[estado] || colores.pendiente}`}>
        {textos[estado] || estado}
      </span>
    );
  };

  const getFacturaId = (factura) => {
    return factura?.id || factura?.facturaId || factura?.recoleccionId || null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="text-blue-600" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Almacén RD</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestión de contenedores recibidos en República Dominicana
              </p>
            </div>
          </div>
          {vistaActual === 'detalle' && (
            <button
              onClick={() => {
                setVistaActual('lista');
                setContenedorActivo(null);
                setFacturaSeleccionada(null);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              <ArrowLeft size={20} />
              Volver
            </button>
          )}
        </div>
      </div>

      {/* Mensajes de Error/Éxito */}
      {error && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto mb-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto">
        {vistaActual === 'lista' && (
          <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTabActiva('en_transito')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition font-semibold ${tabActiva === 'en_transito'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
              >
                <Truck size={20} />
                En Tránsito ({contadorEnTransito})
              </button>
              <button
                onClick={() => setTabActiva('recibidos')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition font-semibold ${tabActiva === 'recibidos'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
              >
                <CheckCircle size={20} />
                Recibidos ({contadorRecibidos})
              </button>
            </div>

            {/* Lista de Contenedores */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader className="animate-spin text-blue-600" size={48} />
              </div>
            ) : contenedores.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <Package className="mx-auto text-gray-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No hay contenedores {tabActiva === 'recibidos' ? 'recibidos' : 'en tránsito'}
                </h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contenedores.map(contenedor => (
                  <div key={contenedor.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Box className="text-blue-600" size={32} />
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                            {contenedor.numeroContenedor}
                          </h3>
                          <span className={`text-sm px-2 py-1 rounded ${contenedor.estado === 'en_transito_rd'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                            }`}>
                            {contenedor.estado === 'en_transito_rd' ? 'En Tránsito' : 'Recibido'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Facturas:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {contenedor.estadisticas?.totalFacturas || contenedor.facturas?.length || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Completas:</span>
                        <span className="font-semibold text-green-600">
                          {contenedor.estadoFacturas?.completas || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirContenedor(contenedor)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        <Eye size={20} />
                        Ver Detalles
                      </button>
                      {contenedor.estado === 'en_transito_rd' && (
                        <button
                          onClick={() => {
                            setContenedorActivo(contenedor);
                            setModalConfirmarRecepcion(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          <CheckCircle size={20} />
                          Confirmar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vistaActual === 'detalle' && contenedorActivo && (
          <div className="space-y-6">
            {/* Info del Contenedor */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <Box className="text-blue-600" size={40} />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {contenedorActivo.numeroContenedor}
                    </h2>
                    <span className={`text-sm px-3 py-1 rounded inline-block mt-1 ${contenedorActivo.estado === 'en_transito_rd'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                      }`}>
                      {contenedorActivo.estado === 'en_transito_rd' ? 'En Tránsito' : 'Recibido en RD'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {contenedorActivo.estadisticas?.totalFacturas || contenedorActivo.facturas?.length || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Facturas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {contenedorActivo.estadoFacturas?.completas || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Completas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {contenedorActivo.estadoFacturas?.incompletas || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Incompletas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {contenedorActivo.estadisticas?.totalItems || 0}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Items</div>
                  </div>
                </div>
                {contenedorActivo.estado === 'en_transito_rd' && (
                  <button
                    onClick={() => setModalConfirmarRecepcion(true)}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <CheckCircle size={20} />
                    Confirmar Recepción
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Facturas */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Facturas del Contenedor ({contenedorActivo.facturas?.length || 0})
              </h3>
              {contenedorActivo.facturas && contenedorActivo.facturas.length > 0 ? (
                <div className="space-y-3">
                  {contenedorActivo.facturas.map(factura => {
                    const facturaId = getFacturaId(factura);

                    // ✅✅✅ CORRECCIÓN PRINCIPAL: Usar estadoItems primero ✅✅✅
                    const estadoFactura = factura.estadoItems || factura.estadoFactura || factura.estado || 'pendiente';
                    const esCompleta = estadoFactura === 'completo' || estadoFactura === 'completa';

                    return (
                      <div key={facturaId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {factura.numeroFactura || factura.codigoTracking}
                              </h4>

                              {/* ✅✅✅ BADGE DE ESTADO CORREGIDO ✅✅✅ */}
                              <span className={`px-2 py-1 rounded text-xs font-medium ${esCompleta
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                                }`}>
                                {esCompleta ? '✅ Completa' : '⚠️ Incompleta'}
                              </span>

                              {/* ✅ CONTADOR DE ITEMS */}
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                                📦 {factura.itemsMarcados || 0}/{factura.itemsTotal || factura.items?.length || 0}
                              </span>

                              {factura.rutaAsignada && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium flex items-center gap-1">
                                  <MapPin size={14} />
                                  {factura.rutaAsignada}
                                </span>
                              )}
                              <EstadoPagoBadge estado={factura.pago?.estado || 'pendiente'} />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleVerDetalleFull(facturaId)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm flex items-center gap-1"
                            >
                              <Eye size={16} />
                              Detalle
                            </button>
                            <button
                              onClick={() => setFacturaSeleccionada(factura)}
                              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition text-sm flex items-center gap-1"
                            >
                              <Package size={16} />
                              Items
                            </button>
                            <button
                              onClick={() => handleAbrirEditarPago(factura)}
                              disabled={factura.pago?.estado === 'pagada'}
                              className={`px-3 py-1 rounded transition text-sm flex items-center gap-1 ${
                                factura.pago?.estado === 'pagada'
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                              title={factura.pago?.estado === 'pagada' ? 'Factura ya pagada' : 'Editar pago'}
                            >
                              <CreditCard size={16} />
                              {factura.pago?.estado === 'pagada' ? 'Pagado' : 'Pago'}
                            </button>
                            {contenedorActivo.estado === 'recibido_rd' && esCompleta && (
                              <>
                                {!factura.rutaAsignada ? (
                                  <button
                                    onClick={() => setModalAsignarRuta(factura)}
                                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition text-sm flex items-center gap-1"
                                  >
                                    <MapPin size={16} />
                                    Asignar
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => window.open(`/rutas/${factura.rutaAsignada}/imprimir`, '_blank')}
                                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm flex items-center gap-1"
                                      title="Imprimir Ruta"
                                    >
                                      <Printer size={16} />
                                      Imprimir
                                    </button>
                                    <button
                                      onClick={() => setModalReasignarRuta(factura)}
                                      className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm flex items-center gap-1"
                                    >
                                      <Edit size={16} />
                                      Reasignar
                                    </button>
                                    <button
                                      onClick={() => setModalQuitarRuta(factura)}
                                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm flex items-center gap-1"
                                    >
                                      <X size={16} />
                                      Quitar
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => setModalReportarIncompleta(factura)}
                                  className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition text-sm flex items-center gap-1"
                                >
                                  <AlertTriangle size={16} />
                                  Reportar
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No hay facturas en este contenedor
                </div>
              )}
            </div>

            {/* Vista de Items de Factura Seleccionada */}
            {facturaSeleccionada && !modalDetalleFull && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Items de {facturaSeleccionada.numeroFactura || facturaSeleccionada.codigoTracking}
                  </h3>
                  <button
                    onClick={() => setFacturaSeleccionada(null)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="space-y-3">
                  {facturaSeleccionada.items && facturaSeleccionada.items.length > 0 ? (
                    facturaSeleccionada.items.map((item, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${item.danado
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {item.descripcion}
                              </h4>
                              {item.danado && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                  ⚠️ DAÑADO
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <span>Cantidad: {item.cantidad}</span>
                              {item.notasDano && (
                                <p className="mt-1 text-red-600 dark:text-red-400">
                                  📝 {item.notasDano}
                                </p>
                              )}
                            </div>
                          </div>
                          {contenedorActivo.estado === 'recibido_rd' && (
                            <button
                              onClick={() => setModalMarcarDanado({ item, itemIndex: index, danado: !item.danado })}
                              className={`px-3 py-1 rounded transition text-sm ${item.danado
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            >
                              {item.danado ? '✓ Marcar Normal' : '⚠️ Marcar Dañado'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No hay items en esta factura
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================
          MODALES
          ======================================== */}

      {/* Modal Confirmar Recepción */}
      {modalConfirmarRecepcion && contenedorActivo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="text-green-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Confirmar Recepción
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Confirma que has recibido el contenedor <strong>{contenedorActivo.numeroContenedor}</strong> en el almacén de República Dominicana.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notasRecepcion}
                onChange={(e) => setNotasRecepcion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                rows="3"
                placeholder="Observaciones sobre la recepción..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalConfirmarRecepcion(false);
                  setNotasRecepcion('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarRecepcion}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Confirmando...' : 'Confirmar Recepción'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Marcar Dañado */}
      {modalMarcarDanado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-orange-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {modalMarcarDanado.danado ? 'Marcar Item como Dañado' : 'Marcar Item como Normal'}
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Item: <strong>{modalMarcarDanado.item.descripcion}</strong>
            </p>
            {modalMarcarDanado.danado && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción del daño *
                </label>
                <textarea
                  value={notasDano}
                  onChange={(e) => setNotasDano(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  rows="3"
                  placeholder="Describe el daño encontrado..."
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalMarcarDanado(null);
                  setNotasDano('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleMarcarDanado(modalMarcarDanado.itemIndex, modalMarcarDanado.danado)}
                disabled={loading || (modalMarcarDanado.danado && !notasDano)}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${modalMarcarDanado.danado
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {loading ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Ruta */}
      {modalAsignarRuta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="text-green-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Asignar a Ruta
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Factura: <strong>{modalAsignarRuta.numeroFactura || modalAsignarRuta.codigoTracking}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Seleccionar Ruta *
              </label>
              <select
                value={rutaSeleccionada}
                onChange={(e) => setRutaSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              >
                <option value="">-- Seleccionar --</option>
                {RUTAS_DISPONIBLES.map(ruta => (
                  <option key={ruta.value} value={ruta.value}>
                    {ruta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalAsignarRuta(null);
                  setRutaSeleccionada('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarRuta}
                disabled={loading || !rutaSeleccionada}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Asignando...' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reasignar Ruta */}
      {modalReasignarRuta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <Edit className="text-yellow-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Reasignar Ruta
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Factura: <strong>{modalReasignarRuta.numeroFactura || modalReasignarRuta.codigoTracking}</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ruta actual: <strong>{modalReasignarRuta.rutaAsignada}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nueva Ruta *
              </label>
              <select
                value={rutaSeleccionada}
                onChange={(e) => setRutaSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              >
                <option value="">-- Seleccionar --</option>
                {RUTAS_DISPONIBLES.filter(r => r.value !== modalReasignarRuta.rutaAsignada).map(ruta => (
                  <option key={ruta.value} value={ruta.value}>
                    {ruta.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoReasignacion}
                onChange={(e) => setMotivoReasignacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                rows="2"
                placeholder="Razón de la reasignación..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalReasignarRuta(null);
                  setRutaSeleccionada('');
                  setMotivoReasignacion('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReasignarRuta}
                disabled={loading || !rutaSeleccionada}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Reasignando...' : 'Reasignar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quitar de Ruta */}
      {modalQuitarRuta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <X className="text-red-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Quitar de Ruta
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              ¿Deseas quitar la factura <strong>{modalQuitarRuta.numeroFactura || modalQuitarRuta.codigoTracking}</strong> de su ruta actual?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Ruta actual: <strong>{modalQuitarRuta.rutaAsignada}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoQuitar}
                onChange={(e) => setMotivoQuitar(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                rows="2"
                placeholder="Razón para quitar de la ruta..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalQuitarRuta(null);
                  setMotivoQuitar('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuitarDeRuta}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Quitando...' : 'Quitar de Ruta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reportar Incompleta */}
      {modalReportarIncompleta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-orange-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Reportar Factura Incompleta
              </h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Factura: <strong>{modalReportarIncompleta.numeroFactura || modalReportarIncompleta.codigoTracking}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Motivo *
              </label>
              <textarea
                value={motivoIncompleta}
                onChange={(e) => setMotivoIncompleta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                rows="3"
                placeholder="Describe por qué la factura está incompleta..."
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Items Faltantes (separados por coma)
              </label>
              <input
                type="text"
                value={itemsFaltantes}
                onChange={(e) => setItemsFaltantes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                placeholder="Ej: Caja 1, TV Samsung, etc."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalReportarIncompleta(null);
                  setMotivoIncompleta('');
                  setItemsFaltantes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportarIncompleta}
                disabled={loading || !motivoIncompleta}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Reportando...' : 'Reportar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Completo */}
      {modalDetalleFull && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Detalle de Factura
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {facturaSeleccionada.codigoTracking}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalDetalleFull(false);
                  setFacturaSeleccionada(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Remitente */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User size={18} />
                    Remitente
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Nombre:</strong> {facturaSeleccionada.remitente?.nombre || 'N/A'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Phone size={14} />
                      {facturaSeleccionada.remitente?.telefono || 'N/A'}
                    </p>
                    {facturaSeleccionada.remitente?.email && (
                      <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Mail size={14} />
                        {facturaSeleccionada.remitente.email}
                      </p>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <MapPin size={14} className="mt-1 flex-shrink-0" />
                      {facturaSeleccionada.remitente?.direccion || 'N/A'}
                    </p>
                  </div>
                </div>
                {/* Destinatario */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User size={18} />
                    Destinatario
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Nombre:</strong> {facturaSeleccionada.destinatario?.nombre || 'N/A'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Phone size={14} />
                      {facturaSeleccionada.destinatario?.telefono || 'N/A'}
                    </p>
                    {facturaSeleccionada.destinatario?.email && (
                      <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Mail size={14} />
                        {facturaSeleccionada.destinatario.email}
                      </p>
                    )}
                    <p className="text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <MapPin size={14} className="mt-1 flex-shrink-0" />
                      {facturaSeleccionada.destinatario?.direccion || 'N/A'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Zona:</strong> {facturaSeleccionada.destinatario?.zona || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              {/* Items */}
              <div className="mt-6">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Items ({facturaSeleccionada.items?.length || 0})
                </h4>
                <div className="space-y-2">
                  {facturaSeleccionada.items && facturaSeleccionada.items.length > 0 ? (
                    facturaSeleccionada.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.descripcion}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Cantidad: {item.cantidad}
                          </p>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">
                          ${item.precio}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                      No hay items
                    </p>
                  )}
                </div>
              </div>
              {/* Facturación */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <DollarSign size={18} />
                  Facturación
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Subtotal:</span>
                    <span>${(facturaSeleccionada.facturacion?.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>ITBIS (18%):</span>
                    <span>${(facturaSeleccionada.facturacion?.itbis || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2">
                    <span>Total:</span>
                    <span>${(facturaSeleccionada.facturacion?.total || 0).toFixed(2)} {facturaSeleccionada.facturacion?.moneda || 'USD'}</span>
                  </div>
                </div>
              </div>
              {/* Información de Pago */}
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <CreditCard size={18} />
                    Información de Pago
                  </h4>
                  {facturaSeleccionada.pago?.estado !== 'pagada' && (
                    <button
                      onClick={() => handleAbrirEditarPago(facturaSeleccionada)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
                    >
                      <Edit size={14} />
                      Editar
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 dark:text-gray-300">Estado:</span>
                    <EstadoPagoBadge estado={facturaSeleccionada.pago?.estado || 'pendiente'} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Método de Pago:</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {facturaSeleccionada.pago?.metodoPago || 'No especificado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Referencia:</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {facturaSeleccionada.pago?.referenciaPago || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Monto Pagado:</p>
                      <p className="font-medium text-green-600 dark:text-green-400">
                        ${(facturaSeleccionada.pago?.montoPagado || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Monto Pendiente:</p>
                      <p className="font-medium text-red-600 dark:text-red-400">
                        ${(facturaSeleccionada.pago?.montoPendiente || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  {facturaSeleccionada.pago?.notasPago && (
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Notas:</strong> {facturaSeleccionada.pago.notasPago}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setModalDetalleFull(false);
                  setFacturaSeleccionada(null);
                }}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Pago */}
      {modalEditarPago && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Editar Información de Pago
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {facturaSeleccionada.codigoTracking || facturaSeleccionada.numeroFactura}
                </p>
              </div>
              <button
                onClick={() => {
                  setModalEditarPago(false);
                  setInfoPago({
                    metodoPago: '', montoPago: '', estadoPago: 'pendiente',
                    referenciaPago: '', notasPago: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total de la Factura</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${(facturaSeleccionada.facturacion?.total || 0).toFixed(2)}
                </p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado de Pago *
                  </label>
                  <select
                    value={infoPago.estadoPago}
                    onChange={(e) => setInfoPago({ ...infoPago, estadoPago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  >
                    <option value="pendiente">💵 Pago al recibir</option>
                    <option value="parcial">📊 Pago Parcial</option>
                    <option value="pagada">✅ Ya pagado</option>
                    <option value="contraentrega">🚚 Contra Entrega</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monto Pagado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={infoPago.montoPago}
                    onChange={(e) => setInfoPago({ ...infoPago, montoPago: e.target.value })}
                    className={`w-full px-3 py-2 border dark:bg-gray-700 dark:text-white rounded-lg ${!infoPago.montoPago || infoPago.montoPago === ''
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                      }`}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Método de Pago
                  </label>
                  <select
                    value={infoPago.metodoPago}
                    onChange={(e) => setInfoPago({ ...infoPago, metodoPago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Referencia/Número de Transacción
                  </label>
                  <input
                    type="text"
                    value={infoPago.referenciaPago}
                    onChange={(e) => setInfoPago({ ...infoPago, referenciaPago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    placeholder="Ej: TRF-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={infoPago.notasPago}
                    onChange={(e) => setInfoPago({ ...infoPago, notasPago: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    rows="3"
                    placeholder="Notas adicionales sobre el pago..."
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setModalEditarPago(false);
                  setInfoPago({
                    metodoPago: '', montoPago: '', estadoPago: 'pendiente',
                    referenciaPago: '', notasPago: ''
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarInfoPago}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelAlmacenRD;