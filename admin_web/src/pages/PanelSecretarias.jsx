// admin_web/src/pages/PanelSecretarias.jsx
import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import api from '../services/api';

const PanelSecretarias = () => {
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
  const [zona, setZona] = useState('capital');
  const [observaciones, setObservaciones] = useState('');
  const [estadoPago, setEstadoPago] = useState('pago_recibir');

  useEffect(() => {
    fetchEmbarques();
  }, []);

  useEffect(() => {
    if (selectedEmbarque) {
      fetchFacturas();
    } else {
      setTodasLasFacturas([]);
    }
  }, [selectedEmbarque]);

  const fetchEmbarques = async () => {
    try {
      const response = await api.get('/embarques');
      const embarquesActivos = (response.data.data || response.data || []).filter(e => e.estado === 'activo');
      setEmbarques(embarquesActivos);
    } catch (error) {
      console.error('Error al cargar embarques:', error);
      alert('Error al cargar embarques');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const facturasRef = collection(db, 'facturas');
      const q = query(facturasRef, where('embarqueId', '==', selectedEmbarque));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const facturasData = snapshot.docs
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

      return () => unsubscribe();
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      setLoading(false);
    }
  };

  const openConfirmModal = (factura) => {
    setSelectedFactura(factura);
    setTelefono(factura.telefono || '');
    setDireccion(factura.direccion || '');
    setSector(factura.sector || '');
    setZona(factura.zona || 'capital');
    setObservaciones(factura.observaciones || '');
    setEstadoPago(factura.estadoPago || 'pago_recibir');
    setShowConfirmModal(true);
  };

  const handleConfirmarFactura = async () => {
    if (!selectedFactura) return;

    if (!telefono || !direccion) {
      alert('Teléfono y dirección son obligatorios');
      return;
    }

    try {
      const facturaRef = doc(db, 'facturas', selectedFactura.id);
      
      await updateDoc(facturaRef, {
        estado: 'confirmada',
        telefono: telefono,
        direccion: direccion,
        sector: sector,
        zona: zona,
        observaciones: observaciones,
        estadoPago: estadoPago,
        fechaConfirmacion: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      alert('Factura confirmada exitosamente');
      setShowConfirmModal(false);
      resetForm();
    } catch (error) {
      console.error('Error al confirmar factura:', error);
      alert('Error al confirmar factura');
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

      alert('Factura marcada como pendiente de contacto');
      setShowConfirmModal(false);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al marcar como pendiente');
    }
  };

  const resetForm = () => {
    setSelectedFactura(null);
    setTelefono('');
    setDireccion('');
    setSector('');
    setZona('capital');
    setObservaciones('');
    setEstadoPago('pago_recibir');
  };

  const handleCall = (telefono) => {
    if (telefono) {
      window.location.href = `tel:${telefono}`;
    }
  };

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

  const contadores = {
    sin_confirmar: todasLasFacturas.filter(f => f.estado === 'sin_confirmar' && (selectedZona === 'todas' || f.zona === selectedZona)).length,
    pendientes: todasLasFacturas.filter(f => f.estado === 'pendiente_contacto' && (selectedZona === 'todas' || f.zona === selectedZona)).length,
    confirmadas: todasLasFacturas.filter(f => f.estado === 'confirmada' && (selectedZona === 'todas' || f.zona === selectedZona)).length,
    no_entregadas: todasLasFacturas.filter(f => f.estado === 'no_entregado' && (selectedZona === 'todas' || f.zona === selectedZona)).length
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Panel de Secretarias</h1>
        <p className="text-gray-600 dark:text-gray-400">Confirma y gestiona facturas antes de crear rutas</p>
      </div>

      {/* Selectores de Embarque y Zona */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seleccionar Contenedor/Embarque *
          </label>
          <select
            value={selectedEmbarque}
            onChange={(e) => setSelectedEmbarque(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Selecciona un contenedor --</option>
            {embarques.map(embarque => (
              <option key={embarque.id} value={embarque.id}>
                {embarque.nombre} ({embarque.totalFacturas} facturas)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filtrar por Zona de Entrega
          </label>
          <select
            value={selectedZona}
            onChange={(e) => setSelectedZona(e.target.value)}
            disabled={!selectedEmbarque}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800"
          >
            <option value="todas">📍 Todas las zonas</option>
            <option value="capital">🏙️ Capital (Santo Domingo)</option>
            <option value="cibao">⛰️ Cibao (Santiago)</option>
            <option value="sur">🌊 Sur</option>
            <option value="local_bani">🏘️ Local (Baní)</option>
          </select>
        </div>
      </div>

      {!selectedEmbarque ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
          <p className="text-blue-800 dark:text-blue-200 text-lg">
            👆 Selecciona un contenedor para comenzar a trabajar
          </p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab('sin_confirmar')}
              className={`px-4 py-2 font-medium transition-all whitespace-nowrap ${
                activeTab === 'sin_confirmar'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              📋 Sin Confirmar ({contadores.sin_confirmar})
            </button>
            <button
              onClick={() => setActiveTab('pendientes')}
              className={`px-4 py-2 font-medium transition-all whitespace-nowrap ${
                activeTab === 'pendientes'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              ⏳ Pendientes ({contadores.pendientes})
            </button>
            <button
              onClick={() => setActiveTab('confirmadas')}
              className={`px-4 py-2 font-medium transition-all whitespace-nowrap ${
                activeTab === 'confirmadas'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              ✅ Confirmadas ({contadores.confirmadas})
            </button>
            <button
              onClick={() => setActiveTab('no_entregadas')}
              className={`px-4 py-2 font-medium transition-all whitespace-nowrap ${
                activeTab === 'no_entregadas'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              ⚠️ No Entregadas ({contadores.no_entregadas})
            </button>
          </div>

          {/* Lista de Facturas */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando facturas...</p>
            </div>
          ) : facturasFiltradas.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No hay facturas en esta sección</p>
              {selectedZona !== 'todas' && (
                <p className="text-gray-400 dark:text-gray-500 mt-2">Prueba seleccionar otra zona</p>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              {facturasFiltradas.map((factura) => (
                <div key={factura.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{factura.numeroFactura}</h3>
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                          ${factura.monto?.toLocaleString()}
                        </span>
                        {factura.zona && (
                          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                            {factura.zona === 'capital' ? '🏙️ Capital' :
                             factura.zona === 'cibao' ? '⛰️ Cibao' :
                             factura.zona === 'sur' ? '🌊 Sur' :
                             factura.zona === 'local_bani' ? '🏘️ Local' : factura.zona}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Cliente</p>
                          <p className="font-medium text-gray-900 dark:text-white">{factura.cliente}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Teléfono</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white">{factura.telefono || 'No disponible'}</p>
                            {factura.telefono && (
                              <button
                                onClick={() => handleCall(factura.telefono)}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                              >
                                📞
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Dirección</p>
                          <p className="font-medium text-gray-900 dark:text-white">{factura.direccion}</p>
                        </div>
                        {factura.sector && (
                          <div className="col-span-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Sector</p>
                            <p className="font-medium text-gray-900 dark:text-white">{factura.sector}</p>
                          </div>
                        )}
                      </div>

                      {factura.observaciones && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-3 mb-4">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Observaciones:</strong> {factura.observaciones}
                          </p>
                        </div>
                      )}

                      {factura.motivoNoEntrega && (
                        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-3 mb-4">
                          <p className="text-sm text-red-800 dark:text-red-200">
                            <strong>Motivo no entrega:</strong> {factura.motivoNoEntrega}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      {(activeTab === 'sin_confirmar' || activeTab === 'pendientes') && (
                        <button
                          onClick={() => openConfirmModal(factura)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                          {activeTab === 'pendientes' ? 'Re-intentar' : 'Confirmar'}
                        </button>
                      )}
                      
                      {activeTab === 'confirmadas' && (
                        <span className="px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-sm font-medium text-center">
                          ✓ Confirmada
                        </span>
                      )}

                      {activeTab === 'no_entregadas' && (
                        <button
                          onClick={() => openConfirmModal(factura)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
                        >
                          Reasignar
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

      {/* Modal de Confirmación */}
      {showConfirmModal && selectedFactura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                {activeTab === 'no_entregadas' ? 'Reasignar Factura' : 'Confirmar Factura'}
              </h2>

              <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Factura</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedFactura.numeroFactura}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Cliente</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedFactura.cliente}</p>
              </div>

              <div className="space-y-4 mb-6">
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
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        📞 Llamar
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Calle Principal 123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sector
                  </label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Santo Domingo Este"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zona de Entrega *
                  </label>
                  <select
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="capital">🏙️ Capital (Santo Domingo)</option>
                    <option value="cibao">⛰️ Cibao (Santiago)</option>
                    <option value="sur">🌊 Sur</option>
                    <option value="local_bani">🏘️ Local (Baní)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estado del Pago
                  </label>
                  <select
                    value={estadoPago}
                    onChange={(e) => setEstadoPago(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pago_recibir">💵 Pago al recibir</option>
                    <option value="pagado">✅ Ya pagado desde USA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Notas adicionales..."
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="confirmCheck"
                      className="mt-1"
                    />
                    <label htmlFor="confirmCheck" className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Confirmo que:</strong>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>He contactado al cliente</li>
                        <li>Los datos están verificados</li>
                        <li>El cliente está disponible para recibir</li>
                      </ul>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancelar
                </button>
                
                {activeTab !== 'no_entregadas' && (
                  <button
                    onClick={handleMarcarPendiente}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                  >
                    Marcar Pendiente
                  </button>
                )}
                
                <button
                  onClick={handleConfirmarFactura}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  ✓ Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelSecretarias;