// admin_web/src/pages/PanelRepartidores.jsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner'; // Asumimos que tienes 'sonner' configurado para notificaciones
import api from '../services/api'; // Servicio API
import { storage } from '../services/firebase.js'; // Servicio de Firebase Storage (asumido)
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

  // ==============================================================================
  // 🔄 EFECTOS Y CARGA DE DATOS
  // ==============================================================================
  // Efecto para sincronizar ruta seleccionada con datos realtime
  useEffect(() => {
    if (rutaSeleccionada && rutasRealtime) {
      const rutaActualizada = rutasRealtime.find(r => r.id === rutaSeleccionada.id);
      if (rutaActualizada) {
        // Solo actualizamos si hay cambios relevantes para evitar re-renders innecesarios
        // o si estamos explícitamente buscando nuevos datos
        if (JSON.stringify(rutaActualizada) !== JSON.stringify(rutaSeleccionada)) {
          // Mantener la selección actual pero con datos frescos
          setRutaSeleccionada(prev => ({ ...prev, ...rutaActualizada }));
        }
      }
    }
  }, [rutasRealtime, rutaSeleccionada]);

  // Cargar rutas asignadas (fallback inicial)
  const cargarRutasAsignadas = async () => {
    // Esta función ahora es principalmente para la carga inicial si realtime falla
    // o para forzar un refresco manual
    try {
      // La lógica principal está en useMisRutasActivas
    } catch (e) {
      console.error(e);
    }
  };

  // Helper para recargar el detalle de una ruta
  const cargarDetalleRuta = async (rutaId) => {
    try {
      setLoadingDetalle(true);
      const response = await api.get(`/repartidores/rutas/${rutaId}`);
      if (response.data.success) {
        setRutaSeleccionada(response.data.data);
        // Si estábamos en detalle de factura, actualizamos la factura actual con los nuevos datos
        if (vistaActual === 'factura' && facturaActual) {
          const updatedFactura = response.data.data.facturas.find(f => f.id === facturaActual.id);
          // Esto es crucial para que la vista de detalle se actualice
          if (updatedFactura) {
            setFacturaActual(updatedFactura);
          }
        }
        // Solo cambiamos la vista si venimos de la lista
        if (vistaActual === 'lista') setVistaActual('ruta');
      }
    } catch (e) {
      toast.error('Error cargando detalle de ruta');
      console.error(e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  // ==============================================================================
  // ☁️ LÓGICA DE SUBIDA DE ARCHIVOS (Firebase) CON THUMBNAILS
  // ==============================================================================
  const subirArchivosAFirebase = async (archivos, carpeta) => {
    const urls = [];
    if (!archivos || archivos.length === 0) return urls;

    // Usamos el ID de la factura para el path, o el de la ruta si es una finalización
    const idReferencia = facturaActual?.id || rutaSeleccionada?.id || 'temp';

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const startTime = Date.now();

      try {
        // 1. Generar variantes (thumbnail y preview)
        // Esto sucede en el cliente para ahorrar ancho de banda y procesamiento en servidor
        const variants = await generateImageVariants(archivo, {
          onProgress: (progress) => {
            if (progress.stage === 'thumbnail') {
              toast.loading(`Generando thumbnail ${i + 1}...`, { id: `process-${i}` });
            } else if (progress.stage === 'preview') {
              toast.loading(`Generando preview ${i + 1}...`, { id: `process-${i}` });
            }
          }
        });

        // 2. Subir Original
        const originalPath = `repartidores/${carpeta}/${idReferencia}/${Date.now()}_${archivo.name}`;
        const originalRef = ref(storage, originalPath);
        await uploadBytes(originalRef, archivo);
        const originalUrl = await getDownloadURL(originalRef);

        // 3. Subir Thumbnail
        const thumbPath = getStoragePathForVariant(originalPath, 'thumb');
        const thumbRef = ref(storage, thumbPath);
        const thumbFile = variantBlobToFile(variants.thumbnail.blob, `thumb_${archivo.name}`);
        await uploadBytes(thumbRef, thumbFile);
        const thumbUrl = await getDownloadURL(thumbRef);

        // 4. Subir Preview (opcional, pero recomendado para móviles)
        const previewPath = getStoragePathForVariant(originalPath, 'preview');
        const previewRef = ref(storage, previewPath);
        const previewFile = variantBlobToFile(variants.preview.blob, `preview_${archivo.name}`);
        await uploadBytes(previewRef, previewFile);
        const previewUrl = await getDownloadURL(previewRef);

        toast.dismiss(`process-${i}`);

        // Agregamos el objeto completo de imagen
        urls.push({
          original: originalUrl,
          thumbnail: thumbUrl,
          preview: previewUrl,
          metadata: variants.metadata
        });

        // Mostrar estadísticas
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
    if (!confirm('¿Iniciar entregas de esta ruta? Esto cambiará su estado a "En Entrega".')) return;

    try {
      setProcesando(true);
      const response = await api.post(`/repartidores/rutas/${rutaSeleccionada.id}/iniciar-entregas`);
      if (response.data.success) {
        toast.success('🚚 Entregas iniciadas');
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (e) {
      toast.error('Error al iniciar entregas');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  const handleEntregarItem = async (itemIndex) => {
    if (!facturaActual) return;

    // Guardar estado previo para rollback
    const estadoPrevio = {
      items: [...facturaActual.items],
      itemsEntregados: facturaActual.itemsEntregados
    };

    await executeWithOptimism({
      // 1. Actualización optimista INMEDIATA (latencia 0ms)
      optimisticUpdate: () => {
        const nuevosItems = [...facturaActual.items];
        if (nuevosItems[itemIndex]) {
          nuevosItems[itemIndex].entregado = true;
          nuevosItems[itemIndex]._optimistic = true; // Marca visual
        }
        setFacturaActual(prev => ({
          ...prev,
          items: nuevosItems,
          itemsEntregados: (prev.itemsEntregados || 0) + 1
        }));
      },

      // 2. Acción real en servidor (en background)
      serverAction: async () => {
        const response = await api.post(
          `/repartidores/facturas/${facturaActual.id}/items/entregar`,
          { itemIndex }
        );
        // Recargar el detalle de ruta en segundo plano para sincronizar el progreso global
        await cargarDetalleRuta(rutaSeleccionada.id);
        return response;
      },

      // 3. Rollback si falla
      rollback: () => {
        setFacturaActual(prev => ({
          ...prev,
          items: estadoPrevio.items,
          itemsEntregados: estadoPrevio.itemsEntregados
        }));
      },

      // 4. Mensajes
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

      const response = await api.post(
        `/repartidores/facturas/${facturaActual.id}/fotos`,
        { fotos: urls }
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
    if (!confirm('¿Está seguro de que desea finalizar la ruta? Esto cerrará todas las facturas pendientes.')) return;

    try {
      setProcesando(true);

      const response = await api.post(
        `/repartidores/rutas/${rutaSeleccionada.id}/finalizar`,
        { notas: notasFinalizacion }
      );

      if (response.data.success) {
        const { facturasEntregadas, facturasNoEntregadas, facturasPendientes } = response.data.data;

        toast.success(
          `✅ Ruta finalizada`,
          { description: `E: ${facturasEntregadas} | NE: ${facturasNoEntregadas} | P: ${facturasPendientes}` }
        );

        setShowModalFinalizar(false);
        setNotasFinalizacion('');

        volverALista();
      }
    } catch (e) {
      toast.error('Error al finalizar ruta');
      console.error(e);
    } finally {
      setProcesando(false);
    }
  };

  // ==============================================================================
  // 🧹 HELPERS Y RESET DE FORMULARIOS
  // ==============================================================================
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

            {rutaSeleccionada.estado === 'en_entrega' ? (
              <button
                onClick={() => setShowModalFinalizar(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 font-medium"
              >
                <CheckCircle size={18} /> Finalizar Ruta
              </button>
            ) : rutaSeleccionada.estado === 'cargada' && (
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
                onClick={() => !f.estado || f.estado === 'asignado' || f.estado === 'en_entrega' ? seleccionarFacturaParaGestion(f) : null}
                className={`p-4 rounded-lg shadow-md transition cursor-pointer flex justify-between items-center ${f.estado === 'entregada'
                  ? 'border-l-8 border-green-500 bg-green-50 dark:bg-green-900/20'
                  : f.estado === 'no_entregada'
                    ? 'border-l-8 border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-l-8 border-blue-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                style={{ cursor: !f.estado || f.estado === 'asignado' || f.estado === 'en_entrega' ? 'pointer' : 'default' }}
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
          <div className="space-y-3 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white">Items a Entregar ({calcularProgreso(facturaActual)}%)</h3>
            {facturaActual.items?.map((item, idx) => (
              <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${item.entregado ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                <span className={`text-gray-800 dark:text-gray-200 font-medium flex items-center gap-2 ${item.entregado ? 'line-through text-gray-500' : ''}`}>
                  {item.entregado ? <CheckCircle className="text-green-600 flex-shrink-0" size={20} /> : <Package className="text-gray-400 flex-shrink-0" size={20} />}
                  {item.descripcion} (x{item.cantidad})
                </span>

                {(!item.entregado && rutaSeleccionada.estado === 'en_entrega') ?
                  <div className="flex gap-2">
                    <button onClick={() => handleEntregarItem(idx)} disabled={procesando} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50">Entregar</button>
                    <button onClick={() => { setItemDanado({ ...item, index: idx }); setShowModalDano(true); }} className="bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700">⚠️</button>
                  </div>
                  : null
                }
              </div>
            ))}
          </div>

          {/* Botones de Acción - Mobile First */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={() => setShowModalFotos(true)}
              className="w-full sm:flex-1 bg-purple-600 text-white py-3 sm:py-2.5 rounded-lg flex justify-center items-center gap-2 hover:bg-purple-700 transition min-h-[48px] sm:min-h-[44px]"
            >
              <Camera size={20} /> Fotos ({facturaActual.fotosEntrega?.length || 0})
            </button>
            {facturaActual.pago?.estado !== 'pagada' && rutaSeleccionada.estado === 'en_entrega' && (
              <button
                onClick={() => setShowModalPago(true)}
                className="w-full sm:flex-1 bg-green-600 text-white py-3 sm:py-2.5 rounded-lg flex justify-center items-center gap-2 hover:bg-green-700 transition min-h-[48px] sm:min-h-[44px]"
              >
                <DollarSign size={20} /> Pago
              </button>
            )}
          </div>

          {/* Botones Finales */}
          {rutaSeleccionada.estado === 'en_entrega' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowModalEntregar(true)}
                disabled={facturaActual.itemsEntregados < (facturaActual.items?.length || facturaActual.itemsTotal)}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {facturaActual.itemsEntregados < (facturaActual.items?.length || facturaActual.itemsTotal) ? '⚠️ Complete todos los items' : '✅ Marcar Entregada'}
              </button>
              <button
                onClick={() => setShowModalNoEntrega(true)}
                className="w-full py-3 bg-red-100 text-red-700 border border-red-200 rounded-lg hover:bg-red-200 transition font-medium"
              >
                🚫 Reportar No Entrega
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==============================================================================
          MODALES
          ============================================================================== */}

      {/* Modal Fotos - Mobile First */}
      {showModalFotos && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-none sm:rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-purple-600 flex items-center gap-2"><Camera /> Fotos de Evidencia</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tomar o Seleccionar Fotos *</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={e => setFotosEvidencia(Array.from(e.target.files))}
                  className="w-full text-sm sm:text-xs text-gray-500 dark:text-gray-300 file:mr-4 file:py-3 sm:file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 min-h-[48px] sm:min-h-[40px]"
                />
                {fotosEvidencia.length > 0 && <p className="text-xs text-green-600 mt-1">{fotosEvidencia.length} foto(s) seleccionada(s) para subir.</p>}
              </div>

              {facturaActual.fotosEntrega?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mt-3 text-gray-700 dark:text-gray-300">Fotos ya subidas ({facturaActual.fotosEntrega.length}):</p>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {facturaActual.fotosEntrega.map((_, idx) => (
                      <div key={idx} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="text-gray-400" size={24} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowModalFotos(false); setFotosEvidencia([]); }}
                className="w-full sm:flex-1 border p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[48px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubirFotos}
                disabled={procesando || subiendoFotos || fotosEvidencia.length === 0}
                className="w-full sm:flex-1 bg-purple-600 text-white p-3 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-purple-700 transition min-h-[48px]"
              >
                {subiendoFotos || procesando ? <Loader className="animate-spin" size={18} /> : <Plus size={18} />}
                {subiendoFotos || procesando ? 'Subiendo...' : 'Subir Fotos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pago - Mobile First */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-none sm:rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl h-full sm:h-auto overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-green-600 flex items-center gap-2"><DollarSign /> Confirmar Pago Contraentrega</h3>

            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-400">Total a Cobrar:</p>
              <p className="text-2xl font-bold text-green-700 dark:text-white">${facturaActual.pago?.total?.toFixed(2) || '0.00'}</p>
            </div>

            <div className="space-y-4">
              <input
                type="number"
                step="0.01"
                className={`w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 text-base min-h-[48px] ${!montoPagado || parseFloat(montoPagado) <= 0
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder="Monto Pagado*"
                value={montoPagado}
                onChange={e => setMontoPagado(e.target.value)}
              />
              <select
                className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 text-base min-h-[48px]"
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="cheque">Cheque</option>
              </select>
              {(metodoPago !== 'efectivo') && (
                <input
                  type="text"
                  className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 text-base min-h-[48px]"
                  placeholder="Referencia de Pago"
                  value={referenciaPago}
                  onChange={e => setReferenciaPago(e.target.value)}
                />
              )}
              <textarea
                className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 text-base"
                rows="3"
                placeholder="Notas de pago..."
                value={notasPago}
                onChange={e => setNotasPago(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowModalPago(false); resetFormPago(); }}
                className="w-full sm:flex-1 border p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[48px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarPago}
                disabled={procesando || !montoPagado || parseFloat(montoPagado) < 0}
                className="w-full sm:flex-1 bg-green-600 text-white p-3 rounded-lg font-bold disabled:opacity-50 hover:bg-green-700 transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                {procesando ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                {procesando ? 'Confirmando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reportar Daño */}
      {showModalDano && itemDanado && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-none sm:rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-4 text-orange-600 flex items-center gap-2"><AlertTriangle /> Reportar Item Dañado</h3>

            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="font-bold text-orange-800 dark:text-orange-200">{itemDanado.descripcion}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Índice: {itemDanado.index}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción del daño *</label>
                <textarea
                  className="w-full border p-3 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-orange-500 text-base min-h-[100px]"
                  rows="3"
                  placeholder="Describe el daño encontrado..."
                  value={descripcionDano}
                  onChange={e => setDescripcionDano(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fotos de Evidencia (Opcional)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={e => setFotosDano(Array.from(e.target.files))}
                  className="w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-3 sm:file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 file:min-h-[48px]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowModalDano(false); resetFormDano(); }}
                className="w-full sm:flex-1 border py-3 sm:py-2 px-4 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[48px] text-base sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportarDano}
                disabled={procesando || !descripcionDano.trim()}
                className="w-full sm:flex-1 bg-orange-600 text-white py-3 sm:py-2 px-4 rounded-lg font-bold disabled:opacity-50 hover:bg-orange-700 transition flex items-center justify-center gap-2 min-h-[48px] text-base sm:text-sm"
              >
                {procesando ? <Loader className="animate-spin" size={18} /> : <AlertTriangle size={18} />}
                {procesando ? 'Reportando...' : 'Reportar Daño'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entregar */}
      {showModalEntregar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-none sm:rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl h-full sm:h-auto overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
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
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base min-h-[48px]"
                  placeholder="Nombre del receptor (Obligatorio)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas de entrega
                </label>
                <textarea
                  value={notasEntrega}
                  onChange={(e) => setNotasEntrega(e.target.value)}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base min-h-[100px]"
                  rows="3"
                  placeholder="Observaciones de la entrega..."
                />
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                  ✓ Confirmación de ítems y pagos
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Esta acción finaliza la factura. Asegúrate de haber confirmado todos los ítems y pagos.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowModalEntregar(false); resetFormEntregar(); }}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[48px] text-base sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarcarEntregada}
                disabled={procesando || !nombreReceptor.trim()} // Hacemos el nombre del receptor obligatorio
                className="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base sm:text-sm"
              >
                {procesando ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                {procesando ? 'Marcando...' : 'Marcar Entregada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal No Entrega */}
      {showModalNoEntrega && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-none sm:rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <XCircle className="text-orange-600" />
              Reportar No Entrega
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Motivo *</label>
                <select
                  value={motivoNoEntrega}
                  onChange={(e) => setMotivoNoEntrega(e.target.value)}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base min-h-[48px]"
                >
                  <option value="">Seleccionar motivo</option>
                  <option value="cliente_ausente">Cliente ausente</option>
                  <option value="direccion_incorrecta">Dirección incorrecta</option>
                  <option value="cliente_rechazo">Cliente rechazó el pedido</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción *</label>
                <textarea
                  value={descripcionNoEntrega}
                  onChange={(e) => setDescripcionNoEntrega(e.target.value)}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base min-h-[120px]"
                  rows="4"
                  placeholder="Describe la situación..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fotos de Evidencia (Opcional)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  capture="environment"
                  onChange={e => setFotosNoEntrega(Array.from(e.target.files))}
                  className="w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-3 sm:file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 file:min-h-[48px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="intentarNuevamente"
                  checked={intentarNuevamente}
                  onChange={(e) => setIntentarNuevamente(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="intentarNuevamente" className="text-sm text-gray-700 dark:text-gray-300">
                  Intentar entregar nuevamente
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowModalNoEntrega(false); resetFormNoEntrega(); }}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[48px] text-base sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportarNoEntrega}
                disabled={procesando || !motivoNoEntrega || !descripcionNoEntrega.trim()}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base sm:text-sm"
              >
                {procesando ? <Loader className="animate-spin" size={18} /> : <XCircle size={18} />}
                {procesando ? 'Reportando...' : 'Reportar No Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Finalizar Ruta */}
      {showModalFinalizar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-0 sm:p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-none sm:rounded-2xl w-full max-w-full sm:max-w-md shadow-2xl h-full sm:h-auto overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="text-purple-600" />
              <span className="text-base sm:text-2xl">Finalizar Ruta: {rutaSeleccionada?.nombre}</span>
            </h2>

            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-purple-800 dark:text-purple-200 font-medium">
                Confirma que has completado todas las gestiones de entrega posibles.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas de finalización (opcional)
              </label>
              <textarea
                value={notasFinalizacion}
                onChange={(e) => setNotasFinalizacion(e.target.value)}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-base min-h-[100px]"
                rows="3"
                placeholder="Observaciones generales de la ruta..."
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => { setShowModalFinalizar(false); setNotasFinalizacion(''); }}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition min-h-[48px] text-base sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizarRuta}
                disabled={procesando}
                className="w-full sm:flex-1 px-4 py-3 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] text-base sm:text-sm"
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
      )}
    </div>
  );
};

export default PanelRepartidores;