# Integración de PayPal - Guía Completa

## 🎯 Descripción

Este documento describe la implementación completa del sistema de pagos con PayPal en el proyecto de envíos.

---

## 📋 Contenido

1. [Configuración de PayPal](#configuración-de-paypal)
2. [Backend - Servicio de PayPal](#backend)
3. [Frontend - Componentes de Pago](#frontend)
4. [API Endpoints](#api-endpoints)
5. [Webhooks](#webhooks)
6. [Pruebas](#pruebas)
7. [Producción](#producción)

---

## 🔧 Configuración de PayPal

### Paso 1: Crear Cuenta de Desarrollador

1. Ve a https://developer.paypal.com/
2. Inicia sesión con tu cuenta PayPal (o crea una)
3. Ve a **Dashboard** → **My Apps & Credentials**

### Paso 2: Crear App (Sandbox)

1. En la sección **Sandbox**, haz clic en **Create App**
2. Dale un nombre a tu app (ej: "Envíos Express RD - Dev")
3. Selecciona el tipo: **Merchant**
4. Haz clic en **Create App**

### Paso 3: Obtener Credenciales

Una vez creada la app, encontrarás:

```
Client ID: AaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Secret: ELyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

**⚠️ IMPORTANTE:** Estas son las credenciales del **Sandbox** (para pruebas).

### Paso 4: Configurar Variables de Entorno

Agrega las credenciales a tu archivo `.env`:

```bash
# PayPal Configuration (Sandbox)
PAYPAL_CLIENT_ID=AaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
PAYPAL_CLIENT_SECRET=ELyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
PAYPAL_MODE=sandbox

# Frontend URL (para redirect después del pago)
FRONTEND_URL=http://localhost:5173
```

---

## 🔙 Backend

### Arquitectura

```
backend/
├── src/
│   ├── services/
│   │   └── paypalService.js      # Servicio principal de PayPal
│   ├── routes/
│   │   └── payments.js            # Rutas de API para pagos
│   └── index.js                   # Registro de rutas
```

### Servicio de PayPal

El servicio (`paypalService.js`) incluye:

- ✅ Crear órdenes de pago
- ✅ Capturar pagos aprobados
- ✅ Obtener detalles de órdenes
- ✅ Procesar webhooks
- ✅ Manejo de errores y logs

**Ejemplo de uso:**

```javascript
import paypalService from './services/paypalService.js';

// Crear orden
const order = await paypalService.createOrder({
  amount: 79.00,
  currency: 'USD',
  description: 'Suscripción Plan Pro',
  invoiceId: 'FACT-2025-001',
  companyId: 'company_123',
  userId: 'user_456'
});

console.log(order.approvalUrl); // URL para que el usuario pague
```

### Firestore Collections

El sistema crea automáticamente estas colecciones:

#### **paypal_orders** (Órdenes creadas)
```javascript
{
  orderId: "8PX12345ABC67890",
  status: "CREATED" | "APPROVED" | "COMPLETED",
  amount: 79.00,
  currency: "USD",
  description: "Suscripción Plan Pro",
  invoiceId: "FACT-2025-001",
  companyId: "company_123",
  userId: "user_456",
  createdAt: Timestamp,
  approvedAt: Timestamp,
  capturedAt: Timestamp,
  paypalResponse: { ... }
}
```

#### **paypal_captures** (Pagos capturados)
```javascript
{
  captureId: "5AB12345CD67890",
  status: "COMPLETED" | "DENIED",
  amount: 79.00,
  currency: "USD",
  customData: {
    companyId: "company_123",
    userId: "user_456",
    invoiceId: "FACT-2025-001"
  },
  capturedAt: Timestamp,
  resource: { ... }
}
```

#### **paypal_webhooks** (Eventos de PayPal)
```javascript
{
  eventType: "PAYMENT.CAPTURE.COMPLETED",
  resource: { ... },
  processedAt: Timestamp
}
```

#### **paypal_refunds** (Reembolsos)
```javascript
{
  refundId: "6BC12345DE67890",
  status: "COMPLETED",
  amount: 79.00,
  currency: "USD",
  refundedAt: Timestamp,
  resource: { ... }
}
```

#### **paypal_errors** (Errores)
```javascript
{
  type: "create_order" | "capture_order",
  error: "Error message",
  orderData: { ... },
  timestamp: Timestamp
}
```

---

## 🎨 Frontend

### Componente PayPalButton

Ubicación: `admin_web/src/components/PayPalButton.jsx`

**Props:**

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `amount` | number | ✅ | Monto a cobrar |
| `currency` | string | ❌ | Moneda (default: 'USD') |
| `description` | string | ❌ | Descripción del pago |
| `invoiceId` | string | ❌ | ID de factura asociada |
| `onSuccess` | function | ❌ | Callback al completar pago |
| `onError` | function | ❌ | Callback en caso de error |
| `onCancel` | function | ❌ | Callback si se cancela |

**Ejemplo de uso:**

```jsx
import PayPalButton from '../components/PayPalButton';

function MiComponente() {
  const handleSuccess = (detallesPago) => {
    console.log('Pago exitoso:', detallesPago);
    // Actualizar UI, marcar como pagado, etc.
  };

  return (
    <PayPalButton
      amount={79.00}
      currency="USD"
      description="Suscripción Plan Pro - Mensual"
      invoiceId="FACT-2025-001"
      onSuccess={handleSuccess}
      onError={(err) => console.error(err)}
      onCancel={() => console.log('Cancelado')}
    />
  );
}
```

### Página de Suscripciones

La página `admin_web/src/pages/Finanzas/Suscripciones.jsx` incluye:

- Listado de planes disponibles
- Modal de pago con PayPalButton
- Manejo de estados (loading, error, success)

---

## 🔌 API Endpoints

### **POST** `/api/payments/create-order`

Crear una orden de pago en PayPal.

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "amount": 79.00,
  "currency": "USD",
  "description": "Suscripción Plan Pro",
  "invoiceId": "FACT-2025-001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PayPal order created successfully",
  "data": {
    "orderId": "8PX12345ABC67890",
    "status": "CREATED",
    "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=8PX12345ABC67890",
    "links": [ ... ]
  }
}
```

---

### **POST** `/api/payments/capture-order/:orderId`

Capturar pago de una orden aprobada.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "data": {
    "orderId": "8PX12345ABC67890",
    "status": "COMPLETED",
    "captureId": "5AB12345CD67890",
    "amount": {
      "currencyCode": "USD",
      "value": "79.00"
    },
    "payerEmail": "buyer@example.com",
    "payerName": "John Doe"
  }
}
```

---

### **GET** `/api/payments/order/:orderId`

Obtener detalles de una orden.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "8PX12345ABC67890",
      "status": "APPROVED",
      "intent": "CAPTURE",
      "purchaseUnits": [ ... ]
    }
  }
}
```

---

### **GET** `/api/payments/config`

Obtener configuración pública de PayPal (Client ID).

**Response:**
```json
{
  "success": true,
  "clientId": "AaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "mode": "sandbox"
}
```

---

### **POST** `/api/payments/webhook`

Endpoint para webhooks de PayPal (público, sin auth).

**Body:** Enviado por PayPal automáticamente.

---

## 🔔 Webhooks

### Configurar Webhooks en PayPal

1. Ve a tu app en PayPal Dashboard
2. Scroll hasta **Webhooks**
3. Haz clic en **Add Webhook**
4. URL: `https://tu-dominio.com/api/payments/webhook`
5. Selecciona eventos:
   - ✅ `CHECKOUT.ORDER.APPROVED`
   - ✅ `PAYMENT.CAPTURE.COMPLETED`
   - ✅ `PAYMENT.CAPTURE.DENIED`
   - ✅ `PAYMENT.CAPTURE.REFUNDED`

### Eventos Manejados

| Evento | Acción |
|--------|--------|
| `CHECKOUT.ORDER.APPROVED` | Actualiza estado de orden a APPROVED |
| `PAYMENT.CAPTURE.COMPLETED` | Marca factura como pagada, guarda captura |
| `PAYMENT.CAPTURE.DENIED` | Registra pago denegado |
| `PAYMENT.CAPTURE.REFUNDED` | Registra reembolso |

---

## 🧪 Pruebas

### Cuentas de Prueba (Sandbox)

PayPal crea automáticamente cuentas de prueba:

**Comprador (Buyer):**
```
Email: sb-xxxxx@personal.example.com
Password: xxxxxxxx
```

**Vendedor (Merchant):**
```
Email: sb-yyyyy@business.example.com
Password: yyyyyyyy
```

### Tarjetas de Prueba

Si usas tarjeta en el checkout de PayPal Sandbox:

| Número | Tipo | CVV | Fecha |
|--------|------|-----|-------|
| 4032 0326 5073 2281 | Visa | 123 | Cualquier fecha futura |
| 5425 2334 3010 9903 | Mastercard | 123 | Cualquier fecha futura |

### Flujo de Prueba

1. **Crear orden** desde tu app
2. **Redirigir** al usuario a `approvalUrl`
3. **Iniciar sesión** con cuenta de comprador de Sandbox
4. **Aprobar** el pago
5. **Redirigir** de vuelta a tu app
6. **Capturar** el pago desde tu backend

---

## 🚀 Producción

### Paso 1: Crear App en Modo Live

1. Ve a **Dashboard** → **My Apps & Credentials**
2. Cambia a la tab **Live**
3. Crea una nueva app (o actualiza existente)
4. **IMPORTANTE**: Tu cuenta PayPal debe estar **verificada** para modo Live

### Paso 2: Actualizar Variables de Entorno

```bash
# PayPal Configuration (PRODUCTION)
PAYPAL_CLIENT_ID=<tu-client-id-de-produccion>
PAYPAL_CLIENT_SECRET=<tu-client-secret-de-produccion>
PAYPAL_MODE=live  # ← Cambiar a 'live'

FRONTEND_URL=https://tu-dominio.com
```

### Paso 3: Configurar Webhooks en Live

1. En tu app de **Live**, configura webhook URL
2. URL: `https://tu-dominio.com/api/payments/webhook`
3. Selecciona los mismos eventos que en Sandbox

### Paso 4: Verificación de Seguridad

- ✅ HTTPS obligatorio
- ✅ Variables de entorno en `.env` (NO en código)
- ✅ Rate limiting activado
- ✅ Validación de datos de entrada
- ✅ Logs de errores y transacciones

---

## 📊 Monitoreo

### Logs en Backend

El servicio registra automáticamente:

```bash
✅ PayPal Service initialized in sandbox mode
✅ PayPal order created: 8PX12345ABC67890
✅ Payment captured for order: 8PX12345ABC67890
📬 PayPal Webhook received: PAYMENT.CAPTURE.COMPLETED
❌ Error creating PayPal order: Insufficient funds
```

### Dashboard de PayPal

https://www.paypal.com/businesswallet/transactions

- Ver todas las transacciones
- Exportar reportes
- Gestionar reembolsos
- Ver suscripciones activas

---

## ⚠️ Troubleshooting

### Error: "PayPal is not configured"

**Problema:** Variables de entorno no están configuradas.

**Solución:**
```bash
# Verificar que existan en .env
PAYPAL_CLIENT_ID=AaXXXXXXXXXXXX...
PAYPAL_CLIENT_SECRET=ELyyyyyyyyyy...
PAYPAL_MODE=sandbox
```

---

### Error: "CORS blocked"

**Problema:** Frontend no está en allowedOrigins.

**Solución:** Verificar `backend/src/index.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  // ...
];
```

---

### Pago aprobado pero no capturado

**Problema:** Orden fue aprobada pero no se llamó a `capture-order`.

**Solución:** El frontend debe llamar al endpoint de captura:
```javascript
await axios.post(`/api/payments/capture-order/${orderId}`);
```

---

## 📚 Recursos

- [PayPal Developer Docs](https://developer.paypal.com/docs/)
- [PayPal Sandbox](https://www.paypal.com/signin?returnUri=https%3A%2F%2Fdeveloper.paypal.com%2Fdashboard)
- [PayPal REST API Reference](https://developer.paypal.com/api/rest/)
- [Webhooks Reference](https://developer.paypal.com/api/rest/webhooks/)

---

## ✅ Checklist de Implementación

### Backend
- [x] Instalar `@paypal/paypal-server-sdk`
- [x] Crear `paypalService.js`
- [x] Crear rutas en `payments.js`
- [x] Registrar rutas en `index.js`
- [x] Configurar variables de entorno

### Frontend
- [x] Instalar `@paypal/react-paypal-js`
- [x] Crear componente `PayPalButton.jsx`
- [x] Integrar en página de Suscripciones
- [x] Manejo de estados (loading, success, error)

### PayPal Dashboard
- [ ] Crear app en Sandbox
- [ ] Copiar credenciales a `.env`
- [ ] Configurar webhooks
- [ ] Probar flujo completo

### Producción
- [ ] Crear app en modo Live
- [ ] Actualizar credenciales de producción
- [ ] Configurar webhooks en Live
- [ ] Verificar HTTPS
- [ ] Monitorear transacciones

---

**Implementación completada** ✅

Para cualquier duda, contacta al equipo de desarrollo.
