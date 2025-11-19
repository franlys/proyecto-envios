// admin_web/src/pages/FacturasNoEntregadas.jsx
// ✅ INTEGRACIÓN DEL CAMPO SECTOR

import { useState, useEffect } from 'react';
import api from '../services/api';
import ModalReasignarFactura from '../components/modals/ModalReasignarFactura';

const FacturasNoEntregadas = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  const [filtroRuta, setFiltroRuta] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const [rutas, setRutas] = useState([]);

  useEffect(() => {
    fetchFacturasNoEntregadas();
    fetchRutas();
  }, []);

  const fetchFacturasNoEntregadas = async () => {
    try {
      setLoading(true);
      // ✅ CORRECCIÓN FINAL: Se cambia la ruta a '/facturacion/no-entregadas'
      const response = await api.get('/facturacion/no-entregadas'); 
      
      if (response.data.success) {
        setFacturas(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar facturas no entregadas');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar facturas no entregadas: ' + error.message);
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRutas = async () => {
    try {
      const response = await api.get('/rutas');
      
      if (response.data.success) {
        setRutas(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Error al cargar rutas');
      }
    } catch (error) {
      console.error('Error al cargar rutas:', error);
      setRutas([]);
    }
  };

  const handleReasignar = (factura) => {
    setSelectedFactura(factura);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedFactura(null);
  };

  const handleReasignSuccess = () => {
    setShowModal(false);
    setSelectedFactura(null);
    fetchFacturasNoEntregadas();
  };

  const facturasFiltradas = facturas.filter((factura) => {
    if (filtroRuta && factura.rutaId !== filtroRuta) {
      return false;
    }

    if (filtroCliente && !factura.cliente?.toLowerCase().includes(filtroCliente.toLowerCase())) {
      return false;
    }

    if (filtroFecha && !factura.fechaIntento?.startsWith(filtroFecha)) {
      return false;
    }

    return true;
  });

  const limpiarFiltros = () => {
    setFiltroRuta('');
    setFiltroCliente('');
    setFiltroFecha('');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Facturas No Entregadas</h1>
        <p className="text-gray-600 dark:text-gray-400">Gestiona y reasigna facturas que no pudieron ser entregadas</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Filtros</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ruta
            </label>
            <select
              value={filtroRuta}
              onChange={(e) => setFiltroRuta(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las rutas</option>
              {rutas.map((ruta) => (
                <option key={ruta.id} value={ruta.id}>
                  {ruta.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cliente
            </label>
            <input
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por nombre de cliente..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fecha de Intento
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {(filtroRuta || filtroCliente || filtroFecha) && (
          <div className="mt-4">
            <button
              onClick={limpiarFiltros}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              ✕ Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              {facturasFiltradas.length} factura{facturasFiltradas.length !== 1 ? 's' : ''} no entregada{facturasFiltradas.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              {filtroRuta || filtroCliente || filtroFecha ? 'Con filtros aplicados' : 'Total en el sistema'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando facturas...</p>
        </div>
      ) : facturasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
          <span className="text-6xl mb-4 block">✅</span>
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {facturas.length === 0 
              ? '¡Excelente! No hay facturas sin entregar' 
              : 'No se encontraron facturas con los filtros aplicados'}
          </p>
          {(filtroRuta || filtroCliente || filtroFecha) && (
            <button
              onClick={limpiarFiltros}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Número Factura
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Dirección
                  </th>
                  {/* ✅ NUEVA COLUMNA: Sector */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Sector
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Ruta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Fecha Intento
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {factura.numeroFactura}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {factura.cliente}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {factura.direccion}
                    </td>
                    {/* ✅ MOSTRAR SECTOR */}
                    <td className="px-4 py-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {factura.sector || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {factura.rutaNombre || 'Sin asignar'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs">
                        {factura.motivoNoEntrega || 'Sin motivo especificado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {factura.fechaIntento 
                        ? new Date(factura.fechaIntento).toLocaleDateString() 
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleReasignar(factura)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                      >
                        Reasignar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && selectedFactura && (
        <ModalReasignarFactura
          factura={selectedFactura}
          onClose={handleModalClose}
          onSuccess={handleReasignSuccess}
        />
      )}
    </div>
  );
};

export default FacturasNoEntregadas;