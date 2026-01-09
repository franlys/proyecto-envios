import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import { storage } from '../services/firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageFile, needsCompression } from '../utils/imageCompression'; // Compresión de imágenes
import { useOptimisticAction } from '../hooks/useRealtimeOptimized'; // Optimistic UI
import { generateImageVariants, variantBlobToFile, getStoragePathForVariant } from '../utils/thumbnailGenerator.jsx'; // Thumbnail system
import SmartImage, { useImageLightbox } from '../components/common/SmartImage'; // Smart Image
import {
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  Box,
  Loader,
  MapPin,
  ArrowLeft,
  X,
  X,
  Image as ImageIcon,
  Printer,
  Barcode
} from 'lucide-react';

const PanelCargadores = () => {
  // ==============================================================================
  // 🎣 HOOKS Y ESTADOS
  // ==============================================================================
  const { executeWithOptimism } = useOptimisticAction();
  const { openLightbox, LightboxComponent } = useImageLightbox();

  // ==============================================================================
  // 🎣 ESTADOS
  // ==============================================================================
  const [rutas, setRutas] = useState([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [vistaActual, setVistaActual] = useState('lista'); // 'lista' | 'detalle'

  // Estados de carga y procesamiento
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Estados para reportar daño
  const [showModalDano, setShowModalDano] = useState(false);
  const [itemDanado, setItemDanado] = useState(null);
  const [descripcionDano, setDescripcionDano] = useState('');
  const [archivosFotos, setArchivosFotos] = useState([]);
  const [subiendoFotos, setSubiendoFotos] = useState(false);

  // Estados para finalizar carga
  const [showModalFinalizar, setShowModalFinalizar] = useState(false);
  const [notasCarga, setNotasCarga] = useState('');

  // Estados para modal de galería de fotos
  const [showModalGaleria, setShowModalGaleria] = useState(false);
  const [fotosGaleria, setFotosGaleria] = useState([]);
  const [fotoActual, setFotoActual] = useState(0);

  // Estados para modal de detalles de factura
  const [showModalDetalleFactura, setShowModalDetalleFactura] = useState(false);
  const [facturaDetalleSeleccionada, setFacturaDetalleSeleccionada] = useState(null);

  // Estados para Modo Scanner Automático
  const [modoScanner, setModoScanner] = useState(false);
  const [scannerBuffer, setScannerBuffer] = useState('');
  const [ultimoCodigoEscaneado, setUltimoCodigoEscaneado] = useState(null);

  // ==============================================================================
  // 🔄 EFECTOS Y CARGA DE DATOS
  // ==============================================================================
  // Cargar rutas asignadas al montar el componente
  useEffect(() => {
    cargarRutasAsignadas();
  }, []);

  // Listener para Scanner (Teclado)
  useEffect(() => {
    if (!modoScanner || !rutaSeleccionada) return;

    const handleKeyPress = (e) => {
      // Si estamos en un input/textarea, no interceptar
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'Enter') {
        if (scannerBuffer) {
          procesarCodigoEscaneado(scannerBuffer);
          setScannerBuffer('');
        }
      } else {
        // Acumular caracteres alfanuméricos
        if (e.key.length === 1) {
          setScannerBuffer(prev => prev + e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [modoScanner, scannerBuffer, rutaSeleccionada]);

  const procesarCodigoEscaneado = (codigo) => {
    setUltimoCodigoEscaneado(codigo);
    console.log('🔍 Código escaneado:', codigo);

    // Buscar en todas las facturas de la ruta
    let encontrado = false;

    // Iterar sobre facturas para encontrar el item
    for (const factura of rutaSeleccionada.facturas || []) {
      // Verificar si el código coincide con tracking de factura (para cargar toda la factura o validar)
      // O verificar si coincide con algún código de barras de item (si los tuviéramos)
      // Asumiremos por ahora que el código escaneado es el TRACKING de la factura 'ENV-...' o 'MIA...'

      if (factura.codigoTracking === codigo || (factura.items && factura.items.some(i => i.codigoBarras === codigo))) {
        // Encontró factura. Ahora buscamos items pendientes.
        // En el flujo simple, si escanean el tracking, cargamos los items uno por uno o todos?
        // El usuario pidió "confirmar la carga de un item al recibir el input".
        // Asumiremos que escanear tracking = cargar items.

        // Si el código es específico de un item (i.e. SKU o similar), buscamos ese item.
        const itemsCoincidentes = factura.items.map((item, index) => ({ item, index }))
          .filter(({ item }) => item.codigoBarras === codigo || factura.codigoTracking === codigo);

        if (itemsCoincidentes.length > 0) {
          encontrado = true;
          // Cargar el primer item no cargado que coincida
          const pendiente = itemsCoincidentes.find(({ item }) => !item.cargado);

          if (pendiente) {
            handleConfirmarItem(factura.id, pendiente.index);
            toast.success(`Item escaneado: ${pendiente.item.descripcion}`, {
              icon: '🔫',
              duration: 2000
            });
          } else {
            toast.info('Item(s) ya cargado(s) para este código', { icon: '✅' });
          }
          break; // Salir del loop de facturas
        }
      }
    }

    if (!encontrado) {
      toast.error(`Código no encontrado en esta ruta: ${codigo}`, {
        icon: '⚠️'
      });
      // Sonido de error?
    }
  };

  // Cargar lista de rutas desde el backend
  const cargarRutasAsignadas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cargadores/rutas');

      if (response.data.success) {
        setRutas(response.data.data || []);
      }
    } catch (error) {
      console.error('Error cargando rutas:', error);
      toast.error('Error al cargar las rutas asignadas');
      setRutas([]);
    } finally {
      setLoading(false);
    }
  };

  // ==============================================================================
  // 🔍 DETALLES Y NAVEGACIÓN
  // ==============================================================================
  const cargarDetalleRuta = async (rutaId) => {
    try {
      setLoadingDetalle(true);
      const response = await api.get(`/cargadores/rutas/${rutaId}`);

      if (response.data.success) {
        setRutaSeleccionada(response.data.data);
        setVistaActual('detalle');
      }
    } catch (error) {
      console.error('Error cargando detalle:', error);
      toast.error('Error al cargar el detalle de la ruta');
    } finally {
      setLoadingDetalle(false);
    }
  };

  const volverALista = () => {
    setVistaActual('lista');
    setRutaSeleccionada(null);
    cargarRutasAsignadas(); // Refrescar datos al volver
  };

  // ==============================================================================
  // 🚀 ACCIONES PRINCIPALES (INICIAR, CARGAR ITEM, FINALIZAR)
  // ==============================================================================
  const handleIniciarCarga = async () => {
    if (!rutaSeleccionada) return;

    try {
      setProcesando(true);
      const response = await api.post(`/cargadores/rutas/${rutaSeleccionada.id}/iniciar-carga`);

      if (response.data.success) {
        toast.success('Carga iniciada exitosamente');
        // Recargar detalle para actualizar estado local
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error iniciando carga:', error);
      toast.error(error.response?.data?.message || 'Error al iniciar la carga');
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarItem = async (facturaId, itemIndex) => {
    if (!rutaSeleccionada) return;

    // Encontrar la factura y el item para el rollback
    const factura = rutaSeleccionada.facturas?.find(f => f.id === facturaId);
    if (!factura || !factura.items || !factura.items[itemIndex]) return;

    const estadoPrevio = {
      cargado: factura.items[itemIndex].cargado
    };

    await executeWithOptimism({
      // 1. Actualización optimista INMEDIATA (latencia 0ms)
      optimisticUpdate: () => {
        setRutaSeleccionada(prev => {
          const facturas = [...(prev.facturas || [])];
          const facturaIdx = facturas.findIndex(f => f.id === facturaId);

          if (facturaIdx !== -1) {
            facturas[facturaIdx] = {
              ...facturas[facturaIdx],
              items: facturas[facturaIdx].items.map((item, idx) =>
                idx === itemIndex
                  ? { ...item, cargado: true, _optimistic: true }
                  : item
              )
            };
          }

          return { ...prev, facturas };
        });
      },

      // 2. Acción real en servidor (en background)
      serverAction: async () => {
        const response = await api.post(
          `/cargadores/rutas/${rutaSeleccionada.id}/facturas/${facturaId}/items/confirmar`,
          { itemIndex }
        );
        // Recargar el detalle en segundo plano para sincronizar el progreso global
        await cargarDetalleRuta(rutaSeleccionada.id);
        return response;
      },

      // 3. Rollback si falla
      rollback: () => {
        setRutaSeleccionada(prev => {
          const facturas = [...(prev.facturas || [])];
          const facturaIdx = facturas.findIndex(f => f.id === facturaId);

          if (facturaIdx !== -1) {
            facturas[facturaIdx] = {
              ...facturas[facturaIdx],
              items: facturas[facturaIdx].items.map((item, idx) =>
                idx === itemIndex
                  ? { ...item, cargado: estadoPrevio.cargado, _optimistic: false }
                  : item
              )
            };
          }

          return { ...prev, facturas };
        });
      },

      // 4. Mensajes
      successMessage: '✅ Item marcado como cargado',
      errorMessage: '❌ Error al confirmar item'
    });
  };

  const handleFinalizarCarga = async () => {
    if (!rutaSeleccionada) return;

    try {
      setProcesando(true);

      const response = await api.post(
        `/cargadores/rutas/${rutaSeleccionada.id}/finalizar-carga`,
        { notas: notasCarga }
      );

      if (response.data.success) {
        toast.success('Carga finalizada correctamente', {
          description: 'La ruta ahora está lista para el repartidor'
        });
        setShowModalFinalizar(false);
        setNotasCarga('');
        volverALista();
      }
    } catch (error) {
      console.error('Error finalizando carga:', error);

      if (error.response?.data?.requiereConfirmacion) {
        toast.error('Carga incompleta', {
          description: `Hay ${error.response.data.facturasIncompletas?.length || 0} facturas con items pendientes.`
        });
      } else {
        toast.error(error.response?.data?.message || 'Error al finalizar la carga');
      }
    } finally {
      setProcesando(false);
    }
  };

  // ==============================================================================
  // ⚠️ MANEJO DE DAÑOS Y FOTOS CON THUMBNAILS
  // ==============================================================================
  const subirFotosAFirebase = async (archivos, facturaId) => {
    const urls = [];

    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];

      try {
        const startTime = Date.now();

        // Mostrar indicador si tarda más de 500ms
        const timeoutId = setTimeout(() => {
          toast.loading(`Procesando imagen ${i + 1}/${archivos.length}...`, { id: `process-${i}` });
        }, 500);

        // Generar thumbnail (200px) y preview (1024px)
        const variants = await generateImageVariants(archivo, {
          onProgress: (progress) => {
            if (progress.stage === 'thumbnail') {
              toast.loading(`Generando thumbnail ${i + 1}...`, { id: `process-${i}` });
            } else if (progress.stage === 'preview') {
              toast.loading(`Generando preview ${i + 1}...`, { id: `process-${i}` });
            }
          }
        });

        clearTimeout(timeoutId);
        toast.dismiss(`process-${i}`);

        // Paths en Storage
        const timestamp = Date.now();
        const baseNombre = `danos/${facturaId}/${timestamp}_${i}`;

        // Subir thumbnail (200px) - carga instantánea en listas
        const thumbnailFile = variantBlobToFile(variants.thumbnail.blob, archivo.name, 'thumb');
        const thumbnailPath = `${baseNombre}_thumb.jpg`;
        const thumbnailRef = ref(storage, thumbnailPath);
        await uploadBytes(thumbnailRef, thumbnailFile);
        const thumbnailUrl = await getDownloadURL(thumbnailRef);

        // Subir preview (1024px) - para vista detallada
        const previewFile = variantBlobToFile(variants.preview.blob, archivo.name, 'preview');
        const previewPath = `${baseNombre}_preview.jpg`;
        const previewRef = ref(storage, previewPath);
        await uploadBytes(previewRef, previewFile);
        const previewUrl = await getDownloadURL(previewRef);

        // Guardar ambas URLs (el backend debe soportar este formato)
        urls.push({
          thumbnail: thumbnailUrl,
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
        console.error('Error procesando foto:', error);
        toast.error(`Error al procesar ${archivo.name}`);
        throw new Error(`Fallo al procesar imagen ${i + 1}`);
      }
    }

    return urls;
  };

  const abrirModalDano = (facturaId, item, itemIndex) => {
    setItemDanado({ facturaId, item, itemIndex });
    setDescripcionDano('');
    setArchivosFotos([]);
    setShowModalDano(true);
  };

  const handleReportarDano = async () => {
    if (!itemDanado || !descripcionDano.trim()) {
      toast.error('Debes describir el daño encontrado');
      return;
    }

    try {
      setProcesando(true);
      setSubiendoFotos(true);

      let urlsFotos = [];
      if (archivosFotos.length > 0) {
        toast.info(`Subiendo ${archivosFotos.length} foto(s)...`);
        urlsFotos = await subirFotosAFirebase(archivosFotos, itemDanado.facturaId);
      }

      const response = await api.post(
        `/cargadores/facturas/${itemDanado.facturaId}/items/danado`,
        {
          itemIndex: itemDanado.itemIndex,
          descripcionDano: descripcionDano.trim(),
          fotos: urlsFotos
        }
      );

      if (response.data.success) {
        toast.success('Daño reportado exitosamente');
        setShowModalDano(false);
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error reportando daño:', error);
      toast.error(error.response?.data?.message || 'Error al guardar el reporte');
    } finally {
      setProcesando(false);
      setSubiendoFotos(false);
    }
  };

  // Helper para galería
  const abrirGaleriaFotos = (fotos) => {
    if (!fotos || fotos.length === 0) return;
    setFotosGaleria(fotos);
    setFotoActual(0);
    setShowModalGaleria(true);
  };

  // Helper para abrir detalles de factura
  const abrirDetalleFactura = (factura) => {
    setFacturaDetalleSeleccionada(factura);
    setShowModalDetalleFactura(true);
  };

  // ==============================================================================
  // 🎨 RENDERIZADO
  // ==============================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">

      {/* Header General */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {vistaActual === 'detalle' && (
              <button
                onClick={volverALista}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
              >
                <ArrowLeft className="text-slate-700 dark:text-slate-300" />
              </button>
            )}
            <Truck size={32} className="text-indigo-600" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Panel de Cargadores
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                {vistaActual === 'lista'
                  ? 'Selecciona una ruta para comenzar'
                  : rutaSeleccionada?.nombre || 'Detalle de Ruta'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==============================================================================
          VISTA: LISTA DE RUTAS
         ============================================================================== */}
      {vistaActual === 'lista' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-indigo-600" size={40} />
            </div>
          ) : rutas.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 text-center">
              <Package size={48} className="mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                No tienes rutas asignadas en este momento
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {rutas.map(ruta => (
                <div
                  key={ruta.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 hover:shadow-lg transition border-l-4 border-indigo-500"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {ruta.nombre}
                      </h3>
                      <div className="flex gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ruta.estado === 'asignada'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          }`}>
                          {ruta.estado === 'asignada' ? 'Asignada' : 'En Proceso'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {ruta.zona && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-4">
                      <MapPin size={16} />
                      <span>{ruta.zona}</span>
                    </div>
                  )}

                  {ruta.repartidorNombre && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Repartidor: {ruta.repartidorNombre}
                    </p>
                  )}

                  {/* Estadísticas de la Ruta - Corregidas según backend */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-slate-50 dark:bg-slate-700 p-2 rounded">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Facturas</p>
                      <p className="font-bold text-lg text-slate-900 dark:text-white">
                        {ruta.estadisticas?.totalFacturas || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                      <p className="text-xs text-purple-600 dark:text-purple-300">Items</p>
                      <p className="font-bold text-lg text-purple-700 dark:text-purple-200">
                        {ruta.estadisticas?.itemsCargados || 0}/{ruta.estadisticas?.totalItems || 0}
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                      <p className="text-xs text-amber-600 dark:text-amber-300">Progreso</p>
                      <p className="font-bold text-lg text-amber-700 dark:text-amber-200">
                        {ruta.estadisticas?.porcentajeCarga || 0}%
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${ruta.estadisticas?.porcentajeCarga || 0}%` }}
                    />
                  </div>

                  <button
                    onClick={() => cargarDetalleRuta(ruta.id)}
                    disabled={loadingDetalle}
                    className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingDetalle ? (
                      <Loader className="animate-spin" size={18} />
                    ) : (
                      <>
                        <Box size={18} />
                        Gestionar Carga
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==============================================================================
          VISTA: DETALLE DE RUTA
         ============================================================================== */}
      {vistaActual === 'detalle' && rutaSeleccionada && (
        <div className="space-y-6">
          {/* Tarjeta de Control Principal */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {rutaSeleccionada.nombre}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Progreso total: {rutaSeleccionada.itemsCargadosRuta || 0} de {rutaSeleccionada.itemsTotalRuta || 0} items
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.open(`/rutas/${rutaSeleccionada.id}/imprimir`, '_blank')}
                  className="p-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                  title="Imprimir Facturas"
                >
                  <Printer size={18} />
                </button>
                {rutaSeleccionada.estado === 'asignada' ? (
                  <button
                    onClick={handleIniciarCarga}
                    disabled={procesando}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {procesando ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    Iniciar Proceso de Carga
                  </button>
                ) : (
                  <button
                    onClick={() => setShowModalFinalizar(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Finalizar Carga
                  </button>
                )}
              </div>
            </div>

            {/* Barra de Herramientas Scanner */}
            {rutaSeleccionada.estado === 'asignada' || rutaSeleccionada.estado === 'en_carga' ? (
              <div className={`mt-4 p-4 rounded-lg flex items-center justify-between transition ${modoScanner ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50'
                }`}>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${modoScanner ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                    <Barcode size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">
                      Modo Scanner Automático
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {modoScanner
                        ? 'LISTO PARA ESCANEAR... (Emule teclado)'
                        : 'Activa para cargar items automáticamente al escanear'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {ultimoCodigoEscaneado && (
                    <span className="text-xs bg-white px-2 py-1 rounded border font-mono">
                      Último: {ultimoCodigoEscaneado}
                    </span>
                  )}
                  <button
                    onClick={() => setModoScanner(!modoScanner)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${modoScanner
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                  >
                    {modoScanner ? 'DESACTIVAR' : 'ACTIVAR'}
                  </button>
                </div>
              </div>
            ) : null}

          </div>

          {/* Listado de Facturas e Items */}
          <div className="space-y-4">
            {rutaSeleccionada.facturas && rutaSeleccionada.facturas.length > 0 ? (
              rutaSeleccionada.facturas.map((factura, fIndex) => (
                <div
                  key={factura.id || fIndex}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden"
                >
                  {/* Cabecera de Factura */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {factura.codigoTracking}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${factura.estadoCarga === 'cargada' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                          {factura.estadoCarga === 'cargada' ? 'COMPLETADA' : 'PENDIENTE'}
                        </span>
                        <button
                          onClick={() => abrirDetalleFactura(factura)}
                          className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center gap-1"
                        >
                          <Package size={12} />
                          Ver Detalles
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {factura.destinatario?.nombre || 'Sin destinatario'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-500 dark:text-slate-400">
                      {factura.itemsCargados || 0} / {factura.itemsTotal || 0} items cargados
                    </div>
                  </div>

                  {/* Items de la Factura */}
                  <div className="p-4 space-y-3">
                    {factura.items && factura.items.map((item, iIndex) => (
                      <div
                        key={iIndex}
                        className={`flex flex-col md:flex-row justify-between items-center p-4 rounded-lg border-2 transition ${item.cargado
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                          }`}
                      >
                        <div className="flex-1 w-full mb-3 md:mb-0">
                          <div className="flex items-center gap-3">
                            {item.cargado ? (
                              <CheckCircle className="text-emerald-600 flex-shrink-0" size={24} />
                            ) : (
                              <Box className="text-slate-400 flex-shrink-0" size={24} />
                            )}
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-lg">
                                {item.descripcion || item.producto || 'Sin descripción'}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Cantidad: {item.cantidad}
                              </p>
                              {item.fotos && item.fotos.length > 0 && (
                                <button
                                  onClick={() => abrirGaleriaFotos(item.fotos)}
                                  className="mt-1 text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  <ImageIcon size={12} /> Ver fotos del item
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción por Item */}
                        {rutaSeleccionada.estado === 'en_carga' && !item.cargado && (
                          <div className="flex gap-2 w-full md:w-auto">
                            <button
                              onClick={() => handleConfirmarItem(factura.id, iIndex)}
                              disabled={procesando}
                              className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <CheckCircle size={16} />
                              Cargar
                            </button>
                            <button
                              onClick={() => abrirModalDano(factura.id, item, iIndex)}
                              disabled={procesando}
                              className="flex-1 md:flex-none px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium flex items-center justify-center gap-2"
                            >
                              <AlertTriangle size={16} />
                              Dañado
                            </button>
                          </div>
                        )}

                        {item.cargado && (
                          <div className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg font-medium flex items-center gap-2">
                            <CheckCircle size={16} /> Cargado
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Visualización de daños reportados en esta factura */}
                  {factura.itemsDanados && factura.itemsDanados.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 border-t border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                        <AlertTriangle size={14} /> Reportes de Daño:
                      </p>
                      {factura.itemsDanados.map((dano, idx) => (
                        <div key={idx} className="text-xs text-amber-800 dark:text-amber-200 ml-5 mt-1">
                          • {dano.item?.descripcion}: {dano.descripcionDano}
                          {dano.fotos?.length > 0 && (
                            <button onClick={() => abrirGaleriaFotos(dano.fotos)} className="ml-2 text-indigo-600 underline">Ver fotos</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-lg">
                No hay facturas en esta ruta.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================================
          MODALES
         ============================================================================== */}

      {/* Modal Reportar Daño */}
      {showModalDano && itemDanado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="text-amber-600" />
                Reportar Item Dañado
              </h2>
              <button onClick={() => setShowModalDano(false)} className="text-slate-500 hover:text-slate-700">
                <X />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded">
              <p className="font-bold text-slate-900 dark:text-white">{itemDanado.item.descripcion}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Cant: {itemDanado.item.cantidad}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descripción del daño
                </label>
                <textarea
                  value={descripcionDano}
                  onChange={(e) => setDescripcionDano(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500"
                  rows="3"
                  placeholder="Describe qué está dañado..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Fotos de evidencia
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setArchivosFotos(Array.from(e.target.files))}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {archivosFotos.length > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">{archivosFotos.length} fotos seleccionadas</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModalDano(false)}
                disabled={procesando}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleReportarDano}
                disabled={procesando || !descripcionDano.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {subiendoFotos ? <Loader className="animate-spin" size={18} /> : <AlertTriangle size={18} />}
                {subiendoFotos ? 'Subiendo...' : 'Reportar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Finalizar Carga */}
      {showModalFinalizar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="text-emerald-600" />
              Finalizar Carga
            </h2>

            <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded text-sm text-emerald-800 dark:text-emerald-200">
              <p>Al finalizar, la ruta cambiará a estado "Cargada" y estará disponible para el repartidor.</p>
            </div>

            <textarea
              value={notasCarga}
              onChange={(e) => setNotasCarga(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg mb-4"
              placeholder="Notas opcionales sobre la carga..."
              rows="3"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowModalFinalizar(false)}
                disabled={procesando}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalizarCarga}
                disabled={procesando}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex justify-center items-center gap-2"
              >
                {procesando ? <Loader className="animate-spin" size={18} /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Galería */}
      {showModalGaleria && fotosGaleria.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999] p-4">
          <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col items-center justify-center">
            <button
              onClick={() => { setShowModalGaleria(false); setFotosGaleria([]); }}
              className="absolute top-4 right-4 text-white hover:text-slate-300 p-2 bg-black/50 rounded-full z-[10000]"
            >
              <X size={32} />
            </button>

            <SmartImage
              src={fotosGaleria[fotoActual]}
              alt={`Foto ${fotoActual + 1}`}
              className="max-h-[calc(90vh-120px)] max-w-full rounded-lg shadow-2xl"
              showOptimizedBadge={true}
              showZoomIcon={false}
              usePreview={true}
              objectFit="contain"
            />

            {fotosGaleria.length > 1 && (
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => setFotoActual(prev => (prev > 0 ? prev - 1 : fotosGaleria.length - 1))}
                  className="px-4 py-2 bg-white/20 text-white rounded-full hover:bg-white/30"
                >
                  Anterior
                </button>
                <span className="text-white py-2">{fotoActual + 1} / {fotosGaleria.length}</span>
                <button
                  onClick={() => setFotoActual(prev => (prev < fotosGaleria.length - 1 ? prev + 1 : 0))}
                  className="px-4 py-2 bg-white/20 text-white rounded-full hover:bg-white/30"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle de Factura */}
      {showModalDetalleFactura && facturaDetalleSeleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-3xl p-6 shadow-2xl my-8">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="text-indigo-600" />
                Detalles de Factura
              </h2>
              <button
                onClick={() => setShowModalDetalleFactura(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Información de Tracking */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2">Código de Tracking</h3>
                <p className="text-2xl font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {facturaDetalleSeleccionada.codigoTracking}
                </p>
              </div>

              {/* Información del Destinatario */}
              <div className="border dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-600" />
                  Destinatario
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Nombre:</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {facturaDetalleSeleccionada.destinatario?.nombre || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Teléfono:</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {facturaDetalleSeleccionada.destinatario?.telefono || 'No especificado'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-slate-500 dark:text-slate-400">Dirección:</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {facturaDetalleSeleccionada.destinatario?.direccion || 'No especificada'}
                    </p>
                  </div>
                  {facturaDetalleSeleccionada.destinatario?.sector && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Sector:</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {facturaDetalleSeleccionada.destinatario.sector}
                      </p>
                    </div>
                  )}
                  {facturaDetalleSeleccionada.destinatario?.zona && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Zona:</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {facturaDetalleSeleccionada.destinatario.zona}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de Items */}
              <div className="border dark:border-slate-700 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <Box size={18} className="text-purple-600" />
                  Items de la Factura ({facturaDetalleSeleccionada.items?.length || 0})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {facturaDetalleSeleccionada.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start p-3 bg-slate-50 dark:bg-slate-700/50 rounded"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {item.descripcion || item.producto || 'Sin descripción'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Cantidad: {item.cantidad}
                        </p>
                        {item.fotos && item.fotos.length > 0 && (
                          <button
                            onClick={() => abrirGaleriaFotos(item.fotos)}
                            className="mt-1 text-xs text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <ImageIcon size={12} /> Ver {item.fotos.length} foto(s)
                          </button>
                        )}
                      </div>
                      {item.cargado && (
                        <CheckCircle className="text-emerald-600 flex-shrink-0 ml-2" size={20} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fotos de la Recolección */}
              {facturaDetalleSeleccionada.fotos && facturaDetalleSeleccionada.fotos.length > 0 && (
                <div className="border dark:border-slate-700 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <ImageIcon size={18} className="text-indigo-600" />
                    Fotos de la Recolección ({facturaDetalleSeleccionada.fotos.length})
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {facturaDetalleSeleccionada.fotos.map((foto, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-slate-200 dark:border-slate-600"
                        onClick={() => abrirGaleriaFotos(facturaDetalleSeleccionada.fotos)}
                      >
                        <img
                          src={foto}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Haz clic en cualquier foto para ver en tamaño completo
                  </p>
                </div>
              )}

              {/* Información de Facturación */}
              {facturaDetalleSeleccionada.facturacion && (
                <div className="border dark:border-slate-700 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-3">Facturación</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {facturaDetalleSeleccionada.facturacion.subtotal && (
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Subtotal:</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          ${facturaDetalleSeleccionada.facturacion.subtotal}
                        </p>
                      </div>
                    )}
                    {facturaDetalleSeleccionada.facturacion.total && (
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Total:</p>
                        <p className="font-bold text-lg text-slate-900 dark:text-white">
                          ${facturaDetalleSeleccionada.facturacion.total}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botón Cerrar */}
              <button
                onClick={() => setShowModalDetalleFactura(false)}
                className="w-full px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition font-medium"
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

export default PanelCargadores;