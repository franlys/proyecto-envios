// admin_web/src/pages/FacturasPendientesPago.jsx
/**
 * VISTA DE FACTURAS PENDIENTES DE PAGO
 * Muestra todas las facturas con saldo pendiente
 * Permite registrar pagos y ver historial
 * * CORRECCIONES:
 * ✅ Corregido el crash de pantalla en blanco con verificación de nulidad.
 * ✅ Corregida la advertencia de 'key' en la tabla.
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
  Clock,
  Edit // Importar icono de edición
} from 'lucide-react';
import ModalFacturacion from '../components/modals/ModalFacturacion'; // Importar el nuevo modal

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

  // Modal de facturación completa
  const [modalFacturacion, setModalFacturacion] = useState(false);
  const [facturaParaEditar, setFacturaParaEditar] = useState(null);

  useEffect(() => {
    cargarFacturasPendientes();
    cargarContenedores();
  }, [contenedorFiltro]);

  const cargarContenedores = async () => {
    try {
      // Endpoint para contenedores con facturas pendientes (implementación pendiente en backend)
      const response = await api.get('/contenedores/disponibles');
      setContenedores(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar contenedores:', error);
    }
  };

  const cargarFacturasPendientes = async () => {
    setLoading(true);
    try {
      const url = contenedorFiltro === 'todos'
        ? '/facturacion/pendientes'
        : `/facturacion/pendientes?contenedorId=${contenedorFiltro}`;

      const response = await api.get(url);
      setFacturasPendientes(response.data.data || []);

      // Calcular resumen
      const totalFacturado = (response.data.data || []).reduce((sum, f) => sum + (f.facturacion?.totalFactura || 0), 0);
      const totalPagado = (response.data.data || []).reduce((sum, f) => sum + (f.facturacion?.montoPagado || 0), 0);
      setResumen({
        totalFacturado: totalFacturado,
        totalPagado: totalPagado,
        saldoPendiente: totalFacturado - totalPagado,
        totalFacturas: (response.data.data || []).length
      });

    } catch (error) {
      console.error('Error al cargar facturas pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModalPago = (factura) => {
    setFacturaSeleccionada(factura);
    setMontoPago('');
    setMetodoPago('');
    setReferencia('');
    setNotasPago('');
    setModalPago(true);
  };

  const openModalFacturacion = (factura) => {
    setFacturaParaEditar(factura);
    setModalFacturacion(true);
  };

  const handleRegistrarPago = async () => {
    if (!facturaSeleccionada) return;

    if (!montoPago || parseFloat(montoPago) <= 0 || !metodoPago) {
      alert('Por favor ingrese un monto y seleccione un método de pago válidos.');
      return;
    }

    try {
      // Deshabilitar botón de envío (simulado)
      setLoading(true);

      await api.post(`/facturacion/recolecciones/${facturaSeleccionada.id}/pago`, {
        montoPago: parseFloat(montoPago),
        metodoPago,
        referencia,
        notas: notasPago
      });

      alert('Pago registrado exitosamente. La lista se actualizará.');
      setModalPago(false);
      cargarFacturasPendientes(); // Recargar la lista después del éxito

    } catch (error) {
      console.error('Error al registrar pago:', error);
      alert(error.response?.data?.error || 'Error al registrar el pago.');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estadoPago) => {
    const badges = {
      'pagada': 'bg-emerald-100 text-emerald-800',
      'pendiente_pago': 'bg-rose-100 text-rose-800',
      'pago_parcial': 'bg-amber-100 text-amber-800',
      'cobro_contra_entrega': 'bg-indigo-100 text-indigo-800',
    };
    const labels = {
      'pagada': 'Pagada',
      'pendiente_pago': 'Pendiente',
      'pago_parcial': 'Parcial',
      'cobro_contra_entrega': 'Contra Entrega',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[estadoPago] || 'bg-slate-100 text-slate-800'}`}>
        {labels[estadoPago] || estadoPago}
      </span>
    );
  };

  if (loading && facturasPendientes.length === 0) {
    return <div className="text-center py-12">Cargando facturas pendientes...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 dark:text-white">
      <h1 className="text-3xl font-bold mb-6">Facturas Pendientes de Pago</h1>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-indigo-500">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Facturado</p>
          <p className="text-2xl font-bold mt-1">${(resumen.totalFacturado || 0).toLocaleString('es-DO')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-emerald-500">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Pagado</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">${(resumen.totalPagado || 0).toLocaleString('es-DO')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-rose-500">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Pendiente</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">${(resumen.saldoPendiente || 0).toLocaleString('es-DO')}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-5 border-l-4 border-amber-500">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400"># Facturas</p>
          <p className="text-2xl font-bold mt-1">{resumen.totalFacturas || 0}</p>
        </div>
      </div>

      {/* Filtro por Contenedor */}
      <div className="flex items-center gap-4 mb-6">
        <Filter className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Filtrar por Contenedor:
        </label>
        <select
          value={contenedorFiltro}
          onChange={(e) => setContenedorFiltro(e.target.value)}
          className="px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="todos">Todos los Contenedores</option>
          {contenedores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numeroContenedor} ({c.facturasPendientes} facturas)
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Facturas */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Tracking</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Pagado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Pendiente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Estado Pago</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
              {facturasPendientes.length === 0 && !loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No hay facturas con saldo pendiente para mostrar.
                  </td>
                </tr>
              ) : (
                facturasPendientes.map((factura) => (
                  // ✅ CORRECCIÓN 1: Asegura una clave única
                  <tr key={factura.id || factura.codigoTracking || Math.random()} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition duration-150">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                      {factura.codigoTracking}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {factura.destinatario?.nombre || factura.cliente || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                      ${(factura.facturacion?.totalFactura || 0).toLocaleString('es-DO')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-emerald-600 dark:text-emerald-400">
                      ${(factura.facturacion?.montoPagado || 0).toLocaleString('es-DO')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-rose-600 dark:text-rose-400">
                      ${((factura.facturacion?.totalFactura || 0) - (factura.facturacion?.montoPagado || 0)).toLocaleString('es-DO')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {getEstadoBadge(factura.facturacion?.estadoPago || 'pendiente_pago')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      <button
                        onClick={() => openModalFacturacion(factura)}
                        className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                        title="Gestionar Factura"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => openModalPago(factura)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                        disabled={loading || factura.facturacion?.estadoPago === 'pagada' || ((factura.facturacion?.totalFactura || 0) - (factura.facturacion?.montoPagado || 0)) <= 0}
                        title={factura.facturacion?.estadoPago === 'pagada' ? 'Factura ya pagada' : 'Registrar Pago'}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Registrar Pago
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Pago */}
      {/* ✅ CORRECCIÓN 2: Uso de facturaSeleccionada para evitar crash al renderizar */}
      {modalPago && facturaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-lg shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Registrar Pago</h2>

              <div className="space-y-4 mb-6 bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Factura: {facturaSeleccionada.codigoTracking || facturaSeleccionada.id}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Cliente</p>
                    <p className="font-medium">{facturaSeleccionada.destinatario?.nombre || facturaSeleccionada.cliente || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Total a Cobrar</p>
                    <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                      ${(facturaSeleccionada.facturacion?.totalFactura || 0).toLocaleString('es-DO')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Saldo Pendiente</p>
                    <p className="font-bold text-lg text-rose-600 dark:text-rose-400">
                      ${((facturaSeleccionada.facturacion?.totalFactura || 0) - (facturaSeleccionada.facturacion?.montoPagado || 0)).toLocaleString('es-DO')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Monto del Pago
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                  >
                    <option value="">Seleccione...</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Referencia (Opcional)
                  </label>
                  <input
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    placeholder="Ej: 123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={notasPago}
                    onChange={(e) => setNotasPago(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
                    rows="2"
                    placeholder="Observaciones..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalPago(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegistrarPago}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:bg-slate-400"
                  disabled={loading}
                >
                  {loading ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Facturación Completa */}
      {modalFacturacion && facturaParaEditar && (
        <ModalFacturacion
          factura={facturaParaEditar}
          onClose={() => setModalFacturacion(false)}
          onUpdate={cargarFacturasPendientes}
        />
      )}
    </div>
  );
};

export default FacturasPendientesPago;