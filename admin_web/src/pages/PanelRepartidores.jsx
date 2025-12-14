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
  Image,
  Printer,
  Bell,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PullToRefresh from '../components/common/PullToRefresh';
import logo from '../assets/logo.png';

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
  const [conNCF, setConNCF] = useState(false);
  const [numeroNCF, setNumeroNCF] = useState('');
  const [rncGasto, setRncGasto] = useState('');
  const [fotosGasto, setFotosGasto] = useState([]);

  // ==============================================================================
  // 🔄 EFECTOS Y CARGA DE DATOS
  // ==============================================================================
  const cargarDetalleRuta = async (rutaId) => {
    try {
      setLoadingDetalle(true);
      const response = await api.get(`/repartidores/rutas/${rutaId}`);
      if (response.data.success) {
        console.log('📥 Datos recibidos del servidor - Total facturas:', response.data.data.facturas?.length);

        // Log detallado de la primera factura para debugging
        if (response.data.data.facturas?.[0]) {
          const primeraFactura = response.data.data.facturas[0];
          console.log('📥 Primera factura completa:', {
            id: primeraFactura.id,
            numeroFactura: primeraFactura.numeroFactura,
            items: primeraFactura.items
          });
          console.log('📥 Items RAW de primera factura:', JSON.stringify(primeraFactura.items, null, 2));
        }

        setRutaSeleccionada(response.data.data);
        cargarGastos(rutaId);

        if (vistaActual === 'factura' && facturaActual) {
          const updatedFactura = response.data.data.facturas.find(f => f.id === facturaActual.id);
          if (updatedFactura) {
            console.log('🔄 Actualizando facturaActual ID:', updatedFactura.id);
            console.log('🔄 Items RAW que se van a guardar en estado:', JSON.stringify(updatedFactura.items, null, 2));
            setFacturaActual(updatedFactura);
            console.log('✅ setFacturaActual llamado con items:', updatedFactura.items?.map(i => ({
              desc: i.descripcion,
              entregado: i.entregado
            })));
          }
        } else {
          // Cambiar a vista de ruta solo si no estamos en vista de factura
          setVistaActual('ruta');
        }
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

    // Prevenir doble click o múltiples entregas del mismo item
    const item = facturaActual.items[itemIndex];
    if (item?.entregado || item?._optimistic) {
      console.warn('⚠️ Item ya entregado, ignorando acción duplicada');
      return;
    }

    try {
      console.log(`📦 Entregando item ${itemIndex} de factura ${facturaActual.id}`);

      // ✅ Actualización optimista inmediata
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

      // ✅ Llamada al servidor
      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/items/entregar`,
        { itemIndex }
      );

      if (response.data.success) {
        console.log(`✅ Item ${itemIndex} entregado exitosamente en servidor`);
        toast.success('📦 Item entregado');
        // ✅ Recargar ruta para obtener datos actualizados
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('❌ Error al entregar item:', error);
      toast.error('❌ Error al entregar item');
      // ✅ Rollback en caso de error
      await cargarDetalleRuta(rutaSeleccionada.id);
    }
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

    // Validar que se hayan subido fotos del daño
    if (!fotosDano || fotosDano.length === 0) {
      toast.warning('Debe tomar al menos una foto del item dañado como evidencia.');
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

    // Validar que se hayan subido fotos de evidencia
    if (!fotosNoEntrega || fotosNoEntrega.length === 0) {
      toast.warning('Debe tomar al menos una foto como evidencia de la no entrega.');
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

    // Validar que se hayan subido fotos de evidencia
    if (!facturaActual.fotosEntrega || facturaActual.fotosEntrega.length === 0) {
      toast.warning('Debe subir al menos una foto de evidencia antes de finalizar la entrega.');
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
      const errorMsg = e.response?.data?.message || 'Error al confirmar entrega';
      toast.error(errorMsg);
      console.error('Error confirmando entrega:', e);

      // Recargar datos de la ruta para reflejar el estado correcto
      if (rutaSeleccionada?.id) {
        await cargarDetalleRuta(rutaSeleccionada.id);
      }

      // Si ya fue entregada, cerrar el modal
      if (errorMsg.includes('ya fue entregada')) {
        setShowModalEntregar(false);
        resetFormEntregar();
      }
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

    // ✅ VALIDACIONES FISCALES
    if (conNCF) {
      if (!numeroNCF || numeroNCF.length < 11) {
        toast.error('Ingrese un NCF válido (11 caracteres)');
        return;
      }
      if (!rncGasto || (rncGasto.length !== 9 && rncGasto.length !== 11)) {
        toast.error('Ingrese un RNC válido (9 u 11 dígitos)');
        return;
      }
      if (fotosGasto.length === 0) {
        toast.error('La foto es OBLIGATORIA para gastos con NCF');
        return;
      }
    }

    try {
      setProcesando(true);

      // ✅ SUBIR FOTO SI EXISTE
      let fotoUrl = null;
      if (fotosGasto.length > 0) {
        const urls = await subirArchivosAFirebase(fotosGasto, 'gastos_fiscales');
        if (urls.length > 0) {
          // Manejar formato de retorno de subirArchivosAFirebase
          fotoUrl = urls[0].original || urls[0];
        }
      }

      const response = await api.post(`/gastos-ruta/${rutaSeleccionada.id}`, {
        tipo: tipoGasto,
        monto: parseFloat(montoGasto),
        descripcion: descripcionGasto,
        // ✅ CAMPOS FISCALES
        ncf: conNCF ? numeroNCF : null,
        rnc: conNCF ? rncGasto : null,
        imgUrl: fotoUrl
      });

      if (response.data.success) {
        toast.success('💰 Gasto registrado');
        setShowModalGasto(false);
        resetFormGasto();
        cargarGastos(rutaSeleccionada.id);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar gasto');
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
    setConNCF(false);
    setNumeroNCF('');
    setRncGasto('');
    setFotosGasto([]);
  };

  // ==============================================================================
  // 🖥️ RENDER
  // ==============================================================================
  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-20">
        {/* Header - Sticky en mobile */}
        <div className="sticky top-0 z-40 bg-white dark:bg-slate-800 shadow-sm">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              {/* Logo + Titulo */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <img src={logo} alt="ProLogix" className="h-8 sm:h-10 w-auto object-contain flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent truncate">
                    ProLogix
                  </h1>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
                    {userData?.nombre || 'Repartidor'}
                  </p>
                </div>
              </div>

              {/* Indicators y Usuario - más compactos */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <ConnectionStatusIndicator />
                <LiveIndicator />

                {/* Campana de notificaciones */}
                <button className="relative p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Avatar Usuario */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                  {userData?.nombre?.charAt(0).toUpperCase() || 'R'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-3 sm:p-4">

          {/* VISTA: LISTA DE RUTAS */}
          {vistaActual === 'lista' && (
            <div className="space-y-3 xxs:space-y-4">
              <h2 className="text-base xxs:text-lg xs:text-xl font-semibold text-slate-800 dark:text-slate-200">Mis Rutas Asignadas</h2>
              {loadingRutas ? (
                <div className="flex justify-center p-8"><Loader className="animate-spin text-indigo-600" /></div>
              ) : rutasRealtime?.length > 0 ? (
                rutasRealtime.map(ruta => (
                  <div key={ruta.id} className="bg-white dark:bg-slate-800 p-3 xxs:p-4 rounded-lg shadow-md border-l-4 border-indigo-600">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base xxs:text-lg dark:text-white truncate">{ruta.nombre}</h3>
                        <p className="text-xs xxs:text-sm text-slate-500 dark:text-slate-400">
                          {new Date(ruta.fecha_programada).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap flex-shrink-0 ${ruta.estado === 'en_curso' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {ruta.estado.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 xxs:mt-4 gap-2">
                      <div className="text-xs xxs:text-sm text-slate-600 dark:text-slate-300">
                        <p>{ruta.facturas?.length || 0} entregas</p>
                      </div>
                      <button
                        onClick={() => cargarDetalleRuta(ruta.id)}
                        className="px-3 xxs:px-4 py-2 text-xs xxs:text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center gap-1 xxs:gap-2 whitespace-nowrap"
                      >
                        Ver Ruta <ArrowLeft className="rotate-180" size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg">
                  <Truck className="mx-auto h-12 w-12 text-slate-400 mb-2" />
                  <p className="text-slate-500 dark:text-slate-400">No tienes rutas activas asignadas</p>
                </div>
              )}
            </div>
          )}

          {/* VISTA: DETALLE DE RUTA */}
          {vistaActual === 'ruta' && rutaSeleccionada && (
            <div className="space-y-3 sm:space-y-4">
              <button onClick={volverALista} className="flex items-center text-slate-600 dark:text-slate-400 mb-2 text-sm sm:text-base">
                <ArrowLeft size={18} className="mr-1 sm:mr-2" /> Volver
              </button>

              <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg shadow-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold dark:text-white truncate">{rutaSeleccionada.nombre}</h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {rutaSeleccionada.facturas?.filter(f => f.estado === 'entregada').length} / {rutaSeleccionada.facturas?.length} completadas
                    </p>
                  </div>
                  {rutaSeleccionada.estado === 'cargada' ? (
                    <button
                      onClick={handleIniciarEntregas}
                      disabled={procesando}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <Truck size={16} /> Iniciar Entregas
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const printUrl = `${window.location.origin}/rutas/${rutaSeleccionada.id}/imprimir`;
                          window.open(printUrl, '_blank');
                        }}
                        className="p-2 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        title="Imprimir"
                      >
                        <Printer size={18} />
                      </button>
                      <button
                        onClick={() => setShowModalGasto(true)}
                        className="p-2 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                        title="Gasto"
                      >
                        <DollarSign size={18} />
                      </button>
                      <button
                        onClick={() => setShowModalFinalizar(true)}
                        className="px-2 sm:px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                      >
                        Finalizar
                      </button>
                    </div>
                  )}
                </div>

                {/* Resumen de Gastos */}
                {totalGastos > 0 && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                      Gastos: <span className="text-rose-600">RD$ {totalGastos.toFixed(2)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2 sm:space-y-3">
                {rutaSeleccionada.facturas?.map((factura, index) => (
                  <div
                    key={factura.id}
                    onClick={() => {
                      setFacturaActual(factura);
                      setVistaActual('factura');
                    }}
                    className={`p-3 sm:p-4 rounded-lg shadow-sm border-l-4 cursor-pointer transition-all ${factura.estado === 'entregada' ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-900/20' :
                      factura.estado === 'no_entregada' ? 'bg-rose-50 border-rose-500 dark:bg-rose-900/20' :
                        'bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <span className="bg-slate-200 dark:bg-slate-700 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">{factura.destinatario?.nombre}</p>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                            {factura.destinatario?.direccion}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {factura.estado === 'entregada' && <CheckCircle className="text-emerald-600" size={18} />}
                        {factura.estado === 'no_entregada' && <XCircle className="text-rose-600" size={18} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA: DETALLE DE FACTURA (ENTREGA) */}
          {vistaActual === 'factura' && facturaActual && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <button onClick={volverARuta} className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-full dark:hover:bg-slate-700">
                  <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg sm:text-xl font-bold dark:text-white">Entrega</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Cliente</p>
                  <p className="font-bold text-base sm:text-lg text-slate-900 dark:text-white break-words">{facturaActual.destinatario?.nombre}</p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2 mt-1">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                    <span className="break-words">{facturaActual.destinatario?.direccion}</span>
                  </p>
                  <div className="flex gap-2 flex-wrap mt-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(facturaActual.destinatario?.direccion || '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm text-xs sm:text-sm"
                    >
                      <Navigation size={14} />
                      Maps
                    </a>
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(facturaActual.destinatario?.direccion || '')}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium shadow-sm text-xs sm:text-sm"
                    >
                      <Navigation size={14} />
                      Waze
                    </a>
                  </div>
                </div>
                <div className="pt-3 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-4">
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">Pago Contraentrega:</p>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400">${facturaActual.pago?.total?.toFixed(2) || '0.00'}</p>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Estado: <span className={`font-bold ${facturaActual.pago?.estado === 'pagada' ? 'text-emerald-600' : 'text-amber-600'}`}>{facturaActual.pago?.estado === 'pagada' ? 'Pagado' : 'Pendiente'}</span></p>
                </div>
              </div>

              {/* Items Checklist */}
              <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                <Package size={18} /> Items a Entregar
              </h3>
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {facturaActual.items?.map((item, index) => {
                  // Determinar el estado del item
                  const isDanado = item.danado || item.estadoItem === 'danado';
                  const isEntregado = item.entregado || item.estadoItem === 'entregado';
                  const isNoEntregado = item.estadoItem === 'no_entregado';

                  // Clases de fondo según estado
                  let bgClasses = 'bg-slate-50 border-slate-200 dark:bg-slate-700 dark:border-slate-600';
                  if (isEntregado) {
                    bgClasses = 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800';
                  } else if (isDanado) {
                    bgClasses = 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
                  } else if (isNoEntregado) {
                    bgClasses = 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800';
                  }

                  // 🔍 DEBUG: Log completo del ciclo de render
                  if (import.meta.env.DEV) {
                    console.log(`🎨 RENDER Item ${index}:`, {
                      descripcion: item.descripcion || item.producto,
                      'item.entregado': item.entregado,
                      'item.estadoItem': item.estadoItem,
                      'item.danado': item.danado,
                      'item._optimistic': item._optimistic,
                      '---COMPUTED---': '---',
                      'isDanado': isDanado,
                      'isEntregado': isEntregado,
                      'isNoEntregado': isNoEntregado,
                      '---RENDER---': '---',
                      'bgClasses': bgClasses,
                      'willShowEntregadoBadge': isEntregado,
                      'willShowButtons': !isEntregado && !isDanado && !isNoEntregado
                    });
                  }

                  return (
                    <div
                      key={index}
                      className={`p-2.5 sm:p-3 border rounded-lg flex justify-between items-center gap-2 ${bgClasses} ${item._optimistic ? 'opacity-70' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base text-slate-900 dark:text-white break-words">
                          {item.producto || item.descripcion || 'Item sin nombre'}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Cant: {item.cantidad}</p>
                        {isDanado && item.descripcionDano && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠️ {item.descripcionDano}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        {isEntregado ? (
                          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                            <CheckCircle size={16} className="fill-current" />
                            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">Entregado</span>
                          </div>
                        ) : isDanado ? (
                          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                            <AlertTriangle size={16} className="fill-current" />
                            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">Dañado</span>
                          </div>
                        ) : isNoEntregado ? (
                          <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full">
                            <XCircle size={16} className="fill-current" />
                            <span className="font-medium text-xs sm:text-sm whitespace-nowrap">No Entregado</span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEntregarItem(index)}
                              className="p-1.5 sm:p-2 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition"
                              title="Entregar"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setItemDanado({ ...item, index });
                                setShowModalDano(true);
                              }}
                              className="p-1.5 sm:p-2 bg-rose-100 text-rose-700 rounded-full hover:bg-rose-200 transition"
                              title="Daño"
                            >
                              <AlertTriangle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Evidencia Fotográfica Section */}
              <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg shadow-sm mb-4 sm:mb-6">
                <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3 text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera size={18} /> Evidencia
                </h3>

                <div className="flex gap-2 mb-3 sm:mb-4">
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
                    <div className="w-full px-2 py-2 sm:px-3 sm:py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 font-medium text-sm sm:text-base">
                      <Camera size={18} />
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
                    <div className="w-full px-2 py-2 sm:px-3 sm:py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 font-medium text-sm sm:text-base">
                      <Image size={18} />
                      <span>Galería</span>
                    </div>
                  </label>
                </div>

                {fotosEvidencia.length > 0 && (
                  <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      📸 {fotosEvidencia.length} foto(s)
                    </p>
                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                      {fotosEvidencia.map((file, idx) => (
                        <div key={idx} className="relative aspect-square">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover rounded border border-slate-300 dark:border-slate-600"
                          />
                          <button
                            onClick={() => setFotosEvidencia(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-1 hover:bg-rose-700"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => setFotosEvidencia([])}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 text-slate-600 dark:text-slate-400 text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSubirFotos}
                        disabled={subiendoFotos}
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 font-medium text-sm"
                      >
                        {subiendoFotos ? <Loader className="animate-spin" size={14} /> : <Camera size={14} />}
                        {subiendoFotos ? 'Subiendo...' : 'Subir'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Acción Principal */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => setShowModalNoEntrega(true)}
                  className="p-3 sm:p-4 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition flex flex-col items-center gap-1.5 sm:gap-2"
                >
                  <XCircle size={20} />
                  <span className="font-bold text-xs sm:text-sm">No Entregado</span>
                </button>

                <button
                  onClick={() => setShowModalPago(true)}
                  disabled={facturaActual.pago?.estado === 'pagada' || facturaActual.pago?.total <= 0}
                  className="p-3 sm:p-4 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition flex flex-col items-center gap-1.5 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DollarSign size={20} />
                  <span className="font-bold text-xs sm:text-sm text-center">
                    {facturaActual.pago?.estado === 'pagada' ? 'Pagado' : 'Confirmar Pago'}
                  </span>
                </button>

                <button
                  onClick={() => setShowModalEntregar(true)}
                  disabled={facturaActual.estado === 'entregada' || facturaActual.estadoGeneral === 'entregada'}
                  className={`col-span-2 p-3 sm:p-4 rounded-lg transition flex items-center justify-center gap-2 shadow-lg ${facturaActual.estado === 'entregada' || facturaActual.estadoGeneral === 'entregada'
                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                  <CheckCircle size={20} />
                  <span className="font-bold text-sm sm:text-base">
                    {facturaActual.estado === 'entregada' || facturaActual.estadoGeneral === 'entregada' ? 'Ya Entregada' : 'Finalizar Entrega'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Modal Reportar Daño */}
          {showModalDano && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
              <div className="bg-white dark:bg-slate-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-rose-600 flex items-center gap-2"><AlertTriangle /> Reportar Daño</h3>
                <p className="mb-4 font-medium text-slate-800 dark:text-white">
                  Item: {itemDanado?.producto || itemDanado?.descripcion || 'Item sin nombre'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción del Daño</label>
                    <textarea
                      value={descripcionDano}
                      onChange={(e) => setDescripcionDano(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      rows="3"
                      placeholder="Describa el daño..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fotos del Daño</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => setFotosDano(Array.from(e.target.files))}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowModalDano(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancelar</button>
                  <button
                    onClick={handleReportarDano}
                    disabled={procesando}
                    className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
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
              <div className="bg-white dark:bg-slate-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-rose-600 flex items-center gap-2"><XCircle /> Reportar No Entrega</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Motivo</label>
                    <select
                      value={motivoNoEntrega}
                      onChange={(e) => setMotivoNoEntrega(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
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
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Especificar Motivo</label>
                      <textarea
                        value={otroMotivoNoEntrega}
                        onChange={(e) => setOtroMotivoNoEntrega(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        rows="2"
                        placeholder="Especifique el motivo..."
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                    <textarea
                      value={descripcionNoEntrega}
                      onChange={(e) => setDescripcionNoEntrega(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      rows="3"
                      placeholder="Detalles adicionales..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fotos (Fachada/Prueba)</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => setFotosNoEntrega(Array.from(e.target.files))}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={intentarNuevamente}
                      onChange={(e) => setIntentarNuevamente(e.target.checked)}
                      id="reintento"
                    />
                    <label htmlFor="reintento" className="text-sm text-slate-700 dark:text-slate-300">Se puede reintentar hoy</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowModalNoEntrega(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancelar</button>
                  <button
                    onClick={handleReportarNoEntrega}
                    disabled={procesando}
                    className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
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
              <div className="bg-white dark:bg-slate-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-emerald-600 flex items-center gap-2"><DollarSign /> Confirmar Pago</h3>
                <p className="mb-4 text-slate-800 dark:text-white">
                  Monto a cobrar: <span className="font-bold text-lg">RD$ {(facturaActual.pago?.total || 0).toFixed(2)}</span>
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Método de Pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                      <option value="">Seleccione un método...</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </div>
                  {metodoPago === 'efectivo' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Monto Recibido (Efectivo)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={montoRecibido}
                        onChange={(e) => setMontoRecibido(parseFloat(e.target.value))}
                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        placeholder="0.00"
                      />
                      {montoRecibido > 0 && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Cambio: RD$ {(montoRecibido - (facturaActual.pago?.total || 0)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Comentario (Opcional)</label>
                    <textarea
                      value={comentarioPago}
                      onChange={(e) => setComentarioPago(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      rows="2"
                      placeholder="Notas sobre el pago..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowModalPago(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancelar</button>
                  <button
                    onClick={handleConfirmarPago}
                    disabled={procesando || !metodoPago || (metodoPago === 'efectivo' && montoRecibido < (facturaActual.pago?.total || 0))}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
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
              <div className="bg-white dark:bg-slate-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-emerald-600 flex items-center gap-2"><CheckCircle /> Finalizar Entrega</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Recibido por (Nombre)</label>
                    <input
                      type="text"
                      value={nombreReceptor}
                      onChange={(e) => setNombreReceptor(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="Nombre de quien recibe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notas de Entrega</label>
                    <textarea
                      value={notasEntrega}
                      onChange={(e) => setNotasEntrega(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      rows="2"
                      placeholder="Comentarios opcionales..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowModalEntregar(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancelar</button>
                  <button
                    onClick={handleMarcarEntregada}
                    disabled={procesando}
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
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
            <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md my-4 sm:my-0 flex flex-col max-h-[95vh] sm:max-h-[85vh]">
                {/* Header */}
                <div className="p-3 sm:p-4 border-b dark:border-slate-700 flex-shrink-0">
                  <h3 className="text-lg sm:text-xl font-bold text-purple-600 flex items-center gap-2">
                    <Truck size={20} /> Finalizar Ruta
                  </h3>
                </div>

                {/* Content - scrollable */}
                <div className="p-3 sm:p-4 overflow-y-auto flex-1">
                  <p className="mb-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    ¿Está seguro de que desea finalizar la ruta? Esto cerrará todas las facturas pendientes como no entregadas.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Notas Finales
                    </label>
                    <textarea
                      value={notasFinalizacion}
                      onChange={(e) => setNotasFinalizacion(e.target.value)}
                      className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      rows="3"
                      placeholder="Observaciones sobre la ruta..."
                    />
                  </div>
                </div>

                {/* Footer - fixed buttons */}
                <div className="p-3 sm:p-4 border-t dark:border-slate-700 flex justify-end gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowModalFinalizar(false)}
                    className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleFinalizarRuta}
                    disabled={procesando}
                    className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    {procesando ? <Loader className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                    Finalizar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Agregar Gasto */}
          {showModalGasto && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 xxs:p-3 xs:p-4">
              <div className="bg-white dark:bg-slate-800 p-3 xxs:p-4 xs:p-6 rounded-lg w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-amber-600 flex items-center gap-2">
                  <DollarSign /> Agregar Gasto
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tipo de Gasto
                  </label>
                  <select
                    value={tipoGasto}
                    onChange={(e) => setTipoGasto(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Monto (RD$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={montoGasto}
                    onChange={(e) => setMontoGasto(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={descripcionGasto}
                    onChange={(e) => setDescripcionGasto(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    rows="3"
                    placeholder="Detalles adicionales del gasto..."
                  />
                </div>

                {/* ✅ SECCIÓN FISCAL */}
                <div className="mb-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="checkNCF"
                      checked={conNCF}
                      onChange={(e) => setConNCF(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="checkNCF" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tengo Comprobante Fiscal (NCF)
                    </label>
                  </div>

                  {conNCF && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3 animation-fade-in">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">NCF</label>
                          <input
                            type="text"
                            maxLength={11}
                            value={numeroNCF}
                            onChange={(e) => setNumeroNCF(e.target.value.toUpperCase())}
                            className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-500 dark:text-white uppercase"
                            placeholder="B0100000001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">RNC</label>
                          <input
                            type="text"
                            maxLength={11}
                            value={rncGasto}
                            onChange={(e) => setRncGasto(e.target.value)}
                            className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-500 dark:text-white"
                            placeholder="131234567"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Foto Factura (Requerida)</label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => setFotosGasto(Array.from(e.target.files))}
                          className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200"
                        />
                        {fotosGasto.length > 0 && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle size={12} /> Foto lista para subir</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowModalGasto(false);
                      resetFormGasto();
                    }}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAgregarGasto}
                    disabled={procesando || !montoGasto || parseFloat(montoGasto) <= 0}
                    className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {procesando ? <Loader className="animate-spin" size={16} /> : <DollarSign size={16} />}
                    Registrar Gasto
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
        {/* End Content Container */}
      </div>
    </PullToRefresh>
  );
};

export default PanelRepartidores;