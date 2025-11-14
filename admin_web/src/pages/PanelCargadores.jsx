// admin_web/src/pages/PanelCargadores.jsx
/**
 * ✅ PANEL DE CARGADORES - VERSIÓN COMPLETA Y MEJORADA
 * 
 * Sistema completo de carga de camiones con:
 * - Notificaciones profesionales con sonner ✨
 * - Visualización de fotos de items con modal
 * - Subida de fotos de daños a Firebase Storage
 * - Checklist visual item por item
 * - Reporte de items dañados con evidencia
 * - Validaciones completas
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../services/api';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Truck, 
  Package, 
  CheckCircle, 
  AlertTriangle, 
  Camera,
  Box,
  Loader,
  MapPin,
  FileText,
  XCircle,
  ArrowLeft,
  Eye,
  X,
  Image as ImageIcon
} from 'lucide-react';

const PanelCargadores = () => {
  // Estados principales
  const [rutas, setRutas] = useState([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);
  const [vistaActual, setVistaActual] = useState('lista'); // 'lista' | 'detalle'
  
  // Estados de carga
  const [loading, setLoading] = useState(false);
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

  // ========================================
  // 📋 CARGAR RUTAS ASIGNADAS
  // ========================================
  useEffect(() => {
    cargarRutasAsignadas();
  }, []);

  const cargarRutasAsignadas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cargadores/rutas');
      
      if (response.data.success) {
        setRutas(response.data.data);
        
        if (response.data.total === 0) {
          toast.info('No tienes rutas asignadas en este momento');
        }
      }
    } catch (error) {
      console.error('Error cargando rutas:', error);
      toast.error('Error al cargar las rutas asignadas');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 📦 CARGAR DETALLE DE RUTA
  // ========================================
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

  // ========================================
  // 🚀 INICIAR CARGA
  // ========================================
  const handleIniciarCarga = async () => {
    if (!rutaSeleccionada) return;

    try {
      setProcesando(true);
      const response = await api.post(`/cargadores/rutas/${rutaSeleccionada.id}/iniciar-carga`);
      
      if (response.data.success) {
        toast.success('Carga iniciada exitosamente');
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error iniciando carga:', error);
      toast.error(error.response?.data?.message || 'Error al iniciar la carga');
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // ✅ CONFIRMAR ITEM CARGADO
  // ========================================
  const handleConfirmarItem = async (facturaId, itemIndex) => {
    try {
      setProcesando(true);
      
      const response = await api.post(
        `/cargadores/rutas/${rutaSeleccionada.id}/facturas/${facturaId}/items/confirmar`,
        { itemIndex }
      );
      
      if (response.data.success) {
        toast.success('Item confirmado como cargado');
        // Recargar detalle
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error confirmando item:', error);
      toast.error(error.response?.data?.message || 'Error al confirmar item');
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // 📷 SUBIR FOTOS A FIREBASE STORAGE
  // ========================================
  const subirFotosAFirebase = async (archivos, facturaId) => {
    const urls = [];
    
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const timestamp = Date.now();
      const nombreArchivo = `danos/${facturaId}/${timestamp}_${i}_${archivo.name}`;
      const storageRef = ref(storage, nombreArchivo);
      
      try {
        await uploadBytes(storageRef, archivo);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
      } catch (error) {
        console.error('Error subiendo foto:', error);
        throw error;
      }
    }
    
    return urls;
  };

  // ========================================
  // ⚠️ ABRIR MODAL REPORTAR DAÑO
  // ========================================
  const abrirModalDano = (facturaId, item, itemIndex) => {
    setItemDanado({ facturaId, item, itemIndex });
    setDescripcionDano('');
    setArchivosFotos([]);
    setShowModalDano(true);
  };

  // ========================================
  // ⚠️ REPORTAR ITEM DAÑADO
  // ========================================
  const handleReportarDano = async () => {
    if (!itemDanado || !descripcionDano.trim()) {
      toast.error('La descripción del daño es obligatoria');
      return;
    }

    try {
      setProcesando(true);
      setSubiendoFotos(true);

      // Subir fotos a Firebase Storage si hay
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
        toast.success('Item dañado reportado exitosamente', {
          description: urlsFotos.length > 0 
            ? `${urlsFotos.length} foto(s) adjuntada(s)` 
            : 'Sin fotos adjuntas'
        });
        setShowModalDano(false);
        
        // Recargar detalle
        await cargarDetalleRuta(rutaSeleccionada.id);
      }
    } catch (error) {
      console.error('Error reportando daño:', error);
      toast.error(error.response?.data?.message || 'Error al reportar daño');
    } finally {
      setProcesando(false);
      setSubiendoFotos(false);
    }
  };

  // ========================================
  // 🖼️ ABRIR GALERÍA DE FOTOS
  // ========================================
  const abrirGaleriaFotos = (fotos) => {
    setFotosGaleria(fotos);
    setFotoActual(0);
    setShowModalGaleria(true);
  };

  // ========================================
  // 🏁 FINALIZAR CARGA
  // ========================================
  const handleFinalizarCarga = async () => {
    if (!rutaSeleccionada) return;

    try {
      setProcesando(true);
      
      const response = await api.post(
        `/cargadores/rutas/${rutaSeleccionada.id}/finalizar-carga`,
        { notas: notasCarga }
      );
      
      if (response.data.success) {
        toast.success('Carga finalizada exitosamente', {
          description: 'Ruta lista para entrega'
        });
        setShowModalFinalizar(false);
        setNotasCarga('');
        
        // Volver a lista de rutas
        setVistaActual('lista');
        setRutaSeleccionada(null);
        await cargarRutasAsignadas();
      }
    } catch (error) {
      console.error('Error finalizando carga:', error);
      
      // Verificar si hay facturas sin cargar
      if (error.response?.data?.requiereConfirmacion) {
        const facturas = error.response.data.facturasIncompletas;
        toast.error('No se puede finalizar la carga', {
          description: `${facturas.length} factura(s) tienen items sin cargar`
        });
      } else {
        toast.error(error.response?.data?.message || 'Error al finalizar la carga');
      }
    } finally {
      setProcesando(false);
    }
  };

  // ========================================
  // 🎨 RENDER
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {vistaActual === 'detalle' && (
              <button
                onClick={() => {
                  setVistaActual('lista');
                  setRutaSeleccionada(null);
                }}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="text-gray-700 dark:text-gray-300" />
              </button>
            )}
            <Truck size={32} className="text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Panel de Cargadores
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {vistaActual === 'lista' 
                  ? 'Gestiona la carga de tus rutas asignadas'
                  : rutaSeleccionada?.nombre || 'Detalle de Ruta'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================
          VISTA: LISTA DE RUTAS
          ======================================== */}
      {vistaActual === 'lista' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-blue-600" size={40} />
            </div>
          ) : rutas.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                No tienes rutas asignadas en este momento
              </p>
            </div>
          ) : (
            rutas.map(ruta => (
              <div 
                key={ruta.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {ruta.nombre}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        ruta.estado === 'asignada' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {ruta.estado === 'asignada' ? '📋 Asignada' : '🔄 En Carga'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin size={16} />
                      <span>{ruta.zona}</span>
                    </div>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Facturas</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {ruta.estadisticas.totalFacturas}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Cargadas</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {ruta.estadisticas.facturasCargadas}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Items</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {ruta.estadisticas.itemsCargados}/{ruta.estadisticas.totalItems}
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Progreso</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {ruta.estadisticas.porcentajeCarga}%
                    </p>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${ruta.estadisticas.porcentajeCarga}%` }}
                    />
                  </div>
                </div>

                {/* Botón */}
                <button
                  onClick={() => cargarDetalleRuta(ruta.id)}
                  disabled={loadingDetalle}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loadingDetalle ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Box size={18} />
                      Ver Detalle y Comenzar Carga
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================
          VISTA: DETALLE DE RUTA
          ======================================== */}
      {vistaActual === 'detalle' && rutaSeleccionada && (
        <div className="space-y-6">
          {/* Header de la ruta */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {rutaSeleccionada.nombre}
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    rutaSeleccionada.estado === 'asignada' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {rutaSeleccionada.estado === 'asignada' ? '📋 Asignada' : '🔄 En Carga'}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {rutaSeleccionada.zona}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3">
                {rutaSeleccionada.estado === 'asignada' && (
                  <button
                    onClick={handleIniciarCarga}
                    disabled={procesando}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {procesando ? (
                      <>
                        <Loader className="animate-spin" size={18} />
                        Iniciando...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        Iniciar Carga
                      </>
                    )}
                  </button>
                )}

                {rutaSeleccionada.estado === 'en_carga' && (
                  <button
                    onClick={() => setShowModalFinalizar(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Finalizar Carga
                  </button>
                )}
              </div>
            </div>

            {/* Progreso general */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Facturas</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {rutaSeleccionada.facturas?.length || 0}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Items Cargados</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {rutaSeleccionada.facturas?.reduce((sum, f) => sum + (f.itemsCargados || 0), 0) || 0} / 
                  {rutaSeleccionada.facturas?.reduce((sum, f) => sum + (f.itemsTotal || 0), 0) || 0}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Progreso</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {(() => {
                    const total = rutaSeleccionada.facturas?.reduce((sum, f) => sum + (f.itemsTotal || 0), 0) || 0;
                    const cargados = rutaSeleccionada.facturas?.reduce((sum, f) => sum + (f.itemsCargados || 0), 0) || 0;
                    return total > 0 ? Math.round((cargados / total) * 100) : 0;
                  })()}%
                </p>
              </div>
            </div>
          </div>

          {/* Lista de facturas con items */}
          {rutaSeleccionada.facturas && rutaSeleccionada.facturas.length > 0 ? (
            <div className="space-y-4">
              {rutaSeleccionada.facturas.map((factura, facIndex) => {
                const porcentaje = factura.itemsTotal > 0 
                  ? Math.round((factura.itemsCargados / factura.itemsTotal) * 100)
                  : 0;

                return (
                  <div 
                    key={factura.id || facIndex}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
                  >
                    {/* Header de factura */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {factura.codigoTracking}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            factura.estadoCarga === 'cargada'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : factura.estadoCarga === 'en_carga'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {factura.estadoCarga === 'cargada' ? '✓ Cargada' : 
                             factura.estadoCarga === 'en_carga' ? '🔄 En Carga' : '⏳ Pendiente'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          👤 {factura.destinatario?.nombre || 'Sin nombre'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📍 {factura.destinatario?.direccion || 'Sin dirección'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Progreso</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {porcentaje}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {factura.itemsCargados}/{factura.itemsTotal} items
                        </p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>

                    {/* Lista de items */}
                    <div className="space-y-3">
                      {factura.items && factura.items.map((item, index) => (
                        <div 
                          key={index}
                          className={`p-4 rounded-lg border-2 transition ${
                            item.cargado
                              ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                {item.cargado && (
                                  <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                                )}
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {item.descripcion}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Cantidad: {item.cantidad}
                                  </p>
                                  
                                  {/* Fotos del item */}
                                  {item.fotos && item.fotos.length > 0 && (
                                    <button
                                      onClick={() => abrirGaleriaFotos(item.fotos)}
                                      className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                      <ImageIcon size={16} />
                                      Ver {item.fotos.length} foto(s)
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Botones de acción */}
                            {rutaSeleccionada.estado === 'en_carga' && (
                              <div className="flex gap-2 ml-4">
                                {!item.cargado && (
                                  <>
                                    <button
                                      onClick={() => handleConfirmarItem(factura.id, index)}
                                      disabled={procesando}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                                    >
                                      <CheckCircle size={16} />
                                      Cargar
                                    </button>
                                    <button
                                      onClick={() => abrirModalDano(factura.id, item, index)}
                                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium flex items-center gap-2"
                                    >
                                      <AlertTriangle size={16} />
                                      Dañado
                                    </button>
                                  </>
                                )}
                                {item.cargado && (
                                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                    ✓ Cargado
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Items dañados */}
                    {factura.itemsDanados && factura.itemsDanados.length > 0 && (
                      <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <p className="font-medium text-orange-800 dark:text-orange-200 mb-2 flex items-center gap-2">
                          <AlertTriangle size={18} />
                          Items dañados reportados:
                        </p>
                        {factura.itemsDanados.map((danado, idx) => (
                          <div key={idx} className="text-sm text-orange-700 dark:text-orange-300 ml-6 mb-2">
                            <p className="font-medium">• {danado.item.descripcion}</p>
                            <p className="ml-3">Daño: {danado.descripcionDano}</p>
                            {danado.fotos && danado.fotos.length > 0 && (
                              <button
                                onClick={() => abrirGaleriaFotos(danado.fotos)}
                                className="ml-3 text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                              >
                                <Camera size={12} />
                                Ver {danado.fotos.length} foto(s) del daño
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Notas */}
                    {factura.notas && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          📝 <span className="font-medium">Nota:</span> {factura.notas}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No hay facturas en esta ruta
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================
          MODAL: REPORTAR DAÑO
          ======================================== */}
      {showModalDano && itemDanado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="text-orange-600" />
                  Reportar Item Dañado
                </h2>
                <button
                  onClick={() => {
                    setShowModalDano(false);
                    setItemDanado(null);
                    setDescripcionDano('');
                    setArchivosFotos([]);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Item:</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {itemDanado.item.descripcion}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Cantidad: {itemDanado.item.cantidad}
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
                    disabled={procesando}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fotos del daño (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setArchivosFotos(Array.from(e.target.files))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    disabled={procesando}
                  />
                  {archivosFotos.length > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      ✓ {archivosFotos.length} foto(s) seleccionada(s)
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Se recomienda tomar fotos del daño como evidencia
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalDano(false);
                    setItemDanado(null);
                    setDescripcionDano('');
                    setArchivosFotos([]);
                  }}
                  disabled={procesando}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReportarDano}
                  disabled={procesando || !descripcionDano.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {procesando ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      {subiendoFotos ? 'Subiendo fotos...' : 'Reportando...'}
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} />
                      Reportar Daño
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: FINALIZAR CARGA
          ======================================== */}
      {showModalFinalizar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="text-green-600" />
                  Finalizar Carga
                </h2>
                <button
                  onClick={() => {
                    setShowModalFinalizar(false);
                    setNotasCarga('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                  ✓ Confirmo que:
                </p>
                <ul className="list-disc ml-5 space-y-1 text-sm text-green-700 dark:text-green-300">
                  <li>Todos los items están cargados en el camión</li>
                  <li>Los items dañados fueron reportados correctamente</li>
                  <li>El camión está listo para salir a ruta</li>
                  <li>He verificado que todo está en orden</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={notasCarga}
                  onChange={(e) => setNotasCarga(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                  placeholder="Observaciones sobre la carga..."
                  disabled={procesando}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModalFinalizar(false);
                    setNotasCarga('');
                  }}
                  disabled={procesando}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalizarCarga}
                  disabled={procesando}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {procesando ? (
                    <>
                      <Loader className="animate-spin" size={18} />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Finalizar Carga
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          MODAL: GALERÍA DE FOTOS
          ======================================== */}
      {showModalGaleria && fotosGaleria.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => {
                setShowModalGaleria(false);
                setFotosGaleria([]);
                setFotoActual(0);
              }}
              className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition z-10"
            >
              <X className="text-gray-900 dark:text-white" size={24} />
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
              <img 
                src={fotosGaleria[fotoActual]} 
                alt={`Foto ${fotoActual + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
              
              {fotosGaleria.length > 1 && (
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => setFotoActual(prev => (prev > 0 ? prev - 1 : fotosGaleria.length - 1))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    ← Anterior
                  </button>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {fotoActual + 1} / {fotosGaleria.length}
                  </span>
                  <button
                    onClick={() => setFotoActual(prev => (prev < fotosGaleria.length - 1 ? prev + 1 : 0))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelCargadores;