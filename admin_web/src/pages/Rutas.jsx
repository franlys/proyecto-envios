// ✅ VERSIÓN FINAL: Sistema LIFO Unificado con Filtros Jerárquicos
// ✅ ACTUALIZADO: "Vista Previa" ahora agrupa por sector

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Truck, Users, AlertCircle, Eye, Package } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext'; 

// --- MAPEO DE ZONAS ---
const zonasPrincipalesMap = {
  'Distrito Nacional': 'Capital',
  'SD Este': 'Capital',
  'SD Norte': 'Capital',
  'SD Oeste': 'Capital',
  'Yaguate y Sur': 'Capital',
  'Santiago': 'Cibao',
  'La Vega': 'Cibao',
  'San Francisco de Macorís': 'Cibao',
  'Moca': 'Cibao',
  'La Romana': 'Este',
  'Punta Cana': 'Este',
  'Bávaro': 'Este',
  'Higüey': 'Este',
  'San Pedro de Macorís': 'Este',
  'Barahona': 'Sur',
  'Azua': 'Sur',
  'Baní': 'Sur',
  'Recogida Almacén': 'Local',
};
// --- --- ---

const Rutas = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [activeTab, setActiveTab] = useState('activas');
  
  // Estados del modal
  const [repartidores, setRepartidores] = useState([]);
  const [facturas, setFacturas] = useState([]); 
  const [selectedFacturas, setSelectedFacturas] = useState([]);
  const [selectedRepartidor, setSelectedRepartidor] = useState('');
  const [nombreRuta, setNombreRuta] = useState('');
  const [searchFactura, setSearchFactura] = useState('');

  // ESTADOS PARA SISTEMA LIFO UNIFICADO
  const [showModalAvanzado, setShowModalAvanzado] = useState(false);
  const [cargadores, setCargadores] = useState([]);
  const [selectedCargadores, setSelectedCargadores] = useState([]);
  const [direccionCarga, setDireccionCarga] = useState('adelante-atras');
  const [ordenEntrega, setOrdenEntrega] = useState('cercanas-primero');
  const [showVistaPrevia, setShowVistaPrevia] = useState(false);
  const [facturasConOrden, setFacturasConOrden] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [montoAsignado, setMontoAsignado] = useState(''); 

  // ESTADOS PARA FILTROS JERÁRQUICOS
  const [contenedoresDisponibles, setContenedoresDisponibles] = useState([]); 
  const [selectedContenedor, setSelectedContenedor] = useState(''); 
  const [selectedZonaPrincipal, setSelectedZonaPrincipal] = useState('');
  const [selectedSubzona, setSelectedSubzona] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  useEffect(() => {
    fetchRutas();
  }, []);

  // Efecto para cargar facturas cuando cambia el contenedor
  useEffect(() => {
    if (showModalAvanzado) {
      fetchFacturasDisponibles();
    }
  }, [selectedContenedor, showModalAvanzado]);


  const fetchRutas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rutas');
      
      if (response.data.success) {
        setRutas(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar rutas');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  };

  // Cargar facturas (depende del contenedor)
  const fetchFacturasDisponibles = async () => {
    setLoadingModal(true);
    try {
      let url = '/rutas/facturas-disponibles';
      if (selectedContenedor) {
        url += `?contenedorId=${selectedContenedor}`;
      }
      
      const facturasRes = await api.get(url);
      if (facturasRes.data.success) {
        setFacturas(facturasRes.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      toast.error('Error al cargar facturas disponibles');
    } finally {
      setLoadingModal(false);
    }
  };

  // MODAL UNIFICADO (ACTUALIZADO)
  const openCreateModalAvanzado = async () => {
    setLoadingModal(true);
    try {
      // Cargar repartidores
      const repartidoresRes = await api.get('/rutas/repartidores-disponibles');
      if (repartidoresRes.data.success) setRepartidores(repartidoresRes.data.data || []);
      
      // Cargar cargadores
      const cargadoresRes = await api.get('/rutas/cargadores-disponibles');
      if (cargadoresRes.data.success) setCargadores(cargadoresRes.data.data || []);
      
      // Cargar contenedores disponibles
      const contenedoresRes = await api.get('/rutas/contenedores-disponibles');
      if (contenedoresRes.data.success) setContenedoresDisponibles(contenedoresRes.data.data || []);

      // Las facturas se cargarán con el useEffect
      setFacturas([]); // Iniciar vacío
      
      setShowModalAvanzado(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos para crear ruta');
    } finally {
      setLoadingModal(false);
    }
  };


  const toggleFactura = (facturaId) => {
    setSelectedFacturas(prev => {
      if (prev.includes(facturaId)) {
        return prev.filter(id => id !== facturaId);
      } else {
        return [...prev, facturaId];
      }
    });
  };

  const toggleCargador = (cargadorId) => {
    setSelectedCargadores(prev =>
      prev.includes(cargadorId)
        ? prev.filter(id => id !== cargadorId)
        : [...prev, cargadorId]
    );
  };

  // LÓGICA DE FILTROS JERÁRQUICOS
  const zonasPrincipalesDisponibles = useMemo(() => {
    const zonas = facturas.map(f => zonasPrincipalesMap[f.zona]).filter(Boolean);
    return [...new Set(zonas)].sort();
  }, [facturas]);

  const subzonasDisponibles = useMemo(() => {
    const subzonas = facturas
      .filter(f => !selectedZonaPrincipal || zonasPrincipalesMap[f.zona] === selectedZonaPrincipal)
      .map(f => f.zona)
      .filter(Boolean);
    return [...new Set(subzonas)].sort();
  }, [facturas, selectedZonaPrincipal]);

  const sectoresDisponibles = useMemo(() => {
    const sectores = facturas
      .filter(f => 
        (!selectedZonaPrincipal || zonasPrincipalesMap[f.zona] === selectedZonaPrincipal) &&
        (!selectedSubzona || f.zona === selectedSubzona)
      )
      .map(f => f.sector)
      .filter(Boolean);
    return [...new Set(sectores)].sort();
  }, [facturas, selectedZonaPrincipal, selectedSubzona]);


  // LÓGICA DE FILTRADO DE FACTURAS (UNIFICADA)
  const filteredFacturas = useMemo(() => {
    return facturas.filter(factura => {
      // 0. Filtro de Contenedor ya está aplicado al cargar las facturas (fetchFacturasDisponibles)

      // 1. Filtro Zona Principal
      if (selectedZonaPrincipal && zonasPrincipalesMap[factura.zona] !== selectedZonaPrincipal) {
        return false;
      }
      
      // 2. Filtro Subzona
      if (selectedSubzona && factura.zona !== selectedSubzona) {
        return false;
      }
      
      // 3. Filtro Sector
      if (selectedSector && factura.sector !== selectedSector) {
        return false;
      }

      // 4. Búsqueda Rápida
      if (searchFactura) {
        const search = searchFactura.toLowerCase();
        const matches = (
          factura.cliente?.toLowerCase().includes(search) ||
          factura.direccion?.toLowerCase().includes(search) ||
          factura.codigoTracking?.toLowerCase().includes(search) ||
          factura.sector?.toLowerCase().includes(search)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [facturas, selectedZonaPrincipal, selectedSubzona, selectedSector, searchFactura]);


  // PREVISUALIZAR RUTA
  const previsualizarRuta = () => {
    // Filtrar las facturas seleccionadas que también están visibles en los filtros
    const filteredSelectedIds = filteredFacturas.map(f => f.id)
                                             .filter(id => selectedFacturas.includes(id));
    
    const facturasParaOrdenar = facturas.filter(f => filteredSelectedIds.includes(f.id));

    if (facturasParaOrdenar.length === 0) {
      toast.warning('Debes seleccionar al menos una factura de la lista filtrada.');
      return;
    }
    if (!selectedRepartidor) {
      toast.warning('Debes seleccionar un repartidor');
      return;
    }
    if (selectedCargadores.length === 0) {
      toast.warning('Debes seleccionar al menos un cargador');
      return;
    }
    
    // Recalculamos el orden SOLO con las facturas seleccionadas Y filtradas
    let facturasOrdenadas = facturasParaOrdenar.map((f, index) => ({
      facturaId: f.id,
      ordenOriginal: index + 1
    }));
    
    if (ordenEntrega === 'lejanas-primero') {
      facturasOrdenadas.reverse();
    }
    
    const ordenCalculado = facturasOrdenadas.map((item, index) => {
      if (direccionCarga === 'atras-adelante') {
        return {
          ...item,
          ordenCarga: facturasOrdenadas.length - index,
          ordenEntrega: index + 1
        };
      } else {
        return {
          ...item,
          ordenCarga: index + 1,
          ordenEntrega: facturasOrdenadas.length - index
        };
      }
    });

    setFacturasConOrden(ordenCalculado);
    setShowVistaPrevia(true);
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredFacturas.map(f => f.id);
    setSelectedFacturas(prev => {
      const newSelection = [...prev];
      filteredIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  const deselectAllFiltered = () => {
    const filteredIds = filteredFacturas.map(f => f.id);
    setSelectedFacturas(prev => prev.filter(id => !filteredIds.includes(id)));
  };

  // CREAR RUTA (ACTUALIZADO)
  const handleCreateRutaAvanzada = async () => {
    // Validaciones finales
    if (facturasConOrden.length === 0) {
      toast.error('Error: No hay facturas en la vista previa. Por favor, genera la vista previa primero.');
      return;
    }
    if (!selectedRepartidor || selectedCargadores.length === 0) {
       toast.error('Error: Faltan datos. Verifique repartidor y cargadores.');
      return;
    }

    try {
      const facturasIds = facturasConOrden.map(f => f.facturaId);

      const response = await api.post('/rutas/crear-avanzada', {
        nombre: nombreRuta || `Ruta ${new Date().toLocaleDateString()}`,
        repartidorId: selectedRepartidor,
        cargadoresIds: selectedCargadores,
        facturasIds: facturasIds,
        montoAsignado: parseFloat(montoAsignado) || 0,
        configuracion: {
          direccionCarga,
          ordenEntrega
        }
      });
      
      if (response.data.success) {
        toast.success('✅ Ruta creada exitosamente!');
        setShowModalAvanzado(false);
        setShowVistaPrevia(false);
        resetForm();
        
        // Recargar datos automáticamente
        fetchRutas(); // Recargar la lista de rutas
        
      } else {
        toast.error(response.data.message || 'Error al crear la ruta');
      }

    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Error al crear la ruta');
    }
  };

  const handleCloseRuta = async (e, ruta) => {
    e.stopPropagation();
    setSelectedRuta(ruta);
    setShowCloseModal(true);
  };

  const confirmCloseRuta = async () => {
    try {
      await api.put(`/rutas/${selectedRuta.id}/cerrar`);
      toast.success('Ruta cerrada exitosamente');
      setShowCloseModal(false);
      setSelectedRuta(null);
      fetchRutas(); // Recargar datos
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || 'Error al cerrar la ruta');
    }
  };

  const resetForm = () => {
    setSelectedRepartidor('');
    setSelectedFacturas([]);
    setSelectedCargadores([]);
    setFacturas([]);
    setNombreRuta('');
    setSearchFactura('');
    setDireccionCarga('adelante-atras');
    setOrdenEntrega('cercanas-primero');
    setFacturasConOrden([]);
    setSelectedContenedor('');
    setSelectedZonaPrincipal('');
    setSelectedSubzona('');
    setSelectedSector('');
    setMontoAsignado('');
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'en_proceso':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'completada':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'asignada':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_proceso':
        return 'En Proceso';
      case 'completada':
        return 'Completada';
      case 'asignada':
        return 'Asignada';
      default:
        return estado;
    }
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600 dark:text-green-400';
    if (balance < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const rutasFiltradas = rutas.filter(ruta => {
    if (activeTab === 'activas') {
      return ruta.estado !== 'completada';
    } else {
      return ruta.estado === 'completada';
    }
  });

  // Resetea filtros Nivel 2 y 3 si cambia el Nivel 1
  const handleZonaPrincipalChange = (e) => {
    setSelectedZonaPrincipal(e.target.value);
    setSelectedSubzona('');
    setSelectedSector('');
  };

  // Resetea filtro Nivel 3 si cambia el Nivel 2
  const handleSubzonaChange = (e) => {
    setSelectedSubzona(e.target.value);
    setSelectedSector('');
  };

  // ✅ NUEVA FUNCIÓN: Agrupar facturas por sector para la vista previa
  const agruparFacturasPorSector = () => {
    const facturasDetalladas = facturasConOrden.map(item => {
      const factura = facturas.find(f => f.id === item.facturaId);
      // Combinar los datos de orden con los detalles de la factura
      return { ...factura, ...item }; 
    });

    const facturasAgrupadas = facturasDetalladas.reduce((acc, f) => {
      const sector = f.sector || 'Sin Sector';
      if (!acc[sector]) {
        acc[sector] = [];
      }
      acc[sector].push(f);
      return acc;
    }, {});

    // Ordenar facturas dentro de cada sector por orden de entrega
    for (const sector in facturasAgrupadas) {
      facturasAgrupadas[sector].sort((a, b) => a.ordenEntrega - b.ordenEntrega);
    }
    
    // Devolver como un array ordenado por el primer número de entrega de cada sector
    return Object.entries(facturasAgrupadas).sort(([, facturasA], [, facturasB]) => {
      return facturasA[0].ordenEntrega - facturasB[0].ordenEntrega;
    });
  };


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Rutas</h1>
          <p className="text-gray-600 dark:text-gray-400">Crea y administra rutas de entrega</p>
        </div>
        
        {/* Solo mostrar botón de crear ruta si NO es repartidor */}
        {userData?.rol !== 'repartidor' && (
          <div className="flex gap-3">
            <button
              onClick={openCreateModalAvanzado}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
            >
              <span>✨</span>
              Crear Nueva Ruta
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-6 border-b dark:border-gray-700">
        <button
          onClick={() => setActiveTab('activas')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'activas'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Rutas Activas
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 font-medium transition-all ${
            activeTab === 'historial'
              ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Historial
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando rutas...</p>
        </div>
      ) : rutasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {activeTab === 'activas' 
              ? 'No hay rutas activas' 
              : 'No hay rutas en el historial'}
          </p>
          {activeTab === 'activas' && (
            <p className="text-gray-400 dark:text-gray-500 mt-2">Crea tu primera ruta haciendo click en "Crear Nueva Ruta"</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rutasFiltradas.map((ruta) => (
            <div 
              key={ruta.id} 
              onClick={() => navigate(`/rutas/${ruta.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-xl transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{ruta.nombre}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    👤 {ruta.empleadoNombre || ruta.repartidorNombre}
                  </p>
                  {(ruta.configuracion?.sistemaLIFO || ruta.configuracion?.direccionCarga) && (
                    <span className="inline-block mt-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                      ✨ LIFO
                    </span>
                  )}
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getEstadoColor(ruta.estado)}`}>
                  {getEstadoTexto(ruta.estado)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total facturas:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{ruta.totalFacturas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Entregadas:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{ruta.facturasEntregadas || 0}</span>
                </div>
                
                {ruta.montoAsignado && (
                  <div className="border-t dark:border-gray-700 pt-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Monto asignado:</span>
                      <span className="font-medium text-gray-900 dark:text-white">${ruta.montoAsignado || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total gastos:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">${ruta.totalGastos || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">Balance:</span>
                      <span className={getBalanceColor((ruta.montoAsignado || 0) - (ruta.totalGastos || 0))}>
                        ${(ruta.montoAsignado || 0) - (ruta.totalGastos || 0)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(((ruta.facturasEntregadas || 0) / (ruta.totalFacturas || 1)) * 100, 100)}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Creada: {ruta.createdAt ? new Date(ruta.createdAt.seconds * 1000).toLocaleDateString() : 'Fecha desc.'}
                </div>
                
                {ruta.estado !== 'completada' && (
                  <button
                    onClick={(e) => handleCloseRuta(e, ruta)}
                    className="text-xs bg-gray-600 dark:bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition"
                  >
                    Cerrar Ruta
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ MODAL AVANZADO CON SISTEMA LIFO */}
      {showModalAvanzado && !showVistaPrevia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl my-8">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    ✨ Crear Ruta con Sistema LIFO
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Orden de carga optimizado para entregas eficientes
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowModalAvanzado(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Nombre de ruta */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la Ruta
                </label>
                <input
                  type="text"
                  value={nombreRuta}
                  onChange={(e) => setNombreRuta(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholder="Ej: Ruta SD Este - 15 Enero 2025"
                />
              </div>

              {/* Monto Asignado */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto Asignado para Gastos (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoAsignado}
                  onChange={(e) => setMontoAsignado(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Presupuesto para combustible, peajes y otros gastos de la ruta
                </p>
              </div>

              {/* Configuración LIFO */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Truck size={20} className="text-purple-600" />
                  Configuración de Carga (Sistema LIFO)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dirección de Carga
                    </label>
                    <select
                      value={direccionCarga}
                      onChange={(e) => setDireccionCarga(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    >
                      <option value="adelante-atras">⬆️ Adelante → Atrás (Normal)</option>
                      <option value="atras-adelante">⬇️ Atrás → Adelante (Invertido)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Orden de Entrega
                    </label>
                    <select
                      value={ordenEntrega}
                      onChange={(e) => setOrdenEntrega(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    >
                      <option value="cercanas-primero">📍 Cercanas Primero (Optimizado)</option>
                      <option value="lejanas-primero">🏔️ Lejanas Primero (Inverso)</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Sistema LIFO:</strong> Las primeras en cargar son las últimas en entregar
                    </span>
                  </p>
                </div>
              </div>

              {/* ✅ FILTROS JERÁRQUICOS (CON CONTENEDOR) */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin size={20} className="text-blue-600" />
                  Filtrar Facturas
                </h3>
                {/* ✅ Nivel 0: Contenedor */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Package size={16} />
                      Nivel 0: Contenedor
                    </span>
                  </label>
                  <select
                    value={selectedContenedor}
                    onChange={(e) => {
                      setSelectedContenedor(e.target.value);
                      // Resetear filtros dependientes
                      setSelectedZonaPrincipal('');
                      setSelectedSubzona('');
                      setSelectedSector('');
                      setFacturas([]); // Limpiar facturas, se cargarán con el useEffect
                    }}
                    disabled={loadingModal}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-50"
                  >
                    <option value="">-- Todas las Facturas Confirmadas --</option>
                    {contenedoresDisponibles.map(cont => (
                      <option key={cont.id} value={cont.id}>
                        {cont.numeroContenedor} ({cont.facturasPendientes} facturas)
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Nivel 1: Zona Principal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nivel 1: Zona Principal
                    </label>
                    <select
                      value={selectedZonaPrincipal}
                      onChange={handleZonaPrincipalChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                      disabled={loadingModal}
                    >
                      <option value="">-- Todas las Zonas --</option>
                      {zonasPrincipalesDisponibles.map(zona => (
                        <option key={zona} value={zona}>{zona}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nivel 2: Subzona */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nivel 2: Subzona
                    </label>
                    <select
                      value={selectedSubzona}
                      onChange={handleSubzonaChange}
                      disabled={!subzonasDisponibles.length || loadingModal}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-50"
                    >
                      <option value="">-- Todas las Subzonas --</option>
                      {subzonasDisponibles.map(subzona => (
                        <option key={subzona} value={subzona}>{subzona}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nivel 3: Sector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nivel 3: Sector
                    </label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      disabled={!sectoresDisponibles.length || loadingModal}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg disabled:opacity-50"
                    >
                      <option value="">-- Todos los Sectores --</option>
                      {sectoresDisponibles.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>
                </div>

                 <div className="mt-4">
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                     Búsqueda Rápida (Cliente, Tracking, Dirección...)
                   </label>
                   <input
                    type="text"
                    value={searchFactura}
                    onChange={(e) => setSearchFactura(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    placeholder="🔍 Buscar..."
                    disabled={loadingModal}
                  />
                 </div>
              </div>


              {/* Selección de facturas */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Facturas Disponibles ({selectedFacturas.length} sel. de {filteredFacturas.length} filtradas)
                  </label>
                  {filteredFacturas.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllFiltered}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        ✓ Seleccionar todas
                      </button>
                      <button
                        onClick={deselectAllFiltered}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        ✗ Deseleccionar todas
                      </button>
                    </div>
                  )}
                </div>

                {loadingModal ? ( // ✅ Indicador de carga para facturas
                  <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-3 font-medium">Cargando facturas...</p>
                  </div>
                ) : facturas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No hay facturas disponibles</p>
                    <p className="text-sm mt-1">
                      {selectedContenedor 
                        ? 'El contenedor seleccionado no tiene facturas confirmadas.'
                        : 'No hay facturas confirmadas por secretaría.'}
                    </p>
                  </div>
                ) : filteredFacturas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No se encontraron facturas</p>
                    <p className="text-sm mt-1">Ajusta los filtros para encontrar facturas.</p>
                  </div>
                ) : (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                    {filteredFacturas.map((factura) => (
                      <div
                        key={factura.id}
                        onClick={() => toggleFactura(factura.id)}
                        className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                          selectedFacturas.includes(factura.id) ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedFacturas.includes(factura.id)}
                            onChange={() => {}}
                            className="mr-3 h-4 w-4"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">{factura.cliente}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{factura.direccion}</p>
                            <div className="flex gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-blue-600 dark:text-blue-400">
                                {factura.codigoTracking}
                              </span>
                              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                📍 {factura.zona} → {factura.sector}
                              </span>
                              <span className="text-xs text-green-600">
                                💰 ${factura.monto?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Personal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Repartidor */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Truck size={20} className="text-green-600" />
                    Repartidor *
                  </h3>
                  <select
                    value={selectedRepartidor}
                    onChange={(e) => setSelectedRepartidor(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  >
                    <option value="">-- Seleccionar --</option>
                    {repartidores.map(rep => (
                      <option key={rep.id} value={rep.id}>
                        {rep.nombre}
                      </option>
                    ))}
                  </select>
                  {repartidores.length === 0 && (
                    <p className="text-xs text-red-600 mt-2">⚠️ No hay repartidores disponibles</p>
                  )}
                </div>

                {/* Cargadores */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users size={20} className="text-orange-600" />
                    Cargadores * (mínimo 1)
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cargadores.length === 0 ? (
                      <p className="text-xs text-red-600">⚠️ No hay cargadores disponibles</p>
                    ) : (
                      cargadores.map(cargador => (
                        <label key={cargador.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white dark:hover:bg-gray-700 rounded">
                          <input
                            type="checkbox"
                            checked={selectedCargadores.includes(cargador.id)}
                            onChange={() => toggleCargador(cargador.id)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-gray-900 dark:text-white">{cargador.nombre}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen */}
              {selectedFacturas.length > 0 && (
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📊 Resumen</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Facturas</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedFacturas.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Cargadores</p>
                      <p className="text-xl font-bold text-orange-600">{selectedCargadores.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Repartidor</p>
                      <p className="text-xl font-bold text-blue-600">
                        {selectedRepartidor ? '✓' : '✗'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModalAvanzado(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={previsualizarRuta}
                  disabled={selectedFacturas.length === 0 || !selectedRepartidor || selectedCargadores.length === 0 || loadingModal}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye size={20} />
                  Vista Previa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL VISTA PREVIA (ACTUALIZADO CON SECTORES) */}
      {showVistaPrevia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-5xl my-8">
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🚚 Vista Previa de Carga y Entrega</h2>
                <button 
                  onClick={() => setShowVistaPrevia(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>

              {/* Información de configuración */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">⚙️ Configuración</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Dirección:</strong> {direccionCarga === 'adelante-atras' ? '⬆️ Adelante → Atrás' : '⬇️ Atrás → Adelante'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Orden:</strong> {ordenEntrega === 'cercanas-primero' ? '📍 Cercanas primero' : '🏔️ Lejanas primero'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Sistema:</strong> LIFO (Last In, First Out)
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">👥 Personal</h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p><strong>Repartidor:</strong> {repartidores.find(r => r.id === selectedRepartidor)?.nombre}</p>
                    <p><strong>Cargadores:</strong> {selectedCargadores.map(id => 
                      cargadores.find(c => c.id === id)?.nombre
                    ).join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* ✅ Orden de carga (Agrupado por Sector) */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  📦 Orden de Carga en el Camión (LIFO)
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {direccionCarga === 'adelante-atras' 
                      ? '⬆️ Adelante del camión (se carga primero, se entrega último)'
                      : '⬇️ Atrás del camión (se carga primero, se entrega último)'}
                  </p>
                  
                  <div className="space-y-4">
                    {/* Agrupar por sector */}
                    {agruparFacturasPorSector().map(([sector, facturasDelSector]) => (
                      <div key={sector} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <h4 className="font-bold text-lg text-purple-600 dark:text-purple-400 mb-3">
                          Sector: {sector} ({facturasDelSector.length} {facturasDelSector.length > 1 ? 'facturas' : 'factura'})
                        </h4>
                        <div className="space-y-2">
                          {facturasDelSector.map((factura) => (
                            <div key={factura.facturaId} className="border-l-4 border-blue-600 pl-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex gap-2 mb-1">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                                      CARGA #{factura.ordenCarga}
                                    </span>
                                    <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                                      ENTREGA #{factura.ordenEntrega}
                                    </span>
                                  </div>
                                  <p className="font-medium text-gray-900 dark:text-white">{factura?.cliente}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {factura?.direccion}
                                  </p>
                                </div>
                                <div className="text-right ml-2">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{factura?.codigoTracking}</p>
                                  <p className="text-sm text-green-600">${factura?.monto?.toFixed(2)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                    {direccionCarga === 'adelante-atras' 
                      ? '⬇️ Atrás del camión (se carga último, se entrega primero)'
                      : '⬆️ Adelante del camión (se carga último, se entrega primero)'}
                  </p>
                </div>
              </div>

              {/* Explicación */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-300 dark:border-yellow-700 mb-6">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                  <AlertCircle size={20} />
                  ¿Cómo funciona el sistema LIFO?
                </h3>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                  <p><strong>1. Carga:</strong> Los cargadores cargan en el orden mostrado arriba (Carga #1, #2, #3...)</p>
                  <p><strong>2. Transporte:</strong> Las facturas con menor número de entrega (Entrega #1, #2...) están más accesibles.</p>
                  <p><strong>3. Entrega:</strong> El repartidor entrega en orden ascendente (1, 2, 3...)</p>
                  <p><strong>4. Optimización:</strong> Reduce tiempo de búsqueda y mejora eficiencia.</p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowVistaPrevia(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  ← Volver a Editar
                </button>
                <button
                  onClick={handleCreateRutaAvanzada}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirmar y Crear Ruta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Ruta (Sin cambios) */}
      {showCloseModal && selectedRuta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Cerrar Ruta</h2>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  ¿Estás seguro de cerrar la ruta "{selectedRuta.nombre}"?
                </p>
                
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Repartidor:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{selectedRuta.empleadoNombre}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Facturas entregadas:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {selectedRuta.facturasEntregadas || 0} de {selectedRuta.totalFacturas}
                    </span>
                  </div>
                  {selectedRuta.montoAsignado && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Monto asignado:</span>
                        <span className="font-medium text-gray-900 dark:text-white">${selectedRuta.montoAsignado || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">Total gastado:</span>
                        <span className="font-medium text-red-600 dark:text-red-400">${selectedRuta.totalGastos || 0}</span>
                      </div>
                      <div className="border-t dark:border-gray-600 pt-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-gray-900 dark:text-white">Balance final:</span>
                          <span className={getBalanceColor((selectedRuta.montoAsignado || 0) - (selectedRuta.totalGastos || 0))}>
                            ${(selectedRuta.montoAsignado || 0) - (selectedRuta.totalGastos || 0)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {(selectedRuta.facturasEntregadas < selectedRuta.totalFacturas) && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-4">
                    ⚠️ Hay {selectedRuta.totalFacturas - (selectedRuta.facturasEntregadas || 0)} facturas sin entregar
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCloseModal(false);
                    setSelectedRuta(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmCloseRuta}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Confirmar Cierre
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rutas;