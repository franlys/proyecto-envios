# Guía de Facturación y Notificaciones - Proyecto Envíos

Este documento explica el funcionamiento, configuración y uso del nuevo módulo de facturación y notificaciones implementado en el sistema.

## 1. Descripción General

El sistema ahora permite:
1.  **Subir Facturas**: Adjuntar archivos (PDF o Imágenes) a una recolección/envío específico.
2.  **Enviar Notificaciones**: Enviar la factura y el estado del envío al cliente por **Correo Electrónico** y **WhatsApp**.
3.  **Automatización**: Notificar automáticamente al cliente cuando el estado de su pago cambia (ej. de "Pendiente" a "Pagado").

---

## 2. Configuración Requerida (Backend)

Para que el envío de correos funcione, es **indispensable** configurar las credenciales de correo en el archivo `.env` del backend (`backend/.env`).

```env
# Configuración de Email (Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion  # No es tu contraseña normal, es una "App Password"
EMAIL_FROM=noreply@tuempresa.com
```

> **Nota sobre Gmail**: Si usas Gmail, debes activar la verificación en 2 pasos y generar una "Contraseña de Aplicación" en la configuración de seguridad de Google.

### Configuración de WhatsApp (Pendiente)
Actualmente, el servicio de WhatsApp está preparado (`notificationService.js`) pero requiere un proveedor real (como Twilio o Meta Business API) para enviar mensajes. Por ahora, simula el envío en la consola.

---

## 3. Guía de Uso (Panel Administrativo)

### A. Acceder al Módulo
1.  Ve a la sección **"Facturas Pendientes"** en el menú lateral.
2.  Verás una tabla con todas las facturas.
3.  Haz clic en el **botón de editar (lápiz)** ✏️ en la columna "Acción" para abrir la gestión completa de una factura.

### B. Subir una Factura
1.  En el modal que se abre, busca la sección **"Documento de Factura"** en la parte inferior.
2.  Haz clic en **"Subir Factura"**.
3.  Selecciona un archivo PDF o una imagen (JPG/PNG) de tu computadora.
4.  El sistema subirá el archivo y mostrará un enlace "Ver Documento" una vez completado.

### C. Enviar Factura al Cliente
Una vez subida la factura, se habilitarán los botones de envío:
- **Enviar Email**: Envía un correo al cliente con el enlace de descarga de la factura.
- **Enviar WhatsApp**: (Simulado) Enviaría un mensaje con el enlace.

### D. Registrar Pagos
1.  Puedes cambiar el **Estado de Pago** (ej. a "Pagado") y guardar.
2.  Al guardar, si el estado cambió, el sistema intentará enviar una notificación automática al cliente informándole del nuevo estado.

---

## 4. Detalles Técnicos

### Backend
- **`src/services/notificationService.js`**: Contiene la lógica para enviar emails (usando `nodemailer`) y la estructura para WhatsApp.
- **`src/controllers/facturacionController.js`**:
    - `subirFactura`: Recibe el archivo, lo sube a Firebase Storage y guarda la URL en Firestore.
    - `enviarFactura`: Busca los datos del cliente y llama al servicio de notificaciones.
    - `actualizarFacturacion`: Detecta cambios en `estadoPago` y dispara notificaciones automáticas.
- **Rutas**: `/api/facturacion/recolecciones/:id/upload` y `/send`.

### Frontend
- **`ModuloFacturacion.jsx`**: Componente principal. Maneja la selección de archivos y los botones de envío.
- **`ModalFacturacion.jsx`**: Envuelve el módulo en una ventana emergente para facilitar su uso desde cualquier tabla.
- **`FacturasPendientesPago.jsx`**: Integra el modal y actualiza la lista de facturas tras los cambios.

---

## 5. Solución de Problemas Comunes

- **Error "No se ha subido ningún archivo"**: Asegúrate de seleccionar un archivo válido antes de intentar subirlo.
- **Error al enviar correo**: Verifica que las variables `EMAIL_USER` y `EMAIL_PASS` sean correctas en el backend. Revisa la consola del servidor para ver errores detallados de SMTP.
- **El archivo no se ve**: Verifica que las reglas de seguridad de Firebase Storage permitan la lectura pública o que el usuario tenga permisos adecuados.
