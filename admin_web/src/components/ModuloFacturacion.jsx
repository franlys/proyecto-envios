// admin_web/src/components/ModuloFacturacion.jsx
/**
 * MÓDULO DE FACTURACIÓN
 * Componente reutilizable para gestionar precios, pagos y estados financieros
 */

import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Wallet, Calculator, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const ModuloFacturacion = ({ 
  items = [], 
  onItemsChange, 
  facturacion = {}, 
  onFacturacionChange,
  readOnly = false,
  mostrarPagos = true 
}) => {
  const [itemsConPrecios, setItemsConPrecios] = useState(items);
  const [estadoPago, setEstadoPago] = useState(facturacion.estadoPago || 'pendiente_pago');
  const [metodoPago, setMetodoPago] = useState(facturacion.metodoPago || '');
  const [montoPagado, setMontoPagado] = useState(facturacion.montoPagado || 0);
  const [notas, setNotas] = useState(facturacion.notas || '');

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
        notas
      });
    }
  };

  const handlePrecioChange = (index, precio) => {
    const nuevosItems = [...itemsConPrecios];
    nuevosItems[index] = {
      ...nuevosItems[index],
      precio: parseFloat(precio) || 0
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
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle,
        text: 'Pagada'
      },
      pendiente_pago: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: AlertCircle,
        text: 'Pendiente de Pago'
      },
      pago_parcial: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: Clock,
        text: 'Pago Parcial'
      },
      cobro_contra_entrega: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
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
    return `RD$ ${amount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Calculator className="text-blue-600" size={32} />
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Facturación
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Precios, impuestos y estado de pago
            </p>
          </div>
        </div>
        {getEstadoBadge()}
      </div>

      {/* Items con precios */}
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
          Items y Precios
        </h4>
        
        <div className="space-y-2">
          {itemsConPrecios.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {item.descripcion}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cantidad: {item.cantidad}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">RD$</span>
                <input
                  type="number"
                  value={item.precio || ''}
                  onChange={(e) => handlePrecioChange(index, e.target.value)}
                  disabled={readOnly}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-lg text-right font-semibold"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="w-32 text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency((item.precio || 0) * (item.cantidad || 1))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen financiero */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(subtotal)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-700 dark:text-gray-300">ITBIS (18%):</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(impuestos)}
          </span>
        </div>

        <div className="border-t border-blue-200 dark:border-blue-800 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Gestión de pagos */}
      {mostrarPagos && !readOnly && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Gestión de Pago
          </h4>

          {/* Estado de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado de Pago *
            </label>
            <select
              value={estadoPago}
              onChange={(e) => handleEstadoPagoChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
            >
              <option value="pendiente_pago">Pendiente de Pago</option>
              <option value="pago_parcial">Pago Parcial</option>
              <option value="pagada">Pagada</option>
              <option value="cobro_contra_entrega">Cobro Contra Entrega</option>
            </select>
          </div>

          {/* Método de pago */}
          {(estadoPago === 'pagada' || estadoPago === 'pago_parcial') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Método de Pago
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
          )}

          {/* Monto pagado (solo para pago parcial) */}
          {estadoPago === 'pago_parcial' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monto Pagado
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">RD$</span>
                <input
                  type="number"
                  value={montoPagado}
                  onChange={(e) => setMontoPagado(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={total}
                />
              </div>
              
              {/* Saldo pendiente */}
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Saldo Pendiente:
                  </span>
                  <span className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
                    {formatCurrency(saldoPendiente)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notas / Observaciones
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              rows="3"
              placeholder="Observaciones sobre el pago..."
            />
          </div>
        </div>
      )}

      {/* Resumen de pagos (solo lectura) */}
      {readOnly && mostrarPagos && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Información de Pago
          </h4>

          {estadoPago === 'pago_parcial' && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Monto Pagado:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(montoPagado)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Saldo Pendiente:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(saldoPendiente)}
                </span>
              </div>
            </>
          )}

          {metodoPago && (
            <div className="flex justify-between">
              <span className="text-gray-700 dark:text-gray-300">Método de Pago:</span>
              <span className="font-semibold text-gray-900 dark:text-white capitalize">
                {metodoPago}
              </span>
            </div>
          )}

          {notas && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Notas:</strong> {notas}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuloFacturacion;