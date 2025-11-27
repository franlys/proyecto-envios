import PDFDocument from 'pdfkit';
import axios from 'axios';

/**
 * Genera un PDF de factura con diseño personalizado basado en la configuración de la compañía
 * @param {Object} invoiceData - Datos de la factura
 * @param {Object} companyConfig - Configuración de la compañía (incluyendo invoiceDesign)
 * @returns {Buffer} - Buffer del PDF generado
 */
export const generateInvoicePDF = async (invoiceData, companyConfig = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      // Capturar el PDF en memoria
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Obtener diseño personalizado o usar valores por defecto
      const design = companyConfig?.invoiceDesign || {};
      const primaryColor = design.primaryColor || '#1976D2';
      const secondaryColor = design.secondaryColor || '#f5f5f5';
      const logoUrl = design.logoUrl || null;
      const headerText = design.headerText || 'Gracias por su preferencia';
      const footerText = design.footerText || '';

      // Convertir color hex a RGB
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 25, g: 118, b: 210 }; // Azul por defecto
      };

      const primaryRGB = hexToRgb(primaryColor);
      const secondaryRGB = hexToRgb(secondaryColor);

      // ===== ENCABEZADO =====
      let yPosition = 50;

      // Logo (si existe)
      if (logoUrl) {
        try {
          const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data, 'binary');
          doc.image(imageBuffer, 50, yPosition, { width: 100 });
          yPosition += 110;
        } catch (error) {
          console.error('❌ Error cargando logo:', error.message);
          // Si falla, continuar sin logo
          yPosition += 20;
        }
      }

      // Título de la factura
      doc.fontSize(24)
         .fillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b)
         .text('FACTURA', 350, 50, { align: 'right' });

      // Información de la compañía
      doc.fontSize(10)
         .fillColor('#000000')
         .text(companyConfig?.nombre || 'Nombre de la Compañía', 350, 80, { align: 'right' })
         .text(companyConfig?.direccion || '', 350, 95, { align: 'right' })
         .text(companyConfig?.telefono || '', 350, 110, { align: 'right' });

      yPosition = Math.max(yPosition, 130);

      // Línea separadora
      doc.strokeColor(primaryRGB.r, primaryRGB.g, primaryRGB.b)
         .lineWidth(2)
         .moveTo(50, yPosition)
         .lineTo(550, yPosition)
         .stroke();

      yPosition += 20;

      // ===== INFORMACIÓN DE LA FACTURA =====
      doc.fontSize(10).fillColor('#000000');

      // Número de factura
      doc.text(`Factura #: ${invoiceData.numeroFactura || invoiceData.id}`, 50, yPosition);
      doc.text(`Fecha: ${invoiceData.fecha || new Date().toLocaleDateString()}`, 350, yPosition, { align: 'right' });
      yPosition += 20;

      // Cliente
      doc.fontSize(12).fillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b)
         .text('CLIENTE', 50, yPosition);
      yPosition += 20;

      doc.fontSize(10).fillColor('#000000')
         .text(`Nombre: ${invoiceData.cliente?.nombre || 'N/A'}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Dirección: ${invoiceData.cliente?.direccion || 'N/A'}`, 50, yPosition);
      yPosition += 15;
      doc.text(`Teléfono: ${invoiceData.cliente?.telefono || 'N/A'}`, 50, yPosition);
      yPosition += 30;

      // ===== TABLA DE ITEMS =====
      doc.fontSize(12).fillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b)
         .text('DETALLE DE FACTURACIÓN', 50, yPosition);
      yPosition += 20;

      // Encabezado de tabla con color de fondo
      doc.rect(50, yPosition, 500, 25)
         .fillColor(secondaryRGB.r, secondaryRGB.g, secondaryRGB.b)
         .fill();

      doc.fontSize(10).fillColor('#000000')
         .text('Descripción', 60, yPosition + 8)
         .text('Cantidad', 300, yPosition + 8)
         .text('Precio Unit.', 380, yPosition + 8)
         .text('Total', 480, yPosition + 8);

      yPosition += 25;

      // Items de la factura
      const items = invoiceData.items || [];
      items.forEach((item, index) => {
        const cantidad = item.cantidad || 1;
        const precioUnitario = item.precioUnitario || 0;
        const total = cantidad * precioUnitario;

        // Fila con fondo alternado
        if (index % 2 === 0) {
          doc.rect(50, yPosition, 500, 20)
             .fillColor(248, 248, 248)
             .fill();
        }

        doc.fillColor('#000000')
           .text(item.descripcion || 'Sin descripción', 60, yPosition + 5, { width: 220 })
           .text(cantidad.toString(), 300, yPosition + 5)
           .text(`$${precioUnitario.toFixed(2)}`, 380, yPosition + 5)
           .text(`$${total.toFixed(2)}`, 480, yPosition + 5);

        yPosition += 20;
      });

      yPosition += 10;

      // ===== TOTAL =====
      const subtotal = items.reduce((sum, item) => sum + ((item.cantidad || 1) * (item.precioUnitario || 0)), 0);
      const impuestos = invoiceData.impuestos || 0;
      const totalFinal = subtotal + impuestos;

      doc.fontSize(10)
         .text(`Subtotal: $${subtotal.toFixed(2)}`, 380, yPosition, { align: 'right' });
      yPosition += 15;

      if (impuestos > 0) {
        doc.text(`Impuestos: $${impuestos.toFixed(2)}`, 380, yPosition, { align: 'right' });
        yPosition += 15;
      }

      // Total con fondo de color primario
      doc.rect(350, yPosition, 200, 25)
         .fillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b)
         .fill();

      doc.fontSize(12)
         .fillColor('#FFFFFF')
         .text(`TOTAL: $${totalFinal.toFixed(2)}`, 380, yPosition + 7, { align: 'right' });

      yPosition += 40;

      // ===== INFORMACIÓN ADICIONAL =====
      if (invoiceData.notas) {
        doc.fontSize(10).fillColor('#000000')
           .text('Notas:', 50, yPosition);
        yPosition += 15;
        doc.fontSize(9)
           .text(invoiceData.notas, 50, yPosition, { width: 500 });
        yPosition += 30;
      }

      // ===== HEADER TEXT =====
      if (headerText) {
        doc.fontSize(11)
           .fillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b)
           .text(headerText, 50, yPosition, { align: 'center', width: 500 });
        yPosition += 30;
      }

      // ===== PIE DE PÁGINA =====
      const footerY = 720;

      if (footerText) {
        doc.fontSize(8)
           .fillColor('#666666')
           .text(footerText, 50, footerY, { align: 'center', width: 500 });
      }

      // Línea final
      doc.strokeColor('#CCCCCC')
         .lineWidth(1)
         .moveTo(50, footerY + 20)
         .lineTo(550, footerY + 20)
         .stroke();

      // Finalizar el documento
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Genera un PDF simple sin diseño personalizado (fallback)
 * @param {Object} invoiceData - Datos de la factura
 * @returns {Buffer} - Buffer del PDF generado
 */
export const generateSimpleInvoicePDF = async (invoiceData) => {
  return generateInvoicePDF(invoiceData, null);
};
