import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import { storage } from '../services/firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageFile, needsCompression } from '../utils/imageCompression';
import { useMisRutasActivas, useOptimisticAction } from '../hooks/useRealtimeOptimized';
import { LiveIndicator, NewDataBadge, ConnectionStatusIndicator } from '../components/RealtimeIndicator';
import { generateImageVariants, variantBlobToFile, getStoragePathForVariant } from '../utils/thumbnailGenerator.jsx';
import {
  Truck,
  Package,
  CheckCircle,
  Camera,
  DollarSign,
  AlertTriangle,
  XCircle,
  MapPin,
  FileText,
  Loader,
  Navigation,
  Image as ImageIcon,
  ArrowLeft,
  X,
  Plus,
  Image
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PullToRefresh from '../components/common/PullToRefresh';

const PanelRepartidores = () => {
  // ==============================================================================
  // 🎣 HOOKS DE TIEMPO REAL Y OPTIMISTIC UI
  // ==============================================================================
  const {
    data: rutasRealtime,
    loading: loadingRutas,
    hasNewData,
    clearNewDataIndicator
  } = useMisRutasActivas();

  const { executeWithOptimism } = useOptimisticAction();
  const { userData } = useAuth();

  // ==============================================================================
  // 🎣 ESTADOS GLOBALES Y DE NAVEGACIÓN
  // ==============================================================================
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [facturaActual, setFacturaActual] = useState(null);
  const [vistaActual, setVistaActual] = useState('lista'); // 'lista', 'ruta', 'factura'
  const [gastos, setGastos] = useState([]);
  const [totalGastos, setTotalGastos] = useState(0);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [subiendoFotos, setSubiendoFotos] = useState(false);

  // ==============================================================================
  // 🎣 ESTADOS DE MODALES
  // ==============================================================================
  const [showModalFotos, setShowModalFotos] = useState(false);
  const [showModalDano, setShowModalDano] = useState(false);
  const [showModalNoEntrega, setShowModalNoEntrega] = useState(false);
  const [showModalPago, setShowModalPago] = useState(false);
  const [showModalEntregar, setShowModalEntregar] = useState(false);
  const [showModalFinalizar, setShowModalFinalizar] = useState(false);
  const [showModalGasto, setShowModalGasto] = useState(false);

  // ==============================================================================
  // 🎣 ESTADOS DE FORMULARIOS
  // ==============================================================================
  // Fotos
  const [fotosEvidencia, setFotosEvidencia] = useState([]);

  // Daño
  const [itemDanado, setItemDanado] = useState(null);
  const [descripcionDano, setDescripcionDano] = useState('');
  const [fotosDano, setFotosDano] = useState([]);

  // No Entrega
  const [motivoNoEntrega, setMotivoNoEntrega] = useState('');
  const [otroMotivoNoEntrega, setOtroMotivoNoEntrega] = useState('');
  const [descripcionNoEntrega, setDescripcionNoEntrega] = useState('');
  const [fotosNoEntrega, setFotosNoEntrega] = useState([]);
  const [intentarNuevamente, setIntentarNuevamente] = useState(true);

  // Pago
  const [montoPagado, setMontoPagado] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [notasPago, setNotasPago] = useState('');
  const [montoRecibido, setMontoRecibido] = useState(0);
  const [comentarioPago, setComentarioPago] = useState('');

  // Entregar
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');
  const [comentarioEntrega, setComentarioEntrega] = useState('');

  // Finalizar Ruta
  const [notasFinalizacion, setNotasFinalizacion] = useState('');

  // Gastos
  const [tipoGasto, setTipoGasto] = useState('combustible');
  const [montoGasto, setMontoGasto] = useState('');
  const [descripcionGasto, setDescripcionGasto] = useState('');

  // ==============================================================================
  // 🔄 EFECTOS Y CARGA DE DATOS
  // ==============================================================================
  const cargarDetalleRuta = async (rutaId) => {
    try {
      setLoadingDetalle(true);
      const response = await api.get(`/repartidores/rutas/${rutaId}`);
      if (response.data.success) {
        setRutaSeleccionada(response.data.data);
        cargarGastos(rutaId);

        if (vistaActual === 'factura' && facturaActual) {
          const updatedFactura = response.data.data.facturas.find(f => f.id === facturaActual.id);
          if (updatedFactura) {
            setFacturaActual(updatedFactura);
          }
        }
        if (vistaActual === 'lista') setVistaActual('ruta');
      }
    } catch (e) {
      toast.error('Error cargando detalle de ruta');
      console.error(e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cargarGastos = async (rutaId) => {
    try {
      const response = await api.get(`/gastos-ruta/${rutaId}`);
      if (response.data.success) {
        setGastos(response.data.data.gastos || []);
        setTotalGastos(response.data.data.totalGastos || 0);
      }
    } catch (error) {
      console.error('Error cargando gastos:', error);
    }
  };

  const handleRefresh = async () => {
    if (rutaSeleccionada) {
      await cargarDetalleRuta(rutaSeleccionada.id);
    } else {
      // El hook useMisRutasActivas se encarga de actualizar la lista
    }
    clearNewDataIndicator();
  };

  // ==============================================================================
  // ☁️ LÓGICA DE SUBIDA DE ARCHIVOS (Firebase)
  // ==============================================================================
  const uploadImage = async (blob, path) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const subirArchivosAFirebase = async (archivos, carpeta) => {
    const urls = [];
    if (!archivos || archivos.length === 0) return urls;

    const idReferencia = facturaActual?.id || rutaSeleccionada?.id || 'temp';

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const startTime = Date.now();

      try {
        const variants = await generateImageVariants(archivo);
        const thumbUrl = await uploadImage(variants.thumbnail, `${carpeta}/${idReferencia}/thumb_${archivo.name}`);
        const previewUrl = await uploadImage(variants.preview, `${carpeta}/${idReferencia}/preview_${archivo.name}`);
        const originalUrl = await uploadImage(variants.original, `${carpeta}/${idReferencia}/original_${archivo.name}`);

        urls.push({
          original: originalUrl,
          thumbnail: thumbUrl,
          preview: previewUrl,
          metadata: variants.metadata
        });

        const duration = Date.now() - startTime;
        if (duration > 500) {
          toast.success(
            `Imagen ${i + 1}: ${variants.metadata.originalSizeKB}KB → Thumb: ${variants.metadata.thumbnailSizeKB}KB + Preview: ${variants.metadata.previewSizeKB}KB`,
            { duration: 3000 }
          );
        }
      } catch (error) {
        console.error(`Error procesando archivo ${archivo.name}:`, error);
        toast.error(`Error al procesar ${archivo.name}`);
      }
    }
    return urls;
  };

  // ==============================================================================
  // 🎮 HANDLERS DE ACCIÓN
  // ==============================================================================

  const handleIniciarEntregas = async () => {
    if (!rutaSeleccionada) return;
    try {
      setProcesando(true);
      const response = await api.post(`/repartidores/rutas/${rutaSeleccionada.id}/iniciar-entregas`);
      if (response.data.success) {
        toast.success('🚚 Ruta iniciada');
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (e) {
      toast.error('Error al iniciar ruta');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const handleEntregarItem = async (itemIndex) => {
    if (!facturaActual) return;

    const estadoPrevio = {
      items: [...facturaActual.items],
      itemsEntregados: facturaActual.itemsEntregados
    };

    await executeWithOptimism({
      optimisticUpdate: () => {
        const nuevosItems = [...facturaActual.items];
        if (nuevosItems[itemIndex]) {
          nuevosItems[itemIndex].entregado = true;
          nuevosItems[itemIndex]._optimistic = true;
        }
        setFacturaActual(prev => ({
          ...prev,
          items: nuevosItems,
          itemsEntregados: (prev.itemsEntregados || 0) + 1
        }));
      },
      serverAction: async () => {
        const response = await api.post(
          `/repartidores/facturas/${facturaActual.id}/items/entregar`,
          { itemIndex }
        );
        await cargarDetalleRuta(rutaSeleccionada.id);
        return response;
      },
      rollback: () => {
        setFacturaActual(prev => ({
          ...prev,
          items: estadoPrevio.items,
          itemsEntregados: estadoPrevio.itemsEntregados
        }));
      },
      successMessage: '📦 Item entregado',
      errorMessage: '❌ Error al entregar item'
    });
  };

  const handleSubirFotos = async () => {
    if (!facturaActual || fotosEvidencia.length === 0) {
      toast.warning('Debes seleccionar al menos una foto');
      return;
    }

    try {
      setProcesando(true);
      setSubiendoFotos(true);

      const urls = await subirArchivosAFirebase(fotosEvidencia, 'evidencia_entrega');
      if (urls.length === 0) {
        toast.warning('No se subió ninguna foto con éxito.');
        return;
      }

      const fotosUrls = urls.map(url => typeof url === 'string' ? url : url.original);

      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/fotos`,
        { fotos: fotosUrls }
      );

      if (response.data.success) {
        toast.success(`📸 ${urls.length} fotos subidas`);
        setShowModalFotos(false);
        setFotosEvidencia([]);
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (e) {
      toast.error('Error al subir fotos');
      console.error(e);
    } finally {
      setProcesando(false);
      setSubiendoFotos(false);
    }
  };

  const handleReportarDano = async () => {
    if (!facturaActual || !itemDanado || !descripcionDano.trim()) {
      toast.warning('La descripción del daño es obligatoria');
      return;
    }

    try {
      setProcesando(true);
      const fotosUrls = await subirArchivosAFirebase(fotosDano, 'danos_reparto');

      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/items/danado`,
        {
          itemIndex: itemDanado.index,
          descripcionDano: descripcionDano.trim(),
          fotos: fotosUrls
        }
      );

      if (response.data.success) {
        toast.warning('⚠️ Item dañado reportado');
        setShowModalDano(false);
        resetFormDano();
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (e) {
      toast.error('Error reportando daño');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const handleReportarNoEntrega = async () => {
    if (!facturaActual || !motivoNoEntrega || !descripcionNoEntrega.trim()) {
      toast.warning('Motivo y descripción son obligatorios');
      return;
    }

    try {
      setProcesando(true);
      const fotosUrls = await subirArchivosAFirebase(fotosNoEntrega, 'reportes_no_entrega');

      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/no-entregada`,
        {
          motivo: motivoNoEntrega,
          descripcion: descripcionNoEntrega.trim(),
          fotos: fotosUrls,
          intentarNuevamente
        }
      );

      if (response.data.success) {
        toast.warning('🚫 No entrega reportada');
        setShowModalNoEntrega(false);
        resetFormNoEntrega();
        volverARuta();
      }
    } catch (e) {
      toast.error('Error reportando no entrega');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarPago = async () => {
    if (!facturaActual || !montoPagado && !montoRecibido && metodoPago === 'efectivo') {
      // Validación básica, se puede mejorar
    }

    try {
      setProcesando(true);
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/pago-contraentrega`,
        {
          montoPagado: metodoPago === 'efectivo' ? parseFloat(montoRecibido) : parseFloat(facturaActual.pago?.total || 0),
          metodoPago,
          referenciaPago,
          notas: comentarioPago
        }
      );

      if (response.data.success) {
        toast.success('💰 Pago confirmado');
        setShowModalPago(false);
        resetFormPago();
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (e) {
      toast.error('Error al confirmar pago');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const handleMarcarEntregada = async () => {
    if (!facturaActual) return;

    if (facturaActual.itemsEntregados < (facturaActual.items?.length || facturaActual.itemsTotal)) {
      toast.warning('Debe confirmar la entrega de todos los ítems o reportar los faltantes/dañados.');
      return;
    }

    if (facturaActual.pago?.estado !== 'pagada' && facturaActual.pago?.total > 0) {
      toast.warning('Debe confirmar el pago contraentrega antes de marcar como entregada.');
      return;
    }

    try {
      setProcesando(true);
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/entregar`,
        {
          nombreReceptor,
          notasEntrega: notasEntrega || comentarioEntrega,
          firmaCliente: null
        }
      );

      if (response.data.success) {
        toast.success('✅ Factura marcada como entregada');
        setShowModalEntregar(false);
        resetFormEntregar();
        volverARuta();
      }
    } catch (e) {
      toast.error('Error al confirmar entrega');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const handleFinalizarRuta = async () => {
    if (!rutaSeleccionada) return;

    toast.promise(
      async () => {
        const response = await api.post(`/repartidores/rutas/${rutaSeleccionada.id}/finalizar`, {
          notas: notasFinalizacion
        });
        if (response.data.success) {
          setShowModalFinalizar(false);
          setNotasFinalizacion('');
          volverALista();
        }
        return response.data;
      },
      {
        loading: 'Finalizando ruta...',
        success: '🏁 Ruta finalizada correctamente',
        error: 'Error al finalizar la ruta'
      }
    );
  };

  const handleAgregarGasto = async () => {
    if (!rutaSeleccionada) return;

    if (!montoGasto || parseFloat(montoGasto) <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    try {
      setProcesando(true);
      const response = await api.post(`/gastos-ruta/${rutaSeleccionada.id}`, {
        tipo: tipoGasto,
        monto: parseFloat(montoGasto),
        descripcion: descripcionGasto
      });

      if (response.data.success) {
        toast.success('💰 Gasto registrado');
        setShowModalGasto(false);
        resetFormGasto();
        cargarGastos(rutaSeleccionada.id);
      }
    } catch (e) {
      toast.error('Error al registrar gasto');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  // ==============================================================================
  // 🔄 HELPERS DE NAVEGACIÓN Y RESET
  // ==============================================================================
  const volverARuta = () => {
    setFacturaActual(null);
    setVistaActual('ruta');
    if (rutaSeleccionada) cargarDetalleRuta(rutaSeleccionada.id);
  };

  const volverALista = () => {
    setRutaSeleccionada(null);
    setVistaActual('lista');
  };

  const resetFormDano = () => {
    setItemDanado(null);
    setDescripcionDano('');
    setFotosDano([]);
  };

  const resetFormNoEntrega = () => {
    setMotivoNoEntrega('');
    setDescripcionNoEntrega('');
    setFotosNoEntrega([]);
    setIntentarNuevamente(true);
    setOtroMotivoNoEntrega('');
  };

  const resetFormPago = () => {
    setMontoPagado('');
    setMetodoPago('efectivo');
    setMontoRecibido(0);
    setComentarioPago('');
  };

  const resetFormEntregar = () => {
    setNombreReceptor('');
    setNotasEntrega('');
    setComentarioEntrega('');
  };

  const resetFormGasto = () => {
    setMontoGasto('');
    setDescripcionGasto('');
    setTipoGasto('combustible');
  };

  // ==============================================================================
  // 🖥️ RENDER
  // ==============================================================================
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 xxs:p-3 xs:p-4 pb-20">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 xxs:mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg xxs:text-xl xs:text-2xl font-bold text-gray-900 dark:text-white truncate">Panel de Repartidor</h1>
            <p className="text-xs xxs:text-sm xs:text-base text-gray-600 dark:text-gray-400 truncate">Hola, {userData?.nombre}</p>
          </div>
          <div className="flex items-center gap-1 xxs:gap-2 flex-shrink-0 ml-2">
            <ConnectionStatusIndicator />
            <LiveIndicator />
          </div>
        </div>

        {/* VISTA: LISTA DE RUTAS */}
        {vistaActual === 'lista' && (
          <div className="space-y-3 xxs:space-y-4">
            <h2 className="text-base xxs:text-lg xs:text-xl font-semibold text-gray-800 dark:text-gray-200">Mis Rutas Asignadas</h2>
            {loadingRutas ? (
              <div className="flex justify-center p-8"><Loader className="animate-spin text-blue-600" /></div>
            ) : rutasRealtime?.length > 0 ? (
              rutasRealtime.map(ruta => (
                <div key={ruta.id} className="bg-white dark:bg-gray-800 p-3 xxs:p-4 rounded-lg shadow-md border-l-4 border-blue-600">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base xxs:text-lg dark:text-white truncate">{ruta.nombre}</h3>
                      <p className="text-xs xxs:text-sm text-gray-500 dark:text-gray-400">
                        {new Date(ruta.fecha_programada).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap flex-shrink-0 ${ruta.estado === 'en_curso' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                      {ruta.estado.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-3 xxs:mt-4 gap-2">
                    <div className="text-xs xxs:text-sm text-gray-600 dark:text-gray-300">
                      <p>{ruta.facturas?.length || 0} entregas</p>
                    </div>
                    <button
                      onClick={() => cargarDetalleRuta(ruta.id)}
                      className="px-3 xxs:px-4 py-2 text-xs xxs:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1 xxs:gap-2 whitespace-nowrap"
                    >
                      Ver Ruta <ArrowLeft className="rotate-180" size={14} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg">
                <Truck className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">No tienes rutas activas asignadas</p>
              </div>
            )}
          </div>
        )}

        {/* VISTA: DETALLE DE RUTA */}
        {vistaActual === 'ruta' && rutaSeleccionada && (
          <div className="space-y-4">
            <button onClick={volverALista} className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
              <ArrowLeft size={20} className="mr-1" /> Volver a mis rutas
            </button>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold dark:text-white">{rutaSeleccionada.nombre}</h2>
                  <p className="text-sm text-gray-500">
                    {rutaSeleccionada.facturas?.filter(f => f.estado === 'entregada').length} / {rutaSeleccionada.facturas?.length} completadas
                  </p>
                </div>
                {rutaSeleccionada.estado === 'pendiente' ? (
                  <button
                    onClick={handleIniciarEntregas}
                    disabled={procesando}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                  >
                    <Truck size={18} /> Iniciar Ruta
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowModalGasto(true)}
                      className="p-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      title="Registrar Gasto"
                    >
                      <DollarSign size={20} />
                    </button>
                    <button
                      onClick={() => setShowModalFinalizar(true)}
                      className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2 text-sm"
                    >
                      Finalizar
                    </button>
                  </div>
                )}
              </div>

              {/* Resumen de Gastos */}
              {totalGastos > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gastos Registrados: <span className="text-red-600">RD$ {totalGastos.toFixed(2)}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {rutaSeleccionada.facturas?.map((factura, index) => (
                <div
                  key={factura.id}
                  onClick={() => {
                    setFacturaActual(factura);
                    setVistaActual('factura');
                  }}
                  className={`p-4 rounded-lg shadow-sm border-l-4 cursor-pointer transition-all ${factura.estado === 'entregada' ? 'bg-green-50 border-green-500 dark:bg-green-900/20' :
                    factura.estado === 'no_entregada' ? 'bg-red-50 border-red-500 dark:bg-red-900/20' :
                      'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="bg-gray-200 dark:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{factura.destinatario?.nombre}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                          {factura.destinatario?.direccion}
                        </p>
                      </div>
                    </div>
                    {factura.estado === 'entregada' && <CheckCircle className="text-green-600" size={20} />}
                    {factura.estado === 'no_entregada' && <XCircle className="text-red-600" size={20} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VISTA: DETALLE DE FACTURA (ENTREGA) */}
        {vistaActual === 'factura' && facturaActual && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={volverARuta} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-700">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold dark:text-white">Detalle de Entrega</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cliente</p>
                <p className="font-bold text-lg text-gray-900 dark:text-white">{facturaActual.destinatario?.nombre}</p>
                <p className="text-gray-600 dark:text-gray-300 flex items-start gap-2 mt-1">
                  <MapPin size={16} className="mt-1 flex-shrink-0" />
                  {facturaActual.destinatario?.direccion}
                </p>
                <div className="flex gap-2 flex-wrap mt-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(facturaActual.destinatario?.direccion || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
                  >
                    <Navigation size={16} />
                    Google Maps
                  </a>
                  <a
                    href={`https://waze.com/ul?q=${encodeURIComponent(facturaActual.destinatario?.direccion || '')}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium shadow-sm"
                  >
                    <Navigation size={16} />
                    Waze
                  </a>
                </div>
              </div>
              <div className="md:border-l md:pl-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pago Contraentrega:</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">${facturaActual.pago?.total?.toFixed(2) || '0.00'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estado: <span className={`font-bold ${facturaActual.pago?.estado === 'pagada' ? 'text-green-600' : 'text-orange-600'}`}>{facturaActual.pago?.estado === 'pagada' ? 'Pagado' : 'Pendiente'}</span></p>
              </div>
            </div>

            {/* Items Checklist */}
            <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <Package size={20} /> Items a Entregar
            </h3>
            <div className="space-y-3 mb-6">
              {facturaActual.items?.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg flex justify-between items-center ${item.entregado ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'} ${item._optimistic ? 'opacity-70' : ''}`}
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.producto || item.descripcion || 'Item sin nombre'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cant: {item.cantidad}</p>
                  </div>
                  <div className="flex gap-2">
                    {!item.entregado && (
                      <>
                        <button
                          onClick={() => handleEntregarItem(index)}
                          className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                          title="Marcar entregado"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => {
                            setItemDanado({ ...item, index });
                            setShowModalDano(true);
                          }}
                          className="p-2 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition"
                          title="Reportar Daño"
                        >
                          <AlertTriangle size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Evidencia Fotográfica Section */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
              <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                <Camera size={20} /> Evidencia de Entrega
              </h3>

              <div className="flex gap-2 mb-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => setFotosEvidencia(prev => [...prev, ...Array.from(e.target.files)])}
                    className="hidden"
                    id="camera-input"
                  />
                  <div className="w-full px-3 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-2 font-medium">
                    <Camera size={20} />
                    <span>Cámara</span>
                  </div>
                </label>

                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFotosEvidencia(prev => [...prev, ...Array.from(e.target.files)])}
                    className="hidden"
                    id="gallery-input"
                  />
                  <div className="w-full px-3 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer flex items-center justify-center gap-2 font-medium">
                    <Image size={20} />
                    <span>Galería</span>
                  </div>
                </label>
              </div>

              {fotosEvidencia.length > 0 && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📸 {fotosEvidencia.length} foto(s) seleccionada(s)
                  </p>
                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                    {fotosEvidencia.map((file, idx) => (
                      <div key={idx} className="relative aspect-square">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover rounded border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          onClick={() => setFotosEvidencia(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setFotosEvidencia([])}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubirFotos}
                      disabled={subiendoFotos}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                    >
                      {subiendoFotos ? <Loader className="animate-spin" size={16} /> : <Camera size={16} />}
                      {subiendoFotos ? 'Subiendo...' : 'Subir Evidencia'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botones de Acción Principal */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowModalNoEntrega(true)}
                className="p-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex flex-col items-center gap-2"
              >
                <XCircle size={24} />
                <span className="font-bold">No Entregado</span>
              </button>

              <button
                onClick={() => setShowModalPago(true)}
                disabled={facturaActual.pago?.estado === 'pagada' || facturaActual.pago?.total <= 0}
                className="p-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DollarSign size={24} />
                <span className="font-bold">
                  {facturaActual.pago?.estado === 'pagada' ? 'Pagado' : 'Confirmar Pago'}
                </span>
              </button>

              <button
                onClick={() => setShowModalEntregar(true)}
                className="col-span-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle size={24} />
                <span className="font-bold text-lg">Finalizar Entrega</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Reportar Daño */}
        {showModalDano && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
            <div className="bg-white dark:bg-gray-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2"><AlertTriangle /> Reportar Daño</h3>
              <p className="mb-4 font-medium text-gray-800 dark:text-white">
                Item: {itemDanado?.producto || itemDanado?.descripcion || 'Item sin nombre'}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción del Daño</label>
                  <textarea
                    value={descripcionDano}
                    onChange={(e) => setDescripcionDano(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows="3"
                    placeholder="Describa el daño..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fotos del Daño</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setFotosDano(Array.from(e.target.files))}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowModalDano(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
                <button
                  onClick={handleReportarDano}
                  disabled={procesando}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {procesando ? <Loader className="animate-spin" size={16} /> : <AlertTriangle size={16} />}
                  Reportar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal No Entrega */}
        {showModalNoEntrega && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
            <div className="bg-white dark:bg-gray-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2"><XCircle /> Reportar No Entrega</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Motivo</label>
                  <select
                    value={motivoNoEntrega}
                    onChange={(e) => setMotivoNoEntrega(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Seleccione un motivo...</option>
                    <option value="cliente_ausente">Cliente Ausente</option>
                    <option value="direccion_incorrecta">Dirección Incorrecta</option>
                    <option value="rechazado">Rechazado por Cliente</option>
                    <option value="zona_peligrosa">Zona Peligrosa / Inaccesible</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                {motivoNoEntrega === 'otro' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Especificar Motivo</label>
                    <textarea
                      value={otroMotivoNoEntrega}
                      onChange={(e) => setOtroMotivoNoEntrega(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      rows="2"
                      placeholder="Especifique el motivo..."
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                  <textarea
                    value={descripcionNoEntrega}
                    onChange={(e) => setDescripcionNoEntrega(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows="3"
                    placeholder="Detalles adicionales..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fotos (Fachada/Prueba)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setFotosNoEntrega(Array.from(e.target.files))}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={intentarNuevamente}
                    onChange={(e) => setIntentarNuevamente(e.target.checked)}
                    id="reintento"
                  />
                  <label htmlFor="reintento" className="text-sm text-gray-700 dark:text-gray-300">Se puede reintentar hoy</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowModalNoEntrega(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
                <button
                  onClick={handleReportarNoEntrega}
                  disabled={procesando}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {procesando ? <Loader className="animate-spin" size={16} /> : <XCircle size={16} />}
                  Reportar Fallo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pago */}
        {showModalPago && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
            <div className="bg-white dark:bg-gray-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2"><DollarSign /> Confirmar Pago</h3>
              <p className="mb-4 text-gray-800 dark:text-white">
                Monto a cobrar: <span className="font-bold text-lg">RD$ {facturaActual.pago?.total.toFixed(2)}</span>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Seleccione un método...</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                {metodoPago === 'efectivo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Recibido (Efectivo)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(parseFloat(e.target.value))}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="0.00"
                    />
                    {montoRecibido > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Cambio: RD$ {(montoRecibido - (facturaActual.pago?.total || 0)).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Comentario (Opcional)</label>
                  <textarea
                    value={comentarioPago}
                    onChange={(e) => setComentarioPago(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows="2"
                    placeholder="Notas sobre el pago..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowModalPago(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
                <button
                  onClick={handleConfirmarPago}
                  disabled={procesando || !metodoPago || (metodoPago === 'efectivo' && montoRecibido < (facturaActual.pago?.total || 0))}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {procesando ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Finalizar Entrega */}
        {showModalEntregar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
            <div className="bg-white dark:bg-gray-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2"><CheckCircle /> Finalizar Entrega</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Recibido por (Nombre)</label>
                  <input
                    type="text"
                    value={nombreReceptor}
                    onChange={(e) => setNombreReceptor(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Nombre de quien recibe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas de Entrega</label>
                  <textarea
                    value={notasEntrega}
                    onChange={(e) => setNotasEntrega(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows="2"
                    placeholder="Comentarios opcionales..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowModalEntregar(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
                <button
                  onClick={handleMarcarEntregada}
                  disabled={procesando}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {procesando ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  Confirmar Entrega
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Finalizar Ruta */}
        {showModalFinalizar && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
            <div className="bg-white dark:bg-gray-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-purple-600 flex items-center gap-2"><Truck /> Finalizar Ruta</h3>
              <p className="mb-4 text-gray-600 dark:text-gray-400">¿Está seguro de que desea finalizar la ruta? Esto cerrará todas las facturas pendientes como no entregadas.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Finales</label>
                <textarea
                  value={notasFinalizacion}
                  onChange={(e) => setNotasFinalizacion(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="3"
                  placeholder="Observaciones sobre la ruta..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowModalFinalizar(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
                <button
                  onClick={handleFinalizarRuta}
                  disabled={procesando}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {procesando ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                  Finalizar Ruta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Agregar Gasto */}
        {showModalGasto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
            <div className="bg-white dark:bg-gray-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-yellow-600 flex items-center gap-2">
                <DollarSign /> Agregar Gasto
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Gasto
                </label>
                <select
                  value={tipoGasto}
                  onChange={(e) => setTipoGasto(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="combustible">⛽ Combustible</option>
                  <option value="peaje">🛣️ Peaje</option>
                  <option value="comida">🍽️ Comida</option>
                  <option value="estacionamiento">🅿️ Estacionamiento</option>
                  <option value="mantenimiento">🔧 Mantenimiento</option>
                  <option value="otro">📝 Otro</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoGasto}
                  onChange={(e) => setMontoGasto(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={descripcionGasto}
                  onChange={(e) => setDescripcionGasto(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="3"
                  placeholder="Detalles adicionales del gasto..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowModalGasto(false);
                    resetFormGasto();
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAgregarGasto}
                  disabled={procesando || !montoGasto || parseFloat(montoGasto) <= 0}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {procesando ? <Loader className="animate-spin" size={16} /> : <DollarSign size={16} />}
                  Registrar Gasto
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PullToRefresh>
  );
};

export default PanelRepartidores;