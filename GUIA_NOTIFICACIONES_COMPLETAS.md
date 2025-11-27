# Guía de Notificaciones por Correo Electrónico

## ✅ Sistema Implementado

El sistema ahora envía notificaciones automáticas por correo electrónico en **cada etapa del proceso de envío**, desde que se crea la recolección hasta que llega al cliente final.

## 📧 Tipos de Notificaciones

### 1. **Creación de Recolección**
**Cuándo se envía:** Al crear una nueva recolección

**Destinatario:** Remitente (quien envía el paquete)

**Contenido:**
- Confirmación de recolección creada
- Código de tracking
- Datos del destinatario
- Items del envío
- Total a pagar
- Estado de pago

**Ejemplo:**
```
Asunto: Recolección Confirmada - RC-20251127-0046
```

---

### 2. **Confirmación de Pago**
**Cuándo se envía:** Cuando el pago se marca como "pagada"

**Destinatario:** Remitente

**Contenido:**
- Confirmación de pago recibido
- Monto pagado
- Método de pago
- Referencia de pago
- Código de tracking

**Ejemplo:**
```
Asunto: 💰 Pago Confirmado - RC-20251127-0046
```

---

### 3. **Estados del Envío**

El sistema envía un correo **cada vez que cambia el estado** del envío. Aquí están todos los estados:

#### 📦 **En Contenedor (Almacén USA)**
**Estado:** `en_contenedor`

**Mensaje:** "Tu paquete ha sido colocado en un contenedor en nuestro almacén de USA y pronto será enviado."

**Ejemplo:**
```
Asunto: 📦 En Contenedor - Almacén USA - RC-20251127-0046
```

---

#### 🚢 **En Tránsito a República Dominicana**
**Estado:** `en_transito`

**Mensaje:** "Tu paquete está en camino hacia República Dominicana."

**Ejemplo:**
```
Asunto: 🚢 En Tránsito a República Dominicana - RC-20251127-0046
```

---

#### 🏭 **Recibido en Almacén RD**
**Estado:** `recibido_rd`

**Mensaje:** "Tu paquete ha llegado a nuestro almacén en República Dominicana y está siendo procesado."

**Ejemplo:**
```
Asunto: 🏭 Recibido en Almacén RD - RC-20251127-0046
```

---

#### 🚚 **En Ruta de Entrega**
**Estado:** `en_ruta`

**Mensaje:** "Tu paquete está en camino hacia su destino final."

**Ejemplo:**
```
Asunto: 🚚 En Ruta de Entrega - RC-20251127-0046
```

---

#### ✅ **Entregado al Cliente Final**
**Estado:** `entregado`

**Mensaje:** "Tu paquete ha sido entregado al destinatario."

**Ejemplo:**
```
Asunto: ✅ ¡Entregado Exitosamente! - RC-20251127-0046
```

**IMPORTANTE:** Esta es la notificación que te confirma que el paquete llegó al cliente final en República Dominicana, para que tú desde USA sepas que ya fue entregado.

---

#### ❌ **Cancelado**
**Estado:** `cancelado`

**Mensaje:** "Tu recolección ha sido cancelada."

---

## 🔄 Flujo Completo de Notificaciones

Para que estés al tanto desde USA de todo el proceso, recibirás correos en este orden:

1. **Recolección Creada** - Cuando se registra el paquete
2. **Pago Confirmado** - Cuando confirman que pagaste
3. **En Contenedor** - Cuando ponen tu paquete en el contenedor en USA
4. **En Tránsito** - Cuando el contenedor sale de USA hacia RD
5. **Recibido en RD** - Cuando llega a almacén en República Dominicana
6. **En Ruta** - Cuando sale para entrega al cliente
7. **Entregado** - Cuando el cliente final recibe el paquete ✅

## 📋 Información en Cada Correo

Todos los correos incluyen:
- **Código de Tracking**: Para rastrear el envío
- **Nombre del Destinatario**: A quién va dirigido
- **Dirección de Entrega**: Dónde se entregará
- **Estado Actual**: En qué etapa está
- **Notas adicionales**: Si el personal agrega alguna observación

## 🏢 Configuración Multi-Empresa

Los correos se envían usando la configuración de email de cada compañía:
- Si la compañía tiene configurado su propio email de Gmail, se usa ese
- Si no, se usa el email por defecto del sistema
- Cada compañía puede tener su propio diseño y logo

## 🔧 Cómo Funciona Técnicamente

### Backend
- **Archivo**: `backend/src/controllers/recoleccionesController.js`
- **Función de creación**: Líneas 266-310 (envía correo al crear recolección)
- **Función de estado**: Líneas 512-604 (envía correo al cambiar estado)
- **Función de pago**: Líneas 676-718 (envía correo al confirmar pago)

### Servicio de Notificaciones
- **Archivo**: `backend/src/services/notificationService.js`
- Usa Nodemailer con configuración dinámica por compañía
- Soporte para Gmail con contraseñas de aplicación

## 🧪 Cómo Probar

### 1. Crear Recolección
```bash
# Asegúrate de incluir un email válido en el campo remitenteEmail
```

Deberías recibir un correo de confirmación.

### 2. Cambiar Estado del Envío
```bash
# Desde el panel admin, cambia el estado de una recolección
```

Ejemplo de request:
```javascript
PUT /api/recolecciones/:id/estado
{
  "estado": "en_contenedor",
  "notas": "Paquete en contenedor #C123"
}
```

### 3. Confirmar Pago
```javascript
PUT /api/recolecciones/:id/pago
{
  "montoPagado": 177,
  "metodoPago": "efectivo",
  "referenciaPago": "REF123"
}
```

## 📊 Logs del Sistema

En los logs del backend verás:
```
📧 Correo de confirmación enviado a email@example.com
📧 Notificación de estado enviada a email@example.com - Estado: en_contenedor
📧 Notificación de pago enviada a email@example.com
```

Si hay errores:
```
❌ Error enviando correo a email@example.com: [descripción del error]
```

## ⚙️ Variables de Entorno Necesarias

Si no usas configuración de compañía, asegúrate de tener:

```env
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-contraseña-de-aplicacion
EMAIL_SERVICE=gmail
EMAIL_FROM=tu-email@gmail.com
```

## 🎯 Beneficios

✅ **Visibilidad completa**: Sabes exactamente dónde está cada paquete desde USA

✅ **Notificaciones en tiempo real**: Cada cambio de estado genera un correo automático

✅ **Confirmación de entrega**: Recibes notificación cuando el cliente recibe el paquete

✅ **Multi-empresa**: Cada compañía puede tener su email personalizado

✅ **Trazabilidad**: Todos los correos incluyen el código de tracking

## 🔐 Seguridad

- Las contraseñas de email se almacenan en Firestore (se recomienda encriptación futura)
- Los correos se envían en segundo plano sin bloquear las respuestas del API
- Manejo de errores robusto para que el sistema siga funcionando aunque falle el envío de email

## 📝 Notas Importantes

1. **Email del remitente**: Debe ser válido para recibir notificaciones
2. **Contraseñas de aplicación**: Usar contraseñas de aplicación de Gmail, no contraseñas normales
3. **Límites de Gmail**: Gmail tiene límites de envío (500 correos/día para cuentas gratuitas)
4. **Estados en orden**: Los estados deben seguir un flujo lógico del proceso

## 🚀 Próximas Mejoras Sugeridas

1. ✉️ Agregar plantillas HTML más avanzadas con el logo de la compañía
2. 📱 Agregar notificaciones por WhatsApp además de email
3. 🔔 Agregar notificaciones push en el panel web
4. 📊 Dashboard de métricas de notificaciones enviadas
5. 🔒 Encriptar contraseñas de email en la base de datos
6. 📧 Permitir personalizar plantillas de correo por compañía
