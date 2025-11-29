
import dotenv from 'dotenv';
dotenv.config();

import { sendEmail } from './src/services/notificationService.js';

const testEmail = async () => {
    console.log('📧 Probando envío de email con Resend...');

    const to = 'elmaestrogonzalez30@gmail.com'; // Email del usuario
    const subject = 'Prueba de Integración Resend - Proyecto Envíos';
    const html = `
    <div style="font-family: sans-serif; padding: 20px; text-align: center;">
      <h1 style="color: #4F46E5;">¡Hola! 👋</h1>
      <p>Este es un correo de prueba para verificar la integración con <strong>Resend</strong>.</p>
      <p>Si estás leyendo esto, ¡la configuración fue exitosa! 🚀</p>
      <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">Enviado desde el backend de Proyecto Envíos.</p>
    </div>
  `;

    const result = await sendEmail(to, subject, html);

    if (result.success) {
        console.log('✅ Email enviado exitosamente!');
        console.log('ID:', result.messageId);
    } else {
        console.error('❌ Falló el envío:', result.error);
    }
};

testEmail();
