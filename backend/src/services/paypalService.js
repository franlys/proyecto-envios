import { Client, Environment, OrdersController, PaymentsController } from '@paypal/paypal-server-sdk';
import admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Servicio de PayPal para procesar pagos
 *
 * CONFIGURACIÓN REQUERIDA:
 * - PAYPAL_CLIENT_ID: Client ID de tu app de PayPal
 * - PAYPAL_CLIENT_SECRET: Secret de tu app de PayPal
 * - PAYPAL_MODE: 'sandbox' o 'live'
 */

class PayPalService {
  constructor() {
    // Validar variables de entorno
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      console.warn('⚠️  PayPal credentials not configured. Payment features will be disabled.');
      this.client = null;
      return;
    }

    // Determinar entorno (sandbox o production)
    const environment = process.env.PAYPAL_MODE === 'live'
      ? Environment.Production
      : Environment.Sandbox;

    // Inicializar cliente de PayPal
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET
      },
      timeout: 0,
      environment: environment,
      logging: {
        logLevel: 'info',
        logRequest: { logBody: true },
        logResponse: { logHeaders: true }
      }
    });

    this.ordersController = new OrdersController(this.client);
    this.paymentsController = new PaymentsController(this.client);

    console.log(`✅ PayPal Service initialized in ${process.env.PAYPAL_MODE || 'sandbox'} mode`);
  }

  /**
   * Verificar si PayPal está configurado
   */
  isConfigured() {
    return this.client !== null;
  }

  /**
   * Crear orden de pago en PayPal
   * @param {Object} orderData - Datos de la orden
   * @returns {Promise<Object>} - Orden creada con ID y links
   */
  async createOrder(orderData) {
    if (!this.isConfigured()) {
      throw new Error('PayPal is not configured. Please add credentials to environment variables.');
    }

    const {
      amount,
      currency = 'USD',
      description = 'Compra en Envíos Express RD',
      invoiceId = null,
      companyId = null,
      userId = null,
      returnUrl = `${process.env.FRONTEND_URL}/payment/success`,
      cancelUrl = `${process.env.FRONTEND_URL}/payment/cancel`
    } = orderData;

    try {
      // Crear orden en PayPal
      const request = {
        body: {
          intent: 'CAPTURE',
          purchaseUnits: [
            {
              referenceId: invoiceId || `ORDER-${Date.now()}`,
              description: description,
              customId: JSON.stringify({
                companyId,
                userId,
                invoiceId,
                timestamp: new Date().toISOString()
              }),
              amount: {
                currencyCode: currency,
                value: amount.toFixed(2)
              }
            }
          ],
          applicationContext: {
            returnUrl: returnUrl,
            cancelUrl: cancelUrl,
            brandName: 'Envíos Express RD',
            landingPage: 'BILLING',
            userAction: 'PAY_NOW',
            shippingPreference: 'NO_SHIPPING'
          }
        }
      };

      const response = await this.ordersController.ordersCreate(request);

      // Guardar orden en Firestore
      await db.collection('paypal_orders').doc(response.result.id).set({
        orderId: response.result.id,
        status: response.result.status,
        amount: parseFloat(amount),
        currency: currency,
        description: description,
        invoiceId: invoiceId,
        companyId: companyId,
        userId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paypalResponse: response.result
      });

      console.log(`✅ PayPal order created: ${response.result.id}`);

      // Extraer approval URL
      const approvalLink = response.result.links?.find(link => link.rel === 'approve');

      return {
        success: true,
        orderId: response.result.id,
        status: response.result.status,
        approvalUrl: approvalLink?.href,
        links: response.result.links
      };

    } catch (error) {
      console.error('❌ Error creating PayPal order:', error);

      // Registrar error
      await db.collection('paypal_errors').add({
        type: 'create_order',
        error: error.message,
        orderData: orderData,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      throw new Error(`Failed to create PayPal order: ${error.message}`);
    }
  }

  /**
   * Capturar pago de una orden aprobada
   * @param {string} orderId - ID de la orden de PayPal
   * @returns {Promise<Object>} - Detalles del pago capturado
   */
  async captureOrder(orderId) {
    if (!this.isConfigured()) {
      throw new Error('PayPal is not configured');
    }

    try {
      // Capturar orden
      const request = { id: orderId };
      const response = await this.ordersController.ordersCapture(request);

      const captureDetails = response.result;

      // Actualizar orden en Firestore
      await db.collection('paypal_orders').doc(orderId).update({
        status: captureDetails.status,
        capturedAt: admin.firestore.FieldValue.serverTimestamp(),
        captureDetails: captureDetails
      });

      console.log(`✅ Payment captured for order: ${orderId}`);

      // Extraer información de pago
      const capture = captureDetails.purchaseUnits?.[0]?.payments?.captures?.[0];

      return {
        success: true,
        orderId: orderId,
        status: captureDetails.status,
        captureId: capture?.id,
        amount: capture?.amount,
        payerEmail: captureDetails.payer?.email_address,
        payerName: captureDetails.payer?.name?.given_name + ' ' + captureDetails.payer?.name?.surname,
        details: captureDetails
      };

    } catch (error) {
      console.error(`❌ Error capturing order ${orderId}:`, error);

      // Registrar error
      await db.collection('paypal_errors').add({
        type: 'capture_order',
        orderId: orderId,
        error: error.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      throw new Error(`Failed to capture payment: ${error.message}`);
    }
  }

  /**
   * Obtener detalles de una orden
   * @param {string} orderId - ID de la orden
   * @returns {Promise<Object>} - Detalles de la orden
   */
  async getOrderDetails(orderId) {
    if (!this.isConfigured()) {
      throw new Error('PayPal is not configured');
    }

    try {
      const request = { id: orderId };
      const response = await this.ordersController.ordersGet(request);

      return {
        success: true,
        order: response.result
      };

    } catch (error) {
      console.error(`❌ Error getting order ${orderId}:`, error);
      throw new Error(`Failed to get order details: ${error.message}`);
    }
  }

  /**
   * Procesar webhook de PayPal
   * @param {Object} webhookData - Datos del webhook
   * @returns {Promise<Object>} - Resultado del procesamiento
   */
  async handleWebhook(webhookData) {
    const { event_type, resource } = webhookData;

    console.log(`📬 PayPal Webhook received: ${event_type}`);

    try {
      switch (event_type) {
        case 'CHECKOUT.ORDER.APPROVED':
          // Orden aprobada por el usuario
          await this.onOrderApproved(resource);
          break;

        case 'PAYMENT.CAPTURE.COMPLETED':
          // Pago capturado exitosamente
          await this.onPaymentCaptured(resource);
          break;

        case 'PAYMENT.CAPTURE.DENIED':
          // Pago denegado
          await this.onPaymentDenied(resource);
          break;

        case 'PAYMENT.CAPTURE.REFUNDED':
          // Pago reembolsado
          await this.onPaymentRefunded(resource);
          break;

        default:
          console.log(`⚠️  Unhandled webhook event: ${event_type}`);
      }

      // Guardar webhook en Firestore
      await db.collection('paypal_webhooks').add({
        eventType: event_type,
        resource: resource,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, eventType: event_type };

    } catch (error) {
      console.error(`❌ Error processing webhook ${event_type}:`, error);
      throw error;
    }
  }

  /**
   * Handler: Orden aprobada
   */
  async onOrderApproved(resource) {
    const orderId = resource.id;
    console.log(`✅ Order approved: ${orderId}`);

    await db.collection('paypal_orders').doc(orderId).update({
      status: 'APPROVED',
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  /**
   * Handler: Pago capturado
   */
  async onPaymentCaptured(resource) {
    const captureId = resource.id;
    const customId = resource.custom_id;

    console.log(`✅ Payment captured: ${captureId}`);

    // Parsear custom data
    let customData = {};
    try {
      customData = JSON.parse(customId);
    } catch (e) {
      console.warn('Could not parse custom_id');
    }

    // Si hay una factura asociada, marcarla como pagada
    if (customData.invoiceId) {
      await db.collection('facturas').doc(customData.invoiceId).update({
        'pagos.estado': 'pagado',
        'pagos.metodoPago': 'paypal',
        'pagos.transaccionId': captureId,
        'pagos.fechaPago': admin.firestore.FieldValue.serverTimestamp(),
        'pagos.monto': parseFloat(resource.amount.value)
      });

      console.log(`✅ Invoice ${customData.invoiceId} marked as paid`);
    }

    // Guardar captura en Firestore
    await db.collection('paypal_captures').doc(captureId).set({
      captureId: captureId,
      status: resource.status,
      amount: parseFloat(resource.amount.value),
      currency: resource.amount.currency_code,
      customData: customData,
      capturedAt: admin.firestore.FieldValue.serverTimestamp(),
      resource: resource
    });
  }

  /**
   * Handler: Pago denegado
   */
  async onPaymentDenied(resource) {
    console.log(`❌ Payment denied: ${resource.id}`);

    await db.collection('paypal_captures').doc(resource.id).set({
      captureId: resource.id,
      status: 'DENIED',
      deniedAt: admin.firestore.FieldValue.serverTimestamp(),
      resource: resource
    });
  }

  /**
   * Handler: Pago reembolsado
   */
  async onPaymentRefunded(resource) {
    const refundId = resource.id;
    console.log(`💰 Payment refunded: ${refundId}`);

    await db.collection('paypal_refunds').doc(refundId).set({
      refundId: refundId,
      status: resource.status,
      amount: parseFloat(resource.amount.value),
      currency: resource.amount.currency_code,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      resource: resource
    });
  }
}

// Exportar instancia única
const paypalService = new PayPalService();

export default paypalService;
