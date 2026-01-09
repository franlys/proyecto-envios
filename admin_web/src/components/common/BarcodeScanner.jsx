/**
 * Componente de escaneo de códigos de barras usando la cámara
 *
 * Soporta:
 * - CODE128 (usado en etiquetas Prologix)
 * - EAN/UPC
 * - QR codes
 * - Otros formatos 1D y 2D
 *
 * Útil cuando no hay pistola Bluetooth/USB disponible
 */

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScanType } from 'html5-qrcode';
import { Camera, X, Check } from 'lucide-react';
import { toast } from 'sonner';

const BarcodeScanner = ({ onScan, onClose, title = "Escanear Código de Barras" }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    // Iniciar escáner cuando el componente se monta
    startScanner();

    // Cleanup cuando se desmonta
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const config = {
        fps: 10, // Frames por segundo
        qrbox: { width: 300, height: 150 }, // Área de escaneo (rectangular para códigos de barras)
        aspectRatio: 2.0, // Aspecto horizontal para códigos de barras
        formatsToSupport: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA
        ]
      };

      // Crear instancia del escáner
      html5QrCodeRef.current = new Html5Qrcode("barcode-reader");

      // Iniciar cámara trasera (mejor para escaneo)
      await html5QrCodeRef.current.start(
        { facingMode: "environment" }, // Cámara trasera
        config,
        onScanSuccess,
        onScanFailure
      );

      setIsScanning(true);
      toast.success('Cámara activada. Apunta al código de barras');

    } catch (error) {
      console.error('Error iniciando escáner:', error);
      toast.error('Error al acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setIsScanning(false);
      } catch (error) {
        console.error('Error deteniendo escáner:', error);
      }
    }
  };

  const onScanSuccess = (decodedText, decodedResult) => {
    console.log('✅ Código escaneado:', decodedText);

    // Evitar múltiples escaneos del mismo código
    if (decodedText === lastScanned) {
      return;
    }

    setLastScanned(decodedText);

    // Vibración táctil si está disponible
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Sonido de éxito
    toast.success(`Código: ${decodedText}`);

    // Callback al padre
    if (onScan) {
      onScan(decodedText, decodedResult);
    }

    // Cerrar escáner automáticamente después de escanear
    setTimeout(() => {
      handleClose();
    }, 500);
  };

  const onScanFailure = (error) => {
    // No mostrar errores continuos de escaneo (son normales)
    // Solo logear en consola para debugging
    // console.log('Escaneando...', error);
  };

  const handleClose = async () => {
    await stopScanner();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="text-white" size={24} />
          <h2 className="text-white font-semibold text-lg">{title}</h2>
        </div>
        <button
          onClick={handleClose}
          className="text-white hover:bg-slate-800 p-2 rounded-lg transition"
        >
          <X size={24} />
        </button>
      </div>

      {/* Área de escaneo */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          id="barcode-reader"
          className="w-full max-w-md rounded-lg overflow-hidden shadow-2xl"
        />

        {/* Instrucciones */}
        <div className="mt-6 bg-slate-900/80 rounded-lg p-4 max-w-md w-full">
          <p className="text-white text-center text-sm mb-2">
            📸 Apunta la cámara al código de barras
          </p>
          <p className="text-slate-400 text-center text-xs">
            El código se leerá automáticamente
          </p>
        </div>

        {/* Último código escaneado */}
        {lastScanned && (
          <div className="mt-4 bg-emerald-900/80 rounded-lg p-3 max-w-md w-full flex items-center gap-2">
            <Check className="text-emerald-400" size={20} />
            <p className="text-emerald-100 text-sm">
              Último: <strong>{lastScanned}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Footer con tips */}
      <div className="bg-slate-900 p-4">
        <p className="text-slate-400 text-xs text-center">
          💡 Tip: Asegúrate de tener buena iluminación y mantén el código de barras en el centro del recuadro
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
