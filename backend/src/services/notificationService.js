import { Resend } from 'resend';

// URL base del frontend (para enlaces de tracking)
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://proyecto-envios.vercel.app';

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un correo electrónico usando Resend
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} html - Cuerpo del correo en HTML
 * @param {Array} attachments - Lista de adjuntos (opcional)
 * @param {Object} companyConfig - Configuración de correo de la compañía (opcional)
 */
export const sendEmail = async (to, subject, html, attachments = [], companyConfig = null) => {
  try {
    // Configurar remitente
    // Dominio verificado: prologix-app.com
    const fromEmail = 'no-reply@prologix-app.com';

    // Si hay configuración de compañía, intentar usarla si es compatible con Resend (requiere dominio verificado)
    // Por ahora, para garantizar entrega, usamos el remitente verificado del sistema

    const emailOptions = {
      from: fromEmail,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content // Resend espera Buffer o string base64
      }))
    };

    const data = await resend.emails.send(emailOptions);

    if (data.error) {
      console.error('❌ Error enviando correo (Resend):', data.error);
      return { success: false, error: data.error.message };
    }

    console.log(`📧 Correo enviado a ${to}: ${data.data?.id}`);
    return { success: true, messageId: data.data?.id };
  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía un mensaje de WhatsApp (Placeholder para integración futura)
 * @param {string} to - Número de teléfono
 * @param {string} message - Mensaje de texto
 * @param {string} mediaUrl - URL de archivo adjunto (opcional)
 */
export const sendWhatsApp = async (to, message, mediaUrl = null) => {
  try {
    console.log(`📱 Simulando envío de WhatsApp a ${to}: ${message}`);
    return { success: true, message: 'Simulación exitosa' };
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Envía notificación de actualización de estado de factura
 * @param {Object} clientData - Datos del cliente { email, telefono, nombre }
 * @param {Object} invoiceData - Datos de la factura { id, estado, total, link }
 * @param {Object} companyConfig - Configuración de la compañía (opcional)
 */
export const sendInvoiceStatusUpdate = async (clientData, invoiceData, companyConfig = null) => {
  const { email, telefono, nombre } = clientData;
  const { id, estado, total, link } = invoiceData;

  const subject = `Actualización de Factura #${id} - ${estado.toUpperCase()}`;
  const body = `
    <h3>Hola ${nombre},</h3>
    <p>El estado de tu factura <strong>#${id}</strong> ha cambiado a: <strong>${estado}</strong>.</p>
    <p><strong>Total:</strong> USD$ ${total}</p>
    ${link ? `<p>Puedes ver tu factura aquí: <a href="${link}">Ver Factura</a></p>` : ''}
    <p>Gracias por tu preferencia.</p>
  `;

  const results = { email: null, whatsapp: null };

  if (email) {
    // Envolver el contenido en la plantilla con branding
    const brandedHtml = generateBrandedEmailHTML(body, companyConfig, 'default');
    results.email = await sendEmail(email, subject, brandedHtml, [], companyConfig);
  }

  if (telefono) {
    const waMessage = `Hola ${nombre}, tu factura #${id} ha cambiado a estado: ${estado}. Total: USD$ ${total}.`;
    results.whatsapp = await sendWhatsApp(telefono, waMessage, link);
  }

  return results;
};

/**
 * Genera el HTML para el botón de tracking público
 * @param {string} codigoTracking - Código de tracking (ej: EMI-0001)
 * @returns {string} HTML del botón de tracking
 */
export const generateTrackingButtonHTML = (codigoTracking) => {
  if (!codigoTracking) return '';

  const trackingUrl = `${FRONTEND_URL}/tracking/${codigoTracking}`;

  return `
    <div style="margin: 30px 0; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
      <h3 style="color: #2c3e50; margin-bottom: 15px;">📦 Rastrea tu Paquete</h3>
      <p style="color: #555; margin-bottom: 20px; font-size: 14px;">
        Puedes seguir el estado de tu envío en tiempo real haciendo clic en el botón de abajo:
      </p>
      <a href="${trackingUrl}"
         style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s;">
        🔍 Rastrear ${codigoTracking}
      </a>
      <p style="color: #777; margin-top: 15px; font-size: 12px;">
        O copia este enlace: <br>
        <a href="${trackingUrl}" style="color: #667eea; word-break: break-all;">${trackingUrl}</a>
      </p>
      <p style="color: #999; margin-top: 10px; font-size: 11px;">
        💡 Puedes compartir este enlace con otras personas
      </p>
    </div>
  `;
};

/**
 * Genera el texto plano para WhatsApp con enlace de tracking
 * @param {string} codigoTracking - Código de tracking
 * @returns {string} Texto con enlace
 */
export const generateTrackingTextForWhatsApp = (codigoTracking) => {
  if (!codigoTracking) return '';

  const trackingUrl = `${FRONTEND_URL}/tracking/${codigoTracking}`;

  return `\n\n📦 *Rastrea tu paquete aquí:*\n${trackingUrl}\n\nCódigo: ${codigoTracking}`;
};

// Mapeo de estados a imágenes (URLs públicas o estáticas)
const STATE_IMAGES = {
  'pendiente_recoleccion': 'https://img.icons8.com/clouds/200/box.png',
  'recolectada': 'https://img.icons8.com/clouds/200/checked-truck.png',
  'en_contenedor_usa': 'https://img.icons8.com/clouds/200/container-truck.png',
  'incompleta_usa': 'https://img.icons8.com/clouds/200/error.png',
  'en_transito_rd': 'https://img.icons8.com/clouds/200/airplane-take-off.png',
  'recibida_rd': 'https://img.icons8.com/clouds/200/warehouse-1.png',
  'pendiente_confirmacion': 'https://img.icons8.com/clouds/200/questions.png',
  'confirmada': 'https://img.icons8.com/clouds/200/checkmark.png',
  'en_ruta': 'https://img.icons8.com/clouds/200/delivery.png',
  'lista_para_entregar': 'https://img.icons8.com/clouds/200/open-box.png',
  'entregada': 'https://img.icons8.com/clouds/200/ok.png',
  'no_entregada': 'https://img.icons8.com/clouds/200/cancel.png',
  'default': 'https://img.icons8.com/clouds/200/box.png'
};

/**
 * Genera un HTML de correo con branding de la compañía
 * @param {string} contentHTML - Contenido específico del correo
 * @param {Object} companyConfig - Configuración de la compañía { nombre, logo, primaryColor, secondaryColor }
 * @param {string} state - Estado actual para mostrar imagen/animación (opcional)
 * @param {string} codigoTracking - Código de tracking para incluir botón de rastreo (opcional)
 * @returns {string} HTML completo y estilizado
 */
export const generateBrandedEmailHTML = (contentHTML, companyConfig = null, state = 'default', codigoTracking = null) => {
  const primaryColor = companyConfig?.invoiceDesign?.primaryColor || companyConfig?.primaryColor || companyConfig?.color || '#1976D2';
  const secondaryColor = companyConfig?.invoiceDesign?.secondaryColor || companyConfig?.secondaryColor || '#f5f5f5';
  const logoUrl = companyConfig?.invoiceDesign?.logoUrl || companyConfig?.logo || companyConfig?.logoUrl || 'https://via.placeholder.com/150x50?text=ProLogix';
  const companyName = companyConfig?.nombre || 'ProLogix';

  const stateImage = STATE_IMAGES[state] || STATE_IMAGES['default'];

  const trackingButton = codigoTracking ? generateTrackingButtonHTML(codigoTracking) : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8;">

      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 20px; margin-bottom: 20px;">

        <!-- HEADER CON LOGO -->
        <div style="background-color: ${primaryColor}; padding: 25px; text-align: center;">
          <img src="${logoUrl}" alt="${companyName}" style="max-height: 80px; max-width: 220px; object-fit: contain; border-radius: 4px;">
        </div>

        <!-- IMAGEN DEL ESTADO -->
        <div style="text-align: center; padding-top: 30px; background-color: #ffffff;">
          <img src="${stateImage}" alt="Estado: ${state}" style="width: 120px; height: 120px; object-fit: contain;">
        </div>

        <!-- CONTENIDO PRINCIPAL -->
        <div style="padding: 30px 40px; color: #333333; line-height: 1.6;">
          ${contentHTML}
        </div>

        <!-- BOTÓN DE TRACKING -->
        ${trackingButton}

        <!-- FOOTER -->
        <div style="background-color: ${secondaryColor}; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee;">
          <p style="margin: 0 0 10px 0;">Enviado por <strong>${companyName}</strong></p>
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Todos los derechos reservados.</p>
        </div>

      </div>
    </body>
    </html>
  `;
};
