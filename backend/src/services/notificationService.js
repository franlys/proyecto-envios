import pkg from 'nodemailer';
const { createTransport } = pkg;
import axios from 'axios';

// URL base del frontend (para enlaces de tracking)
// En producción debe ser la URL de tu frontend en Vercel
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://proyecto-envios-sandy.vercel.app';

// Configuración del transporter de Nodemailer
const createTransporter = (config = null) => {
  // Si hay config específica de la compañía, usarla; sino, usar variables de entorno como fallback
  const user = config?.user || process.env.EMAIL_USER;
  const pass = config?.pass || process.env.EMAIL_PASS;
  const service = config?.service || process.env.EMAIL_SERVICE || 'gmail';

  // Verificar si las credenciales están configuradas
  if (!user || !pass) {
    console.warn('⚠️ Advertencia: No hay credenciales de email configuradas (ni de compañía ni de entorno). El envío de correos fallará.');
  }

  return createTransport({
    service: service,
    auth: {
      user: user,
      pass: pass,
    },
  });
};

/**
 * Envía un correo electrónico
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} html - Cuerpo del correo en HTML
 * @param {Array} attachments - Lista de adjuntos (opcional)
 * @param {Object} companyConfig - Configuración de correo de la compañía (opcional)
 */
export const sendEmail = async (to, subject, html, attachments = [], companyConfig = null) => {
  try {
    const transporter = createTransporter(companyConfig?.emailConfig);

    const fromEmail = companyConfig?.emailConfig?.from || process.env.EMAIL_FROM || process.env.EMAIL_USER;

    const mailOptions = {
      from: fromEmail,
      to,
      subject,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Correo enviado a ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
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
    
    // AQUÍ IRÍA LA INTEGRACIÓN CON TWILIO O META API
    // Ejemplo Twilio:
    // await client.messages.create({ body: message, from: 'whatsapp:+14155238886', to: `whatsapp:${to}` });

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
    results.email = await sendEmail(email, subject, body, [], companyConfig);
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
