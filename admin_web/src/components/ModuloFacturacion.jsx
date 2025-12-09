// admin_web/src/components/ModuloFacturacion.jsx
/**
 * MÓDULO DE FACTURACIÓN
 * Componente reutilizable para gestionar precios, pagos y estados financieros
 */

import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Wallet, Calculator, AlertCircle, CheckCircle, Clock, Upload, FileText, Send, Mail, MessageCircle } from 'lucide-react';

const ModuloFacturacion = ({
  items = [],
  onItemsChange,
  facturacion = {},
  onFacturacionChange,
  readOnly = false,
  mostrarPagos = true,
  recoleccionId = null // ✅ Nuevo prop para identificar la recolección
}) => {
  const [itemsConPrecios, setItemsConPrecios] = useState(items);
  const [estadoPago, setEstadoPago] = useState(facturacion.estadoPago || 'pendiente_pago');
  const [metodoPago, setMetodoPago] = useState(facturacion.metodoPago || '');
  const [montoPagado, setMontoPagado] = useState(facturacion.montoPagado || 0);
  const [notas, setNotas] = useState(facturacion.notas || '');

  // Estado para archivo y envío
  const [facturaUrl, setFacturaUrl] = useState(facturacion.archivoUrl || null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  // Calcular totales
  const [subtotal, setSubtotal] = useState(0);
  const [impuestos, setImpuestos] = useState(0);
  const [total, setTotal] = useState(0);
  const [saldoPendiente, setSaldoPendiente] = useState(0);

  // Actualizar items cuando cambien
  useEffect(() => {
    setItemsConPrecios(items);
  }, [items]);

  // Recalcular totales cuando cambien los items o el pago
  useEffect(() => {
    calcularTotales();
  }, [itemsConPrecios, montoPagado, estadoPago]);

  const calcularTotales = () => {
    // Calcular subtotal
    const nuevoSubtotal = itemsConPrecios.reduce((sum, item) => {
      const precio = parseFloat(item.precio) || 0;
      const cantidad = parseInt(item.cantidad) || 1;
      return sum + (precio * cantidad);
    }, 0);

    // Calcular impuestos (ITBIS 18% para RD)
    const nuevosImpuestos = nuevoSubtotal * 0.18;

    // Total
    const nuevoTotal = nuevoSubtotal + nuevosImpuestos;

    // Calcular saldo pendiente
    let nuevoSaldoPendiente = nuevoTotal;
    let montoPagadoActual = parseFloat(montoPagado) || 0;

    if (estadoPago === 'pagada') {
      montoPagadoActual = nuevoTotal;
      nuevoSaldoPendiente = 0;
    } else if (estadoPago === 'pago_parcial') {
      nuevoSaldoPendiente = nuevoTotal - montoPagadoActual;
    } else if (estadoPago === 'cobro_contra_entrega') {
      montoPagadoActual = 0;
      nuevoSaldoPendiente = nuevoTotal;
    }

    setSubtotal(nuevoSubtotal);
    setImpuestos(nuevosImpuestos);
    setTotal(nuevoTotal);
    setSaldoPendiente(Math.max(0, nuevoSaldoPendiente));

    // Notificar al componente padre
    if (onFacturacionChange) {
      onFacturacionChange({
        subtotal: nuevoSubtotal,
        impuestos: nuevosImpuestos,
        total: nuevoTotal,
        estadoPago,
        metodoPago,
        montoPagado: montoPagadoActual,
        saldoPendiente: Math.max(0, nuevoSaldoPendiente),
        notas,
        archivoUrl: facturaUrl // Incluir la URL del archivo en la notificación
      });
    }
  };

  const handlePrecioChange = (index, precio) => {
    const nuevosItems = [...itemsConPrecios];
    // Permitir valor vacío o número
    nuevosItems[index] = {
      ...nuevosItems[index],
      precio: precio
    };
    setItemsConPrecios(nuevosItems);

    if (onItemsChange) {
      onItemsChange(nuevosItems);
    }
  };

  const handleEstadoPagoChange = (nuevoEstado) => {
    setEstadoPago(nuevoEstado);

    // Si cambia a "pagada", ajustar el monto pagado
    if (nuevoEstado === 'pagada') {
      setMontoPagado(total);
    } else if (nuevoEstado === 'pendiente_pago' || nuevoEstado === 'cobro_contra_entrega') {
      setMontoPagado(0);
    }
  };

  const getEstadoBadge = () => {
    const badges = {
      pagada: {
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        icon: CheckCircle,
        text: 'Pagada'
      },
      pendiente_pago: {
        color: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
        icon: AlertCircle,
        text: 'Pendiente de Pago'
      },
      pago_parcial: {
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        icon: Clock,
        text: 'Pago Parcial'
      },
      cobro_contra_entrega: {
        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
        icon: Wallet,
        text: 'Cobro Contra Entrega'
      }
    };

    const badge = badges[estadoPago] || badges.pendiente_pago;
    const Icon = badge.icon;

    return (
      <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon size={16} />
        {badge.text}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return `USD$ ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Manejadores de Archivo y Envío
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !recoleccionId) return;

    const formData = new FormData();
    formData.append('factura', file);

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      // Usar URL relativa si hay proxy, o absoluta si no. Asumimos /api base.
      // Ajustar según configuración real de API.
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      const response = await fetch(`${apiUrl}/facturacion/recolecciones/${recoleccionId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setFacturaUrl(data.url);
        alert('Factura subida exitosamente');
        if (onFacturacionChange) {
          onFacturacionChange({ ...facturacion, archivoUrl: data.url });
        }
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error subiendo factura:', error);
      alert('Error al subir la factura');
    } finally {
      setUploading(false);
    }
  };

  const handleSendInvoice = async (metodo) => {
    if (!recoleccionId) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

      const response = await fetch(`${apiUrl}/facturacion/recolecciones/${recoleccionId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ metodo })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Factura enviada por ${metodo} exitosamente`);
      } else {
        alert('Error: ' + (data.error || 'No se pudo enviar'));
      }
    } catch (error) {
      console.error('Error enviando factura:', error);
      alert('Error al enviar la factura');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Calculator className="text-indigo-600" size={32} />
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Facturación
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Precios, impuestos y estado de pago
            </p>
          </div>
        </div>
        {getEstadoBadge()}
      </div>

      {/* Items con precios */}
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
          Items y Precios
        </h4>

        <div className="space-y-2">
          {itemsConPrecios.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-white">
                  {item.descripcion || item.producto || 'Sin descripción'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Cantidad: {item.cantidad}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">USD$</span>
                <input
                  type="number"
                  value={item.precio}
                  onChange={(e) => handlePrecioChange(index, e.target.value)}
                  disabled={readOnly}
                  className={`w-32 px-3 py-2 border rounded-lg text-right font-semibold ${item.precio === '' || item.precio === null || item.precio === undefined
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : 'border-slate-300 dark:border-slate-600 dark:bg-slate-600 dark:text-white'
                    }`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="w-32 text-right">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                <p className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency((parseFloat(item.precio) || 0) * (parseInt(item.cantidad) || 1))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-slate-700 dark:text-slate-300">Subtotal:</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(subtotal)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-slate-700 dark:text-slate-300">ITBIS (18%):</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(impuestos)}
          </span>
        </div>

        <div className="border-t border-indigo-200 dark:border-indigo-800 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-slate-900 dark:text-white">Total:</span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Gestión de pagos */}
      {mostrarPagos && !readOnly && (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900 dark:text-white">
            Gestión de Pago
          </h4>

          {/* Alerta si la factura ya está pagada por completo */}
          {estadoPago === 'pagada' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-emerald-600 dark:text-emerald-400 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-emerald-800 dark:text-emerald-200">
                    Factura Pagada por Completo
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                    Esta factura ya ha sido pagada en su totalidad. No se pueden hacer modificaciones al pago.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Estado de pago - DESHABILITADO SI YA ESTÁ PAGADA */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Estado de Pago *
            </label>
            <select
              value={estadoPago}
              onChange={(e) => handleEstadoPagoChange(e.target.value)}
              disabled={estadoPago === 'pagada'}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="pendiente_pago">Pendiente de Pago</option>
              <option value="pago_parcial">Pago Parcial</option>
              <option value="pagada">Pagada</option>
              <option value="cobro_contra_entrega">Cobro Contra Entrega</option>
            </select>
          </div>

          {/* Método de pago - SIEMPRE EDITABLE, INCLUSO SI ESTÁ PAGADA */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Método de Pago {estadoPago === 'pagada' || estadoPago === 'pago_parcial' ? '*' : ''}
            </label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
            >
              <option value="">Seleccionar...</option>
              <option value="efectivo">💵 Efectivo</option>
              <option value="transferencia">🏦 Transferencia Bancaria</option>
              <option value="tarjeta">💳 Tarjeta de Crédito/Débito</option>
              <option value="cheque">📝 Cheque</option>
              <option value="otro">📋 Otro</option>
            </select>
          </div>

          {/* Monto pagado (solo para pago parcial) - DESHABILITADO SI YA ESTÁ PAGADA */}
          {estadoPago === 'pago_parcial' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Monto Pagado
              </label>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">USD$</span>
                <input
                  type="number"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(e.target.value)}
                  disabled={estadoPago === 'pagada'}
                  className={`flex-1 px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${montoPagado === ''
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                    : 'border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white'
                    }`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={total}
                />
              </div>

              {/* Saldo pendiente */}
              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Saldo Pendiente:
                  </span>
                  <span className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    {formatCurrency(saldoPendiente)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notas - SIEMPRE SE PUEDEN AGREGAR NOTAS */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notas / Observaciones
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg"
              rows="3"
              placeholder="Observaciones sobre el pago..."
            />
          </div>
        </div>
      )}

      {/* Resumen de pagos (solo lectura) */}
      {readOnly && mostrarPagos && (
        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
            Información de Pago
          </h4>

          {estadoPago === 'pago_parcial' && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-300">Monto Pagado:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(montoPagado)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-700 dark:text-slate-300">Saldo Pendiente:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {formatCurrency(saldoPendiente)}
                </span>
              </div>
            </>
          )}

          {metodoPago && (
            <div className="flex justify-between">
              <span className="text-slate-700 dark:text-slate-300">Método de Pago:</span>
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {metodoPago}
              </span>
            </div>
          )}

          {notas && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>Notas:</strong> {notas}
              </p>
            </div>
          )}
        </div>
      )}
      {/* Gestión de Archivo de Factura */}
      {recoleccionId && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" />
            Documento de Factura
          </h4>

          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            {facturaUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-600 rounded border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle size={18} />
                    <span className="font-medium">Factura Disponible</span>
                  </div>
                  <a
                    href={facturaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    Ver Documento
                  </a>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendInvoice('email')}
                    disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-400 transition"
                  >
                    <Mail size={16} />
                    {sending ? 'Enviando...' : 'Enviar Email'}
                  </button>
                  <button
                    onClick={() => handleSendInvoice('whatsapp')}
                    disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-400 transition"
                  >
                    <MessageCircle size={16} />
                    {sending ? 'Enviando...' : 'Enviar WhatsApp'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  No hay factura adjunta. Sube el PDF o imagen de la factura.
                </p>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-500 transition">
                  <Upload size={18} className="text-slate-600 dark:text-slate-300" />
                  <span className="text-slate-700 dark:text-slate-200">
                    {uploading ? 'Subiendo...' : 'Subir Factura'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuloFacturacion;