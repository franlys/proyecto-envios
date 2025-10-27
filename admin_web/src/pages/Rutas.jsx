// admin_web/src/pages/Rutas.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Rutas = () => {
  const navigate = useNavigate();
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedRuta, setSelectedRuta] = useState(null);
  const [activeTab, setActiveTab] = useState('activas');
  
  const [embarques, setEmbarques] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [selectedEmbarque, setSelectedEmbarque] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [selectedFacturas, setSelectedFacturas] = useState([]);
  const [selectedRepartidor, setSelectedRepartidor] = useState('');
  const [nombreRuta, setNombreRuta] = useState('');
  const [montoAsignado, setMontoAsignado] = useState('');
  const [searchFactura, setSearchFactura] = useState('');

  useEffect(() => {
    fetchRutas();
  }, []);

  // ✅ CORREGIDO: Aplicando la Regla de Oro
  const fetchRutas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rutas');
      
      // ✅ CORRECCIÓN: Validar success y acceder a response.data.data
      if (response.data.success) {
        setRutas(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar rutas');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORREGIDO: Aplicando la Regla de Oro
  const openCreateModal = async () => {
    try {
      const embarquesRes = await api.get('/embarques');
      
      // ✅ CORRECCIÓN: Validar success para embarques
      if (embarquesRes.data.success) {
        setEmbarques(embarquesRes.data.data || []);
      } else {
        throw new Error(embarquesRes.data.error || 'Error al cargar embarques');
      }
      
      const repartidoresRes = await api.get('/empleados/repartidores');
      
      // ✅ CORRECCIÓN: Validar success para repartidores
      if (repartidoresRes.data.success) {
        setRepartidores(repartidoresRes.data.data || []);
      } else {
        throw new Error(repartidoresRes.data.error || 'Error al cargar repartidores');
      }
      
      setShowModal(true);
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al cargar datos para crear ruta');
    }
  };

  // ✅ CORREGIDO: Aplicando la Regla de Oro
  const handleEmbarqueChange = async (embarqueId) => {
    setSelectedEmbarque(embarqueId);
    setSelectedFacturas([]);
    setSearchFactura('');
    
    if (!embarqueId) {
      setFacturas([]);
      return;
    }

    try {
      const response = await api.get(`/embarques/${embarqueId}`);
      
      // ✅ CORRECCIÓN: Validar success antes de usar facturas
      if (response.data.success) {
        const facturasDisponibles = (response.data.data.facturas || []).filter(
          f => f.estado === 'pendiente' || !f.estado
        );
        setFacturas(facturasDisponibles);
      } else {
        throw new Error(response.data.error || 'Error al cargar facturas del embarque');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al cargar facturas del embarque');
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

  const filteredFacturas = facturas.filter(factura => {
    if (!searchFactura) return true;
    const search = searchFactura.toLowerCase();
    return (
      factura.cliente?.toLowerCase().includes(search) ||
      factura.direccion?.toLowerCase().includes(search) ||
      factura.numeroFactura?.toLowerCase().includes(search)
    );
  });

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

  const handleCreateRuta = async () => {
    if (!selectedEmbarque) {
      alert('Selecciona un embarque');
      return;
    }
    if (selectedFacturas.length === 0) {
      alert('Selecciona al menos una factura');
      return;
    }
    if (!selectedRepartidor) {
      alert('Selecciona un repartidor');
      return;
    }
    if (!montoAsignado || parseFloat(montoAsignado) <= 0) {
      alert('Ingresa un monto asignado válido');
      return;
    }

    try {
      await api.post('/rutas', {
        embarqueId: selectedEmbarque,
        empleadoId: selectedRepartidor,
        facturasIds: selectedFacturas,
        nombre: nombreRuta || `Ruta ${new Date().toLocaleDateString()}`,
        montoAsignado: parseFloat(montoAsignado)
      });

      alert('Ruta creada exitosamente');
      setShowModal(false);
      resetForm();
      fetchRutas();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al crear ruta');
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
      alert('Ruta cerrada exitosamente');
      setShowCloseModal(false);
      setSelectedRuta(null);
      fetchRutas();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al cerrar la ruta');
    }
  };

  const resetForm = () => {
    setSelectedEmbarque('');
    setSelectedRepartidor('');
    setSelectedFacturas([]);
    setFacturas([]);
    setNombreRuta('');
    setMontoAsignado('');
    setSearchFactura('');
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'en_proceso':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'completada':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestión de Rutas</h1>
          <p className="text-gray-600 dark:text-gray-400">Crea y administra rutas de entrega</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <span>+</span>
          Nueva Ruta
        </button>
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
            <p className="text-gray-400 dark:text-gray-500 mt-2">Crea tu primera ruta haciendo click en "Nueva Ruta"</p>
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">👤 {ruta.empleadoNombre}</p>
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

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((ruta.facturasEntregadas || 0) / ruta.totalFacturas) * 100}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Creada: {new Date(ruta.createdAt).toLocaleDateString()}
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
      {/* Modal Crear Ruta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Crear Nueva Ruta</h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la Ruta (opcional)
                </label>
                <input
                  type="text"
                  value={nombreRuta}
                  onChange={(e) => setNombreRuta(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ruta del 07/10/2025"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto Asignado *
                </label>
                <input
                  type="number"
                  value={montoAsignado}
                  onChange={(e) => setMontoAsignado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000.00"
                  step="0.01"
                  min="0"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Dinero asignado al repartidor para gastos de la ruta
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  1. Seleccionar Embarque *
                </label>
                <select
                  value={selectedEmbarque}
                  onChange={(e) => handleEmbarqueChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Selecciona un embarque --</option>
                  {embarques.map((embarque) => (
                    <option key={embarque.id} value={embarque.id}>
                      {embarque.nombre} ({embarque.totalFacturas} facturas)
                    </option>
                  ))}
                </select>
              </div>

              {selectedEmbarque && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      2. Seleccionar Facturas * ({selectedFacturas.length} seleccionadas)
                    </label>
                    {filteredFacturas.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllFiltered}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                          ✓ Seleccionar todas
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllFiltered}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                        >
                          ✗ Deseleccionar todas
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <input
                      type="text"
                      value={searchFactura}
                      onChange={(e) => setSearchFactura(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="🔍 Buscar por cliente, dirección o número de factura..."
                    />
                    {searchFactura && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Mostrando {filteredFacturas.length} de {facturas.length} facturas
                      </p>
                    )}
                  </div>

                  {facturas.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 py-4">No hay facturas disponibles en este embarque</p>
                  ) : filteredFacturas.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 py-4">No se encontraron facturas con "{searchFactura}"</p>
                  ) : (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto">
                      {filteredFacturas.map((factura) => (
                        <div
                          key={factura.id}
                          className="p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => toggleFactura(factura.id)}
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
                              <div className="flex gap-3 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">📄 {factura.numeroFactura}</p>
                                {factura.monto && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">💰 ${factura.monto}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  3. Asignar Repartidor *
                </label>
                <select
                  value={selectedRepartidor}
                  onChange={(e) => setSelectedRepartidor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Selecciona un repartidor --</option>
                  {repartidores.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.nombre} - {rep.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRuta}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Crear Ruta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cerrar Ruta */}
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
                </div>
                
                {selectedRuta.facturasEntregadas < selectedRuta.totalFacturas && (
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-4">
                    ⚠️ Hay {selectedRuta.totalFacturas - selectedRuta.facturasEntregadas} facturas sin entregar
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