// backend/src/services/pdfService.js
/**
 * SERVICIO DE GENERACIÓN DE PDFs
 * Genera facturas profesionales en PDF con logo de empresa
 */

import PDFDocument from 'pdfkit';
import axios from 'axios';

/**
 * Genera un PDF de factura profesional
 * @param {Object} recoleccionData - Datos de la recolección
 * @param {Object} companyConfig - Configuración de la compañía
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
export const generateInvoicePDF = async (recoleccionData, companyConfig) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // ========================================
      // ENCABEZADO CON LOGO
      // ========================================
      let logoHeight = 60;
      const pageWidth = doc.page.width;
      const marginLeft = doc.page.margins.left;
      const marginRight = doc.page.margins.right;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Intentar cargar el logo si existe
      if (companyConfig?.invoiceDesign?.logoUrl) {
        try {
          const response = await axios.get(companyConfig.invoiceDesign.logoUrl, {
            responseType: 'arraybuffer',
            timeout: 5000
          });
          const logoBuffer = Buffer.from(response.data);

          doc.image(logoBuffer, marginLeft, 50, {
            width: 120,
            height: logoHeight
          });
        } catch (logoError) {
          console.warn('⚠ No se pudo cargar el logo:', logoError.message);
          // Si falla el logo, mostrar inicial de la compañía
          doc.fontSize(32)
             .fillColor('#1976D2')
             .text(companyConfig?.nombre?.charAt(0) || 'E', marginLeft, 50);
          logoHeight = 40;
        }
      } else {
        // Sin logo, mostrar inicial
        doc.fontSize(32)
           .fillColor('#1976D2')
           .text(companyConfig?.nombre?.charAt(0) || 'E', marginLeft, 50);
        logoHeight = 40;
      }

      // Información de la empresa (lado izquierdo)
      doc.fontSize(18)
         .fillColor('#000000')
         .text(companyConfig?.nombre || 'Empresa de Envíos', marginLeft + 140, 55);

      doc.fontSize(10)
         .fillColor('#666666')
         .text(companyConfig?.telefono || '', marginLeft + 140, 80)
         .text(companyConfig?.emailConfig?.from || companyConfig?.adminEmail || '', marginLeft + 140, 95);

      // FACTURA (lado derecho)
      doc.fontSize(24)
         .fillColor('#1976D2')
         .text('FACTURA', pageWidth - marginRight - 150, 55, { align: 'right', width: 150 });

      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Código: ${recoleccionData.codigoTracking}`, pageWidth - marginRight - 150, 85, { align: 'right', width: 150 })
         .text(`Fecha: ${new Date().toLocaleDateString('es-DO')}`, pageWidth - marginRight - 150, 100, { align: 'right', width: 150 });

      // Línea separadora
      doc.moveTo(marginLeft, 130)
         .lineTo(pageWidth - marginRight, 130)
         .strokeColor('#1976D2')
         .lineWidth(2)
         .stroke();

      // ========================================
      // INFORMACIÓN DE REMITENTE Y DESTINATARIO
      // ========================================
      let yPos = 150;

      // Remitente (izquierda)
      doc.fontSize(12)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('REMITENTE', marginLeft, yPos);

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#333333')
         .text(recoleccionData.remitente.nombre, marginLeft, yPos + 20)
         .text(recoleccionData.remitente.telefono || '', marginLeft, yPos + 35)
         .text(recoleccionData.remitente.direccion || '', marginLeft, yPos + 50, { width: 200 });

      // Destinatario (derecha)
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#000000')
         .text('DESTINATARIO', pageWidth / 2 + 20, yPos);

      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#333333')
         .text(recoleccionData.destinatario.nombre, pageWidth / 2 + 20, yPos + 20)
         .text(recoleccionData.destinatario.telefono || '', pageWidth / 2 + 20, yPos + 35)
         .text(recoleccionData.destinatario.direccion || '', pageWidth / 2 + 20, yPos + 50, { width: 200 })
         .text(`Sector: ${recoleccionData.destinatario.sector || 'N/A'}`, pageWidth / 2 + 20, yPos + 80);

      // ========================================
      // TABLA DE ITEMS
      // ========================================
      yPos = 280;

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text('ITEMS', marginLeft, yPos);

      yPos += 25;

      // Encabezados de tabla
      doc.rect(marginLeft, yPos, contentWidth, 25)
         .fillAndStroke('#1976D2', '#1976D2');

      doc.fillColor('#FFFFFF')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Cant.', marginLeft + 10, yPos + 8, { width: 50 })
         .text('Descripción', marginLeft + 80, yPos + 8, { width: 250 })
         .text('Precio Unit.', marginLeft + 350, yPos + 8, { width: 80, align: 'right' })
         .text('Total', marginLeft + 450, yPos + 8, { width: 80, align: 'right' });

      yPos += 25;

      // Items
      doc.font('Helvetica')
         .fillColor('#333333');

      recoleccionData.items.forEach((item, index) => {
        const itemTotal = item.cantidad * item.precio;
        const bgColor = index % 2 === 0 ? '#F5F5F5' : '#FFFFFF';

        doc.rect(marginLeft, yPos, contentWidth, 25)
           .fill(bgColor);

        doc.fillColor('#333333')
           .text(item.cantidad.toString(), marginLeft + 10, yPos + 8, { width: 50 })
           .text(item.descripcion || item.producto || 'Item', marginLeft + 80, yPos + 8, { width: 250 })
           .text(`$${parseFloat(item.precio).toFixed(2)}`, marginLeft + 350, yPos + 8, { width: 80, align: 'right' })
           .text(`$${itemTotal.toFixed(2)}`, marginLeft + 450, yPos + 8, { width: 80, align: 'right' });

        yPos += 25;
      });

      // ========================================
      // TOTALES
      // ========================================
      yPos += 20;

      const totalsX = pageWidth - marginRight - 200;

      doc.fontSize(10)
         .fillColor('#666666')
         .text('Subtotal:', totalsX, yPos, { width: 100, align: 'left' })
         .text(`$${parseFloat(recoleccionData.facturacion.subtotal).toFixed(2)}`, totalsX + 110, yPos, { width: 90, align: 'right' });

      yPos += 20;
      doc.text('ITBIS (18%):', totalsX, yPos, { width: 100, align: 'left' })
         .text(`$${parseFloat(recoleccionData.facturacion.itbis).toFixed(2)}`, totalsX + 110, yPos, { width: 90, align: 'right' });

      yPos += 20;
      doc.rect(totalsX, yPos - 5, 200, 30)
         .fillAndStroke('#1976D2', '#1976D2');

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text('TOTAL:', totalsX + 10, yPos + 5, { width: 100, align: 'left' })
         .text(`$${parseFloat(recoleccionData.facturacion.total).toFixed(2)} USD`, totalsX + 110, yPos + 5, { width: 80, align: 'right' });

      // ========================================
      // INFORMACIÓN DE PAGO
      // ========================================
      yPos += 50;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#333333')
         .text(`Estado de Pago: `, marginLeft, yPos)
         .font('Helvetica-Bold')
         .fillColor(recoleccionData.pago.estado === 'pagada' ? '#2E7D32' : '#F57C00')
         .text(recoleccionData.pago.estado === 'pagada' ? 'PAGADO' : 'PENDIENTE', marginLeft + 100, yPos);

      if (recoleccionData.pago.metodoPago) {
        yPos += 20;
        doc.font('Helvetica')
           .fillColor('#333333')
           .text(`Método de Pago: ${recoleccionData.pago.metodoPago}`, marginLeft, yPos);
      }

      // ========================================
      // NOTAS
      // ========================================
      if (recoleccionData.notas) {
        yPos += 30;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('NOTAS:', marginLeft, yPos);

        yPos += 15;
        doc.font('Helvetica')
           .fontSize(9)
           .fillColor('#666666')
           .text(recoleccionData.notas, marginLeft, yPos, { width: contentWidth });
      }

      // ========================================
      // PIE DE PÁGINA
      // ========================================
      const footerY = doc.page.height - 80;

      doc.moveTo(marginLeft, footerY)
         .lineTo(pageWidth - marginRight, footerY)
         .strokeColor('#CCCCCC')
         .lineWidth(1)
         .stroke();

      doc.fontSize(8)
         .fillColor('#999999')
         .text(
           `Este documento fue generado electrónicamente por ${companyConfig?.nombre || 'Sistema de Envíos'}`,
           marginLeft,
           footerY + 10,
           { width: contentWidth, align: 'center' }
         )
         .text(
           `Para rastrear tu envío visita: ${companyConfig?.websiteUrl || 'nuestro sitio web'}`,
           marginLeft,
           footerY + 25,
           { width: contentWidth, align: 'center' }
         );

      doc.end();

    } catch (error) {
      console.error('❌ Error generando PDF:', error);
      reject(error);
    }
  });
};
