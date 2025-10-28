// admin_web/src/pages/PanelSecretarias.jsx
// ✅ INTEGRACIÓN COMPLETA DEL CAMPO SECTOR

import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, doc, updateDoc, Timestamp, onSnapshot, orderBy } from 'firebase/firestore';
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
  const [zona, setZona] = useState('');
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
      
      if (response.data.success) {
        const embarquesActivos = (response.data.data || []).filter(e => e.estado === 'activo');
        setEmbarques(embarquesActivos);
      } else {
        throw new Error(response.data.error || 'Error al cargar embarques');
      }
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
      
      let q = query(
        facturasRef, 
        where('embarqueId', '==', selectedEmbarque),
        orderBy('numeroFactura', 'asc')
      );
      
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
    setZona(factura.zona || '');
    setObservaciones(factura.observaciones || '');
    setEstadoPago(factura.estadoPago || 'pago_recibir');
    setShowConfirmModal(true);
  };

  const handleConfirmarFactura = async () => {
    if (!selectedFactura) return;

    if (!telefono || !direccion || !zona) {
      alert('Teléfono, dirección y ZONA son obligatorios');
      return;
    }

    try {
      const facturaRef = doc(db, 'facturas', selectedFactura.id);
      
      await updateDoc(facturaRef, {
        estado: 'confirmada',
        telefono: telefono,
        direccion: direccion,
        sector: sector, // ✅ Incluir sector en actualización
        zona: zona,
        observaciones: observaciones,
        estadoPago: estadoPago,
        fechaConfirmacion: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      alert('✅ Factura confirmada exitosamente');
      setShowConfirmModal(false);
      resetForm();
    } catch (error) {
      console.error('Error al confirmar factura:', error);
      alert('❌ Error al confirmar factura');
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

      alert('⏳ Factura marcada como pendiente de contacto');
      setShowConfirmModal(false);
      resetForm();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Error al marcar como pendiente');
    }
  };

  const resetForm = () => {
    setSelectedFactura(null);
    setTelefono('');
    setDireccion('');
    setSector('');
    setZona('');
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
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
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
                            className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Llamar
                          </button>
                        </p>
                      )}

                      {/* ✅ MEJORA 1: Mostrar dirección con sector */}
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

                    <div className="ml-4 flex flex-col gap-2">
                      {(activeTab === 'sin_confirmar' || activeTab === 'pendientes') && (
                        <button
                          onClick={() => openConfirmModal(factura)}
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
                          onClick={() => openConfirmModal(factura)}
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

      {/* ✅ MEJORA 2: Modal con campo sector completamente funcional */}
      {showConfirmModal && selectedFactura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                {activeTab === 'no_entregadas' ? '🔄 Reasignar Factura' : '✅ Confirmar Factura'}
              </h2>

              <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Factura</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">#{selectedFactura.numeroFactura}</p>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Cliente</p>
                <p className="font-medium text-gray-900 dark:text-white">👤 {selectedFactura.cliente}</p>
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

                {/* ✅ Campo Sector funcional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sector
                  </label>
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Los Jardines, Bella Vista, etc."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Especifica el sector o barrio para facilitar la entrega
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zona de Entrega *
                  </label>
                  <select
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                      !zona ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">-- Seleccionar Zona --</option>
                    <option value="capital">🏙️ Capital (Santo Domingo)</option>
                    <option value="cibao">⛰️ Cibao (Santiago)</option>
                    <option value="sur">🌊 Sur</option>
                    <option value="local_bani">🏘️ Local (Baní)</option>
                  </select>
                  {!zona && (
                    <p className="text-red-500 text-sm mt-1">⚠️ La zona es obligatoria</p>
                  )}
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
                    ⏳ Marcar Pendiente
                  </button>
                )}
                
                <button
                  onClick={handleConfirmarFactura}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  ✅ Confirmar
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