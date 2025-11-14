// ✅✅✅ VERSIÓN CORREGIDA - Llama a la API de Secretarías y recarga los datos ✅✅✅
// ✅ ACTUALIZADO: Reemplazado 'alert' con 'toast'

import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, doc, updateDoc, Timestamp, onSnapshot, orderBy } from 'firebase/firestore';
import api from '../services/api';
import { toast } from 'sonner'; // ✅ 1. Importar toast
import { Package, Truck, FileText, Phone, MapPin, CheckCircle, X, User, DollarSign, History } from 'lucide-react';

const PanelSecretarias = () => {
  // ... (estados existentes sin cambios)
  const [sistemaActivo, setSistemaActivo] = useState('embarques');
  const [activeTab, setActiveTab] = useState('sin_confirmar');
  const [embarques, setEmbarques] = useState([]);
  const [selectedEmbarque, setSelectedEmbarque] = useState('');
  const [selectedZona, setSelectedZona] = useState('todas');
  const [todasLasFacturas, setTodasLasFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [sector, setSector] = useState('');
  const [zona, setZona] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [estadoPago, setEstadoPago] = useState('pago_recibir');
  const [contenedoresRecibidos, setContenedoresRecibidos] = useState([]);
  const [contenedorSeleccionado, setContenedorSeleccionado] = useState('');
  const [rutaFiltro, setRutaFiltro] = useState('todas');
  const [loadingContenedores, setLoadingContenedores] = useState(false);
  const [facturaContenedorSeleccionada, setFacturaContenedorSeleccionada] = useState(null);
  const [tabContenedor, setTabContenedor] = useState('pendientes'); 
  const [modoEdicion, setModoEdicion] = useState(false);

  useEffect(() => {
    if (sistemaActivo === 'facturas_antiguas') {
      fetchEmbarques();
    } else if (sistemaActivo === 'embarques') {
      cargarContenedoresRecibidos();
    }
  }, [sistemaActivo]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (selectedEmbarque && sistemaActivo === 'facturas_antiguas') {
      unsubscribe = fetchFacturas();
    } else {
      setTodasLasFacturas([]);
    }
    // Cleanup: desuscribirse del listener de Firebase cuando el componente se desmonta o cambia el embarque
    return () => unsubscribe(); 
  }, [selectedEmbarque, sistemaActivo]); // Añadido sistemaActivo a la dependencia

  const fetchEmbarques = async () => {
    try {
      setLoading(true); // Poner loading para el sistema antiguo
      const response = await api.get('/embarques');
      
      if (response.data.success) {
        const embarquesActivos = (response.data.data || []).filter(e => e.estado === 'activo');
        setEmbarques(embarquesActivos);
      }
    } catch (error) {
      console.error('Error al cargar embarques:', error);
      toast.error('Error al cargar embarques'); // ✅ Reemplazar alert
    } finally {
      setLoading(false);
    }
  };

  const fetchFacturas = () => {
    // Esta función ahora devuelve el 'unsubscribe'
    try {
      setLoading(true);
      const facturasRef = collection(db, 'facturas');
      
      let q = query(
        facturasRef, 
        where('embarqueId', '==', selectedEmbarque),
        orderBy('numeroFactura', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const facturasData = (snapshot.docs || [])
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(f => 
            f.estado === 'sin_confirmar' || 
            f.estado === 'pendiente_contacto' || 
            f.estado === 'confirmada' || 
            f.estado === 'no_entregado'
          );
        
        setTodasLasFacturas(facturasData);
        setLoading(false);
      });

      return unsubscribe; // Devolver la función de limpieza
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      setLoading(false);
      return () => {}; // Devolver función vacía en caso de error
    }
  };

  const cargarContenedoresRecibidos = async () => {
    try {
      setLoadingContenedores(true);
      // ✅ Esta es la ruta correcta según tu secretariasController.js
      const response = await api.get('/secretarias/contenedores'); 
      
      if (response.data.success) {
        setContenedoresRecibidos(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando contenedores recibidos:', error);
      toast.error('Error al cargar contenedores recibidos'); // ✅ Reemplazar alert
    } finally {
      setLoadingContenedores(false);
    }
  };

  // ✅ Nueva función para cargar las facturas de UN contenedor
  const cargarFacturasDelContenedor = async (contenedorId) => {
    try {
      setLoading(true);
      const response = await api.get(`/secretarias/contenedores/${contenedorId}/facturas`);
      if (response.data.success) {
        // Actualizar el contenedor en el estado con las facturas detalladas
        setContenedoresRecibidos(prev => prev.map(c => 
          c.id === contenedorId 
            ? { ...c, ...response.data.data.contenedor, facturas: response.data.data.facturas } 
            : c
        ));
      }
    } catch (error) {
      console.error('Error cargando facturas del contenedor:', error);
      toast.error('Error al cargar facturas del contenedor'); // ✅ Reemplazar alert
    } finally {
      setLoading(false);
    }
  };


  const getContenedorActual = () => {
    if (!contenedorSeleccionado) return null;
    return contenedoresRecibidos.find(c => c.id === contenedorSeleccionado);
  };

  // ✅ Filtro para facturas PENDIENTES de confirmar
  const getFacturasCompletasSinConfirmar = (contenedor) => {
    if (!contenedor || !contenedor.facturas) return [];
    
    return contenedor.facturas.filter(f => {
      // Usar el estado de confirmación del controlador de secretarias
      const esConfirmada = f.confirmadaPorSecretaria === true;
      
      const estadoReal = f.estadoItems || f.estadoFactura || f.estado;
      const esCompleta = estadoReal === 'completo' || estadoReal === 'completa';
      
      const zonaFactura = f.destinatario?.zona || f.zona || '';
      const cumpleZona = rutaFiltro === 'todas' || zonaFactura === rutaFiltro;
      
      return esCompleta && !esConfirmada && cumpleZona;
    });
  };

  // ✅ Nuevo filtro para facturas YA CONFIRMADAS
  const getFacturasContenedorConfirmadas = (contenedor) => {
    if (!contenedor || !contenedor.facturas) return [];
    
    return contenedor.facturas.filter(f => {
      const esConfirmada = f.confirmadaPorSecretaria === true;
      
      const zonaFactura = f.destinatario?.zona || f.zona || '';
      const cumpleZona = rutaFiltro === 'todas' || zonaFactura === rutaFiltro;
      
      return esConfirmada && cumpleZona;
    });
  };


  const getZonasDisponiblesEnContenedor = (contenedor) => {
    if (!contenedor || !contenedor.facturas) return [];
    
    const zonas = new Set();
    contenedor.facturas
      .filter(f => {
        // Mostrar zonas de todas las facturas completas (confirmadas o no)
        const estadoReal = f.estadoItems || f.estadoFactura || f.estado;
        return estadoReal === 'completo' || estadoReal === 'completa';
      })
      .forEach(f => {
        const zonaFactura = f.destinatario?.zona || f.zona;
        if (zonaFactura) {
          zonas.add(zonaFactura);
        }
      });
    
    return Array.from(zonas).sort();
  };

  // ✅✅✅ FUNCIÓN CORREGIDA - Llama a la API de SECRETARIAS ✅✅✅
  const handleConfirmarFacturaContenedor = async () => {
    if (!facturaContenedorSeleccionada || !contenedorSeleccionado) return;

    const facturaId = facturaContenedorSeleccionada.id;

    try {
      // 1. Llamar a la API correcta (POST /secretarias/facturas/:id/confirmar)
      const response = await api.post(
        `/secretarias/facturas/${facturaId}/confirmar`,
        {
          notasSecretaria: observaciones // Enviar solo las notas
        }
      );

      if (response.data.success) {
        toast.success('Factura confirmada exitosamente'); // ✅ Reemplazar alert
        setShowConfirmModal(false);
        resetForm();
        
        // 2. ✅ RECARGAR los datos desde la BD
        // Como el back-end ya actualizó el contenedor, esta llamada
        // traerá los datos frescos y la factura aparecerá como "confirmada".
        await cargarFacturasDelContenedor(contenedorSeleccionado);
        
      }
    } catch (error) {
      console.error('Error confirmando factura:', error);
      toast.error(error.response?.data?.message || 'Error al confirmar la factura'); // ✅ Reemplazar alert
    }
  };
  
  // ✅✅✅ NUEVA FUNCIÓN - Para editar la factura ✅✅✅
  const handleEditarFacturaContenedor = async () => {
    if (!facturaContenedorSeleccionada) return;

    if (!telefono || !direccion) {
      toast.warning('Teléfono y dirección son obligatorios'); // ✅ Reemplazar alert
      return;
    }
    
    const facturaId = facturaContenedorSeleccionada.id;
    
    // Datos a enviar (según secretariasController.js)
    const updateData = {
      destinatario: {
        telefono: telefono,
        direccion: direccion,
        sector: sector,
        zona: zona,
      },
      pago: {
        estado: estadoPago,
      },
      notasSecretaria: observaciones
    };

    try {
      // 1. Llamar a la API de edición
      const response = await api.put(
        `/secretarias/facturas/${facturaId}`,
        updateData
      );

      if (response.data.success) {
        toast.success('Factura editada exitosamente'); // ✅ Reemplazar alert
        setShowConfirmModal(false);
        resetForm();
        
        // 2. Recargar las facturas de este contenedor
        await cargarFacturasDelContenedor(contenedorSeleccionado);
        
      }
    } catch (error) {
      console.error('Error editando factura:', error);
      toast.error(error.response?.data?.message || 'Error al editar la factura'); // ✅ Reemplazar alert
    }
  };


  const openConfirmModal = (factura, esContenedor = false, edicion = false) => {
    setModoEdicion(edicion); // Settear si es modo edición
    
    if (esContenedor) {
      setFacturaContenedorSeleccionada(factura);
      setTelefono(factura.destinatario?.telefono || factura.telefono || '');
      setDireccion(factura.destinatario?.direccion || factura.direccion || '');
      setSector(factura.destinatario?.sector || factura.sector || '');
      setZona(factura.destinatario?.zona || factura.zona || '');
      setObservaciones(factura.notasSecretaria || factura.observaciones || ''); // Usar notasSecretaria
      setEstadoPago(factura.pago?.estado || 'pago_recibir');
    } else {
      setSelectedFactura(factura);
      setTelefono(factura.telefono || '');
      setDireccion(factura.direccion || '');
      setSector(factura.sector || '');
      setZona(factura.zona || '');
      setObservaciones(factura.observaciones || '');
      setEstadoPago(factura.estadoPago || 'pago_recibir');
    }
    
    setShowConfirmModal(true);
  };

  const handleModalSubmit = async () => {
    // Determinar si estamos en sistema antiguo o nuevo
    if (facturaContenedorSeleccionada) {
      // Sistema nuevo
      if (modoEdicion) {
        await handleEditarFacturaContenedor();
      } else {
        // Si no es modo edición, es modo confirmación
        await handleConfirmarFacturaContenedor();
      }
    } else {
      // Sistema antiguo
      // Asumimos que el sistema antiguo solo confirma (no tiene modo edición separado)
      await handleConfirmarFactura();
    }
  };


  const handleConfirmarFactura = async () => {
    if (facturaContenedorSeleccionada) {
      // Redirigir al submit unificado
      await handleModalSubmit();
      return;
    }

    if (!selectedFactura) return;

    if (!telefono || !direccion || !zona) {
      toast.warning('Teléfono, dirección y ZONA son obligatorios'); // ✅ Reemplazar alert
      return;
    }

    try {
      const facturaRef = doc(db, 'facturas', selectedFactura.id);
      
      await updateDoc(facturaRef, {
        estado: 'confirmada',
        telefono,
        direccion,
        sector,
        zona,
        observaciones,
        estadoPago,
        fechaConfirmacion: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Factura confirmada exitosamente (Sistema Antiguo)'); // ✅ Reemplazar alert
      setShowConfirmModal(false);
      resetForm();
      // El onSnapshot debería actualizar la lista automáticamente.
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al confirmar factura'); // ✅ Reemplazar alert
    }
  };

  const handleMarcarPendiente = async () => {
    if (!selectedFactura) return;

    try {
      const facturaRef = doc(db, 'facturas', selectedFactura.id);
      
      await updateDoc(facturaRef, {
        estado: 'pendiente_contacto',
        observaciones: observaciones || 'No se pudo contactar',
        updatedAt: Timestamp.now()
      });

      toast.info('Factura marcada como pendiente (Sistema Antiguo)'); // ✅ Reemplazar alert
      setShowConfirmModal(false);
      resetForm();
      // El onSnapshot debería actualizar la lista automáticamente.

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al marcar como pendiente'); // ✅ Reemplazar alert
    }
  };

  const resetForm = () => {
    setSelectedFactura(null);
    setFacturaContenedorSeleccionada(null);
    setTelefono('');
    setDireccion('');
    setSector('');
    setZona('');
    setObservaciones('');
    setEstadoPago('pago_recibir');
    setModoEdicion(false); // Resetear modo edición
  };

  const handleCall = (telefono) => {
    if (telefono) {
      window.location.href = `tel:${telefono}`;
    }
  };

  // --- Recálculo de facturas filtradas para sistema antiguo ---
  const facturasFiltradas = todasLasFacturas.filter(f => {
    let pasaEstado = false;
    switch (activeTab) {
      case 'sin_confirmar':
        pasaEstado = f.estado === 'sin_confirmar';
        break;
      case 'pendientes':
        pasaEstado = f.estado === 'pendiente_contacto';
        break;
      case 'confirmadas':
        pasaEstado = f.estado === 'confirmada';
        break;
      case 'no_entregadas':
        pasaEstado = f.estado === 'no_entregado';
        break;
      default:
        pasaEstado = false;
    }

    let pasaZona = selectedZona === 'todas' || f.zona === selectedZona;
    return pasaEstado && pasaZona;
  });

  // --- Recálculo de contadores para sistema antiguo ---
  const contadores = {
    sin_confirmar: todasLasFacturas.filter(f => f.estado === 'sin_confirmar' && (selectedZona === 'todas' || f.zona === selectedZona)).length,
    pendientes: todasLasFacturas.filter(f => f.estado === 'pendiente_contacto' && (selectedZona === 'todas' || f.zona === selectedZona)).length,
    confirmadas: todasLasFacturas.filter(f => f.estado === 'confirmada' && (selectedZona === 'todas' || f.zona === selectedZona)).length,
    no_entregadas: todasLasFacturas.filter(f => f.estado === 'no_entregado' && (selectedZona === 'todas' || f.zona === selectedZona)).length
  };

  // ✅ Renderizar facturas del contenedor
  const renderFacturasContenedor = () => {
    const contenedorActual = getContenedorActual();
    let facturasAMostrar = [];
    let esPendiente = true;

    if (tabContenedor === 'pendientes') {
      facturasAMostrar = getFacturasCompletasSinConfirmar(contenedorActual);
      esPendiente = true;
    } else {
      facturasAMostrar = getFacturasContenedorConfirmadas(contenedorActual);
      esPendiente = false;
    }

    if (!contenedorActual) {
      // Esto no debería mostrarse si !contenedorSeleccionado es manejado afuera
      return null;
    }
    
    // ✅ Chequear si las facturas tienen datos detallados
    if (contenedorActual.facturas && contenedorActual.facturas.length > 0 && !contenedorActual.facturas[0].destinatario) {
       // Aún no se han cargado los detalles de las facturas
       return (
         <div className="text-center py-12">
           <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
           <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando detalles de facturas...</p>
         </div>
       );
    }

    if (facturasAMostrar.length === 0) {
      return (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <CheckCircle className="mx-auto text-green-600 mb-4" size={48} />
          <p className="text-green-800 dark:text-green-200 text-lg font-medium">
            🎉 No hay facturas {esPendiente ? 'pendientes' : 'confirmadas'}
            {rutaFiltro !== 'todas' && ` en la zona ${rutaFiltro}`}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {facturasAMostrar.map(factura => {
          const estadoReal = factura.estadoItems || factura.estadoFactura || factura.estado;
          const esCompleta = estadoReal === 'completo' || estadoReal === 'completa';
          
          return (
            <div
              key={factura.facturaId || factura.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex-1 min-w-[250px]">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {factura.numeroFactura || factura.codigoTracking}
                    </span>
                    
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      esCompleta
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {esCompleta ? '✅ Completa' : '⚠️ Incompleta'}
                    </span>
                    
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                      📦 {factura.itemsMarcados || 0}/{factura.itemsTotal || factura.items?.length || 0}
                    </span>
                    
                    {(factura.destinatario?.zona || factura.zona) && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded flex items-center gap-1">
                        <MapPin size={14} />
                        {factura.destinatario?.zona || factura.zona}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-900 dark:text-white font-medium mb-1">
                    👤 {factura.destinatario?.nombre || factura.nombreCliente || factura.cliente || 'Sin nombre'}
                  </p>

                  {(factura.destinatario?.telefono || factura.telefono) && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      📞 {factura.destinatario?.telefono || factura.telefono}
                      <button
                        onClick={() => handleCall(factura.destinatario?.telefono || factura.telefono)}
                        className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        Llamar
                      </button>
                    </p>
                  )}

                  {(factura.destinatario?.direccion || factura.direccion) && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      📍 {factura.destinatario?.direccion || factura.direccion}
                      {(factura.destinatario?.sector || factura.sector) && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                          ({factura.destinatario?.sector || factura.sector})
                        </span>
                      )}
                    </p>
                  )}

                  {factura.observaciones && (
                    <p className="text-gray-500 dark:text-gray-500 text-sm italic mt-2">
                      📝 {factura.observaciones}
                    </p>
                  )}
                  {factura.notasSecretaria && (
                    <p className="text-blue-500 dark:text-blue-400 text-sm italic mt-2">
                      🗣️: {factura.notasSecretaria}
                    </p>
                  )}
                </div>

                <div className="ml-4 flex-shrink-0 flex flex-col gap-2">
                  {esPendiente ? (
                    <button
                      onClick={() => openConfirmModal(factura, true, false)} // false = no es edición
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Confirmar
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg text-sm font-medium flex items-center gap-2">
                      <CheckCircle size={16} />
                      Confirmada
                    </span>
                  )}
                  {/* Botón de Editar siempre visible */}
                  <button
                    onClick={() => openConfirmModal(factura, true, true)} // true = sí es edición
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition text-sm font-medium flex items-center gap-2"
                  >
                    ✏️ Editar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Secretarias</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Confirma y gestiona facturas de embarques y contenedores
        </p>
      </div>

      {/* Selector de Sistema */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setSistemaActivo('embarques')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition font-semibold ${
            sistemaActivo === 'embarques'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Truck size={20} />
          Contenedores Recibidos
          {contenedoresRecibidos.length > 0 && (
            <span className="ml-1 bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {contenedoresRecibidos.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSistemaActivo('facturas_antiguas')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition font-semibold ${
            sistemaActivo === 'facturas_antiguas'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <FileText size={20} />
          Sistema Antiguo
        </button>
      </div>

      {/* SISTEMA NUEVO */}
      {sistemaActivo === 'embarques' && (
        <div>
          {/* Selector de Contenedor */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Seleccionar Contenedor
            </label>
            <select
              value={contenedorSeleccionado}
              onChange={(e) => {
                setContenedorSeleccionado(e.target.value);
                setRutaFiltro('todas');
                setTabContenedor('pendientes'); // Resetear a pendientes
                if (e.target.value) {
                  // ✅ Cargar facturas detalladas al seleccionar
                  cargarFacturasDelContenedor(e.target.value);
                }
              }}
              className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Seleccionar Contenedor --</option>
              {contenedoresRecibidos.map(contenedor => {
                // Usar las estadísticas que vienen de la API
                const facturasPendientes = contenedor.estadisticas?.facturasPendientes || 0;
                return (
                  <option key={contenedor.id} value={contenedor.id}>
                    {contenedor.numeroContenedor} ({facturasPendientes} facturas por confirmar)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Filtro de Ruta */}
          {contenedorSeleccionado && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por Zona de Entrega
              </label>
              <select
                value={rutaFiltro}
                onChange={(e) => setRutaFiltro(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas las zonas</option>
                {getZonasDisponiblesEnContenedor(getContenedorActual()).map(zona => {
                  const contenedorActual = getContenedorActual();
                  if (!contenedorActual) return null; // Guard
                  
                  // Contar pendientes y confirmadas para la zona
                  const numPendientes = (contenedorActual.facturas || []).filter(f => {
                    const estadoReal = f.estadoItems || f.estadoFactura || f.estado;
                    const esCompleta = estadoReal === 'completo' || estadoReal === 'completa';
                    const zonaFactura = f.destinatario?.zona || f.zona;
                    return zonaFactura === zona && esCompleta && f.confirmadaPorSecretaria !== true;
                  }).length;
                  
                  const numConfirmadas = (contenedorActual.facturas || []).filter(f => {
                    const zonaFactura = f.destinatario?.zona || f.zona;
                    return zonaFactura === zona && f.confirmadaPorSecretaria === true;
                  }).length;

                  const zonaLabel = {
                    'Capital': '🏙️ Capital',
                    'Cibao': '⛰️ Cibao',
                    'Sur': '🌊 Sur',
                    'Este': '🏖️ Este',
                    'Local': '🏘️ Local (Baní)'
                  }[zona] || zona;
                  
                  return (
                    <option key={zona} value={zona}>
                      {zonaLabel} ({numPendientes} pend, {numConfirmadas} conf)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {loadingContenedores ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando contenedores...</p>
            </div>
          ) : contenedoresRecibidos.length === 0 ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
              <Package className="mx-auto text-blue-600 mb-4" size={64} />
              <p className="text-blue-800 dark:text-blue-200 text-lg font-medium">
                No hay contenedores recibidos disponibles
              </p>
            </div>
          ) : !contenedorSeleccionado ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
              <Package className="mx-auto text-blue-600 mb-4" size={48} />
              <p className="text-blue-800 dark:text-blue-200 text-lg font-medium">
                📦 Selecciona un contenedor para empezar a confirmar facturas
              </p>
            </div>
          ) : (() => {
            const contenedorActual = getContenedorActual();
            // Usar los filtros que leen la data detallada
            const facturasPendientes = getFacturasCompletasSinConfirmar(contenedorActual).length;
            const facturasConfirmadas = getFacturasContenedorConfirmadas(contenedorActual).length;

            return (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <Package className="text-blue-600" size={32} />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {contenedorActual.numeroContenedor}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {rutaFiltro !== 'todas' ? `Zona: ${rutaFiltro}` : 'Todas las zonas'}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-800 dark:text-blue-100 rounded-full text-sm font-medium">
                    Recibido
                  </span>
                </div>

                {/* ✅ Pestañas de Pendientes y Confirmadas */}
                <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setTabContenedor('pendientes')}
                    className={`pb-3 px-4 font-medium transition-colors ${
                      tabContenedor === 'pendientes'
                        ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={16} />
                      Pendientes
                    </span>
                    {facturasPendientes > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {facturasPendientes}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setTabContenedor('confirmadas')}
                    className={`pb-3 px-4 font-medium transition-colors ${
                      tabContenedor === 'confirmadas'
                        ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <History size={16} />
                      Confirmadas
                    </span>
                    {facturasConfirmadas > 0 && (
                      <span className="ml-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {facturasConfirmadas}
                      </span>
                    )}
                  </button>
                </div>
                
                {/* Renderizar la lista de facturas basada en la pestaña */}
                {renderFacturasContenedor()}
              </div>
            );
          })()}
        </div>
      )}

      {/* SISTEMA ANTIGUO (Sin cambios) */}
      {sistemaActivo === 'facturas_antiguas' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Embarque
              </label>
              <select
                value={selectedEmbarque}
                onChange={(e) => setSelectedEmbarque(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar embarque...</option>
                {embarques.map(e => (
                  <option key={e.id || e._id} value={e.id || e._id}>
                    {e.nombre} - {new Date(e.fechaCreacion).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Zona de Entrega
              </label>
              <select
                value={selectedZona}
                onChange={(e) => setSelectedZona(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todas">Todas las zonas</option>
                <option value="capital">🏙️ Capital</option>
                <option value="cibao">⛰️ Cibao</option>
                <option value="sur">🌊 Sur</option>
                <option value="local_bani">🏘️ Local (Baní)</option>
              </select>
            </div>
          </div>

          {!selectedEmbarque ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
              <p className="text-blue-800 dark:text-blue-200 text-lg font-medium">
                📦 Selecciona un embarque para empezar
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('sin_confirmar')}
                  className={`pb-3 px-4 font-medium transition-colors ${
                    activeTab === 'sin_confirmar'
                      ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Sin Confirmar
                  {contadores.sin_confirmar > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {contadores.sin_confirmar}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => setActiveTab('pendientes')}
                  className={`pb-3 px-4 font-medium transition-colors ${
                    activeTab === 'pendientes'
                      ? 'border-b-2 border-yellow-600 text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Pendientes
                  {contadores.pendientes > 0 && (
                    <span className="ml-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {contadores.pendientes}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('confirmadas')}
                  className={`pb-3 px-4 font-medium transition-colors ${
                    activeTab === 'confirmadas'
                      ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  Confirmadas
                  {contadores.confirmadas > 0 && (
                    <span className="ml-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {contadores.confirmadas}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('no_entregadas')}
                  className={`pb-3 px-4 font-medium transition-colors ${
                    activeTab === 'no_entregadas'
                      ? 'border-b-2 border-orange-600 text-orange-600 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  No Entregadas
                  {contadores.no_entregadas > 0 && (
                    <span className="ml-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {contadores.no_entregadas}
                    </span>
                  )}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando facturas...</p>
                </div>
              ) : facturasFiltradas.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    {activeTab === 'sin_confirmar' && '🎉 No hay facturas sin confirmar'}
                    {activeTab === 'pendientes' && '👍 No hay facturas pendientes'}
                    {activeTab === 'confirmadas' && '📝 No hay facturas confirmadas aún'}
                    {activeTab === 'no_entregadas' && '✅ No hay facturas no entregadas'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {facturasFiltradas.map((factura) => (
                    <div
                      key={factura.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div className="flex-1 min-w-[250px]">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                              #{factura.numeroFactura}
                            </span>
                            
                            {factura.zona && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded">
                                {factura.zona === 'capital' && '🏙️ Capital'}
                                {factura.zona === 'cibao' && '⛰️ Cibao'}
                                {factura.zona === 'sur' && '🌊 Sur'}
                                {factura.zona === 'local_bani' && '🏘️ Local'}
                              </span>
                            )}
                          </div>

                          <p className="text-gray-900 dark:text-white font-medium mb-1">
                            👤 {factura.cliente}
                          </p>

                          {factura.telefono && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                              📞 {factura.telefono}
                              <button
                                onClick={() => handleCall(factura.telefono)}
                                className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              >
                                Llamar
                              </button>
                            </p>
                          )}

                          {factura.direccion && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                              📍 {factura.direccion}
                              {factura.sector && (
                                <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                                  ({factura.sector})
                                </span>
                              )}
                            </p>
                          )}

                          {factura.contenido && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                              📦 {factura.contenido}
                            </p>
                          )}

                          {factura.estadoPago && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              {factura.estadoPago === 'pagado' ? '✅ Pagado' : '💵 Cobrar al entregar'}
                            </p>
                          )}

                          {factura.observaciones && (
                            <p className="text-gray-500 dark:text-gray-500 text-sm italic mt-2">
                              📝 {factura.observaciones}
                            </p>
                          )}
                        </div>

                        <div className="ml-4 flex flex-col gap-2 flex-shrink-0">
                          {(activeTab === 'sin_confirmar' || activeTab === 'pendientes') && (
                            <button
                              onClick={() => openConfirmModal(factura, false)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                              {activeTab === 'pendientes' ? '🔄 Re-intentar' : '✅ Confirmar'}
                            </button>
                          )}
                          
                          {activeTab === 'confirmadas' && (
                            <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-sm font-medium text-center">
                              ✓ Confirmada
                            </span>
                          )}

                          {activeTab === 'no_entregadas' && (
                            <button
                              onClick={() => openConfirmModal(factura, false)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                            >
                              🔄 Reasignar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL CONFIRMAR - DISEÑO MEJORADO */}
      {showConfirmModal && (selectedFactura || facturaContenedorSeleccionada) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl my-8">
            {/* Header */}
            <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {/* ✅ Título dinámico */}
                  {modoEdicion ? 'Editar Factura' : 'Confirmar Factura'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedFactura?.numeroFactura || facturaContenedorSeleccionada?.numeroFactura || facturaContenedorSeleccionada?.codigoTracking}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Info del Cliente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Remitente */}
                {(facturaContenedorSeleccionada?.remitente || selectedFactura?.remitente) && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <User size={18} />
                      Remitente
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">
                        <strong>Nombre:</strong> {
                          facturaContenedorSeleccionada?.remitente?.nombre || 
                          selectedFactura?.remitente?.nombre || 
                          'N/A'
                        }
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Phone size={14} />
                        {facturaContenedorSeleccionada?.remitente?.telefono || 
                          selectedFactura?.remitente?.telefono || 
                          'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Destinatario */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <User size={18} />
                    Destinatario
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Nombre:</strong> {
                        selectedFactura?.cliente || 
                        facturaContenedorSeleccionada?.destinatario?.nombre || 
                        facturaContenedorSeleccionada?.nombreCliente || 
                        'Sin nombre'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {facturaContenedorSeleccionada?.items && facturaContenedorSeleccionada.items.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Items ({facturaContenedorSeleccionada.items.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {facturaContenedorSeleccionada.items.map((item, index) => (
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
                        {item.precio && (
                          <p className="font-bold text-gray-900 dark:text-white">
                            ${item.precio}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Facturación */}
              {facturaContenedorSeleccionada?.facturacion && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <DollarSign size={18} />
                    Facturación
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Subtotal:</span>
                      <span>${(facturaContenedorSeleccionada.facturacion.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>ITBIS (18%):</span>
                      <span>${(facturaContenedorSeleccionada.facturacion.itbis || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t border-gray-300 dark:border-gray-600 pt-2">
                      <span>Total:</span>
                      <span>
                        ${(facturaContenedorSeleccionada.facturacion.total || 0).toFixed(2)} {facturaContenedorSeleccionada.facturacion.moneda || 'USD'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de Confirmación */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle size={18} />
                  Información de Entrega
                </h4>
                
                <div className="space-y-4">
                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Teléfono *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="809-555-1234"
                      />
                      {telefono && (
                        <button
                          onClick={() => handleCall(telefono)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <Phone size={16} />
                          Llamar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dirección *
                    </label>
                    <input
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Calle Principal #123"
                    />
                  </div>

                  {/* Sector y Zona */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Sector
                      </label>
                      <input
                        type="text"
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ej: Los Jardines"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Zona de Entrega *
                      </label>
                      {/* Para sistema antiguo y nuevo, la zona debe ser editable */}
                      <select
                        value={zona}
                        onChange={(e) => setZona(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                          !zona ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">-- Seleccionar --</option>
                        <option value="Capital">🏙️ Capital</option>
                        <option value="Cibao">⛰️ Cibao</option>
                        <option value="Sur">🌊 Sur</option>
                        <option value="Este">🏖️ Este</option>
                        <option value="Local">🏘️ Local (Baní)</option>
                        <option value="Yaguate y Sur">📍 Yaguate y Sur</option>
                      </select>
                    </div>
                  </div>

                  {/* Estado del Pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Estado del Pago *
                    </label>
                    <select
                      value={estadoPago}
                      onChange={(e) => setEstadoPago(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pago_recibir">💵 Pago al recibir</option>
                      <option value="pagado">✅ Ya pagado</option>
                      <option value="parcial">📊 Pago Parcial</option>
                      <option value="contraentrega">🚚 Contra Entrega</option>
                    </select>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Observaciones (Notas de Secretaria)
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Notas adicionales sobre la entrega..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              
              {activeTab !== 'no_entregadas' && selectedFactura && (
                <button
                  onClick={handleMarcarPendiente}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  ⏳ Marcar Pendiente
                </button>
              )}
              
              {/* ✅ Botón dinámico */}
              <button
                onClick={handleModalSubmit}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition flex items-center justify-center gap-2 ${
                  modoEdicion 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <CheckCircle size={18} />
                {modoEdicion ? 'Guardar Cambios' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelSecretarias;