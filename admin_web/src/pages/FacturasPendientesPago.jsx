// admin_web/src/pages/FacturasPendientesPago.jsx
/**
 * VISTA DE FACTURAS PENDIENTES DE PAGO
 * Muestra todas las facturas con saldo pendiente
 * Permite registrar pagos y ver historial
 */

import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  DollarSign,
  AlertCircle,
  Package,
  Eye,
  CreditCard,
  FileText,
  Filter,
  Download,
  Clock
} from 'lucide-react';

const FacturasPendientesPago = () => {
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [contenedorFiltro, setContenedorFiltro] = useState('todos');
  const [contenedores, setContenedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState({});
  
  // Modal de pago
  const [modalPago, setModalPago] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [metodoPago, setMetodoPago] = useState('');
  const [referencia, setReferencia] = useState('');
  const [notasPago, setNotasPago] = useState('');

  useEffect(() => {
    cargarFacturasPendientes();
    cargarContenedores();
  }, []);

  const cargarFacturasPendientes = async () => {
    try {
      setLoading(true);
      
      const params = contenedorFiltro !== 'todos' 
        ? `?contenedorId=${contenedorFiltro}` 
        : '';
      
      const response = await api.get(`/facturacion/pendientes${params}`);
      
      if (response.data.success) {
        setFacturasPendientes(response.data.data);
        setResumen(response.data.resumen);
      }
    } catch (error) {
      console.error('Error cargando facturas pendientes:', error);
      alert('Error al cargar facturas pendientes');
    } finally {
      setLoading(false);
    }
  };

  const cargarContenedores = async () => {
    try {
      const response = await api.get('/almacen-usa/contenedores');
      
      if (response.data.success) {
        setContenedores(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando contenedores:', error);
    }
  };

  const abrirModalPago = (factura) => {
    setFacturaSeleccionada(factura);
    setMontoPago(factura.facturacion?.saldoPendiente || 0);
    setMetodoPago('');
    setReferencia('');
    setNotasPago('');
    setModalPago(true);
  };

  const handleRegistrarPago = async () => {
    if (!facturaSeleccionada) return;

    if (!montoPago || parseFloat(montoPago) <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    if (!metodoPago) {
      alert('Selecciona un método de pago');
      return;
    }

    try {
      const response = await api.post(
        `/facturacion/recolecciones/${facturaSeleccionada.id}/pago`,
        {
          montoPago: parseFloat(montoPago),
          metodoPago,
          referencia,
          notas: notasPago
        }
      );

      if (response.data.success) {
        alert('✅ Pago registrado exitosamente');
        setModalPago(false);
        await cargarFacturasPendientes();
      }
    } catch (error) {
      console.error('Error registrando pago:', error);
      alert('❌ Error al registrar pago: ' + (error.response?.data?.error || error.message));
    }
  };

  const formatCurrency = (amount) => {
    return `RD$ ${amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getEstadoBadge = (estadoPago) => {
    const badges = {
      pendiente_pago: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      pago_parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      cobro_contra_entrega: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    
    const textos = {
      pendiente_pago: 'Pendiente',
      pago_parcial: 'Pago Parcial',
      cobro_contra_entrega: 'Contra Entrega'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[estadoPago] || badges.pendiente_pago}`}>
        {textos[estadoPago] || estadoPago}
      </span>
    );
  };

  const facturasAgrupadas = facturasPendientes.reduce((acc, factura) => {
    const contenedorId = factura.contenedorId || 'sin_contenedor';
    if (!acc[contenedorId]) {
      acc[contenedorId] = [];
    }
    acc[contenedorId].push(factura);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <DollarSign className="text-red-600" size={36} />
            Facturas Pendientes de Pago
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión de pagos y saldos pendientes
          </p>
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-600" size={32} />
            <div>
              <p className="text-sm text-red-700 dark:text-red-300">Total Pendiente</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {formatCurrency(resumen.totalPendiente || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="text-green-600" size={32} />
            <div>
              <p className="text-sm text-green-700 dark:text-green-300">Total Pagado</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(resumen.totalPagado || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-600" size={32} />
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Facturas Pendientes</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {resumen.totalFacturas || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <Filter className="text-gray-600" size={20} />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filtrar por Contenedor
            </label>
            <select
              value={contenedorFiltro}
              onChange={(e) => {
                setContenedorFiltro(e.target.value);
                cargarFacturasPendientes();
              }}
              className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
            >
              <option value="todos">Todos los contenedores</option>
              {contenedores.map(contenedor => (
                <option key={contenedor.id} value={contenedor.id}>
                  {contenedor.numeroContenedor}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de facturas */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : facturasPendientes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <DollarSign className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No hay facturas pendientes
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            ¡Excelente! Todas las facturas están pagadas
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(facturasAgrupadas).map(([contenedorId, facturas]) => {
            const contenedor = contenedores.find(c => c.id === contenedorId);
            const totalContenedor = facturas.reduce((sum, f) => sum + (f.facturacion?.saldoPendiente || 0), 0);

            return (
              <div key={contenedorId} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                {/* Header del contenedor */}
                <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="text-blue-600" size={24} />
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {contenedor?.numeroContenedor || 'Sin Contenedor'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {facturas.length} factura{facturas.length !== 1 ? 's' : ''} pendiente{facturas.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Pendiente</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(totalContenedor)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Facturas del contenedor */}
                <div className="p-6 space-y-3">
                  {facturas.map(factura => (
                    <div
                      key={factura.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {factura.codigoRecoleccion}
                            </h4>
                            {getEstadoBadge(factura.facturacion?.estadoPago)}
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Cliente: <span className="font-medium text-gray-900 dark:text-white">
                              {factura.nombreCliente}
                            </span>
                          </p>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Total:</p>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(factura.facturacion?.total || 0)}
                              </p>
                            </div>

                            {factura.facturacion?.estadoPago === 'pago_parcial' && (
                              <>
                                <div>
                                  <p className="text-gray-600 dark:text-gray-400">Pagado:</p>
                                  <p className="font-semibold text-green-600 dark:text-green-400">
                                    {formatCurrency(factura.facturacion?.montoPagado || 0)}
                                  </p>
                                </div>
                              </>
                            )}

                            <div>
                              <p className="text-gray-600 dark:text-gray-400">Pendiente:</p>
                              <p className="font-bold text-red-600 dark:text-red-400">
                                {formatCurrency(factura.facturacion?.saldoPendiente || 0)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() => abrirModalPago(factura)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                          >
                            <CreditCard size={16} />
                            Registrar Pago
                          </button>

                          <button
                            onClick={() => window.location.href = `/recolecciones/${factura.id}`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                          >
                            <Eye size={16} />
                            Ver Detalles
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Pago */}
      {modalPago && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="text-green-600" size={32} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Registrar Pago
              </h3>
            </div>

            <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Factura</p>
              <p className="font-bold text-gray-900 dark:text-white">
                {facturaSeleccionada.codigoRecoleccion}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Saldo Pendiente</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(facturaSeleccionada.facturacion?.saldoPendiente || 0)}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto a Pagar *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">RD$</span>
                  <input
                    type="number"
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    max={facturaSeleccionada.facturacion?.saldoPendiente}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Método de Pago *
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                >
                  <option value="">Seleccionar...</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia Bancaria</option>
                  <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                  <option value="cheque">Cheque</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Referencia / No. Transacción
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholder="Ej: 123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas
                </label>
                <textarea
                  value={notasPago}
                  onChange={(e) => setNotasPago(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  rows="2"
                  placeholder="Observaciones..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModalPago(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturasPendientesPago;