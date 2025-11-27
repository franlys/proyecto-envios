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
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const [vistaActual, setVistaActual] = useState('lista'); // 'lista', 'ruta', 'factura'
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [facturaActual, setFacturaActual] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // ==============================================================================
  // 🎣 ESTADOS DE MODALES Y FORMULARIOS
  // ==============================================================================
  // Modal Fotos
  const [showModalFotos, setShowModalFotos] = useState(false);
  const [fotosEvidencia, setFotosEvidencia] = useState([]);
  const [subiendoFotos, setSubiendoFotos] = useState(false);

  // Modal Pago
  const [showModalPago, setShowModalPago] = useState(false);
  const [montoPagado, setMontoPagado] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [notasPago, setNotasPago] = useState('');

  // Modal Daño
  const [showModalDano, setShowModalDano] = useState(false);
  const [itemDanado, setItemDanado] = useState(null);
  const [descripcionDano, setDescripcionDano] = useState('');
  const [fotosDano, setFotosDano] = useState([]);

  // Modal No Entrega
  const [showModalNoEntrega, setShowModalNoEntrega] = useState(false);
  const [motivoNoEntrega, setMotivoNoEntrega] = useState('');
  const [descripcionNoEntrega, setDescripcionNoEntrega] = useState('');
  const [fotosNoEntrega, setFotosNoEntrega] = useState([]);
  const [intentarNuevamente, setIntentarNuevamente] = useState(true);

  // Modal Entregar
  const [showModalEntregar, setShowModalEntregar] = useState(false);
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [notasEntrega, setNotasEntrega] = useState('');

  // Modal Finalizar Ruta
  const [showModalFinalizar, setShowModalFinalizar] = useState(false);
  const [notasFinalizacion, setNotasFinalizacion] = useState('');

  // Modal Gastos
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [tipoGasto, setTipoGasto] = useState('combustible');
  const [montoGasto, setMontoGasto] = useState('');
  const [descripcionGasto, setDescripcionGasto] = useState('');
  const [gastos, setGastos] = useState([]);
  const [totalGastos, setTotalGastos] = useState(0);

  // Efecto para sincronizar ruta seleccionada con datos realtime
  useEffect(() => {
    if (rutaSeleccionada && rutasRealtime) {
      const rutaActualizada = rutasRealtime.find(r => r.id === rutaSeleccionada.id);
      if (rutaActualizada) {
        const fechaActualizada = rutaActualizada.updatedAt?.seconds || rutaActualizada.updatedAt;
        const fechaSeleccionada = rutaSeleccionada.updatedAt?.seconds || rutaSeleccionada.updatedAt;

        if (fechaActualizada !== fechaSeleccionada) {
          if (rutaActualizada.estado !== rutaSeleccionada.estado ||
            rutaActualizada.facturasCompletadas !== rutaSeleccionada.facturasCompletadas) {
            setRutaSeleccionada(prev => ({ ...prev, ...rutaActualizada }));
          }
        }
      }
    }
  }, [rutasRealtime, rutaSeleccionada]);

  // Helper para recargar el detalle de una ruta
  const cargarDetalleRuta = async (rutaId) => {
    try {
      setLoadingDetalle(true);
      const response = await api.get(`/repartidores/rutas/${rutaId}`);
      if (response.data.success) {
        setRutaSeleccionada(response.data.data);

        // Cargar gastos de la ruta
        try {
          const gastosResponse = await api.get(`/gastos-ruta/${rutaId}`);
          if (gastosResponse.data.success) {
            setGastos(gastosResponse.data.data.gastos || []);
            setTotalGastos(gastosResponse.data.data.totalGastos || 0);
          }
        } catch (gastosError) {
          console.error('Error cargando gastos:', gastosError);
        }

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

  const cargarRutasAsignadas = async () => {
    setVistaActual('lista');
  };

  // ==============================================================================
  // ☁️ LÓGICA DE SUBIDA DE ARCHIVOS (Firebase) CON THUMBNAILS
  // ==============================================================================
  const subirArchivosAFirebase = async (archivos, carpeta) => {
    const urls = [];
    if (!archivos || archivos.length === 0) return urls;

    const idReferencia = facturaActual?.id || rutaSeleccionada?.id || 'temp';

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const startTime = Date.now();

      try {
        const variants = await generateImageVariants(archivo, {
          onProgress: (progress) => {
            if (progress.stage === 'thumbnail') {
              toast.loading(`Generando thumbnail ${i + 1}...`, { id: `process-${i}` });
            } else if (progress.stage === 'preview') {
              toast.loading(`Generando preview ${i + 1}...`, { id: `process-${i}` });
            }
          }
        });

        const originalPath = `repartidores/${carpeta}/${idReferencia}/${Date.now()}_${archivo.name}`;
        const originalRef = ref(storage, originalPath);
        await uploadBytes(originalRef, archivo);
        const originalUrl = await getDownloadURL(originalRef);

        const thumbPath = getStoragePathForVariant(originalPath, 'thumb');
        const thumbRef = ref(storage, thumbPath);
        const thumbFile = variantBlobToFile(variants.thumbnail.blob, `thumb_${archivo.name}`);
        await uploadBytes(thumbRef, thumbFile);
        const thumbUrl = await getDownloadURL(thumbRef);

        const previewPath = getStoragePathForVariant(originalPath, 'preview');
        const previewRef = ref(storage, previewPath);
        const previewFile = variantBlobToFile(variants.preview.blob, `preview_${archivo.name}`);
        await uploadBytes(previewRef, previewFile);
        const previewUrl = await getDownloadURL(previewRef);

        toast.dismiss(`process-${i}`);

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

      // Extraer solo las URLs originales para enviar al backend
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

  const handleConfirmarPago = async () => {
    if (!facturaActual || !montoPagado || isNaN(parseFloat(montoPagado))) {
      toast.warning('El monto pagado es obligatorio y debe ser un número válido.');
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
          notasEntrega,
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

    // Usamos toast.promise para feedback inmediato y mejor UX
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

  const resetFormNoEntrega = () => {
    setMotivoNoEntrega('');
    setDescripcionNoEntrega('');
    setFotosNoEntrega([]);
    setIntentarNuevamente(true);
  };

  const resetFormEntregar = () => {
    setNombreReceptor('');
    setNotasEntrega('');
  };

  const resetFormPago = () => {
    setMontoPagado('');
    setMetodoPago('efectivo');
  };

  // ==============================================================================
  // 💰 GESTIÓN DE GASTOS
  // ==============================================================================
  const cargarGastos = async () => {
    if (!rutaSeleccionada) return;

    try {
      const response = await api.get(`/gastos-ruta/${rutaSeleccionada.id}`);
      if (response.data.success) {
        setGastos(response.data.data.gastos || []);
        setTotalGastos(response.data.data.totalGastos || 0);
      }
    } catch (error) {
      console.error('Error cargando gastos:', error);
    }
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
        await cargarGastos();
      }
    } catch (error) {
      console.error('Error agregando gasto:', error);
      toast.error('Error al registrar el gasto');
    } finally {
      setProcesando(false);
    }
  };

  const resetFormGasto = () => {
    setTipoGasto('combustible');
    setMontoGasto('');
    setDescripcionGasto('');
    setReferenciaPago('');
    setNotasPago('');
  };

  const resetFormDano = () => {
    setItemDanado(null);
    setDescripcionDano('');
    setFotosDano([]);
  };

  const seleccionarFacturaParaGestion = (factura) => {
    setFacturaActual(factura);
    setVistaActual('factura');
    // Cargar datos de pago si ya existen
    setMontoPagado(factura.pago?.montoPagado?.toString() || '');
  };

  // Helper para volver a la vista de lista
  const volverALista = () => {
    setVistaActual('lista');
    setRutaSeleccionada(null);
    setFacturaActual(null);
    cargarRutasAsignadas();
  };

  // Helper para volver a la vista de ruta
  const volverARuta = async () => {
    setVistaActual('ruta');
    setFacturaActual(null);
    // Recargar para asegurar la sincronización de la lista de facturas de la ruta
    await cargarDetalleRuta(rutaSeleccionada.id);
  };

  const calcularProgreso = (factura) => {
    if (!factura.itemsTotal || factura.itemsTotal === 0) return 0;
    const entregados = factura.itemsEntregados || 0;
    // Aseguramos que itemsTotal esté presente para el cálculo
    const itemsTotal = factura.items?.length || factura.itemsTotal;
    if (itemsTotal === 0) return 0;
    return Math.round((entregados / itemsTotal) * 100);
  };

  // ==============================================================================
  // 📱 RENDER UI
  // ==============================================================================
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pb-20">
      {/* Header con Indicadores de Estado */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          {vistaActual !== 'lista' && (
            <button onClick={vistaActual === 'ruta' ? volverALista : volverARuta} className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <ArrowLeft size={24} />
            </button>
          )}
          Panel Repartidor
        </h1>
        <div className="flex items-center gap-2">
          <ConnectionStatusIndicator />
          <LiveIndicator />
        </div>
      </div>

      {/* ==============================================================================
            VISTA: LISTA DE RUTAS
            ============================================================================== */}
      {vistaActual === 'lista' && (
        <div className="space-y-4">
          {loadingRutas ? (
            <div className="text-center py-8">
              <Loader className="animate-spin mx-auto text-blue-600" size={32} />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando rutas asignadas...</p>
            </div>
          ) : rutasRealtime?.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
              <Truck className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No tienes rutas activas asignadas.</p>
              <button onClick={cargarRutasAsignadas} className="mt-4 text-blue-600 hover:underline">Actualizar</button>
            </div>
          ) : (
            rutasRealtime?.map(ruta => (
              <div
                key={ruta.id}
                onClick={() => cargarDetalleRuta(ruta.id)}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border-l-4 border-blue-500 relative overflow-hidden"
              >
                {/* Badge de nuevos datos si aplica */}
                <NewDataBadge timestamp={ruta.updatedAt} />

                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{ruta.nombre}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <MapPin size={14} /> {ruta.zona}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(ruta.fechaAsignacion).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${ruta.estado === 'en_entrega' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                      {ruta.estado === 'en_entrega' ? 'En Ruta' : 'Asignada'}
                    </span>
                    <p className="text-sm font-bold mt-2 text-gray-700 dark:text-gray-300">
                      {ruta.facturasCompletadas || 0}/{ruta.totalFacturas || 0} Entregas
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==============================================================================
          VISTA: DETALLE DE RUTA (Lista de Facturas)
          ============================================================================== */}
      {vistaActual === 'ruta' && rutaSeleccionada && (
        <div>
          {/* Cabecera de Ruta y Botones */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Truck className="text-blue-600" size={32} />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{rutaSeleccionada.nombre}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1"><MapPin size={14} /> {rutaSeleccionada.zona}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Indicador de Balance si hay monto asignado */}
              {rutaSeleccionada.montoAsignado > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Balance</div>
                  <div className={`text-lg font-bold ${
                    (rutaSeleccionada.montoAsignado - totalGastos) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    ${((rutaSeleccionada.montoAsignado || 0) - totalGastos).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${rutaSeleccionada.montoAsignado} - ${totalGastos.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Botón Agregar Gasto */}
              {rutaSeleccionada.estado === 'en_entrega' && (
                <button
                  onClick={() => setShowModalGasto(true)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition flex items-center gap-2 font-medium"
                >
                  <DollarSign size={18} /> Agregar Gasto
                </button>
              )}

              {/* Botón Finalizar Ruta */}
              {rutaSeleccionada.estado === 'en_entrega' ? (
                <button
                  onClick={() => setShowModalFinalizar(true)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 font-medium"
                >
                  <CheckCircle size={18} /> Finalizar Ruta
                </button>
              ) : null}
            </div>

            {rutaSeleccionada.estado === 'cargada' && (
              <button
                onClick={handleIniciarEntregas}
                disabled={procesando}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-medium disabled:opacity-50"
              >
                {procesando ? <Loader className="animate-spin" size={18} /> : <Navigation size={18} />}
                {procesando ? 'Iniciando...' : 'Iniciar Entregas'}
              </button>
            )}
          </div>

          {/* Lista de facturas */}
          <div className="space-y-4">
            {rutaSeleccionada.facturas?.map(f => (
              <div
                key={f.id}
                onClick={() => !f.estado || f.estado === 'asignado' || f.estado === 'en_entrega' || f.estado === 'en_ruta' ? seleccionarFacturaParaGestion(f) : null}
                className={`p-4 rounded-lg shadow-md transition cursor-pointer flex justify-between items-center ${f.estado === 'entregada'
                  ? 'border-l-8 border-green-500 bg-green-50 dark:bg-green-900/20'
                  : f.estado === 'no_entregada'
                    ? 'border-l-8 border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-l-8 border-blue-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                style={{ cursor: !f.estado || f.estado === 'asignado' || f.estado === 'en_entrega' || f.estado === 'en_ruta' ? 'pointer' : 'default' }}
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                    <FileText size={18} className="text-blue-600" />
                    {f.codigoTracking}
                  </h4>
                  <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">👤 {f.destinatario?.nombre}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">📍 {f.destinatario?.direccion}</p>

                  {/* Botones de navegación inline */}
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.destinatario?.direccion || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition"
                    >
                      <Navigation size={12} />
                      Maps
                    </a>
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(f.destinatario?.direccion || '')}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500 text-white rounded text-xs hover:bg-cyan-600 transition"
                    >
                      <Navigation size={12} />
                      Waze
                    </a>
                  </div>

                  {f.pago?.estado !== 'pagada' && f.pago?.total > 0 && (
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                      <DollarSign size={14} /> Cobrar: ${f.pago.total.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{f.itemsEntregados || 0}/{f.items?.length || f.itemsTotal || 0} items</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium mt-1 inline-flex items-center gap-1 ${f.estado === 'entregada' ? 'bg-green-200 text-green-800' :
                    f.estado === 'no_entregada' ? 'bg-orange-200 text-orange-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                    {f.estado === 'entregada' ? <CheckCircle size={12} /> : f.estado === 'no_entregada' ? <XCircle size={12} /> : <Package size={12} />}
                    {f.estadoTexto || f.estado}
                  </span>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">{calcularProgreso(f)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ==============================================================================
          VISTA: GESTIÓN DE FACTURA (Detalle)
          ============================================================================== */}
      {vistaActual === 'factura' && facturaActual && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{facturaActual.codigoTracking}</h2>

          {/* Cliente Info & Pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><MapPin size={18} /> {facturaActual.destinatario?.nombre}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{facturaActual.destinatario?.direccion}</p>

              {/* Botones de Navegación */}
              <div className="flex gap-2 flex-wrap">
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
                        title="Reportar daño"
                      >
                        <AlertTriangle size={20} />
                      </button>
                    </>
                  )}
                  {item.entregado && <CheckCircle className="text-green-600" size={24} />}
                </div>
              </div>
            ))}
          </div>

          {/* Botones de Acción Principal */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setShowModalFotos(true)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2"
            >
              <Camera size={20} /> Subir Evidencia Fotográfica
            </button>

            {facturaActual.pago?.estado !== 'pagada' && facturaActual.pago?.total > 0 && (
              <button
                onClick={() => setShowModalPago(true)}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition flex justify-center items-center gap-2"
              >
                <DollarSign size={20} /> Confirmar Pago
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => setShowModalNoEntrega(true)}
                className="py-3 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition flex justify-center items-center gap-2"
              >
                <XCircle size={20} /> No Entregado
              </button>
              <button
                onClick={() => setShowModalEntregar(true)}
                className="py-3 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200 transition flex justify-center items-center gap-2"
              >
                <CheckCircle size={20} /> Finalizar Entrega
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==============================================================================
            MODALES
            ============================================================================== */}

      {/* Modal Fotos */}
      {showModalFotos && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📸 Evidencia de Entrega</h3>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFotosEvidencia(Array.from(e.target.files))}
              className="w-full mb-4 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModalFotos(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
              <button
                onClick={handleSubirFotos}
                disabled={subiendoFotos || fotosEvidencia.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {subiendoFotos ? <Loader className="animate-spin" size={16} /> : <Camera size={16} />}
                {subiendoFotos ? 'Subiendo...' : 'Subir Fotos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">💰 Confirmar Pago</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Pagado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Método de Pago</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              {metodoPago !== 'efectivo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Referencia</label>
                  <input
                    type="text"
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="# Referencia"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notas</label>
                <textarea
                  value={notasPago}
                  onChange={(e) => setNotasPago(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows="2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowModalPago(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400">Cancelar</button>
              <button
                onClick={handleConfirmarPago}
                disabled={procesando}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {procesando ? <Loader className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reportar Daño */}
      {showModalDano && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
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

      {/* Modal Finalizar Entrega */}
      {showModalEntregar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
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
  );
};

export default PanelRepartidores;