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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Facturas No Entregadas</h1>
        <p className="text-slate-600 dark:text-slate-400">Gestiona y reasigna facturas que no pudieron ser entregadas</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-medium text-slate-800 dark:text-white mb-4">Filtros</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Ruta
            </label>
            <select
              value={filtroRuta}
              onChange={(e) => setFiltroRuta(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cliente
            </label>
            <input
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Buscar por nombre de cliente..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Fecha de Intento
            </label>
            <input
              type="date"
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {(filtroRuta || filtroCliente || filtroFecha) && (
          <div className="mt-4">
            <button
              onClick={limpiarFiltros}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              ✕ Limpiar filtros
            </button>
          </div>
        )}
      </div>

      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-rose-800 dark:text-rose-200">
              {facturasFiltradas.length} factura{facturasFiltradas.length !== 1 ? 's' : ''} no entregada{facturasFiltradas.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-rose-600 dark:text-rose-400">
              {filtroRuta || filtroCliente || filtroFecha ? 'Con filtros aplicados' : 'Total en el sistema'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando facturas...</p>
        </div>
      ) : facturasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
          <span className="text-6xl mb-4 block">✅</span>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            {facturas.length === 0 
              ? '¡Excelente! No hay facturas sin entregar' 
              : 'No se encontraron facturas con los filtros aplicados'}
          </p>
          {(filtroRuta || filtroCliente || filtroFecha) && (
            <button
              onClick={limpiarFiltros}
              className="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Código Tracking
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Dirección
                  </th>
                  {/* ✅ NUEVA COLUMNA: Sector */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Sector
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Ruta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Fecha Intento
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                      {factura.codigoTracking || factura.numeroFactura || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {factura.cliente}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {factura.direccion}
                    </td>
                    {/* ✅ MOSTRAR SECTOR */}
                    <td className="px-4 py-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                      {factura.sector || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {factura.rutaNombre || 'Sin asignar'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-full text-xs">
                        {factura.motivoNoEntrega || 'Sin motivo especificado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                      {factura.fechaIntento 
                        ? new Date(factura.fechaIntento).toLocaleDateString() 
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleReasignar(factura)}
                        className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
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