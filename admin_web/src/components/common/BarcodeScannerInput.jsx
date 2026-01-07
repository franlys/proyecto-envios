import { useEffect, useRef, useState } from 'react';
import { Scan, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

/**
 * BarcodeScannerInput
 * 
 * Componente que escucha eventos de teclado globales para detectar entrada de scanner de código de barras.
 * Los scanners HID actúan como teclados rápidos.
 * 
 * Características:
 * - Detecta flujos rápidos de texto terminados en Enter
 * - Ignora inputs si el usuario está escribiendo en un campo de texto (opcional)
 * - Provee feedback visual opcional
 */
const BarcodeScannerInput = ({
    onScan,
    isActive = true,
    minChars = 3,
    className = "",
    ignoreIfFocusOnInput = true,
    showStatus = true
}) => {
    const [lastScanned, setLastScanned] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const buffer = useRef("");
    const lastKeyTime = useRef(0);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e) => {
            // Si queremos ignorar cuando el usuario escribe en un input normal
            if (ignoreIfFocusOnInput) {
                const tagName = e.target.tagName.toLowerCase();
                if (tagName === 'input' || tagName === 'textarea') {
                    return;
                }
            }

            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime.current;

            // Los scanners suelen escribir muy rápido (<50ms entre teclas)
            // Si pasa mucho tiempo, reiniciamos el buffer (asumimos nueva entrada o tipeo manual lento)
            if (timeDiff > 100 && buffer.current.length > 0) {
                // Reset buffer si pasó mucho tiempo
                buffer.current = "";
                setIsScanning(false);
            }

            // Detectar estado de "escaneando" por velocidad
            if (timeDiff < 50 && buffer.current.length > 0) {
                setIsScanning(true);
                // Clear previous timeout
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                // Set visual indicator timeout
                timeoutRef.current = setTimeout(() => setIsScanning(false), 500);
            }

            lastKeyTime.current = currentTime;

            // Si es Enter, intentamos procesar el código
            if (e.key === 'Enter') {
                const scannedCode = buffer.current;

                // Validar longitud mínima
                if (scannedCode.length >= minChars) {
                    console.log("Barcode scanned:", scannedCode);
                    setLastScanned(scannedCode);

                    // Emitir evento
                    if (onScan) {
                        onScan(scannedCode);
                    }

                    // Limpiar buffer
                    buffer.current = "";
                    e.preventDefault(); // Evitar submit de formularios si los hubiera
                }
            } else if (e.key.length === 1) {
                // Acumular caracteres imprimibles
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isActive, onScan, minChars, ignoreIfFocusOnInput]);

    if (!showStatus) return null;

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isScanning
                ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm'
                : lastScanned
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
            } ${className}`}>
            <Scan className={`w-4 h-4 ${isScanning ? 'animate-pulse' : ''}`} />
            <span>
                {isScanning
                    ? 'Recibiendo datos...'
                    : lastScanned
                        ? `Último: ${lastScanned}`
                        : 'Listo para escanear'}
            </span>
        </div>
    );
};

export default BarcodeScannerInput;
