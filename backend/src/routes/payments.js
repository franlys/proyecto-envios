import express from 'express';
import { body, param, validationResult } from 'express-validator';
import paypalService from '../services/paypalService.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/payments/create-order
 * @desc    Crear orden de pago en PayPal
 * @access  Private
 */
router.post(
  '/create-order',
  verifyToken,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').optional().isIn(['USD', 'EUR', 'DOP']).withMessage('Invalid currency'),
    body('description').optional().isString(),
    body('invoiceId').optional().isString()
  ],
  async (req, res) => {
    // Validar datos
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        amount,
        currency,
        description,
        invoiceId
      } = req.body;

      // Crear orden en PayPal
      const result = await paypalService.createOrder({
        amount: parseFloat(amount),
        currency: currency || 'USD',
        description: description || 'Pago de envío',
        invoiceId: invoiceId,
        companyId: req.user.company_id,
        userId: req.user.uid,
        returnUrl: `${process.env.FRONTEND_URL}/payments/success`,
        cancelUrl: `${process.env.FRONTEND_URL}/payments/cancel`
      });

      res.json({
        success: true,
        message: 'PayPal order created successfully',
        data: result
      });

    } catch (error) {
      console.error('Error creating PayPal order:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/payments/capture-order/:orderId
 * @desc    Capturar pago de orden aprobada
 * @access  Private
 */
router.post(
  '/capture-order/:orderId',
  verifyToken,
  [
    param('orderId').isString().notEmpty().withMessage('Order ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { orderId } = req.params;

      // Capturar pago
      const result = await paypalService.captureOrder(orderId);

      res.json({
        success: true,
        message: 'Payment captured successfully',
        data: result
      });

    } catch (error) {
      console.error('Error capturing payment:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * @route   GET /api/payments/order/:orderId
 * @desc    Obtener detalles de una orden
 * @access  Private
 */
router.get(
  '/order/:orderId',
  verifyToken,
  [
    param('orderId').isString().notEmpty().withMessage('Order ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { orderId } = req.params;

      // Obtener orden
      const result = await paypalService.getOrderDetails(orderId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error getting order details:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Webhook para notificaciones de PayPal
 * @access  Public (pero verificado por PayPal)
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;

    // Procesar webhook
    await paypalService.handleWebhook(webhookData);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Error processing webhook:', error);

    // Importante: Siempre responder 200 para webhooks
    // para evitar que PayPal reintente
    res.status(200).json({
      success: false,
      message: 'Webhook received but processing failed'
    });
  }
});

/**
 * @route   GET /api/payments/config
 * @desc    Obtener configuración pública de PayPal (Client ID)
 * @access  Public
 */
router.get('/config', (req, res) => {
  if (!paypalService.isConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'PayPal is not configured'
    });
  }

  res.json({
    success: true,
    clientId: process.env.PAYPAL_CLIENT_ID,
    mode: process.env.PAYPAL_MODE || 'sandbox'
  });
});

export default router;
