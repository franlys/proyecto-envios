import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Componente para botón de pago con PayPal
 *
 * @param {Object} props
 * @param {number} props.amount - Monto a pagar
 * @param {string} props.currency - Moneda (USD, EUR, DOP)
 * @param {string} props.description - Descripción del pago
 * @param {string} props.invoiceId - ID de factura (opcional)
 * @param {Function} props.onSuccess - Callback cuando el pago es exitoso
 * @param {Function} props.onError - Callback cuando hay error
 * @param {Function} props.onCancel - Callback cuando se cancela
 */
const PayPalButton = ({
  amount,
  currency = 'USD',
  description = 'Pago de envío',
  invoiceId = null,
  onSuccess,
  onError,
  onCancel
}) => {
  const [paypalConfig, setPaypalConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Obtener configuración de PayPal al montar
  useEffect(() => {
    fetchPayPalConfig();
  }, []);

  /**
   * Obtener Client ID de PayPal desde backend
   */
  const fetchPayPalConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/payments/config`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setPaypalConfig({
          clientId: response.data.clientId,
          currency: currency
        });
        setLoading(false);
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error fetching PayPal config:', err);
      setError('PayPal no está configurado. Contacta al administrador.');
      setLoading(false);
      toast.error('PayPal no disponible');
    }
  };

  /**
   * Crear orden en PayPal (backend)
   */
  const createOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/payments/create-order`,
        {
          amount: parseFloat(amount),
          currency: currency,
          description: description,
          invoiceId: invoiceId
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        console.log('✅ Order created:', response.data.data.orderId);
        return response.data.data.orderId;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error creating order:', err);
      toast.error('Error al crear orden de pago');
      throw err;
    }
  };

  /**
   * Capturar pago aprobado (backend)
   */
  const onApprove = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/payments/capture-order/${data.orderID}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        console.log('✅ Payment captured:', response.data.data);
        toast.success('¡Pago completado exitosamente!');

        // Callback de éxito
        if (onSuccess) {
          onSuccess(response.data.data);
        }

        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      console.error('Error capturing payment:', err);
      toast.error('Error al procesar el pago');

      if (onError) {
        onError(err);
      }

      throw err;
    }
  };

  /**
   * Handler cuando se cancela el pago
   */
  const onCancelHandler = () => {
    console.log('Payment cancelled by user');
    toast.info('Pago cancelado');

    if (onCancel) {
      onCancel();
    }
  };

  /**
   * Handler de errores
   */
  const onErrorHandler = (err) => {
    console.error('PayPal error:', err);
    toast.error('Ocurrió un error con PayPal');

    if (onError) {
      onError(err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Cargando PayPal...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  // PayPal no configurado
  if (!paypalConfig) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          PayPal no está disponible en este momento.
        </p>
      </div>
    );
  }

  // Render PayPal button
  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalConfig.clientId,
        currency: currency,
        intent: 'capture'
      }}
    >
      <div className="paypal-button-container">
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            tagline: false
          }}
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={onCancelHandler}
          onError={onErrorHandler}
          disabled={!amount || amount <= 0}
        />
      </div>
    </PayPalScriptProvider>
  );
};

export default PayPalButton;
