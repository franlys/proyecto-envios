import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';

/**
 * BarcodeGenerator
 * 
 * Componente unificado para generar códigos de barras (1D) y códigos QR (2D).
 * 
 * @param {string} value - El valor a codificar
 * @param {string} format - 'CODE128', 'EAN', 'UPC', ... o 'QR'
 * @param {number} width - Ancho de las barras (para 1D)
 * @param {number} height - Alto de las barras (para 1D)
 * @param {boolean} displayValue - Mostrar el texto debajo
 * @param {number} size - Tamaño en px (para QR)
 */
const BarcodeGenerator = ({
    value,
    format = 'CODE128',
    width = 2,
    height = 50,
    displayValue = true,
    size = 128,
    className = ""
}) => {
    if (!value) return null;

    if (format === 'QR') {
        return (
            <div className={className} style={{ height: "auto", maxWidth: size, width: "100%" }}>
                <QRCode
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={value}
                    viewBox={`0 0 256 256`}
                />
            </div>
        );
    }

    return (
        <div className={className}>
            <Barcode
                value={value}
                format={format}
                width={width}
                height={height}
                displayValue={displayValue}
                background="transparent"
            />
        </div>
    );
};

export default BarcodeGenerator;
