/**
 * Modal de Escaneo para Entrega
 *
 * Requiere que el repartidor escanee todos los items antes de poder
 * marcar la factura como entregada. Esto garantiza que todos los items
 * estén presentes.
 *
 * Características:
 * - Escaneo con cámara o pistola Bluetooth/USB
 * - Validación de códigos contra items de la factura
 * - Indicador visual de items escaneados vs pendientes
 * - Previene entrega si faltan items
 */

import { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, XCircle, Package, AlertCircle, Scan } from 'lucide-react';
import { toast } from 'sonner';
import BarcodeScanner from '../common/BarcodeScanner';

const ScanToDeliverModal = ({ factura, onComplete, onCancel }) => {
  const [showCamera, setShowCamera] = useState(false);
  const [itemsEscaneados, setItemsEscaneados] = useState(new Set());
  const [codigosEscaneados, setCodigosEscaneados] = useState([]);
  const [manualInput, setManualInput] = useState('');
  const inputRef = useRef(null);

  // Generar lista de todos los códigos esperados
  const codigosEsperados = [];
  factura.items.forEach((item, itemIndex) => {
    const cantidad = parseInt(item.cantidad) || 1;
    for (let unidadIndex = 0; unidadIndex < cantidad; unidadIndex++) {
      const codigoEsperado = `${factura.codigoTracking}-${itemIndex + 1}-${unidadIndex + 1}`;
      codigosEsperados.push({
        codigo: codigoEsperado,
        itemIndex,
        unidadIndex,
        descripcion: item.producto || item.descripcion || 'Item'
      });
    }
  });

  const totalUnidades = codigosEsperados.length;
  const unidadesEscaneadas = itemsEscaneados.size;
  const progreso = totalUnidades > 0 ? (unidadesEscaneadas / totalUnidades) * 100 : 0;
  const todoEscaneado = unidadesEscaneadas === totalUnidades;

  // Auto-focus en input para pistola USB/Bluetooth
  useEffect(() => {
    if (inputRef.current && !showCamera) {
      inputRef.current.focus();
    }
  }, [showCamera]);

  const procesarCodigo = (codigo) => {
    const codigoLimpio = codigo.trim().toUpperCase();

    // Buscar si el código es válido
    const itemEncontrado = codigosEsperados.find(
      item => item.codigo.toUpperCase() === codigoLimpio
    );

    if (!itemEncontrado) {
      toast.error(`❌ Código no válido: ${codigoLimpio}`);
      return false;
    }

    // Verificar si ya fue escaneado
    if (itemsEscaneados.has(codigoLimpio)) {
      toast.warning(`⚠️ Ya escaneado: ${itemEncontrado.descripcion}`);
      return false;
    }

    // Agregar a escaneados
    setItemsEscaneados(prev => new Set([...prev, codigoLimpio]));
    setCodigosEscaneados(prev => [...prev, {
      codigo: codigoLimpio,
      timestamp: new Date().toLocaleTimeString('es-DO'),
      descripcion: itemEncontrado.descripcion
    }]);

    // Vibración de éxito
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    toast.success(`✅ ${itemEncontrado.descripcion} escaneado`);
    return true;
  };

  const handleScanFromCamera = (codigo) => {
    procesarCodigo(codigo);
    setShowCamera(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      if (procesarCodigo(manualInput)) {
        setManualInput('');
      }
    }
  };

  const handleKeyPress = (e) => {
    // Pistola USB/Bluetooth envía Enter al final
    if (e.key === 'Enter') {
      handleManualSubmit(e);
    }
  };

  const handleComplete = () => {
    if (!todoEscaneado) {
      toast.error('❌ Debes escanear todos los items antes de entregar');
      return;
    }
    onComplete(Array.from(itemsEscaneados));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scan size={28} />
            Escanear Items para Entrega
          </h2>
          <p className="text-indigo-100 mt-2">
            📦 Factura: {factura.codigoTracking}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Progreso: {unidadesEscaneadas} / {totalUnidades} unidades
            </span>
            <span className={`text-sm font-bold ${todoEscaneado ? 'text-emerald-600' : 'text-orange-600'}`}>
              {progreso.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                todoEscaneado ? 'bg-emerald-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                Escanea o escribe el código
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="ENV-2025-001-1-1"
                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  <Camera size={20} />
                  Cámara
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                💡 Usa la cámara o una pistola Bluetooth/USB para escanear
              </p>
            </div>
          </form>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Lista de Items Esperados */}
          <div className="mb-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Package size={18} />
              Items a Entregar ({totalUnidades} unidades)
            </h3>
            <div className="space-y-2">
              {codigosEsperados.map((item, index) => {
                const escaneado = itemsEscaneados.has(item.codigo.toUpperCase());
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      escaneado
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`font-mono text-sm ${
                        escaneado ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {item.codigo}
                      </p>
                      <p className={`text-xs ${
                        escaneado ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {item.descripcion} - Unidad {item.unidadIndex + 1}
                      </p>
                    </div>
                    <div>
                      {escaneado ? (
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={24} />
                      ) : (
                        <XCircle className="text-slate-400 dark:text-slate-500" size={24} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Últimos Códigos Escaneados */}
          {codigosEscaneados.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                Últimos Escaneados
              </h3>
              <div className="space-y-2">
                {[...codigosEscaneados].reverse().slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800"
                  >
                    <div>
                      <p className="font-mono text-sm text-emerald-900 dark:text-emerald-100">
                        {item.codigo}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {item.descripcion}
                      </p>
                    </div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      {item.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleComplete}
            disabled={!todoEscaneado}
            className={`flex-1 px-4 py-3 rounded-lg transition font-semibold flex items-center justify-center gap-2 ${
              todoEscaneado
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={20} />
            {todoEscaneado ? 'Confirmar Entrega' : `Faltan ${totalUnidades - unidadesEscaneadas} items`}
          </button>
        </div>

        {/* Aviso si faltan items */}
        {!todoEscaneado && unidadesEscaneadas > 0 && (
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-200 dark:border-orange-800 flex items-start gap-3">
            <AlertCircle className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <strong>Atención:</strong> Aún faltan {totalUnidades - unidadesEscaneadas} unidad(es) por escanear.
              Verifica que todos los items estén presentes antes de entregar.
            </div>
          </div>
        )}
      </div>

      {/* Camera Scanner Modal */}
      {showCamera && (
        <BarcodeScanner
          onScan={handleScanFromCamera}
          onClose={() => setShowCamera(false)}
          title="Escanear Código de Item"
        />
      )}
    </div>
  );
};

export default ScanToDeliverModal;
