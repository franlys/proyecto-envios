/**
 * Ejemplo de uso del BarcodeScanner
 *
 * Este componente muestra cómo integrar el escáner de códigos
 * en cualquier página de Prologix
 */

import { useState } from 'react';
import BarcodeScanner from './BarcodeScanner';
import { Camera, Trash2 } from 'lucide-react';

const BarcodeScannerExample = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCodes, setScannedCodes] = useState([]);
  const [trackingInput, setTrackingInput] = useState('');

  const handleScan = (code) => {
    console.log('Código escaneado:', code);

    // Agregar a la lista
    setScannedCodes(prev => [...prev, {
      code,
      timestamp: new Date().toLocaleTimeString('es-DO')
    }]);

    // Poner en el input
    setTrackingInput(code);

    // Cerrar escáner
    setShowScanner(false);

    // Aquí puedes hacer búsqueda automática en la BD, etc.
  };

  const clearScanned = () => {
    setScannedCodes([]);
    setTrackingInput('');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">
        Ejemplo: Escaneo de Códigos de Barras
      </h1>

      {/* Input con botón de cámara */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Código de Tracking
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder="Escanea o escribe el código..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => setShowScanner(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Camera size={20} />
            Escanear
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          📱 Usa la cámara para escanear o escribe manualmente
        </p>
      </div>

      {/* Lista de códigos escaneados */}
      {scannedCodes.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              Códigos Escaneados ({scannedCodes.length})
            </h3>
            <button
              onClick={clearScanned}
              className="text-sm text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <Trash2 size={16} />
              Limpiar
            </button>
          </div>

          <div className="space-y-2">
            {scannedCodes.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-mono font-semibold">{item.code}</p>
                  <p className="text-xs text-slate-600">{item.timestamp}</p>
                </div>
                <span className="text-emerald-600 text-sm font-medium">
                  ✓ Escaneado
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h4 className="font-semibold text-indigo-900 mb-2">
          💡 Cómo usar:
        </h4>
        <ul className="text-sm text-indigo-800 space-y-1">
          <li>1. Click en "Escanear" para abrir la cámara</li>
          <li>2. Apunta al código de barras</li>
          <li>3. El código se lee automáticamente</li>
          <li>4. Se cierra la cámara y aparece en el input</li>
        </ul>
        <p className="text-xs text-indigo-700 mt-3">
          ⚠️ Si no tienes pistola Bluetooth/USB, usa esta función con la cámara de tu móvil
        </p>
      </div>

      {/* Modal del escáner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Escanear Código de Tracking"
        />
      )}
    </div>
  );
};

export default BarcodeScannerExample;
