// admin_web/src/pages/PanelRepartidores.jsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Truck,
  Package,
  CheckCircle,
  Camera,
  DollarSign,
  AlertTriangle,
  XCircle,
  Phone,
  MapPin,
  FileText,
  Loader,
  Navigation,
  Image as ImageIcon
} from 'lucide-react';

const PanelRepartidores = () => {
  // Estados principales
  const [rutas, setRutas] = useState([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [facturaActual, setFacturaActual] = useState(null);
  const [vistaActual, setVistaActual] = useState('lista'); // 'lista' | 'ruta' | 'factura'
  
  // Estados de carga
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Estados para fotos de evidencia
  const [showModalFotos, setShowModalFotos] = useState(false);
  const [fotosEvidencia, setFotosEvidencia] = useState([]);

  // Estados para pago contraentrega
  const [showModalPago, setShowModalPago] = useState(false);
  const [montoPagado, setMontoPagado] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [notasPago, setNotasPago] = useState('');

  // Estados para reportar daño
  const [showModalDano, setShowModalDano] = useState(false);
  const [itemDanado, setItemDanado] = useState(null);
  const [descripcionDano, setDescripcionDano] = useState('');
  const [fotosDano, setFotosDano] = useState([]);

  // Estados para reportar no entrega
  const [showModalNoEntrega, setShowModalNoEntrega] = useState(false);
  const [motivoNoEntrega, setMotivoNoEntrega] = useState('');
  const [descripcionNoEntrega, setDescripcionNoEntrega] = useState('');
  const [fotosNoEntrega, setFotosNoEntrega] = useState([]);
  const [intentarNuevamente, setIntentarNuevamente] = useState(true);

  // Estados para entregar factura
  const [showModalEntregar, setShowModalEntregar] = useState(false);
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');

  // Estados para finalizar ruta
  const [showModalFinalizar, setShowModalFinalizar] = useState(false);
  const [notasFinalizacion, setNotasFinalizacion] = useState('');

  // ========================================
  // CARGAR RUTAS ASIGNADAS
  // ========================================
  useEffect(() => {
    cargarRutasAsignadas();
  }, []);

  const cargarRutasAsignadas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/repartidores/rutas');
      
      if (response.data.success) {
        setRutas(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando rutas:', error);
      alert('Error al cargar las rutas asignadas');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // CARGAR DETALLE DE RUTA
  // ========================================
  const cargarDetalleRuta = async (rutaId) => {
    try {
      setLoading(true);
      const response = await api.get(`/repartidores/rutas/${rutaId}`);
      
      if (response.data.success) {
        setRutaSeleccionada(response.data.data);
        setVistaActual('ruta');
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
      alert('Error al cargar el detalle de la ruta');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // INICIAR ENTREGAS
  // ========================================
  const handleIniciarEntregas = async () => {
    if (!rutaSeleccionada) return;

    if (!confirm('¿Iniciar entregas de esta ruta?')) return;

    try {
      setProcesando(true);
      const response = await api.post(`/repartidores/rutas/${rutaSeleccionada.id}/iniciar-entregas`);
      
      if (response.data.success) {
        alert('✅ Entregas iniciadas exitosamente');
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error iniciando entregas:', error);
      alert('Error al iniciar entregas: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // SELECCIONAR FACTURA
  // ========================================
  const seleccionarFactura = (factura) => {
    setFacturaActual(factura);
    setVistaActual('factura');
  };

  // ========================================
  // CONFIRMAR ITEM ENTREGADO
  // ========================================
  const handleEntregarItem = async (itemIndex) => {
    if (!facturaActual) return;

    try {
      setProcesando(true);
      
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/items/entregar`,
        { itemIndex }
      );
      
      if (response.data.success) {
        // Recargar detalle
        await cargarDetalleRuta(rutaSeleccionada.id);
        // Actualizar factura actual
        const facturaActualizada = rutaSeleccionada.facturas.find(f => f.id === facturaActual.id);
        setFacturaActual(facturaActualizada);
      }
    } catch (error) {
      console.error('Error entregando item:', error);
      alert('Error al entregar item: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // SUBIR FOTOS DE EVIDENCIA
  // ========================================
  const handleSubirFotos = async () => {
    if (!facturaActual || fotosEvidencia.length === 0) {
      alert('Debes tomar al menos una foto');
      return;
    }

    try {
      setProcesando(true);
      
      // Aquí deberías implementar la lógica de subida de fotos a tu storage
      // Por ahora simulamos URLs
      const fotosUrls = fotosEvidencia.map((_, i) => `foto-entrega-${Date.now()}-${i}.jpg`);
      
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/fotos`,
        { fotos: fotosUrls }
      );
      
      if (response.data.success) {
        alert('✅ Fotos subidas exitosamente');
        setShowModalFotos(false);
        setFotosEvidencia([]);
        
        // Recargar
        await cargarDetalleRuta(rutaSeleccionada.id);
        const facturaActualizada = rutaSeleccionada.facturas.find(f => f.id === facturaActual.id);
        setFacturaActual(facturaActualizada);
      }
    } catch (error) {
      console.error('Error subiendo fotos:', error);
      alert('Error al subir fotos: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // CONFIRMAR PAGO CONTRAENTREGA
  // ========================================
  const handleConfirmarPago = async () => {
    if (!facturaActual || !montoPagado) {
      alert('El monto pagado es obligatorio');
      return;
    }

    try {
      setProcesando(true);
      
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/pago-contraentrega`,
        {
          montoPagado: parseFloat(montoPagado),
          metodoPago,
          referenciaPago,
          notas: notasPago
        }
      );
      
      if (response.data.success) {
        alert('✅ Pago confirmado exitosamente');
        setShowModalPago(false);
        resetFormPago();
        
        // Recargar
        await cargarDetalleRuta(rutaSeleccionada.id);
        const facturaActualizada = rutaSeleccionada.facturas.find(f => f.id === facturaActual.id);
        setFacturaActual(facturaActualizada);
      }
    } catch (error) {
      console.error('Error confirmando pago:', error);
      alert('Error al confirmar pago: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // REPORTAR ITEM DAÑADO
  // ========================================
  const handleReportarDano = async () => {
    if (!facturaActual || !itemDanado || !descripcionDano.trim()) {
      alert('La descripción del daño es obligatoria');
      return;
    }

    try {
      setProcesando(true);
      
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/items/danado`,
        {
          itemIndex: itemDanado.index,
          descripcionDano: descripcionDano.trim(),
          fotos: fotosDano
        }
      );
      
      if (response.data.success) {
        alert('⚠️ Item dañado reportado');
        setShowModalDano(false);
        resetFormDano();
        
        // Recargar
        await cargarDetalleRuta(rutaSeleccionada.id);
        const facturaActualizada = rutaSeleccionada.facturas.find(f => f.id === facturaActual.id);
        setFacturaActual(facturaActualizada);
      }
    } catch (error) {
      console.error('Error reportando daño:', error);
      alert('Error al reportar daño: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // MARCAR FACTURA COMO ENTREGADA
  // ========================================
  const handleMarcarEntregada = async () => {
    if (!facturaActual) return;

    try {
      setProcesando(true);
      
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/entregar`,
        {
          nombreReceptor,
          notasEntrega,
          firmaCliente: null // Implementar captura de firma si es necesario
        }
      );
      
      if (response.data.success) {
        alert('✅ Factura marcada como entregada');
        setShowModalEntregar(false);
        resetFormEntregar();
        
        // Volver a lista de facturas
        setVistaActual('ruta');
        setFacturaActual(null);
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error marcando entregada:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // REPORTAR NO ENTREGA
  // ========================================
  const handleReportarNoEntrega = async () => {
    if (!facturaActual || !motivoNoEntrega || !descripcionNoEntrega.trim()) {
      alert('Motivo y descripción son obligatorios');
      return;
    }

    try {
      setProcesando(true);
      
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/no-entregada`,
        {
          motivo: motivoNoEntrega,
          descripcion: descripcionNoEntrega.trim(),
          fotos: fotosNoEntrega,
          intentarNuevamente
        }
      );
      
      if (response.data.success) {
        alert('⚠️ No entrega reportada');
        setShowModalNoEntrega(false);
        resetFormNoEntrega();
        
        // Volver a lista
        setVistaActual('ruta');
        setFacturaActual(null);
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error reportando no entrega:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // FINALIZAR RUTA
  // ========================================
  const handleFinalizarRuta = async () => {
    if (!rutaSeleccionada) return;

    try {
      setProcesando(true);
      
      const response = await api.post(
        `/repartidores/rutas/${rutaSeleccionada.id}/finalizar`,
        { notas: notasFinalizacion }
      );
      
      if (response.data.success) {
        const { facturasEntregadas, facturasNoEntregadas, facturasPendientes } = response.data.data;
        
        alert(
          `✅ Ruta finalizada exitosamente\n\n` +
          `Entregadas: ${facturasEntregadas}\n` +
          `No entregadas: ${facturasNoEntregadas}\n` +
          `Pendientes: ${facturasPendientes}`
        );
        
        setShowModalFinalizar(false);
        setNotasFinalizacion('');
        
        // Volver a lista
        setVistaActual('lista');
        setRutaSeleccionada(null);
        await cargarRutasAsignadas();
      }
    } catch (error) {
      console.error('Error finalizando ruta:', error);
      alert('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // HELPERS
  // ========================================
  const calcularProgreso = (factura) => {
    if (!factura.items || factura.items.length === 0) return 0;
    const entregados = factura.itemsEntregados || 0;
    return Math.round((entregados / factura.items.length) * 100);
  };

  const resetFormPago = () => {
    setMontoPagado('');
    setMetodoPago('efectivo');
    setReferenciaPago('');
    setNotasPago('');
  };

  const resetFormDano = () => {
    setItemDanado(null);
    setDescripcionDano('');
    setFotosDano([]);
  };

  const resetFormEntregar = () => {
    setNombreReceptor('');
    setNotasEntrega('');
  };

  const resetFormNoEntrega = () => {
    setMotivoNoEntrega('');
    setDescripcionNoEntrega('');
    setFotosNoEntrega([]);
    setIntentarNuevamente(true);
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Panel de Repartidores
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestión de entregas con evidencias y confirmación de pagos
        </p>
      </div>

      {/* ========================================
          VISTA LISTA DE RUTAS
          ======================================== */}
      {vistaActual === 'lista' && (
        <div>
          {loading ? (
            <div className="text-center py-12">
              <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
              <p className="text-gray-600 dark:text-gray-400">Cargando rutas...</p>
            </div>
          ) : rutas.length === 0 ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-12 text-center">
              <Truck className="mx-auto text-blue-600 mb-4" size={64} />
              <p className="text-blue-800 dark:text-blue-200 text-lg font-medium">
                No tienes rutas asignadas
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm mt-2">
                Cuando se te asigne una ruta aparecerá aquí
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rutas.map((ruta) => (
                <div
                  key={ruta.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition p-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Truck className="text-blue-600" size={32} />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {ruta.nombre}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={14} />
                          {ruta.zona}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ruta.estado === 'cargada'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {ruta.estado === 'cargada' ? 'Lista' : 'En Entrega'}
                    </span>
                  </div>

                  {/* Estadísticas */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total facturas:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {ruta.estadisticas.totalFacturas}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Entregadas:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {ruta.estadisticas.facturasEntregadas}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">No entregadas:</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {ruta.estadisticas.facturasNoEntregadas}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Pendientes:</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {ruta.estadisticas.facturasPendientes}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 dark:text-gray-400">Progreso</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {ruta.estadisticas.porcentajeEntrega}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${ruta.estadisticas.porcentajeEntrega}%` }}
                      />
                    </div>
                  </div>

                  {/* Botón */}
                  <button
                    onClick={() => cargarDetalleRuta(ruta.id)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    {ruta.estado === 'cargada' ? 'Iniciar Entregas' : 'Continuar Entregas'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================
          VISTA DETALLE DE RUTA
          ======================================== */}
      {vistaActual === 'ruta' && rutaSeleccionada && (
        <div>
          {/* Header con botón volver */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setVistaActual('lista');
                setRutaSeleccionada(null);
                cargarRutasAsignadas();
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Volver a rutas
            </button>

            <div className="flex gap-3">
              {rutaSeleccionada.estado === 'cargada' && (
                <button
                  onClick={handleIniciarEntregas}
                  disabled={procesando}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {procesando ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Iniciar Entregas
                    </>
                  )}
                </button>
              )}

              {rutaSeleccionada.estado === 'en_entrega' && (
                <button
                  onClick={() => setShowModalFinalizar(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Finalizar Ruta
                </button>
              )}
            </div>
          </div>

          {/* Info de la ruta */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Truck className="text-blue-600" size={48} />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {rutaSeleccionada.nombre}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                    <MapPin size={16} />
                    {rutaSeleccionada.zona}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de facturas */}
          <div className="space-y-4">
            {rutaSeleccionada.facturas.map((factura) => {
              const progreso = calcularProgreso(factura);
              const esEntregada = factura.estado === 'entregada';
              const esNoEntregada = factura.estado === 'no_entregada';

              return (
                <div
                  key={factura.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 transition ${
                    esEntregada
                      ? 'border-green-500'
                      : esNoEntregada
                      ? 'border-orange-500'
                      : 'border-blue-500'
                  }`}
                  onClick={() => !esEntregada && !esNoEntregada && seleccionarFactura(factura)}
                  style={{ cursor: !esEntregada && !esNoEntregada ? 'pointer' : 'default' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="text-blue-600" size={24} />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {factura.codigoTracking}
                        </h3>
                        {esEntregada && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                            <CheckCircle size={14} />
                            Entregada
                          </span>
                        )}
                        {esNoEntregada && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium flex items-center gap-1">
                            <XCircle size={14} />
                            No Entregada
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-900 dark:text-white font-medium mb-1">
                        👤 {factura.destinatario.nombre}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                        📞 {factura.destinatario.telefono}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                        📍 {factura.destinatario.direccion}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        📦 {factura.itemsTotal} items
                        {factura.itemsEntregados > 0 && ` (${factura.itemsEntregados} entregados)`}
                      </p>

                      {factura.pago && factura.pago.estado !== 'pagada' && (
                        <p className="text-orange-600 dark:text-orange-400 text-sm font-medium mt-2">
                          💵 Cobrar: ${factura.pago.total.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {!esEntregada && !esNoEntregada && (
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {progreso}%
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Progreso
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================
          VISTA DETALLE DE FACTURA
          ======================================== */}
      {vistaActual === 'factura' && facturaActual && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setVistaActual('ruta');
                setFacturaActual(null);
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Volver a facturas
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModalFotos(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-2"
              >
                <Camera size={18} />
                Fotos ({facturaActual.fotosEntrega?.length || 0})
              </button>

              {facturaActual.pago.estado !== 'pagada' && (
                <button
                  onClick={() => setShowModalPago(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
                >
                  <DollarSign size={18} />
                  Pago
                </button>
              )}
            </div>
          </div>

          {/* Info del cliente */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {facturaActual.codigoTracking}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Información del Cliente
                </h3>
                <p className="text-gray-900 dark:text-white">👤 {facturaActual.destinatario.nombre}</p>
                <p className="text-gray-600 dark:text-gray-400">📞 {facturaActual.destinatario.telefono}</p>
                <p className="text-gray-600 dark:text-gray-400">📍 {facturaActual.destinatario.direccion}</p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facturaActual.destinatario.direccion)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-2"
                >
                  <Navigation size={16} />
                  Abrir en Google Maps
                </a>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Información de Pago
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Estado: <span className={`font-medium ${
                    facturaActual.pago.estado === 'pagada' 
                      ? 'text-green-600' 
                      : 'text-orange-600'
                  }`}>
                    {facturaActual.pago.estado === 'pagada' ? '✅ Pagado' : '💵 Por cobrar'}
                  </span>
                </p>
                <p className="text-gray-900 dark:text-white text-xl font-bold mt-2">
                  ${facturaActual.pago.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Lista de items */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Items de la Factura
            </h3>
            
            <div className="space-y-3">
              {facturaActual.items.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    item.entregado
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {item.entregado ? (
                      <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                    ) : (
                      <Package className="text-gray-400 flex-shrink-0" size={24} />
                    )}
                    
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.descripcion}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Cantidad: {item.cantidad} | Precio: ${item.precio}
                      </p>
                    </div>
                  </div>

                  {rutaSeleccionada.estado === 'en_entrega' && !item.entregado && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEntregarItem(index)}
                        disabled={procesando}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        ✓ Entregar
                      </button>
                      <button
                        onClick={() => {
                          setItemDanado({ ...item, index });
                          setShowModalDano(true);
                        }}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                      >
                        ⚠️ Dañado
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          {rutaSeleccionada.estado === 'en_entrega' && (
            <div className="flex gap-4">
              <button
                onClick={() => setShowModalEntregar(true)}
                disabled={facturaActual.itemsEntregados < facturaActual.itemsTotal}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {facturaActual.itemsEntregados < facturaActual.itemsTotal 
                  ? '⚠️ Complete todos los items'
                  : '✅ Marcar como Entregada'
                }
              </button>
              
              <button
                onClick={() => setShowModalNoEntrega(true)}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
              >
                ⚠️ Reportar No Entrega
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================
          MODALES
          ======================================== */}
      
      {/* Modal Fotos */}
      {showModalFotos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="text-purple-600" />
                Fotos de Evidencia
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tomar fotos de la entrega *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      setFotosEvidencia(files);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {fotosEvidencia.length} foto(s) seleccionada(s)
                  </p>
                </div>

                {facturaActual.fotosEntrega && facturaActual.fotosEntrega.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fotos ya subidas:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {facturaActual.fotosEntrega.map((foto, idx) => (
                        <div key={idx} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <ImageIcon className="text-gray-400" size={32} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalFotos(false);
                    setFotosEvidencia([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubirFotos}
                  disabled={procesando || fotosEvidencia.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {procesando ? 'Subiendo...' : 'Subir Fotos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="text-green-600" />
                Confirmar Pago Contraentrega
              </h2>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Monto total:</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${facturaActual.pago.total.toFixed(2)}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monto pagado *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoPagado}
                    onChange={(e) => setMontoPagado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Método de pago
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                {metodoPago !== 'efectivo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Referencia de pago
                    </label>
                    <input
                      type="text"
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Número de referencia"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={notasPago}
                    onChange={(e) => setNotasPago(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="2"
                    placeholder="Observaciones..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalPago(false);
                    resetFormPago();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarPago}
                  disabled={procesando || !montoPagado}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {procesando ? 'Confirmando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reportar Daño */}
      {showModalDano && itemDanado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-orange-600" />
                Reportar Item Dañado
              </h2>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Item:</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {itemDanado.descripcion}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción del daño *
                  </label>
                  <textarea
                    value={descripcionDano}
                    onChange={(e) => setDescripcionDano(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows="4"
                    placeholder="Describe el daño encontrado..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalDano(false);
                    resetFormDano();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReportarDano}
                  disabled={procesando || !descripcionDano.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {procesando ? 'Reportando...' : 'Reportar Daño'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entregar */}
      {showModalEntregar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="text-green-600" />
                Marcar como Entregada
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre de quien recibe
                  </label>
                  <input
                    type="text"
                    value={nombreReceptor}
                    onChange={(e) => setNombreReceptor(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nombre del receptor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notas de entrega
                  </label>
                  <textarea
                    value={notasEntrega}
                    onChange={(e) => setNotasEntrega(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Observaciones de la entrega..."
                  />
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    ✓ Confirmo que:
                  </p>
                  <ul className="list-disc ml-5 mt-2 text-sm text-green-700 dark:text-green-300">
                    <li>Todos los items fueron entregados</li>
                    <li>Tomé fotos de evidencia</li>
                    <li>El cliente recibió conforme</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalEntregar(false);
                    resetFormEntregar();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMarcarEntregada}
                  disabled={procesando}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {procesando ? 'Marcando...' : 'Marcar Entregada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal No Entrega */}
      {showModalNoEntrega && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <XCircle className="text-orange-600" />
                Reportar No Entrega
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Motivo *
                  </label>
                  <select
                    value={motivoNoEntrega}
                    onChange={(e) => setMotivoNoEntrega(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccionar motivo</option>
                    <option value="cliente_ausente">Cliente ausente</option>
                    <option value="direccion_incorrecta">Dirección incorrecta</option>
                    <option value="cliente_rechazo">Cliente rechazó el pedido</option>
                    <option value="otro">Otro motivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    value={descripcionNoEntrega}
                    onChange={(e) => setDescripcionNoEntrega(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows="4"
                    placeholder="Describe la situación..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="intentarNuevamente"
                    checked={intentarNuevamente}
                    onChange={(e) => setIntentarNuevamente(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="intentarNuevamente" className="text-sm text-gray-700 dark:text-gray-300">
                    Intentar entregar nuevamente
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalNoEntrega(false);
                    resetFormNoEntrega();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReportarNoEntrega}
                  disabled={procesando || !motivoNoEntrega || !descripcionNoEntrega.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {procesando ? 'Reportando...' : 'Reportar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Finalizar Ruta */}
      {showModalFinalizar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="text-purple-600" />
                Finalizar Ruta
              </h2>

              <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-purple-800 dark:text-purple-200 font-medium mb-2">
                  ✓ Confirmo que:
                </p>
                <ul className="list-disc ml-5 space-y-1 text-sm text-purple-700 dark:text-purple-300">
                  <li>Completé todas las entregas posibles</li>
                  <li>Reporté las facturas no entregadas</li>
                  <li>Confirmé los pagos contraentrega</li>
                  <li>Estoy regresando al almacén</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas de finalización (opcional)
                </label>
                <textarea
                  value={notasFinalizacion}
                  onChange={(e) => setNotasFinalizacion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows="3"
                  placeholder="Observaciones generales de la ruta..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalFinalizar(false);
                    setNotasFinalizacion('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalizarRuta}
                  disabled={procesando}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {procesando ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Finalizar Ruta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelRepartidores;