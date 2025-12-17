
import 'dotenv/config';
import whatsappService from '../services/whatsappService.js';

async function testWAPDF() {
    console.log('🧪 Iniciando prueba de envío de PDF por WhatsApp...');

    // CONFIGURA AQUÍ DATOS DE PRUEBA
    // Necesitamos un ID de compañía válido que tenga una instancia conectada
    const COMPANY_ID = 'embarques_ivan';
    // Necesitamos un número de teléfono válido (el tuyo para probar)
    const PHONE = '18294617939';

    console.log(`🏢 Company ID: ${COMPANY_ID}`);
    console.log(`📱 Phone: ${PHONE}`);

    // Crear un buffer PDF simulado (pequeño PDF válido en base64 decoded)
    // "Hello World" PDF minimalista
    const pdfBase64 = "JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmogICUgcGFnZXMKPDwKICAvVHlwZSAvUGFnZXwKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqICAlIHBhZ2UKPDwKICAvVHlwZSAvUGFnZQogIC9QYXJlbnQgMiAwIFIKICAvUmVzb3VyY2VzIDw8CiAgICAvRm9udCA8PAogICAgICAvRjEgNCAwIFIKICAgID4+CiAgPj4KICAvQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqICAlIGZvbnQKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvSGVsdmV0aWNhCj4+CmVuZG9iagoKNSAwIG9iaiAgJSBwYWdlIGNvbnRlbnQKPDwKICAvTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAo3MCA1MCBUZAovRjEgMTIgVGYKKHBydWViYSBkZSBwZGYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxNTcgMDAwMDAgbiAKMDAwMDAwMDI1NSAwMDAwMCBuIAowMDAwMDAwMzQ0IDAwMDAwIG4gCnRyYWlsZXIKPDwKICAvU2l6ZSA2CiAgL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjQ0MQolJUVPRgo=";

    const buffer = Buffer.from(pdfBase64, 'base64');

    try {
        console.log('🚀 Intentando enviar archivo...');
        const result = await whatsappService.sendMediaFile(
            COMPANY_ID,
            PHONE,
            buffer,
            'prueba_debug.pdf',
            'Esto es una prueba de PDF desde script de debug',
            'application/pdf'
        );

        console.log('Result:', result);
    } catch (error) {
        console.error('❌ Error fatal en script:', error);
    }
}

testWAPDF();
