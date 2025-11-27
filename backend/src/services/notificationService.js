import pkg from 'nodemailer';
const { createTransport } = pkg;
import axios from 'axios';

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
